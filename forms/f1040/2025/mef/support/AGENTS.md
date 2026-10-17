# forms/f1040/2025/mef/support

Shared MeF helpers that belong to no single serializer. Despite the name, one
module here is on the product path. Parent: [../AGENTS.md](../AGENTS.md).

## Files

- `test_filer.ts` — `testFiler()`: a fixed Single filer (SSN `123456789`,
  Austin TX) for tests and fixtures across `forms/f1040/`. Test-only.
- `current_loss_original_form_review.ts` — `reviewCurrentLossOriginalForms`:
  rebuilds Schedule E property lines, Form 4835 items and the Form 4797 sale
  from source and the Form 8582 current-loss allocation, as original-form
  review XML. Imported by
  `../../domains/income/business/current_loss_filing_projection.ts`, which the
  Schedule E, 4797, 4835 and 8582 serializers use, and by the review builders
  in `../../pdf/support/`. A change here moves filed documents.
- `generated_pdf_determinism.test.ts` — Form 8978 statement and QMID
  attachment PDFs must be byte-identical across builds (it sleeps 1.2 s
  between builds to catch embedded timestamps).

## Traps

- `reviewCurrentLossOriginalForms` takes `Readonly<Record<string, any>>`;
  don't copy that signature, and don't widen it further.
- `current_loss_original_form_review.test.ts` runs `xmllint` against the
  4797, Schedule E and 4835 XSDs in the private
  `.state/research/docs/IMF_Series_2025v5.4/` tree; without them it fails
  rather than skips — report that as unverified.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/support/`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/business/current_loss_ledger.test.ts`
  after changing the review.
