# f3115 — Application for Change in Accounting Method

## Overview
Form 3115 is filed to request IRS consent to change a taxpayer's accounting method (e.g., cash to accrual, change in depreciation method, LIFO election). The key tax impact is the §481(a) adjustment — the cumulative difference in income or deductions between the old and new methods through the beginning of the year of change. A positive §481(a) adjustment is additional income; a negative adjustment is a deduction. Automatic changes (Rev. Proc. 2015-13 as updated) typically spread negative adjustments over 1 year and positive over 4 years.

**IRS Form:** Form 3115
**Drake Screen:** 3115 (screen_code 3115)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/17454

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| designated_change_number | string | Yes | DCN | IRS-designated change number from Appendix of Rev. Proc. 2015-13 | Form 3115, Part I, Line 1a | https://www.irs.gov/pub/irs-pdf/f3115.pdf |
| filing_type | enum | Yes | Automatic or Advance Consent | Whether filed under automatic change procedures or requires advance IRS consent | Form 3115, Part I | https://www.irs.gov/pub/irs-pdf/f3115.pdf |
| section_481_adjustment | number | No | §481(a) Adjustment | Net §481(a) adjustment — positive = additional income, negative = deduction | Form 3115, Part IV, Line 25 | https://www.irs.gov/pub/irs-pdf/f3115.pdf |
| spread_period | number (int) | No | Spread period (years) | Number of years to spread §481(a) adjustment (typically 1 or 4) | Rev. Proc. 2015-13, §7.03 | https://www.irs.gov/pub/irs-pdf/f3115.pdf |
| accounting_method_before | string | No | Method before change | Description of the accounting method before the change | Form 3115, Part II, Line 6a | https://www.irs.gov/pub/irs-pdf/f3115.pdf |
| accounting_method_proposed | string | No | Proposed method | Description of the proposed accounting method | Form 3115, Part II, Line 6b | https://www.irs.gov/pub/irs-pdf/f3115.pdf |

---

## Calculation Logic

### Step 1 — Compute annual §481(a) spread amount
If section_481_adjustment is provided and spread_period > 1, divide the total adjustment by the spread period to get the current-year portion. If spread_period is 1 (or absent), the full adjustment applies in the current year.

Source: Rev. Proc. 2015-13, §7.03; Form 3115 Instructions, Part IV

### Step 2 — Route §481(a) adjustment to Schedule 1
A positive §481(a) adjustment is additional income → Schedule 1 (line 8z_other_income).
A negative §481(a) adjustment is a deduction → Schedule 1 (line 8z_other, as negative).
If section_481_adjustment is zero or absent, no output is emitted.

Source: IRS Form 3115 Instructions, p.7 — https://www.irs.gov/pub/irs-pdf/i3115.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line8z_other_income | schedule1 | section_481_adjustment > 0 (income inclusion) | Form 3115 Instructions, Part IV | https://www.irs.gov/pub/irs-pdf/f3115.pdf |
| line8z_other | schedule1 | section_481_adjustment < 0 (deduction, as negative value) | Form 3115 Instructions, Part IV | https://www.irs.gov/pub/irs-pdf/f3115.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Default spread period (negative adjustment) | 1 year | Rev. Proc. 2015-13, §7.03(1) | https://www.irs.gov/pub/irs-instructions/irp2015-13.pdf |
| Default spread period (positive adjustment) | 4 years | Rev. Proc. 2015-13, §7.03(2) | https://www.irs.gov/pub/irs-instructions/irp2015-13.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    designated_change_number
    filing_type
    section_481_adjustment
    spread_period
    accounting_method_before
    accounting_method_proposed
  end
  subgraph node["f3115 — Accounting Method Change"]
    compute_spread["Compute annual §481(a) amount"]
  end
  subgraph outputs["Downstream"]
    schedule1["schedule1 (line8z_other_income or line8z_other)"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **Zero §481(a) adjustment**: If section_481_adjustment is 0 or absent, no output is emitted.
2. **Spread period of 1**: Full adjustment in current year (common for negative adjustments).
3. **Spread period of 4**: One-quarter of positive adjustment per year.
4. **Negative adjustments**: Entered as a negative number; routed as a negative line8z_other to Schedule 1 (reduces income).
5. **Positive adjustments**: Route as additional income (line8z_other_income on Schedule 1).
6. **Spread period must be positive integer**: Validate >= 1 if provided.
7. **designated_change_number is required** — it identifies the specific method change.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 3115 | 2025 | All | https://www.irs.gov/pub/irs-pdf/f3115.pdf | .research/docs/f3115.pdf |
| IRS Form 3115 Instructions | 2025 | Part IV | https://www.irs.gov/pub/irs-pdf/i3115.pdf | .research/docs/i3115.pdf |
| Rev. Proc. 2015-13 | 2015 | §7.03 | https://www.irs.gov/pub/irs-instructions/irp2015-13.pdf | N/A |
