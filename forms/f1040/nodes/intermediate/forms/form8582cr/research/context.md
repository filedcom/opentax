# Form 8582-CR — Passive Activity Credit Limitations

## Overview
Form 8582-CR limits passive activity credits. The current node calculates a Part I and active-rental Part II slice, and a native MeF descriptor serializes those lines. The node still deposits its allowed total directly in Schedule 3 line 6a. That is not the final filing route: each allowed business credit must enter its source form or Form 3800, then survive the Form 3800 tax limit. Source-level allocation and Parts III/IV are still open. The current carryforward is aggregate, not yet by activity and credit identity. The native MeF cases are written but unrun.

**IRS Form:** Form 8582-CR
**Drake Screen:** CR
**Node Type:** intermediate
**Tax Year:** 2025
**Drake Reference:** https://www.irs.gov/instructions/i8582cr

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| credit_sources | array | yes | Activity credit sources | Each source identifies its activity, source form/document, Part I category, current-year amount, prior unallowed amount, and PTP status | Form 8582-CR Worksheets 1-4 | https://www.irs.gov/instructions/i8582cr |
| regular_tax_all_income | number >= 0 | yes | Regular Tax (All Income) | Regular tax computed on all income including passive | Form 8582-CR Part I Line 6 computation | https://www.irs.gov/instructions/i8582cr |
| regular_tax_without_passive | number >= 0 | yes | Regular Tax (Ex. Passive) | Regular tax computed on income excluding net passive income | Form 8582-CR Part I Line 6 computation | https://www.irs.gov/instructions/i8582cr |
| modified_agi | number >= 0 | no | Modified AGI | MAGI for Part II rental real estate phase-out calculation | IRC §469(i)(3) | https://www.law.cornell.edu/uscode/text/26/469 |
| is_real_estate_professional | boolean | no | Real Estate Professional | True if taxpayer qualifies as real estate professional per IRC §469(c)(7) | IRC §469(c)(7) | https://www.law.cornell.edu/uscode/text/26/469 |
| form8582_line9_special_allowance_used | number >= 0 | required for active rental credit | Form 8582 line 9 | Dollar allowance already used by passive rental losses | Form 8582-CR line 13 | https://www.irs.gov/instructions/i8582cr |
| part_ii_tax_on_income_less_line14 | number >= 0 | required when line 14 is positive | Part II tax worksheet | Tax on taxable income after subtracting the line 14 dollar allowance | Form 8582-CR line 15 | https://www.irs.gov/instructions/i8582cr |
| mfs_lived_apart_all_year | boolean | required for MFS active rental credit | MFS lived-apart answer | Distinguishes the $75,000 threshold from ineligibility | Form 8582-CR lines 9 and 12 | https://www.irs.gov/instructions/i8582cr |
| filing_status | enum(single, mfj, mfs, hoh, qw) | no | Filing Status | Filing status for MFS phase-out thresholds | IRC §469(i)(5) | https://www.law.cornell.edu/uscode/text/26/469 |

---

## Calculation Logic

### Step 1 — Tax Attributable to Net Passive Income
tax_attributable_to_passive = regular_tax_all_income − regular_tax_without_passive
Source: Form 8582-CR instructions Part I, Line 6; IRC §469(d)(2)

### Step 2 — Total Passive Credits Available
total_credits_available = sum(source.current_year_credit + source.prior_unallowed_credit)

### Step 3 — Base Allowed Credit (against passive income tax)
base_allowed = min(total_credits_available, tax_attributable_to_passive)

### Step 4 — Special Allowance for Rental Real Estate (Part II)
If active rental credits remain after the line 6 passive-income tax limit:
  - line 8 = min(active rental credits, line 7 remaining credits)
  - line 12 = min($25,000, 50% × max(0, $150,000 − MAGI)); MFS lived apart uses $12,500 and $75,000
  - line 14 = max(0, line 12 − Form 8582 line 9)
  - line 15 = tax on taxable income − tax on taxable income less line 14
  - line 16 = min(line 8, line 15)
