# TY2025 Form 1098 box 6 points

The [2025 Schedule A instructions](https://www.irs.gov/instructions/i1040sca) put deductible mortgage interest **and points reported on Form 1098** on line 8a. Line 8c is for points **not** reported on Form 1098. The [2025 Form 1098 instructions](https://www.irs.gov/pub/irs-prior/i1098--2025.pdf) say box 6 reports points paid on the purchase of a principal residence, but the lender reports the points in the closing year regardless of the taxpayer's accounting method. The box 6 source amount alone therefore does not establish the current-year deduction; Pub. 936 and the Schedule A mortgage limits still matter.

The Form 1098 input keeps `box6_points_paid` as the information-return amount. A positive box 6 requires an identified lender, recipient TIN, distinct payer-copy reference, reviewed Pub. 936 workpaper reference, and `box6_current_year_deductible_points` between zero and box 6. Duplicate payer-copy references reject. Only the approved amount is added to Schedule A line 8a; it cannot flow to line 8c. Native and PDF Schedule A export check that claimed points are present in line 8a and belong to the taxpayer or joint-filing spouse. A zero current-year deduction is an explicit reviewed determination, not an implicit drop. If the reviewed current-year amount is less than box 6, any later-year amortization remains an external workpaper obligation; this node does not create a future-year carryforward.

Business/rental routing, ordinary refinancing, and DEDM override with positive box 6 reject. These cases cannot be silently ignored or treated as fully deductible purchase points. A full return with $18,000 of box 1 interest and $2,400 of box 6 points reaches Schedule A line 8a and Form 1040 itemized deductions and passes local TY2025 v5.4 XSD. Sixty focused source/native/PDF descriptor tests pass. All three pages of a filled PDF from that synthetic source were inspected and reconcile to the native return; see the [v57 review](ty2025-filled-pdf-review-2026-09-29.md). The actual payer-issued copy, Pub. 936 calculation evidence, cross-source mortgage allocation, IRS business rules, and ATS acceptance remain open; the final bulk regression is deferred until implementation is complete.

## Construction-debt refinance exception (implementation written; untested)

The [2025 Form 1098 instructions](https://www.irs.gov/pub/irs-prior/i1098--2025.pdf)
exclude ordinary refinancing points from box 6, but allow qualifying points on
a loan that refinances debt incurred to construct a principal residence. The
[2025 Publication 936](https://www.irs.gov/publications/p936) generally spreads
refinancing points over the loan term. Ordinary refinancing points therefore
need a separate, unreported-points Schedule A line 8c source route.

The new box 6 construction-refinance input requires the original construction
loan and closing-disclosure references, original debt covering the refinanced
principal, loan term, a distinct month-identified record for every consecutive
monthly payment through December 2025, and explicit review of principal-residence,
direct-payment, and acquisition-debt-limit conditions. It computes the current
deduction as reported points times 2025 payment months divided by loan-term
months, rounded to whole dollars. An asserted current-year amount is rejected
for this route. The computed amount joins box 1 interest on Schedule A line 8a;
the remaining points need a durable later-year amortization ledger. A synthetic
$2,000 box 6 / 180-month / six-payment example is written to expect $67 on
line 8a, or $18,067 with $18,000 of box 1 interest. These fixtures have not run
under the agreed implementation-first workflow. The lender-issued copy, payment
and debt records, full Pub. 936 mortgage-limit review, PDF packet, business
rules, and ATS remain open.

## Ordinary refinance points outside box 6 (implementation written; untested)

The separate public `mortgage_refinance_points` source records the linked
payer-issued Form 1098, closing disclosure, Pub. 936 workpaper, borrower,
qualified-home debt, loan term, service-fee exclusion, and consecutive 2025
payment records. It accepts only points that the payer did not report in box 6,
with no cash-out beyond qualified prior home debt. It spreads interest-like
points over the loan term and deposits the rounded 2025 portion on Schedule A
line 8c. Native and PDF Schedule A export require the borrower to match the
taxpayer or joint-filing spouse, the linked Form 1098 to have no box 6 points,
and the filed line 8c amount to equal the source calculation. The associated
Form 1098 box 1 interest continues separately to line 8a.

A synthetic $3,000 charge with $1,000 of service fees and six payments on a
180-month loan is written to expect $67 on line 8c, $18,000 on line 8a, and
$18,067 on Form 1040 line 12e. The focused cases, full-return XSD fixture,
and filled-PDF fixture have not run under the agreed implementation-first
workflow. This bounded route does not resolve mixed acquisition/cash-out
allocation beyond the qualified improvement case below, later-year amortization
beyond the 2024-origin slice below,
multiple-source mortgage-limit allocation beyond the bounded two-loan route,
payer-issued bytes, business rules,
or ATS acceptance.

The ordinary line 8c source now uses one `refinance_close_year` and
`refinance_close_month` pair. For a 2024 closing, it requires a referenced
filed 2024 return, its loan-specific points workpaper, distinct consecutive
2024 payment records through December, and the precise 2024 deduction
recomputed from the loan's interest-like points and term. The 2025 side must
have twelve consecutive payment records, a matching 2025 payer Form 1098,
and enough term and remaining unamortized points for the claimed amount.
The bounded $2,000 interest-like-points / 180-month / six prior-payments and
twelve current-payments fixture expects $67 on the 2024 ledger and $133 on
2025 Schedule A line 8c. Prior-year improvement and early-payoff combinations
remain excluded until their opening balance can be reconciled. The filed
return/workpaper bytes and mortgage-limit allocation across loans beyond the
bounded two-loan route remain open;
the fixture is unrun pending the combined batch.

A bounded mixed-use improvement route now records the portion of new loan
principal used to repay qualified old home debt and the portion used to
substantially improve the main home. The two amounts must exactly cover the
new principal, so personal cash-out remains excluded. The improvement portion
requires a cited expense record and affirmative review of the main-home,
substantial-improvement, Pub. 936 first-six tests, and own-funds conditions.
It deducts that portion of interest-like points immediately, then spreads
the remaining interest-like points over the payment months and loan term.
The Pub. 936 example of a $100,000 refinance with $75,000 to repay old debt,
$25,000 for improvement, $2,000 of interest-like points, and six 2025 payments
on a 180-month loan yields $500 immediately plus $50 ratably, or $550 on
Schedule A line 8c. A focused fixture is written but unrun. The source still
requires the reviewed acquisition-debt-limit condition; whole-return
mortgage-limit allocation beyond the bounded two-loan route and underlying
expense bytes remain open.

For a 2025 ordinary refinance that is fully paid off in 2025, the source may
now include `early_payoff_2025` with a full-payoff statement reference, the
payoff month, explicit full-payoff verification, and confirmation that the
borrower did not refinance with the same lender. Distinct monthly payment
records must run consecutively from the first claimed payment through the
payoff month, with no later record. The remaining interest-like points are
deducted in the payoff year on line 8c, while service-fee points stay excluded.
The same-lender refinance exception is rejected by the strict source schema;
it needs a separate new-loan amortization record. A synthetic three-payment
July–September payoff case is written to expect $2,000 of line 8c points from
$3,000 charged less $1,000 of service fees. The fixture remains unrun until
the combined batch. This route does not prove the payoff statement's bytes,
historical amortization, or multiple-debt limit allocation.

## Bounded two-loan mortgage limit (implementation written; untested)

For a single filer with exactly two full-year Form 1098 acquisition loans
originated after December 15, 2017, the public
`f1098_mortgage_limit_review` workpaper joins both payer copies. It requires
twelve distinct monthly lender balance references per loan, matching source
references, a complete-mortgage review, and confirmation that both debts are
post-2017 home acquisition debt. The source computes the average of each
loan's twelve closing balances, adds them for Publication 936 Table 1 line 12,
then rounds the $750,000/line 12 ratio to three decimal places for line 14.
The two reviewed Form 1098 box 1 deductible amounts must sum to the Table 1
line 15 result. Native and PDF Schedule A require the final filer to be single,
both payer recipients to match, and line 8a to equal that result. Other
mortgage interest and unreported points routes reject in this bounded case.
An active Form 8396 mortgage-interest credit also rejects in both exporters.

A synthetic pair of $500,000 and $400,000 monthly balances with $20,000 and
$16,000 of reported interest yields a .833 ratio and $29,988 on Schedule A
line 8a. Source and full-return XSD fixtures are written but unrun under the
implementation-first workflow. These structured records do not authenticate
the lender statements, and this slice does not cover grandfathered debt,
mixed-use debt, second homes, part-year loans, joint/MFS limits, points,
Form 8396 interaction, or other mortgage sources.

## Box 4 recovery audited with the points route

[2025 Publication 525](https://www.irs.gov/publications/p525) says Form 1098 box 4 is a 2025 refund of mortgage interest paid in an earlier year. It does not reduce current-year box 1 interest. Taxable recovery depends on the earlier deduction and tax benefit. A positive box 4 now requires personal Schedule A routing, an identified lender, recipient TIN, distinct payer-copy reference, `box4_prior_year_refund: true`, a reviewed Pub. 525 recovery workpaper reference, and `box4_taxable_recovery_verified_amount` from zero through box 4. Duplicate copies reject. Current box 1 interest stays on Schedule A line 8a; only the reviewed taxable recovery routes to Schedule 1 line 8z and AGI. Native and PDF Schedule 1 exports require the taxpayer or joint-filing spouse as recipient and an exact match to the sourced recovery. Same-year netting, business/rental recovery without its own route, and unsourced full-refund taxation reject. A synthetic $2,000 prior-year refund with $1,200 reviewed taxable recovery and $18,000 current interest passes local TY2025 v5.4 full-return XSD; all five filled PDF pages were inspected in the [v58 review](ty2025-filled-pdf-review-2026-09-29.md). Payer-issued bytes, the actual Pub. 525 calculation, IRS business rules, ATS, and the final bulk regression remain open.
