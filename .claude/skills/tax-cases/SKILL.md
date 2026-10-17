---
name: tax-cases
description: Generate realistic benchmark cases from IRS-published sources (VITA exercises, Pub 17 examples, MeF test cases). Correct values come directly from IRS publications — no reference calculator involved.
---

# Tax Cases — IRS-Sourced Benchmark Generator

**Source:** $ARGUMENTS (e.g. `vita`, `pub17`, `mef`, or a free-form description like "senior with SSA and 1099-R")

## Overview

Generates new benchmark cases where the correct values are sourced directly from IRS publications. No computed ground truth — the IRS numbers are the ground truth.

## Step 0 — Derive Paths

Parse $ARGUMENTS for an optional `{form}:{year}` prefix (e.g. `f1040:2025 vita`). Extract:
- `form` — defaults to `f1040` if not specified
- `year` — defaults to `2025` if not specified
- remaining tokens → source argument for Step 1

Cases directory: `benchmark/cases/{form}/{year}/`

Read `docs/architecture/STRUCTURE.md` ("Benchmark case formats") and `benchmark/cases/AGENTS.md` to confirm paths and rules are still current. If they differ, use those.

## Step 1 — Determine Source

Parse $ARGUMENTS:
- `vita` → VITA Pub 4491 training exercises (best coverage, verified by IRS)
- `pub17` → Publication 17 "Your Federal Income Tax" worked examples
- `mef` → IRS MeF (Modernized e-File) software developer test cases
- anything else → treat as a scenario description, use `vita` as primary source

If no argument, default to `vita`.

## Step 2 — Spawn IRS Sourcer Agent

Spawn one agent using `agents/irs-sourcer.md`. Pass:
- Source type / description: $ARGUMENTS
- Output path: `.state/bench/irs-cases-raw.json` (a git-ignored per-run intermediate; never commit it)
- Existing cases dir: `benchmark/cases/{form}/{year}/`

Wait for completion. Verify the file exists and contains a `cases` array with at least one entry.

If sourcer finds no usable cases, stop and report which sources were tried.

## Step 3 — Determine Next Case Number

Read `benchmark/cases/{form}/{year}/`. Find the highest existing case number (e.g. 134 → next is 135).

## Step 4 — Spawn Case Writer Agents

Read `.state/bench/irs-cases-raw.json`. For each raw case in the `cases` array, spawn one case-writer agent in parallel using `agents/case-writer.md`. Pass:
- The raw case object (scenario description, form values, IRS-provided correct values, source citation)
- The next available case number (increment per case: 135, 136, 137, …)
- Cases directory: `benchmark/cases/{form}/{year}/`

Spawn ALL case-writer agents in a single message (parallel).

Wait for all to complete.

## Step 5 — Verify Cases

For each newly created case directory, verify:
1. `input.json` exists and is valid JSON with a `forms` array
2. `correct.json` exists and has `correct.line24_total_tax`, `correct.line35a_refund`, `correct.line37_amount_owed`
3. `correct.json` has a `source` field citing the IRS publication, exercise number, and page

Then run:
```bash
bun run check:cases    # every node_type and field fits the node schema; source is a publication
bun run check:oracle   # existing expected values unchanged
```

Report any cases that failed verification. Do NOT run the benchmark — that's for `/tax-fix` after cases are added. A single case can be tried with `bun benchmark/run_case.ts benchmark/cases/{form}/{year}/<case>` (prints the computed return, writes nothing).

## Step 6 — Report

Print a summary:
```
Cases added: N (cases 135–142)
Source: VITA Pub 4491 TY2025

New cases:
  135-[name]   Single, W-2 + interest   IRS VITA Ex. 3
  136-[name]   MFJ, retirement + SSA    IRS VITA Ex. 7
  ...

Next step: run /tax-fix to see how the engine performs on these cases.
```

Append to `.state/bench/progress.md`:
```
## Cases Added — [timestamp]
- Source: [source]
- Cases: [list with numbers and names]
- IRS citations: [list]
```

## Key Constraints

- Every `correct` value must be traceable to an IRS publication page/exercise — no computed values
- If an IRS example is ambiguous or the publication doesn't give a specific line value, omit that field from `correct` (the benchmark only requires the three pass/fail fields)
- Do NOT delete or modify existing cases
- Never derive a value from the engine (`run_case.ts`, `return get`): `check:cases` rejects an engine citation, and a case is never edited to pass
