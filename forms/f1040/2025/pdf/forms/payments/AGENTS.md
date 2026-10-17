# pdf/forms/payments

Printed IRS PDFs for the Payments forms that are separate documents. Line
amounts from `f1040es`, `ext`, `f8288` and `f8805` print on Form 1040 /
Schedule 3 (`../general/return-assembly/f1040.ts`, `schedule3.ts`). Section
map: [../../../../nodes/inputs/payments/AGENTS.md](../../../../nodes/inputs/payments/AGENTS.md).

- `investments/f2439.ts` — `form2439Pdf` (page index 2 of
  `irs-prior/f2439--2021.pdf`); requires box 2 total = Schedule 3
  `line13a_total` and Form 1040 line 31 = Schedule 3 line 15. In `../index.ts`.
- `refund/f8888.ts` — `form8888Pdf` (`irs-prior/f8888--2025.pdf`, page 1;
  `f1_13`, reserved line 4, stays blank); values from `reconcileForm8888`.
  In `../index.ts`.
- `installments/f9465_attached.ts` — `form9465AttachedPdf`, built from the
  MeF `buildAttachedForm9465`; not in `../index.ts`, export blocked.
- `withholding/f1040_w2g_guard.test.ts` — test only: `irs1040Pdf` keeps a
  W-2G-sourced line 25c.

## Conventions here

- Descriptors call the same node/domain guards as MeF (`assertSourcedForm2439`,
  `reconcileForm8888`), so PDF and XML fail on the same source.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/forms/payments`
- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/all_descriptors.test.ts`
  (network) after changing a `pdfUrl` or field name.
