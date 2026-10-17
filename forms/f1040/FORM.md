# Form 1040 — U.S. Individual Income Tax Return

IRC §6012 | IRS Pub 17 | MeF Schema: 2025v5.4

## What This Form Does

Annual income tax return for U.S. individuals (and married couples filing jointly).
Computes taxable income, applies the tax rate schedule, claims credits, and
determines refund or amount owed. Most other IRS forms feed into it as inputs.

## Node Categories

- `nodes/inputs/` → 159 nodes — source documents (W-2, 1099s, K-1s, Schedule C/E, …)
- `nodes/intermediate/forms/` → 53 nodes — computed forms (8959, 8960, EITC, 8889, …)
- `nodes/intermediate/worksheets/` → 7 nodes — worksheets (tax calculation, QDCGTW, standard deduction, …)
- `nodes/intermediate/aggregation/` → 7 nodes — AGI and Schedule B/D/2/3 aggregators
- `nodes/outputs/` → 2 nodes — final line assembly (f1040, schedule1)

Placement, naming and the add-a-node steps: [nodes/AGENTS.md](nodes/AGENTS.md).

## Conventions

- **Config-injected nodes** read year constants via `CONFIG_BY_YEAR[ctx.taxYear]` from
  `nodes/config/index.ts`; values live in `nodes/config/<year>.ts`.
- Nodes are shared across years; a year folder owns only config and wiring. A `TaxNode`
  outside `nodes/` fails `bun run check:structure` (except `{year}/return-processing/start.ts`).
- Every node must be registered in `{year}/registry.ts`, keyed by its node type, and be
  either an `inputNodes` entry in `{year}/inputs.ts` or a routing target
  (`bun run check:structure`; exceptions in `scripts/testing/structure-baseline.json`).
- All nodes follow the file shape in `AGENTS.md`: imports → enums → schemas → helpers → class → singleton.

## IRS Specs

- XSD schemas: `.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/` (private, not checked in)
- PDF field dumps: `forms/f1040/2025/pdf/field-dumps/`
- Instructions PDF: https://www.irs.gov/pub/irs-pdf/i1040.pdf
- IRS Pub 17: https://www.irs.gov/publications/p17
- VITA exercises (benchmark ground truth): https://www.irs.gov/pub/irs-pdf/p4491.pdf

## Benchmark

Cases: `benchmark/cases/f1040/{year}/`
Runner: `bun run bench --form f1040 --year {year}`
Pass: `bench` exits 1 on any failing or skipped case (every case must pass).
Single case: `bun benchmark/run_case.ts benchmark/cases/f1040/{year}/<case>`

## Known Failure Modes (TY2025)

- 28 TY2025 cases whose inputs no longer fit their node schemas are listed in
  `benchmark/cases/baseline.json`; `bench` (like `bun run check:cases`) excludes
  them from scoring and lists them as `BASELINED` until each is fixed from its
  cited source or its entry expires. Any other invalid case still stops `bench`
  before the engine runs.

## Adding a New Tax Year

1. Copy `forms/f1040/2025/` → `forms/f1040/{year}/`
2. Update `{year}/config.ts` (`taxYear`, `mefSchemaVersion`) and add `"f1040:{year}"` to `catalog.ts`
3. Add `nodes/config/{year}.ts` exporting `config{year}: F1040Config` with the new
   Rev. Proc. constants, and a `{year}` entry in `nodes/config/index.ts`
4. Run `bun run check:structure` and `bun run bench --form f1040 --year {year}`
5. A structural change is made in the shared node, branching on `ctx.taxYear`
   (nodes may not live under `{year}/`)
6. Update this FORM.md: bump "Known Failure Modes" section

## Adding a New Form

Do not modify f1040 files. Run: `/tax-build {form_number} {year}`
The skill will create `forms/f{form}/` following this exact structure.
