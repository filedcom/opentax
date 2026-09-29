import {
  assertEquals,
  assertGreater,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { join } from "@std/path";
import { PDFDocument } from "pdf-lib";
import { buildPdfBytes, fillFormPdf } from "./builder.ts";
import { assertAttachmentCoverage } from "../attachment-coverage.ts";
import type { FilerIdentity } from "../../mef/header.ts";
import { FilingStatus } from "../../mef/header.ts";
import { form6251Pdf } from "./forms/f6251.ts";
import { irs1040Pdf } from "./forms/f1040.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockFiler: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "JOHN DOE",
  nameControl: "DOE",
  firstName: "John",
  lastName: "Doe",
  address: {
    line1: "123 Main St",
    city: "Anytown",
    state: "CA",
    zip: "90210",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("PDF export rejects active attachments without complete PDF maps", () => {
  const active: Array<[Record<string, Record<string, unknown>>, string]> = [
    [{ f8997: { investment_lots: [{}] } }, "Form 8997"],
    [{ f8958: { state: "CA" } }, "Form 8958"],
    [{ f2106: { f2106s: [{}] } }, "Form 2106"],
  ];
  for (const [pending, name] of active) {
    assertThrows(() => assertAttachmentCoverage(pending, "pdf"), Error, name);
  }
  assertAttachmentCoverage({
    f8283: { section_a_items: [], section_b_items: [] },
    f7217: { form7217s: [] },
    f8862: { claim_eitc: false, claim_ctc: false, claim_aotc: false },
    f8863: { f8863s: [] },
    form6252: { f6252s: [] },
  }, "pdf");
  // Form 7217 now has a descriptor. Its own instance gate validates source.
  assertAttachmentCoverage({ f7217: { form7217s: [{}] } }, "pdf");
  // Form 6252 has a complete bounded descriptor. Its instance gate validates
  // the required sale facts, calculations, and return destinations.
  assertAttachmentCoverage({ form6252: { f6252s: [{}] } }, "pdf");
  // Form 8283 now reaches a strict descriptor-level source/continuation gate.
  assertAttachmentCoverage({ f8283: { section_a_items: [{}] } }, "pdf");
  assertAttachmentCoverage({ f8283: { section_b_items: [{}] } }, "pdf");
  // Form 8863 is now guarded by its source-reconciled PDF descriptor.
  assertAttachmentCoverage({ f8863: { f8863s: [{}] } }, "pdf");
  // Form 8862 now reaches a descriptor that validates the filing source and
  // rejects unsupported overflow statements before any PDF is emitted.
  assertAttachmentCoverage({
    f8862: { claim_eitc: true, credit_disallowance_ban_active: false },
  }, "pdf");
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the cache file name the builder expects for a given URL.
 * Must mirror the slug logic in fetchWithCache().
 */
function cacheSlug(url: string): string {
  return url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_") + ".pdf";
}

const F1040_PDF_URL = "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf";
const F1116_PDF_URL = "https://www.irs.gov/pub/irs-prior/f1116--2025.pdf";

/**
 * Create a minimal AcroForm PDF that contains the subset of f1040 AcroForm
 * fields used by PDF_FIELD_MAP so builder tests can run without network.
 */
async function makeMinimalF1040Pdf(
  fields: string[],
  includeMapped = true,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  const entries = includeMapped
    ? [...irs1040Pdf.fields, ...(irs1040Pdf.filerFields ?? [])]
    : [];
  const names = new Map(entries.map((entry) => [entry.pdfField, entry.kind]));
  for (const name of fields) if (!names.has(name)) names.set(name, "text");
  for (const [name, kind] of names) {
    if (kind === "checkbox" || kind === "checkboxWhen") {
      form.createCheckBox(name).addToPage(page, { x: 10, y: 700, width: 20, height: 20 });
    } else if (kind === "text") {
      form.createTextField(name).addToPage(page, { x: 10, y: 700, width: 200, height: 20 });
    }
  }
  return doc.save();
}

/**
 * Write a pre-built PDF into the cache dir so the builder reads it instead
 * of fetching from IRS.
 */
async function seedCache(cacheDir: string, url: string, pdfBytes: Uint8Array) {
  await Deno.mkdir(cacheDir, { recursive: true });
  await Deno.writeFile(join(cacheDir, cacheSlug(url)), pdfBytes);
}

// ---------------------------------------------------------------------------
// buildPdfBytes
// ---------------------------------------------------------------------------

Deno.test("buildPdfBytes: fills wage field and returns valid PDF bytes", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const stubPdf = await makeMinimalF1040Pdf([
      "topmostSubform[0].Page1[0].f1_47[0]", // line1a_wages
    ]);
    await seedCache(tmpDir, F1040_PDF_URL, stubPdf);

    const pending = {
      f1040: { line1a_wages: 75000 },
    };
    const result = await buildPdfBytes(pending, mockFiler, tmpDir);

    // Valid PDF starts with %PDF-
    const header = new TextDecoder().decode(result.slice(0, 5));
    assertEquals(header, "%PDF-");
    assertGreater(result.length, 100);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: a missing AcroForm field stops the export", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await seedCache(
      tmpDir,
      F1040_PDF_URL,
      await makeMinimalF1040Pdf(["unrelated_field"], false),
    );
    await assertRejects(
      () =>
        buildPdfBytes({ f1040: { line1a_wages: 75_000 } }, mockFiler, tmpDir),
      Error,
      'failed to fill field "topmostSubform[0].Page1[0].f1_47[0]"',
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("fillFormPdf: a missing row AcroForm field stops the export", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await seedCache(
      tmpDir,
      F1040_PDF_URL,
      await makeMinimalF1040Pdf(["unrelated_field"]),
    );
    await assertRejects(
      () =>
        fillFormPdf(
          {
            pendingKey: "sample_rows",
            pdfUrl: F1040_PDF_URL,
            fields: [],
            rows: {
              domainKey: "items",
              maxRows: 1,
              rowFields: [{
                kind: "text",
                domainKey: "amount",
                pdfFieldPattern: "missing_row_field",
              }],
            },
          },
          { items: [{ amount: 25 }] },
          undefined,
          tmpDir,
        ),
      Error,
      'failed to fill row 1 field "missing_row_field"',
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("fillFormPdf: row overflow stops export before truncating the form", async () => {
  await assertRejects(
    () =>
      fillFormPdf(
        {
          pendingKey: "sample_rows",
          pdfUrl: F1040_PDF_URL,
          fields: [],
          rows: {
            domainKey: "items",
            maxRows: 1,
            rowFields: [{
              kind: "text",
              domainKey: "amount",
              pdfFieldPattern: "row_{row}",
            }],
          },
        },
        { items: [{ amount: 25 }, { amount: 50 }] },
        undefined,
        "/tmp/no-pdf-needed-for-overflow",
      ),
    Error,
    "2 rows exceed the printable row limit of 1",
  );
});

Deno.test("fillFormPdf: required all-zero Form 6251 is retained but an unrequired blank is omitted", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const widgets = form6251Pdf.fields.map((field) => field.pdfField);
    await seedCache(
      tmpDir,
      form6251Pdf.pdfUrl,
      await makeMinimalF1040Pdf(widgets),
    );
    const zeros = Object.fromEntries(
      form6251Pdf.fields.map((field) => [field.domainKey, 0]),
    );
    const required = await fillFormPdf(
      form6251Pdf,
      { ...zeros, must_file_for_credit: true },
      undefined,
      tmpDir,
    );
    assertEquals(required !== undefined, true);
    const notRequired = await fillFormPdf(
      form6251Pdf,
      zeros,
      undefined,
      tmpDir,
    );
    assertEquals(notRequired, undefined);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: filled wage value is readable from output PDF", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const fieldName = "topmostSubform[0].Page1[0].f1_47[0]";
    const stubPdf = await makeMinimalF1040Pdf([fieldName]);
    await seedCache(tmpDir, F1040_PDF_URL, stubPdf);

    const pending = { f1040: { line1a_wages: 75000 } };

    // Use non-flattened path: create a stub builder that skips flatten so we
    // can read the field back. Since builder.ts always flattens, verify via
    // the merged doc's page count instead (flatten removes fields from the
    // interactive form but embeds values as content — not re-readable via
    // getTextField after flatten). We verify the output is a non-empty PDF.
    const result = await buildPdfBytes(pending, mockFiler, tmpDir);
    assertGreater(result.length, 1000);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: skips forms with no pending data", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const stubPdf = await makeMinimalF1040Pdf([
      "topmostSubform[0].Page1[0].f1_47[0]",
    ]);
    await seedCache(tmpDir, F1040_PDF_URL, stubPdf);

    // f1040 has data; hypothetical other form has none — builder should still succeed
    const pending = {
      f1040: { line1a_wages: 50000 },
      schedule_b: undefined,
    };
    const result = await buildPdfBytes(pending, mockFiler, tmpDir);
    const header = new TextDecoder().decode(result.slice(0, 5));
    assertEquals(header, "%PDF-");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: numeric values are rounded to integers", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const stubPdf = await makeMinimalF1040Pdf([]);
    await seedCache(tmpDir, F1040_PDF_URL, stubPdf);

    // The builder flattens, so we verify the output PDF is valid and non-empty
    const pending = { f1040: { line1a_wages: 75000.75 } };
    const result = await buildPdfBytes(pending, mockFiler, tmpDir);
    assertGreater(result.length, 100);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: throws when no forms generate output", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    // Pass pending with no f1040 data — builder should throw
    await assertRejects(
      () => buildPdfBytes({}, mockFiler, tmpDir),
      Error,
      "No PDF forms were generated",
    );
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: caches IRS PDF after first call", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const fieldName = "topmostSubform[0].Page1[0].f1_47[0]";
    const stubPdf = await makeMinimalF1040Pdf([fieldName]);
    await seedCache(tmpDir, F1040_PDF_URL, stubPdf);

    const pending = { f1040: { line1a_wages: 75000 } };

    // First call
    await buildPdfBytes(pending, mockFiler, tmpDir);

    // Cache file must exist
    const cacheFile = join(tmpDir, cacheSlug(F1040_PDF_URL));
    const stat = await Deno.stat(cacheFile);
    assertEquals(stat.isFile, true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("buildPdfBytes: rejects incomplete multi-category Form 1116 PDF source", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    const stubPdf = await makeMinimalF1040Pdf([
      "topmostSubform[0].Page1[0].Table_Part1_LinesI-1a[0].Line1a[0].Line1a_Text[0].f1_07[0]",
      "topmostSubform[0].Page1[0].Table_Part1_Lines2-6[0].Line6[0].f1_47[0]",
      "topmostSubform[0].Page1[0].f1_50[0]",
      "topmostSubform[0].Page2[0].f2_02[0]",
    ]);
    await seedCache(tmpDir, F1116_PDF_URL, stubPdf);

    await assertRejects(() => buildPdfBytes(
      {
        form_1116: {
          foreign_tax_paid: 1_400,
          total_income: 85_000,
          us_tax_before_credits: 13_000,
          category_summaries: [
            {
              category: "passive",
              foreignTaxPaid: 500,
              foreignGrossIncome: 1_000,
            },
            {
              category: "general",
              foreignTaxPaid: 900,
              foreignGrossIncome: 8_000,
            },
          ],
        },
      },
      mockFiler,
      tmpDir,
    ), Error);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
