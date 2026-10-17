# Income — computed forms

Computed Income forms, by group: `business/` (`schedule_f`, `form461`,
`form4797`, `form6198`, `form7203`, `form8582`, `form8824`), `foreign/`
(`form2555`), `investments/` (`form6252`, `form6781`, `form8815`, `form8949`),
`other/` (`form982`), `retirement/` (`form8606`). Which inputs feed each and
where its MeF/PDF/rules live: [section map](../../../inputs/income/AGENTS.md).

## Conventions here

- Several of these are also CLI inputs (`inputNodes` in `2025/inputs.ts`):
  `schedule_f`, `form2555`, `form6252` (array), `form6781`, `form8815`,
  `form8824`, and `form4797` under the keys `form4797_investment_1245` and
  `form4797_prior_history`. Routed fields and CLI fields merge into one
  pending slot, so a schema change affects both.
- Print-only fields go to the node's own pending slot with a raw
  `{ nodeType: this.nodeType, fields }` row (`form461`, `form4797`,
  `form8606`); the MeF/PDF descriptors read them by `pendingKey`.
- `form6198` is registered but nothing routes to it (baselined in
  `scripts/testing/structure-baseline.json`); the at-risk math callers use
  is `business/form6198/simplified.ts`.
- `business/farm_elections.ts` (CCC loan and crop-insurance elections) is
  shared by `schedule_f/model.ts`, `inputs/income/business/f4835` and the MeF
  CCC/crop statements.
- `form8582` runs after `agi_aggregator` (it needs `modified_agi`) and reports
  to `schedule1`, `schedule_d_final` and `agi_final`; see the two-pass note in
  the section map.
- `form7203` adds back basis-disallowed S-corp loss
  (`basis_disallowed_add_back`) to `schedule1`/`agi_aggregator`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/forms/income`
- `bun run check:structure` after adding or rerouting a node.
- `bun run bench --form f1040 --year 2025` when a computed line can change.
