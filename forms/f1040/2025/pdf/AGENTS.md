# forms/f1040/2025/pdf

TY2025 printed IRS forms: descriptors that project normalized pending values
onto the official AcroForm fields, the builder that fills and concatenates the
IRS PDFs, and the synthetic returns used for human PDF review. Values are
computed in `../../nodes/` and reconciled in `../domains/`; nothing here
computes tax. Indexes: [forms/README.md](./forms/README.md),
[reviews/README.md](./reviews/README.md), [support/AGENTS.md](./support/AGENTS.md).

## Layout
- `form_descriptor.ts` — `PdfFormDescriptor` (`pendingKey`, `pdfUrl`,
  optional `pdfSha256`, `fields`, `filerFields`, `rows`, `projectFields`,
  `presenceKey`/`includeWhen`, page hooks) and `PdfFieldEntry` kinds `text`,
  `checkbox`, `checkboxWhen`, `radio`.
- `forms/<section>/<group>/f<NNNN>.ts` (+ `.test.ts`) — descriptors;
  `forms/index.ts` holds `ALL_PDF_FORMS`, the print order.
- `builder.ts` — `buildPdfBytes(pending, filer, cacheDir = ".pdf-cache", preparedBundle?, pageOrigins?)`,
  `fillFormPdf`, `buildForm4972PaperPdfBytes`.
- `support/` — `template_cache.ts` (`loadPdfTemplate`: download once into
  `.pdf-cache`, reject bytes whose SHA-256 differs from `pdfSha256`),
  `all_descriptors.test.ts`, shared statement/country helpers.
- `field-dumps/` — committed snapshot of each form's real AcroForm fields
  (`<pendingKey>.json`: `pendingKey`, `pdfUrl`, `realFields`, `matched`,
  `missing`, `unmapped`) with the IRS PDFs in `field-dumps/cache/`. No code
  reads it; `scripts/research/inspect-pdf-fields.ts` writes fresh dumps of the
  same shape to `.state/research/ty2025-pdf-field-audit/`.
- `reviews/<section>/...` — `*.fixture.ts` synthetic returns and their tests;
  `review_fixtures.ts` collects them as `pdfReviewFixtures`
  (`id`, `inputs`, `filer`, `expectedPdfForms`, `reviewFocus`).

## Rules
- A new printed form: add a descriptor in its section folder and to
  `ALL_PDF_FORMS`. Field names are full AcroForm paths
  (`topmostSubform[0].Page1[0].f1_01[0]`) taken from the real IRS PDF (a dump
  or `inspect-pdf-fields.ts`); `all_descriptors.test.ts` checks them.
- Blank is the default for zero; use `printZero` only where 0 is a declared
  value (Form 8606 line 2). Use `fontSize` only after visual review.
- Call the form's `../domains/**` `assert*` guards from `projectFields` or the
  descriptor, as `forms/taxes/amt/f6251.ts` does, so PDF and MeF agree.
- A review fixture must name every PDF it expects and a review focus;
  `scripts/research/plan-ty2025-pdf-review.ts` throws on duplicates, empty
  lists or an unregistered `expectedPdfForms` key.

## Verify
- `bun test ./forms/f1040/2025/pdf/forms/<section>/<group>/ --timeout=1800000`.
- `bun test ./forms/f1040/2025/pdf/support/all_descriptors.test.ts --timeout=1800000`
  (fetches every `pdfUrl` from irs.gov: needs network).
- `bun scripts/research/plan-ty2025-pdf-review.ts` (from the repo root) after
  changing review fixtures; generating and checking a review
  (`generate-`/`check-ty2025-pdf-review.ts`) need an output directory and the
  private `Return1040.xsd` path.
- `bun run test:unit` (type-check only for this folder).

## Read next
- [../mef/AGENTS.md](../mef/AGENTS.md), [../domains/AGENTS.md](../domains/AGENTS.md)
- [../../../../scripts/README.md](../../../../scripts/README.md)
