# TY2025 checkpoint and next-session handoff — October 7, 2026

## Release boundary

User requested a checkpoint, a new OpenTax version, board cleanup, and continuation in a new session. `v2.0.8-checkpoint.1` is the development prerelease of the integrated branch `codex/ty2025-board-progress-20261004`, through 1,552 completed ledger slices. The broad filing-ready objective is unfinished. The release workflow must build and smoke all five native binaries and publish SHA256SUMS before release success is claimed.

Read all of `product_board.md` and compact current learnings before resuming implementation. The main checklist from `## Scope and completion rules` onward is frozen against `85b489a72`; 52 broad TODOs remain open. Discoveries go only into `future_todo`, which is outside the execution queue. Do not equate bounded ledger completions with closing broad parents. Detailed history is preserved in the October 6 status archive, validation batch and completed ledger.

## Integrated evidence

- Investment interest: main 100/0 plus isolated1/0; four actual returns102pages/freshXSD and16ordinaryPDFs262pages;49held hashes,361 physical files.
- Direct-owner aggregation: main66/0;22distinctreturns443pages plus3annualpages. Saved pending/prepared/carry/origins equality; complete normalized-graph equality was not established.
- Multiple dependent income: main95/0;three source returns15pages, normalizedJSON/prepared/carry/origins/PDF/native parity andfreshXSD.
- PAB AMT: checked eight-module allow-all86/0;12savedreturns162pages freshXSD;70heldfiles. PAB original prepared files were absent; shared ordinary output overwrite is qualified.
- Larger/zero-spouse joint8962: ordinary checked six-module99/0;fivefamilyreturns36pages plus12priorreturns162pages/freshXSD;77heldfiles. Main physical final seal229files, earlier integration310files.

Refer to the board's source-proof links for commands, digests, failure qualifications and physical archive locations. Evidence under `.state/research` and external `/tmp` locations must be retained; `.pdf-cache` is untracked cache, not pending source implementation.

## Pending private routes — excluded from release

| Route | Branch / private commit | Worktree | Resume |
|---|---|---|---|
| Positive-spouse8962 | `codex/form8962-spouse-income-oct7` / `32ca1d2c740a3e7b8db22f97fd9b3dd00f0085cf` | `/tmp/opentax-form8962-spouse-income-oct7` | Poll original53247; finalgate/source replay/math/PDF review then integrate |
| Issuer RPE aggregation | `codex/qbi-rpe-aggregation-oct7` / `5df5c716e152e5de4761d94bd696425dd3a5695d` | `/tmp/opentax-qbi-rpe-aggregation-oct7` | Poll original90244; finalordinary parity/hold transfer then integrate |
| MFJ spouse royalties | `codex/form4952-royalty-joint-oct7` / `f6257fc7e` | `/tmp/opentax-form4952-royalty-joint-oct7` | Poll original55260; fullcompatibility/root review/main qualification then integrate |

### Positive-spouse8962

Current six-file hold: `/tmp/opentax-form8962-spouse-income-evidence-oct7/codeheld-v5.json`. Log: same directory `normal-v5.log`; owned session53247. V4 ordinary67/0(15m33s) is qualified: missing retained W2employer_name rejected native export but directPDF accepted238478bytes. Root literal reproduction `/tmp/opentax-joint-deletion-root-oct7.json/.ts`, source unchanged; missingW2amount/EIN already rejected both paths. Initial no-config import failure is retained.

V5 compares complete received source copies excluding only separately bound rawtax_year. It binds withholding, payer/address/account/classification fields; deletion controls exercise native/directPDF. Fresh mixed withholding150 yieldspayments8094/refund6046; R+B withholding200 yieldspayments8060/refund5957. Existing oracle must be updated for non-W2withholding, not copied as final proof. Source archive `/var/folders/xc/5qnxcpk90019c_ms1nf2hw8r0000gn/T/opentax-8962-joint-income-final-f611c9d1ad8a7af1` was partial atcheckpoint. Final literal replay/full29page review/source-code preservation remain required. Physical qualified checkpoint155files (manifest SHA `a0c5a93911c25a5d47ccc8aa0aa0bf00938819079114234311d54ce5cde64492`): `/tmp/opentax-form8962-spouse-income-checkpoint-oct7/manifest.json`.

