# TY2025 Form 1040 board status archive (2026-10-03)

This is the board's accumulated status preface as it stood on 2026-10-03.
It preserves the implementation and validation trail, including superseded
failure counts and time-sensitive release statements. For current open work,
use [the product board](../../product_board.md); for bounded completed items,
use the [completed ledger](ty2025-product-board-completed-2026-10-01.md).

# TY2025 Form 1040 product board

## Full status summary (2026-10-03)

Merged [PR #59](https://github.com/filedcom/opentax/pull/59) provides the
latest TY2025 Form 1040 code checkpoint. This board contains **52 open TODOs and no
completed checkboxes**. The **996 completed bounded items** and their exact limits live in the
[completed ledger](../../docs/mef/ty2025-product-board-completed-2026-10-01.md);
the [September 30 checkpoint](../../docs/mef/ty2025-product-board-checkpoint-2026-09-30.md)
retains earlier evidence. A completed slice does not close a broader form,
coverage decision, or release gate.

**Current order of work.** The retained broad changes, including the board,
passed the full local suite and compiled CLI/PDF smoke checks. CLI
[v2.0.6](https://github.com/filedcom/opentax/releases/tag/v2.0.6) is published;
continue coverage and evidence work while keeping unsupported routes guarded. The 32 open TODOs
outside **Named tax-form gaps** and 20 named-form parent gaps remain visible
for subsequent coverage and evidence work; passing local tests will not by
itself close a filing or IRS acceptance gate.

| Workstream | Open TODOs | Current state |
| --- | ---: | --- |
| Scope and completion rules | 3 | Filing boundaries and end-to-end acceptance rule need final review. |
| Coverage inventory and decisions | 8 | Form applicability, ownership, evidence standards, and unsupported-path decisions remain open. |
| Core return and source paths | 8 | Return-wide joins and source classification remain incomplete. |
| Reported CLI issues | 0 | Four issue #60 code slices passed focused tests and the full suite; advanced Form 8995-A cents loss remains in the named-form gap. |
| Named tax-form gaps | 20 | Many sourced form slices exist; the listed parent form paths remain open. |
| Native MeF and PDF parity | 3 | Registry, attachment, and printable-output parity remain open. |
| Automated and artifact validation | 5 | The full local suite passed 10,886/10,886, including all 178 filled-PDF/XML fixtures; manual page review and wider route evidence remain open. |
| IRS ATS and delivery | 5 | CLI v2.0.6 is published with five platform assets; the downloaded macOS ARM binary passed synthetic W-2 → MeF → PDF smoke. IRS ATS acceptance and a filing-ready release remain open. |

**Implemented coverage.** The completed ledger records 996 bounded routes and
prerequisites across income, deductions, credits, business and investment
activity, foreign tax, retirement, health coverage, and supporting documents.
Each entry names its supported source pattern, any return/native/PDF
reconciliation, authored fixtures, and remaining limits. The checklist below
contains only open parent work; a completed slice does not close its parent form.
The [32-row nonnamed dependency audit](../../docs/mef/ty2025-nonnamed-board-dependency-audit.md)
maps independent implementation and review work separately from user decisions,
deferred named forms, validation, and IRS ATS prerequisites.
The PDF builder now rejects populated fields on discarded template pages and
invalid page selections; full descriptor/page review remains open.
Schedule 3 and both Schedule E PDF pages now print the required filer name.
Prepared MeF archive and A2A packet gates now replay retained source into the
native XML instead of accepting matching hashes alone.
Form 1040 line 2b now joins retained Schedule B line 4, and Schedule F 1099-NEC
farm receipts replay against their retained payer-copy fields.
Schedule C's supported 1099-MISC receipt boxes now replay across multiple payer
copies. Schedule 1's filled PDF marks its Form 4797 line 4 source box, while a
direct Form 4684 route remains open. MeF submission ZIPs reject duplicate
physical entries before packaging.
Archive validation also checks each local ZIP filename against its central
directory entry. Schedule E PDF continuation copies now repeat sourced Form
1099 answers, and native/PDF export replay Form 1099-G unemployment copies and
repayments while preserving source cents until whole-dollar output. Form 1040
line 9 now reconciles available income components even without wages.
Packet validation rechecks PDF envelopes and rejects a repeated document ID
within one native reference list. Schedule F's 1099-MISC box 3 farm rows now
replay against retained copies across multiple payers.
Form 1040's filled spouse-name field now includes the retained middle initial;
ordered A2A Send evidence now matches request and ZIP submission positions.
Send evidence now parses the request XML before recording or reopening it, so
commented submission IDs, unrelated roots, and malformed bodies reject.
Archived A2A evidence also parses the manifest root and its direct identity
fields before record and reopen checks.
The archived return identity check reads the direct Form 1040 PrimarySSN
element, so a commented or misplaced value cannot satisfy Send evidence.
Archived A2A attachment inventory now also rejects PDF filenames whose bytes
fail the shared envelope check at both record and reopen.
The A2A evidence path now counts physical inner-ZIP entries before extraction,
rejecting duplicate attachment names hidden by the ZIP decoder.
Form 1040 line 1a now replays ordinary W-2 and substitute wages, including
Form 8958 taxpayer shares, against retained source and AGI at both exports.
Identified repeated W-2 issued copies now reject before graph calculation and
at both exports. Main Schedule 1, 1-A, 2, 3, and E PDF headers now print the
filer name in Form 1040 display order.
The v2.0.6 artifact checks are documented as a release plan; the GitHub release
workflow remains unchanged while this broad branch is stabilized.
The release smoke guide now states that the CLI update-check cache can remain
in the runner home directory after temporary return artifacts are removed.
Claimed Form 1040 line 1i now replays retained W-2 code-Q combat pay at both
exports while preserving the choice to leave that election blank. Identified
statutory-employee W-2 copies now require an explicit Schedule C business link;
the bounded two-copy route reaches Form 1040, native XSD, and PDF.
Schedule A, EIC, and H PDF headers now use that same return-order filer name;
business-owner and named-form header routes remain separate reviews.
The ATS Scenario 3 plan now reflects its actual partial 1099-R/Schedule F
fixture and missing Schedule D, E, and Form 4835 facts.
Household-employee wage sources now replay to Form 1040 line 1b and AGI at
both exports. A representative draft PDF was visually checked on both pages:
the gray watermark is faint and the filled fields remain readable; its final
counterpart has no watermark. The draft-export fixture now supplies the issued
W-2 recipient SSN and both focused cases pass.
Schedule 1-A's vehicle and tips overflow pages now print the filer name in
Form 1040 order. MeF A2A evidence now rejects inconsistent ZIP local/central
entry metadata at both record and reopen, including inner and outer CRC drift.
Form 4137 unreported-tip income now replays to Form 1040 line 1c and AGI at
native/PDF export, catching changed tips even when the separate tip tax rounds
to the same amount.
ZIP validation now also verifies each decoded entry against its central CRC
and uncompressed size, rejecting matching but false CRC headers.
The older Form 4137 XSD positive fixture now carries its identified W-2,
Form 1040, AGI, and Schedule 2 facts and passes focused validation.
Form 8919 line 6 wages now replay to Form 1040 line 1g and AGI at both exports;
Schedule D's filled page 2 now marks the line 22 qualified-dividends answer
from the filed Form 1040 when a loss or line 17 answer requires it.
A2A evidence now rejects attachment bytes that only mimic a PDF prefix and
end marker; the bounded envelope gate checks version and final cross-reference
trailer, with complete PDF readability still checked earlier in bundle build.
The Form 1040 PDF now marks and amounts a child Form 8814 capital gain when it
flows through Schedule D. Foreign-employer line 1h PDF export now enforces the
same filer ownership and distinct employer source references as native MeF.
The general-dependent identity fixtures now pass all 74 focused tests.
The MeF builder's Schedule F presence fixture now supplies its required Form
1099 answer; its 148 focused tests pass on the current worktree.

**Merged checkpoint.** [PR #56](https://github.com/filedcom/opentax/pull/56)
was merged as `48f69237` on 2026-10-01. Its full local suite at `c0d45cb0`
passed 10,006/10,006 tests with no ignored cases; a separate TY2025 v5.4 XSD
batch passed 181/181. Those results apply to the merged checkpoint, not the
current PR. [CLI v2.0.5](https://github.com/filedcom/opentax/releases/tag/v2.0.5)
was published from that merge after platform builds, a 34/34 pre-merge smoke
suite, and a downloaded-binary smoke. It exports a return but does not transmit
one. The [September 30 checkpoint](../../docs/mef/ty2025-product-board-checkpoint-2026-09-30.md)
retains earlier evidence.

**Current implementation batch.** Merged [PR #59](https://github.com/filedcom/opentax/pull/59)
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
**Historical validation trail.** The following red runs guided the fixes and
have been superseded by the passing 2026-10-03 run recorded below. The new
positive and tamper fixtures are authored. The first agreed full-batch
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
or incomplete source fixtures; their selected reruns passed 108 cases. A new
full `deno task test` on `298e083a` completed with **10,454 passed and 429
failed** in 25m11s. Its largest failure groups are missing retained
digital-assets answers, missing issued W-2 recipient SSNs, and strict MeF
reference-name mismatches; nonnamed fixture and reference repairs are in
progress. The complete batch is not a release pass. Its exact log and tool
versions are recorded in the [validation batch](../../docs/mef/ty2025-form1040-validation-batch.md).
A second full `deno task test` at `d59366ab` completed with **10,662 passed
and 221 failed** in 32m54s. No newly failing test names appeared, but strict
source checks still exposed missing W-2 employee SSNs, retained digital-asset
answers, and other incomplete fixtures. The 178-case PDF/XSD group had 16
failures: one stale EIC error assertion subsequently repaired, plus 15
deferred named-form cases. Shared fixture repairs are in progress; the full
command remains red and no release pass is claimed.
Focused W-2, Schedule C/F, digital-answer, reference-name, and employer-address
repairs after that snapshot are recorded in the completed ledger. They require
a fresh full run to establish the remaining count. The full command at
`f1820bca` then completed with **10,736 passed and 147 failed** in 35m38s,
down 74 failures. That result was a diagnostic snapshot.
On 2026-10-03 at `3506a188`, `deno task test` passed **10,886/10,886** in
59m47s, including all 178 filled-PDF/XML review fixtures. `deno check
cli/main.ts`, native compilation, and a compiled synthetic W-2 → MeF →
two-page PDF smoke passed. This establishes local patch stability for the
retained routes; manual PDF page review and IRS ATS acceptance remain open.
The four reported paths in [issue #60](https://github.com/filedcom/opentax/issues/60)
are included in that passing run. Advanced Form 8995-A cents loss remains a
named-form gap.
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
The local release smoke runs a native-platform synthetic W-2, MeF, and PDF
check of a compiled asset; five-platform artifact and checksum verification
remains open. The eight Form 1040 ATS scenarios
have source-backed assertion and attachment plans; Scenario 1 and 8 source
conflicts remain unresolved after official-packet recheck, with exact IRS
clarification questions recorded. Published-asset smokes and ATS submission
have not run.
The [release artifact smoke plan](../../docs/release-artifact-smoke.md) records the
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
Schedule C's positive 1099-NEC receipt rows now also replay exactly against
retained payer-copy business, payer, recipient, and amount fields at native and
PDF export; issued-copy byte authentication remains open.
Positive 1099-PATR distribution, withholding, and cooperative/QBI copies now
require a matched recipient TIN at final native/PDF export.
Their identified payer/recipient/account copies now also reject changed
references or box amounts on a second row before graph totals and final
native/PDF export; corrected-copy lineage remains open.
Identified Form 1099-G agricultural and CCC receipts now bind payer, recipient,
issued-copy reference, reviewed purpose, and named farm to Schedule F and
Form 1040. A reviewed current-year-taxable crop disaster payment reaches
Schedule F lines 6a/6b; unclassified or incompatible deferral claims reject.
An ordinary two-copy Form 1099-G state-tax-refund route remains closed because
its source-only Form 6251 line 2b currently triggers unsupported final AMT
serialization; the [nonnamed dependency audit](../../docs/mef/ty2025-nonnamed-board-dependency-audit.md)
records this named-form dependency.
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

**Coverage and release gates.** The current static audit counts 148 registered native MeF
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

