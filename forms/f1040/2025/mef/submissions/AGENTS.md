# forms/f1040/2025/mef/submissions

Packaging a prepared return for IRS A2A transmission, offline: the submission
ZIP, the SendSubmissions container, and a local evidence store. Nothing here
opens a connection, and nothing here is proof of IRS receipt or acceptance.
Not reached from `cli/main.ts`. Parent: [../AGENTS.md](../AGENTS.md).

## Files

- `submission_archive.ts` — `buildMefSubmissionArchive(bundle, options)`:
  re-verifies source/XML digests, `assertPreparedBundleProjection`, the final
  header, residency review and attachment manifest, then zips
  `manifest/manifest.xml`, `xml/submission.xml`, `attachment/<file>.pdf`.
  Requires an explicit Form 1040 `digital_assets` boolean.
  `buildMefTransmissionPackage` makes the `SendSubmissionsRequest` and a
  stored (level 0) ZIP of 1–100 submissions; `zipDirectoryEntryCount` checks
  physical ZIP entries against decoded payloads.
- `residency_review.ts` — `filingResidencyReviewSchema` /
  `assertFilingResidencyReview`: a reviewed full-year status per filer; the
  joint-election status must agree with `<NRASpouseTreatedAsResidentGrp>`.
- `a2a_evidence.ts` — `recordA2aSendPackage`, `readA2aSendRecord`,
  `readA2aArchivedSubmission`, `recordA2aInboundPayload`,
  `readA2aInboundPayload`: write-once records keyed by SHA-256 of the
  MessageID under a caller-given root (staged, fsynced, renamed; mode 0700),
  re-hashed on every read.

## Traps

- Submission IDs must match `^[0-9]{13}[a-z0-9]{7}$` everywhere.
- `*_replay.test.ts` and `submission_batch_isolation.test.ts` always run;
  `JOINT_`/`PATRON_`/`SSTB_SUBMISSION_EVIDENCE` only name a directory to write
  the archives to. Their notes are in `docs/ty2025/testing/`.
- `submission_archive.xsd.test.ts` skips without the private
  `efileAttachments.xsd` under `.state/research/docs/`; report it unverified.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/submissions/`
