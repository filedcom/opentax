## [can-you-ensure-all-test-20260411] Complete — 2026-04-11

- **Goal**: Ensure all benchmark test cases have correct inputs/outputs for 2025 tax year 1040
- **Cases Audited**: 133 across 11 work packages
- **Cycles**: 1
- **Total Findings**: 50 (28 fixed, 5 deferred engine bugs, 7 cosmetic skipped)
- **Files Modified**: 28 correct.json / input.json files
- **Commit**: 790370e

### Fixes Applied
- 17 cases: Removed phantom Medicare withholding from total_payments
- Case 31: Fixed HSA double-deduction (Box 12 W)
- Case 106: Added missing $215 ACTC
- Case 76: Applied SALT $10K cap ($2,034 error)
- Case 86: Fixed fed_withheld W-2 sum mismatch ($72.85)
- Case 122: Fixed DOB to match non-senior scenario
- Case 96: Fixed QDCG min-step ($0.09)
- Cases 60, 95, 108, 128: Floating point, missing input, scenario descriptions

### Engine Bugs Deferred to /tax-fix
- CRITICAL: form8962 PTC wrong applicable % table (cases 36, 52, 110)
- MEDIUM: EITC income limits config too low
- MEDIUM: Saver's Credit thresholds use 2024 values
- MEDIUM: OBBB senior deduction not implemented (case 09)
- LOW: PTC repayment caps use prior-year values

## [can-you-ensure-all-test-20260412] Complete — 2026-04-12

- **Goal**: Verify all 133 benchmark cases are IRS-correct for TY2025 via web search and manual calculation
- **Cases Audited**: 133 across 11 work packages
- **Cycles**: 1
- **Benchmark Data Fixes**: 8 correct.json files corrected
- **Engine Bugs Identified**: 8 (deferred to /tax-fix)
- **Pre-existing Engine Failures**: 4 (cases 31, 76, 86, 106)
- **Commit**: c4f1d32

### Benchmark Ground Truth Corrections
- Case 24: EITC $5,692→$5,723 (MFJ phaseout start $30,470 per Rev Proc 2024-40)
- Case 25: SSA taxable $1,945→$2,119 (provisional income must not subtract student loan interest per Pub 915)
- Case 36: PTC $2,169.74→$2,170.24 (internal consistency fix)
- Case 48: line33 $14,001→$14,000 ($1 rounding fix)
- Case 67: add_medicare_tax 0→$94.99 (NIIT display field)
- Case 82: fed_withheld $18,382→$17,590 (reconciled to input W-2+1099 withholding)
- Case 86: inputs.itemized_deductions $45,915→$56,200 (OBBBA $40k SALT cap)
- Case 124: OBBBA senior deduction 2×$6,000 applied (taxable $12,075→$75)

### Engine Bugs Deferred to /tax-fix
- HIGH: Additional Medicare Tax uses box1_wages instead of box5_medicare_wages — cases 54,56,57,65,66,69
- HIGH: EITC phaseout thresholds off by ~$150 — case 24
- HIGH: SSA provisional income wrongly subtracts student loan interest — case 25
- HIGH: OBBBA $6,000/person senior deduction not implemented — cases 09,124
- HIGH: NIIT missing for case 76 (AGI $502k MFJ)
- MEDIUM: Withholding aggregation overcounts — cases 70, 82
- LOW: Case 45 PTC value may be wrong (cannot reproduce from Rev Proc 2025-15)
