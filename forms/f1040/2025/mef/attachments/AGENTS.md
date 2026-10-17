# forms/f1040/2025/mef/attachments

Guards for MeF PDF binary attachments: what a valid attachment is, and the
proof that a prepared bundle's XML, attachment list and digests agree.
Parent: [../AGENTS.md](../AGENTS.md).

## Files

- ``pdf_attachment_filename.ts`` — ``isValidMefPdfFilename``: printable ASCII,
  ≤ 64 chars, ends ``.pdf``, no ``..``, no surrounding spaces, none of
  ``\ / ; | [ ] < > ^ \`` & " ' : ? *`.
- `pdf_attachment_envelope.ts` — `assertMefPdfEnvelope`: 1 byte–60 MB,
  starts `%PDF-1.0…1.7|2.0` plus a newline, ends `startxref … %%EOF`.
- `prepared_attachment_manifest.ts` —
  `assertPreparedDocumentInventory` (one `ReturnData`, `documentCnt`,
  `binaryAttachmentCnt`, IRS1040 first, canonical IDs from
  `../identity/document_identity.ts`, every `referenceDocumentId` resolves),
  `assertPreparedAttachmentMetadata` (names, ≤ 128-char descriptions and
  `BinaryAttachment` order match `attachmentSha256ByFileName`) and
  `assertPreparedAttachmentManifest` (re-hashes XML and every PDF).

## Traps

- Consumers: `../builder.ts`, `../../pdf/builder.ts`,
  `../submissions/*`, the Form 8886 OTSA export and the ATS replay. A
  relaxed check here relaxes all of them.
- The 60 MB limit is repeated in `cli/commands/form8839-attachments.ts`.
- No tests live here; the guards are exercised by
  `../builder.test.ts`, `../identity/document_identity.test.ts` and
  `../submissions/submission_archive.test.ts`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/builder.test.ts ./forms/f1040/2025/mef/identity/`
