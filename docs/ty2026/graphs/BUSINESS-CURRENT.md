# Current TY2026 business, SE and simplified QBI graph

The strict `schedule_c` source claim is connected to `sourceRegistry2026`.
It reuses the shared Schedule C, regular Schedule SE, SE-deduction allocation and
simplified Form 8995 arithmetic. General filer identities and issued W-2s join
inside the 2026 business owner; the shared start router retains its old routing
by default and disables that injection only for this graph. The result reaches
AGI, Schedules 1/2, Additional Medicare tax, deduction selection and draft PDFs.
This remains a development route with `filingReady: false`, not public filing
registration or complete business coverage.

## Implemented boundary

- A strict, retained source inventory identifies each individual proprietor and
  business. It supports domestic, materially participated cash service activities,
  with all investment at risk and no prior suspended losses. Ordinary cash receipts,
  returns and other ordinary income retain dates, descriptions and transaction IDs.
  Received Forms 1099-NEC/MISC/K, inventory/COGS, assets, home offices and special
  income/expense adjustments remain outside this boundary.
- Expenses are dated cash transactions classified by purpose. Only current,
  ordinary business expenses qualify; the review excludes personal, capital,
  owner-benefit, vehicle and employment-credit amounts from ordinary categories.
  Standard qualifying meals are limited before whole-dollar rounding. Part V detail
  feeds line 48/27b once; it is not also deposited in the shared helper's separate
  detail input. The original transaction records remain available for attachment work.
- Each statutory W-2 must name one statutory activity owned by its employee. Its
  box 1 is the activity's receipt source; manual receipts on that activity are
  rejected. Ordinary receipts belong to a separate activity. Duplicate W-2 copies,
  unreconciled same-employer copies and references reused as cash payments fail.
  This component does not replace the existing wage/withholding node.
- One owned vehicle per activity may use standard mileage when placed in service
  before 2026 and eligible under the retained first-year/method review. Dated trips
  distinguish business, commuting and other miles and reconcile to annual odometers.
  June 30 and July 1 use 72.5 and 76 cents respectively, with business parking/tolls
  added once. Vehicle references and VINs cannot be reused across activities.
- Vehicle acquisition-loan interest is allocated by business/total miles, with an
  identified lender, borrower and payment ledger. The result preserves the 2026
  line 16b vehicle amount separately from line 16c other interest. Only the private
  arithmetic projection combines it in the shared helper's old nonmortgage-interest
  field. Personal interest is retained for future reconciliation, not deducted here.
  Other debt and section 163(j) limitation routes remain excluded.
- Schedule C income/loss nets for regular SE **within each owner**, never across
  spouses. Statutory net is excluded from SE; that owner's statutory and ordinary
  W-2 boxes 3/7 still consume the $184,500 Social Security wage base. Actual box 3,
  including zero, is required. The shared regular-method calculation supplies tax
  and its half-tax deduction. No farm/optional method or 2025 optional-method
  constants can enter this schema.

Amounts for each Schedule C line aggregate source cents before rounding. The
2026 caller opts into whole-dollar regular SE net earnings before the $400 test;
$433 profit produces $400 of net earnings and $62 of SE tax. Existing shared
callers retain their prior precision behavior. No optional-method constants enter
this route.

## QBI and deduction selection

Each activity needs a current section 162/199A qualification review, including
statutory employee wages. Each owner's deductible half of regular SE tax is
allocated proportionately over that owner's positive regular profits; statutory
activity receives none. Prior 2025 Form 8995 business and REIT/PTP losses retain
separate source lines and require the same owners and filing unit. The selected
form retains 2027 carryforward amounts on lines 18/19.

The simplified route supports taxable income up to $403,500 MFJ, $201,775 MFS
and $201,750 otherwise. It adds the $400 minimum when aggregate current active
QBI is at least $1,000, including when prior losses eliminate the ordinary
20% deduction. Current REIT/PTP income, cooperatives, released suspended losses,
qualified business tips and adjustments other than the SE deduction remain
explicitly outside this source contract. Above-threshold income requires 8995-A.

For each deduction candidate, QBI taxable income is computed **before section
68**, using unreduced Schedule A and the actual Schedule 1-A amount. QBI is then
used once to compute the section 68 limit. The earlier fixed-point search was
incorrect for 2026 and has been removed. Actual capital sources supply net capital
gain and qualified dividends to the QBI income limit.

## Attachments and remaining boundaries

Schedule C prints two official pages per activity, preserving the 2026 vehicle
interest line and dated mileage. Part V statements retain all source cents and
never count expenses twice. Schedule SE prints the regular-method page for each
owner who needs it. Form 8995 prints all selected lines and a continuation when
more than five businesses exist. Every builder replays retained sources and
matches its Schedule 1/2 and Form 1040 destinations before rendering. Statements
follow official forms; static drafts have no AcroForm or page annotations.

