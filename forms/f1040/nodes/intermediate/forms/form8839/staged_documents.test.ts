import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as MefFilingStatus } from "../../../../mef/header.ts";
import { FilingStatus } from "../../../types.ts";
import { projectStagedForm8839Documents } from "./staged_documents.ts";
import { finalizeStagedForm8839Sink } from "./staged_sink_finalizer.ts";

const source = {
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
  birth_record: {
    source_document_id: "birth-1",
    document_sha256: "d".repeat(64),
    child_first_name: "Ada",
    child_last_name: "Taxpayer",
    date_of_birth: "2020-02-01",
  },
  reviewed_facts: {
    child_us_citizen_or_resident_when_effort_began_confirmed: true,
    child_under_18_on_2025_12_31_confirmed: true,
    child_not_taxpayers_spouses_child_confirmed: true,
    no_other_nonspouse_taxpayer_claim_confirmed: true,
    no_prior_form8839_claim_for_child_confirmed: true,
    no_employer_adoption_benefits_confirmed: true,
    all_reimbursements_disclosed_confirmed: true,
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
const magiReview = {
  reviewed_by: "Return Reviewer",
  reviewed_on: "2026-04-01",
  section933: {
    no_puerto_rico_excluded_income_confirmed: true,
    return_wide_review_reference: "territory-review",
  },
  form2555: {
    no_form2555_filing_or_exclusion_confirmed: true,
    return_wide_review_reference: "foreign-income-review",
  },
  form4563: {
    no_form4563_filing_or_exclusion_confirmed: true,
    return_wide_review_reference: "territory-return-review",
  },
};
const schedule3Input = {
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
  credit_limit_schedule3_lines: schedule3Input,
};
const finalPending = {
  form8839: source,
  f1040: {
    line11_agi: 200_000,
    line18_total_tax_before_credits: 20_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 8_000,
    line30_refundable_adoption: 5_000,
  },
  schedule3: {
    line6c_adoption_credit: 7_000,
    line7_total: 7_000,
    line8_total: 8_000,
  },
};
const filer = {
  primarySSN: "123456789",
  nameLine1: "Example Taxpayer",
  nameControl: "EXAM",
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: MefFilingStatus.Single,
};

function project(pending: unknown = finalPending) {
  return projectStagedForm8839Documents(
    source,
    childReview,
    sinkInput,
    magiReview,
    pending,
    filer,
  );
}

Deno.test("Form 8839 staged native and PDF values use one reconciled credit", () => {
  const result = project();
  assertStringIncludes(result.xml, "<AdoptionFinalInd>X</AdoptionFinalInd>");
  assertStringIncludes(
    result.xml,
    "<RefundableAdoptionCreditAmt>5000</RefundableAdoptionCreditAmt>",
  );
  assertStringIncludes(
    result.xml,
    "<NonrefundableAdoptionCreditAmt>7000</NonrefundableAdoptionCreditAmt>",
  );
  assertEquals(result.pdfFields.line7, 200_000);
  assertEquals(result.pdfFields.line13, 5_000);
  assertEquals(result.pdfFields.line18, 7_000);
  assertEquals(result.pdfFields.noPriorForm, true);
  assertEquals(result.pdfFields.noPhaseout, true);
});

Deno.test("Form 8839 staged income phaseout settles credit before native/PDF projection", () => {
  const phasedSink = {
    ...sinkInput,
    line1a_wages: 269_190,
    line11_agi: 269_190,
  };
  const settled = finalizeStagedForm8839Sink(
    source,
    childReview,
    phasedSink,
    magiReview,
  );
  assertEquals(settled.credit.fraction, 0.25);
  assertEquals(settled.credit.perChild[0]?.line10, 3_000);
  assertEquals(settled.credit.line13, 5_000);
  assertEquals(settled.credit.line18, 4_000);
  assertEquals(settled.final1040.line30_refundable_adoption, 5_000);
  assertEquals(settled.finalSchedule3.line6c_adoption_credit, 4_000);
  const pending = {
    form8839: source,
    f1040: settled.final1040,
    schedule3: settled.finalSchedule3,
  };
  const projected = projectStagedForm8839Documents(
    source,
    childReview,
    phasedSink,
    magiReview,
    pending,
    filer,
  );
  assertStringIncludes(
    projected.xml,
    "<AdoptionCreditModifAGILimitAmt>10000</AdoptionCreditModifAGILimitAmt>",
  );
  assertStringIncludes(
    projected.xml,
    "<AdoptionCrModifAGIGrtrAmtInd>X</AdoptionCrModifAGIGrtrAmtInd>",
  );
  assertStringIncludes(
    projected.xml,
    "<AdoptionCreditAdjModifAGIPct>0.250</AdoptionCreditAdjModifAGIPct>",
  );
  assertStringIncludes(
    projected.xml,
    "<NonrefundableAdoptionCreditAmt>4000</NonrefundableAdoptionCreditAmt>",
  );
  assertEquals(projected.pdfFields.noPhaseout, false);
  assertEquals(projected.pdfFields.phaseoutYes, true);
  assertEquals(projected.pdfFields.line8, 10_000);
  assertEquals(projected.pdfFields.line9Whole, "0");
  assertEquals(projected.pdfFields.line9Fraction, "250");
  assertEquals(projected.pdfFields.line10, 3_000);
  assertThrows(() =>
    projectStagedForm8839Documents(
      source,
      childReview,
      phasedSink,
      magiReview,
      {
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line6c_adoption_credit: 4_001,
        },
      },
      filer,
    )
  );
  assertThrows(() =>
    projectStagedForm8839Documents(
      source,
      childReview,
      { ...phasedSink, line1a_wages: 268_190 },
      magiReview,
      pending,
      filer,
    )
  );
});

Deno.test("Form 8839 staged native/PDF candidate nets a documented private reimbursement", () => {
  const reimbursement = {
    source_document_id: "private-reimbursement-1",
    document_sha256: "d".repeat(64),
    reimbursed_amount: 2_000,
    payer_name: "Family Adoption Fund",
    paid_date: "2025-06-01",
    not_employer_or_public_funds_confirmed: true,
  };
  const reimbursedSource = {
    ...source,
    children: [{
      ...source.children[0]!,
      expenses: [{
        ...source.children[0]!.expenses[0]!,
        reimbursed_amount: 2_000,
        reimbursement_source_document_id: reimbursement.source_document_id,
      }],
    }],
  };
  const reimbursedReview = {
    ...childReview,
    expenses: [{ ...childReview.expenses[0]!, reimbursement }],
  };
  const reimbursedPending = {
    form8839: reimbursedSource,
    f1040: {
      ...finalPending.f1040,
      line20_nonrefundable_credits: 6_000,
    },
    schedule3: {
      line6c_adoption_credit: 5_000,
      line7_total: 5_000,
      line8_total: 6_000,
    },
  };
  const candidate = projectStagedForm8839Documents(
    reimbursedSource,
    reimbursedReview,
    sinkInput,
    magiReview,
    reimbursedPending,
    filer,
  );
  assertStringIncludes(
    candidate.xml,
    "<QualifiedAdoptionExpenseAmt>10000</QualifiedAdoptionExpenseAmt>",
  );
  assertStringIncludes(
    candidate.xml,
    "<NonrefundableAdoptionCreditAmt>5000</NonrefundableAdoptionCreditAmt>",
  );
  assertEquals(candidate.pdfFields.line5, 10_000);
  assertEquals(candidate.pdfFields.line18, 5_000);
  assertThrows(
    () =>
      projectStagedForm8839Documents(
        reimbursedSource,
        {
          ...reimbursedReview,
          expenses: [{
            ...reimbursedReview.expenses[0]!,
            reimbursement: { ...reimbursement, reimbursed_amount: 1_999 },
          }],
        },
        sinkInput,
        magiReview,
        reimbursedPending,
        filer,
      ),
    Error,
    "reviewed payment does not match",
  );
});

Deno.test("Form 8839 staged projection rejects altered final return, source or missing pending", () => {
  for (
    const pending of [
      {
        ...finalPending,
        f1040: { ...finalPending.f1040, line30_refundable_adoption: 4_999 },
      },
      {
        ...finalPending,
        schedule3: { ...finalPending.schedule3, line6c_adoption_credit: 6_999 },
      },
      { ...finalPending, form8839: { ...source, children: [] } },
      { ...finalPending, schedule3: undefined },
    ]
  ) {
    assertThrows(() => project(pending));
  }
});
