# TY2026 Form 4562 depreciation and asset-ledger contract

Source snapshot: pinned [2026 draft Form 4562](corpus/draft/f4562.pdf),
SHA-256 `c76264c1ecc0792abc12315eed87802cd934dc18d072c2d72e94180591ca94ef`.
The [2026 draft instruction URL](https://www.irs.gov/pub/irs-dft/i4562--dft.pdf)
still serves **2025** instructions. Pinned [2025 instructions](corpus/authorities/i4562--2025.pdf)
and [2025 Publication 946](corpus/authorities/p946--2025.pdf) are prior-year
comparators, not authority for an unverified 2026 rule. Final [Notice
2026-11](corpus/authorities/n-26-11.pdf) supplies interim §168(k) guidance;
[Notice 2026-16](corpus/authorities/n-26-16.pdf) supplies interim §168(n)
qualified-production-property guidance. [Rev. Proc. 2025-32](corpus/authorities/rp-25-32.pdf)
sets 2026 §179 limits, and [Rev. Proc. 2026-15](corpus/authorities/rp-26-15.pdf)
sets 2026 placed-in-service passenger-auto caps. Recheck every draft/final
revision and the current MeF release before filing.

## Source model and order of calculation

Keep an **asset and activity ledger**, not one deduction total. Each asset
needs a stable `assetId`, `activityId`, owner, acquisition and written-binding-
contract dates, construction start (where relevant), placed-in-service or
conversion date, description/class, cost and adjusted basis, land/nondepreciable
portion, business/investment/qualified-business use, prior depreciation and
§179 carryovers, dispositions, credits/basis reductions, elections, method,
convention, recovery period and source documents. Keep vehicle mileage and
listed-property evidence by asset and year; keep prior-year tax-method and
remaining-basis history so a TY2026 deduction cannot be recomputed from a
single `year_of_service` number. Never deduct the same basis through §179,
bonus, regular MACRS, [Form 4562-B amortization](FORM4562B-GRAPH.md),
[Form 8829](FORM8829-GRAPH.md) or a source schedule twice.

For each activity, first classify assets and compute the business-use basis.
Resolve listed-property use and restrictions in Part V before §179 Part I.
Apply elected and allowed §179 to basis, then any eligible special allowance,
then regular MACRS/ADS on the remaining basis, subject to applicable passenger-
auto limits. Preserve the asset-level amounts and election scope even where
the filed form aggregates a class. Carry adjustments to AMT, recapture and
future-year basis; route only the allowed **activity** expense downstream.
The form's line 22 is a reconciliation total, not an additional deduction.

## Printed 2026 form contract

| Part / lines | Computation and evidence | Output or handoff |
| --- | --- | --- |
| Header | Return owner/ID and business or activity. The 2025 instructions say separate forms by activity and a single return-wide §179 summary; confirm the final 2026 filing rule and summary representation. | One stable form instance per required activity, with a return-level §179 allocation. |
| I, 1–5 | Apply 2026 §179 maximum **$2,560,000**, property-cost phaseout threshold **$4,090,000**, and applicable **$32,000** SUV cost ceiling from Rev. Proc. 2025-32. Preserve all qualifying property costs for line 2, not only elected amounts; handle MFS allocation and entity/K-1 restrictions from current instructions. | Return-wide eligibility/limit ledger. |
| I, 6–13 | Record each nonlisted asset's description, business cost and elected cost; Part V line 29 supplies listed-property elected cost to line 7. Line 8 is elected cost, line 9 lesser of 5/8, line 10 comes from **2025 Form 4562 line 13**, line 11 limits by active-business income, line 12 is allowed §179, line 13 is the disallowed amount carried to **2027**. Allocate line 12 by activity without repeating the return-wide limit. | Asset basis reductions, activity expenses and origin-year §179 carryover. Never silently allow §179 when line 11 evidence is missing. |
| II, 14a–d | Separate §168(k) ordinary qualified property (14a), specified fruit/nut plants (14b), §168(m) reuse/recycle property (14c), and §168(n) qualified production property (14d, **statement required**). Notice 2026-11 makes acquisition/contract, placed-in-service, class and election facts decisive; its optional 40%/60% election is for the **first taxable year ending after January 19, 2025**, not a generic TY2026 switch. Notice 2026-16 governs QPP eligibility, allocation, elections and potential recapture. | Four separate allowance records; subtract each from that asset's remaining basis. Listed-property bonus belongs on line 25 instead. |
| II, 15–16 | §168(f)(1) election property and other/ACRS depreciation are separate buckets. Do not infer them from a single MACRS table. | Activity depreciation and election/legacy-asset evidence. |
| III, 17–20e | Line 17 aggregates pre-2026 MACRS deductions from the opening asset ledger. Line 18 is the general-asset-account election. GDS lines 19a–k and ADS lines 20a–e report current-year property by class, month/year, adjusted depreciable basis, recovery period, convention, method and deduction. **New 19k** is qualified production property (39 years, MM, S/L on the draft). Handle half-year vs mid-quarter, mid-month, ADS elections/mandates, short tax years, dispositions and prior-year assets from the relevant year/method tables. | Per-class rows plus per-asset basis and future-year schedules; AMT depreciation adjustment to Form 6251 where applicable. |
| IV, 21–23b | Line 21 receives listed-property line 28. Line 22 adds line 12, 14a–d, 15–17, 19/20(g), and 21 exactly once. Lines 23a/b distinguish §263A capitalized interest from other capitalized cost for Part III current-year assets. | Reconcile line 22 to allocated source-schedule deductions; preserve 23a/b basis composition and statements. |
| V-A, 24a–29 | Preserve evidence and written-evidence answers, aircraft 25% question, and each listed asset's service date, both use percentages, basis, period, method and deduction. Line 25 is eligible listed-property bonus. Line 26 is **more than 50% qualified business use** and can carry §179; line 27 is **50% or less** and uses applicable straight-line/ADS treatment. Lines 28/29 feed 21/7. Test later drops to ≤50% and required recapture through the proper income form. | Listed-property subledger and passenger-auto cap by **placed-in-service year**, service year, bonus status and business-use percentage. |
| V-B/C, 30–41 | Six vehicle columns require business, commuting, other personal and total miles, plus personal-availability/owner/other-vehicle answers. Employer policy answers 37–41 may remove Section B for covered employees; retain policy and vehicle-to-employee evidence. Standard-mileage and lease vehicles still require the form's specified information when Form 4562 is otherwise required. | Mileage totals reconcile to source expenses, Schedule C/E/F vehicle facts and the printed vehicle rows. |

The draft is **three printed pages** after its coversheet and has **no Part
VI**. Amortization beginning in 2026 belongs on [Form 4562-B](FORM4562B-GRAPH.md),
whose asset rows and source-schedule deduction must reconcile separately.
The [AcroForm inventory](pdf-fields-f4562.csv) records **271 terminal widgets**:
137 on printed page 1, 124 on page 2 and 10 on page 3 (PDF pages 2–4).
Every widget is in the field tree. It includes line 14d (`f1_25`), the line
19k row (`f1_101`–`f1_106`), the listed-property table, six mileage columns
and the employer yes/no fields. Map the tooltip and full field path, then
render actual filled pages; do not reuse the TY2025 positional descriptor.

## Current code boundary and destination fix

- Shared `form4562` accepts one aggregate §179 amount, two TY2025 bonus-basis
  buckets, one GDS asset, prior depreciation, a single listed-property
  percentage and a luxury-auto year index. It lacks asset/activity identity,
  written-contract and service dates, ADS and mid-quarter, Part V rows,
  return-wide §179 allocation, lines 13/14b–d/23a–b, future-year basis and
  recapture. Its bonus constants are TY2025-specific; a 40% checkbox without
  the qualifying tax-year/election facts can produce a wrong 2026 deduction.
- `computeSection179` accepts precomputed upstream amounts and, if no
  `business_income_limit` was supplied, allows the full amount. It never
  returns line 13. `computeMacrsGds` uses a few 200DB/150DB half-year tables
  and one mid-month formula, with no service-date/asset history. The auto cap
  is selected from the **return year's** config; older vehicles on a TY2026
  return require their own placed-in-service-year cap series.
- Most urgently, the shared node sends `line13_depreciation` directly to the
  old Schedule 1 target and AGI. The [2026 Schedule 1](SCHEDULE1-GRAPH.md)
  uses **line 13 for HSA deduction**; its dedicated node rejects the legacy
  depreciation key. Depreciation belongs to its Schedule C/E/F/4835 or other
  owning activity before profit, SE tax, QBI, at-risk/passive/interest limits
  and AGI are calculated. A direct AGI/Schedule 1 amount would misclassify it
  and could double-count it. The existing positive-only Form 6251 adjustment
  route also needs an asset-level signed regular-vs-AMT comparison.
- The TY2025 PDF descriptor fills only a small set of positional fields,
  while the TY2025 MeF serializer emits 12 aggregate elements. Neither can
  describe the complete draft form or establish valid TY2026 XSD order/rules.
  `form4562` is absent from the TY2026 registry and PDF bundle; there is no
  TY2026 MeF builder yet.

## Build order and acceptance cases

1. Pin final 2026 Form 4562 instructions and any superseding §168(k)/(n)
   guidance. Confirm each asset class, applicable rate, election procedure,
   listed-property recapture, 2026 acquisition cutoffs and return-wide §179
   allocation before treating a formula as final. Preserve the 2025 PDF and
   2025 asset ledger only as prior-year opening evidence.
2. Add an activity-keyed asset ledger and return-wide election/§179 resolver.
   Calculate Parts V, I, II, III and IV in that dependency order. Wire each
   activity's allowed depreciation into [Schedule C](SCHEDULEC-GRAPH.md),
   [Schedule E](SCHEDULEE-GRAPH.md), [Schedule F](SCHEDULEF-GRAPH.md),
   [Form 4835](FORM4835-GRAPH.md), and [Form 8829](FORM8829-GRAPH.md) where
   applicable. Reconcile with Form 4562-B, Form 6251, Form 4797/dispositions,
   QBI, Schedule SE and the relevant business-loss limits.
3. Build the 2026 PDF renderer from the 271-widget map, including activity
   copies, overflow and the QPP statement. Compare asset-ledger totals to
   each form line and downstream schedule. Determine required forms for
   prior-year depreciation, listed vehicles and a §179 carryover from final
   instructions; do not attach solely based on positive line 22.
4. Select the current authorized TY2026 MeF XSD/rules, then map every filed
   row, election, statement and repeated attachment to actual elements and
   accepted binary references. The downloaded May **v1** package is a diff
   baseline only. Validate complete XML against the selected XSD and active
   rules; render the same return to PDF and compare form, schedule and 1040
   amounts. Run TY2025 regressions for each shared component changed.
5. Exercise multiple activities sharing §179, phaseout and zero active income,
   opening 2025 carryover, ordinary 100% bonus and a pre-cutoff contract,
   eligible/ineligible QPP and attached statement, §168(m) property, GDS/ADS
   and mid-quarter, old assets/disposal, a mixed-use auto with different
   qualified and investment percentages, ≤50% use and later recapture,
   mileage/lease, all six vehicle columns, a 2025-service auto in TY2026,
   home-office building/improvement, and AMT differences. [ATS scenario
   12](ATS-SCENARIO-12.md) exercises related business/amortization paths but
   does not replace these Form 4562 cases.

This contract is a research and implementation plan. Form 4562 remains open
until its 2026 calculation, validation, PDF, MeF and end-to-end evidence pass.
