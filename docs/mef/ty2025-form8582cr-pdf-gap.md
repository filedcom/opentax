# TY2025 Form 8582-CR PDF boundary

Status: no Form 8582-CR PDF descriptor is registered. This is an open coverage
gap, not an approved exclusion. Do not print a partial Form 8582-CR from its
native MeF calculation until the source, final-return and carryforward joins
below are complete.

The [official Form 8582-CR](https://www.irs.gov/pub/irs-pdf/f8582cr.pdf) is the
December 2024 revision used with the
[December 2025 instructions](https://www.irs.gov/instructions/i8582cr). The
two-page blank has Part I credit worksheets 1-4 and lines 5-7, special
allowances in Parts II-IV, allowed credit on line 37, and a separate
basis-increase election in Part VI. The current model has no Part VI election
source, so even a future bounded PDF route must reject that election rather than
silently leave it blank.

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

The apparent zero-tax subset is not a safe shortcut. A positive source credit
with line 37 equal to zero becomes an unallowed passive activity credit. The
node currently returns only the scalar `suspended_pac_8582cr` carryforward; it
does not persist the activity, source document, original credit year, reporting
route or per-source suspended amount needed to use that credit in a later
return. A PDF-only success would mask that missing carryforward contract.

To open a bounded PDF route, first provide a reviewed, source-linked
tax-without-passive-income worksheet whose inputs reconcile to final Form 1040
taxable income and each passive activity. Preserve per-activity and origin-year
unallowed credit records across tax years. Then map the official AcroForm
fields, reconcile every printed line to the native calculation, Form 8874/Form
3800 documents and final return, and explicitly exclude unsupported special
allowances and Part VI election until they have their own source-backed routes.

No PDF descriptor or print test was added. No test, typecheck, XSD validation or
filled-PDF rendering was run in this audit.
