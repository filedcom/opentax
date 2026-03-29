---
name: e2e-build-node
description: Smart router — detects whether a node lives in inputs/ or intermediate/ and runs the appropriate full pipeline (research → tests → implementation). Single entry point for building any tax node end-to-end.
---

# E2E Build Node

**Node to build:** $ARGUMENTS

## Step 1 — Detect node location

```bash
ls nodes/2025/f1040/intermediate/$ARGUMENTS/index.ts 2>/dev/null && echo "INTERMEDIATE"
ls nodes/2025/f1040/inputs/$ARGUMENTS/index.ts 2>/dev/null && echo "INPUT"
```

Also check `nodes/2025/f1040/inputs/screens.json` — if the node name matches any
`screen_code` or `alias_screen_codes` but has no directory yet, treat it as **input**.

## Step 2 — Dispatch

| Detected location | Read and follow |
|---|---|
| `intermediate/` exists | [intermediate-node.md](./intermediate-node.md) |
| `inputs/` exists or in screens.json | [input-node.md](./input-node.md) |
| `outputs/` | Not yet supported — tell the user |
| Not found | List closest names from both directories and ask to clarify |
