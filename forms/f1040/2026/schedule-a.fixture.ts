import { FilingStatus } from "../nodes/types.ts";
import type { ScheduleASource2026 } from "./schedule-a.ts";
import { zeroExclusions2026 } from "./nodes/schedule1a.fixture.ts";
import type { z } from "zod";
import type {
  medicalPayment2026Schema,
  taxPayment2026Schema,
} from "./inputs/itemized-expense-source.ts";
export const itemizedScopeReview2026 = {
  record_reference: "itemized-source-inventory",
  no_other_deductible_taxes: true as const,
  no_mortgage_or_investment_interest: true as const,
  no_noncash_gifts_or_prior_charitable_carryovers: true as const,
  no_casualty_or_other_itemized_deductions: true as const,
  no_nol_carryback: true as const,
};
export const itemizedClaim2026 = {
  tax_year: 2026 as const,
  tax_election: "income" as const,
  source_scope_review: itemizedScopeReview2026,
  salt_zero_exclusions_review: zeroExclusions2026,
};
export function syntheticScheduleA2026(): ScheduleASource2026 {
  return {
    ...itemizedClaim2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    agi: 100_000,
  };
}
const payment = {
  source_document_reference: "receipt",
  payer_ssn: "111223333",
  payment_date: "2026-08-01",
  qualification_record_reference: "expense-review",
  not_deducted_elsewhere: true as const,
};
export function syntheticMedical2026(): z.input<
  typeof medicalPayment2026Schema
> {
  return {
    ...payment,
    payment_reference: "medical-payment",
    amount_paid: 20_000,
    patient_ssn: "111223333",
    patient_eligible_under_section213: true,
    provider_name: "Example Medical Center",
    category: "medical_or_dental_care",
    reimbursed_amount: 2_000,
    tax_free_funding_amount: 1_000,
    nonmedical_amount: 500,
    no_ltc_capital_improvement_or_travel_limit: true,
  };
}
export function syntheticPropertyTax2026():
  & z.input<typeof taxPayment2026Schema>
  & { kind: "real_estate" } {
  return {
    ...payment,
    payment_reference: "property-tax-payment",
    amount_paid: 30_000,
    kind: "real_estate",
    authority: "Example County",
    property_reference: "primary-home",
    nondeductible_assessments_or_service_charges: 500,
    current_payment_refund: 250,
    personal_use_only: true,
    domestic_property: true,
    no_ownership_change_allocation: true,
    tax_assessed_before_payment: true,
  };
}
export function syntheticSalesTax2026():
  & z.input<typeof taxPayment2026Schema>
  & { kind: "general_sales" } {
  return {
    ...payment,
    payment_reference: "sales-tax-payment",
    amount_paid: 2_400,
    kind: "general_sales",
    seller: "Example Dealer",
    purchase_kind: "motor_vehicle",
    taxable_purchase_price: 30_000,
    purchase_tax_rate: .08,
    general_tax_rate: .06,
    current_payment_refund: 300,
    personal_use_only: true,
  };
}
