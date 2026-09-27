# Schedule 2 — Additional Taxes

## Overview
For TY2025, Schedule 2 Part I line 3 flows to Form 1040 line 17, while Part II line 21 flows to Form 1040 line 23. The node aggregates precomputed upstream tax amounts and separately classifies Part II chapter 1 amounts for the Form 8978 reporting-year limitation. The narrower W-2/1099 examples below describe only a subset of the current node.

The [2025 Schedule 2](https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf) and local MeF v5.4 `IRS1040Schedule2.xsd` specify lines 1d-1f and 19 for Form 4255. The scoped row-facts model now derives these only from Form 4255 Part I rows 1d and 2a, and the MeF/PDF builders require that source. The former ambiguous generic Form 4255 line 17a shortcut was removed. Other credit-recapture types and installment-sale interest on lines 14-15 still need separate source routes. Line 19 stays unclassified for the Form 8978 chapter-1 offset pending authority.

The 2025 PDF descriptor now maps already-modeled lines 9, 13, 16, 17b/c/e/f/h/k/p, and 20 to their AcroForm fields. Lines 13, 17h, and 17k sum their existing W-2 and information-return inputs for the printed form. The filled PDF and full test batch still need verification.

### 2025 printed-line audit, build pass only

The [2025 printed form](https://www.irs.gov/pub/irs-pdf/f1040s2.pdf)
contains additional lines that the current aggregator does not derive from
source facts. A generic amount on line 17z is not a substitute for these
specific lines. This inventory is a scope boundary, not a claim that the
unlisted calculation and MeF business rules have been verified.

| Printed line | Current source status | Next source work |
| --- | --- | --- |
| 1y | No typed source route | Identify each permitted other-addition source and its required statement before routing to line 1y. |
| 14, 15 | No installment-interest source route | Derive from the underlying sale and payment facts, then map the two distinct interest lines. |
| 17g, 17i, 17j, 17l, 17m, 17n, 17o | No dedicated source routes | Add each applicable tax's form or transaction facts, source-specific calculation, and MeF detail. |
| 17q | No section 1294 termination route from Form 8621 line 24 | Establish the election and deferred-tax ledger before calculating and reporting termination interest. |

Line 10 is reserved, and line 20 is deliberately excluded from line 21 by
the printed form's addition instruction. The current modeled lines and the
Form 8978 chapter 1 classification still need the single full validation
batch, including local XSD and business-rule review.

**IRS Form:** Schedule 2 (Form 1040)
**Drake Screen:** Screen "5"
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com (screen code "5" maps to Schedule 2)

---

## Input Fields
Fields received from upstream NodeOutput objects.

| Field | Type | Source Node | Description | IRS Reference | URL |
| ----- | ---- | ----------- | ----------- | ------------- | --- |
| `uncollected_fica` | number (nonneg) | w2 | Uncollected SS+Medicare tax on tips (Box 12 codes A+B) | Schedule 2 Line 13 | .research/docs/f1040s2.pdf |
| `uncollected_fica_gtl` | number (nonneg) | w2 | Uncollected SS+Medicare on group-term life ins >$50k (Box 12 codes M+N) | Schedule 2 Line 13 | .research/docs/f1040s2.pdf |
| `golden_parachute_excise` | number (nonneg) | w2 | 20% excise on excess golden parachute payments (Box 12 code K) | Schedule 2 Line 17k | .research/docs/f1040s2.pdf |
| `section409a_excise` | number (nonneg) | w2 | §409A additional income tax on NQDC amounts (Box 12 code Z) | Schedule 2 Line 17h | .research/docs/f1040s2.pdf |
| `line17k_golden_parachute_excise` | number (nonneg) | f1099nec | 20% excise on excess golden parachute (box3 × 20%) | Schedule 2 Line 17k | .research/docs/f1040s2.pdf |
| `line17h_nqdc_tax` | number (nonneg) | f1099m | §409A additional income tax on NQDC failure (box15 × 20%) | Schedule 2 Line 17h | .research/docs/f1040s2.pdf |

---

## Calculation Logic

### Step 1 — Line 13: Uncollected SS/Medicare on tips and GTL
Line 13 = `uncollected_fica` + `uncollected_fica_gtl`

Both come from W-2 Box 12:
- Codes A and B: uncollected SS tax and Medicare tax on tips
- Codes M and N: uncollected SS tax and Medicare tax on group-term life insurance cost

> **Source:** IRS Schedule 2 (Form 1040), Line 13, "Uncollected social security and Medicare or RRTA tax on tips or group-term life insurance" — .research/docs/f1040s2.pdf

### Step 2 — Line 17h: §409A additional income tax
Line 17h = `section409a_excise` + `line17h_nqdc_tax`

Both represent the 20% additional income tax imposed under IRC §409A on nonqualified deferred compensation plans that fail §409A requirements. Pre-calculated by upstream nodes at 20% of the includible NQDC amount. This is included in the Form 8978 chapter 1 tax classification, unlike the section 4999 golden-parachute excise tax.

> **Source:** IRC §409A(a)(1)(B); IRS Schedule 2 Line 17h — .research/docs/f1040s2.pdf

### Step 3 — Line 17k: Golden parachute excise tax
Line 17k = `golden_parachute_excise` + `line17k_golden_parachute_excise`

Both represent the 20% excise tax imposed under IRC §4999 on excess parachute payments. Pre-calculated by upstream nodes at 20% of the parachute payment amount.

> **Source:** IRC §4999; IRS Schedule 2 Line 17k — .research/docs/f1040s2.pdf

### Step 4 — Part II example subtotal
The W-2/1099 example subtotal is line13 + line17h + line17k. It is only part of Schedule 2 line 21, which flows to Form 1040 line 23. Part I line 3 separately flows to Form 1040 line 17.

---

## Output Routing

| Output Field | Destination Node | Line / Field | Condition | IRS Reference | URL |
| ------------ | ---------------- | ------------ | --------- | ------------- | --- |
| `line17_additional_taxes` | f1040 | Line 17 | Part I line 3 > 0 | Form 1040 Line 17 | https://www.irs.gov/pub/irs-prior/f1040--2025.pdf |
| `line23_other_taxes` | f1040 | Line 23 | Part II line 21 > 0 | Form 1040 Line 23 | https://www.irs.gov/pub/irs-prior/f1040--2025.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| §409A additional-tax rate | 20% (statutory) | IRC §409A(a)(1)(B) | https://www.law.cornell.edu/uscode/text/26/409A |
| Golden parachute excise rate | 20% (statutory) | IRC §4999 | https://www.law.cornell.edu/uscode/text/26/4999 |

No inflation-adjusted constants apply to these lines in TY2025.

---

## Data Flow Diagram

```mermaid
flowchart LR
  subgraph inputs["Upstream Nodes"]
    w2["w2\n(Box12 A/B/K/M/N/Z)"]
    nec["f1099nec\n(box3 × 20%)"]
    misc["f1099m\n(box15 × 20%)"]
  end
  subgraph form["Schedule 2 (Intermediate)"]
    L13["Line 13\nuncollected_fica +\nuncollected_fica_gtl"]
    L17h["Line 17h\nsection409a_excise +\nline17h_nqdc_tax"]
    L17k["Line 17k\ngolden_parachute_excise +\nline17k_golden_parachute_excise"]
    total["Total\nLine 13 + 17h + 17k"]
  end
  subgraph outputs["Downstream Nodes"]
    f1040["f1040\nline23_other_taxes"]
  end
  w2 -->|uncollected_fica\nuncollected_fica_gtl| L13
  w2 -->|section409a_excise| L17h
  w2 -->|golden_parachute_excise| L17k
  nec -->|line17k_golden_parachute_excise| L17k
  misc -->|line17h_nqdc_tax| L17h
  L13 --> total
  L17h --> total
  L17k --> total
  total --> f1040
```

---

## Edge Cases & Special Rules

1. **All-zero inputs**: If no upstream node sends any non-zero amount, Schedule 2 should emit no output (early return).

2. **Multiple sources for same line**: `golden_parachute_excise` (from W-2 Box12 K) and `line17k_golden_parachute_excise` (from 1099-NEC box3 × 20%) both feed Line 17k — they must be summed.

3. **§409A sources**: `section409a_excise` (W-2 Box12 Z) and `line17h_nqdc_tax` (1099-MISC box15 × 20%) both feed Line 17h — they must be summed.

4. **Negative values**: None of these fields can be negative. All input fields are `nonnegative`.

5. **Partial inputs**: Any subset of fields may be present; absent fields default to 0.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Schedule 2 (Form 1040) | 2025 | All lines | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf | .research/docs/f1040s2.pdf |
| Form 1040 | 2025 | Line 17 | https://www.irs.gov/pub/irs-pdf/f1040.pdf | .research/docs/f1040.pdf |
| Form 1040 General Instructions | 2024 | Schedule 2 section | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf | .research/docs/i1040gi.pdf |
| IRC §409A | — | §409A(a)(1)(B) | https://www.law.cornell.edu/uscode/text/26/409A | — |
| IRC §4999 | — | §4999 | https://www.law.cornell.edu/uscode/text/26/4999 | — |
