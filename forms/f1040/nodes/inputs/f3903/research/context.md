# Form 3903 — Moving Expenses

## Overview

Form 3903 captures qualified moving expenses and computes the net deductible amount after subtracting employer reimbursements. The result flows to Schedule 1, Part II, Line 14 as an above-the-line deduction against gross income.

**Critical restriction for TY2025:** The moving expense deduction under IRC §217 is suspended for all taxpayers **except** active duty members of the Armed Forces of the United States who move pursuant to a military order incident to a permanent change of station (PCS). This suspension was enacted by TCJA (P.L. 115-97, §11049) and applies to tax years 2018 through 2025.

A separate Form 3903 is filed for each qualifying move. If a taxpayer has two PCS moves in the same year, two Form 3903s are filed and both net deductions aggregate on Schedule 1, Line 14.

**IRS Form:** 3903
**Drake Screen:** 3903 (screen code "MOVE" in older Drake versions; "3903" in current Drake Tax)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/11570

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `transportation_storage` | `number` (nonnegative) | No | Form 3903, Line 1 | Cost of packing, crating, moving, and storing household goods and personal effects. Storage costs while in transit (up to 30 consecutive days) are deductible. | IRC §217(b)(1); Form 3903 Line 1 | https://www.irs.gov/pub/irs-pdf/f3903.pdf |
| `travel_expenses` | `number` (nonnegative) | No | Form 3903, Line 2 | Cost of travel (transportation and lodging) from old home to new home. Meals are not deductible. Can use standard mileage rate (21¢/mile for 2025) or actual out-of-pocket vehicle expenses. | IRC §217(b)(2); Form 3903 Line 2 | https://www.irs.gov/pub/irs-pdf/f3903.pdf |
| `total_expenses` | `number` (nonnegative) | No | Form 3903, Line 3 | Total moving expenses = Line 1 + Line 2. If provided explicitly, overrides the sum of `transportation_storage` + `travel_expenses`. Normally computed automatically. | Form 3903 Line 3 | https://www.irs.gov/pub/irs-pdf/f3903.pdf |
| `employer_reimbursements` | `number` (nonnegative) | No | Form 3903, Line 4; W-2 Box 12 Code P | Reimbursements received from employer for moving expenses. For active duty military, employer (government) reimbursements are typically reported on W-2 Box 12 with Code P (excludable from gross income). These reduce the deductible amount. | IRC §132(g); Form 3903 Line 4; W-2 Instructions | https://www.irs.gov/pub/irs-pdf/iw2w3.pdf |
| `active_duty_military` | `boolean` | No | Data entry flag | Whether this move was made pursuant to a military order as incident to a permanent change of station (PCS) for an active duty Armed Forces member. Must be `true` for any deduction to flow. Non-military moves produce zero output under TCJA suspension. | IRC §217(g); TCJA P.L. 115-97 §11049 | https://www.irs.gov/instructions/i3903 |
| `move_description` | `string` | No | Informational | Optional description of the move (e.g., "PCS from Camp Lejeune to Fort Hood"). Used for documentation only — does not affect calculation. | N/A | N/A |

---

## Calculation Logic

### Step 1 — Filter to Military Moves Only
Only items with `active_duty_military === true` are eligible. All other items produce no output regardless of expenses reported.

**Rationale:** IRC §217 deduction is suspended for tax years 2018–2025 under TCJA P.L. 115-97, §11049. The only exception is IRC §217(g): active duty Armed Forces members moving under a qualifying military order (PCS).

### Step 2 — Compute Total Expenses (Line 3)
For each eligible item:
```
total = total_expenses  (if explicitly provided)
      OR (transportation_storage ?? 0) + (travel_expenses ?? 0)
```

The `total_expenses` field allows entry of a pre-computed total, overriding the sum of Lines 1 and 2.

### Step 3 — Net Deduction (Line 5)
```
net = max(0, total - (employer_reimbursements ?? 0))
```

If employer reimbursements equal or exceed total expenses, the net deduction is zero and no output is produced for that move. The deduction cannot be negative (i.e., if reimbursements exceed expenses, there is no additional income recognized on Form 3903 — that situation is handled on the W-2 directly).

### Step 4 — Aggregate Across All Qualifying Moves
```
total_deduction = sum of net deductions across all active-duty-military items
```

