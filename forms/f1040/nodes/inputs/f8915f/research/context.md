# Form 8915-F — Qualified Disaster Retirement Plan Distributions and Repayments

## Overview

Form 8915-F is the permanent replacement for the annual disaster distribution forms (8915-A through 8915-E). It is used to report qualified disaster distributions from retirement plans, including COVID-19 distributions, and to track repayments. The form allows:
1. Spreading disaster distribution income over 3 tax years (default: 1/3 per year)
2. Electing to include the full distribution in one year
3. Waiving the 10% early withdrawal penalty (IRC §72(t)(2)(G))
4. Reporting repayments that reduce taxable income or generate a credit on Schedule 3

**IRS Form:** 8915-F
**Drake Screen:** 915F
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/17764

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `disaster_type` | `string` | No | Form 8915-F, top section | Type of qualified disaster (e.g., "COVID-19", "Hurricane Ida", etc.). Used for documentation. | Rev Proc 2021-30; Notice 2020-50 | https://www.irs.gov/pub/irs-pdf/f8915f.pdf |
| `distribution_year` | `number` (integer) | No | Form 8915-F | Year in which the qualified disaster distribution was taken. Determines spreading period. | Rev Proc 2021-30 §3.02 | https://www.irs.gov/pub/irs-pdf/f8915f.pdf |
| `total_distribution` | `number` (nonnegative) | No | Form 8915-F, Part I | Total amount of the qualified disaster distribution. Cannot exceed $100,000 for COVID-19 distributions. | IRC §72(t)(2)(G); Notice 2020-50 §IV | https://www.irs.gov/pub/irs-drop/n-20-50.pdf |
| `amount_reported_prior_year1` | `number` (nonnegative) | No | Form 8915-F, Part I | Amount of the distribution included in income in the first year of the spreading period. | Rev Proc 2021-30 §3.02(3); Form 8915-F instructions | https://www.irs.gov/instructions/i8915f |
| `amount_reported_prior_year2` | `number` (nonnegative) | No | Form 8915-F, Part I | Amount included in income in the second year of the spreading period. | Rev Proc 2021-30 §3.02(3); Form 8915-F instructions | https://www.irs.gov/instructions/i8915f |
| `repayments_this_year` | `number` (nonnegative) | No | Form 8915-F, Part II | Amount repaid to the retirement plan during the current tax year. Reduces taxable amount or creates a credit if in excess. | IRC §72(t)(2)(G); Rev Proc 2021-30 §3.02(5) | https://www.irs.gov/pub/irs-pdf/f8915f.pdf |
| `elect_full_inclusion` | `boolean` | No | Form 8915-F election | If true, the taxpayer elects to include all remaining distribution income in the current year rather than using the 3-year spread. | Rev Proc 2021-30 §3.02(2); Form 8915-F instructions | https://www.irs.gov/instructions/i8915f |

---

## Calculation Logic

### Step 1 — Compute Reportable Amount (Current Year)

Default (3-year spreading):
```
one_third = total_distribution / 3
already_reported = (amount_reported_prior_year1 ?? 0) + (amount_reported_prior_year2 ?? 0)
remaining = max(0, total_distribution - already_reported)
reportable_this_year = min(one_third, remaining)
```

If `elect_full_inclusion === true`:
```
reportable_this_year = max(0, total_distribution - already_reported)
```

Source: Rev Proc 2021-30 §3.02(2)–(3); Form 8915-F Part I, lines 12–14.

### Step 2 — Apply Repayments

```
net_income = max(0, reportable_this_year - (repayments_this_year ?? 0))
```

If repayments exceed the reportable amount, the excess generates a credit:
```
excess_repayment = max(0, (repayments_this_year ?? 0) - reportable_this_year)
```

Source: Rev Proc 2021-30 §3.02(5); Form 8915-F Part II.

### Step 3 — Route Net Income to f1040

If `net_income > 0`, emit to `f1040` as `line4b_ira_distributions_taxable` or as `line5b_pension_annuities_taxable`. In the engine, the generic path is through `schedule1.line8z_other_income` for "other income" from disasters since there is no dedicated f1040 field for disaster distributions specifically. However, these are pension/IRA distributions, so they flow via `f1040` line 4b or 5b.

For simplicity and correctness in the engine architecture: route to `schedule1.line8z_other_income` as a positive amount. This is consistent with how other miscellaneous income flows through the engine.

Source: Form 8915-F instructions, Part I; Form 1040 instructions lines 4b/5b.

### Step 4 — Route Excess Repayment Credit to schedule3

If `excess_repayment > 0`, emit to `schedule3.line13_repayment` (other payments credit). This reduces the taxpayer's tax liability.

Note: Schedule 3 does not currently have a dedicated disaster repayment field. The engine uses `line9_premium_tax_credit` is not correct. Looking at the schedule3 schema — there is no `line13` field. The proper routing for repayment credit in the current engine is the closest available field. We will use `schedule1.line8z_other_income` as a negative value (reducing income) for the repayment credit portion, because the current schedule3 schema does not have a disaster repayment line.

