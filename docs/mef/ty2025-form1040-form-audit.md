# TY2025 Form 1040 registered-document audit

Static snapshot: 2026-09-28. This is an implementation inventory, not a
filing-readiness claim. The authoritative registration order is
[`forms/f1040/2025/mef/forms/index.ts`](../../forms/f1040/2025/mef/forms/index.ts);
PDF registration is
[`forms/f1040/2025/pdf/forms/index.ts`](../../forms/f1040/2025/pdf/forms/index.ts).
The detailed, older [MeF coverage inventory](coverage-inventory.md) and
[`product_board.md`](../../product_board.md) supply the known gaps. The current
worktree has not had its deferred full test, XSD, PDF-render, business-rule, or
ATS pass. A written case is not a passing case.

Scope: the **Form 1040 family**. Standalone 1040-NR, 1040-SS, Form 4868, and
dual-status 1040 e-file are **explicitly excluded**, not missing rows.
Everything else below remains **open** until its supported tax situations,
source provenance, and filing output have been audited. A registered serializer
is not proof that a form's instructions are implemented.

Schema-conformance alert: static comparison with the checked-in TY2025 v5.4
XSDs found that the original Form 4562, 7206, 8606, 8829, 8839, 8853, 8990,
and 8995-A serializers used invalid or incorrectly nested native tags. Bounded
source-to-native-XML replacements are now written for all eight, as for the
earlier Form 8815 rebuild. These replacements reject tax situations they do
not model, and none has passed the deferred full test, XSD, PDF, IRS
business-rule, or ATS gates. This is a static code review, not a completed XML
validation run. Forms 461 and 8960 also have recently expanded native line
maps, but their complete source and calculation paths remain open. No silent
skip or central special-case suppression was added. The dedicated gap audits
below document each bounded route and its remaining evidence.

## Reading the matrix

- `S/C` names the source-fact path and calculation status. `P` means at least a
  bounded path is coded, but whole-form calculation completeness is **not
  established**. `U` means this audit has not established a complete
  source-to-calculation path. Neither is a passing result.
- `MeF` is the registered serializer file under `forms/f1040/2025/mef/forms/`;
  `R` means registered, not locally XSD-verified on this worktree.
- `PDF` is a descriptor registered in `forms/f1040/2025/pdf/forms/index.ts`; `Y`
  does **not** mean fields, pagination, or filled appearance were verified. `N`
  means no registered top-level PDF descriptor; it may be intentionally
  XML-only, but that decision needs form-specific review.
- `Tests` is `W` when the board or a focused test file identifies written cases
  (current execution unverified), and `?` when this audit has not established
  focused source-to-return coverage. Neither means passed. All rows still lack
  current full-batch, IRS business-rule, and ATS evidence.
- A `gap` is an open route, not an invitation to use a raw amount or silent
  fallback. `Audit` means the exact unsupported paths have not yet been
  enumerated. The scope exclusions above are the only excluded paths here.

### Main return and schedules (14 registered documents)