### Step 5 — Route to Schedule 1
If `total_deduction > 0`, emit one output to `schedule1.line14_moving_expenses`.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line14_moving_expenses` | `schedule1` | `active_duty_military === true` AND net deduction > 0 | IRC §217; Schedule 1 (Form 1040), Part II, Line 14 | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf |

**Downstream flow:** Schedule 1, Line 14 → Schedule 1, Line 26 (sum of Part II adjustments) → Form 1040, Line 10 (adjustments to income) → Form 1040, Line 11 (adjusted gross income).

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| TCJA suspension period | TY2018–TY2025 (inclusive) | P.L. 115-97, §11049 | https://www.congress.gov/115/plaws/publ97/PLAW-115publ97.pdf |
| Standard mileage rate for moving (2025) | 21 cents per mile | Rev. Proc. 2024-40; IRS Notice 2025-5 | https://www.irs.gov/tax-professionals/standard-mileage-rates |
| W-2 Box 12 Code P — exclusion (military PCS) | Full reimbursement amount excluded from gross income | IRC §132(g); W-2 Instructions | https://www.irs.gov/pub/irs-pdf/iw2w3.pdf |
| Deduction floor | $0 (cannot go below zero) | Form 3903 Line 5 instructions | https://www.irs.gov/instructions/i3903 |

**Note:** There is no dollar cap on qualifying moving expenses. The net deduction (after reimbursements) is the full unreimbursed amount.

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per move)"]
    L1["Line 1: transportation_storage"]
    L2["Line 2: travel_expenses"]
    L3["Line 3: total_expenses (override)"]
    L4["Line 4: employer_reimbursements"]
    MIL["active_duty_military flag"]
  end

  subgraph node["f3903 (one per move)"]
    FILTER["Filter: military only"]
    TOTAL["total = L3 ?? (L1 + L2)"]
    NET["net = max(0, total - L4)"]
    SUM["Aggregate across moves"]
  end

  subgraph outputs["Downstream Nodes"]
    S1["schedule1.line14_moving_expenses"]
    F1040["Form 1040, Line 10 (via Schedule 1)"]
  end

  L1 --> TOTAL
  L2 --> TOTAL
  L3 --> TOTAL
  L4 --> NET
  MIL --> FILTER
  FILTER --> TOTAL
  TOTAL --> NET
  NET --> SUM
  SUM -->|"net > 0"| S1
  S1 --> F1040
```

---

## Edge Cases & Special Rules

1. **Non-military moves produce zero output.** Under TCJA, IRC §217 is suspended for all non-military taxpayers from 2018 through 2025. Even if `transportation_storage` and `travel_expenses` are entered, the node emits nothing unless `active_duty_military === true`.

2. **`active_duty_military` defaults to non-qualifying.** If the field is omitted (undefined) or `false`, the move is treated as non-qualifying. The flag must be explicitly `true`.

3. **Reimbursements exceeding expenses do not create income on Form 3903.** When employer reimbursements exceed total moving expenses, the net deduction floors at zero. The excess reimbursement (if any) is handled at the W-2 level — W-2 Box 12 Code P amounts are already excluded from gross income for military PCS, so there is no double-inclusion issue.

4. **`total_expenses` override.** If provided, `total_expenses` replaces the computed sum of Lines 1 + 2. This is used when the taxpayer has a pre-computed total or when importing data from a source that provides only the aggregate.

5. **Meals are never deductible.** Only transportation, storage, lodging, and vehicle mileage en route qualify. Meals during travel to the new home are explicitly excluded by IRC §217(b)(2).

6. **Storage-in-transit limit.** Under Pub 521, storage costs are deductible for up to 30 consecutive days while goods are in transit. Long-term storage (not in-transit) is not deductible. The node accepts the storage amount as entered — this is a data-entry constraint, not enforced in the node.

7. **Multiple moves in one year.** Each move gets its own Form 3903 (array item). The node sums qualifying net deductions across all military moves and emits a single aggregated output to Schedule 1, Line 14.

8. **Spouse serving in Armed Forces.** If the spouse has a separate PCS move (uncommon but possible in dual-military households), each move is a separate item in the `f3903s` array.

9. **Form 3903 is informational for non-military taxpayers.** Some tax software still provides Form 3903 for documentation purposes for civilian moves, but no deduction results. The node correctly produces no output.

10. **Standard mileage vs. actual expenses.** For vehicle travel costs on Line 2, the taxpayer may use the 2025 standard mileage rate of 21 cents/mile (Rev. Proc. 2024-40) multiplied by miles driven, or actual out-of-pocket expenses (gas, oil, tolls, parking). The node accepts the dollar amount — the mileage-to-dollar conversion is a data-entry concern.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 3903 (Moving Expenses) | 2024 (TY2024; 2025 form structure identical) | All lines | https://www.irs.gov/pub/irs-pdf/f3903.pdf | docs/f3903.pdf |
| Instructions for Form 3903 | 2024 | All | https://www.irs.gov/instructions/i3903 | docs/i3903.pdf |
| IRS Publication 521 (Moving Expenses) | 2024 | All | https://www.irs.gov/pub/irs-pdf/p521.pdf | docs/p521.pdf |
| IRC §217 — Moving Expense Deduction | Current | §217(a)–(g) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section217 | N/A |
| TCJA P.L. 115-97, §11049 — Suspension of deduction | 2017 | §11049 | https://www.congress.gov/115/plaws/publ97/PLAW-115publ97.pdf | N/A |
| Schedule 1 (Form 1040) | 2025 | Part II, Line 14 | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf | N/A |
| Rev. Proc. 2024-40 (Standard Mileage Rates) | 2024 | Section 5 (moving) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | N/A |
| IRS Notice 2025-5 (2025 mileage rates) | 2025 | Moving rate | https://www.irs.gov/pub/irs-drop/n-25-05.pdf | N/A |
| W-2 Instructions (Box 12 Code P) | 2024 | Code P | https://www.irs.gov/pub/irs-pdf/iw2w3.pdf | N/A |
| Drake Software KB — Form 3903 | Current | Entry screen | https://kb.drakesoftware.com/Site/Browse/11570 | N/A |
