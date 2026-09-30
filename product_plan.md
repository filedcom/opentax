# TY2025 Form 1040 product plan

This is the high-level execution plan for draft [PR #56](https://github.com/filedcom/opentax/pull/56). The [product board](product_board.md) is the detailed, authoritative list of open routes and acceptance requirements. The [2026-09-30 checkpoint archive](docs/mef/ty2025-product-board-checkpoint-2026-09-30.md) preserves completed bounded work and earlier evidence.

## Outcome

Complete the TY2025 Form 1040 family from reviewed source facts through calculation, Form 1040 joins, native MeF documents, attachments, printable PDF packet, and A2A submission package. Keep every unsupported current-return claim closed until its source and filing route are complete or the user approves a named exclusion. Standalone 1040-NR, 1040-SS, Form 4868, and dual-status Form 1040 e-file remain outside this release.

## Implementation sequence

1. Resolve the coverage and evidence decisions in the [decision queue](docs/mef/ty2025-form1040-coverage-decisions.md), including external-record proof and separate payment, amended-return, recipient-copy, and entity-root workflows.
2. Reconcile all 126 registered MeF descriptors, 89 PDF descriptors, and 211 IRS schema roots against Form 1040 applicability. For each retained positive route, finish source ownership, calculation, final-return reconciliation, native/PDF mapping, statements, and explicit rejection of conflicting inputs.
3. Finish the named form and source gaps on the [board](product_board.md), including carryovers, multi-copy returns, conditional schedules, and source-only documents. Update its audit and gap notes as each route changes.
4. After **all implementation and scope decisions**, run the consolidated `deno task test` batch. Fix failures and repeat the same command until it passes. Then complete full-return XSD, filled-PDF, IRS business-rule, and ATS acceptance across every retained route.
5. Review the draft PR and release only after those gates pass.

## Current implementation checkpoint

- Draft PR #56 contains bounded source and filing routes for selected income, deductions, credits, sales, gifts, rollovers, and Form 4797/4952 combinations. These do not establish whole-form support.
- Form 4952 now checks final-filer ownership for partnership K-1 investment interest. Partnership-only and mixed K-1/1099-INT and K-1/1099-DIV cases have local XSD and inspected filled-PDF evidence; loan tracing, carryovers, code B, elections, and external source proof remain open.
- A bounded Form 8862 CTC reinstatement case has current full-return local XSD and inspected seven-page PDF evidence. IRS disallowance evidence and other credit branches remain open.
- Form 8863 student inputs can now receive a public credit-limit worksheet. One sourced AOC full return has local XSD and inspected five-page PDF evidence; other students, credits, issued source records, and external acceptance remain open.
- The last completed full regression is the historical 8,951/8,951 pass on `44282e25`. No final bulk run has been made on the current branch. Per the user's implementation-first direction, do not run further route tests before the implementation phase is complete.

## Decisions still needed

- Choose whether positive routes depending on external records require uploaded document bytes bound to reviewed facts, or whether reviewed structured facts and references suffice. Apply the same standard to K-1s, prior returns, appraisals, carryovers, signed forms, and ATS fixtures.
- Resolve each separate-workflow and entity-filer question named on the [board](product_board.md) and in the [decision queue](docs/mef/ty2025-form1040-coverage-decisions.md). An unresolved question does not authorize a silent exclusion.

This plan records direction and checkpoint state. A checked board item, passing focused case, or local XSD result is not a release gate on its own.
