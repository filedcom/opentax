# Repository Structure

Public entrypoints are `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. See [repository organization](./repository-organization.md) for the responsibilities of each boundary.

```text
/
├── AGENTS.md                      # Agent instructions; CLAUDE.md includes it
├── mod.ts / catalog.ts            # Public API and supported form catalog
├── package.json / bun.lock         # Scripts and locked dependencies
├── cli/
│   ├── commands/                  # Return, form, node and export operations
│   ├── store/                     # Return persistence and guarded carry archives
│   ├── mef/                       # IRS MeF A2A client: SOAP, WS-Security, MTOM; test-only mock IRS
│   └── utils/
├── core/
│   ├── runtime/                   # Execution, graph and source-document contracts
│   ├── types/                     # Shared node and form types
│   ├── validation/                # Business-rule engine
│   └── test-utils/
├── forms/f1040/
│   ├── 2025/
│   │   ├── index.ts / config.ts    # Public year entrypoint and year constants
│   │   ├── inputs.ts / registry.ts # Stable input and node registration
│   │   ├── domains/               # Source reconciliation, fixtures and tests by tax concern
│   │   ├── mef/forms/             # Native projections by the same tax domains
│   │   └── pdf/
│   │       ├── forms/             # Printed form projections by tax domain
│   │       └── reviews/           # Retained review fixtures and contracts
│   ├── 2026/
│   │   └── index.ts / config.ts    # TY2026 entrypoint: 2025 graph, inputs and builders, 2026 context and schema version
│   ├── nodes/
│   │   ├── config/                # Tax-year routing
│   │   ├── inputs/<section>/<group>/<form>/         # Validated source nodes
│   │   ├── intermediate/          # Aggregations, computed forms and worksheets
│   │   └── outputs/<section>/<group>/<form>/        # Final line assembly
│   ├── mef/                       # Shared headers and transport contracts
│   ├── validation/rules/          # Domain groups; stable index and rule IDs
│   └── e2e/                       # Return contracts by domain; ATS scenarios together
├── docs/
│   ├── architecture/              # Internal design and repository navigation
│   ├── mef/ty2025/                # Readiness, inventory and source evidence by topic
│   ├── ty2026/                    # Source research by topic
│   ├── ats/                       # ATS preparation and correspondence drafts
│   └── index.html / build/        # Existing static documentation site
├── scripts/
│   ├── testing/                   # Harness: structure and oracle checks, test runner (see its README)
│   ├── research/                  # PDF review generation and source checks
│   ├── verification/              # Inventory verification
│   ├── maintenance/               # Independent source oracles
│   ├── release/                   # Compiled binary checks
│   └── site/                      # Static site statistics
├── benchmark/
│   ├── run_benchmark.ts           # Expected-output comparison against IRS ground truth
│   ├── check_cases.ts             # Case contract without running the engine
│   ├── cases/baseline.json        # Known-invalid cases, with reason and expiry
│   ├── cases/<form>/<year>/ledger.json # Every expected-value change, with its publication
│   └── cases/<form>/<year>/<case>/ # Paired input and expected files
├── .state/                        # Untracked skill state and private evidence
└── .pdf-cache/                    # Existing downloaded form cache
```

Tax-facing boundaries use General, Income, Adjustments, Deductions, Credits, Taxes, and Payments. Business, retirement, investments, foreign and health are subgroups inside the relevant return section. Node inputs, intermediate forms/worksheets/aggregations and outputs retain their roles, with the same physical tax-section subfolders inside each role. Tests, fixtures and family research travel with their contracts. Runtime and tooling remain under separate role boundaries.

## Structure contract

`bun run check:structure` enforces the node layout above and fails with the
expected path or the registration fix. Nodes are shared per form; a year owns
only config and wiring, so a `TaxNode` must live at
`forms/<form>/nodes/<inputs|intermediate|outputs>/[<aggregation|forms|worksheets>/]<section>/<group>/<name>/<file>.ts`.
Only module-level node classes count: a class declared inside a function (the
year's generated start node, a replay that substitutes one aggregator) is a
scoped override, not a graph node. Every node class on disk must be in a catalog
year's registry, keyed by its node type (the executor resolves
`registry[nodeType]`), and every registered node must be a CLI input or a
routing target.

A node's folder name is its node type, which is the public input name, so every
other role names a form the way its node does. The check fails on a folder in
`domains/`, `mef/forms/`, `pdf/forms/`, `e2e/` or `validation/rules/` whose name
is a shortened node name (`f1099n` for `f1099nec`), and on a MeF or PDF
projection outside its node's section and group. Domain and e2e folders follow
tax concern instead, so one source can rightly appear twice there (1099-NEC
income under `income/business`, its backup withholding under
`payments/withholding`). A module directly under `forms/<form>/` must serve
more than one tax section; one that serves a single section lives in it.

Existing violations are listed in `scripts/testing/structure-baseline.json` with
a reason, an expiry date and an approver; the check fails only on new ones, on
expired entries, and on entries that no longer match anything.

Every year runs the same nodes, so shared code (`forms/f1040/nodes/`, outside
`config/2025.ts`, `2026.ts` and `index.ts`, and the MeF, PDF, domain,
validation and return-processing code they feed) must read the year from
`ctx.taxYear` and `CONFIG_BY_YEAR[ctx.taxYear]`. The check fails on a
`CONFIG_BY_YEAR[2025]` index, a year comparison other than an onset gate
(`ctx.taxYear >= 2026`), a `year: 2025` value, `z.literal(2025)`, a date pattern
or string fixed to one year, and an identifier carrying a tax year
(`made_in_2026_for_2025`). Today's occurrences are counted per file and pattern
in `scripts/testing/year-pinned-baseline.json`; a count may only fall, and
`--shrink-year-baseline` records a fix.

## Rules and what enforces them

| Rule                                                        | Enforced by                                           |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| Nodes live in the canonical node tree                       | `scripts/testing/structure.ts` (placement)            |
| Registry keys are node types                                | `scripts/testing/structure.ts` (registry-key)         |
| Every node class is registered                              | `scripts/testing/structure.ts` (not-in-registry)      |
| Every registered node is a CLI input or a routing target    | `scripts/testing/structure.ts` (unreachable)          |
| Mirrors use the node's full name, never a shortened one     | `scripts/testing/structure.ts` (truncated-name)       |
| MeF and PDF projections sit with their node                 | `scripts/testing/structure.ts` (projection-placement) |
| A form-root module serves more than one tax section         | `scripts/testing/structure.ts` (root-module)          |
| Shared code never pins a tax year                           | `scripts/testing/year-pinned.ts` (`check:structure`)  |
| Benchmark cases are complete and expected values are finite | `benchmark/harness.ts`                                |
| Case inputs fit the node schema the CLI applies             | `benchmark/harness.ts` (`check:cases`)                |
| A cited source is a publication, never the engine           | `benchmark/harness.ts` (`check:cases`)                |
| Expected values change only with a cited ledger entry       | `scripts/testing/oracle.ts` (`check:oracle`)          |
| Unmapped expected lines fail instead of passing             | `benchmark/run_benchmark.ts`                          |
| Test modules are discovered exactly, never partially        | `scripts/testing/run.ts`                              |
| Every module resolves and type-checks strictly              | `scripts/testing/repository.ts` (`tsc`)               |
| The binary cannot spawn, load native code or open sockets   | `scripts/testing/sandbox.ts` (`check:sandbox`)        |
| Sample returns gain no new MeF blockers                     | `scripts/testing/mef.ts` (`check:mef`)                |
| The same samples run as TY2026 gain no new blockers         | `scripts/testing/mef.ts` (`check:ty2026`)             |
| Complete returns work end to end through the product CLI    | `scripts/testing/cli.ts` (`check:cli`)                |
| The binary reaches only the IRS and GitHub over HTTPS       | `cli/network.ts`                                      |
| The checks above run on every pull request                  | `.github/workflows/test.yml`                          |

## Benchmark case formats

### input.json

```json
{
  "year": 2025,
  "scenario": "Human-readable description",
  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",
  "forms": [
    {
      "node_type": "start",
      "data": { "general": { "filing_status": "single" } }
    },
    {
      "node_type": "w2",
      "data": { "box1_wages": 50000, "box2_fed_withheld": 6000 }
    }
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
