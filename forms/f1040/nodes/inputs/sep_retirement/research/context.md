# SEP Retirement — Self-Employed Retirement Plan Deduction

## Overview

This node captures SEP-IRA, SIMPLE IRA, and Solo 401(k) retirement contributions for self-employed taxpayers. Each item represents one plan. The node computes the deductible above-the-line retirement contribution flowing to Schedule 1, Part II, Line 16 (self-employed SEP, SIMPLE, and qualified plans deduction).

The deduction reduces gross income in computing AGI — it is one of the most significant deductions available to self-employed taxpayers.

**IRS Form:** No dedicated IRS form. Reported on Schedule 1 (Form 1040), Line 16. Supporting worksheet is the Deduction Worksheet for Self-Employed in Pub 560.
**Drake Screen:** SEP (screen_code: "SEP")
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13699

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `plan_type` | `PlanType` enum | Yes | Drake SEP screen — Plan Type | Type of retirement plan: SEP, SIMPLE, or SOLO_401K | IRC §408(k), §408(p), §401(k) | https://www.irs.gov/pub/irs-pdf/p560.pdf |
| `net_self_employment_compensation` | `number` (nonnegative) | No | Drake SEP screen — Net earnings from SE | Net self-employment compensation = net SE profit × 0.9235 × 0.5 for deduction base. Used to compute SEP contribution limit. Required for SEP and SOLO_401K employer profit-sharing limit calculation. | IRC §404(a)(8); Pub 560, ch. 4 | https://www.irs.gov/pub/irs-pdf/p560.pdf |
| `sep_contribution` | `number` (nonnegative) | No | Drake SEP screen — SEP contribution | Actual SEP-IRA contribution made (for SEP plans). Must be lesser of 25% of net SE compensation or $69,000 (TY2025). | IRC §408(k); IRC §404(a)(8); Rev Proc 2024-40, §3.20 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| `simple_employee_contribution` | `number` (nonnegative) | No | Drake SEP screen — Employee deferral | SIMPLE IRA employee elective deferrals. Limited to $16,500 ($19,500 if age 50+ TY2025). | IRC §408(p)(2)(A); Rev Proc 2024-40, §3.24 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| `simple_employer_contribution` | `number` (nonnegative) | No | Drake SEP screen — Employer contribution | SIMPLE IRA employer matching or nonelective contributions. | IRC §408(p)(2)(B) | https://www.irs.gov/pub/irs-pdf/p560.pdf |
| `age_50_or_over` | `boolean` | No | Drake SEP screen — Age 50+ | Whether the taxpayer is age 50 or older by year-end. Enables catch-up contribution for SIMPLE IRA ($3,000 additional). | IRC §408(p)(2)(D) | https://www.irs.gov/pub/irs-pdf/p560.pdf |
| `solo401k_employee_deferral` | `number` (nonnegative) | No | Drake SEP screen — Solo 401k employee deferral | Solo 401(k) employee elective deferral amount. Limited to the lesser of 100% of earned income or $23,500 (TY2025). | IRC §402(g); Rev Proc 2024-40, §3.19 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| `solo401k_employer_contribution` | `number` (nonnegative) | No | Drake SEP screen — Solo 401k employer profit-sharing | Solo 401(k) employer profit-sharing contribution. Limited to 25% of net SE compensation. Combined employee + employer cannot exceed $69,000 (TY2025). | IRC §415(c); IRC §404(a)(8); Rev Proc 2024-40, §3.20 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |

---

## Calculation Logic

### Step 1 — Determine plan type
Each item has a `plan_type` of SEP, SIMPLE, or SOLO_401K. Each type has a distinct calculation.

### Step 2 — SEP-IRA deduction
```
sep_limit = min(25% × net_self_employment_compensation, 69_000)
sep_deduction = min(sep_contribution ?? 0, sep_limit)
```
The self-employed SEP contribution rate is 25% of net SE compensation (after deducting the employer equivalent of SE tax, i.e., net profit × 0.9235, then apply the 20% effective rate = ÷ by 1.25 which equals × 0.8). However, for simplicity in this node, we accept `net_self_employment_compensation` as the pre-computed deduction base (net SE earnings from self-employment after SE tax deduction, per Pub 560 Worksheet). The 25% limit is applied to that.

Source: IRC §404(a)(8); Pub 560, Chapter 4; Rev Proc 2024-40, §3.20.

### Step 3 — SIMPLE IRA deduction
```
employee_limit = age_50_or_over ? 19_500 : 16_500
simple_employee_capped = min(simple_employee_contribution ?? 0, employee_limit)
simple_deduction = simple_employee_capped + (simple_employer_contribution ?? 0)
```
Employee contribution is capped at TY2025 SIMPLE limit. Employer contributions are deductible in full (matching = 100% of employee contribution up to 3% of compensation, or nonelective = 2%).

Source: IRC §408(p); Rev Proc 2024-40, §3.24; Pub 560, Chapter 3.

### Step 4 — Solo 401(k) deduction
```
employee_limit = 23_500
employee_capped = min(solo401k_employee_deferral ?? 0, employee_limit)
combined_limit = 69_000
total_solo = employee_capped + (solo401k_employer_contribution ?? 0)
solo401k_deduction = min(total_solo, combined_limit)
```
Combined employee + employer contributions cannot exceed $69,000 (TY2025).

