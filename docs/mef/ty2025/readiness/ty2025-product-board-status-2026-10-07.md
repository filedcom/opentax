# TY2025 board status — October 7, 2026

## Current checkpoint

[OpenTax v2.0.10](https://github.com/filedcom/opentax/releases/tag/v2.0.10) is the latest regular release, from merged main commit `d756a895346909c2a2e2c81f735045f1f910084f`. [PR63](https://github.com/filedcom/opentax/pull/63) is merged. Positive-spouse premium-credit income, issuer QBI aggregation and MFJ spouse royalties are integrated and included in this release. The four completed remote branches were removed; local worktrees and source evidence were preserved.

Board cleanup corrects the previous release/pending-route summary and records three bounded completions, bringing the ledger to **1,555**. All **52 active TODOs** and the **one separate future item** remain unchanged, byte-for-byte from the scope section onward. No broader implementation or filing-ready gate is closed.

## Completed-route evidence

| Route | Checked compatibility | Saved packet review | Proof |
|---|---|---|---|
| Positive-spouse Form 8962 | 67 passed / 0 failed; shell capture qualified separately | Four exact source replays, fresh full XSD, 29 pages and independent arithmetic | [Joint income](../domains/health/form8962/ty2025-form8962-joint-income-source-scope.md) |
| Issuer RPE aggregation | 103 passed / 0 failed | Four exact literal/ordinary packets, fresh full XSD, 45 return pages and eight attachment instances | [RPE aggregation](../domains/qbi/ty2025-rpe-aggregation-source-checkpoint.md) |
| MFJ spouse royalty | 31 distinct tests passed across runs; initial two missing-Poppler failures retained | Exact literal replay, fresh full XSD, seven pages and independent arithmetic | [Spouse royalty](../domains/investments/form4952/ty2025-form4952-mfjspouse-royalty-source-proof.md) |

Combined main ordinary checked three-module gate: **7 passed / 0 failed (4m55s)** at implementation `97cb24dc6c0dbfcf6bd279519e689e6e891d0983`; subsequent commits changed proof/handoff documentation only. Eight spouse/RPE packets match independently reviewed source/graph/PDF/attachments bytewise and XML except generated `ReturnTs`. Retained evidence: `.state/research/three-route-main-final-oct7/manifest.json`, SHA256 `d8145be07b5a4982e970b73495776c89b244c8cb95e549ce5a1775301dea7f5f`.

Release [workflow 37556448774](https://github.com/filedcom/opentax/actions/runs/37556448774) completed successfully: Linux x64/ARM64, Mac Intel/ARM64 and Windows x64 each compiled and smoke-tested the v2.0.10 binary, followed by successful publication. Five published asset digests match `SHA256SUMS`; the downloaded Mac ARM64 binary's checksum and version/calculation/validation/native-MeF/two-page-PDF smoke passed. Evidence: `.state/research/release-v2.0.10-oct7/manifest.json` (nine evidence files plus manifest).

## Earlier integrated source proofs

[Investment interest](../domains/investments/form4952/ty2025-form4952-schedulej-child-source-proof.md), [owned SEP](../domains/retirement/ty2025-independent-patron-owned-sep-source.md), [direct-owner aggregation](../domains/qbi/ty2025-owned-aggregation-annual-disclosure.md), [dependent MAGI](../domains/health/form8962/ty2025-form8962-multiple-dependent-source.md), [PAB AMT](../domains/investments/form4952/ty2025-form4952-pab-multi-source-proof.md), and [larger/zero-spouse joint families](../domains/health/form8962/ty2025-form8962-family-source-proof.md) retain their focused tests and qualifications. The [October 6 archive](./ty2025-product-board-status-2026-10-06.md), [completed ledger](./ty2025-product-board-completed-2026-10-01.md) and [validation batch](../testing/ty2025-form1040-validation-batch.md) preserve detailed history.

## Remaining boundary

Latest integrated full regression, complete source/coverage/PDF decisions, IRS business rules and ATS/accepted acknowledgments remain open. An older immutable V32 run does not establish current release coverage. Revalidate any old process/log before treating it as live or terminal. Local synthetic source review and XSD success do not authenticate issuer records or establish IRS acceptance. Cleanup does not start the broader TODO queue.

## Previous board header — historical snapshot, superseded above

The following text preserves the pre-cleanup v2.0.9 status and pending-route observations; it is not the current release or work queue.

# TY2025 Form 1040 product board

## Checkpoint — October 7, 2026

**Release:** [OpenTax v2.0.9](https://github.com/filedcom/opentax/releases/tag/v2.0.9) is published as the latest regular iteration. All five platform builds and binary smoke tests passed; downloaded checksums and host smoke passed. Evidence is recorded in the [checkpoint handoff](./ty2025-checkpoint-handoff-2026-10-07.md). Full filing readiness and IRS acceptance remain incomplete.

**Progress:** The [completed ledger](./ty2025-product-board-completed-2026-10-01.md) records **1,552 bounded slices**. The frozen checklist retains **52 open TODOs**. Detailed learnings, commands, evidence and qualifications remain in the [status archive](./ty2025-product-board-status-2026-10-06.md) and [validation record](../testing/ty2025-form1040-validation-batch.md).

**Integrated source proofs:** [Investment interest](../domains/investments/form4952/ty2025-form4952-schedulej-child-source-proof.md), [owned SEP](../domains/retirement/ty2025-independent-patron-owned-sep-source.md), [direct-owner aggregation](../domains/qbi/ty2025-owned-aggregation-annual-disclosure.md), [dependent MAGI](../domains/health/form8962/ty2025-form8962-multiple-dependent-source.md), [PAB AMT](../domains/investments/form4952/ty2025-form4952-pab-multi-source-proof.md), and [larger/zero-spouse joint families](../domains/health/form8962/ty2025-form8962-family-source-proof.md) retain focused tests, actual native/PDF review and local XSD evidence.

**Resume:** Positive-spouse Form8962, issuer RPE aggregation and MFJ spouse royalty work are preserved on separate checkpoint branches; qualification and main integration remain pending. Full regression V32 covers an earlier immutable production snapshot; latest integrated full regression remains required. Read the [handoff](./ty2025-checkpoint-handoff-2026-10-07.md), revalidate live gates, then continue existing TODOs. Discoveries belong only in `future_todo`, outside the execution queue.

