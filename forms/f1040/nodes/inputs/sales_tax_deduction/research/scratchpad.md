# Sales Tax Deduction — Scratchpad

## Purpose
Compute deductible state/local general sales tax amount. Taxpayer elects to deduct sales tax instead of income tax on Schedule A Line 5b.

## Fields identified
- method (enum: actual | table)
- actual_sales_tax_paid (for actual method)
- table_amount (for table method, pre-computed from Pub 600)
- major_purchase_tax (add-on for table method only)

## Open Questions
- [x] Q: What fields does this node capture or receive? → method, actual amount or table lookup, major purchase add-on
- [x] Q: Where does each field flow on the 1040? → Schedule A Line 5b
- [x] Q: What are the TY2025 constants? → SALT cap $10,000 (applied by schedule_a)
- [x] Q: What edge cases exist? → table method with major purchase add-on, SALT cap applied downstream, not both income+sales tax
- [x] Q: What upstream nodes feed into this node? → INPUT node, no upstream

## Sources checked
- [x] Drake KB article: https://kb.drakesoftware.com/Site/Browse/13012
- [x] IRC §164(b)(5) — election to deduct general sales taxes
- [x] TCJA §11042 — SALT limitation
- [x] Schedule A Instructions Line 5b
- [x] IRS Publication 600 (Optional Sales Tax Tables)
