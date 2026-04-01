# Form 8582-CR — Passive Activity Credit Limitations

## Overview
Form 8582-CR limits the amount of passive activity credits (PAC) that can be claimed to offset regular tax. Mirrors Form 8582 (which handles passive losses) but applies to credits. The allowed credit flows to Schedule 3 (via Form 3800) which routes to line 7 (other nonrefundable credits). Unused credits carry forward indefinitely.

**IRS Form:** Form 8582-CR
**Drake Screen:** CR
**Node Type:** intermediate
**Tax Year:** 2025
**Drake Reference:** https://www.irs.gov/instructions/i8582cr

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| total_passive_credits | number >= 0 | yes | Total Passive Credits | All current-year passive activity credits from all sources (Part I, Line 5) | IRC §469(d)(2) | https://www.law.cornell.edu/uscode/text/26/469 |
| regular_tax_all_income | number >= 0 | yes | Regular Tax (All Income) | Regular tax computed on all income including passive | Form 8582-CR Part I Line 6 computation | https://www.irs.gov/instructions/i8582cr |
| regular_tax_without_passive | number >= 0 | yes | Regular Tax (Ex. Passive) | Regular tax computed on income excluding net passive income | Form 8582-CR Part I Line 6 computation | https://www.irs.gov/instructions/i8582cr |
| modified_agi | number >= 0 | no | Modified AGI | MAGI for Part II rental real estate phase-out calculation | IRC §469(i)(3) | https://www.law.cornell.edu/uscode/text/26/469 |
| is_real_estate_professional | boolean | no | Real Estate Professional | True if taxpayer qualifies as real estate professional per IRC §469(c)(7) | IRC §469(c)(7) | https://www.law.cornell.edu/uscode/text/26/469 |
| has_active_rental_participation | boolean | no | Active Participation | True if taxpayer actively participated in rental real estate activity | IRC §469(i)(6) | https://www.law.cornell.edu/uscode/text/26/469 |
| rental_real_estate_credits | number >= 0 | no | Rental RE Credits | Credits specifically from rental real estate with active participation (Part II) | IRC §469(i) | https://www.law.cornell.edu/uscode/text/26/469 |
| filing_status | enum(single, mfj, mfs, hoh, qw) | no | Filing Status | Filing status for MFS phase-out thresholds | IRC §469(i)(5) | https://www.law.cornell.edu/uscode/text/26/469 |
| prior_unallowed_credits | number >= 0 | no | Prior Year Unallowed | Unused PAC carryforward from prior years | IRC §469(b) | https://www.law.cornell.edu/uscode/text/26/469 |

---

## Calculation Logic

### Step 1 — Tax Attributable to Net Passive Income
tax_attributable_to_passive = regular_tax_all_income − regular_tax_without_passive
Source: Form 8582-CR instructions Part I, Line 6; IRC §469(d)(2)

### Step 2 — Total Passive Credits Available
total_credits_available = total_passive_credits + (prior_unallowed_credits ?? 0)

### Step 3 — Base Allowed Credit (against passive income tax)
base_allowed = min(total_credits_available, tax_attributable_to_passive)

### Step 4 — Special Allowance for Rental Real Estate (Part II)
If has_active_rental_participation = true AND is_real_estate_professional != true AND filing_status != MFS:
  Compute $25,000 special allowance credit limit (analogous to Form 8582 Part II):
  - If modified_agi <= $100,000: allowance = min(rental_real_estate_credits, $25,000 worth of credit)
  - Phase-out: reduce by 50% of MAGI over $100,000; zero at $150,000
  MFS filers who did not live apart all year: $0 special allowance (ineligible)
Source: IRC §469(i)(3)(B); Form 8582-CR Part II

### Step 5 — Total Allowed Credit
allowed_credit = min(total_credits_available, base_allowed + special_allowance_additional)
unallowed_credit = total_credits_available − allowed_credit

### Step 6 — Route Allowed Credit
Allowed credit flows to schedule3 line6z_general_business_credit (via Form 3800 conceptually)
Source: Form 8582-CR Part V; Form 3800

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | allowed_credit > 0 | IRC §469(d)(2); Form 3800 | https://www.irs.gov/instructions/i8582cr |

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
    A[total_passive_credits, regular_tax_all_income, regular_tax_without_passive, modified_agi, rental_real_estate_credits, filing_status, prior_unallowed_credits]
  end
  subgraph node["form8582cr"]
    B[tax_attributable = all_income_tax - ex_passive_tax]
    C[base_allowed = min(credits, tax_attributable)]
    D[special_allowance (rental RE Part II)]
    E[allowed_credit = base_allowed + special_allowance]
  end
  subgraph outputs["Downstream Nodes"]
    F[schedule3.line6z_general_business_credit]
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

1. **No passive credits**: If total_passive_credits = 0 and prior_unallowed_credits = 0, output nothing.
2. **Tax attributable can be zero**: If regular_tax_all_income = regular_tax_without_passive, no credit allowed from base computation (passive income tax = 0). Special allowance may still apply.
3. **MFS ineligible for special allowance**: filing_status = MFS → special allowance = $0 (conservative; assumes lived with spouse).
4. **Real estate professional bypass**: is_real_estate_professional = true → rental activity treated as nonpassive, flows outside PAC limitation.
5. **Credits exceed tax attributable**: Excess carries forward indefinitely per IRC §469(b).
6. **No modification for passive income**: Unlike Form 8582, Form 8582-CR does not reduce loss carryforwards; it reduces credit carryforwards.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8582-CR Instructions | 2024 | All parts | https://www.irs.gov/instructions/i8582cr | N/A |
| IRC §469 | current | Passive activity rules | https://www.law.cornell.edu/uscode/text/26/469 | N/A |
