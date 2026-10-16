# TY2026 HSA contribution, distribution, and testing-period contract

Sources: pinned [2026 draft Form 8889](../corpus/draft/f8889.pdf), SHA-256
`c94550b7d4b735b11e9901c5dbff5dab0aa6dcbbefab04864c61cd5275cafec8`,
[2026 draft instructions](../corpus/draft/i8889.pdf), SHA-256
`c7f6165c62f63ee7eee9e59ea0c1bde038bc4f0a4d8bf6c3bebdc264c2e3c01c`,
and final [Rev. Proc. 2025-19](../corpus/authorities/rp-25-19.pdf) for indexed
limits. Recheck the final form/instructions and current MeF package before
filing. The form's **visible** line 3 says $4,400 self-only and $8,750 family;
its `f1_4[0]` AcroForm tooltip incorrectly says 2025/$4,300/$8,550. Use
printed text and instructions as the calculation authority.

## Per-beneficiary source and filed routes

An HSA belongs to its beneficiary. For a joint return with both spouses'
HSAs, prepare two Forms 8889, each with the beneficiary SSN, Parts I–III,
W-2 code W amounts, Form 1099-SA distributions and prior testing-period
records. Combine only their destination amounts on Schedules 1 and 2. A
distribution requires Form 8889 even if it creates no taxable income.

| Source and worksheet | Form 8889 calculation | Filed destination |
| --- | --- | --- |
| Eligibility by month | For each of 12 first-of-month dates, record self-only/family/none, Medicare/dependent/other-plan restrictions, and the 2026 bronze/catastrophic plan, telehealth and qualified direct-primary-care exceptions. Apply the line 3 limitation chart, last-month rule and subsequent testing period. Age 55+ increases the appropriate monthly or line 7 amount by up to $1,000. | Lines 1 and 3; preserve monthly facts rather than only a month count. |
| Contributions and spouse allocation | Own/on-behalf contributions for 2026, employer/cafeteria contributions (including W-2 box 12 code W with tax-year adjustment), Archer MSA **contributions from Form 8853 lines 1 and 2** (see [its contract](./FORM8853-GRAPH.md)), qualified HSA funding distribution, and agreed family-limit allocation between spouses. | Lines 2–12; deductible **smaller of line 2 or line 12** → line 13 → Schedule 1 line **13** → AGI. Employer contributions are not deducted again. |
| Excess contributions | Compute own and employer excess separately, account for timely withdrawal and earnings, and carry prior-year excess with HSA fair market value to Form 5329 Part VII. The excess is not simply all own plus employer contributions less the annual limit. | Form 5329, excess-employer income as applicable, and corrected contribution/earnings treatment; reconcile Form 8889 line 13. |
| Distributions | Form 1099-SA box 1 less valid HSA rollover and timely excess withdrawal/earnings; subtract unreimbursed qualified expenses incurred after HSA establishment. Track the taxable portion subject to a death, disability or age-65 exception separately. | Lines 14a–17b; line **16 → Schedule 1 line 8f**, line **17b → Schedule 2 line 13c**. A checked 17a does not excuse unrelated taxable distributions from 20% tax. |
| Failure of testing period | If the last-month rule or a qualified funding distribution failed its subsequent testing period, calculate recapture from the contribution-year record. Death/disability exceptions require their own evidence. | Lines 18–21; line **20 → Schedule 1 line 8f**, line **21 → Schedule 2 line 13d**. Do not merge these with distribution tax. |

The [2026 PDF inventory](../inventories/pdf-fields/pdf-fields-f8889.csv) has **27 fields**, all in the
canonical field tree on the single printed form page (PDF page 2 after the
draft coversheet). Fields `f1_3[0]`–`f1_24[0]` cover lines 2–21; `c1_1[0/1]`
select coverage and `c1_2[0]` is the line 17a exception box. Use a separate
copy for each spouse and verify field values and rendered appearances.

## Current code and 2026 eligibility foundation

The earlier prototype description is superseded by the loaded 2025 node and its
source/return tests. The current shared node has explicit monthly coverage,
owner identities, spouse allocations, employer contribution-year adjustments,
funding distributions, sourced medical/rollover/excess distributions, partial
age/disability exceptions, prior excess and testing-period recapture. Its output
includes owner form instances and routes HSA income to Schedule 1 line 8f.
The current 2025 PDF/MeF descriptors map the expanded owner instances rather than
only four summary amounts. This is reusable implementation, not 2026 authority.

The contribution-limit worksheet is now extracted to a year-independent helper.
The 2025 node passes its existing limits and preserves its established input key
for the Archer MSA offset; the new helper calls that offset **contributions**.
The 2026 configuration separately supplies $4,400/$8,750, $1,000 catch-up,
$1,700/$3,400 minimum deductibles and $8,500/$17,000 out-of-pocket ceilings.
No global 2026 filing registration was added.