| Document      | S/C                                                  | MeF                  | PDF | Tests | Disposition / known gap                                                              |
| ------------- | ---------------------------------------------------- | -------------------- | --- | ----- | ------------------------------------------------------------------------------------ |
| 1040          | General, income, deduction, tax and payment graph; P | `f1040.ts` R         | Y   | W     | Open: every line's multi-source reconciliation and complete return gate (`TAX-01`).  |
| Schedule 1    | Income and adjustment aggregators; P                 | `schedule1.ts` R     | Y   | W     | Open: all lines and cross-form source classification.                                |
| Schedule 2    | Additional-tax aggregator; P                         | `schedule2.ts` R     | Y   | W     | Open: remaining line map, chapter-1 classification and linked statements (`GAP-S2`). |
| Schedule 3    | Credit aggregator; P                                 | `schedule3.ts` R     | Y   | W     | Open: source credit inventory, limits and linked documents.                          |
| Schedule 8812 | Dependent/child-credit facts; U                      | `schedule_8812.ts` R | N   | ?     | Open: source, phaseout, XML/PDF and complete credit audit.                           |
| Schedule A    | Itemized deductions and source forms; P              | `schedule_a.ts` R    | Y   | W     | Open: charitable carryovers, reductions, other deduction provenance.                 |
| Schedule B    | Interest/dividend payer rows and Part III facts; P   | `schedule_b.ts` R    | Y   | W     | Open: all payer adjustments, overflow and country-statement render.                  |
| Schedule C    | Business income/expense facts; P                     | `schedule_c.ts` R    | N   | ?     | Open: full line-level source and PDF decision.                                       |
| Schedule D    | Form 8949 and capital-gain worksheets; P             | `schedule_d.ts` R    | Y   | W     | Open: all special-rate, carryover and source-classification paths.                   |
| Schedule E    | Rental/royalty and K-1 activity facts; P             | `schedule_e.ts` R    | N   | W     | Open: durable passive activity/carryforward and PDF decision (`RENT-01`).            |
| Schedule EIC  | Child and earned-income facts; U                     | `eitc.ts` R          | Y   | ?     | Open: eligibility, child identity, source and output audit.                          |
| Schedule F    | Farm source facts and aggregation; P                 | `schedule_f.ts` R    | Y   | W     | Open: remaining elections, attachments and current-run verification (`FARM-01`).     |
| Schedule H    | Household wage/payroll facts; P                      | `schedule_h.ts` R    | Y   | W     | Open: full tax-source audit and current-run verification.                            |
| Schedule SE   | Self-employment profit/tax facts; P                  | `schedule_se.ts` R   | Y   | W     | Open: multiple businesses, clergy and cross-form wage-base audit.                    |

### Numbered forms and distinct registered schedules (69 descriptors)

