# Form 9465 — Installment Agreement Request

## Purpose
Administrative form for taxpayers who cannot pay their full balance due by the filing deadline. Requests an installment payment plan from the IRS. **No tax computations** — purely administrative/informational.

## IRS References
- Form 9465 and Instructions (2025)
- IRS Pub. 594, "The IRS Collection Process"

## Input Schema
- `amount_owed` — balance due on return
- `monthly_payment` — proposed monthly payment amount
- `payment_day` — proposed payment due day (1–28)
- `bank_routing_number` / `bank_account_number` — for direct debit DDIA
- `direct_debit` — true = DDIA; false = check/money order
- `prior_installment_agreement` — affects user fee determination
- `low_income` — qualifies for reduced user fee

## Compute Logic
Validates input with `inputSchema.parse(input)` and returns `{ outputs: [] }`. No tax outputs produced.

## Output Nodes
None — `outputNodes = new OutputNodes([])`.

## Key Design Notes
- `payment_day` constrained to 1–28 (avoids end-of-month ambiguity).
- Sensitive bank fields (`bank_routing_number`, `bank_account_number`) are stored as optional strings; engine does not validate bank account format.
- Node exists to capture installment agreement data for downstream form-filling, not computation.
