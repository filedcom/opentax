# Form 4797 Scratchpad

## Key Decisions

### Scope for individual 1040
Form 4797 is complex; for a 1040 engine we focus on the flows that affect individual tax:

1. **Part I (Section 1231)** — Net gain from sales of business property held > 1 year
   - Line 2: List of individual property dispositions
   - Line 6: Section 1231 gain from installment sales (Form 6252)
   - Line 7: Net §1231 gain or loss
   - Line 8: Nonrecaptured §1231 losses from prior years (treated as ordinary income)
   - Line 9: Section 1231 gain after recapture — goes to Schedule D line 11

2. **Part II (Ordinary Gains/Losses)** — Property held ≤ 1 year or recapture
   - Line 10: Ordinary gains/losses not on lines 11–16
   - Lines 19–24: Part III recapture amounts flow here (line 13 = recaptured ordinary income from Part III)
   - Line 18b: Net §1231 gain recaptured as ordinary income (from line 8)
   - Line 18a: Smaller of loss or loss from income-producing property → Schedule A
   - Line 20: Ordinary gain/loss total

3. **Part III (§1245/§1250 Recapture)** — Depreciation recapture
   - Lines 19–24: Per-property recapture computation
   - Line 24: Recognized gain
   - Line 25: §1245 recapture (lesser of line 22 or line 24)
   - Line 26: §1250 recapture (additional depreciation)
   - Line 31: Ordinary income (recaptured depreciation) → flows to Part II line 13

### What inputs do we receive?
- `disposed_properties` count from schedule_e (indicator to file form4797)
- Direct per-property sale data from Drake 4797 screen

### Output routing
- Part I net §1231 gain → schedule_d `line_11_form2439` (LT gain line on Sch D)
- Part II ordinary gain → schedule1 `line4_other_gains` (but schedule1 doesn't have this field yet)
- Part III ordinary recapture → flows into Part II, then to schedule1

### Simplification for 1040 engine
Rather than modeling every line of Parts I/II/III, accept:
- Pre-computed section_1231_gain (Part I net gain after recapture)
- Pre-computed ordinary_gain (Part II total ordinary gain)
- These map to the known downstream nodes

## Input from schedule_e
`disposed_properties: number` — count of disposed items. This is an indicator field.
The actual sale data must come directly from a 4797 screen input.
