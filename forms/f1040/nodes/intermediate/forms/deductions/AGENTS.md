# intermediate/forms/deductions

Computed deduction forms: `schedule1a` (`additional/`); `form4562`,
`form_8829`, `form8990`, `form8995`, `form8995a` + `form8995a_schedule_a`–`_d`
(`business/`); `form4684` (`casualty/`); `form4952` (`investments/`). Feeds and
routes: [section map](../../../inputs/deductions/AGENTS.md).

## Conventions verified here

- `schedule1a`, `form4562`, `form_8829`, `form8990`, `form4684`, `form4952`
  are also CLI inputs (`forms/f1040/2025/inputs.ts`); `form8995`/`form8995a`
  are reached only by routing.
- Filed lines leave as a self-output `{ nodeType: this.nodeType, fields }`
  (`form4562`, `form_8829`, `form4952`, `form8995`, `form8995a`); MeF/PDF read
  that slice. `form4562` and `form8990` have empty `outputNodes`.
- TY2025-only routes throw on another `ctx.taxYear` (`form_8829`, `form8990`,
  `form4562` inventories, 8995-A Schedules A/B).
- `form8990` throws on any non-empty input in the plain DAG; active sources run
  through `business/form8990/run_two_pass.ts` from `executeReturn`
  (`forms/f1040/2025/index.ts`), which always adds an "unfileable" diagnostic.
- Literal constants instead of `CONFIG_BY_YEAR`: `form4684`
  (`PER_EVENT_FLOOR`, `AGI_FLOOR_PCT`) and Schedule 1-A caps/thresholds in
  `additional/schedule1a/calculation.ts`.
- `form4684` takes `agi` only from its own input (`input.agi ?? 0`).
- Legacy node type `form_8829`: files elsewhere say `form8829`/`f8829.ts`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/forms/deductions/`,
  then `bun run check:structure` and `bun run bench --form f1040 --year 2025`.
