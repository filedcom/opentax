# TY2025 Schedule J elected-income source boundary

## Current route index — October 9, 2026

Current branch `e8891d64b` contains later source-replay work beyond the historical build-first notes below. Live `schedule_j_source_return.ts` verifies retained catch-ledger bytes, business/owner identity, actual Schedule C/F profit and SE/QBI joins; native and PDF exporters replay that source. Distinct joint C/F owners require both owner-specific Schedule SE copies and matched QBI rows. The earlier blanket statements that fishing is isolated, every other income is rejected, or preferential income is unavailable are historical, not the current boundary.

| Retained route | Detailed source and verification record |
|---|---|
| Farm election, current/prior preferential worksheets, no-election AMT tax, sourced nonfarm W-2 and bounded staged-credit compositions | [Preferential and nonfarm-wage proof](./ty2025-schedule-j-preferential-source-proof.md) |
| One commercial fishing business, or fishing plus one/two farms, with retained catch-sales/supplies ledger | [Fishing source proof](./ty2025-schedule-j-fishing-source-proof.md) |
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


Status: build-first, unrun. Bounded Schedule F-only and one-business fishing
Schedule C positive elections are wired through the graph. No MeF/XSD,
filled-PDF, IRS-rule, or ATS acceptance is claimed.

The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
say line 2a is elected taxable income attributable to farming or fishing,
including gains, losses, and deductions from several possible forms. It cannot
exceed current taxable income. Farm income can come from wages, Schedules C,
D, E, or F, Forms 4797, 4835, and 8949, and other adjustments. Schedule F net
profit alone does not establish the full upper bound for a mixed return.

`forms/f1040/2025/domains/taxes/income-averaging/schedule-j/schedule_j_farm_source.ts` now provides a bounded Schedule
F-only source guard. It recomputes the at-risk Schedule F profit from the
validated activity inputs and employment-credit reductions; compares it to
Schedule 1 line 6 and finalized Form 1040 income; requires the only adjustment
to be the Schedule SE deduction on Schedule 1 line 15; and caps the election
at both farm income after that deduction and Form 1040 taxable income. It
rejects positive wages, interest, dividends, retirement, Social Security,
capital gain, QBI deduction, and selected other Schedule 1 activity. Its
focused positive and mismatch cases are written but unrun.

The separate guard remains an isolated research helper. The live bounded
route instead receives computed Schedule F profit, the Schedule SE deduction,
and finalized AGI/taxable income through declared graph edges. It rejects
other AGI components and caps the election after attributable QBI. This does
not establish a broader source ledger or authenticate the underlying farm
records. Wages, fishing, dispositions, share-rent, pass-throughs and mixed
returns still need source work. A fishing-only positive route now requires one
business code 114110 Schedule C, matched catch-sales source reference and
commerce/research classification, computed at-risk profit equal to Schedule 1
line 3, and no other AGI activity. It joins the Schedule SE and QBI deductions
to Form 1040 taxable income before permitting native/PDF export. The catch
ledger is referenced, not byte-authenticated. The deferred full validation batch, XSD,
filled-PDF review, IRS business rules, and ATS acceptance remain open.
