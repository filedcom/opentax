---
name: build-tax-node
description: Full pipeline for building a tax node — research → black-box tests → implementation. Auto-detects input vs intermediate node type.
---

# Build Tax Node

**Node:** $ARGUMENTS

## Step 1 — Detect node type

```bash
ls nodes/2025/f1040/intermediate/$ARGUMENTS/index.ts 2>/dev/null && echo "INTERMEDIATE"
ls nodes/2025/f1040/inputs/$ARGUMENTS/ 2>/dev/null && echo "INPUT"
```

Also check `nodes/2025/f1040/inputs/screens.json` for a match on `screen_code` or `alias_screen_codes`.

- Found in `intermediate/` → **INTERMEDIATE**
- Found in `inputs/` or `screens.json` → **INPUT**
- Not found → list closest names from both directories and ask to clarify

## Step 2 — Run phases in sequence

**CRITICAL: `research/context.md` is the hard prerequisite for all subsequent phases.**

- If `{node_path}/research/context.md` does NOT exist → run Phase 1 first, always. Do not skip it even if `index.ts` or `index.test.ts` already exist.
- Do not proceed to Phase 2 until Phase 1's gate is passed (context.md is complete, no empty tables, every constant cited).
- Do not proceed to Phase 3 until Phase 2's gate is passed (tests written and failing as expected).

### Phase 1 — Research → [research.md](./research.md)

**Verify before proceeding to Phase 2:**
```bash
cat {node_path}/research/context.md
```
- File exists and is not empty
- Input Fields table has at least one row (no empty table)
- Output Routing table has at least one row
- Constants table is filled or explicitly marked "None"
- No section still says `_Research in progress._`
- Every constant has a Rev Proc or IRS citation

### Phase 2 — Black-Box Tests → [black-box-tests.md](./black-box-tests.md)

**Verify before proceeding to Phase 3:**
```bash
deno test {node_path}/ --allow-read 2>&1 | tail -5
```
- Test file exists at `{node_path}/index.test.ts`
- Tests run and **fail** (red) because `index.ts` does not yet exist or is a stub
- If tests pass green at this stage, implementation already exists — read it carefully before overwriting

### Phase 3 — Implementation → [implementation.md](./implementation.md)

**Verify after completing:**
```bash
deno test {node_path}/ --allow-read 2>&1 | tail -5
deno check forms/f1040/2025/registry.ts 2>&1 | tail -5
```
- All tests pass (green)
- `deno check` exits 0 with no type errors
- Node is imported and registered in `registry.ts` and `inputs.ts` (or `intermediate/` equivalent)
