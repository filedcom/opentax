import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { f2441 } from "../../../inputs/f2441/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  calculateForm2441Benefits,
  filingDetailsSchema,
} from "./calculation.ts";
import { form2441CreditRate, form2441Rules } from "./year-rules.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  filing_details: filingDetailsSchema.optional(),
  // AGI is supplied by the AGI aggregator through the Form 2441 input node.
  agi: z.number().int().optional(),
  // Total employer-provided dependent care benefits from W-2 Box 10.
  // Aggregated across all W-2s by the w2 input node.
  dep_care_benefits: z.number().nonnegative().optional(),

  // Filing status determines the §129 exclusion cap, §21 rate, and
  // earned-income cap (MFJ uses the lesser spouse amount).
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
});

// User-facing start input is only the filing facts. W-2 Box 10 is the
// authoritative source of employee dependent-care benefits in the graph.
export const filingInputSchema = z.object({
  filing_details: filingDetailsSchema,
}).strict();

type Form2441Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// IRC §129(a)(2): employer exclusion limit for the selected year.
function employerExclusionLimit(
  status: FilingStatus | undefined,
  rules: ReturnType<typeof form2441Rules>,
): number {
  return status === FilingStatus.MFS
    ? rules.employerExclusionMfs
    : rules.employerExclusion;
}

// Amount of employer benefits that exceeds the §129 exclusion → taxable income (f1040 line 1e)
function taxableExcess(
  benefits: number,
  status: FilingStatus | undefined,
  rules: ReturnType<typeof form2441Rules>,
): number {
  return Math.max(0, benefits - employerExclusionLimit(status, rules));
}

// Qualifying expense dollar limit (IRC §21(c)): $3,000 for 1 person, $6,000 for 2+
function expenseDollarLimit(
  persons: number,
  rules: ReturnType<typeof form2441Rules>,
): number {
  return persons >= 2 ? rules.expenseCapTwoPlus : rules.expenseCapOne;
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
function computeSection21Credit(
  input: Form2441Input,
  taxYear: number,
  rules: ReturnType<typeof form2441Rules>,
): number {
  const expenses = input.qualifying_expenses ?? 0;
  const persons = input.qualifying_persons ?? 0;
  const agi = input.agi ?? 0;
  const taxpayerEarned = input.taxpayer_earned_income ?? 0;
  const benefits = input.dep_care_benefits ?? 0;
  const excludedBenefits = Math.min(
    benefits,
    employerExclusionLimit(input.filing_status, rules),
  );

  if (expenses <= 0 || persons <= 0) return 0;

  const dollarCap = expenseDollarLimit(persons, rules);
  // Employer-excluded benefits reduce the qualifying expense base (Form 2441 line 9)
  const reducedCap = Math.max(0, dollarCap - excludedBenefits);
  const earnedCap = earnedIncomeCap(
    taxpayerEarned,
    input.spouse_earned_income,
    input.filing_status,
  );
  const allowedExpenses = Math.min(expenses, reducedCap, earnedCap);

  if (allowedExpenses <= 0) return 0;

  return Math.round(
    allowedExpenses * form2441CreditRate(
      taxYear,
      agi,
      input.filing_status ?? FilingStatus.Single,
    ),
  );
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form2441Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    schedule3,
    agi_aggregator,
    f2441,
  ]);

  compute(ctx: NodeContext, input: Form2441Input): NodeResult {
    const rules = form2441Rules(ctx.taxYear);
    const parsed = inputSchema.parse(input);
    const benefits = parsed.dep_care_benefits ?? 0;
    const outputs: NodeOutput[] = [];

    if (parsed.filing_details) {
      if (
        parsed.qualifying_persons !== undefined ||
        parsed.qualifying_expenses !== undefined ||
        parsed.taxpayer_earned_income !== undefined ||
        parsed.spouse_earned_income !== undefined ||
        parsed.agi !== undefined ||
        parsed.filing_status !== undefined
      ) {
        throw new Error(
          "Form 2441 filing details cannot be mixed with aggregate inputs",
        );
      }
      const lines = calculateForm2441Benefits(
        parsed.filing_details,
        benefits,
        ctx.taxYear,
      );
      if (lines.line26 > 0) {
        outputs.push(this.outputNodes.output(f1040, {
          line1e_taxable_dep_care: lines.line26,
        }));
        outputs.push(this.outputNodes.output(agi_aggregator, {
          line1e_taxable_dep_care: lines.line26,
        }));
      }
      outputs.push(this.outputNodes.output(f2441, {
        filing_details: parsed.filing_details,
        dep_care_benefits: benefits,
      }));
      return { outputs };
    }

    // Part III — §129 employer exclusion: excess above limit is taxable income
    const taxable = taxableExcess(benefits, parsed.filing_status, rules);
    if (taxable > 0) {
      outputs.push(
        this.outputNodes.output(f1040, { line1e_taxable_dep_care: taxable }),
      );
      outputs.push(
        this.outputNodes.output(agi_aggregator, {
          line1e_taxable_dep_care: taxable,
        }),
      );
    }

    // Part II — §21 credit: route to Schedule 3 line 2
    const credit = computeSection21Credit(parsed, ctx.taxYear, rules);
    if (credit > 0) {
      outputs.push(
        this.outputNodes.output(schedule3, { line2_childcare_credit: credit }),
      );
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form2441 = new Form2441Node();
