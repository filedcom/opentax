# Form 6765 — Credit for Increasing Research Activities — Scratchpad

## Purpose
Computes the R&D tax credit (IRC §41) using Regular method (20% × excess QRE) or ASC (14% × excess over 50% of 3-yr prior avg). Routes to Schedule 3 line 6z. Startups may elect payroll tax offset.

## Fields
- method (regular | asc)
- Regular: wages, supplies, contract_research (65%), energy_consortium_payments, base_amount
- ASC: asc_current_qre, asc_prior_avg_qre
- Payroll: payroll_tax_election, payroll_tax_credit_elected ($500k cap)

## Known gaps
1. ASC startup 6% rule (IRC §41(c)(5)(B)) — code uses 14% when priorAvg=0, should be 6%
