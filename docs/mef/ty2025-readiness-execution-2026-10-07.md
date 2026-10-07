# TY2025 existing-board readiness execution — October 7, 2026

The current request resumes existing board work for MeF testing. Learnings were
compacted before execution; the 52 active checklist entries remain byte-identical.
New discoveries were added only to `future_todo` and were not implemented.
This record supplies evidence for the existing validation and coverage tasks;
it does not introduce a new execution queue or close a broad parent.

## Current inventory and native preflight

At `0c6ae76a32d12373956d4f8e47564811185c60d7`, runtime imports contain
152 native descriptors / 148 keys and 118 PDF descriptors / 115 keys.
The current planner contains 372 synthetic fixtures and covers 99 PDF keys,
leaving 16 uncovered. The board's 182-case wording is historical; its frozen
requirement is unchanged. Existing named-form and coverage decisions still apply.

All 372 fixtures completed public calculation and native bundle preparation:
361 prepared and 11 rejected. This is not an XSD, printable-packet, business-rule
or ATS pass. The rejected cases are one Form 8862 CTC fixture, two W-2G
payer-copy fixtures, seven Form 8874 direct-QEI fixtures, and one Form 461
fixture whose calculation lacks the current sourced QBI-loss route.
No source guard was removed. The Form 461 review-fixture discrepancy is recorded
for future planning only. The exact per-case diagnostics, registered keys,
planner and replay script are retained privately under
`.state/research/board-execution-2026-10-07/`.

## Current integrated regression

The corrected normal `deno task test` command is running from commit
`fc9b4a081` against the current integrated runtime, with the existing Poppler environment on PATH and
`DENO_V8_FLAGS=--max-old-space-size=8192`. Launch commit, UTC timestamp, exact
command and hashes of every tracked TypeScript/config file are in
`full-test-corrected.status` and `runtime-corrected-at-launch.json`. The wrapper records terminal
exit, timestamp, log digest, summaries and any changed runtime files after exit.
No terminal totals or full pass are claimed yet. The older V32 process was
verified live; its immutable source predates the released follow-up routes.

An initially separate ATS-focused command was deliberately stopped during
checking when the integrated full run superseded it. Its log and verified PID,
command and interruption reason remain in `ats-focused-interruption.json`.
It contributes no test count or passing result.

## Filled packet review

The initial unselected generator was deliberately superseded after complete
native preflight established eleven guarded cases. Its partial artifacts, log,
verified process/child identities and reason remain in `full-pdf-supersession.json`;
it has no completed manifest or full pass. Prior research is preserved in place.
A private copy of the generator now processes the explicitly selected 361
prepared fixtures through the same real graph, native bundle, full local v5.4
XSD and PDF builder. It records per-case errors rather than hiding them or
claiming excluded cases. Its final manifest names successful included cases
and every omitted fixture; any additional PDF/XSD rejection is recorded outside
the packet in `pdf-build-rejections.json`. No final selected manifest is claimed yet.
For each attempt, 80 canonical registered IRS templates were copied from the retained cache
without replacing any existing generated cache file; their source URLs and
SHA-256 digests are in `template-cache-seeding.json` and
`selected-template-cache-seeding.json`.

The seven regenerated full-share annuity packets match their previously reviewed
PDF and XML bytes exactly. Saved source JSON parses to the same complete data;
serialization bytes differ, so byte-identical source files are not claimed.
`annuity-prior-review-parity.json` records each comparison. The first five-page
packet was freshly rendered and all pages inspected: primary identity, Single
status, senior mark/deduction, Form 4972 election/NUA/annuity lines, tax 4,090,
Form 1040 line 16 mark, line 24 and amount owed all agree. No clipping or
unexpected copies were observed. `annuity-five-page-review.json` binds these
observations to source/XML/PDF digests. This bounded review does not close the
all-case visual gate or authenticate external issuer or prior-return evidence.

## ATS source and service recheck

