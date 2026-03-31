# Form 8283 — Noncash Charitable Contributions — Scratchpad

## Purpose
Section A (≤$5k items) and Section B (>$5k, appraisal required). Routes total FMV → Schedule A line 12.

## Fields
- section_a_items[]: fmv, fmv_method (FMVMethod enum), cost_basis, is_vehicle, is_clothing_household
- section_b_items[]: fmv, cost_basis, appraiser info, is_capital_gain_property

## Rules
- Section B capital gain property: deduction = min(fmv, cost_basis)
- Vehicles >$500: 1098-C required
- Section B >$5k: qualified appraisal required
