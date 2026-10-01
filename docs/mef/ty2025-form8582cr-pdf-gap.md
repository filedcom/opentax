# TY2025 Form 8582-CR PDF boundary

Status: a bounded source-backed Form 8582-CR PDF descriptor is registered for
one current-year passive New Markets credit from a self-earned Form 8874
investment, a credit-only partnership K-1 box 15 code AD, or a credit-only
S corporation K-1 box 13 code AD, plus one
Schedule E passive rental income activity. Other branches remain closed at PDF
export until their source, final-return, and carryforward joins are complete.

## Bounded ordinary-tax filing route (written, unrun)

`form8582cr.line6_ordinary_worksheet` is a direct reviewed source record for
the one-rental ordinary-tax calculation. The native and PDF exporters recompute
its taxable-income-with/without-passive tax pair from the finalized Form 1040
method, Schedule E rental ledger, Schedule 1, and filer status. The credit
activity may be distinct from the rental income activity: one issued Form 8874
investment must exactly match the Form 8582-CR source's activity, source
document, and current-year amount. Alternatively, one partnership K-1 box 15
code AD or S corporation K-1 box 13 code AD must match the pass-through
EIN/name, K-1 reference, recipient TIN, passive classification, and
current-year amount. That K-1 has no other income,
deduction, or credit boxes in this bounded route, so the Schedule E rental is
the complete positive passive-income inventory. No prior credit, PTP, special allowance,
additional passive income source, or Part VI election enters this route.
The [2025 partnership K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
identify box 15 code AD as the New Markets credit, direct it to Form 8874 or
Form 3800 Part III line 1i, and require Form 8582-CR for passive credits. The
[2025 S corporation K-1 instructions](https://www.irs.gov/instructions/i1120ssk)
give the same filing directions for box 13 code AD. The
bounded pass-through route uses the direct Form 3800 path and does not attach
an unsourced individual Form 8874.

Both exporters re-derive the current-year Worksheet 9 ledger and match its
allowed/unallowed amount to line 37 and the Form 3800 passive allocation.
Form 3800 line 38, Schedule 3 line 6a/8, and Form 1040 line 20 must agree
with the allowed credit. The PDF prints Parts I and V: line 4a/4c, lines 5-7,
and line 37; unused special-allowance fields stay blank. Its AcroForm mappings
follow the official two-page blank, including page 2 `f2_21` for line 37.
Full-return/native/PDF fixtures for all three source kinds and source, credit, tax,
and return-tamper fixtures are authored for deferred validation.
The [2025 IRS instructions](https://www.irs.gov/instructions/i8582cr) direct
the same Form 1040 tax method for both line 6 worksheet tax calculations and
state that line 7 zero allows direct line 37 reporting; Worksheet 9 applies
when source credits remain unallowed. The retained current-year ledger covers
that latter case but is not yet an authenticated accepted-return record or
2026 importer. Source bytes, filled-output/XSD review, and wider credit or
income mixes remain open.

### Remaining native-only and rejected branches

The existing native builder can still emit broader `IRS8582CR` rows from
supplied tax values. The printable descriptor rejects these branches pending
their line 6 source, final-return tax method, or carryforward join:

| Native calculation branch | Printable gap |
| --- | --- |
| Other-category current-year credits from estate, trust, or cooperative K-1 sources; partnership or S corporation K-1s with other income, deduction, or credit boxes; or self-earned sources other than the one Form 8874 investment | Complete passive-income inventory, issuer evidence, and final-return line 6 join. |
| Multiple current-year credit activities or mixed Form 3800 reporting lines 3, 24, and 33 | Per-activity allocation and Form 3800/Form 1040 tax-use proof for every source. |
| Prior-year unallowed credits in any category | Authenticated prior filed Worksheet 9 by origin year and activity, accepted-return reference, and current-year vintage allocation. |
| Active-participation rental, rehabilitation/pre-1990 housing, or post-1989 low-income housing credits | Parts II-IV MAGI, Form 8582 line 9, and tax-on-reduced-income worksheets with native/PDF parity. |
| Other tax methods, multiple Schedule E rentals, K-1 or farm-rental passive income, and passive dispositions | Reperform line 6 under the actual finalized Form 1040 method and complete passive net-income set. |

Publicly traded partnerships are already rejected by the source schema.
Allowed Form 8834 credits are rejected by the native builder pending their
separate filing/tax limit. Estate/trust orphan-drug box 13 code M remains
rejected for absent reviewed passive-source evidence. These are not positive
native-only filing paths. The Part VI basis-increase election has no modeled
source and remains outside both exporters.

Estate and trust K-1 **box 13 code M is orphan-drug credit**; **box 14 code M
supplies clean electricity investment-credit information**, under the
[2025 beneficiary instructions](https://www.irs.gov/instructions/i1041sk1).
The box 13 orphan-drug claim through Form 8582-CR remains rejected at the
activity and required-source input because its reviewed source and passive
activity route have not been built. Native export repeats that gate. Rejection
fixtures are authored for the deferred batch. The distinct box 14 statement
feeds Form 3468 Part V and Form 3800 line 1v where supported.

The [official Form 8582-CR](https://www.irs.gov/pub/irs-pdf/f8582cr.pdf) is the
December 2024 revision used with the
[December 2025 instructions](https://www.irs.gov/instructions/i8582cr). The
two-page blank has Part I credit worksheets 1-4 and lines 5-7, special
allowances in Parts II-IV, allowed credit on line 37, and a separate
basis-increase election in Part VI. The current model has no Part VI election
source, so even a future bounded PDF route must reject that election rather than
silently leave it blank.

The official two pages were rendered and visually inspected on 2026-09-29.
Their canonical AcroForm contains 51 leaf fields: page 1 has filer name/TIN at
`f1_1`/`f1_2`, then 24 numeric fields `f1_3`-`f1_26` for lines 1a-16; page 2
has 21 numeric fields `f2_1`-`f2_21` for lines 17-37, then the Part VI box
`c2_01_0_` and four text fields `f2_22`-`f2_25` for lines 39-41. The logical
names have the `topmostSubform[0].Page1[0]` or `Page2[0]` prefix. This is a
field-location inventory; the bounded descriptor above now uses the verified
line order and page 2 line 37 field.

The native `IRS8582CR` builder recalculates Parts I-IV and line 37 from
`form8582cr.credit_sources`, `regular_tax_all_income`, and
`regular_tax_without_passive`. The bounded current-year sources are one passive,
self-earned Form 8874 investment, one credit-only partnership K-1 box 15
code AD, or one credit-only S corporation K-1 box 13 code AD. The native builder
can join the first to its attached Form 8874 and each pass-through source to
its issuer, recipient, reference, and reported credit. All three join
their allowed allocations to Form 3800. Form 3800 separately requires finalized Part II tax
context and a matching passive allocation. These joins do not prove the Form
8582-CR tax attributable to passive income on line 6:
`regular_tax_without_passive` remains an entered number in the general model.
The bounded ordinary-tax route above replays both tax sides against the same
final return and its identified passive rental income; other tax methods and
passive income sets remain unproved.

The [December 2025 IRS instructions](https://www.irs.gov/instructions/i8582cr)
require line 6 to use taxable income with and without net passive income, with
both tax amounts computed by the method used for the return. They also use
prior-year Worksheet 9 column (b) as the source for multiple unallowed
activities or credit types. The bounded current-year route preserves that
worksheet's activity/source identity and recomputes both tax sides from the
finalized ordinary-tax method.

The apparent zero-tax subset is not a safe shortcut. A positive source credit
with line 37 equal to zero becomes an unallowed passive activity credit. The
node currently returns only the scalar `suspended_pac_8582cr` carryforward; it
does not persist the activity, source document, original credit year, reporting
route or per-source suspended amount needed to use that credit in a later
return. A PDF-only success would mask that missing carryforward contract.

A versioned, storage-ready TY2025 Worksheet 9 result now exists for the
current-year-only subset. It preserves every activity's complete credit source,
Form 3800/8834 route, allowed and unallowed dollars, and 2025 origin year;
its schema reconciles all rows to line 5, line 37, and the suspended total.
It deliberately rejects any prior-year unallowed credit because the filed
prior Worksheet 9 and an ordering rule are still needed to assign allowed
amounts to vintages. This helper is not yet a persisted accepted-return record
or a next-year importer. Authored positive and tamper fixtures remain unrun.
The accepted-return import and wider line 6 sources still block broader
source-to-return parity.
The current source schema now requires whole-dollar tax values and rejects a
tax-without-passive amount above the all-income amount before the line 6
subtraction. This prevents an inverted input from being silently clamped to
zero; it does not establish either tax amount from the finalized return method.

The bounded route now uses the reviewed tax-without-passive worksheet and a
current-year per-activity ledger. Wider routes still need accepted-return
carryforward records, all passive-income sources, and a source-backed treatment
of special allowances and Part VI before their lines can print.

The prior audit added no PDF descriptor or print test. The bounded route above
adds both, authored but unrun; no typecheck, XSD validation, or filled-PDF
rendering has been run in this implementation pass.

## Ordinary-tax line 6 source implementation

A bounded worksheet now recomputes both line 6 tax sides using the same TY2025
ordinary Tax Table/Tax Computation Worksheet function as Form 1040 line 16.
It accepts one positive passive Schedule E rental activity, a retained income
ledger reference on that property, and final Form 1040 lines 8, 9, 11, and
14-16. Schedule 1 line 5 and line 10 must equal the activity's computed net
income; final taxable income and the all-income tax must match the filed
return. The worksheet subtracts that net passive income from taxable income
and independently computes the without-passive tax. It compares both results
to the Form 8582-CR tax pair, rejecting changed sources and tax amounts.
This follows the [2025 line 6 instructions](https://www.irs.gov/instructions/i8582cr),
which require the same tax method used for the return on both taxable-income
amounts. Positive and tamper fixtures are authored for deferred verification.

The worksheet is registered only for the bounded route above. The current
graph still does not prove an exclusive passive-income inventory across wider
Schedule E, K-1, Form 4835, property-disposition, and other sources, or persist
accepted-return Worksheet 9 balances. Preferential tax methods, special
allowances, PTPs, and Part VI remain closed.

### One taxable-interest source with the rental (2026-10-01, unrun)

The ordinary-tax line 6 route also accepts one retained Form 1099-INT with a
positive whole-dollar box 1 amount, payer, and source-document reference. It
requires no other 1099-INT boxes or adjustments, matches box 1 to finalized Form
1040 line 2b, and includes that amount in line 9 and in both ordinary-tax
calculations. The passive rental remains the only income removed for the
without-passive side, following the
[Form 8582-CR line 6 instructions](https://www.irs.gov/instructions/i8582cr).
The resulting credit still joins Form 3800, Schedule 3, Form 1040, native MeF,
and the two-page PDF. A positive full-return fixture and altered box 1,
unsupported box 3, filed interest, and final-tax fixtures are authored but
unrun. OID, bond premium, foreign interest, other
income types, and issuer-copy authentication remain outside this bounded branch.

### Distinct box 1 interest payers (2026-10-01, unrun)

The same Form 8582-CR line 6 route now sums any number of retained Form
1099-INT box 1 records with distinct payer TINs and source-document references.
Each record must have positive whole-dollar box 1 interest and no other boxes
or adjustments. The exporter compares the sum to finalized Form 1040 line 2b
and includes it in total income and both ordinary-tax calculations; only the
sourced rental income is removed for line 6's without-passive calculation.
Positive two-payer full-return/native/PDF and changed amount, duplicate copy,
duplicate payer, missing payer, unsupported box, and filed-interest fixtures
are authored for deferred validation. Multiple records from one payer and
issuer-copy byte authentication remain outside this bounded branch.

## 2026 opening credit prerequisite

The current-year-only Worksheet 9 ledger now has a strict, standalone 2026
opening contract. `reconcileForm8582CRNextYearOpening` re-derives the 2025
ledger from its original Form 8582-CR input, compares it to the recorded filed
ledger and accepted-return reference, then requires every positive unallowed
credit to appear exactly once with the same activity, source document, credit
route, 2025 origin, and amount. Missing, duplicate, changed, or extra rows
reject. Positive and tamper fixtures are authored for the deferred batch.

The accepted-return reference is still a supplied identifier, not verified IRS
acknowledgment evidence. There is no durable store or 2026 engine importer;
prior-year Worksheet 9 credits that originated before 2025 remain closed.
The bounded 2025 PDF route does not create an authenticated 2026 opening.

## Reviewed 2024 single-activity opening candidate (2026-10-01, unrun)

The [2024 Form 8582-CR instructions](https://www.irs.gov/pub/irs-prior/i8582cr--2024.pdf)
allow a single credit type from one passive activity to derive its unallowed
credit by subtracting prior Form 8582-CR line 37 from line 5; other mixes use
Worksheet 9 column (b). A new standalone candidate reconciles reviewed 2024
Form 1040/Form 8582-CR copy references and their taxpayer TIN, one self-earned
Form 8874 New Markets credit, prior lines 5/37, and the same activity, source,
route, document reference, origin year, and dollar amount in the 2025 Form
8582-CR input. It also previews 2025 Part I lines 4b/5/37 and that source's
Form 3800 passive allocation. The candidate requires an explicit review that
no recapture or bankruptcy transfer changed the credit. Positive and
taxpayer, amount, activity, year, and source-copy tamper fixtures are authored.

These copy references and review assertions do not prove that the IRS accepted
the 2024 return or that the copies match accepted bytes. No authenticated
acknowledgment/status parser or accepted prior-return import exists, so the
candidate is not passed to the 2025 native or PDF exporter and does not open a
Form 3800, Schedule 3, or Form 1040 carryforward claim. The existing PDF
ordinary route still rejects prior credits; its general native-only shape
remains an audit gap rather than evidence of complete filing support.
