import { assertEquals, assertMatch } from "@std/assert";
import { irs1040Pdf } from "./f1040.ts";

// ---------------------------------------------------------------------------
// Descriptor structure
// ---------------------------------------------------------------------------

Deno.test("irs1040Pdf: pendingKey is 'f1040'", () => {
  assertEquals(irs1040Pdf.pendingKey, "f1040");
});

Deno.test("irs1040Pdf: pdfUrl points to IRS f1040", () => {
  assertEquals(
    irs1040Pdf.pdfUrl,
    "https://www.irs.gov/pub/irs-pdf/f1040.pdf",
  );
});

// ---------------------------------------------------------------------------
// fields array structure
// ---------------------------------------------------------------------------

Deno.test("irs1040Pdf.fields: all entries have kind, domainKey, pdfField", () => {
  for (const entry of irs1040Pdf.fields) {
    assertEquals(typeof entry.kind, "string");
    assertEquals(typeof entry.domainKey, "string");
    assertEquals(typeof entry.pdfField, "string");
  }
});

Deno.test("irs1040Pdf.fields: all PDF field names are fully qualified AcroForm paths", () => {
  for (const entry of irs1040Pdf.fields) {
    assertMatch(
      entry.pdfField,
      /^topmostSubform\[0\]\.(Page1|Page2)\[0\]\./,
      `Expected fully qualified path, got: ${entry.pdfField}`,
    );
  }
});

Deno.test("irs1040Pdf.fields: contains expected income line fields", () => {
  const domainKeys = new Set(irs1040Pdf.fields.map((e) => e.domainKey));
  const expected = [
    "line1a_wages",
    "line2b_taxable_interest",
    "line3b_ordinary_dividends",
    "line4a_ira_gross",
    "line4b_ira_taxable",
    "line6a_ss_gross",
    "line6b_ss_taxable",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing domain key: ${key}`);
  }
});

Deno.test("irs1040Pdf.fields: contains expected payment fields", () => {
  const domainKeys = new Set(irs1040Pdf.fields.map((e) => e.domainKey));
  const expected = [
    "line25a_w2_withheld",
    "line25b_withheld_1099",
    "line33_total_payments",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing domain key: ${key}`);
  }
});

Deno.test("irs1040Pdf.fields: no empty domain keys or PDF field names", () => {
  for (const entry of irs1040Pdf.fields) {
    assertEquals(entry.domainKey.length > 0, true, "Empty domain key found");
    assertEquals(entry.pdfField.length > 0, true, "Empty PDF field name found");
  }
});

// ---------------------------------------------------------------------------
// filerFields structure
// ---------------------------------------------------------------------------

Deno.test("irs1040Pdf.filerFields: present and contains expected keys", () => {
  const filerFields = irs1040Pdf.filerFields ?? [];
  const domainKeys = new Set(filerFields.map((e) => e.domainKey));
  const expected = [
    "firstName",
    "lastName",
    "primarySSN",
    "address.line1",
    "address.city",
    "address.state",
    "address.zip",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing filerField key: ${key}`);
  }
});
