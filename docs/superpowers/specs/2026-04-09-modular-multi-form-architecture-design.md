# Modular Multi-Form Tax Engine Architecture

**Date:** 2026-04-09
**Status:** Approved
**Goal:** Restructure the codebase so AI skills can build and maintain any tax form (1040, 1120, etc.) across any tax year, with zero human maintenance.

---

## Problem

The engine currently only supports F1040 (2025), with form-specific paths hardcoded throughout the AI skills. Adding F1040 (2024) or F1120 (2025) requires manual structural decisions each time. The goal is a self-governing system where adding a new form or year is fully AI-driven.

**Key inspiration:** Karpathy's autoresearch pattern — short policy docs orient agents, then agents navigate the structure directly. The objective benchmark pass rate is the sole success metric.

---

## Design Principles

1. **Convention over configuration** — skills derive all paths from `form + year` arguments; no manifest files needed
2. **Year is one roof** — everything TY2025-specific lives under `forms/f1040/2025/`; no year constants scattered elsewhere
3. **Structure is the inventory** — agents discover nodes via glob/ls; no master node tables to maintain
4. **Short policy docs** — `FORM.md` orients agents (~1 page); deep context lives colocated with each node in `research/context.md`
5. **Benchmark is truth** — 95% pass rate is the objective metric that drives all autonomous improvement

---

## Directory Structure

```
forms/
  f1040/
    FORM.md                    # Short orientation doc (~1 page) — AI reads this first
    nodes/                     # Shared year-agnostic logic
      config/
        types.ts               # F1040Config interface
        index.ts               # CONFIG_BY_YEAR barrel — imports from ../../{year}/config.ts
      inputs/                  # 131 input nodes (W-2, 1099s, Schedule C, …)
      intermediate/            # 50 computation nodes (forms/, worksheets/, aggregation/)
      outputs/                 # 2 output nodes (f1040, schedule1)
    2025/                      # ONE ROOF — everything TY2025
      config.ts                # Year constants (single source of truth, unchanged)
      registry.ts              # Assembles shared nodes for this year
      index.ts / start.ts / inputs.ts / pending.ts
      mef/                     # MEF XML builders for 2025v3.0
      pdf/                     # PDF form fillers
      validation/              # 160+ IRS business rules
      nodes/                   # Structural overrides only (rare — ~2-5 per new year)
    2026/                      # Future year — same layout as 2025/
      config.ts                # New year constants only
      registry.ts
      mef/ / pdf/ / validation/
      nodes/                   # Only nodes that change structurally
  f1120/
    FORM.md
    nodes/
      config/
        types.ts / index.ts
    2025/
      config.ts / registry.ts / mef/ / pdf/ / validation/

benchmark/
  run_benchmark.ts             # --form / --year flags (default: f1040 2025)
  cases/
    f1040/
      2025/                    # All 99 existing cases moved here
    f1120/
      2025/

.state/
  bench/
    state.json                 # Version 2: keyed by "f1040:2025", "f1120:2025"
```

---

## Node Sharing Model

Three categories, determined at the time a new year is added:

### A — Fully Shared (~80%, ~148 nodes)
No year-specific constants. All input parsers (w2, f1099div, etc.) and pure routing nodes fall here. Lives in `forms/f1040/nodes/` — zero changes when adding a new year.

### B — Config-Injected (~20%, ~37 nodes)
Same computation logic year-to-year, but reference year-specific constants (tax brackets, SS wage base, phaseout thresholds). Uses `CONFIG_BY_YEAR[ctx.taxYear]` dispatch pattern. `income_tax_calculation` already implements this — all 37 nodes follow that template.

```typescript
// nodes/config/index.ts — the barrel
import { config2025 } from "../../2025/config.ts";
// import { config2026 } from "../../2026/config.ts";  ← added when year is built

export const CONFIG_BY_YEAR: Record<number, F1040Config> = {
  2025: config2025,
};

// In any config-injected node's compute():
const cfg = CONFIG_BY_YEAR[ctx.taxYear];
if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
```

### C — Structurally Overridden (~2-5 per new year)
Computation logic changes meaningfully (new form added, line renumbered, new phaseout mechanism). Override lives at `forms/f1040/{year}/nodes/{path}/index.ts`. That year's `registry.ts` imports the override instead of the shared node.

---

## FORM.md Structure

Each `forms/f{form}/FORM.md` is short (~1 page). It orients agents without replacing the code as documentation.

