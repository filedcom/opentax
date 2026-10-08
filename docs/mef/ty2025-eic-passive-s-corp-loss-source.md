# TY2025 EIC passive S-corporation loss source foundation

This advances the existing Worksheet 1 lines 11–13 requirement and the existing Form 7203/8582 requirements. It does **not** close them or admit a positive filing route.

## Isolated implementation

Candidate branch `codex/eic-passive-owned-loss-20261008`, commit `2bec1603a`, worktree `/tmp/opentax-eic-passive-owned-loss-20261008`, starts from root `48ff350f6`. Its two new runtime files are a strict first-year source contract and its tests. They are not imported by the return executor, native builder or PDF projector. Root runtime remains frozen for the live modern-history full regression, session 52874.

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
