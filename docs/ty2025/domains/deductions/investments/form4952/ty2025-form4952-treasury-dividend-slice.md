# TY2025 Form 4952 Treasury interest plus ordinary dividends

Build status: written 2026-09-28, **unrun**. No full test batch, typecheck,
TY2025 XSD, filled-PDF review, IRS business-rule result, or ATS acceptance is
claimed.

The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) includes
gross income from property held for investment on line 4a and removes qualified
dividends on line 4b. The
[IRS Form 1099-INT instructions](https://www.irs.gov/instructions/i1099int)
identify box 3 as interest on U.S. savings bonds and Treasury obligations;
[2025 Publication 550](https://www.irs.gov/publications/p550) confirms that
Treasury interest is federally taxable. This is not a tax-exempt-interest route.

The existing source node already adds unadjusted 1099-INT boxes 1 and 3 once to
Form 4952's `source_1099_interest` and Form 1040 line 2b. The existing combined
1099-INT/1099-DIV MeF and PDF reconciliation now accepts a box-3 amount, alone
or with box 1 from the same affirmed investment-property payer. It matches each
payer's box-1-plus-box-3 amount to the Form 4952 source deposit, recalculates
every numbered Form 4952 line, and joins the aggregate to finalized Form 1040
line 2b, ordinary dividends to line 3b, the deduction to Schedule A line 9, and
the selected itemized total to Form 1040 line 12e. The already-bounded optional
qualified-dividend amount remains removed on line 4b and joined to Form 1040
line 3a.

Foreign-source/tax facts, premium, accrued-interest, nominee and other
adjustments, a capital-gain component, election components, or an AMT refigure
outside zero adjustments still reject. The distinct, unadjusted Treasury box 3
plus taxable 1099-OID box 1 combination is separately reconciled, including one
ordinary 1099-DIV box 1a payer. For a directly traced, owner-owned
taxable-securities loan, the three-payer route requires three distinct payer
names and source-document references. It replays both interest amounts and the
dividend into Form 4952 line 4a, Form 1040 lines 2b/3b, Schedule A line 9, and
native/PDF Form 4952. A full-return positive and changed document, amount, and
owner fixtures are authored but unrun. Qualified dividends, additional payers,
and issuer/lender byte authentication remain outside this direct-loan
combination. The K-1/1099-INT path remains box-1-only. Positive source/MeF/PDF
cases for box 3 alone and box 1 plus box 3, and negative cases for premium and
finalized Form 1040 mismatch are written but unrun. Debt tracing, taxpayer
investment-purpose affirmation, source-document authentication, and IRS
acceptance remain separate gates.
