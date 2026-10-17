# forms/f1040/2025/mef/identity

Document identity inside one MeF return: `documentId`s, cross-document
references, and the W-2G payer-copy content check. Parent:
[../AGENTS.md](../AGENTS.md).

## Files

- `document_identity.ts` —
  - `documentId(tag, index)`: the root tag cut to `30 - digits(index)` chars
    plus the position index. IDs are positional, so reordering
    `ALL_MEF_FORMS` changes every later ID.
  - `validateDocumentReferences(fragments)`: unique IDs after truncation,
    every `referenceDocumentId` resolves and is not repeated, names match,
    `JointOccupancyStatement` and `IRADistributionStatement` are referenced;
    also runs the Form 5471 schedule linkage check.
  - `hasMismatchedSingleReferenceName` with `IRS_REFERENCE_NAME_BY_ROOT`:
    where the TY2025 schema's `referenceDocumentName` differs from the
    shortened XML root (`…Stmt` → `…Statement`). A new statement whose root is
    abbreviated needs an entry, checked against the XSD.
- `w2g_payer_copy.ts` — `assertW2GPayerCopyContents`: for each W-2G with
  box 4 withholding, the attached payer PDF (`issued_copy_attachment_file_name`)
  must carry every modeled Copy B text field (except `payer_phone`) of the
  `w2gPdf` projection.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/identity/`
- `bun test --timeout=1800000 ./forms/f1040/2025/mef/builder.test.ts` (callers
  in `../builder.ts`).
