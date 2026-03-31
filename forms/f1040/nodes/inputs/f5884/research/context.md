# Form 5884 — Work Opportunity Credit

## Overview

Form 5884 computes the Work Opportunity Tax Credit (WOTC) for employers who hire employees from one of ten federally designated target groups (TANF recipients, veterans, ex-felons, SNAP recipients, etc.). The credit is a percentage of qualified first-year wages (and second-year wages for long-term family assistance recipients), subject to wage caps that vary by target group.

"Qualified wages" means wages (as defined in IRC §51(c)) paid or incurred by the employer to a qualified individual for services rendered in the employer's trade or business. Wages paid during the 1-year period beginning on the hire date count as first-year wages; for LTFA, wages from the 2nd year of employment also qualify.

The computed credit flows to Form 3800 (General Business Credit) and then to Schedule 3, Line 6z on the Form 1040. In the node architecture, the Form 3800 intermediate step is collapsed: this node outputs directly to `schedule3.line6z_general_business_credit`.

The WOTC is a non-refundable general business credit. It is subject to the passive activity rules and at-risk rules. Any unused credit may be carried back 1 year and forward 20 years via Form 3800.

**IRS Form:** 5884
**Drake Screen:** WOTC (Work Opportunity Credit — accessed via Credits menu)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14765

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `f5884s` | array of items | Yes | Array of employee credit entries | One entry per employee or employee group. Must have at least one item. | Form 5884, Lines 1a–1e | https://www.irs.gov/instructions/i5884 |
| `f5884s[].target_group` | enum (TargetGroup) | Yes | Target group code (1–10) | Which of the ten statutory target groups the employee belongs to. | IRC §51(d) | https://www.irs.gov/instructions/i5884 |
| `f5884s[].first_year_wages` | number ≥ 0 | Yes | Qualified first-year wages | Wages paid during the employee's first year of employment (starting on hire date). Subject to group-specific caps. | IRC §51(b)(1) | https://www.irs.gov/instructions/i5884 |
| `f5884s[].second_year_wages` | number ≥ 0 | No | Qualified second-year wages | Only applicable to long-term family assistance (LTFA) recipients (Group 9). Wages from the 2nd year of employment, capped at $10,000. | IRC §51(e) | https://www.irs.gov/instructions/i5884 |
| `f5884s[].hours_worked` | number ≥ 0 | No | Hours worked in first year | Determines which credit rate applies: <120 = no credit, 120–399 = 25%, ≥400 = 40%. Not used for LTFA group. Defaults to 0 if omitted (produces no credit). | IRC §51(i)(3) | https://www.irs.gov/instructions/i5884 |
| `f5884s[].is_disabled_veteran` | boolean | No | Disabled veteran flag | If true and target_group is VeteranFoodStamp, applies $12,000 wage cap instead of $6,000. Service-connected disability; hired within 1 year of discharge. Overridden by is_disabled_veteran_long_term. | IRC §51(d)(3)(A)(ii) | https://www.irs.gov/instructions/i5884 |
| `f5884s[].is_disabled_veteran_long_term` | boolean | No | Long-term disabled/unemployed veteran flag | If true, applies $14,000 wage cap. Covers disabled veterans discharged ≥6 months prior OR veterans unemployed ≥6 months. Takes precedence over is_disabled_veteran. | IRC §51(d)(3)(A)(iii)–(iv) | https://www.irs.gov/instructions/i5884 |

### TargetGroup Enum Values

| Code | Name | IRS Label | Wage Cap (1st yr) | Notes |
| ---- | ---- | --------- | ----------------- | ----- |
| `"1"` | TanfRecipient | IV-A (TANF) recipients | $6,000 | Member of family receiving IV-A assistance for any 9 months of 18-month period ending on hiring date |
| `"2"` | VeteranFoodStamp | Veterans (SNAP/food stamp) | $6,000 / $12,000 / $14,000 | Cap varies by is_disabled_veteran / is_disabled_veteran_long_term flags |
| `"3"` | ExFelon | Ex-felons | $6,000 | Hired within 1 year of conviction or release from prison; low-income test also applies |
| `"4"` | DesignatedCommunityResident | Designated community residents | $6,000 | Age 18–39, lives in empowerment zone or rural renewal county on hiring date |
| `"5"` | VocationalRehabilitation | Vocational rehabilitation referrals | $6,000 | Referred by state vocational rehabilitation agency, Employment Network (Ticket to Work), or DVA program |
| `"6"` | SummerYouth | Summer youth employees | $3,000 | Age 16–17, lives in empowerment zone, employed between May 1 and Sep 15 |
| `"7"` | SnapRecipient | SNAP recipients | $6,000 | Age 18–39, receiving food stamps for 6 months (or 3 of 5 months) before hire date |
| `"8"` | SsiRecipient | SSI recipients | $6,000 | Receiving SSI benefits for any month ending within 60 days before hire date |
| `"9"` | LongTermFamilyAssistance | Long-term family assistance recipients | $10,000/yr (2 yrs) | Family receiving TANF for at least 18 consecutive months; 2-year credit window |
| `"10"` | LongTermUnemployment | Long-term unemployment recipients | $6,000 | Certified as unemployed for ≥27 consecutive weeks before hire; received state/federal unemployment compensation |

