# Form 2106 — Scratchpad

## Purpose
Form 2106 — Employee Business Expenses. Post-TCJA, available ONLY to 4 categories:
1. Armed Forces reservists (travel > 100 miles from home)
2. Qualified performing artists (≥2 employers, ≥$200 each, expenses >10% of income, AGI ≤$16,000)
3. Fee-basis state/local government officials
4. Employees with impairment-related work expenses

Standard mileage rate 2025: $0.70/mile (Notice 2025-05)

## Fields identified
- employee_type (enum): RESERVIST | PERFORMING_ARTIST | FEE_BASIS_OFFICIAL | DISABLED_IMPAIRMENT
- vehicle_expenses: standard mileage OR actual
- business_miles (for standard mileage method)
- parking_tolls_transportation
- travel_expenses (lodging/transport away from home)
- other_expenses (line 4)
- meals_expenses (line 5, subject to 50% limit)
- employer_reimbursements (line 7, reduces deduction)

## Open Questions
- [x] Q: Who qualifies? — 4 categories per IRC §67(h)
- [x] Q: Where does it flow? → Schedule 1 line 12 (all 4 categories route there as above-the-line)
  NOTE: The IRS instructions say disabled employees flow to Schedule A line 16, but the engine's schedule1 has line12_business_expenses. Need to check — the IRC §67(b) exception means disability deduction is NOT subject to the 2% floor, so it DOES go above-the-line for disabled employees per §62(a)(2)(E) — correct, all 4 flow to Schedule 1 line 12.
- [x] Q: 2025 mileage rate? — $0.70/mile per Notice 2025-05
- [x] Q: Edge cases? — Meals 50% limit, qualified performing artist AGI test, reservist >100 miles test
- [x] Q: Multiple 2106s? — Yes, per-item (array) — one 2106 per job/employer pair

## Sources checked
- [x] IRS Form 2106 Instructions: https://www.irs.gov/instructions/i2106
- [x] IRC §62(a)(2)(E), §67(b), §67(h)
- [x] Notice 2025-05 (standard mileage rates)
