# scripts/testing

The harness: checks that restrict a change and prove it, plus the test runner.
Never shipped. What each command proves and when it fails is the table in
[README.md](./README.md); this file is for changing the harness itself.

## Layout
- `structure.ts` — `check:structure`: node placement (`ROLES`,
  `INTERMEDIATE_KINDS`, `SECTIONS`), registry keys, registration, reachability.
- `structure-baseline.json` — allowed structure violations (reason, expiry,
  approver).
- `oracle.ts` — `check:oracle [--base <ref>]` (default `origin/main`):
  expected-value changes vs `benchmark/cases/<form>/<year>/ledger.json`;
  defines the ledger schema.
- `sandbox.ts` — `check:sandbox`: walks every module `cli/main.ts` loads and
  fails on `FORBIDDEN_MODULES` / `FORBIDDEN_CALLS`.
- `run.ts` — runner; modes `full` (`bun run test`), `unit`, `harness`,
  `preflight`.
- `repository.ts` — git file list, test inventory, graph preflight and `tsc`.
- `contracts.ts` — graph, inventory, JUnit and skip-policy contracts.
- `full-lock.ts` — exclusive lock for full runs.
- `skip-policy.json` — exact exclusions with a documented reason (full mode).
- `*.test.ts` — tests for each of the above.

## Rules
- Every check prints each problem with its fix, accepts `--json`, and exits 1
  on any problem.
- Ratchets only shrink: new debt fails, an expired entry fails, an entry that no
  longer matches fails until removed.
- A new check must name the fix in its error, be proven against the real past
  mistake, and get a row in the STRUCTURE.md rules table.
- `run.ts` passes `--timeout=1800000` (30 min per test) to `bun test`; `unit`
  and `harness` use `--isolate`, `full` uses `--parallel=<cores>`. Selected
  paths are passed as `./<path>`, since a bare argument is a name filter.
- `unit` selects `core/`, `cli/utils/`, `cli/network.test.ts`,
  `scripts/support/`, `scripts/testing/`, `benchmark/harness.test.ts`;
  `harness` selects `scripts/testing/` and `benchmark/harness.test.ts`.
- `full` takes `.state/research/testing/full.lock`, needs `xmllint`,
  `pdftotext`, `pdftoppm` and the retained TY2025 `Return1040.xsd` under
  `.state/research/docs/`, and fails on any ignored test not in
  `skip-policy.json`. It takes hours; run it only when asked.
- Every run writes evidence to a new private directory under
  `.state/research/testing/`; a runtime file change during the run fails it.
- CI (`.github/workflows/test.yml`) runs check:structure, check:cases,
  check:oracle, check:sandbox and test:unit; `bench` and the full suite are not
  in CI.

## Verify
- `bun run test:harness`
- `bun test ./scripts/testing/<file>.test.ts --timeout=1800000`
- `bun run check:structure && bun run check:oracle && bun run check:sandbox`
- `bun run test:preflight` (graph and `tsc` only, no tests)

## Read next
- [README.md](./README.md)
- [../../docs/architecture/STRUCTURE.md](../../docs/architecture/STRUCTURE.md) — rules table
- [../../benchmark/AGENTS.md](../../benchmark/AGENTS.md)
- [../../AGENTS.md](../../AGENTS.md) — pull request finish condition
