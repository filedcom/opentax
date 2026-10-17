# 2025/pdf/forms/deductions

Printed-form descriptors for deductions, in `../index.ts` (`ALL_PDF_FORMS`):
`scheduleAPdf`, `form8283Pdf`, `form4684Pdf`, `form4952Pdf`, `form4562Pdf`,
`form8829Pdf`, `form8990Pdf`, `form8995Pdf`, `form8995aPdf` + Schedules A–D,
`schedule1aPdf`. Section map:
[../../../../nodes/inputs/deductions/AGENTS.md](../../../../nodes/inputs/deductions/AGENTS.md).

## Conventions verified here

- `pendingKey`s match the MeF serializers (`schedule_a`, `f8283`,
  `form_8829`, …). Files without one are helpers for a single descriptor:
  `business/f4562_section179.ts`, `business/f4562_elections.ts`,
  `business/f8995/f8995_continuation.ts`,
  `business/f8995a_aggregation_statement.ts`,
  `additional/schedule1a/schedule1a_tips_worksheet.ts`,
  `additional/schedule1a/schedule1a_vehicle_statement.ts`.
- Guards are shared with MeF: Schedule A, 4952, 8990 and 8995-A import from
  `../../../domains/deductions/`; `charitable/f8283.ts` imports
  `assertReviewedForm8283Return` from `../../../mef/forms/deductions/charitable/f8283/`
  (Form 8283 has no domain folder).
- The Form 1040 descriptor (`../general/return-assembly/f1040.ts`) calls
  `schedule1aPdf.projectFields`; `additional/f1040_schedule1a_guard.test.ts`
  rejects a positive line 13b without a reconciled Schedule 1-A page.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/forms/deductions/`
- `bun test --timeout=1800000 ./forms/f1040/2025/pdf/support/all_descriptors.test.ts` (network).
