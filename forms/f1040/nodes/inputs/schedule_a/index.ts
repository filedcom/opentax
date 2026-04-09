import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { standard_deduction } from "../../intermediate/worksheets/standard_deduction/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../types.ts";
import {
  SALT_CAP_2025,
  SALT_FLOOR_2025,
  SALT_FLOOR_MFS_2025,
  SALT_PHASEOUT_RATE_2025,
  SALT_PHASEOUT_THRESHOLD_2025,
  SALT_PHASEOUT_THRESHOLD_MFS_2025,
} from "../../config/2025.ts";

// OBBBA §70002 (TY2025): $40,000 cap (Single/MFJ/HOH/QSS), $20,000 for MFS
// Phase-out: 30% of excess MAGI over $500K ($250K MFS), floor $10K ($5K MFS)
const SALT_CAP_MFS = SALT_CAP_2025 / 2; // $20,000 for MFS (half of standard cap)

// 60% AGI limit for cash charitable contributions to public charities (IRC §170(b)(1)(A))
const CASH_CONTRIBUTION_AGI_PCT = 0.60;

// 30% AGI limit for noncash capital gain property contributions (IRC §170(b)(1)(C))
const NONCASH_CAPITAL_GAIN_AGI_PCT = 0.30;

// 7.5% AGI floor for medical deductions
const MEDICAL_AGI_FLOOR_PCT = 0.075;

export const inputSchema = z.object({
  // MFS filers receive $20,000 SALT cap (half of $40,000) per OBBBA §70002
  filing_status: z.nativeEnum(FilingStatus).optional(),
  force_itemized: z.boolean().optional(),
  force_standard: z.boolean().optional(),
  line_1_medical: z.number().nonnegative().optional(),
  agi: z.number().nonnegative().optional(),
  // Line 5a: State and local income taxes — mutually exclusive with line_5a_sales_tax
  // per IRC §164(b)(5) election. Provide one or the other, never both.
  line_5a_state_income_tax: z.number().nonnegative().optional(),
  // Line 5a (alternative): General sales tax deduction in lieu of income taxes
  // IRC §164(b)(5)(A) — taxpayer elects sales tax OR income tax, not both.
  line_5a_sales_tax: z.number().nonnegative().optional(),
  line_5b_real_estate_tax: z.number().nonnegative().optional(),
  line_5c_personal_property_tax: z.number().nonnegative().optional(),
  line_6_other_taxes: z.number().nonnegative().optional(),
  line_8a_mortgage_interest_1098: z.number().nonnegative().optional(),
  line_8b_mortgage_interest_no_1098: z.number().nonnegative().optional(),
  line_8c_points_no_1098: z.number().nonnegative().optional(),
  line_9_investment_interest: z.number().nonnegative().optional(),
  // Line 11: Cash contributions to public charities — 60% AGI cap (IRC §170(b)(1)(A))
  line_11_cash_contributions: z.number().nonnegative().optional(),
  // Line 12: Noncash contributions — treated as capital gain property, 30% AGI cap
  // IRC §170(b)(1)(C) for appreciated capital gain property; 50% cap for other noncash.
  // This field represents the more restrictive capital gain property category.
  line_12_noncash_contributions: z.number().nonnegative().optional(),
  line_13_contribution_carryover: z.number().nonnegative().optional(),
  line_15_casualty_theft_loss: z.number().nonnegative().optional(),
  line_16_other_deductions: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
  // IRC §164(b)(5): Taxpayer may elect to deduct general sales taxes in lieu of
  // state and local income taxes. The election is mutually exclusive — you cannot
  // deduct both. Reject when both are provided with nonzero values.
  const hasSalesTax = (data.line_5a_sales_tax ?? 0) > 0;
  const hasIncomeTax = (data.line_5a_state_income_tax ?? 0) > 0;
  if (hasSalesTax && hasIncomeTax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["line_5a_sales_tax"],
      message:
        "IRC §164(b)(5) election: you may deduct either state/local income taxes (line_5a_state_income_tax) " +
        "or general sales taxes (line_5a_sales_tax), but not both. Remove one before proceeding.",
    });
  }
});

