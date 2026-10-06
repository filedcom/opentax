# TY2025 Form 4852 substitute-source filing gap

## Current isolated source route (October 6)

The known-domestic-payer route now uses the actual retained completed official
Form4852 PDF, typed payroll/custodian records and replacement workpaper bytes.
Every text/checkbox field is parsed from the completed form and reconciled to
its reviewed source. An incorrect original is retained and its complete filled
recipient-copy fields are parsed against the workpaper, with owner/payer joins.
The calculation deposits substitutes once into shared W2/1099R source arrays;
ordinary sources remain distinct. Native records derive nonstandard copies
without adding them back to calculation. Source-copy, payroll account/period,
and retirement account/distribution lineage distinguish legitimate same-payer
copies. Shared plan and other-copy evidence can reuse one byte-bound document
only with identical digest and facts; separate originals, completed forms and
workpapers remain unique.

Preparation takes separate `retainedSourceDocuments`; they are copied into the
prepared bundle for PDF replay and are **not** automatically sent as IRS binary
attachments. The Form4852 PDF descriptor is registered. Plain synchronous MeF
export and direct PDF without verified retention remain guarded. A native W2
cannot omit its mandatory EIN, and recipient foreign-address projection is not
invented. Undetermined taxable amounts and nonqualified Roth code J/T claims
remain blocked where the required Form8606 PartIII/five-year source route is not
supported. IRS business-rule/ATS acceptance and external issuer/taxpayer
completion authentication remain open; generated fixture PDFs and JSON records
prove byte/field binding, not authentication.

The ten public whole-return cases exercise incorrect-source replacement,
same-payer issued plus substitute W2 payroll, same-payer joint retirement
owners, joint multiple-copy owner SE and Social Security/Medicare caps, mixed
wage/retirement SALT, net pension basis, direct rollover, prior filed Form8606
IRA basis, actual owned direct QCD transfer, SIMPLE25%/code 2
exemption/codeQ/recharacterization, and multiple substitute distributions from
one qualified plan with NUA/Form4972 election. Independent amounts are asserted
before native/full local TY2025v5.4 XSD/PDF. Retirement state/local withholding
is a distinct ScheduleA source contribution so it adds to wage withholding
instead of overwriting it. Native and PDF replay bind that contribution to the
combined ordinary/substitute R inventory.

The dated sections below record the preceding guarded/preparatory stages; their
blanket-export/unregistered statements describe those stages, not this current
known-source route. Final terminal logs, retained-artifact replay and
page-review evidence are appended below after verification.

## Historical audit and preparatory evidence

The current input node calculates wages, retirement income, withholding, and
related FICA fields from typed Form 4852 substitutes. Before this audit, those
amounts could reach Form 1040 and final native MeF/PDF export even though the
return packet had no completed Form 4852 route. A source item also lacked the
substitute recipient's SSN, source workpaper, and the explanations of amount
derivation and attempts to obtain the issued or corrected form. Therefore a
typed amount alone did not establish the completed substitute form or its
ownership.

