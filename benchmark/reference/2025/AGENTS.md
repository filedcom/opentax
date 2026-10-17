# benchmark/reference/2025

The Issue 77 reconciliation record for the f1040/2025 benchmark cases: IRS
table extracts, the per-case change ledger, the original incomplete fixtures
and labeled synthetic facts, for tests and the release smoke; never engine
output. Narrative: [README.md](./README.md). Parent: [../../AGENTS.md](../../AGENTS.md).

## Files

- `irs-tables.json` — TY2025 Tax Table (2,062 rows) and non-terminal EIC rows
  (1,362) extracted from the [Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
  with source URL, retrieval date and HTML SHA-256. Read by
  `../../issue77_reference.test.ts`.
- `issue77-changes.json` — 122 records `{ case, changes, basis,
  source_limitations }`: every expected value changed in the reconciliation,
  with its previous value; checked against `correct.json` by the same test.
- `issue77-original-incomplete.json` — the pre-completion `input.json` and
  expectations of cases later given synthetic facts, keyed by case id. Read by
  `../../issue77_return.test.ts` and `scripts/release/smoke-issue77.ts`.
- `issue77-synthetic.json` — invented SSNs, ownership and age variants
  (`provenance` says so). Read by `../../issue77_synthetic.test.ts` and the
  release smoke.
- `synthetic-marketplace/<case>.json` — labeled synthetic Marketplace
  records for PTC cases 36, 45, 48, 52, 53 and 110.

## Traps

- Case `input.json` files cite a marketplace record by path and pin its
  `record_sha256`; any byte change here breaks those cases.
- These files never supply an expected value on their own: a change to
  `irs-tables.json` or `issue77-changes.json` needs the IRS source and a
  `../../cases/f1040/2025/ledger.json` entry, created with the first change
  (`bun run check:oracle`).
- The README's "Run the focused checks" block (`bun test ./--allow-run …`)
  is not a valid command; use the ones below.

## Verify

- `bun test --timeout=1800000 ./benchmark/issue77_reference.test.ts ./benchmark/issue77_synthetic.test.ts ./benchmark/issue77_return.test.ts`
- `bun run check:cases`
