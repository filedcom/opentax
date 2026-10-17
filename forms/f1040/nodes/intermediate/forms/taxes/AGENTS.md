# intermediate/forms/taxes

Computed Taxes forms: `amt/form6251`, `employment/{form4137,form8919,form8959}`,
`household-employment/schedule_h`, `income-averaging/schedule_j_calculation`,
`investments/{form8615,form8960}`, `retirement/{form4972,form5329}`,
`self-employment/schedule_se`. Feeders and routes:
[section map](../../../inputs/taxes/AGENTS.md).

- Also CLI inputs in `2025/inputs.ts`: `form4137`, `form8919`, `schedule_h`,
  `form5329`, `form4972`, and `form6251` under
  `inputKey: "form6251_prior_iso_sale"`.
- `form4972`: the registry key maps to `form4972Elections`
  (`retirement/form4972/elections.ts`; CLI supplies `elections`, `f1099r`
  routes `source_forms`, one group per election). `index.ts` exports the
  unregistered per-form calculator that `elections.ts` imports.
- `schedule_se` (owner path) writes `owner_instances` back to its own pending
  slot for per-owner MeF/PDF copies; its `outputNodes` is a getter.
- `form8615` only validates the lines `income_tax_calculation` finalizes; its
  `outputNodes` is empty.
- `form6251` imports `form6251_prior_iso_sale.ts` from
  `2025/domains/taxes/amt/form6251/`: this shared node depends on year code.
- Logic splits: `schedule_j_calculation/{calculation,preferential_line4,preferential_tax,tax_source}.ts`
  (uses `ordinaryTax2025` from `worksheets/taxes/calculation/tax_table_2025.ts`),
  `schedule_se/{calculation,owner_calculation}.ts`,
  `form4972/{participant_collection,participant_inventory,source_rounding}.ts`.

## Verify

- `bun test ./forms/f1040/nodes/intermediate/forms/taxes --timeout=1800000`
- `bun run check:structure`, then `bun run bench --form f1040 --year 2025`.
