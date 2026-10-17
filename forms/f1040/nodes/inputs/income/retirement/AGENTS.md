# Income — retirement inputs

Pensions, IRAs and benefits (Form 1040 lines 4–6): `f1099r`, `rrb1099r`,
`ssa1099`, `lump_sum_ss`, `benefit_1042s`, `f8915f`, `f8915d`. Form 8606 is
computed in `intermediate/forms/income/retirement/form8606`. Crosswalk:
[../AGENTS.md](../AGENTS.md).

## Flow

- `f1099r` → `f1040` lines 4a/4b/5a/5b and withholding, `agi_aggregator`,
  `form8606` (IRA basis), `form5329` and `form4972Elections` (Taxes,
  `intermediate/forms/taxes/retirement/form4972/elections.ts`), `scheduleA`.
  Box 7 codes are `DistributionCode` in `f1099r/distribution_code.ts`.
- `f4852` (wages group) feeds substitute 1099-Rs into `f1099r` as
  `substitute_f1099rs`.
- Form 8915-F has no computing node: the current-year treatment lives on the
  1099-R item (`form8915f_treatment: "full" | "three_years"`,
  `form8915f_repayment_amount`). `f8915f` emits nothing; it checks each
  owner group, `2025/index.ts` calls `verifyGroupedDistributionSources`
  against `f1099r` when there are several items, and both export builders
  call `assertForm8915FSourceLinks`.
- `ssa1099` → `f1040` line 6a and `agi_aggregator`, which computes taxable
  line 6b. `rrb1099r` (Tier 2) → `f1040` lines 5a/5b and `agi_aggregator`.

## Traps

- Unsupported routes fail on purpose: `f8915d` always throws; `lump_sum_ss`
  throws when the Pub 915 election is beneficial; `benefit_1042s` computes
  nothing and `2025/return-processing/attachment_coverage.ts` blocks export
  when it is present.
- `f1099r/index.ts` is ~2200 lines, mostly per-code item refinements; read
  them before adding a field. Recipient ownership is checked again at export
  by `assert1099RRecipientOwner`
  (`2025/domains/income/retirement/f1099r/f1099r_recipient_owner.ts`).

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/income/retirement`
- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/forms/income/retirement`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/income/retirement`
