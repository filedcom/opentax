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

## Box 4 recovery audited with the points route

[2025 Publication 525](https://www.irs.gov/publications/p525) says Form 1098 box 4 is a 2025 refund of mortgage interest paid in an earlier year. It does not reduce current-year box 1 interest. Taxable recovery depends on the earlier deduction and tax benefit. A positive box 4 now requires personal Schedule A routing, an identified lender, recipient TIN, distinct payer-copy reference, `box4_prior_year_refund: true`, a reviewed Pub. 525 recovery workpaper reference, and `box4_taxable_recovery_verified_amount` from zero through box 4. Duplicate copies reject. Current box 1 interest stays on Schedule A line 8a; only the reviewed taxable recovery routes to Schedule 1 line 8z and AGI. Native and PDF Schedule 1 exports require the taxpayer or joint-filing spouse as recipient and an exact match to the sourced recovery. Same-year netting, business/rental recovery without its own route, and unsourced full-refund taxation reject. A synthetic $2,000 prior-year refund with $1,200 reviewed taxable recovery and $18,000 current interest passes local TY2025 v5.4 full-return XSD; all five filled PDF pages were inspected in the [v58 review](ty2025-filled-pdf-review-2026-09-29.md). Payer-issued bytes, the actual Pub. 525 calculation, IRS business rules, ATS, and the final bulk regression remain open.
