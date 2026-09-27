# TY2026 Schedule 1 graph and print contract

Source: pinned `corpus/draft/f1040s1.pdf`, SHA-256
`a017a1b717d1c70ff8d831ef8b73c730e5b24f147c394c37f792035a9df22fad`.
The PDF contains a draft cover followed by two printed pages. The
`pdf-fields-f1040s1.csv` inventory records 73 widgets, all in the AcroForm
tree. Recheck this mapping against the final 2026 form.

The TY2025 `schedule1` output node is a sink. Income sources independently
deposit amounts into it and into `agi_aggregator`; the AGI node separately
calculates Form 1040 lines 8 and 10. For 2026, a Schedule 1 attachment must
reconcile its printed lines 10 and 26 to those two main-form amounts. Merely
registering the TY2025 sink would print wrong line positions and could hide
a difference between the two calculations.

| 2026 printed area | Current source/AGI key | Required 2026 disposition |
| --- | --- | --- |
| Header 1099-K erroneous/personal-loss amount | no dedicated key | Add taxpayer fact and distinguish from taxable 1099-K business or asset sales. |
| Line 2a/2b alimony received and agreement date | `line2a_alimony_received` | Add agreement date and verify AGI line 8 includes 2a. |
| Line 4 gain/loss checkboxes | `line4_other_gains` | Preserve Form 4797 versus 4684 source and print the corresponding box. |
| Line 7 unemployment repayment | `line7_unemployment` | Preserve the repayment amount/election, then reconcile the net filed amount. |
| Line 8b gambling | `line8b_savings_bond_exclusion` is misnamed for this line | Keep Form 8815 exclusion on Schedule B line 3; do not print this legacy field as gambling. Add an actual gambling source. |
| Line 8d foreign earned income | `line8d_foreign_earned_income_exclusion` | Print the exclusion as a parenthesized amount. |
| Line 8g Alaska dividends | `line8g_child_interest_dividends` is unrelated | Add an Alaska dividend source; do not relabel child interest/dividends. |
| Lines 8s and 8v | no dedicated keys | Add Medicaid-waiver exclusion and ordinary digital-asset income with matching AGI routes. |
| Line 8z typed other income | several `line8z_*` source keys | Preserve type/amount rows and attach a statement when one printed row is insufficient. |
| Lines 9/10 | AGI's `scheduleOnePartI` | Recompute from filed detail and require line 10 = Form 1040 line 8. |
| Line 13 HSA deduction | `line13_hsa_deduction`; `line13_depreciation` is unrelated | Print only the HSA amount. Audit Form 4562's old line 13 depreciation route; do not put it in this field. |
| Line 18 early-withdrawal penalty | 1099-INT `line18_early_withdrawal` | Print the amount and include it once in AGI adjustments. |
| Line 19 alimony paid | old `line19_student_loan_interest` is unrelated | Add agreement date and recipient SSN; route student-loan deduction to 2026 line 21. |
| Line 21 student loan interest | `line19_student_loan_interest` raw source | Use AGI's phaseout-adjusted amount, then print it on line 21. |
| Line 24h attorney fees | old `line24h_dpad` is repealed | Reject the legacy field for 2026; add attorney-fee source facts. |
| Line 24j foreign housing deduction | `line8d_foreign_housing_deduction` | Move from Schedule 1 Part I exclusion to Part II line 24j; keep AGI unchanged while correcting Form 1040 lines 8/10. |
| Lines 25/26 | AGI's above-line deduction total | Recompute from filed detail and require line 26 = Form 1040 line 10. |

## Implementation sequence

1. Add a TY2026 Schedule 1 node with a filed-line schema. Map established
   source keys whose meaning is unambiguous, such as the 1099-INT box 2
   penalty. Reject ambiguous legacy keys instead of printing a plausible but
   wrong line.
2. Make AGI publish its finalized Schedule 1 line 10/26 amounts and its
   adjusted student-loan deduction to the 2026 sink. Check each printed
   total against Form 1040 line 8/10. Correct the year-specific housing and
   other misrouted amounts before enabling their public sources.
3. Fill the two printed PDF pages from the 73-field inventory, including
   explanations, dates, checkboxes, and continuation statements where a
   single printed row is insufficient.
4. Add the selected current MeF schema mapping. Exercise 1099-INT box 2,
   alimony, unemployment repayment, student-loan phaseout, Form 2555, and
   multi-type 8z scenarios through calculation, PDF, XML, and TY2025
   regression gates.

Current slice: `nodes/schedule1.ts` accepts established unambiguous source
keys, maps raw student-loan interest to AGI's adjusted 2026 line 21, and
rejects the identified legacy misroutes. The AGI node supplies finalized
line 10/26 totals; the Schedule 1 node and PDF filler each reconcile them.
The draft PDF filler covers the mapped fields and removes the cover. A
1099-INT box 2 focused graph produces a five-page 1040/Schedule 1/Schedule B
PDF that passed text extraction and visual inspection. Form 1098-E is now a
registered TY2026 input: a $2,500 source amount at $90,000 MAGI produces a
$1,667 line 21 deduction, the same 1040 line 10 amount, and a four-page
1040/Schedule 1 PDF. The other rows above remain implementation work; this
is not yet a public 1099-INT input path.

1099-G source audit: the payer's Form 1099-G reporting minimums are
not income exclusions. The shared source now routes every positive taxable
amount, including amounts below those payer minimums. For TY2026, a state
refund input requires `box_2_taxable_amount`, bounded by box 2; prior-year
itemization alone does not determine how much tax benefit was received. The
TY2025 `box_2_prior_year_itemized` behavior remains for existing callers,
but should be replaced with an explicit tax-benefit calculation there too.
Form 1099-G is now a registered TY2026 input for unemployment, including a
same-year repayment and the draft Schedule 1 repayment checkbox/amount;
tax-benefit-adjusted state refunds; federal withholding; RTAA payments; and
taxable grants. The latter two sources are typed Schedule 1 line 8z entries.
One type prints directly; multiple types print a reconciled total and a
continuation statement. Agricultural payments, CCC market gain, box 8
business refunds, and the new 2026 box 10 family-leave benefits raise a
TY2026 diagnostic before routing any amount. The TY2026 input schema accepts
renumbered state boxes 11a/11b/12 and rejects the older 10a/10b/11 names.
Those unsupported branches still need complete graph and print routes.
Registered integration tests reconcile Schedule 1 line 10 to Form 1040 line 8,
check withholding on line 25b, and build the 1040/Schedule 1 PDF, including
the five-page version with a line 8z statement. The statement page was also
checked by PDF text extraction and rendering.
IRS references: [Form 1099-G instructions](https://www.irs.gov/instructions/i1099g),
[Publication 525](https://www.irs.gov/publications/p525).
The [1099-G source contract](FORM1099G-GRAPH.md) pins the final 2026 form,
instructions and family-leave ruling and defines the unsupported branches.