The internal `hsa-eligibility` workpaper derives twelve monthly owner coverage
values from actual source records. It does not accept an eligible-month count:

- Each month identifies first-day enrollment, Medicare including retroactive
  enrollment review, other coverage including spouse/FSA/HRA/VA/IHS review, and
  active direct-primary-care arrangements. Owner identity, birth date, dependent
  status and a complete calendar are retained for later binding to general.
- Ordinary health plans are checked against deductible/out-of-pocket limits,
  embedded family deductibles and nonpermitted first-dollar benefits. The
  telehealth exception respects its plan-year effective date.
- Individual-market bronze/catastrophic policies use the 2026 exception. The
  source records distinguish exchange purchase, off-exchange availability and
  the Notice 2026-5 reasonable-belief safe harbor; employer group/SHOP plans
  cannot use that branch.
- Direct-primary-care contracts retain fixed periodic fees, the months in each
  billing period, whether multiple individuals are covered, practitioner/service
  qualifications and the sole-compensation condition. The limit is applied to
  the aggregate annualized fee with exact rational-cent comparisons, so even a
  one-cent annual excess cannot round down into eligibility. Contract terms,
  rather than only services actually used, control the classification.
- Every active plan and arrangement must occur in the relevant monthly record;
  leaving out a disqualifying plan fails. Overlapping versions, repeated month
  records, wrong owners, contradictory dates and invalid classifications fail.
  A short enrollment period with no covered first day creates no eligible month.

[Notice 2026-5](../corpus/authorities/n-26-05.pdf) is now pinned in the corpus with
its hash. The downloaded July 2026 draft instructions and Rev. Proc. 2025-19
were rechecked against their existing hashes on October 16, 2026 and match.
The DPC eligibility exception is independent of reimbursability: employer-paid
DPC fees cannot later be claimed as the beneficiary's medical expense.

This is an **unregistered source foundation**, not a finished Form 8889 return
route. Its monthly values feed tests of the same limit helper used by 2025.
The eventual graph producer must bind general identity/dependency facts and
resolve the family allocation before taking any deduction. Do not use
one owner's independently calculated limit as a married family return limit.
The existing W-2 code W route still has an unregistered 2026 receiver.

### Funding and household evidence

The internal funding workpaper now reconciles each trustee account's dated
receipts against the actual 2026 Form 5498-SA (or current custodian substitute)
and each issued W-2. The current
[1099-SA/5498-SA instructions](../corpus/authorities/i1099sa--2026.pdf), revision
December 2026, are pinned with their hash and explicitly apply to 2026 data:

- Box 2 includes calendar-2026 personal/employer deposits for **both** 2025 and
  2026, plus reported IRA-to-HSA funding transfers; box 3 includes 2027 deposits
  designated for 2026. Deposit dates and ordinary deadlines are checked.
- Box 4 reconciles reported rollovers separately. Direct HSA/Archer trustee
  transfers and accepted mistaken-distribution repayments stay outside new
  contributions. These classifications retain references for later tax-treatment
  review; they do not establish qualified rollover/funding/repayment treatment.
- Each employer receipt identifies its owner, employer, payroll evidence and
  actual current W-2 when paid in 2026. The reused employer worksheet subtracts
  2026-for-2025 deposits and adds 2027-for-2026 deposits. It runs in source cents
  before conversion to annual amounts; cafeteria contributions are never counted
  again as personal contributions.
- Distinct account and transaction identities, corrected-copy review, complete
  receipt ledgers through April 15, 2027, and statement totals prevent omitted,
  duplicate, stale-year or owner-swapped receipt records. Employer error recoveries
  and special postponed/combat-zone contribution deadlines still need extensions.

The household workpaper joins the two actual eligibility calendars with sourced
first-day marriage facts. When both spouses are eligible and either has family
coverage, it derives family coverage for both; it never revives a Medicare or
otherwise disqualified month. The contribution-evidence bridge matches these
owners to the reconciled funding owners. On a separate return, the spouse's
eligibility supports the family rule but the spouse's deposits are not included
as the taxpayer's contributions. This is a source bridge, not two independent
family limits or a computed deduction.

### Contribution limits and future testing records

The contribution-limit workpaper now uses that evidence bridge and the shared
2025 worksheet to produce owner limits. It distributes each shared family-month
pool once, retains self-only and sole-eligible family capacity, and computes
catch-up amounts for each owner separately. A one-account household cannot
transfer the absent spouse's catch-up. Separate-return spouse account evidence
supports allocation but does not become a filed spouse deduction.

The shared helper has an explicit monthly-only mode; existing 2025 callers keep
their previous behavior. The 2026 workpaper separately retains actual monthly
coverage and December/full-year coverage, with agreed allocations for each.
The monthly comparison preserves the agreed family-share proportion and assigns
the filed-dollar rounding remainder once, preventing an alternative allocation
from hiding an owner's testing-period exposure.