The $25,000 figure is an income allowance, never a $25,000 credit. MFS filers who lived with a spouse have no Part II allowance. Real-estate-professional status alone does not reclassify every rental activity as nonpassive.
The current build stops rehabilitation, older housing, newer housing, and PTP categories pending their separate limitations instead of putting them through the active-rental computation.
Source: Form 8582-CR lines 8–16 and instructions.

### Step 5 — Total Allowed Credit
allowed_credit = min(total_credits_available, base_allowed + special_allowance_additional)
unallowed_credit = total_credits_available − allowed_credit

### Step 6 — Route Allowed Credit
The current node still routes directly to Schedule 3 line 6a; this is an open correctness gap. The intended route is source-level allowed credit to Form 3800 (or another applicable credit form), then its separate limit and Schedule 3.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6a_general_business_credit | schedule3 | allowed_credit > 0; current incomplete route | IRC §469(d)(2); Form 3800 | https://www.irs.gov/instructions/i8582cr |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Special allowance maximum (active rental RE) | $25,000 | IRC §469(i)(2) | https://www.law.cornell.edu/uscode/text/26/469 |
| Special allowance phase-out lower threshold | $100,000 MAGI | IRC §469(i)(3)(A) | https://www.law.cornell.edu/uscode/text/26/469 |
| Special allowance phase-out upper threshold | $150,000 MAGI | IRC §469(i)(3)(A) | https://www.law.cornell.edu/uscode/text/26/469 |
| Phase-out rate | 50% | IRC §469(i)(3)(B) | https://www.law.cornell.edu/uscode/text/26/469 |
| MFS special allowance maximum | $12,500 | IRC §469(i)(5)(B) | https://www.law.cornell.edu/uscode/text/26/469 |
| MFS phase-out lower threshold | $50,000 MAGI | IRC §469(i)(5)(B) | https://www.law.cornell.edu/uscode/text/26/469 |
| MFS phase-out upper threshold | $75,000 MAGI | IRC §469(i)(5)(B) | https://www.law.cornell.edu/uscode/text/26/469 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Upstream Inputs"]
    A[credit_sources, regular_tax_all_income, regular_tax_without_passive, modified_agi, filing_status]
  end
  subgraph node["form8582cr"]
    B[tax_attributable = all_income_tax - ex_passive_tax]
    C[base_allowed = min(credits, tax_attributable)]
    D[special_allowance (rental RE Part II)]
    E[allowed_credit = base_allowed + special_allowance]
  end
  subgraph outputs["Downstream Nodes"]
    F[schedule3.line6a_general_business_credit - current incomplete route]
  end
  A --> B
  B --> C
  A --> D
  C --> E
  D --> E
  E --> F
```

---

## Edge Cases & Special Rules

1. **No passive credits**: If `credit_sources` is empty, output nothing.
2. **Tax attributable can be zero**: If regular_tax_all_income = regular_tax_without_passive, no credit allowed from base computation (passive income tax = 0). Special allowance may still apply.
3. **MFS special allowance**: MFS lived apart all year uses a $12,500 maximum and $75,000 MAGI threshold; MFS who lived with a spouse are ineligible.
4. **Real estate professional**: taxpayer status alone is not enough; activity-level material participation is required before a credit is treated as nonpassive.
5. **Credits exceed tax attributable**: Excess carries forward indefinitely per IRC §469(b).
6. **No modification for passive income**: Unlike Form 8582, Form 8582-CR does not reduce loss carryforwards; it reduces credit carryforwards.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8582-CR Instructions | 2024 | All parts | https://www.irs.gov/instructions/i8582cr | N/A |
| IRC §469 | current | Passive activity rules | https://www.law.cornell.edu/uscode/text/26/469 | N/A |
