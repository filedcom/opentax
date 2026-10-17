# 2025/domains/taxes

TY2025 export guards and staged runners for the Taxes section. Per-form
counterparts: [section map](../../../nodes/inputs/taxes/AGENTS.md).

- Both builders (`../../mef/builder.ts`, `../../pdf/builder.ts`) replay
  Schedule 2 lines before serializing: 4 (`self-employment/`), 5/6 and 1040
  lines 1c/1g (`employment/`), 9 (`household-employment/`), 12
  (`investments/`), 13/17h/17k (`other/`), 17b (`credit-recapture/`), plus
  `schedule_j_source_return.ts` and `form8978/form8978_source.ts`.
- Other guards are imported by that form's MeF and PDF descriptors
  (`amt/form6251/`, `retirement/form4972/`, `self-employment/schedule-se/`,
  `employment/form8959/`, `schedule_j_child_tax_join.ts`,
  `other/section453a_reconciliation.ts`, `underpayment/`).
- Calculations live here too: `form2210/form2210_box_e.ts`,
  `form2210f/form2210f_box_b.ts` and `form6251/form6251_prior_iso_sale.ts` are
  imported by the `f2210`, `f2210f`, `form6251` and `f1040` nodes, so editing
  them moves computed lines.
- `executeScheduleJSourceReturn` is the prepass run by
  `../../return-processing/staged_source_return.ts`; it parses `schedule_j`
  with the strict `publicInputSchema`, so callers cannot supply
  `_derived_source`.

## Verify

- `bun test ./forms/f1040/2025/domains/taxes/<group> --timeout=1800000`. Tests
  that validate XML fail with "failed to load external entity" when
  `.state/research/docs/IMF_Series_2025v5.4/` is absent: unverified, not passed.

Group notes: [employment](employment/AGENTS.md), [other](other/AGENTS.md).
