# TY2025 Form 4952 portfolio royalty boundary

Sources:
[2025 Form 4952 and its instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf),
especially line 4a (royalties from property held for investment, outside the
ordinary course of business) and line 8 (royalty-attributable interest goes to
Schedule E), plus checked-in v5.4 `Common/IRS4952/IRS4952.xsd`.

An affirmatively classified Form 1099-MISC box 2 portfolio royalty sends the
same amount to Schedule E income and Form 4952 line 4a. A bounded filing route
now requires one 1099-MISC and one separately identified, nonbusiness,
expense-free Schedule E royalty property. The property's source pointer must
match the payer, recipient, and box 2 amount; the recipient must be the primary
Form 1040 filer and the Schedule E property must be taxpayer-owned. The 1099
passthrough is reconciled to that property and counted once on Schedule E line
4, Schedule 1 line 5, and Form 1040 line 8. Form 4952 line 4a and all numbered
lines reconcile to the same box 2 amount, while line 8 reconciles to Schedule A
line 9 and the selected itemized deduction. The Schedule E PDF leaves its
royalty property address and rental-day cells blank as the 2025 instructions
require. The 1099 may not carry other income or withholding boxes; additional
royalties, expenses, foreign-tax interaction, elections, AMT adjustments, or K-1
code B remain outside this slice. Separately entered investment interest must
explicitly exclude royalty-attributable interest, which belongs on Schedule E.
Source, XML, and PDF cases are written but unrun.

The royalty cannot be classified to Schedule C or have an empty box 2. Omitting
box 2 routing defaults to Schedule E; zero or unspecified box 2 income produces
no royalty output unless the Form 4952 affirmation is present, in which case it
is rejected. If manually entered investment property gross income coexists with
sourced royalties, the manual figure must explicitly exclude those royalties. A
Schedule E passthrough alongside a property item still rejects unless it matches
the one linked 1099-MISC royalty property.

This is not general royalty or broker coverage. The affirmation does not
independently authenticate investment-purpose ownership or rule out a passive
activity. The interest amount and declaration that it excludes
royalty-attributable interest are user-supplied; no issued loan statement,
payment record, or debt-proceeds tracing workpaper has been authenticated. The
route proves a narrow arithmetic and filing join, not that the borrowing
qualifies for an investment-interest deduction. Direct Form 4952 source fields
without a bounded 1099, K-1, or linked royalty route reject at both MeF and PDF
export: they are not reconciled to the underlying information returns. The
reported royalty may have deductible Schedule E expenses not yet linked to Form
4952 line 5. Royalty-attributable investment interest requires a separate
Schedule E allocation; the current node routes all line 8 to Schedule A, so that
interest source is not supported by this addition. Disposition gains require
netting all investment-property gains, losses, and capital-loss carryovers
before lines 4d/4e; a positive per-broker-transaction shortcut would overstate
the deduction. The AMT refigure also still relies on asserted source adjustments
rather than a full AMT-basis reconstruction. No local tests, typecheck, XSD,
PDF, or IRS ATS validation has run in the build-first pass.

No compatibility layer, fallback, or dual API was added.

## Ordinary 1099-DIV filing slice

A bounded Form 1099-DIV box 1a path checks every source item against Form 4952
line 4a, recalculates every Form 4952 numbered line, verifies line 8 against
finalized Schedule A line 9, and verifies the ordinary dividend and an itemized
deduction at least as large as line 8 on finalized Form 1040. The same check
runs before both MeF XML and PDF field projection. It accepts affirmatively
investment-property payers with ordinary dividends and an optional sourced
qualified-dividend component, but no capital-gain component, other investment
income, or election, with a zero-adjustment AMT refigure and a positive
separately entered investment-interest expense. Missing raw Form 1099-DIV,
Schedule A, Form 1040, or conflicting line values stop that path. Focused
source, MeF, PDF, and negative cases are written but not run.

With a sourced box 1b amount, this route removes it on line 4b and reconciles
Form 1040 line 3a; no line 4g election is made. This does not independently
establish the debt, interest payment, or tracing of the loan proceeds to
investment property. Form 1040's itemized-deduction total can include other
Schedule A items, so the descriptor verifies that line 12e is at least Form 4952
line 8, not that the entire Schedule A total has been reconstructed.
Capital-gain distributions, Schedule E royalty interest, broker transaction
netting, and AMT-basis differences still need separate bounded source
reconciliation. General Form 4952 inputs outside the bounded 1099 and
partnership-K-1 routes stop at export instead of producing an unsourced
document.

## Foreign-tax interaction boundary

