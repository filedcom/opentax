# TY2025 Form 8995-A coverage gap

Status: the source-reconciled patron Schedule D route below passed local public
return tests, full TY2025 v5.4 XSD, and filled-PDF review on 2026-10-06. The
previously recorded WOTC route remains locally proven. Historical sections below
retain their original staging status. Broader Form 8995-A coverage, IRS business
rules and ATS remain open.

## MFJ primary-owned patron plus spouse wages (2026-10-06, locally proven)

The actual patron source route now supports MFJ with a primary-owned active cash
Schedule C or Schedule F, one specified cooperative and sourced ordinary spouse
W-2 income. The existing public W-2 copies are joined to the reviewed
`spouse_w2_sources` on `qbi_patron`; employee SSN, payer identity, copy reference,
amounts and the retained review must agree. The source verifies the primary
business owner against General/Form 1040 and the cooperative recipient, and
verifies every reviewed wage copy against the actual joint spouse. Both owner
identities and final native header ownership are required.

The [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) require
the self-employed spouse's name and a separate Schedule SE for each spouse with
self-employment income. The existing single-SE W-2 output previously included
all return Social Security wages. In this reviewed patron route it now selects
only wages belonging to the actual business owner. The fixture spouse's 176,100
of Social Security wages therefore does not reduce the primary proprietor's
Social Security wage base. Spouse wages still enter joint income and reduce the
joint Additional Medicare Tax threshold; the replay independently checks that
tax using the 250,000 MFJ threshold and the actual SE income. General W-2/SE
owner allocation outside this patron source route remains a broader audit scope.

The [Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) specify
394,600/494,600 for joint phase-in thresholds. The parent now uses that threshold
and the 100,000 range, while the qualified-payment Schedule D reduction and
box 6 taxable-income cap retain their source allocations. The owned C health
plan remains attributable to the primary proprietor: monthly records explicitly
review both spouses' lack of eligibility for subsidized employer health coverage.
A spouse W-2 does not become the primary's business wages or earned income under
the owned plan.

| Joint source case | Raw spouse wages | Raw / filed AGI | Pre-QBI taxable income | Phase-in percent | Half-SE deduction | Health | Schedule D reduction | Box 6 claim | QBI deduction | Total tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Farm | 230,000.49 | 455,867.49 / 455,867 | 424,367 | 29.767% | 14,132 | 0 | 13,552 | 10,000 | 37,105 | 108,716 |
| C health | 230,000.49 | 474,531.49 / 474,531 | 443,031 | 48.431% | 14,467 | 6,000 | 15,720 | 10,000 | 34,030 | 115,962 |
| Farm income cap | 230,000.49 | 470,665.49 / 470,665 | 439,165 | 44.565% | 14,333 | 0 | 5,001 | 415,255 | 439,165 | 30,604 |

The cap source retains 6,000,000.49 of actual cooperative distributions and
qualified payments, cent-valued farm expenses, and a written notice for box 6
of 540,000. The raw book profit remains 254,999.49; the filed leaf
projection yields 254,998. The raw Form 1040 taxable-income calculation retains approximately
0.49; its finalized whole-dollar line is zero and the complete filed equations
agree. The other raw books, W-2s and written notices remain unchanged by filing
rounding. Joint common forms show both names, while C/F, SE and Form 7206 show
the primary owner. Fractional percentages use the shared PDF percentage helper.

`form8995a_patron_joint.test.ts` proves three complete public source returns and
five actual source wage boundaries at 394,600, 394,601, 494,599, 494,600 and
494,601, with full TY2025 v5.4 XSD and PDF export for all eight. It rejects 56
mutated source/return cases in both exporters, including valid opposite-owner
SSNs, detached copies, reviews, SE wage offsets, health owner and final joins.
An additional complete public graph substitutes the valid primary owner in both
public and reviewed spouse W-2 copies; both exporters reject the resulting
wrong-owner route. The four focused tests are typed; the related 11-file
regression run passes 178 tests, including W-2, original Single patron, owned
health, joint SSTB and aggregation coverage.

The reusable `joint-form8995a-patron-farm`, `joint-form8995a-patron-c-health` and
`joint-form8995a-patron-income-cap` fixtures have three complete packets with
46 pages. Every page was rendered and visually reviewed; the read-only replay
confirms the complete checklist, hashes and full schema. Ignored artifacts:
`.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-patron-joint`, with the
rendered pages in the adjacent `-rendered` directory. Logs:
`/tmp/opentax-patron-joint-focus-final-oct6.log`,
`/tmp/opentax-patron-joint-regression-oct6.log` and
`/tmp/opentax-patron-joint-selected-oct6.log`. Actual proof base is
`5abcfba2b` plus the shared joint-name/SSTB/percentage commit `6dfb374a1`
(cherry-picked locally as `81f3ba4d9`); this extension makes no builder or SSTB
source changes.

Spouse-owned patron businesses, both spouses self-employed, primary W-2/retirement
combinations, other filing statuses, multiple businesses/cooperatives,
loss/property/credit/capital combinations and farm health-plan allocation remain
open. The broad parent, general owner allocation/rounding audits, source-byte
authentication, IRS business rules and ATS are not closed.

## Ordinary noncommunity MFS SSTB source extension (2026-10-06)

The public MFS accounting SSTB route now replaces the initial Colorado-only
review with `mfsSstbFilingReviewSchema`. It retains independent full-year
permanent-home domicile records for both spouses, a marital property/trust/election
review record, primary separate business/wage earnings records, and the actual
spouse deduction record. Explicit confirmations establish no elected community
property regime and no current or retained community income. Mailing state is
recorded separately and reconciled to actual General and the native/PDF filer;
it does not determine either spouse's domicile. Actual spouse TIN, primary
owner, MFS status and explicit false spouse-itemizing facts remain joined.

