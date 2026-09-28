# TY2025 Form 8889 age-65 distribution exception

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889), lines
17a and 17b, exclude from the additional 20% tax distributions made after the
HSA beneficiary turns 65. The distribution remains taxable on line 16 when it
was not used for qualified medical expenses.

The single-owner calculator now requires dated transaction evidence for a
positive age-65 exception. The beneficiary's date of birth and its reference
establish the 65th birthday. Each 2025 withdrawal has a distinct source
reference, date, gross amount, and qualified-medical amount. The transaction
gross and qualified amounts must equal Form 8889 lines 14a and 15; the taxable
amount of transactions dated on or after the 65th birthday must equal the
claimed exception portion of line 16. This handles both wholly and partly
excepted taxable distributions, with the remaining taxable portion charged 20%
on line 17b. An unsupported positive exception or inconsistent dates and amounts
reject. A bounded HSA-to-HSA rollover can now coexist with the age-65 exception
on line 14b. Every dated transaction explicitly states its excluded rollover
amount, including zero for non-rollover rows. Exactly one positive allocation
must match the separately sourced rollover's amount, distribution date, and
trustee-transaction reference. The rollover dollars are subtracted before
computing the post-65 taxable exception, so they cannot also be exempted from
the 20% tax. The 60-day redeposit and same-beneficiary source checks still
apply. Timely excess withdrawals and employer excess withdrawals remain closed
with age-65 evidence because they lack this transaction allocation.

The dated withdrawals now each require a Form 1099-SA source reference. Each
referenced form must use distribution code 1 and its box 1 gross must equal the
sum of its linked transactions. A missing form, unknown reference, or annual
total that balances while individual forms do not balance rejects. This is a
direct source-schema cutover, with no old unlinked age-65 evidence accepted.

For a February 29 beneficiary born in 1960, the 65th anniversary falls in
non-leap 2025. The calculator now treats February 28 as the age-attainment day:
the [2025 IRS Publication 554](https://www.irs.gov/publications/p554) states
that federal tax age 65 is attained the day before the 65th birthday, and this
is applied to the
[Form 8889 line 17 exception](https://www.irs.gov/instructions/i8889). The same
attainment-day rule applies to ordinary birthdays. Dated withdrawals before and
on February 28 are distinguished in focused calculator and paired MeF/PDF cases,
written but unrun. Paired export continues to recompute both owners from source
and compare the printed exception and penalty to return totals.

These are entered references and dates, not independently authenticated trustee
or identity documents. A separately sourced disability exception now has a
bounded route, documented in
[the disability gap note](ty2025-form8889-disability-exception-gap.md). Death,
combined exception types and other line 14b exclusion combinations remain open.
Focused calculator, MeF, and PDF projection cases for the rollover combination
are written but unrun. No typecheck, XSD, filled PDF, business-rule, or ATS
result is claimed.
