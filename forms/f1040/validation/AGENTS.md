# forms/f1040/validation

IRS MeF business rules for the 1040 series, as data the engine in
`core/validation/` evaluates (`opentax return validate`, and before
`return export`). Predicates, the rule engine and `ReturnContext` belong in
`core/validation/`; computed values come from pending, never from here.
Section index: [rules/README.md](./rules/README.md).

## Layout
- `field_registry.ts` — `FIELD_REGISTRY`: MeF XML element name → `{ form,
  pendingKey }`, header fields by hand plus the reverse of every `FIELD_MAP`
  in `ALL_MEF_FORMS` (`../2025/mef/forms/index.ts`); the first mapping wins.
- `rules/<section>/<group>/<stem>.ts` — one file per IRS rule-number prefix,
  exporting `<PREFIX>_RULES: readonly RuleDef[]` (e.g. `S2_RULES` in
  `rules/taxes/other/s2.ts`).
- `rules/index.ts` — imports all 137 groups into `ALL_RULES` and re-exports
  each group.

## Rules
- Rule IDs are the IRS rule numbers verbatim (`S2-F1040-001`,
  `SB-F1040-006-02`); the file stem is the lowercase prefix before the first
  dash (`ruleFormPrefix` in `core/validation/rule-builder.ts`). Never renumber.
- Each entry is `rule(number, severity, category, check, text)`; severity is
  `reject`, `reject_and_stop` or `alert`, `text` is the IRS rule text, and
  `check` is a predicate from `core/validation/mod.ts` over XML element names
  (`gt("HSADistriAddnlPercentTaxAmt", 0)`). `check: null` is a stub the engine
  skips and counts as skipped.
- A check can only see an element whose name is in `FIELD_REGISTRY`; add the
  pair to the serializer's `FIELD_MAP`, not a special case here.
- Files say "Auto-generated" by `scripts/maintenance/parse-rules.ts` (IRS
  business-rules CSV), but many were edited by hand since (e.g. `alwaysPass`
  with a reason comment, `sumOfAll`). The generator rewrites whole files and
  `index.ts`, and `scripts/maintenance/rule-paths.ts` still maps stems to the
  pre-section folders (`f1040` → `identity/f1040.ts`); do not run it without
  updating that map and diffing the result.
- Tests sit beside a group (`rules/income/investments/sb.test.ts`,
  `f8815.test.ts`): build a context with `createReturnContext(pending, header,
  FIELD_REGISTRY)` and call `rule.check`.

## Verify
- `bun test ./forms/f1040/validation/ --timeout=1800000`
- `bun test ./core/validation/ --timeout=1800000` when predicates change.
- `bun test ./scripts/maintenance/rule-paths.test.ts --timeout=1800000` after
  moving a rule file (currently fails: the map is stale, see above).
- `bun run test:unit`.

## Read next
- [rules/README.md](./rules/README.md)
- [../2025/mef/AGENTS.md](../2025/mef/AGENTS.md) — `FIELD_MAP` and XML names
- [../../../core/validation/types.ts](../../../core/validation/types.ts) — `RuleDef`, `FieldRegistry`
