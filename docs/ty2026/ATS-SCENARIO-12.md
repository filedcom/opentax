# TY2026 ATS Form 1040 scenario 12 fixture contract

Source: pinned [37-page IRS draft packet](corpus/ats/1040-scenario-12.pdf),
SHA-256 `6d44ae53fe842b804258ca1a49400f0cc5d15a17b6fdb0cc74c016927b54c9bf`.
Keep printed amounts, independently derived amounts, and application output in
separate fixture fields. A printed amount that contradicts another page is a
diagnostic, not an expected result. The cover lists four binary attachments;
the downloaded PDF contains **no embedded attachment payloads** (`pdfdetach`
and the PDF attachment tree both report zero). Obtain those payloads before
testing a complete electronic return.

| PDF pages | Printed source facts | Independent route and acceptance question |
| --- | --- | --- |
| 1 | Sam Gardenia, SSN 400-00-1212; lists 1040, Schedules 1/2/3/C/SE, Form 3800 with Schedule A, Form 4562-B, Forms 7205/7207/7220, and W-2. Lists signed Schedule A, its statement, Form 7205 certification, and “Form 7207 Designer Allocation” binary attachments. | Preserve attachment names and provenance. A designer allocation belongs to the Form 7205 deduction; resolve the cover's “Form 7207” label against the actual binary before assigning its MeF attachment type. |
| 2–3 | Single; no dependents; digital assets No. 1040 lines 1a $100,836, 8 $8,661, 9 $109,497, 10 $612, 11b $108,885, 12e $16,100, 15 $92,785, 16/18 $15,125, 20 $10,000, 22 $5,125, 23 $1,224, 24c $6,349, 25a $14,444, 35a $8,095. Main-home and citizenship/work-authorization boxes blank. | Tax calculation: $5,800 + 22% × ($92,785 − $50,400) = $15,124.70 → $15,125. The printed tax/refund reconcile arithmetically **if** the $10,000 business credit is valid. Obtain affirmative filer answers rather than mapping blanks to No. No QBI deduction appears on line 13b despite Schedule C profit; determine eligibility and Form 8995/8995-A treatment before accepting taxable income. |
| 4–5 | Schedule 1 line 3/10 $8,661; line 15/26 $612. | Schedule C profit → additional income; half SE tax → AGI adjustment. |
| 6–7 | Schedule 2 line 4/15/21 $1,224. | Schedule SE tax → Schedule 2 → 1040 line 23. |
| 8 | Schedule 3 line 6a/7/8 $10,000. | **Allowed** Form 3800 credit, after its limitations and transfer proof, reaches Schedule 3 line 6a and 1040 line 20 exactly once. |
| 9–10 | Schedule C gross receipts $25,235. Expenses: insurance $550, legal/professional $125, office $1,000, rent $2,500, supplies $6,532, Form 7205 §179D deduction $5,000 on line 27a, and Form 4562-B amortization $667 on line 27b/Part V line 48. Profit $8,661. | Expenses sum $16,574; $25,235 − $16,574 = $8,661. Use one activity ID to own both downstream deductions and QBI/SE effects. |
| 11–12 | Schedule SE: profit $8,661, net earnings $7,998, W-2 Social Security wages $105,878, wage base $184,500, remaining base $78,622, SE tax $1,224 and deduction $612. | $8,661 × 92.35% rounds to $7,998; the printed tax and half-deduction reconcile at whole dollars. Confirm exact per-line rounding in current instructions. |
| 13–23 | Eleven-page Form 3800. Part I lines 1/6 $10,000; Part II lines 7/9/11/12/16/27 **$16,147** and lines 17/28/38 $10,000; line 29 $6,147. Part III line 1b identifies Form 7207 registration **PG0012300005** and $10,000 in transfer column (f), combined column (g), and net EPE column (j); EPE column (h) is blank. B(i) Yes, B(ii) one transfer statement. | Form 3800 line 7 explicitly starts with 1040 line 16 plus Schedule 2 line 1z. Those pages show $15,125 and no line 1z amount, so the independent line 7/9/11/12/16/27 is **$15,125**, and line 29 is **$5,125**, on the packet's other stated assumptions. Column (j) cannot be $10,000 when its column (h) is blank. Registration must reconcile to Schedule A and the underlying credit form. Preserve both printed and corrected chains in tests. |
| 24 | Form 4562-B: $10,000 start-up cost, Code §195, begins January 1, 2026, 15-year period; line 3 amortization $667. | Asset/election record → per-year amortization → Schedule C Part V $667. Check the expense and any §195 immediate deduction against current authority; the packet only prints amortization. |
| 25–29 | Form 7207 names Sam as filer, facility registration **PG0012300001**, placed in service February 7, 2025. Part II photovoltaic cells 250,000 DC watts × $0.04 = $10,000; line 8a $10,000 to Form 3800 Part III line 1b. | Arithmetic is $10,000. Determine who **earned** this credit: the attached Schedule A names Solar Co as transferor and Sam as transferee for the *same* registration. A purchased credit should not be represented as Sam's own production. The 2025 service date also needs reconciliation to a 2026 production-credit claim. |
| 30–34 | Form 7220 names the Johnson project, began January 1, 2025, service May 2, 2026. It selects Form 7205, PLA Yes, wage-correction No, good-faith exception No, alterations/repairs Yes. Part II lists Electrical Co, EIN 123456789, two workers, 100 hours and $12,500 total; Part III apprenticeship rows are blank. | The form's own line 5 directs completion of Parts II **and III** for this path. Determine required apprentice hours, exemptions, and supporting payroll/PLA evidence. A blank Part III is not evidence that the apprenticeship requirement was met. |
| 35 | Schedule A (Form 3800): Solar Co/EIN 00-0001212 is transferor; Sam is transferee; Form 7207, registration **PG0012300001**, $10,000 sold and paid October 1, 2026. Transferor earned $10,000; 2026 year-end; certifications checked. Printed signature blocks are blank. | Registration conflicts with Form 3800 **PG0012300005**. The signed PDF named `Schedule A Form 3800` is listed on the cover but missing from the downloaded packet. Validate signed transfer statement, consideration and transferor documentation before allowing a transfer-in amount. |
| 36 | Form 7205: Sam claims as designer. Building 7205 Main St, 50% computed energy savings, 10,000 square feet, printed $1/sq ft and $10,000 potential; cost $10,000, designer allocation $5,000, line 3 deduction $5,000. Certifier John Smith; owner Steven Johnson and representative Katie Gates. | The pinned 2025 instructions' **2026 indexed table** gives $0.59 at 25% savings plus $0.02 per point, up to $1.19 at 55%, before any qualifying increase. At 50% the ordinary rate is $1.09, so the printed $1 is stale or unsupported; resolve the increased-deduction box and Form 7220 evidence. The $5,000 allocation may still limit the final deduction, but recalculate the complete form rather than copying that result. |
| 37 | W-2 from Design LLC: box 1 $100,836, box 2 $14,444, boxes 3/5 $105,878, boxes 4/6 $6,564/$1,535; KY withholding $3,420. | Box 1 → 1040 line 1a, box 2 → 25a, box 3 → Schedule SE wage-base test. State withholding is not federal withholding. |

