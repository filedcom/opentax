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

## Current implementation on the rebuilt branch

Checked October 15, 2026. This replaces the old prototype registration claims.
`nodes/schedule1.ts` accepts established source keys, uses AGI's adjusted
student-loan amount for line 21, rejects the listed legacy misroutes and checks
its line 10/26 totals against finalized AGI. Its output now retains the parsed,
rounded calculation input as `calculation_input_2026`, so the PDF builder can
recompute the same sink rather than trusting edited print totals.

`pdf/schedule1.ts` verifies the pinned three-page source and all 73 canonical
fields/widgets, fills the two printed pages and removes the cover. It checks
line 10 against Form 1040 line 8 and line 26 against Form 1040 line 10, rejects
an unneeded attachment, and validates filer name/SSN syntax. Identity matching
to the complete return belongs to the still-pending bundle assembler.

The existing educator, moving/storage and investment-penalty routes now have
printable Schedule 1 destinations. Negative income retains its sign; NOL and
FEIE amounts use the parentheses already printed on the IRS form. Repayment
and storage-only facts mark their corresponding checkboxes. The storage-only
flag retains an attachment even when the amount rounds to zero. Raw student-loan
interest never substitutes for the AGI-adjusted line 21 deduction.

The sink also retains original alimony-agreement date, both Form 4797/4684
source answers and the IRA MFS-lived-apart answer. The PDF refuses nonzero
alimony, other gains or IRA deductions when those print facts are missing.
These are internal print contracts; adding metadata does not establish the
source's eligibility or enable its public input route. The original agreement
date and future source-form/IRA facts must come from their validated owners.

Multiple line 8z income types print on a reconciled statement. A single type
that cannot fit legibly also gets a statement. Descriptions wrap and paginate
without losing text, and each statement page carries filer identity and the
line total. All output pages are static, retain draft warnings and have no
widgets or AcroForm tree. Unsupported 1099-K header, alimony-paid, housing,
gambling and other line sources remain blank and are not enabled by this work.

## Verification and remaining gates

Five focused tests cover signed income, original dates, statements, adjusted
student-loan placement, storage-only attachment, missing facts, stale AGI/main-
form totals, long-description pagination and connected source calculation.
The connected test derives $350 of educator expenses plus a rounded $101
investment penalty, retains the sink input and prints the $451 Form 1040
adjustment. Component fixtures exercise other mapped fields without claiming
that their public source routes are registered.

Seven synthetic QA pages were rendered with Poppler and visually inspected,
including checked gain/repayment/storage/IRA fields, signed NOL/FEIE, the two
printed pages, a multi-type statement and a two-page long-description statement.
All 288 current-2026 tests passed, as did the repository unit/preflight gate.
Complete remaining source ownership, 1099-G public inputs, Form 2555 coordination,
complete attachment selection, current MeF and ATS acceptance remain unfinished.


The [student-loan source route](./STUDENT-LOANS-CURRENT.md) now supplies reviewed
1098-E/payment records through the shared cap and 2026 AGI phaseout to line 21.
The draft bundle prints that finalized amount and omits a Schedule 1 whose only
potential deduction is completely phased out.
