# TY2026 Form 1040 entry point — implementation plan

Status: research snapshot, 2026-09-27, from code commit `2ed64bdd`.
The 2026 code snapshot had a calculation registry for a verified subset;
`f1040_2026` was not registered in `catalog.ts` yet. This plan belongs with
the corpus in `docs/ty2026`; compare code references with the current checkout
before implementing a route. **Goal: the same full
calculation → validation → MeF XML → PDF → ATS/XSD workflow as TY2025, across
the supported 1040 form surface.** Do not call registration alone TY2026
support.
The [instruction availability ledger](INSTRUCTION-COVERAGE.md)
now distinguishes 2026 drafts from draft URLs still serving 2025, so each
remaining route has an explicit source check before coding.
The [parity queue](PARITY-QUEUE.md) orders the remaining
graph, PDF and MeF work against all TY2025 inventories and names the new
2026-only forms that those inventories cannot reveal.
The [product assembly handoff](PRODUCT-ASSEMBLY.md)
names the catalog, input, CLI summary, validation, PDF, MeF and submission
ZIP changes needed to turn those routes into one end-to-end 2026 return.
The [public MeF inventory reconciliation](MEF-V1-DRIFT.md#what-the-public-september-24-inventory-already-establishes)
records published accepted counts and dependency names for Forms 3903/8938,
and the absence of Form 4852 and U.S. RRB source statements from those
workbooks. Current XSD and business rules remain the filing gate.
The [public MeF serializer crosswalk](MEF-PUBLIC-CROSSWALK.md)
maps all 84 TY2025 serializer modules to the published 1040 accepted-form
counts and attachment-name occurrences, with statement and missing-row
review states. Its [descriptor ledger](mef-descriptor-coverage.csv)
records 85 runtime descriptors, including two foreign-wage descriptors
from one module. The crosswalk also names 2026 additions outside the
TY2025 inventory.
The [Form 8962 contract](FORM8962-GRAPH.md) maps the
2026 full-repayment line 27, 400% FPL boundary and Form 1095-A source to
Schedule 2/3, with a 143-widget PDF inventory and current-MeF gate.
The [Form 8960 contract](FORM8960-GRAPH.md) maps
investment-income sources and the §911 MAGI adjustment to 2026 Schedule 2
line 6. Its registered calculator and draft PDF omit printed adjustment,
election and expense fields; current MeF remains to build.
The [Forms 4137/8919 contract](FORM4137-8919-GRAPH.md)
orders unreported-tip and misclassified-wage FICA against one Social
Security wage base. Both 2026 drafts embed instructions; Form 8919's shared
reason codes and Schedule 2 output are stale, and Form 4137's printed
Schedule 2 cross-reference conflicts with the 2026 Schedule 2 draft.
The [Form 8839 contract](FORM8839-GRAPH.md) maps
per-child adoption credit and employer-benefit exclusion, the 1040 line 30
refundable amount, Schedule 3 line 6c and Schedule 3-A interaction. Its
shared calculator is not in the 2026 registry and lacks a full printable
record, 2026 PDF and MeF routes.
The [Forms 8396/8859/8880 contract](FORM8396-8859-8880-GRAPH.md)
maps the mortgage credit's Schedule A reduction and three-year ledger,
the DC credit's carryforward-only route, and 2026 saver-credit eligibility
and contribution/distribution windows. Their draft forms embed instructions;
current graph/PDF/MeF finalization remains to build.
The [Form 7217 contract](FORM7217-GRAPH.md) pins its
current continuous-use form/instructions and the later IRS correction to
K-1 box 19 source codes. It requires one form per property-distribution
date, a reconciled property basis ledger and gain route; TY2026 PDF/MeF
are still absent.
The [Form 8826/8835 and statement contract](FORM8826-8835-STATEMENTS.md)
pins the continuous-use disabled-access form, the still-2025 renewable
electricity form comparator, and the TY2025 farm, foreign-wage, other-tax
and joint-occupancy MeF statements. It records which need 2026 source
refresh, PDF/MeF routes, or should remain TY2025-only.
The [remaining MeF contract](MEF-REMAINDER.md) names
Forms 8911/8978 and Schedules A, including the June 30 refueling-property
cutoff, and gives explicit source/document ownership for the foreign-tax,
fuel, at-risk, vehicle-gift, PFIC, clean-vehicle and 8812 serializers.
The [node boundary audit](NODE-BOUNDARY-AUDIT.md)
assigns the other 85 TY2025 registry inputs and worksheets to 2026 route
owners. It calls out credit nodes that bypass Form 3800 and metadata nodes
with no graph effect, so registry parity does not hide an absent filing path.
The [Forms 5884/6765/8994 contract](FORM5884-6765-8994-GRAPH.md)
pins three business-credit sources and maps the 2026 hire cutoff, research
Section G reporting and paid-leave premium method to Form 3800. Their
shared nodes currently bypass the credit form and lack filed outputs.
The [Form 3468 contract](FORM3468-GRAPH.md) replaces
the flat investment-credit shortcut with per-facility Part I–VII facts,
PFE/bonus/election evidence and distinct Form 3800 rows. Its current
published form is a 2025 comparator, so final 2026 PDF/MeF mapping waits
for the matching release.
The [Form 4255 contract](FORM4255-GRAPH.md) uses that
facility/credit history to calculate recapture, excessive payment/transfer,
PWA and emissions branches. The shared node sends all recapture to old
Schedule 2 line 17a, now the 2026 household-employment-tax line.
The [Form 965-A contract](FORM965A-GRAPH.md) preserves
the outstanding liability and actual payment history and routes the
reporting-year amount to Schedule 2 line 12. The current draft's line 15
addition omits line 12, so the final total requires IRS resolution.
The [Schedule R contract](SCHEDULER-GRAPH.md) maps
the nine age/disability filing choices, the printed credit-limit worksheet,
both PDF pages and Schedule 3 line 6d. The shared node's QSS and mixed-age
joint-return arithmetic does not match the 2026 form.
The [Schedule J contract](SCHEDULEJ-GRAPH.md) maps the
2026 farming/fishing election through three base-year returns and rate
worksheets into Form 1040 line 16. The shared node instead accepts the
answer as input and names the wrong base years.
The [Form 1099-K intake contract](FORM1099K-GRAPH.md)
reconciles gross platform payments to one income activity or personal-sale
route, the 2026 Schedule 1 header, box 1c cash tips/1d occupation code for
Schedule 1-A and box 4 withholding. The shared node uses a filing threshold
as a taxability gate and cannot prevent duplicate business income.
The [1099-MISC/NEC intake contract](FORM1099MISC-NEC-GRAPH.md)
adds their 2026 cash-tip/occupation/overtime source boxes to the same
Schedule 1-A owner while keeping each payment in its existing income
activity. It flags old Schedule 2 keys and synthetic Schedule C activities.
The [Form 1099-G contract](FORM1099G-GRAPH.md)
keeps the registered unemployment/refund/withholding slice and maps the
still-rejected 2026 box 10 family leave, box 8 business refund and farm/CCC
payments to their proper source owners.
The [Forms 1098/1098-E contract](FORM1098-1098E-GRAPH.md)
records the unregistered mortgage node's reported-points error and missing
2026 MIP line 8d, plus the registered student-loan source's eligibility
and old-loan interest gaps.
The [Form 1098-VLI contract](FORM1098VLI-GRAPH.md)
pins the new 2026 lender statement and final regulations. The current
Schedule 1-A calculator/PDF can print a VIN and allowed interest, but the
source intake must establish qualifying debt, original use, assembly,
refund history and business-interest allocation first.
The [Form 3903 and educator contract](FORM3903-EDUCATOR-GRAPH.md)
pins 2026 moving instructions and maps the intelligence-community expansion,
per-move Form 3903, Schedule 1/1040 reimbursement routes and educator
Schedule A line 17k after the capped Schedule 1 deduction.
The [Form 8938 contract](FORM8938-GRAPH.md) pins its
December 2026 disclosure draft and continuous-use instructions. The shared
node currently files nothing; threshold, asset detail, Part III income,
continuation PDF and current MeF output must be built.
The [Form 4852 contract](FORM4852-GRAPH.md) pins the
current substitute W-2/1099-R form and maps its line 7/8 values through
the 2026 wage, retirement, FICA and withholding owners, with printable
explanations and the current MeF filing gate.
The [railroad statement contract](RRB-1099-GRAPH.md)
pins the separate RRB-1099 SSEB and RRB-1099-R pension box maps. The shared
`rrb1099r` node conflates them; signed SSEB benefits and pension basis/
repayments need separate source routes into 1040 lines 6 and 5.
The [Form 1116 contract](FORM1116-GRAPH.md) maps
foreign-tax categories, carryovers, redeterminations and the revised line
18/20 bases from 1040, Schedule 1-A and Schedule 2; its full attachment
and MeF routes are still outside this registry.
The [Form 6781 contract](FORM6781-GRAPH.md) maps
section 1256 accounts, straddle loss deferral, election/carryback facts,
Schedule D/8949 routes, and the 71-widget 2026 form. The shared node,
TY2025 PDF and MeF serializers do not yet cover that filed surface.
The [Form 8615 contract](FORM8615-GRAPH.md) maps
child unearned-income eligibility, parent/sibling tax worksheets and the
child's 1040 line 16. The shared calculator supports only ordinary-rate
cases; its 32 PDF widgets and current MeF route remain to implement.
The alternative [Form 8814 parent election](FORM8814-GRAPH.md)
maps per-child eligibility, dividend/capital-gain allocation and parent
tax/credit effects. Its 26 PDF widgets, source validation and current MeF
route remain outside this registry.
The [Form 8997 contract](FORM8997-GRAPH.md) maps the
2026 end of the legacy QOF deferral, new Part III Section B, reserved Part IV
and post-deferral Part V. The 461-widget draft form and paired Form 8949
routes remain outside this registry.
The [Form 8621 contract](FORM8621-GRAPH.md) maps the
current PFIC/QEF form revision and the 2026 Schedule 2 interest destinations
at lines 19a/b. Its existing shared node uses old line 17p; 151 current PDF
widgets, Part VI elections and current MeF are not yet in this registry.
The [Form 4972 contract](FORM4972-GRAPH.md) maps
qualified lump-sum elections from Form 1099-R to 1040 line 16 box 2.
The 2026 draft embeds its instructions and has 58 inventoried widgets;
the Part II-only ordinary-income remainder, NUA and multiple-recipient
paths still need graph and filing routes.
The [Form 8815 contract](FORM8815-GRAPH.md) maps
Series EE/I savings-bond education interest exclusion through Schedule B
line 3. The shared QSS phaseout and TY2025 PDF fields are wrong for its
2026 draft; 23 widgets and a current MeF route remain to implement.
The [Form 8915-F contract](FORM8915F-GRAPH.md) maps
disaster retirement distributions by FEMA event, owner and account to
1040 lines 4b/5b. The newly pinned 2026 draft has 102 PDF widgets; its
instructions and current MeF package remain to obtain.
The [Form 8915-D source decision](FORM8915D-STATUS.md)
pins the latest 2024 form/instructions and its expired 2019-disaster
repayment period. Older-year amendments remain separate from the 2026
return graph.
The [Form 8912 contract](FORM8912-GRAPH.md) pins the
continuous-use tax-credit bond form, its 218 PDF widgets and the 2026
Schedule 3 line 6k route. Extend carryforward years and Part II credit
limits before its existing TY2025 PDF/MeF code can be considered for 2026.
The [Form 982 contract](FORM982-GRAPH.md) pins the
current cancellation-of-debt exclusion form, its 27 PDF widgets and the
2026 QPRI written-arrangement gate. Per-debt exclusions, required
attachment, Part II attribute reductions and corrected PDF/MeF remain.
The [Form 172/NOL contract](FORM172-NOL-GRAPH.md)
pins the current form/instructions and 109 widgets. It replaces the shared
aggregate NOL shortcut with per-origin-year use and carryforward, required
Form 172 and line-8a statement routes, and the 2026 law/MeF gate.
The [Form 8834 contract](FORM8834-GRAPH.md) pins the
current 2024+ legacy passive vehicle-credit form and 11 PDF widgets.
Form 8582-CR must release its source credit before the 2026 Schedule 3
line 6i and Form 6251 limitation route is finalized.
The [Form 2555 contract](FORM2555-GRAPH.md) maps the
2026 $132,900 exclusion, location-specific housing limits, Schedule 1
lines 8d/24j, SE tax and Form 1116 reductions. The structured shared
filing path is TY2025-only and needs a 2026 form/output route.
The [Form 8936 contract](FORM8936-GRAPH.md) maps the
2025 acquisition cutoff and eligible 2026 service date, dealer transfers,
new/used/commercial credits, 96 PDF fields, and downstream Schedule 2/3
and Form 3800 routes. The shared node rejects 2026 service dates.
The [Form 8889 contract](FORM8889-GRAPH.md) maps
per-beneficiary HSA coverage, contributions, distributions and failed
testing periods into Schedule 1 lines 8f/13 and Schedule 2 lines 13c/13d.
The shared node has incomplete 2026 destinations and PDF/MeF fields.
The [Form 8959 contract](FORM8959-GRAPH.md) maps
separate 2026 wage/RRTA and self-employment Additional Medicare Tax to
Schedule 2 lines 17b and 11, plus withholding to Form 1040 line 25c.
The TY2025 calculator/PDF positions cannot describe that revised form.
The [Form 7206 contract](FORM7206-GRAPH.md) maps
insurance premiums by plan/business, LTC limits, earnings allocations,
Form 2555 and the Form 8962 Marketplace loop into Schedule 1 line 17.
The current aggregate node and PDF descriptor cannot file the 2026 form.
The [Form 8853 contract](FORM8853-GRAPH.md) maps
Archer/Medicare Advantage MSA and LTC amounts to Form 8889, Schedule 1
and Schedule 2, including the 2026 prior-year MSA 50% tax worksheet and
multiple LTC payee statement. Its 38 draft PDF widgets are inventoried.
The [Form 8829 contract](FORM8829-GRAPH.md) maps
home-office expenses and carryforwards by home and Schedule C activity,
with the 2026 SALT iteration, Form 4684/4562 handoffs, QPP election gate
and all 58 draft PDF fields.
The [ATS scenario 12 plan](ATS-SCENARIO-12.md) and
[business credit contract](GENERAL-BUSINESS-CREDIT-GRAPH.md)
map Form 7207 → Form 3800 → Schedule 3 and Form 7205/7220 → Schedule C.
These routes and their PDF/MeF attachments are not yet registered in 2026;
the packet's transfer and tax-base conflicts must be resolved before a
return can be used as an accepted fixture.

The dedicated 2026 Schedule H node now calculates Part I and FUTA Section A,
routes household employment tax to Schedule 2 line 17a, and has a two-page
draft PDF attachment. Its ATS line 9 No case reconciles $627 through Form
1040 line 23. Section B, payroll-to-form wage derivation, and MeF remain open;
see [the Schedule H contract](SCHEDULEH-GRAPH.md).
The [Schedule E contract](SCHEDULEE-GRAPH.md) maps the
pinned 2026 form and instructions to the existing property and K-1 nodes.
It identifies new line 13a vehicle-loan interest, the three-page Part I–V
attachment, downstream passive/at-risk/interest limits, and ATS scenarios 3
and 6. Schedule E is not registered in the TY2026 graph yet.
The [ATS scenario 6 plan](ATS-SCENARIO-06.md) adds the
partnership Part II acceptance case. It also exposes a stale shared W-2G box
contract and missing 2026 Schedule 1 gambling line 8b route, while W-2 code
TT and the dependent standard deduction need source-backed reconciliation.
The [ATS scenario 2 plan](ATS-SCENARIO-02.md) adds a
statutory employee W-2 → Schedule C route without double counting W-2 box 1
on Form 1040, and a deduction-choice/attachment conflict for Schedule A and
Form 8283. It also exercises 2026 pre-July mileage and the EIC opt-out.
The [Schedule C implementation contract](SCHEDULEC-GRAPH.md)
pins the 109-widget draft PDF map and describes the new 16b/16c interest
split, 44a–44c vehicle labels, and per-activity statutory income ownership.
The [ATS scenario 5 plan](ATS-SCENARIO-05.md) adds a
Form 8888 split-refund route after 2026 settlement. The shared input is
metadata-only and still includes obsolete savings-bond fields; no 2026
Form 8888 PDF or MeF serializer is registered yet.
The [ATS scenario 4 plan](ATS-SCENARIO-04.md) maps its
W-2, Form 2441, Form 8862, Form 8863, Schedule EIC/8812, and Schedule 3-A
pages. The [credit graph contract](FORM8862-8863-EIC-GRAPH.md)
specifies the recertification facts and 2026 credit order. These EIC/8862/8863
nodes and attachments are not in the TY2026 registry; the packet also lacks
the institution EIN and completed Form 8862 selections needed to file.
The [Schedule F contract](SCHEDULEF-GRAPH.md) maps the
cash/accrual farm route and its attached forms. Its shared TY2025 input names
other interest as line 21b; the 2026 form uses that line for vehicle-loan
interest and moves other interest to 21c. The TY2026 route awaits a distinct
input/output shape, complete PDF, current MeF map, and ATS scenario 3 check.
The new [Form 4562-B contract](FORM4562B-GRAPH.md)
uses the pinned 2026 draft to map amortization cost rows, prior-year assets,
activity destinations, and PDF/MeF work. Its 2026 instructions remain a
source gate before the amortization calculation can be implemented.
The [Form 4562 contract](FORM4562-GRAPH.md) maps the
return-wide section 179 election to asset/activity ledgers, the 2026 bonus
and QPP rules, Part V listed property, correct source-schedule destinations,
and all 271 draft PDF widgets. The shared node's old Schedule 1 line 13
depreciation output conflicts with the 2026 HSA line; 2026 instructions and
current MeF remain acceptance gates.
The [Form 461 contract](FORM461-GRAPH.md) maps all
2026 source and adjustment lines, the $256,000/$512,000 thresholds, return-wide
loss aggregation, Schedule 1 line 8p and origin-year NOL carryover. Its shared
node accepts precomputed per-source excesses, so it cannot yet file the
18-widget form or correctly net multiple businesses.
The [Form 8582 contract](FORM8582-GRAPH.md) maps the
2026 passive-loss worksheet, special rental allowance, activity and
reporting-form allocations, and 205 PDF widgets. The shared aggregate
carryforward and all-MFS exclusion cannot cover its full filed surface;
current instructions and MeF are still needed.
The [Form 6198 contract](FORM6198-GRAPH.md) uses the
current November 2025 continuous-use form and instructions to map basis,
financing, recapture and per-item allowed losses before Form 8582 and 461.
Its 34 PDF widgets and activity-linked MeF instances remain to implement.
The [Form 4684 contract](FORM4684-GRAPH.md) maps
2026 disaster and casualty events through the personal and business sections,
then into Schedule A/Form 4797 and activity limits. The 162-widget PDF,
current instructions and 2026 MeF instances remain to implement.
The [Form 4797 contract](FORM4797-GRAPH.md) maps
per-asset business dispositions, recapture and §1231 history, including
the Form 4684 feedback and 2026 line changes. Its 188 PDF widgets and
current MeF/validation routes remain to implement.
The [Form 6252 contract](FORM6252-GRAPH.md) maps
installment sales across years, related-party deemed receipts and recapture
into Form 4797/Schedule D. Its 49 PDF widgets and current MeF route remain
to implement; embedded draft instructions have stale Form 4797 references.
The [Form 8824 contract](FORM8824-GRAPH.md) maps
§1031 multi-property exchanges and deferred replacement basis, two-year
related-party reporting, recapture and §1043 sales. Its 68 PDF widgets and
current MeF/validation routes remain to implement.
The [Form 8990 contract](FORM8990-GRAPH.md) maps
the 2026 $32 million small-business test, ATI and source-level interest
allocation, including pass-through Schedule A/B and CFC branches. Its
138 PDF widgets and current MeF/validation routes remain to implement.
The [Form 4952 contract](FORM4952-GRAPH.md) maps
investment-interest limits and the capital-gain election through Schedule
A, Form 6198, Schedule D tax and AMT. Its 17 PDF widgets and current
MeF/validation routes remain to implement.
The [Form 4835 contract](FORM4835-GRAPH.md) and
[ATS scenario 3 plan](ATS-SCENARIO-03.md) connect
production-based farm rent to Schedule E while keeping Schedule F farm profit
separate for the elected Schedule SE farm optional method. That packet also
requires 1099-R, Schedule D, and QBI/cooperative reconciliation.
The [QBI/cooperative contract](QBI-COOPERATIVE-GRAPH.md)
pins the continuous-use 1099-PATR source, 2026 Form 8995-A and its schedules.
It identifies incorrect shared box labels and the missing patron reduction,
section 199A(g), $400 minimum, PDF, and MeF routes. ATS scenario 3 has a
patron answer but lacks the cooperative statement needed to calculate them.
The [Schedule SE contract](SCHEDULESE-GRAPH.md) maps the
owner-level source and optional-method rules, every 2026 PDF field, and the
MeF refresh gate. In particular, the current Schedule F output suppresses
low-profit/loss optional-method cases and the TY2025 PDF filler maps its first
money field to what is the 2026 name field.
`credit-resolution.ts` computes Schedule 8812 Worksheet B through line 14
and 2026 Form 5695 lines 1–4 in the required order. The registered graph
receives tax, dependent, AGI, Schedule 2, and Schedule 3 amounts.
The registered `credit_resolution` node now receives the pre-5695 Schedule 3
amounts and sends their totals to Form 1040 and Schedule 8812. Schedule 3
line 5a can no longer be injected into that upstream node. The `f5695` input
now routes the 2025 line 16 carryforward to this stage. One `f8812_facts`
input supplies earned-income worksheet evidence and other credit facts to
both provisional and final Schedule 8812. Graph and PDF tests cover a
dependent with Worksheet B and Form 5695. MeF attachment and broader
credit-source routing remain open.

The first executable 2026 calculation is `settlement.ts`: it assembles 1040
lines 24a–c and 32a–c, Schedule 3-A Part I/II, payments, refund, and amount
owed from upstream figures. Its source-backed tests cover the Form 1062 amount,
Schedule 2 offset, and Schedule 3-A election/eligibility decisions. It still
needs to be connected to the TY2026 node graph and serializers.
`deductions.ts` now computes 1040 lines 12e–15, including the nonitemizer
charitable cap. The shared Form 8962 node has explicit 2026 percentage,
repayment, affordability, and FPL paths, with boundary tests. These pieces
still require final output wiring and instruction reconciliation.
The shared Form 2441 calculations now select explicit TY2026 employer benefit
limits and credit rates. The TY2026 registry now separates taxable benefits
before AGI from the credit after calculated AGI and income tax; W-2 box 10,
Form 1040 line 1e, Schedule 3 line 2, and the Form 1040 credit total pass
focused graph checks. The draft PDF builder fills one printed page for a
credit-only return and two for an employee-benefit return, reconciling lines
11/26 to Schedule 3/Form 1040. A fourth or later provider/person goes on a
continuation page; the three highest amounts remain on the IRS form. The
Form 2441 filing input is not on the public start surface. Provider
eligibility, prior-year expenses, self-employed benefits, MeF, and ATS remain
to build.
The [Form 2441 contract](FORM2441-GRAPH.md) uses the
pinned draft instructions to specify provider/benefit facts, the pre-AGI
benefit stage, post-AGI credit stage, and the full attachment work.
The `forms/f1040/nodes/config/2026-indexed.ts` module contains all 111 TY2026
config members, including the distinct MFS QBI threshold and standard/enhanced
SIMPLE plan limits. `forms/f1040/nodes/config/2026.ts` registers the complete
config for shared nodes; the TY2026 registry is an audited subset and still
needs the remaining source and form routes.
`nodes/f1040.ts` is a dedicated 2026 core output node: it computes the revised
deduction, tax, payment, and balance lines and emits Schedule 3-A data. It is
registered in the TY2026 calculation graph. Expand its upstream input surface and preserve
the 2025 credit-finalization behavior where 2026 law and forms still require it.
Its output now distinguishes AGI 11a/11b, withholding sources 25a–25d,
EIC checkboxes 27b/27c, refund 35a, applied estimates 36, and penalty 38.
`itemized-deductions.ts` computes the 2026 charitable floor and overall
itemized limitation from already allowable contribution and deduction amounts.
The Schedule A node and carryforward accounting remain to implement.
`schedule-a.ts` now assembles the revised Schedule A totals from those already
allowed source amounts, including SALT phaseout and both new limits. It is not
graph-wired. [`DEDUCTION-GRAPH.md`](DEDUCTION-GRAPH.md)
specifies the joint Schedule A/QBI resolution required before full itemizer
support; the two calculations can depend on each other.
`nodes/standard_deduction.ts` is the dedicated 2026 deduction-choice node. It
uses 2026 standard-deduction amounts, sends the same total income and adjustments
to the 1040 node, and routes taxable income plus draft 2026 Form 6251 lines 1b
and 2a to the shared income-tax calculator. A focused graph test now executes
deduction choice → tax → 1040. Several income, Schedule A, and QBI routes
still need to be wired into the 2026 graph.
The shared Schedule 1-A calculation now emits 2026 form lines 15, 27, 36,
43, and 44; it passes lines 43 and 44 to the 2026 deduction node. The AGI
node adds back Form 2555 exclusions for its 2026 MAGI. Puerto Rico/Form 4563
addbacks remain to implement. W-2 box 12 TP/TT now supplies employee tip and
overtime facts, with an end-to-end calculation-graph test. Form 4137 line 1(c)
now joins W-2 TP by filer and employer; Schedule 1-A takes the larger amount
per employer. Mixed occupations require an explicit qualified amount. The
focused graph also carries unreported tip income and Schedule 2 tip tax to
1040. The 2026 final node explicitly rejects nonzero Schedule 2 credit-limit
tax until its credit finalization path is built. The full product remains to
register in `catalog.ts`.
The shared AGI aggregator now emits a TY2026 income/adjustment pair to this
node while retaining its TY2025 output contract. A graph test runs income
facts → AGI → deduction choice → tax → 1040 and checks Social Security and
Schedule 1 income pass-through. The rest of the 2026 input graph is pending.
The shared W-2 input now reaches that focused graph: two W-2 records produce
1040 wages, AGI, taxable income, income tax, withholding, and refund. This is
an executable calculation slice, not the registered 2026 product; other
income lines and the filing outputs remain to be completed.
The shared general input reaches the 2026 graph with dependent details.
`identity.ts` defines the 2026 Form 1040 filer fields from that input. The
dedicated 2026 Schedule 8812 node now finalizes CTC/ACTC in the calculation
graph using the 2026 worksheet and verified earned income where needed. The
PDF builder prints the changed dependent table, a continuation for more than
four dependents, and the two-page Schedule 8812 when its credit lines apply.
One W-2/CTC return runs through the graph and PDF bundle. The dedicated
2026 Schedule 3 node now routes W-2 excess Social Security withholding to
Form 1040 line 31 and sends its credit-line amounts to Schedule 8812 for
worksheet reconciliation. Its draft PDF prints the new line 13e and keeps
reserved line 5b blank. Other credit sources, MeF, and the broader dependent
credit cases remain open.
`schedule2.ts` now calculates the draft 2026 Schedule 2 subtotals with filed
line numbers, and `nodes/schedule2.ts` routes its totals into the focused 1040
graph. The [Schedule 2 and 8812 map](SCHEDULE2-8812.md)
lists the remaining source splits and Part II-B dependency. Form 4137 tip tax
and W-2 box 12 A/B/M/N and K are routed; code Z requires its separate 409A
tax and interest calculation. Schedule 8812's `part_iib_2026` input now uses
Schedule 2 lines 16c and 17c and checks them against amounts calculated in
the graph. The 2026 Credit Limit Worksheet A uses its draft-instruction
Schedule 3 line list and rejects the TY2025 worksheet shape. Worksheet B
sums its four Schedule 3 credit lines. The graph reconciles worksheet wages
with W-2 wages and passes calculated Schedule 3 credit lines to final
Schedule 8812; other earned-income sources still need routing.
`inputs.ts`, `start.ts`, and `registry.ts` now define the first dedicated
TY2026 calculation entry point. It executes wages-only and W-2/Form 4137 tip
returns through the normal graph planner and executor. It is limited to nodes
whose TY2026 routes have been checked and is not a registered CLI product or
an export path yet. The generic start-node factory lives in
`forms/f1040/start.ts`, shared by both tax years.
`pdf/forms/f1040.ts` maps the current 1040 output fields to the pinned draft
AcroForm, including revised tax/payment lines and the new work-authorization
answers. `pdf/f1040.ts` fills the two printed pages from a calculated pending
1040; its wages-only sample was rendered and visually checked. The later
`pdf/core.ts` bundle now adds the supported dependent rows and attachments;
the remaining TY2025 form surface still needs TY2026 PDF output.
`pdf/schedule3a.ts` now renders the new one-page schedule with a static
overlay because the draft's 16 widgets are absent from its AcroForm tree. Its
line reconciliation, election checks, and rendered placement are verified.
`pdf/core.ts` now appends it when a relevant refundable credit is filed and
reconciles its main amounts to the 1040. The combined three-page PDF passed
visual QA; the remaining supported forms still need PDF output.
The final 1040 node and draft PDF descriptor also retain and print the
principal income amounts through 7a, including aggregate 1z wages,
accumulated dividends, and printed 7a capital gain. A populated income page
passed visual QA. Additional source nodes and supporting schedules remain.
The generated [graph route inventory](GRAPH-ROUTES.md)
lists 33 declared edges from active nodes to targets outside this registry;
the wages-only run deposits values in 12 absent target slots. It gives the
dependency order for expanding beyond the current calculation slice.
Form 8960 is registered and sends TY2026 NIIT to the draft Schedule 2 line 6;
the shared node retains its TY2025 line 12 route.
Form 6251 is registered and sends TY2026 AMT to Schedule 2 line 2 and then
1040 line 17. A focused ISO-adjustment graph test verifies its draft 2026
exemption/rate arithmetic. `pdf/schedule2.ts` and `pdf/f6251.ts` now fill
the pinned draft attachments, and `pdf/core.ts` requires/reconciles them
when the 1040 reports their tax. The [field map](PDF-SCHEDULE2-6251-MAP.md)
records missing print detail. Public ISO input, other source routes,
credit-limit feedback, and MeF remain open.
The [interest graph contract](INTEREST-GRAPH.md) uses
the pinned 2026 Schedule B instructions to map every 1099-INT branch and the
filing decision before that source is exposed as a TY2026 input. Box 2 now
reaches AGI as well as Schedule 1 in the shared source node.
`nodes/schedule1.ts` maps that penalty and AGI-adjusted student-loan
interest to the 2026 printed lines. It rejects identified legacy source
keys whose old names would print the wrong line. `pdf/schedule1.ts` fills
the two printed draft pages and reconciles lines 10/26 to Form 1040 lines
8/10; the core PDF builder takes a named attachment object. The
[Schedule 1 contract](SCHEDULE1-GRAPH.md) records the
remaining source and print-detail work.
Form 1098-E is a registered TY2026 input. The AGI calculation applies its
2026 phaseout before Schedule 1 line 21 and Form 1040 line 10 are printed.
The dedicated `ssa1099` input distinguishes SSA-1099 box 6 from RRB-1099
box 10 withholding. Net benefits reach Form 1040 line 6a, the AGI taxability
worksheet computes line 6b, and the PDF prints both. Negative aggregate net
benefits require a repayment-deduction route before filing; see the
[SSA benefits contract](SSA-BENEFITS-GRAPH.md).
Final 2026 Form 1099-R and instructions are pinned. A dedicated `f1099r`
input uses boxes 7a–7d and 8a/8b and routes normal, fully taxable IRA and
pension distributions to AGI and the printed 1040. Other codes and special
accounts fail explicitly until their linked forms are built. Code 1 can
route the full 10% early-distribution tax to Schedule 2 line 5 when the
taxpayer supplies the full-tax and SIMPLE-period facts; see the
[1099-R contract](FORM1099R-GRAPH.md). Form 1040 line
25b sums withholding from multiple 1099 sources in the active graph.
Single-code G pension-plan direct rollovers now retain separate gross and
taxable totals, reach AGI and Form 1040 lines 5a/5b, and mark draft line
5c(1) in the PDF. IRA and other rollover variants remain in the 1099-R
contract.
Normal code 7 pensions with a payer-determined taxable box 2a below the
gross box 1 now use the same separate totals without the rollover box.
The [Form 8606 contract](FORM8606-GRAPH.md) uses the
newly pinned 2026 instructions to specify the owner-wide IRA basis inputs,
calculation order, PDF, and MeF work that remains before IRA basis or Roth
conversion cases can enter this registry.
An early SIMPLE IRA distribution in its first two years uses a dedicated
Form 5329 Part I node at 25%, with its three printed draft pages attached
to the return PDF. The [Form 5329 contract](FORM5329-GRAPH.md)
records the implemented branch and the remaining parts, spouse handling,
and MeF work.
The dedicated TY2026 Form 1099-DIV input now routes ordinary, qualified,
and exempt-interest dividends, federal withholding, private-activity-bond
AMT interest, plain box 2a capital gain distributions, and NIIT income. Its
Schedule B filing path
reconciles with Form 1040 line 3b and the draft PDF. The continuous-use
[source and branch map](DIVIDEND-GRAPH.md) records the
special-rate capital-gain, QBI, foreign-tax, state, and basis routes still
to implement; nonzero inputs on those routes fail before calculation.
The shared Schedule D node now decides when box 2a can print directly on
1040 line 7a with line 7b checked. The public `schedule_d` input requires
carryover amounts and QOF/other-capital-activity answers for this decision.
It also asks whether Form 4952 will be filed. The 2026 PDF bundle appends two
Schedule D pages for the carryover-plus-distribution case and reconciles their
totals with 1040 line 7a. Other source forms and Form 8949 transactions remain
explicit PDF blockers until their details are built.
The dedicated `nodes/schedule_b.ts` is registered and now consumes gross
interest with labeled adjustments, reconciles its lines, determines the
modeled filing and Part III triggers, and sends taxable interest through AGI
and Form 8960. A temporary graph test reaches 1040 from a 1099-INT source.
The [PDF field map](PDF-SCHEDULEB-MAP.md) records all
72 draft widgets. `pdf/schedule_b.ts` fills the printed page and appends
continuations; `pdf/core.ts` attaches it to the 1040 and checks the line
totals. The public input and MeF attachment remain open.
The shared Form 8839 node now applies TY2026 adoption limits, emits the
refundable per-child credit to 1040 line 30, and tracks nonrefundable
carryforwards by origin year. Its full credit-limit worksheet and TY2026
serializers remain open.
CLI node inspection and graph commands accept `--year` and will select the
TY2026 registry once this product is registered.
The shared `auto_expense` and Form 2106 paths now apply the two 2026 business
mileage rates using reconciled half-year miles. Form 8621 excess distributions
use the return year for event dates and prior-year allocations.

## Graph and output contract

The engine builds a graph from each node's declared output edges. Its executor
merges upstream fields into a pending record keyed by node type, then calls
the final `f1040` node once. The TY2025 `f1040` node accepts a broad upstream
field set and also finalizes several credit worksheets. The new TY2026 node
currently accepts final amounts only; placing it in the 2025 registry would
discard the upstream detail needed to reproduce the existing credit paths.

Expand the 2026 `inputs.ts` and `registry.ts` explicitly. For each shared node,
confirm its TY2026 computation and output fields before adding it. Expand the
TY2026 `f1040` input schema to accept those fields, retain the still-applicable
credit finalizations, and map them to the revised 2026 line layout. Keep the
Schedule 3-A inputs upstream of `f1040`; the final node can emit the completed
Schedule 3-A record without creating a graph cycle. Check the execution plan
for cycles and run one wages-only 2026 return before catalog registration.

The source corpus and provenance are in [`docs/ty2026`](README.md).
Its raw IRS draft forms, ATS scenarios, and authorities are committed; the
e-Services IMF package remains under ignored `.state/research/docs` because the
repository is public. The Drive folder contains `IMF_05-28-2026_Release-2.zip`
(SHA-256 `8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4`),
with `1040x_Schema_2026v1.0.zip` and `1040_Business_Rules_2026v1.0.csv`.
IRS lists **2026v4.0** as the newer package on 2026-09-24. v1 is for research
and cannot be the final validation target.
The [v1 drift review](MEF-V1-DRIFT.md) confirms that its
1040 XSD predates the draft form's 12f, 24a–c, 32a–c, Schedule 3-A, and
work-authorization topology. Do not serialize TY2026 from those v1 fields.

## Build contract

1. Audit the registered `forms/f1040/nodes/config/2026.ts` against every
   shared node that consumes it. The [source map](CONSTANTS.md)
   records the values and conditional rules; config registration alone does not
   make a shared node TY2026 correct.
2. Audit every shared node listed in
   [`node-coverage.csv`](node-coverage.csv), using
   [`year-literals.csv`](year-literals.csv) to find
   literal-driven paths. A year literal
   that changes behavior must use `ctx.taxYear` or a year-specific node;
   comments alone still need source review. The highest-risk files are
   `general`, `f8835`, `f8936`, `form5695`, `form8962`, `form_8829`,
   `schedule_h`, `f8997`, and the final `f1040` output node.
3. Implement the changed TY2026 1040 domain lines and routes before export:
   12f nonitemizer charitable deduction; line 13a Schedule 1-A and 13b QBI;
   24a/24b/24c including Form 1062; 32a/32b/32c and Schedule 3-A; and
   refund/amount-due comparisons against 24c. The
   [form delta](FORM-DELTA.md) records the draft evidence.
4. Define `forms/f1040/2026/{config,inputs,start,registry,index}.ts` and add
   `"f1040:2026"` to `catalog.ts` only when an end-to-end return can execute
   without TY2025 assumptions. Reuse a shared node only after its TY2026
   behavior has been verified. Keep TY2025 registry and outputs pinned.
5. Create `forms/f1040/2026/mef` from the selected TY2026 XSD, including
   document order, field maps, attachments, and return version. Use the
   [binary attachment handoff](MEF-BINARY-ATTACHMENTS.md)
   for generated and caller-supplied PDFs; the TY2025 Form 5695 QMID statement
   has no place in the pinned 2026 draft's carryforward-only form. Create
   `forms/f1040/2026/pdf` from the final 2026 AcroForms. Add year-specific
   business rules and field registry to `FormDefinition` so `tax validate` and
   export select the same year's artifacts as calculation.
6. Build complete TY2026 fixtures from each relevant IRS ATS PDF. Keep source
   facts distinct from computed amounts and record contradictions. Validate
   synthetic and source-backed XML against the current TY2026 XSD; test
   field-by-field PDF output; run old TY2025 cases as regression evidence.

## Release gates

| Gate | Evidence required |
| --- | --- |
| Calculation | Every 2026 config field sourced; no 2025 behavior leaking into active paths; independent 2026 cases cover changed deductions, credits, and tax lines. |
| Output | Every supported 2025 MeF/PDF component is classified as updated, unchanged with verified 2026 source, replaced, or deliberately unsupported with a diagnostic. The CSV inventories enumerate the current surface. |
| Validation | Selected 2026 schema and business-rule version is recorded; emitted XML passes that XSD and relevant reject rules, including new Schedule 3-A and Form 1062 flows. |
| End to end | CLI create/add/get/validate/export works on TY2026 returns; complete IRS ATS scenario fixtures have expected outputs and valid attachments. |
| Regression | TY2025 stays bound to its own rules, schema, PDF mappings, and constants; its tests and benchmark remain green. |

The executable work order and file targets are in
[`IMPLEMENTATION.md`](IMPLEMENTATION.md). No compatibility
shim or 2025 fallback is planned. If implementation later needs one, announce
its behavior and rationale before adding it, per `AGENTS.md`.
