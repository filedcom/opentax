import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { scheduleCLedger } from "../../../nodes/inputs/form1116_schedule_c_source/test-fixture.ts";
import type { ScheduleCFiledYearEvidence } from "./f1116_schedule_c.ts";
import {
  reviewScheduleCDocuments,
  type ScheduleCDocumentIntake,
  ScheduleCDocumentRole,
} from "./f1116_schedule_c_documents.ts";

function reviewedCase() {
  const original = scheduleCLedger();
  const ledger = {
    ...original,
    filed_form1116: {
      ...original.filed_form1116,
      foreign_tax_credit_claimed_usd: 100,
      source_document_reference: "filed-1116-2024",
    },
    redetermined_form1116: {
      ...original.redetermined_form1116,
      foreign_tax_credit_claimed_usd: 80,
      calculation_document_reference: "revised-1116-workpaper",
    },
    payor_events: [{
      ...original.payor_events[0],
      source_document_references: ["foreign-refund-notice"],
    }],
    affected_years: [{
      ...original.affected_years[0],
      us_tax_liability_on_filed_return_usd: 4_900,
      redetermined_us_tax_liability_usd: 4_920,
      filed_return_document_reference: "filed-1040-2024",
      recalculation_document_reference: "recomputed-1040-2024",
    }],
  };
  const evidence: ScheduleCFiledYearEvidence = {
    tax_year_end: "2024-12-31",
    filed_form1116: {
      line9_foreign_tax: 100,
      line10_carryover_or_carryback: 0,
      line12_foreign_tax_reduction: 0,
      line13_high_tax_kickout: 0,
      line14_available_tax: 100,
      line16_foreign_income_adjustment: 0,
      line17_foreign_taxable_income: 10_000,
      line18_worldwide_taxable_income: 100_000,
      line19_ratio: 0.1,
      line20_us_income_tax: 5_000,
      line21_limit: 500,
      line22_limit_increase: 0,
      line23_limit: 500,
      line24_allowed_credit: 100,
      line33_total_credit: 100,
      line34_boycott_reduction: 0,
      line35_credit: 100,
      unused_foreign_tax: 0,
      filed_document_reference: "filed-1116-2024",
    },
    filed_form1040: {
      line15_taxable_income: 100_000,
      line16_income_tax: 5_000,
      line17_schedule2_tax: 0,
      line18_tax_before_credits: 5_000,
      line19_child_and_dependent_credit: 0,
      line20_schedule3_nonrefundable_credit: 100,
      line21_nonrefundable_credits: 100,
      line22_tax_after_credits: 4_900,
      line23_other_taxes: 0,
      line24_total_tax: 4_900,
      filed_document_reference: "filed-1040-2024",
    },
    filed_schedule3: {
      line1_foreign_tax_credit: 100,
      line8_nonrefundable_credits: 100,
      filed_document_reference: "filed-schedule3-2024",
    },
    revised_form1116: {
      line9_foreign_tax: 80,
      line14_available_tax: 80,
      line23_limit: 500,
      line24_allowed_credit: 80,
      line33_total_credit: 80,
      line35_credit: 80,
      unused_foreign_tax: 0,
      calculation_document_reference: "revised-1116-workpaper",
    },
    revised_schedule3: {
      line1_foreign_tax_credit: 80,
      line8_nonrefundable_credits: 80,
      calculation_document_reference: "revised-1116-workpaper",
    },
    revised_form1040: {
      line20_schedule3_nonrefundable_credit: 80,
      line21_nonrefundable_credits: 80,
      line22_tax_after_credits: 4_920,
      line24_total_tax: 4_920,
      recalculation_document_reference: "recomputed-1040-2024",
    },
    reviewed_no_other_form1116_or_special_adjustment: true,
    reviewed_no_qualified_dividend_or_capital_gain_rate_adjustment: true,
    reviewed_income_tax_and_other_tax_lines_unchanged: true,
    reviewed_no_later_year_tax_attribute_effect: true,
    later_year_review_document_reference: "later-year-attribute-review",
  };
  return { ledger, evidence };
}

