# TY2025 Form 4562 coverage gap

## October8 current registered-audit reconciliation

The [current bundled audit](../../../../readiness/ty2025-bundled-form-audit-reconciliation-2026-10-08.md) reconciles this form's current scope with actual native/PDF imports and retained terminal evidence. The completed October8 full run records **18 passed/0 failed/0 ignored across5 named modules**; all9 matching runtime paths still equal that tested snapshot. This is selected retained full-run evidence, not a new focused run, full-route support or fresh visual approval. Earlier dated authored/unrun statements below are historical; existing broader source, artifact and IRS requirements remain open. No original checkbox or future task is completed by this correction.


Status: bounded build-first implementation, not filing ready. Do not treat the
registered `IRS4562` builder or PDF descriptor as a fully supported filing path.
Earlier unrun notes below are historical; see the October 9 integrated evidence. IRS ATS validation remains outstanding.

## One taxpayer-owned W-2 included in the section 179 income limit (2026-10-01, unrun)

The bounded one-asset Schedule C route now permits one ordinary employee W-2
whose box 1 wages belong to the taxpayer. The 2025
[Form 4562 instructions, line 11](https://www.irs.gov/instructions/i4562)
include Form 1040 line 1a employee compensation in taxable income from an
actively conducted business. The source replay requires the W-2 employee SSN
to match the return taxpayer, an identified employer EIN, and exact box 1
agreement with finalized Form 1040 lines 1a and 1z. It adds those wages to
the single active Schedule C profit recomputed before its section 179 expense,
and requires that sum to equal the asset's reviewed taxpayer income amount.
The resulting line 11 cap, line 12 deduction, Schedule C line 13, Schedule 1,
Form 1040, native MeF, and PDF use one set of amounts. A full-return positive
fixture and wage, owner, and business-profit tamper fixtures are authored but
unrun. Other wage lines, a second W-2, statutory employee wages, community
property allocation, another active business, and authenticated W-2 bytes
remain outside this route.

Build-first progress: the invalid flat XML serializer has been replaced with the
TY2025 native section 179 line and elected-property sequence. A new direct
`form4562.asset` source accepts one fully elected, nonlisted Schedule C asset,
requires source references and the taxpayer-level business-income limit, and
computes lines 1-13 and 22. The MeF builder requires an exact Schedule C
activity reference and line-13 depreciation reconciliation. Older aggregate
inputs from Schedule E and K-1 sources now fail explicitly; they are not a
fallback. The PDF descriptor has since been replaced with the bounded Part I
mapping described below, but filled-page appearance and validation are still
unverified. No tests, XSD validation, PDF rendering, or ATS acceptance has run
for this new path.

The MeF builder now also checks line 11 against the filed sole Schedule C profit
recomputed without this asset's section 179 deduction, plus the one sourced
ordinary W-2 when present. This narrower route
requires an active, all-at-risk business, no other
business-income attachments, no home-office adjustment, and no separate Schedule
C passthrough amounts or WOTC reduction. A referenced workpaper or an entered
income amount alone no longer establishes the active-income limit. Other
compensation and other businesses can contribute to the legal limit, but their
combination is outside this route until sourced reconciliation exists.

This first path is limited to a 2025 asset whose entire cost is elected under
section 179, with 100% business use, bonus election out, no listed property, no
other depreciation assets on the return, no prior-year section 179 carryover,
and no married-filing-separately allocation. The Schedule C input must already
include the computed Form 4562 line 22 amount on its line 13; Form 4562 does not
add a second deduction to Schedule 1. Residual-basis MACRS, bonus depreciation,
listed property, multiple assets or activities, pass-through elections, and the
other asset classes remain unsupported.

## Bounded TY2025 PDF mapping (build-first, unrendered)

The [official 2025 Form 4562](https://www.irs.gov/pub/irs-prior/f4562--2025.pdf)
has three pages. Its canonical AcroForm positions put page-1 lines 1-5 in
`f1_4`–`f1_8`, the single elected-property row 6(a)-(c) in
`Table_Ln6.BodyRow1.f1_9`–`f1_11`, lines 8-13 in `f1_16`–`f1_21`, and Part IV
line 22 in page-2 `f2_2`. The rebuilt descriptor fills those fields, the filer
name/identifying number, and the business activity. It leaves line 7 and Parts
II, III, V, and VI blank because the only accepted asset is nonlisted, fully
elected under section 179, with no other depreciation. It no longer prints raw
bonus *basis* as line-14 allowance or generic MACRS values in a 19a row.

Before projecting any active PDF, it parses the finalized `filedForm4562Schema`
and runs the same asset, Schedule C line-13, active-business-income, and Form
1040/Schedule 1 source checks as the native MeF builder. Aggregate-only inputs
and unmatched filed lines therefore fail closed. Focused field-path,
source-reconciliation, and missing-source cases are written but unrun. The
cached form's AcroForm tree was inspected read-only; no filled PDF or visual
appearance was rendered in this build pass.

## Source and schema check

- The checked-in TY2025 v5.4 `IRS4562.xsd` starts with optional
  `BusinessOrActivityTxt`, then Part I lines 1-13, Part II lines 14-16, Part III
  nested GDS/ADS rows, Part IV totals, and Parts V-VI. Its corresponding native
  fields include `Section179ExpenseDeductionAmt` (line 12),
  `SpecialAllowanceAmt` (line 14), and `MACRSDedForAstInSrvcBfrPYAmt` (line 17).
  The original flat serializer used non-native direct children; it has been
  replaced with the Part I sequence, but local XSD validation is still pending.
- The [2025 Form 4562](https://www.irs.gov/pub/irs-pdf/f4562.pdf) distinguishes
  cost, elected cost, current deduction, and next-year carryover on lines 2,
  6-13; line 14 is the _allowance_, not its qualifying basis; and Part III
  requires property-class rows rather than one flat basis/period/year trio. The
  [2025 instructions](https://www.irs.gov/pub/irs-pdf/i4562.pdf) put
  pass-through section 179 amounts on line 6 with the relevant Schedule K-1
  source, and require the taxpayer-level business-income limit on line 11.

## Original audited mismatch

The points below describe the pre-rebuild code and explain why its aggregate
route was replaced. They are retained as the original audit record.

1. `forms/f1040/nodes/intermediate/forms/deductions/business/form4562/index.ts` computes one
   combined deduction and routes it to Schedule 1, an AGI aggregator, and
   Form 6251. It never returns a `form4562` print-field output. The MeF
   descriptor consequently receives raw pending inputs, not a reconciled version
   of lines 1-22.
2. The node accepts one `section_179_cost` and `section_179_elected`, but no
   asset description, K-1 provenance per amount, activity identifier, or
   per-business allocation. The instructions permit a summary election and
   separate activity forms, but a combined amount cannot be assigned to the
   correct form or line 6 property row from these inputs.
3. `computeSection179` allows an elected amount to exceed the supplied cost and
   allows a positive deduction without a supplied nonnegative business income
   limit. It adds upstream K-1 amounts, direct election, and carryover before
   applying a single cap, while the printed lines 8-13 require distinct
   tentative deduction, carryover, allowed deduction, and next-year carryover.
   Mapping this aggregate to line 12 would hide those gaps.
4. Bonus inputs are qualifying _basis_ and election flags. The node computes the
   actual allowance but does not expose it to the serializer. Mapping either
   basis to `SpecialAllowanceAmt` would overstate line 14.
5. The one MACRS basis/period/year input lacks a property class, asset-level
   service date for the current year, and convention/method for many rows. The
   node can calculate selected rates, but the form's nested GDS and ADS rows
   cannot be reconstructed for a general return. Prior depreciation needs its
   separate line 17, not a current-year 19a row.
6. `forms/f1040/2025/pdf/forms/deductions/business/f4562.ts` maps raw bonus basis into a line-14
   field and multiple generic MACRS inputs into one 19a row. Its comments also
   shift the official Part I line numbers. It needs an independently verified
   2025 AcroForm mapping after the print fields are defined.

## Remaining safe rebuild

The first source path now covers one fully elected nonlisted Schedule C asset
with no residual MACRS or bonus basis, and reconciles the deduction to that
activity's Schedule C line 13. It still needs the single full test batch, local
XSD validation, and a visually checked filled PDF. The next asset path needs
separate source facts for residual basis, MACRS class/convention, and bonus
eligibility. K-1 passthrough, multiple assets or activities, listed property,
and ADS remain outside the bounded path until their source and allocation models
exist. The old flat XML builder is not a fallback.

Before claiming this form, add source-to-calculation, calculation-to-MeF,
negative missing-source, local XSD, and filled-PDF cases, then include them in
the agreed single full batch and IRS business-rule/ATS gates.

## October 9 bonus-asset and Form 8911 integration

A new `form4562.bonus_asset` route complements the existing section 179 asset. It computes a 100% special allowance for one new, wholly business-use, nonlisted, reviewed MACRS asset acquired after January 19, 2025. Source dates, elections, ADS/exclusion answers, owner, sole-asset inventory and business reference are retained. The native/PDF path requires exactly one participating taxpayer-owned Schedule C with the same line 13 deduction. A Form 8911 claim additionally requires exact property/invoice/cost/date/description joins and credit basis reduction before depreciation. The full credit reduces basis even when the current-year general business credit tax limit is smaller.

The linked $10,000/$100,000 property cases produce $9,400/$94,000 on native/PDF Form 4562 lines 14 and 22. Both complete returns validate against TY2025 2025v5.4 and all 40 pages have visual evidence; Form 4562 appears on pages 15–17. A separate positive prepared-return test covers the no-credit bonus asset. The grouped 361-test regression and four final integration checks cover existing section 179 routes, source conflicts, invalid dates/elections/ADS, native reference IDs and both credit limits. [Form 8911 batch evidence](../../../credits/business/form8911/ty2025-form8911-pdf-gap.md) retains scope and artifact locations.

This is not general MACRS, mixed use, listed property, multiple assets, reduced bonus, earlier acquisition, section 179 plus residual basis, or independently authenticated source support. Those existing coverage decisions remain open. The future-only section 179 service-date review item is unchanged.


## Multiple-asset inventory and activity copies — October 9

The `form4562.bonus_inventory` source now retains a complete return inventory with distinct asset identities, unique credit-property links and one inventory review reference. New qualifying assets may share an activity or belong to separate participating taxpayer-owned Schedule C businesses. Depreciation aggregates by business, reconciles each Schedule C line 13, and emits one Form 4562 XML/PDF copy per activity. Ordinary equipment without a property credit may be included. Every positive business Form 8911 property must match exactly one asset; duplicate, missing, swapped-owner/invoice/activity, altered basis and altered filed-total cases reject. Form 3800 checks the actual number of depreciation documents and retains the exact Form 8911 parent reference.

Three complete public-input returns validate against the cached TY2025 2025v5.4 Return1040 schema. Two $10,000/$20,000 chargers produce $28,200 depreciation in one activity or $9,400/$18,800 in two activities, aggregate credit $1,800, tax $2,075 and refund $4,925. The $100,000/$10,000 two-activity case produces $94,000/$9,400 depreciation and $6,600 credit, limited to $3,875 this year, with tax zero and refund $7,000. Each case retains zero Schedule C net profit so unrelated self-employment/QBI scope is not inferred from it. These are synthetic reviewed-source fixtures, not authenticated invoices or accepted ATS returns.

The grouped regression passed 366 tests with zero failures. PDF packets have 21/26/26 pages, zero fields/widgets, and complete visual coverage: 27 newly inspected distinct renders plus 46 byte-identical matches to reviewed pages. Artifacts and the exact-page match manifest are under `.state/research/form8911-inventory-returns/`; retained execution checkpoint is `form8911-inventory-batch-checkpoint.json`. The final inventory/PDF run passed seven checks, including filer-proprietor conflicts without W-2 evidence; these overlap the grouped run and are not added to its count.

Authorities: [Form 4562 instructions](https://www.irs.gov/instructions/i4562) require a separate form for each business/activity; [Form 8911 instructions](https://www.irs.gov/instructions/i8911) require credit basis reduction. This extends the single bonus-asset route; earlier single-asset limitations above are historical. General MACRS, mixed use, increased-rate/PWA, section 179 combinations, spouse activities and accepted carry/election/source records remain open. No main parent TODO is closed.

## Profitable business integration evidence — October 9

Four additional complete public-input returns exercise one, two and six profitable taxpayer-owned Schedule C activities, including a credit-limited case. Reviewed synthetic allocation assertions assign the deductible half of SE tax across businesses before QBI; they do not authenticate external books or invoices. Independent expected amounts use the [2025 tax table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), [Schedule SE guidance](https://www.irs.gov/publications/p334) and [Form 8995 instructions](https://www.irs.gov/instructions/i8995).

| Case | SE tax | Half-SE deduction | QBI deduction | Income tax | Allowed credit | Total tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| One business | 1,413 | 707 | 1,859 | 4,763 | 600 | 5,576 |
| Two businesses | 4,238 | 2,119 | 5,576 | 7,361 | 1,800 | 9,799 |
| Credit limited | 4,238 | 2,119 | 5,576 | 7,361 | 7,361 | 4,238 |
| Six businesses | 8,478 | 4,239 | 11,153 | 12,267 | 3,600 | 17,145 |

The credit-limited case reduces depreciable basis by the full $18,000 property credit even though only $7,361 offsets current income tax; SE tax remains payable. Six businesses retain distinct depreciation/property documents and a readable sixth-business Form 8995 continuation. Changed SE, QBI, allowed-credit or final-tax amounts and missing allocation review reject during preparation.

All four complete XML returns validate against cached TY2025 2025v5.4 Return1040 XSD. Their 151 PDF pages (27/33/33/58) are covered by visual review of 67 distinct rendered pages and 84 exact PNG hash matches to reviewed pages; all packets have zero remaining AcroForm fields/widgets. Focused regression passed 82 tests; two final tests passed after strengthening document-ID and full-basis-reduction assertions (overlapping scope, not an additive count). Artifacts: `.state/research/form8911-profitable-returns/`; checkpoint: `.state/research/board-execution-2026-10-08/form8911-profit-batch-checkpoint.json`.

This verifies the bounded existing route; broader form support, external source authentication, matching IRS business rules and ATS acceptance remain open. CI at preceding head `0885b3b12` exhausted its V8 heap before producing JUnit; that investigation is deferred in `future_todo` and no green CI claim is made.

## Reviewed construction-exception credit filing — October 9

The 30% construction-exception route now requires an identified project/property review with either significant physical-work records or paid/incurred costs meeting the five-percent safe harbor. It checks real dates, the January 29, 2023 cutoff, continuity through service, review chronology, property membership, sufficient project cost and agreement between reviews for a shared project. A date alone does not open filing. The [Form 8911 instructions](https://www.irs.gov/instructions/i8911) establish the two methods and continuity requirement; the [Form 7220 instructions](https://www.irs.gov/instructions/i7220) explicitly exempt qualifying beginning-of-construction claims from that attachment. Actual PWA claims remain guarded.

The source review joins the existing fully business-use, taxpayer-owned, zero-section179 bonus inventory. Project construction start and an asset's tax acquisition date are distinct source facts: the retained bonus qualification review must establish the asset's post-January-19-2025 acquisition and other eligibility; project construction evidence does not establish that qualification. These synthetic records prove source/amount joins, not authentication of contracts, invoices, construction or continuity. Earlier-acquired/self-constructed and residual MACRS assets still need the existing broader depreciation work.

| Case | Property credit | Depreciation | Current credit use | Total tax |
| --- | ---: | ---: | ---: | ---: |
| Physical work, $10,000 asset | 3,000 | 7,000 | 3,000 | 3,176 |
| Five-percent method, $100,000 asset | 30,000 | 70,000 | 4,763 | 1,413 |
| $400,000 asset, property cap | 100,000 | 300,000 | 4,763 | 1,413 |
| Two properties, shared project | 9,000 | 21,000 | 3,875 | 0 |
| Separate 30%/6% properties | 4,200 | 25,800 | 3,875 | 0 |

The three profitable cases also retain SE tax 1,413, half-SE deduction 707 and QBI deduction 1,859. Current-year credit limitation does not reduce the full property-credit basis adjustment. Five complete returns pass cached TY2025 2025v5.4 Return1040 XSD; their 133 pages (27/27/27/26/26) have 45 distinct visual reviews plus 88 exact rendered-page hash matches, with zero remaining PDF fields/widgets. The existing deferred Schedule A line-6 template-border issue is unchanged. The 37-test focused regression passes, including prior base-rate, inventory, profit, presentation and property calculation checks. Artifacts: `.state/research/form8911-construction-returns/`; retained checkpoint: `form8911-construction-batch-checkpoint.json`.

Main parent tasks remain open for broader form variants, authenticated source records, matching IRS business rules and ATS acceptance. No future-only task was implemented.

## Current-year residual MACRS inventory — October 9

`current_year_inventory` now joins reviewed 40% and 100% bonus assets in one
complete TY2025 calendar-year register. The acquisition review explicitly covers
binding contracts, excludes self-construction, long-production property and
certain aircraft, and retains the original-use, nonlisted, full-business-use,
GDS/bonus-eligibility and no-election facts. This supplements the existing
section 179 and post-January-19 bonus routes; it does not establish later-year,
ADS, listed-property, mixed-use, disposition or section 179/residual combinations.

The calculation reduces basis by the full linked Form 8911 credit, applies the
return-wide **strictly greater than 40%** last-quarter test before bonus, and
then applies the acquisition-date bonus rate. Remaining basis uses 200% declining
balance for 3/5/7/10-year property or 150% for 15/20-year property. Half-year and
all four mid-quarter fractions use exact rates, with rounding at each filed
aggregate line. This is the computation without percentage tables permitted by
[Publication 946](https://www.irs.gov/publications/p946), not the rounded table
method. Asset classifications remain reviewed source assertions, not independent
classification or invoice authentication.

The source inventory and calculated activity rows are retained together; filing
recomputes them and rejects altered basis, period, method, convention, deduction,
owner, activity or invoice joins. One native/PDF Form 4562 is emitted per business.
Lines 19a–f show class basis, recovery period, convention, method and deduction;
line 14 plus those deductions reconciles line 22 and Schedule C line 13. These
columns and the before-bonus convention test follow the
[2025 Form 4562 instructions](https://www.irs.gov/instructions/i4562).

| Complete return | Bonus | Regular MACRS | Total depreciation | Business credit | Final tax |
| --- | ---: | ---: | ---: | ---: | ---: |
| Five-year asset, half-year | 3,760 | 1,128 | 4,888 | 600 | 5,576 |
| Five-year asset, fourth-quarter | 3,760 | 282 | 4,042 | 600 | 5,576 |
| Reviewed construction-exception credit, half-year | 2,800 | 840 | 3,640 | 3,000 | 3,176 |
| Two profitable businesses, mixed 40%/100% bonus | 22,560 | 1,410 | 23,970 | 1,800 | 9,799 |
| Six recovery classes, one linked charger | 23,760 | 5,110 | 28,870 | 600 | 5,576 |
| Three five-year assets in quarters 1/2/4 | 22,560 | 5,640 | 28,200 | 3,600 | 2,576 |

The single-business cases retain net profit 10,000, SE tax 1,413, half-SE 707 and
QBI deduction 1,859. The two-business case retains profits 10,000/20,000, reviewed
half-SE allocations 706.33/1,412.67, SE tax 4,238 and QBI deduction 5,576. Missing
allocation evidence remains rejected. Tests also cover the January 19/20 cutoff,
exact convention threshold, all six classes in all quarters, line-level rounding,
invalid eligibility/dates and source/output tampering.

Six complete returns validate against cached TY2025 2025v5.4 Return1040 XSD.
All 170 PDF pages are reviewed: 26 distinct visual inspections and 144 exact
rendered-page matches to reviewed pages, with zero PDF fields/widgets. The
34-test regression passes with type checking at an 8 GB local V8 heap limit; it
includes prior section 179, bonus, inventory, construction and profitable routes.
The Form 4562 descriptor uses `satisfies` to retain its exact callable members
without introducing an unused attachment-builder signature into the registry.
Artifacts and render review are retained in
`.state/research/form4562-current-year-returns/`. No matching IRS business-rule
acceptance or authenticated external asset records are established; the broader
Form 4562 parent task remains open.

## Reviewed bonus elections and required statements — October 9

The current-year inventory accepts a reviewed election source identifying the
owner, elected-out recovery classes, the 40% transitional choice, taxpayer
authorization, timely-original-return confirmation and review references. Every
asset must agree with that source. An opt-out covers the entire class across all
activities; reduced bonus covers eligible post-January-19 property outside opted-
out classes. Duplicated/absent classes, mixed choices within a class, partially
applied reduced rates, missing reviews and changed owners reject. These are
reviewed facts, not independently authenticated consent or extension records;
amended/late elections, revocations and other eligibility branches remain open.

The [Form 4562 instructions](https://www.irs.gov/instructions/i4562) require a
class-specific opt-out statement on the timely return. [Notice 2026-11 section
4.03](https://www.irs.gov/pub/irs-drop/n-26-11.pdf) applies the transitional election
procedures to 2025's 40% rate and January acquisition boundary. [26 CFR
1.168(k)-2(f)](https://www.ecfr.gov/current/title-26/section-1.168(k)-2) supplies the
underlying election, timing and owner rules. This route retains the existing
full-calendar-year, nonlisted, GDS, original-use, no-section-179 eligibility
boundaries. Qualifying elected-out property does not acquire an AMT depreciation
adjustment solely because of the election; other AMT-source work remains separate.

Two source-derived native descriptors now emit the opt-out under
`SpclDeprecAllwncElectOutStmt` and the reduced-bonus explanation under
`GeneralDependencyMedium`. The latter includes the taxpayer SSN, Form 4562 line
reference, statutory reference and complete election paragraph. Each statement
prints once after the first Form 4562 copy; all activity copies retain their own
bonus, class rows and Schedule C joins. There is no extra statement for a default
rate. Both representations use the reviewed choice and reconcile the complete
asset inventory before output.

| Complete return | Bonus by activity | Total depreciation by activity | Final tax | Pages |
| --- | --- | --- | ---: | ---: |
| Five-year class opt-out, half-year | 0 | 1,880 | 5,576 | 28 |
| Reduced 40% bonus, fourth-quarter | 3,760 | 4,042 | 5,576 | 28 |
| Five-year class opt-out across two businesses | 0 / 0 | 2,350 / 940 | 9,799 | 34 |
| Reduced 40% across two businesses | 3,760 / 7,520 | 5,170 / 8,084 | 9,799 | 34 |
| Six classes: four opt-outs and two reduced-rate classes | 7,760 | 15,125 | 5,576 | 29 |

The 37-test grouped regression passes with type checking at the 8 GB local heap
limit, covering both new choices and prior section 179, bonus, construction,
credit, residual-MACRS and profitable-return routes. Five complete returns pass
cached TY2025 v5.4 XSD. All 153 pages are verified through 18 distinct visual
reviews and 135 exact matches to reviewed pages; each native election paragraph
appears exactly once in the corresponding PDF. No fields/widgets remain. Evidence:
`.state/research/form4562-election-returns/` and
`form4562-election-batch-checkpoint.json` in the retained execution directory.
These results establish local statement parity, not IRS business-rule approval,
authenticated source records or accepted elections.


## Reviewed GDS method elections — October 9

The complete current-year inventory now accepts a reviewed class-wide election
of 150% declining balance for 3/5/7/10-year property or straight line over GDS
periods for any of the six supported classes. The review retains taxpayer
identity, class/method choices, consent, timely-original-return confirmation,
review date and source references. Every asset in an elected class must agree,
including assets in another business or with no remaining basis after bonus.
Duplicate/absent classes, wrong owners, invalid dates and unreviewed or partial
choices reject. These reviewed synthetic facts do not authenticate consent or
a timely return.

[Publication 946](https://www.irs.gov/publications/p946) makes these method
elections through Form 4562 Part III column (f), applies them to the whole
placed-in-service class, and requires a timely election. The
[Form 4562 instructions](https://www.irs.gov/instructions/i4562) distinguish
150 DB and S/L over GDS periods from the separate ADS election. The calculation
uses exact first-year method rates and HY/MQ fractions on basis remaining after
credit and bonus. Existing native/PDF rows carry the chosen method and reconciled
amounts; even a zero-residual business copy retains its elected method row.
No new statement descriptor is needed for these original-return elections.

| Complete return | Method | Bonus | Total depreciation | Credit | Final tax |
| --- | --- | ---: | ---: | ---: | ---: |
| Five-year half-year | 150 DB | 3,760 | 4,606 | 600 | 5,576 |
| Five-year bonus opt-out | S/L | 0 | 940 | 600 | 5,576 |
| Five-year reduced bonus, fourth quarter | 150 DB | 3,760 | 3,972 | 600 | 5,576 |
| Two businesses, mixed acquisition dates | S/L | 3,760 / 18,800 | 4,465 / 18,800 | 1,800 | 9,799 |
| Six classes, bonus opt-outs/reduced election | 150 DB for 3/5/7/10; S/L for 15/20 | 7,760 | 13,210 | 600 | 5,576 |

The single-business cases retain profit 10,000 and QBI deduction 1,859; the
two-business case retains profits 10,000/20,000 and QBI deduction 5,576.
Focused checks cover all six straight-line classes under HY and all MQ quarters,
complete return amounts, class-wide source consistency and altered filed
methods/deductions. Broader section 179 combinations, ADS, later-year changes,
listed/mixed-use property, source authenticity, business rules and IRS acceptance
remain open. Existing main parent tasks and deferred discoveries are unchanged.

The grouped regression passed **41 tests, zero failures**, including existing
section 179/W-2, bonus, inventory, construction-exception, profitable-business
and Form 3800 joins. Five complete returns validate against cached TY2025
2025v5.4 Return1040 XSD. All 145 PDF pages are reviewed: 15 distinct renders
inspected and 130 exact hash matches to reviewed pages, with zero fields/widgets.
Artifacts: `.state/research/form4562-method-returns/`; checkpoint:
`form4562-method-batch-checkpoint.json`. These local checks do not establish IRS
business-rule or ATS acceptance.
