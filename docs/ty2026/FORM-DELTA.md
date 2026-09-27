# TY2026 form topology changes to implement

Evidence here is from the IRS draft PDFs in `corpus/draft/`, captured
2026-09-27. Recheck final PDFs and current MeF XSD before coding serializers.

| Draft form/line | TY2026 requirement | Existing TY2025 code to inspect |
| --- | --- | --- |
| 1040 12e–15 | 12e is standard/itemized; new 12f is nonitemizer charitable deduction; 13a is Schedule 1-A line 44; 13b is QBI; line 14 sums all four. | `nodes/outputs/f1040/index.ts` computes line 14 from old keys; `2025/mef/forms/f1040.ts` and `2025/pdf/forms/f1040.ts` map old lines. |
| 1040 24a–24c | 24a is total tax before Form 1062 payment; 24b is Form 1062 line 15; 24c is their sum. Refund and amount due compare payments with **24c**. | Current output and CLI summary use `line24_total_tax`; extend 2026 domain keys and summary deliberately. |
| 1040 27–33 | 30 is refundable adoption credit; 32a sums refundable credits, 32b is Schedule 3-A, 32c subtracts 32b, and 33 sums 25d + 26 + 32c. | Current output computes one `line32_refundable_credits_total`; add Schedule 3-A result and route to line 33. |
| Schedule 3-A | New federal public benefit schedule. Required when claiming EIC, ACTC, refundable AOTC, or refundable adoption credit. Its Part I uses 1040 32a and 24a, then Part II asks eligibility/election questions and feeds 1040 32b. | New input facts, calculation, MeF/PDF descriptor, and validation. Avoid an execution cycle between the 1040 sink and this schedule: compute the pre-offset amounts upstream or in a shared pure calculator, then assemble final 1040. |
| Form 1062 / Schedule A | New qualified-farmland gain tax-payment deferral path; Form 1062 line 15 feeds 1040 24b. | New optional input/calculation/XML/PDF/attachment path. The May v1 XSD has `IRS1062Payment`; confirm current name and placement with v4+. |
| Form 8962 | Draft line 6 says 401% FPL is ineligible for PTC. Rev. Proc. 2025-32 §2.04 says the excess-advance-PTC repayment limitation is removed after 2025. | `nodes/intermediate/forms/form8962/index.ts` describes the TY2025 above-400% treatment; examine its repayment calculation, tables, and 1040/Schedule 2 routing. |
| Form 8839 and 1040 30 | Refundable adoption credit has a new 1040 payment line and may trigger Schedule 3-A. | Current form8839 and output routes; match the 2026 draft and Rev. Proc. adoption limits. |
| Schedule 1-A | Total additional deductions now enter 1040 line 13a; draft total is line 44. | `nodes/intermediate/forms/schedule1a/index.ts`, final output, MeF/PDF mappings. |
| 1040 identity/dependents | New work-authorization question and expanded dependent residence/credit checkboxes appear on the draft 1040. | `nodes/inputs/general`, filer identity, MeF header and 1040, PDF mapping, business rules. Treat the question as filing data, not as a derived answer. |

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
