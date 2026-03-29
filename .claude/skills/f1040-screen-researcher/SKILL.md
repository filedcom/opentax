---
name: f1040-screen-researcher
description: Research Phase only — produces context.md for a tax node. Auto-detects inputs/ vs intermediate/ and follows the appropriate research process. Use standalone to re-run research without rebuilding tests or implementation.
---

# F1040 Screen Researcher

**Node:** $ARGUMENTS

## Step 1 — Detect node location

```bash
ls nodes/2025/f1040/intermediate/$ARGUMENTS/index.ts 2>/dev/null && echo "INTERMEDIATE"
ls nodes/2025/f1040/inputs/$ARGUMENTS/ 2>/dev/null && echo "INPUT"
```

## Step 2 — Follow the research process

| Location | Read and follow |
|---|---|
| `intermediate/` exists | Phase 1 — Research in [e2e-build-node/intermediate-node.md](./../e2e-build-node/intermediate-node.md) |
| `inputs/` exists or matches screens.json | Phase 1 — Research in [e2e-build-node/input-node.md](./../e2e-build-node/input-node.md) |
