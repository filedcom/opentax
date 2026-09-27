import { assertEquals, assertThrows } from "@std/assert";
import { form8396Pdf } from "./f8396.ts";

Deno.test("2025 Form 8396 PDF maps the certificate, credit lines, and worksheet", () => {
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
  assertEquals(
    byKey.credit_limit_worksheet_line3,
    "topmostSubform[0].Page2[0].Col2[0].Line8_Worksheet[0].Line3[0].f2_3[0]",
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
