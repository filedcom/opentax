# benchmark

Accuracy benchmark for the `tax` engine — 133 checked-in TY2025 scenarios.
Expected values are regression fixtures, not proof of IRS certification or
universal tax correctness; independently verify their provenance before treating
them as authority.

For folder layout and file formats, see
[STRUCTURE.md](../docs/architecture/STRUCTURE.md).

## Cases

133 scenarios covering the common return types:

| Range | Filing status | Key features tested                                                                                                                                      |
| ----- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01–10 | Single        | W-2 only, high income, unemployment, interest, capital gains, Schedule C, student loan, senior, two employers                                            |
| 11–17 | MFJ           | Both W-2, children/CTC, unemployment, dividends, Schedule C + QBI, retirement + SSA, excess SS tax                                                       |
| 18–20 | HOH           | Child/CTC, EITC, dependent care credit                                                                                                                   |
| 21–31 | Mixed         | Additional Medicare Tax, ACTC, LTCG 0% bracket, blind filer, senior + SE income                                                                          |
| 32–97 | Extended      | Schedule C loss, 1099-R, AOTC, marketplace/1095-A, educator expense, estimated tax, EITC no children, 401(k), tips, QBI, K-1, SSA, NIIT, multiple 1099-R |

**WIP contract — not ready for a standalone accuracy claim:** distinguish public
summary outputs, exact raw output fields, intermediate oracles and fixture
metadata. `run_benchmark.ts` lists supported exact keys traced to
`ReturnSummary` in `cli/commands/return.ts` and the F1040 output schema in
`forms/f1040/nodes/outputs/general/return-assembly/f1040/index.ts`. No aliases
or intermediate mappings have been approved. Numeric expectations outside that
supported contract become explicit `unsupportedChecks` and prevent success,
rather than being called engine defects. Envelope metadata (`case`, `scenario`,
`year`, `inputs`, sources/notes) is not scored. The `correct` object is the
oracle namespace; only explicitly named metadata fields may be nonnumeric.
Malformed oracles, including unmapped ones, fail.

**Pass criteria:** compare supported expected output keys, including AGI and
payments, not only tax/refund/owed; no unsupported oracles, command failures or
diagnostics. Each must have a finite numeric actual value within an inclusive
absolute $5 legacy tolerance. This inherited tolerance accommodates existing
fixture rounding; it is not an IRS-approved discrepancy allowance. Missing
values never become zero. Singleton numeric arrays are accepted; empty,
multi-entry, nonnumeric and nonfinite actuals fail. Nonfinite expectations,
invalid tolerances and no numeric expectations fail rather than silently
passing. Descriptive nonnumeric metadata is not scored.

Raw `lines` values take precedence over normalized summary values. Executor
diagnostics and failed CLI subprocesses fail the case. Any failing case,
skipped/incomplete case directory or empty case set makes the command exit
nonzero. The trailing JSON keeps `failing` as case-name strings and adds
`failures` with `lineFailures`, `unsupportedChecks` and `errors`.

Some fixtures expect intermediate names not exposed by `return get`. These are
reported as unsupported checks, not missing filed lines. The omitted refund side
becomes zero only when a positive amount owed is present, and conversely for
omitted amount owed with a positive refund. When both are omitted, both become
zero only if finite tax and payments totals are equal. Explicit nulls, arrays
and malformed values are never replaced, and no other missing filed line
receives a default. Resolving mappings/output coverage needs independent review,
not changes to expected values or relaxed tolerances. A red benchmark is not by
itself proof that every reported discrepancy is a tax-engine arithmetic error.

## How to run

```bash
# Full benchmark
cd benchmark && deno run --allow-read --allow-write --allow-run run_benchmark.ts

# Single case
deno run --allow-read --allow-write --allow-run run_case.ts cases/02-single-w2-basic/

# Regenerate all output.json
deno run --allow-read --allow-write --allow-run run_all.ts
```

## Adding a new case

Use `/tax-cases` (Claude Code skill) to generate IRS-sourced cases
automatically, or create `cases/{form}/{year}/NN-description/input.json` and
`correct.json` manually following the formats in
[STRUCTURE.md](../docs/architecture/STRUCTURE.md).

## Tax-year references

Use the
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
and the
[2025 Schedule A instructions](https://www.irs.gov/pub/irs-prior/i1040sca--2025.pdf),
plus the applicable form-specific instructions. The former abbreviated parameter
table was stale and is not retained as a second, competing source of tax rules.
This documentation change does not modify engine tax parameters or gold
fixtures.

## Current discovery contract

Discovery recursively validates every leaf against the shared input and
expected-value schemas before starting the CLI. Empty or incomplete directories
and malformed fixtures terminate with an error; no partial-success JSON report
is emitted. Each valid expected record includes total tax, refund and amount
owed. CLI output must pass the shared computed-return schema before the stricter
per-field comparisons run. This preserves current-main validation while
retaining the draft’s explicit unsupported-oracle diagnostics.

## Issue 77 reconciliation

The [October 14 review](./reference/2025/README.md) records corrections to 121
fixtures against published TY2025 tables and worksheet arithmetic. The
[change ledger](./reference/2025/issue77-changes.json) preserves prior values and
calculation assumptions. A fixture's `reconciliation.source_limitations` are
reported as errors: matching a conditional expectation is not a passing result.
Source facts and eligibility gaps remain visible; historical `output.json` files
were not regenerated into expected values.
