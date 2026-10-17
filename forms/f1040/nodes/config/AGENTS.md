# forms/f1040/nodes/config/

Year-keyed tax constants (brackets, standard deduction, thresholds, phase-outs,
rates) that nodes read at compute time. No `TaxNode` lives here; year identity
and MeF schema version are in `../../2025/config.ts`.

## Layout

- `index.ts` — `CONFIG_BY_YEAR: Record<number, F1040Config>`
  (`{ 2025: config2025 }`) and the `F1040Config` type re-export.
- `types.ts` — `interface F1040Config`: every constant a node may read.
- `2025.ts` — TY2025 values as named exports (`BRACKETS_MFJ_2025`,
  `FPL_BASE_2025`, …), each with its authority (Rev. Proc. 2024-40 unless
  noted), assembled into `export const config2025: F1040Config`. Also exports
  the `Bracket` type.

## Rules

- Nodes read constants as `const cfg = CONFIG_BY_YEAR[ctx.taxYear]` inside
  `compute()` (e.g. `intermediate/worksheets/deductions/standard/standard_deduction/`);
  never hard-code a year's dollar amount in a node.
- A few modules import named values or `Bracket` from `2025.ts` directly
  (`form7206/pub974_worksheets.ts`, `form8615/calculation.ts`,
  `income_tax_calculation/tax_brackets.ts`); prefer `CONFIG_BY_YEAR` for new
  code so a new year needs no node edit.
- New constant: add the field to `F1040Config` (`types.ts`), the value with
  its citation in `2025.ts`, and the mapping in `config2025`; `tsc` fails
  every year config that lacks it.
- New year: add `<year>.ts` exporting `config<year>: F1040Config` and an
  entry in `CONFIG_BY_YEAR`. (The header comment in `index.ts` says the
  file goes in `forms/f1040/{year}/config.ts`; that is stale — follow `2025.ts`.)
- Every value cites an IRS or statutory source in a comment; changing one
  moves benchmark lines.

## Verify

- `bun run test:unit` (`tsc` catches a missing `F1040Config` field)
- `bun test forms/f1040/nodes/intermediate/worksheets --timeout=1800000`
- `bun run bench --form f1040 --year 2025`

## Read next

- [../AGENTS.md](../AGENTS.md)
- [../intermediate/AGENTS.md](../intermediate/AGENTS.md)
- [../../FORM.md](../../FORM.md) — adding a tax year
