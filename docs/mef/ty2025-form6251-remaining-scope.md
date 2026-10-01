# TY2025 Form 6251 remaining-scope decision

Status: coverage disposition only. This document does not turn an unsupported
AMT situation into a supported return. The agreed full test batch, IRS XSD
validation, filled-PDF review, and ATS acceptances have not run.

## One direct PAB bond plus one PAB fund (2026-10-01, unrun)

The [2025 Form 6251 line 2g instructions](https://www.irs.gov/instructions/i6251)
direct the filer to combine eligible specified-bond interest reported in Form
1099-INT box 9 and the specified-bond portion of tax-exempt fund dividends
reported in Form 1099-DIV box 13. A bounded mixed source now requires one
reviewed, wholly specified 1099-INT box 8/9 copy and one reviewed, wholly
specified 1099-DIV box 12/13 copy, with distinct issuer and workpaper
references, no taxpayer allocable deduction, and no other PAB source or
unrelated income boxes. The direct bond amount reaches the retained interest
source; both amounts reach Form 6251 line 2g and Form 1040 line 2a. Native
and PDF preflight replay the copies and reconcile positive AMT to Schedule 2
line 2 and Form 1040 line 17. The authored full-return positive and amount,
review, duplicate-copy, line-2a, and tax-tamper fixtures await the bulk test.
Issuer copies and review records are references, not authenticated bytes;
mixed sources with deductions and wider combinations remain open.

## Two distinct bonds reported by one 1099-INT issuer (2026-10-01, unrun)

The bounded Form 6251 line 2g path now accepts two separately issued 1099-INT
copies with the same verified payer name and TIN when they identify distinct
specified private-activity bonds. Each copy must have a distinct issued-copy
reference, bond identifier, eligibility review, and allocable-deduction
workpaper and expense record. Box 8 must equal box 9 on each copy; the retained
source node subtracts each reviewed deduction once. The [2025 Form 6251 line
2g instructions](https://www.irs.gov/instructions/i6251) require specified
bond interest, after qualifying allocable deductions, and the [1099-INT
instructions](https://www.irs.gov/instructions/i1099int) include box 9 in box
8. Native MeF and PDF replay both copies and reconcile Form 6251 line 2g,
Schedule 2 line 2, Form 1040 lines 2a and 17. The authored case has $200,000
tax-exempt interest and two $10,000 allocable deductions, producing $180,000
on line 2g. Positive and bond identity, copy, deduction, and final-tax tamper
fixtures are authored but unrun. Reviewed references do not authenticate the
issued statements or expense records; more than two copies and mixed PAB
sources remain open.

## Mixed-term gain offset with separately capped losses (2026-10-01, unrun)

The complete Form 8949 audit now admits identified short-term gains and
long-term losses (or the reverse) that retain their signs under both bases
when the regular and AMT totals are both losses and either total crosses its
own Schedule D deduction cap. It calculates line 2k from the separately
deductible regular and AMT losses, then replays all lots, the printed line,
Schedule 2, and Form 1040 capital loss and AMT at native/PDF export. The
authored two-lot case has a $1,000 regular short-term gain and $3,500
long-term loss, versus a $900 AMT gain and $5,600 AMT loss: regular Schedule D
deducts $2,500, AMT deducts $3,000, and Form 6251 line 2k is negative $500.
Positive and omitted-lot, changed-basis, printed-line, and final-return tamper
fixtures await the agreed bulk test. The [2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require a separate AMT capital-loss limit and adjustment; the [2025 Schedule D
instructions](https://www.irs.gov/pub/irs-prior/i1040sd--2025.pdf) govern the
regular limit. Prior capital-loss carryovers, sign-changing lots, other capital
activity, special-rate gains, broker-byte authentication, XSD, filled PDF,
business rules, and ATS remain open.

## Two issued private-activity-bond interest payers on line 2g (2026-10-01, unrun)

The bounded two-issuer Form 1099-INT route now requires distinct payer TINs,
issued-copy references, and reviewed bond/expense references. Each review
affirms that box 9 represents eligible specified private-activity-bond
interest and supplies a direct allocable-deduction workpaper. The authored
two-issuer case records zero deductions. The source excludes box 13
bond-premium reductions and other tax-exempt payers in this case. Native MeF
and PDF replay both copies, sum their box 8 amounts to Form 1040 tax-exempt
interest line 2a and box 9 amounts to Form 6251 line 2g, then match positive
AMT to Schedule 2 line 2 and Form 1040 line 17. The [2025 Form 6251 line 2g
instructions](https://www.irs.gov/instructions/i6251) direct the specified
bond interest from Form 1099-INT box 9 and its expense reduction. A full-return
and copy, review, line-2a, and tax-tamper fixture are authored but unrun.
Neither issued statement nor review bytes are authenticated; allocable expenses,
excepted bonds, and wider payer combinations remain open.

## One issued private-activity-bond OID payer on line 2g (2026-10-01, unrun)

The bounded Form 1099-OID route now accepts one tax-exempt OID copy with a
positive box 11 amount entirely affirmed as specified private-activity-bond
OID. It requires the payer TIN, issued-copy reference, reviewed bond/expense
reference, and a direct allocable-deduction workpaper. Acquisition or
bond premium may reduce the tax-exempt OID, and the reviewed PAB share must
equal that net amount. Other taxable OID and withholding boxes, other PAB
payers, and additional tax-exempt OID are closed in this route. Native MeF and
PDF replay the retained copy, match the net amount to Form 1040 line 2a and
Form 6251 line 2g, then join positive AMT to Schedule 2 line 2 and Form 1040
line 17. Positive and copy, review, amount, and tax-tamper fixtures are
authored for the deferred batch. The
[IRS information-return instructions](https://www.irs.gov/instructions/i1099int)
place specified private-activity-bond tax-exempt OID in Form 1099-OID box 11;
the [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require line 2g to reflect specified bond interest after allowable expense
reduction. The authored one-issuer OID case has zero allocable deduction.
Issued-copy and eligibility-review bytes are not authenticated.

## Distinct 1099-INT and 1099-OID PAB issuers on line 2g (2026-10-01, unrun)

One reviewed Form 1099-INT box 8/9 payer can now join one separately reviewed
Form 1099-OID box 11 payer when the issuers have distinct names, TINs,
issued-copy references, and bond/expense workpaper references. The INT copy's
entire tax-exempt box 8 must be specified PAB box 9 interest, with no box 13
tax-exempt bond premium. The OID copy's specified PAB share must equal its
box 11 tax-exempt OID after any classified acquisition or bond premium. Each
review affirms eligibility and supplies a per-copy allocable-deduction
workpaper; the authored distinct-issuer case has zero deductions. Taxable income,
withholding, foreign-interest, nominee, and other source boxes remain closed.
Native MeF and PDF replay both copies, match their net sum to Form 1040 line
2a and Form 6251 line 2g, and join positive AMT to Schedule 2 line 2 and Form
1040 line 17. A full-return positive and amount, review, identity, copy,
line-2a, and tax-tamper fixture are authored for the deferred batch. The
[2025 Form 6251 line 2g instructions](https://www.irs.gov/instructions/i6251)
require specified bond interest after allowable expenses, while the
[information-return instructions](https://www.irs.gov/instructions/i1099int)
place stated interest in 1099-INT boxes 8/9 and tax-exempt OID in 1099-OID
box 11. Issued-copy and review bytes are not authenticated; other mixed PAB
sources remain open.

## Same-issuer INT/OID with allocable deductions (2026-10-01, unrun)

The mixed route also accepts two independently identified issued copies from
one issuer when payer name and TIN, plus a reviewed bond identifier, match on
both forms. The INT copy supplies stated interest in boxes 8/9 and the OID
copy supplies distinct tax-exempt accrual in box 11. Copy and bond-eligibility
references must differ, as must each expense record and deduction review
reference. The former zero-expense affirmation has been replaced directly with
one structured workpaper per positive PAB copy; there is no old-field alias.
Each workpaper records its 2025 expense source, directly allocable amount,
reviewer reference, hypothetical deductibility if interest were taxable, and
confirmation it was not claimed elsewhere. The source nodes subtract each
allocable amount once from its corresponding PAB interest before Form 6251
line 2g, while Form 1040 line 2a retains the full tax-exempt interest after
bond premium. In the authored case $100,000 of stated interest and $100,000 of
net OID less separate $10,000 and $5,000 allocable deductions yields line 2a
of $200,000 and line 2g of $185,000. Native/PDF replay both workpapers and
join positive AMT to Schedule 2 and Form 1040. Positive, changed-expense,
bond-identity, duplicate-record, and final-return fixtures are authored for
the deferred batch. Expense and issuer records are reviewed references, not
authenticated bytes; general Form 4952 investment-interest limitation and
multi-bond allocations remain outside this bounded route.

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
| Line 2k, dispositions                         | Identified unadjusted Form 8949 basis rows with a complete Schedule D audit cover positive gains, bounded mixed-term offsets, and sign-stable negative totals with separate $3,000/$1,500 deduction limits. Source rows must have TY2025 sale dates and matching holding periods. Cases are unrun. | Sign-changing rows beyond the bounded cases, adjusted or digital-asset rows, other capital activity, prior AMT capital-loss carryovers, Form 4684/4797 gains, and their AMT Schedule D and Part III worksheets.                             |
| Lines 2l-2n, depreciation and activity limits | Reviewed, nonpassive post-1998 200%-declining-balance property can feed 2l.                                                                                                                                                                                                                                                                            | Other property/depreciation classes; activity-level AMT Form 8582 and prior suspended losses for 2m; AMT at-risk, partnership, and S corporation basis refigures for 2n. Amounts assigned to 2m/2n must be removed from any 2l or other source feed. |
| Lines 2o-2t                                   | Reviewed Form 59E circulation-cost deduction difference can feed 2o; one first-year non-home Schedule C contract workpaper can feed 2p; one current-year Schedule C mining expense with a property workpaper can feed 2q.                                                                                                                                                                                                                                                                                   | Other circulation-cost cases; prior-year, variable-price, multiple, or other-method contracts; earlier-year or multiple-property mining; research, installment-sale, and intangible-drilling-cost source workpapers for 2p-2t.                                                                                       |
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

# Two current-year mining businesses on line 2q (written, unrun)

The [2025 Form 6251 line 2q instructions](https://www.irs.gov/instructions/i6251)
require mining exploration and development costs deducted in full for regular
tax to be amortized over ten years for AMT. The bounded current-year Schedule C
route now accepts two distinct, materially participating mine businesses with
one separately named Part V expense and reviewed workpaper per mine. Intake
requires distinct business references, property references, and workpaper
references. The calculator sums each regular expense less its first ten-year
AMT deduction into Form 6251 line 2q. Native MeF and PDF replay both source
rows, compare the combined line 2q amount and Schedule 1 line 3 business
income, and retain the Schedule 2/Form 1040 AMT join. Positive and expense,
property-identity, and return-tamper fixtures are authored but unrun.

The same reviewed-workpaper route now accepts more than two distinct current-year
mine businesses without a count cap. An authored four-mine return has separate
$100,000, $50,000, $30,000, and $20,000 expenses; the $200,000 regular
deduction less $20,000 first-year AMT amortization yields Form 6251 line 2q of
$180,000. Native and PDF replay each mine, compare Schedule 1 business income,
and join positive AMT to Schedule 2 and Form 1040. Full-return positive and
expense, property, Schedule 1, Schedule 2, and Form 1040 tamper cases are
authored for the deferred bulk pass.

Earlier-year amortization, multiple claims per business, other Schedule C
businesses in the same return, property losses, source-document authentication,
and full XSD/PDF/IRS filing gates remain open.

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
out-of-range source boxes. A positive 1099-OID PAB amount requires either the
single reviewed OID route or the distinct reviewed INT/OID issuer route above;
other mixed OID PAB source channels reject. The replay
fixture awaits the combined pass; issued payer/child source bytes and wider
bond adjustments remain open.

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

# Same-term Form 8949 loss crossing capital-loss cap (staged, unrun)

One complete, identified, unadjusted short-term-only or long-term-only Form
8949 set now uses separate regular and AMT Schedule D current-year deduction
limits when both net results are losses and either crosses the filing-status
$3,000/$1,500 cap. Its bounded source, calculator, native/PDF, Schedule 2, and
Form 1040 joins are described in the [AMT-basis gap](ty2025-form6251-8949-basis-gap.md).
The authored positive/tamper fixtures await the requested bulk pass. Prior-year
loss carryovers and later-year use of the newly generated AMT carryover remain
open, as do mixed-term gains offsetting losses and issued broker-copy authentication.

# Mixed-term Form 8949 losses crossing capital-loss cap (staged, unrun)

The audited line-2k path now also accepts identified short- and long-term Form
8949 lots when every lot is a loss under both regular and AMT bases, the
complete Schedule D audit contains exactly those unadjusted lots, and the
combined current-year loss crosses the regular or AMT $3,000/$1,500 limit.
It applies the limit separately and prints the difference between deductible
AMT and regular losses. The authored case has a $2,500 regular loss and a
$6,500 AMT loss, so Form 6251 line 2k is negative $500 after the AMT loss is
capped at $3,000. Native and PDF replay both dated lots, the final Form 1040
capital loss, Schedule 2 AMT, and Form 1040 additional tax. Positive and
omitted-lot, basis, printed-amount, and return-tamper fixtures await the bulk
pass. Prior capital-loss carryovers, gains offsetting these mixed-term losses,
other Schedule D activity, and broker-copy authentication remain outside this
route. The [2025 Form 6251 line 2k instructions](https://www.irs.gov/instructions/i6251)
direct separate application of the AMT capital-loss limit.
