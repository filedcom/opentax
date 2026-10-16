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
- Single codes 7, 2 and 4 with normal-age, known-exception or death-benefit
  evidence respectively. Owner matching includes jointly filing spouses and
  reviewed masked recipient TINs.
- Early codes 1 and S with reconciled dated payments, no-exception or payment-bound
  exception 01/04/06/10/12/20 review and
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

The shared `disabilityWagesF1040Fields` currently emits `line1a_wages`.
[IRS Publication 525](https://www.irs.gov/publications/p525) and
[Publication 575](https://www.irs.gov/publications/p575) direct taxable disability
pensions to line 1h until minimum retirement age, then to pension lines 5a/5b
beginning the following day. Correct the shared destination and reconcile the
2026 earned-income consumers before enabling code 3 or pension disability
exceptions. The current EIC source contract expressly excludes retirement
disability wages; dependent care, child credits, dependent deductions and Schedule
R also need their distinct income/eligibility review. These 2025 publications are
method comparators pending final 2026 instructions.
