# Form 1040 — U.S. Individual Income Tax Return

IRC §6012 | IRS Pub 17 | MeF Schema: 2025v3.0

## What This Form Does
Annual income tax return for U.S. individuals (and married couples filing jointly).
Computes taxable income, applies the tax rate schedule, claims credits, and
determines refund or amount owed. Most other IRS forms feed into it as inputs.

## Node Categories

- `nodes/inputs/`          → 131 nodes — one per IRS input document (W-2, 1099s, Schedule C, A, …)
- `nodes/intermediate/forms/`       → ~35 nodes — computed forms (8959, 8960, EITC, 8889, …)
- `nodes/intermediate/worksheets/`  → ~10 nodes — computation worksheets (brackets, Sch D, QBI, …)
- `nodes/intermediate/aggregation/` → ~8 nodes  — AGI, Schedule B/D/2/3 aggregators
- `nodes/outputs/`          → 2 nodes  — final line aggregators (f1040, schedule1)

## Conventions

- **Config-injected nodes** import year constants via `CONFIG_BY_YEAR[ctx.taxYear]` from
  `nodes/config/index.ts`. Adding a new year = add entry to that barrel + a new `config.ts`.
- **Year-specific structural overrides** (rare, ~2–5 per year) live in `{year}/nodes/`.
  A year's `registry.ts` imports the override instead of the shared node.
- All nodes follow the file shape in `CLAUDE.md`: imports → enums → schemas → helpers → class → singleton.
- Node discovery: `glob forms/f1040/nodes/**/ ` — no master list needed.

## IRS Specs

- XSD schemas: `.state/research/docs/IMF_Series_2025v3.0/1040x_2025v3.0/`
- PDF field dumps: `.state/field-dumps/`
- Instructions PDF: https://www.irs.gov/pub/irs-pdf/i1040.pdf
- IRS Pub 17: https://www.irs.gov/publications/p17
- VITA exercises (benchmark ground truth): https://www.irs.gov/pub/irs-pdf/p4491.pdf

## Benchmark

Cases: `benchmark/cases/f1040/{year}/`
Runner: `deno task bench --form f1040 --year {year}`
Pass threshold: 95% (≥ 93 of 97 for the current case set)

## Known Failure Modes (TY2025)

- **SSA + NIIT interaction** (cases 67, 91, 95): `form8959` does not correctly
  account for SSA income stacking with 1099-B capital gains when computing
  Additional Medicare Tax MAGI.

## Adding a New Tax Year

1. Copy `forms/f1040/2025/` → `forms/f1040/{year}/`
2. Update `{year}/config.ts` with new IRS Rev. Proc. constants
3. Add `{year}` entry to `nodes/config/index.ts`: `import { config{year} } from "../../{year}/config.ts"`
4. Run `deno task bench --form f1040 --year {year}` — most nodes pass unchanged
5. Any failure → that node has structural changes → create override at `{year}/nodes/{path}/index.ts`
6. Update `{year}/registry.ts` to import override instead of shared node
7. Update this FORM.md: bump "Known Failure Modes" section

## Adding a New Form

Do not modify f1040 files. Run: `/tax-build {form_number} {year}`
The skill will create `forms/f{form}/` following this exact structure.
