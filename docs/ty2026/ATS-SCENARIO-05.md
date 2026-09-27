# TY2026 ATS Form 1040 scenario 5 fixture contract

Source: pinned [five-page IRS draft scenario 5 packet](corpus/ats/1040-scenario-05.pdf),
SHA-256 `fb94f6a34c6419243e2ca55a94e060a6664bc2730ebfc20cbaef1a893031b30b`.
The packet embeds a **December 2026** Form 8888 revision, while the separately
pinned public [draft Form 8888](corpus/draft/f8888.pdf) and
[instructions](corpus/draft/i8888.pdf) are **November 2026** revisions
(SHA-256 `035ddccf75b0cef5cc065bca6beded3babd4395fd3df5f3dcc8b90e08f81e437`
and `2dba8a99cd4d9498dd2d1d7d28050033ace5e338c05b6ce79dd17ab383bac735`).
Do not assume their final widget or MeF mappings are identical. Keep printed
source, independently calculated expectation, and application output separate.

| PDF page | Printed source facts | Fixture route and verification |
| --- | --- | --- |
| 1 | Sam Wheat, SSN 400-00-1037, born February 7, 1986, U.S. citizen. Cover lists 1040, one W-2, and Form 8888; direct **$1,000 to savings** and the remainder of the refund to checking. | Treat the $1,000 as an allocation instruction, not a deduction or tax payment. The actual checking amount depends on the independently computed refund. |
| 2–3 | Single, TX address, no dependents, digital-assets **No**. Main-home and citizenship/work-authorization answers are unmarked, despite the cover's citizenship statement. All monetary 1040 lines are blank. The line 35a Form 8888 checkbox is **unmarked** even though the form is attached; 35b–35d direct-account fields are blank. | Reconcile citizenship source to the form answer. Derive tax, line 34 overpayment, and line 35a refund. Check line 35a's Form 8888 indicator in the completed return, leave the single-account fields empty, and attach Form 8888. The packet's unchecked indicator is an ATS source conflict, not a reason to omit the form. |
| 4 | W-2 from Doughnut Castle, EIN 00-0000057: box 1/3/5 wages $50,510; box 2 federal withholding **$10,268**; boxes 4/6 Social Security and Medicare withholding $3,132/$732. | Wages → 1040 line 1a/1z/9, federal withholding → line 25a/25d. FICA withholding does not enter federal income-tax payments. |
| 5 | Form 8888: first account routing **012345672**, checking, account **12345678**; second account same routing, savings, account **1234567**; third account empty. Amounts on lines 1a/2a/5 are blank. | After line 35a is calculated, line 2a = $1,000; line 1a = line 35a − $1,000; line 5 = line 35a. Account numbers differ despite the same bank routing number. Validate the nine-digit routing number and each account type/number; do not serialize an empty third account. |

Assuming no additional income or adjustments, provisional AGI is **$50,510**.
The 2026 single standard deduction is $16,100, so taxable income would be
**$34,410** before any unprinted deduction. Final tax must use the applicable
2026 tax table or required worksheet and current instructions; the packet
prints no tax. The known positive payment is $10,268 of W-2 withholding.
Compute the refund before calculating the Form 8888 checking remainder, and
reject the split if the refund is less than $1,000.

## Current route and acceptance order

1. The shared [Form 8888 input](../../forms/f1040/nodes/inputs/f8888/index.ts)
   is metadata-only: it emits no result, is absent from the 2026 registry,
   does not reconcile account amounts to the computed refund, and still has
   savings-bond inputs absent from the pinned 2026 form. Model only current
   2026 account rows and connect them to the finalized 1040 line 35a.
2. Add a refund-allocation stage after the existing [2026 settlement](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2026/settlement.ts).
   Require a positive refund, two or three complete deposit rows (a single
   deposit uses 1040 direct-deposit fields), at least $1 per row, valid
   routing and account data, account uniqueness under the selected MeF rules,
   and sum of allocations exactly equal to line 35a.
   The instruction “remainder to checking” is resolved from the final refund,
   then the final amounts are frozen for both XML and PDF.
3. Map the pinned [20-widget Form 8888 draft inventory](pdf-fields-f8888.csv):
   year/header, rows 1–3 amounts, routing/account fields, checking/savings
   buttons, and line 5. The public draft has a cover plus one form page;
   inspect the rendered form and 1040 together, including the 1040 line 35a
   Form 8888 checkbox. The packet's December revision must be rechecked
   against the final published form before field mapping is declared stable.
4. Build the 2026 Form 8888 MeF serializer and validation from the current
   authorized TY2026 schema and rules. The TY2025 rule set has refund-sum,
   1040 matching, and account uniqueness checks, but the [TY2025 F8888 rules](../../forms/f1040/validation/rules/f8888.ts)
   reference old XML shapes such as `RefundByCheckAmt`. Diff rather than
   copying them. Verify `Form8888Ind`, attachment presence, absence of 1040
   single-account fields, row count, amount sum, and account uniqueness.
5. Run the same calculated return through CLI, PDF, XML/XSD/rules, and ATS
   scenario 5. Regression-check TY2025's single-account and multi-account
   refund routes. The [May v1 MeF drift review](MEF-V1-DRIFT.md) remains a
   gate for current-year XML acceptance.