The ordinary-dividend MeF and PDF route stops if any 1099-DIV reports box 7
foreign tax, box 8 foreign country or possession, a positive foreign-source
dividend amount, or a foreign-tax country code. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) include
investment interest in line 4b's other-interest allocation: generally the asset
method apportions it between U.S. and foreign source income, although eligible
taxpayers with no more than $5,000 of gross foreign-source income may allocate
it all to U.S. source. The current Form 4952 reconciliation has neither the full
worldwide foreign-income threshold nor the asset bases or election needed to
verify which route applies. This guard does not assert that Form 4952 itself is
incorrect; it prevents a positive foreign-tax interaction claim from passing
through this bounded filing slice without reconciliation. A focused MeF and PDF
negative case is written but not run. General non-1099 Form 4952 paths beyond
the bounded partnership-K-1 route remain blocked at export.

All bounded Form 4952 MeF/PDF routes also stop when an independent Form 1116 is
present in the return. A domestic 1099 payer does not establish that the return
has no other foreign-source income, so K-1 code H interest can still require
Form 1116 line 4b apportionment. Reopening that combination needs reviewed
worldwide foreign-source gross income, the applicable small-income allocation
choice or investment-asset bases, and reconciliation of each Form 1116 line 4b
allocation with the Form 4952 deduction. Focused mixed-source and
ordinary-interest rejection cases are written but unrun.

## Ordinary 1099-INT box 1 filing slice

A second bounded MeF/PDF route checks affirmatively investment-property Form
1099-INT box 1 payers against Form 4952 line 4a, recalculates every numbered
line, verifies line 8 against finalized Schedule A line 9, and verifies box 1
taxable interest plus an itemized deduction at least as large as line 8 on
finalized Form 1040. It accepts only unadjusted box 1 interest, a positive
separately entered investment-interest expense, no other investment-income or
election components, and a zero-adjustment AMT refigure. Foreign-source
interest/foreign tax, other 1099-INT boxes or interest adjustments stop. The
foreign-tax boundary follows the Form 1116 line 4b allocation issue above.
Focused source, MeF, PDF, and negative cases are written but unrun.

This route does not authenticate the debt, interest payment, or investment use
of the borrowed proceeds; those remain separately entered facts. Other source
combinations, including broker disposition netting and nonportfolio activity
income, are not promoted to source-verified coverage by this addition.

## Combined interest and ordinary-dividend payers

The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
put both investment-property interest and ordinary dividends on line 4a and
separately remove qualified dividends on line 4b. A bounded combined MeF/PDF
route accepts one or more affirmed, unadjusted Form 1099-INT box 1 payers and
one or more affirmed Form 1099-DIV box 1a payers, with optional sourced box 1b
qualified dividends. It checks each raw source against its separate Form 4952
source field, recomputes every numbered Form 4952 line, verifies line 8 against
finalized Schedule A line 9, and matches the income amounts to finalized Form
1040 lines 2b, 3a, and 3b. Form 1040 line 12e must contain at least the line 8
deduction. The route requires a positive separately entered investment-interest
expense and an explicit zero-adjustment AMT refigure. Focused source, MeF, PDF,
and rejection cases are written but unrun.

The combined slice is not capital-gain distribution, foreign-source/foreign-tax,
interest-adjustment, or election coverage. It does not independently establish
loan tracing or payment. Non-1099 income paths other than the bounded
partnership-K-1 route remain blocked at export. The full test, typecheck, XSD,
and filled-PDF batch remains pending.

## Several ordinary interest and dividend payers

The combined route now sums all supplied, affirmatively classified Form 1099-INT
box 1 and Form 1099-DIV box 1a payers. Every payer must satisfy the same
unadjusted domestic-source restrictions. Each accumulated source amount must
match one supplied form amount, without relying on payer order. The aggregate
source fields, every calculated Form 4952 line, Schedule A line 9, and Form 1040
lines 2b, 3a, 3b, and 12e are reconciled before MeF or PDF output. A foreign-tax
or foreign-source item on any supplied payer, an empty source list, or a
mismatch in either aggregate stops export. Multi-payer positive and negative
cases are written but unrun. The one-type-only routes now accept multiple
ordinary payers too; other investment-income classes remain unsupported. Source
amounts are cross-checked in aggregate, not matched payer by payer;
independently missing source documents could still escape this check. This does
not prove debt tracing or the AMT refigure.

## Partnership K-1 interest and investment-interest-expense route

