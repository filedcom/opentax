# Form 6251 line 2i: Form 3921 source slice (TY2025)

The public `f3921` input now calculates a 2025 ISO exercise adjustment from Form 3921 box 3 (exercise price per share), box 4 (exercise-date fair market value per share), and box 5 (shares transferred). It sums positive exercise spreads and rounds the total to whole dollars. The existing Form 6251 computation then carries the result to AMTI, IRS6251 `IncentiveStockOptionsAmt`, and the 2025 PDF line 2i field.

This route requires affirmative facts that rights became transferable and were not subject to a substantial risk of forfeiture on exercise, that no acquired shares were disposed of during the exercise year, and that nothing was paid separately for the option. It rejects exercises outside 2025. Those bounds match the simple example in the [2025 Form 6251 line 2i instructions](https://www.irs.gov/instructions/i6251), which also says same-year dispositions need no line 2i adjustment and describes a separate election for restricted shares. The [Form 3921 instructions](https://www.irs.gov/instructions/i3921) identify boxes 2–5.

Restricted shares, a timely inclusion election, option purchase cost, partial or full same-year disposition, and prior-year ISO stock sales remain outside this route. The tests were written but not run during the build-first phase.

The bounded retained-share path now requires each payer-issued Form 3921
source to identify its distinct copy, corporation name/EIN, employee TIN, and
option grant date before the 2025 exercise date. Duplicate copies reject.
Native and PDF Form 6251 line 2i export reconcile the full claimed adjustment
to those copies and require each employee TIN to match the taxpayer or a
joint-filing spouse. A direct positive line 2i without matching Form 3921
source rejects at export. A sourced $240,000 ISO adjustment full-return XSD
fixture and negative source/recipient cases are written but unrun for the
agreed combined test pass. Form 3921 copy bytes, truncated recipient TIN
review and the wider ISO situations above remain open.

For each retained 2025 exercise lot, the source node now prepares a
cent-precision basis ledger keyed to its distinct Form 3921 copy. It records
remaining shares, regular basis (exercise price times shares), the nonnegative
exercise-date AMT adjustment, and resulting AMT basis. The node retains this
ledger in the return's prepared source bundle, and native and PDF line 2i
export require it to match the Form 3921 source copies exactly. This preserves
the basis difference described in the [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
for a future disposition. The ledger is prepared data, not an accepted-year
carryforward or a 2026 return import. A later-year lot disposition, regular
and AMT basis consumption, compensation reconciliation, and any adjustment to
Form 8949 still need their own source-backed route. Same-year dispositions
remain excluded by the input contract.

The retained-share ISO route now has a bounded preferential-rate Part III
combination: one ordinary Form 1099-DIV payer with positive box 1b qualified
dividends, no capital-gain distribution, foreign dividend/tax, nominee amount,
Form 4952 election, or other dividend source. The Form 6251 calculator already
refigures the qualified-dividend tax when the ISO adjustment raises AMT income.
Before native MeF or PDF export, the source guard matches box 1b to the
calculated qualified-dividend input and finalized Form 1040 line 3a, box 1a
to line 3b, and regular taxable income to Form 1040 line 15. It also requires
the Part III line 12/13/15 dividend amounts to match in the no-capital-gain-
excess case. A $180,000 retained-share ISO adjustment with $10,000 qualified
dividends has source, native, PDF-projection, and tamper fixtures written but
unrun. The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
direct qualified dividends through the AMT Part III worksheet. The 1099-DIV
recipient and dividend holding period are not independently established by
this source; multi-payer, pass-through, capital-gain, foreign, and election
combinations remain open.
