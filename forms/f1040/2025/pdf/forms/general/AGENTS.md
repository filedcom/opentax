# 2025/pdf/forms/general/

`PdfFormDescriptor`s for General forms. A descriptor renders only if it is
listed in `ALL_PDF_FORMS` (`../index.ts`).

- `return-assembly/` (registered) — `f1040.ts`, `schedule1/schedule1.ts`,
  `schedule3.ts`, `schedule_lep.ts`, `f9000.ts`. `f1040.ts` calls
  `appendDependentContinuation` for dependents beyond the form's four
  columns, and uses the same `domains/general/return-assembly/` guards as the
  MeF `f1040.ts`.
- `foreign/` (registered) — `f5471/` (parent and its schedules; owned values
  via `f5471_owned_values.ts`), `f8854_initial.ts` (pending key `f8854`),
  `f8854_annual.ts`.
- Staged, not registered, export blocked: `foreign/f8938.ts` (shares
  `f8938_projection.ts` with MeF) and `investments/f8997.staged.ts`
  (+ `f8997_continuation.ts`).
- Missing here: `joint_occupancy_statement` has no PDF, and Form 8886's PDF is
  `domains/general/filing/form8886/pdf.ts`.
- Schedule 3 prints the `schedule3` pending entry after `f1040` has finalized
  it. Fix a wrong amount in the node, not in the projection.
- `../../field-dumps/` has `f1040`, `schedule1` and `schedule3` but no dumps
  for this section's foreign forms.

## Verify

- `bun test ./forms/f1040/2025/pdf/forms/general --timeout=1800000`
- `bun test ./forms/f1040/2025/pdf/support/all_descriptors.test.ts --timeout=1800000` (network)

Section map: [../../../../nodes/inputs/general/AGENTS.md](../../../../nodes/inputs/general/AGENTS.md)
