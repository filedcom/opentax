# TY2026 Form 1099-R route contract

Sources: pinned final [2026 Form 1099-R](../corpus/authorities/f1099r--2026.pdf)
(SHA-256 `d3de9319bed344f02621f97760a50bd19093de22f7d1e3352bd8ff10f61a4c44`)
and [2026 instructions](../corpus/authorities/i1099r--2026.pdf)
(SHA-256 `0bb009120b7793c15445c0e4be2cd525bc37b19c215f2478b6df627dcf23db14`).
The pinned draft [2026 Form 1040](../corpus/draft/f1040.pdf) supplies destination
fields. Final 2026 Form 1040 instructions, current MeF rules and ATS acceptance
remain filing gates. The currently served draft 1040 instructions still describe
2025; their ordinary income/rollover display conventions are provisional method
comparators, not final 2026 authority.

## Current implementation

The registered `f1099r` source accepts a reviewed inventory of issued statements,
original/corrected copy lineage, recipient identities, actual 2026 boxes and
separate treatment evidence. It calls `calculateReportedRetirementIncome`, the
same amount helper used by the existing 2025 node, after validating the 2026
source contract. The 2025 node retains its existing validation and annual policy.
No directory-wide reorganization or copied calculation engine is required.

Supported current source treatments are:

- Traditional, SEP and SIMPLE IRA distributions with no basis, current
  nondeductible contribution, rollover, conversion or special exclusion.
- Qualified employer-plan and governmental 457(b) distributions with
  payer-determined taxability, including a taxable amount below gross.
- Single codes 7, 2, 3 and 4 with normal-age, known-exception, disability or
  death-benefit evidence respectively. Code 3 needs a payer-exception review;
  a non-IRA copy also needs a separate ordinary-withdrawal or disability-pension
  classification. Owner matching includes jointly filing spouses and
  reviewed masked recipient TINs.
- Early codes 1 and S with reconciled dated payments, no-exception or payment-bound
  exception 01/03/04/06/10/12/20 review and
  SIMPLE first-contribution evidence. Shared Part I arithmetic feeds Schedule 2
  directly or separate owner Form 5329 drafts; see the [early-tax contract](./FORM5329-GRAPH.md).
- Single-code G direct plan rollovers to eligible non-Roth destinations or Roth
  destinations, with transfer date, amount, destination and after-tax basis
  reconciled to gross, taxable amount and zero withholding. IRA code G and
  distributions from designated Roth accounts remain separate unfinished paths.

Current copies alone feed IRA/pension income, federal withholding and Schedule A
state/local withholding. Exact cents are summed before whole-dollar line rounding.
The source replay reconciles income in AGI and the draft bundle, including Social
Security taxability, Marketplace MAGI, EIC/ACTC and NIIT: qualified retirement
income increases AGI/MAGI without becoming wages or net investment income.

Fully taxable ordinary distributions print only the taxable line. Partial pensions
and direct plan rollovers retain gross on line 5a; zero-taxable rollovers print zero
on 5b and check 5c(1). Box 4 joins other information-return withholding on 25b.
Withheld current 1099-Rs require their unchanged original PDF, verified by hash and
readability and returned as separate required source attachments. Generated draft
pages remain static, marked incomplete and not for filing. Attachment references
and filenames must be distinct across the bundle.

## Source shape changes

| 2025 source field | 2026 source treatment |
| --- | --- |
| box 7 codes | Actual 7a code array retained; the current calculation accepts one supported code. Optional QCD code Y and combinations require their own route. Absence of Y does not establish absence of a QCD. |
| IRA/SEP/SIMPLE indicator | Actual box 7b must match the reviewed plan type. |
| no Trump-account field | Box 7c is retained and explicitly blocked pending its own calculation. |
| no excess-earnings field | Box 7d is separate from gross and explicitly blocked when positive. |
| box 8 amount | Distinct 8a dollar amount and 8b annuity percentage; special calculation is required. |
| combined address lines | Optional split payer/recipient address facts are retained for future attachment mapping. |

Review evidence excludes QCD/HSA funding/PSO exclusions, disaster and corrective
treatments, special tax methods, indirect rollovers, excess contributions and RMD
shortfalls. Pensions with undetermined taxable amounts require an annuity/basis
workpaper. A no-basis IRA can derive taxable gross when box 2a is absent and 2b is
checked; an explicit conflicting taxable amount is rejected rather than discarded.
Duplicate current statements, broken correction chains, mismatched owners,
duplicate state/local rows and withholding above gross fail before aggregation.

## Required remaining work

- Form 8606 owner-wide IRA basis, Roth distributions/conversions and contribution
  records; QCD with and without Y, HSA funding and public-safety exclusions.
- Remaining Form 5329 exceptions, excess contributions, RMD shortfalls and
  other parts. Early codes 1/S now use the reviewed Part I route above.
- General Rule/Simplified Method annuity workpapers, disability wages, NUA,
  Form 4972 elections, disaster/repayment routes and additional code combinations.
- Trump-account and excess-contribution earnings rules; nonqualified commercial
  annuities with their separate NIIT treatment.
- Current 2026 MeF source/attachment mapping, final-instruction PDF reconciliation
  and ATS coverage. The May v1 XSD package remains research material.

These are required parity work, not excluded product scope. The current source,
graph and PDF tests cover correction selection, owner matching, taxable amounts,
rollovers, downstream tax/credit interactions, attachments and explicit diagnostics;
the existing 2025 retirement tests guard the shared-helper extraction.

## Validation evidence

