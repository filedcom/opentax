# TY2025 Schedule J return integration

## Current route index — October 9, 2026

The [paid-expense checkpoint](./ty2025-schedule-j-fishing-source-proof.md#october-9-paid-fishing-expenses-and-complete-packets) now reconciles retained fishing insurance, repairs and utilities through six full returns, native XML and 118 reviewed PDF pages. Historical replay qualifications below remain attached to their own runs.

Current branch `e8891d64b` contains later source-replay work beyond the historical build-first notes below. Live `schedule_j_source_return.ts` verifies retained catch-ledger bytes, business/owner identity, actual Schedule C/F profit and SE/QBI joins; native and PDF exporters replay that source. Distinct joint C/F owners require both owner-specific Schedule SE copies and matched QBI rows. The earlier blanket statements that fishing is isolated, every other income is rejected, or preferential income is unavailable are historical, not the current boundary.

| Retained route | Detailed source and verification record |
|---|---|
| Farm election, current/prior preferential worksheets, no-election AMT tax, sourced nonfarm W-2 and bounded staged-credit compositions | [Preferential and nonfarm-wage proof](./ty2025-schedule-j-preferential-source-proof.md) |
| One commercial fishing business, or fishing plus one/two farms, with retained catch-sales/supplies and qualified paid-expense ledger | [Fishing source proof](./ty2025-schedule-j-fishing-source-proof.md) |
| Same-owner mixed C/F QBI phase-in and actual half-SE allocation | [Phase-in proof](./ty2025-schedule-j-fishing-phasein-proof.md) |
| One separately owned fishing business and farm on MFJ, with reversed-owner controls | [Joint source proof](./ty2025-schedule-j-joint-fishing-farm-proof.md) |
| Joint advanced QBI phase-in, full phaseout and retained farm payroll/property limits | [Advanced](./ty2025-schedule-j-joint-advanced-qbi-proof.md), [zero-limit](./ty2025-schedule-j-joint-zero-qbi-proof.md) and [positive-limit](./ty2025-schedule-j-joint-positive-qbi-proof.md) proofs |

These linked records preserve their original scoped tests, packet/XSD and render qualifications; the October 9 documentation reconciliation does not turn them into fresh packet replays. The October 9 whole-branch `deno task test` attempt stopped at an unrelated Form 4562 test-call type error before runtime tests; it does not refresh these historical results. None of this establishes authenticated prior IRS filing, broader qualifying-income attribution or IRS acceptance. Crew/shareholder wages, share-rent/pass-through and disposition attribution, losses/NOL, broader payroll/property and other source/credit combinations retain their existing parent requirements. The [source inventory](../../../inventory/ty2025-schedule-j-source-inventory.md) distinguishes implemented joins from those remaining boundaries.

## Historical October 6 preferential-source integration checkpoint

Current main integrates independently sourced current/prior ScheduleJ tax
worksheets, actual farm SE/QBI allocation and the no-election6251 tax refigure.
Main focused10/0 includes five full-XSD reviewed packets (85 pages): original
farm with/without election and three owned adoption/education/QEF compositions.
Native and PDF compare the entire final source replay. The original200000 farm
plus35000 dividend QEF case retains its changed-NIIT rejection; the owner-matched
Alex farm source has200000 receipts and permits supported adoption/QEF staging.
See [preferential source proof](./ty2025-schedule-j-preferential-source-proof.md).

The rehearsal preserves earlier17QEF/172pages and8pension/76pages, with33/0
donation overlap. Fresh actual-main held comparisons and related tests are
in progress; no passing full regression, externally authenticated prior filing,
IRS business-rule acceptance or wider ScheduleJ support is asserted. Other
attributable incomes, fishing preferential allocation, itemization/NOL and
2555/8615/1116/other-credit combinations remain existing parent work.

## Historical build-first notes


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
