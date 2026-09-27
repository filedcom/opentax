# Form 8889: Health Savings Accounts (TY2025)

The source of the printed line order and the routing below is the
[2025 Form 8889](https://www.irs.gov/pub/irs-pdf/f8889.pdf) and its
[2025 instructions](https://www.irs.gov/instructions/i8889). The local MeF shape
is `IRS8889.xsd` in the TY2025 v5.4 schema bundle.

## Current build pass

- Part I supports one primary-taxpayer HSA with twelve monthly eligible-HDHP
  coverage facts, age-55 status, and a last-month-rule answer. The W-2 code W
  amount alone does not establish those facts. Mixed self-only/family and
  partial-year limits use the monthly worksheet; an elected last-month rule
  requires December eligibility and uses its coverage for the year. Married
  family coverage with separate spouse HSAs now requires the agreed allocation
  of the refigured family limit on line 6; no 50/50 default is assumed. A
  spouse's own Form 8889 is not generated from the primary form's facts.
- The 2025 line 3 limitation uses the monthly worksheet amount, not an assumed
  full year. For an age-55 married family filer, the additional contribution
  belongs on line 7; otherwise eligible catch-up is included on line 3. The
  Archer MSA offset reaches line 4. Taxpayer contributions are deductible only
  to the extent of line 8 less employer contributions. Remaining personal and
  employer excess contributions route to Form 5329 with the December 31 HSA
  value needed for its 6% tax base. Employer excess above line 8 less qualified
  funding distributions requires explicit W-2 box 1 inclusion and timely
  withdrawal facts. If omitted from W-2 income, the excess reaches Schedule 1
  other income; if already included, it is not counted as income twice. A timely
  employer withdrawal reduces the Form 5329 excess base. A 2025 withdrawal
  reaches Form 8889 line 14b and its earnings reach Schedule 1; a 2026
  withdrawal and its earnings stay off the 2025 distribution and earnings lines.
  Twelve explicit ineligible months produce a zero contribution limit and still
  route sourced employer excess to income and Form 5329.
- A single traditional/Roth IRA-to-HSA direct trustee transfer can populate line
  10 when the transfer month is eligible, the source is identified, and the
  taxpayer affirms no prior qualified funding distribution. It reduces line 12
  and available personal contribution room. The permitted second
  self-only-to-family transfer, external IRA reconciliation, and later testing
  period remain open.
- Part II separately identifies line 14b rollovers and timely excess withdrawals
  before applying line 15 medical expenses. A timely withdrawal explicitly
  sourced to a current-year personal excess reduces the Form 5329 excess base;
  its earnings reach Schedule 1 other income for the year withdrawn. A
  separately sourced 2026 withdrawal of 2025 personal excess also reduces the
  2025 Form 5329 base, but its principal and earnings stay off the 2025
  distribution and income lines. The taxable line 16 amount goes to Schedule 1
  **line 8f**, not line 8z. The nonexcepted 20% line 17b tax goes to Schedule 2
  line 17c. A taxable distribution needs the explicit portion qualifying for an
  additional-tax exception; line 17a is checked when that portion is positive
  and line 17b taxes only the remainder. This also covers mixed excepted and
  nonexcepted distributions.
- Part III accepts a sourced prior-year last-month-rule excess amount and/or
  prior qualified HSA funding distribution after confirmation that death or
  disability does not excuse the testing-period failure. It sums lines 18 and 19
  into line 20 for Schedule 1 line 8f and computes line 21 at 10% for Schedule 2
  line 17d. Prior-year source amounts are entered and identified, not
  independently authenticated or reconstructed from the prior return.
- The tax node self-emits calculated print lines. Native MeF and PDF builders
  consume those same fields. The MeF form requires the primary beneficiary's
  SSN; a spouse's separate HSA form is not inferred from a joint filing.

## Still open

The later-year last-month-rule testing-period ledger, evidence for monthly
eligibility (including Medicare and other disqualifying coverage), source
verification of the spouse allocation, separate spouse forms, source
classification of taxable distributions by exception, second qualified funding
distributions, employer contribution year adjustments, withdrawals of prior-year
excess, 2026 reporting of a post-year timely employer withdrawal, related income
outside the current-year personal 2025 route, source authentication, PDF visual
verification, IRS business rules, and ATS acceptance remain unverified. All
newly written cases await the one full test batch requested by the user.
