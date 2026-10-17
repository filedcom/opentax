# 2025/pdf/forms/taxes

Printed-form descriptors for the Taxes section; `pendingKey` values match the
MeF serializers in `../../../mef/forms/taxes/`. Node and MeF counterparts:
[section map](../../../../nodes/inputs/taxes/AGENTS.md).

## Conventions verified here

- Not in `ALL_PDF_FORMS` (`../index.ts`): `credit-recapture/f8828.ts`
  (staged until attachment and PDF validation) and
  `underpayment/f2210_box_e.ts`, which exports only the page-1 field lists
  `form2210BoxEPage1Fields` / `form2210BoxEPage1FilerFields`.
- `retirement/f4972.ts` exports `form4972Pdf` (page 1 only, two-copy limit
  like MeF) and `form4972PaperPdf` (paper packet for larger collections); it
  draws the NUA annotations beside lines 6 and 8, which have no AcroForm field.
- `passthrough/f8978_shared.ts` holds what `f8978.ts` and
  `f8978_schedule_a.ts` share.
- Guards come from `../../../domains/taxes/**` (6251, 4972, Schedule SE,
  8959, Schedule J, Schedule 2 line 15); `credit-recapture/f8611.ts` imports
  `assertForm8611IssuerSources` from the MeF folder.
- `underpayment/f1040_line38.test.ts` covers the Form 1040 line 38 penalty
  print, not a Taxes descriptor.

## Verify

- `bun test ./forms/f1040/2025/pdf/forms/taxes --timeout=1800000` (downloads
  IRS PDFs into `.pdf-cache` on first run).
- `bun test ./forms/f1040/2025/pdf/support/all_descriptors.test.ts --timeout=1800000`
  after changing field names (needs network).
