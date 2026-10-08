# TY2025 Form 8606 coverage gap

Status: current registered retained-owner routes include historical Roth
basis/consumption, owner-separated current payments, current2025 traditional
IRA-to-Roth conversions, annual traditional contributions/withdrawals, and
reviewed SIMPLE first-employer-deposit source joins. The legacy scalar worksheet
routes have narrower boundaries. The broad Form8606 parent, unsupported source
histories, external issuer/prior-acceptance authentication and IRS business
rules/acceptance remain open.

The early single-owner/authored-unrun sections below are historical. They are
superseded only for the specific routes and evidence in
[Form4852 source proof](../../wages/form4852/ty2025-form4852-filing-gap.md) and the current October7
observation below. Registration or a passing test alone does not establish
whole-form filing readiness.

## Structural mismatch

The checked-in TY2025 v5.4 `IRS8606.xsd` requires `Form8606IRANamelineTxt` and
`NondedIRATxpyrWithIRASSN` before any line amounts. Its Part I line 1 is
`NondedIRACurrTYNondedContriAmt`, line 14 is `NondedIRATotalIRABasisAmt`, Part
II line 18 is `TaxableIRAConversionAmt`, and Part III line 25c is
`TaxableIRADistributionAmt`. The eight former flat tags were removed from
`forms/f1040/2025/mef/forms/income/retirement/f8606.ts`. The new descriptor emits the required
owner name and SSN first, then native Part I lines 1, 2, 3, and 14 in XSD order
for its supported slice.

