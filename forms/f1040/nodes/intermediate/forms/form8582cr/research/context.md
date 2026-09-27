# Form 8582-CR — Passive Activity Credit Limitations

## Overview
Form 8582-CR limits passive activity credits. The current build pass calculates Parts I-IV and a native MeF descriptor serializes those lines. Worksheets 5-9 now allocate special allowances and the suspended balance by source identity in the pure calculation. Prior unallowed credits retain their originating tax year and source document. The node still deposits its allowed total directly in Schedule 3 line 6a. That is not the final filing route: each allowed business credit must enter its source form or Form 3800, then survive the Form 3800 tax limit. The node carryforward is still aggregate, and allowed versus suspended credit is not yet split by prior-year vintage. The calculation and native MeF cases are written but unrun.

**IRS Form:** Form 8582-CR
**Drake Screen:** CR
**Node Type:** intermediate
**Tax Year:** 2025
**Drake Reference:** https://www.irs.gov/instructions/i8582cr

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| credit_sources | array | yes | Activity credit sources | Each source identifies its activity, source form/document, Part I category, current-year amount, year-stamped prior unallowed credit rows, and PTP status | Form 8582-CR Worksheets 1-4 | https://www.irs.gov/instructions/i8582cr |
| credit_sources[].reporting_route | enum(form3800_line3, form3800_line24, form3800_line33, form8834) | yes | Credit filing destination | Retains the applicable Form 3800 passive-credit line or the separate Form 8834 route; no route is inferred from the source-form name | Form 8582-CR line 37; Form 3800 lines 3, 24, 33 | https://www.irs.gov/instructions/i8582cr |
| credit_sources[].prior_unallowed_credits[].actively_participated_origin_year | boolean | required for a prior ActiveRental worksheet-1 credit | Prior activity record | A prior rental credit enters Worksheet 1 only if active participation occurred both then and now; otherwise it must be a separate Other-category source | Form 8582-CR Worksheet 1 | https://www.irs.gov/instructions/i8582cr |
| regular_tax_all_income | number >= 0 | yes | Regular Tax (All Income) | Regular tax computed on all income including passive | Form 8582-CR Part I Line 6 computation | https://www.irs.gov/instructions/i8582cr |
| regular_tax_without_passive | number >= 0 | yes | Regular Tax (Ex. Passive) | Regular tax computed on income excluding net passive income | Form 8582-CR Part I Line 6 computation | https://www.irs.gov/instructions/i8582cr |
| modified_agi | number >= 0 | no | Modified AGI | MAGI for Part II rental real estate phase-out calculation | IRC §469(i)(3) | https://www.law.cornell.edu/uscode/text/26/469 |
| is_real_estate_professional | boolean | no | Real Estate Professional | True if taxpayer qualifies as real estate professional per IRC §469(c)(7) | IRC §469(c)(7) | https://www.law.cornell.edu/uscode/text/26/469 |
| form8582_line9_special_allowance_used | number >= 0 | required for active rental credit | Form 8582 line 9 | Dollar allowance already used by passive rental losses | Form 8582-CR line 13 | https://www.irs.gov/instructions/i8582cr |
| part_ii_tax_on_income_less_line14 | number >= 0 | required when line 14 is positive | Part II tax worksheet | Tax on taxable income after subtracting the line 14 dollar allowance | Form 8582-CR line 15 | https://www.irs.gov/instructions/i8582cr |
| part_iii_tax_on_income_less_line26 | number >= 0 | required when Part III line 26 is positive, unless the low-MAGI Part II shortcut applies | Part III tax worksheet | Tax on taxable income after subtracting line 26 | Form 8582-CR line 27 | https://www.irs.gov/instructions/i8582cr |
| part_iv_tax_on_income_less_remaining_allowance | number >= 0 | required when Part IV has remaining eligible credit and dollar allowance | Part IV tax worksheet | Tax on taxable income less $25,000 (or $12,500 MFS) minus Form 8582 line 9 | Form 8582-CR line 35 | https://www.irs.gov/instructions/i8582cr |
| mfs_lived_apart_all_year | boolean | required for MFS active rental credit | MFS lived-apart answer | Distinguishes the $75,000 threshold from ineligibility | Form 8582-CR lines 9 and 12 | https://www.irs.gov/instructions/i8582cr |
| filing_status | enum(single, mfj, mfs, hoh, qw) | no | Filing Status | Filing status for MFS phase-out thresholds | IRC §469(i)(5) | https://www.law.cornell.edu/uscode/text/26/469 |

---

## Calculation Logic

### Step 1 — Tax Attributable to Net Passive Income
tax_attributable_to_passive = regular_tax_all_income − regular_tax_without_passive
Source: Form 8582-CR instructions Part I, Line 6; IRC §469(d)(2)

### Step 2 — Total Passive Credits Available
total_credits_available = sum(source.current_year_credit + sum(source.prior_unallowed_credits[].credit_amount))

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
The build pass separately computes the rehabilitation/pre-1990 housing Part III and post-1989 housing Part IV tax limits. PTP credits still stop pending their per-partnership limitation instead of entering the ordinary worksheet.
Source: Form 8582-CR lines 8–16 and instructions.

### Step 5 — Total Allowed Credit
allowed_credit = min(total_credits_available, Part I line 6 + Part II line 16 + Part III line 30 + Part IV line 36)
unallowed_credit = total_credits_available − allowed_credit

Allocate lines 16, 30, and 36 proportionally within their respective Part I
source categories. Subtract those special allowances from each source balance,
then allocate the line 5 less line 37 suspended amount across the residual
balances. Per-source allowed credit is total less suspended credit. Exact
whole-dollar apportionment uses largest remainders and stable source order.

### Step 6 — Route Allowed Credit
The current node still routes Form 3800-designated credits directly to Schedule 3 line 6a; this is an open correctness gap. The pure calculation now totals allowed credit separately for Form 3800 lines 3, 24, and 33, and Form 8834. A positive Form 8834 route stops both node computation and MeF output until its separate tax limit and Schedule 3 line 6i handoff are wired. The intended general-business route is each calculated source-level allowed credit to Form 3800, then its separate limit and Schedule 3. The source allocations are not yet passed into that route or persisted as per-source carryforwards.
An unrun pure Form 3800 classifier now derives passive line pairs 2/3, 23/24, and 32/33 from the source allocations. It is not yet connected to the Form 3800 tax limit, MeF XML, or source columns in Parts III/IV.

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
3. **MFS special allowance**: MFS lived apart all year uses a $12,500 maximum and $75,000 MAGI threshold; MFS who lived with a spouse are ineligible. Their asserted active-rental credits move from Worksheet 1 to Worksheet 4.
4. **Prior active-rental credit**: A Worksheet 1 carryover requires active participation in the origin year as well as 2025. If the origin-year condition is false, the credit must be a separate Other-category source.
5. **Real estate professional**: taxpayer status alone is not enough; activity-level material participation is required before a credit is treated as nonpassive.
6. **Credits exceed tax attributable**: Excess carries forward indefinitely per IRC §469(b).
7. **No modification for passive income**: Unlike Form 8582, Form 8582-CR does not reduce loss carryforwards; it reduces credit carryforwards.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8582-CR Instructions | 2024 | All parts | https://www.irs.gov/instructions/i8582cr | N/A |
| IRC §469 | current | Passive activity rules | https://www.law.cornell.edu/uscode/text/26/469 | N/A |
