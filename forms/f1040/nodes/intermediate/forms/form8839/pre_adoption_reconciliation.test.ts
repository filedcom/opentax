import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import { reconcilePreAdoptionForm8839Credit } from "./pre_adoption_reconciliation.ts";
import { finalizeStagedForm8839Sink } from "./staged_sink_finalizer.ts";

const childSource = {
  filing_status: FilingStatus.Single,
  children: [{
    first_name: "Ada",
    last_name: "Taxpayer",
    birth_year: 2020,
    ssn: "111223334",
    final_decree: {
      source_document_id: "decree-1",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
    },
    expenses: [{
      source_document_id: "invoice-1",
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount: 12_000,
      reimbursed_amount: 0,
    }],
  }],
};
const childReview = {
  reviewed_by: "Adoption Reviewer",
  reviewed_on: "2026-04-01",
  adoption_case_reference: "case-TX-2025-1",
  decree: {
    source_document_id: "decree-1",
    document_sha256: "a".repeat(64),
    child_first_name: "Ada",
    child_last_name: "Taxpayer",
    child_ssn: "111223334",
    finalization_date: "2025-07-15",
    issuing_jurisdiction: "TX",
    child_origin: "US",
    taxpayer_named_as_adoptive_parent_confirmed: true,
  },
  reviewed_facts: {
    child_us_citizen_or_resident_when_effort_began_confirmed: true,
    child_under_18_on_2025_12_31_confirmed: true,
    child_not_taxpayers_spouses_child_confirmed: true,
    no_other_nonspouse_taxpayer_claim_confirmed: true,
    no_prior_form8839_claim_for_child_confirmed: true,
    no_employer_adoption_benefits_confirmed: true,
    no_government_or_other_reimbursement_confirmed: true,
    no_other_federal_credit_or_deduction_for_expenses_confirmed: true,
    no_surrogacy_or_illegal_expenses_confirmed: true,
  },
  expenses: [{
    source_document_id: "invoice-1",
    receipt_sha256: "b".repeat(64),
    payment_proof_document_id: "payment-1",
    payment_proof_sha256: "c".repeat(64),
    paid_date: "2025-03-12",
    category: "attorney_fee",
    payee: "Adoption Counsel",
    amount: 12_000,
    directly_related_to_legal_adoption_confirmed: true,
  }],
};
const review = {
  reviewed_by: "Return Reviewer",
  reviewed_on: "2026-04-01",
  section933: {
    no_puerto_rico_excluded_income_confirmed: true,
    return_wide_review_reference: "2025-territory-income-review",
  },
  form2555: {
    no_form2555_filing_or_exclusion_confirmed: true,
    return_wide_review_reference: "2025-foreign-income-review",
  },
  form4563: {
    no_form4563_filing_or_exclusion_confirmed: true,
    return_wide_review_reference: "2025-territory-return-review",
  },
};
const schedule3 = {
  line1: 1_000,
  line2: 0,
  line3: 0,
  line4: 0,
  line5a: 0,
  line5b: 0,
  line6aGbc: 0,
  line6bPriorMinimumTax: 0,
  line6cAdoption: 0,
  line6dElderlyDisabled: 0,
  line6fCleanVehicle: 0,
  line6gMortgage: 0,
  line6hHomebuyer: 0,
  line6iElectricVehicle: 0,
  line6jRefueling: 0,
  line6kBondCredit: 0,
  line6lForm8978: 0,
  line6mUsedCleanVehicle: 0,
  line7: 0,
};
const sinkInput = {
  filing_status: FilingStatus.Single,
  line1a_wages: 200_000,
  line11_agi: 200_000,
  line16_income_tax: 20_000,
  line17_additional_taxes: 0,
  line19_child_tax_credit: 2_000,
  line20_nonrefundable_credits: 1_000,
  form8859_worksheet_b_applies: false,
  credit_limit_schedule3_lines: schedule3,
};

Deno.test("Form 8839 reconciles pure MAGI and limit from computed pre-adoption 1040", () => {
  const result = reconcilePreAdoptionForm8839Credit(
    childSource,
    childReview,
    sinkInput,
    review,
  );
  assertEquals(result.context.form1040_line11b_agi, 200_000);
  assertEquals(result.context.form1040_line18_tax_before_credits, 20_000);
  assertEquals(result.credit.creditLimitWorksheet.line3, 3_000);
  assertEquals(result.credit.creditLimitWorksheet.line4, 17_000);
  assertEquals(result.credit.line13, 5_000);
  assertEquals(result.credit.line18, 7_000);
});

Deno.test("Form 8839 staged sink derives both final return and Schedule 3 from its own pre-credit computation", () => {
  const final = finalizeStagedForm8839Sink(
    childSource,
    childReview,
    sinkInput,
    review,
  );
  assertEquals(final.preAdoption1040.line18_total_tax_before_credits, 20_000);
  assertEquals(final.credit.line18, 7_000);
  assertEquals(final.finalSchedule3, {
    line6c_adoption_credit: 7_000,
    line7_total: 7_000,
    line8_total: 8_000,
  });
  assertEquals(final.final1040.line20_nonrefundable_credits, 8_000);
  assertEquals(final.final1040.line21_credits_total, 10_000);
  assertEquals(final.final1040.line30_refundable_adoption, 5_000);
});

Deno.test("Form 8839 staged sink refuses prefilled adoption credit and unreconciled prior credits", () => {
  assertThrows(() =>
    finalizeStagedForm8839Sink(childSource, childReview, {
      ...sinkInput,
      line30_refundable_adoption: 5_000,
    }, review)
  );
  assertThrows(() =>
    finalizeStagedForm8839Sink(childSource, childReview, {
      ...sinkInput,
      line20_nonrefundable_credits: 999,
    }, review)
  );
});

Deno.test("Form 8839 rejects absent return-wide zero-source review", () => {
  assertThrows(() =>
    reconcilePreAdoptionForm8839Credit(childSource, childReview, sinkInput, {})
  );
  assertThrows(() =>
    reconcilePreAdoptionForm8839Credit(childSource, childReview, sinkInput, {
      ...review,
      section933: {
        ...review.section933,
        no_puerto_rico_excluded_income_confirmed: false,
      },
    })
  );
});

Deno.test("Form 8839 rejects unsettled priorities and existing adoption amounts", () => {
  for (
    const changed of [
      { ...sinkInput, line30_refundable_adoption: 5_000 },
      {
        ...sinkInput,
        credit_limit_schedule3_lines: { ...schedule3, line6cAdoption: 1 },
      },
      { ...sinkInput, line20_nonrefundable_credits: 999 },
      {
        ...sinkInput,
        credit_limit_schedule3_lines: { ...schedule3, line7: 1 },
      },
      { ...sinkInput, form8859_worksheet_b_applies: true },
      { ...sinkInput, form8839_form2555_line45: 1 },
    ]
  ) {
    assertThrows(() =>
      reconcilePreAdoptionForm8839Credit(
        childSource,
        childReview,
        changed,
        review,
      )
    );
  }
});

Deno.test("Form 8839 rejects asserted AGI inconsistent with computed income", () => {
  assertThrows(() =>
    reconcilePreAdoptionForm8839Credit(
      childSource,
      childReview,
      { ...sinkInput, line11_agi: 199_999 },
      review,
    )
  );
});