The [2025 Form 8606 instructions](https://www.irs.gov/instructions/i8606)
require a joint filer to put only the IRA owner's name and SSN on that spouse's
Form 8606 and to file separate forms when both spouses must file. The reviewed
Form 1099-R route now uses its T/S owner designation, filed prior Form 8606 and
year-end statement SSNs, and the return's spouse identity to select one owner.
The current retained-owner `owner_forms` path prepares separate source-reconciled
copies for inventoried taxpayer/spouse owners. The earlier scalar worksheet
branch does not establish that wider support by itself.

## Historical calculation and output boundaries

1. The node now self-emits explicit IRA owner and no-activity attestations,
   source traditional/Roth distribution and conversion amounts, and its
   calculated Part I print lines. The MeF descriptor rejects missing owner,
   joint/spouse ambiguity, any IRA distribution or conversion, absent 2024
   line-14 basis documentation, and inconsistent line arithmetic. The source and
   XML path permits positive 2025 nondeductible taxpayer contributions with
   positive prior basis and no IRA activity. A second bounded path permits a
   filed 2024 Form 8606 line 14 of zero, with a 2025 traditional-IRA Form 5498
   box 1 matching the current contribution. The zero-basis path requires the
   same owner SSN on both source records and the final filer, distinct document
   references, no returned/SEP/SIMPLE employer contributions, no rollover, one
   W-2 with plan coverage, worksheet MAGI equal to the final Form 1040 AGI and
   W-2 wages, no IRA distribution or conversion, and no Schedule 1 IRA
   deduction. Its line 1, line 2, line 3, and line 14 pass through the
   calculation, native XML, and PDF projection. The PDF replays the same
   final-source gate. A full-return positive fixture and source/return tamper
   cases are authored but unrun. The same zero-opening-basis source shape now
   supports one spouse-owned no-activity contribution on a joint return when the
   issued Form 5498, filed 2024 Form 8606, and sole plan-covered W-2 identify
   the spouse. The worksheet explicitly confirms that the taxpayer does not need
   a separate Form 8606. Native and PDF output print the spouse's name and SSN,
   while the joint return's AGI and IRA lines are reconciled. Positive and
   separate-form, owner, source, wage, and return tamper fixtures are authored
   but unrun. Spouse prior-basis no-activity contributions, dual-owner Forms
   8606, multiple W-2 sources, and source-byte authentication remain open.
2. One taxpayer-owned, single-Form-1099-R traditional IRA distribution with
   positive prior basis now requires a reviewed filed 2024 Form 8606 line 14, a
   distinct 2025 year-end statement covering all traditional IRA balances, and
   explicit confirmations of no current contribution, other distribution,
   conversion, rollover, QCD, HSA transfer, or disaster amount. It computes and
   prints all Part I lines 1–15c, including a three-decimal basis ratio, and
   replays the 1099-R, source owners, Form 1040 lines 4a/4b, native XML, and
   two-page PDF. A second bounded variant adds one 2025 Form 5498 box 1
   nondeductible contribution, a distinct custodian receipt naming its 2025
   tax-year designation and actual receipt date, and an IRA deduction worksheet
   matched to one plan-covered W-2 and the finalized AGI. Its Form 5498,
   receipt, 1099-R, year-end statement, and filed prior Form 8606 references
   must be distinct and their owner/custodian facts agree. For a receipt dated
   January 1 through April 15, 2026, all of line 1 also prints on line 4 and is
   excluded from line 5's 2025 distribution basis; for a 2025 receipt, line 4 is
   zero and line 5 includes it. Lines 1–15c, remaining line 14 basis, Form 1040
   lines 4a/4b, native XML, and PDF replay both timings. This follows the
   [2025 Form 8606 and instructions](https://www.irs.gov/instructions/i8606) and
   [2025 Form 5498](https://www.irs.gov/pub/irs-prior/f5498--2025.pdf).
   Full-return and source/timing/return tamper fixtures are authored but unrun.
   A spouse-owned variant now accepts one Form 1099-R distribution on a joint
   return with positive prior basis, no current nondeductible contribution, and
   the same prior Form 8606/year-end/return amount checks. Its native and PDF
   Form 8606 use the spouse's name and SSN; the Form 1040 4a/4b amounts remain
   return totals. Source, printed line, and owner tamper fixtures are authored
   but unrun. Current-year rollover/repayment, qualified-disaster,
   first-time-homebuyer, other contribution or distribution sources, and
   mixed/multiple IRA sources remain open. A spouse-owned variant now also
   accepts one 2025 nondeductible traditional IRA contribution with that
   spouse's prior basis and one traditional IRA payment on a joint return. The
   issued 2025 Form 5498, designated-year custodian receipt, filed 2024 Form
   8606, year-end all-IRA statement, W-2, and Form 1099-R recipient SSN must
   identify the spouse; the 1099-R must also be marked spouse-owned. The
   receipt, 5498, prior return, year-end statement, and 1099-R references are
   distinct. A 2025 receipt enters distribution basis immediately; a January
   1–April 15, 2026 receipt prints on line 4 and remains in line 14 rather than
   reducing the 2025 taxable distribution. Both timings reconcile Form 8606 Part
   I and spouse native/PDF identity with joint Form 1040 lines 4a/4b. Positive
   and owner, source, receipt-date, worksheet, return, and printed-line tamper
   fixtures are authored for the deferred gate. The
   [2025 instructions](https://www.irs.gov/instructions/i8606) require separate
   owner forms on joint returns and line 4 for contributions made after 2025;
   [Form 5498](https://www.irs.gov/pub/irs-prior/f5498--2025.pdf) box 1 includes
   2025 designated contributions received through April 15, 2026. Additional
   custodians, contributions, distributions, and source-byte authentication
   remain open.
3. One first-year taxpayer Roth IRA route requires an opening statement
   confirming all Roth IRAs and no prior Roth activity, an issued 2025 Form 5498
   with positive box 10 and zero boxes 2/3, a separate dated contribution
   receipt, and one later code J Form 1099-R with taxable amount undetermined.
   The contribution precedes the distribution. Conversion, plan rollover,
   homebuyer, disaster, repayment, QCD, HSA transfer, and other Roth
   distribution cases are excluded. Form 8606 Part III prints lines 19–25c,
   deducting contribution basis before calculating taxable earnings. The taxable
   earnings reach Form 1040 line 4b and Form 5329's early distribution line;
   gross reaches Form 1040 line 4a. Native and PDF export replay the source,
   owner, printed lines, Form 1040, and Form 5329. The same first-year source
   shape now supports one spouse-owned code J payment on a joint return when the
   spouse owns the opening statement, Form 5498, contribution receipt, issued
   Form 1099-R, and sole Form 5329 early-distribution entry. The native and PDF
   Form 8606 print the spouse's name and SSN; the return's IRA totals remain
   joint. The issued Form 1099-R recipient SSN is now required to match the
   reviewed Roth owner's SSN for both taxpayer and spouse routes; the native
   and PDF replay rejects changed or missing recipients. The focused taxpayer
   and spouse tests passed on 2026-10-05, including a source mismatch and
   export tamper cases. The generic Part III calculation remains unsupported for
   export because it does not model qualifying distributions,
   first-time-homebuyer expense, prior contribution or conversion basis, and
   taxable earnings ordering.
4. Focused node and serializer tests now cover source-to-print routing, native
   owner and line tags, and unsupported shapes, but were not run. The shared
   `builder.test.ts` rejects aggregate-only Form 8606 data and contains an
   absent-form check; there is no flat-payload fallback.

## Smallest safe rebuild boundary

The bounded routes above are written, not yet verified. The IRS form explicitly
says that with no traditional IRA distribution or Roth conversion, line 3
carries to line 14 and the intervening Part I lines are skipped. Broader
distribution, conversion, other Roth, other zero-prior-basis fact patterns, and
other married/spouse paths must wait for source-specific rules and
owner-separated documents. Reconcile the shared builder fixtures, then run the
agreed full batch, TY2025 XSD check, PDF inspection, and IRS business-rule/ATS
gates. The current Form 5498 and prior-return facts are reviewed fields, not
authenticated source bytes; copy authentication and additional
custodians/contributions remain open.


## October6 retained Roth activity evidence

The current Form4852 extension proves nine regular-contribution J/T public
returns, with actual retained owner/account/Form5498/receipt/payment bytes and
source-derived basis/five-year/age treatment. Its checked18-module gate is
206/0; all nine full2025v5.4XSD packets/52 pages have exact held replay and
visual review. See `ty2025-form4852-filing-gap.md` for authoritative commands,
digests and expected source/filed amounts; earlier authored/unrun descriptions
above are historical and do not describe this new proof. The source record
admits neither scalar opening basis nor unreviewed historical conversions or
consumed-basis claims. One actual current owner payment is proven; simultaneous
owner/current-payment aggregation and conversion/prior-history source gates
remain open, as do external authentication and IRS acceptance.


## October6 complete current inventory and historical conversion extension

The retained Form4852 source proof now includes owner-wide multiple current
payments/accounts and separate taxpayer/spouse8606 copies (6 packets57 pages),
and historical conversion FIFO/recapture with actual retained prior-filed
PartII PDF joins (8 packets79 current pages plus34 historical pages). See
`ty2025-form4852-filing-gap.md` for authoritative source amounts, terminal
commands, digests, prior179-page preservation and remaining consumed-history
contracts. Earlier one-payment-only descriptions are historical. Prior source
authentication and broader existing8606 parent remain open.


## October6 retained historical consumption source proof

The existing consumed-basis gap now has actual annual filed8606 PartIII and
applicable5329 PDF records joined to complete owner/account prior custodian
payments and issued1099R records. Owner-wide remaining regular basis and
conversion FIFO pools derive from filed prior worksheets and later actual
5498/receipt sources; opening-basis scalars are not accepted. Same annual
conversion/distribution requires one actual filed8606 PDF with PartsII/III
independently parsed. Earlier2020–2024 layouts are verified, including5329
field-name revisions and2024 page count.

Twelve public whole returns pass checked2/0, related25-module264/0 and exact
held12/107 full2025v5.4XSD/source/XML/PDF replay. All107 current plus91 retained
historical pages were visually reviewed; old33/258 artifacts are unchanged
and replay exactly. Rehashed prior basis/recapture mutations update both actual
bindings and assert parsed-facts rejection. See
`ty2025-form4852-filing-gap.md` for authoritative logs, commands, digests,
independent filed amounts and the separately repaired inherited line18 negative.
Historical copies do not become current native/calculation copies.

Current2025 conversions, prior revisions before2020, qualified historical
distributions and other unsupported source histories remain guarded; external
authentication and IRS acceptance remain open. This checkpoint supersedes
earlier descriptions that prior consumed basis was wholly unimplemented, and
does not close the broader existing parent.


Current-main7a75f732f verified source2/0+related264/0 and held12/107 exact with696artifactfiles preserved, prior33/258 unchanged/exact. Exact logs and limitations are archived in the October6 status/validation record.

## Ordinary Roth classification prerequisite

Ordinary J/T source and prior issued records now require the correct unmarked
IRA/SEP/SIMPLE classification, supported by actual retained non-SEP/SIMPLE
account records. Code J/T/Q income classification remains IRA line4 independent
of that mark. Wrong marked ordinary current/historical copies reject at source
and final native/PDF boundaries. Earlier checked ordinary source claims are
qualified; originals remain unchanged. Corrected35/295 full-source/XSD/held
packets pass11/0 and related274/0; all295 current plus271 retained pages have
proven visual transfer. See `ty2025-form4852-filing-gap.md` for exact commands,
logs/digests, original997-byte preservation and the separate applicable
traditional/SEP/SIMPLE Form4852 margin-label limitation. Current conversions,
external authenticity/acceptance and broader existing parent remain open.

## October7: current boundary and available SIMPLE packet verified

Current code has a retained `current_conversion` source contract and annual
traditional-IRA activity, including distinct SIMPLE employer/plan/account
records, deposit ledgers and owner forms. The native and PDF builders replay
the retained owner reconciliation. Unsupported negative PartII line18 filing
representation remains rejected; no new route or guard change was made here.

The available root-generated `simple-current` packet has the exact documented
original PDF SHA256
`135a844da31c1c0e54090f03216a294c0704cbe6be7cf3bc6cfaceb1888b0de7`.
All43 retained source hashes verify and were snapshotted separately. The
retained SIMPLE plan/deposit/debit/receipt records join the same owner and
account: first employer deposit April10,2023, distribution April10,2025 and
Roth receipt April11,2025 for2,000. They are synthetic reviewed records, not
issuer authentication or IRS filing proof.

The nine-page packet passes the current local full Return1040v5.4 XSD, exit0;
all nine rendered pages were freshly reviewed. The two Form4852 copies print
11,500 and2,000 gross, with IRA/SIMPLE margin labels. A separate native1099R
adds4,000 gross, so the three source copies total17,500 and withholding1,100.
Form8606 PartI lines1–14 are2,000/3,000/5,000/1,000/4,000/10,000/5,500/12,000/
27,500/.145/1,740/798/2,538/2,462. Decimal arithmetic verifies allocation and
rounding. Line15c4,702 plus PartII line18 10,260 equals Form1040 taxable IRA
14,962. Form5329 early tax470 joins Schedule2 and Form1040; total tax23,128,
payments21,100 and amount owed2,028. PartIII stays blank. Identity and all nine
page origins agree.

The retained prior full typed regression log independently confirms both
SIMPLE source-positive and source-conflict tests passed. Its digest matches
the terminal exit0 status; all31 Form8606 runtime paths still match that tested
snapshot. The new full regression remains running and is not counted passed.
Private independent observation SHA256
`1afb148eddf7fc5ccbfc81d698d80d79bbb15b6f459587d32dc7ce06fe70520f`, under
`.state/research/board-execution-2026-10-07/form8606-current-boundary-review-20261007/`,
retains copied XML/PDF/origins,43 source files, image hashes and exact prior
terminal check lines. Initial snapshot validation needed paths resolved relative
to its source directory; independent arithmetic uses Decimal to avoid binary
half-dollar error. Both were corrected before the successful checks.

Two documented historical `/tmp` proof directories are absent. The original
13/116 current-conversion proof index and original temporary logs therefore
were not reverified here. The available root packet/hash proof above does not
reconstruct that larger historical evidence set. Locating the originals is
recorded in future_todo only; no recovery work was performed. Existing broader
parent requirements remain unchecked, with aggregate approval counts unchanged.


## October8 registered-audit reconciliation

The registered-document row's old taxpayer-only/authored-unrun description is superseded for the current retained-owner routes. Actual native and PDF Form8606 descriptors both replay owner inventories against the finalized source graph; scalar no-activity/prior-basis routes retain narrower source contracts. Current reviewed Roth histories/payments, conversions, annual traditional contributions/distributions and SIMPLE source requirements are described in the existing evidence above. Unsupported negative PartII line18 native representation remains guarded.

Private `form8606-registered-audit-reconciliation-20261008-v1/review.json` records an independent12:29:40.287357UTC audit of the actually terminal October8 full run: exit0 at12:15:13.661328UTC, **12,722/0**, logSHA `c0dfca4bfba21c9600217a24cd7cfa02f972aaf01b64f7f879a4f6fe1c32ae3f`. It extracts **48 passed/0 failed/0 ignored across12 named Form8606 modules**, checking every declared test has an actual passing result, and verifies all **31 matching runtime paths** still equal that tested snapshot. This is retained full-run evidence, not48 newly executed tests or an exhaustive count of every cross-form Form8606 case.

Selected modules cover annual traditional activity, taxpayer/spouse current-contribution timing, prior-basis distributions, first-year Roth distributions, zero-opening-basis source/owner joins, SIMPLE source clock/conflicts, native fields and node arithmetic. The retained test names/results identify the scope; a passing negative or unit test is not a positive whole-form route. Actual imports independently confirm152native/148keys and118PDF/115keys, with one descriptor per Form8606 exporter. No new PDF was generated or visually reviewed; the prior available nine-page SIMPLE packet retains its scoped evidence. Missing historical proof locations remain in future_todo and were not recovered. Source authenticity, prior acceptance, broader original parent and IRS gates remain open.
