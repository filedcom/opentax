# Form 8815 — Exclusion of Interest From Series EE and I U.S. Savings Bonds

## Purpose
Excludes interest from qualifying Series EE (issued after 1989) and Series I bonds when proceeds are used for qualified higher education expenses (QHEE). Subject to modified AGI phaseout. Routes to **Schedule B** as an exclusion.

## IRS References
- Form 8815 and Instructions (TY2025)
- IRC §135 — Income from United States Savings Bonds Used to Pay Higher Education Tuition and Fees
- Rev. Proc. 2024-40 (TY2025 phaseout thresholds)

## TY2025 Phaseout Thresholds (IRC §135(b)(2))
| Filing Status | Phaseout Start | Phaseout End |
|---|---|---|
| MFJ / QSS | $145,200 | $175,200 |
| Single / HOH | $96,800 | $111,800 |
MFS is **ineligible** (IRC §135(d)(1))

## Input Schema
- `ee_bond_interest` — total interest from qualifying bonds redeemed (Form 8815 line 6)
- `bond_proceeds` — total proceeds (principal + interest) redeemed (line 5)
- `qualified_expenses` — QHEE paid (reduced by tax-free educational assistance; line 9)
- `modified_agi` — MAGI for phaseout (AGI before this exclusion; line 11)
- `filing_status` — determines phaseout range; MFS = ineligible

## Compute Logic
1. If `ee_bond_interest = 0` → `{ outputs: [] }`
2. If `filing_status = MFS` → ineligible → `{ outputs: [] }`
3. If `qualified_expenses = 0` → no exclusion
4. `proportionalExclusion`:
   - If `expenses >= proceeds` → full interest excluded
   - Else: `interest × (expenses / proceeds)`
5. `applyPhaseout(exclusion, magi, start, end)` — linear reduction over phaseout range
6. Routes to `schedule_b.ee_bond_exclusion`

## Output Nodes
- `schedule_b` (ee_bond_exclusion)

## Key Design Notes
- `bond_proceeds` defaults to `interest` when not provided (conservative: assumes all proceeds = interest, which overstates exclusion but avoids divide-by-zero).
- Phaseout is proportional (linear), not a cliff — `exclusion × (1 - excess/range)`.
- MFS is ineligible regardless of other conditions (IRC §135(d)(1)).
