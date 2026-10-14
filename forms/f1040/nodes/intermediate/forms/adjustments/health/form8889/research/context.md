# Form 8889: Health Savings Accounts (TY2025)

The source of the printed line order and the routing below is the
[2025 Form 8889](https://www.irs.gov/pub/irs-pdf/f8889.pdf) and its
[2025 instructions](https://www.irs.gov/instructions/i8889). The local MeF shape
is `IRS8889.xsd` in the TY2025 v5.4 schema bundle.

## Current build pass

- Part I requires an identified HSA beneficiary. W-2 code W deposits retain each
  employee SSN and must match exactly one filed beneficiary; direct and W-2
  employer amounts for the same person cannot both be used. Mixed
  self-only/family and partial-year limits still use the monthly worksheet for
  one HSA. A bounded two-spouse route accepts two identified account sources
  only with twelve months of family coverage for each, no last-month election, a
  documented agreed line 6 allocation totaling the $8,550 family limit, and no
  owner-level excess requiring Form 5329. The node computes each Form 8889
  separately and sums their line 13 deductions on Schedule 1 and AGI. MeF emits
  two native IRS8889 documents, and the PDF descriptor fills two pages with each
  beneficiary's own name and SSN. The MeF route also compares combined
  deductions and income/tax lines to Schedule 1, Schedule 2, and Form 1040
  line 10. The [2025 instructions](https://www.irs.gov/instructions/i8889)
  require separate spouse forms and their combined line 13 amount. The export
  guard now recomputes each owner's printed lines from both source records for
  full-year family coverage and the documented $8,550 allocation, as it already
  did for full-year separate self-only coverage. This is bounded to positive
  personal contributions without employer funding, distributions, funding
  transfers, testing-period income, or excess requiring Form 5329. Tampered
  allocation or owner lines stop before either MeF or PDF output.
- The 2025 line 3 limitation uses the monthly worksheet amount, not an assumed
  full year. For an age-55 married family filer, the additional contribution
  belongs on line 7; otherwise eligible catch-up is included on line 3. The
  Archer MSA offset reaches line 4. Taxpayer contributions are deductible only
  to the extent of line 8 less employer contributions. Remaining personal and
  employer excess contributions route to Form 5329 with the December 31 HSA
  value needed for its 6% tax base. Employer excess above line 8 less qualified
  funding distributions requires the exact portion already included in W-2 box 1
  and timely withdrawal facts. Only the excess not already included in wages
  reaches Schedule 1 other income. A timely employer withdrawal reduces the Form
  5329 excess base. A 2025 withdrawal reaches Form 8889 line 14b and its
  earnings reach Schedule 1; a 2026 withdrawal and its earnings stay off the
  2025 distribution and earnings lines. Twelve explicit ineligible months
  produce a zero contribution limit and still route sourced employer excess to
  income and Form 5329.
- One direct traditional/Roth IRA-to-HSA trustee transfer can populate line 10
  when its transfer month is eligible, the source is identified, and the
  taxpayer affirms no earlier funding distribution. A second distinct transfer
  is allowed only in a later month of the same year after self-only coverage
  changes to family coverage. The sum is capped by the family contribution limit
  and available Form 8889 line 8 room. Each transfer has its own later testing
  period. External IRA reconciliation and later testing-period verification
  remain open.
- Employer line 9 follows the 2025 Employer Contribution Worksheet: W-2 box 12
  code W less deposits made in 2025 for 2024, plus deposits made in 2026 for
  2025. Both year-allocation amounts are explicit source facts when code W is
  positive; a 2026-only 2025 deposit is also accepted. Missing W-2 year facts
  stop rather than silently treating code W as tax-year contributions.
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
  line 17d. A positive line 19 now also needs all twelve 2025 monthly
  eligible-HDHP facts and dated trustee-transfer evidence. For 2024 transfers,
  the evidence total must equal filed 2024 Form 8889 line 10, and the taxpayer
  must supply a referenced 2024 monthly eligibility record showing no gap from
  each transfer month through year-end. For 2025 transfers,
  the evidence must exactly match Part I's sourced line 10 transfers. The node
  uses the first ineligible 2025 month to include only transfers whose testing
  period is still open. The
  [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) define
  each transfer's testing period as the transfer month through the last day of
  the twelfth following month. This is reconciliation of supplied facts, not
  authentication of HDHP enrollment, the filed prior return, or trustee
  confirmation. The separate
  line 18 last-month-rule excess is still an identified input rather than
  reconstructed from the prior return.
- The tax node self-emits one or two owner-labeled computed form instances.
  Native MeF and PDF builders consume those same fields, including each
  beneficiary's name and SSN. A spouse form is emitted only from a separate
  sourced spouse account, never inferred from a joint filing.

## Still open

The paired export route still rejects partial-year or mixed family/self-only
allocation, last-month-rule use, employer-only or distribution-only filings, and
either owner's excess that would require separate Forms 5329. The later-year
last-month-rule testing-period ledger, independent evidence for monthly
eligibility (including Medicare and other disqualifying coverage), source
verification of the spouse allocation, source classification of taxable
distributions by exception, second qualified funding distributions, source
authentication of employer contribution-year adjustments, withdrawals of
prior-year excess, 2026 reporting of a post-year timely employer withdrawal,
related income outside the current-year personal 2025 route, source
authentication, PDF visual verification, IRS business rules, and ATS acceptance
remain unverified. All newly written cases await the one full test batch
requested by the user.
