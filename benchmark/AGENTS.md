# benchmark

Engine output compared against IRS ground truth: checked-in cases, the harness
that validates them, and the runners that drive the `cli/main.ts` commands
(`return create`, `form add`, `return get`) per case. Not shipped. Pass
criteria, output-key mapping and the $5 legacy tolerance are in
[README.md](./README.md); do not restate or change them here.

## Layout
- `cases/` — the cases, their baseline and ledgers; see [cases/AGENTS.md](./cases/AGENTS.md).
- `harness.ts` — shared schemas (input, expected, computed return), case
  discovery and validation, the engine-citation rule (`ENGINE_SOURCE`) and the
  case baseline (`applyCaseBaseline`).
- `check_cases.ts` — `bun run check:cases`: validates every case without the
  engine; honours `cases/baseline.json`.
- `run_benchmark.ts` — `bun run bench`: runs every case of a form:year
  (`--form`, `--year`, `--json`) and scores supported keys.
- `run_case.ts` — runs one case directory and prints the computed return JSON;
  writes nothing to the case.
- `reference/2025/` — Issue 77 reconciliation record (README, change ledger,
  IRS tables, synthetic variants used by `scripts/release/smoke-issue77.ts`).
- `*.test.ts` — harness, runner, fixture-contract and Issue 77 tests.

## Rules
- Expected values come from the IRS publication cited in `source`, never from
  the engine: a `source` matching `ENGINE_SOURCE` (engine, `output.json`,
  reference calculator, …) fails `check:cases`.
- A failing case is fixed in the engine or escalated with its citation; never
  edit `correct.json`, widen the tolerance or add an output alias to pass.
- Every changed scored value needs a ledger entry (`check:oracle`).
- `run_benchmark.ts` does not apply `cases/baseline.json`: discovery throws if
  any case is invalid, so `bench` exits 1 before running the engine while
  baselined cases remain (28 for f1040/2025 as of this writing). Use
  `check:cases` and `run_case.ts` meanwhile.
- Only `harness.test.ts` is in `bun run test:unit` / `test:harness`; the other
  tests here run in the full suite or directly.

## Verify
- `bun run check:cases`
- `bun run check:oracle` (`--base <ref>`, default `origin/main`)
- `bun benchmark/run_case.ts benchmark/cases/f1040/2025/02-single-w2-basic`
- `bun run bench --form f1040 --year 2025`
- `bun test ./benchmark/harness.test.ts --timeout=1800000`

## Read next
- [README.md](./README.md) — pass criteria, running, changing expected values
- [cases/AGENTS.md](./cases/AGENTS.md)
- [reference/2025/README.md](./reference/2025/README.md)
- [../docs/architecture/STRUCTURE.md](../docs/architecture/STRUCTURE.md) — case formats
- [../scripts/testing/README.md](../scripts/testing/README.md) — the harness checks and ratchets
