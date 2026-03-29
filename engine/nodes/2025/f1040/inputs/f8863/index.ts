import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { filingStatusSchema } from "../../types.ts";

// Per-student item schema (Part III of Form 8863).
export const itemSchema = z.object({
  credit_type: z.enum(["aoc", "llc"]),
  // Identity fields (Part III, Lines 20–21)
  student_name: z.string(),
  student_ssn: z.string().optional(),
  // Institution data (Part III, Line 22)
  institution_a_name: z.string().optional(),
  institution_a_address: z.string().optional(),
  institution_a_1098t_received: z.boolean().optional(),
  institution_a_1098t_box7_prior: z.boolean().optional(),
  institution_a_ein: z.string().optional(),
  institution_b_name: z.string().optional(),
  institution_b_address: z.string().optional(),
  institution_b_1098t_received: z.boolean().optional(),
  institution_b_1098t_box7_prior: z.boolean().optional(),
  institution_b_ein: z.string().optional(),
  // AOC eligibility gates (Part III, Lines 23–26)
  aoc_claimed_4_prior_years: z.boolean().optional(),
  enrolled_half_time: z.boolean().optional(),
  completed_4_years_postsec: z.boolean().optional(),
  felony_drug_conviction: z.boolean().optional(),
  // Adjusted qualified education expenses
  aoc_adjusted_expenses: z.number().nonnegative().optional(),
  llc_adjusted_expenses: z.number().nonnegative().optional(),
  // Return-level fields (Parts I and II — same values for all students on the return)
  filer_magi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
  // Kiddie rule: denies refundable 40% AOC portion (Line 7 checkbox)
  taxpayer_under_24_no_refundable_aoc: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8863s: z.array(itemSchema).min(1),
});

type F8863Item = z.infer<typeof itemSchema>;
type F8863Items = F8863Item[];

// TY2025 constants (IRC §25A(d) — not inflation-adjusted)
const AOC_FIRST_TIER = 2000;
const AOC_SECOND_TIER_RATE = 0.25;
const AOC_EXPENSE_CAP = 4000;
const AOC_REFUNDABLE_RATE = 0.40;
const AOC_NONREFUNDABLE_RATE = 0.60;

const LLC_RATE = 0.20;
const LLC_EXPENSE_CAP = 10000;

const PHASE_OUT_MFJ_START = 160000;
const PHASE_OUT_MFJ_END = 180000;
const PHASE_OUT_OTHER_START = 80000;
const PHASE_OUT_OTHER_END = 90000;

// Returns true if the student is AOC-eligible (all four gates pass).
function isAocEligible(item: F8863Item): boolean {
  if (item.aoc_claimed_4_prior_years === true) return false;
  if (item.enrolled_half_time === false) return false;
  if (item.completed_4_years_postsec === true) return false;
  if (item.felony_drug_conviction === true) return false;
  return true;
}

// Per-student AOC tentative credit (Lines 27–30).
function aocTentativeCredit(expenses: number): number {
  const capped = Math.min(expenses, AOC_EXPENSE_CAP);
  const firstTier = Math.min(capped, AOC_FIRST_TIER);
  const secondTier = AOC_SECOND_TIER_RATE * Math.max(0, capped - AOC_FIRST_TIER);
  return firstTier + secondTier;
}

// Phase-out fraction (0–1, rounded to 3 decimal places per IRS instructions).
function phaseOutFraction(magi: number, isMfj: boolean): number {
  const start = isMfj ? PHASE_OUT_MFJ_START : PHASE_OUT_OTHER_START;
  const end = isMfj ? PHASE_OUT_MFJ_END : PHASE_OUT_OTHER_END;
  const raw = (magi - start) / (end - start);
  return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
}

// Returns true if credit is allowed (MFS filers cannot claim either credit).
function creditAllowed(item: F8863Item): boolean {
  return item.filing_status !== "mfs";
}

// Collect return-level context from the first item (all items share the same filer_magi
// and filing_status on a single return).
function returnContext(items: F8863Items): { magi: number; isMfj: boolean } {
  const first = items[0];
  const magi = first.filer_magi ?? 0;
  const isMfj = first.filing_status === "mfj";
  return { magi, isMfj };
}

