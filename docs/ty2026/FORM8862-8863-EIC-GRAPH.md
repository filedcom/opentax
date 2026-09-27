# TY2026 credit recertification, education, and EIC graph contract

Sources: the pinned [December 2025 continuous-use Form 8862](corpus/authorities/f8862--2025.pdf)
and [instructions](corpus/authorities/i8862--2025.pdf), the
[2026 draft Form 8863](corpus/draft/f8863.pdf) and
[instructions](corpus/draft/i8863.pdf), the
[2026 Form 1098-T tuition statement](corpus/authorities/f1098t--2026.pdf)
and its [combined 1098-E/T instructions](corpus/authorities/i1098et--2026.pdf), the
[2026 draft Schedule EIC](corpus/draft/f1040sei.pdf), and the
[ATS scenario 4 packet](corpus/ats/1040-scenario-04.pdf), pages 11–16.
Hashes are in `corpus/manifest.json`. Refresh final forms/instructions and
current MeF rules before filing. Form 8862 has 109 AcroForm widgets, Form
8863 has 77, and Schedule EIC has 38; see `pdf-fields-f8862.csv`,
`pdf-fields-f8863.csv`, and `pdf-fields-f1040sei.csv`.

## Source-to-output order

| Input facts | Calculation/attachment | Output and validation |
| --- | --- | --- |
| Prior IRS disallowance by **credit**, year, reason, subsequent allowance, and any 2-/10-year ban | Decide whether Form 8862 is required for EIC, CTC/ACTC/ODC, and/or AOTC. An ordinary math/clerical correction does not trigger recertification. The December 2025 instructions list exceptions after a later allowance and for a specified childless-EIC case. | Require a true filing year on line 1 and exactly the applicable line 2 credit selections; attach only when required. A checked form without the disallowance history is insufficient. |
| Filer and qualifying-child identity, SSN validity, residency days, relationship, age/student/disability and duplicate-claim facts | EIC eligibility; Schedule EIC up to three child rows; Form 8862 Part II only when EIC recertification is selected | EIC → 1040 line 27a; Schedule EIC attachment when child-based EIC claimed. Complete 8862 questions 3–8 or 9–11 according to the actual route; reconcile each child across 1040, EIC, 8812, and 8862. |
| W-2 and other earned income, AGI, investment income, status, combat pay election and EIC opt-out | Use 2026 credit limits and **the required 2026 EIC table/worksheet**, not an unverified continuous formula; compare earned-income and AGI table results exactly as the final instructions direct | 1040 27a, 27b/27c decisions, and Schedule 3-A presence. Final 1040 instructions/EIC table remain a source gate in this corpus. |
| Child age, SSN, residency, dependency and valid taxpayer SSN; recertification history | Schedule 8812 and Form 8862 Part III when CTC/ACTC/ODC recertification selected | Schedule 8812 line 14 → 1040 line 19; line 27 → line 28. Its Credit Limit Worksheet A includes earlier Schedule 3 credits. |
| Per-student SSN, enrollment, prior AOTC years, first-four-years, felony, 1098-T receipt/exception, institution identity/address/**EIN**, payments, tax-free aid, and adjusted expenses | Form 8863 Part III lines 20–30 for AOTC or 31 for LLC; Part I/II phaseout and refundable split. An absent 1098-T needs the documented 2026-instruction exception/procedure; AOTC requires the institution EIN. | Form 8863 line 8 → 1040 line 29; line 19 → Schedule 3 line 3. Use the Credit Limit Worksheet after Schedule 3 lines **1, 2, 6d, and 6l**. If AOTC was disallowed, complete Form 8862 Part IV with student name and questions 19a–b. |
| Form 2441 provider/person/expense and deemed-income facts | Form 2441 credit after AGI and tax-liability limit | Line 11 → Schedule 3 line 2 **before** Form 8863's Credit Limit Worksheet and Schedule 8812 Worksheet A. See [Form 2441 contract](FORM2441-GRAPH.md). |
| EIC + ACTC + refundable AOTC and 1040 tax/payments | 1040 line 32a and Schedule 3-A Part I/II | Schedule 3-A → 1040 line 32b; 32c = 32a − 32b. Reconcile Schedule 3-A line 8 eligibility and the 1040 citizenship/work-authorization answer. |

The [2026 Form 8863 instructions](corpus/draft/i8863.pdf) specify the
education Credit Limit Worksheet: line 4 takes 1040 line 18; line 5 sums
Schedule 3 lines 1, 2, 6d, and 6l; line 7 limits nonrefundable education
credits. The [2026 Schedule 8812 instructions](corpus/draft/i1040s8.pdf)
then supply their own Worksheet A/B order. Resolve both from calculated tax
and credit producers in one dependency graph; do not let a user-entered
worksheet total bypass them.

## Form 1098-T source ledger for Form 8863

The final 2026 Form 1098-T is pinned at SHA-256
`f461d17ce14de4efb4d95936c8639434861dbf174da250ac777f50cd1883c692`.
The combined 2026 instructions are pinned in the [1098-E source
plan](FORM1098-1098E-GRAPH.md). One tuition statement is evidence for
payments and attendance, not a computed education credit. Keep student,
institution/EIN, payer, academic period and corrected-form IDs across all
statements and expense/aid ledgers.

| Statement box | TY2026 Form 8863/return handoff |
| --- | --- |
| Box 1 current payments | Reconcile actual qualified expenses paid in 2026 with billing, term dates and the payer. The box is net of same-year reimbursements but **not** reduced by box 5 scholarships/grants. Add documented eligible expenses not included in the institution's box 1 under the AOTC or LLC rules, then subtract tax-free assistance/other double benefits. Do not use box 1 as `aoc_adjusted_expenses` or `llc_adjusted_expenses` directly. |
| Boxes 4 and 6 prior-year corrections | Associate a tuition refund or scholarship reduction with the original tax year and actual credit claimed. Recompute the prior credit/recapture or amendment outcome under its year rules; neither is an automatic reduction/increase to 2026 expense. Preserve a separate current-year box 1/5 reconciliation. |
| Box 5 scholarships/grants | Classify by grant restrictions and use against qualified expenses; reconcile Pell, employer assistance, 529 distributions and any taxable scholarship income without using one dollar twice. The institution reports grants it administers, so absence from box 5 does not prove no assistance. |
| Box 7 future academic period | Box 7 on a **2026** statement means January–March **2027**; it may support the payment-timing rule for the 2026 credit. Form 8863's separate prior-year question asks whether a **2025** Form 1098-T had box 7 checked. Do not answer that question from the current box 7. |
| Boxes 8/9 half-time and graduate | Use for AOTC half-time and first-four-years inquiries, with actual enrollment/transcript evidence when the form is missing or incomplete. Graduate status is not a stand-alone LLC approval or AOTC disallowance without the applicable student history. |
| Box 10 insurer reimbursements; institution EIN/identity | Reduce or recover the expense in the correct payment year; preserve the institution EIN needed for AOTC/Part III, including the documented no-form exception. Determine from current MeF whether the 1098-T source itself is filed or only Form 8863 detail is filed. |

The shared [`f8863` input](../../forms/f1040/nodes/inputs/f8863/index.ts)
asks for 1098-T receipt booleans and accepts a caller-supplied adjusted
expense, but has no source boxes, academic-period or prior-year correction
record. Its `prior_year_1098t_received` name is broader than Form 8863's
specific **2025 box 7** question. Before enabling the 2026 credit, build
the per-student expense/aid ledger and derive those adjusted amounts and
answers. Test tuition reported without a credit, books not in box 1,
scholarship allocation, box 4 recapture, box 6 prior-year grant reduction,
2026 box 7 versus 2025 box 7, insurer refund and a valid no-form exception.

## Current code gap and build sequence

1. The shared [EIC node](../../forms/f1040/nodes/intermediate/forms/eitc/index.ts)
   has 2026 indexed constants but emits `line27_eitc` to the **TY2025** 1040
   node. It is absent from the 2026 registry, and its continuous formula must
   be reconciled to the 2026 EIC table. Build a TY2026 route with explicit
   child details and eligibility diagnostics; do not infer valid SSNs or
   residency from names alone. Add Schedule EIC PDF/MeF attachment.
2. The shared [Form 8862 input](../../forms/f1040/nodes/inputs/f8862/index.ts)
   only forwards `form8862_filed` to TY2025 EIC/8812/8863 nodes and is absent
   from the 2026 registry. Add prior-disallowance decision facts, derive the
   required selected credits, and route complete Part II–IV records to a
   2026 pending form. Reconcile children/student with current-year claims.
   Map the pinned 109-widget continuous-use PDF and current 2026 MeF
   attachment/rules, including extra-child/student statements. TY2025 has a
   MeF serializer but no Form 8862 PDF descriptor to carry forward.
3. The shared [Form 8863 node](../../forms/f1040/nodes/inputs/f8863/index.ts)
   still sends results to TY2025 `f1040` and `schedule3` nodes and permits
   absent AOTC qualification answers. Add a 2026 filing input with required
   institution EIN, 1098-T exception evidence, qualifying expenses after aid,
   student eligibility, and Form 8862 decision. Split refundable and
   nonrefundable outputs and wire the latter after Form 2441 in the credit
   resolver. The ATS 2026 form pages are 14–15; map the pinned 77-widget
   draft to both pages and recheck the final fillable form before filing.
   TY2025 has a MeF serializer but no Form 8863 PDF descriptor to adapt.
4. Complete Schedule 8812, Schedule 3, Schedule 3-A, and 1040 credit
   reconciliation from those outputs. Add focused cases for EIC with 0/1/2/3
   children, EIC decline, disallowed credit with and without a ban, AOTC
   refundable age limitation, missing 1098-T exception, missing EIN,
   simultaneous 2441/AOTC/CTC limits, and ATS scenario 4's source conflicts.
5. Validate rendered forms and MeF XML against the selected **current**
   TY2026 XSD/active rules; record current schema version and source hashes.
   The downloaded May v1 package cannot prove this route.

For scenario 4 specifically, the Form 8862 line 1 and all line 2 boxes are
blank, its EIC line 6 answer is blank, and the AOTC student name is blank.
Form 8863 has an incomplete institution EIN and no 1098-T. Those are fixture
gates, not implied zeros or permissions to claim the credits.
