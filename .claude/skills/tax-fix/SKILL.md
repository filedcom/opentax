---
name: tax-fix
description: Autonomous 1040 bug-fix loop. Reads failing benchmark cases, spawns parallel bug-fixer agents per root cause cluster, validates, commits net-positive fixes, and loops until all pass or stalled.
---

# Tax Fix — Autonomous 1040 Bug Fix Loop

## Overview

This skill runs autonomously to fix failing 1040 benchmark cases. It reads root cause clusters from the harness state file, spawns parallel fix agents, validates results, and commits improvements. It loops until all cases pass or no improvement is made for 3 consecutive rounds.

## Step 0 — Read STRUCTURE.md

Read `docs/architecture/STRUCTURE.md`. All paths used in this skill (harness state, cases dir, progress log, audit file) are defined there. Use those paths — do not rely on hardcoded values below if STRUCTURE.md differs.

## Step 1 — Load State

Read `.state/bench/state.json`. Check `tasks.tax-fix-1040.status`:
- If `"done"` → print "All 1040 cases passing. Nothing to do." and stop.
- If `"stalled"` → print stall message and stop.
- Otherwise → set `status` to `"running"` and write state.json back.

Read `benchmark/AUDIT.md` for full context on failing cases.

## Step 2 — Identify Pending Root Causes

From state.json, collect all root causes where `status === "pending"`. These become parallel work items.

## Step 3 — Spawn Parallel Bug-Fixer Agents

For each pending root cause, spawn one agent in parallel using the Agent tool:
- Agent type: general-purpose
- Agent file: `.claude/skills/tax-fix/agents/bug-fixer.md`
- Pass as context: the root cause object (description, cases, node_path) + the full AUDIT.md content

Each bug-fixer agent works independently on its cluster. Do NOT wait for one to finish before starting others — spawn all in a single message.

## Step 4 — Run Validator

After all bug-fixer agents complete, spawn the validator agent (`.claude/skills/tax-fix/agents/validator.md`) to run the full benchmark.

Parse the JSON output: `{ total, pass, fail, failing }`.

## Step 5 — Evaluate Results

Compare current pass count to baseline in state.json:
- **Net positive** (more passes, zero regressions): commit the changes.
  ```bash
  git add -A
  git commit -m "fix: 1040 benchmark — X→Y passing cases"
  ```
  Update `state.json` baseline to current pass/fail counts. Mark fixed root causes as `"done"` (any cluster where all its cases now pass).

- **No net improvement**: increment `no_improvement_count` in state.json. If count reaches 3 → set `status: "stalled"`, append stall summary to `.state/bench/progress.md`, stop.

## Step 6 — Log and Loop

Append to `.state/bench/progress.md`:
```
## Round N — [timestamp]
- Baseline: X pass / Y fail
- After fix: A pass / B fail
- Fixed clusters: [list]
- Remaining: [list]
```

Check if all cases pass (`fail === 0`). If yes → set `status: "done"`, stop. Otherwise loop back to Step 2.

## Key Constraints

- Only commit if net-positive (strictly more passes, zero new failures)
- Never revert working fixes to try a different approach — always build on progress
- If a bug-fixer agent reports it could not safely fix without regression risk, leave that cluster as "pending" and move on
