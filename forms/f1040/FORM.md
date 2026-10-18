# Form 1040 — U.S. Individual Income Tax Return

IRC §6012 | IRS Pub 17 | MeF Schema: 2025v3.0

## What This Form Does
Annual income tax return for U.S. individuals (and married couples filing jointly).
Computes taxable income, applies the tax rate schedule, claims credits, and
determines refund or amount owed. Most other IRS forms feed into it as inputs.

## Node Categories

- `nodes/inputs/`                   → 158 nodes — one per IRS input document (W-2, 1099s, Schedule C, A, …)
- `nodes/intermediate/forms/`       → 49 nodes — computed forms (8959, 8960, EITC, 8889, …)
- `nodes/intermediate/worksheets/`  → 7 nodes — computation worksheets (brackets, Sch D, QBI, …)
- `nodes/intermediate/aggregation/` → 7 nodes — AGI, Schedule B/D/2/3 aggregators
- `nodes/outputs/`                  → 2 nodes — final line aggregators (f1040, schedule1)

## Conventions

- **Config-injected nodes** read year constants via `CONFIG_BY_YEAR[ctx.taxYear]` from
  `nodes/config/index.ts`; each year's constants are in `nodes/config/{year}.ts`.
- **Nodes are shared per form.** A year owns only config and wiring (`{year}/index.ts`,
  `{year}/config.ts`); a node whose rules change by year branches on `ctx.taxYear`.
  The node registry is `2025/registry.ts`, which later years reuse
  (see [STRUCTURE.md](../../docs/architecture/STRUCTURE.md)).
- All nodes follow the file shape in `AGENTS.md`: imports → enums → schemas → helpers → class → singleton.
- Node discovery: `glob forms/f1040/nodes/**/ ` — no master list needed.

## IRS Specs

- MeF schemas and business rules: `irs/` (not committed; [irs/README.md](../../irs/README.md) lists every file and how to install it)
- Instructions PDF: https://www.irs.gov/pub/irs-pdf/i1040.pdf
- IRS Pub 17: https://www.irs.gov/publications/p17
- VITA exercises (benchmark ground truth): https://www.irs.gov/pub/irs-pdf/p4491.pdf

## Benchmark

Cases: `benchmark/cases/f1040/{year}/`
Runner: `bun run bench --form f1040 --year {year}`
Pass threshold: 95% (≥ 131 of 137 for the current case set)

## Known Failure Modes (TY2025)

- **SSA + NIIT interaction** (cases 67, 91, 95): `form8959` does not correctly
  account for SSA income stacking with 1099-B capital gains when computing
  Additional Medicare Tax MAGI.

## Adding a New Tax Year

1. Add `forms/f1040/{year}/index.ts` and `config.ts`, following `forms/f1040/2026/`
2. Add `nodes/config/{year}.ts` with the new IRS Rev. Proc. constants and register it in `nodes/config/index.ts`
3. Run `bun run bench --form f1040 --year {year}` — most nodes pass unchanged
4. Any failure → branch that shared node on `ctx.taxYear`; never copy it into `{year}/`
5. Update this FORM.md: bump "Known Failure Modes" section

## Adding a New Form

Do not modify f1040 files. Run: `/tax-build {form_number} {year}`
The skill will create `forms/f{form}/` following this exact structure.
