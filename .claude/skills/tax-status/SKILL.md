---
name: tax-status
description: Human-readable status report for all tax forms. Shows benchmark accuracy, active root causes, and build/fix state for each form:year.
---

# Tax Status

## Step 0 — Discover Forms

Glob `forms/f*/FORM.md` to enumerate all known forms.
Read `.state/bench/state.json`. If it does not exist → print "Harness not initialized." and stop.
Confirm `version === 2`. If `version === 1` → print "State schema outdated. Run migration." and stop.

## Step 1 — Print Report

For each entry in `state.forms`, print one section:

```
━━━ Tax Harness Status ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{form}:{year} Fix
  Status:    {fix.status}
  Baseline:  {fix.benchmark_baseline.pass} pass / {fix.benchmark_baseline.fail} fail
  Progress:  ████████░░ {pct}%
  Root Causes:
    ✓ {name}  (fixed)
    ✗ {name}  (pending — cases {list})

{form}:{year} Build
  Status:    {build.status}
  Phase:     {build.phase}
  Cases:     {build.benchmark_cases_created} benchmark cases
  Nodes:     {build.nodes_built.length} nodes built
  Last run:  {last benchmark_runs entry}

━━━ Recent Activity ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{last 5 entries from .state/bench/progress.md}
```

Use color: green for done/fixed, red for pending/failed, yellow for running.
