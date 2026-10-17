# 2025/pdf/forms/credits

Printed IRS PDF descriptors for credit forms. The node, MeF, domain and rules
counterpart of each form is in
[../../../../nodes/inputs/credits/AGENTS.md](../../../../nodes/inputs/credits/AGENTS.md).

## Layout

- `business/`: one `f<NNNN>.ts` per form, plus `f4136_schedule_a.ts`,
  `f8911_schedule_a.ts` (sharing `f8911_shared.ts`) and two statements. `f3800/`
  holds the Form 3800 projection, field map, capacity, carryover statement and
  per-source tests.
- `earned-income/eitc.ts` is Schedule EIC; `foreign/f1116/` is Form 1116 and
  Schedule B. `health/` holds 8941, 8962 and the 8962 allocation statement.
- `individual/` holds 2441, 5695, 8396, 8834, 8839, 8859, 8862, 8863, 8880, 8912,
  8936 (+ Schedule A), and also `schedule_8812.ts` and `schedule_r.ts`.

## Conventions verified here

- Descriptors are exported as `form<NNNN>Pdf` (`schedule8812Pdf`, `scheduleRPdf`,
  `eitcPdf`) and listed in `ALL_PDF_FORMS` (`../index.ts`). Two are not
  registered: `foreign/f1116/f1116_schedule_c_candidate.ts`, and
  `business/f8908.ts`, which is staged on purpose. `f8908.ts` reads
  `../../../mef/forms/credits/business/f8908_source_reconciliation.ts`.
- `business/fixtures/f8911sa-2025.pdf` is the blank IRS Schedule A (Form 8911).
  `f8911_schedule_a.ts` pins its `pdfSha256`. Provenance is in
  [business/fixtures/README.md](business/fixtures/README.md). Update the pin and
  the fixture together.
- Business-credit PDFs import `assertForm3800FinalCreditJoin` from
  `../../../domains/credits/business/form3800/`, so a credit printed on its
  own form must match Form 3800 line 38 → Schedule 3 → Form 1040 line 20.

Verify: `bun test --timeout=1800000 ./forms/f1040/2025/pdf/forms/credits/<group>/`.
`bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/all_descriptors.test.ts`
checks field names against the IRS PDFs and needs network access.
