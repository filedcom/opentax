# QDCGTW — Qualified Dividends and Capital Gain Tax Worksheet

## Purpose
**Stub node** — placeholder for the full preferential rate computation for qualified dividends and long-term capital gains (0%/15%/20%). Currently accepts `line18_28pct_gain` input but returns no outputs. Full implementation deferred to a future phase.

## IRS References
- Form 1040 Instructions — Qualified Dividends and Capital Gain Tax Worksheet
- IRC §1(h) — Maximum Capital Gains Rate
- Schedule D Tax Worksheet (for 28% rate gain/collectibles)

## Current Status
- **Phase 1 stub**: `compute()` validates input and returns `{ outputs: [] }`
- No tax computations produced
- `outputNodes = new OutputNodes([])` — no downstream nodes

## Input Schema
- `line18_28pct_gain` — net 28% rate gain from rate_28_gain_worksheet (Schedule D Tax Worksheet line 18); optional, nonnegative

## Compute Logic
Validates input with `inputSchema.parse(rawInput)` and returns `{ outputs: [] }`. No computation.

## Output Nodes
None (stub).

## Key Design Notes
- When fully implemented, this node will compute the lower capital gains tax using the 0%/15%/20% rate tables and reduce the `income_tax_calculation` result accordingly.
- The node exists to receive `line18_28pct_gain` routing from the 28% gain worksheet without creating routing dead ends.
