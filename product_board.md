# TY2025 Form 1040 product board

## Full status summary (2026-10-02)

Merged [PR #56](https://github.com/filedcom/opentax/pull/56) provides the
TY2025 Form 1040 code checkpoint. This board contains **52 open TODOs and no
completed checkboxes**. The **893 completed bounded items** and their exact limits live in the
[completed ledger](docs/mef/ty2025-product-board-completed-2026-10-01.md);
the [September 30 checkpoint](docs/mef/ty2025-product-board-checkpoint-2026-09-30.md)
retains earlier evidence. A completed slice does not close a broader form,
coverage decision, or release gate.

**Current order of work.** Implement code and prepare evidence for the 32 open
TODOs outside **Named tax-form gaps** first, including core return paths,
native/PDF parity, validation preparation, and delivery prerequisites. The 20
named-form parent gaps remain on this board for the following implementation
phase. Cross-cutting scope, inventory, and release parents that require named
forms or external decisions remain open through that phase. Finish this
non-named implementation phase before the next agreed bulk test run; the prior
failed run is diagnostic evidence, not a release pass.

| Workstream | Open TODOs | Current state |
| --- | ---: | --- |
| Scope and completion rules | 3 | Filing boundaries and end-to-end acceptance rule need final review. |
| Coverage inventory and decisions | 8 | Form applicability, ownership, evidence standards, and unsupported-path decisions remain open. |
| Core return and source paths | 8 | Return-wide joins and source classification remain incomplete. |
| Reported CLI issues | 0 | All four issue #60 code slices are implemented; bulk validation is pending. |
| Named tax-form gaps | 20 | Many sourced form slices exist; the listed parent form paths remain open. |
| Native MeF and PDF parity | 3 | Registry, attachment, and printable-output parity remain open. |
| Automated and artifact validation | 5 | A 178-case filled-PDF plan with an XSD gate is prepared; the latest completed full command reached 10,432 passes and 99 failures. |
| IRS ATS and delivery | 5 | CLI v2.0.5 is published; artifact smoke and scenario assertions are prepared, while IRS ATS acceptance and a filing-ready release remain open. |

**Implemented coverage.** The completed ledger records 893 bounded routes and
prerequisites across income, deductions, credits, business and investment
activity, foreign tax, retirement, health coverage, and supporting documents.
Each entry names its supported source pattern, any return/native/PDF
reconciliation, authored fixtures, and remaining limits. The checklist below
contains only open parent work; a completed slice does not close its parent form.

**Merged checkpoint.** [PR #56](https://github.com/filedcom/opentax/pull/56)
was merged as `48f69237` on 2026-10-01. Its full local suite at `c0d45cb0`
passed 10,006/10,006 tests with no ignored cases; a separate TY2025 v5.4 XSD
batch passed 181/181. Those results apply to the merged checkpoint, not the
current PR. [CLI v2.0.5](https://github.com/filedcom/opentax/releases/tag/v2.0.5)
was published from that merge after platform builds, a 34/34 pre-merge smoke
suite, and a downloaded-binary smoke. It exports a return but does not transmit
one. The [September 30 checkpoint](docs/mef/ty2025-product-board-checkpoint-2026-09-30.md)
retains earlier evidence.

**Current implementation batch.** Draft [PR #59](https://github.com/filedcom/opentax/pull/59)
extends sourced routes and reconciliation, including the recent Forms 4562, 4797,
8815, 7206, 8606, 8829, 6252, 4972, 8915-F, 461, 2210-F, and 7217 slices.
Reviewed-source prerequisites cover Forms 172, 8801, and 2210 box E. Draft return
PDFs now use a faint centered gray watermark. Positive extension payments now
require reviewed source evidence and final-return reconciliation. The
unregistered-root review has source calculations for Forms 8828, 8908, 8844,
8881, and 8938, plus staged Form 8828, 8908, and 8938 native/PDF projections.
The bounded Form 8839 adoption route now accepts one strict reviewed source and
its exact PDF attachments through CLI MeF and PDF export.
The bounded direct Schedule C Forms 8844, 8881, 8882, and 8941 reach Form 3800,
Form 1040, native MeF, and PDF. A post-June Form 8864 direct producer route also
reaches Form 3800, Form 6251, native MeF, and PDF. Form 8994 now requires
reviewed policy/payroll metadata matched to validated attachment bytes in a
prepared MeF bundle and PDF; direct XML and standalone PDF claims stay closed. The other
positive routes remain closed.
The new positive and tamper fixtures are authored. The first agreed full-batch
`deno task test` at `1c1cc6dc` on 2026-10-01 stopped before test execution with
185 TypeScript errors. After repairs, the same full command ran on `bd4280b9`
and reported **10,168 passed, 174 failed** in 28m54s. Failing routes are under
repair and the command must be rerun to a passing result. Individual XSD tests
ran within the suite; complete route coverage and filled-PDF visual review
remain pending.
The saved failure log was re-triaged without rerunning it: identifiable
non-named PDF builder, CLI 1099-MISC fixture, and extension fixture failures
have later fixes; most other recorded failures concern the deferred named
forms. That historical classification does not establish a current pass.
The post-implementation full `deno task test` at `b168d9bb` on 2026-10-02
stopped in TypeScript checking with 32 errors, before any test executed.
Those type errors were repaired. The rerun at `f63302d8` completed with
**10,287 passed and 216 failed** in 27m05s; failures are being triaged by
source/fixture cause. After focused repairs, the full rerun at `c7b3be71`
completed with **10,393 passed and 112 failed** in 30m15s. The remaining
failures were classified against the deferred named-form section and a small
set of shared fixture/export defects. Focused repairs after that run corrected
two 1099-K review assertions, two HSA dependent fixtures, a Form 2555
assertion, two Form 5329 tax joins, and a retained-sale Schedule E allocation.
Their focused tests passed. The subsequent full `deno task test` at
`b4e01e51` completed with **10,428 passed and 103 failed** in 30m09s. The
new EIC opt-out, spouse-dependent, frozen-deposit rollover, line 36, and
former-spouse payment fixtures passed in that run. Remaining failures are
mostly deferred named-form routes; a small set of nonnamed fixture/assertion
repairs were then made to the Form 8824 bundle/XSD harness and packet/Form
8994 assertions. The full rerun at `d22ab027` completed with **10,432 passed
and 99 failed** in 29m09s; all four repaired assertions pass in that run.
The 99 remaining failures map to deferred named-form routes or their fixtures.
This includes three generic attachment-export tests for Forms 8958, 2106, and
8844, whose source or expected guard fails before the intended assertion; no
independent nonnamed return, payment, PDF assembly, or A2A production failure
was found in this run. The full command still has no passing result.
Six subsequently reported focused failures were resolved as stale assertions
or incomplete source fixtures; their selected reruns now pass 108 cases. The
agreed next full command remains deferred until non-named implementation ends.
The four reported paths in [issue #60](https://github.com/filedcom/opentax/issues/60)
are implemented with focused fixtures; they await the same bulk test gate.
CLI `return get` and `return validate` now read the same finalized pending graph
used for export.
Every positive 1099-R gross, taxable, or withholding amount now requires an
explicit recipient SSN matching the taxpayer or joint spouse before native/PDF
export; zero and calculation-only rows retain their bounded path.
Retained W-2 box 2 withholding now replays Form 1040 line 25a at final
native/PDF export, including identified joint recipients and bounded community
property allocation. Every positive box 2 copy now needs a nine-digit employee
SSN matched to the taxpayer or joint spouse, including single filers. The same
owner rule now covers positive box 1 wages even when box 2 is zero.
Shared native/PDF preflights now replay the attached Schedule 1, 1-A, 2, and 3
totals into Form 1040. The source-only and conditional-schedule audits distinguish
bounded registrations from staged guarded routes. Filled-PDF review preparation
now has 178 source fixtures, 84 of 112 unique registered PDF keys represented,
and a deterministic per-page review manifest; all 28 uncovered keys map to the
deferred named-form families and remain open.
The live registry and crosswalk census now agree on 148 native MeF descriptors,
115 PDF descriptors, and 32 native supporting rows; registration remains a
static inventory rather than a positive filing claim.
The generator now requires an explicit TY2025 XSD and checks every native XML
before writing that case's filled PDF. A read-only checker can later verify the
human-completed page checklist, copy coverage, artifact hashes, and fresh XSD
results without auto-certifying visual correctness. The checker now also
requires the manifest and source record to preserve each fixture's exact
review focus before accepting a completed checklist. It now also replays
each source through calculation and native MeF assembly so saved pending data
and XML cannot be accepted solely because their artifact hashes match.
The synthetic review generator fixes and records its own header timestamp;
generated statement and filled-PDF bytes now omit volatile PDF metadata so
the checker can reproduce source-to-XML artifacts across separate runs.
Thirty-two existing source-backed return fixtures now identify the owners of
positive 1099-INT/OID/DIV/G copies for the new export guards; ambiguous or
intentionally wrong-owner records remain for the later bulk review.
Schedule 1 line 8z PDF now prints a short statement reference and appends its
source-reconciled type/amount rows, matching the native other-income statement
without crowding the canonical description field. The filled-page visual gate
remains open. Generic unsourced line 8z scalar deposits now reject at Schedule
1 and AGI calculation before they can enter totals.
Schedule C simplified home-office claims now carry reviewed total-home and
business-use square footage into the TY2025 native document and the two
canonical PDF widgets, alongside the capped line 30 deduction. A source-backed
packet passed XSD and its Schedule C page was inspected; wider coverage remains
open.
The release workflow now requires a native-platform synthetic W-2, MeF, and PDF
smoke of each compiled asset before upload, limits write permission to the
publish job, and prepares a SHA-256 asset manifest. The eight Form 1040 ATS scenarios
have source-backed assertion and attachment plans; Scenario 1 and 8 source
conflicts remain unresolved after official-packet recheck, with exact IRS
clarification questions recorded. The release workflow's five published-asset
smokes and ATS submission have not run.
The [release artifact smoke plan](docs/release-artifact-smoke.md) records the
proposed `v2.0.6` CLI tag, dry-run, expected binaries and checksum manifest,
and downloaded-binary smoke; the version is not published yet.
CLI validation now applies only rules for emitted native documents and reports
assembly failures as rejects; a fresh locally compiled ARM binary passes the
stronger source-backed validation, native XML, and PDF smoke. The published
asset smoke has not run.
Prepared bundle parity now rechecks the XML digest and every attachment's
metadata and PDF bytes before PDF projection or submission archiving.
Transmission packaging now replays prepared source, XML, and attachment
digests again before using archive bytes, closing a later package-time
mutation path.
The prepared manifest now checks each document's canonical tag/position ID
and BinaryAttachment order; A2A ZIP packaging replays PDF filename,
description, and order against native XML, rejecting whitespace-only PDF
descriptions. Transmission packaging now also requires the inner ZIP entry
order to match manifest, return XML, then the declared PDFs. Prepared PDF
export now also hashes the bundle's retained pending
return before using it. A sourced general-sales-tax
Schedule A now prints its line 5a election checkbox, and bounded two-loan
Form 1098 reviews require byte-verified lender copies for both loans.
Its filled PDF now also prints line 8e mortgage-interest subtotal and the
Form 8396-net amount on line 8a or 8b, matching native XML.
Form 1040 native XML now prints reviewed direct-deposit bank fields or its
Form 8888 attachment mark in schema order, matching the filled PDF.
Reviewed seller-financed Schedule A line 8b interest now carries seller identity,
TIN, address, and exact amount into its native statement and printable fields;
other positive line 8b variants remain blocked pending distinct source routes.
Schedule A line 16 now prints a sourced Form 4972 federal estate-tax deduction
and links the matching native statement; other positive line 16 sources remain
blocked pending classified source details.
An explicit below-standard itemization election, including a zero-dollar
deduction, now reaches Form 1040 line 12e, native Schedule A line 18, and its
filled-PDF checkbox.
A reviewed nonqualifying home-mortgage-use record now reaches Schedule A's line
8 warning in native XML and the canonical PDF checkbox.
Trust K-1 box 13 code B backup withholding is retained at intake with an
exact-byte PDF review helper, but still blocks native/PDF export pending verified
printed issuer/beneficiary/amount contents and Form 1040 line 25c
credit reconciliation; ordinary trust income remains source-only.
A directly owned foreign disregarded entity or operated branch now has a
retained individual Form 8858 source record that blocks filing until the
required attachment, Schedule M, and tax-line joins exist; section 962/Form
1118 is inventoried separately.
Prepared MeF/A2A validation now also checks Form 1040 first, document IDs and
references, and XML/header attachment counts against the retained inventory.
For repeated references with one declared document name, builder, prepared
bundle, and archived Send checks now require that name to match every targeted
document tag.
Native MeF assembly now also rejects colliding document IDs before serialization
and derives binary-attachment references through the same ID function.
Prepared bundles and archived Send evidence count only direct `ReturnData`
documents, rejecting a nested `documentId` used to inflate document counts.
Reopening an archived outbound A2A submission now also replays document order,
counts, IDs, references, and PDF attachment entries against its stored ZIP,
including the exact manifest/XML/PDF entry order at Send record and read time.
Archived Send evidence now also applies the prepared PDF filename rule, so a
tampered `bad..pdf` attachment location rejects at record and reopen.
It now rechecks canonical BinaryAttachment metadata, distinct descriptions,
and unique IDs within each reference group in the archived XML.
The raw archived manifest EFIN must match the Submission ID, whose Julian day
must exist in its encoded calendar year.
Recording outbound Send evidence now rejects malformed or misidentified inner
submission ZIPs before storage, including noncanonical tag/position IDs inside
the archived return. A source-backed two-account Form 8888 fixture
and a payer-issued Form 2439 Copy B fixture are prepared for the filled-PDF
review batch. Reopening stored A2A evidence now replays submission IDs and
inbound correlation against archived bytes. Packaging an archived request also
rechecks the Submission ID against its retained processing date.
It also replays the inner document-reference and PDF inventory at Send record
and read time, before accepting linked inbound evidence.
The native registry audit now identifies 115 bounded main/numbered rows,
one blocked Form 8990 row, and the missing Form 8621 parent PDF; supporting
statement packet decisions remain open.
Identified 1099-DIV and 1099-OID payer copies now reject changed box amounts
under the same payer/source reference before dividends, interest, or withholding
accumulate. Positive 1099-DIV and 1099-OID copies also require a taxpayer or joint-spouse
recipient TIN at export. Identified 1099-INT payer/account copies reject changed source
references, and each positive 1099-INT copy now needs a taxpayer or joint-spouse
recipient TIN at final native/PDF export. All three guards replay there;
identified 1099-G and 1099-MISC copies have equivalent bounded guards. Every
positive 1099-G copy now requires a taxpayer or joint-spouse recipient TIN at
final native/PDF export. These INT/OID/DIV/G owner guards normalize filed SSNs
to digits so a dashed filed value matches the same nine-digit recipient.
An identified 1099-G copy with no account now also rejects replay under the
same payer, recipient, and issued-source reference after a box amount changes.
Positive 1099-MISC income or withholding copies now also require a matching
taxpayer or joint-spouse recipient at final native/PDF export.
Positive 1099-NEC box 1, 3, or 4 copies likewise require a matched recipient
SSN before filing output.
Positive 1099-PATR distribution, withholding, and cooperative/QBI copies now
require a matched recipient TIN at final native/PDF export.
Their identified payer/recipient/account copies now also reject changed
references or box amounts on a second row before graph totals and final
native/PDF export; corrected-copy lineage remains open.
Identified Form 1099-G agricultural and CCC receipts now bind payer, recipient,
issued-copy reference, reviewed purpose, and named farm to Schedule F and
Form 1040. A reviewed current-year-taxable crop disaster payment reaches
Schedule F lines 6a/6b; unclassified or incompatible deferral claims reject.
The bounded Schedule SE native/PDF identity now follows same-owner Schedule C
and F income to a joint spouse and rejects mixed or unnamed joint proprietors;
separate-owner calculations remain open. Positive W-2 wages now need an
identified employee on single and joint returns even with zero withholding.
Positive 1099-NEC withholding now requires a matching taxpayer or joint-spouse
recipient SSN at native/PDF export. Form 1099-B sales now require recipient
identity for finalized export and reject repeated identified broker transactions
even when a second copy changes its document reference or proceeds;
ownerless historical benchmarks can still calculate pending gains. A 14-route evidence matrix records where
reviewed facts, retained source bytes, signatures, and IRS acceptance differ;
the overall evidence policy still needs a user decision.
Positive 1099-PATR backup withholding now needs an owner-matched recipient TIN
at finalized export.
Repeated identified 1099-PATR payer, recipient, and account rows now reject
before farm income or backup withholding can be counted twice, including direct
native and PDF export. Corrected-copy lineage and unidentified accounts remain
open.
Exact duplicate 1099-K source rows now fail before repeated business income or
withholding can accumulate. Identified PSE/recipient/account copies now also
reject replay with changed boxes or classification at graph and native/PDF
export; account-free or corrected-copy lineage still needs review.
W-2G source input now rejects reuse of the same issued-copy PDF bytes under
different references before duplicate gambling income or withholding can accrue.
Every positive W-2G now checks the winner against the final taxpayer or joint
spouse, including copies with no withholding; blank-TIN copies remain unsupported.
The focused W-2G source/native/PDF/bundle audit now passes after correcting a
stale expected error, while identity-free distinct wagers remain unresolved.
Positive Form 1040 line 26 estimated payments now replay the retained 1040-ES
quarter amounts and applied prior-year overpayment at native/PDF export;
external receipt and owner proof remain open. Final Form 1040 export also checks
printed AGI, deductions, and taxable income against their component lines.
Form 1040 line 33 now replays present payment components even when zero
subtotals on lines 25d or 32 are omitted, while checking any explicit
subtotals. Filed overpayment and amount owed now replay whole-dollar tax/payment balance
and any reported estimated-tax penalty before native/PDF projection.
Filed wage total and total income now replay retained Form 1040 component rows
at native/PDF export when those rows are present.
Household line 1b and Form 8919 line 1g wages now enter AGI as well as Form
1040 income; Schedule 3 line 15 cents now reconcile to whole-dollar Form 1040
line 31 at export, including a $42.60 Form 4136 fuel credit filed as $43.
Up to ten dated pre-2019 taxable alimony agreements now reach Schedule 1, AGI,
native XML, and the filled PDF with a continuation statement; original signed
agreement files still need authentication.
Final native/PDF export now matches filing status and an explicitly supplied
digital-assets answer and presidential campaign choices to the retained
general source record. Claimed dependent
rows and CTC/ODC counts now replay that same source, excluding children the
general record marks as claimed on another return.
The Form 1040 PDF now prints retained IP PINs, phone/email, apartment, and
foreign-address fields in verified TY2025 widgets. Deceased-filer facts now
stop at native/PDF export until signer, representative, and refund handling is
supported.
The source-only Social Security lump-sum node now retains the full reported
benefit on line 6a and rejects a claimed prior-year election until its
Publication 915 worksheets and line 6b/6c route can be verified.
SSA-1099 and RRB-1099 box 5 now match boxes 3 less 4; signed SSA/railroad
benefit copies offset before line 6a, and native/PDF export replays their
modeled sources. Positive benefit copies now require a source reference and
recipient matched to the taxpayer or joint spouse at export. RRB-1099-R now
uses the actual pension form box meanings; mixed fully taxable RRB, issued
1099-R, and Form 4852 pensions reconcile exactly to lines 5a/5b. Cost recovery
and prior-year repayments remain closed.
A strict frozen-deposit IRA rollover extension now retains qualifying source
evidence and dates, checks the extended deposit deadline, and carries its
explanation into native XML and the PDF statement.
Every IRA-to-qualified-plan line 4c(1) route now requires a reviewed plan
acceptance reference, including timely and direct rollovers. The single
acceptance field applies to the rollover itself rather than each late-waiver
method; IRA-to-IRA routes reject that field. Issued acceptance bytes and wider
eligibility evidence remain open.
An IRA Form 1099-R carrying payer death code 4 in either Box 7 position now
rejects a rollover claim until beneficiary and RMD eligibility can be reviewed.
Ordinary death-coded distributions still follow their existing income route;
spouse-beneficiary rollovers and RMD allocations remain open.
The core PDF now prints a source-reconciled line 1h FEC type when standalone
foreign employer wages or physical Form 2555 facts exactly explain that
amount and its retained AGI counterpart. Source-complete standalone FEC wages
build one native record per employer and one aggregate wage statement with
owner and line 1h/AGI checks. A bounded non-IRA 2025 1099-R code 8 correction
now reaches line 1h and its native wage statement instead of pension lines;
its PDF type is sourced and checked. Reviewed, under-50, non-SIMPLE W-2 code D
deferrals now add only the excess above $23,500 to line 1h and AGI with
native source checks; its PDF type is also sourced and checked. Reviewed
age-50-plus non-SIMPLE code D deferrals within the applicable 2025
catch-up limit now stay out of line 1h; the source and age facts must match.
Positive 2025
Form 1099-R code P corrections now stop before ordinary pension/IRA routing
until the prior deferral year and receipt facts can be reviewed. Other line 1h
income types remain open.
Native and PDF Form 1040 now reject a positive line 1h with no supported
retained source, overlapping source types, or a mismatch with filed/AGI totals.
Exact identified duplicate 1099-R payer copies now reject before their income
or withholding accumulates and again at native/PDF projection. The identity key
now ignores changed box amounts under the same explicit issued-copy reference;
corrected-copy lineage remains open.
The retained ACTC opt-out
now reaches the Form 1040 line 28 native indicator and PDF checkbox, and
conflicting Form 8812 item answers reject. The wider core-return and PDF
parents below remain open.
An explicit EIC opt-out now reaches line 27c, its native indicator, and the
canonical PDF checkbox while suppressing a positive line 27a credit.
A reviewed MFJ refund-only spouse-dependent route now connects the line 12a
checkbox to the dependent worksheet, EIC exclusion, native XML, and PDF.
The filer-owned line 36 overpayment election now reduces the refund by its
source-checked amount and prints in native XML and PDF.
The line 26 former-spouse SSN now prints for a reviewed agreed split of joint
estimated payments after divorce, with exact quarterly source reconciliation.
Positive direct capital-gain distributions on Form 1040 line 7a now replay
retained Form 1099-DIV box 2a net of nominee pass-through and calculated Form
8814 child gain in both native and PDF projection; Schedule D routes need a
separate complete reconciliation.
Individual partnership K-1 box 8/9a capital now replays to Schedule D lines
5/12 in native XML and PDF, rejecting omitted or changed filed amounts. The
entity's Form 1065 Schedule D and Form 8825 are inventoried separately from
the individual's received K-1; wider source and loss-limit proof remains open.
Form 8288-A withholding now deposits to Form 1040 line 25c; final native/PDF
export checks the combined retained Form 8288-A, W-2G, Form 8805, and Form
8959 withholding lower bound. Positive Form 8288-A credit also requires a
seller-owned stamped Copy B reference. Unmodeled families, copy authentication,
and exact source equality remain open.
Final native/PDF export also reconciles Form 1040 refund line 35a, any line 36
election, and line 38 penalty to line 34 overpayment.
Schedule H positive unrelated-worker withholding now requires a distinct
reviewed W-4 request and employer agreement for FICA-only and FUTA payroll.
Scenario 8's code-Q Roth IRA gross now prints on line 4a in native/PDF; the
printed IRS QCD mark still needs clarification before ATS acceptance.
Schedule 1-A now rejects omitted qualifying tip employers; Schedule EIC export
replays the claimed child's exact U.S. residence months into native and PDF
line 6, requiring that fact for an otherwise qualifying child. The 2025 Schedule 2 graph and
native/PDF projectors reject obsolete Form 5405 line 10 repayments.
The bounded two-employer Form 4137 tip route now has a source-backed Schedule
1-A worksheet and prepared packet fixture, with Form 4137 PDF checks against
its W-2 rows, Form 1040 tip income, and Schedule 2 tax.
Identified 1099-G box 5 RTAA copies now reconcile to Schedule 1 line 8z,
native type statement, filled PDF, and the final Form 1040 income total.
Schedule 1 native/PDF exports now also require taxable grants on line 8z to
equal retained 1099-G box 6 totals and require each positive grant recipient
TIN to match the taxpayer or joint spouse. A positive box 6 grant now also
needs an affirmative reviewed nonbusiness classification before that Schedule
1 route; farm and business grants remain unsupported there.
S corporation K-1 box 10 code J recovery rows also reconcile to that line and
its native/PDF statement without claiming authenticated issuer bytes.
Schedule 2 Part II now reconciles to Form 1040 line 23 after the retained
Form 8978 reduction; Schedule 3 line 8 reconciles to Form 1040 line 20.
Schedule 3 PDF now prints the supported Form 8911 personal-use credit on line
6j; both exports replay its retained allowed-credit source and reject bare,
changed, or omitted claims.
Finalized native/PDF Schedule 3 now replays printed subtotals on lines 1, 7, 8,
14, and 15 and checks line 12 fuel credit against retained Form 4136.
It also reconciles payment lines 9–11 to Form 8962, reviewed extension payment,
and per-owner/employer W-2 excess Social Security sources. A raw Form 4852
withholding total no longer creates a false excess credit.
Sourced Form 2439 box 2 now also prints Schedule 3 line 14 in the canonical PDF
and native XML before its line 15 total. Both outputs now reject an absent or
changed line 13a Form 2439 credit against the retained box 2 copies; other
line 13 sources remain open.
Form 1040 PDF now marks source-backed QCD line 4c and PSO line 5c boxes.
Its line 12e now prints the selected standard or itemized deduction once.
Its single-account refund fields now print finalized bank routing, account
type, and account number on lines 35b–d.
The PDF builder now resolves mapped, present checkbox fields even when their
value is unselected, so a missing IRS widget fails before export.
It also resolves mapped present-zero text fields before leaving them blank,
so a missing or wrong-type widget fails. Schedule 1 PDF now prints the retained
1099-G same-year unemployment repayment checkbox and amount and checks its
line 7 net. A fully repaid 2025 benefit now retains a zero-valued Schedule 1
so its repayment annotation can print. A same-year repayment exceeding
retained 2025 benefits now rejects instead of silently flooring the net.
Form 1040 PDF now marks line 6d for a retained
MFS lived-apart-all-year fact and line 16 box 2 when the retained tax includes
a positive Form 4972 amount. Final native/PDF Form 1040 line 25b now replays
withholding from fourteen retained 1099-family source routes, rejects identified
broker duplicates and unsupported owner claims, and requires filer identity
for positive withholding. Sources without recipient identity still need
issuer-byte and owner proof.
The graph and CLI now retain the general bank triplet for filer extraction;
final native/PDF preflight checks that triplet against a positive single-account
refund and rejects a conflicting header or Form 8888 allocation.
The retained routing number now needs nine digits with an IRS-permitted 01–12
or 21–32 prefix, and the account number accepts only the supported printed
letters, digits, and hyphens. The source and sink schemas and final native/PDF
preflight share that boundary; the focused graph/export test passes. A live
financial-institution lookup and issued bank-document proof remain open.
A bounded calendar-year Section 453A installment-interest workpaper now reaches
Schedule 2 line 15, line 21, and Form 1040 line 23 in native XML and filled PDF.
It checks origin-year obligation inventory, character rates, the 2025 year-end
underpayment rate, and filer ownership. Schedule 2 line 14, authenticated sale
and note records, Form 6252/prior-return joins, and complete inventory proof
remain open. Positive line 14 dealer-installment interest now rejects at graph,
native, and PDF boundaries until payment-level tax, sale-date rate, and elapsed
period evidence can be sourced.
A bounded same-vehicle Schedule 1-A refinance now retains original and
refinanced loan facts and reconciles the combined eligible interest to one VIN.
Native and PDF Schedule 1-A projection now reject a deduction source lacking
the Part I zero-exclusion review, including a senior claim that the graph would
otherwise count while the export silently omitted the schedule.
Schedule 1-A Part III now also derives a 2025 FLSA premium as one-third of a
reviewed full-year employer time-and-a-half overtime pay statement. It binds
the statement to the W-2 owner and employer, excludes simultaneous premium
sources, and replays the $4,000 deduction at native/PDF export. Underlying
payroll bytes and wider Notice 2025-69 calculation methods remain open.
Part III also supports a reviewed full-year double-time employer statement
that separately reports pay above the regular rate: half of the $10,000 excess
is the $5,000 FLSA premium. The source and native/PDF export bind it to one
W-2 and reject competing overtime methods; issued payroll bytes remain open.
A nine-root workflow matrix states the remaining amendment, payment,
recipient-copy, and optional preference decisions without assuming their outcome.
The TY2025 v5.4 schema archive and extracted XSD have pinned local hashes and
an authorized SOR verification procedure; the local copy's IRS origin remains
unverified.

**Coverage and release gates.** The current static audit counts 145 registered native MeF
descriptors, 115 PDF descriptors, and 211 TY2025 IRS schema roots. Reconcile their
applicability, source and owner evidence, conditional attachments, and
unsupported-path decisions before calling the filing family complete. Every
retained positive route needs source-to-Form-1040-to-native-MeF-to-PDF agreement;
otherwise it needs a named, user-approved fail-closed boundary. After
implementation, run the single full test batch, validate retained XML against
the IRS schema and business rules, inspect the prepared synthetic filled-PDF cases,
and complete IRS ATS submission with issued credentials and acknowledgments.
These gates and a filing-ready release remain open.
PR #59's fetched `origin/main` is currently an ancestor of the branch, so no
rebase is needed at this checkpoint; repeat the ancestry check at work freeze.

## Scope and completion rules

- [ ] Verify the release covers the TY2025 Form 1040 family: Form 1040, its applicable schedules, supporting forms, source documents, statements, PDF packet, MeF return, and A2A submission package.
- [ ] Resolve every other entered Form 1040-family filing claim with a complete route or a named, user-approved fail-closed exclusion; review registered builders, schema literals, written tests, and previews without counting them as support alone.
- [ ] Verify every retained positive filing route has a source-to-calculation-to-Form-1040-to-native-MeF-to-PDF-to-attachment chain, with correct taxpayer/spouse ownership, source provenance, totals, and rejection of unsupported or inconsistent inputs.

## Coverage inventory and decisions

- [ ] Resolve the unsupported-path disposition in **each currently registered MeF descriptor row** of the [form-by-form audit](docs/mef/ty2025-form1040-form-audit.md). For each row, record its applicable trigger, public/source facts, calculation, Form 1040 join, native document, PDF or statement, focused cases, XSD evidence, and final support or explicitly approved rejection boundary.
- [ ] Review the **211 TY2025 IRS schema document roots** in the [root census](docs/mef/ty2025-xsd-document-root-census.md) against actual Form 1040 applicability. Resolve every still-unregistered or source-literal-only root in the [applicability crosswalk](docs/mef/ty2025-unregistered-root-applicability.md); neither a source literal nor absence from a registry is a support/exclusion decision.
- [ ] Reconcile the registered-document audit, root crosswalk, [conditional-schedule audit](docs/mef/ty2025-conditional-schedule-applicability.md), [coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md), and actual registries after implementation so their counts, triggers, and unsupported branches agree.
- [ ] Decide, with the user, which current-return paths are separate workflows: amended Form 1040-X; payment/account roots (1062, 965, estimated tax, Form T, payment); recipient copies of RRB-1042-S and SSA-1042-S; and optional Forms 4547 and 9000. Preserve any income, withholding, tax, election, or amendment consequences on Form 1040.
- [ ] Decide conditional filer ownership individually for entity-associated roots, including Forms 8858/Schedule M and 1118, entity-issued 1065 Schedule D and 8825, and trust K-1 box 13 code B backup withholding. Build any individual Form 1040 attachment that remains required; do not blanket-exclude an entity-root family.
- [ ] Audit [source-only and sparsely mapped forms](docs/mef/ty2025-source-only-and-sparse-map-gap.md): identify every positive filing trigger, confirm each emitted field and required statement/attachment, and replace any optimistic mapping with a verified route or explicit rejection.
- [ ] Audit return-wide ordering and reconciliation across Form 1040, Schedules 1/1-A/2/3, income, deductions, tax, credits, withholding, payments, carryovers, and multiple copies of the same form. Check positive, zero, negative, amended-source, joint-owner, and conflicting-source cases.
- [ ] Decide whether structured reviewed facts alone are acceptable filing evidence for complex forms or whether executor-bound uploaded document bytes must be verified. Apply one consistent evidence standard to external records, signed forms, carryovers, appraisals, source K-1s, and ATS fixtures.

## Core return and source paths

- [ ] Audit Form 1040 identity, filing status, dependents, digital assets, wages, pensions/rollovers/QCD, taxable Social Security, interest/dividends, capital gains, business/farm/rental income, adjustments, deduction choice, credits, taxes, withholding, payments, refund, and amount owed against source records and 2025 instructions.
  - [ ] Finish Form 1040 line 4c(1) for other valid late-rollover exceptions and wider IRA rollover eligibility evidence, including authenticated source and prior-return records, spouse-beneficiary status, and RMD allocations. Payer death code 4 is now guarded in both Box 7 positions. Keep the IRA mark distinct from pension line 5c. See the [eligibility gap](docs/mef/ty2025-ira-rollover-eligibility-gap.md), [late-waiver](docs/mef/ty2025-ira-rollover-automatic-waiver.md), [self-certification](docs/mef/ty2025-ira-rollover-self-certification.md), and [IRS-ruling](docs/mef/ty2025-ira-rollover-irs-ruling.md) notes.
- [ ] Audit source classifications and ownership for Forms W-2, W-2G, 1099-INT/DIV/OID/B/R/G/NEC/K/MISC/PATR/SA, 1098, 1095-A, 3921, K-1s, foreign employer records, and reviewed prior returns. Require joins to the correct recipient and destination, and reject duplicates or ambiguous matches.
- [ ] Complete Schedule 1 line 8z source/description handling, Schedule 1-A deduction variants and filled PDF, Schedule 2's 2025 line structure, Schedule 3 joins, and Schedule EIC child identity/residency projection. See the [Schedule 1-A gap](docs/mef/ty2025-schedule1a-gap.md) and [line 8z source gap](docs/mef/ty2025-schedule1-line8z-source-gap.md).
  - [ ] Complete Form 5471 section 951(a) income on Schedule 1 line 8n and an individual's section 951A inclusion on Form 8992 for line 8o, including all required Form 5471/8992 native and PDF documents and export evidence. Resolve legacy Forms 8873 and 8915-D in the [coverage queue](docs/mef/ty2025-form1040-coverage-decisions.md).
  - [ ] Finish Worksheet 1 passive-activity lines 11–13, reconcile the complete investment-income limit to finalized Schedule E, Form 8582, K-1, other Form 4797 ordinary gains and losses, and other passive sources, and verify the full $11,950 threshold across combined categories and allowed losses.
- [ ] Finish Schedule C and Schedule F/Form 4835 source, at-risk, passive, self-employment, QBI, and PDF cross-checks, including Schedule C [PDF mapping](docs/mef/ty2025-schedule-c-pdf-gap.md), Schedule J's [source](docs/mef/ty2025-schedule-j-source-gap.md) and [integration](docs/mef/ty2025-schedule-j-integration-gap.md), and the applicable Schedule E rental/royalty joins.
- [ ] Verify Form 1040 assembly order, document references, multiple-instance IDs, required PDF descriptions, manifest/return archives, A2A request package, and explicit failures for missing or invalid AcroForm fields.

## Named tax-form gaps

- [ ] **Form 8283:** finish the required FMV-reduction statement for every other applicable reason; reconcile deduction, FMV, appraisal, signed donee form, vehicle acknowledgment, Section B grouping, and remaining prior-year carryover attachments to authenticated source bytes and Schedule A. See [reduction](docs/mef/ty2025-form8283-fmv-reduction-gap.md), [carryover](docs/mef/ty2025-form8283-carryover-source-gap.md), and [PDF](docs/mef/ty2025-form8283-pdf-gap.md).
- [ ] **Form 1116:** complete source-reconciled passive/general baskets, mixed income and countries, deductions, foreign-employer alternative compensation, K-3 combinations, Schedule B carryover vintages, and Schedule C redetermination with affected-year filed returns and amendments. Finish parent/Schedule B PDFs and register a valid Schedule C route or retain an approved rejection. See [Schedule C](docs/mef/ty2025-form1116-schedule-c-gap.md), [main PDF](docs/mef/ty2025-form1116-main-pdf-gap.md), [Schedule B PDF](docs/mef/ty2025-form1116-schedule-b-pdf.md), and [alternative compensation](docs/mef/ty2025-form1116-alternative-compensation-gap.md).
- [ ] **Form 6251:** finish all still-applicable AMT adjustments, preferences, exemption and phaseout, AMT Form 4952, ISO source, other Form 8949 gain/loss and carryover combinations, circulation costs, and preferential-rate Part III; reconcile Schedule 2 and Form 1040 tax. See [remaining scope](docs/mef/ty2025-form6251-remaining-scope.md), [ISO](docs/mef/ty2025-form6251-iso-source-gap.md), [basis](docs/mef/ty2025-form6251-8949-basis-gap.md), [circulation](docs/mef/ty2025-form6251-circulation-cost-gap.md), and [mixed basis](docs/mef/ty2025-form6251-mixed-basis-net-loss.md).
- [ ] **Form 8962:** complete household/dependent MAGI, policy-month and corrected SLCSP evidence, shared-policy allocation, multiple/overlapping/alternating policies, interstate moves, below-400%-FPL no-APTC paths, and all repayment caps beyond the bounded Pub. 974 ordering route. Reconcile each 1095-A month to Schedules 2/3 and Form 1040; reject unsupported policy combinations. See the [dependent MAGI](docs/mef/ty2025-form8962-dependent-magi-gap.md), [policy-month](docs/mef/ty2025-form8962-policy-month-gap.md), [three-policy](docs/mef/ty2025-form8962-three-policy-overlap.md), [alternating](docs/mef/ty2025-form8962-alternating-policy-gap.md), [interstate](docs/mef/ty2025-form8962-interstate-move-gap.md), and [Pub. 974 ordering](docs/mef/ty2025-form8962-pub974-ordering.md) notes.
- [ ] **Form 8889 / 5329:** finish owner-specific monthly HSA eligibility, Medicare/mixed months, prior funding, employer-returned code 2 excess, all Form 1099-SA source and exception routes (age 65 and disability), paired-owner excess and carryovers. Reconcile both owners' Form 8889/5329 copies, Schedule 1, Schedule 2, Form 1040, MeF, and PDF. See [paired HSA](docs/mef/ty2025-form8889-paired-hsa-gap.md), [funding](docs/mef/ty2025-form8889-prior-funding-eligibility.md), [code 2](docs/mef/ty2025-form8889-code2-excess-gap.md), [1099-SA](docs/mef/ty2025-form8889-1099sa-source-gap.md), [age 65](docs/mef/ty2025-form8889-age65-exception-gap.md), and [disability](docs/mef/ty2025-form8889-disability-exception-gap.md).
- [ ] **Form 8582:** finish activity-ID provenance, referenced 2024 carryover imports, retained gain character, entire dispositions, active-rental/MFS boundaries, aggregate reconciliation, a durable 2025 ledger and next-year import contract. Verify worksheet Parts I-IX and overflow in filled PDF, plus Schedule E/Form 4835/4797 and Form 1040 joins. See [activity ledger](docs/mef/ty2025-form8582-activity-id-gap.md), [entire gain](docs/mef/ty2025-form8582-entire-overall-gain-gap.md), and [MFS](docs/mef/ty2025-form8582-mfs-boundary.md).
- [ ] **Form 4952:** finish debt/expense tracing, K-1 box 20 code B's permitted deduction destination, royalty and Schedule E ownership, investment-income elections, carryover ledger, and Form 6251 interaction. Extend full-return source validation to every other retained K-1 combination. Ensure calculation, native document, PDF projectors, and final filer identity use one consistent validated source path. See [main gap](docs/mef/ty2025-form4952-gap.md), [K-1 code B](docs/mef/ty2025-form4952-k1-code-b-gap.md), and [Treasury dividend](docs/mef/ty2025-form4952-treasury-dividend-slice.md).
- [ ] **Form 4972:** complete beneficiary/partial-share, NUA, estate/death allocations and combinations, separate spouse elections, multiple 1099-R distributions, eligibility evidence, and Schedule J AMT tax refiguring beyond the bounded ordinary-rate route. Keep unsupported combinations blocked until their source records are verified. See the [Form 4972 gap](docs/mef/ty2025-form4972-gap.md).
- [ ] **Form 3800:** extend the registered nine-page parent PDF to every retained business-credit source and reconcile Form 1040 tax. See the [Form 3800 PDF gap](docs/mef/ty2025-form3800-pdf-gap.md).
  - [ ] Join those vintages to authenticated prior returns and source records, Form 8582-CR, Form 3800 Parts I/II/IV/VI, the native `CarryforwardGeneralBusinessCr` computation, the revised-carryforward history statement, native XML, and the printable packet; prove source-to-Form 1040 totals and local XSD/business-rule results.
  - [ ] Cover transfer and passive credits, carryover vintages, mixed and other source credits, row overflow, required external attachments, cross-route archive evidence, business rules, and ATS acceptance.
- [ ] **Form 8835:** extend the completed filer-owned facility routes to every other retained credit, owner, facility, election, and source combination in the [form audit](docs/mef/ty2025-form1040-form-audit.md). Keep duplicate physical-facility records rejected and verify every native/PDF copy against its source and Form 3800 row.
- [ ] **Forms 8995/8995-A:** finish positive QBI export and all conditional Schedule A/B/C/D paths beyond the bounded two-business Schedule B route, including Form 5884 WOTC wage-reduction coexistence, election, aggregation relationship, RPE statements, owner data, and return-wide QBI totals. See [8995](docs/mef/ty2025-form8995-positive-export-gap.md) and [8995-A](docs/mef/ty2025-form8995a-gap.md).
- [ ] **Form 8990:** obtain authenticated debt tracing and filed-year interest/ATI inputs, reconcile its return-wide ordering, and design a durable accepted-filing carryforward ledger before allowing a positive nonexcepted-interest export. See the [Form 8990 gap](docs/mef/ty2025-form8990-gap.md).
- [ ] **Form 8839:** complete unused-credit carryforward, exclusion, Form 2555, wider credit ordering, and external decree/expense/reimbursement authenticity beyond the bounded reviewed one-child CLI route. See the [Form 8839 gap](docs/mef/ty2025-form8839-gap.md).
- [ ] **Form 7203 / Form 9465 / Schedule J:** complete shareholder debt and other basis paths beyond the bounded stock-only loss; resolve Form 9465 attached electronic authorization and linked filing review before opening its fail-closed route; complete Schedule J fishing attribution and mixed farm/fishing cases beyond its bounded Schedule F-only election. See [7203](docs/mef/ty2025-form7203-stock-loss-gap.md), [9465](docs/mef/ty2025-form9465-filing-boundary.md), and [Schedule J](docs/mef/ty2025-schedule-j-integration-gap.md).
- [ ] **Forms 2210/2210-F, 8801, 172, 461, 4562, 4797, 6252, 7206, 7217, 8829, 8606, 8815, 8915-F:** review their applicable public inputs, computations, source proof, Form 1040 joins, native/PDF documents, and conditional attachments; finish all positive routes or obtain a named fail-closed decision. Use the matching form gap notes under [docs/mef](docs/mef/) and the [form audit](docs/mef/ty2025-form1040-form-audit.md).
- [ ] **Forms 2106, 8853, 8863, 8880, 8886, 8941, 8958, 8959, 8978, 8997, 982, 3115, 4255, 6478, 8621, 8864, 8874, 8911, 965-A, 8582-CR, 8611, 8826:** resolve the per-form unsupported branches, source/owner evidence, PDF parity, and required schedules or statements listed in the [form audit](docs/mef/ty2025-form1040-form-audit.md) and corresponding [gap notes](docs/mef/). Complete the remaining Form 8863 education-credit paths. For Form 8886, resolve the per-transaction current-return attachment and separate initial-year OTSA copy workflow under the [IRS instructions](https://www.irs.gov/instructions/i8886).
- [ ] **Foreign/entity and special attachments:** resolve applicable Forms 5471, 8858/Schedule M, 1118, trust K-1 backup withholding, section 965, and every other individual-filer root flagged in the [unregistered-root crosswalk](docs/mef/ty2025-unregistered-root-applicability.md), including source copy versus transmitted attachment ownership.
- [ ] **Source/statement exceptions:** authenticate W-2G payer-copy contents; extend Form 1098 source-byte proof beyond positive box 6 and finish wider cross-loan mortgage limits, cash-out, and points cases in the [Form 1098 gap](docs/mef/ty2025-form1098-box6-points.md); bind Schedule LEP prior elections and Schedule R physician, income, and benefit evidence to reviewed source bytes and complete full-return review; authenticate Form 8814 issuer records and finish mixed filled-PDF review; authenticate Form 8862 prior IRS notices and complete ODC/AOTC full-return and filled-PDF review; finish wider Schedule H FICA-only, family/under-18, mixed-worker, source-byte, and state/rate cases; and resolve required signed/byte-bound statements and source copies identified by the [form audit](docs/mef/ty2025-form1040-form-audit.md).

## Native MeF and PDF parity

- [ ] Resolve every native document without a corresponding required PDF or supported paper alternative in the [registry parity audit](docs/mef/ty2025-native-pdf-registry-parity.md), especially the Form 8621 parent; finish the guarded Forms 965-A, 4255, 8611, 8826, and 8854 descriptors and wider Form 8582-CR branches, including passive income, special allowances, and prior-year activity/year carryforward imports. See the [Form 8582-CR PDF gap](docs/mef/ty2025-form8582cr-pdf-gap.md). Extend Form 3800 and Form 8911/Schedule A descriptors to every retained filing branch.
- [ ] Audit every registered PDF descriptor against its canonical TY2025 IRS AcroForm fields, page count, row overflow, owner identity, checkbox semantics, descriptions, statements, document references, and current calculation. Fix stale or missing mappings rather than silently dropping fields.
- [ ] Ensure native XML, PDF, and manifest use the same finalized return graph and prepared form instances; verify repeated owner/form copies and attachment references, including signed Form 8283 and source-issued acknowledgments.

## Automated and artifact validation

- [ ] Finish the non-named implementation and coverage decisions for this phase before the agreed single full-batch gate. The 20 named-form parent gaps are deferred to the following phase; existing focused cases and historical passes are not evidence for the current worktree.
- [ ] Run `deno task test` as the full batch for this phase after its retained routes and scope decisions are complete; record commit, command, tool versions, timestamp, pass/fail/ignored totals, failures, and ignored-test reasons. Fix failures, then rerun the same full command until this phase passes.
- [ ] For every retained positive filing route, generate a full return from a source-backed fixture and validate emitted XML against the locally cached TY2025 IRS schema, recording its provenance and digest. Check source-to-calculation-to-Form-1040 totals, required references/attachments, negative and conflicting cases, and IRS business rules separately from structural XSD success.
- [ ] Generate the 178 prepared synthetic filled-PDF cases through the real graph and PDF builder as described in the [validation batch](docs/mef/ty2025-form1040-validation-batch.md); render and inspect every page, mark checkboxes/amounts/owner identity/page order/continuations, and add cases for each uncovered descriptor or branch.
- [ ] Compare each filled PDF to its source, calculated pending data, native XML, and Form 1040 totals. Retain review artifacts and record each discrepancy and fix; blank templates and ATS source PDFs do not count as filled-output review.

## IRS ATS and delivery

- [ ] Complete the Publication 1436 Form 1040 ATS scenario matrix, source-backed expected outputs, required supporting forms and attachments, and scenario-specific assertions in [ATS preparation](docs/ats/ty2025.md). Resolve the known Scenario 1 Form 5695 door-cost conflict and Scenario 8 printed QCD mark before submission.
- [ ] Obtain and verify the issued ATS certificate, enrolled ASID/Test ETIN, current IRS ATS endpoint/WSDL/trust package, and authorized transmission credentials. Do not put private keys or certificate secrets in the repository.
- [ ] Submit each required Form 1040-family ATS scenario only after its source, XML, PDF, and package checks pass; retain transmitted package, IRS acknowledgment, acceptance/rejection details, and repair/retest evidence. No local test or XSD pass substitutes for an accepted IRS acknowledgment.
- [ ] Review the filing-ready diff, user-approved scope decisions, security/privacy implications, manual packet output, and test/ATS evidence before approving a filing-ready release.
- [ ] After review and required IRS acceptance gates, publish a filing-ready version, verify its artifacts and release notes, and close or update any linked issues with a short human explanation and thanks.
