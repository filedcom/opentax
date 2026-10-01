# TY2025 Form 6251 remaining-scope decision

Status: coverage disposition only. This document does not turn an unsupported
AMT situation into a supported return. The agreed full test batch, IRS XSD
validation, filled-PDF review, and ATS acceptances have not run.

The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require line-specific AMT refigures. In particular, adjustments for passive
activities, basis or at-risk limitations, and tax-shelter farms must not also be
counted on another adjustment line. A generic amount cannot safely stand in for
those refigures. The current Form 6251 node rejects nonzero `other_adjustments`
and direct nonzero `nol_adjustment`, but the absence of an input field does
**not** prove that a taxpayer has no such transaction.

| IRS area                                      | Current bounded route                                                                                                                                                                                                                                                                                              | Remaining source and calculation needed                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Line 2f, alternative tax NOL                  | Nonzero direct amount is rejected.                                                                                                                                                                                                                                                                                 | Filed regular NOL, separate AMT NOL basis and carryovers, AMT deduction limits, and the Form 6251 signed line.                                                                                                                                       |
| Line 2k, dispositions                         | Identified positive, unadjusted Form 8949 gains with complete Schedule D audit and AMT basis are modeled. Bounded short-term-only and long-term-only loss routes also accept all-negative rows when both regular and AMT losses remain fully deductible under the Schedule D $3,000/$1,500 limit; cases are unrun. | Losses crossing either deduction limit, mixed-term or mixed-sign rows, adjusted or digital-asset rows, other capital activity, AMT capital-loss carryovers, Form 4684/4797 gains, and their AMT Schedule D and Part III worksheets.                  |
| Lines 2l-2n, depreciation and activity limits | Reviewed, nonpassive post-1998 200%-declining-balance property can feed 2l.                                                                                                                                                                                                                                        | Other property/depreciation classes; activity-level AMT Form 8582 and prior suspended losses for 2m; AMT at-risk, partnership, and S corporation basis refigures for 2n. Amounts assigned to 2m/2n must be removed from any 2l or other source feed. |
| Lines 2o-2t                                   | Reviewed Form 59E circulation-cost deduction difference can feed 2o.                                                                                                                                                                                                                                               | Other circulation-cost cases; contract percentage-of-completion, mining, research, installment-sale, and intangible-drilling-cost source workpapers for 2p-2t.                                                                                       |
| Line 3                                        | Mixed `other_adjustments` is rejected, not printed as line 3.                                                                                                                                                                                                                                                      | Separate pre-1987 depreciation, pollution-control, tax-shelter-farm, charitable-contribution, business-interest, mortgage-interest, disaster-loss, and related-adjustment workpapers with anti-duplication checks.                                   |
| Trust K-1 box 12 codes B-F                    | Only code A is routed to line 2j, with an affirmative absence requirement for B-I.                                                                                                                                                                                                                                 | Code-specific AMT qualified-dividend, Schedule D, unrecaptured-1250, and 28%-rate worksheets. The [IRS instructions](https://www.irs.gov/instructions/i6251) assign codes B-F to different worksheet lines, not to line 2j.                          |
| Form 6251 line 10 with Schedule J             | Already implemented: the tax calculation keeps elected Schedule J tax on Form 1040 line 16 and sends the no-election refigure to Form 6251 line 10.                                                                                                                                                                | The existing bounded Schedule J source excludes preferential income, Form 2555, Form 8814, and other line-16 add-ons; those combinations require distinct reconciled worksheets.                                                                     |

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
and files only the AMT-minus-regular difference. Mixed terms, zero or negative
nets, dividends, elections and unaudited capital activity still stop; this does
not resolve the remaining line-2k rows above. See the
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
PDF fixtures await the agreed bulk pass. Reviewed figures are still not bound
to workpaper bytes; other depletion sources and activity refigures remain open.

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

Native and PDF Form 6251 line 2g now sums retained Form 1099-INT box 9,
Form 1099-OID specified private-activity-bond box 11, Form 1099-DIV box 13,
and elected Form 8814 child private-activity-bond interest. It compares the
nondividend and complete totals to the computed form and rejects missing or
out-of-range source boxes. The replay fixture awaits the combined pass;
issued payer/child source bytes and wider bond adjustments remain open.

# Mixed-term Form 8949 basis offset (staged, unrun)

The audited line-2k path now accepts identified short-term loss rows offset by
identified long-term gain rows when the complete regular and AMT Schedule D
totals are both positive. Every row must keep the same sign under both bases;
the complete Schedule D audit must contain exactly those unadjusted rows and
no other capital activity. The regular net capital gain must equal the audited
regular sum, while Part III uses the separate positive AMT sum after the
short-term offset. The signed basis difference also reaches native line 2k and
the PDF. Positive and mismatched-net fixtures are authored for the deferred
batch. Net losses, sign-changing rows, other capital activity, special-rate
gains, Form 4952 elections, and qualified dividends remain closed. See the
[2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
and [2025 Schedule D instructions](https://www.irs.gov/instructions/i1040sd).
