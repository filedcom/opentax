# Adjustments — worksheets

One worksheet: [`ira_deduction_worksheet`](retirement/ira_deduction_worksheet/index.ts)
(Pub 590-A IRA deduction worksheet → Schedule 1 line 20). It is a routing
target of `w2` (box 13 sets `covered_by_retirement_plan: true`) and a
singleton CLI input. Section map:
[../../../inputs/adjustments/AGENTS.md](../../../inputs/adjustments/AGENTS.md).

## Behaviour verified in code

- No `ira_contribution > 0` → no outputs, even when `w2` sent coverage.
- With a contribution, `filing_status`, `magi` and coverage are required
  (throws otherwise). Nothing in the graph supplies them: `magi` is a
  user-entered number, not derived from `agi_aggregator`.
- `covered_by_retirement_plan` (W-2 box 13) overrides a conflicting manual
  `active_participant`.
- Limits and phase-out ranges come from `CONFIG_BY_YEAR` (`iraContribution*`,
  `iraPhaseout*`); the reduced limit rounds up to $10 with a $200 floor.
- Outputs: deductible → `schedule1` and `agi_aggregator`
  (`line20_ira_deduction`); capped contribution → `form8880` (Credits;
  spouse when `form8606_filing_details.owner` is spouse); nondeductible
  remainder → `form8606` with the `form8606_*` source fields (Income).
- The Form 8606 MeF serializer reads `pending.ira_deduction_worksheet`
  (`2025/mef/forms/income/retirement/f8606.ts`).

## Verify

- `bun test --timeout=1800000 forms/f1040/nodes/intermediate/worksheets/adjustments`
- `bun run bench --form f1040 --year 2025` (cases
  `109-mfj-w2-ira-deduction-savers-credit`, `123-mfj-1099r-ssa-ira-deduction`).
