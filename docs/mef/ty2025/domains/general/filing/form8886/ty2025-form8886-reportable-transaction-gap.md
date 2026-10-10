# TY2025 Form 8886 reportable-transaction disclosure gap

## Current integrated status — October 10, 2026

The stored-return disclosure and separate OTSA-copy workflow is integrated in
this repository. Public `f8886` intake is registered, return preparation binds
its native and PDF copies, and the CLI registers both `export-otsa` and
`record-otsa-delivery`. The isolated-candidate description below is historical.

The current typed regression batch at `a1a4cfd61` reports **75 passed, one
failed, zero ignored** across ten modules:

```sh
deno test -A forms/f1040/2025/domains/general/filing/form8886 cli/commands/form8886-otsa.test.ts
```

All three OTSA command tests pass. They create a stored joint return, export
separate taxpayer/spouse copies, verify every file digest, and retain reviewed
fax and mail evidence against the correct disclosure. The fax copy has its own
cover; mail binds the unchanged spouse disclosure. Existing directories cannot
be overwritten; altered PDFs, manifests, requests, owners and evidence are
rejected. Subsequent disclosures retain explicit `not_required` decisions.
Recording evidence leaves the original export unchanged and does not set IRS
acceptance. These are synthetic local command tests, not external delivery.

The two full-return XSD/PDF integration tests also pass in the configured local
schema/cache environment. No new visual review or retained packet count is
claimed by this replay. The failed preparation-snapshot test reaches the
already-recorded deferred140 rejection-contract mismatch: invalid filing
status throws `ZodError` during public validation before the test can inspect
calculation diagnostics. Assertions after that exception did not run. Neither
the public guard nor the deferred test contract was changed.

Evidence: `.state/research/form8886-current-2026-10-10/grouped.log` and
`verification.json`. The [operator workflow](./ty2025-form8886-otsa-export.md)
now describes the integrated commands. This completes the current integration
and command replay checkpoint; the parent still includes wider source/category
coverage, shared-spouse legal copy policy, source authentication and applicable
IRS business-rule/ATS evidence. Existing casualty export guards remain.

## Historical candidate status — October 9, 2026

The parent task remains **open**. The isolated worktree
`/private/tmp/opentax-form8886-disclosure-oct8`, based on `30fe40fe5`, now contains
public `f8886` intake, source reconciliation, native descriptors, finalized
return-bound PDF copies, OTSA export and durable operator-reviewed delivery
records. These runtime changes are prepared for draft review on
`codex/form8886-disclosure-oct8`; they are not implemented in root `main`. Historical entries below describe the
state when recorded and must not be read as the current candidate inventory.

| Existing requirement | Verified candidate behavior | Remaining scope |
| --- | --- | --- |
| Source and owner joins | Broker/direct capital sales, three K-1 capital families, three K-1 activity families and a bounded casualty reconciler retain owner and source hashes. | Wider benefit/source families; issuer and prior-filing proof; casualty export remains guarded. |
| Public return attachment | Public input is replayed through the graph; finalized native fragments and exact PDF copies are bound to the same prepared return. | Full source/category combinations and IRS business-rule/ATS gates. |
| Multiple owners | Source rows cannot be assigned to a different disclosure owner; repeated arrangement IDs need two distinct owners and matching explicit review. | This representation does not settle whether shared-spouse facts require combined or separate legal disclosures. |
| Separate OTSA copy | CLI emits exact-copy PDFs, one fax packet per required fax, request/file digests and a final manifest. | Actual external transmission and delivery-provider authentication. |
| Reviewed delivery record | CLI retains reviewed evidence and original manifest; source/request/file changes reject recording. Fax and mail are checked separately. | Operator review is not IRS acceptance or independent proof of provider delivery. |
| Validation | Prior affected batch: 276/0, actual CLI replay, full XSD, seven-page PDF review reused by exact hashes. Expanded delivery file: 3/0, including new spouse-mail and not-required cases. | Five signature/name business-rule failures remain in the unsigned review fixture; `--force` is explicit and retained. |

The new mail case records the spouse's exact disclosure PDF without a fax cover,
checks the due-date boundary, and rejects forged exports, unknown/swapped owners,
empty evidence and a subsequent-disclosure handoff marked not required. Only the
test file changed after the 276-case batch; production file hashes still match
its checkpoint. See `form8886-owner-delivery-audit-checkpoint.json` in the retained
board-execution research directory and the [operator workflow](./ty2025-form8886-otsa-export.md).

