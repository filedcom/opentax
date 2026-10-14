# Form 3800 — Scratchpad

## Purpose
Form 3800 aggregates all General Business Credits (GBC) — a composite of many component credits (Work Opportunity, Research, Disabled Access, Pension Startup, Small Employer Health Insurance, etc.). Applies a multi-tier limitation and routes the allowed amount to Schedule 3, line 6z. Unused credits carry back 1 year / forward 20 years.

## Fields identified
- Individual component credit amounts (from various forms: 5884, 6765, 8826, 8881, 8882, 8941, 8874, etc.)
- Pre-computed total GBC (for cases where the aggregate is already calculated)
- Carryforward credits from prior years
- Carryback credits from subsequent years
- Net income tax (from f1040)
- Tentative minimum tax (from AMT calculation)

## Open Questions
- [x] Q: What fields does this node capture? — Per-component credit amounts or pre-computed total
- [x] Q: Where does each field flow on the 1040? → Schedule 3 line 6z → f1040 line 20
- [x] Q: What are the TY2025 constants? — $25,000 threshold, 20-year carryforward, 1-year carryback
- [x] Q: What edge cases exist? — Component credits vs. total, limitation calculation
- [x] Q: What upstream nodes feed this? — Input node; no upstream computation needed

## Sources checked
- [x] IRS Form 3800 Instructions: https://www.irs.gov/instructions/i3800
- [x] IRC §38, §39

## Key Decision
This is an **input node** for the tax engine. The engine's architecture means each component credit node (f5884, f6765, f8826, f8881, f8882, f8941, f8874, etc.) is ALREADY a separate input node that routes its own credit to a component bucket.

Form 3800 in this engine is an **aggregator/input** that:
1. Captures any component credits the user enters directly via the 3800 screen
2. Accepts a pre-computed total GBC (e.g., from Drake data import)
3. Also accepts individual named components for disaggregated entry
4. Sums everything, applies the limitation, routes to schedule3.line6z_general_business_credit

The limitation formula requires net_income_tax and tentative_minimum_tax inputs (optional, for computing the ceiling). If not provided, the engine passes through the computed total without limitation (letting schedule3/f1040 handle the remaining computation).
