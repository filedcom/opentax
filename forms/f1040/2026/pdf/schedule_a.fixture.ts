import {
  syntheticMedical2026,
  syntheticPropertyTax2026,
  syntheticSalesTax2026,
  syntheticScheduleA2026,
} from "../schedule-a.fixture.ts";
import { syntheticMortgage2026 } from "../inputs/mortgage.fixture.ts";
import { syntheticEducator2026 } from "../inputs/educator.fixture.ts";
import { syntheticCashGift2026 } from "../inputs/cash-charity.fixture.ts";
import {
  calculateScheduleA2026,
  type ScheduleASource2026,
} from "../schedule-a.ts";
import type { DeductionSelectionInput2026 } from "./schedule_a.ts";
export function scheduleAFixture2026(): ScheduleASource2026 {
  const source = syntheticScheduleA2026();
  const mortgage = syntheticMortgage2026();
  const statement = mortgage.loans[0].interest_statements[0];
  statement.kind = "lender_payment_statement";
  statement.form1098 = undefined;
  statement.seller_financed = true;
  statement.lender_name = "Synthetic Home Seller";
  statement.seller_address = "100 Seller Street, Boston MA 02108";
  mortgage.loans[0].mortgage_insurance![0].current_form1098_reference =
    undefined;
  return {
    ...source,
    tax_election: "actual_sales",
    medical_payments: [syntheticMedical2026()],
    tax_payments: [syntheticPropertyTax2026(), syntheticSalesTax2026()],
    cash_gifts: [{ ...syntheticCashGift2026, amount_paid: 10100 }],
    mortgage_source_2026: mortgage,
    educator_source_2026: syntheticEducator2026(),
    educator_adjustment_from_agi: 350,
    source_scope_review: {
      ...source.source_scope_review,
      no_mortgage_or_investment_interest: undefined,
      has_mortgage_interest_sources: true,
      no_investment_interest: true,
      no_casualty_or_other_itemized_deductions: undefined,
      has_educator_expense_sources: true,
      no_casualty_or_other_itemized_except_educator: true,
    },
  };
}
export function scheduleADeductionFixture2026(
  source: ScheduleASource2026,
): DeductionSelectionInput2026 {
  const calculation = calculateScheduleA2026(source);
  return {
    filing_status: source.filing_status,
    agi: source.agi,
    standard_deduction_eligible: true,
    itemized_before_overall_limit: calculation.beforeOverallLimit,
    itemized_taxes: calculation.lines.line7,
    nonitemizer_cash_contributions: calculation.cash_gifts.reduce(
      (n, g) => n + g.nonitemizer_eligible_amount,
      0,
    ),
  };
}
