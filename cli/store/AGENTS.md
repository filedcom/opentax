# cli/store/

Persistence for a return: one `<baseDir>/<returnId>/return.json` holding the
entered source inputs, plus guarded calculated records bound to those inputs.
No tax computation here — records are recomputed through the form's
`executeReturn`, never edited by hand. Command parsing belongs in
`cli/commands/`.

## Layout
- `types.ts` — `ReturnJson` = `meta` (`returnId`, `year`, `formType`,
  `createdAt`) + `inputs` (node type → `[{ id, fields }]`) + optional
  `form8990CalculatedWorkpaper`.
- `store.ts` — `createReturn`, `loadReturn`, `appendInput`/`updateInput`/
  `deleteInput`, `listInputs`/`getInput`, and `buildEngineInputs`, which turns
  stored buckets into the start node's input map.
- `public-input-keys.ts` — `singletonPublicInputKeys(def)`: the public
  `inputKey` (or node type) of every non-array input; pass it to
  `buildEngineInputs`.
- `form8990-workpaper.ts` — persists/rereads the TY2025 Form 8990
  calculated-unfiled carryforward workpaper inside `return.json`.
- `form8582-ledger.ts` — immutable Form 8582 ledger candidate archives under
  `<returnId>/form8582-ledger-candidates/<recordId>/`
  (`source.json`, `form8582.xml`, `record.json`).

## Rules
- Every write goes through `writeReturnJson`: a `0o600` staged file opened
  `wx`, `fsync`ed, then `rename`d over `return.json`. Don't write
  `return.json` directly.
- Any input mutation drops `form8990CalculatedWorkpaper`
  (`withUpdatedInputs`); a calculated record is a snapshot, never a live input.
- `buildEngineInputs` throws on ambiguity instead of dropping data: duplicate
  start keys, more than one entry for a singleton input, or a key claimed twice.
- Entry IDs are `<nodeType>_NN` from the bucket length (`nextId`).
- A missing `meta.formType` reads as `"f1040"` (older return files).
- Archive and workpaper readers recompute from current inputs and compare
  hashes and contents; a mismatch throws. Records carry no IRS acceptance:
  status is `acceptance-unverified` / `calculated-unfiled`.
- Both record modules accept only TY2025 Form 1040 and validate their records
  with a `.strict()` Zod schema.

## Verify
- `bun test --timeout=1800000 cli/store/` (not in `bun run test:unit`).
- `bun test --timeout=1800000 cli/commands/` when `store.ts` signatures
  change; commands and `benchmark/issue77_return.test.ts` import it.
- `bun run check:sandbox` — `store.ts` is in the shipped module graph.

## Read next
- [../AGENTS.md](../AGENTS.md)
- [../../core/runtime/AGENTS.md](../../core/runtime/AGENTS.md) — what
  `executeReturn` does with the inputs built here
