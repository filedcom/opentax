# benchmark/cases

IRS-sourced benchmark cases, one directory per case at
`<form>/<year>/<NN-description>/`, plus the ratchet and history files that
govern them. Only `f1040/2025` exists today (133 cases).

## Layout
- `<form>/<year>/<case>/input.json` — `year`, `scenario`, `source`, and
  `forms[]` of `{ node_type, data }`, each added with `form add`.
- `<form>/<year>/<case>/correct.json` — `case`, `scenario`, `year`, `source`
  and the scored `correct` object (required: `line24_total_tax`,
  `line35a_refund`, `line37_amount_owed`).
- `<form>/<year>/ledger.json` — append-only history of expected-value changes;
  created with the first change (none exists yet; a missing ledger is empty).
- `baseline.json` — known-invalid cases (`case`, `reason`, `expires`,
  `approvedBy`) whose inputs no longer fit their node schema.

## Rules
- Every value in `correct.json` comes from the IRS publication cited in its
  `source` (pub, exercise, page), never from the engine or a reference
  calculator; `check:cases` rejects an engine citation.
- Cases are never edited to pass. Fix the engine, or escalate with the citation.
- Changing a scored value, removing a case or adding one without `source` needs
  a `ledger.json` entry: `case`, `line` (omit for a removed case), `before`,
  `after`, `source` citing a publication, `approvedBy`, `on` (YYYY-MM-DD).
  `bun run check:oracle` diffs against `origin/main` and enforces it.
- Each `data` object must pass the node schema `form add` applies: unknown
  fields are rejected, required fields named.
- `baseline.json` only shrinks: an expired entry fails, and an entry that no
  longer matches an invalid case fails until removed. Fixing a case means
  updating its inputs from its cited source, then deleting its entry.
- New cases: the `/tax-cases` skill, or by hand in the STRUCTURE.md formats.

## Verify
- `bun run check:cases` — expect `0 problems` (currently 105 valid, 28 baselined).
- `bun run check:oracle`
- `bun benchmark/run_case.ts benchmark/cases/<form>/<year>/<case>`

## Read next
- [../README.md](../README.md) — pass criteria and how expected values change
- [../../docs/architecture/STRUCTURE.md](../../docs/architecture/STRUCTURE.md) — `input.json` / `correct.json` formats
- [../../scripts/testing/oracle.ts](../../scripts/testing/oracle.ts) — ledger schema
- [../../.claude/skills/tax-cases/](../../.claude/skills/tax-cases/)
