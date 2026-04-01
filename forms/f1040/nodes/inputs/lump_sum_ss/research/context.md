# Lump-Sum SS — Lump-Sum Social Security Benefits Worksheet

## Overview
When a taxpayer receives a lump-sum Social Security payment covering multiple prior years, they may use the "lump-sum election" (IRS Pub 915 earlier year method) to reduce taxable benefits. The node captures the lump-sum data and computes net SS benefits for the current year, which routes to the ssa1099 node / f1040 line 6a for the taxable portion calculation.

**IRS Form:** No standalone form — Pub 915 Worksheet / SSA-1099 supplemental
**Drake Screen:** LSSA
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| total_ss_benefits_this_year | number >= 0 | yes | Box 5 Total | Total net SS/RRB benefits reported on SSA-1099 Box 5 this year (including lump sum) | IRS Pub 915 Worksheet 1 Line 1 | https://www.irs.gov/publications/p915 |
| lump_sum_amount | number >= 0 | yes | Lump Sum Amount | Total lump-sum payment received for prior years | IRS Pub 915 Worksheet 4 | https://www.irs.gov/publications/p915 |
| prior_year_benefits | array of {year: number, amount: number} | no | Prior Year Benefits | Benefits allocable to each prior year (for multi-year lump sums) | IRS Pub 915 Worksheet 2/3 | https://www.irs.gov/publications/p915 |
| is_lump_sum_election_beneficial | boolean | no | Election Beneficial Override | If provided, overrides computed determination; otherwise computed automatically | IRS Pub 915 | https://www.irs.gov/publications/p915 |

---

## Calculation Logic

### Step 1 — Current Year Net Benefits (excluding lump sum)
current_year_only = total_ss_benefits_this_year − lump_sum_amount
Source: IRS Pub 915 Worksheet 4, step to isolate current year vs prior year benefits

### Step 2 — Simplified Lump-Sum Election Check
The node computes a simplified check: is_beneficial = (lump_sum_amount > 0) AND (prior_year_benefits exist or election override is true).
The full Pub 915 comparison requires prior-year AGI data not available in this node; use is_lump_sum_election_beneficial flag for definitive determination.
Source: IRS Pub 915, "Earlier Year Method"

### Step 3 — Adjusted SS Benefits for Downstream Calculation
If election is beneficial (or is_lump_sum_election_beneficial = true):
  adjusted_ss_benefits = current_year_only  (lump sum excluded from current year — allocate to prior years)
Else:
  adjusted_ss_benefits = total_ss_benefits_this_year  (include all in current year)

### Step 4 — Route to f1040
adjusted_ss_benefits → f1040.line6a_ss_gross
Source: IRS Form 1040 instructions Line 6a; IRS Pub 915

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6a_ss_gross | f1040 | adjusted_ss_benefits > 0 | Pub 915; Form 1040 Line 6a | https://www.irs.gov/publications/p915 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| SS base amount (single/MFS) | $25,000 | IRC §86(c)(1)(A) | https://www.law.cornell.edu/uscode/text/26/86 |
| SS base amount (MFJ) | $32,000 | IRC §86(c)(1)(B) | https://www.law.cornell.edu/uscode/text/26/86 |
| SS 50% inclusion threshold | Tier 1 above base amount | IRC §86(a)(1) | https://www.law.cornell.edu/uscode/text/26/86 |
| SS 85% inclusion threshold | Above $34,000 (single) / $44,000 (MFJ) | IRC §86(a)(2) | https://www.law.cornell.edu/uscode/text/26/86 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    A[total_ss_benefits_this_year, lump_sum_amount, prior_year_benefits, is_lump_sum_election_beneficial]
  end
  subgraph node["lump_sum_ss"]
    B[current_year_only = total - lump_sum]
    C[election_beneficial? check]
    D[adjusted_ss = current_year_only OR total]
  end
  subgraph outputs["Downstream Nodes"]
    E[f1040.line6a_ss_gross]
  end
  A --> B
  B --> C
  C --> D
  D --> E
```

---

## Edge Cases & Special Rules

1. **lump_sum_amount = 0**: No lump sum, route total_ss_benefits_this_year as-is to f1040.
2. **lump_sum_amount > total_ss_benefits_this_year**: Invalid; throw error.
3. **No prior_year_benefits provided**: Cannot fully compute election benefit; use is_lump_sum_election_beneficial flag.
4. **Election not beneficial**: Use total_ss_benefits_this_year (all treated in current year).
5. **total_ss_benefits_this_year = 0**: No output; short-circuit.
6. **is_lump_sum_election_beneficial = false explicitly**: Always use total amount, never reduce.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Pub 915 | 2025 | Lump-Sum Election, Worksheet 4 | https://www.irs.gov/publications/p915 | N/A |
| IRC §86 | current | Taxability of SS benefits | https://www.law.cornell.edu/uscode/text/26/86 | N/A |
