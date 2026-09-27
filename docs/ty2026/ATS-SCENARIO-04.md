# TY2026 ATS Form 1040 scenario 4 fixture contract

Source: pinned [18-page IRS draft packet](corpus/ats/1040-scenario-04.pdf),
SHA-256 `ae8c0996690b9dc0430f2ecb86a6cf6d5f907be18a80a4c17719ee597bb1599f`.
The packet prints almost no calculated amounts. Preserve its source facts,
independent calculations, and application result as separate fixture columns.
Do not turn an unmarked answer into a false or a blank money field into zero.

| PDF page | Printed facts | Route / acceptance question |
| --- | --- | --- |
| 1 | Dani Lozano, SSN 400-00-1039, born February 5, 1997, U.S. citizen and legally blind. Dependents born July 4, 2018 and January 23, 2020. Dani is a full-time student. Adjusted qualified education expenses are $890; moving expenses are $1,325; no bona fide Puerto Rico residence. | Filer/dependent dates drive age tests; $890 belongs to Form 8863 line 27 after qualification. The moving expense requires an eligible Armed Forces or intelligence-community route and Form 3903 evidence, neither supplied. |
| 2–3 | Head of household checked, digital assets No, blind checked, two children marked as living with Dani in the U.S. and eligible for CTC. The main-home and filer citizenship/work-authorization boxes are blank, despite cover facts. 1040 money lines are blank. | Reconcile the cover's citizenship statement to 1040's answer. Establish HOH household-cost facts before filing; the packet's checked HOH box alone is not evidence of the cost test. Derive all 1040 amounts, including credit order and Schedule 3-A. |
| 4 | Publix Super Market, Inc., EIN 00-0000029, W-2 boxes 1/3/5 $35,545, box 2 $3,459, box 4 $2,204, box 6 $515. Box 10 is blank. | $35,545 wages → 1040 line 1a; $3,459 withholding → 25a. FICA withholding is not federal income-tax withholding. No W-2 dependent-care benefit is evidenced. |
| 5–6 | Schedule 1 lines, including line 14, are blank. | Its 2026 line 14 is limited to qualifying Armed Forces/intelligence-community moving expenses. Do not deduct the cover's $1,325 without occupation, move/order, eligible costs, and Form 3903 facts. Provisional AGI is $35,545 only if this and all other adjustments are zero. |
| 7–8 | Schedule 3 money fields blank. Schedule 3-A line 6 Yes, line 7 Yes, and line 8 Yes are checked; all its amounts blank. | Form 2441 line 11 → Schedule 3 line 2; Form 8863 line 19 → line 3. Compute Schedule 3-A only after EIC/ACTC/AOTC and 1040 tax are resolved. The citizenship answer supports Schedule 3-A line 8 Yes and its line 32b outcome of zero, subject to the completed form's eligibility evidence. |
| 9–10 | Form 2441 box B checked. Bloom Academy, EIN 00-0000041, $1,600 for Ezekiel; Wildflower Kids, EIN 00-0000042, $700 for Drina. Both providers are marked non-household employees; child SSNs are 400-00-1058 and 400-00-1057. Both children are under 13. Part II amounts blank; Part III line 23 prints 0 while other benefit lines are blank. | Qualified expense total is $2,300, below the two-person $6,000 ceiling. At $35,545 provisional AGI the [draft 2026 phaseout table](corpus/draft/i2441.pdf) gives **39%**, hence tentative $897 before tax-liability limitation, not a final line 11. Box B conflicts with a simple HOH/actual-wages case unless monthly deemed-income facts are provided; inspect its reason. Confirm the unmarked benefits question using box 10 and plan facts; do not infer receipt from a blank Part III. |
| 11–13 | December 2025 Form 8862: line 1 filing year blank and all three Part I line 2 credit-selection boxes blank. Part II line 3 No, line 4 No; Drina and Ezekiel each show 365 U.S. days, while line 6 Yes/No is blank. Part III names both children and marks Yes for questions 14–17. Part IV student 1 name blank, question 19a Yes and 19b No. | This is an **incomplete recertification form**. Supply prior disallowance/ban history, determine which credits need recertification, and complete line 1, line 2, line 6, and student name before claiming its attachment. If no active prior disallowance requires it, determine whether it should be attached at all. Do not treat the packet's attached form as proof that all three credits were disallowed. |
| 14–15 | Form 8863 names Dani as student at Florida Atlantic University, 777 Glades Road, Boca Raton FL 33431. 2026 Form 1098-T No, prior-year box-7 Form 1098-T No; institution EIN is **incomplete** (`00-00` only). Four prior AOTC years No, half-time Yes, first four years completed No, drug felony No. Money lines blank. | The cover's $890 would give tentative AOTC $890, refundable 40% = $356, nonrefundable 60% = $534 before tax limit. **Do not file AOTC yet:** the draft 2026 instructions require the institution EIN and a documented exception/procedure when 1098-T was not received. Determine expense payment and enrollment proof and any prior-year disallowance. |
| 16 | Schedule EIC lists Drina (2018), daughter, and Ezekiel (2020), son, each with 12 months in the U.S. | Two potential qualifying children; reconcile SSN validity, filer/dependent residency, age, filing status, investment income, and any Form 8862 condition. Use the final 2026 EIC table/instructions for the filed line 27a; the packet gives no expected credit. |
| 17–18 | Schedule 8812 lists no calculated amounts; two children are marked CTC eligible on 1040. No Puerto Rico residence. | Tentative CTC $4,400 before credit limit, ACTC ceiling $3,400. Credit Limit Worksheets A/B must include Form 2441 and Form 8863 in the printed 2026 order. Part II-B's three-child/PR route should not run on these facts. Independently derive lines 14 and 27 after tax and earned income are known. |

## Required calculation chain

`W-2 wages → AGI → HOH/blind deduction → tax → Form 2441 limit → Form 8863
nonrefundable limit → Schedule 8812 Worksheet A/CTC → EIC and ACTC → 1040
32a → Schedule 3-A → 1040 32b/32c → payments/refund`.
The actual 2026 credit-order resolver must follow the published worksheets;
the arrow list expresses prerequisites, not an invented priority where two
worksheets depend on the same tax amount. With no supported moving deduction,
the first provisional bridge is wages/AGI **$35,545**, W-2 federal withholding
**$3,459**, care expenses **$2,300**, and AOTC expenses **$890**. These are
not an approved return or an ATS expected refund.

## Acceptance gates

1. Add explicit filing facts for HOH household costs, the 1040 citizenship
   answer, any moving-expense eligibility, 1098-T exception, institution EIN,
   Form 2441 box B months, and prior credit-disallowance history. Report a
   source conflict rather than silently inventing them.
2. Feed completed Form 2441 and Form 8863 nonrefundable credits into Schedule
   3 before Schedule 8812's credit-limit worksheet. Reconcile 1040 lines 19,
   20, 27a, 28, 29, 32a–c and both dependent rows.
3. Require Form 8862's selected credits and detail to agree with actually
   claimed EIC/CTC/AOTC and the prior disallowance facts. Print Form 8862,
   8863, Schedule EIC, 2441, 8812, 3 and 3-A when required.
4. Validate the complete pending record, rendered PDF, MeF XML against the
   selected current TY2026 XSD/rules, and ATS case. A local XSD pass alone
   does not establish IRS ATS acceptance. The [credit graph contract](FORM8862-8863-EIC-GRAPH.md)
   identifies the current code gaps.
