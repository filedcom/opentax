# TY2025 Form 8889 prior-year funding-transfer eligibility

Current evidence: [five complete history returns](#october-9-complete-return-history-checkpoint) pass local XSD with 44 reviewed PDF pages; native Part VII omissions and direct-PDF consistency gaps remain deferred. Historical unrun labels below apply only outside this checkpoint.

## December 2024 last-month election with one IRA funding transfer (2026-10-01, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) send
failed last-month-rule contributions to Part III line 18 and failed qualified
IRA-to-HSA funding distributions to line 19. One unmarried, under-55 primary
owner with self-only HDHP coverage only in December 2024 can now combine the two
source histories when the sole 2024 HSA funding was one December IRA transfer.
Reviewed filed 2024 Form 8889 lines 2-10 and 13 must show a $4,150 elected
limit, zero personal and employer contributions, and line 10 equal to the
trustee transfer. The separate 2024 eligibility record must show the same twelve
months, and the 2025 record must show a failure in the transfer testing period.
This yields zero on 2025 line 18 and the transfer amount on line 19, with 10%
additional tax on line 21. There is no HSA excess on Form 5329. Native and PDF
preflights replay the source and require exact Schedule 1 income, Schedule 2
tax, and final Form 1040 totals.

This is a direct extension of the one filed-line-10 source field from zero to a
nonnegative amount, with the positive amount admitted only for the narrow
December transfer. The broader paired, mixed-month, age-55, multi-transfer, and
overlapping-contribution combinations remain closed. Filed-return, trustee, and
HDHP references are reviewed entries, not authenticated bytes; positive and
altered-source/return fixtures await the bulk validation pass.

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
describe the qualified HSA funding distribution testing period as beginning in
the transfer month and ending on the last day of the twelfth following month.
For a 2024 transfer, 2025 Part III line 19 can only recapture a transfer whose
testing period was still intact at the start of 2025 and then failed during its
remaining 2025 months.

The prior-year transfer evidence now includes twelve month-by-month 2024 HDHP
eligibility entries and a reference to the eligibility record, in addition to
the trustee source for each transfer and the filed 2024 Form 8889 line 10. Each
transfer requires eligible coverage in its transfer month and every later 2024
month. A gap before the transfer does not disqualify it; a gap after the
transfer means the failure belonged to 2024 and cannot be charged again on the
2025 form. The existing 2025 monthly facts identify which still-open transfer
testing periods fail in 2025 and reconcile their sum to line 19.

This is a source reconciliation of supplied monthly facts and references. It
does not authenticate HDHP enrollment, Medicare status, the filed 2024 return,
or trustee records. Apart from the narrow December case above, the 2024 last-month-rule and
qualified-funding-transfer combination remains outside this calculation. Focused cases cover
missing prior-year monthly facts, missing source reference, an ineligible month
after transfer, and an ineligible month before transfer. They are written but
unrun pending the coordinated validation batch.

## 2024 married one-HSA self-only last-month rule (written, unrun)

The
[2024 Form 8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2024.pdf)
and
[2025 Part III instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf)
support a bounded additional recapture case: a married owner with no separate
spouse HSA, self-only December 2024 HDHP coverage, earlier ineligible months,
and no 2024 family-coverage month. The filed 2024 lines 3, 5, 6, 7, and 8 must
show the $4,150 self-only limit plus any owner age-55 catch-up on line 3, with
zero on line 7. The calculator uses the actual monthly eligibility to
redetermine the limit without the election, then routes the excess to 2025 Form
8889 line 18, Schedule 1 line 8f, and Schedule 2 line 17d. Generic native MeF
and PDF mappings already carry the computed Part III lines; focused positive and
contradictory-source cases are written but unrun.

For a married one-HSA owner under age 55 who had earlier 2024 family coverage
but self-only coverage on December 1, the calculator now reconstructs both
alternatives required by the 2024 line 3 instructions: the monthly worksheet and
the $4,150 December self-only limit. Filed lines 3, 5, 6, 7, and 8 must match
the greater amount, with zero on line 7. The actual-month worksheet then
redetermines 2025 line 18. Focused cases cover an elected $4,150 limit that
produces recapture, a monthly worksheet above $4,150 that produces none, and a
contradictory filed line. These are written but unrun. The age-55 mixed
family/self-only route is described below. This does not independently prove
the filed 2024 return or 2025 coverage records.

## Married age-55 one-HSA family-to-self-only recapture (written, unrun)

For a married owner with no separate spouse HSA, earlier family coverage,
self-only December 2024 coverage, and a 2025 testing-period failure, the
calculator now refigures the 2024 age-55 mixed-coverage worksheet. Family
months use the $8,300 line-3 amount and put their prorated $1,000 catch-up on
line 7; self-only months use $5,150 in the line-3 worksheet. It verifies filed
2024 Form 8889 lines 3, 5, 6, 7, and 8 against those monthly facts before
recapturing contributions above the separately rounded actual-month lines 3
and 7. In the authored case, filed line 8 is $4,317 and the actual-month
limit is $1,980, producing 2025 line 18 income of $2,337 and line 21 tax of
$233.70. Native and PDF export recompute the retained owner source and compare
Schedule 1 income, Schedule 2 tax, and Form 1040 totals. Positive and source,
print-line, and return-tamper fixtures await the shared validation batch.
The [2024 Form 8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2024.pdf)
give separate line-3 and line-7 worksheets for married age-55 owners with
family coverage. Filed-return and coverage references remain unauthenticated;
the separate-spouse-HSA and combined prior funding-transfer cases remain open.

## October 9 complete-return history checkpoint

Five constructed public-entry returns now cover the related prior-year funding, failed testing-period and carried-excess cases below. This supersedes the historical unrun labels only for these exact cases and the four selected source modules. All have primary W2 wages90,000 and withholding12,000, no dependents, explicit owner identities and synthetic reviewed prior-year records. The funding case is single; the other four file jointly. No runtime implementation changed.

| History | HSA deduction | Additional income | Additional tax before output rounding | Regular tax | Printed total tax | Refund |
|---|---:|---:|---:|---:|---:|---:|
| Age55 mixed 2024 coverage and failed testing period | 0 | 2,337 | 233.70 | 6,822 | 7,056 | 4,944 |
| December2024 IRA funding transfer, failed in2025 | 0 | 1,000 | 100 | 11,475 | 11,575 | 425 |
| Both owners' 2024 last-month election, failed in2025 | 3,000 | 7,320 | 732 | 7,062 | 7,794 | 4,206 |
| Primary carries prior excess; spouse ordinary contribution | 5,300 | 0 | 42 | 5,910 | 5,952 | 6,048 |
| Both owners carry separate prior excess | 8,600 | 0 | 84 | 5,514 | 5,598 | 6,402 |

The independent source/Decimal replay derives expectations before comparing return results. The [2024 Form8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2024.pdf) supply the monthly limits: two family months and one self-only month for the married age55 owner produce separately rounded line3/line7 amounts1,813/167, leaving2,337 of the filed4,317 contribution subject to recapture. In the paired case, one family month with equal allocation permits346 per owner without the election; each contributed4,006, leaving3,660 recapture. Their current-year contributions total3,000. Under the [2025 PartIII instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf), the sole December2024 IRA transfer instead produces line19 income1,000 and tax100, with no line18 income or Form5329.

The [2025 Form5329 instructions](https://www.irs.gov/pub/irs-prior/i5329--2025.pdf) reconcile prior excess separately: primary3,000 less unused2025 contribution room2,300 leaves700; spouse4,000 less room3,300 leaves700. Each year's end balance exceeds700, so each remaining excess produces42 tax. Absorbed prior excess increases that owner's HSA deduction to4,300. The [2025 tax table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) supplies regular tax at taxable incomes60,837,75,250,62,820,53,200 and49,900 respectively; the first case retains233.70 computational tax and prints234 consistently in Form8889, Schedule2 and Form1040.

All five packets pass the canonical local TY2025v5.4 Return1040 XSD. Every PDF page is accounted for:44 total,38 distinct pages visually inspected across19 contact sheets andsix exact rendered-image matches. Review covers owner SSNs, single/joint status, family/self-only marks, Form8889 PartIII, Form5329 PartVII, Schedules1/2 and final refunds. No clipping was observed, and outputs have no remaining AcroForm fields/widgets. The prior-excess packets retain the existing extra Form5329 first page with no positive PartI amounts.

**Native parity remains incomplete.** The three prior-excess Form5329 copies emit only total excess700 and tax42, omitting positive supporting lines42/43/45/46 that print correctly: primary3,000/2,300/2,300/700; spouse4,000/3,300/3,300/700. The existing deferred PartVII mapping item now includes this evidence. XSD validity does not establish complete form reporting. Source references and reviewed-return flags do not authenticate a prior accepted filing, trustee record, coverage history or allocation agreement; those broader requirements remain open.

Private evidence is retained at `.state/research/form8889-history-2026-10-09/`: extracted source constructors, final public inputs/executions, XML/PDF/prepared data, independent oracle, typed logs, rendered pages and native qualification report. Committed history fixtures, expected amounts and tests preserve the portable return checks. No main-board parent is closed by these bounded cases.

Typed verification: **6/0 public-return tests** and **19/0 existing source tests** across four modules. Five positive cases reconcile each owner, HSA deduction/recapture, prior-excess absorption, Schedules 1/2, native form counts, printed total tax and final refund. Thirty changed-source/return variants reject native assembly; 24 reject the direct Form 8889 PDF descriptor. Six direct PDF variants accept altered AGI or additional tax and extend deferred83; the private probe retains each result. The test excludes only those six from rejection assertions and does not encode their acceptance as desired behavior. This is not evidence that a complete altered PDF would render. Initial harness type errors and the failed negative check remain in separate logs; the final run uses normal type checking.
