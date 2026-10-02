# TY2025 railroad pension and SSEB source boundary

[IRS Publication 915 (2025)](https://www.irs.gov/publications/p915) and the [RRB's Form RRB-1099-R box explanation](https://rrb.gov/Benefits/IncomeTax/TXL1099R) distinguish two statements:

- **RRB-1099** reports the Social Security equivalent benefit (SSEB) in boxes 3, 4, and 5. Its box 10 carries federal withholding. Enter this statement in `ssa1099.ssas` with `is_rrb: true`; a negative box 5 offsets positive SSA-1099 or RRB-1099 box 5 amounts before Form 1040 line 6a and taxable-benefit calculation.
- **RRB-1099-R** reports pension components. Box 3 is employee contributions, boxes 4–6 are pension categories, box 7 is their gross total, box 8 is prior-year repayments, box 9 is federal withholding, and box 10 is Medicare premiums. This node never sends an SSEB amount to line 6a.

The RRB-1099-R route accepts fully taxable pension payments when no unrecovered employee contributions affect box 4. Positive pension or withholding requires the statement's box 2 recipient TIN and a match to the taxpayer or joint spouse at export. Box 7 must equal boxes 4–6 at cent precision. The gross box 7 amount reaches Form 1040 line 5a; the same fully taxable amount reaches line 5b and AGI. Box 9 reaches line 25b. Positive box 3 contributions with positive box 4 pension, or positive box 8 prior-year repayments, stop for cost-recovery or repayment review before filing. The former misnumbered fields are rejected; there is no alias.

Final native and PDF export replay box 7 against lines 5a/5b and box 9 against line 25b. Lines 5a/5b must equal the RRB amount when it is the only pension source; when Form 1099-R or substitute Form 4852 is also present, the RRB amount is a required minimum. Mixed-source pension aggregation and cost-basis methods need separate source-grounded review.
