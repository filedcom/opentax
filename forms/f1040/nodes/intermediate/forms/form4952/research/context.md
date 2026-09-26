# TY2025 Form 4952 build-pass notes

Form 4952 limits deductible investment interest to net investment income and
carries the unused interest into 2026. Use the [2025 IRS Form 4952 and its
instructions](https://www.irs.gov/pub/irs-pdf/f4952.pdf), the
[Schedule D Tax Worksheet](https://www.irs.gov/instructions/i1040sd), and the
[Form 6251 instructions](https://www.irs.gov/instructions/i6251) as sources.

The input takes current interest expense, prior disallowed interest, other
investment-property income and expenses, plus affirmed 1099, K-1, and Form 8814
source amounts. It calculates lines 1 through 8, emits native Form 4952, routes
line 8 to Schedule A line 9, and records line 7 as a carryforward.

For any claimed interest expense, `amt_refigure` is required. Its prior-year
AMT disallowed interest is an independent source fact. Specific signed
adjustments refigure investment-property income, qualified dividends,
disposition/capital gain, and expenses. Interest on private-activity bonds that
would otherwise have been deductible is a separate source amount. Affirmed
1099-INT box 9 and 1099-DIV box 13 amounts flow to AMT Form 4952 line 4a only.
The engine calculates a second Form 4952, records its AMT carryforward, and
sends regular line 8 minus AMT line 8 to Form 6251 line 2c when Schedule A was
selected. The AMT form is a workpaper, not an attached MeF form.

Line 4g is an explicit election to include eligible qualified dividends and net
capital gain in investment income. The IRS normally attributes it first to
line 4e capital gain. `elected_capital_gain_portion` records the alternative
dotted-line attribution when the taxpayer chooses one, bounded by lines 4b,
4e, and 4g. The regular election routes to the Schedule D Tax Worksheet. AMT
Form 4952 line 4g is separately capped at the smaller of the regular election
and AMT lines 4b plus 4e; its attribution routes to Form 6251 Part III. Elected amounts lose their
preferential tax rates without changing Form 1040 lines 3a or 7.

This is not whole-form verification. The user requested a single full test batch
after the build pass, so these new cases are written but unrun. Broker and
non-portfolio AMT source derivation, other AMT basis adjustments,
foreign-tax interactions, PDF
layout, XML business rules, and ATS acceptance also remain open.
