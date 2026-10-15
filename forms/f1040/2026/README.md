# TY2026 calculation and return-assembly foundation

This directory starts the 2026 implementation on current main. It is not the
historical prototype restored wholesale, and it is not registered as a filing
product. The ongoing branch is `codex/ty2026-readiness`.

## Implemented

- The existing 2025 standard-deduction node and the 2026 wage baseline call the
  same `standardDeductionAmount` implementation. Year-specific amounts are
  supplied explicitly, including dependent minimum/earned-income additions.
- The existing 2025 ordinary-tax path above the Tax Table cutoff and the 2026
  baseline call the same `rateScheduleTax` implementation. The existing 2025 Tax
  Table and preferential-income worksheets retain their behavior.
- `nodes/config/2026-income.ts` contains the audited subset of 2026 constants
  from [Rev. Proc. 2025-32 §§4.01, 4.14](https://www.irs.gov/irb/2025-45_IRB),
  checked October 15, 2026. It does not fill missing constants with 2025 values
  or enable unaudited nodes through a complete `F1040Config` registration.
- `calculateWageBaseline2026` sums classified taxable wages, applies the base
  standard deduction and calculates an ordinary rate-schedule preview. It
  rejects unrecognized input fields and reports `canFile: false`.
- The CLI rejects unsupported return products before creating metadata files.
- `assembleReturn2026` runs the shared input router and executor with a bounded
  Form 1040/Schedule 3-A registry. It consumes finalized upstream amounts; it is
  an internal assembly API, not a public facts/source-document API.
- The 2026 finalizer assembles income, deductions, credits, withholding, refund
  allocation and balance due. It maps nonitemizer charity to 12f, Schedule 1-A
  to 13a, QBI to 13b, Form 1062 to 24b, and the Schedule 3-A reduction to 32b.
  Individual printed operands use the existing signed whole-dollar helper.
- Schedule 3-A implements the zero-benefit stop and line 7/8 answer branches;
  its Schedule 2 line 20 exclusion cannot exceed Form 1040 line 23. Header work
  authorization is kept separate from the schedule's eligibility answer.
- Separate Schedule 1 and Schedule 2 output calculations reject stale line
  mappings. Schedule 1 requires agreement with finalized AGI totals. Positive
  Schedule 2 section 965 installments remain held because the pinned draft's
  line 12/15 instructions conflict. The Schedule 2 graph sink currently accepts
  reviewed W-2 payroll/golden-parachute, Form 4137, Form 8919 and Form 8959 sources.
- Fourteen local rules reconcile income, tax, deductions, payments, refund and
  required attachments. They are arithmetic checks, not IRS MeF acceptance.
- Draft Form 1040 and Schedule 3-A PDF components use pinned IRS hashes and the
  shared 2025 template cache. Form 1040 supports four dependent columns plus a
  continuation. Draft markings remain visible. The loader accepts checked-out
  LFS bytes or downloads exactly the reviewed bytes into the ignored cache;
  changed sources fail verification.

Example, from the repository root:

```sh
deno eval 'import { calculateWageBaseline2026 } from "./forms/f1040/2026/wage-baseline.ts"; console.log(calculateWageBaseline2026({filing_status:"single", wages:[150000]}));'
```

This produces a $16,100 base deduction, $133,900 taxable-income baseline and
$24,734 ordinary rate-schedule tax before credits and other taxes. It does not
calculate total tax, a refund or an amount due. In particular, the preview
assumes base-standard-deduction eligibility and excludes age/blind additions,
dependent eligibility, itemization, Schedule 1-A and charitable deductions,
credits, other income/taxes, and withholding. Below $100,000, annual rate tax is
an estimate until the final 2026 Tax Table is implemented and checked.

## W-2 and AGI source integration

The 2026 W-2 adapter calls the existing W-2 routing implementation with a narrow
2026 configuration. The shared 2025 entry point still selects its own original
configuration. The 2026 adapter requires issued-copy references and employer and
employee identities, checks return ownership, and preserves the complete source
record. `inputs.ts` contains its repeated `w2s` input entry and the singleton
2026 general source node, which supplies the return identity before W-2 runs.

- The 2026 schema supports box 14a/14b and new box 12 TP, TT and TA values.
  Tip/overtime source amounts are retained for 2026 Schedule 1-A; neither is
  added to box 1 again. Multiple occupation codes, including `000`, remain
  explicit. The 2025 transitional employer-statement fields are rejected.
- Ordinary wages, withholding, statutory-employee business sources, Medicare,
  dependent-care, HSA/MSA, retirement and state/local-tax handoffs reuse the
  existing source routing. W-2 uncollected FICA and golden-parachute tax use the
  revised Schedule 2 destinations. These emitted handoffs still need their
  complete 2026 receiving calculations and attachments.
- Excess Social Security withholding uses the $184,500 wage base and $11,439 cap
  separately for each owner, includes Social Security tips, and rejects
  employer-level overwithholding before computing a multi-employer credit.
- A narrow AGI configuration supplies the 2026 student-loan phaseout. The shared
  AGI algorithm runs through a strict 2026 adapter, which remaps the Schedule 1
  reconciliation fields and removes the old Form 1040 AGI key. Upstream activity
  limits and source eligibility remain each source calculator's responsibility.
- Positive Medicaid-waiver code II, section 409A code Z, and deferrals exceeding
  the owner's base limit currently require further 2026 review. Catch-up/Roth,
  enhanced SIMPLE limits, corrections/substitute W-2s and community-property
  allocation are unfinished; no 2025 evidence is silently accepted for them.

The internal graph test covers general identity and cash-gift records → issued
W-2 → AGI → deduction resolution → Form 1040 settlement. Only finalized income
tax is supplied by the fixture. It intentionally exposes the
remaining credit/form pending records. It is not a complete public return graph.
The `w2_2026_sources` handoff now feeds the employee/senior Schedule 1-A
calculator described below; its other source branches remain unfinished.

The 224-test combined 2026/W-2/AGI run passed; 21 focused tests passed after the
final shared-line rounding and input-catalog changes. The existing 2025 W-2,
community-property and AGI suites are included in the combined run.

## Filer and dependent sources

The 2026 general node reuses the existing dependency classification, credit-SSN
checks and age-65 helper. An explicit year policy supplies the 2026 age cutoff,
$5,300 qualifying-relative gross-income limit, younger-than-filer test and
reviewed residence behavior; existing 2025 callers retain their original policy.
Counts and credit categories are derived from source rows rather than accepted
as asserted totals.

- Identity is checked across taxpayer, spouse, dependents and W-2 owners. Joint
  returns require spouse facts; HOH/QSS need qualifying-person and home-cost
  reviews, including the applicable spouse-death year for QSS.
- `claim_as_dependent: false` retains an EIC source child without adding a
  dependent row or child/dependent credit count. EIC does not use the child's
  self-support test. Student status needs at least five full-time months.
- Dated residence checks inclusive days, lifetime boundaries, overlapping
  periods and actual calendar months. Birth/death exceptions require their
  source records; Schedule EIC printed months remain separate from actual
  months. The Form 1040 rows and continuation use the reviewed residence result.
- The node routes identity and eligibility facts to pending deduction and
  credit owners, but those 2026 calculators are still unfinished. It does not
  establish a final EIC or child-credit amount.
- Custody releases, PTC households, competing-claim/tiebreaker evidence,
  adoption/placement exceptions, multiple-support agreements, nonclaimed
  HOH/QSS exceptions, deceased filers and born-and-died children without a TIN
  still need dedicated 2026 handling. The old 2025 review objects are rejected.

Sources checked October 15: [IRS qualifying-child rules](https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/qualifying-child-rules),
[Rev. Proc. 2025-32 §4.23](https://www.irs.gov/irb/2025-45_IRB), and
[draft 2026 Schedule EIC](https://www.irs.gov/pub/irs-dft/f1040sei--dft.pdf).

## Joint deduction resolution and cash-gift sources

`deduction-resolution.ts` owns the standard/itemized comparison. It reuses the
same standard-amount and election helpers as 2025, adds the nonitemizer cash
candidate, applies the 2026 overall itemized limit, and retains both candidates
and the selection reason. The selected values drive Form 1040 and the draft
Form 6251 line 1b/2a handoff. Negative AMT bases remain signed.

A QBI calculation interface takes actual pre-QBI taxable income for each
candidate and retains that candidate's form results. Schedule A and QBI are
solved together over the finite interval of possible filed dollar amounts;
exactly one pair must reproduce both calculations. No monotonic QBI assumption
is made across SSTB/other phase-ins. Zero or multiple solutions require rounding
review. Searches exceeding one million candidates require a future piecewise
solver instead of a silently approximate result.

The graph adapter currently handles no-QBI calculations. AGI marks business
income for the unfinished QBI source owner, and the adapter rejects a previously
calculated `qbi_deduction`. The pure solver tests exercise the coupled equations
with independent QBI test calculators; they do not establish completed Forms
8995/8995-A. Remaining Schedule A categories, the remaining Schedule 1-A source branches,
QBI forms/attachments, dependent earned-income classification, and foreign-tax
allocation still need their receiving 2026 owners. The existing finalization API
continues to accept upstream finalized amounts only.

`cash_gifts` is a repeated source entry with donor/donee identity, current-year
payment and classification records, benefits received, QCD status and
contemporaneous acknowledgment facts. It excludes QCDs, donor-advised funds,
supporting organizations and other ineligible recipients from the nonitemizer
amount. Credits/reimbursements await a separate reduction review. The same
identified gift records feed the Schedule A category/floor calculator below;
they are not asserted as a net itemized deduction.

The resolver applies the retained 60% contribution-base ceiling before the
$1,000/$2,000 cap. Section 170(p) excludes carryforwards and the itemizer floor;
it does not exclude section 170(b)(1)(G)(i). The contribution base may be supplied
separately from AGI when an NOL carryback changes it. General supplies separate
tax-residency and accounting-period answers for standard-deduction eligibility;
work authorization alone is insufficient. Residency elections/treaty exceptions
and disaster additions remain to implement.

Sources checked October 15: [26 USC §170(b)(1)(G), (H), (p)](https://uscode.house.gov/us/usc/119-118/t26/s170/),
[Publication 505 (2026), Worksheet 2-6](https://www.irs.gov/publications/p505),
[standard-deduction eligibility](https://www.irs.gov/taxtopics/tc551), and
[draft Form 6251 lines 1a–2a](https://www.irs.gov/pub/irs-dft/f6251--dft.pdf).

## Schedule 1-A calculation and draft attachment

The 2026 Schedule 1-A adapter reuses the existing stepped-phaseout and senior
arithmetic. The 2025 node calls those same extracted helpers without changing
its source contract or form lines. Current 2026 TP/TT sources, filer eligibility
and AGI now feed deduction selection: line 44 becomes Form 1040 line 13a, while
line 43 remains separate for the Form 6251 basis adjustment.

Public `schedule1a` input contains source-inventory and qualification evidence,
not calculated amounts. Each TP review reconciles qualified occupation amounts
plus excluded tips to the issued W-2, retains its records, and checks the
current occupation list. TP alone does not establish qualified tips. The source
owner and employer must match, duplicate sources/reviews are rejected, and
missing SSN review facts cannot silently become a zero deduction. Issued TT
supplies qualified overtime; return-level caps, completed-$1,000 phaseout steps
and the per-person senior reduction follow the 2026 draft. Printed source rows
round before their line totals are added. Ineligible and fully phased-out
outcomes remain inspectable.

Part I requires either the existing sourced zero-exclusions review or all four
upstream exclusion amounts with references. Positive addbacks are internal
calculator inputs, not public source fields. The Form 2555 line 45 addback must
agree with the exclusion used by AGI. The foreign/territorial source calculators
and their complete 2026 attachment routes are not yet implemented.

This adapter currently covers ordinary employee W-2 tips/overtime, Form 4137
tips, seniors and reviewed vehicle-loan interest. Form 4137 and W-2 TP are
compared separately for each owner/employer using the larger qualified amount.
The source-inventory review must agree with the Form 4137 handoff. Business tips,
non-W-2 overtime and statutory-employee sources still need their business/net
profit and QBI coordination. Schedule 1-A MeF remains to build.

The draft PDF recalculates its internal source inputs and checks line 44 against
Form 1040 line 13a. It prints all three form pages, plus separate continuations
for more than five tip employers, five overtime employers or two VINs. Sources
and zero-result lines remain visible after phaseout. The template is pinned at
SHA-256 `e22aec7feb2f5b734e16ee74d70acfdfdc0d66a5292f69cf0ced3b87543d95ac`;
output is static with draft markings. This is a component for the future complete
return bundle, not a claim that all required attachments are implemented.

Sources checked October 15:
[2026 Schedule 1-A draft](https://www.irs.gov/pub/irs-dft/f1040s1a--dft.pdf),
[2026 W-2 instructions](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf),
[current tipped occupations](https://www.irs.gov/TippedOccupations), and
[TD 10044 and the retained SSTB transition relief](https://www.irs.gov/irb/2026-18_IRB).

## Form 4137 source and payroll integration

The 2026 adapter reuses the existing employer matching, allocated-tip diary,
below-$20-month and payroll-tax calculation. A year policy supplies the record
window and January reporting deadlines; 2025 retains its original defaults.
2026 calculations round printed row operands and use the $184,500 Social Security
wage base separately for each spouse. All W-2 payroll amounts must be known when
Form 4137 is filed; missing boxes are not silently assumed to be zero.

Public intake supplies annual tip records, employer identities and qualification
allocations, with source references. The qualifications must reconcile to **all**
line 1(c) tips. Neither an asserted qualified total nor the unreported difference
replaces those records. The adapter checks owner/employer/W-2 identity and rejects
duplicate employers or issued copies. Below-allocation income requires reconciled
daily records, including the December/January reporting boundaries.

The unreported difference enters Form 1040 line 1c and AGI once. It also contributes
to the pending earned-income credit calculations. Payroll tax goes to Schedule 2
line 16a and its line 20/21 totals, then to Form 1040 settlement. Form 8959 receives
Medicare tips; Form 8919 and Schedule SE retain separate owner payroll handoffs.
The 2026 Form 8919 and Form 8959 receivers are implemented below; Schedule SE
and credit calculators remain unfinished. MFS still
owes payroll tax while receiving no tips deduction. Government-employee Social
Security exclusions need a coverage record; Medicare tips remain taxable.

The [March 2026 Form 4137 draft](https://www.irs.gov/pub/irs-dft/f4137--dft.pdf)
still refers to the old Schedule 2 line 5. Routing follows the actual reviewed
[2026 Schedule 2](https://www.irs.gov/pub/irs-dft/f1040s2--dft.pdf), line 16a.
The internal integration fixture proves $2,000 of additional income, $153 of
payroll tax and a $19,800 tips deduction after comparing $18,000 of qualified TP
with $20,000 of qualified Form 4137 tips at $152,001 AGI.

The issued W-2 source is still required. Applied-for EINs, substitute/corrected
W-2s, railroad tips, statutory-employee coordination and noncash-tip income need
separate source handling. Form 4137 MeF, complete PDF bundle selection and full
payroll/credit integration remain release gates; the existing Schedule 1-A component already
has the Form 4137 comparison column.

The Form 4137 PDF component now uses the pinned 34-field draft, recalculates
sources and checks Form 1040 line 1c, Schedule 2 line 16a and recipient identity.
It prints a separate form per spouse and additional first-page rows beyond five
employers, with all totals on the first copy only. Printed row rounding follows
the calculator. The line 10 government-employee annotation retains the Medicare
amount excluded only from Social Security. Draft markings and the source's old
Schedule 2 reference remain visible; the destination check uses the reviewed
2026 line 16a. No editable widgets remain.

## Form 8919 employee wage sources and draft attachment

The 2026 adapter reuses the existing per-firm A/C/G/H evidence validation and
payroll calculator with the $184,500 wage base. Employer wages are derived from
identified 2026 NEC box 1a, MISC box 3 or direct payment records. Each information
return reconciles to underlying wage-payment IDs; repeated documents or payments
fail. Same-firm cash payments omitted from information returns can supplement
those sources before rounding. A positive source amount may round to zero on
its printed row; the 2025 positive-input schema remains unchanged.

The adapter checks recipient/firm identity, SS-8 and IRS correspondence dates,
actual W-2 payroll boxes, reason H's same-firm W-2, and the review that payments
are employee wages omitted from W-2/other income with no FICA withheld. Form 4137
line 10 consumes the same owner's wage base first. The resulting Form 8919 wages
reach Form 1040 line 1g and AGI once, tax reaches Schedule 2 line 16b, source
withholding reaches Form 1040 line 25b and Medicare wages reach Form 8959 line 3.
Earned-income and Schedule SE receivers remain pending.

This is focused employee-compensation intake. Corrected NEC/MISC copies,
positive tip/overtime detail, NEC golden parachutes and other reportable boxes
remain held for their respective source owners. It does not replace the full
business/property source nodes or enable the public filing registry.

The pinned Form 8919 PDF component checks source calculations, destination
amounts and recipient identity. Each spouse receives a separate form, with
additional first-page copies beyond five firms and totals on only the first
copy. All 40 template fields are inventoried; line 7's tiny dummy widget stays
empty because the wage base is preprinted. The static output retains draft
markings. Current MeF serialization and full return attachment assembly remain
release gates. Sources checked October 15:
[2026 Form 8919 draft and instructions](https://www.irs.gov/pub/irs-dft/f8919--dft.pdf),
[2026 Form 1099-NEC](https://www.irs.gov/pub/irs-pdf/f1099nec.pdf) and
[2026 Form 1099-MISC](https://www.irs.gov/pub/irs-pdf/f1099msc.pdf).

## Additional Medicare Tax and CT-2

The 2026 Form 8959 node implements the revised 24 lines, using the shared exact
0.9% tax helper and a whole-dollar 1.45% withholding calculation. Wage and RRTA
taxes go to Schedule 2 line 17b; SE tax goes separately to line 11. The resulting
Schedule 2 line 20 employment-tax amount remains separate for Schedule 3-A.
Form 8959 withholding adds to Form 1040 line 25c even when liability is zero.

W-2 records retain owner/employer/source identity and actual Medicare box 5/6
values. Missing amounts fail validation, including below-threshold returns;
explicit source zeros are accepted. Code B/N uncollected FICA is included for
withholding reconciliation, but uncollected RRTA is excluded. Mixed B/N amounts
require allocation evidence. Each owner/employer must have one reconciled copy.

Forms 4137 and 8919 send identified per-owner line 6 results. The strict internal
interface also accepts finalized Schedule SE line 6 results; that source
calculator remains unfinished. SE losses cannot offset a spouse's
positive income. RRTA uses its own threshold and never reduces the SE threshold.
The source-level filing test remains true when a tax amount rounds to zero.

The repeated `ct2s` source reuses existing annual/quarterly validation with 2026
records and filer identity. All four quarterly records are reconciled before
compensation and paid Additional Medicare Tax reach Form 8959. Payment references
are required; partial payments, corrections and incomplete quarters remain held.

A static one-page Form 8959 PDF component uses the pinned 2026 template and its
revised line map, preserving draft markings and blank inapplicable parts. It
checks the two Schedule 2 destinations and the Form 8959 share of line 25c;
other withholding sources must remain separate at assembly. The whole return
bundle and current-version MeF serialization remain pending. The source contract
and remaining acceptance work are in
[FORM8959-GRAPH.md](../../../docs/ty2026/graphs/FORM8959-GRAPH.md).

## Schedule 2 draft attachment

The two-page Schedule 2 component maps all 68 fields in the pinned draft and
recalculates its subtotals from finalized source-owner amounts. It checks Part I
against Form 1040 line 17, the total against line 23, and employment/other tax
against the amount used by Schedule 3-A. The PDF API covers the printed contract;
its presence does not enable the remaining source calculators in the graph.

Form 4255 selections, SE exemptions and the Form 5329 exception checkbox remain
explicit print details. Other-tax/credit-recapture disclosures must reconcile
itemized descriptions and amounts to their line. Long disclosures produce
identified, paginated statements with a final total. Static output preserves
draft markings, removes widgets and retains both printed pages. Positive
section 965 installments remain held for the existing line 12/15 source conflict.

The combined payroll PDF test uses $184,000 of W-2 Social Security wages:
Form 4137 consumes the remaining $500 before Form 8919 runs. The resulting
$60/$145 payroll taxes, $558 Additional Medicare Tax and $30 uncollected W-2 FICA
produce $793 of Schedule 2 line 20 employment tax. A separate $100 additional
income tax produces $893 on line 21. This is a source/component reconciliation
case; it does not establish complete public return, bundle or MeF support.
The [Schedule 2/6251 PDF plan](../../../docs/ty2026/pdf/PDF-SCHEDULE2-6251-MAP.md)
records current component scope and remaining AMT/bundle work.

## Vehicle-loan source integration

The repeated `vehicle_loans` entry records purchase/debt evidence, borrower and
lender identities, loan accounts, vehicle qualifications, interest payments,
statements and refinancing history. General supplies return ownership. The
source node reconciles qualifying debt and the actual interest paid by each
borrower before sending per-loan amounts to Schedule 1-A. The schedule groups
loans by VIN, rounds printed rows, applies the shared upward-step phaseout and
routes line 36 through line 44 to deduction selection.

- Purchase financing is itemized. Down payments first reduce excluded negative
  equity/unrelated costs; interest on mixed debt is allocated proportionally.
  Refinancing retains only the outstanding qualified balance, and later lender
  acquisition is not treated as new borrower debt.
- A Form 1098-VLI box 1 already excludes nonqualifying debt interest. Gross
  payment records independently reproduce that allocation; the box is not
  multiplied by the ratio again. Lender payment records support amounts below
  the form's reporting threshold.
- Corrections retain their predecessors but replace only matching source
  periods. Duplicate loans, co-borrower copies, overlapping servicing periods,
  conflicting lender transfers and correction cycles are rejected. Payment
  ownership and supported third-party gifts control the return's share.
- Internal business-owner results must identify the loan, borrower and activity
  and reflect actual deductions after limitations. Only that amount is removed
  from Schedule 1-A; the public source cannot assert a final business deduction.
  The full business activity owners and choice between independent deductions
  remain to be integrated.
- Prior-year box 5 refunds require the unfinished tax-benefit recovery owner and
  are not subtracted from current box 1. Inherited debt, partial refinancing of
  mixed debt with a paydown, special collateral replacements/lien exceptions,
  and prepaid/accrual adjustments also remain unfinished. Current sources use
  cash accounting with an explicit timing review.

The plan's broader acceptance requirements are retained in
[FORM1098VLI-GRAPH.md](../../../docs/ty2026/graphs/FORM1098VLI-GRAPH.md).
Sources checked October 15: [TD 10054, §§1.163-16 and 1.6050AA-1](https://www.irs.gov/irb/2026-39_irb)
and [Form 1098-VLI instructions](https://www.irs.gov/pub/irs-pdf/i1098vli.pdf).

## Schedule A expense sources and deduction selection

The incremental `schedule_a` input accepts dated medical and tax payment records,
an income-versus-actual-sales-tax election, charity classifications and a source
inventory review. Filer identity, AGI, W-2 withholding and cash gifts come from
upstream owners. The receiver calculates a candidate before the overall limit;
the joint resolver decides itemizing versus standard plus nonitemizer charity,
applies the overall limit, and sends the selected amounts to Form 1040 and the
Form 6251 handoff. No duplicate charity or W-2 tax total is accepted publicly.

Ordinary medical payments exclude reimbursements, tax-free funding and nonmedical
charges before the shared 7.5% AGI floor. Tax records distinguish income payments,
value-based personal-property taxes, domestic real-estate taxes and actual sales
receipts. They exclude assessments, service charges and current-payment refunds.
Vehicle sales tax is capped at the general rate before subtracting a refund of
its deductible general-tax portion. Sales-tax tables, mixed business/property
allocations, ownership changes and special medical limits remain outside this
source contract. W-2 sources retain document, employee and employer identity;
repeated employer records require reconciliation before itemizing.

The 2026 policy supplies the $40,400 SALT cap and $505,000/$252,500 thresholds.
SALT MAGI requires either an explicit exclusion review or internally sourced
Puerto Rico, Form 2555 lines 45 and 50, and Form 4563 amounts. The Form 2555
exclusion must agree with AGI. Printed worksheet inputs and reduction are rounded
before the final MFS division. Under [IRC §164(b)(6)–(7)](https://uscode.house.gov/us/usc/119-118/t26/s164/),
the full limit is reduced before halving for MFS: MAGI of $262,500 produces an
$18,700 cap. The legacy 2025 node currently halves first; this branch preserves
that behavior during extraction, so its MFS regression is not evidence of the
correct 2026 policy. Correcting that legacy ordering remains separate work.

Current cash gifts reuse the shared percentage-limit calculator with the amended
2026 cash-only coordination rule in [IRC §170(b)(1)(B)](https://uscode.house.gov/us/usc/119-118/t26/s170/).
The 0.5% floor reduces the other-30 category before cash-60. Nonpublic-recipient
classification and DAF exclusive-control acknowledgment require source records.
Percentage excess and eligible floor carryover are retained as **candidates**;
no carryforward is persisted before deduction selection and the remaining
carryover/NOL rules. The cash-only policy rejects noncash gifts rather than
applying the old mixed-property ordering.

This is a bounded source implementation: the inventory review must establish no
other deductible taxes, investment interest, noncash gifts or prior
charitable carryovers, casualty/other deductions, or NOL carryback. Mortgage interest requires the separate source inventory described below. Those
remaining owners, Schedule A PDF/MeF and final instructions still need implementation. The internal
graph fixture derives a $53,250 itemized candidate from receipts and W-2 sources
at $150,001 AGI, selects it, removes the nonitemizer deduction and retains $38,750
of taxes for the AMT handoff. Its income-tax fixture is still supplied explicitly.

## Mortgage sources, points and insurance

The `mortgage_interest` source entry now supplies Schedule A lines 8a–8d from
one inventory of loans and qualified homes. It reuses the Table 1 loan-limit and
ratable-points arithmetic with 2025 while retaining separate evidence schemas.
The inventory joins borrower/property identity, payment records, lender
statements, twelve monthly balances, debt dates and acquisition use. One loan
limit covers all included homes; the same source cannot be entered twice.

Reported and unreported interest/points remain separate through their printed
lines. Current purchase points can be immediate or ratable, with limits for
customary charges and funds supplied at closing. Prior points require a retained
allocation ledger. Mortgage-insurance sources reconcile to box 5, apply current
or prepaid allocation, and then the restored 2026 income phaseout. The Schedule A
receiver verifies owners and its inventory review before deduction selection.

The source model currently covers continuing, wholly acquisition-use personal
mortgages. In-year refinance/payoff, mixed-use proceeds, lender transfers,
shared nonfiler expenses, credit-certificate reductions, prior-interest recoveries,
prior-year prepaid interest and the 2022–2025 prepaid-insurance transition still
need their source owners. PDF/MeF and persisted points remainders are also pending.
See the [mortgage source graph](../../../docs/ty2026/graphs/FORM1098-1098E-GRAPH.md)
for current authorities and boundaries. A passing mortgage calculation does not
establish complete 2026 Schedule A or filing support.

## Reuse and folder rules for subsequent work

Keep shared algorithms in the existing `nodes` domain folders and preserve
year-specific configuration and output assembly. Extract only the code needed by
both years; avoid wholesale domain moves while 2025 work continues. A shared
algorithm does not by itself verify a node's input rules or downstream routes.

For each next node, separately prove:

1. Source schema and eligibility for the selected year, including dates and
   taxpayer/spouse ownership.
2. All constants and rule branches, with no fallback to another year's config.
3. Input and output destinations in that year's registry; changed printed lines
   require explicit mappings even when the underlying amount is unchanged.
4. Regression behavior for the existing 2025 product and source-derived 2026
   boundary cases.

Next work is the remaining Schedule A, Schedule 1-A and QBI calculators
feeding deduction resolution, followed by income tax and credit calculations,
alongside the remaining general/dependent exception routes. Extend the strict
AGI bridge alongside its activity owners. Current
general and W-2 nodes contain year-specific evidence schemas and cross-form
routes, and the full income-tax node still invokes 2025 preferential-income/Tax
Table helpers. Do not register those entire nodes for 2026 just because their
arithmetic helpers are shared. Port individual differences from `b7c07b616` only
after reconciling current paths and the latest 2025 source-validation changes.

Complete PDF attachment coverage, current-version MeF schemas/rules, submission
archives and ATS acceptance remain separate release gates. No complete public
2026 product, MeF serializer or filing catalog entry is enabled. Missing tax
calculations must not be supplied as zeros to make a public return pass. See the
[current assessment](../../../docs/ty2026/readiness/CURRENT-BASELINE-2026-10-10.md)
and [product assembly plan](../../../docs/ty2026/readiness/PRODUCT-ASSEMBLY.md).

## Verification on October 15

- 98 typed tests passed across the 2026 baseline/configuration, existing 2025
  standard deduction, ordinary/preferential tax, Tax Table and CLI return
  suites.
- `deno task test:unit` passed: 137 tests in 14 selected modules, with a
  complete module-graph preflight. This is the repository's PR gate, not the
  full private PDF/schema/ATS evidence suite.
- The CLI's old $206,926.37 QBI taxable-income expectation also failed on
  untouched `origin/main` at `9a17a7282`; it now expects the filed whole-dollar
  $206,926. No QBI calculation was changed.

- A further 56 typed tests passed for the 2026 calculation/assembly/PDF modules
  and the existing 2025 input-router and template-cache suites.
- The repository unit/preflight gate passed again after the shared extractions.
- Rendered and visually inspected a synthetic three-page Form 1040/Schedule 3-A
  fixture. All pages retain draft markings, amounts reconcile across forms, and
  no editable widgets remain. This exercises rendering and assembly; its
  supplied credit amounts do not establish taxpayer eligibility.

- General/dependent work passed 138 tests in the combined 2026 and existing
  general/source regression run. Eight additional native XML tests initially
  lacked execution permission and local schema fixtures; after copying those
  fixtures into this worktree, all ten dated/death-residence tests passed.
- The final focused source suite passed 12 tests, including the added lifetime
  boundary case and the general-to-W-2-to-AGI integration.
- The 137-test unit gate and complete module-graph preflight passed again.
- Visually inspected synthetic newborn rows, the dependent continuation and the
  spouse-dependent checkbox in a five-page PDF QA fixture; it has no widgets or
  AcroForm tree. This checks source projection and rendering, not a filed return.

- Deduction/source work passed 127 typed tests across all current 2026 modules,
  the existing 2025 standard-deduction node and shared start-router regression.
  These include coupled and nonunique QBI/itemized examples, all filing-status
  overall-limit thresholds, source ownership/receipt checks, and the cash-gift
  → deduction → settlement graph. The 137-test unit/preflight gate also passed.

- Schedule 1-A integration passed 194 typed tests across all current 2026
  modules and the existing 2025 Schedule 1-A and AGI suites. Graph fixtures
  cover wages alone, W-2 overtime, and combined tips/overtime/senior deductions,
  including the distinct senior adjustment to the Form 6251 basis.
- The 137-test repository unit/preflight gate passed again.

- Vehicle-source and Schedule 1-A PDF work passed 139 typed tests across all
  current 2026 modules and the existing 2025 Schedule 1-A suite. They cover
  corrections, lender transfers, mixed debt/refinancing, co-borrowers, business
  coordination, exclusions, phaseout boundaries and source-to-return routing.
- The 137-test unit/preflight gate passed. A six-page synthetic Schedule 1-A
  fixture was rendered and visually inspected, including all three continuation
  types; output has zero widgets and no AcroForm tree.

- Form 4137 integration passed 175 typed tests across all 2026 modules and the
  shared 2025 Form 4137/Schedule 1-A suites. Cases cover spouse ownership,
  annual reporting deadlines, allocated-tip records, below-$20 months,
  Social Security wage-base exhaustion, qualification and deduction overlap.
- The 137-test unit/preflight gate passed. Thirteen additional 2025 replay/end-to-end
  checks passed, including native XML/XSD and Schedule 2 PDF export. One legacy
  income-export test could not finish because `pdftotext` is not installed;
  its XML/XSD and PDF-generation steps completed before that dependency failure.

- Form 8959/CT-2 integration passed 186 typed tests across all 2026 modules and
  the existing 2025 Form 8959/CT-2 suites. They cover the separated tax pools,
  status thresholds, source rounding, spouse SE losses, zero-tax withholding,
  W-2/RRTA distinctions, quarterly payment evidence and seven source graph cases.
- The 137-test unit/preflight gate passed. The new pinned one-page Form 8959 PDF
  was rendered and visually inspected with all parts populated; it has no widgets
  or AcroForm tree and retains visible draft markings.

- Form 8919 work passed 164 typed tests across all 2026 modules and the shared
  2025 Form 8919 suite. Cases cover classification evidence, payment-ledger
  reconciliation, joint ownership, missing payroll boxes, withheld tax and the
  combined Form 4137/8919 source graph. The 137-test unit/preflight gate passed.
- Rendered and visually inspected the three-page Form 8919 fixture: six primary
  firms plus a spouse, all A/C/G/H reason codes, IRS dates, unknown TIN, checkboxes
  and separate totals. Continuation totals are blank, draft markings remain,
  and all pages have no widgets or AcroForm tree.

- Form 4137/Schedule 2 PDF work passed 192 typed tests across all 2026 modules
  and the shared 2025 Forms 4137/8919 suites. The 137-test unit/preflight gate
  passed. The six focused component tests cover all Schedule 2 numeric fields
  and checkboxes, missing disclosures, destination mismatches, pagination and
  the combined payroll calculation above.
- Rendered and visually inspected all eight pages of two synthetic QA files:
  three Form 4137 pages (six employers plus spouse) and five Schedule 2 pages
  (two form pages plus 35 disclosure items across three statements). Text
  extraction confirmed every statement item appears once, the statement total
  is retained, continuation totals stay blank and the government-tip note prints.
  Both PDFs retain draft markings and have no editable widgets.

## Source recheck

The IRS drafts below were checked on October 15, 2026. The two rendered PDF
components matched the hashes already recorded in the research corpus.

- [Form 1040](https://www.irs.gov/pub/irs-dft/f1040--dft.pdf)
- [Schedule 1](https://www.irs.gov/pub/irs-dft/f1040s1--dft.pdf)
- [Schedule 2](https://www.irs.gov/pub/irs-dft/f1040s2--dft.pdf)
- [Schedule 3-A](https://www.irs.gov/pub/irs-dft/f1040s3a--dft.pdf)

- [2026 W-2/W-3 instructions](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf)
- [Notice 2025-67 retirement limits](https://www.irs.gov/pub/irs-drop/n-25-67.pdf)
- [2026 student-loan phaseouts, Rev. Proc. 2025-32 §4.29](https://www.irs.gov/irb/2025-45_IRB)

- Schedule A source integration passed 267 typed tests across all 2026 modules
  and the shared 2025 Schedule A/standard-deduction suites. Coverage includes
  medical reimbursements, payment ownership and duplicate checks, actual-sales
  elections, SALT phase-down/rounding and MFS ordering, sourced exclusion addbacks,
  cash-category coordination, floor attribution and the itemized graph handoff.
  The unit and preflight gates passed; this does not establish complete Schedule A
  categories, income-tax calculation or filing readiness.

- Mortgage integration passed 252 typed tests across all 2026 modules and the
  shared 2025 Form 1098/refinance-points suites. A final 23-test mortgage and
  return-assembly run also passed after tightening year, identity and payment
  evidence. The 137-test unit gate and preflight passed. Cases cover whole-return
  debt limits, old/new debt, MFS, purchase and ratable points, prepaid insurance,
  phaseout rounding, source mismatches and the selected Schedule A deduction.
