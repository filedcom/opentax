# Form 8978, partner's additional reporting year tax

This is a TY2025 Form 1040 research note, not evidence of IRS acceptance.
The previous draft proposed a default 37% marginal-rate calculation and a
positive Schedule 2 route. Both were incorrect and have been removed.

## Source and computation

- A partner uses the Form 8986 adjustments, including affected and intervening
  years, to prepare Schedule A (Form 8978). Audit and AAR sources require
  separate Forms 8978 and Schedules A. More than four affected years require
  additional form pairs.
- Each affected-year column starts with original or previously adjusted
  income, deductions, credits, and income-tax liability. Schedule A supplies
  signed income, deduction, and credit adjustments.
- Lines 5-11 require an actual affected-year tax recomputation, not the
  reporting-year rate or a fixed maximum rate. Attach an explanation showing
  the corrected taxable income, income tax, AMT, and liability. If penalties
  apply, attach their calculation too.
- Line 13 is corrected liability after credits minus the originally reported
  liability. Line 14 sums signed line 13 amounts across columns. If multiple
  Forms 8978 are filed, add their line 14 amounts for the reporting-year route.

## TY2025 reporting-year route

- Positive net line 14 goes to Form 1040 line 16 with box 3 labeled
  `FORM 8978`.
- Negative net line 14 uses the Form 1040 Schedule 3 line 6l worksheet: credit
  up to Form 1040 line 18. Remaining negative amount may offset applicable
  chapter 1 taxes on Schedule 2 line 17z, but not unrelated taxes.
- Form 6251 line 10 subtracts the absolute value of a negative Form 8978 line
  14. Any Schedule J refigure remains to be audited.
- Penalties and interest are not part of line 14. Their computation and payment
  paths require separate review.

The positive path and native MeF documents are in the current build pass but
have not yet passed the requested full-batch tests. The negative path currently
fails explicitly. See `product_board.md` for the release gate.

Sources: [Form 8978 instructions](https://www.irs.gov/instructions/i8978),
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi), and
the local TY2025v5.4 IRS MeF XSD bundle.