The implementation passed 855 current 2026 tests, 125 focused retirement tests
(including the existing 2025 node regression suite), nine final attachment tests,
and all 137 repository unit checks. Five rendered pages across ordinary-retirement,
rollover and explicitly synthetic issued-copy fixtures were visually reviewed;
static draft fields and original attachment bytes are also checked in tests.
These results establish development behavior, not IRS filing acceptance.

### Disability routing dependency

The shared `disabilityWagesF1040Fields` now emits `line1h_other_earned`.
The shared node adds disability and corrective distribution amounts before
writing Form 1040 and AGI, preserving withholding and keeping disability wages
off pension lines. Regression coverage checks the mixed-source case and the
2025 export guard: disability wages cannot be mislabeled as a corrective
distribution statement.
[IRS Publication 525](https://www.irs.gov/publications/p525) and
[Publication 575](https://www.irs.gov/publications/p575) direct taxable disability
pensions to line 1h until minimum retirement age, then to pension lines 5a/5b
beginning the following day. The 2026 source calculation now implements this
payment-date split and reuses the shared helper for both categories. Ordinary
code-3 withdrawals and exception-03 withdrawals are connected to return assembly.
Employer disability wages now reach the earned-income consumers described below.
Schedule R eligibility and native disability filing statements remain required.
These 2025 publications are method comparators pending final 2026 instructions.

The routing correction passed 143 typed retirement and export regressions and
137 repository unit/harness checks. These checks do not establish 2026 disability
eligibility or filing acceptance.

### Disability payment source contract

Income classification is separate from the additional-tax exception. Non-IRA
code 3 and exception 03 require a reviewed distinction between an ordinary plan
withdrawal and an employer disability pension. IRA distributions cannot become
employer disability wages. Correct code 3 needs the payer's disability-exception
review and does not create an unnecessary Part I form.

Employer pensions require an owner/account match, the plan record establishing
the first non-disability pension eligibility date, disability retirement date,
complete dated gross/taxable payment records and review of special military,
service and terrorism exclusions. Every payment must occur in 2026 after
retirement; gross and taxable sums must reconcile to the current issued copy.
Payments on the minimum-retirement-age date remain wages; later payments become
pension income. Withholding is counted once from the issued copy, and pure-wage
copies do not emit pension lines. The complete taxable distribution remains the
Part I base regardless of its wage/pension split.

Early-tax and disability ledgers must describe the same payments, dates and
amounts. Current statements for one owner/payer/account cannot reuse payment
references or disagree on plan dates. Different owners remain separate. The
source result retains exact-cent `line1h_disability_wages` and owner-linked dated
`disability_wage_payments` for the downstream consumers.

### Disability wages in return calculations

The retirement node emits exact-cent disability wages alongside pension/IRA
amounts. Form 1040 accepts multiple line-1h components, adds them and rounds the
printed line once. AGI independently replays the retirement and moving inventories,
checks their owners, and reconciles the combined line. The draft bundle replays both
sources; Form 3903 receives only its own moving component, not the combined 1040 line.

EIC already receives these wages through AGI and must not add them again. A claim
with disability wages replaces the old no-disability declaration with the actual
`retirement_inventory_reference` and `no_inmate_or_workfare_wages`; contradictory,
missing or wrong-owner evidence fails. Shared child-credit arithmetic uses the
same finalized wage line. The three-child ACTC payroll alternative continues to
use actual W-2/SE payroll sources, never payroll tax inferred from disability wages.

Dependent-care benefits and credits replay the same retirement inventory, including
filer identities and birth dates. Annual `annual_retirement` earnings add disability
wages to the receiving owner's W-2 wages; `annual_business` also includes the
owner's business earnings and applicable SE deduction. Monthly care derives disability
wages from payment dates before applying student/incapacity floors. No second
entered disability total or monthly ledger is accepted. The final care credit
reconciles the benefit calculation's retirement source against AGI's source.
Taxable care benefits and post-minimum-retirement pension amounts remain distinct.

The dependent standard deduction, child-tax screening/support and education
support calculations consume the classified wage component through AGI. Pension
payments after the minimum-retirement date remain unearned income. Regression
cases cover a dependent deduction, child-tax unearned income, the under-24 AOTC
support boundary, annual/monthly care, separate spouses, business earnings and
combined moving income. This uses the Pub. 575 wage classification with each
consumer's existing income definition; it does not equate disability pensions
with qualified-disability-trust distributions.

Source basis: [Pub. 575](https://www.irs.gov/publications/p575),
[disability and EIC](https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/disability-and-the-earned-income-tax-credit-eitc),
[Pub. 503 earned income](https://www.irs.gov/publications/p503),
[Pub. 501 dependent deduction](https://www.irs.gov/publications/p501),
[Form 8615 instructions](https://www.irs.gov/instructions/i8615) and
[Form 8863 instructions](https://www.irs.gov/instructions/i8863).
The current publications/instructions remain comparators where final TY2026 text
is not published; the wage classification applied to the latter three consumers
is the implementation's interpretation of these sources.

**Required remaining work:** Schedule R, native disability filing statements,
current MeF/ATS acceptance, other retirement basis/rollover/exception branches and
final 2026 instruction reconciliation. Moving-income-plus-care combinations still
need the separate moving earned-income bridge. These draft calculations do not
establish complete disability or retirement filing support.

The disability earned-income increment passed 903 full TY2026 runtime tests,
200 typed retirement/care/moving/credit/PDF/Form 1062 checks and all 137 repository
unit checks. Eleven pages across combined moving/disability and monthly-care
returns were rendered and visually reviewed; PDF checks require no AcroForm or
annotations and keep plan/payment evidence out of the draft. These checks validate
development behavior, not IRS filing acceptance.
