# Form 4255 — Recapture of Investment Credit — Context

## Overview
Form 4255 is filed when property on which an investment credit was claimed is
disposed of or ceases to qualify before the end of a 5-year holding period.
The recaptured amount becomes additional tax on the return.

## Node Type
- nodeType: `f4255`
- Input type: **array** — one item per property being recaptured
- Output: Schedule 2, Line 17a (`line17a_investment_credit_recapture`)

## Schema — Per-Item (itemSchema)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | optional | Property description (Form 4255 col a) |
| `date_placed_in_service` | string (ISO date) | optional | When originally placed in service |
| `original_credit_amount` | number ≥ 0 | required | Investment credit originally claimed |
| `year_of_recapture` | 1–5 | required | Determines recapture percentage |
| `recapture_reason` | RecaptureReason enum | optional | Why property ceased to qualify |
| `recapture_amount_override` | number ≥ 0 | optional | Override computed recapture amount |

## Input Schema
```
inputSchema = z.object({ properties: z.array(itemSchema).min(1) })
```

## Enum — RecaptureReason
- `Disposed` — property was sold or transferred
- `CeasedToQualify` — property no longer meets credit requirements
- `Converted` — business use dropped below required threshold
- `Destroyed` — property destroyed (casualty; recapture may not apply if replaced)

## Recapture Percentages (IRC §50(a))
```
year 1 → 100%
year 2 →  80%
year 3 →  60%
year 4 →  40%
year 5 →  20%
```
Year 6+ = 0% recapture (no longer within recapture period).

## Computed Recapture Amount (per property)
```
recapture_amount = original_credit_amount × recapturePercentage(year_of_recapture)
```
If `recapture_amount_override` is provided, use that value instead.

## Aggregation
```
total_recapture = sum(recapture_amount for each property)
```
If total_recapture = 0, emit no outputs.

## Output Routing
- `schedule2` field: `line17a_investment_credit_recapture`
- Only emitted when total_recapture > 0

## Validation Rules
1. `original_credit_amount` must be ≥ 0
2. `year_of_recapture` must be integer 1–5 (validated via z.int().min(1).max(5))
3. `recapture_amount_override` if provided must be ≥ 0
4. Array must have at least 1 item (z.array(itemSchema).min(1))
5. Schema rejects negative values

## Edge Cases
- year_of_recapture = 5 → 20% recapture
- original_credit_amount = 0 → recapture = 0
- override = 0 → recapture = 0 (explicit override honored)
- All items compute to 0 → no output emitted
- Single item with year 1 → 100% recapture
