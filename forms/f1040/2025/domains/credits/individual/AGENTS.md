# domains/credits/individual

Personal-credit reconciliation and the Schedule 2/3 guards. Section map:
[../../../../nodes/inputs/credits/AGENTS.md](../../../../nodes/inputs/credits/AGENTS.md).

## Form folders

- `form8839/form8839_two_pass.ts` and `form8863/form8863_two_pass.ts` are staged
  runners. `../../../return-processing/staged_source_return.ts` calls them.
  When `form8839` is present, the adoption runner wraps the 8863 runner, so
  education is settled first, as in the 8839 credit-limit worksheet. The 8863
  runner runs only with a QEF election, `schedule_j` or a counterfactual.
- `form8880/form8880_tax_limit.ts`: `assertForm8880*` guards used by MeF/PDF
  `f8880`; `form8880_*` tests cover ABLE, IRA, W-2 plan and distribution sources.
- `form8936/form8936_lines.ts` (`form8936Lines`) holds the line math. The MeF
  and PDF `f8936`/`f8936_schedule_a` use it, and so does
  `schedule2_form8936_reconciliation.ts`.

## Group-level guards (one form ↔ Schedule 2/3 line)

- `schedule3_form8396_/8834_/8859_/8912_reconciliation.ts` replay the
  `f1040` sink's tax-limited credit (Schedule 3 lines 6g/6i/6h/6k).
  `schedule2_form8936_reconciliation.ts` covers dealer-transfer repayment.
  All five are imported by `../../../mef/builder.ts` and
  `../../../pdf/builder.ts` and run on the whole bundle. Each has a
  `*_replay.test.ts` beside it.
- `schedule3_line12_source.ts` (Form 4136 → line 12),
  `schedule3_line6j_source.ts` (Form 8911 → line 6j), `schedule3_line8_join.ts`
  (line 8 → Form 1040 line 20) and `schedule3_printed_totals.ts` are imported
  by the Schedule 3 serializers in `mef|pdf/forms/general/return-assembly/schedule3.ts`.

## Traps

- The 4136 and 8911 Schedule 3 guards live here, even though those forms sit
  in `credits/business`.
- The Schedule 3 replays recompute from node modules
  (`form8396/calculation.ts`, the `f8834`, `f8859` and `f8912` exports) and
  from the worksheet lines that the `f1040` sink writes back into the
  `form8396`, `f8834`, `f8859` and `f8912` pending. If you change the sink's
  credit order (8880 → 8834 → 8936 → 8396 → 8859 → 3800 → 8912), re-run them.

Verify: `bun test --timeout=1800000 ./forms/f1040/2025/domains/credits/individual/`.
