import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus as MefFilingStatus } from "../../../../mef/header.ts";
import { FilingStatus } from "../../../types.ts";
import { form8839, prepareForm8839Credit } from "./index.ts";
import { assertReviewedDomestic8839Source } from "./reviewed_source.ts";
import { bindReviewedDomestic8839DocumentBytes } from "./document_byte_binding.ts";
import { projectByteBoundStagedDomestic8839 } from "./byte_bound_staged_route.ts";

const input = {
  filing_status: FilingStatus.Single,
  adoption_benefits: 0,
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
const review = {
  reviewed_by: "Independent Reviewer",
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

Deno.test("Form 8839 reviewed one-child evidence reconciles to existing Part II source", () => {
  assertReviewedDomestic8839Source(input, review);
  const prepared = prepareForm8839Credit(input);
  assertEquals(prepared.perChild[0]?.line5, 12_000);
  assertEquals(prepared.perChild[0]?.line6, 12_000);
});

Deno.test("Form 8839 reviewed source rejects changed decree or payment details", () => {
  assertThrows(
    () =>
      assertReviewedDomestic8839Source(input, {
        ...review,
        decree: { ...review.decree, child_ssn: "111223335" },
      }),
    Error,
    "decree does not match",
  );
  assertThrows(
    () =>
      assertReviewedDomestic8839Source(input, {
        ...review,
        expenses: [{ ...review.expenses[0]!, amount: 11_999 }],
      }),
    Error,
    "payment does not match",
  );
  assertThrows(
    () =>
      assertReviewedDomestic8839Source(input, {
        ...review,
        expenses: [{
          ...review.expenses[0]!,
          payment_proof_document_id: "invoice-1",
        }],
      }),
    Error,
    "reviewed expense documents must match uniquely",
  );
});

Deno.test("Form 8839 reviewed birth record binds identity and age to the child ledger", () => {
  assertReviewedDomestic8839Source(input, review);
  assertThrows(
    () =>
      assertReviewedDomestic8839Source(input, {
        ...review,
        birth_record: { ...review.birth_record, date_of_birth: "2007-12-31" },
      }),
    Error,
    "birth record does not prove",
  );
  assertThrows(
    () =>
      assertReviewedDomestic8839Source(input, {
        ...review,
        birth_record: { ...review.birth_record, child_last_name: "Different" },
      }),
    Error,
    "birth record does not prove",
  );
  assertThrows(
    () =>
      assertReviewedDomestic8839Source(input, {
        ...review,
        birth_record: {
          ...review.birth_record,
          source_document_id: "payment-1",
        },
      }),
    Error,
    "reviewed expense documents must match uniquely",
  );
});

Deno.test("Form 8839 reviewed source rejects excluded claims and missing evidence", () => {
  assertThrows(() =>
    assertReviewedDomestic8839Source(
      { ...input, adoption_benefits: 1_000 },
      review,
    )
  );
  assertThrows(() =>
    assertReviewedDomestic8839Source({
      ...input,
      children: [{
        ...input.children[0]!,
        expenses: [{
          ...input.children[0]!.expenses[0]!,
          reimbursed_amount: 100,
        }],
      }],
    }, review)
  );
  assertThrows(() =>
    assertReviewedDomestic8839Source(input, {
      ...review,
      reviewed_facts: {
        ...review.reviewed_facts,
        all_reimbursements_disclosed_confirmed: false,
      },
    })
  );
  assertThrows(() =>
    assertReviewedDomestic8839Source(input, {
      ...review,
      expenses: [],
    })
  );
  assertThrows(() =>
    assertReviewedDomestic8839Source(input, {
      ...review,
      decree: { ...review.decree, document_sha256: "not-a-hash" },
    })
  );
});

Deno.test("Form 8839 reviewed metadata alone does not open the base node", () => {
  assertReviewedDomestic8839Source(input, review);
  assertThrows(
    () =>
      form8839.compute(
        { taxYear: 2025, formType: "f1040" },
        input,
      ),
    Error,
    "reviewed adoption evidence",
  );
});

Deno.test("Form 8839 reviewed decree, payment and reimbursement bytes settle one staged credit", async () => {
  const bytes = {
    decree: new TextEncoder().encode("synthetic decree Ada 2025-07-15 TX"),
    birth: new TextEncoder().encode("synthetic birth record Ada 2020-02-01"),
    receipt: new TextEncoder().encode(
      "synthetic adoption counsel receipt 12000",
    ),
    payment: new TextEncoder().encode("synthetic payment 2025-03-12 12000"),
    reimbursement: new TextEncoder().encode(
      "synthetic private reimbursement 1000",
    ),
  };
  async function sha256(value: Uint8Array) {
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(value)),
    );
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  const sourced = {
    ...input,
    children: [{
      ...input.children[0]!,
      expenses: [{
        ...input.children[0]!.expenses[0]!,
        reimbursed_amount: 1_000,
        reimbursement_source_document_id: "reimbursement-1",
      }],
    }],
  };
  const reviewed = {
    ...review,
    decree: { ...review.decree, document_sha256: await sha256(bytes.decree) },
    birth_record: {
      ...review.birth_record,
      document_sha256: await sha256(bytes.birth),
    },
    expenses: [{
      ...review.expenses[0]!,
      receipt_sha256: await sha256(bytes.receipt),
      payment_proof_sha256: await sha256(bytes.payment),
      reimbursement: {
        source_document_id: "reimbursement-1",
        document_sha256: await sha256(bytes.reimbursement),
        reimbursed_amount: 1_000,
        payer_name: "Private adoption grant",
        paid_date: "2025-04-01",
        not_employer_or_public_funds_confirmed: true,
      },
    }],
  };
  const documents = [
    { source_document_id: "decree-1", bytes: bytes.decree },
    { source_document_id: "birth-1", bytes: bytes.birth },
    { source_document_id: "invoice-1", bytes: bytes.receipt },
    { source_document_id: "payment-1", bytes: bytes.payment },
    { source_document_id: "reimbursement-1", bytes: bytes.reimbursement },
  ];
  await bindReviewedDomestic8839DocumentBytes(sourced, reviewed, documents);
  const sinkInput = {
    filing_status: FilingStatus.Single,
    line1a_wages: 200_000,
    line11_agi: 200_000,
    line16_income_tax: 20_000,
    line17_additional_taxes: 0,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 1_000,
    form8859_worksheet_b_applies: false,
    credit_limit_schedule3_lines: {
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
    },
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
  const projection = await projectByteBoundStagedDomestic8839(
    sourced,
    reviewed,
    documents,
    sinkInput,
    magiReview,
    filer,
  );
  assertEquals(projection.credit.perChild[0]?.line5, 11_000);
  assertEquals(projection.credit.line13, 5_000);
  assertEquals(projection.credit.line18, 6_000);
  assertEquals(projection.final1040.line30_refundable_adoption, 5_000);
  assertEquals(projection.finalSchedule3.line6c_adoption_credit, 6_000);
  assertStringIncludes(
    projection.xml,
    "<QualifiedAdoptionExpenseAmt>11000</QualifiedAdoptionExpenseAmt>",
  );
  assertStringIncludes(
    projection.xml,
    "<NonrefundableAdoptionCreditAmt>6000</NonrefundableAdoptionCreditAmt>",
  );
  assertEquals(projection.pdfFields.line5, 11_000);
  assertEquals(projection.pdfFields.line18, 6_000);
  await assertRejects(
    () =>
      projectByteBoundStagedDomestic8839(
        sourced,
        reviewed,
        [...documents.slice(0, 4), { ...documents[4]!, bytes: bytes.receipt }],
        sinkInput,
        magiReview,
        filer,
      ),
    Error,
    "bytes differ from its source SHA-256",
  );
  await assertRejects(
    () =>
      projectByteBoundStagedDomestic8839(
        sourced,
        {
          ...reviewed,
          expenses: [{
            ...reviewed.expenses[0]!,
            reimbursement: {
              ...reviewed.expenses[0]!.reimbursement,
              reimbursed_amount: 1_001,
            },
          }],
        },
        documents,
        sinkInput,
        magiReview,
        filer,
      ),
    Error,
    "reviewed payment does not match",
  );
  await assertRejects(
    () =>
      projectByteBoundStagedDomestic8839(
        sourced,
        reviewed,
        documents,
        { ...sinkInput, line20_nonrefundable_credits: 0 },
        magiReview,
        filer,
      ),
    Error,
    "Schedule 3 lines do not reconcile",
  );
  await assertRejects(
    () =>
      bindReviewedDomestic8839DocumentBytes(sourced, reviewed, [
        documents[0]!,
        { ...documents[1]!, bytes: bytes.decree },
        ...documents.slice(2),
      ]),
    Error,
    "bytes differ from its source SHA-256",
  );
  await assertRejects(
    () =>
      bindReviewedDomestic8839DocumentBytes(
        sourced,
        reviewed,
        documents.slice(0, 4),
      ),
    Error,
    "one distinct nonempty byte document",
  );
  await assertRejects(
    () =>
      bindReviewedDomestic8839DocumentBytes(sourced, reviewed, [
        ...documents.slice(0, 3),
        { ...documents[3]!, bytes: bytes.receipt },
        documents[4]!,
      ]),
    Error,
    "bytes differ from its source SHA-256",
  );
  await assertRejects(
    () =>
      bindReviewedDomestic8839DocumentBytes(sourced, reviewed, [
        ...documents,
        { source_document_id: "unreviewed", bytes: bytes.receipt },
      ]),
    Error,
    "one distinct nonempty byte document",
  );
  assertThrows(
    () => form8839.compute({ taxYear: 2025, formType: "f1040" }, sourced),
    Error,
    "reviewed adoption evidence",
  );
});
