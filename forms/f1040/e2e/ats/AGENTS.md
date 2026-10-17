# forms/f1040/e2e/ats

IRS TY2025 MeF ATS packets as data and as replays against the engine. These
are partial transcriptions, never accepted transmissions or ATS-ready returns.
Prose evidence for the same work is in `docs/ty2025/ats/`. Parent:
[../AGENTS.md](../AGENTS.md).

## Files

- `ty2025_cases.ts` — `TY2025_ATS_CASES` (id, return type, packet
  `sourceUrl`, listed `forms`, `capture`, cover-sheet requirements) and the
  transcribed `SCENARIO_*_FACTS` per packet, including 1040-NR, 1040-SS and
  4868 scenarios the engine does not prepare.
- `scenario_1040_NN_input.ts` — `scenario1040NNInput()` builds a `start`
  input from the facts (doc comment cites packet URL and pages);
  `SCENARIO_1040_NN_RECONCILIATION.missing` (03: `notAtsReadyBecause`) lists
  what the slice lacks. `.test.ts` beside each runs it through the graph.
- `ty2025_check_replay.ts` — `ATS_REPLAY_TARGETS` (expected values with a
  `TargetBasis` and source location) and `replayAtsChecks()`: execute,
  prepare, then compare calculations, native values, W-2/retirement copy
  values, documents and attachments.
- `ty2025_check_ledger.ts` — `buildAtsCheckLedger`: replay rows by kind.
- `ty2025_{native,w2,retirement}_value_coverage.ts`,
  `ty2025_{document,attachment}_coverage.ts`, `ty2025_issued_copy_values.ts`,
  `ty2025_source_reconciliation.ts` — the comparators and known-gap notes.

## Rules

- Targets are fixed from the packet, not the engine: a `different` result
  stays a target ("changing an expected value to match the engine hides
  evidence"). Use `TargetBasis.Provisional` for an interpretation.
- A new scenario needs its facts in `ty2025_cases.ts`, an input module, a
  `RECONCILIATION` entry in `ty2025_source_reconciliation.ts` and, to be
  replayed, an entry in `ATS_REPLAY_TARGETS` and the `inputs` map.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/e2e/ats/`
- `bun forms/f1040/e2e/ats/ty2025_check_ledger.ts <out.json>` (or
  `ty2025_check_replay.ts`; no argument prints). `deno run` in docs is stale.
