# Repository Structure

Public entrypoints are `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. See [repository organization](./repository-organization.md) for the responsibilities of each boundary.

```text
/
├── AGENTS.md / CLAUDE.md          # Agent instructions; each major folder has its own pair
├── mod.ts / catalog.ts            # Public API and supported form catalog
├── package.json / bun.lock        # Scripts and locked dependencies
├── cli/                           # The shipped `opentax` binary (entry cli/main.ts)
│   ├── commands/                  # Return, form, node and export operations
│   ├── store/                     # Return persistence and guarded carry archives
│   ├── utils/
│   └── network.ts                 # Fetch allowlist: the binary's only network path
├── core/
│   ├── runtime/                   # Execution, graph and source-document contracts
│   ├── types/                     # Shared node and form types
│   ├── validation/                # Business-rule engine
│   └── test-utils/
├── forms/f1040/
│   ├── FORM.md                    # The form: sources, schema version, how to add a year
│   ├── 2025/
│   │   ├── index.ts / config.ts   # Public year entrypoint and year constants
│   │   ├── inputs.ts / registry.ts # Stable input and node registration
│   │   ├── return-processing/     # The year's composite `start` input
│   │   ├── domains/               # Source reconciliation, fixtures and tests by tax concern
│   │   ├── mef/                   # Native MeF XML: builder, forms/ by tax domain, execution
│   │   └── pdf/
│   │       ├── forms/             # Printed form projections by tax domain
│   │       ├── reviews/           # Retained review fixtures and contracts
│   │       └── field-dumps/       # AcroForm field names of the IRS PDFs
│   ├── nodes/
│   │   ├── config/                # Tax-year constants and routing
│   │   ├── inputs/<section>/<group>/<form>/         # Validated source nodes
│   │   ├── intermediate/          # Aggregations, computed forms and worksheets
│   │   └── outputs/<section>/<group>/<form>/        # Final line assembly
│   ├── shared/                    # Helpers shared by nodes, MeF and PDF (whole dollars)
│   ├── mef/                       # Year-independent headers, filer and XML transport
│   ├── validation/rules/          # Business rules by domain; stable index and rule IDs
│   └── e2e/                       # Return contracts by domain; ATS scenarios together
├── benchmark/
│   ├── run_benchmark.ts           # Expected-output comparison against IRS ground truth
│   ├── run_case.ts                # Run one case and print the computed return
│   ├── check_cases.ts             # Case contract without running the engine
│   ├── cases/baseline.json        # Known-invalid cases, with reason and expiry
│   ├── cases/<form>/<year>/ledger.json # Every expected-value change, with its publication (created with the first change)
│   └── cases/<form>/<year>/<case>/ # Paired input.json and correct.json
├── docs/                          # Internal research for building the engine (not published)
│   ├── architecture/              # This map and repository organization
│   ├── ty2025/                    # Readiness, inventory, evidence by domain; ats/ correspondence
│   ├── ty2026/                    # Next-year source research and generated inventories
│   ├── guides/ / reference/       # Topic guides; Drake screen reference data
│   └── releases/                  # Release documents and smoke-test procedure
├── site/                          # Public static site, the only folder GitHub Pages publishes
├── skills/                        # Skills shipped to opentax users (see .claude-plugin/)
├── .claude/skills/                # Skills for building this repository (tax-build, tax-fix, ...)
├── scripts/
│   ├── testing/                   # Harness: structure, cases, oracle, sandbox, test runner
│   ├── research/                  # PDF review generation, source checks, TY2026 inventories
│   ├── maintenance/               # Rule generation and independent source oracles
│   ├── release/                   # Compiled binary smoke checks
│   ├── site/                      # Static site statistics
│   └── support/                   # File and process helpers for tests and scripts only
├── .state/                        # Private evidence and downloaded IRS schemas (mostly ignored)
└── .pdf-cache/                    # Downloaded IRS PDF cache (ignored)
```

Tax-facing boundaries use General, Income, Adjustments, Deductions, Credits, Taxes, and Payments. Business, retirement, investments, foreign and health are subgroups inside the relevant return section. Node inputs, intermediate forms/worksheets/aggregations and outputs retain their roles, with the same physical tax-section subfolders inside each role. Tests, fixtures and family research travel with their contracts. Runtime and tooling remain under separate role boundaries.

## Naming

- Node types: `f<number>` for a source-document input (`f1099int`,
  `f1116_review`), `form<number>` for a computed form (`form8959`),
  `schedule_<letter>` for a lettered schedule. The numbered `schedule1`,
  `schedule2`, `schedule3` and `schedule1a` keep their IRS names. A node type is
  also its registry key, its node folder and its CLI input name.
- Under `forms/`, file names and node folders are snake_case; section and group
  folders (`earned-income`, `rental-passthrough`) are kebab-case. Tests end in
  `.test.ts`, fixtures in `.fixture.ts` or `_fixture.json`.
- `cli/`, `core/` and `scripts/` use kebab-case file names.

## Structure contract

`bun run check:structure` enforces the node layout above and fails with the
expected path or the registration fix. Nodes are shared per form; a year owns
only config and wiring, so a `TaxNode` must live at
`forms/<form>/nodes/<inputs|intermediate|outputs>/[<aggregation|forms|worksheets>/]<section>/<group>/<name>/<file>.ts`.
The year's composite input, `forms/<form>/<year>/return-processing/start.ts`, is
wiring and stays with its year. Every node class on disk must be in a catalog
year's registry, keyed by its node type (the executor resolves
`registry[nodeType]`), and every registered node must be a CLI input or a
routing target.

Existing violations are listed in `scripts/testing/structure-baseline.json` with
a reason, an expiry date and an approver; the check fails only on new ones, on
expired entries, and on entries that no longer match anything.

## Rules and what enforces them

| Rule                                                        | Enforced by                                      |
| ----------------------------------------------------------- | ------------------------------------------------ |
| Nodes live in the canonical node tree                       | `scripts/testing/structure.ts` (placement)       |
| Registry keys are node types                                | `scripts/testing/structure.ts` (registry-key)    |
| Every node class is registered                              | `scripts/testing/structure.ts` (not-in-registry) |
| Every registered node is a CLI input or a routing target    | `scripts/testing/structure.ts` (unreachable)     |
| Benchmark cases are complete and expected values are finite | `benchmark/harness.ts`                           |
| Case inputs fit the node schema the CLI applies             | `benchmark/harness.ts` (`check:cases`)           |
| A cited source is a publication, never the engine           | `benchmark/harness.ts` (`check:cases`)           |
| Expected values change only with a cited ledger entry       | `scripts/testing/oracle.ts` (`check:oracle`)     |
| Unmapped expected lines fail instead of passing             | `benchmark/run_benchmark.ts`                     |
| Test modules are discovered exactly, never partially        | `scripts/testing/run.ts`                         |
| Every module resolves and type-checks strictly              | `scripts/testing/repository.ts` (`tsc`)          |
| The binary cannot spawn, load native code or open sockets   | `scripts/testing/sandbox.ts` (`check:sandbox`)   |
| The binary reaches only the IRS and GitHub over HTTPS       | `cli/network.ts`                                 |
| The checks above run on every pull request                  | `.github/workflows/test.yml`                     |

## Benchmark case formats

### input.json

```json
{
  "year": 2025,
  "scenario": "Human-readable description",
  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",
  "forms": [
    { "node_type": "start", "data": { "general": { "filing_status": "single" } } },
    { "node_type": "w2",    "data": { "box1_wages": 50000, "box2_fed_withheld": 6000 } }
  ]
}
```

### correct.json

```json
{
  "case": "NN-description",
  "scenario": "Human-readable description",
  "year": 2025,
  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",
  "correct": {
    "line11_agi": 50000,
    "line15_taxable_income": 35000,
    "line24_total_tax": 3962,
    "line33_total_payments": 5001,
    "line35a_refund": 1039,
    "line37_amount_owed": 0
  }
}
```

**Required** (benchmark pass/fail): `line24_total_tax`, `line35a_refund`, `line37_amount_owed`

**Optional** (shown for debugging): `line11_agi`, `line15_taxable_income`, `line33_total_payments`

Values must come directly from an IRS publication. The `source` field must cite the specific pub, exercise, and page. Never compute values.
