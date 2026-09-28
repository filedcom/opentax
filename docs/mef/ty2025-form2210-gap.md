# TY2025 Form 2210 mandatory filing paths

## Current boundary

The IRS generally computes an underpayment penalty without a filed Form 2210. A standalone asserted penalty can still flow to Form 1040 line 38. However, a selected Part II filing reason requires Form 2210, and the public input does not yet contain enough verified source facts to calculate and reconcile a filed form. Both MeF and PDF exports therefore reject `f2210` when any of these flags is true: `waiver_requested` (box A or B not distinguished), `partial_waiver_requested` (B), `annualized_method` (C), `actual_withholding_dates_method` (D), or `joint_filing_status_change` (E), or when `box_e_source` is present. The calculation node emits no line 38 amount for those branches, even if an asserted `underpayment_penalty` is supplied.

The [2025 Form 2210](https://www.irs.gov/pub/irs-prior/f2210--2025.pdf) and [instructions](https://www.irs.gov/instructions/i2210) require a full calculation and attachment for boxes B, C, or D. Boxes A and E generally require only page 1 when B/C/D do not also apply. A partial waiver additionally needs a calculated pre-waiver penalty and requested waiver amount. A waiver requires an explanation and evidence. Box C requires Schedule AI and quarterly underpayment calculations.

## Staged box E page-1 calculation

`form2210_box_e.ts` defines a strict, expense-free box E source and calculates Part I lines 1-9 for a narrow case: a 2025 joint return after two distinct full-year 2024 married-filing-separately returns; no included other taxes, refundable credits, Schedule 3 line 11 withholding, or section 965 exclusion; and no 110% prior-year safe-harbor branch. It rejects the under-$1,000, no-prior-tax, and line 8-not-less-than-line 5 cases. It does not calculate a penalty because box E alone permits the IRS to compute it.

The current source's `filed_return_reference` and SHA-256 strings are caller-supplied assertions. The executor does not ingest the filed 2024 return bytes, verify the digests, or extract the line amounts from them. The 2025 tax and withholding values in `box_e_source` are also caller-supplied rather than joined to executor-owned finalized Form 1040 pending data. Therefore the staged calculation is **not** a filing path: there is no native `IRS2210` or PDF descriptor and the both-export guard remains unconditional for `box_e_source`. Do not exempt it based on the presence of a plausible digest or the computed lines.

## Source contract needed before activating native/PDF

- Derive Part I lines 1-9 from finalized 2025 Form 1040 tax after credits, specified other taxes and refundable credits, withholding, plus a sourced 2024 return covering 12 months. Reconcile line 38 and any Form 2210 line 19 to the finalized return rather than trusting an isolated amount.
- Capture actual payment transactions with dates and withholding timing. The four quarterly aggregate fields cannot determine Part III late-payment days or box D's actual-withholding method. Build the line 10-18 installment carry, applicable daily rate periods, and line 19 worksheet.
- For box A/B, capture waiver scope, reason, affected dates, pre-waiver penalty, requested waived amount, explanatory statement, and supporting retirement/disability/casualty records. A single `waiver_requested` boolean cannot determine A versus B, and an asserted zero penalty does not prove an approved waiver.
- For box C, capture period-by-period adjusted gross income, deductions, QBI, tax, self-employment tax, other taxes, credits, and any special tax worksheets for Schedule AI lines 1-36. Reconcile its line 27 installments to Part III line 10.
- For box E, capture both filed-year statuses and source 2024 return facts proving the joint-status change and line 8 less than line 5. Then page-1-only native and PDF paths may be possible, with any simultaneous B/C/D reason taking the full-form route.
- Build a canonical Form 2210 line result, then map the TY2025 `IRS2210` XSD and official PDF from that result. Include a waiver explanation binary attachment when applicable. Do not register a token document merely because the XSD marks individual line elements optional.

Focused guard and node cases were written but not run during the build-first phase. Full tests, XSD/business-rule validation, PDF rendering, and ATS acceptance remain pending.
