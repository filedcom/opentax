# TY2026 form topology changes to implement

Evidence here is from the IRS draft PDFs in `corpus/draft/`, captured
2026-09-27. Recheck final PDFs and current MeF XSD before coding serializers.

| Draft form/line | TY2026 requirement | Existing TY2025 code to inspect |
| --- | --- | --- |
| 1040 11a–11b, 25a–25d, 27b–27c, 34–38 | AGI is printed on 11a and carried to 11b; withholding sources occupy 25a–25c and sum on 25d; EIC has clergy/decline checkboxes; overpayment can be divided between refund 35a and 2027 estimates 36, while penalty is line 38. | The 2026 core node emits these lines; the dedicated 2026 main-form PDF descriptor maps them against the pinned draft. Finish all upstream sources, CLI summary, MeF, and full PDF bundle. |
| 1040 12e–15 | 12e is standard/itemized; new 12f is nonitemizer charitable deduction; 13a is Schedule 1-A line 44; 13b is QBI; line 14 sums all four. | `nodes/outputs/f1040/index.ts` computes line 14 from old keys; `2025/mef/forms/f1040.ts` and `2025/pdf/forms/f1040.ts` map old lines. |
| 1040 24a–24c | 24a is total tax before Form 1062 payment; 24b is Form 1062 line 15; 24c is their sum. Refund and amount due compare payments with **24c**. | Current output and CLI summary use `line24_total_tax`; extend 2026 domain keys and summary deliberately. |
| 1040 27–33 | 30 is refundable adoption credit; 32a sums refundable credits, 32b is Schedule 3-A, 32c subtracts 32b, and 33 sums 25d + 26 + 32c. | Current output computes one `line32_refundable_credits_total`; add Schedule 3-A result and route to line 33. |
| Schedule 3-A | New federal public benefit schedule. Required when claiming EIC, ACTC, refundable AOTC, or refundable adoption credit. Its Part I uses 1040 32a and 24a, then Part II asks eligibility/election questions and feeds 1040 32b. | New input facts, calculation, MeF/PDF descriptor, and validation. Avoid an execution cycle between the 1040 sink and this schedule: compute the pre-offset amounts upstream or in a shared pure calculator, then assemble final 1040. |
| Schedule A | Draft adds mortgage-insurance-premium line 8d/8e and moves gifts to charity to lines 11–15, with a Charitable Contribution Limitation Worksheet at line 13 and carryover at line 14. IRS Publication 505 Worksheets 2-5/2-6 apply a 0.5% AGI charitable floor and a 5.4% overall itemized limit above the top bracket threshold. | `nodes/inputs/schedule_a/index.ts` and TY2025 PDF/MeF maps use old lines. The two pure 2026 limit functions are implemented; build the year-specific Schedule A node, carryforward attribution, and source-backed field maps. |
| W-2 / Schedule 1-A | Final 2026 W-2 instructions add box 12 TP for cash tips, TT for qualified overtime, and box 14b occupation codes; draft Schedule 1-A Part II compares W-2 TP with Form 4137 tips by employer. | W-2 TP/TT and Form 4137 source facts now reach Schedule 1-A. A focused graph applies the employer-level larger-of rule; mixed occupations require an explicit qualified amount. The complete TY2026 return graph and W-2 serializers remain. |
| Schedule 2 / Schedule 8812 | Draft Schedule 2 rearranges Part II into income and employment sections; draft Schedule 8812 line 22 cites new Schedule 2 lines 16c and 17c. | [Line-by-line dependency map](SCHEDULE2-8812.md) and pure 2026 Schedule 2 totals exist. Build the year-specific graph node, source splits, and 2026 Schedule 8812 Part II-B contract before dependent returns. |
| Form 1062 / Schedule A | New qualified-farmland gain tax-payment deferral path; Form 1062 line 15 feeds 1040 24b. | New optional input/calculation/XML/PDF/attachment path. The May v1 XSD has `IRS1062Payment`; confirm current name and placement with v4+. |
| Form 8962 | Draft line 6 says 401% FPL is ineligible for PTC. Draft line 27 sends the full excess APTC to Schedule 2 line 1a; lines 28–29 are reserved. Rev. Proc. 2025-32 §2.04 removes the repayment limitation after 2025. | `nodes/intermediate/forms/form8962/index.ts` now dispatches percentage, repayment, and QSEHRA affordability rules by tax year; finish the 2026 FPL config, PDF/MeF line map, and final instruction check. |
| Form 8839 and 1040 30 | Refundable adoption credit has a new 1040 payment line and may trigger Schedule 3-A. | Current form8839 and output routes; match the 2026 draft and Rev. Proc. adoption limits. |
| Schedule 1-A | Total additional deductions now enter 1040 line 13a; draft total is line 44. | `nodes/intermediate/forms/schedule1a/index.ts`, final output, MeF/PDF mappings. |
| 1040 identity/dependents | New work-authorization question and expanded dependent residence/credit checkboxes appear on the draft 1040. | `general` now carries TY2026-only taxpayer/spouse answers and the main-form PDF maps their yes/no boxes. Dependent rows, MeF identity fields, and business rules remain. Treat the question as filing data, not as a derived answer. |

## End-to-end propagation check

For each changed line, trace: raw input schema → node compute → pending key →
1040/schedule aggregation → CLI summary → validation field registry → MeF
element → PDF field → ATS fixture. A line is finished only when the entire
trace has a 2026 source citation and a test. The TY2025 output node is a sink
that currently computes tax, refundable credits, and balance together; the
Schedule 3-A dependency makes this a design issue, not just renaming fields.

The draft Form 1040 prints standard deduction amounts of $16,100 Single/MFS,
$32,200 MFJ/QSS, and $24,150 HOH, consistent with Rev. Proc. 2025-32.
These are examples of sourced constants; `CONSTANTS.md` maps the full config.

The May 2026 MeF v1 package predates at least some of this public draft
topology. Do not infer a current XML tag from a printed line name. Acquire
current v4+ XSD/rules, diff them against v1 and TY2025v5.4, and update this
table with confirmed XML element names before final serializers are built.
