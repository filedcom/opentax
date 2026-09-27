import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form8820Pdf } from "./f8820.ts";

const drug = {
  generic_name: "Test Orphan Drug",
  designation_application_number: "FDA-123",
  designation_date: "2024-03-15",
  qualified_clinical_testing_expenses: 100_000,
  qualifying_testing_confirmed: true,
  expenses_exclude_third_party_funding: true,
  expenses_not_used_for_research_credit: true,
};
const source = {
  f8820s: [drug],
  reduced_section280c_credit_election: true,
  form8932_overlapping_wage_credit: 1_250,
  subject_to_passive_activity_limit: false,
};

Deno.test("Form 8820 PDF maps official Part I and Part II widgets", () => {
  const fields = Object.fromEntries(
    form8820Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(fields.line1, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(fields.line2a, "topmostSubform[0].Page1[0].f1_5[0]");
  assertEquals(fields.line2b, "topmostSubform[0].Page1[0].f1_7[0]");
  assertEquals(fields.line2c, "topmostSubform[0].Page1[0].f1_9[0]");
  assertEquals(fields.line3, "topmostSubform[0].Page1[0].f1_11[0]");
  assertEquals(fields.line4, "topmostSubform[0].Page1[0].f1_13[0]");
  assertEquals(
    fields.drug_1_name,
    "topmostSubform[0].Page2[0].Table_Part2[0].Row7a[0].f2_1[0]",
  );
  assertEquals(
    fields.drug_26_date,
    "topmostSubform[0].Page2[0].Table_Part2[0].Row7z[0].f2_78[0]",
  );
  assertEquals(form8820Pdf.pageIndices?.({}), [0, 1]);
});

Deno.test("Form 8820 PDF projects its credit and checks Form 3800", () => {
  const projected = form8820Pdf.projectFields?.(source, {
    f3800: { f8820_credit: { credit_amount: 18_500 } },
  }) ?? {};
  assertEquals(projected.line1, 100_000);
  assertEquals(projected.line2a, 19_750);
  assertEquals(projected.line2b, 1_250);
  assertEquals(projected.line2c, 18_500);
  assertEquals(projected.line4, 18_500);
  assertEquals(projected.drug_1_name, "Test Orphan Drug");
  assertEquals(projected.drug_1_designation, "FDA-123");
  assertEquals(projected.drug_1_date, "03/15/2024");
  assertEquals(form8820Pdf.includeWhen?.(projected), true);
  assertThrows(
    () => form8820Pdf.projectFields?.(source, { f3800: {} }),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 8820 PDF includes a controlled-group allocation page", async () => {
  const grouped = {
    ...source,
    controlled_group: {
      group_classification_document_reference: "Section 41(f)(1)(B) analysis",
      taxpayer_member_ein: "123456789",
      members: [{
        ein: "123456789",
        business_name: "Taxpayer business",
        qualified_clinical_testing_expenses: 100_000,
      }, {
        ein: "987654321",
        business_name: "Related business",
        qualified_clinical_testing_expenses: 200_000,
      }],
    },
  };
  const projected = form8820Pdf.projectFields?.(grouped, {
    f3800: { f8820_credit: { credit_amount: 18_500 } },
  }) ?? {};
  assertEquals(projected.line2a, 19_750);
  const document = await PDFDocument.create();
  const formPage = document.addPage([612, 792]);
  await form8820Pdf.decoratePages?.(document, [formPage], projected, undefined);
  await form8820Pdf.appendSupplementalPages?.(document, projected, undefined);
  assertEquals(document.getPageCount(), 2);
  const pages = await PDFDocument.load(await document.save());
  assertEquals(pages.getPageCount(), 2);
});

Deno.test("Form 8820 PDF includes a zero-credit reduced election", () => {
  const election = {
    ...source,
    f8820s: [{ ...drug, qualified_clinical_testing_expenses: 0 }],
    form8932_overlapping_wage_credit: 0,
  };
  const projected = form8820Pdf.projectFields?.(election, {}) ?? {};
  assertEquals(projected.line4, 0);
  assertEquals(projected.drug_1_name, undefined);
  assertEquals(form8820Pdf.includeWhen?.(projected), true);
  assertEquals(
    form8820Pdf.includeWhen?.({
      ...election,
      reduced_section280c_credit_election: false,
    }),
    false,
  );
});

Deno.test("Form 8820 PDF compacts active drugs and appends Part II overflow", async () => {
  const many = {
    ...source,
    form8932_overlapping_wage_credit: 0,
    f8820s: [
      { ...drug, qualified_clinical_testing_expenses: 0 },
      ...Array.from({ length: 27 }, (_, index) => ({
        ...drug,
        generic_name: `Drug ${index + 1}`,
        designation_application_number: `FDA-${index + 1}`,
      })),
    ],
  };
  const projected = form8820Pdf.projectFields?.(many, {
    f3800: { f8820_credit: { credit_amount: 533_250 } },
  }) ?? {};
  assertEquals(projected.drug_1_name, "Drug 1");
  assertEquals(projected.drug_26_name, "Drug 26");
  const document = await PDFDocument.create();
  await form8820Pdf.appendSupplementalPages?.(document, projected, undefined);
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Form 8820 PDF prints mixed line 3 and omits a pass-through-only form", () => {
  const passThrough = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 Schedule K-1 orphan-drug credit",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const mixed = { ...source, pass_through_credits: [passThrough] };
  const projected = form8820Pdf.projectFields?.(mixed, {
    f3800: { f8820_credit: { credit_amount: 19_750 } },
  }) ?? {};
  assertEquals(projected.line2c, 18_500);
  assertEquals(projected.line3, 1_250);
  assertEquals(projected.line4, 19_750);
  assertEquals(form8820Pdf.includeWhen?.(projected), true);
  const only = {
    ...mixed,
    f8820s: [],
    reduced_section280c_credit_election: false,
    form8932_overlapping_wage_credit: 0,
  };
  assertEquals(form8820Pdf.includeWhen?.(only), false);
});

Deno.test("Form 8820 PDF appends the unreduced-credit expense statement", async () => {
  const fullCredit = {
    ...source,
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "orphan-drug-reductions.pdf",
    expense_reductions: [{
      treatment: "current_deduction" as const,
      return_form_or_schedule: "Schedule C",
      return_line: "27b",
      return_instance_reference: "BUSINESS-1",
      expense_record_reference: "CLINICAL-001",
      amount_before_reduction: 100_000,
      reduction_amount: 25_000,
      expense_amount_after_reduction: 75_000,
    }],
  };
  const projected = form8820Pdf.projectFields?.(fullCredit, {
    f3800: { f8820_credit: { credit_amount: 23_750 } },
  }) ?? {};
  assertEquals(projected.line2a, 25_000);
  assertEquals(projected.line4, 23_750);
  const document = await PDFDocument.create();
  await form8820Pdf.appendSupplementalPages?.(document, projected, undefined);
  assertEquals(document.getPageCount(), 1);
});
