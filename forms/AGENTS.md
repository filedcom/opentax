# forms/

Form-specific tax logic: one folder per return product, holding its nodes, year
wiring, MeF/PDF projections, business rules and E2E tests. The engine
(`TaxNode`, planner, executor) is form-agnostic and lives in `core/`; CLI and
persistence live in `cli/`.

## Layout

- `f1040/` — the only form today; see [f1040/AGENTS.md](f1040/AGENTS.md).
- A form is reachable only through `catalog.ts` (`"f1040:2025": f1040_2025`);
  `bun run check:structure` reads every catalog year's registry.

## Rules

- Seven return sections, used as folder names in every role: `general`,
  `income`, `adjustments`, `deductions`, `credits`, `taxes`, `payments`
  (`SECTIONS` in `scripts/testing/structure.ts`). Business, investments,
  retirement, foreign and health are groups inside a section, never sections.
- Naming: `.ts` files and node folders are snake_case (`f1116_review/`,
  `owned_source.ts`); category folders (groups, e2e areas) are kebab-case
  (`earned-income/`, `rental-passthrough/`, `return-assembly/`).
- Node types: `f<number>` for source-document input nodes (`f1099int`,
  `f1116_review`), `form<number>` for computed forms (`form8959`,
  `form8995a_schedule_b`), `schedule_<letter>` for lettered schedules
  (`schedule_a`, `schedule_se`); `schedule1`, `schedule1a`, `schedule2`,
  `schedule3` keep the IRS names. Documents without a form number use a
  descriptive name (`w2`, `ssa1099`, `k1_partnership`, `general`).
  Legacy exceptions exist (`form_1116`, `form_8829`, output `f1040`); don't
  copy them.
- Node type == registry key == node folder name, and is the CLI input name
  (`opentax form add --node_type <type>`, `node_type` in benchmark
  `input.json`). A key that differs fails `check:structure` (registry-key).
- Nodes are shared per form; a year owns only config and wiring. Placement is
  `forms/<form>/nodes/<inputs|intermediate|outputs>/[<aggregation|forms|worksheets>/]<section>/<group>/<name>/<file>.ts`,
  enforced by `bun run check:structure`; existing exceptions are in
  `scripts/testing/structure-baseline.json` (reason, expiry, approver).
- A new form is built with the `/tax-build` skill
  (`.claude/skills/tax-build/`), never by editing `f1040/` files.

## Verify

- `bun run check:structure`
- `bun run test:unit` (module graph + `tsc` over the whole tree)
- `bun run bench --form <form> --year <year>` for each form:year touched.

## Read next

- [f1040/AGENTS.md](f1040/AGENTS.md)
- [../docs/architecture/STRUCTURE.md](../docs/architecture/STRUCTURE.md) — layout and which check owns each rule
- [../docs/architecture/repository-organization.md](../docs/architecture/repository-organization.md) — what each section holds
- [../core/AGENTS.md](../core/AGENTS.md) — the `TaxNode` contract
