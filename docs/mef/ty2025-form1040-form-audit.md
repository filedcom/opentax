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

Schema-conformance alert from static comparison with the checked-in TY2025 v5.4
form XSDs: the registered serializers for Forms 4562, 7206, 8606, 8829, 8839,
8853, 8990, and 8995-A emit fields absent from, or incorrectly nested for,
their native IRS form types. They are not ready to e-file. Form 8815 had the
same defect; a bounded source-to-native-XML rebuild is now written, but its XSD
and business-rule validation remain unrun. This is a structural finding, not a
completed XML-validation run. Forms 461 and 8960 use native tags but still
omit or have only recently mapped material filed-form detail; their source and
calculation paths also need a form-specific review before support is claimed.

The eight remaining invalid serializers need a product disposition before filing readiness:
rebuild each against the native TY2025 schema and its source calculations, or
explicitly exclude its tax situations with an error. No silent skip or central
special-case suppression has been approved or added. A static tag comparison
found zero valid emitted native child tags for 4562, 7206, 8606, 8829, 8839,
8853, and 8990; 8995-A has two valid child tags out of eleven but also uses
the wrong nesting. The [Form 8815 audit](ty2025-form8815-gap.md) documents its
bounded rebuild and remaining validation.

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
| 461                   | Per-source excess input is not return-wide; U                      | `f461.ts` R             | Y   | W     | Open: one threshold, all filed lines, cross-source offset and filing trigger; see [gap audit](ty2025-form461-gap.md). |
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
| 4562                  | Aggregate basis/deduction only; U                                 | `f4562.ts` R            | Y   | W     | Open: native XML, activity/asset provenance and separate form lines; see [gap audit](ty2025-form4562-gap.md). |
| 4684                  | Casualty/theft facts; P                                           | `f4684.ts` R            | Y   | ?     | Open: full event, insurance and limit audit.                                                               |
| 4797                  | Identified business-property transactions; P                      | `f4797.ts` R            | Y   | W     | Open: recapture, PAL overlap and PDF mapping.                                                              |
| 4835                  | Farm-rental income/expense facts; P                               | `f4835.ts` R            | N   | W     | Open: all at-risk/passive cases and PDF decision.                                                          |
| 4952                  | Investment income, expense and AMT refigure facts; P              | `f4952.ts` R            | Y   | W     | Open: other source/AMT derivation and PDF (`GAP-4952`).                                                    |
| 4972                  | Eligible lump-sum distribution/election facts; P                  | `f4972.ts` R            | Y   | W     | Open: multiple recipients are rejected for box 9a under 100%; NUA annotations and PDF render (`GAP-4972`). |
| 5329                  | Retirement/HSA excess and prior-year facts; P                     | `f5329.ts` R            | Y   | W     | Open: all penalties and carryover source verification.                                                     |
| 5695                  | Energy improvement/property facts; P                              | `f5695.ts` R            | Y   | ?     | Open: all eligibility, limit and statement routes.                                                         |
| 5884                  | Certified worker/group wage facts; P                              | `f5884.ts` R            | Y   | W     | Open: certification, passive limits, carryovers, statement render.                                         |
| 6198                  | At-risk activity facts; P                                         | `f6198.ts` R            | Y   | ?     | Open: all activity types and carryforward audit.                                                           |
| 4835 at-risk schedule | Farm-rental at-risk facts; P                                      | `f4835_at_risk.ts` R    | N   | W     | Open: relationship to 4835/6198 and PDF decision.                                                          |
| 6251                  | AMT source/adjustment and rate-workbook facts; P                  | `f6251.ts` R            | Y   | W     | Open: remaining AMT refigures, special gain and tax interactions (`GAP-6251`).                             |
| 6252                  | Installment-sale contract/payment facts; P                        | `f6252.ts` R            | Y   | ?     | Open: all property, recapture and interest paths.                                                          |
| 6781                  | Section 1256/straddle transactions; P                             | `f6781.ts` R            | Y   | W     | Open: special elections, loss deferral and PDF.                                                            |
| 7206                  | Premium/profit cap only; U                                        | `f7206.ts` R            | Y   | W     | Open: native XML, lines 4-13, multiple businesses and PTC; see [gap audit](ty2025-form7206-gap.md).       |
| 7217                  | Partnership property-distribution facts; P                        | `f7217.ts` R            | N   | ?     | Open: basis allocation, multiple events and PDF decision.                                                  |
| 8283                  | Identified noncash gifts, acknowledgments and appraisals; P       | `f8283.ts` R            | N   | W     | Open: special gifts, carryovers, signatures and PDF (`GAP-8283`).                                          |
| 8396                  | Mortgage-credit-certificate facts; P                              | `f8396.ts` R            | Y   | ?     | Open: carryover and certificate audit.                                                                     |
| 8582                  | Passive activity, income, loss and carryover facts; P             | `f8582.ts` R            | Y   | W     | Open: remaining dispositions/4797, activity identity and PDF (`GAP-8582`).                                 |
| 8582-CR               | Passive credit activity and tax-without-passive facts; P          | `f8582cr.ts` R          | N   | W     | Open: PTP, source authentication and PDF decision.                                                         |
| 8606                  | IRA basis/distribution facts; P                                   | `f8606.ts` R            | Y   | ?     | Open: all conversion, spouse and prior-basis paths.                                                        |
| 8611                  | LIHTC building/recapture facts; P                                 | `f8611.ts` R            | N   | W     | Open: all building events, bond/interest evidence and PDF decision.                                        |
| 8615                  | Child unearned-income and parent-tax facts; P                     | `f8615.ts` R            | Y   | W     | Open: sibling/election/tax worksheets and render (`GAP-8615`).                                             |
| 8621                  | PFIC/QEF holding, election and gain facts; P                      | `f8621.ts` R            | N   | W     | Open: special elections, interest, source verification and PDF (`GAP-8621`).                               |
| 8814                  | Child income and parent-election facts; P                         | `f8814.ts` R            | Y   | W     | Open: dotted-line PDF, election rules and output audit (`GAP-8814`).                                       |
| 8815                  | Bounded savings-bond/education facts and lines; P                 | `f8815.ts` R            | Y   | W     | Open: native XML/PDF unvalidated, unsupported source paths; see [gap audit](ty2025-form8815-gap.md).       |
| 8820                  | Orphan-drug expense/election facts; P                             | `f8820.ts` R            | Y   | W     | Open: source certification, passive limits and statement/PDF render.                                       |
| 8824                  | Like-kind exchange assets/basis facts; P                          | `f8824.ts` R            | Y   | W     | Open: multi-asset, recapture and deferred-gain verification.                                               |
| 8826                  | Disabled-access expenditure/K-1 facts; P                          | `f8826_draft.ts` R      | N   | W     | Open: full eligibility, passive/controlled-group and PDF decision.                                         |
| 8829                  | Home-office area/expense facts; P                                 | `f8829.ts` R            | Y   | ?     | Open: simplified/actual methods, business-use substantiation.                                              |
| 8834                  | Plug-in electric vehicle facts; P                                 | `f8834.ts` R            | Y   | W     | Open: legacy eligibility, recapture and PDF.                                                               |
| 8835                  | Renewable facility/credit-transfer facts; P                       | `f8835.ts` R            | N   | W     | Open: fiscal years, statements and transfer-election PDF.                                                  |
| 8839                  | Adoption expense/credit facts; P                                  | `f8839.ts` R            | Y   | W     | Open: special needs, employer benefits and exclusion audit.                                                |
| 8853                  | Archer MSA/LTC facts; P                                           | `f8853.ts` R            | Y   | ?     | Open: all distribution and exception routes.                                                               |
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
| 8990                  | Business interest and carryover facts; P                          | `f8990.ts` R            | Y   | ?     | Open: all excepted-trade, basis and limit cases.                                                           |
| 8995                  | QBI/source income facts; P                                        | `f8995.ts` R            | Y   | ?     | Open: all threshold and loss/carryover cases.                                                              |
| 8995-A                | Advanced QBI/activity facts; P                                    | `f8995a.ts` R           | Y   | ?     | Open: wage/property limitation and aggregation statements.                                                 |

### Registered wage and supporting descriptors (24)

These are included in the 107 MeF registry entries, but are not 24 additional
tax forms. Each is registered for an identified source or linked statement; all
have current-run XSD, attachment, source-link, and business-rule status
**open**. W-2 and the foreign-employer FEC record are source documents. The
others are linked statement/schedule roots: `AnyOtherTaxesStatement`,
`WagesNotShownSchedule`, two CCC-loan statements, crop-insurance deferral, two
965-A transfer statements, two 1116 expense/deduction statements, four 4136
buyer/blending/card statements, joint occupancy, two 5884 statements, two 8283
statements, 8621 holding-period statement, 8814 child-interest statement, 8820
controlled-group statement, and 8854 native statements. Their exact serializers
and registration order are in `ALL_MEF_FORMS`; binary PDFs are separate from
these roots.

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
