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
The monthly comparison preserves the agreed family-share proportion as an exact
ratio. The shared worksheet operates in bounded integer units, retaining monthly
fractions and each spouse's share without intermediate dollar rounding. Exact
limits are stored as JSON-safe numerator/denominator pairs; filed lines are
projected separately, with line 8 adding the filed lines 6 and 7. For one month
of equally shared family coverage, each exact share is $4,375/12 and each owner
form shows $365. Those two printed amounts do not authorize $730 of source
contributions against the exact $4,375/6 shared pool. Equivalent allocation
ratios are accepted, but changing proportions between current and baseline
calculations is rejected.

[Notice 2008-52](../corpus/authorities/n-08-52.pdf) is pinned for the monthly/full
contribution comparison and testing-period rules. Its historical dollar amounts
and distribution-tax rate are not reused as 2026 parameters. Its full-year
self-to-family example is covered: a full-year eligible owner can still need
the monthly comparison when relying on the higher December limit. The workpaper
retains the December 1, 2026–December 31, 2027 obligation with original calendars,
allocation references and gross personal/employer funding. Exact current and
monthly limits are retained alongside the filed-dollar projections, and even
sub-dollar differences create a testing record. These are **limits, not final
recapture amounts**: the future Part III source replay must reconcile actual
funding and apply its own rounding/treatment rules.

Current limits require reviewed absence of Archer MSA contributions and unchanged
marital status and use an agreed exact family-share ratio. Mixed spouse
last-month elections where an account owner is December-ineligible, paired
family-to-self last-month treatment, and coverage-choice cases rejected by the
shared worksheet remain open work.
This workpaper emits no deduction, excess tax or Part III tax, and does not
register Form 8889. Qualified funding transfers, corrected/excess distributions,
prior-year histories and graph/output reconciliation must be completed first.

Exact-limit validation: 188 typed HSA source, worksheet, owner-return and MeF
tests pass, including seven new exact-allocation cases covering all twelve month
counts, unequal/boundary shares, mixed coverage, half-dollar ties and sub-dollar
testing exposure. The unit gate passes 137 tests, resolves 3,802 graph modules
and confirms unchanged runtime; formatting, lint and generated inventories pass.

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

### Current contribution arithmetic

The current-contribution workpaper now feeds reconciled personal cash and the
employer year-adjustment worksheet into shared Part I arithmetic. The 2025 node
uses the same extracted calculation, preserving its existing numeric behavior;
2026 supplies exact rational operations. Source cents and monthly family-share
fractions remain intact when determining current personal deduction capacity,
personal excess, employer excess and unused capacity. Employer contributions
are never deducted as personal contributions.

A separate whole-dollar projection replays lines 2, 8–12 and the current-year
portion of line 13 from rounded form inputs. An exact one-cent excess can remain
even when those printed lines agree; the source calculation is retained for
subsequent excess treatment. Supporting MFS spouse accounts do not produce
return contribution calculations. Last-month records now include exposure based
on actual gross contributions, capped by the current limit and compared with
the actual monthly baseline; an unused December limit alone does not create a
gross contribution exposure amount.

These are explicitly **before-withdrawal and before-prior-excess** calculations.
They do not establish the final deduction, W-2 excess income, Form 5329 tax or
Part III recapture. Current-year noncash receipts need separate tax-treatment
reconciliation; a sourced qualified-funding route is now available below.
Rollover, trustee-transfer and repayment labels still do not establish treatment. No Form
8889 registry node or filing output is added by this workpaper. The next source
settlement must reconcile timely returns/earnings, employer inclusions and prior
excess against these retained exact amounts, then bind the final return outputs.

Current-contribution validation: 200 typed source, shared HSA, 2025 owner-return
and MeF tests pass, including 12 current-contribution tests for payroll ordering,
source cents, exact monthly fractions, actual funding exposure and owner scope.
Formatting and lint pass. The unit gate passes 137 tests with 3,805 graph modules
and unchanged runtime; generated inventories are current.

### Qualified IRA funding source reconciliation

[Notice 2008-51](../corpus/authorities/n-08-51.pdf) is pinned for the qualified
funding rules, alongside the 2026 Form 8889 and 1099-R instructions. Historical
limits and distribution-tax rates in the notice are not 2026 parameters.

The source workpaper joins each current IRA funding receipt to an actual dated
IRA payment, issued 1099-R, account agreement, direct-transfer instruction and
lifetime-history review. Complete IRA ledgers must reconcile gross distributions
and withholding, including separately retained ordinary payments. Funding
payments must match one same-owner HSA receipt without withholding. Renaming a
payment does not permit duplicate custodian transaction IDs. Each spouse keeps
separate source records, lifetime elections and annual allocation capacity.

