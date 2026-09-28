# TY2025 NOL carryforward source status

The present `nol_carryforward` input is not a valid source-to-deduction route.
It accepts a year, an asserted remaining NOL amount, a broad pre-2018 or
post-2017 label, and asserted current-year taxable income. It does not contain
the filed loss-year return, applicable Form 172 computation, intervening
modified-taxable-income carryover calculations, taxpayer ownership, or the
separate alternative-tax NOL ledger. A positive amount now rejects during
calculation and cannot lower AGI.

The [Form 172 instructions](https://www.irs.gov/instructions/i172) require
each original NOL to be established after disallowing excess capital losses,
nonbusiness deductions, the QBI deduction, and other excluded items. Each
carryback/carryforward year then reduces that vintage by its modified taxable
income; multiple NOLs are applied earliest first. An applicable Form 172 for
each NOL attaches to the carryforward-year Form 1040, while the regular NOL
deduction is a negative Schedule 1 entry. The [2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require an independently refigured AMT NOL and limitation for line 2f after
adding back the regular NOL on line 2e. No regular-to-AMT assumption is safe.

The existing MeF/PDF export guards still reject a populated NOL source or a
direct positive Schedule 1 line 8a amount. Form 6251 also rejects a direct
nonzero line 2f amount. Native Form 172, Schedule 1 line 8a export, and the
source-derived two-pass regular/AMT calculations are not built. See
`docs/mef/ty2025-form172-nol-gap.md` for the exact activation requirements.
