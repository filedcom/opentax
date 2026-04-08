import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  DEP_CARE_EXPENSE_CAP_ONE_2025,
  DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025,
  DEP_CARE_EMPLOYER_EXCLUSION_2025,
  DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025,
  DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025,
  DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025,
} from "../../../config/2025.ts";

// IRC §21(a): credit rate — 35% at AGI ≤ $15,000, drops 1% per $2,000, floor 20%
const MAX_CREDIT_RATE = 0.35;
const MIN_CREDIT_RATE = 0.20;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Total employer-provided dependent care benefits from W-2 Box 10.
  // Aggregated across all W-2s by the w2 input node.
  dep_care_benefits: z.number().nonnegative().optional(),

  // Filing status — determines §129 employer exclusion cap (MFS = $2,500, others = $5,000)
  // and earned income cap (MFJ uses lesser of two spouses)
  filing_status: filingStatusSchema.optional(),

  // Number of qualifying persons (Form 2441 Part I)
  // Determines qualifying expense cap: 1 person = $3,000; 2+ = $6,000 (IRC §21(c))
  qualifying_persons: z.number().int().min(0).optional(),

  // Total qualifying expenses actually paid to care providers (Form 2441 Part II line 2)
  qualifying_expenses: z.number().nonnegative().optional(),

  // Taxpayer's earned income — wages + net SE income
  taxpayer_earned_income: z.number().nonnegative().optional(),

  // Spouse's earned income (MFJ only; credit capped at lower spouse's income per IRC §21(d))
  spouse_earned_income: z.number().nonnegative().optional(),

  // Adjusted Gross Income — determines §21 credit rate
  agi: z.number().nonnegative().optional(),
});

type Form2441Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// IRC §129(a)(2): employer exclusion limit — $5,000 general, $2,500 for MFS
function employerExclusionLimit(status: FilingStatus | undefined): number {
  return status === FilingStatus.MFS
    ? DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025
    : DEP_CARE_EMPLOYER_EXCLUSION_2025;
}

// Amount of employer benefits that exceeds the §129 exclusion → taxable income (f1040 line 1e)
function taxableExcess(benefits: number, status: FilingStatus | undefined): number {
  return Math.max(0, benefits - employerExclusionLimit(status));
}

// IRC §21(a)(2): applicable credit percentage based on AGI
function applicablePercentage(agi: number): number {
  if (agi <= DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025) return MAX_CREDIT_RATE;
  const stepsOver = Math.ceil(
    (agi - DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025) / DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025,
  );
  return Math.max(MIN_CREDIT_RATE, MAX_CREDIT_RATE - stepsOver * 0.01);
}

// Qualifying expense dollar limit (IRC §21(c)): $3,000 for 1 person, $6,000 for 2+
function expenseDollarLimit(persons: number): number {
  return persons >= 2 ? DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025 : DEP_CARE_EXPENSE_CAP_ONE_2025;
}

// Earned income cap: MFJ uses lesser of two spouses' earned incomes (IRC §21(d))
function earnedIncomeCap(
  taxpayerEarned: number,
  spouseEarned: number | undefined,
  status: FilingStatus | undefined,
): number {
  if (status === FilingStatus.MFJ && spouseEarned !== undefined) {
    return Math.min(taxpayerEarned, spouseEarned);
  }
  return taxpayerEarned;
}

// IRC §21 credit: qualifying expenses × applicable percentage
function computeSection21Credit(input: Form2441Input): number {
  const expenses = input.qualifying_expenses ?? 0;
  const persons = input.qualifying_persons ?? 0;
  const agi = input.agi ?? 0;
  const taxpayerEarned = input.taxpayer_earned_income ?? 0;
  const benefits = input.dep_care_benefits ?? 0;
  const excludedBenefits = Math.min(benefits, employerExclusionLimit(input.filing_status));

  if (expenses <= 0 || persons <= 0) return 0;

  const dollarCap = expenseDollarLimit(persons);
  // Employer-excluded benefits reduce the qualifying expense base (Form 2441 line 9)
  const reducedCap = Math.max(0, dollarCap - excludedBenefits);
  const earnedCap = earnedIncomeCap(taxpayerEarned, input.spouse_earned_income, input.filing_status);
  const allowedExpenses = Math.min(expenses, reducedCap, earnedCap);

  if (allowedExpenses <= 0) return 0;

  return Math.round(allowedExpenses * applicablePercentage(agi));
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form2441Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule3]);

  compute(_ctx: NodeContext, input: Form2441Input): NodeResult {
    const parsed = inputSchema.parse(input);
    const benefits = parsed.dep_care_benefits ?? 0;
    const outputs: NodeOutput[] = [];

    // Part III — §129 employer exclusion: excess above limit is taxable income
    const taxable = taxableExcess(benefits, parsed.filing_status);
    if (taxable > 0) {
      outputs.push(this.outputNodes.output(f1040, { line1e_taxable_dep_care: taxable }));
    }

    // Part II — §21 credit: route to Schedule 3 line 2
    const credit = computeSection21Credit(parsed);
    if (credit > 0) {
      outputs.push(this.outputNodes.output(schedule3, { line2_childcare_credit: credit }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form2441 = new Form2441Node();