The graph rejects actual Form 4137/8919/CT-2 sources alongside this business claim
until joint SE wage-base reconciliation is implemented. It also rejects a vehicle
present in both Schedule C and Schedule 1-A sources until loan/payment allocation
is connected. Active nontrading business income is excluded from NIIT only after
its source review. Potential Form 461 losses and negative-AGI/NOL cases stop for
their missing owners. EIC and ACTC now consume this inventory through replayed earned-income
worksheets, including signed losses, statutory gross wages and the three-child
payroll method. Dependent care now consumes the same sources before benefit
exclusion and again after AGI, preserving separate spouse earnings and reviewed
monthly allocations for student/disability rules. See the
[care source contract](FORM2441-CURRENT.md#supported-business-earned-income).
Education support and dependent deductions now use distinct earned-income
bridges, including source-reviewed personal services, the material-capital limit,
statutory gross/net differences and the actual half-SE deduction. Child tax now
uses the same sources with its own support and line-1 workpaper; see the
[child-tax scope](FORM8615-CURRENT.md). The guard remains for potential child-tax
returns without the required review.

Next work includes information-return receipts, COGS, depreciation, home office,
other business debt, at-risk/passive losses, benefits, optional SE methods,
8995-A/cooperatives, credit consumers and current MeF/business-rule validation.
The shared auto-expense node still embeds the 2025 70-cent rate; the 2026 adapter
owns the midyear split without changing that node.

The synthetic statutory test reproduces $29,623 receipts less $2,555 expenses
(including 648 pre-July miles rounded to $470), giving $27,068 and no regular SE
tax. It does **not** establish the employer/activity linkage or missing cooperative
facts in [ATS scenario 2](../ats/ATS-SCENARIO-02.md), and is not ATS acceptance.

## Evidence and verification

Authorities checked October 15, 2026:

- [Draft Form 8995 instructions](https://www.irs.gov/pub/irs-dft/i8995--dft.pdf),
  What’s New and lines 11/17; [P.L. 119-21](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm),
  sections 70105 and 70111(b), including the minimum and section 68 exclusion.
  The instructions retain stale line labels; the pinned 2026 form governs the
  line 17 deduction and Form 1040 line 13b handoff.

- [Draft 2026 Schedule C](https://www.irs.gov/pub/irs-dft/f1040sc--dft.pdf),
  lines 16b/16c, 28–31 and 44a–44c.
- [Draft 2026 Schedule SE](https://www.irs.gov/pub/irs-dft/f1040sse--dft.pdf) and
  [instructions](https://www.irs.gov/pub/irs-dft/i1040sse--dft.pdf), regular-method
  lines 2–13 and statutory employee income. Final filing review remains required.
- [IRS Topic 510](https://www.irs.gov/taxtopics/tc510), mileage eligibility and
  separate parking/tolls; [Notice 2026-10](https://www.irs.gov/pub/irs-drop/n-26-10.pdf)
  and [Announcement 2026-11 in IRB 2026-29](https://www.irs.gov/pub/irs-irbs/irb26-29.pdf), the
  two mileage periods.

`business-source.test.ts` exercises ordinary and statutory activity, cash/meal
rounding, Part V duplication, both mileage periods, interest allocation, independent
spouse wage bases, statutory wage-base consumption, losses, source duplication,
ownership mismatches, missing records and explicit unsupported-scope rejection.
Run it with the 2026 suite and shared Schedule C/SE regressions.

`business-qbi.test.ts` adds full-graph settlement, joint ownership/Medicare,
statutory wages, capital limits, prior losses, minimum thresholds and real-source
overlap rejection. `pdf/business.test.ts` reconciles selected destinations and
checks both owners, all overflow records, statutory income and negative amounts.
Run these with all 2026 tests and the shared Schedule C/SE/8995 suites.

Validation: all 692 tests in the 2026 and shared Schedule C/SE/8995 regression
suites passed. Focused typed graph/PDF/router tests and unit verification passed.
The 31-page synthetic business QA PDF was reopened to confirm no annotations or
AcroForm and visually inspected, including joint owners, overflow detail, losses,
statutory wages and the $433 SE threshold case. This is not ATS acceptance.

## Child-tax integration

The reviewed child-tax claim now links the actual Schedule C inventory. It
reuses business gross/net results and the allocated SE deduction while keeping
Form 8615 support earnings and regular/alternate line 1 separate from education
and dependent-deduction amounts. Complete source reconciliation, loss add-backs,
material-capital compensation, statutory wages and three full draft bundles are
covered in [FORM8615-CURRENT.md](FORM8615-CURRENT.md). Remaining business source
limits and final filing gates still apply.
