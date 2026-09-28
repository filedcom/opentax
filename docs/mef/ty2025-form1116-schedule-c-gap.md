# TY2025 Form 1116 Schedule C: source ledger and filing boundary

The
[IRS December 2025 Schedule C instructions](https://www.irs.gov/instructions/i1116sc)
require a Schedule C on the current return for each affected income category
after a section 905(c) redetermination, even when no U.S. liability changes. A
change in any relation-back or carryover-affected year's U.S. liability also
requires an amended return for that year. The
[three-page Schedule C](https://www.irs.gov/pub/irs-pdf/f1116sc.pdf) separates
payor increases and decreases in Parts I/II, category/year foreign tax and
credit in Part III, affected-year U.S. liability in Part IV, and annual
contested-tax reporting in Part V. The checked-in TY2025 v5.4
`IRS1116ScheduleC.xsd` has a distinct root; it is not a field inside Form 1116.

`form1116_schedule_c_source` is now a public source input carrying one ledger
per income category and relation-back year. Each ledger identifies payors,
country and foreign tax year, foreign taxable income, local and functional
currency tax change, the original conversion rate, filed and revised payor
U.S.-dollar tax, event kind/date, filed and recalculated Form 1116 category tax
and credit, and a liability comparison for each reviewed affected year. Every
row requires document references. The source validates calendar dates,
local-to-USD arithmetic, payor and category tax reconciliation, unique
category/year ledgers, the 24-month deemed-refund date, and the presence of a
relation-back-year review. A cash-method additional prior-year tax payment is
rejected as a Schedule C Part I event because the instructions place it on
current-year Form 1116 Part II. The source also rejects a 24-month deemed-refund
event for a paid-method relation-back year, since the
[IRS instructions](https://www.irs.gov/instructions/i1116sc) apply that rule to
accrued foreign tax that remains unpaid after 24 months. This guard is written
with a focused unrun rejection case; it does not activate Schedule C export.

This ledger is evidence intake and a filing guard, not permission to file
Schedule C. The Form 1116 node and direct MeF/PDF paths still stop when it is
present. Native Schedule C construction beyond the bounded staged projection
remains open: validate separate category documents, multiple payors and
relation-back years, affected-year differences, and any required supplemental
statements. Reconcile changed prior-year credits and carryovers into 2025 Form
1116/Schedule B and determine the actual Form 1040-X package for each year whose
liability changes. A caller's `all_affected_years_reviewed` assertion is not
independently proven by the current-return graph. Part V and contested
provisional credits require a separate Form 7204-linked history and annual
status; they are not accepted as an unclassified `other_adjustment` event.
Current source rows are also insufficient to automate a positive cash-method
prior-year payment on 2025 Form 1116 Part II.

For a real return, obtain the original or latest amended Form 1116 for each
relation-back category and year; any filed Schedule B and later carryover
workpapers; each relevant filed Form 1040 and amendments; foreign assessment,
tax return, payment, refund, and currency-rate records for each payor;
recalculated Form 1116 and U.S. tax for every affected year (including 2025 if
carryovers change); and Form 7204 plus annual contest records where applicable.
Without these external records, a complete schedule or amended-return conclusion
cannot be established. Existing test cases for the source ledger and export
guards are written but unrun. Typecheck, XSD, PDF rendering, full-batch tests,
and IRS acceptance remain pending.

## Build-first progress: native projection, still not filed

`buildScheduleCProjection` now stages native Parts I-IV for one passive or
general category, one payor, and one relation-back/affected year. It emits Part
I or II payor rows and subtotals, Part III category tax and credit, and Part IV
liability and difference. The payor ID is now explicitly typed as EIN or foreign
reference ID so the native choice cannot be guessed from a string. The 24-month
deemed-refund check uses the foreign tax year end, as the
[IRS instructions](https://www.irs.gov/instructions/i1116sc) require, rather
than the U.S. relation-back year end. Focused cases are written but unrun.

This projection is deliberately not registered for return export. A bounded
filed-year arithmetic recomputation is described below; a complete affected-year
return and source-document review remain open. Current Form 1116 MeF/PDF guards
remain. Multiple payors/years, carryover consequences, amended returns, Part V,
supplemental statements, and filled-PDF/XSD validation remain open. The external
filed returns, foreign records, and workpapers listed above are still required.

## Filed-year arithmetic checkpoint, still staged and unrun

The staged `buildScheduleCProjection` now requires transcribed filed-year Form
1116, Schedule 3, and Form 1040 lines with document references for a single 2023
or 2024 calendar-year relation-back year. It recomputes the Form 1116 line 19
ratio and lines 21/23/24/35 credit, cross-checks the Schedule 3 transfer and
Form 1040 lines 15-24, and recomputes the revised credit and total tax from the
redetermined foreign tax. The projection rejects a mismatch with either side of
the Schedule C ledger. It also requires both filed and revised tax below the
category limit, so this bounded case cannot silently change an excess
foreign-tax carryover. Focused positive and mismatch cases are written but have
not run.

This checkpoint is intentionally narrow: one passive or general category, one
relation-back/affected year, no carryovers or carrybacks, no other Form 1116
category, no foreign-tax adjustments, no other nonrefundable credits, no special
tax computation, and unchanged income and non-FTC tax lines. The reviewed
absence of later-year tax-attribute effects is still supplied with a document
reference, not proven by the current-year graph. Document intake requires six
base reviewed PDF/hash records for the filed return, filed Form 1116 and
Schedule 3, revised Form 1116 calculation, affected-year recalculation, and
later-year review, plus one for every payor foreign record. The filed documents
and amended-year workpapers must be reviewed for authenticity and completeness.
The projection remains unregistered, so no Schedule C is filed from these
assertions. Supporting primary sources:
[2023 Form 1116](https://www.irs.gov/pub/irs-prior/f1116--2023.pdf),
[2024 Form 1116](https://www.irs.gov/pub/irs-prior/f1116--2024.pdf),
[2023 Form 1040](https://www.irs.gov/pub/irs-prior/f1040--2023.pdf),
[2024 Form 1040](https://www.irs.gov/pub/irs-prior/f1040--2024.pdf),
[2023 Schedule 3](https://www.irs.gov/pub/irs-prior/f1040s3--2023.pdf),
[2024 Schedule 3](https://www.irs.gov/pub/irs-prior/f1040s3--2024.pdf), and
[Schedule C instructions](https://www.irs.gov/instructions/i1116sc).

## Up to three staged payor rows, still not filed

The staged native Parts I-IV projection now accepts two or three distinct payors
for the same passive or general category and single relation-back year when all
payor changes have the same direction. It emits each Part I or Part II row and
sums the payor change, original tax, and revised tax into the year subtotal. The
existing filed-year evidence recomputation still compares the aggregate
redetermined Form 1116 tax and credit with the affected-year Form 1040
liability. The [IRS instructions](https://www.irs.gov/instructions/i1116sc)
require an additional statement when there are more than three payors for a
relation-back year; this candidate rejects that case, duplicate payor
identifiers, and mixed increase/decrease events. Focused three-payor and
rejection cases are written but unrun.

The reviewed-PDF intake now accepts each of those one-to-three payors only when
every referenced foreign record has its own reviewed PDF and SHA-256. The
affected-year evidence also transcribes revised Form 1116 lines 9, 14, 23, 24,
33 and 35, the revised Schedule 3 FTC and total, and revised Form 1040 credit
and tax lines. The projection checks those against the filed-year limit, the
redetermined tax, and the independently recomputed U.S. liability; it requires
zero unused foreign tax on both sides and binds the revised line transcriptions
to the reviewed workpaper references. Positive two-payor and revised-line
mismatch cases are written but unrun.

This is still a staged XML calculation only; no Schedule C route is registered
for MeF filing or PDF output. Multiple relation-back years, affected-year
carryover effects, more than three payors with their required statement,
amended-return packages, Part V, source-document authenticity, and the full
test/XSD/PDF/ATS gates remain open. In particular, this source packet does not
yet prove that the necessary prior-year amended return was filed, nor does it
reconcile the 2025 Form 1116, Schedule 3, and Form 1040 graph or independently
prove the absence of later-year attribute effects. Those are filing gates, not
inferred from the zero unused-credit result for the relation-back year.

## Matching PDF field candidate, still unregistered and unrun

The same bounded reviewed ledger now projects the December 2025 Schedule C
AcroForm fields for one to three payors, the applicable Part I and/or Part II
year subtotals, Part III credit, and Part IV affected-year liability. It uses
the staged native builder's source and affected-year reconciliation before
producing fields, so the PDF candidate cannot diverge by accepting a wider
input. The reviewed document result carries both the native XML and PDF field
candidates. A changed affected-year liability is explicitly marked
`required_unverified` for the amended return; no amended package or filing
receipt is inferred from the reviewed workpaper.

The PDF descriptor is intentionally outside the registered PDF forms and the
native Schedule C descriptor remains outside MeF registration. The official
three-page blank form's AcroForm field names were inspected for this mapping; no
filled PDF has been rendered or visually checked. Part V remains blank in this
narrow candidate and contested-tax histories are unsupported. The current return
still rejects any positive Schedule C redetermination until affected-year
amendments, later-year attributes, 2025 Form 1116/Schedule 3/Form 1040 joins,
and the deferred test, XSD, PDF, and IRS-rule gates are resolved.

## Mixed increases and decreases, still staged and unrun

The staged native and PDF projections now place a same-year accrued-tax increase
in Part I and a separate refund or reduction in Part II, with distinct payor
rows and subtotals. Part III uses their net signed change; Part IV still uses
the independently recomputed affected-year U.S. liability. This follows the
[December 2025 IRS instructions](https://www.irs.gov/instructions/i1116sc),
which assign increases to Part I, decreases to Part II, and the category/year
redetermination to Part III. The checked-in TY2025 v5.4 Schedule C XSD has
separate optional Part I and II detail groups in that order. The route remains
limited to one passive or general category, one relation-back and affected year,
at most three distinct payor identifiers in total, and the zero-carryover
filed-year arithmetic checkpoint above. A positive mixed-direction case and a
revised-liability mismatch case are written but unrun.

This does not register Schedule C for filing. The document intake binds PDFs to
reviewed hashes but does not authenticate the filed returns, foreign records, or
amendment receipts. Before a positive return can be exported, the filed or
latest amended relation-back Form 1116, Schedule 3, and Form 1040 must be
authenticated; the foreign payor records and revised workpapers reviewed; any
required affected-year amendment filed and its receipt verified; every
intervening year's carryover and tax attributes checked; and the 2025 Form 1116,
Schedule B, Schedule 3, and Form 1040 effects joined to the current return. No
claim of those facts is inferred from this staged projection.
