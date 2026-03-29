import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { filingStatusSchema } from "../../types.ts";

// TY2025 constants — IRC §21(c), IRC §129(a)(2)
const EXPENSE_CAP_ONE_PERSON = 3000;
const EXPENSE_CAP_TWO_PLUS = 6000;
const EMPLOYER_EXCLUSION_LIMIT = 5000;   // MFJ / single / HOH / QSS
const EMPLOYER_EXCLUSION_MFS = 2500;

// Credit rate table — AGI $0–$15,000: 35%; decreases 1% per $2,000 above $15,000;
// floor at 20% for AGI above $43,000. IRC §21(a)(2); Form 2441 Instructions, Line 8.
const CREDIT_RATE_AGI_THRESHOLD = 15000;
const CREDIT_RATE_BRACKET_SIZE = 2000;
const CREDIT_RATE_MAX = 0.35;
const CREDIT_RATE_FLOOR = 0.20;

export const itemSchema = z.object({
  qualifying_person_count: z.number().int().min(1).optional(),
  qualifying_expenses_paid: z.number().nonnegative().optional(),
  employer_dep_care_benefits: z.number().nonnegative().optional(),
  agi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
  earned_income_taxpayer: z.number().nonnegative().optional(),
  earned_income_spouse: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f2441s: z.array(itemSchema).min(1),
});

type F2441Item = z.infer<typeof itemSchema>;

// Returns the credit rate as a decimal for the given AGI.
// Rate decreases 1% per $2,000 over $15,000 (exclusive); floored at 20%.
// Integer arithmetic avoids floating-point rounding errors.
function creditRate(agi: number): number {
  if (agi <= CREDIT_RATE_AGI_THRESHOLD) return CREDIT_RATE_MAX;
  const steps = Math.ceil((agi - CREDIT_RATE_AGI_THRESHOLD) / CREDIT_RATE_BRACKET_SIZE);
  // Work in basis points (1 bp = 0.0001) to avoid FP arithmetic on decimals
  const rateBps = Math.round(CREDIT_RATE_MAX * 10000) - steps * 100;
  const floorBps = Math.round(CREDIT_RATE_FLOOR * 10000);
  return Math.max(floorBps, rateBps) / 10000;
}

// Returns the statutory exclusion cap for the given filing status.
function exclusionLimit(filingStatus: string): number {
  return filingStatus === "mfs" ? EMPLOYER_EXCLUSION_MFS : EMPLOYER_EXCLUSION_LIMIT;
}

// Returns the qualifying expense cap for the given number of qualifying persons.
function expenseCap(personCount: number): number {
  return personCount >= 2 ? EXPENSE_CAP_TWO_PLUS : EXPENSE_CAP_ONE_PERSON;
}

// Computes outputs for a single f2441 item (one filing unit's data).
function itemOutputs(item: F2441Item): NodeOutput[] {
  const filingStatus = item.filing_status ?? "single";
  const personCount = item.qualifying_person_count ?? 1;
  const expensesPaid = item.qualifying_expenses_paid ?? 0;
  const employerBenefits = item.employer_dep_care_benefits ?? 0;
  const agi = item.agi ?? 0;

  // --- Part III: Employer-Provided Dependent Care Benefits ---
  const limit = exclusionLimit(filingStatus);
  const excludedBenefits = Math.min(employerBenefits, limit);
  const taxableBenefits = Math.max(0, employerBenefits - limit);

  // --- Part II: Credit Computation ---
  // Step P2-1: apply expense cap; then reduce by excluded employer benefits
  const cap = expenseCap(personCount);
  const residualCap = Math.max(0, cap - excludedBenefits);
  const cappedExpenses = Math.min(expensesPaid, residualCap);

  // Step P2-2: apply earned income limitation
  const earnedIncomeTaxpayer = item.earned_income_taxpayer ?? Infinity;
  const earnedIncomeSpouse = item.earned_income_spouse ?? Infinity;
  const minEarnedIncome = filingStatus === "mfj"
    ? Math.min(earnedIncomeTaxpayer, earnedIncomeSpouse)
    : earnedIncomeTaxpayer;

  const netQualifyingExpenses = minEarnedIncome !== Infinity
    ? Math.min(cappedExpenses, minEarnedIncome)
    : cappedExpenses;

  // Step P2-4: apply credit percentage
  const credit = netQualifyingExpenses * creditRate(agi);

  const outputs: NodeOutput[] = [];

  if (taxableBenefits > 0) {
    outputs.push(output(f1040, { line1e_taxable_dep_care: taxableBenefits }));
  }

  if (credit > 0) {
    outputs.push(output(schedule3, { line2_childcare_credit: credit }));
  }

  return outputs;
}

class F2441Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule3]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f2441s.flatMap(itemOutputs) };
  }
}

export const f2441 = new F2441Node();
