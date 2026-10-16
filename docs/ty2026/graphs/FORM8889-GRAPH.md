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

## Current integration status

The registered development source graph now accepts `hsa_accounts` and binds it
to actual return identity/dependency, W-2s, Schedule A medical payments and the
annual IRA inventory. It emits owner Forms 8889, combined owner Forms 5329 and
reconciled Schedule 1/2/1040 draft pages. Earlier foundation and validation
sections below describe the incremental workpapers; their former public-binding
gaps are resolved by the [return integration](#return-graph-and-draft-pdf-integration)
section. Native TY2026 MeF, public filing registration, final authorities and
advanced source branches remain incomplete.

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
balances; the annual workpaper below consumes them for prior excess and
Form 5329 Part VII tax.

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

## Annual prior excess and Form 5329 Part VII

`hsa-annual-excess.ts` replays the complete contribution, medical-distribution
and timely-return sources before calculating each owner's Part VII. A history
review either documents no unresolved prior excess or identifies the latest
filed original/amended 2025 return, with no pending corrections. Filed lines
42–49 must reconcile to each other and to distinct owner account values. The
2026 funding ledger supplies actual 2026 receipts designated for 2025 when
checking the prior account-value cap; the supported history route requires no
timely returned 2025 contributions among those receipts.

The [2026 Form 5329 instructions](https://www.irs.gov/pub/irs-dft/i5329--dft.pdf)
activate line 42 only when filed 2025 line 49 is positive. Shared 2025 arithmetic
combines unused personal contribution room and ordinary taxable distributions,
reduces the prior balance, and adds retained current personal/employer excess.
The corresponding prior-excess deduction increases Form 8889 line 13 once.
Source monthly fractions remain exact alongside independently replayed filed
lines; spouses retain separate balances, deductions and rounded taxes.

The [2026 form](https://www.irs.gov/pub/irs-dft/f5329--dft.pdf) caps line 49 using
December 31 values plus contributions made in 2027 for 2026. The workpaper
retains each Form 5498-SA value and dated following-year receipt. Applying the
instructions' treatment of timely returned principal as not contributed, it
removes allocations to those following-year receipts from that addition;
it does not subtract current-year principal or earnings from December 31 FMV.
The unchanged shared six-percent calculation supplies filed line 49 and the
owner totals for Schedule 2 **line 18**. Positive excess still requires Part VII
when the value cap makes the tax zero; carryforward follows the positive filed
tax condition rather than silently carrying every positive source balance.

Annual excess validation covers 414 focused HSA/IRA/retirement and 2025
regressions, including 13 annual cases. The rounding boundary also requires
Part VII when returned source excess is zero but replayed filed excess is
positive. The current Form 5329 and instruction hashes match the pinned
authorities on October 16, 2026. The final unit gate passes 137 checks
with 3,824 graph modules and unchanged runtime; formatting, lint and
generated-inventory checks pass.

This is an internal source workpaper. Public graph/PDF attachment binding,
prior-origin Part III testing-period histories, broader historical corrections
and the remaining advanced HSA routes are still required for complete return support.

## Current-origin testing-period settlement

`hsa-testing-period.ts` consumes the reconciled annual source workpaper and
retains dated coverage for every day of 2026. It shares plan/DPC classification
with first-of-month eligibility, and requires complete Medicare/other-coverage
periods that agree with the existing monthly source records. Gaps, overlaps,
contradictory sources and stale reviews fail before income is computed. Testing
uses the monthly eligibility definition in section 223(c)(1): a temporary HDHP
lapse between eligible first days does not itself create an ineligible month.
A lapse continuing through the next first day can trigger funding recapture;
a December lapse after December 1 does not invent current-year last-month tax.

The [2026 instructions](https://www.irs.gov/pub/irs-dft/i8889--dft.pdf),
[Notice 2008-51](https://www.irs.gov/pub/irs-drop/n-08-51.pdf) and
[Notice 2008-52](https://www.irs.gov/pub/irs-drop/n-08-52.pdf) govern this workpaper.
Each reconciled IRA funding transfer retains its own testing window; an earlier
lapse does not fail a later qualified transfer's window. The December last-month
window is separate. Current failures derive lines 18/19, shared 2025 Part III
arithmetic combines line 20 and the ten-percent tax, and filed tax rounding
occurs only after filed income lines. The workpaper identifies Schedule 1 line
8f and Schedule 2 line 13d without changing Part VII excess or treating the
funding transfer as another personal contribution.

The last-month exposure is limited to allowed nonfunding cash, with timely
returns settled and retained excess excluded. Exact monthly fractions remain
available alongside the filed amount. A physician-supported disability exception
also needs evidence tying the disability-caused coverage loss to the first
ineligible testing month; a later disability does not erase an earlier ordinary
loss. Dated coverage and statutory monthly eligibility remain separate outputs. Future obligations
remain pending through their actual 2027 end dates, not marked complete from a
2026 review.

Current-origin obligations cover living owners. The historical route below now
adds ordinary 2025 last-month cash contributions and dated qualified-funding
transfers; advanced historical corrections still need their own source routes. Death/inherited-account routes, public graph/PDF
binding and MeF remain unfinished. The annual workpaper is still internal, not
a public HSA input.

Validation: 426 focused HSA/IRA/retirement and 2025 source/MeF regressions pass,
including 12 testing-period cases. The repository unit gate passes 137 checks
with 3,828 graph modules and unchanged runtime. Formatting, lint and generated
inventory checks pass. No public graph or PDF route is claimed by these checks.

## Filed 2025 last-month histories

`hsa-testing-history.ts` retains actual 2025 contracts, monthly enrollment,
Medicare/other coverage, contribution receipts, election and filed owner forms.
The pinned [2025 instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf)
supply the historical HDHP parameters. The existing 2025 contribution constants
and shared household-limit worksheet redetermine each owner's monthly capacity;
2026 limits and the new bronze/DPC rules never relabel the earlier evidence.
Earlier telehealth safe-harbor plan years remain recognized.

Historical spouse eligibility determines deemed family coverage before allocation.
Both account holders' filed forms and the agreed ratio reconcile to one family
pool; separate filed-return references are retained when spouses filed separately.
Catch-up age is evaluated in 2025, and source fractions remain exact until filed
2026 recapture lines. Ordinary personal/employer cash receipts replay filed Part I
lines 2–13. Duplicate transactions, missing owners, late or wrong-year receipts,
stale filed records and incompatible limits stop the history calculation.

The annual bridge requires either reviewed absence or a named history for each
current owner. TIN/DOB and any retained prior Form 5329 filing reference must
agree. Every 2026 payment designated for 2025 must match the current funding
ledger's actual account, transaction, date, amount and contribution kind. An
unreferenced or duplicate history cannot contribute income.

A first ineligible month in 2026 activates the prior last-month exposure on line
18. An uninterrupted period through December 2026 is marked completed, with no
recapture or future obligation. Current IRA funding remains separately on line
19; shared Part III arithmetic combines the filed lines once. Disability causation
continues to use the current sourced physician/coverage review.

The cash history route excludes Archer MSA offsets, excess-return/recovery and
prior-excess deduction adjustments. The contribution history extension below
adds qualified IRA funding while preserving separate transfer testing windows.
Advanced historical corrections, legacy death/disability transitions and other
unsupported coverage branches still need source integration. Public HSA
return/PDF binding remains unfinished.

Historical last-month validation: 436 focused HSA/IRA/retirement and 2025
source/MeF tests pass, including 10 new prior-year history cases. The repository
unit gate passes 137 checks, resolves 3,833 graph modules and confirms unchanged
runtime. Formatting, lint and the generated inventory check pass.

## Filed 2025 qualified-funding histories

The contribution history workpaper now accepts actual 2025 IRA statements,
trustee payments and HSA receipts alongside the filed owner Form 8889. The
2025 statement schema retains its own tax year and excludes the 2026-only
Trump-account/excess-earnings boxes. The same source reconciler now serves
current and historical transfers: it matches owner/account identity, complete
IRA gross distributions and withholding, correction metadata, direct-payment
elections and destination receipts. Transfer-month eligibility, contribution-year
age, annual limits and the same-year self-only-to-family exception reuse the
existing calculation helper. SEP/SIMPLE employer contributions are checked for
the actual contribution year's plan year.

Monthly or last-month historical limits replay filed Part I with funding on
line 10. Cash exposure is capped at nonfunding cash after accounting for the
funding amount's use of capacity, following Notice 2008-51. A filed IRA exclusion
workpaper must account for that funding amount; this historical reconciliation
does not produce a new IRA exclusion or recalculate all prior-year IRA basis.

Each transfer's period begins in its 2025 transfer month and ends in that month
of 2026. A 2026 eligibility failure includes only the transfers whose periods
are still open on Form 8889 line 19. A later lapse cannot reopen a completed
period. The existing sourced disability-causation review applies independently
to each period. Historical monthly eligibility also identifies ordinary failures
in 2025 and checks the filed Part III income and additional tax; those transfers
remain marked failed in 2025 and are never recaptured again in 2026. The source
route requires no other 2025 testing income or historical disability exception,
so those combinations still need additional source settlement.

Current owners must reference one consistent filed household history for their
cash and funding obligations, or explicitly review their absence. Supplied
history cannot be silently omitted, duplicate an owner or contradict the actual
owner's DOB, filed excess history or cross-year cash receipts. A filed 2025
funding election also prevents a contradictory 2026 lifetime election. The
contribution-year sources are never relabeled as current-year records.

Qualified-funding history validation: 450 focused HSA/IRA/retirement and 2025
source/MeF tests pass, including 14 new historical funding cases. The unit gate
passes 137 checks, resolves 3,836 graph modules and confirms unchanged runtime.
Formatting, lint and generated inventory checks pass. Public HSA graph/PDF/MeF
integration remains outside these internal workpaper checks.

## Return graph and draft PDF integration

The `hsa_accounts` source input accepts annual evidence rather than asserted tax
lines. General identity supplies actual dates of birth and dependency answers;
W-2 supplies complete issued wage records. The year-specific start adapter routes
the original Schedule A medical-payment inventory before AGI, avoiding a cycle
through the later itemized deduction. A positive W-2 code W without an HSA annual
inventory now fails explicitly, and the old unregistered W-2 Form 8889 deposit
is removed.

The owner calculation joins contribution capacity, ordinary/timely-return
payments, prior excess and current/historical testing workpapers. Schedule 1
receives deduction on line 13, distributions/testing income on 8f, and separately
identified excess earnings/employer income on 8z. These amounts enter AGI before
Social Security and Marketplace calculations. Form 8960 now replays the HSA
source workpaper and reconciles its income and deduction with AGI using the
classification described below.

Qualified IRA funding is supplied to the actual retirement producer. Its complete
statement, dated-payment and annual-basis inventories must reconcile with the HSA
transfer evidence. The same transfer is excluded once from ordinary IRA income;
Form 1040 prints the line 4c Other checkbox and HFD notation, following the
[existing Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
and the matching 2026 draft boxes; final 2026 instructions still require reconciliation. A missing retirement
claim or a second, inconsistent HSA exclusion is rejected. Future testing periods
remain pending through their actual 2027 endpoints.

Owner Form 5329 now combines applicable Parts I, II and VII. Schedule 2 separately
receives the HSA distribution tax on 13c, testing tax on 13d and excess-contribution
tax on 18. Form 1062 replays these sources and preserves those nondeferrable taxes
outside its regular-income-tax comparison. Joint returns aggregate the printed
owner tax lines, including rounding, instead of reusing a combined shortcut.

The pinned Form 8889 template supplies one static development page per reportable
beneficiary, with correct owner identity, coverage/exception boxes and Parts I–III.
The combined Form 5329 renderer fills Part VII on its second printed page. Each
renderer replays source evidence and rejects mismatched destination amounts.
Inactive accounts produce no attachment; spouses get distinct owner forms. Draft
and incomplete-implementation markings remain visible. Independent PDF text
checks, static-document checks and rendered inspection cover the new output.

Validation for this integration: 1,380 distinct tax/source/PDF regressions pass
across all TY2026 tests and the selected TY2025 HSA/Form 5329 regressions. The
unit gate passes 137 checks, resolves 3,843 graph modules and confirms unchanged
runtime. Nine inventory-contract checks pass. New cases cover joint and separate
filers, inactive and employer-only accounts, actual IRA funding, independently
failed current/prior testing periods, medical double-use rejection, Social
Security/Marketplace MAGI, NIIT review, Form 1062 tax classification and static
owner PDF pages. This is development validation, not IRS acceptance.

## Source-reconciled HSA rollovers

Current-year HSA cash payouts now reconcile to actual reported rollover receipts
before their exclusion reaches line 14b. The ordinary 60-day validator is shared
with the 2025 source path; original dates and contribution years remain intact.
The public graph supplies its executed distribution inventory, preventing an
independent substituted statement from producing an exclusion. Owner, payment,
account, statement classification, receipt, complete review and Form 5498-SA
box 4 totals must agree.

The rollover history follows [section 223(f)(5)](https://www.law.cornell.edu/uscode/text/26/223):
the one-year restriction follows distributions received by the beneficiary across
all owned HSAs, including closed accounts. It does not restart on a redeposit or
an account change. Actual prior payout/redeposit references and latest filed
return treatment are retained; a new rollover records its next eligible payout
date. Split redeposits of one payout are combined in source cents, but separate
payouts cannot share that beneficiary's annual exclusion. Spouses remain separate.

The source bridge supports 2026 payouts deposited within 60 days into an
inventoried HSA in 2026 or 2027. January redeposits do not inflate the 2026
Form 5498-SA rollover box. Eligible rollovers neither create a personal deduction
nor consume contribution capacity. They can coexist with qualified IRA funding,
timely excess returns and partial medical/age/disability treatment; the same
payment dollars cannot receive overlapping exclusions or reimbursements. Prior
excess is reduced only by the remaining taxable distribution, preserving the
correct Form 5329 carryforward and additional tax.

The existing owner PDF renderer now prints combined rollover/excess exclusions
and revised taxable income/tax, with unchanged IRA funding and testing records.
Current and cross-year synthetic returns were rendered and inspected, and PDF
text checks independently reconcile the output.

Validation: 507 focused HSA, retirement, IRA, land-tax and PDF tests pass,
including the shared TY2025 HSA regressions. The changed TypeScript files pass
formatting and lint checks, and generated runtime inventories remain current.

Prior-origin payouts received in 2026, Archer MSA sources, in-kind assets,
receiving accounts first opened in 2027, late-rollover relief and failed-rollover
contribution settlement remain explicit source gaps. Direct transfers and
mistake repayments use the separate reconciliation below; their reported
classifications alone cannot establish tax treatment.

## Direct transfers and accepted mistake repayments

The current source route joins actual nonreportable account debits to their
funding-ledger receipts before annual contribution or distribution settlement.
It supports cash transfers between distinct, inventoried HSAs belonging to the
same beneficiary, plus full same-account repayments of mistaken 2026 payouts.
Both sides retain their transaction, account and source references. A matching
amount alone is insufficient: dates, ownership, receipt classification and
complete inventories must agree. Public intake binds the actual executed
distribution inventory; a caller cannot substitute another ledger.

The [current 1099-SA/5498-SA instructions](https://www.irs.gov/instructions/i1099sa)
exclude these transactions from reported distributions and contributions.
Mistake repayments require reasonable-cause evidence, the first date the owner
knew or should have known, a beneficiary representation and custodian acceptance.
The ordinary repayment deadline follows that knowledge year, using the
[section 7503 weekend/holiday rule](https://uscode.house.gov/us/usc/119-118/t26/s7503/)
and [Emancipation Day treatment](https://www.irs.gov/pub/irs-drop/rr-15-13.pdf).
This includes 2026 discovery repaid by April 15, 2027 and timely payments after
2027 discovery; the retained funding ledger still ends in 2027.

Each debit identifies either a custodian review establishing that it was never
reported or its actual original/current 1099-SA correction lineage. For corrected
statements, original gross minus current gross must equal the linked debit sum
in cents, with unchanged distribution classification and excess earnings.
The current copy must follow the transfer or accepted repayment. Intermediate
copies remain evidence without counting the same correction delta twice.

These amounts do not enter Form 8889 line 14a or 14b, reduce prior excess as
taxable distributions, consume rollover capacity, or create deductible
contributions. Ordinary medical/rollover/excess-return calculations still use
the shared source arithmetic. Mixed returns retain their IRA funding and owner
Form 5329 results. These movements create no new Form 8889 or Form 5329 filing
requirement; existing contribution, excess or testing obligations still apply.
Existing draft renderers replay the reconciled source totals.

Validation: 523 focused HSA, retirement, IRA, land-tax and PDF tests pass,
including TY2025 regressions and 15 new source/return tests. Draft PDF text
checks cover both unreported transactions and corrected statements, plus the
absence of unnecessary owner attachments for nonreportable-only activity.

Archer MSA and in-kind transfers, receiving accounts opened after 2026,
prior-year mistaken payouts/amendments, partial or cross-account mistake
repayments, postponed deadlines, and corrections involving additional changes
remain source gaps. Unresolved classifications cannot be silently omitted from
the return or treated as qualified medical reimbursements.

## HSA income and NIIT

The [Form 8960 source classification](FORM8960-GRAPH.md#hsa-source-classification-october-16)
now replaces the above-threshold HSA guard. Actual HSA income remains in MAGI,
with distribution, testing, employer and excess-earnings categories retained.
The investment numerator and allocable expenses exclude these HSA amounts; the
personal HSA deduction is not taken a second time. Single and joint returns,
threshold crossings, payroll inclusions and the state-tax allocation are covered
by source/return tests; draft Form 8960 checks the related Schedule 1 destinations.

## Required source integration

1. Extend the reconciled account/W-2 bridge for employer recoveries, corrected
   distributions and special contribution deadlines; preserve source cents.
2. Extend owner limits for Archer MSA sources, marriage changes, mixed last-month
   spouse choices and remaining allocation branches.
3. Extend distribution/medical workpapers for remaining rollover, direct-transfer
   and mistaken-repayment branches and
   remaining excess/medical branches, including reimbursed DPC fees.
4. Extend prior-year excess, funding and recapture for remaining corrections and
   exceptions using actual contribution years; never relabel historical evidence.
5. Complete native TY2026 MeF, reconcile current authorities and finish the full
   acceptance matrix, including remaining HSA source branches.

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
