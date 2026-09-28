# TY2025 Form 1099-PATR source classification

The source node records boxes 1, 2, 3, and 5 as the gross
cooperative-distribution amount. A positive amount requires an explicit
`distribution_treatment`; an omitted `trade_or_business` flag never implies
Schedule 1 other income. Box 4 withholding independently flows to Form 1040 line
25b. Boxes 6 through 9 and box 13 remain specified-cooperative QBI evidence, not
direct income amounts.

## Supported treatments

| Treatment                   | Required evidence                                                                            | Output                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `farm`                      | `farm_id` and `verified_taxable_amount` between zero and gross                               | One Schedule F `1099patr_cooperative` source per Form 1099-PATR, carrying gross and taxable amounts                                   |
| `personal_basis_adjustment` | Box 1 only, nonempty `purchase_reference`, `verified_basis_reduction` exactly equal to gross | No current taxable-income output. The reference and basis reduction remain with the input record for asset or expense basis tracking. |

Schedule F compares the source gross to cash line 3a or accrual line 38a, and
the verified taxable portion to cash line 3b or accrual line 38b. It calculates
farm income from the existing taxable line, not from the source record a second
time. Multiple forms retain their farm IDs. Unknown farms, omitted taxable
amounts, and source totals larger than reported lines are rejected.

These rules follow the
[2025 Schedule F instructions](https://www.irs.gov/instructions/i1040sf) and
[2025 Publication 225](https://www.irs.gov/publications/p225). The IRS says
total cooperative distributions go on line 3a, while patronage dividends from
personal or family purchases, capital assets, or depreciable assets do not go on
taxable line 3b and reduce cost or basis. The
[Form 1099-PATR instructions](https://www.irs.gov/instructions/i1099ptr) define
the reported boxes.

## Still open

- Schedule C cooperative distributions and other nonfarm business
  classifications are not inferred from these inputs. Such cases must be
  separately modeled before filing.
- Personal basis adjustment is recorded and checked here, but downstream
  asset-basis integration remains outside this source node.
- Nonzero Form 8995-A line 38 support, complex specified-cooperative
  allocations, and multiple-activity QBI reconciliation remain separate gates.
- Current `trade_or_business` is retained only for the existing
  specified-cooperative Form 8995-A cross-check. It does not determine
  current-year income treatment.
