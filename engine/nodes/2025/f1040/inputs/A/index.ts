import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";

// TY2025 SALT cap per OBBBA — $40,000 single/MFJ, $20,000 MFS
const SALT_CAP = 40_000;

// 60% AGI limit for cash charitable contributions to public charities
const CASH_CONTRIBUTION_AGI_PCT = 0.60;

// 7.5% AGI floor for medical deductions
const MEDICAL_AGI_FLOOR_PCT = 0.075;

export const inputSchema = z.object({
  force_itemized: z.boolean().optional(),
  force_standard: z.boolean().optional(),
  line_1_medical: z.number().nonnegative().optional(),
  agi: z.number().nonnegative().optional(),
  line_5a_tax_amount: z.number().nonnegative().optional(),
  line_5b_real_estate_tax: z.number().nonnegative().optional(),
  line_5c_personal_property_tax: z.number().nonnegative().optional(),
  line_6_other_taxes: z.number().nonnegative().optional(),
  line_8a_mortgage_interest_1098: z.number().nonnegative().optional(),
  line_8b_mortgage_interest_no_1098: z.number().nonnegative().optional(),
  line_8c_points_no_1098: z.number().nonnegative().optional(),
  line_9_investment_interest: z.number().nonnegative().optional(),
  line_11_cash_contributions: z.number().nonnegative().optional(),
  line_12_noncash_contributions: z.number().nonnegative().optional(),
  line_13_contribution_carryover: z.number().nonnegative().optional(),
  line_15_casualty_theft_loss: z.number().nonnegative().optional(),
  line_16_other_deductions: z.number().nonnegative().optional(),
});

type ScheduleAInput = z.infer<typeof inputSchema>;

function computeMedicalDeduction(input: ScheduleAInput, agi: number): number {
  return Math.max(0, (input.line_1_medical ?? 0) - agi * MEDICAL_AGI_FLOOR_PCT);
}

function computeSALT(input: ScheduleAInput): number {
  const saltTotal = (input.line_5a_tax_amount ?? 0) +
    (input.line_5b_real_estate_tax ?? 0) +
    (input.line_5c_personal_property_tax ?? 0);
  return Math.min(saltTotal, SALT_CAP);
}

function computeInterestTotal(input: ScheduleAInput): number {
  return (input.line_8a_mortgage_interest_1098 ?? 0) +
    (input.line_8b_mortgage_interest_no_1098 ?? 0) +
    (input.line_8c_points_no_1098 ?? 0) +
    (input.line_9_investment_interest ?? 0);
}

function computeContributions(input: ScheduleAInput, agi: number): number {
  const contributionsRaw = (input.line_11_cash_contributions ?? 0) +
    (input.line_12_noncash_contributions ?? 0) +
    (input.line_13_contribution_carryover ?? 0);
  const contributionsAgiCap = agi * CASH_CONTRIBUTION_AGI_PCT;
  return agi > 0
    ? Math.min(contributionsRaw, contributionsAgiCap)
    : contributionsRaw;
}

class ScheduleANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form6251]);

  compute(input: ScheduleAInput): NodeResult {
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
      { nodeType: f1040.nodeType, input: { line12e_itemized_deductions: totalItemized } },
      // AMT addback: taxes paid total (Line 7) flows to Form 6251 Line 2a
      ...(taxesTotal > 0 ? [{ nodeType: form6251.nodeType, input: { line2a_taxes_paid: taxesTotal } }] : []),
    ];
    return { outputs };
  }
}

export const scheduleA = new ScheduleANode();
