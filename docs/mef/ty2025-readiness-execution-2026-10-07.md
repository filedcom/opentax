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


The three-page two-employer excess Social Security packet was freshly
reviewed against both complete synthetic W-2 records, native XML and rendered
pages. Employer EINs 123456789 and 987654321 each report wages 100,000 and
Social Security withheld 6,200. The [2025 IRS instructions](https://www.irs.gov/instructions/i1040gi)
limit is 10,918.20, so 12,400 less 10,918.20 yields rounded credit 1,482.
Schedule 3 lines 11/15 and Form 1040 lines 31/32/33 carry it once. AGI
200,000, standard deduction 15,750, taxable income 184,250, tax 37,067 and
amount owed 35,585 reconcile; all three pages have correct identity, marks,
order and legibility. `excess-social-security-three-page-review.json` retains
notes and artifact/render hashes. This is synthetic selected evidence, not
authenticated issuer records or ATS acceptance.

The generation checkpoint reached 348 complete packets when matching began.
91 packets / 501 pages match prior PDF/XML and complete source facts exactly;
92 / 1,288 are candidates with differences confined to internal pending state.
After excluding all six verified scopes and every Form 2441/Form 7217 case,
26 further retained reviews (179 pages) plus the fresh Form 8606 and
Social Security reviews (7 pages) form **28 packets / 186 pages**.
`further-reviewed-assembly.json` and `further-reviewed-batch/review-manifest.json`
retain origins and exact hashes. The unchanged read-only checker is running;
no pass is claimed until its terminal result. Original generation flags and
all runtime/source files remain unchanged; all five future items remain
unworked. Broad requirements remain open.


Fresh Form 8880 W-2 deferral review covers four actual pages: Form 1040
(two), Schedule 3 and Form 8880. Supplied primary W-2 code D is 2,000;
AGI 20,000 and born-1980/nonstudent/not-dependent facts yield rate 0.5
and tentative credit 1,000. No distributions are entered. The
[2025 official form/instructions](https://www.irs.gov/pub/irs-prior/f8880--2025.pdf)
credit-limit worksheet gives Form 1040 line 18 (428) less specified prior
credits (zero) = 428. Form 8880 line 12, Schedule 3 lines 4/8 and
Form 1040 line 20 agree at 428; tax becomes zero and withholding/refund
are 500. Identity, taxpayer column, all marks, page order and legibility
were checked. `form8880-w2-deferral-four-page-review.json` retains current
source/XML/PDF/render hashes and notes. This fresh review is outside
the running/verified batches and does not prove authentic source, full
historical distribution diligence or ATS acceptance.


Selected PDF/XSD generation reached terminal exit **0**. Final integrity
audit completed at `2026-10-07T03:47:34.549174Z`: **361 packets / 4,714 pages**,
zero generation rejections, all **1,083 source/XML/PDF artifact hashes**
and **100 canonical template hashes** verified, no changed runtime files.
Manifest SHA-256 `34c868e3b9d14129c5580e138e52df4131e889b433323106bd039a99c692412d`;
log SHA-256 `b908c1793ea52ce0db9dd8d482782a55f4f19ac3881cc2cb79b457e5b5b5874f`.
`prepared-pdf-final-integrity.json` retains the complete audit and the
11 guard exclusions, matching all 372 preflight IDs. No exclusion approval
is inferred. Original generation page checklists remain false on all
4,714 pages. Preparation/XSD and completed selected reviews are separate
evidence; full visual/source/coverage, business-rule and ATS gates remain open.


The full generation was re-matched after terminal completion: **361 cases**,
91 exact-source/PDF/XML prior matches (501 pages) and 92 internal-pending-only
candidates (1,288 pages). No additional retained matches emerged after the
348-packet checkpoint. Future-observation forms remain excluded from passing
scopes regardless of historical review flags.

Fresh EIC opt-out review checked the two actual Form 1040 pages against
supplied synthetic W-2/general facts, current pending and native XML.
Wages/AGI 15,000, standard deduction 15,750, zero tax/payment/refund;
explicit `do_not_claim_eic: true` yields line 27c checked, line 27a blank,
no Schedule EIC and native `DoNotClaimEICInd` X. US-main-home and digital
asset marks, identity, order and legibility agree.
`eic-opt-out-two-page-review.json` preserves notes and hashes. Together
with fresh Form 8880, the separate **2-packet / 6-page**
`fresh-elections-reviewed-batch` is now undergoing unchanged read-only
replay/PDF/template/page-origin/XSD verification. These IDs are disjoint
from all six verified batches and the running 28-packet batch; no terminal
pass or broad completion is claimed yet. All future items remain unworked.

The authorized Drive folder could not be opened through computer use:
the browser tool reported `No browser is available`. This does not resolve
the existing connector HTTP 403 package-download gate; no credentials or
external state were changed.


The 28-packet / 186-page checkpoint completed **exit 0** at
`2026-10-07T03:51:38.936798Z`, log SHA-256
`388cc2a09cd9d342aa429796d0972c947de436939044c35badc824bf8943e94c`,
manifest `3f9d179ee3feddeb96b4a6095b430942e578e78cb61b14bc4bd718c6dcfc23c6`.
The fresh 2-packet / 6-page checkpoint completed **exit 0** at
`2026-10-07T03:51:09.149295Z`, log SHA-256
`b91aba5b10e94b60c8c912ace391e05941369a5010f32762bc48acb5686fe179`,
manifest `a009f4ea79cc99703da98bf368def43954dd17f85f0ce9a13369943179a45f09`.
Both wrappers confirmed no runtime changes. All eight terminal scopes were
rechecked for mutual nonoverlap and exclusion of future-observation forms:
**191 distinct packets / 1,827 pages** verified.
`verified191-aggregate.json` retains the aggregate. The full regression
continues; broad parents remain open.

The earlier Drive-download limitation was resolved by the connector's
authorized **inline base64 mode**, without using a signed download URL or
bypassing HTTP 403. The complete 24,118,850-byte archive was saved privately
as `IMF_Series_2025v5.4-from-drive.zip` and passed ZIP CRC verification.
Outer SHA-256 `8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4`,
nested series `92fda5b7d6e5933fcf412fdd9348b93eb1d1719fb080f6cc95cc5e6886922797`,
nested schema `cb135657f0b47dfd7434918d074566c6c1d5f47d23cc1e5be4b9cefb64f37e8f`
match the retained provenance record. **All 746 TY2025 v5.4 XSD files**
match the retained local schema tree; no extra/missing/changed XSDs.
The schema ZIP contains XSDs and diff HTML, **no matching business-rule
workbook/package**. `imf-downloaded-package-audit.json` retains the audit.
This resolves package byte acquisition and local-tree comparison only;
matching business rules, enrolled credentials, current A2A service/trust
compatibility and IRS acceptance remain unresolved.


Fresh `joint-two-hsa-owners` review inspected all six rendered pages
against complete supplied monthly coverage/age/owner/contribution/W-2 facts,
current pending and native XML. Alex (111223333) has self-only coverage,
4,000 contributions/deduction and a 4,300 limit; Sam (444556666, age 55)
has self-only coverage, 5,000 contributions/deduction and a 5,300 limit.
[IRS line 3 rule 6](https://www.irs.gov/instructions/i8889) includes the
1,000 catch-up in line 3 for full-year self-only coverage; line 7 is therefore
blank. Two separate Form 8889 copies follow Schedule 1 in primary/spouse
order, with no swapped names/SSNs/amounts. Combined deduction 9,000
reaches Schedule 1 lines 13/26 and Form 1040 line 10 once. Wages 90,000,
AGI 81,000, standard 31,500, taxable 49,500, tax 5,466 and refund 6,534
reconcile with native XML. Identity, marks, order and legibility were checked.
`joint-two-hsa-owner-six-page-review.json` retains artifact/render hashes and
notes. `hsa-owner-reviewed-batch` is a new disjoint **1-packet / 6-page**
checkpoint under unchanged read-only verification. Synthetic source facts
do not establish authentic contribution/eligibility records or ATS acceptance.

The [September 2026 IRS QuickAlerts](https://www.irs.gov/pub/irs-efile/quickalerts-september-2026.pdf)
were rechecked: the reopening ATS service requires **R10.A** WSDLs. The
available Drive **R10.9/PY2026** package is therefore historical comparison
material, not proof of the required current service package. This is evidence
for the existing current-WSDL gate, not a new task or future-scope implementation.


The joint-HSA verifier completed **exit 0** at
`2026-10-07T03:57:34.954635Z`, manifest SHA-256
`0eb062bb13e6f920612faac1ab034bc8ad3869b50f8154a024b8686975056c35`,
log SHA-256 `697d8a9b80a16fc34db37abd6f8fa97e794673a60c75eaad13cee664df9be994`.
No runtime files changed. Nine disjoint passing checkpoints now cover
**192 packets / 1,833 pages**; `verified192-aggregate.json` retains the audit.

Fresh `single-form5329-two-early-ira-distributions` review checked five
actual pages against complete supplied synthetic source, pending and native
XML. Primary owner is Alex111223333 (age40); distinct payer EINs123456789
and987654321 report taxable code1 IRA distributions4,000 and6,000.
IRA gross/taxable and Form5329PartIline1/3 total10,000; no exception
claim entered. [2025 Form5329](https://www.irs.gov/pub/irs-prior/f5329--2025.pdf)
line4 gives additional tax1,000, reaching Schedule2lines8/21 and
Form1040line23/24 once. Standard15,750 reduces taxable income tozero;
no withholding/payment/refund, owed1,000. Names/SSNs, checkbox semantics,
standalone-only address, order and full-page legibility were checked.
`two-early-ira-5329-five-page-review.json` retains notes and hashes.
The new disjoint **1-packet / 5-page** `early-ira-reviewed-batch` is
under unchanged read-only verification, with no pass claim until terminal.
Synthetic issuer facts do not prove authentic records or ATS acceptance.


The early-IRA verifier completed **exit 0** at
`2026-10-07T03:59:31.377243Z`, manifest SHA-256
`4df261056f515f766b089621ceaeedadcc158e03715cb30dddd7194b3fab4187`,
log SHA-256 `b42d1d2f80d996571c15991b0a2b76f84a5f43df6092c1e725ac55399229249c`.
No runtime files changed. Ten disjoint terminal scopes now cover
**193 packets / 1,838 pages**, with Form2441/Form7217 observations excluded.
`verified193-aggregate.json` retains the audit. Current full-regression handle
remains live; latest observation585 passing markers/zero failures is progress
only, not a terminal full-regression pass. Main52 requirements and all five
future items remain unchanged.


Fresh `single-form4952-interest-and-dividends` review inspected four actual
return pages and the retained synthetic Form1098CopyB. W2wages75,000,
interest500, dividends400/qualified100 give AGI75,900.
[Form4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) lines1/3=900,
4a=900,4b=100,4c/4h/6=800,7=100carryforward,8=800deduction;
no qualified-dividend election. Sourced mortgage interest18,000 plus800
produce ScheduleA/1040itemized18,800, taxable57,100, tax7,475,
withholding11,000 and refund3,525. Names/SSNs, marks, order and legibility
agree. Embedded1098CopyB bytes/digest
`f473b9517546345cf02b557bc511bf12474754df963801f59e675c6bca683de1`
were verified; visible calendar25, HomeLender, maskedborrower3333 and
box1=18,000 match the supplied fixture facts. This is not authenticated
mortgage/issuer qualification. An initial scaled-preview misread of line3
was resolved by a higher-resolution crop and text extraction: **900 is
present**, so there is no discrepancy or new future item.
`form4952-income-four-page-review.json` retains current source/XML/PDF,
render, detail and sourceCopyB hashes. The disjoint **1-packet/4-page**
`investment-interest-reviewed-batch` is undergoing unchanged read-only
verification; no terminal pass claimed yet.


The investment-interest verifier completed **exit 0** at
`2026-10-07T04:04:00.155808Z`, manifest SHA-256
`6324ffee6e367ffbe1752158e829f657f7f069a6a43f58a88d14eb447f131fc7`,
log SHA-256 `8ea2448cfc67512a67435c4f70ff002cfb19824e20fe7bfccce4ebac68da347d`.
No runtime files changed. Eleven mutually disjoint terminal scopes cover
**194 packets / 1,842 pages**; `verified194-aggregate.json` retains the audit.

Fresh seven-page `single-form4136-farm-fuel-credit` review checked actual
Form1040(two), Schedule3 and Form4136(four) pages against all supplied
synthetic business/use/quantity/cost/confirmation facts, pending and native
XML. ExampleFarm/111000/ExampleTractor, qualifying-businessYes/activitycount1
and primary111223333 match. Entered1a off-highwaygas1,000gallons at.183
gives183 (cost3,000);3b farmundyeddiesel1,000at.243 gives243 (cost4,000).
[2025 official rates/form](https://www.irs.gov/pub/irs-prior/f4136--2025.pdf)
agree. Total426 appears Form4136line17/Schedule3lines12/15 and
Form1040line31/refund once. No income is entered; taxableincome/taxzero.
Business, dye-exception and unusedclaim/registration marks, split-dollar
cents fields, all continuations and legibility were checked.
`form4136-farm-fuel-seven-page-review.json` retains hashes/notes. The
disjoint1-packet/7-page `fuel-credit-reviewed-batch` is under unchanged
read-only verification. This synthetic fixture does not authenticate seller
receipts or establish complete business income/expense reporting.


The fuel-credit verifier completed **exit 0** at
`2026-10-07T04:05:58.894696Z`, manifest SHA-256
`073eb51f33398a061f68087b07bd2da9e4b243bf8b64f9337c5b21fef473b492`,
log SHA-256 `20377222e40eb9017c7293b94a1efdb5df33b02a35df7a57f3d01634d6333a3e`.
No runtime files changed. Twelve disjoint terminal passing scopes cover
**195 packets / 1,849 pages**; `verified195-aggregate.json` retains the audit.
All five future items remain unchanged/unworked; the Form4952 preview
misread did not create a false future item. Main52 requirements remain open.


Fresh four-page `single-form8396-certified-loan-interest-credit` review
checked Form1040(two), Schedule3 and Form8396 against the supplied MCC
facts, retained synthetic1098CopyB, pending and native XML. Interest7,500
allocated by100,000/125,000 gives6,000;20% credit1,200 agrees the
[2025 IRS form/instructions](https://www.irs.gov/pub/irs-pdf/f8396.pdf).
Taxlimit5,075 equals1040line18 lesszeroothercredits; credit joins
Schedule3line6g/7/8 and1040line20 once. Standard15,750/taxable44,250,
taxaftercredit3,875/withholding5,000/refund1,125 agree. No carryforward
or PartII entries required. Retained1098CopyB calendar25/lender/loanBref/
maskedborrower3333/box1interest7,500 and digest
`a06535c641026e99e1d0c3406157e081e275c0cea06db1bd41f1672edd69b0fb`
were checked. Synthetic bytes do not authenticate lender/MCC issuance.
`form8396-certified-four-page-review.json` retains hashes/notes.

The unchanged mortgage-credit verifier completed **exit0** at
`2026-10-07T04:11:19.499057Z`, manifestSHA256
`5329095da2c05e2e1e674c6de528f6c60ebae82ca8fbed3a6a416846806a8c05`,
logSHA256 `8ea2448cfc67512a67435c4f70ff002cfb19824e20fe7bfccce4ebac68da347d`.
No runtime files changed. Thirteen disjoint terminal scopes cover
**196 packets / 1,853 pages**; `verified196-aggregate.json` retains the audit.

Source review of `single-divorced-agreed-joint-estimated-payment` found
the retained signed-agreement PDF is a **477-byte blank one-page PDF**,
digest `6798281331ad47ac7a8cbc8de0419a134a8ac61c13c677058bac4a096a47bdd7`,
despite structured signed-by-both verification. Actual1040pages andnative
print the entered300 share/formerSSN222334444/refund300 consistently,
but the retained bytes establish no allocation or signatures.
`joint-estimated-blank-agreement-observation.json` is explicitly unapproved,
and this packet remains outside all passing scopes. The discovery was
added only to `future_todo` and remains unworked; no production change.
Main52 checklist requirements remain byte-identical to baseline.


Fresh four-page `joint-senior-schedule1a` review checked both taxpayers'
DOB1955/1958, supplied timely validSSNs and separate zero-exclusion
source references. W2primarywages160,000/withholding20,000 giveAGI/MAGI160,000.
[2025 Schedule1A](https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf)
MFJthreshold150,000 and6% reduction600 give5,400 pereligibleperson,
10,800 total/native/1040line13b once. Both1040ageboxes checked;
standard34,700 plus10,800 deductions give114,500 taxable,15,018 tax
and4,982 refund. All four actual pages, marks, names, order and legibility
were inspected. Synthetic records do not authenticate issuer/residency proof.
`joint-senior-four-page-review.json` retains current artifact/render hashes.
Unchanged verifier terminalexit0 at`2026-10-07T04:13:59.801686Z`,
manifestSHA256 `550e711a6f2130640fdad919758b21dd6b1b097085b85fbe9e7f04dd087799f3`,
logSHA256 `6c982700be225686801ab736858e3d59c3cdee5b76a41b55f1e0c9246216e709`;
no runtime changes. Fourteen disjoint scopes cover**197 packets/1,857pages**,
retained in `verified197-aggregate.json`.

Fresh four-page `single-k-reported-error` review checked structured1099K
payer/recipient/gross1,000 and reviewed800personalgift+200sharedmeal
reimbursement records/no goods or services/correctionrequest. All1,000
appears in Schedule1's top error entry and nativeForm1099KRptErrorOrLossAmt;
no income or24zadjustment. AGI0/standard15,750/tax0/payment0/refund0 agree.
[2025 IRS instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
use this top entry for such payments. Actual1040(two)/Schedule1(two)
pages, marks/names/order/legibility checked. Structuredsyntheticreferences
do not authenticate payment/correction records or ATS acceptance.
`reported-k-error-four-page-review.json` retains hashes/notes.
Disjoint1-packet/4-page `reported-k-error-reviewed-batch` is under
unchanged read-only verification; no terminal pass claimed yet.


The reported1099Kerror verifier completed **exit0** at
`2026-10-07T04:15:15.309418Z`, manifestSHA256
`5af45e619b99f287a3bb6d4d1f49aa839c159111887aca71d120df09fdcb256d`,
logSHA256 `6c982700be225686801ab736858e3d59c3cdee5b76a41b55f1e0c9246216e709`.
No runtime files changed. Fifteen mutually disjoint terminal scopes cover
**198 packets / 1,861 pages**, audited in `verified198-aggregate.json`.
All three unapproved Form2441/Form7217/blank-agreement observations
remain outside passing scopes. The main52 requirements remain frozen;
six future items remain unworked. Latest full-regression observation697
passing markers/zero failures with livePID53927 is progress only,
not a terminal full-suite pass.


Fresh six-page `single-high-wage-no-niit` review checked structuredW2
wages220,000/Medicarewithholding3,190/income-taxwithholding40,000.
[Form8959](https://www.irs.gov/pub/irs-prior/f8959--2025.pdf)
Singlethreshold200,000 yields20,000excess*.009=180, joining
Schedule2line11/21/1040line23 once. W2Medicarewithholding equals
regular1.45%, so noadditionalwithholding isinvented. Wages are excluded
from [NII](https://www.irs.gov/instructions/i8960):0NII/MAGI220,000/
20,000excess giveszeroNIIT. Standard15,750/taxable204,250/
incometax42,423/totaltax42,603/owed2,603 agree native/pending/PDF.
All six actualpages andowner/marks/continuations/legibility inspected.
`high-wage-six-page-review.json` retains hashes/notes; syntheticissuer
facts are notauthenticatedsource/ATSproof. Unchangedverifier exit0 at
`2026-10-07T04:17:38.575087Z`,manifestSHA256
`710a45351b2c548b2a36d702d53feb18861b5b6dd7481ee7a675e7d27d327ea4`,
logSHA256 `697d8a9b80a16fc34db37abd6f8fa97e794673a60c75eaad13cee664df9be994`;
no runtimechanges. Sixteen disjoint scopes cover**199packets/1,867pages**.

Two fresh nonbusiness1099 packets, each fourpages, were reviewed:
`single-k-blank-tin-withholding` has explicitly reviewed named/address
recipientAlex matchingtheprimary despite absentrecipientTIN; payerEIN,
gross5,000/withholding480, nonbusinesscraftallocation/nooverlapreference
match. Schedule1line8j/9/10 and1040line8/9/11a=5,000,
1040line25b/25d/33/refund=480. `single-nec-k-nonbusiness-line8j` has
NEC3,000plusK5,000withseparatepayeridentities/correctrecipient/nooverlap
review, so8,000reachesthesameincomejoins once; nowithholding/refund.
Bothstd15,750/taxable0/tax0,noSE/QBI/expenseoffsetclaims.
[2025 ScheduleC instructions](https://www.irs.gov/pub/irs-prior/i1040sc--2025.pdf)
route suppliednonbusinessclassificationtoline8j. Classificationis
verified against suppliedfacts, notindependentlyauthenticatedprofitintent.
All eightactualpages/marks/names/order/legibility checked;1040line8
amounts additionallyconfirmedhigh-resolutioncropsandtext. Records
`k-withholding-four-page-review.json` and
`nec-k-nonbusiness-four-page-review.json` retain hashes/notes.
Selected2-packet/8-page `nonbusiness-source-reviewed-batch` isunder
unchangedread-onlyverification; no terminal passclaimedyet.


The nonbusiness-source verifier completed **exit0** at
`2026-10-07T04:19:27.070441Z`, manifestSHA256
`450b21585a686971fd066dac9ad7314223814fa246d24fcc3f6d4959f5fcd3e4`,
logSHA256 `5f31a6fdf23323c5cf4ae8aa0c7da805f49427981370c396ea3d414ffe24bf43`;
no runtimechanges. Seventeen disjoint scopes cover**201packets/1,875pages**;
`verified201-aggregate.json` retains audit. Main52 andsixfutureitems unchanged.

Fresh three-page `single-actc-opt-out` review checked complete supplied
W2/dependentSSN/DOB/relationship/residence/support/jointreturn/status/
EICprior-disallowance facts. Ada111223334/born2017/daughter/12monthsUS
is present1040/ScheduleEIC/native; youngerthanparent/bornafter2006, so
ScheduleEIC4a/4bappropriatelyskipped. Wages/AGI15,000/std15,750/tax0
agree. ExplicitACTCoptoutmarks1040line28/nativeDoNotClaimACTCIndX;
ACTCamountblank/noSchedule8812. EIC4,328matches
[2025 IRS table](https://www.irs.gov/publications/p596) Singleonechild
15,000–15,050, joins1040line27a/32once; withholding1,500 givesrefund5,828.
The [1040 instructions](https://www.irs.gov/instructions/i1040gi) permit
theline28optout. Names/SSNs/marks/order/legibility checkedonallactualpages.
Syntheticreferences do notauthenticatesource/status/IRSaccountrecords.
`actc-opt-out-three-page-review.json` retains hashes/notes. Disjoint
1-packet/3-page `actc-opt-out-reviewed-batch` isunderunchangedread-only
verification; no terminal passclaimedyet.


The ACTCoptout verifier completed **exit0** at
`2026-10-07T04:21:02.117514Z`, manifestSHA256
`9e0dedd3d78446396b508bd20bd520e9e9e2e9bbebde177ac591f7f78637c0d0`,
logSHA256 `41f1dd98c2ecdbf80452e4e9e22e4602a52db262b737a74a4df915d8c3d44a76`;
no runtimechanges. Eighteen mutually disjoint terminal scopes cover
**202 packets / 1,878 pages**; `verified202-aggregate.json` retains audit.
Currentruntime hashes match launch. Main52 requirements andall six
futureitems remain unchanged/unworked. Latestfull-regression observation
723passingmarkers/zerofailures remains nonterminal;PID53927 islive.


Six actual `single-form4835-farm-rental-profit` pages were inspected:
Form1040(two),Schedule1(two),ScheduleEpage2,Form4835. Crop-shareincome8,000
minusfeedexpense1,000 gives7,000, agreeing4835line32/ScheduleE40/41/
Schedule1line5/10/1040line8/9/11a. Gross8,000 agreesScheduleE42;
standard15,750/taxable0/tax0. However, [Form4835lineA](https://www.irs.gov/pub/irs-pdf/f4835.pdf)
has **bothYes/Noblank**, andthe completeenteredsource contains no
active-participation answer. Calculateddefaultfalse is notsourceproofofNo.
`farm-rental-participation-observation.json` is explicitlyunapproved;
this packet isoutsideallpassingreviewscopes. No definitivematerial-
participationclassification/taxerrorisasserted. The unansweredquestion
wasrecordedonlyin `future_todo`, remainsunworked, andnoimplementation
wasmade. Main52 unchanged; sevenfutureitems nowrecorded.


### Unapproved disaster-plan PDF observation

All six actual pages of `single-form8915f-disaster-and-ordinary-plan-distributions`
were inspected against retained source and native XML. Form 1040 reports
pension gross 21,000 and taxable 7,667, including 1,000 ordinary income and
6,667 of the 20,000 disaster distribution under the three-year treatment.
Form 8915-F Part I prints 21,000 on line 2 column (a), 20,000 on line 6,
but leaves line 7 blank. The [IRS line 7 instructions](https://www.irs.gov/instructions/i8915f)
require the 1,000 difference for this single-form fixture without Part IV.
The blank was confirmed by the actual page image and extracted PDF text.
The packet remains unapproved and outside the 202 passing selected packets;
`disaster-plan-line7-observation.json` retains hashes and qualifications.
The new discrepancy is recorded only in `future_todo`, with no implementation.
Synthetic residence, loss and issuer references are not authenticated evidence.


### Unapproved positive Form 8978 tax join

All four actual pages of `single-form8978-positive-reviewed-source` were
inspected: Form1040(two),Form8978,ScheduleA8978. The sourced 2024 correction
27,459 minus original25,539 gives additional1,920, printed on Form8978line14
and emitted as native `OtherTaxAmt`. Form1040line16 still prints9,875,
the current ordinary tax alone; downstream total9,875/refund1,125 omit1,920.
The [2025 IRS line16 instructions](https://www.irs.gov/instructions/i1040gi)
require inclusion of positive Form8978line14 tax. Source/amount/native/PDF
hashes are retained in `form8978-positive-tax-observation.json`.
This packet remains unapproved and outside passing selected scopes; the
new discrepancy is recorded only in `future_todo`, with no implementation.
The observation does not validate prior accepted returns or external records.


### Current rollover review checkpoint

Four actual Form1040 pages across `single-direct-pension-rollover` and
`single-ira-rollover` were inspected against synthetic source, pending and
native XML. Pension gross20,000/taxable0 uses only line5c(1); traditional
IRA gross5,000/taxable0 uses only line4c(1), with matching owner/account,
June1–June2 dates, noninherited/nonRMD and no prior IRA rollover assertions.
Both returns have standard deduction15,750 and zero tax/payments/refund.
The [2025 IRS rollover instructions](https://www.irs.gov/instructions/i1040gi)
support the distinct presentation. These are synthetic reviewed facts,
not authenticated custodian/eligibility or acceptance proof.

The first selected review checker exited1 because this run's review record
incorrectly encoded `observedOwner` as an object; the checker requires the
role string `primary`. Original record, batch and failure log are retained.
Corrected `*-two-page-review-v2.json` records and `rollover-v2-reviewed-batch`
retain the same source/XML/PDF hashes with corrected review metadata only.
The corrected independent checker exited0 at2026-10-07T04:29:50.274305Z;
source replay, actualPDF/nativeXML, canonical fields and fullXSD checks passed.
Manifest SHA256 `93ec84671fe8bfefcea1742e168862b81d790d8d09729f70feac9a42d5f3f732`;
terminal log SHA256 `d5dcf7cd62e87b19d713cf977424f4707abf82f892164ac44ba305a965b5d44f`.
Tracked runtime hashes are unchanged. `verified204-aggregate.json` confirms
19 disjoint passing batches /204 packets /1,882 actual pages. This selected
proof does not close any broad form, source-authentication or ATS requirement.
The full integrated regression is also still running: latest snapshot has
792 passing markers and0 failures, which is not a terminal full-test pass.


### Unapproved Form 2439 native Schedule D parity

All six actual pages of `single-form2439-undistributed-gain-and-tax-credit`
were inspected: Form1040(two),Schedule3,ScheduleD(two),Form2439CopyB.
Issuer/owner/name/address/calendar2025, box1a10,000/box2 1,500 agree with
nativeIRS2439; ScheduleD11/15/16 and Form1040capitalgain/AGI are10,000.
Standard15,750 yields taxable0/tax0; Schedule3 13a/14/15 and Form1040
31/32/33/refund are1,500. The [2025 IRS ScheduleD instructions](https://www.irs.gov/instructions/i1040sd)
support these joins. However, the nativeIRS1040ScheduleD contains only
`LTGainOrLossFromFormsAmt`10,000, omitting the printed line15/16 totals
and QOFNo/line17Yes/line20Yes answers. This packet remains unapproved
for full native/PDF parity and is outside passing selected scopes.
`form2439-native-parity-observation.json` retains source/XML/PDF hashes.
The finding belongs solely to `future_todo`; no implementation was made.
This review does not authenticate the issuer's original CopyB.


### Unapproved purchase-points native Schedule A parity

All three actual `single-1098-purchase-points` pages and the retained
synthetic Form1098CopyB page were inspected. Retained bytes have SHA256
`cfc1038ba649af6b5963343aaa0b02ee7ccb9628e54cfa466673a0a627b94c00`;
lenderHomeLender/calendar25/maskedborrower3333/interest18,000/points2,400
agree with source. ScheduleA8a/8e/10/17 are20,400; Form1040AGI80,000,
deduction20,400,taxable59,600,tax8,032,withholding12,000,refund3,968.
The native ScheduleA emits line8a20,400 but omits printed8e/10/17 totals.
The packet remains unapproved for full native/PDF parity and outside passing
selected scopes. `purchase-points-native-parity-observation.json` retains
hashes; the discovery is only in `future_todo`, with no implementation.
Retained syntheticCopyB does not authenticate lender origin or prove the
external Pub936 eligibility/loan-limit workpapers already required on the board.


### Three-child EIC newborn review checkpoint

All three actual pages of `single-w2-three-eic-children-with-reviewed-birth`
were inspected against source, pending and native XML. Ada/Ben/Cora names,
SSNs,birthyears2017/2020/2025 and daughter/son/daughter relationships agree.
ScheduleEIC prints12/8/12 months: Cora's reviewed December1 birth and
US residence with filer through year-end use the printed birth-year rule,
rather than printing the actual one month. All three children's lines4a/4b
are correctly skipped as born after2006. W2earned income/AGI15,000,
standard15,750,taxable0/tax0 and withholding1,500 reconcile. The [2025 IRS
Publication596 table](https://www.irs.gov/publications/p596) gives6,761
for Single,threechildren,income15,000–15,050. Form1040/native credit is6,761,
refund8,261; explicitACTCoptout is checked and nativeDoNotClaimACTCInd isX.
These are reviewed synthetic facts, not authenticated birth/custody/IRSaccount
records. The independent selected checker exited0 at2026-10-07T04:34:58.978029Z;
source replay, PDF/nativeXML/canonicalfield/template checks and fullXSD passed.
Manifest SHA256 `2f23d873bdba76edc3652ce8caefced797dc44dc50ce91989967ad99c979e85e`;
terminal log SHA256 `41f1dd98c2ecdbf80452e4e9e22e4602a52db262b737a74a4df915d8c3d44a76`.
Runtime hashes unchanged. `verified205-aggregate.json` confirms20disjoint
passingbatches/205packets/1,885actualpages; broadcoverage/source/ATSgatesremainopen.
Latest full-regression snapshot has839passingmarkers/0failuremarkers and
its live process remains running; this is not a terminal full-suite pass.


### Custodial and separated-spouse EIC selected review

All six actual pages across `single-w2-custodial-eic-release` and
`mfs-w2-separated-spouse-eic` were inspected against synthetic source,
pending and nativeXML. AdaExample111223334,birth2017,daughter,12USmonths
appears on ScheduleEIC and is omitted from1040dependent/CTC claims after
reviewed release to the noncustodial parent. The MFS packet identifies
spouseOtherTaxpayer222334444 and checks the separated-spouse box/native
`SepdSpsFilingSepRetMeetsRqrInd`X based on reviewed July–Decemberapart facts.
Any-year spouse cohabitationtrue does not contradict last-six-monthsapart.
The [2025 IRS Publication596](https://www.irs.gov/publications/p596)
permits an eligible custodial parent's EIC despite the dependency release
and the reviewed separated-spouse route. Both have wages/AGI15,000,
standard15,750,tax0,withholding1,500,EIC4,328,refund5,828. NoCTC/ACTC.
Birthpost2006 skips EIC4a/b; blank unusedcolumns/pageorder/clipping checked.
This selected synthetic review does not authenticate signedForm8332,
custody/residence records or IRSaccount transcripts.

The unchanged independent checker exited0 at2026-10-07T04:38:15.903197Z;
source replay/actualPDF/nativeXML/canonicalfields/templates/fullXSD passed.
Manifest SHA256 `ff56cb85c463700512492f78cb60c157131d6b0c0c4dce24aebae8b688228f78`;
terminal log SHA256 `b91aba5b10e94b60c8c912ace391e05941369a5010f32762bc48acb5686fe179`.
Runtime hashes unchanged. `verified207-aggregate.json` confirms21disjoint
passingbatches/207packets/1,891actualpages. Broadexistingrequirementsremainopen.

### Subsequent-year IRA rollover review in progress

All three actual `single-ira-2026-rollover` pages were inspected against
source/pending/nativeXML: 8,000 traditionalIRA distribution December15,2025,
rolled into another traditionalIRA January15,2026 (31days), taxable0,
1040line4c(1)checked and pension/QCD marksblank. Source account/owner,
noninherited/nonRMD/no-prior-rollover assertions agree; they are synthetic,
not authenticated custodian proof. Standard15,750/tax0/no payments agree.
The required explanation follows1040p1/p2 and identifies owner/dates/amount;
native `IRADistributionStatement2` is referenced by the rollover indicator.
The [2025 IRS rollover instructions](https://www.irs.gov/instructions/i1040gi)
require this subsequent-year explanation. Selected checker exited0 at2026-10-07T04:40:07.462056Z: source replay,
actualPDF/nativeXML/canonicalfields/templates and fullXSD passed.
Manifest SHA256 `14fbddca97324a52682ab902554d9f2f4f392cc812f5c818edb5674c2d5a8a1b`;
terminal log SHA256 `c8b0a9d9202680b8fe39cf6a764dca4524d953c44756d390c661efcd8c96f7d6`.
Runtime hashes unchanged; `verified208-aggregate.json` confirms22disjoint
passingbatches/208packets/1,894actualpages. No production change; broadgatesopen.


### Unapproved Form 8919 identity placement

All seven actual `single-form8919-nec-wages-and-additional-medicare` pages
were inspected: Form1040(two),Schedule2(two),Forms8919/8959/8960.
NEC210,000 fromEmployerInc/EIN123456789 matches8919reasonG/wages210,000;
W2fromOtherEmployer150,000 joins1040line1a, with8919wages on1g, total360,000.
[2025 Form8919](https://www.irs.gov/pub/irs-pdf/f8919.pdf) cap176,100 minus
W2socialsecurity150,000 gives26,100;6.2%=1,618rounded plusMedicare3,045
is4,663. AdditionalMedicare(360,000−200,000)*0.9%=1,440; Schedule2total6,103,
1040tax90,035+6,103=96,138,withheld20,000,owed76,138. NIIT0/noNII agrees.
ReasonG has reviewedSS8April1deliveryreference; IRSdeterminationdatecolumn
correctlyblank. This is not authenticated SS8 delivery or worker-status proof.

Actual8919 taxpayername and SSN are crossed by the identityrow bottom border.
The overlap was confirmed with retained `form8919-nec-review/owner-detail.png`
at200dpi. `form8919-owner-overlap-observation.json` retains packet hashes and
qualifications. The page remains unapproved for legibility, outside passing
selected scopes. The new finding is only in `future_todo`, with no implementation.


### Schedule H source, tax and continuation verification

The two existing Schedule H fixtures passed the unchanged selected checker
at 2026-10-07T04:46:57.068492Z: two packets and all 13 actual pages.
`single-schedule-h-fica-and-futa` has one unrelated adult worker paid 3,100:
Social Security rounds to 384 and Medicare to 90, with Ohio FUTA 19.
Schedule H total 493 reaches Schedule 2 line 9/21 and Form 1040 tax/owed once.
`single-schedule-h-three-state-futa` has two workers each below the 2,800
FICA threshold; OH/NY/PA each have 1,000 state wages and 30 timely contributions.
The PA row is retained on the readable line 17 continuation; native XML
contains all three rows. Without supplied experience-rate/additional-credit
facts, the contribution credit is 90, gross FUTA 180 and net tax/owed 90.
Checkbox flow, owner/EIN, page order and amounts agree with source/pending/XML.
The [2025 IRS instructions](https://www.irs.gov/instructions/i1040sh)
confirm these calculation and continuation rules and zero credit reductions
for OH/NY/PA. These synthetic payroll/contribution assertions do not authenticate
payroll, W-2s, state payments or experience-rate notices; the broad requirement
remains open.

Manifest SHA256 `6794760347f3414b2b075d6b165e834801ec232a77b14b1bd09e71019d3fbe86`;
terminal log SHA256 `f24b5bb31c0f1db2e37c39bebf945ab151259395c0b6bff38e2da709aa71c18d`.
Runtime files unchanged. Original generation checklist flags remain unchanged.

### Retained Form 4852 ordinary Roth packet verification

`single-retained-4852-ordinary-roth` passed the unchanged selected checker
at 2026-10-07T04:48:58.621965Z: one packet and all eight actual pages.
The retained completed Form 4852 page and packet page 3 render pixel-identically;
all eight completed-form/workpaper/treatment-document hashes match the reviewed
record. Substitute facts match the retained workpaper. Native IRS1099R uses
nonstandard code N, correct owner/payer/account/payment date, gross 7,000,
withholding 1,000, distribution J and no IRA/SEP/SIMPLE indicator.

The ordinary non-SIMPLE Roth inventory, eligible contribution 5,000 and payment
7,000 reconcile to Form 8606 taxable earnings 2,000 and Form 5329 tax 200.
Issued W-2 wages 125,000 produce AGI 127,000, deduction 15,750, taxable 111,250,
ordinary tax 19,547 and total tax 19,747. Withholding 21,000 gives refund 1,253.
All source/pending/native/PDF amounts, owner identity, checkbox semantics,
continuations and legibility were checked. The [2025 Form 8606 instructions](https://www.irs.gov/instructions/i8606)
and [Form 5329 instructions](https://www.irs.gov/instructions/i5329) support
this selected basis/early-tax treatment. Synthetic retained bytes do not prove
external issuer, correspondence or signature authenticity, wider eligibility,
business-rule success or IRS acceptance.

Manifest SHA256 `aaec792a59e098c44be1bb2409500c99eedbe9d7cac09c9b35062ce4618d9d04`;
terminal log SHA256 `9af906f2e018da449d27172bb0ca1e42fa9a05eef06a5d08062a0fc69d9bc482`.
Runtime files unchanged. `verified211-aggregate.json` verifies 24 disjoint passing
batches / 211 packets / 1,915 actual pages. No production change or broad closure.

### Current full regression failure under investigation

The original corrected full regression remains live. It now reports
`Form 8962 mixed dependent rejects source, threshold, MAGI, and return tampering`
as FAILED. The retained focused diagnostic is
`form8962-mixed-failure-diagnostic.log`; its outcome will be recorded when terminal.
The focused normal typechecked run exited 1: zero passed, one failed,
five filtered out. It confirms the filing-threshold assertion expects
“does not establish the 2025 filing requirement”, while the guard correctly
rejects that fixture with “Form 8962 dependent sourced income does not establish
the 2025 single-dependent filing requirement”. The diagnostic JSON retains
command, terminal totals, log/test hashes and exact expected/actual messages.
This is the existing full-regression task's failing assertion. No runtime
file has been changed during the live full run; the assertion correction and
required full rerun remain pending. No full pass is claimed.

The full run subsequently reports the second failure,
`Form 8962 two-dependent family rejects changed source, identity, policy, and final return`.
Its focused normal typechecked diagnostic exited 1 (zero passed, one failed,
three filtered out) with the same stale filing-threshold substring; command,
log/test hashes and exact messages are in
`form8962-two-dependent-failure-diagnostic.json`. A private two-assertion patch
is prepared at `pending-form8962-assertion-correction.patch`, unapplied while
the original full run remains live. Neither diagnostic establishes a full pass.


### Additional mortgage packet observations, unapproved for native parity

All twelve actual pages from four existing mortgage fixtures were inspected
against source/pending/native XML. Each has primary Alex Example111223333,
wages/AGI80,000, withholding12,000 and readable1040(two)/ScheduleA(one).

- `mfs-two-loan-mortgage-limit`: MFS correctly marked; the earlier claim
  that spouse-itemizes was marked is corrected by the later individual-page
  inspection below (actual line12b blank despite source/native indication);
  375,000 limit / 900,000 supplied average balances gives .417 three-decimal
  ratio, deductions8,340+6,672=15,012, taxable64,988,tax9,209/refund2,791.
- `single-1098-construction-refinance-points`: 2,000 reported points /180
  payments ×6 paidmonths gives67 current points plus18,000 interest;
  deduction18,067,taxable61,933,tax8,538/refund3,462.
- `single-unreported-refinance-points`: 3,000 points less1,000 service charges,
  amortized over180payments ×6 gives67 on8c plus18,000 on8a;
  same18,067 deduction/tax8,538/refund3,462.
- `single-2023-refinance-points-ledger`: 2,000 eligible points /180payments
  ×12 current payments gives133 on8c; supplied2023/2024 ledgers67/133
  reconcile arithmetically. Deduction18,133,taxable61,867,tax8,527/refund3,473.

The [2025 Publication936](https://www.irs.gov/publications/p936) debt-limit,
ratio and point-amortization rules support these selected calculations.
The actual PDFs print ScheduleA totals8e/10/17, while nativeA omits them;
this extends the already-recorded future-only mortgage parity observation.
Each `*-parity-observation.json` retains hashes and qualifications; none is
approved or added to a passing checker scope. No implementation was made.
Issuer/closing/payment/workpaper authenticity and accepted prior-year ledger
proof remain outside these synthetic observations. The MFS source asserts
noncommunity/separate-funds facts; current TX address is not proof of them.
Main board remains byte-identical with52openrequirements;12futureitemsunworked.

### Form 4972 partial-beneficiary packet verification

`partial-4972-beneficiary-2-copies` and `partial-4972-beneficiary-3-copies`
passed the unchanged selected checker at 2026-10-07T04:58:35.461825Z:
two disjoint packets and all six actual pages. Each combines the same
participant's source distributions into one Form 4972. Source/pending/native
XML and all PDF pages agree on owner, participant, eligibility answers,
NUA annotations, annuity and partial-beneficiary shares.

Independent arithmetic using the [2025 Form 4972 instructions and tax table](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
reconstructs every populated line 6–30. Two sources give capital tax 880,
cash ordinary amount 35,200, annuity 6,000, ten-year tax 1,910 and total 2,790.
Three sources give capital tax 1,360, cash ordinary amount 54,400, annuity
12,000, ten-year tax 3,760 and total 5,120. Form 1040 correctly excludes these
distributions from ordinary pension income and carries each Form 4972 tax
once through line 16 and total/owed. Synthetic facts do not authenticate
birth/death, full-balance distribution, issuer records or prior elections.
The broad Form 4972 requirement remains open.

Manifest SHA256 `ce36ad9fa19d61e5c3597f4e683045eaab02d5956105e7cdae536e1c95f8cbd2`;
terminal log SHA256 `b91aba5b10e94b60c8c912ace391e05941369a5010f32762bc48acb5686fe179`.
`verified213-aggregate.json` verifies 25 disjoint terminal passing batches /
213 packets / 1,921 actual pages. Runtime files and original generation flags
remain unchanged. No production change or broad checklist closure.

### Late IRA rollover packet verification

The unchanged checker passed all four existing late-rollover packets and
twelve actual pages at 2026-10-07T05:04:22.706534Z. Each Form 1040 prints
the source gross on line 4a, zero taxable on 4b, and only the IRA rollover
mark on 4c(1). The readable third-page statement matches its referenced
native IRADistributionStatement and owner. With no other income or payments,
deduction 15,750 leaves zero taxable income, tax and refund.

Independent date review against [2025 Publication 590-A](https://www.irs.gov/publications/p590a)
and [Revenue Procedure 2020-46](https://www.irs.gov/irb/2020-45_IRB#REV-PROC-2020-46):

- `single-ira-late-automatic-waiver`: gross 9,000; June 1 distribution,
  June 20 institution receipt/instructions, institution-error-only assertion,
  September 15 contribution within one year.
- `single-ira-late-self-certification`: gross 6,000; illness resolved
  August 20, certification signed September 1/delivered September 2,
  contribution September 10 is within the 30-day safe harbor.
  Self-certification does not establish an IRS-issued waiver.
- `single-ira-late-irs-ruling`: gross 7,000; supplied synthetic ruling
  issued August 1 with October 1 deadline; September 10 deposit precedes it.
- `single-ira-late-frozen-deposit`: gross 8,000; June 1 distribution,
  June 20–August 20 insolvency freeze excludes 61 days, extending July 31
  to September 30, beyond the ten-day release minimum; contribution on deadline.

Noninherited, non-RMD, current-owner traditional IRA and no prior rollover
assertions were checked. Authentic issuer/custodian, certification, ruling and
insolvency records remain unproved; no broad rollover closure or acceptance.

Manifest SHA256 `7b531504f70fe6736b5b9f8b1d2c82c15799adad01b7f72b65a17e9be67ed907`;
terminal log SHA256 `421cebb52ce0170975e3606e57b9a67f99115ba7323a6b121b534194fdf5075b`.

### MFS legal-separation child-credit packet verification

`mfs-w2-legal-separation-eic-child` passed the unchanged selected checker
at 2026-10-07T05:05:38.072805Z: one packet and all five actual pages.
Form 1040 dependent Ada's identity, 2017 birth, daughter relationship and
twelve US months match Schedule EIC and Schedule 8812. MFS spouse identity
and the special separated-spouse mark agree with native XML; DependentDetail
precedes that mark. The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
contain this selected EIC exception and the 15,000–15,050 one-child table
amount 4,328. This synthetic packet does not establish the referenced decree's
authenticity or state/jurisdiction legal applicability.

Wages/AGI 15,000 less deduction 15,750 gives zero taxable income/tax.
Schedule 8812 initial credit 2,200 has zero nonrefundable tax limit;
15% × (15,000 − 2,500) = 1,875, capped at 1,700 ACTC.
The [2025 Schedule 8812 instructions](https://www.irs.gov/instructions/i1040s8)
confirm the selected cap. Refundable credits 6,028 plus withholding 1,500
give refund 7,528. All populated amounts, checkbox flow and page order agree.

Manifest SHA256 `c72890a2c302b0e739c3aa429176de06633fef74331edc673874d67f1fed8211`;
terminal log SHA256 `b42d1d2f80d996571c15991b0a2b76f84a5f43df6092c1e725ac55399229249c`.
`verified218-aggregate.json` verifies 27 disjoint terminal passing batches /
218 packets / 1,938 actual pages. Runtime files and original generation flags
remain unchanged. Broad source, coverage, business-rule and ATS gates remain open.

### Personal-item 1099-K observations, unapproved for native parity

All twelve actual pages in `single-k-personal-gain-loss` and
`single-k-personal-selling-fees` were compared with source/pending/native XML.
The first has short-term ticket gain 800 − 250 = 550 and long-term chair loss
700 − 1,000 offset by code L adjustment +300. The second reduces both gross
proceeds by documented synthetic 50 selling fees: short gain 750 − 250 = 500,
long loss 650 − 1,000 offset by code L +350. The [2025 Form 8949 instructions](https://www.irs.gov/instructions/i8949)
support net proceeds and the nondeductible-loss adjustment. Box C/F, dates,
amounts, owner, Form 1040 gain/AGI and zero tax reconcile.

Both actual Schedule D PDFs print short-term line 7 and combined line 16
gain, QOF No, line 17 No and line 22 No. Native Schedule D contains only
line 3/10 transaction groups, omitting these totals/answers. This extends
the existing future-only Schedule D parity observation; no implementation
and neither packet enters a passing scope. The two `*-parity-observation.json`
records preserve hashes and qualifications. Issuer/purchase/settlement/fee
authenticity remains unproved. Main board still matches the frozen baseline
with 52 open requirements and twelve unworked future items.

### Form 2555 full-year physical-presence packet verification

`single-form2555-full-year-physical-presence` passed the unchanged selected
checker at 2026-10-07T05:11:05.232718Z: one packet and all seven actual pages.
Alex Example's Form 2555 identifies Maple Systems Ltd, both Toronto addresses,
US citizenship, December 1, 2024 tax-home establishment and January 1–December 31,
2025 physical presence with no travel. The [2025 Form 2555 instructions](https://www.irs.gov/instructions/i2555)
support the selected 365-day physical-presence and 130,000 annual limit.
Min(130,000 × 365/365, 100,000 wages) gives exclusion 100,000.

Native FECRecord matches employer, employee SSN and compensation.
Form 1040 line 1h prints FEC and 100,000; its referenced WagesNotShownSchedule
contains the same literal and amount. Form 2555 lines 19/24/26/27 and
42/43/45 print 100,000, with no housing deduction/exclusion. Schedule 1
8d uses the negative-income parentheses; lines 9/10 and Form 1040 line 8
are −100,000, leaving AGI zero. Native Schedule 1 references the same IRS2555.
Deduction 15,750 leaves taxable income/tax zero; no payments, credit or refund.

All populated amounts, identity, checkbox skips, form copies, native references,
page order and legibility were reviewed. These structured synthetic assertions
do not authenticate citizenship, tax home, travel or employer/pay records.
Housing, wider eligibility, source-authenticity, business-rule and IRS
acceptance gates remain open; no broad Form 2555 closure.

Manifest SHA256 `f563b8363e4da54af8e1c026638de8d93744f2fa6994c485327997a3b911fd6a`;
terminal log SHA256 `20377222e40eb9017c7293b94a1efdb5df33b02a35df7a57f3d01634d6333a3e`.
`verified219-aggregate.json` verifies 28 disjoint terminal passing batches /
219 packets / 1,945 actual pages. Runtime and original generation flags unchanged.

### New clean vehicle packet observation, unapproved checkbox flow

All seven actual pages in `single-new-clean-vehicle-personal-credit` were
compared with source/pending/native XML. Wages/AGI 50,000, deduction 15,750
and taxable 34,250 give tax 3,875. Form 8936 limits tentative credit 7,500
to tax 3,875; Schedule 3 line 6f/7/8 and Form 1040 line 20 agree, leaving
zero total tax and refund of withholding 7,000. Current/prior MAGI 50,000/48,000,
Single status, vehicle identity and September 30 acquisition/service assertions
match the populated documents. The [2025 Form 8936 instructions](https://www.irs.gov/instructions/i8936)
confirm the selected acquisition-date and single MAGI limits. Synthetic VIN,
seller-report and eligibility facts do not authenticate actual vehicle eligibility,
ECO report, purchase agreement/payment or prior filed return.

Actual Schedule A line 5 Yes directs a skip to Part II, but questions 6/7
also print No. Native IRS8936ScheduleA contains only NewCleanVehicleGrp.
This is an unapproved checkbox-flow observation, recorded solely for future
planning; no implementation or IRS rejection claim. The packet remains outside
passing scopes. `clean-vehicle-skip-observation.json` retains artifact hashes,
all-page review and qualifications. Main board is frozen with 52 open
requirements; thirteen future items remain unworked.

### QEF section 1294 Election B packet verification

`single-source-qef-1294-election` passed the unchanged selected checker
at 2026-10-07T05:16:32.933743Z: one packet and all seven actual pages.
Form 8621 identifies Alex Example, QEF Source Fund/QEF001 in Dublin,
Ordinary 100 shares acquired January 1, value 20,000, section 1293 income
2,000 and new QEF Election A plus tax-deferral Election B. Other elections
are unchecked; the future-only D–H work remains untouched.

Part III ordinary income 2,000, no capital income/distributions/transfers
and no section 951 inclusion agree with source/pending/native. Schedule 1
line 8z prints SEE STATEMENT and 2,000; the readable other-income statement
uses the same owner, QEF description and native reference. Wages 75,000 plus
QEF 2,000 gives AGI 77,000 and taxable 61,250 after deduction 15,750.
The [2025 Form 1040 tax table](https://www.irs.gov/instructions/i1040gi)
gives tax 8,395; omitting undistributed QEF earnings gives taxable 59,250
and tax 7,955. Their difference, 440, matches Form 8621 line 9c and native
DeferredTaxAmt. The [2025 Form 8621 instructions](https://www.irs.gov/instructions/i8621)
require subtracting that amount on Form 1040 line 24 and a bracket annotation.
Both `[440]` and resulting tax 7,955 are visible at 200 dpi, with withholding
11,000 and refund 3,045. No credits or other taxes affect the comparison.

The three retained synthetic issuer/annual/activity records hash-match their
source declarations (40/46/49 bytes). Their brief text does not establish
complete external issuer, annual-information, shareholder or broker authenticity.
All actual PDF pages, identities, amounts, checkbox semantics, required statement,
ordering and native joins were reviewed; this does not close the broad Form 8621
source/eligibility, later-year section 1294 ledger, business-rule or ATS gates.

Manifest SHA256 `d6a8ced977aad6eb64226434e0b7ac75d0af4f5400d8d44f51f406fc54206050`;
terminal log SHA256 `20377222e40eb9017c7293b94a1efdb5df33b02a35df7a57f3d01634d6333a3e`.
`verified220-aggregate.json` verifies 29 disjoint terminal passing batches /
220 packets / 1,952 actual pages. Runtime and original generation flags unchanged.
Main scope remains frozen: 52 requirements open; thirteen future items unworked.

### Paired-owner HSA other-coverage/current-excess packet: review withheld

All ten actual pages of `joint-other-coverage-hsa-current-excess` were inspected against source, pending amounts and native XML. Alex’s six family-eligible months give 4,275 before the shared 2,000 allocation; Sam’s 2,275 shared allocation plus 4,275 exclusive second-half limit gives 6,550. Deductions of 2,000 and 6,000 join Schedule 1/1040 at 8,000; Alex’s 1,000 excess and 5,000 year-end balance produce 60 tax, total tax 5,646 and refund 6,354. Form 8889 identities/copies remain distinct. See [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) and [Form 5329 instructions](https://www.irs.gov/instructions/i5329).

PDF Form 5329 line 47 prints 1,000; native XML omits `HSAExcessContriCurrentYearAmt`, although the cached IRS v5.4 schema identifies it as line 47. Native line 48/49 totals remain correct. This discrepancy is recorded only in `future_todo` and remains unworked. The packet is unapproved and outside the 220-packet passing aggregate; no checker pass claimed. Private `paired-hsa-current-excess-ten-page-observation.json` pins all source/XML/PDF hashes and page observations. Original preparation flags remain unchanged. The synthetic allocation reference and coverage/contribution/balance assertions do not authenticate signed or issuer records, prior filings, business rules or IRS acceptance.

### Passive foreign-interest/current-year excess: independent packet pass

`single-foreign-interest-current-excess` passed the unchanged normal type-checked checker at 2026-10-07T05:24:38.881692Z (exit 0). All eight actual pages were reviewed: Form 1040, Schedule 3, Schedule B, Form 1116 and both Form 1116 Schedule B pages. Sole Canadian interest 50,000 less allocated standard deduction 15,750 gives foreign/worldwide taxable income 34,250 and ratio 1.00000. Tax and allowed passive credit are 3,875; paid foreign tax 9,000 leaves 5,125 current-year excess. The reviewed synthetic 2024 limit/credit both equal 700, leaving no carryback room; current-year and total columns on Schedule B lines 6/8 both show 5,125. Native category, country, amounts and Schedule 3 references reconcile. Foreign account/FBAR Yes, Canada and foreign trust No match the explicit source. See [Form 1116 instructions](https://www.irs.gov/instructions/i1116) and [Schedule B instructions](https://www.irs.gov/instructions/i1116sb).

Private `foreign-interest-eight-page-review.json`, `foreign-interest-reviewed-batch/review-manifest.json`, checker log/status and `verified221-aggregate.json` retain proof. Manifest SHA-256 `4ecd02e83c0addc898b6708116e0292b4da0535599c26da3a341d76dccaec84f`; terminal log SHA-256 `9af906f2e018da449d27172bb0ca1e42fa9a05eef06a5d08062a0fc69d9bc482`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation review flags are unchanged. Aggregate: 30 disjoint passing checker batches, 221 packets/1,960 pages. Known future-only discrepancies remain unapproved for filing despite earlier mechanical checks. Actual issuer and filed/accepted prior-return records, wider 1116 routes, business rules, FBAR submission and IRS acceptance remain unproved; 52 frozen requirements stay open.

### Multiple Schedule C net loss: full-return reconciliation withheld

All ten actual pages of `single-multiple-schedule-c-net-loss` were inspected. Two separate Consulting businesses retain primary owner identity, cash accounting, material participation, distinct business names/references and the second business’s at-risk mark. Source receipts 10,000.49 and expense 20,000.50 produce filed Schedule C profits 10,000/−20,001, while raw aggregation rounds Schedule 1 business loss to −10,000. Native fields reproduce this one-dollar discrepancy: `BusinessIncomeLossAmt` −10,000 differs from the sum of `NetProfitOrLossAmt` −10,001, without Form 8958. The local `S1-F1040-195` rule requires equality. Form 8995 row totals and carryforward 10,001 agree with filed business rows; Form 8959 withholding reconciliation 1,088−725=363 joins the 8,688 refund. See [IRS whole-dollar rounding instructions](https://www.irs.gov/instructions/i1040gi).

Private `multiple-schedule-c-net-loss-ten-page-observation.json` pins source/XML/PDF hashes and all page observations. The discrepancy belongs only in `future_todo` and remains unworked. Full-return approval is withheld; no independent checker pass or IRS rejection claimed. This packet stays outside the 221-packet passing checker aggregate; original preparation flags and tracked runtime files are unchanged. Synthetic business/at-risk/QBI/SE workpaper assertions do not authenticate books, prior filings or sources.

### 1099-K refund and service-fee packets: independent passes

All 22 actual pages of `single-k-business-refund` and `single-k-business-refund-and-fee` were inspected against source, pending calculation and native XML. Both retain 3,000 gross payments and one reviewed 400 refund at Schedule C line 2. The fee variant also deducts 90 at line 10, giving profits 2,600/2,510. Schedule SE taxable earnings round to 2,401/2,318; separately rounded Social Security/Medicare components total 368/354, with half-tax deductions 184/177. Schedule 1 and Form 1040 retain profits and adjustments once; AGI is 2,416/2,333 and amount owed 368/354. Form 8995 QBI after half-SE deductions agrees with AGI, but taxable-income limits zero its final deductions. Names, SSNs, business references, cash/material-participation marks, skipped questions and all page origins agree. See [Schedule C instructions](https://www.irs.gov/instructions/i1040sc) and [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse).

The normal type-checked unchanged checker completed exit 0 at 2026-10-07T05:33:53.063148Z. Private per-packet `*-eleven-page-review.json`, `k-refunds-reviewed-batch/review-manifest.json`, log and status retain evidence. Manifest SHA-256 `15e849e4ce16d4abb734ebb06560bbeb5b6e6fd4b0abb485e480995645837b52`; log SHA-256 `008660d35b6a81a0017b248e4ee28f9a9ef7d90d021a5df85a4b6f678b0e1dc3`. Both packets are disjoint from the prior 221. Runtime files and original preparation flags remain unchanged. Processor transaction/settlement/book references are synthetic assertions, not authenticated source documents; these fixtures do not establish valid employment SSN eligibility for EIC. Broad source/coverage, business-rule and IRS acceptance gates remain open.

### Health/tip deduction income limit: independent packet pass

All eleven actual pages of `tip-health-single-health-income-limited` were inspected against source, pending calculation and native XML. The sole event-food-service business has 18,000 receipts (including 12,000 reported tips), 8,000 advertising expense and 10,000 profit. Schedule SE gives 9,235 taxable earnings, 1,145 Social Security tax plus 268 Medicare tax, 1,413 total and a rounded 707 half-tax adjustment. The owner’s twelve 1,000 monthly premiums total 12,000; Form 7206 limits the deduction to 10,000−707=9,293. No month asserts employer-subsidized eligibility, Marketplace/LTC coverage or a public-safety exclusion. The owner and established-plan identifier match the sole business. Schedule 1 adjustments total 10,000 and AGI is zero. Tip net-income capacity is 10,000−707−9,293=0; QBI is also zero, so no Schedule 1-A or Form 8995 positive deduction/copy is emitted. The source’s bounded childless EIC facts and earned income 9,293 give 649 credit; tax 1,413 less payments 649 leaves 764 owed. See [Form 7206 instructions](https://www.irs.gov/instructions/i7206) and [Schedule 1-A instructions](https://www.irs.gov/instructions/i1040gi).

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T05:36:07.603597Z. Private `tip-health-income-limited-eleven-page-review.json`, `tip-health-limited-reviewed-batch/review-manifest.json`, log/status and `verified224-aggregate.json` retain proof. Manifest SHA-256 `37a2469094b58334cf8a096bc2036e8a62ad6f0be23cf14ea51b86bb1100655c`; log SHA-256 `c741347fb54721a52272e0b282a37d220fd6ad34d6e779a8db26de4d12e13938`; unchanged checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 32 disjoint passing checker batches, 224 packets/1,993 pages. Known future-only discrepancies remain unapproved for filing. Issuer/tip/occupation records, established-plan/premium/employer eligibility, employment SSN/residence and prior-return authenticity remain unproved; broad coverage, business rules and IRS acceptance gates remain open.

### Sole-business 1099-NEC qualified tips: independent packet pass

All twelve actual pages of `single-1099nec-trade-business-tips-schedule1a` were inspected against source, pending calculation and native XML. Event-food-service receipts 18,000 include 12,000 qualified tips once; advertising 8,000 leaves profit 10,000. Schedule SE taxable earnings 9,235 yield Social Security 1,145 plus Medicare 268, total 1,413 and rounded half-tax deduction 707. The tip deduction is limited to business net income 10,000−707=9,293. Schedule 1-A employee lines 4a–c are zero; lines 5/6/7/13 and total 38 retain 9,293. MAGI 9,293 is below the single threshold 150,000, so phaseout lines 11/12 are skipped. Form 1040 AGI 9,293, standard deduction 15,750 and additional deduction 9,293 give taxable income zero. QBI after exclusion of qualified tips is zero. Childless EIC 649 offsets part of SE tax 1,413, leaving 764 owed. Identities, source recipient/business reference, cash/material-participation/1099-payment marks, copies and canonical order agree. See [Schedule 1-A instructions](https://www.irs.gov/instructions/i1040gi) and [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse).

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T05:43:41.110540+00:00. Private `nec-business-tips-twelve-page-review.json`, `nec-business-tips-reviewed-batch/review-manifest.json`, log/status and `verified225-aggregate.json` retain proof. Manifest SHA-256 `af4e623f307ef296004db9b2303c15156d69cc97a26c9e15a9e2944338d68637`; terminal log SHA-256 `76787209d6f14c21a9e641c00937e46265b9c2b4d47ea39c8f7b17fce364a98f`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 33 disjoint passing checker batches, 225 packets/2,005 pages. Known future-only discrepancies remain unapproved for filing. Issuer, occupation/tip ledger, employment SSN/residence and prior-record references are synthetic assertions, not authenticated external records. Broad coverage, business rules and IRS acceptance remain open; all 52 frozen requirements and fifteen future-only items remain unchanged.

### Combined NEC/MISC/K qualified tips: independent packet pass

All twelve actual pages of `single-nec-misc-k-business-tips-schedule1a` were inspected against source, pending calculation and native XML. NEC 5,000 plus MISC 5,000 plus allocated K receipts 8,000 gives Schedule C gross 18,000; K gross 10,000 includes a reviewed 2,000 duplicate MISC transaction excluded from its allocation. Nonoverlapping reviewed tip amounts 4,000/4,000/6,000 total 14,000, contained in gross receipts once. Advertising 8,000 leaves profit 10,000. Separately rounded SE components 1,145/268 give tax 1,413 and half-SE 707; the tip net-income limit is 9,293. Schedule 1-A line 5/6/7/13/38, native XML and Form 1040 line 13b agree. AGI 9,293 plus standard deduction 15,750 gives zero taxable income after the additional deduction; QBI after excluded tips is zero. Source does not establish main-home/dependency facts for childless EIC, so no credit or payment is claimed and amount owed is 1,413. Identity, recipient/business references, cash/material-participation/1099-payment marks and all canonical page origins agree. See [Schedule 1-A instructions](https://www.irs.gov/instructions/i1040gi) and [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse).

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T05:47:44.389446+00:00. Private `triple-business-tips-twelve-page-review.json`, `triple-business-tips-reviewed-batch/review-manifest.json`, log/status and `verified226-aggregate.json` retain proof. Manifest SHA-256 `1ce930bf824c7e67f4ba9d3bc5e23da76a06f1a4abda9a793fb96c97751029d2`; terminal log SHA-256 `76787209d6f14c21a9e641c00937e46265b9c2b4d47ea39c8f7b17fce364a98f`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 34 disjoint passing checker batches, 226 packets/2,017 pages. The fixture review-focus narrative still says half-SE 706 and cap 9,294; that metadata-only discovery is recorded exclusively in `future_todo` and remains unworked. Filed amounts reconcile. Issuer, duplicate transactions, occupation/tip ledger, identity/residence and prior records are synthetic assertions, not externally authenticated proof. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements remain open; sixteen future-only items remain unworked. Broad coverage, business rules and IRS acceptance remain open.

### MFJ independent-owner tips, QBI and wage limits: independent packet pass

All seventeen actual pages of `qualified-tip-qbi-mfj-independent-owner-tips` were inspected against source, pending calculation and native XML. Alex’s W-2 wages 176,100 exhaust Alex’s Social Security wage base; business profit 10,000 still gives Medicare SE tax 268 and half-tax adjustment 134. Casey’s separate 5,000 profit gives taxable SE earnings 4,618, Social Security 573 plus Medicare 134, tax 707 and half-tax adjustment 354. Owner SSNs remain separate across both Schedule C and Schedule SE copies; wages never use Casey’s base. Combined SE tax 975 and adjustment 488 join Schedules 2/1 and Form 1040.

Owner tip amounts 9,000/4,000 are included once in receipts and each remains below its own adjusted profit (9,866/4,646), so Schedule 1-A retains 13,000 at lines 5/6/7/13/38. MAGI 190,612 is below the MFJ phaseout threshold 300,000; phaseout lines are skipped. Form 8995 keeps Casey QBI 5,000−354−4,000=646 and Alex QBI 10,000−134−9,000=866, total 1,512 and 20% component/final deduction 302. Income limitation 29,222 is nonbinding. Form 1040 standard deduction 31,500 plus tips 13,000 and QBI 302 gives taxable income 145,810, ordinary tax 21,906 and total tax 22,881. W-2 withholding 30,000 yields refund 7,119. Explicit EIC opt-out is checked. Identities, source references, cash/material-participation/1099-payment and explicit at-risk marks, all copies, continuation pages and canonical order reconcile. See [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse), [Schedule 1-A instructions](https://www.irs.gov/instructions/i1040gi) and [Form 8995 instructions](https://www.irs.gov/instructions/i8995).

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T05:52:56.187654+00:00. Private `mfj-independent-tip-qbi-seventeen-page-review.json`, `mfj-tip-qbi-reviewed-batch/review-manifest.json`, log/status and `verified227-aggregate.json` retain proof. Manifest SHA-256 `065373b399c58e01c75b7de0f17e0f24d17eef2ba0121e89be9959a74c4c6e3c`; terminal log SHA-256 `ab11ce115eca270192fd1c97e1e717db30f4ea4d6f3512abf9b453ae0ec51c93`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 35 disjoint passing checker batches, 227 packets/2,034 pages. Source references and synthetic occupation/tip/residence/identity assertions do not authenticate externally issued records; the misleading “Actual issued” review-focus wording extends only the existing future-only fixture review-note item and remains unworked. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved.

### Business-tip statutory cap and QBI income limit: independent packet pass

All thirteen actual pages of `qualified-tip-qbi-business-tips-25000-cap` were inspected against source, pending calculation and native XML. Gross receipts 80,000 include reported tips 40,000 once; advertising 8,000 leaves profit 72,000. Schedule SE taxable earnings 66,492 gives separately rounded Social Security 8,245 plus Medicare 1,928, total 10,173 and half-SE adjustment 5,087. Tip net-income capacity 66,913 exceeds tips 40,000, but the statutory deduction cap limits Schedule 1-A lines 7/13/38 to 25,000. MAGI 66,913 is below the single phaseout threshold 150,000; phaseout lines 11/12 are skipped. Form 8995 excludes deducted tips 25,000 and half-SE 5,087 from profit, retaining QBI 41,913 and component 8,383. Taxable income before QBI 26,163 gives a binding income limit 5,233. Form 1040 taxable income 20,930 yields tax-table amount 2,273, plus SE 10,173 for total tax/amount owed 12,446. Identity, source recipient/business references, cash/material-participation/1099-payment marks and all canonical page origins reconcile. See [Schedule 1-A instructions](https://www.irs.gov/instructions/i1040gi), [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) and [Form 8995 instructions](https://www.irs.gov/instructions/i8995).

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T05:57:05.068807+00:00. Private `business-tip-cap-thirteen-page-review.json`, `business-tip-cap-reviewed-batch/review-manifest.json`, log/status and `verified228-aggregate.json` retain proof. Manifest SHA-256 `27d3f6b8f72c4e1e0f9df4a6277156343637b565e4bd075ac29aa5941ee5cd46`; terminal log SHA-256 `f3c91b186bbef874c75cb9d430de7c792c1c9f836c5f71eb25b52aa351b527db`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 36 disjoint passing checker batches, 228 packets/2,047 pages. Misleading “Actual issued” review-focus wording extends only the existing future-only fixture-review item and remains unworked. Source references/assertions do not authenticate issuer/tip/occupation/identity/residence or prior records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved. Live full regression has advanced to five failures; three newly observed no-APTC Form 8962 failures are under focused diagnosis while the original run continues unchanged.

### Additional live-regression failures: retained focused diagnosis

Normal type-checked focused diagnostics reproduced three further Form 8962 no-APTC assertion failures: `f8962.test.ts` line 809 and both tests in `f8962_no_aptc_gap.test.ts`. Each guard rejects the invalid source, but the assertion expects “one fully paid, nonshared” while the current guard says “one fully paid nonshared Marketplace policy and a complete verified single or joint tax family”. Private `form8962-no-aptc-source-failure-diagnostic.log/json` (exit 1, one failed/24 filtered) and `form8962-no-aptc-gap-failure-diagnostic.log/json` (exit 1, two failed) retain command, timestamps and hashes. `pending-form8962-no-aptc-assertion-correction.patch` removes only the stale comma from four expected-message strings across three failing tests. Together with the earlier two prepared single-dependent message updates, these are corrections for the existing full-regression requirement. Both patches remain unapplied until the original full run is terminal, preserving its immutable runtime evidence; no production logic or future-only item was changed. Full-suite results and corrected rerun remain required.

### Business-tip MAGI phaseout and retained QBI: independent packet pass

All thirteen actual pages of `qualified-tip-qbi-business-tips-magi-phaseout` were inspected against source, pending calculation and native XML. Gross receipts 80,000 include reported tips 12,000 once; advertising 8,000 leaves profit 72,000. W-2 wages 100,000 leave Social Security wage capacity 76,100, so all SE earnings 66,492 remain subject to Social Security. Separately rounded SE components 8,245/1,928 total 10,173 and half-SE adjustment 5,087. AGI/MAGI 166,913 exceeds the single tip threshold 150,000 by 16,913; Schedule 1-A line 11 takes 16 whole increments, line 12 reduces the deduction 1,600, and lines 13/38 retain 10,400. Tip net-income capacity and the 25,000 cap are nonbinding. Form 8995 QBI 72,000−5,087−10,400=56,513 yields a component 11,303; taxable-income limitation 28,153 is nonbinding. Form 1040 standard 15,750 plus tips 10,400 and QBI 11,303 gives taxable income 129,460, ordinary tax 23,917 and total tax 34,090. W-2 withholding 11,000 leaves 23,090 owed. Identities, source references, cash/material-participation/1099-payment marks and all canonical page origins reconcile. See [Schedule 1-A instructions](https://www.irs.gov/instructions/i1040gi), [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) and [Form 8995 instructions](https://www.irs.gov/instructions/i8995).

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:03:03.480566+00:00. Private `business-tip-phaseout-thirteen-page-review.json`, `business-tip-phaseout-reviewed-batch/review-manifest.json`, log/status and `verified229-aggregate.json` retain proof. Manifest SHA-256 `9659335cbbaac017aa6bfca596b79fcef8649094f2fec3f7723acdf6aff25aea`; terminal log SHA-256 `f3c91b186bbef874c75cb9d430de7c792c1c9f836c5f71eb25b52aa351b527db`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 37 disjoint passing checker batches, 229 packets/2,060 pages. Misleading “Actual issued” fixture wording extends only the existing future-only review-note item and remains unworked. Source references/assertions do not authenticate issuer/tip/occupation/identity/residence or prior records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved. The live full regression has progressed beyond 3,011 passing markers, with five known stale-assertion failures and prepared unapplied fixes.

### Owner health-plan allocation, tip deduction and QBI: independent packet pass

All fourteen actual pages of `tip-health-single-positive-health` were inspected against source, pending calculation and native XML. Gross receipts 80,000 include tips 12,000 once; advertising 8,000 leaves profit 72,000. SE earnings 66,492 yield separately rounded Social Security 8,245 and Medicare 1,928, total 10,173 and half-SE adjustment 5,087. Twelve source months of 500 premiums, with no subsidized-employer eligibility, Marketplace coverage, LTC or public-safety exclusion, total 6,000. The sole owner plan `ALEX-EVENT-HEALTH-2025` joins the business and tip allocation. Form 7206 profit 72,000, allocation ratio 100% and net capacity 66,913 retain the full 6,000 deduction. AGI/MAGI 60,913 and tip net-income capacity 60,913 leave the 12,000 tip deduction unchanged. Form 8995 QBI 72,000−5,087−6,000−12,000=48,913 gives component 9,783, limited by taxable income before QBI 33,163 to 6,633. Form 1040 deductions 34,383 leave taxable income 26,530, tax-table amount 2,945 and total tax/amount owed 13,118. All identities, source business/recipient/plan joins, marks, copies and canonical page origins reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:10:07.851927+00:00. Private `tip-health-positive-fourteen-page-review.json`, `tip-health-positive-reviewed-batch/review-manifest.json`, log/status and `verified230-aggregate.json` retain proof. Manifest SHA-256 `004e3edb1b06edae891eea8fb3b556fe56d5b15d5027f0e363a54c5176bf0562`; terminal log SHA-256 `465f819bf210d5361cb4558a8f6e415c0ec07f69433643bbce8b38c3d2363a81`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 38 disjoint passing checker batches, 230 packets/2,074 pages. Misleading issued-record fixture wording extends only the existing future-only review-note item and remains unworked. Synthetic issuer/tip/occupation, policy/payment/employer eligibility and identity/residence references do not establish external authenticity. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved.

### Health-adjusted tip net-income limit and zero QBI: independent packet pass

All thirteen actual pages of `tip-health-single-tip-netincome-limited` were inspected against retained source, pending calculation and native XML. Gross receipts 18,000 include tips 12,000 once; advertising 8,000 leaves profit 10,000. SE earnings 9,235 produce separately rounded Social Security 1,145 and Medicare 268, total 1,413 and half-SE adjustment 707. Twelve source months of 500 premiums, without employer eligibility, Marketplace/LTC coverage or public-safety exclusion, retain the full 6,000 health deduction within Form 7206 capacity 9,293. Owner, business and plan identifiers join the tip allocation. AGI/MAGI and health-adjusted tip capacity are 10,000−707−6,000=3,293, limiting Schedule 1-A lines 5/6/7/13/38 to 3,293. Phaseout and statutory cap are nonbinding. QBI 10,000−707−6,000−3,293=0, so Form 8995 is correctly omitted from native XML and the PDF. Standard deduction 15,750 plus tips 3,293 leaves zero taxable income/ordinary tax. Total tax 1,413 less childless EIC 649 gives 764 owed; the source contains age 40, valid SSN/due date, residence, dependency and prior-disallowance facts, with EIC earned income 9,293. Every actual page, owner, source join, amount, mark and continuation reconciles.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:13:43.972322+00:00. Private `tip-health-netincome-thirteen-page-review.json`, `tip-health-netincome-reviewed-batch/review-manifest.json`, log/status and `verified231-aggregate.json` retain proof. Manifest SHA-256 `dc8b41f5aabba01cbf66fbf55e6af98a42736c8c5305485d29fb01363336b4fe`; terminal log SHA-256 `f3c91b186bbef874c75cb9d430de7c792c1c9f836c5f71eb25b52aa351b527db`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 39 disjoint passing checker batches, 231 packets/2,087 pages. Issued-record review-focus wording extends only the existing future-only item and remains unworked; synthetic references/assertions do not authenticate issuer/tip/policy/payment/employer eligibility/identity/residence or prior records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved.

### Fully phased-out tips with retained health-adjusted QBI: independent packet pass

All twelve actual pages of `tip-health-single-fully-phased-out` were inspected against source, pending calculation and native XML. W-2 wages 100,000 plus gross receipts 80,000 (including tips 1,500 once) less advertising 8,000 give income 172,000. SE earnings 66,492 remain below the remaining Social Security wage base 76,100; separately rounded SE components 8,245 and 1,928 total 10,173, with half-SE 5,087. Twelve source months of 100 premiums retain health deduction 1,200 within Form 7206 capacity 66,913. Owner/business/plan joins agree. AGI/MAGI 165,713 exceeds the single tip threshold 150,000 by 15,713; fifteen whole increments reduce the eligible 1,500 tip deduction to zero. Schedule 1-A is absent from both native XML and all actual PDF pages. QBI therefore excludes no tips: 72,000−5,087−1,200=65,713 yields deduction 13,143; the income limit 29,993 is nonbinding. Standard deduction 15,750 plus QBI 13,143 leaves taxable income 136,820, ordinary tax 25,684 and total tax 35,857. W-2 withholding 11,000 leaves 24,857 owed. All amounts, identities, source references, marks, copies and canonical page origins reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:16:57.150816+00:00. Private `tip-health-phaseout-twelve-page-review.json`, `tip-health-phaseout-reviewed-batch/review-manifest.json`, log/status and `verified232-aggregate.json` retain proof. Manifest SHA-256 `e9afa02066dd31c77c42d603e1643d90592da4b5837b5a3c45a6b545664e7127`; terminal log SHA-256 `417e03a773b714bb0622a395ceaef964f85d2d920554d570c6bedaad3224faf0`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 40 disjoint passing checker batches, 232 packets/2,099 pages. Issued-record review-focus wording extends only the existing future-only item and remains unworked. Synthetic issuer/tip/occupation/policy/payment/employer eligibility/identity/residence and prior-record assertions do not authenticate issued records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved.

### Wages, owner health, tips and nonbinding QBI income limit: independent packet pass

All fourteen actual pages of `tip-health-single-w2-qbi-binding` were inspected against source, pending calculation and native XML. W-2 wages 50,000 plus gross receipts 80,000 (including tips 12,000 once), less advertising 8,000, give income 122,000. SE earnings 66,492 remain below the remaining Social Security wage base 126,100; separately rounded Social Security 8,245 and Medicare 1,928 total SE tax 10,173 and half-SE 5,087. Twelve source months of 500 premiums retain owner health deduction 6,000 within Form 7206 capacity 66,913. Owner/business/plan joins agree. AGI/MAGI 110,913 is below the tip phaseout threshold; health-adjusted tip capacity 60,913 and statutory cap 25,000 are nonbinding, retaining tips 12,000. QBI 72,000−5,087−6,000−12,000=48,913 gives component 9,783. Taxable income before QBI 83,163 yields income limit 16,633, also nonbinding. Standard deduction 15,750 plus tips 12,000 and QBI 9,783 leaves taxable income 73,380, tax-table amount 11,057 and total tax 21,230. W-2 withholding 11,000 leaves 10,230 owed. All actual pages, identities, source references, marks, copies, amounts and canonical origins reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:20:50.705506+00:00. Private `tip-health-w2-fourteen-page-review.json`, `tip-health-w2-reviewed-batch/review-manifest.json`, log/status and `verified233-aggregate.json` retain proof. Manifest SHA-256 `cd489d46f7c13c0246d83b0e09c1e5d47ba52626ae513a3391e9cc1c06e32090`; terminal log SHA-256 `465f819bf210d5361cb4558a8f6e415c0ec07f69433643bbce8b38c3d2363a81`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 41 disjoint passing checker batches, 233 packets/2,113 pages. The fixture ID says QBI binding although its income limit is nonbinding; this metadata observation and issued-record wording extend only the existing future-only item and remain unworked. Synthetic source assertions do not authenticate issuer/tip/occupation/policy/payment/employer eligibility/identity/residence or prior records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved.

### MFJ primary health-income limit with separate spouse tips/QBI: independent packet pass

All nineteen actual pages of `tip-health-mfj-primary-health-limited` were inspected against retained source, pending calculation and native XML. Alex/Casey retain separate Schedule C profits 10,000/5,000, including tips 9,000/1,000 once. Alex W-2 Social Security wages 176,100 exhaust that owner's wage base: Alex SE tax 268/half 134; Casey separately rounded SS 573 plus Medicare 134 gives tax 707/half 354. Combined SE tax 975 and adjustment 488 reconcile. Alex's twelve 1,000-premium months total 12,000, limited to business profit 10,000−half-SE 134=9,866. Casey's twelve 185-premium months total 2,220 within that owner's capacity 4,646. Both monthly sources indicate no own/spouse subsidized-employer eligibility, Marketplace/LTC coverage or public-safety exclusion; individual plan/business/owner joins and two Form 7206 copies reconcile. Combined health adjustment is 12,086. Alex tip capacity 10,000−134−9,866=0; Casey capacity 5,000−354−2,220=2,426 retains tips 1,000. Schedule 1-A reports 1,000 below MFJ threshold 300,000. QBI retains Casey 1,426 and Alex 0, component/final deduction 285; the income limit 29,205 is nonbinding. Income 191,100 less adjustments 12,574 gives AGI 178,526; deductions 32,785 leave taxable income 145,741, ordinary tax 21,891 and total tax 22,866. Withholding 30,000 gives refund 7,134. Explicit EIC opt-out, every owner/form copy, source reference, amount, mark and canonical page origin reconciles. Form 7206 copy 1 is Casey and copy 2 Alex; C/SE copy 1 is Alex and copy 2 Casey.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:26:41.429253+00:00. Private `tip-health-mfj-limited-nineteen-page-review.json`, `tip-health-mfj-limited-reviewed-batch/review-manifest.json`, log/status and `verified234-aggregate.json` retain proof. Manifest SHA-256 `b2cab2449c8cac6a326ae7be8e9f8b80adf618e6a13ec3055e4a63f65f8b212e`; terminal log SHA-256 `500564fcbe5ff23ccceadddb269568907388f7aa296698e4357fcd70f22f656d`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 42 disjoint passing checker batches, 234 packets/2,132 pages. Issued/actual-record fixture wording extends only the existing future-only metadata item and remains unworked; synthetic issuer/tip/occupation/policy/payment/employer eligibility/identity/residence and prior-source assertions do not authenticate issued records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved. The live full regression has exceeded 3,224 passing markers with the same five diagnosed stale assertions; prepared corrections remain unapplied until its terminal outcome.

### MFJ owned health plans, joint tip cap and phaseout: independent packet pass

All twenty-one actual pages of `tip-health-mfj-owned-cap-phaseout` were inspected against retained source, pending calculation and native XML. Alex/Casey Schedule C profits 80,000/60,000 contain tips 40,000/30,000 once. Alex W-2 Social Security wages 176,100 exhaust that owner's base: SE tax 2,143/half 1,072. Casey Social Security 6,871 plus Medicare 1,607 gives SE tax 8,478/half 4,239. Combined SE tax 10,621 and adjustment 5,311 reconcile. Twelve monthly premiums of 500/185 retain separate health deductions 6,000/2,220 within owner capacities 78,928/55,761; monthly eligibility/plan/business/owner joins agree. Income 316,100 less adjustments 13,531 gives AGI/MAGI 302,569. Eligible tips 70,000 first meet the joint cap 25,000, then two whole phaseout increments reduce the deduction by 200 to 24,800. Proportional exclusions 14,171/10,629 retain Alex/Casey QBI 58,757/42,912, total 101,669 and deduction 20,334; income limit 49,254 is nonbinding. Combined SE earnings 129,290 exceed the reduced Additional Medicare threshold 73,900 by 55,390, producing 499 tax; additional withholding is zero. Form 8960 retains zero investment income/tax despite MAGI exceeding its threshold. Standard deduction 31,500 plus tips/QBI leaves taxable income 225,935, ordinary tax 39,918, other taxes 11,120 and total 51,038. Withholding 30,000 leaves 21,038 owed. Every actual page, owner copy, amount, mark and canonical origin reconciles; Form 7206 copy 1 is Casey and copy 2 Alex.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:36:24.027377+00:00. Private `tip-health-mfj-cap-phaseout-twentyone-page-review.json`, `tip-health-mfj-cap-phaseout-reviewed-batch/review-manifest.json`, log/status and `verified235-aggregate.json` retain proof. Manifest SHA-256 `529038e4a6a10dc096e698ba664c2b3d85b589646184c7f00cd5f1aa60ed9c44`; terminal log SHA-256 `97d9f2bce732f3808e37c3c17f3a15e061f9ab5684ae6d2a35f61f8cc1ecbb82`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 43 disjoint passing checker batches, 235 packets/2,153 pages. Issued/actual-record wording extends only the existing future-only metadata item and remains unworked; synthetic source references do not authenticate issuer, tip, occupation, policy, payment, employer eligibility, identity, residence or prior records. Known future-only filing discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved. Full regression remains live with 3,277 passing markers and the same five diagnosed stale assertions; prepared corrections await its terminal outcome.

### MFJ fully phased-out tips with retained owner health and QBI: independent packet pass

All nineteen actual pages of `tip-health-mfj-fully-phased-out` were inspected against retained source, pending calculation and native XML. Alex/Casey profits 80,000/60,000 contain 100 tips each once. Alex W-2 Social Security wages 176,100 exhaust that owner's base: SE tax 2,143/half 1,072. Casey SE components 6,871/1,607 total 8,478/half 4,239. Combined tax 10,621 and adjustment 5,311 reconcile. Twelve monthly premiums of 500/185 retain independent health deductions 6,000/2,220 within owner capacities 78,928/55,761, with all monthly plan/business/owner joins checked. Income 316,100 less adjustments 13,531 gives AGI/MAGI 302,569. Two whole phaseout increments reduce eligible tips 200 to zero; Schedule 1-A is omitted from native XML and all actual pages. No tip exclusion reduces QBI: Casey 53,541 and Alex 72,928 total 126,469, producing deduction 25,294; income limit 54,214 is nonbinding. Combined SE earnings 129,290 produce Additional Medicare tax 499; additional withholding is zero. Form 8960 retains zero investment income/tax. Standard deduction 31,500 plus QBI leaves taxable income 245,775, ordinary tax 44,680, other taxes 11,120 and total 55,800. Withholding 30,000 leaves 25,800 owed. Explicit EIC opt-out, amounts, marks, owner copies, canonical order and legibility reconcile. Form 7206 copy 1 is Casey and copy 2 Alex.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:41:54.884156+00:00. Private `tip-health-mfj-phaseout-nineteen-page-review.json`, `tip-health-mfj-phaseout-reviewed-batch/review-manifest.json`, log/status and `verified236-aggregate.json` retain proof. Manifest SHA-256 `106268d670efa239f6ec860d4922c8a0311f1310c6017916ce3a817c71621ebd`; terminal log SHA-256 `bff643b12ed6ae64d400efbae4d7b984a234f09196085453ebd34a3e1258aad4`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 44 disjoint passing checker batches, 236 packets/2,172 pages. Issued/actual-record wording extends only the existing future-only metadata item and remains unworked. Synthetic source references do not authenticate issuer, tip, occupation, policy, payment, employer eligibility, identity, residence or prior records. Known future-only discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved. Full regression remains live with at least 3,334 passing markers and five diagnosed stale assertions; prepared corrections await its terminal outcome.

### WOTC wage reduction with fully phased-out tips and advanced QBI: independent packet pass

All twenty-six actual pages of `tip-health-advanced-wotc-fully-phased-out` were inspected against retained source, pending calculation and native XML. One nonpassive group-1 employee, hired January 15 and certified by start, has 400 hours and February qualified wages 6,000, yielding Form 5884 credit 2,400. Employee/payroll/business references join the source assertions. Section 280C wage reduction leaves Schedule C wages 3,600 and profit 500,000−3,600=496,400, containing tips 30,000 once. SE earnings 458,425.4 print 458,425; SS 21,836 plus Medicare 13,294 gives tax 35,130 and half-SE 17,565. AGI/MAGI 478,835 fully phases out the capped tip deduction; Schedule 1-A is absent. There are no health-plan inputs or health deduction; Form 7206 is absent. Form 8995-A QBI 478,835 gives component 95,767 but adjusted W-2 wages 3,600 cap it at 1,800; income limit 92,617 is nonbinding. Standard deduction 15,750 leaves taxable income 461,285 and regular tax 130,997. Form 6251 adds back the standard deduction: AMTI 477,035 less exemption 88,100 yields excess 388,935 and TMT 104,120; AMT is zero. All nine Form 3800 pages were inspected: current specified nonpassive Form 5884 row 4b and final credit 2,400 reconcile through Schedule 3 to Form 1040. Additional Medicare tax 2,326 plus SE gives other taxes 37,456; NIIT is zero. Regular tax less credit plus other taxes gives total/amount owed 166,053 with no payments. All actual pages, source/pending/native amounts, identities, marks, copies, continuations and canonical order reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T06:47:32.178295+00:00. Private `tip-wotc-phaseout-twentysix-page-review.json`, `tip-wotc-phaseout-reviewed-batch/review-manifest.json`, log/status and `verified237-aggregate.json` retain proof. Manifest SHA-256 `34eb1cdf6b108e6d449f0982f076f8c862d5f9d1a80727d2445fb4bc45a0cfcb`; terminal log SHA-256 `7dac695f85e805e4b16445b719358c17da1b1d8f3f9f1c62c4174afe217f2945`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 45 disjoint passing checker batches, 237 packets/2,198 pages. Misleading actual/issued-source and health-plan review wording extends only the existing future-only metadata item and remains unworked. Synthetic issuer/tip/payroll/SSA/certification/identity/residence and prior-source references do not authenticate issued records. Known future-only discrepancies remain unapproved despite earlier mechanical checks. All 52 frozen requirements and sixteen future-only items remain open; broad coverage, business rules and IRS acceptance remain unproved. Full regression remains live with at least 3,365 passing markers and the same five diagnosed stale assertions; prepared corrections await its terminal outcome.

### Mixed service/farm tip and health income limits: retained unapproved observation

All 31 actual pages of `mixed-cf-tip-health-income-limited` were inspected against source, pending calculation and native XML. Alex/Sam W-2 wages 180,000.37/50,000.49 add before rounding to 230,001. A controlled group with one shared employee caps qualified wages at 6,000 and credit at 2,400, allocating 1,200 per business; raw wages 6,000.49 each become filed deductions 4,800. Schedule C/F profits 35,201/55,201 contain service tips 40,000 once. Separate SE taxes 943/7,799 give total 8,742 and half-SE 472/3,900, total 4,372. Owner premiums 60,006/72,006 exceed business capacities 34,729/51,301; combined health deduction 86,030 plus half-SE exactly offsets business/farm income 90,402. AGI is 230,001, both QBI rows are zero, and no tip deduction or Schedule 1-A remains. Standard deduction 31,500 leaves taxable income 198,501 and regular tax 33,498. Form 6251 TMT 24,180 leaves AMT zero; all nine Form 3800 pages and the controlled-group continuation support the 2,400 credit. Combined SE earnings 83,486 produce Additional Medicare tax 571; other tax 9,313 gives tax 40,411 and refund 79,589 against withholding 120,000. Actual owner copies, canonical order, marks and legibility were inspected, including both Forms 7206.

Full packet approval is withheld: the supplied spouse NEC is described as secondary custom work, but Schedule F page 10 puts 1,001 on line 8/native `OtherIncomeAmt` while line 7 is blank. The [2025 IRS Schedule F instructions](https://www.irs.gov/instructions/i1040sf) route custom farming work to line 7 and reserve line 8 for income not reportable on lines 1–7. This source-classification discovery is recorded only in `future_todo` and remains unworked. Synthetic issuer/health/payroll/certification references also extend only the existing future metadata item. The private `mixed-cf-tip-health-income-limited-thirtyone-page-observation.json` retains all 31 page observations and source/XML/PDF hashes; page 10 amount/source approval is false. Source SHA-256 `a586b449bb09760a7497101bc64c031cff4577eabd78fb0e38d394c0544af9d1`, XML `4d3a838d2fdf9e05742a60c886f43bd920494998c3f1fe0fe55a88e0e362b2cc`, PDF `0e89027c87b189eee17c1f95670f610d64fba0c3e7ae00acf55e20670f974ac8`. Original preparation flags remain false. No passing checker batch was assembled and the aggregate remains 45 disjoint batches, 237 packets/2,198 pages. All 52 frozen requirements remain open, with 17 future-only items. No IRS rejection, external source authenticity, broad business-rule approval or ATS acceptance is claimed.

### Qualified tips wholly exclude QBI: independent packet pass

All twelve actual pages of `qualified-tip-qbi-wholly-excluded-qbi` were inspected against retained source, pending calculation and native XML. NEC 18,000 contains tips 12,000 once; Schedule C advertising 8,000 leaves profit 10,000. SE earnings 9,235 give separately rounded Social Security 1,145 and Medicare 268, total 1,413 and half-SE 707. AGI is 9,293. The business tip deduction is limited to profit less half-SE, 9,293; the 25,000 cap and 150,000 MAGI threshold are nonbinding. QBI 10,000−707−9,293 is zero, so Forms 8995/8995-A are omitted from native XML and the actual packet. Standard deduction 15,750 plus tips 9,293 gives total deductions 25,043 and taxable income zero. The [2025 IRS EIC table](https://www.irs.gov/publications/p596) confirms credit 649 for a single filer with no qualifying children in the 9,250–9,300 interval. Total tax 1,413 less payments 649 leaves 764 owed. Identity, eligibility assertions, marks, amounts, canonical order, continuations and legibility reconcile on every actual page.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T07:04:21.105005+00:00. Private `tip-qbi-zero-twelve-page-review.json`, `tip-qbi-zero-reviewed-batch/review-manifest.json`, terminal log/status and `verified238-aggregate.json` retain proof. Manifest SHA-256 `afd828d0b26f8d36234660805a58595d137a94c0d5c60aa7103e4ee8477f90ea`; log SHA-256 `76787209d6f14c21a9e641c00937e46265b9c2b4d47ea39c8f7b17fce364a98f`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 46 disjoint passing checker batches, 238 packets/2,210 pages. Issued/actual-source wording extends only the existing future metadata item and remains unworked; synthetic references do not authenticate issuer, tips, occupation, residence, IRS account or prior records. Known future-only filing discrepancies remain unapproved despite older mechanical passes. All 52 frozen requirements and 17 future-only items remain open. Full regression remains live with 3,416 passing markers and 5 diagnosed stale assertions; prepared corrections await its terminal outcome. Broad coverage, business rules and IRS acceptance remain unproved.

### Business tips with taxable-income-limited positive QBI: independent packet pass

All thirteen actual pages of `qualified-tip-qbi-positive-business-only` were inspected against retained source, pending calculation and native XML. NEC receipts 80,000 contain tips 12,000 once; advertising 8,000 leaves Schedule C profit 72,000. SE earnings 66,492 produce Social Security 8,245 and Medicare 1,928, total 10,173 and half-SE 5,087. AGI/MAGI 66,913 leaves the full 12,000 tip deduction under both the business net-income capacity and statutory cap/phaseout. Form 8995 QBI 72,000−5,087−12,000=54,913 gives component 10,983; taxable income before QBI 39,163 limits deduction to 7,833. Standard deduction 15,750 plus tips and QBI gives total deductions 35,583 and taxable income 31,330. The [2025 IRS tax table](https://www.irs.gov/publications/p1040) confirms single-filer ordinary tax 3,521 in the 31,300–31,350 interval. SE tax produces total tax/amount owed 13,694 with no payments. Every actual page, identity, mark, amount, canonical origin and continuation reconciles; Form 8995 is retained, with zero carryovers/REIT/PTP amounts.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T07:10:00.665857+00:00. Private `tip-qbi-positive-thirteen-page-review.json`, `tip-qbi-positive-reviewed-batch/review-manifest.json`, terminal log/status and `verified239-aggregate.json` retain proof. Manifest SHA-256 `73fe8235944527e41e5fffff049790999654f3aee793069f5dccf8dc62fc7889`; log SHA-256 `f3c91b186bbef874c75cb9d430de7c792c1c9f836c5f71eb25b52aa351b527db`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 47 disjoint passing checker batches, 239 packets/2,223 pages. Misleading issued/actual-source wording extends only the existing future metadata item and remains unworked; synthetic references do not authenticate external issuer/tip/occupation/residence/account or prior records. Known future-only filing discrepancies remain unapproved despite older mechanical checks. All 52 frozen requirements and 17 future-only items remain open. Full regression is confirmed live with 3,430 passing markers and five diagnosed stale assertions; prepared corrections await terminal outcome. Broad coverage, business rules and IRS acceptance remain unproved. Available local storage is approximately 167 MiB; no retained evidence was removed.

### W-2 wages with business tips and positive QBI: independent packet pass

All thirteen actual pages of `qualified-tip-qbi-issued-w2-qbi-binding` were inspected against retained source, pending calculation and native XML. W-2 wages 50,000 and withholding 11,000 join Alex/employee SSN and employer EIN/address; native W-2 SS wages/tax 50,000/3,100 and Medicare wages/tax 50,000/725 match the structured source. NEC receipts 80,000 contain tips 12,000 once; advertising 8,000 leaves profit 72,000. SE earnings 66,492 remain below the 126,100 Social Security base left after W-2 wages, producing SS 8,245 plus Medicare 1,928, total 10,173 and half-SE 5,087. Income 122,000 less half-SE gives AGI/MAGI 116,913, retaining the full 12,000 tip deduction. QBI 72,000−5,087−12,000=54,913 gives component/deduction 10,983. The income limit 17,833, based on taxable income before QBI 89,163, is nonbinding despite the fixture label. Standard deduction 15,750 plus tips and QBI gives total deductions 38,733 and taxable income 78,180. The [2025 IRS tax table](https://www.irs.gov/publications/p1040) confirms single tax 12,113 for 78,150–78,200; total tax 22,286 less withholding 11,000 leaves 11,286 owed. No EIC, health, NIIT or Additional Medicare claim is present. Every actual page, identity, mark, amount, canonical origin and continuation reconciles.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T07:15:35.732699+00:00. Private `tip-qbi-w2-thirteen-page-review.json`, `tip-qbi-w2-reviewed-batch/review-manifest.json`, terminal log/status and `verified240-aggregate.json` retain proof. Manifest SHA-256 `a2c8c7ba95a4fb0a0ff4dc6bae4f66ac0a84b9575095fa01697eab31918e0efc`; log SHA-256 `f3c91b186bbef874c75cb9d430de7c792c1c9f836c5f71eb25b52aa351b527db`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 48 disjoint passing checker batches, 240 packets/2,236 pages. Issued/actual-source wording and misleading binding label extend only the existing future metadata item and remain unworked. Synthetic references do not authenticate issuer/tip/occupation/residence/account or prior records. Known future-only filing discrepancies remain unapproved despite older mechanical checks. All 52 frozen requirements and 17 future-only items remain open. Full regression remains confirmed live with 3,458 passing markers and five diagnosed stale assertions; prepared corrections await terminal outcome. Broad coverage, business rules and IRS acceptance remain unproved. Compact JPEG page renders preserve readable review evidence while available local storage remains approximately 152 MiB; no retained evidence was removed.

### MFJ tip cap, phaseout and owner QBI allocation: independent packet pass

All nineteen actual pages of `qualified-tip-qbi-mfj-cap-phaseout-owner-allocation` were inspected against retained source, pending calculation and native XML. Separate NECs join Alex/Casey and their respective business references: profits 80,000/60,000 contain tips 40,000/30,000 once. Alex W-2 SS wages 176,100 exhaust only that owner's base, giving SE tax 2,143/half 1,072. Casey SE earnings 55,410 yield SS 6,871 plus Medicare 1,607, tax 8,478/half 4,239. Combined SE tax 10,621 and adjustment 5,311 reconcile. Income 316,100 less adjustment yields AGI/MAGI 310,789. Eligible tips 70,000 first meet the joint 25,000 cap; ten whole phaseout increments reduce deduction by 1,000 to 24,000. Proportional owner exclusions Alex 13,714/Casey 10,286 leave QBI 65,214/45,475, total 110,689 and deduction 22,138. Form 8995 income limit 51,058 is nonbinding. Standard deduction 31,500 plus tips/QBI leaves taxable income 233,151; the [2025 IRS computation worksheet](https://www.irs.gov/publications/p1040) gives 233,151×24%−14,306.00=41,650.24, rounded tax 41,650. Combined SE earnings 129,290 exceed the reduced Additional Medicare threshold 73,900 by 55,390, giving tax 499; additional withholding is zero. Form 8960 has zero investment income/tax despite MAGI exceeding its threshold. Other taxes 11,120 produce total 52,770; withholding 30,000 leaves 22,770 owed. Both owners, all actual copies, marks, continuations, amounts and canonical origins reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T07:22:05.564985+00:00. Private `tip-qbi-mfj-cap-nineteen-page-review-v2.json`, `tip-qbi-mfj-cap-v2-reviewed-batch/review-manifest.json`, terminal log/status and `verified241-aggregate.json` retain proof. Manifest SHA-256 `7f6f4e5472a6f4dabdb52b66a1bf68ec66511359c4895645898c7a15636026d4`; log SHA-256 `500564fcbe5ff23ccceadddb269568907388f7aa296698e4357fcd70f22f656d`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. The earlier unsubmitted review/assembly is preserved: v2 corrects only a reviewer arithmetic note from subtraction 14,306.50 to the authoritative 14,306.00; both round to the unchanged printed tax 41,650. No production or fixture amount changed. Runtime files and original preparation flags remain unchanged. Aggregate: 49 disjoint passing checker batches, 241 packets/2,255 pages. Actual/issued-source wording extends only the existing future metadata item and remains unworked; references do not authenticate issuer/tip/occupation/residence/account or prior records. Known future-only filing discrepancies remain unapproved despite older mechanical checks. All 52 frozen requirements and 17 future-only items remain open. Full regression remains live with 3,492 passing markers and five diagnosed stale assertions; prepared corrections await terminal outcome. Broad coverage, business rules and IRS acceptance remain unproved.


### MFJ employee/business tip allocation: independent packet pass

All nineteen actual pages of `qualified-tip-qbi-mfj-employee-business-tip-allocation` were inspected against retained source, pending calculation and native XML. Alex W-2 wages 176,100 include employee tips 5,000 once; SS wages 171,100 plus tips exhaust that owner's 176,100 base. Separate NECs join Alex/Casey businesses with profits 80,000/60,000; Alex receipts contain business tips 12,000 once, while Casey claims none. Separate SE taxes 2,143/8,478 and half-SE 1,072/4,239 reconcile to tax 10,621 and adjustment 5,311. AGI/MAGI is 310,789. Eligible tips 17,000 are below the cap; ten whole joint phaseout increments reduce the deduction by 1,000 to 16,000. Proportional allocation gives employee deduction 4,706 and business exclusion 11,294; only the business exclusion reduces QBI. Alex/Casey QBI 67,634/55,761 totals 123,395, giving deduction 24,679, below the nonbinding income limit 52,658. Standard deduction 31,500 plus tips and QBI leaves taxable income 238,610. The [2025 IRS computation worksheet](https://www.irs.gov/publications/p1040) gives 238,610×24%−14,306.00=42,960.40, rounded tax 42,960. Additional Medicare tax 499 plus SE gives other taxes 11,120; NIIT and additional withholding are zero. Total tax 54,080 less withholding 30,000 leaves 24,080 owed. Both owners, actual copies, marks, continuations, legibility and canonical origins reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T07:32:56.324780+00:00. Private `tip-qbi-mfj-employee-nineteen-page-review.json`, `tip-qbi-mfj-employee-reviewed-batch/review-manifest.json`, terminal log/status and `verified242-aggregate.json` retain proof. Manifest SHA-256 `1f1574105cfbac07eaf97a0f476b39df6ef99e75a5f55ee8253dbda4a216f936`; log SHA-256 `500564fcbe5ff23ccceadddb269568907388f7aa296698e4357fcd70f22f656d`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 50 disjoint passing checker batches, 242 packets/2,274 pages. Issued/actual-source wording extends only the existing future metadata item and remains unworked; references do not authenticate issuer/tip/occupation/residence/account or prior records. Known future-only filing discrepancies remain unapproved despite older mechanical checks. All 52 frozen requirements and 17 future-only items remain open. Full regression is confirmed live (PID 53927, S    05:08:30) with 3,519 passing markers and 5 diagnosed stale assertions; prepared corrections await terminal outcome. Broad coverage, business rules and IRS acceptance remain unproved.


### Housing-credit recapture reinspection and mortgage recovery observation

All twelve actual pages of `single-issued-k1-lihtc-recapture` and `joint-spouse-issued-k1-lihtc-recapture` were inspected against source, pending calculation and native XML. Issuer building totals 6,000/4,000 at 25% allocate 1,500/1,000, matching code F total 2,500. Separate December 2021 Form 8611 first-page copies retain building BINs NY1234567/NY1234568, address and placement date. Lines 8/10/12/14 carry each allocation, with zero unused credits and interest already included once; the Section 42(j)(5) note prints. Own-credit lines 1–7 and partnership-only lines 16–17 are blank. Combined recapture joins Schedule 2 lines 16/21 and Form 1040 line 23. Wages/AGI 80,000 give single taxable income 64,250/tax 9,055, total 11,555/refund 3,445; joint standard deduction 31,500 gives taxable income 48,500/tax 5,346, total 7,846/refund 7,154. The [2025 IRS tax table](https://www.irs.gov/publications/p1040) confirms both ordinary-tax entries.

The single-filer supplemental unchanged checker completed exit 0 at 2026-10-07T07:38:48.180440+00:00, with no runtime changes. Private `lihtc-single-six-page-review.json`, supplemental `lihtc-single-reviewed-batch/review-manifest.json` and terminal log/status retain proof: manifest SHA-256 `af6df522b9722659d7158f3f0dca09aa590b08b5c8618a4e4bb266300d627ebd`, log SHA-256 `697d8a9b80a16fc34db37abd6f8fa97e794673a60c75eaad13cee664df9be994`. This packet was already counted in the first 23-case checkpoint, so the supplemental pass adds no distinct case/page/batch to the 50-batch aggregate. The first assembly rejected its duplicated scope before manifest creation; that attempt was not a checker run or pass. The joint packet is unapproved: pages 5–6 print only HOUSING ALEX despite the spouse-owned K-1 and both names on the joint return. [IRS Form 8611 field A](https://www.irs.gov/pub/irs-pdf/f8611.pdf) requests names shown on return; the projector uses only `filer.nameLine1`. Primary SSN alone is not asserted to be an incorrect joint identifier. `lihtc-joint-six-page-observation.json` retains actual observations with owner review false on those pages. This is future-only header review, without a fix or new pass. Its older mechanical checkpoint is preserved but does not approve the new visual finding.

A five-page reinspection of already-counted `form4972-annuity-primary-3-spouse-0-nua-0` confirms three same-plan source records with total taxable distribution 30,000, capital gain 3,000 and annuity value 6,000. Ordinary portion 27,000 plus annuity gives 33,000; allowance 7,400 leaves 25,600. Rounded annuity ratio 0.18182 allocates 1,345 allowance and leaves 4,655 annuity. The [official Form 4972 rate schedule](https://www.irs.gov/pub/irs-pdf/f4972.pdf) gives tax 301 on 2,560 and 51 on 466; tentatively 3,010 less 510 gives 2,500 plus capital tax 600, total 3,100. Form 1040 line 16 marks Form 4972 and amount owed is 3,100. Standard deduction 17,750 and senior deduction 6,000 reconcile with source age and zero AGI. `annuity-three-source-five-page-reinspection.json` retains fresh observations; no duplicate aggregate or new checker pass is claimed. Issued/actual-record wording is future-only metadata: synthetic references and eligibility assertions are not authenticated issuer, plan or prior-filing evidence.

All six actual pages and retained synthetic Copy B of `single-1098-prior-year-recovery` were inspected. Current interest 18,000 is not reduced by prior-year refund 2,000; only reviewed taxable recovery 1,200 reaches the Schedule 1 line 8z statement and Form 1040 income/AGI 81,200. Itemization 18,000 leaves taxable income 63,200; official table tax 8,824 and withholding 12,000 give refund 3,176. Copy B SHA-256 `05a21a11e1e36541eee1197935d00d2539ac784897fafacf413e6d549e22fe47` matches 513,275 retained bytes and actual printed box 1/4 values; it is synthetic, with masked borrower TIN, and does not establish external authenticity or a prior-return tax-benefit workpaper. Full parity remains unapproved: printed Schedule A lines 8e/10/17 each 18,000 are absent from native XML. `prior-mortgage-recovery-six-page-observation.json` retains false amount/XML review on page 6; no checker pass or implementation is claimed. This extends only the existing future Schedule A omission item.

The main board remains byte-identical to its frozen scope, with 52 requirements open; 19 future items remain unworked. Distinct historical mechanical checker aggregate remains 242 packets/2,274 pages across 50 disjoint batches, with known future filing/visual findings explicitly unapproved. Full regression is confirmed live (PID 53927, S    05:19:00), with 4,325 passing markers and 5 diagnosed stale assertions; corrections remain prepared until terminal outcome. One transient shell here-document storage error recovered on retry; no retained evidence was removed, and no new storage-management work was executed. Readiness, broad coverage, business rules, external provenance and IRS acceptance remain unproved.


### Combined NEC/MISC business tips: independent packet pass

All twelve actual pages of `single-nec-misc-business-tips-schedule1a` were inspected against retained source, pending calculation and native XML. Distinct NEC/MISC payers join the same proprietor and cash-basis business: receipts 10,000/8,000 include tips 8,000/5,000 once. Advertising 8,000 leaves profit 10,000. SE earnings 9,235 yield separately rounded SS 1,145 and Medicare 268, tax 1,413 and half-SE 707. AGI/MAGI is 9,293. Combined reported tips 13,000 are limited once by profit after half-SE to 9,293; the 150,000 single phaseout threshold does not bind. QBI 10,000−707−9,293 is zero, so no Form 8995 claim is emitted. Standard deduction 15,750 plus tips gives 25,043, zero taxable income and income tax; total SE tax 1,413 is owed with no payments. No EIC eligibility is inferred: the source lacks main-home-over-half-year and explicit not-dependent answers required by the childless EIC gate, so zero credit is consistent with the retained source. Identity, amounts, marks, continuations, owner/copy order and legibility reconcile.

The unchanged normal type-checked independent checker completed exit 0 at 2026-10-07T07:52:06.662410+00:00. Private `nec-misc-tip-twelve-page-review.json`, `nec-misc-tip-reviewed-batch/review-manifest.json`, terminal log/status and `verified243-aggregate.json` retain proof. Manifest SHA-256 `74bd55050bae0e81f42d4bd4d48487c74d7e65f19cfc7447c8f405c2ed73977c`; log SHA-256 `76787209d6f14c21a9e641c00937e46265b9c2b4d47ea39c8f7b17fce364a98f`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 51 disjoint passing checker batches, 243 packets/2,286 pages. Known future filing/visual findings remain unapproved despite older mechanical checks. The review note's 9,294 cap differs from the correct filed 9,293; only the existing future metadata item is extended, without fixing the fixture. Synthetic source and eligibility references do not authenticate issuer, occupation, residency or prior records.

New artifact writes briefly returned ENOSPC despite about 118 MiB reported available; the reviewed data/hashes were retained in session, then successfully saved after available space increased. No retained evidence was removed and the future storage task was not executed. Full regression remains confirmed live (PID 53927, R    05:28:28), with 5,063 passing markers and 7 failure markers. The five diagnosed stale Form 8962 assertions retain prepared corrections, awaiting original terminal outcome. Two additional failures appeared: `f1040_spouse_header.test.ts` joint middle-initial printed-PDF check and `pdf/forms/f8962_dependent_magi.test.ts` below-threshold dependent rejection check. The latter still expects the older filing-requirement message by source inspection, but a new diagnostic or terminal error is required before classifying it. The normal type-checked spouse-header diagnostic remains live (PID 87301; session 58483); no result is inferred from elapsed time. Main board remains frozen with 52 requirements open; 19 future items remain unworked. Broad coverage, business rules, external authenticity and IRS acceptance remain unproved.


The subsequent unchanged, normal type-checked spouse-header recheck completed **1 passed / 0 failed**. Private `spouse-header-focused-recheck.log/json` retain command, terminal evidence and unchanged runtime hashes; log SHA-256 `c12e2c077673bd4c9091059576058392da09aaea42316aebfba580e7fb4a9a31`. The original full-run failure's cause is still pending its terminal error details; no production fix or full-suite pass is inferred.

The separate below-threshold dependent diagnostic completed **0 passed / 1 failed / 5 filtered**, exit 1 at 2026-10-07T07:56:02.743503+00:00. It confirms the same stale expected message as the earlier dependent cases: expected “does not establish the 2025 filing requirement,” actual “does not establish the 2025 single-dependent filing requirement.” Invalid source remains rejected correctly. Private `form8962-pdf-dependent-failure-diagnostic.log/json` retain proof, log SHA-256 `b2368ce1b2e9d9489fc76bbe6e31ade3b171bc2c0de7216d0538e344a432be5b`. One-line `pending-form8962-pdf-assertion-correction.patch` changes only the test's expected message and remains unapplied alongside the earlier two correction patches. No future task is executed: diagnosing and correcting full-regression failures belongs to the existing frozen validation requirement. Full regression remains confirmed live (PID 53927, S    05:30:47), with 5,130 passing and 7 failure markers; six stale assertions are diagnosed and one original spouse-header failure awaits terminal review. All runtime hashes remain unchanged.


### Form 8995-A loss netting and patron deduction: two independent packet passes

All twelve actual pages of `single-form8995a-two-business-loss-netting` were inspected against source, pending calculation and native XML. North/South business copies retain profits 1,300/−1,000, distinct EINs, cash accounting, participation and loss at-risk answers. Combined 300 is below the SE threshold. Schedule C (Form 8995-A) apportions the 1,000 loss to North, leaving QBI 300/0 and carryforward zero. North's 20% amount 60 is limited by 50% of eligible wages 100 to deduction 50; South's zero QBI carries no wages or UBIA. Before-QBI taxable income 284,550 is above the phase-in range and its 56,910 income limit is nonbinding. AGI 300,300 less standard deduction 15,750 and QBI 50 gives taxable income 284,500. The [2025 IRS single tax worksheet](https://www.irs.gov/publications/p1040) gives 284,500 × 35% − 30,452.75 = 69,122.25, rounded 69,122; withholding 60,000 leaves amount owed 9,122. NIIT is zero. Supplied synthetic W-2 omits SS/Med facts; broader payroll completeness is not inferred. [IRS loss-netting instructions](https://www.irs.gov/instructions/i8995a) confirm proportional allocation and zero wages/UBIA for zero adjusted QBI.

The unchanged independent checker completed exit 0 at 2026-10-07T07:59:45.623352+00:00. Private `qbi-loss-netting-twelve-page-review.json`, `qbi-loss-netting-reviewed-batch/review-manifest.json`, terminal log/status and `verified244-aggregate.json` retain proof. Manifest SHA-256 `5da5a4aa4f400d915f06b1df4c4eed8f75eea4b7a796195127d8a4f6d0ec4514`; log SHA-256 `417e03a773b714bb0622a395ceaef964f85d2d920554d570c6bedaad3224faf0`. Intermediate aggregate: 52 batches, 244 packets/2,298 pages.

All thirteen actual pages of `single-form8995a-patron-income-cap` were inspected. Same-owner PATR boxes 1/3 total 500,000.49 and are included once as filed cooperative receipts 500,000. Feed 439,999.50 and labor 10,000.50 round to 440,000/10,001, leaving Schedule F profit 49,999. SE earnings 46,174 produce separately rounded SS 5,726 and Medicare 1,339, tax 7,065 and half-SE 3,533. AGI/qualified-payment QBI is 46,466. Schedule D's 9% amount 4,182 is below 50% of wages 5,001 and joins parent line 14. Parent 20% amount 9,293 less 4,182 leaves component 5,111. Standard deduction 15,750 leaves before-QBI taxable income 30,716; its 6,143 income limit is nonbinding. Designated 199A(g) deduction 45,000 is capped at 30,716−5,111 = 25,605 under [official Form 8995-A line 38](https://www.irs.gov/pub/irs-pdf/f8995a.pdf). Total QBI deduction 30,716 leaves taxable income/income tax zero; SE tax 7,065 is owed with no payments. Patron mark, below-threshold skipped wage-limit section, Schedule D identity, amounts, continuations and page order reconcile. No health deduction is supplied.

The patron checker completed exit 0 at 2026-10-07T08:06:51.690164+00:00. Private `qbi-patron-thirteen-page-review.json`, `qbi-patron-reviewed-batch/review-manifest.json`, terminal log/status and `verified245-aggregate.json` retain proof. Manifest SHA-256 `38271092ff719e0384ff439a9a325328678190e48103125c46b1d0ea5ab4a834`; log SHA-256 `f3c91b186bbef874c75cb9d430de7c792c1c9f836c5f71eb25b52aa351b527db`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime hashes and original preparation flags remain unchanged. Aggregate: 53 disjoint passing batches, 245 packets/2,311 pages. PATR/notice/payroll/SSA references and prior-loss assertions are synthetic, without authenticated issuer or prior-filing bytes. “Actual PATR distributions” extends only the existing future metadata item, without implementation. Known future filing/visual findings remain unapproved despite historical mechanical passes. Frozen scope remains byte-identical with 52 requirements open and 19 future items unworked.

Full regression remains live (PID/status/elapsed: 53927 S    05:43:04), with 5,180 passing markers and 7 failure markers. Six diagnosed stale expected-message assertions remain prepared and unapplied pending original terminal outcome. Unchanged spouse-header recheck passed; original error remains pending. Broad coverage, external authenticity, business rules, operational prerequisites and IRS acceptance remain unproved.


### MFS accounting SSTB phase-in: independent fifteen-page packet pass

All fifteen actual pages of `mfs-primary-form8995a-accounting-sstb-phasein` were inspected against source, pending calculation and every native XML leaf. Alex/Sam identity, MFS full-spouse name and SSN, Denver address and digital-assets No agree. Structured synthetic reviews assert both spouses' full-year Colorado domicile, no elected community-property regime or retained community income, entirely primary separate earnings, and spouse standard deduction; these assertions are not authenticated domicile or prior-return records. Supplied wages 210,000 and accounting receipts 38,431 less employee wages 10,000 give business profit 28,431. W-2 SS wages 176,100 consume the SS cap; SE earnings 26,256 yield Medicare-only SE tax 761 and half-SE 381. AGI is 238,050; standard deduction 15,750 gives before-QBI taxable income 222,300.

Accounting is a listed SSTB. The [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a) support the MFS threshold 197,300 and range 50,000. Excess 25,000 gives 50% applicable percentage on Schedule A: QBI 28,431−381 = 28,050 becomes 14,025, employee wages 10,000 become 5,000, and UBIA stays zero. Parent 20% amount 2,805 exceeds wage limit 2,500; difference 305 × 50% rounds 153, leaving deduction 2,652. Income limit 44,460 is nonbinding. Taxable income is 219,648; [IRS MFS worksheet](https://www.irs.gov/publications/p1040) gives 219,648 × 32% − 22,937 = 47,350.36, rounded 47,350.

[Form 8959's MFS threshold](https://www.irs.gov/instructions/i8959) is 125,000: wage excess 85,000 gives tax 765, and wages reduce SE threshold to zero; 26,256 × 0.9% rounds 236. Additional Medicare totals 1,001; together with SE 761, other tax 1,762 gives total 49,112. Supplied W-2 box 6 withholding 3,045 equals regular Medicare and gives no additional withholding; Form 1040 payments 50,000/refund 888 reconcile. NIIT is zero despite MAGI above threshold because there is no investment income. Source expressly supplies Schedule C 32a all-investment-at-risk and native/PDF both retain it; [IRS instructions](https://www.irs.gov/instructions/i1040sc) say positive-profit filers need not complete that question, without prohibiting the supplied answer. No contrary checkbox fact is inferred. All owner/copy order, continuations and actual page legibility checks passed.

The unchanged independent checker completed exit 0 at 2026-10-07T08:11:35.416471+00:00. Private `mfs-sstb-fifteen-page-review.json`, `mfs-sstb-reviewed-batch/review-manifest.json`, terminal log/status and `verified246-aggregate.json` retain proof. Manifest SHA-256 `c0c47b934d0fd22968b373cbb5b65f8c578a1b93890e34753cf8a5eb5b1f75bd`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Global runtime files and original preparation flags remain unchanged. Aggregate: 54 disjoint mechanically passing batches, 246 packets/2,326 pages.

The synthetic employer source reports no extra 90 withholding although IRS employer rules require 0.9% above 200,000 regardless of return filing status. The return correctly uses supplied actual withholding; no extra amount is invented and no payroll-compliance or authentic-issuer claim is made. This new source-fixture observation is only a future item, unworked. The historical checker pass approves the inspected calculation/packet chain, not that withholding-source compliance. Synthetic contracts/payroll/SSA/domicile/spouse deduction/prior-loss references do not establish external authenticity. Known future filing/visual findings remain unapproved despite historical passes. Main task scope remains byte-identical with 52 requirements open; 20 future items remain unworked.

Full regression is confirmed live (PID/status/elapsed: 53927 S    05:47:26), with 5,201 passing markers and 7 failure markers. Six stale assertions have prepared corrections awaiting original terminal outcome; unchanged spouse-header recheck passed, original error still pending. Full coverage, business rules, operational prerequisites and IRS acceptance remain unproved.


### Joint accounting SSTB phase-in: independent fifteen-page packet pass

All fifteen actual pages of `joint-primary-form8995a-accounting-sstb-phasein` were inspected against retained source, pending calculation, complete native XML leaves and canonical page origins. Alex/Sam identities, SSNs, MFJ, Austin address, digital-assets No and joint return-wide headers agree. One primary-owned W-2 reports wages 420,000 and withholding 90,000. Accounting receipts 38,431 less employee wages 10,000 leave primary profit 28,431. Primary SS wages 176,100 consume the SS cap; SE earnings 26,256 produce Medicare-only SE tax 761 and half-SE 381. Source/owner instances require no spouse business or SE copy. Income 448,431 less 381 gives AGI 448,050; standard deduction 31,500 leaves before-QBI taxable income 416,550.

The [2025 SSTB instructions](https://www.irs.gov/instructions/i8995a) support accounting classification and joint threshold 394,600/range 100,000. Excess 21,950 yields phase-in 21.95% and applicable 78.05%. Original QBI 28,050 becomes 21,893; employee wages 10,000 become 7,805 and UBIA stays zero. Parent 20% amount 4,379 exceeds wage limit 3,903; difference 476 × 21.95% rounds 104, leaving deduction 4,275. Income limit 83,310 is nonbinding. Taxable income 412,275 gives [IRS joint worksheet tax](https://www.irs.gov/publications/p1040) 412,275 × 32% − 45,874 = 86,054.

[Form 8959 joint threshold](https://www.irs.gov/instructions/i8959) 250,000 gives wage tax 1,530 on excess 170,000 and reduces the SE threshold to zero; 26,256 × 0.9% rounds 236. Additional Medicare 1,766 plus SE 761 gives other tax 2,527, total tax 88,581 and refund 1,419 from payments 90,000. Supplied box 6 withholding 6,090 equals regular Medicare, so no additional withholding is invented. NIIT is zero despite MAGI 448,050 exceeding threshold 250,000 because investment income is zero. Source/PDF/native 32a all-investment-at-risk agrees with the explicit supplied answer; positive-profit applicability is qualified as in the preceding MFS inspection. Owner/copy order, continuations, checkboxes and legibility reconcile on all fifteen pages.

The unchanged independent checker completed exit 0 at 2026-10-07T08:16:02.188612+00:00. Private `mfj-sstb-fifteen-page-review.json`, `mfj-sstb-reviewed-batch/review-manifest.json`, terminal log/status and `verified247-aggregate.json` retain proof. Manifest SHA-256 `88678352a06fd11e5c533f07e3b7d54668b170fc622529d17a8ec3111926ab9b`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 55 disjoint passing checker batches, 247 packets/2,341 pages.

The existing future withholding-source item is extended only with this fixture: regular-only box 6 omits employer-rule additional withholding 1,980 on 420,000−200,000. Filed calculation correctly retains supplied actual withholding; no employer compliance or authentic issued-record claim follows from this synthetic packet pass. Service/payroll/SSA/prior-loss references remain synthetic assertions. Future filing/visual/source findings remain unapproved despite mechanical passes, and future items remain unworked. Main task area stays byte-identical with 52 requirements open; 20 future items remain open.

Full regression is confirmed live (PID/status/elapsed: 53927 S    05:51:48), with 5,224 passing markers and 7 failure markers. Six prepared stale assertion corrections remain unapplied pending original terminal outcome. Unchanged spouse-header recheck passed, while the original error remains pending. Full coverage, business rules, operational prerequisites, source authenticity and IRS acceptance remain unproved.


### Single patron farm: independent fifteen-page packet pass

All fifteen actual pages of `single-form8995a-patron-farm` were inspected against retained source, pending calculation, every native XML leaf and canonical page origins. Alex/Single/Austin identity, SSN and digital-assets No agree. Grain farm PATR-FARM/EIN 123456789 uses cash accounting, material participation Yes, 1099-required No and no CCC-loan election. Products 300,000 plus PATR boxes 1/3 total 200,000.49 are included once; filed gross 500,000 less labor 100,001 (source 100,000.50) leaves profit 399,999. SE earnings 369,399 produce separately rounded SS 21,836 and Medicare 10,713, total 32,549 and half-SE 16,275. AGI/QBI is 383,724; standard deduction 15,750 leaves before-QBI taxable income 367,974, above the single phase-in range.

Retained qualified-receipt proportion 200,000.49/500,000.49 allocates qualified-payment QBI 153,490 and raw wages 100,000.50 to filed allocated wages 40,000. Schedule D's 9% QBI amount 13,814 is below wage 50% amount 20,000 and joins parent line 14 under the [IRS patron instructions](https://www.irs.gov/instructions/i8995a). Parent 20% QBI 76,745 is capped by 50% of filed eligible wages 100,001 to 50,001; patron reduction leaves component 36,187. Income limit 73,595 is nonbinding. Written designation 10,000.49 rounds 10,000, below remaining taxable income 367,974−36,187 = 331,787, yielding total QBI deduction 46,187. Source supplies no health/retirement deduction; none is inferred.

Taxable income is 321,787. [IRS single worksheet](https://www.irs.gov/publications/p1040) gives 321,787 × 35% − 30,452.75 = 82,172.70, rounded 82,173. Form 8959's SE excess 169,399 above 200,000 gives additional Medicare 1,525; no wages/withholding are supplied. Line 13 was independently confirmed as 1,525 with extracted text and actual 200-dpi page inspection after the small 100-dpi rendering was ambiguous; the printed field is legible and unclipped. NIIT remains zero with no investment income despite MAGI above threshold. Other tax 32,549+1,525 = 34,074 gives total tax/amount owed 116,247, without payments. All owner/copy order, continuations and checkbox facts reconcile.

The unchanged independent checker completed exit 0 at 2026-10-07T08:20:34.473082+00:00. Private `patron-farm-fifteen-page-review.json`, `patron-farm-reviewed-batch/review-manifest.json`, terminal log/status and `verified248-aggregate.json` retain proof. Manifest SHA-256 `e0b38d4f19d098283ba333b07c12ef54d12c61e66221fb9fefd07ff6fb567f5b`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 56 disjoint passing checker batches, 248 packets/2,356 pages.

“Actual PATR distributions” wording extends only the existing future metadata observation, without changing fixture or runtime. Issuer, designation, employee payroll/SSA, allocation books and prior-loss references are synthetic assertions, without authenticated issued or prior-filing records. Known future filing/visual/source findings remain unapproved despite historical mechanical checks. Main task scope remains byte-identical with 52 requirements open; 20 future items remain unworked.

Full regression is confirmed live (PID/status/elapsed: 53927 S    05:56:16), with 5,247 passing markers and 7 failure markers. Six stale assertion corrections remain prepared and unapplied pending original terminal outcome; unchanged spouse-header recheck passed, original error pending. Full coverage, external authenticity, business rules, operational prerequisites and IRS acceptance remain unproved.


### Single patron Schedule C with health: independent sixteen-page packet pass

All sixteen actual pages of `single-form8995a-patron-c-health` were inspected against retained source, pending calculation, all native XML leaves and canonical form/copy origins. Alex/Single/Austin identity, SSN and digital-assets No agree. Agricultural supply Schedule C uses cash accounting, material participation Yes and 1099-required No; positive-profit at-risk answer is unsupplied and remains blank. Receipts 200,000 plus PATR boxes 1/3 total 300,000.49 are included once as filed gross 500,000. Wages 100,000.50 round 100,001 and office expense 50,000 gives profit 349,999. SE earnings 323,224 produce SS 21,836 and Medicare 9,373, total 31,209 and half-SE 15,605.

Twelve reviewed health months each supply premiums 500 and no subsidized employer eligibility. Form 7206's sole profitable business ratio is 100%; profit less half-SE gives nonbinding limit 334,394, leaving deduction 6,000. No LTC, retirement, Marketplace or Form 2555 adjustment is supplied. Adjustments total 21,605 and AGI/QBI is 328,394. The [health deduction instructions](https://www.irs.gov/instructions/i7206) support the monthly eligibility limit and separate SE treatment.

Qualified-receipt proportion 300,000.49/500,000.49 allocates adjusted QBI 197,037 and wages 60,000. [Patron reduction](https://www.irs.gov/instructions/i8995a) is the lesser of 9% QBI 17,733 and 50% wages 30,000. Parent 20% QBI 65,679 is wage-limited to 50,001; reduction leaves component 32,268. Before-QBI taxable income 312,644 exceeds the phase-in range and its 20% limit 62,529 is nonbinding. Written designation 10,000.49 rounds 10,000, below remaining taxable income 280,376, yielding deduction 42,268. Standard plus QBI deductions total 58,018 and taxable income is 270,376.

The [IRS single tax worksheet](https://www.irs.gov/publications/p1040) gives 270,376 × 35% − 30,452.75 = 64,178.85, rounded 64,179. Additional Medicare on SE excess 123,224 above 200,000 rounds 1,109. NIIT is zero because investment income is zero. Other tax 31,209+1,109 = 32,318 gives total tax/amount owed 96,497 without payments. All sixteen pages reconcile owner/copy order, continuations, checkboxes, legibility and native amounts.

The unchanged independent checker completed exit 0 at 2026-10-07T08:28:18.214281+00:00. Private `patron-c-health-sixteen-page-review.json`, `patron-c-health-reviewed-batch/review-manifest.json`, terminal log/status and `verified249-aggregate.json` retain proof. Manifest SHA-256 `75e2e820e1eefd59dbb329adbd60082bce83888a4272cad3b1397fe9deb24f97`; log SHA-256 `acab67fa53998bad9d5ee36b3e491bc87a2783033610a245344ac7d56c52395a`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 57 disjoint passing batches, 249 packets/2,372 pages.

“Actual PATR distributions” wording extends only the existing future metadata item. Issuer, designation, payroll/SSA, allocation books and health source references remain synthetic assertions without authenticated records. Future findings remain unworked and unapproved despite mechanical checks. Main task scope remains byte-identical with 52 requirements open; 20 future items remain open.

Full regression is live at PID 53927, elapsed 06:03:17, with 5,284 passing markers and 7 failure markers. Six stale assertion corrections remain prepared and unapplied pending original terminal outcome; unchanged spouse-header recheck passed, original error pending. Full coverage, source authenticity, business rules, operational prerequisites and IRS acceptance remain unproved.


### Single patron phase-in with taxable-income cap: independent fifteen-page packet pass

All fifteen actual pages of `single-form8995a-patron-phase-income-cap` were inspected against full source, pending calculation, every native XML leaf and canonical page origins. Alex/Single/Austin, SSN and digital-assets No agree. Grain farming uses cash accounting, material participation Yes and 1099-required No. PATR boxes 1/3 total 3,000,000.49 is included once as filed gross 3,000,000; feed 2,735,000.50 rounds 2,735,001 and labor 10,000.50 rounds 10,001. Filed expense 2,745,002 leaves profit 254,998. SE earnings 235,491 produce SS 21,836 and Medicare 6,829, total 28,665 and half-SE 14,333. AGI/QBI is 240,665; no health/retirement deduction is supplied.

Standard deduction 15,750 leaves before-QBI taxable income 224,915. The [IRS phase-in and patron instructions](https://www.irs.gov/instructions/i8995a) give single excess 27,615 above threshold 197,300 over range 50,000, or 55.23%. Parent 20% QBI 48,133 less wage limit 5,001 gives difference 43,132; phase reduction rounds 23,822, leaving 24,311. All gross receipts are qualified payments, so allocated QBI/wages equal 240,665/10,001. Schedule D compares 9% QBI 21,660 with 50% wages 5,001; patron reduction 5,001 leaves component 19,310. Income limit 44,983 is nonbinding. Written designation 270,000 is capped by remaining taxable income 224,915−19,310 = 205,605, yielding total QBI deduction 224,915.

Taxable income and income tax become zero. SE excess 35,491 above 200,000 produces additional Medicare 319; NIIT stays zero without investment income. Other tax/total tax/amount owed is 28,665+319 = 28,984 without payments. All fifteen pages reconcile amounts, owner/copy order, checkbox semantics, continuations and legibility; positive-profit Schedule F line 36 remains blank.

Independent checker terminal exit 0 at 2026-10-07T08:31:39.254366+00:00. Private `patron-phase-cap-fifteen-page-review.json`, `patron-phase-cap-reviewed-batch/review-manifest.json`, terminal log/status and `verified250-aggregate.json` retain proof. Manifest SHA-256 `9e2f111a7ab1dc44806de80fdee73734eb2e15dce13bac5c82460d43469544b9`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Aggregate: 58 disjoint passing batches, 250 packets/2,387 pages; runtime files and original preparation flags remain unchanged.

Actual-PATR wording extends only the existing future metadata observation. Issuer/designation/payroll/SSA/allocation/prior-record authenticity remains unproved; all future work remains unworked. Main task area is byte-identical with 52 requirements open; 20 future items remain open.

The original full regression remains live. It now also reports `single-form8995a-two-business-aggregation` in the PDF-source XSD test as failed. Unchanged focused normal-type-checked diagnosis is running at PID 95715. The test's generic branch uses direct `buildMefXml`, while prepared replay uses `buildMefBundle` and the native aggregation builder requires its bundled annual disclosure PDF; this is a suspected harness mismatch, pending terminal error evidence. No runtime/test correction has been applied. Six earlier stale assertions remain prepared; original spouse-header failure still awaits terminal detail despite unchanged focused pass.


### Aggregation XSD regression failure: unchanged focused diagnosis

The normal type-checked focused command recorded above reached terminal exit 1 at 2026-10-07T08:33:27.053341+00:00: 0 passed, 1 failed, 372 filtered. The exact error is `Form 8995-A aggregation requires its bundled annual disclosure PDF`, thrown by the native Schedule B guard and reached through the test's `buildMefXml` fallback at line 199. Prepared source/replay already uses `buildMefBundle`, which generates and binds this required disclosure. This confirms a test harness mismatch; the native rejection remains appropriate.

Private `aggregation-xsd-failure-diagnostic.json/log` retains terminal output (earlier Check/XFA-warning chunks were displayed separately), command, test hash and unchanged runtime verification. Terminal-output SHA-256 is `2783345a1566e0b8b4d2fdefbbd05c83b9aae53075a702857b14bb0e6e54ee24`; unchanged test SHA-256 is `d49933e946293270c7a6e6ddf776c065e71d46f5308f1a4fb01ac430328082d2`. Private `pending-aggregation-xsd-bundle-correction.patch` changes only this fixture's test export to the real bundle path; `git apply --check` passed. It remains unapplied until the original full regression terminates. Six prepared stale-message assertions and this seventh harness correction will require focused and full rerun proof. The original spouse-header failure remains undiagnosed despite its unchanged focused pass.

At the latest authoritative process check, full-regression PID 53927 was live in state S at elapsed 06:08:12 and progressing through mortgage fixtures. No restart or runtime mutation occurred. Main task scope remains frozen; no future item was executed.


### Single patron inside phase-in range with unbound wage limit: independent fifteen-page pass

All fifteen actual pages of `single-form8995a-patron-phase-unbound` were inspected against complete source, selected pending calculation, every native XML leaf and canonical page origins. Alex/Single/Austin/SSN/digital-assets No agree. Grain farm uses cash accounting, material participation Yes and 1099-required No. Products 160,000 plus PATR 200,000.49 are included once as gross 360,000. Labor 110,000.50 rounds 110,001, leaving profit 249,999. SE earnings 230,874 produce SS 21,836 and Medicare 6,695, total 28,531 and half-SE 14,266; AGI/QBI is 235,733 with no health/retirement deduction.

Standard deduction 15,750 leaves before-QBI taxable income 219,983 within the single phase-in range. However, 50% wages 55,001 exceed 20% QBI 47,147, so the wage limit does not bind and Part III is correctly skipped under the [IRS Form 8995-A instructions](https://www.irs.gov/instructions/i8995a). Qualified-receipt ratio 200,000.49/360,000.49 allocates adjusted QBI 130,963 and raw wages 110,000.50 to 61,111. Schedule D compares 9% QBI 11,787 against 50% allocated wages 30,556; patron reduction 11,787 leaves component 35,360. Income limit 43,997 is nonbinding. Notice 10,000.49 rounds 10,000, below remaining taxable income 184,623, yielding QBI deduction 45,360.

Total deductions 61,110 leave taxable income 174,623. The [2025 IRS single worksheet](https://www.irs.gov/publications/p1040) uses subtraction **7,153.00**, giving 174,623 × 24% − 7,153.00 = 34,756.52, rounded 34,757. Additional Medicare on SE excess 30,874 rounds 278; NIIT is zero without investment income. Other tax 28,809 gives total tax/amount owed 63,566 without payments. All pages reconcile amount/owner/copy/checkbox/continuation facts and are legible/unclipped.

The independent checker completed exit 0 at 2026-10-07T08:35:59.862562+00:00. Private `patron-unbound-fifteen-page-review.json`, `patron-unbound-reviewed-batch/review-manifest.json`, terminal log/status and `verified251-aggregate.json` retain proof. Manifest SHA-256 `49128d4499e3a55ccf7e37685802e49355f8e6167cf5ca974c49fb9afa09b2c5`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 59 disjoint passing batches, 251 packets/2,402 pages.

Existing future actual-PATR wording observation is extended only with this fixture; synthetic issuer/designation/payroll/SSA/books/prior-record assertions remain unauthenticated. Future work remains unworked; main task area remains byte-identical with 52 requirements open and 20 future items.

Full regression remains live and progresses through Form 8283 gift fixtures. Latest log has 5,331 passing markers and 8 failure markers. Seven diagnosed test corrections remain unapplied pending original terminal outcome; original spouse-header error is still pending despite unchanged focused pass. Missing selected packet proof includes the earlier single patron phase-farm fixture and six primary/spouse joint patron variants. Full coverage, business rules, external authenticity, operational prerequisites and IRS acceptance remain open.


### Single patron farm with binding phase-in: independent fifteen-page pass

All fifteen actual pages of `single-form8995a-patron-phase-farm` were inspected against complete source, pending calculations, every native XML leaf and canonical form/copy origins. Alex/Single/Austin identity, SSN and digital-assets No agree. Grain farm uses cash accounting, material participation Yes and 1099-required No. Products 100,000 plus PATR 200,000.49 are included once as filed gross 300,000. Labor 60,000.50 rounds 60,001, leaving profit 239,999. SE earnings 221,639 produce SS 21,836 and Medicare 6,428, total 28,264 and half-SE 14,132. AGI/QBI is 225,867 without health/retirement adjustment.

Standard deduction 15,750 leaves before-QBI taxable income 210,117. The [IRS phase-in instructions](https://www.irs.gov/instructions/i8995a) give excess 12,817 above single threshold 197,300 over range 50,000, or 25.634%. Parent 20% QBI 45,173 less wage limit 30,001 gives difference 15,172; multiplying by phase percentage rounds reduction 3,889, leaving 41,284. Qualified-receipt ratio 200,000.49/300,000.49 allocates adjusted QBI 150,578 and raw eligible wages 60,000.50 to filed allocated wages 40,000. Schedule D compares 9% QBI 13,552 with 50% wages 20,000; patron reduction 13,552 leaves component 27,732. Income limit 42,023 is nonbinding. Notice 10,000.49 rounds 10,000 below remaining taxable income 182,385, giving total QBI deduction 37,732.

Total deductions 53,482 leave taxable income 172,385. The [2025 IRS single worksheet](https://www.irs.gov/publications/p1040) gives 172,385 × 24% − 7,153.00 = 34,219.40, rounded 34,219. Additional Medicare on SE excess 21,639 rounds 195. NIIT is zero without investment income. Other tax 28,459 gives total tax/amount owed 62,678 without payments. All fifteen pages reconcile owner/copy order, checkbox semantics, continuations, native amounts and legibility; positive-profit Schedule F line 36 stays blank.

Independent checker exit 0 at 2026-10-07T08:38:55.409311+00:00. Private `patron-phase-farm-fifteen-page-review.json`, `patron-phase-farm-reviewed-batch/review-manifest.json`, terminal log/status and `verified252-aggregate.json` retain proof. Manifest SHA-256 `249a019e7ea169eda7d370d486287789e029d49b916195e95e546ffebaf1ef1a`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 60 disjoint passing batches, 252 packets/2,417 pages.

The existing future actual-PATR wording observation includes this fixture; issuer/designation/payroll/SSA/books/prior-record assertions remain synthetic and unauthenticated. No future work is executed. Main task area stays byte-identical with 52 requirements open; 20 future items remain open.

Full regression PID 53927 remains live (S, elapsed 06:13:39), with 5,354 passing markers and 8 failure markers, progressing through source-backed collectibles. Seven corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Six joint primary/spouse patron variants still need selected packet proof. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint primary-owned patron farm: independent fifteen-page pass

All fifteen actual pages of `joint-form8995a-patron-farm` were inspected against complete source, pending data, every native XML leaf and canonical page origins. Alex111223333/Sam444556666/MFJ/Austin/digital-assets No and joint return-wide names agree. Alex alone owns farm PATR-FARM/EIN123456789 and its Schedule SE; Sam alone receives the retained W-2 from Second Example Employer/EIN987654321. Sam's SS wages 176,100 do not offset Alex's SS tax. Products 100,000 plus PATR 200,000.49 are included once as filed farm gross 300,000, less rounded labor 60,001 giving profit 239,999. Alex's SE earnings 221,639 produce SS 21,836 plus Medicare 6,428, total 28,264 and half-SE 14,132.

Sam's wages 230,000.49 plus farm profit give filed income 469,999; adjustments 14,132 give AGI 455,867. Standard deduction 31,500 leaves before-QBI taxable income 424,367. [Joint phase-in](https://www.irs.gov/instructions/i8995a) uses threshold 394,600 and range 100,000; excess 29,767 gives 29.767%. Parent 20% QBI 45,173 less wage limit 30,001 gives difference 15,172; phase reduction rounds 4,516, leaving 40,657. Qualified receipt ratio 200,000.49/300,000.49 allocates adjusted QBI 150,578 and wages 40,000. Patron reduction is lesser 9% QBI 13,552 versus 50% wages 20,000, leaving component 27,105. Income limit 84,873 is nonbinding. Written designation 10,000.49 rounds 10,000 below remaining taxable income 397,262, yielding total QBI deduction 37,105.

Taxable income 387,262 gives [IRS joint worksheet tax](https://www.irs.gov/publications/p1040) 387,262 × 24% − 14,306 = 78,636.88, rounded 78,637. [Additional Medicare](https://www.irs.gov/instructions/i8959) wage tax is zero below joint threshold 250,000; wages leave SE threshold 20,000, so excess 201,639 produces 1,815. Small line 13 was confirmed as 1,815 using extracted text and an actual 200-dpi page inspection after 100-dpi ambiguity. Sam's supplied Medicare withholding 3,605.01 rounds 3,605, less regular withholding 3,335 gives additional withholding 270. Federal withholding 42,000.50 rounds 42,001; payments total 42,271. NIIT is zero without investment income. Other tax 30,079 gives total tax 108,716 and amount owed 66,445. All fifteen pages reconcile owner/copy/header facts, amounts, checkbox semantics, continuations and legibility.

Independent checker exit 0 at 2026-10-07T08:42:14.524025+00:00. Private `patron-joint-farm-fifteen-page-review.json`, `patron-joint-farm-reviewed-batch/review-manifest.json`, terminal log/status and `verified253-aggregate.json` retain proof. Manifest SHA-256 `8e2a835a70a1a7a0a9267a2be4e0cdb20eb14aeebe1d1d484f9301bc62ac98d6`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Aggregate: 61 disjoint passing batches, 253 packets/2,432 pages.

Existing future actual-PATR wording observation includes this joint fixture; issuer/designation/payroll/SSA/books/prior records remain synthetic assertions. No future item is executed. Frozen main task area is byte-identical with 52 requirements open; 20 future items remain open.

Full regression PID 53927 remains live (S, elapsed 06:16:58), with 5,372 passing markers and 8 failure markers, progressing through qualified-tip fixtures. Seven diagnosed test corrections remain unapplied until original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Five joint primary/spouse patron variants still need selected packet proof. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint primary-owned patron business with health deduction: independent sixteen-page pass

All sixteen actual pages of `joint-form8995a-patron-c-health` were inspected against complete source, monthly health eligibility, pending calculations, every native XML leaf and canonical form/copy origins. Alex111223333/Sam444556666/MFJ/Austin identity and digital-assets No agree. Alex owns Schedule C PATR-C and its SE/7206; Sam owns the W-2. Joint return-wide headers retain both names. Receipts 100,000 plus PATR 250,000.49 are included once; filed gross 350,000 less wages 60,001 and office expense 25,001 leaves profit 264,998. Alex SE earnings 244,726 produce SS 21,836 plus Medicare 7,097, total 28,933 and half-SE 14,467. Sam SS wages do not offset Alex's SS tax.

Twelve verified synthetic health-policy months at 500 each, with neither spouse employer-eligible, give 6,000 against nonbinding earned-income limit 250,531. The [health deduction instructions](https://www.irs.gov/instructions/i7206) retain SE tax before this deduction. Wages 230,000.49 and business profit, less adjustments 20,467, give filed AGI 474,531. Standard deduction 31,500 leaves before-QBI income 443,031; Alex adjusted QBI is 244,531. [Joint QBI phase-in](https://www.irs.gov/instructions/i8995a) excess 48,431 over threshold 394,600 gives 48.431%. Parent 20% QBI 48,906 less wage limit 30,001 gives difference 18,905; phase reduction 9,156 leaves 39,750. Qualified receipt ratio 250,000.49/350,000.49 allocates QBI 174,665 and wages 42,858. Patron reduction is lesser 9% QBI 15,720 versus 50% wages 21,429, leaving component 24,030. Income limit 88,606 is nonbinding; designation 10,000 is below remaining taxable income 419,001. QBI deduction totals 34,030.

Taxable income 409,001 gives [joint worksheet tax](https://www.irs.gov/publications/p1040) 409,001 × 32% − 45,874 = 85,006.32, rounded 85,006. Additional Medicare wage tax is zero; remaining joint SE threshold 20,000 gives excess 224,726 and tax 2,023. NIIT is zero without investment income. Other tax 30,956 gives total tax 115,962. Federal withholding 42,001 plus additional Medicare withholding 270 gives payments 42,271 and amount owed 73,691. All sixteen pages reconcile owner/copy/header facts, checkbox semantics, amounts, continuations and legibility.

Independent checker exit 0 at 2026-10-07T08:46:12.534525+00:00. Private `patron-joint-health-sixteen-page-review.json`, `patron-joint-health-reviewed-batch/review-manifest.json`, terminal log/status and `verified254-aggregate.json` retain proof. Manifest SHA-256 `879606089925cca690b54f19c7585b019fea1f1b251193c03a5e8aef36cab79c`; log SHA-256 `acab67fa53998bad9d5ee36b3e491bc87a2783033610a245344ac7d56c52395a`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime and original preparation flags remain unchanged. Confirmed aggregate: 62 disjoint passing batches, 254 packets/2,448 pages.

Only the existing future actual-PATR wording observation is extended with this fixture; synthetic issuer/designation/payroll/SSA/health references do not authenticate external records. No future item is executed. Frozen main task area is byte-identical with 52 requirements open; 20 future items remain open.

Full regression PID 53927 remains live (S, elapsed 06:25:31), with 5,418 passing markers and 8 failure markers. Seven diagnosed corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Four joint primary/spouse patron variants still need selected packet proof. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint primary-owned patron farm with remaining-income cap: independent fifteen-page pass

All fifteen actual pages of `joint-form8995a-patron-income-cap` were inspected against complete source, pending calculations, every native XML leaf and canonical form/copy origins. Alex111223333/Sam444556666/MFJ/Austin identity, digital-assets No and joint return-wide names agree. Alex owns farm PATR-FARM, EIN123456789 and Schedule SE; Sam owns the W-2. PATR boxes 1 and 3 total 6,000,000.49 and are included once in farm gross, filed 6,000,000. Feed 5,735,000.50 rounds 5,735,001; labor 10,000.50 rounds 10,001; total expenses 5,745,002 leaves profit 254,998. SE earnings 235,491 give SS 21,836 and Medicare 6,829, total 28,665 and half-SE 14,333. Sam's SS wages do not offset Alex's SS tax.

Wages 230,000.49 plus profit give filed total income 484,998; adjustments 14,333 leave AGI 470,665. Standard deduction 31,500 leaves before-QBI taxable income 439,165; adjusted QBI is 240,665. [Joint phase-in](https://www.irs.gov/instructions/i8995a) excess 44,565 above threshold 394,600 over range 100,000 gives 44.565%. Parent 20% QBI 48,133 less wage limit 5,001 gives difference 43,132; multiplying by 44.565% rounds reduction 19,222, leaving 28,911. All receipts are qualified; Schedule D compares 9% QBI 21,660 with 50% wages 5,001. Patron reduction 5,001 leaves component 23,910. Income limit 87,833 is nonbinding. Designation 540,000 is capped at remaining taxable income 439,165 − 23,910 = 415,255, giving QBI deduction 439,165 and taxable income zero.

Income tax is zero. [Additional Medicare](https://www.irs.gov/instructions/i8959) wage tax is zero below joint threshold 250,000; remaining SE threshold 20,000 gives excess 215,491 and tax 1,939. NIIT is zero without investment income. Other/total tax is 30,604. Federal withholding 42,001 plus additional Medicare withholding 270 gives payments 42,271 and refund 11,667. All fifteen actual pages reconcile owner/copy/header facts, amounts, checkbox semantics, continuations and legibility. Positive-profit Schedule F line 36 and optional SE methods stay blank.

Independent checker exit 0 at 2026-10-07T08:53:44.022345+00:00. Private `patron-joint-cap-fifteen-page-review.json`, `patron-joint-cap-reviewed-batch/review-manifest.json`, terminal log/status and `verified255-aggregate.json` retain proof. Manifest SHA-256 `3f38db7309ee661ca9f30e099781308baccae0399a8d350b7e976d08eacef21a`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime and original preparation flags remain unchanged. Confirmed aggregate: 63 disjoint passing batches, 255 packets/2,463 pages.

Only the existing future actual-PATR wording observation is extended with this fixture; issuer/designation/payroll/SSA references remain synthetic and unauthenticated. No future work is executed. Main task area stays byte-identical with 52 requirements open; 20 future items remain open.

Full regression PID 53927 remains live (S, elapsed 06:28:26), with 5,435 passing markers and 8 failure markers. Seven corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Three spouse-owned joint patron variants still need selected packet proof. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint spouse-owned patron farm: independent fifteen-page pass

All fifteen actual pages of `joint-spouse-owned-form8995a-patron-farm` were inspected against complete source, pending calculations, every native XML leaf and canonical form/copy origins. Alex111223333/Sam444556666/MFJ/Austin identity and digital-assets No agree. Sam owns PATR-FARM/EIN123456789, the cooperative recipient/designation and Schedule F/SE. Their PDF and native SSNs are 444556666. Alex receives the W-2, native recipient 111223333, and his SS wages 176,100 do not consume Sam's SE cap. Joint return-wide forms retain both names and primary SSN.

Products 100,000 plus PATR 200,000.49 are included once as farm gross 300,000; labor 60,000.50 rounds 60,001, leaving profit 239,999. Sam SE earnings 221,639 produce SS 21,836 and Medicare 6,428, total 28,264 and half-SE 14,132. Alex wages 230,000.49 plus profit less adjustment give filed AGI 455,867, adjusted business QBI 225,867 and before-QBI taxable income 424,367 after standard deduction 31,500.

[Joint QBI phase-in](https://www.irs.gov/instructions/i8995a) excess 29,767 above 394,600 over range 100,000 gives 29.767%. Parent 20% QBI 45,173 less wage limit 30,001 gives difference 15,172; reduction rounds 4,516, leaving 40,657. Qualified receipt ratio 200,000.49/300,000.49 allocates QBI 150,578 and wages 40,000. Patron reduction is lesser 9% QBI 13,552 versus 50% wages 20,000; component is 27,105. Income limit 84,873 is nonbinding. Designation 10,000 is below remaining income 397,262, giving deduction 37,105. Taxable income 387,262 gives [joint worksheet tax](https://www.irs.gov/publications/p1040) 387,262 × 24% − 14,306 = 78,636.88, rounded 78,637.

Additional Medicare wage tax is zero; remaining joint SE threshold 20,000 gives excess 201,639 and tax 1,815. NIIT is zero without investment income. Other tax 30,079 gives total tax 108,716. Withholding 42,001 plus additional Medicare withholding 270 gives payments 42,271 and amount owed 66,445. All fifteen pages reconcile owners/copies/headers, native amounts, checkbox semantics, continuations and legibility. Positive-profit Schedule F line 36 and optional SE methods remain blank.

Final independent checker exit 0 at 2026-10-07T08:57:35.646668+00:00. Private `patron-spouse-farm-fifteen-page-review-v2.json`, `patron-spouse-farm-v2-reviewed-batch/review-manifest.json`, terminal log/status and `verified256-aggregate.json` retain proof. Manifest SHA-256 `e81e7b6965bfe6a2d04cca758cad96c468219e427fd4a2fc848d4e2842bbce14`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. An earlier checker pass is preserved but excluded from the aggregate because one copied reviewer note called the spouse QBI “PrimaryQBI”; v2 corrects that note and reruns verification. Original filed artifacts and runtime files remain unchanged. Confirmed aggregate: 64 disjoint passing batches, 256 packets/2,478 pages.

Only existing future metadata and actual-PATR observations are extended. Two inherited review-focus lines describe opposite ownership, while the appended spouse-owner line and actual source/pending/XML/PDF ownership reconcile. Issuer/payroll/SSA/designation records remain synthetic. No future work is executed. Main task area stays byte-identical with 52 requirements open; 20 future items remain open.

Full regression PID 53927 remains live (S, elapsed 06:32:08), with 5,455 passing markers and 8 failure markers. Seven corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Spouse-owned joint patron health and income-cap variants still need selected packet proof. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint spouse-owned patron business with health deduction: independent sixteen-page pass

All sixteen actual pages of `joint-spouse-owned-form8995a-patron-c-health` were inspected against complete source, all twelve premium/eligibility months, pending calculations, every native XML leaf and canonical page origins. Alex111223333/Sam444556666/MFJ/Austin identity and digital-assets No agree. Sam owns PATR-C/EIN123456789, cooperative recipient/designation, Schedule C/SE and Form 7206; those native/PDF names and SSNs are Sam444556666. Form 7206 selects the supplied spouse identity while retaining primary identity Alex separately. Alex owns the W-2, native recipient111223333, and his SS wages do not reduce Sam's SE cap. Joint return-wide forms retain both names and primary SSN.

Receipts 100,000 plus PATR 250,000.49 are included once as gross 350,000. Rounded wages 60,001 and office expenses 25,001 leave profit 264,998. Sam SE earnings 244,726 produce SS 21,836 and Medicare 7,097, total 28,933 and half-SE 14,467. Twelve premiums of 500 each, with neither spouse employer-eligible and no Marketplace/LTC/PSO exclusion, give health deduction 6,000 against earned-income limit 250,531. [Form 7206 instructions](https://www.irs.gov/instructions/i7206) retain SE tax before this deduction. No other earned income applies to the business owner Sam; Alex's separately owned wages remain in the joint return.

Joint AGI is 474,531, adjusted Sam QBI 244,531 and before-QBI income 443,031 after standard deduction 31,500. [Joint phase-in](https://www.irs.gov/instructions/i8995a) excess 48,431 over 394,600 over range 100,000 gives 48.431%. Parent 20% QBI 48,906 less wage limit 30,001 gives difference 18,905; reduction 9,156 leaves 39,750. Qualified receipt ratio 250,000.49/350,000.49 allocates QBI 174,665 and wages 42,858. Patron reduction is lesser 9% QBI 15,720 versus 50% wages 21,429; component is 24,030. Income limit 88,606 is nonbinding; designation 10,000 is below remaining income 419,001, giving deduction 34,030. Taxable income 409,001 gives [joint worksheet tax](https://www.irs.gov/publications/p1040) 409,001 × 32% − 45,874 = 85,006.32, rounded 85,006.

Additional Medicare wage tax is zero; remaining joint SE threshold 20,000 gives excess 224,726 and tax 2,023. NIIT is zero without investment income. Other tax 30,956 gives total tax 115,962. Withholding 42,001 plus additional Medicare withholding 270 gives payments 42,271 and amount owed 73,691. All sixteen pages reconcile owners/copies/headers, amounts, checkbox semantics, continuations and legibility. Unsupplied Schedule C line 32 and optional SE methods stay blank.

Independent checker exit 0 at 2026-10-07T09:01:38.417263+00:00. Private `patron-spouse-health-sixteen-page-review.json`, `patron-spouse-health-reviewed-batch/review-manifest.json`, terminal log/status and `verified257-aggregate.json` retain proof. Manifest SHA-256 `d37b99f80c8731327584f3fff66db97f9d573530912333e59e3b20dece557cbe`; log SHA-256 `acab67fa53998bad9d5ee36b3e491bc87a2783033610a245344ac7d56c52395a`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Confirmed aggregate: 65 disjoint passing batches, 257 packets/2,494 pages.

Only existing future ownership-metadata and actual-PATR observations are extended with this fixture. Inherited review-focus lines still describe opposite ownership despite the correct appended spouse-owner line and actual source/pending/XML/PDF; issuer/payroll/SSA/designation/health records remain synthetic assertions. No future work is executed. Main task area stays byte-identical with 52 requirements open; 20 future items remain open.

Full regression PID53927 remains live (S, elapsed06:36:19), with5,470 passing markers and8 failure markers. Seven corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Spouse-owned joint patron income-cap still needs selected packet proof. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint spouse-owned patron farm with remaining-income cap: independent fifteen-page pass

All fifteen actual pages of `joint-spouse-owned-form8995a-patron-income-cap` were inspected against complete source, pending calculations, every native XML leaf and canonical page origins. Alex111223333/Sam444556666/MFJ/Austin identity and digital-assets No agree. Sam owns PATR-FARM/EIN123456789, the cooperative recipient/designation and Schedule F/SE; owned PDF/native names and SSNs are Sam444556666. Alex owns the W-2, native recipient111223333, and his SS wages176,100 do not consume Sam's SE cap. Joint return-wide forms retain both names and primary SSN.

PATR boxes1/3 total6,000,000.49 and are included once as filed gross6,000,000. Feed5,735,000.50 rounds5,735,001; labor10,000.50 rounds10,001; expenses5,745,002 leave profit254,998. Sam SE235,491 produces SS21,836 and Medicare6,829, total28,665 and half-SE14,333. Alex wages230,000.49 plus profit less adjustments give filed AGI470,665; adjusted Sam QBI240,665 and before-QBI income439,165 after standard31,500.

[Joint phase-in](https://www.irs.gov/instructions/i8995a) excess44,565 above394,600 over range100,000 gives44.565%. Parent20% QBI48,133 less wage limit5,001 gives difference43,132; reduction19,222 leaves28,911. All receipts are qualified; patron reduction is lesser9% QBI21,660 versus50% wages5,001, leaving component23,910. Income limit87,833 is nonbinding. Written designation540,000 is capped at remaining income439,165−23,910=415,255, giving QBI deduction439,165 and taxable income/income tax zero.

Additional Medicare wage tax is zero; remaining joint SE threshold20,000 gives excess215,491 and tax1,939. NIIT is zero without investment income. Other/total tax30,604 and payments42,271 (W-2 withholding42,001 plus additional Medicare withholding270) give refund11,667. All fifteen pages reconcile owners/copies/headers, amounts, checkbox semantics, continuations and legibility. Positive-profit Schedule F line36 and optional SE methods remain blank.

Independent checker exit0 at2026-10-07T09:05:51.499332+00:00. Private `patron-spouse-cap-fifteen-page-review.json`, `patron-spouse-cap-reviewed-batch/review-manifest.json`, terminal log/status and `verified258-aggregate.json` retain proof. Manifest SHA-256 `35f54d9045e36dcc622b646fffcf9fc02c696e4c6cb0feaff89cf2857948975d`; log SHA-256 `3fc34eb7e567d5a9ec6053e192cb59f6f0d41f46e3a8b799618994bad6172170`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Confirmed aggregate:66 disjoint passing batches,258 packets/2,509 pages.

Only existing future metadata and actual-PATR observations are extended with this fixture. Inherited review-focus text describes opposite ownership despite the correct appended spouse-owner line and actual source/pending/XML/PDF. Issuer/payroll/SSA/designation records remain synthetic assertions. No future work is executed. Main task area stays byte-identical with52 requirements open;20 future items remain open.

Full regression PID53927 remains live (S, elapsed06:39:55), with5,483 passing markers and8 failure markers. Seven corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Remaining selected preparation inventory after this pass is103 packets, including known future-only observations excluded from approval. Existing multi-business/farm ownership cases are next. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open.


### Joint mixed business/farm with independent owner SE caps: independent seventeen-page pass

All seventeen actual pages of `joint-owned-se-mixed-business-and-farm` were inspected against complete source, pending calculations, every native XML leaf and canonical page origins. Alex111223333/Sam444556666/MFJ/Austin identity and digital-assets No agree. Alex owns Consulting541600/Owner business1/EIN123456789, profit60,000; Sam owns GRAIN FARMING111100/Owned source farm/EIN123456791, profit40,000, and W-2 from employer987654321. Both business/farm forms retain explicit source at-risk answers and cash/material participation Yes/1099 No. [Joint SE instructions](https://www.irs.gov/instructions/i1040sse) require separate owner SE forms and combined Schedule2 tax.

Alex SE60,000×92.35%=55,410, with own SS wages0 despite Sam wages176,100, gives SS6,871 and Medicare1,607, total8,478 and half4,239. Sam SE40,000×92.35%=36,940, with own SS wages176,100 consuming his SS cap, gives SS0 and Medicare1,071, total1,071 and half536. Native and actual PDF SE copy1 is Alex; copy2 is Sam. Combined SE tax9,549 and half-SE4,775 reconcile to Schedules2/1.

Wages176,100 plus C60,000/F40,000 give income276,100 and AGI271,325. [Attributable QBI deductions](https://www.irs.gov/instructions/i8995) yield separate rows60,000−4,239=55,761 for Alex and40,000−536=39,464 for Sam; total95,225 gives20% component19,045. Standard31,500 leaves before-QBI income239,825 and nonbinding20% income limit47,965; deduction19,045 gives taxable220,780. [Joint tax worksheet](https://www.irs.gov/publications/p1040)220,780×24%−14,306=38,681.20, rounded38,681.

Additional Medicare combines SE55,410+36,940=92,350 after joint remaining threshold250,000−176,100=73,900; excess18,450 gives tax166. Supplied Medicare withholding2,553.45 rounds2,553, equal regular withholding, with additional withholding0. NIIT is0 without investment income; MAGI excess21,325 is nonbinding. Other tax9,715 gives total48,396; withholding30,000 gives amount owed18,396. All seventeen actual pages reconcile owner/copy/header facts, native amounts, explicit checkbox answers, continuations and legibility.

Independent checker exit0 at2026-10-07T09:09:38.224867+00:00. Private `owned-mixed-se-seventeen-page-review.json`, `owned-mixed-se-reviewed-batch/review-manifest.json`, terminal log/status and `verified259-aggregate.json` retain proof. Manifest SHA-256 `825d0aeed928c80541129f8509a6baf4b772ece83ae64cb09fb065a1dd356b2a`; log SHA-256 `026c6f09f6223e3ac5303a0b83c8e27ed42aa1d08ac1e86b7ef09d7b52af7877`; checker SHA-256 `c98231ff4591b8a1bb11f743bd9245cf623186f989e871797874a65a84d89ee2`. Runtime files and original preparation flags remain unchanged. Confirmed aggregate:67 disjoint passing batches,259 packets/2,526 pages.

No new future discrepancy was found in this packet. External source authenticity remains unproved; synthetic calculation proof is bounded. No future work is executed. Main task area stays byte-identical with52 requirements open;20 future items remain open.

Full regression PID53927 remains live (S, elapsed06:44:22), with5,503 passing markers and8 failure markers. Seven corrections remain prepared and unapplied pending original terminal outcome; original spouse-header error remains pending despite unchanged focused pass. Full coverage, authenticity, business rules, operational prerequisites and IRS acceptance remain open. Existing owner-specific multiple-business wage-cap and WOTC/health cases remain in the review queue.

### Two separately owned businesses and spouse wage cap: seventeen-page pass

All 17 actual pages of `joint-owned-se-two-businesses-spouse-wage-cap` were reviewed against the complete source, pending calculations, native XML and canonical page origins. Alex owns Schedule C copy 1 (EIN 123456789, profit 60,000); Sam owns copy 2 (EIN 123456790, profit 40,000) and the W-2 wages of 176,100. Each business prints the correct proprietor identity, cash method, material participation Yes, 1099 No and supplied at-risk answer. Both continuation pages are legible and in order.

Separate Schedule SE copies apply each owner's own wages: Alex has no wage-cap reduction, giving tax 8,478 and half-SE 4,239; Sam's own wages consume the Social Security cap, leaving Medicare tax 1,071 and half-SE 536. Combined tax 9,549 and adjustment 4,775 reconcile to Schedules 2 and 1. Schedule 1 line 3 contains both business profits, 100,000; farm line 6 is blank. AGI is 271,325. Owner QBI rows 55,761 and 39,464 total 95,225; the 19,045 component is below the 47,965 income limit. Taxable income 220,780 gives joint worksheet tax 38,681. Additional Medicare tax 166 gives total tax 48,396; withholding 30,000 leaves amount owed 18,396. NIIT is zero. Identity, all printed amounts, explicit checkbox answers and native owner joins agree.

Independent checker passed at 2026-10-07T09:17:34.953902+00:00 with exit 0. Private `owned-two-business-se-seventeen-page-review.json`, `owned-two-business-se-reviewed-batch/review-manifest.json`, checker log/status and `verified260-aggregate.json` retain proof. Manifest SHA-256 `67e4fc6a5d3fa2c204b856e28287dfdaf4013dbbe6b59a7dfc6a95618fd248c7`; log SHA-256 `026c6f09f6223e3ac5303a0b83c8e27ed42aa1d08ac1e86b7ef09d7b52af7877`. All runtime hashes remain unchanged. Aggregate: 68 disjoint passing batches, 260 packets and 2,543 pages.

No new discrepancy was found in this packet. External authenticity, broad coverage, business rules and IRS acceptance remain unproved. The main board remains byte-identical with 52 open requirements, and future work remains unexecuted. Full regression PID 53927 is still live; its seven prepared corrections remain unapplied until the original run terminates. The next existing audit packet is the two-farm WOTC case.

### Two-farm WOTC classification observation: future-only, unapproved

Complete input records and canonical origins were read for `owned-two-farm-wotc-below`. Both farm native documents and actual pages 8–11 were inspected. Source NECs describe secondary custom machine work of 1,000.50 for Alex and Sam separately. Both Schedule F first pages print 1,001 on line 8 and leave line 7 blank; native copies likewise emit `OtherIncomeAmt` without custom-hire income. The [2025 IRS instructions](https://www.irs.gov/instructions/i1040sf) assign custom farming work to line 7. The existing future classification item was extended with this observation; no source, calculation, projector or native builder was changed.

Private `two-farm-wotc-classification-observation.json` preserves packet hashes and the limited inspection boundary. This is not a complete 29-page review, has no passing review manifest and is excluded from the 260-packet aggregate. Source payroll/SWA/SSA references are synthetic assertions, not authenticated issued records. Existing future work remains unexecuted. Main board scope remains unchanged.

### Form 8994 direct employer, full current credit use: 23-page pass

Complete structured sources, finalized pending data, every native XML leaf and all 23 actual return pages were reviewed for `single-form8994-direct-employer-full`. Alex Example / 123456789 / Single / Boise identity, digital-assets No and no dependents agree. Boise Design / EIN 825555123 receives 100,000 and has gross wages 50,000. The two employees' paid-leave amounts 2,400 at 75% replacement and 3,200 at 100% replacement yield credits 450 and 800, respectively, under [Form 8994 instructions](https://www.irs.gov/instructions/i8994). Their prior compensation 80,000 and 72,000 is below the 2025 limit 93,000. The source policy dates precede leave and supplies the required coverage and noninterference assertions. All four Form 8994 answers print Yes; lines 1/3 and native total are 1,250.

The full determined credit reduces gross wage deduction to 48,750 before calculating Schedule C profit 51,250. SE earnings 47,329.375 yield SS tax 5,869 plus Medicare 1,373 = 7,242 and half-SE 3,621. AGI/QBI 47,629 and standard deduction 15,750 leave before-QBI income 31,879. The income limit 6,376 binds the QBI component 9,526, giving taxable income 25,503 and tax-table tax 2,825. Form 6251 adds back standard deduction, giving AMTI 41,253 below exemption 88,100 and TMT/AMT zero. Form 3800 Part III line 4j and specified-credit limit allow all 1,250; Schedule 3 and native reference join Form 1040. Tax after credit 1,575 plus SE 7,242 gives amount owed 8,817, with no payments. All nine Form 3800 pages are included; no prior carryovers, transfers, EPE or multiple-entity breakdown is claimed.

All six retained attachment PDFs were extracted, hashed, text-read and visually inspected. Policy, payroll, two leave-pay records and two prior-compensation records match their structured references and six native BinaryAttachment locations. Each actual page explicitly contains a synthetic JSON review record. Their consistency and legibility are verified; actual employer policy, paid wages and prior-issued record authenticity remain unproved. The existing future source-wording item was extended; no future implementation occurred.

Independent checker passed at 2026-10-07T09:23:31.585355+00:00, exit 0. Private `family-leave-full-twentythree-page-review.json`, `family-leave-full-reviewed-batch/review-manifest.json`, terminal checker log/status and `verified261-aggregate.json` preserve proof. Manifest SHA-256 `03d186306be6b87b368962d259b8af4da881e6760cb02b24ea447130ad9b6e34`; log SHA-256 `0ca6e342d137c4964f9d6e77aaf6c3d717cea3f0a5d64a99f3a39856ac2a82f7`. All runtime hashes remain unchanged. Aggregate: 69 disjoint passing batches, 261 return packets / 2,566 return pages; six supplemental source pages are not added to the return-page count.

Main scope remains byte-identical with 52 open requirements and 20 future items unworked. The full regression PID 53927 is still live; prepared corrections remain unapplied. The partial-current-use Form 8994 case has the same complete source/filer/attachment bytes except Schedule C receipts 75,000 and its review-focus current-use wording. Its render session 92025 is pending page inspection; no passing evidence is yet claimed for it. Broad coverage, authenticity, business rules and IRS acceptance remain open.

### Form 8994 direct employer, partial current credit use: 23-page pass

All 23 actual pages of `single-form8994-direct-employer-partial` were independently inspected against its complete source difference, finalized pending totals and every native XML leaf. Its source, filer and all six attachment bytes/descriptions match the fully inspected full-use case, except gross receipts 75,000 and the current-use review wording. The credit remains 1,250 and wages remain reduced from 50,000 to 48,750, even though current credit use is only 693. The [Form 8994 wage-reduction instructions](https://www.irs.gov/instructions/i8994) require the full determined-credit reduction regardless of current use.

Profit 26,250 gives SE earnings 24,241.875, separately rounded SS tax 3,006 and Medicare 703, total 3,709 and half-SE 1,855. AGI/QBI 24,395 and standard deduction 15,750 give before-QBI income 8,645; its 20% limit 1,729 binds the component 4,879. Taxable income 6,916 gives single tax-table tax 693. Form 6251 AMTI 22,666 is below exemption 88,100; TMT/AMT remain zero. Form 3800 line 4j retains determined credit 1,250, while column (i), Part II line 38, Schedule 3 and Form 1040 use 693. Tax after credits is zero; SE tax leaves amount owed 3,709 with no payments. The unused 557 is not proof of a durable accepted-filing carryforward ledger. All printed identities, checkbox answers, continuations, nine Form 3800 pages and native references reconcile and are legible.

Independent checker passed at 2026-10-07T09:26:57.613397+00:00 with exit 0. Private `family-leave-partial-twentythree-page-review.json`, `family-leave-partial-reviewed-batch/review-manifest.json`, terminal log/status and `verified262-aggregate.json` retain proof. Manifest SHA-256 `88b607e25549d37a141840617b3c5690ca1704543278a99c4b7b04ae3810c97b`; log SHA-256 `0ca6e342d137c4964f9d6e77aaf6c3d717cea3f0a5d64a99f3a39856ac2a82f7`. Runtime hashes remain unchanged. Aggregate: 70 disjoint passing batches, 262 packets / 2,589 return pages.

The future source-wording note now includes this case's identical synthetic evidence; future work remains unexecuted. Main scope is unchanged with 52 open requirements. Full regression PID 53927 is still live (S, elapsed 07:01:43); seven prepared corrections remain unapplied. The next existing case, `single-form8994-direct-employer-zero`, has the same source/filer/attachment bytes except receipts 65,000; its renderer session 86222 is pending inspection. No pass is claimed for it. Broad coverage, authentic records, BR and IRS acceptance remain open.


### Form 8994 direct employer, zero current credit use: 22-page pass

All 22 return pages and every native XML leaf of `single-form8994-direct-employer-zero` were inspected. Source, filer and six attachment bytes/descriptions match the full-use case except receipts 65,000 and review-focus wording. Determined credit remains 1,250; the full wage reduction leaves deductible wages 48,750 and profit 16,250. SE earnings 15,006.875 round to 15,007; separate SS tax 1,861 and Medicare 435 give tax 2,296 and half-SE 1,148. AGI/QBI 15,102 is below the standard deduction 15,750; taxable income, QBI deduction, regular tax and current credit use are zero. Form 6251 AMTI 15,102 is below exemption 88,100. Form 3800 retains determined credit 1,250 and allowed credit zero; Schedule 3 is correctly absent. Amount owed is SE tax 2,296. EIC eligibility is not established by this fixture; a zero result does not prove ineligibility. Unused credit is not proof of an accepted future carryforward ledger.

Checker exited 0 at 2026-10-07T09:31:42.924531+00:00. Private `family-leave-zero-twentytwo-page-review.json`, terminal log/status and `verified263-aggregate.json` retain proof. Manifest SHA-256 `cdb78faedbb4a51c4dc0454a6a58da7b524d2d194bce5c2df6d69ae041cbabc1`; log SHA-256 `428ae759405b4a07609cb49076610e21767dc4d4b86d12d20f1f8bfc0da05e1f`. Aggregate: 71 disjoint passing batches, 263 packets / 2,611 return pages; runtime hashes unchanged. The existing future source-wording item includes this identical synthetic evidence and remains unworked. Main scope remains byte-identical, with 52 requirements open. Full regression remains live; prepared corrections remain unapplied. The existing SHOP credit packet is next; no pass is yet claimed. Broad coverage, authenticity, BR and IRS acceptance remain open.


### Single SHOP premium credit: 23-page pass

All 23 actual pages of `single-shop-health-premium-credit`, complete source and every native XML leaf were inspected. Five employee records each retain 2,080 hours, wages 20,000 and twelve monthly billed/paid rows (months 1–8: 834/417; months 9–12: 832/416). Per-employee annual premiums/payments are 10,000/5,000, payroll totals 10,400 hours and 100,000 wages, giving 5 FTEs and average wages 20,000. The [2025 IRS Form 8941 instructions](https://www.irs.gov/instructions/i8941) list Albany employee-only average premium 9,358. Uniform 50% employer payment limits eligible premiums to 5 × 9,358 × 50% = 23,395; 50% credit is 11,697.50, filed 11,698 without phaseout or state subsidy. The fixture supplies first-year eligibility assertions, not authenticated carrier/payroll/prior-filing bytes.

Gross benefits 26,000 less determined credit 11,698 leave deductible benefits 14,302. Receipts 250,000 minus wages 100,000 and benefits give profit 135,698. SE earnings 125,317.103 give separately rounded SS 15,539 and Medicare 3,634, total SE tax 19,173 and half-SE 9,587. AGI/QBI 126,111 minus standard deduction 15,750 give before-QBI income 110,361; its 20% limit 22,072 binds QBI component 25,222. Taxable income 88,289 gives single tax-table tax 14,335. AMTI 104,039 less exemption 88,100 gives excess 15,939 and TMT 4,144; AMT is zero. Specified-credit limit 14,335 allows all 11,698 on Form 3800 Part III 4h / line 38, Schedule 3 and Form 1040. Tax after credits 2,637 plus SE tax 19,173 gives amount owed 21,810; payments zero. All nine Form 3800 pages and return continuations reconcile. Higher-resolution Form 8941 inspection confirms lines 13/14 each show 5; no omission is recorded.

Independent checker exited 0 at 2026-10-07T09:40:58.123726+00:00. Private `shop-premium-twentythree-page-review.json`, terminal log/status and `verified264-aggregate.json` retain evidence. Manifest SHA-256 `10a2b693c4ee9ec5c2363b071b6c35adc08c2691e4e4845c8a48b6e576081590`; log SHA-256 `0ca6e342d137c4964f9d6e77aaf6c3d717cea3f0a5d64a99f3a39856ac2a82f7`. Aggregate: 72 disjoint passing batches, 264 packets / 2,634 return pages, runtime unchanged. Main scope remains byte-identical with 52 requirements open and all 20 future items unworked. Full regression remains live; seven prepared corrections remain unapplied. The next existing part-year SHOP fixture has its top-level source and employees read and renderer session 88360 launched; monthly source, native and actual-page review remain pending, with no pass claimed. Broad coverage, authenticated sources, BR and IRS acceptance remain open.


### Part-year SHOP enrollment: 23-page pass

Complete source, all 34 monthly enrollment/invoice/payment rows, all 23 actual pages and every native XML leaf of `single-shop-part-year-enrollment` were inspected. Employee enrollment periods are July–December, April–December, July–December, October–December and March–December. Each covered month retains premium 1,000 and employer payment 500 with employee, employer, plan, dates and reference joins. Annual payments total 17,000. The first employee's actual 2,300 payroll hours are capped at 2,080; credited annual hours total 7,800, giving floor(7,800/2,080) = 3 FTEs and wages 75,000 / 3 = 25,000. Albany premium cap 9,358 × 34/12 × 50% = 13,257.1667, filed 13,257; determined credit 6,629 has no phaseout. Synthetic references establish the bounded calculation, not authentic employer/carrier records.

Benefits 18,000 less full credit 6,629 give deductible benefits 11,371. Receipts 180,000 minus wages 75,000 and benefits give profit 93,629. SE earnings 86,466.3815 give SS 10,722 and Medicare 2,508, total 13,230 and half-SE 6,615. AGI/QBI 87,014 gives before-QBI income 71,264 after standard deduction 15,750; income limit 14,253 binds component 17,403. Taxable income 57,011 gives single table tax 7,460. AMTI 72,761 is below exemption 88,100, TMT/AMT zero. Specified-credit limit 7,460 permits all 6,629; Form 3800 4h/38, Schedule 3 and Form 1040 agree. After-credit tax 831 plus SE 13,230 gives amount owed 14,061; payments zero. All continuations and nine Form 3800 pages were inspected, with no new future observation.

Checker exited 0 at 2026-10-07T09:43:51.990833+00:00. Private review, manifest, terminal log/status and `verified265-aggregate.json` retain evidence. Manifest SHA-256 `d25f952a9a6262d54f297c4980cb216f44397606d35464d6072ee15f189ed637`; log SHA-256 `0ca6e342d137c4964f9d6e77aaf6c3d717cea3f0a5d64a99f3a39856ac2a82f7`. Aggregate: 73 disjoint passing batches, 265 packets / 2,657 pages; runtime unchanged. Main scope byte-identical with 52 open requirements and 20 future items unworked. Full regression PID 53927 remains live. The existing mixed-family SHOP fixture has top-level source read and renderer 36756 launched; monthly, pending/native and actual-page review remain pending, with no pass claimed. Broad coverage, provenance, BR and IRS acceptance remain open.


### Mixed family and employee-only SHOP tiers: 23-page pass

All 60 actual monthly source rows, employee/dependent enrollment records, all 23 actual PDF pages and every native leaf of `single-shop-mixed-family-tiers` were inspected. Three employees have family coverage with two named dependents each, premium/payment 2,400/1,200 per month; two have employee-only coverage at 1,000/500. All twelve months retain owned plan, employer, employee, coverage/invoice/payment dates and distinct synthetic references. The first worker's 2,300 payroll hours are capped at 2,080; five credited FTEs and average wages 20,000 have no phaseout. Annual employer premiums total 55,200. Albany averages 24,527 family and 9,358 employee-only give cap 3 × 24,527 × 50% + 2 × 9,358 × 50% = 46,148.50, filed line 5/6 46,149; filed line 7 credit is 23,075. Source assertions do not authenticate carrier, payroll, dependent or prior records.

Gross benefits 56,200 less full determined credit 23,075 leave deductible benefits 33,125. Receipts 325,000 minus wages 100,000 and benefits give profit 191,875. SE earnings 177,196.5625 round to 177,197; SS cap 176,100 gives tax 21,836, Medicare 5,139, total 26,975 and half-SE 13,488. AGI/QBI 178,387 minus standard deduction 15,750 give before-QBI income 162,637; income limit 32,527 binds component 35,677. Taxable income 130,110 × 24% − 7,153 = 24,073.40, filed regular tax 24,073. AMTI 145,860 less exemption 88,100 gives excess 57,760 × 26% = 15,017.60, TMT 15,018 and AMT zero. Specified-credit limit 24,073 permits all 23,075; Form 3800 Part III 4h/38, Schedule 3 and Form 1040 agree. Tax after credits 998 plus SE 26,975 gives amount owed 27,973; payments zero. All nine Form 3800 pages, continuations, checkbox answers and identities reconcile.

Checker exited 0 at 2026-10-07T09:46:29.822613+00:00. Private `shop-tiers-twentythree-page-review.json`, manifest, terminal log/status and `verified266-aggregate.json` retain proof. Manifest SHA-256 `3a6feab84b038886d28751ab2d2ccecf083a651dd4233a433dfbf9c5ff8cc021`; log SHA-256 `0ca6e342d137c4964f9d6e77aaf6c3d717cea3f0a5d64a99f3a39856ac2a82f7`. Aggregate: 74 disjoint passing batches, 266 packets / 2,680 pages; runtime hashes unchanged. Main scope remains byte-identical with 52 requirements open; 20 future items remain unworked. Full regression PID 53927 remains live, elapsed 07:21:13 at observation; prepared corrections unapplied. Next existing case `single-shop-list-computed-family-floor` has only focus/filer/form inventory inspected; its larger source dump was truncated and is not claimed as read. No render, review or pass is claimed yet. Broad coverage, authenticated records, BR and IRS acceptance remain open.


### List-billing SHOP packet: 25-page observation, not approved

All 25 actual pages, native XML leaves, 60 monthly premium/payment rows, 60 insurer quotes, 12 monthly policies and five employee/dependent records of `single-shop-list-computed-family-floor` were inspected. Uniform employee contribution 575.01 is below half of employer-computed employee-only composite rates 1,200.05/1,225.05. Family payments for employees 3/5 exceed hypothetical employee-only contributions by 20/40; [Treasury regulation 1.45R-4(b)(4)(i)](https://www.irs.gov/irb/2014-30_IRB) permits contributions at or above those amounts. No family-floor defect is recorded. Decimal monthly caps total 27,380.71257, filed 27,381; determined credit is 13,691. Benefits 39,972 less credit leave 26,281; Schedule C profit 223,719; SE tax 27,828/half 13,914; AGI/QBI 209,805; before-QBI income 194,055; deduction 38,811; taxable income 155,244; regular tax 30,106. TMT 21,552 gives AMT zero; specified-credit limit 28,829 allows 13,691; Additional Medicare 59 and SE tax yield amount owed 44,302. Form 8960 correctly shows zero NIIT and completes individual lines 13–17.

Page 13 has a conditional-line discrepancy: no empowerment-zone/renewal-community credit is supplied, yet Form 3800 lines 18/19 each print 16,164 and 20/21 each print 13,942. The [2025 instructions](https://www.irs.gov/instructions/i3800) restrict those lines to the relevant credit; the form directs skipping them in this case. Native XML omits these four fields. Shared `projectForm3800PartIAndIIFields` unconditionally projects calculated lines; no code is changed. The new discovery is recorded only in `future_todo` and remains unworked. The private `shop-list-twentyfive-page-observation.json` retains hashes and all page observations; no approval flags, checker run or aggregate addition are claimed.

The earlier 74 checker passes (266 packets / 2,680 pages) remain historical replay/XSD/hash evidence. This shared projection finding limits prior blanket claims of clean conditional-line PDF parity; those passes do not close the broad board requirements. Main scope remains byte-identical with 52 requirements open. All 21 future items remain unworked. Full regression PID 53927 is live (R, elapsed 07:30:46 at latest observation); seven prepared corrections remain unapplied. No filing-ready or IRS acceptance claim is made.


### Multiple-QHP SHOP source/return audit: partial, no packet pass

The existing `single-shop-multiple-qhp-reference-eligibility` fixture has six annual payroll records, two offered QHPs and 24 monthly policies. Independent programmatic checks reconcile all eligible rosters, quote/entitlement identities, policy/month/date/dependent joins and all 52 payment rows to selected-plan premiums and reference-plan contributions. The declined worker remains in eligible reference rosters; midyear hire/waiting period and termination limit employees 3/4 to seven/nine covered months; employee 1 changes plans in July. Annual hours 11,440 floor to five FTEs; wages 110,000 give average 22,000. Five enrolled employees' hours 9,360 give four covered FTEs for Form 8941 lines 13/14. Employer payments 29,777.08 and independent monthly caps 19,461.39787 file as 29,777/19,461, yielding determined credit 9,731. Benefits 30,777 less credit leave 21,046 and Schedule C profit 218,954. SE earnings 202,204; separately rounded SS/Medicare 21,836/5,864 give SE tax 27,700 and half 13,850. AGI/QBI 205,104; before-QBI income 189,354 caps deduction at 37,871; taxable income 151,483; tax 29,203; AMTI 167,233/TMT 20,575; AMT zero. Additional Medicare 20 gives amount owed 47,192. Native IRS1040/SE/6251/8941/8959/8995 leaves were actually read and reconcile.

Private `shop-multiple-qhp-independent-join-audit.json` retains source hash, per-policy checks and annual/return calculations. Annual employees and selected raw monthly/policy samples were read; the complete monthly source was checked programmatically, not claimed as a complete manual read. Actual PDF pages and remaining native documents are pending, so no checklist approval, checker or aggregate addition is claimed. The shared future-only Form 3800 issue remains unworked. Full regression remains live (PID 53927 S, elapsed 07:34:55); main scope remains frozen.


### Multiple-QHP SHOP packet: all 25 pages observed, not approved

All 25 actual pages and remaining native IRS1040Schedule1/2/3/C, IRS3800 and IRS8960 leaves have now been inspected; the previously calculated amounts and ownership reconcile. Form 8941 prints six payroll employees/five FTEs and five covered employees/four covered FTEs as required by the separate rosters. Page 13 repeats the shared Form 3800 conditional-line discrepancy: lines 18/19 each print 15,431 and 20/21 each print 13,772 with no empowerment/renewal-community credit. Native XML omits those intermediate fields; specified limit 28,152 allows all 9,731. The existing future-only note includes this case; no implementation occurs. Private `shop-multiple-qhp-twentyfive-page-observation.json` retains all page notes and artifact hashes. The complete monthly source was checked programmatically; selected raw samples only were manually read. No complete manual source review, clean packet approval, checker or aggregate addition is claimed. All 21 future items remain unworked; the main 52 requirements stay frozen.


### Seasonal and excluded SHOP workers: 23-page observation, not approved

Independent programmatic checks reconcile 24 policy rosters and 52 monthly quote/payment/period/dependent joins for `single-shop-seasonal-excluded-workers`. Six annual employee primitive records, all 120 dated seasonal service entries (June 1–September 28), owner/child exclusions and selected raw policy/monthly samples were manually read. The [IRS instructions](https://www.irs.gov/instructions/i8941) exclude qualifying seasonal hours/wages from FTE/average-wage computations while retaining premiums. Credit hours 9,880 and wages 95,000 give four FTEs and average 23,000; covered hours 7,800 give three covered FTEs and five enrolled employees. Ordinary payroll 115,000 retains the seasonal 15,000 and related child's 5,000. Owner/child payments 100/200 stay outside credit premiums and ordinary Schedule C benefits. Employer premiums 39,245.37 and independently computed cap 29,228.43795 file as 39,245/29,228; credit 14,614 leaves benefits 24,631 and C profit 210,369. SE earnings 194,276, SS/Medicare 21,836/5,634 give SE tax 27,470/half 13,735. AGI/QBI 196,634, before-QBI income 180,884, deduction 36,177, taxable 144,707, regular tax 27,577; AMTI 160,457/TMT 18,813 and AMT zero. Specified limit 26,933 allows credit 14,614; tax after 12,963 plus SE yields owed 40,433. All native leaves and 23 actual pages were inspected and those amounts/owners reconcile.

Page 13 repeats future-only Form 3800 skipped-line presentation: 18/19 each print 14,110 and 20/21 each print 13,467 without empowerment/renewal-community credit. Native omits those intermediate fields. The existing future item now includes this case; no implementation occurs. Private `shop-seasonal-independent-join-audit.json` and `shop-seasonal-twentythree-page-observation.json` retain calculations/source hash and all page notes/artifact hashes. Complete manual monthly source review is not claimed. No clean approval, checker or aggregate addition is claimed. Historical aggregate remains 74 checker-pass batches/266 packets/2,680 pages; 52 main requirements stay frozen and all 21 future items unworked. Full regression PID 53927 was live (R, elapsed 07:41:20); seven prepared fixes stay unapplied.


### Two-business common-control SHOP: partial independent audit

The existing `same-proprietor-two-business-shop-common-control` supplies one proprietor, two 100%-owned/managed businesses, twelve payroll rows but eleven distinct SSNs, and two separate employer/plan/premium ledgers. Primitive annual employee and control/group records were read; 92 monthly invoice/quote/payer/date joins were checked programmatically. The shared worker's hours are capped once at 2,080 across employers while both wage records remain. First seasonal worker has 120 unique service days and credit hours/wages zero; second has 121 and stays included. Group credit hours 19,240/wages 205,000 give nine FTEs and average 22,000. Nine enrolled employees have 15,080 credited covered hours, yielding seven covered FTEs. Employer payments 65,800.32 and independent caps 48,032.84674 file as 65,800/48,033; determined credit 24,017 allocates by premium share to filed Schedule C reductions 14,324/9,693. Profits 70,079/48,138 total 118,217. SE earnings 109,173 give tax 16,703 and half-SE 8,352; proportional cent allocations 4,951.06/3,400.94 match both supplied workpapers. AGI/QBI 109,865, before-QBI income 94,115 and income cap 18,823 give taxable 75,292. The [2025 Single tax table](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf) row 75,250–75,300 gives tax 11,475. AMTI 91,042/TMT 765 yields AMT zero. Current credit allowed 11,475 leaves unused 12,542; amount owed is SE tax 16,703. This is no accepted carryforward-ledger proof.

Private `shop-two-business-independent-group-audit.json` retains source hash, individual/member results, group arithmetic and half-SE allocation/tax-table proof. Complete qualifying-arrangement/individual period/dependent joins and manual native/PDF/source review remain pending; no packet approval, checker or aggregate addition is claimed. Main requirements stay frozen; all 21 future items remain unworked. Full regression PID 53927 remains live (S, elapsed 07:46:34) and seven prepared corrections remain unapplied.


### Two-business common-control SHOP: all 25 pages observed, not approved

All 25 actual PDF pages and all native return-data leaves were inspected. Both Schedule C identities and benefit reductions, combined SE, QBI allocation, tax-table amount, AMT and current-credit limits reconcile with the retained independent arithmetic. Form 8941 uses one common-control group: eleven distinct employees, nine FTEs, average wages 22,000, employer premiums 65,800, capped premiums 48,033, determined credit 24,017; nine enrolled employees and seven covered FTEs. The allowed current credit is 11,475, with unused 12,542 not established as an accepted carryforward ledger; amount owed is SE tax 16,703.

Page 15 repeats the shared future-only Form 3800 presentation discrepancy: skipped lines 18/19 each print 574 and 20/21 each print 10,901 without empowerment/renewal-community credit. Native XML omits those intermediate fields. The existing future item includes this observation and remains unworked. Private `shop-two-business-twentyfive-page-observation.json` retains all page notes and artifact hashes. Source review remains partial: primitive annual/group/control records and selected raw samples were read; 92 monthly invoice/quote/payer/date joins were checked programmatically, but complete qualifying-arrangement/individual period/dependent joins and complete manual monthly source review remain pending. No clean packet approval, checker run or aggregate addition is claimed. Main scope remains byte-identical with 52 requirements open; all 21 future items stay unworked. Historical aggregate remains 74 checker-pass batches/266 packets/2,680 pages. Full regression PID 53927 is live (S, elapsed 07:52:27); seven prepared test corrections remain unapplied.


### Common-control SHOP source joins: independent programmatic follow-up

The retained standalone `audit-shop-common-control-source.py` independently checks source periods against calendar month boundaries, offering/eligibility/enrollment containment, exact eligible quote rosters (including declined workers), payroll-review identities, dependent selections/plan eligibility, premium and contribution rules, and each employee's annual payment/premium sum. The two-business case passes 48 policy, 12 employee, 12 dependent and 92 monthly-row joins; `shop-two-business-period-dependent-contribution-audit.json` pins source SHA d35554a65e31e1d2b1f2d33403238478b2365b936a0fa754018922bc6b6d6226. These checks close the previously pending programmatic period/dependent/contribution joins, but do not constitute complete manual source review or authenticated external records. Its 25-page observation still has the future-only skipped-line discrepancy and remains unapproved.

The next existing fixture, `same-proprietor-three-business-shop-common-control`, independently passes 72 policy, 18 employee, 18 dependent and 132 monthly-row joins. `same-proprietor-three-business-shop-common-control-period-dependent-contribution-audit.json` pins source SHA 884da2f8fa0d915b80096363932fee23fa302486eb61aaebb99a4317d8855b3c. Primitive manual group/employee review, independent return arithmetic, native leaves and all 27 actual pages remain pending. No clean approval, checker or aggregate addition is claimed for either case. Main requirements remain frozen, all 21 future items unworked, full regression PID 53927 remains live (S, elapsed 07:56:22), and seven prepared test corrections remain unapplied.


### Three-business common-control SHOP: 27-page observation, not approved

Primitive filer/general, all three Schedule C records, group/control/member facts and eighteen annual employee rows were read; selected raw period/dependent/excluded/monthly samples were read. Independent source checks pass all 72 policy, 18 employee, 18 dependent and 132 monthly joins. Seasonal-date counts/uniqueness were checked programmatically: first worker 120 days is excluded from credit hours/wages but premiums retained, second/third workers 121 days stay included. The shared SSN's 1,500+600+600 hours cap once at 2,080; all three wage records remain. Sixteen distinct people have credit hours 28,600/wages 315,000: thirteen FTEs and average wages 24,000. Thirteen enrolled people have 22,360 credited hours/ten covered FTEs. Employer premiums 92,355.27 and independent monthly caps 66,837.25553 file as 92,355/66,837. Tentative 33,419 less FTE reduction 6,684 gives determined credit 26,735. Premium-share reductions 11,361/7,687/7,687 leave benefits 27,884/18,868/18,868 and profits 67,116/46,132/16,132, totaling 129,380. SE earnings 119,482; separately rounded SS/Medicare 14,816/3,465 give tax 18,281/half 9,141. Independent cent shares round all businesses, then the largest absorbs the residual: 4,741.91/3,259.33/1,139.76 match supplied workpapers. Filed QBI 62,374/42,873/14,992 totals 120,239. Before-QBI income 104,489 caps deduction at 20,898, taxable income 83,591. The [2025 IRS Single tax table](https://www.irs.gov/publications/p1040) row 83,550–83,600 gives tax 13,301. AMTI 99,341/TMT 2,923 yields AMT zero; specified-credit limit allows 13,301, leaving unused 13,434 without accepted carryforward-ledger proof. Amount owed is SE tax 18,281.

All native return-data leaves and all 27 actual pages were inspected and those amounts/ownership reconcile. Page 17 repeats the future-only Form 3800 skipped-line presentation: 18/19 each print 2,192 and 20/21 each print 11,109 without empowerment/renewal-community credit; native omits those intermediate fields. The existing future item includes this case and remains unworked. Private `shop-three-business-independent-math-audit.json` and `shop-three-business-twentyseven-page-observation.json` retain arithmetic and source/artifact hashes. Complete manual monthly source/timecard inspection and external authenticity are unproved. No clean approval, checker or aggregate addition is claimed. Main scope stays byte-identical with 52 open requirements; all 21 future items remain unworked. Historical mechanical aggregate remains 74 batches/266 packets/2,680 pages. Full regression PID 53927 is live (S, elapsed 08:01:48); seven prepared corrections remain unapplied.


### Independent spouse SHOP employers: 28-page observation, not approved

Filer/general, both Schedule C records, complete supplied spouse-exception facts, member flags and twelve primitive annual employee records were read; selected raw excluded/period/dependent/monthly samples were read. Independent source checks pass 48 policy, 12 employee, 12 dependent and 104 monthly joins. The supplied independent-spouse exception has 100%/0% direct ownership, no spouse employment/management, no prohibited disposal restriction and passive fractions 10,000/220,000 and 15,000/195,000 below 50%; it supports the [Form 8941 instructions’ two-form exception](https://www.irs.gov/instructions/i8941) within this synthetic fixture, not external authentication. Jane’s 120-day seasonal employee has credit hours/wages excluded, premiums retained: hours 9,880/wages 95,000/FTE4/average23,000, enrolled5/coveredFTE3. Sam’s 121-day worker stays included: hours11,440/wages110,000/FTE5/average22,000, enrolled5/coveredFTE4. Each employer pays 39,245.37, with independently capped premiums 29,228.43795/filed 29,228/credit 14,614. Benefits 24,631 each leave profits 80,369/55,369. Separate SE earnings 74,221/51,133; SS 9,203/6,340 and Medicare 2,152/1,483 give SE taxes 11,355/7,823, total 19,178. Separately rounded half-SE 5,678/3,912 totals 9,590, leaving owner QBI 74,691/51,457 and joint AGI 126,148. Standard 31,500 and before-QBI 94,648 cap deduction at 18,930, taxable 75,718. The [2025 MFJ IRS tax table](https://www.irs.gov/publications/p1040) row 75,700–75,750 gives 8,610. AMTI 107,218 below exemption 137,000 gives TMT/AMT zero. Determined credit 29,228/current allowance 8,610 leaves unused 20,618; amount owed is SE 19,178. Part V allocates current use 8,610/0 and unused 6,004/14,614, without accepted carryforward-ledger proof.

All native leaves and all 28 actual pages were inspected. Individual Schedule C/SE/8941 names, SSNs, EINs and amounts reconcile. Page 17 repeats future-only skipped-line presentation: Form3800 lines 20/21 each print 8,610 without empowerment/renewal-community credit; 18/19 blank; native omits those intermediate fields. Also, page 16 Form3800/page 26 Form8995 joint-name headers show only `SOLEPROPRIETOR JANE`, and page 25 Form6251 shows only `Jane Soleproprietor`, omitting Sam despite their name(s)-on-return labels. These observations extend the existing future-only skip-line and joint-name notes; no implementation occurs. Private `shop-independent-spouse-independent-math-audit.json` and `shop-independent-spouse-twentyeight-page-observation.json` retain calculations/page notes/hashes. Complete manual monthly/timecard review and external source authenticity remain unproved. No clean approval, checker or aggregate addition is claimed. Main scope remains byte-identical with 52 open requirements; all 21 future items remain unworked; historical mechanical aggregate stays 74 batches / 266 packets/2,680pages. Full regression PID 53927 is live (S, elapsed 08:06:58); seven prepared corrections remain unapplied.


### Mixed two-C/one-F SHOP full use: 27-page observation, not approved

The existing `same-proprietor-two-c-one-f-shop-full` fixture's filer/general, two Schedule C records, farm, group/control/member facts, eighteen primitive annual employees and farm 1099-G/NEC/payroll routing were read. Independent programmatic checks pass 72 policy, 18 employee, 18 dependent and 132 monthly joins. Sixteen distinct workers have 28,600 credit hours and wages 315,000, giving thirteen FTEs/average 24,000. The shared worker's 1,500+400+600 hours cap once at 2,080 while all wages remain. The 120-day seasonal worker has credit hours/wages excluded and premiums retained; both 121-day workers remain included. Thirteen enrolled workers have 22,360 credited hours/ten covered FTEs. Premiums 92,355.27 and monthly caps 66,837.25553 file as 92,355/66,837; tentative credit 33,419 less FTE reduction 6,684 gives 26,735. Premium-share reductions 11,361/7,687/7,687 leave benefits 27,884/18,868/19,868. Profits 67,116/46,132/100,132 total 213,380. Farm agricultural receipts 180,000 and other receipts 50,000 join the supplied records; the NEC does not describe custom work, so no new receipt-classification defect is asserted. These are synthetic references, without authenticated issued bytes.

SE earnings 197,056 give SS 21,836/Medicare 5,715, total 27,551 and half 13,776. Independently rounded cent shares 4,333.07/2,978.32/6,464.61 match supplied workpapers, with the largest farm absorbing the residual. Filed owner QBI 62,783/43,154/93,667 totals AGI 199,604. Standard 15,750 leaves before-QBI income 183,854 below the simplified-form threshold; component 39,921 is capped at deduction 36,771, taxable income 147,083. The [2025 IRS Single computation](https://www.irs.gov/publications/p1040) gives regular tax 28,147. AMTI 162,833/exemption 88,100/TMT 19,431 yield AMT zero. Specified-credit limit 27,360 allows the full 26,735; tax after credits 1,412 plus SE yields amount owed 28,963. SE income remains below the 200,000 Additional Medicare threshold; AGI below 200,000 gives no NIIT.

All native return-data leaves and all 27 actual pages were inspected. The amounts and individual identities reconcile, but page 17 repeats the future-only Form 3800 skipped-line discrepancy: lines 18/19 each print 14,573 and 20/21 each print 13,574 without empowerment/renewal-community credit; native omits those intermediate fields. The existing future item includes this case and remains unworked. Private `shop-mixed-three-independent-math-audit.json`, the fixture's period/dependent/contribution audit and `shop-mixed-three-twentyseven-page-observation.json` retain arithmetic, source/artifact hashes and page notes. Complete manual monthly/timecard inspection and external authenticity remain unproved. No clean approval, checker or aggregate addition is claimed. Main scope remains byte-identical with 52 open requirements; all 21 future items remain unworked. Historical mechanical aggregate remains 74 batches/266 packets/2,680 pages. Full regression PID 53927 was live (S, elapsed 08:17:16), with fresh Form 8915-F progress; seven prepared corrections remain unapplied. No PR has been created; work is committed locally on `codex/mef-readiness-20261007`.


### Mixed two-C/one-F SHOP partial use: 27-page observation, not approved

All native leaves and all 27 actual pages of `same-proprietor-two-c-one-f-shop-partial` were inspected. The complete source-tree comparison with full use changes only agricultural receipts to 170,000 (including the matching 1099-G) and three supplied half-SE allocation amounts; filer/general/control/employee/monthly facts are identical. Independent source checks again pass 72 policy, 18 employee, 18 dependent and 132 monthly joins. Group credit remains 26,735, allocated 11,361/7,687/7,687 to benefit reductions, yielding profits 67,116/46,132/90,132 and total 203,380. SE earnings 187,821 give SS/Medicare 21,836/5,447, total 27,283/half 13,642. Independent cent allocation 4,501.90/3,094.37/6,045.73 matches supplied workpapers. Filed QBI 62,614/43,038/84,086 totals AGI 189,738; before-QBI income 173,988 caps deduction at 34,798, taxable 139,190. The [2025 IRS Single computation](https://www.irs.gov/publications/p1040) gives 26,253; AMTI 154,940/TMT 17,378 gives AMT zero. The specified-credit limit subtracts 313, allowing 25,940 and leaving unused 795. After-credit tax 313 plus SE gives owed 27,596. The unused amount is not accepted carryforward-ledger evidence.

Page 17 repeats future-only Form 3800 presentation: skipped lines 18/19 each print 13,034 and 20/21 each print 13,219 without empowerment/renewal-community credit; native omits those fields. The existing future item includes this observation and remains unworked. Private `shop-mixed-three-partial-independent-math-audit.json`, the fixture's source-comparison and period/dependent/contribution audits, and `shop-mixed-three-partial-twentyseven-page-observation.json` retain proof. Complete manual monthly/timecard review and external authenticity remain unproved. No approval flags, checker or aggregate addition are claimed. The private full-use page 23 note was corrected after re-inspection: its single-group Part V table is blank, as in partial use; determined/current-use values are in Part III. This corrects a review note, without changing the packet or runtime.


### Mixed two-C/one-F SHOP zero use: 26-page observation, source review incomplete

All native leaves and all 26 actual pages of `same-proprietor-two-c-one-f-shop-zero` were inspected. Source comparison proves identical filer/general/group/control/employee/monthly facts to full use; changed C receipts are 145,000/140,000, farm agricultural receipts and matching 1099-G 85,000, and supplied half-SE allocations 149.45/433.09/362.46. Independent 72 policy/18 employee/18 dependent/132 monthly joins again pass. Determined credit remains 26,735 and fully reduces expenses despite zero current use, producing profits 2,116/6,132/5,132, total 13,380. SE earnings 12,356 give SS/Medicare 1,532/358, total 1,890/half 945. AGI is 12,435; separately rounded filed QBI rows 1,967/5,699/4,770 sum to 12,436, correctly differing by one from AGI. QBI component 2,487 is capped at zero because standard deduction 15,750 exceeds AGI. Form 6251 prints line 1b −3,315 and AMTI 12,435; TMT/AMT and regular tax are zero. Current credit allowed is zero, unused 26,735 is not an accepted carryforward ledger, and amount owed is SE 1,890. No Schedule 3 is emitted.

Form 3800 net-income-zero lines 12–15 and Section B lines 18–25 are blank; no nonzero skipped-line discrepancy was observed in this packet. Single-group Part V is blank. Private `shop-mixed-three-zero-independent-math-audit.json`, the fixture's source-comparison and period/dependent/contribution audits, and `shop-mixed-three-zero-twentysix-page-observation.json` retain source calculations, page notes and artifact hashes. Complete manual monthly/timecard inspection and external authenticity remain unproved, so no complete source approval, checker or aggregate addition is claimed. Main scope remains byte-identical with 52 open requirements; all 21 future items remain unworked. Historical mechanical aggregate remains 74 batches/266 packets/2,680 pages. Full regression PID 53927 was live (S, elapsed 08:24:36), with Form 8941 arrangement tests progressing; seven prepared corrections remain unapplied.


### Mixed SHOP zero-use bounded PDF checkpoint: checker passed

The zero-use case's 26 actual pages now have the six completed page-review checks for year/form, owner, amounts/native XML, checkboxes, page order/continuations and clipping/legibility. This is a bounded synthetic filled-PDF checkpoint, not complete manual monthly/timecard inspection, issuer authentication or accepted carryforward evidence. Fresh `xmllint --noout --schema` against the pinned full TY2025 v5.4 tree validated the native return. The read-only normal typed checker independently replayed its exact checked-in source calculation, native XML, PDF bytes/page origins, cached templates and full XSD; terminal exit 0 at 2026-10-07T10:54:47.833257+00:00. The final log reports one selected fixture/26 pages complete. All other packets are excluded from this new manifest; the eight discrepancy observations remain unapproved and unworked.

Private `shop-mixed-zero-twentysix-page-review.json`, `shop-mixed-zero-reviewed-batch/review-manifest.json`, runner, terminal log/status and `verified267-aggregate.json` retain evidence. Manifest SHA-256 `bad001f6b90d9579604a6feb77840a4a6a3ab342fb62975ad5d3f3966f6eef08`; terminal log SHA-256 `1e6cbdab420799b24705d7e13594519443f33994a569fe0a95390552839fb5b9`. Aggregate verification rechecks disjoint IDs and all previous manifest/log/runtime hashes: 75 passing batches/267 packets/2,706 pages; all 2,590 held runtime files unchanged. Prior shared Form 3800 findings still qualify any blanket conditional-line parity claim for older batches. No main requirement is closed: the frozen 52 requirements remain byte-identical; all 21 future items remain unworked. Full regression PID 53927 remains live (R, elapsed 08:30:03), with independent-spouse SHOP tests progressing; seven prepared corrections remain unapplied.


### Owned-farm SHOP full use: 23-page observation, not approved

The existing `owned-farm-shop-full-use` fixture's filer/general/farm, 1099-G/NEC, all six farm payroll records, six annual employee records and all employment/eligibility/enrollment/dependent facts were read. Two offered QHPs are supplied; employee 1 switches A to B in July, employee 3 starts employment in April/eligibility in June and employee 4 ends in September. The declined sixth employee remains in eligible quote rosters. Independent programmatic checks pass all 24 policy/6 employee/6 dependent/52 monthly joins, without a claim of complete manual monthly source inspection. Hours 11,440/wages 110,000 give five FTEs/average 22,000. Five enrolled employees' 9,360 hours give four covered FTEs. Employer premiums 39,245.37 and caps 29,228.43795 file as 39,245/29,228; determined credit 14,614 fully reduces benefits 40,245 to 25,631. Farm agricultural receipts 250,000 and other receipts 50,000 give gross 300,000; labor 110,000 and benefits give profit 164,369. SE earnings 151,795/SS 18,823/Medicare 4,402 give SE tax 23,225 and half 11,613. AGI/QBI 152,756/before-QBI 137,006 cap deduction at 27,401, taxable 109,605. Regular tax 19,152, AMTI 125,355/TMT 9,686 and AMT zero; specified-credit limit 19,152 allows 14,614. After-credit tax 4,538 plus SE yields owed 27,763. All native return-data leaves and all 23 actual pages were inspected; individual identities and these amounts reconcile.

Page 13 repeats the future-only Form 3800 skipped-line issue: 18/19 each print 7,265 and 20/21 each print 11,887 without empowerment/renewal-community credit; native omits those intermediate fields. Page 8 Schedule F/native put 50,000 on line 8 with line 7 blank. The supplied NEC payer `Synthetic Farm Custom Hire Customer` and account `SHOP-FARM-CUSTOM` suggest custom hire; the [2025 IRS instructions](https://www.irs.gov/instructions/i1040sf) route custom farming income to line 7. This is a source-character classification question inferred from synthetic labels, not authenticated work-description proof. The “Issued farm receipts” review focus also supplies only synthetic issuer/ownership/payroll/plan references. These observations extend the existing future-only classification, source-wording and skipped-line notes; no implementation occurs. No clean approval, checker or aggregate addition is claimed.

Private `owned-farm-shop-full-use-independent-math-audit.json`, `owned-farm-shop-full-use-period-dependent-contribution-audit.json` and `owned-farm-shop-full-use-twentythree-page-observation.json` retain calculations, source/artifact hashes and all page notes. The initial oversized source dump was truncated; later bounded primitive/period/dependent/native reads establish only the stated manual scope. Main 52 requirements remain frozen; all 21 future items remain unworked. Aggregate remains 75 bounded passes/267 packets/2,706 pages, with prior Form 3800 parity qualified. Full regression PID 53927 was live (R, elapsed 08:34:23), with mixed C/C/F zero-use and rejection tests passing and multiple-plan tests progressing; seven prepared corrections remain unapplied. The limited-use and zero-use farm variants have only review-focus/changed farm amounts/Form 1040 scalar inventory inspected; no page review or pass is claimed for them.


### Owned-farm SHOP limited use: 23-page observation, not approved

All native leaves and all 23 actual pages of `owned-farm-shop-limited-use` were inspected. Exact source-tree comparison to full use proves unchanged filer, general, SHOP, payroll and NEC facts; only the three linked agricultural amounts change from 250,000 to 170,000. Independent programmatic 24 policy/6 employee/6 dependent/52 monthly joins pass. Full manual monthly record inspection and external issuer authenticity remain unproved. Premiums 39,245.37/caps 29,228.43795 yield determined credit 14,614, reducing benefits to 25,631 even though current use is limited. Gross 220,000 less labor 110,000/benefits yields farm profit 84,369. Separately rounded SE earnings 77,915/SS 9,661/Medicare 2,260 produce SE tax 11,921/half 5,961. AGI/QBI 78,408, standard 15,750 and before-QBI 62,658 cap the deduction at 12,532; taxable income is 50,126. The [2025 IRS Single tax-table row 50,100–50,150](https://www.irs.gov/publications/p1040) gives tax 5,942. AMTI 65,876 is below exemption 88,100, giving TMT/AMT zero. Allowed credit 5,942 offsets regular tax, leaving amount owed 11,921; unused credit 8,672 is not accepted carryforward-ledger proof.

Actual page 13 Form 3800 repeats the future-only skipped-line issue: lines 20/21 each print 5,942, with 18/19 blank and no empowerment/renewal-community credit; native XML omits those intermediates. Actual page 8 Schedule F/native put 50,000 on line 8 with line 7 blank, retaining the synthetic Custom Hire Customer/account labels and the same unproved receipt-character question. The issued-record review wording remains synthetic. These observations extend the existing future-only notes without implementing them. No approval flags, checker or aggregate addition are claimed. Private `owned-farm-shop-limited-use-independent-math-audit-v2.json`, period/dependent/contribution audit, source comparison and 23-page observation retain calculations, source/artifact/page-image hashes and notes.

Main scope remains byte-identical: 52 open requirements, 21 future items unworked. The 2,590 held runtime files remain unchanged; aggregate remains 75 bounded passes/267 packets/2,706 pages, with prior Form 3800 parity qualified and ten discrepancy packets unapproved. Full regression PID 53927 was live (R, elapsed 08:45:47), with excluded-spouse SHOP XSD/PDF passing and seasonal/excluded rejection tests progressing. Seven prepared corrections remain unapplied. The zero-use farm variant remains a scalar/source-change inventory, without native/page approval. Work remains on local branch `codex/mef-readiness-20261007`; no PR exists, confirmed by the branch PR query.


### Owned-farm SHOP zero use: 22-page observation, source character unapproved

All native leaves and all 22 actual pages of `owned-farm-shop-zero-use` were inspected. Exact source comparison proves unchanged filer/general/SHOP/payroll/NEC facts relative to full use; only the three linked agricultural amounts change from 250,000 to 90,000. Independent programmatic 24 policy/6 employee/6 dependent/52 monthly joins pass; complete manual monthly record inspection and external issuer authenticity remain unproved. Determined credit 14,614 still reduces benefits to 25,631 despite zero current use. Gross 140,000 less labor 110,000/benefits gives farm profit 4,369. SE earnings 4,035 and separately rounded SS 500/Medicare 117 give SE tax 617/half 309. AGI/QBI 4,060, standard 15,750 and before-QBI zero cap the 812 component at zero. Taxable income and regular tax are zero. Form 6251 prints line 1b −11,690, AMTI 4,060 and TMT/AMT zero. Allowed credit is zero, unused 14,614 is not accepted carryforward-ledger proof, and amount owed is 617. No Schedule 3 is emitted.

Actual Form 3800 page 11 leaves the zero-net-income lines 12–15 blank, and page 12 leaves Section B lines 18–25 blank; no nonzero skipped-line discrepancy was observed. Actual Schedule F page 7/native place 50,000 on line 8 with line 7 blank, retaining the synthetic Custom Hire Customer/account receipt-character question. The issued-record wording also remains synthetic. These extend existing future-only source-classification/wording notes without implementation. No clean source approval, review flags, checker or aggregate addition is claimed. Private `owned-farm-shop-zero-use-independent-math-audit-v2.json`, source comparison, period/dependent/contribution audit and 22-page observation retain calculations, artifact/page-image hashes and notes.

Main 52 requirements remain byte-identical and all 21 future items unworked; all 2,590 held runtime files unchanged. Aggregate remains 75 bounded passes/267 packets/2,706 pages; the ten prior nonzero skipped-line discrepancy packets remain unapproved. Full regression PID 53927 remained live (S, elapsed 08:48:54); monthly APTC rounding tests were progressing. Seven prepared corrections remain unapplied.


### Owned-farm SHOP and WOTC: 24-page observation, not approved

All native leaves and all 24 actual pages of `owned-farm-shop-shop-wotc` were inspected. Bounded reads covered six WOTC employees, six QBI W-2/SSA/certification records and the extra QBI workpaper; the initial oversized 39,553-token pending dump was truncated and is not claimed as a complete read. Exact comparison proves filer/general/SHOP/G/NEC and farm facts identical to full use, except the three added QBI-review/wage/basis fields. Programmatic 24 policy/6 employee/6 dependent/52 monthly joins pass. Employee/payroll/SSN/EIN/certification references and wages join, but source dates do not fully reconcile: EMP-3 SHOP employment begins in April while WOTC service begins January 15; EMP-4 SHOP ends September while WOTC service ends December. Month-bound January 1 versus January 15 comparisons for other employees alone are not proof of incompatible employment. No external issuer, SSA or SWA authenticity is established.

Conditional arithmetic using the supplied synthetic eligibility assertions agrees with native/PDF amounts. Six targeted-group-1 workers above 400 hours cap at 6,000 each: 36,000 at 40% gives WOTC 14,400. The [IRS Form 5884 instructions](https://www.irs.gov/instructions/i5884) require the full wage-deduction reduction despite current-credit limits. SHOP determined credit 14,614 reduces benefits to 25,631; WOTC reduces labor 110,000 to 95,600. Gross 300,000 less expenses 121,231 gives farm profit 178,769. SE earnings 165,093/SS 20,472/Medicare 4,788 give SE 25,260/half 12,630. AGI/QBI 166,139, standard 15,750 and before-QBI 150,389 cap the 33,228 component at deduction 30,078; taxable 120,311 gives regular tax 21,722. AMTI 136,061/TMT 12,470 produce AMT zero. Specified-credit limit 21,722 allows WOTC 14,400 and SHOP 7,322; unused SHOP 7,292 is not accepted carryforward-ledger proof. After-credit tax zero leaves amount owed 25,260.

Actual page 13 Form 3800 repeats skipped 18/19 each 9,353 and 20/21 each 12,369, with no empowerment/renewal credit. Actual page 8 Schedule F/native retain 50,000 on line 8 and line 7 blank with the same synthetic custom-hire payer/account question. Actual page 24 Form 8941 prints lines 13/14 counts 5/4 despite positive line 12 directing a skip; native also includes those counts. The issued-record wording remains synthetic. The source-date and Form 8941 presentation findings are new future-only items; the source-classification/wording/Form 3800 notes are extended there. Nothing in that section is implemented. Private independent-source-math audit, period/dependent/contribution audit and 24-page observation retain qualified arithmetic, comparisons and artifact/page-image hashes. Their writes initially failed with ENOSPC; they were saved after filesystem capacity returned. No clean approval flags, checker or aggregate addition are claimed.

### Full corrected regression terminal: failures classified, test repairs applied

The normal typed full command completed at 2026-10-07T11:23:42.342553+00:00 with exit 1: 12,213 passed/42 failed (537m48s). All final error blocks were read: 34 ENOSPC temp-file/directory failures, seven stale guard-message assertion failures (six Form 8962 cases plus one Form 4972), and one aggregation XSD test bypassing the required bundled disclosure PDF. The former spouse-header failure is now proved to be ENOSPC, consistent with its previously passing focused run. Log SHA-256 `5a75acb27d0fe99b4f09e428e0a9859832353899f3c85ebd5d299d2ed4538656` and terminal status preserve this failed run; it is not superseded by a green result.

The additional Form 4972 case reproduced in a normal typed focused test: 0 passed/1 failed/110 filtered, with the expected older multi-distribution message differing from the current participant-inventory guard. Eight test corrections are now applied across seven test files: preserve the rejection assertions while matching current specific guard text, and call the existing bundle builder for the aggregation fixture. Production guard/calculation code is unchanged. A distinct runner retains post-edit hashes and is checking all 43 Form 8962 cases, all 111 1099-R input cases, the aggregation XSD case, and the 34 precisely selected storage-failed cases. No focused success or full-rerun pass is claimed before terminal evidence.

Main 52 requirements remain frozen; all 23 future items remain unworked. Aggregate remains 75 bounded passes/267 packets/2,706 pages, with prior Form 3800 parity qualified and eleven nonzero skipped-line discrepancy packets unapproved. Capacity returned to about 830 MiB before writes resumed; retained evidence was preserved. Coverage, source authenticity, business rules and IRS acceptance remain open.

### Repaired focused checks: 155 passing cases; storage recheck running

The distinct normal typed runner has terminal exit-zero results for all 43 Form 8962 cases, all 111 1099-R input cases and the single aggregation XSD case (372 filtered). Their status records retain commands, times, log hashes and zero runtime-file changes. The aggregation bundle test now includes its required disclosure attachment. These 155 successes verify the eight test corrections without changing production guard or calculation code; they do not establish a full regression pass. The 34 precisely selected ENOSPC cases began rerunning at 2026-10-07T11:37:45.591905+00:00. Wrapper session 90632/PID 19151 was confirmed live and selected tests were progressing; no duplicate run was started.

### Carrier daily-billed SHOP full use: 23-page observation, not approved

All native return-data leaves and all 23 actual pages of `carrier-daily-billed-shop-full-use` were inspected. Bounded source reads cover filer/general/business, employee/period/dependent facts and plan rules; the oversized initial arrangement dump was followed by a bounded complete rule read. An independent arithmetic script checks 55 monthly invoice rows and 60 daily-billed segments, joins employee/SSN/EIN/payroll/policy/quote references, enforces contiguous full-month segments and reconciles summed bills and payments. Full source eligibility/dependent/roster validation and complete manual monthly-record inspection remain unproved. Marriage March 20, birth June 25 and divorce September 18 produce five split monthly bills. Contributions prorate the independently rounded full-month contribution; applying a percentage to an already rounded segment bill can differ by a cent and is not the supplied billing rule.

Employer premiums 58,743.68 and capped premiums 42,748.557693 file as 58,744/42,749. Hours 11,440/wages 110,000 yield five FTEs/average 22,000; credit 21,375 reduces benefits 59,744 to 38,369. Schedule C gross 350,000 less wages 110,000/benefits gives profit 201,631. SE earnings 186,206 capped SS base 176,100 gives SS 21,836/Medicare 5,400, tax 27,236/half 13,618. AGI/QBI 188,013, standard 15,750 and before-QBI 172,263 cap the 37,603 component at deduction 34,453; taxable 137,810 gives regular tax 25,921. AMTI 153,560/TMT 17,020 give AMT zero. Specified-credit limit 25,691 allows the full 21,375; after-credit tax 4,546 plus SE gives owed 31,782. Native/PDF amounts and owner identity agree with this conditional arithmetic.

Actual page 13 Form 3800 repeats skipped lines 18/19 each 12,765 and 20/21 each 13,156 without empowerment/renewal credit; native omits those intermediates. The existing future-only entry now retains this twelfth discrepancy packet; no implementation occurs. Actual page 23 Form 8941 correctly leaves skipped 13/14 blank despite native counts 5/4; this packet does not repeat the WOTC printed-count discrepancy. Synthetic invoice/payment/source references do not establish issuer authenticity. Private `carrier-daily-billed-shop-full-use-daily-billing-independent-math-audit.json` and `carrier-daily-billed-shop-full-use-twentythree-page-observation.json` retain calculations and JSON/XML/PDF/all-page-image hashes. No approval flags, checker or aggregate addition are claimed. Main 52 requirements remain frozen; all 23 future items remain unworked.

The carrier partial-use variant has an exact source comparison and independently checked arithmetic, without native/page review yet. Filer and all inputs are identical except gross receipts 350,000 to 210,000. The same 55 monthly/60 bill-segment arithmetic checks pass. Determined credit remains 21,375/benefits38,369; profit61,631 gives SE earnings56,916/SS7,058/Medicare1,651/tax8,709/half4,355. AGI57,276/before-QBI41,526 cap deduction8,305, taxable33,221. The [2025 Publication1040 Single table row33,200–33,250](https://www.irs.gov/publications/p1040) was independently read and gives tax3,749. AMTI48,971/TMTzero/allowed3,749 leave amount owed8,709. Unused17,626 is not accepted carryforward-ledger proof. Private daily-billing independent-math audit and source-comparison records retain hashes and qualified evidence. No completed partial-use packet review or discrepancy observation is claimed.

A separate independent source-join program subsequently passes both carrier variants' supplied 24 policies/134 eligible quotes/six employees/nine dependents/five dated events/55 monthly rows/60 bill segments. It checks the declined employee's offered quotes, employment/plan-selection month boundaries, review/source identity and payroll equality, daily marriage/birth/divorce state, changed dependents' effective eligibility dates, segment boundaries and active dependent/tier lists. Six static dependents' twelve plan eligibility records assert confirmed references without individual dates, so their dated eligibility remains unproved; this limitation extends the existing future-only source-date note. No incorrect coverage claim is inferred solely from absent dates. Private `*-daily-period-dependent-roster-audit.json` records retain this qualified scope. Complete manual monthly source inspection and external authenticity remain unproved; the prior observation/math records preserve the narrower evidence available when written. No clean approval or aggregate addition follows these programmatic checks.

### Carrier daily-billed SHOP partial use: 23-page observation, not approved

All native return-data leaves and all 23 actual pages of `carrier-daily-billed-shop-partial-use` were subsequently inspected. Owner identity, Schedule C gross210,000/benefits38,369/wages110,000/expenses148,369/profit61,631, SE8,709/half4,355, AGI57,276/QBI8,305/taxable33,221/tax3,749/allowed3,749/owed8,709 agree with the independently recorded arithmetic. Form6251 AMTI48,971/exemption88,100/TMTzero/AMTzero agrees. Form8941 determined21,375 still reduces benefits in full; native/actual Form3800 row4h columns e/g=21,375 and i=3,749 reflect limited current use.

Actual page13 Form3800 prints skipped20/21 each3,749 with18/19 blank and no empowerment/renewal credit; native omits those intermediates. Actual page23 Form8941 prints skipped13/14 counts5/4 despite positive12=21,375; native has counts too. This differs from the carrier full-use printed page, whose13/14 were blank. Both findings extend existing future-only entries without implementation. Private `carrier-daily-billed-shop-partial-use-twentythree-page-observation.json` retains all source/artifact/page-image hashes and page notes. No clean approval flags/checker/aggregate addition are claimed; full monthly manual inspection/static dependent dated eligibility/authenticity remain unproved. Main52 requirements stay frozen; all23 future items unworked; aggregate stays75 bounded passes/267 packets/2,706 pages, with13 discrepancy packets unapproved.

### Regression repair verification complete: 189 passed, zero failed

The normal typed storage recheck terminated with exit0:34 passed/0 failed/36 filtered (10m50s). All four focused stages are terminal successes:43 Form8962/111 1099-R inputs/one aggregation XSD/34 storage cases. Every stage's retained log hash was independently verified, as were the exact189 counts and zero changed runtime files against the 2,590-file post-edit manifest. Private `regression-repairs-focused-complete.json` retains all commands/times/hashes; the prior full42-failure run remains preserved. These focused successes do not close the full-batch requirement. A distinct exact full normal typed rerun is next, on committed corrections, with its own manifest/log/status. No production guard/calculation code or future item was implemented. Capacity was804MiB before the rerun; evidence was preserved.

The exact full rerun subsequently started at2026-10-07T11:54:45.243904+00:00 on commit `23cbeee5dbbc4b5de5495f2f55996a49cf58e683`: `PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`. Session6302/denoPID20128 was confirmed live (S, elapsed00:32), with normal type checks progressing. Deno2.9.4/V8 15.0.245.2-rusty/TypeScript6.0.3, Poppler26.09.0 and libxml2.9.13 were recorded. Its distinct `runtime-full-after-repairs-at-launch.json` manifest SHA-256 is `6fddb6dba76e7d13d32d2b941f3ff5af7eda9933c3a7b0d848c26290039e0a63`; focused evidence SHA-256 is `128059446c656d5adc760272c0bae8f405c9f028a88da2b4ad42cce27e4946f9`. `full-test-after-repairs.log/.status` retain ongoing output and process state; no terminal full pass is claimed. The eight test corrections are committed in `1a58ebe06`; subsequent commits only retain board/evidence notes. No main requirement is closed from a running batch; source, coverage, BR and IRS acceptance remain open.

### Two-business QBI aggregation: source arithmetic and all18 pages observed

The existing `single-form8995a-two-business-aggregation` source inputs and filer were read in full, along with selected pending calculation inputs and all native return-data leaves. An initial one-line XML search was truncated; the subsequent bounded native dump was fully read. All18 actual pages were inspected, including the annual aggregation disclosure at page18. Source/member ScheduleC facts match exactly: North Store/EIN123456789 gross120,000 less wages20,000 gives profit100,000; South Store/EIN987654321 gross90,000 less wages10,000 gives80,000. Both belong to Alex/TIN111223333; South's new-business mark and acquiredJanuary1 event agree. Calendar-year/common100percent ownership, two operational factors, new2025 election and noRPE are supplied assertions, not authenticated ownership/election proof.

Independent arithmetic gives SE earnings166,230; W2SS wages176,100 exhaust the SS cap, leaving Medicare/SE4,821 and half2,411. Profit-share allocations1,339/1,072 yield memberQBI98,661/78,928 and aggregate177,589. Wages30,000/UBIA200,000 yield a15,000 wage/property limit versus35,518 component and92,368 income limit, agreeing with the [2025 Form8995A rules](https://www.irs.gov/instructions/i8995a). AGI477,589/beforeQBI461,839/deduction15,000 give taxable446,839; the [2025 Single tax worksheet](https://www.irs.gov/publications/p1040) computes35percent less30,452.75, rounded125,941. Wage AdditionalMedicare900 plus SE1,496 gives2,396; other taxes7,217/total133,158 less withholding90,000 gives owed43,158. Independent AMTI462,589/TMT100,075 yields AMTzero; materially participating businesses and no investment income give NIITzero. All native/printed totals and owner identities reconcile with these conditional facts.

Actual page15 aggregation checkbox/amounts and page16 skipped phase-in PartIII agree with above-range income. Actual ScheduleB page17 prints the group description, South acquisition event and two EIN/QBI/wage/UBIA rows/totals legibly. Actual page18 disclosure prints the owner, new election, calendar year, annual review, two factors, both ownership periods, event, allocated halfSE and aggregate totals; native ScheduleB references BinaryAttachment11 with the annual-disclosure PDF name. A separate normal typed replay session32072 is checking the source executor, exact XML and retained generated attachment bytes; it is still running and no replay pass is claimed yet.

The supplied single W2 box6=4,350 is only regular Medicare withholding on300,000 wages. The [employer rule](https://www.irs.gov/instructions/i8959) calls for additional900; actual page13 Form8959 correctly uses supplied4,350 and additionalwithholdingzero. This extends the existing future-only synthetic-withholding entry without changing the fixture or inventing withholding. Payroll, qualified-property basis, ownership/election and issuer authenticity remain unproved. Private independent-source-math audit and18-page observation retain source/artifact/all-page-image hashes and qualified notes. No filing/source approval, checker or aggregate addition is claimed. Main52 requirements remain frozen; all23 future items unworked; aggregate remains75 bounded passes/267 packets/2,706 pages. Full regression PID20128 and child20129 were confirmed live at elapsed08:25, progressing through CLI export rejection cases; no restart or full pass is claimed.

The distinct normal typed disclosure replay subsequently passed with exit0 at2026-10-07T12:09:06.630Z: executor diagnostics empty, exact XML match, one2,079-byte annual-disclosure attachment SHA-256 `b4dd7f91db54f7e4b9141982f82054b5d77890202fba7058cd8d12c769b01e70`. Its standalone actual page was inspected and agrees with packet page18: owner, election, calendar year, annual review, both ownership periods, South acquisition, operational factors, QBI/wages/UBIA and allocated halfSE are legible. The initial private helper failed type checking before execution because its digest input had an incompatible buffer type; copying into a concrete byte array corrected the helper. Production code was unchanged. Retained replay JSON, separate PDF and rendered page prove generated content and byte identity, without authenticating source assertions, an accepted election or IRS acceptance.

### Mortgage points and MFS limit: nine return pages and four retained copies observed

The existing purchase-points, MFS two-loan limit and construction-refinance fixtures were reviewed against bounded complete source metadata, selected pending calculations and all native return-data leaves. All nine actual return pages and four reconstructed Copy B pages were inspected individually. The earlier oversized source dump serialized numeric PDF bytes and was truncated; it is not counted as a complete read. Exact embedded-byte reconstruction, contiguous byte indexes and declared/source-manifest hashes were checked separately. Copy B lender labels, masked borrower TIN ending3333, interest, points and MFS origination dates agree with structured inputs. Borrower name/address, lender TIN, property and principal fields are blank; these synthetic copies do not establish issuer authenticity or prove loan/closing/payment workpapers.

Conditional arithmetic agrees with pending/native/printed Form1040 amounts. Purchase interest18,000 plus supplied deductible points2,400 gives deduction20,400/taxable59,600. MFS monthly balances500,000/400,000 average900,000; the [Publication936 Table1](https://www.irs.gov/publications/p936)375,000 limit divided by900,000 rounds to0.417, giving36,000interest×0.417=15,012 (8,340/6,672), taxable64,988. Construction refinance points2,000 over180months×sixpayments gives67, hence deduction18,067/taxable61,933. All24 MFS balance-month references and six construction payment-month references join, conditionally. Purchase full-deduction eligibility and construction loan terms/payment/closing authenticity remain unproved; references and asserted verification booleans do not replace those records.

Independently read [2025 Publication1040](https://www.irs.gov/publications/p1040) table rows59,600–59,650Single,64,950–65,000MFS and61,900–61,950Single give tax8,032/9,209/8,538. Withheld12,000 gives refunds3,968/2,791/3,462. Actual identity, filing-status, spouse details, digital-assets No and amounts are readable. All three ScheduleA PDFs put the deduction on8a/8e/10/17, leaving8b/8c blank; native emits8a but omits those subtotals/total, the known future-only limitation.

The MFS actual Form1040 page2 leaves line12b spouse-itemizes blank although source/pending set `mfs_spouse_itemizing:true` and native emits `MustItemizeInd` X. The [2025 instructions](https://www.irs.gov/instructions/i1040gi) require that checkbox. This new discovery is recorded only in `future_todo` and remains unimplemented. Private `mortgage-points-three-packet-independent-observation.json` retains conditional arithmetic, native values, qualifications and26 artifact/page-image hashes; its helper initially used incorrect source field names, then passed after correcting those private names. No clean approval flags, checker or aggregate addition are claimed. Main52 requirements remain frozen; all24 future items are unworked; aggregate stays75 bounded passes/267 packets/2,706 pages. The full regression was confirmed live at elapsed18:56, progressing through calculated-return replay cases; no full pass or restart is claimed.


### Mixed business and personal Form1099-K: all14 pages observed, not approved

`single-k-mixed-business-personal` was absent from the267 retained passing-batch fixture IDs and had not been individually named in this execution record. Its full source metadata/filer, selected pending calculations and every native return-data leaf were read. All14 actual pages were rendered and inspected individually:1040two, Schedule1two, Schedule2two, ScheduleCtwo, ScheduleDtwo, SEtwo, Form8949PartIIone and Form8995one. Original source/XML/PDF hashes match the preparation manifest, and the private fourteen-page independent observation retains17 artifact/image hashes.

The supplied2,800 Form1099-K gross reconciles to2,000 existing ScheduleC receipts plus800 personal camera proceeds. Business-reference/PSE/recipient and allocation references join; no second count of the business receipts occurs. Camera basis300 and January15,2024–June15,2025 holding period give one500 long-term gain, correctly on Form8949PartII boxF and ScheduleD10/15/16/Form1040line7a. The [IRS Form1099-K guidance](https://www.irs.gov/businesses/what-to-do-with-form-1099-k) supports separate business and personal-gain destinations. Synthetic settlement, acquisition and sale references do not authenticate issued records or actual basis.

Independent arithmetic:2,000profit×92.35percent=1,847earnings; separately rounded SS229/Medicare54 give SE283/half142. Total income2,500 less142 gives AGI2,358. QBI1,858/component372 is limited tozero by taxable income beforeQBIzero (standard15,750), consistent with [Form8995 instructions](https://www.irs.gov/instructions/i8995). No regular tax, credit or payment leaves amount owed283. Printed source-to-ScheduleC/SE/1/2/1040 and QBI amounts agree with that conditional computation. EIC is zero because pending `filer_has_valid_ssns` isfalse; the calculation explicitly returnszero without affirmative eligibility. This source supplies no valid-SSN eligibility review. It does not prove actual EIC ineligibility, and no credit is inferred or added.

Actual ScheduleD pages9/10 print line10 proceeds800/basis300/gain500, totals15/16=500, QOFNo/17Yes/20Yes. Native ScheduleD contains only the line10 transaction group and omits the printed totals/answers. This extends the existing future-only nativeScheduleD note; nothing there is implemented. All other observed identity/status/checkbox/amount/page-order facts are legible and consistent with the supplied scope, including blank unused ScheduleC/SE sections. No clean approval flags, checker or aggregate addition are claimed. Main52 requirements remain frozen; all24 future items unworked; aggregate stays75 bounded passes/267 packets/2,706 pages. The prior incorrect MFS spouse-itemizes-mark sentence in this record was also corrected to reference the later actual blank-checkbox observation.


### Mixed1099-K NEC duplicate and reported-error packets:28-page coverage

The two existing `single-k-mixed-duplicate-personal` and `single-k-mixed-error-duplicate-personal` sources/filer metadata, selected pending data and every native return-data leaf were read. Exact source/XML/PDF hashes match the prepared manifest. All28 rendered pages are covered: nine duplicate-case pages were individually viewed; its pages8/9/10/12/13 exactly match the previously inspected business/personal packet images. The error variant differs from the duplicate packet only at rendered page3, which was individually viewed; its other13 images exactly match the duplicate-case pages. Private `mixed-k-duplicate-error-two-packet-observation.json` retains all34 artifact/image hashes, reference-image hashes and precise page-review provenance. This is10 direct changed-page inspections and18 proved identical-image joins, not a claim of28 new manual inspections.

The duplicate case's3,800grossK allocates2,000 unique business receipts,1,000 linked NEC duplicate and800 personal-sale proceeds. PayerTIN/recipient/business-reference and reviewed duplicate amount join the NEC; ScheduleC profit3,000 includes NEC once. The error variant's4,000 adds200 supplied friend expense reimbursement with no goods/services and a correction-request reference. Actual/native Schedule1 top entry shows200, while line10 stays3,000. The [IRS guidance](https://www.irs.gov/businesses/what-to-do-with-form-1099-k) supports personal-gain reporting and excluding improperly reported personal reimbursements; synthetic transaction/correction references do not prove actual payment character or an issued correction.

Both retain one camera sale800 lessbasis300=500 long-term gain on Form8949/ScheduleD/1040. Independently rounded3,000profit×92.35percent gives2,771earnings, SS344/Medicare80/SE424/half212. Total income3,500 less212 givesAGI3,288. QBI2,788/component558 is income-limited tozero by standard15,750 and taxableincomezero; regular taxzero/no payments give amount owed424. Pending/native/actual amounts agree conditionally. EIC stayszero because neither source provides affirmative valid-SSN eligibility review; actual ineligibility is unproved. All viewed identity/status/checkbox and amount placements are legible; reused pages have exact image hashes.

Native ScheduleD again contains only its line10 transaction group, omitting printed15/16 totals and QOF/17/20 answers. The existing future-only note now includes both cases, without implementation. No checker approval, aggregate addition, authentic issuer/basis/settlement proof, BR result or IRS acceptance is claimed. Main52 requirements remain frozen; all24 future items unworked; aggregate remains75 bounded passes/267 packets/2,706 pages.


### Orphan-drug credit:15-page observation, not approved

All source/filer metadata, selected pending computations and every native return-data leaf of `single-orphan-drug-clinical-testing-credit` were read. All15 actual pages were individually inspected:1040two, Schedule3one, Form3800nine, Form6251one and Form8820two. Form8820's2018 revision is the current [IRS form with instructions](https://www.irs.gov/pub/irs-pdf/f8820.pdf); its reduced-electionYes mark,10,000 expenses,1,975 amounts and drug/application/date row are legible and agree with the supplied source. FDA designation/testing/funding/expense assertions are synthetic, without authenticated FDA or expenditure records or an accepted timely election.

Independent conditional arithmetic:10,000×19.75percent gives credit1,975. W2wages/AGI150,000 lessstandard15,750 gives taxable134,250; the [2025 Single worksheet](https://www.irs.gov/publications/p1040)24percent less7,153 gives regular tax25,067. AMTI150,000 less88,100exemption gives61,900×26percent=TMT16,094/AMTzero. Quarter of net regular tax above25,000 rounds17; standard-credit limit25,067−max(17,16,094)=8,973 permits full1,975. Total tax23,092 lesswithholding30,000 gives refund6,908. Pending/native/actual Form3800row1h columns e/g/i, Schedule3 and Form1040 reconcile. Native drug/application/date and owner joins agree; unused carryover/transfer/PartsIV–VI pages are blank.

Actual packetpage5 Form3800 repeats skipped18/19 each12,071/20=12,996/21=11,021 without empowerment/renewal credit. The [2025 instructions](https://www.irs.gov/instructions/i3800) restrict that section to those credits; native omits the skipped intermediates. This is a fourteenth observed Form3800 discrepancy packet (13SHOP plus this source), recorded by extending the existing future-only item without implementation. Private fifteen-page independent observation retains conditional arithmetic and18 source/artifact/image hashes. No approval flags, checker or aggregate addition, authenticated-source/BR/ATS proof are claimed. Main52 requirements remain frozen; all24 future items unworked; aggregate stays75 bounded passes/267 packets/2,706 pages.


### Geothermal credit: 16-page observation, not approved

Read source/filer metadata, selected pending Form 8835/3800/6251 computations and all native leaves and attributes for `single-geothermal-general-business-credit`. Nine changed pages were individually viewed (2–7 and 14–16); seven pages (1, 8–13) have exact rendered-image SHA-256 matches to the previously inspected orphan-drug packet. This is complete 16-page coverage by nine actual views plus seven verified identical images, not sixteen manual views. Private `single-geothermal-general-business-credit-sixteen-page-independent-observation.json` retains 19 source/artifact/image hashes and reuse provenance. Original prepared-manifest source/XML/PDF hashes agree.

The [2025 IRS Form 8835 instructions](https://www.irs.gov/instructions/i8835) give 0.6 cents per kWh for post-2021 geothermal facilities. Supplied construction June 1, 2023, service January 1, 2024, net output 1.5 MW and no PWA qualification support the conditional base-rate/no-increase branch. Supplied 100,000 produced-and-sold kWh × 0.006 gives 600; no bonus applies. Actual facility description/address/coordinates/dates, line 8d/9b/10b and 11b/12c marks agree. The 1,500-kW capacity is present in native XML as the attribute `aCNameplateCapOthEgyPropKWQty`, not a text leaf. No actual ownership, construction, meter, unrelated-sale or financing records authenticate these assertions. Calendar-year zero phaseout on line 3 is printed blank; strict zero presentation remains unapproved.

Wages/AGI 150,000 less standard 15,750 leaves taxable 134,250 and ordinary tax 25,067. AMTI 150,000 less exemption 88,100 gives TMT 16,094/AMT zero. Rounded quarter excess 17 leaves specified-credit limit 25,050, permitting full 600. Form 3800 Part III row 4e columns e/g/i, referenced native Form 8835, Schedule 3 and Form 1040 agree: tax 24,467, withholding 30,000 and refund 5,533. Part V is blank for this single source; the fixture review-focus wording alone does not establish a requirement for a detail row. All nine Form 3800 pages are retained, unused Parts IV/VI blank and Form 6251 agrees.

Actual packet page 5 repeats the shared Form 3800 skipped-line discrepancy: 18/19 each 12,071, 20/21 each 12,996 despite no empowerment/renewal credit. Native omits those intermediates. This fifteenth observed packet (13 SHOP, orphan-drug, geothermal) extends the existing future-only note without implementation. No clean approval flags, checker, aggregate addition, authenticated-source/BR/ATS proof or whole requirement checkoff is claimed. All 2,590 runtime hashes remain unchanged while the full regression runs. Main 52 requirements remain frozen; 24 future items stay unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages.


### Trust clean-electricity investment credit: 16-page observation, not approved

Read all source/filer facts, selected Form 3468/3800/6251 pending computations, every native leaf and attribute. Nine actual changed pages (2–10) were individually inspected; seven pages (1 and 11–16) exactly match rendered-image hashes of previously inspected orphan-drug pages 1 and 8–13. Private `single-trust-clean-electricity-investment-credit-sixteen-page-independent-observation.json` retains all 19 artifact/image hashes, original prepared-manifest digest checks and reuse provenance. The three Form 3468 pages retain canonical original page numbers 1, 3 and 4; blank unrelated sections on selected pages are visible.

Source trust K-1 code M and separate review entries duplicate one Solar Trust EIN 123456789 statement for beneficiary 111223333. Property at 100 Solar Road, Austin TX 78701 has supplied construction June 1, 2024, service March 1, 2025, 500-kW net output, zero emissions and beneficiary basis 10,000. The [2025 Form 3468 instructions](https://www.irs.gov/instructions/i3468) permit the increased-rate exception below 1 MW; supplied facts conditionally yield 30% × 10,000 = 3,000. Actual/native owner, EIN, address, dates, small-output mark, no bonuses and Part V amounts agree. The issuer digest is 64 repeated a characters and no issuer bytes authenticate the source or basis.

Actual page 4 leaves Part I line 3d coordinates blank, with no source/native coordinates. It marks line 7a Yes; the instructions require a signed Increased Credit Amount Statement for this claim. None is retained in the 16-page PDF, and native binaryAttachmentCnt is zero. A new future-only item records coordinates/statement/source-authentication work without implementation. This is not a filing-ready positive route.

Independent conditional return arithmetic: wages/AGI 150,000 less standard 15,750 leaves taxable 134,250 and tax 25,067. AMTI 150,000 less exemption 88,100 gives TMT 16,094 and AMT zero; rounded quarter excess 17 leaves standard-credit limit 8,973, allowing all 3,000. Form 3800 row 1v carries trust EIN, e/g/i each 3,000 and reference IRS34682. Schedule 3 references IRS38003. Actual/native tax 22,067, withholding 30,000 and refund 7,933 agree. Unused credit Parts IV–VI are blank; Form 6251 agrees. Actual page 8 fills skipped Form 3800 18/19 each 12,071, 20=12,996 and 21=9,996 without empowerment/renewal credit; native omits those fields. This sixteenth observed discrepancy packet extends the existing future-only note.

No clean approval flags, checker or aggregate addition, authenticated-source/BR/ATS result or whole checkoff is claimed. Runtime 2,590 hashes remain unchanged during the full regression. Main 52 requirements remain frozen; all 25 future items unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages.


### Two at-risk business losses: 16-page observation, not approved

All 16 actual pages of `single-two-at-risk-business-losses` were individually inspected against fully read source/filer facts, selected pending computations and every native leaf/attribute: Form 1040 two, Schedules 1/2 four, three Schedule C copies six, Schedule SE two and two Form 6198 copies two. Private `single-two-at-risk-business-losses-sixteen-page-independent-observation.json` retains all 19 artifact/image hashes; prepared-manifest source/XML/PDF digests agree. All owner/status/business names, cash/material-participation/no-1099-payment marks and distinct North/South descriptions are legible.

North receipts 1,000 less advertising 3,000 yields raw loss 2,000, limited to supplied opening basis 500 with no increase/decrease. South receipts 1,000 less 4,000 yields raw loss 3,000, limited to supplied basis 900. Form 6198 lines 1/5, 6/8/10a/10b/20 and deductible negative line 21 agree with those supplied facts. [Form 6198 instructions](https://www.irs.gov/instructions/i6198) limit deductible loss to at-risk amount and carry the disallowed remainder forward: conditional 1,500/2,100. Actual basis, financing, prior-loss/aggregation eligibility and a durable next-year ledger are not authenticated by these synthetic entries.

Offsetting business profit 3,000 less allowed losses 500/900 gives Schedule 1/SE business income 1,600. Rounded SE earnings 1,478 give separately rounded Social Security 183 plus Medicare 43, total 226/half 113. Wages 5,000 plus business 1,600 less 113 gives AGI 6,487; standard 15,750 makes taxable income zero. QBI 1,487 is income-limited to zero, so no Form 8995 is emitted. EIC is zero because affirmative valid-SSN review is absent; actual taxpayer ineligibility is unproved. Conditional tax/amount owed 226 agrees across pending/native/PDF.

However, actual Schedule C pages 7/9 line 31 and native NetProfitOrLossAmt retain raw losses −2,000/−3,000, rather than the allowed −500/−900. The [2025 Schedule C instructions](https://www.irs.gov/instructions/i1040sc), lines 31/32, expressly require the result after at-risk limits for these materially participating activities. Filed Schedule C line 31 totals −2,000, differing from Schedule 1/SE +1,600 by 3,600. The fixture’s raw-loss reviewFocus is not authoritative tax proof. Actual offset-profit page 11 also marks line 32a, which need not be completed for a profit; native/source agree with that unnecessary mark. A new future-only item records the loss projection/fixture expectation/conditional mark without implementation. No approval flags, checker, aggregate addition, authenticated-source/BR/ATS proof or whole checkoff is claimed. Runtime 2,590 hashes remain unchanged; main 52 requirements remain frozen, 26 future items unworked, aggregate 75 bounded passes / 267 packets / 2,706 pages.


### Certified WOTC: 16-page observation, not approved; top-board estimate

Read all source/filer facts, selected pending Schedule C/Form 5884/3800/6251 and every native leaf/attribute for `single-certified-work-opportunity-credit`. Eleven actual changed pages (1–9, 15–16) were individually inspected; five pages (10–14) have exact image hashes matching previously inspected orphan-drug pages 8–12. All 16 pages are covered, with no claim of sixteen manual views. Private sixteen-page independent observation retains all 19 artifact/image hashes, reuse provenance and prepared-manifest source/XML/PDF digest checks.

The [Form 5884 instructions](https://www.irs.gov/instructions/i5884) support a conditional 6,000 first-year TANF wage cap, 40% for 400 hours and full wage-deduction reduction of the 2,400 determined credit. Source certification/hire January 15 and February service/pay date join one employee/business, but SWA and payroll references are explicitly synthetic and authenticate neither targeted-group certification nor hours/payments. Actual Form 5884 line 1b wage 6,000/credit 2,400, lines 2/4 and native agree. Deductible Schedule C wages 6,000−2,400=3,600 equal receipts, leaving zero profit; no positive Schedule 1, SE or QBI copy is emitted. Cash/material-participation/no-1099-payment marks, owner and descriptions are legible.

Wages/AGI 120,000 less standard 15,750 gives taxable 104,250; 24% less 7,153 gives ordinary tax 17,867. AMTI 120,000 less 88,100 gives 31,900 × 26%=TMT 8,294/AMT zero. Specified-credit limit 17,867 permits all 2,400; Form 3800 row 4b e/g/i and reference IRS58844, Schedule 3 reference IRS38003 and Form 1040 reconcile: total tax 15,467, withholding 20,000, refund 4,533. Unused Form 3800 parts are blank. Actual page 7 repeats skipped 18/19 each 6,221 and 20/21 each 11,646 despite no empowerment/renewal credit; native omits intermediates. This seventeenth observed discrepancy extends the existing future-only note without implementation. No clean approval, checker, aggregate addition, source authentication, BR/ATS proof or whole checkoff is claimed. Runtime 2,590 hashes unchanged; main 52 requirements frozen, future 26 unworked; aggregate 75 / 267 packets / 2,706 pages unchanged.

The user added a requirement to keep a MeF pass estimate at the board top. The top now states zero expected IRS ATS acceptances before tomorrow morning, based on the [IRS scheduled outage through October 13](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status), no submitted/accepted scenarios and unverified transmission enrollment. This is a window-specific availability estimate, not a statistical software-quality prediction. Pass probability after reopening is explicitly not yet estimable while source conflicts, matching business rules and full regression remain open. Update the estimate when evidence changes; local checks are never substituted for IRS acceptance.


### Employer childcare facility/referral credit: 16-page observation, not approved

Read all source/filer metadata, selected Schedule C/Form 8882/3800/6251 pending data and every native leaf/attribute for `single-employer-childcare-facility-and-referral-credit`. Nine actual changed pages (2–9, 16) were individually inspected; seven (1, 10–15) exactly match previously covered WOTC pages 1, 10–14 and 16, with retained image hashes/reuse provenance. Private sixteen-page independent observation retains all 19 artifact/image hashes and original prepared-manifest source/XML/PDF checks. This is 16-page coverage by nine actual views and seven exact matches, not sixteen manual views.

The current [IRS Form 8882 including instructions](https://www.irs.gov/pub/irs-pdf/f8882.pdf) is December 2017 revision, matching the selected actual page. Its TY2025 facility 25% and referral 10% amounts give 40,000×25%=10,000 plus 10,000×10%=1,000, total 11,000 below the 150,000 cap. Full determined credit reduces deductible expenses even when current use is limited: facility 30,000/referral 9,000=39,000. Actual Schedule C Part V rows, total/line 27a and native agree; equal receipts leave zero profit, with no positive Schedule 1/SE/QBI copies. Identity, cash/material-participation/no-1099-payment marks and expense descriptions are legible. Supplied September 30/October 15 expenditure, two contract/payment references, provider EINs, Texas license, FMV 42,000 versus cost 40,000, employee availability/nondiscrimination and no-capital/no-double-benefit assertions are unauthenticated synthetic source facts. No actual provider/license/payment records establish qualification.

Conditional AGI 120,000 less standard 15,750 gives taxable 104,250 and tax 17,867. AMTI 120,000 less exemption 88,100 gives TMT 8,294 and AMT zero. Quarter excess is zero; standard-credit limit 17,867−8,294=9,573 allows that part of 11,000. Form 3800 row 1k e/g=11,000/i=9,573 references IRS88825; Schedule 3 references IRS38003. Actual/native tax 8,294, withholding 20,000 and refund 11,706 agree. Unused 1,427 is not an accepted durable carryforward ledger. All nine parent credit pages retained, unused Parts IV–VI blank and Form 6251 agrees.

Actual packet page 7 repeats skipped Form 3800 18/19 each 6,221, 20=11,646 and 21=2,073 without empowerment/renewal credit. Native omits the intermediates. This eighteenth observed discrepancy packet extends the existing future-only note without implementation. No clean approval, checker, aggregate addition, source authentication, BR/ATS proof or whole checkoff is claimed. All 2,590 runtime hashes remain unchanged; main 52 requirements frozen, future 26 unworked and aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. The top-board window-specific zero ATS acceptance estimate remains visible; no evidence supports a revised post-reopening probability.


### Empowerment-zone employment credit: 16-page observation, not approved

Read all source/filer metadata, selected Schedule C/Form 8844/3800/6251 pending data and every native leaf/attribute for `single-empowerment-zone-employment-credit`. Six changed pages (2–4, 7, 9, 16) were individually inspected; ten pages (1, 5–6, 8, 10–15) exactly match previously covered WOTC images, including WOTC page 16 for this packet’s page 15. Private sixteen-page independent observation retains all 19 artifact/image hashes, exact reuse provenance, page origins and original prepared-manifest source/XML/PDF checks. This is complete 16-page coverage by six actual views and ten exact matches, not sixteen manual views.

The [Form 8844 instructions](https://www.irs.gov/instructions/i8844) extend the credit through 2025, limit qualified wages to 15,000 per employee less WOTC wages, and require the full determined credit to reduce the wage deduction. Conditional qualified wages 10,000 with no WOTC wages give 20%=2,000. Actual Form 8844 lines 1/2/4 and native agree. Schedule C gross wages 10,000 less 2,000 gives deductible wages 8,000, matching receipts and leaving zero profit. Owner, retail-shop description, cash/material-participation/no-1099-payment marks and zero-profit line are legible; no positive Schedule 1/SE/QBI copy is emitted. Employee/business/payroll references and Los Angeles zone identifiers are synthetic. The source assertions establish neither actual residence/work addresses within zone boundaries, paid wages, required service period nor eligibility through authenticated evidence.

AGI 120,000 less standard 15,750 gives taxable 104,250 and ordinary tax 17,867. AMTI 120,000 less exemption 88,100 gives TMT 8,294 and AMT zero. The [Form 3800 instructions](https://www.irs.gov/instructions/i3800) require Section B for the empowerment-zone credit. Here actual/native lines 18/19=6,221 (75% of TMT), 20/21=11,646, 22/25/26=2,000 are applicable and reconcile. They do not extend the skipped-section discrepancy recorded for other packets. Row 3 e/g/i=2,000 references IRS88445; Schedule 3 references IRS38003. Form 1040 total tax 15,867, withholding 20,000 and refund 4,133 agree. All nine Form 3800 pages retained; unused Parts IV–VI blank; Form 6251 matches supplied facts.

No new discrepancy or future item is claimed. No clean approval, checker, aggregate addition, source authentication, BR/ATS proof or whole checkoff is claimed. All 2,590 runtime files match the full-rerun launch manifest. The regression process was verified live (PIDs 20128/20129); running status is not a pass. Main 52 requirements remain frozen, future 26 unworked, aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. The top-board window-specific estimate remains visible; no evidence supports a revised post-reopening probability.


### Two independently owned businesses with one spouse-established health plan: 16-page observation

Read all source/filer facts, selected pending Schedule C/SE/Form 7206/8995/1040/Schedules 1/2 and every native leaf/attribute for `independent-primary-spouse-c-health-one-established-plan-two-owned-businesses`. All sixteen actual pages were individually inspected, with owner names/SSNs, business descriptions, cash/material-participation/no-1099-payment marks, amounts, continuation/order and legibility reviewed. Private sixteen-page independent observation retains all 19 artifact/image hashes, page origins and original prepared-manifest source/XML/PDF digest checks.

Two 1099-NEC sources join separately to primary design receipts 10,000 and spouse photography receipts 5,000; each is counted once. Primary W-2 wages/Social Security wages 176,100 exhaust that owner's 2025 Social Security base. Primary SE earnings 9,235 therefore give Medicare-only tax 268/half 134. Spouse earnings 4,617.50 round to native/PDF 4,618; separately rounded Social Security 573 and Medicare 134 give 707/half 354. The [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) require separate copies for spouses, with combined tax on Schedule 2. Both source-owner copies and totals 975/488 reconcile; health premiums do not reduce SE earnings.

Only the spouse has an established plan: twelve monthly payments 185 total 2,220, with non-Marketplace/non-LTC/no-employer-eligibility assertions. The [Form 7206 instructions](https://www.irs.gov/instructions/i7206) require an established plan, exclude eligible employer-plan months and prohibit reducing SE earnings by this deduction. Actual spouse Form 7206 alone shows premiums 2,220, business income 5,000, owner SE deduction 354, limit 4,646 and allowed 2,220; no primary plan copy is emitted. Policy/payment/employer review references and primary no-plan inventory remain unauthenticated synthetic evidence. No factual eligibility conclusion is inferred from the word “issued” in those references.

The [Form 8995 instructions](https://www.irs.gov/instructions/i8995) reduce attributable QBI by SE and health deductions. Spouse QBI 5,000−354−2,220=2,426; primary QBI 10,000−134=9,866. Owner-row names/SSNs and total 12,292 agree across pending/native/PDF. Component 2,458 is below income limit 31,378. Total income 191,100 less adjustments 2,708 gives AGI 188,392; standard 31,500 and QBI 2,458 give taxable 154,434. Conditional ordinary MFJ tax rounds to 23,803; plus SE 975 gives 24,778, withholding 30,000 and refund 5,222. EIC opt-out source/native/PDF mark agrees. No capital gain or additional Medicare threshold is triggered.

Actual profitable Schedule C pages 7/9 unnecessarily mark 32a, matching native/source; the existing future-only conditional-mark item is extended. Actual primary SE page 11 prints zero 8c/9/10 despite line 8a's direction to skip 8b–10 when Social Security wages reach the maximum; native retains zero intermediates. A new future-only review item records this presentation issue without implementation or claimed tax change. Both optional-method pages are blank. No clean approval, checker, aggregate addition, source authentication, BR/ATS proof or whole checkoff is claimed. All 2,590 runtime hashes remain unchanged; main 52 requirements frozen, future 27 unworked and aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. Full regression was verified live; the top-board estimate remains visible without an invented post-reopening probability.


### Two established owner health plans, both fully deductible: 17-page observation

Reviewed `independent-primary-spouse-c-health-both-full` by source/filer differences against the complete prior one-plan read, selected owner calculations and every native leaf/attribute. Five changed actual pages (1/2/4/16/17) were individually viewed; twelve others exactly match previously inspected one-plan images, with retained image hash/provenance. Private seventeen-page independent observation retains all 20 artifact/image hashes and prepared-manifest source/XML/PDF checks. This is seventeen-page coverage, not seventeen manual views.

The only new source plan is primary business BIZ-T: twelve monthly premiums 500 total 6,000, with distinct establishment/policy/payment/employer-eligibility references. Spouse BIZ-S remains twelve times 185=2,220. Both sets of references are synthetic and unauthenticated. The [Form 7206 instructions](https://www.irs.gov/instructions/i7206) require the established-business plan and eligible-month limits. Owner profit less owner half-SE deduction gives primary 9,866 and spouse 4,646; both premium totals fit. Two native IRS7206 documents, owner names/SSNs and actual pages 15/16 agree. Schedule 1 health deduction 8,220 plus SE deduction 488 gives adjustments 8,708. Schedule C/SE tax remains unchanged: profits 10,000/5,000, SE tax 268/707, total 975.

The [Form 8995 instructions](https://www.irs.gov/instructions/i8995) support primary QBI 10,000−134−6,000=3,866 and spouse 5,000−354−2,220=2,426. Total 6,292 yields rounded component 1,258, below income limit 30,178. AGI 191,100−8,708=182,392; standard 31,500/QBI 1,258 give taxable 149,634. Rounded ordinary MFJ tax 22,747 plus SE 975 gives 23,722; withholding 30,000/refund 6,278 agree across pending/native/actual Form 1040. Identity, EIC opt-out, native IDs, repeated owner copies and packet ordering reconcile.

Exact reused profitable Schedule C pages 7/9 and primary SE page 11 repeat the unnecessary at-risk marks/skipped zero intermediates already recorded in future items; those notes are extended, without implementation or new item. No clean approval, checker, aggregate addition, authenticated-source/BR/ATS proof or whole checkoff is claimed. All 2,590 runtime hashes unchanged; main 52 frozen/future 27 unworked, aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. The top-board estimate remains visible and qualified.


### Primary health premiums exceed owner business income: 17-page observation

Reviewed `independent-primary-spouse-c-health-primary-income-limited` using all source/filer differences against the previously read both-full fixture, selected owner pending calculations and every native leaf/attribute. Five changed pages (1/2/4/16/17) were individually inspected; twelve exact rendered-image matches to the covered both-full packet retain their provenance/hashes. Private seventeen-page independent observation retains all 20 artifact/image hashes, page origins and original prepared-manifest source/XML/PDF checks. This is seventeen-page coverage by five views and twelve exact matches.

All source facts remain the same except twelve primary monthly premiums rise from 500 to 1,200, totaling 14,400. The [2025 IRS Form 7206](https://www.irs.gov/pub/irs-pdf/f7206.pdf) limits line 14 to the smaller of premiums and adjusted earned income. Primary business income 10,000 less own half-SE deduction 134 gives limit 9,866; actual/native primary lines 1/3=14,400, 4/5=10,000, 6=100%, 7=134, 8/10/13=9,866 and 14=9,866 agree. Spouse premiums/deduction 2,220 and earned limit 4,646 remain unchanged. Combined health deduction 12,086 plus half-SE 488 gives adjustments 12,574. Excess primary premiums 4,534 are not an approved carryforward; no additional itemized deduction conclusion is claimed. Source policy/payment/establishment and employer-plan eligibility references remain unauthenticated synthetic entries.

Primary QBI 10,000−134−9,866=zero, retained as an owner-specific zero row in actual/native Form 8995. Spouse QBI remains 2,426; rounded component 485 is below income limit 29,405. AGI 191,100−12,574=178,526, standard 31,500 and QBI 485 give taxable 146,541. Ordinary MFJ tax rounds to 22,067; unchanged owner SE tax 268/707 totals 975, yielding tax 23,042, withholding 30,000 and refund 6,958. Actual Form 1040, Schedule 1, both Form 7206 copies and Form 8995 reconcile. Business profits, SE copies, owner identity, EIC opt-out, two-document credit-independent ordering and blank optional-method pages retain exact prior coverage.

Reused profitable Schedule C pages and primary SE page repeat the unnecessary line 32a/skipped-zero presentation observations; existing future-only notes extended without implementation or new item. No clean approval, checker, aggregate addition, source authentication, BR/ATS proof or whole checkoff is claimed. All 2,590 runtime hashes unchanged; main 52 frozen, future 27 unworked and aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. Regression process verified live; top-board estimate retained without an unsupported post-reopening probability.


### Employer-eligible months excluded: two 17-page owner health-plan observations

Reviewed `independent-primary-spouse-c-health-primary-months-excluded` and `independent-primary-spouse-c-health-both-months-excluded`: all source/filer differences against their previously read predecessors, selected pending owner calculations and every native leaf/attribute. The primary-excluded packet has one actual new view (page 16) and sixteen exact rendered-image matches to the covered one-established-plan packet. The both-excluded packet has five new views (1/2/4/15/17) and twelve exact matches to the covered primary-excluded packet. Private independent observations retain each packet’s 20 artifact/image hashes, page origins, reuse provenance and prepared-manifest source/XML/PDF checks. This is 34-page coverage by six actual views and 28 exact matches, not 34 manual views.

The [2025 Form 7206 instructions](https://www.irs.gov/instructions/i7206) exclude premiums for a month with employer-plan eligibility even if the individual did not enroll. In the first packet, all twelve primary monthly eligibility flags become true; premiums paid remain twelve times 500=6,000. Primary lines 1/3/14 are zero, while earned-income limit 9,866 and own half-SE deduction 134 remain. Spouse eligibility flags remain false, premiums/deduction 2,220 and earned limit 4,646 unchanged. The extra zero-deduction primary Form 7206 is legible and matches native; other pages exactly reproduce the previously inspected one-plan return. Health deduction 2,220 plus SE deduction 488 gives adjustments 2,708/AGI 188,392; owner QBI 9,866/2,426 gives deduction 2,458; taxable 154,434, ordinary tax 23,803 plus SE 975 yields tax 24,778/refund 5,222.

In the second packet, the twelve spouse monthly eligibility flags also become true. Spouse paid premiums remain 2,220 but lines 1/3/14 become zero; both owner Form 7206 copies remain with their own business incomes and limits. No health deduction remains on Schedule 1 (PDF line 17 blank/native zero). Adjustments are only SE deduction 488, giving AGI 190,612. Owner QBI 9,866/4,646 totals 14,512; component/deduction rounds to 2,902 below income limit 31,822. Standard 31,500 gives taxable 156,210, ordinary MFJ tax 24,194, unchanged SE 975 and total tax 25,169. Withholding 30,000/refund 4,831 reconcile across pending/native/actual Form 1040. Both packets preserve correct owner names/SSNs, EIC opt-out, document IDs/order and blank optional-method pages.

Eligibility assertions remain conditional: source references do not authenticate employer-plan offers, eligible persons/months, actual policy establishment or payments. The first packet's different owner flags are not evidence that a real employer plan restricts spouse eligibility; its actual terms need source proof. No extra itemized deduction or source authenticity conclusion is claimed. Exact reused profitable Schedule C marks and primary SE skipped-zero fields repeat the existing future-only presentation observations; notes extended without implementation or new item. No clean approval, checker, aggregate addition, BR/ATS proof or whole checkoff is claimed. All 2,590 runtime hashes unchanged; main 52 requirements frozen, future 27 unworked, aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. The full regression PIDs 20128/20129 were verified live; top-board estimate remains visible and qualified.


### Different owner employer-eligible months: final prepared health-plan variant observation

Reviewed `independent-primary-spouse-c-health-different-owner-eligible-months` using all source/filer differences against the previously read both-full fixture, selected owner pending calculations and every native leaf/attribute. Six actual changed pages (1/2/4/15/16/17) were individually inspected; eleven exact rendered-image matches to the covered both-full packet retain hashes/provenance. Private seventeen-page independent observation retains all 20 artifact/image hashes, page origins and original prepared-manifest source/XML/PDF checks.

Only employer-eligibility month assertions change: primary January–February and spouse January–April are excluded. The [2025 Form 7206 instructions](https://www.irs.gov/instructions/i7206) exclude employer-eligible months regardless of enrollment. Primary ten remaining months times 500 gives 5,000; spouse eight times 185 gives 1,480. Both remain below own earned limits 9,866/4,646. Actual/native Form 7206 owner names/SSNs, line 1/3/14 totals and respective income/half-SE deduction/limit lines reconcile. Source monthly references remain synthetic; actual employer-plan offers/covered persons/months, establishment and payments are unauthenticated.

Combined health deduction 6,480 plus half-SE 488 gives adjustments 6,968 and AGI 184,132. Primary QBI 10,000−134−5,000=4,866; spouse 5,000−354−1,480=3,166. Total 8,032 yields rounded QBI component 1,606 below income limit 30,526. Standard 31,500 gives taxable 151,026; ordinary MFJ tax rounds to 23,054, unchanged SE 975 gives total tax 24,029. Withholding 30,000/refund 5,971 agree across pending/native/actual Form 1040. Owner joins, EIC opt-out, document IDs/order and blank optional-method pages remain covered.

All six prepared independent-owner health-plan variants now have qualified observation records: 101 pages covered by 38 individual views and 63 exact rendered-image matches. All 119 retained artifact/image hashes across the six observations were independently reverified. This proves retained observation coverage, not clean filing parity or authenticity; none is added to the approved aggregate. Profitable Schedule C line 32a and skipped primary SE zero fields recur in all six variants; existing future-only notes reflect the family, without implementation or new item. Main 52 requirements remain frozen, future 27 unworked, aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. All 2,590 runtime hashes match the full-rerun launch manifest. Full regression was verified live; top-board estimate remains visible without an invented eventual pass probability.

### Passive partnership new-markets credit: 18-page observation

Reviewed all source/filer facts, selected pending Form 8582-CR/3800/Schedule E/6251/1040 calculations and every native leaf/attribute for `single-passive-partnership-new-markets`. Thirteen actual pages (1–10, 16–18) were individually inspected across the continued review; five pages (11–15) exactly match the previously observed orphan-drug packet’s pages 8–12. Private eighteen-page independent observation retains all 21 artifact/image hashes, reuse provenance, page origins and prepared-manifest source/XML/PDF digest checks. This is eighteen-page coverage, not eighteen manual views.

Wages 100,000 and owner rental income 20,000 give AGI 120,000, standard deduction 15,750 and taxable income 104,250. The [Form 8582-CR instructions](https://www.irs.gov/instructions/i8582cr) calculate passive-income tax by comparing tax with and without that income using the applicable tax method. Conditional ordinary taxes 17,867 and 13,455 give 4,412. This exceeds the sole passive partnership credit 500; actual/native lines 4a/4c/5=500, 6=4,412, 7=zero and 37=500 agree. The instructions skip Worksheets 5–9 for this line-7-zero branch, so the review-focus mention of Worksheet 9 does not establish a missing required output. No special allowance or basis-election claim is made. Pending unallowed credit is zero.

The [Form 8874 instructions](https://www.irs.gov/pub/irs-pdf/f8874.pdf) permit an individual whose only new-markets credit comes from a partnership or S corporation to report it directly on Form 3800 line 1i without filing Form 8874. The partnership EIN/recipient/source reference joins to native and actual row 1i, columns d/g/i=500. Form 3800 lines 2/3=500, regular tax 17,867 and TMT 8,294 give standard limit 9,573 and allowed 500. Actual Form 6251 AMTI 120,000/exemption 88,100/excess 31,900/TMT 8,294/AMT zero agree. Schedule 3 references IRS38004, and Form 1040 tax 17,367 less withholding 16,000 gives amount owed 1,367. Schedule E property address/type 1, 365 rental days, zero personal days, no-1099-payment mark and 20,000 profit reconcile. Identity, document IDs/order, continuation and legibility were reviewed.

Actual page 8 nevertheless fills Form 3800 skipped lines 18/19=6,221, 20=11,646 and 21=11,146 without empowerment/renewal credit; native omits those intermediate amounts. This is the nineteenth observation of the existing future-only presentation issue; its note is extended without implementation or new item. K-1, payroll and rental-ledger references remain synthetic, without authenticated issuer/ledger bytes. No clean parity approval, checker, aggregate addition, source authenticity, BR/ATS proof or whole checkoff is claimed. All 21 retained hashes and all 2,590 runtime hashes were independently verified. Main 52 requirements frozen, future 27 unworked and aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. Full regression PIDs 20128/20129 were verified live; top-board estimate remains visible without an invented eventual pass probability.


### Mixed passive new-markets: compacted 18-page observation

Private `single-mixed-passive-new-markets-eighteen-page-independent-observation.json` retains full findings,21hashes and9views/9exact-reuse provenance. Source/pending/native/actualPDF: credits7500,allowed4412,unallowed3088 allocated2059/1029; tax13455/refund2545. [8582CR instructions](https://www.irs.gov/instructions/i8582cr); [3800 instructions](https://www.irs.gov/instructions/i3800). PartV owner rows reconcile; Worksheets4/8/9 not in packet, durable ledger unproved. Skipped3800section repeats existing future-only issue;20observations. Synthetic authenticity unproved; no clean approval/aggregate addition/checkoff. Runtime2590 unchanged; main52frozen/future27unworked. ENOSPC prevents commit; regression live with unverified failures.

### Two Form 8835 packets: 38-page qualified observations

`single-two-geothermal-business-credits` has six individual views (2/3/5/7/11/17) and thirteen exact image matches. `single-wind-and-geothermal-business-credits` has two individual views (14/15) and seventeen exact matches. Both source/filer records, selected pending calculations and every native leaf/attribute were read. Distinct facility identity, capacity, coordinates, dates, conditional marks, ordering and legibility were reviewed. Each source credit is 600; the two Form 3800 Part V rows total 1,200, giving conditional tax 23,867 and refund 6,133. Both actual page 5 copies repeat skipped Form 3800 lines 18/19=12,071 and 20/21=12,996 without empowerment credit. The existing future-only note covers both, unworked. See the [Form 8835 instructions](https://www.irs.gov/instructions/i8835).

After disk capacity recovered to about 3.1 GiB, all 38 memory-rendered images were regenerated and saved, with exact matches against the prior memory digests. Two private nineteen-page independent observations now retain 44 independently verified source/XML/PDF/image hashes, page origins and reuse provenance. All 2,590 runtime hashes remain unchanged. Image retention is now proved; it does not establish clean parity, source authenticity, BR/ATS acceptance, an aggregate addition or a whole requirement checkoff. Main 52 requirements remain frozen, future 27 unworked, aggregate 75 bounded passes / 267 packets / 2,706 pages unchanged. Regression remains live with reported failures; no terminal pass is claimed. No retained evidence was deleted to recover capacity.

### Mixed C/F tips, no credit: source/native and one-page stage

Read all source/filer facts, selected owner pending calculations and every native leaf/attribute for `mixed-cf-tip-ordinary-no-credit`. Primary Schedule C profit 34,001 and spouse Schedule F profit 54,001 give separate SE taxes 911/7,630 and half-SE deductions 456/3,815. Owner health deductions 6,000/9,600, tip deduction 12,000 and QBI deduction 11,226 give conditional tax 53,203 and refund 66,797. Actual page 11/native put spouse custom-work 1,001 on Schedule F line 8 with line 7 blank; the existing future classification item is extended under the [Schedule F instructions](https://www.irs.gov/instructions/i1040sf). Other twenty pages remain to inspect. The original three prepared-manifest hashes were independently verified; no whole-packet approval or aggregate addition is claimed. Disk rendering has now completed and the page images are retained for continued review.


### Interrupted full regression and missing-tool diagnosis

The full rerun on commit `23cbeee5dbbc4b5de5495f2f55996a49cf58e683` terminated at 2026-10-07T13:57:30.503017+00:00 with SIGTERM/exit 143. No final test totals or error traces were emitted; three Form 4972 failure markers preceded interruption. Termination source and those failures’ causes remain unproved. Retained `full-test-after-repairs.log` SHA-256 is `54bba9ff02ce1769988bea6b541163415653dbdfad506925343de5762bbae44f`. The old session is gone; no full pass is claimed.

The isolated three-file run on commit `896e249de4ee778ad45931275ab4765cf21d88af` ran from 15:23:22 to 15:24:15 UTC, exit 1: 3 passed / 4 failed. Each failure is `NotFound: Failed to spawn pdftotext`; the temporary `/tmp/opentax-poppler-env` no longer exists. This environment diagnosis does not establish the interrupted run’s causes. `interrupted-4972-focus.log/.status` retain command, timestamps, runtime validation and traces; log SHA-256 `9f2506bb78d960a58e7356b1234d83ef057823e5a0305dfeb72eb90f95fb92b3`. All 2,590 runtime hashes were independently reverified unchanged. Restore the same Poppler version before a fresh isolated run; retain both attempts. Main 52 requirements remain frozen; future 27 unworked; approved aggregate unchanged.


### Mixed Schedule C/F ordinary tip and owner-health packet: 21 pages observed

Completed the existing `mixed-cf-tip-ordinary-no-credit` packet observation: 18 actual page views and three exact image matches to retained independent-owner health-plan observations (blank C continuation and two blank optional SE pages). All 24 source/XML/PDF/image hashes and the three reuse joins were independently reverified. Private `mixed-cf-tip-ordinary-no-credit-twentyone-page-independent-observation.json` retains per-page notes, hashes, reuse provenance and conditional arithmetic. Earlier complete source/filer and native-leaf review plus selected pending calculations remain the stated scope; complete pending review is not claimed.

Owner business profits 34,001/54,001, SE taxes 911/7,630, half-SE deductions 456/3,815 and health deductions 6,000/9,600 reconcile. Tips 12,000 are included once in primary receipts and remain below owner net-income capacity; MAGI 298,132 is below the joint phaseout threshold. QBI owner amounts 15,545/40,586 give deduction 11,226. Additional Medicare 551 and zero NIIT yield tax 53,203/refund 66,797. Raw W-2 total 230,000.86 rounds to 230,001 on Form 1040; no rounding-defect conclusion is made from rounded individual native copies.

Page 11 repeats the existing Schedule F custom-work classification finding: 1,001 on line 8, line 7 blank. Pages 9/11 mark loss-only at-risk boxes despite profits. Primary SE page 13 prints skipped 8d/9/10, while 8c is blank; native retains zero intermediates. Form 8995 page 19 omits Sam from the joint-name header. Review-focus issued/actual wording is unsupported by authenticated source bytes. These extend existing future-only notes without implementation or new items. No clean approval, checker, aggregate addition, external authenticity, BR/ATS proof or main checkoff is claimed. Main 52 frozen, future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages.


### Restored Form 4972 isolated run: 7/0

Restoring Poppler 26.09.0 permits all three interrupted-run Form 4972 files to pass under the normal typed test permissions: 7 passed / 0 failed, exit 0, 15:26:24.980160–15:28:56.586495 UTC. `interrupted-4972-focus-restored.log/.status` retain exact arguments and launch commit `896e249de4ee778ad45931275ab4765cf21d88af`; log SHA-256 `b7b5c70a0018e11ffabb10c535326db5528e154f540eab0d03a9e60246c5cbae`. All 2,590 runtime hashes remain unchanged. The earlier missing-tool attempt and interrupted full batch remain retained; no cause is inferred for the original full-run markers. This isolated success is not a full regression pass. A unique full-command restart follows the retained focused result.


The fresh full batch started at 2026-10-07T15:29:18.409660+00:00 on commit `ecdccee1e5959be5dd11df8d7c7138187b47a7e9`, same command `PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`. New session 48333 / PID 31254 was independently confirmed live with CLI tests progressing. `full-test-after-tool-restore.log/.status` and `runtime-full-after-tool-restore-at-launch.json` retain this attempt separately; runtime manifest SHA remains `6fddb6dba76e7d13d32d2b941f3ff5af7eda9933c3a7b0d848c26290039e0a63`. Restored focus status SHA `a37cfa3d17e234639768be4a488ed59d6b6b1de3af10b3c27be54de8287217c5` and interrupted prior status SHA `59043aed3d16fb743ded25e55f4c9db13cbb1ec4eaa81040c3eae9bf2d109536` are pinned. Tool versions remain Deno 2.9.4 / Poppler 26.09.0 / libxml 2.9.13. Running is not a full pass; main 52 frozen/future 27 unworked and approved aggregate unchanged.


### Mixed C/F WOTC tips without health plans: 32 pages observed

For the existing `mixed-cf-tip-no-health` fixture, all source/filer facts, selected pending calculations and every native leaf/attribute were read. Source shared employee identity, two February payroll records of 6,000.49, employer/owner joins, January 15 hire/certification references, 400 hours each and common-control assertions remain synthetic. Conditional group wages cap at 6,000, credit 2,400 splits 1,200 per business; filed deductions 4,800 give primary C profit 35,201 and spouse F profit 55,201. [Form 5884 instructions](https://www.irs.gov/instructions/i5884) govern group allocation and wage reduction. Source references do not authenticate certification, payroll, common control or issued tips.

Separate owner SE taxes 943/7,799 and half-SE 472/3,900 give AGI 316,031. Primary net tip capacity is 34,729. [Schedule 1-A](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf) directs decreasing 16,031/1,000 to 16; the 25,000 cap less 1,600 yields tip deduction 23,400. QBI rows 11,329/51,301 give deduction 12,526, below income limit 52,226. Taxable income 248,605 produces regular tax 45,359 under the [2025 tax-computation worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf): 24% less 14,306. The private arithmetic helper initially used incorrect recalled bracket offsets; corrected to this IRS formula before successful independent verification. AMTI 280,105 less exemption 137,000 gives TMT 37,207/AMT zero. Specified credit limit 40,269 permits all 2,400. Additional Medicare 571 plus SE 8,742 gives other tax 9,313, total tax 52,272/refund 67,728 against withholding 120,000. No health-plan inputs, deduction or Form 7206 copy are present.

All 32 actual pages were observed: 21 direct views and 11 exact image matches to retained qualified observations. An additional 200-dpi page 29 view confirmed the legible exemption 137,000. Private `mixed-cf-tip-no-health-thirtytwo-page-independent-observation.json` retains 36 verified source/XML/PDF/image hashes, all page notes, exact-reuse provenance and independent arithmetic. Source SHA `8cc17e573826b67ddae29b37b77414df798ebc5b084db23c88e3ec2b4acffbe5`, XML `faf337ed3c903160d681360fd8c00c2bde2581296e066678cdb5ada967d3475e`, PDF `50917946eeb5a48b253055658ae7e0fdf4e9f4b980fc6a04ed79c30a174cce7e`. Native references connect Schedule 3 to IRS38009 and Form 5884 to both retained allocation statements; actual page 28 lists both EINs/3,000 qualified wages/1,200 credit each.

Page 12 repeats custom-work classification on Schedule F line 8 rather than 7. Profitable C/F pages 10/12 mark loss-only at-risk boxes; primary SE page 14 fills skipped 8d/9/10 with 8c blank. Joint Forms 3800/6251/8995 pages 18/29/30 omit Sam from name(s)-on-return headers; Form 5884 also prints a primary-only header. Page 19 fills skipped Form 3800 18/19 each 27,905 and 20/21 each 17,454 without empowerment/renewal credit, while native omits those intermediates: the twenty-third observation of the existing future-only issue. Review-focus actual health-plan wording conflicts with absent health inputs. Existing future notes extended only; no implementation/new item. No clean approval, checker, aggregate addition, authenticity, BR/ATS proof or main checkoff. Main 52 frozen, future 27 unworked, aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes unchanged; fresh full regression PID 31254 independently confirmed live.


### Mixed C/F WOTC tips with independent owner health: 34 pages observed

Completed the existing `mixed-cf-tip-owned-health` observation: all source/filer facts, selected pending calculations and every native leaf/attribute read; 11 direct page views and 23 verified exact rendered-image matches to retained observations. Private `mixed-cf-tip-owned-health-thirtyfour-page-independent-observation.json` retains 37 verified source/XML/PDF/image hashes, page notes/reuse provenance and conditional arithmetic. Source SHA `34f0694c7f91d126115ce97fb9571f20f28753a2e2ea5781e4a78ac3e9527343`, XML `bd86c839220d817a6f6ad17f2fcf82f95a860edc273dd59dea922c23a59faf0f`, PDF `2fbea327b686fcc0a8a19b7f6eab1c77a69a493e028f0580ad744d7ca25ac952`.

Shared-employee group WOTC 2,400 splits 1,200 each; reduced wage deductions 4,800 produce C/F profits 35,201/55,201. SE 943/7,799 and half-SE 472/3,900 reconcile by owner. Two separate established-plan assertions associate primary policy Mixed-CF-T-full with Alex and farm policy Mixed-CF-S-full with Sam. All 24 monthly policy/payment/owner/date/premium joins were checked after reading the raw rows; no employer-plan eligibility, Marketplace, LTC or public-safety exclusion is asserted. Monthly 500.04/800.04 premiums total 6,000.48/9,600.48; filed health deductions 6,000/9,600 are below respective business capacities 34,729/51,301. Synthetic references do not authenticate policy establishment, payments, employer eligibility, SWA/payroll, ownership or tip qualification.

Total adjustments 19,972 yield MAGI 300,431. Primary tip net capacity 28,729 exceeds reported 12,000; [Schedule 1-A](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf) decreases 431/1,000 to zero, so tip deduction remains 12,000. QBI owner amounts 16,729/41,701 give deduction 11,686 with nonbinding income limit 51,386. Taxable income 245,245 produces regular tax 44,553 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf). AMTI 276,745/exemption 137,000 gives TMT 36,334/AMT zero. Specified-credit limit 39,665 permits all 2,400; other tax SE 8,742 plus Additional Medicare 571 gives 9,313. Total tax 51,466/refund 68,534 reconcile against withholding 120,000. Actual separate Forms 7206 pages 30/31 agree with owner/native documents; group statement references now point to documents19/20.

Exact reused C/F pages 10/12 repeat profitable loss-only marks and Schedule F custom-work 1,001 on line 8 instead of 7. Exact primary SE page 14 repeats skipped 8d/9/10 with 8c blank. Joint Forms 3800/6251/8995 pages 18/29/32 omit Sam from name(s)-on-return headers. Actual Form 3800 page 19 prints skipped 18/19 each 27,251 and 20/21 each 17,302 without empowerment/renewal credit; native omits those fields. This is the twenty-fourth qualified observation of the existing future issue. Existing future-only notes extended without implementation/new items. No clean approval, checker, aggregate addition, authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes unchanged; full regression PID31254 independently confirmed live.

### Mixed C/F tip deduction limited by owner net income: 34 pages observed

Completed the existing `mixed-cf-tip-health-netincome-limited` observation. All 26 source differences from the fully read `mixed-cf-tip-owned-health` baseline were inspected: fixture ID, primary tips 12,000→40,000 and 24 primary monthly premium fields 500.04→1,000. Other source/filer facts are exactly equal. Selected pending calculations and every native leaf/attribute were read. Eleven direct page views (1/2/4/5/6/18/19/29/30/32/34) and 23 verified exact rendered-image matches cover all 34 pages. Private `mixed-cf-tip-health-netincome-limited-thirtyfour-page-independent-observation.json` retains 37 independently reverified artifact/image hashes, source differences, baseline hash, page notes and reuse provenance. Source SHA `ad7afecd4e9d1d128d985458f3d87f222b0b00a6e240b08cc822dd013d03389a`, XML `f30633b23b673ec222e7da7a46f042762cfb8018cd1ebeffdb6063554b609614`, PDF `8d468835bf93f7fb72db02e22c5f34ac638b07e3e0dd54306b0c52261ebe53a1`.

Conditional shared-employee group WOTC 2,400 splits 1,200 each; C/F profits 35,201/55,201, SE 943/7,799 and half-SE 472/3,900 are unchanged. All 24 monthly premium/owner/policy/payment joins were checked; health deductions are 12,000/9,600. Total adjustments 25,972 yield MAGI 294,431. Under [Schedule 1-A](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf), primary net tip capacity 35,201−472−12,000=22,729 limits reported tips 40,000 before the 25,000 cap; MAGI is below the joint phaseout threshold. Deduction 22,729 leaves primary QBI zero; spouse QBI 41,701 gives deduction 8,340 with nonbinding income limit 48,040. Taxable income 231,862 produces regular tax 41,341 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf). AMTI 263,362/exemption 137,000 gives TMT 32,854/AMT zero. Specified-credit limit 37,256 allows 2,400. Other tax 9,313 yields total tax 48,254/refund 71,746 against withholding 120,000. Source assertions do not authenticate policies, payments, eligibility, certification, payroll or qualified tips.

Exact reused C/F pages 10/12 repeat profitable loss-only marks and custom-work 1,001 on Schedule F line 8 instead of 7. Primary SE page 14 repeats skipped 8d/9/10 with 8c blank. Joint Forms 3800/6251/8995 pages 18/29/32 omit Sam. Form 3800 page 19 fills skipped 18/19 each 24,641 and 20/21 each 16,700 without empowerment/renewal credit; native omits those fields. This is the twenty-fifth qualified observation of the existing future-only issue. Existing future notes extended without implementation or new items. No clean approval, checker, aggregate addition, authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently reverified unchanged; full regression PID 31254 independently confirmed live with Form 4952 tests progressing.

### Mixed C/F phase-in WOTC packet: preliminary calculations and 3/35 pages

Started the existing `mixed-cf-tip-phase-wotc` review. Private `mixed-cf-tip-phase-wotc-preliminary-source-math-review.json` retains 181 source-difference entries, baseline observation hash and three source/XML/PDF hashes. Systematic full→phase/below→phase reference changes and remaining numeric differences were examined; current W-2 was read. Two oversized outputs were truncated, so complete source or pending review is not claimed. Selected native Schedule 1-A, Form 5884, both Forms 7206 and Form 8995-A leaves/attributes were read. All 35 page images were rendered; only pages 2/34/35 have direct observations so far. Their notes/image hashes are retained separately in `mixed-cf-tip-phase-wotc-three-page-partial-observation.json`.

Conditional group credit 2,400 allocates 1,371/1,029 from wage proportions 4,000.49/3,000.52. Filed rounded receipts minus filed reduced wages give profits 177,372/188,029; raw subtraction is not substituted for those filed lines. Owner SE 7,986/26,568, half-SE 3,993/13,284 and health 6,000/9,600 yield AGI 482,524. Tip deduction is 25,000−18,200=6,800. QBI amounts 160,579/165,145 and wage bases 2,629/1,972 yield components 16,831/17,128 under the [2025 Form 8995-A](https://www.irs.gov/pub/irs-prior/f8995a--2025.pdf) phase-in: income before QBI 444,224, threshold 394,600, fraction 0.49624. Deduction 33,959 is below income limit 88,845. Taxable 410,265/regular tax 85,411/TMT 80,552/AMT zero, credit 2,400 and other tax 36,691 give tax 119,702/amount owed 59,702 against withholding 60,000. These match the three observed pages. Remaining 32 pages, complete native review and further source joins are pending.

Form 8995-A page 34 omits Sam from its name(s)-on-return header; the existing future-only joint-name note is extended without implementation/new items. No whole-packet approval, checker, aggregate addition, authenticated source, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; approved aggregate unchanged. Full regression PID 31254 remains independently confirmed live.

### Mixed C/F phase-in packet: all 35 pages observed, approval withheld

Finished actual-page observation for `mixed-cf-tip-phase-wotc`: 22 direct views and 13 independently hash-verified exact matches to retained qualified observations. An additional 200-dpi Form 6251 page 29 view confirms legible exemption 137,000; no amount defect is inferred from the low-resolution ambiguity. Private `mixed-cf-tip-phase-wotc-thirtyfive-page-independent-observation.json` retains 39 source/XML/PDF/image hashes, per-page notes, reuse provenance and prior arithmetic. Every current native leaf/attribute was read. All 24 health premium month/owner/issuer/policy/payment joins were checked; synthetic references remain unauthenticated. Source/selected-pending scope remains qualified as in the preliminary audit, with no claim that the truncated outputs prove a complete raw read.

All observed pages reconcile the retained conditional calculation: credit allocation 1,371/1,029, profits 177,372/188,029, SE 7,986/26,568, owner health 6,000/9,600, tips 6,800 and QBI deduction 33,959. Form 5884 group continuation page 28 shows both EINs, rounded qualified wages 3,428/2,572 and credit shares. The 20 native documents reference that statement and deduction differentiation through IDs18/19; Schedule 3 references IRS38009. AMTI 441,765/exemption 137,000/TMT 80,552 leaves AMT zero; specified-credit limit 70,308 permits 2,400. Additional Medicare 2,137/NIIT zero agree with tax 119,702 and amount owed 59,702.

Pages 10/12 repeat profitable loss-only marks; page 12/native place custom work 1,001 on Schedule F line 8 instead of 7. Primary Schedule SE page 14 is below the wage maximum, so its populated wage/SS rows are applicable. Joint Forms 3800/6251/8995-A pages 18/29/34 omit Sam. Form 3800 page 19 fills skipped 18/19 each 60,414 and 20/21 each 24,997 without empowerment/renewal credit, while native omits those fields: twenty-sixth qualified observation of the existing future issue. Existing future notes extended only; no future implementation/new items. No clean approval, checker, aggregate addition, authenticity, BR/ATS proof or main checkoff. Main52 frozen/future27 unworked; approved aggregate unchanged. Runtime hashes remain unchanged and full regression PID31254 is independently confirmed live.

### Mixed C/F above-range WOTC packet: all 33 pages observed

Completed the actual-page observation for existing `mixed-cf-tip-above-zero-wotc`: 23 direct views and 10 verified exact image matches, plus a 200-dpi Form 6251 page27 view confirming legible exemption137,000. Private `mixed-cf-tip-above-zero-wotc-thirtythree-page-independent-observation.json` retains 37 verified artifact/image hashes, all page notes/reuse provenance and independent arithmetic. Every native leaf/attribute was read. Source review covers both external W-2s, representative employee records, common-control assertions, selected differences and 320 programmatically checked WOTC-to-employee-W2 joins for 160 unique shared employees. Complete raw source or pending review is not claimed; the first large difference output was truncated. Synthetic direct-employer references repeat (160 unique among320 records), without authentic external proof.

Each shared worker has supplied6,000 wages/400hours at each business. Group capped wages960,000 determine credit384,000, allocated192,000 per owner; wage deduction768,000 gives filed C/F profit432,001 each. SE11,570/21,006, half-SE5,785/10,503 and owner health6,000/9,600 yield AGI1,232,115. Tip deduction fully phases out, so Schedule1-A is absent. QBI420,216/411,898 gives components84,043/82,380 and deduction166,423; wage limits384,000 per business and income limit240,123 are nonbinding. Form8995-A PartIII is appropriately blank above the phase-in range. Taxable1,034,192 gives regular tax306,714 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf): 37% less75,937.50. AMTI1,065,692/exemption137,000/TMT255,252 leaves AMTzero. Specified-credit limit236,285 caps determined384,000; unused147,715 is not proof of a durable carryforward. SE32,576 plus AdditionalMedicare8,531 yields other tax41,107 and total tax111,536. Medicare withholding6,700 less regular5,800 supplies additional900; withholding120,900/refund9,364 reconcile.

Pages8/10 repeat profitable loss-only32a/36a marks and custom-work1,001 on ScheduleF line8 instead of7. PrimarySE page12 prints skipped8d/9–10 with8cblank. Joint Forms3800/6251/8995-A pages16/27/32 omit Sam. Form3800 page17 prints skipped18/19 each191,439 and20/21 each115,275 without empowerment/renewal credit; native omits them: twenty-seventh qualified observation of the existing future issue. Group statement page26 correctly lists both EINs/wages480,000/credit192,000 each; native references documents18/19 and Schedule3 references IRS38008. Existing future notes extended only; no future implementation/new items, clean approval, checker, aggregate addition, authenticity, BR/ATS proof or main checkoff. Main52 frozen/future27 unworked; approved aggregate unchanged. All2,590 runtime hashes independently reverified unchanged; full regression PID31254 independently confirmed live.

### Prepared-review inventory reconciliation and next farm-loss packet

Private `prepared-review-inventory-reconciliation-20261007T1550.json` independently verifies all1,083 source/XML/PDF hashes in the361-case/4,714-page preparation manifest and all75 manifests in the retained267-case/2,706-page bounded aggregate; membership is disjoint. This is an inventory/provenance audit, not renewed terminal-log review or clean parity approval. Named single-fixture observation indexing locates49 prepared fixture IDs. Forty-nine packets/1,223pages have neither indexed observation membership nor bounded-batch membership; differing or multi-fixture review structures can be missed, so absence from this index is not proof of no review. The audit preserves per-case membership and pointers for continuing the existing validation requirement. Approved aggregates remain unchanged.

A follow-up execution-document/private-JSON search for `owned-two-farm-wotc-phase-loss`, `owned-two-farm-health-full` and `owned-controlled-farm-wotc-below` found planning/preflight/prior mechanical parity entries but no detailed named current review. Started the first case: all29page images rendered; only2/8/10 directly observed. Private `owned-two-farm-wotc-phase-loss-three-page-partial-observation.json` retains6 source/XML/PDF/image hashes checked against the preparation manifest and page notes. Selected source/pending data and both native ScheduleF leaves were read; fullsource/native/pending, independentreturnmath and remaining26pages are pending.

Actual primaryFarm page8/native gross20,001 minus feed26,402 and reducedwages3,600 gives loss10,001; spouseFarm page10/native gross200,001 minus reducedwages3,600 gives profit196,401. Both supplied NECs describe secondarycustomwork1,000.50 but both copies put1,001 on line8 with7blank; profitable spousecopy also marks loss-only36a. The negative primarycopy appropriately uses the loss question. Existing future classification/profitable-checkbox notes extended only, without implementation or new items. Form1040 page2 agrees with selectedpending tax113,577/amountowed52,677, but independent tax proof is pending. No wholepacket approval/checker/aggregate/authenticity/BR/ATS/maincheckoff. Main52 frozen/future27 unworked; full regression PID31254 remains independently confirmed live.

### Independent two-farm WOTC phase-loss packet: all29pages observed

Completed the existing `owned-two-farm-wotc-phase-loss` observation: all source/filer facts and every native leaf/attribute read, selected pending computations;20 direct views+9 independently verified exact image matches cover all29pages. A200-dpi Form6251 page24 view confirms legible exemption137,000. Private `owned-two-farm-wotc-phase-loss-twentynine-page-independent-observation.json` retains33 artifact/image hashes, page notes/reuse provenance and independent arithmetic. Prior3-page partial audit remains retained. Both employee W2/SSN/employer/payroll/SWA joins were checked; independent-employer spouse-attribution exception assertions and post-at-risk/passive review remain synthetic, not authenticated external proof.

Separate capped wages6,000 per employer determine2,400 credit each; reduced wages3,600. Primary filedgross20,001 less feed26,402/wages3,600 gives loss10,001; spousegross200,001 less3,600 gives profit196,401. Only Sam emits ScheduleSE: earnings181,376/SS21,836/Medicare5,260/SE27,096/half13,548. AGI472,852. [Form8995-A instructions](https://www.irs.gov/instructions/i8995a) require ScheduleC loss netting: spouseQBI182,853 less primaryloss10,001 gives172,852; primary adjustedQBI/wages zero, no netcarryforward. IncomebeforeQBI441,352/threshold394,600/range100,000 gives phase46.752%; component34,570 less reduction15,321 yields deduction19,249, below income limit88,270. Taxable422,103/regular89,199/AMTI453,603/TMT83,867 leaves AMTzero; specifiedlimit73,149 allows all4,800. AdditionalMedicare2,082/NIITzero gives othertax29,178, totaltax113,577; withholding60,900 (including additionalMedicare900) yields amountowed52,677. Conditional amounts/native references match observedpages; source authenticity and broader loss-limit eligibility remain unproved.

Both custom-work classifications remain on ScheduleF line8 rather than7. Profitable spousepage10 unnecessarilymarks36a; primarynegativepage8 appropriatelyuses thelossquestion. Form6251 page24 omits Sam; Forms3800/5884/8995-A/ScheduleC correctlyprint bothnames. Form3800 page15 prints skipped18/19 each62,900 and20/21 each26,299 without empowerment/renewalcredit, while nativeomits them: twenty-eighth qualified observation. Existing future notes extended only;no futureimplementation/newitems, cleanapproval/checker/aggregateaddition/authenticity/BR/ATS/maincheckoff. Main52frozen/future27unworked;approvedaggregate unchanged. All2,590runtimehashes independentlyreverified unchanged;fullregression PID31254 independentlyconfirmedlive.


### Independent two-farm full-health packet: all 31 pages observed

Completed the existing `owned-two-farm-health-full` observation: all source/filer facts and every native leaf/attribute read; selected pending computations. Eighteen direct views and thirteen independently verified exact retained observed images cover all 31 pages. Private `owned-two-farm-health-full-thirtyone-page-independent-observation.json` retains 34 verified source/XML/PDF/image hashes, page notes, reuse provenance, 24 monthly premium joins, two worker joins and independent conditional arithmetic. Reuse associations were checked against both prior audit hashes and actual bytes. Synthetic references do not authenticate insurer, ownership, employer eligibility, payroll or certifications. An initial audit helper incorrectly applied Medicare multiplication before settling each owner’s Schedule SE earnings; corrected to the filed earnings before successful verification. No production change or rounding-defect claim follows from that helper correction.

Separate employers cap qualified wages at 6,000 each, determine WOTC 2,400 each and reduce each wage deduction to 3,600. Owner profits 36,401/56,401 give filed SE earnings 33,616/52,086, SE taxes 975/7,969 and separately rounded half-SE deductions 488/3,985. Raw premiums 6,000.48/9,600.48 settle to owner deductions 6,000/9,600, below capacities 35,913/52,416. Schedule 1 sums half-SE 4,473 plus health 15,600 to adjustments 20,073; raw wages 230,000.86 give AGI 302,730. QBI 29,913/42,816 gives deduction 14,546, below income limit 54,246. Taxable 256,684 produces regular tax 47,298 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 24% less 14,306. AMTI 288,184 less exemption 137,000 gives TMT 39,308/AMT zero. Specified credit limit 41,723 allows all 4,800. Additional Medicare 591 and SE 8,944 give other tax 9,535, total tax 52,033 and refund 67,967 against withholding 120,000. No Schedule 1-A, PTC or health carryover is asserted. Native references connect Schedule 3 to IRS38008 and the credit to IRS58849.

Schedule F pages 8/10 repeat custom work 1,001 on line 8 rather than 7 and profitable loss-only 36a marks. Primary SE page 12 fills skipped 8d/9/10, with 8c blank. Form 6251 page 26 omits Sam from the joint header; Forms 3800/5884/8995 correctly print both names. Form 3800 page 17 fills skipped 18/19 each 29,481 and 20/21 each 17,817 without empowerment/renewal credit, while native omits them: twenty-ninth qualified observation of the existing future issue. These extend existing future notes only. No future implementation, new item, clean approval, aggregate addition, source authentication, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live.


### Independent two-farm income-limited health packet: all 30 pages observed

Completed the existing `owned-two-farm-health-income-limited` observation: 202 current source/filer differences from the fully read full-health baseline reviewed through 26 losslessly grouped entries; all other input/filer facts identical. Every current native leaf/attribute read; selected pending computations only. Nine direct views and 21 independently verified exact retained observed images cover all 30 pages. Private `owned-two-farm-health-income-limited-thirty-page-independent-observation.json` retains 33 verified source/XML/PDF/image hashes, page notes, prior-audit/byte associations, 24 monthly premium joins, two worker joins and conditional independent arithmetic. The first oversized raw-diff output was truncated; the subsequent complete grouped review accounted for all 202 differences. Synthetic source/eligibility assertions remain unauthenticated.

Farm/WOTC/SE facts are unchanged: profits 36,401/56,401, SE 975/7,969 and separately rounded half-SE 488/3,985. Raw monthly premiums 5,000.49/6,000.49 total 60,005.88/72,005.88, settling to filed premiums 60,006/72,006. Both exceed owner income capacities 35,913/52,416, so health deductions total 88,329. Half-SE 4,473 plus health 88,329 exactly offsets farm income 92,802; AGI equals wage total 230,000.86, filed 230,001. Both adjusted QBI rows are zero and no QBI deduction/carryforward remains. Taxable 198,501 gives regular tax 33,498 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 22% less 10,172. AMTI 230,001/exemption 137,000/TMT 24,180 leaves AMT zero. Specified credit limit 31,373 allows all 4,800. Additional Medicare 591 plus SE 8,944 gives other tax 9,535, total tax 38,233 and refund 81,767 against withholding 120,000. Form 8960 is absent at MAGI below the joint threshold. Schedule 3 references IRS38008, credit references IRS58849; native return contains 17 documents.

Exact Schedule F pages 8/10 repeat the custom-work classification and profitable loss-only checkbox findings. Exact primary SE page 12 repeats skipped intermediates. Form 6251 page 26 omits Sam; Forms 3800/5884/8995 correctly print both names. Form 3800 page 17 fills skipped 18/19 each 18,135 and 20/21 each 15,363 without empowerment/renewal credit, while native omits them: thirtieth qualified observation. Existing future notes extended only; no future implementation, new item, clean approval, aggregate addition, authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live.


### Independent two-farm excluded-month health packet: all 31 pages observed

Completed the existing `owned-two-farm-health-excluded-months` observation: all 161 current source/filer differences from the fully read full-health baseline reviewed through 24 losslessly grouped entries; other input/filer facts identical. Every current native leaf/attribute read; selected pending computations only. Ten direct views plus 21 independently verified exact retained observed images cover all 31 pages. Private `owned-two-farm-health-excluded-months-thirtyone-page-independent-observation.json` retains 34 verified source/XML/PDF/image hashes, page notes, reuse associations, 24 monthly premium joins, two worker joins and independent conditional arithmetic. Issuer, employer eligibility, ownership, payroll and certification references remain synthetic and unauthenticated.

The source excludes January–March for Alex and January–April for Sam because of subsidized-employer-plan eligibility. Remaining nine/eight paid months total 4,500.36/6,400.32; owner Forms 7206 settle to 4,500/6,400, below capacities 35,913/52,416. Unchanged farm profits 36,401/56,401, SE 975/7,969 and half-SE 488/3,985 produce adjustments 15,373 and AGI 307,430. QBI rows 31,413/46,016 give deduction 15,486, below income limit 55,186. Taxable 260,444 yields regular tax 48,201 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 24% less 14,306. AMTI 291,944/exemption 137,000/TMT 40,285 leaves AMT zero. Specified-credit limit 42,401 permits all 4,800. Additional Medicare 591 and SE 8,944 give other tax 9,535; NIIT is zero at MAGI 307,430. Total tax 52,936 and refund 67,064 reconcile against withholding 120,000. Schedule 3 references IRS38008 and credit references IRS58849; native return contains 18 documents.

Exact Schedule F pages 8/10 repeat custom-work classification and profitable loss-only marks; exact primary SE page 12 repeats skipped fields. Form 6251 page 26 omits Sam; Forms 3800/5884/8995 correctly print both names. Form 3800 page 17 fills skipped 18/19 each 30,214 and 20/21 each 17,987 without empowerment/renewal credit, while native omits them: thirty-first qualified observation. Existing future notes extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live.


### Independent two-farm all-months-excluded health packet: all 31 pages observed

Completed the existing `owned-two-farm-health-excluded-all` observation: all 178 source/filer differences from the fully read full-health baseline reviewed through 24 losslessly grouped entries; other input/filer facts identical. Every current native leaf/attribute read; selected pending computations only. Ten direct views and 21 independently verified exact retained observed images cover all 31 pages. Private `owned-two-farm-health-excluded-all-thirtyone-page-independent-observation.json` retains 34 verified source/XML/PDF/image hashes, page notes, prior-audit/byte associations, 24 monthly premium joins, two worker joins and independent conditional arithmetic. Synthetic issuer, payment, employer eligibility, ownership, payroll and certification references remain unauthenticated.

All 12 months for each owner assert subsidized-employer-plan eligibility. Paid premiums still total 6,000.48/9,600.48, but eligible premiums and both Form 7206 deductions are zero. Unchanged farm profits 36,401/56,401, SE 975/7,969 and separately rounded half-SE 488/3,985 produce adjustments 4,473 and AGI 318,330. QBI rows 35,913/52,416 give deduction 17,666 below income limit 57,366. Taxable 269,164 produces regular tax 50,293 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 24% less 14,306. AMTI 300,664/exemption 137,000/TMT 42,553 leaves AMT zero. Specified-credit limit 43,970 allows all 4,800. Additional Medicare 591 plus SE 8,944 gives other tax 9,535; NIIT zero at MAGI 318,330. Total tax 55,028/refund 64,972 reconcile against withholding 120,000. Both zero-deduction Form 7206 copies remain present. Schedule 3 references IRS38008 and credit references IRS58849; native return contains 18 documents.

Exact Schedule F pages 8/10 repeat custom-work classification and profitable loss-only marks; exact primary SE page 12 repeats skipped fields. Form 6251 page 26 omits Sam; Forms 3800/5884/8995 correctly print both names. Form 3800 page 17 fills skipped 18/19 each 31,915 and 20/21 each 18,378 without empowerment/renewal credit, while native omits them: thirty-second qualified observation. Existing future notes extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live.


### Independent two-farm phase-in health packet: all 32 pages observed

Completed the existing `owned-two-farm-health-phase` observation: all 172 source/filer differences from the fully read full-health baseline reviewed through 40 losslessly grouped entries; other input/filer facts identical. Every current native leaf/attribute read; selected pending computations only. Nineteen direct views and 13 independently verified exact retained observed images cover all 32 pages. Private `owned-two-farm-health-phase-thirtytwo-page-independent-observation.json` retains 35 verified source/XML/PDF/image hashes, page notes, reuse associations, 24 monthly premium joins, two worker joins and independent conditional arithmetic. Synthetic issuer, employer eligibility, independent-employer attribution, farm ownership, payroll and certification records remain unauthenticated.

Separate employer wage caps and credits remain 6,000/2,400 each, leaving filed wage deductions 3,600. Agriculture 179,000/189,000 plus custom receipts 1,001 gives farm profits 176,401/186,401. Only Alex has external W-2 wages 150,000.37; Sam has none. Filed SE earnings 162,906/172,141, Social Security 3,236/21,345 and Medicare 4,724/4,992 yield SE 7,960/26,337 and half-SE 3,980/13,169. Full health deductions 6,000/9,600 remain below capacities 172,421/173,232. Adjustments 32,749 give AGI 480,053. QBI 166,421/163,632 gives 20% amounts 33,284/32,726; wage limits are 1,800 each. [Form 8995-A](https://www.irs.gov/pub/irs-prior/f8995a--2025.pdf) phase-in income 448,553 less threshold 394,600 gives 53,953/100,000 = 53.953%. Separate reductions 16,987/16,686 leave components 16,297/16,040 and deduction 32,337, below income limit 89,711.

Taxable 416,216 yields regular tax 87,315 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 32% less 45,874. AMTI 447,716 less exemption 137,000 gives excess 310,716; 28% less 4,782 gives TMT 82,218/AMT zero. Specified-credit limit 71,736 allows all 4,800. Additional Medicare 2,115 plus SE 34,297 gives other tax 36,412; NIIT zero at MAGI 480,053. Total tax 118,927/amount owed 58,927 reconcile against withholding 60,000. Native return contains 17 documents; Schedule 3 references IRS38008 and credit references IRS58849.

Schedule F pages 8/10 repeat custom-work classification and profitable loss-only marks. Primary SE page 12 has wages below the maximum, so its SS calculation is applicable; no skipped-wage-max finding is asserted. Form 6251 page 26 omits Sam; Forms 3800/5884/8995-A correctly print both names. Form 3800 page 17 fills skipped 18/19 each 61,664 and 20/21 each 25,651 without empowerment/renewal credit, while native omits them: thirty-third qualified observation. Existing future notes extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live.


### Independent above-range farm-health and limited-credit packet: partial observation

Started the existing `owned-two-farm-health-above-limited-credit` packet: all 32 page images rendered; only pages 2/17/31/32 directly observed. Private `owned-two-farm-health-above-limited-credit-four-page-partial-observation.json` retains seven source/XML/PDF/image hashes checked against preparation provenance and conditional selected arithmetic. Selected source/pending and all leaves of native Forms 1040/3800/8995-A were read. The source replaces two worker rows with 160 WOTC rows and one employee record per farm with 80 each; full source/worker joins, health-plan deltas, remaining native documents and 28 pages remain pending. No complete-source or whole-packet review is claimed.

Actual Form 8995-A pages 31/32 show QBI 301,823/293,505, 20% components 60,365/58,701 and deduction 119,066; wages 288,000 per owner give nonbinding limits 144,000 each. Part III is appropriately blank above the phase-in range. Income before QBI 963,829 gives income limit 192,766. Selected taxable income 844,762.86 gives regular tax 236,625 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 37% less 75,937.50. Form 3800 page 17 determines 384,000 and allows 183,719, equal to regular tax less quarter-excess 52,906. Unused 200,281 is not proof of a durable carryforward. Selected other tax 32,684 gives tax 85,590/refund 35,310 against withholding 120,900; actual Form 1040 page 2 agrees. Complete independent source-to-return arithmetic remains pending.

Form 3800 page 17 fills skipped 18/19 each 151,659 and 20/21 each 84,966 without empowerment/renewal credit; native omits them. This extends only the existing future presentation row, now 34 qualified observations, with an explicit partial-review limit. No future implementation, new item, clean approval, checker, aggregate addition, external authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live.


### Independent above-range farm-health packet: all 32 pages observed

Completed the existing `owned-two-farm-health-above-limited-credit` observation. Current source facts were read using the fully reviewed phase baseline, 23 remaining scalar differences, both full external W-2 rows, both WOTC/employee templates and losslessly verified indexed fields for all 80 workers per owner, and exact health-policy identifier substitutions. Filer and review focus are identical. All current native documents were read across the retained partial and this continuation; selected pending computations only. Twenty-two direct observations (including the four retained partial observations) and ten independently verified exact previously observed images cover all 32 pages. Private `owned-two-farm-health-above-limited-credit-thirtytwo-page-independent-observation.json` retains 35 source/XML/PDF/image hashes, prior-audit associations, page notes, 160 distinct worker joins, 24 premium joins and independent conditional arithmetic. The earlier partial audit remains immutable.

Each independent farm has 80 distinct workers with wages 6,000, 400 hours and credit 2,400: credit 192,000 per farm, total 384,000. Raw wage deductions 480,000 less credits 192,000 leave 288,000 per farm. Agriculture 599,000 plus custom receipts 1,001 gives gross 600,001 and profit 312,001 each. External wages 300,000.37/100,000.49 total 400,000.86. SE earnings 288,132.9235 per owner file as 288,133; SS tax 0/9,436 plus Medicare 8,356 each gives SE 8,356/17,792 and half-SE 4,178/8,896. Health premiums 6,000.48/9,600.48 give deductions 6,000/9,600 below capacities 307,823/303,105. Adjustments 28,674 give AGI 995,329. QBI 301,823/293,505 gives components 60,365/58,701 and deduction 119,066; wage limits 144,000 each are nonbinding and Part III is blank above the phase-in range. Income limit is 192,766.

Taxable income 844,762.86 files as 844,763 and produces regular tax 236,625 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 37% less 75,937.50. AMTI 876,263 less exemption 137,000 gives excess 739,263; 28% less 4,782 gives TMT 202,212/AMT zero. Quarter-excess 52,906 gives specified-credit limit 183,719, which limits credit determined 384,000; unused 200,281 is not durable carryforward proof. Additional Medicare wage tax 1,350 plus SE tax 5,186 gives 6,536; total other tax 32,684. NIIT zero at MAGI 995,329. Tax 85,590 and refund 35,310 reconcile against W-2 withholding 120,000 plus Additional Medicare withholding 900. Native return contains 18 documents; Schedule 3 references IRS38008 and credit references IRS58849.

Actual pages 8/10 repeat profitable Schedule F loss-only marks and custom-work classification. Primary SE page 12 repeats wage-maximum skipped-field presentation. Form 6251 page 26 omits Sam; Forms 3800/5884/8995-A print both names. Initial concern about Form 6251 line 1a was withdrawn after checking the [2025 IRS form](https://www.irs.gov/pub/irs-pdf/f6251.pdf): line 1a correctly contains Form 1040 deductions 150,566 (31,500 plus 119,066), giving line 1b 844,763. No new future item arises from that valid line. Form 3800 skipped-line finding was already counted in the partial observation, so qualified observations remain 34. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live at elapsed 47:04.


### Independent two-farm loss-owner health packet: all 30 pages observed

Completed the existing `owned-two-farm-health-loss-owner` observation. All 197 source/filer differences from the fully read full-health baseline were reviewed through 65 losslessly grouped entries; other input/filer facts identical. Every current native document was read; selected pending computations only. Eleven direct observations and 19 independently verified exact retained observed images cover all 30 pages. Private `owned-two-farm-health-loss-owner-thirty-page-independent-observation.json` retains 33 source/XML/PDF/image hashes, page notes, prior-audit associations, 24 monthly premium joins, two worker joins and independent conditional arithmetic. Synthetic source, ownership, payroll, certification, health payment and eligibility facts remain unauthenticated.

Worker wages 6,000.49 per farm retain separately capped credit 2,400 and wage deduction 3,600. Primary agriculture 19,000 plus custom receipts 1,000.50 gives filed gross 20,001; feed 26,401.50 plus wages gives expenses 30,002 and loss 10,001. Spouse agriculture 199,000 plus custom receipts gives gross 200,001 and profit 196,401. Net farm income 186,400 joins Schedule 1. Only Alex has external wages 300,000.37; no positive primary SE copy is emitted. Sam’s SE earnings 181,376.3235 file as 181,376; SS 21,836 plus Medicare 5,260 gives SE 27,096 and half-SE 13,548. Primary premiums 6,000.48 have zero positive-business capacity/deduction; spouse premiums 9,600.48 give deduction 9,600 below capacity 182,853. Only Sam’s Form 7206 is emitted. Adjustments 23,148 produce AGI 463,252.

QBI before loss netting is −10,001/173,253. Form 8995-A Schedule C allocates the entire loss against the spouse’s positive QBI, leaving 0/163,252 and no loss carryforward. Primary W-2 wages/UBIA are zero in the QBI loss row; spouse wage limit is 1,800. Twenty percent 32,650 less phase reduction 11,461 gives deduction 21,189. Phase-in income 431,752 less threshold 394,600 gives 37,152/100,000 = 37.152%; income limit 86,350 is nonbinding. Taxable income 410,563.37 produces regular tax 85,506 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 32% less 45,874. AMTI 442,063/exemption 137,000/excess 305,063 gives TMT 80,636 and AMT zero. Specified-credit limit 70,379 permits all 4,800. Additional Medicare wage tax 450 plus SE tax 1,632 gives 2,082; other tax 29,178. NIIT zero at MAGI 463,252. Total tax 109,884 and amount owed 48,984 reconcile against withholding 60,900 (W-2 60,000 plus Additional Medicare 900). Native return contains 16 documents; Schedule 3 references IRS38007 and credit references IRS58848.

Exact Schedule F pages 8/10 repeat custom-work classification; spouse page 10 also repeats the profitable loss-only mark. Primary negative page 8 has the appropriate loss mark. Form 6251 page 24 omits Sam; Forms 3800/5884/8995-A and Schedule C print both names. No primary positive SE copy or skipped-wage-max finding is claimed. Form 3800 page 15 fills skipped lines 18/19 each 60,477 and 20/21 each 25,029 without empowerment/renewal credit; native omits them: thirty-fifth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, BR/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live at elapsed 49:47.


### Controlled two-farm below-range WOTC packet: all 30 pages observed

Completed the existing `owned-controlled-farm-wotc-below` observation. All current WOTC inputs were directly read; the rest of source/filer was compared to the fully read full-health baseline with 13 scalar differences and the absent health section; other facts identical. Every native document was read, including both controlled-group/allocation statements; selected pending computations only. Eighteen direct observations and 12 independently verified exact retained observed images cover all 30 pages. Private `owned-controlled-farm-wotc-below-thirty-page-independent-observation.json` retains 33 source/XML/PDF/image hashes, page notes, prior-audit associations, two employer-specific joins for one distinct shared worker, group-owner joins and independent conditional arithmetic. Synthetic common-control, reciprocal management, spousal attribution, farm ownership, SWA certification, payroll, issuer and SSA facts remain unauthenticated.

Both employer rows assert the same worker reference/SSN and group first workday, with distinct employer-specific certification/payroll/W-2/SSA sources. Raw wages 6,000.49 per farm total 12,000.98; the group cap applies once at 6,000, giving credit 2,400 at 40%. Equal raw wages allocate capped wages 3,000 and credit 1,200 per member. Both members are filed proprietors and their allocated credits sum to filed Form 5884 line 2 of 2,400. Filed wage deductions become 4,800 each; source QBI wages retain raw 4,800.49. Farm gross 40,001/60,001 less filed wages gives profits 35,201/55,201 and total 90,402. Actual allocation statement page 26 and native member-share/explanation statements agree; Form 5884 line 2 has the attached-statement mark and both native references.

External wages 230,000.86 plus farm income give total 320,402.86. SE earnings 32,508.1235/50,978.1235 file as 32,508/50,978; SS tax 0/6,321 plus Medicare 943/1,478 gives SE 943/7,799. Separate half-SE rounding 472/3,900 gives adjustments 4,372 and AGI 316,031. No health deduction is entered. QBI 34,729/51,301 sums to 86,030 and gives deduction 17,206 below income limit 56,906. Taxable income 267,324.86 files as 267,325; regular tax 49,852 under the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 24% less 14,306. AMTI 298,825 less exemption 137,000 gives excess 161,825; 26% gives TMT 42,075/AMT zero. Specified-credit limit 43,639 permits all 2,400. Additional Medicare uses SE 83,486 less remaining threshold 19,999, giving 571; other tax 9,313. NIIT zero at MAGI 316,031. Tax 56,765/refund 63,235 reconcile against withholding 120,000. Native return contains 18 documents; Schedule 3 references IRS38008, credit references IRS58849 and Form 5884 references both allocation statements.

Schedule F pages 8/10 repeat custom-work classification and profitable loss-only marks. Primary SE page 12 repeats skipped wage-maximum fields. Form 6251 page 27 omits Sam; Forms 3800/5884/8995 print both names. Form 3800 page 17 fills skipped 18/19 each 31,556 and 20/21 each 18,296 without empowerment/renewal credit; native omits them: thirty-sixth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live this continuation.


### Controlled mixed service/farm below-range WOTC packet: all 30 pages observed

Completed the existing `owned-controlled-mixed-cf-wotc-below` observation. Full Schedule C and NEC/G inputs were directly read; general/W-2/filer/spouse farm are exact unchanged matches to the fully reviewed controlled-farm baseline. Six WOTC scalar differences were read, with other WOTC facts identical. All 56 native leaf/attribute differences were read; remaining native facts match the reviewed baseline. Selected pending owner SE computations only. Five direct observations and 25 independently verified exact retained observed images cover all 30 pages. Private `owned-controlled-mixed-cf-wotc-below-thirty-page-independent-observation.json` retains 33 source/XML/PDF/image hashes, page notes, reuse associations, two employer-specific joins for one shared worker, group-owner and NEC recipient/business joins, and independent conditional arithmetic. Synthetic service/farm ownership, common-control, payroll, certification, issuer and SSA references remain unauthenticated.

Primary service NEC 40,000.50 joins Alex’s Schedule C machine-maintenance business, EIN 123456791/activity 811310; spouse agricultural program 59,000 and custom receipts 1,000.50 retain the spouse farm EIN 123456792. The same worker/reference/SSN is employed by both group members with distinct certification, payroll, W-2 and SSA records. Group wages 12,000.98 are capped once at 6,000 and credit 2,400, allocated equally at 1,200 per member; filed wage deductions 4,800 each yield C profit 35,201/F profit 55,201. Schedule 1 lines 3/6 and primary Schedule SE nonfarm/farm fields correctly change while return totals remain unchanged. Actual statement page 26 and native allocation/explanation statements agree on businesses, EINs, wages 3,000 and credits 1,200 each. Form 5884 retains its attached mark and both native statement references.

Independent arithmetic again gives SE earnings 32,508.1235/50,978.1235 (filed 32,508/50,978), SS 0/6,321, Medicare 943/1,478, SE 943/7,799 and separately rounded half-SE 472/3,900. Wages 230,000.86 and net business income 90,402 less adjustments 4,372 give AGI 316,031. QBI 34,729/51,301 gives deduction 17,206 below income limit 56,906. Taxable 267,324.86 yields regular tax 49,852 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 24% less 14,306. AMTI 298,825/exemption 137,000/TMT 42,075 gives AMT zero. Specified-credit limit 43,639 permits 2,400. Additional Medicare 571 and SE 8,742 give other tax 9,313; NIIT zero at MAGI 316,031. Tax 56,765/refund 63,235 reconcile against withholding 120,000. Native return contains 18 documents; Schedule 3 and credit references remain IRS38008/IRS58849, with both Form 5884 allocation statements referenced.

Actual primary Schedule C page 8 repeats profitable loss-only 32a; exact spouse Schedule F page 10 repeats profitable loss-only 36a and custom-work classification. Primary SE page 12 repeats wage-maximum skipped fields. Exact Form 6251 page 27 omits Sam; Forms 3800/5884/8995 print both names. Exact Form 3800 page 17 repeats skipped lines 18/19 each 31,556 and 20/21 each 18,296 without empowerment/renewal credit, omitted by native: thirty-seventh qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live at elapsed 55:06.


### Controlled mixed service/farm phase-in WOTC packet: all 31 pages observed

Completed the existing `owned-controlled-mixed-cf-wotc-phase` observation. All 24 source/filer differences from the fully read mixed-below baseline were read, including the complete replacement W-2 list; other facts identical. Every current native document was read, including both allocation statements; selected pending owner SE/AMT computations only. Eleven direct observations and 20 independently verified exact retained observed images cover all 31 pages. Private `owned-controlled-mixed-cf-wotc-phase-thirtyone-page-independent-observation.json` retains 34 source/XML/PDF/image hashes, page notes, reuse associations, two employer-specific worker joins, group-owner and service NEC joins, and independent conditional arithmetic. Synthetic common-control, reciprocal management, ownership, payroll, certification and issuer records remain unauthenticated.

Shared-worker wages 4,000.49/3,000.52 total 7,001.01. Group cap 6,000 gives credit 2,400. Proportional capped wage shares 3,428.496745469582…/2,571.503254530418… file as 3,428/2,572; credit shares independently round to 1,371/1,029 and sum to 2,400. Full reductions leave raw wage deductions 2,629.49/1,971.52, filed 2,629/1,972. Primary service NEC gross 180,000.50 files as 180,001, giving C profit 177,372; spouse agriculture 189,000 plus custom 1,000.50 gives farm gross 190,001/profit 188,029. Both native allocation statements and actual statement page 26 agree with member names/EINs and filed shares; Form 5884 references their updated IDs ending 15/16.

Only primary external wages 150,000.37 remain. SE earnings 163,803.042/173,644.7815 file as 163,803/173,645; SS 3,236/21,532 plus Medicare 4,750/5,036 gives SE 7,986/26,568 and half-SE 3,993/13,284. Adjustments 17,277 give AGI 498,124. Primary/spouse QBI 173,379/174,745 give 20% 34,676/34,949 and wage limits 1,315/986. Native/PDF list the spouse first, and correct EINs/amounts join each owner. Phase-in income 466,624 less threshold 394,600 gives 72,024/100,000 = 72.024%. Reductions 24,028/24,462 leave components 10,648/10,487 and total deduction 21,135 below income limit 93,325.

Taxable income 445,489.37 files as 445,489. Using that filed whole-dollar amount in the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 32% less 45,874 gives regular tax 96,682. The initial independent helper used raw cents and yielded 96,683; it was corrected before retaining the audit. This was an audit-helper mistake, not a production rounding defect. AMTI 476,989 less exemption 137,000 gives excess 339,989; 28% less 4,782 gives TMT 90,415/AMT zero. Specified-credit limit 78,761 permits 2,400. Additional Medicare SE 337,448 less remaining threshold 100,000 gives 2,137; other tax 36,691. NIIT zero at MAGI 498,124. Tax 130,973/amount owed 70,973 reconcile against withholding 60,000. Native return contains 17 documents; Schedule 3 and credit references remain IRS38008/IRS58849.

Primary Schedule C page 8 and exact spouse Schedule F page 10 repeat profitable loss-only marks; spouse page 10 also repeats custom-work classification. Primary SE wages are below the maximum, so no skipped wage-maximum finding applies. Form 6251 page 27 omits Sam; Forms 3800/5884/8995-A print both names. Form 3800 page 17 fills skipped 18/19 each 67,811 and 20/21 each 28,871 without empowerment/renewal credit, omitted by native: thirty-eighth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 independently confirmed live at elapsed 58:04.


### Controlled mixed service/farm above-limit WOTC packet: all 31 pages observed

Completed the existing `owned-controlled-mixed-cf-wotc-above-limited` observation. All source/filer facts were reviewed through 17 differences from the fully read phase baseline, all four worker templates and lossless indexed variant checks across 320 employer rows. Every native document was read. Fourteen direct page observations plus 17 independently verified exact retained observed images cover all 31 pages. Private `owned-controlled-mixed-cf-wotc-above-limited-thirtyone-page-independent-observation.json` retains 34 source/XML/PDF/image hashes, page notes, prior audit associations, all 320 employer joins and independent conditional arithmetic. All 160 shared workers join both employers with matching identities/SSNs and distinct employer-specific certifications, payroll and SSA records. Employer review references and spouse agricultural-duty references repeat modulo 80. Source, common-control and certification assertions remain synthetic and unauthenticated.

Each shared worker has 12,000 group wages capped once at 6,000 and credit 2,400. Group capped wages 960,000 give credit 384,000; equal member shares are wages 480,000/credit 192,000 each. Full member credit reductions leave deductible and QBI wages 768,000 each from raw payroll 960,000 each. Primary service NEC 1,200,000.50 and spouse agriculture 1,199,000 plus custom receipts 1,000.50 each file gross 1,200,001/profit 432,001. Native statements and actual page 26 agree on businesses, EINs and member shares; Form 5884 references both statement IDs ending 16/17.

External W-2 wages 300,000.37/100,000.49 file total 400,001. Business SE earnings each file 398,953; primary SS zero/spouse SS 9,436 plus Medicare 11,570 each give SE 11,570/21,006 and half-SE 5,785/10,503. Adjustments 16,288 give AGI 1,247,715. Primary/spouse QBI 426,216/421,498 gives components 85,243/84,300, below nonbinding wage limits 384,000 each. Deduction 169,543 is below income limit 243,243; Form 8995-A correctly lists spouse first, correct EINs, and skips phase-in Part III.

Taxable 1,046,672 gives regular tax 311,331 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 37% less 75,937.50. AMTI 1,078,172/exemption 137,000/TMT 258,746 gives AMT zero. Specified-credit limit permits 239,748 of 384,000; unused 144,252 is not proof of a durable carryforward. Additional Medicare 1,350 on wages plus 7,181 on SE gives 8,531; other tax 41,107 and NIIT zero. Tax 112,690/refund 8,210 reconcile against withholding 120,900. All 18 native documents and credit references join correctly under these conditional facts.

Actual primary C page 8 and exact spouse F page 10 repeat profitable loss-only marks; spouse page 10 repeats custom-work classification. Exact primary SE page 12 repeats wage-maximum skipped fields. Form 6251 page 27 omits Sam. Form 3800 page 17 fills skipped 18/19 each 194,060 and 20/21 each 117,271 without empowerment/renewal credit, omitted by native: thirty-ninth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes independently verified unchanged; full regression PID 31254 confirmed live at elapsed 1:04:41, with advancing output.


### Controlled mixed service/farm phase-in loss packet: all 30 pages observed

Completed the existing `owned-controlled-mixed-cf-wotc-phase-loss` observation. All 31 source/filer differences from the fully read phase baseline were read; all other source/filer facts identical. Every current native document was read, including allocation and loss-netting statements. Pending calculations were not fully reviewed. Seventeen direct observations and 13 independently verified exact retained observed images cover all 30 pages. Private `owned-controlled-mixed-cf-wotc-phase-loss-thirty-page-independent-observation.json` retains 33 source/XML/PDF/image hashes, page notes, reuse associations, two employer-specific shared-worker joins and independent conditional arithmetic. Synthetic common-control, ownership, payroll, certification and issuer records remain unauthenticated.

The shared worker has raw wages 6,000.49 per employer, totaling 12,000.98, capped once at 6,000 for group credit 2,400. Equal capped shares 3,000/credit 1,200 per member leave wage deductions 4,800.49, filed 4,800 each. Primary service NEC 20,000.50 files gross 20,001; supplies 26,401.50 file 26,402, giving C loss 11,201. Spouse agriculture 199,000 plus custom receipts 1,000.50 gives farm gross 200,001/profit 195,201. Native statements and exact actual statement page 24 join names/EINs/member shares; Form 5884 references their IDs ending 15/16.

Only spouse Schedule SE is emitted: earnings 180,268, SS 21,836 plus Medicare 5,228 gives SE 27,064/half-SE 13,532. Primary wages 300,000.37 plus business net 184,000 less adjustment gives AGI 470,468. QBI loss 11,201 offsets spouse 181,669 to 170,468, leaving primary zero; native and actual Schedule C (Form 8995-A) page 30 agree. Twenty percent 34,094 less wage limit 2,400 gives excess 31,694; phase 44,368/100,000 = 44.368% yields reduction 14,062 and deduction 20,032 below income limit 87,794. Actual Form 8995-A pages 28/29 correctly list spouse first with EINs and zero primary amounts.

Taxable 418,936 gives regular tax 88,186 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 32% less 45,874. AMTI 450,436/exemption 137,000/TMT 82,980 gives AMT zero. Specified-credit limit 72,389 allows credit 2,400. Additional Medicare wage tax 450 plus SE tax 1,622 gives 2,072; other tax 29,136/NIIT zero. Tax 114,922/amount owed 54,022 reconcile against withholding 60,900. All 17 native documents and credit references join under these conditional facts.

Profitable spouse F page 10 repeats the loss-only mark and custom-work classification. Primary C loss-only mark is appropriate; there is no primary SE copy or wage-maximum skip observation. Form 6251 page 25 omits Sam. Form 3800 page 15 fills skipped 18/19 each 62,235 and 20/21 each 25,951 without empowerment/renewal credit, omitted by native: fortieth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged. Full regression PID 31254 independently confirmed live at elapsed 1:06:12 with advancing output.


### Controlled mixed service/farm full health-plan packet: all 32 pages observed

Completed the existing `owned-mixed-cf-health-full` observation. All nonhealth input/filer facts exactly match the fully read controlled mixed-below fixture. Health input exactly matches the fully read two-farm-health-full fixture after two policy-identifier and two insurer-name substitutions. An initial oversized differential output was truncated and discarded as read evidence; the subsequent exact comparisons and complete residual difference established the source equivalence. Every current native leaf/attribute was read across all 20 documents; pending calculations were not fully reviewed. Ten direct observations and 22 independently verified exact retained observed images cover all 32 pages. Private `owned-mixed-cf-health-full-thirtytwo-page-independent-observation.json` retains 35 source/XML/PDF/image hashes, page notes, prior audit associations, 24 premium joins, two employer-specific shared-worker joins and independent conditional arithmetic. Policy establishment, certification, payroll, ownership and source records remain unauthenticated synthetic assertions.

Shared-worker wages 12,000.98 are capped once at 6,000 for group credit 2,400; each member receives capped wages 3,000/credit 1,200. Full reductions leave raw wage deductions 4,800.49/filed 4,800 each, giving primary C profit 35,201 and spouse farm profit 55,201. Native allocation statements and exact actual statement page 26 agree with member names/EINs/shares; Form 5884 references updated statement IDs ending 18/19. Both employer-specific worker records join certification, payroll, business and shared identity.

Primary/spouse SE earnings file 32,508/50,978; SS 0/6,321 plus Medicare 943/1,478 gives SE 943/7,799 and half-SE 472/3,900. All 24 premium records join policy numbers, policyholder/payer SSNs, issuer EINs, paid months and owner coverage; eligibility exclusions are false. Business plan inventories and establishment references bind Mixed-CF-T-full to primary service/T and Mixed-CF-S-full to spouse farm/S. Raw premiums 6,000.48/9,600.48 file deductions 6,000/9,600 below capacities 34,729/51,301. Actual Forms 7206 pages 28/29 and native copies agree on identities, profits, 100% allocation, half-SE, capacities and deductions.

Adjustments 19,972 give AGI 300,431 on raw wages 230,000.86/business income 90,402. QBI 28,729/41,701 gives total 70,430/deduction 14,086 below income limit 53,786. Taxable 254,845 gives regular tax 46,857 using the [2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), 24% less 14,306. AMTI 286,345/exemption 137,000/TMT 38,830 gives AMT zero. Specified-credit limit 41,393 allows 2,400. Additional Medicare 571 plus SE 8,742 gives other tax 9,313; NIIT zero. Tax 53,770/refund 66,230 reconcile against withholding 120,000. Native/PDF Form 8995 names, EINs and owner amounts correctly join.

Exact profitable primary C page 8/spouse F page 10 repeat loss-only marks; spouse page 10 repeats custom-work classification. Exact primary SE page 12 repeats wage-maximum skipped fields. Form 6251 page 27 omits Sam. Form 3800 page 17 fills skipped 18/19 each 29,123 and 20/21 each 17,734 without empowerment/renewal credit, omitted by native: forty-first qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged. Full regression PID 31254 independently confirmed live at elapsed 1:10:37.


### Controlled mixed business health plan: all excluded months, all 32 pages observed

Completed the existing `owned-mixed-cf-health-excluded-all` observation. All source/filer facts were reviewed through two policy-identifier substitutions and 24 false-to-true employer-plan eligibility exclusions against fully read mixed-health-full; all other facts identical. Every current native leaf/attribute was read across 20 documents; pending calculations were not fully reviewed. Two direct Form 7206 observations and 30 independently verified exact retained observed images cover all 32 pages. Private `owned-mixed-cf-health-excluded-all-thirtytwo-page-independent-observation.json` retains 35 source/XML/PDF/image hashes, page notes, reuse associations, all 24 premium joins, both employer-specific shared-worker joins and independent conditional arithmetic. Synthetic policy, eligibility, payroll, certification and common-control assertions remain unauthenticated.

All 24 source premiums still join their owner policies, payer SSNs, issuer EINs and monthly payment records, but every month is excluded for employer-plan eligibility. Actual Forms 7206 pages 28/29 and native copies retain correct Alex/Sam identities, profits 35,201/55,201, half-SE 472/3,900 and capacities 34,729/51,301 while reporting eligible premiums and deductions zero. Controlled-group cap/credit/member wage reductions remain 6,000/2,400/1,200 each, with wage deductions 4,800 each and both allocation-statement references ending 18/19.

Adjustments equal half-SE 4,372, giving AGI 316,031. QBI 34,729/51,301 gives deduction 17,206 below income limit 56,906. Taxable 267,325 gives regular tax 49,852; AMTI 298,825/exemption 137,000/TMT 42,075 gives AMT zero. Specified-credit limit 43,639 allows 2,400. SE 8,742/Additional Medicare 571 gives other tax 9,313; NIIT zero. Tax 56,765/refund 63,235 reconcile against withholding 120,000. These reproduce the conditional mixed-below totals, despite retaining both zero Form 7206 copies.

Exact C/F pages 8/10 repeat profitable loss-only marks; F page 10 repeats custom-work classification. Exact SE page 12 repeats wage-maximum skipped fields; exact Form 6251 page 27 omits Sam. Exact Form 3800 page 17 repeats skipped 18/19 each 31,556 and 20/21 each 18,296 without empowerment/renewal credit, omitted by native: forty-second qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 confirmed live at elapsed 1:11:16 with advancing output.


### Controlled mixed health-plan partial-month exclusions: all 32 pages observed

Completed the existing `owned-mixed-cf-health-excluded-months` observation. All source/filer facts were reviewed through two policy-identifier substitutions and seven false-to-true employer-plan eligibility exclusions against fully read mixed-health-full; all other facts identical. All 47 native leaf/attribute differences were read across eight changed documents; the other 12 documents and every remaining field/attribute exactly match the fully read baseline. Pending calculations were not fully reviewed. Ten direct observations and 22 independently verified exact retained observed images cover all 32 pages. Private `owned-mixed-cf-health-excluded-months-thirtytwo-page-independent-observation.json` retains 35 source/XML/PDF/image hashes, page notes, reuse associations, all 24 premium joins, both employer-specific shared-worker joins and independent conditional arithmetic. Synthetic policy, eligibility, payroll, certification and common-control assertions remain unauthenticated.

Primary months January–March and spouse months January–April are excluded. Remaining nine/eight months yield eligible premiums 4,500.36/6,400.32, filed deductions 4,500/6,400. All 24 issuer/payment/policy/owner joins reconcile and excluded flags match the source months. Actual Forms 7206 pages 28/29 retain correct owners, profits 35,201/55,201, half-SE 472/3,900 and capacities 34,729/51,301. Business/WOTC group allocation remains capped wages 6,000/credit 2,400/member credit 1,200 each; both native statement references and exact actual statement page 26 agree.

Adjustments 15,272 give AGI 305,131. QBI 30,229/44,901 gives total 75,130/deduction 15,026 below income limit 54,726. Taxable 258,605 gives regular tax 47,759; AMTI 290,105/exemption 137,000/TMT 39,807 gives AMT zero. Specified-credit limit 42,069 allows 2,400. SE 8,742/Additional Medicare 571 gives other tax 9,313; NIIT zero. Tax 54,672/refund 65,328 reconcile against withholding 120,000 and actual Form 1040.

Exact profitable C/F pages 8/10 repeat loss-only marks; spouse F page 10 repeats custom-work classification. Exact primary SE page 12 repeats wage-maximum skipped fields. Form 6251 page 27 omits Sam. Form 3800 page 17 fills skipped 18/19 each 29,855 and 20/21 each 17,904 without empowerment/renewal credit, omitted by native: forty-third qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:12:34 with advancing output.


### Controlled mixed business health-plan phase-in: all 33 pages observed

Completed the existing `owned-mixed-cf-health-phase` observation. All 24 nonhealth source/filer differences from fully read mixed-health-full were read, including the complete replacement W-2 list. Health inputs exactly match that baseline after two policy-identifier substitutions; every other source/filer fact identical. Every current native leaf/attribute was read across 19 documents; pending calculations were not fully reviewed. Six direct observations and 27 independently verified exact retained observed images cover all 33 pages. Private `owned-mixed-cf-health-phase-thirtythree-page-independent-observation.json` retains 36 source/XML/PDF/image hashes, page notes, reuse associations, 24 premium joins, two employer-specific shared-worker joins and independent conditional arithmetic. Synthetic issuer, policy, eligibility, payroll, certification and common-control assertions remain unauthenticated.

Shared-worker wages 4,000.49/3,000.52 total 7,001.01; group cap 6,000 gives credit 2,400. Member capped wage shares 3,428.496745…/2,571.503254… file as 3,428/2,572, with credit shares 1,371/1,029. Full reductions leave raw deductible/QBI wages 2,629.49/1,971.52, filed 2,629/1,972. C/farm profits 177,372/188,029 join source NEC/agriculture/custom receipts. Native allocation statements and exact actual page 26 agree with member identities/EINs/shares; Form 5884 references updated statement IDs ending 17/18.

SE earnings file 163,803/173,645; SS 3,236/21,532 plus Medicare 4,750/5,036 gives SE 7,986/26,568 and half-SE 3,993/13,284. All 24 premium/payment/policy/owner joins reconcile; no months excluded. Raw premiums 6,000.48/9,600.48 file deductions 6,000/9,600 below capacities 173,379/174,745. Exact actual Forms 7206 pages 28/29 and current native copies agree. Adjustments 32,877 give AGI 482,524 on primary wages 150,000.37.

Primary/spouse QBI 167,379/165,145 gives 20% 33,476/33,029 and wage limits 1,315/986. Phase-in income 451,024 less threshold 394,600 gives 56,424/100,000 = 56.424%. Reductions 18,147/18,080 leave components 15,329/14,949, total deduction 30,278 below income limit 90,205. Actual Form 8995-A pages 32/33 and native correctly list spouse first with proper EINs/amounts. Taxable 420,746 gives regular tax 88,765; AMTI 452,246/exemption 137,000/TMT 83,487 gives AMT zero. Specified-credit limit 72,824 allows 2,400. SE 34,554/Additional Medicare 2,137 gives other tax 36,691; NIIT zero. Tax 123,056/amount owed 63,056 reconcile against withholding 60,000.

Exact C/F pages 8/10 repeat profitable loss-only marks; F page 10 repeats custom-work classification. Primary SE wages are below the maximum, so no wage-maximum skip observation applies. Form 6251 page 27 omits Sam. Form 3800 page 17 fills skipped 18/19 each 62,615 and 20/21 each 26,150 without empowerment/renewal credit, omitted by native: forty-fourth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 confirmed live at elapsed 1:14:14 with advancing output.


### Controlled mixed business health plan above the credit limit: all 33 pages observed

Completed the existing `owned-mixed-cf-health-above-limited-credit` observation. All nonhealth source/filer inputs exactly match the fully read controlled mixed-above fixture; health inputs exactly match fully read mixed-health-full after two policy-identifier substitutions. Every current native leaf/attribute was read across 20 documents; pending calculations were not fully reviewed. Two direct observations and 31 independently verified exact retained observed images cover all 33 pages. Private `owned-mixed-cf-health-above-limited-credit-thirtythree-page-independent-observation.json` retains 36 source/XML/PDF/image hashes, page notes, reuse associations, all 320 employer-specific worker joins, 24 premium joins and independent conditional arithmetic. Employer-review and spouse agricultural-duty references repeat modulo 80; every worker identity/SSN, employer certification/payroll and SSA join reconciles. These are unauthenticated synthetic records.

All 160 shared workers each have 12,000 group wages capped once at 6,000/credit 2,400. Group capped wages 960,000 gives credit 384,000, with member capped wages 480,000/credit 192,000 each. Full credit reductions leave deductible/QBI wages 768,000 each from raw payroll 960,000 each, giving C and farm profits 432,001 each. Actual statement page 26 and native allocations agree with names/EINs/shares; Form 5884 references statement IDs ending 18/19.

SE earnings 398,953 each, SS 0/9,436 and Medicare 11,570 each give SE 11,570/21,006 and half-SE 5,785/10,503. All 24 monthly premium/policy/issuer/payment/owner joins reconcile with no excluded months. Raw premiums 6,000.48/9,600.48 file deductions 6,000/9,600 below capacities 426,216/421,498; exact actual Forms 7206 pages 28/29 and current native copies agree. Adjustments 31,888 give AGI 1,232,115. Primary/spouse QBI 420,216/411,898 gives components 84,043/82,380 and deduction 166,423 below income limit 240,123; wage limits 384,000 each are nonbinding. Native and actual Form 8995-A page 32 correctly list spouse first; exact page 33 skips Part III.

Taxable 1,034,192 gives regular tax 306,714; AMTI 1,065,692/exemption 137,000/TMT 255,252 gives AMT zero. Specified-credit limit allows 236,285 of determined 384,000. Unallowed 147,715 is not proof of a durable accepted-filing carryforward. Additional Medicare 8,531 plus SE 32,576 gives other tax 41,107; NIIT zero. Tax 111,536/refund 9,364 reconcile against withholding 120,900.

Exact profitable C/F pages 8/10 repeat loss-only marks; F page 10 repeats custom-work classification. Exact primary SE page 12 repeats wage-maximum skipped fields; exact Form 6251 page 27 omits Sam. Exact Form 3800 page 17 repeats skipped 18/19 each 191,439 and 20/21 each 115,275 without empowerment/renewal credit, omitted by native: forty-fifth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:16:59.


### Primary-owned farm loss and farm offset: all 29 pages observed

Completed the existing `owned-farm-wotc-loss-phase-primary-f-offset` observation. All 46 source/filer differences from fully read two-farm-phase-loss were read, including complete replacement WOTC worker facts and ownership/source changes; all other facts identical. Every current native leaf/attribute was read across 15 documents; pending calculations were not fully reviewed. Seventeen direct observations and 12 independently verified exact retained observed images cover all 29 pages. Private `owned-farm-wotc-loss-phase-primary-f-offset-twentynine-page-independent-observation.json` retains 32 source/XML/PDF/image hashes, page notes, reuse associations, primary-owned NEC/agriculture joins, one worker certification/payroll/W-2/SSA join and independent conditional arithmetic. Synthetic source, payroll, certification, ownership and W-2 withholding assertions remain unapproved.

Both farms belong to Alex/T/SSN 111223333, with distinct EINs 123456791/123456792. One worker at the loss farm has wages 6,000.49 capped at 6,000 for credit 2,400; full reduction leaves deductible wages 3,600.49, filed 3,600. Gross 20,001 less feed 26,402 and wages 3,600 gives loss 10,001. The second primary-owned farm has agriculture 79,000 plus custom receipts 1,000.50, filed gross/profit 80,001 with no wages. All recipient/farm/source joins agree. Native/PDF Form 5884 credit 2,400 joins IRS58848/IRS38007 with no group allocation statement.

Combined primary net farm income 70,000 gives SE earnings 64,645. W-2 Social Security wages already meet 176,100, so SS tax zero; Medicare 1,875 gives half-SE 938. Primary wages 430,000.37 plus farm net less half-SE gives AGI 499,062. Half-SE is assigned to the positive farm: QBI before netting −10,001/79,063, after netting 0/69,062. Native and actual Form 8995-A Schedule C page 29 agree. Twenty percent 13,812/wage limit zero and phase 72,962/100,000 = 72.962% gives reduction 10,078/deduction 3,734 below income limit 93,512. Correct distinct EINs accompany the repeated business names.

Taxable 463,828 gives regular tax 102,551; AMTI 495,328/exemption 137,000/TMT 95,550 gives AMT zero. Specified-credit limit 83,163 allows 2,400. Additional Medicare wages 1,620 plus SE 582 gives 2,202; other tax 4,077/NIIT zero. Tax 104,228/amount owed 44,228 reconcile against federal withholding 60,000. Source/native W-2 retain synthetic Social Security withholding 9,300.02/filed 9,300 on Social Security wages 176,100, and Medicare withholding 2,175.01/filed 2,175 on wages 430,000.37; actual Form 8959 page 25 compares that to regular Medicare 6,235. Conditional tax arithmetic does not approve these withholding assertions.

Positive offset farm page 10 repeats loss-only 36a; exact negative farm page 8 appropriately marks the loss question. Both copies repeat custom-work classification. Primary SE page 12 prints wage-maximum skipped fields; Form 6251 page 24 omits Sam. Form 3800 page 15 fills skipped 18/19 each 71,663 and 20/21 each 30,888 without empowerment/renewal credit, omitted by native: forty-sixth qualified observation. Existing future rows extended only, including synthetic withholding; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:17:47 with advancing output.


### Corrective identity evidence for recent owned packets

The source-comparison helper incorrectly checked `get("filers")` although these prepared fixtures use singular `filer`; the earlier printed equality therefore compared missing values and did not establish identity equivalence. Independently read the actual complete reference `filer` object and compared the real records in 12 manifest-verified source artifacts covering the recent controlled mixed and mixed health-plan packets, farm-offset packet and source baselines. All actual filer records exactly match the reviewed joint Alex/Sam reference (MFJ, SSNs, names, address, spouse and timestamp). Private `recent-owned-packet-actual-filer-comparison-correction.json` retains source hashes and actual-key comparison results. This closes the identity-comparison evidence omission for those packets; prior immutable audits are preserved. Corrected the reusable source-difference helper for future current-queue reviews. No production change, new TODO, clean approval, aggregate addition or main checkoff.


### Single-filer owned farm WOTC: all 25 pages observed

Completed the existing `owned-farm-wotc-single-below` observation. Read complete source inputs and actual singular `filer` (single Alex, primary SSN 111223333, no spouse), and every current native leaf/attribute across 13 documents. Pending calculations were not fully reviewed. Sixteen direct views and nine independently verified exact retained observed images cover all 25 pages. Private `owned-farm-wotc-single-below-twentyfive-page-independent-observation.json` retains 28 source/XML/PDF/image hashes, page notes, reuse associations, owned farm NEC/agriculture joins, one worker certification/payroll/W-2/SSA join and independent conditional arithmetic. Synthetic source, payroll, certification, ownership and SSA assertions remain unapproved.

One primary-owned farm EIN 123456791 receives agriculture 59,000 and custom receipts 1,000.50, filed gross 60,001. Worker wages 6,000.49 are capped at 6,000 for determined credit 2,400; full reduction leaves deductible wages 3,600.49, filed 3,600, and profit 56,401. Owner/recipient, farm, employer, certification, payroll, W-2 and SSA joins agree. Native Form 5884 IRS58847 joins Form 3800 IRS38006 and Schedule 3.

SE earnings 52,086 and external W-2 SS wages 150,000 leave SS base 26,100/tax 3,236; Medicare 1,510 gives SE tax 4,746/half 2,373. No wage-maximum skip applies. Raw wages 150,000.37 plus farm less half-SE gives AGI 204,028. QBI 54,028/twenty percent 10,806 is below income limit 37,656; before-QBI taxable income 188,278 is below single threshold 197,300, supporting Form 8995. Taxable 177,472 gives regular tax 35,440 using the [2025 single computation worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf): 24% less 7,153. AMTI 193,222/exemption 88,100/TMT 27,332 gives AMT zero; single Form 6251 header is appropriate. Specified-credit limit 32,830 allows 2,400. Additional Medicare 19 applies to SE excess 2,086 over the remaining 50,000 threshold; other tax 4,765/NIIT zero. Tax 37,805/refund 22,195 reconcile against federal withholding 60,000. This W-2's synthetic SS/Medicare withholding 9,300.02/2,175.01 agrees conditionally with its wages, without authenticating issuer records.

Primary Schedule F page 8 repeats loss-only 36a on a profit and custom receipts on line 8. Form 3800 page 13 fills skipped 18/19 each 20,499 and 20/21 each 14,941 without empowerment/renewal credit, omitted by native: forty-seventh qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:26:44.


### Joint-return primary-owned farm WOTC: all 25 pages observed

Completed the existing `owned-farm-wotc-primary-below` observation. Read complete source inputs and actual singular `filer` (MFJ Alex/Sam, SSNs 111223333/444556666), and every current native leaf/attribute across 13 documents, including the return header. Pending calculations were not fully reviewed. Fourteen direct views and eleven independently verified exact retained observed images cover all 25 pages. Private `owned-farm-wotc-primary-below-twentyfive-page-independent-observation.json` retains 28 source/XML/PDF/image hashes, page notes, reuse associations, primary-owned NEC/agriculture joins, one worker certification/payroll/W-2/SSA join and independent conditional arithmetic. Synthetic source, payroll, certification, ownership and SSA assertions remain unapproved.

Primary-owned farm EIN 123456791 receives agriculture 149,000 and custom receipts 1,000.50, filed gross 150,001. Worker wages 6,000.49 are capped at 6,000 for credit 2,400; full reduction leaves deductible wages 3,600.49, filed 3,600, and farm profit 146,401. All owner, recipient, farm, employer, certification, payroll, W-2 and SSA joins agree. Native IRS58847/IRS38006/Schedule 3 credit references agree; exact Form 5884 page 21 was previously observed and its current/prior hashes verified.

Only Alex has SE earnings 135,201. External W-2 SS wages reach 176,100; SS tax zero/Medicare 3,921/half-SE 1,961. Raw wages 220,000.37 plus farm less half-SE gives AGI 364,440. QBI 144,440/twenty percent 28,888 is below income limit 66,588. Before-QBI taxable income 332,940 is below MFJ threshold 394,600, supporting Form 8995. Taxable 304,052 gives regular tax 58,666; AMTI 335,552/exemption 137,000/TMT 51,624 gives AMT zero. Specified-credit limit 50,249 allows 2,400. Additional Medicare 947 applies to SE excess 105,201 over remaining 30,000 threshold; other tax 4,868/NIIT zero. Form 8959 correctly reconciles issued synthetic Medicare withholding 3,370.01/filed 3,370 against regular 3,190, sending 180 to Form 1040 line 25c. Payments 60,180 against tax 61,134 yield amount owed 954. Conditional math does not authenticate the issuer or certify transmission readiness.

Primary Schedule F page 8 repeats profitable loss-only 36a and custom receipts on line 8. Primary SE page 10 prints wage-maximum skipped 8d/9/10; joint Form 6251 page 22 repeats primary-only Alex header. Form 3800 page 13 fills skipped 18/19 each 38,718 and 20/21 each 19,948 without empowerment/renewal credit, omitted by native: forty-eighth qualified observation. Existing future rows extended only; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:29:27.


### Controlled-group fractional wages and QBI phase-in: all 31 pages observed

Completed the existing `joint-controlled-wotc-fractional-phasein` observation. Read complete current source inputs and actual singular `filer` (MFJ Alex/Sam, SSNs 111223333/444556666), and every native leaf/attribute across 17 current documents. Pending calculations were not fully reviewed. Fifteen direct views and sixteen independently verified exact retained observed images cover all 31 pages. Private `joint-controlled-wotc-fractional-phasein-thirtyone-page-independent-observation.json` retains 34 source/XML/PDF/image hashes, page notes, reuse associations, qualified owner/business/worker-reference joins and independent conditional arithmetic. Synthetic source, common control, payroll and certification assertions remain unapproved.

The records assert one shared worker across primary retail EIN 123456789 and spouse retail EIN 987654321; wages 4,000.49/3,000.52 total 7,001.01, group capped at 6,000 for credit 2,400. Proportional capped shares 3,428.496745…/2,571.503254… file as 3,428/2,572; credit shares 1,371/1,029 leave deductible wages 2,629.49/1,971.52. Direct owner/EIN/business-location and wage/reference assertions reconcile, but worker W-2 records lack employee SSNs, employer EINs, certification and payroll references. They cannot prove complete issued-record identity/employer binding. Retail receipts are entered structured assertions, without source-issued NEC records in these inputs. Conditional calculations do not authenticate these sources.

Filed receipts 180,000/190,000 less wages 2,629/1,972 give owner profits 177,371/188,028. Both actual Schedule C pages 8/10 correctly leave profitable loss-only 32 boxes blank. SE earnings 163,802/173,644 give SS 3,236/21,532 and Medicare 4,750/5,036, total SE 7,986/26,568; half-SE 3,993/13,284 gives adjustment 17,277. No wage-maximum skip applies. Raw W-2 150,000.37 produces AGI 498,122. QBI 173,378/174,744, twenty percent 34,676/34,949 and wage limits 1,315/986 at phase 72.022% yield reductions 24,027/24,461 and components 10,649/10,488, deduction 21,137 below income limit 93,324.

Taxable 445,485 gives regular tax 96,681; AMTI 476,985/exemption 137,000/TMT 90,414 gives AMT zero. Specified-credit limit 78,761 allows 2,400. Additional Medicare 2,137 plus SE 34,554 gives other tax 36,691/NIIT zero. Tax 130,972/owed 70,972 reconcile against withholding 60,000. Native group statement and deduction differentiation retain member shares and Form 5884 references to both statements; actual printable allocation page 26 agrees with EINs, member names, filed wages and shares.

Joint Form 6251 page 27 repeats primary-only Alex header. Form 3800 page 17 fills skipped 18/19 each 67,811 and 20/21 each 28,870 without empowerment/renewal credit, omitted by native: forty-ninth qualified observation. Existing future rows extended only, including limited worker-source metadata; no future implementation, new item, clean approval, aggregate addition, external authenticity, business-rule/ATS proof or main checkoff. Main 52 frozen/future 27 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:31:51 with advancing output.


### Prepared-review inventory refresh and multi-fixture cross-reference

Reconciled the previous inventory's 49 entries without a named observation or bounded batch. Private `prepared-review-inventory-reconciliation-20261007T170423Z.json` supports explicit `fixtureId`, `fixture`, `id` and `caseId` keys and locates 34 qualified observations with reported complete page-number coverage. Independently rehashed all 1,083 source/XML/PDF artifacts across 361 prepared cases/4,714 pages, the previous 75 bounded-batch manifests and the aggregate: unchanged. Rehashed the matched observations' declared artifact paths and compared source/XML/PDF hashes with the current preparation manifest; no discrepancies. This is evidence indexing and byte verification, not fresh visual/source interpretation or reapproval of prior results.

A top-level-ID miss is not proof of no review. Cross-references located the retained `mixed-k-duplicate-error-two-packet-observation.json` for both `single-k-mixed-duplicate-personal` and `single-k-mixed-error-duplicate-personal`. Private `prepared-review-inventory-multi-fixture-supplement-20261007T1704.json` verifies its 34 packet/image hashes, both current prepared packet digests, reported page numbers 1–14 for each packet, and current/prior bytes for 18 reused images. Existing source, native Schedule D and EIC qualifications remain; no new approval or fresh visual review is claimed.

Of the former 49 index misses, 36 now have located qualified observation records. Thirteen remaining index candidates total 339 pages: joint both-owner WOTC one-phasein and partial-above; joint primary WOTC partial-above, phasein, threshold-edge, upper-edge and upper-plus-one; joint spouse WOTC threshold-edge and upper-edge; advanced-event WOTC tip-exclusion; agricultural biodiesel producer credit; direct interpreter credit; startup and auto-enrollment credit. Search found retained parity/diagnosis references for these candidates, which are not direct review approval. Further aliases or multi-fixture evidence must be inspected before asserting a packet is unreviewed. This resolves the next existing packet-review work selection without adding TODOs to the frozen main board or implementing future items.

Main 52 frozen/future 27 unworked; no new discovery, clean approval, aggregate increase or checkoff. Aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Top estimate remains unchanged. Full regression PID 31254 independently confirmed live at elapsed 1:36:18 with advancing output; this inventory does not certify terminal test results, source authenticity, business-rule coverage or IRS ATS acceptance.


### Joint spouse WOTC threshold edge: all 26 pages observed

Completed existing `joint-spouse-wotc-threshold-edge`, one of the 13 inventory candidates. Read complete source inputs and actual singular `filer` (MFJ Alex/Sam), and every current native leaf/attribute across 13 documents. Pending calculations were not fully reviewed. Fifteen direct views and eleven independently verified exact retained observed images cover all 26 pages. Private `joint-spouse-wotc-threshold-edge-twentysix-page-independent-observation.json` retains 29 source/XML/PDF/image hashes, page notes, reuse associations, qualified owner/reference/wage joins, native amount/owner assertions and independent conditional arithmetic. Synthetic source, payroll, certification and issuer assertions remain unapproved; worker W-2 lacks employee SSN, employer EIN and certification/payroll references.

Business, direct employer review and Schedule C/SE correctly belong to Sam/S/444556666/EIN 123456789. Only Alex/111223333 has external W-2 wages 95,257.50. Worker wages 6,000 at 400 hours give determined credit 2,400; full wage reduction gives deduction 3,600 and spouse profit 346,400 on entered receipts 350,000. Spouse SE earnings 319,900 use the full independent SS base 176,100, tax 21,836, without deducting Alex's W-2 wages. Medicare 9,277 gives SE tax 31,113/half 15,557. No primary SE copy or wage-maximum skip applies. Actual profitable Schedule C page 8 correctly leaves loss-only 32 boxes blank.

Raw AGI 426,100.50 rounds to 426,101. Taxable before QBI 394,601 exceeds MFJ threshold 394,600 by one dollar, phase 0.00001 (printed 0.001%). QBI 330,843/twenty percent 66,169/wage limit 1,800 gives excess 64,369, phased reduction 1 and deduction 66,168 below income limit 78,920. Native and actual Form 8995-A pages 25–26 agree. Taxable 328,433 gives regular tax 64,518; AMTI 359,933/exemption 137,000/TMT 57,963 gives AMT zero. Specified-credit limit 54,638 allows 2,400. Additional Medicare 1,486 plus SE 31,113 gives other tax 32,599/NIIT zero. Tax 94,717/owed 34,717 reconcile against federal withholding 60,000. Conditional math does not authenticate sources or prove business-rule/ATS readiness.

Joint Form 6251 page 22 repeats primary-only Alex header. Form 3800 page 13 fills skipped 18/19 each 43,472 and 20/21 each 21,046 without empowerment/renewal credit, omitted by native: fiftieth qualified observation. These and limited worker metadata extend existing future rows. Newly found `reviewFocus` owner-language conflict is added only to future: it says primary-owned certified payroll and actual spouse W-2, reversing this source/output allocation. No future implementation, clean approval, aggregate addition or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Twelve inventory candidates/313 pages remain for evidence resolution after this observation. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:38:13.


### Joint spouse WOTC upper edge: all 26 pages observed

Completed existing `joint-spouse-wotc-upper-edge`, another inventory candidate. Read all five W-2 differences from fully reviewed spouse threshold-edge: wages/Medicare wages 195,256.50, SS wages 176,100, SS withholding 10,918.20 and Medicare withholding 2,831.22. All other inputs, actual singular filer and reviewFocus are exactly identical; both current/baseline prepared artifacts match the manifest. Read all 59 native leaf/attribute differences across 13 documents; all other leaves/attributes match the fully read baseline. Pending calculations were not fully reviewed. Eleven direct views and fifteen independently verified exact retained observed images cover all 26 pages. Private `joint-spouse-wotc-upper-edge-twentysix-page-independent-observation.json` retains 29 source/XML/PDF/image hashes, page notes, reuse associations, qualified owner/reference/wage joins, native amount/owner assertions and independent conditional arithmetic. Synthetic source/payroll/certification/issuer claims remain unapproved; identical worker W-2 metadata remains incomplete.

Sam/S/444556666 remains business/SE owner, Alex/111223333 remains sole external W-2 owner. Exact Schedule C/SE pages 8/10 retain spouse profit 346,400/earnings 319,900, SS 21,836/Medicare 9,277/SE 31,113/half 15,557. Alex's higher and SS-maximum W-2 does not offset Sam's SS base. Exact profitable C page 8 leaves loss-only boxes blank. No primary SE copy or wage-maximum skip applies.

Raw AGI 526,099.50 rounds to 526,100. Before-QBI taxable income 494,600 exactly equals the MFJ phase-in upper edge, producing phase 1.00000/100%. QBI 330,843/twenty percent 66,169/wage limit 1,800 gives full reduction 64,369 and deduction 1,800 below income limit 98,920. Actual Form 8995-A pages 25–26 and native agree; Part III remains applicable at the inclusive upper edge. Taxable 492,800 gives regular tax 111,822; AMTI 524,300/exemption 137,000/TMT 103,662 gives AMT zero. Specified-credit limit 90,116 allows determined credit 2,400. Additional Medicare 2,386 plus SE 31,113 gives other tax 33,499/NIIT zero. Tax 142,921/owed 82,921 reconcile against withholding 60,000; actual Form 8959 reconciles regular/withheld Medicare 2,831/additional withholding zero.

Joint Form 6251 page 22 repeats primary-only Alex header. Form 3800 page 13 fills skipped 18/19 each 77,747 and 20/21 each 34,075 without empowerment/renewal credit, omitted by native: fifty-first qualified observation. Existing worker-metadata and reversed owner-reviewFocus future rows also extended. No future implementation, new item, clean approval, aggregate increase or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Eleven inventory candidates/287 pages remain for evidence resolution. All 2,590 runtime hashes verified unchanged; full regression PID 31254 independently confirmed live at elapsed 1:41:03.


### Joint primary WOTC threshold edge: all 26 pages observed

Completed existing `joint-primary-wotc-threshold-edge`. Read all six source-input differences from the fully reviewed spouse threshold-edge: business/direct-review owner changes S to T, both owner SSNs change to Alex/111223333, and external W-2 recipient/reference change to Sam/444556666. All other inputs and actual singular MFJ filer are identical. Current reviewFocus correctly describes primary business/payroll and spouse W-2. Read all five native ownership differences across 13 documents; remaining leaves/attributes are identical to the fully read baseline. Pending calculations were not fully reviewed. Two direct views (Schedule C page 8 and SE page 10) plus 24 exact retained observed images cover all 26 pages; prior audit associations and both image bytes independently verified. Private `joint-primary-wotc-threshold-edge-twentysix-page-independent-observation.json` retains 29 artifact/image hashes, page notes, source differences, owner/native assertions and independent conditional math. Current and baseline prepared hashes verified, as were all 2,590 runtime hashes.

Primary retail receipts 350,000/worker wages 6,000/400 hours give WOTC 2,400, wage deduction 3,600 and profit 346,400. Alex's SE earnings 319,900 use his full SS base 176,100: Sam's W-2 95,257.50 does not offset Alex's base. SS tax 21,836/Medicare 9,277/SE 31,113/half 15,557 reconcile. No spouse SE copy or wage-maximum skip applies. Profitable Schedule C page 8 correctly leaves loss-only 32 boxes blank.

Raw AGI 426,100.50 rounds to 426,101; before-QBI taxable 394,601 is one dollar above MFJ threshold 394,600. Phase 0.00001, QBI 330,843/twenty percent 66,169/wage limit 1,800 yield reduction 1/deduction 66,168 below income limit 78,920. Taxable 328,433/reg tax 64,518/AMTI 359,933/TMT 57,963/AMT zero/spec-credit limit 54,638 permit credit 2,400. Additional Medicare 1,486/other tax 32,599/NIIT zero give tax 94,717/owed 34,717 against withholding 60,000. Native and observed/exact retained pages agree conditionally.

Exact Form 6251 page 22 repeats primary-only joint header. Exact Form 3800 page 13 repeats skipped 18/19 each 43,472 and 20/21 each 21,046 without empowerment/renewal credit, omitted by native: fifty-second qualified observation. Identical synthetic worker W-2 metadata remains incomplete. Only these existing future rows extended; no future implementation or new item. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Ten inventory candidates/261 pages remain for evidence resolution. Full regression PID 31254 independently confirmed live at elapsed 1:44:48 with advancing output; no terminal totals available.


### Joint primary WOTC upper edge: all 26 pages covered by exact observed-image reuse

Completed existing `joint-primary-wotc-upper-edge`. Read six source-input ownership/reference differences from fully reviewed spouse upper-edge; all remaining inputs and actual singular MFJ filer are identical. Current reviewFocus correctly describes Alex's business/payroll and Sam's external W-2. Read all five native owner differences across 13 documents; all other leaves/attributes match the fully read baseline. Pending calculations were not fully reviewed. All 26 rendered pages exactly match retained observed images: current/prior bytes, audit hash associations and page records independently verified; no new direct views claimed. Private `joint-primary-wotc-upper-edge-twentysix-page-independent-observation.json` retains 29 current artifact/image hashes, reuse associations, source differences and independent conditional arithmetic. Both prepared packets' manifest hashes and all 2,590 runtime hashes verified.

Alex/111223333 owns retail/SE, Sam/444556666 owns external W-2 wages/Medicare wages 195,256.50/SS wages 176,100/SS withholding 10,918.20/Medicare withholding 2,831.22. Sam's SS-maximum wages do not offset Alex's SS base: profit 346,400/SE earnings 319,900/SS tax 21,836/Medicare 9,277/SE 31,113/half 15,557 remain. No spouse SE copy or wage-maximum skip applies. Profitable C page 8 correctly leaves loss-only 32 boxes blank.

Raw AGI 526,099.50 rounds to 526,100/before-QBI taxable 494,600, exactly the inclusive MFJ upper phase-in edge. Phase 1/QBI 330,843/twenty percent 66,169/wage limit 1,800 yield full reduction 64,369/deduction 1,800 below income limit 98,920. Taxable 492,800/reg 111,822/AMTI 524,300/TMT 103,662/AMT zero/spec-credit limit 90,116 allow WOTC 2,400. Additional Medicare 2,386/other tax 33,499/NIIT zero give tax 142,921/owed 82,921 against withholding 60,000. Native and exact observed-image counterparts agree conditionally.

Exact Form 6251 page 22 primary-only joint header, Form 3800 page 13 skipped 18/19 each 77,747 and 20/21 each 34,075 (native omits), and incomplete synthetic worker W-2 metadata extend only existing future rows: fifty-third qualified Form 3800 observation. No new item or future implementation. Source/payroll/certification assertions remain unauthenticated; no clean approval, aggregate addition, business-rule/ATS proof or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Nine inventory candidates/235 pages remain for evidence resolution. Full regression PID 31254 independently confirmed live at elapsed 1:45:52; output advances, no terminal totals yet.


### Joint primary WOTC one dollar above upper edge: all 26 pages observed

Completed existing `joint-primary-wotc-upper-plus-one`. Read all four source-input differences from fully read primary upper-edge: Sam's W-2 wages/Medicare wages rise from 195,256.50 to 195,257.50, Medicare withholding rises 2,831.22 to 2,831.23, and the synthetic source reference changes. Other inputs, actual singular MFJ filer and reviewFocus are identical. Read all 49 native leaf/attribute differences across 13 documents; other leaves/attributes match the fully read baseline. Pending calculations were not fully reviewed. Seven direct views (1/2/22/23/24/25/26) and 19 exact retained observed-image matches cover all 26 pages. Private `joint-primary-wotc-upper-plus-one-twentysix-page-independent-observation.json` retains 29 current artifact/image hashes, verified reuse associations, source differences, owner/native assertions and independent conditional math. Both prepared manifest sets and all 2,590 runtime hashes verified unchanged.

Alex remains retail/SE owner, Sam remains external W-2 owner. Credit 2,400/wage deduction 3,600/profit 346,400/SE earnings 319,900/SS tax 21,836/Medicare 9,277/SE 31,113/half 15,557 remain. Sam's SS-maximum W-2 does not offset Alex's SS base. Raw AGI 526,100.50 rounds to 526,101/before-QBI taxable 494,601: one dollar above the 494,600 MFJ upper phase-in boundary. Actual Form 8995-A Part III page 26 is correctly blank; native phase fields omitted. Direct wage cap 1,800 determines QBI deduction 1,800 below income limit 98,920 (QBI 330,843/twenty percent 66,169). The audit's capped phase/reduction arithmetic only explains the equivalent full-limit result, not an emitted Part III computation.

Taxable 492,801/reg tax 111,822/AMTI 524,301/TMT 103,662/AMT zero/spec-credit limit 90,116 allow WOTC 2,400. Form 8959 wages 195,258/remaining threshold 54,742/SE excess 265,158 give rounded additional Medicare 2,386; withholding and regular Medicare both round to 2,831/additional withholding zero. Other tax 33,499/NIIT zero/tax 142,921/owed 82,921 against withholding 60,000 reconcile. One-dollar income changes leave these rounded tax amounts unchanged.

Form 6251 page 22 repeats primary-only joint header; exact Form 3800 page 13 repeats skipped 18/19 each 77,747 and 20/21 each 34,075 omitted by native: fifty-fourth qualified observation. Same incomplete synthetic worker W-2 metadata remains. Existing future rows extended only; no new item or future implementation. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Eight inventory candidates/209 pages remain for evidence resolution. Full regression PID 31254 independently confirmed live at elapsed 1:47:24; terminal results unavailable.


### Joint primary WOTC phase-in: all 26 pages observed

Completed existing `joint-primary-wotc-phasein`. Read all six W-2 source-input differences from fully read primary upper-edge: Sam's wages/SS wages/Medicare wages 150,000.37, SS withholding 9,300.02, Medicare withholding 2,175.01 and synthetic source reference. All other inputs, actual singular filer and reviewFocus are identical. Read all 59 native leaf/attribute differences across 13 documents; remaining leaves/attributes match the fully read baseline. Pending calculations were not fully reviewed. Eleven direct views (1/2/5/6/12/13/22/23/24/25/26) and fifteen exact retained observed-image matches cover all 26 pages; reuse audit associations and both image bytes independently verified. Private `joint-primary-wotc-phasein-twentysix-page-independent-observation.json` retains 29 current artifact/image hashes, source differences, page notes, owner/native assertions and independent conditional math. Both prepared manifests and all 2,590 runtime hashes verified unchanged.

Alex remains retail/SE owner and Sam external W-2 owner: profit 346,400/SE earnings 319,900/SS tax 21,836/Medicare 9,277/SE 31,113/half 15,557. Sam's wages do not offset Alex's SS base. Credit 2,400/full wage deduction 3,600 remain; exact profitable Schedule C page 8 leaves loss-only 32 boxes blank, and no wage-maximum skip applies. Raw AGI 480,843.37 rounds to 480,843/before-QBI taxable 449,343. MFJ excess 54,743/phase 0.54743 gives reduction 35,238 from QBI twenty percent 66,169 less wage limit 1,800: deduction 30,931 below income limit 89,869. Native and actual Form 8995-A pages 25–26 agree.

Taxable 418,412/reg tax 88,018/AMTI 449,912/TMT 82,833/AMT zero/spec-credit limit 72,263 allow WOTC 2,400. Form 8959 wages 150,000/remaining threshold 100,000/SE excess 219,900 give additional Medicare 1,979; withholding/regular Medicare both 2,175/additional withholding zero. Other tax 33,092/NIIT zero give tax 118,710/owed 58,710 against withholding 60,000.

Form 6251 page 22 repeats primary-only joint header. Form 3800 page 13 fills skipped 18/19 each 62,125 and 20/21 each 25,893 without empowerment/renewal credit, omitted by native: fifty-fifth qualified observation. Same incomplete synthetic worker W-2 metadata remains. Only existing future rows extended; no new item or future implementation. Synthetic source/payroll/certification remain unauthenticated; no clean approval, aggregate addition, business-rule/ATS proof or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Seven inventory candidates/183 pages remain for evidence resolution. Full regression PID 31254 independently confirmed live at elapsed 1:50:12 with advancing EIC tests; terminal results unavailable.


### Joint primary WOTC partial use above QBI boundary: all 26 pages observed

Completed existing `joint-primary-wotc-partial-above`. Read all four source-input families: general, Schedule C/review, WOTC and external W-2. Read full first worker/certification/payroll/direct-review and employee W-2 templates, then verified every one of 80 workers and 80 employee W-2 rows exactly matches those templates except enumerated unique index 0–79 worker/W-2/SSA/SWA/payroll/direct-review references. Verified all 80 wage/business/owner joins and distinct worker references. Actual singular filer/reviewFocus match fully read primary upper-plus-one. The first source-diff attempt stopped at unequal list lengths; it was replaced by complete current-source/template review, with no source-read claim based on the failed attempt. Read all 122 native leaf/attribute differences across 13 documents; remaining leaves/attributes match the fully read baseline. Pending calculations were not fully reviewed. Eighteen direct views and eight verified exact retained observed-image matches cover all 26 pages. Private `joint-primary-wotc-partial-above-twentysix-page-independent-observation.json` retains 29 current artifact/image hashes, page notes, worker qualification, owner/native assertions and conditional math. Both prepared manifest sets and all 2,590 runtime hashes verified unchanged.

Alex/T/111223333 owns retail/EIN 123456789/SE; Sam/444556666 owns external W-2 wages 300,000/SS wages 176,100/SS withholding 10,918.20/Medicare withholding 5,250/federal withholding 60,000. Eighty workers each 6,000 qualified wages/400 hours give wages 480,000/determined WOTC 192,000. Full determined-credit wage reduction gives wage/QBI payroll deduction 288,000 and profit 312,000 on receipts 600,000. Profitable Schedule C page 8 correctly leaves loss-only 32 boxes blank. Alex's SE earnings 288,132 use his full SS base; Sam's SS-maximum wages do not offset Alex. SS 21,836/Medicare 8,356/SE 30,192/half 15,096 reconcile; no own-wage maximum skip applies.

AGI 596,904/before-QBI taxable 565,404 exceed MFJ upper phase-in boundary. QBI 296,904/twenty percent 59,381 are below wage limit 144,000 and income limit 113,081, so deduction 59,381/Part III blank agree with native and actual Form 8995-A. Taxable 506,023 yields regular tax 116,203 using [2025 IRS worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) MFJ 35% less 60,905.50. AMTI 537,523/TMT 107,364/AMT zero/spec-credit limit 93,402 give allowed credit 93,402 and unused arithmetic 98,598. The unused amount does not establish durable filed carryover provenance. Full wage reduction uses determined 192,000, not only allowed 93,402.

Additional Medicare wage tax 450 plus SE tax 2,593 gives 3,043/other tax 33,235/NIIT zero. Form 8959 actual withholding 5,250 less regular Medicare 4,350 gives additional withholding 900, carried to Form 1040 line 25c/payments 60,900. Tax 56,036/refund 4,864 reconcile. Synthetic source assertions remain unauthenticated; employee W-2 metadata lacks employee SSN, employer EIN and certification/payroll references across all 80 rows.

Form 6251 page 22 repeats primary-only joint header. Form 3800 page 13 fills skipped 18/19 each 80,523 and 20/21 each 35,680 without empowerment/renewal credit, omitted by native: fifty-sixth qualified observation. Only existing future rows extended; no new item or future implementation. No clean approval, aggregate addition, business-rule/ATS proof or main checkoff. Main 52 frozen/future 28 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Six inventory candidates/157 pages remain for evidence resolution. Full regression PID 31254 independently confirmed live at elapsed 1:52:52; terminal results unavailable.
