# Clergy — Ministerial Income Computations

## Overview

This node captures clergy/ministerial income data for ministers of the gospel. Ministers have a unique dual-status tax treatment under the Internal Revenue Code: they are treated as employees for federal income tax withholding purposes but as self-employed for self-employment (SE) tax on their ministerial services.

**Key rules:**
- Housing allowance designated by the church is excluded from gross income (IRC §107), but only up to the **lesser** of: (a) the amount officially designated by the church, (b) the fair market rental value of the home (including furnishings, utilities), or (c) actual housing expenses paid.
- Church-provided parsonage (housing in kind) is excluded from gross income at FMV.
- The housing allowance exclusion does **not** apply for SE tax purposes — the full amount of housing allowance is included in the SE tax base (IRC §1402(a)(8)).
- Ministers who have obtained approval of Form 4361 (Application for Exemption From Self-Employment Tax) are exempt from SE tax on ministerial earnings.
- Non-ordained ministers or those treating their services as not ministerial do not qualify for the §107 exclusion.

**Wires to:** `schedule_se` (SE tax on net ministerial earnings), `schedule1` (housing exclusion flows as negative other income to offset wages).

**IRS Form:** Wks Clergy (Drake worksheet; IRS Pub 517 guidance)
**Drake Screen:** CLGY
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/12065

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `ministerial_wages` | `number` (nonnegative) | No | W-2 Box 1 / minister earnings | Wages received from the church as an employee minister. Does NOT include housing allowance (Box 14 or separate designation letter). | IRC §107; Pub 517 p.6 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| `housing_allowance_designated` | `number` (nonnegative) | No | Church designation letter / W-2 Box 14 | Amount officially designated by the church as a housing allowance before the beginning of the year. Cannot exceed actual allowance paid. | IRC §107(2); Pub 517 p.8 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| `actual_housing_expenses` | `number` (nonnegative) | No | Minister's records | Actual amounts paid for rent/mortgage interest, utilities, repairs, furnishings, and related housing costs during the year. | IRC §107; Pub 517 p.8 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| `fair_market_rental_value` | `number` (nonnegative) | No | Comparable rental market | Fair market rental value of the home (including furnishings and utilities). This is the maximum that can be excluded under IRC §107. | IRC §107; Treas. Reg. §1.107-1(b); Pub 517 p.8 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| `parsonage_value` | `number` (nonnegative) | No | Church records / FMV appraisal | Fair market value of church-provided housing (parsonage) in which the minister lives. Excluded from income under IRC §107(1). Not subject to SE tax because it is not paid in cash. | IRC §107(1); Pub 517 p.7 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| `has_4361_exemption` | `boolean` | No | Form 4361 approval notice | Whether the minister has received IRS approval of Form 4361, exempting them from SE tax on ministerial earnings. If `true`, no SE tax output is emitted. | IRC §1402(e); Form 4361 instructions | https://www.irs.gov/pub/irs-pdf/f4361.pdf |
| `is_ordained_minister` | `boolean` | No | Ordination/commissioning credential | Whether the minister is ordained, licensed, or commissioned. Must be `true` to qualify for §107 housing exclusion and dual-status SE treatment. | IRC §107; IRC §1402(c)(4); Pub 517 p.3 | https://www.irs.gov/pub/irs-pdf/p517.pdf |

---

## Calculation Logic

### Step 1 — Determine Minister Eligibility
If `is_ordained_minister !== true`, the housing exclusion does not apply and SE dual-status does not apply. Ministerial wages are treated as ordinary wages. No special outputs.

Source: IRC §107 ("a minister of the gospel"); IRS Pub 517, p.3.

### Step 2 — Compute Housing Allowance Exclusion
For ordained ministers (without parsonage — cash allowance):
```
housing_exclusion = min(
  housing_allowance_designated ?? 0,
  actual_housing_expenses ?? 0,
  fair_market_rental_value ?? 0
)
```
Only amounts up to all three limits are excludable. If any of the three inputs is zero or missing, the exclusion is constrained accordingly.

Source: IRC §107(2); IRS Pub 517, p.8; Rev. Rul. 71-280.

### Step 3 — Parsonage Exclusion
If `parsonage_value > 0`, that amount is excluded from gross income separately under IRC §107(1).

Source: IRC §107(1); Pub 517, p.7.

### Step 4 — Compute SE Tax Base
```
se_base = ministerial_wages + housing_allowance_designated
```
Note: IRC §1402(a)(8) includes the housing allowance (not the parsonage) in the SE tax base because it is a cash payment. The parsonage (in-kind housing) is NOT included in the SE tax base.

If `has_4361_exemption === true`, SE tax base is zero (no SE output emitted).

Source: IRC §1402(a)(8); IRC §1402(c)(4); Pub 517, p.14.

### Step 5 — Route to schedule_se
If `se_base > 0` and `has_4361_exemption !== true` and `is_ordained_minister === true`:
- Emit output to `schedule_se` with `net_profit_schedule_c: se_base`.

This uses the `net_profit_schedule_c` field because ministers are treated as self-employed for SE purposes, and the schedule_se node aggregates SE income from multiple sources.