// Aggregate all per-student AOC tentative credits (Line 1), apply phase-out (Lines 2–7),
// then split into refundable (Line 8 → f1040) and nonrefundable (Line 9 → schedule3).
function aocOutputs(items: F8863Items): NodeOutput[] {
  // Filter to AOC-eligible students on credit_type "aoc" with non-zero expenses.
  const eligible = items.filter(
    (item) =>
      item.credit_type === "aoc" &&
      creditAllowed(item) &&
      isAocEligible(item) &&
      (item.aoc_adjusted_expenses ?? 0) > 0,
  );
  if (eligible.length === 0) return [];

  // Sum per-student Line 30 values → Line 1.
  const totalTentative = eligible.reduce(
    (sum, item) => sum + aocTentativeCredit(item.aoc_adjusted_expenses ?? 0),
    0,
  );
  if (totalTentative === 0) return [];

  const { magi, isMfj } = returnContext(eligible);
  const fraction = phaseOutFraction(magi, isMfj);
  const allowed = totalTentative * (1 - fraction); // Line 7

  if (allowed <= 0) return [];

  // Check kiddie rule on the first eligible item (return-level flag).
  const kiddieApplies = eligible[0].taxpayer_under_24_no_refundable_aoc === true;

  const outputs: NodeOutput[] = [];

  if (kiddieApplies) {
    // Entire credit is nonrefundable (skip Line 8, put Line 7 on Line 9).
    outputs.push({ nodeType: schedule3.nodeType, fields: { line3_education_credit: allowed } });
  } else {
    const refundable = allowed * AOC_REFUNDABLE_RATE; // Line 8
    const nonrefundable = allowed * AOC_NONREFUNDABLE_RATE; // Line 9
    if (refundable > 0) {
      outputs.push({ nodeType: f1040.nodeType, fields: { line29_refundable_aoc: refundable } });
    }
    if (nonrefundable > 0) {
      outputs.push({ nodeType: schedule3.nodeType, fields: { line3_education_credit: nonrefundable } });
    }
  }

  return outputs;
}

// Aggregate all LLC expenses (Line 10), apply $10k cap (Line 11), apply 20% rate (Line 12),
// apply phase-out (Lines 13–18), emit to schedule3 (Line 18 → Credit Limit Worksheet → Line 19).
function llcOutputs(items: F8863Items): NodeOutput[] {
  // LLC items: any student where credit_type="llc" OR where AOC gates failed but llc_adjusted_expenses exist.
  const llcStudents = items.filter(
    (item) =>
      creditAllowed(item) &&
      (item.credit_type === "llc" ||
        (item.credit_type === "aoc" && !isAocEligible(item) && (item.llc_adjusted_expenses ?? 0) > 0) ||
        (item.credit_type === "aoc" && isAocEligible(item) === false)) &&
      (item.llc_adjusted_expenses ?? 0) > 0,
  );

  if (llcStudents.length === 0) return [];

  // Sum all Line 31 values → Line 10.
  const totalExpenses = llcStudents.reduce(
    (sum, item) => sum + (item.llc_adjusted_expenses ?? 0),
    0,
  );

  // Line 11: cap at $10,000.
  const cappedExpenses = Math.min(totalExpenses, LLC_EXPENSE_CAP);

  // Line 12: 20% rate.
  const llcBase = cappedExpenses * LLC_RATE;

  if (llcBase === 0) return [];

  const { magi, isMfj } = returnContext(llcStudents);
  const fraction = phaseOutFraction(magi, isMfj);
  const llcAllowed = llcBase * (1 - fraction); // Line 18

  if (llcAllowed <= 0) return [];

  return [{ nodeType: schedule3.nodeType, fields: { line3_education_credit: llcAllowed } }];
}

class F8863Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8863";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const items = parsed.f8863s;
    return {
      outputs: [
        ...aocOutputs(items),
        ...llcOutputs(items),
      ],
    };
  }
}

export const f8863 = new F8863Node();
