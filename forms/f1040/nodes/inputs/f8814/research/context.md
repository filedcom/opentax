# Form 8814 — Parents' Election To Report Child's Interest and Dividends

## Overview
Allows a parent to include a qualifying child's investment income on the parent's return (rather than filing a separate return for the child). One `f8814s` item per qualifying child. The included income flows to the parent's Form 1040 lines 2b (interest) and 3b (dividends). A small flat tax ($135 for TY2025) applies to the second-tier of income but is not yet routed in the current implementation.

**IRS Form:** 8814
**Drake Screen:** 8814
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14005

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| f8814s | ItemSchema[] | Yes | Children | Array of per-child income records; one entry per qualifying child | Form 8814 instructions | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| child_name | string | No | Child's name | Name of the qualifying child | Form 8814 Part I | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| child_ssn | string | No | Child's SSN | SSN of the qualifying child | Form 8814 Part I | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| interest_income | number (≥0) | No | Interest income | Child's taxable interest income (1099-INT boxes 1+3) | Form 8814 Line 1a | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| dividend_income | number (≥0) | No | Dividend income | Child's ordinary dividends (1099-DIV box 1a) | Form 8814 Line 2a | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| capital_gain_distributions | number (≥0) | No | Capital gain distributions | Child's capital gain distributions (1099-DIV box 2a) | Form 8814 Line 3 | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| alaska_pfd | number (≥0) | No | Alaska PFD | Alaska Permanent Fund Dividend | Form 8814 Line 2b note | https://www.irs.gov/pub/irs-pdf/i8814.pdf |

---

## Calculation Logic

### Step 1 — Total child income
`total = interest_income + dividend_income + capital_gain_distributions + alaska_pfd`
Source: Form 8814 Line 6 — https://www.irs.gov/pub/irs-pdf/i8814.pdf

### Step 2 — Below threshold check
If `total ≤ $1,350` (TY2025), no output is produced for this child (all income is tax-free).
Note: **current code uses $1,300 (TY2024 value)** — TY2025 is $1,350 per Rev Proc 2024-40 §3.
Source: IRC §1(g)(4)(A)(ii); Form 8814 Line 7 — https://www.irs.gov/pub/irs-pdf/i8814.pdf

### Step 3 — Included income
`included = max(0, total − $1,350)`
The first $1,350 of the child's unearned income is excluded from the parent's return.
Source: Form 8814 Line 12 instructions — https://www.irs.gov/pub/irs-pdf/i8814.pdf

### Step 4 — Route interest and dividend portions
- Interest: routed to `f1040.line2b_taxable_interest` if `total > $1,350`
- Dividends: routed to `f1040.line3b_ordinary_dividends` if `total > $1,350`
Source: Form 8814 Lines 12–15 — https://www.irs.gov/pub/irs-pdf/i8814.pdf

### Step 5 — Second-tier flat tax (implementation gap)
If `total > $1,350`: flat additional tax of $135 applies (10% × $1,350).
This tax is **computed but not currently routed** — should go to Schedule 2 line 17d (other taxes).
Source: IRC §1(g)(1); Form 8814 Line 15 — https://www.irs.gov/pub/irs-pdf/i8814.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line2b_taxable_interest | f1040 | total > $1,350 AND interest_income > 0 | Form 8814 Line 12; F1040 Line 2b | https://www.irs.gov/pub/irs-pdf/f1040.pdf |
| line3b_ordinary_dividends | f1040 | total > $1,350 AND dividend_income > 0 | Form 8814 Line 13; F1040 Line 3b | https://www.irs.gov/pub/irs-pdf/f1040.pdf |
| line17d_other_taxes (gap) | schedule2 | total > $1,350 | Form 8814 Line 15 → Sch 2 Line 17d | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf |
| line7_capital_gain (gap) | f1040 | capital_gain_distributions > 0 | Form 8814 Line 10; F1040 Line 7 | https://www.irs.gov/pub/irs-pdf/f1040.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| First-tier exclusion (base amount) | $1,350 | IRC §1(g)(4)(A)(ii); Rev Proc 2024-40 §3.16 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Second-tier upper threshold | $2,700 | IRC §1(g)(7)(B); Rev Proc 2024-40 §3.16 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Second-tier flat tax per child | $135 | 10% × $1,350; IRC §1(g)(1) | https://www.irs.gov/pub/irs-pdf/i8814.pdf |
| Child gross income limit for election | $11,000 | IRC §1(g)(7)(A); Rev Proc 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| **Code uses (TY2024 — needs update)** | $1,300 / $2,600 / $130 | Stale constants in index.ts | — |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry (per child)"]
    int["interest_income"]
    div["dividend_income"]
    cg["capital_gain_distributions"]
    pfd["alaska_pfd"]
  end
  subgraph node["f8814 (Parent Election)"]
    tot["totalIncome()"]
    inc["includedIncome()<br/>total − $1,350"]
    tax["childTierTax()<br/>$135 flat"]
  end
  subgraph outputs["Downstream Nodes"]
    f1040i["f1040<br/>line2b (interest)"]
    f1040d["f1040<br/>line3b (dividends)"]
    sch2["schedule2<br/>line17d (gap — not yet wired)"]
  end
  int & div & cg & pfd --> tot --> inc --> f1040i & f1040d
  tot --> tax --> sch2

---

## Edge Cases & Special Rules

1. **TY2025 constant bug**: Code uses $1,300/$2,600/$130 (TY2024). Correct TY2025 values are $1,350/$2,700/$135 per Rev Proc 2024-40 §3.16.
2. **Child tier tax not routed**: `childTierTax()` computes $135 per child but the result is discarded (`const _ = childTierTax(item)`). Should route to `schedule2.line17d_other_taxes`.
3. **Capital gain distributions not routed**: `capital_gain_distributions` is captured in schema but not emitted to `f1040.line7`. These should flow to Schedule D / F1040 line 7.
4. **Gross income limit**: If child's gross income (not just unearned) ≥ $11,000 (TY2025), the parent election is not allowed. Node does not enforce this — preparer responsibility.
5. **All-or-nothing election**: Once elected for a child, ALL of the child's unearned income must be reported on the parent's return (cannot cherry-pick).
6. **Multiple children**: Node accepts an array — one `f8814s` item per qualifying child. Outputs accumulate across all children.
7. **Child earned income**: The election only covers unearned income. Earned income (wages) is never included here.
8. **Alaska PFD**: Treated as dividend income for purposes of this form.
9. **MFS filers**: Married Filing Separately filers cannot use this election if they lived with their spouse at any time during the year.
10. **Kiddie tax interaction**: If the child's income exceeds $2,700 (TY2025), the excess is taxed at the parent's rate — this is handled separately by Form 8615 (Kiddie Tax), not Form 8814.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8814 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8814.pdf | .research/docs/i8814.pdf |
| IRC §1(g) — Kiddie Tax / Parent Election | current | §1(g)(1),(4),(7) | https://www.law.cornell.edu/uscode/text/26/1 | N/A |
| Rev Proc 2024-40 (TY2025 inflation adjustments) | 2024 | §3.16 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
| IRS Pub 929 — Tax Rules for Children and Dependents | 2024 | Chapter 2 | https://www.irs.gov/pub/irs-pdf/p929.pdf | .research/docs/p929.pdf |
