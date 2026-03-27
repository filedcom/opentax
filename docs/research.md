# Tax Engine — Research & Architecture Plan

> Last updated: 2026-03-26 (architecture revised: unified TaxNode + activation model)
> Team: Atul + Claude
> Stack: Deno + TypeScript + Vibes SDK

---

## 1. Project Overview

A professional-grade, IRS-compliant tax calculation engine starting with Form 1040 (tax year 2025). The CLI *is* the tax software — add forms, query inputs by ID, validate, export. Any UI built on top is just a wrapper around CLI commands. Designed to be self-updating as new IRS publications are released each year, extensible to 1120, 1120S, 1065, and state returns.

**North star:** Match the data entry depth of professional tax software like Drake Tax, but as a composable, open engine.

**Reference:** [Drake Tax Knowledge Base — Form & EF Availability](https://kb.drakesoftware.com/kb/Drake-Tax/18318.htm)
**Agent SDK:** [Vibes SDK](https://vibes-sdk.a7ul.com/) — model-agnostic, type-safe, built on Vercel AI SDK

---

## 2. Key Decisions (from discovery)

| Decision | Choice | Rationale |
|---|---|---|
| Primary users | Tax professionals | Professional-grade depth required |
| Tax year | 2025 (multi-year architecture) | Current year first, prior years addable |
| E-filing | Export valid MeF XML (Option B) | Clearinghouse handles transmission, avoids IRS EFIN requirement |
| Runtime | Headless CLI library | Integrators build UI on top |
| Persistence | File-based (return directory) | Document-shaped data, no DB daemon needed |
| Taxpayer identity | SSN/EIN only | Caller owns identity management |
| Validation | Two-tier (hard block for MeF violations, warnings for inconsistencies) | Matches Drake/ProSeries behavior |
| Node model | Single TaxNode type (unified) | Field + connector distinction was unnecessary; all nodes have inputSchema + compute |
| Execution model | Two-phase topo sort + pending accumulator | Phase 1: expand instances + topo sort; Phase 2: execute in order, nodes deposit into pending dict — optional forms simply never receive inputs and are skipped |
| Graph traversal | compute_tax_graph(nodeType, depth) | Static metadata traversal independent of execution, any depth |
| Self-update | CLI-driven ingestion engine | On-demand, human-in-the-loop before merge |
| Ingestion intelligence | Hybrid LLM + human review | LLM extracts, human reviews diff, full source traceability |
| PDF export | Official IRS AcroForm PDF + branding/watermark overlay | Professional standard |
| State returns | First-class architecture, not implemented yet | Future phase |
| LLM layer | Vibes SDK (model-agnostic) | Type-safe, pluggable across 50+ providers |
| Testing | IRS examples + spot checks + real returns, extensible | D-level rigor from day one |
| Timeline | October 2026 (extended deadline) / April 2027 (filing season) | 6-9 months with two-person team |

---

## 3. Core Architecture: Unified TaxNode + Activation Model

The entire tax engine is expressed as **one primitive**: `TaxNode`.

> **Design decision:** Field nodes and connector nodes were unified into a single type. A node is just three things: `id`, `inputSchema` (Zod), `outputNodeTypes`. Everything else (IRS citations, descriptions, change history) lives in `context.md`.

### TaxNode

Abstract base class — every node extends it. TypeScript enforces the contract at compile time.

```typescript
// core/types/tax-node.ts
abstract class TaxNode<TSchema extends z.ZodTypeAny> {
  abstract readonly nodeType: string
  abstract readonly inputSchema: TSchema
  abstract readonly outputNodeTypes: NodeType[]
  abstract compute(input: z.infer<TSchema>): NodeResult
}

// What a node passes to a downstream node
type NodeOutput = {
  nodeType: NodeType
  input: Record<string, unknown>
}

// What compute() returns — purely where to send results next
type NodeResult = {
  outputs: NodeOutput[]
}
```

### Dispatch (Engine's Job)

`dispatch` is owned by the engine. Nodes never call each other directly — they return `outputs` and the engine dispatches each one.

```typescript
// core/runtime/executor.ts
// Phase 1: build ordered execution plan from inputs.json
const plan = buildExecutionPlan(inputs)   // expand instances + topo sort

// Phase 2: execute in order
const pending: Record<string, Record<string, unknown>> = {}

for (const instance of plan) {
  const node = registry[instance.nodeType]
  const parsed = node.inputSchema.safeParse(pending[instance.id] ?? {})
  if (!parsed.success) continue            // optional node — no inputs arrived, skip
  const result = node.compute(parsed.data)
  for (const output of result.outputs) {
    merge(pending, output.nodeType, output.input)  // array fields append, scalars set
  }
}
```

The node declares `inputSchema`. The engine fetches, validates, and forwards — nodes never touch the registry or each other.

### Each Node is a Self-Contained Mini-Program

```
nodes/
  2025/
    lines/
      line_15_taxable_income/
        index.ts          ← TaxNode definition (id + inputSchema + outputNodeTypes + compute)
        index.test.ts     ← IRS fixture tests (written BEFORE index.ts)
        context.md        ← IRS citation, change history (ingestion target)
```

Example node:

```typescript
// nodes/2025/lines/line_15_taxable_income/index.ts
const inputSchema = z.object({
  agi: z.number(),
  deduction_amount: z.number(),
})

export class Line15TaxableIncome extends TaxNode<typeof inputSchema, number> {
  readonly nodeType = 'line_15_taxable_income'
  readonly inputSchema = inputSchema
  readonly outputNodeTypes = ['line_16_tax']

  compute(input: z.infer<typeof inputSchema>) {
    const taxable_income = Math.max(0, input.agi - input.deduction_amount)
    return {
      outputs: [{ nodeType: 'line_16_tax', input: { taxable_income } }],
    }
  }
}
```

### Start Node (Entry Point + Dispatcher)

A special TaxNode whose input is the raw return data. Its `compute` decides which first-wave nodes to activate based on what forms are present. Optional forms are handled by simply not activating them — no zero-propagation through unused nodes.

```typescript
// forms/start/2025/index.ts
const inputSchema = z.object({
  w2s: z.array(W2Schema).optional(),
  scheduleC: ScheduleCSchema.optional(),
  interest1099: z.array(Interest1099Schema).optional(),
  // ...
})

export class StartNode extends TaxNode<typeof inputSchema, null> {
  readonly nodeType = 'start'
  readonly inputSchema = inputSchema
  readonly outputNodeTypes = ['w2', 'schedule_b', 'schedule_c', 'schedule_d', ...]

  compute(input: z.infer<typeof inputSchema>) {
    const outputs: NodeOutput[] = []
    // each W-2 dispatches the w2 node separately
    input.w2s?.forEach((w2) => outputs.push({ nodeType: 'w2', input: { w2 } }))
    if (input.scheduleC)     outputs.push({ nodeType: 'schedule_c', input: input.scheduleC })
    if (input.interest1099)  outputs.push({ nodeType: 'schedule_b', input: { interest: input.interest1099 } })
    // ...
    return { value: null, outputs }
  }
}
```

### Executor: Two-Phase, Stateless

The engine is fully stateless. Only `inputs.json` is persisted. Any recompute replays from stored inputs.

**Phase 1 — Build execution plan (from inputs.json)**

Expand instances from inputs, build the instance graph, topological sort:

```
inputs.json: { w2s: [w2_01, w2_02], int1099s: [int_01, int_02, int_03] }

instance graph:
  start → w2_01 → line_01z
  start → w2_02 → line_01z
  start → int_01 → schedule_b
  start → int_02 → schedule_b
  start → int_03 → schedule_b
  line_01z → line_11_agi
  schedule_b → line_11_agi
  ...

topo sort → [ start, w2_01, w2_02, int_01, int_02, int_03, line_01z, schedule_b, line_11_agi, ... ]
```

**Phase 2 — Execute in order**

```
pending: Record<instanceId, Record<string, unknown>> = {}

for each instance in topo order:
  node = registry[instance.nodeType]
  input = pending[instance.id]              // fully assembled by this point
  result = node.compute(input)
  for each output in result.outputs:
    merge(pending[output.nodeType], output.input)   // array fields append, scalar fields set
```

Each node fires exactly once. By the time a node fires, all upstream nodes have already deposited into `pending`. No waiting, no readiness checks — topo sort guarantees it.

**Array accumulation example (2 W-2s, 3 1099-INTs):**

```
TOPO ORDER:  start → w2_01 → w2_02 → int_01 → int_02 → int_03 → line_01z → schedule_b → line_11_agi

                        pending dict after each step
                 ┌─────────────────────────────────────────────────────────────┐
step 1  start    │ w2_01:{box1:85000}  w2_02:{box1:45000}                      │
                 │ int_01:{amt:320}    int_02:{amt:150}    int_03:{amt:500}     │
                 └─────────────────────────────────────────────────────────────┘
                          │deposits                │deposits
                          ▼                        ▼
step 2  w2_01    │ line_01z:{ wages:[85000] }                                  │
step 3  w2_02    │ line_01z:{ wages:[85000, 45000] }          ← appended       │

step 4  int_01   │ schedule_b:{ interest:[320] }                               │
step 5  int_02   │ schedule_b:{ interest:[320, 150] }         ← appended       │
step 6  int_03   │ schedule_b:{ interest:[320, 150, 500] }    ← appended       │

                 └─────────────────────────────────────────────────────────────┘
                   pending fully assembled — now the aggregator nodes fire:

step 7  line_01z   reads pending → { wages:[85000, 45000] }
                   computes → total_wages: 130000
                   deposits → line_11_agi:{ wages:130000 }

step 8  schedule_b reads pending → { interest:[320, 150, 500] }
                   computes → total_interest: 970
                   deposits → line_11_agi:{ interest:970 }

step 9  line_11_agi reads pending → { wages:130000, interest:970, ... }
                   computes → agi: 130970
```

Key: a node only fires when it reaches its position in topo order. By that point every upstream node has already deposited — the input is guaranteed complete. Optional nodes (e.g. `schedule_c` when no business income) never receive any deposits, so their Zod parse fails and they are silently skipped.

### Static Graph Traversal

Independent of execution — uses only `outputNodeIds`. Can be called at any time, any depth.

```typescript
// core/runtime/graph.ts
function compute_tax_graph(nodeType: NodeType, maxDepth = Infinity): GraphNode

type GraphNode = {
  nodeType: NodeType
  depth: number
  children: GraphNode[]
}
```

Use cases:
- `compute_tax_graph('start')` → full 1040 DAG (documentation, visualization)
- `compute_tax_graph('schedule_c', 3)` → Schedule C's 3-level downstream neighborhood
- Detect unreachable nodes (in registry but not reachable from `start`)

### Edge Cases: Cycles and Near-Cycles

The IRS has resolved every apparent cycle through worksheets and defined computation order. No true cycles exist in 1040 computation. Three near-cycles to be aware of:

**1. QBI Deduction (Section 199A) — apparent cycle, IRS-broken**
```
QBI deduction limit → requires taxable income
taxable income      → includes QBI deduction   ← looks circular
```
IRS fix: compute taxable income *before* QBI deduction to determine the limit. Two nodes in sequence, no cycle.

**2. SE Health Insurance + SE Tax — genuine iterative (one node handles it)**
```
SE health insurance deduction → net SE income → SE tax → ½ SE tax deduction → health insurance limit
```
IRS Publication 535 provides an iterative worksheet. This stays inside one node's `compute()` as an internal loop — not a graph-level cycle.

**3. IRA Deduction Phase-out — apparent cycle, IRS-broken**
```
IRA deduction reduces MAGI → MAGI determines allowed IRA deduction   ← looks circular
```
IRS fix: compute MAGI *without* IRA deduction first, determine allowed amount, then apply. Two nodes in sequence.

**Other edge cases handled by the model:**
- NOL / capital loss carryforwards → prior year data, treated as inputs
- Kiddie tax (Form 8615) → parent return data passed in as input
- Passive Activity Loss rules → all K-1/Schedule E instances complete before PAL node fires (topo sort)
- Multiple Schedule C entities → separate instances, each feeds Schedule SE independently

---

## 4. Filesystem Structure

Two separate Deno workspace packages — same repo, separate CLIs.

```
/tax/
  deno.json                  ← workspace root: { "workspace": ["engine", "agent"] }

  engine/                    ← @filed/tax-engine — the tax computation engine
    deno.json                ← { "name": "@filed/tax-engine", "exports": "./mod.ts" }
    cli.ts                   ← CLI entry: `tax` command
    mod.ts                   ← public API for programmatic use
    core/
      runtime/
        planner.ts           ← phase 1: expand instances + topological sort
        executor.ts          ← phase 2: execute plan in order
        validator.ts         ← two-tier validation engine
      types/
        tax-node.ts          ← TaxNode abstract class, NodeResult, NodeOutput
      return.ts              ← TaxReturn, ReturnComputed, ValidationMessage
    registry.ts              ← assembles all nodes into NodeRegistry

    nodes/                   ← all TaxNode implementations
                             ← each node dir: index.ts + index.test.ts + context.md + node.lock
      2025/                  ← year is top-level; copy entire dir to add a new tax year
        start/
        source-docs/         ← taxpayer source documents (W-2, 1099s, K-1s)
          w2/
          w2_g/
          1099_int/
          1099_div/
          1099_b/
          1099_r/
          1099_misc/
          1099_nec/
          k1/
          ...
        schedules/           ← lettered schedules (A, B, C, D, E, SE)
          schedule_a/
          schedule_b/
          schedule_c/
          schedule_d/
          schedule_e/
          schedule_se/
          ...
        additional/          ← numbered additional schedules (1, 2, 3)
          schedule_1/
          schedule_2/
          schedule_3/
          ...
        forms/               ← supplemental forms + credits (8812, 2441, 8863, etc.)
          8812_ctc/
          2441_dependent_care/
          8863_education/
          8949_capital_assets/
          4562_depreciation/
          6251_amt/
          ...
        worksheets/          ← computation-only worksheets, not filed (QDCGT, SS benefits, etc.)
          qualified_dividends_cgt/
          social_security_benefits/
          child_tax_credit/
          ...
        lines/               ← core 1040 line nodes
          line_01z_wages/
          line_11_agi/
          line_15_taxable_income/
          line_16_tax/
          line_24_total_tax/
          line_37_refund/
          line_38_owed/
          ...
        constants/
          tax_brackets.ts
          standard_deductions.ts
          phase_out_thresholds.ts
          amt_exemptions.ts

    export/
      pdf/
        acroform-filler.ts
        watermark.ts
      mef-xml/
        schema/2025/
        builder.ts
        validator.ts

    returns/                 ← file-based return storage (outside engine package)
      {returnId}/
        meta.json
        inputs.json          ← only persisted state — full recompute by replaying this

  agent/                     ← @filed/tax-agent — AI ingestion agent
    deno.json                ← { "name": "@filed/tax-agent" }
    cli.ts                   ← CLI entry: `tax-agent` command
    agents/
      document-parser.ts     ← Vibes agent: PDF/URL → structured changes
      node-mapper.ts         ← Vibes agent: changes → affected node IDs
      context-writer.ts      ← Vibes agent: updates context.md + citations
      codegen.ts             ← Vibes agent: context.md → index.ts
      testgen.ts             ← Vibes agent: context.md → index.test.ts
    sources.json             ← prebuilt IRS document source list
    runs/
      2026-03-26_rev-proc-2025-40/
        input.pdf
        extracted_changes.json
        affected_nodes.json
        diff.patch
        review.md
```

---

## 5. Return Lifecycle (CLI Flow)

```bash
# 1. Create a return
tax return create --ssn 123-45-6789 --year 2025
# → creates returns/ret_abc123/meta.json + empty inputs.json

# 2. Add form data — must be a complete, valid node input (no partial fields)
tax form add --returnId ret_abc123 --node_type w2 '{"box1": 85000, "box2": 12000, "box12": [...]}'
tax form add --returnId ret_abc123 --node_type schedule_c '{"gross_receipts": 45000, "expenses": {...}}'
tax form add --returnId ret_abc123 --node_type 1099_int '{"payer": "Chase", "amount": 320}'

# 3. Get current computed state at any time (re-runs engine from inputs.json)
tax return get --returnId ret_abc123
# → JSON: all computed lines, AGI, taxable income, tax owed, refund

# 4. Validate before export
tax validate --returnId ret_abc123
# → warnings: [...], errors: [...], mef_blocks: [...]

# 5. Export
tax export --returnId ret_abc123 --format pdf --output ./returns/
tax export --returnId ret_abc123 --format mef-xml --output ./efile/
```

### Input Management Rules

```
add-form flow:
  1. Load inputs.json
  2. Validate new input against node's inputSchema (must be complete — no partial fields)
     FAIL → error: "W2 input missing required field: box1"
  3. Merge into inputs.json:
     - Array types (W2, 1099-INT, etc.) → append
     - Singular types (ScheduleC, filing status) → conflict if already exists
  4. Conflict → error with action options:
     "ScheduleC already exists. Use --replace to overwrite or remove it first."
  5. Clean → save inputs.json, re-run engine
```

**Key rule:** You must submit a fully complete node input in one call. Partial fields are rejected. This keeps `inputs.json` always valid and the engine always replayable.

Each added input gets a stable `id` assigned on insert. Array-type inputs (W-2, 1099s, K-1s) are addressable by ID — retrieve, replace, or delete individually:

```bash
tax form list --returnId ret_abc123 --node_type w2              # list all W-2s with their ids
tax form list --returnId ret_abc123 --node_type w2 --node_id w2_01  # retrieve a specific W-2
tax form remove --returnId ret_abc123 --node_type w2 --node_id w2_01
tax form replace --returnId ret_abc123 --node_type w2 --node_id w2_01 '{"box1": 90000, ...}'
```

---

## 6. Two-Tier Validation

```
Tier 1 — MeF Business Rules (HARD BLOCK)
  Cannot export until resolved.
  Examples:
  - Missing required SSN
  - Invalid filing status for claimed credit
  - MeF schema violation

Tier 2 — Data Inconsistency Warnings (SOFT)
  Can export but flagged.
  Examples:
  - Claimed deduction near suspicious threshold
  - Large Schedule C loss with W-2 income
  - Missing supporting form for claimed credit
```

---

## 7. Ingestion Engine (Self-Updating Pipeline)

### Sources List (`ingestion/sources.json`)
```json
{
  "annual": [
    {
      "id": "rev-proc-inflation",
      "description": "Annual inflation adjustments (brackets, standard deductions)",
      "url": "https://www.irs.gov/pub/irs-drop/rp-{year}.pdf",
      "affects": ["constants/{year}/tax_brackets", "constants/{year}/standard_deductions"]
    },
    {
      "id": "mef-schema",
      "description": "MeF XML schema package for e-filing",
      "url": "https://www.irs.gov/e-file-providers/...",
      "affects": ["export/mef-xml/schema/{year}"]
    }
  ],
  "custom": []
}
```

### CLI (`tax-agent`)
```bash
# Ingest a known source
tax-agent ingest --source rev-proc-inflation --year 2026

# Ingest a custom document
tax-agent ingest --doc ./path/to/new-irs-notice.pdf
tax-agent ingest --url https://irs.gov/pub/irs-drop/rp-2026-xx.pdf

# Review what the last ingestion wants to change
tax-agent review-run --id last

# Run codegen on affected nodes after reviewing
tax-agent build-node --run last
```

### Ingestion Agent Pipeline (Vibes SDK)

Two explicit stages with a human review gate between them.

**Stage 1 — Ingest (`tax-agent ingest`): context.md only, no code**

```
DocumentParserAgent
  → reads PDF/URL
  → extracts structured changes: [{ field, old_value, new_value, page_ref }]
  → output: extracted_changes.json

NodeMapperAgent
  → reads extracted_changes.json
  → determines CRUD operation per affected node:
      CREATE → scaffold new node directory + context.md
      UPDATE → update context.md (computation, inputs, outputs, sources, change history)
      DELETE → flag node for removal (human confirms)
  → output: affected_nodes.json

ContextWriterAgent (per affected node, parallelised)
  → CREATE: writes full context.md from scratch
  → UPDATE: patches relevant sections, appends to Sources + Change History
  → no index.ts touched — context.md is the only output
```

**[HUMAN REVIEWS context.md DIFFS HERE]**

Human sees plain-English changes to computation descriptions, input/output wiring, and IRS citations — not code. Much easier to review.

**Stage 2 — Codegen (`tax-agent build-node`): parallel coding agents**

```
For each affected node (in parallel):
  CodingAgent
    → reads node's context.md
    → writes/overwrites index.test.ts  (IRS example fixtures from context.md) ← FIRST
    → writes/overwrites index.ts  (TaxNode class: inputSchema + outputNodeIds + compute) ← SECOND
```

**Key rule:** Tests are always written before implementation code. `index.test.ts` is generated from `context.md` first — fixtures derived from IRS examples and expected outputs. `index.ts` is written second, with the tests as the specification. This enforces TDD even in the automated codegen pipeline.

**[HUMAN REVIEWS + MERGES CODE]**

**Key rule:** Ingestion never touches code. Codegen never touches context.md. `context.md` is the contract between the two stages and the human review gate.

### node.lock

Every node directory has a `node.lock` file storing MD5 hashes of both files:

```json
{
  "context_md": "a3f4b2c1d5e6f7a8b9c0d1e2f3a4b5c6",
  "index_ts":   "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
}
```

To check what needs attention, compute current MD5s and diff against lock:

| context.md hash | index.ts hash | State |
|---|---|---|
| matches lock | matches lock | in sync ✓ |
| changed | matches lock | context updated, codegen not run yet |
| matches lock | changed | manual code edit — drifted from context |
| both changed | both changed | full update in progress |

```bash
tax-agent status           # show sync state of all nodes
tax-agent status --drift   # show only nodes where code has drifted from context
```

`node.lock` is updated by `tax-agent build-node` after codegen completes — sealing both hashes at the point of a known-good sync.

### Traceability (context.md structure)
```markdown
# line_15_taxable_income

## Computation
Taxable income = max(0, AGI - greater of standard or itemized deduction)

## Inputs
- `agi` ← line_11_agi output
- `deduction_amount` ← deduction_selector output

## Output
- `taxable_income` → line_16_tax input

## Sources
Full provenance of every document that informed this node:

| Ingested | Document | Section / Page | URL / Path | Run ID |
|----------|----------|----------------|------------|--------|
| 2026-03-26 | Form 1040 (2025) Instructions | Line 15, p.33 | https://irs.gov/pub/irs-pdf/i1040gi.pdf | run_init |
| 2026-03-26 | Rev. Proc. 2025-40 | Section 3.10, p.4 | https://irs.gov/pub/irs-drop/rp-25-40.pdf | run_init |

## Change History
Every mutation to this node, with the source that caused it:

| Date | Change | Source Document | Section | Run ID |
|------|--------|----------------|---------|--------|
| 2026-03-26 | Initial node created | Form 1040 (2025) Instructions | Line 15, p.33 | run_init |
| 2026-03-26 | Standard deduction MFJ updated to $30,000 | Rev. Proc. 2025-40 | Section 3.10, p.4 | run_abc |
```

**Rule:** A node's context.md is the single source of truth for why it computes what it computes. Every source read during ingestion — whether it changed the node or just confirmed it — is recorded with date, document name, section, URL/path, and run ID.

---

## 8. Project Identity

| | Engine | Agent |
|---|---|---|
| CLI command | `tax` | `tax-agent` |
| Deno package | `@filed/tax-engine` | `@filed/tax-agent` |
| Package path | `engine/` | `agent/` |
| Repo | `/Users/atul/Projects/filed/tax` | same repo |
| Workspace root | `deno.json` | — |
| Research doc | `research.md` (this file) | — |

---

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Deno |
| Language | TypeScript (strict) |
| Agent framework | Vibes SDK (vibes-sdk.a7ul.com) |
| LLM | Claude (default, swappable via Vibes) |
| Validation | Zod |
| PDF manipulation | pdf-lib (AcroForm filling) + custom watermark layer |
| MeF XML | Native DOM/XML builder, validated against IRS XSD schemas |
| Testing | Deno test + Vibes TestModel for agent unit tests |
| Observability | OpenTelemetry (via Vibes SDK) |
| Storage | File-based (JSON files per return) |

---

## 9. 1040 Form Coverage (Tax Year 2025)

### Input Forms (data entry nodes)
- W-2 (wages, multiple employers)
- W-2G (gambling winnings)
- 1099-INT (interest income)
- 1099-DIV (dividends)
- 1099-B (capital gains/broker)
- 1099-R (retirement distributions)
- 1099-MISC / 1099-NEC (miscellaneous / nonemployee compensation)
- 1099-G (government payments, unemployment)
- 1099-SSA (Social Security benefits)
- Schedule K-1 (1065, 1120S, 1041)
- 1098 (mortgage interest)
- 1098-E (student loan interest)
- 1098-T (tuition)

### Schedules
- Schedule A — Itemized deductions
- Schedule B — Interest and ordinary dividends
- Schedule C — Profit/loss from business (sole proprietorship)
- Schedule D — Capital gains and losses
- Schedule E — Supplemental income (rental, S-corp, partnership, trust)
- Schedule SE — Self-employment tax
- Schedule 1 — Additional income and adjustments
- Schedule 2 — Additional taxes
- Schedule 3 — Additional credits and payments

### Key Forms
- Form 8812 — Child tax credit / additional child tax credit
- Form 2441 — Child and dependent care expenses
- Form 8863 — Education credits
- Form 8949 — Sales and other dispositions of capital assets
- Form 4562 — Depreciation and amortization
- Form 6251 — Alternative minimum tax
- Form 1040-ES — Estimated tax
- Form 4868 — Extension
- Form 1040-X — Amended return (future phase)
- Form 1040-NR — Nonresident alien (future phase)

---

## 10. MeF XML Export

The IRS publishes MeF schema packages annually:
- XSD schemas defining valid XML structure
- Business rules (thousands of validation conditions)
- Publication 4164 — MeF Guide for Software Developers and Transmitters

**Our approach:**
1. Build MeF XML from computed return state
2. Validate against IRS XSD schemas locally
3. Run IRS business rules (Tier 1 validation)
4. Export clean XML — caller submits via authorized clearinghouse
5. Ingestion engine updates schema yearly

---

## 11. PDF Export

**Approach:** Fill official IRS AcroForm PDF fields, then apply branding overlay.

```
computed_return.json
  → AcroForm filler (pdf-lib)
    → maps computed values to PDF field names
    → fills all form fields
  → Watermark/branding layer
    → "DRAFT" watermark (optional)
    → firm name / logo in designated areas
    → "Prepared by [Firm]" footer
  → output: completed_1040_2025.pdf
```

IRS AcroForm field names are stable year-to-year (mostly). The mapping is a mini-program node like everything else, updateable via ingestion.

---

## 12. Multi-Year Architecture

Each year is a versioned namespace:

```
forms/form_1040/line_15_taxable_income/
  2025/         ← implemented
  2026/         ← added by ingestion + codegen
  2027/         ← added by ingestion + codegen

constants/
  2025/
  2026/
```

The runtime engine accepts a `year` parameter and resolves all nodes to that year's namespace. A return created with `year: 2025` always uses 2025 nodes, even if 2026 nodes exist.

Adding a new year:
```bash
tax ingest --source all --year 2026    # ingest all annual IRS publications for 2026
tax build-node --run last              # regenerate changed nodes
# → only nodes where 2026 differs from 2025 get new files
# → unchanged nodes copy-reference 2025 (or symlink)
```

---

## 13. Testing Strategy

### Level 1 — IRS Published Examples (baseline, automated)
IRS embeds worked examples in instructions (Qualified Dividends worksheet, etc.). These become test fixtures in `index.test.ts`.

### Level 2 — Spot Check Scenarios (manual → automated)
Known return scenarios verified against Drake Tax / TurboTax output:
- Single filer, $60k W-2, standard deduction
- MFJ, W-2 + Schedule C, itemized
- MFJ, capital gains, qualified dividends
- Schedule E rental income + K-1 losses
- Self-employed with SE tax + QBI deduction

### Level 3 — Real Returns (gold standard, before launch)
Anonymized real returns where the correct output is known (filed and IRS-accepted). Added as the test suite grows.

### Agent Testing
Vibes SDK `TestModel` enables testing ingestion/codegen agents without real API calls. CI enforces `setAllowModelRequests(false)`.

---

## 14. Phasing

### Phase 1 — Core Engine (Weeks 1-6)
- [ ] Runtime graph assembler + executor
- [ ] Field node + connector node types
- [ ] File-based return storage
- [ ] `return create`, `return get`, `form add` CLI commands
- [ ] Core 1040 lines (1040 main form, Schedule 1/2/3)
- [ ] Constants: 2025 tax brackets, standard deductions
- [ ] Basic two-tier validator
- [ ] Deno test suite with IRS examples

### Phase 2 — Input Forms + Schedules (Weeks 7-14)
- [ ] All W-2, 1099 input nodes
- [ ] Schedule A, B, C, D, E, SE
- [ ] Key worksheets (Qualified Dividends, SS Benefits)
- [ ] Key credits (8812 CTC, EIC, education credits)
- [ ] `validate-return` CLI command
- [ ] Level 2 spot check test scenarios

### Phase 3 — Export (Weeks 15-18)
- [ ] PDF export (AcroForm filler + watermark layer)
- [ ] MeF XML builder
- [ ] MeF XSD validation
- [ ] `export` CLI command

### Phase 4 — Ingestion Engine (Weeks 19-24)
- [ ] Vibes SDK agent pipeline (DocumentParser, NodeMapper, ContextWriter, Codegen, Testgen)
- [ ] `sources.json` prebuilt IRS source list
- [ ] `ingest`, `build-node`, `review-run` CLI commands
- [ ] Ingestion run audit trail
- [ ] 2026 year update as first real ingestion run

### Phase 5 — Hardening & Launch (Weeks 25-30)
- [ ] Level 3 real return test suite
- [ ] Performance (500 returns/season load)
- [ ] Full MeF business rules implementation
- [ ] SDK packaging (clean public API, versioned)
- [ ] Documentation

### Future Phases
- State returns (CA, NY, TX priority)
- Form 1040-X (amended returns)
- Form 1040-NR (nonresident)
- Form 1120 / 1120S / 1065
- Multi-tenant return management

---

## 15. Core TypeScript Interfaces (Reference)

These are the foundational types everything is built on.

```typescript
// core/types/tax-node.ts
import { z } from 'zod'

export type NodeType = string   // refined to keyof NodeRegistry once registry is built

// No NodeMetadata type — outputNodeTypes is inlined on TaxNode directly
// All human-readable context (description, IRS citations, change history) lives in context.md

export type NodeOutput = {
  nodeType: NodeType
  input: Record<string, unknown>
}

export type NodeResult<TValue> = {
  value: TValue
  outputs: NodeOutput[]
}

export abstract class TaxNode<TSchema extends z.ZodTypeAny, TValue> {
  abstract readonly nodeType: NodeType
  abstract readonly inputSchema: TSchema
  abstract readonly outputNodeTypes: NodeType[]
  abstract compute(input: z.infer<TSchema>): NodeResult<TValue>
}
```

```typescript
// core/runtime/registry.ts
export const registry = { /* all nodes */ } as const
export type NodeRegistry = typeof registry
export type NodeType = keyof NodeRegistry
export type NodeInput<K extends NodeType> = z.infer<NodeRegistry[K]['inputSchema']>

export function dispatch<K extends NodeType>(nodeType: K, input: NodeInput<K>): void
```

```typescript
// core/types/return.ts
export interface TaxReturn {
  id: string              // returnId
  ssn: string             // SSN or EIN
  year: number            // tax year e.g. 2025
  status: 'draft' | 'validated' | 'exported'
  createdAt: string       // ISO date
  updatedAt: string
}

export interface ReturnComputed {
  returnId: string
  computedAt: string
  values: Record<NodeType, unknown>  // nodeType → computed value
  warnings: ValidationMessage[]
  errors: ValidationMessage[]
  mefBlocks: ValidationMessage[]
}

export interface ValidationMessage {
  nodeType: NodeType
  code: string
  message: string
  tier: 'mef_block' | 'error' | 'warning'
}
```

## 16. context.md Template

Every node gets this exact template on creation:

```markdown
# {node_id}

## Computation
{description of what this node computes — plain English}

## Inputs
{list each input with ← source node}

## Output
{list each output with → destination node}

## Sources
| Ingested | Document | Section / Page | URL / Path | Run ID |
|----------|----------|----------------|------------|--------|
| {date} | {doc name} | {section} | {url} | {run_id} |

## Change History
| Date | Change | Source Document | Section | Run ID |
|------|--------|----------------|---------|--------|
| {date} | Initial node created | {doc} | {section} | {run_id} |
```

---

## 17. Open Questions

- [ ] Which PDF library handles IRS AcroForm field filling best in Deno? (pdf-lib is Node-first, needs evaluation)
- [ ] IRS MeF schema download location for TY2025 — confirm URL pattern
- [ ] Clearinghouse partner for MeF XML submission (Thomson Reuters, Drake, or independent)
- [x] Vibes SDK Deno compatibility — confirmed Deno native
- [ ] QBI deduction (Section 199A) complexity — may need its own sub-phase

---

## 18. Key References

| Resource | URL | Purpose |
|---|---|---|
| Drake Tax KB | https://kb.drakesoftware.com/kb/Drake-Tax/18318.htm | Professional field reference |
| Drake Federal Forms | https://kb.drakesoftware.com/kb/Drake-Tax/20001.htm | Form availability list |
| Vibes SDK | https://vibes-sdk.a7ul.com/ | Agent framework |
| IRS MeF Guide | Publication 4164 | E-file XML spec |
| IRS Form 1040 Instructions | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf | Calculation rules |
| IRS Rev. Proc. (annual) | https://www.irs.gov/irb/ | Inflation adjustments |
