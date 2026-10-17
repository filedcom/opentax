// Constructed source contracts; no external issuer or accepted-history claim.
import {
  passiveK1Cases,
  passiveK1Inputs,
  passiveK1Item,
} from "./eic_passive_k1.fixture.ts";

/** All Worksheet 1 investment categories coexist with an allowed passive loss.
 * Independently specified ledger: 200 + 7150 + 300 + 1400 + 400 +
 * (900 + 900 - 300) + (6000 - 5000) = 11950. */
export function combinedInvestmentInputs(
  overLimit = false,
  retainedSale = false,
) {
  const inputs = retainedSale
    ? passiveK1Cases.find((c) => c.id === "retained_sale_income")!.inputs()
    : passiveK1Inputs();
  if (retainedSale) inputs.schedule_e[0].expense_taxes = 2000;
  else {
    inputs.k1_partnership = [passiveK1Item("partnership", "box2", 6000)];
    inputs.schedule_e = [];
  }
  inputs.f1099int[0].box1 = 200;
  inputs.f1099int[0].box8 = 7000 + Number(overLimit);
  inputs.f1099div = [{
    payerName: "Reviewed dividend issuer",
    payerTin: "876543210",
    source_document_reference: "2025 issued dividend copy",
    account_number: "DIV-2025",
    recipient_tin: "111223333",
    box1a: 300,
    box2a: 400,
    isNominee: false,
    box11: false,
  }];
  const payer = {
    payer_name: "Patent Licensee",
    payer_tin: "234567890",
    recipient_tin: "111223333",
    source_document_reference: "2025 Patent Licensee issued royalty copy",
    box2_royalties: 900,
    box2_royalties_routing: "schedule_e",
    box2_nonpassive_portfolio_investment_for_form4952_verified: true,
  };
  inputs.f1099m = [payer];
  inputs.schedule_e.push({
    tsj: "T",
    property_description: "Patent royalty property",
    property_type: 6,
    activity_type: "D",
    fair_rental_days: 0,
    personal_use_days: 0,
    rent_income: 0,
    royalties_income: 900,
    form_1099_payments_made: false,
    f1099m_royalty_source: {
      payer_name: payer.payer_name,
      payer_tin: payer.payer_tin,
      recipient_tin: payer.recipient_tin,
      source_document_reference: payer.source_document_reference,
      box2_gross_royalties: 900,
    },
  });
  inputs.personal_property_rental = [{
    property_description: "Camera rental",
    recipient_tin: "111223333",
    rental_agreement_reference: "2025 camera rental agreement",
    payment_record_reference: "2025 camera payment ledger",
    gross_rent: 900,
    deductible_expenses: 300,
    expense_workpaper_reference: "2025 camera expense ledger",
    engaged_for_profit_reviewed: true,
    not_trade_or_business_reviewed: true,
    expenses_not_claimed_elsewhere: true,
  }];
  const income = { interest_income: 4100, tax_exempt_interest: 150 };
  inputs.f8814 = [{
    child_name: "Casey Child",
    child_name_control: "CHIL",
    child_ssn: "987654321",
    child_age_eligible: true,
    child_required_to_file: true,
    child_income_only_permitted_types: true,
    child_no_joint_return: true,
    child_no_estimated_payments: true,
    child_no_withholding: true,
    parent_eligible_to_elect: true,
    ...income,
    source_review: {
      source_document_reference: "2025 Casey child bank income and election",
      tax_year: 2025,
      child_ssn: "987654321",
      electing_parent_ssn: "111223333",
      eligibility_reviewed: true,
      income,
    },
  }];
  return inputs;
}