[Notice 2008-52](../corpus/authorities/n-08-52.pdf) is pinned for the monthly/full
contribution comparison and testing-period rules. Its historical dollar amounts
and distribution-tax rate are not reused as 2026 parameters. Its full-year
self-to-family example is covered: a full-year eligible owner can still need
the monthly comparison when relying on the higher December limit. The workpaper
retains the December 1, 2026–December 31, 2027 obligation with original calendars,
allocation references and gross personal/employer funding. The stored monthly
line is a **filed-dollar limit**, not a final recapture amount: the future Part III
source replay must use the retained facts and its own rounding/treatment rules.

Current limits require reviewed absence of Archer MSA contributions and unchanged
marital status and use agreed whole-dollar family allocations. Exact source-cent
allocation/remainder treatment still needs reconciliation before final filing.
Mixed spouse last-month elections where an account owner is
December-ineligible, paired family-to-self last-month treatment, and other
allocation/rounding cases rejected by the shared worksheet remain open work.
This workpaper emits no deduction, excess tax or Part III tax, and does not
register Form 8889. Qualified funding transfers, corrected/excess distributions,
prior-year histories and graph/output reconciliation must be completed first.

Limit validation: 181 typed HSA source, worksheet, owner-return and MeF tests pass,
including 13 new limit/allocation/testing-record cases. The unit gate passes 137
tests with 3,800 graph modules and unchanged runtime. Generated inventories are
current; these workpapers still do not add a Form 8889 registry node.

Funding/household validation: 168 typed source, shared HSA, owner-return and MeF
tests pass, including 18 new funding/household cases. The unit gate passes 137
tests, resolves 3,797 modules and confirms the runtime did not change during
verification. The generated inventories remain current; Form 8889 is still an
unregistered 2026 target rather than a completed filing path.

Validation for this foundation: 166 focused HSA, 2025 owner-return/MeF and
return-arithmetic tests pass, plus 13 section 1294 export/PDF regressions and
137 unit-gate tests. The owner-return replay exposed a pre-existing export check
that added retained Schedule 2 cents instead of the rounded Form 1040 line 23;
the check now agrees with the return calculation, with rejection tests for
incorrect totals. The unit gate resolved 3,791 modules without runtime changes.

## Required source integration

1. Connect the reconciled Form 5498-SA/payment/W-2 source bridge to the actual
   graph producers and extend it for employer recoveries, corrected distributions
   and special contribution deadlines. Preserve source cents through filed lines.
2. Extend the owner-limit workpaper for Archer MSA sources, marriage changes,
   mixed last-month spouse choices and the remaining allocation branches; bind
   its retained monthly/full-year records to actual deduction/excess calculations.
3. Reconcile dated 1099-SA receipts, qualified expenses, rollovers, excess returns
   and age/disability exceptions. Join Schedule A medical evidence to prevent a
   duplicate deduction, including the new DPC rules for reimbursed fees.
4. Port prior-year excess, funding transfers and recapture using actual 2025/2026
   years and their annual limits. The 2025 node still has explicitly dated schema
   keys and 2024 historical constants; do not execute it as a 2026 node or relabel
   prior-year evidence.
5. Bind income/deduction/tax/owner Form 5329 and Form 1062 classification, then
   complete the 2026 PDF/MeF routes and acceptance cases below.

## Build and acceptance order

1. Define owner-keyed HSA/account records and a 12-month eligibility/coverage
   ledger. Include contribution **tax year**, payment date/source, spouse
   family allocation, Archer MSA contribution, qualified funding distribution,
   1099-SA distribution class, expense evidence, exception amount, and
   carryforward/testing-period origin year. Reject missing facts that would
   otherwise be silently treated as full-year self-only coverage.
2. Calculate each beneficiary's lines 1–21 from the 2026 worksheets, then
   aggregate line 13 to Schedule 1 line 13, lines 16+20 to Schedule 1 line
   8f, line 17b to Schedule 2 line 13c and line 21 to line 13d. Connect
   Form 5329's actual excess-contribution calculation and W-2 code W by
   beneficiary. Reconcile these lines with AGI, Schedule 2 and 1040.
3. Build one 2026 PDF attachment per beneficiary, complete every applicable
   widget and check the printed page. Build TY2026 XML using current XSD
   names, attachment cardinality and relevant business rules; do not carry
   the four-field TY2025 serializer over without that mapping.
4. Test no activity, employer-only code W, self-only/family switch, Medicare
   start, December last-month election with pass/fail testing period, joint
   family-limit split and dual attachments, funding distribution, Archer MSA,
   rollover/returned excess, mixed taxable distributions with partial 20%
   exception, and prior-year excess/Form 5329. Run TY2025 regressions for
   any shared source or calculation changed.
