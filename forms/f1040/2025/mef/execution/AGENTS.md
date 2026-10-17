# forms/f1040/2025/mef/execution

The seam between executor output and the serializers. Nothing here computes
tax or emits XML. Parent: [../AGENTS.md](../AGENTS.md).

## Files

- `pending.ts` — `buildPending(pending)`: normalizes each node's executor
  slice with `normalizePendingDict` (`../../return-processing/pending.ts`)
  into `MefFormsPending`. Exposed as `FormDefinition.buildPending` in
  `../../index.ts`; the PDF builder and review scripts use it too.
- `return_document_inventory.ts` — `returnDataDocuments(xml)`: the direct
  `<ReturnData>` children as `{ tag, id }`, or `undefined` for invalid XML,
  stray text, or a child without `documentId`. Used by
  `../attachments/prepared_attachment_manifest.ts`,
  `../submissions/a2a_evidence.ts` and one PDF review test.

## Traps

- `buildPending` keeps every node slice, including calculation-only ones
  (e.g. `form8978_reporting_year`): only `ALL_MEF_FORMS` decides what becomes
  a document. Don't filter keys here to hide a document.
- Exceptions that are deliberate: `form8960` is dropped unless
  `line13_magi` is a number and `form4952` unless `line3` is; `form8949`
  becomes a transaction array, minus Part A/D rows with no adjustment code or
  amount (those go straight to Schedule D).
- `returnDataDocuments` reads only top-level documents; nested `documentId`s
  are intentionally ignored.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/execution/`
- Then the whole-return contracts in `../builder.test.ts`.
