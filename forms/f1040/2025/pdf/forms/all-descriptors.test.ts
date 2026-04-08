/**
 * Structural tests for every PDF form descriptor in ALL_PDF_FORMS.
 *
 * These tests verify that each descriptor:
 *   1. Has a non-empty pendingKey string.
 *   2. Has a pdfUrl pointing to the IRS pub/irs-pdf domain.
 *   3. Has a non-empty PDF_FIELD_MAP.
 *   4. Every map entry is a two-element [string, string] tuple.
 *   5. Every PDF field name is a fully-qualified AcroForm path
 *      (starts with "topmostSubform[0].Page").
 *   6. No domain key is duplicated within a single form.
 */
import { assertEquals, assertMatch } from "@std/assert";
import { ALL_PDF_FORMS } from "./index.ts";

for (const descriptor of ALL_PDF_FORMS) {
  const label = descriptor.pendingKey;

  Deno.test(`${label}: pendingKey is a non-empty string`, () => {
    assertEquals(typeof descriptor.pendingKey, "string");
    assertEquals(descriptor.pendingKey.length > 0, true);
  });

  Deno.test(`${label}: pdfUrl points to IRS pub/irs-pdf`, () => {
    assertMatch(
      descriptor.pdfUrl,
      /^https:\/\/www\.irs\.gov\/pub\/irs-pdf\/.+\.pdf$/,
      `Expected IRS PDF URL, got: ${descriptor.pdfUrl}`,
    );
  });

  Deno.test(`${label}: PDF_FIELD_MAP is non-empty`, () => {
    assertEquals(
      descriptor.PDF_FIELD_MAP.length > 0,
      true,
      `${label} has an empty PDF_FIELD_MAP`,
    );
  });

  Deno.test(`${label}: all PDF_FIELD_MAP entries are [string, string] tuples`, () => {
    for (const entry of descriptor.PDF_FIELD_MAP) {
      assertEquals(entry.length, 2, `Entry length should be 2`);
      assertEquals(typeof entry[0], "string");
      assertEquals(typeof entry[1], "string");
      assertEquals(entry[0].length > 0, true, "Domain key should not be empty");
      assertEquals(entry[1].length > 0, true, "PDF field name should not be empty");
    }
  });

  Deno.test(`${label}: PDF field names are fully qualified AcroForm paths`, () => {
    for (const [_domain, pdfField] of descriptor.PDF_FIELD_MAP) {
      assertMatch(
        pdfField,
        /^topmostSubform\[0\]\.Page\d+\[0\]\./,
        `Expected fully qualified AcroForm path, got: ${pdfField}`,
      );
    }
  });

  Deno.test(`${label}: no duplicate domain keys in PDF_FIELD_MAP`, () => {
    const seen = new Set<string>();
    for (const [domain] of descriptor.PDF_FIELD_MAP) {
      assertEquals(
        seen.has(domain),
        false,
        `Duplicate domain key in ${label}: ${domain}`,
      );
      seen.add(domain);
    }
  });
}
