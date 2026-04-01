# f8854 — Form 8854: Initial and Annual Expatriation Statement

## Overview
Form 8854 is filed by US citizens and long-term residents who expatriate (give up citizenship or long-term permanent residency). "Covered expatriates" are subject to a mark-to-market exit tax: all property is treated as if sold at FMV on the day before the expatriation date. The net taxable gain (above an annual exclusion) flows to Schedule 2 as additional tax and to Form 1040 as income.

**IRS Form:** 8854
**Drake Screen:** 8854
**Node Type:** input (singleton — one per return)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/8854

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| expatriation_date | string (ISO date) | yes | Expatriation date | Date citizenship was relinquished or long-term residency terminated | Form 8854 Part I line 1; IRC §877A(g)(4) | https://www.irs.gov/pub/irs-pdf/f8854.pdf |
| expatriate_type | ExpatriateType enum | yes | Type | CITIZEN or LONG_TERM_RESIDENT | Form 8854 Part I; IRC §877A(g)(2)-(3) | https://www.irs.gov/pub/irs-pdf/f8854.pdf |
| average_annual_tax_prior_5_years | number (nonneg) | yes | Avg annual net tax (5 yr) | Average annual net income tax liability for the 5 preceding tax years | Form 8854 Part II line 1; IRC §877A(g)(1)(A)(i) | https://www.irs.gov/pub/irs-pdf/i8854.pdf |
| net_worth_at_expatriation | number (nonneg) | yes | Net worth | Net worth on the date of expatriation | Form 8854 Part II line 2; IRC §877A(g)(1)(A)(ii) | https://www.irs.gov/pub/irs-pdf/i8854.pdf |
| certified_tax_compliance | boolean | yes | Certified tax compliance | Whether taxpayer certified compliance with all US tax obligations for the 5 preceding years | Form 8854 Part II line 4; IRC §877A(g)(1)(B) | https://www.irs.gov/pub/irs-pdf/i8854.pdf |
| assets | array of asset items | no | Assets | Array of assets with fmv_at_expatriation and basis for mark-to-market computation | Form 8854 Part IV; IRC §877A(a) | https://www.irs.gov/pub/irs-pdf/f8854.pdf |

### Asset item sub-fields:
| Field | Type | Required | Description | IRS Reference |
| ----- | ---- | -------- | ----------- | ------------- |
| fmv_at_expatriation | number (nonneg) | yes | Fair market value on day before expatriation date | IRC §877A(a)(1) |
| basis | number (nonneg) | yes | Adjusted basis in the asset | IRC §877A(a)(1) |

---

## Calculation Logic

### Step 1 — Determine covered expatriate status
A taxpayer is a "covered expatriate" if ANY of the following:
1. Average annual net income tax for 5 preceding years > $201,000 (TY2025 indexed amount; Rev. Proc. 2024-40, §3.23)
2. Net worth ≥ $2,000,000 on expatriation date (IRC §877A(g)(1)(A)(ii); not inflation-adjusted)
3. Failed to certify compliance with US tax obligations for 5 preceding years (IRC §877A(g)(1)(B))
Source: IRC §877A(g)(1); Rev. Proc. 2024-40, §3.23; Form 8854 instructions

### Step 2 — Compute mark-to-market gain/loss (covered expatriates only)
For each asset: gain/loss = fmv_at_expatriation − basis
Total net gain = sum of all per-asset gains/losses.
Source: IRC §877A(a)(1); Form 8854 Part IV instructions

### Step 3 — Apply exclusion amount
Taxable gain = max(0, total_net_gain − exclusion_amount)
TY2025 exclusion: $866,000 (Rev. Proc. 2024-40, §3.23; inflation-adjusted)
Source: IRC §877A(a)(3); Rev. Proc. 2024-40, §3.23

### Step 4 — Route taxable gain
If taxable_gain > 0:
  - Route to schedule2 as line17_exit_tax (additional tax on mark-to-market gain)
  - Route to f1040 as line8z_other_income or similar (exit tax income is ordinary income)
Source: IRC §877A(a); Form 8854 instructions; Schedule 2 additional taxes

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| taxable_gain (as exit tax income) | schedule2 | covered expatriate with taxable_gain > 0 | IRC §877A(a); Schedule 2 line 17 | https://www.irs.gov/pub/irs-pdf/i8854.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Average annual tax threshold (covered expatriate) | $201,000 | Rev. Proc. 2024-40, §3.23 | https://www.irs.gov/pub/irs-pdf/rp-24-40.pdf |
| Net worth threshold (covered expatriate) | $2,000,000 | IRC §877A(g)(1)(A)(ii) | https://www.irs.gov/pub/irs-pdf/i8854.pdf |
| Mark-to-market gain exclusion (TY2025) | $866,000 | Rev. Proc. 2024-40, §3.23 | https://www.irs.gov/pub/irs-pdf/rp-24-40.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    expatriation_date
    expatriate_type
    average_annual_tax_prior_5_years
    net_worth_at_expatriation
    certified_tax_compliance
    assets["assets[]\n(fmv, basis)"]
  end
  subgraph node["f8854 — Form 8854"]
    covered["Is covered expatriate?"]
    mtm["Mark-to-market gain"]
    excl["Apply $866k exclusion"]
  end
  subgraph outputs["Downstream"]
    schedule2["schedule2\n(exit tax)"]
  end
  inputs --> node
  node --> schedule2
```

---

## Edge Cases & Special Rules

1. Non-covered expatriates: No exit tax. compute() returns empty outputs.
2. Assets with negative gain (losses) offset positive gains in total net gain calculation.
3. Total net gain may be negative — taxable gain floors at $0 after exclusion.
4. If certified_tax_compliance is false, taxpayer is a covered expatriate regardless of income/net worth.
5. Long-term residents: must have been a lawful permanent resident for 8 of the 15 years ending with the year of expatriation (IRC §877A(g)(2)).
6. Deferred compensation and specified tax-deferred accounts have separate rules (not modeled here — basic mark-to-market only).
7. Pre-HEART Act (before June 17, 2008) expatriates use different rules — not modeled in this node.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8854 | 2024 | All parts | https://www.irs.gov/pub/irs-pdf/f8854.pdf | f8854.pdf |
| Instructions for Form 8854 | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8854.pdf | i8854.pdf |
| IRC §877A | current | Mark-to-market exit tax | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section877A | — |
| Rev. Proc. 2024-40 | 2024 | §3.23 (2025 amounts) | https://www.irs.gov/pub/irs-pdf/rp-24-40.pdf | rp-24-40.pdf |
