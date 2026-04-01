# f3800 — Form 3800: General Business Credit

## Overview

Form 3800 aggregates multiple component business credits into a single General Business Credit (GBC). The credit is subject to a multi-tier limitation and the allowed amount flows to Schedule 3, line 6z, then to Form 1040, line 20. Unused credits carry back 1 year (3 years for §6417(b) credits) and forward 20 years (§39).

This input node captures either a pre-computed total GBC or individual named component credit amounts, sums them, and routes the total to `schedule3.line6z_general_business_credit`. Full limitation math (involving net income tax and AMT) is handled at the Schedule 3 / Form 1040 level.

**IRS Form:** 3800
**Drake Screen:** 3800 / GBC
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/ (Drake screens "3800" and "GBC")

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `total_gbc` | `number` (nonnegative) | No | Form 3800 total | Pre-computed total General Business Credit. If provided, used directly (overrides sum of components). | IRC §38; Form 3800 Part II line 38 | https://www.irs.gov/pub/irs-pdf/f3800.pdf |
| `work_opportunity_credit` | `number` (nonnegative) | No | Form 5884 | Work Opportunity Credit (IRC §51). Wages paid to qualifying employees from targeted groups. | IRC §51; Form 5884 | https://www.irs.gov/pub/irs-pdf/f5884.pdf |
| `research_credit` | `number` (nonnegative) | No | Form 6765 | Research Activities Credit (IRC §41). Qualified research expenses. | IRC §41; Form 6765 | https://www.irs.gov/pub/irs-pdf/f6765.pdf |
| `disabled_access_credit` | `number` (nonnegative) | No | Form 8826 | Disabled Access Credit (IRC §44). Eligible small businesses that pay/incur access expenses for disabled persons. | IRC §44; Form 8826 | https://www.irs.gov/pub/irs-pdf/f8826.pdf |
| `employer_pension_startup_credit` | `number` (nonnegative) | No | Form 8881 | Credit for small employer pension plan startup costs (IRC §45E) and auto-enrollment (§45T). | IRC §45E, §45T; Form 8881 | https://www.irs.gov/pub/irs-pdf/f8881.pdf |
| `employer_childcare_credit` | `number` (nonnegative) | No | Form 8882 | Employer-provided childcare facilities and services credit (IRC §45F). | IRC §45F; Form 8882 | https://www.irs.gov/pub/irs-pdf/f8882.pdf |
| `small_employer_health_credit` | `number` (nonnegative) | No | Form 8941 | Small employer health insurance premiums credit (IRC §45R). | IRC §45R; Form 8941 | https://www.irs.gov/pub/irs-pdf/f8941.pdf |
| `new_markets_credit` | `number` (nonnegative) | No | Form 8874 | New Markets Tax Credit (IRC §45D). Investment in qualified community development entities. | IRC §45D; Form 8874 | https://www.irs.gov/pub/irs-pdf/f8874.pdf |
| `energy_efficient_home_credit` | `number` (nonnegative) | No | Form 8908 | Energy Efficient Home Credit (IRC §45L). New energy-efficient homes constructed and sold/leased. | IRC §45L; Form 8908 | https://www.irs.gov/pub/irs-pdf/f8908.pdf |
| `advanced_manufacturing_credit` | `number` (nonnegative) | No | Form 7207 | Advanced Manufacturing Production Credit (IRC §45X). | IRC §45X; Form 7207 | https://www.irs.gov/pub/irs-pdf/f7207.pdf |
| `carryforward_credit` | `number` (nonnegative) | No | Form 3800 Part IV | Unused GBC carried forward from prior years (up to 20 years). | IRC §39(a); Form 3800 Part IV | https://www.irs.gov/pub/irs-pdf/f3800.pdf |
| `carryback_credit` | `number` (nonnegative) | No | Form 3800 Part II line 5 | GBC carried back from a subsequent year (1-year carryback; 3 years for §6417(b) credits). | IRC §39(a); Form 3800 Part II line 5 | https://www.irs.gov/pub/irs-pdf/f3800.pdf |

---

## Calculation Logic

