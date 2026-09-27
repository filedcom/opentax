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
Form 1040 attachment or business rule.

## Current status

**Phase: implementation and correctness audit. Release status: blocked.** The
TY2025 Form 1040 calculation and MeF export changes are saved on the pushed
`codex/ty2025-form1040-board-wip-20260926` branch. Implementation continues
there. No PR, merge, deployment, IRS ATS transmission, or ATS acknowledgment is
recorded for this work.

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
credit line; all allocations reconcile to the calculated limit. Direct builder
cases are written but unrun. The draft now indexes Part V facility allocations
and linked source documents by entry position, so equal-valued or reused
facility objects do not silently reuse the first allocation; that case is
written but unrun. The descriptor links source Form 8826/8835 documents and
Schedule 3 line 6a, and refuses missing or mismatched source facts. The current
build pass also reconciles its Part II tax context against filed Form 1040,
Schedule 3, and Form 6251 amounts; its mismatch cases are written but unrun. It
has not passed the deferred full test batch, local XSD, or business-rule
validation and does not cover passive credits, other business-credit sources, or
carryovers. The current build pass also has an unrun pure bridge from finalized
Form 1040, Schedules 2 and 3, and Form 6251 lines into the nonpassive Form 3800
limit. It subtracts the specific Form 3800 line 7 and 10b exclusions instead of
letting the general business credit count against itself. The bridge is now
wired to graph finalization for Form 8826 and Form 8835 and requires Form 6251
even with zero AMT when a standard GBC is claimed, but remains untested. Other
GBC producers still send gross source credits straight to Schedule 3 line 6a and
require a common limitation pass. The
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
answer and stops a positive passive credit pending Form 8582-CR, with unrun
cases. The build pass now accepts identified partnership and S-corporation line
7 sources, caps their combined line 8 with self-earned credit at $5,000, and
lets pass-through-only credit reach Form 3800 without requiring the recipient's
own eligibility facts or an `IRS8826` document. Passive K-1 credits stop pending
Form 8582-CR. Source and XML cases are written but unrun. The combined cap now
allocates credit pro rata in cents to each identified source before the Form
3800 handoff. The registered Form 3800 nonpassive XML path now includes Form
8826's distinct Part III line 1e group and Part V rows for multiple Form 8826
sources. Part V retains the K-1 EIN, capped source credit, explicit
applied-credit split, and remaining amount. Its Part III applied credit
reconciles with Form 8835's line 1f and 4e groups and the shared Part II limit.
The Part V draft now apportions whole-dollar source and applied amounts so the
printed rows add back to the rounded Part III and Part II totals; its rounding
case is written but unrun. Solo, combined, and negative cases are written but
unrun. K-1 document reconciliation, filed source attribution, and carryforward
identity remain open. Its source graph now calculates the nonpassive limit, and
the XML document bundle is linked but unverified. Schedule 3 line 6a now
requires and references the Form 3800 document in the linked MeF bundle. The
[business-credit routing audit](docs/mef/general-business-credit-routing.md) now
names the direct line 6a producers and the source classifications needed before
a shared Form 3800 finalization. It also identifies Form 8912 as a separate line
6k credit formerly misrouted to 6a. The other direct deposits remain in code and
can still overstate filed credits. The Form 5884 source build pass now requires
employee identity, pre-2026 hire, state-workforce certification, wage
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
Schedule B. These source-to-return cases are written but unrun. A printed adjustment
statement lists the gross-to-net calculation; the payer continuation now
reconciles to gross line 1 rather than net line 2. These PDF and source-to-XML
cases are written but unrun, and no filled PDF has been rendered. The unrun
1099-OID pass now keeps reported taxable OID and stated interest gross on line
1, identifies acquisition and bond premium separately, and routes only the net
amount to Form 1040 line 2b. It requires the box 6 and box 10 adjustment
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
seller-financed interest,
adjustments, savings-bond exclusion, nominee amounts, and foreign-account/trust
facts can require the form below that threshold. Below-threshold income still
routes to Form 1040 without producing Schedule B. Reconciliation now runs before
that filing gate, and a savings-bond exclusion larger than interest is rejected.
Boundary, special-trigger, and invalid-source cases are written but unrun.
Seller-financed buyers now have an explicit U.S. or foreign address variant from
source input through the Schedule B MeF address choice and supplemental PDF
statement. A foreign-address source-to-XSD case is written but unrun. A complete
filing-trigger audit, filled-PDF layout, and IRS business-rule acceptance remain
open, so this is not complete Schedule B support. The next Form 8912 graph pass
requires each bond's taxable interest already reported by another input,
validates that amount against computed bond interest, and routes only the
unreported balance to Schedule B. Positive credit was formerly blocked at final
Form 1040 assembly. The current MeF path requires a finalized, attached Form
8912; the PDF path now has a descriptor but is not rendered or tested yet. These
graph and duplicate-interest cases are written but unrun. The source node now
hands separate Part I lines 1 through 4 to the Form 1040 sink instead of a
tentative scalar. The PDF build now maps Form 8912 Part I/II to its IRS widgets,
adds 20-row Part III and one-bond Part IV pages as needed, and reconciles the
printed credit with finalized Schedule 3 and the graph. Its descriptor and
pagination cases are written but unrun; filled-render inspection is still
required. Multiple partially limited bond sources and CREB/QZAB deduction
elections still stop MeF export pending bond-specific unused-credit treatment.
Source-document identity reconciliation remains open. The Form 1097-BTC
reported-bond input now requires all 12 monthly credit boxes and checks their
sum against annual box 1, captures box 2a's C/A/O code, and constrains box 2b to
the IRS 39-character alphanumeric identifier. It also rejects duplicate
issuer-EIN/unique-ID pairs within and across Form 8912 input items. These source
cases are written but unrun. The actual annual 1097-BTC document, corrected
statements, fiscal-year allocation, multi-bond type 1097-BTC source model, and
full cross-document identity matching remain open. A new unrun check rejects a
Part IV CUSIP already represented by a Form 1097-BTC with the same issuer EIN
and box 2a code C, including identifiers with an account suffix and entries in
separate Form 8912 input items. Account and other identifiers cannot be matched
to a CUSIP from these facts alone. The Part IV input now records acquisition and
allowance dates instead of an unchecked column (e) percentage. The build pass
derives quarterly allowances, BAB interest-payment allowances, pre-October 2008
QZAB annual allowances, and the final quarter prorated on maturity or
redemption, including a fifth partial date after December 15; it rejects dates
outside the 2025 holding period or duplicated across line 18 rows. These date
and XML cases are written but unrun. Record-holder timing on a sale, other
dispositions, and the required bond-rate source still need review.

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
those combinations stop explicitly. Form 4136 now combines its represented
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

