# TY2025 Form 8995 positive export boundary

## Multiple reviewed Schedule C businesses (locally validated October 6, 2026)

The simplified Form 8995 route now supports two or more separately identified
Schedule C businesses for one single taxpayer below the threshold. Profitable
businesses, current losses, below-threshold SSTBs, and a current combined net
loss are included. Each retained Schedule C carries a supplied SE allocation
review with its method, amount, workpaper reference, reviewer/date, reasonable
business-facts confirmation, consistency/books confirmation, all-businesses
confirmation, and no aggregation. No review or source authentication is invented.

[Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) require
combined business earnings, with losses reducing positive profits, on one
Schedule SE. The source join recalculates that SE tax using retained personal
W-2 Social Security wages, checks Schedule 1's half-SE deduction, and checks
Form 7206's retained business/SE records. Its reviewed allocation method divides
the combined deductible SE tax among positive Schedule C profits in proportion
to those profits, retaining cents and assigning the cent residual to the largest
positive business (source order breaks ties). Loss businesses get zero of that
shared deduction. This is an explicitly reviewed method, not an IRS-mandated
formula: [26 CFR 1.199A-3(b)(5)](https://www.ecfr.gov/current/title-26/section-1.199A-3)
requires a reasonable method reflecting the facts, consistent application, and
agreement with the books. Authenticating those conclusions remains open.

Raw profit, allocated deduction, and adjusted QBI remain in the source rows.
Only the entered Form 8995 row is rounded. Line 2 combines all entered signed
rows; line 4 is clamped to zero; a current net loss appears on line 16 even when
line 15 is zero. Native XML emits every identified business group; PDF prints
rows 1i–1v and appends a paginated statement with every remaining business name,
EIN/owner SSN, and signed QBI amount. The
[Form 8995 instructions](https://www.irs.gov/instructions/i8995) require the
additional-business statement beyond five rows and current net-loss carryforward.
A zero deduction no longer discards this sourced multi-business loss form.
Both exports reject missing or changed business, review, payroll, shared SE,
Schedule 1, prepared row, and final Form 1040 amounts.

| Local full-return fixture | Raw Schedule C total | Half-SE deduction | Entered Form 8995 line 2 | Line 15 | Line 16 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Two profitable businesses with cents | 100,000.98 | 7,065 | 92,936 | 15,437 | 0 |
| Three businesses including a loss, with W-2 | 85,000.50 | 6,005 | 78,996 | 15,799 | 0 |
| Six businesses including overflow loss | 76,000 | 5,369 | 70,631 | 10,976 | 0 |
| Two businesses with combined net loss, with W-2 | -10,000.01 | 0 | -10,001 | 0 | 10,001 |

The last fixture retains +10,000.49 and -20,000.50 raw business profits. Its
Schedule C loss and Form 8995 loss row both enter -20,001, using signed rounding
at the half-dollar boundary. The other QBI row is +10,000, giving Form 8995
line 2 -10,001 and line 16 10,001. Schedule 1 combines the raw profits first,
then enters -10,000; Form 1040 line 8 is -10,000, lines 9/11a are 40,000 after
50,000 wages, line 13a is zero, and line 15 is 24,250. The exact raw graph
income/AGI is 39,999.99, and taxable income is 24,249.99. This source-to-total
rounding is intentional: the [IRS rounding instructions](https://www.irs.gov/instructions/i1040gi)
require cents to be retained while adding amounts for a line, then rounding its
total. Separately rounded business rows can therefore differ by $1 from the
rounded raw Schedule 1 total. Native assertions and filled-PDF review record
both representations. IRS business rules/ATS may impose further equations;
acceptance remains an explicit gate. Other generic negative half-dollar export
boundaries remain in the existing return-wide rounding audit scope.

A fifth full native return verifies the W-2 wage-base interaction: 150,000
combined profits and 50,000 Social Security wages produce 19,653 SE tax and a
9,827 deduction, allocated 5,896.20/3,930.80. Entered QBI rows are 84,104/56,069,
line 2 is 140,173, and line 15 is 28,035.

Validation passed 221 existing focused regressions and 32 final tests including
the four new multi-business cases and Schedule C exporters. All five native
full returns passed the complete local TY2025 v5.4 Return1040 XSD. Seventeen
tamper variants rejected both native/PDF export. The continuation pagination
case retains all 41 additional businesses across three pages. Four filled
packets (13, 16, 22, and 10 pages) were rendered with real Poppler; the Form 8995
rows/totals, overflow statement, and net-loss Schedule C/Schedule 1/1040 pages
were visually reviewed. Local artifacts, each with `return.xml` and
`filled-return.pdf`, are under
`.state/research/ty2025-filled-pdf-review/2026-10-06-form8995-multiple/` in
`profitable-cents`, `mixed-loss`, `overflow`, and `net-loss`.

Remaining scope includes other filing statuses or spouse/community/QJV
ownership, other reasonable allocation methods, attributable health/retirement
adjustments, prior or suspended losses, at-risk/passive limits, aggregation,
farms/pass-throughs, REIT/PTP/capital-gain combinations, multi-business WOTC, and
Form 8995-A coexistence. The current net-loss fixture supplies the existing
Form 461 scope review and has no excess-business-loss adjustment. Imported
future-year carryover provenance and a durable carryover ledger are not added.
Workpaper/document byte authentication, IRS business rules, and ATS remain open.
The older narrow route notes below describe their historical boundaries.

## One Schedule C with certified WOTC wages (validated October 6, 2026)

The existing single-business Form 8995 route now accepts one nonpassive Form
5884 employer credit allocated entirely to that retained Schedule C. Export
recalculates Form 5884 from the certified employee and payroll records,
requires its sole Schedule C deduction allocation and Form 3800 source credit
to agree, and recomputes QBI from net profit after the full line 2 reduction.
Both native MeF and PDF use this same source reconciliation. The existing graph
already applies the reduction to Schedule C, Schedule SE, and QBI; this change
allows the correctly sourced calculation to file through Form 8995.

[Form 5884 line 2 instructions](https://www.irs.gov/instructions/i5884)
require the wage deduction reduction even when the taxpayer cannot use the
entire credit this year. [Schedule C line 26 instructions](https://www.irs.gov/instructions/i1040sc)
explicitly require wages less the Work Opportunity Credit. Accordingly, a
$6,000 payroll and $2,400 credit produce a $3,600 wage deduction. The positive
full-return fixture has $66,400 Schedule C profit, $62,033 QBI after the half-SE
deduction, $12,407 QBI deduction, and $2,400 allowed Form 3800 credit. A
$25,000 receipts case preserves the entire $2,400 wage reduction while the
$828 QBI deduction lowers income tax to $333 and limits current-year credit
to $333. A zero-income-tax case also preserves the full wage reduction and
uses none of the credit; it omits the zero-deduction Form 8995.

The focused regression set passes 31 tests. All three WOTC return shapes pass
the full local TY2025 v5.4 Return1040 XSD. The positive case generates a filled
23-page PDF; rendered Schedule C, Form 5884, Form 8995, and Form 1040 pages
show the reconciled values. Employee-hours, wage-allocation, and Form 3800
source-credit tampering reject both Form 8995 projections.

This remains a synthetic source-backed route. It does not authenticate SWA or
payroll documents, prove IRS acceptance, or emit a new unused-credit carryover
ledger. Form 8995-A, multiple Schedule C businesses, multiple deduction
locations, mixed pass-through credit, and passive activity credit coexistence
remain outside this extension.

## REIT-only two or three issued payers (implementation authored; bulk validation pending)

The positive Form 8995 route without trade or business QBI now accepts up to
three separately identified Forms 1099-DIV with positive box 5 section 199A
dividends, totaling at most $1,500. Each box 5 equals its box 1a, and the
existing retained-source guard checks unique payer, document, and holding
review references, the 91-day holding facts, and absence of other dividend
components. The node sums the sources on lines 6/8, calculates line 9 and the
taxable-income limit, and both MeF and PDF reconcile those lines to the issued
copies and Form 1040 lines 3b/13. A three-payer positive graph/native/PDF case
and payer, holding, source, fourth-payer, and return tamper cases are authored
but unrun for the requested bulk validation. Trade or business combinations
beyond the existing bounded route, aggregate dividends over $1,500, issued
copy authentication, filled PDF, local XSD, and IRS acceptance remain open.

Status: tightly bounded, positive one-business Schedule C, one-farm Schedule
F, and one-issuer REIT-dividend-only routes are implemented for Form 8995 MeF
and PDF. Other positive shapes still
fail explicitly. This is not complete Form 8995 coverage and is not an approved
product exclusion.

The [IRS TY2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
require each trade or business on line 1, the qualified business income or loss
per row, the prior QBI loss and REIT/PTP loss carryforwards, the current
REIT/PTP component, and the taxable-income limit. Line 12 is net capital gain
**increased by qualified dividends**. Line 15 must reconcile to Form 1040
line 13. The checked-in TY2025 v5.4 `Shared/IRS8995/IRS8995.xsd` orders
`QualifiedBusinessIncomeDedGrp` rows before lines 2-17 and requires line 15. The
group has `minOccurs="0"`, so an aggregate-only XML fragment can be
syntactically accepted by the schema while still failing to represent a complete
claimed calculation. Schema permissiveness is not source proof.

The general-input node now derives 2025 age-65 status from a valid birth date
once and sends that result to Form 8995 as well as Form 1040 and the standard
deduction worksheet. A synthetic single-filer calculation with $26,000 of
ordinary dividends and $15,000 of section 199A dividends passes the full
graph: the $17,750 age-adjusted standard deduction limits Form 8995 line 15
and Form 1040 line 13 to $1,650, and taxable income is $600 after the separate
$6,000 senior deduction. This is a calculation regression; that high-value
dividend-only shape remains outside the bounded filing route below.

## Implemented REIT-dividend-only route

One issued, nonnominee 1099-DIV copy with box 1a equal to positive box 5 of at
most $1,500 can now support a Form 8995 claim with no trade or business QBI.
The copy needs payer and document identity plus a retained 91-day holding
review showing more than 45 qualifying held days, excluded diminished-risk
days, and no related-payment obligation. The return explicitly confirms no
prior or suspended QBI loss and no specified-cooperative patronage. The
calculation records zero lines 1–5, box 5 on lines 6/8, 20% on line 9, and
the taxable-income limit on lines 11–15. Native MeF omits the optional
business group and emits the complete numbered lines; the PDF leaves its
business row blank. Both replay the issued copy and final Form 1040 lines
3a/3b/13. A $1,000 positive full-return case and issued-copy, holding,
source-graph, prepared-line, and final-return tamper cases are authored for
deferred validation. Multiple issuers, qualified dividends, Schedule B
amounts, prior REIT/PTP losses, and issued-copy byte authentication remain
open. The [2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
put qualified REIT dividends on line 6 and calculate the 20% component
separately from trade or business QBI.

## Implemented one-business route

The one-Schedule-C route also combines exactly two distinct issued 1099-DIV
copies: one with positive qualified dividends and one with reviewed section
199A REIT dividends. Their combined ordinary dividends must be at most $1,500,
so this bounded case does not require Schedule B. The REIT copy retains its
91-day holding and related-payment review, while the qualified copy has no
other dividend components. Native and PDF export replay both source copies,
require distinct payer and document identities, and reconcile the REIT amount
on Form 8995 lines 6/8/9, qualified dividends on line 12, Form 1040 lines
3a/3b, and the final QBI deduction. A $700 ordinary/$500 qualified copy plus
a separate $600 ordinary/$600 box 5 copy has authored positive and source,
identity, holding-review, extra-copy, and return-tamper fixtures. These fixtures
are unrun. This follows the
[2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995) for
the separate REIT component and line 12's qualified-dividend increase to net
capital gain. Larger totals, Schedule B, other dividend boxes, capital gains,
and issued-copy byte authentication remain open.

One bounded extension combines that single sourced Schedule C business with
one identified Form 1099-DIV whose whole box 1a ordinary-dividend amount is
box 5 section 199A dividends. A separate reviewed record names the
ex-dividend date, more than 45 qualified held days in its 91-day window,
excluded diminished-risk days, and absence of a related-payment obligation.
The issued copy must have no nominee status, no qualified dividend, capital-gain distribution,
foreign amount or other dividend box, and no separate Schedule B trigger.
Form 8995 lines 6/8 carry the box 5 amount, line 9 its rounded 20% component,
and line 10 includes the business and REIT components. The exporter compares
that record with Form 1040 line 3b, the final line 13 deduction, and every
printed Form 8995 line; the PDF invokes the same source check. An executor
positive case and amount, 91-day holding, related-payment, source-reference, qualified-dividend,
return and prepared-line tamper fixtures are authored but unrun. More than three
REIT issuers, qualified dividends, capital gains, prior REIT/PTP losses,
PTP income, and issued-document byte authentication remain open. This follows
the [2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
for the separate qualified-REIT component and taxable-income limit.

The same one-business route now accepts exactly two separately identified
Form 1099-DIV issuers when each issued copy has only box 5 ordinary dividends,
each has a distinct 91-day holding and related-payment review, and their
combined box 1a/box 5 amount is no more than $1,500, so no Schedule B is
required. The calculation retains each issuer's amount, source reference, and
holding review. Native and PDF export require distinct payer names, document
references, and review references and replay those retained facts against each
issued copy; they sum both issued amounts into Form 8995
lines 6/8/9, reconcile Form 1040 lines 3b/13, and replay every printed line.
A full-return positive and changed-source, duplicate-identity, insufficient-
holding, and changed-return fixtures are authored for the deferred validation
pass. More than three issuers, Schedule B amounts, other dividend boxes, and
issued-document byte authentication remain open.

The one-Schedule-C route now also accepts exactly three distinct issued
Form 1099-DIV copies when each has box 1a equal to positive box 5 section
199A dividends and the combined ordinary dividends are at most $1,500. Each
copy needs its own payer name, source reference, and 91-day holding-review
reference; native and PDF export replay those identities and the full amounts
against retained sources, Form 8995 lines 6–10, and Form 1040 lines 3b/13.
An authored $350/$450/$500 positive case and amount, duplicate identity,
holding, fourth-copy, return, and prepared-line tamper cases await the bulk
gate. A simultaneous qualified-dividend issuer remains bounded to one REIT
issuer; Schedule B amounts, additional boxes, and source-byte authentication
remain open. The [2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
allow qualified REIT dividends in the line 6 aggregate; the
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
require Schedule B when ordinary dividends exceed $1,500.

The one-Schedule-C route also accepts one identified, nonnominee Form 1099-DIV
with positive box 1b qualified dividends not exceeding box 1a ordinary
dividends. Box 1a must be at most $1,500; capital-gain distributions, section
199A dividends, foreign tax, other dividend boxes, and any simultaneous REIT
component are outside this route. The calculation places box 1b on Form 8995
line 12, subtracts it from line 11 for line 13, and applies the 20% income
limit on line 14. The native and PDF guards replay the issued-copy amounts
against Form 1040 lines 3a/3b, Form 8995 lines 12-15, and Form 1040 line 13.
An authored positive case uses box 1a $1,000 and box 1b $600; changed source
amount, missing document reference, changed return, and changed prepared-line
cases are authored but unrun. This follows the
[2025 Form 8995 line 12 instructions](https://www.irs.gov/instructions/i8995).
Qualified dividends from multiple issuers, mixed REIT and qualified dividends,
Schedule B amounts, capital gains, and issued-copy byte authentication remain
open.

The Schedule C node now retains an identified business row for positive QBI, and
the Form 8995 node records lines 1-17 for one business. Export accepts the
record only when the business has a name, EIN, reference, positive net
profit, an explicit no-other-adjustments confirmation, and an explicit no-prior-
or-suspended-loss confirmation, plus confirmation that the filer is not a patron
of a specified cooperative. The source Schedule C must independently recalculate
to the business profit and match Schedule 1 line 3. The final Schedule 1 line 15
must match the sourced half of self-employment tax when Schedule SE applies;
that deduction reduces line 1 QBI. Lines 16-17 remain zero, so health insurance
or retirement-plan deductions cannot be silently allocated. Other QBI sources,
capital gain, and dividend combinations beyond the bounded routes above remain
closed. The
[corrected IRS TY2025 instructions](https://www.irs.gov/instructions/i8995)
define Form 8995 line 11 for 1040 filers as Form 1040 line 11a minus lines 12e
and 13b. The code checks the same equation using its internal `line11_agi`,
`line12c_deduction_total` (the filed line 12e total), and zero
`line13b_additional_deductions` keys. Form 8995 line 12 is qualified dividends
plus net capital gain; the qualified-dividend route checks its nonzero box 1b
amount, while the other bounded routes check line 12 as zero. Form 1040 line 13
must equal Form 8995 line 15. The native XML includes the required business
group and every line 2-17 in XSD order. The PDF maps the same business and lines
to the official TY2025 AcroForm fields.

The bounded calculation rounds each printed 20% component to whole dollars and
routes the resulting line 15 amount exactly to Form 1040; export rejects even a
fractional mismatch. It also rejects original Schedule F/E, K-1, Form 1099-DIV,
Schedule D and retirement-plan sources, plus any Form 7206 claim beyond its
retained Schedule C and Schedule SE source records, even if their deposits were
omitted from Form 8995 pending data.

Schedule C may supply dollars and cents. The direct one-business Form 8995
route keeps the exact Schedule C profit through Schedule 1 and its identified
QBI source row, subtracts the attributable half-SE-tax or supported health
deduction with cents intact, then rounds the Form 8995 line 1 total to whole
dollars. The native and PDF guards replay that raw source and the filed
integer lines. Authored 49-cent/50-cent calculation boundaries and a full
Schedule C/native/PDF source-tamper fixture await the bulk pass. This follows
the [2025 Form 1040 rounding instructions](https://www.irs.gov/instructions/i1040gi):
retain cents while adding amounts for a line, then round the line total; use
the same whole-dollar policy across the return. Form 8995-A's separate
advanced business-row schema remains integer-only pending its own source and
rounding review.

These zero-source conditions are an explicit supported boundary, not inferred
zeros: export checks the final Schedule 1 and Form 1040 before producing a
document. The synthetic profitable Schedule C fixture exercises the ordinary
half-SE-tax route through calculation, native XML, and PDF projection.

## Two small Schedule C businesses (authored, unrun)

The bounded two-business route puts separately identified Schedule C profits
on Form 8995 rows 1i and 1ii, combines them on line 2, and carries the
computed line 15 deduction to Form 1040 line 13. It requires distinct
business references, names, and EINs; positive whole-dollar profit for each;
and combined profit below $400. The narrow bound avoids an attributable
Schedule SE deduction. One identified ordinary W-2 source provides taxable
income for the line 14 limit. Native XML emits two business groups, while the
PDF maps both printed rows. The exporter replays both Schedule C items, the
Schedule 1 and Form 7206 source records, the W-2, Form 8995 lines, and the
settled Form 1040. A full-return positive fixture and source, row, return,
and $400-boundary rejection fixtures are written but await the bulk test pass.
The [2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
require separate business rows and their line 2 total; the
[2025 Schedule SE instructions](https://www.irs.gov/instructions/i1040sse)
describe combined business earnings for the $400 filing test.

This route leaves larger or fractional two-business profits, owner splits,
other QBI sources, attributable health or retirement deductions, and
Form 8995-A combinations outside the supported boundary. The source and
calculated return are checked locally; external source authenticity remains
outside this route.

## Implemented one-farm route

One sourced Schedule F farm may now combine with one separately identified,
nonnominee Form 1099-DIV containing qualified dividends in box 1b no greater
than box 1a ordinary dividends, with box 1a at most $1,500. The farm source
and half-SE-tax deduction still reconcile to Schedule 1. The issued dividend
copy supplies Form 1040 lines 3a/3b and Form 8995 line 12, reducing the line
13 taxable-income limit; line 15 remains tied to Form 1040 line 13. Native and
PDF export replay the dividend copy, reject other dividend components and REIT
anchors, and compare the final return and every printed QBI line. A positive
$80,000 cash farm with $1,000 ordinary/$600 qualified dividends and source,
return, and printed-line tamper fixtures are authored but unrun. The
[2025 Form 8995 line 12 instructions](https://www.irs.gov/instructions/i8995)
require qualified dividends in the net-capital-gain limit. Multiple issuers,
Schedule B amounts, capital gains, REIT/PTP combinations, source-byte
authentication, and the full deferred validation batch remain open.

The Schedule F node now retains an identified farm row with the source Schedule
F item and its computed profit. A positive Form 8995 claim requires one farm ID,
farm name, a sourced line 1(b) TIN, material participation, and an explicit confirmation
that there are no other attributable QBI adjustments. The return must also
confirm no prior or suspended QBI loss and no patronage of a specified
cooperative. The exporter rechecks linked farm source amounts, recalculates the
farm profit including sourced WOTC wage reductions, and reconciles it to
Schedule 1 line 6. It ties the half-SE-tax
deduction to Schedule SE, Form 7206's retained Schedule SE calculation, and
Schedule 1 line 15. It checks Form 1040 taxable income and the line 13 QBI
deduction against every printed Form 8995 line. The route rejects other QBI
businesses, cooperative source records and Schedule F cooperative lines, the
farm optional SE method, capital gain, REIT/PTP amounts, and separately
attributable health insurance or
retirement deductions. Missing or conflicting facts stop MeF and PDF export.

A synthetic $80,000 cash-farm return passed graph execution, native full-return
TY2025 XSD validation, and Form 8995 MeF/PDF reconciliation. A separate
$80,000 accrual-farm case also passes graph execution, Form 8995 MeF/PDF
reconciliation, and full-return XSD validation with explicit zero inventory. The filled
nine-page PDF packet was generated; visual review of its Form 8995 page matched
the farm row ($74,348 QBI), line 15 ($11,720), and Form 1040 line 13a ($11,720).
Local review artifacts are in
`.state/research/review/ty2025-form8995-farm/` (ignored by Git). This is
synthetic coverage; it does not establish an ATS acceptance or the remaining
multi-farm and cooperative routes.
The reviewed Form 8995 PDF SHA-256 is
`ba84326e126840c6ba96286b8e1c323c25bbec65127258890840d23621c5100d`;
the nine-page packet SHA-256 is
`640c25a118d1d88494c481c135a003f21f010d18499e211f69a8934f6b173ad7`.

The [IRS 2025 Form 8995 instructions](https://www.irs.gov/instructions/i8995)
allow the owner SSN in line 1(b) when a sole proprietor has no EIN. The
single-filer farm route now carries the sourced taxpayer SSN through the
Form 8995 node. MeF emits the TY2025 `SSN` choice and the PDF prints that SSN in
the TIN column; the exporter rejects a missing or changed SSN and a joint
filing-status claim without an identified farm owner. The no-EIN synthetic
return passed graph, full-return XSD, and filled-PDF visual checks. Its review
artifacts are in `.state/research/review/ty2025-form8995-farm-ssn/`; the
Form 8995 PDF SHA-256 is
`c3e1764f0b91d9db34b8e992f5773857c2f69a1e01e9ddf673fad9515dec7983`,
and the nine-page packet SHA-256 is
`90d5b9d11aee66e6d09c5d5efff8b41f132c93b9966512a2c78bdef0066aa9d1`.

## Remaining gaps

- Multi-farm returns, joint-filer farms without owner identity, farms without a
  separate farm name, cooperative
  patrons, and returns with other attributable QBI deductions remain outside
  the bounded one-farm exporter. The accrual Schedule F source case with $12,100
  of profit still exercises a zero-claim return because its taxable income is
  below the single standard deduction; it does not verify positive accrual-farm
  QBI. Complete source-level allocation and multi-business Form 8995 rows before
  treating those claims as supported. The [2025 IRS Form 8995 instructions](https://www.irs.gov/instructions/i8995)
  include trade or business QBI, the taxable-income limit, and the specified
  cooperative routing decision. These remain live release gaps, not approved
  exclusions.
- Broader source-backed implementations must identify and independently
  reconcile each business name/TIN and QBI, allocate Schedule SE, self-employed
  health insurance and retirement deductions to the right business, prove prior
  losses, calculate REIT/PTP lines, derive line 11 and the line 12 qualified-
  dividend-adjusted gain from the finalized return, choose Form 8995 rather than
  8995-A under the 2025 threshold/patron rules, and join line 15 to Form 1040
  line 13. The PDF must print the same rows and lines.

The native descriptor returns no document for no-claim tracking fields or a zero
deduction. Positive claims outside the bounded route raise a
source-reconciliation error in both MeF and PDF. Malformed claimed amounts also
reject. Focused and graph-to-export cases pass for the two bounded sources.
The synthetic Schedule F filled PDF was visually reviewed and its full return
passed local XSD validation. ATS validation and the broader routes remain open.

The zero-deduction route now rejects a negative net REIT/PTP line 8 at the
calculation node instead of silently returning no pending form. Direct MeF and
PDF zero-deduction calls also reject an indicated unfiled line 16 or 17 loss,
or a negative net of current section 199A dividends and a prior REIT/PTP loss.
The [2025 IRS instructions](https://www.irs.gov/instructions/i8995) require a
negative line 8 amount to carry forward and line 17 to be carried to the next
year. A $3,000 current section 199A dividend less a $5,000 prior loss therefore
needs a $2,000 ending loss record; the current source and export contract does
not support that filing route. Focused node and direct native/PDF rejection
cases are written but unrun. Source-backed line 17 filing, prior-loss
provenance, and the wider zero-deduction audit remain open.

The same direct MeF/PDF zero-deduction guard now sums current Schedule C/F,
other QBI, and attributable deduction inputs with the prior QBI loss. A net
business loss cannot disappear without Form 8995 line 16 and a sourced
carryforward route. A prior loss fully absorbed by current positive QBI can
still leave a zero-deduction no-claim return when the income limit is zero.
This guard does not implement line 16 filing or prove prior-year loss history.
