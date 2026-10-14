# LTC Premium — Scratchpad

## Purpose
Compute eligible long-term care insurance premium based on age-based limits. Eligible amount flows to Schedule A as medical expense.

## Fields identified
- age (integer, 0-130) — determines bracket
- actual_premium_paid (nonnegative number) — annual premium
- is_qualified_contract (boolean) — must be true for any deduction

## Open Questions
- [x] Q: What fields does this node capture or receive? → age, actual_premium_paid, is_qualified_contract
- [x] Q: Where does each field flow on the 1040? → Schedule A Line 1 (medical expenses)
- [x] Q: What are the TY2025 constants? → Rev. Proc. 2024-40 §3.45: $480/$900/$1,800/$4,830/$6,020
- [x] Q: What edge cases exist? → non-qualified contracts, age boundaries, married filing with both spouses having LTC
- [x] Q: What upstream nodes feed into this node? → INPUT node, no upstream

## Sources checked
- [x] Drake KB article: https://kb.drakesoftware.com/Site/Browse/10960
- [x] Rev Proc 2024-40 §3.45 (TY2025 LTC limits)
- [x] IRC §213(d)(10) (LTC premiums as medical expenses)
- [x] IRC §7702B (qualified LTC contract definition)
- [x] Schedule A Instructions (Line 1)