The [Form 8886 instructions](https://www.irs.gov/instructions/i8886) and
[Publication 550](https://www.irs.gov/publications/p550) were rechecked. They
establish transaction-level disclosure but the reviewed passages do not resolve
the shared-spouse copy policy. No combined/separate-copy rule is inferred from
that absence. This remains part of the existing parent task, not a new future
item. No actual delivery or IRS acceptance is claimed.

## Historical baseline — before the isolated candidate

Status: `IRS8886` exists in the checked-in TY2025 MeF schema, but the Form 1040
graph has no public `f8886` source, native descriptor, PDF descriptor, or
complete return-level reportable-transaction decision. A bounded high-loss
disposition preflight now blocks both exports pending review. The wider filing
gap remains open. The `IRS8886` text in the Form 8621 descriptor
is an allowed reference-document name, not a Form 8886 builder or a finding
that any PFIC item is reportable.

The [IRS Form 8886 instructions](https://www.irs.gov/instructions/i8886)
require a disclosure for each reportable transaction in which the taxpayer
participated, generally with the return for every participation year. The
categories are listed transactions, confidential transactions, transactions
with contractual protection, loss transactions, and transactions of interest.
The listed/interest determination depends on current published guidance and
substantially similar strategies, not a form number alone. Confidential and
contractual-protection determinations need advisor terms, fees, disclosure
restrictions, and refund/contingency rights that are not present in the
existing income-form inputs.

There is a concrete silent-filing exposure. `form4684` can route a large
business casualty/theft loss to Form 4797 or Schedule D; `f1099b`/`f8949`
can route a large per-transaction capital loss; partnership and S-corporation
K-1 inputs can carry large allocated losses. None produces a Form 8886
document. For individuals, the IRS loss-transaction category can apply to a
section 165 loss of at least $2 million in one year, $4 million over the
transaction year and five succeeding years, or $50,000 for a section 988
foreign-currency loss. Pass-through losses are assessed without entity-level
netting, and the threshold uses the full section 165 loss before offsetting
gains and other limitations. A large entered loss is therefore a review
signal, not proof that disclosure is required: the current fields do not
identify the whole transaction, prior/subsequent-year losses, section 165 or
988 character, applicable published exceptions, or material-advisor facts.
Conversely, a smaller tax item could still be listed or otherwise reportable.
Do not silently conclude that the absence of `f8886` means no disclosure.

The first implemented screen reads each `f8949.f8949s` and
`f1099b.f1099bs` source row, as well as finalized Form 8949 rows, before
offsetting other sales or applying row adjustments. When `cost_basis -
proceeds` is at least $2 million on one row, both MeF and PDF export stop
with a named Form 8886 review error. This catches an individual-year
threshold signal even when an adjustment reduces the filed net capital loss.
It does not classify the row under section 165, apply a published exception,
or infer that smaller losses are safe. Source guard cases for the exact
threshold, both input arrays, both export paths, and a below-threshold row
are written for the deferred batch. A second bounded screen reads the Form
4684 business property's FMV decline, adjusted basis, and insurance, then
stops both exports when the resulting pre-netting casualty loss reaches $2
million. Exact-threshold, insurance-reduced, and below-threshold cases are
authored for the deferred batch. Neither screen determines whether section
165 or a published exception applies. Multi-property casualty, K-1, section
988, multi-year, listed/confidential, contractual-protection, and
transactions-of-interest screening remain open.

A correct public source needs a stable transaction identity and participation
years; all applicable category flags with the governing notice/regulation for
listed or interest transactions; source-linked tax consequences and anticipated
benefits by year; section 165/988 gross loss and multi-year history; published
exception/protective-disclosure facts; material-advisor and promoter identities,
fees and reportable-transaction numbers; pass-through entity identities and
K-1 receipt dates; complete transaction steps, parties, business purpose,
agreements and tax-result protection. It must reconcile each claimed benefit
to the actual return source rather than merely accept a disclosure narrative.
The [IRS line instructions](https://www.irs.gov/instructions/i8886) require
those descriptions, amounts and participants, plus ordered continuation sheets
where the official form is too small. A high-loss screening step should raise
review, not manufacture an `IRS8886` from an amount alone.

The initial disclosure has an additional workflow outside MeF: an exact,
word-for-word copy of the Form 8886 filed with the electronic return must also
be mailed or faxed to the IRS Office of Tax Shelter Analysis (OTSA). That copy
needs its own final-artifact identity and delivery/confirmation record; a MeF
attachment or PDF preview does not send it. Subsequent years, late K-1
relief, later IRS designation as listed/interest, and amended/carryback returns
have distinct timing rules. The current app has no such workflow. It should
not claim the disclosure is complete until both the return attachment and any
required OTSA delivery are accounted for.

The disclosure serializer, PDF, OTSA workflow, and full review source are not
implemented. No tests, typecheck, XSD validation, or filled-PDF rendering ran
after this screen was written.

## October 7: current official source and OTSA handoff review

The [current IRS form page](https://www.irs.gov/forms-pubs/about-form-8886)
still links the two-page December2019 Form8886. Its retained canonical PDF has
**98 fields (65 text/33 checkbox)**; SHA256
`adeb7087e9726763bde7846d02774a271c7855e5a4aaa24b78ed7efce800629b`.
This is a blank-template inventory, not a filled review. The local TY2025v5.4
ReturnData1040 includes IRS8886 with unbounded copies; the IRS8886 type has
32 ordered top-level elements. Its TaxYearDt uses YYYY-MM, and its multiline
7e continuation has a dedicated schema. Those facts establish schema scope,
not a supported source or filing route.

The [April2026 mailing update](https://www.irs.gov/forms-pubs/update-to-mailing-address-in-instructions-for-form-8886-reportable-transaction-disclosure-statement-rev-october-2022)
confirms this destination:

```
Internal Revenue Service
1973 Rulon White Blvd.
OTSA Mail Stop 4915
Ogden, UT 84201
```

The [OTSA/electronic-return instructions](https://www.irs.gov/instructions/i8886)
require matching disclosure content on the official form. The initial-copy
handoff must bind the final form and ordered statements to the return's
transaction/document IDs, retain their page counts and hashes, and record the
applicable deadline and delivery evidence separately. Fax guidance permits one
copy per transmission, up to100 pages; its cover identifies sender, taxpayer,
date and page count but omits SSN/EIN. Retain the complete fax log: IRS provides
no separate receipt. Preparation, MeF acceptance and OTSA delivery therefore
need distinct states; none is accomplished by generating a preview.

The live fresh full regression has already printed **both existing screening
checks as passing**: gross disposition and business casualty thresholds in
both exporters. Its overall result remains pending. This supersedes the
historical unrun-screen wording only for those two checks, not for the absent
source, disclosure serializers, filled packet or OTSA delivery. No Form8886
route is registered or opened, and no disclosure was sent.

Private evidence is
`.state/research/board-execution-2026-10-07/form8886-current-source-review-20261007/`:
canonical template, complete AcroForm inventory, four current official HTML
sources and local schema/partial-log observations. Review SHA256
`d4b43f71219442da9796fa2c19c91140593f41a93777185c21b5de7cd556bc9c`. The newly found RTN workaround is recorded only in the board's
future_todo section and is not implemented.

## October 8 isolated implementation checkpoint

The isolated branch `codex/form8886-disclosure-oct8` contains a typed
source, IRS8886 serializer with linked narrative/general continuations,
official-template PDF renderer, and hash-bound OTSA preparation/delivery
controls. The pre-K-1 affected batch passed **144/0**: six source, seven native,
three calendar, nine capital/packet, five whole-return native-linking, eight
identity, five final-native-binding, eight casualty-source, 66 direct-sale,
16 casualty-node, six casualty-native and five casualty-PDF mapping checks.
Native XSD cases cover parent/continuation roots, reconstruction, original
additional RTNs and amount boundaries. The deferred RTN workaround is untouched.

Capital links now resolve the actual retained broker/direct-sale source row,
validate its owner and 2025 date, verify its reviewed typed-row fingerprint,
and check real calculated sale rows, Schedule D and the limited Form 1040
line 7 result. A 2,000,000 gross source loss remains distinct from the 3,000
current deduction. Fingerprints bind entered facts; they do not authenticate
an issuer or infer whole-lifetime benefits or legal reportability.

Business-casualty links additionally retain a source owner and workpaper/
event ID on the existing Form 4684 schema. The typed fingerprint excludes AGI,
which is derived return context. Reconciliation reuses current native property,
2025 date, holding-period/whole-dollar validation and real Form 4797/Schedule
1/1040 joins after normal `buildPending` preparation. It validates changed
source facts even after recalculation, independently owned spouse sources,
simultaneous capital/casualty links and caller snapshots. Zero-loss sources
cannot stand in for a current modeled casualty deduction. This advances source
reconciliation; it does not establish tax-limit or filing support.

The large business-loss replay reveals a separate Form 461 concern: pending
contains only MFJ filing status, and the 2,000,000 casualty remains unadjusted
on Schedule 1/1040 despite only employee income. The
[2025 Form 461 instructions](https://www.irs.gov/instructions/i461) require
business-loss review including Schedule 1 line 4, with employee income excluded
from business netting. This discovery is recorded only in the board's
future_todo and is not implemented. Public Form 8886 guards remain intact;
no valid large-business-loss filing is claimed.

Source-bound packet preparation snapshots source, calculated pending data,
filer and canonical template before asynchronous work. Its name/address come
from the reconciled return source. A private independently owned primary/spouse
replay has two disclosures, four reviewed PDF pages, statement numbering 1/2
and 2/2, zero widgets/fields, and unchanged hashes under caller mutation.
Missing links, changed Form 1040 joins, missing source address and invalid
template bytes are rejected. This is separate-owner mechanical evidence;
a policy for a joint disclosure of the same transaction remains unfinished.

Earlier reviewed evidence covers two-page forms, three-/eleven-page fax
packets, a ten-page overflow packet, and a four-page additional-list packet.
Shared preparation preserves exact original PDF bytes separately from fax
transmission. No real transmission or accepted return exists.

Native return fragments now split IRS8886, its expected-benefit continuation
and GeneralDependencySmall into distinct ReturnData slots, remove temporary
root IDs, and relink continuation references to whole-return allocated IDs.
Repeated-copy tests include another form and an unrelated general dependency;
missing/extra allocations, duplicate IDs and unresolved references are rejected. Private five-
and six-document Return1040.xsd replays use actual calculations and the real
`buildPending` normalization/registered native builders. The six-document
case has IRS8949 between IRS8886 and the continuation roots. Native line 7 is
-3,000 and the disclosure PDF is byte-identical to the ten-page reviewed
baseline. Putting IRS8949 after the continuations fails full-return XSD.
These are staged structural replays, not a public exporter or business-rule
pass; the existing public two-million-loss guard is explicitly verified.
Authentic packets can now bind final allocated native documents without
regenerating the PDF. Finalization permits only IDs and their exact matching
references; text, amounts, document associations and order must remain exact.
It retains the preparation XML hash, records final native IDs and replaces the
per-disclosure XML hash with that of its final native document bytes. The
existing OTSA preparation/transmission/delivery APIs accept this finalized
packet and reject a synthetic delivery record with the stale pre-allocation
XML hash. Source/PDF hashes remain unchanged. The ten-page disclosure and
11-page fax bytes match the previously reviewed baselines exactly; no fax was
sent. Public integration still needs to call finalization with the validated
whole-return allocation and retain the complete return/package evidence.

The code remains unregistered on the public Form 1040 graph. Other current-
return source families (including K-1 and other casualty branches), joint-disclosure policy,
foreign filer projection, public intake/CLI/registry integration, global native
document ID/order integration and full-return business rules remain unfinished.
Existing loss review guards apply. See the
[execution evidence](../../../../readiness/ty2025-readiness-execution-2026-10-07.md)
for exact scopes and private checkpoints.


## October 9 K-1 capital checkpoint

All three retained K-1 capital families now have staged Form 8886 source
adapters: partnership, S corporation and trust/estate. Optional 2025 source-year
metadata on the existing typed rows is required for these links. Each link
selects short/long capital character, resolves exactly one issued-row reference
and issuer EIN, verifies the disclosure recipient, fingerprint and matching
received pass-through entity/name/EIN/type. Repeated components require an
allocation review rather than silently duplicating the same K-1 amount.
Actual Schedule D lines 5/12, code S source metadata, calculated print totals
and limited Form 1040 line 7 are reconciled through existing validators.

Receipts separate current issued gains/losses, supplemental partnership code S
amounts and inherited trust final-year capital-loss carryovers. These entity net
amounts are not gross transaction losses or proof of section 165 reportability.
The typed affected batch passes **391/0**: the previous 144 scopes plus eight
K-1 source cases, 83 partnership, 71 S-corporation, 51 trust and 34 native
Schedule D cases. The first focused invocation failed type checking on two
untyped test mutations; parsed schemas corrected them without weakening types.
A focused retry passed 24/0 before the final eight-case/broader batch.

The private native-only replay emits IRS1040, IRS1040ScheduleD and three IRS8886
copies from actual calculated rows; full Return1040 XSD validation passes and
native CapitalGainLossAmt is -3000. It proves source-owner reconciliation and
structure, not a dedicated native taxpayer identity for each disclosure: the
joint return header supplies identity and per-copy owner/joint-disclosure
policy remains unfinished. No new PDF/exact-copy claim, issuer authentication,
public integration, transmission or IRS acknowledgment is added. Ordinary K-1
losses, deductions and credits remain part of the existing task.

Private evidence: isolated `.state/research/form8886-pdf-replay/k1-native-return-check.ts`,
`k1-native-return-review.json` and `k1-source-bound-full-return.xml`; root checkpoint
`.state/research/board-execution-2026-10-08/form8886-isolated-k1-capital-checkpoint.json`.


## October 9, 00:11 — explicit native disclosure taxpayer

The existing per-copy ownership work now prefixes the native expected-benefit
narrative with the validated disclosure taxpayer SSN. A joint return header
alone does not distinguish separately owned copies; the source, printable
narrative and original PDF are unchanged. Native chunk boundaries retain the
prefix and all original narrative words, without putting an SSN in an EIN field.
The prior checkpoint's missing native per-copy identity is superseded by this
explicit narrative evidence; legal joint same-transaction policy is still open.

The affected batch passes **392/0**. Final-binding tests were also rerun **5/0**
after adding changed/removed taxpayer-prefix rejection. Full-return capital and
three-K-1 XSD replays pass; the latter independently confirms native copy SSNs
111223333, 444556666, 111223333. The authentic finalized-native OTSA replay
retains byte-identical reviewed ten-page disclosure and eleven-page fax PDFs,
updates its XML fingerprint and rejects stale preallocation delivery hashes.
All transmission/delivery evidence remains synthetic. No new PDF layout,
accepted IRS result or public filing route is claimed. Ordinary K-1 source
paths, joint policy, foreign filer handling and public integration remain open.

Current evidence: root `.state/research/board-execution-2026-10-08/form8886-native-owner-checkpoint.json`;
isolated `native-owner-tests.log`, `native-owner-binding-tests.log`,
`k1-native-return-review.json`, `native-return-review.json` and
`native-bound-handoff-review.json` in `.state/research/form8886-pdf-replay/`.
Earlier checkpoint hashes are historical; current replay hashes are retained
in the new checkpoint rather than relabeling previous runs.


## October 9 — K-1 activity source reconciliation

The isolated candidate now links partnership, S-corporation and trust/estate
ordinary activity components to retained 2025 source rows, exact issuer/entity
references, recipient ownership and typed row fingerprints. Actual finalized
Schedule E rows, Schedule 1 line 5 and Form 1040 line 8 are reconciled. Trust
rows must remain present even if a caller makes the aggregate totals agree.
Repeated components and unsupported negative branches remain guarded; those
branches are unfinished existing scope, not approved exclusions.

For the modeled first-year passive S-corporation ordinary loss, receipts
separate the issued loss from the amount allowed after basis and passive limits.
The -4,000 issued loss with 1,000 basis produces allowed loss 0, 500 or 1,000
at the tested passive-income limits, including a spouse-owned joint case.
Activity amounts are not proof of gross section 165 transaction losses or
legal reportability. Optional source-year metadata also passes the existing
strict passive-source adapters without changing their calculations.

The sourced positive private replay retains three disclosure copies, Schedule E
income 31,000 and an 18,000 combined qualified-business-income contribution
(12,000 primary partnership plus 6,000 spouse S corporation), yielding a 3,600
Form 1040 deduction. Typed qualified QBI statements are required; the original
missing-statement input is independently rejected by public native export.
Two preparation repairs preserve these existing claims: omit absent passive
income sources rather than supply an invalid empty array, and sum Form 8995
QBI contributions in shared export preparation instead of retaining only the
last contribution. Other calculated-line version arrays retain their existing
behavior.

The checked private full Return1040 XML passes the cached IRS XSD with 11 roots:
1040, Schedule 1, Schedule E, three Forms 8886, Form 8995, W-2 and three general
dependencies. Explicit native disclosure owners remain primary/spouse/primary.
This is source/calculation/native structural evidence only: no new PDF layout,
issuer authenticity, legal reportability, joint same-transaction policy,
public Form 8886 registration, transmission or IRS acceptance is proved.
Private evidence is retained under the isolated
`.state/research/form8886-pdf-replay/` in
`k1-activity-native-return-review.json`, `k1-activity-source-bound-full-return.xml`
and `k1-activity-native-check-normalized.log`.

Final post-repair affected verification passes **570/0**, exit 0, including
native Form 8995 and shared preparation suites. The earlier 119/0 focused and
512/0 pre-final broad results are historical, not additional distinct coverage.
Root checkpoint: `.state/research/board-execution-2026-10-08/form8886-isolated-k1-activity-checkpoint.json`.


## October 9, 2026, 00:40 Stockholm — separate owners in a shared arrangement

The previous goal turn made progress: final affected verification passed 570/0
and current K-1 activity/QBI native evidence was recorded. This turn compacted
learnings before work, then advanced the existing same-transaction owner path.
The candidate preserves the original arrangement ID on two separately owned
disclosures when both participation rows supply the same explicit shared-review
reference. Same-owner duplicates, missing/unpaired/conflicting reviews, a third
copy and conflicting known issued transaction numbers are rejected. Retained
source recipient and finalized return-owner checks still apply; sharing an
arrangement does not duplicate or merge the actual K-1 tax items.

The [IRS instructions](https://www.irs.gov/instructions/i8886) and
[26 CFR 1.6011-4](https://www.law.cornell.edu/cfr/text/26/1.6011-4) require disclosure
by participating taxpayers. Neither reviewed text supplies an explicit
joint-spouse copy rule. Keeping two independently reviewed participant copies
is a staged representation, not proof of a legally required or accepted joint
filing format. Legal joint-copy policy, public registration and issuer evidence
remain open existing scope.

Final Form 8886 checks pass **66/0**, exit 0. The initial attempt failed type
checking on an unnarrowed receipt union in the new test; a property guard fixed
the test without weakening production types. The checked private full-return
replay passes IRS XSD with two receipts sharing the arrangement ID, separate
primary/spouse native SSNs, Schedule E income 31,000 and QBI deduction 3,600.
The trust disclosure remains separately identified. All 11 roots and their
references remain valid. No new PDF rendering, exact-copy/OTSA delivery claim,
transmission or accepted IRS result is added. The prior 570/0 broad run remains
historical; it is not relabeled as a post-shared-arrangement run.

Main board remains byte-identical to HEAD (52 open); all 65 future items stay
deferred. Technical estimate remains 75% of individual ATS checks, rough
60–85% range. Checkpoint: `.state/research/board-execution-2026-10-08/form8886-shared-arrangement-checkpoint.json`.


### October 9, 2026, 00:46 Stockholm — foreign Form 8886 packet owner

Previous goal turn was progress (shared arrangement source representation,
66/0 checks and private XSD). This continuation compacted board learnings first
and implemented the existing foreign-filer packet gap in the isolated candidate.
Preparation derives the mailing address from retained general input, verifies
all six foreign address fields against calculated Form 1040 and the native
filer header, and validates the IRS country code. Each PDF points to an ordered
foreign-address continuation carrying the exact owner, SSN and statement number.
The continuation prints the complete street/unit/city/province/postal address
and full country name; domestic address projection is unchanged.

Final typed Form 8886 checks pass **67/0**, exit 0, including changed header
country/postal/unit, changed calculated city and unknown-country rejection.
The initial test typecheck failed because the foreign FilerAddress fixture
omitted required domestic state/ZIP string members; empty strings corrected
the fixture without changing production types. A checked private replay with
a W-2 then hit the pre-existing employee-U.S.-address guard. That source remains
unsupported and the failure is retained, not counted as a pass.

A separately identified **wage-free** K-1 return passes full Return1040 XSD:
10 roots, Schedule E/1040 additional income 31,000, and actual QBI deduction zero.
This differs from the prior 200,000-wage U.S. fixture with a 3,600 deduction.
Three authentic prepared disclosure packets have four pages each. Every page
was rendered and visually inspected: correct primary/spouse/primary identity,
1/2/3-of-3 numbering, entity marks, foreign address on page 3 and remaining
Other-benefit text on page 4. Reopened PDFs have zero widgets/fields; expected
address text and packet SHA256 hashes match. Native ForeignAddress retains
street, apartment, Stockholm, province, postal code and country SW; the PDF
prints Sweden. This proves mechanical source/native/PDF address representation,
not legal category authentication, accepted joint-copy policy, public filing
registration or a new finalized-native OTSA delivery workflow.

The broad 570/0 batch and shared-arrangement 66/0 result remain historical.
Two discoveries were appended only to future_todo: foreign W-2 employee address
handling, and audit of broader source/calculated/native name/address comparison.
Neither deferred item was implemented. Main remains byte-identical to HEAD,
52 open; future queue is now 67. Estimate remains 75% of individual ATS checks,
rough range 60–85%.

Evidence: `.state/research/board-execution-2026-10-08/form8886-foreign-owner-checkpoint.json`;
isolated `.state/research/form8886-pdf-replay/foreign-owner-tests-final.log`,
`foreign-owner-native-return-review.json`, `foreign-owner-packet-review.json`
and `foreign-owner-visual-review.json`. The three private PDF hashes are retained
in these records; they are review fixtures, not user filing deliverables.


### October 9, 2026, 00:50 Stockholm — prepared Form 8886 return binding

Previous goal turn was progress: foreign packet projection, 67/0 checks, full
XSD and 12-page visual evidence. This turn compacted learnings first and added
the preparation boundary needed before public native integration. The factory
now records a filer fingerprint and retains authentic bundle identity. The
verified native-fragment entry point requires that exact factory result and
matching current disclosure, calculated pending data and filer snapshots, then
rechecks the retained source joins. Low-level serialization remains a separate
helper for synthetic layout tests; it is not an authenticity check.

Final Form 8886 checks pass **69/0**, exit 0. An unmodified 106,654-byte official
blank template is now a local test fixture with the factory's pinned digest,
so successful preparation and stale-input controls run in the normal suite
without the private research directory or network. The tests cover copied
bundles, stale disclosure text, changed return totals, changed filer address,
failed calculations, asynchronous preparation snapshots and isolated PDF byte
copies. No source or calculation type was weakened.

A checked private replay also rejects a reordered copied bundle and changed
filer name. All three regenerated in-memory PDF hashes match the previously
reviewed foreign packets exactly; no PDFs were overwritten or newly delivered.
This is preparation/assembly provenance, not issuer authentication or evidence
that an initially inconsistent general/header pair was valid. The wider
header-reconciliation review remains future-only. Public registry integration,
remaining source branches, joint-copy policy and full filing/ATS gates remain
open. The 570/0 affected run and earlier XSD/visual records retain their original
scopes; they were not rerun or relabeled as current full-release verification.

Main stays byte-identical to HEAD (52 open), future queue stays 67 deferred,
and the estimate stays 75% of individual ATS checks (rough range 60–85%).
Checkpoint: `.state/research/board-execution-2026-10-08/form8886-prepared-return-binding-checkpoint.json`.
Current private logs: `prepared-return-binding-portable-tests.log` and
`prepared-return-binding-check.log` under the isolated
`.state/research/form8886-pdf-replay/`.


### October 9, 2026, 00:57 Stockholm — whole-return Form 8886 finalization

Previous goal turn was progress (authentic prepared bundle and native-fragment
entry, 69/0 checks). This continuation compacted learnings first and implemented
the finalization stage needed for integration with return assembly. It consumes
the same ordered, linked fragments used immediately before global document-ID
injection, verifies the exact prepared disclosure/continuation set, validates
whole-return document references, and binds all owned packets to the allocated
IDs. Unknown Form 8886 slots, missing or swapped copies and altered continuation
content are rejected. The resulting bundle retains factory authentication and
current source/calculation/filer fingerprints. Its PDF bytes and source receipts
are preserved; packet XML hashes describe final per-disclosure native documents.

Final Form 8886 verification passes **70/0**, exit 0. The real-template case
uses primary/spouse source rows and both dedicated expected-benefit and general
continuations, with unrelated return documents interleaved. It verifies final
IDs, unchanged PDFs, preparation/final XML digests, rejection controls, and an
immutable fragment snapshot during asynchronous finalization.

The checked private foreign-owner, wage-free replay passes full Return1040 XSD
with 10 roots. Every final packet native fragment is found verbatim in that
validated return. The three PDFs have the exact hashes from the prior 12-page
visual review; no PDF files were overwritten or newly delivered. Authentic
OTSA plans retain the final native digest and original PDF digest for each
copy. These are preparation plans only: no fax, mail or accepted IRS result
exists. The full-return XML hash is retained separately from the per-packet
native hashes.

The public MeF/PDF registries are still unchanged. Remaining source branches,
legal joint-copy policy, public integration and release/ATS gates remain open;
the standalone finalizer does not substitute for those requirements or validate
unrelated tax amounts. The historical 570/0 affected batch retains its original
scope. Main is byte-identical to HEAD (52 open), all 67 future items remain
deferred, and the estimate stays 75% of individual ATS checks (rough 60–85%).

Checkpoint: `.state/research/board-execution-2026-10-08/form8886-whole-return-finalization-checkpoint.json`.
Current isolated evidence: `whole-return-finalization-snapshot-tests.log`,
`whole-return-finalization-check.log`, `whole-return-finalization-review.json`
and `whole-return-finalization-source-bound-full-return.xml` under
`.state/research/form8886-pdf-replay/`.


### October 9, 2026, 01:07 Stockholm — Form 8886 real MeF/PDF builder integration

The isolated `codex/form8886-disclosure-oct8` candidate now registers the parent,
expected-benefit continuation and GeneralDependencySmall disclosure descriptors
in schema order. `buildMefBundle` accepts the authentic prepared disclosure,
its reviewed source and executor result, checks the same normalized pending
return and filer, snapshots caller inputs, and binds packets to the actual
final whole-return IDs. Forged packets, changed disclosure text, a different
pending calculation and caller mutation during preparation have explicit checks.
`assertPreparedBundleProjection` replays the disclosure descriptors. The PDF
builder appends the exact prepared owner copies, checks their digests and native
membership, and records page origins; OTSA preparation retains those same copy
hashes and the final native hashes. No binary duplicate of native Form 8886 is
introduced.

The final targeted command passes **232/0**, exit 0 (71 Form 8886 checks plus
MeF builder/document-identity coverage). The paired synthetic protective
case uses independently owned broker losses of 2,000 each; actual Schedule D
is -4,000, Form 1040 capital loss/AGI -3,000, taxable income and total tax zero.
Both disclosures retain anticipated lifetime benefits of 2,000,000; this is
separate from current realized losses and is not a determination of reportable
transaction classification. The actual eight-root return passes full cached
2025v5.4 Return1040 XSD, including both dedicated and general continuations.
Native inventory is **155 descriptors/151 keys** in this candidate; root main
remains 152/148. PDF registry is unchanged at **118/115**; disclosure pages use
the authenticated prepared-copy append path.

All **12 pages** of the actual combined PDF were inspected. Pages 5–8 and 9–12
retain the two owners, SSNs, statement numbers 1/2 and 2/2, protective/initial
marks and ordered narrative continuations without clipping. Reopening finds
zero AcroForm fields/widgets. Pages 1–4 retain the calculation totals, but
Schedule D's name is blank for this manual filer lacking optional `fullName`,
and its line 21 shows a signed negative inside the printed parentheses. These
presentation findings are retained only in `future_todo`; the complete PDF is
qualified rather than approved as filing-ready.

Full-return XML SHA-256:
`30c924ab82d601afd22428191522aecb664e7a07cf18a92bb51a9892ad732381`.
Combined PDF SHA-256:
`058f812e27abba5aa823e59eb9ed5bd76e7147e1e7ecd98ec62548a24b3857d5`.
The one-case replay also passes. An earlier paired test failed only because its
changed-text negative fixture accidentally removed the second shared copy;
that fixture was corrected before the final 232/0 run. The first scratch replay
was excluded by the repository test discovery configuration and did not run;
the retained absolute-path replay executed successfully.

This completes a bounded builder integration, not the Form 8886 parent.
General public intake, the existing large-disposition/casualty guards, other
source branches, joint-copy legal policy, release tests and IRS gates remain
open. No fax, mail, IRS transmission or acceptance occurred. Main checklist
remains byte-identical to HEAD: 52 open; all 68 future items remain deferred.
The estimate stays 75% of individual ATS checks (rough 60–85%).

Checkpoint: `.state/research/board-execution-2026-10-08/form8886-real-builder-checkpoint.json`.
Isolated evidence under `.state/research/form8886-pdf-replay/`:
`mef-builder-paired-final-tests.log`, `mef-builder-paired-visual-replay.log`,
`mef-builder-paired-review.json`, `mef-builder-paired-visual-review.json`,
`mef-builder-paired-full.xml`, `mef-builder-paired-full.pdf` and all 12 page renders.


### October 9, 2026, 01:15 Stockholm — public Form 8886 input and covered capital losses

The isolated candidate now exposes `f8886` as a validated singleton public input.
It retains disclosure facts without generating tax amounts. Ordinary
`f1040_2025.prepareReturn` replays the retained `pending.start` input through the
actual executor and compares the complete normalized pending graph before
preparing the canonical disclosure copies. Missing intake, changed disclosure,
changed calculation and unresolved replay diagnostics reject preparation.
Filer, pending, attachments and retained bytes are captured before asynchronous
work. Raw XML/PDF builders reject entered disclosures without the authenticated
prepared-return path; an authentic packet for different public facts also fails.

The existing large-capital-loss screen now requires matching authenticated
coverage of **every** triggering broker/direct-sale record. The preparation
factory privately retains canonical rows only after their source hashes and
recipient-to-disclosure joins reconcile. Neither a copied packet record, the
same loss amount on a different sale, nor disclosure of only one of two large
sales satisfies the screen. This change does not remove the separate large
business-casualty guard; the Form 461 discovery remains future-only.

Final targeted verification passes **274/0**, exit 0, covering 73 Form 8886
checks plus prepared-return, attachment coverage, generated start-node,
MeF builder/document identity and existing CLI export tests. This is not a
full regression or a matching IRS business-rule result. The initial public
17/0 run was followed by capital-screen coverage; an early mixed-sale test
asserted a nonexistent Schedule D property and was corrected to the actual
`print_line15_lt_total` field before the final batch. An earlier test-only
readonly mutation failed type checking; its caller fixture was corrected
without weakening runtime types.

The ordinary public-input positive has a primary broker loss of 2,000,000 and
spouse direct-sale loss of 2,000,000, each tied to its own disclosure. The
actual Schedule D has -4,000,000, Form 1040 loss/AGI -3,000, taxable income and
total tax zero. Its five-root complete return passes cached 2025v5.4
Return1040 XSD. Full-return XML SHA-256:
`0e4f848f1cd8e6854963e6e02903e41de50962f1562bd604f5283201492569d3`.

All **nine combined PDF pages** were visually inspected: Form 1040 (1–2),
Schedule D (3–4), spouse direct-sale Form 8949 Part II (5), primary disclosure
(6–7) and spouse disclosure (8–9). Both disclosure owners, statement counts,
initial-year/loss marks, amounts and descriptions agree with their source.
The page-5 sale and page-3 broker/direct-sale totals reconcile. Reopening finds
zero fields/widgets. The existing Schedule D line-21 signed-negative display
remains a future-only qualification; the standard identity extractor supplies
the primary name here, unlike the earlier manual-filer case. Joint name display
is retained for future review without changing that extractor or PDF mapping.
Combined PDF SHA-256:
`fc628e58edf586c2dc2f15b0806c762c6e6661da89f9eb458061613ace575b8a`.
Both separately prepared OTSA plans retain the exact corresponding PDF and
final native-copy hashes; no fax, mail, delivery or IRS acceptance occurred.

Public input count is 189 in the candidate. Native descriptors remain 155/151
keys, PDF descriptors 118/115 with prepared disclosure copies appended. The
Form 8886 parent stays open for remaining sources, joint-copy legal policy,
casualty disposition, complete user-facing OTSA handoff/delivery workflow and
release/IRS gates. Main checklist stays byte-identical to HEAD (52 open), all
68 future items remain deferred, and the estimate remains 75% of individual
ATS checks (rough 60–85%).

Checkpoint: `.state/research/board-execution-2026-10-08/form8886-public-intake-checkpoint.json`.
Isolated `.state/research/form8886-pdf-replay/` evidence:
`public-intake-final-tests.log`, `public-large-loss-visual-replay.log`,
`public-large-loss-review.json`, `public-large-loss-visual-review.json`,
`public-large-loss-full.xml`, `public-large-loss-full.pdf` and all nine page renders.


### October 9, 2026 — separate OTSA CLI export verified

The isolated `codex/form8886-disclosure-oct8` candidate now exposes `return export-otsa`. It prepares one hash-bound disclosure copy per reviewed request, separate fax cover packets where required, and a manifest written after all referenced files. Existing output directories, draft output, missing/duplicate/unknown requests, forged prepared objects and changed native bytes are rejected. Subsequent disclosures without an OTSA-copy requirement produce no handoff file. See [operator usage](./ty2025-form8886-otsa-export.md) for the request contract.

The affected batch passed **276/0**. An actual CLI subprocess replay passed **1/0** (one unrelated case filtered); the emitted reference XML passed the retained full Return1040 XSD. All export file hashes match the manifest. The primary two-page disclosure, its three-page fax packet, and the spouse two-page disclosure have complete seven-page visual review; flattened PDFs have zero fields/widgets and the fax cover omits both taxpayer TINs.

This unsigned synthetic return fails F1040-310-03, F1040-311-03, IND-418, IND-434 and IND-435. Default export rejects it; the review export explicitly records `business_rule_force_requested: true`. This is not a business-rule pass. Manifest status remains `prepared_not_sent`, with no delivery or IRS acceptance. The successful request is reproducible from the retained private replay fixture; its on-disk request JSON was subsequently replaced by a negative-test request.

Evidence: `.state/research/board-execution-2026-10-08/form8886-otsa-export-checkpoint.json` retains worktree/runtime/log hashes, exact export manifest, rendered-page hashes and mechanical review. No parent task is closed: joint-copy legal policy, remaining source families, durable delivery records and external IRS gates remain open. Main/future counts stay **52/68**; estimated individual ATS-check pass rate stays **75% (60–85%)**.


### October 9, 2026 — durable reviewed OTSA delivery record

The isolated candidate now provides `return record-otsa-delivery`. It replays the current stored return with the original preparation timestamp, compares the complete original export manifest and every file hash, and applies the existing authentic handoff delivery validator. Exports now retain the preparation timestamp and a digest of all handoff requests, including fields that do not change a mail PDF. New receipt directories retain evidence bytes, the original manifest and a final `delivery.json`; existing records are never overwritten. The original export remains unchanged.

The expanded affected batch passes **276/0**; an actual CLI receipt replay passes **1/0** with one unrelated test filtered. Negative checks reject wrong owners/destinations, dates before preparation, wrong evidence digests, changed fax bytes, changed manifest/request data and existing receipt directories. The recorded synthetic April 16 delivery is correctly late against April 15. Reference XML passes full Return1040 XSD, and all three PDF hashes equal the prior seven-page visually reviewed exports. No new PDF layout is claimed.

The receipt represents operator-reviewed evidence, not independently authenticated provider delivery or IRS acceptance. The synthetic unsigned return retains its five signature/name business-rule failures and explicit `--force`; both manifest and receipt record the override. No actual fax, mailing or IRS transmission occurred. Earlier exports lacking the retained timestamp are rejected by this replay command. The parent remains open for joint-copy legal policy, wider source families, external source/prior-filing proof and IRS gates.

Evidence: `.state/research/board-execution-2026-10-08/form8886-otsa-delivery-checkpoint.json` contains runtime/log hashes, retained manifest/receipt, exact PDF hash reuse, negative cases and scope. The main board remains 52 open with 68 future-only items; estimated individual ATS-check pass rate stays 75% (60–85%).
