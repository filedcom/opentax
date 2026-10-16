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
The eventual source producer must bind general/W-2/account facts and reconcile
both spouses' deemed family coverage before taking any deduction. Do not use
one owner's independently calculated limit as a married family return limit.
The existing W-2 code W route still has an unregistered 2026 receiver.

Validation for this foundation: 166 focused HSA, 2025 owner-return/MeF and
return-arithmetic tests pass, plus 13 section 1294 export/PDF regressions and
137 unit-gate tests. The owner-return replay exposed a pre-existing export check
that added retained Schedule 2 cents instead of the rounded Form 1040 line 23;
the check now agrees with the return calculation, with rejection tests for
incorrect totals. The unit gate resolved 3,791 modules without runtime changes.

## Required source integration

1. Reconcile issued Form 5498-SA/account payment ledgers to personal and employer
   contributions, including 2026-for-2025 and 2027-for-2026 employer adjustments
   against actual W-2 code W. Preserve source cents through filed-line rounding.
2. Join each spouse's monthly eligibility before the family allocation, separately
   preserve each catch-up, and retain the actual last-month election and its
   December 2026–December 2027 testing-period obligation.
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
