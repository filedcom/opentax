# Form 8881 — Credit for Small Employer Pension Plan Startup Costs

## Overview
Computes the IRC §45E credit for small employers (≤100 employees) starting a new pension plan. Credit = 100% (for ≤50 employees) or 50% (51–100 employees) of startup costs, capped at $5,000/year. An additional $500/year is available for plans with auto-enrollment. The credit runs for 3 years. Routes to Schedule 3 line 6z.

**IRS Form:** 8881
**Drake Screen:** 8881
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14035

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| plan_type | PlanType enum | Yes | Plan type | Type of plan: 401k, simple, sep, defined_benefit, other | Form 8881; IRC §45E(c) | https://www.irs.gov/pub/irs-pdf/i8881.pdf |
| non_hce_count | number (int, ≥0) | Yes | Non-HCE employees | Count of non-highly-compensated employees | Form 8881 Part I; IRC §45E(b)(1) | https://www.irs.gov/pub/irs-pdf/i8881.pdf |
| employee_count | number (int, ≥0) | Yes | Total employees | Total employees ≤100 (determines credit rate tier) | Form 8881 Part I; IRC §45E(b) | https://www.irs.gov/pub/irs-pdf/i8881.pdf |
| startup_costs | number (≥0) | Yes | Startup costs | Eligible startup costs incurred for the year | Form 8881 Line 1; IRC §45E(c) | https://www.irs.gov/pub/irs-pdf/i8881.pdf |
| has_auto_enrollment | boolean | No | Auto-enrollment | True if plan includes automatic enrollment feature | Form 8881; IRC §45E(e) | https://www.irs.gov/pub/irs-pdf/i8881.pdf |
| credit_year | number (1–3) | No | Credit year | Year within the 3-year credit window (1, 2, or 3) | Form 8881; IRC §45E(b)(3) | https://www.irs.gov/pub/irs-pdf/i8881.pdf |

---

## Calculation Logic

### Step 1 — Eligibility check
`eligible = employee_count ≤ 100 AND non_hce_count ≥ 1`
Source: IRC §45E(b) — https://www.irs.gov/pub/irs-pdf/i8881.pdf

### Step 2 — Credit rate tier
`rate = employee_count ≤ 50 ? 100% : 50%`
Source: IRC §45E(b)(1)(B) (SECURE 2.0 §102, effective 2023) — https://www.law.cornell.edu/uscode/text/26/45E

### Step 3 — Startup credit
`baseCredit = startup_costs × rate`
`startupCredit = min(baseCredit, $5,000)`
Source: IRC §45E(a); Form 8881 Line 2 — https://www.irs.gov/pub/irs-pdf/i8881.pdf

### Step 4 — Auto-enrollment credit
`autoCredit = has_auto_enrollment ? $500 : 0`
Source: IRC §45E(e); Form 8881 — https://www.irs.gov/pub/irs-pdf/i8881.pdf

### Step 5 — Total credit
`total = startupCredit + autoCredit`

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total > 0 | Form 8881 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Maximum employee count for eligibility | ≤100 | IRC §45E(b)(1); statutory | https://www.law.cornell.edu/uscode/text/26/45E |
| Minimum non-HCE count | ≥1 | IRC §45E(b)(1)(A); statutory | https://www.law.cornell.edu/uscode/text/26/45E |
| Credit rate (≤50 employees) | 100% of startup costs | IRC §45E(b)(1)(B); SECURE 2.0 §102 | https://www.law.cornell.edu/uscode/text/26/45E |
| Credit rate (51–100 employees) | 50% of startup costs | IRC §45E(b)(1)(B) | https://www.law.cornell.edu/uscode/text/26/45E |
| Maximum startup credit per year | $5,000 | IRC §45E(a); statutory | https://www.law.cornell.edu/uscode/text/26/45E |
| Auto-enrollment credit per year | $500 | IRC §45E(e); statutory | https://www.law.cornell.edu/uscode/text/26/45E |
| Credit years | 3 years | IRC §45E(b)(3); statutory | https://www.law.cornell.edu/uscode/text/26/45E |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    pt["plan_type"]
    emp["employee_count\nnon_hce_count"]
    costs["startup_costs"]
    auto["has_auto_enrollment"]
  end
  subgraph node["f8881 (Pension Startup Credit)"]
    rate["startupCreditRate()"]
    sc["startupCredit()"]
    ac["autoEnrollmentCredit()"]
    tot["total = sc + ac"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  emp --> rate --> sc
  costs --> sc
  auto --> ac
  sc & ac --> tot --> s3

---

## Edge Cases & Special Rules

1. **>100 employees**: If `employee_count > 100`, startup credit = 0 (auto-enrollment credit also likely 0).
2. **No non-HCE**: If `non_hce_count < 1`, startup credit = 0 (must have at least one non-highly-compensated employee to benefit).
3. **SECURE 2.0 change (TY2023+)**: The 100% credit rate for ≤50 employees was added by SECURE 2.0 Act §102 (effective for plans established after 2022). Prior law was 50% for all eligible employers.
4. **3-year window**: The credit applies to the first 3 years of the plan. `credit_year` is informational; the node does not check whether the plan is within the window.
5. **Minimum $250 startup cost**: At least $250 of startup costs must be incurred (IRC §45E(c)(3) minimum). Node does not enforce minimum but will return 0 if startup_costs = 0.
6. **Eligible startup costs**: Only costs to set up/administer the plan and educate employees. Investment management fees do not qualify.
7. **Auto-enrollment**: The $500 credit applies for plans that include automatic enrollment per IRC §401(k)(13) or the SIMPLE IRA auto-enrollment rules. Available for years 1–3 of auto-enrollment feature.
8. **Non-refundable**: Excess carries forward via Form 3800.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8881 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8881.pdf | .research/docs/i8881.pdf |
| IRC §45E — Small Employer Pension Plan Startup Costs | current | §45E(a–e) | https://www.law.cornell.edu/uscode/text/26/45E | N/A |
| SECURE 2.0 Act §102 | 2022 | §102 | https://www.congress.gov/bill/117th-congress/house-bill/2954 | N/A |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
