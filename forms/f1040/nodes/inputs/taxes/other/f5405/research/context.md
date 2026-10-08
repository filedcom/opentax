# f5405 — Form 5405: Repayment of the First-Time Homebuyer Credit

## Overview
Form 5405 handles repayment of the 2008 first-time homebuyer credit (IRC §36(f)).
The credit was a $7,500 interest-free loan (max) to first-time homebuyers in 2008,
repayable at $500/year over 15 years (2010–2024 filing years, i.e. TY2010–TY2024).
For TY2025, the final year of the standard installment is due.
If the home is sold, disposed of, or ceases to be the main home before the 15-year
period ends, the entire remaining balance is due in the year of disposal.

**IRS Form:** Form 5405
**Drake Screen:** HOME
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/15050

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| credit_year | number (literal 2008) | Yes | Credit year | Year credit was originally claimed; must be 2008 for repayment | IRC §36(f); Form 5405 instructions p.1 | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| original_credit_amount | number (nonneg) | Yes | Original credit amount | Total credit received (max $7,500 for 2008) | Form 5405 instructions p.1; IRC §36(b)(1) | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| repayments_already_made | number (nonneg) | Yes | Prior repayments | Total repayments made in prior tax years | Form 5405 instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| sold_or_disposed | boolean | Yes | Home sold or disposed | True if the home was sold, disposed of, or ceased to be main home in 2025 | Form 5405 instructions p.2; IRC §36(f)(2) | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| disposal_year | number? | No | Year of disposal | Year of sale/disposal (if applicable) | Form 5405 instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| home_destroyed | boolean | No | Home destroyed/condemned | True if home was destroyed, condemned, or involuntarily converted | Form 5405 instructions p.3; IRC §36(f)(3) | https://www.irs.gov/pub/irs-pdf/i5405.pdf |

---

## Calculation Logic

### Step 1 — Determine remaining balance
remaining_balance = original_credit_amount - repayments_already_made
Source: Form 5405 instructions p.2; IRC §36(f)

### Step 2 — Determine repayment amount
- If `sold_or_disposed` is true OR `home_destroyed` is true:
    repayment_amount = max(0, remaining_balance)   [full remaining balance due]
- Else (standard annual installment):
    repayment_amount = min(500, max(0, remaining_balance))
    [2008 credit: $500/year installment, IRC §36(f)(1)]

### Step 3 — Route to schedule2 line 10
- repayment_amount → schedule2.line10_homebuyer_credit_repayment
- Source: Form 5405 instructions; Schedule 2 line 10

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line10_homebuyer_credit_repayment | schedule2 | repayment_amount > 0 | IRC §36(f); Schedule 2 line 10 | https://www.irs.gov/pub/irs-pdf/i1040s2.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Annual installment (2008 credit) | $500/year | IRC §36(f)(1)(B); Form 5405 instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| Maximum 2008 credit | $7,500 | IRC §36(b)(1)(A) | https://www.irs.gov/pub/irs-pdf/i5405.pdf |
| Repayment period | 15 years (TY2010–TY2024) | IRC §36(f)(1)(A) | https://www.irs.gov/pub/irs-pdf/i5405.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (HOME screen)"]
    credit_year
    original_credit_amount
    repayments_already_made
    sold_or_disposed
    home_destroyed
  end
  subgraph node["f5405 Node"]
    remaining_balance["remaining_balance = original - repaid"]
    repayment["repayment = $500 (normal) OR full balance (disposal/destruction)"]
  end
  subgraph outputs["Downstream Nodes"]
    schedule2["schedule2 line10_homebuyer_credit_repayment"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **Disposal accelerates full repayment**: If `sold_or_disposed` = true, the entire remaining balance is due in the year of sale (IRC §36(f)(2)(A)).
2. **Destruction/condemnation**: If home is destroyed or condemned, full remaining balance is due (IRC §36(f)(3)); however, if a new main home is acquired within 2 years, repayment may be waived. For simplicity, this node treats destruction = full repayment due.
3. **Repayments exceed original**: If `repayments_already_made` >= `original_credit_amount`, remaining_balance = 0, so no repayment due.
4. **Only 2008 credit requires repayment**: Credits from 2009+ were not loans. This node validates credit_year = 2008.
5. **Installment capped at $500**: The annual installment is exactly $500 (1/15 of $7,500 max), but it cannot exceed the remaining balance.
6. **No repayment if home gain < remaining balance in certain disposition cases**: This detail requires Form 5405 Part II worksheet; simplified here as full balance due on disposal.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 5405 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i5405.pdf | .research/docs/i5405.pdf |
| IRC §36(f) | current | Repayment rules | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section36 | N/A |
| Schedule 2 Instructions | 2024 | Line 10 | https://www.irs.gov/pub/irs-pdf/i1040s2.pdf | N/A |
