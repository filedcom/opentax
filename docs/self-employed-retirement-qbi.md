# Self-employed retirement deductions and reviewed SSTB QBI

The legacy `sep_retirement` solo 401(k) input validates actual contributions
before routing a deduction to Schedule 1, AGI and QBI. It rejects an excess
instead of silently treating the contribution as corrected.

## Solo 401(k) inputs

For a positive `SOLO_401K` contribution, provide
`net_self_employment_compensation`: that proprietor's business profit less the
deductible part of ordinary self-employment tax, before owner retirement
contributions. Reconcile this amount to the same owner's business and SE
calculation. It is not gross receipts or household compensation.

`other_plan_employee_deferrals` coordinates elective deferrals belonging to
that same person across other plans sharing the section 402(g) limit. Its
omission means none. The other spouse's deferrals do not consume this limit.

The ordinary-contribution worksheet assumes a maximum 25% employer plan rate,
which has a 20% reduced self-employed rate. The employer limit is the smallest
of:

- 20% of adjusted earnings;
- the annual-additions limit less allowable solo employee deferrals; and
- half of adjusted earnings remaining after those employee deferrals.

For example, adjusted earnings of $100,000 and employee deferrals of $10,000
give an employer limit of $20,000. A $30,000 employer amount is rejected even
when the combined contribution is below the annual dollar cap.

A lower employer plan rate needs its own review. Age flags permit ordinary
base-limit contributions; actual catch-up deferrals require a separately
reviewed worksheet. Ambiguous multiple legacy plans remain rejected because
their source shape cannot establish owner and plan coordination. These
restrictions do not claim support for every self-employed plan arrangement.

## Attributing retirement deductions to an SSTB

A single reviewed Schedule C SSTB can supply
`qbi_sstb_filing_review.retirement_plan_deduction_review` with:

- `owner_ssn` and `business_reference` matching the business;
- `deduction_amount` matching the validated retirement deduction;
- `source_document_reference` identifying the contribution records; and
- `no_other_qbi_adjustments_confirmed` when that factual review is complete.

Provide exactly one of that review or the existing
`no_adjustments_beyond_filed_half_se_tax_confirmed` assertion. A nonzero
retirement deduction cannot use the half-SE-only assertion. The attributed
deduction reduces both AGI and QBI once. Owner, business, amount and retained
source checks also apply below the QBI threshold.

Complete investment sources retain the qualified-dividend/net-capital-gain
limitation on simplified QBI. They do not change a single reviewed SSTB into
the unrelated multiple-business source route.

For 2026, the $400 minimum deduction tests the $1,000 active-QBI floor against
the eligible, materially participating portion of SSTB income. It cannot
restore a business excluded above the SSTB endpoint. Existing final-filing
source/schema guards remain in force; calculation support is not IRS acceptance.

## Form 2210 prior-year safe harbor

When the 100%/110% prior-year rate can change the regular-method result,
provide prior-year AGI. AGI is unnecessary if 90% of current tax is already
no greater than 100% of prior tax. An explicit required annual payment remains
authoritative. The public input retains filing status for the married-filing-
separately AGI threshold.

## Sources and regression fixtures

The regression fixtures use deliberately synthetic identities and independently
chosen dollar amounts. Expected values are worked from the publications below;
benchmark golden files are unchanged.

- [IRS Publication 560, chapter 5, deduction worksheet](https://www.irs.gov/publications/p560)
- [IRS one-participant 401(k) guidance](https://www.irs.gov/retirement-plans/one-participant-401k-plans)
- [Instructions for Form 8995-A](https://www.irs.gov/instructions/i8995a)
- [IRC 199A, especially (d)(3) and (i)](https://uscode.house.gov/us/usc/119-120/t26/s199A/)
- [Draft 2026 Form 8995 instructions; not for filing](https://www.irs.gov/pub/irs-dft/i8995--dft.pdf)
- [2026 rates and thresholds, Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf)
- [IRS Publication 505](https://www.irs.gov/publications/p505)
- [Instructions for Form 2210](https://www.irs.gov/instructions/i2210)
