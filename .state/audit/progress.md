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
