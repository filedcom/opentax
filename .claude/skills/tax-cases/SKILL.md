---
name: tax-cases
description: Add benchmark cases whose expected values come directly from IRS publications (VITA exercises, Pub 17 examples, form instruction examples). No reference calculator and no engine output.
---

# Tax Cases

**Source:** $ARGUMENTS — optional `{form}:{year}` (default `f1040:2025`), then
`vita`, `pub17`, `instructions`, or a free-form scenario (sourced from VITA
first). Cases go in `benchmark/cases/{form}/{year}/<NN-name>/`; the file format
is in `docs/architecture/STRUCTURE.md`.

## 1. Source

Spawn one agent with `.claude/skills/tax-cases/agents/irs-sourcer.md`, passing
the source and the output path `.state/bench/irs-cases-raw.json` (create
`.state/bench/` if missing; `.state/` is untracked). Stop if it finds nothing
usable, and report the sources tried.

## 2. Write

Number new cases after the highest existing `NN-` prefix. Spawn one agent per
raw case in a single message, with
`.claude/skills/tax-cases/agents/case-writer.md`, the raw case, its number and
the cases directory.

## 3. Check

- `bun run check:cases`: every input fits the node schema the CLI applies and
  every `source` cites a publication.
- `bun run check:oracle`: a new case with a `source` passes; any change to an
  existing case needs a `ledger.json` entry, which a human records.

Do not run the engine to fill or adjust values. Report the cases added
(number, name, scenario, citation); `/tax-fix {form}:{year}` then shows how the
engine does on them.

## Rules

- Every value in `correct` is stated by the cited publication; omit any line it
  does not state.
- Never edit or delete existing cases.
