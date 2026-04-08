# PDF Form Filling — 100% Accuracy Design

**Date:** 2026-04-08
**Status:** Approved

---

## Context

The PDF export pipeline fills IRS AcroForm PDFs from computed tax data. Four gaps prevent taxpayer-facing accuracy:

1. **Field name accuracy** — AcroForm paths were derived from layout knowledge, not real PDF inspection. Wrong names are silently skipped.
2. **Filer identity** — Name, SSN, and address are never written to the PDF.
3. **Form 8949** — Uses a row-array pattern incompatible with the scalar field map. Currently excluded.
4. **Checkboxes** — Builder only calls `getTextField()`; no checkbox, radio, or dropdown support.

The root cause of all four gaps is the weak `[string, string][]` descriptor format, which can't express field type, repeating rows, or identity context.

---

## Approach

Redesign the descriptor format to encode field kind, then fix all four gaps against the new model. A one-time inspection script bootstraps correct field names from real IRS PDFs.

---

## Section 1: Descriptor Format

**File:** `forms/f1040/2025/pdf/form-descriptor.ts`

Replace the `PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]>` tuple with a typed union:

```typescript
type PdfFieldEntry =
  | { kind: "text";     domainKey: string; pdfField: string }
  | { kind: "checkbox"; domainKey: string; pdfField: string }
  | { kind: "radio";    domainKey: string; pdfField: string; valueMap: Record<string, string> };

interface PdfRowDescriptor {
  domainKey: string;           // key in pending dict holding the row array
  maxRows: number;             // max rows per PDF page
  rowFields: ReadonlyArray<{
    kind: "text" | "checkbox";
    domainKey: string;
    pdfFieldPattern: string;   // e.g. "...Row{row}[0].f1[0]" — {row} interpolated at runtime
  }>;
}

interface PdfFormDescriptor {
  readonly pendingKey: string;
  readonly pdfUrl: string;
  readonly fields: ReadonlyArray<PdfFieldEntry>;        // computed fields
  readonly filerFields?: ReadonlyArray<PdfFieldEntry>; // name, SSN, address
  readonly rows?: PdfRowDescriptor;                    // 8949-style row arrays
}
```

All 49 form descriptor files are migrated from the old tuple format. Migration is driven by the inspection script output.

---

## Section 2: Field Inspection Script

**File:** `scripts/inspect-pdf-fields.ts`

One-time script. Run with:
```
deno run --allow-net --allow-read --allow-write scripts/inspect-pdf-fields.ts
```

Steps:
1. Load all descriptors from `forms/f1040/2025/pdf/forms/index.ts`
2. Download each PDF from `pdfUrl` (cached locally to `scripts/field-dumps/cache/`)
3. Call `pdfDoc.getForm().getFields()` — collect real field names + types
4. Compare against currently mapped names: report ✓ matched / ✗ missing / ? unmapped
5. Write `scripts/field-dumps/<formKey>.json` with full field inventory

The JSON dump is the source of truth for migrating all 49 descriptors to the new format. Form 8949 row field patterns are extracted from the indexed field names found in the real PDF (e.g. `Row1[0].f1[0]` → pattern `Row{row}[0].f1[0]`).

---

## Section 3: Builder Redesign

**File:** `forms/f1040/2025/pdf/builder.ts`

**Signature change:**
```typescript
buildPdfBytes(pending: PendingDict, filer: FilerIdentity): Promise<Uint8Array>
```

`filer` is threaded from `cli/commands/export.ts` (already extracted there, currently unused for PDF).

**Field dispatch:**
```typescript
for (const entry of descriptor.fields) {
  const value = fields[entry.domainKey];
  if (value === undefined || value === null) continue;

  if (entry.kind === "text") {
    form.getTextField(entry.pdfField).setText(String(Math.round(Number(value))));
  } else if (entry.kind === "checkbox") {
    const box = form.getCheckBox(entry.pdfField);
    value ? box.check() : box.uncheck();
  } else if (entry.kind === "radio") {
    const mapped = entry.valueMap[String(value)];
    if (mapped) form.getRadioGroup(entry.pdfField).select(mapped);
  }
}
```