---

## Calculation Logic

### Step 1 — Classify each employee entry
For each entry in `f5884s`, determine the applicable wage cap and credit rate based on `target_group`, `hours_worked`, and veteran subcategory flags.

### Step 2 — Apply wage cap
Cap `first_year_wages` at the group-specific limit:
- SummerYouth (Group 6): cap = $3,000
- LongTermFamilyAssistance (Group 9): cap = $10,000 per year (applied separately to first and second year)
- VeteranFoodStamp with `is_disabled_veteran_long_term = true`: cap = $14,000
- VeteranFoodStamp with `is_disabled_veteran = true` (and long_term is false): cap = $12,000
- All other groups: cap = $6,000

### Step 3 — Determine credit rate

For all groups EXCEPT LongTermFamilyAssistance (including SummerYouth):
- `hours_worked < 120`: rate = 0% — no credit (IRC §51(i)(3))
- `120 ≤ hours_worked < 400`: rate = 25% — Form 5884, Line 1b
- `hours_worked ≥ 400`: rate = 40% — Form 5884, Line 1a

Summer youth (Group 6) uses the same hours thresholds and rates as other standard groups,
but their wages are reported on Form 5884, Line 1c (separate line to apply the $3,000 cap)
rather than Line 1a or 1b. The rate logic is identical.

For LongTermFamilyAssistance (IRC §51(e)) — hours NOT considered:
- First year: 40% of wages capped at $10,000 → max credit $4,000 (Form 5884, Line 1d)
- Second year: 50% of wages capped at $10,000 → max credit $5,000 (Form 5884, Line 1e)
- `hours_worked` is ignored entirely for this group

### Step 4 — Compute per-employee credit

Standard groups (not LTFA):
```
employeeCredit = min(first_year_wages, wageCap) × rate
```

LTFA (Group 9):
```
employeeCredit = min(first_year_wages, 10000) × 0.40
              + min(second_year_wages ?? 0, 10000) × 0.50
```

### Step 5 — Aggregate
Sum all per-employee credits → `totalCredit` (equivalent to Form 5884, Line 2).

Pass-through credits from partnerships/S corps/trusts (Form 5884, Line 3) are not modeled
in this node. Those amounts arrive via K-1 input nodes.

### Step 6 — Route to Schedule 3
If `totalCredit > 0`, emit output to `schedule3.line6z_general_business_credit`.
If `totalCredit <= 0`, emit no outputs.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line6z_general_business_credit` | schedule3 | total credit > 0 | Form 5884 Line 4 → Form 3800 → Schedule 3 Line 6z | https://www.irs.gov/instructions/i1040s3 |

**Note:** In the actual IRS workflow, Form 5884 Line 4 feeds Form 3800 (General Business Credit, Line 4), which then populates Schedule 3 Line 6z. This node collapses the Form 3800 intermediate computation and routes directly to schedule3 — consistent with other general business credit nodes in this codebase (f6478, f6765, f7207).

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Standard wage cap (Groups 1, 3–5, 7–8, 10) | $6,000 | IRC §51(b)(3) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Summer youth wage cap (Group 6) | $3,000 | IRC §51(d)(7)(B) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| LTFA first-year wage cap (Group 9) | $10,000 | IRC §51(e)(1) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| LTFA second-year wage cap (Group 9) | $10,000 | IRC §51(e)(2) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Disabled veteran wage cap (service-connected, hired ≤1 yr of discharge) | $12,000 | IRC §51(d)(3)(A)(ii) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Disabled veteran long-term / unemployed ≥6 months wage cap | $14,000 | IRC §51(d)(3)(A)(iii)–(iv) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Credit rate — 120 to 399 hours worked | 25% | IRC §51(a) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Credit rate — 400+ hours worked | 40% | IRC §51(a) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Credit rate — LTFA first year | 40% | IRC §51(e)(1) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Credit rate — LTFA second year | 50% | IRC §51(e)(2) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| Minimum hours for any credit (non-LTFA) | 120 hours | IRC §51(i)(3) | https://www.irs.gov/pub/irs-pdf/i5884.pdf |
| No TY2025 inflation adjustments to WOTC | N/A | Rev. Proc. 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |

All dollar amounts and percentages are set directly by IRC §51 and are NOT inflation-indexed.
Rev. Proc. 2024-40 (TY2025 inflation adjustments) confirms no WOTC-specific changes.

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per employee)"]
    A[target_group\nenum 1–10]
    B[first_year_wages\nnumber]
    C[second_year_wages\nnumber, LTFA only]
    D[hours_worked\nnumber]
    E[is_disabled_veteran\nbool]
    F[is_disabled_veteran_long_term\nbool]
  end

  subgraph node["f5884 — Work Opportunity Credit"]
    G[wageCap\nper group + veteran flags]
    H[standardRate\n0% / 25% / 40%\nbased on hours]
    I[employeeCredit\nper-item calculation]
    J[totalCredit\nsum all entries]
  end

  subgraph outputs["Downstream Nodes"]
    K[schedule3\nline6z_general_business_credit]
  end

  A --> G
  B --> I
  C --> I
  D --> H
  E --> G
  F --> G
  G --> I
  H --> I
  I --> J
  J -->|credit > 0| K
```

