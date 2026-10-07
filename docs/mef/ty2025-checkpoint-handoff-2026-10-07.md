# TY2025 checkpoint and next-session handoff — October 7, 2026

## Release boundary

The initial prerelease tag `v2.0.8-checkpoint.1` remains historical; its publication run was cancelled when the user explicitly requested regular version `v2.0.9`.

User requested a checkpoint, a new OpenTax version and continuation in a new session; the latest instruction leaves the board TODOs unchanged. `v2.0.9` is the regular iteration of the integrated branch `codex/ty2025-board-progress-20261004`, through 1,552 completed ledger slices. The broad filing-ready objective is unfinished. Release completed: https://github.com/filedcom/opentax/releases/tag/v2.0.9, regular/latest, tag commit `aa88071812f6f45e014509c1c3f27ae189860472`. Workflow37552329479 succeeded with allfive matching-platform builds andsmokes. Allfive downloaded assets match SHA256SUMS; downloaded macOSARM64 binary independently passed version2.0.9/calculation/validation/finalizedMeF/two-pagefilledPDF smoke. Final evidence under `.state/research/release-v2.0.9-oct7/manifest.json`; these smoke results do not prove the unfinished fullcoverage/IRS gates.

Read all of `product_board.md` and compact current learnings before resuming implementation. The main checklist from `## Scope and completion rules` onward is frozen against `85b489a72`; 52 broad TODOs remain open. Discoveries go only into `future_todo`, which is outside the execution queue. Do not equate bounded ledger completions with closing broad parents. Detailed history is preserved in the October 6 status archive, validation batch and completed ledger.

## Integrated evidence

- Investment interest: main 100/0 plus isolated1/0; four actual returns102pages/freshXSD and16ordinaryPDFs262pages;49held hashes,361 physical files.
- Direct-owner aggregation: main66/0;22distinctreturns443pages plus3annualpages. Saved pending/prepared/carry/origins equality; complete normalized-graph equality was not established.
- Multiple dependent income: main95/0;three source returns15pages, normalizedJSON/prepared/carry/origins/PDF/native parity andfreshXSD.
- PAB AMT: checked eight-module allow-all86/0;12savedreturns162pages freshXSD;70heldfiles. PAB original prepared files were absent; shared ordinary output overwrite is qualified.
- Larger/zero-spouse joint8962: ordinary checked six-module99/0;fivefamilyreturns36pages plus12priorreturns162pages/freshXSD;77heldfiles. Main physical final seal229files, earlier integration310files.

Refer to the board's source-proof links for commands, digests, failure qualifications and physical archive locations. Evidence under `.state/research` and external `/tmp` locations must be retained; `.pdf-cache` is untracked cache, not pending source implementation.

## Three follow-up routes — integrated after the v2.0.9 tag

The user subsequently authorized completing and merging these three routes, then explicitly instructed that the board TODOs remain as they are. Their implementation is now integrated into PR63; the published v2.0.9 tag remains unchanged and excludes these later commits.

| Route | Implementation / final proof | Retained qualification |
|---|---|---|
| Positive-spouse8962 | `32ca1d2c740a3e7b8db22f97fd9b3dd00f0085cf` / `0856e07233306a778840fb5de9bb7ef65cec0664` | Ordinary checked six-module 67/0; four exact source replays/fresh full XSD; 29 pages reviewed |
| Issuer RPE aggregation | `5df5c716e152e5de4761d94bd696425dd3a5695d`, standalone test context repair `9e5051e5eff3ed52e5247122af3ec1cc74b05e96` / `7fac286a0ba26928fdb431223eb3fa0700557058` | Ordinary checked six-module 103/0; four exact source replays/fresh full XSD; 45 return pages and eight attachment instances reviewed |
| MFJ spouse royalties | `f6257fc7e3505c75705fbaa39989a0f01ba08866` / `e51ea7953fac6801c9c72434b691c4c1e17b36d0` | 31 distinct checked tests passed across preserved runs; two initial missing-Poppler failures qualified; exact source replay/full XSD and seven pages reviewed |

Route proof documents retain previous failures and interrupted-run qualifications:

- `docs/mef/ty2025-form8962-joint-income-source-scope.md`
- `docs/mef/ty2025-rpe-aggregation-source-checkpoint.md`
- `docs/mef/ty2025-form4952-mfjspouse-royalty-source-proof.md`

Root independent source/Decimal/native/PDF reviews are physically retained:

- `.state/research/spouse-root-final-review-oct7/manifest.json`: 68 files, SHA256 `0330416cd71fbf0513dd8a3903ba593edee62a895e7f02332d1aebcbb3742e20`.
- `.state/research/rpe-root-final-review-v4-oct7/manifest.json`: 136 files, SHA256 `46bc115ce7be7141c18188c5fc1a380d2059a85cb23ef657ae57bb5680b866bf`.
- `.state/research/royalty-root-final-review-oct7/manifest.json`: 20 files, SHA256 `a309e5c8cd9d499280b46f10d4d4cee7a89347588d26ac9880e24ca550d68e99`.

All five platform builds and compiled binary smokes passed on combined implementation commit `97cb24dc6c0dbfcf6bd279519e689e6e891d0983`, workflow https://github.com/filedcom/opentax/actions/runs/37554615221. Later final-proof/handoff commits contain documentation only. This manual run was a dry run and did not republish v2.0.9. The combined ordinary checked main three-module gate finished 7 passed / 0 failed (4m55s); its eight spouse/RPE source packets match the independently reviewed source/graph/PDF/attachments bytewise and native XML except generated ReturnTs. Main log/status/CI/parity are physically retained in `.state/research/three-route-main-final-oct7/manifest.json`. PR: https://github.com/filedcom/opentax/pull/63.

## Full regression / ATS

V32 started2026-10-06T21:47:13Z at immutable `4ea6902e474d4f7ce82127d4ba4653f9c7124e6c`, before later investment-interest/aggregation/8962/PAB/family production. Snapshot `/tmp/opentax-full-regression-source-v32-oct6`; authoritative testPID64169; log `/tmp/opentax-deno-task-test-source-v32-oct6.log` and `.status`. Revalidate PID/session before claiming live or terminal. An observation timeout is not terminal; do not restart solely for elapsed time. Latest integrated fullphase remains required even if V32 passes. V31 superseded for production corrections with exit143/partialreason retained.

ATS credentials/certificate/enrollment/endpoint/WSDL/trust/businessrules remain unverified; scenario1door andscenario8QCD conflicts unresolved. No IRSacceptedacknowledgments. Local XSD/hash/review does not authenticate sources or establish accepted priorfilings/IRSacceptance.

## Next session boundary

The board TODOs are unchanged. Do not resume or finish the broader board without a new user request. This turn's scope is the three routes, their checks, PR63 merge, and cleanup of their completed remote branches. Full-regression and ATS notes above are retained background; no complete filing-ready or IRS-acceptance claim is made.