## Workstreams

| ID       | Workstream                               | Current state                                                                                                                                                                                                                                                                                                                                                            | Next evidence required                                                                                                                                                                                                                            |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-01   | Authoritative MeF coverage inventory     | **In progress.** `docs/mef/coverage-inventory.md` now lists every registered Form 1040 serializer and the confirmed missing Scenario 4 documents, while marking most coverage evidence unaudited.                                                                                                                                                                        | Compare all in-scope IRS instructions and ReturnData1040 documents with product requirements; fill each row with actual input, calculation, serializer, attachment, local XSD, end-to-end, ATS/business-rule evidence and unsupported conditions. |
| SCOPE-01 | Product boundary                         | **Decided.** TY2025 Form 1040 family only. Standalone 1040-NR, 1040-SS, and 4868 returns are excluded from this board.                                                                                                                                                                                                                                                   | Keep all Form 1040 schedules, attachments, source reconciliation, XML, business rules, and applicable ATS scenarios in the inventory and acceptance gate.                                                                                         |
| CORE-01  | Return assembly and submission package   | **Implemented, audit needed.** Builder orders documents, links references, validates PDFs, and creates return/manifest archives and an A2A request package.                                                                                                                                                                                                              | Review against current IRS packaging and business rules; validate the complete SOAP/certificate path and receive an ATS acknowledgment. Package construction alone is not transmission readiness.                                                 |
| TAX-01   | Form 1040 calculation-to-XML consistency | **Implemented, audit needed.** Broad changes cover identity, wages, dependents, credits, income, deductions, and schedules.                                                                                                                                                                                                                                              | Reconcile each line with its source calculation and IRS instructions, including multi-source and taxpayer/spouse cases.                                                                                                                           |
| FARM-01  | Schedule F and Form 4835                 | **Verified slices.** Cash/accrual Schedule F, inventory, source-form reconciliation, CCC and crop-insurance statements, at-risk and passive farm flows have calculation and XSD cases.                                                                                                                                                                                   | Compare remaining farm instructions and all Part III elections/attachments to the coverage matrix; build complete ATS return fixtures where applicable.                                                                                           |
| RENT-01  | Schedule E and Form 8582                 | **Verified slices.** Rental, royalty, passive-loss allocation, prior losses, at-risk interaction, and XSD cases exist.                                                                                                                                                                                                                                                   | Audit every activity class, carryforward, and prior-year participation condition; resolve explicitly unsupported paths.                                                                                                                           |
| TIPS-01  | Form 4137                                | **Verified slice; audit needed.** Employer rows, taxpayer/spouse separation, W-2 allocation reconciliation, FICA calculation, XML, local XSD, and end-to-end routing pass, as does the current full suite.                                                                                                                                                               | Review rounding and W-2 reconciliation against IRS instructions, validate spouse/combined-return XSD cases, and audit all required attachments/business rules.                                                                                    |
| ATS-01   | TY2025 Form 1040 ATS scenarios           | **Partial facts only.** Eight Form 1040 scenario PDFs are inventoried, but there is no complete return fixture or ATS acknowledgment. Scenario 12 now has a passing calculation reconciliation: the cents path rounds to $3,437, while the IRS sample rounds its component lines to $3,438. Seven other return-type scenarios are reference-only under the agreed scope. | Build each complete in-scope scenario with an explicit, consistent rounding convention, compare printed/expected results, pass local XSD and business rules, then transmit and record ATS acknowledgments when credentials are available.         |
| QA-01    | Current-worktree regression gate         | **Historical partial pass.** The last `deno task test` passed 6,596/0/48 before subsequent implementation. The user requested build-first, then one full-batch test and fix cycle.                                                                                                                                                                                       | Finish the implementation pass, then run the full batch, review the 48 ignored live-PDF checks, fix failures, and rerun the full batch.                                                                                                           |
| SHIP-01  | Review and delivery                      | **Open.** WIP branch pushed; no PR for this body of work.                                                                                                                                                                                                                                                                                                                | Review the diff in coherent slices, check unrelated/user changes, commit, create PR(s), obtain review, and only then plan merge/release.                                                                                                          |

