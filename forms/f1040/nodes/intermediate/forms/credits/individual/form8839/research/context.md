# Form 8839 — Qualified Adoption Expenses

## Overview
**IRS Form:** Form 8839
**Drake Screen:** 8839
**Tax Year:** 2025

---
## Input Fields
| Field | Type | Source Node | Description | IRS Reference | URL |
| ----- | ---- | ----------- | ----------- | ------------- | --- |
| adoption_benefits | number | w2 (Box12T) | Employer-provided adoption benefits | Part III Line 22 | i8839 p7 |
| children | array | direct | Per-child adoption data | Part I/II | i8839 p3 |
| children[].final_decree | record reference | direct | Dated 2025 U.S. final decree and issuing jurisdiction; contents still need review | Part I Col (e) | i8839 2025 |
| children[].expenses[] | receipt/reimbursement ledger | direct | Dated 2024/2025 payment, category, payee and separate reimbursement reference | Part II Line 5 | i8839 2025 |
| children[].special_needs_determination | record reference | direct | State/tribal determination; contents still need review | Part I Col (d) | i8839 2025 |
| children[].prior_filed_form8839 | filed-return reference | direct | Last filed Form 8839 lines 3 and 6 for the same child | Part II Line 3 | i8839 2025 |
| filing_status | enum | direct | Filing status (MFS restricted) | General Instructions | i8839 p2 |

`magi` and `credit_limit_worksheet_line5` are no longer source inputs.
`prepareForm8839Credit` computes child Part II lines 2–6 from the source
ledger. `settleForm8839Credit` consumes a typed pre-adoption-credit return
snapshot with Form 1040 lines 11b and 18, all four MAGI additions, the
Form 1040 line 19 / Schedule 8812 Worksheet B line 14 branch, and the
specified Schedule 3 priority credit lines. The executor does not yet provide
that snapshot to Form 8839, so active filing remains closed.

---
## Calculation Logic

### Step 1 — Per-Child Credit (Part II Lines 2-11b)
- Line 2: $17,280 (max credit per child)
- Line 3: last filed Form 8839 lines 3 + 6 for the same child
- Line 5: sum of eligible 2024/2025 paid receipts less documented reimbursements (or $17,280 less line 3 for a 2025-final U.S. special-needs adoption)
- Line 6: min(line2 - line3, line5), clamped to >= 0
- Phase-out fraction = clamp((magi - 259190) / 40000, 0, 1), rounded to 3 decimal places
- Line 11a: line6 × (1 - phase_out_fraction)
- Line 11b (refundable per child): min(line11a, 5000)

### Step 2 — Totals (Lines 11c-14)
- Line 11c: sum of line11b across all children (total refundable)
- Line 12: sum of line11a across all children
- Line 13: line 11c → f1040 line 30 (refundable)
- Line 14: max(0, line 12 - line 13), current-year nonrefundable portion

### Step 3 — Nonrefundable Credit (Lines 15-18)
- Line 15: prior nonrefundable credit carryforward (not yet modeled)
- Line 16: line14 + line15
- Line 17: smaller of line 16 and the nonnegative Form 1040 line 18 capacity after the 2025 worksheet's named prior credits; calculated only by pure settlement until a finalized-return stage is connected
- Line 18: min(line16, line17); current code includes only current-year line14
- → Schedule 3 line 6c

### Step 4 — Employer Exclusion (Part III)
- Line 19: $17,280 max per child
- Line 22: adoption_benefits (total received from W-2 Box 12T)
- Line 23: min(line19 × num_children, line22), after phase-out
- Phase-out applies to exclusion too: exclusion × (1 - phase_out_fraction)
- Taxable benefits = line22 - excluded_amount → f1040 line 1f (if > 0)

---
## Output Routing
| Output Field | Destination Node | Line / Field | Condition | IRS Reference | URL |
| ------------ | ---------------- | ------------ | --------- | ------------- | --- |
| line6c_adoption_credit | schedule3 | Line 6c | nonrefundable > 0 | Part II Line 18 | i8839 p7 |
| line30_refundable_adoption | f1040 | Line 30 | refundable > 0 | Part II Line 13 | i8839 p7 |
| line1f_taxable_adoption_benefits | f1040 | Line 1f | taxable benefits > 0 | Part III Line 31 | i8839 p7 |

---
## Constants & Thresholds (Tax Year 2025)
| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| MAX_CREDIT_PER_CHILD | 17280 | Rev Proc 2024-40 / IRS i8839 2025 | https://www.irs.gov/instructions/i8839 |
| PHASE_OUT_START | 259190 | IRS i8839 2025 What's New | https://www.irs.gov/instructions/i8839 |
| PHASE_OUT_END | 299190 | IRS i8839 2025 What's New | https://www.irs.gov/instructions/i8839 |
| PHASE_OUT_RANGE | 40000 | PHASE_OUT_END - PHASE_OUT_START | computed |
| MAX_REFUNDABLE_PER_CHILD | 5000 | IRS i8839 2025 What's New | https://www.irs.gov/instructions/i8839 |

---
## Data Flow Diagram
```mermaid
flowchart LR
  subgraph inputs["Upstream Nodes"]
    W2["w2 (Box12T → adoption_benefits)"]
    Direct["Direct Input\n(children[], magi, filing_status)"]
  end
  subgraph form["Form 8839"]
    PartII["Part II — Credit\nPhase-out, per-child refundable $5k cap"]
    PartIII["Part III — Exclusion\nEmployer benefits excluded from income"]
  end
  subgraph outputs["Downstream Nodes"]
    S3["schedule3\nline6c_adoption_credit"]
    F1040_30["f1040\nline30_refundable_adoption"]
    F1040_1f["f1040\nline1f_taxable_adoption_benefits"]
  end
  W2 --> PartIII
  Direct --> PartII
  Direct --> PartIII
  PartII --> S3
  PartII --> F1040_30
  PartIII --> F1040_1f
```

---
## Edge Cases & Special Rules
1. **Special needs child**: Line 5 = $17,280 minus any prior year credit claimed, even if $0 expenses paid
2. **MFS filers**: Adoption facts throw until the separation exception and taxable-benefit route are modeled; they are never silently discarded
3. **Phase-out**: Applies to BOTH credit (Part II) and exclusion (Part III)
4. **Cannot double-dip**: Expenses reimbursed by employer are not qualified expenses for the credit
5. **Refundable cap**: $5,000 per child max refundable; excess is nonrefundable (subject to credit limit)
6. **Credit limit worksheet**: Current-year nonrefundable credit requires an entered completed worksheet line 5; the worksheet's other-credit reconciliation is not derived here
7. **Carryforward**: Unused nonrefundable credit can carry forward for 5 years; prior carryforward input and ledger are not modeled
8. **Foreign child**: Cannot take credit/exclusion until adoption is final (adoption_final flag required)
9. **Multi-child**: Each child calculated separately; totals aggregated

---
## Sources
| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Instructions for Form 8839 | 2025 | All parts | https://www.irs.gov/instructions/i8839 | .research/docs/i8839.pdf |
| Rev Proc 2024-40 | 2024 | TY2025 inflation adjustments | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | — |
