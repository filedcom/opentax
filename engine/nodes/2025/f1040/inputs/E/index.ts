import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { schedule_b_interest } from "../../intermediate/schedule_b_interest/index.ts";

export const itemSchema = z.object({
  property_address: z.string(),
  property_type: z
    .enum([
      "rental_real_estate",
      "royalty",
      "partnership",
      "s_corp",
      "estate_trust",
    ])
    .optional(),

  // Income
  rental_income: z.number().nonnegative().optional(),
  royalty_income: z.number().nonnegative().optional(),

  // Personal use / rental day tracking
  personal_use_days: z.number().int().nonnegative().optional(),
  rental_days: z.number().int().nonnegative().optional(),

  // Expense lines (Schedule E Part I)
  line_5_advertising: z.number().nonnegative().optional(),
  line_6_auto_travel: z.number().nonnegative().optional(),
  line_7_cleaning_maintenance: z.number().nonnegative().optional(),
  line_8_commissions: z.number().nonnegative().optional(),
  line_9_insurance: z.number().nonnegative().optional(),
  line_10_legal_professional: z.number().nonnegative().optional(),
  line_11_management_fees: z.number().nonnegative().optional(),
  line_12_mortgage_interest: z.number().nonnegative().optional(),
  line_13_other_interest: z.number().nonnegative().optional(),
  line_14_repairs: z.number().nonnegative().optional(),
  line_15_supplies: z.number().nonnegative().optional(),
  line_16_taxes: z.number().nonnegative().optional(),
  line_17_utilities: z.number().nonnegative().optional(),
  line_18_depreciation: z.number().nonnegative().optional(),
  line_19_other: z.number().nonnegative().optional(),

  // K-1 fields (partnership / S-corp)
  k1_ordinary_income: z.number().optional(),
  k1_rental_income: z.number().optional(),
  k1_interest_income: z.number().optional(),
  k1_qualified_dividends: z.number().optional(),
  k1_cap_gain_lt: z.number().optional(),
  k1_179_expense: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  schedule_es: z.array(itemSchema).min(1),
});

type ScheduleEItem = z.infer<typeof itemSchema>;

function isK1Type(item: ScheduleEItem): boolean {
  const propertyType = item.property_type ?? "rental_real_estate";
  return propertyType === "partnership" ||
    propertyType === "s_corp" ||
    propertyType === "estate_trust";
}

function computeK1Outputs(item: ScheduleEItem): NodeOutput[] {
  const outputs: NodeOutput[] = [];

  if (item.k1_ordinary_income !== undefined) {
    outputs.push({ nodeType: schedule1.nodeType, input: { line17_schedule_e: item.k1_ordinary_income } });
  }

  if (item.k1_cap_gain_lt !== undefined && item.k1_cap_gain_lt > 0) {
    outputs.push({ nodeType: schedule_d.nodeType, input: { line12_k1_lt: item.k1_cap_gain_lt } });
  }

  if (item.k1_qualified_dividends !== undefined && item.k1_qualified_dividends > 0) {
    outputs.push({ nodeType: f1040.nodeType, input: { line3a_qualified_dividends: item.k1_qualified_dividends } });
  }

  if (item.k1_interest_income !== undefined && item.k1_interest_income > 0) {
    outputs.push({
      nodeType: schedule_b_interest.nodeType,
      input: { payer_name: item.property_address, taxable_interest_net: item.k1_interest_income },
    });
  }

  return outputs;
}

function computeDeductibleExpenses(item: ScheduleEItem): number {
  const totalExpenses = (item.line_5_advertising ?? 0) +
    (item.line_6_auto_travel ?? 0) +
    (item.line_7_cleaning_maintenance ?? 0) +
    (item.line_8_commissions ?? 0) +
    (item.line_9_insurance ?? 0) +
    (item.line_10_legal_professional ?? 0) +
    (item.line_11_management_fees ?? 0) +
    (item.line_12_mortgage_interest ?? 0) +
    (item.line_13_other_interest ?? 0) +
    (item.line_14_repairs ?? 0) +
    (item.line_15_supplies ?? 0) +
    (item.line_16_taxes ?? 0) +
    (item.line_17_utilities ?? 0) +
    (item.line_18_depreciation ?? 0) +
    (item.line_19_other ?? 0);

  const personalUseDays = item.personal_use_days ?? 0;
  const rentalDays = item.rental_days ?? 0;

  return (personalUseDays > 0 &&
      rentalDays > 0 &&
      personalUseDays > Math.max(14, rentalDays * 0.1))
    ? totalExpenses * (rentalDays / (rentalDays + personalUseDays))
    : totalExpenses;
}

function computeRentalOutputs(item: ScheduleEItem): NodeOutput[] {
  const netIncome = (item.rental_income ?? 0) +
    (item.royalty_income ?? 0) -
    computeDeductibleExpenses(item);

  return [{ nodeType: schedule1.nodeType, input: { line17_schedule_e: netIncome } }];
}

class ENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    schedule_d,
    f1040,
    schedule_b_interest,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const outputs: NodeOutput[] = input.schedule_es.flatMap((item) =>
      isK1Type(item) ? computeK1Outputs(item) : computeRentalOutputs(item)
    );

    return { outputs };
  }
}

export const scheduleE = new ENode();
