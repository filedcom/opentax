# TY2025 Form 1098 box 6 points

## Issuer Copy B byte/content gate (implemented, unrun)

A strict 2025 Form 1098 Copy B verifier now accepts one identified source item,
an exact attachment filename and SHA-256 review, and the attachment bytes. It
opens the official revision's readable AcroForm fields and compares calendar
year, lender name, full or last-four borrower TIN, and boxes 1, 2, 4, 5, and 6
with the same `f1098` source used by Schedule A and Schedule 1. An optional
box 3 date is checked when supplied. Changed bytes, source reference, file,
tax amounts, or missing fields reject. Positive, changed-box, changed-hash, and
missing-field fixtures are authored for deferred validation. The field names
were read from the [official 2025 Form 1098 Copy B](https://www.irs.gov/pub/irs-prior/f1098--2025.pdf).

For a positive box 6 source, the public Form 1098 input now carries an
`issuer_copy` with filename, reviewed SHA-256, and exact PDF bytes. The MeF
bundle and filled-PDF builders require this evidence and invoke the same
Copy B verifier on the prepared `f1098` source before export. The issued
copy is retained as evidence and is not included in the transmitted MeF PDF
attachments. Positive, missing-copy, and changed-byte fixtures are authored
for the deferred bulk batch. The standalone synchronous XML construction
function does not authenticate external PDF bytes; filing uses the asynchronous
bundle path. The verifier is limited to readable official Copy B AcroForm values; scanned or
flattened copies, rendered-appearance differences, issuer provenance,
signature, and independently verified Pub. 936/Pub. 525 workpapers remain open.

The [2025 Schedule A instructions](https://www.irs.gov/instructions/i1040sca) put deductible mortgage interest **and points reported on Form 1098** on line 8a. Line 8c is for points **not** reported on Form 1098. The [2025 Form 1098 instructions](https://www.irs.gov/pub/irs-prior/i1098--2025.pdf) say box 6 reports points paid on the purchase of a principal residence, but the lender reports the points in the closing year regardless of the taxpayer's accounting method. The box 6 source amount alone therefore does not establish the current-year deduction; Pub. 936 and the Schedule A mortgage limits still matter.

The Form 1098 input keeps `box6_points_paid` as the information-return amount. A positive box 6 requires an identified lender, recipient TIN, distinct payer-copy reference, reviewed Pub. 936 workpaper reference, and `box6_current_year_deductible_points` between zero and box 6. Duplicate payer-copy references reject. Only the approved amount is added to Schedule A line 8a; it cannot flow to line 8c. Native and PDF Schedule A export check that claimed points are present in line 8a and belong to the taxpayer or joint-filing spouse. A zero current-year deduction is an explicit reviewed determination, not an implicit drop. If the reviewed current-year amount is less than box 6, any later-year amortization remains an external workpaper obligation; this node does not create a future-year carryforward.

Business/rental routing, ordinary refinancing, and DEDM override with positive box 6 reject. These cases cannot be silently ignored or treated as fully deductible purchase points. A full return with $18,000 of box 1 interest and $2,400 of box 6 points reaches Schedule A line 8a and Form 1040 itemized deductions and passes local TY2025 v5.4 XSD. Sixty focused source/native/PDF descriptor tests pass. All three pages of a filled PDF from that synthetic source were inspected and reconcile to the native return; see the [v57 review](ty2025-filled-pdf-review-2026-09-29.md). The actual payer-issued copy, Pub. 936 calculation evidence, cross-source mortgage allocation, IRS business rules, and ATS acceptance remain open; the final bulk regression is deferred until implementation is complete.

## Construction-debt refinance exception (bounded route verified 2026-10-05)

The [2025 Form 1098 instructions](https://www.irs.gov/pub/irs-prior/i1098--2025.pdf)
exclude ordinary refinancing points from box 6, but allow qualifying points on
a loan that refinances debt incurred to construct a principal residence. The
[2025 Publication 936](https://www.irs.gov/publications/p936) generally spreads
refinancing points over the loan term. Ordinary refinancing points therefore
need a separate, unreported-points Schedule A line 8c source route.

This box 6 exception is narrow: the points must be clearly designated and
computed as a percentage of principal, fit local established point-charging
practice, be for debt incurred by the payer to construct a residence intended
as the payer's principal home, be paid directly by the payer, and stay within
the $750,000 acquisition-debt limit. Refinance points allocable to debt above
the original construction debt do not qualify. The typed review records
affirmative reviewed findings for principal-residence intent, direct payment,
and the acquisition limit, plus original construction debt and refinanced
principal; this bounded route expects that reviewed evidence and does not
itself calculate a partial eligible share. The [Form 1098
instructions](https://www.irs.gov/pub/irs-prior/i1098--2025.pdf) also require
the lender to report qualifying points for the year of closing regardless of
the borrower's accounting method. For the taxpayer's deduction, Pub. 936's
general rule is ratable amortization over the loan term; its example uses the
number of 2025 monthly payments divided by total loan months.

The box 6 construction-refinance input requires the original construction
loan and closing-disclosure references, original debt covering the refinanced
principal, loan term, a distinct month-identified record for every consecutive
monthly payment through December 2025, and explicit review of principal-residence,
direct-payment, and acquisition-debt-limit conditions. It computes the current
deduction as reported points times 2025 payment months divided by loan-term
months, rounded to whole dollars. An asserted current-year amount is rejected
for this route. The computed amount joins box 1 interest on Schedule A line 8a;
the remaining points need a durable later-year amortization ledger. A synthetic
$2,000 box 6 / 180-month / six-payment example produces $67 of current-year
points and $18,067 of line 8a with $18,000 of box 1 interest. The focused run
passed **57/57** cases in `forms/f1040/nodes/inputs/f1098/index.test.ts`,
including invalid payment-month and caller-deduction rejection. The full-return
`XSD: Form 1098 construction-refinance points amortize on Schedule A` case
passed against the cached TY2025 v5.4 XSD; it emitted $18,067 on Schedule A
line 8a and Form 1040 line 12e.

The selected filled packet was generated and visually inspected on 2026-10-05:
three pages in Form 1040 / Form 1040 continuation / Schedule A order. Schedule A
line 8a and line 8e show $18,067, line 8b and line 8c are blank, and Form 1040
line 12e shows $18,067. Form labels/year, taxpayer identity, page order, and
legibility were checked. The local review artifact is
`.state/research/ty2025-1098-construction-review/`; its PDF SHA-256 is
`18b1fcd876d231c36bb9b443f6d7f9e5477a4f11974abe3bc9d93ccdfa1caa34`, XML
SHA-256 `9fe6eb0401144441c0303c3fc310ffe4f9ddae4fa42353d9c5edbf725f560219`,
and the schema digest is `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.

This verifies one synthetic route only. The lender-issued copy, authenticated
payment/debt records, full Pub. 936 mortgage-limit review, other refinance and
points combinations, IRS business rules, and ATS acceptance remain open; it
does not close the Form 1098 gap.

## Ordinary refinance points outside box 6 (bounded 2025 route verified)

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
180-month loan produces $67 on line 8c, $18,000 on line 8a, and $18,067 on
Form 1040 line 12e in the verified bounded route. This bounded route does not
resolve mixed acquisition/cash-out
allocation beyond the qualified improvement case below, later-year amortization
beyond the 2024-origin slice below,
multiple-source mortgage-limit allocation beyond the bounded two-loan route,
payer-issued bytes, business rules,
or ATS acceptance.

The bounded 2025 route was run on 2026-10-05. The input-node suite passed
7/7; the Form 1098 Copy B, Schedule A native, and Schedule A PDF suites passed
24/24; and the focused full-return test passed local TY2025 v5.4 XSD 1/1.
The selected packet generator produced a three-page PDF and matching XML for
`single-unreported-refinance-points`; PDF text extraction confirms Schedule A
line 8a $18,000, line 8c $67, line 8e $18,067, and Form 1040 line 12e
$18,067. Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-05-ordinary-refinance-points/`.
Manifest SHA-256 is
`d0944e5fd16fd1dbe7ca197071a74950a56d9f5df09e12609807c1b7f2160259`;
the XML and PDF SHA-256 values are `0201100810cc7408b36d1f4c8344a4897cbd587c48b7a58f10357c7a3f69404c`
and `3c5bc677bd8b199f80d2856a3bf83f3e4b6fbad0d0ba5601ec3926a9fb74a608`.
This is source-fixture, XSD, and text-projection evidence, not visual
signoff or proof of the lender/payment records. The 2024- and 2023-origin
ledgers and mixed-improvement extension below remain unrun. Issuer/source-byte
authentication, full mortgage-limit interaction, business rules, and ATS
remain open.

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

The same unreported-points path now accepts a 2023-origin ordinary refinance
when the source has separate reviewed filed 2023 and 2024 return/workpaper
references, consecutive payment records from each year's first payment through
December, and twelve 2025 payments. It recomputes both prior deductions,
requires distinct payment references across all three years, and limits the
2025 claim to the remaining interest-like points. In the bounded $2,000 / 180-
month loan closing in June 2023, six 2023 payments produce $67, twelve 2024
payments produce $133, and twelve 2025 payments produce $133 on Schedule A
line 8c. The linked 2025 Form 1098 box 1 interest remains on line 8a; the
2025 itemized total reaches Form 1040 line 12e. Native MeF and PDF use the
same source-replay gate. Focused positive/tamper and full-return XSD/PDF
fixtures are authored but unrun. [Publication 936](https://www.irs.gov/publications/p936)
requires ratable deduction of ordinary refinance points, and the [Schedule A
instructions](https://www.irs.gov/instructions/i1040sca) place unreported
points on line 8c. Historical return and lender/payment bytes remain
unauthenticated; improvement, payoff, mixed debt, and cross-loan limits remain
closed for this older vintage.

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

## Original bounded two-loan mortgage limit

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
line 8a. Source and full-return XSD fixtures passed locally. These structured records do not authenticate
the lender statements, and this slice does not cover grandfathered debt,
mixed-use debt, second homes, part-year loans, joint/MFS limits, points,
Form 8396 interaction, or other mortgage sources.

## Multiple full-year post-2017 mortgages (2026-10-03)

The original single-filer Table 1 review accepts two or more full-year
post-2017 acquisition loans. Its source list must match every Form 1098, with
twelve distinct monthly lender balances for each loan; one whole-return
average-balance ratio determines the exact sum of deductible box 1 interest.
When the combined monthly average is at or below $750,000, the ratio is one
and full reported interest may be claimed. Two or more eligible lender copies
whose box 2 principal snapshots total above $750,000 cannot reach native or
PDF Schedule A without that review, including when one copy's current
deduction is zero. The box 2 sum only triggers review; it is
not substituted for the Publication 936 average-balance calculation.

The focused case verifies three $300,000 loans with $3,000 interest produce
$2,499 at the three-decimal Table 1 ratio, including local TY2025 XSD-valid
XML and filled PDF. A second case verifies three $300,000 box 2 snapshots
with $200,000 monthly average balances permit the full $3,000; unreviewed
over-limit full and partial claims reject in both exporters. This remains a
bounded full-year route. Mixed debt ages, part-year balances,
points, other mortgage sources, authentic workpaper bytes, and IRS acceptance
remain open. [Publication 936 (2025)](https://www.irs.gov/publications/p936)

On 2026-10-04, the whole-return review also gained a verified filing-status
field for MFJ, HOH, and qualifying surviving spouse while retaining the
original Single field. A joint fixture places the third lender copy with the
spouse and checks $2,499 across native XML, locally validated TY2025 XSD, and
filled PDF. Two or more full-year post-2017 lender copies above the box 2
snapshot sum now trigger a review for every filing status: $750,000 for Single,
MFJ, HOH, and qualifying surviving spouse, and $375,000 for MFS. The supported
positive review remains full-year acquisition debt; MFS above its limit stays
guarded until its separate allocation is modeled. Status and recipient
identity must match the final return in both exporters.

The 2026-10-04 single-loan audit found that a full-year post-2017 loan with
box 2 principal above the applicable limit could otherwise claim all box 1
interest using only an individual workpaper reference. The same Table 1
review now accepts one lender source and its twelve monthly statements.
One $900,000 loan with $1,000 reported interest yields $833 at the .833
ratio in local XSD-valid native XML and filled PDF; a documented $600,000
monthly average permits the full $1,000 despite the box 2 snapshot. Native
and PDF export reject the $900,000 unreviewed claim. An entry with zero
Schedule A line 8a claim does not trigger that filing review.

## 2025 purchase mortgage without points (2026-10-04)

A new post-2017 acquisition loan originated in 2025 can now use the same
whole-return Table 1 review when no reported points need allocation. A
principal-residence purchase needs a closing-disclosure reference, verified
acquisition and no additional advances, its issued Form 1098 box 2 principal,
and twelve distinct monthly lender statement references. Months before the
July purchase carry zero; each subsequent month carries a positive balance
no greater than the origination principal. Its average divides those closing
balances by the six months the home was secured as a qualified home; a
preexisting full-year mortgage in the same review continues to divide by
twelve. Missing issued box 2 on a positive current-year claim rejects before
the debt-limit check.

A July $900,000 purchase with $1,000 interest yields a .833 Table 1 ratio and
$833 Schedule A line 8a interest. The source-backed case passed native XML,
local TY2025 XSD, and filled-PDF text inspection; the unreviewed version
rejects in both exporters. A $500,000 July purchase plus a $500,000 existing
loan yields $1,500 deductible from $2,000 reported, and its MeF bundle and
three-page PDF build. Positive points, mixed-use or refinance debt, part-year
ownership beyond this purchase pattern, authentic closing/statement bytes,
and ATS remain open. [2025 Publication 936](https://www.irs.gov/publications/p936)
describes lender monthly balances and Table 1, and the
[2025 Form 1098 instructions](https://www.irs.gov/pub/irs-prior/i1098--2025.pdf)
define box 2 for a current-year origination.

For a 2025 purchase combined with a preexisting mortgage, the retained review
now identifies two different properties and the prior home's second-home
election and occupancy record. A nonrented second home must not have been
held out for rent or resale. If rented, documented personal-use days must
exceed both 14 and 10% of fair-rental days; the two day counts cannot total
more than 365. A synthetic rented-home case with 100 rental and 15 personal
days passes source validation; 14 personal days, an impossible 400-day total,
or a repeated property reference rejects. The native/PDF combined-loan
fixture uses an unrented former main home. This review is also required for a
positive 2025 purchase plus preexisting mortgage when box 2 snapshots total
below $750,000; that case cannot bypass the second-home classification merely
because debt is under the limit. A reviewed $300,000 plus $300,000 pair carries
the full $2,000 interest to native MeF and filled PDF, while the unreviewed
pair rejects. Ownership, property-use, and
occupancy documents remain reviewed references rather than authenticated
bytes. [2025 Publication 936](https://www.irs.gov/publications/p936)
provides the second-home rules.

## One 2025 purchase loan with points and one existing mortgage (implementation written; untested)

The public `f1098_purchase_points_cross_loan_review` joins one 2025
principal-residence purchase Form 1098 with box 6 points and one full-year
post-2017 acquisition mortgage. The single-filer source identifies both payer
copies, the purchase closing disclosure, a Publication 936 points workpaper,
12 monthly lender statements for each loan, and a lender-certified maximum
balance covering every day of 2025 for each loan. The purchase loan has zero
balance before its origination month; its Form 1098 box 2 must match the
reviewed maximum original principal. The sum of the two daily maxima must not
exceed $750,000. Reviewed facts affirm that these are all qualified home
mortgages, that the purchase is a principal residence, and that the points
meet the immediate-deduction conditions. The two box 1 deductions and box 6
deduction must exactly equal their reported amounts. Native and PDF Schedule A
replay the two source identities and exact line 8a total and reject competing
line 8b/8c, refinance points, and Form 8396 claims. The synthetic $6,000 and
$12,000 interest plus $3,000 purchase points reaches $21,000 on Schedule A
and Form 1040.

On 2026-10-05, the authored positive full-return case passed local TY2025
v5.4 XSD validation: the source calculation carries $21,000 to Schedule A
line 8a and Form 1040 itemized deductions. The direct Schedule A PDF projection
case also passed, checking the same $21,000 amount and rejecting a changed
filed total or a second-loan recipient that is not the filer. Focused commands:
`deno test --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov --filter='2025 purchase points and an existing mortgage' forms/f1040/2025/mef/xsd-validation.test.ts`
(1 passed) and
`deno test --filter='Schedule A PDF replays purchase points and the second mortgage' forms/f1040/2025/pdf/forms/schedule_a.test.ts`
(1 passed). This exercises native XML and descriptor projection, not a rendered
filled packet. Issuer provenance, loan and points records, other loan counts,
and full mortgage-limit scope remain open.

This structured review does not authenticate lender-issued Form 1098 copies,
closing disclosure, lender maximum-balance certificates, or proof of direct
points payment. Cash-out debt, daily balances above $750,000, additional
mortgages, MFJ/MFS, and partial points deductions remain outside this route.
The [2025 Publication 936](https://www.irs.gov/publications/p936) combines
mortgages under the acquisition-debt limit, and the
[2025 Schedule A instructions](https://www.irs.gov/instructions/i1040sca)
place deductible Form 1098 interest and points on line 8a.

The purchase-points cross-loan review now also identifies distinct purchase
and prior-home properties and applies the same qualified second-home
occupancy test as the no-points combined review. Its former-home occupancy
record is required even while the two lender-certified maxima stay below
$750,000. A rented second home with 100 fair-rental and 15 personal-use days
passes source validation; 14 personal days or the same property reference
rejects. The structured occupancy record is not yet authenticated to source
bytes. [2025 Publication 936](https://www.irs.gov/publications/p936)
provides the second-home criteria.

## Positive Schedule A line 8a source presence

The [2025 Schedule A instructions](https://www.irs.gov/pub/irs-pdf/i1040sca.pdf)
place deductible interest and points reported on Form 1098 on line 8a;
unreported interest belongs on line 8b under its own rules. Native MeF and
PDF Schedule A exporters now reject a positive line 8a when the retained
`f1098` source is absent. They call one shared presence guard before the
existing Form 1098 owner, box 1, box 6, and mortgage-limit checks. The guard
does not change zero line 8a or the supported seller-financed line 8b route.
Direct native and PDF rejection tests, sourced Form 1098 descriptor cases, a
full-return Schedule A XSD case, and the affected gift-route regressions pass.
Unrelated Form 8283 examples no longer use unsupported mortgage interest to
raise their itemized deduction totals.

The presence guard alone does not prove the exact line 8a amount or the
authenticity of an issuer copy. The bounded cross-loan and mortgage-limit
reviews compare their own calculated totals; final bundle review separately
checks readable Copy B bytes where required. Other mortgage source routes,
Pub. 936 calculations, and IRS acceptance remain open.

## Positive line 8a amount replay

Both exporters now also compare the gross line 8a claim with the same retained
Form 1098 deductible box 1 interest plus deductible box 6 points aggregate
used by the source node. The check runs after owner and source review, before
the Form 8396 credit-interest reduction is printed. Direct native/PDF tests
reject a $19,000 or $21,000 claim against a $20,000 source and accept the
matching claim. Focused Schedule A and Form 1098 tests passed 27/27, and all
seven selected current-source Form 1098 packet cases remain exportable. This
is structured amount parity; independent issuer-byte proof, wider mortgage
limits, and IRS business-rule/ATS review remain open.

## Lender Copy B proof for bounded cross-loan reviews

Both the bounded purchase-points cross-loan review and the bounded two-loan
Pub. 936 mortgage-limit review now require exact issuer Copy B PDF bytes for
**each** Form 1098 at final native MeF-bundle and filled-PDF export. The
existing readable-field verifier checks the reviewed PDF digest, 2025 year,
lender, recipient TIN, origination date, and reported boxes 1, 2, 4, 5, and
6 against each claimed source. A second loan with only a structured
transcription can no longer enter either final export. A focused four-case
verifier/export suite passes, including a valid two-copy cross-loan source,
missing second copy at both exporters, and a byte-authenticated second copy
whose box 1 differs. The two-copy source also passes full-return execution,
native MeF-bundle construction, and a three-page filled-PDF build. The
synchronous XML construction function still cannot
authenticate external bytes; filing uses the asynchronous bundle path.

The issuer's provenance and any flattened/scanned Copy B remain unresolved.
The monthly statements, daily-maximum certificate, closing disclosure, and
Pub. 936 workpapers remain reference-only. Wider cross-loan combinations and
the final bulk regression remain open.

## Box 4 recovery audited with the points route

[2025 Publication 525](https://www.irs.gov/publications/p525) says Form 1098 box 4 is a 2025 refund of mortgage interest paid in an earlier year. It does not reduce current-year box 1 interest. Taxable recovery depends on the earlier deduction and tax benefit. A positive box 4 now requires personal Schedule A routing, an identified lender, recipient TIN, distinct payer-copy reference, `box4_prior_year_refund: true`, a reviewed Pub. 525 recovery workpaper reference, and `box4_taxable_recovery_verified_amount` from zero through box 4. Duplicate copies reject. Current box 1 interest stays on Schedule A line 8a; only the reviewed taxable recovery routes to Schedule 1 line 8z and AGI. Native and PDF Schedule 1 exports require the taxpayer or joint-filing spouse as recipient and an exact match to the sourced recovery. Same-year netting, business/rental recovery without its own route, and unsourced full-refund taxation reject. A synthetic $2,000 prior-year refund with $1,200 reviewed taxable recovery and $18,000 current interest passes local TY2025 v5.4 full-return XSD; all five filled PDF pages were inspected in the [v58 review](ty2025-filled-pdf-review-2026-09-29.md). Payer-issued bytes, the actual Pub. 525 calculation, IRS business rules, ATS, and the final bulk regression remain open.