[IRS Publication 555](https://www.irs.gov/publications/p555) identifies nine
mandatory community-property states and explains that domicile follows the
permanent-home facts and intent, including each spouse's domicile. It excludes
the federal treatment of elected Alaska/Tennessee/South Dakota regimes from its
scope. Accordingly, all nine community states reject for either spouse, and
AK/TN/SD require the same explicit no-election/property and separate-income
review records. Elected regimes, retained community income and midyear domicile
changes are outside this source route; no Form8958 allocation is claimed.

Four registered actual public returns cover NY taxpayer/NJ spouse, AK, TN and
SD. They retain the original issued W2/business sources and the source→SE→AGI→
ScheduleA/parent→1040 chain: AGI238050, pre-QBI222300, applicable50%, QBI2652,
taxable219648, total49112, refund888. A separate positive test retains reviewed
AK domiciles while using an actual Seattle WA mailing address/header, proving
that mail alone neither establishes nor overrides domicile.

Typed focus passes8/8 and related node/native/PDF regression passes165/165.
Thirty new synchronized source and header mutations reject native and PDF,
covering each mandatory community state for each spouse, property/election/
separate-income/full-year contradictions, missing records, missing no-election
reviews in AK/TN/SD, and a conflicting actual filer mailing state. Existing MFS
owner/status/spouse deduction and public missing-review/wrong-owner negatives
remain. Four complete returns pass the full local2025v5.4 XSD; all60 packet pages
were rendered and visually reviewed. Registered source replay and the read-only
checklist/template/artifact hash/XSD checker pass.

Proof base `b056c59ae`; ignored artifact directory
`.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-noncommunity`, with
adjacent `-rendered` contacts. Logs: `/tmp/opentax-sstb-noncommunity-focus.log`,
`/tmp/opentax-sstb-noncommunity-regression.log`,
`/tmp/opentax-sstb-noncommunity-selected.log`. The original Colorado proof below
is historical; its fixture now supplies the broader explicit review records.
Community allocations, elected regimes, foreign/midyear domiciles, spouse-owned
businesses, broader adjustments, IRS business rules and ATS remain open.

## Public MFS primary-owned accounting SSTB (2026-10-06, locally proven)

The existing source-owned accounting route now permits a
married-filing-separately return with an explicit
`qbi_sstb_filing_review.mfs_filing_review`: full-year Colorado domicile records,
spouse SSN, and a spouse deduction record confirming that the spouse does not
itemize. The actual retained General Colorado address, spouse TIN and explicit
false spouse-itemizing fact must agree with Form 1040; retained parent and
Schedule A source copies, primary owner and filed SE deduction remain
reconciled. This is a separate noncommunity-property return, not a claim that
community income can be assigned entirely to a proprietor.

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
require zero standard deduction if the MFS spouse itemizes.
[Publication 555](https://www.irs.gov/publications/p555) lists the
community-property states; Colorado is outside that list. The
[2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) use the
nonjoint 197,300 threshold and 50,000 phase-in range. The
[2025 Form 8959 instructions](https://www.irs.gov/instructions/i8959) use the
MFS 125,000 Additional Medicare threshold.

Registered `mfs-primary-form8995a-accounting-sstb-phasein` executes actual
public General, issued primary W2 and Schedule C sources. Receipts38,431 less
payroll10,000 produce profit28,431; filed SE761/half381 yield QBI28,050 and
AGI238,050. Standard deduction15,750 yields pre-QBI taxable222,300 and 50%
applicability. Schedule A applicable QBI14,025/wages5,000 and parent phased
reduction153 yield QBI deduction2,652, taxable219,648 and income tax47,350.
Additional Medicare1,001 plus SE761 produce other taxes1,762, total tax49,112
and refund888 on withholding50,000.

Typed focused source tests pass6/6. Native/PDF negatives reject missing or
contradictory domicile/spouse deduction records, wrong owner, status, spouse
TIN, SE wage base, final QBI/tax and Medicare status, including synchronously
changed retained source copies. Related schema/calculation/native/PDF regression
passes 165/165. The selected registered return passes the complete local TY2025
v5.4 XSD and deterministic source replay; all15 PDF pages were rendered and
visually reviewed, and the read-only checklist/hash/XSD checker passes.

Proof base `8c20e4dfc`; ignored packet under
`.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-mfs`, with
adjacent `-rendered` contacts. Logs: `/tmp/opentax-sstb-mfs-focus-final.log`,
`/tmp/opentax-sstb-mfs-regression.log`, `/tmp/opentax-sstb-mfs-selected.log`.
Other MFS domiciles, community-property allocations, spouse-owned SSTBs,
additional businesses/adjustments, IRS business rules and ATS remain open.

## Patron wage-limit phase-in (2026-10-06, locally proven)

The actual public patron source route now includes the Single 197,300–247,300
middle band. The [2025 IRS instructions](https://www.irs.gov/instructions/i8995a)
require Part III only when taxable income is more than 197,300 but not more
than 247,300 and line 10 is less than line 3. The retained C/F profit,
Schedule SE deduction and actual owned C health plan determine the finalized
pre-QBI taxable income. The calculator computes the wage-limit difference,
multiplies it by the exact excess-income/50,000 ratio, rounds the dollar
reduction, and transfers the result through line 12 to line 13. Schedule D's
qualified-payment reduction then reduces line 14/15; the cooperative box 6
pass-through is separately capped on line 38 after line 37.

Four registered source fixtures retain actual cent-valued issued copies and
books. Their complete calculation, native parent/companion XML and filled PDF
share the same finalized dollar amounts. The PDF percentage uses a text
projection to preserve fractional digits instead of the monetary formatter's
whole-dollar rounding. Native `PhaseInPct` retains the ratio to five decimal
places. Part III is absent from native XML and blank in the PDF when wages do
not bind, even inside the income band.

| Source case | Filed profit | Half-SE deduction | Health | Pre-QBI taxable income | Phase-in percentage | Part III reduction | Schedule D reduction | Filed box 6 claim | QBI deduction | Total tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Phase farm | 239,999 | 14,132 | 0 | 210,117 | 25.634% | 3,889 | 13,552 | 10,000 | 37,732 | 62,678 |
| Phase C health | 264,998 | 14,467 | 6,000 | 228,781 | 62.962% | 11,903 | 15,720 | 10,000 | 31,283 | 69,598 |
| Phase income cap | 254,998 | 14,333 | 0 | 224,915 | 55.23% | 23,822 | 5,001 | 205,605 | 224,915 | 28,984 |
| Phase nonbinding wages | 249,999 | 14,266 | 0 | 219,983 | Inapplicable | Inapplicable | 11,787 | 10,000 | 45,360 | 63,566 |

The cap fixture retains box 6 of 270,000 and qualified payments of
3,000,000.49; its filed claim is 205,605 and taxable income is zero. It proves
the 50%-of-qualified-wages Schedule D branch; the other phase-in cases prove
the 9%-of-qualified-QBI branch. The original raw receipt proportions and
source cents remain retained, with the prior leaf/subtotal filing chain intact.

`form8995a_patron_phasein.test.ts` adds four source-positive full returns and
five public-source boundary returns at 197,300, 197,301, 247,299, 247,300 and
247,301. It covers a reduction rounding to zero immediately above the lower
threshold and a ratio of one at the upper boundary. Each return passes full
TY2025 v5.4 XSD and complete PDF export. Thirty-six phase-in source/return
mutations reject in both native and PDF export, covering detached percentage
operands, wage/QBI allocations, notices, identities, SE deductions, companion
sources and final AGI/deduction/tax joins. Together with the original patron
suite, five typed tests pass; the six-file related regression suite passes 53
tests, including aggregation and SSTB source routes.

The four reusable held-review fixtures have `phase-farm`, `phase-c-health`,
`phase-income-cap` and `phase-unbound` suffixes. All 61 pages were rendered,
visually reviewed and passed the selected read-only checklist/hash/full-XSD
replay. Ignored artifacts are at
`.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-patron-phasein`, with
rendered pages in the adjacent `-rendered` directory. Logs:
`/tmp/opentax-patron-phase-focus-final-oct6.log`,
`/tmp/opentax-patron-phase-regression-final-oct6.log`, and
`/tmp/opentax-patron-phase-selected-oct6.log`.

This completes the missing middle band for this same one-owned-positive-cash-
business, one-cooperative, zero-UBIA Single patron source route. Multiple
businesses/cooperatives or owners, other filing statuses, loss/carryforward,
SSTB/property/credit combinations, additional capital/investment income,
retirement plans and farm health-policy allocation remain open. Broader parent
coverage, return-wide rounding audit, source-byte authentication, IRS business
rules and ATS remain open.

## Owned cooperative patron source route (2026-10-06, locally proven)

Public `qbi_patron` input joins one actual owned cash Schedule C or Schedule F
to one issued Form 1099-PATR, including boxes 6, 7 and 13. The retained review
identifies the business, payer, issued-copy reference, employee W-2 records and
SSA filing references, payroll records, allocation workpaper and reviewer. A
positive box 6 requires a matching written-notice review identifying the owner,
amount and notice. Export replays the issued copy, included taxable cooperative
income, business books, actual adjustments and final return amounts.

The reviewed qualified-receipts proportion allocates both adjusted business QBI
and eligible wages. It is accepted only with the facts-and-circumstances,
consistent-books and complete-qualified-payment assertions: it is not an
unconditional allocation prescribed for every patron. See the
[section 199A cooperative regulations](https://www.irs.gov/irb/2021-06_IRB).
Actual Schedule SE deductions reduce QBI; the Schedule C health case also
replays the owned policy and monthly premium records through Form 7206. There is
no invented deduction used to produce the fixture's QBI.

The [Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) require
patrons to use Form 8995-A, including below the threshold. Schedule D uses the
lesser of 9% of allocable QBI and 50% of allocable W-2 wages; its line 6 reduces
parent line 14. The
[Form 1099-PATR instructions](https://www.irs.gov/instructions/i1099ptr) require
the cooperative's written notice for the box 6 pass-through and explain the
9%-of-qualified-payments limit. The retained source checks that limit; the filed
parent also limits line 38 to line 33 minus line 37, as required by the
[2025 form](https://www.irs.gov/pub/irs-prior/f8995a--2025.pdf).

### Filed arithmetic and retained cents

The original issued copies and books remain cent-valued. The patron filing
projection rounds monetary leaf lines and derives business income, expenses and
profit from those filed operands. That profit flows unchanged into Schedule 1,
Schedule SE, the owned Form 7206 plan, QBI, native XML and printed forms.
[Form 1040 rounding instructions](https://www.irs.gov/instructions/i1040gi)
require consistent whole-dollar rounding and adding sources before rounding a
single line;
[Schedule F line 34 instructions](https://www.irs.gov/instructions/i1040sf)
require line 9 minus line 33 and carrying that profit to Schedule 1 and Schedule
SE. Independently rounding raw profit previously produced a one-dollar filed
subtraction mismatch for these actual cent-valued books. This bounded projection
repairs that chain without replacing the source amounts. The broader return-wide
rounding and reconciliation audit remains open.

| Source case                | Raw book profit | Filed gross | Filed expenses | Filed profit | SE deduction | Health deduction | QBI deduction | Total tax |
| -------------------------- | --------------: | ----------: | -------------: | -----------: | -----------: | ---------------: | ------------: | --------: |
| Farm                       |      399,999.99 |     500,000 |        100,001 |      399,999 |       16,275 |                0 |        46,187 |   116,247 |
| Owned C health             |      349,999.99 |     500,000 |        150,001 |      349,999 |       15,605 |            6,000 |        42,268 |    96,497 |
| Below-threshold income cap |       50,000.49 |     500,000 |        450,001 |       49,999 |        3,533 |                0 |        30,716 |     7,065 |

The cap case retains box 6 of 45,000 but claims 25,605 after the ordinary QBI
component of 5,111, leaving taxable income zero. Above-threshold fixtures retain
box 6 of 10,000.49 and file 10,000. The original books' receipts proportion
remains retained; percentage filing lines use finalized whole-dollar amounts.

### Evidence and remaining scope

`form8995a_patron_positive.test.ts` passes two tests covering three complete
public source returns, three full-schema validations and complete PDFs. Its 35
source/return mutations each reject in native and PDF export, including detached
copies and identities, payroll, allocation/notice reviews, SE, health, Schedule
1, parent/Schedule D, AGI, deductions and final tax. The related 16-file
regression run passes 311 tests. The focus test is type checked; extracting
Schedule F's pure model removes an import cycle while retaining its existing
public exports.

Three held-review fixtures are registered: `single-form8995a-patron-farm`,
`single-form8995a-patron-c-health`, and `single-form8995a-patron-income-cap`.
They are explicit synthetic reviewed source examples, not evidence of
issued-copy byte authentication. All 44 packet pages were rendered and visually
checked, including business arithmetic, Schedule SE, applicable Medicare fields,
Form 7206, parent and Schedule D, owner identity, page order and legibility.
Ignored proof packet:
`.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-patron-final-v2`;
rendered pages are in the adjacent `-rendered` directory. Logs:
`/tmp/opentax-patron-focus-final-v2-oct6.log`,
`/tmp/opentax-patron-regression-v2-oct6.log`, and
`/tmp/opentax-patron-selected-final-oct6.log`. The source-only held plan now has
199 fixtures covering 90 of 113 registered PDF keys; Schedule D is covered.

This route supports one positive, active, primary-owned cash business and one
specified cooperative, a single filer across the threshold and phase-in
range, eligible reviewed wages and zero UBIA. Multiple
businesses/cooperatives or owners, losses/carryforwards, SSTB, property limits,
employment credits/home office, additional income/capital combinations, owned
retirement plans and a farm health-policy allocation remain open. IRS business
rules, ATS and source-byte authentication remain acceptance gates.

## One above-phase-in business plus one REIT dividend (2026-10-01, unrun)

One single filer fully above the phase-in range can combine one identified
positive non-SSTB business with exactly one directly issued, reviewed Form
1099-DIV box 5 REIT dividend of at most $1,500. The payer, document reference,
and 91-day holding review remain attached to the source. Calculation now
reconciles Form 8995-A lines 28-32 and line 39; native and PDF export compare
the issued copy with Form 1040 lines 3b and 13. A full-return positive case and
source/return tamper fixtures are authored for the deferred bulk run. The
one-business attestation is now `no_ptp_or_loss_carryforward_confirmed` so a
source with a REIT dividend does not also assert no REIT amount. This is a
direct schema change, without a second accepted field shape. Multiple REIT
copies, PTP income, capital-gain and qualified-dividend mixes, source-byte
authentication, filled output, XSD, business rules, and ATS remain open.

Unsupported broader Schedule A/B/C and broader Schedule D triggers reject at the
Form 8995-A node **before** any Form 1040/standard-deduction output is produced.
This is a source-local filing boundary, not whole-form Schedule A-D coverage.
Focused rejection cases were written but not run.

## Schema and form check

The checked-in TY2025 v5.4 `Shared/IRS8995A/IRS8995A.xsd` begins with zero or
more `QBIDeductionInformationGrp` rows. Each row has a required trade or
business/person name, specified-service and aggregation indicators, and a
required EIN, SSN, or missing-EIN reason. Its line 2
`QualifiedBusinessIncomeAmt`, line 4 `AllocableShareW2WagesAmt`, and line 7
`AllocableShareUBIAQlfyPropAmt` are nested _inside that business row_. The
top-level form then carries line 16 and lines 21-40, including
`TaxableIncomeBeforeQBIDedAmt` (line 33), `NetCapitalGainAmt` (line 34), and
`QualifiedBusinessIncomeDedAmt` (line 39).

The former 11 flat fields in `forms/f1040/2025/mef/forms/f8995a.ts` were
removed. The new descriptor emits a native business row followed by ordered Part
IV fields for one explicitly identified business. It rejects the old
aggregate-only payload rather than treating it as another API shape.

The [2025 Form 8995-A](https://www.irs.gov/pub/irs-pdf/f8995a.pdf) requires one
Part I and Part II column per trade, business, or aggregation. Its
[instructions](https://www.irs.gov/pub/irs-pdf/i8995a.pdf) also require
Schedules A, B, C, and/or D when specified-service, aggregation, loss netting,
or agricultural-patron facts apply. Taxpayers below the 2025 threshold normally
use Form 8995 instead of 8995-A.

## Source and calculation blockers

1. The node now retains a `form8995a` pending record whenever QBI activity is
   present, even when its deduction is zero. The bounded descriptor requires a
   sourced business name and EIN, explicit per-business QBI, W-2 wages, and UBIA
   matching the aggregate calculator inputs, confirmation that this is the only
   non-SSTB non-patron business and that taxable income is the return-wide
   pre-QBI amount, and a single filer fully above the wage-limit phase-in range.
   It computes row lines 2-15 and top-level lines 16 and 28-40, skipping Part
   III as the printed form directs above the range. It reconciles line 39 to
   Form 1040 line 13 and rejects simultaneous Form 8995 pending.
2. The broader calculator still aggregates non-SSTB QBI, SSTB QBI, wages, UBIA,
   and carryforwards. The BAN aggregation input now forwards its groups to Form
   8995-A so the Schedule B guard sees and rejects the election instead of
   silently dropping it. It lists group and business names but not the amounts,
   tax IDs, or eligibility evidence required for XML rows and Schedule B.
   Schedule E's separate `qbi_aggregation_number` now also rejects at source
   instead of being ignored. Forwarding and rejection cases are written but
   unrun.
3. A bounded one-identified-SSTB Schedule A route now retains a source-attested
   business row in the single-filer phase-in range; independent source-document
   authentication and wider SSTB/PTP configurations remain open. A bounded
   two-business current-loss Schedule C ledger is now sourced from two distinct
   Schedule C items; prior QBI loss and REIT/PTP loss inputs remain aggregates
   without the required historical provenance. A bounded patron-reduction
   Schedule D route now exists, but nonzero section 199A(g) DPAD, multiple
   cooperatives, and filled-PDF verification remain open.
4. The 2025 printed line 34 is net capital gain _increased by qualified
   dividends_. The input `net_capital_gain` is not documented as that combined
   amount, so using it unadjusted could overstate the income limitation. The
   node also does not prove Form 8995-A rather than the simpler Form 8995 is
   required in every direct-call case.
5. Focused node and serializer cases now assert a native row, final-line
   calculation, and missing-identity, alternate-schedule, and reconciliation
   failures. They are written but unrun. The shared MeF builder still has three
   old aggregate-only Form 8995-A fixtures for central reconciliation. No flat
   fallback or silent Form 8995/8995-A selection is provided.

## Smallest safe rebuild boundary

The written base slice uses one identified non-SSTB, non-aggregated trade or
business above the entire phase-in range, with no prior loss, REIT/PTP,
agricultural patron, or pass-through special items. It requires explicit zero
net capital gain and confirmation of zero qualified dividends, so line 34 is not
guessed from the older ambiguous aggregate input. The parent PDF now has a
bounded descriptor; verify its filled values in the deferred visual batch. A
separate bounded one-cooperative Schedule D route is described below. Broader
SSTB, aggregation, prior-loss and other current-loss netting, and patron paths
need their own schedule models and attachments before filing.

## Required Schedule A-D boundary

The checked-in TY2025 v5.4 schema has distinct `IRS8995AScheduleA`, `B`, `C`,
and `D` roots. Schedules A/B/C/D are registered in `ALL_MEF_FORMS` for bounded
routes below, with native and PDF descriptors. Filled appearance is unverified.
The [2025 IRS instructions](https://www.irs.gov/instructions/i8995a) require
Schedule A for an SSTB within the taxable-income phase-in range, B for an
aggregation election, C for a current qualified business loss or prior QBI loss
carryforward, and D for a specified agricultural/horticultural cooperative
patron claiming a QBI deduction from that business. Outside the bounded one-SSTB
Schedule A route, the node rejects nonzero SSTB QBI, wages, or UBIA, including a
fully phased-out SSTB in a mixed return, rather than silently omitting an
identified business. A prior REIT/PTP loss alone is not the Schedule C trigger;
it remains separately unsupported by the bounded native route.

| Schedule | Source-local guard                                                                                     | Needed for a supported filing route                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A        | SSTB outside the bounded one-business single-filer phase-in source                                     | Public accounting source now has complete local XSD and 15-page visual/replay proof. Other SSTB/PTP rows, wider owners and source authentication remain open.                                                                                                                                                                                                                                                                                                                                    |
| B        | Aggregation outside one group of two sourced Schedule C businesses                                     | The bounded route requires ownership, tax-year, operational-factor, election-continuity, reviewed QBI-allocation, member tax ID, source and parent joins. Broader groups and RPE statements remain unsupported. The BAN input alone retains only names and a boolean.                                                                                                                                                                   |
| C        | Current qualified business loss outside the bounded two-business route, or prior QBI loss carryforward | One positive and one negative identified Schedule C business can now net a small positive current QBI with no unused loss, but wider activities, zero/negative net, and prior carryforward still reject. The scalar prior loss lacks filed-return and suspended-loss provenance. Preserve each business, proportionally allocate losses, and carry remaining line 6 forward. Even a zero parent deduction does not excuse the schedule. |
| D        | Affirmative `patron_of_specified_cooperative` without the bounded source                               | Multi-cooperative allocations and nonzero section 199A(g) DPAD remain open; the bounded PDF descriptor still needs filled-page verification.                                                                                                                                                                                                                                                                                            |

`patron_of_specified_cooperative` is a direct optional fact on the Form 8995-A
input. `true` now requires the bounded source object and companion document;
omission is **not** a no-patron attestation. The business filing details retain
an explicit no-aggregation confirmation. No alternate shape, alias, or fallback
was added.

The former Form 8995-A PDF descriptor mapped eleven aggregate calculator inputs
without an identified business row or final-return reconciliation and was
guarded. Subsequent build passes replaced it with bounded parent and Schedules
A/C/D descriptors, using calculated line values and source, companion, and Form
1040 line 13 checks. Direct projection and builder cases are written but unrun.
The old aggregate map was not retained as a fallback. Filled-page inspection and
any triggered Schedule B or wider Schedule C pages remain open.

The bounded route must pass the agreed single full calculation/test batch,
TY2025 local XSD and PDF checks, IRS business rules, and ATS acceptance before
coverage is claimed.

## Historical build-first Schedule A SSTB route (staged evidence)

One identified SSTB for a single filer inside the 2025 taxable-income phase-in
range now produces a separate registered `IRS8995AScheduleA` native document.
The same one-business route also accepts a married-filing-jointly return inside
the $394,600–$494,600 phase-in range. It calculates the joint $100,000 range
from the 2025 configuration, projects the threshold and range in the parent and
Schedule A native/PDF documents, and requires the native parent status to match
the final return header. Positive, boundary, and status-mismatch fixtures are
authored but unrun. The [2025 IRS instructions](https://www.irs.gov/instructions/i8995a)
specify those joint thresholds and Schedule A requirement.
One head-of-household return is also admitted under the instructions' "all other
returns" $197,300–$247,300 phase-in range. The parent and Schedule A native
builders both require the head-of-household return header; the same source,
deduction, native attachment, and PDF calculations apply. Positive, boundary,
status-mismatch, and still-unsupported qualifying-surviving-spouse fixtures
are authored but unrun. QSS remains closed pending its return-boundary review.
One qualifying-surviving-spouse return with an identified SSTB also uses the
2025 $197,300–$247,300 nonjoint Schedule A phase-in. The calculator retains
the same single-business, source-attested QBI/W-2/UBIA and zero-other-item
limits; both native documents require a qualifying-surviving-spouse return
header, and both PDF instances reject a different final filer status. The
parent and companion line calculations, Form 1040 line 13 deduction, native
XML, PDF projection, and wrong-status cases are authored for the deferred
batch. The general return's underlying surviving-spouse eligibility evidence
and the issued business-source bytes remain separate validation gates. The
[2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a)
place all returns other than joint in the $197,300 threshold and $50,000
phase-in range.

An MFS return with one taxpayer-owned SSTB now uses the same nonjoint phase-in
only when the SSTB filing details identify the primary taxpayer by SSN, name a
separate-return QBI/W-2/UBIA allocation workpaper, and affirm that no spouse
share is claimed. Both native documents compare that owner and MFS status with
the final return header; both PDF descriptors check them at rendering. Their
projected lines still reconcile to the matching parent/companion and Form 1040
line 13. Positive, omitted-reference, owner-tamper, and status-tamper fixtures
are authored but unrun. The allocation workpaper and upstream business source
bytes are not authenticated, and spouse-share or multiple-business variants
remain unsupported. The [2025 IRS instructions](https://www.irs.gov/instructions/i8995a)
place MFS in the $197,300–$247,300 "all other returns" range.
Its attested business identity and QBI, W-2 wage, and UBIA amounts must match
the parent source. The calculated applicable percentage and phased-in wage limit
reconcile to the parent Form 8995-A and Form 1040 line 13a. A bounded
official-field PDF descriptor for the companion and parent is registered. This
excludes multiple businesses, PTPs, patron, aggregation, gain, REIT/PTP
loss, and prior-loss combinations. The asserted business source has not been
independently authenticated. Focused cases are written but unrun; local XSD,
filled-PDF inspection, IRS business rules, and ATS acceptance remain open.

The same one-SSTB Schedule A source now admits the narrow case in which the
applicable W-2 wage limit is at least 20% of applicable QBI. Schedule A is
still required within the income phase-in range under the
[2025 IRS instructions](https://www.irs.gov/instructions/i8995a). Form 8995-A
Part III therefore shows zero excess and zero phase-in reduction on lines 19
and 25, and carries the full applicable 20% QBI amount on line 26. The native
parent writes all three values; parent and companion PDFs project the same
amounts. For this branch, both exporters also reconcile Form 1040 AGI,
deductions, QBI deduction, and taxable income to the source's pre-QBI taxable
income. A single-filer, one-SSTB positive case with $100,000 QBI and $40,000
W-2 wages and source/companion/final-return tamper cases are authored but
unrun. The K-1 statement is identified by a reviewed source reference; its
issued bytes and the upstream income source are not authenticated by this
bounded route. The bulk test, XSD, filled-PDF, and IRS acceptance gates remain.

## Build-first Schedule C current-loss route (written, unrun)

### Deferred cents boundary (2026-10-02)

The issue #60 fix accepts cents in a single Schedule C business on the
simplified Form 8995 route. It does not yet cover the advanced Form 8995-A
Schedule C loss route. A direct node probe with taxable income of $250,000,
one identified business at $1,000.25 QBI, and a second at −$100.10 QBI
produces a $900.15 aggregate from Form 8995, then Form 8995-A rejects both
business rows with `Expected integer, received float` at
`schedule_c_qbi_businesses[*].qbi`. This is a rejected return, not an accepted
wrong deduction. The bounded Form 8995-A Schedule C source schema requires
whole-dollar QBI for each business, and its native/PDF route compares those
rows with retained Schedule C net profit and final-return amounts. Resolve
the per-business whole-dollar filing and source-reconciliation rule before
admitting cents on this route; do not round the aggregate or each row without
that review. The four focused issue #60 suites for CLI entry, node inspection,
Form 7206, and simplified Form 8995 passed 93/93 tests separately; they do
not exercise this advanced loss case.

One identified Schedule C business with a current qualified loss now also
files the bounded parent Form 8995-A and Schedule C companion without a
positive offsetting business. Its single source row must match the retained
Schedule C net loss, material participation, at-risk classification, zero
W-2 wages/UBIA, and the final Schedule 1 business loss. Schedule C line 3 and
line 6 retain the entire loss, parent line 39 and Form 1040 line 13 are zero,
and the graph records that amount as an in-memory next-year QBI loss
carryforward. Native MeF prints the one loss row; PDF leaves its second row
empty. The [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a)
require Schedule C for a current qualified business loss and send line 6 to
the next tax year. A $1,200 loss full-return/native/PDF fixture and altered
business, Schedule 1, companion, and final-deduction fixtures are written but
unrun. Importing the loss into a later filing still needs accepted-return
provenance; prior suspended losses, SSTBs, other activities, and nonzero
business-level QBI adjustments remain guarded.

One single filer above the full 2025 wage-limit phase-in with exactly two
distinct, identified Schedule C businesses can now produce a registered
`IRS8995AScheduleC`. One business has positive QBI and one has negative QBI; the
loss nets against the positive amount with a small positive whole-dollar
deduction and no unused line 6 loss. Each business name, EIN, reference, W-2
wages, UBIA, material participation, at-risk and no-other-adjustment facts must
match its Schedule C source item. The route excludes prior or suspended losses,
SSTB, aggregation, patron, net capital gain, REIT/PTP, other business and
negative-business wage/UBIA variants. The native companion and bounded PDF map
reconcile their rows and final deduction with parent Form 8995-A and Form 1040
line 13. That initial slice has no unused current loss or prior-year loss
carryforward. Focused cases are written but unrun, and source authentication, full
XSD, filled-PDF, IRS-rule and ATS gates remain open.

The same two identified Schedule C business route now also retains a current
$200 net QBI loss: $1,000 of positive QBI is fully absorbed by a $1,200
qualified loss. Schedule C (Form 8995-A) line 5 uses $1,000 and line 6 records
the remaining $200 as a positive loss magnitude for next year's carryforward.
The parent's adjusted QBI, W-2 wages, UBIA, and line 39 deduction are zero, as
the [2025 instructions](https://www.irs.gov/instructions/i8995a) direct when
loss netting leaves no positive QBI for that business. The graph retains the
$200 in its in-memory carryforwards while Form 1040 line 13 is zero. A
full-return fixture links two source Schedule C items to parent and companion
native/PDF documents and rejects changed business, companion, or final-return
figures. This does not authenticate source bytes, durably store the loss, or
import it in 2026. Cases are written but unrun pending the bulk validation
gate.

The two-business Schedule C filing guard now also joins both retained Schedule
C net results to filed Schedule 1 line 3 and joins Schedule 1 line 10 to Form
1040 line 8. Its QBI deduction also reconciles Form 1040 line 13, and line
15 plus lines 13a and 13b must equal the sourced taxable income before QBI.
Because this narrow QBI route sets each business's QBI equal to
its Schedule C net profit, it requires zero filed Schedule 1 lines 15–17 for
deductible self-employment tax, qualified retirement contributions, and
self-employed health insurance. Those deductions would otherwise reduce QBI
and need a separately sourced allocation. Parent and Schedule C native and
PDF projections share the check; positive and unused-current-loss fixtures
now include changed business income, adjustment, and Form 1040 income and
taxable-income cases.
The [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a)
direct current business losses through Schedule C (Form 8995-A), while
[2025 Schedule 1](https://www.irs.gov/pub/irs-prior/f1040s1--2025.pdf)
places Schedule C business income on line 3. Cases remain unrun for the bulk
validation gate.

## Build-first Schedule D patron route (written, unrun)

One non-SSTB business, one specified cooperative, and a nonzero patron reduction
now have a distinct registered `IRS8995AScheduleD` native descriptor. The
canonical Form 8995-A input carries an actual TY2025 Form 1099-PATR item using
the existing source schema. That item must identify its payer, have box 13
checked, positive box 7 qualified payments, and zero box 6 section 199A(g)
deduction. Its QBI and W-2 wage allocations need a confirmed business-record
worksheet with a nonempty reference, reviewer, and review date and cannot exceed
the identified business amounts. The worksheet bytes are not attached or
independently verified by this native builder. A retained `f1099patr` source
record must contain the same item; missing, multiple, or different cooperative
sources reject at MeF build. The two distinct pending records must match;
missing/changed Schedule D rejects the parent, and missing/changed parent
rejects Schedule D.

For this fully-above-phase-in single filer, Schedule D lines 3 and 5 are 9% of
allocable QBI and 50% of allocable W-2 wages. Line 6 is their lesser amount.
Form 8995-A line 14 uses that line 6, line 15 subtracts it from line 13 (not
below zero), and line 39 must equal Form 1040 line 13. The route requires a
positive whole-dollar reduction and excludes SSTB, aggregation, loss, REIT/PTP,
capital-gain and qualified-dividend variants. The nonzero cooperative section
199A(g) deduction has the bounded route below. No old box-name alias or fallback exists.

### One reviewed cooperative box 6 pass-through (2026-10-01, unrun)

The same one-business/one-specified-cooperative Schedule D route now accepts a
positive Form 1099-PATR box 6 section 199A(g) deduction when the retained
source item names the primary recipient TIN and a reviewed cooperative written-notice
reference confirms that recipient and amount. Box 7 and the reviewed QBI/W-2
allocation still calculate Schedule D line 6 and parent line 14. Parent line
38 then imports the exact box 6 amount, provided it does not exceed 9% of box
7 qualified payments or line 33 less line 37; line 39 and Form 1040 line 13a add it to the limited QBI
component. Native Form 8995-A, Schedule D, and both PDF projections use that
single retained source; parent and companion reject a changed recipient,
source item, missing notice, or return amount. The [2025 Form 1099-PATR](https://www.irs.gov/pub/irs-prior/f1099ptr--2025.pdf)
requires the cooperative to designate box 6 in a written notice, and the
[2025 Form 8995-A](https://www.irs.gov/pub/irs-prior/f8995a--2025.pdf)
caps line 38 at line 33 less line 37. The [2025 Form 1099-PATR instructions](https://www.irs.gov/instructions/i1099ptr)
also cap box 6 at 9% of box 7. The exact $5,400 boundary on $60,000 of
qualified payments and a $5,401 rejection join the existing $2,000 positive,
source, owner, notice, and return tamper cases for the bulk pass.
Issued-copy and written-notice bytes, multiple cooperatives, excess box 6
carryover treatment, filled PDF, XSD, and IRS acceptance remain open.

The [2025 Form 1099-PATR](https://www.irs.gov/pub/irs-prior/f1099ptr--2025.pdf)
and [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) are
the sources for the box meanings and line relationship. The former 1099-PATR
node had box 6/8/9 incorrectly labeled; the TY2025 source schema, focused cases,
and research notes were corrected directly. Business income itself still needs
its Schedule F/C source routing.

## Schedule B aggregation source contract (historical staging checkpoint; later proof below)

The
[TY2025 Form 8995-A instructions](https://www.irs.gov/pub/irs-prior/i8995a--2025.pdf)
require Schedule B when the filer elects to combine businesses for the W-2
wage/UBIA limit. A valid election requires 50% common ownership for a majority
of the year **including the last day**, the same tax-year end, no SSTB in the
group, and at least two of the three operational relationship factors. The
aggregation must be reported consistently in later years unless a material
change disqualifies it. An RPE's aggregation cannot be separated and its
statement must be attached. The latest
[Schedule B form](https://www.irs.gov/pub/irs-prior/f8995ab--2022.pdf) has lines
1–2 for the group description and prior-year change, line 3 for each member's
name, TIN, QBI, wages, and UBIA, and line 4 for their totals. The checked-in
TY2025 v5.4 `IRS8995AScheduleB.xsd` has matching group, member, and total
elements.

The `qbi_aggregation` input still has only a group name, member **names**, and
`combined_for_limitation`. A new optional, strict
`form8995a.aggregation_filing_details` object stages the one-group/two-member
evidence contract below. Its pure validator compares the member ledger with the
group's ordered names, each copied Schedule C source, and the parent
QBI/wages/UBIA totals. Bounded native parent and Schedule B projections now
calculate the aggregate parent row and two Schedule B member rows from this
typed source. Their join requires matching retained parent and companion
records, two retained Schedule C items matching the copied source, a common
owner SSN matching the return header, and Form 1040 line 13 matching the grouped
deduction. The parent PDF projection includes the aggregation checkbox. The
Schedule B PDF field map was inspected from the official December 2022 fillable
revision, but no filled page has been rendered. The existing
`business_filing_details.no_aggregation_confirmed` cannot truthfully describe an
aggregation. These bounded native/PDF functions are registered. The node still
rejects aggregation without the two-business evidence or outside its narrow
source conditions.

A first positive route should be limited to one group of exactly two positive,
non-SSTB Schedule C businesses, one single filer above the full phase-in range,
no RPE interest, no change to a prior election (or an explicitly new election),
and no Schedule A/C/D, REIT/PTP, gain, or prior-loss facts. Its **single
canonical aggregation source** must supply:

1. Group label, a written description of the qualifying relationship, tax year
   end, and an election/continuity record. A prior-year election needs its filed
   Schedule B reference; a new election needs an explicit first-year answer. The
   record must say whether any RPE aggregation exists and attach the statement
   if it does; the first bounded route should reject RPEs.
2. Ownership percentage and period for each business, with record references
   proving the same person or group held at least 50% for the required period
   including December 31. This first two-Schedule-C contract restricts both
   members to 100% taxpayer ownership from no later than July 2, 2025, through
   December 31. At least two selected operational factors need concrete
   descriptions and source references, not just booleans.
3. For each member, a distinct business reference, name, EIN, retained 2025
   Schedule C item, calculated net profit, adjusted QBI, W-2 wages, and UBIA.
   The staged source separately records the deductible portion of SE tax,
   self-employed health insurance, and retirement-plan deductions allocated to
   that business, with a described allocation method, worksheet reference,
   reviewer, and review date. Each member confirms no other attributable
   adjustments, and the group confirms no other business adjustments. Each
   member's QBI equals Schedule C net profit less those amounts. The native join
   checks the sum of the member adjustments against Schedule 1 lines 15–17.
   Require material participation and at-risk source facts; reject losses,
   SSTBs, duplicate members, and items not present in the retained Schedule C
   collection.
4. Reconcile Schedule B line 3 rows and line 4 totals to those two source items
   and to Form 8995-A's aggregate row lines 2, 4, and 7. Mark that parent row as
   aggregated and use the group label, not one member's name or EIN. Recompute
   the wage limitation, line 39, and Form 1040 line 13 from the grouped totals.
   Both the parent and companion must require the same source and reject a
   missing, changed, or extra Schedule B.

The typed source, grouped calculation, retained-source join, registered native
serializers, and PDF projections have focused positive and tampering cases but
are **unrun**. This is **not** verified Schedule B filing coverage. No
aggregate-only fallback, manual deduction, or fabricated member allocation was
added. The bounded descriptors must pass the TY2025 XSD, full graph test batch,
filled-PDF visual review, IRS business rules, and ATS before coverage is
claimed.

The [TY2025 instructions](https://www.irs.gov/pub/irs-prior/i8995a--2025.pdf)
explicitly require QBI to include deductions attributable to a business,
including deductible SE tax, self-employed health insurance, and qualified
retirement contributions. Ordinary Schedule C net profit is therefore **not**
generally a valid member QBI amount. The required method, worksheet reference,
reviewer and review date, no-other-adjustments assertions, and exact Schedule 1
lines 15–17 totals prevent silent omission and arithmetic drift. They do **not**
make the worksheet bytes or its conclusion available to the graph. It therefore
cannot independently verify that each allocation method is reasonable and
consistently applied across years, or that the no-other-business assertion is
true. The
[section 199A regulations](https://www.irs.gov/pub/irs-drop/td-reg-107892-18-corrected.pdf)
require a reasonable method based on the facts and circumstances for items
attributable to more than one business. The staged source now names a reviewer,
but there is no independently inspected workpaper or prior-year allocation
record. This is a human-reviewed source assertion, not an independently verified
result. The bounded path is wired for the deferred full batch, but filing use
remains gated on real workpaper review and those checks. No pro-rata allocation
is invented here.

This is **native and PDF descriptor build work, not end-to-end filing
coverage**. The bounded parent and Schedule D PDF projections are registered,
but no filled page has been rendered or visually inspected. Full tests, TY2025
XSD validation, filled-PDF visual review, IRS business rules, and ATS acceptance
are not done. Broader Schedule B/A/C and the broader patron routes remain open.


## One sourced Schedule C with WOTC (2026-10-06, locally validated)

This bounded route now carries one positive, non-SSTB taxpayer Schedule C into
Form 8995-A for a single filer above the full phase-in range. It retains the
business identity, certified employee payroll, employer W-2 wage review, full
Form 5884 line 2 wage deduction reduction, and deductible SE tax. Native and PDF
export replay those sources against Schedule C, Schedule SE, Schedule 1,
Form 3800, and Form 1040. Missing or changed source amounts fail both exports.
The employer W-2 review explicitly names its reviewer and source references;
these are supplied assertions, not authenticated document bytes.

[Form 5884 instructions](https://www.irs.gov/instructions/i5884) require the full
line 2 wage deduction reduction even when credit use is limited.
[Section 280C(a)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/pdf/USCODE-2024-title26-subtitleA-chap1-subchapB-partIX-sec280C.pdf)
links that reduction to the credit determined under section 51(a).
[Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) require
attributable deductible SE tax in QBI; the
[properly allocable wage rule](https://www.ecfr.gov/current/title-26/section-1.199A-2)
requires the associated wage deduction to be included in QBI. The bounded
unmodified-box wage review therefore preserves gross W-2 payroll and subtracts
the full credit from the allocable wage limitation amount. Credit use never
replaces the wage reduction or reduces the retained qualified payroll source.

The actual whole-dollar Form 3800 production path now rounds percentage lines
13 and 18 before using those entered amounts in subsequent calculations, as
required by the [Form 1040 rounding instructions](https://www.irs.gov/instructions/i1040gi).
Raw calculation callers can still retain cents. In the original partial-use
fixture, income tax is $49,038: line 13's raw $6,009.50 becomes $6,010 and the
allowed credit is consequently $43,028. Rounding the final raw $43,028.50 credit
would give a different result. The full sourced credit remains $192,000;
Schedule C deductible and QBI-limit wages remain $288,000; profit is $312,000;
deductible SE tax is $15,096; QBI is $296,904; and Form 8995-A/1040 deduction is
$56,231. An independent full-use fixture has $2,400 credit, $3,600 deductible
wages, $306,400 profit, $291,379 QBI, and a wage-limited $1,800 deduction.

Validation in the isolated worktree passed 587 existing focused tests plus
8 final integration/projection tests. The new positive full and partial returns
and three fractional tax-use edges passed the full local TY2025 v5.4 XSD.
Tampering cases reject changes to payroll, credit, wage reduction, SE tax,
Schedule 1, AGI, QBI deduction, and final taxable income in both exports.
Both 26-page filled PDFs were rendered with Poppler and reviewed for the
Schedule C, Form 3800, Form 5884, Form 8995-A, and Form 1040 amounts and layout.
Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-06-form8995a-wotc/`, in
`full-credit` and `partial-credit`, each with `return.xml` and
`filled-return.pdf`. These checks do not supersede older unrun route notes.

Remaining scope: other filing statuses or phase-in ranges; SSTBs, aggregation,
cooperatives, pass-throughs, farms, other income or businesses, mixed payroll,
other wage deduction locations, UBIA, attributable health or retirement
adjustments, and prior losses. This route requires equal reviewed W-2 boxes 1
and 5 matching all certified payroll, no qualified property, and nonpassive
self-earned WOTC. Authentication of SWA certifications, payroll, W-2/SSA filing,
and workpaper bytes remains open, as do IRS business-rule and ATS acceptance.
The $148,972 unused current credit is calculated but this slice does not add a
durable carryover ledger. Broader fractional credit source amounts retain their
existing export boundaries; this percentage-line repair does not claim every
Form 3800 fractional-input route is supported.

## Two-business aggregation full-return proof, October 6

The public `qbi_aggregation` input now retains the strict reviewed member/election ledger and no-prior-loss assertion. Two source Schedule C businesses produce $100,000/$80,000 profit alongside an issued $300,000 W-2 with $176,100 Social Security wages and $4,350 Medicare withholding. Filed SE tax is $4,821 and half-SE is $2,411; reviewed proportional allocations $1,339/$1,072 leave QBI $98,661/$78,928. The group totals $177,589 QBI, $30,000 wages and $200,000 UBIA. Percentage lines use filed rounding ($35,518 potential deduction), and the grouped wage limit yields $15,000 on Form1040. AGI $477,589, taxable income $446,839, ordinary tax $125,941, other taxes $7,217 and total tax $133,158 reconcile.

Full graph execution, parent/ScheduleB native documents, and the actual 17-page filled packet pass local TY2025 v5.4 XSD. Restricted integration passes **39/39**, zero failed, including the all-196-fixture calculation tamper audit. Sixteen native/PDF rejection checks cover detached/changed source members, owner, missing companion, second finalized simplified deduction, changed adjustments/credit and dividend conflicts. A retained upstream Form8995 source is accepted when it delegates; a second finalized simplified deduction is rejected. The actual retained general source supplies the prior-loss confirmation.

Every page was visually reviewed. The review corrected parent line40 carryforward zero, ScheduleSE zero Social Security limit/tax, and applicable Form8959 zero reduced threshold/withholding. Inapplicable RRTA parts now remain blank. Source/amounts/native XML, deterministic PDF, page origins, hashes and local XSD all pass the read-only selected checker: one case, 17 pages. Retained `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-aggregation/`; logs `/tmp/opentax-aggregation-final-integration4.log` and `/tmp/opentax-aggregation-selected-check.log`. Planner:196 fixtures,116 descriptors,113 keys,89 covered,24 uncovered.

This is a reviewed synthetic new-2025 election for one taxpayer and two positive non-SSTB ScheduleC businesses above phase-in. Genuine workpaper/ownership authentication, continued accepted elections, RPE statements, other groups/owners, losses, phase-in variants, business rules and ATS acceptance remain open. Earlier historical staging paragraphs do not describe this later positive proof.

## Public accounting SSTB source and complete Schedule A packet — October 6

The public Schedule C input now accepts a reviewed accounting SSTB source with
owner, business/EIN/classification workpaper, issued employee W-2 payroll,
timely SSA filing references, no qualified property, and explicit absence of
other businesses, aggregation, PTP, prior losses and other QBI adjustments. The
graph derives business QBI after the actual filed half-SE deduction; it retains
the source Schedule C and payroll evidence through parent and Schedule A. Native
and PDF preparation join those copies to actual owner wages, Schedule SE,
Schedule 1 and final Form 1040, and require matching parent/companion documents.
The existing direct staged sources remain separate from this public proof.

The retained synthetic Single accounting source has receipts 38,431 and employee
wages 10,000, yielding profit 28,431. Owner W-2 wages of 210,000 already exhaust
the Social Security wage base. Actual Schedule SE files tax 761 and half-SE
deduction 381; AGI is 238,050 and taxable income before QBI is 222,300. Adjusted
QBI 28,050 and wages 10,000 become applicable QBI 14,025 and wages 5,000 at 50%.
Parent potential deduction 2,805 exceeds the wage limit 2,500 by 305; the
half-dollar phase-in reduction 152.5 files as 153, producing deduction
**2,652**. Final taxable income is 219,648, ordinary tax 47,350, Additional
Medicare tax 326, total tax 48,437 and refund 1,563 on withholding 50,000. This
follows the
[2025 Form 8995-A instructions](https://www.irs.gov/pub/irs-prior/i8995a--2025.pdf)
for accounting SSTBs, applicable QBI/payroll and phased wage limitation.

The reusable fixture `single-form8995a-accounting-sstb-phasein` exports a full
TY2025 v5.4 return and **15-page** flattened packet. Root visually inspected all
pages, including actual employer/proprietor IDs, SSTB mark, 50% entries, 153
reduction, 2,652 deduction, Schedule SE required zeros and no optional
method/RRTA entries. Complete selected source/calculation/native/PDF/hash/
page-origin/XSD replay passes (`/tmp/opentax-sstb-selected-check.log`). The
Schedule A PDF instance now reads canonical pending source for owner/status
validation because the builder passes already projected print fields to it; this
repairs actual full-packet assembly rather than a direct-projector check.

This proves one positive owned accounting business with current payroll and
half-SE adjustment. Other SSTB categories, owners/statuses, multiple activities,
RPE sources, combined investment income, other adjustments, prior-loss
provenance, external source authenticity, IRS business rules and ATS acceptance
remain open. No broad Schedule A or Form 8995-A completion is claimed.

Verification: the typed restricted SSTB node/native/PDF/source suite passes **49/49** (`/tmp/opentax-sstb-focused2.log`), including 36 dual native/PDF source-conflict checks. The retained selected packet is `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb/`, manifest SHA-256 `eacd450cbafc7358525fd3dced19080fe4fe02b2e6ed69cf03a7c580a9febc4e`. Source fixture planning has 197 cases, 116 PDF descriptors, 113 keys, 90 covered keys and 23 uncovered keys. Planner coverage alone does not prove all-route packet review.

Existing simplified-QBI node, advanced native/PDF parent, sourced aggregation
and distinct-capital regressions additionally pass **59/59** in the same
restricted tool mode (`/tmp/opentax-sstb-existing-regression.log`).

## Owner-only accounting SSTB without employee payroll — October 6

The same public source now admits an explicitly reviewed owner-only workforce
with no employee W-2 records, zero Schedule C wages and zero QBI payroll. A
payroll/expense ledger reference and both no-employee/payroll confirmations are
required; a reviewed employee payroll list cannot also claim no employees.
No nonzero wages or wage expense may be asserted through this source.

The source retains profit28,431 and half-SE381, so adjusted QBI remains28,050
and pre-QBI taxable income222,300. Applicable QBI14,025 produces potential2,805;
the zero wage/property limitation and50% phase-in yield rounded reduction1,403
and positive deduction**1,402**. Filed taxable income220,898, ordinary tax47,750,
other tax1,087, total48,837 and refund1,163 reconcile throughout the full packet.
This is the actual no-payroll phase-in branch, with no invented employee wages.

Typed restricted Schedule C and both SSTB route tests pass **107/107**
(`/tmp/opentax-sstb-zero-focused2.log`). The full v5.4 native return and15-page
PDF packet pass selected exact source/calculation/native/PDF/hash/page-origin
replay (`/tmp/opentax-sstb-zero-check.log`), and root inspected all15 rendered
pages. Reusable fixture: `single-form8995a-accounting-sstb-no-payroll`.
Retained directory:
`.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-no-payroll/`;
manifest SHA-256
`261041c4b2dd6cb9735d57000452d843b59cc2bcd5dc4b79bf80964cba4d4b46`.
Broader SSTB sources, owners/statuses, property and external authentication
remain open. Historical selected manifests capture their generation inventory;
they are not evidence that every later added fixture has been reviewed.

## Joint primary-owned accounting SSTB and printed percentages — October6

The public accounting SSTB route now accepts MFJ with one primary-owned accounting business and one primary-owned issued W2. The retained spouse identity is joined to the actual joint header; this packet does not prove spouse business/payroll or mixed-owner business combinations. Source wages420000 plus ScheduleC profit28431, SE761/half381 yield AGI448050 and pre-QBI taxable416550. Joint threshold394600/range100000 yields21.95% phase-in and78.05% applicable percentage. Filed QBI21893 and wages7805 produce potential4379, wage limit3903, reduction104 and final deduction4275. Taxable412275, ordinary tax86054 and other tax2527 produce total88581 and refund1419.

Native export rejects a mismatched filing status or spouse-owned retained business. The complete15-page source packet passes local v5.4 XSD and exact selected replay. All15 rendered pages were visually inspected. This review found two actual PDF discrepancies: numeric percentage fields were rounded to monetary integers, and Schedule1/2 plus Forms8959/8960 omitted the spouse from shared headers. Percentage projection now preserves three percentage decimals; shared headers derive both actual names for MFJ and reject missing spouse identity, while C/SE remain individual-owned. Corrected pages retain21.95/78.05 and both shared names.

Typed restricted real-Poppler builder,8959/8960 native, Schedule2 replay and SSTB tests pass80/80 in19s; log `/tmp/opentax-joint-header-regression3.log`. Initial runs exposed a missing test fixture nameControl and an empty-data test skip; both fixture defects were corrected before the passing run. Exact replay log `/tmp/opentax-joint-review4-check.log`. Artifacts: `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-joint` plus sibling rendered directory. Manifest SHA256 `b243b9ae30ddda882e6bbdee443823893530cc8c80d9309fcdf200b85bc9ce27`. Inventory is a generation-time isolated-base snapshot. Broader SSTB categories, spouse sources, workpaper authenticity and IRS acceptance remain open.

## Joint primary WOTC phase-in and current-tax use, October 6

The existing reviewed Schedule C/WOTC route now supports MFJ primary-owned
non-SSTB business sources above the joint threshold, including the middle band.
[TY2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a)
set the joint threshold/range at $394,600–$494,600. Parent Part III calculates
the reduction of the wage/property limit, using finalized percentage operands
and whole-dollar monetary lines. Exact fractional percentages remain visible
in the PDF. Above $494,600 the wage limit applies without Part III.

The public payroll/certification allocation still supplies the full determined
Form 5884 line 2 credit to Schedule C before SE and QBI, independently of the
allowed Form 3800 tax use, following the [Form 5884 line 2 instructions](https://www.irs.gov/instructions/i5884).
The QBI wage review retains all qualified payroll and equal employer W-2 boxes
1/5, subtracting the full section 280C deduction reduction for allocable QBI
wages. A reviewed primary owner SSN is required for this joint route.
The generic owner-SE source is retained and replayed against actual Schedule C,
W-2 owners/references/Social Security wages, general/header identities, individual
SE calculations, and final return totals. Spouse wages do not consume the
primary proprietor's Social Security wage cap. Actual W-2 box 1 income joins
1040 wages, AGI, pre-QBI taxable income, and the final QBI deduction.

Five reusable public fixtures keep actual cent-valued source inputs. For the
one-employee cases, gross receipts are $350,000, original wages $6,000,
credit $2,400, deductible wages $3,600, profit $346,400, primary SE tax $31,113,
half-SE deduction $15,557 and QBI $330,843. The wage limit is $1,800.

| Case | Raw spouse W-2 wages | Filed pre-QBI taxable income | Phase-in | QBI deduction | Total tax |
| --- | ---: | ---: | ---: | ---: | ---: |
| Middle band | 150,000.37 | 449,343 | 54.743% | 30,931 | 118,710 |
| First dollar above threshold | 95,257.50 | 394,601 | 0.001% | 66,168 | 94,717 |
| Last phase-in dollar | 195,256.50 | 494,600 | 100% | 1,800 | 142,921 |
| First dollar above range | 195,257.50 | 494,601 | Inapplicable | 1,800 | 142,921 |
| Limited current tax use | 300,000 | 565,404 | Inapplicable | 59,381 | 56,036 |

Raw AGI is $480,843.37/$426,100.50/$526,099.50/$526,100.50 for the four
one-employee cases; their filed AGI is $480,843/$426,101/$526,100/$526,101.
Source records are not changed to erase cents. The parent takes finalized
whole-dollar pre-QBI taxable income; source and final 1040 joins check both the
raw income chain and filed deduction/taxable-income equation. At the first
threshold dollar, rounded potential deduction $66,169 less rounded Part III
reduction $1 gives $66,168. At the upper edge the reduction is $64,369;
Part III is blank for the next filed dollar.

The limited-use fixture retains 80 certified source employees and $480,000 of
qualified payroll, the full $192,000 credit/deduction reduction, $288,000
deductible wages, $312,000 profit, $30,192 primary SE tax, $15,096 half-SE,
and $296,904 QBI. Actual joint income tax is $116,203. Form 3800 line 13's
raw $22,800.75 is entered as $22,801, leaving $93,402 current credit use.
The $98,598 unused credit is calculated; this extension does not add or
prove a durable carryover ledger. Additional Medicare tax is $3,043, including
actual spouse withholding of $900, and the final refund is $4,864.

Proof checkout is `/tmp/opentax-form8978-historical-oct6`, base `e9be0ed79`.
The historical-recomputation investigation found only TY2025 in
`CONFIG_BY_YEAR`, only the TY2025 return/export engine, and an unconditional
`ordinaryTax2025` call in the ordinary income-tax node. A prior-return reference
is an amendment handoff, not an affected-year snapshot engine. The
[Form 8978 instructions](https://www.irs.gov/instructions/i8978) require the
actual affected-year tax/AMT and related tax-attribute calculations; ordinary
historical replay therefore remains open. This joint WOTC proof makes no
historical-engine claim.

Held artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-06-joint-wotc/` and its
`-rendered` sibling. The selected held checker completed **5 cases, 130 pages**,
with full local TY2025 v5.4 XSD, source/XML/PDF replay, hashes and IRS template
provenance. All 130 final pages were visually reviewed, including all nine
Form 3800 pages, both parent/SE/Schedule C pages, Form 5884, AMT, Additional
Medicare, NIIT and final 1040. The preserved shared joint names, fractional
percentage helper and inapplicable RRTA omissions are visible in these packets.
Checker log: `/tmp/opentax-joint-wotc-selected.log`.

Native/PDF negatives reject altered spouse W-2 income/owner, owner review,
proprietor allocation, certification payroll, individual half-SE, pre-QBI
threshold operands, finalized wages/deduction, and actual filed spouse/primary
identities. Public execution rejects missing primary-owner review, a W-2 owned
by neither spouse, or a spouse-owned business presented as this primary route.

Remaining broader scope includes spouse-owned WOTC, other statuses, multiple
businesses, SSTBs, farms, aggregation, cooperatives, different wage methods,
UBIA, attributable health/retirement adjustments, prior QBI losses, mixed credit
ordering and durable carryovers. Source reviews and certification/payroll/W-2
references are synthetic test records and supplied assertions, not authenticated
SWA, employer, SSA or workpaper bytes. No source authentication, IRS business-rule,
ATS or production acceptance claim is added; the broader parent remains open.

Final terminal test evidence for this joint extension: **4 typed tests passed,
0 failed**, including all five public full-XSD/PDF returns and source/owner
negatives (`/tmp/opentax-joint-wotc-focus.log`); **92 related tests passed,
0 failed**, covering Form 8995/8995-A calculations/PDFs, retained Single WOTC,
generic owner-SE and patron phase-in (`/tmp/opentax-joint-wotc-final-regression.log`).
The earlier narrower compatibility batch also passed 14/14
(`/tmp/opentax-joint-wotc-regression.log`). Generator completed with terminal 0
(`/tmp/opentax-joint-wotc-generate.log`).
