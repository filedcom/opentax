# NOL Carryforward — Scratchpad

## Purpose
Captures net operating loss (NOL) carryforward amounts from prior tax years.
The NOL deduction reduces current-year income on Schedule 1, Line 8a (other income — negative deduction).

## Fields identified
Per-item (one per prior-year NOL):
- year: number (the tax year the NOL arose)
- nol_amount: number (the carryforward amount available)
- nol_type: enum (PRE2018 | POST2017)

Top-level:
- current_year_taxable_income: number (before NOL deduction; required for 80% limit on POST2017 NOLs)

## Open Questions
- [x] Q: What fields does this node capture?
  → Per-year NOL items plus current_year_taxable_income
- [x] Q: Where does each field flow on the 1040?
  → Schedule 1, Line 8a as a negative deduction (other income)
- [x] Q: What are the TY2025 constants?
  → Post-2017: 80% of current taxable income; Pre-2018: 100%, 20-year carryforward
- [x] Q: What edge cases exist?
  → Multiple years; pre-2018 vs post-2017; ordering; 80% limitation
- [x] Q: Upstream nodes?
  → Input node, no upstream

## Sources checked
- [x] Drake KB: https://kb.drakesoftware.com/Site/Browse/12435 (NOL Carryforward worksheet)
- [x] IRS Pub 536 (Net Operating Losses for Individuals, Estates, and Trusts)
- [x] IRC §172; TCJA P.L. 115-97
- [x] IRS Form 1045 (Application for Tentative Refund) Schedule A
