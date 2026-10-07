import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { buildPending } from "../../mef/pending.ts";
import { buildPdfBytes } from "../builder.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form8396Pdf } from "./f8396.ts";

Deno.test("2025 Form 8396 PDF maps only the filed credit page", () => {
  const byKey = Object.fromEntries(
    form8396Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    byKey.qualified_home_address_print,
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    byKey.certificate_issuer_name,
    "topmostSubform[0].Page1[0].f1_4[0]",
  );
  assertEquals(byKey.line1, "topmostSubform[0].Page1[0].f1_7[0]");
  assertEquals(
    byKey.certificate_issue_date_print,
    "topmostSubform[0].Page1[0].f1_6[0]",
  );
  assertEquals(byKey.line2_percent, "topmostSubform[0].Page1[0].f1_8[0]");
  assertEquals(byKey.line9, "topmostSubform[0].Page1[0].f1_15[0]");
  assertEquals(byKey.line17, "topmostSubform[0].Page1[0].f1_23[0]");
  assertEquals(form8396Pdf.pageIndices?.({}), [0]);
  assertEquals(
    form8396Pdf.fields.every((field) => field.pdfField.includes("Page1[0]")),
    true,
  );
  assertEquals(
    form8396Pdf.filerFields?.map((field) => field.domainKey),
    ["nameLine1", "primarySSN"],
  );
  assertEquals(
    form8396Pdf.fields.find((field) => field.domainKey === "line17"),
    {
      kind: "text",
      domainKey: "line17",
      pdfField: "topmostSubform[0].Page1[0].f1_23[0]",
      printZero: true,
    },
  );
});

Deno.test("2025 Form 8396 prepared review packet retains one filed page", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-form8396-certified-loan-interest-credit"
  );
  if (!fixture) throw new Error("Missing Form 8396 review fixture");
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...fixture.inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const origins: { pageNumber: number; formKey: string; formCopy: number }[] =
    [];
  const pdf = await buildPdfBytes(
    pending,
    fixture.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8396"),
    [{ pageNumber: 4, formKey: "form8396", formCopy: 1 }],
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(pending.form8396?.line8, 5_075);
  assertEquals(pending.form8396?.credit_limit_worksheet_line1, 5_075);
  assertEquals(pending.form8396?.credit_limit_worksheet_line2, 0);
  assertEquals(pending.form8396?.line9, 1_200);
});

Deno.test("2025 Form 8396 PDF prints the certificate rate as a percentage", () => {
  const projected = form8396Pdf.projectFields?.({
    qualified_home_address_if_different: {
      line1: "123 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    certificate_issuer_name: "City Housing Agency",
    certificate_number: "MCC-123",
    certificate_issue_date: "2025-01-15",
    line1: 10_000,
    line2: 0.125,
    line3: 1_250,
    line7: 1_250,
    line8: 900,
    line9: 900,
    credit_limit_worksheet_line1: 1_000,
    credit_limit_worksheet_line2: 100,
  }, {});
  assertEquals(projected?.line2_percent, "12.5");
  assertEquals(projected?.certificate_issue_date_print, "01/15/2025");
  assertEquals(
    projected?.qualified_home_address_print,
    "123 Main St, Austin, TX 78701",
  );
  assertEquals(projected?.credit_limit_worksheet_line3, 900);
  assertEquals(projected?.line9, 900);
});

Deno.test("2025 Form 8396 PDF refuses an unfinished tax-limit calculation", () => {
  assertThrows(
    () =>
      form8396Pdf.projectFields?.({
        certificate_issuer_name: "City Housing Agency",
        line7: 1_250,
      }, {}),
    Error,
    "needs the finalized credit and worksheet",
  );
});

Deno.test("2025 Form 8396 PDF rejects a credit that differs from its worksheet", () => {
  assertThrows(
    () =>
      form8396Pdf.projectFields?.({
        certificate_issuer_name: "City Housing Agency",
        line7: 1_250,
        line8: 900,
        line9: 1_000,
        credit_limit_worksheet_line1: 1_000,
        credit_limit_worksheet_line2: 100,
      }, {}),
    Error,
    "does not reconcile",
  );
});