### Issuer RPE aggregation

The running V5 log has marked the standalone ScheduleE legal-name test failed; preserve terminal results and diagnose before claiming a checked pass.

Current21-filehold `/tmp/opentax-qbi-rpe-codeheld-v5-oct7.json`; log `/tmp/opentax-qbi-rpe-v5-normal6-oct7.log`; owned90244. V4 finalcheckedfailed only two assertion overloads; V5 changes one test hash, remaining20files/production/sources unchanged. V3 repair runtime26/1 failed standalone missingfilerTIN test; all failures preserved.

Literalfour savedreplay terminal0, all45pages andoriginals exact; issuer statements support shared documentary references and distinct formation/acquisition dates. Root ownDecimal/source/pending/native/member/event/binaryjoins passed; personally inspected45return+8standaloneattachmentinstances through16contacts. Root136file seal `/tmp/opentax-rpe-root-final-review-v4-oct7/manifest.json` SHA `46bc115ce7be7141c18188c5fc1a380d2059a85cb23ef657ae57bb5680b866bf`, main physical copy `.state/research/rpe-root-final-review-v4-oct7`. Finalapproval transfer needs finalcheckedpass/ordinaryPDFparity/helddelta, not rerendering identical files. PrivateV5checkpoint29files SHA `b94704dad44e9d7feeca4b884b5c91f1a73481472a3f93ac6e2a1b1a9415f55a` at `/tmp/opentax-qbi-rpe-v5-checkpoint-oct7/manifest.json`. Native-only business-name formatting preserves legal source/print spelling and rejects unsupported characters/length; no issuer authentication inferred.

### MFJ spouse royalties

Three production files plus new source test bind royalty T/S to final primary/spouse identity and allow separately owned joint interest sources. Source before-rejection terminal0: `/tmp/opentax-form4952-mfjspouse-finalsource-before-v2-oct7/report.json`. Actualafter literal `/tmp/opentax-form4952-mfjspouse-literal-packet-v2-oct7/report.json` terminal0 native/PDF/fullXSD/sevenpages, tax3846/refund7154. New focused checked2/0 withseven native/directPDFnegative cases. Six-module compatibility55260 was pending. Temporary private `.state` schema symlink must be removed/reapplysparsecheckout after live tests; do not stage apparent `.state` deletions or change main evidence. K1box20codeB remains guarded pending issuer/allowed-deduction source proof.

## Full regression / ATS

V32 started2026-10-06T21:47:13Z at immutable `4ea6902e474d4f7ce82127d4ba4653f9c7124e6c`, before later investment-interest/aggregation/8962/PAB/family production. Snapshot `/tmp/opentax-full-regression-source-v32-oct6`; authoritative testPID64169; log `/tmp/opentax-deno-task-test-source-v32-oct6.log` and `.status`. Revalidate PID/session before claiming live or terminal. An observation timeout is not terminal; do not restart solely for elapsed time. Latest integrated fullphase remains required even if V32 passes. V31 superseded for production corrections with exit143/partialreason retained.

ATS credentials/certificate/enrollment/endpoint/WSDL/trust/businessrules remain unverified; scenario1door andscenario8QCD conflicts unresolved. No IRSacceptedacknowledgments. Local XSD/hash/review does not authenticate sources or establish accepted priorfilings/IRSacceptance.

## Resume prompt

Continue existing TY2025 Form1040 TODOs toward MeF readiness. Read and compact product_board.md first; preserve frozen52/mainchecklist and do not execute future_todo. Read this handoff, inspect actual Git/worktrees/liveprocesses and retained evidence. Finish private spouse8962/RPE/royalty qualification, independently review and integrate, run main compatibility and preserve source/XML/PDF/hash evidence. Complete broader existing filing routes, latest full regression and required ATS/IRS acceptance without narrowing the goal. The user has authorized four parallel agents.
