---
name: implement-tax-node
description: Implementation Phase only — writes index.ts from context.md + tests, registers the node, and runs tests to green. Auto-detects inputs/ vs intermediate/. Requires both context.md and index.test.ts to exist. Use standalone when re-implementing without redoing research or tests.
---

# Implement Tax Node

**Node(s) to implement:** $ARGUMENTS

## Step 1 — Detect node location

```bash
ls nodes/2025/f1040/intermediate/$ARGUMENTS/index.ts 2>/dev/null && echo "INTERMEDIATE"
ls nodes/2025/f1040/inputs/$ARGUMENTS/ 2>/dev/null && echo "INPUT"
```

## Step 2 — Verify prerequisites exist

| Location | Required files |
|---|---|
| intermediate | `nodes/2025/f1040/intermediate/$ARGUMENTS/research/context.md` + `index.test.ts` |
| input | `nodes/2025/f1040/inputs/$ARGUMENTS/research/context.md` + `index.test.ts` |

If either is missing:
- No context.md → run `/f1040-screen-researcher $ARGUMENTS` first
- No index.test.ts → run `/black-box-tests $ARGUMENTS` first

## Step 3 — Follow the implementation process

| Location | Read and follow |
|---|---|
| `intermediate/` | Phase 3 — Implementation in [e2e-build-node/intermediate-node.md](./../e2e-build-node/intermediate-node.md) |
| `inputs/` | Phase 3 — Implementation in [e2e-build-node/input-node.md](./../e2e-build-node/input-node.md) |
