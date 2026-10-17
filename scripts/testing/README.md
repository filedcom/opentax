# Harness

The harness is what you use while building the engine; it is never shipped.
`cli/main.ts` is the product. The harness restricts a change and proves it, so a
pull request carries evidence instead of a description. The finish condition is
in [AGENTS.md](../../AGENTS.md); the rule each check owns is in the table in
[STRUCTURE.md](../../docs/architecture/STRUCTURE.md).

| Command                                     | Proves                                                           | Fails when                                                                                                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run check:structure`                   | nodes are placed, registered and reachable                       | a `TaxNode` outside `forms/<form>/nodes/<role>/[<kind>/]<section>/<group>/<name>/`; a registry key that is not the node type; a node class in no registry; a registered node that nothing routes to and the CLI cannot take |
| `bun run check:cases`                       | benchmark cases fit their node schemas and cite a source         | an input `form add` would reject, with the field named; a `source` that cites the engine                                                                                                                                    |
| `bun run check:oracle [--base origin/main]` | expected values changed only with a citation                     | a changed scored value, a removed case, or a new case without a source, that has no matching entry in `benchmark/cases/<form>/<year>/ledger.json`                                                                           |
| `bun run bench --form f1040 --year 2025`    | the engine matches IRS ground truth                              | a supported line outside the $5 legacy tolerance, an unmapped oracle, a diagnostic, a skipped case                                                                                                                          |
| `bun run check:sandbox`                     | the binary can reach the network only through restricted fetch   | a module `cli/main.ts` loads, dependencies included, that imports `child_process`, `net`, `http`, `worker_threads`, `vm`, `bun:ffi` or similar, or calls `Bun.spawn`, `eval` or a non-literal `import()`                    |
| `bun run test:unit`                         | the module graph resolves, type-checks, and the typed tests pass | an unresolved import, a `tsc` error (strict, no unused locals or parameters), a missing or duplicate test module, a failing test, a runtime change during the run                                                           |
| `bun run test:forms`                        | the node, MeF, validation and return-processing tests pass       | a failing test not in `scripts/testing/forms-failure-baseline.json`, an expired entry, an entry whose test now passes                                                                                                       |
| `bun run check:cli`                         | complete sample returns work end to end through the product CLI: create, add, get, validate, export MeF and PDF | a failing command, `return get` or MeF AGI differing from the engine, a reject other than the known header birth date, or an export that writes no file |
| `bun run verify:changed [base]`             | the gates a change since `base` (default `origin/main`) can reach pass | any selected gate failing, or a bench case that passes at the merge base and fails now |
| `bun run bench:cached [bench flags]`        | same as `bench`, replayed when nothing it reads changed           | as `bench`                                                                                                                                                                                                                  |
| `bun run check:mef [--update]`              | every signed PDF review fixture computes, builds MeF XML and passes the IRS business rules export applies | a calculation, XML or reject-level rule finding not in `scripts/testing/mef-baseline.json`, or a baselined finding that no longer occurs; `--update` rewrites the baseline |

Every check prints each problem with its fix, takes `--json`, and exits 1 on any
problem. `.github/workflows/test.yml` runs the first three, `check:sandbox`,
`test:unit`, `test:forms`, `check:mef` and `check:cli` on every pull request. `bench` runs locally until the baselined
cases below are fixed, then joins them.

## Changed-only runs

`verify:changed` is the local fast path; CI does not use it. It selects:

- `test:unit --changed` and `test:forms --changed`: tests whose import closure
  reaches a changed file. A changed data file selects the modules that name it.
  A deleted module, a data file no module names, or a shared input
  (`package.json`, `bun.lock`, `tsconfig.json`, the runner itself) selects all.
  The type check always runs, and the forms baseline is held only to the
  selected tests.
- `check:mef`, `check:cli` and bench only when `cli/main.ts` loads a changed
  file or a benchmark file changed.
- Bench on this change and on the merge base, each keyed by a hash of every file
  its results can depend on (the commands bench runs, runtime data, the cases,
  the lockfile, the Bun version and the date) and stored in
  `~/.cache/opentax-bench`. A base runs once per `main` commit; a rule-only
  change replays both. It fails on any case that passes at the base and fails
  now.

## Ratchets

Existing debt is allowed with a reason, an expiry date and an approver; new debt
fails. An expired entry fails, and an entry that no longer matches a problem
fails until it is removed, so a baseline only shrinks.

| File                                          | Keyed by               | Holds                                               |
| --------------------------------------------- | ---------------------- | --------------------------------------------------- |
| `scripts/testing/structure-baseline.json`     | path, node type        | nodes outside the tree, registry and reach problems |
| `benchmark/cases/baseline.json`               | `<form>/<year>/<case>` | cases whose inputs no longer fit their node schema  |
| `scripts/testing/forms-failure-baseline.json` | test file, test name   | form tests known to fail                            |
| `scripts/testing/mef-baseline.json`           | sample return id       | known calculation, XML and IRS-rule blockers        |
| `benchmark/cases/<form>/<year>/ledger.json`   | case, line             | every expected-value change, with its publication   |

The ledger is history, not debt: it is append-only and never expires. An entry
that cites the engine, its output or a reference calculator does not count.

## Adding a check

Add one when the same mistake has happened twice, at the highest level that
holds: make it impossible in code (one owner, one path, the old way deleted);
else a check here whose error names the fix; else a test; else a line in
`AGENTS.md`, which nothing enforces. Prove the check fails on the real past
mistake before it lands. When the pattern is already common, fail only on new
occurrences. Delete a check once its mistake cannot happen, and record every
rule and its enforcer in the STRUCTURE.md table.

## Test runner

`bun run test:unit` runs the exact core, CLI utility, network policy and harness
modules after resolving every runtime import of every TypeScript module and
type-checking the tree with `tsc`. Tests run under `bun test --isolate`, a fresh
global and module registry per file, with a 30-minute per-test limit.
`test:forms` runs every test under `forms/<form>/{nodes,mef,validation}` and
`forms/<form>/<year>/{mef,return-processing}` in parallel workers; tests marked
`requires: "irs-cache"` in its baseline may pass when the private IRS schema
cache is present. The domain, PDF and e2e suites are too slow for every pull
request and stay in `bun run test`.
`test:harness` selects the verification contracts and benchmark harness.
`test:preflight` checks discovery and graph resolution without executing tests.
Reports explicitly list excluded modules; a selected run does not prove complete
filing coverage.

`bun run test` runs the complete discovered suite in isolated parallel workers,
requires xmllint, Poppler and the retained TY2025 Return1040 schema, and rejects
unavailable ignored requirements. Exact module/test exclusions in
`skip-policy.json` require a documented reason; excluded tests remain
unverified, and the report never calls a run with exclusions complete coverage.
Private reviewed evidence must be supplied through the existing named
environment inputs for the relevant optional filing gates. Missing inputs and
ignored cases remain visible in the requirements and JUnit reports. A full suite
is not IRS acceptance or independent tax ground truth.

Every invocation retains a unique private directory under
`.state/research/testing/`, including exact selected/excluded modules, module
graph, runtime hashes, stdout/stderr, child exit status and terminal report.
Runtime changes, graph errors, missing/duplicate test modules, zero executed
tests and nonzero child status prevent success. Full runs acquire an exclusive
shared lock; an unreleased lock requires checking its recorded process and
report before recovery. Historical evidence is never overwritten.
