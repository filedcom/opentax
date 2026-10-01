# TY2025 Schedule J return integration

Status: build-first, unrun. Narrow Schedule F-only, one-business fishing
Schedule C, and one-farm-plus-one-fishing ordinary-rate routes are wired in the
graph. These are not yet validated as filing-ready.

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

The graph now accepts one positive fishing Schedule C activity only when a
business-matched catch-sales record reference, harvested-fish commerce
attestation, and non-research-vessel attestation classify the computed at-risk
profit. It requires that profit to equal the sole Schedule C line 3 source,
rejects Schedule F and every other AGI component, reconciles the attributable
Schedule SE deduction to AGI, and caps the election after the calculated QBI
deduction and final Form 1040 line 15. The same finalized Schedule J lines
reach Form 1040 line 16, native MeF, and PDF. Positive and source-swap fixtures
are authored for the deferred batch; no execution or filled-PDF result is
claimed. The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
allow fishing income and require attributable income, gains, losses, and
deductions. Mixed farm/fishing is bounded to one positive farm and one positive
fishing business below. Multiple activities, source-record authentication,
loss allocation, and other income/deduction combinations remain open.

The mixed route combines computed profit from exactly one Schedule F activity
with computed, catch-evidenced profit from exactly one Schedule C fishing
business. Both profits must be positive whole dollars. Schedule C line 3 must
equal the classified fishing profit; no other AGI components can be present;
the SE and QBI deductions must reconcile to AGI and the election cap. The
calculated tax reaches Form 1040 line 16, while native MeF and PDF retain the
finalized line 1/23 return joins. Positive and missing-evidence/unrelated-income
fixtures are authored for the deferred batch. The [2025 Schedule J
instructions](https://www.irs.gov/instructions/i1040sj) require combining
attributable income, gains, losses, and deductions from both businesses.
Further farm/fishing activity combinations, source-record authentication,
losses, and other income/deduction combinations remain open.

The mixed ordinary-rate route now also accepts exactly two distinct positive
Schedule F activities with one catch-evidenced Schedule C fishing business.
Schedule F reports each at-risk profit and its positive-activity count to the
Schedule J calculation; the aggregate must still reconcile with Schedule 1,
AGI, attributable SE/QBI deductions, taxable income, and Form 1040 line 16.
Native MeF and PDF use the same finalized line 23. A full-return two-farm
positive case and a second-farm-loss rejection are authored for the deferred
bulk run. A farm loss within a positive aggregate, additional businesses,
unverified source bytes, and preferential-rate combinations remain closed.

The graph uses direct declared edges from Schedule F, the AGI aggregator,
standard deduction, and the public election to the calculated node. There is
no executor override, asserted-tax fallback, second public tax shape, or
post-hoc Form 1040 mutation. Partial source deposits without an election are
a normal no-op, including pre-rounding cents; a positive election requires
every source field and whole-dollar reconciliation. An election marker also
prevents ordinary tax from silently replacing a failed Schedule J calculation.
The full test batch, TY2025 XSD validation,
filled-PDF review, IRS rules, and ATS acceptance remain open.
