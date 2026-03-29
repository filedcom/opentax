---
name: black-box-tests
description: Test Phase only — generates black-box Deno tests from context.md. Auto-detects inputs/ vs intermediate/ and follows the appropriate test harness. Requires context.md to exist first. Use standalone to regenerate tests without rebuilding the implementation.
---

# Black-Box Tests

**Node:** $ARGUMENTS

## Step 1 — Detect node location

```bash
ls nodes/2025/f1040/intermediate/$ARGUMENTS/index.ts 2>/dev/null && echo "INTERMEDIATE"
ls nodes/2025/f1040/inputs/$ARGUMENTS/ 2>/dev/null && echo "INPUT"
```

## Step 2 — Verify context.md exists

| Location | Expected path |
|---|---|
| intermediate | `nodes/2025/f1040/intermediate/$ARGUMENTS/research/context.md` |
| input | `nodes/2025/f1040/inputs/$ARGUMENTS/research/context.md` |

If context.md is missing: stop and run `/f1040-screen-researcher $ARGUMENTS` first.

## Step 3 — Follow the test generation process

| Location | Read and follow |
|---|---|
| `intermediate/` | Phase 2 — Black-Box Tests in [e2e-build-node/intermediate-node.md](./../e2e-build-node/intermediate-node.md) |
| `inputs/` | Phase 2 — Black-Box Tests in [e2e-build-node/input-node.md](./../e2e-build-node/input-node.md) |
