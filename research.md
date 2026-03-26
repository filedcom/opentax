# Tax Engine — Research & Architecture Plan

> Last updated: 2026-03-26
> Team: Atul + Claude
> Stack: Deno + TypeScript + Vibes SDK

---

## 1. Project Overview

A professional-grade, IRS-compliant tax calculation engine starting with Form 1040 (tax year 2025), built as a headless CLI library that other software can integrate with. Designed to be self-updating as new IRS publications are released each year, extensible to 1120, 1120S, 1065, and state returns.

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
| Self-update | CLI-driven ingestion engine | On-demand, human-in-the-loop before merge |
| Ingestion intelligence | Hybrid LLM + human review | LLM extracts, human reviews diff, full source traceability |
| PDF export | Official IRS AcroForm PDF + branding/watermark overlay | Professional standard |
| State returns | First-class architecture, not implemented yet | Future phase |
| LLM layer | Vibes SDK (model-agnostic) | Type-safe, pluggable across 50+ providers |
| Testing | IRS examples + spot checks + real returns, extensible | D-level rigor from day one |
| Timeline | October 2026 (extended deadline) / April 2027 (filing season) | 6-9 months with two-person team |

---

## 3. Core Architecture: Mini-Program Nodes

The entire tax engine is expressed as two primitives:

### Field Node
A typed value container — either raw input data or a calculated output.

```typescript
// Example: W-2 Box 1 wages input
export const box1Wages: FieldNode<number> = {
  id: 'w2_box1_wages',
  type: 'field',
  dataType: 'number',
  value: 0,
}
```

### Connector Node
A pure function: `field(s) → field(s)`. Three variants:
- **Identity** — passes value through (a wire)
- **Aggregation** — sum/min/max of multiple fields
- **Computation** — tax table lookup, phase-out calculation, worksheet logic

```typescript
// Example: Line 15 taxable income
export function compute(inputs: Inputs): Outputs {
  return {
    taxable_income: Math.max(0, inputs.agi - inputs.deduction_amount)
  }
}
```

### Each Node is a Self-Contained Mini-Program

```
forms/
  line_15_taxable_income/
    2025/
      index.ts          ← pure computation function
      manifest.ts       ← declares inputs, outputs, IRS source
      context.md        ← IRS citation, instructions, change history
      index.test.ts     ← generated test fixtures
```

### Manifest Structure

```typescript
// manifest.ts
export const manifest = {
  id: 'line_15_taxable_income',
  year: 2025,
  form: '1040',
  type: 'connector',
  inputs: {
    agi: { type: 'number', source: 'line_11_agi' },
    deduction_amount: { type: 'number', source: 'deduction_selector' },
  },
  outputs: {
    taxable_income: { type: 'number' },
  },
  irsSource: 'Form 1040 (2025) Line 15 Instructions',
  lastUpdatedBy: 'ingestion-run/2026-03-26-rev-proc-2025-40',
}
```

### Graph Assembly (Auto, No Config File)

The runtime engine:
1. Scans filesystem for all `manifest.ts` files
2. Builds registry: `{ outputId → miniProgram }`
3. Resolves each mini-program's inputs to their producing mini-programs
4. Topological sort → execution order
5. Executes connectors in order, threading field values through

No hand-written graph config. The graph is emergent from the manifests.

---

## 4. Filesystem Structure

```
engine/
  core/
    runtime/
      graph-assembler.ts     ← scans manifests, builds DAG
      executor.ts            ← topological sort + execution
      validator.ts           ← two-tier validation engine
    types/
      field-node.ts
      connector-node.ts
      manifest.ts
      return.ts

  forms/
    inputs/                  ← raw data entry nodes
      w2/2025/
      w2_g/2025/
      1099_int/2025/
      1099_div/2025/
      1099_b/2025/
      1099_r/2025/
      1099_misc/2025/
      1099_nec/2025/
      k1/2025/
      ...

    schedules/               ← schedule computation mini-programs
      schedule_a/2025/       ← itemized deductions
      schedule_b/2025/       ← interest and dividends
      schedule_c/2025/       ← self-employment income
      schedule_d/2025/       ← capital gains
      schedule_e/2025/       ← rental, S-corps, partnerships
      schedule_se/2025/      ← self-employment tax
      schedule_1/2025/       ← additional income/adjustments
      schedule_2/2025/       ← additional taxes
      schedule_3/2025/       ← additional credits
      ...

    worksheets/              ← IRS embedded worksheets
      qualified_dividends_cgt_worksheet/2025/
      social_security_benefits_worksheet/2025/
      child_tax_credit_worksheet/2025/
      ...

    credits/                 ← credit calculation nodes
      8812_ctc/2025/
      earned_income_credit/2025/
      education_credits/2025/
      ...

    form_1040/               ← main form lines
      line_01z_wages/2025/
      line_02b_interest/2025/
      line_11_agi/2025/
      line_15_taxable_income/2025/
      line_16_tax/2025/
      line_24_total_tax/2025/
      line_33_total_payments/2025/
      line_37_refund/2025/
      line_38_owed/2025/
      ...

    constants/               ← IRS-published annual values
      2025/
        tax_brackets.ts
        standard_deductions.ts
        phase_out_thresholds.ts
        amt_exemptions.ts
        contribution_limits.ts

    states/                  ← state returns (future phase)
      ca/2025/
      ny/2025/
      ...

  ingestion/
    sources.json             ← prebuilt IRS document source list
    agents/
      document-parser.ts     ← Vibes agent: PDF/doc → structured changes
      node-mapper.ts         ← Vibes agent: changes → affected manifests
      context-writer.ts      ← Vibes agent: updates context.md + citations
      codegen.ts             ← Vibes agent: context.md → index.ts
      testgen.ts             ← Vibes agent: context.md → index.test.ts
    runs/
      2026-03-26_rev-proc-2025-40/
        input.pdf
        extracted_changes.json
        affected_nodes.json
        diff.patch
        review.md            ← human review checklist

  cli/
    commands/
      create-return.ts
      add-form.ts
      get-return.ts
      validate-return.ts
      export.ts
      ingest.ts
      build-node.ts
      review-run.ts

  returns/                   ← file-based return storage
    {returnId}/
      meta.json              ← ssn/ein, year, status, created
      inputs/
        w2_1.json
        schedule_c.json
        ...
      computed.json          ← latest calculated state
      audit.json             ← all changes with timestamps

  export/
    pdf/
      acroform-filler.ts     ← fills official IRS AcroForm PDFs
      watermark.ts           ← branding overlay layer
    mef-xml/
      schema/2025/           ← IRS MeF XML schema files
      builder.ts             ← assembles MeF XML from computed return
      validator.ts           ← validates against MeF business rules
```

