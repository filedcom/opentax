# Form 6252 — Installment Sale Income

## Purpose

Spreads recognition of gain from a property sale across tax years as payments
are received. Depreciation recapture is always recognized immediately in the
year of sale (cannot be deferred).

## IRS References

- Form 6252 and Instructions (TY2025)
- IRC §453 — Installment Method
- IRC §453(i)(1) — Recapture Income — Year of Sale

## Input Schema

The return-level `form6252` input is an array of sale items. The node receives
`{ f6252s: [...] }`, computes each sale separately, and adds recognized gains by
Schedule D or Form 4797 destination. MeF emits one IRS6252 document per sale.

- `property_description`, `date_acquired`, `date_sold`, `sold_to_related_party`,
  and `selling_price_determinable` identify the sale for MeF. The current
  supported path is a determinable-price, unrelated-party sale.
- `selling_price`, `mortgage_assumed`, `cost_basis`, `depreciation_allowed`,
  `selling_expenses`, and `excluded_gain` provide Form 6252 lines 5-18.
- `gross_profit` and `contract_price` are optional cross-checks against
  calculated lines 16 and 18.
- `payments_received` — installment payments received this tax year (line 21)
- `payments_received_prior_years` — line 23; required for a sale before 2025.
- `depreciation_recapture` — §1245/§1250 recapture; recognized entirely in year
  of sale (IRC §453(i)(1))
- `is_capital_asset` — true (default) = capital gain → schedule_d; false = §1231
  → form4797
- `is_long_term` — true (default) = long-term capital; false = short-term

## Compute Logic

1. **Depreciation recapture** → emitted separately to
   `form4797.recapture_form6252` if > 0 (regardless of capital asset status).
   This is Form 6252 line 12, not the separate ordinary-income amount on
   line 25.
2. When sale facts are supplied, calculate Form 6252 lines 5-26. Line 17 is the
   excess assumed mortgage over adjusted basis, selling costs, and recapture;
   line 20 includes that excess only in the year of sale. The current-year
   taxable installment amount is line 19 times line 22, not merely current-year
   cash receipts.
3. Without sale facts, the existing aggregate computation uses
   `gross_profit / contract_price × payments_received`. This calculation-only
   input cannot be filed in MeF.
4. Routing by property type:
   - Capital + long-term → `schedule_d.line_11_form2439`
   - Capital + short-term → `schedule_d.line_4_other_st`
   - §1231 → `form4797.section_1231_gain` with `gain_form6252` source for Part I
     line 4

## Output Nodes

- `schedule_d` (line 11 or line 4 — capital gain)
- `form4797` (source-tagged depreciation recapture, or §1231 gain)

## Key Design Notes

- `is_capital_asset` defaults to `true`. For a detailed sale, the holding period
  comes from the acquisition and sale dates, and an explicit `is_long_term` must
  agree with those dates.
- Recapture is retained as `form4797.recapture_form6252` regardless of
  `is_capital_asset` flag. The MeF path still needs Form 4797 Part III property
  detail and fails closed rather than placing line 12 recapture on Form 4797
  line 15. Detailed depreciated-property sales also fail closed until
  §1245/§1250 and unrecaptured-gain treatment is modeled.
- Related-party and indeterminable-price sales need Part III or special
  computation and are not yet emitted.
- Filing requires whole-dollar sale facts, a date-supported holding period, and
  an IRS-schema-valid Form 6252. A raw aggregate alone cannot produce a valid
  attachment.
- `contract_price` is not simply `selling_price - mortgage_assumed` when the
  assumed debt exceeds the line 13 basis and expense total.
