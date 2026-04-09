---
name: tax-build
description: Autonomous form builder. Given a form number (e.g. 1120), researches IRS instructions, extracts ground truth from IRS sample returns, builds all nodes section by section, then runs a validate+fix loop until ≥95% of benchmark cases pass.
---

# Tax Build — Autonomous Form Builder

**Form:** $ARGUMENTS

## Overview

This skill autonomously builds a new tax form from scratch. It runs in phases, tracking progress in `taxcalcbench/harness/state.json` so it can resume if interrupted.

## Phase 0 — Load State

Read `taxcalcbench/harness/state.json`. Check `tasks.tax-build-$ARGUMENTS.phase`:
- `null` or missing → start from Phase 1
- `"research"` → skip to Phase 2
- `"ground_truth"` → skip to Phase 3
- `"build"` → skip to Phase 4
- `"validate"` → skip to Phase 4 (re-validate)

Set `status` to `"running"` and write state.json.

## Phase 1 — Research

Spawn one researcher agent (see `agents/researcher.md`). Pass:
- Form number: $ARGUMENTS
- Output path: `taxcalcbench/harness/node-specs/$ARGUMENTS-nodes.json`

Wait for completion. Verify the file exists and is valid JSON with a `nodes` array.

Update state.json: `phase → "research"`, `node_specs_path` set.

Append to `taxcalcbench/harness/progress.md`:
```
## [Form $ARGUMENTS] Phase 1 Complete — Research
- Nodes identified: N
- Sections: [income, deductions, tax_computation, credits, payments]
```

## Phase 2 — Ground Truth

Spawn one extractor agent (see `agents/extractor.md`). Pass:
- Form number: $ARGUMENTS
- Cases output dir: `taxcalcbench/cases/`

Wait for completion. Count created case directories (`$ARGUMENTS-*`).

Update state.json: `phase → "ground_truth"`, `benchmark_cases_created` set.

Append to progress.md:
```
## [Form $ARGUMENTS] Phase 2 Complete — Ground Truth
- Benchmark cases created: N
- Case directories: [list]
```

## Phase 3 — Build

Read `taxcalcbench/harness/node-specs/$ARGUMENTS-nodes.json`. Group nodes into sections (income, deductions, tax_computation, credits, payments, other).

For each section, spawn one node-builder agent in parallel (see `agents/node-builder.md`). Pass:
- The node specs for that section (JSON subset)
- Form number and year (2025)
- Path to the most similar existing form for reference patterns

Spawn ALL section agents in a single message (parallel). Wait for all to complete.

Update state.json: `phase → "build"`, `nodes_built` array populated.

Append to progress.md:
```
## [Form $ARGUMENTS] Phase 3 Complete — Build
- Sections built: [list]
- Nodes implemented: N
```

## Phase 4 — Validate + Fix Loop

Repeat until ≥95% pass or 3 consecutive rounds with no improvement:

**4a. Validate**

Spawn validator agent (see `agents/validator.md`). Pass form: $ARGUMENTS.

Parse `VALIDATOR_RESULT:` line from output. Record in state.json `benchmark_runs`.

**4b. Evaluate**

- If pass rate ≥ 95%: set `status → "done"`, commit, append final summary to progress.md, stop.
- If net-positive vs. previous round: commit, continue.
- If no improvement for 3 rounds: set `status → "stalled"`, stop.

**4c. Fix**

For each failing case, spawn one bug-fixer agent (`.claude/skills/tax-fix/agents/bug-fixer.md`). Pass:
- Failing case name + input.json + correct.json content
- Form: $ARGUMENTS
- Root cause: "unknown — investigate from scratch"

Spawn all failing-case fix agents in parallel. Wait. Then go back to 4a.

## Key Constraints

- Always check the existing `forms/f1040/` structure before building anything in `forms/f$ARGUMENTS/` — follow the exact same patterns
- Read `CLAUDE.md` before spawning node-builder agents — pass its contents as context
- Never skip the research phase — node specs are the contract everything else depends on
- Only commit after a net-positive validation round
