---
name: tax-fix
description: Bug-fix loop for a form:year benchmark (e.g. f1040:2025) or for MeF readiness (`mef`). Clusters failures by root cause, spawns parallel bug-fixer agents, gates each round with the harness, commits engine fixes only, and loops until clean or stalled.
---

# Tax Fix

**Target:** $ARGUMENTS — `{form}:{year}` (default `f1040:2025`) or `mef`.

Read `AGENTS.md` and, if present, `forms/{form}/FORM.md`; pass both to every
agent. Nothing is persisted between runs: each round re-reads the scoreboards.

## 1. Read the failures

- `{form}:{year}`: `bun run bench:cached --form {form} --year {year} --json`
  (replays `bench` when nothing it reads changed). The last
  line is `{ total, pass, fail, failing, failures }`; each failure has
  `lineFailures`, `unsupportedChecks` and `errors`.
- `mef`: `bun run check:mef --json` (`returns`: sample return id → findings;
  `scripts/testing/mef-baseline.json` gives the reason each known one blocks)
  and `bun run check:ats --json` (per ATS scenario: `findings`, `schemaValid`,
  values matched against the packet). A baseline reason that calls a block a
  correct product boundary is not a bug; skip it.

Group failures that share a failing line or finding into one root cause, with
the node or export path that produces it. Causes in the same file go to one
agent.

## 2. Fix

Spawn one agent per group in a single message, using
`.claude/skills/tax-fix/agents/bug-fixer.md`. Fixers change engine code only
(`forms/`, `core/`, `cli/`); a case or packet value that is itself wrong comes
back as a report with its citation.

## 3. Gate

1. `git status --porcelain benchmark/cases` must be empty; otherwise
   `git checkout -- benchmark/cases` and treat those clusters as unfixed.
2. `bun run verify:changed` (structure, oracle, the tests the change reaches,
   and MeF, CLI and bench against the merge base when the CLI loads it).
3. Re-run step 1's scoreboard.

A round is kept when the gates pass, the failure count fell and nothing new
fails. For `mef`, `check:mef` then reports each cleared finding as `FIXED`;
delete it (and an emptied return's entry and reason) from `mef-baseline.json`
by hand, not with `--update`, which resets `approvedBy`.

Keep: stage the changed engine files by name and commit
`fix({form} {year}): <cause> — X→Y passing` (or `fix(mef): <finding>`).
Otherwise: restore those files. Two rounds in a row without a kept change →
stop as stalled.

Loop to step 1 until nothing fails.

## Finish

Report fixed causes, causes left and why, and every case or packet value that
needs a ledger citation (case, line, publication value, citation). Before a
pull request, run the full list in `AGENTS.md`; an expected value changes only
through `benchmark/cases/{form}/{year}/ledger.json`, recorded by a human.
