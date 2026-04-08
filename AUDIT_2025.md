# TY2025 Tax Engine Audit Report

**Date:** 2026-04-08  
**Scope:** All calculation nodes — end-to-end correctness for tax year 2025  
**Reference:** IRS Rev. Proc. 2024-40; P.L. 119-21 (OBBBA); IRC as amended  
**Auditor:** Automated node-by-node review

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ PASS | Calculation matches IRS rules |
| ⚠️ WARN | Minor issue or edge case gap |
| ❌ FAIL | Incorrect calculation / wrong constant |
| 🔍 NOTE | Informational / design observation |

---

## Sections

1. [Tax Constants (config/2025.ts)](#1-tax-constants)
2. [Output Nodes](#2-output-nodes)
3. [Intermediate — Income Tax Calculation & Deductions](#3-income-tax--deductions)
4. [Intermediate — Aggregation (AGI, Schedules 2/3, B, D)](#4-aggregation-nodes)
5. [Intermediate — SE Tax, Schedule H, F](#5-employment--farming)
6. [Intermediate — HSA, IRA, Retirement](#6-hsa-ira-retirement)
7. [Intermediate — Credits (EITC, CTC/ACTC, Child Care, Saver's)](#7-credits)
8. [Intermediate — ACA / Form 8962](#8-aca--form-8962)
9. [Intermediate — AMT, NIIT, Additional Medicare Tax](#9-amt--surtaxes)
10. [Intermediate — Capital Gains (8949, QDCGTW, Worksheets)](#10-capital-gains)
11. [Intermediate — QBI (8995/8995A)](#11-qbi-deduction)
12. [Intermediate — Passive Activity, At-Risk (8582, 6198)](#12-passive-activity--at-risk)
13. [Intermediate — Foreign Income (2555, 1116)](#13-foreign-income)
14. [Intermediate — Business & Depreciation (4562, 4797, 8829, 8990)](#14-business--depreciation)
15. [Intermediate — Specialty Forms](#15-specialty-forms)
16. [Input Nodes](#16-input-nodes)
17. [Summary & Priority Fixes](#17-summary--priority-fixes)

---

<!-- AUDIT SECTIONS APPENDED BELOW BY AUTOMATED REVIEW AGENTS -->

## 1. Tax Constants (config/2025.ts)

### Tax Brackets

- ✅ BRACKETS_MFJ_2025: All 7 brackets correct per Rev. Proc. 2024-40 ss3.01. Boundary values ($23,850 / $96,950 / $206,700 / $394,600 / $501,050 / $751,600) match IRS table. All base amounts verified by accumulation.
- ✅ BRACKETS_SINGLE_2025: All 7 brackets correct. Boundaries ($11,925 / $48,475 / $103,350 / $197,300 / $250,525 / $626,350) match IRS. Base amounts internally consistent.
- ✅ BRACKETS_HOH_2025: All 7 brackets correct. Boundaries ($17,000 / $64,850 / $103,350 / $197,300 / $250,500 / $626,350) match IRS. Base amounts internally consistent.
- ✅ BRACKETS_MFS_2025: All 7 brackets correct. Boundaries mirror Single through 32% bracket; 37% split at $375,800 = $751,600/2. Base amounts internally consistent.
- ✅ MFJ/MFS symmetry: MFS 37% threshold ($375,800) = MFJ 37% threshold ($751,600) / 2. Correct per IRC ss1(d).
- ✅ MFJ/Single asymmetry at top bracket: MFJ 37% boundary ($751,600) vs Single ($626,350) x 2 = $1,252,700 — intentional and correct per Rev. Proc. 2024-40.

### Standard Deduction

- ✅ STANDARD_DEDUCTION_BASE_2025 Single: $15,750. Rev. Proc. 2024-40 pre-OBBBA $15,000 + OBBBA ss70001 $750 = $15,750. Correct.
- ✅ STANDARD_DEDUCTION_BASE_2025 MFJ/QSS: $31,500. Pre-OBBBA $30,000 + OBBBA $1,500 = $31,500. Correct.
- ✅ STANDARD_DEDUCTION_BASE_2025 HOH: $23,625. Pre-OBBBA $22,500 + OBBBA $1,125 = $23,625. Correct.
- ✅ STANDARD_DEDUCTION_BASE_2025 MFS: $15,750. Matches Single per IRC ss63(c). Correct.
- ✅ STANDARD_DEDUCTION_ADDITIONAL_2025 Single/HOH: $2,000 per age/blindness factor. OBBBA ss70001 increased from $1,950. Correct.
- ✅ STANDARD_DEDUCTION_ADDITIONAL_2025 MFJ/MFS/QSS: $1,600 per factor. OBBBA ss70001 increased from $1,550. Correct.

### QDCGT / Capital Gains Rate Thresholds

- ✅ QDCGT_ZERO_CEILING_2025: Single $48,350; MFJ $96,700; MFS $48,350; HOH $64,750; QSS $96,700. All match Rev. Proc. 2024-40 ss3.02.
- ✅ QDCGT_TWENTY_FLOOR_2025: Single $533,400; MFJ $600,050; MFS $300,025; HOH $566,700; QSS $600,050. All match Rev. Proc. 2024-40 ss3.02.

### AMT

- ✅ AMT_EXEMPTION_2025: Single/HOH $88,100; MFJ/QSS $137,000; MFS $68,500. All match Rev. Proc. 2024-40 ss3.05 (IRC ss55(d)).
- ✅ AMT_PHASE_OUT_START_2025: Single/HOH/MFS $626,350; MFJ/QSS $1,252,700. Match Rev. Proc. 2024-40 ss3.05.
- ✅ AMT_BRACKET_26_THRESHOLD_STANDARD_2025: $239,100. Matches IRS Form 6251 (2025) line 7 instructions.
- ✅ AMT_BRACKET_26_THRESHOLD_MFS_2025: $119,550 = $239,100 / 2. Correct per IRC ss55(b)(1).
- ✅ AMT_BRACKET_ADJUSTMENT_STANDARD_2025: $4,782 = $239,100 x 0.02. Arithmetic verified.
- ✅ AMT_BRACKET_ADJUSTMENT_MFS_2025: $2,391 = $119,550 x 0.02. Arithmetic verified.

### FICA / Social Security

- ✅ SS_WAGE_BASE_2025: $176,100. Matches SSA announcement and Rev. Proc. 2024-40 ss3.28.
- ✅ SS_MAX_TAX_PER_EMPLOYER_2025: $10,918.20 = $176,100 x 0.062. Arithmetic verified.

### Additional Medicare Tax / NIIT

- ✅ ADDITIONAL_MEDICARE_THRESHOLD_MFJ: $250,000. Statutory, IRC ss3101(b)(2), not indexed.
- ✅ ADDITIONAL_MEDICARE_THRESHOLD_MFS: $125,000. Statutory.
- ✅ ADDITIONAL_MEDICARE_THRESHOLD_OTHER: $200,000. Statutory.
- ✅ NIIT_THRESHOLD_MFJ / MFS / OTHER: Mirror Medicare thresholds correctly per IRC ss1411.

### HSA Limits

- ✅ HSA_SELF_ONLY_LIMIT_2025: $4,300. Matches Rev. Proc. 2024-25.
- ✅ HSA_FAMILY_LIMIT_2025: $8,550. Matches Rev. Proc. 2024-25.
- ✅ HSA_CATCHUP_2025: $1,000. Statutory per IRC ss223(b)(3), not indexed.

### IRA Contribution Limits

- ✅ IRA_CONTRIBUTION_LIMIT_2025: $7,000. Correct per IRC ss219(b)(5)(A); not increased for 2025.
- ✅ IRA_CONTRIBUTION_LIMIT_AGE50_2025: $8,000. Correct ($7,000 + $1,000 catch-up).
- ✅ IRA_PHASEOUT_SINGLE_LOWER/UPPER_2025: $79,000 / $89,000. Matches Rev. Proc. 2024-40 ss3.19.
- ✅ IRA_PHASEOUT_MFJ_LOWER/UPPER_2025: $126,000 / $146,000. Matches Rev. Proc. 2024-40 ss3.19.
- ✅ IRA_PHASEOUT_NONCOVERED_MFJ_LOWER/UPPER_2025: $236,000 / $246,000. Matches Rev. Proc. 2024-40 ss3.19.
- ✅ IRA_PHASEOUT_MFS_LOWER/UPPER_2025: $0 / $10,000. Correct per IRC ss219(g)(3)(B)(ii).

### EITC

- ✅ EITC_MAX_CREDIT_2025: 0c=$649, 1c=$4,328, 2c=$7,152, 3c=$8,046. All match Rev. Proc. 2024-40 ss3.11.
- ✅ EITC_PHASE_IN_END_2025: 0c=$8,490, 1c=$12,730, 2c=$17,880, 3c=$17,880. Match Rev. Proc. 2024-40.
- ✅ EITC_PHASEOUT_START_2025: 0c=[10,620 / 17,850]; 1-3c=[23,511 / 30,323]. Match Rev. Proc. 2024-40 ss3.11.
- ✅ EITC_INCOME_LIMIT_2025: 0c=[18,591 / 25,511]; 1c=[49,084 / 56,004]; 2c=[55,768 / 62,688]; 3c=[59,899 / 66,819]. All match Rev. Proc. 2024-40.
- ✅ EITC_INVESTMENT_INCOME_LIMIT_2025: $11,950. Matches Rev. Proc. 2024-40 ss3.11.

### CTC / ACTC (OBBBA)

- ✅ CTC_PER_CHILD_2025: $2,200. Matches OBBBA ss70003 (increased from $2,000).
- ✅ ODC_PER_DEPENDENT_2025: $500. Unchanged by OBBBA; matches IRC ss24(h)(4).
- ✅ ACTC_MAX_PER_CHILD_2025: $1,700. Matches OBBBA ss70003.
- ✅ CTC_PHASE_OUT_THRESHOLD_MFJ_2025: $400,000. Correct per IRC ss24(b)(2)(A); not inflation-adjusted.
- ✅ CTC_PHASE_OUT_THRESHOLD_OTHER_2025: $200,000. Correct per IRC ss24(b)(2)(B).
- ✅ ACTC_EARNED_INCOME_FLOOR_2025: $2,500. Correct per IRC ss24(d)(1)(B)(i).

### SALT Cap

- ✅ SALT_CAP_2025: $40,000. Matches OBBBA ss70002 (increased from $10,000).
- ⚠️ Missing SALT_CAP_MFS_2025: The inline comment notes MFS = $20,000 (half of $40,000 per IRC ss164(b)(6)), but no separate exported constant is defined. Downstream code must hard-code the halving. Recommend adding `export const SALT_CAP_MFS_2025 = 20_000`.

### QBI Thresholds

- ✅ QBI_THRESHOLD_SINGLE_2025: $197,300. Matches Rev. Proc. 2024-40 ss3.24.
- ✅ QBI_THRESHOLD_MFJ_2025: $394,600. Matches Rev. Proc. 2024-40 ss3.24 (exactly 2x single).
- ✅ QBI_PHASE_IN_RANGE_2025: $100,000. Statutory per IRC ss199A(b)(3)(B)(ii).

### FEIE

- ✅ FEIE_LIMIT_2025: $130,000. Matches Rev. Proc. 2024-40 ss3.04.
- ✅ FEIE_HOUSING_BASE_2025: $20,800 = 16% x $130,000. Arithmetic correct per IRC ss911(c)(1)(B).

### Section 179 (OBBBA)

- ✅ SECTION_179_LIMIT_2025: $2,500,000. Matches OBBBA ss130001.
- ✅ SECTION_179_PHASEOUT_THRESHOLD_2025: $4,000,000. Matches OBBBA ss130001.

### Luxury Auto Depreciation

- ⚠️ LUXURY_AUTO_YEAR1_NO_BONUS_2025 ($12,200), YEAR1_WITH_BONUS ($20,200), YEAR2 ($19,600), YEAR3_PLUS ($11,900): Values are plausible for TY2025 (TY2024 equivalents per Rev. Proc. 2024-21 were $12,400 / $20,400 / $19,800 / $11,900). However, the file does not cite the specific Rev. Proc. authority for these TY2025 amounts. Confirm against official TY2025 Rev. Proc. and add citation.

### Schedule H

- ✅ HOUSEHOLD_FICA_THRESHOLD_2025: $2,800. Matches IRS Publication 926 (2025).
- ✅ HOUSEHOLD_FUTA_QUARTERLY_THRESHOLD: $1,000. Statutory, not indexed. Correct.

### Saver's Credit

- ✅ SAVERS_CREDIT_CONTRIBUTION_CAP_2025: $2,000. Correct per IRC ss25B(b)(1); not inflation-adjusted.
- ✅ SAVERS_CREDIT_AGI_SINGLE_2025: [23,000 / 25,000 / 38,250]. Matches Rev. Proc. 2024-40 ss3.43.
- ✅ SAVERS_CREDIT_AGI_HOH_2025: [34,500 / 37,500 / 57,375]. Matches Rev. Proc. 2024-40 ss3.43.
- ✅ SAVERS_CREDIT_AGI_MFJ_2025: [46,000 / 50,000 / 76,500]. Matches Rev. Proc. 2024-40 ss3.43.

### EE/I Bond Interest Exclusion (Form 8815)

- ✅ SAVINGS_BOND_PHASEOUT_START/END_MFJ_2025: $145,200 / $175,200. Matches Rev. Proc. 2024-40 ss3.23.
- ✅ SAVINGS_BOND_PHASEOUT_START/END_SINGLE_2025: $96,800 / $111,800. Matches Rev. Proc. 2024-40 ss3.23.

### Kiddie Tax

- ✅ KIDDIE_TAX_UNEARNED_INCOME_THRESHOLD_2025: $2,600. Matches Rev. Proc. 2024-40 ss3.10.
- ✅ KIDDIE_TAX_STANDARD_DEDUCTION_FLOOR_2025: $1,300 = threshold / 2. Matches Rev. Proc. 2024-40 ss3.10.

### ACA / Form 8962

- ✅ FPL_BASE_2025: $15,060. Correct — IRS uses prior-year (2024) HHS FPL tables for TY2025 PTC.
- ✅ FPL_INCREMENT_2025: $5,380. Correct per 2024 HHS FPL (48 contiguous states + D.C.).

### QCD

- ✅ QCD_ANNUAL_LIMIT_2025: $108,000. Matches Rev. Proc. 2024-40 (IRC ss408(d)(8)(B) indexed amount).
- ✅ PSO_EXCLUSION_LIMIT_2025: $3,000. Statutory per IRC ss72(t)(10); not indexed.

### Excess Business Loss

- ✅ EBL_THRESHOLD_SINGLE_2025: $313,000. Matches Rev. Proc. 2024-40 ss3.30.
- ✅ EBL_THRESHOLD_MFJ_2025: $626,000. Matches Rev. Proc. 2024-40 ss3.30 (= 2 x single).

### Section 163(j) / Small Business Gross Receipts

- ✅ SMALL_BIZ_GROSS_RECEIPTS_2025: $31,000,000. Matches Rev. Proc. 2024-40 ss3.03 (3-year average gross receipts test, IRC ss163(j)(3)).

### Retirement Plan Limits

- ✅ RETIREMENT_LIMITS_2025 401(k)/403(b)/457(b): base $23,500 (age 49 and under); $31,000 (age 50-59 catch-up); $34,750 (age 60-63 SECURE 2.0 super catch-up); $31,000 (age 64+). Matches Rev. Proc. 2024-40 / SECURE 2.0 ss109.
- ✅ RETIREMENT_LIMITS_2025 SIMPLE IRA: base $16,500; $20,000 (50-59); $21,750 (60-63 super catch-up); $20,000 (64+). Matches Rev. Proc. 2024-40.

### Dependent Care (Form 2441)

- ✅ DEP_CARE_EXPENSE_CAP_ONE_2025: $3,000. Statutory, IRC ss21(c)(1); not indexed.
- ✅ DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025: $6,000. Statutory, IRC ss21(c)(2).
- ✅ DEP_CARE_EMPLOYER_EXCLUSION_2025: $5,000. Statutory, IRC ss129(a)(2).
- ✅ DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025: $2,500. Statutory, IRC ss129(a)(2)(B).
- ✅ DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025: $15,000. Statutory, IRC ss21(a)(2); not indexed.
- ✅ DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025: $2,000. Statutory, IRC ss21(a)(2).

### LTC / Archer MSA

- ✅ LTC_PER_DIEM_DAILY_LIMIT_2025: $420. Matches Rev. Proc. 2024-40 ss3.35.
- ✅ LTC_PREMIUM_LIMITS_2025: [age 40=$480, 50=$900, 60=$1,800, 70=$4,770, 71+=$5,970]. All match Rev. Proc. 2024-40 ss3.34.

### Form 4972 / Lump Sum Distributions

- ✅ MDA_MAX_2025: $10,000. Statutory floor, IRC ss402(e)(1)(B)(i).
- ✅ MDA_PHASE_OUT_THRESHOLD_2025: $20,000. Correct per IRC ss402(e)(1).
- ✅ MDA_ZERO_THRESHOLD_2025: $70,000. Correct per IRC ss402(e)(1).
- ✅ DEATH_BENEFIT_MAX_2025: $5,000. Statutory, IRC ss101(b)(2)(A).

### Form 982 / QPRI

- ✅ QPRI_CAP_STANDARD_2025: $750,000. Matches IRC ss108(a)(1)(E) as amended by TCJA (OBBBA did not change this).
- ✅ QPRI_CAP_MFS_2025: $375,000 = standard / 2. Correct.

### SEP / SIMPLE / Solo 401(k)

- ✅ SEP_CONTRIBUTION_RATE_2025: 0.25. Correct statutory rate, IRC ss408(k).
- ✅ SEP_MAX_CONTRIBUTION_2025: $70,000. Matches Rev. Proc. 2024-40 ss3.20.
- ✅ SIMPLE_EMPLOYER_MATCH_RATE_2025: 0.03. Correct statutory rate, IRC ss408(p)(2)(A)(iii).

### Miscellaneous / Routing Thresholds

- ✅ SCHEDULE_B_DIVIDEND_THRESHOLD: $1,500. Statutory, IRC ss6012(a); not indexed.
- ✅ FOREIGN_TAX_SINGLE/MFJ_THRESHOLD: $300 / $600. Statutory per Form 1116 simplified method instructions.
- ✅ SEC199A_SINGLE/MFJ_THRESHOLD_2025: $197,300 / $394,600. Match QBI thresholds; correct.
- ✅ MCC_MAX_CREDIT_HIGH_RATE_2025: $2,000. Correct per IRC ss25(a)(1).
- ✅ F2106_PERFORMING_ARTIST_AGI_LIMIT: $16,000. Statutory, IRC ss62(b)(1)(C); not indexed.

---

**Section verdict:** ⚠️ WARN

**Issues found:**
1. ⚠️ Missing SALT_CAP_MFS_2025 = 20_000: The $20,000 MFS SALT cap is noted only in a comment on SALT_CAP_2025. No exported constant exists. Any consuming code must hard-code the halving — a maintenance risk.
2. ⚠️ Luxury auto limits uncited: LUXURY_AUTO_YEAR1_NO_BONUS_2025 through YEAR3_PLUS carry no specific Rev. Proc. citation. Values are directionally plausible but must be confirmed against the official TY2025 Rev. Proc.

All other constants are correct: rates, bracket boundaries, base amounts, and all OBBBA-updated figures (CTC $2,200, ACTC $1,700, SALT $40,000, Sec 179 $2.5M/$4M, standard deduction increases, additional standard deduction increases) match Rev. Proc. 2024-40, OBBBA P.L. 119-21, and the relevant IRC sections.

---

## 2. Output Nodes

### f1040 Output

- ✅ Line 1a wages: Passed through and included in `totalWages()`. All sub-lines 1a–1h summed correctly. Line 1i (combat pay) correctly excluded from `totalWages()` — it is an election field, not additive income.
- ✅ Line 2b taxable interest: Passed through as-is; single-feeder field, no accumulation needed.
- ✅ Line 3b ordinary dividends: Passed through correctly.
- ✅ Line 3a qualified dividends: Declared `accumulable`; `sumField()` correctly merges arrays from multiple upstream feeders (e.g. f1099div + k1_partnership). Emitted only when > 0.
- ✅ Line 4b IRA distributions (taxable): Passed through; upstream node (1099-R) computes taxable portion.
- ✅ Line 5b pensions/annuities (taxable): Passed through correctly.
- ✅ Line 6b Social Security (taxable): Passed through as-is. The 0%/50%/85% threshold logic is correctly delegated to the upstream SS node — the output node is not responsible for computing it. Schema correctly uses `nonnegative()`.
- ⚠️ Line 7 capital gain/loss: `line7_capital_gain` passed through and included in `totalIncome()`. However, `line7a_cap_gain_distrib` (capital gain distributions, no Schedule D) is included in `totalIncome()` computation but is **never emitted** as a named field in `assembleReturn()`. Downstream consumers reading the return fields will not see this value.
- ✅ Line 8 additional income from Schedule 1: Passed through and summed into `totalIncome()`.
- ✅ Line 9 total income: `totalIncome()` correctly sums 1z + 2b + 3b + 4b + 5b + 6b + 7 + 7a + 8. Line 3a qualified dividends correctly excluded (subset of 3b, not additive). Emitted in result.
- ⚠️ Line 10 adjustments: Used in AGI computation (`line9 - line10`) but **not emitted** as a named field in `assembleReturn()`. Downstream cannot read the adjustments total from the assembled return.
- ⚠️ Line 11 AGI: Computed as `Math.max(0, line9 - line10)`. The floor of 0 is incorrect — AGI can be negative in large NOL scenarios (e.g., Schedule C loss exceeding all income). Flooring at zero would overstate AGI and understate loss carryforward context. Emitted correctly.
- ✅ Line 12a standard deduction: Passed through. `deductionAmount()` correctly prefers itemized (12e) over standard (12a) when 12e is present.
- ✅ Line 13 QBI deduction: Passed through when present.
- ❌ Line 14 deductions+QBI total: Schema defines `line14_deductions_qbi_total` but `assembleReturn()` **never computes or emits it**. The value is computed inline inside `taxableIncome()` but not surfaced as `line14` in the output object. Official Form 1040 line 14 must appear on the return.
- ✅ Line 15 taxable income: `Math.max(0, agi - deduction - qbi)` — correct floor at zero per IRS instructions. Emitted.
- ✅ Line 16 income tax: Passed through when present.
- ✅ Line 17 AMT (additional taxes): Passed through when present.
- ✅ Line 18 total tax before credits: `line16 + line17` — correct. Emitted.
- ✅ Line 19 child tax credit / credit for other dependents: Passed through and emitted.
- ⚠️ Line 20 Schedule 3 Part I credits: Included in `creditsTotal()` and thus in `line21` computation, but **not emitted** as a named field in `assembleReturn()`. The individual nonrefundable credit amount is lost from the output object.
- ✅ Line 21 total credits (19 + 20): `creditsTotal()` = line19 + line20. Correct formula. Emitted.
- ✅ Line 22 tax after credits: `Math.max(0, line18 - line21)` — correct floor. Emitted.
- ⚠️ Line 23 other taxes from Schedule 2: Used in `totalTax()` but **not emitted** in `assembleReturn()`. The Schedule 2 Part II component is invisible in the final return fields.
- ✅ Line 24 total tax: `line22 + line23` — correct. Emitted.
- ✅ Line 25 federal tax withheld: `totalWithholding()` = 25a + sumField(25b) + 25c. `line25b_withheld_1099` correctly declared `accumulable` for multiple 1099 feeders. 25a and 25b emitted; `line25c` not emitted (minor gap).
- ⚠️ Line 26 estimated tax payments: Included in `totalPayments()` but **not emitted** as a named field in `assembleReturn()`.
- ✅ Line 27 EITC: Passed through and emitted when present.
- ✅ Line 28 ACTC: Passed through and emitted when present.
- ✅ Line 29 American Opportunity Credit (refundable portion): Passed through and emitted when present.
- ⚠️ Line 30 refundable adoption credit: Included in `refundableCreditsTotal()` but **not emitted** in `assembleReturn()`. The audit trail for this credit is lost.
- ⚠️ Line 31 Schedule 3 Part II credits: Included in `refundableCreditsTotal()` but **not emitted** in `assembleReturn()`.
- ⚠️ Line 32 total other payments (27–31): `refundableCreditsTotal()` computes this value but it is **never stored or emitted** as `line32_refundable_credits_total`. The subtotal is invisible in the final return.
- ✅ Line 33 total payments: `totalWithholding() + line26 + refundableCreditsTotal()`. Correct formula. Emitted.
- ❌ Line 34 overpayment: Schema field `line34_total_payments` has a **wrong name** — the comment says "Refund amount owed to taxpayer" which describes line 34 (overpayment), but the field name says `total_payments` (which is line 33). This field is also never written in `assembleReturn()`. The refund is written to `line35a_refund` instead, skipping line 34 entirely. Per IRS Form 1040, line 34 is the overpayment (line 33 − line 24) and line 35a is the portion of that to be refunded. Both should be emitted.
- ✅ Line 37 amount owed: `Math.abs(balance)` when `balance < 0` — correct. Emitted conditionally.

### Schedule 1 Output

- ✅ Part I line totals: `totalAdditionalIncome()` correctly sums lines 1, 2a, 3, 4, 5, 6, 7, and the `otherIncome()` sub-total. Emitted as `line10_total_additional_income`.
- ✅ Part II line totals: `totalAdjustments()` correctly sums lines 11–24h. Emitted as `line26_total_adjustments`.
- ✅ Sign handling for exclusions: NOL (8a), savings bond exclusion (8b), FEIE (8d), and foreign housing deduction (8d) are correctly negated in `otherIncome()` to reduce income.
- ✅ EBL add-back sign: `line8p_excess_business_loss` correctly treated as positive (increases income), matching IRC §461(l) add-back semantics.
- ⚠️ Line 8d naming collision: Both `line8d_foreign_earned_income_exclusion` and `line8d_foreign_housing_deduction` share the `8d` prefix. Per IRS Schedule 1 (2025) instructions, FEIE is line 8d but the foreign housing deduction is a separate entry. Using identical prefixes makes the schema misleading. The housing deduction should be `line8e_foreign_housing_deduction` or a distinct sub-key.
- ⚠️ Line 13 naming collision: Both `line13_hsa_deduction` and `line13_depreciation` share the `line13` prefix. HSA deduction is correctly Schedule 1 Part II line 13. Depreciation adjustment (Form 4562) does not appear on Schedule 1 line 13 — it flows through Schedule C/E. This field is misnamed and its routing may be incorrect.
- ⚠️ `line17_schedule_e` naming conflict: This field holds passive loss allowed (Form 8582) and is summed into Part I additional income alongside the main `line5_schedule_e`. Schedule 1 Part II also has a `line17` (self-employed health insurance). The `line17_schedule_e` naming creates ambiguity between Part I and Part II line 17 semantics.
- ⚠️ `line18_early_withdrawal` allows negative values: Typed as `z.number().optional()` without `nonnegative()`. Early withdrawal penalty (Schedule 1 Part II line 18) is always a positive deduction. A negative value would silently reduce adjustments, understating AGI.
- ✅ Add-back fields (`at_risk_disallowed_add_back`, `biz_interest_disallowed_add_back`, `basis_disallowed_add_back`): Correctly included in `otherIncome()` as positive income additions, reflecting disallowance rules that increase taxable income.
- ✅ Pass-through fields: All major Part I and Part II lines that are passed through to the output object are correctly conditioned on `!== undefined`.
- 🔍 NOTE: `line24h_dpad` (DPAD) is correctly annotated as legacy TY2017 and prior. Its inclusion is appropriate for amended returns but should not be populated for TY2025 original filings. No guard against erroneous population in current year.

**Section verdict:** ⚠️ WARN

**Critical issues:** Line 14 not emitted (❌), Line 34 field naming wrong and not emitted (❌).
**Significant gaps:** Lines 10, 20, 23, 26, 30, 31, 32 computed but not emitted — consumers cannot read these values from the assembled return. Line 7a capital gain distributions computed but not emitted.
**Schema issues (Schedule 1):** Line 8d naming collision, line 13 naming collision, line 17 ambiguity, line 18 missing `nonnegative()` constraint.

## 3. Intermediate — Income Tax Calculation & Deductions

### income_tax_calculation

- ✅ **Bracket lookup logic** — `taxFromBrackets` reverses the bracket array, finds the highest `over` threshold income exceeds, then applies `bracket.base + (income - bracket.over) * bracket.rate`. Pre-computed base amounts are used correctly. Spot-checked: Single 22% bracket base $5,578.50 = $1,192.50 + ($48,475 − $11,925) × 0.12 ✓; MFJ 22% base $11,157 = $2,385 + ($96,950 − $23,850) × 0.12 ✓. All five filing status bracket tables present.
- ✅ **QSS treated as MFJ** — `bracketsForStatus` returns `yearBrackets.mfj` for both `FilingStatus.MFJ` and `FilingStatus.QSS`, per IRC §1(a).
- ✅ **QDCGT worksheet — pref_income** — `min(qualDividends + netCapGain, taxableIncome)` matches spec.
- ✅ **QDCGT worksheet — ordinary** — `taxableIncome - prefIncome` matches spec.
- ✅ **QDCGT worksheet — in_zero** — `max(0, min(taxableIncome, zeroCeiling) - ordinary)` matches spec exactly.
- ✅ **QDCGT worksheet — remaining** — `prefIncome - inZero` matches spec.
- ✅ **QDCGT worksheet — avail_15** — `max(0, twentyFloor - max(ordinary, zeroCeiling))` matches spec.
- ✅ **QDCGT worksheet — in_fifteen / in_twenty** — `min(remaining, availFifteen)` and `remaining - inFifteen` match spec.
- ✅ **QDCGT worksheet — tax assembly** — `ordinaryTax + 15% × inFifteen + 20% × inTwenty` correct.
- ✅ **QDCGT result always taken (no min with regular)** — The code takes the QDCGT result directly without `min(regular_tax, worksheet_tax)`. This is correct: the worksheet is mathematically guaranteed to produce tax ≤ regular bracket tax because preferential income is taxed at 0%/15%/20% while ordinary income receives identical bracket treatment in both paths. The code comment accurately documents this invariant.
- ✅ **form6251 receives pre-QDCGT regular tax** — `regularTax` (not `tax`) is fed to form6251 as `regular_tax`, correct for AMT base computation.
- ✅ **f8812 receives post-QDCGT income tax liability** — `auto_income_tax_liability: tax` correctly reflects the actual line 16 liability used for the ACTC nonrefundable limit.
- ✅ **Zero taxable income early return** — Returns only the f8812 zero-liability signal; skips f1040 line16 and form6251. Safe because f1040 declares `line16_income_tax` as `optional()` and defaults to 0 via `?? 0` in its tax computation.
- ✅ **QDCGT thresholds (TY2025)** — Zero ceilings: Single $48,350, MFJ $96,700, HOH $64,750, MFS $48,350, QSS $96,700. Twenty floors: Single $533,400, MFJ $600,050, HOH $566,700, MFS $300,025, QSS $600,050. All match Rev. Proc. 2024-40 §3.02.

### standard_deduction

- ✅ **TY2025 base deductions** — Single=$15,750, MFJ=$31,500, MFS=$15,750, HOH=$23,625, QSS=$31,500. Matches Rev. Proc. 2024-40 §3.14 post-OBBBA values.
- ✅ **Additional per factor (TY2025)** — Single/HOH=$2,000; MFJ/MFS/QSS=$1,600. Config constants correct per Rev. Proc. 2024-40 §3.14 as amended by OBBBA.
- ⚠️ **Stale comment in `additionalFactorCount`** — The inline comment at line 58 of `standard_deduction/index.ts` reads `"Each factor is $1,350 (MFJ/MFS/QSS) or $1,600 (Single/HOH)"`. The $1,350 figure is the TY2024 amount; TY2025 post-OBBBA is $1,600 for MFJ/MFS/QSS. The config constant (`STANDARD_DEDUCTION_ADDITIONAL_2025`) is correct at $1,600, but the stale comment will mislead future reviewers. Should read `$1,600 (MFJ/MFS/QSS)`.
- ✅ **IRC §63(c)(6)(A) — MFS spouse itemizing enforced** — `if (input.mfs_spouse_itemizing === true)` returns `{ deduction: itemized, takingStandard: false }` unconditionally, forcing itemization even when `itemized_deductions` is zero.
- ✅ **Itemized vs standard comparison** — `if (itemized > standardAmount)` takes itemized; otherwise takes standard. Correctly selects the greater of the two.
- ✅ **Itemized path — f1040 line 12e** — `standard_deduction` correctly does not emit `line12e_itemized_deductions` for the itemizing path. That signal is emitted directly by `schedule_a` to f1040 (confirmed: `schedule_a/index.ts` line 90). No gap in the architecture.
- ✅ **QBI deduction applied after standard/itemized deduction** — `preQbiTaxable = max(0, agi - deduction)`, then `taxableIncome = max(0, preQbiTaxable - qbi)`. Double-floor prevents negative taxable income at each stage.
- ✅ **Taxable income formula** — Equivalent to `max(0, agi - deduction - qbi_deduction)`. Correct.
- ✅ **Spouse age/blindness factors gated to MFJ/MFS/QSS** — `SPOUSE_STATUSES = {MFJ, MFS, QSS}` guards spouse factor counting. Single and HOH filers correctly cannot claim spouse factors.
- ✅ **QSS standard deduction equals MFJ** — QSS base $31,500 and additional factor $1,600 match MFJ values, consistent with QSS being the surviving spouse equivalent under IRC §2(a).

**Section verdict:** ⚠️ WARN — one stale comment in `standard_deduction/index.ts` line 58 (`$1,350` should read `$1,600` for MFJ/MFS/QSS in TY2025). All calculations and constants are correct.

---

## 9. Intermediate — AMT & Surtaxes


### Form 6251 (AMT)

**AMTI Computation (Lines 1–4)**

- ✅ Base income: `regular_tax_income` represents Form 1040 Line 15 (taxable income after standard/itemized deduction). No separate standard deduction addback field needed — starting from Line 15 is correct per Form 6251 Line 1 instructions.
- ✅ Line 2a — State/local tax addback: `line2a_taxes_paid` correctly adds back SALT deducted on Schedule A (IRC §56(b)(1)(A)(ii)). `nonnegative()` constraint correct.
- ✅ Line 2f — ATNOL: `nol_adjustment` typed as `z.number().optional()` (signed), schema comment instructs entry as negative. Correctly summed into AMTI; negative value reduces AMTI as required by IRC §56(d).
- ⚠️ Line 2f — ATNOL 90% cap not enforced: IRC §56(d)(1)(A) limits the ATNOL deduction to 90% of AMTI before the ATNOLD. The node applies `nol_adjustment` without enforcing this cap. Callers must apply the limit externally; no schema or runtime guard exists.
- ✅ Line 2g — Private activity bond interest: `private_activity_bond_interest` correctly adds tax-exempt PAB interest as an AMTI preference item (IRC §57(a)(5)). `nonnegative()` constraint correct.
- ⚠️ Line 2g — Duplicate PAB field double-count risk: Both `private_activity_bond_interest` and `line2g_pab_interest` are declared as aliases for Line 2g and are **summed together** in `computeAmti()`. If a caller populates both (e.g., f1099int feeds `line2g_pab_interest` while another upstream path feeds `private_activity_bond_interest`), the same interest is counted twice. Should be merged into one field or validated mutually exclusive.
- ✅ Line 2h — QSBS adjustment: `qsbs_adjustment` correctly adds back 7% of excluded §1202 gain (IRC §57(a)(7)). `nonnegative()` constraint correct.
- ✅ Line 2i — ISO exercise spread: `iso_adjustment` signed field correctly captures FMV-minus-exercise-price preference item (IRC §56(b)(3)).
- ✅ Line 2l — Depreciation adjustment: `depreciation_adjustment` signed field (positive when AMT depreciation > regular; negative when regular > AMT), consistent with IRC §56(a)(1).
- ✅ `other_adjustments` — Catch-all for remaining adjustments/preference items (lines 2b–2e, 2j–2k, 2m–2t, 3): Signed field. Percentage depletion excess (IRC §57(a)(1)) and investment interest addback (IRC §56(b)(1)(C)) are bundled here — not separately modeled. Acceptable for current scope but reduces per-line traceability.

**AMT Exemption — TY2025 (Line 5)**

- ✅ Single/HOH: $88,100 — correct per IRS Rev. Proc. 2024-40.
- ✅ MFJ/QSS: $137,000 — correct.
- ✅ MFS: $68,500 — correct.
- ✅ Phase-out thresholds: Single/HOH $626,350; MFJ/QSS $1,252,700; MFS $626,350 — all correct.
- ✅ Phase-out rate: 25% (`PHASE_OUT_RATE = 0.25`) — correct per IRC §55(d)(3).
- ✅ `Math.floor` applied to phase-out reduction; `Math.max(0, ...)` prevents negative exemption — correct.
- ✅ QSS mapped to MFJ exemption and threshold — correct per IRC §55(d)(1).

**AMT Rate Structure (Lines 6–7)**

- ✅ 26% bracket threshold — standard: $239,100 — correct per IRS Form 6251 TY2025 instructions (IRC §55(b)(1)).
- ✅ 26% bracket threshold — MFS: $119,550 (= standard / 2) — correct per IRC §55(b)(1)(B)(ii).
- ✅ Pre-computed bracket adjustment — standard: $4,782 (= 239,100 × 0.02) — correct.
- ✅ Pre-computed bracket adjustment — MFS: $2,391 (= 119,550 × 0.02) — correct.
- ✅ TMT formula: `taxableExcess ≤ threshold → taxableExcess × 0.26`; `taxableExcess > threshold → taxableExcess × 0.28 − adjustment`. Algebraically equivalent to `lower_portion × 26% + upper_portion × 28%`. Verified: $300,000 standard → 300,000 × 0.28 − 4,782 = $79,218 = 239,100 × 0.26 + 60,900 × 0.28 ✓
- ✅ `Math.floor` applied consistently to both rate branches.
- ✅ MFS threshold branching correct: only MFS uses the halved threshold; Single, HOH, MFJ, QSS all use the standard threshold.

**AMTFTC and Net TMT (Lines 8–9)**

- ✅ `amtftc` accepted as `nonnegative()`. Applied as `max(0, tmt - amtftc)` — correctly prevents TMT from going negative via the AMT Foreign Tax Credit (IRC §59(a)).

**AMT Liability (Lines 10–11)**

- ✅ `regular_tax` accepted as `nonnegative()`. Schema comment correctly notes it should be Form 1040 Line 16 minus any Form 4972 tax on lump-sum distributions, per Line 10 instructions.
- ✅ AMT = `max(0, netTmt - regular_tax)` — correct per IRC §55(a).
- ✅ When `amt === 0`, returns `{ outputs: [] }` — correctly suppresses routing when no AMT is owed.

**Output Routing**

- ✅ AMT routed to `schedule2` as `line1_amt` — correct. Schedule 2 Line 1 is the designated AMT entry point to Form 1040.
- ✅ `outputNodes = new OutputNodes([schedule2])` — declared output is only Schedule 2, which is correct and complete for Form 6251.
- ✅ `regular_tax` sourced from `income_tax_calculation` — Section 3 audit confirmed `income_tax_calculation` feeds the pre-QDCGT bracket tax to `form6251` as `regular_tax`, matching Form 6251 Line 10 requirements.

**QDCGT Rate Interaction**

- ❌ No QDCGT worksheet for AMT: IRC §55(b)(3) and the Form 6251 Line 7 worksheet instructions require that if the taxpayer has qualified dividends or net capital gain, the "Qualified Dividends and Capital Gain Tax Worksheet" (or Schedule D Tax Worksheet) must be used to compute TMT, taxing that income at preferential LTCG rates (0%/15%/20%) rather than the flat 26%/28% AMT rates. The current node applies 26%/28% to the entire `taxableExcess` with no check for qualified dividends or LTCG. For taxpayers with significant QDCG, this **overstates TMT and therefore overstates AMT liability**. This is a material correctness issue affecting a common taxpayer profile (investors, retirees with dividends).

**Form 6251 Verdict:** ⚠️ WARN (one ❌ material issue)

**Critical issue:** QDCGT/LTCG rates not applied within AMT — Form 6251 Line 7 must use the Qualified Dividends and Capital Gain Tax Worksheet when qualified dividends or net capital gain are present, taxing that portion at 0%/15%/20% rather than 26%/28%. AMT is overstated for affected taxpayers (❌).
**Significant gap:** Dual Line 2g PAB fields (`private_activity_bond_interest` + `line2g_pab_interest`) summed together — double-count risk if both are populated by upstream nodes (⚠️).
**Minor gaps:** ATNOL 90% cap (IRC §56(d)) not enforced in-node (⚠️); percentage depletion excess and investment interest addback not separately modeled (⚠️ traceability). All TY2025 constants verified correct.

---

### Form 8959 (Additional Medicare Tax)

- ✅ AMT rate: `AMT_RATE = 0.009` (0.9%) — correct per IRC §3101(b)(2).
- ✅ Thresholds sourced from config: MFJ = $250,000, MFS = $125,000, OTHER (Single/HOH) = $200,000 — correct per IRC §3101(b)(2).
- ❌ **QSS threshold wrong**: `threshold()` does not have an explicit branch for `FilingStatus.QSS`. QSS falls through to `return THRESHOLD_OTHER` ($200,000), but IRC §3101(b)(2) and Form 8959 instructions specify QSS uses the MFJ threshold ($250,000). This will over-tax QSS filers. Compare: Form 8960's `threshold()` correctly handles QSS explicitly with `THRESHOLD_MFJ`. The fix is to add `if (status === FilingStatus.QSS) return THRESHOLD_MFJ;` before the fallthrough return.
- ✅ Part I — Line 4 (`totalMedicareWages`): sum of medicare_wages (W-2 box 5), unreported_tips (Form 4137 line 6), wages_8919 (Form 8919 line 6) — matches Form 8959 lines 1+2+3.
- ✅ Part I — Line 6 (`medicareWageExcess`): `max(0, line4 - threshold)` — correct.
- ✅ Part I — Line 7 (`partITax`): `line6 × 0.009` — correct.
- ✅ Part II — Line 10 (`reducedSeThreshold`): `max(0, threshold - line4)` — correctly reduces SE threshold by total Medicare wages per Form 8959 Part II instructions.
- ✅ Part II — Line 11–12 (`seIncomeExcess`): negative SE income floored to zero before computing excess — correct; SE losses don't generate negative AMT.
- ✅ Part II — Line 13 (`partIITax`): `seExcess × 0.009` — correct.
- ✅ Part III — RRTA compensation threshold is NOT reduced by Medicare wages (separate pool per Form 8959 Part III instructions) — correct.
- ✅ Part III — Line 17 (`partIIITax`): `rrtaExcess × 0.009` — correct.
- ✅ Part IV — Line 18 (`totalAmtTax`): sum of Part I + II + III taxes, rounded to cents — correct.
- ✅ Schedule 2 routing: `line18 → schedule2.line11_additional_medicare` — correct per Form 8959 line 18 → Schedule 2 line 11.
- ❌ **Dead output node**: `outputNodes` declares `new OutputNodes([schedule2, f1040])`, and `f1040Output()` is defined, but `f1040Output(line24)` is **never called** in `compute()`. The comment says withholding is "intentionally NOT sent" — but `f1040` is still listed in `outputNodes` as a declared dependency. This is an inconsistency: either remove `f1040` from `outputNodes` (if the intentional decision stands) or route `line24` to `f1040.line25c_additional_medicare_withheld`. Note: Form 1040 line 25c (Medicare withholding reconciliation from Form 8959 line 24) is a real payment/credit field used in refund computation — its omission means the engine silently drops this withholding from the refund calculation.
- 🔍 NOTE: Schema field `se_income` is annotated as "Form 8959 line 8" but Part II of Form 8959 uses lines 8–13 for SE income computation. The naming is reasonable as a logical grouping of the SE income input.
- 🔍 NOTE: `medicare_withheld` comment says "W-2 box 6 sum, includes box 12 codes B + N." Box 12 codes B and N are employee SS/Medicare deferrals (not withholding). This comment is misleading; box 6 is Medicare tax withheld and does not include codes B or N.

### Form 8960 (NIIT)

- ✅ NIIT rate: `NIIT_RATE = 0.038` (3.8%) — correct per IRC §1411(a)(1).
- ✅ Thresholds: MFJ = $250,000, MFS = $125,000, OTHER (Single/HOH) = $200,000 — correct per IRC §1411(b)(1)(A).
- ✅ **QSS threshold correct**: `threshold()` explicitly handles `FilingStatus.QSS → THRESHOLD_MFJ` ($250,000) — correct per IRC §1411 and Form 8960 instructions.
- ✅ NII components (Part I): taxable interest (line 1), ordinary dividends (line 2), annuities (line 3), passive income (line 4a), rental net (line 4b), net gain (line 5a), gain adjustment (line 5b), other modifications (line 7) — all major NII categories covered per IRC §1411(c)(1).
- ✅ NII excludes wages and SE income — no such inputs in schema, correctly absent.
- ✅ NII excludes qualified plan distributions — not modeled as input, correctly absent.
- ⚠️ **Missing Form 8960 line 6** (gain or loss from prior-year installment sales): The schema has no field for installment sale income reportable as NII in the current year. This is a relatively rare case but can arise when a prior-year installment sale involved property whose gain is NII. The gap means some installment sale NII will be unreported.
- ✅ Part I — Line 8 (`niiGross`): sum of lines 1–7 with lines 4b, 5b, 7 allowed to be negative (adjustments/exclusions) — correct per Form 8960 Part I instructions.
- ✅ Part II — Line 11 (`totalDeductions`): investment interest expense (line 9a), state/local taxes allocable to NII (line 9b), additional modifications (line 10) — all nonnegative per schema — correct.
- ✅ Part III — Line 12 (`netInvestmentIncome`): `max(0, gross - deductions)` — correct; NII cannot be negative.
- ✅ Part III — Line 14 threshold by filing status — correct.
- ✅ Part III — Line 15 (`magiExcess`): `max(0, MAGI - threshold)` — correct.
- ✅ Part III — Line 16 (`taxableBase`): `min(NII, magiExcess)` — correct per IRC §1411(a)(1): tax applies to lesser of NII or MAGI excess.
- ✅ Part III — Line 17 (`niitTax`): `base × 0.038`, rounded to cents — correct.
- ✅ Early return when MAGI ≤ threshold: no NIIT — correct and efficient.
- ✅ Early return when NII ≤ 0: no NIIT — correct.
- ✅ Schedule 2 routing: `niit → schedule2.line12_niit` — correct per Form 8960 line 17 → Schedule 2 line 12.
- 🔍 NOTE: `line9b_state_local_tax` (taxes allocable to NII) is constrained `nonnegative()` in schema. This is correct — it's a deduction amount entered as positive. No issue.

**Section 9 verdict:** ⚠️ WARN

**Critical issues:** QSS threshold in Form 8959 is $200,000 instead of $250,000 — over-taxes QSS filers (❌). `f1040.line25c_additional_medicare_withheld` is computed but never routed — Medicare withholding is silently dropped from refund computation (❌).
**Significant gaps:** Form 8960 missing line 6 (installment sale NII). Form 8959 `f1040` declared in `outputNodes` but never used — dead declaration.
**Minor issues:** Form 8959 schema comment for `medicare_withheld` incorrectly references W-2 box 12 codes B/N.

---

## 6. Intermediate — HSA, IRA, Retirement

### Form 8889 (HSA)

- ✅ Self-only HDHP limit: $4,300 — matches Rev. Proc. 2024-25 (`HSA_SELF_ONLY_LIMIT_2025 = 4_300` in config/2025.ts)
- ✅ Family HDHP limit: $8,550 — matches Rev. Proc. 2024-25 (`HSA_FAMILY_LIMIT_2025 = 8_550`)
- ✅ Catch-up for age 55+: $1,000 statutory, not indexed — correctly sourced from `HSA_CATCHUP_2025 = 1_000`
- ✅ Annual limit computation: `annualLimit()` correctly applies base + catch-up; defaults to self-only when `coverage_type` absent (conservative — lower limit prevents over-deduction)
- ✅ 20% non-qualified penalty: `NON_QUALIFIED_PENALTY_RATE = 0.20`; correctly waived when `distribution_exception === true` (IRC §223(f)(4)(B)–(D): death, disability, Medicare enrollment)
- ✅ Taxable distributions: `max(0, total_distributions - qualified_expenses)` — correct per IRC §223(f)(2)
- ✅ HSA deduction routed to `schedule1.line13_hsa_deduction` (above-the-line) and `agi_aggregator` — correct above-the-line treatment per IRC §223(a)
- ✅ Taxable HSA income routed to `schedule1.line8z_other` and `agi_aggregator` — correct
- ✅ 20% penalty routed to `schedule2.line17b_hsa_penalty` — correct for Part II additional tax
- ✅ Excess contributions routed to `form5329` Part VII — correct per IRC §4973(a)(2)
- ⚠️ Employer HSA contributions (W-2 Box 12 Code W) included in deductible total routed to Schedule 1: in standard payroll these are excluded from Box 1 wages pre-tax, so deducting them again on Schedule 1 risks double-counting the AGI reduction. The code comment acknowledges this design choice. Requires cross-node verification that the W-2 node does NOT suppress Box 12W from Box 1 wages when routing to form8889, or confirmation that the engine models employer HSA as taxable wages + explicit deduction.
- ❌ Archer MSA distributions do not reduce the HSA contribution limit — Form 8889 Line 4 requires subtracting Archer MSA distributions from the annual limit; no `archer_msa_distributions` field exists in `inputSchema` (IRC §223(b)(4))
- ❌ No month-by-month proration for partial-year HDHP coverage — Form 8889 Line 3 uses the last-month rule with a 13-month testing period; taxpayers not covered all 12 months must prorate; no `months_covered` or equivalent field exists in `inputSchema`

### IRA Deduction Worksheet

- ✅ Contribution limit under 50: $7,000 (`IRA_CONTRIBUTION_LIMIT_2025 = 7_000`) — matches Rev. Proc. 2024-40 §3.19; IRC §219(b)(5)(A)
- ✅ Contribution limit age 50+: $8,000 (`IRA_CONTRIBUTION_LIMIT_AGE50_2025 = 8_000`) — correct $1,000 catch-up per IRC §219(b)(5)(B)
- ✅ Single/HOH phase-out: $79,000–$89,000 — matches Rev. Proc. 2024-40 (TY2025)
- ✅ MFJ covered taxpayer phase-out: $126,000–$146,000 — matches Rev. Proc. 2024-40 (TY2025)
- ✅ MFJ non-covered spouse (covered spouse) phase-out: $236,000–$246,000 — matches Rev. Proc. 2024-40 (TY2025)
- ✅ MFS active participant phase-out: $0–$10,000 — correct per Pub. 590-A (narrow, not indexed)
- ✅ Phase-out computation: proportional reduction, rounded UP to nearest $10 (`Math.ceil`), $200 minimum floor when non-zero — correct per Pub. 590-A Worksheet 1-2
- ✅ `phaseOutRange()` returns `null` (fully deductible) for non-covered MFS spouse — Pub. 590-A: non-covered MFS spouse does not get the wider non-covered MFJ range; code comment confirms this
- ✅ Deduction routed to `schedule1.line20_ira_deduction` (above-the-line) and `agi_aggregator` — correct per IRC §219(a)
- ❌ Non-deductible IRA basis not routed to Form 8606 — when `ira_contribution > deductible`, the non-deductible portion is silently dropped. IRS requires Form 8606 to track IRA basis for future distributions. No `form8606` output exists in `outputNodes` and no excess routing is implemented.
- 🔍 Roth IRA phase-out not modeled in this node (TY2025 thresholds: Single $150,000–$165,000; MFJ $236,000–$246,000) — acceptable if Roth contributions are handled by a separate node; no finding if intentional scope boundary.

### SEP/Retirement Input

- ✅ SEP contribution rate: 25% of net SE compensation (`SEP_CONTRIBUTION_RATE_2025 = 0.25`) — correct per IRC §408(k) / Pub. 560 ch. 4
- ✅ SEP annual addition limit: $70,000 (`SEP_MAX_CONTRIBUTION_2025 = 70_000`) — matches Rev. Proc. 2024-40 §3.20; IRC §415(c)
- ✅ `sepDeduction()`: `min(contribution, net_SE_comp × 0.25, $70,000)` — correct three-way cap; gracefully handles absent `net_self_employment_compensation` by falling back to absolute cap only
- ✅ SIMPLE employee base limit: $16,500 (`SIMPLE_EMPLOYEE_LIMIT = 16_500`) — matches Rev. Proc. 2024-40 §3.24
- ✅ Solo 401(k) employee deferral limit: $23,500 (`SOLO401K_EMPLOYEE_LIMIT = 23_500`) — matches Rev. Proc. 2024-40 §3.19
- ✅ Solo 401(k) combined §415(c) limit: $70,000 — correct
- ✅ Deduction routed to `schedule1.line16_sep_simple` (above-the-line) and `agi_aggregator` — correct per IRC §62(a)(6)
- ❌ SIMPLE catch-up for age 50+ is wrong: node hardcodes `SIMPLE_CATCHUP_LIMIT = 19_500` ($3,000 over the base), but the correct age-50+ limit is $20,000 (= $16,500 + $3,500 catch-up per Rev. Proc. 2024-40 §3.24). The config's `RETIREMENT_LIMITS_2025["simple"]` table correctly shows $20,000 for ages 50–59, but the sep_retirement node does not use that table — it uses its own hardcoded constant. Underreports SIMPLE catch-up by $500.
- ❌ SECURE 2.0 super catch-up for ages 60–63 not implemented: the correct limit is $21,750 (base $16,500 + $5,250 per IRC §408(p)(2)(E) as amended by SECURE 2.0 §109). `simpleDeduction()` only branches on `age_50_or_over` with no age-60-63 bracket. The config table correctly carries $21,750 but the node ignores it entirely.
- ⚠️ `totalDeduction()` called twice per `compute()` — once in `schedule1Output()` and once in `agiOutput()` — redundant array traversal. No correctness impact but worth memoizing.
- 🔍 SIMPLE employer contributions accepted at face value without a 3% match rate cap check (`SIMPLE_EMPLOYER_MATCH_RATE_2025 = 0.03`). Whether the cap enforcement belongs here or in the upstream input is a design choice; noted for awareness.

**Section verdict:** ❌ FAIL — Five hard failures: form8889 missing Archer MSA limit reduction (Form 8889 Line 4) and missing partial-year proration (Form 8889 Line 3); ira_deduction_worksheet missing Form 8606 routing for non-deductible IRA basis; sep_retirement SIMPLE catch-up hardcoded $500 too low and SECURE 2.0 ages 60–63 super catch-up entirely absent. One employer HSA double-counting risk (⚠️) requires cross-node verification.

---

## 5. Intermediate — SE Tax, Schedule H, F

### Schedule SE

- ✅ Net earnings from SE = combined net profit × 0.9235 (IRC §1402(a)(12); `NET_EARNINGS_MULTIPLIER = 0.9235`); multiplier applied only when line3 > 0; losses carried forward as-is — correct
- ✅ SS wage base TY2025 = $176,100 (`SS_WAGE_BASE_2025 = 176_100`; Rev. Proc. 2024-40 §3.28); imported from config
- ✅ SS tax = `Math.min(net_earnings, remaining_wage_base) × 12.4%`; correctly capped at SS wage base with W-2, unreported tips (Form 4137), and Form 8919 wage offsets applied (Schedule SE lines 8a–8d / line 9)
- ✅ Medicare tax = net_earnings × 2.9%; correctly uncapped — no ceiling on Medicare earnings
- ✅ Total SE tax = SS + Medicare (15.3% combined on earnings up to wage base, 2.9% above); formula and rate constants correct
- ✅ SE earnings threshold = $400 (IRC §1402(b); `SE_EARNINGS_THRESHOLD = 400`); returns empty output when `line4a < 400`; correctly covers below-threshold and loss cases
- ✅ SE tax deduction = SE tax × 50% (IRC §164(f); `SE_DEDUCTION_RATE = 0.50`; line 13)
- ✅ SE tax deduction correctly routes to `schedule1.line15_se_deduction` (above-the-line) and `agi_aggregator.line15_se_deduction`
- ✅ Total SE tax correctly routes to `schedule2.line4_se_tax`
- ⚠️ Optional SE method (Schedule SE Part II) not implemented: IRC §1402(l) allows filers with low net SE earnings to use 2/3 of gross SE income as net earnings, preserving Social Security/Medicare credits for low-income self-employed filers. Affects filers with gross SE income but near-zero or negative net profit.
- ⚠️ Church employee income (Schedule SE line 5a; IRC §3121(b)(8)) is explicitly noted as out of scope. Clergy and certain religious workers owe SE tax on church wages — these filers will produce incorrect results.

### Schedule H

- ✅ FICA threshold = $2,800 (TY2025; `HOUSEHOLD_FICA_THRESHOLD_2025 = 2_800`); `ficaWages()` auto-applies threshold when `total_cash_wages >= 2,800`, setting FICA wages to zero otherwise
- ✅ Employer FICA rate = 7.65% (SS: 6.2% employer + Medicare: 1.45% employer); rates correct
- ✅ SS wages capped at $176,100 SS wage base for both employer and employee SS computation
- ✅ Medicare wages uncapped — `medicareWages()` uses all FICA wages with no ceiling; correct per IRC §3121(a)(1)
- ✅ Total household employment tax (employer FICA + employee FICA withheld + federal income tax withheld + FUTA) routes to `schedule2.line7a_household_employment`
- ✅ Employee share: falls back to computed rates (6.2% SS, 1.45% Medicare) when withheld amounts not provided; handles both direct-input and auto-compute paths correctly
- ⚠️ FUTA not computed from wages: `futa_tax` is accepted as a caller-provided pre-computed value. The FUTA rate of 6% on first $7,000 per employee is not enforced. If a caller omits `futa_wages × 6%` or passes an incorrect `futa_tax`, the node will silently accept it without validation.
- ⚠️ `HOUSEHOLD_FUTA_QUARTERLY_THRESHOLD` ($1,000) is imported and declared as a constant but never used in any computation. The quarterly $1,000 threshold determines whether FUTA must be deposited quarterly — not enforcing it means the node cannot signal filing/deposit obligations to the caller.

### Schedule F

- ✅ Gross income (line 9) correctly computed: livestock profit (line 1 − line 2), cooperative distributions (taxable portion line 3b), ag program payments (taxable portion line 4b), CCC loan election (line 5a) and forfeiture net of basis (line 5b − line 5c), crop insurance taxable (line 6b) and deferred (line 6d), custom hire (line 7), other income (line 8)
- ✅ Conservation expense capped at 25% of gross farm income (Pub. 225 ch. 5; `CONSERVATION_LIMIT_PCT = 0.25`); uses `Math.max(0, grossIncome)` to prevent negative cap when gross is negative — correct
- ✅ All 24 expense lines (10–32e) included in `computeTotalExpenses()`; expense computation is exhaustive
- ✅ Net farm profit/loss (line 34) routes to `schedule1.line6_schedule_f` and `agi_aggregator.line6_schedule_f` — correctly treated as above-the-line farm income/loss
- ✅ Net farm profit ≥ $400 routes to `schedule_se.net_profit_schedule_f`; Schedule SE will further apply 92.35% and recheck the $400 threshold — correct two-stage logic
- ✅ Net profit > 0 routes to `form8995.qbi_from_schedule_f` for QBI deduction — correct
- ✅ Passive activity loss routing: `form8582.passive_schedule_f` triggered when `material_participation = false` — correct
- ✅ At-risk loss routing: `form6198.schedule_f_loss` triggered when net profit < 0 and `line36_at_risk = "b"` (some investment not at risk) — correct
- ✅ Excess Business Loss (Form 461): computed against TY2025 thresholds ($313,000 single / $626,000 MFJ) with filing-status awareness — correct
- ⚠️ Optional farm SE methods (IRS Pub. 225 ch. 9) not implemented: the "gross income method" (2/3 of gross farm income, capped at $9,060) and "farm optional method" ($4,800 / $2,400 minimum floors) allow qualifying farmers with low net income to preserve SE credits — absent
- ⚠️ Schedule F pre-filters SE routing at raw net profit ≥ $400, but the IRC §1402(b) threshold applies to net _earnings_ (net profit × 0.9235). Filers with net profit between $433–$434 may be routed to Schedule SE unnecessarily (e.g., net profit $433 × 0.9235 = $399.8 < $400 SE threshold); Schedule SE will return empty for these cases. Functionally harmless — SE self-corrects — but the pre-filter is slightly wider than IRC semantics require.
- ⚠️ Accrual-method farms: `accounting_method` field is captured in the schema but no accrual-specific adjustments (e.g., beginning/ending inventory, accounts receivable) are implemented. Accrual-basis farms may have materially different gross income under IRC §446.

**Section verdict:** ⚠️ WARN — Core SE tax math (rates, wage base, 92.35% multiplier, deduction routing) is fully correct. Schedule H FICA threshold and rates are correct. Key gaps: optional SE methods absent for low-income filers (Schedule SE Part II and Pub. 225 farm optional methods), FUTA validation absent in Schedule H with unused quarterly threshold constant, church employee income out of scope in Schedule SE, accrual farm accounting not implemented in Schedule F.

## 13. Intermediate — Foreign Income

### Form 2555 (FEIE)

- ✅ **FEIE limit TY2025 = $130,000** — `FEIE_LIMIT_2025 = 130_000` in `config/2025.ts` (Rev. Proc. 2024-40 §3.04); imported and aliased correctly in `form2555/index.ts`.
- ✅ **Bona fide residence test** — `bona_fide_resident === true` qualifies the taxpayer per IRC §911(d)(1)(A).
- ✅ **Physical presence test — 330 days** — `days_in_foreign_country >= 330` (constant `PHYSICAL_PRESENCE_DAYS = 330`) per IRC §911(d)(1)(B). Either test alone qualifies.
- ❌ **Partial-year proration missing** — `earnedIncomeExclusion()` is `Math.min(income, FEIE_LIMIT)` with no day-count proration. IRC §911(b)(2)(A) requires the exclusion to be prorated when the taxpayer did not qualify for the full year: `days_present × $130,000 / 365`. A taxpayer who qualifies for only 200 days would currently receive the full $130,000 exclusion instead of the correct $71,233.
- ✅ **Housing base = $20,800** — `FEIE_HOUSING_BASE_2025 = 20_800` = 16% × $130,000 per IRC §911(c)(1)(B). Applied correctly: `max(0, taxpayer_expenses - HOUSING_BASE)`.
- ✅ **Employer housing exclusion** — `employer_housing_exclusion` excluded as-is per Form 2555 line 44, then combined with taxpayer exclusion portion.
- ⚠️ **Housing exclusion has no local city cap** — IRC §911(c)(2)(B) and Rev. Proc. 2024-40 Table 1 impose per-city housing limits (e.g., London, Tokyo, Hong Kong vary significantly from the base). The node applies no upper cap beyond the housing base floor; it could allow exclusions far exceeding the applicable local limit.
- ❌ **Stacking rule (tax benefit computation) not implemented** — IRC §911(f) requires that the tax on non-excluded income be computed as if the excluded foreign income were at the bottom of the income brackets (i.e., excluded income is stacked below remaining income for bracket placement). The node currently emits a simple negative Schedule 1 adjustment without the stacking-rule tax recomputation. This understates taxable income's effective marginal rate and can result in materially lower tax than the statute requires.
- ❌ **SE tax not preserved — FEIE reduces SE income** — IRC §1402(a)(2) excludes foreign earned income from net earnings from self-employment only to the extent it is otherwise excluded. When a taxpayer has `foreign_self_employment_income`, the code includes it in the FEIE exclusion, but emits no output to any Schedule SE node preserving the SE base. The FEIE does not reduce SE income (only income tax), so self-employment income abroad should flow to Schedule SE independently of this exclusion. This gap means self-employed expats will have zero SE tax computed.
- ✅ **Routes — FEIE → Schedule 1 line 8d** — `line8d_foreign_earned_income_exclusion` emitted to `schedule1` and `agi_aggregator`. Per IRC §911(a)(1) and Form 2555 line 45 → Schedule 1 line 8d. Correct.
- ✅ **Routes — Housing → Schedule 1 line 8d** — `line8d_foreign_housing_deduction` emitted to `schedule1` and `agi_aggregator`. Per IRC §911(a)(2) and Form 2555 line 50 → Schedule 1 line 8d. Correct.
- ✅ **Early return when no income and no housing activity** — Guard `income === 0 && !hasHousingActivity` prevents spurious outputs. Correct.
- ✅ **Schema uses Zod, type inferred, no `any`** — Pattern compliance with codebase conventions.

### Form 1116 (Foreign Tax Credit)

- ✅ **FTC limitation formula** — `allowedCredit = min(foreign_tax_paid, us_tax_before_credits × foreign_income / total_income)`. Matches IRC §904(a): FTC ≤ (foreign source income / worldwide income) × US tax.
- ✅ **Division-by-zero guard** — `limitationFraction` returns `1.0` when `total_income <= 0` and foreign income > 0 (degenerate all-foreign case), and `0` when both are zero. Safe and documented.
- ✅ **Fraction capped at 1.0** — `Math.min(1.0, foreign_income / total_income)` prevents the fraction from exceeding 1 per IRC §904(a).
- ✅ **Income categories — full set** — `IncomeCategory` enum covers Passive, General, Section951A (GILTI), Branch, Treaty, and Section901j (sanctioned countries). All IRC §904(d) categories represented.
- ✅ **Section 901(j) sanctioned countries** — Enum value present; enforcement (disallowing credit) must be handled upstream before routing to this node, consistent with the engine's separation of concerns.
- ⚠️ **Simplified method ($300/$600) enforced upstream only** — The schema comment documents that Form 1116 is only invoked when foreign tax exceeds the de minimis threshold ($300 single / $600 MFJ). `filing_status` is accepted "for context." However, the node performs no internal guard — if upstream routing miscategorizes a taxpayer who qualifies for the simplified election (all-passive, qualified payors), they would be routed here and required to compute Form 1116 when they need not. This is an upstream trust dependency with no defense-in-depth guard.
- ❌ **No carryback (1 year) or carryforward (10 years)** — IRC §904(c) allows unused FTC (excess of `foreign_tax_paid` over `ftcLimit`) to be carried back 1 year and forward 10 years. The node computes `allowedCredit = min(foreign_tax_paid, ftcLimit)` and silently discards the excess. No unused credit amount is emitted to any carryover tracking node or output field. Excess FTC is permanently lost in the current implementation.
- ❌ **No AMT FTC computation** — IRC §59(a) and Form 8801 require a separate AMT Foreign Tax Credit computation using AMTI (Alternative Minimum Taxable Income) rather than regular taxable income. The node only computes the regular FTC. Taxpayers subject to AMT will not have an AMT FTC applied, potentially overstating AMT liability.
- ✅ **Routes — FTC → Schedule 3 Part I Line 1** — `line1_foreign_tax_credit` emitted to `schedule3`. Per Form 1116 Part III line 24 → Schedule 3 Part I line 1. Correct.
- ✅ **Zero guard on credit output** — `schedule3Output` only emits when `credit > 0`. Prevents spurious zero-credit outputs.
- ✅ **Schema: all fields required (non-optional)** — Unlike Form 2555, all Form 1116 fields are required with no `?.optional()`. Appropriate given this node is only invoked after upstream qualifying checks.
- ✅ **`nativeEnum` for `IncomeCategory` and `FilingStatus`** — Domain-code enums used correctly, exported for upstream use.

**Section verdict:** ❌ FAIL — Three critical gaps in Form 2555 (partial-year proration absent, stacking rule absent, SE income not preserved for SE tax), and two critical gaps in Form 1116 (no FTC carryback/carryforward, no AMT FTC). Housing city cap is a known IRS complexity but is also absent. These are material correctness issues for any filer with self-employment abroad, partial-year qualification, or excess foreign taxes.

---

## 12. Intermediate — Passive Activity & At-Risk

### Form 8582 (PAL Limitations)

- ✅ **Phase-out rate** — `PHASE_OUT_RATE = 0.50` (IRC §469(i)(3)(B)) is correct and defined as a named constant.
- ✅ **MAGI thresholds (TY2025)** — `magiLowerThreshold = 100_000` and `magiUpperThreshold = 150_000` match IRC §469(i)(3)(A). These are statutory amounts not indexed for inflation, so no config lookup needed.
- ✅ **MFS lived-with-spouse ineligibility** — `isMfsIneligible()` returns true for all `FilingStatus.MFS` filers, conservatively denying the §469(i)(5)(A) allowance. Documented as conservative (lived-apart determination would require additional input).
- ✅ **MFS halved thresholds defined** — `mfsAllowanceMax = 12_500`, `mfsMagiLower = 50_000`, `mfsMagiUpper = 75_000` correctly define the IRC §469(i)(5)(B) values for MFS filers who lived apart all year.
- ✅ **Active participation guard** — `specialAllowance()` returns 0 unless both `has_active_rental` and `active_participation` are true, matching IRC §469(i)(1) and §469(i)(6).
- ✅ **Prior-year PAL carryforward input** — `prior_unallowed` is accepted and included in `totalPassiveLoss()` per IRC §469(b).
- ✅ **Phase-out formula** — `PHASE_OUT_RATE * (magi - lower)` subtracted from `max`, then capped at `rentalNetLoss`. Correctly implements the IRC §469(i)(3)(B) 50% phase-out.
- ✅ **No overall PAL early exit** — When `pal <= 0`, returns empty outputs, correctly skipping the limitation when passive income covers all passive losses.
- ⚠️ **`rentalNetLoss = loss` conflates rental and non-rental passive losses** — Line 175 assigns `rentalNetLoss = loss` (all passive losses) rather than isolating only the rental real estate loss portion. The `has_other_passive` schema field exists but is never used in any computation. In mixed-activity scenarios, the §469(i)(2) $25,000 allowance cap may be applied against non-rental passive losses, overstating the allowed deduction.
- ⚠️ **`allowanceThresholds()` MFS branch is dead code** — The function branches on `isMfsIneligible(input)` and returns the halved MFS thresholds, but `specialAllowance()` already returns 0 before ever calling `allowanceThresholds()` when MFS is ineligible. The MFS half-threshold branch is unreachable. The MFS lived-apart path (non-zero allowance with halved thresholds per §469(i)(5)(B)) is therefore unimplemented despite the constants being correctly defined.
- ❌ **No suspended loss carryforward emitted** — When `pal > allowedLoss`, the disallowed (suspended) portion is never emitted to any output node. The engine has no way to propagate the new `prior_unallowed` balance to the next tax year. IRC §469(b) requires suspended losses to carry forward indefinitely. Without this output, PAL carryforwards are silently dropped after the first year they are disallowed.
- ❌ **No full-disposition release (IRC §469(g))** — No input flag or code path handles the scenario where a passive activity is fully disposed of in a taxable transaction, at which point all prior suspended losses must be released as currently deductible. The limitation engine has no mechanism for this required treatment.

### Form 8582-CR (PAL Credits)

- ✅ **Credit carryforward input** — `prior_unallowed_credits` is accepted and summed into `totalCreditsAvailable()` per IRC §469(b).
- ✅ **Tax-attributable-to-passive base** — `taxAttributableToPassive()` = `max(0, regular_tax_all_income - regular_tax_without_passive)` correctly implements the two-tax computation from Form 8582-CR Part I Line 6.
- ✅ **Real estate professional bypass** — When `is_real_estate_professional = true`, all credits are allowed without limitation, correctly reflecting that rental activities are nonpassive for RE professionals under IRC §469(c)(7).
- ✅ **Special allowance phase-out** — Uses `RENTAL_ALLOWANCE_MAX = 25_000`, `MAGI_LOWER_THRESHOLD = 100_000`, `MAGI_UPPER_THRESHOLD = 150_000`, and `PHASE_OUT_RATE = 0.50`, consistent with IRC §469(i).
- ✅ **MFS ineligibility** — Same conservative MFS treatment as Form 8582, denying Part II special allowance to all MFS filers.
- ✅ **Combined allowed credit cap** — `totalAllowed = min(available, baseAllowed + special)` correctly prevents the total from exceeding available credits.
- ⚠️ **`schedule3Output` bypasses `OutputNodes.output()` typed helper** — The function constructs a raw object literal `{ nodeType: schedule3.nodeType, fields: { ... } }` instead of using `this.outputNodes.output(schedule3, { ... })`. Other nodes use the typed helper for compile-time shape validation. The field name `line6z_general_business_credit` is not validated against Schedule 3's declared schema at compile time, creating a type-safety gap.
- ⚠️ **No suspended credit carryforward emitted** — Like Form 8582, when credits are partially disallowed the node does not emit the new `prior_unallowed_credits` balance. Passive activity credit (PAC) carryforwards under IRC §469(b) are silently dropped.
- ⚠️ **MFS halved thresholds not applied for credits** — Form 8582-CR uses the standard `MAGI_LOWER/UPPER_THRESHOLD` constants in `specialAllowanceCredit()`. It does not define or apply the MFS halved thresholds ($50k/$75k) for the MFS lived-apart case, unlike Form 8582 which does define those constants. Given MFS is already blanket-denied via `isMfsIneligible()`, this only matters if the MFS lived-apart path is ever implemented for credits.

### Form 6198 (At-Risk)

- ✅ **At-risk loss limitation formula** — `allowed = min(netLoss, amount_at_risk)` and `disallowed = max(0, netLoss - amount_at_risk)` correctly implement IRC §465(a)(1).
- ✅ **Prior-year suspended loss carryforward input** — `prior_unallowed` is included in `netLossAmount()`, correctly carrying forward previously disallowed at-risk losses.
- ✅ **Income offset before at-risk limit** — `netLossAmount()` subtracts `current_year_income` from combined current+prior losses before applying the at-risk cap. Matches IRC §465(a)(1) which limits the net loss.
- ✅ **No-loss early exit** — Returns empty outputs when `totalLoss === 0`, avoiding spurious disallowance signals.
- ✅ **No-disallowance early exit** — Returns empty outputs when `disallowed === 0`, meaning the loss is fully within the at-risk amount.
- ⚠️ **`schedule_f_loss` declared but never used** — The schema accepts `schedule_f_loss: z.number().nonpositive().optional()` for farming activity losses, but `netLossAmount()` only reads `schedule_c_loss`. Farming at-risk losses passed via `schedule_f_loss` are silently ignored, understating the total loss subject to at-risk limitation. (Note: Schedule F already wires `form6198.schedule_f_loss` per the routing in section 5 of this audit, so the data is being sent but dropped here.)
- ⚠️ **Dual output to `schedule1` and `agi_aggregator` risks double-counting** — The disallowed add-back is emitted independently to both `schedule1.at_risk_disallowed_add_back` and `agi_aggregator.at_risk_disallowed_add_back` with identical values. If both nodes independently accumulate this field into the AGI computation pathway, the disallowed amount would be doubled in AGI. The interaction needs cross-node verification.
- ❌ **No recapture of negative at-risk amounts (IRC §465(e))** — When prior deductions have reduced the at-risk amount below zero (e.g., due to distributions or conversion of recourse to non-recourse debt), the taxpayer must include the below-zero amount in income. No recapture input or logic exists in this node.
- ❌ **No qualified non-recourse financing exception (IRC §465(b)(6))** — Real estate activities can include qualified non-recourse financing in the amount at risk. The schema has no `qualified_nonrecourse_financing` field, and `amount_at_risk` is opaque to this distinction. Real estate taxpayers with qualified non-recourse debt must manually pre-add it to `amount_at_risk`; the engine provides no modeling or validation of this exception.
- ❌ **No at-risk carryforward emitted** — The node emits the disallowed add-back to reverse the upstream-posted loss, but does not emit the new suspended at-risk loss balance for carry-forward to the next year. The `prior_unallowed` input mechanism exists but the node never outputs the updated balance. Without external orchestration, suspended at-risk losses are permanently lost after one year.

**Section verdict:** ⚠️ WARN

**Critical issues (❌):**
- Form 8582: Suspended PAL carryforward not emitted — IRC §469(b) carry-forward is broken; full-disposition release (§469(g)) not implemented.
- Form 6198: §465(e) recapture not implemented; qualified non-recourse financing exception (§465(b)(6)) not modeled; at-risk carryforward not emitted; `schedule_f_loss` field declared but silently ignored despite being wired by Schedule F.

**Significant gaps (⚠️):**
- Form 8582: `rentalNetLoss` conflates all passive losses instead of rental-only losses, potentially overstating the §469(i) allowance in mixed-activity scenarios; MFS lived-apart path (halved thresholds) is dead code despite constants being defined.
- Form 8582-CR: `schedule3Output` bypasses typed `OutputNodes.output()` helper; suspended credit carryforward not emitted; MFS lived-apart halved thresholds not defined for credits.
- Form 6198: Dual output to `schedule1` + `agi_aggregator` risks double-counting the add-back in AGI.

---

## 8. Intermediate — ACA / Form 8962

**File:** `forms/f1040/nodes/intermediate/forms/form8962/index.ts`
**Config:** `forms/f1040/nodes/config/2025.ts` (`FPL_BASE_2025`, `FPL_INCREMENT_2025`)
**Authority:** IRC §36B; Rev. Proc. 2024-57 (TY2025 applicable figure table); ARP §9661 as extended by IRA P.L. 117-169 §12001 (through TY2025)

---

### 8.1 FPL Constants

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `FPL_BASE_2025` | $15,060 | $15,060 | ✅ PASS |
| `FPL_INCREMENT_2025` | $5,380 | $5,380 | ✅ PASS |
| `federalPovertyLevel(n)` formula | `15,060 + 5,380 × (n-1)` | `FPL_BASE + FPL_INCREMENT * (householdSize - 1)` | ✅ PASS |

---

### 8.2 ARP 400% Cliff Status for TY2025

The Inflation Reduction Act (P.L. 117-169, §12001) extended the American Rescue Plan's elimination of the 400% FPL cliff through **tax year 2025**. The code comment at line 24 ("cliff eliminated TY2025 — extension applies") and the `400%+` bracket at 8.5% are **correct** for TY2025.

✅ PASS — The 400% cliff is correctly waived for TY2025. The IRA extension runs through TY2025, so taxpayers above 400% FPL remain eligible for PTC capped at 8.5% contribution. The code does not erroneously restore the cliff.

> Note: The IRA extension expires after TY2025. TY2026 will restore the 400% cliff unless new legislation extends it. This node requires a law-change review for TY2026.

---

### 8.3 Applicable Contribution Percentage Table

The operative TY2025 table is the ARP-extended table from Rev. Proc. 2024-57, which caps at 8.5% (not the pre-ARP statutory 9.78% cap). The bracket-level percentages at each income tier follow the IRS-published schedule from IRC §36B(b)(3)(A) as adjusted.

| Income Range | Expected (Rev. Proc. 2024-57) | Code (`APPLICABLE_PERCENTAGE_TABLE`) | Result |
|---|---|---|---|
| 100%–133% FPL | 2.06% flat | 2.0% flat | ❌ FAIL |
| 133%–150% FPL | 3.09% flat | 3.0%–4.0% interpolated ramp | ❌ FAIL — wrong value and wrong shape (flat, not a ramp) |
| 150%–200% FPL | 4.12%–6.18% linear | 4.0%–6.0% linear | ❌ FAIL — endpoints off by ~0.12–0.18% |
| 200%–250% FPL | 6.18%–8.24% linear | 6.0%–8.5% linear | ❌ FAIL — lower end off, upper end exceeds ARP 8.24% floor before cap |
| 250%–300% FPL | 8.24%–8.5% linear (ARP cap) | 8.5%–8.5% flat | ⚠️ WARN — overstates contribution at lower end; taxpayer underclaims PTC |
| 300%–400% FPL | 8.5% flat (ARP cap) | 8.5% flat | ✅ PASS |
| 400%+ FPL | 8.5% flat (ARP/IRA extension) | 8.5% flat | ✅ PASS |

**Impact of failures:**
- **100–133%:** Contribution understated 0.06 pp → taxpayer over-receives ~$9 PTC per $15,060 income at base household size.
- **133–150%:** Should be flat at 3.09%. Code ramps 3.0%→4.0%, creating both over- and under-payment across the bracket depending on exact income.
- **150–200% and 200–250%:** Systematically understates contribution at lower ends → taxpayer over-receives PTC, producing excess APTC reconciliation liability at year-end.

---

### 8.4 `applicableContributionPct` — Interpolation Algorithm

✅ PASS — The linear interpolation algorithm is correct. For the `Infinity` upper bracket, `position` is forced to 0 and `range` to 1, returning `minContrib` as a flat rate. The defects are exclusively in the constant values, not the algorithm.

---

### 8.5 Monthly vs. Annual Calculation Fidelity

Form 8962 requires a **month-by-month** calculation per IRS instructions: for each month compute `monthly_SLCSP - (annual_income × applicable_pct) / 12`, sum all 12 monthly PTCs, then compare against total APTC.

The code accepts `monthly_premiums`, `monthly_slcsps`, and `monthly_aptcs` arrays (12 elements each) but **collapses them to annual totals** before a single annual calculation. No per-month applicable premium is computed.

⚠️ WARN — The annual aggregate is accurate only when SLCSP premiums, household size, and coverage are constant all 12 months. For taxpayers who gained or lost coverage mid-year, changed household size, or moved to a different rating area, the aggregate produces incorrect PTC. The monthly arrays are collected but functionally no-op for mid-year changes.

---

### 8.6 APTC Repayment Caps (IRC §36B(f)(2)(B))

IRC §36B(f)(2)(B) caps excess APTC repayment based on household income:

| Household Income (% FPL) | Single Filer Cap | All Other HH Cap |
|---|---|---|
| Under 200% | $350 | $700 |
| 200%–300% | $875 | $1,750 |
| 300%–400% | $1,400 | $2,800 |
| 400%+ (TY2025) | No cap — ARP/IRA extension waives repayment when PTC = 0 above 400% FPL |

**The code does not implement repayment caps.** When `netPtc < 0`, the full `|netPtc|` is routed to Schedule 2 with no income-based cap.

❌ FAIL — Repayment caps entirely absent. Example: a taxpayer at 250% FPL (other household) with $2,000 excess APTC has repayment capped at $1,750 by law, but the code routes the full $2,000 to Schedule 2, overstating tax liability by $250.

---

### 8.7 QSEHRA Reduction (IRC §36B(c)(2)(C)(iv))

✅ PASS — `qsehra_amount_offered` correctly reduces allowed PTC dollar-for-dollar. Reduction floors at 0; QSEHRA cannot create a repayment liability.

---

### 8.8 Eligibility Guard — Below 100% FPL

✅ PASS — `applicableContributionPct` returns `Infinity` below 100% FPL. The compute method routes any received APTC to Schedule 2 as excess repayment, consistent with below-100%-FPL ineligibility rules.

---

### 8.9 Output Routing

| Output | Destination | Field | Result |
|---|---|---|---|
| Net PTC (PTC > APTC) | `schedule3` | `line9_premium_tax_credit` | ✅ PASS |
| Excess APTC (APTC > PTC) | `schedule2` | `line2_excess_advance_premium` | ✅ PASS |
| Values rounded to whole dollars | `Math.round()` applied to both outputs | | ✅ PASS |

---

### 8.10 Schema Validation

✅ PASS — All input fields guarded by `z.number().nonnegative()`. Monthly arrays validated to exactly 12 elements via `.length(12)`. Schema re-parsed inside `compute()`. All fields optional with safe defaults.

---

### 8.11 Section Summary

| # | Finding | Severity |
|---|---|---|
| 8.3a | Applicable % at 100–133% FPL: 2.0% instead of required 2.06% | ❌ FAIL |
| 8.3b | Applicable % at 133–150% FPL: linear 3.0–4.0% vs. required flat 3.09% | ❌ FAIL |
| 8.3c | Applicable % at 150–200% FPL: endpoints 4.0/6.0% vs. required 4.12/6.18% | ❌ FAIL |
| 8.3d | Applicable % at 200–250% FPL: endpoints 6.0/8.5% vs. required 6.18/8.24% | ❌ FAIL |
| 8.3e | Applicable % at 250–300% FPL: flat 8.5% vs. required linear 8.24–8.5% | ⚠️ WARN |
| 8.5 | Monthly arrays summed to annual totals; mid-year changes produce incorrect PTC | ⚠️ WARN |
| 8.6 | Repayment caps (IRC §36B(f)(2)(B)) entirely absent; excess APTC repayment overstated | ❌ FAIL |
| 8.2 | ARP/IRA 400% cliff correctly waived through TY2025 — not a false alarm | ✅ PASS |
| 8.7 | QSEHRA reduction correctly implemented | ✅ PASS |
| 8.9 | Output routing to Schedule 2 / Schedule 3 correct | ✅ PASS |
| 8.10 | Input schema validation correct | ✅ PASS |

**Section verdict:** ❌ FAIL (4 hard failures, 2 warnings)

**Required fixes before production:**
1. Replace `APPLICABLE_PERCENTAGE_TABLE` constants with TY2025 Rev. Proc. 2024-57 values: 2.06% / 3.09% flat / 4.12–6.18% / 6.18–8.24% / 8.24–8.5%.
2. Change 133–150% bracket to flat: `minContrib: 3.09, maxContrib: 3.09`.
3. Implement `repaymentCap(incomePct: number, isSingleFiler: boolean): number` and apply before routing to Schedule 2.
4. (Higher fidelity) Implement true month-by-month applicable premium computation; monthly input arrays are presently no-op for mid-year changes.

---

## 15. Intermediate — Specialty Forms

### Form 5329 (Early Distributions)

- ✅ **10% early distribution penalty rate (IRC §72(t)(1))** — `EARLY_DIST_RATE = 0.10` correctly applied to `(early_distribution - early_distribution_exception)` net of exceptions.
- ✅ **25% SIMPLE IRA rate (IRC §72(t)(6))** — `SIMPLE_IRA_EARLY_RATE = 0.25` applied to `simple_ira_early_distribution` as a separate Part I path, correctly handling the first-2-years-of-participation elevated penalty.
- ✅ **6% excess contribution penalty (IRC §4973)** — `EXCESS_CONTRIB_RATE = 0.06` applied across Parts III–VIII (traditional IRA, Roth IRA, Coverdell ESA, Archer MSA, HSA, ABLE). The base is correctly capped at `min(excess, account_FMV)` as required by Form 5329 instructions.
- ✅ **All penalty types route to Schedule 2 line 8** — `schedule2Output` aggregates all Part I–VIII taxes into a single `line8_form5329_tax` output.
- ✅ **Exception amount design** — Exceptions are passed as a single numeric `early_distribution_exception` field rather than individually enumerated codes. This correctly delegates exception classification (age 59½, disability, death, SEPP, medical expenses, health insurance, higher education, first home, IRS levy, qualified disasters, SECURE 2.0 emergency/domestic abuse/terminal illness) to the upstream f1099r and UI layers where exception codes are known.
- ⚠️ **`distribution_code` typed as `z.string()` instead of a domain enum** — The field `distribution_code: z.string().optional()` is informational only and not used in any computation, but per the codebase's `z.nativeEnum` convention for finite domain values, this should be typed with a `DistributionCode` enum. No correctness impact, but violates schema-first conventions in CLAUDE.md.
- ⚠️ **SECURE 2.0 Part IX (qualified longevity annuity contracts / QLACs) not represented** — Form 5329 Part IX (added by SECURE 2.0 for QLACs) has no corresponding field. This is a niche scenario but a coverage gap.
- ✅ **Zero-amount early return** — `if (dist <= 0) return 0` guards each helper, and `if (total <= 0) return []` prevents a zero-value Schedule 2 output.

### Form 8606 (Nondeductible IRAs)

- ✅ **Basis tracking from nondeductible contributions** — `totalBasis = nondeductible_contributions + prior_basis` correctly accumulates current-year contributions with the prior-year carry-forward (line 14 of the prior year's Form 8606).
- ✅ **Pro-rata rule across all traditional IRAs** — `basisRatioDenominator = year_end_ira_value + traditional_distributions + roth_conversion` implements Form 8606 line 9 correctly (all traditional IRA value in the denominator, not just the distributing account).
- ✅ **Nontaxable amount capped at basis** — `ratio = Math.min(1, basis / denominator)` prevents the nontaxable portion from exceeding total basis even when denominator < basis (edge case with small year-end values).
- ✅ **Roth conversion taxable amount** — Correctly allocates a pro-rata share of basis to conversions via `nontaxableConversions`, then taxes the remainder. Matches Form 8606 Part II lines 11 and 18.
- ✅ **Taxable amounts routed to f1040 line 4b** — All three taxable components (traditional distributions, Roth conversions, Roth earnings) are summed into a single `line4b_ira_taxable` output.
- ❌ **Line 14 carry-forward basis not emitted as output** — Form 8606 line 14 (remaining basis = total basis - nontaxable portion allocated to distributions) must carry forward to the next tax year. The node computes all the necessary intermediate values but does not emit a `line14_remaining_basis` output. Without this, multi-year tracking of IRA basis is broken: each year's node invocation must receive `prior_basis` from the user/UI, with no authoritative machine-computed carry-forward.
- ⚠️ **Roth distribution ordering rules not fully implemented** — `computePartIII` comment explicitly states "does not implement homebuyer exception or 5-year rule tracking." The simplified calculation (gross distribution minus total Roth basis) is correct for the common case but will over-tax Roth distributions subject to the first-home exception ($10,000 lifetime) or mis-sequence conversions subject to the 5-year seasoning rule. This is a known limitation per inline comment, but should be flagged for TY2025 completeness.
- ✅ **Zero denominator guard** — `if (denominator <= 0) return 0` in `nontaxableTotal` prevents divide-by-zero when all IRA funds have been distributed.
- ✅ **No-basis early return** — `if (basis <= 0)` short-circuits to fully taxable treatment when there are no nondeductible contributions, which is correct.

### Form 4137 (Tip Income)

- ✅ **Unreported tip income to f1040 line 1c** — `f1040Output` routes `line4` (unreported tips) to `line1c_unreported_tips`. Note: allocated tips from W-2 Box 8 (line 1b) are separate; this node correctly handles unreported tips only.
- ✅ **SS tax rate 6.2% (IRC §3121)** — `SS_RATE = 0.062` correct.
- ✅ **Medicare tax rate 1.45% (IRC §3101)** — `MEDICARE_RATE = 0.0145` correct.
- ✅ **SS wage base (TY2025)** — `SS_WAGE_BASE = SS_WAGE_BASE_2025 = 176_100` correct per Rev. Proc. 2024-40 §3.28.
- ✅ **SS tip tax capped at remaining wage base room** — `ssSubjectTips = min(line6, ssWageBaseRoom)` correctly accounts for wages already reported on W-2 (boxes 3+7) via `ss_wages_from_w2`.
- ✅ **Medicare tip tax uncapped** — `medicareTax(line6)` applies to all tips with no ceiling, correct.
- ✅ **Sub-$20/month tips excluded from FICA** — `line6 = medicareSubjectTips(line4, sub_$20_tips)` correctly strips sub-threshold tips from both SS and Medicare bases (IRC §3121(a)(1)).
- ✅ **Total FICA → Schedule 2 line 5** — `schedule2Output` routes to `line5_unreported_tip_tax`. Correct per Form 4137 line 13 → Schedule 2 line 5.
- ⚠️ **Allocated tips (W-2 Box 8) treated as entire unreported amount when `total_tips_received` absent** — When only `allocated_tips` is provided, the node uses that as the full unreported tip amount. This is correct per IRS instructions (allocated tips are treated as received and unreported when the taxpayer cannot substantiate otherwise), but the schema comment could be clearer that `allocated_tips` drives line 1b of Form 1040 (via the W2 node) separately from the FICA tax on unreported tips here.
- ✅ **Additional Medicare Tax (Form 8959) not applicable here** — Form 4137 computes only the employee-share 1.45%; the 0.9% Additional Medicare Tax is correctly handled separately by Form 8959.

### Form 8919 (Uncollected FICA)

- ✅ **Purpose — misclassified worker** — Correctly scoped to workers misclassified as independent contractors who must pay the employee share of FICA on wages.
- ✅ **SS rate 6.2% and Medicare 1.45%** — `SS_RATE = 0.062`, `MEDICARE_RATE = 0.0145`, both correct.
- ✅ **SS wage base cap (TY2025)** — `ssWageBase = SS_WAGE_BASE_2025 = 176_100` applied via `ssSubjectWages = min(wages, remainingBase)`, with prior wages offset via `prior_ss_wages`. Correct.
- ✅ **Routes to Schedule 2 line 6** — `schedule2Output` → `line6_uncollected_8919`. Correct per Form 8919 line 13 → Schedule 2 line 6.
- ✅ **Routes wages to f1040 line 1g** — `f1040Output` → `line1g_wages_8919`. Correct.
- ✅ **Routes wages to Schedule SE** — `scheduleSEOutput` → `wages_8919` on `schedule_se`. Correct — Form 8919 wages are treated as SE income for self-employment tax purposes, and this signal allows Schedule SE to offset its own wage base calculation.
- ✅ **ReasonCode enum A–H** — All eight reason codes (A through H) represented as a `z.nativeEnum(ReasonCode)`, preventing invalid codes at input parse time.
- ✅ **Zero wages early return** — `if (wages <= 0) return { outputs: [] }` prevents spurious outputs.
- ✅ **`ssWageBase` on the class instance** — Declared as `protected readonly ssWageBase = SS_WAGE_BASE_2025` on the class, making it overridable in tests without config mutation.

### Form 7206 (SE Health Insurance)

- ✅ **Above-the-line deduction routes to Schedule 1 line 17** — `output(schedule1, { line17_se_health_insurance: deduction })` correct.
- ✅ **Deduction also routes to agi_aggregator** — Dual-routing to `agi_aggregator` ensures the AGI computation receives the deduction without double-counting risk (aggregator is the source of truth for Schedule 1 Part II sum).
- ✅ **Cannot exceed net SE profit** — `Math.min(afterPtc, seProfit)` correctly enforces the IRC §162(l)(2)(B) profit cap. Deduction cannot create or increase a loss from SE activity.
- ✅ **Premium Tax Credit reduction (IRC §162(l)(2)(B))** — `afterPtc = max(0, eligible - premium_tax_credit)` correctly reduces deductible premiums by any PTC received from Form 8962.
- ✅ **LTC premiums — age-based limits applied** — `eligibleLtcPremiums(premiums, age)` caps LTC premiums at the age bracket amount before combining with health premiums.
- ✅ **Spouse LTC premiums handled separately** — Separate `ltc_premiums_spouse` and `spouse_age` fields with independent age-bracket lookup. Correct.
- ❌ **LTC age-based limit table inconsistency — in-file constants diverge from config** — `LTC_PREMIUM_LIMIT_BY_AGE` is hardcoded directly in `form7206/index.ts` as `{ maxAge: 70, limit: 4_810 }` and `{ maxAge: Infinity, limit: 6_020 }`. The authoritative config at `/forms/f1040/nodes/config/2025.ts` exports `LTC_PREMIUM_LIMITS_2025` with `{ maxAge: 70, limit: 4_770 }` and `{ maxAge: Infinity, limit: 5_970 }`. The in-file values ($4,810 / $6,020) are the TY2024 amounts; the config values ($4,770 / $5,970) are the TY2025 Rev. Proc. 2024-40 §3.34 amounts. Form 7206 does not import from config, so it uses stale TY2024 LTC limits. This is an **active correctness defect** — taxpayers aged 61–70 or 71+ will receive a slightly over-stated LTC deduction. Fix: import and use `LTC_PREMIUM_LIMITS_2025` from config instead of the inline table.
- ⚠️ **Medicare and employer-subsidized coverage month exclusion not implemented** — IRC §162(l)(2)(B) also excludes months in which the taxpayer was eligible for Medicare Part A/B or had access to an employer-subsidized health plan. The schema has no `medicare_months` or `employer_subsidized_months` fields, so coverage-month proration is not enforced. This is a meaningful gap for taxpayers who became Medicare-eligible mid-year.
- ⚠️ **`se_net_profit` defaults to 0 when not provided** — `seProfit = input.se_net_profit ?? 0` means an undefined profit silently clamps the deduction to $0. If the caller omits `se_net_profit` accidentally, the deduction is silently suppressed rather than failing validation. The field should either be required (not `.optional()`) or zero should not be the silent default.

**Section 15 (prior forms) verdict:** ❌ FAIL — Form 7206 uses stale TY2024 LTC premium limits ($4,810/$6,020) instead of TY2025 config values ($4,770/$5,970). Form 8606 does not emit a line 14 carry-forward basis output, breaking multi-year IRA basis tracking. All other forms are functionally correct with minor warnings noted above.


### Form 6252 (Installment Sales)

- ✅ **Gross profit ratio formula** — `grossProfitRatio = gross_profit / contract_price` matches Form 6252 line 16 / IRC §453(c). Zero-denominator guard prevents divide-by-zero.
- ✅ **Installment sale income = GPR × payments received** — `installmentSaleIncome(gpr, payments)` is the correct Form 6252 line 19 computation.
- ✅ **Depreciation recapture recognized in year of sale** — `recapture > 0` immediately routes to `form4797 { ordinary_gain: recapture }` regardless of capital-asset status, satisfying IRC §453(i)(1).
- ✅ **§1231 gain routes to Form 4797** — `is_capital_asset === false` correctly routes installment income to `form4797 { section_1231_gain }`.
- ⚠️ **Short-term capital gain routed via `line_1a_proceeds / line_1a_cost: 0`** — When `is_capital_asset && !is_long_term`, the code pushes `{ line_1a_proceeds: income, line_1a_cost: 0 }`. This works for a positive gain but is semantically fragile: installment income is a net amount, not a proceeds/cost pair. A dedicated Schedule D field (e.g., `line_5_short_term_other`) would be clearer and avoid misinterpretation.
- ❌ **Long-term capital gain routed to `line_11_form2439`** — When `is_capital_asset && is_long_term`, income is sent to `schedule_d { line_11_form2439 }`. Line 11 of Schedule D is specifically for gains from Form 2439 (undistributed long-term capital gains from RICs/REITs). Installment sale long-term gains belong on Schedule D line 12 per the Form 6252 instructions. Using `line_11_form2439` conflates two distinct income sources.
- ❌ **Related-party installment sale rules absent (IRC §453(e))** — When a related party sells the property before all installments are received, the original seller must recognize the remaining deferred gain immediately. No `is_related_party` flag or accelerated recognition logic is implemented. This is a meaningful gap for related-party transactions.
- ❌ **Interest income not separated** — Installment sale contracts carry stated or imputed interest; interest received is ordinary income, not installment income. The schema has no `interest_received` field, so interest income is not separately reported to Schedule B. The gross profit ratio is applied to all payments without stripping the interest component first.

### Form 6781 (Section 1256 Contracts)

- ✅ **60/40 split constants correct** — `LONG_TERM_RATE = 0.60`, `SHORT_TERM_RATE = 0.40` per IRC §1256(a)(3).
- ✅ **Mark-to-market input model** — `net_section_1256_gain` is the aggregate mark-to-market gain/loss, consistent with the year-end MTM requirement of IRC §1256(a)(1).
- ✅ **Prior-year loss carryover reduces current net** — `net = gross - carryover` correctly models the carryover reduction per IRC §1256(f)(2).
- ✅ **Long-term 60% portion routed to Schedule D** — Correctly separated and routed.
- ❌ **Short-term loss routing is broken** — When `stAmount < 0` (net §1256 loss year), `output(schedule_d, { line_1a_proceeds: stAmount, line_1a_cost: 0 })` passes a negative proceeds value. `line_1a_proceeds` is semantically a non-negative field. A loss must be represented as `{ line_1a_proceeds: 0, line_1a_cost: Math.abs(stAmount) }` or via a signed net-gain field. This produces an invalid short-term loss representation for every net-loss year.
- ❌ **Part II straddle losses not implemented** — Form 6781 Part II covers losses from non-§1256 straddle positions (IRC §1092). The schema has no straddle loss fields. The file header mentions straddles but the node only computes Part I. This is a significant gap for options traders with mixed straddle positions.
- ⚠️ **Long-term amount also uses `line_11_form2439`** — Same misrouting concern as Form 6252: §1256 long-term gains/losses belong on Schedule D line 12 (per Form 6781 instructions) not line 11 (Form 2439). Affects line-level reporting accuracy on Schedule D.

### Form 7203 (S-Corp Basis)

- ✅ **Basis ordering per Reg. 1.1367-1(f)** — Increases → distributions → nondeductible expenses → losses. All four steps implemented correctly in sequence.
- ✅ **Loss allowed first from stock basis, then debt basis** — `allowedFromStock = min(pool, stockBasis)`, then `allowedFromDebt = min(remaining, debtBasis)`. Correct two-tier limitation per IRC §1366(d)(1).
- ✅ **Prior-year suspended losses included in pool** — `totalLossPool = ordinary_loss + prior_year_unallowed_loss`. Correctly carries forward per IRC §1366(d)(2).
- ✅ **Disallowed loss add-back reverses upstream S-corp loss posting** — `basis_disallowed_add_back` to `schedule1` and `agi_aggregator` correctly offsets the over-posted upstream loss.
- ❌ **Suspended loss carryforward not emitted as output** — IRC §1366(d)(2) requires disallowed losses to carry forward indefinitely until basis is restored. The node computes `disallowed` but does not emit it as a carry-forward output field. Multi-year suspended loss tracking requires manual caller input with no machine-computed authoritative value.
- ❌ **Excess distributions (capital gain) not computed** — When `distributions > stockBasisAfterIncreases`, the excess is a capital gain under IRC §1368(b)(2). The node clamps at zero and silently drops the excess; no capital gain is routed to Schedule D. Taxpayers with distributions exceeding basis will have understated capital gains.
- ⚠️ **Debt basis restoration not tracked** — When losses consume debt basis, the reduced basis must be restored in future years when S-corp income is recognized (Reg. 1.1367-2(c)). No `debt_basis_net_of_prior_losses` output is emitted. Debt basis restoration is entirely left to caller state management.
- ⚠️ **Only ordinary loss/income modeled** — Separately stated K-1 items (capital gains/losses, §1231 items, charitable contributions, investment interest) that also affect basis under IRC §1367 are not represented in the schema.

### Form 8824 (Like-Kind Exchange)

- ✅ **Amount realized includes all boot components** — `amountRealized` correctly sums FMV received + cash + other property + liabilities assumed by buyer − liabilities assumed by taxpayer.
- ✅ **Gain recognized = min(gain realized, boot received), floored at 0** — Correctly applies the lesser-of rule; returns 0 when realized ≤ 0 (loss deferral per §1031).
- ✅ **Zero boot → zero recognized gain** — When no boot is received, recognized gain = 0. Correct.
- ✅ **§1231 vs. capital gain routing** — `gain_type` enum correctly directs recognized gain to `form4797 { section_1231_gain }` or `schedule_d { line_11_form2439 }`.
- ✅ **Post-TCJA real-property scope documented** — Header comment notes "Only real property qualifies after TCJA 2017." Enforcement is delegated to the UI layer. Acceptable.
- ❌ **Basis of replacement property not computed or emitted** — Form 8824 line 25: `basis_replacement = basis_relinquished + boot_paid − boot_received + gain_recognized`. This is required for future depreciation schedules and eventual sale of the replacement property. The node computes all necessary intermediate values but never calculates or emits this output. This is a material omission.
- ❌ **Related-party like-kind exchange rules absent (IRC §1031(f))** — If both parties are related persons, any disposition by either party within 2 years triggers gain recognition in the original transaction. No `is_related_party` flag or 2-year rule logic exists.
- ⚠️ **Deferred loss not signaled** — When `realized < 0`, the exchange correctly produces zero recognized gain, but no output signals that a deferred loss was created. The deferred loss reduces replacement property basis, which is already uncomputed.

### Form 8853 (Archer MSA / LTC)

- ✅ **LTC per-diem daily limit $420 (TY2025)** — Imports `LTC_PER_DIEM_DAILY_LIMIT_2025 = 420` from `config/2025.ts`. Correctly applied as `$420 × ltc_period_days`. Matches Rev. Proc. 2024-40 §2.62.
- ✅ **Archer MSA deduction: min(taxpayer_contrib, line3_limitation, compensation)** — Triple-cap per IRC §220(b) correctly applied. Returns 0 when employer made any contribution per IRC §220(b)(1).
- ✅ **Archer MSA taxable distributions = max(0, net_dist − qualified_expenses)** — Correct; non-qualified distributions are fully taxable.
- ✅ **20% Archer MSA penalty** — `ARCHER_MSA_PENALTY_RATE = 0.20` applied to taxable distributions; waived on death, disability, or age 65+ exception. Correct per IRC §220(f)(4).
- ✅ **Medicare Advantage 50% penalty** — `MEDICARE_ADVANTAGE_PENALTY_RATE = 0.50` applied; exception is death or disability only (not age 65). Correctly differentiated from Archer MSA per IRC §138(c)(2).
- ✅ **LTC exclusion = max(per-diem limit, actual costs)** — `exclusion = max(perDiemLimit, actualCosts)` then `limitation = max(0, exclusion − reimbursements)`. Correct per Form 8853 Section C lines 23–26.
- ✅ **All routing destinations correct** — Deduction → Schedule 1 line 23; taxable income → Schedule 1 line 8e; penalties → Schedule 2 lines 17e/17f. All match form instructions.
- ⚠️ **HDHP contribution limits not validated in-node** — Schema accepts a pre-computed `line3_limitation_amount` from the UI rather than computing it from HDHP deductible ranges per IRC §220(b)(2). No in-node catch for an incorrectly computed limitation.
- ⚠️ **Excess Archer MSA contributions not routed to Form 5329** — Contributions exceeding the lesser of the limitation or compensation trigger a 6% excise tax via Form 5329. This node does not detect over-contributions or emit a Form 5329 signal.

### Form 4684 (Casualties & Thefts)

- ✅ **Post-TCJA federal disaster gate** — `if (!input.is_federal_disaster) return []` correctly blocks personal casualty deductions for non-disaster events per IRC §165(h)(5) as amended by TCJA.
- ✅ **$100 per-event floor** — `personalLossAfterFloor = max(0, loss − 100)` correctly applies IRC §165(h)(1).
- ✅ **10% AGI floor** — `personalLossAfterAgiFloor = max(0, afterFloor − agi × 0.10)` correctly applies IRC §165(h)(2), applied after the $100 floor (correct order).
- ✅ **Raw loss = min(FMV decline, basis) − insurance** — Matches Form 4684 Section A line 9 calculation.
- ✅ **Business §1231 property routes to Form 4797** — `output(form4797, { ordinary_gain: -loss })` correctly sends business casualty losses as a negative ordinary amount.
- ✅ **Business property has no per-event or AGI floors** — Correct; §165(h) floors apply only to personal property.
- ❌ **Non-§1231 business loss routes to `line_11_form2439` (long-term Schedule D line)** — When `business_is_section_1231 === false`, the code uses `output(schedule_d, { line_11_form2439: -loss })`. Line 11 is the long-term capital gains section (Form 2439/6252). A casualty loss on capital-asset investment property should route to a short-term Schedule D line (line 1 or line 5), not the long-term line 11. This misclassifies the loss as long-term regardless of actual holding period.
- ⚠️ **Casualty gain not handled** — When insurance proceeds exceed adjusted basis the taxpayer realizes a taxable casualty gain. `rawLoss` floors at zero and silently drops gains rather than routing them as income (Schedule D or Form 4797 depending on property type).
- ⚠️ **Single-event model only** — The schema handles one personal and one business casualty event per node invocation. Multiple federally declared disasters in the same year require separate node invocations; no per-event aggregation is built in.

### Form 4952 (Investment Interest)

- ✅ **Total interest = current year + prior carryforward** — `totalInterest = investment_interest_expense + prior_year_carryforward` correctly implements Form 4952 line 3 / IRC §163(d)(2).
- ✅ **Deductible = min(total interest, NII)** — `deductibleInterest = Math.min(total, nii)` correctly limits the deduction to net investment income per IRC §163(d)(1).
- ✅ **Routes to Schedule A line 9** — `output(scheduleA, { line_9_investment_interest: deductible })` is the correct destination per Form 4952 line 7 → Schedule A line 9.
- ✅ **NII election design** — Schema accepts a pre-computed `net_investment_income` encompassing the taxpayer's LTCG/QD election, delegating the election to the caller/UI. Acceptable design.
- ❌ **Excess interest carryforward not emitted as output** — When total interest > NII, the disallowed amount (`total − deductible`) must carry forward to the next year per IRC §163(d)(2). The node computes all necessary values but does not emit a carryforward output. Multi-year tracking of investment interest carryforwards requires manual caller input with no machine-computed authoritative value.
- ⚠️ **Zero-NII path provides no carryforward signal** — When `nii = 0`, `deductible = 0` and `return { outputs: [] }` is correct for Schedule A, but the absence of any output provides no signal that a carryforward exists. A downstream caller cannot determine the disallowed amount without independently recomputing it.
- ⚠️ **NII composition not validated** — `net_investment_income` is a single pre-computed number with no in-node check that it contains only IRC §163(d)(4) income categories. An upstream assembly error is silently accepted.

**Specialty forms section verdict:** ❌ FAIL — Multiple material defects across the group. Form 6252 routes long-term installment gains to the wrong Schedule D line (line 11 vs. line 12) and lacks related-party rules and interest income separation. Form 6781 has broken short-term loss routing (negative proceeds field) and missing Part II straddle coverage. Form 7203 does not emit suspended-loss carryforwards or excess-distribution capital gains. Form 8824 does not compute or emit replacement property basis (Form 8824 line 25). Form 4684 routes non-§1231 business losses to the long-term Schedule D line regardless of holding period. Form 4952 does not emit the investment interest carryforward. Form 8853 is the strongest of the group with only advisory warnings.

### Form 5695 (Residential Energy Credits)

- ✅ **Part I rate:** 30% applied to all qualifying solar/wind/geothermal/battery costs (`PART_I_RATE = 0.30`). Correct per IRC §25D(a).
- ✅ **Part I — no general dollar cap:** No overall dollar cap on Part I total. Only the fuel-cell-specific per-kW cap ($1,000/kW via `FUEL_CELL_CAP_PER_KW`) exists, correct per §25D(b)(1). All other Part I property types are uncapped.
- ✅ **Part I — battery storage eligibility:** Correctly gates on ≥3 kWh capacity before including battery cost (`BATTERY_MIN_KWH = 3`). Per §25D(d)(7).
- ✅ **Part I — carryforward:** Prior-year §25D carryforward included in `partICredit()` before routing. Correct per §25D(c).
- ✅ **Part I — nonrefundable routing:** Routes to `schedule3.line5_residential_energy`. Schedule 3 feeds nonrefundable credits — correct.
- ✅ **Part II rate:** 30% applied across all Part II items (`PART_II_RATE = 0.30`). Correct per §25C(a).
- ✅ **Part II annual cap:** $1,200 cap on standard items (`PART_II_ANNUAL_CAP = 1_200`). Insulation has no separate per-item cap before the $1,200 annual cap — correctly uncapped at the item level per §25C(c)(1).
- ✅ **Part II — windows:** $600 per-item cap via `PER_ITEM_CAP = 600`. Correct per §25C(b)(1)(B).
- ✅ **Part II — exterior doors:** $250/door cap, $500 total (`EXTERIOR_DOOR_PER_DOOR_CAP = 250`, `EXTERIOR_DOOR_TOTAL_CAP = 500`). Correct per §25C(b)(3)(B).
- ✅ **Part II — home energy audit:** $150 cap (`ENERGY_AUDIT_CAP = 150`). Correct per §25C(b)(4).
- ✅ **Part II — heat pump/biomass combined cap:** $2,000 applied to heat pump + heat pump water heater + biomass combined, separately from the $1,200 annual cap (`HEAT_PUMP_BIOMASS_CAP = 2_000`). Correct per §25C(b)(2).
- ✅ **Part II routing:** `cappedStandard + hpBiomass` routes total to `schedule3.line5_residential_energy`. Both credits are nonrefundable — correct.

### Form 8396 (Mortgage Interest Credit)

- ✅ **Credit formula:** `mortgage_interest_paid × mcc_rate` in `tentativeCredit()`. Correct per IRC §25(a)(1).
- ✅ **High-rate cap:** $2,000 cap when `mcc_rate > 0.20`. Uses `MCC_MAX_CREDIT_HIGH_RATE_2025 = 2_000` from config. Correct per IRC §25(a)(2).
- ✅ **Low-rate behavior:** No cap when `mcc_rate ≤ 0.20`. Correct — statute only imposes cap above 20%.
- ✅ **Carryforward:** Prior-year carryforward added after cap in `totalCredit(capped, carryforward)`. Correct per IRC §25(e)(1) (3-year carryforward).
- ✅ **Routing:** Routes to `schedule3.line6f_mortgage_interest_credit`. Correct destination for nonrefundable credits.
- ⚠️ **Schedule A interaction not modeled:** The MCC portion of mortgage interest used to compute the credit is not deductible on Schedule A (only the remaining interest is deductible per Form 8396 instructions). The node emits no Schedule A reduction signal. If Schedule A receives the full mortgage interest from Form 1098 without reducing by the MCC-credited portion, the deduction will be overstated. Integration gap — not a node-internal error, but warrants documentation.

### Form 4972 (Lump Sum Distributions)

- ✅ **Eligibility gate:** Only `born_before_1936 === true` taxpayers may elect special treatment. Correct per Form 4972 Part I.
- ✅ **Election requirement:** At least one of `elect_capital_gain` or `elect_10yr_averaging` required to produce output. Correct.
- ✅ **Part II — capital gain rate:** 20% flat rate on pre-1974 capital gain portion (`CAPITAL_GAIN_RATE = 0.20`). Correct per Form 4972 line 7.
- ✅ **Part III — 10-year averaging:** `taxOn1986Rate(oneTenth) * 10` correctly applies the 1986 schedule to one-tenth of ordinary income. Correct per Form 4972 lines 11–13.
- ✅ **1986 rate brackets:** 16-bracket schedule matches IRS Form 4972 Schedule G (permanent; does not change year to year). Verified against published brackets.
- ✅ **MDA formula:** `min($10,000, 50% × ordinaryIncome) − 20% × max(0, ordinaryIncome − $20,000)`, floored at 0. Constants from config: `MDA_MAX = 10_000`, `MDA_PHASE_OUT_THRESHOLD = 20_000`, `MDA_PHASE_OUT_RATE = 0.20`, `MDA_ZERO_THRESHOLD = 70_000`. Formula and all constants match Form 4972 lines 15–17. Correctly zeroes at $70,000.
- ✅ **Death benefit exclusion:** Capped at $5,000 via schema `.max(DEATH_BENEFIT_MAX)` (`DEATH_BENEFIT_MAX_2025 = 5_000`). Deducted from ordinary income before 10-year averaging. Correct per Form 4972 line 10.
- ✅ **Routing:** Routes to `schedule2` (`lump_sum_tax`). Correct — lump sum distribution tax is additional tax on Schedule 2.

### Form 982 (Discharge of Indebtedness)

- ✅ **Exclusion types:** All five IRC §108(a)(1) categories modeled: Bankruptcy (line 1a), Insolvency (line 1b), FarmDebt (line 1c), RealPropertyBusiness (line 1d), QPRI (line 1e). Correct.
- ✅ **Bankruptcy — no dollar cap:** `Infinity` cap for Title 11. Correct per §108(a)(1)(A).
- ✅ **Insolvency cap:** Capped at `insolvency_amount` (excess of liabilities over FMV of assets immediately before discharge). Correct per §108(a)(1)(B), §108(a)(3).
- ✅ **QPRI caps:** $750,000 standard / $375,000 MFS (`QPRI_CAP_STANDARD_2025`, `QPRI_CAP_MFS_2025` from config). Correct for TY2025 per IRC §108(a)(1)(E); applies to discharges before January 1, 2026.
- ✅ **Taxable excess routing:** COD exceeding the cap routes to `schedule1.line8c_cod_income`. Correct — the taxable portion of COD is ordinary income.
- ✅ **Fully excluded amount:** When COD ≤ cap, no output produced. Correct.
- ⚠️ **Tax attribute reduction not modeled:** IRC §108(b) requires reduction of tax attributes (NOL carryovers, basis, credit carryovers, passive loss carryovers) following exclusion. Noted in code comments as out of scope for a 1040 return engine. Acceptable limitation, but callers should be aware excluded COD carries unmodeled downstream basis/NOL implications.
- ⚠️ **Insolvency amount default:** When `insolvency_amount` is omitted for `ExclusionType.Insolvency`, cap silently defaults to 0 and the entire COD becomes taxable. Conservative but a silent mistake trap. Schema-level cross-validation requiring `insolvency_amount` when `exclusion_type === Insolvency` would reduce risk.

### Form 461 (Excess Business Loss)

- ✅ **EBL thresholds (TY2025):** `EBL_THRESHOLD_SINGLE_2025 = 313_000` and `EBL_THRESHOLD_MFJ_2025 = 626_000` in config. Correct per IRC §461(l) and Rev. Proc. 2024-40 §3.30.
- ✅ **NOL carryforward treatment:** Excess business loss routed to `schedule1.line8p_excess_business_loss` as positive other income (ELA notation). Correct per IRC §461(l) — disallowed excess is added back to income and becomes an NOL carryforward.
- ✅ **Aggregation pattern:** Accepts `excess_business_loss` as scalar or array, summing across all upstream sources (Schedule C, E, F, K-1). Correct.
- ✅ **Routing:** Routes to `schedule1.line8p`. Correct destination.
- ⚠️ **Threshold enforcement delegated entirely upstream:** Form 461 receives pre-computed `excess_business_loss`; it does not independently apply the $313k/$626k threshold. The `filing_status` field is accepted but unused in computation — purely informational. Correctness depends entirely on upstream schedule nodes enforcing the threshold per filing status. If any upstream node passes raw business loss without applying the threshold, Form 461 has no guard to catch it.

**Section 15 verdict:** ⚠️ WARN — Forms 5695, 4972, 982, and 461 all implement correct core formulas, constants, and routing with no hard calculation failures. Form 8396 is also correct within its own scope. Three cross-cutting warnings: (1) Form 8396 does not emit a Schedule A mortgage interest reduction signal as required by MCC rules; (2) Form 982 tax attribute reduction is out of scope and unguarded; (3) Form 461 delegates threshold enforcement entirely to upstream nodes with no defensive check in the node itself.

---

## 10. Intermediate — Capital Gains

### QDCGTW (Qualified Dividends & Capital Gain Tax Worksheet)

- ❌ **Node is a stub — no QDCGT computation performed.** The `qdcgtw` node accepts `line18_28pct_gain` from `rate_28_gain_worksheet` but `compute()` unconditionally returns `{ outputs: [] }`. No preferential rate calculation is executed at this node.
- 🔍 **QDCGT logic lives in `income_tax_calculation`, not in `qdcgtw`.** The full worksheet (IRC §1(h)) is implemented inline in `income_tax_calculation/index.ts`. This is functional but architecturally split: the named worksheet node is a no-op while the real computation is embedded elsewhere.
- ✅ **QDCGT algorithm in `income_tax_calculation` is mathematically correct.** Lines map as: L5 = `min(qualDiv + netCG, taxableIncome)`, L6 = `taxableIncome − L5`, L9 = `max(0, min(taxableIncome, zeroCeiling) − ordinary)`, L10 = `L5 − L9`, L13 = `max(0, twentyFloor − max(ordinary, zeroCeiling))`, L14 = `min(L10, L13)`, L15 = `L10 − L14`. Tax = `bracketTax(ordinary) + L14×15% + L15×20%`. This correctly implements the IRS QDCGT worksheet structure for the 0%/15%/20% tiers.
- ✅ **TY2025 0%/15%/20% thresholds are correct.** `QDCGT_ZERO_CEILING_2025` and `QDCGT_TWENTY_FLOOR_2025` in `config/2025.ts` match Rev. Proc. 2024-40 §3.02 values (Single: $48,350 / $533,400; MFJ: $96,700 / $600,050; MFS: $48,350 / $300,025; HOH: $64,750 / $566,700; QSS: $96,700 / $600,050).
- ❌ **`line18_28pct_gain` is received by `qdcgtw` but never used.** The 28% rate gain (collectibles, §1202) flows from `rate_28_gain_worksheet` → `qdcgtw`, but `qdcgtw.compute()` discards it. The `income_tax_calculation` QDCGT function does not accept a `line18_28pct_gain` input — so collectibles gain at 28% is silently excluded from the final tax calculation. This understates tax for taxpayers with collectibles gains whose ordinary rate is below 28%, and misstates the rate tier for those above 28%.
- ⚠️ **Unrecaptured §1250 gain at 25% is not connected to the QDCGT tax calculation.** The `unrecaptured_1250_worksheet` feeds `schedule_d` (line 19), but neither `income_tax_calculation` nor `qdcgtw` receives or applies the 25% rate. For taxpayers with §1250 gain from real property depreciation, the preferential rate structure is incomplete.
- ⚠️ **`qdcgtw` input schema is insufficient for future full implementation.** When eventually implemented, the node will also need: taxable income, qualified dividends, net capital gain, unrecaptured §1250 gain, and filing status. Current schema only declares `line18_28pct_gain`.

### 28% Rate Gain Worksheet

- ✅ **Correct inputs identified.** Accepts `collectibles_gain_from_8949` (Form 8949 adjustment codes C/Q via schedule_d) and `collectibles_gain` (1099-DIV box 2d). These are the correct two sources of 28% rate gain per IRC §1(h)(5)–(6).
- ✅ **Net gain computation is correct.** `netGain()` = `collectibles_gain_from_8949 + collectibles_gain` — correct aggregation of both sources as the worksheet total.
- ✅ **Zero guard is correct.** Returns empty outputs when no 28% gain exists, avoiding spurious downstream routing.
- ✅ **Routes correctly to `qdcgtw`.** Output field `line18_28pct_gain` matches Schedule D Tax Worksheet line 18 semantics and is deposited to the `qdcgtw` node.
- ❌ **28% rate is never applied to tax liability.** While the worksheet correctly computes `line18_28pct_gain` and routes it to `qdcgtw`, the `qdcgtw` node is a stub that discards the value. Collectibles gain is therefore effectively taxed at the ordinary bracket rate rather than the capped 28% maximum rate, resulting in incorrect tax for high-income filers with collectibles whose ordinary rate exceeds 28%.
- ⚠️ **§1202 exclusion gain (code Q) aggregated with collectibles.** Comment references code Q (QOF/§1202 partial exclusion) but §1202 gain and collectibles gain have distinct treatment under IRC §1(h)(5) vs. §1202(a). Aggregating them into a single `collectibles_gain_from_8949` field conflates two separate provisions that may warrant separate line items on the Schedule D Tax Worksheet.

### Unrecaptured §1250 Worksheet

- ✅ **Per-property §1250 gain formula is correct.** `propertyUnrecapturedGain()` = `min(prior_depreciation_allowed, gain_on_sale)` — correctly caps §1250 gain at actual gain realized, per IRC §1250 and IRS Pub. 544.
- ✅ **Aggregation across multiple properties is correct.** Uses accumulator pattern with `normalizeArray()`, summing all property dispositions.
- ✅ **REIT/fund distributions included.** Accepts `unrecaptured_1250_gain` from f1099div box 2b — correct per IRS Unrecaptured Section 1250 Gain Worksheet instructions.
- ✅ **Routes `line19_unrecaptured_1250` to `schedule_d`.** This is the correct destination — Schedule D line 19 carries the unrecaptured §1250 gain amount used in the Schedule D Tax Worksheet.
- ✅ **Zero guard is correct.** Returns empty outputs when total §1250 gain is zero.
- ✅ **Circular dependency avoided correctly.** Uses a `ScheduleDStubNode` typed stub to reference `schedule_d` without importing it directly, preventing a circular import from the f1099div → unrecaptured_1250 → schedule_d chain.
- ❌ **25% rate is never applied.** The worksheet correctly computes the §1250 gain amount and delivers it to Schedule D, but the downstream path to applying 25% to this gain in the tax calculation does not exist. `income_tax_calculation` does not receive `line19_unrecaptured_1250` from Schedule D and has no 25% rate tier in its QDCGT function. The 25% rate required by IRC §1(h)(1)(D) is entirely absent.
- ⚠️ **Loss-sale inputs not guarded.** `gain_on_sale` accepts zero (nonnegative). A property sold at a loss should not route to this worksheet; only profitable sales generate §1250 gain. No upstream guard exists to prevent zero or near-zero gain properties from being routed here unnecessarily.

### Form 8949

- ✅ **All 12 parts enumerated correctly** (A–C short-term 1099-B/no-1099-B/other; D–F long-term equivalents; G–I short-term digital asset 1099-DA; J–L long-term digital asset). TY2025 digital asset parts G–L are correctly included per updated IRS Form 8949 instructions.
- ✅ **`is_long_term` correctly derived upstream.** Set by the upstream input node from the part; long-term parts D/E/F/J/K/L correctly classify as long-term for Schedule D routing.
- ✅ **`gain_loss` formula is correct.** Comment documents `col h = d − e + g` (proceeds − cost_basis + adjustment_amount), matching IRS Form 8949 column h instructions.
- ✅ **Routes all transactions to `schedule_d`** via the `transaction` accumulation key. Correct destination.
- ✅ **Dual-input pattern handled.** Supports both nested `transaction` object and flat field inputs; `flatFieldsToTransaction()` correctly requires all required fields before constructing a transaction.
- ⚠️ **`adjustment_codes` is unvalidated `z.string().optional()`.** Wash sale (W), §1256 mark-to-market (M), collectibles (C), §1202 exclusion (Q), and other IRS-defined codes are accepted as free-form strings with no validation or enum. An invalid or misspelled code passes through silently, and downstream nodes that branch on specific codes (e.g., `rate_28_gain_worksheet` filtering for codes C/Q) may silently miss the transaction.
- ⚠️ **`adjustment_amount` sign not enforced per code.** For wash sale disallowance (code W), the adjustment must be positive (disallowed loss added back, increasing gain_loss). For §1202 exclusions the adjustment is negative. No per-code sign constraint exists — an incorrectly signed wash sale adjustment would produce a wrong `gain_loss` value.
- ⚠️ **No wash sale consistency check.** A transaction with code W should have `adjustment_amount > 0` and a resulting `gain_loss` differing from raw `proceeds − cost_basis`. No cross-field validation enforces this relationship.

**Section verdict:** ❌ FAIL

**Critical issues:**
1. `qdcgtw` node is an unimplemented stub — the 28% collectibles rate and 25% unrecaptured §1250 rate are never applied to tax liability. The pipeline is plumbed (rate_28_gain_worksheet → qdcgtw, unrecaptured_1250_worksheet → schedule_d) but the terminal application of these rates is missing.
2. `income_tax_calculation` QDCGT function implements only 0%/15%/20% tiers — no 25% tier for §1250 gain and no 28% tier for collectibles. Any taxpayer with collectibles or rental real property depreciation recapture will have their capital gains taxed at incorrect rates.
3. The architectural split (QDCGT logic in `income_tax_calculation` rather than `qdcgtw`) means expanding to include 25%/28% rates requires modifying `income_tax_calculation` and wiring new inputs, not simply implementing the stub `qdcgtw` node.

**Lower-priority gaps:** `adjustment_codes` lacks enum validation; `adjustment_amount` sign not enforced per wash-sale / exclusion code; §1202 gain conflated with collectibles in the 28% worksheet.

---

## 11. Intermediate — QBI Deduction

### Form 8995 (Below Threshold)

- ✅ QBI rate: `QBI_RATE = 0.20` (20%) — correct per IRC §199A(a).
- ✅ Income limitation: `incomeLimit()` = 20% × max(0, taxable_income − net_capital_gain). Correctly caps total QBI deduction at 20% of (taxable income minus net capital gains), preventing deduction from reducing income below zero.
- ✅ Aggregated QBI: `totalQbi()` sums `qbi_from_schedule_c + qbi_from_schedule_f + qbi` — correctly aggregates all qualified business income sources before applying the 20% rate.
- ✅ Loss carryforward netting: `netQbi()` = totalQbi + qbi_loss_carryforward (nonpositive). Prior-year net losses correctly reduce current-year QBI before the 20% rate is applied.
- ✅ REIT/PTP/cooperative dividends: `reitComponent()` = 20% × net §199A dividends (with prior-year REIT loss carryforward offset). Added separately to QBI component before income cap — correct structure per Form 8995 lines 6–8.
- ✅ Deduction cannot go negative: `qbiDeduction()` returns 0 when `total ≤ 0` or limit floor is 0 (via `Math.max(0, ...)` in `incomeLimitBase()`). Cannot produce a negative deduction.
- ✅ W-2 wage / UBIA limitations not applied: Fields `w2_wages` and `unadjusted_basis` are accepted as informational inputs but play no role in any computation. The simplified form correctly omits wage-limit logic for below-threshold filers per IRC §199A.
- ✅ Output routing to f1040 line 13: `this.outputNodes.output(f1040, { line13_qbi_deduction: deduction })` — correct.
- ✅ Additional output to `standard_deduction` node: `this.outputNodes.output(standard_deduction, { qbi_deduction: deduction })` ensures the `standard_deduction` node subtracts the QBI deduction when computing Form 1040 line 15 taxable income. Correct integration.
- ✅ AGI fallback for income limit: When `taxable_income` is absent, the node derives a proxy using `agi − standardDeductionAmount(input)`, including all age/blindness additional factors. This mirrors the `standard_deduction` worksheet computation, providing a correct pre-aggregation estimate.
- ⚠️ `hasQbiActivity()` does not check `qbi_from_schedule_f`: The early-exit guard checks `qbi_from_schedule_c`, `qbi`, `line6_sec199a_dividends`, and both carryforwards — but does NOT check `qbi_from_schedule_f`. A taxpayer with only Schedule F (farming) QBI and all other fields absent or zero will receive `outputs: []` with no deduction, despite having positive farming QBI eligible for the 20% deduction. Fix: add `(input.qbi_from_schedule_f ?? 0) > 0` to `hasQbiActivity()`.
- ⚠️ `qbi_from_schedule_c` and `qbi_from_schedule_f` typed `.nonnegative()`: Both fields disallow negative values. However, a Schedule C or Schedule F loss produces negative QBI, which should reduce the aggregated QBI pool (or produce a carryforward). Providing a net loss business via these named fields will cause a Zod validation error rather than being accepted as a loss. The composite `qbi` field correctly allows negative values; the two named fields create an inconsistent interface. Consider removing `nonnegative()` from these fields, or routing losses exclusively through `qbi` and documenting this constraint.

### Form 8995A (Above Threshold)

- ✅ Threshold constants: `QBI_THRESHOLD_SINGLE_2025 = 197_300`, `QBI_THRESHOLD_MFJ_2025 = 394_600` — both correct per Rev. Proc. 2024-40 §3.24. Single/MFS/HOH/QSS all use the single threshold ($197,300), which is correct.
- ✅ Phase-in range: `QBI_PHASE_IN_RANGE_2025 = 100_000`. Used uniformly across all filing statuses, consistent with Rev. Proc. 2024-40 §3.24 and the research documentation. (IRC §199A(b)(3)(B)(ii) text uses $50,000 for MFS in the original statute, but Rev. Proc. 2024-40 supersedes this with indexed amounts that yield $100,000 for TY2025 for all statuses — consistent with IRS Form 8995-A instructions.)
- ✅ `reductionRatio()`: Computes `clamp((taxableIncome − threshold) / PHASE_IN_RANGE, 0, 1)`. Returns 0 below threshold, 1 fully above range, and a linear fraction within the range. Correct.
- ✅ SSTB phase-out: `adjustedSstbAmounts()` scales SSTB QBI, W-2 wages, and UBIA by `(1 − ratio)`. At ratio=0 (below threshold), full SSTB amounts retained; at ratio=1 (fully above range), SSTB completely excluded. Correct per IRC §199A(d)(3).
- ✅ W-2 wage limitation rates: `W2_LIMIT_A_RATE = 0.50`, `W2_LIMIT_B_WAGE_RATE = 0.25`, `UBIA_RATE = 0.025`. `applicableWageLimit()` = max(50% × W2, 25% × W2 + 2.5% × UBIA). Correct per IRC §199A(b)(2)(A).
- ✅ Phase-in blending of wage limitation: For 0 < ratio < 1, `qbiComponent()` reduces the deduction by `ratio × max(0, beforeLimit − wageLimit)`. Correctly blends from no limitation at threshold to full limitation at top of range. `max(0, ...)` correctly handles the case where wage limit exceeds the uncapped deduction (no reduction needed).
- ✅ REIT/PTP component: `reitComponent()` applies 20% to net §199A dividends with loss carryforward offset. REIT dividends correctly excluded from W-2 wage limitation.
- ✅ Overall income cap: `incomeCap()` = 20% × max(0, taxable_income − net_capital_gain). `Math.min(totalBeforeCap, cap)` applied correctly.
- ✅ Loss netting: `combinedTotals()` adds `qbi_loss_carryforward` to combined gross QBI. Cross-business netting (non-SSTB + adjusted SSTB combined) is correct.
- ✅ Input validation: `filing_status` and `taxable_income` are required fields (not `.optional()`). Appropriate since Form 8995A cannot compute meaningful results without them.
- ❌ Missing `standard_deduction` output route: Form 8995A routes only to `f1040` (`{ line13_qbi_deduction: deduction }`), but does NOT emit to the `standard_deduction` node. The `standard_deduction` worksheet computes `line15_taxable_income = max(0, agi − deduction − qbi_deduction)`. Without receiving `qbi_deduction` from Form 8995A, above-threshold filers will have the QBI deduction reflected on Form 1040 line 13 but NOT subtracted when computing line 15 taxable income, overstating taxable income and the resulting income tax. Form 8995 (below threshold) correctly routes to both `f1040` and `standard_deduction`. Fix: add `standard_deduction` to `outputNodes` and emit `{ qbi_deduction: deduction }` alongside the f1040 output.
- ⚠️ No per-source QBI breakdown: Form 8995A accepts a single aggregated `qbi` field for all non-SSTB income. Upstream must pre-aggregate Schedule C, Schedule F, and Schedule E QBI before routing. This is a valid design choice but differs from Form 8995's `qbi_from_schedule_c` / `qbi_from_schedule_f` breakdown, making business-level tracing harder and creating an inconsistent upstream interface depending on which form is used.

**Section verdict:** ⚠️ WARN

**Critical defect (Form 8995A):** Missing `standard_deduction` output route causes Form 1040 line 15 (taxable income) to be overstated for all above-threshold filers whose QBI deduction flows through Form 8995A. The deduction appears on line 13 but is not subtracted on line 15 (❌).
**Logic gap (Form 8995):** `hasQbiActivity()` does not check `qbi_from_schedule_f` — farming-only QBI filers incorrectly receive no deduction (⚠️).
**Schema concern (Form 8995):** `qbi_from_schedule_c` and `qbi_from_schedule_f` typed `.nonnegative()` rejects net-loss businesses; should allow negative values consistent with `qbi` field (⚠️).

---

## 7. Intermediate — Credits (EITC, CTC/ACTC, Child Care, Saver's)

**Files reviewed:**
- `forms/f1040/nodes/intermediate/forms/eitc/index.ts`
- `forms/f1040/nodes/intermediate/forms/form2441/index.ts`
- `forms/f1040/nodes/intermediate/forms/form8880/index.ts`
- `forms/f1040/nodes/inputs/f8812/index.ts`
- `forms/f1040/nodes/config/2025.ts`

---

### 7.1 EITC Node (`intermediate/forms/eitc/index.ts`)

#### Constants Verified Against Rev. Proc. 2024-40, §3.11

| Item | Expected | Config Value | Status |
|------|----------|-------------|--------|
| Max credit — 0 children | $649 | $649 | PASS |
| Max credit — 1 child | $4,328 | $4,328 | PASS |
| Max credit — 2 children | $7,152 | $7,152 | PASS |
| Max credit — 3 children | $8,046 | $8,046 | PASS |
| Phase-in end — 0 children | $8,490 | $8,490 | PASS |
| Phase-in end — 1 child | $12,730 | $12,730 | PASS |
| Phase-in end — 2/3 children | $17,880 | $17,880 | PASS |
| Phase-out start single — 0 children | $10,620 | $10,620 | PASS |
| Phase-out start MFJ — 0 children | $17,850 | $17,850 | PASS |
| Phase-out start single — 1/2/3 | $23,511 | $23,511 | PASS |
| Phase-out start MFJ — 1/2/3 | $30,323 | $30,323 | PASS |
| Income limit single — 0 children | $18,591 | $18,591 | PASS |
| Income limit MFJ — 0 children | $25,511 | $25,511 | PASS |
| Income limit single — 1 child | $49,084 | $49,084 | PASS |
| Income limit MFJ — 1 child | $56,004 | $56,004 | PASS |
| Income limit single — 2 children | $55,768 | $55,768 | PASS |
| Income limit MFJ — 2 children | $62,688 | $62,688 | PASS |
| Income limit single — 3 children | $59,899 | $59,899 | PASS |
| Income limit MFJ — 3 children | $66,819 | $66,819 | PASS |
| Investment income limit | $11,950 | $11,950 | PASS |

#### Phase-in Rates

| Children | IRS Rate (IRC §32(b)) | Code Value | Status |
|----------|----------------------|------------|--------|
| 0 | 7.65% | 7.65% | PASS |
| 1 | 34.00% | 34.00% | PASS |
| 2 | 40.00% | 40.00% | PASS |
| 3 | 40.00% | 45.00% | FAIL — IRS rate for 3+ children is 40% (same as 2 children per IRC §32(b)(1)(B)(iii)). Code has 0.4500. Overcalculates credit for 3-child filers. |

#### Phase-out Rates

| Children | IRS Rate (IRC §32(b)) | Code Value | Status |
|----------|----------------------|------------|--------|
| 0 | 7.65% | 7.65% | PASS |
| 1 | 15.98% | 15.98% | PASS |
| 2 | 21.06% | 21.06% | PASS |
| 3 | 21.06% | 21.06% | PASS |

#### Logic Issues

FAIL — Phase-in rate for 3 children is wrong.
`eitc/index.ts` line 33: `PHASE_IN_RATE[3] = 0.4500`. IRC §32(b)(1)(B)(iii) and Rev. Proc. 2024-40 §3.11 set the rate for 3+ children at 40% (same as 2 children). Fix: change `3: 0.4500` to `3: 0.4000`.

FAIL — Phase-out uses earned income instead of max(earned income, AGI).
`eitc/index.ts` line 131: `phaseOutCredit(creditBeforePhaseout, earnedIncome, ...)` passes `earnedIncome` as the phase-out base. IRC §32(b)(1)(B) requires the phase-out to be computed against the greater of earned income or AGI. The `agi` variable is computed on line 108 but not passed to `phaseOutCredit`. For filers with unearned income lifting AGI above earned income (e.g., capital gains, taxable Social Security), this understates the phase-out and overcalculates the credit. Fix: pass `Math.max(earnedIncome, agi)` to `phaseOutCredit`.

FAIL — MFS filing status does not disqualify EITC.
IRC §32(d) explicitly bars married individuals who file separately from claiming EITC. The node has no guard against `FilingStatus.MFS`. A MFS filer will receive a positive EITC when they should receive $0. Fix: add `if (input.filing_status === FilingStatus.MFS) return 0;` inside `computeEitc`.

WARN — Income limit boundary uses >= (disqualifies at exact limit).
`eitc/index.ts` line 125: `if (earnedIncome >= incomeLimit) return 0`. At the exact limit the phase-out has already reduced credit to $0, so this is functionally safe. No fix required, but a comment explaining the redundant guard would reduce confusion.

WARN — `form8862_filed` accepted in schema but never read.
`eitc/index.ts` line 67: field is in the schema but `computeEitc` never checks it. If prior-year EITC disallowance tracking is in scope, this guard is missing. If deferred to a separate node, the field should be removed or documented.

WARN — Investment income composition not validated in-node.
`investment_income` is accepted as a pre-computed aggregate. The node correctly applies the disqualification test. Correctness depends entirely on upstream nodes summing the right categories (interest + dividends + cap gains + net rental). An integration test covering this composition is recommended.

---

### 7.2 Form 2441 Node (`intermediate/forms/form2441/index.ts`)

FAIL — Node is incomplete: IRC §21 dependent care credit is entirely unimplemented.
The node only computes the IRC §129 employer-provided care taxable excess routed to `f1040.line1e_taxable_dep_care`. The IRC §21 dependent care credit (Form 2441 Parts I-III) — the credit that benefits most taxpayers paying child or dependent care — is missing. The config already has all required constants but none are imported or used.

Missing logic:
- Qualifying expense caps: $3,000 (1 person) / $6,000 (2+ persons) applied to actual care expenses paid.
- Expense reduction by employer-provided care (Form 2441 Line 29).
- AGI-based credit rate: 35% at AGI <= $15,000, stepping down 1% per $2,000 AGI increment to 20% floor.
- Earned income limitation (credit cannot exceed lower of either spouse's earned income, or statutory amount for FT student/disabled spouse).
- Nonrefundable credit output to Schedule 3 Line 2.
- MFS filing status exclusion.

FAIL — MFS employer exclusion cap is wrong.
`form2441/index.ts` line 14: `const EMPLOYER_EXCLUSION_LIMIT = 5000` applied to all filers. IRC §129(a)(2) caps the MFS exclusion at $2,500. The `filing_status` field is absent from the input schema. Fix: add `filing_status` to schema and apply `DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025` ($2,500) for MFS.

PASS — Employer-provided care taxable excess computation is correct for non-MFS filers.
`Math.max(0, benefits - 5000)` correctly identifies the §129 excess for non-MFS filers.

NOTE — Config constants for the §21 credit are fully defined but unused.
`DEP_CARE_EXPENSE_CAP_ONE_2025`, `DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025`, `DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025`, `DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025`, and `DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025` all exist in `config/2025.ts` but are not imported or used, confirming the §21 credit is pending.

---

### 7.3 Form 8880 Node (`intermediate/forms/form8880/index.ts`)

#### Constants Verified Against Rev. Proc. 2024-40, §3.43

| Item | Expected | Config Value | Status |
|------|----------|-------------|--------|
| Contribution cap per person | $2,000 | $2,000 | PASS |
| Single/MFS 50% ceiling | $23,000 | $23,000 | PASS |
| Single/MFS 20% ceiling | $25,000 | $25,000 | PASS |
| Single/MFS 10% ceiling | $38,250 | $38,250 | PASS |
| HOH 50% ceiling | $34,500 | $34,500 | PASS |
| HOH 20% ceiling | $37,500 | $37,500 | PASS |
| HOH 10% ceiling | $57,375 | $57,375 | PASS |
| MFJ 50% ceiling | $46,000 | $46,000 | PASS |
| MFJ 20% ceiling | $50,000 | $50,000 | PASS |
| MFJ 10% ceiling | $76,500 | $76,500 | PASS |

#### Logic Issues

FAIL — QSS (Qualifying Surviving Spouse) uses Single AGI thresholds instead of MFJ thresholds.
`form8880/index.ts` lines 63-79: `creditRate` branches on MFJ and HOH, then falls through to the Single/MFS block for all other statuses including QSS. Per IRS Form 8880 instructions for TY2025, QSS filers use MFJ thresholds ($46,000 / $50,000 / $76,500). A QSS filer with AGI between $38,251 and $46,000 will receive 0% under the Single path when they should receive 10% under the MFJ path. Fix: add `|| status === FilingStatus.QSS` to the MFJ branch condition on line 63.

PASS — Distributions lookback reduces eligible contributions correctly.
`eligibleContribution(contributions, distributions)` computes `max(0, contributions - distributions)` capped at $2,000. Matches Form 8880 Lines 3-4.

PASS — Nonrefundable credit limited by income tax liability.
Lines 138-140: credit capped at `income_tax_liability` when provided. Correct for IRC §25B nonrefundable credit.

PASS — Both IRA contributions and elective deferrals aggregated per person before offset and cap.

PASS — Explicit per-person deferral fields take precedence over combined field.

WARN — Age/student/dependent eligibility (IRC §25B(c)) not enforced in-node.
IRC §25B(c) bars eligibility if under 18, full-time student, or a dependent. Acceptable if upstream gate enforces this, but that path needs an integration test.

WARN — Combined `elective_deferrals` field cannot sum across multiple W-2 feeders.
If multiple W-2 nodes each send deferrals through the combined field and `elective_deferrals_taxpayer` is not set, only the last-arriving value will be used. Multi-employer deferral totals may be understated.

---

### 7.4 F8812 Node — CTC/ACTC (`inputs/f8812/index.ts`)

#### Constants Verified Against P.L. 119-21 (OBBBA)

| Item | Expected | Config Value | Status |
|------|----------|-------------|--------|
| CTC per qualifying child | $2,200 | $2,200 | PASS |
| ODC per non-child dependent | $500 | $500 | PASS |
| ACTC max per child | $1,700 | $1,700 | PASS |
| Phase-out threshold MFJ | $400,000 | $400,000 | PASS |
| Phase-out threshold other | $200,000 | $200,000 | PASS |
| Phase-out step | $50 per $1,000 ceiling | $50 / ceil($1,000) | PASS |
| ACTC earned income floor | $2,500 | $2,500 | PASS |
| ACTC earned income rate | 15% | 15% | PASS |

#### Logic Issues

PASS — Phase-out uses ceiling rounding per IRS instructions.
`Math.ceil(excess / 1000)` on line 104.

PASS — Modified AGI add-backs computed correctly (Lines 2a-2c: PR excluded income, Form 2555 amounts, Form 4563 amount).

PASS — Nonrefundable CTC limited by income tax liability before ACTC computed.
Correct sequencing: nonrefundable credit first, ACTC from unabsorbed remainder.

PASS — ACTC per-child cap applied.
`tentativeActc = Math.min(ctcUnused, totalQualifyingChildren * ACTC_MAX_PER_CHILD)`.

PASS — ACTC is higher of Part II-A (earned income method) or Part II-B (payroll tax), capped at tentative ACTC.
Line 256: `Math.min(tentativeActc, Math.max(partIIA, partIIB))`.

PASS — Part II-B payroll tax method correctly gated on 3+ children or PR resident.

PASS — Form 2555 filers blocked from ACTC (IRC §24(d)(1)).

WARN — Nontaxable combat pay may double-count earned income.
`computeEffectiveEarnedIncome` adds `nontaxable_combat_pay` to `earned_income`. If the W-2 node already includes combat pay in `earned_income`, this double-counts. The IRC §32 election is relevant only when combat pay is not already included. Confirm W-2 node behavior.

WARN — `auto_filing_status` uses `z.string()` instead of `filingStatusSchema`.
Line 57: cast via `as F8812Item["filing_status"]` without validation. An unexpected string silently falls through to the $200,000 threshold. Fix: use `filingStatusSchema` for type safety.

NOTE — `combinedAgi` accumulator is dead code.
Accumulated in lines 169 and 184 but never read. `combinedModifiedAgi` is the controlling figure. Remove `combinedAgi`.

---

### 7.5 Summary — Section 7 Priority Fixes

| Priority | Node | Issue |
|----------|------|-------|
| CRITICAL | eitc | Phase-in rate for 3 children is 45% — should be 40% (line 33) |
| CRITICAL | eitc | Phase-out uses earnedIncome instead of max(earnedIncome, agi) — understates phase-out (line 131) |
| CRITICAL | eitc | MFS filers not disqualified — must return 0 for FilingStatus.MFS |
| CRITICAL | form2441 | IRC §21 dependent care credit entirely unimplemented — only employer exclusion handled |
| CRITICAL | form2441 | MFS employer exclusion uses $5,000 instead of $2,500 — no filing_status in schema |
| HIGH | form8880 | QSS uses Single AGI thresholds instead of MFJ thresholds (line 63) |
| MEDIUM | f8812 | auto_filing_status should use filingStatusSchema not z.string() |
| MEDIUM | f8812 | Nontaxable combat pay double-count risk — confirm W-2 node excludes it from earned_income |
| LOW | eitc | form8862_filed in schema but never read — remove or implement |
| LOW | f8812 | combinedAgi accumulator is dead code — remove |

## 4. Intermediate — Aggregation Nodes

### AGI Aggregator

- ✅ Core AGI formula correct: `AGI = grossIncome(input) - exclusions(input) - aboveLineDeductions(input)`, clamped to zero
- ✅ All major 1040 income lines covered: wages (1a), unreported tips (1c), taxable dep care (1e), adoption benefits (1f), Form 8919 wages (1g), taxable interest (2b), ordinary dividends (3b), IRA taxable (4b), pension taxable (5b), SS taxable (6b), capital gain (7), cap gain distrib (7a)
- ✅ Schedule 1 Part I additions covered: state refund, Schedule C, Form 4797 gains, Schedule E, Schedule F, unemployment, COD income, Archer MSA dist, other income lines
- ✅ Above-the-line deductions covered: educator expenses (line 11), employee biz expenses (line 12), HSA deduction (line 13), moving expenses (line 14), SE deduction (line 15), SEP/SIMPLE (line 16), SE health insurance (line 17), early withdrawal penalty (line 18), student loan interest (line 19), IRA deduction (line 20), Archer MSA deduction (line 23), §501(c)(18)(D) pension (line 24f)
- ✅ IRC §911 exclusions applied: FEIE, foreign housing deduction, EE/I bond exclusion
- ✅ SSA taxability worksheet (IRC §86) implemented with correct MFJ thresholds ($32k/$44k) and other thresholds ($25k/$34k); QSS correctly treated as MFJ
- ✅ `line6b_ss_taxable` pre-computed passthrough supported — skips worksheet if already computed upstream
- ✅ AGI fanned out to all downstream consumers: `standard_deduction`, `scheduleA`, `eitc`, `f8812`, `f2441`, `form8995`
- ✅ No mutation; all helpers return new values; early-return pattern used
- ⚠️ `filing_status` typed as `z.string().optional()` — inconsistent with `FilingStatus` native enum used elsewhere in the codebase (e.g., `schedule_d` uses `z.nativeEnum(FilingStatus)`). Risk: invalid filing status strings silently fall through to "other" SSA threshold without validation error
- ⚠️ SSA provisional income uses `otherAgi = nonSsaIncome - exclusions - aboveLineDeductions`. IRS Pub 915 Worksheet 1 defines provisional income as other income items BEFORE above-the-line deductions (i.e., use gross non-SSA income, not reduced by deductions). This understates provisional income and can understate SSA taxable amount for taxpayers with large above-the-line deductions
- ⚠️ `alimony paid` (Schedule 1 Part II line 19a, pre-2019 divorce instruments) is absent from the schema. Pre-2019 alimony is still deductible under IRC §215 for instruments executed before 2019. This is a missing above-the-line deduction for affected taxpayers
- ⚠️ `line13_depreciation` schema comment references "Form 4562" but Form 4562 depreciation flows through Schedule C/E/F income lines, not as a standalone Schedule 1 Part II deduction. The only Schedule 1 line 13 item is the HSA deduction. This field label is misleading and its routing basis is unclear
- ⚠️ `at_risk_disallowed_add_back`, `biz_interest_disallowed_add_back`, `basis_disallowed_add_back` are included in `nonSsaIncome()` and `scheduleOnePartI()` but these are not formal Schedule 1 Part I line items on the IRS form — they are engine-internal recapture adjustments. Including them in the SSA provisional income base is technically correct for economic income purposes but may need documentation
- ❌ Line 1b (tip income reported on W-2 Box 7, directly allocated tips) is absent from the income schema. IRS Form 1040 line 1b specifically covers Box 7 tip amounts from W-2s that are not already in Box 1. This creates a gap for tipped workers whose employer did not include Box 7 tips in Box 1 wages

### Schedule 2 (Additional Taxes)

- ✅ Line 1: AMT (`line1_amt` from Form 6251 line 11) — correct
- ✅ Line 2: Excess advance premium tax credit repayment (`line2_excess_advance_premium` from Form 8962 line 29) — correct
- ✅ Line 4: Self-employment tax (`line4_se_tax` from Schedule SE line 12) — correct
- ✅ Line 5: Unreported SS/Medicare tax on tips (`line5_unreported_tip_tax` from Form 4137 line 13) — correct
- ✅ Line 6: Uncollected SS/Medicare on wages (`line6_uncollected_8919` from Form 8919 line 13) — correct
- ✅ Line 7a: Household employment taxes (`line7a_household_employment` from Schedule H) — correct
- ✅ Line 8: Form 5329 additional taxes (early distributions, excess contributions) — correct
- ✅ Line 9: §965 net tax liability installment — correct
- ✅ Line 10: Homebuyer credit repayment, recapture tax, LIHTC recapture — all aggregated correctly
- ✅ Line 11: Additional Medicare Tax from Form 8959 (`line11_additional_medicare`) — correct for TY2025 numbering
- ✅ Line 12: NIIT from Form 8960 (`line12_niit`) — correct for TY2025 numbering
- ✅ Line 13: Uncollected FICA on tips + GTL insurance (`uncollected_fica` + `uncollected_fica_gtl`) — correct
- ✅ Line 17a: Investment credit recapture from Form 4255 — correct
- ✅ Line 17b: Non-qualified HSA distribution penalty from Form 8889 — correct
- ✅ Line 17d: Kiddie Tax from Form 8615 — correct
- ✅ Line 17e: Archer MSA additional tax (Form 8853 line 9b) — correct
- ✅ Line 17f: Medicare Advantage MSA additional tax (Form 8853 Section B line 13b) — correct
- ✅ Line 17h: §409A excise tax — combines W-2 Box 12 Code Z and 1099-MISC box 15 sources — correct
- ✅ Line 17k: Golden parachute excise — combines W-2 Box 12 Code K and 1099-NEC sources — correct
- ✅ Line 17z: BBA audit partner tax (Form 8978) — correct
- ✅ All totals aggregated into single `line17_additional_taxes` output to f1040 — correct
- ✅ Returns empty outputs when total is zero — correct early return
- ⚠️ The `lump_sum_tax` (Form 4972) schema comment says "Line 17c" — in TY2025 Schedule 2 line 17c is lump-sum distribution tax (Form 4972), which is correct. This field is summed into the undifferentiated total; there is no sub-total separation for Schedule 2 Part I vs Part II within the engine, which is acceptable since the final total to f1040 is correct
- 🔍 NOTE: The audit request described AMT as "Line 1", NIIT as "17b", and Additional Medicare as "17a" — those are pre-2021 line numbers. The TY2025 Schedule 2 renumbered these to lines 1, 12, and 11 respectively. The code uses the correct TY2025 numbering

### Schedule 3 (Additional Credits/Payments)

- ✅ Line 1: Foreign tax credit — correctly combines Form 1116 (`line1_foreign_tax_credit`) and de minimis 1099 foreign taxes (`line1_foreign_tax_1099`) — correct per Treas. Reg. §1.901-1
- ✅ Line 2: Child and dependent care credit from Form 2441 — correct
- ✅ Line 3: Education credits from Form 8863 — correct
- ✅ Line 4: Retirement savings contributions credit from Form 8880 — correct
- ✅ Line 5: Residential energy credits from Form 5695 (§25C + §25D) — correct
- ✅ Line 6b: Nonrefundable child tax credit from Form 8812 — correct
- ✅ Line 6c: Adoption credit from Form 8839 — correct
- ✅ Line 6d: Clean vehicle credit (Form 8936) and elderly/disabled credit (Schedule R) — both mapped to line6d and summed correctly
- ✅ Line 6e: Prior year minimum tax credit from Form 8801 — correct
- ✅ Line 6f: Mortgage interest credit from Form 8396 — correct
- ✅ Line 6z: General business credit from Form 3800 — correct
- ✅ Line 9: Net premium tax credit from Form 8962 line 26 (Part II refundable) — correct
- ✅ Line 10: Amount paid with extension (Form 4868) — correct
- ✅ Line 11: Excess social security withheld — correct
- ✅ Line 13: §1446 withholding tax credit from Form 8805 — correct
- ✅ Part I total → f1040 `line20_nonrefundable_credits`; Part II total → f1040 `line31_additional_payments` — correct routing
- ❌ Line 12 (Form 2439 — credit for tax paid on undistributed capital gains from RICs/REITs, IRC §852(b)(3)(D)) is absent from Part II. Form 2439 Box 2 credit flows to Schedule 3 line 12. This is a missing payment credit that directly reduces tax owed
- ❌ Line 14 (Form 4136 — credit for federal tax paid on fuels, IRC §34) is absent from Part II. This credit applies to farmers, off-highway business use, and other qualifying fuel uses. Missing from the payments aggregation
- ⚠️ `line6b_low_income_housing_credit` field name shares the `line6b` prefix with `line6b_child_tax_credit`, creating naming ambiguity. LIHTC flows through Form 3800 GBC to Schedule 3 line 6a/6z — not line 6b. The engine tracks it separately for audit traceability per comment, but the field name implies an incorrect form line

### Schedule B (Interest & Dividends)

- ✅ Part I: Taxable interest correctly summed across multiple payers via `normalizeArray` accumulation pattern
- ✅ EE/I bond exclusion (Form 8815) correctly subtracted before routing to f1040 `line2b_taxable_interest`, clamped to zero
- ✅ Part II: Ordinary dividends correctly summed from all payers
- ✅ Dual routing to both `f1040` (line 2b, 3b) and `agi_aggregator` (line2b, line3b) — correct; AGI aggregator needs these directly
- ✅ Returns empty outputs when both interest and dividends are zero — correct early return
- ✅ Per-payer accumulation via `accumulable()` union schema — handles executor multi-deposit pattern correctly
- ✅ No mutation; immutable accumulation via `reduce`
- ⚠️ No $1,500 Schedule B filing threshold check — the node always routes regardless of amount. For amounts ≤ $1,500 with no foreign accounts, Schedule B is not required by IRS. This does not affect tax math but produces unnecessary Schedule B output for small amounts. Low severity
- ⚠️ `box3_us_obligations` is accepted in the schema but never used in any calculation within this node — the Form 8815 exclusion is pre-computed upstream and passed as `ee_bond_exclusion`. This field is dead weight in the schema
- ❌ Part III (Foreign Account / Trust Disclosures) — Schedule B Part III requires disclosure of foreign financial accounts (FBAR trigger) and foreign trusts. These are purely informational fields (no tax math), but their complete absence means the engine cannot generate a complete Schedule B for filers with these obligations. Not a calculation error but a form-completeness gap
- 🔍 NOTE: Qualified dividends (`line3a`) are not handled here — per design, f1099div routes `line3a_qualified_dividends` directly to f1040 and income_tax_calculation. Schedule B does not affect the qualified dividends rate, so this division of responsibility is correct

### Schedule D (Capital Gains/Losses)

- ✅ Short-term vs long-term correctly bifurcated: f8949 transactions use pre-computed `is_long_term` flag; d_screen transactions use part codes (D/E/F/J/K/L → LT, all others → ST)
- ✅ Capital loss limit correctly applied: $3,000 standard (`CAPITAL_LOSS_LIMIT = -3_000`), $1,500 for MFS (`CAPITAL_LOSS_LIMIT_MFS = -1_500`) per IRC §1211(b)
- ✅ Line 7 (net short-term) and Line 15 (net long-term) computed independently before combining to Line 16
- ✅ Net capital gain for QDCGT worksheet: `min(line15, line16)` when both positive (Line 17 = Yes condition) — correct per Schedule D instructions
- ✅ COD property gains always classified as LT (FMV - debt cancelled per pair) — correct
- ✅ Form 8949 integration via accumulation pattern — multiple f8949 node outputs correctly merged
- ✅ d_screen aggregate lines (1a, 8a) handled with correct gain = proceeds - cost basis
- ✅ Prior-year carryovers supported via `line_6_carryover` (ST) and `line_14_carryover` (LT) in d_screen path
- ✅ Cap gain distributions from f1099div (`line13_cap_gain_distrib`) included in line 15 — correct
- ✅ 28% Rate Gain Worksheet triggered for collectibles (code "C") LT transactions — correct per IRC §1(h)(5)
- ✅ `rate_28_gain_worksheet` node receives collectibles gain from f8949 transactions — correct routing
- ✅ No activity early return correctly skips all outputs when `hasCapitalActivity` is false
- ❌ `collectibles_gain_form2439` is accepted in the schema but never routed to `rate_28_gain_worksheet`. Form 2439 Box 1e collectibles gain must flow to the 28% Rate Gain Worksheet line 4 per IRS instructions. This field is silently dropped
- ❌ QOF (Qualified Opportunity Fund) adjustment code "Q" is included in `RATE_28_CODES` and routes transactions to `rate_28_gain_worksheet`. QOF inclusion events (IRC §1400Z-2) are taxed at ordinary/LTCG rates based on the underlying asset character — they do NOT trigger the 28% rate. The 28% rate applies only to collectibles gains and unrecaptured §1250 gains. Code "Q" should be removed from `RATE_28_CODES`
- ⚠️ `capital_loss_carryover` (f8949 path) schema comment explicitly says "informational; not used in current-year calc". However, prior-year capital loss carryovers ARE a current-year deduction per IRC §1212(b) and Schedule D instructions (line 6 for ST, line 14 for LT). The d_screen path handles this via `line_6_carryover`/`line_14_carryover`, but the f8949-only path has no equivalent mechanism — a filer using only f8949 transactions with a prior-year carryover would not have it applied
- ⚠️ `line19_unrecaptured_1250` is accepted (from `unrecaptured_1250_worksheet`) but marked informational and not routed to `income_tax_calculation`. The QDCGT worksheet requires unrecaptured §1250 gain as a direct input (Schedule D Tax Worksheet line 19). This routing gap means `income_tax_calculation` cannot correctly apply the 25% rate on §1250 recapture without receiving this value through another path
- 🔍 NOTE: Form 4797 gains/losses are handled via `line4_other_gains` in the AGI aggregator — Schedule D itself does not receive Form 4797 Part I LT capital gains directly. Verify that the Form 4797 node routes its LT capital component to both AGI aggregator and schedule_d to avoid a gap in LT gain from business property sales

**Section verdict:** ⚠️ WARN

- AGI Aggregator: 1 ❌ (missing line 1b tip wages), 4 ⚠️ (filing_status enum type, SSA provisional income formula uses reduced AGI instead of gross income per Pub 915, missing alimony deduction, misleading depreciation field label). Core AGI math is correct for most common cases
- Schedule 2: 0 ❌, 1 ⚠️. All major additional tax lines present and correctly numbered for TY2025
- Schedule 3: 2 ❌ (missing Form 2439 line 12 credit, missing Form 4136 line 14 fuel credit), 1 ⚠️ (LIHTC field naming). Missing payment credits affect refund computation for affected filers
- Schedule B: 1 ❌ (no Part III foreign disclosure), 2 ⚠️. Tax math is correct; form-completeness gap only
- Schedule D: 2 ❌ (Form 2439 collectibles gain not routed to 28% worksheet, QOF code "Q" incorrectly in RATE_28_CODES causing incorrect 28% rate trigger), 2 ⚠️ (f8949-path carryover gap, §1250 gain not routed to income_tax_calculation)

---

## 15. Intermediate — Specialty Forms

### Form 8615 (Kiddie Tax)

- ✅ Unearned income threshold = $2,600 (`KIDDIE_TAX_UNEARNED_INCOME_THRESHOLD_2025 = 2_600`; Rev. Proc. 2024-40 §3.10; IRC §1(g)(4)(A)(ii)(I)) — correct
- ✅ Standard deduction floor = $1,300 (`KIDDIE_TAX_STANDARD_DEDUCTION_FLOOR_2025 = 1_300`; IRC §1(g)(4)(A)(ii)(II)) — correct
- ✅ Net unearned income computation: `taxableNUI = max(0, nui - $2,600)` — threshold applied correctly. Node accepts `net_unearned_income` as pre-computed (after caller applies the two $1,300 floors); comment correctly documents this as the caller's responsibility.
- ✅ Child's tax computed at parent's marginal rate via stacking: `combinedTax(parentIncome + taxableNUI) - parentTax` — IRC §1(g)(1) implemented correctly with bracket tables for all parent filing statuses (MFJ/QSS, MFS, Single/HOH)
- ✅ Routes to `schedule2.line17d_kiddie_tax` — correct per Form 8615 Part II line 15 → Schedule 2 Line 17d
- ✅ Brackets: QSS mapped to MFJ (correct), MFS mapped to its own table (correct), HOH/Single fall-through to Single table (correct)
- ❌ Age eligibility not enforced: no `age` or `is_full_time_student` fields in schema. The kiddie tax applies only to children under 19 (or under 24 if full-time student) — IRC §1(g)(2). Any caller routing to this node bypasses the age/student check entirely; no defense-in-depth guard.
- ❌ Joint filing exception not enforced: IRC §1(g)(2)(A) exempts children who file a joint return. No `files_jointly` field exists; the node cannot detect or block this ineligible case.
- ⚠️ Form 8814 (parent election to include child's income on parent return) not referenced or linked. When a parent elects Form 8814, Form 8615 is not filed — the node has no awareness of that election and no guard against double-counting.
- ⚠️ `parent_taxable_income` and `parent_tax` consistency not validated. If a caller provides mismatched values, the incremental tax computation may produce incorrect results with no validation error.

**Section verdict:** ⚠️ WARN — Dollar thresholds and core kiddie tax stacking math are fully correct. Critical gap: age and joint-filing eligibility guards are absent — the node relies entirely on upstream routing to pre-qualify children, with no defense-in-depth. Form 8814 election interplay is unmodeled.

### Form 8839 (Adoption Credit)

- ✅ Maximum credit = $17,280 per eligible child (`maxCreditPerChild = 17280`; IRS Instructions for Form 8839 Dec 8 2025 / Rev. Proc. 2024-40; IRC §23(b)(1)) — correct for TY2025
- ✅ Phase-out begins at MAGI $259,190, complete at $299,190 (`phaseOutStart = 259190`, `phaseOutRange = 40000`; IRC §23(b)(2); Rev. Proc. 2024-40) — correct
- ✅ Special needs adoption: `perChildBaseline()` returns full remaining max credit regardless of actual expenses (IRC §23(d)(3)) — correct
- ✅ Foreign adoption — credit blocked until adoption is final (`is_foreign_child && adoption_is_final !== true → 0`; IRC §23(e)(2)) — correct
- ✅ MFS filers blocked (`isBlockedByMfs` returns true for `filing_status === "mfs"`; IRC §23(f)(2)) — correct
- ✅ Nonrefundable credit limited to tax liability (`nonrefundableCredit` caps at `income_tax_liability`; IRC §23(c)(1)) — correct
- ✅ Routes nonrefundable credit to `schedule3.line6c_adoption_credit` — correct per Schedule 3 Part I Line 6c
- ❌ **Refundable path is incorrect for TY2025**: The node has `maxRefundablePerChild = 5000` and emits `f1040.line30_refundable_adoption`. The adoption credit is nonrefundable for TY2025 under current law (the EGTRRA refundability provision applied only in 2010–2012 and has not been re-enacted). Form 1040 Line 30 does not exist in TY2025. This refundable path will inflate refunds for any filer it triggers.
- ❌ No 5-year carryforward: IRC §23(c)(2) allows unused adoption credit to carry forward for up to 5 years. The node discards any credit exceeding current-year tax liability with no carryforward output field or emission. Multi-year filers will permanently lose unused credit.
- ⚠️ Employer-provided adoption benefits exclusion (Part III): `childCount` is derived from `(input.children ?? []).length`. If a taxpayer receives employer benefits for a child not listed in `children` (e.g., employer benefits only, no credit claimed), the exclusion cap (`maxCreditPerChild × childCount`) will be $0, making all employer benefits incorrectly taxable.
- ⚠️ Phase-out fraction rounded to 3 decimal places before applying to credit amounts. IRS instructions round the final credit amount, not an intermediate fraction. This may introduce minor rounding discrepancies vs. the IRS worksheet.

**Section verdict:** ❌ FAIL — Two critical correctness issues: (1) the refundable adoption credit path is legally inapplicable for TY2025 and will generate incorrect refunds; (2) the 5-year carryforward per IRC §23(c)(2) is absent, causing permanent loss of unused credit for taxpayers with insufficient tax liability.

### Form 8815 (Savings Bond Exclusion)

- ✅ Phase-out start MFJ/QSS = $145,200 (`SAVINGS_BOND_PHASEOUT_START_MFJ_2025 = 145_200`; IRC §135(b)(2)(A); Rev. Proc. 2024-40 §3.23) — correct
- ✅ Phase-out end MFJ/QSS = $175,200 (`SAVINGS_BOND_PHASEOUT_END_MFJ_2025 = 175_200`) — correct
- ✅ Phase-out start Single/HOH = $96,800 (`SAVINGS_BOND_PHASEOUT_START_SINGLE_2025 = 96_800`) — correct
- ✅ Phase-out end Single/HOH = $111,800 (`SAVINGS_BOND_PHASEOUT_END_SINGLE_2025 = 111_800`) — correct
- ✅ MFS filers ineligible (`filing_status !== FilingStatus.MFS` check; IRC §135(d)(1)) — correctly blocks exclusion
- ✅ Higher education expense requirement enforced: `expenses === 0 → return { outputs: [] }` — correct
- ✅ Proportional exclusion when expenses < proceeds: `interest × (expenses / proceeds)` (IRC §135(b)(1)(B); Form 8815 line 10) — correct
- ✅ MAGI-based phase-out with linear interpolation: `applyPhaseout()` computes `exclusion × (1 - (magi - start) / range)` — correct per Form 8815 line 14
- ✅ QSS filing status mapped to MFJ phase-out range — correct per Form 8815 instructions
- ✅ Routes to `schedule_b.ee_bond_exclusion` — reduces Schedule B taxable interest; correct routing
- ⚠️ Bond issuance year not validated: IRC §135(c)(1)(B) requires EE bonds to be issued after 1989. No `bond_issue_year` field in schema. Pre-1990 EE bonds are ineligible; the exclusion would be incorrectly granted if a caller includes their interest.
- ⚠️ Bond ownership registration not validated: IRC §135(c)(1)(A) requires bonds to be issued in the taxpayer's name (not a dependent's name). No ownership flag in schema; bonds registered solely in a child's name would incorrectly receive the exclusion.
- ⚠️ `bond_proceeds` defaults to `ee_bond_interest` when omitted (`proceeds = input.bond_proceeds ?? interest`). Callers who omit `bond_proceeds` when principal was also redeemed will receive an overstated exclusion (proportional formula collapses to 100%) with no warning.

**Section verdict:** ✅ PASS (with minor gaps) — All TY2025 dollar thresholds are correct per Rev. Proc. 2024-40. Phase-out logic, MFS block, proportional exclusion, and MAGI linear interpolation are all correct. Minor gaps: bond issuance year and ownership registration are not validated (caller trust dependencies), and the `bond_proceeds` default silently overstates exclusion when proceeds exceed interest and are omitted.

---

## 16. Input Nodes

### K-1 Partnership

- ✅ **Box 1 ordinary business income/loss routes to Schedule E (via `schedule1 line5_schedule_e`)** — correct destination per IRS K-1 (Form 1065) instructions.
- ✅ **Box 2 net rental real estate and Box 3 other net rental income/loss route to Schedule E** — aggregated with Box 1 into `line5_schedule_e`. Correct destination.
- ✅ **Box 5 interest income routes to `schedule_b` per-payer** — correct per-payer entries with `payer_name` and `taxable_interest_net`. Correct.
- ✅ **Box 6a ordinary dividends routes to `schedule_b` per-payer** — correct.
- ✅ **Box 6b qualified dividends routes to `f1040 line3a`** — aggregated across all K-1s. Correct.
- ✅ **Box 7 royalties included in Schedule E aggregation** — royalties from a partnership flow to Schedule E (not Schedule E Part I for rental royalties); destination is correct.
- ✅ **Box 8 net STCG/loss routes to `schedule_d line_5_k1_st`** — correct Schedule D Part I destination.
- ✅ **Box 9a net LTCG/loss routes to `schedule_d line_12_k1_lt`** — correct Schedule D Part II destination.
- ✅ **Box 14a SE earnings routes to `schedule_se`** — Box 14a takes priority per item; Box 4a guaranteed payments for services used as fallback. Correct per IRC §1402.
- ✅ **Box 4a guaranteed payments for services included in SE computation** — used as fallback when Box 14a is absent. Correct per Reg. §1.1402(a)-1.
- ✅ **Box 4b guaranteed payments for capital excluded from SE** — correctly omitted from `scheduleSEOutputs()`. Correct per IRC §1402(a).
- ✅ **Box 16 foreign taxes route to `form_1116`** — one output per K-1 with `foreign_tax_paid`. Correct.
- ✅ **Box 20 code Z §199A QBI routes to `form8995`** — QBI, W-2 wages, and UBIA aggregated and forwarded. SSTB flag captured. Correct for non-SSTB items.
- ✅ **Partner outside basis fields present** — `basis_beginning`, `basis_contributions`, `basis_share_of_income/losses`, `basis_distributions`, `basis_liabilities_assumed/relieved` all captured. Pre-2018 basis and at-risk carryovers included.
- ❌ **Box 9b unrecaptured §1250 gain not present** — neither schema field nor routing exists. Partnership K-1 Box 9b reports the partner's share of unrecaptured §1250 gain from real property depreciation, which must flow to the Unrecaptured §1250 Gain Worksheet (Schedule D Tax Worksheet line 11). This is fully absent.
- ❌ **Box 11 other income (various codes) not implemented** — Partnership K-1 Box 11 carries items including: Code A (other income), Code B (involuntary conversions), Code C (§1256 contracts), Code F (section 951A inclusions), and others. None are in the schema or routed. High-complexity filers with GILTI, §1256 gains, or casualty-rule income will have these items silently dropped.
- ❌ **Box 13 deductions not implemented** — Partnership K-1 Box 13 includes self-employed health insurance (code M), self-employed SEP/SIMPLE (code R), depletion (code J), investment interest (code K), and others. None are in the schema or routed. SE health insurance deduction (Schedule 1 line 17) and depletion are significant omissions for partners in resource partnerships.
- ❌ **Box 15 credits not implemented** — Partnership K-1 Box 15 carries low-income housing credit, rehabilitation credit, and other credits that route to specific credit forms (Form 3800 and related). Absent from schema and routing entirely.
- ❌ **Box 17 AMT items not implemented** — Partnership K-1 Box 17 carries AMT adjustments and preferences (e.g., code A for depreciation adjustments, code B for depletion) that route to Form 6251. No `form6251` output node is declared; AMT items are silently dropped. Partners with significant accelerated depreciation or percentage depletion will have understated AMT exposure.
- ⚠️ **SSTB partnership QBI has no Form 8995A routing** — `form8995Output()` aggregates all items together regardless of SSTB flag, then routes to `form8995` (below-threshold form). For SSTB partnership income, above-threshold filers require Form 8995A with SSTB phase-out applied. The `box20_sstb` field is captured but its value is never used to gate or redirect routing; SSTB items are not separated and no `form8995a` output exists.
- ⚠️ **Passive vs. active distinction not tracked** — Box 1, 2, and 3 are aggregated into a single `line5_schedule_e` total without any passive/active flag. Passive activity loss limitation (IRC §469) and material participation are not tracked. All Schedule E income flows through unconditionally, overstating AGI for passive partners with disallowed losses.
- ⚠️ **`scheduleBDividendOutputs` uses `payerName` (camelCase) while `scheduleBInterestOutputs` uses `payer_name` (snake_case)** — inconsistent field naming between the two functions at lines 181 and 193. If `schedule_b` schema treats these as distinct fields, dividend payer identification will be silently dropped; if the schema accepts both spellings, this is harmless. Should be verified and unified.
- ⚠️ **`scheduleSEOutputs` routes using `net_profit_schedule_c` field name on `schedule_se`** — partnership SE earnings from Box 14a are deposited into the `net_profit_schedule_c` accumulation key on `schedule_se`, a field name semantically tied to Schedule C. While functionally equivalent if `schedule_se` treats all contributions as SE income, the naming creates confusion and risks misclassification in downstream reporting.
- ⚠️ **`box16_foreign_income` captured in schema but not routed to `form_1116`** — `form1116Outputs()` emits only `foreign_tax_paid`; the `box16_foreign_income` field (income sourced to foreign jurisdictions) is never forwarded. Form 1116 requires foreign source income to compute the credit limitation; omitting this forces Form 1116 to use a default or zero for the limitation denominator.
- ⚠️ **Duplicate Schedule E routing: both `schedule1` and `agi_aggregator` receive `line5_schedule_e`** — `schedule1Output()` emits to both nodes. Whether this is intentional depends on the aggregation architecture; if `agi_aggregator` independently reads from `schedule1`, this double-counts Schedule E income in AGI.

### K-1 S-Corp

- ✅ **Box 1 ordinary income/loss routes to `schedule1 line5_schedule_e`** — correct for S-corp pass-through income.
- ✅ **Boxes 2 and 3 (rental real estate and other rental) aggregated into Schedule E** — correct destination.
- ✅ **Box 4 interest income routes to `schedule_b` per-payer** — correct.
- ✅ **Box 5a ordinary dividends routes to `schedule_b` per-payer** — correct.
- ✅ **Box 5b qualified dividends routes to `f1040 line3a`** — correct.
- ✅ **Box 6 royalties included in Schedule E aggregation** — correct destination.
- ✅ **Box 7 net STCG/loss routes to `schedule_d line_5_k1_st`** — correct.
- ✅ **Box 8a net LTCG/loss routes to `schedule_d line_12_k1_lt`** — correct.
- ✅ **No Schedule SE routing** — S-corp ordinary income is correctly excluded from self-employment tax per IRC §1402(a)(2). No `schedule_se` in `outputNodes`. Correct.
- ✅ **Box 14 foreign taxes route to `form_1116`** — correct.
- ✅ **Box 16 §199A QBI routes to `form8995`** — non-SSTB items aggregated and forwarded; SSTB flag checked and SSTB items excluded from the non-SSTB aggregation. Correct for below-threshold shareholders.
- ✅ **Form 7203 shareholder basis routing present** — `stock_basis_beginning`, `debt_basis_beginning`, and pre-2018 carryovers routed to `form7203`. Correct per Form 7203 instructions (TY2021+). The only K-1 node with basis-to-form routing implemented.
- ✅ **`resolveQbiAmount()` defaults to `Math.max(0, box1_ordinary_business)` when `qbi_amount` absent** — positive income correctly flows to QBI; losses produce zero (no carryforward via this node). Acceptable for current-year non-SSTB cases.
- ❌ **Box 9 §1231 gain captured in schema but never routed** — `box9_net_1231` field exists but no routing function produces output for it. Net §1231 gain/loss from S-corps must flow to Form 4797 (and potentially Schedule D); silently dropping it understates or omits §1231 gain from the taxpayer's return.
- ❌ **SSTB S-corp items fully silenced** — `form8995Output()` filters out SSTB items (`sstb_indicator !== true`) and produces no output for them. Above-threshold SSTB shareholders need Form 8995A with partial phase-out (not complete exclusion); below-threshold SSTB shareholders should receive the full deduction. Neither path is handled. SSTB items are simply dropped with no output.
- ❌ **No AMT routing** — S-corp K-1 Box 15 (AMT items) is entirely absent from schema and routing. Shareholders subject to AMT from accelerated depreciation or other preference items will have Form 6251 inputs missing.
- ❌ **No credits routing** — S-corp K-1 Box 13 (credits: low-income housing, rehabilitation, etc.) is absent from schema and routing.
- ⚠️ **`resolveW2Wages()` and `resolveUbia()` double-count when both legacy (`box17_*`) and primary (`w2_wages`, `ubia_qualified_property`) fields are populated** — `resolveW2Wages()` returns `(item.w2_wages ?? 0) + (item.box17_w2_wages ?? 0)`. If a caller provides the same W-2 wages in both fields (migration path), wages are doubled before being sent to `form8995`, inflating the W-2 wage limitation and potentially the QBI deduction. Should use one or the other exclusively.
- ⚠️ **`form8995Output` uses `as unknown as Parameters<...>` cast** — bypasses compile-time type checking for the `form8995` output shape. This is a type safety escape that hides any field mismatch between `K1SCorpNode`'s assembled fields and `form8995`'s actual input schema.
- ⚠️ **`schedule1Output` does not emit to `agi_aggregator`** — unlike `k1_partnership`, which sends Schedule E income to both `schedule1` and `agi_aggregator`, `k1_s_corp` sends only to `schedule1`. If `agi_aggregator` requires direct input for S-corp pass-through income, this creates an asymmetry in AGI computation. If `agi_aggregator` reads from `schedule1`, both nodes are consistent and this is correct.
- ⚠️ **`scheduleBDividendOutputs` uses `payerName` (camelCase) vs `payer_name` (snake_case) in `scheduleBInterestOutputs`** — same inconsistency as in `k1_partnership`. The dividend payer name field uses a different key than the interest payer name field.
- ⚠️ **Passive vs. active distinction not tracked** — same gap as `k1_partnership`. Box 1 loss from an S-corp in which the shareholder does not materially participate is a passive loss; aggregating unconditionally into Schedule E overstates AGI for passive shareholders with disallowed losses.

### K-1 Trust

- ✅ **Box 1 interest income routes to `schedule_b` per-payer** — correct per Form 1041 K-1 instructions.
- ✅ **Box 2a ordinary dividends routes to `schedule_b` per-payer** — correct.
- ✅ **Box 2b qualified dividends routes to `f1040 line3a`** — correct.
- ✅ **Box 3 net STCG/loss routes to `schedule_d line_5_k1_st`** — correct Schedule D Part I destination.
- ✅ **Box 4a net LTCG/loss routes to `schedule_d line_12_k1_lt`** — correct Schedule D Part II destination.
- ✅ **Box 5 other portfolio income routes to `schedule1 line8z_other_income`** — correct; other portfolio income from a trust is not Schedule E income and belongs in Schedule 1 line 8z. Correct.
- ✅ **Box 6 ordinary business income/loss routes to `schedule1 line5_schedule_e`** — correct; trust-held business income flows through Schedule E per Form 1041 K-1 instructions.
- ✅ **Box 7 net rental real estate and Box 8 other rental route to `schedule1 line5_schedule_e`** — correct.
- ✅ **Box 14 foreign taxes route to `form_1116`** — correct.
- ✅ **No §199A / QBI routing** — Form 1041 trusts and estates do not pass through QBI to beneficiaries (IRC §199A applies at the entity level for trusts; the beneficiary K-1 does not carry a §199A deduction). Correct omission.
- ✅ **Schema box numbering matches Form 1041 K-1** — Box 6 (ordinary business) and Box 7 (rental RE) align with the actual Schedule K-1 (Form 1041) box assignments, unlike Form 1065/1120-S which use different numbering.
- ❌ **DNI (distributable net income) limitation not implemented** — IRC §662(a) limits a beneficiary's deduction (and the trust's distribution deduction) to the trust's DNI for the year. The node accepts and routes all income items without any DNI ceiling. A trust that distributes more than its DNI should have the excess be a return of principal (not taxable income), but no DNI field exists in the schema and no limitation is applied. This is a fundamental correctness gap for complex trusts where distributions exceed DNI.
- ❌ **Box 4b 28% rate gain not routed** — `box4b_28pct_rate_gain` is captured in schema (marked "informational") but is never forwarded to `rate_28_gain_worksheet`. The beneficiary's share of trust collectibles gain must flow to the 28% Rate Gain Worksheet; omitting it causes collectibles gain to be taxed at ordinary rates or excluded from the preferential rate calculation entirely.
- ❌ **Box 4c unrecaptured §1250 gain not routed** — `box4c_unrecaptured_1250` is captured in schema (marked "informational") but is never forwarded to `unrecaptured_1250_worksheet`. The beneficiary's share of §1250 gain must flow through the Unrecaptured §1250 Gain Worksheet for the 25% rate to apply. Absent routing, this gain is taxed incorrectly.
- ❌ **Box 10 estate tax deduction (IRD) not routed** — `box10_estate_tax_deduction` is in schema but no Schedule A output exists. Income in Respect of a Decedent (IRD) carries an estate tax deduction that is an itemized deduction on Schedule A line 16. Omitting it overstates the beneficiary's taxable income.
- ❌ **Box 12 AMT items not routed** — `box12_amt` is captured in schema but no Form 6251 output exists. Trust AMT preference/adjustment items flow to the beneficiary's Form 6251; omitting this causes the beneficiary's AMT calculation to be incomplete.
- ⚠️ **Box 11 final year deductions (excess deductions on termination) not routed** — `box11_final_year_deductions` is captured in schema but not routed. On termination of a trust, excess deductions pass to beneficiaries and, post-TCJA, are deductible as a Schedule A miscellaneous itemized deduction (not subject to the 2% floor, per IRS Reg. §1.642(h)-2). No Schedule A output exists for this item.
- ⚠️ **`scheduleBDividendOutputs` uses `payerName` (camelCase) vs `payer_name` (snake_case) in `scheduleBInterestOutputs`** — same inconsistency as in the partnership and S-corp nodes.
- ⚠️ **`box14_foreign_income` captured in schema but not routed to `form_1116`** — same gap as the partnership node; foreign source income is not forwarded, leaving the Form 1116 credit limitation denominator incomplete.

**Section verdict:** ❌ FAIL

**K-1 Partnership critical gaps:** Box 9b unrecaptured §1250 gain, Box 11 other income (GILTI, §1256, etc.), Box 13 deductions (SE health insurance, depletion, investment interest), Box 15 credits, and Box 17 AMT items are entirely absent. SSTB routing is unimplemented (flag captured, not used). Passive activity distinction is absent across all Schedule E income.

**K-1 S-Corp critical gaps:** Box 9 §1231 gain is captured but never routed (silently dropped). SSTB items are filtered out with no output — both below-threshold (deduction lost) and above-threshold (8995A phase-out lost) cases are incorrect. AMT and credits absent. `resolveW2Wages`/`resolveUbia` double-count when both legacy and primary fields are populated.

**K-1 Trust critical gaps:** DNI limitation (IRC §662) is not implemented — the most fundamental correctness requirement for a complex trust beneficiary K-1. Box 4b (28% rate gain) and Box 4c (unrecaptured §1250) are marked informational in comments but not routed, causing incorrect capital gains tax rates. Box 10 (IRD estate tax deduction) and Box 12 (AMT) are absent. Cross-node inconsistency: `payerName` vs `payer_name` in Schedule B outputs appears in all three K-1 nodes.

## 14. Intermediate — Business & Depreciation

### Form 4562 (Depreciation/Section 179)

- ✅ **§179 limit (OBBBA)** — `SECTION_179_LIMIT_2025 = 2_500_000` and `SECTION_179_PHASEOUT_THRESHOLD_2025 = 4_000_000` pulled from config. Correct per P.L. 119-21.
- ✅ **§179 phase-out** — `section179PhaseOutLimit()` = `max(0, limit − max(0, cost − threshold))` — dollar-for-dollar reduction starting at $4,000,000. Correct.
- ✅ **§179 business income cap** — Capped to `min(total, incomeLimit)` when `incomeLimit >= 0`. Carryover (`section_179_carryover`) is included in the total before the income limit is applied, correctly deferring carryover subject to the same income limitation. Correct.
- ✅ **Bonus depreciation — dual-rate (OBBBA)** — `BONUS_RATE_PRE_JAN20 = 0.40` for property placed in service before Jan 20, 2025 (TCJA phase-down); `BONUS_RATE_POST_JAN19 = 1.00` for property placed in service after Jan 19, 2025 (OBBBA restored 100%). Correct per P.L. 119-21.
- ✅ **Bonus depreciation — elect-out and 40% election** — `elect_out_bonus` disables bonus entirely; `elect_40pct_bonus` applies 40% to post-Jan-19 basis. Both elections correctly modeled.
- ✅ **Listed property — >50% business use threshold** — `isListedPropertyQualified()` requires `business_use_pct > 50`. Correct per §168(k)(2)(B) (strictly greater than 50%, not ≥50%).
- ✅ **Luxury auto limits (TY2025)** — Year 1 no bonus $12,200; Year 1 with bonus $20,200; Year 2 $19,600; Year 3+ $11,900. All match config constants from `2025.ts`. `luxuryAutoLimit()` and `applyLuxuryAutoLimit()` correctly branch on year and bonus presence.
- ✅ **MACRS 200DB rates** — 3/5/7/10-year tables match IRS Form 4562 Instructions Table A (half-year convention). Spot-checked: 5-year Year 1 = 20.00%, Year 2 = 32.00% ✓; 7-year Year 1 = 14.29%, Year 2 = 24.49% ✓.
- ✅ **MACRS 150DB rates** — 15-year and 20-year correctly use 150DB (Table B). `MACRS_150DB_PERIODS = new Set([15, 20])` enforces this.
- ✅ **AMT adjustment (§56(a)(1))** — `computeMacrsGds()` computes excess of 200DB over 150DB and routes it to `form6251.depreciation_adjustment`. Zero for 150DB-method assets. Correct.
- ✅ **Business-use proration for MACRS** — `effectiveBasis = basis × (business_use_pct / 100)` applied before MACRS rate lookup. Correct for listed property.
- ⚠️ **Luxury auto limit applied to aggregate depreciation** — `applyLuxuryAutoLimit()` caps `rawDepreciation` = §179 + bonus + MACRS GDS + prior MACRS for the entire form invocation. If Form 4562 is invoked per-asset (as intended), this is correct. If a caller aggregates multiple unrelated assets before invoking, the luxury cap would incorrectly suppress non-auto depreciation. No schema guard or comment enforces the per-asset contract. Should document or enforce that luxury auto invocations must be isolated.
- ⚠️ **No 27.5-year residential or 39-year commercial SL MACRS** — `MACRS_200DB_RATES` and `MACRS_150DB_RATES` cover 3–20-year GDS property only. Straight-line depreciation for residential rental (27.5-year) and commercial real property (39-year) is absent. Callers routing rental building depreciation through Form 4562 will receive 0. (Form 8829 handles 39-year home office depreciation separately, so that path is covered.)

### Form 4797 (Business Property Sales)

- ✅ **Part I §1231 gain — LT capital gain routing** — `netSection1231GainForScheduleD()` correctly reduces gross §1231 gain by prior-year nonrecaptured §1231 losses before routing the remainder to `schedule_d.line_11_form2439`. Prior losses are recaptured as ordinary income first.
- ✅ **Prior-year §1231 loss recapture** — `recapturedAsOrdinary()` = `min(grossGain, priorLoss)` when both positive. Correct per IRC §1231(c). Routed to `schedule1.line4_other_gains`.
- ✅ **Part II ordinary gain routing** — `ordinary_gain` (pre-computed by caller, includes §1245/§1250 recapture) flows to `schedule1.line4_other_gains` combined with the §1231 recaptured ordinary amount. Correct.
- ✅ **§1245/§1250 informational fields** — `recapture_1245` and `recapture_1250` accepted as non-negative informational inputs included within `ordinary_gain`. Pre-computed aggregation design is explicit in schema comments.
- ✅ **`hasSaleData()` guard** — Early return when both `section_1231_gain` and `ordinary_gain` are zero/undefined prevents spurious outputs. Correct.
- ❌ **§1231 net loss routed to Schedule D — wrong destination** — When `grossGain < 0`, `scheduleDOutput()` routes it to `schedule_d.line_11_form2439` as a negative LT capital amount. Per IRC §1231(a)(2), a §1231 net loss is an **ordinary loss** and must flow to ordinary income (Schedule 1 line 4), not to Schedule D. Routing to Schedule D will subject the loss to the $3,000 annual capital loss limitation, which does not apply to §1231 net losses. This is a computation error that overstates tax in net §1231 loss years.
- ⚠️ **Unrecaptured §1250 gain (25% rate) not tracked or routed** — For real property sold at a gain, the unrecaptured §1250 portion (full §1250 depreciation, not just additional recapture) is taxed at a 25% maximum rate via the Unrecaptured §1250 Gain Worksheet. There is no output field or routing for this component. It will be silently folded into the §1231 LT gain and taxed at 0%/15%/20% preferential rates, understating tax on real property dispositions with accumulated depreciation.

### Form 8829 (Home Office)

- ✅ **Business percentage** — `businessPct()` = `min(1, business / total)`. Capped at 100%. Correct.
- ✅ **Income limitation enforced** — Returns 0 when `incomeLimit === 0`. Operating expenses applied first against income limit, then depreciation from remaining headroom. Correct two-step ordering per Form 8829 instructions.
- ✅ **Carryovers subject to income limit** — `operatingPool` and `depreciationPool` both include prior-year carryovers before applying the current-year income limit. Carryovers do not circumvent the limitation. Correct.
- ✅ **39-year straight-line depreciation (mid-month)** — `DEPRECIATION_RATES_TY2025` provides mid-month first-year rates for January (2.461%) through December (0.107%). `DEPRECIATION_RATE_PRIOR_YEAR = 0.02564` ≈ 1/39 — correct full-year rate for established business use. Rates match IRS Form 8829 Table.
- ✅ **Business-use portion of depreciation** — `computeDepreciation()` multiplies `basis × pct × rate`. Correct — only the business percentage of the home's structural basis is depreciated.
- ✅ **Mortgage interest not double-prorated** — `mortgage_interest` (pre-allocated to business use from Form 1098) added flat without further `× pct`. Correct per Form 8829 instructions for direct expenses.
- ✅ **Output routes to Schedule C line 30** — Correct target for home office deduction from sole proprietorship.
- ⚠️ **Simplified method not implemented** — The $5/sq ft × up to 300 sq ft (max $1,500) election (Rev. Proc. 2013-13) is absent. No `use_simplified_method` flag or alternative compute path exists. Taxpayers electing simplified method will receive incorrect results.
- ⚠️ **No exclusive-use test enforcement** — The schema has no `exclusive_use_confirmed` boolean. The IRC §280A(c)(1) exclusive and regular use requirement is entirely trust-delegated to the caller. A `z.literal(true)` guard field would prevent silent misuse.
- ⚠️ **`home_fmv_or_basis` does not enforce land exclusion** — IRC §167 depreciation applies to the structure only, not land. If the caller passes full home FMV without subtracting land value, depreciation will be overstated. Schema or documentation should require land value be excluded before passing.

### Form 8990 (Interest Expense Limitation)

- ✅ **ATI rate** — `ATI_APPLICABLE_PERCENTAGE = 0.30`. Correct per IRC §163(j)(1)(B).
- ✅ **Small business exemption threshold** — `SMALL_BIZ_GROSS_RECEIPTS_2025 = 31_000_000`. Correct per Rev. Proc. 2025-28 (TY2025 inflation adjustment).
- ✅ **Tax shelter exclusion from small business exemption** — `isSmallBusinessExempt()` returns false if `is_tax_shelter === true`. Correct per §163(j)(3).
- ✅ **ATI computation** — `computeAti()` = `tti + bie + nol + qbi + dep − bii`. Add-backs: current-year BIE, NOL (§172), QBI (§199A), depreciation/amortization/depletion. Subtract business interest income. All add-backs correct per Form 8990 Part II. ATI floored at 0 — correct for individuals and C-corps.
- ✅ **Depreciation add-back reinstated (OBBBA)** — `depreciation_amortization` field comment explicitly cites P.L. 119-21 (OBBBA) restoring the DAD add-back for tax years beginning after 2024. TY2025 correctly includes depreciation in ATI (EBITDA-style), restoring the pre-2022 treatment. Correct.
- ✅ **ATI add-back uses current-year BIE only** — `computeAti()` uses `input.business_interest_expense` (current year only), not `totalBie()` which includes the carryforward. Matches Form 8990 line 8 — only current-year BIE is added back. Correct.
- ✅ **Floor plan financing exemption** — `floor_plan_interest` excluded from the §163(j) limitation pool and correctly added to `maxDeductible()`. Per IRC §163(j)(9). Correct.
- ✅ **Max deductible formula** — `maxDeductible()` = `atiLimit + floor_plan_interest + business_interest_income`. Matches Form 8990 line 29. Correct.
- ✅ **Disallowed BIE add-back routing** — Disallowed BIE routed to `schedule1.biz_interest_disallowed_add_back` and `agi_aggregator` as a positive add-back, reversing the upstream deduction to the extent it exceeds the §163(j) cap. Correct pattern.
- ⚠️ **Disallowed BIE carryforward not emitted** — The computed `disallowed` amount (Form 8990 line 31) is the carryforward to next year's Form 8990 line 2. This value is not emitted to any output node and cannot be persisted across tax years. Multi-year §163(j) compliance is broken without this output.
- ⚠️ **ATI floor at 0 not appropriate for partnerships** — `Math.max(0, raw)` is correct for individuals and C-corps per the instructions, but partnerships compute ATI without a zero floor. If this node is reused for partnership-level §163(j), it will produce incorrect results. A schema comment or guard noting individual/corporate-only applicability would prevent misuse.

**Section verdict:** ⚠️ WARN

**Critical issues:**
- ❌ Form 4797: §1231 net loss routed to `schedule_d.line_11_form2439` (wrong). A §1231 net loss is an ordinary loss and must flow to Schedule 1 ordinary income, not Schedule D. This subjects the loss to the $3,000 capital loss cap incorrectly.
- ❌ Form 4797: Unrecaptured §1250 gain (25% max rate) never tracked or routed to the rate worksheet. Real property dispositions with depreciation recapture will be taxed at 0%/15%/20% instead of the correct 25% cap, understating tax.

**Significant gaps:**
- ⚠️ Form 4562: No 27.5-year residential or 39-year commercial SL MACRS — real property depreciation returns 0 if routed through this node.
- ⚠️ Form 4562: Per-asset invocation contract for luxury auto cap not enforced or documented.
- ⚠️ Form 8829: Simplified method ($5/sq ft, max $1,500) not implemented.
- ⚠️ Form 8829: No exclusive-use test enforcement field — entirely trust-delegated to caller.
- ⚠️ Form 8829: `home_fmv_or_basis` does not enforce land-value exclusion before depreciation computation.
- ⚠️ Form 8990: Disallowed BIE carryforward (line 31) not emitted — multi-year continuity broken.

---

## 17. Input Nodes — W2, Household Wages, W2G

### W2

- ✅ **Box 1 wages → F1040 Line 1a** — `wageFields()` reduces regular (non-statutory) W-2s via `regularItems()` and emits `line1a_wages`. Statutory-employee wages are correctly excluded from Line 1a and routed to Schedule C instead.
- ✅ **Box 2 federal withheld → F1040 Line 25a** — `withholdingFields()` sums `box2_fed_withheld` across all W-2s (including statutory employees) and emits `line25a_w2_withheld`. Federal income tax withheld on statutory-employee wages still flows to F1040 Line 25a even though the wages go to Schedule C — correct per Form 1040 instructions.
- ✅ **Box 3 SS wages — per-employer wage base validation** — `validateItem()` enforces `box3_ss_wages + box7_ss_tips ≤ SS_WAGE_BASE_2025 ($176,100)` per employer. Correct per IRC §3121(a)(1).
- ✅ **Box 3/7 SS wages → Schedule SE** — `totalSsWages` (box3 + box7 summed across all W-2s) routed to `schedule_se` as `w2_ss_wages` to reduce the SE tax SS wage base cap per IRC §1402(b). Correct.
- ✅ **Box 4 SS withheld — excess SS credit → Schedule 3** — `excessSsOutput()` computes total SS withheld minus `SS_MAX_TAX_PER_EMPLOYER_2025 ($10,918.20)` and routes excess to Schedule 3 `line11_excess_ss` when there are multiple employers. Correct per IRC §31(b).
- ✅ **Box 5/6 Medicare wages/withheld → Form 8959** — `medicareOutput()` aggregates box5 and box6 across regular W-2s and routes to `form8959` for Additional Medicare Tax computation. Correct.
- ❌ **Box 7 SS tips — no Form 4137 routing for unreported tip income** — Box 7 (Social Security tips) is used only for SS wage base validation and SE wage offset. There is no routing to Form 4137 for unreported cash tips. The distinction between reported SS tips (box 7) and unreported tips requiring Form 4137 is not modeled. `allocatedTipsOutput()` handles box 8 (employer-allocated tips) correctly, but there is no mechanism for a tipped employee to flag which box 7 tips were unreported to the employer.
- ✅ **Box 8 allocated tips → Form 4137** — `allocatedTipsOutput()` routes box8 total to `form4137` as `allocated_tips`. Correct per IRC §3121(q).
- ✅ **Box 12 Code A/B (uncollected FICA on tips) → Schedule 2** — Sums codes A and B and routes to `schedule2` as `uncollected_fica`. Correct per Schedule 2 Line 13.
- ✅ **Box 12 Code C (group term life >$50k) — no additional routing** — Code C has no output routing; amount is already included in Box 1 wages. Correct per IRC §79(a).
- ✅ **Box 12 Codes D/E/G → Form 8880 (Saver's Credit)** — Sums D+E+G and routes to `form8880` as `elective_deferrals`. Correct.
- ⚠️ **Box 12 Code H (501(c)(18)(D)) — emitted to both Schedule 1 and AGI aggregator** — Code H total is routed to `schedule1` as `line24f_501c18d` in `box12NodeOutputs()`, and again to `agi_aggregator` as `line24f_501c18d` in a separate block within `compute()`. The dual-emission to two different nodes is intentional but fragile: if the aggregator also reads Schedule 1 to build AGI, this amount could be double-counted. Confirm downstream deduplication.
- ✅ **Box 12 Code W → Form 8889** — Routes Code W to `form8889` as `employer_hsa_contributions`. Correct per IRC §106(d) and Form 8889 Part II Line 9.
- ❌ **Box 12 Code FF (QSEHRA) — no routing** — Code FF is declared in the `Box12Code` enum but `box12NodeOutputs()` has no case for it. QSEHRA benefits must reduce the Premium Tax Credit on Form 8962 per IRC §36B(c)(4). No output is emitted. This is a correctness gap for small-employer employees receiving QSEHRA benefits.
- ✅ **Box 12 Code DD (employer health insurance) — no routing** — Informational only per IRC §6051(a)(14). Correctly produces no output.
- ✅ **Box 12 Code EE — included in 457(b) limit validation** — Code EE (Designated Roth contributions to 457(b)) is correctly combined with Code G in the 457(b) limit check. No deduction routing needed. Correct.
- ✅ **Box 12 Codes M/N (uncollected FICA on GTL) → Schedule 2** — Routes M+N sum to `schedule2` as `uncollected_fica_gtl`. Correct per Schedule 2 Line 13 instructions.
- ✅ **Box 12 Code K (golden parachute excise) → Schedule 2** — Code K routed to `schedule2` as `golden_parachute_excise`. Correct per IRC §4999.
- ✅ **Box 12 Code T (adoption benefits) → Form 8839** — Code T routed to `form8839` as `adoption_benefits`. Correct per IRC §137.
- ✅ **Box 12 Code R (Archer MSA) → Form 8853** — Code R routed to `form8853` as `employer_archer_msa`. Correct per IRC §106(b).
- ✅ **Box 12 Code Q (nontaxable combat pay) → F1040 Line 1i** — `combatPayFields()` emits `line1i_combat_pay`. Correct per IRC §112.
- ✅ **Box 13 statutory employee → Schedule C** — `statutoryOutput()` routes statutory-employee wages and withholding to `schedule_c`. Correct per IRC §3121(d)(3).
- ✅ **Box 13 retirement plan → IRA deduction worksheet** — `retirementPlanOutput()` sets `covered_by_retirement_plan: true`. Correct per IRC §219(g).
- ✅ **Box 14 SDI/PFML → Schedule A line 5a** — `scheduleAOutput()` collects box14 entries flagged `is_state_sdi_pfml` and adds them with state (box17) and local (box19) withholding into `line_5a_tax_amount`. Correct.
- ✅ **SECURE 2.0 retirement contribution limits** — `RETIREMENT_LIMITS_2025`: 401k/403b/457b at age ≤49: $23,500; age 50–59: $31,000; age 60–63: $34,750; age 64+: $31,000. SIMPLE: $16,500/$20,000/$21,750/$20,000. Matches SECURE 2.0 §109 super catch-up for ages 60–63 and standard catch-up reversion at 64+. Correct.
- ✅ **Regular wages → EITC and Form 8812 (ACTC)** — `earned_income` routed to both `eitc` and `f8812`. Correct.

**Section verdict:** ⚠️ PARTIAL PASS — Core routing for boxes 1, 2, 3, 4, 5, 6, 8, all material Box 12 codes, Box 13, Box 14, and SECURE 2.0 retirement limits is correct. Two correctness gaps: (1) Box 7 SS tips have no Form 4137 path for unreported tip income; (2) Box 12 Code FF (QSEHRA) produces no output, leaving affected employees without the Form 8962 PTC reduction. One fragility: Code H emitted to both Schedule 1 and agi_aggregator — confirm downstream deduplication.

---

### Household Wages

- ✅ **Wages → F1040 Line 1b (not Line 1a)** — `f1040Output()` emits `line1b_household_wages`, correctly distinguishing household employee wages from regular W-2 wages on Line 1a per Form 1040 instructions.
- ✅ **Federal withholding → F1040 Line 25a** — `federal_income_tax_withheld` flows to `line25a_w2_withheld`. Correct — household employee W-2 withholding is part of Line 25a.
- ✅ **Architecture: employee-side only** — Node comment correctly documents this is the employee (taxpayer) side; Schedule H covers the employer's FICA obligations. Correct separation of concerns.
- ❌ **No FICA threshold check ($2,800)** — `HOUSEHOLD_FICA_THRESHOLD_2025 = $2,800` is defined in config but never imported or used by this node. The node does not validate or warn that wages below $2,800 from a single household employer are not subject to FICA per IRC §3121(a)(7)(B). While FICA computation belongs to Schedule H, the absence of any threshold awareness means sub-threshold wages are processed with no informational routing.
- ❌ **Medicare wages/withheld not routed to Form 8959** — The schema captures `medicare_wages` and `medicare_tax_withheld` but `f1040Output()` emits nothing to Form 8959. A household employee with high Medicare wages from this employer will not have those wages included in the Form 8959 Additional Medicare Tax calculation, potentially understating AMT liability.
- ⚠️ **Four schema fields are dead inputs** — `social_security_wages`, `medicare_wages`, `ss_tax_withheld`, and `medicare_tax_withheld` are collected in the schema as optional fields but are never read or emitted by `f1040Output()`. They are dead inputs — either route them or remove them from the schema.
- ⚠️ **No cross-node excess SS check** — If a taxpayer has both regular W-2 income and household wages (from a second employer), the household SS withheld is not visible to the W-2 node's `excessSsOutput()`. Cross-node excess SS aggregation is not modeled.

**Section verdict:** ❌ FAIL — Two correctness gaps: (1) Medicare wages/withheld captured in schema but not routed to Form 8959, causing AMT understatement for high-income household employees; (2) four schema fields (`social_security_wages`, `medicare_wages`, `ss_tax_withheld`, `medicare_tax_withheld`) are collected but never emitted, making them dead inputs. The $2,800 FICA threshold constant exists in config but is unused by this node.

---

### W2G (Gambling)

- ✅ **All gambling winnings taxable → Schedule 1 Line 8z** — `schedule1Output()` routes box1 total winnings to `schedule1` as `line8z_other_income`. Correct per IRC §61(a).
- ✅ **Federal withholding → F1040 Line 25b (1099 withholding)** — `f1040Output()` routes box4 federal withheld to `line25b_withheld_1099`. Correct — W-2G withholding is reported on Line 25b per Form 1040 instructions.
- ❌ **Non-cash winnings (box7) excluded from income total** — `totalWinnings()` sums only `box1_winnings` and ignores `box7_winnings_noncash`. Non-cash prizes (cars, trips, merchandise) are taxable at fair market value per IRC §74(a). Box 7 is silently dropped, understating gambling income for non-cash prize winners.
- ❌ **No professional gambler routing to Schedule C** — There is no `is_professional_gambler` flag and no mechanism to route winnings to Schedule C and losses as business expenses. Professional gamblers report net gambling income/loss on Schedule C per IRC §162 and *Groetzinger v. Commissioner*, 480 U.S. 23 (1987). The node has no concept of professional gambler status.
- ⚠️ **No gambling losses routing to Schedule A** — The schema has no `losses` field. Gambling losses deductible only to the extent of winnings for itemizers (IRC §165(d)) cannot be routed through this node. Losses require a separate input mechanism or a `losses` field with conditional Schedule A routing.
- ✅ **Zero guard on outputs** — Both `schedule1Output()` and `f1040Output()` guard on zero totals before emitting. No spurious zero outputs.
- ✅ **State withholding (box15) captured in schema** — Present for future state-level routing, consistent with the engine's federal-first approach.
- ✅ **Zod schema, types inferred, no `any`** — Pattern compliance correct.

**Section verdict:** ❌ FAIL — Two correctness gaps: (1) non-cash winnings (box7) silently excluded from income, understating taxable gambling winnings for non-cash prize recipients; (2) no professional gambler pathway — a Schedule C-reporting professional gambler cannot be modeled with this node. Gambling losses are not routable through this node (known deferred feature).

---

## 16b. Core Input Nodes (General, Sched A/C/E, F1095-A)

### General (Taxpayer Information)

- ✅ Filing status uses `z.nativeEnum(FilingStatus)` — typed against the canonical `FilingStatus` enum from `types.ts`; no raw strings accepted.
- ✅ Dependent counts computed correctly: `qualifying_child_tax_credit_count` (CTC-qualifying), `other_dependent_count`, and total `dependent_count` all emitted to `f1040`. Dependents claimed on another return are excluded via `dependent_on_another_return` guard.
- ✅ Age and blindness flags captured for taxpayer and spouse (`taxpayer_age_65_or_older`, `taxpayer_blind`, `spouse_age_65_or_older`, `spouse_blind`) and forwarded to both `standard_deduction` and `form8995`.
- ✅ Comprehensive identity and contact fields present: name, SSN, DOB, occupation, phone, email, IP PIN, signature PIN, death date, prior-year AGI, and full mailing/foreign address.
- ✅ Filing status routed to: `f1040`, `standard_deduction`, `eitc`, `agi_aggregator` (SSA taxability thresholds), `form8959` (AMT threshold), `form8995` (QBI income limit), and `f8812` (CTC/ACTC phase-out).
- ⚠️ `form8960` (NIIT) is **not** in `outputNodes` and does not receive `filing_status` directly from the general node. NIIT thresholds are filing-status-dependent ($250K MFJ / $200K other). Verify that `form8960` obtains `filing_status` from another upstream node (e.g., `schedule_e` or a 1099-div node); if not, NIIT threshold will always fall back to a hardcoded default.
- ⚠️ `address_in_care_of` is defined in `inputSchema` (line 96) but is never forwarded in `buildF1040Input` — dropped silently. Low severity (informational field), but worth passing through for completeness.
- ✅ MFS-specific (`mfs_spouse_itemizing`, `mfs_spouse_lived_with_taxpayer`), HOH-specific, and QSS-specific fields are schema-validated. HOH/QSS fields not forwarded downstream (informational only on 1040 header), which is correct behavior.

### Schedule A (Itemized Deductions Input)

- ✅ Medical expense threshold: 7.5% of AGI correctly applied via `MEDICAL_AGI_FLOOR_PCT = 0.075`; floored at zero.
- ✅ SALT cap: $40,000 imported from `SALT_CAP_2025` in `config/2025.ts`, consistent with OBBBA (P.L. 119-21). Cap applied via `Math.min` in `computeSALT`.
- ❌ **MFS SALT cap ($20,000) not enforced.** `SALT_CAP_2025 = 40_000` is applied uniformly to all filing statuses. MFS filers should be capped at $20,000 per OBBBA. `filing_status` is not in the schedule_a input schema. Test file comment (line 5) confirms this known gap. Fix: add `filing_status` to schema and apply `SALT_CAP_MFS = 20_000` for MFS.
- ❌ **SALT phase-out for high-income filers not implemented.** OBBBA imposes a 30% phase-out for MAGI over $500,000 (single/MFJ/HOH) / $250,000 (MFS), with a floor of $10,000 ($5,000 MFS). No `magi` field exists and no phase-out logic is present. Test file comment (lines 4–5) acknowledges this gap.
- ⚠️ State income tax vs. sales tax election not enforced. `line_5a_tax_amount` accepts both without a `line_5a_election: z.enum(["income_tax","sales_tax"])` guard. The IRS requires taxpayers to choose one; both cannot be deducted simultaneously. Test file comment (line 2) flags this.
- ✅ Real estate taxes (`line_5b_real_estate_tax`) and personal property taxes (`line_5c_personal_property_tax`) included in SALT cap computation.
- ✅ Mortgage interest: three lines captured (1098 Box 10, no-1098, points). Acquisition debt limit ($750K post-TCJA) is correctly deferred to the filer/preparer per IRS Pub 936 worksheet.
- ⚠️ Charitable contribution AGI limit applies a combined 60% cap to cash + noncash + carryover in `computeContributions`. The IRS requires separate limits: 60% for cash, 30% for capital gain property, 50% for other noncash (IRC §170). Noncash contributions may be over-allowed for filers with significant property donations.
- ✅ Contribution carryover (`line_13_contribution_carryover`) included in the contribution aggregate — correct.
- ✅ Casualty losses (`line_15_casualty_theft_loss`) accepted as a pass-through scalar; post-TCJA restriction to federally declared disasters is correctly delegated to the preparer at this layer.
- ✅ Investment interest (`line_9_investment_interest`) included in interest total; Form 4952 computation is downstream.
- ✅ Schedule A total routes to `standard_deduction` node (for standard vs. itemized comparison) and to `f1040` (`line12e_itemized_deductions`). AMT taxes-paid addback also routes to `form6251` line 2a.

### Schedule C (Business Income Input)

- ✅ Business income captured: gross receipts (`line_1_gross_receipts`), returns/allowances (`line_2_returns_allowances`), other income (`line_6_other_income` — can be negative for recapture).
- ✅ Cost of Goods Sold (Part III) fully implemented: beginning inventory, purchases, labor, materials, ending inventory — computed via `computeCOGS`.
- ✅ All standard expense categories present: advertising, car/truck, commissions, contract labor, depletion, depreciation, employee benefits, insurance, mortgage interest, other interest, professional services, office, pension, rent (vehicles and other), repairs, supplies, taxes/licenses, travel, meals (with DOT 80% and wage-substitute 100% rate flags), utilities, wages, energy-efficient property, Part V other expenses detail.
- ✅ Home office: both simplified method (sq ft × $5/sq ft, capped at 300 sq ft) and actual (Form 8829 pre-computed amount) supported. Gross income limitation (cannot exceed tentative profit) enforced via `Math.min(deduction, Math.max(0, tentativeProfit))`.
- ✅ Net profit routes to: `schedule1` (Part I line 3), `agi_aggregator`, `schedule_se` (if profit ≥ $400 and not SE-exempt), `form8995` (QBI), `form8582` (passive activity), `form6198` (at-risk limitation), `form6251` (depletion AMT add-back), `form8990` (§163(j) interest limitation).
- ✅ Statutory employee wages from W-2 accepted via `statutory_wages` / `withholding` on the top-level input schema; statutory items are SE-exempt and skip Schedule SE routing.
- ⚠️ `filing_status` in schedule_c `inputSchema` uses `z.string().optional()` (line 132) instead of `z.nativeEnum(FilingStatus)`. The EBL threshold selection string-compares `"mfj"` (line 317) and would silently fall back to the single threshold for any malformed or unexpected value. Fix: use `filingStatusSchema` (nativeEnum).
- ✅ Excess business loss threshold ($313,000 single / $626,000 MFJ, TY2025) correctly imported from `config/2025.ts` and applied for losses.
- ✅ EITC and ACTC (`f8812`) receive SE net profit as earned income when positive — correct per IRC §32(c)(2)(A)(ii).

### Schedule E (Supplemental Income Input)

- ✅ Rental income captured per property with `rent_income`, `royalties_income`, and `ownership_percent` proration. Each property is a separate `itemSchema` entry — no co-mingling.
- ✅ §280A vacation home rules implemented: < 15 fair rental days → income excluded and no deductions; personal use > 14 days or > 10% of rental days → expenses capped at gross rental income.
- ❌ **Part II (Partnership / S-Corp / Trust / Estate K-1 income) is absent from this node.** Schedule E Part II is a major income category. This node only covers Part I (rental real estate and royalties). Confirm that dedicated K-1 input nodes route directly to `schedule1` and `agi_aggregator` — if not, Part II income is unaccounted for entirely.
- ✅ Passive vs. non-passive categorization via `activity_type` enum (A = active rental $25K allowance, B = other passive, C = real estate professional, D = nonpassive). Correctly gates `form8582` routing on passive activity types.
- ✅ Routes to `form8582` (PAL) when passive losses or prior unallowed passive losses exist. Type A and Type B breakdown preserved in `form8582` input.
- ✅ Rental income subject to NIIT routed to `form8960` when `carry_to_8960 = true`. Design requires preparer to flag per-property — acceptable, but not automatic.
- ✅ At-risk limitation (`some_investment_not_at_risk`, `prior_unallowed_at_risk`) routes to `form6198`.
- ✅ Real estate professional (ActivityType.C) qualifies for §179 via `form4562` output.
- ✅ Mixed-use personal/rental (main home or second home) correctly splits personal-fraction mortgage interest and taxes back to `schedule_a`.
- ✅ QBI election supported per property with W-2 wages and UBIA fields routing to `form8995`.
- ⚠️ `form8990Outputs` builds keys `disallowed_mortgage_interest_carryforward` / `disallowed_other_interest_carryforward` but casts via `as unknown` because those fields are absent from `form8990`'s `inputSchema` (comment on lines 397–400 explicitly notes this). The data is silently dropped. Fix: add carryforward fields to `form8990`'s input schema.

### Form 1095-A (ACA Marketplace)

- ✅ Monthly SLCSP (Column B) captured via `monthly_slcsps: z.array(z.number().nonnegative()).length(12)` — all 12 months enforced when present.
- ✅ Monthly APTC (Column C) captured via `monthly_aptcs: z.array(z.number().nonnegative()).length(12)`.
- ✅ Monthly enrollment premium (Column A) captured via `monthly_premiums: z.array(z.number().nonnegative()).length(12)`.
- ✅ All 12 months enforced by Zod `.length(12)`. Partial-year coverage represented by zero-filling months with no enrollment.
- ✅ Annual totals (`annual_premium`, `annual_slcsp`, `annual_aptc`) supported as alternative when monthly detail is unavailable (Form 1095-A Line 33 path).
- ✅ Multi-policy support: multiple 1095-A forms aggregated element-wise via `mergeMonthlyArrays` — correct for households with policies from different issuers.
- ✅ Routes exclusively to `form8962` for PTC reconciliation. All three columns forwarded correctly.
- ✅ All-zero monthly arrays are suppressed (not forwarded) via `hasNonZero` guard — prevents spurious zero data from triggering Form 8962 computations.
- ⚠️ No validation that at least one numeric field is present per `itemSchema` item. An item with only `issuer_name` passes schema validation and contributes nothing to aggregation. Consider adding `.refine()` to require at least one of `monthly_premiums`, `monthly_slcsps`, `monthly_aptcs`, `annual_premium`, `annual_slcsp`, or `annual_aptc`.
- ⚠️ `sumField` casts via `(item[field] as number)` — would silently return `NaN`-based 0 for array-typed fields if the wrong field key were passed; negligible risk given schema constraints.

### Section 16 Priority Fixes

| Priority | Node | Issue |
|----------|------|-------|
| CRITICAL | schedule_a | MFS SALT cap not enforced — MFS filers receive $40,000 cap instead of $20,000 |
| CRITICAL | schedule_a | OBBBA SALT phase-out (30% of MAGI over $500K) not implemented — high-income filers over-deduct SALT |
| HIGH | schedule_e | Part II K-1 income (partnership/S-corp/trust/estate) absent from this node — confirm coverage path |
| HIGH | schedule_e | `form8990` carryforward fields cast via `as unknown` — data silently dropped; add fields to form8990 inputSchema |
| MEDIUM | schedule_c | `filing_status` uses `z.string()` not `z.nativeEnum(FilingStatus)` — EBL threshold selection fragile |
| MEDIUM | schedule_a | Income tax vs. sales tax election not enforced — both can be entered simultaneously |
| MEDIUM | schedule_a | Noncash/property contributions apply single 60% AGI cap instead of separate 30%/50% limits per IRC §170 |
| MEDIUM | general | `form8960` absent from outputNodes — filing_status may not reach NIIT threshold selector |
| LOW | general | `address_in_care_of` present in schema but not forwarded in `buildF1040Input` |
| LOW | f1095a | Per-item validation does not require at least one numeric field — zero-data items pass silently |

---

## 18. Input Nodes — Retirement & Social Security

### Form 1099-R (Retirement Distributions)

**Box fields and routing:**
- ✅ Box 1 (gross distribution): captured as `box1_gross_distribution` (required, nonnegative). Used for IRA line4a and pension line5a.
- ✅ Box 2a (taxable amount): captured as `box2a_taxable_amount` (optional; falls back to box1 when absent — correct per IRS instructions). Routes to line4b (IRA) or line5b (pension).
- ✅ Box 4 (federal tax withheld): captured as `box4_federal_withheld`. Summed across all active items and routed to `line25b_withheld_1099` on Form 1040. Correct.
- ✅ Box 6 (NUA — net unrealized appreciation): captured as `box6_nua` (nonnegative, optional). Stored in schema for downstream use. No automatic NUA exclusion applied at this node (correct: NUA treatment belongs on Schedule D / Form 4972, not at the input node level).
- ✅ Box 7 distribution code: full `DistributionCode` enum covers all valid TY2025 codes (1–8, A–W, Y). Secondary code via `box7_code2`. IRA/SEP/SIMPLE checkbox via `box7_ira_sep_simple`.
- ✅ Boxes 14–19 (state/local): captured as informational fields; not used in federal computation. Correct.

**Distribution code routing:**
- ✅ Code 1 (early, no exception): `EARLY_DIST_CODES = Set(["1"])` triggers `form5329Outputs()`, routing `early_distribution` + `distribution_code` to Form 5329. Correct.
- ✅ Code 2 (early, exception applies): not in `EARLY_DIST_CODES` and not in `ZERO_TAXABLE_CODES` — amount is taxable but no Form 5329 penalty. Correct.
- ✅ Code 3 (disability): `disability_flag` / `disability_as_wages` flags re-route taxable amount to `line1a_wages` when `disability_as_wages = true`. No penalty. Correct.
- ✅ Code 4 (death): not in penalty or zero-taxable sets — taxable income only, no penalty. Correct per IRC §72(t)(2)(A)(ii).
- ⚠️ Code 5 (prohibited transaction): `LUMP_SUM_CODES = Set(["5"])` routes to Form 4972. Code 5 in IRS instructions means "prohibited transaction" (entire IRA becomes ordinary income per IRC §408(e)(2)), not a lump-sum election — the comment conflates two separate concepts. Form 4972 routing is technically incorrect for true prohibited transactions, which should make the full IRA balance ordinary income without the Form 4972 averaging election. Acceptable if `exclude_4972` is never used for prohibited transactions in practice, but the code comment is misleading.
- ✅ Code 6 (Section 1035 exchange): in `ZERO_TAXABLE_CODES` — produces zero taxable. Correct.
- ✅ Code 7 (normal distribution, age 59½+): not in penalty or zero-taxable sets — taxable income, no penalty. Correct.
- ✅ Code G (direct rollover): in `ZERO_TAXABLE_CODES` — produces zero taxable. Correct.
- ✅ Code Q (qualified Roth IRA distribution): in `ZERO_TAXABLE_CODES` — produces zero taxable. Correct.
- ✅ Code T (Roth IRA distribution, exception): in `ZERO_TAXABLE_CODES` — produces zero taxable. Correct.
- ✅ Rollover Codes G/S (zero taxable): explicitly checked in `effectiveTaxableAmount`. Correct.
- ✅ Rollover Code X (partial rollover): only the non-rolled portion is taxable. Correct.
- ✅ Rollover Code C (Roth conversion): taxable (not zero); routed to Form 8606 for basis tracking. Correct.

**IRA vs. pension routing:**
- ✅ `box7_ira_sep_simple = true` → `iraItems()` → `line4a_ira_gross` / `line4b_ira_taxable` (Form 1040 Line 4). Correct.
- ✅ `box7_ira_sep_simple !== true` → `pensionItems()` → `line5a_pension_gross` / `line5b_pension_taxable` (Form 1040 Line 5). Correct per IRS Form 1040 instructions.

**QCD (Qualified Charitable Distribution):**
- ✅ Annual limit: `QCD_ANNUAL_LIMIT_2025 = 108_000` (IRC §408(d)(8)(A), inflation-adjusted for TY2025). Correct.
- ✅ QCD restricted to IRA items (`box7_ira_sep_simple === true`). Correct per IRC §408(d)(8).
- ✅ QCD reduces taxable amount before PSO and Simplified Method reductions. Correct ordering.
- ⚠️ Age-70½ requirement (IRC §408(d)(8)(B)): no `taxpayer_age` or `dob` field in the item schema. The node trusts `qcd_full` / `qcd_partial_amount` without verifying the taxpayer is 70½+. Invalid QCDs could silently reduce taxable income for younger taxpayers. Must be enforced at the UI/intake layer.

**PSO (Public Safety Officer) exclusion:**
- ✅ Limit: `PSO_EXCLUSION_LIMIT_2025 = 3_000` (IRC §402(l), statutory). Correct.
- ✅ Restricted to pension items (not IRA). Correct per IRC §402(l).

**Simplified Method (IRC §72(d)(1)):**
- ✅ Table 1 (single-life) and Table 2 (joint-life) both implemented with correct age bands (360/310/260/210/160 months; joint: 410/360/310/260/210).
- ✅ `prior_excludable_recovered` correctly reduces remaining cost basis.
- ✅ Annual exclusion capped at gross distribution. Correct.
- ✅ Only applied to pension items (not IRA). Correct.

**NUA (Net Unrealized Appreciation):**
- ⚠️ `box6_nua` captured in schema but not routed to any downstream node. NUA on employer securities in qualified plans is excluded from ordinary income and taxed as LTCG at distribution (IRC §402(e)(4)). The node does not subtract NUA from the taxable amount nor route it to Schedule D. Should be documented as out of scope or implemented.

**Inherited IRA / 10-year rule:**
- ⚠️ No `inherited_ira` or `beneficiary_type` field in the schema. The SECURE 2.0 10-year rule affects RMD scheduling but not taxability of individual distributions at this node. Absence of tracking means IRC §4974 RMD penalties cannot be computed. Acceptable if Form 5329 Part IX is out of scope for TY2025.

**Section summary:**

| # | Finding | Severity |
|---|---|---|
| 16.1 | All box fields captured; withholding routes to line25b correctly | ✅ PASS |
| 16.2 | Distribution codes 1/2/3/4/6/7/G/Q/T all routed correctly | ✅ PASS |
| 16.3 | Code 5 comment/routing conflates prohibited transaction with lump-sum | ⚠️ WARN |
| 16.4 | IRA vs. pension routing via box7_ira_sep_simple correct | ✅ PASS |
| 16.5 | QCD limit ($108,000) and IRA-only restriction correct | ✅ PASS |
| 16.6 | QCD age-70½ eligibility not enforced at node level (upstream gap) | ⚠️ WARN |
| 16.7 | PSO limit ($3,000) and pension-only restriction correct | ✅ PASS |
| 16.8 | Simplified Method tables and cost recovery correct | ✅ PASS |
| 16.9 | NUA (box6_nua) captured but not routed to Schedule D | ⚠️ WARN |
| 16.10 | No inherited IRA / beneficiary tracking for RMD enforcement | ⚠️ WARN |

**Section verdict:** ✅ PASS with warnings (0 hard failures, 4 warnings)

---

### SSA-1099 (Social Security Benefits)

**Box fields and routing:**
- ✅ Box 3 (gross benefits): captured as `box3_gross_benefits` (required). Net = max(0, Box 3 - Box 4). Routes to `line6a_ss_gross` on Form 1040 and to `agi_aggregator` for the IRC §86 taxability worksheet.
- ✅ Box 4 (repaid benefits): captured as `box4_repaid` (optional). Correctly subtracted from gross before routing. Matches Form 1040 Line 6a instructions ("box 5 of Form SSA-1099").
- ✅ Box 6 (voluntary withholding, W-4V): captured as `box6_federal_withheld`. Routes to `line25b_withheld_1099` on Form 1040. Correct.

**IRC §86 taxability worksheet:**
- ✅ Implemented in `agi_aggregator` (not in `ssa1099` node itself). The `ssa1099` node correctly delegates by routing `line6a_ss_gross` to `agi_aggregator`, which triggers `computeSsaTaxable()`.
- ✅ Provisional income = non-SSA other-AGI + 50% × SS gross. Correct per IRC §86(b)(1).
- ✅ MFJ/QSS thresholds: $32,000 (50% tier) / $44,000 (85% tier). Correct.
- ✅ All other filers (Single/HOH/MFS): $25,000 / $34,000. Correct.
- ✅ Below base threshold: 0% taxable. Correct.
- ✅ Between base and upper: 50% of excess, capped at 85% of gross. Correct.
- ✅ Above upper threshold: tiered formula (85% × excess-over-upper + 50% × min(upper–base, gross)), capped at 85%. Correct per IRS Pub. 915 worksheet.
- ❌ MFS-lived-with-spouse rule (IRC §86(c)(2)): when MFS and the taxpayer lived with their spouse at any time during the year, 85% of SS benefits are always taxable starting at $0 provisional income. The `computeSsaTaxable()` function uses standard $25,000/$34,000 thresholds for all MFS filers — incorrect for this case. No `mfs_lived_with_spouse` flag exists in the schema. Overstates the tax-free SS for affected MFS filers.
- ❌ Tax-exempt interest omitted from provisional income: IRC §86(b)(1) requires adding tax-exempt interest to provisional income. The `nonSsaIncome()` helper in `agi_aggregator` includes no tax-exempt interest field. This understates provisional income and causes taxable SS to be computed too low for taxpayers with municipal bond or other tax-exempt interest income.
- ⚠️ Lump-sum election (IRC §86(e)): if prior-year SS benefits are paid in the current year, taxpayers may elect to apply the prior year's income. No lump-sum election fields exist in the schema. Affects a small population but is an IRS-recognized computation path.

**Section summary:**

| # | Finding | Severity |
|---|---|---|
| 16.11 | Box 3/4 net benefit and Box 6 withholding routing correct | ✅ PASS |
| 16.12 | IRC §86 provisional income formula correct (50% × SS + other AGI) | ✅ PASS |
| 16.13 | MFJ and non-MFJ thresholds correct ($32K/$44K and $25K/$34K) | ✅ PASS |
| 16.14 | 0% / 50% / 85% tiered formula correct | ✅ PASS |
| 16.15 | MFS-lived-with-spouse: 85% always taxable at $0 threshold not implemented | ❌ FAIL |
| 16.16 | Tax-exempt interest omitted from provisional income (IRC §86(b)(1)) | ❌ FAIL |
| 16.17 | Lump-sum election (IRC §86(e)) not supported | ⚠️ WARN |

**Section verdict:** ❌ FAIL (2 hard failures, 1 warning)

**Required fixes before production:**
1. Add `tax_exempt_interest` field to `agi_aggregator` `inputSchema` and include it in `nonSsaIncome()` for the provisional income calculation (IRC §86(b)(1)).
2. Add `mfs_lived_with_spouse` boolean to `agi_aggregator` `inputSchema`. When `filing_status === "mfs"` and `mfs_lived_with_spouse === true`, bypass standard threshold logic and return `0.85 * ssaGross` directly (no provisional income test).

---

### RRB-1099R (Railroad Retirement)

**Box fields and routing:**
- ✅ Box 3 (SSEB/Tier 1 gross): captured as `box3_sseb_gross`. Net SSEB = max(0, Box 3 - Box 4), or Box 5 when provided directly.
- ✅ Box 4 (SSEB repaid): captured as `box4_sseb_repaid`. Correctly subtracted from gross.
- ✅ Box 5 (net SSEB, precomputed by RRB): captured as `box5_sseb_net`. Takes priority over computed Box 3 - Box 4 when provided. Correct per Pub. 575 p.20.
- ✅ Box 7 (SSEB federal withholding): captured as `box7_sseb_withheld`. Routes to `line25b_withheld_1099`. Correct.
- ✅ Box 8 (Tier 2/non-SSEB gross): captured as `box8_tier2_gross`. Routes to `line5a_pension_gross`. Correct.
- ✅ Box 9 (Tier 2 taxable, pre-computed): captured as `box9_tier2_taxable`. Used as fallback when Simplified Method not applicable. Correct per Pub. 575 p.22.
- ✅ Box 10 (Tier 2 federal withholding): captured as `box10_tier2_withheld`. Summed with Box 7 and routed to `line25b_withheld_1099`. Correct.
- ✅ Box 2a (Simplified Method taxable, highest priority): captured as `box2a_taxable_amount`. Overrides SM calc and Box 9 when present. Correct priority order per Pub. 575.

**Tier routing:**
- ✅ Tier 1 SSEB (SS-equivalent): routes to `line6a_ss_gross` on Form 1040. Treated as Social Security per Pub. 915 / Pub. 575. Correct.
- ❌ SSEB not forwarded to `agi_aggregator`: the `rrb1099r` node does not include `agi_aggregator` in its `outputNodes` and emits no output to `agi_aggregator`. The IRC §86 taxability worksheet (`computeSsaTaxable`) is therefore never triggered for RRB Tier 1 benefits. The taxable SS amount (line6b) will be zero for all RRB recipients unless the user manually provides `line6b_ss_taxable` to `agi_aggregator`. This is functionally equivalent to treating 100% of Tier 1 SSEB as non-taxable — a material understatement of income for recipients with other income above the IRC §86 thresholds. The `ssa1099` node correctly routes to `agi_aggregator`; `rrb1099r` does not.
- ✅ Tier 2 (pension/annuity): routes to `line5a_pension_gross` / `line5b_pension_taxable`. Treated as pension income. Correct per Pub. 575.

**Simplified Method (Tier 2 cost recovery):**
- ✅ Table 1 (single-life) implemented with correct age bands. Joint-life table not needed for RRB Tier 2 (acceptable).
- ✅ Priority order: `box2a_taxable_amount` > SM calc > `box9_tier2_taxable` > `box8_tier2_gross`. Correct.
- ✅ `prior_excludable_recovered` reduces remaining cost basis. Correct.
- ✅ Annual exclusion capped at gross Tier 2 amount. Correct.

**Withholding:**
- ✅ Both SSEB withholding (Box 7) and Tier 2 withholding (Box 10) summed and routed to `line25b_withheld_1099` in a merged f1040 output. Correct.

**Section summary:**

| # | Finding | Severity |
|---|---|---|
| 16.18 | Boxes 3/4/5/7/8/9/10 all captured correctly | ✅ PASS |
| 16.19 | Tier 1 SSEB routes to line6a (SS treatment) — correct | ✅ PASS |
| 16.20 | Tier 2 routes to lines 5a/5b (pension treatment) — correct | ✅ PASS |
| 16.21 | SSEB not forwarded to agi_aggregator — IRC §86 worksheet skipped for all RRB recipients | ❌ FAIL |
| 16.22 | Simplified Method for Tier 2: correct priority order, cost recovery, and cap | ✅ PASS |
| 16.23 | Combined withholding (Box 7 + Box 10) routes to line25b correctly | ✅ PASS |

**Section verdict:** ❌ FAIL (1 hard failure)

**Required fix before production:**
1. Add `agi_aggregator` to `rrb1099r` `outputNodes`. In `compute()`, emit `output(agi_aggregator, { line6a_ss_gross: ssebTotal })` when total net SSEB > 0. This enables the IRC §86 taxability worksheet to run for RRB Tier 1 benefits, matching the behavior of the `ssa1099` node.

---

## 16. Input Nodes

### Form 1099-DIV (Dividends)

- ✅ **Box 1a ordinary dividends route correctly.** When `totalBox1a > SCHEDULE_B_DIVIDEND_THRESHOLD` (1,500), each item routes to `schedule_b` with payer name and nominee flag. Below threshold, ordinary dividends flow directly to `f1040.line3b_ordinary_dividends` and `agi_aggregator`. Both paths are correct.
- ✅ **Schedule B threshold is correct.** `SCHEDULE_B_DIVIDEND_THRESHOLD = 1_500` (imported from `config/2025.ts`), matching IRC §6012 / Pub 550.
- ✅ **Box 1b qualified dividends route correctly.** Aggregated and emitted to `f1040.line3a_qualified_dividends` and to `income_tax_calculation` as `qualified_dividends` for the QDCGT worksheet (IRC §1(h)). Correct.
- ✅ **Box 2a cap gain distributions — simplified path.** When no sub-amounts (box2b/2c/2d) are present, routes to `f1040.line7a_cap_gain_distrib` and `income_tax_calculation.net_capital_gain`. Matches Form 1040 instructions when Schedule D is not required.
- ✅ **Box 2a cap gain distributions — Schedule D path.** When sub-amounts are present, routes to `schedule_d.line13_cap_gain_distrib`. Correct per Schedule D line 13.
- ✅ **Box 2b unrecaptured §1250 gain routes to `unrecaptured_1250_worksheet`.** Correct per IRS Unrecaptured §1250 Gain Worksheet instructions.
- ⚠️ **Box 2c §1202 gain (QSBS) routing is incomplete.** `box2c_qsbs` is passed to `schedule_d` only when `anySubAmounts` is true (box2b or box2d also nonzero). If box2c is the only sub-amount, `anySubAmounts` is false and box2c is silently dropped. Furthermore, §1202 QSBS gain is not a 28%-rate item — it is eligible for 50%-100% exclusion per IRC §1202 and should route to Form 8949 with code Q for the exclusion. No exclusion computation exists.
- ✅ **Box 2d collectibles (28%) gain routes to `rate_28_gain_worksheet.collectibles_gain`.** Correct per IRS rate_28 worksheet instructions.
- ⚠️ **Box 2f (§897 capital gain) is silently discarded.** Accepted in the schema and used in validation (must not exceed box2a), but never produces any output. §897 gain is relevant for foreign persons and withholding tracking; silently discarding it is a schema/data integrity gap.
- ✅ **Box 5 §199A dividends route correctly.** Filtered by holding period (>=45 days), then routed to `form8995` or `form8995a` based on QBI thresholds (197,300 single / 394,600 MFJ from config). Correct.
- ✅ **Box 6 investment expenses — correctly not routed.** TCJA (P.L. 115-97) suspended the investment expenses deduction through TY2025; ignoring box 6 is correct.
- ✅ **Box 7 foreign tax paid routes correctly.** Filtered by holding period (>=16 days per IRC §901(k)); routes to `schedule3.line1_foreign_tax_1099` (<= threshold) or `form_1116` (above). Thresholds ($300 single / $600 MFJ) match Pub 514.
- ✅ **Box 12 tax-exempt interest dividends route to `f1040.line2a_tax_exempt`.** Correct.
- ✅ **Box 13 specified PAB interest routes to `form6251.private_activity_bond_interest`.** Correct AMT preference item per IRC §57(a)(5).
- ✅ **Box 4 federal tax withheld routes to `f1040.line25b_withheld_1099`.** Correct.
- ✅ **Validation is thorough.** Cross-field guards: box1b <= box1a, box2b+2c+2d+2f <= box2a, box2e <= box1a, box13 <= box12. All correct.
- ⚠️ **Nominee dividends inflate income on below-threshold returns.** When total box1a <= $1,500, the full amount (including nominee dividends) is sent to `agi_aggregator` and `f1040.line3b`. Nominee dividends should be excluded from the taxpayer's income; the nominee flag is only used when Schedule B is triggered. Below-threshold nominees result in overstated dividend income.

---

### Form 1099-INT (Interest)

- ✅ **Box 1 interest income routes correctly.** Every item routes to `schedule_b` via `scheduleBOutput()`. `computeTaxableInterestNet()` correctly combines box1 + box3 + box10 - box11 - box12 - nominee_interest - accrued_interest_paid - non_taxable_oid_adjustment before sending to Schedule B. Correct per Pub 550.
- ✅ **Box 2 early withdrawal penalty routes to `schedule1.line18_early_withdrawal`.** Correct per IRC §62(a)(9).
- ✅ **Box 3 US savings bond interest included in Schedule B and flagged.** `box3` flows into `computeTaxableInterestNet` and is passed as `box3_us_obligations` to Schedule B for potential Form 8815 exclusion handling downstream. Correct architecture.
- ✅ **Box 4 federal tax withheld routes to `f1040.line25b_withheld_1099`.** Correct.
- ✅ **Box 8 tax-exempt interest routes to `f1040.line2a_tax_exempt`.** Computes `sum(box8 - box13)` net of bond premium on tax-exempt. Correct — needed for SS provisional income and MAGI.
- ✅ **Box 9 specified private activity bond interest routes to `form6251.line2g_pab_interest`.** Correct AMT preference item per IRC §57(a)(5) and Form 6251 Line 2g.
- ✅ **Box 10 market discount included in taxable interest.** Added in `computeTaxableInterestNet`. Correct — market discount is ordinary income per IRC §1278.
- ✅ **Box 11 bond premium reduces taxable interest.** Subtracted in `computeTaxableInterestNet`. Correct for taxpayers who elected amortization under IRC §171.
- ✅ **Box 6 foreign tax paid routes correctly.** Routes to `schedule3` (<= threshold) or `form_1116` (above), using $300/$600 thresholds. Values match Pub 514.
- ❌ **`agi_aggregator` is not in `outputNodes` and interest income is never directly sent to it.** The node routes all items to Schedule B, which presumably forwards to `agi_aggregator`. If Schedule B is bypassed or fails to forward, taxable interest would be excluded from AGI. Verify Schedule B correctly routes to `agi_aggregator`; the 1099-INT node itself has no direct AGI connection.
- ⚠️ **Foreign tax constants redeclared locally instead of imported from config.** `FOREIGN_TAX_SINGLE_THRESHOLD = 300` and `FOREIGN_TAX_MFJ_THRESHOLD = 600` are redeclared in the file rather than imported from `config/2025.ts`. No bug at current values, but a future config update would not apply here.
- ⚠️ **Bond premium amortization election not modeled.** Box 11 is always subtracted regardless of whether the taxpayer elected to amortize under IRC §171. Taxpayers who have not made this election must treat the unamortized premium as a capital loss on disposition instead. Silently applying the offset could understate taxable interest income.

---

### Form 1099-OID (Original Issue Discount)

- ✅ **Box 1 OID routes correctly.** `netTaxableOid()` computes `max(0, box1_oid - box6_acquisition_premium - nominee_oid)` and combines with `box2_other_interest` to send `taxable_interest_net` to `schedule_b`. Correct per Pub 1212 and Schedule B instructions.
- ✅ **Box 2 other periodic interest included in `taxable_interest_net`.** Correct — box2 is ordinary interest income.
- ✅ **Box 6 acquisition premium correctly reduces OID.** Subtracted in `netTaxableOid()` per IRC §1272(a)(7) and Pub 1212. Correct.
- ❌ **Box 8 OID on US Treasury obligations is silently dropped.** `box8_oid_treasury` is present in the schema with correct comment but is never consumed in any output function — not added to `netTaxableOid()`, not passed to Schedule B, not sent anywhere. Treasury OID is federally taxable and must be reported on Schedule B as interest income. This is an active correctness defect — an entire category of interest income is excluded from the return.
- ✅ **Box 11 tax-exempt OID (private activity bonds) routes to `form6251.line2g_pab_interest`.** Correct AMT preference item per IRC §57(a)(5).
- ✅ **Box 4 federal withholding routes to `f1040.line25b_withheld_1099`.** Correct.
- ⚠️ **Box 3 early withdrawal penalty not routed.** `box3_early_withdrawal_penalty` is in the schema with the correct comment ("deductible on Schedule 1 line 18") but no output is generated. The omission means the OID early withdrawal penalty deduction is never claimed.
- ⚠️ **Box 9 investment expenses not routed.** Accepted in schema and commented as IRC §212, but suspended under TCJA IRC §67(g) through TY2025 — so not routing it is technically correct. However the comment incorrectly implies it is still deductible; should be noted as TCJA-suspended.
- ⚠️ **`agi_aggregator` not in output nodes.** Same latent risk as 1099-INT: OID flows to Schedule B but the node itself has no direct AGI connection.
- ⚠️ **Nominee OID not flagged to Schedule B.** `nominee_oid` is subtracted in `netTaxableOid()` (correct), but the Schedule B output does not pass a nominee flag or separate nominee line. Per Pub 550, nominee interest must be listed separately on Schedule B with a subtraction entry.

---

### Form 1099-B (Brokerage)

- ✅ **Box 1a/1b/1c (description, date acquired, date sold) captured and routed.** All three fields flow into `form8949.transaction`. Correct.
- ✅ **Box 1d proceeds routes correctly.** `proceeds` flows to `form8949.transaction.proceeds`. Correct.
- ✅ **Box 1e cost basis routes correctly.** `cost_basis` flows to `form8949.transaction.cost_basis`. Correct.
- ❌ **Box 1f accrued market discount entirely absent from schema.** No field exists for this box. Market discount on bonds is ordinary income per IRC §1278 and must be recognized when the bond is sold. Taxpayers with bond sales that have accrued market discount will have the discount amount misclassified as capital gain rather than ordinary income, understating ordinary income and potentially overstating capital gain.
- ⚠️ **Box 1g wash sale loss disallowed modeled indirectly.** No explicit `wash_sale_disallowed` field exists. Wash sale disallowance (code W) is expected via generic `adjustment_codes` (string) and `adjustment_amount` (number). Functionally workable but inherits the validation gaps from the Form 8949 audit — no code enum, no sign enforcement.
- ✅ **Box 2 short-term vs long-term classification routes correctly.** `part` enum A/B/C (short-term) vs D/E/F (long-term); `LONG_TERM_PARTS = new Set(["D","E","F"])` drives `is_long_term`. Correct.
- ✅ **Box 5 noncovered securities handled via Parts B/E.** Caller is responsible for providing basis for noncovered securities. Correct design.
- ✅ **Routes to Form 8949 with part code preserved.** Each item produces one `form8949` output with part passed through. Correct.
- ✅ **Federal withholding routes to `f1040.line25b_withheld_1099`.** Correct.
- ⚠️ **`cost_basis` is required for all parts including noncovered (B/E).** If a caller passes 0 for unknown basis, the gain/loss calculation silently treats 0 as the actual basis, inflating gains. A nullable basis with a "basis not reported" flag would be more accurate.
- ⚠️ **Digital asset parts G-L not supported.** The `part` enum only covers A-F. TY2025 Form 8949 added Parts G-L for 1099-DA digital asset transactions. If a separate 1099-DA node handles these, this is acceptable — but the 1099-B node cannot express those parts if needed.

**Section verdict:** ⚠️ PARTIAL — Two active correctness defects: (1) 1099-OID box 8 Treasury OID is silently dropped, excluding taxable interest from the return; (2) 1099-B box 1f accrued market discount has no schema field, causing market discount to be misclassified as capital gain. 1099-DIV and 1099-INT are largely correct with lower-priority gaps around nominee handling, §1202 routing, and bond premium election modeling.

---

## 16. Input Nodes — Self-Employment and Other Income

**Files reviewed:**
- `forms/f1040/nodes/inputs/f1099nec/index.ts`
- `forms/f1040/nodes/inputs/f1099k/index.ts`
- `forms/f1040/nodes/inputs/f1099g/index.ts`
- `forms/f1040/nodes/inputs/f1099m/index.ts`
- `forms/f1040/nodes/inputs/f1099c/index.ts`
- `forms/f1040/nodes/config/2025.ts`

---

### Form 1099-NEC (Nonemployee Compensation)

- ✅ **Box 1 nonemployee compensation routes to Schedule C correctly.** `necIncomeOutput()` constructs a full `schedule_cs` item per payer including required header fields (`line_a_principal_business`, `line_b_business_code = "999999"`, `line_f_accounting_method = "cash"`, `line_g_material_participation = true`) and `line_1_gross_receipts = box1`. This is the correct destination and schema shape.
- ✅ **Box 4 federal withholding routes to Form 1040 Line 25b correctly.** `output(f1040, { line25b_withheld_1099: box4 })` in `processItem()` — correct.
- ✅ **SE tax is triggered correctly.** NEC income routes into the `schedule_c` node, which independently calls `schedule_se` when net profit ≥ $400. The chain is: f1099nec → schedule_c → schedule_se → SE tax. No bypass is possible through this path.
- ✅ **Schedule C instancing is correct.** Each 1099-NEC item produces a separate Schedule C entry (one per payer), which is correct for multiple unrelated self-employment income sources.
- ✅ **Alternative routing (`schedule_f`, `form_8919`, `schedule_1_line_8z`) is handled.** The `for_routing` field correctly supports farming income (Schedule F), worker reclassification (Form 8919), and non-SE other income (Schedule 1 line 8z) — all valid per IRS guidance.
- ❌ **Box 3 (golden parachute payments) does not exist on Form 1099-NEC.** The TY2025 1099-NEC has only Boxes 1 (NEC), 2 (direct sales checkbox), 4 (federal withheld), 5 (state tax withheld), 6 (state/payer ID), and 7 (state income). Box 3 was never present on 1099-NEC — golden parachute payments appear on 1099-MISC. The schema accepts `box3_golden_parachute` and routes it to `schedule1.line8z_golden_parachute` and `schedule2.line17k_golden_parachute_excise` (20% excise). This is a phantom field mapped to the wrong form.
- ⚠️ **`line_b_business_code` defaults to `"999999"` (unclassified).** No mechanism exists for the taxpayer to supply the correct NAICS activity code, resulting in an unclassified Schedule C on every NEC-sourced entry.
- ⚠️ **`schedule2` is declared in `outputNodes` solely for the phantom box3 golden parachute excise.** If box3 is removed, schedule2 becomes an unused declared output node.

---

### Form 1099-K (Payment Networks)

- ❌ **Box 1a gross payment amount is not routed to any income schedule.** The node only emits federal withholding. Under TY2025 law, 1099-K gross payments above the reporting threshold must be included in the taxpayer's gross income — typically Schedule C (business) or Schedule 1 line 8z (casual/personal). The primary taxable amount is entirely absent from all outputs.
- ❌ **TY2025 threshold constant is wrong.** `TPSO_GROSS_THRESHOLD = 20_000` with a comment citing the "One Big Beautiful Bill Act" (P.L. 119-21, OBBBA). The OBBBA enacted a **$5,000** gross threshold for TY2025 (IRC §6050W as amended). The $20,000 / 200-transaction limit was the pre-ARPA transitional rule for TY2023; $5,000 / no transaction count is the TY2025 rule. The constant is off by a factor of 4.
- ❌ **The threshold constant is never applied.** `TPSO_GROSS_THRESHOLD` is exported for reference only; no filtering logic in `compute()` uses it. Even if corrected to $5,000, it would have no effect.
- ⚠️ **No business vs. personal payment differentiation.** Without a `for_routing` field (analogous to f1099nec), all 1099-K receipts have no income treatment. A routing field (→ Schedule C, → Schedule 1 line 8z, or → excluded/reimbursement) is the minimum needed.
- ✅ **Box 4 federal withholding (backup withholding) routes correctly.** `federalWithholdingOutputs()` maps box4 → `f1040.line25b_withheld_1099` — correct.
- ✅ **Monthly consistency validation is implemented.** `validateItem()` checks that the sum of boxes 5a–5l matches box 1a within $1 rounding tolerance when all monthly fields are present — sound data quality check.
- ✅ **Schema is comprehensive.** All box fields (1a, 1b, 2–8, 5a–5l) are captured with correct types and optionality.

---

### Form 1099-G (Government Payments)

- ✅ **Box 1 unemployment compensation routes correctly.** `netUnemployment()` computes gross minus repaid and routes to `schedule1.line7_unemployment` when ≥ $10 — correct per IRC §85.
- ✅ **Box 1 repayment offset is handled.** `box_1_repaid` is subtracted from gross before routing — correct per IRS Pub. 525.
- ✅ **Box 2 state/local tax refund taxability gate is correct.** `totalStateRefundTaxable()` includes box 2 only when `box_2_prior_year_itemized === true` — correctly implements the tax benefit rule (IRC §111).
- ✅ **Box 2 routes to Schedule 1 Line 1 (state/local refunds).** `schedule1.line1_state_refund` — correct destination.
- ✅ **Box 4 federal withholding routes to Form 1040 Line 25b correctly.** `f1040Output()` aggregates all items and emits `line25b_withheld_1099`.
- ✅ **Box 5 RTAA payments are treated as taxable.** Routes to `schedule1.line8z_rtaa` with a $600 minimum threshold — correct per IRS 1099-G instructions.
- ✅ **Box 6 taxable grants route to Schedule 1 line 8z.** `line8z_taxable_grants` with $600 threshold — correct.
- ✅ **Box 7 agriculture payments and Box 9 market gain route to Schedule F.** `line4a_gov_payments` and `line5_ccc_gain` — correct destinations per Schedule F instructions.
- ✅ **AGI aggregator receives all income items in parallel.** Dual-routing to schedule1 and agi_aggregator is correct.
- ⚠️ **`scheduleFOutput()` uses an unsafe `as unknown as` cast.** `line4a_gov_payments` and `line5_ccc_gain` are not in `schedule_f`'s declared `inputSchema`. The comment acknowledges these fields were "silently dropped before." Agriculture payments and CCC market gain will be discarded at runtime. The `schedule_f` schema must be updated to accept these fields.
- ⚠️ **`box_1_railroad` flag is captured but has no routing effect.** Railroad unemployment is taxed identically to regular unemployment (Schedule 1 line 7), so this is functionally correct — but the flag is never read in any compute logic and its purpose is undocumented.

---

### Form 1099-MISC (Miscellaneous)

- ✅ **Box 2 royalties default to Schedule E Part I.** `royaltiesForScheduleE()` defaults routing to `"schedule_e"` — correct for investment royalties (IRC §212; Schedule E Part I).
- ✅ **Box 2 royalties can be rerouted to Schedule C.** `royaltiesForScheduleC()` handles active business royalties — correct.
- ✅ **Box 3 other income routes to Schedule 1.** Default `"prizes_awards"` → `schedule1.line8i_prizes_awards`; explicit `"other_income"` → `schedule1.line8z_other`. Both correct.
- ✅ **Box 4 federal withholding routes to Form 1040 Line 25b.** Aggregated across all items → `f1040.line25b_withheld_1099` — correct.
- ✅ **Box 6 medical/health care payments route to Schedule C.** Included in `scheduleCGrossReceipts()` — correct per IRS 1099-MISC instructions.
- ✅ **Box 9 crop insurance proceeds route to Schedule F.** `cropInsuranceTotal()` filters out deferred amounts (`box9_crop_insurance_deferred`) and routes to `schedule_f.crop_insurance` — correct per IRC §451(d).
- ✅ **Box 10 attorney gross proceeds: taxability handling is correct.** Routes to `schedule1.line8z_attorney_proceeds` unless `box10_attorney_taxable === false`. Default-taxable behavior is correct; `false` flag handles IRC §104 physical injury exclusions. Box numbering matches TY2025 1099-MISC redesign (was Box 14 pre-2020 — code is correct at Box 10).
- ✅ **Box 15 NQDC routes to Schedule 1 (ordinary income) and Schedule 2 (20% excise).** `line8z_nqdc` + `line17h_nqdc_tax` at 20% — correct per IRC §409A(a)(1)(B).
- ⚠️ **`scheduleEOutput()` uses an unsafe `as unknown as` cast.** `rental_income` and `royalty_income` are not in `schedule_e`'s declared `inputSchema`. Rental income and royalty income from 1099-MISC will be silently discarded. The `schedule_e` schema must be updated.
- ⚠️ **Schedule C lump-sum routing loses per-business expense granularity.** `scheduleCGrossReceipts()` aggregates medical payments, fishing proceeds, fish purchased, and business rents/royalties into a single `line1_gross_receipts` routed as a top-level field (not a `schedule_cs` item). Expenses cannot be individually deducted against these income sources. The per-payer `schedule_cs` approach used in f1099nec is more defensible.
- ⚠️ **Box 1 rents: no substantial-services check.** Default routing is Schedule E (correct for passive rents), but there is no prompt or validation to flag cases where substantial services are provided (→ Schedule C).

---

### Form 1099-C (Cancellation of Debt)

- ✅ **Box 2 COD amount routes to Schedule 1 line 8c for taxable items.** `taxableItems()` filter + `schedule1.line8c_cod_income` — correct per IRC §61(a)(12) and Schedule 1 instructions.
- ✅ **Taxable COD also routes to AGI aggregator.** Dual-routing to both schedule1 and agi_aggregator is correct.
- ✅ **Box 4 (debt description) and Box 5 (personally liable) are captured in schema.** `box4_debt_description` and `box5_personal_use` are informational fields — correctly not routed to any output.
- ✅ **Excluded COD routes to Form 982 Line 2.** `excludedItems()` filter → `form982.line2_excluded_cod` — correct destination for excluded income.
- ✅ **Property disposition events route to Schedule D.** When `box7_fmv_property > 0`, a Schedule D entry is emitted with `cod_property_fmv` and `cod_debt_cancelled` — correctly handles the deemed sale component for foreclosures and repossessions.
- ❌ **No Form 982 exclusion type differentiation.** Form 982 requires checking one of five election lines: Line 1a (title 11 bankruptcy), Line 1b (insolvency), Line 1c (QPRI — qualified principal residence indebtedness), Line 1d (qualified farm indebtedness), Line 1e (qualified real property business indebtedness). All excluded amounts are routed to `form982.line2_excluded_cod` regardless of exclusion type, making Form 982 impossible to complete correctly. A `exclusion_type` enum (`bankruptcy` | `insolvency` | `qpri` | `farm_debt` | `real_property_business`) is required.
- ⚠️ **No insolvency worksheet integration.** The insolvency exclusion (IRC §108(a)(1)(B)) requires computing total liabilities minus FMV of total assets immediately before discharge. The node relies entirely on the caller-supplied `routing: "excluded"` flag without any verification of insolvency. An insolvency calculation worksheet output is needed for a complete implementation.
- ⚠️ **`box6_identifiable_event` is an unvalidated free-form string.** IRS 1099-C Box 6 uses single-letter event codes (A = bankruptcy, B = other judicial proceeding, C = statute of limitations, D = foreclosure, E = debt relief, F = by agreement, G = decision, H = expiration of non-payment testing period). An enum would enforce valid codes and enable automatic exclusion routing suggestions.
- ⚠️ **`box3_interest` captured but not separately routed.** Per IRS 1099-C instructions, box 3 is interest already included in the box 2 cancelled amount — not in addition to it. Omitting separate routing is correct, but a code comment would prevent future misinterpretation.

---

### Section 16 Summary

| Severity | Node | Issue |
|----------|------|-------|
| CRITICAL | f1099k | Box 1a gross payments produce zero income output — entire 1099-K income unreported |
| CRITICAL | f1099k | TY2025 TPSO threshold constant is $20,000; OBBBA enacted $5,000 for TY2025 |
| CRITICAL | f1099k | Threshold constant is exported but never applied in any routing or filtering logic |
| CRITICAL | f1099nec | Box 3 (golden parachute) does not exist on Form 1099-NEC — phantom field with phantom excise computation |
| CRITICAL | f1099c | Form 982 exclusion type not differentiated — all exclusions routed to line2; Form 982 cannot be completed correctly |
| HIGH | f1099g | `scheduleFOutput()` unsafe cast — `line4a_gov_payments` and `line5_ccc_gain` silently dropped at runtime |
| HIGH | f1099m | `scheduleEOutput()` unsafe cast — `rental_income` and `royalty_income` silently dropped at runtime |
| HIGH | f1099m | Schedule C lump-sum loses per-business expense deductibility for medical/fishing/rents/royalties |
| MEDIUM | f1099k | No `for_routing` field — no mechanism to distinguish business vs. personal/reimbursement payments |
| MEDIUM | f1099c | `box6_identifiable_event` should be an enum; insolvency worksheet not integrated |
| LOW | f1099nec | Business code defaults to unclassified `"999999"` with no taxpayer override path |
| LOW | f1099nec | `schedule2` in `outputNodes` only used for phantom box3; becomes dead declaration if box3 is removed |
| LOW | f1099g | `box_1_railroad` flag captured but is a no-op with no documented purpose |

---

## 16. Input Nodes — educator_expenses, nol_carryforward, f1040es, f2441, f1099patr, f2106, schedule_j, schedule_r, qbi_aggregation, lump_sum_ss

### 16.A educator_expenses (`inputs/educator_expenses/index.ts`)

**IRS Authority:** IRC §62(a)(2)(D); Rev. Proc. 2024-40 §3.12

| Check | Result |
|-------|--------|
| Per-educator cap $300 (TY2025) | ✅ PASS — `PER_EDUCATOR_CAP = 300` |
| MFJ dual-educator cap $600 | ✅ PASS — sum of `educator1Deduction + educator2Deduction`; educator2 fires only when `filing_status === FilingStatus.MFJ` |
| Non-MFJ capped at $300 (educator2 excluded) | ✅ PASS — `educator2Deduction` returns 0 for all statuses except MFJ |
| Routes to Schedule 1 Line 11 | ✅ PASS — `output(schedule1, { line11_educator_expenses: deduction })` |
| Routes to agi_aggregator | ✅ PASS — dual-output pattern mirrors other above-the-line deductions |
| Eligible expense category enforcement | ⚠️ WARN — Schema accepts any nonnegative amount; no restriction to classroom supplies, books, PPE, or computer equipment. Category validation is an upstream responsibility, but no schema comment or guard documents this assumption |
| educator2_expenses silently ignored for non-MFJ | ⚠️ WARN — A non-MFJ filer who mistakenly provides `educator2_expenses` receives no error; the value is silently discarded. A `.superRefine()` guard would improve UX |

**Verdict:** ✅ PASS — Core deduction logic, per-educator cap, MFJ cap, and routing are all correct. Two minor schema UX gaps only.

---

### 16.B nol_carryforward (`inputs/nol_carryforward/index.ts`)

**IRS Authority:** IRC §172; TCJA P.L. 115-97

| Check | Result |
|-------|--------|
| Post-2017 80% taxable income limit | ✅ PASS — `POST2017_INCOME_LIMIT = 0.80`; applied to income remaining after pre-2018 deduction |
| Pre-2018 100% taxable income limit | ✅ PASS — `PRE2018_INCOME_LIMIT = 1.00` |
| Pre-2018 applied before post-2017 | ✅ PASS — `computeNolDeduction` deducts pre-2018 first, then applies post-2017 against `incomeAfterPre2018` |
| Zero/negative income edge case | ✅ PASS — `Math.max(0, taxableIncome)` prevents negative limits |
| Routes to Schedule 1 Line 8a | ✅ PASS — `output(schedule1, { line8a_nol_deduction: deduction })` |
| Pre-2018 carryback not implemented | 🔍 NOTE — Pre-2018 NOLs have a 2-year carryback right (IRC §172(b)(1)(A)). Only carryforward is modeled — known scope limitation for a forward-looking engine |
| Pipeline sequencing for `current_year_taxable_income` | ⚠️ WARN — Taxable income is normally computed from upstream nodes; requiring it as a direct input creates a forward dependency. No guard prevents feeding pre-deduction income or a stale value |

**Verdict:** ✅ PASS — Post-TCJA limitation correctly computed. Pre-2018 carryback out of scope (acceptable). Pipeline sequencing gap is architectural, not a calculation error.

---

### 16.C f1040es (`inputs/f1040es/index.ts`)

**IRS Authority:** Form 1040-ES instructions; Form 1040 Line 26

| Check | Result |
|-------|--------|
| All four quarterly payments captured | ✅ PASS — `payment_q1` through `payment_q4`, all optional and nonnegative |
| Total routed to Form 1040 Line 26 | ✅ PASS — `fields: { line26_estimated_tax: total }` |
| Zero-payment short-circuit | ✅ PASS — `if (total === 0) return { outputs: [] }` |
| Prior-year overpayment applied to current year | ❌ FAIL — No field captures the amount of a prior-year overpayment the taxpayer elected to apply to the current year. This amount also flows to Form 1040 Line 26 as a separate entry from quarterly payments; its absence understates Line 26 for affected taxpayers |

**Verdict:** ⚠️ WARN — Quarterly payment routing is correct. Missing prior-year overpayment carry-forward field causes understatement of Line 26 payments.

---

### 16.D f2441 (`inputs/f2441/index.ts`)

**IRS Authority:** IRC §21; IRC §129; Form 2441 Instructions

**Note:** This node computes both the employer exclusion (Part III) and the dependent care credit (Part II) inline — it is a full computation node, not a pass-through input.

| Check | Result |
|-------|--------|
| Qualifying expense cap: $3,000 / $6,000 | ✅ PASS — `EXPENSE_CAP_ONE_PERSON = 3000`, `EXPENSE_CAP_TWO_PLUS = 6000` |
| Employer exclusion cap: $5,000; $2,500 MFS | ✅ PASS — `exclusionLimit()` returns 2500 when `filingStatus === "mfs"`, 5000 otherwise |
| Credit rate AGI phase-down (35% → 20%) | ✅ PASS — `creditRate()` steps down 1% per $2,000 above $15,000, floored at 20%; integer basis-point arithmetic avoids float rounding |
| Earned income limitation (MFJ: min of both spouses) | ✅ PASS — `Math.min(earnedIncomeTaxpayer, earnedIncomeSpouse)` for MFJ |
| Residual cap reduced by excluded employer benefits | ✅ PASS — `residualCap = Math.max(0, cap - excludedBenefits)` applied before expense cap |
| Taxable employer benefits → F1040 Line 1e | ✅ PASS — `output(f1040, { line1e_taxable_dep_care: taxableBenefits })` |
| Credit → Schedule 3 Line 2 | ✅ PASS — `output(schedule3, { line2_childcare_credit: credit })` |
| Credit rate constants duplicated vs. config/2025.ts | ⚠️ WARN — `CREDIT_RATE_AGI_THRESHOLD = 15000` and `CREDIT_RATE_BRACKET_SIZE = 2000` are hardcoded locally rather than imported from `config/2025.ts` where `DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025` / `DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025` exist. Divergence risk if config is updated |

**Verdict:** ✅ PASS — Credit computation and employer exclusion logic are correct. Duplicate constants are a maintainability concern only.

---

### 16.E f1099patr (`inputs/f1099patr/index.ts`)

**IRS Authority:** IRC §1385; Form 1099-PATR instructions; IRC §199A(g)

| Check | Result |
|-------|--------|
| Box 1 patronage dividends (non-business) → Schedule 1 Line 8z | ✅ PASS — `nonBusinessItems()` filter + `totalPatronageDividends()` |
| Box 3 per-unit retain (non-business) → Schedule 1 Line 8z | ✅ PASS — included in `schedule1Output()` total |
| Box 4 federal withheld → F1040 Line 25b | ✅ PASS — `output(f1040, { line25b_withheld_1099: withheld })` |
| Box 2 nonpatronage distributions (non-business) → Schedule 1 Line 8z | ✅ PASS — included in total |
| Box 5 redeemed nonqualified (non-business) → Schedule 1 Line 8z | ✅ PASS — included in total |
| Box 6 DPAD (expired post-2017) | ✅ PASS — captured in schema, no output; correctly noted as expired |
| Business income (trade_or_business=true) routing to Schedule C/F | ❌ FAIL — Items where `trade_or_business === true` are excluded from `schedule1Output()` but then DROPPED ENTIRELY with no Schedule C or F output. Business patronage dividends and per-unit retain should flow to the taxpayer's Schedule C or F; silently discarding them understates business income |
| Box 7 qualified payments → Form 8995/8995A | ❌ FAIL — `box7_qualified_payments` is captured in schema with comment "informational for Form 8995/8995A; tracked here but no direct output." It is never forwarded. The cooperative §199A computation requires this field |
| Box 9 §199A(g) cooperative deduction | ❌ FAIL — `box9_section199a_deduction` is captured but produces no output. The cooperative-level §199A(g) deduction must be passed to Form 8995-A; it is silently dropped |

**Verdict:** ❌ FAIL — Three critical routing gaps: (1) business patronage dividends/per-unit retain silently dropped; (2) Box 7 qualified payments not forwarded to QBI computation; (3) Box 9 §199A(g) cooperative deduction never reaches Form 8995-A.

---

### 16.F f2106 (`inputs/f2106/index.ts`)

**IRS Authority:** IRC §67(h); IRC §62(b); Notice 2025-05; IRC §274(n)(1)

| Check | Result |
|-------|--------|
| Post-TCJA restriction to 4 qualifying categories | ✅ PASS — `employee_type: z.nativeEnum(EmployeeType)` is required; all four statutory categories enumerated |
| Standard mileage rate $0.70/mile (Notice 2025-05) | ✅ PASS — `STANDARD_MILEAGE_RATE = 0.70` |
| Actual expense method with business-use percentage | ✅ PASS — `actual_vehicle_expenses * (business_use_pct / 100)` |
| 50% meals limitation (IRC §274(n)(1)) | ✅ PASS — `MEALS_DEDUCTION_PCT = 0.50` |
| Net of employer reimbursements, floored at zero | ✅ PASS — `Math.max(0, totalExpenses - employer_reimbursements)` |
| Routes to Schedule 1 Line 12 | ✅ PASS — `output(schedule1, { line12_business_expenses: total })` |
| Routes to agi_aggregator | ✅ PASS |
| Performing artist $16,000 AGI limit (IRC §62(b)(1)(C)) | ❌ FAIL — `F2106_PERFORMING_ARTIST_AGI_LIMIT = 16_000` is defined in `config/2025.ts` but is **never imported or enforced** in this node. A performing artist with combined AGI above $16,000 is ineligible for the above-the-line deduction, but the node emits the deduction unconditionally for all PERFORMING_ARTIST items regardless of AGI |

**Verdict:** ❌ FAIL — The performing artist AGI limit is a statutory compliance requirement defined in config but never enforced. All other logic is correct. Fix: require an AGI input field and gate the PERFORMING_ARTIST output against `F2106_PERFORMING_ARTIST_AGI_LIMIT`.

---

### 16.G schedule_j (`inputs/schedule_j/index.ts`)

**IRS Authority:** IRC §1301; Schedule J (Form 1040); TY2025 base years: 2022–2024

| Check | Result |
|-------|--------|
| Elected farm income captured | ✅ PASS — `elected_farm_income: z.number().nonnegative()` |
| Capital gain portion of elected income captured | ✅ PASS — `elected_farm_income_capital_gain` optional field |
| Three base-year taxable incomes captured | ✅ PASS — `prior_year_taxable_income_py1/py2/py3` (2022, 2023, 2024 for TY2025) |
| Schedule J computed tax routes to F1040 Line 16 | ✅ PASS — `output(f1040, { line16_income_tax: input.schedule_j_tax })` replaces standard tax computation |
| Guard: no output when elected_farm_income = 0 | ✅ PASS — `hasElectedFarmIncome()` guard |
| In-engine Schedule J worksheet computation | 🔍 NOTE — Accepts `schedule_j_tax` as a pre-computed taxpayer input rather than computing multi-year tax from bracket tables; deliberate "taxpayer-computes" design consistent with Schedule J's complexity |
| Base-year income fields used in computation | ⚠️ WARN — `prior_year_taxable_income_py1/py2/py3` are captured in the schema but never read in `compute()`. Dead inputs — either use them to verify Schedule J internally, or remove them to avoid implying in-engine computation |

**Verdict:** ✅ PASS — Routing to Form 1040 Line 16 is correct. Pre-computed input design is acceptable. Unused base-year income fields are schema noise.

---

### 16.H schedule_r (`inputs/schedule_r/index.ts`)

**IRS Authority:** IRC §22; Schedule R instructions (TY2025; amounts not inflation-adjusted)

| Check | Result |
|-------|--------|
| Single/HOH base amount $5,000 | ✅ PASS — `BASE_AMOUNT[FilingStatus.Single] = 5000` |
| MFJ both qualify: $7,500 | ✅ PASS — `MFJ_BOTH_BASE = 7500` |
| MFJ one qualifies: $5,000 | ✅ PASS — `MFJ_ONE_BASE = 5000` |
| MFS base: $3,750 | ✅ PASS — `BASE_AMOUNT[FilingStatus.MFS] = 3750` |
| Disability income cap for disability-only qualifying | ✅ PASS — `capByDisabilityIncome()` applies only when `taxpayer_disabled === true && taxpayer_age_65_or_older !== true` |
| Reduction by nontaxable SSA/RRB/VA benefits | ✅ PASS — `nontaxable_ssa + nontaxable_pension + nontaxable_va` subtracted |
| AGI phase-out: 50% of excess over threshold | ✅ PASS — `excess * 0.5` reduction |
| AGI phase-out thresholds (Single/HOH $7,500; MFJ $10,000; MFS $5,000) | ✅ PASS — matches `AGI_PHASEOUT` table |
| Final credit rate 15% | ✅ PASS — `amount * 0.15` rounded to cents |
| Routes to Schedule 3 Line 6d | ✅ PASS — `output(schedule3, { line6d_elderly_disabled_credit: credit })` |
| `BASE_AMOUNT[FilingStatus.MFJ]` dead code | ⚠️ WARN — MFJ is handled by the explicit branch in `initialAmount()`; the `BASE_AMOUNT[MFJ]` table entry is never read |
| Nonrefundable credit tax liability cap | 🔍 NOTE — Deferred to Schedule 3 aggregation layer, consistent with other nonrefundable credits |

**Verdict:** ✅ PASS — All statutory amounts, phase-out mechanics, and credit rate are correct. Dead code in `BASE_AMOUNT` table is cosmetic only.

---

### 16.I qbi_aggregation (`inputs/qbi_aggregation/index.ts`)

**IRS Authority:** IRC §199A(b)(1); Reg. §1.199A-4; Form 8995-A Schedule B

| Check | Result |
|-------|--------|
| Aggregation groups with business names captured | ✅ PASS — `aggregationGroupSchema` requires `group_name` and `business_names` array |
| `combined_for_limitation` flag captured | ✅ PASS — boolean per group |
| Aggregation election data forwarded to form8995a | ❌ FAIL — `compute()` returns `{ outputs: [] }`. No data is forwarded to `form8995a` despite it being declared in `outputNodes`. The aggregation group data (names, businesses, limitation flags) never reaches form8995a — the node is a no-op |
| `limitationGroupCount()` result used | ⚠️ WARN — Called as `void limitationGroupCount(input)` — result explicitly discarded. Either enforce a validation rule or remove the call |

**Verdict:** ❌ FAIL — Node is effectively inert: captures aggregation election data but emits nothing. `form8995a` cannot apply grouped §199A treatment without receiving this information. A mechanism to pass aggregation groups to form8995a is required (dedicated output fields or a context-level registry).

---

### 16.J lump_sum_ss (`inputs/lump_sum_ss/index.ts`)

**IRS Authority:** IRS Pub. 915; IRC §86; Form 1040 Line 6a

| Check | Result |
|-------|--------|
| Validation: lump_sum_amount cannot exceed total benefits | ✅ PASS — `validateItem()` throws a descriptive error when violated |
| Lump-sum election applied: exclude from current year | ✅ PASS — `adjustedBenefits = total - lump_sum_amount` when `is_lump_sum_election_beneficial === true` |
| No election: full amount included in current year | ✅ PASS — default path returns `total_ss_benefits_this_year` |
| Routes to F1040 Line 6a (gross SS) | ✅ PASS — `output(f1040, { line6a_ss_gross: total })` |
| Multiple SSA-1099 forms supported | ✅ PASS — `lump_sum_sss` is an array; each item validated independently |
| Prior-year benefit data used in computation | ⚠️ WARN — `prior_year_benefits` array is captured but never read in `compute()`. Engine relies entirely on the taxpayer-supplied `is_lump_sum_election_beneficial` boolean. Consistent with taxpayer-computes design pattern (see schedule_j), but limits in-engine verification |

**Verdict:** ✅ PASS — Routing and election logic are correct. Prior-year benefit data is unused, consistent with the taxpayer-computes design pattern. No calculation errors.

---

### Section 16 Priority Fixes (Newly Audited Nodes)

| Priority | Node | Issue |
|----------|------|-------|
| CRITICAL | f1099patr | Business patronage dividends/per-unit retain silently dropped — must route to Schedule C or F |
| CRITICAL | f1099patr | Box 7 qualified payments not forwarded to Form 8995-A — cooperative §199A deduction is broken |
| CRITICAL | f1099patr | Box 9 §199A(g) cooperative deduction not routed — never reaches QBI computation |
| CRITICAL | f2106 | Performing artist AGI limit ($16,000; IRC §62(b)(1)(C)) defined in config/2025.ts but never enforced — over-threshold artists incorrectly receive above-the-line deduction |
| HIGH | qbi_aggregation | Node emits no outputs — aggregation election data never reaches form8995a; grouped §199A treatment silently ignored |
| MEDIUM | f1040es | Prior-year overpayment applied to current year not captured — Line 26 understated for affected taxpayers |
| LOW | schedule_j | `prior_year_taxable_income_py1/py2/py3` captured but never read — remove or implement in-engine Schedule J verification |
| LOW | lump_sum_ss | `prior_year_benefits` captured but never read — remove or document as audit-trail-only field |
| LOW | schedule_r | `BASE_AMOUNT[FilingStatus.MFJ]` is dead code |
| LOW | educator_expenses | `educator2_expenses` silently ignored for non-MFJ — consider `.superRefine()` guard |
| LOW | f2441 | Credit rate constants duplicated from config/2025.ts — consolidate to reduce divergence risk |

**Section 16 verdict:** ❌ FAIL

---

## 17. Summary & Priority Fixes

**Audit complete.** 18 parallel agents reviewed all nodes across all 17 sections.  
**Total findings:** ~55 ❌ FAIL · ~40 ⚠️ WARN · many ✅ PASS

---

### P0 — Wrong Tax for Mainstream Filers (Fix Before Any Release)

These bugs produce an incorrect return for large populations of ordinary taxpayers.

| # | Node | Bug | Impact |
|---|------|-----|--------|
| 1 | `eitc` | ~~Phase-in rate for 3 children is **45%** — should be **40%** (IRC §32(b)(1)(B))~~ | ✅ FIXED 2026-04-08 |
| 2 | `eitc` | ~~Phase-out uses `earnedIncome` instead of `max(earnedIncome, AGI)`~~ | ✅ FIXED 2026-04-08 |
| 3 | `eitc` | ~~MFS filing status not disqualified (IRC §32(d))~~ | ✅ FIXED 2026-04-08 |
| 4 | `form2441` | ~~IRC §21 child/dependent care credit **entirely absent**~~ | ✅ FIXED 2026-04-08 |
| 5 | `form2441` | ~~MFS employer exclusion cap hardcoded at $5,000 (should be $2,500 per IRC §129(a)(2))~~ | ✅ FIXED 2026-04-08 |
| 6 | `form8962` | ~~Applicable contribution % table wrong in 4 brackets~~ | ✅ FIXED 2026-04-08 |
| 7 | `form8962` | ~~IRC §36B(f)(2)(B) repayment caps entirely absent~~ | ✅ FIXED 2026-04-08 |
| 8 | `form8995a` | Missing `standard_deduction` output route | Above-threshold QBI deduction not subtracted from taxable income — all above-threshold QBI filers overpay |
| 9 | `income_tax_calculation` + `qdcgtw` | **25% rate (unrecaptured §1250) and 28% rate (collectibles) never applied** — `qdcgtw` is a stub; `income_tax_calculation` has no 25%/28% tier | All real property sellers and collectibles holders taxed at wrong (lower) rate |
| 10 | `rrb1099r` | Tier 1 (SSEB) benefits never forwarded to `agi_aggregator` — IRC §86 worksheet never triggered | All railroad retirees have 0% SS taxability regardless of income |
| 11 | `f1099k` | Box 1a gross payments produce **zero income output** — form is a complete no-op | All gig economy / payment network income silently absent from return |
| 12 | `f1099k` | Threshold constant is $20,000 (pre-OBBBA) — TY2025 OBBBA threshold is **$5,000** | Wrong filtering even if routing were fixed |
| 13 | `schedule_a` | MFS SALT cap is $40,000 — should be **$20,000** (OBBBA §70001 halved for MFS) | MFS filers over-deduct SALT |
| 14 | `schedule_d` | `QOF_CODE = "Q"` incorrectly included in `RATE_28_CODES` — QOF events are not 28% rate gain | QOF investors' inclusion events taxed at wrong rate |

---

### P1 — Wrong Tax for Specific Filer Types

| # | Node | Bug | Impact |
|---|------|-----|--------|
| 15 | `form2555` | ~~No partial-year FEIE proration (IRC §911(b)(2)(A)) — full $130,000 given regardless of qualifying days | Expats with <365 qualified days get excess exclusion |
| 16 | `form2555` | ~~IRC §911(f) stacking rule not implemented — excluded income not taxed at bottom of brackets | Systematic understatement of expat income tax |
| 17 | `form2555` | ~~SE income not preserved for Schedule SE — excluded from income with no SE tax trigger | Self-employed expats owe SE tax that is never computed |
| 18 | `form_1116` | ~~FTC carryback (1 yr) and carryforward (10 yr) not tracked — excess FTC permanently lost | FTC benefit lost; can't be applied to future years |
| 19 | `form6251` | ~~No QDCGT worksheet for AMT (IRC §55(b)(3)) — qualified dividends and LTCG taxed at 26%/28% instead of 0%/15%/20% | AMT overstated for any taxpayer with investment income |
| 20 | `form8959` | ~~QSS threshold is $200,000 instead of $250,000~~ | ✅ FIXED 2026-04-08 |
| 21 | `form8959` | ~~Medicare tax withheld never routed to Form 1040 — `f1040Output(line24)` dead~~ | ✅ FIXED 2026-04-08 |
| 22 | `form7206` | ~~LTC premium limits hardcoded at TY2024 values (e.g. $6,020 for age 71+, should be $5,970)~~ | ✅ FIXED 2026-04-08 |
| 23 | `form8839` | ~~Refundable adoption credit path emits to `line30_refundable_adoption` which hasn't existed since TY2013~~ | ✅ FIXED 2026-04-08 |
| 24 | `ssa1099` / `agi_aggregator` | ~~Tax-exempt interest absent from provisional income (IRC §86(b)(1))~~ | ✅ FIXED 2026-04-08 |
| 25 | `ssa1099` / `agi_aggregator` | ~~MFS-lived-with-spouse rule missing (IRC §86(c)(2)) — should be 85% always taxable, $0 threshold~~ | ✅ FIXED 2026-04-08 |
| 26 | `form4797` | ~~§1231 net loss routed to Schedule D instead of ordinary income (IRC §1231(a)(2)) | Wrong rate + subject to $3,000 cap instead of fully deductible |
| 27 | `form4797` | ~~Unrecaptured §1250 gain not tracked to 25% rate worksheet | All real property depreciation recapture taxed at 0%/15%/20% instead of 25% |
| 28 | `form4562` | ~~No 27.5-year (residential) or 39-year (commercial) MACRS — rental/commercial depreciation returns $0 | All rental property owners get zero depreciation |
| 29 | `k1_trust` | ~~DNI limitation (IRC §662) entirely absent — most fundamental rule for complex trust distributions | Trust distributions can be over- or under-taxed |
| 30 | `f1040 output` | ~~AGI floored at `Math.max(0, ...)` — AGI can be negative in large NOL scenarios~~ | ✅ FIXED 2026-04-08 |
| 31 | `schedule_a` | OBBBA SALT phase-out (IRC as amended) not implemented — high earners should phase down from $40K | High-MAGI filers get full $40K SALT when they shouldn't |

---

### P2 — Silent Data Loss / Broken Carryforwards

These produce correct current-year returns but break multi-year continuity.

| # | Node | Bug |
|---|------|-----|
| 32 | `form8582` | Suspended PAL carryforward never emitted — IRC §469(b) broken; losses permanently lost |
| 33 | `form6198` | At-risk carryforward not emitted; §465(e) recapture not implemented |
| 34 | `form8606` | Line 14 IRA basis carryforward never emitted — multi-year basis tracking manual only |
| 35 | `form_1116` | AMT FTC (IRC §59(a)) entirely absent — separate AMT FTC computation missing |
| 36 | `form8990` | Disallowed BIE carryforward (Form 8990 line 31) never emitted — §163(j) multi-year tracking manual |
| 37 | `form4952` | Investment interest carryforward (IRC §163(d)(2)) never emitted |
| 38 | `form7203` | Suspended S-corp loss carryforward not emitted; excess distributions produce no capital gain output |
| 39 | `form8824` | Replacement property basis never computed or emitted — all future depreciation incorrect |
| 40 | `form8582cr` | Suspended passive credit carryforward not emitted |
| 41 | `f1040 output` | Lines 10, 14, 20, 23, 26, 30, 31, 32, 34 computed but never emitted in `assembleReturn()` |

---

### P3 — Income Silently Dropped / Misrouted

| # | Node | Bug |
|---|------|-----|
| 42 | `f1099oid` | Box 8 (US Treasury OID) has schema field but zero outputs — taxable interest excluded from return |
| 43 | `f1099b` | Accrued market discount (IRC §1278) has no schema field — mischaracterized as capital gain |
| 44 | `agi_aggregator` | Line 1b allocated tips (W-2 Box 7) absent — tipped workers' tips missing from AGI |
| 45 | `f1099patr` | Business patronage dividends (`trade_or_business=true`) produce zero output; Box 7 & 9 §199A not forwarded to Form 8995A |
| 46 | `qbi_aggregation` input | `compute()` returns `{ outputs: [] }` — all aggregation-group §199A data silently ignored |
| 47 | `w2` | Box 12 Code FF (QSEHRA) in enum but no output — never reduces Form 8962 PTC per IRC §36B(c)(4) |
| 48 | `w2` | Box 7 SS tips have no Form 4137 path for unreported cash tips |
| 49 | `household_wages` | `medicare_wages`, `medicare_tax_withheld` declared in schema but never read or emitted — Form 8959 never receives household Medicare wages |
| 50 | `w2g` | Non-cash gambling prizes excluded from `totalWinnings()` — only Box 1 cash captured |
| 51 | `k1_s_corp` | Box 9 §1231 gain field exists but no routing functions reference it — silently dropped |
| 52 | `k1_partnership` | Box 9b unrecaptured §1250 gain absent; Box 17 AMT items absent; Box 13 deductions absent |
| 53 | `schedule_d` | `collectibles_gain_form2439` never routed to rate_28_gain_worksheet |
| 54 | `f2106` | `F2106_PERFORMING_ARTIST_AGI_LIMIT` imported in config but never used in node — all performing artists qualify unconditionally |
| 55 | `sep_retirement` | SIMPLE catch-up limit hardcoded at $19,500 (should be $20,000); SECURE 2.0 age 60–63 super catch-up ($21,750) not implemented |

---

### P4 — Schema / Design Issues

| # | Node | Issue |
|---|------|-------|
| 56 | `schedule_a` | Income tax + sales tax election unenforced — both can be entered simultaneously |
| 57 | `schedule_a` | Charitable deduction applies single 60% cap to combined cash+noncash (should be separate 30%/50% per IRC §170) |
| 58 | `form8880` | QSS uses Single AGI thresholds instead of MFJ thresholds — incorrect Saver's Credit rate for QSS filers |
| 59 | `form8582` | `rentalNetLoss` uses all passive losses not just rental losses — overstates §469(i) $25K allowance in mixed-activity scenarios |
| 60 | `form6251` | Duplicate Line 2g PAB interest fields — if both populated, PAB interest double-counted in AMTI |
| 61 | `hsa (form8889)` | No partial-year proration (month-by-month) and no Archer MSA distribution offset (Form 8889 Line 4) |
| 62 | `ira deduction` | Non-deductible IRA excess never routed to Form 8606 for basis tracking |
| 63 | `f1099div` | Box 2c §1202 QSBS gain incorrectly routed to 28% worksheet — QSBS uses Form 8949 exclusion |
| 64 | `f1099int` | Bond premium always subtracted even without IRC §171 amortization election |
| 65 | `schedule_1` | Lines 8d naming collision (FEIE and housing deduction share prefix), Line 13 naming collision (HSA/depreciation), `line18_early_withdrawal` missing `nonnegative()` |

---

### Nodes That Passed Cleanly

The following nodes had no material defects — all calculations verified correct:

`income_tax_calculation` · `standard_deduction` (stale comment only) · `config/2025.ts` (97 constants verified) · `schedule_se` (core) · `form4137` · `form8919` · `form4972` · `form5695` · `form8853` (core) · `form982` (core) · `lump_sum_ss` · `schedule_r` · `nol_carryforward` · `educator_expenses` · `schedule_j` · `form1099r` (core) · `form8815` (core) · `f8812` (core)

---

### Recommended Fix Order

```
Week 1 — P0 (Blocks any production release):
  1. ~~Fix EITC: rate[3]=0.40, phase-out base, MFS guard~~ ✅ FIXED 2026-04-08
  2. ~~Implement Form 2441 §21 credit; fix MFS exclusion cap~~ ✅ FIXED 2026-04-08
  3. ~~Fix Form 8962 contribution % table; add repayment caps~~ ✅ FIXED 2026-04-08
  4. ~~Fix Form 8995A → standard_deduction route~~ ✅ FIXED 2026-04-08
  5. ~~Implement 25% and 28% rate tiers in income_tax_calculation~~ ✅ FIXED 2026-04-08
  6. ~~Fix RRB-1099R → agi_aggregator routing~~ ✅ FIXED 2026-04-08
  7. ~~Fix Form 1099-K: implement income output, update threshold to $5,000~~ ✅ FIXED 2026-04-08
  8. ~~Fix Schedule A MFS SALT cap ($20,000)~~ ✅ FIXED 2026-04-08
  9. ~~Fix Schedule D QOF code removal from RATE_28_CODES~~ ✅ FIXED 2026-04-08

Week 2 — P1 (Wrong tax for specific populations):
  10. ~~Form 2555: proration, stacking rule, SE preservation~~ ✅ FIXED 2026-04-08
  11. ~~Form 1116: carryback/forward, AMT FTC~~ ✅ FIXED 2026-04-08
  12. ~~Form 6251: QDCGT worksheet for AMT~~ ✅ FIXED 2026-04-08
  13. ~~Form 8959: fix QSS threshold; wire Medicare withholding output~~ ✅ FIXED 2026-04-08
  14. ~~Form 7206: update LTC limits to TY2025 values~~ ✅ FIXED 2026-04-08
  15. ~~Form 8839: remove refundable path~~ ✅ FIXED 2026-04-08
  16. ~~AGI aggregator: add tax-exempt interest; MFS-lived-with-spouse rule~~ ✅ FIXED 2026-04-08
  17. ~~Form 4797: §1231 loss → ordinary; track §1250 gain~~ ✅ FIXED 2026-04-08
  18. ~~Form 4562: add 27.5/39-year MACRS~~ ✅ FIXED 2026-04-08
  19. ~~K-1 Trust: implement DNI limitation~~ ✅ FIXED 2026-04-08
  20. ~~f1040: remove AGI floor of 0~~ ✅ FIXED 2026-04-08; ~~emit missing lines~~ ✅ FIXED 2026-04-08
  20b. ~~Schedule A: OBBBA SALT phase-out (30% over $500K/$250K MFS)~~ ✅ FIXED 2026-04-08

Week 3 — P2/P3 (Carryforwards + silent drops):
  21. Emit PAL (8582), at-risk (6198), FTC, BIE, investment interest carryforwards
  22. Emit Form 8606 IRA basis carryforward; wire non-deductible IRA → 8606
  23. Fix 1099-OID Box 8 routing
  24. Fix 1099-B market discount schema
  25. Wire W-2 Box 12 Code FF → Form 8962
  26. Wire household Medicare wages → Form 8959
  27. Fix QBI aggregation input node (no-op)
  28. Fix K-1 §1231 gain routing; add AMT item routing
  29. Fix Form 8824 replacement basis computation
  30. Fix SIMPLE/SEP SECURE 2.0 catch-up limits
```

---

**Report complete.** Total file: `AUDIT_2025.md`  
Generated: 2026-04-08 via 18 parallel audit agents.
