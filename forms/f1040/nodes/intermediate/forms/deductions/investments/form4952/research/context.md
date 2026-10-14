# TY2025 Form 4952 build-pass notes

Form 4952 limits deductible investment interest to net investment income and
carries the unused interest into 2026. Use the
[2025 IRS Form 4952 and its instructions](https://www.irs.gov/pub/irs-pdf/f4952.pdf),
the [Schedule D Tax Worksheet](https://www.irs.gov/instructions/i1040sd), and
the [Form 6251 instructions](https://www.irs.gov/instructions/i6251) as sources.

The input takes current interest expense, prior disallowed interest, other
investment-property income and expenses, plus affirmed 1099, K-1, and Form 8814
source amounts. It calculates lines 1 through 8, emits native Form 4952, routes
line 8 to Schedule A line 9, and records line 7 as a carryforward.

The 2025
[partnership K-1 instructions](https://www.irs.gov/instructions/i1065sk1) put
box 13 code H investment interest on Form 4952 line 1, and the 2025
[S corporation K-1 instructions](https://www.irs.gov/instructions/i1120ssk) do
the same for box 12 code H. This bounded source route requires a payer EIN and
source-document reference, accumulates multiple code H amounts on line 1, and
asks for an explicit no-duplicate assertion if manual interest is also entered.
The generic S corporation box 12 deduction field cannot coexist with code H
because its unspecified aggregate may already contain that interest.
Debt-financed distribution code AC, working-interest code AD, and non-K-1
interest allocation remain unsupported rather than being inferred.

The [2025 Partner K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
direct box 20 code B investment expenses to Form 4952 line 5. The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-pdf/f4952.pdf) limit
that line to noninterest expenses otherwise allowed on the partner's return,
exclude passive-activity deductions, and disallow miscellaneous itemized
deductions for 2025. The partnership feeder therefore accepts only a
payer-identified code B amount with a separately established, no-greater allowed
amount for nonpassive investment-property depreciation or depletion. Only that
allowed amount reaches `source_k1_allowed_investment_expenses` and line 5 in
the calculation. This does not itself establish the deduction on another
return line. Until a source-linked return deduction can be reconciled to that
amount, positive code B inputs are rejected from MeF and PDF export. Other
code B categories and broker expenses remain outside this narrow source route.
If separate manual line 5 expenses are also entered, the filer must affirm
they exclude the sourced K-1 amount so the two fields do not count the same
expense twice.

For any claimed interest expense, `amt_refigure` is required. Its prior-year AMT
disallowed interest is an independent source fact. Specific signed adjustments
refigure investment-property income, qualified dividends, disposition/capital
gain, and expenses. Interest on private-activity bonds that would otherwise have
been deductible is a separate source amount. Affirmed 1099-INT box 9 and
1099-DIV box 13 amounts flow to AMT Form 4952 line 4a only. The engine
calculates a second Form 4952, records its AMT carryforward, and sends regular
line 8 minus AMT line 8 to Form 6251 line 2c when Schedule A was selected. The
AMT form is a workpaper, not an attached MeF form.

Line 4g is an explicit election to include eligible qualified dividends and net
capital gain in investment income. The IRS normally attributes it first to line
4e capital gain. `elected_capital_gain_portion` records the alternative
dotted-line attribution when the taxpayer chooses one, bounded by lines 4b, 4e,
and 4g. The regular election routes to the Schedule D Tax Worksheet. AMT Form
4952 line 4g is separately capped at the smaller of the regular election and AMT
lines 4b plus 4e; its attribution routes to Form 6251 Part III. Elected amounts
lose their preferential tax rates without changing Form 1040 lines 3a or 7.

The no-election 1099-DIV export route now accepts affirmed investment-property
box 1b qualified dividends when each box 1b is no greater than its box 1a. It
matches every payer amount to the Form 4952 source fields, reconciles line 4b
and all numbered lines, and checks Form 1040 lines 3a/3b and Schedule A line 9
before MeF or PDF projection. This does not open the line 4g election, capital
gain distributions, foreign-source dividends, or Form 1116 allocation paths;
those still stop at export. The focused cases are written but unrun.

This is not whole-form verification. The user requested a single full test batch
after the build pass, so these new cases are written but unrun. Broker and
non-portfolio AMT source derivation, other AMT basis adjustments, foreign-tax
interactions, PDF layout, XML business rules, and ATS acceptance also remain
open.