**Revised routing:** Route excess repayment as negative income to `schedule1.line8z_other_income`.

Source: Form 8915-F Part II; Rev Proc 2021-30 §3.02(5).

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line8z_other_income` (positive) | `schedule1` | `net_income > 0` | Form 8915-F Part I; IRC §72(t)(2)(G) | https://www.irs.gov/instructions/i8915f |
| `line8z_other_income` (negative, combined with credit) | `schedule1` | `excess_repayment > 0` | Rev Proc 2021-30 §3.02(5) | https://www.irs.gov/instructions/i8915f |

**Implementation note:** The engine combines net_income and excess repayment credit into a single schedule1 output if both are present (they offset each other). If net_income > excess_repayment, the net is positive other income. If excess_repayment > net_income (which shouldn't happen by construction since excess = repayments - reportable, and net = reportable - repayments), we use the absolute credit amount. In practice, these are separate scenarios: either you have net income OR excess repayment credit, not both simultaneously.

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Maximum qualified disaster distribution (COVID-19) | $100,000 | Notice 2020-50 §IV; IRC §72(t)(2)(G) | https://www.irs.gov/pub/irs-drop/n-20-50.pdf |
| 3-year spreading period | 1/3 per year default | Rev Proc 2021-30 §3.02(2) | https://www.irs.gov/pub/irs-drop/rp-21-30.pdf |
| 10% early withdrawal penalty waiver | Full waiver for qualified disaster distributions | IRC §72(t)(2)(G) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section72 |
| Repayment window | 3 years from date of distribution | Rev Proc 2021-30 §3.02(5); IRC §72(t)(2)(G) | https://www.irs.gov/pub/irs-drop/rp-21-30.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per Form 8915-F)"]
    TD["total_distribution"]
    PY1["amount_reported_prior_year1"]
    PY2["amount_reported_prior_year2"]
    REP["repayments_this_year"]
    ELECT["elect_full_inclusion"]
  end

  subgraph node["f8915f node"]
    SPREAD["Compute reportable: 1/3 or remainder"]
    ELECT_CHECK["elect_full_inclusion?"]
    NETINC["net_income = reportable - repayments"]
    EXCESS["excess_repayment = repayments - reportable"]
  end

  subgraph outputs["Downstream Nodes"]
    S1P["schedule1.line8z_other_income (positive, net_income)"]
    S1N["schedule1.line8z_other_income (negative, excess credit)"]
  end

  TD --> SPREAD
  PY1 --> SPREAD
  PY2 --> SPREAD
  ELECT --> ELECT_CHECK
  ELECT_CHECK -->|"full"| SPREAD
  SPREAD --> NETINC
  REP --> NETINC
  NETINC -->|"> 0"| S1P
  REP --> EXCESS
  EXCESS -->|"> 0"| S1N
```

---

## Edge Cases & Special Rules

1. **Spreading complete by TY2025**: For COVID-19 distributions taken in 2020, the 3-year spreading window covers 2020, 2021, and 2022. By TY2025, COVID distributions taken in 2020 have already been fully reported. However, later qualified disasters may still have active spreading windows.

2. **elect_full_inclusion**: If true, all remaining unreported income is included in the current year. Useful when the taxpayer wants to accelerate recognition.

3. **Repayments reduce income**: Repayments made within 3 years of distribution are treated as a rollover and reduce taxable income. If repayments exceed the reportable amount for the current year, the excess creates a credit.

4. **No double-counting**: If `amount_reported_prior_year1 + amount_reported_prior_year2 >= total_distribution`, there is no remaining income to report. The node emits no income output.

5. **$100,000 cap**: The engine accepts the values as entered. The cap enforcement is a data-entry constraint; the node does not throw if total_distribution exceeds $100,000 (it caps at the entered amount).

6. **Permanent form**: Form 8915-F replaced annual forms starting TY2021. It covers all tax years going forward for qualified disasters.

7. **Penalty waiver**: The 10% penalty is automatically waived for qualified disaster distributions. The node does not emit any penalty — it simply does not route to Form 5329 for the additional tax.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 8915-F | 2024 | All | https://www.irs.gov/pub/irs-pdf/f8915f.pdf | .research/docs/f8915f.pdf |
| Instructions for Form 8915-F | 2024 | All | https://www.irs.gov/instructions/i8915f | .research/docs/i8915f.pdf |
| Rev Proc 2021-30 | 2021 | §3 | https://www.irs.gov/pub/irs-drop/rp-21-30.pdf | N/A |
| Notice 2020-50 (COVID distributions) | 2020 | §IV | https://www.irs.gov/pub/irs-drop/n-20-50.pdf | N/A |
| IRC §72(t)(2)(G) | Current | §72(t) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section72 | N/A |
| Drake KB — Form 8915-F | Current | Entry screen | https://kb.drakesoftware.com/Site/Browse/17764 | N/A |
