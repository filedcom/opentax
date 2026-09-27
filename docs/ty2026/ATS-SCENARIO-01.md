# TY2026 ATS Form 1040 scenario 1 fixture plan

Source: pinned [11-page scenario 1 PDF](corpus/ats/1040-scenario-01.pdf),
listed in the [IRS ATS index](https://www.irs.gov/e-file-providers/tax-year-2026-form-1040-series-and-extensions-modernized-e-file-mef-assurance-testing-system-ats-information).
The scenario packet is a **draft**. Its printed 1040 has mostly empty
calculation lines, so derive expected amounts from the attached source forms;
do not copy blank lines as zeros.

| PDF pages | Printed source fact | Fixture input and expected route |
| --- | --- | --- |
| 1 | Sadie Long, SSN 400-00-1032, U.S. citizen; packet says assume Form 1062 and Schedule A attached | Filer identity and work-authorization answer. Model the Form 1062 tax amount through 1040 line 24b and its attachment, rather than treating the packet's assertion as a generated form. |
| 2–3 | Draft 2026 Form 1040; line 24b shows $200 | Recompute the whole return. Compare lines 1a/1z, 11b, 15–24c, 25a/25d, 32a–33, and final refund/balance to independently calculated values. |
| 4 | Garden Path W-2: box 1 $30,000; box 2 $1,650; boxes 3/5 $30,000; boxes 4/6 $1,860/$435 | First W-2 source. |
| 5 | Dobbin's Hardware W-2: box 1 $18,100; box 2 $2,400; boxes 3/5 $18,100; boxes 4/6 $1,122/$262 | Second W-2 source. Wage total is $48,100; federal withholding total is $4,050. |
| 6–7 | Schedule 2; Schedule H household-employment tax reaches line 17a | Preserve the page 1/page 2 Schedule 2 topology and reconcile line 21 to 1040 line 23. |
| 8 | Schedule 3; Form 5695 line 3 flows to line 5a | Reconcile Schedule 3 line 8 to 1040 line 20. |
| 9–10 | Schedule H: A Yes, $4,100 subject to Social Security and Medicare tax; $0 Additional Medicare wages and withheld income tax; **line 9 No**; page 2 FUTA section blank | Calculate Social Security at 12.4% and Medicare at 2.9% (whole-dollar lines 2/4: $508/$119). Line 8 is $627 and goes directly to Schedule 2 line 17a. Do not create a FUTA amount or a line 26 from the annual wages. |
| 11 | Form 5695 is the four-line **carryforward-only** 2026 form; scenario states a $200 credit from the 2025 Form 5695 line 16 | Apply the pinned [2026 credit-order plan](FORM5695-CREDIT-GRAPH.md) and residential clean energy credit limit worksheet. Route the smaller of carryforward and limit to Schedule 3 line 5a; carry unused credit to 2027. Do not use the old 2025 Form 5695 line topology. |

## Acceptance work

1. Encode the two W-2 records, filer answers, Schedule H household wages and
   checked line 9 No answer, 2025 Form 5695 carryforward provenance, and assumed
   Form 1062 facts in a typed fixture. Record the source PDF hash and page for
   every field. Where the packet omits an input needed by a worksheet, mark it
   as a required fixture assumption rather than inventing an IRS value.
2. Independently calculate Schedule H line 8, the Form 5695 limit, Schedule 3,
   Schedule 2, income tax, Form 1062, and the final 1040. Store source facts,
   expected amounts, and application results in separate columns.
3. Register 2026 Schedule H, Form 5695, and Form 1062 calculation and PDF
   routes before calling this scenario end-to-end. The current 2026 graph does
   not yet supply those three attachments.
4. Produce the full PDF bundle and compare every printed amount and attachment
   count. Build and XSD/business-rule-check the XML only against the selected
   current TY2026 MeF package. The local May v1 package is unsuitable for this
   September draft, as explained in [MEF-V1-DRIFT.md](MEF-V1-DRIFT.md).
