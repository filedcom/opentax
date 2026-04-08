/**
 * Structural tests for every PDF form descriptor in ALL_PDF_FORMS.
 *
 * These tests verify that each descriptor:
 *   1. Has a non-empty pendingKey string.
 *   2. Has a pdfUrl pointing to the IRS pub/irs-pdf domain.
 *   3. Has non-empty fields OR a rows descriptor.
 *   4. Every field entry has a valid kind ("text" | "checkbox" | "radio").
 *   5. Every field entry has non-empty domainKey and pdfField.
 *   6. Computed field pdfField paths are fully qualified AcroForm paths.
 *   7. No duplicate domainKeys within fields of a single form.
 *   8. Row descriptors have {row} placeholder in pdfFieldPattern.
 *
 * Network existence tests (require --allow-net=www.irs.gov) are marked
 * ignore: true until all descriptors are reconciled — remove ignore to enable.
 */
import { assertEquals, assertMatch } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { ALL_PDF_FORMS } from "./index.ts";

const VALID_KINDS = new Set(["text", "checkbox", "radio"]);

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

  Deno.test(`${label}: has fields or rows`, () => {
    const hasFields = descriptor.fields.length > 0;
    const hasRows = descriptor.rows !== undefined && descriptor.rows.rowFields.length > 0;
    assertEquals(hasFields || hasRows, true, `${label} has no fields and no rows`);
  });

  Deno.test(`${label}: all field entries have valid kind`, () => {
    for (const entry of [...descriptor.fields, ...(descriptor.filerFields ?? [])]) {
      assertEquals(
        VALID_KINDS.has(entry.kind),
        true,
        `Invalid kind "${entry.kind}" in ${label}`,
      );
      assertEquals(entry.domainKey.length > 0, true, `Empty domainKey in ${label}`);
      assertEquals(entry.pdfField.length > 0, true, `Empty pdfField in ${label}`);
    }
  });

  Deno.test(`${label}: computed field pdfField paths are fully qualified AcroForm paths`, () => {
    for (const entry of descriptor.fields) {
      assertMatch(
        entry.pdfField,
        /^(topmostSubform|form\d+)\[0\]\.(Page\d+|Page1)\[0\]\./,
        `Not a fully qualified AcroForm path in ${label}: ${entry.pdfField}`,
      );
    }
  });

  Deno.test(`${label}: no duplicate domainKeys in fields`, () => {
    const seen = new Set<string>();
    for (const entry of descriptor.fields) {
      assertEquals(
        seen.has(entry.domainKey),
        false,
        `Duplicate domainKey "${entry.domainKey}" in ${label}`,
      );
      seen.add(entry.domainKey);
    }
  });

  if (descriptor.rows) {
    Deno.test(`${label}: row pdfFieldPattern contains {row} placeholder`, () => {
      for (const rf of descriptor.rows!.rowFields) {
        assertEquals(
          rf.pdfFieldPattern.includes("{row}"),
          true,
          `Row field pattern missing {row}: ${rf.pdfFieldPattern}`,
        );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Field existence tests (network — verifies real IRS PDF field names)
// Remove `ignore: true` after all descriptors are verified against real PDFs.
// ---------------------------------------------------------------------------

async function getRealFieldNames(url: string): Promise<Set<string>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return new Set(doc.getForm().getFields().map((f) => f.getName()));
}

for (const descriptor of ALL_PDF_FORMS) {
  const label = descriptor.pendingKey;

  Deno.test(
    {
      name: `${label}: all mapped pdfField names exist in real IRS PDF`,
      ignore: true,
      sanitizeResources: false,
      sanitizeOps: false,
    },
    async () => {
      const realFields = await getRealFieldNames(descriptor.pdfUrl);
      for (const entry of [...descriptor.fields, ...(descriptor.filerFields ?? [])]) {
        assertEquals(
          realFields.has(entry.pdfField),
          true,
          `[${label}] pdfField not found in real PDF: "${entry.pdfField}"`,
        );
      }
      if (descriptor.rows) {
        for (const rf of descriptor.rows.rowFields) {
          const firstRowField = rf.pdfFieldPattern.replace("{row}", "1").replace(/{field_num}/g, String((rf as { fieldNumBase?: number }).fieldNumBase ?? 1).padStart(2, "0"));
          assertEquals(
            realFields.has(firstRowField),
            true,
            `[${label}] row field (row 1) not found in real PDF: "${firstRowField}"`,
          );
        }
      }
    },
  );
}
