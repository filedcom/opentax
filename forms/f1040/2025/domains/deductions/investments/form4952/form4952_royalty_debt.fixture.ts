import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
const base = pdfReviewFixtures.find((x) => x.id === "single-w2-refund")!.inputs;
const royalty = {
  payer_name: "Patent Licensee",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  source_document_reference: "royalty-copy",
  box2_gross_royalties: 3000,
};
const input = {
  ...base,
  f1099m: [{
    payer_name: royalty.payer_name,
    payer_tin: royalty.payer_tin,
    recipient_tin: royalty.recipient_tin,
    source_document_reference: royalty.source_document_reference,
    box2_royalties: 3000,
    box2_royalties_routing: "schedule_e",
    box2_nonpassive_portfolio_investment_for_form4952_verified: true,
  }],
  f1099int: [{
    payer_name: "Bank",
    payer_tin: "222334444",
    recipient_tin: "111223333",
    source_document_reference: "bank-copy",
    box1: 1000,
    investment_property_for_form4952: true,
  }],
  form4952: {
    royalty_debt_trace: {
      tax_year: 2025,
      owner_tin: "111223333",
      loan_id: "royalty-loan",
      lender_statement_reference: "statement",
      loan_agreement_reference: "agreement",
      disbursement_record_reference: "disbursement",
      purchase_record_reference: "royalty-purchase",
      loan_date: "2025-01-10",
      direct_purchase_date: "2025-01-10",
      borrowed_principal: 10000,
      direct_royalty_property_purchase: 10000,
      asset_id: "patent-1",
      no_other_loan_proceeds_use: true,
      no_tax_exempt_or_passive_activity_asset: true,
      investment_use_maintained_through_2025: true,
      lender_2025_interest_total: 3500,
      interest_payments: [{
        payment_id: "paid-interest",
        payment_date: "2025-12-31",
        payment_record_reference: "bank-paid",
        interest_amount: 3500,
      }],
      property_description: "Acquired patent royalty",
      nonbusiness_portfolio_royalty: true,
      personally_liable_for_debt: true,
      no_loss_protection_or_reimbursement: true,
      no_other_current_royalty_deductions_after_review: true,
      royalty_source: royalty,
    },
    amt_refigure: {
      prior_year_disallowed_interest: 0,
      interest_on_private_activity_bonds: 0,
      other_gross_income_adjustment: 0,
      qualified_dividends_adjustment: 0,
      net_disposition_gain_adjustment: 0,
      net_capital_gain_adjustment: 0,
      investment_expenses_adjustment: 0,
    },
  },
};

export function royaltyDebtInputs(paid: number, interest: number[] = [1000]) {
  return {
    ...input,
    f1099int: interest.length
      ? interest.map((amount, i) => ({
        ...input.f1099int[0],
        payer_name: `Bank ${i + 1}`,
        source_document_reference: `bank-${i + 1}`,
        box1: amount,
      }))
      : undefined,
    form4952: {
      ...input.form4952,
      royalty_debt_trace: {
        ...input.form4952.royalty_debt_trace,
        lender_2025_interest_total: paid,
        interest_payments: [{
          ...input.form4952.royalty_debt_trace.interest_payments[0],
          interest_amount: paid,
        }],
      },
    },
  };
}