| Document              | S/C                                                               | MeF                     | PDF | Tests | Disposition / known gap                                                                                    |
| --------------------- | ----------------------------------------------------------------- | ----------------------- | --- | ----- | ---------------------------------------------------------------------------------------------------------- |
| 461                   | Reviewed C/F-only return-wide source; P                           | `f461.ts` R             | Y   | W     | One threshold, native lines, and strict filed-return zero checks written; other business sources, passive ordering, stale PDF, and validation remain open; see [gap audit](ty2025-form461-gap.md). |
| 965-A                 | Section 965 history/payment facts; P                              | `f965a.ts` R            | N   | W     | Open: historical liabilities, agreements and authentication.                                               |
| 982                   | Debt-discharge source and attributes; P                           | `f982.ts` R             | Y   | W     | Open: qualified-principal-residence and attribute reduction (`GAP-982`).                                   |
| 1099-R                | Payer distribution statements; U                                  | `f1099r.ts` R           | N   | ?     | Open: recipient/source reconciliation; source document need not have a rendered tax-form PDF.              |
| 1116                  | Foreign-tax basket and income/deduction facts; P                  | `f1116.ts` R            | Y   | W     | Open: special categories, carryovers, tax adjustments (`GAP-1116`).                                        |
| 1116 Schedule B       | Reviewed current-year passive/general excess tax; P               | `f1116_schedule_b.ts` R | N   | W     | Open: other carryovers/carrybacks, multi-category, PDF and validation (`GAP-1116`).                        |
| 2441                  | Care provider/dependent facts; P                                  | `f2441.ts` R            | Y   | W     | Open: all expense/election and provider paths.                                                             |
| 2555                  | Physical-presence wages and structured employee housing; P        | `f2555.ts` R            | Y   | W     | Open: multiple residences, second household, self-employed housing, later-limit election and PDF render.   |
| 3800                  | Identified business credits and tax limits; P                     | `f3800.ts` R            | N   | W     | Open: full credit inventory, passive limits, carryovers and PDF decision.                                  |
| 4136                  | Identified fuel uses, rates and claimant facts; P                 | `f4136.ts` R            | Y   | W     | Open: remaining activities, attachments and render.                                                        |
| 4137                  | Employer/month tip and W-2 facts; P                               | `f4137.ts` R            | Y   | W     | Open: joint/RRTA/records and filled PDF (`TIPS-01`).                                                       |
| 4255                  | Credit-property recapture row facts; P                            | `f4255.ts` R            | N   | W     | Open: remaining recapture classes, source history, PDF decision.                                           |
| 4562                  | One full-cost Section 179 Schedule C asset; P                      | `f4562.ts` R            | Y   | W     | Bounded native Part I and sole-business income reconciliation written; other assets, wages/cross-business limits, stale PDF, and validation remain open; see [gap audit](ty2025-form4562-gap.md). |
| 4684                  | Casualty/theft facts; P                                           | `f4684.ts` R            | Y   | ?     | Open: full event, insurance and limit audit.                                                               |
| 4797                  | Identified business-property transactions; P                      | `f4797.ts` R            | Y   | W     | Open: recapture, PAL overlap and PDF mapping.                                                              |
| 4835                  | Farm-rental income/expense facts; P                               | `f4835.ts` R            | N   | W     | Open: all at-risk/passive cases and PDF decision.                                                          |
| 4952                  | Investment income, expense and AMT refigure facts; P              | `f4952.ts` R            | Y   | W     | Open: other source/AMT derivation and PDF (`GAP-4952`).                                                    |
| 4972                  | Eligible lump-sum distribution/election facts; P                  | `f4972.ts` R            | Y   | W     | Open: multiple recipients/spouse forms, MRD, NUA PDF appearance; see [gap audit](ty2025-form4972-gap.md). |
| 5329                  | Retirement/HSA excess and prior-year facts; P                     | `f5329.ts` R            | Y   | W     | Open: all penalties and carryover source verification.                                                     |
| 5695                  | Energy improvement/property facts; P                              | `f5695.ts` R            | Y   | ?     | Open: all eligibility, limit and statement routes.                                                         |
| 5884                  | Certified worker/group wage facts; P                              | `f5884.ts` R            | Y   | W     | Open: certification, passive limits, carryovers, statement render.                                         |
| 6198                  | At-risk activity facts; P                                         | `f6198.ts` R            | Y   | ?     | Open: all activity types and carryforward audit.                                                           |
| 4835 at-risk schedule | Farm-rental at-risk facts; P                                      | `f4835_at_risk.ts` R    | N   | W     | Open: relationship to 4835/6198 and PDF decision.                                                          |
| 6251                  | AMT source/adjustment and rate-workbook facts; P                  | `f6251.ts` R            | Y   | W     | Open: remaining AMT refigures, special gain and tax interactions (`GAP-6251`).                             |
| 6252                  | Installment-sale contract/payment facts; P                        | `f6252.ts` R            | Y   | ?     | Open: all property, recapture and interest paths.                                                          |
| 6781                  | Section 1256/straddle transactions; P                             | `f6781.ts` R            | Y   | W     | Open: special elections, loss deferral and PDF.                                                            |
| 7206                  | Native one-plan calculator written; filing blocked; U              | `f7206.ts` R            | Y   | W     | Active one-plan deduction now fails closed in graph, MeF, and PDF because premium-month evidence and Schedule C ownership are unavailable; multiple plans/LTC/PTC and validation remain open; see [gap audit](ty2025-form7206-gap.md). |
| 7217                  | Partnership property-distribution facts; P                        | `f7217.ts` R            | N   | ?     | Open: basis allocation, multiple events and PDF decision.                                                  |
| 8283                  | Identified noncash gifts, acknowledgments and appraisals; P       | `f8283.ts` R            | N   | W     | Bounded Section A FMV reductions have a linked statement for certified vehicle sale proceeds or sourced short-term ordinary-income property. Other reduction causes, special gifts, carryovers, signatures, and PDF remain open (`GAP-8283`). |
| 8396                  | Mortgage-credit-certificate facts; P                              | `f8396.ts` R            | Y   | ?     | Open: carryover and certificate audit.                                                                     |
| 8582                  | Passive activity, income, loss and carryover facts; P             | `f8582.ts` R            | Y   | W     | Open: remaining dispositions/4797, activity identity and PDF (`GAP-8582`).                                 |
| 8582-CR               | Passive credit activity and tax-without-passive facts; P          | `f8582cr.ts` R          | N   | W     | Open: PTP, source authentication and PDF decision.                                                         |
| 8606                  | Taxpayer nondeductible IRA, no activity; P                         | `f8606.ts` R            | Y   | W     | Bounded native Part I written; spouse, distributions/conversions, PDF, and validation remain open; see [gap audit](ty2025-form8606-gap.md). |
| 8611                  | LIHTC building/recapture facts; P                                 | `f8611.ts` R            | N   | W     | Open: all building events, bond/interest evidence and PDF decision.                                        |
| 8615                  | Child unearned-income and parent-tax facts; P                     | `f8615.ts` R            | Y   | W     | Open: sibling/election/tax worksheets and render (`GAP-8615`).                                             |
| 8621                  | PFIC/QEF holding, election and gain facts; P                      | `f8621.ts` R            | N   | W     | Open: special elections, interest, source verification and PDF (`GAP-8621`).                               |
| 8814                  | Child income and parent-election facts; P                         | `f8814.ts` R            | Y   | W     | Open: dotted-line PDF, election rules and output audit (`GAP-8814`).                                       |
| 8815                  | Bounded savings-bond/education facts and lines; P                 | `f8815.ts` R            | Y   | W     | Open: native XML/PDF unvalidated, unsupported source paths; see [gap audit](ty2025-form8815-gap.md).       |
| 8820                  | Orphan-drug expense/election facts; P                             | `f8820.ts` R            | Y   | W     | Open: source certification, passive limits and statement/PDF render.                                       |
| 8824                  | Like-kind exchange assets/basis facts; P                          | `f8824.ts` R            | Y   | W     | Open: multi-asset, recapture and deferred-gain verification.                                               |
| 8826                  | Disabled-access expenditure/K-1 facts; P                          | `f8826_draft.ts` R      | N   | W     | Open: full eligibility, passive/controlled-group and PDF decision.                                         |
| 8829                  | Rented-home native route, positive claim blocked; U                | `f8829.ts` R            | Y   | W     | Positive line 36 fails closed until it can reach the actual Schedule C item and downstream SE/QBI. Zero-deduction carryover, owner/mortgage/depreciation, full PDF, and validation remain open; see [gap audit](ty2025-form8829-gap.md). |
| 8834                  | Plug-in electric vehicle facts; P                                 | `f8834.ts` R            | Y   | W     | Open: legacy eligibility, recapture and PDF.                                                               |
| 8835                  | Renewable facility/credit-transfer facts; P                       | `f8835.ts` R            | N   | W     | Open: fiscal years, statements and transfer-election PDF.                                                  |
| 8839                  | Native Part II calculator written; filing blocked; U               | `f8839.ts` R            | Y   | W     | Active credit fails closed until MAGI, remaining tax capacity, and expense/finality sources reconcile; other children, benefits, carryforward, PDF, and validation remain open; see [gap audit](ty2025-form8839-gap.md). |
| 8853                  | One fully qualified Archer MSA distribution; P                    | `f8853.ts` R            | Y   | W     | Bounded native Section A route written; contributions, Medicare MSA, LTC, PDF, and validation remain open; see [gap audit](ty2025-form8853-gap.md). |
| 8854 initial          | Expatriation identity, tax and asset facts; P                     | `f8854.ts` R            | N   | W     | Open: covered noncapital events and attachments (`GAP-8854`).                                              |
| 8854 annual           | Annual deferred-tax/payment facts; P                              | `f8854_annual.ts` R     | N   | W     | Open: distributions, noncapital dispositions and PDF (`GAP-8854`).                                         |
| 8859                  | DC first-time homebuyer credit facts; P                           | `f8859.ts` R            | Y   | W     | Open: recapture and source/date audit.                                                                     |
| 8862                  | Prior credit disallowance/refiling facts; P                       | `f8862.ts` R            | N   | ?     | Open: required questions, dependency and PDF decision.                                                     |
| 8863                  | Student/tuition and credit facts; P                               | `f8863.ts` R            | N   | ?     | Open: institution statements, phaseout and PDF decision.                                                   |
| 8874                  | QEI/partner New Markets credit facts; P                           | `f8874.ts` R            | N   | W     | Open: carryovers, passive cents, recapture and PDF.                                                        |
| 8880                  | Retirement contribution and eligibility facts; P                  | `f8880.ts` R            | Y   | ?     | Open: all eligible contribution/carryover paths.                                                           |
| 8889                  | Monthly HDHP, contribution/distribution and prior-excess facts; P | `f8889.ts` R            | Y   | W     | Open: two spouse HSAs, mixed prior coverage, eligibility evidence and render (`GAP-8889`).                 |
| 8911                  | Alternative-fuel refueling property facts; P                      | `f8911.ts` R            | N   | W     | Open: census, business-use and credit-limit audit.                                                         |
| 8912                  | Credit to holders of tax-credit bonds; P                          | `f8912.ts` R            | Y   | W     | Open: source certificates/limits and PDF.                                                                  |
| 8919                  | Identified firm, reason, W-2 and wage-base facts; P               | `f8919.ts` R            | Y   | W     | Open: correspondence authentication and filled PDF.                                                        |
| 8911 Schedule A       | Property-level facts; P                                           | `f8911_schedule_a.ts` R | N   | W     | Open: property detail/PDF decision.                                                                        |
| 8936                  | Vehicle/dealer and business-credit facts; P                       | `f8936.ts` R            | Y   | W     | Open: passive/commercial/recapture routes and PDF.                                                         |
| 8936 Schedule A       | Per-vehicle facts; P                                              | `f8936_schedule_a.ts` R | Y   | W     | Open: complete vehicle eligibility and PDF.                                                                |
| 8949                  | Transaction and 1099-B/DA classification facts; P                 | `f8949.ts` R            | Y   | W     | Open: box classification, holding period, wash sale and IRS rules.                                         |
| 8959                  | Medicare/RRTA wages, withholding and CT-2 facts; P                | `f8959.ts` R            | Y   | W     | Open: payment evidence and cross-form reconciliation.                                                      |
| 8960                  | Net-investment income source facts; P                             | `f8960.ts` R            | Y   | W     | Open: 11 computed total/tax lines now mapped; source inclusion/deduction and 8814 interaction remain.    |
| 8962                  | 1095-A policies, SLCSP, PTC and Pub. 974 facts; P                 | `f8962.ts` R            | Y   | W     | Open: mixed annual/monthly QSEHRA, partial-year SEHI/PTC, source verification (`GAP-8962`).                |
| 8978                  | Partnership adjustment and reporting-year tax facts; P            | `f8978.ts` R            | N   | W     | Open: partner source, tax year and negative offset (`GAP-8978`).                                           |
| 8978 Schedule A       | Year-by-year adjustment facts; P                                  | `f8978_schedule_a.ts` R | N   | W     | Open: attachment/reconciliation and PDF decision.                                                          |
| 8990                  | Native serializer written; filing route blocked; U                 | `f8990.ts` R            | Y   | W     | Positive Schedule C interest requires sourced small-business exemption; nonexempt Form 8990 fails closed until ATI components reconcile to the return. Passthroughs, full PDF, and validation remain open; see [gap audit](ty2025-form8990-gap.md). |
| 8995                  | QBI/source income facts; P                                        | `f8995.ts` R            | Y   | ?     | Open: all threshold and loss/carryover cases.                                                              |
| 8995-A                | One named non-SSTB business above phase-in; P                      | `f8995a.ts` R           | Y   | W     | Bounded native row/Part IV written; other business and Schedules A-D routes, PDF, and validation remain open; see [gap audit](ty2025-form8995a-gap.md). |

