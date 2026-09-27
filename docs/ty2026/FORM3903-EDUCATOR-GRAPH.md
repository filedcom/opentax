# TY2026 moving expenses and educator deduction graph

Snapshot: September 27, 2026. The [2026 draft Form 3903](corpus/draft/f3903.pdf)
and [draft instructions](corpus/draft/i3903.pdf) are pinned at SHA-256
`589d204b50c9962bf6c69acdf9b95981bb75a83fb9c4bca19e01d0e984b31a8d`
and `65bf15d80c9125c8a99ff651bd373623f4cbd239c606b7f2979d65c56086f29c`.
The [draft Schedule 1](corpus/draft/f1040s1.pdf), [draft Schedule A](corpus/draft/f1040sa.pdf),
and [2026 Publication 505](corpus/authorities/p505--2026.pdf) establish the
receiving lines and the new educator itemized route. Drafts are planning
sources; recheck their final revisions and the selected MeF release.

## One Form 3903 per move

| Source facts | Calculation and filed output |
| --- | --- |
| Claimant, move ID/date, prior and new post, member category, military order/active duty/permanent change of station or intelligence-community assignment requiring relocation, and certification | Verify one of the two 2026 eligibility paths. Preserve spouse/dependent special moves and the last-post time rule. Print the new certification box. Create one Form 3903 per qualifying move, never one aggregated form for several moves. |
| Household goods, packing, transit, storage and insurance, with foreign-move and dates | Form 3903 line 1. Domestic storage is limited to a consecutive 30-day interval after departure and before delivery; foreign workplace moves have the broader storage rule in the instructions. Exclude government-provided services and expenses covered by excludable allowances. |
| Household travelers, actual one-trip transportation/lodging, own-vehicle method, dated miles, parking/tolls | Form 3903 line 2. Exclude meals and house-hunting. Calculate 2026 moving mileage at 20.5¢ through June 30 and 23.5¢ after June 30, or actual gas/oil, plus parking/tolls. Preserve one trip per person even if the family travels separately. |
| Government reimbursement by move and expense, W-2 box 1 and box 12 code P, allowance type | Line 3 is lines 1+2; line 4 is qualifying government reimbursement not already in W-2 wages. Exclude government services, dislocation, temporary-lodging and move-in allowances from line 4 as directed by the instructions. If line 3 exceeds line 4, line 5 goes to Schedule 1 line 14 and AGI. If line 4 exceeds line 3, the excess goes to 1040 line 1h. Reconcile code P rather than treating all employer reimbursement as one offset. |
| Earlier-year foreign move with only current-year storage fees and reimbursement included in W-2 box 1 | Use the instruction's special route: Schedule 1 line 14 and its storage checkbox, without Form 3903. Keep this record distinct from a new move. |
| Form 2555 exclusion | Show full eligible moving expense on Form 3903/Schedule 1, then allocate the part disallowed because it relates to excluded income through Form 2555. Reconcile AGI without deducting that part twice. |

The draft instructions discuss both excluding expenses paid by tax-free
government allowances from lines 1–2 and reporting qualifying government
reimbursements on line 4. Allocate each expense and allowance once, then
reconcile the printed form against the final instructions so no reimbursement
is subtracted twice.

The shared [`f3903` node](../../forms/f1040/nodes/inputs/f3903/index.ts) is
TY2025-only. It filters to an `active_duty_military` boolean, accepts an
unverified `total_expenses`, clamps negative net reimbursement to zero, and
aggregates Schedule 1/AGI. It cannot represent intelligence-community
eligibility, the certification, separate printable moves, W-2 code P, taxable
excess, the storage-only route, Form 2555 allocation, or dated mileage.
Form 3903 has no TY2025 PDF descriptor or MeF serializer in the current
inventories. The [2026 PDF inventory](pdf-fields-f3903.csv) records ten
widgets, all in the field tree: name, SSN, certification `c1_1`, lines 1–4,
the two line-5 choice buttons `c1_2[0/1]`, and line 5 amount. They are on
PDF page 2 because page 1 is the draft cover sheet. Multi-move attachment
rules and the current XSD/attachment decision remain open.
The [public TY2026 MeF inventory](MEF-V1-DRIFT.md#what-the-public-september-24-inventory-already-establishes)
lists `IRS3903` under Schedule 1 line 14 and a maximum of **two** Forms 3903
for a 1040. The printed instructions require one form per qualifying move;
the XSD/rules must resolve any return with more than two moves.

## Educator expenses split across Schedule 1 and Schedule A

[Publication 505](https://www.irs.gov/publications/p505) says that, starting
in 2026, an eligible educator may take a Schedule 1 deduction and then
determine an additional itemized deduction; the qualifying expense types
differ. The draft forms print Schedule 1 line 11 and Schedule A line 17k
(`Deductible educator expenses not reported on Schedule 1`). The current
[IRS educator topic](https://www.irs.gov/taxtopics/tc458) supplies the
900-hour K–12 teacher/instructor/counselor/principal/aide test and $300
per-educator Schedule 1 limit ($600 jointly when both qualify). Final 2026
Schedule A instructions must settle its exact expense categories and
substantiation before implementing the itemized calculation.

Use an owner-keyed expense ledger: educator, school year/hours and role;
date, payee, amount, category and classroom/work purpose; reimbursement,
tax-free education assistance or 529/Coverdell/savings-bond benefit; and
whether the exact expense was assigned to Schedule 1, Schedule A, another
deduction/credit, or excluded. Apply the Schedule 1 cap per educator first.
Only separately eligible, still-unclaimed expenses can enter Schedule A
line 17k; include that line in the [deduction choice and overall itemized
limit](DEDUCTION-GRAPH.md). Reconcile both filed lines and ensure one receipt
is never used twice, including Form 8863 education-credit expenses.

The shared [`educator_expenses` node](../../forms/f1040/nodes/inputs/educator_expenses/index.ts)
assumes eligibility when hours are missing, merges all categories into one
amount, caps only Schedule 1, and has no Schedule A output. It is absent
from the focused TY2026 registry. Add explicit eligibility and expense
facts before registration; preserve TY2025 behavior in the TY2025 registry.

## Build and acceptance

1. Add the move and educator ledgers with evidence/owner keys, 2026-only
   eligibility, duplicate-expense validation and explicit certification.
2. Derive every Form 3903 line per move and the Schedule 1 line 14, storage
   checkbox, Form 1040 line 1h, Form 2555 and AGI handoffs. Derive educator
   Schedule 1 line 11 before any eligible Schedule A line 17k remainder.
3. Use the ten-widget Form 3903 inventory to build multi-form printing, the
   Schedule 1/A/1040 lines and current-MeF serializer or required attachment.
   Map the final instruction revision and exact v4-or-later XSD/business rules.
4. Test military/intelligence eligibility, last-post/dependent/foreign
   moves, 30-day storage, prior-year storage only, June/July mileage,
   government service and allowance exclusions, code P versus W-2 wages,
   positive deduction versus taxable excess, Form 2555 allocation, and
   multiple moves. For educators test one and two qualified owners, missing
   or under-900-hour evidence, mixed categories, reimbursements, the $300
   cap, itemized versus standard choice, overall itemized limit, no duplicate
   8863 claim, printable lines and selected-MeF XML/ATS validation.