Source: IRC §1402(c)(4); Schedule SE instructions.

### Step 6 — Route housing exclusion to schedule1
If an ordained minister has a housing exclusion > 0, the exclusion amount reduces their taxable income. Route as a negative adjustment to Schedule 1's `line8z_other_income` to offset the wages that may have been reported.

Note: In practice, ministerial wages excluding the housing allowance are not included in W-2 Box 1 if properly designated. However, the engine routes the exclusion amount to document it.

Source: IRC §107; Pub 517, p.8; Schedule 1 Part I line 8z.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `net_profit_schedule_c` | `schedule_se` | `is_ordained_minister === true` AND `has_4361_exemption !== true` AND `se_base > 0` | IRC §1402(c)(4); IRC §1402(a)(8) | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| `line8z_other_income` | `schedule1` | `is_ordained_minister === true` AND `housing_exclusion > 0` (negative amount — exclusion) | IRC §107; Schedule 1 line 8z | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| SE earnings threshold | $400 | IRC §1402(b); Schedule SE instructions | https://www.irs.gov/instructions/i1040sse |
| Housing exclusion limit | Lesser of designated amount, actual expenses, or FMV rental | IRC §107(2); Pub 517 p.8 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| Parsonage exclusion | FMV of provided housing (no dollar cap) | IRC §107(1); Pub 517 p.7 | https://www.irs.gov/pub/irs-pdf/p517.pdf |
| Form 4361 SE exemption | Full exemption from SE tax on ministerial earnings if approved | IRC §1402(e) | https://www.irs.gov/pub/irs-pdf/f4361.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per minister)"]
    MW["ministerial_wages"]
    HAD["housing_allowance_designated"]
    AHE["actual_housing_expenses"]
    FMRV["fair_market_rental_value"]
    PV["parsonage_value"]
    F4361["has_4361_exemption"]
    IOM["is_ordained_minister"]
  end

  subgraph node["clergy node"]
    CHECK["is_ordained_minister?"]
    EXCL["housing_exclusion = min(designated, actual, fmrv)"]
    SEBASE["se_base = wages + designated"]
    F4361CHECK["has_4361_exemption?"]
  end

  subgraph outputs["Downstream Nodes"]
    SSE["schedule_se.net_profit_schedule_c"]
    S1["schedule1.line8z_other_income (negative exclusion)"]
  end

  IOM --> CHECK
  CHECK -->|"ordained"| EXCL
  CHECK -->|"ordained"| SEBASE
  HAD --> EXCL
  AHE --> EXCL
  FMRV --> EXCL
  HAD --> SEBASE
  MW --> SEBASE
  F4361CHECK -->|"no exemption"| SSE
  SEBASE --> SSE
  EXCL -->|"exclusion > 0"| S1
```

---

## Edge Cases & Special Rules

1. **Not ordained**: If `is_ordained_minister` is false or omitted, no housing exclusion applies and no SE dual-status. Ministerial wages are ordinary income.

2. **Form 4361 exemption**: If `has_4361_exemption === true`, the minister owes no SE tax on ministerial earnings. No output to schedule_se.

3. **Housing allowance vs. parsonage**: Both can exist simultaneously (e.g., minister lives in a parsonage AND receives a cash housing supplement). Parsonage is excluded under §107(1); cash allowance excluded under §107(2) subject to the three-way minimum rule.

4. **SE tax on housing allowance**: Even though the housing allowance is excluded from income, it IS included in the SE tax base (IRC §1402(a)(8)). Parsonage FMV is NOT included in SE base.

5. **Excess housing allowance**: Any designated amount exceeding the §107 exclusion limit (min of three) is ordinary income, included in gross income. The node routes the exclusion only — the excess is already captured in ministerial_wages or would be reported separately.

6. **No SE if net earnings < $400**: SE tax is only owed if net earnings from self-employment are $400 or more (IRC §1402(b)). The schedule_se node enforces this threshold.

7. **Dual status**: Minister files as an employee for income tax (W-2) but as self-employed for SE tax purposes on ministerial services. This is the defining characteristic of the clergy tax regime.

8. **Form 4361 is irrevocable**: Once approved, the exemption is permanent and applies to all future ministerial earnings. The `has_4361_exemption` flag captures this permanent status.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Publication 517 (Clergy Tax Guide) | 2024 | All | https://www.irs.gov/pub/irs-pdf/p517.pdf | .research/docs/p517.pdf |
| IRC §107 — Rental Value of Parsonages | Current | §107(1), §107(2) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section107 | N/A |
| IRC §1402(a)(8), §1402(c)(4) — SE Tax for Ministers | Current | §1402 | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1402 | N/A |
| IRC §1402(e) — Form 4361 Exemption | Current | §1402(e) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1402 | N/A |
| Form 4361 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/f4361.pdf | N/A |
| Schedule SE (Form 1040) Instructions | 2024 | Part I | https://www.irs.gov/instructions/i1040sse | N/A |
| Drake KB — CLGY Screen | Current | Clergy entry | https://kb.drakesoftware.com/Site/Browse/12065 | N/A |