### Registered wage and supporting descriptors (24)

These are included in the 107 MeF registry entries, but are not 24 additional
tax forms. `R` still means registered, not validated; `P` means a bounded
parent-source route is coded. Every row's current-run XSD, source-to-document,
attachment/reference, business-rule, and ATS status is **open**. The file named
in each row is under `forms/f1040/2025/mef/forms/`. Binary PDFs are separate.

| Pending key | Parent/source | MeF descriptor | Source and remaining evidence |
| --- | --- | --- | --- |
| `w2` | Employer W-2 wages/withholding | `w2.ts` R | P: payer wage inputs; reconcile every filed copy, Medicare/RRTA fields, and W-2 business rules. |
| `fec_record` | Foreign-employer compensation | `foreign_employer_wages.ts` R | P: foreign employer wage source; verify employer identity, currency/withholding, and FEC linkage. |
| `any_other_taxes_statement` | Schedule 2 / Form 8978 adjustment | `any_other_taxes_statement.ts` R | P: signed adjustment statement; reconcile the linked Schedule 2 line and rendered attachment. |
| `wages_not_shown_schedule` | FEC wages absent from W-2 | `foreign_employer_wages.ts` R | P: FEC source and wage amount; check 1040 line 1h and linked record. |
| `ccc_loan_accrual_statement` | Schedule F accrual CCC loans | `ccc_loan_accrual_statement.ts` R | P: identified loans; reconcile Farm Part III amounts and statement repetitions. |
| `ccc_loan_statement` | Schedule F cash CCC loans | `ccc_loan_statement.ts` R | P: identified loans; reconcile loan election and Schedule F line 5. |
| `crop_insurance_deferral_statement` | Schedule F crop-loss deferral | `crop_insurance_deferral_statement.ts` R | P: damage/payment events; reconcile election year and Schedule F income. |
| `f965_net_adjustment_transfer_statement` | Form 965-A net-adjustment transfer | `f965a_net_adjustment_transfer_statement.ts` R | P: sourced transfer facts; verify recipient identity, parent reference, and agreement evidence. |
| `f965_multiple_transferee_statement` | Form 965-A multiple transferees | `f965a_multiple_transferee_statement.ts` R | P: transferee records; verify split and parent liability/payment reconciliation. |
| `form1116_direct_expense_statement` | Form 1116 Part I line 2 | `f1116_direct_expense_statement.ts` R | P: identified direct expenses; verify category, foreign source, and parent-document reference. |
| `form1116_other_deductions_statement` | Form 1116 Part I line 3b | `f1116_other_deductions_statement.ts` R | P: identified other deductions; verify apportionment, category, and parent reference. |
| `f4136_emulsion_blending_statement` | Form 4136 blending claims | `f4136_emulsion_blending_statement.ts` R | P: blending source rows; reconcile rate/use/claim and parent document. |
| `f4136_credit_card_users_statement` | Form 4136 credit-card sales | `f4136_credit_card_users_statement.ts` R | P: user/sales rows; verify purchaser facts and parent claim. |
| `f4136_diesel_government_sales_statement` | Form 4136 diesel government sales | `f4136_diesel_government_sales_statement.ts` R | P: buyer/sale rows; verify qualifying use and line amount. |
| `f4136_kerosene_government_sales_statement` | Form 4136 kerosene government sales | `f4136_kerosene_government_sales_statement.ts` R | P: buyer/sale rows; verify qualifying use and line amount. |
| `joint_occupancy_statement` | Form 5695 jointly occupied property | `joint_occupancy_statement.ts` R | P: named co-occupant allocation; verify property/source totals and credit limit. |
| `f5884_controlled_group_statement` | Form 5884 controlled group | `f5884_controlled_group_statement.ts` R | P: employer group allocation; verify certificates and wage totals. |
| `f5884_deduction_differentiation_stmt` | Form 5884 wage-deduction adjustment | `f5884_deduction_differentiation_stmt.ts` R | P: wage reduction explanation; reconcile actual business deduction and credit. |
| `form8283_vehicle_statement` | Form 8283 vehicle acknowledgment | `f8283_vehicle_statement.ts` R | P: certified vehicle route; verify donee acknowledgment PDF, VIN, dates, and parent reference. |
| `form8283_fmv_reduction_statement` | Form 8283 Section A column (h) | `f8283_fmv_reduction_statement.ts` R | P: certified vehicle sale proceeds and purchased short-term ordinary-income reduction only; other reductions reject. Verify basis/FMV facts, claimed deduction, and parent reference in the deferred batch. |
| `form8621_excess_statement` | Form 8621 Part V holding period | `f8621_excess_statement.ts` R | P: holding-period computation; verify gain/tax/interest source and parent reference. |
| `child_taxable_interest_statement` | Form 8814 child interest | `child_taxable_interest_statement.ts` R | P: child/parent election amount; verify 8814/1040 Schedule B reconciliation. |
| `f8820_controlled_group_statement` | Form 8820 controlled group | `f8820_controlled_group_statement.ts` R | P: group/credit allocation; verify source drug expenditures and parent reference. |
| `f8854_native_statements` | Form 8854 initial/annual attachments | `f8854_native_statements.ts` R | P: applicable native statement roots; verify each election, property/payment source, and parent link. |

