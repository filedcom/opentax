# Form 6251 line 2i: Form 3921 source slice (TY2025)

The public `f3921` input now calculates a 2025 ISO exercise adjustment from Form 3921 box 3 (exercise price per share), box 4 (exercise-date fair market value per share), and box 5 (shares transferred). It sums positive exercise spreads and rounds the total to whole dollars. The existing Form 6251 computation then carries the result to AMTI, IRS6251 `IncentiveStockOptionsAmt`, and the 2025 PDF line 2i field.

This route requires affirmative facts that rights became transferable and were not subject to a substantial risk of forfeiture on exercise, that no acquired shares were disposed of during the exercise year, and that nothing was paid separately for the option. It rejects exercises outside 2025. Those bounds match the simple example in the [2025 Form 6251 line 2i instructions](https://www.irs.gov/instructions/i6251), which also says same-year dispositions need no line 2i adjustment and describes a separate election for restricted shares. The [Form 3921 instructions](https://www.irs.gov/instructions/i3921) identify boxes 2–5.

Restricted shares, a timely inclusion election, option purchase cost, partial or full same-year disposition, prior-year ISO stock sale, and AMT basis carryforward remain outside this route. The tests were written but not run during the build-first phase.
