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
benefit-limit rules and separate Part II earned income. Its default entry keeps
2025 behavior. The 2026 adapter supplies the complete two-stage 50%–20% rate
table and $7,500/$3,750 exclusion limits. The pure 2026 rules include the full
$7,500 limit for qualifying considered-unmarried MFS, but public MFS source
handling remains gated pending spouse-income and eligibility reconciliation.

## Connected source contract

Public `form2441.claim` accepts reviewed provider identities and paid amounts,
qualifying-child references, receipt amounts allocated to provider and child,
and employer plan records. It accepts no earned-income, AGI, tax-limit or credit
totals. Receipt amounts are whole dollars; W-2 cents are combined before rounding.

- General supplies filer identity, filing status and dependent source facts.
  Children must match claimed dependents with under-13 age and over-half-year
  residence facts; review confirms care occurred while under 13 and custody
  requirements are met. Birth/death residence exceptions remain gated.
- The W-2 node supplies original issued sources and box 10. Each positive box 10
  needs a source-specific review of benefits already reported in box 1. These
  remain in wage income and are removed from Form 2441 line 12 to avoid taxing
  them twice. Part III excludes line-12 benefits from earned income; Part II
  also includes newly taxable benefits from line 26.
- Employer plan maximum, grace-period use and forfeiture/carryforward are
  explicit records. Forfeiture cannot exceed the amount included on line 12.
- Each receipt references one known provider and child. Duplicate receipts and
  children are rejected, and qualified receipts cannot exceed provider payments.
  This slice requires care incurred and paid in 2026. Excluded benefits are
  allocated once across receipt-backed child expenses before the credit cap.
- Reviews require ordinary W-2 earnings, no deemed-income or combat-pay election,
  no prior-year paid expenses, no proprietor/partner benefits, no spouse death,
  no FTC/Form 8978 credit, eligible providers and no double use as medical or
  reimbursed expenses. Household employees require unfinished Schedule H work.

`form2441` computes Part III before AGI and sends line 26 to 1040 line 1e.
`f2441` recomputes retained benefit sources after AGI, reconciles final wage income
to the reviewed W-2 route, adds regular tax and Schedule 2 Part I for the Credit
Limit Worksheet, and sends line 11 to Schedule 3 line 2. Schedule 3 finalizes that
credit before Schedule 8812, whose Worksheet A deducts it from available tax.
Joint returns use separate spouses' wages; positive taxable joint benefits need
an unfinished per-spouse exclusion allocation and currently produce a diagnostic.

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

## Still required

Monthly student/disability income, disability qualifying people, custodial
exceptions, MFS, taxable-benefit allocation between spouses, self-employment,
combat-pay elections, deferred/prepaid expenses, prior-year Worksheet A,
proprietor/partner benefits, Schedule H, special provider TIN/address routes,
FTC/Form 8978 ordering, final forms, current MeF, product registration and ATS.
The [full acceptance contract](FORM2441-GRAPH.md) remains broader than this slice.
