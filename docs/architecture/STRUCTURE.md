# Repository Structure

Public entrypoints are `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. See [repository organization](./repository-organization.md) for the responsibilities of each boundary.

```text
/
├── CLAUDE.md                      # Coding conventions
├── mod.ts / catalog.ts            # Public API and supported form catalog
├── deno.json / deno.lock           # Typed tasks and locked dependencies
├── cli/
│   ├── commands/                  # Return, form, node and export operations
│   ├── store/                     # Return persistence and guarded carry archives
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
│   ├── ats/ / releases/           # ATS correspondence drafts and release documents
│   └── index.html / build/        # Existing static documentation site
├── scripts/
│   ├── testing/                   # Typed validation harness and negative contracts
│   ├── research/                  # PDF review generation and source checks
│   ├── verification/              # Inventory verification
│   ├── maintenance/               # Rule generation and independent source oracles
│   ├── release/                   # Compiled binary checks
│   └── site/                      # Static site statistics
├── benchmark/
│   ├── run_benchmark.ts           # Archived expected-output comparison
│   ├── run_case.ts / run_all.ts   # Individual and bulk case execution
│   └── cases/<form>/<year>/<case>/ # Paired input, expected and retained output files
├── .state/                        # Existing state and retained private evidence
└── .pdf-cache/                    # Existing downloaded form cache
```

Tax-facing boundaries use General, Income, Adjustments, Deductions, Credits, Taxes, and Payments. Business, retirement, investments, foreign and health are subgroups inside the relevant return section. Node inputs, intermediate forms/worksheets/aggregations and outputs retain their roles, with the same physical tax-section subfolders inside each role. Tests, fixtures and family research travel with their contracts. Runtime and tooling remain under separate role boundaries.

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
