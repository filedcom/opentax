# Form 8958 — Allocation of Tax Amounts Between Certain Individuals in Community Property States

## Purpose
Disclosure/informational form used on **Married Filing Separately (MFS)** returns filed by spouses domiciled in a community property state. Shows how income, deductions, and credits are split between spouses. The engine records the allocation but does not reroute amounts — splitting happens at data entry time.

## IRS References
- Form 8958 and Instructions (2025)
- IRC §66(a) — treatment of community income
- IRS Pub. 555 (2024), "Community Property"

## Community Property States
Arizona, California, Idaho, Louisiana, New Mexico, Nevada, Texas, Washington, Wisconsin (`CommunityPropertyState` enum).

## Input Schema
- `state` — domicile state (must be a community property state)
- `allocation_items[]` — array of per-item allocation lines: `description`, `total_amount`, `taxpayer_share`, `spouse_share`
- `taxpayer_total_income` / `spouse_total_income` — summary totals
- `taxpayer_withholding` / `spouse_withholding` — withholding allocated to each spouse

## Compute Logic
Purely informational — `compute()` validates input and returns `{ outputs: [] }`. No downstream tax nodes.

## Output Nodes
None — `outputNodes = new OutputNodes([])`.

## Key Design Notes
- No tax computation produced; the node exists only to store allocation disclosure data.
- `state` is validated against `CommunityPropertyState` enum (not freeform string).
- All monetary fields are optional since taxpayers may fill partially.