async function reviewedPdf(reference: string) {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText(reference);
  const bytes = Uint8Array.from(await pdf.save());
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return {
    bytes,
    reviewed_sha256: Array.from(
      digest,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
}

async function intake(): Promise<ScheduleCDocumentIntake> {
  const { ledger, evidence } = reviewedCase();
  const references = [
    [ScheduleCDocumentRole.FiledForm1116, "filed-1116-2024"],
    [ScheduleCDocumentRole.FiledSchedule3, "filed-schedule3-2024"],
    [ScheduleCDocumentRole.FiledForm1040, "filed-1040-2024"],
    [ScheduleCDocumentRole.ForeignRedetermination, "foreign-refund-notice"],
    [ScheduleCDocumentRole.RevisedCalculation, "revised-1116-workpaper"],
    [ScheduleCDocumentRole.AffectedYearRecalculation, "recomputed-1040-2024"],
    [ScheduleCDocumentRole.LaterYearReview, "later-year-attribute-review"],
  ] as const;
  const documents = await Promise.all(
    references.map(async ([role, reference]) => ({
      role,
      source_reference: reference,
      ...await reviewedPdf(reference),
      reviewed_by: "Tax reviewer",
    })),
  );
  return { ledger, filed_year_evidence: evidence, documents };
}

Deno.test("Schedule C intake binds seven reviewed PDF byte streams and flags amended 2024 return", async () => {
  const input = await intake();
  const reviewed = await reviewScheduleCDocuments(input);
  assertEquals(reviewed.documents.length, 7);
  assertEquals(reviewed.documents.every((doc) => doc.page_count === 1), true);
  assertEquals(reviewed.amended_return_required, true);
  assertEquals(reviewed.affected_year_amendment_status, "required_unverified");
  assertEquals(reviewed.filed_us_tax_liability, 4_900);
  assertEquals(reviewed.redetermined_us_tax_liability, 4_920);
  assertEquals(reviewed.relation_back_year_unused_foreign_tax_before, 0);
  assertEquals(reviewed.relation_back_year_unused_foreign_tax_after, 0);
  assertEquals(reviewed.export_ready, false);
  assertStringIncludes(reviewed.native_xml_candidate, "<IRS1116ScheduleC>");
  assertEquals(reviewed.pdf_fields_candidate.part2_row1_col10, 20);
  assertEquals(reviewed.pdf_fields_candidate.part3_col5, 80);
  assertEquals(reviewed.pdf_fields_candidate.part4_col4, 20);
});

Deno.test("Schedule C intake binds each of two payors to a distinct reviewed PDF", async () => {
  const input = await intake();
  const secondPayor = {
    ...input.ledger.payor_events[0],
    payor_name: "Second foreign bank",
    payor_identifier: { kind: "foreign_reference" as const, value: "BANK2" },
    payor_tax_usd_on_filed_return: 50,
    payor_revised_tax_usd: 30,
    source_document_references: ["foreign-refund-notice-2"],
  };
  const ledger = {
    ...input.ledger,
    payor_events: [...input.ledger.payor_events, secondPayor],
    filed_form1116: {
      ...input.ledger.filed_form1116,
      foreign_taxes_paid_or_accrued_usd: 150,
      foreign_tax_credit_claimed_usd: 150,
    },
    redetermined_form1116: {
      ...input.ledger.redetermined_form1116,
      foreign_taxes_paid_or_accrued_usd: 110,
      foreign_tax_credit_claimed_usd: 110,
    },
    affected_years: [{
      ...input.ledger.affected_years[0],
      us_tax_liability_on_filed_return_usd: 4_850,
      redetermined_us_tax_liability_usd: 4_890,
    }],
  };
  const evidence = {
    ...input.filed_year_evidence,
    filed_form1116: {
      ...input.filed_year_evidence.filed_form1116,
      line9_foreign_tax: 150,
      line14_available_tax: 150,
      line24_allowed_credit: 150,
      line33_total_credit: 150,
      line35_credit: 150,
    },
    filed_schedule3: {
      ...input.filed_year_evidence.filed_schedule3,
      line1_foreign_tax_credit: 150,
      line8_nonrefundable_credits: 150,
    },
    filed_form1040: {
      ...input.filed_year_evidence.filed_form1040,
      line20_schedule3_nonrefundable_credit: 150,
      line21_nonrefundable_credits: 150,
      line22_tax_after_credits: 4_850,
      line24_total_tax: 4_850,
    },
    revised_form1116: {
      ...input.filed_year_evidence.revised_form1116,
      line9_foreign_tax: 110,
      line14_available_tax: 110,
      line24_allowed_credit: 110,
      line33_total_credit: 110,
      line35_credit: 110,
    },
    revised_schedule3: {
      ...input.filed_year_evidence.revised_schedule3,
      line1_foreign_tax_credit: 110,
      line8_nonrefundable_credits: 110,
    },
    revised_form1040: {
      ...input.filed_year_evidence.revised_form1040,
      line20_schedule3_nonrefundable_credit: 110,
      line21_nonrefundable_credits: 110,
      line22_tax_after_credits: 4_890,
      line24_total_tax: 4_890,
    },
  };
  const secondDocument = {
    role: ScheduleCDocumentRole.ForeignRedetermination,
    source_reference: "foreign-refund-notice-2",
    ...await reviewedPdf("foreign-refund-notice-2"),
    reviewed_by: "Tax reviewer",
  };
  const reviewed = await reviewScheduleCDocuments({
    ledger,
    filed_year_evidence: evidence,
    documents: [...input.documents, secondDocument],
  });
  assertEquals(reviewed.documents.length, 8);
  assertEquals(reviewed.pdf_fields_candidate.part2_row2_col2b, "BANK2");
  assertEquals(reviewed.pdf_fields_candidate.part2_subtotal_col12, 110);
  assertStringIncludes(
    reviewed.native_xml_candidate,
    "<ForeignEntityReferenceIdNum>BANK2</ForeignEntityReferenceIdNum>",
  );
});

Deno.test("Schedule C intake rejects an affected-year recalculation PDF with the wrong reference", async () => {
  const input = await intake();
  await assertRejects(
    () =>
      reviewScheduleCDocuments({
        ...input,
        documents: input.documents.map((document) =>
          document.role === ScheduleCDocumentRole.AffectedYearRecalculation
            ? { ...document, source_reference: "unreviewed-recalculation" }
            : document
        ),
      }),
    Error,
    "does not match its reviewed source reference",
  );
});

Deno.test("Schedule C intake requires an affected-year recalculation PDF", async () => {
  const input = await intake();
  await assertRejects(
    () =>
      reviewScheduleCDocuments({
        ...input,
        documents: input.documents.filter((document) =>
          document.role !== ScheduleCDocumentRole.AffectedYearRecalculation
        ),
      }),
  );
});

Deno.test("Schedule C intake rejects bytes changed after tax review", async () => {
  const input = await intake();
  const documents = input.documents.map((document) =>
    document.role === ScheduleCDocumentRole.ForeignRedetermination
      ? { ...document, bytes: new Uint8Array([1, 2, 3]) }
      : document
  );
  await assertRejects(
    () => reviewScheduleCDocuments({ ...input, documents }),
    Error,
    "differ from the reviewed SHA-256",
  );
});

Deno.test("Schedule C intake rejects a filed PDF reference that disagrees with extracted lines", async () => {
  const input = await intake();
  await assertRejects(
    () =>
      reviewScheduleCDocuments({
        ...input,
        filed_year_evidence: {
          ...input.filed_year_evidence,
          filed_schedule3: {
            ...input.filed_year_evidence.filed_schedule3,
            filed_document_reference: "different-schedule3",
          },
        },
      }),
    Error,
    "does not match its reviewed source reference",
  );
});
