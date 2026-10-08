# TY2025 EIC passive S-corporation loss source foundation

This advances the existing Worksheet 1 lines 11–13 requirement and the existing Form 7203/8582 requirements. It does **not** close them or admit a positive filing route.

## Isolated implementation

Candidate branch `codex/eic-passive-owned-loss-20261008`, commit `2bec1603a`, worktree `/tmp/opentax-eic-passive-owned-loss-20261008`, starts from root `48ff350f6`. The initial two runtime files contain the strict first-year source contract and its tests. The subsequent basis-to-PAL adapter is described below. None is imported by the return executor, native builder or PDF projector. Root runtime remains frozen for the live modern-history full regression, session 52874.

The source contract reconciles a sole original cash stock subscription to shareholder/corporate bank balances, share count and price, owner/corporation identities, current-year formation and activity dates, the issued K-1 ordinary loss, a complete accrual ordinary tax account and the issued section 199A loss statement. Complete stock/debt/protection review records constrain the calculation to unborrowed, unprotected personal cash, no other basis changes, shareholder debt, distributions, prior losses or grouped/predecessor activity. These are supplied current record facts, **not externally authenticated evidence**.

Zero owner and spouse service hours require twelve distinct monthly records. A separate nonowner operator must have positive service hours. Married records include the spouse even when the spouse owns no shares or files separately; the source stage rejects an operator identified as either spouse. Changed marital status, nonzero owner/spouse participation and wider material-participation facts remain outside this contract. Return-wide filer/marital-status reconciliation is still required before admission.

