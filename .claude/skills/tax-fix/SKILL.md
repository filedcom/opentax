---
name: tax-fix
description: Autonomous bug-fix loop for any form:year. Reads failing benchmark cases, spawns parallel bug-fixer agents per root cause cluster, validates, commits net-positive fixes, and loops until all pass or stalled.
---

# Tax Fix — Autonomous Bug Fix Loop

**Form:Year:** $ARGUMENTS  (e.g. `f1040:2025`)

## Step 0 — Derive Paths

Parse `$ARGUMENTS` as `{form}:{year}`. Derive:
- Policy doc: `forms/{form}/FORM.md`
- Cases dir: `benchmark/cases/{form}/{year}/`
- State key: `{form}:{year}` in `.state/bench/state.json` under `forms`
- Progress log: `.state/bench/progress.md`

Read `forms/{form}/FORM.md` and pass its contents to all spawned agents as context.

## Step 1 — Load State

Read `.state/bench/state.json`. Navigate to `forms.{form}:{year}.fix`:
- If `"done"` → print "All cases passing. Nothing to do." and stop.
- If `"stalled"` → print stall message and stop.
- Otherwise → set `status` to `"running"` and write state.json back.

## Step 2 — Identify Pending Root Causes

From `forms.{form}:{year}.fix.root_causes`, collect all entries where `status === "pending"`.

## Step 3 — Spawn Parallel Bug-Fixer Agents

For each pending root cause, spawn one agent in parallel using the Agent tool:
- Agent file: `.claude/skills/tax-fix/agents/bug-fixer.md`
- Pass as context: root cause object + FORM.md contents + cases dir

Spawn all in a single message.

## Step 4 — Run Validator

Spawn the validator agent (`.claude/skills/tax-fix/agents/validator.md`).
Pass: form, year, cases dir.

Parse JSON output: `{ total, pass, fail, failing }`.

## Step 5 — Evaluate Results

Compare current pass count to `forms.{form}:{year}.fix.benchmark_baseline`:
- **Net positive**: commit. Update baseline. Mark fixed root causes as `"done"`.
  ```bash
  git add -A
  git commit -m "fix: {form} {year} benchmark — X→Y passing cases"
  ```
- **No improvement**: increment `no_improvement_count`. If 3 → set `status: "stalled"`, stop.

## Step 6 — Log and Loop

Append to `.state/bench/progress.md`:
```
## [{form}:{year}] Round N — [timestamp]
- Baseline: X pass / Y fail
- After fix: A pass / B fail
- Fixed clusters: [list]
```

If `fail === 0` → set `status: "done"`, stop. Otherwise loop to Step 2.

## Key Constraints

- Only commit if net-positive (more passes, zero new failures)
- Never revert working fixes
- If a bug-fixer reports it cannot safely fix, leave cluster as "pending"
