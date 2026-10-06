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
