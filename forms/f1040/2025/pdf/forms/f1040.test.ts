import { assertEquals, assertMatch } from "@std/assert";
import { irs1040Pdf, PDF_FIELD_MAP } from "./f1040.ts";

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
// PDF_FIELD_MAP structure
// ---------------------------------------------------------------------------

Deno.test("PDF_FIELD_MAP: all entries are [string, string] tuples", () => {
  for (const entry of PDF_FIELD_MAP) {
    assertEquals(entry.length, 2);
    assertEquals(typeof entry[0], "string");
    assertEquals(typeof entry[1], "string");
  }
});

Deno.test("PDF_FIELD_MAP: all PDF field names are fully qualified AcroForm paths", () => {
  for (const [_domain, pdfField] of PDF_FIELD_MAP) {
    assertMatch(
      pdfField,
      /^topmostSubform\[0\]\.(Page1|Page2)\[0\]\./,
      `Expected fully qualified path, got: ${pdfField}`,
    );
  }
});

Deno.test("PDF_FIELD_MAP: contains expected income line fields", () => {
  const domainKeys = new Set(PDF_FIELD_MAP.map(([k]) => k));
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

Deno.test("PDF_FIELD_MAP: contains expected payment fields", () => {
  const domainKeys = new Set(PDF_FIELD_MAP.map(([k]) => k));
  const expected = [
    "line25a_w2_withheld",
    "line25b_withheld_1099",
    "line33_total_payments",
  ];
  for (const key of expected) {
    assertEquals(domainKeys.has(key), true, `Missing domain key: ${key}`);
  }
});

Deno.test("PDF_FIELD_MAP: no empty domain keys or PDF field names", () => {
  for (const [domain, pdfField] of PDF_FIELD_MAP) {
    assertEquals(domain.length > 0, true, "Empty domain key found");
    assertEquals(pdfField.length > 0, true, "Empty PDF field name found");
  }
});