Transfer-month eligibility and the one-transfer/self-to-family exception reuse
the extracted 2025 helper with explicit 2026 limits. The source adapter checks
actual coverage rather than December-elected coverage; dated plan transitions
cannot be overridden by a continuity assertion. SEP/SIMPLE accounts require a
review of employer contributions for the plan year ending in 2026. A positive
amount makes the account ongoing. Roth and non-ongoing SEP/SIMPLE funding records
remain distinguishable from traditional IRA records.

Qualified amounts now reach the exact current contribution calculation and
projected Form 8889 line 10, reducing employer and personal capacity without a
personal deduction. Each transfer retains its own testing period through the
last day of its receipt month in 2027. Last-month exposure accounts for funding's
use of contribution capacity but is capped at non-funding contributions; it does
not include the funding transfer again under the last-month testing rule.

The [internal annual IRA workpaper](FORM8606-GRAPH.md#qualified-hsa-funding-in-the-internal-annual-workpaper)
now binds these records to actual return identities, current IRA copies and W-2s.
Verified payments leave the ordinary pro-rata pool while retaining basis, with
immediately-before-transfer valuations required when basis exists. This does
not yet connect public retirement income, Form 5329 or Part III. Prior lifetime elections, over-limit transfers and other
nonqualified amounts need their ordinary IRA/HSA tax treatment, rather than an
assumed exclusion. Cross-month settlement, changed eligibility between the
first day and transfer, multiple issued copies for one IRA account, and funding
above an owner's current annual allocation stop for further reconciliation.
The transfer-month maximum can differ from the ordinary monthly limit (including
Notice 2008-51's family-to-self example); that branch remains explicit pending
work rather than being classified as automatically taxable. Future integration
must connect the internal annual IRA binding to the public retirement adapter
and coordinated HSA outputs; basis-depleting and Roth funding need their own
settlement. The internal bridge passes 324 focused HSA/IRA/retirement and prior
year regression tests, including 13 new annual binding cases.

Qualified-funding validation: 220 typed HSA/source, 2025 owner-return and MeF
tests pass, including 20 new transfer-source cases. These cover statement/receipt
matching, duplicate custodian payments, separate spouses, lifetime and second
transfer limits, employer plan-year status, Roth sources, source cents and
independent testing exposure. Formatting, lint and inventory checks pass. The
unit gate passes 137 tests, resolves 3,809 graph modules and confirms unchanged
runtime.

### Current distribution and medical-expense workpaper

The 2026 distribution source now resolves 1099-SA correction chains before
reconciling complete dated trustee payment ledgers. Current statements bind to
actual owner identities (including reviewed masked TINs), account numbers and
statement identifiers. Every current gross/earnings box must equal the ledger's
source-cent totals. Replaced copies remain evidence without contributing income
again. Orphaned or branching corrections, cycles, duplicate current copies,
renamed custodian transactions and payments assigned to retired copies fail.
Multiple current distribution-code statements can belong to the same account.

The ordinary owned-HSA workpaper reuses the taxable-distribution and additional-tax
arithmetic extracted from the 2025 node. It retains each actual payment's date and
medical allocation. Age 65 derives from the actual birth date; a disability
exception requires an owner-specific physician determination and onset date.
Code 3 alone cannot create an exception, and age/disability does not exempt
unrelated earlier payments. Contribution eligibility is independent of this
calculation: an owner can receive qualified medical reimbursements while no
longer eligible to contribute.

Medical receipts identify the beneficiary, payer, patient, provider invoice,
service/payment dates, qualification review and traceable payment allocations.
Own, spouse and section 223 medical-dependent patients are distinguished.
Earlier-year expenses can be reimbursed when actual HSA establishment precedes
the service; a new trustee account can retain the earlier establishment date with
continuity evidence. Prior deductions, other coverage, other account reimbursements
and nonmedical costs reduce the available expense before allocation. Each bill
and actual distribution can be spent only once across the supplied inventory.

The supplied current Schedule A medical inventory is replayed through its source
calculator. Matching bills must retain the same facts and exclude both current
and other tax-free reimbursements; changing a reference cannot conceal a duplicate
bill. This remains an internal bridge: the eventual public producer must supply
the actual executed medical inventory and return identity, rather than accept a
second independently entered inventory.

Source cents remain alongside separately replayed Form 8889 lines 14a–17b.
Filed line 16 subtracts filed medical expenses from filed distributions, and the
additional tax uses the filed taxable amount after its bounded exception
allocation. Both source and filed results are retained; rounded gross amounts do
not replace payment evidence.

This route does not yet settle rollovers or mistaken repayments. Code-2
records require the excess-return reconciliation below before exclusion.
Death/prohibited-transaction/MSA records need their separate routes. Insurance, DPC, long-term-care, capital and travel
medical expenses require their own qualification rules; they are not accepted as
ordinary medical receipts. Full graph, Schedule 1/2, owner PDF/MeF and Part III
integration remain required work.

Distribution validation: 345 typed HSA, IRA/retirement, shared HSA, 2025
owner-return and MeF checks pass, including 21 new distribution cases. The
Schedule A duplicate-bill checks also pass after tightening reference matching.
The current 2026 draft instructions were downloaded and match the pinned hash
on October 16, 2026. Formatting, lint and generated-inventory checks pass.
The unit gate passes 137 tests with 3,817 graph modules and unchanged runtime.

### Timely personal and employer excess returns

The distribution workpaper now optionally binds the current-contribution
workpaper before excluding code-2 payments. Actual return identities, birth
facts and every account must match. Returned principal identifies original
same-owner, same-kind 2026 receipts paid before withdrawal; a different owned
HSA may make the payment. Principal cannot be spent twice or exceed the exact
personal/employer excess derived from the shared contribution arithmetic.
Qualified IRA funding reduces contribution capacity before this comparison.

Current payments must match the resolved 1099-SA code-2 ledger, with returned
principal plus all trustee-reported attributable earnings equal to gross.
Every current code-2 payment needs settlement. A returned excess payment cannot
also reimburse medical expenses. Partial personal and employer returns may
coexist with ordinary payments, and unreturned excess remains explicit.

Following-year payments instead require the actual 2027 trustee transaction and
matching owner receipt. They reduce the 2026 excess but enter neither 2026 gross
distributions nor 2026 earnings income. Retained 2027 records identify principal,
excludable gross and earnings to report in that year; they are not a generated
2027 return. The ordinary April 15, 2027 deadline applies unless the same return
has a timely filed, accepted Form 4868 supporting October 15, 2027. Reviews must
cover the complete deadline and all source reviews.

Employer excess remains income even when timely returned to its owner.
Sourced payroll reconciliations must identify actual owner/employer W-2s and
reconcile box 1 before and after HSA excess inclusion. Only that proved inclusion
reduces the remaining employer-excess income. Returned principal, current-year
earnings and employer excess are separate outputs, not one taxable withdrawal.
The workpaper retains exact fractional limits and separate personal/employer
balances; it does not yet calculate final Form 5329 tax or prior excess.

The [2026 Form 8889 instructions](https://www.irs.gov/pub/irs-dft/i8889--dft.pdf)
and [Form 5329 instructions](https://www.irs.gov/pub/irs-dft/i5329--dft.pdf)
provide the deadline and receipt-year treatment. The
[2026 form](https://www.irs.gov/pub/irs-dft/f8889--dft.pdf) explicitly floors line 16
at zero: independent rounding of verified medical and returned-excess amounts
can put their filed total a dollar above filed gross, without invalidating the
source reconciliation.

Loss-adjusted returns, employer recoveries, prior contribution years, special
postponements and section 301.9100-2 amended-return relief still need their own
source routes. This remains internal workpaper integration; public graph binding,
final Schedule 1/2/Form 5329 settlement, Part III and PDF/MeF outputs remain open.

Excess-return validation: 366 typed HSA, IRA/retirement, shared HSA, 2025
owner-return and MeF checks pass, including 21 new excess-return cases. The
unit gate passes 137 tests with 3,820 graph modules and unchanged runtime.
Formatting, lint and inventory checks pass. The current draft Form 8889 and
Form 5329 instructions match their pinned hashes on October 16, 2026.

## Required source integration

1. Connect the reconciled Form 5498-SA/payment/W-2 source bridge to the actual
   graph producers and extend it for employer recoveries, corrected distributions
   and special contribution deadlines. Preserve source cents through filed lines.
2. Extend the owner-limit workpaper for Archer MSA sources, marriage changes,
   mixed last-month spouse choices and the remaining allocation branches; bind
   its retained monthly/full-year records to actual deduction/excess calculations.
3. Extend the reconciled 1099-SA/medical/excess-return workpapers for rollovers,
   mistaken repayments and remaining excess/medical branches. Bind the actual
   Schedule A inventory, including new DPC rules for reimbursed fees.
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
