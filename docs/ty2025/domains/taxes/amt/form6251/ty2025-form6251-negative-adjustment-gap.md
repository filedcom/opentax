# TY2025 Form 6251 negative-adjustment filing rule

## October 10 signed trust and depletion complete-return checkpoint

Eleven public-entry returns now exercise signed trust K-1 box 12 code A and
property-level Schedule C depletion, including multiple sources and both
spouses. Eight reconcile through calculation, Form 1040, native preparation and
the filled packet. A ninth emits incorrect tax despite passing XSD, and two
independently have zero AMT due but cannot export. No production code changed in
this checkpoint. Historical “unrun” notes below are superseded only for the
scopes exercised here; this does not close the broader Form 6251 task.

All eight reconciled cases have $200,000 wages, zero net Schedule C income and
$35,000 withholding. Depletion is the sum of each reviewed property's regular
deduction less its AMT deduction. Trust amounts sum the signed code A copies.
The source workpapers supply already reviewed allowed depletion; these checks
do not independently calculate property income, basis or section 613 limits.

| Case | Trust adjustment | Depletion adjustment | Regular tax | AMT | Total tax | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Two signed trust copies | 190,000 | 0 | 37,067 | 42,683 | 79,750 | 5 |
| Five signed trust copies | 240,000 | 0 | 37,067 | 56,683 | 93,750 | 5 |
| Spouse trust copies, joint | 190,000 | 0 | 26,898 | 39,160 | 66,058 | 5 |
| Both beneficiaries, joint | 240,000 | 0 | 26,898 | 53,160 | 80,058 | 5 |
| Mixed property deductions | 0 | 150,000 | 37,067 | 31,483 | 68,550 | 7 |
| Both proprietors, joint | 0 | 150,000 | 26,898 | 28,482 | 55,380 | 9 |
| Negative trust, positive depletion | -20,000 | 150,000 | 37,067 | 25,883 | 62,950 | 7 |
| Negative depletion, positive trust | 200,000 | -30,000 | 37,067 | 37,083 | 74,150 | 7 |

The two nonfiling cases each have a negative $30,000 adjustment. Independent
arithmetic gives AMTI $170,000, tentative tax $21,294 and regular tax $37,067;
removing the negative adjustment gives tentative tax $29,094, still below
regular tax. Under the [2025 filing instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf),
neither needs Form 6251 on these facts. Public execution returns no diagnostics
but retains no completed AMT result, and both native preparation and fresh PDF
building reject the trust/depletion source guard. This is deferred124: the
entered sources remain in the evidence, and neither case counts as a complete
return.

