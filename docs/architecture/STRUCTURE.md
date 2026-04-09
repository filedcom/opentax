# Repository Structure

> Single source of truth for folder layout. Update this file when anything moves.

```
/
├── CLAUDE.md                   # Coding conventions — read before touching any node
├── STRUCTURE.md                # ← you are here
├── mod.ts                      # Public API entry point
├── catalog.ts                  # Node registry (all registered nodes)
├── deno.json                   # Tasks, imports, compiler options
│
├── cli/                        # CLI entry point + command handlers
│   ├── main.ts
│   ├── commands/               # return, form, node subcommands
│   ├── store/                  # Return persistence (JSON store)
│   └── utils/
│
├── core/                       # Engine runtime — not form-specific
│   ├── runtime/                # Node execution, graph traversal, dependency resolution
│   ├── types/                  # Shared types (NodeOutput, TaxNode, etc.)
│   ├── validation/             # MeF business rule runner
│   └── test-utils/             # Helpers for node unit tests
│
├── forms/
│   └── f1040/                  # Form 1040 (TY2025)
│       ├── 2025/               # Year-specific constants (brackets, limits, phaseouts)
│       │   └── config.ts
│       ├── nodes/
│       │   ├── config/         # Year router — maps year → config object
│       │   ├── inputs/         # 130+ input nodes (one dir per form/schedule)
│       │   │   └── <name>/
│       │   │       ├── index.ts        # Node class + singleton export
│       │   │       └── index.test.ts   # Unit tests
│       │   ├── intermediate/
│       │   │   ├── aggregation/        # AGI aggregator, total tax assembler, etc.
│       │   │   ├── forms/              # Computed forms (8959, 8960, 4137, etc.)
│       │   │   └── worksheets/         # QDCG, EITC, CTC, SSA taxability, etc.
│       │   └── outputs/
│       │       ├── f1040/              # Final 1040 line computations
│       │       └── schedule1/          # Schedule 1 aggregation
│       ├── mef/                # IRS MeF XML export
│       └── validation/         # Form 1040 MeF business rules
│
├── docs/
│   ├── architecture/           # Internal dev docs (not published)
│   │   ├── STRUCTURE.md        # ← you are here
│   │   └── product.md          # Architecture & research plan
│   └── mintlify/               # Public docs site (Mintlify)
│       ├── docs.json           # Nav config — update when adding/removing pages
│       ├── architecture/       # Published architecture pages
│       ├── cli/
│       ├── getting-started/
│       ├── input-nodes/
│       └── use-with-ai/
│
├── scripts/                    # Dev utilities (not part of engine)
│
├── benchmark/               # Accuracy benchmark — see benchmark/README.md
│   ├── README.md
│   ├── run_benchmark.ts        # Run all cases, compare to correct.json
│   ├── run_case.ts             # Run one case, save output.json
│   ├── run_all.ts              # Bulk regenerate output.json
│   └── cases/
│       └── {form}/             # e.g. f1040, f1120
│           └── {year}/         # e.g. 2025
│               └── NN-description/
│                   ├── input.json      # Engine inputs: forms array the CLI accepts
│                   ├── correct.json    # IRS-authoritative correct values + source citation
│                   └── output.json     # Last engine output (not committed)
│
└── .state/                     # Runtime state — gitignored except where noted
    ├── bench/                  # Benchmark harness state (tracked)
    │   ├── state.json          # Active task: pass/fail counts, root causes, phase
    │   ├── progress.md         # Append-only run log
    │   └── irs-cases-raw.json  # Scratch file written by /tax-cases sourcer agent
    ├── field-dumps/            # IRS PDF field extracts (tracked)
    ├── pdf-cache/              # Downloaded IRS PDFs (not committed)
    ├── research/               # Research scratch files (not committed)
    └── returns/                # CLI tax returns (not committed)
```

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
