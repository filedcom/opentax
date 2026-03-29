# Form 8949 Intermediate Node — Scratchpad

## Architecture

The intermediate form8949 sits between:
- **Upstream**: f1099b input node (routes individual pre-computed transactions here)
- **Downstream**: schedule_d intermediate node

## Flow

1. f1099b computes gain_loss per transaction, sets is_long_term, then routes to form8949 nodeType
2. form8949 intermediate receives individual transaction objects via executor accumulation
3. form8949 routes each transaction to schedule_d using the `transaction` accumulation key

## Key fields received from f1099b

Per transaction:
- part: "A" | "B" | "C" | "D" | "E" | "F" (1099-B parts only, no digital asset G-L)
- description: string
- date_acquired: string
- date_sold: string
- proceeds: number (nonnegative)
- cost_basis: number (nonnegative)
- adjustment_codes?: string (e.g., "W", "B")
- adjustment_amount?: number
- gain_loss: number (pre-computed: proceeds - cost_basis + adjustment_amount)
- is_long_term: boolean

## What schedule_d expects

schedule_d.inputSchema.transaction expects the full transactionSchema including:
- All of the above fields
- gain_loss: number
- is_long_term: boolean

## Accumulation Pattern

The executor accumulates multiple NodeOutputs with the same key to an array.
So when multiple transactions arrive at form8949, the `transaction` field
in the input will be either a single object or an array of objects.

## Design Decision

The intermediate form8949 node:
- Receives accumulated transactions (scalar or array via executor merge)
- Passes each through to schedule_d as individual `transaction` outputs
- This preserves per-transaction detail for schedule_d aggregation

## Wash Sale (Code W)

Wash sale adjustment reduces gain (negative adjustment_amount). The W code
is already reflected in the adjustment_amount from f1099b, so form8949 just
passes it through — no additional computation needed.
