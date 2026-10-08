# W-2G — Certain Gambling Winnings

## Purpose

Reports gambling winnings from casinos, lotteries, horse racing, etc. Box 1
winnings are reported on **Schedule 1 line 8b**; box 4 federal withholding flows
to **Form 1040 line 25c**. A W-2G with withholding must be attached to the
return under the 2025 Form 1040 instructions. A bounded native MeF descriptor is
written but unrun; PDF export still blocks this route.

## IRS References

- Form W-2G and Instructions (TY2025)
- IRS Pub. 525 (2025), "Taxable and Nontaxable Income — Gambling Winnings"
- IRC §3402(q) — withholding on gambling winnings

## Input Schema (per item)

- `box1_winnings` — reportable gambling winnings
- `box2_date_won` — date of winning event (informational)
- `box3_type_of_wager` — type of wager (informational)
- `box4_federal_withheld` — federal income tax withheld
- `box5_transaction` / `box6_race` — transaction/race identifiers
  (informational)
- `box7_identical_wagers` — additional winnings from identical wagers,
  informational here because box 1 is the reportable amount
- `box8_cashier` / `box10_window` — payer internal fields (informational)
- `box9_winner_tin` — winner TIN (informational)
- `box11_first_id` / `box12_second_id` — winner ID documents (informational)
- `box13_state` / `box13_payer_state_id` — state and payer state ID
- `box14_state_winnings` — state winnings
- `box15_state_withheld` — state income tax withheld (informational; not used in
  federal computation)
- `payer_name` / `payer_name_control` / `payer_us_address` / `payer_ein` — payer
  identification on the issued W-2G
- `winner_name` / `winner_us_address` / `calendar_year` /
  `standard_or_nonstandard_code` / `source_document_reference` — native
  attachment facts; winner identity must match the taxpayer

## Compute Logic

- **`schedule1Output`**: sum `box1_winnings` across all items →
  `{ line8b_gambling_winnings: winnings }` if > 0
- **`f1040Output`**: sum `box4_federal_withheld` across all items →
  `{ line25c_other_withheld: withheld }` if > 0

## Output Nodes

- `schedule1` (line 8b — gambling winnings)
- `f1040` (line 25c — other-form federal withholding)

## Key Design Notes

- `box15_state_withheld` is parsed but not used in any federal computation.
- Many box fields are informational-only (type of wager, cashier, winner ID) —
  parsed but not used in `compute()`.
- `box7_identical_wagers` is not added to box 1 again; doing so can double-count
  a W-2G's reportable winnings.
- `w2gs` array requires at least 1 item (`z.array(itemSchema).min(1)`).
