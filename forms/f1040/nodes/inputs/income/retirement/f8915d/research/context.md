# Form 8915-D — Qualified 2019 Disaster Retirement Plan Distributions and Repayments

## Overview

Form 8915-D is used to report qualified retirement plan distributions made due to 2019 qualified disasters (not COVID-19, which is covered by Form 8915-F). The structure mirrors Form 8915-F but applies specifically to 2019 disaster distributions.

**Key rules for TY2025:**
- The standard 3-year income spreading window for 2019 disaster distributions covered tax years 2019, 2020, and 2021. By TY2025, this spreading period has expired — the income has been (or should have been) fully reported.
- If prior amounts do NOT sum to the total distribution, there may still be remaining income to report in TY2025 (late reporting catch-up).
- Repayments made in 2025 for 2019 disaster distributions may still be credited: they reduce the taxable amount already reported, generating an excess repayment credit.
- The 10% early withdrawal penalty was waived for qualified 2019 disaster distributions.

**Wires to:** `schedule1` (income or credit)

**IRS Form:** 8915-D
**Drake Screen:** 915D
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/17764

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `total_2019_distribution` | `number` (nonnegative) | No | Form 8915-D, Part I | Total qualified disaster distribution taken in 2019 for 2019 qualified disasters. | IRC §72(t)(2)(G); Notice 2019-70 | https://www.irs.gov/pub/irs-pdf/f8915d.pdf |
| `amount_previously_reported_2019` | `number` (nonnegative) | No | Form 8915-D, Part I | Amount included in income on the TY2019 return (first year of spreading). | Form 8915-D instructions; Rev Proc 2021-30 §3.02 | https://www.irs.gov/instructions/i8915d |
| `amount_previously_reported_2020` | `number` (nonnegative) | No | Form 8915-D, Part I | Amount included in income on the TY2020 return (second year of spreading). | Form 8915-D instructions | https://www.irs.gov/instructions/i8915d |
| `amount_previously_reported_2021` | `number` (nonnegative) | No | Form 8915-D, Part I | Amount included in income on the TY2021 return (third year of spreading). | Form 8915-D instructions | https://www.irs.gov/instructions/i8915d |
| `repayments_in_2025` | `number` (nonnegative) | No | Form 8915-D, Part II | Amount repaid to the retirement plan in 2025. Repayments reduce previously reported income and may generate a credit. | IRC §72(t)(2)(G); Rev Proc 2021-30 §3.02(5) | https://www.irs.gov/pub/irs-pdf/f8915d.pdf |

---

## Calculation Logic

### Step 1 — Compute Previously Reported Total
```
previously_reported = (amount_previously_reported_2019 ?? 0)
                    + (amount_previously_reported_2020 ?? 0)
                    + (amount_previously_reported_2021 ?? 0)
```

### Step 2 — Compute Remaining Income (if any)
By TY2025, the 3-year spreading window has expired. Any remaining unreported amount is catch-up income:
```
remaining_income = max(0, total_2019_distribution - previously_reported)
```

Note: In most cases for TY2025, this will be zero (spreading was completed by TY2021). However, if a taxpayer missed reporting in prior years, they may still have remaining income.

Source: IRC §72(t)(2)(G); Form 8915-D instructions.

### Step 3 — Apply 2025 Repayments

Repayments in 2025 first offset any remaining income for the current year:
```
net_income = max(0, remaining_income - (repayments_in_2025 ?? 0))
```

If repayments exceed remaining income, the excess creates a credit (reduces prior income):
```
excess_repayment = max(0, (repayments_in_2025 ?? 0) - remaining_income)
```

Source: Rev Proc 2021-30 §3.02(5); Form 8915-D Part II.

### Step 4 — Net Schedule 1 Amount
```
net_schedule1 = net_income - excess_repayment
```

