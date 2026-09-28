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
