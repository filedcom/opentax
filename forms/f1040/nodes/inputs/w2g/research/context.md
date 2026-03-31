# W-2G — Certain Gambling Winnings

## Purpose
Reports gambling winnings from casinos, lotteries, horse racing, etc. Winnings are reported as other income on **Schedule 1 line 8z**; federal withholding flows to **Form 1040 line 25b**.

## IRS References
- Form W-2G and Instructions (TY2025)
- IRS Pub. 525 (2025), "Taxable and Nontaxable Income — Gambling Winnings"
- IRC §3402(q) — withholding on gambling winnings

## Input Schema (per item)
- `box1_winnings` — reportable gambling winnings
- `box2_type_of_wager` — type of wager (informational)
- `box3_winnings_identical` — winnings identical to other winners (sweepstakes, etc.)
- `box4_federal_withheld` — federal income tax withheld
- `box5_transaction` / `box6_race` — transaction/race identifiers (informational)
- `box7_winnings_noncash` — fair market value of noncash prizes
- `box8_cashier` / `box10_window` — payer internal fields (informational)
- `box9_winner_tin` — winner TIN (informational)
- `box11_first_id` / `box12_second_id` — winner ID documents (informational)
- `box13_state` / `box14_state_id` — state info
- `box15_state_withheld` — state income tax withheld (informational; not used in federal computation)
- `payer_name` / `payer_address` / `payer_ein` — payer identification

## Compute Logic
- **`schedule1Output`**: sum `box1_winnings` across all items → `{ line8z_other_income: winnings }` if > 0
- **`f1040Output`**: sum `box4_federal_withheld` across all items → `{ line25b_withheld_1099: withheld }` if > 0

## Output Nodes
- `schedule1` (line 8z — other income)
- `f1040` (line 25b — federal withholding)

## Key Design Notes
- `box15_state_withheld` is parsed but not used in any federal computation.
- Many box fields are informational-only (type of wager, cashier, winner ID) — parsed but not used in `compute()`.
- `box3_winnings_identical` and `box7_winnings_noncash` are also not currently aggregated — only `box1_winnings` flows to income.
- `w2gs` array requires at least 1 item (`z.array(itemSchema).min(1)`).
