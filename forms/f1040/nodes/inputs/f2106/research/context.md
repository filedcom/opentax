# f2106 — Form 2106: Employee Business Expenses

## Overview

Form 2106 captures employee business expenses for the four categories of employees who may still deduct these expenses post-TCJA. For all four categories, the net deductible amount flows to Schedule 1, line 12 (above-the-line deduction).

**Critical restriction for TY2025:** TCJA (P.L. 115-97) suspended miscellaneous itemized deductions subject to the 2% floor (IRC §67(g)) for 2018–2025. However, IRC §67(b) and §67(h) preserve the deduction for four specific employee categories — these deductions are NOT subject to the 2% floor and are above-the-line under IRC §62(a)(2)(E).

A separate Form 2106 is filed for each job or employment situation. Multiple 2106s are aggregated on Schedule 1.

**IRS Form:** 2106
**Drake Screen:** 2106
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/ (Drake screen "2106")

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `employee_type` | `EmployeeType` enum | Yes | Form 2106 / categorization | Category of qualifying employee. Must be one of: `ArmedForces` (reservists — IRC §62(a)(2)(E)), `PerformingArtist` (qualified performing artists — IRC §62(a)(2)(B)), `FeeBasedOfficial` (fee-basis state/local government officials — IRC §62(a)(2)(C)), `DisabledEmployee` (impairment-related work expenses — IRC §67(d)). Non-qualifying employees produce no output. | IRC §67(h); TCJA P.L. 115-97 | https://www.irs.gov/instructions/i2106 |
| `vehicle_expense_method` | `VehicleMethod` enum | No | Form 2106 Part II | Method used for vehicle expenses: STANDARD_MILEAGE or ACTUAL_EXPENSE. | IRC §280F; Form 2106 Part II | https://www.irs.gov/instructions/i2106 |
| `business_miles` | `number` (nonnegative) | No | Form 2106, Part II, line 13 | Miles driven for business purposes. Multiplied by standard mileage rate ($0.70/mile) if using standard mileage method. | IRC §280F; Form 2106 Part II line 13 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `actual_vehicle_expenses` | `number` (nonnegative) | No | Form 2106, Part II, lines 23–25 | Total actual vehicle operating expenses (gas, oil, repairs, insurance, depreciation) before business-use percentage. | IRC §280F; Form 2106 Part II line 23 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `business_use_pct` | `number` (nonneg, 0–100) | No | Form 2106, Part II, line 14 | Business use percentage of vehicle. Applied to actual expenses. | IRC §280F; Form 2106 Part II line 14 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `parking_tolls_transportation` | `number` (nonnegative) | No | Form 2106, Part I, line 2 | Parking fees, tolls, and local transportation. | IRC §162; Form 2106 Part I line 2 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `travel_expenses` | `number` (nonnegative) | No | Form 2106, Part I, line 3 | Travel away from tax home: lodging and transportation (not meals). | IRC §162; Form 2106 Part I line 3 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `other_expenses` | `number` (nonnegative) | No | Form 2106, Part I, line 4 | Other business expenses (tools, uniforms, subscriptions, professional dues, etc.). | IRC §162; Form 2106 Part I line 4 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `meals_expenses` | `number` (nonnegative) | No | Form 2106, Part I, line 5 | Business meal expenses (before the 50% limitation). | IRC §274(n); Form 2106 Part I line 5 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |
| `employer_reimbursements` | `number` (nonnegative) | No | Form 2106, Part I, line 7 | Reimbursements received from employer not included in W-2 Box 1 (under accountable plan). Reduces deductible amount. | IRC §62(a)(2)(A); Form 2106 Part I line 7 | https://www.irs.gov/pub/irs-pdf/f2106.pdf |

---

## Calculation Logic

### Step 1 — Validate Employee Type
Only RESERVIST, PERFORMING_ARTIST, FEE_BASIS_OFFICIAL, or DISABLED_IMPAIRMENT produce output. Any other (or missing) value → no output.
Source: IRC §67(h)(1)–(4); TCJA P.L. 115-97 §11045

### Step 2 — Compute Vehicle Expenses (Line 1)
```
If vehicle_expense_method == STANDARD_MILEAGE:
  vehicle_expense = business_miles × 0.70

If vehicle_expense_method == ACTUAL_EXPENSE:
  vehicle_expense = actual_vehicle_expenses × (business_use_pct / 100)

If neither provided:
  vehicle_expense = 0
```
Source: Notice 2025-05 ($0.70/mile); IRC §280F; Form 2106 Part II

### Step 3 — Compute Meals (50% Limitation, Line 9)
```
meals_allowed = meals_expenses × 0.50
```
Source: IRC §274(n)(1); Form 2106 line 9

### Step 4 — Total Expenses (Line 6)
```
total_expenses = vehicle_expense + parking_tolls_transportation
              + travel_expenses + other_expenses + meals_allowed
```
Source: Form 2106 Part I line 6

### Step 5 — Subtract Reimbursements (Line 10)
```
net_deduction = max(0, total_expenses - employer_reimbursements)
```
Source: Form 2106 Part I line 10; IRC §62(a)(2)(A)

