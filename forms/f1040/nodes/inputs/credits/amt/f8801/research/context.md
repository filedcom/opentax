# Form 8801 — Credit for Prior Year Minimum Tax: Context

## 1. Form Identity
| Field | Value |
|-------|-------|
| IRS Form Number | 8801 |
| Drake Screen Code | 8801 |
| Node Type | f8801 |
| Node Category | singleton input (isArray: false) |
| IRC Section | §53 |
| TY | 2025 |

## 2. Purpose
Allows individuals, estates, and trusts who paid Alternative Minimum Tax (AMT) in a prior year to recover that tax as a nonrefundable credit against current-year regular income tax, to the extent regular tax exceeds the current-year tentative minimum tax (TMT).

## 3. Input Fields
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `prior_year_amt_paid` | number | nonnegative, optional | AMT paid in the immediately preceding tax year (from prior year Form 6251) |
| `prior_year_carryforward` | number | nonnegative, optional | Unused MTC carried forward from prior Form 8801 line 26 |
| `current_year_regular_tax` | number | nonnegative, optional | Regular tax before credits (f1040 line 16 / Schedule 2) |
| `current_year_tmt` | number | nonnegative, optional | Tentative minimum tax from current year Form 6251 |

## 4. Calculations (IRC §53)
| Step | Formula |
|------|---------|
| available_credit | `(prior_year_amt_paid ?? 0) + (prior_year_carryforward ?? 0)` |
| excess_regular_over_tmt | `max(0, (current_year_regular_tax ?? 0) - (current_year_tmt ?? 0))` |
| credit_allowed_this_year | `min(available_credit, excess_regular_over_tmt)` |
| carryforward_to_next_year | `available_credit - credit_allowed_this_year` |

## 5. Output Routing
| Condition | Output Node | Field |
|-----------|-------------|-------|
| `credit_allowed_this_year > 0` | `schedule3` | `line6e_prior_year_min_tax_credit` |
| `credit_allowed_this_year === 0` | (no output) | — |

## 6. Edge Cases
| Case | Result |
|------|--------|
| All fields omitted / zero | available_credit = 0 → no output |
| available_credit > 0, but regular_tax ≤ tmt | excess = 0 → credit_allowed = 0 → no output |
| regular_tax > tmt by more than available_credit | credit_allowed = available_credit (full credit used) |
| regular_tax > tmt by less than available_credit | credit_allowed = excess (partial credit); remainder carried forward |
| tmt = 0 and regular_tax > 0 | excess = regular_tax; credit_allowed = min(available, regular_tax) |
| Negative values | Zod rejects (nonnegative constraint) |

## 7. Throw Rules
- Zod parse throws if any field is negative
- No other explicit throws

## 8. Schedule 3 Field
`line6e_prior_year_min_tax_credit` must be added to schedule3's inputSchema (it does not currently exist).
The Schedule 3 node's `partITotal` function must include this field.
