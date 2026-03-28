import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

export const itemSchema = z.object({
  qualifying_person_count: z.number().int().min(1).optional(),
  qualifying_expenses_paid: z.number().nonnegative().optional(),
  employer_dep_care_benefits: z.number().nonnegative().optional(),
  agi: z.number().nonnegative().optional(),
  filing_status: z.enum(["single", "mfs", "mfj", "hoh", "qss"]).optional(),
  earned_income_taxpayer: z.number().nonnegative().optional(),
  earned_income_spouse: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f2441s: z.array(itemSchema).min(1),
});

function computeNetQualifyingExpenses(
  expensesPaid: number,
  maxQualifyingExpenses: number,
  excludedBenefits: number,
  minEarnedIncome: number,
): number {
  const capped = Math.min(expensesPaid, maxQualifyingExpenses) - excludedBenefits;
  const earnedIncomeLimited = minEarnedIncome !== Infinity
    ? Math.min(capped, minEarnedIncome)
    : capped;
  return Math.max(0, earnedIncomeLimited);
}

// Credit rate table: AGI thresholds and percentages per IRS Publication 503
// Rate decreases from 35% to 20% as AGI increases above $15,000 (in $2,000 increments, -1% per step)
function computeCreditRate(agi: number): number {
  if (agi <= 15000) return 0.35;
  if (agi > 43000) return 0.20;
  const stepsOver = Math.floor((agi - 15000) / 2000);
  return (35 - stepsOver) / 100;
}

function f2441ItemOutputs(item: z.infer<typeof itemSchema>): NodeOutput[] {
  const filingStatus = item.filing_status ?? "single";
  const employerBenefits = item.employer_dep_care_benefits ?? 0;
  const expensesPaid = item.qualifying_expenses_paid ?? 0;
  const personCount = item.qualifying_person_count ?? 1;
  const agi = item.agi ?? 0;
  const exclusionLimit = filingStatus === "mfs" ? 2500 : 5000;
  const taxableEmployerBenefits = Math.max(0, employerBenefits - exclusionLimit);
  const maxQualifyingExpenses = personCount >= 2 ? 6000 : 3000;
  const excludedBenefits = Math.min(employerBenefits, exclusionLimit);
  const earnedIncomeTaxpayer = item.earned_income_taxpayer ?? Infinity;
  const earnedIncomeSpouse = item.earned_income_spouse ?? Infinity;
  const minEarnedIncome = filingStatus === "mfj"
    ? Math.min(earnedIncomeTaxpayer, earnedIncomeSpouse)
    : earnedIncomeTaxpayer;
  const credit = computeNetQualifyingExpenses(expensesPaid, maxQualifyingExpenses, excludedBenefits, minEarnedIncome) *
    computeCreditRate(agi);
  return [
    ...(taxableEmployerBenefits > 0 ? [{ nodeType: f1040.nodeType, input: { line1e_taxable_dep_care: taxableEmployerBenefits } }] : []),
    ...(credit > 0 ? [{ nodeType: schedule3.nodeType, input: { line2_childcare_credit: credit } }] : []),
  ];
}

class F2441Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule3]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.f2441s.flatMap(f2441ItemOutputs) };
  }
}

export const f2441 = new F2441Node();