## Explicit gaps and decisions to track

| ID             | Area                                         | Evidence / question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Exit condition                                                                                                                                                                                          |
| -------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GAP-1116       | Form 1116                                    | Passive and general basket MeF builders exist. The current build pass adds source explanations and linked native `ForeignIncmRelatedExpensesStmt` documents for Part I line 2 direct expenses from Form 1116 inputs and K-1 feeders; its local XSD case is written but unrun. Section 951A, foreign branch, section 901(j), treaty-resourced, and lump-sum categories need category-specific source facts and rules, not just indicator tags. Carryovers, other-deduction statements, and special tax adjustments remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Build category-specific rules and remaining statements, then verify full-batch calculation, XSD, and IRS business rules.                                                                                |
| GAP-6251       | Form 6251                                    | The build pass now calculates TY2025 Part III lines 12–40 and MeF fields from both the Qualified Dividends and Capital Gain Tax Worksheet and the Schedule D Tax Worksheet source amounts, and replaces the simplified Form 1040 line 16 special-gain tax path with the 2025 Schedule D Tax Worksheet line order; these paths are unrun. The line 10 comparison now receives Form 1040 line 16, including preferential-rate tax. The build pass also routes signed 2025 line 1b, moves Form 1040 line 12 to the selected deduction branch and suppresses Schedule A XML when standard deduction wins, and applies the matching standard-versus-itemized line 2a addback, keeps evaluating AMT when regular taxable income is zero, and serializes calculated Part I/II amounts when AMT is due or a personal Form 8911 credit requires filing; cases are written but unrun. The build pass also carries separately refigured AMT Form 4952 line 4g into Part III and the signed regular-versus-AMT investment-interest difference into line 2c. Broader AMT-basis capital-gain refiguring, Form 2555, other line 10 adjustments, and other credit-driven filing triggers remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Part III is calculated from source facts and reconciled with AMT and MeF XML for capital-gain cases.                                                                                                    |
| GAP-S2         | 2025 Schedule 2 line structure               | The code previously labeled AMT as line 1 and Form 8962 excess APTC repayment as line 2, and omitted the latter from MeF. The current worktree uses line 2 for AMT and line 1a for excess APTC. The negative Form 8978 build pass also computes a chapter-1-tax offset, emits signed line 17z with a linked `AnyOtherTaxesStatement`, and adjusts line 21 and Form 1040 line 23. Those new cases are written but unrun. The remaining Schedule 2 line map, chapter 1 classification, and source-specific statements are not audited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pass source-to-return-to-MeF cases for Form 8962, AMT, and Form 8978; audit every other 2025 Schedule 2 line and chapter 1 classification against IRS instructions and schema, then run the full suite. |
| GAP-8962       | Form 8962 2025 MeF and calculation           | **Verified slices, whole form open.** Earlier source-backed Table 2/Table 5 and source-to-XSD cases cover named annual, monthly, MAGI, and same-state SLCSP flows. The current build pass adds separate taxpayer/dependent MAGI, dependent filing facts, multi-policy line 10 eligibility, below-100%-FPL exceptions and repayment, MFS branches, and shared-policy Situations 1-4. Up to 99 native MeF Part IV groups and line 34 No after four are coded. The PDF builder appends overflow statement pages. Monthly and annual line 11 QSEHRA paths use explicit self-only SLCSP, self-only permitted benefit, and actual permitted benefit facts for Publication 974 Worksheets N/Q, reconcile them to the annual reported amount, and set the MeF QSEHRA indicator. The PDF builder now writes “QSEHRA” in the top margin. These cases are written but unrun. Mixed monthly/annual-only policy inputs still stop. Form 8814 dependent income, PDF visual verification, alternative marriage calculation, coverage-family changes/SLCSP accuracy, self-employed insurance interactions, broader business rules, and ATS acceptance remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Continue building the remaining Form 8962 branches and source facts, then verify calculation, XML, PDF, business rules, and the full suite as one batch.                                                |
| GAP-8283       | Form 8283                                    | Build pass replaced the automatic capital-gain-property basis cap with an explicit Section B claimed deduction, added separate MeF documents for ordinary Section B gifts, and added VIN plus a linked native MeF vehicle statement for Section A claims above $500 on the donee-certified unrelated-party sale-proceeds route. These calculation, multi-document, and local XSD cases are written but unrun. Whether the actual donee-issued Form 1098-C/copy must also be attached remains unverified. Other vehicle routes, Section B appraisal/image attachments, pass-through documents, AGI limits, and PDF rendering remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Build the remaining attachment and limit paths, then run the full batch and verify IRS rules.                                                                                                           |
| GAP-8582       | Form 8582                                    | Prior-year active-participation facts already existed. The current build pass now splits an active rental's ineligible prior operating loss into Part V, excludes it from the Part II special allowance and Part VI ratios, and shares the revised per-activity allocation with Schedule E and Form 4835. Cases are written but unrun. Prior Form 4797 losses, durable per-activity carryforward identities, and full business-rule verification remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Verify split Part IV/V XML, Schedule E and Form 4835 routing, current-worktree tests and IRS rules; finish remaining prior-loss forms.                                                                  |
| GAP-8814       | Form 8814 and dependent income               | Build pass has replaced old thresholds with the 2025 $1,350/$2,700 rules, routed lines 9/10/12/15, added an `IRS8814` MeF serializer and PDF descriptor, linked elected dependent income to Form 8962 Worksheet 1-2 by SSN, routed line 12 less the Alaska PFD share to Form 8960 line 7, added combined-source Schedule B reporting, and routed child investment-income facts to Form 4952. These changes are untested under the requested build-first workflow. Explicit interest nominee, accrued-interest, ABP, and OID facts now generate a linked ChildTaxableInterestStmt per affected child, and dividend/capital-gain nominee amounts map to the IRS8814 attributes, and the child's private-activity-bond interest routes to the parent's Form 6251 line 2g; cases are written but unrun. The child's foreign-account/trust facts now trigger Schedule B Part III and its Form 8814 literals; explicit FBAR facts are still required. PDF dotted-line notes, PDF layout verification, parent-election business rules, and IRS acceptance remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Finish source-to-return and form-output coverage, then run the full batch including IRS XSD and business-rule cases.                                                                                    |
| GAP-4952       | Form 4952 source and child investment income | Build pass now exposes Form 4952 as a normal return input, calculates lines 1 through 8 from separate `other_` investment-property facts, affirmed 1099-INT/1099-DIV/1099-OID and partnership/S-corp/trust K-1 portfolio sources, and Form 8814 contributions. It routes line 8 to Schedule A and line 7 to carryforward, and maps the 2025 XML and PDF form lines. These changes are untested. The build pass also takes explicit AMT refigure facts, derives a separate AMT Form 4952 line 8 and carryforward, routes the signed difference to Form 6251 line 2c, and caps AMT line 4g separately. A positive line 4g election and its capital-gain attribution feed the regular and AMT Schedule D Tax Worksheets. These cases are written but unrun. Broker, non-portfolio, and broader AMT-basis source derivation, foreign-tax interactions, PDF layout, and business rules remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Finish source derivation and election tax treatment, then run the full batch including XSD and PDF checks.                                                                                              |
| GAP-4972       | Form 4972 lump-sum election                  | **Build pass, untested.** The previous code mistook Form 1099-R code 5 for a lump-sum election and sent its tax to Schedule 2 under a Form 4970 tag. The current pass removes that route, takes the explicit election's taxable box 2a and box 3 amounts, computes the 2025 Form 4972 tax schedule and Part III allowance/annuity/estate-tax lines, adds the tax to Form 1040 line 16, subtracts it on Form 6251 line 10, and emits native `IRS4972` fields plus the linked Form 1040 indicator. Eligibility facts and recipient identity are required for an elected form. A Part-II-only election now routes box 2a less box 3 to Form 1040 pension lines 5a/5b and AGI, while the Part III election keeps the distribution off those lines; source-to-return cases are written but unrun. Part-II-only death-benefit exclusions now use the IRS worksheet's capital/ordinary split, with unrun cases. Combined Part II/III elections now allocate federal estate tax between line 6 capital gain and line 18 ordinary income, with unrun cases. An explicit NUA inclusion election now splits Form 1099-R box 6 by the IRS worksheet ratio, feeds Part II and/or III and the Part-II-only 1040 ordinary amount, and writes NUA attributes on lines 6 and 8; those cases are unrun. Unelected NUA remains outside the taxable distribution. The PDF descriptor now maps calculated lines 6-30 to the actual 2025 AcroForm and retains only the filing page; it is written but not filled-render verified. Taxpayer/spouse recipient identity and Part I yes/no answers are projected from the return's inputs, with unrun cases. Questions 5a and 5b now have separate eligibility facts in the node, MeF, and PDF instead of hardcoding the beneficiary answer; printed NUA annotations and filled-render inspection remain open. Part-II-only estate-tax reporting, multiple participant/recipient forms, alternate payees, exact rounding, and IRS business-rule verification remain open. | Finish all supported election/recipient paths and required form lines, then run the full test batch, local XSD, and IRS business rules.                                                                 |
| GAP-MAP        | Simple field-mapping documents               | Several registered forms have sparse field-map builders. Their registration is not evidence of complete calculations or required IRS detail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Audit each against form instructions and XSD, then add source-to-XML and negative tests.                                                                                                                |
| OUT-NR-SS-4868 | Other ATS return families                    | Standalone 1040-NR, 1040-SS, and 4868 exporters are outside the user-agreed Form 1040 scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | No gate on this board; retain the source inventory separately and do not imply those returns are supported.                                                                                             |
| GAP-ATS        | IRS acceptance                               | No ATS transmission or acknowledgment has been recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Authorized ATS credentials, complete package, accepted test transmissions, and archived acknowledgments.                                                                                                |

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

