# Form 8283 — Noncash Charitable Contributions

## Overview
Captures noncash charitable contribution data for deduction on Schedule A. Section A covers items valued $501–$5,000 each (no qualified appraisal required except for closely held stock >$10,000). Section B covers items >$5,000 each (qualified appraisal required, except publicly traded securities). The total FMV flows to Schedule A line 12. For capital gain property in Section B, the deduction is limited to cost/adjusted basis.

**IRS Form:** 8283
**Drake Screen:** 8283
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14012

---

## Input Fields

**Section A items (≤$5,000 each):**

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| section_a_items | SectionAItem[] | No | Section A contributions | Items valued $501–$5,000 each | Form 8283 Section A | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| property_description | string | No | Property description | Description of donated property | Form 8283 Section A col (a) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| date_acquired | string (ISO) | No | Date acquired | When donor acquired the property | Form 8283 Section A col (b) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| date_contributed | string (ISO) | No | Date contributed | Date of donation | Form 8283 Section A col (c) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| fmv | number (≥0) | No | Fair market value | FMV at date of contribution | Form 8283 Section A col (e) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| fmv_method | FMVMethod enum | No | How FMV determined | Method: appraisal, thrift_shop_value, catalog_value, comparable_sales, formula, other | Form 8283 Section A col (f) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| cost_or_adjusted_basis | number (≥0) | No | Cost basis | Donor's cost or adjusted basis | Form 8283 Section A col (g) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| is_vehicle | boolean | No | Is vehicle | True if donated property is a motor vehicle (car, boat, airplane) | Form 8283 instructions | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| vehicle_1098c_received | boolean | No | 1098-C received | True if Form 1098-C received from donee organization for vehicle | Form 8283 / Form 1098-C | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| is_clothing_household | boolean | No | Clothing/household | True if item is clothing or household goods (must be good used condition+) | Form 8283 instructions | https://www.irs.gov/pub/irs-pdf/i8283.pdf |

**Section B items (>$5,000 each — qualified appraisal required):**

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| section_b_items | SectionBItem[] | No | Section B contributions | Items valued >$5,000 requiring qualified appraisal | Form 8283 Section B | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| property_description | string | No | Property description | Description of donated property | Form 8283 Section B col (a) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| date_acquired | string (ISO) | No | Date acquired | When donor acquired the property | Form 8283 Section B col (b) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| date_contributed | string (ISO) | No | Date contributed | Date of donation | Form 8283 Section B col (c) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| fmv | number (≥0) | No | Fair market value | FMV per qualified appraisal | Form 8283 Section B col (e) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| cost_or_adjusted_basis | number (≥0) | No | Cost basis | Donor's adjusted basis | Form 8283 Section B col (g) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| appraiser_name | string | No | Appraiser name | Qualified appraiser's name | Form 8283 Section B Part III | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| appraisal_date | string (ISO) | No | Appraisal date | Date of appraisal (must be within 60 days before/on donation date) | Form 8283 Section B | https://www.irs.gov/pub/irs-pdf/i8283.pdf |
| is_capital_gain_property | boolean | No | Capital gain property | True if property would have generated long-term capital gain if sold | Form 8283 Section B; IRC §170(e) | https://www.irs.gov/pub/irs-pdf/i8283.pdf |

---

## Calculation Logic

### Step 1 — Section A total
`sectionA = Σ item.fmv for all section_a_items`
Source: Form 8283 Section A total line — https://www.irs.gov/pub/irs-pdf/i8283.pdf

### Step 2 — Section B FMV per item (capital gain property adjustment)
For each Section B item:
- If `is_capital_gain_property = true`: `effectiveFMV = min(fmv, cost_or_adjusted_basis)` per IRC §170(e)(1)
- Otherwise: `effectiveFMV = fmv`
Source: IRC §170(e)(1)(A); Form 8283 Section B instructions — https://www.irs.gov/pub/irs-pdf/i8283.pdf

### Step 3 — Section B total
`sectionB = Σ effectiveFMV for all section_b_items`

