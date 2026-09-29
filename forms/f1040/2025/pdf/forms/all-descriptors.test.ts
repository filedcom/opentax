/**
 * Structural tests for every PDF form descriptor in ALL_PDF_FORMS.
 *
 * These tests verify that each descriptor:
 *   1. Has a non-empty pendingKey string.
 *   2. Uses the archived applicable IRS revision, except Form 8911 Schedule A
 *      while its December 2025 PDF has no archive URL.
 *   3. Has renderable fields or an explicit guard that rejects positive input.
 *   4. Every field entry has a valid kind ("text" | "checkbox" | "radio").
 *   5. Every field entry has non-empty domainKey and pdfField.
 *   6. Mapped pdfField paths are fully qualified AcroForm paths.
 *   7. No exact duplicate field mappings within a form.
 *   8. Row descriptors have {row} placeholder in pdfFieldPattern.
 *
 * Network existence tests require --allow-net=www.irs.gov and validate the
 * mapped fields against the referenced IRS PDFs.
 */
import { assertEquals, assertMatch } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { ALL_PDF_FORMS } from "./index.ts";

const VALID_KINDS = new Set(["text", "checkbox", "checkboxWhen", "radio"]);
const ARCHIVED_REVISIONS: Readonly<Record<string, number>> = {
  f1040lep: 2024,
  f7203: 2022,
  f1116sb: 2022,
  f2439: 2021,
  f5884: 2021,
  f7217: 2024,
  f8820: 2018,
  f8874: 2021,
  f8912: 2024,
  f8978: 2023,
  f8978sa: 2023,
  f8995ab: 2022,
  f8995ac: 2022,
  f8995ad: 2022,
  f982: 2018,
  f8834: 2024,
};

for (const descriptor of ALL_PDF_FORMS) {
  const label = descriptor.pendingKey;

  Deno.test(`${label}: pendingKey is a non-empty string`, () => {
    assertEquals(typeof descriptor.pendingKey, "string");
    assertEquals(descriptor.pendingKey.length > 0, true);
  });

  Deno.test(`${label}: pdfUrl uses the applicable IRS revision`, () => {
    if (label === "f8911_schedule_a") {
      // The December 2025 PDF is current; IRS has no 2025 archive URL yet.
      assertEquals(
        descriptor.pdfUrl,
        "https://www.irs.gov/pub/irs-pdf/f8911sa.pdf",
      );
      return;
    }
    const formName = descriptor.pdfUrl.match(/\/([^/]+)--\d{4}\.pdf$/)?.[1];
    const revision = formName ? ARCHIVED_REVISIONS[formName] ?? 2025 : 2025;
    assertMatch(
      descriptor.pdfUrl,
      new RegExp(
        `^https://www\\.irs\\.gov/pub/irs-prior/.+--${revision}\\.pdf$`,
      ),
      `Expected IRS PDF URL, got: ${descriptor.pdfUrl}`,
    );
  });

  Deno.test(`${label}: has fields or rows or rejects positive input`, () => {
    const hasFields = descriptor.fields.length > 0;
    const hasRows = descriptor.rows !== undefined &&
      descriptor.rows.rowFields.length > 0;
    if (!hasFields && !hasRows) {
      assertEquals(
        typeof descriptor.projectFields,
        "function",
        `${label} has no renderable fields and no export guard`,
      );
      let rejected = false;
      try {
        descriptor.projectFields?.({ positive_filing_probe: 1 }, {});
      } catch {
        rejected = true;
      }
      assertEquals(rejected, true, `${label} did not reject positive input`);
      return;
    }
    assertEquals(
      hasFields || hasRows,
      true,
      `${label} has no fields and no rows`,
    );
  });

  Deno.test(`${label}: all field entries have valid kind`, () => {
    for (
      const entry of [...descriptor.fields, ...(descriptor.filerFields ?? [])]
    ) {
      assertEquals(
        VALID_KINDS.has(entry.kind),
        true,
        `Invalid kind "${entry.kind}" in ${label}`,
      );
      assertEquals(
        entry.domainKey.length > 0,
        true,
        `Empty domainKey in ${label}`,
      );
      assertEquals(
        entry.pdfField.length > 0,
        true,
        `Empty pdfField in ${label}`,
      );
    }
  });

  Deno.test(`${label}: mapped field paths are fully qualified AcroForm paths`, () => {
    for (const entry of descriptor.fields) {
      assertMatch(
        entry.pdfField,
        /^[A-Za-z][A-Za-z0-9]*\[0\]\.[A-Za-z][A-Za-z0-9]*\[0\]\./,
        `Not a fully qualified AcroForm path in ${label}: ${entry.pdfField}`,
      );
    }
  });

  Deno.test(`${label}: no exact duplicate field mappings`, () => {
    const seen = new Set<string>();
    for (const entry of descriptor.fields) {
      const mapping = `${entry.kind}:${entry.domainKey}:${entry.pdfField}`;
      assertEquals(
        seen.has(mapping),
        false,
        `Duplicate field mapping "${mapping}" in ${label}`,
      );
      seen.add(mapping);
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
// These checks must run in the normal batch so stale mappings cannot pass.
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
      sanitizeResources: false,
      sanitizeOps: false,
    },
    async () => {
      const realFields = await getRealFieldNames(descriptor.pdfUrl);
      for (
        const entry of [...descriptor.fields, ...(descriptor.filerFields ?? [])]
      ) {
        assertEquals(
          realFields.has(entry.pdfField),
          true,
          `[${label}] pdfField not found in real PDF: "${entry.pdfField}"`,
        );
      }
      if (descriptor.rows) {
        for (let row = 1; row <= descriptor.rows.maxRows; row++) {
          for (const rf of descriptor.rows.rowFields) {
            const fieldNumber = (rf.fieldNumBase ?? 1) +
              (row - 1) * (descriptor.rows.rowStride ?? 0);
            const pdfField = rf.pdfFieldPattern.replace("{row}", String(row))
              .replace(
                /{field_num}/g,
                String(fieldNumber).padStart(2, "0"),
              );
            assertEquals(
              realFields.has(pdfField),
              true,
              `[${label}] row field (row ${row}) not found in real PDF: "${pdfField}"`,
            );
          }
        }
      }
    },
  );
}

// Form 1116's pending slot also collects the §904 limitation inputs, which are
// deposited on every return. presenceKey keeps the form off returns with no
// foreign tax.
Deno.test("form_1116: gated on a foreign tax figure via presenceKey", () => {
  const f1116 = ALL_PDF_FORMS.find((d) => d.pendingKey === "form_1116");
  assertEquals(f1116?.presenceKey, "foreign_tax_paid");
});
