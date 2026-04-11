---
name: audit-harness
description: Generic audit/fix loop. Pass a goal string. Planner subdivides work, auditor/fixer teams run in parallel, loop until 2 consecutive clean cycles.
---

# Audit Harness — Generic Audit/Fix Loop

**Goal:** $ARGUMENTS

---

## Step 0 — Initialize State

Generate a `run_id`: take the first 5 words of `$ARGUMENTS`, lowercase, replace spaces with hyphens, append today's date as `-YYYYMMDD`. Example: `"ensure compute functions handle edge"` → `ensure-compute-functions-handle-edge-20260411`.

Read `.state/audit/state.json`. If the file does not exist, create it:
```json
{"version": 1, "runs": {}}
```

Check if `runs[run_id]` exists:
- If `status === "done"` → print "Run already completed." and **stop**.
- If `status === "stalled"` → print "Run stalled previously. Reset status to 'running' in state.json to retry." and **stop**.
- If `status === "running"` → **resume** from current `global_cycle` (skip to Step 2 if work_packages exist, otherwise Step 2 will re-plan).
- If not present → create a new entry:
  ```json
  {
    "goal": "$ARGUMENTS",
    "status": "running",
    "created_at": "<ISO timestamp>",
    "global_cycle": 0,
    "global_clean_count": 0,
    "checkpoint_commit": null,
    "work_packages": [],
    "cycles": []
  }
  ```

Write state.json.

---

## Step 1 — Checkpoint Git State

```bash
git add -A && git status --porcelain
```

If there are uncommitted changes, commit them:
```bash
git commit -m "audit-harness: checkpoint before run {run_id}"
```

Record the current HEAD SHA as `checkpoint_commit` in the run entry. Write state.json.

---

## Step 2 — Spawn Planner (Plan Phase)

Spawn **one** agent using the prompt from `.claude/skills/audit-harness/agents/planner.md`.

Pass as context in the agent prompt:
- `goal`: The full `$ARGUMENTS` string
- `mode`: `"plan"`
- `state`: The full run entry JSON (so planner can see prior cycles if resuming)

Wait for the planner to complete. Find the line starting with `PLANNER_RESULT:` in its output. Parse the JSON after the prefix.

Expected shape:
```json
{"action": "plan", "work_packages": [...]}
```

Write the `work_packages` array into the run entry (merge with existing if resuming — keep packages that are already `"done"`). Increment `global_cycle`. Write state.json.

---

## Step 3 — Spawn Auditor Teams (Parallel)

Collect all work_packages where `status !== "done"` (i.e., `clean_count < 2`).

For **each** active package, spawn one agent using `.claude/skills/audit-harness/agents/auditor.md`.

Pass as context in each agent prompt:
- `goal`: `$ARGUMENTS`
- `work_package`: The full package object (id, area, description, scope_files)
- `mode`: `"audit"`
- `prior_findings`: The package's `findings` array (so auditor avoids re-reporting fixed issues)

**Spawn ALL auditor agents in a SINGLE message** (parallel execution).

Wait for all to complete. For each, find the `AUDITOR_RESULT:` line and parse the JSON.

---

## Step 3b — Spawn Fixer Agents (Parallel)

Collect all packages where the auditor returned `clean === false` (has findings).

For **each** package with findings, spawn one agent using `.claude/skills/audit-harness/agents/fixer.md`.

Pass as context:
- `goal`: `$ARGUMENTS`
- `work_package`: The package object
- `findings`: The findings array from the auditor

**Spawn ALL fixer agents in a SINGLE message** (parallel execution).

Wait for all to complete. Parse each `FIXER_RESULT:` output.

---

## Step 3c — Spawn Verification Auditors (Parallel)

For each package where the fixer applied at least one fix (`applied === true`), spawn one agent using `.claude/skills/audit-harness/agents/auditor.md`.

Pass as context:
- `goal`: `$ARGUMENTS`
- `work_package`: The package object
- `mode`: `"verify"`
- `fixes_applied`: The fixes array from the fixer output

**Spawn ALL verification agents in a SINGLE message** (parallel execution).

Wait for all to complete. Parse each `AUDITOR_RESULT:` output.

---

## Step 4 — Update State from Team Results

For each work_package:

1. Determine final audit result for this cycle:
   - If the package had no findings in Step 3 (auditor `clean === true`) → **clean cycle**
   - If the package had findings, got fixes, and verification auditor returned `clean === true` → **clean cycle**
   - Otherwise → **dirty cycle**

2. Update the package:
   - **Clean cycle**: increment `clean_count` by 1
   - **Dirty cycle**: reset `clean_count` to 0

3. Append new findings to the package's `findings` array with the current cycle number. Mark `fix_applied` and `fix_verified` based on fixer and verification results.

4. If `clean_count >= 2`: set package `status` to `"done"`.

Record a cycle summary in the `cycles` array:
```json
{
  "cycle": <global_cycle>,
  "total_findings": <sum of all findings across packages>,
  "packages_active": <count of non-done packages at start>,
  "packages_clean": <count that had clean cycles>,
  "commit": null
}
```

Write state.json.

---

## Step 5 — Commit if Progress Made

```bash
git diff --stat
```

If there are changes:
```bash
git add -A
git commit -m "audit-harness: {run_id} cycle {global_cycle} — {N} findings fixed"
```

Update the last cycle entry's `commit` field and `checkpoint_commit` in the run. Write state.json.

If there are no changes (all fixers skipped or no findings), skip the commit.

---

## Step 6 — Spawn Planner (Review Phase)

**First, check short-circuit**: If ALL work_packages have `status === "done"`, skip the planner and go directly to **Step 7**.

Otherwise, spawn **one** agent using `.claude/skills/audit-harness/agents/planner.md`.

Pass as context:
- `goal`: `$ARGUMENTS`
- `mode`: `"review"`
- `state`: The full run entry JSON (including updated cycles and work_packages)

Wait for the planner. Parse `PLANNER_RESULT:` JSON.

Handle the result:

**If `action === "done"`**:
- Go to **Step 7**.

**If `action === "continue"`**:
- Apply any `adjustments` from the planner:
  - `{"type": "add", "package": {...}}` → append to work_packages
  - `{"type": "remove", "package_id": "wp-03"}` → remove the package
  - `{"type": "update", "package_id": "wp-02", ...}` → merge updates into the package
- Write state.json
- Go back to **Step 3**

---

## Step 7 — Finalize

Set the run's `status` to `"done"`. Set `updated_at` to current timestamp. Write state.json.

Append a summary to `.state/audit/progress.md`:
```markdown
## [{run_id}] Complete — {timestamp}
- Goal: {goal}
- Cycles: {global_cycle}
- Total findings fixed: {sum across all packages}
- Packages: {count} ({list of areas})
- Final commit: {checkpoint_commit}
```

Print the summary to the user.

---

## Key Constraints

- **Never modify files outside of agent spawning** — the main loop only manages state and git
- **Always commit net-positive changes** — if fixers made things worse, the verification auditor catches it
- **Stall protection**: If `global_cycle >= 10`, set status to `"stalled"` and stop (the planner should catch this earlier, but this is a hard cap)
- **Resume-safe**: Every step reads state.json before acting, so interrupted runs can resume
- **Parallel-safe**: Work packages have non-overlapping `scope_files`, so fixers cannot conflict