The four current official PDFs for Scenarios 1, 8, 12 and 13 were downloaded
again. Every digest equals the October 4 retained revision; the known source
contradictions remain unresolved. URLs, bytes and digests are in
`ats-packet-recheck.json`. The [clarification draft](../ats/ty2025-irs-clarification-draft.md)
is retained; no question was sent to the IRS.

The [live IRS operational status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status)
continues to report ATS unavailable through October 13, 2026, 9:00 a.m.
Eastern, with reopening at 9:01. The [TY2025 version table](https://www.irs.gov/tax-professionals/tax-year-2025-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions)
still lists v5.4 as ATS-effective October 13. The secure location of the issued
enrollment/service/business-rule package was requested; no credentials,
transmission or accepted acknowledgment have been verified in this execution.
Local readiness work continues independently of that external gate.

The connected Drive folder was directly listed again: 20 files, the same May
IMF release and MeF R10.9/PY2026 WSDL, and no newly listed enrollment, current
ATS endpoint/trust or newer MeF service package. IRIS A2A archives in that folder
are a separate service. The IMF raw fetch returned a provider file reference,
but local materialization returned HTTP 403; no downloaded archive digest or
business-rule contents were verified. Both documented Downloads ZIP copies
are absent locally. `drive-prerequisite-recheck.json` records metadata and the
failure without bearer URLs or credential values. The matching-package gate
remains unverified; this does not prove the package was never issued elsewhere.

## Integrated regression correction

The initial full command has reported a calculated-return replay failure.
The exact checked focused reproduction finished **0 passed / 1 failed (2m44s)**:
`single-form8995a-two-business-aggregation` was sent through synchronous XML
export, which correctly requires a bundled annual-disclosure PDF. The production
route prepares successfully in the real bundle preflight; the audit chose the
wrong path. The initial full run is therefore a failed diagnostic, irrespective
of its eventual remaining totals.

The existing replay audit now uses `buildMefBundle` for every positive route,
with each fixture's attachment and retained-source bytes, and retains every
numeric tamper probe. Its formerly synchronous-only Form 8824 skip is removed;
the generated gain statement is prepared through the same real packet path.
The explicit guarded set becomes 11 and the positive audit scope becomes 361.
Production tax/source guards are unchanged. The corrected normal checked
`deno task test forms/f1040/2025/calculated_return_replay.test.ts` passed
**1 test / 0 failed (7m27s)**, covering all 361 positive fixtures and every
finite numeric Form 1040/Schedules 1–3 tamper probe. Eleven guarded fixture
IDs remain explicit; no extra fixture was silently omitted. Before/after source
hashes, reproduction and exact qualification are in
`replay-audit-correction.json`. The original full run's manifest will show this
single test-file change. The failed diagnostic was deliberately stopped after the focused repair passed;
its wrapper recorded exit 143 and exactly the changed replay-test file. The
verified process/children and reason remain in `full-test-supersession.json`.
The same full command was restarted at the committed repair; no corrected full
terminal result is claimed yet.

## Additional filled-output review

All nine pages of `optional-combined-below-minimum` were freshly rendered and
inspected against its complete saved source/pending and XML: MFJ identities,
primary-owned Schedule C loss −1,800, Schedule F profit 300, total additional
income −1,500, zero SE adjustment, QBI loss carryforward 1,500, standard
deduction 31,500, taxable income 143,100, tax 21,310 and refund 8,690 agree.
Checkboxes, continuation order and legibility were checked on every page.
`optional-below-nine-page-review.json` binds the page observations to the
source/XML/PDF and fresh render digests. This completes only that packet review.

All thirteen pages of `optional-net-boundary` were then rendered and inspected.
Primary-owned farm optional earnings 7,240, primary wage-cap isolation from
spouse wages, SE tax 1,249/half-SE 625, allocated QBI 7,267 + 947, deduction
1,643 and refund 5,665 agree across source/pending/XML/PDF. All page/checklist
observations and digests are in `optional-boundary-thirteen-page-review.json`.

All fifteen pages of `optional-spouse-cap-profit` were freshly reviewed.
Alex/Sam ownership on separate Schedule SE copies, spouse-only wage cap,
primary/spouse SE tax 8,478 + 58, half-SE 4,239 + 29, owner QBI 55,761 + 271,
QBI deduction 11,206 and Form 1040 amount owed 10,038 agree. Evidence is in
`optional-spouse-profit-fifteen-page-review.json`; no parent gate is closed.

A separate 23-case / 201-page selected checkpoint combines 20 exact
PDF/XML/source-equivalent prior reviews with the three fresh packets above.
Artifact/cache hardlinks preserve the originals without copying their storage;
the original generation batch remains untouched. The repository read-only
checker is replaying source, XML, PDF, page origins, template evidence and XSD;
no terminal pass is claimed yet. Review origin/manifest digests are in
`reviewed-checkpoint-assembly.json`. The first local assembly omitted canonical
Form 1040 from its seed-only URL lookup and stopped before writing a manifest;
its checker correctly rejected the missing manifest. The corrected assembly
uses the complete current registry URL inventory; both diagnostic logs remain.

The fifteen pages of `optional-spouse-cap-loss` were also freshly reviewed.
The spouse Schedule F loss remains −300 while optional SE earnings are 600;
primary/spouse SE 8,478 + 17 and half-SE 4,239 + 9 yield QBI 55,761 − 309,
QBI deduction 11,090 and amount owed 9,895. Source/pending/XML, identities,
marks and all rendered pages agree; the farm-loss sign was also verified in
extracted page text. `optional-spouse-loss-fifteen-page-review.json` retains
the reviewed observations and digests. This packet is outside the unchanged
23-case checker scope and does not yet contribute to its terminal result.

All sixteen pages of `single-form8995a-patron-phase-c-health` were freshly
reviewed. PATR distributions appear once in business income; health 6,000 and
half-SE 14,467 feed QBI 244,531. The 62.962% phase-in produces 37,003 before
the Schedule D patron reduction 15,720; written-notice deduction 10,000 yields
QBI deduction 31,283. SE 28,933, additional Medicare 403, zero NIIT and Form
1040 tax/amount owed 69,598 agree across source/pending/XML/PDF. Correct
identities, applicable canonical revisions, marks, ordering and legibility were
checked on every page, including the wrapped Schedule D business name.
`patron-c-health-sixteen-page-review.json` binds this review to all artifact and
render digests; it is outside the unchanged 23-case checker scope.

The read-only selected checkpoint finished **exit 0: 23 cases / 201 pages**
at `2026-10-07T02:41:03Z`. All saved artifacts match the current source/graph,
XML and regenerated PDF; each completed page checklist matches its replayed
form/copy origin, and canonical template hashes plus full v5.4 XSD pass.
`reviewed-checkpoint-check-corrected.status` retains the exact command, checker
and manifest digests, tool-evidence reference and log digest
`83dd085121c46eaa97726ccdb4fe9859565e4e4210d418b36ee8c04316be0e82`.
The corrected runtime manifest remains unchanged. This verifies the selected
checkpoint only; the newer spouse-loss and patron-health reviews are outside
its scope, and remaining fixtures/all-case review, coverage, business rules and
ATS requirements remain open.

All four pages of `single-child-unearned-income` were freshly reviewed. Child
identity/dependent mark, Domestic Bank interest 5,000 included once, standard
deduction 1,350, taxable income 3,650, parent identity/MFJ mark and Form 8615
line 18 tax 412 agree with source/pending/XML and Form 1040. Every page is
legible and correctly ordered. `child-unearned-four-page-review.json` retains
observations/digests; it is outside the 23-case checker scope.

## Further completed-page review transfer

A read-only comparison found 51 packets with exact prior reviewed PDF/XML
bytes and identical complete source facts (inputs, filer, attachment bytes,
retained source bytes and review dimensions), with differences only in saved
internal pending calculation data. Prior physical artifact and manifest digests
and every completed page checklist were verified. These are review candidates,
not completed current replay results. `pending-source-review-candidates.json`
records every differing internal path. Three of the candidates are the fresh
optional-method packets already in the verified 23-case checkpoint.

A separate, nonoverlapping **48-case / 983-page** selected batch is now being
checked with the unchanged repository read-only verifier. It must replay current
source calculations and match the current pending record, native XML, actual
PDF bytes, page origins/copy counts, canonical template evidence and full v5.4
XSD before these prior page reviews can count as current verified evidence.
The first local assembly correctly stopped on the three-case overlap assertion
before writing a manifest; its attempted checker log is retained as a rejected
diagnostic. The corrected batch excludes those three cases. Original packets,
prior manifests and the verified 23-case checkpoint remain intact. Current
terminal state/digests are recorded in `pending-source-reviewed-check.status`;
no terminal pass is claimed yet.

All five pages of `joint-schedule-h-spouse-withholding-only` were freshly
reviewed. Tara remains the Schedule H employer; spouse Sam’s W-2 wages 5,000
and withholding 250 join Form 1040 once. Schedule H A No/B Yes/C blank and
line 9 No agree with the family withholding-only facts; lines 7/8 tax 250
flow through Schedule 2 lines 9/21 into Form 1040 total tax 250, offset by
withholding 250. All pages are legible and correctly ordered.
`schedule-h-spouse-withholding-five-page-review.json` retains observations and
digests. This fresh review is outside the verified 23-case checkpoint.

Both Form 1040 pages of `joint-presidential-campaign-both` were freshly
reviewed: both campaign designations are checked and native IRS1040 indicators
are present; wages/AGI 75,000, standard deduction 31,500, taxable income
43,500, tax 4,746, withholding 11,000 and refund 6,254 agree with source,
pending and XML. Identity, elections, order and legibility passed.
`presidential-both-two-page-review.json` retains observations and digests;
this is outside the verified 23-case checkpoint.

A further nonoverlapping **15-case / 68-page** selected checkpoint is now
under the unchanged read-only verifier: 13 exact prior PDF/XML and complete
source matches (47 pages), plus the fresh patron-health and spouse household
withholding reviews (21 pages). Physical prior artifact/manifest digests and
completed page checklists were checked before assembly. Both earlier batches
are excluded; original evidence is unchanged and artifacts/cache use hardlinks.
`additional-reviewed-assembly.json` records origins;
`additional-reviewed-check.status` and `.log` retain the current calculation,
PDF/XML, page-origin/template and full XSD replay outcome. No terminal pass
is claimed yet. Tracked runtime matches the corrected full-regression launch.

All four pages of `single-final-trust-k1-short-term-capital-loss` were
freshly reviewed. The final trust K-1 code C loss 700 appears as negative 700
on Schedule D lines 5/7/16/21 and Form 1040 line 7a once; wages 30,000,
AGI 29,300, standard deduction 15,750, taxable income 13,550, tax 1,391,
withholding 3,000 and refund 1,609 agree with source, pending and XML.
Identity, elections, page order and legibility passed.
`final-trust-short-loss-four-page-review.json` retains observations/digests;
this review is outside the three existing checker batches.

All three pages of `single-form8888-two-account-refund` were freshly
reviewed. Form 1040 marks attached Form 8888 and leaves its single-account
fields blank; the 1,000 refund equals the checking allocation 300 plus savings
allocation 700. Both routing/account numbers and account types match the
synthetic source, pending and native XML groups. Calendar year, filer identity,
order and legibility passed. `two-account-refund-three-page-review.json`
retains observations/digests; this is outside the three checker batches and
does not authenticate real bank ownership.

A **9-case / 46-page** nonoverlapping checkpoint is assembled and queued
behind the 15-case checker: seven further exact prior PDF/XML/source-facts
matches (39 pages, saved pending differences requiring current replay) and
the fresh final-trust short-loss and split-refund reviews (7 pages). All three
earlier batches are excluded. Prior physical artifacts, complete source facts
and manifest digests were rechecked before hardlink assembly.
`next-reviewed-assembly.json` records origins; `next-reviewed-check.status`
records the live wrapper and dependency. The unchanged verifier starts only
after the 15-case checker exits zero and runtime digests still match. Neither
the queued batch nor any live checker is counted as a completed pass.

The **15-case / 68-page** checker completed at
`2026-10-07T03:04:14.447275Z` with exit **0** and exact selected-scope
completion output. Manifest SHA-256 is
`58f615204a020c5f5dadd66263e0d6055a723375422119d928db3befeb66b4af`;
log SHA-256 is
`a30119cb614c02446dc7a56da87949ccc82073cd8d1781d9cae99bd7c3ef7a44`.
No tracked runtime files changed. Nonoverlap with the original 23-case batch
was rechecked: verified scope now totals **38 distinct packets / 269 pages**.
The 9-case verifier started after this terminal pass; the 48-case verifier and
full regression/PDF preparation remain live. This closes neither the all-case
packet requirement nor broader coverage, business-rule or ATS gates.

All five pages of `joint-mixed-schedule1a` were freshly reviewed. Two
employer tip rows total 5,000; qualified overtime 4,000, one VIN’s qualified
interest 4,000 and senior deductions 5,400 per spouse total 23,800. The senior
phaseout, joint thresholds, identity and both age marks match source, pending
and XML. Form 1040 standard deduction 34,700, total deductions 58,500,
taxable income 101,500, tax 12,158, withholding 20,000 and refund 7,842 agree.
The tips worksheet is complete and legible; every page’s order and clipping
were checked. `mixed-schedule1a-five-page-review.json` retains digests/notes;
this is outside the existing checker batches and does not authenticate the
synthetic payroll/vehicle/loan records.

The **9-case / 46-page** checker completed at
`2026-10-07T03:08:22.810147Z` with exit **0** and exact selected-scope
completion output. Manifest SHA-256 is
`763b02713b69ca594269dbe2c0ddaa29b815efba3cb01c588f68c00ce46de0de`;
log SHA-256 is
`e0734aa37442748f2f4063e86a60acc9fe5704155a34d68cfd677b10bbaa9d8d`.
No tracked runtime files changed. Mutual nonoverlap across all three terminal
checkpoints was rechecked: **47 distinct packets / 315 pages** are verified.
The 48-case replay, full regression and PDF preparation remain live; the fresh
mixed Schedule 1-A review is outside these completed checkpoints. Broad board
requirements and MeF/ATS readiness are still incomplete.

Two more two-page Form 1040 packets were freshly reviewed.
`mfj-spouse-dependent-refund-only` correctly marks spouse dependency, uses
spouse W-2 wages 800 and the 1,350 dependent standard deduction, and claims
only the withholding refund 100 with zero tax/no EIC.
`mfs-w2-lived-apart-all-year-social-security-box` correctly marks MFS and
line 6d, leaves lump-sum line 6c blank, and reconciles wages/AGI 10,000,
standard deduction 15,750 and withholding refund 1,000. Source, pending/XML,
identity, checkboxes, order and legibility were checked on all four pages.
`spouse-dependent-refund-two-page-review.json` and
`mfs-lived-apart-two-page-review.json` retain notes/digests. Both reviews are
outside existing checker batches; dependency/residency sources are synthetic.

The **48-case / 983-page** checker completed at
`2026-10-07T03:10:58.255453Z` with exit **0** and exact selected-scope
completion output. Log SHA-256 is
`34214a52d7e5b8806234a03dd4675d706130c3e69732bb0bdbd67962496a56bb`;
manifest SHA-256 remains
`da0735840cfb7795be0ba9596d5328f0a0a766b008804c8a09bf0fab89229ee7`.
Current replay proves the changed internal pending records while reproducing
reviewed PDF/XML, page origins, templates and full XSD. All tracked runtime
digests still match launch. Mutual nonoverlap across the four completed
checkpoints was rechecked: **95 distinct packets / 1,298 pages** are verified.
`verified95-aggregate.json` records this audit. Remaining all-case evidence,
full regression, broad source/coverage, business rules and ATS gates are open.

All three pages of `single-ira-qualified-plan-rollover` were freshly
reviewed. Form 1040 IRA gross 7,000/taxable zero and line 4c(1) rollover mark
agree with source and XML; pension rollover/QCD marks are blank. The native
reference points to `IRADistributionStatement2`; the final PDF statement names
Example 401(k), receipt December 1 and completed rollover December 15, 2025,
with the same 7,000 amount and exact native explanation. Identity, zero-tax
totals, ordering and legibility passed.
`ira-plan-rollover-three-page-review.json` retains notes/digests; this is
outside verified checkpoints and does not authenticate plan/account records.

The latest strict comparison covered 234 generated packets: 43 exact
PDF/XML/complete-source prior review matches and 79 exact PDF/XML/source-facts
matches with saved pending differences. Existing verified checkpoints are
excluded from a new **34-case / 170-page** batch: 30 prior reviews (158 pages)
and four fresh reviews (12 pages: mixed Schedule 1-A, dependent spouse, MFS
lived apart and IRA qualified-plan rollover). One prior candidate has been
replaced with its newer fresh page observations. Prior physical artifact/source
and manifest digests were rechecked; current artifacts/cache are hardlinked.
`expanded-reviewed-assembly.json` binds review origins and
`expanded-reviewed-check.status`/`.log` retain the unchanged read-only
verifier run. All four earlier batches are excluded, runtime still matches
full-regression launch, and no terminal pass is claimed for this batch yet.

All five pages of `single-four-sequential-no-aptc-policies-full-year`
were freshly reviewed. Four sequential primary-owned policies cover twelve
months without overlap: premiums 900 each month, corrected quarterly SLCSP
600/700/800/900, contribution 50 and APTC zero produce monthly PTC
550/650/750/850 and total/net credit 8,400. Household/MAGI/FPL/rate and
monthly-method marks agree with source, pending and XML. Schedule 3 lines
9/15 and Form 1040 line 31 include 8,400 once; tax 1,487, payments 11,400
and refund 9,913 reconcile. Identity, blank allocation/marriage sections,
attachment order and legibility passed.
`four-policy-no-aptc-five-page-review.json` retains observations/digests;
this is outside current verifier batches and sources remain synthetic.

All five pages of `single-four-sequential-no-aptc-policies-four-gaps`
were freshly reviewed. March/June/September/December rows are wholly blank
and their native monthly groups omitted; the eight covered months retain
correct premium/SLCSP/contribution/PTC/APTC values. Credit 5,600 joins
Schedule 3 and Form 1040 once; tax 1,487, payments 8,600 and refund 7,113
match source/pending/XML. Identity, method marks, blank allocation sections,
order and legibility passed. `four-policy-gaps-five-page-review.json` retains
notes/digests; it is outside current checkpoints and sources are synthetic.

All four pages of `single-form7217-nonliquidating-basis-decrease` were
inspected. Partnership/date/owner, basis 600, outside basis 450, cash 50, gain
zero, allocated basis 400 and three property rows 100/150/150 agree with
source/pending/XML; Form 1040 tax/refund are 7,955/3,045. The [IRS
instructions](https://www.irs.gov/instructions/i7217) confirm Rev. December
2024 applies to 2025. The packet is **not approved**: PDF line 8 marks No
although zero-gain line 7 directs skipping to line 9, and XML omits the gain-tax
indicator. Page 3 checkbox completion remains false. This presentation
question is recorded solely in the board’s `future_todo` execution queue and
is not being implemented. `form7217-basis-four-page-observation.json` retains
notes/digests; this packet is excluded from passing checkpoints.

The **34-case / 170-page** verifier completed at
`2026-10-07T03:24:21.547355Z` with exit **0**, exact selected-scope
completion output and no changed runtime files. Manifest SHA-256 is
`978e6425b93c3ba0b490825b2f650048e1d1aa6a54229fe12c98f6c084f6c8f7`;
log SHA-256 is
`7b7b7700ad0e63f6708bcc81e8fdca6d595c428aae722d6b323eba5aa07420f2`.
Mutual nonoverlap across all five terminal checkpoints was rechecked:
**129 distinct packets / 1,468 pages** are verified. The unapproved Form 7217
case is absent from these checkpoints. `verified129-aggregate.json` retains
this audit; all-case review, full regression, coverage/source, business rules
and ATS remain incomplete.

The updated prior-review comparison covered 275 generated packets: 71 exact
PDF/XML/complete-source matches and 84 exact PDF/XML/source-facts matches
with internal pending differences. A new **32-case / 167-page** checkpoint
excludes all five verified batches and Form 7217 observations; it contains
30 prior reviewed packets (157 pages) and the two fresh four-policy reviews
(10 pages). Fresh notes replace prior observations for those two matching
packets. Prior physical artifacts/source/manifest digests were rechecked;
current artifacts/cache are hardlinked without modifying existing evidence.
`continued-reviewed-assembly.json` records origins and
`continued-reviewed-check.status`/`.log` retain the current unchanged
read-only verifier run. No terminal pass is claimed yet. Form 7217 is excluded
from this bounded review transfer only; this is not a filing-scope disposition
or permission to implement the future item. Runtime still matches launch.

All four pages of `single-form8606-post-year-contribution-and-distribution`
were freshly reviewed. Form 8606 line 4 includes the 1,000 contribution
received February 15, 2026 for 2025; prior basis 6,000, year-end value 10,000
and distribution 20,000 give ratio .200, nontaxable 4,000, taxable 16,000
and remaining basis 3,000. Form 1040 AGI 116,000, standard deduction
15,750, taxable income 100,250, tax 16,969 and amount owed 1,969 reconcile
with source/pending/XML. Identity, marks, blank conversion/Roth/standalone
sections, order and legibility passed.
`form8606-post-year-four-page-review.json` retains notes/digests; it is outside
current checker batches and does not authenticate prior/custodian records.

All four pages of `single-form2441-child-care-credit` were inspected, but
the packet is **not approved**. The supplied cap 500 reaches native/PDF
Form 2441 line 10 and limits the tentative 600 credit to 500. The [2025 IRS
worksheet](https://www.irs.gov/instructions/i2441) instead uses Form 1040
line 18 (3,875) less Schedule 3 lines 1/6l (zero here): limit 3,875 and credit
600 on the saved facts. The printed credit/tax/refund 500/3,375/1,625 therefore
do not prove full-return correctness. Amount completion remains false on the
affected pages. This new discovery is recorded only in `future_todo` and
left unimplemented. `form2441-cap-four-page-observation.json` retains all
observations/digests. The case/form is absent from all verified/current selected
checkpoints; source/input/runtime files remain unchanged.

The **32-case / 167-page** verifier completed at
`2026-10-07T03:36:54.154296Z` with exit **0**, exact selected-scope
completion output and no changed runtime files. Manifest SHA-256 is
`ded5512c324eb102f64dca4dd89b5794efacc16a12d7850d10cc954845768f1c`;
log SHA-256 is
`81425bd59f5f2868daa8b5067347094d15a3d3d74a6956c077995f236b7c3a7c`.
Mutual nonoverlap across all six terminal checkpoints was rechecked:
**161 distinct packets / 1,635 pages** are verified. Form 2441 and Form 7217
observations are absent from these selected scopes.
`verified161-aggregate.json` records the audit. Fresh Form 8606 review remains
outside these scopes; all-case, broad source/coverage, business-rule and ATS
requirements remain open and future discoveries stay unimplemented.