### Step 1 — Compute Total Component Credits
If `total_gbc` is provided, use it directly. Otherwise sum all named component fields:
```
components = work_opportunity_credit + research_credit + disabled_access_credit
           + employer_pension_startup_credit + employer_childcare_credit
           + small_employer_health_credit + new_markets_credit
           + energy_efficient_home_credit + advanced_manufacturing_credit
```
Source: IRC §38(b); Form 3800 Part III

### Step 2 — Add Carryforward and Carryback
```
total_gbc_with_carryovers = components + carryforward_credit + carryback_credit
```
Source: IRC §39(a); Form 3800 Part II lines 4–5

### Step 3 — Route to Schedule 3
Emit `schedule3.line6z_general_business_credit = total_gbc_with_carryovers` if > 0.
Source: Form 3800 Part II line 38 → Schedule 3 (Form 1040) line 6z; IRC §38

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line6z_general_business_credit` | `schedule3` | Total GBC > 0 | IRC §38; Schedule 3 line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Carryback period (standard GBC) | 1 year | IRC §39(a)(1)(A) | https://www.irs.gov/instructions/i3800 |
| Carryback period (§6417(b) credits) | 3 years | IRC §6417; Form 3800 instructions | https://www.irs.gov/instructions/i3800 |
| Carryforward period | 20 years | IRC §39(a)(1)(B) | https://www.irs.gov/instructions/i3800 |
| GBC limitation threshold | $25,000 (25% of excess net income tax above this amount) | IRC §38(c)(1) | https://www.irs.gov/instructions/i3800 |
| Average gross receipts threshold (eligible small business) | $50,000,000 | IRC §38(c)(5); Form 3800 instructions | https://www.irs.gov/instructions/i3800 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Form 3800 screen)"]
    TOT["total_gbc (override)"]
    COMP["Component credits (work_opportunity, research, disabled_access, etc.)"]
    CF["carryforward_credit"]
    CB["carryback_credit"]
  end

  subgraph node["f3800"]
    SUM["total = total_gbc ?? sum(components)"]
    ADD["+ carryforward + carryback"]
  end

  subgraph outputs["Downstream Nodes"]
    S3["schedule3.line6z_general_business_credit"]
    F1040["Form 1040, line 20 (via schedule3)"]
  end

  TOT --> SUM
  COMP --> SUM
  CF --> ADD
  CB --> ADD
  SUM --> ADD
  ADD -->|"total > 0"| S3
  S3 --> F1040
```

---

## Edge Cases & Special Rules

1. **`total_gbc` override**: If `total_gbc` is provided, it replaces the sum of all component fields. This supports data imports where only the aggregate is available.

2. **Carryforwards and carrybacks are additive**: Even when `total_gbc` is provided as the pre-computed current-year credit, carryforward and carryback amounts are added on top — they represent separate prior/future year credits.

3. **Zero output when all fields are zero or absent**: If no credits are entered, no output is emitted to schedule3.

4. **The actual §38(c) limitation** (net income tax minus tentative minimum tax) is applied at the Schedule 3 level where all nonrefundable credits are aggregated and compared against the total tax liability. This input node passes the raw total.

5. **Component credits already captured by other nodes**: Individual component credit nodes (f5884 for Work Opportunity, f6765 for Research, f8826 for Disabled Access, f8881 for Pension Startup, f8882 for Childcare, f8941 for Health Insurance, f8874 for New Markets, f8908 for Energy Efficient Home, f7207 for Advanced Manufacturing) each route their credit amounts to schedule3 independently. The f3800 node captures amounts entered directly on the Drake 3800/GBC screens — typically used when the component form amounts are bundled.

6. **§6417 Elective Payment Election**: Some credits (clean energy, advanced manufacturing, etc.) under IRC §6417 may be treated as tax payments rather than credits. These flow through a different path (schedule3 additional payments) and are not captured here.

7. **Passive activity credit limits**: GBC from passive activities is subject to Form 8582-CR limitation. This engine trusts the entered amount as the allowed credit (post-8582-CR limitation applied externally).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 3800 Instructions | 2025 | All | https://www.irs.gov/instructions/i3800 | .research/docs/i3800.pdf |
| IRC §38 — General Business Credit | Current | §38(a)–(c) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section38 | N/A |
| IRC §39 — Carryback and Carryforward | Current | §39(a) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section39 | N/A |
| Schedule 3 (Form 1040) | 2025 | Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf | N/A |