```markdown
# Form {NUMBER} — {Full Name}

IRC §{section} | IRS Pub {N} | MeF Schema: {version}

## What This Form Does
[2-3 sentences: who files it, what it computes]

## Node Categories
- inputs/           → N nodes — one per IRS input document type
- intermediate/     → N nodes — forms/, worksheets/, aggregation/
- outputs/          → N nodes — final line aggregators

## Conventions
- Config-injected nodes use `CONFIG_BY_YEAR[ctx.taxYear]` from `nodes/config/index.ts`
- Year-specific structural overrides live in `{year}/nodes/` (rare)
- All nodes follow the file shape in CLAUDE.md

## IRS Specs
- XSD schemas: `.state/research/docs/IMF_Series_{version}/...`
- PDF field dumps: `.state/field-dumps/`
- Instructions PDF: [IRS URL]

## Benchmark
`benchmark/cases/f{form}/{year}/` | `deno task bench --form f{form} --year {year}`
Pass threshold: 95%

## Known Failure Modes
[High-level list of known bugs/edge cases with case numbers]

## Adding a New Tax Year
1. Copy `{current_year}/` to `{new_year}/`
2. Update `config.ts` with new IRS Rev. Proc. constants
3. Add `{new_year}` entry to `nodes/config/index.ts` barrel
4. Run benchmark — most nodes pass unchanged
5. Failures → structural overrides needed → add to `{new_year}/nodes/`
6. Update `registry.ts` to import overrides
```

---

## Skills Architecture

All four skills (`/tax-build`, `/tax-fix`, `/tax-cases`, `/tax-status`) become convention-driven:

**Step 0 for all skills:** Read `forms/f{form}/FORM.md` and pass as agent context.

**Path derivation from `form + year`:**
```
Shared nodes:      forms/f{form}/nodes/
Year config/mef:   forms/f{form}/{year}/
Benchmark cases:   benchmark/cases/f{form}/{year}/
State key:         f{form}:{year}  in .state/bench/state.json
```

No MANIFEST.json needed — the conventions are the manifest.

---

## State Schema (Version 2)

```json
{
  "version": 2,
  "forms": {
    "f1040:2025": {
      "fix": {
        "status": "idle",
        "benchmark_baseline": { "pass": 94, "fail": 3 },
        "root_causes": {}
      },
      "build": null
    },
    "f1120:2025": {
      "fix": null,
      "build": {
        "status": "idle",
        "phase": null,
        "nodes_built": [],
        "benchmark_runs": []
      }
    }
  }
}
```

---

## NodeContext Addition

```typescript
// core/types/node-context.ts
export type NodeContext = {
  readonly taxYear: number;
  readonly formType: string;  // "f1040", "f1120"
};
```

---

## Migration Plan (6 Phases)

Each phase is independently reversible and validated by the benchmark.

### Phase 1 — Restructure Benchmarks
- Move `benchmark/cases/NN-*` → `benchmark/cases/f1040/2025/NN-*`
- Update `run_benchmark.ts` with `--form`/`--year` flags (default `f1040 2025`)
- ✓ `deno task bench` still shows 94/97

### Phase 2 — Policy Docs
- Create `forms/f1040/FORM.md`
- No code changes, no risk

### Phase 3 — Config Barrel
- Create `nodes/config/types.ts` (F1040Config interface)
- Create `nodes/config/index.ts` (CONFIG_BY_YEAR barrel)
- Migrate 37 config-importing nodes from direct `_2025` imports → barrel
- Do in batches; run unit tests + `deno task bench` after each batch

### Phase 4 — State Schema
- Migrate `state.json` to version 2 keyed schema
- `tasks.tax-fix-1040` → `forms.f1040:2025.fix`
- `tasks.tax-build-1120` → `forms.f1120:2025.build`

### Phase 5 — Update Skills
- All four skill SKILL.md files: derive paths from conventions, read FORM.md as Step 0
- Update node-builder agent to use config barrel pattern

### Phase 6 — Verify
- `deno task bench` → 94/97 still passing
- `/tax-status` → shows per-form-year table
- `/tax-build 1120 2025` → works end-to-end

---

## Files Changed

| File | Action | Risk |
|------|--------|------|
| `forms/f1040/FORM.md` | Create | None |
| `forms/f1040/nodes/config/types.ts` | Create | None |
| `forms/f1040/nodes/config/index.ts` | Create | None |
| `core/types/node-context.ts` | Add `formType` | Low |
| 37 config-importing nodes | Migrate to barrel | Medium — test each |
| `benchmark/run_benchmark.ts` | Add flags | Low |
| `benchmark/cases/*/` | Move to `f1040/2025/` | Low |
| `.state/bench/state.json` | Version 2 schema | Low |
| 4 skill SKILL.md files | Convention-driven | None |

**Not changed:** All 185 node implementations, core engine, CLI, existing tests, `forms/f1040/2025/` structure.
