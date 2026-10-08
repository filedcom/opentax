# Form 2106 — Scratchpad

## Purpose
Form 2106 — Employee Business Expenses. Post-TCJA, available ONLY to 4 categories:
1. Armed Forces reservists (travel > 100 miles from home)
2. Qualified performing artists (≥2 employers, ≥$200 each, expenses >10% of income, AGI ≤$16,000)
3. Fee-basis state/local government officials
4. Employees with impairment-related work expenses

Standard mileage rate 2025: $0.70/mile (Notice 2025-05)

## Current source shape
- `qualification.kind`: RESERVIST | PERFORMING_ARTIST | FEE_BASIS_OFFICIAL | DISABLED_IMPAIRMENT, with category-specific source facts
- `job`: employee/owner identity, occupation, employer, employment record
- `expenses`: Form 2106 Part I lines 2-5, with a job business purpose and record reference
- `reimbursements`: separately allocated Form 2106 line 7 columns A/B
- `vehicle`: no vehicle, a complete standard-mileage Part II source, or a staged actual-expense source that calculation rejects

## Open Questions
- [x] Q: Who qualifies? — 4 categories per IRC §67(h)
- [x] Q: Where does it flow? Fee-basis officials, qualifying performing artists, and qualifying reservists use Schedule 1 line 12. Disabled employees' impairment-related work expenses use Schedule A line 16, not Schedule 1 or AGI. The current calculator only activates fee-basis and narrow impairment internal routes; all Form 2106 exports remain blocked.
- [x] Q: 2025 mileage rate? — $0.70/mile per Notice 2025-05
- [x] Q: Edge cases? — Meals 50% limit, qualified performing artist AGI test, reservist >100 miles test
- [x] Q: Multiple 2106s? — Yes, one strict item per job with distinct employment record references

## Sources checked
- [x] IRS Form 2106 Instructions: https://www.irs.gov/instructions/i2106
- [x] IRC §62(a)(2)(E), §67(b), §67(h)
- [x] Notice 2025-05 (standard mileage rates)