One or more distinct 2025 partnership K-1s can each supply both box 5 portfolio
interest and box 13 code H investment interest for Form 4952. The bounded
MeF/PDF route requires each partnership EIN, unique source-document reference,
investment-property affirmation, and no other modeled K-1 amounts. Each
accumulated Form 4952 source amount must match one K-1 box amount, independent
of payer order. It recalculates every numbered line, checks line 8 against
Schedule A line 9, and matches the box 5 sum to finalized Form 1040 line 2b and
the deduction to line 12e. Every bounded Form 4952 export route also requires
the finalized deduction-choice result to select itemizing, Form 1040 line 12a to
be absent, and Form 1040 line 12e to equal the calculated Schedule A total, not
merely exceed Form 4952 line 8. Foreign items, AMT adjustments, carryovers,
elections, manually entered investment interest, and mixed sources beyond the
separately bounded K-1/1099-INT and K-1/1099-DIV routes remain blocked at
export. Focused positive and negative cases are written but unrun. The
source-document references identify the K-1s; they are not independent
authentication of the issued form. The full validation batch and filled-PDF
review are still pending.

## Partnership K-1 expense against Form 1099-INT income

A separate bounded route combines one or more identified partnership K-1 box 13
code H investment-interest expenses with one or more affirmatively
investment-property Form 1099-INT box 1 payers. Each K-1 has a unique EIN and
source reference and no other modeled K-1 amounts; each 1099-INT is unadjusted
and domestic. The separate accumulated amounts must match the supplied source
amounts. All Form 4952 numbered lines, Schedule A line 9, the selected itemized
total, and Form 1040 lines 2b/12e reconcile before MeF or PDF. K-1 portfolio
income, other K-1 expenses, foreign-tax facts, manually entered loan interest,
carryovers, and elections remain outside this route. Positive and negative cases
are written but unrun, and source references are not authenticated.

## Partnership K-1 expense against Form 1099-DIV income

A separate bounded route combines identified partnership K-1 box 13 code H
investment-interest expense with domestic, affirmatively investment-property
Form 1099-DIV box 1a ordinary dividends. Box 1b qualified dividends stay on Form
4952 line 4b and are excluded from the investment-income limit when no line 4g
election is made. Each K-1 needs a distinct EIN and source reference, and each
payer's ordinary and qualified amounts must match the separate accumulated Form
4952 facts. The route recalculates every numbered line and checks the deduction
against Schedule A and the selected itemized Form 1040 total, plus Form 1040
lines 3a and 3b. Both MeF and PDF use the same check.

Foreign-source dividends or tax, capital-gain distributions, nominee amounts,
other K-1 income or expense, manual interest, carryovers, positive AMT
adjustments, and the line 4g election remain outside this route. It does not
independently authenticate the issued K-1s, loan tracing, or the interest
payment. Focused positive and negative cases are written but unrun. The full
test, TY2025 XSD, filled-PDF, business-rule, and ATS batch remains pending.

## Plain Form 1099-OID box 1 investment income

The existing Form 1099-OID node already routes affirmed taxable OID into the
canonical Form 4952 investment-interest source field, but export previously
matched that field only to Form 1099-INT payers. A bounded OID-only route now
matches each positive box 1 amount to its source document, recalculates every
Form 4952 line, and checks Schedule A line 9 and finalized Form 1040 lines 2b
and 12e before either MeF or PDF output. This follows the
[IRS Forms 1099-INT
and 1099-OID instructions](https://www.irs.gov/instructions/i1099int), which
classify box 1 OID as taxable interest, and the
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf),
which include taxable interest in investment income when the property is held
for investment.

Only unadjusted box 1 OID with an explicit investment-property affirmation is
covered. Plain affirmed Form 1099-INT box 1 and Form 1099-OID box 1 payers may
now coexist: each source amount must match one submitted payer amount, their sum
must match Form 4952 line 4a and finalized Form 1040 line 2b, and the Schedule
A/itemization checks remain required. Other periodic interest, Treasury OID,
market discount, acquisition or bond premium, nominee amounts, tax-exempt OID,
investment expenses, withholding, and FATCA still stop at export. Loan tracing
and payment of the investment-interest expense are not independently proved.
Focused positive and negative cases are written but unrun under the build-first
workflow.

## Mixed plain box 1, box 3, and OID taxable interest

