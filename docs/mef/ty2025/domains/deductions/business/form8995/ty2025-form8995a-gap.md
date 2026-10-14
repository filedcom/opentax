# TY2025 Form 8995-A coverage gap

## October 14 patron Medicare rounding review repair

The earlier Form8959 repair correctly rounded exact half dollars, but the single
patron and independent-farm return validators still multiplied by floating-point
0.009. Two complete source-return cases reproduced rejected correct exports:
MFS proprietor wage excess103,500 and MFJ combined SE excess103,500 each require
932, while their old validators expected931. Adjacent103,499/103,501 cases passed.

Both validators now call the shared exact-integer Additional Medicare calculation.
All six source-return cases prepare native returns and project the parent PDF
fields, while twelve altered native/PDF-projection calls reject. The combined
patron/Form8959 regression passes55 tests; lint, formatting and diff checks pass.
This is arithmetic and projection verification, with no new rendered-PDF or IRS
acceptance claim. Evidence: `.state/research/pr-fixes-2026-10-14/` retains the
baseline4-pass/2-fail and corrected55-pass logs.

## October 12 saved patron investment checkpoint

[Saved-submission evidence](../../../../testing/ty2025-patron-submission-replay.md#october-12-investment-extension)
now covers all 58 retained patron cases, including the twelve investment returns.
All 116 return/manifest schema checks pass, every native return matches its prior
packet after synthetic identity remapping, and both container orders preserve
exact archives and request metadata. The replay rejects 969 saved-source and
421 archive changes; all 51 submission tests pass. Investment sources, payroll,
capital limits, preferential tax and NIIT survive JSON reopening together.
No additional complete-return/PDF counts or parent-task closure are claimed.

## October 12 cooperative patron investment checkpoint

One-business cooperative patron returns now reconcile owned ordinary interest,
ordinary/qualified dividends and capital-gain distributions through public QBI,
complete native XML and PDF export. Previously capital contributions failed the
public patron guard and investment copies failed final-return reconciliation.
Primary and spouse investment owners, issuer/account/reference details, qualified
dividend holding review, Schedule B rows, QBI capital contributions, preferential
tax and NIIT source lines now use the retained investment-copy checks. Broker
sales, other QBI activities, REIT/PTP and unreviewed sources retain their guards.

Twelve complete synthetic cases cover farm and Schedule C health-plan businesses
for Single, HOH, QSS, MFS and either joint proprietor, including the owner's W-2
job and both spouses' issued investment copies where joint. Sources total 1,700
interest, 3,000 ordinary dividends (including 1,500 qualified), and 1,800 capital
distributions. All twelve independent Decimal calculations match QBI, taxable
income, preferential tax, total tax and balance. The joint farm phase-in increases
from 93.487% to 99.987%, changing the deduction from 27,263 to 26,228; NIIT is 247
on 6,500 investment income. The capital adjustment on Form8995-A line34 is 3,300.
These checks apply the [8995-A instructions](https://www.irs.gov/instructions/i8995a),
[1040 qualified-dividend worksheet](https://www.irs.gov/instructions/i1040gi) and
[NIIT instructions](https://www.irs.gov/instructions/i8960); active business income
stays outside NIIT and independent tentative AMT remains below regular tax.

All twelve complete XML returns pass cached IRS 2025v5.4 XSD (root SHA-256
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
Native income, QBI, parent/companion and final-tax amounts match the independent
proof; document IDs are unique and references close. Twelve focused tests pass,
including 204 native and 204 fresh-PDF rejections of changed owner/source amounts,
missing references or holding review, capital limits, Schedule B, the preferential
worksheet, NIIT source/total lines and final deduction. Investment mutations are
mirrored across retained source copies before preparation. The related regression
has130 passes and one error-message assertion failure in the aggregation test; the
identical test fails on committed977d37f05 in a detached worktree, confirming
existing deferred140. Five changed files lint clean; the existing Form8995
`no-explicit-any` failure is deferred164. No introduced test failure was found.

All 198 pages received qualified review:50 unique new images inspected on13
contact sheets,112 exact prior observations and36 within-batch duplicates.
Reopened PDFs have no fields or widgets. Schedule B payer rows and foreign-account
answers, Form1040 distribution-only mark, Form8995-A capital/phase-in amounts,
NIIT thresholds and final balances reconcile. Existing findings3/68/76 remain
qualifications. Initial probes repeat deferred161 (public errors followed by
successful preparation), and preexisting lint finding164 is recorded separately;
neither deferred issue was repaired. Wider sources and IRS acceptance remain open.

Evidence: `.state/research/form8995a-patron-investments-2026-10-12/` retains before/
after probes, source/native/PDF packets, Decimal proof, XSD/test logs, image hashes,
review mapping and observations. PR totals become153 complete returns/2,490
qualified pages and8,132 export rejections. The468 native-only cases and114 saved
SSTB/patron returns with1,808 source/archive rejections remain separate.

## October 12 saved proprietor-wage submission checkpoint

The [saved patron replay](../../../../testing/ty2025-patron-submission-replay.md#october-12-proprietor-wage-extension)
now includes all12 proprietor-wage cases:46 saved patron returns total,92
return/manifest XSD checks,559 saved-source and333 archive/container rejections.
Complete native trees match prior packets after only identity remapping; both
container orders preserve exact inner bytes. The linked checkpoint retains the
source inventory and rejection breakdown. No PDF/complete-return count increases;
existing presentation and external acceptance qualifications remain separate.

## October 12 cooperative proprietor wage checkpoint

Reviewed cooperative proprietors can now retain their own W-2 job alongside the
farm or Schedule C business, including both spouses' wages on a joint return.
Previously proprietor wages and dual wage collections blocked preparation. Public
issued copies now join the primary and spouse collections, verify actual owners,
and use only the proprietor's Social Security wages in that owner's Schedule SE.
Both spouses' wages still enter joint income, withholding and Additional Medicare.
The same employee cannot appear in both collections; source and final-tax guards
remain required.

Twelve synthetic source-backed complete returns cover Single, HOH, QSS, MFS,
MFJ primary proprietor and MFJ spouse proprietor, each with farm and Schedule C
health-insurance variants. Farm job wages of 60,000 leave a 116,100 Social Security
base, producing SE tax 20,824 and deduction 10,412; C job Social Security wages of
176,100 exhaust that base, producing SE tax 7,097 and deduction 3,549. The latter
retains a reviewed 6,000 health deduction and employer-plan eligibility review.
Independent Decimal arithmetic matches all twelve QBI deductions, taxable incomes,
regular taxes, total taxes and balances, including joint wage withholding and the
93.487% joint-farm phase-in. Sources: [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse),
[QBI instructions](https://www.irs.gov/instructions/i8995a),
[Additional Medicare instructions](https://www.irs.gov/instructions/i8959) and
[1040 computation worksheet](https://www.irs.gov/instructions/i1040gi).

All twelve complete returns pass the cached IRS 2025v5.4 XSD (root SHA-256
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
Native W-2 owner/employer joins and six numeric fields per copy reconcile with
sources; document IDs are unique and references close. Thirteen new tests and
137 existing patron/W-2 tests pass. Altered owners, wages, withholding, employer
identity, missing sources, switched collections, SE deductions and final tax
produce 148 native and 148 fresh-PDF rejections; twelve duplicate-owner public
cases produce error diagnostics, counted separately.

All 186 pages received qualified review: 71 unique new images inspected across
18 contact sheets, 42 exact prior observations and 73 within-batch duplicates.
Reopened PDFs have no fields or widgets. Status marks, proprietor identities,
SE/health amounts, QBI reductions and final balances reconcile. Existing findings
3 on inherited business pages, 68 on header name order and 76 on applicable blank
zeros remain qualifications; no deferred item was repaired. Multiple cooperatives,
wider business combinations, source authenticity and IRS acceptance remain open.

Evidence: `.state/research/form8995a-patron-wages-2026-10-12/` retains before/after
probes, all source/native/PDF packets, independent proof, test and XSD logs,
page hashes, review mapping, visual observations and mutation/run metadata.
Ongoing PR totals: 141 complete returns/2,292 qualified pages and 7,724 export
rejections; 468 native-only cases and 102 saved SSTB/patron returns with 1,502
source/archive rejections remain separate. No frozen parent TODO is closed.

## October 12 saved cooperative patron submission checkpoint

[Saved-return and archive proof](../../../../testing/ty2025-patron-submission-replay.md)
now covers all34 retained one-business patron cases: all five statuses and either
joint proprietor, with farm/health, phase-in and income-cap sources. Complete
native data matches earlier packets after only synthetic TIN remapping;34 return
and34 manifest XSD checks pass. Both container orders preserve exact inner bytes.
All341 reopened-source and245 archive/container alterations reject, and the full
submission directory passes51 typed tests. This adds no new PDF/packet counts or
runtime changes; prior qualifications, source authentication and IRS acceptance
remain separate. See the linked checkpoint for case counts and evidence paths.

## October 12 cooperative patron HOH, QSS and MFS checkpoint

Reviewed one-business cooperative patron sources now support HOH, QSS and MFS
through public calculation, complete native XML and PDF preparation. Previously
these sources stopped at Single/MFJ status guards. The extension retains the
existing seven farm, Schedule C health, income-cap, phase-in and unbound wage-limit
cases for each added status: 21 complete returns.

MFS requires the existing full-year noncommunity-property and spouse-deduction
review, bound to the actual owner, spouse SSN and mailing state in both the pending
return and final filer. Other statuses reject an MFS review. Source payroll,
cooperative recipient, box 6 notice, allocation worksheet, one-business ownership,
parent/companion amounts and final-tax checks remain required. MFS reconciliation
uses its 125,000 Additional Medicare threshold; the underlying calculator already
supports this threshold. No deferred rounding or diagnostic-policy repair is made.

Independent Decimal arithmetic from synthetic books, payroll and cooperative
records matches all 21 QBI deductions, taxable incomes, ordinary taxes, total taxes
and balances. The proof applies the [Form 8995-A instructions](https://www.irs.gov/instructions/i8995a),
[Additional Medicare thresholds](https://www.irs.gov/instructions/i8959) and
[Form 1040 tax computation worksheet](https://www.irs.gov/instructions/i1040gi).
The QSS phase-farm case falls below the QBI phase-in threshold after its standard
deduction and correctly skips Part III. Active-business income adds no NIIT;
independent AMT computations remain below regular tax in these cases.

All 21 complete XML returns pass the cached IRS 2025v5.4 XSD, with unique document
IDs and closed references. Root schema SHA-256:
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The 22 new typed tests and 28 existing patron tests pass. Negative evidence includes
42 public error diagnostics, 231 native rejections and 231 fresh-PDF rejections;
source mutations are mirrored across all retained source copies. Final-filer spouse
changes also reject. Public error diagnostics are not counted as export rejections.

All 311 packet pages received qualified review: 101 unique new images were
inspected on 26 contact sheets, 188 pages match previously reviewed PDF renderings,
and 22 are exact duplicates within this batch. Reopened PDFs contain no fields or
widgets. Filing-status marks, household names, business identities, source amounts,
Schedule D reductions, parent deductions and final balances reconcile. Existing
findings 3 (positive-business loss-only choices on prior images), 68 (header name
order) and 76 (blank applicable zero totals) remain qualifications, not repairs or
clean parity approval. Multiple cooperatives, wider business/owner combinations,
authenticated source bytes and IRS business-rule acceptance remain open.

Evidence: `.state/research/form8995a-patron-status-2026-10-12/` retains original
blocked probes, 21 source/native/PDF packets, independent arithmetic, XSD logs,
page hashes and review mapping, visual qualifications, mutation totals and run
metadata. Ongoing PR totals become 129 complete return cases/2,106 qualified pages
and 7,428 export rejections; the earlier 468 native-only boundary replays and
68 saved SSTB returns/916 archive rejections remain separate. The 52 frozen main
TODOs remain open and no future item is implemented.

## October 12 service-classification zero-boundary audit

All 39 previously reviewed service fixtures now run against all 12 existing
zero-deduction endpoints: 468 native returns. This crosses legal, ten medical
codes, consulting, financial advice/banking/loan arrangement, brokerage,
investment management, actuarial, performing-arts/athletic roles and three
personal-identity income kinds with all five filing statuses and either joint
business owner. The 39 fixtures are source cases, not 39 distinct tax categories.

Endpoints cover the exact phase-in ceiling, the adjacent dollar below it,
rounded-zero applicable QBI and zero taxable-income cap. Each fixture
retains the endpoint's payroll, ownership and investment records; two distinct
synthetic invoices reconcile to its actual gross receipts. Personal-identity
income is rebound to the endpoint's actual proprietor. Classification records
survive in Schedule C and both Form8995-A/Schedule A retained source copies.

All 468 full native returns pass local 2025v5.4 XSD. Independent Decimal arithmetic
reconciles 429 final-tax results; 39 original MFS exact-half variants reproduce
existing deferred 156, each one dollar below the independently calculated total
and balance. Complete native ReturnData trees match the 12 previously reviewed
accounting endpoints after exactly five intended activity/code/name text changes;
all numerical fields, owner identities, documents and references remain equal.

The audit rejects 2,208 native and 2,208 PDF export attempts with altered sources.
These include missing classification, inconsistent receipts, excluded activities,
mixed accounting claims and applicable financial-kind, professional-role and
personal-identity owner/kind changes. Every retained business-source copy is
changed together, so rejection cannot depend on comparing one unchanged copy.
This tests saved/prepared source guards; the public diagnostic-to-preparation
policy remains deferred 161.

Twelve grouped tests cover the 468 combinations. Twelve original endpoint packet
tests also pass after their unchanged independent expectations move to a shared
fixture. All 190 regenerated baseline pages match their previously observed PNGs
exactly; sources and complete native data also match. Reopened PDFs contain zero
fields/widgets. Existing qualifications 3/68/76/156/163 carry forward.

These are native-only service-boundary replays and repeated baseline packets:
complete-packet and reviewed-PDF totals remain 108/1,795 for the ongoing PR,
including 68 SSTB packets/1,066 pages. No runtime calculation or deferred issue is
changed. This audit does not close the broader QBI parent or establish IRS
business-rule acceptance or external source authenticity.

Evidence: `.state/research/form8995a-sstb-service-zero-2026-10-12/` retains the
four disjoint test-run logs, separate type check, 468 native/source/check sets,
independent arithmetic and full-document comparison, 12 baseline PDF replays and
190 exact render matches. `verify.py` requires all 468 successful case records;
`review-baseline.py` requires all 12 baseline packets and 190 page matches.

## October 12 endorsement, identity licensing and appearance checkpoint

The one-business SSTB route now accepts reviewed endorsement, personal-identity
licensing and appearance income for independent artists, writers and performers.
The source identifies one income category, the individual whose identity earns
the receipts, engagement records and distinct invoice amounts. That individual's
SSN must equal the reviewed Schedule C owner; all receipts must reconcile to
gross revenue, with no other revenue category, returns or allowances.

The [IRS SSTB definitions](https://www.irs.gov/instructions/i8995a) identify these
three categories. This checkpoint uses the independent-artist/writer/performer
[Schedule C code711510](https://www.irs.gov/instructions/i1040sc) with an explicit
activity review; the code alone does not classify ordinary sales or services.
Mixed categories, other individuals' identity income, wider business codes and
multiple-business claims remain outside this retained route.

Nine complete returns cover all five statuses, either joint owner, payroll and
owner-only businesses, partial/capped wage bases and the investment-income cap.
Independent Decimal calculations reconcile QBI, SE tax, Additional Medicare,
NIIT, preferential tax, total tax and payment/refund amounts:

| Case | QBI deduction | Taxable income | Total tax | Refund or owed |
| --- | ---: | ---: | ---: | --- |
| appearance-hoh | 1,561 | 219,364 | 46,293 | refund 3,707 |
| appearance-income-cap | 2,474 | 211,698 | 30,644 | owed 30,644 |
| appearance-spouse-partial | 2,830 | 418,592 | 93,544 | owed 43,544 |
| endorsement-primary-capped | 2,872 | 420,178 | 90,796 | owed 40,796 |
| endorsement-qss | 3,711 | 209,339 | 36,739 | refund 13,261 |
| endorsement-single | 1,934 | 226,866 | 50,433 | owed 433 |
| licensing-mfs | 1,934 | 226,866 | 51,108 | owed 1,108 |
| licensing-primary-partial | 3,811 | 417,611 | 93,231 | owed 43,231 |
| licensing-spouse-capped | 3,890 | 419,160 | 90,470 | owed 40,470 |

All nine native returns pass local2025v5.4 XSD. The packet checks reject108
native and108 PDF source alterations, including wrong individuals and unsupported
income kinds. All108 public alterations report errors;45 preparations reject
and63 repeat existing deferred161 when preparation is called after graph errors.
This reproduces that issue without changing the error-handling policy.

All142 PDF pages received qualified observation:23 newly inspected images in
six contact sheets,115 exact previously observed matches and four within-batch
duplicates. Source activities, names, business codes, owner amounts and Schedule A
percentages reconcile. Reopened outputs contain zero fields/widgets. Existing
Schedule C conditional marks3, header68 and required-zero76 findings repeat.

The nine focused tests and214 grouped SSTB/Schedule C/submission tests pass
(223 typed tests, zero failures or ignored tests); focused lint and diff checks
pass. The expanded [saved-return proof](../../../../testing/ty2025-sstb-submission-replay.md)
now includes all68 retained SSTB returns,136 XSD checks and916 source/archive
rejections, verified by a separate50-test submission gate.

Evidence: `.state/research/form8995a-sstb-identity-2026-10-12/` retains source
records, native/PDF packets, schema provenance, independent arithmetic, mutation
outcomes, rendered images and review mappings. Source records are synthetic;
engagement references do not authenticate external contracts. Broader parent
completion and IRS acceptance remain open.

## October 12 actuarial, performing-arts and athletic source checkpoint

The retained one-business Schedule A path now accepts reviewed actuarial science,
performing arts and athletics. Classification records bind professional services,
roles where applicable, engagement references and distinct invoice receipts to
all Schedule C revenue. Actuarial records confirm services by an actuary and no
other service receipts; arts and athletic records confirm the required skills
and exclude equipment/facility operation and broadcasting. Performer and athletic
roles are distinct; a facility operator cannot pass as either.

This follows the [IRS SSTB definitions](https://www.irs.gov/instructions/i8995a).
[TY2025 Schedule C codes](https://www.irs.gov/instructions/i1040sc) corroborate
actuarial services541990, independent performers711510, performing companies711100
and spectator sports711210. The activity code does not establish classification
without the reviewed service records. Mixed excluded activities, other fields,
multiple businesses and wider source combinations remain outside this checkpoint.

Nine complete packets cover all five statuses, either joint owner, payroll and
owner-only businesses, partial/capped wage bases and the investment-income cap.
Cases include actuarial services, an actor, a singer-owned performing company,
a director, an athlete, a coach and a team manager. Their income sources retain
independently reconciled investment fixtures; source records are synthetic and
do not authenticate customer records or professional status.

| Case | QBI deduction | Taxable income | Total tax | Refund or owed |
| --- | ---: | ---: | ---: | --- |
| actor-mfs | 1,934 | 226,866 | 51,108 | owed 1,108 |
| actuary-income-cap | 2,474 | 211,698 | 30,644 | owed 30,644 |
| actuary-primary-partial | 3,811 | 417,611 | 93,231 | owed 43,231 |
| actuary-single | 1,934 | 226,866 | 50,433 | owed 433 |
| athlete-hoh | 1,561 | 219,364 | 46,293 | refund 3,707 |
| coach-spouse-partial | 2,830 | 418,592 | 93,544 | owed 43,544 |
| director-primary-capped | 2,872 | 420,178 | 90,796 | owed 40,796 |
| manager-spouse-capped | 3,890 | 419,160 | 90,470 | owed 40,470 |
| singer-company-qss | 3,711 | 209,339 | 36,739 | refund 13,261 |

The nine new packet tests and213 related SSTB/Schedule C/submission tests pass
(222 typed tests, zero failures or ignored tests); focused formatting/lint and
diff checks pass. The expanded saved-return replay covers59 returns and768
rejected source/archive alterations; details are in the
[saved-return proof](../../../../testing/ty2025-sstb-submission-replay.md).

All nine full native returns pass local2025v5.4 XSD. Independent Decimal
calculations reconcile final tax, owner SE, Additional Medicare, NIIT, income
limits and preferential rates. The packet harness rejects96 native and96 PDF
alterations, including six incompatible professional roles. All96 public
alterations report graph errors:42 preparations reject and54 repeat deferred161.
The accepted-after-error XML files remain separate from positive packet counts.

All142 PDF pages received qualified observation:25 new images inspected in
seven contact sheets,115 exact prior matches and two within-batch duplicates.
Business names, roles, codes, owners, amounts and Schedule A percentages reconcile.
Reopened outputs contain zero fields/widgets. Existing Schedule C choices3,
header68 and required-zero76 qualifications repeat without repair.

Evidence: `.state/research/form8995a-sstb-professional-2026-10-12/` retains source
records, native/PDF packets, schema provenance, independent arithmetic, mutation
outcomes, rendered images and review mappings. Broader parent completion,
external source authentication and IRS acceptance remain open.

## October 12 financial-service source checkpoint

The retained one-business Schedule A path now accepts reviewed financial advice,
investment banking, loan arrangements, securities brokerage and investment
management. Separate classification records bind client-service assertions,
exclusion review, engagement references and distinct fee invoices to all Schedule C
receipts. Financial-advice, investment-banking and loan-arrangement reviews must
match codes 523900, 523150 and 522300 respectively; securities brokerage uses
523150 and investment management uses 523900. Codes corroborate the reviewed
service rather than establishing its classification alone.

The [IRS SSTB definitions](https://www.irs.gov/instructions/i8995a) distinguish
these services from direct lending/deposit-taking, real-estate or insurance
brokerage, and direct real-property management. The new source contract records
those exclusions. [TY2025 Schedule C codes](https://www.irs.gov/instructions/i1040sc)
identify the applicable principal activity. Mixed excluded services, trading,
dealing and other unsupported combinations remain outside this checkpoint.

Nine source-backed packets cover all five filing statuses, either joint owner,
partial/capped wage bases, payroll/owner-only businesses and the investment-income
cap. Their financial inputs reuse independently reconciled investment cases;
new business names, activities, codes and fee records pass the same public,
native and PDF source checks. Synthetic engagements and invoice references do
not authenticate external customer records.

| Case | QBI deduction | Taxable income | Total tax | Refund or owed |
| --- | ---: | ---: | ---: | --- |
| advice-primary-capped | 2,872 | 420,178 | 90,796 | owed 40,796 |
| advice-single | 1,934 | 226,866 | 50,433 | owed 433 |
| banking-mfs | 1,934 | 226,866 | 51,108 | owed 1,108 |
| broker-primary-partial | 3,811 | 417,611 | 93,231 | owed 43,231 |
| broker-spouse-capped | 3,890 | 419,160 | 90,470 | owed 40,470 |
| loan-hoh | 1,561 | 219,364 | 46,293 | refund 3,707 |
| management-income-cap | 2,474 | 211,698 | 30,644 | owed 30,644 |
| management-qss | 3,711 | 209,339 | 36,739 | refund 13,261 |
| management-spouse-partial | 2,830 | 418,592 | 93,544 | owed 43,544 |

The nine new packet tests and204 existing SSTB, Schedule C and submission tests
pass (213 typed tests, zero failures or ignored tests). Focused formatting/lint
and diff checks pass.

All nine full native returns pass local2025v5.4 XSD, and independent Decimal
calculations match final tax, SE, Additional Medicare, NIIT, income limits and
preferential rates. The shared packet harness rejects94 native and94 PDF
alterations, including four financial-service-kind/code conflicts. All94 public
alterations report graph errors:36 preparations reject and58 repeat deferred161.
Those58 accepted-after-error XML files are retained separately and are not
positive filing packets or rejection successes.

All142 PDF pages received qualified observation:24 new unique images inspected
in six contact sheets,115 exact prior matches and three within-batch duplicates.
Names, codes, activities, owner amounts and Schedule A percentages reconcile;
all reopened outputs have zero fields/widgets. Existing Schedule C choices3,
identity/header68 and required-zero76 qualifications repeat without repair.

Evidence: `.state/research/form8995a-sstb-financial-2026-10-12/` retains source
records, native/PDF packets, XSD provenance, independent arithmetic, mutation
outcomes, rendered images and review mappings. Broad parent completion, external
source authenticity and IRS acceptance remain open.

## October 12 legal, medical and consulting source checkpoint

The existing one-business Schedule A path now accepts reviewed legal, medical
and consulting services alongside its retained accounting source. The new
classification record binds distinct invoice references and whole-dollar service
receipts to gross Schedule C revenue, with engagement records, activity review,
and field-specific exclusions. Both the public calculation and native/PDF source
checks use that evidence; a business code alone cannot classify the activity.
The legacy accounting review remains mutually exclusive with the new review.

The [2025 SSTB definitions](https://www.irs.gov/instructions/i8995a) distinguish
professional medical care, legal skills and separately paid consulting advice
from excluded activities. The source contract records the applicable exclusion
review and rejects incomplete receipts, duplicate invoice references, conflicting
classification, activity mismatch, returns/allowances and other income.
[Schedule C codes](https://www.irs.gov/instructions/i1040sc) corroborate law541100,
consulting541600 and practitioner health621111/621112/621210/621310/621320/621330/
621340/621391/621399 plus veterinary541940. These are reviewed all-service
inventories; mixed activities and other SSTB fields remain outside this proof.

Twelve complete packets cover each accepted new code, all five statuses, either
joint proprietor, payroll/owner-only workforces, partial/capped owner wage bases,
qualified dividends/capital distributions and the binding income cap. Independent
Decimal source arithmetic reconciles all12 final taxes, owner SE, preferential
tax, Additional Medicare, NIIT and zero AMT. Retained evidence is synthetic and
does not authenticate professional status or customer documents.

| Case | QBI deduction | Taxable income | Total tax | Refund or owed |
| --- | ---: | ---: | ---: | ---: |
| consulting-mfs | 1,934 | 226,866 | 51,108 | owed1,108 |
| health-541940 | 1,934 | 226,866 | 50,433 | owed433 |
| health-621111 | 1,934 | 226,866 | 50,433 | owed433 |
| health-621112 | 2,474 | 211,698 | 30,644 | owed30,644 |
| health-621210 | 1,934 | 226,866 | 51,108 | owed1,108 |
| health-621310 | 1,561 | 219,364 | 46,293 | refund3,707 |
| health-621320 | 3,711 | 209,339 | 36,739 | refund13,261 |
| health-621330 | 3,811 | 417,611 | 93,231 | owed43,231 |
| health-621340 | 2,830 | 418,592 | 93,544 | owed43,544 |
| health-621391 | 2,872 | 420,178 | 90,796 | owed40,796 |
| health-621399 | 3,890 | 419,160 | 90,470 | owed40,470 |
| law-single | 1,934 | 226,866 | 50,433 | owed433 |

The12 new packet tests,48 related SSTB regressions and104 Schedule C regressions
pass (164 typed tests, zero failures); focused lint and diff checks pass.
All12 native returns pass full local2025v5.4 XSD. Ten mirrored alterations per
packet reject120 native and120 fresh-PDF exports. All120 corresponding public
alterations report graph errors;48 also reject preparation, while72 still prepare
through existing deferred161. The tests explicitly preserve those accepted-after-
error outputs, rather than counting them as successful rejection checks. No
preparation-after-error fix is included.

All190 PDF pages received qualified observation:36 new unique images inspected
in nine contact sheets and154 exact prior matches. Business names, activity
codes, owners and amounts reconcile. Reopened outputs contain zero fields/widgets.
Existing positive Schedule C choices3, headers68 and blank zeros76 repeat without
repair. Broader source combinations and IRS acceptance remain open.

Evidence: `.state/research/form8995a-sstb-services-2026-10-12/` retains source
records, independent calculations, full native/PDF packets, schema provenance,
mutation outcomes including the72 accepted-after-error XML files, rendered pages
and review mappings. The frozen main checklist remains unchanged.

## October 12 SSTB zero deduction and inclusive endpoint checkpoint

Retained Schedule C SSTBs now prepare a zero deduction at the inclusive upper
phase endpoint, after whole-dollar rounding, and when qualified dividends and
capital distributions exhaust the income cap. Legacy staged zero claims still
reject. Parent wage/property limits become zero when rounded QBI is zero, while
Schedule A retains its own applicable amounts. This follows the
[Form8995-A instructions](https://www.irs.gov/instructions/i8995a) for Exception2,
parent lines4/7 and the income limit.

Twelve complete packets cover all five statuses, either joint proprietor,
partial/capped owner wage bases, near-upper rounding and single/joint zero income
caps. All have a zero QBI deduction. The rounded-QBI case retains Schedule A
applicable wages1 with parent wages0. Cap cases retain business QBI929 and
capital/qualified-dividend totals221,800 or441,800, exceeding pre-QBI taxable income.

| Case | Taxable income | Regular tax | Independent total tax | Refund or owed |
| --- | ---: | ---: | ---: | ---: |
| hoh-upper | 247,300 | 53,899 | 55,470 | owed5,470 |
| joint-primary-upper | 494,600 | 111,837 | 118,526 | owed68,526 |
| joint-spouse-near-upper | 494,599 | 111,837 | 118,526 | owed68,526 |
| joint-spouse-upper | 494,600 | 111,837 | 115,255 | owed65,255 |
| joint-spouse-zero-income-cap | 412,929 | 47,434 | 54,964 | owed54,964 |
| mfs-upper-nonhalf | 247,300 | 55,638 | 57,813 | owed7,813 |
| mfs-upper | 247,300 | 55,638 | 57,814 | owed7,814 |
| qss-upper | 247,300 | 44,749 | 46,391 | refund3,609 |
| single-near-upper | 247,299 | 55,638 | 57,138 | owed7,138 |
| single-rounded-qbi | 247,299 | 55,638 | 56,420 | owed6,420 |
| single-upper | 247,300 | 55,638 | 57,139 | owed7,139 |
| single-zero-income-cap | 208,679 | 24,049 | 25,119 | owed25,119 |

All12 native/PDF final-tax amounts match independent Decimal calculations.
The exact-half MFS case now computes Medicare wage tax932, total57,814 and
owed7,814. Its neighboring nonhalf case preserves the endpoint and reconciles.

The12 complete packet tests and36 related regressions pass (48 total). All12
native returns pass full local2025v5.4 XSD. Nineteen alterations per packet reject
both exports (456 attempts), including removal of the retained zero-claim source.
Forty-eight public alterations and seven above-upper cases reject (55 checks).

All190 PDF pages received qualified observation:95 new unique images in24
contact sheets,69 exact prior matches and26 within-batch duplicates. Reopened
outputs contain zero canonical fields/widgets. Existing positive Schedule C
choices3, headers68 and blank zeros76 repeat. The existing parent builders also
populate PartIII when line10 is not less than line3; new deferred163 records
that conditional-projection issue without repair. These are reviewed test
artifacts, not approved filing packets. The broad parent task remains open.

Sources, independent proof, XSD logs/digest, commands, original rejected inputs
and visual mappings are retained under
`.state/research/form8995a-sstb-zero-2026-10-12/`.

## October 12 SSTB investment sources and income cap checkpoint

Reviewed accounting SSTBs now retain owned interest, ordinary/qualified dividends
and capital distributions through the public graph, parent Form8995-A,
ScheduleA, full native return and PDF. The qualified-dividend review answer is
bound to the actual source total. Complete-return replay verifies copy identities,
recipient ownership, qualified holding evidence, distinct capital contributions,
wage/business income, filed half-SE and the final preferential-tax worksheet.
Historical staged claims without the ScheduleC source retain their zero-gain guard.

Nine complete packets cover all five filing statuses, either joint business
owner, mixed-spouse portfolios, payroll/no-employees and partial/capped Social
Security wage bases. Eight retain interest1,700, ordinary dividends3,000,
qualified dividends1,500 and distributions1,800, giving line34 of3,300. The
income-cap case has no outside wages and dividends200,000, all qualified: its
line34 is201,800, line35 is12,372, and the2,474 income limit caps the3,438
business component. This follows the
[Form8995-A line34 instructions](https://www.irs.gov/instructions/i8995a).

| Case | QBI deduction | Taxable income | Regular tax | Total tax | Refund or owed |
| --- | ---: | ---: | ---: | ---: | ---: |
| hoh-owner-only | 1,561 | 219,364 | 44,959 | 46,293 | 3,707 |
| mfs-payroll | 1,934 | 226,866 | 49,099 | 51,108 | 1,108 |
| primary-capped-owner-only | 2,872 | 420,178 | 88,022 | 90,796 | 40,796 |
| primary-partial-payroll | 3,811 | 417,611 | 87,201 | 93,231 | 43,231 |
| qss-payroll | 3,711 | 209,339 | 35,652 | 36,739 | 13,261 |
| single-income-cap | 2,474 | 211,698 | 25,490 | 30,644 | 30,644 |
| single-payroll | 1,934 | 226,866 | 49,099 | 50,433 | 433 |
| spouse-capped-payroll | 3,890 | 419,160 | 87,696 | 90,470 | 40,470 |
| spouse-partial-owner-only | 2,830 | 418,592 | 87,514 | 93,544 | 43,544 |

HOH and QSS receive refunds; the other cases owe. Independent Decimal arithmetic
reconciles profit, owner SE bases, whole-dollar half-SE, applicable percentages,
wage-phase reductions, income caps, preferential tax, Additional Medicare, NIIT,
zero AMT and payments against both prepared data and native XML. The cap case
uses the published Single9,850–9,900 tax-table cell988 under the
[2025 tax tables](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf); its NIIT is1,137.
QSS owes no NIIT; the other seven regular portfolios owe247 each.

Nine complete-return tests pass full2025v5.4 XSD;29 related typed regressions
and the additional source-boundary test pass (39 tests total). Eighteen altered records per case
reject both native and fresh-PDF export (324 attempts), including mirrored
investment copies, unrelated owners, duplicate copies, holding review, capital
contribution identity/amount, changed review answers and stale final-tax inputs.
Thirty-six public source/preparation alterations reject. One additional test
prepares interest-only, ordinary-plus-capital and qualified-only inventories,
then rejects each inverted review answer (three more public rejections).
Reversing investment copy order preserves tax and successful preparation.

All142 PDF pages received qualified observation:58 newly inspected images in15
contact sheets,70 exact matches to previously observed images and14 within-batch
duplicates. Printed limits, amounts, percentages and balances reconcile; reopened
PDFs have no canonical fields or Widget annotations. Existing positive ScheduleC
skip choices3, name/header68 and blank-zero76 issues repeat without repair.
Broader SSTB categories, multiple businesses, authenticated records and IRS
acceptance remain open. Evidence, commands, original eight input rejections,
source packets, XSD logs and independent/visual review mappings are retained in
`.state/research/form8995a-sstb-investments-2026-10-12/`.

## October 12 joint SSTB owners and mixed wages checkpoint

A reviewed accounting SSTB may now belong to either spouse on a joint return,
with issued external wage copies for both spouses. The public source selects
the actual proprietor; the common native/PDF validation replays the existing
owned Schedule SE ledger and selects that proprietor's computation. It checks
the actual return/header identities, business source, per-owner wage base and
filed SE deduction instead of treating the primary filer and combined wages as
the sole owner. Nonjoint spouse ownership remains excluded.

Four complete cases retain one28,431-profit business and two wage copies totaling
420,000, with payroll10,000 or an owner-only workforce review. The proprietor's
Social Security wages are100,000 or176,100. The first pair owes SE tax4,017 with
half-SE2,009; the capped pair owes761 with half-SE381. This owner separation
follows the [Schedule SE joint-return instructions](https://www.irs.gov/instructions/i1040sse).
Joint Additional Medicare is1,766 in all four cases; NIIT and AMT are zero.
The applicable SSTB percentages are79.678% or78.05%, using the existing joint
threshold394,600 and100,000 phase range.

| Case | QBI deduction | Taxable income | Regular tax | Total tax | Owed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Primary partial payroll | 4,165 | 410,757 | 85,568 | 91,351 | 41,351 |
| Spouse partial owner-only | 3,355 | 411,567 | 85,827 | 91,610 | 41,610 |
| Primary capped owner-only | 3,418 | 413,132 | 86,328 | 88,855 | 38,855 |
| Spouse capped payroll | 4,275 | 412,275 | 86,054 | 88,581 | 38,581 |

Independent Decimal proof reconciles profit, owner Social Security/Medicare,
whole-dollar half-SE, applicable QBI/payroll amounts, phase reductions, ordinary
tax, zero AMT, payments and owed against native XML. All four complete-return
tests,16 related typed regressions and full2025v5.4 XSD validations pass. Fifteen altered records per case
reject native and fresh-PDF export (120 attempts), including copied owner/payroll
changes, retained owner computations and changed header spouse identity. Twenty
public source/preparation changes reject. Reversing both wage copies preserves
tax and successful preparation.

All60 packet pages received qualified review through38 unique images across ten
contact sheets and22 exact within-batch duplicates. Schedule C and SE retain the
actual proprietor, while primary-only/reversed8995A names, blank required zeros
and skipped Schedule C choices repeat deferred68/76/86. Original spouse-source
graph errors that still prepared incomplete returns repeat161; those failures
remain in the before log. Broader SSTB categories, multiple businesses, investment
combinations, source authenticity and IRS acceptance remain open. Evidence:
`.state/research/form8995a-sstb-joint-owners-2026-10-12/`, including source/packets,
test logs, independent proof and observed-image mappings.

## October 12 HOH and QSS public SSTB source checkpoint

The public Schedule C accounting-SSTB dispatcher now accepts head-of-household
and qualifying-surviving-spouse filing statuses. The calculator and native/PDF
builders already supported both; the public status filter prevented their
reviewed source records from reaching those builders. Existing payroll,
classification, owner, household and filed-half-SE checks continue to apply.

Four complete returns cover both statuses with employee payroll and with a
reviewed owner-only workforce. Each retains profit28,431, wage income210,000,
SE tax761, deductible half-SE381, QBI28,050 and AGI238,050. HOH uses standard
deduction23,625 and pre-QBI income214,425; QSS uses31,500 and206,550. Both use
the nonjoint197,300 QBI threshold and50,000 phase range under the
[2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a).
The resulting applicable percentages are65.75% and81.5%.

| Case | QBI deduction | Taxable income | Regular tax | Total tax | Refund |
| --- | ---: | ---: | ---: | ---: | ---: |
| HOH payroll | 3,552 | 210,873 | 42,803 | 43,890 | 6,110 |
| HOH owner-only | 2,426 | 211,999 | 43,164 | 44,251 | 5,749 |
| QSS payroll | 4,480 | 202,070 | 34,283 | 35,370 | 14,630 |
| QSS owner-only | 3,726 | 202,824 | 34,449 | 35,536 | 14,464 |

Independent Decimal arithmetic reconciles source payroll, rounded applicable
amounts, parent phase reductions, zero AMT, Additional Medicare326 and final tax
against emitted XML; ordinary tax uses the
[2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf).
All four focused tests,20 related typed regressions and four full2025v5.4 XSD validations pass. Twelve altered
records per case reject native and fresh-PDF export (96 attempts);16 public
owner/payroll/review/household changes reject at calculation or preparation.

All58 packet pages received qualified visual review through29 unique rendered
images in eight contact sheets and29 exact within-batch duplicates. Both status
headers correctly print Avery Child. Existing68 reversed component names,
76 blank required zeros and86 Schedule C skipped-line choices remain deferred.
The original pre-change cases also repeat deferred161: graph errors could still
produce incomplete exports without QBI. That general defect was not repaired.
Broader SSTB categories, joint spouse ownership, source authenticity and IRS
acceptance remain open. Evidence is retained under
`.state/research/form8995a-sstb-statuses-2026-10-12/`, including original failures,
complete packets, mutation logs, independent arithmetic and observed page hashes.

## October 12 joint aggregation investment owners checkpoint

Joint direct-business and intact S-corporation aggregations now retain investment
copies belonging to either actual spouse, including spouse-only portfolios and
mixed ownership. The shared investment guard accepts a second owner only when
the aggregation is a joint return; its default remains primary-only. Missing,
changed, duplicate and unrelated owners reject, and the separate-filing spouse's
portfolio still rejects for MFS.

Four complete returns retain two interest copies totaling 1,700, ordinary
dividends 3,000, qualified dividends 1,500, capital distributions 1,800 and two
identified broker transactions. Long-term gain is 5,800; short-term gain of 1,000
or loss of 1,000 gives total gain 6,800 or 4,800. Form 8995-A line 34 therefore
uses 7,300 or 6,300, respectively, under the
[line 34 instructions](https://www.irs.gov/instructions/i8995a).
Both issuer statements remain byte-for-byte intact.

| Case | QBI deduction | Taxable income | Regular tax | Total tax | Owed |
| --- | ---: | ---: | ---: | ---: | ---: |
| direct-primary-spouse-portfolio | 36,525 | 419,975 | 87,277 | 97,092 | 37,090 |
| direct-spouse-mixed-portfolio | 37,130 | 417,370 | 86,613 | 96,352 | 36,350 |
| rpe-primary-spouse-portfolio | 68,747 | 359,253 | 71,348 | 71,709 | 61,709 |
| rpe-spouse-mixed-portfolio | 66,250 | 463,750 | 101,285 | 101,722 | 91,102 |

Independent decimal calculations reconcile source profit, half-SE allocations,
phase reductions, income limits, preferential tax, zero AMT, Medicare, NIIT and
payments against XML. NIIT is 437 or 361. Reversing all investment inventories
preserves tax and successful preparation. Five focused and 26 related typed
tests pass. Four full 2025v5.4 returns pass XSD; 98 altered native/fresh-PDF
export attempts and 20 public-source/preparation attempts reject.

The 87-page packets received qualified visual review: 34 new unique page images
were observed in nine contact sheets, 51 matched previously observed images and
two duplicated current images. Final regeneration changed no page image. Native
Schedule D totals/indicators still repeat deferred15; component names and blank
zeros repeat68/76. These findings remain deferred, not repaired. Positive net
capital gains here do not resolve deferred159/160 net-loss behavior. Schema
validation, source authenticity, business-rule acceptance and IRS acceptance
remain separate claims; broader elections and investment categories remain open.
Evidence is retained in
`.state/research/form8995a-aggregation-joint-investments-2026-10-12/`, including
source packets, test logs, independent proof and visual-review mappings.

## October 12 aggregation with investment-income checkpoint

Direct-owner and intact S-corporation aggregations now accept retained interest,
ordinary/qualified dividends and capital-gain distributions. The RPE dispatcher
preserves investment source contributions instead of rejecting them and forcing
a zero capital limit. The common native/PDF join replays identified investment
copies, recipient ownership, qualified-dividend holding review, payer rows,
capital contributions, wage/business income, adjustments and final preferential
tax. Group business income remains separate from portfolio income.

The [Form8995-A line34 instructions](https://www.irs.gov/instructions/i8995a)
include qualified dividends and net capital gain in the income limitation.
Each new case retains two interest sources totaling1,700 and two dividend sources
with ordinary3,000, qualified1,500 and capital distributions1,800. Thus line34
is3,300. The three RPE cases preserve the original issuer statements byte-for-byte.
Five direct cases and three RPE cases span all five filing statuses, including
spouse-owned businesses, phase-in, full limitation and a binding income cap.
Investment copies in this checkpoint belong to the primary filer; other owner
inventories and wider investment categories remain outside this proof.

| Case | QBI deduction | Taxable income | Regular tax | Total tax | Refund / owed |
| --- | ---: | ---: | ---: | ---: | --- |
| hoh-direct-four | 8,574 | 223,363 | 46,239 | 48,763 | 11,237 refund |
| joint-primary-rpe-phase | 68,860 | 356,140 | 70,871 | 71,118 | 61,118 owed |
| joint-spouse-direct-four | 38,038 | 413,462 | 85,873 | 95,498 | 35,496 owed |
| joint-spouse-rpe-full | 66,250 | 458,750 | 100,365 | 100,612 | 89,992 owed |
| mfs-direct-three | 7,782 | 222,164 | 47,594 | 50,442 | 9,558 refund |
| qss-direct-three | 9,739 | 204,457 | 34,578 | 36,504 | 23,496 refund |
| single-direct-three | 7,782 | 222,164 | 47,594 | 49,767 | 10,233 refund |
| single-rpe-income-cap | 45,490 | 185,260 | 37,012 | 37,259 | 37,259 owed |

Independent decimal arithmetic checks source profits, allocated half-SE, group
wage/property limits, phase reductions, the income cap, regular tax, zero AMT,
Medicare, NIIT and payments against native XML. The Single RPE case caps the
48,000 business component at45,490:20% of230,750 minus3,300. QSS income245,696
is below the250,000 NIIT threshold; all seven other cases have247 NIIT on6,500
investment income. The [NIIT instructions](https://www.irs.gov/instructions/i8960)
and [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) support those
status-specific computations. Qualified dividends/gains receive15% in these cases.

All eight complete packet tests and eight full2025v5.4 return XSD validations
pass. Fifteen altered records per case reject both native and fresh-PDF export
(240 attempts), covering owners, copies, holding evidence, contribution identity
and amount, capital limit, wages, AGI, gross income, payer rows, deduction and tax.
Twenty-four invalid public-source/preparation cases reject; reversing investment
inventories preserves final tax and native preparation for all eight cases.
Related direct/joint/nonjoint aggregation and investment/WOTC regression passes
45/0 (5m40s); the final retained path-only adapted RPE gate passes4/0 (20s).
Original fixture-path issues remain deferred65/66. Final packet rerendering
introduced no new image hashes.

The155 packet pages include annual and issued disclosures. All52 new distinct
images were observed on13 contact sheets;94 pages exactly match prior observed
images and nine are within-batch duplicates. Reopened packets have no remaining
fields/widgets. Printed phases, line34/35/36/39, owners, member/continuation rows,
annual disclosures, investment totals and final amounts reconcile. Existing
68/76 presentation qualifications repeat: primary-only or reversed component
names, MFS spouse-name duplication and some blank required zeros. No new
presentation finding or deferred repair is recorded.

Evidence: `.state/research/form8995a-aggregation-investments-2026-10-12/` retains
before/after replays, sources/pending/XML/PDFs, test/XSD logs, independent decimal
proof, rendered-page mapping and visual review. Synthetic source records do not
prove external authenticity or IRS acceptance. Other source combinations,
elections and deferred findings remain open; the broad main task stays open.

## October 12 nonjoint aggregation filing-status checkpoint

Direct-owner and intact S-corporation aggregations now support HOH, QSS and
reviewed MFS filings. Each uses the nonjoint197,300 threshold and50,000 phase-in
range from the [2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a).
QSS retains its joint-sized standard deduction and tax brackets while using
the nonjoint QBI band. HOH/QSS fixtures retain reviewed nondependent qualifying
children and the related household and surviving-spouse facts.

MFS requires the existing separate-property review extended with the actual
business owner's TIN: both domiciles, no elected community regime or retained
community income, separately owned wages/business income and a nonitemizing
spouse. Native and fresh-PDF export bind that review to the retained public
source, actual owner/spouse and mailing state. These guards preserve the
[Publication555](https://www.irs.gov/publications/p555) community-property boundary;
they do not infer domicile from a mailing address. MFS aggregation PDFs now
use the aggregation owner/return join instead of the unrelated SSTB dispatcher.

| Case | Businesses | QBI deduction | Regular tax | Other taxes | Total tax | Refund / owed |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| HOH direct | 3 | 9,568 | 41,245 | 1,926 | 43,171 | 16,829 refund |
| HOH direct | 4 | 9,557 | 44,406 | 2,277 | 46,683 | 13,317 refund |
| HOH RPE | 3 | 48,000 | 61,740 | 0 | 61,740 | 51,740 owed |
| HOH RPE | 4 | 66,250 | 93,853 | 0 | 93,853 | 83,853 owed |
| MFS direct | 3 | 8,590 | 45,817 | 2,601 | 48,418 | 11,582 refund |
| MFS direct | 4 | 8,366 | 49,046 | 2,952 | 51,998 | 8,002 refund |
| MFS RPE | 3 | 48,000 | 66,235 | 0 | 66,235 | 56,235 owed |
| MFS RPE | 4 | 66,250 | 98,347 | 0 | 98,347 | 88,347 owed |
| QSS direct | 3 | 10,547 | 33,201 | 1,926 | 35,127 | 24,873 refund |
| QSS direct | 4 | 10,748 | 35,329 | 2,277 | 37,606 | 22,394 refund |
| QSS RPE | 3 | 48,000 | 48,214 | 0 | 48,214 | 38,214 owed |
| QSS RPE | 4 | 66,250 | 70,234 | 0 | 70,234 | 60,234 owed |

Independent decimal arithmetic reconciles source profits, half-SE allocation,
group wages/property, phase reductions, income limits, tax, zero AMT and final
refunds/balances. The [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf)
supplies status-specific rates and offsets. Six direct cases exercise phase-in;
six RPE cases retain the original issuer bytes and full limitation. Component
checks cover197,300 rejection and197,301/247,299/247,300/247,301 boundaries.

All12 typed packet tests and all12 full2025v5.4 return XSD checks pass. Sixty-eight
altered records reject both native and fresh-PDF export (136 attempts), and28
invalid public-source cases reject. Related regression:30 direct/joint/RPE/SSTB
tests,19 input-source tests and4 retained path-only adapted RPE tests pass.
The original RPE fixture-path issue remains deferred65/66.

The196 packet pages include annual and issued disclosures. All63 new distinct
images were observed on16 contact sheets;115 pages exactly match previously
observed images and18 are within-batch duplicates. Final rerendering introduced
no new hashes. Full packets reopen without fields/widgets; source owner,
aggregation members, phase fields, deductions and continuation rows reconcile.
All four QSS first pages were also checked individually: Avery Child appears
in the shared HOH/QSS nondependent-child field required by
[Form1040](https://www.irs.gov/pub/irs-prior/f1040--2025.pdf).
Existing deferred68/76 qualifications persist: MFS spouse-name duplication,
blank names on some retained Schedules1/2 and blank required zero fields.

Evidence: `.state/research/form8995a-aggregation-statuses-2026-10-12/`, including
source/pending packets, before/after replays, XSD/test logs, independent decimal
proof and final rendered-page mapping/visual review. The main task stays open
for other source combinations and election histories. Source authenticity and
IRS acceptance remain separate; no deferred item was implemented.

## October 12 joint RPE ownership and phase-in checkpoint

One intact S-corporation aggregation can now belong to either actual joint
filer, with the joint income threshold and phased wage/property limitation.
Previously the source dispatcher and export join required a Single filer above
247,300. The recipient TIN must match exactly one current owner; missing spouse
identity, duplicate owners and an unrelated recipient reject. The actual K-1,
parent/companion, Schedule E income and finalized deduction still reconcile.

The [2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a)
require the complete RPE aggregation and its issued disclosure to remain intact.
The six new synthetic cases reuse the original three-/four-business issuer
statement bytes, recipient Alex Taxpayer and all K-1/member facts. Spouse cases
make Alex the spouse of Sam Example; they do not rewrite a PDF's recipient TIN.
Outside wages vary with complete employer-specific Social Security and Medicare
withholding. The two statement attachments remain distinct and referenced.

| Cases (primary and spouse each) | Members | Before-QBI income | Phase reduction | Deduction | Total tax | Payments | Balance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Joint phased limitation | 4 | 418,500 | 896 (23.9%) | 69,104 | 69,549 | 10,000 | 59,549 |
| Joint full limitation | 4 | 518,500 | n/a | 66,250 | 98,846 | 10,620 | 88,226 |
| Joint nonbinding limitation | 3 | 438,500 | n/a | 48,000 | 79,414 | 10,800 | 68,614 |

Independent decimal arithmetic verifies group QBI, wages, property, limitation,
phase reduction, taxable income, regular tax, zero AMT, payments and balances.
The [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) gives24%
less14,306 for the first/third rows and32% less45,874 for the second. The latter
two rows retain620 excess Social Security withholding; the third also retains180
additional Medicare withholding with zero additional tax. Nonpassive issuer
income produces no NIIT; it is not self-employment income.

Six typed complete-packet tests pass, and all six XMLs pass the full2025v5.4
return XSD. Forty-two altered records reject both native and fresh-PDF export
(84 attempts), covering owner mismatch/ambiguity, income, final deduction,
K-1 wages, missing members and a changed issued-PDF digest. Eighteen invalid
public-owner cases reject. Direct-owner regression passes16/0 (including phase-in);
the retained path-only adapted RPE gate passes4/0. Original fixture-path issues
remain deferred65/66. Component boundaries include394,600 (guarded),
394,601,494,599,494,600 and494,601; nonbinding limits omit Part III.

The six full packets contain76 pages, represented by49 distinct rendered hashes
observed on13 contact sheets. Annual and issued disclosures are included in this
count, not counted again as separate PDFs. Packets reopen without fields/widgets.
Phase fields, source names/amounts, continuation rows and annual owner identity
reconcile. Existing68/76 qualifications repeat: the native joint header and
printed8995-A/Schedule B retain only the primary name, and some required zeros
remain blank, including8959 lines6/7. This is qualified visual evidence.

Evidence: `.state/research/form8995a-joint-rpe-2026-10-12/`, including original
rejection replay, final source/pending packets, XSD/test logs, independent decimal
proof, rendered-page mapping and visual review. These synthetic issuer records
do not establish external authenticity or IRS acceptance. Multiple issuers,
other QBI families, lower-income simplified filings and wider election histories
remain outside this checkpoint; the broad board task stays open. No deferred
item was implemented.

## October 12 direct-owner aggregation phase-in checkpoint

Direct-owner aggregations now support the Single and MFJ phase-in bands as well
as the previously verified full-limit band. The shared calculation applies the
group wage/property limitation gradually; native Part III fields and printed
lines17–26 use those same filed amounts. When the limitation does not bind,
Part III remains omitted. Source/member ownership, reviewed half-SE allocation,
annual disclosure and final-return reconciliation remain required.

The [2025 Form8995-A Part III instructions](https://www.irs.gov/instructions/i8995a)
apply this reduction inside the income band only when line10 is below line3.
Tests cover the lower threshold rejection, one dollar above it, one dollar
below the upper endpoint, the upper endpoint itself and one dollar above it
for every case. A separate six-case property-source replay confirms that
nonbinding limits omit native phase fields and PDF Part III values.
The historical full-limit checkpoint below remains evidence for its original
scope; phase-in is no longer excluded from the direct-owner route.

| Filing/owner cases | Businesses | Before-QBI income | Phase-in | Reduction | QBI deduction | Total tax | Balance/refund |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Joint primary and spouse | 3 | 445,000 | 50.4% | 12,528 | 34,829 | 93,711 | 33,354 owed |
| Joint primary and spouse | 4 | 445,000 | 50.4% | 15,246 | 40,004 | 93,103 | 33,101 owed |
| Single | 3 | 223,446 | 52.292% | 3,249 | 8,590 | 47,743 | 12,257 refund |
| Single | 4 | 233,312 | 72.024% | 5,446 | 8,366 | 51,323 | 8,677 refund |

Independent decimal calculations verify business profits, gross-income shares
of filed half-SE, group wage/property limits, phase-in, taxable income,
regular tax, zero AMT, Medicare, payments and balances/refunds. Regular tax uses
the [2025 Publication1040 computation worksheet, page14](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf):
32% less45,874 for these joint cases and32% less22,937 for the single cases.
Joint wages are239,714/200,250; single wages180,000. Synthetic payroll retains
regular and additional Medicare withholding, including filed additional
withholding357/2 for the joint cases. No old payroll fixture is repaired.

Six typed complete-packet tests pass (46s), plus one six-case nonbinding test.
All six XML returns pass the local2025v5.4 full-return XSD. Thirty-six altered
pending records reject both native preparation and fresh PDF construction:
phase income changed in both retained parent/companion records, final QBI,
actual business income/property, half-SE and annual acquisition events.
Direct source/election/high-income regression passes15/0 (1m7s); retained
path-only adapted RPE regression passes4/0 (20s). Original RPE path failures
remain deferred65/66; the repository fixture paths are unchanged.

All129 packet pages were represented by71 unique PNG hashes and observed on
18 contact sheets. Part III shows50.4%,52.292%,72.024%; lines12/26, native
reductions and final deductions reconcile. Three fourth-business continuations
and all six annual statements are present. Annual statement pages are included
in the129 total, and the six nonbinding native-only replays add no full-PDF
count. Packets reopen without fields/widgets. Existing qualifications68/76
remain: joint native headers retain the primary name only, single-four printed
Schedules1/2 have blank names, and some required zero fields remain blank.
This is qualified review, not clean parity or an accepted filing.

Evidence is retained under
`.state/research/form8995a-aggregation-phasein-2026-10-12/`: public source/pending
replays, six packets with XSD logs, focused/nonbinding/regression logs,
`independent-proof.json`, `review.py`, `review-mapping.json` and
`visual-review.json`. Source authenticity, broader owner/election combinations,
other RPE combinations, business-rule and IRS acceptance remain open. No deferred item was
implemented and the broad main-board task remains open.

## October 12 joint direct-owner aggregation and annual disclosure

A joint filer can now export one qualifying positive Schedule C aggregation
owned entirely by either spouse above the full wage/property-limit threshold.
Previously the direct-owner source guard accepted only Single returns. The new
route binds the actual owner across retained business records, the joint filer,
W-2 wages and owned Schedule SE; missing SE identity or source inventory rejects.
Annual disclosure now identifies the spouse owner when applicable. Existing
Single and RPE routes retain their separate source requirements.

The [2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a)
place the joint phase-in band at394,600–494,600 and require annual aggregation
disclosure. This extension applies above494,600; component tests reject494,600
and accept494,601. Mixed owners inside one direct-owner group, phase-in,
SSTBs, other simultaneous QBI routes, prior losses, WOTC and positive qualified
dividends/capital gains are outside this extension and retain their guards.

Four persisted synthetic returns cover primary/spouse ownership with three or
four businesses, reviewed current-year acquisitions and fourth-row continuation.
Each has400,000 owned wages,120,000 federal withholding and1,800 additional
Medicare withholding. Independent decimal arithmetic reconciles gross-income
allocation of the filed half-SE deduction, group QBI, wage/property limitation,
regular tax, additional Medicare, payments and final balance against native XML.

| Owner cases | Businesses | Half-SE | Group QBI | QBI deduction | AGI | Total tax | Balance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Primary and spouse | 3 | 3,214 | 236,786 | 22,500 | 636,786 | 152,843 | 31,043 |
| Primary and spouse | 4 | 3,750 | 276,250 | 25,000 | 676,250 | 167,183 | 45,383 |

Three-business half-SE shares are1,353/1,015/846; four-business shares are
1,364/1,023/852/511. These explicitly reviewed fixtures do not repair the
separate ordinary-route allocation finding157. Regular tax is143,070/156,007;
SE tax6,428/7,499 and additional Medicare3,345/3,677 complete the tax totals.

Verification: four typed packet tests pass; all four complete returns validate
against local2025v5.4 XSD. Four public mixed-owner cases and four threshold
boundary cases reject. Altered ownership, annual identity, deductions, payroll,
SE inventory and filer facts reject44/44 native and44/44 fresh-PDF calls.
Existing direct aggregation regression passes11/0. The unchanged RPE test file
has four stale fixture-path failures (existing65/66); a retained local copy with
only imports/fixture locations adapted passes4/0. This is separate regression
evidence, not a claim that the original RPE test file passes or was repaired.

The four complete PDFs contain20/20/23/23 pages:86 represented pages and41
unique rendered images, all observed on11 contact sheets. Annual disclosures
are already included in those totals. Schedule C/SE owner names and TINs,
aggregation rows, totals, disclosure and continuation are visible and unclipped.
Reopened packets contain no remaining form fields/widgets. Existing native
joint-name68 and blank-zero76 qualifications remain; no clean parity approval
or deferred repair is claimed. These synthetic cases do not prove authentic
source documents, accepted election history, business-rule acceptance or IRS
acknowledgments; the broad main-board task remains open.

Evidence: `.state/research/form8995a-joint-aggregation-2026-10-12/` retains
before/after public replays, four source/XML/PDF/attachment packets and XSD logs,
`tests.log`, `regression.log`, `regression-replay.log`,
`rpe-adapted-regression.log`, `independent-proof.json`, `review.py`,
`review-mapping.json` and `visual-review.json`. All86 page hashes map to the41
observed images; no earlier visual review is borrowed.

## October 12 qualified dividends with joint loss-employer credits

Current-loss WOTC returns now accept positive qualified dividends when each
employer's retained zero-dividend answer is false and agrees with the investment
inventory. A zero-dividend answer remains required and is checked both ways;
false with no qualified dividends and true with positive dividends both reject.
The previous true-only payroll schema unnecessarily excluded this combination.
Existing native/full-PDF investment replay still validates issued copies, owner,
qualified holding-period review, source totals and final preferential-rate tax.
Other WOTC routes retain their existing source and export conditions.

The [Form8995-A line34 instructions](https://www.irs.gov/instructions/i8995a)
include qualified dividends with net capital gains in the QBI income limitation.
Four joint common-control cases now retain two dividend copies with ordinary
amounts2,000/1,000, qualified amounts1,000/500 and capital distributions1,000/800.
Each qualified copy has its dated ordinary-stock holding review. Interest1,700,
business profits2,000/4,000/-1,000/-2,000, half-SE156, and credit2,400 remain
unchanged; line34 is3,300. Dividends/gains receive15% treatment in these cases.

| Employer arrangement | QBI | Taxable income | Regular tax | Total tax | Balance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Both loss-making | 150 | 577,694 | 140,627 | 141,959 | 81,959 |
| Primary profitable / spouse loss | 292 | 577,552 | 140,578 | 141,910 | 81,910 |
| Primary loss / spouse profitable | 427 | 577,417 | 140,530 | 141,862 | 81,862 |
| Both loss-making / phase-in | 332 | 450,768 | 97,811 | 98,002 | 38,002 |

The phase-in ratio remains56.5% and components112/220; line35 is447,800
and line36 is89,560. All four have247 NIIT and zero AMT. Independent decimal
calculations verify loss allocation, QBI limits, regular/AMT preferential tax,
SE/Medicare, credits and balance against emitted native amounts.

Four typed packet tests pass (1m4s), plus one focused zero-review test covering
all four employer arrangements. Related capital-distribution, ordinary/group
WOTC and investment regression passes24/0 (5m1s). In total20 public mutations and72 native/72
fresh-PDF mutations reject; these include inconsistent qualified copies, final
qualified totals, individual payroll reviews and changes too small to alter the
rounded wage-credit shares. Reversing all related source inventories preserves
tax and native preparation. Initial fixture export correctly rejected missing
holding-period evidence; the retained fixtures now supply that existing review.

All four complete returns pass TY2025v5.4 XSD. The160-page qualified review
uses26 newly observed images on seven contact sheets,132 exact matches to
previously observed pages and two within-batch duplicates. Reopened PDFs have
zero fields/widgets. Existing26/68/76/84 qualifications recur: skipped3800
SectionB intermediates, primary-only6251 name, partly blank zero cells and
missing native6251 line1a. Group statement members/shares and reference IDs
reconcile. No new layout finding or deferred repair is recorded.

Evidence: `.state/research/form8995a-group-dividends-2026-10-12/` contains
packet inputs, pending/XML/PDF, independent arithmetic, XSD results, image
provenance and test logs. Synthetic reviewed records do not authenticate issued
sources; the broader QBI parent remains open.


## October 12 capital distributions with joint loss-employer credits

The current-loss route now permits retained capital gains alongside employer
WOTC. The former zero-preferential-income guard now checks the actual condition
in the payroll review: zero qualified dividends. Positive qualified dividends
remain rejected. Existing investment-source replay still binds payer, recipient,
issued-copy amounts, capital contributions and the final tax worksheet; the
payroll, proprietor and group-allocation checks remain intact.

The [Form8995-A line34 instructions](https://www.irs.gov/instructions/i8995a)
require capital gain in the income limitation, while the
[Form5884 line2 instructions](https://www.irs.gov/instructions/i5884) reduce wage
deductions by the determined credit. Four joint common-control returns now
combine these rules with four business profits2,000/4,000/-1,000/-2,000,
owned half-SE deductions14/142, interest1,700, ordinary dividends3,000 and
capital distributions1,800. Two fund copies retain zero qualified dividends.
The shared employee cap gives2,400 WOTC, allocated1,200 per employer.

| Employer arrangement | QBI | Taxable income | Regular tax | Total tax | Balance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Both loss-making | 150 | 577,694 | 140,927 | 142,259 | 82,259 |
| Primary profitable / spouse loss | 292 | 577,552 | 140,878 | 142,210 | 82,210 |
| Primary loss / spouse profitable | 427 | 577,417 | 140,830 | 142,162 | 82,162 |
| Both loss-making / phase-in | 332 | 450,768 | 98,066 | 98,257 | 38,257 |

Capital distributions receive15% treatment in these cases. The phase-in return
has451,100 taxable income before QBI,56.5% phase-in and112/220 business
components; line34 retains1,800, line35 is449,300 and line36 is89,860.
All four have247 NIIT and zero AMT. An independent decimal ledger checks
regular tax using [2025 tax computation offsets](https://www.irs.gov/publications/p1040),
AMT preferential tax, SE/additional Medicare, credit use and balance against
native XML. Source order reversal preserves the result and prepares natively.

The focused typed suite passes4/0 (57s); the related ordinary/group WOTC and
investment regression passes17/0 (3m46s). It rejects16 public-source mutations
and60 native/60 fresh-PDF mutations, including a small payroll mismatch that
leaves rounded credit shares unchanged. Those four small changes have no
calculation diagnostic but both exporters reject the issued-wage mismatch.
All four full returns pass local TY2025v5.4 XSD.

The160-page qualified review uses30 newly observed images on eight contact
sheets,128 exact prior-image matches and two within-batch duplicates. All
reopened PDFs have zero fields/widgets. Group allocation page31 retains both
employers and their1,200 shares; native statement references reconcile.
Existing26/68/76/84 qualifications recur: skipped Form3800 SectionB amounts,
joint Form6251 primary-only name, blank required zeros and omitted native6251
line1a. No new layout issue or deferred repair is recorded.

Evidence: `.state/research/form8995a-group-capital-2026-10-12/` retains the
original four calculation/export blocks, unchanged source inputs, prepared
packets, independent arithmetic, image mappings and test logs. Synthetic source
joins do not authenticate issued records; wider qualified-dividend and other
QBI combinations and the broad main-board parent remain open.

## October 12 unequal cent payroll in loss-employer groups

Four additional joint common-control packets retain unequal employer payroll
of4,000.49/3,000.52 for the same reviewed worker. Under the
[Form5884 group allocation instructions](https://www.irs.gov/instructions/i5884),
the shared6,000 wage cap still gives credit2,400. Proportionate whole-dollar
shares are1,371/1,029, leaving deductible/QBI wages2,629.49/1,971.52.
Gross receipts and reviewed nonpayroll expenses preserve the four business
profits2,000/4,000/-1,000/-2,000 and owner half-SE deductions14/142.

Both-loss employers, profitable primary/loss spouse, loss primary/profitable
spouse and joint phase-in retain QBI150/292/427/359 and total tax
140,097/140,048/140,000/96,227, respectively. A profitable employer's filed
wage base is2,629 and its50% limit1,315; loss-employer payroll contributes zero
after loss netting. This follows the [Form8995-A ScheduleC note](https://www.irs.gov/instructions/i8995a).
The credit shares conserve the full2,400 despite unequal cents and source order.

The common-control fixtures now use one shared test helper. All four original
inputs deep-compare equal to the preceding retained packet sources; production
calculation and export code are unchanged. New tests also reverse businesses,
employees, group members and filed-member reviews together, then prepare native
returns with the same final tax. Public mutations cover payroll, issued W-2,
net wages and ownership; retained mutations also cover credit shares, employee
identity, certification and statement members.

The two-module typed gate passes8/0 (1m51s), including all four original group
cases. New cases reject16 public mutations and32 native/32 fresh-PDF mutations.
All four new returns pass local TY2025 v5.4 XSD and independent final-tax checks.
Decimal share audits agree with both linked native allocation statements.
The152-page review uses14 newly observed images on four contact sheets,
130 exact previously observed image matches and eight within-batch duplicates.
Reopened PDFs have zero fields/widgets. Existing26/68/76/84 qualifications
remain; no new layout issue was found and prior packet totals are not recounted.

Evidence is retained under
`.state/research/form8995a-group-loss-cents-2026-10-12/`. Synthetic source joins
remain distinct from issued payroll/ownership proof; wider combinations and
parent completion remain open, and no deferred item is repaired.

## October 12 joint common-control employers with current losses

Native and PDF exports now accept the reviewed two-member joint common-control
WOTC inventory alongside current QBI losses. The former blanket group rejection
is replaced by complete employer-name/EIN, proprietor, business-reference and
filed-member reconciliation. Shared employee references are joined by employer
EIN as well, preserving distinct W-2, SSA, certification and payroll records.
The existing group calculator still applies the shared-worker wage cap and
allocates the credit before the business wage reductions and QBI calculation.

The [Form5884 group instructions](https://www.irs.gov/instructions/i5884) treat
common-control businesses as one employer and require proportionate credit
shares and an allocation statement. Each synthetic employer here pays4,000 to
the same reviewed worker. The6,000 group wage cap gives total credit2,400,
allocated1,200 per member; each deducts2,800 wages. The same four-business
profits2,000/4,000/-1,000/-2,000, owned SE deductions14/142 and gross-income
allocations from the ordinary joint checkpoint remain intact. Lower payroll
and corresponding nonpayroll expenses preserve those independently reviewed
profits without changing loss netting.

| Employer arrangement | QBI | Positive-business wage limits | Group credit | Total tax | Owed |
| --- | ---: | --- | ---: | ---: | ---: |
| Both loss-making | 150 | 50 / 100 | 2,400 | 140,097 | 80,097 |
| Primary profitable, spouse loss | 292 | 1,400 / 100 | 2,400 | 140,048 | 80,048 |
| Primary loss, spouse profitable | 427 | 50 / 1,400 | 2,400 | 140,000 | 80,000 |
| Both loss-making, joint phase-in | 359 | 50 / 100 | 2,400 | 96,227 | 36,227 |

The group source must include exactly both filed ScheduleC employers and their
matching joint ownership review. Nonjoint groups, incomplete membership,
external member shares and unsupported source combinations remain guarded.
Synthetic records prove calculation and source joins, not issued certifications
or authenticated ownership. No deferred work is implemented and the broad
Forms8995/8995-A parent remains open.

The six-module typed regression passes32/0 (7m15s); the focused suite passes
4/0 (57s), with32 public-source rejections and
44 native/44 fresh-PDF mutation rejections. Independent decimal calculations
reconcile all four final taxes and native QBI/wage limits. Each full return
passes TY2025 v5.4 XSD, including both linked native group statements. Member
names, qualified wages3,000 each, credit shares1,200 each and document IDs agree.
The152-page review comprises17 newly observed images on five contact sheets,
122 exact prior-image matches and13 within-batch duplicates. Reopened PDFs
have zero fields/widgets. Printed page30 contains the complete group allocation;
existing26/68/76/84 presentation qualifications recur without a new layout issue.

Evidence: `.state/research/form8995a-group-loss-wotc-2026-10-12/` retains the
valid-source pre-change export rejection, post-change replay and filing packets.

## October 12 independent joint employers with current losses

Four complete-return cases now verify both spouses' ordinary employer WOTC
alongside the four-business current-loss inventory. The existing runtime
supports two loss-making employers, a profitable primary employer plus a loss
spouse employer, the reverse arrangement, and joint wage-limit phase-in.
Each employer retains6,000 payroll,2,400 determined credit and3,600 deductible
wages. The complete ordinary joint-employer review binds both business EINs,
proprietor SSNs and spousal-attribution exceptions; controlled groups remain
outside this checkpoint. No production change was needed.

The [Form5884 instructions](https://www.irs.gov/instructions/i5884) govern the
wage deduction reduction. The [Form8995-A ScheduleC instructions](https://www.irs.gov/instructions/i8995a)
keep loss-business wages out of the parent limit after proportional loss netting.
The four retained profits remain2,000/4,000/-1,000/-2,000, with owner SE taxes
27/283 and half-SE deductions14/142. Primary gross-income allocation7/7 and
spouse81.14/60.86 produce filed QBI1,993/3,919/-1,007/-2,061; losses3,068 offset
positive businesses1,034/2,034, leaving959/1,885. When only the primary positive
business and spouse loss business employ workers, primary allocation10.50/3.50
instead gives filed QBI1,990/3,919/-1,004/-2,061 and adjusted958/1,886.

| Employer arrangement | QBI | Wage limits on positive businesses | Regular tax | Total tax | Owed |
| --- | ---: | --- | ---: | ---: | ---: |
| Both loss-making | 150 | 50 / 100 | 139,012 | 137,697 | 77,697 |
| Primary profitable, spouse loss | 292 | 1,800 / 100 | 138,963 | 137,648 | 77,648 |
| Primary loss, spouse profitable | 427 | 50 / 1,800 | 138,915 | 137,600 | 77,600 |
| Both loss-making, joint phase-in | 359 | 50 / 100 | 96,283 | 93,827 | 33,827 |

All four use the full4,800 credit and retain60,000 withholding. At phase-in,
taxable income before QBI444,600 yields50% reduction; components121/238 give
QBI359. Independent decimal calculations use the official
[2025 Tax Computation Worksheet](https://www.irs.gov/publications/p1040),
including the joint32% subtraction45,874, and agree with every Form1040 tax,
credit and balance. Native audits also reconcile both employer credits,
QBI/loss rows, wage limits and Form3800 current use.

The typed suite passes4/0 (55s). Five altered public source contracts per case
reject (20 total); eight retained-input mutations per case reject native and
fresh PDF export (32 each). Reversing businesses and employees preserves tax.
All four full returns pass TY2025 v5.4 XSD. The148-page review comprises30
new unique images on eight observed contact sheets,107 exact prior-image matches
and11 within-batch duplicates. Reopened packets have zero fields/widgets.
Existing26/68/76/84 qualifications recur: skipped Form3800 intermediate lines,
joint Form6251 name, blank QBI zeros and omitted native Form6251 line1a.
No new layout defect was found. Evidence is retained under
`.state/research/form8995a-dual-loss-wotc-2026-10-12/`.

Synthetic ownership, payroll and certification references establish calculation
joins only. Wider employer/control arrangements, source authenticity, broad
parent completion and IRS acceptance remain open; deferred work is untouched.

## October 12 loss-making employer payroll and WOTC

The reviewed current-loss route now retains WOTC payroll on a business with
negative QBI. Its wage-credit reduction still changes ScheduleC profit and the
owner's SE basis, but its wages contribute zero to the parent QBI limitation.
This follows the [Form8995-A ScheduleC column(c) note](https://www.irs.gov/instructions/i8995a):
W-2 wages and qualified-property basis must be zero for a business whose
adjusted QBI is zero or negative. No wage allowance transfers to another trade.
Unreviewed loss-business payroll and nonzero loss-business UBIA remain guarded.

Eight public cases retain four businesses with profits2,000/4,000/-1,000/-2,000.
The primary loss employer has gross6,000, raw payroll6,000, WOTC2,400,
deductible wages3,600 and expenses3,400. Its ordinary single-owner half-SE
allocation is10/13.33/10/6.67, giving filed QBI1,990/3,987/-1,010/-2,007.
Loss offsets1,004/2,013 yield adjusted QBI986/1,974. Native and PDF parent wages
are100/200/0/0 and wage limits50/100/0/0, despite the retained employer wages3,600.

The joint primary-employer allocation7/94.67/7/47.33 gives adjusted QBI961/1,883.
The spouse-employer variant moves reviewed payroll to the fourth business:
gross6,000 minus wages3,600 and expenses4,400 gives loss2,000. Its proprietor
allocation10.50/81.14/3.50/60.86 gives adjusted QBI958/1,886. Both owner cases
retain separate SE computations and the same independent wage limits.

| Case | QBI | Regular tax | WOTC used | Total tax | Owed / (refund) | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single above range | 150 | 70,018 | 2,400 | 68,623 | 8,623 | 35 |
| Single limited credit | 150 | 70,018 | 58,763 | 12,260 | (47,740) | 35 |
| Single phase-in | 370 | 48,081 | 2,400 | 46,102 | (13,898) | 35 |
| Joint primary employer | 150 | 139,012 | 2,400 | 140,097 | 80,097 | 37 |
| Joint spouse employer | 150 | 139,012 | 2,400 | 140,097 | 80,097 | 37 |
| Head of household | 150 | 65,524 | 2,400 | 64,129 | 4,129 | 35 |
| Qualifying surviving spouse | 150 | 50,808 | 2,400 | 49,413 | (10,587) | 35 |
| Married filing separately | 150 | 70,018 | 2,400 | 69,298 | 9,298 | 35 |

The limited-use loss employer pays480,000 to80 reviewed workers, generating
WOTC192,000 and deductible wages288,000. Gross310,000 and expenses23,000 still
produce loss1,000. Deduction shares.73/.98/37.80/.49 precede loss netting.
All288,000 retained QBI wages are excluded from the loss business's wage limit;
current credit use58,763 does not replace the full192,000 wage reduction.

The nine-module typed regression passes74/0 (6m58s); the focused suite passes
8/0 (2m6s), with48 public diagnostic rejections and
96 native/96 fresh-PDF mutation rejections. Independent decimal calculations
reconcile all eight final taxes, credits and balances; native audits verify
four business identities, QBI/loss allocations and zero loss-employer wage
limitations. All eight complete returns pass the local TY2025 v5.4 XSD.
All284 packet pages were reviewed:45 new unique images on12 contact sheets,
212 exact matches to previously observed images and27 within-batch duplicates.
Reopened PDFs contain zero fields/widgets. Existing qualifications26/68/76/84
recur (Form3800 skipped values, joint/MFS names, blank QBI zeros and native
Form6251 line1a omission); no new layout defect was found. Final native audits
independently agree on Form1040, Form5884 and current Form3800 amounts.
The initial test draft used the wrong spouse identity property and failed type
checking; it was corrected before the successful typed run.

Evidence is retained in `.state/research/form8995a-loss-employer-2026-10-12/`.
The initial source replay documents the previous blanket payroll rejection.
Synthetic source joins do not authenticate employer W-2s or SWA certifications.
Controlled groups, wider payroll methods and the broad parent TODO remain open;
no deferred defect was repaired and no IRS acceptance is claimed.


## October 12 employer WOTC with ordinary current losses

Reviewed employer payroll now coexists with the ordinary multi-business loss
inventory. The graph retains the full wage-credit reduction, then attributes
half-SE deductions using the owner's reviewed gross income before loss netting.
Native parent, loss companion and PDF exports replay the employer W-2 records,
certified employee payroll, business inventory, proprietor, determined credit,
Form3800 source and retained wage reductions. Existing positive-only WOTC
routes keep their separate source contracts.

The six public cases use four businesses with gross income6,000/8,000/2,000/4,000
and profits2,000/4,000/-1,000/-2,000. The first business pays6,000 in wages:
WOTC2,400 reduces deductible/QBI wages to3,600, with400 other expenses. This
follows the [Form5884 line2 instruction](https://www.irs.gov/instructions/i5884)
to reduce wage deductions by the determined credit, independently of current
credit use. All six cases currently use the full2,400 credit. The
[Form8995-A instructions](https://www.irs.gov/instructions/i8995a) govern the
separate current-loss netting and wage limitations.

Single-owner half-SE40 allocates12/16/4/8 before netting; the joint inventory
retains T/S/T/S ownership and half-SE156 allocated10.50/94.67/3.50/47.33.
The first positive business now has enough QBI wages for its full20% component;
the second still faces its own200 wage base. Single phase-in at50% gives
components197/247 and QBI444; joint above-range components are192/100.

| Case | QBI | Regular tax | WOTC used | Total tax | Owed / (refund) | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single above range | 297 | 69,967 | 2,400 | 68,572 | 8,572 | 35 |
| Single phase-in | 444 | 48,057 | 2,400 | 46,078 | (13,922) | 35 |
| Joint two-owner | 292 | 138,963 | 2,400 | 140,048 | 80,048 | 37 |
| Head of household | 297 | 65,472 | 2,400 | 64,077 | 4,077 | 35 |
| Qualifying surviving spouse | 297 | 50,773 | 2,400 | 49,378 | (10,622) | 35 |
| Married filing separately | 297 | 69,967 | 2,400 | 69,247 | 9,247 | 35 |
| Single limited credit | 295 | 69,968 | 58,726 | 12,247 | (47,753) | 35 |

The seventh case has80 certified workers and480,000 payroll. Full WOTC192,000
reduces deductible/QBI wages to288,000 even though current use is only58,726.
Gross310,000 minus wages288,000 and expenses20,000 preserves profit2,000;
the changed gross-income basis reallocates half-SE as38.27/.99/.25/.49.
Filed QBI1,962/3,999/-1,000/-2,000 nets to975/1,986, giving components195/100.
Independent specified-credit limitation69,968 - round(25% * (69,968 -25,000))
is58,726, and final tax12,247 matches native and PDF.

The18-module grouped gate passes129 typed tests with zero failures or ignored
(7m39s); the added limited-use case passes separately1/0 (13s). The seven new
cases reject42 public-source mutations and84 native/84 fresh-PDF mutations. Independent decimal calculations
reconcile SE tax, half-SE, regular tax, Medicare tax, current credit and balance;
XML audits additionally join all four QBI/loss rows, components and EINs.
All seven full returns pass the local TY2025 v5.4 XSD. All247 flattened pages were
observed:58 new unique images on16 contact sheets,132 exact matches to previously
observed pages (including the first six cases) and57 within-batch duplicates. Reopened PDFs contain no fields
or widgets. Deferred26 skipped Form3800 lines,68 names,76 blank zeros and84
native Form6251 line1a omission remain qualified; no new clipping was observed.

Evidence is retained under
`.state/research/form8995a-loss-wotc-2026-10-12/`, with complete sources, packets,
render hashes, independent tax, XML audits and visual-review mapping. Initial
test expectations were corrected using decimal rounding, and the MFS fixture
now explicitly answers the required spouse business-credit question.

The original pre-change probe is preserved under `before/`: a required QBI node
failed, but return preparation emitted XML with no QBI form and tax68,676.
General diagnostic-to-export handling is newly deferred161 and was not repaired;
this feature removes that calculation failure only for the supported sources.
Controlled-group losses, preferential-income coexistence,
loss-making WOTC employers and wider payroll methods remain outside this
checkpoint. Synthetic records establish calculation/source joins, not payroll
or SWA authenticity. The broad parent TODO and IRS acceptance remain open.


## October 12 broker gains and capital-loss boundary audit

Three source-backed cases now retain complete broker-gain evidence alongside
current business losses and deductible SE tax: Single phase-in, joint two-owner
and MFS. Two taxpayer-owned covered sales add a2,000 long-term gain and1,000
short-term loss to1,800 capital distributions. ScheduleD combines long-term3,800
and short-term-1,000 to2,800; qualified dividends1,800 produce a4,600 QBI capital
limit. All investment copies belong to the primary filer. Existing gross-income
SE allocation and four identified business loss rows remain unchanged.

| Case | QBI deduction | Regular tax | NIIT | Total tax | Owed / (refund) | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single phase-in gain | 304 | 49,720 | 285 | 50,426 | (9,574) | 26 |
| Joint two-owner gain | 150 | 140,717 | 285 | 144,487 | 84,487 | 28 |
| Separate-return gain | 150 | 71,723 | 285 | 73,688 | 13,688 | 26 |

Independent decimal calculations recompute source gains, preferential income,
filing-status tax, QBI phase-in, NIIT and balances. Single pre-QBI taxable229,800
produces65% phase-in and components101/203. These three cases agree through
Form1040 and native tax. The focused typed suite passes3 tests, rejecting12
public business-source mutations plus51 native and51 fresh-PDF mutations;
additional broker mutations cover recipient, reused transaction ID, basis and
wash-sale adjustment. The five-module grouped gate passes182 typed tests, zero
failures or ignored (1m33s), covering both recent QBI suites, distinct capital
sources, ScheduleD and Form8960. The MFS loss probe also rejects through both native and
fresh-PDF export with the explicit finalized-ScheduleD mismatch.

The six-case audit preserves the negative cases as entered. A5,000 long-term
loss,1,000 short-term gain and1,800 distributions produce net loss2,200. The
Single and joint cases calculate QBI349/150 and regular tax48,581/139,527
correctly, but ScheduleD sends only positive capital income to Form8960.
Consequently both native/PDF packets report NIIT179 rather than95: final tax
49,181/143,191 instead of49,097/143,107. The [Form8960 line5a instructions](https://www.irs.gov/instructions/i8960)
require the Form1040 capital gain or loss; these ordinary investment sales have
no excluded-property adjustment. This is deferred159, with original incorrect
outputs retained, not an approved tax result.

The MFS loss case omits filing status from retained public ScheduleD input,
using the ordinary3,000 loss limit instead of the required1,500 limit in the
[ScheduleD instructions](https://www.irs.gov/instructions/i1040sd). Public AGI
305,460 should be306,160; after also correcting NIIT, final tax should be72,580.
Both final export routes already reject the ScheduleD/Form1040 mismatch, so no
MFS loss packet is counted. This is deferred160. Neither new defect was repaired.

Five complete returns pass local TY2025 v5.4 XSD: three tax-reconciled gain
packets/80 pages and two incorrect-NIIT loss packets/54 pages. All134 flattened
pages were reopened with zero fields/widgets and observed:36 new unique images
on9 sheets,92 exact matches to the prior observed investment batch and6 duplicate
pages within this batch. No clipping was observed. Existing deferred15 repeats
in missing native ScheduleD totals/conditional indicators; deferred68 repeats in
joint primary-only ScheduleB/ScheduleD headers and the MFS spouse row; deferred76
repeats in blank zero QBI/business fields. Structural success does not resolve
those native/presentation qualifications or the two tax discrepancies.

Evidence: `.state/research/form8995a-loss-brokers-2026-10-12/` retains six original
inputs/pending records, five XML/PDF packets, the MFS rejection, independent
expected-versus-actual arithmetic, native ScheduleD observations, page hashes and
qualified visual review. No production runtime changed in this audit. Wider QBI
conditional routes, external authenticity and IRS acceptance remain open.

## October 12 current losses, SE deductions and investment income

The current-loss export now reconciles retained owner SE deductions when the
return also contains reviewed interest, dividends and capital-gain distributions.
Previously it rejected this combination and its investment-tax check always used
Single rates. The check now uses the actual filing status and reconciles total
income, adjustments and AGI before replaying the preferential-rate worksheet.
Source ownership, distinct capital contributions, SE allocation, business loss
netting and MFS property-regime reviews remain enforced.

Each of six complete returns retains two taxpayer-owned INT copies (1,000/700)
and two DIV copies (ordinary2,000/1,000; qualified1,200/600; distributions1,000/800).
The investment total is6,500; equal qualified-dividend and capital-gain contributions
of1,800 each remain distinct and give Form8995-A line34 of3,600, following the
[Form8995-A instructions](https://www.irs.gov/instructions/i8995a).
The four businesses and owner gross-income allocation are the same as the
SE-only checkpoint below. All investments in this batch belong to the primary
filer, including the joint case; spouse investments and broker sales are not
proved by these six packets.

| Case | Half-SE | QBI deduction | Regular tax | NIIT | Total tax | Owed / (refund) | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Single high income | 40 | 150 | 71,573 | 247 | 72,825 | 12,825 | 24 |
| Single phase-in | 40 | 313 | 49,567 | 247 | 50,235 | (9,765) | 24 |
| Joint two owners | 156 | 150 | 140,567 | 247 | 144,299 | 84,299 | 26 |
| Head of household | 40 | 150 | 67,079 | 247 | 68,331 | 8,331 | 24 |
| Surviving spouse | 40 | 150 | 52,044 | 247 | 53,296 | (6,704) | 24 |
| Separate return | 40 | 150 | 71,573 | 247 | 73,500 | 13,500 | 24 |

The added income raises the phase-in case's pre-QBI taxable income to228,800,
producing63% phase-in and components104/209. Independent decimal arithmetic applies
the [2025 tax worksheet](https://www.irs.gov/instructions/i1040gi),15% capital
rates and [NIIT thresholds](https://www.irs.gov/instructions/i8960); all six final
taxes, owner SE amounts and balances agree. An independent native audit checks
business identities, loss offsets, adjusted QBI, both capital contributions,
Form1040 investment/adjustment/tax lines and Form8960 investment income/tax.

All six full returns pass local TY2025 v5.4 Return1040 XSD. All146 flattened pages
were reopened with zero fields/widgets and visually observed through62 unique
images on16 sheets; final PDF hashes match those reviewed. ScheduleB payer rows,
seven owner ScheduleSE copies, QBI continuations, phase-in and final amounts
reconcile. Joint ScheduleB page7 retains a primary-only header and MFS Form1040
page1 repeats the spouse name in the joint-only row (deferred68); blank zero
QBI/business fields repeat deferred76. The positive joint Form8960 page21 shows
both names. These presentation findings remain deferred without repair.

The focused suite passes six typed tests and rejects24 public business-source
mutations plus78 native and78 fresh-PDF mutations. Export probes cover investment
owner changes in both retained copies, collapsed capital contributions, inadequate
qualified-dividend holding review, altered ScheduleB print amounts, AGI, adjustments,
regular tax and the earlier owner-SE source joins. The first test draft used a
nonexistent tax field in one mutation; correcting the test to the actual Form1040
income-tax field makes that rejection meaningful. Production tax logic did not
change to accommodate a test expectation. The20-module grouped gate passes209
typed tests, zero failures or ignored (5m15s), including prior SE/loss/owner/MFS
routes, source schemas, native companions and distinct investment contributions.

Evidence: `.state/research/form8995a-loss-investments-2026-10-12/` retains inputs,
filer/pending/projection records, full XML/PDF, schema logs, independent arithmetic
and native audits, rendered-image mappings and qualified visual review. This
extends the existing QBI and return-wide investment/adjustment work; broader
conditional paths, external authenticity and IRS acceptance remain open.

## October 12 current losses with deductible self-employment tax

Ordinary Schedule C current-loss inventories now retain positive owner-specific
half-SE deductions before applying QBI loss netting. The new per-business review
records gross-income attribution, the allocated deduction, complete owner inventory
and workpaper provenance. Gross income is rebuilt from receipts, allowances, COGS
and other business income. Cent shares use exact integer ratios and stable business
references for residual ties. A loss business with gross income receives its share;
spouses' deductions never cross owners. Existing ordinary positive-only allocation
routes are unchanged and are separately recorded as deferred157.

This ordering follows [26 CFR1.199A-3(b)(1)(vi)](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol4/pdf/CFR-2025-title26-vol4-sec1-199A-3.pdf)
and the [Form8995-A loss-netting instructions](https://www.irs.gov/instructions/i8995a).
The public graph retains raw Schedule C profit and the separate SE deduction;
QBI rows reflect the deduction before proportional loss offsets and per-business
wage/property limitations. Native and fresh-PDF exports rebuild source profits,
owner SE and wage records, and reconcile Schedules1/2 and Form1040. Exempt trades,
other SE sources and health/retirement adjustments remain outside this extension;
investment combinations are covered by the newer checkpoint above, while existing prior-loss, SSTB, aggregation, cooperative and
MFS property-regime boundaries continue to apply.

All six cases have gross business income6,000/8,000/2,000/4,000 and net profits
2,000/4,000/-1,000/-2,000. One-owner half-SE40 allocates12/16/4/8, yielding filed
QBI1,988/3,984/-1,004/-2,008 and offsets1,003/2,009. The joint case assigns the
first/third trades to T and second/fourth to S: SE taxes27/283 yield deductions
14/142, allocated10.50/94.67/3.50/47.33. Filed QBI1,990/3,905/-1,004/-2,047 nets
to960/1,884 after offsets1,030/2,021. A separate public calculation keeps T's
deduction14 when S's loss makes combined profit-1,000, retaining QBI carry1,014;
this remains QBI-stage evidence with a Form461 source-review diagnostic
(deferred158), not a complete return or an additional packet. The existing
zero-other-item review was not falsely asserted for the positive SE deduction.
All businesses remain separately identified
in both representations and continuation pages.

| Case | Half-SE | QBI deduction | Final tax | Balance owed / (refund) | Pages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Single high income | 40 | 150 | 71,023 | 11,023 | 23 |
| Single 50% phase-in | 40 | 370 | 48,502 | (11,498) | 23 |
| Joint two owners | 156 | 150 | 142,497 | 82,497 | 25 |
| Head of household | 40 | 150 | 66,529 | 6,529 | 23 |
| Surviving spouse | 40 | 150 | 51,813 | (8,187) | 23 |
| Separate return | 40 | 150 | 71,698 | 11,698 | 23 |

Independent decimal calculations apply the [2025 tax worksheet](https://www.irs.gov/instructions/i1040gi)
and [Additional Medicare thresholds](https://www.irs.gov/instructions/i8959),
including each filed SE line and owner deduction. All six final taxes and balances
agree. The initial test draft corrected two hand-calculated expectations (phase
370 and spouse SE283/half142); source cases and production tax calculations did
not change. A one-dollar gross-income mutation legitimately preserved cent shares;
the rejection probe now changes gross and offsetting expenses by1,000 to test a
material attribution conflict without changing net profit.

All six full returns pass local TY2025 v5.4 Return1040 XSD. All140 flattened pages
have zero fields/widgets and were observed through61 unique images on16 sheets.
Seven ScheduleSE copies, source owner/name/EIN, QBI amounts, phase-in, continuations
and final tax reconcile without observed clipping. Deferred68 repeats in the joint
Form8960 primary-only header and the separate Form1040 spouse row; deferred76
repeats in blank zero fields. Neither presentation issue was repaired.

The six focused typed cases pass and reject24 public-source,36 native and36
fresh-PDF mutations. Additional allocation tests cover stable cent ties, source
permutations, zero gross, subcent bases, exempt trades and missing owner sources.
The19-module grouped gate passes203 typed tests, zero failures or ignored; the
first attempt had199 passes and one missing-pdftotext environment failure. After
correcting PATH, it passes unchanged. Final review then added net-loss deduction
attribution and its guarded joint case; the final allocation/current-loss replay
passes12 typed tests. All six final PDFs, inputs, filer records, projections and
pending records are byte-identical to the reviewed packets; XML differs only in
ReturnTs. Independent final-tax and native business-row audits also pass on the
final replay.

Evidence: `.state/research/form8995a-loss-se-2026-10-12/` retains public inputs,
prepared pending/filer records, projections, XML/XSD logs, PDFs, independent tax
arithmetic, image hashes and qualified visual review. This completes this SE-loss
extension of the existing QBI task; broader parent readiness remains open.


## October 12 separate-return ordinary loss inventories

MFS ordinary current-loss inventories now use taxpayer-owned businesses with
retained domicile, property-regime, separate-earnings and spouse-deduction reviews.
Each business identifies its owner; common owner/spouse/domicile facts must agree
across the inventory. Native and PDF exports join those facts to general inputs,
Form1040, actual wage recipients and the final filer/address. An SSTB-only owner
check no longer incorrectly rejects ordinary losses; SSTB validation remains in
its own branch.

This reuses the existing separate-income review schema rather than treating a
mailing state as proof of property character. Mandatory community-property states,
elected or retained community income, spouse-owned businesses and an itemizing
spouse remain outside this path. The review follows the distinctions in
[Publication555](https://www.irs.gov/publications/p555). Broader property allocations,
source authenticity, positive SE adjustments and prior accepted losses remain open;
each proprietor still must have net profit below400.

| Case | Pre-QBI taxable income | Phase | QBI deduction | Final tax | Refund | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Colorado midpoint | 222,300 | 50% | 57 | 49,196 | 10,804 | 21 |
| Alaska upper endpoint | 247,300 | 100% | 55 | 57,421 | 2,579 | 21 |
| New York fractional | 222,301 | 50.002% | 57 | 49,196 | 10,804 | 21 |

Each source contains four businesses with QBI1,000/2,000/-900/-1,800,
proportional offsets900/1,800, adjusted positive QBI100/200, wages30/100 and
zero UBIA. The [Form8995-A instructions](https://www.irs.gov/instructions/i8995a)
use the nonjoint197,300 threshold and50,000 range for MFS. Independent decimal
arithmetic applies the [1040 tax worksheet, Section C](https://www.irs.gov/instructions/i1040gi)
(32% of taxable income less22,937), producing regular taxes48,181/56,181/48,181.
The [Form8959 MFS threshold](https://www.irs.gov/instructions/i8959) is125,000;
Additional Medicare tax1,015/1,240/1,015 reconciles all final taxes and refunds.
All three original cases pass; no source amount was substituted to avoid a failure.

All three full returns pass local TY2025 v5.4 Return1040 XSD. All63 flattened
pages have zero fields/widgets and were reviewed through33 unique images:
28 newly observed images on seven sheets plus five prior-reviewed SHA256 matches.
Business identity, taxpayer ownership, loss rows, phase amounts and continuation
order reconcile without observed clipping. Existing deferred68 repeats the
spouse name in the joint-only Form1040 row and MFS field; deferred76 repeats
blank zero fields. These qualifications remain deferred without repair.

The focused typed replay passes3/0. It rejects18 public-source mutations and
39 native plus39 fresh-PDF mutations, including spouse deduction conflicts,
altered review facts propagated into both QBI companions, wage-recipient swaps
and detached taxpayer/spouse/address headers. Reversed business inventories
preserve the final tax. The initial run found a test-only assertRejects overload
error, corrected by specifying Error without changing the cases.

The expanded17-module QBI/Schedule C batch passes194 typed tests, zero failures
or ignored. Final diff review tightened the PDF status condition to preserve the
previous rejection of non-SSTB, non-loss MFS paths; only validated ordinary loss
inventories bypass the SSTB-only owner assertion. The final MFS/SSTB rerun passes
11 typed tests with zero failures or ignored. All three final PDFs, projections
and pending records exactly match the reviewed artifacts; XML differs only in
ReturnTs.

Evidence: `.state/research/form8995a-mfs-losses-2026-10-12/` retains inputs,
pending/filer records, projections, XML/XSD logs, actual PDFs, independent decimal
tax arithmetic, render hashes and visual review. This advances the existing
QBI source and owner task; it does not close the broader parent.

## October 12 joint, head-of-household and surviving-spouse losses

The ordinary current-loss route now retains explicit taxpayer/spouse business
ownership for MFJ and taxpayer ownership for HOH/QSS. It joins filing status and
SSNs to the final return/header and, for joint returns, rebuilds the retained
owner-specific SE inventory even when neither proprietor owes SE tax. Missing
or inconsistent owners reject. Each proprietor must remain below the existing
400 net-profit boundary; cross-owner losses cannot hide an unsupported SE
allocation. MFS, prior losses and other existing exclusions remain guarded.

The [2025 Form8995-A instructions](https://www.irs.gov/instructions/i8995a)
use a394,600 threshold/100,000 phase-in range for MFJ and197,300/50,000 for
HOH/QSS. QSS retains joint ordinary income-tax brackets without receiving the
joint QBI threshold. All five cases have four businesses with QBI1,000/2,000/
-900/-1,800, adjusted positive QBI100/200 and wage limits15/50. At50% phase-in,
components17/40 produce deduction57; the adjacent QSS case has50.002%.

| Case | Wage income | Business owners | Expected / actual final tax | PDF pages |
| --- | ---: | --- | ---: | ---: |
| Joint primary owner | 475,800 | T/T/T/T | 98,412 / 98,412 | 21 |
| Joint both owners; spouse wages | 475,800 | T/S/T/S | 98,412 / 98,412 | 21 |
| Head of household | 245,625 | T/T/T/T | 46,853 / 46,853 | 21 |
| Surviving spouse, original half-dollar | 253,500 | T/T/T/T | **39,514 / 39,513** | 21 |
| Surviving spouse, adjacent dollar | 253,501 | T/T/T/T | 39,515 / 39,515 | 21 |

All five full returns pass the local v5.4 Return1040 XSD. Independent final-tax
checks pass four and fail one: the original QSS wage case computes Additional
Medicare tax481 instead of482 because binary multiplication puts481.50 just
below the rounding boundary. The [1040 whole-dollar rule](https://www.irs.gov/instructions/i1040gi)
rounds half dollars upward. Deferred156 retains the source and incorrect return;
its QBI deduction57 is independently correct. The adjacent-dollar case supplements
the original and does not replace it. No Medicare code was changed.

All105 flattened pages have zero fields/widgets. Visual review covers47 unique
images:44 newly observed images on11 sheets and three SHA256 matches to earlier
reviewed pages. Both joint names, each Schedule C proprietor/SSN, four business
identities, loss allocations and continuation order reconcile; the spouse's
second/fourth trades print the spouse identity. No filled-content clipping was
observed. Blank loss-business parent zeros and some Schedule C zero fields repeat
deferred76; the half-dollar tax defect is visible in the original PDF.

The initial six-case replay passed. Subsequent public-source and empty-owner
inventory checks expanded the test coverage; the companion Schedule A/B/D batch
passes16 typed tests. The first combined compiler run reported TS2590 in the
registry callable union; the previous commit9f353cce4 passes the matching baseline
compiler check. The five QBI builders now take raw values as `unknown` and retain
strict schema parsing before accessing fields, avoiding expansion of the deep
QBI input union at dispatch. No global registry or deferred reliability change
was made. Initial test-only unknown-spread/enum typing errors were also corrected.

The final15-module run passes87 typed tests with zero failures or ignored;
with the16 companion passes, this checkpoint has103 related typed passes.
The new cases reject ten public-source mutations and29 native plus29 fresh-PDF
mutations, including empty joint-owner inventories. All five final PDFs,
projections and tax-audit records exactly match the reviewed artifacts; XML
matches after excluding only ReturnTs. The separate final-tax audit passes all
five cases. The historical four deferred65 RPE fixture
path failures are not reclassified or repaired by these passing batches.

Evidence is retained in `.state/research/form8995a-loss-owners-2026-10-12/`,
including source inputs, filer/pending records, projections, XML/XSD logs, actual
PDFs, render/hash inventories and a separate final-tax audit. This advances the
existing QBI source/ownership task without closing its broader parent.

## October 12 current-loss phase-in and continuation checkpoint

The ordinary Single current-loss route now applies the wage/property phase-in
between taxable income197,300 and247,300, including the upper endpoint. Each
positive business first absorbs its allocated loss, then uses its own wage and
property limit. Only businesses whose limit is below20% of adjusted QBI need
Part III. Native XML retains the business reduction and shared phase percentage;
the PDF includes Part III on each continuation that needs it, with overall
Part IV totals on the first copy only. This follows the
[Form8995-A Part III instructions](https://www.irs.gov/instructions/i8995a).

| Case | Pre-QBI taxable income | Phase | Business components | Deduction | Tax / refund | Pages |
| --- | ---: | ---: | --- | ---: | --- | ---: |
| Seven businesses, midpoint | 222,300 | 50% | 6 / 11 / 18 / 22 | 57 | 48,521 / 11,479 | 30 |
| Four businesses, fractional | 222,251 | 49.902% | 18 / 40 | 58 | 48,504 / 11,496 | 21 |
| Seven businesses, upper endpoint | 247,300 | 100% | 6 / 10 / 18 / 20 | 54 | 56,747 / 3,253 | 30 |

The business inventories, loss allocations, wages and property amounts are the
same as the preceding continuation checkpoint. Wage income is237,750/237,701/
262,750 respectively; each return keeps net business income300 and withholding
60,000. Additional Medicare tax340/339/565 and regular tax48,181/48,165/56,182
reconcile independently to the final totals. The midpoint and upper-endpoint
cases require Part III for both the second and fourth profitable businesses;
the fractional case retains the printed49.902% and rounds its reduction to2.

All three complete returns pass the local TY2025 v5.4 Return1040 XSD. All81
flattened pages have zero fields/widgets and were reviewed through54 distinct
images:28 new images on seven sheets plus26 matching prior-reviewed images by
SHA256. Business identities, loss rows, phase reductions, final totals and
continuation order reconcile with no observed clipping. Blank loss-business
parent zeros and some Schedule C zero fields repeat existing deferred76.

The focused typed replay passes3/0 and rejects12 native plus12 fresh-PDF
mutations. It also reverses source order and verifies that projected identity
changes cannot replace retained sources. Initial runs retained a compiler
complexity failure and an incorrect test expectation that a refund return
retains a zero amount-owed field; the latter was corrected without changing
source amounts or calculated tax. Evidence is retained in
`.state/research/form8995a-loss-phase-in-2026-10-12/`, including full packets,
projections, XSD logs, commands, initial/final logs, render hashes and review.

The final13-module batch passes **73 typed tests, zero failures or ignored**.
The additional Schedule A/B/D and RPE batch has16 passes and four failures on
the already deferred65 moved RPE fixture path; no path repair was made. The
final replay's three PDFs and projections exactly match the reviewed artifacts;
XML matches after excluding only ReturnTs. The intermediate no-check run also
passed73 tests but is superseded by the final typed result.

The baseline1d03b3f99 passes the matching compiler check. Initial implementations
expanded the registry's optional-builder type union, producing TS2590 and one
heap exhaustion. The five Form8995-A descriptors now retain their implemented
members with `satisfies` and explicitly absent optional builders; Schedule B's
binary attachments and optional call contexts remain supported. Part III uses
a small shared numeric helper, preserving the prior loss-result type. Final
type checks pass without disabling validation or increasing the heap. This is
a local integration fix, not closure of deferred general compiler reliability.

Single ownership, net QBI below400 and the existing ordinary active source
checks remain; this extension removes the above-phaseout-only boundary.
Other owners, positive SE allocations, prior accepted histories, source
authenticity and IRS acceptance remain open. No deferred task was implemented.

## October 12 business-inventory continuation checkpoint

The ordinary current-loss route now retains more than three identified
businesses through calculation, native XML and the complete PDF. Parent
continuations print business identity and Part II columns in groups of three;
the first copy alone retains overall totals and Part IV. Schedule C similarly
prints every loss-netting row, with totals only on its first copy. Footer row
ranges identify each continuation. The [Form8995-A instructions](https://www.irs.gov/instructions/i8995a)
require additional business detail beyond three rows; the native business and
loss-netting groups permit unbounded repeats.

| Case | Positive QBI | Current losses | Adjusted positive QBI | Components | Deduction | Packet pages |
| --- | --- | --- | --- | --- | ---: | ---: |
| Four businesses | 1,000 / 2,000 | 900 / 1,800 | 100 / 200 | 15 / 40 | 55 | 21 |
| Seven businesses | 1,000 / 2,000 / 3,000 / 4,000 | 1,900 / 2,800 / 5,000 | 30 / 60 / 90 / 120 | 6 / 10 / 18 / 20 | 54 | 29 |

Both source-backed synthetic returns retain wages300,000, net business income300,
AGI300,300, Additional Medicare tax900, total tax70,021 and amount owed10,021.
The four-business case uses wages30/100; the seven-business case uses
wages100/20/0/40 and UBIA0/0/800/0. Separate wage/property limits apply after
proportional loss allocation, including the profitable fourth business on a
continuation page.

Both complete returns pass the retained TY2025 v5.4 Return1040 XSD. The50
flattened pages have zero remaining fields/widgets; all38 distinct rendered
images were inspected across10 contact sheets, with hashes identifying repeated
pages. Names, EINs, source amounts, loss allocations, first-copy totals and
final tax reconcile. Existing blank loss-business parent zeros and some
Schedule C zero fields repeat deferred76; no new presentation defect was found.

The12-module related batch passes **67 typed tests, zero failures or ignored**
(1m34s); three shared farm/WOTC loss regressions also pass. The new cases
reject eight native and eight fresh-PDF mutations to
final deduction, companion totals, last-business identity and missing overflow
source. Reversing both complete source inventories preserves each business's
amounts; detached projected identities are replaced from validated retained
sources. No descriptor or field mapping was added.

Evidence is retained in `.state/research/form8995a-loss-continuations-2026-10-12/`:
inputs, pending/projections, full XML/PDF, XSD logs, grouped replay, render hashes
and `visual-review.json`. The route still requires the reviewed Single,
above-phaseout, ordinary active Schedule C source path with net QBI below400
at this checkpoint (the later phase-in checkpoint above extends its income range);
prior losses, adjustments, owners, SE combinations, aggregation and patron routes
retain their existing boundaries. The original all-loss filing guard remains
deferred8. Wider source authenticity and IRS acceptance remain open.

## October 12 proportional current-loss allocation checkpoint

The ordinary high-income single-filer Schedule C route now supports two
profitable businesses and one current-loss business. Losses are allocated
across the positive businesses before applying each business's own wage/property
limit, and both positive columns remain distinct in native XML and the PDF.
The [Form8995-A instructions](https://www.irs.gov/instructions/i8995a) require
proportional allocation and zero wage/property amounts when adjusted QBI is
nonpositive. This extends the existing three-business route; its source,
owner, activity, prior-loss and adjustment guards remain.

| Case | Positive QBI | Loss | Allocated loss | Adjusted QBI | Business components | Deduction | Tax / owed |
| --- | --- | ---: | --- | --- | --- | ---: | --- |
| Unequal profits and wages | 2,000 / 1,000 | 2,700 | 1,800 / 900 | 200 / 100 | 40 / 10 | 50 | 70,022 / 10,022 |
| Rounding remainder | 1,200 / 1,100 | 2,000 | 1,043 / 957 | 157 / 143 | 31 / 20 | 51 | 70,022 / 10,022 |
| Separate property limit | 2,000 / 1,000 | 2,700 | 1,800 / 900 | 200 / 100 | 10 / 20 | 30 | 70,029 / 10,029 |

The first two cases retain business wages100/20 and100/40 respectively. The
property case retains wages20/0 and UBIA0/800, so one business cannot use the
other's limitation amount. All three retain wages300,000, business income300,
AGI300,300, withholding60,000 and Additional Medicare tax900. Whole-dollar
loss allocation conserves the filed total using largest remainders, with stable
business references breaking exact ties; input order does not change ownership.

All three complete returns pass the retained TY2025 v5.4 Return1040 schema.
The51 flattened PDF pages (29 distinct images) were reviewed on October12:
source identities, individual loss reductions, separate parent columns,
deductions and final taxes reconcile without observed clipping. Zero amounts
in the loss-business parent column and some Schedule C fields still print
blank (existing deferred76), so presentation remains qualified.

The focused replay passes four typed tests and rejects12 native/12 fresh-PDF
mutations. It checks all six source orders for each positive case and all six
orders for tied rounding, fully offset profit and excess loss. The latter cases
retain the required Form461 scope review; its initially omitted review is
recorded, with source amounts unchanged. They demonstrate calculation
boundaries, not new complete all-loss filing support.

The final11-module related batch passes **65 typed tests, zero failures or
ignored** (1m18s), including the original loss, fractional and capital-source
cases. Initial combined type checks hit TS2590, and an isolated check exhausted
the4GB heap. The unchanged branch passed the comparison check; declaring this
calculator's result type explicitly resolved the new inference expansion.
The final full batch passes without disabling type checking. This does not
close the separate general compiler-reliability item72.

Evidence is retained in `.state/research/form8995a-proportional-losses-2026-10-10/`
(the work began October10 and resumed October12), including original compiler
and source-review failures, inputs, projections, complete XML/PDF, final replay
logs, render hashes and `visual-review.json`. The original all-loss filing
blocks remain deferred8. Four-or-more rows are covered by the later continuation
checkpoint above; wider owner/SE/adjustment paths,
prior accepted histories, source authenticity and IRS acceptance remain open.


## October 10 three-business loss-offset complete-return checkpoint

The ordinary single-filer loss-netting route now retains three identified
Schedule C businesses: one profitable business and two current-loss businesses.
The parent PDF preserves all three names/EINs, and its Schedule C prints all
three source rows, the combined loss reduction and adjusted QBI. Four new
third-row PDF mappings pass independent pdf-lib and pypdf field checks.

| Public source case | Profit | Losses | Filed adjusted QBI | Deduction | Total tax / owed |
| --- | ---: | --- | ---: | ---: | --- |
| Income-limited | 2,200 | 1,200 / 800 | 200 | 40 | 69,991 / 9,991 |
| Wage-limited | 2,300 | 1,200 / 800 | 300 | 50 | 70,022 / 10,022 |
| Source cents | 2,301.25 | 1,200.49 / 800.51 | 300 | 50 | 70,022 / 10,022 |

All three public returns have consistent300,000 wages,60,000 withholding,
100 business wages and900 Additional Medicare tax. Losses are fully used;
no QBI loss carryforward remains. The cents case retains raw net300.25 and
AGI300,300.25; filed profit2,301 less losses1,200/801 yields300, and filed
AGI is300,300. The initial test incorrectly expected whole-dollar amounts in
raw pending fields; only that expectation was corrected, with sources intact.

All three complete returns pass the TY2025 v5.4 Return1040 schema. The actual
flattened PDFs contain17 pages each, no remaining fields/widgets, and preserve
all three business identities and final tax amounts. Visual review covers
**51 pages through29 distinct rendered images**, with hash equality proving
repeated pages. Parent loss-business columns and some Schedule C zero fields
remain blank (existing deferred76); this is a qualified presentation review.

The nine-module related batch passes **58 tests, zero failures or ignored**.
The final focused replay passes3/0 and rejects12 native plus12 fresh-PDF
mutations to deduction, income, companion values and third-business identity.
Seven descriptor tests pass (822 filtered out), including real-template field
names, types and widgets. Private evidence is retained in
`.state/research/form8995a-three-businesses-2026-10-10/`, including the original
raw-rounding assertion, final logs, inputs, XML/PDF, source projections,
two-reader field checks, render inventory and `visual-review.json`.

The original three all-loss cases below remain unchanged and reject all six
full exports on deferred8. These new positive-offset cases do not replace them.
At that checkpoint, multiple positive businesses remained unimplemented; the
October12 checkpoint above extends that case. Four-or-more rows/continuations,
broader owners, prior history, source authenticity and IRS acceptance remain open; the existing
single-filer, activity, adjustment, wage/property and source guards remain.
This checkpoint advances the existing QBI task without closing its broad parent.


## October 10 two-current-loss computation checkpoint

The existing single-filer Schedule C loss route now retains **two identified
current-loss businesses**, with no positive business required. It sums their
filed losses into Schedule C line3/6 and the current QBI loss origin, keeps both
native business rows, and projects both identities onto the parent PDF. The
previous single-loss and one-profit/one-loss paths use the same reconciliation.
Source, prior-loss, owner, adjustment, activity and wage/property guards remain.

The [2025 IRS instructions](https://www.irs.gov/instructions/i8995a) require
Schedule C for current QBI losses and carry unused loss into the next year;
nonpositive adjusted QBI does not retain wage/property limitation amounts.
This checkpoint retains a current unfiled loss origin, not accepted prior-year
history or a production next-year import.

| Public source case | Business losses | Carry | AGI | QBI deduction | Total tax / owed |
| --- | --- | ---: | ---: | ---: | --- |
| Two losses | 1,200 / 800 | 2,000 | 298,000 | 0 | 69,235 / 9,235 |
| Reversed source order | 800 / 1,200 | 2,000 | 298,000 | 0 | 69,235 / 9,235 |
| Retained cents | 1,200.49 / 800.51; filed1,200 / 801 | 2,001 | 297,999 | 0 | 69,234 / 9,234 |

Each case retains consistent300,000 W-2 wages and payroll boxes,60,000
withholding and reviewed Form461 scope. The three public calculations,
source-bound native parent/companion and PDF field projections reconcile.
Thirty-six altered deduction, income and companion component checks reject.

**Complete native and PDF exports still reject all three cases** at the
existing Form8995 unfiled-loss guard (deferred8). The initial full-export
failure is retained; no guard was bypassed and no full packet, XSD or visual
review is claimed for these cases. The broader filing route remains unfinished.
The new calculation and form-level support is not a filing-readiness checkoff.

Evidence: `.state/research/form8995a-two-losses-2026-10-10/`, including source,
pending, component XML, projected fields, both full-export errors and logs.
The focused replay passes3/0. The eight-module related batch passes **55 tests,
zero failed or ignored**, including the prior single-loss, profit/loss, unused
loss, cent-valued parent and full-return compatibility cases. The first batch
reported54/1 because `pdftotext` was absent from PATH; the same command passes
with `/tmp/opentax-poppler-env/bin` prepended. No source or expectation was
changed for that environment correction.

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

The former 11 flat fields in `forms/f1040/2025/mef/forms/deductions/business/f8995a/f8995a.ts` were
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

## MFJ spouse and two-owner WOTC source filing — October 6, 2026

This extension completes the retained ordinary non-SSTB Schedule C route for a
spouse proprietor and for two positive businesses, one per spouse. Actual public
Schedule C, employee payroll/certification reviews, issued-copy W-2 records and
generic owner Schedule SE sources feed the parent, Form 3800 and final 1040.
Each business retains its full determined Form 5884 credit wage reduction before
profit, attributable half-SE, QBI and deductible W-2 wage limitation; current
tax use never changes that reduction. Separate business rows retain their owner,
EIN, source references and per-business phase-in calculation in native XML and
PDF. The two-owner source carries truthful reviewed other-business references
and no aggregation, rather than a false no-other-business assertion.

The [Form 5884 instructions](https://www.irs.gov/instructions/i5884) require the
full line 2 wage deduction reduction and treat common-control employers as one
employer. The
[Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) require
separate owner SE calculations; the
[Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) require
attributable adjustments and the joint $394,600/$494,600 phase-in boundaries.
The two-employer route requires reviewed ownership/income sources supporting all
four spouse-attribution exceptions in
[26 CFR 1.414(c)-4(b)(5)(ii)](https://www.ecfr.gov/current/title-26/section-1.414(c)-4),
as applied by
[26 CFR 1.52-1(d)](https://www.ecfr.gov/current/title-26/section-1.52-1), and no
other common-control ownership/options. These include no other-spouse direct
interest or management/employment, the passive-income condition and no
spouse/minor-child disposition restriction. Missing or contrary facts reject
this ordinary independent-employer route. Common-control source allocations must
use the existing controlled-group route; this proof does not complete its
multi-owner QBI coexistence.

**Correction to inherited primary fixtures:** their external household W-2 EIN
was inherited as 12-3456789, matching the reviewed WOTC sole proprietor EIN.
That contradicted the asserted separate external employer and complete reviewed
payroll. The fixtures now identify the external employer as 54-3216789,
preserving all actual wages and prior numerical proof. Retained primary, spouse
and multi-owner exports reject a household W-2 employer EIN matching any
reviewed WOTC business EIN. This corrects the earlier synthetic employer
assumption; source references and review assertions still do not authenticate
certifications, issued W-2s, payroll or ownership workpapers.

Five spouse-owned cases retain the previous joint phase-in, first threshold
dollar, upper edge, first above-range dollar and limited-current-use amounts.
Their one-employee QBI is $330,843 after spouse SE $31,113 and half-SE $15,557.
The limited case retains full credit $192,000 with current use $93,402, unused
$98,598, QBI deduction $59,381, final tax $56,036 and refund $4,864. It proves
current tax use, not a durable carryover ledger.

Three additional actual public two-owner returns prove the combined chain:

| Case                          | Primary/spouse profit | Primary/spouse SE tax | Filed primary/spouse QBI | Pre-QBI taxable income | QBI deduction | Current WOTC use | Final tax |
| ----------------------------- | --------------------- | --------------------- | ------------------------ | ---------------------- | ------------- | ---------------- | --------- |
| Both phase-in                 | 176,400 / 186,400     | 7,960 / 26,337        | 172,420 / 173,231        | 464,151                | 23,553        | 4,800            | 126,729   |
| Both above, limited use       | 312,000 / 312,000     | 8,356 / 30,192        | 307,822 / 296,904        | 873,226                | 120,945       | 158,054          | 88,536    |
| Only spouse requires Part III | 2,400 / 346,400       | 339 / 31,113          | 2,230 / 330,843          | 451,573                | 29,942        | 4,800            | 117,699   |

The cent-valued external W-2 is retained as $150,000.37 in both phase-in cases.
Raw AGI $495,651.37/$483,073.37 files as $495,651/$483,073. Ratios are
69.551%/56.973%; each finalized business percentage line is rounded before the
parent sums its deduction components. Only the spouse column prints Part III
amounts in the third case; inapplicable primary amounts remain blank, shared
phase-in operands remain present, and Part IV line 27 remains total Part II line
16 ($29,942). Above-range Part III is blank. The limited case retains $384,000
full wage reductions, $158,054 current use and $225,946 unused credit; its
SE/Additional Medicare total is $44,184, withholding $60,900 and amount owed
$27,636. Gross employee W-2 source wages remain unchanged.

Proof base: `ab5bd6dfc` plus equivalent prior joint commit `896477d00`, in
`/tmp/opentax-joint-owner-wotc-oct6`. Terminal evidence: **86 related typed
tests passed, 0 failed** (`/tmp/opentax-joint-owner-wotc-final-tests-v2.log`);
final **5 typed owner tests passed, 0 failed** after blank-column projection
repair (`/tmp/opentax-joint-owner-wotc-final-focus.log`). The final five tests
include all eight full public/native/PDF/local-v5.4-XSD positives and
source/owner/header, SE, payroll, employer, common-control, allocation,
current-credit and finalized 1040/QBI tamper rejection. Generation completed
with terminal 0 (`/tmp/opentax-joint-owner-wotc-generate-final.log`).

Final held packets are under
`.state/research/ty2025-filled-pdf-review/2026-10-06-joint-owner-wotc/`, with
rendered sibling `2026-10-06-joint-owner-wotc-rendered`. All **220 pages of
eight returns** were visually reviewed, including both owners' separate Schedule
C/SE copies, every Form 3800 page, Form 5884, exact fractional parent
percentages, applicable-only Part III columns and final 1040 joins.
Source/XML/PDF replay, full local TY2025 v5.4 XSD, file hashes and IRS template
provenance are checked by the selected held checker; terminal log is
`/tmp/opentax-joint-owner-wotc-held-check.log`.

This route supports two independent positive ordinary Schedule C proprietorships
with reviewed attribution exceptions, zero UBIA and no unsupported QBI
adjustments. Wider statuses, farms, SSTBs, aggregation, patron reductions,
losses, other wage methods, attributable health/retirement adjustments,
controlled-group coexistence, mixed-credit ordering and durable unused-credit
carryovers remain open. Generic owner-SE is preserved. No authentication, IRS
business-rule, ATS or production acceptance claim is added; the broader parent
remains open.

## MFJ common-control spouse businesses and group caps — October 6, 2026

The retained two-owner ordinary Schedule C source route now also accepts actual
reviewed businesses under common control. The existing group contract retains
its one-taxpayer-member behavior. A new joint filed-member review identifies
both actual sole proprietors, SSNs, business references and employer EINs,
100% direct ownership, the other spouse's management participation supporting
spousal attribution, reviewed ownership/classification sources and complete
group membership/payroll. Both filed shares feed one joint Form 5884/3800 claim;
each member's full determined share reduces its actual Schedule C wage deduction
before its attributable Schedule SE and QBI calculation. Source replay requires
exact actual employer names, owners and business references. Common control does
not silently elect QBI aggregation; the actual no-aggregation review is retained.

The [Form 5884 instructions](https://www.irs.gov/instructions/i5884) treat group
members as a single employer and require the full line 2 deduction reduction
regardless of limited current use. [26 CFR 1.52-1(a)(1)](https://www.ecfr.gov/current/title-26/section-1.52-1)
requires proportionate allocation of the group credit, including the shared
employee cap illustrated in example 2. The spouse attribution rule in
[26 CFR 1.414(c)-4(b)(5)](https://www.ecfr.gov/current/title-26/section-1.414(c)-4)
underlies the supplied management/ownership review. Independent-employer
exception reviews and group common-control reviews cannot coexist.

Shared workers retain one reviewed person identity and the group first-workday
source, with separate employer-specific certifications, payroll, issued W-2
copies and SSA filing references. Combined group service hours determine the
minimum/rate and eligible wages are capped once across those employer rows.
The capped wages are apportioned proportionately while retaining raw fractions;
the determined credit's whole-dollar residual is assigned once by proportionate
fraction and EIN tie order. Each filed member share is allocated only to that
member's real payroll locations. This replaces per-employer duplicated cap use
for the same person. Duplicate same-employer/person rows, conflicting identity,
service-period or target-group sources and reused certification/payroll/source
copies reject. The existing single-member group and independent-employer
paths remain covered by related regressions.

Three registered held fixtures execute the full public source graph:

| Source case | Gross primary/spouse payroll | Group determined credit / filed shares | Pre-QBI taxable income | QBI deduction | Current use | Final tax |
| --- | --- | --- | --- | --- | --- | --- |
| Shared-person phase-in | 6,000 / 6,000 | 2,400 / 1,200 + 1,200 | 461,852 | 25,716 | 2,400 | 127,481 |
| Fractional source allocation | 4,000.49 / 3,000.52 | 2,400 / 1,371 + 1,029 | 466,622 | 21,137 | 2,400 | 130,972 |
| 80 shared people, above range | 480,000 / 480,000 | 192,000 / 96,000 + 96,000 | 683,796 | 83,059 | 118,264 | 68,535 |

The phase-in case has primary/spouse SE tax $7,928/$26,168, half-SE
$3,964/$13,084, combined raw AGI $493,352.37 and 67.252% phase-in. The fractional
case retains raw payroll, profits $177,370.51/$188,028.48 and AGI $498,122.36;
filed Schedule C profits are $177,371/$188,028, Schedule 1 profit $365,399,
half-SE $3,993/$13,284, filed AGI $498,122 and phase-in 72.022%. Filed QBI rows
$173,378/$174,744 sum to $348,122. Raw allocable QBI wages $2,629.49/$1,971.52
file as line 4 $2,629/$1,972; their filed percentages are computed from those
finalized lines and the parent wage total is $4,601. Raw source cents remain
retained. Source W-2 wage schemas now admit those actual cents; no altered
whole-dollar substitute fixture is used.

The above-range case retains the entire $192,000 reduction despite $73,736
unused current credit. Each Schedule C has $384,000 deductible wages and
$216,000 profit; primary/spouse SE tax is $5,785/$27,621 and attributable
half-SE $2,893/$13,811. QBI $213,107/$202,189 yields components $42,621/$40,438.
Filed AGI is $715,296, taxable income $600,737, income tax $149,352,
SE/Additional Medicare tax $37,447, final tax $68,535 and amount owed $7,635.
This proves current use, not durable carryover ledger acceptance.

Native Form 5884 line 2 links both `ControlledGroupMemberStatement` and
`DeductionDifferentiationStmt`, which show member shares and both filed EINs.
The printable allocation supplement lists both employer names/EINs, apportioned
wages, shares and combined filed line 2. All three complete 31-page packets were
visually reviewed, including every Form 3800 page, separate proprietor C/SE
copies, allocation supplements, fractional parent percentages, blank
above-range Part III and final 1040. Held artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-06-joint-controlled-wotc/`
and its `-rendered` sibling, in isolated `/tmp/opentax-joint-controlled-wotc-oct6`
from base `15d49d055`.

Final focused proof passed **4 typed tests, 0 failed**, including all three
public/native/PDF/full local TY2025 v5.4 XSD positives, group-hour minimum/rate
edges, and reviewed ownership/identity/employer/source/SE/current-credit/1040
negatives (`/tmp/opentax-controlled-focus-final.log`). Generator completed with
terminal 0 (`/tmp/opentax-controlled-generate-final-v2.log`).

This positive filing proof covers two MFJ positive ordinary Schedule C sole
proprietorships, first-year certified qualified payroll and the documented
spousal attribution facts. Source assertions and synthetic references do not
authenticate ownership workpapers, SWA certificates, issued W-2s, SSA or payroll
bytes. Wider owner/member sets, external group entity-return claims, predecessor
and cross-year shared-person records, second-year group coexistence, SSTBs,
farms, aggregation, patron adjustments, losses, different wage methods,
attributable health/retirement adjustments, mixed-credit ordering and durable
carryovers remain broader scope. Generic owner-SE remains preserved. No IRS
business-rule, ATS or production acceptance claim is added; the parent stays open.

The selected held checker completed with terminal 0: **3 cases, 93 reviewed
pages**, source/XML/PDF replay, artifact hashes, IRS template provenance and
full local TY2025 v5.4 XSD validation
(`/tmp/opentax-controlled-held-check.log`). These reviewed artifacts are ignored
and retained locally; no board or future task is changed.

Related terminal regression passed **98 typed tests, 0 failed**, covering
retained Single/joint primary/spouse/two-owner WOTC, generic owner-SE, Form
8995-A calculations/PDF and existing single-member group native/PDF statements
(`/tmp/opentax-controlled-regression-final.log`). The final 4/4 focused rerun
also proves the last actual employer-name/source conflict rejection. Earlier
intermediate packets and logs precede the finalized wage projection/ownership
review and are not this held evidence.
## 2026-10-06 owned farm WOTC / regular owner SE source extension

The public reviewed Schedule F direct-employer source now carries its full
Form 5884 line 2 wage reduction into filed farm labor expenses, regular owner
Schedule SE, attributable half-SE deductions, Form 8995/8995-A and the final
1040. Form 3800 current tax use is calculated afterward; it never substitutes
for the determined wage reduction. Single and MFJ primary/spouse ownership is
replayed against actual general/header records, issued income copies, employer
EIN, SWA certification, employee identity, payroll and employee W-2 records.
The retained public input contains original cents; filed leaf operands determine
farm gross income, expenses and profit before SE/QBI calculations. Other owned
ordinary positive farms remain separately identified, including same-owner
half-SE allocation and all three parent QBI columns.

Official basis: [Schedule F instructions](https://www.irs.gov/instructions/i1040sf)
line 22 employment-credit reduction and principal-activity rules;
[Form 5884 instructions](https://www.irs.gov/instructions/i5884) qualified wages
and full line 2 deduction reduction;
[Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) attributable
adjustments and wage limits. Agricultural employees whose agricultural labor
exceeds half of each pay period use Social Security/Medicare wages under the
5884 qualified-wage rule. The review retains agricultural duty/pay-period
records, box 3/5 wages and timely SSA filing records. No prior-year FUTA payroll
threshold is fabricated. [Form 8995 instructions](https://www.irs.gov/instructions/i8995)
also support retaining identified positive QBI when the taxable-income limit
makes its final deduction zero; both the farm zero-use return and an actual
Single Schedule C source replay now file that complete zero-deduction form.

The first packet review caught a classification error in the original proof
sources: principal agricultural-services income belongs on Schedule C. The
final reusable fixtures retain every original total income/payroll cent and
numeric chain, but supply dominant actual issued 1099-G taxable agricultural
program income for reviewed grain-farming activity, plus secondary issued
1099-NEC custom-machine-work receipts. The guard reconciles those copies to
Schedule F lines 4a/4b/8 and rejects missing/conflicting farming records.
The issued copies and review references are synthetic test records; they are
not external authentication evidence.

| Final source case | Filed farm profit total | Half-SE | Raw AGI | QBI deduction | Current WOTC use | Total tax |
|---|---:|---:|---:|---:|---:|---:|
| Single zero use | 2401 | 170 | 2231 | 0 | 0 | 339 |
| Single below | 56401 | 2373 | 204028.37 | 10806 | 2400 | 37805 |
| MFJ primary below | 146401 | 1961 | 364440.37 | 28888 | 2400 | 61134 |
| MFJ spouse phase | 346401 | 7497 | 468904.37 | 39538 | 2400 | 95835 |
| MFJ primary above, limited use | 312001 | 4178 | 607823 | 61565 | 95695 | 34964 |
| MFJ ordinary spouse farm | 366402 | 17404 | 498998.37 | 20229 | 2400 | 131804 |
| MFJ three farms | 367403 | 17418 | 499985.37 | 19610 | 2400 | 132354 |

For example, raw income 350000.50 splits into taxable program income 349000
and custom work 1000.50; filed income is 349000 + 1001 = 350001. Raw labor
6000.49, full determined credit 2400, and filed labor 3600 produce filed profit
346401. Raw allocable QBI wages 3600.49 file as 3600 before percentage lines.
The spouse phase case prints 42.804%; two/three-farm cases print
72.898%/73.885%. The ordinary spouse raw farm 190000.50 files as 190001.
The above-range case retains all 192000 determined credit before owner SE/QBI,
allows 95695 current use, and leaves 96305 unused without claiming a durable
carryover filing. The zero-use case retains full 2400 reduction, positive
QBI 2231, Form 8995 income limit/deduction zero and SE tax 339.

Proof checkout: `/tmp/opentax-owned-farm-wotc-oct6`, base `15ad3b329`, with
root signed formatter `107bd11a9` and ordinary filed C/F helper/graph
`73d8d624b` borrowed for final proof (already integrated separately on main).
This agent commit excludes those borrowed root files/graph hunks. Public,
prepared native and direct PDF conflicts cover owner/header, issued copies,
farm identity, agricultural classification, worker/FICA/payroll/certification,
regular method, source reduction, owner SE, QBI, Schedule 1, AGI and current
credit/final 1040 joins. Seven reusable held returns contain **186 pages**;
every page was visually reviewed, including separate farm/SE owners, all
Form 3800 pages, fractional parent percentages, all three QBI columns and
applicable-only Medicare fields. Final ignored packet folder:
`.state/research/ty2025-filled-pdf-review/2026-10-06-owned-farm-wotc-final-classified/`
and rendered sibling `2026-10-06-owned-farm-wotc-final-classified-rendered`.

This extension supports one reviewed positive active cash-method farm direct
employer with regular SE, zero UBIA/no other QBI adjustments, and up to two
identified ordinary positive zero-employee businesses. Broader farm receipt
source types, losses/negative-half farm WOTC boundaries, optional-method WOTC,
controlled-group farm WOTC, multiple farm credit employers, patron/SSTB/
aggregation, attributable health/retirement adjustments, other statuses,
mixed-credit ordering and durable carryovers remain open. Root's ordinary
signed leaf projection is preserved; this slice does not claim negative-farm
WOTC completion. No IRS business-rule, ATS, production acceptance or external
certification authentication claim is added; the broader parent remains open.

Terminal final evidence: **235 related typed tests passed, 0 failed**
(`/tmp/opentax-farm-wotc-final-typed.log`, 2m53s), covering the seven full
public/native/PDF/local-XSD returns and C/F/1099-G/NEC/5884/owned-WOTC/patron
compatibility. The final Single C zero-limit source test additionally passes
**1/0** with full XSD and PDF (`/tmp/opentax-farm-wotc-zero-c-final.log`).
Final packet generation exits 0 (`/tmp/opentax-farm-wotc-final-generate.log`);
held source/XML/PDF replay and full local v5.4 XSD checker exits 0 with
**7 cases / 186 reviewed pages**, hashes and template provenance confirmed
(`/tmp/opentax-farm-wotc-final-held-check.log`). Earlier unclassified/prezero
artifact folders and logs are superseded and are not this final evidence.

Main farm integration at6cc665dc0 and independent SHOP at2696c4311 pass28/0 combined typed checks in3m4s. Ordinary root filing operands, optional farms, actual ownerSE and repeated8941 documents are preserved. Current-main held farm replay passes7 cases/186 reviewed pages with matching retained source/XML/PDF hashes and localXSD/template provenance; log `/tmp/opentax-farm-wotc-main-held-check.log`, SHA256 `d202e440c25b75ab8082317dda31c6e495c9fb2b94eec92ced4d7726a7bcfdff`. Combined command log `/tmp/opentax-farm-spouse-cf-main-integration.log`, SHA256 `63b35ac7888d89cda5782c60ec738c3f0462d673f96df8ab08e6451daa4a9d1b`. Actual planner has273 fixtures,116 descriptors,113 keys,95 covered and18 uncovered.
## 2026-10-06 — reviewed loss farm WOTC / owned SE / QBI loss filing

The existing regular-SE farm source route now retains a reviewed active cash
farm loss beside one actual same-owner positive ordinary C/F business. Public
issued agricultural 1099-G and secondary custom-work 1099-NEC copies, farm
ownership, employee W2/FICA/pay-period/SSA review, SWA certification and payroll
records continue to reconcile to the actual farm and employer. Full determined
5884 reduction occurs before filed farm profit, combined owner SE, attributable
half-SE, QBI and current Form3800 use. Reducing the wage deduction **reduces an
existing loss**; it cannot deepen that loss. These sources remain genuinely
negative after the full reduction.

Official [8995 instructions](https://www.irs.gov/instructions/i8995) retain
current business loss and ordinary carryforward even with zero deduction.
[8995-A instructions](https://www.irs.gov/instructions/i8995a) require Schedule C
loss netting before the parent, allocate loss proportionately to positive QBI,
and set wages/UBIA to zero when adjusted QBI is nonpositive. Ordinary unused
loss is Schedule C line6; parent line40 concerns REIT/PTP losses and remains
zero. [5884 instructions](https://www.irs.gov/instructions/i5884) require the
full wage reduction independently of credit tax use. No prior loss, historical
tax attribute or accepted carryover scalar is supplied.

Raw cents remain on the source records. For the offset C case, raw gross
20000.50, labor6000.49, determined credit2400 and feed26400.51 produce raw
post-credit farm loss -10000.50. Filed leaf operands give gross19000+1001=20001,
labor3600 and feed26401: expenses30001, farm loss **-10000**, not a separately
rounded raw-profit override. The same-owner C30000.50 files30001, so combined
owner profit20001, half-SE1413, filed QBI rows28588 and-10000, sum18588, deduction
3718. The other negative-half feed boundary26401.50 files26402 and loss-10001;
an actual positive ordinary farm8000.50 files8001, so aggregate loss/carry2000.
All signed leaf/subtotal→Schedule1→SE→QBI→1040 XML/PDF equations use this chain.

| Held source case | Filed farm total | Other C | Half-SE | Raw AGI | QBI deduction | Ordinary QBI carry | Current credit use | Total tax |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Primary below, C offset | -10000 | 30001 | 1413 | 168588.37 | 3718 | 0 | 2400 | 19595 |
| Primary below, zero use | -2000 | 0 | 0 | -2000 | 0 | 2000 | 0 | 0 |
| Spouse below, net loss | -2000 | 0 | 0 | 98000.37 | 0 | 2000 | 2400 | 5106 |
| Primary phase, F offset | 70000 | 0 | 938 | 499062.37 | 3734 | 0 | 2400 | 104228 |
| Spouse above, net loss | -1999 | 0 | 0 | 548001.37 | 0 | 1999 | 2400 | 120170 |
| Primary below, limited use | -18001 | 20001 | 142 | 31858.37 | 72 | 0 | 29 | 283 |

The phase case retains the actual owner176100 Social Security wage cap;
loss-10001 offsets positive source QBI79063 (80001 less half-SE938), giving
adjusted QBI69062. Parent PartIII prints exact72.962%, deduction3734. The
above-range companion retains -10000/8001 and carry1999 with both parent rows'
adjusted QBI/wages zero. The limited case retains80 actual distinct employee
records, full determined192000 reduction and actual farm loss-18001, permits
only29 current credit use and leaves191971 unused. The zero-use case retains
full2400 reduction, two farm copies, both signed Form8995 rows and ordinary
carry2000 without manufacturing tax use or omitting the loss. Actual inherited
issued W2 box6 withholding is retained; where it exceeds regular Medicare,
Form8959 and1040 line25c reconcile the excess. No withholding is silently
recomputed from changed wages.

Proof checkout `/tmp/opentax-farm-wotc-loss-oct6`, base`1d98a1dc5` plus prior
positive farm commit`e424ad0b4` as equivalent`5395ad6c6`. Root signed formatter
and ordinary filed helper are already in the base and are not borrowed edits.
New public conflicts reject missing/inconsistent resolved Form461 scope,
limited/passive farm, wrong proprietor, qualified payroll and issued program
income. Prepared native/direct PDF conflicts reject source expense/owner-SE,
current credit, final deduction, detached/tampered loss companion and changed
ordinary carry. Existing positive farm, optional owner-SE, spouse-owned WOTC,
patron phase-in and existing single/unused ScheduleC loss routes remain tested.
The old positive-fixture assertions explicitly exclude the new loss IDs;
the actual full farm return test includes all13 positive/loss source cases.

Terminal evidence: **19/0** typed compatibility tests, including all13 full
farm public/native/PDF/local-v5.4-XSD returns and optional/owned/patron packets
(`/tmp/opentax-farm-loss-compat.log`,3m28s); separate **38/0** loss and parent/
existing ScheduleC calculation/source checks
(`/tmp/opentax-farm-loss-related.log`,1s). Six reusable held packets generated
successfully (`/tmp/opentax-farm-loss-held-reviewed.log`). All **149 pages**
were visually reviewed, including both farm copies, actual proprietor/SE,
all3800 pages, signed QBI/carry rows, exact phase percentage and final1040.
Ignored final artifacts:
`.state/research/ty2025-filled-pdf-review/2026-10-06-owned-farm-wotc-loss-reviewed/`
and rendered sibling`2026-10-06-owned-farm-wotc-loss-reviewed-rendered`.
Earlier partial packet folders/logs are superseded; the initial inherited
expectation failure was an ID-filter collision, not a final proof pass.

This filing extension supports one reviewed direct-employer regular-SE loss
farm and one identified positive ordinary zero-employee C/F source, no UBIA/
other adjustments, and current-year ordinary loss carry computation. More
than two loss-netting businesses, prior accepted carryover use, optional/group
farm WOTC, multiple farm credit employers, passive/limited losses, attributable
health/retirement, patron/SSTB/aggregation combinations, broader credit ordering
and external source authentication remain open. Synthetic issued-copy review
records are not external authentication evidence; full XSD does not establish
IRS business-rule/ATS/production acceptance. The broader parent remains open.

Final held source/XML/PDF replay and full local TY2025v5.4 XSD checker exits0:
**6 cases /149 reviewed pages**, source/artifact hashes and template provenance
confirmed (`/tmp/opentax-farm-loss-held-check.log`). The apparent zero-W2 joint
header omission on a reduced contact sheet was checked against full-size PDF
text: Sam Example and444556666 print correctly. No shared header/builder edit
was required.

### Two independent farm employer continuation — retained learnings

Continue the existing owned regular-SE source parent. Retain raw cents and
derive signed profit from filed farm leaf operands; full5884 deduction reduction
precedes owner-specific SE/QBI independently of current credit use. Ordinary
QBI carry belongs to8995 line16 /8995-A ScheduleC6, not parent40. Distinct spouse
EINs alone do not establish independent employers: actual reviewed ownership,
all four spousal-attribution exceptions and no other common-control/options
must join both issued payroll/certification/farm source sets. Existing C,
controlled-group, positive/loss, zero, optional and patron routes are retained.

### Two independent primary/spouse cash-farm WOTC source proof — 2026-10-06

Proof base4dc5a8fcb plus the prior loss source commit276ffd5c2 (equivalent
isolatedaa92b44ee). The public route now accepts two actual reviewed farm
employers only when each is a different primary/spouse-owned cash farm and the
existing ordinary joint employer control review joins their actual EINs,
proprietor TINs and farm references. Its four spousal-attribution exceptions
and no-other-common-control/options review remain mandatory; false/missing
facts do not become independent employer evidence. Issued employee W2 source
references must also be distinct across both employer copies. Existing
certification, agricultural covered-duty/payroll, direct employer allocation,
G/secondary NEC income and final-return source joins remain active.

Authority rechecked: [Form5884 instructions](https://www.irs.gov/instructions/i5884)
require the full line2 deduction reduction even when current credit use is
limited and explain agricultural covered wages and section52 common control;
[26CFR1.52-1](https://www.ecfr.gov/current/title-26/section-1.52-1) and
[26CFR1.414(c)-4(b)(5)](https://www.ecfr.gov/current/title-26/section-1.414(c)-4)
supply the ownership/attribution conditions. The reviewed exception facts are
actual retained public inputs, not an inference from separate EINs.

Four reusable held cases retain cent-valued gross/payroll/W2 facts and derive
filed farm leaves, owner SE, attributable half-SE, QBI and joint current use:

| Case | Filed farm profits T / S | Half-SE total | Raw AGI | QBI deduction | Current WOTC use | Total1040 tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| below |36401 /56401|4473|318329.86|17666|4800|55028|
| phase |176401 /186401|17149|495653.37|23552|4800|126730|
| above limited |312001 /312001|13074|1010928.86|122186|187181|86745|
| phase loss |-10001 /196401|13548|472852.37|19249|4800|113577|

The above-range case retains80 actual distinct employee records per employer,
192000 determined reduction per farm /384000 combined, while Form3800 uses
187181. No accepted carryover filing is claimed for the unused196819. External
primary/spouse W2 wages independently consume their own SSA caps; the primary
has no remaining SSA base while the spouse retains76099.51 in the limited
case. Phase percentages69.553% and46.752% print intact. In the loss case only
the spouse has positive regular SE; QBI loss netting offsets182853 spouse QBI
by10001 to172852, with parent40REIT/PTP0 and ordinary carry0.

Actual issued household W2 sources exposed an inherited calculation defect:
Schedule3 excess Social Security pooled both spouses under one cap. The W2
node now groups complete employee-SSN/employer-EIN source copies per owner,
requires multiple employers and wages above that owner's base, then rounds
the finalized combined credit. The existing native/PDF source guard already
used this rule and was preserved. A separate actual second primary employer
proves1240 excess credit; separate one-employer spouses produce none. Legacy
unidentified calculation inputs remain compatible and still cannot bypass
the stricter issued-source filing reconciliation.

Terminal evidence: typed focused source/full-XSD/PDF and review-scope tests
**5/0** (`/tmp/opentax-two-farm-final-focus.log`); W2 unit, existing positive/loss
farm, joint owner WOTC, controlled WOTC and optional farm compatibility
**115/0** (`/tmp/opentax-two-farm-compat.log`,2m53s). Public ownership/payroll/
certification/G/NEC/optional conflicts and prepared native/direct PDF farm,
SE, determined-credit/current-use and final deduction mutations reject.
Four held packets generated:29/30/30/29 pages, all **118 pages** visually
reviewed in20 numbered contact sheets, including both proprietor/SE copies,
AMT/Medicare/NIIT, credit inventory, exact percentage and loss companion.
Ignored packet directory:
`.state/research/ty2025-filled-pdf-review/2026-10-06-two-independent-farm-wotc-reviewed`.

This completes the reviewed independent two-employer regular cash-farm branch;
controlled-group farm allocation, optional farm WOTC, patron/SSTB/aggregation
combinations, more-than-two QBI loss-netting rows, accepted carryovers and
external issuer/SWA authentication remain open. Synthetic reviewed issued-copy
fixtures prove retained source joins and replay, not issuer authentication or
IRS business-rule/ATS/production acceptance. The broader parent remains open.

Final held checker terminal0 confirms actual source replay, artifact/template
hashes and full local TY2025v5.4 XSD for **4 cases /118 reviewed pages**:
`/tmp/opentax-two-farm-held-check.log`. No shared header/builder edit required.

### Controlled primary/spouse cash-farm continuation — retained learnings

Read frozen board/compact header and prior independent/loss proof before this
extension. Continue only the existing regular cash-farm employer/QBI parent.
Common control is an actual retained section52 ownership/management attribution
source, not separate EINs or an independent-employer exception assertion.
Existing5884 group source computes shared-person cap once and proportionate
filed member shares; each share must reduce its real farm before ownerSE/QBI,
independently of joint current use. Preserve independent four-exception route,
raw cents→filed leaves, owner W2 SSA caps and ordinary loss companion/carry.

### Controlled primary/spouse cash-farm source filing proof — 2026-10-06

Isolated proof base2e7dd8710. Actual retained joint member records describe
100% direct ownership of each farm by its respective proprietor, reciprocal
spousal management, applicable ownership attribution, common control and the
complete member/payroll set. The existing5884 group calculator applies the
shared-person cap once and allocates the group's credit proportionately;
no authored QBI/SE/tax/credit amount is substituted for those sources.
The farm reconciliation now joins exactly both filed member farm names, EINs,
references, recipients and proprietor TINs to those reviewed control records.
Independent four-exception sources and existing W2 owner caps are unchanged.

Authority rechecked: [Form5884 instructions](https://www.irs.gov/instructions/i5884)
treat controlled/common-control members as one employer, allocate each member's
share proportionately and require the line2 statement/full deduction reduction;
[26CFR1.52-1](https://www.ecfr.gov/current/title-26/section-1.52-1) and
[26CFR1.414(c)-4](https://www.ecfr.gov/current/title-26/section-1.414(c)-4)
provide the unincorporated control and spousal attribution rules. Each employer
retains its own certification, covered agricultural-duty/payroll and issued
employee W2/SSA sources. Shared employee references must identify the same
issued person SSN across members; one SSN cannot be relabeled with another
person reference to evade the cap. Employer W2/SSA source references remain
distinct. No duplicate source-reference permission was introduced.

Four reusable public-source packets cover full use below/within the QBI band,
fractional qualified wages, cap-binding limited use and an actual owner loss:

| Case | Filed farm profits T / S | Half-SE total | Raw AGI | QBI deduction | Determined reduction T / S | Current use |1040 total tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| below |35201 /55201|4372|316030.86|17206|1200 /1200|2400|56765|
| phase |177372 /188029|17277|498124.37|21135|1371 /1029|2400|130973|
| above limited |432001 /432001|16288|1247714.86|169543|192000 /192000|239748|112690|
| phase loss |-11201 /195201|13532|470468.37|20032|1200 /1200|2400|114922|

The fractional actual employee payroll sources4000.49 /3000.52 yield group
capped wages6000, raw member qualified contributions3428.496745469582 /
2571.5032545304175 and filed credit shares1371 /1029. Both filed ScheduleF
leaf equations and exact72.024% parent phase percentage reconcile. The loss
packet prints44.368%; its primary farm has no positive ownerSE, while spouse
QBI181669 is reduced by11201 to170468. Ordinary carry and parent40REIT/PTP
are both0. The large case retains160 actual shared-person records with320
employer-specific payroll/certification/W2 sets,1920000 raw wages,960000 group
capped wages and384000 full determined reduction before ownerSE/QBI. Actual
joint current use239748 leaves144252 unused; accepted carryover filing is
not claimed. Cent-valued original G/secondary NEC, household W2 and payroll
sources remain retained through finalized farm/SE/QBI/1040/native/PDF lines.

Typed terminal evidence: controlled source/full local TY2025v5.4 XSD/complete
PDF positives and public/prepared native/direct-PDF conflict tests **2/0**
(`/tmp/opentax-controlled-farm-final-focus2.log`,27s); existing independent
farm, controlled ScheduleC, farm-loss, optional owner farm and held-scope
compatibility **15/0** (`/tmp/opentax-controlled-farm-compat.log`,1m17s).
False/missing attribution/management/member review, conflicting farm name,
shared person/alias/source copies, proprietor/payroll/certification/G/NEC,
optional method, SE/source reduction/current-use/final-deduction mutations
reject. Four held packets30/31/31/30 pages include the actual native group
and differentiation statements and printed allocation; all **122 pages**
reviewed in22 numbered contact sheets, including both owner farm/SE copies,
full credit vs limited use, exact percentages and loss companion. Ignored
artifacts: `.state/research/ty2025-filled-pdf-review/2026-10-06-controlled-spouse-farm-wotc`.

This completes the reviewed two-member MFJ regular cash-farm common-control
branch. Optional farm WOTC, additional/mixed entity group members, wider group
ownership configurations, patron/SSTB/aggregation combinations, more-than-two
QBI loss-netting rows, accepted carryovers and external issuer/SWA authentication
remain open. Synthetic reviewed source records establish joins/replay and
calculation proof, not issuer authentication or IRS business-rule/ATS/production
acceptance. The broader parent remains open.

Final held replay/checker terminal0 confirms actual retained source replay,
artifact/template hashes and full local TY2025v5.4 XSD for **4 cases /122
reviewed pages** (`/tmp/opentax-controlled-farm-held-check.log`). Actual XML
includes ControlledGroupMemberStatement and DeductionDifferentiationStmt;
the corresponding Form5884 allocation continuation prints in every packet.

## Mixed common-control C/F source extension (2026-10-06, locally proven)

Retained learning: each issued employee identity can be shared across employers,
while certification, payroll, issued W-2 and SSA records remain employer-specific.
The group employee cap is applied once and its filed member shares reduce the
actual C/F wage deduction before owner SE/QBI, independently of current tax use.
Mixed fractional payroll also requires the reviewed Schedule C filed leaf chain,
rather than raw profit plus independently rounded PDF lines. Original cents remain
in public sources. External issuer/SWA authentication and carryover acceptance
remain open; this extension does not alter SHOP/paired-health or optional farms.

The public route now retains an actual primary service Schedule C and spouse cash
farm with the existing complete section 52 common-control/reciprocal-management
review. Both employers have distinct issued W-2/SSA/certification/payroll sources;
the shared employee SSN and person reference agree. The C review also binds actual
issued NEC copy references; payer/recipient/amount joins match retained receipt
sources. The farm retains principal agricultural G income and secondary NEC
income. Neither QBI, SE profit, nor tax totals are authored public source inputs.

[Form 5884 instructions](https://www.irs.gov/instructions/i5884) treat common-control
members as one employer for the credit and require proportionate shares and an
allocation statement. Line 2 requires the full salary/wage deduction reduction
even if current credit is limited. [Section 1.52-1](https://www.ecfr.gov/current/title-26/section-1.52-1)
provides the common-control rules; existing reviewed ownership and spousal
attribution facts remain mandatory. The mixed route joins both filed members to their actual complete group
ownership and payroll records. [TY2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
preserve cents while adding source amounts for a line, then round its total.
Reviewed regular cash C WOTC now settles filed leaf/expense/profit operands through
the existing owned-business helper, so C → Schedule 1 → owner SE → QBI and native/PDF
use one filed chain while raw public payroll remains retained. SHOP, ordinary
noncredit, optional-farm and patron branches keep their existing separate paths.

Four reusable `owned-controlled-mixed-cf-wotc-*` packets start with public inputs:

| Case | Filed C profit | Filed F profit | Half SE | QBI deduction | Determined WOTC | Current use | Total tax |
|---|---:|---:|---:|---:|---:|---:|---:|
| below | 35,201 | 55,201 | 4,372 | 17,206 | 2,400 | 2,400 | 56,765 |
| fractional phase | 177,372 | 188,029 | 17,277 | 21,135 | 2,400 | 2,400 | 130,973 |
| above limited | 432,001 | 432,001 | 16,288 | 169,543 | 384,000 | 239,748 | 112,690 |
| phase loss | −11,201 | 195,201 | 13,532 | 20,032 | 2,400 | 2,400 | 114,922 |

Fractional raw payroll is C $4,000.49 / F $3,000.52; the single-person group cap is
6,000, filed shares are 1,371 / 1,029, C filed wages 2,629 and C gross 180,001 →
profit 177,372. Raw AGI 498,124.37 gives filed pre-QBI taxable 466,624 and exact
phase 72.024%. In the loss case raw C receipts 20,000.50 / supplies 26,401.50 settle
20,001 − 26,402 − 4,800 = −11,201, joining signed Schedule 1/native/PDF. Spouse QBI
181,669 offsets 11,201 to 170,468; ordinary loss carryforward and parent line 40
remain zero; phase 44.368%. The above-range case has 160 shared people, 320 distinct
employer records and 1.92 million actual payroll; group qualified wages 960,000
produce 192,000 per filed member, independently of 239,748 current tax use.
Primary SS wages bind the 176,100 owner cap in the below case; spouse wages retain
50,000.49 and the separate owner SE calculation.

Full public execution, final native source replay, full local 2025 v5.4 XSD and
filled PDFs passed. Four held packets contain 30 / 31 / 31 / 30 pages; all 122 pages were
rendered and visually inspected, including both proprietor copies, all nine
Form 3800 pages, printable group allocation, exact percentage and loss Schedule C.
The final held checker replays current public sources/XML/PDF, template hashes
and full XSD and passed 4 cases / 122 pages. Artifacts are ignored at
`.state/research/ty2025-filled-pdf-review/2026-10-06-mixed-controlled-cf-wotc` in the
isolated `d882d91d7` checkout. Initial farm-only empty-C PDF preflight failures
were repaired; subsequent prior farm positive/loss/independent/control replay
passed 6 / 0. Source negatives cover missing control, attribution/management, wrong
owner/EIN/person identity, aliased person, reused SSA/W2, certification/payroll,
actual G/NEC copy/payer/recipient, full reduction, owner wage cap/SE profit,
Schedule 1, current credit and final QBI, through public prepare / native / direct PDF.

Remaining scope: this mixed route is one reviewed primary/spouse regular cash
C/F pair, not additional group entities, capitalized wages, optional farm method,
patron/SSTB/aggregation or wider loss allocations. Retained synthetic reviewed
issued records establish calculation/source joins, not external issuer/SWA
authentication, accepted credit carryovers, IRS business rules or ATS acceptance.
The wider Forms 8995 / 8995-A / 3800 parent remains open.

Focused mixed return suite passed 2 / 0 (24 seconds), including full public,
prepared native and direct PDF conflicts. Optional-farm, joint-patron, owned
paired-health, SHOP native and review-scope compatibility passed 21 / 0
(1 minute 44 seconds). Final prior controlled C / controlled and independent F /
farm loss / joint C source compatibility passed 17 / 0 (2 minutes 55 seconds).
Terminal logs: `/tmp/mixed-wotc-final-commit-focus.log`,
`/tmp/mixed-wotc-terminal-compat.log`, `/tmp/mixed-wotc-scope-compat.log` and
`/tmp/mixed-wotc-held-check2.log`. These are isolated focused proofs; no main full
regression, release acceptance, board or future-task status is changed.


### Mixed C/F current-main verification

Source30774dd85 plus actual-tip correction660521649 passes combinedmain62/0(3m2s), and prior controlledC/controlledF/independentF/farmloss12/0(1m13s). Logs `/tmp/opentax-mixed-wotc-qualified-tips-current-main.log` SHA256 `11334d922bbea926bf2045f9945c04f4297b0b9ca8375104f9c6e22546444806` and `/tmp/opentax-mixed-wotc-prior-source-current-main.log` SHA256 `b5c339b30149fb8a5fb9343d986fc169b43c3555172a1ca09dbe5a7366c096e2`.

The old held checker failed exactpending comparison because current graph retains Form1040 determinedWOTC source and actual Schedule1A ownerSE inventory. Those changes did not change tax amounts. Original source/XML/PDF bytes remain untouched. A fresh current-main batch at `/tmp/opentax-mixed-wotc-held-regenerated-main-oct6` uses the same public sources; allfour PDFs equal the reviewed122pages. New checker passes4cases/all122pages including currentpending/source/XML/template/XSD replay. Log `/tmp/opentax-mixed-wotc-held-regenerated-main-check.log`; manifestSHA256 `7348b2e9e996187836da9a95ca86bf1031943d7f4bdb83c9a792cca5f8726cfc`. The old failed checker is not described as passing.

## Fractional parent products after current loss netting — verified October6

The retained cent-valued two-business route now rounds monetary20%/50%/25%/2.5% parent entries before additions and comparisons, rather than requiring unrounded percentage products to be integral. Positive adjustedQBI201/203 yields40/41, odd101 wages yields51 wagecap, and adjustedQBI1 retains the parent/companion withzero deduction. Raw sourcecents remain retained. Main focus1/0 forfourfullXSD returns/48reviewedpages, compatibility48/0 and actualsavedsource4/48exact pending/carry/origins/PDF/nativeonlyTs replay pass. See [fractional parent proof](./ty2025-form8995a-fractional-parent.md). Historical rejection descriptions above retain their original scope; broader ownership, activity, SE-allocation, priorhistory/authenticity andIRS parent remainsopen.
