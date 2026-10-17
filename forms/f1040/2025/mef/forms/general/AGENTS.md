# 2025/mef/forms/general/

MeF serializers for General forms: one `MefFormDescriptor`
(`../../form_descriptor.ts`) per document. A descriptor is emitted only if it
is in `ALL_MEF_FORMS` (`../index.ts`) and one of its `sourcePendingKeys`
(default: `pendingKey`) is in pending. `f1040` is always built.

- `return-assembly/` — `f1040.ts` (uses the `domains/general/return-assembly/`
  guards), `schedule1/schedule1.ts`, `schedule3.ts`, `schedule_lep.ts`,
  `f9000.ts`, `joint_occupancy_statement.ts`.
- `foreign/f5471/` — the parent (`f5471_parent`) and Schedules E, H, I-1, J,
  M, P, Q, R, all with `sourcePendingKeys: ["f5471"]`.
  `foreign/f8854/` — initial, annual and `f8854_native_statements.ts`.
- Staged, not in `ALL_MEF_FORMS`, export blocked: `foreign/f8938.ts` and
  `investments/f8997.staged.ts`. The Form 8886 descriptors are in
  `domains/general/filing/form8886/`.
- References between documents use `context.documentIdsByPendingKey` in the
  final phase. Schedule 3 throws `needs attached <form>` when a line's source
  form is missing; `f5471_linkage.ts` links the 5471 parent to its schedules.
- Identity (9000, LEP, 5471) comes from `context.filer`, never from the
  input. `FIELD_MAP` entries feed `validation/field_registry.ts`.

## Verify

- `bun test ./forms/f1040/2025/mef/forms/general --timeout=1800000`. Without
  the private 2025v5.4 XSDs most XSD cases skip, but `f5471_linkage.test.ts`
  fails with "Failed to locate the main schema resource"; report it as
  unverified.
- `bun test ./forms/f1040/e2e/workflows/unregistered_attachment_export.test.ts --timeout=1800000`

Section map: [../../../../nodes/inputs/general/AGENTS.md](../../../../nodes/inputs/general/AGENTS.md)