The exact registration order remains in `ALL_MEF_FORMS`. A row can move beyond
`P` only after its named source, calculation, XML root, linkage, and required
binary attachment are reconciled in the deferred batch and IRS business rules.

### Known in-scope path outside the registered MeF inventory

| Path | Input status | MeF/PDF status | Disposition |
| --- | --- | --- | --- |
| Schedule J farm-income averaging | `schedule_j` is a 2025 input, but an active election now fails closed because the supplied elected tax is not reconciled to the three base-year worksheets. | No Schedule J MeF or PDF descriptor is registered. | Open, not an agreed scope exclusion. Build the sourced worksheet, return/AMT tax routing, native attachment, and output checks before support. |

This table is not a complete comparison of every TY2025 IRS-allowed document
against product requirements. That comparison remains part of `INV-01`.

## Inventory totals and release implications

| Static measure                               |                                      Count | What it means                                                                                                                 |
| -------------------------------------------- | -----------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------- |
| MeF descriptors in `ALL_MEF_FORMS`           |                                        107 | Registration only: 83 main-return/numbered/schedule entries plus 24 wage/supporting entries.                                  |
| Main-return/numbered/schedule descriptors    |                                         83 | 14 return/schedules plus 69 numbered/distinct schedules, including alternative initial/annual 8854 serializers.               |
| Registered PDF descriptors                   |                                         58 | 57 corresponding to a main MeF entry plus the separate 4136 Schedule A PDF. This is presence, not a field-map or visual pass. |
| Forms excluded from the agreed product scope | 1040-NR, 1040-SS, 4868; dual-status e-file | Not counted as open Form 1040-family serializers.                                                                             |
| Whole-form verified on the current worktree  |                0 established by this audit | No deferred full batch, complete instruction matrix, IRS business rules or ATS acceptance is recorded.                        |

The next audit pass should resolve each `U`/`?` row into a named
source-to-calculation-to-MeF/PDF test, enumerate exact supported and rejected
tax situations, then run the agreed single full test/XSD/PDF-render batch. It
must not promote a row solely because a file or test exists. ATS acceptance
remains a separate final gate.