## Reconciliation gates

1. Select the legally supported credit provenance: Sam's own Form 7207
   production **or** a Solar Co §6418 transfer. A single $10,000 credit cannot
   be claimed in both roles. Reconcile registration `PG0012300005` against
   `PG0012300001`, credit owner, 2025 service date, and the signed Schedule A.
2. Derive Form 3800's tax limitation from the *calculated* 1040/Schedule 2
   values. Flag the packet's $16,147 as a mismatch. Distinguish ordinary
   credit, transfer-in, and elective payment columns; a blank EPE amount must
   not produce a $10,000 net EPE amount.
3. Recalculate Form 7205 with the 2026 indexed rate, qualified certification,
   allocation, and PWA facts; finish Form 7220 Part III or document the
   applicable exception. Obtain the actual certification/allocation binaries.
4. Decide the QBI deduction and the blank 1040 eligibility answers from
   independently documented facts. Recompute taxable income and all affected
   credits/tax/refund if QBI changes line 13b.
5. Validate all pages, actual binary attachments, field-level PDF rendering,
   and XML against the **current** TY2026 MeF package and business rules. The
   downloaded Drive package is May v1; it is a research baseline, not proof
   of current ATS acceptance.

See the [business credit graph contract](GENERAL-BUSINESS-CREDIT-GRAPH.md)
for implementation order and the [Form 4562-B contract](FORM4562B-GRAPH.md)
for the amortization source.
