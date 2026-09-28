# TY2025 Schedule J return integration

Status: build-first, unrun. A narrow Schedule F-only ordinary-rate route is
wired in the graph. This is not yet validated as filing-ready.

The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
say the election can replace Form 1040 line 16 tax, but does not apply when
figuring AMT. The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require Form 6251 line 10 to use tax refigured without Schedule J, including
any Form 8814 tax, while leaving Form 1040 line 16 unchanged.

The `income_tax_calculation` node has an internal typed
`schedule_j_calculated_tax` input. The new `schedule_j_calculation` node
supplies it only after the elected amount is bounded by computed Schedule F
profit, Schedule SE deduction, QBI, and finalized taxable income. The public
source supplies the election and filed 2022-24 evidence but cannot supply tax.
The calculation node finalizes all Schedule J lines in the public pending
slot, sends the elected tax to Form 1040 line 16 and related regular-tax
credit consumers, and preserves the no-election refigure for Form 6251. It
rejects overlaps with Form 8615, current-year preferential income and Form
2555. The bounded route also rejects Form 8814, 4972, 8978 and 8621 line-16
add-ons, so native Schedule J line 23 must equal Form 1040 line 16 exactly.
Focused node and end-to-end cases are written but unrun.

Remaining work before broader Schedule J support:

1. Extend attributable-income provenance beyond the bounded Schedule F-only
   return to fishing, share-rent, wages, dispositions, pass-throughs, and
   adjustments. The current guard rejects every other AGI component.
2. Complete the preferential-rate, Form 2555, Form 8615, itemized, NOL, and
   additional-deduction combinations with their own source evidence.
3. The return must reconcile line 23 to the elected Form 1040 tax component,
   and Form 6251 line 10 to the separate no-election tax. Form 1116, Form
   8812, Form 8978, and other line-16 consumers need source-to-final-return
   checks for the election's effect.
4. Preferential-income, Form 2555, other farming/fishing source forms, and
   Form 8615 combinations must not be opened until their worksheets and
   provenance are complete.

The graph uses direct declared edges from Schedule F, the AGI aggregator,
standard deduction, and the public election to the calculated node. There is
no executor override, asserted-tax fallback, second public tax shape, or
post-hoc Form 1040 mutation. Partial source deposits without an election are
a normal no-op, including pre-rounding cents; a positive election requires
every source field and whole-dollar reconciliation. An election marker also
prevents ordinary tax from silently replacing a failed Schedule J calculation.
The full test batch, TY2025 XSD validation,
filled-PDF review, IRS rules, and ATS acceptance remain open.
