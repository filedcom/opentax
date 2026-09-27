# TY2025 MeF product board

Last reviewed: 2026-09-27. This board tracks the current worktree, not a
released product. A registered XML builder or a passing XSD test is not proof
that every tax situation for that form is correct.

## Agreed scope

The user selected the **TY2025 Form 1040 family only** for this board. The
completion gate covers the Form 1040 return and its in-scope schedules, forms,
source documents, and supporting statements. Separate 1040-NR, 1040-SS, and Form
4868 return exporters and their ATS scenarios are out of scope here. Their
source-fact inventory remains in `docs/ats/ty2025.md` as reference material, not
as an unfinished gate on this board. This decision does not waive any required
Form 1040 attachment or business rule. The 2025 dual-status Form 1040 route is
also outside the e-file gate because
[IRS Publication 519](https://www.irs.gov/publications/p519) says dual-status
taxpayers cannot e-file their 2025 returns; the product must not serialize one
as an ordinary Form 1040 MeF return.

## Current status

**Phase: implementation and correctness audit. Release status: blocked.** The
TY2025 Form 1040 calculation and MeF export changes are saved on the pushed
`codex/ty2025-form1040-board-wip-20260926` branch. Implementation continues
there. No PR, merge, deployment, IRS ATS transmission, or ATS acknowledgment is
recorded for this work.

The parallel 2026-09-27 build pass is still unverified. Schedule 2 now writes
the calculated 2025 totals on lines 1z, 3, 7, 18, and 21 for its supported
sources, including the negative Form 8978 adjustment and excluding the section
965 installment from line 21. Source and XML cases are written but not run. Form
8283 Section A now routes the claimed deduction instead of FMV and requires a
linked, donee-issued vehicle acknowledgment PDF with an IRS-approved MeF
description when a vehicle row is filed. Form 1095-A has an explicit corrected
monthly SLCSP path for coverage-family and related changes. Form 8582 now
reconciles identified activity amounts with aggregate inputs and has a bounded
prior Form 4797 passive-loss filing route described below. Form 8814 PDF
dotted-line income annotations are being built. All these cases remain unrun
under the agreed implementation-first test sequence; none closes its entire gap
or clears the release gate.

For GAP-8582, the 2025 Part IX per-form/part loss allocation now has a bounded
other-passive route for prior Form 4797 Parts I/II losses, including a current
gain from a dated sale in the same retained activity. Schedule E supplies the
origin-tagged prior losses and reporting form; one shared allocator splits
allowed operating versus Part I/II amounts. Form 8582 writes Schedule 1 lines
5/4 respectively, AGI deducts the combined allowance once, and Form 8582/4797
MeF builders consume the same ledger for Part IX and PAL rows. Dated,
activity-linked positive no-depreciation current sale rows fill native Form 4797
MeF Parts I and II; their gains enter the Form 8582 limit and Part IX same-part
offset, while losses already netted on Form 4797 are not subtracted again in
AGI. A second bounded path now carries an active rental's dated Schedule E
property sale through provisional Schedule D and AGI, Form 8582's special
allowance and Part IX split, and final Schedule D/AGI/1040 values without a
dependency cycle. Current operating loss and sale gain stay separate on Form
8582, and duplicate sale sources stop. Depreciation recapture, whole-activity
disposition exceptions, and aggregate Form 4797 source overlap remain blocked.
PDF export still stops on these complex PAL/property-sale rows until its exact
2025 field maps exist. This does not complete GAP-8582; all new cases are
written but unrun.

The same parallel pass writes Form 8962's guarded alternative year-of-marriage
calculation and native Part V groups, with line 26 zero on an election. Its 2025
PDF field map now covers both Part V lines 35/36 and checks line 9 Yes for an
election, with focused field/projection cases written but no render yet. The
Part V calculation now carries its monthly contribution through a coverage gap
between the source start and stop months, as Publication 974 Worksheets II/IV
require; a gap still has no credit. Form 1095-A now records the policy's
pre-marriage spouse owner and passes corrected/allocated monthly rows by policy
number. The alternative calculation selects those exact source rows, rejects
missing or mismatched identities, and reconciles pre-marriage premiums, SLCSP,
and APTC to the aggregate. The source now requires the wedding month with
spouse-owned policies; same-state SLCSP amounts are summed separately by spouse
through that month and deduplicated as a joint coverage family afterward. This
follows the 2025 Form 8962 marriage instructions. The old manually entered
worksheet monthly arrays are removed. The SLCSP source audit now requires a
Marketplace tool/contact determination for each covered no-APTC month, even when
Form 1095-A reports a positive column B, and for each covered month in a
declared unreported coverage-family change or move period. Corrections carry
their determination source and affected-month reason. Undeclared changes and
Marketplace accuracy still require intake verification. The QSEHRA annual branch
now follows the distinct Publication 974 Worksheets N/Q formulas and checks
annual 1095-A totals against supplied monthly columns. An annual-only policy
still cannot be combined with a monthly policy without its missing monthly
facts. Form 4952 can now receive affirmed taxable market discount from 1099-B
after the matching Form 8949 code-D adjustment. Part-II-only Form 4972 federal
estate tax now splits between capital-gain reduction and a Schedule A line 16
ordinary-income deduction. Form 1116 line 3b now has a linked other-deductions
statement. Source cases are written for each route, but none has passed the
deferred test or XSD batch.

The Form 8949 MeF build pass now preserves all twelve TY2025 paper boxes
separately instead of merging 1099-DA digital-asset categories into 1099-B
categories. It emits the six short-term groups before the six long-term groups,
uses the v5.4 checkbox names, and rejects unknown boxes or conflicting term
flags. The all-boxes XML and local XSD cases are written but unrun. Source
classification of each transaction and ATS business rules remain open.

The Form 8874 build pass replaces precomputed credit buckets with identified
qualified equity investments and 2025 credit allowance dates. It computes the 5%
or 6% current-year credit, rejects duplicated or ineligible date facts, and
routes the nonpassive amount through Form 3800 rather than directly to Schedule
3. A native IRS8874 document and Form 3800 Part III line 1i/Part V source row
are written, with source reconciliation and local XSD cases, but all cases are
unrun. The route now also takes nonpassive partnership box 15 code AD and
S-corporation box 13 code AD credits directly to Form 3800 without inventing an
IRS8874 attachment. The claimed amount is checked against its entered K-1
identity and credit, with Part V source rows and explicit allocation required
when a partial tax limit cuts across multiple same-line sources. Those cases are
written but unrun. Estate/trust box 13 code ZZ New Markets Credit now also
requires an identifying statement and reaches the same source-backed line 1i
without an invented IRS8874. Its reconciliation cases are written but unrun.
When a taxpayer files an IRS8874 for an own QEI and also has partnership or
S-corporation code AD credits, line 2 now includes the filed K-1 amounts and
line 3 adds them to the own QEI credit. The line 2 sources must match their
direct Form 3800 entries or passive Form 8582-CR activity sources. The native
XML and mismatch cases are written but unrun; a pass-through-only claim still
does not create a Form 8874 document. Passive K-1 code AD/ZZ amounts now deposit
a required Form 8582-CR marker; the activity source must match the K-1 credit
and the MeF builder reconciles it again before Form 3800 receives the passive
allocation. These cases are written but unrun. A self-earned passive QEI now
deposits a source-specific Form 8582-CR requirement, while only the nonpassive
portion goes directly to Form 3800. The filed Form 8874, Form 8582-CR activity,
Form 3800 amount, and source document count are cross-checked. Passive-only Form
3800 line 1i and multi-source Part V rows now link back to the IRS8874 document,
with passive-only and mixed-source cases written but unrun. Passive sources
currently require whole-dollar credit amounts because the Form 8582-CR source
model does; cent-bearing passive credit reporting remains open. Carryovers,
recapture and sale events, leap-day allowance dates, filled PDF inspection, and
IRS business-rule/ATS evidence also remain open. It is not filing ready.

The New Markets recapture build pass now has a separate Form 8874-B event input
that works without a current-year Form 8874. It records the noticed taxpayer,
CDE, QEI identity and amount, notice credit amount, and event reason without
mistaking the notice amount for the taxpayer's tax. It takes each prior year's
Section 38 allowed-credit recomputation and a referenced QEI carryover ledger by
originating year, computes the allowed-credit decrease plus daily-compounded
interest through the unextended 2025 return due date from IRS quarterly
underpayment rates, and routes the result to Schedule 2 line 17a. The MeF
builder emits a separate `NMCR` group beside any `3468` group; the PDF
projection totals both on line 17a. The filed Schedule 2 builder now requires
the recapture input and recomputes its `NMCR` amount before XML, rejecting
missing or mismatched source data. A full-return case covers recapture without
an IRS8874 attachment. Source, routing, XML, and PDF projection cases are
written but unrun. The source now rejects a substantially-all event unless the
six-month cure exception was reviewed and found inapplicable, and rejects credit
amounts above the QEI's seven-year maximum. A written interest case crosses 2023
quarterly changes and the 2024 leap year. This is not a completed recapture
audit: original return due dates and prior recomputations are still supplied
facts, the Section 39 carryover adjustment is now an explicit per-vintage
before/removed/after ledger with referenced year-by-year credit use that must
reconcile to the generated amount, but is not yet posted to Form 3800 Part IV.
Historical carryback and carryforward use still need actual return
reconciliation. The Part I/II tax-use calculation also needs to reconcile a Part
IV column (h) recapture against column (f) before this can be filed. Interest
rounding and leap-year handling need IRS example reconciliation, and filled PDF,
local XSD, business-rule, and ATS checks remain open.

The current build pass now routes nonpassive Schedule K-1 orphan-drug credits
from partnerships (box 15 code Z), S corporations (box 13 code Z), and
estates/trusts (box 13 code M) directly to source-backed Form 3800 Part III line
1h. It reconciles each credit to its filed K-1, combines it with any separately
earned Form 8820 amount without duplicating a source, and does not invent a Form
8820 attachment for K-1-only credits. The source, tax-limit, and XML cases are
written but unrun. Passive K-1 credits still need Form 8582-CR activity and tax
facts; they are not treated as nonpassive credits.

The existing Form 8582-CR source-and-tax input is now reachable from the normal
Form 1040 start node, so a taxpayer can supply the passive-credit activities and
the two required passive-income tax figures for calculation and Form 3800
routing. A full-return passive K-1-to-XML case is written but unrun. Automatic
creation of those activity facts from a K-1 amount alone is not claimed; K-1s do
not supply the tax-without-passive-income figure. The K-1 nodes now require any
passive orphan-drug code Z/M amount to match the entered Form 8582-CR activity
sources. Omitted or mismatched facts produce a diagnostic rather than silently
losing the credit, and the XML builder also rejects a marker with no source
facts. These cases are written but unrun. The same missing-source guard is now
written for passive disabled-access K-1 code K/ZZ credits. Form 8582-CR
reconciles a single K-1 credit split over multiple activity rows, including a
cents-bearing code K/ZZ amount against its whole-dollar activity total. The
guard and return/XML cases are unrun. Nonpassive partnership and S-corporation
code K now route directly from the filed K-1 to Form 3800 line 1e without an
invented Form 8826 attachment. The XML builder reconciles source identity and
cents to the K-1, rejects a duplicate Form 8826 source, and retains the shared
$5,000 line 1e cap. Source, cap, and XML cases are written but unrun. The build
pass now routes gross Form 8826 and nonpassive K-1 sources with public Form
8582-CR facts through an upstream disabled-access node. It pro-rates a shared
$5,000 current-year cap, passing whole-dollar passive shares to Form 8582-CR
before its tax limit and cent-precision nonpassive shares to Form 3800. The
gross K-1 facts remain in that node for source reconciliation. The MeF build
pass now recomputes the cap from those gross facts, checks capped Form 3800 and
Form 8582-CR rows, and reconciles the original K-1/Form 8826 amounts. Even a
nonpassive K-1 source rounded to zero by the cap is now checked against its
gross K-1 amount. A mixed K-1 graph, zero-share source case, and local XSD case
are written but unrun. A self-earned passive Form 8826 source now supplies a
gross source-reference marker that must match the public Form 8582-CR activity
amount before the same cap; the MeF ledger checks it against Form 8826. Its
mixed graph, source-document, and local XSD cases are written but unrun. Passive
Form 8826 partnership and S-corporation line 7 sources now deposit their own
gross-evidence marker, which must match the Form 8582-CR activity rows and the
entered K-1. This avoids counting the same K-1 twice when both source documents
are entered. The graph, provenance, and XSD cases are written but unrun. Until
the full-batch and IRS business-rule checks pass, mixed-source filing is not
supported. The IRS requires pro-rata allocation of the overall limited credit;
the per-source rounding policy still needs business-rule review.

The latest completed full test run is **6,596 passed, 0 failed, 48 ignored**
(`deno task test`, 2026-09-26, before the later multi-policy line 10 and
dependent-MAGI changes). The user asked for the remaining implementation to be
built before the next full-batch test, so that run is only a historical
baseline. The 48 ignored tests are disabled live-IRS-PDF field-name checks (one
per registered PDF descriptor). This remains a partial coverage result, not a
release gate or ATS acceptance.

ATS Form 1040 Scenario 8 now has a source-backed full-return calculation input
and written but unrun expected-line and v5.4 XML cases. The source PDF's QCD and
rollover marks do not match its 1099-R IRA indicators, so the fixture keeps the
marks as source evidence without inventing transactions. This does not count as
IRS ATS acceptance. The MFS lived-apart answer is now routed to the Social
Security calculation and 1040 line 6d XML; an omitted answer with MFS Social
Security is rejected rather than silently treated as lived apart. These cases
are also unrun.

The current build pass also adds Form 8962 Part IV Situation 1 agreed and
no-agreement allocations, Situation 3 no-APTC allocations, and Situation 4
agreed and no-agreement allocations. Source-to-XML cases are written but not yet
run. Multiple nonoverlapping shared allocation periods on one policy are also
coded, with source-to-XSD cases written but unrun. Mixed shared and family-only
periods on one policy now use explicit coverage-family SLCSP inputs and emit
only the shared-period Part IV rows. The build pass also lifts the electronic
Part IV row limit to the IRS schema's 99 groups and marks line 34 No after four
rows. The 2025 PDF descriptor has been remapped against the actual fillable
form, including monthly rows and four printed Part IV allocations; the builder
now appends a paginated statement for the fifth and later allocations, with line
34 marked No. These PDF edits have not had filled-render verification. The MeF
overflow design is an XML-schema inference, not IRS ATS acceptance. This does
not change the historical full-test status above.

The current untested Schedule 3 pass aligns credit fields with the 2025 printed
lines and MeF elements: general business credit 6a, prior-year minimum tax 6b,
new clean vehicle 6f, mortgage interest 6g, and previously owned clean vehicle
6m. It also moves Form 8805 withholding from the incorrect Schedule 3 line 13d
route to Form 1040 line 25c. The personal-use Form 8936 credit is now limited
after Form 1040 line 18 is known, then replaces the tentative Schedule 3 lines
6f, 6m, 7, and 8. The new-vehicle nonpassive business-use slice now reaches Form
3800 line 1y; other Form 8936 eligibility and source reconciliation remain open.
None of these changes has passed the deferred full test batch.

The current Form 8396 build pass replaces a gross Schedule 3 deposit with
source-backed certificate, optional different-home US address, and separate
2022-2024 carryforwards from named 2024 Form 8396 lines 16, 14, and 17. The
prior form copy is still entered evidence, not authenticated. It now derives
current-year certified interest from a named Form 1098 or lender statement and
the fixed original-loan certificate fraction. A referenced Form 1098 must match
the entered box 1 amount and be unique in the filed input; the actual document
has not been authenticated. The certified-loan allocation now has a full-return
graph case written but unrun. It computes printed lines 1-17, limits line 9
after Form 1040 tax is known, and reduces Schedule A mortgage-interest deduction
by the full line 3, not merely the allowed credit. Native MeF, source-to-XSD,
and PDF field-map cases are written but unrun. The PDF descriptor now maps the
certificate, lines 1-17, and the credit-limit worksheet to the 2025 AcroForm
fields, but a filled-PDF render has not been inspected. Reissued MCCs,
source-document authentication, and IRS business-rule/ATS checks remain open.
The reissued-MCC branch needs original-loan scheduled-interest evidence and a
consistent comparison method, plus split old/new interest and a linked native
statement when the certificate rates differ in the refinance year. The current
input rejects it rather than filing an unsupported amount.

The current Schedule 2 audit moves HSA distribution tax to the correct 2025 line
17c and HSA testing-period tax to line 17d, Form 8828 mortgage-subsidy recapture
to 17b, and Form 8611 low-income-housing recapture to 16. The MeF builder now
orders these and the line 13 aggregate in schema order. The ambiguous Form 4255
original-credit-times-year shortcut has been replaced with explicit TY2025 Part
I row facts for Form 3468 Part IV line 1d and Form 8933 line 2a. Those rows now
drive Schedule 2 lines 1d, 1e, 1f, and 19, with native `IRS4255` row groups and
source reconciliation in the Schedule 2 MeF/PDF builders. The earlier generic
line 17a `3468` route is rejected; other Form 4255 credit recapture types and
column (j)/(k)/(n)(2) routes still need exact source models. These cases are
written but unrun. The 2025 Schedule 2 PDF now maps already-sourced lines 9, 13,
16, 17b/c/e/f/h/k/p, and 20; line 13, 17h, and 17k aggregate their existing
source amounts on the printed form. PDF field-map cases are written but unrun.
The official TY2025 form and v5.4 schema additionally require source-backed
installment-sale interest for lines 14-15. These remain open, not represented by
arbitrary Schedule 2 inputs. Line 19's Form 8978 chapter-1 classification also
needs specific authority. Filled-PDF inspection and the full validation batch
remain open. Form 8889 now routes taxable HSA distributions and testing-period
income to Schedule 1 line 8f, with separate Schedule 2 lines 17c and 17d. The
build pass adds separate line 14b rollover and timely excess-withdrawal facts,
routes withdrawal earnings to Schedule 1 other income, and adds Part III lines
18-21, native MeF lines and beneficiary identity, and PDF fields. It removes
assumed self-only/full-year coverage for contribution cases. Twelve explicit
monthly facts now support mixed/partial-year HDHP limits and an elected
last-month rule, while an explicit excepted taxable amount handles mixed
distributions on line 17b. One or two sourced direct IRA-to-HSA transfers can
populate line 10 and reduce line 12 within their coverage and annual limits. An
agreed share of the refigured family limit computes line 6 when spouses have
separate HSAs, without assuming an equal split. Employer excess uses explicit
W-2 box 1 inclusion and timely-withdrawal facts, with retained excess flowing to
Form 5329. A filed 2024 Form 5329's lines 48/49 can now feed 2025 carryover:
Form 5329 lines 42-49 reduce it by unused contribution room and taxable HSA
distributions, and eligible prior excess is added to Form 8889 line 13. The
corresponding MeF/PDF mappings and focused cases are written but unrun. Separate
spouse forms, source verification of monthly eligibility and prior-year testing
periods, PDF field verification, and ATS still need work. Form 5405 repayment is
rejected for TY2025 because the IRS ended that form after TY2024. The source and
XSD cases are written but unrun. Form 8611 now has a per-building source model,
printed-form line calculation including the per-year Form 8609-A line 2
worksheet, one `IRS8611` attachment per building, and Schedule 2 line 16
document links. Bond-financing details and a recapture-exception decision are
required source facts. Its written node, XML, and XSD cases are unrun; historic
credit, qualified-basis, and interest amounts still require source-record
verification. Other Schedule 2 routes still need audit. The section 965
installment now goes to Schedule 2 line 20 and is excluded from line 21/Form
1040 line 23, matching the printed 2025 line 21 sum. A new Form 965-A source
model and MeF descriptor now carry cumulative Part I/II liability and payments,
Part III S-corporation computations, and Part IV deferred balances, and
reconcile current-year payments to Schedule 2 line 20. The old assumption that a
2017 inclusion normally has its eighth installment in 2025 was incorrect; the
normal eighth year was 2024. Native MeF statements now describe netted Part I
adjustments/transfers and allocate Part IV transfers among multiple transferees,
with required source facts, reconciliation, and parent document links. The build
pass now takes source-provided signed Form 965-C, 965-D, and 965-E PDF copies
for reported transfer or consent events, preserves their bytes in the MeF
bundle, and links them from Form 965-A. Multiple partial Form 965-D transfers
require one copy per transferee. The bundle case is written but unrun. It does
not create, sign, mail, or authenticate an agreement. Consent-triggered Form
965-E installments now also require evidence of the separate section 965(h)
election; the case is written but unrun. Part IV transfer-in rows now omit the
beginning balance and retain the transferor's agreement link; those cases are
also written but unrun. The triggered-liability case now distinguishes Part I's
triggering-event year from Part IV's original deferral-election year and
validates an event date; those cases are unrun. Historical tax computations and
IRS business rules remain open.

The current untested Form 8936 commercial-vehicle pass replaces the new/used
boolean with one three-way credit type and adds Schedule A Part V basis, Section
179, incremental-cost, 15%/30% rate, and $7,500/$40,000 cap calculations. A 2025
light street-vehicle safe harbor or a documented comparable vehicle price
supplies incremental cost. The nonpassive amount routes through parent Form 8936
line 19 to Form 3800 Part III line 1aa, with MeF and PDF mappings and written
cases. These routes have not run in the deferred full test batch, and no filled
PDF or ATS transmission has been verified. Passive credits, pass-through-only
commercial credits, recapture, and cross-form basis reduction remain open.

The Form 8936 calculation pass now distinguishes the $75,000/$112,500/$150,000
previously owned vehicle MAGI limits from the new-vehicle limits, applies
current-or-prior-year MAGI with each year's filing status, and refuses to award
a credit without a valid acquisition date. It excludes acquisitions after
September 30, 2025 and stops reducing the previously owned credit by a
business-use percentage. These cases are written but unrun. VIN/seller
verification, placed-in-service and other recapture facts, remaining
business-use classes, and ATS evidence remain open.

The next Form 8936 input pass requires structured VIN/year/make/model, a valid
2025 placed-in-service date, seller-report confirmation, 30-day resale and
use-not-resale answers before awarding a credit. Previously owned vehicles also
require dependent/prior-claim answers, dealer purchase, first eligible transfer,
and a model year at least two years older than acquisition. The corresponding
cases are written but unrun. These checks do not substitute for the remaining
business-use classes, other recapture rules, or ATS acceptance.

An `IRS8936ScheduleA` builder now writes one XML document per vehicle from the
captured identity and credit facts, including new and previously owned groups
and the dealer-transfer amount. The input node no longer routes
dealer-transferred amounts to Schedule 3 as a second personal credit. The
builder is registered for personal-use and dealer-transfer filing cases. A
disqualified transfer now routes its seller-reported amount to Schedule 2 line
1b or 1c, with a reference to the parent Form 8936, rather than to Schedule 3.
The parent builder checks the repayment against Schedule 2. These cases are
written but unrun; other recapture conditions remain open.

The current Form 8835 build pass separates the 2025 base production rate from
the fivefold increase, models qualifying conditions, bond reduction, bonuses,
and transfer-out amounts, and forwards per-facility credits to Form 3800 instead
of sending them straight to Schedule 3. Calculation and routing cases are
written but unrun. This is not complete Form 8835 or Form 3800 support: the Form
3800 MeF document, transfer-election statement, source-document reconciliation,
full eligibility/source evidence, PDF output, and ATS validation remain open.
The build pass now has an unrun pure Part II calculation for individual,
non-passive credits, including the separate ordinary and specified-credit limits
and the married-filing-separately threshold. The source-backed Form 8826 and
Form 8835 path now carries classified credit to final return assembly, uses Form
6251 TMT and finalized Form 1040 and Schedules 2/3 lines, and posts only the
calculated allowed credit to Schedule 3. This route and its cases are unrun;
other Part III/IV categories still need reconciliation.

The Form 8835 MeF build pass now creates one `IRS8835` document per facility and
requires Part I location, ownership, capacity, and statement-file facts before
export. It maps the calculated Part II lines and has local XSD and negative
cases written but unrun. Fiscal-year production still stops, and the linked Form
3800 document, transfer election statement, Form 7220 source validation, PDF
output, and complete ATS scenario remain open.

The registered Form 3800 nonpassive XML path now maps Form 8835 ordinary and
specified credits to Part III, requires bundled transfer-election statement IDs,
and breaks multiple same-line facilities into Part V rows. Per-facility applied
amounts must be explicit when a tax limit partly uses multiple facilities on one
credit line; all allocations reconcile to the calculated limit. The source-row
check now permits Form 8820 and Form 8835 to share a limited standard-credit
amount while the combined allocation still reconciles to Part II. A shared Part
I/II serializer now keeps passive line 2/3/23/24/32/33 separate from nonpassive
line 1/30 and writes the calculated totals in schema order; its passive case is
written but unrun. The filed descriptor now joins passive sources, source tax
use, and mixed-credit XML; its passive-only and mixed-source cases are written
but unrun. A current-year row combiner now totals passive and nonpassive amounts
once per credit line, including when both belong to the same line; its cases are
written but unrun, and a shared Part III serializer now keeps gross nonpassive
credit, transfer-out, passive before-limit credit, available credit, and tax use
in separate columns. The passive rows and nontransferable Form 8820, 5884, and
8936 rows consume it; the mixed same-line case and local XSD case are written
but unrun. The filed builder now uses that serializer for Form 8826 as well,
with cent-precision source accounting and whole-dollar XML output; its
mixed-cent case is written but unrun. The nonpassive filed builder now places
line-keyed Part III groups through one schema-ordered assembler that rejects
duplicate or unmatched rows. The assembler now derives Part III column totals
from current-year source amounts instead of reusing Part II limits that can
include carryovers; its mixed current-year and cent-precision cases are written
but unrun. The descriptor now combines passive and nonpassive rows. Direct
builder cases are written but unrun. The draft now indexes Part V facility
allocations and linked source documents by entry position, so equal-valued or
reused facility objects do not silently reuse the first allocation; that case is
written but unrun. The descriptor links source Form 8826/8835 documents and
Schedule 3 line 6a, and refuses missing or mismatched source facts. The current
build pass also reconciles its Part II tax context against filed Form 1040,
Schedule 3, and Form 6251 amounts; its mismatch cases are written but unrun. It
has not passed the deferred full test batch, local XSD, or business-rule
validation and does not cover every passive credit category, other
business-credit sources, or carryovers. The current build pass also has an unrun
pure bridge from finalized Form 1040, Schedules 2 and 3, and Form 6251 lines
into the nonpassive Form 3800 limit. It subtracts the specific Form 3800 line 7
and 10b exclusions instead of letting the general business credit count against
itself. The bridge is now wired to graph finalization for Form 8826 and Form
8835 and requires Form 6251 even with zero AMT when a standard GBC is claimed,
but remains untested. Other GBC producers still send gross source credits
straight to Schedule 3 line 6a and require a common limitation pass. The
[Form 8826](https://www.irs.gov/pub/irs-pdf/f8826.pdf) self-earned source now
requires both preceding-year receipts and full-time employee headcount instead
of treating missing facts as eligibility; its cases are written but unrun. Its
credit now enters Form 3800 instead of being deposited gross into Schedule 3;
the limited amount now reaches Schedule 3 in the graph. MeF source linkage is
implemented but unverified in the deferred full batch. The legacy
`f3800s.disabled_access_credit` input still deposits gross credit. These routing
cases are written but unrun. A native `IRS8826` XML descriptor now shares the
source calculation for lines 1, 3, 5, 6, 7, and 8, with direct schema and
reconciliation cases written but unrun. It is registered for self-earned claims,
requires a Form 3800 document in the linked bundle, and omits the recipient's
own form for pass-through-only claims. Form 8826 now requires a passive-activity
answer and a source reference for a passive self-earned credit, and requires a
matching Form 8582-CR activity input rather than routing it as nonpassive. Those
cases are written but unrun. The build pass now accepts identified partnership
and S-corporation line 7 sources, caps their combined line 8 with self-earned
credit at $5,000, and lets pass-through-only credit reach Form 3800 without
requiring the recipient's own eligibility facts or an `IRS8826` document.
Passive K-1 credits require matching Form 8582-CR activity and tax facts. Each
pass-through source now requires a document reference; the filed path matches
current-year partnership and S-corporation code K K-1 facts to its EIN,
reference, gross credit, and passive flag, and requires Form 3800 even when the
recipient has no Form 8826 document. These source, missing-link, and XML cases
are written but unrun. The filed Form 3800 path also rejects passive Form 8826
source facts mislabeled as nonpassive. The combined cap now allocates credit pro
rata in cents to each identified source before the Form 3800 handoff. The
registered Form 3800 nonpassive XML path now includes Form 8826's distinct Part
III line 1e group and Part V rows for multiple Form 8826 sources. Part V retains
the K-1 EIN, capped source credit, explicit applied-credit split, and remaining
amount. Its Part III applied credit reconciles with Form 8835's line 1f and 4e
groups and the shared Part II limit. The combined passive and nonpassive line 1e
now shares the $5,000 upstream cap; the filed builder still rejects a total
above that limit. Those cases are written but unrun. Estate/trust K-1 code ZZ
disabled-access amounts now enter the Form 3800 source graph when marked
nonpassive, retaining separate K-1 and statement references. The input and graph
cases are written but unrun. The filed Form 3800 XML path now reconciles direct
estate/trust code ZZ source amounts against the entered K-1 and named statement,
joins them with own, partnership, and S-corporation sources under one line 1e
row, and uses the shared Part II tax-use allocation and Part V detail path. A
pass-through-only recipient omits IRS8826, as the
[2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800) allow.
Direct, mismatch, and local XSD cases are written but unrun. A mixed source set
above $5,000 now uses a shared cent-precision, largest-remainder proration to
allocate the Form 3800 line 1e cap among entered sources; the graph, filed
source rows, and partial Part II use consume the same allocation. The IRS
instructions state the line cap but do not specify this per-source allocation
method, so it needs business-rule review. The combined passive and nonpassive
line 1e path now apportions the cap before either activity or tax limitation,
but its whole-dollar passive versus cent-precision nonpassive rounding remains
unverified. Input-to-input K-1 matching does not authenticate the K-1 or
statement. The Part V draft now apportions whole-dollar source and applied
amounts so the printed rows add back to the rounded Part III and Part II totals;
its rounding case is written but unrun. Solo, combined, and negative cases are
written but unrun. Estate/trust K-1 and statement values are reconciled as
entered, but document authenticity, broader filed source attribution, and
carryforward identity remain open. Its source graph now calculates the
nonpassive limit, and the XML document bundle is linked but unverified. Schedule
3 line 6a now requires and references the Form 3800 document in the linked MeF
bundle. The
[business-credit routing audit](docs/mef/general-business-credit-routing.md) now
names the direct line 6a producers and the source classifications needed before
a shared Form 3800 finalization. It also identifies Form 8912 as a separate line
6k credit formerly misrouted to 6a. The other direct deposits remain in code and
can still overstate filed credits. The current unrun Form 8820 pass replaces its
flat 25% gross Schedule 3 deposit with identified orphan-drug source rows, the
19.75% section 280C reduced-credit election or 25% full-credit calculation, the
overlapping Form 8932 wage-credit offset, and a nonpassive Form 3800 line 1h
handoff. A native IRS8820 document and linked Form 3800 line 1h group are
registered, with source, XML, and XSD cases written but unrun. The full-credit
path now requires a bundled expense-reduction statement and structured rows
identifying each deduction or capitalized-basis form, line, and expense record.
The rows' before/reduction/after math and total reduction reconcile to Form 8820
line 2a; the PDF packet prints them, and MeF generates the binary attachment
from the same rows. MeF now cross-checks Schedule C lines 11/27b and Schedule F
lines 13/32 against the net filed amount for the named business or farm. Other
deduction lines and capitalized basis stop until their filed values can be
reconciled. Filled statement rendering remains unverified. The current unrun
controlled-group pass requires taxpayer and related-business EINs and qualified
expense amounts, allocates the group's aggregate credit by member expenses with
whole-dollar reconciliation, and links a native `ControlledGroupMembersStmt` to
Form 8820 line 2a. The PDF builder now marks line 2a "See Attached" and appends
the member calculation. Source, MeF, local XSD, and PDF-builder cases are
written but unrun, and the filled PDF has not been visually verified. Larger
groups now use multiple 1,000-character native statement documents with all IDs
linked to Form 8820; the multi-document case is written but unrun. The next
unrun pass captures the 2025 partnership K-1 box 15 code Z and S-corporation K-1
box 13 code Z amounts, plus estate/trust K-1 box 13 code M orphan-drug amounts,
EINs, source references, and passive classifications. Form 8820 MeF now compares
each claimed pass-through amount with that K-1 input, including
pass-through-only claims. This is input-to-input reconciliation, not
verification of an uploaded K-1 or its issuer filing. The estate/trust code M
classification follows the 2025
[Form 1041 Schedule K-1 instructions](https://www.irs.gov/instructions/i1041);
code ZZ is reserved here for separately identified other credits such as the
disabled-access credit. The earlier orphan-drug code ZZ label was incorrect.
Automatic nonpassive K-1-to-Form-3800 routing is now coded and unrun.
Passive-activity fact entry, eligibility-document verification, filled-PDF
verification, and IRS business rules remain open. The reduced-credit election
now retains an IRS8820 document and paper form even with no current-year credit,
without requiring a Form 3800 source document. The official two-page Form 8820
PDF maps Part I and all 26 Part II drug rows, with continuation pages for
additional drugs. Its source, field, election, and overflow cases are written
but unrun. Identified partnership, S-corporation, estate, and trust orphan-drug
credits now enter Form 8820 line 3 when combined with own credit, while a
pass-through-only 1040 filer goes straight to Form 3800 without filing
Form 8820. Multiple sources retain EIN and per-source applied amounts in Form
3800 Part V; partial-limit allocations must be explicit. Source, XML, PDF-field,
and local XSD cases are written but unrun. The Form 5884 source build pass now
requires employee identity, pre-2026 hire, state-workforce certification, wage
eligibility affirmations, and a single certified veteran category. The input now
requires dated evidence for either certification received by the first workday
or Form 8850 prescreening completed by the offer date, signed before submission,
submitted to the state workforce agency within 28 calendar days of hire, and
followed by certification before claiming. These timing cases are written but
unrun; disaster postponement handling remains open. The build pass now also
records certification-revocation notice status, requires claimed-wage dates and
exclusion of post-notice wages for false-information revocations, and rejects
dates after the notice. Source cases are written but unrun; payroll transactions
and other revocation reasons remain unreconciled. The successor-employer build
pass now anchors certification timing to the predecessor's first workday,
combines prior and current hours, and reduces the first- and second-year wage
caps by predecessor qualified wages. It requires acquisition,
continuous-employment, and retained-certification facts; source cases also
reject wages when the successor starts after the applicable wage period. They
are written but unrun and payroll records are not yet reconciled. The source
model now takes dated payroll rows rather than undated first- and second-year
wage totals. Each row carries service-period dates, a 2025 paid-or-incurred
date, a qualified amount, and a payroll reference. The source rejects duplicate
references within an employee, service periods outside the first year (or LTFA
second year), rows crossing the anniversary without a split, and wages
recognized after a false-information revocation notice. These source and
dependent XML/PDF fixture cases are written but unrun; payroll-document
reconciliation and deductions outside the linked Schedule C/F paths remain open.
The Schedule C receiving path now treats `line_26_wages` as gross payroll and
derives its filed line 26 amount after a business-linked Form 5884 line 2
reduction and separately entered other employment credits. It uses that same net
wage amount for taxable business profit and MeF XML, and rejects unknown
businesses or credits exceeding gross wages. Source and XML cases are written
but unrun. Schedule F now similarly derives line 22 labor hired after a
farm-linked Form 5884 reduction and other employment credits; its calculation
and MeF cases are also written but unrun. Form 5884 now requires an explicit
business or farm destination on each claimed payroll row, allowing one employee
to split wages between businesses. It allocates direct line 2 credit by capped
wage contribution and a controlled-group taxpayer share by that member's capped
wages, then routes whole-dollar reductions to Schedule C or F. The full MeF
bundle reconciles the deduction to the source; line 3 pass-through credit and
the Form 3800 tax limit do not alter the employer's reduction. The
controlled-group taxpayer member must identify a Schedule C or F destination;
other members may identify separate entity returns. Source-to-return, XML, and
rejection cases are written but unrun. Mixed destinations with wages above a cap
now require explicit `credited_wages` on every payroll row in the capped year,
reconciled to the remaining wage cap. The calculated reduction follows those
claimed amounts; allocation and rejection cases are written but unrun.
Capitalized inventory/asset costs, sold-versus-ending-inventory basis, other
business forms, entity-return reconciliation, and payroll-document matching
remain open. The full MeF bundle now also checks that each linked Schedule C
line 26 or Schedule F line 22 gross amount covers the qualified payroll rows
assigned to it, not merely the smaller credit reduction. These mismatch cases
are written but unrun. The controlled-group pass now allocates the group credit
by members' capped qualified wages, requires a group-classification document
reference, and sends only the taxpayer member's line 2 share to Form 3800.
Native member-share and explanation statements are linked to Form 5884; the
printed form gets a calculation page. Source, XML, PDF, and XSD cases are
written but unrun. Shared employees paid by multiple members, entity-return wage
reconciliation, filled-PDF inspection, and IRS business rules remain open. It
applies the missing $24,000 disabled-long-term-unemployed veteran cap and the
120-hour minimum plus hours-based first-year rate to long-term family assistance
recipients. Source and rejection cases are written but unrun. The current pass
now forwards its nonpassive line 4b credit through the shared Form 3800 tax
limit instead of depositing gross credit on Schedule 3. Native `IRS5884` source
XML, the linked `IRS3800` line 4b group, and partial-limit reconciliation have
cases written but unrun. The continuous-use IRS Form 5884 PDF now has the exact
one-page AcroForm field map for lines 1a-1c, 2, 3, and 4, with unrun
source-reconciliation cases. The source input now accepts identified
partnership, S corporation, cooperative, estate, and trust allocations:
pass-through-only recipients omit their own Form 5884, while mixed claims place
them on line 3. Form 3800 requires Part V source allocations when a tax limit
partly uses multiple line 4b sources; source, XML, PDF, and XSD cases are
written but unrun. Passive credit, carryovers, K-1/1099-PATR document
reconciliation, filled-PDF inspection, IRS business rules, and ATS acceptance
remain open. An unrun pure Form 8912 Part I/II limit calculation now keeps its
line 12 allowed credit and unused amount separate, taking the already-allowed
Form 3800 credit on line 10c. It rejects pass-through CREB cases until their
separate taxable-income limit is modeled. The Form 8912 input now separates Form
1097-BTC reported amounts, unreported-bond calculations, and carryforward; its
limited credit now routes to Schedule 3 line 6k instead of depositing an
unbounded amount on line 6a. This source model and its cases are unrun. A
subsequent IRS-instructions review corrected Part IV column (e) to
credit-allowance-date percentage, not ownership percentage, and separates BAB
interest payable from other bonds' outstanding principal with the required 35%
BAB rate. These source facts still need sale record-holder and other disposition
allowance-date rules, bond-specific carryforward identity, taxable-interest
reconciliation, and IRS business-rule review.

The next Form 8912 build pass models each Part IV bond as one or more explicit
line 18 rows, preserves bond identity on carryforwards, and drafts `IRS8912` MeF
output with separate Parts I through IV and a Part II input reconciliation. The
draft now combines all `f8912s` source items into one Form 8912 Part I/II
document while retaining each Part III/IV bond row; its multi-item case is
written but unrun. Direct XML and local schema cases are written but unrun. The
builder is now registered for source-backed positive claims: the return graph
calculates Part II after personal clean-vehicle and Form 3800 credit, finalizes
Schedule 3 line 6k and Form 1040 line 20, and the MeF descriptor reconciles the
source and filed return lines. Graph, linked-bundle, and local XSD cases are
written but unrun, so this is not a verified filing path. Its displayed
whole-dollar row and aggregate rounding, as well as pass-through CREB
taxable-income limits, still need end-to-end reconciliation. The draft now
derives Part II from explicit finalized Form 1040, Schedule 2, Schedule 3, Form
6251, and allowed Form 3800 lines. It removes Schedule 3 lines 1, 6a, 6b, and 6k
from line 8 when computing Form 8912 line 10b, checks the Form 3800 amount
against line 6a, and requires Form 8912 line 12 to match Schedule 3 line 6k.
These bridge and XML cases are written but unrun. The Form 1040 sink now
supplies that finalized snapshot. Form 8912 source items now capture bond-level
purchase-price accrued interest and accrued interest on disposition. An unrun
pure calculation separates current-year deemed interest from prior-year credit
carryforwards and the purchase-price basis recovery. Schedule B's MeF builder
now emits source-backed interest-payer rows and its line 1/4 totals when paired
payer names and amounts are available; source-to-XSD cases are written but
unrun. The Schedule B node now self-emits paired interest rows so numeric-array
pending normalization does not discard payer amounts before XML/PDF export. The
PDF path now appends paginated interest-payer detail after the 14 printed rows,
with cases written but unrun. The current build pass also carries explicit
Schedule B Part III foreign- account, FBAR, country, and trust answers from a
dedicated input into the MeF XML and PDF fields. An elected Form 8814 child's
foreign-account or trust fact forces the matching Schedule B Yes answer and Form
8814 literal, but FBAR filing is never inferred from that fact. More than two
country names get a PDF supplemental page. These cases are written but unrun;
the calculation and MeF builder now require both Part III account/trust answers
when either income line exceeds $1,500 or foreign activity requires the form.
Source PDF rendering and IRS business rules remain open. The PDF statements
still need filled-render verification. The Schedule B pass also removes the
15-dividend-payer cutoff: the Schedule B node retains every dividend payer, MeF
emits every native Part II row, and the PDF builder appends a continuation
statement after the 15 printed rows. Its source-to-XSD, reconciliation, and
PDF-page cases are written but unrun. The current unrun 1099-INT pass keeps
gross payer interest separate from nominee, accrued-interest, OID, and
amortizable-bond-premium deductions; Schedule B now reconciles those categories
to taxable line 2 and emits the corresponding MeF adjustment elements. Source,
aggregation, direct XML, and full-return cases are written but unrun.
Seller-financed mortgage interest now requires an explicit answer about whether
the buyer used the property as a personal residence. A Yes answer requires
structured buyer identity and an explicit U.S. or foreign address, appears first
on Schedule B MeF line 1, and carries a printed supplemental buyer-detail
statement. A No answer keeps the interest taxable but does not by itself force
Schedule B. These source-to-return cases are written but unrun. A printed
adjustment statement lists the gross-to-net calculation; the payer continuation
now reconciles to gross line 1 rather than net line 2. These PDF and
source-to-XML cases are written but unrun, and no filled PDF has been rendered.
The unrun 1099-OID pass now keeps reported taxable OID and stated interest gross
on line 1, identifies acquisition and bond premium separately, and routes only
the net amount to Form 1040 line 2b. It requires the box 6 and box 10 adjustment
categories explicitly; box 10 no longer incorrectly offsets Treasury OID. Box 11
tax-exempt OID now reaches Form 1040 line 2a, with only an explicitly supplied
net PAB share reaching Form 6251; box 3 early-withdrawal penalty reaches
Schedule 1. Box 5 market discount now needs an explicit current-inclusion answer
and enters interest only when that answer is Yes. The unrun 1099-DIV nominee
pass now requires an allocation for every reported numeric box, subtracts the
owner's share before routing Form 1040, Schedules D/B, credits, withholding, and
AMT, and keeps the reported gross box 1a and nominee reduction on Schedule B
lines 5/6. MeF uses the dedicated nominee-dividend element; a supplemental PDF
statement reconciles the printed gross rows to net line 6. Source, XML, XSD, and
PDF cases are written but unrun. The current build pass shares one Schedule B
filing rule across the node, MeF, and PDF paths: taxable interest and ordinary
dividends each have a strict $1,500 threshold, while personal-residence
seller-financed interest, adjustments, savings-bond exclusion, nominee amounts,
and foreign-account/trust facts can require the form below that threshold.
Below-threshold income still routes to Form 1040 without producing Schedule B.
Reconciliation now runs before that filing gate, and a savings-bond exclusion
larger than interest is rejected. Boundary, special-trigger, and invalid-source
cases are written but unrun. Seller-financed buyers now have an explicit U.S. or
foreign address variant from source input through the Schedule B MeF address
choice and supplemental PDF statement. A foreign-address source-to-XSD case is
written but unrun. A complete filing-trigger audit, filled-PDF layout, and IRS
business-rule acceptance remain open, so this is not complete Schedule B
support. The next Form 8912 graph pass requires each bond's taxable interest
already reported by another input, validates that amount against computed bond
interest, and routes only the unreported balance to Schedule B. Positive credit
was formerly blocked at final Form 1040 assembly. The current MeF path requires
a finalized, attached Form 8912; the PDF path now has a descriptor but is not
rendered or tested yet. These graph and duplicate-interest cases are written but
unrun. The source node now hands separate Part I lines 1 through 4 to the Form
1040 sink instead of a tentative scalar. The PDF build now maps Form 8912 Part
I/II to its IRS widgets, adds 20-row Part III and one-bond Part IV pages as
needed, and reconciles the printed credit with finalized Schedule 3 and the
graph. Its descriptor and pagination cases are written but unrun; filled-render
inspection is still required. Multiple partially limited bond sources and
CREB/QZAB deduction elections still stop MeF export pending bond-specific
unused-credit treatment. Source-document identity reconciliation remains open.
The Form 1097-BTC reported-bond input now requires all 12 monthly credit boxes
and checks their sum against annual box 1, captures box 2a's C/A/O code, and
constrains box 2b to the IRS 39-character alphanumeric identifier. It also
rejects duplicate issuer-EIN/unique-ID pairs within and across Form 8912 input
items. These source cases are written but unrun. The actual annual 1097-BTC
document, corrected statements, fiscal-year allocation, multi-bond type 1097-BTC
source model, and full cross-document identity matching remain open. A new unrun
check rejects a Part IV CUSIP already represented by a Form 1097-BTC with the
same issuer EIN and box 2a code C, including identifiers with an account suffix
and entries in separate Form 8912 input items. Account and other identifiers
cannot be matched to a CUSIP from these facts alone. The Part IV input now
records acquisition and allowance dates instead of an unchecked column (e)
percentage. The build pass derives quarterly allowances, BAB interest-payment
allowances, pre-October 2008 QZAB annual allowances, and the final quarter
prorated on maturity or redemption, including a fifth partial date after
December 15; it rejects dates outside the 2025 holding period or duplicated
across line 18 rows. These date and XML cases are written but unrun.
Record-holder timing on a sale, other dispositions, and the required bond-rate
source still need review.

The 2025 Schedule 3 build pass now carries separate lines 6h, 6k, and 12 through
its calculation, MeF, and PDF field maps. Form 8859 now carries its prior-year
amount into the 2025 tax-liability worksheet, sends only the allowed credit to
Schedule 3 line 6h, and retains the unused amount on Form 8859 line 4. Its
native XML and PDF descriptors and source-to-return cases are built but unrun;
the filled PDF has not been visually checked. Schedule 8812 Worksheet B line 14
must be supplied when that worksheet applies. Form 8834 no longer calculates a
2025 credit from new vehicle cost. It takes a prior-year passive-activity credit
allowed this year from an asserted Form 8582-CR activity, applies its
regular-tax and tentative-minimum-tax limit, and routes only line 7 to Schedule
3 line 6i. Its 2024 continuous-use XML and PDF descriptors are built, with
source, tax-limit, and XSD cases written but unrun. The Form 8582-CR source
calculation and combined-credit ordering with Forms 8859 or 8936 remain open;
those combinations stop explicitly. The current unrun Form 8582-CR Part II
correction treats the $25,000/$12,500 rental allowance as an income allowance,
uses tax attributable to the remaining allowance for line 15, subtracts the
amount already used on Form 8582 line 9, and distinguishes MFS spouses who lived
apart. Real-estate-professional status no longer bypasses the limit for every
activity. Its source allocations now go to the Form 3800 node instead of
depositing the aggregate allowed amount directly to Schedule 3. Form 3800 now
passes passive source totals through the shared 1040 tax limit, but its MeF
builder now joins those sources to Parts III/IV and XML, with written but unrun
cases; filing support and ATS acceptance remain unverified. The unrun source
pass replaces one aggregate passive-credit amount with activity and document
references, credit category, a current-year amount, and originating-year-stamped
prior unallowed credit rows. Active-rental and other credits now feed Part I by
source. The current pass also requires origin-year active participation for
Worksheet 1 rental carryovers, and moves active-rental credits to Worksheet 4
when an MFS filer lived with a spouse. The next unrun pass computes Part III
rehabilitation/pre-1990 housing and Part IV post-1989 housing allowances with
separate worksheet tax inputs; PTP credits still stop pending their
per-partnership limitation. The next unrun pass allocates the three special
allowances and the remaining suspended credit across named sources using
Worksheets 5-9. The node still returns only an aggregate carryforward, and
allowed versus suspended amounts have not been split by prior-year vintage for
Form 3800 Part IV. Each source now explicitly identifies its reporting route as
Form 3800 line 3, 24, or 33, or Form 8834, and the calculation totals allowed
credits by route. A positive Form 8834 route stops node and XML output until its
separate filing path is built; business-credit routes now hand their source
allocations to Form 3800, where the incomplete filing path stops explicitly. The
native `IRS8582CR` MeF descriptor now serializes Parts I-IV, with direct XML and
local XSD cases written but unrun. Passive Form 3800 Part I lines 2/3, Part II
lines 23/24 and 32/33, and source columns in Parts III/IV now have a
source-backed descriptor route, with tests written but unrun. An unrun pure
classifier derives those six passive pre-limit and allowed line amounts from
Form 8582-CR source allocations, including prior credits, and rejects Form 8834
sources. The shared Form 3800 Part I/II calculator now applies standard,
empowerment-zone, and specified passive credits in their separate statutory
order, with written but unrun cases. The 1040 now passes classified passive
lines into the shared calculator and finalizes Schedule 3 with only the
tax-limited credit; nonpassive callers pass explicit zero passive lines. The XML
builder now consumes passive source allocations, but the filed route is not
verified yet. The new source and 1040 cases are written but unrun. An unrun
source transform now splits each allowed credit by originating tax year, keeping
prior carryovers ahead of 2025 credit for the Parts III/IV rows. The shared
source-use pass now allocates the separate Form 3800 tax-liability limit to
those rows. Form 8582-CR business-credit sources now require the exact 2025 Form
3800 credit row, distinguish standard, empowerment-zone, and specified rows, and
reject reserved or carryover-only rows for current-year credit. Written
source-validation cases are unrun. The source-backed Form 3800 XML route is
built but unverified. A schema-backed map now names each supported Part III and
IV XML row tag, including expired carryover-only rows; its coverage case is
written but unrun. The map now feeds the return serializer. A pure aggregation
now groups passive credits by exact Form 3800 row and originating year while
preserving each activity's statement reference; its source case is written but
unrun. Tax-use allocation is built but unverified; source-specific carryover
evidence remains open. An unrun XML-row plan now collapses multiple carryover
years into one schema group per credit line, records the latest origin year as
the IRS instructs for Part IV column (b), and retains every source year for the
required Part VI detail. Schema-backed maps now name the Part V and VI detail
groups for every supported current-year and carryover row. A pure XML fragment
builder writes passive Part III/IV aggregates and, when needed, Part V/VI source
detail with the verified EIN or missing-EIN reason, tax use, and carryforward.
Direct and local XSD cases are written but unrun. Its output now keeps the
credit-line key on every row and returns unwrapped Part V details so a filed
Form 3800 can combine them with nonpassive details under one schema group. The
registered nonpassive builder now uses the shared line-ordered Part V group
assembler; its mixed-detail ordering case is written but unrun. These passive
fragments now carry structured Part IV amounts, and a shared Part IV assembler
orders carryover rows and derives lines 5-7 from columns (d)-(i), including
applied tax use and remaining carryforward. Its source and local XSD cases are
written but unrun. The filed descriptor now joins passive rows and Part IV
through the shared assembler, with cases written but unrun. The registered
nonpassive builder now returns structured document parts for the source-backed
join instead of serializing a separate terminal XML string. The descriptor
delegates final document ordering to a shared IRS3800 assembler that can place
Parts III-VI. A structural case is written but unrun. The shared assembler
checks source-row tax use by limit bucket against Part II lines 17, 26, 37,
and 38. Its current-year, carryover-only, and mismatch cases are written but
unrun. Part VI vintage details now pass through a schema-ordered assembler that
retains multiple source years per credit line; its ordering case is written but
unrun. Passive Part III fragments also expose their structured current-year
amounts and row metadata. The nonpassive builder now retains the same metadata
alongside every current-year row, including source counts, first transfer
registration number, entity, and document reference. Their source cases are
written but unrun. The same-line aggregate and Part V source join are now
connected in the descriptor; their cases are written but unrun. The descriptor
now recalculates the attached Form 8582-CR and compares every passive allocation
before filing Form 3800; Form 8582-CR also requires the matching Form 3800
business-credit rows. Missing or changed linked documents stop export. These
direct negative and full-return XSD cases are written but unrun. Credit-specific
K-1 and other source-document reconciliation is partial, as detailed below. The
handoff now retains the publicly traded partnership source flag. Current-year
source details are now retained even when a standalone row has only one source,
including Form 8936 lines 1y/1aa. The filed assembler emits Part V details only
when the aggregate row has multiple sources and checks the detail count; source,
ordering, and mismatch cases are written but unrun. This makes both sides'
single-source evidence available for the same-line join. A pure join now
combines nonpassive and passive current-year amounts on one credit line, retains
all Part V source rows, and selects column (c) by the largest combined
pass-through entity credit, including when the same EIN occurs on both sides.
Mixed and passive-only source cases are written but unrun; the descriptor now
feeds the join with finalized tax-use allocations. A pure nonpassive source-use
ledger now gives Forms 8826, 8820, 5884, both Form 8936 routes, and Form 8835
line aggregates stable keys and credit years for the common FIFO pass. It
retains Form 8826 cent amounts and rejects imprecise source credit. Its
mixed-source case is written but unrun; the ledger is now connected to the
descriptor. The shared FIFO tax-use allocator now reconciles all three Part II
buckets in integer cents, so a Form 8826 amount can follow an older passive
carryover without being rounded away; source and bridge cases are written but
unrun. A fractional-cent tax-use boundary is rejected. The passive XML path
still needs consistent whole-dollar filing amounts when a boundary falls inside
a passive source. The source-use bridge now returns both passive vintage
allocations and nonpassive source allocations from the same FIFO pass, instead
of discarding the nonpassive side. Passive-only, mixed, cent-precision, and
nonpassive-only cases are written but unrun; the return descriptor now consumes
the result. A pure tax-use allocator now reconciles the source totals with the
three Part II caps and applies older credit years first. It stops a partially
used year with multiple source rows unless their named credit types have an
explicit IRS ordering rank, instead of assigning the limit by input order. The
named 2025 credit types now have that ordering; other/legacy rows and multiple
same-line sources under a partial cap still stop. Its cases are written but
unrun, and the allocator now feeds the Form 3800 XML builder. A pure source-year
bridge now checks the Form 8582-CR passive totals against Part I/II, allocates
passive vintages alongside nonpassive source rows, and retains used and unused
amounts per vintage. Its mixed-source case is written but unrun; the MeF builder
now consumes the bridge. Form 8582-CR source facts now require explicit
taxpayer-versus-pass-through origin. Partnership, S corporation, estate, trust,
and cooperative sources require either a nine-digit EIN or the explicit
`APPLD FOR` reason. That provenance carries through the Form 3800 vintage plan
instead of inferring an entity from a free-text source form. The source and
propagation cases are written but unrun; the MeF builder now serializes the
linked rows and checks their allocation against Form 8582-CR. Current-year
pass-through orphan-drug credits on line 1h now reconcile to one K-1 box 15/13
credit with matching EIN, reference, amount, and passive flag, using the same
check as Form 8820. Those direct and full-return XSD cases are written but
unrun. Other credit types, prior-year source documents, self-earned passive
credits, estate/trust K-1 document authenticity, and missing-EIN source evidence
still need reconciliation. Current-year passive disabled-access credits on line
1e now match partnership or S-corporation K-1 code K evidence, or a named
estate/trust K-1 code ZZ statement. Its direct and full-return XSD cases are
written but unrun. The estate/trust path now requires distinct K-1 and code ZZ
statement references and matches both to the entered K-1 facts; this is not
proof that the K-1 or statement contents are attached or authentic. Pass-through
sources also carry a stable entity reference so the passive Part IV summary
chooses the entity with the greatest combined credit across its source years.
Conflicting EINs for one entity stop XML generation. The aggregation and
negative cases are written but unrun. Form 4136 now combines its represented
fuel-use credits on refundable line 12 instead of misrouting some to general
business credit and some to a nonexistent Form 1040 field; the represented 2025
fuel rates are updated, with separate aviation-kerosene tax-rate inputs. These
routing and field-map cases are written but unrun. Form 8912's Part II limit now
feeds line 6k, while these source forms still need complete eligibility,
document, and business-rule review. The Schedule 3 MeF builder requires attached
source-form IDs for lines 6h, 6i, 6k, and 12. Forms 8912, 8859, and 8834 are
registered but unrun. The Form 4136 input has now replaced unsubstantiated flat
gallon fields with a primary qualifying business, separately validated
additional activities, and ultimate-purchaser affirmation, purchase-record and
duplicate-claim confirmations, and line-indexed gallons, use codes, measurement
units, and actual fuel costs. Its calculation and rejection cases are written
but unrun. Its `IRS4136` builder now maps the represented lines and reconciles
line 17 with Schedule 3 line 12; local XSD and source cases are written but
unrun. All line 11 fuels and reduced-rate bus calculations/MeF groups are now
built. The PDF builder now overlays the read-only preprinted line 11 rates for
bus use and adds "Bus" beside the use code, but this still needs filled-render
inspection. Mixed-rate rows refer to an attached detail statement. Multiple
businesses now produce one official four-page Schedule A (Form 4136) PDF binary
attachment per activity, and the Form 4136 XML references each attachment.
Credits round by claim before the activity totals are combined. The primary
activity is affirmed and checked as generating the most calculated credit,
matching the form's Part I instruction; that case is written but unrun. Gasoline
line 1c other-use detail and line 1d export groups now have distinct input, MeF,
and PDF paths with unrun source-to-XSD cases. The next build pass adds
aviation-gasoline lines 2a, 2c, and 2d with commercial-use, export, and
foreign-trade LUST confirmations and unrun source-to-XSD/PDF cases. Diesel
train, bus, and export lines 3c-3e now have separate credit rates, source
confirmations, XML groups, and PDF fields, with cases written but unrun.
Undyed-kerosene lines 4c-4f now have bus, export, and taxed-at-$.044/$.219
routes with unrun source-to-XSD/PDF cases. The 2025 instructions limit 4e/4f to
use type 02 even though the local schema admits more codes; the input follows
the instructions pending IRS business-rule review. Aviation-kerosene lines 5a,
5b, and 5e now have commercial-use and foreign-trade LUST routes, with rates and
source-to-XSD/PDF cases written but unrun. Lines 5a-5d now require the source
tax rate matching the selected row. The next input pass requires the 2025 line
1a noncommercial-motorboat exclusion and the line 2b outside-aircraft-propulsion
fact, with rejection cases written but unrun. Export lines 1d, 2c, 3e, and 4d
now require a typed retained-proof reference instead of a bare export
affirmation; positive and rejection cases are written but unrun. Source-record
identity and IRS business-rule review remain open. Registered-vendor diesel line
6a now has a distinct vendor source route with an IRS-issued UV registration
number, tax-settlement method, certificate P records, named government buyers,
and gallon reconciliation. Its separate government-buyer MeF statement and
page-2 PDF fields are built, with source, XML, PDF, and XSD cases written but
unrun. The filled PDF and IRS business rules are not verified. Line 6b now has a
separate UB-registered vendor route with reconciled bus-sale records and
invoice-specific or account-period Model Waiver N facts. The $.17 credit maps to
native XML and both PDFs, and conflicting registrations on the form's shared
line 6 field are rejected. Its source, XML, PDF, and local XSD cases are written
but unrun. Registered-kerosene vendor lines 7a-7c now have separate government,
blocked-pump, and bus-waiver source routes, with UV/UP/UB registration checks,
the linked line 7a buyer statement, and native XML and PDF mappings.
Government-sale records now also require an unexpired Certificate P and an
affirmation that a state-issued credit card was not used. Source, XML, PDF, and
local XSD cases are written but unrun. Commercial-aviation vendor lines 8a/8b
now require UA registration, reconciled and distinctly identified sale records,
the correct $.219/$.244 tax source, and invoice-specific or account-period Model
Waiver L facts. Line 8c now separately requires nonexempt noncommercial aviation
sales, UA registration, the $.244 source tax, and a signed Model Certificate Q
tied to an invoice or account period. Lines 8d/8e now require noncommercial
aviation sale records with the claimed use code, the $.244/$.219 source tax, and
either Model Waiver L or, for government type 14, Certificate P and UV
registration. Line 8f links the foreign-trade LUST credit to the exact type 09
sales already claimed on 8d/8e. Their native MeF and parent/Schedule A PDF rows
have unrun source, XML, PDF, and local XSD cases. Filled rendering, IRS business
rules, and ATS acceptance remain open. Registered credit-card-issuer lines
13a-13c now require CC registration, government card-purchase records, matching
Model Certificate R accounts and coverage periods, tax disposition, vendor
reimbursement, and gallon/cost reconciliation. Line 13c's $.244-taxed branch
uses the $.243 credit, the MeF tax-rate marker and linked credit-card-users
statement, and overlays the printed parent/Schedule A PDF rate and description.
Source, XML, PDF, and local XSD cases are written but unrun. The return-level
input now also rejects the same card-sale record across business activities,
with a cross-activity case written but unrun. Mixed 13c tax rates on one return
stop because the schema has only one group; IRS business-rule and ATS acceptance
are open. Diesel-water emulsion lines 14a and 14b now have ultimate-purchaser
source facts, the standard and reduced bus-use rates, export-proof validation,
MeF groups, and parent/Schedule A PDF fields. Source, XML, PDF, and XSD cases
are written but unrun. Emulsion composition and EPA additive records are
required; filled-PDF rendering and IRS business-rule review remain open.
Registered-blender line 15a now has a distinct source route using taxed input
diesel gallons, an IRS M registration number, production and disposition facts,
the $.046 rate, a linked native blender-certification statement, and parent and
Schedule A PDF fields. Source, XML, PDF, and local XSD cases are written but
unrun. The filled PDF, IRS business rules, and ATS acceptance remain open.
Exported dyed-fuel lines 16a and 16b now have an exporter-specific source route,
retained export proof, fuel-kind and $.001 tax-rate checks, MeF groups, and
parent/Schedule A PDF fields. Line 16a can combine dyed diesel and gasoline
blendstock source rows with a PDF detail page. Source, XML, PDF, and XSD cases
are written but unrun; the filled PDF and IRS business rules remain unverified.
The Schedule A section of the 2025 IRS instructions instead says to show the
activity with the most qualifying fuel usage. That conflict is unresolved; the
current code follows the printed Form 4136 and needs IRS business-rule or ATS
confirmation. Both PDF descriptors now use the actual nested AcroForm paths; all
mapped widget names were found in the IRS PDFs. Filled rendering and the
binary-attachment IRS business rule are unverified. Mixed units on one fuel line
stop until conversion rules are verified. A tagged home-kerosene variant now
implements the IRS line A exception and leaves business lines B-F blank; its
source, XML, PDF, and XSD cases are written but unrun. Additional claim lines,
source evidence, full test/XSD and IRS business rules, and ATS acceptance remain
open.

Form 8936 now enters the start graph as one singleton input containing both Part
I MAGI breakdowns, both filing statuses, and its vehicle array. The old
per-vehicle MAGI and status fields were removed without an alias. This makes all
vehicles on one return use the same IRS Part I income test and provides the
exact component amounts needed for the parent MeF document. Source, Schedule A,
and start-node cases are written but unrun.

The registered parent `IRS8936` builder now serializes the Part I MAGI
components and personal-credit Part III/IV amounts for nontransferred,
personal-use vehicles. It compares current AGI with Form 1040, credit amounts
with Schedule 3, and caps allowed amounts at Form 1040 line 18 after the credits
specified by IRS instructions. The tentative and allowed amounts are kept
separate. The current build pass adds 2025 IRS PDF descriptors for the parent
form and one Schedule A per personal-use or dealer-transferred vehicle, sharing
the liability calculation with XML. These PDF mappings and source-to-XSD cases
are written but unrun, and no filled PDF has been rendered for visual
verification. Other recapture paths remain open. A shared new-vehicle
calculation now splits the eligible whole-dollar credit into business and
personal shares without rounding the two shares above the total. Schedule A is
written for a fully business-use vehicle and carries its business amount. The
parent Part II lines 6/8 and Form 3800 Part III line 1y now carry the same
nonpassive source amount through the Form 3800 tax limit. Source-to-return,
PDF-field, XML, local XSD, and mismatch cases are written but unrun. The current
build pass replaces the free-form business-use percentage with source
business/commuting/total miles and months in business use, or an employee-use
wage/reimbursement assertion. The derived percentage feeds the shared split and
Schedule A. These source and rejection cases are written but unrun; independent
mileage/payroll matching is still open.

## Status definitions

| Status                    | Meaning                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Verified slice            | A named flow has calculation tests and local TY2025v5.4 IRS XSD validation. This does not imply whole-form or ATS approval. |
| Implemented, audit needed | Code exists, but complete IRS instructions, schema fields, source routing, and edge cases have not been checked as a unit.  |
| Known gap                 | A missing or explicitly rejected supported path is identified.                                                              |
| Scope decision            | The requested product boundary is not yet explicit.                                                                         |
| Release gate              | Required verification or integration step has not passed on the current worktree.                                           |

The Form 8959 build pass now sums source-specific W-2 box 5, Form 4852, and
household-employee Medicare wages once for lines 1 and 20, avoiding executor
collisions when these sources coexist. It removes and rejects the second box 5
override, includes statutory-employee box 5 wages, rejects box 6 withholding
without box 5 wages, and corrects the qualifying-surviving-spouse threshold to
the 2025 form's $200,000. A single employer W-2 box 5 or RRTA box 14 amount
above $200,000 now preserves Form 8959 even when a joint return has zero
additional tax; Form 4852 W-2 substitutes carry the same box 5 trigger. Source,
calculation, XML, PDF inclusion, and full-return cases are written but unrun. A
mixed W-2, substitute W-2, and household-wage return case is also written.
Substitute and household Medicare withholding without corresponding Medicare
wages now fails source validation instead of creating an unsupported credit. The
local XSD batch now includes zero-tax MFJ FICA and RRTA filing triggers and the
QSS $200,000 threshold, all unrun. The full-batch gate and IRS business-rule
review remain open.

The Form 8959 line 19 source audit now adds W-2 box 12 codes B and N to box 6
for FICA wages, as the 2025 instructions require, and excludes those codes on
RRTA W-2s. Source and full-return cases are written but unrun. The W-2 source
audit also now routes box 12 codes A/B/M/N from statutory- employee W-2s to
Schedule 2 line 13 while retaining their separate Form 8959 line 19 treatment;
the source case is written but unrun. Form CT-2 employee-representative input
now takes four quarters per recipient, checks the annual $200,000 line 3
threshold, binds the recipient SSN to Form 1040, and routes line 2 compensation
and confirmed line 3 tax paid to Form 8959 lines 14 and 23. Source, full-return,
and local XSD cases are written but unrun. A paid line 3 amount needs a payment
reference and must match the full calculated tax; partial payments remain
unsupported pending an allocation rule. Actual CT-2 payment evidence,
income-source reconciliation, and the Schedule 2 line 13 RRTA route still need
review.

The Form 8919 audit found that the prior flat wage input used obsolete reason
codes, the 1099-NEC route omitted its required reason, and Form 8919 line 6
never reached Form 8959 line 3. The current build pass replaces it with one
recipient form containing identified firm rows and the 2025 A/C/G/H codes.
Routed 1099-NEC income must match a firm row, so it is not counted twice. Line 6
now reaches Form 1040 and Form 8959, line 10 reaches Schedule SE, and line 13
reaches Schedule 2. The native IRS8919 XML now has identity, firm detail, and
calculated lines. The follow-on build replaces the free-entered line 8 with W-2
boxes 3 and 7, RRTA compensation capped at the 2025 wage base, and Form 4137
line 10 for each recipient. The MeF builder rederives those figures from the
filed W-2 and Form 4137 documents. Reasons A/C require a referenced IRS
correspondence, A/G require a referenced SS-8 filing, and H requires a W-2 from
the same firm. These source and full-return cases are written but unrun. The
actual letters/SS-8 receipts are still entered evidence, not authenticated
documents; 1099-MISC box 3 and 1099-NEC box 1 now share one source ledger and
can be combined for a reason-H firm with a matching W-2. The 2025 PDF descriptor
now fills five firm rows, printed lines 6 and 8-13, and a separate recipient
copy. More than five firms create additional Form 8919 copies with lines 6-13
only on the first copy. Source, XML, PDF field-map, and continuation cases are
written but unrun. Filled-PDF visual inspection, IRS business rules, and ATS
acceptance remain open.

## Workstreams

| ID       | Workstream                               | Current state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Next evidence required                                                                                                                                                                                                                            |
| -------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-01   | Authoritative MeF coverage inventory     | **In progress.** `docs/mef/coverage-inventory.md` now lists every registered Form 1040 serializer and the confirmed missing Scenario 4 documents, while marking most coverage evidence unaudited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Compare all in-scope IRS instructions and ReturnData1040 documents with product requirements; fill each row with actual input, calculation, serializer, attachment, local XSD, end-to-end, ATS/business-rule evidence and unsupported conditions. |
| SCOPE-01 | Product boundary                         | **Decided.** TY2025 Form 1040 family only. Standalone 1040-NR, 1040-SS, and 4868 returns are excluded from this board.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Keep all Form 1040 schedules, attachments, source reconciliation, XML, business rules, and applicable ATS scenarios in the inventory and acceptance gate.                                                                                         |
| CORE-01  | Return assembly and submission package   | **Implemented, audit needed.** Builder orders documents, links references, validates PDFs, and creates return/manifest archives and an A2A request package.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Review against current IRS packaging and business rules; validate the complete SOAP/certificate path and receive an ATS acknowledgment. Package construction alone is not transmission readiness.                                                 |
| TAX-01   | Form 1040 calculation-to-XML consistency | **Implemented, audit needed.** Broad changes cover identity, wages, dependents, credits, income, deductions, and schedules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Reconcile each line with its source calculation and IRS instructions, including multi-source and taxpayer/spouse cases.                                                                                                                           |
| FARM-01  | Schedule F and Form 4835                 | **Verified slices.** Cash/accrual Schedule F, inventory, source-form reconciliation, CCC and crop-insurance statements, at-risk and passive farm flows have calculation and XSD cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Compare remaining farm instructions and all Part III elections/attachments to the coverage matrix; build complete ATS return fixtures where applicable.                                                                                           |
| RENT-01  | Schedule E and Form 8582                 | **Verified slices.** Rental, royalty, passive-loss allocation, prior losses, at-risk interaction, and XSD cases exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Audit every activity class, carryforward, and prior-year participation condition; resolve explicitly unsupported paths.                                                                                                                           |
| TIPS-01  | Form 4137                                | **Verified prior slice; new joint-return, Form 8959, line 5, RRTA, identity, and PDF cases unrun.** Employer rows, individual recipient tax, W-2 allocated-tip reconciliation, XML, and single-recipient local XSD previously passed. Separate taxpayer/spouse XML identity, combined Schedule 2 tax, W-2 wage-base routing, and two-document XSD cases are written. Form 4137 line 6 feeds Form 8959 line 2; its XML uses W-2 box 5 when distinct from box 1. Line 5 derives from employer/month records below $20. W-2 employee SSNs bind sources to taxpayer or spouse. Active allocated-tip W-2 employers must match line 1; every line 1 employer also needs a matching W-2 even when box 8 is blank. MeF export reconciles Form 4137 W-2 source facts against the W-2 documents. A reduction below box 8 needs dated, referenced daily records that reconcile to the employer totals; the former boolean is removed. Report dates now place December tips reported in January in the proper Form 4137 year. Exact W-2 box 14 RRTA compensation feeds capped Form 4137 line 8 and uncapped Form 8959 Part III; RRTA withholding reaches Part V, and the W-2 XML retains box 14 groups. The 2025 PDF descriptor maps five employer rows and calculated lines, makes a copy per recipient, and appends continuation pages. | Run the deferred full batch and visually verify the filled PDF. Review record authenticity/completeness, annual totals for employers without daily records, and IRS business rules.                                                               |
| ATS-01   | TY2025 Form 1040 ATS scenarios           | **Partial facts only.** Eight Form 1040 scenario PDFs are inventoried, but there is no complete return fixture or ATS acknowledgment. Scenario 12 now has a passing calculation reconciliation: the cents path rounds to $3,437, while the IRS sample rounds its component lines to $3,438. Seven other return-type scenarios are reference-only under the agreed scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Build each complete in-scope scenario with an explicit, consistent rounding convention, compare printed/expected results, pass local XSD and business rules, then transmit and record ATS acknowledgments when credentials are available.         |
| QA-01    | Current-worktree regression gate         | **Historical partial pass.** The last `deno task test` passed 6,596/0/48 before subsequent implementation. The user requested build-first, then one full-batch test and fix cycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Finish the implementation pass, then run the full batch, review the 48 ignored live-PDF checks, fix failures, and rerun the full batch.                                                                                                           |
| SHIP-01  | Review and delivery                      | **Open.** WIP branch pushed; no PR for this body of work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Review the diff in coherent slices, check unrelated/user changes, commit, create PR(s), obtain review, and only then plan merge/release.                                                                                                          |

## Explicit gaps and decisions to track

| ID             | Area                                         | Evidence / question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Exit condition                                                                                                                                                                                          |
| -------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GAP-1116       | Form 1116                                    | Passive and general basket MeF builders exist. The current build pass adds source explanations and linked native `ForeignIncmRelatedExpensesStmt` documents for Part I line 2 direct expenses from Form 1116 inputs and K-1 feeders; its local XSD case is written but unrun. Section 951A, foreign branch, section 901(j), treaty-resourced, and lump-sum categories need category-specific source facts and rules, not just indicator tags. Carryovers, other-deduction statements, and special tax adjustments remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Build category-specific rules and remaining statements, then verify full-batch calculation, XSD, and IRS business rules.                                                                                |
| GAP-6251       | Form 6251                                    | The build pass now calculates TY2025 Part III lines 12–40 and MeF fields from both the Qualified Dividends and Capital Gain Tax Worksheet and the Schedule D Tax Worksheet source amounts, and replaces the simplified Form 1040 line 16 special-gain tax path with the 2025 Schedule D Tax Worksheet line order; these paths are unrun. The line 10 comparison now receives Form 1040 line 16, including preferential-rate tax. The build pass also routes signed 2025 line 1b, moves Form 1040 line 12 to the selected deduction branch and suppresses Schedule A XML when standard deduction wins, and applies the matching standard-versus-itemized line 2a addback, keeps evaluating AMT when regular taxable income is zero, and serializes calculated Part I/II amounts when AMT is due or a personal Form 8911 credit requires filing; cases are written but unrun. The build pass also carries separately refigured AMT Form 4952 line 4g into Part III and the signed regular-versus-AMT investment-interest difference into line 2c. Broader AMT-basis capital-gain refiguring, Form 2555, other line 10 adjustments, and other credit-driven filing triggers remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Part III is calculated from source facts and reconciled with AMT and MeF XML for capital-gain cases.                                                                                                    |
| GAP-S2         | 2025 Schedule 2 line structure               | The code previously labeled AMT as line 1 and Form 8962 excess APTC repayment as line 2, and omitted the latter from MeF. The current worktree uses line 2 for AMT and line 1a for excess APTC. The negative Form 8978 build pass also computes a chapter-1-tax offset, emits signed line 17z with a linked `AnyOtherTaxesStatement`, and adjusts line 21 and Form 1040 line 23. Those new cases are written but unrun. The remaining Schedule 2 line map, chapter 1 classification, and source-specific statements are not audited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pass source-to-return-to-MeF cases for Form 8962, AMT, and Form 8978; audit every other 2025 Schedule 2 line and chapter 1 classification against IRS instructions and schema, then run the full suite. |
| GAP-8962       | Form 8962 2025 MeF and calculation           | Verified earlier slices cover Table 2/Table 5 and same-state SLCSP. Current build pass adds dependent MAGI, multi-policy line 10 eligibility, below-100%-FPL and MFS branches, shared-policy Situations 1-4, marriage alternative, and up to 99 native MeF Part IV groups; cases are written but unrun. QSEHRA annual/monthly Worksheet N/Q paths and a Marketplace-determined corrected SLCSP source are coded. A narrow full-year, single-Schedule-C-business Publication 974 W/X iterative route now reconciles named 1095-A policy months, actual Schedule C income, other AGI components, the final deduction, and Form 8962 PTC. It suppresses Form 7206 only where the 1040 deduction worksheet is permitted. Partial-year and multi-business PTC, S-corporation filing, Form 2555/LTC overlap, special adjustment ordering, broader business rules, PDF visual verification, and ATS acceptance remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Complete remaining PTC and self-employed insurance source paths, then verify the one full calculation/XML/PDF/IRS-rule batch.                                                                           |
| GAP-8283       | Form 8283                                    | Build pass replaced the automatic capital-gain-property basis cap with an explicit Section B claimed deduction, added separate MeF documents for ordinary Section B gifts, and added VIN plus a linked native MeF vehicle statement for Section A claims above $500 on the donee-certified unrelated-party sale-proceeds route. These calculation, multi-document, and local XSD cases are written but unrun. The Section A box 5a significant-use and material-improvement routes and box 5b needy-transfer route now require dated donee certification and a linked acknowledgment PDF, with focused cases written but unrun. Section B box 5a/5b vehicle exception claims above $5,000 now require a VIN, dated donee certification, qualified appraisal, signed donee facts, both signature PDFs, and linked acknowledgment PDF. Cases are written but unrun. Single-item claims above $500,000 for equipment, Section B securities, collectibles, and exception vehicles now require a linked full qualified-appraisal PDF with the IRS-recommended description; cases are written but unrun. Similar-item grouping across donees now gates Section B and shared high-value appraisal PDFs in a bounded source-backed route, with cases written but unrun. Art/conservation and other special routes, prior carryovers, source authentication, a filed Form 8283 PDF, older MeF fixture migration, and full verification remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Build the remaining attachment and limit paths, then run the full batch and verify IRS rules.                                                                                                           |
| GAP-8889       | Form 8889 HSAs                               | Build pass routes Schedule 1 line 8f and Schedule 2 lines 17c/17d, calculates monthly HDHP limits and the elected last-month rule from twelve explicit coverage facts, and taxes only nonexcepted taxable distributions. Agreed spouse allocation controls line 6 without a default. One or two sourced IRA-to-HSA transfers can populate line 10 within their coverage and annual limits. Line 14b separates rollovers from timely personal/employer excess withdrawals; earnings and retained employer excess route to other income and Form 5329 as applicable. Filed prior-year Form 5329 lines 48/49 now feed the 2025 carryover calculation, Form 8889 line 13, and Form 5329 lines 42-49. Native MeF/PDF fields and source-to-return cases are written but unrun. Separate spouse forms, source verification of eligibility and prior testing periods, PDF field verification, full-batch validation, and ATS remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Complete the remaining HSA source paths and verify the full calculation/XML/PDF/IRS-rule batch.                                                                                                         |
| GAP-8582       | Form 8582                                    | Prior-year active-participation facts already existed. The current build pass now splits an active rental's ineligible prior operating loss into Part V, excludes it from the Part II special allowance and Part VI ratios, and shares the revised per-activity allocation with Schedule E and Form 4835. Cases are written but unrun. Prior Form 4797 losses, durable per-activity carryforward identities, and full business-rule verification remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Verify split Part IV/V XML, Schedule E and Form 4835 routing, current-worktree tests and IRS rules; finish remaining prior-loss forms.                                                                  |
| GAP-8814       | Form 8814 and dependent income               | Build pass has replaced old thresholds with the 2025 $1,350/$2,700 rules, routed lines 9/10/12/15, added an `IRS8814` MeF serializer and PDF descriptor, linked elected dependent income to Form 8962 Worksheet 1-2 by SSN, routed line 12 less the Alaska PFD share to Form 8960 line 7, added combined-source Schedule B reporting, and routed child investment-income facts to Form 4952. These changes are untested under the requested build-first workflow. Explicit interest nominee, accrued-interest, ABP, and OID facts now generate a linked ChildTaxableInterestStmt per affected child, and dividend/capital-gain nominee amounts map to the IRS8814 attributes, and the child's private-activity-bond interest routes to the parent's Form 6251 line 2g; cases are written but unrun. The child's foreign-account/trust facts now trigger Schedule B Part III and its Form 8814 literals; explicit FBAR facts are still required. PDF dotted-line notes, PDF layout verification, parent-election business rules, and IRS acceptance remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Finish source-to-return and form-output coverage, then run the full batch including IRS XSD and business-rule cases.                                                                                    |
| GAP-4952       | Form 4952 source and child investment income | Build pass now exposes Form 4952 as a normal return input, calculates lines 1 through 8 from separate `other_` investment-property facts, affirmed 1099-INT/1099-DIV/1099-OID and partnership/S-corp/trust K-1 portfolio sources, and Form 8814 contributions. It routes line 8 to Schedule A and line 7 to carryforward, and maps the 2025 XML and PDF form lines. These changes are untested. The build pass also takes explicit AMT refigure facts, derives a separate AMT Form 4952 line 8 and carryforward, routes the signed difference to Form 6251 line 2c, and caps AMT line 4g separately. A positive line 4g election and its capital-gain attribution feed the regular and AMT Schedule D Tax Worksheets. These cases are written but unrun. Broker, non-portfolio, and broader AMT-basis source derivation, foreign-tax interactions, PDF layout, and business rules remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Finish source derivation and election tax treatment, then run the full batch including XSD and PDF checks.                                                                                              |
| GAP-4972       | Form 4972 lump-sum election                  | **Build pass, untested.** The previous code mistook Form 1099-R code 5 for a lump-sum election and sent its tax to Schedule 2 under a Form 4970 tag. The current pass removes that route, takes the explicit election's taxable box 2a and box 3 amounts, computes the 2025 Form 4972 tax schedule and Part III allowance/annuity/estate-tax lines, adds the tax to Form 1040 line 16, subtracts it on Form 6251 line 10, and emits native `IRS4972` fields plus the linked Form 1040 indicator. Eligibility facts and recipient identity are required for an elected form. A Part-II-only election now routes box 2a less box 3 to Form 1040 pension lines 5a/5b and AGI, while the Part III election keeps the distribution off those lines; source-to-return cases are written but unrun. Part-II-only death-benefit exclusions now use the IRS worksheet's capital/ordinary split, with unrun cases. Combined Part II/III elections now allocate federal estate tax between line 6 capital gain and line 18 ordinary income, with unrun cases. An explicit NUA inclusion election now splits Form 1099-R box 6 by the IRS worksheet ratio, feeds Part II and/or III and the Part-II-only 1040 ordinary amount, and writes NUA attributes on lines 6 and 8; those cases are unrun. Unelected NUA remains outside the taxable distribution. The PDF descriptor now maps calculated lines 6-30 to the actual 2025 AcroForm and retains only the filing page; it is written but not filled-render verified. Taxpayer/spouse recipient identity and Part I yes/no answers are projected from the return's inputs, with unrun cases. Questions 5a and 5b now have separate eligibility facts in the node, MeF, and PDF instead of hardcoding the beneficiary answer; printed NUA annotations and filled-render inspection remain open. Part-II-only estate-tax reporting, multiple participant/recipient forms, alternate payees, exact rounding, and IRS business-rule verification remain open. | Finish all supported election/recipient paths and required form lines, then run the full test batch, local XSD, and IRS business rules.                                                                 |
| GAP-MAP        | Simple field-mapping documents               | Several registered forms have sparse field-map builders. Their registration is not evidence of complete calculations or required IRS detail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Audit each against form instructions and XSD, then add source-to-XML and negative tests.                                                                                                                |
| OUT-NR-SS-4868 | Other ATS return families                    | Standalone 1040-NR, 1040-SS, and 4868 exporters are outside the user-agreed Form 1040 scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | No gate on this board; retain the source inventory separately and do not imply those returns are supported.                                                                                             |
| GAP-ATS        | IRS acceptance                               | No ATS transmission or acknowledgment has been recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Authorized ATS credentials, complete package, accepted test transmissions, and archived acknowledgments.                                                                                                |

### GAP-8283: Noncash contribution signatures

The current build pass also classifies each positive Form 8283 gift for the
TY2025 Publication 526 Worksheet 2 limits and passes its source amount to
Schedule A. Schedule A applies the current-year 60% cash, 50% noncash, other
30%, capital-gain 30%, and 20% limits in worksheet order, finalizes the filed
cash/noncash lines, and records excess by original category. Focused cases are
written but unrun. Direct unclassified Schedule A lines 11-13 and Form 8283
claims without a category are rejected. This is **not** a complete AGI-limit or
carryover route: prior-year carryovers need origin year/category ledger,
current-year-first then oldest-vintage priority, 50%-organization carryover
priority over current second-category gifts, current-year standard-deduction
selection treatment, capital-gain election refiguring, and any prior Form 8283
and appraisal attachments. Current-year cash gifts to second-category
organizations or for the use of a qualified organization now enter the other 30%
Worksheet 2 limit and Schedule A line 11 when cash-only or fully allowed
alongside noncash gifts. A partially allowed mixed cash/noncash other-30 group
stops because Worksheet 2 does not assign its combined line 24 allowance to
Schedule A's separate cash and property lines. These cases are written but
unrun. Qualified conservation contributions are explicitly rejected. K-1
charitable sources are not routed. Ten benchmark fixtures (69, 73, 74, 75, 81,
84, 87, 89, 95, 101) contain raw Schedule A charity amounts without
recipient/property categories; no fixture supplies enough evidence to infer a
category, so they currently fail explicitly and must be re-sourced.

The current build pass requires the actual appraiser-signature and
donee-signature PDFs for Section B, checks the exact descriptions required by
the 2025 MeF business rules F8283-041 and F8283-042, and links both binaries to
the corresponding native `IRS8283` document. Missing or mismatched attachments
stop export. The attachment and full-bundle cases are written but unrun. This
does not settle other Form 8283 limits or attachment paths.

The Section A vehicle build pass now requires the donee-issued PDF for a claimed
deduction above $500. For a $501-$5,000 claim it supports Form 1098-C box 5b
needy transfer and both box 5a exceptions: significant intervening use and
material improvement. Each has an exclusive, timely donee certification, source
facts, and its native MeF indicator; box 5c carries intended use plus duration
or intended improvement detail. A larger exception claim now uses Section B with
explicit qualified-appraisal and signed donee facts; the builder links the
appraiser-signature, donee-signature, and donee-issued acknowledgment PDFs plus
the native vehicle statement. This is written for the three exception routes,
not all Section B vehicle situations. The 2025 Form 8283 instructions require a
copy of the donee-issued Form 1098-C or equivalent written acknowledgment above
$500. Focused calculation, attachment, and native-statement XSD cases are
written but unrun. The model cannot authenticate the donee's PDF or prove the
intended work was ultimately done.

For a single supported Section B item claimed above $500,000, the build now
requires the full qualified appraisal as a separate PDF from the appraiser's
Form 8283 signature. It checks the IRS TY2025 recommended description prefix
`Qualified Appraisal` and links that PDF to the item's `IRS8283` document. The
same requirement applies to a supported high-value vehicle exception alongside
its donee acknowledgment. Equipment, Section B securities, collectibles, and
exception vehicles are covered; art, conservation/easement and other special
property types still stop. The new similar-item build pass requires an explicit
property-category declaration for each positive gift when multiple items are
present, sums claimed values across donees for the $5,000 Section B threshold,
and lets a Section B item below $5,000 file when its group exceeds that limit.
The MeF builder emits a separate Section B document for every item/donee. A
supported group above $500,000 requires a shared full appraisal PDF confirmed to
cover the group, with binary references on each document. The IRS books across
three donees example and high-value group cases are written but unrun. The $500
aggregate Form 8283 filing threshold is satisfied by existing Section A document
emission, but small-gift overfiling has not been reviewed. Mixed Section A
exemptions and ordinary Section B gifts in a high-value group stop. Appraisal
contents/provenance, other property-specific exceptions, a filed Form 8283 PDF
descriptor, prior carryovers, and full-batch verification remain open.

### GAP-982: Qualified principal residence debt

The current build pass no longer treats an entire discharged mortgage as
qualified principal-residence indebtedness solely from Form 1099-C box 2. It
requires traced total and qualifying pre-discharge loan balances, main-home
security confirmation, and an explicit filing-status cap answer. A mixed-use
loan's nonqualified balance is discharged first for the exclusion calculation;
the remainder feeds Schedule 1 and Form 1040 AGI, while the excluded portion
feeds native Form 982 line 2. MeF export checks the MFS cap choice against the
return. A Form 1099-C with box 3 interest now reconciles box 2 to discharged
principal plus interest and requires documented taxable or cash-method
deductible-debt treatment; interest never enters Form 982 line 2. QPRI also
requires a sourced home-value-decline or financial-condition discharge reason,
an actual discharge date separate from the 1099-C identifiable-event date, and
confirmation that discharged principal plus box 3 interest equals box 2; fees
and penalties need separate classification. Box 7 FMV no longer invents a
Schedule D gain: retained property does not route there, and a transfer stops
until recourse, debt balance, basis, and holding facts support a disposition
calculation. The legacy Schedule D COD fields now reject direct input. Source,
calculation, XML, and local XSD cases are written but unrun. Mixed
deductible/nondeductible interest, recourse/nonrecourse property disposition,
multiple debts, evidence authentication, and non-QPRI Part II tax-attribute
reductions remain open. See the
[Form 982 instructions](https://www.irs.gov/instructions/i982) and
[2025 Publication 4681](https://www.irs.gov/publications/p4681).

### ATS-01: Form 1040 Scenario 13 source reconciliation

A full source-fact input fixture for the nine-page
[TY2025 Scenario 13 PDF](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf)
now maps the joint filer, W-2, and Form 8911 charger facts. Its separate
reconciliation records that the PDF prints a $30,000 joint standard deduction
and $1,620 of taxable income, while the current TY2025 configuration applies
$31,500 and leaves $120. The printed $162 Form 8911 tax limit cannot be reused
as a current-law result. The fixture cases are written but unrun and are not an
ATS-ready return or an acknowledgment.

Scenario 3 now has a source-fact fixture and reconciliation cases for Schedule F
and Form 4835. The IRS packet leaves the Form 1040 results blank. The current
build pass calculates the elected Schedule SE farm optional method from Schedule
F gross and net amounts, including farms with profit below $400 or a loss. One
shared calculation feeds the tax node, native TY2025 MeF Part I/II fields, and
PDF descriptor. Farm K-1 and CRP source facts, missing transaction and activity
details, and blank Form 1040 results still prevent an ATS-ready return.
Calculation, MeF, and PDF-field cases are written but unrun.

### GAP-8978: Partner's additional reporting year tax

**Build pass, untested.** The old default-37% estimate and Schedule 2 positive
route are removed. The node now calculates each affected-year Form 8978 column
from original and corrected income-tax liability, sums signed line 13 amounts
into line 14, and routes a positive result to Form 1040 line 16. It emits one
native `IRS8978` and linked `IRS8978ScheduleA` per filing, and the bundle
builder creates a tax-computation statement PDF per filing. Input requires the
actual affected-year tax recomputation and explanation; this engine does not
infer it from a marginal rate. The negative route now feeds Form 6251 line 10,
caps the Schedule 3 line 6l credit at Form 1040 line 18, and applies any
remaining amount only to classified chapter 1 Schedule 2 Part II tax through
signed line 17z, a linked `AnyOtherTaxesStatement`, and finalized line 21 / Form
1040 line 23. PDF Schedules 2 and 3 project the same worksheet amounts. Positive
and negative source-to-XSD and calculation cases are written but have not run.
The chapter 1 source classification and tax-form PDF layout still need an
instructions audit and visual verification; interest, penalties, all required
attachments, and IRS business rules remain unverified. See the
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi).

The current build pass also requires a distinct source explanation when Form
8978 line 5 differs from lines 2 less 4 or line 11 differs from lines 8 less 10.
The generated tax-computation PDF prints each exceptional calculation in its own
labeled section. These source and statement cases are written but unrun, and the
entered recomputation still needs independent tax-year review.

The Schedule 2 serializer now stops when a negative Form 8978 line 17z would
make line 18 negative: the TY2025 MeF XSD declares line 18 nonnegative, while
business rule S2-F1040-004 requires it to equal the sum of lines 17a through
17z. Omitting it would silently produce an inconsistent return. This corner case
needs an IRS-authorized filing treatment before it can be supported; its
rejection case is written but unrun.

### GAP-8621: PFIC and QEF reporting

**Build pass, untested; whole-form gap remains.** The flat 37% estimate and
Schedule 2 line 17z tax route have been removed. Section 1291 distribution
blocks now take prior-year distributions for the same shares, apply the 125%
per-share threshold, and apportion annual excess across actual 2025 distribution
dates. Each event's holding-period allocation is derived from actual days,
including leap years and cent balancing. Prior PFIC-year tax uses each year's
[IRS-published highest rate](https://www.irs.gov/instructions/i8621), apply
per-year foreign-tax-credit limits, and send Form 8621 line 16e to Form 1040
line 16 with `1291TAX`. Section 1291 interest is now computed per prior PFIC
year from net tax and the IRS's historical quarterly section 6621 underpayment
rates, daily compounded from the statutory April 15 return date through April
15, 2026. Caller-entered interest is rejected. Calendar-year allocations back to
1987 are modeled, except TY2019 and TY2020, which stop pending COVID-period
due-date analysis. Taxpayer-specific disaster relief is not captured. Calculated
interest goes to Schedule 2 line 17p; current/pre-PFIC income goes to
Schedule 1. QEF net capital gain now routes to Schedule D, and mark-to-market
loss is limited by unreversed prior inclusions. QEF section 951/1293(g)
reductions are separate source facts. The section 301 taxable part of nonexcess
distributions routes to Schedule B and Form 8960 as a separate sourced fact.
Native `IRS8621` and a holding-period statement builder are registered;
calculation and source-to-XSD cases are written but unrun. The engine still
needs mixed-currency distribution conversion, mixed lots and historical
disposition basis reconciliation, COVID-period and special due-date treatment,
complete QEF/MTM elections and supporting facts, PDF verification,
XSD/business-rule evidence, and ATS acceptance.

The current build pass adds same-currency section 1291 distributions in a
non-USD currency. It computes the 125% threshold in that currency and converts
each dated excess amount using an explicit spot rate and source. A disposition
can instead derive its USD gain from foreign-currency net proceeds, a dated spot
rate, and a supplied USD adjusted basis. The MeF currency code, line
15e(1)/15e(2) values, and rate-source statement follow those facts. Focused
calculation and MeF cases are written but unrun. Mixed currencies, historical
basis derivation, and mixed or partial lots remain unsupported.

### GAP-8615: Child's unearned-income tax

**Build pass, untested; whole-form gap remains.** The old node computed only an
incremental parental-rate amount and posted it to Schedule 2 line 17d. That
route has been removed. The current build pass takes explicit parent identity,
income-tax, filing-status, sibling line 5, and eligibility facts; applies the
dependent standard deduction to the child's return; checks the child's stated
unearned income against the return sources in a dependent case; computes
ordinary-rate Form 8615 lines 1-18; and uses line 18 as the child's Form 1040
line 16 tax. A nonpositive line 3 stops before line 4, and a zero line 5 stops
before the family-tax worksheets. Both retain the child's already-computed
regular tax, even when that tax used preferential rates or Form 2555. The MeF
serializer emits the 2025 native amount fields, and the PDF descriptor maps the
numbered amount lines and parent identity/status. Calculation, source-to-return,
local XSD, and PDF-field cases are written but unrun. The
[2025 Form 8615 instructions](https://www.irs.gov/instructions/i8615) also
require preferential-rate and Schedule J worksheets, and a Form 2555 route, when
those facts affect a positive line 5. The current build pass implements the
three Line 5 qualified-dividend/capital-gain allocation worksheets and the
qualified-dividend/capital-gain tax calculation for family line 9 and child
line 15. It carries explicit parent and sibling preferential-income facts and
native MeF worksheet indicators. Focused and end-to-end cases are written but
unrun. The current build pass also adds exact TY2025 Tax Table lookup for
positive-line-5 Forms 8615 below $100,000, including both ordinary-tax
comparisons inside the qualified-dividend worksheet. Its derivation was compared
with all 8,248 cells of the published IRS table with zero mismatches; the
repository tests and full graph have not yet run. Schedule D special-gain and
Form 4952 routes, Schedule J, and Form 2555 still stop explicitly. The exact
TY2025 Tax Table helper is now shared with general Form 1040 line 16 and the
qualified-dividend and Schedule D worksheet comparisons below $100,000. Form
2555 without preferential income uses table cells in its stacked comparison;
Form 2555 with preferential income stops pending the capital-gain-excess
adjustment. These cases are written but unrun. Rounding and the shared
preferential-tax helper's behavior-preserving extraction await the full test
batch. Parent and child eligibility proof, dependent earned-income source
derivation beyond the stated amount, visual PDF verification, and IRS business
rules remain open. Do not treat the ordinary slice as whole-form support.

### GAP-8854: Initial and annual expatriation statement

**Build pass, untested; whole-form gap remains.** The old node used 2024
thresholds and treated deemed asset gain as a dollar-for-dollar Schedule 2 tax.
That route has been removed. The 2025 covered-expatriate average-tax threshold
is $206,000 and the mark-to-market exclusion is $890,000. Both initial and
annual Form 8854 sources now record 2025 income-tax status. Their registered
Form 1040 MeF paths require an asserted full-year U.S. citizen/resident tax
period; nonresident and dual-status sources stop at those filing gates. The
assertion is not independent residency evidence. An initial expatriation in 2025
does not by itself establish Form 1040 e-file eligibility. The source-identified
asset calculation now allocates the exclusion proportionally to gain assets,
without using losses to dilute it, and balances cents deterministically. The
covered-expatriate test now recognizes qualifying dual-citizen and minor
exceptions only when the five-year tax-compliance certification is true. It
checks their residency limits and the minor's date-of-birth boundary, and
rejects exception claims for long-term residents. It also derives the average
annual net tax from five separate 2020-2024 amounts, which match Part II Section
A line 1, instead of accepting an untraceable precomputed average. Prior-year
return and foreign-tax-credit evidence is not yet reconciled. The exception
facts are entered assertions, not independently authenticated citizenship or
residency records. The current input covers initial 2025 expatriation only; the
older annual-statement path still needs its own data model. Required Part I
mailing, telephone, notification, citizenship, and resident dates now have a
schema-ordered XML builder. Part II Section A now emits the five prior-year tax
lines, covered-status answers, and a linked native change-explanation statement
when line 3 is yes. The node and MeF descriptors now emit an initial noncovered
`IRS8854` and its needed native statements through explicit document-discovery
and ID-linking passes. Covered Section C and deferral cases still reject filing.
Full-return and local XSD cases for noncovered returns with and without native
statements are written but unrun. Section B now takes balance-sheet categories
and derives asset, liability, and net-worth totals instead of trusting a
free-entered number. Its unregistered XML builder emits the form lines and
native itemized statements for partnership interests, owned and nongrantor
trusts, other assets, and other liabilities. Line 5a is checked as a subset of
line 5 and excluded from line 20. These category values remain entered
assertions without independent valuation evidence. Section C now has a separate,
complete-inventory-confirmed source object for mark-to-market property, eligible
and ineligible deferred compensation, specified tax-deferred accounts, and
nongrantor trust interests. The old flat `assets` input is rejected. An
unregistered Section C builder emits the ordered property rows, excluded-item
indicators, totals, and native statements, and refuses to serialize over 20
property rows because the MeF schema has no demonstrated continuation path. It
also requires a linked computation statement for property rows. These
declarations do not yet prove that the deemed gains, losses, compensation, and
account amounts are present on the correct income forms, so filing remains
blocked. Section D now has an explicit no-election/election source. An elected
deferral takes the line 24 tax from each of two distinct hypothetical returns,
derives eligible tax, allocates it across all positive-gain properties before
selecting deferred properties, and emits unregistered Section D, Section C
column (g), and native per-property allocation XML. The document IDs, security,
agent, and waiver confirmations are source assertions; the hypothetical return
PDFs and agreement copy can now be attached in the registered bundle, but their
content, original mailing, and IRS acceptance are not authenticated. A separate
annual input and Part III XML builder now represent prior deferred properties,
2025 dispositions, and eligible-compensation and nongrantor-trust distributions.
It rejects unsupported pre-June-17-2008 dates and more than three distinct Form
1042-S source groups per category. Eligible-compensation and trust distribution
entries now reference structured 2025 Form 1042-S source rows with income codes
38 and 39, respectively, per the
[2025 Form 1042-S instructions](https://www.irs.gov/pub/irs-pdf/i1042s--2025.pdf).
Each source's rounded reportable amount and withholding must match its linked
distributions; the Part III builder groups payments from one source into one MeF
detail row. Source, mismatch, and grouping cases are written but unrun. This
does not authenticate the payor statement or open the registered distribution
filing gate. Annual input now records whether 2025 was a full-year U.S. citizen
or resident period or a nonresident/dual-status year. The registered Form 1040
MeF path admits only the full-year status; code 38/39 distributions are limited
to the nonresident/dual-status source path.
[Notice 2009-85](https://www.irs.gov/irb/2009-45_IRB) says the special
withholding does not apply during a later citizen/resident period, and
[2025 Publication 519](https://www.irs.gov/publications/p519) says dual-status
returns cannot be e-filed. The status is an assertion, not verified residency
evidence. Zero-reportable distributions and other return families remain open.
Annual eligible-compensation and nongrantor-trust items now require descriptions
and explicit treaty-waiver confirmations, and the registered no-activity and
capital-disposition bundles emit their item-level native waiver statements in
ReturnData1040 order. Statement, missing-confirmation, and full-return XSD cases
are written but unrun; the source confirmations do not authenticate the earlier
Form W-8CE, trustee notice, or mailed original. Prior Form 8854 amounts,
disposition reporting, and payment evidence remain entered source assertions. A
registered annual node and MeF descriptor now file the no-disposition,
no-distribution certification only with confirmed full-year Form 1040 tax
status. The annual input also requires explicit confirmations that the original
Form 8854 was mailed separately and the return-attached copy was marked “Copy,”
as the 2025 instructions require. Those assertions do not prove mailing or the
contents of the filed copy. Missing-confirmation cases are written but unrun.
Its graph, full-return, and local XSD cases are written but unrun. An annual
deferred-property disposition now has separate actual-sale, full-disposition,
deferred-tax, interest, payment-date, and receipt-filename facts. For a
disposition reported on Form 8949, a written one-to-one check matches the filed
transaction ID, sale date, proceeds, basis, adjustments, gain, and term flag; it
is unrun. Annual events still reject at the registered filing gate unless they
are full-property Form 8949 dispositions without distributions. Those
dispositions now reach the annual IRS8854 through the normal graph only when the
filed Form 8949 row reconciles and the named payment-confirmation PDF is present
in the bundle. Missing-row, missing-PDF, graph, and local XSD cases are written
but unrun. The receipt's amounts and timeliness remain source assertions;
non-Form 8949 dispositions and distributions still reject. Identified Form 8949
transactions now retain a source ID through calculation and MeF pending data.
The unregistered initial bundle now checks the Form 8949 MeF filing rows, rather
than a separate raw source, and requires a one-to-one match for Form 8854 gain
properties marked `F8949`, including the deemed-sale date, whole-dollar proceeds
and basis, and the exclusion adjustment. The same unregistered check now accepts
a Form 8949 loss only with an explicit deductible capital-loss or nondeductible
personal-use characterization, matching either the unadjusted loss or a code-L
adjustment that zeroes it. It also checks the filed row's computed gain or loss
and rejects a raw-input-shaped substitute. The Form 8949 match now also requires
confirmation that the ordinary holding-period rule applies and checks the
acquisition date against the deemed-sale date and short/long box; inherited
property and other special holding-period rules remain blocked rather than
inferred from a description. It also requires an explicit digital-asset
classification and matches that to the TY2025 C/F versus I/L
no-information-return boxes, without guessing from the property name. These
category cases are written but unrun. These checks are written but unrun. This
is a reconciliation check, not an automatic transaction route; other loss
characters, Form 4797, direct Schedule D, and excluded-item income still need
character and reporting checks. The registered initial builder now files a
covered return when Section C contains only identified Form 8949 mark-to-market
properties, each reconciled to its filed transaction, with no other Section C
category. Its full-return XML, missing-source rejection, and local XSD cases are
written but unrun. The normal Form 8854 calculation node now uses the same
filing-scope gate, so this covered case can reach the MeF builder through the
source graph; a source-to- return case is written but unrun. For a Section D
election on those properties, the source now names the two hypothetical-return
PDFs and the marked agreement-copy PDF by filename rather than inventing their
MeF document IDs. The bundle validates each PDF and links it to the
assembler-assigned ID. It requires source confirmations that the original
request was marked Original and mailed, and the attached copy was marked Copy;
it cannot authenticate that mailing, the agreement's acceptance, adequate
security, or the tax calculations printed in the supplied hypothetical returns.
Bundle, source-graph, missing-PDF, and local XSD cases are written but unrun.
Other covered income categories and unsupported annual disposition or
distribution events remain blocked. Exception source corroboration, PDF, broader
source reconciliation, and IRS business rules remain open. An initial-form
bundle now composes Parts I and II in XSD order and links native statement IDs
with the required filename-to-binary-ID mapping, including deferral
hypotheticals, agreement copy, and trust valuation rulings. It validates ID
shape and uniqueness; the registered bundle also validates that named PDFs are
present and readable. Local IRS8854 XSD cases for the unregistered initial and
annual roots are written but unrun. Both root builders now leave `documentId` to
the return assembler, and the initial builder accepts only IDs for linked native
and binary documents. The registered bundle now generates those IDs from the
actual document set and links its native statements and named binary
attachments; the cases are written but unrun. The initial builder now exposes an
ID-independent, stable native statement set for the assembler's first
document-discovery pass, with its written case unrun. Its discovery order now
follows the native Form 8854 statement roots in ReturnData1040.xsd; the
multi-statement order case is written but unrun. An ordered-ID linker maps
assembler IDs back to the statement keys and rejects count or ID collisions.
These are now used by the registered noncovered and reconciled capital-only
covered paths; the cases remain unrun. The calculation and rejection cases are
written but unrun. See the
[2025 Form 8854 instructions](https://www.irs.gov/instructions/i8854).

## Registered Form 1040 MeF documents to audit

Build-pass addendum for Form 2555 housing (unrun): the physical-presence,
foreign-employer wage filing now takes sourced qualified housing expenses and
calculates 2025 Parts VI, VII, and VIII through line 45, including the housing
cap, base amount, employer-provided wage fraction, and residual FEIE. The native
MeF fields and focused positive/rejection cases are written but unrun. The old
aggregate housing amounts now reject instead of bypassing Part VI. The build
pass includes all 136 adjusted-location rows in Notice 2025-16, requires an
explicit reviewed table or unlisted-location selection, and emits the applicable
line 29a/29b MeF fields. A listed city cannot silently take the standard cap.
Multiple residences or households, self-employed housing deduction, non-wage
employer amounts, and later-limit elections remain open. Regional locations such
as Osaka-Kobe require documented human verification of geographic membership.
See the [2025 Form 2555 instructions](https://www.irs.gov/instructions/i2555)
and [Notice 2025-16](https://www.irs.gov/irb/2025-13_IRB#NOT-2025-16).

Build-pass addendum for GAP-6251 (unrun): line 10 now receives the Form 4972
subtraction, Form 8962's Schedule 2 line 1a amount as part of line 1z, Schedule
3 line 1 foreign tax credit, and the negative Form 8978 adjustment. Schedule J
refigure and other Schedule 2 line 1z sources remain open. An additional
ordinary-income Form 2555 route now uses the 2025 Form 6251 Foreign Earned
Income Tax Worksheet to calculate line 7 from Form 2555's excluded income and an
explicitly sourced worksheet line 2b amount. Source-to-form and bracket cases
are written but unrun. The current build pass also calculates the Form 1040
Foreign Earned Income Tax Worksheet's qualified-dividend route with its
regular-tax capital-gain-excess adjustment, and Form 6251 Part III's separate
AMT capital-gain-excess adjustment. Both retain the independently refigured
regular-tax amounts for Form 6251 lines 20 and 27. These cases are written but
unrun. Form 2555 combined with Schedule D special-rate gain now uses the stacked
Schedule D and AMT Part III worksheets when neither regular nor AMT capital-gain
excess exists. A special-rate return with capital-gain excess, or an AMT Form
4952 election, still stops pending the distinct Schedule D refigure; broader
AMT-basis gain differences and IRS business-rule verification also remain open.

Build-pass addendum for GAP-1116 (unrun): unsupported section 951A, foreign
branch, treaty-resourced, and section 901(j) categories now stop before any
Schedule 3 or Form 6251 credit is calculated, including mixed-basket returns.
The Form 1116 PDF map now places worldwide taxable income on 2025 line 18 and
U.S. tax before credits on line 20. The current build pass now sources signed
Form 1040 lines 11b minus 14 before its line 15 zero floor, adds only Schedule
1-A line 37, and checks Form 1116 line 18 against the assembled return. Form
1116 line 20 is checked against Form 1040 line 16 plus Schedule 2 line 1z.
Nonzero line 1z currently fails closed because its source route would cycle
through the AMT computation. The senior amount is excluded from line 3b
apportionment. Schedule 1-A qualified vehicle-loan interest now uses a
documented beginning/end tax-book asset inventory to allocate its line 4b
foreign share by category and country; the same amount reduces line 7 and
appears in native MeF line 4b. Missing inventory, mixed-source asset
characterization, and the separate small-foreign-income election remain open. A
bounded qualified-dividend/capital-gain tax worksheet path now computes the 2025
preferential-rate line 18 denominator when a documented review confirms no
foreign qualified dividends or foreign capital gains or losses. It preserves the
foreign numerator and reconciles the adjustment to Form 1040's signed line 11b
minus line 14 plus Schedule 1-A line 37; cases are written but unrun. Foreign
preferential-income adjustments, the Schedule D Tax Worksheet path, AMT Form
1116 sourcing, category-specific calculations, visual PDF review, full-batch
validation, and IRS business rules remain open.

Build-pass addendum for GAP-8814 (unrun): the 2025 parent Form 1040 PDF now
marks the child dividend and direct child capital-gain boxes, while Schedule D
and Schedule B receive applicable Form 8814 notes. The Form 8814 PDF follows the
Part I zero/skip print rules. The PDF field positions were inspected, but
filled-render review, full-batch validation, and IRS acceptance remain open.

Build-pass addendum for GAP-8889 (unrun): a positive Part III line 19 now
requires identified current- or prior-year IRA-to-HSA transfers, twelve 2025
monthly eligibility facts, and an amount reconciled to the relevant Form 8889
line 10. The rule checks each transfer's own testing period and rejects expired
or unsupported free-text recapture amounts. Trustee and prior-return evidence
authentication, full-batch validation, and IRS acceptance remain open. A new
bounded unmarried-beneficiary route reconstructs last-month-rule line 18 from
filed TY2024 contribution lines and twelve monthly HDHP facts, and rejects the
old entered amount, conflicting filed lines, spouse allocation, and overlapping
prior-year IRA funding. Its cases are written but unrun.

Build-pass addendum for GAP-8283 (unrun): Section A column (h) now uses a
supported reduced contribution amount instead of unreduced FMV and links a
native `FairMarketValueStatement` with original FMV, calculation, and reason.
The automatic routes are limited to donee-certified vehicle sale proceeds with
sourced basis at least FMV, and purchased short-term ordinary-income property
whose claimed amount equals basis. Other reductions, including combined sale and
appreciation reductions, stop until their distinct source rules exist. The
statement/XSD, full calculation batch, and IRS business rules are unverified.

Build-pass addendum for GAP-4952 (unrun): partnership K-1 box 20 code B now
feeds Form 4952 line 5 only for an identified payer and separately affirmed,
already allowed nonpassive depreciation/depletion amount. Manual line 5 input
requires an explicit no-duplicate assertion when it coexists with that K-1
source. Source authentication, the underlying deduction elsewhere on the return,
other investment-expense types, full-batch validation, and IRS business rules
remain open.

Build-pass addendum for GAP-4972 (unrun): an explicit Form 1099-R box 9a share
below 100% now stops the Form 4972 election because the multiple-recipient
worksheet is not implemented. A 100% share continues through the existing
single-recipient route. The 2025 line 24/27 rate schedule uses the printed
$1,706.30 base in the $11,440–$13,710 bracket. Source-to-form cases for the
share guard are written but unrun. Multiple-recipient tax allocation, NUA PDF
appearance, and the full validation gates remain open.

Build-pass addendum for GAP-6251 (unrun): a Form 6251 with line 7 greater than
line 10 now remains in the return, MeF, and PDF even when the AMT foreign tax
credit makes line 11 zero. The inverse no-filing path and credit-driven filing
have written cases. Other who-must-file triggers, AMT refigures, full-batch
validation, IRS business rules, and PDF appearance remain open.

Build-pass addendum for GAP-4952 (unrun): TY2025 partnership K-1 box 13 code H
and S-corporation K-1 box 12 code H now feed line 1 from identified payers.
Duplicate assertions guard manual interest and ambiguous aggregate S-corp
deductions; cases are written but unrun. Broker allocation, other K-1 codes,
AMT source refigure, full-batch validation, XSD/PDF, and ATS remain open.

Build-pass addendum for GAP-8962 (unrun): the single-Schedule-C Publication 974
iterative route now accepts partial-year Marketplace coverage when every Form
1095-A coverage month and all specified premiums, SLCSP, APTC, and policy rows
reconcile. The source shape was renamed directly to
`pub974_single_business`, with no old-name alias. Multi-business, mixed
specified/nonspecified premiums, other special ordering, and full validation
remain open.

Build-pass addendum for GAP-MAP / Form 8815 (unrun): its old 2025 phaseout,
QSS bracket, guessed proceeds/MAGI, and nonnative XML tags were replaced by a
bounded source-backed calculation and native line mapping. Explicit bond,
education, interest, and MAGI worksheet facts are required. Schedule B, MeF,
PDF, and filing-status business-rule cases are written but unrun. Coverdell/QTP,
foreign institutions, royalty-interest adjustments, broader MAGI reconciliation,
filled-PDF inspection, and IRS acceptance remain open; see
`docs/mef/ty2025-form8815-gap.md`.

Build-pass addendum for GAP-1116 (unrun): current-year passive/general excess
foreign tax now requires sourced prior-year Form 1116 lines 23/24 and a zero
prior Schedule B line 8 balance. A zero-capacity one-year carryback generates
native Schedule B lines 6/8; missing, contradictory, or multi-category reviews
stop clearly. Source-to-XML and negative cases are written but unrun. Other
carrybacks/carryovers, Schedule B PDF mapping, full-batch/XSD, and IRS business
rules remain open.

Build-pass addendum for GAP-MAP / Form 8960 (unrun): eleven totals and tax
lines already computed by the node now map to their native TY2025 MeF fields
in filed order. Focused field and order cases are written but unrun. This does
not settle the source inclusion/deduction audit, the 8814 interaction, local
XSD validation, PDF appearance, or IRS business rules.

The following are registered in `forms/f1040/2025/mef/forms/index.ts`.
**Registered means the builder can be invoked, not that the form is complete or
approved.** Mark each row in the INV-01 matrix after checking calculations, XML,
dependencies, required statements, and tests.

- Return and schedules: Form 1040; Schedules 1, 2, 3, 8812, A, B, C, D, E, EIC,
  F, H, and SE.
- Income/source documents: W-2, 1099-R, foreign-employer compensation records,
  and wages-not-shown schedule.
- Forms 461, 982, 1116, 2441, 2555, 4137, 4562, 4684, 4797, 4835, 4952, 4972,
  5329, 5695, 6198, 6251, 6252, 6781, 7206, 7217, 8283, 8396, 8582, 8606, 8615,
  8621, 8814, 8815, 8824, 8829, 8839, 8853, 8862, 8863, 8880, 8889, 8911, 8919,
  8949, 8959, 8960, 8962, 8978, 8990, 8995, and 8995-A.
- Supporting documents: Form 4835 at-risk and passive-loss documents, Schedule A
  for Form 8911, cash/accrual CCC-loan statements, crop-insurance deferral
  statement, Form 1116 foreign-income-related-expense statement, joint-occupancy
  statement, Form 8978 Schedule A and tax-computation statement PDF, Schedule 2
  line 17z `AnyOtherTaxesStatement`, and the Form 8283 vehicle sale
  acknowledgment statement, and Form 8621 Part V holding-period statement.

## Release checklist

- [x] Agree on SCOPE-01: TY2025 Form 1040 family only.
- [ ] Complete INV-01. No completion percentage before this.
- [ ] Resolve every in-scope known gap, or record a deliberate exclusion with
      user approval.
- [ ] Pass the full suite on the final worktree, with ignored tests reviewed
      rather than counted as passes.
- [ ] Validate representative and boundary XML against the local TY2025v5.4 IRS
      XSD; check IRS business rules separately.
- [ ] Complete in-scope ATS fixtures and record IRS ATS acknowledgments. Local
      XSD validity is not ATS acceptance.
- [ ] Review changes for correctness, secrets, unrelated edits, and release
      notes; commit and open PR(s).
- [ ] Merge/release only after review and the agreed acceptance gates pass.

## Evidence pointers

- Registered documents: `forms/f1040/2025/mef/forms/index.ts`
- Per-document audit index: `docs/mef/coverage-inventory.md`
- Return assembly: `forms/f1040/2025/mef/builder.ts`
- Submission package: `forms/f1040/2025/mef/submission-archive.ts`
- Local XSD scenarios: `forms/f1040/2025/mef/xsd-validation.test.ts`
- ATS inventory and limitations: `docs/ats/ty2025.md`
- Machine-readable ATS facts: `forms/f1040/e2e/ats/ty2025_cases.ts`
- Form 4137 calculation and XML:
  `forms/f1040/nodes/intermediate/forms/form4137/index.ts`,
  `forms/f1040/2025/mef/forms/f4137.ts`
- Schedule SE rounding: 2025 IRS
  [Schedule SE](https://www.irs.gov/pub/irs-pdf/f1040sse.pdf), lines 10–13, and
  [Form 1040 instructions](https://www.irs.gov/instructions/i1040gi), “Rounding
  Off to Whole Dollars”; local reconciliation in
  `forms/f1040/e2e/ats/ty2025_cases.test.ts`
- 2025 [Schedule 2](https://www.irs.gov/pub/irs-pdf/f1040s2.pdf),
  [Form 8962](https://www.irs.gov/pub/irs-pdf/f8962.pdf), and
  [Form 8962 instructions](https://www.irs.gov/instructions/i8962); local
  TY2025v5.4 XSD in `.state/research/docs/IMF_Series_2025v5.4/`

Update this board from evidence after each completed workstream. Do not promote
“implemented” to “verified” solely because tests are green; the tests must cover
the claimed scope.
