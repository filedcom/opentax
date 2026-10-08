# Verification harness

`deno task test:unit` runs the exact core, CLI utility and harness modules after
checking the graph of every TypeScript module. `test:harness` selects the
verification contracts and benchmark harness. `test:preflight` checks discovery
and graph resolution without executing tests. Reports explicitly list excluded
modules; a selected run does not prove complete filing coverage.

`deno task test` runs the complete discovered suite serially, requires xmllint,
Poppler and the retained TY2025 Return1040 schema, and rejects unavailable
ignored requirements. Exact module/test exclusions in `skip-policy.json` require
a documented reason; excluded tests remain unverified, and the report never
calls a run with exclusions complete coverage. The initial policy is empty.
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

The PR workflow runs the typed unit/harness selection and complete module graph;
its report distinguishes those checks from private native/PDF/ATS requirements.
