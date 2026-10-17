# Income — PDF projections

Printed IRS forms for Income by group (`business/`, `foreign/`,
`investments/`, `other/`, `rental-passthrough/`, `retirement/`, `wages/`).
Node, MeF and rules counterparts: [section map](../../../../nodes/inputs/income/AGENTS.md).

## Conventions here

- Each descriptor's `pendingKey` matches its MeF twin in
  `../../../mef/forms/income/` (`form7203` is again shared by
  `business/f7203_stock_loss.ts` and `rental-passthrough/schedule_e_stock_loss.ts`;
  `form8621` by the `foreign/f8621*.ts` packet descriptors).
- Joint and multi-page variants are selected with `includeWhen`:
  `business/f8582.ts`, `business/f4797.ts` (`pdf_current_joint_ordinary`),
  `rental-passthrough/schedule_e.ts` (retained pages),
  `schedule_e_stock_loss.ts` (`joint_header`).
- `printZero` is used per field in 14 income descriptors (e.g. `retirement/f8606.ts`,
  `business/f4797.ts`); check the field entry before assuming zero prints blank.
- Continuation statements are separate modules beside the form
  (`business/f4797_line2_statement.ts`, `f8582_continuation.ts`,
  `investments/schedule_b/schedule_b_*_statement.ts`,
  `other/schedule1/schedule1_*_statement.ts`).
- Older IRS revisions are pinned by `pdfUrl` for `other/f982.ts` (2018),
  `wages/f4852_retained.ts` (2020), `business/f7203_stock_loss.ts` and
  `foreign/f8992*.ts` (2022), `other/w2g.ts` (2023), `business/f7217.ts`
  (2024); check the IRS current revision before changing one, since field
  names come from that exact PDF.
- No PDF projection exists for W-2, 1099-R or the 1099 series; Form 4852
  prints only as a retained copy (`wages/f4852_retained.ts`).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/forms/income/<group>`
- Tests read IRS templates from `.pdf-cache/`; a missing template fails with
  `Missing verification prerequisite: .pdf-cache/<file>.pdf` (seen for
  `irs_f8915f_2025.pdf`). On 2026-10-17 `investments/f1040_form8814_schedule_d_print.test.ts`
  also failed its Schedule D text assertion ("Form. 8814"); not investigated.
- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/all_descriptors.test.ts`
  (network) after changing a field name or `pdfUrl`.
