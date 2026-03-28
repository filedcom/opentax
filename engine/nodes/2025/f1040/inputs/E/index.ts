import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  property_address: z.string(),
  property_type: z
    .enum(["rental_real_estate", "royalty", "partnership", "s_corp", "estate_trust"])
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

type EInput = z.infer<typeof inputSchema>;

class ENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_e";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule1",
    "schedule_d",
    "f1040",
    "schedule_b_interest",
  ] as const;

  compute(input: EInput): NodeResult {
    const outputs: NodeOutput[] = [];

    const propertyType = input.property_type ?? "rental_real_estate";
    const isK1Type =
      propertyType === "partnership" ||
      propertyType === "s_corp" ||
      propertyType === "estate_trust";

    if (isK1Type) {
      // K-1 income path
      if (input.k1_ordinary_income !== undefined) {
        outputs.push({
          nodeType: "schedule1",
          input: { line17_schedule_e: input.k1_ordinary_income },
        });
      }

      if (input.k1_cap_gain_lt !== undefined && input.k1_cap_gain_lt > 0) {
        outputs.push({
          nodeType: "schedule_d",
          input: { line12_k1_lt: input.k1_cap_gain_lt },
        });
      }

      if (input.k1_qualified_dividends !== undefined && input.k1_qualified_dividends > 0) {
        outputs.push({
          nodeType: "f1040",
          input: { line3a_qualified_dividends: input.k1_qualified_dividends },
        });
      }

      if (input.k1_interest_income !== undefined && input.k1_interest_income > 0) {
        outputs.push({
          nodeType: "schedule_b_interest",
          input: {
            payer_name: input.property_address,
            taxable_interest_net: input.k1_interest_income,
          },
        });
      }
    } else {
      // Rental / royalty path
      const totalExpenses =
        (input.line_5_advertising ?? 0) +
        (input.line_6_auto_travel ?? 0) +
        (input.line_7_cleaning_maintenance ?? 0) +
        (input.line_8_commissions ?? 0) +
        (input.line_9_insurance ?? 0) +
        (input.line_10_legal_professional ?? 0) +
        (input.line_11_management_fees ?? 0) +
        (input.line_12_mortgage_interest ?? 0) +
        (input.line_13_other_interest ?? 0) +
        (input.line_14_repairs ?? 0) +
        (input.line_15_supplies ?? 0) +
        (input.line_16_taxes ?? 0) +
        (input.line_17_utilities ?? 0) +
        (input.line_18_depreciation ?? 0) +
        (input.line_19_other ?? 0);

      const personalUseDays = input.personal_use_days ?? 0;
      const rentalDays = input.rental_days ?? 0;

      let deductibleExpenses = totalExpenses;

      if (
        personalUseDays > 0 &&
        rentalDays > 0 &&
        personalUseDays > Math.max(14, rentalDays * 0.1)
      ) {
        deductibleExpenses =
          totalExpenses * (rentalDays / (rentalDays + personalUseDays));
      }

      const netIncome =
        (input.rental_income ?? 0) +
        (input.royalty_income ?? 0) -
        deductibleExpenses;

      outputs.push({
        nodeType: "schedule1",
        input: { line17_schedule_e: netIncome },
      });
    }

    return { outputs };
  }
}

export const scheduleE = new ENode();
