# TY2025 Form 6251 remaining-scope decision

Status: coverage disposition only. This document does not turn an unsupported
AMT situation into a supported return. The agreed full test batch, IRS XSD
validation, filled-PDF review, and ATS acceptances have not run.

## Two issued private-activity-bond interest payers on line 2g (2026-10-01, unrun)

The bounded two-issuer Form 1099-INT route now requires distinct payer TINs,
issued-copy references, and reviewed bond/expense references. Each review
affirms that box 9 represents eligible specified private-activity-bond
interest and that no deductible expense reduces it. The source excludes box 13
bond-premium reductions and other tax-exempt payers in this case. Native MeF
and PDF replay both copies, sum their box 8 amounts to Form 1040 tax-exempt
interest line 2a and box 9 amounts to Form 6251 line 2g, then match positive
AMT to Schedule 2 line 2 and Form 1040 line 17. The [2025 Form 6251 line 2g
instructions](https://www.irs.gov/instructions/i6251) direct the specified
bond interest from Form 1099-INT box 9 and its expense reduction. A full-return
and copy, review, line-2a, and tax-tamper fixture are authored but unrun.
Neither issued statement nor review bytes are authenticated; allocable expenses,
excepted bonds, and wider payer combinations remain open.

## Two reviewed state-income-tax refunds on line 2b (2026-10-01, unrun)

The bounded 2025 Form 1099-G route now accepts two taxable 2024 state-income-tax
refund copies from distinct payers. Each copy names the filer (or a spouse on a
joint return), identifies a separate source document and payer TIN, has a
reviewed taxable box 2 recovery, and names the same combined prior-year recovery
workpaper. Other Form 1099-G boxes and a third copy remain outside this branch.
The input node sums the two taxable recoveries to Schedule 1 line 1 and Form
6251 line 2b. Native and PDF export replay both copies, compare the exact sum,
and reconcile Schedule 1, Schedule 2 AMT, and finalized Form 1040 income and tax
totals. Positive and duplicate-copy, changed-payer, workpaper, amount, and
return-tamper fixtures are authored for the deferred batch. The issued 1099-G
and workpaper bytes remain unauthenticated. The
[2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251) require
the state-income-tax refund included on Schedule 1 line 1 to be reversed on line
2b.

The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require line-specific AMT refigures. In particular, adjustments for passive
activities, basis or at-risk limitations, and tax-shelter farms must not also be
counted on another adjustment line. A generic amount cannot safely stand in for
those refigures. The current Form 6251 node rejects nonzero `other_adjustments`
and direct nonzero `nol_adjustment`, but the absence of an input field does
**not** prove that a taxpayer has no such transaction.

| IRS area                                      | Current bounded route                                                                                                                                                                                                                                                                                                                                  | Remaining source and calculation needed                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Line 2f, alternative tax NOL                  | Nonzero direct amount is rejected.                                                                                                                                                                                                                                                                                                                     | Filed regular NOL, separate AMT NOL basis and carryovers, AMT deduction limits, and the Form 6251 signed line.                                                                                                                                       |
| Line 2k, dispositions                         | Identified unadjusted Form 8949 basis rows with a complete Schedule D audit cover positive gains, bounded mixed-term offsets, and all-negative short/long-term rows when both regular and AMT totals remain within the separate $3,000/$1,500 deduction limits. Source rows must have TY2025 sale dates and matching holding periods. Cases are unrun. | Losses crossing either deduction limit, sign-changing rows, adjusted or digital-asset rows, other capital activity, AMT capital-loss carryovers, Form 4684/4797 gains, and their AMT Schedule D and Part III worksheets.                             |
| Lines 2l-2n, depreciation and activity limits | Reviewed, nonpassive post-1998 200%-declining-balance property can feed 2l.                                                                                                                                                                                                                                                                            | Other property/depreciation classes; activity-level AMT Form 8582 and prior suspended losses for 2m; AMT at-risk, partnership, and S corporation basis refigures for 2n. Amounts assigned to 2m/2n must be removed from any 2l or other source feed. |
| Lines 2o-2t                                   | Reviewed Form 59E circulation-cost deduction difference can feed 2o.                                                                                                                                                                                                                                                                                   | Other circulation-cost cases; contract percentage-of-completion, mining, research, installment-sale, and intangible-drilling-cost source workpapers for 2p-2t.                                                                                       |
| Line 3                                        | Mixed `other_adjustments` is rejected, not printed as line 3.                                                                                                                                                                                                                                                                                          | Separate pre-1987 depreciation, pollution-control, tax-shelter-farm, charitable-contribution, business-interest, mortgage-interest, disaster-loss, and related-adjustment workpapers with anti-duplication checks.                                   |
| Trust K-1 box 12 codes B-F                    | Only code A is routed to line 2j, with an affirmative absence requirement for B-I.                                                                                                                                                                                                                                                                     | Code-specific AMT qualified-dividend, Schedule D, unrecaptured-1250, and 28%-rate worksheets. The [IRS instructions](https://www.irs.gov/instructions/i6251) assign codes B-F to different worksheet lines, not to line 2j.                          |
| Form 6251 line 10 with Schedule J             | Already implemented: the tax calculation keeps elected Schedule J tax on Form 1040 line 16 and sends the no-election refigure to Form 6251 line 10.                                                                                                                                                                                                    | The existing bounded Schedule J source excludes preferential income, Form 2555, Form 8814, and other line-16 add-ons; those combinations require distinct reconciled worksheets.                                                                     |

Before calling Form 6251 coverage complete, choose one of two explicit outcomes
for each remaining row: implement its source-to-calculation-to-MeF/PDF path with
positive and rejection cases, or exclude the situation from the supported TY2025
Form 1040 product. Exclusion needs an intake question or verified source fact
that identifies the situation and stops filing. Merely leaving a field out of
the current schema is not an exclusion control. Do not collapse the rows into
`other_adjustments`, an asserted amount, or a generic line-3 entry.

After that decision, run the single full batch, fix failures, validate generated
XML against the TY2025 IRS XSD, visually inspect filled PDFs, and obtain IRS ATS
acceptances before release.

Build addendum (2026-09-29, unrun): the bounded line-2k path also covers
same-term short-term Form 8949 rows with gains and losses that net positive
under both regular and AMT bases. It uses the existing complete Schedule D audit
and files only the AMT-minus-regular difference. Later bounded mixed-term,
deductible-loss, and sourced qualified-dividend cases are described below;
elections and unaudited capital activity still stop. See the
[AMT-basis gap](ty2025-form6251-8949-basis-gap.md).

# Multiple ordinary-dividend payers with retained ISO (staged, unrun)

The bounded retained-share Form 3921 ISO and qualified-dividend Part III route
now sums one or more ordinary Form 1099-DIV payers. Each payer must have only
domestic box 1a/1b income, with its qualified amount no greater than its
ordinary amount. Multiple payers need distinct nonblank source-document
references so the same copy cannot be counted twice. The aggregate box 1b must
equal Form 6251's qualified dividends and finalized Form 1040 line 3a; aggregate
box 1a must equal Form 1040 line 3b. MeF and PDF use the same source gate,
including rejection when one payer has an unsupported box or the aggregate
changes. The Part III arithmetic remains the existing bounded no-capital-gain
route. Focused positive and tamper fixtures are authored for the deferred bulk
pass; issued 1099-DIV bytes, broader capital-gain activity, filled PDF, XSD, and
ATS remain open. See
[2025 Form 6251](https://www.irs.gov/pub/irs-prior/f6251--2025.pdf) and
[2025 Publication 550](https://www.irs.gov/publications/p550).

# Schedule C depletion replay (staged, unrun)

A nonzero Form 6251 line 2d now replays the retained Schedule C property-level
AMT depletion workpapers at native and PDF export. It requires each business's
regular Schedule C line 12 to equal its property regular allowances, rejects
duplicate property references and passive or at-risk-limited activities, and
matches the signed regular-minus-AMT total to line 2d. The source, native, and
PDF fixtures await the agreed bulk pass. Reviewed figures are still not bound to
workpaper bytes; other depletion sources and activity refigures remain open.

# Property depreciation replay (staged, unrun)

The bounded post-1998, nonpassive 200% declining-balance line 2l path now
rechecks distinct property IDs and the regular-minus-AMT depreciation total at
native and PDF export. A direct amount without its reviewed workpaper rejects.
The source and tamper fixtures await the combined pass; the underlying asset
records and other AMT depreciation methods remain open.

# Trust K-1 code A replay (staged, unrun)

Native and PDF Form 6251 line 2j now replays the signed total from distinct
retained trust K-1 box 12 code A sources. Each source must name its trust,
issued-copy reference and EIN, and affirm that other box 12 AMT codes are
absent. Omitting or changing a source rejects; the focused fixtures await the
bulk pass. This does not authenticate issued K-1 bytes or model codes B–I.

# Private-activity-bond replay (staged, unrun)

Native and PDF Form 6251 line 2g now sums retained Form 1099-INT box 9, Form
1099-OID specified private-activity-bond box 11, Form 1099-DIV box 13, and
elected Form 8814 child private-activity-bond interest. It compares the
nondividend and complete totals to the computed form and rejects missing or
out-of-range source boxes. The replay fixture awaits the combined pass; issued
payer/child source bytes and wider bond adjustments remain open.

The Form 8949 AMT-basis replay now also verifies a valid 2025 sale date and
short- or long-term holding period against each source row's Part I/II box. The
date-mismatch fixture awaits the final batch; issued broker-copy bytes remain
open.

# Mixed-term Form 8949 basis offset (staged, unrun)

The audited line-2k path now accepts identified short-term loss rows offset by
identified long-term gain rows when the complete regular and AMT Schedule D
totals are both positive. Every row must keep the same sign under both bases;
the complete Schedule D audit must contain exactly those unadjusted rows and no
other capital activity. The regular net capital gain must equal the audited
regular sum, while Part III uses the separate positive AMT sum after the
short-term offset. The signed basis difference also reaches native line 2k and
the PDF. The symmetric case of identified long-term losses offset by short-term
gains is also accepted when both complete totals stay positive; its audited
regular and AMT preferential net capital gain is zero, so Part III does not
print. Positive and mismatched-net fixtures are authored for the deferred batch.
Net losses, sign-changing rows, other capital activity, special-rate gains and
Form 4952 elections remain closed. A bounded ordinary 1099-DIV
qualified-dividend combination now joins the audited short-term-basis gain,
long-term-basis gain, and short-term-loss/long-term-gain paths to Part III when
the combined preferential amount fits both regular and AMT taxable income.
Native and PDF export require the retained 1099-DIV payer, finalized Form 1040
dividends, capital gain, and taxable income, and the separate AMT net capital
gain. The positive and tamper fixtures await the requested final bulk pass;
other dividend classes, capital-gain-excess worksheets, and issued-copy bytes
remain open. See the
[2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
and [2025 Schedule D instructions](https://www.irs.gov/instructions/i1040sd).

# Bounded AMT Form 4952 line 2c replay (implementation written; untested)

The Form 4952 calculator already refigures the regular and AMT line 8
investment-interest deductions and sends regular minus AMT line 8 to Form 6251
line 2c. A new native/PDF Form 6251 guard replays that difference against one
reviewed 2024 Form 4952 carryforward with a distinct AMT carryforward, one
owner-owned direct-use taxable-securities loan and its 2025 payment records,
and one investment Form 1099-INT payer. It recalculates both Form 4952 line 8
amounts, matches Schedule A line 9, Form 1040 taxable interest and selected
itemized deductions, and requires the positive AMT to match Schedule 2.
Removing or altering the printed Form 6251 line 2c now rejects even when the
retained Form 4952 source remains. Unbacked direct line 2c exports reject.
The synthetic reviewed case has $22,000 regular and $23,000 AMT deductions,
so line 2c is negative $1,000; a separate retained ISO exercise triggers an
attached Form 6251. Positive and tamper native/PDF and full-return fixtures
are authored but unrun under the implementation-first workflow.

This route excludes Form 4952 elections, private-activity-bond interest,
other AMT income/expense refigures, multiple investment payers, standard
deduction filing, Form 1116 allocation, and zero-AMT counterfactual filings.
Reviewed prior-return, lender/payment, and payer-copy references are not
authenticated bytes. The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
direct the line 2c regular-versus-AMT Form 4952 line 8 comparison.
