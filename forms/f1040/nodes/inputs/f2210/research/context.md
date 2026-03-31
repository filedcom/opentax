# Form 2210 — Underpayment of Estimated Tax by Individuals, Estates, and Trusts

## Overview

This node captures the inputs needed to determine whether a taxpayer owes a penalty for underpaying estimated taxes during the year, and routes the resulting penalty amount to Form 1040. It models the safe-harbor tests of IRC §6654 (90% of current-year tax; 100%/110% of prior-year tax), accepts a pre-computed penalty amount, and records waiver and annualized-income-method elections. The per-quarter penalty computation (Form 2210 Part III / Schedule AI) is **not** fully implemented inside the node — the `underpayment_penalty` field accepts an externally computed value when the full calculation has been done upstream.

**IRS Form:** 2210
**Drake Screen:** 2210
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13226 (unverified — web fetch not available)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `required_annual_payment` | number (nonneg) | No | Form 2210 Part I, Line 4 | Required annual payment; normally computed from safe-harbor rules but can be overridden | IRC §6654(d)(1); Form 2210 Line 4 | https://www.irs.gov/pub/irs-pdf/f2210.pdf |
| `withholding` | number (nonneg) | No | Form 1040 Line 25d (total withholding) | Total federal income tax withheld for the year across all sources (W-2, 1099, etc.) | Form 2210 Part II Line 1 / Part III Col (a) | https://www.irs.gov/pub/irs-pdf/f2210.pdf |
| `q1_estimated_payment` | number (nonneg) | No | Form 2210 Part III Column (b) — April 15 installment | Estimated tax payment made for Q1 (due April 15, 2025) | IRC §6654(c)(1); Form 2210 instructions | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| `q2_estimated_payment` | number (nonneg) | No | Form 2210 Part III Column (c) — June 15 installment | Estimated tax payment made for Q2 (due June 15, 2025) | IRC §6654(c)(1); Form 2210 instructions | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| `q3_estimated_payment` | number (nonneg) | No | Form 2210 Part III Column (d) — September 15 installment | Estimated tax payment made for Q3 (due September 15, 2025) | IRC §6654(c)(1); Form 2210 instructions | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| `q4_estimated_payment` | number (nonneg) | No | Form 2210 Part III Column (e) — January 15 installment | Estimated tax payment made for Q4 (due January 15, 2026) | IRC §6654(c)(1); Form 2210 instructions | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| `current_year_tax` | number (nonneg) | No | Form 1040 total tax (line 24) after certain credits | Total tax for 2025 used in the 90% safe-harbor test | IRC §6654(d)(1)(B)(i); Form 2210 Line 1 | https://www.irs.gov/pub/irs-pdf/f2210.pdf |
| `prior_year_tax` | number (nonneg) | No | Prior-year Form 1040 total tax | Prior year (2024) total tax used in 100%/110% safe-harbor test | IRC §6654(d)(1)(B)(ii); Form 2210 Line 3 | https://www.irs.gov/pub/irs-pdf/f2210.pdf |
| `prior_year_agi` | number (nonneg) | No | Prior-year Form 1040 AGI | Prior year (2024) AGI; triggers 110% rule when > $150,000 ($75,000 MFS) | IRC §6654(d)(1)(B)(ii); Form 2210 instructions | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| `underpayment_penalty` | number (nonneg) | No | Form 2210 computed penalty / preparer-entered | Pre-computed penalty amount. If provided and > 0, routes directly to Form 1040 Line 38 | IRC §6654(a); Form 2210 Line 19 | https://www.irs.gov/pub/irs-pdf/f2210.pdf |
| `waiver_requested` | boolean | No | Form 2210 Part I checkboxes B/C/D/E | True if taxpayer is requesting waiver of the penalty (retired, disabled, casualty, unusual circumstances) | IRC §6654(e)(3); Form 2210 Part I | https://www.irs.gov/pub/irs-pdf/f2210.pdf |
| `annualized_method` | boolean | No | Form 2210 Part I checkbox — Schedule AI | True if taxpayer elects the annualized income installment method (Form 2210 Schedule AI) | IRC §6654(d)(2); Form 2210 Part IV / Schedule AI | https://www.irs.gov/pub/irs-pdf/f2210.pdf |

---

## Calculation Logic

### Step 1 — Total Estimated Payments
Sum all four quarterly estimated tax payments:
```
totalEstimatedPayments = q1 + q2 + q3 + q4
```

### Step 2 — Total Payments
```
totalPayments = withholding + totalEstimatedPayments
```

### Step 3 — Safe Harbor Amount (Required Annual Payment)
Determine the smaller of the two safe-harbor thresholds.