### Step 4 — Route to Schedule A
`total = sectionA + sectionB`
If total > 0: emit to `schedule_a.line_12_noncash_contributions`
Source: Schedule A Line 12 — https://www.irs.gov/pub/irs-pdf/f1040sa.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line_12_noncash_contributions | schedule_a | total > 0 | Schedule A Line 12 | https://www.irs.gov/pub/irs-pdf/f1040sa.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Section A lower threshold (reporting required) | >$500 total | IRC §170(f)(11)(A); statutory | https://www.law.cornell.edu/uscode/text/26/170 |
| Section B appraisal threshold (per item) | >$5,000 | IRC §170(f)(11)(C); statutory | https://www.law.cornell.edu/uscode/text/26/170 |
| Closely held stock Section B threshold | >$10,000 | IRC §170(f)(11)(C); statutory | https://www.law.cornell.edu/uscode/text/26/170 |
| Vehicle deduction limit without 1098-C | $500 | IRC §170(f)(12)(A); statutory | https://www.law.cornell.edu/uscode/text/26/170 |
| AGI limit — 50% charities (cash equivalent) | 60% of AGI | IRC §170(b)(1)(G); TCJA §11023 | https://www.law.cornell.edu/uscode/text/26/170 |
| AGI limit — 50% charities (capital gain prop) | 30% of AGI | IRC §170(b)(1)(C); statutory | https://www.law.cornell.edu/uscode/text/26/170 |
| AGI limit — 30% charities | 30% of AGI | IRC §170(b)(1)(B); statutory | https://www.law.cornell.edu/uscode/text/26/170 |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    secA["section_a_items[]\n(FMV ≤$5k each)"]
    secB["section_b_items[]\n(FMV >$5k, appraisal req'd)"]
  end
  subgraph node["f8283 (Noncash Contributions)"]
    totA["totalSectionA()"]
    adjB["sectionBFMV() — cap at basis\nfor capital gain prop"]
    totB["totalSectionB()"]
    tot["total = A + B"]
  end
  subgraph outputs["Downstream Nodes"]
    schA["schedule_a\nline_12_noncash_contributions"]
  end
  secA --> totA --> tot
  secB --> adjB --> totB --> tot
  tot --> schA

---

## Edge Cases & Special Rules

1. **$500 threshold**: Noncash contributions ≤$500 total do not require Form 8283 (no reporting). Items $501–$5,000 go to Section A; >$5,000 go to Section B.
2. **Clothing/household goods condition**: Must be in good used condition or better. If FMV ≤$500 and condition is poor, the deduction may be disallowed (IRC §170(f)(16)).
3. **Vehicle deduction (is_vehicle = true)**: If the donating charity sells the vehicle without significant use, the deduction is limited to gross proceeds from the sale (reported on Form 1098-C). If no 1098-C, deduction capped at $500.
4. **Capital gain property — 30% AGI limit**: If `is_capital_gain_property = true` and donated to a 50% charity, the deduction is limited to 30% of AGI. The node does not compute AGI limits; Schedule A handles this.
5. **Section B appraisal timing**: The qualified appraisal must be made no earlier than 60 days before the donation and no later than the tax return due date (including extensions).
6. **Publicly traded securities — Section B exception**: Publicly traded securities >$5,000 do not require a qualified appraisal (Section B still required but appraiser fields optional).
7. **Art contribution >$20,000**: IRS may request a copy of the qualified appraisal. Out of scope for this node.
8. **Conservation easements**: Subject to special substantiation and reporting rules. Treated as capital gain property; 50% AGI limit applies (IRC §170(b)(1)(E)).
9. **Carryover**: Contributions that exceed AGI limits may be carried forward 5 years. Form 8283 does not track carryovers; Schedule A handles the deduction ceiling.
10. **Multiple forms**: The node accepts unlimited items in both section_a_items and section_b_items. IRS allows multiple Form 8283 pages.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8283 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8283.pdf | .research/docs/i8283.pdf |
| IRC §170 — Charitable Contributions | current | §170(b),(e),(f)(11–12) | https://www.law.cornell.edu/uscode/text/26/170 | N/A |
| IRS Pub 526 — Charitable Contributions | 2024 | All | https://www.irs.gov/pub/irs-pdf/p526.pdf | .research/docs/p526.pdf |
| IRS Pub 561 — Determining Value of Donated Property | 2024 | All | https://www.irs.gov/pub/irs-pdf/p561.pdf | .research/docs/p561.pdf |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
