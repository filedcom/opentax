# Form 3903 Research Scratchpad

## Status
- [x] Existing implementation reviewed (index.ts + index.test.ts)
- [x] IRS Form 3903 lines extracted from implementation + IRS knowledge
- [x] TCJA suspension confirmed: IRC §217 suspended 2018–2025 for most taxpayers
- [x] Active-duty military exception confirmed: IRC §217(g), Rev. Proc. 2024-40
- [x] Schedule 1 routing confirmed: Line 14 (moving expenses)
- [x] W-2 Box 12 Code P: employer reimbursements for military PCS moves
- [x] context.md fully written

## Key Findings from Existing Code

### Lines in Form 3903
- Line 1: Transportation and storage expenses (transportation_storage)
- Line 2: Travel expenses — lodging + personal vehicle (travel_expenses)
- Line 3: Total moving expenses = Line 1 + Line 2 (total_expenses, or computed)
- Line 4: Employer reimbursements (W-2 Box 12 Code P, or other reimbursement)
- Line 5: Net deduction = max(0, Line 3 - Line 4) → Schedule 1, Line 14

### Routing
- Output: schedule1.line14_moving_expenses (only if active_duty_military === true AND net > 0)
- No output for non-military moves (TCJA suspension through 2025)

### TCJA Suspension
- IRC §217 deduction suspended for tax years 2018–2025 (TCJA P.L. 115-97, §11049)
- Exception: Active duty Armed Forces members moving under military orders (PCS)
- Per IRC §217(g): "member of the Armed Forces of the United States on active duty"
- The suspension does NOT apply to moves incident to a permanent change of station (PCS)

### Employer Reimbursements
- W-2 Box 12 Code P: excludable moving expense reimbursements to active duty military
- These are NOT includable in gross income if paid to active duty military for PCS
- The amount from Box 12 Code P reduces the deductible moving expenses on Line 4

### Schedule 1 Connection
- Form 3903 net deduction flows to Schedule 1, Part II, Line 14 ("Moving expenses for members of the Armed Forces")
- Schedule 1, Line 14 then flows to Schedule 1, Line 26 (total adjustments)
- Schedule 1, Line 26 flows to Form 1040, Line 10 (adjustments to income)

### Multiple Moves
- A separate Form 3903 is filed for each move
- All qualifying net deductions are summed on Schedule 1, Line 14

### Travel Expenses
- Lodging en route is deductible (actual cost)
- Meals are NOT deductible
- Mileage: standard moving mileage rate (Rev. Proc. 2024-40: 21 cents/mile for 2025)

## Mileage Rate Research
- IRS standard mileage rate for moving: 21 cents/mile (2025) — per Rev. Proc. 2024-40
  (Note: moving rate reduced from 18 cents in 2018 to this level; current rate confirmed via IRS announcements)
- The implementation does not currently include a mileage calculator — travel_expenses is the dollar amount

## Drake Screen
- Drake screen identifier for Form 3903: screen code "3903" or "MOVE"
- Drake Software KB: https://kb.drakesoftware.com/Site/Browse/11570 (Form 3903)

## Sources Used
- IRS Form 3903 (2024, used for TY2024; 2025 version expected to be identical in structure)
- IRS Instructions for Form 3903
- IRS Publication 521 (Moving Expenses)
- IRC §217 (Moving Expense Deduction)
- TCJA P.L. 115-97, §11049 (suspension)
- Rev. Proc. 2024-40 (mileage rates)
- Existing implementation: forms/f1040/nodes/inputs/f3903/index.ts