### Step 6 — Route to Schedule 1, Line 12
If net_deduction > 0, emit to `schedule1.line12_business_expenses`.
Source: IRC §62(a)(2)(E); Schedule 1 (Form 1040) line 12

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line12_business_expenses` | `schedule1` | Qualifying employee type AND net deduction > 0 | IRC §62(a)(2)(E); Schedule 1 Part II line 12 | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Standard mileage rate (business) | $0.70 per mile | Notice 2025-05 | https://www.irs.gov/pub/irs-drop/n-25-05.pdf |
| Meals deduction limitation | 50% of meals expenses | IRC §274(n)(1) | https://www.irs.gov/instructions/i2106 |
| TCJA suspension period | TY2018–TY2025 (for non-qualifying employees) | P.L. 115-97, §11045 | https://www.congress.gov/115/plaws/publ97/PLAW-115publ97.pdf |
| Qualifying performing artist AGI limit | $16,000 (combined if MFJ) | IRC §62(b)(1)(C) | https://www.irs.gov/instructions/i2106 |
| Qualifying performing artist min employers | 2 employers, ≥$200 from each | IRC §62(b)(1)(A)–(B) | https://www.irs.gov/instructions/i2106 |
| Performing artist expense-to-income ratio | Expenses > 10% of performing arts income | IRC §62(b)(1)(B) | https://www.irs.gov/instructions/i2106 |
| Deduction floor | $0 (reimbursements cannot create income on 2106) | Form 2106 instructions | https://www.irs.gov/instructions/i2106 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per Form 2106 / per job)"]
    ET["employee_type (enum)"]
    VM["vehicle_expense_method"]
    BM["business_miles"]
    AV["actual_vehicle_expenses"]
    BP["business_use_pct"]
    PT["parking_tolls_transportation"]
    TR["travel_expenses"]
    OT["other_expenses"]
    ML["meals_expenses"]
    ER["employer_reimbursements"]
  end

  subgraph node["f2106 (one per 2106 filing)"]
    FILTER["Filter: qualifying type only"]
    VEH["vehicle = miles × 0.70 OR actual × pct"]
    MEALS["meals_allowed = meals × 50%"]
    TOTAL["total = vehicle + parking + travel + other + meals_allowed"]
    NET["net = max(0, total - reimbursements)"]
    AGG["Aggregate across all items"]
  end

  subgraph outputs["Downstream Nodes"]
    S1["schedule1.line12_business_expenses"]
    F1040["Form 1040 via Schedule 1"]
  end

  ET --> FILTER
  VM --> VEH
  BM --> VEH
  AV --> VEH
  BP --> VEH
  PT --> TOTAL
  TR --> TOTAL
  OT --> TOTAL
  ML --> MEALS
  ER --> NET
  FILTER --> TOTAL
  VEH --> TOTAL
  MEALS --> TOTAL
  TOTAL --> NET
  NET --> AGG
  AGG -->|"total > 0"| S1
  S1 --> F1040
```

---

## Edge Cases & Special Rules

1. **Non-qualifying employees produce no output.** Under TCJA, the deduction is suspended for all employees except the four enumerated categories. If `employee_type` is absent or not in the qualifying list, no output is produced.

2. **Meals 50% limitation.** Only 50% of meal expenses are deductible (IRC §274(n)). The node applies this automatically before summing totals.

3. **Reimbursements reduce deduction, cannot go negative.** If employer reimbursements exceed total expenses, the net deduction floors at zero. No income is generated on Form 2106.

4. **Standard vs. actual vehicle method.** The taxpayer must choose one method per vehicle. In the year a vehicle is placed in service, the standard mileage method must be chosen if the taxpayer wants to use it in subsequent years. The node accepts whichever method applies.

5. **Multiple 2106s.** One form per employment situation (e.g., two jobs). The engine uses array items; net deductions from all items are summed before routing to Schedule 1.

6. **Reservist travel requirement.** Armed Forces reservists can only deduct travel expenses for travel more than 100 miles from home (one-way). This is a data-entry constraint; the node trusts the entered amounts.

7. **Performing artist AGI test.** The performing artist category requires AGI (before the deduction) ≤ $16,000 ($16,000 for all filing statuses; married must use combined income). This test occurs at the Schedule 1 level — the node captures the expenses.

8. **Disability impairment routing.** Per IRS instructions, impairment-related expenses for disabled employees technically go to Schedule A, line 16. However, per IRC §67(b)(6) and §62(a)(2)(E), such expenses are treated as above-the-line (not subject to 2% floor) in the engine and route to Schedule 1, line 12.

9. **Commuting miles excluded.** Miles driven from home to regular workplace are never deductible. The `business_miles` field should exclude commuting miles — a data-entry constraint.

10. **No §179 or bonus depreciation in this node.** Vehicle depreciation limits (§280F, §168(k)) are complex multi-year calculations beyond the scope of this input node; if actual vehicle expenses are used, the user enters the depreciation amount directly in `actual_vehicle_expenses`.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 2106 Instructions | 2025 | All | https://www.irs.gov/instructions/i2106 | .research/docs/i2106.pdf |
| IRC §62(a)(2)(E) — Above-the-line deduction | Current | §62(a)(2)(E) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section62 | N/A |
| IRC §67(h) — Suspension exceptions | Current | §67(h) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section67 | N/A |
| IRC §274(n) — 50% meals limitation | Current | §274(n)(1) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section274 | N/A |
| TCJA P.L. 115-97, §11045 — Suspension | 2017 | §11045 | https://www.congress.gov/115/plaws/publ97/PLAW-115publ97.pdf | N/A |
| Notice 2025-05 — Standard Mileage Rates | 2025 | Business rate | https://www.irs.gov/pub/irs-drop/n-25-05.pdf | N/A |
| Schedule 1 (Form 1040) | 2025 | Part II, Line 12 | https://www.irs.gov/pub/irs-pdf/f1040s1.pdf | N/A |
| IRC §62(b) — Qualified performing artist | Current | §62(b) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section62 | N/A |
