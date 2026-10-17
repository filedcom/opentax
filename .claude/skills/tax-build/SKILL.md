---
name: tax-build
description: Autonomous form builder. Given a form number (e.g. 1120), researches IRS instructions, extracts ground truth from IRS sample returns, builds all nodes section by section, then runs a validate+fix loop until ≥95% of benchmark cases pass.
---

# Tax Build — Autonomous Form Builder

**Form:** $ARGUMENTS

## Overview

This skill autonomously builds a new tax form from scratch. It runs in phases, tracking progress in the harness state file so it can resume if interrupted.

## Phase 0 — Derive Paths + Load State

Parse `$ARGUMENTS` as form number (e.g. `1120`). Prepend `f` to get form dir prefix: `f1120`.

Derive all paths from convention (`docs/architecture/STRUCTURE.md` is the map):
- Form dir:     `forms/f{ARGUMENTS}/`
- Nodes (shared by every year): `forms/f{ARGUMENTS}/nodes/<inputs|intermediate|outputs>/[<aggregation|forms|worksheets>/]<section>/<group>/<name>/index.ts`
- Year constants: `forms/f{ARGUMENTS}/nodes/config/2025.ts` (+ `index.ts` with `CONFIG_BY_YEAR`)
- Year wiring:  `forms/f{ARGUMENTS}/2025/` — `index.ts`, `config.ts` (form type, year, MeF schema version), `registry.ts`, `inputs.ts`, `return-processing/start.ts`
- Catalog:      `catalog.ts` — add `"f{ARGUMENTS}:2025"`
- Policy doc:   `forms/f{ARGUMENTS}/FORM.md`  (create if building new form)
- Benchmark cases: `benchmark/cases/f{ARGUMENTS}/2025/<NN-description>/`
- State key:    `f{ARGUMENTS}:2025` in `.state/bench/state.json` under `forms`
- Node specs:   `.state/bench/node-specs/{ARGUMENTS}-2025-nodes.json`
- Progress log: `.state/bench/progress.md`

Read `AGENTS.md`, `docs/architecture/STRUCTURE.md`, `forms/f1040/nodes/AGENTS.md`
and (if it exists) `forms/f{ARGUMENTS}/FORM.md`; `forms/f1040/FORM.md` shows
what a FORM.md holds. Pass them as context to all spawned agents throughout
this skill.

Read `.state/bench/state.json`. Navigate to `forms["f{ARGUMENTS}:2025"].build.phase`:
- `null` or missing → start from Phase 1
- `"research"` → skip to Phase 2
- `"ground_truth"` → skip to Phase 3
- `"build"` → skip to Phase 4
- `"validate"` → skip to Phase 4 (re-validate)

Set `build.status` to `"running"` and write state.json.

### Known limit of the harness

The benchmark is f1040-shaped today: `benchmark/run_benchmark.ts` and
`benchmark/run_case.ts` run `return create --year <year>` without `--form`
(the CLI defaults to `f1040`), and `benchmark/harness.ts` requires
`line24_total_tax`, `line35a_refund` and `line37_amount_owed` in every
`correct.json`. Before Phase 4 can score a new form, the harness must pass
the case's form to `return create --form` and score that form's output keys.
If that is not in place, stop after Phase 3 and report it instead of
reshaping cases to fit the f1040 keys.

## Phase 1 — Research

Spawn one researcher agent (see `agents/researcher.md`). Pass:
- Form number: $ARGUMENTS
- Output path: `.state/bench/node-specs/$ARGUMENTS-2025-nodes.json`

Wait for completion. Verify the file exists and is valid JSON with a `nodes` array.

Update state.json: `build.phase → "research"`, `build.node_specs_path` set.

Append to `.state/bench/progress.md`:
```
## [Form $ARGUMENTS] Phase 1 Complete — Research
- Nodes identified: N
- Sections: [general, income, deductions, credits, taxes, payments]
```

## Phase 2 — Ground Truth

Spawn one extractor agent (see `agents/extractor.md`). Pass:
- Form number: $ARGUMENTS
- Cases output dir: `benchmark/cases/f{ARGUMENTS}/2025/`

Wait for completion. Count created case directories in `benchmark/cases/f{ARGUMENTS}/2025/`, then run `bun run check:cases`.

Update state.json: `build.phase → "ground_truth"`, `build.benchmark_cases_created` set.

Append to progress.md:
```
## [Form $ARGUMENTS] Phase 2 Complete — Ground Truth
- Benchmark cases created: N
- Case directories: [list]
```

## Phase 3 — Build

Read `.state/bench/node-specs/$ARGUMENTS-2025-nodes.json`. Group nodes by their `section`, one of the seven `SECTIONS` in `scripts/testing/structure.ts`: general, income, adjustments, deductions, credits, taxes, payments.

For each section, spawn one node-builder agent in parallel (see `agents/node-builder.md`). Pass:
- The node specs for that section (JSON subset)
- Form number and year (2025)
- Path to the most similar existing form for reference patterns

Spawn ALL section agents in a single message (parallel). Wait for all to complete.

Section agents each register their nodes; resolve any conflicting edits to
`registry.ts` / `inputs.ts`, then make the wiring pass:
```bash
bun run check:structure   # placement, registry keys, registration, reachability
bun run test:unit         # module graph and tsc
```

Update state.json: `build.phase → "build"`, `build.nodes_built` array populated.

Append to progress.md:
```
## [Form $ARGUMENTS] Phase 3 Complete — Build
- Sections built: [list]
- Nodes implemented: N
```

## Phase 4 — Validate + Fix Loop

Repeat until ≥95% pass or 3 consecutive rounds with no improvement:

**4a. Validate**

Spawn validator agent (see `agents/validator.md`). Pass form `f$ARGUMENTS` and year `2025`.

Parse `VALIDATOR_RESULT:` line from output. Record in state.json `build.benchmark_runs`.

**4b. Evaluate**

Before any commit: `bun run check:structure`, `bun run check:cases`, `bun run check:oracle` and `bun run test:unit` pass, and `git status --porcelain benchmark/cases` shows only the cases this build created.

- If pass rate ≥ 95%: set `build.status → "done"`, commit, append final summary to progress.md, stop.
- If net-positive vs. previous round: commit, continue.
- If no improvement for 3 rounds: set `build.status → "stalled"`, stop.

**4c. Fix**

For each failing case, spawn one bug-fixer agent (`.claude/skills/tax-fix/agents/bug-fixer.md`). Pass:
- Failing case name + input.json + correct.json content
- Form: `f$ARGUMENTS`, cases dir `benchmark/cases/f$ARGUMENTS/2025/`
- Root cause: "unknown — investigate from scratch"

Spawn all failing-case fix agents in parallel. Wait. Then go back to 4a.

## Key Constraints

- Always check the existing `forms/f1040/` structure before building anything in `forms/f$ARGUMENTS/` — follow the exact same patterns
- Nodes never go under the year folder: `bun run check:structure` fails any `TaxNode` outside `forms/<form>/nodes/…`, any node not in a catalog year's registry keyed by its node type, and any registered node that is neither a CLI input nor a routing target
- Never edit a case to make it pass; an expected value changes only with a ledger entry citing a publication (`bun run check:oracle`)
- Read `AGENTS.md` before spawning node-builder agents — pass its contents as context
- Never skip the research phase — node specs are the contract everything else depends on
- Only commit after a net-positive validation round