type ScheduleAInput = z.infer<typeof inputSchema>;

function computeMedicalDeduction(input: ScheduleAInput, agi: number): number {
  return Math.max(0, (input.line_1_medical ?? 0) - agi * MEDICAL_AGI_FLOOR_PCT);
}

function effectiveSaltCap(input: ScheduleAInput): number {
  const isMfs = input.filing_status === FilingStatus.MFS;
  const baseCap = isMfs ? SALT_CAP_MFS : SALT_CAP_2025;
  const floor = isMfs ? SALT_FLOOR_MFS_2025 : SALT_FLOOR_2025;
  const threshold = isMfs ? SALT_PHASEOUT_THRESHOLD_MFS_2025 : SALT_PHASEOUT_THRESHOLD_2025;
  const magi = input.agi ?? 0;
  if (magi <= threshold) return baseCap;
  const reduction = (magi - threshold) * SALT_PHASEOUT_RATE_2025;
  return Math.max(floor, baseCap - reduction);
}

function computeSALT(input: ScheduleAInput): number {
  // line_5a is either state income tax or sales tax (election) — never both (validated in schema)
  const line5a = (input.line_5a_state_income_tax ?? 0) + (input.line_5a_sales_tax ?? 0);
  const saltTotal = line5a +
    (input.line_5b_real_estate_tax ?? 0) +
    (input.line_5c_personal_property_tax ?? 0);
  return Math.min(saltTotal, effectiveSaltCap(input));
}

function computeInterestTotal(input: ScheduleAInput): number {
  return (input.line_8a_mortgage_interest_1098 ?? 0) +
    (input.line_8b_mortgage_interest_no_1098 ?? 0) +
    (input.line_8c_points_no_1098 ?? 0) +
    (input.line_9_investment_interest ?? 0);
}

function computeContributions(input: ScheduleAInput, agi: number): number {
  if (agi <= 0) {
    return (input.line_11_cash_contributions ?? 0) +
      (input.line_12_noncash_contributions ?? 0) +
      (input.line_13_contribution_carryover ?? 0);
  }
  // IRC §170(b)(1)(A): cash contributions to public charities capped at 60% of AGI
  const cashAllowed = Math.min(
    input.line_11_cash_contributions ?? 0,
    agi * CASH_CONTRIBUTION_AGI_PCT,
  );
  // IRC §170(b)(1)(C): noncash capital gain property contributions capped at 30% of AGI
  const noncashAllowed = Math.min(
    input.line_12_noncash_contributions ?? 0,
    agi * NONCASH_CAPITAL_GAIN_AGI_PCT,
  );
  // Carryover follows the original contribution type; apply overall 60% ceiling to total
  const carryover = input.line_13_contribution_carryover ?? 0;
  const combined = cashAllowed + noncashAllowed + carryover;
  return Math.min(combined, agi * CASH_CONTRIBUTION_AGI_PCT);
}

class ScheduleANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form6251, standard_deduction]);

  compute(_ctx: NodeContext, input: ScheduleAInput): NodeResult {
    const agi = input.agi ?? 0;
    const saltCapped = computeSALT(input);
    const taxesTotal = saltCapped + (input.line_6_other_taxes ?? 0);
    const totalItemized = computeMedicalDeduction(input, agi) +
      taxesTotal +
      computeInterestTotal(input) +
      computeContributions(input, agi) +
      (input.line_15_casualty_theft_loss ?? 0) +
      (input.line_16_other_deductions ?? 0);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line12e_itemized_deductions: totalItemized }),
      // Feed standard_deduction node so it can compare standard vs itemized
      this.outputNodes.output(standard_deduction, { itemized_deductions: totalItemized }),
      // AMT addback: taxes paid total (Line 7) flows to Form 6251 Line 2a
      ...(taxesTotal > 0 ? [this.outputNodes.output(form6251, { line2a_taxes_paid: taxesTotal })] : []),
    ];
    return { outputs };
  }
}

export const scheduleA = new ScheduleANode();
