# Form 6252 — Installment Sale Income

## Purpose
Spreads recognition of gain from a property sale across tax years as payments are received. Depreciation recapture is always recognized immediately in the year of sale (cannot be deferred).

## IRS References
- Form 6252 and Instructions (TY2025)
- IRC §453 — Installment Method
- IRC §453(i)(1) — Recapture Income — Year of Sale

## Input Schema
- `selling_price` — total contract price before mortgage assumed (line 5)
- `gross_profit` — selling price − adjusted basis − expenses (line 10)
- `contract_price` — selling price minus mortgage assumed by buyer (line 15; IRC §453(b)(2))
- `payments_received` — installment payments received this tax year (line 17a)
- `depreciation_recapture` — §1245/§1250 recapture; recognized entirely in year of sale (IRC §453(i)(1))
- `is_capital_asset` — true (default) = capital gain → schedule_d; false = §1231 → form4797
- `is_long_term` — true (default) = long-term capital; false = short-term

## Compute Logic
1. **Depreciation recapture** → always emitted to `form4797.ordinary_gain` if > 0 (regardless of capital asset status)
2. If `payments_received = 0` → no installment income this year
3. **Gross profit ratio (GPR)** = `gross_profit / contract_price` (0 if contract_price = 0)
4. **Installment sale income** = `GPR × payments_received`
5. Routing by property type:
   - Capital + long-term → `schedule_d.line_11_form2439`
   - Capital + short-term → `schedule_d.line_1a_proceeds` (cost = 0)
   - §1231 → `form4797.section_1231_gain`

## Output Nodes
- `schedule_d` (line 11 or line 1a — capital gain)
- `form4797` (ordinary gain for recapture, or §1231 gain)

## Key Design Notes
- `is_capital_asset` and `is_long_term` both default to `true` (`!== false` check).
- Recapture is always `form4797.ordinary_gain` regardless of `is_capital_asset` flag.
- `contract_price` ≠ `selling_price` when buyer assumes a mortgage.