The qualified-dividend case adds $10,000 ordinary/qualified trust dividends to
the $200,000 wages and $190,000 trust adjustment. Form 1040 lines 3a/3b retain
the dividends, but the regular-tax worksheet loses their qualified character,
Form 6251 omits Part III and Form 8960 reports no investment income. Native and
PDF accept regular tax $39,467, AMT $43,083 and total tax $82,550. Independent
ordinary/preferential arithmetic instead gives regular tax $38,567, tentative
tax $81,250, AMT $42,683 and NIIT $380, for total tax $81,630. The
[K-1 box 2a/2b instructions](https://www.irs.gov/pub/irs-prior/i1041sk1--2025.pdf)
and [Form 8960 line 2 instructions](https://www.irs.gov/pub/irs-prior/i8960--2025.pdf)
identify these destinations. This is deferred125; a structural XSD pass does
not validate the incorrect tax. The test retains the correct expected amounts
separately from assertions documenting the observed defect.

The focused typed run passes 11/0, including three explicit defect assertions;
the broader trust, Schedule C and Form 6251 group passes 419/0. Across the eight
reconciled cases, 20 public-source mutations and 76 native/76 fresh-PDF
mutations reject missing reviews, altered amounts, wrong owners, duplicates,
removed sources and changed final tax. The two original nonfiling export
blocks are separate from those mutation counts. The prior benchmark remains
46/133 at runtime `d09348af9`; it was not rerun because production code is
unchanged.

All nine emitted XMLs pass cached TY2025v5.4 Return1040 XSD. All 57 flattened
packet pages were visually reviewed through 38 unique page hashes on ten
sheets: 50 pages belong to the eight reconciled cases and seven to the known
incorrect dividend case. Seventeen trust copies and seven property rows retain
their source/owner joins; five Schedule C copies identify the correct
proprietor. Existing qualifications remain: three joint Form 6251 headers name
only the primary filer (deferred68), zero Schedule C lines 29/31 print blank
(deferred76), and all nine native Form 6251 documents omit line 1a although the
PDFs print it (deferred84). Signed negative lines 2d/2j print with a minus sign.
No deferred repair was made.

Evidence is retained under
`.state/research/form6251-signed-sources-2026-10-10/`: source/pending snapshots,
the two export errors, nine XML/PDF packets, independent arithmetic/native
checks, focused/grouped logs, rendered pages and hash manifests. XSD digest:
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
Synthetic source references do not authenticate issuer records, and no IRS
business-rule acceptance or acknowledgment is claimed.

## Circulation-cost source boundary on line 2o (written, unrun)

The
[2025 Form 6251 line 2o instructions](https://www.irs.gov/instructions/i6251)
use the signed difference between the regular-tax circulation-cost deduction and
the current-year AMT amortization deduction. The existing Form 59(e) source
route already calculates that difference and sends it to Form 6251 line 2o,
including a negative adjustment in a later amortization year. It now requires a
cited reviewed workpaper, the regular three-year election fact, and confirmation
that the special unamortized-property-loss rule does not apply. Neither
deduction nor the remaining balance may exceed the source expenditure. Focused
positive and rejection tests were updated but remain unrun. This is
reviewed-source reconciliation, not an independent 36-month amortization
schedule or loss-rule calculation. Other circulation-cost cases remain outside
this bounded route until their source facts are modeled.

## Section 1202 Form 8949 source boundary (written, unrun)

The
[2025 Form 6251 line 2h instructions](https://www.irs.gov/instructions/i6251)
require a positive AMT preference equal to 7% of the excluded gain on qualified
small business stock acquired before September 28, 2010. The regular-tax Form
8949 exclusion and Schedule D 28% rate treatment also depend on the specific
transaction. The existing Form 8949 source accepted `qsbs_code`, `qsbs_amount`,
or adjustment code `Q` but passed them through without computing the exclusion
or line 2h. The Form 8949 intermediate node now rejects any of those source rows
before they can reach Schedule D. Schedule D itself also rejects direct code-`Q`
rows and positive Form 1099-DIV box 2c amounts that could bypass the
intermediate node. The
[2025 Schedule D instructions](https://www.irs.gov/instructions/i1040sd)
identify `Q` as the section 1202 exclusion; QOF deferrals and inclusions use
codes `Z` and `Y`. The Schedule D MeF and PDF descriptors reject those direct
source fields too, instead of dropping them during projection. Focused
direct-source, intermediate-node, Schedule D, MeF, and PDF rejection cases are
written but unrun. This boundary does not implement section 1202 eligibility,
exclusion limits, the 28% Rate Gain Worksheet, or a linked Form 6251 line 2h
amount; those remain open.

The direct Form 8949 MeF serializer also rejects code `Q`, `qsbs_code`, and
`qsbs_amount` in any transaction, including a mixed batch with ordinary rows.
Without that check, a caller could bypass the intermediate-node guard and
serialize the exclusion without the linked Schedule D and AMT refigures. The PDF
descriptor now uses only computed `form8949.transaction` rows, checks the raw
`f8949s` for section 1202 markers, and rejects the old direct `transactions` row
shape. This removes the builder's top-level row override path rather than adding
a second interpretation. Focused direct serializer/projection cases are written
but unrun.

## Estate and trust K-1 box 12 code A on line 2j

The
[2025 beneficiary instructions for Schedule K-1 (Form 1041)](https://www.irs.gov/instructions/i1041sk1)
send box 12 code A's signed AMT adjustment to Form 6251 line 2j. The trust K-1
source now requires the issuer EIN, a source-document reference, and an explicit
affirmation that box 12 codes B through I are absent. Codes B through F also
change the AMT capital-gain worksheets; codes G through I belong on other lines.
Neither is refigured by this route. An uncoded nonzero `box12_amt` stops rather
than silently disappearing. Multiple coded K-1 amounts accumulate, and the Form
6251 node sums them for line 2j, AMTI, and the negative-lines-2c-through-3
filing test. TY2025 MeF uses the verified `EstatesAndTrustsAmt` line-2j element
in XSD order; the cached PDF field tree places line 2j at page-1 `f1_14[0]`.
Focused source, node, XML, and PDF mapping cases are written but unrun.

This route does not refigure codes B through F or other AMT estate/trust items.
It does not close the broader Form 8949 AMT-basis line-2k gap: raw basis
differences need Schedule D netting, carryover and loss-limit refigures, and
potentially different preferential-rate worksheets before they become a filed
adjustment.

The [2025 IRS Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require attachment when the signed total of lines 2c through 3 is negative
**and** line 7 would exceed line 10 without those adjustments. This can require
a zero-AMT Form 6251 even when the normal line-7-versus-line-10 test does not.

The current bounded route evaluates that counterfactual from modeled lines 2c,
2d, 2f, 2g, 2h, 2i, and 2l when `other_adjustments` is zero. It recomputes the
MFS line-4 addition and exemption on the counterfactual AMTI. For
ordinary-income Form 2555 returns, it refigures the Foreign Earned Income Tax
Worksheet from the counterfactual taxable excess and the explicitly sourced Form
2555 exclusion and disallowed deductions. A further narrow Form 2555 route
handles qualified dividends or ordinary net capital gain, but no AMT Form 4952
election or 25%/28% special-rate gain: it refigures Part III lines 12–40 using
the counterfactual taxable excess, preserves the regular-tax worksheet's lines
20/27, and subtracts the Form 2555 worksheet line-5 tax. It requires Form 1040
line 15 taxable income and an explicit worksheet line-2b deduction amount. The
resulting filing flag retains the form in MeF and in PDF when a mapped numeric
field is nonzero, without inventing AMT due on Schedule 2. Focused positive,
inverse, and missing-source cases are written but unrun.

A separate domestic preferential-income counterfactual is now calculated when
the only negative adjustment is the AMT Form 4952 line 2c difference and the
return has qualified dividends or ordinary net capital gain, no Form 2555, no
Form 4952 line 4g election, no unrecaptured section 1250 or 28% gain, and no
regular or counterfactual capital-gain excess. It keeps the regular
qualified-dividend/capital-gain worksheet amounts for Form 6251 Part III lines
13, 20, and 27, but uses the AMT taxable excess figured without the negative
lines 2c–3 adjustment on line 12. This follows the
[2025 Part III instructions](https://www.irs.gov/instructions/i6251) for a case
with no AMT gain/loss or estate/trust adjustment. A counterfactual line 7 above
line 10 retains the calculated zero-AMT form in MeF and in PDF when a mapped
numeric field is nonzero. Node, MeF, and PDF cases are written but unrun. The
source does not independently prove identical regular/AMT basis for all capital
transactions; that remains a filing-confidence limitation.

The same bounded domestic Part III refigure now handles a negative, sourced Form
59(e) circulation-cost difference on line 2o with qualified dividends. It
removes line 2o in the filing-test counterfactual, recomputes the exemption and
preferential-rate line 7, and retains a zero-AMT Form 6251 when that line
exceeds line 10. The actual signed line 2o amount reconciles through
`CirculationCostAmt` and the page-1 PDF line 2o field. This branch still
requires Form 1040 line 15 and no capital-gain excess, Form 2555, Form 4952
election, special-rate gain, or AMT-basis disposition. Positive,
below-threshold, missing-source, excess, XML, and PDF-projection cases are
written but unrun. The reviewed Form 59(e) deduction amounts and the basis of
unrelated capital assets are not independently recalculated.

The domestic Part III filing counterfactual also handles a signed negative
estate/trust K-1 box 12 code A adjustment on line 2j with qualified dividends.
Code A changes AMTI but does not change the qualified-dividend or Schedule D
worksheet amounts: box 12 codes B through F carry those separate worksheet
adjustments and remain excluded by the bounded K-1 source. With no Form 2555,
Form 4952 election, AMT-basis disposition, special-rate gain, or capital-gain
excess, the counterfactual removes line 2j, recomputes exemption and Part III
line 7, and retains a zero-AMT Form 6251 only when that line exceeds line 10.
Focused retained/not-retained, missing-taxable-income, capital-gain-excess,
native XML, and PDF-projection cases are written but unrun. This does not
refigure codes B through F or authenticate the underlying trust workpaper.

`other_adjustments` currently mixes other line-2 items and line 3, so a nonzero
value cannot establish the required 2c-through-3 total or identify the correct
filed line. The node, MeF serializer, and PDF projection now reject any nonzero
mixed amount even when AMT or a credit independently requires the form. The
previous route placed every such amount on line 3, which could misstate the
filed return. Schedule C depletion now has the bounded line-2d route below. K-1
AMT items and Form 8949 AMT basis differences still need line-specific
refigures; this is an explicit unsupported disposition until then. Focused
positive and negative rejection cases are written but unrun. Domestic
preferential-rate counterfactuals outside the narrow no-excess route still stop,
as do Form 2555 cases with an AMT Form 4952 election or 25%/28% Schedule D gain
when their distinct counterfactual refigure is required. Those require the AMT
Schedule D, Unrecaptured Section 1250 Gain, and/or 28% Rate Gain worksheet
refigure, which the current source graph cannot independently reconcile.
Complete coverage also needs line-specific AMT sources, especially line
2e/2j–2t/3. Tests, XSD, business rules, and filled-PDF checks remain pending the
shared validation batch.

## Form 2555 with a matching Form 4952 election

The
[2025 Form 6251 Part III instructions](https://www.irs.gov/instructions/i6251)
use the Schedule D Tax Worksheet when Form 4952's line 4g election removes
qualified dividends or eligible capital gain from preferential-rate income. The
source graph now carries both the regular and AMT Form 4952 election and its
elected capital-gain share through the Form 1040 tax computation to Form 6251. A
narrow Form 2555 route calculates Part III from that sourced election when both
elections and shares match, neither regular nor AMT calculation has capital-gain
excess, and there is no 25%/28% gain or AMT-basis disposition. The Form 2555
exclusion and explicitly reviewed worksheet line 2b amount set the stacked
taxable base; the matching Schedule D worksheet amounts set Part III lines 13,
15, 20, and 27. The ordinary Form 2555 worksheet's line-5 tax is subtracted
before Form 6251 line 7. The existing native MeF and page-2 PDF line mappings
receive those calculated amounts. A source-to-return, native XML, and PDF
field-map case plus mismatched-election and capital-gain-excess rejections are
written but unrun.

This does not assert that every Form 4952/2555 combination has identical AMT and
regular election pools. Different election amounts or capital-gain shares,
capital-gain excess, special-rate gain, AMT-basis disposition, and the
negative-adjustment who-must-file counterfactual with an election remain closed
pending their distinct refigures. The shared full test batch, IRS XSD,
filled-PDF visual review, business rules, and ATS acceptance have not run.

## Schedule C depletion on line 2d

The
[2025 Form 6251 line 2d instructions](https://www.irs.gov/instructions/i6251)
require the difference between regular-tax and AMT depletion deductions, not the
whole Schedule C line 12 deduction. A Schedule C item with nonzero line 12 now
requires a reviewed `amt_depletion_worksheet`. Its property rows identify each
property and give the regular and AMT allowed depletion after the property-level
income and basis limits. The regular row total must equal that same Schedule C
line 12, and duplicate property references are rejected. The node sends regular
less AMT depletion, signed, to Form 6251 line 2d. AMTI and the
negative-adjustment who-must-file calculation use that exact amount. TY2025 MeF
serializes it as `DepletionAmt` in XSD order and the PDF descriptor maps it to
page-1 `f1_8[0]`. Source, calculation, XML, and PDF mapping cases are written
but unrun.

This is a reviewed-worksheet entry, not an independent depletion tax calculator.
The source affirms that property-level income and basis limits were applied.
Passive and at-risk-limited Schedule C activity is excluded because its
adjustment belongs in the activity refigure rather than line 2d. The legacy
top-level depletion worksheet output is not business-linked and was previously
ignored by the Schedule C node. It now stops rather than disappearing from the
return. Linking that upstream worksheet to a specific business and independently
calculating its AMT basis, percentage-depletion limits, and election history
remain open. Other Schedule E, K-1, Form 8949, and line-3 AMT refigures remain
open. The shared full-batch tests, XSD, filled-PDF review, and ATS acceptance
have not run.

## Taxable state/local income-tax refund on line 2b

The
[2025 Form 6251 line 2b instructions](https://www.irs.gov/instructions/i6251)
direct that a Schedule 1 line 1 state/local income-tax refund be entered as a
negative AMT adjustment. The existing Form 1099-G box 2 route identifies a
taxable refund and puts that same amount on Schedule 1 line 1. The build pass
now also sends this source amount to Form 6251 line 2b, subtracts it from AMTI,
and keeps line 2b outside the special negative-lines-2c-through-3 filing test.
The positive magnitude maps to TY2025 `IRS6251` `TotalRefundReceivedAmt` (an
`USAmountNNType` in `IRS6251.xsd`) and the parenthetical line 2b AcroForm field
`f1_6[0]`; the actual canonical field and page widget were inspected in the
cached 2025 PDF. Focused refund/source, calculation, native and PDF cases now have terminal evidence in the complete-inventory proof below; shared full-batch and ATS acceptance are separate gates.

The bounded export now replays the complete retained, identified Form1099-G box2 inventory with one reviewed combined2024 tax-benefit workpaper, including primary/spouse copies and reviewed zero-taxable recoveries. Its recipient SSN
must match the final filer or joint spouse. Its taxable recovery must equal
Schedule 1 line 1 and Form 6251 line 2b; Schedule 1 line 10 must
equal Form 1040 line 8. Final Form 1040 income, AGI, deductions, and tax lines
must reconcile with Form 6251 line 1b and Schedule 2 line 2. Both native and
PDF reject a direct or altered refund claim. This refund binder excludes business tax refunds, unsupported corrections, other recovery years and the other Schedule1 line8z refund types described in the
[2025 Form 6251 line 2b instructions](https://www.irs.gov/instructions/i6251).
Positive and tamper evidence is terminal below. Separate ordinary unemployment statements use their existing source binder; unsupported same-copy mixed classifications remain guarded. Issued1099-G and prior filed-return bytes remain unauthenticated.

## Canonical PDF fields and ATNOLD sign

The cached TY2025 Form 6251 PDF confirms that page-1 fields `f1_1` and `f1_2`
are the filer name and SSN. The old descriptor incorrectly wrote line 1b into
the name field and shifted its other Part I mappings. The descriptor now uses
the verified line positions, including line 1b at `f1_4`, line 4 at `f1_26`,
line 11 at `f1_33`, and page-2 lines 12 through 40 at `f2_1` through `f2_29`. It
derives line 1a from finalized Form 1040 line 14 less Schedule 1-A line 37 and
checks that AGI less line 1a equals the calculated signed line 1b. Missing or
contradictory finalized return amounts stop PDF projection. The actual filled
pages still need visual inspection in the shared batch.

Form 6251 line 2e must add back the regular NOL deduction from Schedule 1 line
8a, then line 2f uses a separately refigured AMT NOL deduction. The current NOL
input does not provide a sourced loss-year carryover, 2025 tax base, AMT
refigure, or Form 172. A positive public NOL claim now rejects at calculation
before reducing AGI. A populated zero source remains blocked by attachment
preflight, and a direct pending Schedule 1 line 8a amount also stops MeF and PDF
export so it cannot bypass that input guard. Form 6251's node, MeF serializer,
and PDF projection reject every nonzero direct line-2f `nol_adjustment`; no
manually entered ATNOLD can lower AMTI without a sourced regular/AMT NOL
calculation. Zero and unrelated Form 6251 paths remain allowed. The dormant
line-2f MeF/PDF mapping retains its signed-to-positive convention for a future
sourced route, but no nonzero value is filed now. Historical disaster-loss
exceptions and source carryforward records are not modeled. See
[the Form 172/NOL gap](../../../income/business/form172/ty2025-form172-nol-gap.md) for the exact source and
arithmetic prerequisites. The bounded Schedule C line-2d route above does not
calculate depletion from raw property basis and income. Focused rejection cases
are written but unrun.

The shared PDF builder now permits a descriptor to explicitly retain an all-zero
form when its `includeWhen` filing requirement is true. Form 6251 uses that rule
for the credit-required zero-AMT case; unrelated blank forms still follow the
normal nonzero-data gate. A focused retained-versus-omitted builder case is
written but unrun. Actual filled-PDF visual inspection remains part of the
shared validation batch.

This is deliberately bounded to the amount the current 1099-G route already
recognizes as taxable on Schedule 1 line 1. Taxable prior-year
personal-property, sales, real-property, or foreign-tax refunds reported on
Schedule 1 line 8z, and a prior-year tax-benefit computation beyond the current
`box_2_prior_year_itemized` fact, still need their own source facts and line 2b
disclosure/description handling. MeF XSD/business-rule and filled-PDF validation
remain in the shared batch.

## Line 8 on a credit-required zero-AMT form

The [2025 line 8 instructions](https://www.irs.gov/instructions/i6251) say to
leave line 8 blank and enter zero on line 11 when line 10 is at least line 7,
even if Form 6251 must be attached for a credit. The node now excludes an
entered AMTFTC from the filed form in that branch: line 8 is absent and line 9
remains equal to line 7. When line 7 exceeds line 10, the entered AMTFTC
continues to reduce line 9. MeF and PDF projection also reject contradictory
direct fields rather than printing line 8 or a reduced line 9 in that branch.
Focused node, MeF, and PDF cases are written but unrun. This corrects form
presentation; it does not source or validate the underlying AMT Form 1116
calculation.

## AMT Form 4952 election pool boundary

The
[2025 Form 4952 line 4g instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
limit the election to qualified dividends on line 4b and eligible net capital
gain on line 4e; the elected capital-gain share cannot exceed the election or
the gain pool. Form 6251 Part III now rejects a direct AMT election whose
capital-gain share exceeds its supplied net capital gain or whose remaining
dividend share exceeds its supplied qualified dividends. A positive election
without either corresponding preferential-income source also stops. The ordinary
Form 4952 calculator already validates its own line 4g/4e/4b pools; this new
check prevents inconsistent values from entering Form 6251 when its inputs are
supplied directly or accumulated from different producers.

This is a necessary cross-form bound, not proof of the AMT Form 4952 source or
of identical regular and AMT capital-gain basis. Those require a full source and
return reconciliation. Focused accepted/rejected cases are written but unrun; no
XML, PDF, XSD, business-rule, or filled-render result is claimed.

## Itemizer's Schedule A line 7 source for Form 6251 line 2a

The [2025 line 2a instructions](https://www.irs.gov/instructions/i6251) direct
itemizers to carry Schedule A line 7 taxes into Form 6251; only non-itemizers
add back their Form 1040 standard deduction. Schedule A's calculator already
sends both itemized deductions and its calculated line 7 taxes to the
deduction-selection node, including a legitimate zero. That node now requires
the typed line 7 deposit whenever itemizing wins or MFS spouse-itemizing forces
the choice, and rejects a tax component above total itemized deductions. It no
longer silently turns an absent Schedule A line 7 source into a zero AMT
addback. Non-itemizers remain on the standard-deduction branch. Focused
positive, missing-source, MFS, and over-total cases are written but unrun.

This is a source-integrity repair for an already modeled line, not coverage for
net-qualified-disaster-loss, generation-skipping-transfer-tax, or other
unmodeled line 2a exceptions. No full validation batch was run.

## Reviewed post-1998 depreciation on line 2l

The [2025 line 2l instructions](https://www.irs.gov/instructions/i6251) require
regular-tax depreciation less AMT depreciation, signed, for property that must
be refigured. A nonzero direct line 2l amount now requires an identified
property workpaper. This bounded path covers non-section-1250 property placed in
service after 1998 and depreciated using regular-tax 200% declining balance,
with an explicit reviewed AMT deduction. Each property has its own ID and
workpaper reference; duplicate IDs or a total that does not equal the entered
signed adjustment reject. The source also affirms that no special allowance or
section 179 component, passive or at-risk limitation, tax-shelter farm
treatment, or inventory-capitalization difference belongs in the line. The
existing AMTI, negative-adjustment filing test, MeF line 2l, and PDF line 2l
consume the reconciled amount. Positive and negative source cases are written
but unrun.

This is reviewed workpaper reconciliation, not an independent MACRS/ADS
calculation or linkage to the property-level Form 4562 source. Pre-1999
property, section 1250 property, qualified special-allowance property,
depreciation embedded in another AMT adjustment, and inventory capitalization
remain outside this path. Tests, typecheck, XSD, filled-PDF, business-rule, and
ATS validation have not run.

## Ordinary complete state-refund inventory source proof (2026-10-06)

Isolated base`fe4906829d6bdf144bceb496c5c8869dc4729fde`. The
[2025 Form6251 instructions](https://www.irs.gov/instructions/i6251) subtract
Schedule1 taxable state-income-tax refunds on line2b. The special negative
adjustment filing test covers lines2c–3; line2b alone does not cause attachment.
Other actual filing triggers remain required. Positive taxable refunds now
retain the node's complete computed fields for final source replay, even when
no attachment is required. A reviewed all-zero taxable recovery does not
fabricate a completed Form6251 or Schedule1 copy.

The refund binder identifies the complete issued box2 inventory, including
zero-taxable recoveries, independently of other1099-G ordinary income rows.
There is no copy-count ceiling. Multiple refund copies require distinct retained
source references and the same actual combined2024 recovery workpaper. Their
normalized payerTIN, actual recipientSSN and recovery year identify a copy;
both MFJ recipients can have separate copies from the same state payer.
Ambiguous same-owner/payer/year reissues stop unless a supported correction
lineage exists. Every refund recipient must join the final taxpayer/joint spouse.
The reviewed taxable recoveries sum to Schedule1 line1 and retained6251 line2b;
ordinary additional income, finalized1040 AGI/deductions/tax and actual AMT
amount reconcile. Actual zero AMT accepts an omitted zero Schedule2/line17;
positive AMT still requires its matching tax joins. A separate sourced
unemployment copy uses its existing owner/source replay and contributes to
Schedule1 line7 rather than the refund sum. Other farm/grant classification
requirements and same-copy mixed-box guards remain intact.

Eight public source cases use actual owned W2 records and retained reviewed
issued1099-G facts, with no scalar AGI/tax/AMTI input and no runtime catalog
import. Nine issued copies prove aggregation beyond the former one/two limit;
no additional refund detail rows are required on the filed aggregate line.
Each original copy remains in the public/pending source snapshot. The reviewed
recovery amounts are supplied tax-benefit workpaper facts; this does not
independently recompute or authenticate a historical return.

| Source inventory | Taxable recovery | AGI | Taxable income | Retained AMTI |1040 tax |1040 refund | PDF pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Single,1 refund |600|75600|59850|75000|8087|2913|4|
| Single,2 refunds |1000|76000|60250|75000|8175|2825|4|
| Single,3 refunds |1300|76300|60550|75000|8241|2759|4|
| Single,9 refunds |1900|76900|61150|75000|8373|2627|4|
| MFJ,same payer/two recipients |1000|116000|84500|115000|9666|5334|4|
| Single,positive plus zero-taxable copy |1000|76000|60250|75000|8175|2825|4|
| Single,3 all-zero reviewed recoveries |0|75000|59250|uncomputed/unrequired|7955|3045|2|
| Single,refund plus10000 unemployment |600|85600|69850|85000|10287|713|4|

All eight settle through actual public graph, native/full local2025v5.4 XSD,
PDF and final source/tax joins. Every issued recipient is mutated in public
source; native/directPDF reject changed refund totals, positive AMT inventions,
later-copy taxable recovery, recipient, duplicate/missing reference, ambiguous
normalized payer/owner identity, combined review or recovery year. The actual
zero source cannot invent a refund/AMT copy, and a zero-taxable issued copy
cannot disappear from positive refund inventory validation.

Final checked six-module command:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test -A forms/f1040/2025/domains/income/other/ordinary_state_refund_source.test.ts forms/f1040/2025/domains/taxes/amt/form6251/form6251_refund_source.test.ts forms/f1040/2025/domains/taxes/amt/form6251/form6251_two_refunds.test.ts forms/f1040/nodes/intermediate/forms/taxes/amt/form6251/index.test.ts forms/f1040/2025/domains/income/other/f1099g/f1099g-owner-reconciliation.test.ts forms/f1040/2025/domains/income/other/f1099g/f1099g_unemployment_source_replay.test.ts
```

Terminal119/0(46s), `/tmp/opentax-state-refund-final-source-proof.log`. This
includes97 existing6251 node cases (positive AMT and actual zero-AMT filing
triggers), earlier positive-AMT refund native/PDF cases, and ordinary1099-G
owner/unemployment source preservation. Earlier failed type/schema/test
projection attempts are retained; the final result supersedes them.

Eight source/XML/PDF packets are ignored artifacts under isolated
`.state/research/ordinary-state-refund-source-2026-10-06`(2/8pages),
`ordinary-state-refund-complete-inventory-2026-10-06`(3/12pages), and
`ordinary-state-refund-zero-mixed-source-2026-10-06`(3/10pages). All30 pages
inspected individually at full Poppler size; correct form/year, owner/SSNs,
filing checkbox, income/tax/refund, sequence and legibility. The joint packet
retains both actual names/SSNs, and allzero prints only1040. No catalog,
main/board or future scope changes. Prior1/2 artifacts remain unchanged.

The broader6251/source/return-wide parents remain open. Source tax-benefit
review is not external issuer/prior-return authentication. Unsupported recovery
years, same-owner corrections without lineage, business/non-income-tax refunds
and other AMT source refigures retain their guards; IRS business-rule and ATS
acceptance remain external gates.

Final artifact checker terminal0:
`/tmp/opentax-state-refund-final-artifact-check.log`,8/all30 reviewedpages.
Each saved public source regenerates identical pending values, native XML and
PDF bytes against the committed pure fixture factories; full2025v5.4 XSD and
page origins verified again. Reproduction command (no catalog harness):

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run -A .state/research/check-final-refund.ts
```

Digest inventory is ignored `.state/research/state-refund-final-digest-report.json`.
Generator scripts/logs and every original packet remain retained; actual
source/XML/PDF bytes were not replaced when inventory coverage expanded.

## Current-main complete ordinary state-refund source proof

Exact source b4187c06a: six-module source gate119/0(47s), log `/tmp/opentax-state-refund-current-main-source-proof.log`, SHA2565d94087c33de0803ac6f5e93d5d955ecc0916790aa59af026ad8b501f4d2576d. Immutable main replay `/tmp/opentax-state-refund-current-main-replay-oct6` regenerated8/all30 reviewedpages with exact source/pending/XML/PDF bytes and full2025v5.4 XSD. Checker terminal0 `/tmp/opentax-state-refund-current-main-artifact-check-v2.log`, SHA256dc6a6599abe036a39936c38768a09fe26732cd40448947d8669ac2d426bcdfc2. Initial checker stopped before validation on a dangling cache symlink; replaced only that replay cache with a real copy and reran the same checker. Original retained packets unchanged.

Source inventory has no count cap, separates samepayer MFJ recipients, retains issuedzero-taxable copies and separately sourced unemployment; zero-taxable refund-only packet prints1040alone. Positive taxable refunds retain completed AMT computation at zeroAMT without inventing a6251 attachment. Broader tax-benefit workpapers, recovery years/corrections/business classifications, authenticity, IRS business rules and acceptance remain open. Form4852 derivednative26/0 isolated593f1cc34 remains guarded; fullroute delegated after compactfe9765617. FullV4 same44964/44970 confirmedlive33m27s; latestfull stillrequired.
