# forms/f1040/2025/pdf/field-dumps

A committed, stale snapshot of AcroForm fields in IRS PDFs. Nothing reads it:
no descriptor, builder, test or script imports these files. Parent:
[../AGENTS.md](../AGENTS.md).

## What is here

- `<pendingKey>.json` (47 files) — `pendingKey`, `pdfUrl`, `realFields`
  (`{ name, type }` from pdf-lib), and `matched` / `missing` / `unmapped`
  against the descriptor mapping when the dump was taken (September 2026).
  `ALL_PDF_FORMS` now has far more descriptors than were dumped.
- `cache/*.pdf` (47 files, ~5 MB) — the PDFs those dumps were read from.

## Traps

- Every `pdfUrl` here is the current-revision `https://www.irs.gov/pub/irs-pdf/…`
  file, while descriptors pin `irs-prior/<form>--2025.pdf` (or an older
  archived revision). Field names can differ between revisions, so a dump is
  a lead, not evidence; `matched`/`missing` counts are out of date.
- To get current fields, run `bun scripts/research/inspect-pdf-fields.ts`: it
  inspects each descriptor's own `pdfUrl` and writes
  `.state/research/ty2025-pdf-field-audit/<pendingKey>-<index>.json` (adds
  `wrongType`), not this folder. Don't hand-edit or regenerate dumps here.
- The only code mentions are path strings: `scripts/testing/repository.ts`
  hashes `*.json` under this folder as a runtime input (a change during a test
  run fails it), and `scripts/testing/contracts.test.ts` uses a nonexistent
  `field-dumps/map.json` as a fixture path.
- Descriptor field names are proven by
  `../support/all_descriptors.test.ts` against the real PDFs, not by these files.

## Verify

- Nothing to run for this folder; for field names,
  `bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/all_descriptors.test.ts`
  (network).
