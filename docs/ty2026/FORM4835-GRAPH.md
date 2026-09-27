# TY2026 Form 4835 farm-rent contract

Sources: pinned [2026 draft Form 4835](corpus/draft/f4835.pdf), SHA-256
`5429b781b4f26ae981022e00accb2ce40bbe3db0017f6c004a70441d8b49ce37`,
and [September 21 draft instructions](corpus/draft/i4835.pdf), SHA-256
`37d68265aae539290c8187bb80252ec7baef0a61995e7e8126581d9fceffeeeb`.
The form is a one-page attachment. The draft separates its instructions from
the form and adds vehicle-loan interest line 19b.

## Activity boundary and printed lines

Form 4835 is for a landowner or sublessor receiving **crop or livestock shares
based on production**, converted to cash or equivalent, without material
participation for self-employment-tax purposes. The printed line A asks a
different question: whether the owner **actively participated** in managing
the rental. Preserve both facts. A tenant or materially participating owner
belongs on Schedule F; flat cash rent belongs on Schedule E Part I. The
instructions also distinguish partnership/S corporation and estate/trust
owners. A qualified joint venture may require separate spouse forms.

| Form location | Input and downstream rule | Existing-code gap |
| --- | --- | --- |
| Header and A | Filer, EIN, activity identity, active-participation answer. | [Shared input](../../forms/f1040/nodes/inputs/f4835/index.ts) has `activity_name` and optional `actively_participated`, but needs an affirmative 2026 classification for material participation, rent type, and owner. |
| Lines 1–7 | Production-based receipts, 1099-PATR distributions, agricultural payments, CCC election/forfeiture, crop-insurance receipt/deferral, other income; taxable portions feed line 7. | Existing pure calculation handles gross/taxable columns and CCC/deferral detail. Reconcile each information return to one farm activity and preserve statement/carryover year. |
| Lines 8–18, 20–30g | Allowed farm-rental expenses, including auto expense, capitalization, depreciation, conservation and other lines. Line 31 is their total. | Apply source-level expense limits and asset allocations before summing. Form 4562 attaches for car/truck expense; amortization uses the new [Form 4562-B contract](FORM4562B-GRAPH.md). |
| **Lines 19a–19c** | 19a bank mortgage interest, **new 19b business-use vehicle-loan interest**, 19c other interest. Personal-use interest may reach Schedule 1-A but cannot be deducted twice. | Shared input and [TY2025 MeF serializer](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/2025/mef/forms/f4835.ts) have mortgage and other-interest fields, with no vehicle-interest amount. Add a distinct 2026 field, allocation/debt evidence, and current MeF mapping. Do not map old other interest to line 19b. |
| Lines 32, 34a–34c | Net income/loss after line 31; losses need at-risk and possibly passive-loss limitation. Allowed income/loss reaches Schedule E line 40, gross line 7 reaches Schedule E line 42. | Shared node sends at-risk net and gross to Schedule E with activity details. Verify released passive losses and carryforwards per activity before the 2026 Schedule E line 41/AGI total. Income here does **not** become Schedule SE farm profit. |

## Build and filing order

1. Add an activity-keyed TY2026 input with landowner/tenant and rent-type
   classification, active and material participation as distinct facts,
   source-document matches, plus separate vehicle-interest and other-interest
   amounts. Require the classification before the input can route income.
2. Compute taxable gross and allowed expenses per activity. Run at-risk and
   passive-loss calculations with traceable suspended amounts. Send Form 4835
   line 7 and allowed line 32/34c to a dedicated 2026 Schedule E Part V sink;
   reconcile Schedule E lines 40/42/41 to Schedule 1 line 5, AGI, and 1040.
3. Inventory the standalone draft's PDF fields, fill every relevant line and
   checked answer, and render both income and limited-loss cases. The TY2025
   PDF surface has no Form 4835 descriptor to extend.
4. Diff `IRS4835` in the current authorized TY2026 XSD/business rules against
   the TY2025 serializer, including vehicle interest and required Form
   8582/6198/4562/4562-B and CCC/crop-insurance statements. Validate a whole
   return, not an isolated XML fragment. The May TY2026 v1 package cannot
   prove September-form conformance.
5. Use [ATS scenario 3](ATS-SCENARIO-03.md) as the income case: line 1
   $19,233; expenses $900 + $465 + $700 + $3,222 + $2,038 = $7,325;
   independently derive line 32 **$11,908** and Schedule E line 40/41
   **$11,908**, with gross reconciliation line 42 **$19,233**. Add loss,
   vehicle-interest/Schedule 1-A split, and multiple-activity fixtures.

Do not register Form 4835 as a TY2026 public route until its classification,
calculation, PDF, MeF, and activity-level reconciliation checks pass.
