# Form 7203 — Scratchpad

## Purpose
Form 7203 calculates an S corporation shareholder's stock and debt basis to determine how much of the S corporation's losses and deductions can be deducted on the shareholder's individual return. Required since TY2021 for shareholders who have losses, suspended losses, nondividend distributions, or certain loan repayments.

## Fields identified

### Part I — Stock Basis Inputs
- `stock_basis_beginning`: Line 1 — beginning stock basis
- `additional_contributions`: Line 2 — capital contributions during year
- `ordinary_income`: Box 1 — ordinary business income/loss from K-1
- `separately_stated_income`: Box 2–9 separately stated income items (gross, positive)
- `tax_exempt_income`: Box 16 Code A — increases stock basis
- `distributions`: Box 16 Code D — nondividend distributions (reduce stock basis)
- `nondeductible_expenses`: Box 16 Code C — nondeductible expenses (reduce stock basis)
- `prior_year_unallowed`: prior year suspended losses (increase the loss pool)
- `ordinary_loss`: Box 1 losses from K-1
- `separately_stated_deductions`: other deduction items from K-1

### Part II — Debt Basis Inputs
- `debt_basis_beginning`: Line 21 — beginning debt basis
- `new_loans`: Line 17 — new loans/advances made to corporation during year

### Part III — Loss Items (passed through from k1_s_corp)
- `ordinary_loss`: Box 1 ordinary business loss
- `prior_year_unallowed_loss`: carryforward from prior years

## Open Questions
- [x] Q: What fields does this node capture or receive? — fields from k1_s_corp and user-entered beginning basis info
- [x] Q: Where does each field flow on the 1040? → schedule_e (allowed losses via schedule1), no additional tax
- [x] Q: What are the TY2025 constants? — No static dollar thresholds; formulas only
- [x] Q: What edge cases exist? — basis cannot go below zero; pro-rata allocation when basis insufficient; gain on certain repayments
- [x] Q: What upstream nodes feed into this node? — k1_s_corp node sends basis-relevant fields

## Sources checked
- [x] IRS Form 7203 Instructions (irs.gov/instructions/i7203) — full line extraction
- [x] IRS Form 7203 PDF — binary (not readable)
- [x] IRS About Form 7203 page — purpose confirmed
- [x] Drake KB — no specific article found for 7203
- [ ] Rev Proc 2024-40 — not applicable (no dollar thresholds for this form)