---

## 5. Return Lifecycle (CLI Flow)

```bash
# 1. Create a return
tax create-return --ssn 123-45-6789 --year 2025
# → returns: returnId = ret_abc123

# 2. Add form data one by one (each triggers recompute)
tax add-form ret_abc123 W2 '{"box1": 85000, "box2": 12000, "box12": [...]}'
tax add-form ret_abc123 ScheduleC '{"gross_receipts": 45000, "expenses": {...}}'
tax add-form ret_abc123 1099INT '{"payer": "Chase", "amount": 320}'

# 3. Get current computed state at any time
tax get-return ret_abc123
# → JSON: all computed lines, AGI, taxable income, tax owed, refund

# 4. Validate before export
tax validate ret_abc123
# → warnings: [...], errors: [...], mef_blocks: [...]

# 5. Export
tax export ret_abc123 --format pdf --output ./returns/
tax export ret_abc123 --format mef-xml --output ./efile/
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

### CLI Commands
```bash
# Ingest a known source
tax ingest --source rev-proc-inflation --year 2026

# Ingest a custom document (new link or file)
tax ingest --doc ./path/to/new-irs-notice.pdf
tax ingest --url https://irs.gov/pub/irs-drop/rp-2026-xx.pdf

# Review what the last ingestion wants to change
tax review-run --id last

# Run codegen on affected nodes after reviewing
tax build-node --run last

# Inspect a specific node
tax build-node --node forms/form_1040/line_15_taxable_income/2025
```

### Ingestion Agent Pipeline (Vibes SDK)
```
DocumentParserAgent
  → reads PDF/URL
  → extracts structured changes: [{field, old_value, new_value, page_ref}]
  → output: extracted_changes.json

NodeMapperAgent
  → reads extracted_changes.json
  → scans all manifest.ts files
  → maps each change to affected node IDs
  → output: affected_nodes.json

ContextWriterAgent
  → for each affected node: updates context.md
  → appends change record with source citation + date
  → output: updated context.md files

[HUMAN REVIEWS DIFF HERE]

CodegenAgent
  → reads context.md for each affected node
  → generates index.ts (pure function, typed)
  → output: index.ts

TestgenAgent
  → reads context.md + index.ts
  → generates index.test.ts with IRS example fixtures
  → output: index.test.ts

[HUMAN REVIEWS + MERGES]
```

### Traceability (context.md structure)
```markdown
# line_15_taxable_income

## IRS Source
Form 1040 (2025) Line 15 Instructions, p.33

## Computation
Taxable income = max(0, AGI - greater of standard or itemized deduction)

## Inputs
- `agi` ← line_11_agi output
- `deduction_amount` ← deduction_selector output

## Output
- `taxable_income` → line_16_tax input

## Change History
| Date | Change | Source | Run ID |
|------|--------|--------|--------|
| 2026-03-26 | Standard deduction MFJ updated to $30,000 | Rev. Proc. 2025-40 p.4 | run_abc |
```

---

## 8. Technology Stack

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
- [ ] `create-return`, `add-form`, `get-return` CLI commands
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

## 15. Open Questions

- [ ] Which PDF library handles IRS AcroForm field filling best in Deno? (pdf-lib is Node-first, needs evaluation)
- [ ] IRS MeF schema download location for TY2025 — confirm URL pattern
- [ ] Clearinghouse partner for MeF XML submission (Thomson Reuters, Drake, or independent)
- [x] Vibes SDK Deno compatibility — confirmed Deno native
- [ ] QBI deduction (Section 199A) complexity — may need its own sub-phase

---

## 16. Key References

| Resource | URL | Purpose |
|---|---|---|
| Drake Tax KB | https://kb.drakesoftware.com/kb/Drake-Tax/18318.htm | Professional field reference |
| Drake Federal Forms | https://kb.drakesoftware.com/kb/Drake-Tax/20001.htm | Form availability list |
| Vibes SDK | https://vibes-sdk.a7ul.com/ | Agent framework |
| IRS MeF Guide | Publication 4164 | E-file XML spec |
| IRS Form 1040 Instructions | https://www.irs.gov/pub/irs-pdf/i1040gi.pdf | Calculation rules |
| IRS Rev. Proc. (annual) | https://www.irs.gov/irb/ | Inflation adjustments |
