# Unrecaptured 1250 Worksheet — Scratchpad

## Key Design Decisions

### Input Sources
1. **f1099div box 2b** → `unrecaptured_1250_gain` (distributions from funds/REITs)
2. **Property sales** → `prior_depreciation_allowed` + `gain_on_sale` per property
   - Uses accumulation pattern (scalar → array) for multiple properties

### Per-property Gain Calculation
```
property_gain = min(prior_depreciation_allowed, gain_on_sale)
```
Cannot exceed actual gain — this is the key constraint per IRC §1250 and Sch D instructions.

### Output
Routes to `schedule_d` as `line19_unrecaptured_1250`.
schedule_d needs this field added to its inputSchema.

### Node Topology
- f1099div → unrecaptured_1250_worksheet (existing, feeding `unrecaptured_1250_gain`)
- unrecaptured_1250_worksheet → schedule_d (new, feeding `line19_unrecaptured_1250`)
- schedule_d circular dep avoided by using UnimplementedTaxNode stub (same as rate_28_gain_worksheet)

## References to Similar Nodes
- `rate_28_gain_worksheet`: uses UnimplementedTaxNode("schedule_d") stub to avoid circular deps
- Pattern to follow exactly for this node