---

## Edge Cases & Special Rules

### Hours Threshold — Default to Zero
An employee working fewer than 120 hours generates zero credit — even if wages were paid.
The `hours_worked` field defaults to 0 if omitted, which correctly produces no credit for
non-LTFA groups. Always provide `hours_worked` for non-LTFA employees.

### LTFA Ignores Hours Worked
Long-term family assistance (Group 9) is exempt from the hours-worked test entirely.
IRC §51(e) establishes fixed rates (40% year 1, 50% year 2) regardless of hours. The node
bypasses `standardRate()` entirely for this group.

### Veteran Wage Caps — Three Tiers
Veterans (Group 2) have three possible wage caps depending on subcategory:
- Basic (SNAP/food stamp, no disability): $6,000 — omit or set both flags to false
- Disabled veteran, hired within 1 year of discharge: $12,000 — set `is_disabled_veteran: true`
- Disabled veteran ≥6 months post-discharge, OR unemployed ≥6 months: $14,000 — set `is_disabled_veteran_long_term: true`

The `is_disabled_veteran_long_term` flag takes precedence over `is_disabled_veteran`.

Note: IRC §51(d)(3) also defines a "veteran unemployed ≥4 weeks but <6 months" subcategory
with a $6,000 cap (same as basic). The codebase models this as VeteranFoodStamp without
either flag set.

### Summer Youth Timing (Not Enforced)
Summer youth employees (Group 6) must be employed between May 1 and September 15 of the
calendar year. This is a certification/eligibility constraint handled before data entry.
The node does not validate dates.

### WOTC Pre-Certification Required (Form 8850)
Employers must receive written certification from their State Workforce Agency (SWA) before
(or by the 28th day after) hire. Form 8850 is the pre-screening notice submitted to the SWA.
This is a filing prerequisite, not a field on Form 5884. The node assumes certification is
already obtained.

### Pass-Through Credits (Form 5884, Line 3)
Credits flowing from partnerships, S corps, cooperatives, estates, and trusts (via Schedule
K-1) appear on Form 5884, Line 3. This node only covers credits directly computed by the
employer. K-1 pass-throughs are handled in K-1 input nodes.

### Form 3800 Intermediate Collapsed
Actual IRS flow: Form 5884 Line 4 → Form 3800 Line 4 → Schedule 3 Line 6z.
This node collapses Form 3800, routing directly to schedule3. Consistent with f6478, f6765,
f7207 and all other general business credit input nodes in this codebase.

### Taxable vs. Tax-Exempt Employers
Form 5884 is for taxable employers only. Tax-exempt organizations hiring qualified veterans
use Form 5884-C, which credits against payroll taxes (not income tax). Form 5884-C is a
separate node.

### At-Risk and Passive Activity Limitations
These limitations apply downstream at the Form 3800 / Schedule 3 level. This node computes
the gross credit without limitation.

### Carryback / Carryforward
Unused credit may be carried back 1 year or forward 20 years via Form 3800. This node
computes the current-year credit only; carry amounts are managed in Form 3800.

### Aggregation Rules (IRC §52)
Controlled groups and businesses under common control compute WOTC on an aggregate basis and
then allocate among members. The node accepts pre-allocated wage inputs — aggregation is a
pre-entry determination.

### Wage Reduction (IRC §280C)
The employer's otherwise allowable deduction for wages is reduced by the amount of the WOTC
credit claimed (IRC §280C(a)). This wage reduction occurs on the business return (Schedule C,
E, or F) — it is not computed within this node.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 5884 (Rev. March 2024) | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f5884.pdf | docs/f5884.pdf |
| IRS Instructions for Form 5884 (Rev. March 2024) | 2024 | All | https://www.irs.gov/pub/irs-pdf/i5884.pdf | docs/i5884.pdf |
| IRC §51 — Amount of credit | 2025 | §51(a)–(i) | https://www.law.cornell.edu/uscode/text/26/51 | N/A |
| IRC §52 — Special rules (controlled groups) | 2025 | §52 | https://www.law.cornell.edu/uscode/text/26/52 | N/A |
| IRC §280C(a) — Wage deduction reduction | 2025 | §280C(a) | https://www.law.cornell.edu/uscode/text/26/280C | N/A |
| IRC §38(b)(2) — General Business Credit | 2025 | §38(b)(2) | https://www.law.cornell.edu/uscode/text/26/38 | N/A |
| Rev. Proc. 2024-40 — TY2025 inflation adjustments | 2024 | All | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | docs/rp-24-40.pdf |
| IRS Instructions for Schedule 3 (Form 1040) | 2025 | Line 6z | https://www.irs.gov/instructions/i1040s3 | N/A |
| DOL WOTC Program Overview | 2025 | All | https://www.dol.gov/agencies/eta/wotc | N/A |
