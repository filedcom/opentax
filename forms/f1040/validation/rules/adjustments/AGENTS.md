# Adjustments — MeF business rules

IRS 1040-series business rules for the Adjustments forms, one file per rule
prefix, evaluated by `core/validation/` over XML element names. Section map:
[../../../nodes/inputs/adjustments/AGENTS.md](../../../nodes/inputs/adjustments/AGENTS.md).

| File | Export | Rules |
| --- | --- | --- |
| [education/f8917.ts](education/f8917.ts) | `F8917_RULES` | `F8917-014` Form 8917 absent (`formAbsent("form8917")`; header says stub) |
| [employment/f2106.ts](employment/f2106.ts) | `F2106_RULES` | 3; SSN-in-header implemented, the two per-SSN count limits are `alwaysPass` |
| [health/f7206.ts](health/f7206.ts) | `F7206_RULES` | `F7206-001` SSN matches header (implemented; header says stub) |
| [health/f8853.ts](health/f8853.ts) | `F8853_RULES` | 8 |
| [health/f8889.ts](health/f8889.ts) | `F8889_RULES` | 15 |

Schedule 1 line rules (e.g. `MovingExpenseAmt` vs Forms 3903) are in
`../income/other/s1.ts`.

## Traps verified here

- A check sees an element only through `FIELD_REGISTRY`
  (`../../field_registry.ts`, from each serializer's `FIELD_MAP`) or a
  pending key spelled like the element; `matchesHeaderSSN` passes when the
  element is absent. `f2106`/`f8853` have empty `FIELD_MAP`s and
  `form7206` maps no `SSN`, so their SSN and Form 8853 line rules see
  nothing; only the Schedule 2 amounts in `F8853_RULES` resolve. Form
  8889's map names top-level `print_line*` keys, but the node publishes
  them inside `forms[]`.
- Headers cite `1040_Business_Rules_2025v3.0.csv` and stale counts; the
  generator `scripts/maintenance/parse-rules.ts` reads 2025v5.4, writes to
  `.state/research/generated/mef-rules/` unless `--in-place`, and
  `rule-paths.ts` takes each group's home from this tree.

## Verify

- `bun test --timeout=1800000 scripts/maintenance/rule-paths.test.ts`;
  `bun run test:unit` (type-checks `../index.ts` imports)
