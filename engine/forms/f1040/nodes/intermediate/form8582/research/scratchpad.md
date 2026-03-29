# Form 8582 — Scratchpad

## Research Notes

### Drake Screen
Screen code: `8582` — confirmed in screens.json.
Description: "Passive Activity Loss Limitations" / "Form 8582, Line 7"

### IRS Instruction Key Findings (TY2025)

**Part I — Passive Activity Loss**
- Line 1a: Net income from rental RE with active participation (Part IV col a total)
- Line 1b: Net loss from rental RE with active participation (Part IV col b total) — positive
- Line 1c: Prior-year unallowed losses from rental RE with active participation (Part IV col c total)
- Line 1d: Combine 1a, 1b (negative), 1c (negative) → net rental RE result
- Line 2a: Net income from all other passive activities (Part V col a total)
- Line 2b: Net loss from all other passive activities (Part V col b total) — positive
- Line 2c: Prior-year unallowed from other passive (Part V col c total)
- Line 2d: Combine 2a, 2b (neg), 2c (neg) → net other passive result
- Line 3: Add lines 1d and 2d. If ≥ 0, all losses allowed (no PAL). If < 0, proceed to Part II/III.

**Part II — Special Allowance for Rental RE (Active Participation)**
- Only applies when line 1d is a loss (rental RE net loss exists)
- Line 4: Smaller of |line 1d| or $25,000
- Line 5: $150,000 (or $75,000 if MFS lived apart)
- Line 6: Modified AGI
- Line 7: Line 5 minus Line 6 (if ≤ 0, go to Part III with $0 allowance)
- Line 8: 50% of Line 7 (this is the phase-out reduction)
- Line 9: Smaller of Line 4 or Line 8 → special allowance

Modified AGI phase-out:
- MAGI ≤ $100,000: full $25,000 allowance
- $100,000 < MAGI < $150,000: allowance = $25,000 - 50% × (MAGI - $100,000)
- MAGI ≥ $150,000: $0 allowance
- MFS threshold: $75,000 (lived apart all year)

**Part III — Total Losses Allowed**
- Allowed PAL = passive income (lines 1a + 2a) + special allowance (Part II, line 9)
- Disallowed = overall PAL (|line 3|) - allowed
- Allowed amount gets routed to Schedule 1 as deductible rental loss

### Upstream Inputs (from schedule_e/index.ts)
schedule_e routes to form8582:
- `current_income`: sum of passive items with net > 0
- `current_loss`: sum of |net| for passive items with net < 0
- `prior_unallowed`: sum of prior unallowed passive operating + 4797 part1 + part2
- `has_active_rental`: true if any activity_type = "A"
- `has_other_passive`: true if any activity_type = "B"

### Output Routing
- Allowed passive loss → schedule1.line17_schedule_e (as negative value)
- If no PAL (overall gain), no output needed (upstream already sent full amounts)

### TY2025 Constants
- RENTAL_ALLOWANCE_MAX = 25_000
- MAGI_LOWER_THRESHOLD = 100_000
- MAGI_UPPER_THRESHOLD = 150_000
- PHASE_OUT_RATE = 0.50