If positive: route as income to `schedule1.line8z_other_income`.
If negative: route as credit to `schedule1.line8z_other_income` (negative value).
If zero: no output.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line8z_other_income` (positive) | `schedule1` | `net_income > 0` | Form 8915-D Part I; IRC §72(t)(2)(G) | https://www.irs.gov/instructions/i8915d |
| `line8z_other_income` (negative) | `schedule1` | `excess_repayment > 0` | Rev Proc 2021-30 §3.02(5) | https://www.irs.gov/pub/irs-drop/rp-21-30.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Maximum qualified disaster distribution | $100,000 | IRC §72(t)(2)(G); Notice 2019-70 | https://www.irs.gov/pub/irs-drop/n-19-70.pdf |
| 3-year spreading window for 2019 disasters | 2019, 2020, 2021 (expired by TY2025) | IRC §72(t)(2)(G); Form 8915-D instructions | https://www.irs.gov/instructions/i8915d |
| 10% early withdrawal penalty waiver | Full waiver for qualified 2019 disaster distributions | IRC §72(t)(2)(G) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section72 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    TD["total_2019_distribution"]
    PY19["amount_previously_reported_2019"]
    PY20["amount_previously_reported_2020"]
    PY21["amount_previously_reported_2021"]
    REP["repayments_in_2025"]
  end

  subgraph node["f8915d node"]
    SUMPR["previously_reported = sum of prior years"]
    REMAIN["remaining = total - previously_reported"]
    NETINC["net_income = remaining - repayments"]
    EXCESS["excess = repayments - remaining"]
  end

  subgraph outputs["Downstream Nodes"]
    S1P["schedule1.line8z_other_income (positive income)"]
    S1N["schedule1.line8z_other_income (negative credit)"]
  end

  TD --> REMAIN
  PY19 --> SUMPR
  PY20 --> SUMPR
  PY21 --> SUMPR
  SUMPR --> REMAIN
  REMAIN --> NETINC
  REP --> NETINC
  NETINC -->|"> 0"| S1P
  REP --> EXCESS
  EXCESS -->|"> 0"| S1N
```

---

## Edge Cases & Special Rules

1. **Spreading window expired by TY2025**: For 2019 distributions, the three-year window (2019, 2020, 2021) is complete. If all three prior-year amounts sum to the total distribution, there is no remaining income — only repayments are relevant.

2. **Repayments in TY2025**: Even though the spreading window is closed, taxpayers can still repay 2019 disaster distributions within 3 years of the distribution date. Late repayments may still qualify. The node accepts repayments and credits them.

3. **Catch-up income**: If prior-year amounts do not sum to the full distribution (e.g., the taxpayer missed reporting in prior years), the remaining amount appears as TY2025 income.

4. **No repayments, spreading complete**: If previously_reported >= total_distribution and repayments_in_2025 = 0, no output is emitted.

5. **Large repayments**: Repayments exceeding the remaining income (which is likely zero for most TY2025 filers) generate a full excess credit. For example, a $30,000 repayment with $0 remaining income produces a $30,000 credit.

6. **$100,000 cap**: The node applies the cap as a Zod `.max()` constraint on total_2019_distribution.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 8915-D | 2019 | All | https://www.irs.gov/pub/irs-pdf/f8915d.pdf | .research/docs/f8915d.pdf |
| Instructions for Form 8915-D | 2019 | All | https://www.irs.gov/instructions/i8915d | .research/docs/i8915d.pdf |
| Notice 2019-70 (2019 qualified disasters) | 2019 | All | https://www.irs.gov/pub/irs-drop/n-19-70.pdf | N/A |
| IRC §72(t)(2)(G) | Current | §72(t) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section72 | N/A |
| Rev Proc 2021-30 | 2021 | §3.02 | https://www.irs.gov/pub/irs-drop/rp-21-30.pdf | N/A |
| Drake KB — Form 8915-D | Current | Entry screen | https://kb.drakesoftware.com/Site/Browse/17764 | N/A |