Both final exporters now reject any Form 4852 W-2 or 1099-R source with the same
explicit filing-route diagnostic. This does not discard the calculation node or
assert that a valid substitute can never be filed. The
[IRS Form 4852 and instructions](https://www.irs.gov/pub/irs-pdf/f4852.pdf)
identify filer name and SSN, tax year, payer, substitute amounts, how those
amounts were determined, and efforts to obtain the original or corrected
statement; the form says to attach it to the return.
[IRS Publication 1345](https://www.irs.gov/pub/irs-pdf/p1345.pdf) permits
electronic filing after a taxpayer completes Form 4852 when a correct W-2, W-2G,
or 1099-R cannot be secured. It specifically requires the nonstandard W-2
indicator in the electronic record and ERO retention of Form 4852. The locally
cached TY2025 v5.4 W-2 and 1099-R schemas have an `N`/`S`
`StandardOrNonStandardCd`. An ordinary issued W-2 now emits `N` when its
altered, handwritten, or typed status has a matching reviewed source-copy
reference. An ordinary issued 1099-R now also emits `N` for an identified
altered, handwritten, or typed payer copy; the Form 4852 input still produces
neither source document. The
[IRS TY2025
accepted-form and attachment listings](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
do not list a separate Form 4852 MeF root or recommended PDF name. That absence
suggests a retained-form workflow, but does not by itself establish the allowed
electronic representation. Confirm the effective version's business rules and
ERO process before opening a positive route.

To open a positive route, retain a complete substitute form for each owner and
payer, authenticate the source workpaper or available incorrect issued copy,
reconcile original-versus-substitute amounts without double counting, bind the
recipient to the taxpayer or joint spouse, and emit the required nonstandard W-2
indicator and any applicable 1099-R coding with a reviewed retained Form 4852
and printable copy. Verify source-to-Form-1040, withholding, FICA, XML, PDF, any
required attachment/reference, local XSD, IRS business rules, and ATS cases. The
current guard has focused native/PDF rejection cases for both substitute types;
it is not a filing-ready positive route.

The separate issued-W-2 nonstandard branch has a complete synthetic
source-to-Form-1040/native/PDF case: a reviewed handwritten copy emits `N`, the
TY2025 v5.4 XML passes local XSD validation, and the filled Form 1040 prints its
$75,000 wages. Native and PDF export reject a changed copy reference. This does
not establish authentic issuer bytes or open the substitute Form 4852 route. A
separate altered 1099-R case emitted `N`, validated against the local TY2025
v5.4 XSD, printed its $20,000 gross pension on Form 1040, and rejected an
unidentified copy in both exporters. It likewise does not authenticate
payer-issued bytes or open Form 4852. A reviewed typed 1099-R also emits `N`
only when its review names the same retained payer-copy reference. A $20,000
typed direct pension rollover reached Form 1040, TY2025 v5.4 XSD-valid XML, and
a filled PDF; changed references reject. Form 8915-F's ordinary-source matcher
excludes this nonstandard copy until that source route is separately reviewed.

A separate, unregistered retained-copy projector now fills page 1 of the
official Form 4852 from a reviewed item. The item can carry the recipient SSN,
tax year, missing/incorrect status, payer address, amount-determination and
contact explanations, source-workpaper reference, and completed-form review
reference. The projector requires an identified taxpayer or joint spouse, checks
the recipient SSN against the filed identity, and prints the distinct W-2 or
1099-R amounts and withholding in their actual AcroForm fields. It rejects
missing review facts and a 1099-R without a distribution code. An explicit line
8b taxable amount is already net of basis and is no longer reduced again by line
8i employee contributions; when line 8b is absent, the bounded estimate
subtracts those contributions once from gross. The same calculation prints on
the retained PDF. Official PDF tests extract the W-2 owner, payer, wages,
withholding, and explanations and the 1099-R gross, taxable, and contribution
amounts. These references are typed identifiers, not authenticated retained
bytes. The projector is not registered in final packet export; the existing Form
4852 native/PDF guards remain in force pending the source record, retention,
basis, and MeF route.

## October 4 undetermined-taxable-amount correction

The [official Form 4852 instructions](https://www.irs.gov/pub/irs-pdf/f4852.pdf)
say line 8c is checked when the taxpayer cannot compute the taxable distribution
and line 8b must then be blank. The calculation node previously estimated gross
less employee contributions and deposited that amount into Form 1040 and AGI
even when line 8c was checked. A focused regression first proved that mismatch.
The shared taxable-amount projector now throws before any return output for an
undetermined item. The typed source and unregistered retained-copy projector
still allow the marked, blank-line-8b paper record; they do not create a
calculated filing route. The 24 node tests, one retained projection guard test,
and both native/PDF final-export guard tests pass. A positive substitute route
remains closed pending the source, packet, MeF business-rule, and ATS evidence
above.

## October 4 substitute-type field correction

The official form separates substitute W-2 amounts on line 7 from substitute
1099-R amounts on line 8. The typed input previously accepted both groups in one
item, while calculation and the retained-copy projector selected only the
declared `form_type` and silently discarded the other group's fields. The shared
item schema now rejects every W-2-only field on a 1099-R item and every
1099-R-only field on a W-2 item, including false checkbox values and zero
amounts. Shared withholding and state/local fields remain available to either
type. A red regression preceded the fix; all 25 node tests and the 28 focused
native withholding/export tests pass. This guards classification but does not
open the retained Form 4852 export route. A wider seven-file run passed 93 tests
and could not run one PDF text-extraction case because this host lacks
`pdftotext`; it did not provide a full green PDF-source replay result.

## October 6 retained-source contract in progress

The isolated source-completion checkout adds an optional reviewed-source
inventory, one fact snapshot per substitute, explicit taxpayer completion and
original-income replacement review, and retained
workpaper/completed-form/incorrect-original references with SHA-256 digests. The
preparatory reconciler binds taxpayer or joint spouse identity, 2025 source
year, explanations, addresses and references; it rejects changed source facts,
duplicate substitute identities, and concurrently entered ordinary sources for
the same owner/payer. A separate exact-byte resolver rejects missing, duplicated
or changed retained records. A same-payer joint-owner case remains distinct.
Focused source-contract and existing node tests passed 28/0. These tests use
synthetic byte buffers to test binding; they do not prove completed official
PDFs or issuer authenticity.

This work remains preparatory: neither final exporter calls this resolver or
opens a positive route. Required native substitutes, completed-form field
replay, incorrect-original allocation where multiple account/distribution copies
share a payer, foreign/unknown-payer electronic handling, FICA/retirement source
consequences, printable packets, business rules and ATS proof remain unfinished.
The local TY2025v5.4 W-2 schema requires `EmployerEIN` without an alternate
unknown-EIN choice; a paper Form4852's permitted blank TIN must not be
fabricated for native export.

Derived-native phase in isolation: the ordinary W-2 and1099-R descriptors now
also discover retained4852 sources and derive nonstandard copies inside native
serialization, preserving calculation arrays. Source projections carry taxpayer/
spouse identity, payer address/EIN, taxable/basis and withholding amounts. W-2
state/local values previously omitted by its native builder now emit the
schema's state/local groups. The derived pension retains explicit net taxable
amount and basis independently. Source/native descriptor gate26/0 passed. Final
export is still guarded; this is not full-return XSD/PDF evidence.
Completed-form byte/ field verification, packet registration and complete
retirement/FICA/source combination work remain required before opening the
route.

## Source completion checkpoint (2026-10-06, isolated fe9765617)

The preparatory native projection is not the calculation source. Final
completion must keep ordinary entered copies separate and deposit substitute
calculation sources once into the shared W-2/1099-R calculators. Their combined
inventory is needed for owner wage caps, excess Social Security, SALT and
retirement treatment; independent substitute scalar outputs cannot establish
those joins. Retained completed official Form 4852 PDF fields must be parsed and
compared, beyond the existing synthetic byte-buffer tests. Multiple replacements
need actual copy, account/distribution and owner lineage, not payer-only
exclusion. Unknown EIN cannot satisfy the mandatory native W-2 schema and must
remain explicitly blocked. Publication 1345 (Rev. December 2025), page21,
permits the electronic route after the taxpayer completes Form4852 and requires
nonstandard coding and ERO retention; local XSD does not establish IRS
business-rule or ATS acceptance.

### Shared calculation and retention checkpoint

The reviewed source deposits separate substitute arrays to the existing W-2 and
1099-R calculators; schema parsing consumes those arrays once and drops them
from its parsed result, while raw pending retains the distinct source deposit.
This avoids repeated-parse duplication and keeps native copies derived only at
serialization. Public array routing expects at most one schema-effect wrapper;
combined validation must stay inside that transform. Joint business returns also
require the actual general-owner identity to reach a substitute-only W-2 node,
not just an ordinary issued W-2 node. Two public inputs depositing the same
Form4852 owner context must not duplicate that identity object.

Retention is separate from transmitted IRS binary attachments. Completed
Form4852 official AcroForm fields/checkboxes, JSON workpaper facts, and all
filled incorrect-original recipient-copy fields are compared to actual retained
bytes. Prior IRA basis needs actual retained 2024 Form8606 owner/line14 fields
and the complete year-end IRA statement bytes. A named reference alone is
insufficient. Schedule3 previously blocked any positive substitute excess-SS
credit. Its source replay must prove the combined actual deposit and then
independently sum owner/employer withholding; copies from one employer cannot
turn its own excess withholding into a multiple-employer credit.

### Lineage checkpoint before final packet evidence

Seven full public returns now pass local XSD and prepared PDF generation. The
same-payer gate must go beyond assigning distinct substitute labels: actual
payroll-account/period and custodian-account/distribution records must be held,
parsed and reconciled to the completed boxes. Reusing one payment source cannot
become another claim through a renamed completed-form reference. Qualified IRA
basis and QCD source records remain byte-bound; Form4972 plan/final-balance
review records also remain separate ERO evidence, with external authenticity
unproven. Nonqualified Roth J/T claims are not opened merely because the legacy
generic 1099-R calculator can return a number; a required PartIII/five-year
source route must exist. This preserves the known-source claim gate without
closing the broader retirement or electronic-acceptance parent.

## Final isolated public and retained packet proof (October 6)

The checked four-module source gate is terminal **34 passed, 0 failed (39s)**:
`/tmp/opentax-4852-public-full-proof31.log`. It runs `form4852_filing.test.ts`,
the input-node tests, the source tests and the legacy export guard tests. The
two new tests include ten complete public returns, all native/full local
TY2025v5.4 XSD/PDF packets, repeated source parsing, independently expected tax
amounts, required-retention failures and source, owner, deposit, SALT and
rehashed-document conflicts. Retirement fixture facts use code 2 for the reviewed
payer-coded early exception, a 1964 DOB for the normal code 7 prior-basis IRA,
and an actual IRA for code N recharacterization. These factual corrections retain
the independently computed numeric proof.

Retained replay is terminal **10 packets / 70 pages exact**:
`/tmp/opentax-4852-held-replay-final31.log`. Source JSON, retained document
bytes and digests, normalized pending inputs, copy origins and PDF bytes agree;
XML normalizes only `ReturnTs`. All ten replayed native documents validate
against the full local schema. No retained workpaper, incorrect original or
completed form is automatically transmitted as an IRS binary attachment.

Reproduce from this isolated checkout:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test --allow-all forms/f1040/2025/form4852_filing.test.ts forms/f1040/nodes/inputs/f4852/index.test.ts forms/f1040/2025/form4852_source.test.ts forms/f1040/2025/form4852_export_guard.test.ts
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run --allow-all .state/research/form4852-source/replay.ts
PATH=/tmp/opentax-poppler-env/bin:$PATH /usr/bin/python3 .state/research/form4852-source/render.py
```

The ignored `.state/research/form4852-source/verified-manifest.json` records
packet/source/XML/PDF/origin and every retained-document digest.
`visual-review.json` records all 70 current rendered page digests and source-copy
origins. All 35 two-page sheets were viewed; all 70 pages were reviewed for
headers, owner identities, amounts/checkmarks, substitute copy ordering and
clipping. The payer address uses 7pt within the official three-line widget;
Form4852 copies follow the 1040 before supporting forms and schedules, matching
the official form's attachment instructions. Older proof19/proof24 artifacts
remain preserved separately; no review is transferred from their earlier bytes.

The same-reference ordinary/substitute mutation is rejected by existing public
issued-copy duplicate checks as well as the strengthened retained source binder
and final native/prepared-PDF replay. This is no newly claimed public
calculation duplication defect. Distinct source deposits are consumed once;
parsed schemas are idempotent and native copies never return to calculation.

Known-source proof does not close the broad parent: external source/taxpayer
completion authentication and IRS business rules/ATS remain external gates.
Unknown mandatory EIN, unsupported foreign recipient projection, undetermined
taxable amounts and nonqualified Roth J/T dependencies retain explicit guards.
This change does not claim unsupported tax treatment merely because a paper
Form4852 can contain it. Shared current-main Form4972 fractional percentages,
paired beneficiary groups and participant distribution inventory must be
preserved when integrating this isolated branch's separate R source/SALT blocks.

Final exact-source compatibility is terminal **364 passed, 0 failed (1m42s)**,
`/tmp/opentax-4852-related-compat-final31.log`: 15 modules covering Form4852,
ordinary/nonstandard W2 and1099R, withholding reconciliation, ScheduleA native
and PDF, Form8606 basis, multiple-NUA Form4972 and actual joint-owner WOTC/QBI.
The prior compatibility log remains preserved, but this final31 log is the
current source gate. The replay manifest SHA256 is
`59eed07322855284a755e03b6d20d7ea6880a83d5f01e72c29e3b0fc34a8d2dd`;
the all-page visual review SHA256 is
`e4ec9bb90198147579feaf29a81a49d1d720a633c7fb164997362adb0ea41321`.


## Current-main retained substitute proof

Main488d0d288 with fixture803890382: Form4852 focused34/0(41s),15-module compatibility364/0(1m37s); held10 fullXSD packets/70 reviewed pages source/pending/XML/PDF/origin/retainedbytes exact with original manifests. Main manifest SHA25659eed07322855284a755e03b6d20d7ea6880a83d5f01e72c29e3b0fc34a8d2dd; originalvisual SHA256e4ec9bb90198147579feaf29a81a49d1d720a633c7fb164997362adb0ea41321. Logs `/tmp/opentax-form4852-current-main-focused-v2.log`, `/tmp/opentax-form4852-current-main-preservation.log`, `/tmp/opentax-form4852-current-main-held-replay.log`. Prior focused33/1 was unavailable prior-year template URL, fixed to official IRS archive; no production expectation weakened. External authenticity, broader retirement, J/T and IRS gates remain open.
## Learning checkpoint before Roth J/T source extension (October 6)

The committed ten-packet proof remains preserved in the preceding checkout.
This fresh branch starts at3dcc3c89c. Current first-year Roth evidence supports
one codeJ payment with2025 contribution basis and earnings above that basis;
the retained Form4852 gate still rejects J/T. Generic codeT zero-tax treatment
cannot establish whether five tax years have elapsed. The2025 IRS Form8606
instructions and Pub590-B require regular contributions first, conversion/plan
rollover contributions in year order, and earnings last; conversion recapture
has a separate five-year clock. Age59½ alone does not make earnings qualified.

The proposed extension retains complete reviewed owner/account/contribution
and payment bytes, derives regular contribution basis and first-contribution
tax year from those facts, and proves J taxable earnings or a basis-only
distribution and T qualified/nonqualified age-based distributions. Historical
conversion and prior-tax-election claims require their actual trusted records;
no scalar basis or unconditional codeT exemption will substitute for them.
Source authentication and IRS acceptance remain external gates. Shared main
Form4972 group/fractional/inventory blocks are outside these edits.


## Retained regular-contribution Roth J/T filing proof (October 6)

This isolated extension starts from3dcc3c89c and preserves its original ten
packets/70 pages. The new public `retirement_source.roth_activity_review`
records complete owned accounts, owner birth evidence, issued Form5498 boxes
10/2/3, dated designated-year receipts, and the actual owned payment/code/date.
Every document is resolved to retained bytes, SHA256 and parsed facts before a
Form4852 filing. Matching a reference or a rehashed digest alone is insufficient.
The payer-unknown taxable box remains blank with its checkbox checked; taxable
Roth earnings are derived separately rather than invented as a known box2a.
Completed Form4852, workpaper and treatment records remain ERO-held, with no
automatic binary transmission.

For this regular-contribution inventory, basis comes from reconciled issued
contributions, first contribution tax year comes from those records, and the
age59½ date comes from the actual owner birth/payment dates. A2021 first year
does not satisfy the2025 five-year period; a2020 first year does when the age
condition is met. J earnings route through8606 and5329; J basis-only payments
retain gross/zero taxable on1040 without a fabricated5329. Nonqualified age-
exempt T earnings require8606 but no5329. Qualified T reports gross and zero
without an inapplicable8606. These follow the [2025 Form8606 instructions](https://www.irs.gov/instructions/i8606)
and [Publication590-B](https://www.irs.gov/publications/p590b).

Nine independently expected full public returns cover first-year J, historical
two-account J, basis-only J, first-year T,2021/2020 five-year boundaries,
spouse-owned T on MFJ, and one day before/on the exact age59½ boundary. The
cent case retains contribution receipts3000.25+2000.25 and payment7000.50;
filed basis5001/gross7001 produce earnings2000/early tax200. The1040 source
replay uses these filed operands, consuming the substitute deposit exactly once.
Full taxable Single examples have AGI127000/tax19747 for J and tax19547 for
age-exempt T; basis-only/qualified Single tax19067. The spouse T example has
AGI127000/tax10986/refund10014. Every return has issued W2 wages125000 and
actual source withholding20000+1000.

Checked compatibility gate: **206 passed,0 failed (1m24s)** across18
modules, `/tmp/opentax-4852-roth-final5.log`, including retained Form4852,
shared R/IRA replay, native8606/1099R, old first-year primary/spouse Roth,
traditional IRA contribution/basis, and multiple-NUA4972 preservation.
A final impossible birth/contribution/payment chronology rejection was added
and passed the checked public-negative test1/0 (103ms),
`/tmp/opentax-4852-roth-chronology6.log`; final source replay remains9/52 exact
(`/tmp/opentax-4852-roth-final-replay6.log`).
The new two tests include finalized gross/taxable/birth/basis mutations rejected
by native and direct prepared-PDF builders, rehashed receipt facts rejected by
retention/native/PDF, and public owner/account/code/calendar/inventory/unknown-
taxable conflicts. All nine returns validate against the complete local2025
v5.4 Return1040 schema.

Ignored artifact root: `.state/research/form4852-roth-source`. Exact held replay
is terminal **9 packets/52 pages**, `/tmp/opentax-4852-roth-replay5.log`;
only ReturnTs is normalized in XML, while PDF/source/origin/retained bytes must
match exactly. All52 pages were visually reviewed: final sheets9–26 viewed;
sheets1–8 match the already viewed proof4 sheet bytes exactly. Basis-only8606
line23 prints0 and skipped24–25 remain blank. Headers, primary/spouse SSNs,
copy order, checkboxes, arithmetic and clipping were inspected. The earlier
proof4 artifacts are separately preserved.

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test --allow-all forms/f1040/2025/form4852_roth.test.ts
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run --allow-all .state/research/form4852-roth-source/replay.ts
PATH=/tmp/opentax-poppler-env/bin:$PATH /usr/bin/python3 .state/research/form4852-roth-source/render.py
```

Manifest SHA256: `708a61f558ee45082015120b3c4b8f7697d8906cb883aee717a42106332c2bfa`.
All-page review SHA256: `5a92bf1dc39413bf6ed8d9f4f699ba09f07956c441e3934043aa2007a9b0f42d`.

### Learning checkpoint and retained broader source gates

This proves one current owner payment with complete regular-contribution
history, no prior distributions/returned contributions, no conversions/plan
rollovers, no inherited/transferred basis, and reviewed eligible contributions.
Multiple current IRA payments or simultaneous owner8606 copies, conversion
FIFO/recapture, historical consumed basis, disaster/homebuyer/transfer claims,
and other codeT exceptions require their actual supporting source joins;
they remain explicit final guards. Historical deadline extensions are not
inferred from ordinary receipt dates. The fixture issuer/birth/inventory records
are reviewed synthetic test bytes, not external authentication. Taxpayer
completion/source authenticity and IRS business rules/ATS remain external gates.
The broader4852/8606 parent remains open. Current-main4972 group/inventory and
exact-cent changes must be preserved when integrating the separate Roth blocks.


## Learning checkpoint before complete current Roth inventories (October6)

The045 source extension's nine packets/52 pages and earlier3dcc ten/70 remain
preserved in their original checkouts. One-payment restrictions are real copy-
layout/source-aggregation limits, not authority to omit other issued accounts.
The next existing parent extension must bind complete actual current payment
lists to the same owned account/history record for each owner, consume regular
contribution basis once across accounts, allocate early earnings before the
actual age59½ date, and file distinct taxpayer/spouse8606 and5329 consequences.
Qualified payments are excluded from8606 nonqualified line19. Each issued or
substitute copy retains its own payer/account/distribution lineage and amounts.
Conversion FIFO/recapture and consumed historical basis require separate actual
retained prior-tax source evidence; regular-only inventories cannot imply these
facts. External authentication and IRS acceptance remain outside fixture proof.

## Complete current owner Roth inventory proof (October 6)

The retained source route now binds every actual current issued/substitute Roth
payment to a complete owner account/history inventory. Regular contribution
basis is consumed once across accounts, separately for taxpayer and spouse.
Native/PDF Form8606 and Form5329 copy emission uses the actual owner consequence;
qualified-only payments produce neither form. Actual issuer address and federal,
state and local withholding remain joined to each current copy. Distinct known
payer/account/distribution lineage permits legitimate same-payer payments without
allowing repeated source copies. Unknown taxable amounts remain unknown on the
completed substitute, while owner history derives the taxable earnings.

Six public full-return cases include three Single payments, five MFJ payments,
two early owners, crossing age59½, a qualified spouse, qualified-only payments,
and raw cents. The cents case retains payments3000.25+4000.25+2000=9000.50 and
regular basis5000.50: finalized annual lines19/22 are9001/5001 and earnings4000.
Individual issued-copy gross projections3000/4000/2000 are independently rounded;
no invented residual alters a source copy. The [2025 Form1040 rounding rules](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require adding amounts before rounding when several amounts enter one line.
[Publication590-B](https://www.irs.gov/publications/p590b) requires owner-wide
aggregation and regular-contribution ordering; [2025 Form8606 instructions](https://www.irs.gov/pub/irs-prior/i8606--2025.pdf)
require distinct spouse forms. IRS business-rule/ATS acceptance remains external.

Terminal checked evidence on isolated045 source: new public positives/negatives
2/0 (21s), byte-bound rehashed account conflict1/0 (251ms), unjoined-current-IRA source rejection1/0, and related21-module
preservation211/0 (1m24s). Authoritative logs are
`/tmp/opentax-roth-inventory-public5.log`,
`/tmp/opentax-roth-inventory-bytes6.log`, and
`/tmp/opentax-roth-inventory-related3.log`. Six held packets/57 pages pass full
local2025v5.4 XSD and exact replay of source, pending, XML except ReturnTs, PDF,
page origins and every retained byte/hash. All57 pages were visually inspected
for owner headers, copy ordering, equations and legibility. Artifact root is
`/tmp/opentax-form4852-roth-inventory-oct6/.state/research/form4852-roth-inventory`;
`replay.ts`, `verified-manifest.json`, and `visual-review.json` retain the proof.
Earlier10/70 and9/52 original artifacts remain unchanged in their prior trees.

This completes current-payment regular-history inventory/copy layout, while the
existing parent continues conversion FIFO/recapture and consumed historical
basis. The source contract still rejects conversion/prior-distribution/inherited
or transferred basis rather than deriving these facts from an unknown declaration.
Retained test records prove byte/fact joins, not external issuer authenticity or
IRS acceptance. No unknown payerTIN or earlier-year engine coverage is invented.

### Learning checkpoint before conversion FIFO/recapture

Current owner aggregation and owner forms are now independent of payment copy
count. Conversion history must extend this same complete inventory with actual
annual5498 conversion receipts and retained prior-filed tax treatment; taxable
conversion portions precede nontaxable portions within FIFO tax years, each with
its own five-year recapture clock. Prior distribution consumption cannot be
replaced by opening basis scalars. Preserve current57 and prior70/52 packet bytes
when opening the next existing parent phase.

Final held replay log: `/tmp/opentax-roth-inventory-replay-final6.log`; manifestSHA256
`595ea6feb5b508e53a429df1ae7932b0f0fb168c31fc4470cdf8500764a8068f`;
visual-reviewSHA256 `17b2bbbbf5c6ead2b3bde7ae48596bdbe6720c5f7dcc28472787a6ce0fdda549`.
Replay command from the isolated checkout: `PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run --allow-all .state/research/form4852-roth-inventory/replay.ts`.


## October6 retained conversion FIFO/recapture proof

The complete current owner/payment inventory now accepts actual historical
traditional-IRA conversion source records: annual issued5498 box3, actual
issued1099R debit and Roth custodian receipt, owner/account/date/distribution
lineage, and retained prior-filed8606 PartII16/17/18 PDF bytes. Regular and
conversion entries for the same account/year must join one actual issued5498
with both boxes; conflicting duplicate source references are rejected. This
extends the existing Roth source parent and does not close it.

[2025 instructions5329](https://www.irs.gov/pub/irs-prior/i5329--2025.pdf) and
[Pub590B](https://www.irs.gov/publications/p590b) prescribe owner-wide regular
basis first, conversion years FIFO with taxable portions first, earnings last,
and separate five-year recapture clocks. The source replay implements that
ordering without inserting prior-year native copies into current calculation.
Prior-filed tax treatment is a retained record, not an invented earlier-year
engine recomputation. Actual raw5498/payment cents remain retained; current
filed lines use original annual aggregation and prior filed conversion totals.

Eight public whole-return cases cover two conversion years/22000 recapture,
expired2020 before2021, conversion-plus-earnings, conversion-only zero regular
basis, separate MFJ histories/copies, cent residuals, age-exempt T with2024
conversion and taxable earnings, and separately rounded owner5329 taxes.
The cent case keeps raw gross9000.50 and regular1000.50, filed9001/1001,
prior filed conversion basis10002 and recapture2999/tax300. MFJ recapture2994
and2494 yields separate filed taxes299 and249, Schedule2/1040 tax548,
not rounding raw aggregate548.8 to549. Final tax is11294.

Visual review caught and repaired a prior-template mapping mistake before
commit: historical2020–2024 PartII16/17/18 use f2_1/2/3, while f2_4/5/6
are PartIII19/20/21. The parser and actual retained fixture bytes now match
printed PartII cells; a rehashed changed line18 fails. All79 current packet
pages and34 retained historical pages were inspected. Corrected source bytes
leave every current packet PDF byte unchanged; prior original10/70,9/52 and
6/57 artifact sets remain unchanged and replay exactly against this code.

Terminal evidence: final checked public2/0 (33s), log
`/tmp/opentax-roth-conversion-final20.log`; includes actual shared5498 rejection
1/0, `/tmp/opentax-roth-conversion-annual18.log`; related23-module259/0
(1m25s), `/tmp/opentax-roth-conversion-related10.log`. Exact8-packet79-page
full2025v5.4XSD/source/XML timestamp-normalized/PDF/origin/retained-byte replay:
`/tmp/opentax-roth-conversion-replay21.log`. Preservation logs:
`/tmp/opentax-roth-conversion-old4852-preserve14.log`,
`/tmp/opentax-roth-conversion-oldroth-preserve14.log`,
`/tmp/opentax-roth-conversion-oldinventory-preserve14.log`.
Ignored artifact root `.state/research/form4852-roth-conversion`, manifestSHA256
`e4f6450ae54f3644ca6256a59064f05c4842e5a6f67b56836bf97cebef7fe903`,
visual-reviewSHA256
`184f5f59b1b047223f9eb6f71d1c5888e2d21ae580f79d26c3fffb8565a1670b`.
Replay from the isolated checkout:
`PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run --allow-all .state/research/form4852-roth-conversion/replay.ts`.

### Learning checkpoint and remaining existing parent

The actual prior PDF parser is verified for2020–2024 layouts. Earlier revisions
require year-specific inspected field/line mapping and remain guarded at
filing; schema admission is not a filing-proof claim. Prior consumed basis,
returned contributions, inherited/transferred interests, qualified-plan
rollovers, current2025 conversion coexistence and other exception/source
histories still require their actual complete source contracts. Next work
must derive historical consumption from actual prior filings plus account
payment records, not opening basis scalars, while preserving original25/179
and current8/79 artifacts. Synthetic retained fixtures prove byte/parsed-fact
joins only; external authenticity, business rules and IRS acceptance remain
open. No catalog registration, main, board or future task was changed.


## Precise retained prior-PDF parser negative

Currentmain2aeb5ecb3 test-only refinement passed2/0(31s), /tmp/opentax-roth-conversion-parser-current-main.log. The rehashed prior8606 PartII line18 negative now updates both actual f4852.reviewed_source and f4852_reviewed_source and requires the exact parsed-PDF error. Earlier inherited assertion rejected at retained digest, so it did not prove the previously claimed parser-depth negative; positive reviewed parser/byte joins remain unchanged. No production/source/PDF changed, no ledgerincrement, broaderparent unchanged. Root43cdd2906 actualfarmQBI/J95/0+final3/0,2fullXSDpackets36reviewedpages heldsource/pending/XMLonlyReturnTs/PDF/origins exact; priorpension76page sourcegate stilllive afterPATH repair. AgentQEF a3f64c873 ready6/0+32/0 with33reviewednewpages andsourcecallbacks; freshmain integrationnext, Form3800 ordering underseparateinvestigation. FullV5 lastverifiedlive76m11s; frozen52/futureunchanged. Appattachment2284 terminatedwithoutsuccessclaim.


## October6 retained historical Roth consumption checkpoint

The existing consumed-history contract is now implemented from actual retained
owner/account custodian payment and issued1099R records, plus annual filed
8606 PartIII and applicable5329 PDF bytes. Source-only declarations or opening
basis scalars cannot replace that inventory. The
[2025 instructions8606](https://www.irs.gov/pub/irs-prior/i8606--2025.pdf),
[2025 instructions5329](https://www.irs.gov/pub/irs-prior/i5329--2025.pdf) and
[Pub590B](https://www.irs.gov/publications/p590b) govern remaining regular basis,
conversion FIFO/taxable-first ordering, earnings and per-conversion recapture.
Actual raw current and historical cents remain retained; annual filed basis
residuals and later actual contributions feed the current worksheets. Prior
copies remain historical evidence and are not added to current income.

Twelve independent public whole-return cases cover partial regular consumption,
consumed taxable conversions, multiple annual consumptions, later regular and
conversion contributions, separate MFJ pools/copies, half-dollar residuals,
same-annual PartsII/III, exhausted conversion/earnings pools, age-exempt T and
same-payer distinct prior accounts. A2020 boundary prior PDF is included. The
cent case retains historical gross500.50 and regular1000.50, filed501/1001,
remaining500 and current gross9000.50 filed9001. The joint case has current
gross17500, taxable earnings6000, separate owner early taxes750+600, AGI131000,
taxable99500, tax-table11724 and total tax13074. Both current owners'8606 and
applicable5329 copies bind to their actual records. Same-year conversion and
distribution use one retained annual8606 with both PartsII/III independently
parsed; distinct invented annual-copy references are rejected.

Retained prior8606/5329 fields and skipped blanks are inspected and parsed for
2020–2024. The5329 padded2020–2022 field names and2024 three-page layout are
handled explicitly. Rehashed prior8606 line22 and5329 line4 negatives update
both actual pending source bindings and reach the exact parsed-facts rejection.
The inherited prior8606 line18 negative was separately strengthened in
00c138f248809124e68a3f4e2b9e2ec65084161f: its earlier single-binding mutation
hit the unchanged second binding's digest check; the repaired test updates both
and asserts the actual parsed conversion8606 rejection. This corrects the
depth claimed by the earlier conversion checkpoint without changing production.

Terminal checked public2/0 (54s):
`PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test --allow-all forms/f1040/2025/form4852_roth_history.test.ts`,
log `/tmp/opentax-roth-history-final10.log`. Related25-module264/0 (2m29s),
log `/tmp/opentax-roth-history-related11.log`; exact command retained in
`.state/research/form4852-roth-history/compatibility-command.sh`.
Current12-packet107-page full2025v5.4XSD, all source/retained bytes, PDF/origins
exact and XML timestamp-only-normalized replay is terminal:
`/tmp/opentax-roth-history-replay15.log`. All107 current pages and91 retained
historical PDF pages were visually reviewed, with no layout issues.
Ignored root `.state/research/form4852-roth-history`; manifestSHA256
`51694149d65876ecf46453b52ae9557a15d918bbb67388f71d38b1029d49fba6`,
visual-reviewSHA256
`c238407410099935fb2eef24ad91aca550c5406274531f838752819ebd9517aa`.
Preserved cache `.state/research/form4852-roth-history-pdf-cache-preserved`.
Exact replay from the isolated checkout:
`PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run --allow-all .state/research/form4852-roth-history/replay.ts`.

Original33 packets258 pages (10/70 source,9/52 Roth,6/57 inventory,8/79
conversion) remain byte unchanged and replay exactly against this production.
Terminal logs `/tmp/opentax-roth-history-old4852-preserve14.log`,
`/tmp/opentax-roth-history-oldroth-preserve14.log`,
`/tmp/opentax-roth-history-oldinventory-preserve14.log` and
`/tmp/opentax-roth-history-oldconversion-preserve14.log`.

### Remaining existing parent after this checkpoint

Earlier-than2020 prior PDF revisions, current2025 conversion coexistence,
qualified historical distributions, inherited/transferred interests, returned
contributions, qualified-plan rollovers and other exception histories remain
guarded where complete reviewed source contracts or verified layouts are
absent. This is not a historical whole-return engine recomputation. Synthetic
retained fixtures prove byte/hash/parsed-fact joins, not external authentication
or IRS business-rule/ATS acceptance. Broader parent remains open; no main,
board, catalog, PR or future task was changed.


Current-main7a75f732f verified source2/0+related264/0 and held12/107 exact with696artifactfiles preserved, prior33/258 unchanged/exact. Exact logs and limitations are archived in the October6 status/validation record.

## Ordinary Roth IRA checkbox source correction — isolated prerequisite

The [2025 Form1099-R instructions, p15](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf)
require ordinary Roth IRA payments to leave IRA/SEP/SIMPLE unmarked; traditional
and Roth SIMPLE payments are marked. The [2020 instructions, p14](https://www.irs.gov/pub/irs-prior/i1099r--2020.pdf)
also prohibit the mark on ordinary Roth payments. Earlier ordinary J/T fixture
and historical-source filing claims used an incorrect checked box and are
explicitly superseded by separately constructed corrected source proofs below.
Their original retained source/XML/PDF bytes remain unchanged; this does not
represent an authenticated issuer correction to those originals.

Actual retained complete account inventory now confirms ordinary Roth accounts,
excluding SEP/SIMPLE; first-year5498 evidence likewise records non-SEP/SIMPLE
classification. Reviewed current J/T sources reject the incompatible mark;
prior ordinary J/T issued records require false. J/T/Q codes determine IRA
income classification independently of that checkbox, so actual unmarked
payments reach1040 line4 rather than pension line5. Source amount, withholding,
owner, account, basis/FIFO/recapture and copy joins remain enforced. Traditional
conversion issued-source markers and generic marked SIMPLE/codeQ behavior are
preserved; this does not add an unsupported Roth SIMPLE history calculation.

Fresh isolated `/tmp/opentax-form4852-roth-checkbox-audit-oct6` from
`c9eb6ad777`: checked five-module11/0 (2m22s), related28-module274/0 (3m15s).
Authoritative logs `/tmp/opentax-roth-checkbox-prerequisite25.log` and
`/tmp/opentax-roth-checkbox-related26.log`; exact related command is held in
`.state/research/roth-checkbox-audit/compatibility-command.sh`.
Source/public/native/directPDF negatives cover marked ordinary current copies,
wrong owner, missing account classification and marked ordinary historical
copies. The inherited extra traditional-IRA negative now explicitly marks its
traditional source instead of inheriting the corrected unmarked Roth fixture.

Corrected held positives:9/52 Roth,6/57 inventory,8/79 conversions,12/107
consumed history —35 packets295 pages. Each full public graph uses independent
expected1040/8606/5329 values and passes full local2025v5.4XSD, source/pending,
XML(timestamp only), PDF, origin and actual retained-byte replay. Exact commands
from the isolated checkout, with
`PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH`:

```
deno run --allow-all .state/research/form4852-roth-source-checkbox-corrected/replay.ts
deno run --allow-all .state/research/form4852-roth-inventory-checkbox-corrected/replay.ts
deno run --allow-all .state/research/form4852-roth-conversion-checkbox-corrected/replay.ts
deno run --allow-all .state/research/form4852-roth-history-checkbox-corrected/replay.ts
```

Each root has its separately preserved `-pdf-cache-preserved` sibling. Terminal
logs `/tmp/opentax-roth-checkbox-{roth,inventory,conversion,history}-replay28.log`.
Aggregate held-indexSHA256
`2198c7da77e049f888f5e222c64534e93f90490f61a553e974e39adba0bf55c2`.
Original-comparisonSHA256
`519c45d25740319d4404ae0f9b449ae37c7cc1adfeebe33ae06708b501fb089c`.
Visual-transferSHA256 `4b2f7cdba6e240c9407c6b32ec80f4043a13973fad83c6bb16080a43b19f8f17`.

All295 corrected packet pages and origins equal the previously reviewed original
PDF bytes. Original-versus-corrected XML differs only by removal of incompatible
ordinary checkbox elements and timestamp. Every271 retained PDF page has exact
old/new rendered pixels (regenerated source PDF bytes can differ);146 completed
source pages include73 first pages also proven equal to their reviewed packet
copies, plus73 copies of the one actual instruction page visually inspected.
The125 historical pages transfer their prior visual reviews by exact pixels.
Actual corrected retained bytes remain hashed and parsed; this comparison is
not a source-authentication claim. Terminal comparison/visual logs
`/tmp/opentax-roth-checkbox-original-comparison27.log` and
`/tmp/opentax-roth-checkbox-visual-transfer31.log`. All997 original byte records
across45 packets365 pages remain unchanged.

Original10/70 arithmetic/source/XML/PDF/fullXSD replay remains exact against
this production (`/tmp/opentax-roth-checkbox-original10-replay29.log`), but its
applicable traditional/SEP/SIMPLE Form4852 paper-copy claims are explicitly
qualified: official Form4852 instructions line8j require the IRA/SEP/SIMPLE
right-margin label, absent from the current descriptor/generated completed
sources. Those original bytes must not be silently stamped or replaced. This
separate existing paper-source/layout issue will be repaired in a following
phase; ordinary Roth J/T copies here do not require that margin label.

Current2025 conversion coexistence remains a separate uncommitted phase;
qualified/inherited/transferred/other unsupported histories retain existing
source guards. Synthetic retained sources establish byte/hash/parsed-fact and
filing-layout behavior, not external authentication or IRS business-rule/ATS
acceptance. Broader parent remains open. No main, board, catalog, PR or future
scope was changed.


## Fresh main corrected ordinary Roth evidence — October 6

Integrated production0616cea72 verified on current main acfea8ca9: standard source gate11/0 (2m21s) and eight related source/native modules209/0 (3s). Terminal logs `/tmp/opentax-roth-checkbox-current-main-source-oct6.log` and `/tmp/opentax-roth-checkbox-current-main-related-oct6.log`. Isolated274/0 is separate and is not a main result.

Copied immutable corrected source roots in main `.state/research/form4852-roth-{source,inventory,conversion,history}-checkbox-corrected-main-reviewed` execute the public graph from actual archived inputs and retained document bytes; they compare whole pending, source hashes, PDF/origins and timestamp-onlyXML and validate full localXSD. All four terminal logs `/tmp/opentax-roth-checkbox-current-main-{regular,inventory,conversion,history}-held-oct6.log` pass9/52,6/57,8/79,12/107. All873 corrected archivedfiles remain byte-exact in `/tmp/opentax-roth-checkbox-current-main-original-comparison-oct6.json`.

The corrected35/295 proof seals ordinary checkbox classification only. Earlier original checked ordinary sources are superseded and preserved, not issuer-authenticated corrections. Original10/70 mathematical reproduction does not establish paper compliance: traditional/SEP/SIMPLE right-margin labeling and codeN actual annual recharacterization, destination/contribution/earnings and required statement remain unresolved. Current2025 conversion coexistence and broader source/authentication/IRS parent remain open. Ledger1468; frozen52 and future section unchanged.

## 2026-10-06 — retained account margin and whole current recharacterizations

Separate isolated follow-on from ordinary-checkbox prerequisite `c7b50f6b6`.
The original 45/365 artifacts and all 997 archived file hashes remain unchanged.
In particular the original 10/70 are **not** complete source-paper proof: their
traditional/SEP/SIMPLE margin labels are missing, their opaque Code N amount
lacks annual contribution/recharacterization facts, and their Code Q classification
alone does not establish qualified-payment eligibility. These are superseded
only by separately named constructed reviewed regression records below, not by
silently altering or authenticating the originals.

The retained custodian account classification now distinguishes traditional IRA,
SEP, SIMPLE, ordinary Roth, Roth SIMPLE, Roth SEP and non-IRA. Ordinary Roth and
N/R recharacterizations remain unmarked in the native IRA/SEP/SIMPLE indicator;
traditional/SEP/SIMPLE and Roth SIMPLE use their actual marker. Form4852 line8j
also requires the actual IRA/SEP/SIMPLE **right-margin** label for applicable
accounts. Its paper form has no invented IRA checkbox or invented label widget.
A printable physical annotation beside line8j is independently checked in actual
completed source PDF bytes: visible page rectangle, printed flags, canonical
normal appearance glyph stream and actual Helvetica font. Hidden/moved/missing
or metadata-only labels are rejected. The current source parser covers that
verified appearance encoding; handwritten/flattened or other encodings need
actual parser/layout review rather than a metadata declaration.

Code Q substitute filings require distinct retained account registration,
original-owner account linkage, earliest owned Roth contribution receipt and
issued5498 facts, complete original-owner Roth account inventory, and sourced
age59½ or inherited-account death eligibility. The 2020 first account is an
ordinary Roth; the actual Roth SIMPLE/SEP accounts begin2024. No pre2023 Roth
SIMPLE/SEP is fabricated. Younger living filer's constructed inherited account
records do not imply disability and do not erase the separate genuine SIMPLE
25% early-distribution tax. Qualification/source owner/type/date/first-year
conflicts reject public calculation, native preparation and direct PDF changes;
rehashing retained issuer facts still reaches exact parsed-source-fact rejection.
Disability or other qualification regimes without their complete evidence and
other affected source consequences remain guarded. These constructed issuer
records establish contract/byte/parsed-fact behavior, **not external authenticity**.

Genuine entire regular2025 traditional→ordinary Roth recharacterizations now
bind actual owned contribution receipts, original and receiving5498 records,
trustee transfer principal and related positive/negative earnings, receiving
payment, and complete annual owner contribution inventory. The whole current
transfer is reported on1040 line4a, zero taxable recharacterization income; no
unnecessary contribution Form8606 is invented. Each owned payment receives its
required native IRARecharacterizationStmt and printed statement, including
actual name/SSN, accounts, dates, principal and earnings. Multiple same-payer
accounts and both spouses are reconciled per complete annual inventory; principal
is counted once per actual receipt. Actual compensation, date of birth, annual
contribution limit and Roth MAGI phaseout are checked from the current return.
The corrected former opaque N8000 fixture now separately supplies principal7000
and earnings1000: its total IRA gross is17000, not the original9000; tax remains
11155 because that transfer is nontaxable. Loss5999.50, phased-limit2682.49 and
joint four-account gross14199.99 retain raw cents with filed line equations.

Boundaries in this existing parent remain explicit: partial or reverse
recharacterizations, prior-year transfers, nondeductible residual/PartI joins,
spousal compensation and annual Roth payment-basis/history coexistence need
complete corresponding source joins. Below the Saver's Credit ceiling, an
actual annual contribution/distribution-lookback Form8880 join is required;
the current source does not silently omit a potentially available credit.
The source-derived30000-AGI negative reaches that precise native guard; a
changed direct-PDF source also rejects the mismatched prepared bundle. Roth
SEP employer matching/nonelective contribution codes2/7 and unsupported
qualification/history facts retain their actual-source gates. Unknown payer
TIN cannot be invented to satisfy native EmployerEIN. IRS business-rule/ATS
acceptance and external source authentication remain external gates.

Terminal proof before sealing: focused source modules9/0; qualification/annual
source follow-on3/0; related28-module compatibility274/0 in3m28s, logs
`/tmp/opentax-ira-margin-qualified16.log`,
`/tmp/opentax-ira-margin-qualified18.log`,
`/tmp/opentax-ira-margin-related17.log`. Corrected paper10/71, explicit margin2/16
and annual owner/account3/18: **15 packets105 pages**, full public graph with
independent expected tax/deduction/penalty joins, full local2025v5.4XSD, no
transmitted ERO evidence attachments, native/directPDF conflicts. Held source,
pending, XML(timestamp only), PDF bytes, origin and actual retained bytes replay
terminal15/105 (`/tmp/opentax-ira-margin-held17.log`). All105 packet pages were
rendered and visually reviewed; all34 completed source first pages exactly equal
their packet-copy pixels, and all34 actual instruction pages equal the reviewed
common official page (68 retained pages total;
`/tmp/opentax-ira-margin-source-pixels17.log`). The corrected ordinary Roth held
35/295 also replay exactly against current source from frozen copies; terminal
logs `/tmp/opentax-ira-margin-old35-{source,inventory,conversion,history}19.log`.
Broader parent remains open. Current conversion coexistence remains a separate
unsealed phase. No main, board, catalog, PR or future scope was changed.

Artifact replay (isolated checkout, real Poppler and Deno on PATH):

```
deno run --allow-all .state/research/ira-margin-paper-audit/replay.ts
```

The audit root retains verified manifest, source pixel comparison, all-page
contact index/renders, original immutable-byte verification, preserved PDF cache
and prior35 frozen copies. New tax artifacts remain ignored.

The final immutable15/105 replay is `/tmp/opentax-ira-margin-held-final22.log`.
Use the frozen source root for integration replay:

```
deno run --allow-all .state/research/ira-margin-paper-audit/replay.ts .state/research/ira-margin-paper-audit/held15-preserved
```

Frozen manifest SHA256
`a066bda7456c27951bcc0ac28a30537f0703bdcfdbd3ecdef03191775fa5e911`;
source-pixel comparison
`236b44b4f6718812df7501a4293ca4dab07e4c4afad5e424350a7fb0f7aa81a0`;
visual review
`97d133b5984256dbee0325074cbf7a767aff3191a493d5b9386708b4a8f055db`;
original immutable-byte verification
`3fcb63e3c7421958ce476f996fe5f264a7640cf912436afcf6ababe3db2662f6`.
Aggregate proof index SHA256
`5c8fe7b1ba51111dbff860d0963ca0e06d004fa1dee9bf9adba0b9a787d6689f`.

Primary sources: [official Form4852 Rev9-2020 line8j instructions](https://www.irs.gov/pub/irs-pdf/f4852.pdf),
[2025 i1099r Box7 and CodeQ/5498 recharacterizations](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf),
[2025 i8606 Recharacterizations](https://www.irs.gov/instructions/i8606),
[2025 Pub590-B qualified Roth payments/inherited accounts](https://www.irs.gov/publications/p590b).

Authoritative final four-source-module gate:
`/tmp/opentax-ira-margin-final-source23.log` terminal10/0 in58s, including the
inherited original-owner/death/first-year negatives and the actual low-income
Form8880 source boundary. Printable-appearance review additionally rejects
optional-content visibility, rotation and invalid normal XObject subtype
(`/tmp/opentax-ira-margin-appearance24.log`, terminal2/0 in8s). These source
checks preserve the reviewed positive PDF/source bytes. Frozen15 replay against
that final appearance gate is `/tmp/opentax-ira-margin-held-final25.log`.

## October6 current-main IRA paper/source proof

Integrated0f51723d4 preserving later4972sourcegroups/cents. Freshstandardtask source10/0 (1m0s), typed0; logs `/tmp/opentax-ira-paper-current-main-source-oct6.log` and `-typecheck-oct6.log`. Broader28modules272/2: both failures solely missingpdftotext PATH; exactaffectedmodule withrealPoppler passes3/0 `/tmp/opentax-ira-paper-main-compat-missing-poppler-repaired-oct6.log`. Originalagent274/0 remains distinct; no claimfreshbroad274terminal.

Actualheld15/105 currentmainfullXSD/PDF/source/native/retained replay terminal `/tmp/opentax-ira-paper-current-main-held15-v2-oct6.log`, manifestSHAc8a7c3d30c0ddc4706e653630d60cd6c521831e34509643d3abf202f940c2eb0. Exactlythreegraphoperand additions fromearlierAMTintegration: unchangeditemized22000/20000/20000 suppliedto8995 forretirement-net-basis-early-rollover,samepayerissued/substituteW2,SALTincorrectW2. Independentheld+actualstandarddeduction exact; source/tax/nativeXMLexcepttimestamp/PDF/origins/retainedbytes unchanged. Do notcallwholependingbyteidentical. Actualold35/295 replays9/52+6/57+8/79+12/107 allterminal0 `/tmp/opentax-ira-paper-main-old35-{source,inventory,conversion,history}-oct6.log`; rootrehashesall997originalimmutablefiles exactly. Original10Q/N/margin proofsuperseded bytheseconstructedreviewedrecords; authenticexternalcustodian/signature/IRS gates remainopen.

NativeIRAstatementregistration causedschemaorderingfailure whencombinedwithactualtwo-salePFICMTM. CorrectIRARecharacterizationStmt beforeGainOrLossMrktToMrktElectStmt (ReturnData4380vs4422). Actualcombinedsourcefixture provesbeforexmllint3,aftertyped1/0 plusfinalN+combo2/0 (13s). Combined10pagepacket/rootall-page reviewat `/tmp/opentax-ira-pfic-statement-order-main-oct6`, manifestSHA5d05c910eb6c0869b00d0c940cad54c5f3d32a2115f2f2a9b5af872b4580a567; retainedcompleted4852firstpageraster exactlypacketpage4, secondinstructionpage separatelyreviewed (12totaloccurrences). Sameowned7000 contribution/−1000.50 earnings yieldsraw5999.50 gross/filed6000/taxable0; MTM400/−200=200, AGI75200/TI59450/tax7999/refund3001. Source/copy/statement/pageorder/checkboxes amountschecked; noissuerorIRSclaim.

### Current 2025 conversions and owner distributions — isolated 0f51723d4 proof

The retained ordinary Roth owner inventory now admits actual listed current
traditional-IRA conversion debits, paid Roth receipts, issued 5498 box 3 amounts,
complete traditional/SEP/SIMPLE account and December 31 value inventory, and the
owner's retained 2024 filed Form8606 basis. Current conversion copies remain
issued traditional marked IRA copies; ordinary Roth J/T payments remain
unmarked. Each current copy joins its source reference, owner, account, issuer
address, code, date, gross, unknown-taxable indicator and withholding. Conversion
and Roth payments enter the annual owner Form8606 exactly once, rather than
adding generated native copies to the calculation inputs. Both owners retain
separate Form8606 and Form5329 copies and share only the final1040 totals.

PartI/II basis allocation uses filed whole-dollar operands and the prescribed
three-decimal ratio; raw cents determine whether a real year-end account balance
exists and aggregate before rounding. Current conversions enter the actual
conversion-year FIFO pools after regular-contribution basis and historical
consumption, with taxable-before-nontaxable conversion ordering and the separate
conversion recapture clock. Qualified T payments leave PartIII blank while the
current conversion still files PartII. The existing prior-year source contract
remains reviewed filed tax treatment, not an earlier-year engine or a claim of
issuer authentication.

The draft current fixture's prior2024 PDFs initially populated line14 without
complete PartI operands. Those unsealed draft artifacts are preserved and are
superseded by new constructed source records. The corrected source requires the
complete filed carryforward or allocated PartI operands, validates their filed
basis equations, parses each actual retained PDF field and ratio, and joins a
shared2024 historical PartII conversion to PartI lines8/11. The age-T prior
record now explicitly retains filed basis2500, year-end3333, conversion5000,
ratio.300, nontaxable1500 and remaining1000; these are constructed reviewed prior
filing facts, not invented external acceptance or a historical recomputation.
Both actual source bindings are updated in the rehashed prior line14/line2
negative tests, which require the exact parsed-field rejection.

Current complete direct-conversion sources require receipt equal to the full
issued gross. Nonzero withheld conversion funds are rejected without the
missing replacement/unconverted-distribution source records; a gross receipt
is not silently treated as proof of replenishment. Current traditional
contributions, other traditional withdrawals, outstanding rollovers, QCD/HSA,
disaster/repayment/transferred-basis sources and their broader annual joins
remain open under this parent.

A genuine whole-conversion market loss retains prior basis15000, converted10000
and paper line18=-5000, with1040 taxable0. The actual [2025 Form8606](https://www.irs.gov/pub/irs-pdf/f8606.pdf)
and [line18 instructions](https://www.irs.gov/instructions/i8606)
support the signed subtraction and omission of a nonpositive amount from1040
line4b. Local2025v5.4 IRS8606 TaxableIRAConversionAmt is USAmountNNType. Native
and direct PDF filing remain guarded pending a verified IRS representation;
basis is not capped or discarded to force schema acceptance.

Terminal proof on isolated current-main0f51723d4: checked source2/0(1m6s),
strengthened conflict1/0(940ms), related28modules274/0(3m15s); logs
`/tmp/opentax-roth-current-main-prior-source30.log`,
`/tmp/opentax-roth-current-main-prior-conflicts31.log`, and
`/tmp/opentax-roth-current-main-final-related33.log`.
Thirteen public returns/116 packet pages passed the full local2025v5.4 XSD and
held replay: source, raw pending, XML except ReturnTs, PDF bytes, copy origins and
all retained document hashes. All116 pages were visually reviewed across25
sheets. All162 retained pages (80 PDF copies,37 distinct exact rendered pages)
were reviewed through explicit pixel groups; all28 completed4852 first pages
match the packet pixels exactly. The prior-source repair leaves all13 packet
PDF bytes unchanged. Frozen corrected35/295 and paper15/105 also replay;
the latter admits only the independently derived newerAMT Form8995 itemized
operand matching the unchanged finalized standard-deduction operand. All997
original archived file hashes remain unchanged; original qualified10/70 claims
are not revived by this proof.

Ignored evidence is under
`/tmp/opentax-form4852-roth-current-main-oct6/.state/research/roth-current-main-audit/`,
with `held13-preserved`, source pixel records, visual review, preserved old
sources and caches, and replay.ts. Replay command from that checkout:
`PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run --allow-all .state/research/roth-current-main-audit/replay.ts`.
Proof-index SHA256:
`845e7e2273fc6c8c082ca08a79358fe5a00e6f3b41d8c657a7958710fad90b40`.
This establishes the retained known-source routes and local schema/layout proof;
external authentication, IRS Business Rules/ATS acceptance and the broader
Form4852/8606 parent remain open.
