# Current 2026 dependent-care route

Implemented October 15, 2026 in `sourceRegistry2026`. This is a bounded source
calculation and static draft attachment, not complete Form 2441 filing parity.

## Sources and reuse

The pinned [2026 form](https://www.irs.gov/pub/irs-dft/f2441--dft.pdf) has SHA-256
`67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385`.
The [August 21 instructions](https://www.irs.gov/pub/irs-dft/i2441--dft.pdf) have
SHA-256 `7fdecfe193df435542bb452ba108bee011bef7032fda8abe972d6fbd5de233e7`.
Recheck final releases before filing.

The existing detailed 2025 calculator now exposes shared amount-only operations
behind its unchanged provider-validation boundary. The 2026 source owner validates
its own provider variants and passes only calculation operands to that core.
The calculator accepts explicit annual rate and
benefit-limit rules, separate Part II earned income, and a 2026-only allowance
for no current qualifying people on prior-only claims. Its default entry keeps
2025 behavior. The 2026 adapter supplies the complete two-stage 50%–20% rate
table and $7,500/$3,750 exclusion limits. The pure 2026 rules include the full
$7,500 limit for qualifying considered-unmarried MFS, and the source route now derives MFS eligibility and spouse-income limits
from the reviews described below.

## Connected source contract

Public `form2441.claim` accepts reviewed provider identities and paid amounts,
qualifying-person references, dated receipts allocated to provider and person,
employer plan records, and the prior-return records described below. It accepts
no caller-calculated current earned-income, AGI, tax-limit or credit totals. Receipt amounts are whole dollars; W-2 cents are combined before rounding.

- General supplies filer identity, filing status, DOB, dependency answers and
  person records. `claim.qualifying_people` replaces the prototype child-only
  list with dependent-child, disabled-person, disabled-spouse and custodial-child
  variants. References resolve SSN, ITIN or ATIN; care eligibility does not
  create a Form 1040 dependent or a CTC/ODC entitlement.
- The W-2 node supplies original issued sources and box 10. Each positive box 10
  needs a source-specific review of benefits already reported in box 1. These
  remain in wage income and are removed from Form 2441 line 12 to avoid taxing
  them twice. Part III excludes line-12 benefits from earned income; Part II
  also includes newly taxable benefits from line 26.
- Employer plan maximum, grace-period use and forfeiture/carryforward are
  explicit records. Forfeiture cannot exceed the amount included on line 12.
- Each current receipt references a known provider and `person_tin`, with
  incurred start/end dates and payment date in 2026. Every service day must be
  within the person's eligible age/lifetime/incapacity periods. Duplicate receipts
  and people are rejected, and current plus prior receipts cannot exceed provider
  payments. Excluded benefits are allocated once before the credit cap.
- Reviews require either ordinary W-2 earnings or the matching supported business inventory,
  no proprietor/partner benefits, no spouse death,
  no FTC/Form 8978 credit, eligible providers and no double use as medical or
  reimbursed expenses. Household employees require unfinished Schedule H work.

`form2441` computes Part III before AGI and sends line 26 to 1040 line 1e.
`f2441` recomputes retained benefit sources after AGI, reconciles final wage income
to the reviewed W-2 route, adds regular tax and Schedule 2 Part I for the Credit
Limit Worksheet, and sends line 11 to Schedule 3 line 2. Schedule 3 finalizes that
credit before Schedule 8812, whose Worksheet A deducts it from available tax.
Joint returns use separate spouses' wages and business earnings. Taxable benefits are attributed to the
single recipient identified by W-2 and carryover plan records. Positive taxable
benefits from multiple recipients still need a per-spouse exclusion allocation;
that route remains gated. Joint carryover records must identify the plan owner.

## Provider identity and employer-furnished care

Provider records retain ordinary people/businesses and add reviewed tax-exempt,
foreign, incomplete-information and employer-furnished variants. Special records
carry stable provider/review references. Known individual TINs still cannot match
the filer, spouse or listed dependents; duplicate references, known TINs and
matching name/address records are rejected. The existing unrelated-provider and
work-purpose reviews remain required. Household employees still need Schedule H.

Foreign records retain an actual foreign address and either a U.S. TIN or a
review of the filer's citizen/resident status abroad and the provider's lack of
a U.S. TIN requirement. The latter prints `LAFCP`; reviewed tax-exempt providers
print `Tax-Exempt`. Missing-information records preserve every available field,
requests with dates and record references, and an explanation of the provider's
failure to supply information. The draft prints `See Attached Statement` in
missing fields and appends the explanation and request history. A complete
record cannot select the missing-information route.

Employer-furnished care resolves its name from one issued W-2 and reconciles the
reviewed care value to box 10. Receipt-backed care value may enter line 16, but
line 1e stays zero; the address says `See W-2`, the TIN stays blank, and the
household answer is No. This differs from third-party care paid on the filer's
behalf, which uses the actual provider and includes employer-paid amounts in
that provider's payments. Current receipt allocation checks the appropriate
payment/value capacity. Prior-year cash payments cannot borrow an employer
furnished value allowance. Repeated employer sources must be reconciled before
intake; multiple recipient-spouse taxable-benefit allocations remain gated.

A benefits-only claim can have no qualifying person and no provider. Its taxable
benefits still reach wages/AGI; line 1a prints `none` and unused credit sections
stay blank. Prior-only credit still prints 9a through 11 and Worksheet A.
Providers sort by actual payments for the first three printed columns, retaining
all additional providers, special labels and explanations in statements. These
identities also flow into the prior-expense Worksheet A statement.

The 15-page provider QA set covers all special variants, no-provider benefits,
a mixed five-provider return, a two-page due-diligence explanation and prior-only
credit. Every page was rendered and inspected; output has no AcroForm or
annotations. The TIN field's 11-character draft limit is removed only for the
required missing-information label, with the existing minimum font/width check.
The shared 2025 provider contract and default calculations remain unchanged.

## Qualifying people and custody

Ordinary dependency, relationship and support checks reuse the shared 2025
functions with 2026 annual rules. Care-specific exceptions do not alter default
CTC/ODC or education behavior. A care TIN is not subject to those credits'
issuance-deadline tests. Birth/death cases reuse dated lifetime residence;
ordinary children need service dates before their thirteenth birthday.

Disabled-person records include reviewed incapacity periods and outside-home-care
eligibility. Dependency exceptions for gross income, a joint return and a
claimable filer must agree with general source facts. Care incapacity is distinct
from permanent/total disability used for other qualifying-child age rules.
A disabled spouse resolves to the identified married spouse, requires over-half-year dated
home evidence, and reconciles incapacity months with the earned-income ledger.

The divorced/separated-parent care route requires reviewed parental support and
status, over-half-year combined custody, and a home calendar matching the filer's
overnight count. A noncustodial parent is rejected even if the child is claimed
on that parent's return. Equal nights require the other parent's AGI; the late
care node compares it with actual final AGI before the credit reaches settlement.
The care route can include a person released to the other parent's return
without inserting that person into Form 1040's dependent list. Separate HOH/EIC
release handling and special night-worker custody rules still need their owners.

The return retains eligible periods and monthly person counts as workpaper
evidence. The deemed-income floor still uses the number of people qualifying at
**any time during the year**, as the instructions require; the workpaper does not
prorate the $250/$500 floor for births or part-year qualification.

Claimable filers now receive actual taxable wage income from AGI for their
standard deduction, including taxable care benefits but excluding care deemed
income and combat-pay elections. Business/scholarship owners must extend that
bridge before their routes open. The source graph stops potential under-24,
nonjoint returns with unearned income over $2,700 for unfinished Form 8615
eligibility/calculation; it does not silently apply ordinary tax.

## Monthly income and combat-pay elections

`claim.earned_income` selects an explicitly reviewed `annual_w2`, `annual_business`, or a
12-month ledger for each filer. The monthly route requires every calendar month
exactly once, actual W-2 wages, nontaxable combat pay, student and incapacity
facts, and source references. The annual wages and combat amounts must reconcile
to the issued W-2s by owner. Monthly taxable-care allocations must reconcile to
the calculated annual amount and its recipient, so they cannot create income or
transfer taxable benefits to a different spouse.

Enrollment at a qualifying school must cover parts of at least five months;
nonconsecutive months count. Disability has no five-month minimum. For an
eligible month, actual income is compared with $250 ($500 for two or more
qualifying people). The monthly maxima are summed before annual rounding.
When both spouses qualify in the same month, a recorded choice assigns deemed
income to one spouse; the other retains actual earnings. An unrecorded or
contradictory overlap choice is rejected.

`claim.combat_pay_elections` separately records each spouse's elections for
benefits (Part III) and credit (Part II). Each election includes all that owner's
W-2 code Q pay. In the monthly route it enters actual income before applying the
floor. Part II also includes newly taxable care benefits; Part III excludes
those benefits. These workpapers never change AGI or Form 1040's EIC combat-pay
election. The return retains both workpapers for source replay.

Form 2441 checkbox B is derived from deemed income actually entered on an
applicable printed part. An unused benefits workpaper cannot check B on a
credit-only form. The three-page monthly QA set includes checked and unchecked
B examples and was rendered and inspected on October 15.

## Supported business earned income

The business owner supplies the complete retained Schedule C/SE inventory before
care benefits run. A care claim with business activity must identify that inventory
in `business_inventory_reference` and omit the contradictory W-2-only assertion.
The benefit calculator replays the business sources, checks actual filer identities,
and requires the same issued W-2 inventory. After AGI, the credit calculator also
checks that benefits and AGI used identical business sources.

Under the August 21 draft instructions for lines 4/5 and 18/19, each owner's
ordinary Schedule C net profit (including losses and amounts below the SE filing
threshold) is reduced by that owner's actual deductible half of SE tax. Statutory
activity contributes Schedule C line 1 gross income, not net profit; its W-2 box 1
is excluded from ordinary wages so it enters care income exactly once. Wages,
signed business income and elected combat pay combine before flooring annual
earned income at zero. A spouse's positive earnings never absorb the other spouse's
loss for the separate Form 2441 limits. The existing shared calculator continues
to determine exclusions, taxable benefits, credit amounts and tax limits.

Monthly business records separately allocate ordinary net profit, statutory gross
income and the deductible half of SE tax. All twelve months and an identified
review of the actual months earned and deduction allocation are required for each
business owner. Each component must reconcile to that owner's replayed annual
Schedule C/SE result. The calculator does not infer equal monthly earnings from
annual totals. These signed monthly amounts enter the existing student/disability
comparison before taxable benefits are added for Part II. Monthly allocations
are reviewed records, not automatically inferred from cash payment dates.

`business-care.test.ts` checks owner limits, ordinary losses, statutory gross
income, subthreshold profit, monthly student floors, taxable-benefit ordering and
source mismatches. Proprietor/partner benefit plans remain outside this route.
The complete-return PDF test covers ordinary profit, a loss-limited exclusion and
monthly student income. Eight synthetic Form 1040/2441 pages were reopened and
visually inspected on October 15; amounts and checkbox B reconcile, with no
remaining AcroForm or annotations. The focused typed tests, 548-test 2026/shared
care regression suite and repository unit checks passed.

## Married filing separately

`claim.mfs_review` selects non-MFS, considered-unmarried, or ordinary MFS.
Considered-unmarried records identify the qualifying person's main home, the
complete spouse residence calendar, and total and taxpayer-paid home costs.
The route checks over-half-year residence, no spouse presence from July through
December, and payment of more than half the costs. It reconciles any general MFS
residence answer. These returns use their own income on line 19 and the full
$7,500 limit without changing their Form 1040 filing status.

Ordinary MFS supplies evidence of a failed requirement and a reconciled inventory
of the separate spouse's issued W-2s, including an explicitly reviewed empty
inventory for zero wages. Identity and duplicate-employer checks protect that
inventory. Spouse wages and elected combat pay constrain the exclusion on line
19, with the $3,750 limit; they never enter this filer's wages, AGI or withholding.
Monthly student/disability ledgers reconcile to those external sources and may
supply deemed earnings. External spouse benefits, other earned-income sources
and community-property allocations remain gated.

Current credit is zero for ordinary MFS. An eligible 2025-expense credit can
still reach line 9b and Schedule 3: the draft checks A, enters zero on 9a and
completes 9b through 11 as instructed. Otherwise benefit-only MFS leaves Part II
and Part III's current-credit lines 27–31 blank. Checkbox B reflects deemed
income used in an applicable printed section. Considered-unmarried credit
requires actual over-half-calendar-year main-home evidence; special lifetime
exceptions for that status test still need review.

Regression cases cover the full and separate exclusion limits, spouse income
limits and zero earnings, monthly disability, independent combat elections,
prior-only credit, and contradictory home/source reviews. The eight-page MFS
QA set covers considered-unmarried, benefit-only, disabled-spouse and prior-only
returns; all pages were rendered and inspected and have no AcroForm or annotations.

## 2025 care paid in 2026

`claim.prior_year_expenses` explicitly selects no prior payments or provides
2025 Form 2441 lines 3–6, 24 and 25, Form 1040 line 11a, the prior qualifying-person
inventory, and dated receipts paid in 2026. Each source includes a review or record
reference. The prior taxpayer and any joint spouse must match the current filing
unit; changed joint filing units need allocation review and remain gated.

Worksheet A uses the shared **2025** 35%–20% rate, prior earned income and prior
benefit-adjusted expense limit. It validates the historical expense base before
calculating the additional credit, including the zero/negative stop. The late
node adds that amount to current credit on lines 9b/9c before the current tax limit
and Schedule 8812 ordering. A full current $7,500 exclusion does not erase an
otherwise eligible prior credit.

Current and prior receipts share duplicate and provider-payment checks. Prior
payments do not enter current expense rows or benefit exclusions. Prior-only
claims may have no current qualifying people; they receive no current expense
cap or monthly deemed income. The 2025 default calculator still requires at least
one qualifying person.

When line 9b is positive, the draft includes a paginated statement with Worksheet A
lines 1–13, provider addresses/TINs/household-employee answers, qualifying-person
names/TINs/disability answers, and dated payment associations. It follows official
forms in the bundle. Source identity, dates, duplicate receipts, historical line
reconciliation, exhausted limits, prior-only returns and current-benefit coexistence
have regression coverage. The eight-page prior-only, full-current-exclusion and
25-person continuation QA set was rendered and visually inspected on October 15;
static checks confirmed no AcroForm or annotations. Changed joint units and prior returns needing corrected
or unfiled expense calculations remain outside this reviewed prior-return route.

## Draft PDF and verification

The bundle attaches Form 2441 at sequence 21, with one credit-only page or both
printed pages when benefits apply, followed by continuation statements after all
forms. The three largest providers and credit-expense rows occupy the printed
form; all additional rows are preserved up to the 25-person/provider intake cap.
The source's missing benefits-answer widget is overlaid, and address items align
with printed labels. Line 8 prints percentage digits after the preprinted decimal.

The builder replays retained sources and reconciles AGI, tax, taxable benefits
and Schedule 3 credit before filling. Output has no AcroForm or annotations.
Credit-only, taxable-benefit and 25-row overflow examples were rendered and
visually inspected. Tests cover every rate boundary, old/new exclusion rules,
plan limits, carryover/forfeiture, benefits already in box 1, tax limitation,
spouses' separate earnings, two-child cap, CTC/ACTC ordering, rejection paths,
attachment order, continuation completeness and destination tampering.
The six-page disabled-person/spouse, custodial child, newborn and disabled-person
continuation QA set was rendered and inspected on October 15. Disability and
deemed-income checkboxes, zero-expense qualifying people and nondependent identity
rows were verified; no AcroForm or annotations remain.

## Still required

MFS special lifetime/status cases, community-property allocations, external-spouse
non-W-2 earnings or benefits, special custody/HOH/EIC release cases, nonresident/foreign dependency
and unrelated-household lifetime exceptions, taxable-benefit allocation between multiple recipient spouses, business sources outside the supported Schedule C/SE inventory, deferred/prepaid
expenses, changed filing-unit or corrected/unfiled prior-return care allocations,
proprietor/partner benefits, Schedule H, multi-W-2 employer-furnished aggregation,
FTC/Form 8978 ordering, final forms, current MeF, product registration and ATS.
The [full acceptance contract](FORM2441-GRAPH.md) remains broader than this slice.

## Adoption wages and owner/month reconciliation

The October 16 follow-up binds the final care calculation to the actual adoption
inventory, issued W-2s and employer-program owners. It derives each child's
current taxable benefit or signed special-needs adjustment from the replayed
Form 8839 exclusion, then requires owner amounts to reconcile Form 1040 line 1f.
The special-needs program is retained even when current payments are zero.
One spouse's negative adjustment cannot reduce the other spouse's care earnings;
offsetting owner adjustments remain separate even if joint line 1f is zero.
This follows taxable line 1z and the separate-owner rules in the pinned draft
instructions, not the gross-compensation definition used for under-24 support.

Annual methods include the signed adjustment before their zero floor. Monthly
reviews allocate the computed owner adjustment to twelve months and cite the
service-month evidence. The allocation must match the derived owner amount;
student/disability deemed-income floors apply to each month's resulting income.
The review cannot change wages, line 1f, or calculated income by entering an
unreconciled monthly total. Source-only claims cannot supply an internal adoption
income bridge. Missing inventories and mismatched wage/owner records fail.

Care claims identifying adoption sources now defer Part III to the coordinated
AGI stage. It derives the adoption exclusion and Social Security at each candidate
care-income amount, finds a consistent whole-dollar result, and replays the
complete source with monthly allocation checks before emitting income. The
executor finalizes the earlier care node's retained calculation. The late credit
and PDF stage must match that executed line 1e and the same adoption bridge;
changed care exclusions are supported. Retirement/business sources and original
W-2s retain their existing reconciliation requirements.

Three through six phaseout decimal places are tried in order, as permitted by the
2026 draft Form 8839's at-least-three-places instruction. The chosen precision is
retained and printed; six places capture the exact ratio for whole-dollar MAGI.
Cases still lacking a consistent whole-dollar result fail explicitly and need
further source-cent/printed-line reconciliation. For a child with several program
owners, wholly taxable benefits now follow the actual recipients, including
pending foreign adoptions and fully phased-out exclusions. Fully excluded
ordinary benefits retain each owner's payment and exclusion amounts. Source
cents are summed per owner before rounding, and child totals must reconcile.
Partial or special-needs exclusions across owners still require explicit
per-spouse reconciliation, including when the joint adjustment is zero.
See the [coordinated adoption contract](FORM8839-GRAPH.md) for
source authority, algorithm and remaining gates.

Verification for this increment covers 123 distinct typed source/PDF tests and
the 137-test repository unit gate, with 3,905 modules in preflight and unchanged
runtime files. Cases exercise fully excluded, taxable pending-foreign and signed
special-needs income, separate owners, offsetting joint adjustments, monthly
student floors, source mismatches, and the then-required rejection of changed pre-AGI
exclusions and unresolved mixed-owner child allocations. The combined joint draft
was rendered and its Form 2441 owner limits were visually inspected.

The subsequent mixed-owner increment passed 189 typed source/PDF tests and the
137-test unit gate, with 3,907 graph modules and unchanged runtime files. New
cases cover pending foreign benefits, complete and partial phaseouts, ordinary
full exclusions, owner payment cents, source ordering and a special-needs zero
joint adjustment that still needs allocation review. The combined draft prints
$304,000 and $26,000 as separate care earnings, $330,000 adoption MAGI and
$10,000 taxable adoption benefits; both forms were rendered and inspected.
