# Bench Fix Continuation

## Status: 94/97 PASS

## 3 Remaining Failures (NOT recommended to fix)

### Cases 67, 91, 95 — STCG/LTCG netting difference
- Engine correctly nets STCG losses against LTCG per Schedule D / QDCGTW
  (using min(line15, line16) = net capital gain)
- Reference calculator ignores STCG and uses LTCG directly (simplified)
- These are "engine is more IRS-accurate" cases
- NOT recommended to fix (would make engine less accurate)

## What Was Fixed (final state)

### fix 1: form8959 SE income base
### fix 2: f1099r IRA early distribution auto-penalty
### fix 3: SALT cap, SE tax, k1 form8960
### fix 4: excess Medicare withholding credit (cases 61 & 82 payments)
- File: `forms/f1040/nodes/intermediate/forms/form8959/index.ts`
- Bug: line24 only credited to 1040 line25c when AMT > 0
- Fix: always credit line24 to line25c when > 0

### fix 5: form_1116 optional fields (case 70)
- File: `forms/f1040/nodes/intermediate/forms/form_1116/index.ts`
- Fix: made required fields optional; full-credit simplified mode when absent

### fix 6: student loan interest phase-out (case 82 AGI)
- Files: `forms/f1040/nodes/config/2025.ts`, `agi_aggregator/index.ts`
- Bug: f1098e applied full $2,500 SLI with no phase-out; AGI was $2,500 too low
- Fix: agi_aggregator computes MAGI (before SLI) and applies linear phase-out
  - Single/HOH: $85k–$100k; MFJ: $175k–$205k; MFS: $0
  - Phase-out uses nonSsaIncome + ssaTaxable - exclusions - deductionsExceptSli

## How to Run

Run a single case:
```
deno run --allow-all taxcalcbench/run_case.ts taxcalcbench/cases/82-single-w2-k1-1099r-1099int-1099div
```

Run full bench:
```
deno task bench
```
