# forms/f1040/e2e

End-to-end return contracts for Form 1040: inputs run through the real
registry, planner and executor, and the result is checked in MeF XML, PDF or
return lines. Unit tests for a single node stay beside that node, not here.
Index: [README.md](AGENTS.md).

## Layout
- `income/`, `adjustments/`, `deductions/`, `credits/`, `taxes/`, `payments/` —
  return sections, each with an AGENTS.md; subfolders are the tax group, then the
  form (e.g. `adjustments/health/form8853/`).
- `ats/` — IRS TY2025 MeF ATS scenarios, kept together: `scenario_1040_NN_input.ts`
  is the transcribed source slice of packet NN and its `.test.ts` reconciles it;
  `ty2025_cases.ts` is the ATS inventory (`partial-facts` or `inventory-only`,
  never an accepted transmission); `ty2025_*_coverage.ts`, `*_replay.ts` and
  `ty2025_check_ledger.ts` track which packet values are covered.
- `workflows/` — whole-return flows not owned by one section (return, export,
  direct deposit, XSD validation).

## Rules
- Place a test under the return section and group of the form it proves, in
  the same seven sections used by `forms/f1040/nodes/` and
  `forms/f1040/2025/domains/`; ATS scenarios never split by section.
- File names are snake_case, typically `<form>_<topic>_2025.test.ts`.
- Tests use `bun:test` and `@std/assert`; drive the graph with
  `buildExecutionPlan` (`core/runtime/planner.ts`), `execute`
  (`core/runtime/executor.ts`) and `registry` (`../2025/registry.ts`), and
  export with `buildMefXml` / `buildPdfBytes` from `../2025/mef|pdf/builder.ts`.
- File and process helpers come from `scripts/support/sys.ts` (test-only; product
  code uses `node:` directly).
- ATS facts cite the IRS packet URL and page; a `partial-facts` scenario is not
  an ATS-ready return and must not be described as one.
- Some tests read `process.env.*` paths (e.g. `FORM8941_RATING_EVIDENCE`) that
  only name where to write XML/PDF evidence; they gate nothing.
  `scripts/testing/run.ts` reports them as external inputs, and the full run
  fails on ignored tests without a `scripts/testing/skip-policy.json` reason.
- These modules are not in `bun run test:unit`; only `bun run test` (full) runs
  them all.

## Verify
- `bun test ./forms/f1040/e2e/<section>/<group>/<form>/<file>.test.ts --timeout=1800000`
  (the leading `./` makes it a path, not a name filter).
- `bun run test:unit` still passes (type-checks every module, including these).

## Read next
- [README.md](AGENTS.md) and each section README, e.g. [income](income/AGENTS.md)
- [../../../docs/architecture/STRUCTURE.md](../../../docs/architecture/STRUCTURE.md)
- [../../../docs/architecture/repository-organization.md](../../../docs/architecture/repository-organization.md)
- [../../../scripts/testing/README.md](../../../scripts/testing/README.md) — test runner modes