Errors log field name + form key — never silently swallowed.

**Filer identity:**
```typescript
for (const entry of descriptor.filerFields ?? []) {
  const value = filer[entry.domainKey as keyof FilerIdentity];
  if (value) form.getTextField(entry.pdfField).setText(String(value));
}
```

**Row array filling (Form 8949):**
```typescript
if (descriptor.rows) {
  const items = fields[descriptor.rows.domainKey] ?? [];
  for (let i = 0; i < Math.min(items.length, descriptor.rows.maxRows); i++) {
    for (const rf of descriptor.rows.rowFields) {
      const pdfField = rf.pdfFieldPattern.replace("{row}", String(i + 1));
      form.getTextField(pdfField).setText(String(items[i][rf.domainKey] ?? ""));
    }
  }
}
```

If a return has more rows than fit on one page, the builder loads the Form 8949 PDF additional times and appends pages to the output.

---

## Section 4: Testing & Verification

**Layer 1 — Field existence regression guard**

In `forms/f1040/2025/pdf/forms/all-descriptors.test.ts`:
- For each descriptor, download the PDF, call `form.getFields()`
- Assert every `pdfField` in `fields`, `filerFields`, and `rows.rowFields` exists with the correct type
- Fails CI if a field name is wrong or the IRS updates a PDF's AcroForm structure
- Requires `--allow-net=www.irs.gov`

**Layer 2 — Builder unit tests**

In `forms/f1040/2025/pdf/builder.test.ts`:
- Mock a PDF with known fields
- Assert text fields get correct rounded integer values
- Assert checkboxes check/uncheck correctly
- Assert radio groups select the right option via `valueMap`
- Assert row arrays write the correct indexed field names
- Assert filer identity fields are written
- Assert unknown field names produce a logged error (not silent skip)

**Layer 3 — Golden output test**

End-to-end test with a fixture return covering all field kinds. Runs the full export pipeline, opens the output PDF with pdf-lib, reads back field values, asserts they match expected. Covers builder + descriptor + filer identity in one shot.

**New Deno tasks:**
```json
"inspect:pdf-fields": "deno run --allow-net --allow-read --allow-write scripts/inspect-pdf-fields.ts",
"test:pdf": "deno test --allow-net=www.irs.gov --allow-read forms/f1040/2025/pdf/"
```

---

## Files Modified

| File | Change |
|------|--------|
| `forms/f1040/2025/pdf/form-descriptor.ts` | New descriptor types |
| `forms/f1040/2025/pdf/forms/*.ts` (49 files) | Migrate to new format |
| `forms/f1040/2025/pdf/builder.ts` | Dispatch on kind, filer param, row arrays |
| `forms/f1040/2025/pdf/builder.test.ts` | Tests for all field kinds |
| `forms/f1040/2025/pdf/forms/all-descriptors.test.ts` | Field existence regression guard |
| `cli/commands/export.ts` | Pass filer to `buildPdfBytes` |
| `scripts/inspect-pdf-fields.ts` | New inspection script |
| `deno.json` | New tasks |

---

## Execution Order

1. Write and run `scripts/inspect-pdf-fields.ts` — get real field names for all 49 forms
2. Update `form-descriptor.ts` with new types
3. Migrate all 49 form descriptor files using dump output
4. Redesign `builder.ts` — dispatch, filer, rows
5. Thread `filer` through `export.ts` → `buildPdfBytes`
6. Add filer identity `filerFields` to `f1040.ts` descriptor
7. Implement Form 8949 row descriptor + builder pagination
8. Update all tests (builder unit + all-descriptors regression guard + golden output)
9. Run `test:pdf` — all pass
