# Investment interest and NIIT (2025)

Enter investment interest **paid** on the `form4952` input as
`investment_interest_expense`, together with `amt_refigure` (the seven AMT
Form 4952 adjustments, zero when they do not apply). The engine calculates
Form 4952, puts the allowed amount on Schedule A line 9, and reports any excess
in `return get.carryforwards.investment_interest_excess_4952` for use next year.

Do not enter investment interest in `schedule_a.line_9_investment_interest`.
Form 4952 fills that line with the allowed amount; a value entered there
directly is not limited to net investment income.

Investment income comes from the source inputs. Mark a 1099-INT, 1099-OID,
1099-DIV, 1099-B or K-1 with `investment_property_for_form4952: true` to
include it on Form 4952; qualified dividends and net capital gain are excluded
unless elected.

Other `form4952` inputs:

| Field                                            | Use                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `prior_year_carryforward`                        | Disallowed interest from the prior year's Form 4952 line 7, with `prior_year_carryforward_source`.     |
| `other_investment_property_gross_income`         | Investment income not reported on a supported source input.                                            |
| `other_investment_property_net_disposition_gain` | Net gain from other property held for investment.                                                      |
| `other_investment_property_net_capital_gain`     | The net capital gain part of that gain.                                                                |
| `investment_income_election`                     | Qualified dividends and net capital gain elected into investment income on line 4g; they lose preferential rates. |
| `elected_capital_gain_portion`                   | The capital gain part of the line 4g election; without it, the IRS order applies.                      |
| `investment_expenses`                            | Deductible investment expenses on Form 4952 line 5.                                                    |

The Form 8960 line 9b allocation stays on Schedule A:
`schedule_a.niit_allocable_state_local_tax` is the taxpayer-chosen portion of
deductible state and local income tax allocable to net investment income.
Property and sales taxes are excluded.

Form 8960 line 9a uses the **allowed** Schedule A line 9 deduction. Lines 9a and
9b are included only when the return itemizes. The line 9b amount must not
exceed deductible eligible taxes; the engine does not choose an allocation
method for the taxpayer. See the
[2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) and
[Form 8960 instructions](https://www.irs.gov/instructions/i8960).
