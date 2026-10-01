# TY2025 Form 8582-CR PDF boundary

Status: no Form 8582-CR PDF descriptor is registered. This is an open coverage
gap, not an approved exclusion. Do not print a partial Form 8582-CR from its
native MeF calculation until the source, final-return and carryforward joins
below are complete.

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
field-location inventory only; there is still no registered descriptor or
filled Form 8582-CR packet.

The native `IRS8582CR` builder recalculates Parts I-IV and line 37 from
`form8582cr.credit_sources`, `regular_tax_all_income`, and
`regular_tax_without_passive`. Its strongest current-year source is one passive,
self-earned Form 8874 investment: the native builder can join the investment's
activity reference and credit amount to the attached Form 8874, and its allowed
allocation to Form 3800. Form 3800 separately requires finalized Part II tax
context and a matching passive allocation. These joins do not prove the Form
8582-CR tax attributable to passive income on line 6:
`regular_tax_without_passive` is an entered number, not a tax calculation
reperformed from the same final Form 1040 income and identified passive activity
income. Matching `regular_tax_all_income` to Form 1040 line 16 would still leave
the other side of that subtraction unproved. Therefore no positive allowed line
37 can yet be printed source-to-return.

The [December 2025 IRS instructions](https://www.irs.gov/instructions/i8582cr)
require line 6 to use taxable income with and without net passive income, with
both tax amounts computed by the method used for the return. They also use
prior-year Worksheet 9 column (b) as the source for multiple unallowed
activities or credit types. The next implementation step must preserve that
worksheet and its source activities, then recompute both tax sides from the
same finalized return method before the native and printable routes can share
line 6.

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
The line 6 tax-without-passive-income source and registered PDF still block
source-to-return parity.
The current source schema now requires whole-dollar tax values and rejects a
tax-without-passive amount above the all-income amount before the line 6
subtraction. This prevents an inverted input from being silently clamped to
zero; it does not establish either tax amount from the finalized return method.

To open a bounded PDF route, first provide a reviewed, source-linked
tax-without-passive-income worksheet whose inputs reconcile to final Form 1040
taxable income and each passive activity. Preserve per-activity and origin-year
unallowed credit records across tax years. Then map the official AcroForm
fields, reconcile every printed line to the native calculation, Form 8874/Form
3800 documents and final return, and explicitly exclude unsupported special
allowances and Part VI election until they have their own source-backed routes.

No PDF descriptor or print test was added. No test, typecheck, XSD validation or
filled-PDF rendering was run in this audit.

## Ordinary-tax line 6 candidate (staged for the next filing join)

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

This worksheet is a **prerequisite**, not a registered filing path. It remains
outside the native and PDF descriptors because the current graph does not yet
prove an exclusive passive-income inventory across Schedule E, K-1, Form 4835,
property dispositions, and other passive sources, or persist accepted-return
Worksheet 9 activity/year balances. Preferential tax methods, special
allowances, PTPs, and Part VI remain closed. Native/PDF registration must call
the worksheet only after those source and carryforward joins are established.

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
The current native route and absent PDF descriptor are unchanged.
