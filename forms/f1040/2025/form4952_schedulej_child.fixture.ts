import { form8814CapitalScheduleJInputs } from "./form8814_capital_schedulej.fixture.ts";

/** Current-year owner-paid taxable-share debt; all other source facts are retained. */
export function form4952ScheduleJChildInputs() {
  const input: Record<string, any> = form8814CapitalScheduleJInputs(
    false,
    false,
  );
  input.f1099div[0].investment_property_for_form4952 = true;
  input.form4952 = {
    investment_interest_expense: 20_000,
    direct_debt_trace: {
      tax_year: 2025,
      owner_tin: "123456789",
      loan_id: "ADA-2025-TAXABLE-SHARES-LOAN",
      lender_statement_reference: "ADA-LENDER-2025",
      loan_agreement_reference: "ADA-LOAN-AGREEMENT",
      disbursement_record_reference: "ADA-BANK-DISBURSEMENT",
      purchase_record_reference: "ADA-SHARES-PURCHASE",
      loan_date: "2025-01-10",
      direct_purchase_date: "2025-01-10",
      borrowed_principal: 100_000,
      direct_taxable_securities_purchase: 100_000,
      asset_id: "ADA-TAXABLE-SHARES",
      no_other_loan_proceeds_use: true,
      no_tax_exempt_or_passive_activity_asset: true,
      investment_use_maintained_through_2025: true,
      lender_2025_interest_total: 20_000,
      interest_payments: [
        {
          payment_id: "2025-JUN",
          payment_date: "2025-06-30",
          payment_record_reference: "ADA-BANK-JUN",
          interest_amount: 10_000,
        },
        {
          payment_id: "2025-DEC",
          payment_date: "2025-12-31",
          payment_record_reference: "ADA-BANK-DEC",
          interest_amount: 10_000,
        },
      ],
    },
    investment_income_election: 15_000,
    elected_capital_gain_portion: 0,
    amt_refigure: {
      prior_year_disallowed_interest: 0,
      interest_on_private_activity_bonds: 0,
      other_gross_income_adjustment: 0,
      qualified_dividends_adjustment: 0,
      net_disposition_gain_adjustment: 0,
      net_capital_gain_adjustment: 0,
      investment_expenses_adjustment: 0,
      elected_capital_gain_portion: 0,
    },
  };
  return input;
}
