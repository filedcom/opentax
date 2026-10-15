# Current TY2026 business source calculator

`forms/f1040/2026/inputs/business-source.ts` now reuses the shared Schedule C
gross-income, expense and net-profit helpers and the regular Schedule SE
calculator. It is a development component, **not yet an input in
`sourceRegistry2026`**, a complete return, a PDF producer or a filing registration.
This increment does not change TY2025 calculators or the original worktree.

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
shared regular SE helper retains intermediate net-earnings precision and rounds
its tax lines; its threshold and eventual printed-line rounding must be reconciled
when the Schedule SE PDF/MeF owner is added. Source amounts and calculated totals
must remain within safe numeric ranges. Final allowed QBI is deliberately absent.

## Reuse and next integration

The current shared Schedule C node already checks `statutory_w2_sources` against
one matching activity and its entered receipts. The older
[Schedule C plan](SCHEDULEC-GRAPH.md) described an earlier implementation that did
not consume those sources. The new adapter goes further by deriving statutory
receipts from the linked W-2 rather than accepting a second receipt total.

Likewise, the current shared `auto_expense` code still embeds the 2025 70-cent
rate. The historical constants ledger's assertion that its 2026 split was already
implemented does not describe this branch. This component implements the split
directly; broader auto-expense/Form 2106 reuse still requires a year-aware adapter.

Before public graph registration:

1. Reconcile these retained sources against the actual general/W-2 inventory,
   preserve normal wage and withholding routing, and order Schedule C/SE before AGI.
2. Build QBI source classification, carryovers, owner deduction allocation and
   Form 8995/8995-A calculations, including the new minimum deduction, inside the
   existing joint deduction resolver. Cooperative patron activity requires its own
   evidence and cannot be assumed to have zero QBI.
3. Connect SE earnings to Additional Medicare tax, care, EIC, ACTC, education
   support/earned income and dependent deductions. Review business loss limits,
   AMT, NIIT and Schedule 1-A loan/tip allocations before accepting full returns.
4. Expand information-return receipt reconciliation, COGS, business debt, vehicle
   methods, depreciation, home office, at-risk/passive losses, benefits and other
   business sources with their owners. Build Schedule C/SE/QBI PDF and MeF from
   the same reconciled results, using current schemas and business rules.

The synthetic statutory test reproduces $29,623 receipts less $2,555 expenses
(including 648 pre-July miles rounded to $470), giving $27,068 and no regular SE
tax. It does **not** establish the employer/activity linkage or missing cooperative
facts in [ATS scenario 2](../ats/ATS-SCENARIO-02.md), and is not ATS acceptance.

## Evidence and verification

Authorities checked October 15, 2026:

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

Validation for this increment: 633 regression tests passed across the 2026 and
shared Schedule C/SE suites; the final typed business suite passed all 13 tests.
The unit verification task, changed-file lint and whitespace checks also passed.
