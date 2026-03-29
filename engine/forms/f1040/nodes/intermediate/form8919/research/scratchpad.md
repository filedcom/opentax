# Form 8919 — Scratchpad

## Key IRS References
- Form 8919: Uncollected Social Security and Medicare Tax on Wages
- IRC §3101 (FICA tax on wages), §3102 (deduction from wages)
- Instructions: https://www.irs.gov/instructions/i8919

## Data Flow Summary
- Input: wages (from f1099nec routing, or direct screen entry), reason_code (A-H)
- Line 6: total wages subject to SS/Medicare (capped at SS wage base for SS)
- Line 11: SS tax = min(wages, SS_wage_base) × 6.2%
- Line 12: Medicare tax = wages × 1.45%
- Line 13: total = SS + Medicare → Schedule 2 line 6
- Wages → Form 1040 line 1g
- Wages → Schedule SE wages_8919 (to offset SS wage base)

## TY2025 Constants
- SS_WAGE_BASE: $176,100 (Rev Proc 2024-40)
- SS_RATE: 6.2% (employee share, IRC §3101(a))
- MEDICARE_RATE: 1.45% (employee share, IRC §3101(b))

## Reason Codes (Form 8919 Part I)
- A: Firm refused to withhold (IRS agreed — Form SS-8 filed and accepted)
- B: Firm refused to withhold (no SS-8)
- C: Worker filed SS-8 and has not yet received determination
- D: Worker received written notice from IRS that they are an employee
- E: Worker's wages are subject to SS/Medicare (not covered by class)
- F: Worker is an employee of a religious organization
- G: Worker filed Form SS-8 (and IRS issued determination)
- H: Worker received IRS notice that wages are subject to FICA

## Routing confirmed
- form8919 → f1040 (line1g_wages_8919) [wages count as employee wages]
- form8919 → schedule2 (line6_uncollected_8919) [SS+Medicare tax owed by employee]
- form8919 → schedule_se (wages_8919) [offsets SS wage base for SE tax calc]

## Schedule SE Connection
schedule_se already accepts `wages_8919: z.number().nonnegative().optional()`
form8919 should send wages to schedule_se.wages_8919

## Questions Resolved
- Q: Does form8919 route to schedule_se?
  A: Yes — wages offset SS wage base (Sch SE line 8c)
- Q: What field name for f1040?
  A: line1g_wages_8919 (needs to be added to f1040 schema)
- Q: What field name for schedule2?
  A: line6_uncollected_8919 (needs to be added to schedule2 schema)
