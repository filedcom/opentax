# TY2025 Form 8853 coverage boundary

Sources:
[IRS 2025 Form 8853](https://www.irs.gov/pub/irs-prior/f8853--2025.pdf),
[2025 Instructions for Form 8853](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf),
and the checked-in TY2025 v5.4 `Common/IRS8853/IRS8853.xsd`.

## Bounded PDF correction

The 2025 PDF descriptor previously placed several Archer MSA, Medicare Advantage
MSA, and LTC source amounts on unrelated form lines, including the name/SSN
header. Its source-field positions now match the 2025 AcroForm: Archer lines 6a,
6b, and 7; Medicare lines 10 and 11; and LTC lines 17, 18, 19, 22, and 24. Raw
`ltc_period_days` was removed from the PDF map because printed line 21 is **$420
times the days**, not a day count. The bounded taxpayer-owned, fully qualified
Archer route now validates against the native source guard before printing,
fills the holder name/SSN and calculated lines 6a/6b/6c/7/8 (including zero
on 6b/8), and retains only the applicable first page. The one-page filled PDF
was rendered and visually inspected on 2026-10-05; its PDF and image are in
`.state/research/ty2025-filled-pdf-review/2026-10-05-form8853-bounded/`.
The focused native/PDF cases passed 25/25. Other Section A/B/C paths remain
guarded.

## Bounded taxable Archer extension (2026-10-06)

The TY2025 public input list now accepts `form8853` and routes its source record
through the existing calculator. Filing additionally supports a single
taxpayer-owned normal Form 1099-SA distribution (box 3 code 1 explicitly
confirmed) with partial or no medical use. Gross distributions and unreimbursed
qualified expenses must be explicit whole-dollar amounts, with expenses no
greater than the distribution, zero rollover, no additional-tax exception, and
no contribution, Medicare Advantage MSA, or LTC activity. Joint and spouse-owned
routes remain rejected. The earlier fully qualified route remains supported.

Form 8853 line 8 is reconciled against Schedule 1 line 8e and line 9b against
Schedule 2 line 17e, including rejection of absent or mismatched positive totals.
The native group emits `ArcherMSAAddnlDistriTaxAmt` after the taxable distribution
in XSD order. The PDF now fills calculated line 9b at `Page1.f1_13` and leaves the
line 9a exception checkbox unchecked.

The synthetic acceptance fixture uses $3,000 gross, $2,000 unreimbursed qualified
expenses, $1,000 taxable income, and $200 additional tax. It verifies retained
owner/source confirmations, both schedules, Form 1040 income/AGI and tax,
complete native return validation against local TY2025 v5.4 `Return1040.xsd`,
and filled PDF extraction. On 2026-10-06, 59 focused node/native/PDF/start/e2e
checks passed. The generated seven-page return was rendered with real Poppler;
Form 1040, both schedules' populated pages, and Form 8853 were visually inspected.
Ignored evidence is in the isolated worktree at
`.state/research/2026-10-06-form8853-partial/` (`return.xml`, `return.pdf`, PNGs,
`pending.json`, and `test.log`). These are synthetic local integration evidence,
not authentic taxpayer source documents or IRS acceptance/ATS/business-rule
certification. General Form 8853 support remains open.

## Sourced Archer distribution exceptions (2026-10-06)

The public `form8853.archer_distribution_ledger` source now retains each normal
Archer distribution's date, gross amount, allocated unreimbursed qualified
expenses, Form 1099-SA code/source, distribution-date source, medical sources,
and the holder's SSN and date of birth. Disability requires an onset date and
source plus confirmation of the IRS substantial-gainful-activity and duration
criteria. This accepts multiple distributions for the same taxpayer, including
partially excepted taxable distributions. Source amounts are retained rather
than replaced by a single inferred exception amount. Supplied legacy totals or
exception indicators must agree with the ledger.

Under the 2025 instructions, the age/disability exception applies **after** the
event date. A distribution on the event date remains subject to additional tax.
Line 9a checks only when some taxable amount qualifies; line 9b is 20% of the
remaining taxable amount. A bare `archer_msa_exception: true` now requires the
sourced ledger and cannot waive every distribution's tax. Normal birth dates
establish the 65th birthday; a leap-day birth with no calendar 65th birthday
requires a sourced age-attainment date. Holder SSN and retained return birth
facts reconcile before filing. Native line 9a is emitted in XSD order, and the
PDF fills the real line 9a checkbox alongside calculated line 9b.

Death has a separate FMV-transfer source, not an ordinary distribution code.
It records deceased holder identity, date/death evidence, beneficiary identity
and designation, date-of-death valuation, and exclusion of postdeath earnings.
For a nonspouse individual beneficiary, the ledger deducts only unreimbursed
qualified expenses incurred before death and paid within one year. The native
form uses the beneficiary SSN, `MSAHolderDeathInd`, and the additional-tax
exception; the PDF prints the required "Death of Archer MSA account holder"
annotation above its title. Estate-beneficiary FMV is calculated on the
matching deceased final return with no medical offset. That estate case has
node/native Form 8853 and PDF projection evidence, **but full native/PDF return
export remains blocked** by the existing deceased-Form-1040 signer,
representative, and refund source guard. This extension does not bypass it.

Four synthetic full return cases pass local TY2025 v5.4 `Return1040.xsd` and
filled PDF extraction: mixed age65, mixed disability, fully excepted age65, and
nonspouse death transfer. Each mixed case has $6,000 gross, $1,500 qualified
medical use, $4,500 taxable income, $1,500 excepted taxable income, and $600
additional tax. The death-beneficiary case has $6,000 FMV, $2,000 medical offset,
$4,000 income, and zero additional tax. The complete focused batch passes
66 checks, including the original partial-use route and public start routing.
All four filled Form 8853 pages were rendered using real Poppler and visually
inspected; the death annotation was positioned in the top margin to avoid
colliding with the IRS title. Ignored XML/PDF/PNG/pending/test evidence is in
`.state/research/2026-10-06-form8853-exceptions/` in the isolated worktree.
This is synthetic local evidence; no authentic-source or IRS acceptance,
business-rule, or ATS claim is made.

Joint/spouse aggregation, surviving-spouse inherited account handling,
multiple inherited/owned account statements, predeath normal distributions
combined with estate FMV transfer, rollovers/excess withdrawals and contributions
remain gaps. The sourced sole-holder Medicare distribution route below is now covered; the October 10 checkpoint below separately covers one sourced LTC Section C. The ledger requires
reviewed absence of those other activities for its retained filing route.

## Raw cents review and reporting identity (2026-10-06)

The numeric XML writer already rounds to whole dollars; it did not emit raw
fractional `USAmountType` values. Review did find a form-arithmetic mismatch:
$2,000.40 gross and $500.60 medical use could print $2,000 and $501 while independently
rounding taxable income to $1,500. The ledger now sums raw source amounts before
rounding entered lines 6a and 7, subtracts those filed values for line 8, and
computes a whole-dollar line 9b from the remaining taxable distribution amount.
Schedule 1 line 8e, Schedule 2 line 17e, Form 1040 and the native/PDF Form 8853
consume those filed values. Raw ledger amounts and aggregate source values retain
cents; the PDF instance projects computed filed amounts. This follows the
[2025 Form 1040 rounding instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf):
add amounts with cents and round the total entered on each line.

Two new positive cents fixtures pass complete local v5.4 return XSD and filled
PDF checks. The ordinary distribution packet files gross $2,000, medical $501,
taxable income $1,499 and tax $300 from raw $2,000.40/$500.60. The mixed age65
packet files gross $6,000, medical $1,501, taxable income $4,499 and tax $600
from raw $6,000.40/$1,500.60. The focused batch passes 68 checks, preserving
raw source, native whole-dollar types, all populated PDF lines and schedule
joins. Both Form 8853 pages were rendered with real Poppler and visually
inspected. Ignored evidence is under
`.state/research/2026-10-06-form8853-cents/` in the isolated worktree.

For death transfers, the 2025 Form 8853 instructions' "Death of Account Holder"
section on page 2 explicitly places the nonspouse beneficiary's name and SSN
in the top form spaces. Therefore the native `MSAHolderSSN` reporting field uses
the beneficiary SSN with `MSAHolderDeathInd`; the deceased holder's identity
remains in the raw source. The death fixture now explicitly verifies reporting
SSN `111223333` and rejects deceased SSN `222334444` as that native reporting
identity. An estate beneficiary's transfer remains assigned to the deceased
holder's final return, subject to the existing final-return export blocker.

## Sourced Medicare Advantage MSA distributions (2026-10-06)

The public `form8853.medicare_distribution_ledger` retains owner, holder identity,
account/distribution references and dates, raw gross cents, holder medical
allocations and bills, enrollment/HDHP review, disability evidence, and complete
account/distribution review confirmations. The native route binds the declared
sole taxpayer or sole spouse holder to the return SSN; a spouse requires MFJ.
It rejects conflicting legacy amounts/indicators and other Form 8853 activity.

The [2025 IRS instructions](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf),
Section B, provide holder-only medical expenses and disability/death exceptions
**on or after** the event date, without an age-65 exception. Worksheet line 1
excludes excepted taxable distributions. Without a 2024 account, tax is 50% of
line 1. Otherwise subtract 60% of the January 1, 2025 annual deductible from the
December 31, 2024 balance (floor zero), subtract that amount from line 1 (floor
zero), and apply 50%. Nonspouse death transfers use death-date FMV, eligible
predeath expenses paid within one year, beneficiary reporting identity and a
required death annotation.

The calculator implements those lines, requires the applicable 2024 balance and
2025 policy source, and retains the computed worksheet. It sums raw cents before
rounding filed line totals; line 12 subtracts filed lines 10 and 11 and feeds
Schedule 1 line 8e. The worksheet tax feeds Schedule 2 line 17f and Form 1040
line 23. Native Section B emits required holder SSN, computed lines 10–13b,
exception/death indicators in full-schema order. PDF Section B fills those same
lines, checkbox and the sole holder's SSN; zero taxable/tax amounts still print.

Eight synthetic source-to-calculation-to-full-return packets pass local TY2025
v5.4 `Return1040.xsd` and real filled PDF extraction:

| Case | Line 12 income | Line 13b tax |
| --- | ---: | ---: |
| No account at end 2024 | 4,000 | 2,000 |
| Balance 10,000; deductible 8,000 | 8,000 | 1,400 |
| Partial disability, including event-date exception; balance 10,000, deductible 12,000 | 9,000 | 100 |
| Raw gross 2,000.40 / medical 500.60; filed 2,000 minus 501 | 1,499 | 750 |
| Sole spouse holder on MFJ, prior-year worksheet | 8,000 | 1,400 |
| Fully qualified expenses | 0 | 0 |
| Fully excepted disability, no prior-year worksheet required | 4,000 | 0 |
| Nonspouse death transfer, FMV 6,000 / medical 2,000 | 4,000 | 0 |

The focused node/native/PDF/start/Archer/Medicare batch passed 78 tests; the
subsequent estate-blocker check passed separately (1 test). All eight Form 8853
pages plus the partial-exception Form 1040 and populated Schedule 1/2 pages
were visually inspected with real Poppler. Ignored full XML, PDFs, retained
pending source, worksheet results, rendered pages and test logs are at
`.state/research/2026-10-06-form8853-medicare/` in the isolated worktree. These
are synthetic local integration evidence, not authentic taxpayer source
records or IRS acceptance, ATS, or business-rule certification.

Expense-reference review repair: sourced Archer and Medicare normal ledgers
require distinct medical expense references within and across distribution rows;
the shared death-transfer source also requires distinct expense references.
Reuse is rejected until a bounded split-allocation model exists. Export negatives
exercise both complete native XML building and actual PDF building for duplicate
references within a row and across rows in each ledger. Positive packets above
are unchanged. The final focused rerun passed 81 tests with zero failures,
including the estate blocker and both duplicate-reference export negatives;
`expense-review-test.log` records this rerun.

The both-holder normal Medicare distribution route below resolves the joint
statement/control case. Limits remain: multiple inherited MSAs or inherited plus owned MSA; surviving-spouse Medicare
inheritance (which becomes Archer); combined Archer/Medicare/LTC activity;
deemed distributions and erroneous contribution/earnings reporting. Estate FMV
source calculation/native projection is available, but full deceased-return
filing remains subject to the existing representative/signing/refund blocker.
No estate full-return acceptance is claimed. General Form 8853 stays open.

## Both-holder Medicare distributions on MFJ (2026-10-06)

Public `form8853.medicare_joint_distribution_ledgers` now holds exactly one
normal-distribution ledger for the taxpayer and one for the spouse. Each retains
its own identity, Medicare/HDHP evidence, account/distribution references, raw
cents, medical sources, disability facts and applicable prior-year account
review/balance/deductible. The sole-holder confirmation belongs only to the
existing sole-holder field; joint holder records do not assert it. Review
confirmations apply to each holder's complete source activity. Other Archer/LTC
activity and combining sole/joint source modes are rejected.

The [2025 IRS Section B instructions](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf)
require separate taxpayer/spouse statement Forms 8853 and a controlling form
that sums filed lines 10, 11, 12 and 13b, checking 13a if either statement does.
The local v5.4 XSD permits one `IRS8853` and one Section A/B group; the dedicated
`PrimaryTaxpayerMedicareMSAStmt` and `SpouseTaxpayerMedicareMSAStmt` roots carry
the owner computations. Their schemas identify ownership through the root and
return header, without an additional SSN field.

The native builder binds both source holder SSNs to MFJ return identities,
computes each worksheet separately, emits the controlling group with primary
SSN, and registers the two actual statement roots in ReturnData schema order.
It sums each owner's filed whole-dollar lines, retaining raw cents in source.
Schedule 1 line 8e and Schedule 2 line 17f must agree with the combined income
and tax, and their native totals reconcile to Form 1040 lines 8/23 before both
exports. The PDF produces controlling, taxpayer statement, then spouse
statement. Each copy has the correct name/SSN; statements print the required
annotation and owner lines/checkbox. The control shows both return names and
primary SSN. No Section A or Section C activity is inferred.

Cross-holder review rejects reused distribution or medical-expense references,
an account source assigned to both holders, duplicate owners/SSNs, incomplete
applicable worksheet facts, wrong owner identity, conflicting legacy totals,
and tampered Schedule 1/2 or Form 1040 totals. Existing Archer and sole-holder
Medicare proofs are retained. Split medical allocations remain unmodeled.

Four synthetic complete return packets pass local v5.4 XSD and actual PDF
extraction with the control and both owner statements:

| Joint case | Combined line 12 | Combined line 13b |
| --- | ---: | ---: |
| Taxpayer prior balance/deductible; spouse no prior account and raw cents | 9,499 | 2,150 |
| Taxpayer partial disability and own worksheet; spouse no prior account | 13,000 | 2,100 |
| Both holders' raw cents, separately rounded filed lines | 1,798 | 900 |
| Both holders fully qualified | 0 | 0 |

The final focused node/native/PDF/start/Archer/sole-holder/joint batch passed
86 tests with zero failures. All twelve Form 8853 copies were rendered with
real Poppler and visually inspected, along with the partial-exception Form
1040 and populated Schedule 1/2 pages.

The both-cents case retains each owner's raw gross 1,000.49 / medical 100.51
but files each statement as 1,000 / 101 / 899 / 450. The controlling form sums
those filed lines to 2,000 / 202 / 1,798 / 900; it does not reround combined raw
source or recompute a joint worksheet. Ignored full XML/PDF/pending/worksheet,
rendered pages and logs are at `.state/research/2026-10-06-form8853-joint/`
in the isolated worktree. These are synthetic local integration artifacts,
not authentic taxpayer records, IRS acceptance, business-rule or ATS evidence.

Broader branches remain open: joint Archer contributions, inherited Medicare
and multiple inherited/owned-account statements, surviving-spouse Medicare
inheritance, combined Archer/Medicare/LTC, deemed distributions, and erroneous
contribution reporting. The existing sole-holder nonspouse death route remains
supported; the joint source mode covers normal holder distributions and
applicable disability exceptions. Full deceased-return filing retains its
existing signer/representative/refund source blocker.

## End-to-end blockers

### Bounded native Archer MSA path now written

The original narrow source-to-filing route is implemented: a single
taxpayer-owned Archer MSA distribution whose whole-dollar gross amount is
confirmed from Form 1099-SA and is fully matched by unreimbursed qualified
medical expenses. The source must explicitly confirm no rollover, no tax
exception, and no other Form 8853 activity. The node retains a Form 8853
pending record even when lines 8 and 9b are zero. The MeF descriptor emits
the native `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN` and
calculated lines 6a, 6b, 6c, 7, and 8 in XSD order. It rejects spouse/joint
ambiguity and Schedule 1/2 conflicts. It does not emit flat legacy tags.

This does not establish general Form 8853 support. The bounded partial-use route
above has full local return XSD and PDF evidence. Later Medicare, contribution
and LTC checkpoints below narrow the original gaps; wider combinations,
business-rule and ATS evidence remain open.

- Archer paths beyond the sourced taxpayer ledger and death transfer, Medicare paths beyond the sourced holder ledgers, and
  contribution paths beyond the sourced small-employer single-holder route below still lack a
  complete node print record and source model. The v5.4 XSD nests Section
  A/B in `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN`, and
  Section C in `SectCLTCInsuranceCntrctGrp` with required policyholder/insured
  identity and line 15/16 answers. The October 10 LTC ledger below supplies those fields;
  raw `ltc_period_days` is not the XSD's computed
  `LTCDaysMultiplyByPerDiemAmt`. Native cases now pass full local XSD as recorded below.
- The Archer exception ledger above resolves per-distribution age/disability
  tax for its sourced taxpayer route and the single nonspouse death transfer.
  The Medicare ledger below resolves its distribution-level exceptions and
  prior-year balance/HDHP deductible worksheet. A bare Medicare exception
  boolean now requires that ledger. General Medicare support remains open.
- The October 10 Section C ledger supplies identities, illness evidence,
  other-payee answers, a reviewed period method and a multiple-payee statement.
  Additional Section C copies and multiple periods remain guarded; the older
  undifferentiated days/expenses/reimbursements tuple is insufficient for filing.
- The sourced employee Archer contribution route below now calculates the monthly
  HDHP worksheet and actual current-service compensation. Missing compensation
  no longer defaults to infinity for a positive legacy deduction. Self-employed
  compensation, two-holder Part I statements, prior excess, timely excess
  withdrawals and coordinated Archer/HSA funding remain open.
- Joint Archer contributions and multiple Section C copies still require their
  own repeatable source/attachment structures. The sourced both-holder Medicare
  normal-distribution route below now represents its two owner statements and
  controlling form within the pending `form8853` record.

## Acceptance cases before enabling a filing claim

1. Model each MSA account holder and each LTC insured/policyholder/period
   explicitly. Require source facts for every elected path and reject incomplete
   mixed-exception, multiple-payee, or Medicare special-worksheet cases instead
   of treating them as zero tax.
2. Compute the printed lines and retain a native Form 8853 output even when tax
   is zero but the form is required. Verify the Schedule 1/2 totals against
   those same computed lines and cover positive/zero/partially excepted
   distributions.
3. Emit both XSD groups in sequence with required identities and indicators,
   then validate against the checked-in v5.4 schema. Fill both PDF pages,
   including calculated lines and checkboxes, and visually inspect the result.

No compatibility layer or provisional fallback is proposed. The PDF change is
bounded; the rest remains an explicit gap until its source model, calculation,
native XML, and validation gates are complete.


## October 6, 2026: sourced Archer contribution and current-excess route

Primary sources: [TY2025 Form 8853 instructions](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf),
[TY2025 Form 5329 instructions](https://www.irs.gov/pub/irs-prior/i5329--2025.pdf),
[TY2025 Form 8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf), and
[Form 8889](https://www.irs.gov/pub/irs-prior/f8889--2025.pdf).

`archer_contribution_ledger` supports one taxpayer or one joint-return spouse
using an eligible small employer's HDHP and actual current-service W-2 payroll
compensation. Its post-2007 participation source is either documented active
participation before 2008 or coverage under an Archer-participating employer.
The workforce record identifies one of 2023/2024 with average employees at most
50; each of twelve distinct month records identifies all holder/spouse HDHPs on
the first day and the household other-coverage review. The policy deductible
and out-of-pocket limits are validated against the 2025 self/family thresholds.
Family coverage takes precedence over self-only coverage and uses the lower
family deductible when multiple family policies are present. The worksheet
sums 65% of self-only or 75% of family annual deductibles across eligible months
and divides by twelve. MFS family coverage uses the ordinary 37.5% share;
a different agreed MFS allocation is outside this route.

Medicare months contribute zero to the worksheet, including the enrollment
month. A dated enrollment source also prevents a deduction for cash deposited
after enrollment. Another person's dependent is ineligible for the year. The
source retains direct personal cash deposit/payment references, holder payer
identity, designation for 2025 and actual dates through April 15, 2026; it
excludes employer deposits, rollovers and transfers. Duplicate deposit/payment
sources reject. Other Form 8853 activity and prior excess/withdrawals are
reviewed absent for this contribution route.

The actual W-2 code R entries retain employee SSN, employer EIN, issued source
reference and raw amount. Filing binds those entries and compensation to the
retained issued W-2, the declared holder and the employer maintaining the HDHP.
The payroll review establishes current-service wages, excluding pension,
annuity and deferred compensation. In this bounded route, W-2 box 1 consists
of those wages plus any identified employer MSA excess already included in
box 1. An employer/custodian review excludes employer funding for 2025 made in 2026;
this route binds the sole actual issued 2025 W-2 from the holder’s HDHP employer
on the return. Additional same-employer payroll records require a complete
multiple-source compensation model and reject in this bounded route. It is not a general reconstruction
of gross compensation from cafeteria
plans, retirement deferrals or other pay adjustments.

Any employer contribution prevents the personal deduction; filed lines 3/4
are omitted as instructed while the underlying limit remains in the source
worksheet to calculate employer excess. Employer excess over the smaller
HDHP/pay limit is Schedule 1 line 8z income unless identified as already
included in W-2 box 1. Personal contributions less the deduction, plus employer
excess, flow to source-owned Form 5329 Part VI lines 34–41. Prior excess and
Archer distributions are zero for this route. Its actual sourced December 31
all-account value plus the actual personal contributions for 2025 deposited
in 2026 caps the 6% tax, as the printed Form 5329 requires. A positive excess with
zero year-end value still prints the required Form 5329 and zero line 41.

Raw deposit, payroll, code R and value cents are retained. The filed line 1/2
amounts round the respective sums, line 3 rounds the final annual worksheet,
and line 4 rounds actual compensation. Line 5 and excess consequences use
those same filed amounts; the filed 6% tax rounds to whole dollars. Native
Form 8853 and PDF Part I share that projection and print required zero lines.
Form 5329 retains its owner and full source workpaper. With prior excess zero,
line 34 directs the filer to skip to line 39; native/PDF leave lines 35–38 blank
and print lines 34/39/40/41, including when its tax is zero. Schedule 1/2 joins and the Form 1040
additional-income/adjustment/other-tax totals are reconciled at actual export.

The no-HSA-funding review is checked against actual W-2 code W and retained
HSA contribution fields. This is a bounded coordination gate, not a claim that
having both accounts is illegal: Form 8889 reduces the HSA contribution limit
by Archer MSA contributions. Simultaneous funding needs its complete
coordinated worksheet and remains open.

Evidence: `forms/f1040/e2e/adjustments/health/form8853/form8853_contributions_2025.test.ts` uses synthetic
source records, not authenticated taxpayer documents. Full local TY2025 v5.4
Return1040 XSD and actual filled packets cover personal cents, changing
self/family coverage, pre-2008 participation, MFS family default share, pay cap,
employer funding, taxable employer excess,
mutual funding exclusion, employer excess already in wages, Medicare timing,
spouse ownership, zero-value excess, a following-year cash deposit, dependent ineligibility and partial other
coverage. Actual XML/PDF export negatives cover missing/wrong owner, invalid
HDHP/month/enrollment/payment sources, compensation/code R/HSA conflicts and
Schedule 1/Form 5329/Form 1040 tampering. Known W-2 code R activity is checked
at the native/PDF Form 1040 entry points so removing a required contribution
form cannot silently omit its reporting, including a zero-income/zero-tax
employer funding return. A malformed public schema source rejects the whole
input before an identified filer/return source is created. Ignored source/worksheet/XML/PDF/PNG
and focused logs are under `.state/research/2026-10-06-form8853-contributions/`.
These are local schema and rendering checks, not IRS business-rule or ATS
acceptance. Broad Archer/MSA support remains open.

### Complete Archer contribution packet visual review

All 15 retained positive packets for the sourced Archer contribution slice were
rendered using real Poppler and inspected page by page, including all Form1040,
Schedule1/2, supporting statement, Form5329 and Form8853 pages: 110 pages total.
Individual page renders and review sheets are retained in the ignored
`.state/research/2026-10-06-form8853-contributions/all-page-review/` proof folder.
Counts by packet: personal cents5, grandfather5, MFS family9, zero account value7,
following-year deposit9, dependent7, partial other coverage9, monthly family9,
compensation cap9, employer3, employer excess10, employer+personal7, excess
already in wages7, Medicare cutoff9, spouse personal5. No visual fixes or
regression reruns were required. Source/test limitations above remain unchanged.


## October 10 sourced LTC Section C and multiple-payee statement

The public `form8853.ltc_ledger` now retains each insured, current-return
policyholder, payer/contract and complete annual Form 1099-LTC amounts, reviewed
qualification, a single complete benefit period, illness certifications and care
plan, qualified costs, reimbursements and other payees. Source cents remain
available; amounts for a filed line are summed before rounding. The calculation
uses actual inclusive dates and the 2025 $420 daily limit, or higher qualified
costs, less applicable reimbursements. The reviewed pre-August 1996 unmodified
contract exception excludes the corresponding reimbursement from line 24.
These rules follow the [2025 Form 8853 instructions, Section C](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf).

Other-payee calculations first allocate the exclusion to the insured and an
identified joint-filing spouse, then allocate the remainder proportionally to
other policyholders. A limited insured/spouse priority amount needs reviewed
shares that reconcile to the combined exclusion. Each current-return recipient
must appear in the owner inventory; a spouse owner requires a joint return.
Terminal-only accelerated benefits skip lines 17–25 and retain zero on line 26,
including when other policyholders received qualified LTC payments. Chronic and
terminal redesignation within a period is rejected until split-period support.

Native export emits one identified `SectCLTCInsuranceCntrctGrp`, correct Boolean
answers, calculated lines and the Schedule 1/Form 1040 income joins. A required
`MultiplePayeesStatement` is registered in schema order and linked at line 15;
it carries aggregate lines 18–26. Each policyholder form leaves lines 21–24 blank
and reports its own limitation and taxable income. The PDF prints the actual
Section C page and adds aggregate and recipient allocation rows, repeating the
reporting/insured identities and period on continuation pages. Individual
whole-dollar allocations can differ in sum from aggregate amounts; the printed
statement identifies this rounding distinction. Both exporters require the
unchanged source retained by Schedule 1 even when income is zero.

Fifteen synthetic complete returns pass the local v5.4 `Return1040.xsd`. An
independent Python Decimal/date review recomputes periods, limits, allocation,
AGI, taxable income and final tax using the [2025 Form 1040 Tax Computation
Worksheet](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf). They cover the IRS
annual zero-income example, daily contract and equal-rate periods, actual-cost
limits, chronic accelerated benefits, terminal-only benefits with/without other
payees, taxpayer/spouse owners, insured and joint-spouse priority, multiple
contracts with cents, old-contract reimbursements and 26-recipient overflow.
The terminal cases correctly retain their required zero-tax Section C.

All **75 packet pages** were rendered and visually reviewed through **59 unique
pixel hashes**; 16 exact duplicates map to those reviewed images. Section C
identities, every applicable line, skipped lines and both checkbox positions
were also extracted and compared. Four packets contain multiple-payee
statements, totaling eight statement pages; the overflow case includes five
pages with all 26 recipients and intact recipient groups. Reopened static
packets contain no widgets or AcroForm field tree. The spouse-owner Section C
correctly uses the spouse name and SSN, while the joint Schedule 1 names both
filers. These are local synthetic filing packets, not authenticated sources or
IRS acceptance evidence.

The typed regression selected **338 tests**: 337 passed initially and one older
Archer contribution test failed because its private evidence directory was
missing. Creating that directory and replaying the failed test produced one
pass without a production fix. The final overflow replay also passes after a
singular-day label correction. The batch includes 18 complete-return/source
boundary tests and five LTC allocation/source unit tests. Twelve altered public
inventories reject; 120 changed-source or income cases reject at each export
boundary, plus one multiple-insured case rejects in each exporter (**121 native,
121 fresh-PDF rejections**). The existing benchmark remains **46/133**, with the
same 87 failing/error case IDs as the prior-history checkpoint.

The filing route intentionally supports one current-return Section C and one
reviewed period. Calculating multiple insureds does not authorize extra native
copies: TY2025 v5.4 permits one `IRS8853` and one Section C group, while its
multiple-payee statement has no additional insured identity. The required
attachment representation is deferred item 131; exports retain the guard.
Mixed MSA/LTC activity, nonqualified contracts, multiple or changing periods,
business-relationship exclusions, additional filing copies, source authenticity,
business rules and IRS acceptance remain open. No parent board task is closed.

Private source/pending/XML/PDF, XSD logs, independent arithmetic, rendered-page
hashes and regression evidence are retained in
`.state/research/form8853-ltc-2026-10-10/`; generated evidence is not committed.
