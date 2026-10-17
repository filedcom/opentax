# forms/f1040/2025/return-processing

TY2025 whole-return wiring that is neither a node nor one form's serializer:
the generated `start` input node, the staged execution order, pending
normalization shared by MeF and PDF, and return-wide export guards. Form-level
checks go in `../domains/`; calculations in `../../nodes/`. The file index is
[README.md](AGENTS.md).

## Layout
- `start.ts` — `buildStartNode(inputNodes)`: builds the strict public input
  schema from `../inputs.ts` (key = `inputKey ?? node.nodeType`, arrays as
  `z.array(itemSchema)`) and routes each present input to its node. The only
  `TaxNode` a year may own (`check:structure`).
- `staged_source_return.ts` — `executePreQefSourceReturn`: Form 8839, Form
  8863 two-pass and Schedule J staging before the QEF counterfactual;
  `composed_source_return.ts` adds the Form 8621 QEF refigure (the full public
  return, replayed by the MeF/PDF builders for Schedule J).
- `pending.ts` — `normalizePendingDict` / `normalizeAllPending`: arrays of
  numbers become the last value, except additive keys (`additiveNumericKeys`
  and per-node keys), which are summed, and Form 4952 `source_*` arrays, kept.
- `return_wide_arithmetic.ts` — `assertReturnWideArithmetic`,
  `assertReturnScheduleJoins`, final-balance checks (called from the Form 1040
  MeF serializer).
- `attachment_coverage.ts` — `assertAttachmentCoverage(pending, "mef" | "pdf")`:
  `MISSING_ATTACHMENTS`, documents a positive source requires that the exporter
  cannot yet produce; export throws instead of omitting them.
- `prepared_source.ts` — `sha256Hex`, `preparedSourceBytes`: binds a PDF to the
  source and filer MeF serialized.

## Rules
- Add a public input in `../inputs.ts`, never here; `buildInputSchema` throws
  on a duplicate key and the schema is `.strict()`.
- A new additive pending key is a tax decision (independent sources sum); add
  it to `pending.ts` with the reason in its header comment, and test it in
  `pending.test.ts`.
- When an export path is not built yet, add a `MISSING_ATTACHMENTS` entry with
  a `reason`; do not drop the document or the source.
- Staging order is tax order (education precedes adoption in the Form 8839
  credit-limit worksheet); keep the comment with the rule it encodes.

## Verify
- `bun test ./forms/f1040/2025/return-processing/ --timeout=1800000`
- `bun run check:structure` after changing `start.ts`.
- `bun run bench --form f1040 --year 2025` and `bun run check:oracle` when
  staging or normalization changes.
- `bun run test:unit`.

## Read next
- [../AGENTS.md](../AGENTS.md) — `index.ts`, `inputs.ts`, `registry.ts`
- [../domains/AGENTS.md](../domains/AGENTS.md), [../mef/AGENTS.md](../mef/AGENTS.md)
- [../../../../docs/architecture/STRUCTURE.md](../../../../docs/architecture/STRUCTURE.md)
