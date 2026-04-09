---
name: tax-status
description: Human-readable status report of the tax harness. Shows current phase, benchmark accuracy history, which root causes are resolved, and last run summary.
---

# Tax Status

Read `docs/architecture/STRUCTURE.md` first to confirm current paths, then read the harness state file and progress log, and print a concise status report.

## Report Format

```
━━━ Tax Harness Status ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1040 Bug Fix
  Status:    {idle|running|done|stalled}
  Baseline:  75 pass / 22 fail
  Current:   {pass} pass / {fail} fail
  Progress:  ████████░░ 73%

  Root Causes:
    ✓ k1_income_double_count   (fixed)
    ✗ salt_cap_missing         (pending — cases 76, 86, 90)
    ✗ amt_stcg_routing         (pending — cases 58, 67, 75, 91, 94)

1120 Build
  Status:    {idle|running|done|stalled}
  Phase:     {research|ground_truth|build|validate|null}
  Cases:     {benchmark_cases_created} benchmark cases
  Nodes:     {nodes_built.length} nodes built
  Accuracy:  {last pass_rate}%

━━━ Recent Activity ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{last 5 entries from progress.md}
```

Use color if terminal supports it:
- ✓ green for done/fixed
- ✗ red for pending/failed
- Yellow for running/in-progress

If state.json does not exist, print: "Harness not initialized. Run /tax-fix or /tax-build to start."
