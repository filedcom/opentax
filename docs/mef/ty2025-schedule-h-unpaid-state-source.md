# Schedule H unpaid state contribution source compact

Fresh isolated base `c2c950cbf`; read the complete frozen board before work. Wider Schedule H state/rate and source-byte parents remain open. This slice concerns assessed 2025 state UI liability that remains partly or wholly unpaid when the TY2025 return is filed. The settled quarterly source proof and 41-return/238-page main replay are preserved; the new branch must not change their inputs or artifacts.

Primary [2025 Schedule H instructions](https://www.irs.gov/pub/irs-prior/i1040sh--2025.pdf) say line 11 is No if not all 2025 state contributions were paid by April 15, 2026; Section B line 17(h) is only contributions paid by that deadline; Worksheet 1 provides a 90% credit for amounts actually paid after the deadline. [The 2025 form](https://www.irs.gov/pub/irs-prior/f1040sh--2025.pdf) computes line 17(g) from taxable wages and the state experience rate, line 19 from (g)+(h), and Section B line 23 from the limited credit. An unpaid balance is neither a due-date payment nor an actually paid late contribution.

Reviewed ordinary input base: `/tmp/opentax-scheduleh-quarterly-final-oct6/changed-rate-quarterly-receipts.json`. Before-change saved variants retain the same filer, employees, dated wages, CA/TX notices, quarterly assessments, and existing receipts while marking Q3 CA $100 unpaid (`/tmp/opentax-scheduleh-unpaid-partial-before-oct6/partial-inputs.json`, SHA256 `b8c6df556752528daa66724b50604c9c9ab52fcaf06a760e9e896ad82bc92529`) or both CA Q2/Q3 $200 unpaid (`.../unpaid-inputs.json`, SHA256 `9a404596d9d7b41562cbcb207084065b61d092ed668bbdac604bbfdddb6978b5`). Before implementation, both public routes reject at the final all-paid-total guard (`.../check.log`). Their Source Section B arithmetic independently yields partial line 19 $332, credit $260 after CA reduction, FUTA $160 and total Schedule H $1,384; fully unpaid on the second CA notice yields line 19 $232, credit $160, FUTA $260, total Schedule H $1,484. These are proposed, not yet exported.

The new source needs a retained state account balance/status as of actual filing review date, joined to every assessed period and each dated receipt. It must show assessed liability, paid by due date, actually paid late, and unpaid balance without inferring the balance from absence of receipts. It must reject duplicate/partial status coverage, a balance inconsistent with assessed liability minus all receipts, receipts after the as-of date, false line 11 status, excess payment, unproved late payment, and a synthetic Worksheet 1 amount for an unpaid balance. Preserve current all-paid and genuinely late routes, full source/1040/native/PDF/XSD ordering, and all original packet bytes.

## Implemented source contract and direct evidence

The optional `unpaid_contribution_review` is required whenever a Section B
account has a genuinely unpaid assessed balance. It identifies the return
filing-review date and carries one dated account balance record for **every**
rate notice. Each balance record binds the notice reference, state, same-day
account statement date, unpaid cents, and a distinct source reference. The
validator independently derives each notice's liability from dated taxable
wages and the retained rate notice or each retained quarterly assessment. It
requires liability = all actual dated contribution receipts + reviewed unpaid
balance. Every receipt must precede or match the filing-review date, and the
review date must be at least April 15, 2026 for this bounded route. This
preserves the distinction between late receipts (Worksheet 1) and a balance
that is still unpaid. A notice with zero balance still gets a record, so
missing account coverage cannot imply a zero balance.

The first two saved source positives add only explicit status facts to the
separate before inputs:
`/tmp/opentax-scheduleh-unpaid-partial-before-oct6/partial-status-inputs.json`
(SHA256 `47663554344bc9344227817c745d78909813987802252d07a1aa3d173b1fc225`),
`unpaid-status-inputs.json`
(`70de99bd6a213b46c6ed9d88dd0b068e3efdb9fcf4a2e53488d37a7fd052b74b`).
The third `partial-late-status-inputs.json` adds the actual late receipt and
account status
(`fad1c3a8bec07e6f70c1d816022cd8aa9e9c7a0f9346f303b12ca7c4ed850a53`).
The original two before inputs remain untouched and rejected. The third case
retains a real $50 payment dated May 15, 2026, a June 1 account review with
$50 still unpaid, and only that actual late payment enters Worksheet 1. Its
independently derived Schedule H total is $1,343; the other two totals are
$1,384 and $1,484.

Two additional complete account inventories exercise the remaining selected
calculation shapes. `all-unpaid-status-inputs.json` (SHA256
`b204af125ac18aa0dc849da7fc8bc038bcff6adf8024092707f0dd79995a6cb8`)
retains the three notices and dated wages, has no contribution receipt, and
records outstanding $60/$200/$54. The additional-credit columns total $118;
after the CA credit reduction, FUTA is $374 and Schedule H totals $1,598.
`tx-only-unpaid-status-inputs.json` (SHA256
`f6e826653c45357f43960576b3fe317279bdec0521488d1300c2a859c001f715`)
is a separate reviewed source with dated TX-only Q1–Q4 wage records, one TX
notice, zero receipts, and a $216 account balance. Line 10 is Yes, line 11 is
No, and Section B applies without either late-payment Worksheet 1 or credit
reduction Worksheet 2; FUTA is $204 and Schedule H totals $1,428. It has six
pages because a single state-rate row needs no continuation.

The exact saved inputs passed public return computation, Schedule 2 line 9,
Form 1040 line 23, native MeF, real filled PDF, and TY2025 v5.4 full XSD in
`/tmp/opentax-scheduleh-unpaid-state-raw5-v2-oct6/report.json` and
`/tmp/opentax-scheduleh-unpaid-state-raw5-v2-oct6.log`. Four packets have
seven pages and the TX-only packet six, totaling 34 pages. All five PDFs match
the corresponding final focused output byte for byte (SHA256 recorded in the
raw report). All 34 pages were rendered in
`/tmp/opentax-scheduleh-unpaid-state-rendered-oct6` and reviewed, including
Schedule H page 2 and applicable rate-row continuations. A separate
negative-control packet repeats the partial positive bytes and is kept apart
from the five distinct source cases.

Focused source tests reject missing status, missing or duplicated notice
balances, duplicate balance references, mismatched state/date/amount, subcent
balance, false line 11, an unpaid balance incorrectly labeled a late payment,
payment exceeding assessment, payment after the reviewed date, and a filing
review before the due date. The tests exercise public graph, native builder,
and direct PDF builder on the edited source. The final focused source gate
passed **3/0** at `/tmp/opentax-scheduleh-unpaid-state-focused-v4-oct6.log`
with 11 unrelated tests filtered. Earlier diagnostic v3 had one test-only
page-count failure: the TX-only packet has six pages, not the multi-state
seven, and is preserved separately. Existing all-paid and paid-late routes
remain active; broader
state-account crediting, historical external acceptance, and the wider
Schedule H parent remain open.


## Main integration evidence

Production118c279a7 passed the ordinary14module payroll task **74/0** (6m35s), terminalsession11127, `/tmp/opentax-scheduleh-unpaid-main-standard-oct6.log`; command retained in samebasename.zsh. Actual saved main replay terminalsession56640 covers **46returns/272pages**:43fresh exactwhole pending/prepared/carry/origins/PDF/nativeexceptReturnTs and3historicallyqualified archives, every source unchanged/fullTY2025v5.4XSD. `/tmp/opentax-scheduleh-unpaid-main-final46-oct6/report.json` records results. Candidate prior41 replay independently passed41/238; isolatedbroad73/0 loaded the earlier three-positive testversion, finalfocus3/0 separately covers allfive shapes. Root reviewedall34newpages and zeroWidget/Acrofields; mainPDFs preserve those exact bytes.

Root preservation manifests `/tmp/opentax-scheduleh-unpaid-{root-review,root-extra2,candidate-gates,main-final-gates}-preservation-oct6.json` contain28+10+88+97 original/private entries, all rehashed afterterminalgates. Original before sources without accountreview remain rejected; firsttwo positives add only those explicit status facts. Fullcurrentproduction regression, state/family histories, sourceauthentication and IRSacceptance remainopen.
