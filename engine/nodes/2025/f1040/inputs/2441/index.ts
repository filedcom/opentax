import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  qualifying_person_count: z.number().int().min(1).optional(),
  qualifying_expenses_paid: z.number().nonnegative().optional(),
  employer_dep_care_benefits: z.number().nonnegative().optional(),
  agi: z.number().nonnegative().optional(),
  filing_status: z.enum(["single", "mfs", "mfj", "hoh", "qss"]).optional(),
  earned_income_taxpayer: z.number().nonnegative().optional(),
  earned_income_spouse: z.number().nonnegative().optional(),
});

type F2441Input = z.infer<typeof inputSchema>;

// Credit rate table: AGI thresholds and percentages per IRS Publication 503
// Rate decreases from 35% to 20% as AGI increases above $15,000 (in $2,000 increments, -1% per step)
function computeCreditRate(agi: number): number {
  if (agi <= 15000) return 0.35;
  if (agi > 43000) return 0.20;
  // Linear steps: each $2,000 over $15,000 reduces rate by 1%
  const stepsOver = Math.floor((agi - 15000) / 2000);
  return (35 - stepsOver) / 100;
}

class F2441Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2441";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["f1040", "schedule3"] as const;

  compute(input: F2441Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const filingStatus = input.filing_status ?? "single";
    const employerBenefits = input.employer_dep_care_benefits ?? 0;
    const expensesPaid = input.qualifying_expenses_paid ?? 0;
    const personCount = input.qualifying_person_count ?? 1;
    const agi = input.agi ?? 0;

    // Step 1: Employer exclusion limit
    const exclusionLimit = filingStatus === "mfs" ? 2500 : 5000;

    // Step 2: Taxable employer benefits = excess over exclusion
    const taxableEmployerBenefits = Math.max(0, employerBenefits - exclusionLimit);

    // Step 3: Max qualifying expenses by person count
    const maxQualifyingExpenses = personCount >= 2 ? 6000 : 3000;

    // Step 4: Net qualifying expenses (expenses minus excluded employer benefits, capped)
    const excludedBenefits = Math.min(employerBenefits, exclusionLimit);
    let netQualifyingExpenses = Math.min(expensesPaid, maxQualifyingExpenses) - excludedBenefits;

    // Step 5: Cap by earned income
    const earnedIncomeTaxpayer = input.earned_income_taxpayer ?? Infinity;
    const earnedIncomeSpouse = input.earned_income_spouse ?? Infinity;
    const minEarnedIncome =
      filingStatus === "mfj"
        ? Math.min(earnedIncomeTaxpayer, earnedIncomeSpouse)
        : earnedIncomeTaxpayer;
    if (minEarnedIncome !== Infinity) {
      netQualifyingExpenses = Math.min(netQualifyingExpenses, minEarnedIncome);
    }
    netQualifyingExpenses = Math.max(0, netQualifyingExpenses);

    // Step 6: Credit rate based on AGI
    const creditRate = computeCreditRate(agi);

    // Step 7: Credit amount
    const credit = netQualifyingExpenses * creditRate;

    // Routing: taxable employer benefits → f1040 line1e
    if (taxableEmployerBenefits > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line1e_taxable_dep_care: taxableEmployerBenefits },
      });
    }

    // Routing: credit → schedule3 line2
    if (credit > 0) {
      outputs.push({
        nodeType: "schedule3",
        input: { line2_childcare_credit: credit },
      });
    }

    return { outputs };
  }
}

export const f2441 = new F2441Node();
