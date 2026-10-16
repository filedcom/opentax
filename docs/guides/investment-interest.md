# Investment interest and NIIT (2025)

Enter investment interest **paid** in `schedule_a.line_9_investment_interest`.
The engine calculates Form 4952, limits Schedule A line 9 to net investment
income, and reports any excess in
`return get.carryforwards.investment_interest_excess_4952` for use next year.
Taxable interest and ordinary dividends from supported 1099 and K-1 inputs are
included automatically; qualified dividends are excluded unless elected.

Additional `schedule_a` inputs:

| Field                                         | Use                                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prior_year_investment_interest_carryforward` | Disallowed interest from the prior year's Form 4952 line 7.                                                                                                      |
| `investment_net_gain`                         | Net gain from property held for investment, Form 4952 line 4d.                                                                                                   |
| `investment_net_capital_gain`                 | The eligible part of that gain on line 4e; it cannot exceed Schedule D net capital gain.                                                                         |
| `elected_qualified_dividends`                 | Qualified dividends elected into investment income on line 4g; the elected amount loses preferential tax rates.                                                  |
| `elected_net_capital_gain`                    | Eligible net capital gain elected on line 4g; the elected amount loses preferential tax rates.                                                                   |
| `investment_expenses`                         | Deductible investment expenses on Form 4952 line 5.                                                                                                              |
| `niit_allocable_state_local_tax`              | Taxpayer-chosen portion of deductible state and local income tax allocable to net investment income on Form 8960 line 9b. Property and sales taxes are excluded. |

Form 8960 line 9a uses the **allowed** Schedule A line 9 deduction. Lines 9a and
9b are included only when the return itemizes. The line 9b amount must not
exceed deductible eligible taxes; the engine does not choose an allocation
method for the taxpayer. See the
[2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) and
[Form 8960 instructions](https://www.irs.gov/instructions/i8960).