The interest-only MeF/PDF route now reconciles the per-payer taxable-interest
amount from affirmed, unadjusted Form 1099-INT boxes 1 and 3 and Form 1099-OID
box 1. A 1099-INT payer with both boxes 1 and 3 contributes their sum once,
matching the existing source-node output. Different payers may supply either
box, and plain OID payers may coexist. Each accumulated Form 4952 source amount
must match one payer, with the full total matching line 4a and finalized Form
1040 line 2b. The
[IRS 1099-INT/OID instructions](https://www.irs.gov/instructions/i1099int)
identify box 3 as U.S. savings-bond or Treasury interest distinct from box 1;
the
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include taxable interest from investment property on line 4a.

This does not cover bond premium, educational savings-bond exclusions, foreign
tax, OID adjustments, or a source without the investment-property affirmation.
The finalized-return reconciliation catches a taxable-interest exclusion but
does not independently establish ownership or loan tracing. Focused MeF/PDF
positive and negative cases are written but unrun.

## Treasury box 3 plus plain OID and ordinary dividends

The combined MeF/PDF route also accepts an affirmed, unadjusted Form 1099-INT
box 3 Treasury-interest payer alongside a separately identified Form 1099-OID
box 1 payer and an ordinary Form 1099-DIV payer. The
[IRS 1099-INT/OID instructions](https://www.irs.gov/instructions/i1099int) put
U.S. Savings Bond and Treasury interest in 1099-INT box 3, not box 1, and
taxable non-Treasury OID in 1099-OID box 1, not Treasury OID box 8. The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include interest from property held for investment on line 4a. Each positive
source amount must match its supplied payer, their interest total must match
finalized Form 1040 line 2b, all numbered Form 4952 lines must recalculate, and
line 8 must reconcile to the selected itemized Schedule A deduction.

This removes only the former blanket box-3-plus-OID rejection. Bond premium,
adjusted OID, Treasury OID box 8, foreign-source/tax facts, unclassified
investment property, a missing payer, or a source/return mismatch still reject.
The payer records and investment-property classification are supplied facts, not
independent verification of issued statements or loan tracing. Focused source,
MeF, PDF, and rejection cases are written but unrun; full XSD, filled-PDF,
business-rule, and ATS validation remains pending.

## Plain 1099-OID and ordinary-dividend combination

The combined investment-income export route now accepts one or more affirmed,
unadjusted Form 1099-OID box 1 payers alongside ordinary Form 1099-DIV box 1a
payers, with or without additional plain Form 1099-INT box 1 payers. It matches
every interest source amount to a supplied payer, then reconciles the total to
Form 4952 line 4a and finalized Form 1040 line 2b. It independently matches each
ordinary dividend to Form 4952 and finalized Form 1040 line 3b, recalculates all
numbered Form 4952 lines, and checks Schedule A line 9 and the selected
itemized-deduction total before either MeF XML or PDF projection. Invalid
supplied interest documents stop export instead of being ignored when another
interest type is valid. Focused positive and negative cases are written but
unrun.

This remains limited to domestic, unadjusted box 1 OID and ordinary dividends
with at most sourced box 1b qualified dividends, and without capital-gain
distributions, foreign-source or foreign-tax components, other income,
carryovers, or an election. Issued payer forms and investment-loan tracing are
not independently authenticated. The single full test, TY2025 XSD, filled-PDF,
IRS-rule, and ATS batch remains pending.

## Combined interest and qualified-dividend slice

The combined Form 1099-INT or plain Form 1099-OID interest plus Form 1099-DIV
route now also accepts sourced box 1b qualified dividends without a line 4g
election. It matches each qualified amount to a supplied dividend payer,
subtracts the aggregate on Form 4952 line 4b, and checks the aggregate against
finalized Form 1040 line 3a. The Form 4952 deduction uses line 4h after that
subtraction, with the existing Schedule A line 9 and itemized-total checks. The
[2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) explicitly
excludes box 1b on line 4b unless elected back into investment income on line
4g; this slice requires line 4g to be zero. A sourced positive case and a
mismatched-1040 rejection case are written but unrun. The box 1b source is still
the reported 1099-DIV and has not been independently authenticated;
foreign-source allocation, capital-gain netting, and the line 4g tax-rate
election remain blocked.

## Remaining in-scope Form 1040 boundaries

The positive MeF/PDF slices still do not cover a Form 1099-DIV box 2a
capital-gain distribution or other disposition gain: line 4d must net all
investment-property gains, losses, and capital-loss carryovers. A line 4g
election additionally changes the preferential-rate Form 1040 line 16 tax
calculation. Prior-year Form 4952 line 7 carryforward needs the actual filed
2024 form and a 2025-to-2026 balance record. Direct investment expenses and
royalty-attributable interest need their own source-to-Schedule A or Schedule E
allocation. Foreign-source income or Form 1116 requires investment-interest
allocation across U.S. and foreign assets. The zero-adjustment AMT assertion and
manual loan-interest tracing are not independently authenticated. None of these
cases is silently treated as the newly supported qualified-dividend combination.
