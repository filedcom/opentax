# Schedule B — Scratchpad

## Purpose
Aggregate taxable interest (from 1099-INT) and ordinary dividends (from 1099-DIV), compute Form 1040 line 2b (taxable interest) and line 3b (ordinary dividends), and gate Part III foreign accounts questions.

## Inputs received (from upstream nodes)

### From f1099int (per-payer):
- `payer_name` — string
- `taxable_interest_net` — computed net taxable interest (box1 + box3 + box10 - box11 - box12 - nominee_interest - accrued_interest_paid - non_taxable_oid_adjustment)
- `box3_us_obligations` — optional, for Form 8815 exclusion (EE/I bonds)
- `box9_pab` — optional, private activity bond interest

### From f1099div (per-payer, conditional on needsScheduleB):
- `payerName` — string
- `ordinaryDividends` — box1a
- `isNominee` — boolean

## Fields / lines identified

### Part I — Interest
- Line 1: List each payer + net taxable interest amount
- Line 2: Sum of line 1 amounts (total taxable interest, before EE/I exclusion)
- Line 3: Excludable EE/I bond interest (Form 8815) — upstream input
- Line 4: Line 2 minus Line 3 → routes to Form 1040 line 2b
- Threshold: if line 4 > $1,500 → must complete Part III

### Part II — Ordinary Dividends
- Line 5: List each payer + ordinary dividends
- Line 6: Sum of line 5 → routes to Form 1040 line 3b
- Note: Nominee exclusions already applied by f1099div before routing here
- Threshold: if line 6 > $1,500 → must complete Part III

### Part III — Foreign Accounts and Trusts
- Not computed by this node (user-entered checkbox questions)
- But trigger condition: line 4 > $1,500 OR line 6 > $1,500

## Open Questions

- [x] Q: What upstream nodes feed into this form?
  → f1099int (per-payer interest entries), f1099div (per-payer dividend entries when total > $1,500 or any nominee)
- [x] Q: What calculations does this form perform?
  → Aggregates per-payer interest entries to line 2 total; subtracts EE/I bond exclusion to get line 4; aggregates per-payer dividend entries to line 6; routes both totals to f1040
- [x] Q: What does this form output to downstream nodes?
  → f1040: line2b_taxable_interest (line 4) and line3b_ordinary_dividends (line 6)
- [x] Q: What are the TY2025 constants?
  → $1,500 threshold for taxable interest (Part I note) and ordinary dividends (Part II note) triggering Part III
- [x] Q: What edge cases exist?
  → EE/I bond exclusion (line 3) reduces taxable interest; nominee interest already subtracted by f1099int; zero interest but dividends over threshold; seller-financed mortgage interest listed first (informational, handled by f1099int)

## Sources checked

- [x] IRS Schedule B 2025 form: .research/docs/f1040sb.pdf
- [x] IRS Schedule B 2025 instructions: .research/docs/i1040sb.pdf
- [x] f1099int upstream node: nodes/2025/f1040/inputs/f1099int/index.ts
- [x] f1099div upstream node: nodes/2025/f1040/inputs/f1099div/index.ts