**Threshold A — 90% of Current Year Tax (IRC §6654(d)(1)(B)(i)):**
```
thresholdA = current_year_tax × 0.90
```

**Threshold B — 100% or 110% of Prior Year Tax (IRC §6654(d)(1)(B)(ii)):**
```
if prior_year_agi > $150,000:
    thresholdB = prior_year_tax × 1.10   (110% rule)
else:
    thresholdB = prior_year_tax × 1.00   (100% rule)
```
MFS filers use $75,000 instead of $150,000 — not yet modeled (no `filing_status` field in schema).

**Required Annual Payment:**
```
safe_harbor_amount = min(thresholdA, thresholdB)
```

### Step 4 — Safe Harbor Test
```
if totalPayments >= safe_harbor_amount → safe harbor met → no penalty
if waiver_requested == true → waiver → no penalty
```

### Step 5 — Penalty Determination
```
if waiver_requested → penalty = 0
else if underpayment_penalty provided → penalty = underpayment_penalty
else if safe harbor met → penalty = 0
else → penalty = 0  (full per-quarter calc not implemented; use underpayment_penalty field)
```

### Step 6 — Output Routing
```
if penalty > 0 → output to f1040 { line38_underpayment_penalty: penalty }
else → no outputs
```

---

### Full Per-Quarter Penalty (Not Yet Implemented — Form 2210 Part III)

Form 2210 Part III computes the penalty period-by-period using the IRS underpayment rate (8% for TY2025 = federal short-term rate + 3pp). For each installment period:

```
required_installment_per_period = required_annual_payment × 25%
underpayment_per_period = required_installment - (allocated_withholding + est_payment)
penalty_per_period = max(0, underpayment_per_period) × 8% × (days_underpaid / 365)
total_penalty = sum of penalty_per_period across all four installment periods
```

The Short Method (Part II) is a simplified version valid when (a) withholding equals or exceeds the required annual payment, or (b) equal payments were made on the four due dates. It uses a factor of approximately 0.02267 × annual underpayment.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line38_underpayment_penalty` | `f1040` | `penalty > 0` (penalty not waived, safe harbor not met) | IRC §6654(a); Form 2210 Line 19 → Form 1040 Line 38 | https://www.irs.gov/pub/irs-pdf/f1040.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Safe harbor — 90% current year | 90% of current year tax | IRC §6654(d)(1)(B)(i) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Safe harbor — 100% prior year (AGI ≤ $150k) | 100% of prior year tax | IRC §6654(d)(1)(B)(ii) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Safe harbor — 110% prior year (AGI > $150k) | 110% of prior year tax | IRC §6654(d)(1)(B)(ii) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| High-income AGI threshold (single/MFJ/HOH/QSS) | $150,000 | IRC §6654(d)(1)(B)(ii) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| High-income AGI threshold (MFS) | $75,000 | IRC §6654(d)(1)(B)(ii) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| De minimis penalty exception | Tax after withholding < $1,000 | IRC §6654(e)(1) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Penalty rate (TY2025, all quarters) | 8% per annum (federal short-term rate + 3pp) | IRC §6621; Rev Proc 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Daily penalty rate | 8% ÷ 365 ≈ 0.021918% per day | IRC §6654(a) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Farmer/fisherman exception | 2/3 of current year tax (≈66.67%) | IRC §6654(i) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Q1 installment due date | April 15, 2025 | IRC §6654(c)(1) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Q2 installment due date | June 15, 2025 | IRC §6654(c)(1) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Q3 installment due date | September 15, 2025 | IRC §6654(c)(1) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |
| Q4 installment due date | January 15, 2026 | IRC §6654(c)(1) | https://www.irs.gov/pub/irs-pdf/i2210.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Drake screen 2210)"]
    W[withholding]
    Q1[q1_estimated_payment]
    Q2[q2_estimated_payment]
    Q3[q3_estimated_payment]
    Q4[q4_estimated_payment]
    CYT[current_year_tax]
    PYT[prior_year_tax]
    PYA[prior_year_agi]
    PEN[underpayment_penalty]
    WVR[waiver_requested]
    ANN[annualized_method]
    RAP[required_annual_payment]
  end

  subgraph node["f2210 node"]
    S1["totalPayments =\nwithholding + Σ quarterly"]
    S2["safeHarborAmount =\nmin(90% CYT, 100/110% PYT)"]
    S3{"waiver OR\nsafe harbor met?"}
    S4["penalty = underpayment_penalty\nor 0 if safe harbor"]
  end

  subgraph outputs["Downstream Nodes"]
    F1040["f1040\nline38_underpayment_penalty"]
    NONE["(no output)"]
  end

  W --> S1
  Q1 --> S1
  Q2 --> S1
  Q3 --> S1
  Q4 --> S1
  CYT --> S2
  PYT --> S2
  PYA --> S2
  WVR --> S3
  S1 --> S3
  S2 --> S3
  PEN --> S4
  S3 -- "yes → no penalty" --> NONE
  S3 -- "no → compute penalty" --> S4
  S4 -- "penalty > 0" --> F1040
  S4 -- "penalty = 0" --> NONE
```

