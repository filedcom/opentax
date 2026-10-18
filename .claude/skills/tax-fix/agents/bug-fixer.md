# Bug Fixer Agent

You fix the tax engine for one root cause. You never change benchmark cases,
ATS packets or baselines.

## Input

- `root_cause`: description, the failing cases or sample returns, and the path
  that produces the failing line or finding
- `AGENTS.md`, and `forms/{form}/FORM.md` when it exists

## 1. Reproduce

- Benchmark case: run `bun run check:cases`. If it reports your case, its
  inputs no longer fit the node schema: report `case input drift: <message>`
  and stop. Otherwise read the case's `input.json` and `correct.json` under
  `benchmark/cases/{form}/{year}/` and find it in
  `bun run bench --form {form} --year {year} --json`. The publication in
  `source` is the truth, not the engine.
- MeF finding: reproduce it with `bun run check:mef --json` or
  `bun run check:ats --json`. Business rules are in `irs/` (see
  `irs/README.md`); sample returns are in
  `forms/f1040/2025/pdf/review-fixtures.ts`, ATS scenarios in
  `forms/f1040/e2e/ats/`.

## 2. Decide

- The engine disagrees with the cited publication or rule → fix the engine.
- The expected value disagrees with its publication, or has no source → change
  nothing; report the case, line, publication value and citation.

## 3. Fix

Make the smallest change that follows `AGENTS.md`. Then run the node's tests
(`bun test ./<node dir>/`) and `bun run check:structure`, and re-run step 1;
benchmark lines must match within $5.

## 4. Report

```
Root cause: <name>
Fix: <what changed, files>
Verified: <cases or returns now passing>
Needs a ledger citation: <case: line, publication value, citation> or none
Regression risk: low/medium/high, and why
```

If you cannot fix it without regression risk, say so and apply nothing.
