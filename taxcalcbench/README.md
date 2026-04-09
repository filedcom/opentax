# taxcalcbench

Accuracy benchmark for the `tax` engine — 97 TY2025 scenarios with IRS-authoritative
correct values. Passes when every engine output is within $5 of the correct value for
total tax, refund, and amount owed.

For folder layout and file formats, see [STRUCTURE.md](../docs/architecture/STRUCTURE.md).

## Cases

97 scenarios covering the common return types:

| Range | Filing status | Key features tested |
|-------|--------------|---------------------|
| 01–10 | Single | W-2 only, high income, unemployment, interest, capital gains, Schedule C, student loan, senior, two employers |
| 11–17 | MFJ | Both W-2, children/CTC, unemployment, dividends, Schedule C + QBI, retirement + SSA, excess SS tax |
| 18–20 | HOH | Child/CTC, EITC, dependent care credit |
| 21–31 | Mixed | Additional Medicare Tax, ACTC, LTCG 0% bracket, blind filer, senior + SE income |
| 32–97 | Extended | Schedule C loss, 1099-R, AOTC, marketplace/1095-A, educator expense, estimated tax, EITC no children, 401(k), tips, QBI, K-1, SSA, NIIT, multiple 1099-R |

**Pass criteria:** engine value within $5 of the correct value for:
- `line24_total_tax`
- `line35a_refund`
- `line37_amount_owed`

## How to run

```bash
# Full benchmark
cd taxcalcbench && deno run --allow-read --allow-write --allow-run run_benchmark.ts

# Single case
deno run --allow-read --allow-write --allow-run run_case.ts cases/02-single-w2-basic/

# Regenerate all output.json
deno run --allow-read --allow-write --allow-run run_all.ts
```

## Adding a new case

Use `/tax-cases` (Claude Code skill) to generate IRS-sourced cases automatically, or
create `cases/NN-description/input.json` and `correct.json` manually following the
formats in [STRUCTURE.md](../docs/architecture/STRUCTURE.md).

## 2025 tax parameters

| Parameter | Value |
|-----------|-------|
| Standard deduction — Single / HOH | $15,000 / $22,500 |
| Standard deduction — MFJ | $30,000 |
| Senior/blind add-on — Single/HOH | +$2,000 per factor |
| Senior/blind add-on — MFJ | +$1,600 per factor |
| SS wage base | $176,100 |
| EITC max (0 / 1 / 2 / 3+ children) | $649 / $4,328 / $7,152 / $8,046 |
| CTC per child | $2,000 |
| ACTC rate | 15% of earned income over $2,500, up to $1,700/child |
| LTCG 0% threshold — Single / MFJ | $48,350 / $96,700 |
| QBI deduction | 20% of lesser of (QBI, taxable income before QBI) |
| Additional Medicare Tax | 0.9% on wages/SE over $200k (Single) / $250k (MFJ) |