The [Form 7203 instructions](https://www.irs.gov/instructions/i7203) require basis, at-risk, passive and excess-business-loss limitations in that order. [Publication 925 (2025)](https://www.irs.gov/publications/p925) supplies the material-participation and spouse-participation rules and describes unprotected contributed cash as an at-risk amount. This foundation applies those rules only to its stated cash/first-year source facts. It is not a general eligibility determination or accepted-return history import.

| Current cash stock basis | Issued ordinary loss | Basis-allowed loss available to at-risk/PAL stages | Basis-suspended loss | Ending stock basis |
| --- | --- | --- | --- | --- |
| 1,000 | 4,000 | 1,000 | 3,000 | 0 |
| 4,000 | 4,000 | 4,000 | 0 | 0 |
| 6,000 | 4,000 | 4,000 | 0 | 2,000 |

The admitted cash at-risk amount equals the reconciled stock cash, so the basis-allowed loss is also available to the passive stage, with no additional at-risk suspension in this contract. **Available to Form 8582 is not deductible on Schedule E.** The component returns neither a final PAL allowance nor a final qualified loss deduction, and explicitly reports `filingRouteAdmitted: false` and `externalAuthenticationVerified: false`.

## Validation and remaining original work

Normal typed `deno test forms/f1040/2025/eic_passive_s_corp_loss_source.test.ts` completed at **12:51:15 UTC October 8, actual exit 0, 33 passed / 0 failed**. Tests cover the three basis cases, spouse participation/operator conflicts, wrong owner/issuer/statement joins, bank/share mismatch, protected or borrowed funding, prior/predecessor activity, inconsistent timing, missing/duplicate months, reference reuse, ordinary/QBI totals and exact-integer overflow. The preliminary 31-case run was superseded after two additional hostile cases; these counts are not additive.

Private evidence: `.state/research/board-execution-2026-10-07/eic-passive-s-corp-loss-source-20261008-v1/`, including preflight source hashes, actual command log and terminal status. Log SHA-256: `ce1085a1055b6da1874ba1e2b5e045b20726b35c2cccce31eaea0c8a1435b29f`.

The existing filing guards stay closed. Completing the original task still requires executor ownership and public intake validation, native/PDF Form 7203 source replay, the basis-limited current loss posted through Form 8582, Schedule E Part II allowed-loss presentation, QBI ordering/carry records, final AGI/EIC source replay, combined investment-category threshold cases at 11,950/11,951, exact XML/XSD and directly reviewed complete PDF packets. Joint/spouse and conflicting/missing-copy cases must be reconciled across those same joins. These are remaining requirements of the existing task, not additions to the board. No future task is implemented, no aggregate filing/PDF count increases, and no main checkbox closes.


## October 8 — basis-to-Form-8582 activity calculation

Candidate commit `85bf90c4d` adds an activity adapter and ten allocation/reconciliation cases, with the constructed records extracted into a reusable fixture. At that commit the candidate differed from frozen root runtime only in four new files: the source/adapter module, its 33 source tests, the fixture and ten PAL tests. Existing Form 8582 runtime is unchanged.

The adapter replays the source contract and creates a current-year `k1_s_corp` activity with its durable source activity ID, first-year stock subscription reference and **negative basis/at-risk-allowed loss**. It does not post the raw K-1 loss. The existing Form 8582 engine then calculates the allowance and activity-specific PAL carryover, with positive passive income derived from the existing current non-PTP partnership source path. This is a calculation adapter exercised directly, not a public filing graph or native/PDF export.

| Stock cash | Raw K-1 loss | Passive income | Allowed passive deduction | Basis carryover | PAL carryover | Ending stock basis |
| --- | --- | --- | --- | --- | --- | --- |
| 1,000 | 4,000 | 0 | 0 | 3,000 | 1,000 | 0 |
| 1,000 | 4,000 | 500 | 500 | 3,000 | 500 | 0 |
| 1,000 | 4,000 | 3,000 | 1,000 | 3,000 | 0 | 0 |
| 4,000 | 4,000 | 0 | 0 | 0 | 4,000 | 0 |
| 4,000 | 4,000 | 3,000 | 3,000 | 0 | 1,000 | 0 |
| 4,000 | 4,000 | 4,000 | 4,000 | 0 | 0 | 0 |
| 6,000 | 4,000 | 3,000 | 3,000 | 0 | 1,000 | 2,000 |

Each case conserves the raw loss across allowed passive deduction, basis carryover and PAL carryover. Stock basis is reduced at the basis stage even when the passive allowance is zero. Hostile cases verify changed bank source records are replayed, basis-suspended losses cannot be added to the activity totals, and another activity cannot reuse the loss activity's durable ID.

Normal typed focused run ended **12:55:29 UTC, actual exit 0, 108 passed / 0 failed**: 33 source cases, ten new PAL cases and 65 existing Form 8582 cases. No additive claim across earlier runs. Retained log SHA-256 `f36c5c3259cb364bbba062dcef6b06c18dc7c2fb2bce83c1abf90d9e68dc20da`; private evidence `eic-passive-s-corp-loss-pal-20261008-v1/` retains the command, frozen source manifest, terminal status and initial preparation failure (fixture extraction expected pre-format syntax; no write/test occurred in that failed step).

The original remaining filing requirements above stay open. No Form 8582 native source guard is bypassed, no current EIC filing guard is relaxed, and no accepted/printable route or aggregate count is claimed. Root full session 52874 remained live during this work.


## October 8 — standalone source-replayed Form 7203 projections

Candidate commit `a808a176e` advances the original basis/native/print requirements with an **unregistered** projection shared by standalone native XML and projected print fields. The current candidate differs from root only in six new runtime files. The source contract now retains the shareholder's name from the issued K-1, validates the IRS person-name characters, and reconciles that name and owner TIN to the identified filer. Single and MFJ primary/spouse sources retain the correct other-spouse participation record; wrong names, ownership, marital-status joins and missing spouses reject. Wider filing-status combinations are not admitted by this staged projection.

First-year beginning stock basis is zero; the reconciled cash subscription enters Form 7203 line 2. The available cash basis, basis reduction, ending basis, current ordinary loss, stock-allowed Part III amounts and basis carryover agree between native fields and print-field values. The latter map to existing Form 7203 PDF descriptor keys, but **no filled PDF was generated or visually reviewed**. Part III reports the basis-limited loss independently of the later Form 8582 allowance. Shareholder debt fields remain absent for this no-debt source contract.

Normal typed focused gate ended **13:01:02 UTC, actual exit 0, 120 passed / 0 failed**: 65 existing Form 8582 tests, 33 source tests, ten PAL tests and twelve new Form 7203 projection tests. Five of the twelve projection tests validate actual standalone XML against the retained TY2025v5.4 `IRS7203.xsd`: basis suspended, basis exhausted, basis remaining, joint primary and joint spouse. A missing schema fails this gate rather than producing ignored tests. These results do not prove full Return1040 XSD, business rules, printed appearance or IRS acceptance.

Private `eic-passive-s-corp-loss-7203-20261008-v2/` retains the command, terminal status, six-file source manifest, schema path/SHA and five exact XML byte copies/digests. Log SHA-256 `beebdddd528268e97141bfdfc6ef3cb8ddf9ae0b85ad7ced5bc78b4932a92ec1`. The first run remains preserved in `...-v1/`: actual exit1,115 passed/5 failed because the new worktree's existing `.state` lacked the private research/schema directory. Its existing directories were preserved, a research symlink added, and the same unchanged source/command passed on rerun. Earlier counts are not additive.

The return executor, registered Form 7203 native/PDF builders and EIC source guards remain unchanged. These projections are not imported by the filing graph and do not authenticate issuer facts. Return-context source replay, required-copy enforcement, finalized Form 8582/Schedule E/QBI/1040 joins, EIC threshold combinations, complete native return and directly reviewed PDF evidence are still necessary to finish the existing task. No parent/checklist closes, no aggregate count increases, and no future task is implemented.
