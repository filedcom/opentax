# Joint C/F Schedule J and Form 8995-A positive limit proof

Isolated code: `44acca644` plus cash-payroll correction in this worktree. The original 8-packet/152-page draft at commit `44acca644` is retained without mutation in `/tmp/opentax-joint-positive-draft44-archive-oct6/packets`; `/tmp/opentax-joint-positive-draft44-preserve-oct6.log` passed 2/0 and its eight PDF hashes equal the first draft replay log. That draft is superseded because its $20,000 October farm wage triggered unemployment taxes but omitted them.

## Source and calculation

The corrected Texas grain farm retains the $500,000 paid crop sale, all twelve 2025 payroll journals, October 15 paid $20,000 non-H-2A agricultural employee wage with issued W-2/I-9/SSA references, 2024 quarter history, 2025 service-week record, Form 943 deposit, Texas UI rate notice/account/quarterly report/payment, and Form 940 filing/deposit. The October quarter reaches the federal and Texas $20,000 agricultural employer threshold. The retained 2025 paid checks yield $1,530 employer FICA. The assigned Texas 2.70% rate applied to its first $9,000 state wage base yields $243 paid December 31; FUTA's $7,000 base times 6.0% less the timely 5.4% state credit yields $42 paid December 31. Schedule F line 29 is therefore $1,815. A separate source test moves both unemployment payments to January 2026 and proves cash Schedule F line 29 remains $1,530 in 2025. It does not claim those January payments are 2025 deductions.

Official rules: [IRS 2025 Form 940 instructions](https://www.irs.gov/instructions/i940), [IRS 2025 Publication 225](https://www.irs.gov/pub/irs-prior/p225--2025.pdf), [Texas unemployment wage base](https://efte.twc.texas.gov/how_ui_claims_affect_employers.html), [Texas new employer rate](https://efte.twc.texas.gov/estimate_cbs_and_tax_rates.html), [SSA 2025 wage base](https://www.ssa.gov/OACT/cola/cbb.html), and [IRS 2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a). All filing/payment references are retained scenario records, not authenticated agency acceptance. The tractor has retained purchase/title/payment, 2018 special depreciation ledger reference and 2025 use; no 2025 depreciation is claimed.

| Variant | F wages | F UBIA | F profit | F Form 8995-A limit | Pre-QBI taxable | J tax | No-J/AMT regular tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Wages, spouse farm | 20,000 | 0 | 478,185 | 10,000 | 614,167 | 146,803 | 150,553 |
| Property, spouse farm | 0 | 400,000 | 500,000 | 10,000 | 635,690 | 154,336 | 158,086 |
| Combined, spouse farm | 20,000 | 400,000 | 478,185 | 15,000 | 614,167 | 145,053 | 148,803 |
| Combined, primary farm | 20,000 | 400,000 | 478,185 | 15,000 | 614,167 | 145,053 | 148,803 |

The separate fishing Form 8995-A column retains a zero wage/property limit. Each variant has elected J and no-J packets, with two Schedule SE owner copies. Source guards reject wrong owner, hash, dates including impossible dates, W-2/wage and 2025 Social Security ceiling conflicts, FUTA/state amounts, payment timing/expense conflicts, farm income/expenses, UBIA/prior depreciation, and prepared native/PDF tampering.

## Sealed packet evidence

- `/tmp/opentax-schedulej-joint-positive-futa-final-focused-oct6.log`: 3 passed, 0 failed; eight corrected packets, full TY2025 v5.4 XSD, native XML and real PDFs, 152 pages.
- `futa-rendered/`: all six changed wage-bearing PDFs (116 pages, 30 contact sheets) visually reviewed. The two property-only PDFs (36 pages) have hashes identical to the original fully reviewed drafts. All revised pages are legible, with Schedule F $1,815 line 29 and $478,185 profit, distinct owner SE copies, Form 8995-A first column zero and farm column $10,000 or $15,000, and 1040/J/no-J tax joins.
- `/tmp/opentax-schedulej-joint-positive-futa-final-replay-oct6.log`: raw archived `source-pending.json` inputs read without fixture regeneration, full return/export/XSD replay, source/pending/PDF/origins exact and XML only `ReturnTs`: **28 packets, 528 pages exact**. This includes new 8/152 and unchanged earlier zero-limit 4/76, phase-in 4/76, lower-income 4/72, and prior fishing 8/152.
- `deno check`, targeted `deno lint`, and `git diff --check` passed. No main, board, or future-todo edit.

## Main integration verification

Root integrated the source commits as `6d4bc957b` and `00ff83338`. Review also found that the draft applied Texas/FUTA wage bases to aggregate wages. Main now applies each $9,000/$7,000 base separately to each employee. A distinct two-worker source test retains $20,000 total wages, derives Texas $486 and FUTA $84, and rejects the former aggregate-base amounts. The original one-worker packets retain their exact amounts and reviewed page bytes. The standard test task grants only the new exact optional `SCHEDULE_J_JOINT_POSITIVE_EVIDENCE_DIR` environment name.

Fresh main gates and actual immutable-input replay are running; terminal totals will be recorded before this integration is sealed. Full regression V8 predates these changes. Wider joint phase-in payroll/property, fishing-business wage/property, aggregation, external authentication, and IRS acceptance remain open.
