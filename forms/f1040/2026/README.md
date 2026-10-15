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
  line 12/15 instructions conflict. These sinks are not yet source-wired.
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
The new Schedule 1-A source contract is `w2_2026_sources`; its receiving 2026
calculator, occupation allocation and eligibility/phaseout checks remain to
build.

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
8995/8995-A. Final Schedule A source limits, Schedule 1-A source calculations,
QBI forms/attachments, dependent earned-income classification, and foreign-tax
allocation still need their receiving 2026 owners. The existing finalization API
continues to accept upstream finalized amounts only.

`cash_gifts` is a repeated source entry with donor/donee identity, current-year
payment and classification records, benefits received, QCD status and
contemporaneous acknowledgment facts. It excludes QCDs, donor-advised funds,
supporting organizations and other ineligible recipients from the nonitemizer
amount. Credits/reimbursements await a separate reduction review. The same
identified gift records are retained for the future Schedule A category/floor
calculator; they are not asserted as a net itemized deduction.

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

Next work is the source-backed Schedule A, Schedule 1-A and QBI calculators
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
