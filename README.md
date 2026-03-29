# @filed/tax-engine

A type-safe, graph-based tax return computation engine for IRS Form 1040 (2025). Models tax filing as a directed acyclic graph (DAG) of pure computation nodes — each node transforms validated inputs into typed outputs that flow downstream.

## Architecture

Three-tier node hierarchy:

1. **Input nodes** — capture user-facing form data (W-2, 1099-s, schedules, general taxpayer info)
2. **Intermediate nodes** — perform form-specific calculations (worksheets, phase-outs, credits)
3. **Output nodes** — collect final computed values (Form 1040, Schedule 1)

Execution runs a topological sort over the DAG (Kahn's algorithm), then processes each node in order. Outputs accumulate in a pending dict with smart merging — multiple upstream sources for the same field are auto-merged into arrays.

## Quickstart

Requires [Deno](https://deno.land).

```bash
# Create a new return
deno task tax return create --year 2025
# { returnId: "abc-123" }

# Add a W-2
deno task tax form add --returnId abc-123 --node_type w2 \
  '{"box1_wages": 85000, "box2_fed_withheld": 12000}'

# Compute and view result
deno task tax return get --returnId abc-123

# Export as IRS MeF XML
deno task tax return export --returnId abc-123 --type mef > return.xml

# Visualize the dependency graph
deno task tax node graph --node_type w2 --depth 3
```

## CLI Commands

Run `deno task tax --help` for the full reference, or `deno task tax <command> --help` for a specific group.

### Returns

| Command | Description |
|---|---|
| `return create --year N` | Create a new return, returns UUID |
| `return get --returnId ID` | Execute the plan and print computed values |
| `return export --returnId ID --type mef` | Generate IRS MeF XML to stdout |

### Forms

| Command | Description |
|---|---|
| `form add --returnId ID --node_type TYPE 'JSON'` | Add an input (W-2, 1099, schedule, etc.) |

### Introspection

| Command | Description |
|---|---|
| `node list` | List all 58 registered nodes |
| `node inspect --node_type TYPE` | Show a node's input schema and output nodes |
| `node inspect --node_type TYPE --json` | Same, as structured JSON |
| `node graph --node_type TYPE [--depth N] [--json]` | Mermaid or JSON dependency graph |

```bash
# What fields does the W-2 node expect?
deno task tax node inspect --node_type w2

# What does the full graph look like from start?
deno task tax node graph --node_type start

# List every registered node
deno task tax node list
```

## Supported Input Nodes (2025)

| Node type | Form |
|---|---|
| `w2` | W-2 Wage & Tax Statement |
| `f1099int` | 1099-INT Interest Income |
| `f1099div` | 1099-DIV Dividends |
| `f1099nec` | 1099-NEC Non-Employee Compensation |
| `f1099g` | 1099-G Government Payments |
| `f1099b` | 1099-B Broker Proceeds |
| `f1099r` | 1099-R Pensions & Distributions |
| `f1099m` | 1099-MOD Mortgage Debt Cancellation |
| `f1099c` | 1099-C Cancellation of Debt |
| `f1099k` | 1099-K Payment Settlements |
| `f1098` | 1098 Mortgage Interest |
| `f2441` | Form 2441 Dependent Care |
| `f8812` | Form 8812 Child Tax Credit |
| `f8863` | Form 8863 Education Credits |
| `f8949` | Form 8949 Capital Gains/Losses |
| `schedule_a` | Schedule A Itemized Deductions |
| `schedule_c` | Schedule C Business Income |
| `schedule_e` | Schedule E Rental/Royalty |
| `f8949` (input) | Form 8949 Sales & Dispositions |
| `general` | Taxpayer identity & dependents |

## Export

MeF (Modernized e-File) XML export conforms to IRS 2025v5.2 schema. The builder assembles a `<Return>` with Form 1040 and Schedule 1 from computed pending values.

```bash
deno task tax return export --returnId abc-123 --type mef
```

## Development

```bash
# Run all tests
deno task test

# Run CLI tests only
deno task test:cli
```

### CLI structure

```
cli/
├── main.ts              # Entry point + command registry
├── commands/            # Command handlers + CLI framework types
│   ├── help.ts          # CommandDef types, printHelp
│   ├── form.ts          # form add
│   ├── graph.ts         # graph view
│   ├── node.ts          # node list, node inspect
│   ├── return.ts        # return create/get
│   └── export.ts        # return export
├── store/               # Persistence (return.json read/write)
│   ├── store.ts
│   └── types.ts
└── utils/               # Generic utilities
    └── zod-doc.ts       # Zod schema → human-readable text
```

### Adding a node

See `.claude/skills/e2e-build-node/` for the guided workflow, or `.claude/skills/implement-tax-node/` for the manual guide.

All nodes follow the same shape:

```
forms/f1040/nodes/inputs/<name>/
  index.ts        # Node class + singleton export
  index.test.ts   # Tests
```

Key conventions (see `CLAUDE.md` for full details):

- Define a Zod schema, infer types from it — never duplicate
- `compute()` is a pure function: no state, no mutations, no side effects
- Use `OutputNodes` for type-safe routing to downstream nodes
- Break logic into small named pure helpers, compose in `compute()`
