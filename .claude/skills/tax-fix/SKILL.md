---
name: tax-fix
description: Autonomous bug-fix loop for any form:year. Reads failing benchmark cases, spawns parallel bug-fixer agents per root cause cluster, validates with the harness, commits engine fixes only, and loops until all pass or stalled.
---

# Tax Fix — Autonomous Bug Fix Loop

**Form:Year:** $ARGUMENTS  (e.g. `f1040:2025`)

## Step 0 — Derive Paths

Parse `$ARGUMENTS` as `{form}:{year}`. Derive:
- Policy doc: `forms/{form}/FORM.md`
- Cases dir: `benchmark/cases/{form}/{year}/`
- State key: `{form}:{year}` in `.state/bench/state.json` under `forms`
- Progress log: `.state/bench/progress.md`

Read `AGENTS.md` and `forms/{form}/FORM.md`; pass both to every spawned agent.

## Step 1 — Load State

Read `.state/bench/state.json`. Navigate to `forms.{form}:{year}.fix`:
- If `"done"` → print "All cases passing. Nothing to do." and stop.
- If `"stalled"` → print stall message and stop.
- Otherwise → set `status` to `"running"` and write state.json back.

## Step 2 — Identify Pending Root Causes

From `forms.{form}:{year}.fix.root_causes`, collect all entries where `status === "pending"`.

## Step 3 — Spawn Parallel Bug-Fixer Agents

Group pending root causes by `node_path`. Root causes that touch the **same node file** go to a **single agent**; different node files run in parallel.

For each group, spawn one agent using `.claude/skills/tax-fix/agents/bug-fixer.md`, passing the root cause object(s), FORM.md and the cases dir. Spawn all groups in a single message.

Bug fixers change engine code only. They never edit anything under `benchmark/cases/`; a case that is itself wrong comes back as a report with the IRS citation it needs, and its cluster stays `"pending"`.

## Step 4 — Validate

Run, in this order, and stop at the first failure (it is the round's result):

1. `bun run check:structure`
2. `bun run check:cases`
3. `bun run check:oracle` — expected values unchanged unless `ledger.json` cites a publication
4. `bun run test:unit`

Then spawn the validator agent (`.claude/skills/tax-fix/agents/validator.md`) with form, year and the cases dir, and parse `VALIDATOR_RESULT: { total, pass, fail, failing }`.

## Step 5 — Evaluate Results

First, `git status --porcelain benchmark/cases` must print nothing. If it does: `git checkout -- benchmark/cases`, mark the affected clusters `"pending"` with the note "case edit refused; needs a ledger citation", and do not count them.

Compare the pass count to `forms.{form}:{year}.fix.benchmark_baseline`:
- **Net positive** (more passes, zero new failures) and Step 4 green → commit engine paths only, update the baseline, mark fixed root causes `"done"`, reset `no_improvement_count`:
  ```bash
  git add forms core cli
  git commit -m "fix: {form} {year} benchmark — X→Y passing cases"
  ```
- **Otherwise** → `git checkout -- forms core cli`, increment `no_improvement_count`; if ≥ 2 → set `status: "stalled"` and stop.

## Step 6 — Log and Loop

Append to `.state/bench/progress.md`:
```
## [{form}:{year}] Round N — [timestamp]
- Baseline: X pass / Y fail
- After fix: A pass / B fail
- Fixed clusters: [list]
- Cases needing ledger review: [case: line, citation] or none
```

If `fail === 0` → set `status: "done"`, stop. Otherwise loop to Step 2.

## Key Constraints

- Commit only net-positive rounds, and only engine code.
- Never commit or hand-edit `benchmark/cases/`. An expected value changes only through `benchmark/cases/{form}/{year}/ledger.json` with a publication citation, recorded by a human.
- If a bug-fixer reports it cannot safely fix, leave the cluster `"pending"`.
