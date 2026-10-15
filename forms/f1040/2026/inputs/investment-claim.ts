import { z } from "zod";
import {
  calculateInvestmentIncome2026,
  investmentIncome2026Schema,
} from "./investment-income.ts";
import { investmentOwner2026 } from "./investment-source.ts";
const ref = z.string().trim().min(1);
export const investmentClaim2026Schema = investmentIncome2026Schema.omit({
  filing_status: true,
  taxpayer_ssn: true,
  spouse_ssn: true,
}).extend({
  source_scope_review: z.object({
    record_reference: ref,
    all_interest_and_dividend_copies_included: z.literal(true),
    property_held_for_investment_not_a_trade_or_business: z.literal(true),
    no_other_niit_income_expenses_or_carryovers: z.literal(true),
    no_foreign_entities_or_niit_magi_adjustments: z.literal(true),
  }).strict(),
  capital_gain_inventory_review: z.union([
    z.object({
      record_reference: ref,
      only_regular_capital_gain_distributions: z.literal(true),
      no_dispositions_exchanges_or_other_schedule_d_items: z.literal(true),
      no_capital_loss_carryovers: z.literal(true),
    }).strict(),
    z.object({
      record_reference: ref,
      capital_transaction_inventory_reference: ref,
    }).strict(),
  ]).optional(),
  state_income_tax_allocation_review: z.object({
    record_reference: ref,
    method: z.literal("nii_to_agi_after_proportional_salt_limit"),
    reasonable_for_reported_income_and_tax_payments: z.literal(true),
  }).strict().optional(),
}).strict();
export const investmentSource2026Schema = investmentClaim2026Schema.extend(
  investmentOwner2026.shape,
).strict();
export type InvestmentSource2026 = z.input<typeof investmentSource2026Schema>;
export function calculateInvestmentClaim2026(raw: InvestmentSource2026) {
  const input = investmentSource2026Schema.parse(raw);
  const {
    source_scope_review: _scope,
    capital_gain_inventory_review: capital,
    state_income_tax_allocation_review: _tax,
    ...facts
  } = input;
  const result = calculateInvestmentIncome2026(facts);
  if (result.cents.capital_gain_distributions > 0 && !capital) {
    throw new Error(
      "Capital-gain distributions need the complete Schedule D inventory review",
    );
  }
  return { ...result, source_input: input };
}
