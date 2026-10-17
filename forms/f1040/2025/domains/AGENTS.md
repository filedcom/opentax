# forms/f1040/2025/domains

TY2025 source reconciliation by tax concern: pure checks and staged runners that
tie validated source documents, computed pending values and exported
documents together for one form or effect. Calculations belong in
`../../nodes/` (a `TaxNode` here fails `check:structure`; the three legacy
ones in `general/filing/form8886/` and `income/business/form172/` are baselined
in `scripts/testing/structure-baseline.json` — move, don't add); XML element and PDF
field mapping belong in `../mef/forms/` and `../pdf/forms/`. Per section:
each section's `AGENTS.md`, e.g. [taxes/AGENTS.md](taxes/AGENTS.md).

## Layout
- `<section>/<group>/<form>/` — section is one of the seven return sections,
  group a kebab-case tax group (`amt`, `credit-recapture`), form folder
  `form<NNNN>`, `f<NNNN>` or `schedule-<x>` (e.g. `taxes/amt/form6251/`).
- `<section>/<group>/*.ts` — checks spanning several forms, e.g.
  `taxes/credit-recapture/schedule2_form8828_reconciliation.ts`.
- Module kinds (by suffix): `*_source.ts` / `*_reconciliation.ts` mostly
  export `assert*` guards that throw an `Error` naming the mismatch; `*_two_pass.ts`
  and `*_source_return.ts` are staged runners (`form8863_two_pass.ts`,
  `schedule_j_source_return.ts`); `*_projection.ts` shapes export values.

## Rules
- Guards are called by the year (`../index.ts`, `../return-processing/`) and by
  serializers (`../mef/forms/**`, `../pdf/forms/**` import from here); keep
  them pure: take parsed pending/source values, return or throw, no state.
- Parse source with the node's exported Zod `inputSchema`/`itemSchema` from
  `../../nodes/**`, never a hand-written shape.
- Tests are `*.test.ts` beside the module (`bun:test`, `@std/assert`). Return
  tests run `f1040_2025.executeReturn` from `../index.ts`, assert
  `diagnostics` is `[]`, check `buildPending(...)` lines, then
  `prepareReturn`/MeF tags and the PDF descriptor.
- Fixtures: `*.fixture.ts` exports source inputs; table-driven cases pair
  `<name>.fixture.json` (inputs keyed by case id) with `<name>.expected.json`
  (same keys). Expected values come from IRS forms, instructions or
  publications, never from engine output; say so in the test, as
  `taxes/amt/form6251/form6251_basis_returns.test.ts` does.
- Tests that validate XML read the 2025v5.4 XSD under
  `.state/research/docs/IMF_Series_2025v5.4/` (private, may be absent) and fail
  without it — some throw `Missing verification prerequisite`, others fail in
  xmllint ("failed to load external entity") or with `ENOENT`. Each is a
  missing input, not a pass and not a regression.

## Verify
- `bun test ./forms/f1040/2025/domains/<section>/<group>/<form>/ --timeout=1800000`
  (leading `./` makes it a path; these tests are not in `test:unit`).
- `bun run test:unit` (type-checks every module here).
- `bun run bench --form f1040 --year 2025` when a guard or runner can change a
  computed line.

## Read next
- [taxes/AGENTS.md](taxes/AGENTS.md) and the other section files
- [../AGENTS.md](../AGENTS.md) — how the year calls these modules
- [../mef/AGENTS.md](../mef/AGENTS.md), [../pdf/AGENTS.md](../pdf/AGENTS.md)
- [../../../../docs/architecture/repository-organization.md](../../../../docs/architecture/repository-organization.md)
