# SEP Retirement — Scratchpad

## Purpose
Captures SEP-IRA, SIMPLE IRA, and Solo 401(k) retirement contributions for self-employed taxpayers.
Computes the deductible above-the-line retirement contribution amount flowing to Schedule 1, Line 16.

## Fields identified
### SEP-IRA
- plan_type: enum (SEP | SIMPLE | SOLO_401K)
- net_self_employment_compensation: number (net SE earnings before deduction)
- sep_contribution: number (actual SEP contribution made)

### SIMPLE IRA
- simple_employee_contribution: number (employee elective deferrals)
- simple_employer_contribution: number (employer match/nonelective)
- age_50_or_over: boolean (catch-up eligibility)

### Solo 401(k)
- solo401k_employee_deferral: number (elective deferrals)
- solo401k_employer_contribution: number (profit-sharing)

## Open Questions
- [x] Q: What fields does this node capture?
  → Per-item plan with plan_type, contributions, SE compensation
- [x] Q: Where does each field flow on the 1040?
  → Schedule 1, Line 16 (SEP, SIMPLE, qualified plan deduction)
- [x] Q: What are the TY2025 constants?
  → SEP: $70,000 limit (Rev Proc 2024-40 §3.20); SIMPLE employee: $16,500 ($19,500 age 50+); Solo 401k: $70,000 combined
- [x] Q: What edge cases exist?
  → SEP 25% of net SE compensation calculation; combined limits; age catch-up
- [x] Q: What upstream nodes feed into this node?
  → Input node, no upstream nodes

## Sources checked
- [x] Drake KB: https://kb.drakesoftware.com/Site/Browse/13699 (SEP/SIMPLE/Keogh)
- [x] IRS Pub 560 (Retirement Plans for Small Business)
- [x] Rev Proc 2024-40 (TY2025 limits)
- [x] IRC §404(a)(8), §408(k), §408(p), §401(k)