Source: IRC §415(c); IRC §402(g); Rev Proc 2024-40, §3.19, §3.20; Pub 560, Chapter 5.

### Step 5 — Aggregate across all plans
```
total_deduction = sum of per-plan deductions across all items
```

### Step 6 — Route to Schedule 1
If `total_deduction > 0`, emit one output to `schedule1.line16_sep_simple`.

Source: Schedule 1 (Form 1040), Part II, Line 16.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line16_sep_simple` | `schedule1` | Total deduction > 0 | Schedule 1 (Form 1040), Part II, Line 16 | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| SEP-IRA annual addition limit | $69,000 | Rev Proc 2024-40, §3.20 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| SEP contribution rate (self-employed) | 25% of net SE compensation (effective ≈ 20% of net profit) | IRC §408(k); Pub 560 ch.4 | https://www.irs.gov/pub/irs-pdf/p560.pdf |
| SIMPLE IRA employee contribution limit (under 50) | $16,500 | Rev Proc 2024-40, §3.24 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| SIMPLE IRA employee catch-up limit (age 50+) | $19,500 | Rev Proc 2024-40, §3.24 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Solo 401(k) employee elective deferral limit | $23,500 | Rev Proc 2024-40, §3.19 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Solo 401(k) / SEP combined annual limit | $69,000 | Rev Proc 2024-40, §3.20; IRC §415(c) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per plan)"]
    PT["plan_type (SEP|SIMPLE|SOLO_401K)"]
    NSE["net_self_employment_compensation"]
    SC["sep_contribution"]
    SEC["simple_employee_contribution"]
    SERC["simple_employer_contribution"]
    A50["age_50_or_over"]
    S4K_E["solo401k_employee_deferral"]
    S4K_ER["solo401k_employer_contribution"]
  end

  subgraph node["sep_retirement"]
    SEP_CALC["SEP: min(25%×NSE, 69000)"]
    SIMPLE_CALC["SIMPLE: employee(capped)+employer"]
    SOLO_CALC["Solo 401k: employee+employer (capped at 69000)"]
    AGG["Aggregate across all plans"]
  end

  subgraph outputs["Downstream"]
    S1["schedule1.line16_sep_simple"]
  end

  PT --> SEP_CALC
  PT --> SIMPLE_CALC
  PT --> SOLO_CALC
  NSE --> SEP_CALC
  SC --> SEP_CALC
  SEC --> SIMPLE_CALC
  SERC --> SIMPLE_CALC
  A50 --> SIMPLE_CALC
  S4K_E --> SOLO_CALC
  S4K_ER --> SOLO_CALC
  SEP_CALC --> AGG
  SIMPLE_CALC --> AGG
  SOLO_CALC --> AGG
  AGG -->|"total > 0"| S1
```

---

## Edge Cases & Special Rules

1. **SEP 25% limit on net SE compensation.** The `net_self_employment_compensation` field should be the deduction base (net SE earnings after deducting half of SE tax per IRC §164(f)). If not provided, deduction is capped at the sep_contribution amount (up to the $69,000 absolute limit). The caller is responsible for providing the correct SE compensation base.

2. **Multiple plans.** A self-employed taxpayer may have both a SEP-IRA and a Solo 401(k) from different businesses. Each is a separate item. The deductions are summed. However, coordination rules apply across plans — these are data-entry constraints, not enforced by this node.

3. **SIMPLE IRA employer contributions.** For self-employed, employer contributions are also deductible. Both employee and employer sides flow to Schedule 1, Line 16.

4. **Solo 401(k) combined limit.** The $69,000 combined limit applies to one plan. Employee deferrals + employer profit-sharing cannot exceed $69,000 per participant per plan year.

5. **Age 50+ catch-up applies only to SIMPLE.** For Solo 401(k), the catch-up amount ($7,500 in 2025) would be added to the employee deferral limit making it $31,000 — but the node accepts the raw contribution amount and just applies the combined $69,000 cap. The caller provides the pre-computed amounts.

6. **Zero contribution produces no output.** If all contributions are zero or absent, no output is emitted.

7. **SE compensation not required.** If `net_self_employment_compensation` is absent, the SEP contribution is not subject to the 25% test in the node — it is capped only at $69,000. In production, the SE compensation test should be pre-computed by the caller.

8. **SIMPLE plans cannot exceed combined limits.** SIMPLE IRA employee contribution limits already reflect total limits; employer contributions on top are separately deductible.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Publication 560 (Retirement Plans for Small Business) | 2024 | Chapters 2–5 | https://www.irs.gov/pub/irs-pdf/p560.pdf | .research/docs/p560.pdf |
| Rev Proc 2024-40 (TY2025 retirement plan limits) | 2024 | §3.19, §3.20, §3.24 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
| IRC §408(k) — SEP-IRA | Current | §408(k) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section408 | N/A |
| IRC §408(p) — SIMPLE IRA | Current | §408(p) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section408 | N/A |
| IRC §401(k) — 401(k) plans | Current | §401(k) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section401 | N/A |
| IRC §404(a)(8) — SE deduction limit | Current | §404(a)(8) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section404 | N/A |
| IRC §415(c) — Annual additions limit | Current | §415(c) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section415 | N/A |
| Schedule 1 (Form 1040) | 2025 | Part II, Line 16 | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf | N/A |
| Drake Software KB — SEP/SIMPLE/Keogh | Current | Entry screen | https://kb.drakesoftware.com/Site/Browse/13699 | N/A |