---

## Edge Cases & Special Rules

### 1. De Minimis Exception (IRC §6654(e)(1))
No penalty if the tax shown on the return after subtracting withholding is less than **$1,000**. This should be checked before other calculations. Not explicitly modeled — the calling code should set `waiver_requested = true` or provide `underpayment_penalty = 0` in this scenario.

### 2. Prior-Year Zero Tax (IRC §6654(e)(2))
No penalty if the prior year's return showed zero tax liability and the prior year was a full 12-month period. When `prior_year_tax = 0`, `safeHarborAmount = min(0.9 × CYT, 0) = 0`, so the safe harbor is always met naturally.

### 3. 110% Rule — MFS Filers
For Married Filing Separately, the high-income AGI threshold is **$75,000** (not $150,000). The current schema does not include `filing_status`, so the MFS $75,000 threshold cannot be applied. This is a known gap — add `filing_status` to the schema to properly support MFS.

### 4. Farmer and Fisherman Exception (IRC §6654(i))
Farmers/fishermen qualify for a 2/3 safe harbor (not 90%) and may file and pay all estimated tax by March 1 of the following year. The `annualized_method` flag does not model this specifically — a separate `is_farmer_fisherman` boolean field would be needed.

### 5. Annualized Income Installment Method — Schedule AI (IRC §6654(d)(2))
When income varies significantly across quarters (common for self-employed or seasonal income), the taxpayer can elect Schedule AI to compute a lower required installment for quarters with lower income. The `annualized_method` flag is captured but the Schedule AI calculation is **not** implemented. When this flag is `true`, the `underpayment_penalty` field must carry the pre-computed result.

### 6. Waiver — Retired or Disabled (IRC §6654(e)(3)(A))
Available in the first year a taxpayer reaches age 62 or becomes disabled, if the underpayment was due to reasonable cause. Modeled via `waiver_requested = true`.

### 7. Waiver — Casualty or Unusual Circumstances (IRC §6654(e)(3)(B))
Waiver available when underpayment resulted from casualty, disaster, or unusual circumstances. Modeled via `waiver_requested = true`.

### 8. required_annual_payment Override Gap
The `required_annual_payment` field exists in the schema but the current `safeHarborAmount()` function does not use it — it always recomputes from `current_year_tax` and `prior_year_tax`. A future implementation should check whether `required_annual_payment` is provided and use it directly instead of recomputing.

### 9. Short Method Eligibility
The Short Method (Part II) may only be used when (a) all withholding is treated as paid ratably, or (b) equal estimated payments were made on the four due dates. The node does not distinguish short vs. long method — it relies on a pre-computed `underpayment_penalty` for the actual penalty amount.

### 10. Interest Rate Changes Mid-Year
The IRS underpayment rate can change quarterly (set each quarter by the Secretary of Treasury). For TY2025, the rate has been 8% throughout (Rev Proc 2024-40). If the rate changes mid-year, the Part III per-quarter calculation must use the rate in effect for each period. This is not yet modeled.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 2210 | 2025 | All parts (Lines 1–19, Schedule AI) | https://www.irs.gov/pub/irs-pdf/f2210.pdf | docs/f2210.pdf |
| IRS Form 2210 Instructions | 2025 | All (Parts I–IV, waivers, short method) | https://www.irs.gov/pub/irs-pdf/i2210.pdf | docs/i2210.pdf |
| IRC §6654 — Failure to Pay Estimated Income Tax | Current | §6654(a)–(i) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6654 | N/A |
| IRS Publication 505 — Tax Withholding and Estimated Tax | 2025 | Chapter 4 (Underpayment Penalty) | https://www.irs.gov/pub/irs-pdf/p505.pdf | docs/p505.pdf |
| Rev Proc 2024-40 (TY2025 inflation adjustments / rates) | 2024 | Interest/penalty rate for TY2025 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | docs/rp-24-40.pdf |
| Drake Software KB — Form 2210 | N/A | Data entry fields and screen layout | https://kb.drakesoftware.com/Site/Browse/13226 | N/A (web fetch denied) |
| Existing node implementation | 2025 | Full implementation | forms/f1040/nodes/inputs/f2210/index.ts | N/A (local) |
| Existing test suite | 2025 | All test cases | forms/f1040/nodes/inputs/f2210/index.test.ts | N/A (local) |
