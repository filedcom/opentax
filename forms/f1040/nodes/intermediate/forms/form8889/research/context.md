# Form 8889: Health Savings Accounts (TY2025)

The source of the printed line order and the routing below is the [2025 Form
8889](https://www.irs.gov/pub/irs-pdf/f8889.pdf) and its [2025
instructions](https://www.irs.gov/instructions/i8889). The local MeF shape is
`IRS8889.xsd` in the TY2025 v5.4 schema bundle.

## Current build pass

- Part I supports one primary-taxpayer HSA with a single HDHP coverage type for
  every eligible month. Contribution input requires explicit coverage type,
  confirmation that the type was constant, number of eligible months, age-55
  status, and a last-month-rule answer. The W-2 code W amount alone does not
  establish those facts. A last-month-rule election currently stops pending
  month-by-month source facts. Married family coverage with a separate spouse
  HSA also stops pending the spouse allocation and separate Form 8889.
- The 2025 line 3 limitation uses the monthly worksheet amount, not an assumed
  full year. For an age-55 married family filer, the additional contribution
  belongs on line 7; otherwise eligible catch-up is included on line 3. The
  Archer MSA offset reaches line 4. Taxpayer contributions are deductible only
  to the extent of line 8 less employer contributions; excess contributions
  route to Form 5329. Employer excess-income and withdrawal exceptions still
  need a full source audit, so employer funding above the limit stops rather
  than being treated as an ordinary deductible-contribution excess.
- Part II subtracts line 14b rollovers/timely excess withdrawals from line 14a
  before applying line 15 medical expenses. The taxable line 16 amount goes to
  Schedule 1 **line 8f**, not line 8z. The nonexcepted 20% line 17b tax goes to
  Schedule 2 line 17c. A taxable distribution needs an explicit answer about
  whether all of it qualifies for the additional-tax exception; the current
  all-or-none answer does not classify partly excepted distributions.
- Part III accepts a sourced prior-year last-month-rule excess amount and/or
  prior qualified HSA funding distribution after confirmation that death or
  disability does not excuse the testing-period failure. It sums lines 18 and
  19 into line 20 for Schedule 1 line 8f and computes line 21 at 10% for
  Schedule 2 line 17d. Prior-year source amounts are entered and identified,
  not independently authenticated or reconstructed from the prior return.
- The tax node self-emits calculated print lines. Native MeF and PDF builders
  consume those same fields. The MeF form requires the primary beneficiary's
  SSN; a spouse's separate HSA form is not inferred from a joint filing.

## Still open

Mixed monthly self-only/family coverage, the last-month rule and later-year
testing-period ledger, Medicare and other month-specific ineligibility,
married family spouse allocation, separate spouse forms, partially excepted
taxable distributions, qualified funding distributions in the current year,
employer contribution year adjustments, excess-contribution withdrawal
treatment, source authentication, PDF visual verification, IRS business rules,
and ATS acceptance remain unverified. All newly written cases await the one
full test batch requested by the user.
