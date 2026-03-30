# Form 8801 Research Scratchpad

## IRC §53 — Credit for Prior Year Minimum Tax

### What it is
Form 8801 (Credit for Prior Year Minimum Tax – Individuals, Estates, and Trusts) computes the minimum tax credit (MTC). It allows taxpayers who paid AMT in a prior year to recover that tax as a nonrefundable credit against their regular tax in subsequent years (to the extent regular tax exceeds tentative minimum tax in those years).

### Credit Mechanics

**Net Minimum Tax Credit Available (Line 14):**
```
available_credit = prior_year_amt_paid + prior_year_carryforward
```
- `prior_year_amt_paid` = AMT paid in immediately preceding year (Form 6251 result for prior year)
- `prior_year_carryforward` = unused MTC carried from Form 8801 filed for prior year (line 26 of prior 8801)

**Credit Allowed This Year (Line 25):**
```
excess_regular_over_tmt = max(0, current_year_regular_tax - current_year_tmt)
credit_allowed_this_year = min(available_credit, excess_regular_over_tmt)
```
- `current_year_regular_tax` = regular tax before credits (f1040 line 16)
- `current_year_tmt` = tentative minimum tax from Form 6251 (current year)

**Carryforward to Next Year (Line 26):**
```
carryforward_to_next_year = available_credit - credit_allowed_this_year
```

### Key Rules
1. Credit is NONREFUNDABLE — limited to regular tax - TMT (excess)
2. If available_credit = 0 → no output
3. If excess_regular_over_tmt = 0 → credit_allowed = 0, full carryforward
4. Credit goes to Schedule 3 Part I as nonrefundable credit (line 6e)
5. Only emit Schedule 3 output if credit_allowed > 0

### Output Routing
- Schedule 3 line 6e (prior year minimum tax credit) → field: `line6e_prior_year_min_tax_credit`
- This rolls up to Schedule 3 Part I total → f1040 line 20

### TY2025 Notes
- No phase-out for this credit
- Applies to excluded items AMT only (deferral items from prior years)
- No income thresholds
