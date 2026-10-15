# Current 2026 dependent-care route

Implemented October 15, 2026 in `sourceRegistry2026`. This is a bounded source
calculation and static draft attachment, not complete Form 2441 filing parity.

## Sources and reuse

The pinned [2026 form](https://www.irs.gov/pub/irs-dft/f2441--dft.pdf) has SHA-256
`67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385`.
The [August 21 instructions](https://www.irs.gov/pub/irs-dft/i2441--dft.pdf) have
SHA-256 `7fdecfe193df435542bb452ba108bee011bef7032fda8abe972d6fbd5de233e7`.
Recheck final releases before filing.

The existing detailed 2025 calculator now accepts explicit annual rate and
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
- Reviews require ordinary W-2 earnings,
  no proprietor/partner benefits, no spouse death,
  no FTC/Form 8978 credit, eligible providers and no double use as medical or
  reimbursed expenses. Household employees require unfinished Schedule H work.

`form2441` computes Part III before AGI and sends line 26 to 1040 line 1e.
`f2441` recomputes retained benefit sources after AGI, reconciles final wage income
to the reviewed W-2 route, adds regular tax and Schedule 2 Part I for the Credit
Limit Worksheet, and sends line 11 to Schedule 3 line 2. Schedule 3 finalizes that
credit before Schedule 8812, whose Worksheet A deducts it from available tax.
Joint returns use separate spouses' wages. Taxable benefits are attributed to the
single recipient identified by W-2 and carryover plan records. Positive taxable
benefits from multiple recipients still need a per-spouse exclusion allocation;
that route remains gated. Joint carryover records must identify the plan owner.

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

`claim.earned_income` selects an explicitly reviewed annual-W-2 route or a
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
and unrelated-household lifetime exceptions, taxable-benefit allocation between multiple recipient spouses, self-employment, deferred/prepaid
expenses, changed filing-unit or corrected/unfiled prior-return care allocations,
proprietor/partner benefits, Schedule H, special provider TIN/address routes,
FTC/Form 8978 ordering, final forms, current MeF, product registration and ATS.
The [full acceptance contract](FORM2441-GRAPH.md) remains broader than this slice.
