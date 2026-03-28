# Tax Engine

A professional-grade, IRS-compliant tax calculation engine for Form 1040 (tax year 2025). Built with Deno + TypeScript.

The CLI is the tax software — add forms, query inputs, validate, export. Any UI is a wrapper around CLI commands.

**North star:** Match the data entry depth of Drake Tax, as a composable open engine.

---

## Project Structure

```
tax/
├── engine/
│   ├── cli/                        # CLI commands (form, return, graph)
│   │   ├── commands/
│   │   └── store/
│   ├── core/
│   │   ├── runtime/                # Executor, graph traversal, planner
│   │   └── types/                  # TaxNode, NodeRegistry types
│   ├── nodes/
│   │   └── 2025/
│   │       ├── registry.ts         # Node registry for TY2025
│   │       └── f1040/
│   │           ├── start/          # Entry point node
│   │           ├── inputs/         # Data-entry screen nodes (one per Drake screen)
│   │           │   ├── screens.json          # Full Drake 1040 screen list (247 screens)
│   │           │   ├── W2/                   # Form W-2
│   │           │   │   ├── index.ts
│   │           │   │   ├── index.test.ts
│   │           │   │   └── research/
│   │           │   │       ├── context.md    # Full IRS research for coding agent
│   │           │   │       ├── scratchpad.md # Open questions, resolved answers
│   │           │   │       └── docs/         # Downloaded IRS PDFs
│   │           │   ├── INT/                  # Form 1099-INT
│   │           │   └── DIV/                  # Form 1099-DIV
│   │           ├── intermediate/   # Computed nodes (not inputs or outputs)
│   │           └── outputs/        # Line-level output nodes
│   │               └── line_01z/
│   ├── returns/                    # Persisted return data (JSON)
│   └── mod.ts
├── docs/
│   └── product.md                  # Architecture & product decisions
├── _scripts/                       # Temporary utility scripts
│   └── extract_screens.py          # Extracts screen codes from Drake KB HTML
└── agent/                          # AI agent integrations
```

---

## Node Layout Convention

Each node lives at `engine/nodes/{year}/f1040/{bucket}/{SCREEN_CODE}/`:

| Bucket | Purpose |
|--------|---------|
| `inputs/` | Data-entry screens — one per Drake screen code (W2, INT, DIV, …) |
| `intermediate/` | Computed nodes that don't map to a screen or final line |
| `outputs/` | Final form-line nodes (line_01z, line_02a, …) |
| `start/` | Entry-point node that bootstraps a return |

Each node folder contains:
```
{SCREEN_CODE}/
  index.ts          ← implementation
  index.test.ts     ← tests
  research/
    context.md      ← IRS research (handed to coding agent)
    scratchpad.md   ← open questions and resolved answers
    docs/           ← downloaded IRS PDFs
```

---

## Screen Codes

`engine/nodes/2025/f1040/inputs/screens.json` contains all 247 Drake 1040 screen codes extracted from the [Drake KB screen list](https://kb.drakesoftware.com/kb/Drake-Tax/20051.htm).

Each entry:
```json
{
  "form": "W-2",
  "description": "Wage and Tax Statement",
  "screen_code": "W2",
  "alias_screen_codes": ["W2 > Additional Entries"]
}
```

Use this file to resolve any screen name or form number to its canonical `screen_code`.

---

## Adding a New Screen

1. Find the screen code in `screens.json` (match by form name, screen code, or alias)
2. Run `/f1040-screen-researcher <screen_name_or_code>` — creates the `research/` folder and runs full IRS research
3. Implement `index.ts` using `research/context.md` as the spec

---

## CLI

```bash
# Create a new return
deno task cli return new

# Add a form
deno task cli form add <return-id> W2

# View the computation graph
deno task cli graph <return-id>
```

---

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Deno |
| Language | TypeScript |
| Test | `deno test` |
| Reference | Drake Tax (screen parity) |
| Tax authority | IRS publications (TY2025) |