### GAP-8621: PFIC and QEF reporting

**Build pass, untested; whole-form gap remains.** The flat 37% estimate and
Schedule 2 line 17z tax route have been removed. Section 1291 distribution
blocks now take prior-year distributions for the same shares, apply the 125%
per-share threshold, and apportion annual excess across actual 2025 distribution
dates. Each event's holding-period allocation is derived from actual days,
including leap years and cent balancing. Prior PFIC-year tax uses each year's
[IRS-published highest rate](https://www.irs.gov/instructions/i8621), apply
per-year foreign-tax-credit limits, and send Form 8621 line 16e to Form 1040
line 16 with `1291TAX`. Supplied section 6621 interest goes to Schedule 2 line
17p; current/pre-PFIC income goes to Schedule 1. QEF net capital gain now routes
to Schedule D, and mark-to-market loss is limited by unreversed prior
inclusions. QEF section 951/1293(g) reductions are separate source facts. The
section 301 taxable part of nonexcess distributions routes to Schedule B and
Form 8960 as a separate sourced fact. Native `IRS8621` and a holding-period
statement builder are registered; calculation and source-to-XSD cases are
written but unrun. The engine still needs foreign-currency distribution
conversion, mixed lots and disposition basis reconciliation, historical interest
computation, complete QEF/MTM elections and supporting facts, PDF verification,
XSD/business-rule evidence, and ATS acceptance.

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
those facts affect a positive line 5; these still stop explicitly. Parent and
child eligibility proof, dependent earned-income source derivation beyond the
stated amount, exact Tax Table behavior, visual PDF verification, and IRS
business rules remain open. Do not treat the ordinary slice as whole-form
support.

## Registered Form 1040 MeF documents to audit

Build-pass addendum for GAP-6251 (unrun): line 10 now receives the Form 4972
subtraction, Form 8962's Schedule 2 line 1a amount as part of line 1z, Schedule
3 line 1 foreign tax credit, and the negative Form 8978 adjustment. Schedule J
refigure and other Schedule 2 line 1z sources remain open.

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
