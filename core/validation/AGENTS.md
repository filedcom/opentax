# core/validation/

The form-agnostic MeF business-rule engine: a predicate DSL over a read-only
`ReturnContext`, rule evaluation, and report formatting. The rules themselves
and the XML-name → pending-field map are form data and live in
`forms/f1040/validation/` (`rules/`, `field_registry.ts`), not here.

## Layout
- `types.ts` — `RuleDef`, `RuleCheck` (`true` = passes), `Severity`,
  `ErrorCategory`, `ReturnContext`, `DiagnosticsReport`, `FieldRegistry`.
- `predicates.ts` — the DSL (`hasValue`, `eqSum`, `ifThen`, `forEach`, …);
  each returns a `RuleCheck`.
- `rule-builder.ts` — `rule(number, severity, category, check, text)`, CSV
  severity/category parsing, rule-number prefix → form reference.
- `context.ts` — `createReturnContext(pending, filer, fieldRegistry,
  emittedFormCounts?)`.
- `engine.ts` — `evaluateRules(rules, ctx, applicableFormPrefixes?)`.
- `report.ts` — `formatDiagnosticsText` / `formatDiagnosticsJson`.
- `mod.ts` — the public surface rule files import from.

## Rules
- Rules read the return only through `ReturnContext`, never the pending dict.
  Field lookup order: header fields, then `fieldRegistry`, then any form
  holding that key; `num()` of a missing or non-numeric value is `0`.
- With `emittedFormCounts`, form presence and counts come from what was
  emitted, not from non-empty pending slots.
- `evaluateRules` skips (counts as `skipped`): rules whose prefix is outside
  `applicableFormPrefixes`, `database`/`duplicate` categories (server-side),
  stubs with `check: null`, and everything after a failing
  `reject_and_stop`. `canFile` is `rejected === 0`; `alert` and
  `reject`+`information` count as alerts.
- Generated rule files import `rule` and predicates from `mod.ts` and
  `RuleDef` from `types.ts` (`scripts/maintenance/parse-rules.ts`). A new
  predicate must be exported from `mod.ts`; renaming one breaks rule files
  under `forms/f1040/validation/rules/`.

## Verify
- `bun test --timeout=1800000 core/validation/` (`predicates.test.ts`).
- `bun run test:unit` — `tsc` catches broken imports in every rule file.
- `bun test --timeout=1800000 forms/f1040/validation/` and
  `bun test --timeout=1800000 cli/commands/validate.test.ts` when evaluation
  or context semantics change.

## Read next
- [../AGENTS.md](../AGENTS.md)
- [../../forms/f1040/validation/AGENTS.md](../../forms/f1040/validation/AGENTS.md)
- [../../cli/commands/validate.ts](../../cli/commands/validate.ts) — how the
  CLI builds the context and runs `ALL_RULES`
