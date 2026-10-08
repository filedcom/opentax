# Auto Expense — Scratchpad

## Purpose
Compute business vehicle deduction using standard mileage or actual expense method. Routes to Schedule C, E, or F based on purpose enum.

## Fields identified
- vehicle_description (string)
- placed_in_service_date (string)
- business_miles (integer nonneg)
- total_miles (integer positive)
- method (enum: standard | actual)
- actual_expenses (object: depreciation, gas_oil, repairs, insurance, registration, lease_payments, other)
- purpose (enum: SCHEDULE_C | SCHEDULE_E | SCHEDULE_F)

## Open Questions
- [x] Q: What fields does this node capture or receive? → per-vehicle fields as above
- [x] Q: Where does each field flow on the 1040? → schedule_c line 9, schedule_e expense_auto_travel, schedule_f line10
- [x] Q: What are the TY2025 constants? → IRS Notice 2025-5: 70 cents/mile standard rate
- [x] Q: What edge cases exist? → business_miles > total_miles (invalid), zero total_miles, locked into actual after MACRS, commuting miles
- [x] Q: What upstream nodes feed into this node? → INPUT node, no upstream

## Sources checked
- [x] Drake KB article: https://kb.drakesoftware.com/Site/Browse/10793
- [x] IRS Notice 2025-5 (70 cents/mile for 2025)
- [x] Rev. Proc. 2019-46 (standard mileage rules)
- [x] IRS Pub. 463 (Car Expenses chapter)
- [x] IRC §280F (listed property)
