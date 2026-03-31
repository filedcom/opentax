# Form 8379 — Injured Spouse Allocation — Scratchpad

## Purpose
Pure allocation/disclosure form. No tax computation outputs. Directs IRS on how to split a joint refund when one spouse has past-due debts (child support, taxes, student loans, etc.).

## Fields identified
- injured_spouse_ssn, injured_spouse_name
- income: injured_spouse_wages, se_income (can be negative), other_income
- payments: withholding, estimated_tax, eic
- deductions: itemized_deductions, itemizes (bool)
- credits: injured_spouse_credits
- debt_type (enum), debt_amount

## Open Questions
- [x] Q: What fields? → ~13 fields covering income/payments/deductions/credits per injured spouse
- [x] Q: Where flows? → No outputs (allocation/disclosure only)
- [x] Q: TY2025 constants? → None (not a computation node)
- [x] Q: Edge cases? → Community property states, EITC allocation, multiple debts

## Notes
- outputNodes = [] — node produces zero outputs by design
- IRS processes Form 8379 separately; credit split calculated by IRS, not the node
