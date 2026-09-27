# TY2026 Schedule F implementation contract

Sources: pinned [2026 draft Schedule F](corpus/draft/f1040sf.pdf), SHA-256
`a8e1d7845b56c8aab175a5b721993569b74f9e850c24874ff6a739174d94bcc7`,
and [September 17 draft instructions](corpus/draft/i1040sf.pdf), SHA-256
`f36a2d5dcc15560c9570531d3af7c6e7101c224a1b2b5c4bf9d34f656c823e0d`.
The [ATS scenario inventory](ATS.md) includes a populated Schedule F in
scenario 3. These are draft authorities; refresh on final publication and
reconcile with the current MeF package before filing acceptance.

## What changes in the 2026 contract

| Form location | Source rule and required facts | Current implementation consequence |
| --- | --- | --- |
| Header A–G | Principal activity and six-digit code, cash/accrual method, EIN, material participation, and two 2026 Form 1099 answers. The draft instructions note a $2,000 information-return threshold for certain payments from January 1. | The [shared input](../../forms/f1040/nodes/intermediate/forms/schedule_f/index.ts) has most facts; `line_c_farm_name` is not a printed 2026 header C field. Build the 2026 print contract from form positions rather than old names. |
| Part I lines 1a–9 | Cash-method income, taxable portions of cooperative and program payments, CCC loan election/forfeiture, crop-insurance deferral, and gross income. Accrual filers take line 9 from Part III line 50. | Existing cash/accrual branches and election detail are a starting calculation. Reconcile 1099-PATR/G/MISC/NEC source documents by `farm_id`; retain the election statement and origin year for line 6d. Do not add a source receipt a second time to the farm line. |
| Line 10 | Car and truck expense uses 72.5 cents per business mile for January–June and 76 cents for July–December, plus eligible parking/tolls. The printed form requires Form 4562 with this line. | Route the shared 2026 period mileage result to its farm ID, reconcile to actual expense election, and attach Form 4562 as instructed. |
| Lines 21a–21c | 21a bank mortgage interest; **new 21b business-use vehicle-loan interest**; 21c other interest. Split mixed personal/business vehicle interest, and apply Form 8990 before these lines when required. Personal-use interest may reach Schedule 1-A only if it is not deducted here. | The shared field `line21b_interest_other` and TY2025 MeF `MortgageInterestPaidOtherAmt` belong to the old shape. TY2026 needs separate vehicle and other-interest facts. Never reinterpret the existing 21b value as vehicle interest. Add debt-use, vehicle allocation, and Schedule 1-A reconciliation evidence. |
| Lines 12, 14, 16, 33 | Conservation limit is 25% of gross farm income with carryforward; depreciation/§179 and prepaid feed/supplies have their own limits; line 33 sums allowed expenses. New Form 4562-B handles amortization of 2026 intangibles. | The shared calculation caps line 12 but does not preserve excess conservation carryforward; its line 16/other-expense inputs do not establish prepaid-supply eligibility. Add source-level limit and carryforward records before printing an allowed line. The pinned [Form 4562-B contract](FORM4562B-GRAPH.md) covers the new attachment. |
| Lines 34–36 | Profit/loss is gross income less allowed expenses; a loss requires an at-risk answer and possibly Form 6198. | Shared simplified Form 6198 and Form 8582/Form 461 outputs exist. Link each farm's allowed loss and suspended balance to its printed Schedule F and Schedule 1 line 6. Form 461 excess business loss belongs on Schedule 1 line 8p, with NOL treatment after that limit. |
| Part III lines 37–50 | Accrual income and inventory; line 50 flows to Part I line 9. The form has an exceptional inventory method when ending inventory exceeds beginning inventory plus purchases. | Retain raw lines, method, computed line 49 sign, and line 50 reconciliation per farm. Verify the existing `computeAccrualIncome` exceptional branch against the printed footnote before registration. |

The form has two printed pages and one Schedule F per farm business. The
public 2026 input must keep `farm_id` stable across information returns,
auto expense, asset/debt records, MeF attachments, and carryforwards.

## Graph and output build order

1. Define a TY2026 farm input with distinct `line21b_vehicle_interest` and
   `line21c_other_interest` amounts, source debt/vehicle IDs, and business-use
   allocation. Keep the TY2025 `line21b_interest_other` meaning in TY2025.
   Audit every consumer of the shared key before using the new schema.
2. Gather source documents and election facts per `farm_id`; calculate cash or
   accrual income; run period-specific vehicle expense, depreciation,
   conservation/prepaid-supply limits, and Form 8990. Produce one set of
   printed line values, with source references and suspended balances, before
   sending farm profit or allowed loss downstream.
3. Route Schedule F line 34 to 2026 Schedule 1 line 6 and AGI once. Feed
   allowed profit to Schedule SE and QBI forms; feed passive and at-risk loss
   to Forms 8582/6198, excess business loss to Form 461, and eligible farm
   income to Schedule J and EITC worksheets. Reconcile 1040 line 8 and tax
   with the graph results. Farmland disposition/§1062 is a separate Form
   4797/1062 route and must not be treated as line 2 crop sales.
4. Replace the two-field [TY2025 PDF descriptor](../../forms/f1040/2025/pdf/forms/schedule_f.ts)
   with a pinned 2026 two-page map: header, all cash/accrual income and
   expense fields, line 21b/21c, line 34/36, and statement references.
   Render and visually inspect cash and accrual cases, with multiple farms.
5. Diff the [TY2025 MeF serializer](../../forms/f1040/2025/mef/forms/schedule_f.ts)
   against the authorized current TY2026 `IRS1040ScheduleF` XSD/rules. In
   particular, locate the new vehicle-interest element, preserve other
   interest separately, and validate CCC/crop-insurance statement links and
   Form 4562/6198/8990 attachments. The user-provided May v1 package is a
   research baseline, not proof of current XML acceptance.

## Acceptance fixtures

- **ATS scenario 3:** its Schedule F page 1 reports cash-method line 1a
  $9,233; expense lines 11 $876, 16 $675, 17 $1,488, 26 $1,222, and 28
  $765. With no other populated farm amounts on that page, calculate line 9
  $9,233, line 33 $5,026, and line 34 $4,207 independently. Preserve the
  source PDF page and check its other form/attachment facts before declaring
  the entire return scenario passed.
- **2026 deltas:** test the June 30/July 1 mileage boundary, 21b business
  vehicle interest plus personal interest on Schedule 1-A without overlap,
  21c other interest, Form 8990 reduction, conservation carryforward, crop
  insurance deferral and following-year release, and both accrual inventory
  branches. Add a negative test that rejects an old 21b other-interest value
  entering the 2026 vehicle-interest slot.
- **End-to-end:** for each accepted farm, verify Schedule F line 34,
  Schedule 1 line 6, Form 1040 income/tax, Schedule SE/credit side effects,
  two-page PDF, and TY2026 MeF XSD/business rules together; run a TY2025
  regression to detect year leakage.

The [node coverage ledger](node-coverage.csv) remains `audit-required` until
those gates pass. The [Form 172/NOL contract](FORM172-NOL-GRAPH.md) pins its
current December 2024 form/instructions and maps the farm carryback and
2027 carryforward gates. Form 4562-B is pinned, but its 2026 instruction
and filing contract remain open.
