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


### Direct interpreter disabled-access credit: all 23 pages observed

Completed existing `single-form8826-direct-interpreter-credit`. Read complete source inputs and actual singular single filer Alex/111223333, all native leaves/attributes across 11 documents, and all 23 pages through 17 direct views and six independently verified exact retained observed-image matches. Pending calculations were not fully reviewed. Private `single-form8826-direct-interpreter-credit-twentythree-page-independent-observation.json` retains 26 artifact/image hashes, page notes, source/owner/business joins, native amount assertions and independent conditional arithmetic. All current prepared manifest hashes and 2,590 runtime hashes verified unchanged. Synthetic prior-return/payroll references, invoice/payment/ADA assertions and W-2 facts remain unauthenticated.

Entered prior receipts 500,000/full-time employees 20/no predecessor/common control meet conditional small-business eligibility. One interpreter expense 5,000 less minimum 250 gives 4,750 × 50% = 2,375 credit. [IRS Form 8826 instructions](https://www.irs.gov/pub/irs-pdf/f8826.pdf) require the credit reduction against eligible deductions. Separately reduced Schedule C line 27b and actual Part V description show 2,625; receipts 100,000 give profit 97,375. W-2 wages/SS wages 100,000/SS withholding 6,200/Medicare withholding 1,450/federal withholding 20,000 reconcile conditionally. SE earnings 89,926/remaining SS base 76,100 yield SS tax 9,436/Medicare 2,608/SE 12,044/half 6,022. AGI 191,353/QBI 91,353/before-QBI taxable 175,603 remain below single threshold; deduction 18,271 below income limit 35,121 gives taxable 157,332/reg tax 30,607. AMTI 173,082/exemption 88,100/TMT 22,095/AMT zero and ordinary credit limit 8,512 permit full 2,375. No additional Medicare tax applies. Tax 40,276/owed 20,276 reconcile.

Actual Form 8826 page 22 correctly shows credit 2,375 on direct line 6 and total line 8, with pass-through line 7 blank. Native IRS88268 is referenced by Form 3800 IRS38006, which carries 2,375 on actual Part III line 1e/current/applied and joins Schedule 3/Form 1040. Existing fixture reviewFocus incorrectly calls this line 7: new future-only metadata row, unworked. Profitable Schedule C loss-only 32 boxes are correctly blank; no joint-header or SE wage-maximum skip applies.

Form 3800 page 13 fills skipped 18/19 each 16,571, 20=14,036 and 21=11,661 without empowerment/renewal credit, omitted by native: fifty-seventh qualified observation, extending only the existing future row. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 29 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Five inventory candidates/134 pages remain for evidence resolution. Full regression PID 31254 independently confirmed live at elapsed 1:54:28 with advancing output; terminal results unavailable.


### Agricultural biodiesel producer: all 23 pages observed

Completed existing `single-agri-biodiesel-producer-credit`. Read complete source inputs and actual singular single filer Alex/111223333, all native leaves/attributes across 11 documents, and all 23 pages through sixteen direct views and seven independently verified exact retained observed-image matches. Pending calculations were not fully reviewed. Private `single-agri-biodiesel-producer-credit-twentythree-page-independent-observation.json` retains 26 artifact/image hashes, source/business/owner/lot joins, page notes, native amount assertions and independent conditional arithmetic. Current prepared manifest hashes and all 2,590 runtime hashes verified unchanged. Registration, capacity, production, feedstock, invoice and buyer-use references/assertions are not authenticated external records.

Alex/T/111223333 business `id-agri-fuel-2025`/EIN 825555123 agrees with proprietor and producer review. Entered capacity 2 million gallons, no common-control group and two qualifying lots total 2,500 gallons, sold July 20 (500 produced June 1, 2,000 July 10). US/CA feedstock and stated buyer uses meet conditional [IRS Form 8864 instructions](https://www.irs.gov/instructions/i8864); sale date controls the post-June 20-cent rate. Credit 500 joins actual line 8 gallons 2,500 and lines 9/11 amounts 500. No transfer/pass-through; transfer registration field A appropriately blank despite asserted Form 637 producer registration. Schedule C receipts 10,000 plus credit income 500 give profit 10,500. Form 6251 subtracts the same 500 for AMT.

W-2 wages/SS wages 75,000/SS withholding 4,650/Medicare withholding 1,087.50/federal 11,000 reconcile conditionally. SE earnings 9,697/remaining SS base 101,100 yield SS 1,202/Medicare 281/SE 1,483/half 742. AGI 84,758/QBI 9,758/before-QBI taxable 69,008 give deduction 1,952 below income limit 13,802/taxable 67,056. [2025 IRS tax table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) single interval 67,050–67,100 gives regular tax 9,671. AMTI 82,306 below exemption 88,100 gives TMT/AMT zero/ordinary limit 9,671 permitting credit 500. Tax 10,654/refund 346 reconcile. Native IRS88648→IRS38006→Schedule 3/Form 1040 references and actual Part III line 1l current/applied 500 agree. Profitable C loss-only boxes blank; no joint-header or SE maximum-wage skip applies.

Form 3800 page 13 fills skipped 20=9,671 and 21=9,171 (18/19 blank) without empowerment/renewal credit, omitted by native: fifty-eighth qualified observation. Existing future row extended only; no new item or future implementation. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 29 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Four inventory candidates/111 pages remain for evidence resolution.

### Full typed regression: terminal pass with current runtime provenance

The fresh restored-tool full command completed at `2026-10-07T17:29:15.616825+00:00`, started `2026-10-07T15:29:18.409660+00:00`, exit 0: **12,255 passed / 0 failed (119m56s)**. Command: `PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`; tested commit `ecdccee1e5959be5dd11df8d7c7138187b47a7e9`. Deno 2.9.4/V8 15.0.245.2-rusty/TypeScript 6.0.3, Poppler 26.09.0 and libxml 2.9.13. This is the normal typed task; `.state/research/` is excluded by the repository task configuration. No observed failure or ignored-result markers; the terminal summary omits an ignored count, so an explicit summary-reported zero ignored is not claimed. No ignored-test reasons were printed.

Independently verified terminal status/log digest `b3f7dc4a482426a133e75cf16dd69031a015d5dbf367b609e7520217a3e70219`, launch-manifest digest `6fddb6dba76e7d13d32d2b941f3ff5af7eda9933c3a7b0d848c26290039e0a63`, and all 2,590 launch runtime file hashes against the current checkout: unchanged. Private `full-regression-after-tool-restore-terminal-independent-observation.json` retains status, command/task definition, versions/timestamps, current hash verification and focused/interrupted evidence digests. The original 12,213/42 and SIGTERM/143 incomplete run remain retained; they do not contradict this subsequent terminal pass.

Top compact learnings now report the full green regression, and the post-reopening MeF estimate no longer lists regression as unresolved. Main full-batch row stays unchecked because it explicitly requires complete retained routes and scope decisions first; those broader prerequisites remain open. Full local regression does not prove source authenticity, complete route/PDF parity, matching IRS business rules or ATS acceptance. No main scope change/checkoff; top MeF estimate remains zero IRS acceptances before tomorrow during the scheduled outage, with post-reopening probability unestimable.


### Startup and auto-enrollment credits: all 23 pages observed

Completed existing `single-form8881-startup-and-auto-enrollment`. Read complete source inputs and actual singular single filer Alex/111223333, all native leaves/attributes across 11 documents, and all 23 pages through sixteen direct views and seven independently verified exact retained observed-image matches. The initial combined page 22/23 image output was truncated; both were subsequently viewed individually. Pending calculations were not fully reviewed. Private `single-form8881-startup-and-auto-enrollment-twentythree-page-independent-observation.json` retains 26 artifact/image hashes, page notes, source/business/owner joins, native amount assertions and independent conditional arithmetic. Current prepared manifest hashes and all 2,590 runtime hashes verified unchanged. Synthetic plan, prior-plan, employee, cost/payment and amendment/maintenance assertions do not authenticate external evidence. Common-control/predecessor facts remain unproved.

Entered prior qualified employees 20 and non-HCE participants three make startup credit 750 on costs 4,000, with first credit year and plan effective January 1, 2025. Maintained eligible auto-enrollment arrangement first included January 1, 2025 yields separate 500 under the [Form 8881 instructions](https://www.irs.gov/instructions/i8881). Actual page 22 shows line A 20, costs lines 1/2 4,000, non-HCE three/base 750, startup lines 5/8 750 and enrollment lines 9/11 500. Employer contribution, military-spouse and pass-through fields appropriately blank for entered facts. Both native groups reference IRS88818 and separately join Form 3800 Part III lines 1j/1d for total 1,250, then IRS38006→Schedule 3/Form 1040.

Source boolean asserts startup deduction reduction, but no before/after deduction or destination is supplied. Actual Schedule C/native total expenses are zero and profit 10,000. The requirement to reduce an otherwise allowable deduction by credit does not prove the remaining 3,250 was claimed, required or otherwise allowable. This unresolved source reconciliation is recorded as a new future-only item, unworked; no tax-understatement defect inferred. Conditional on entered zero expenses, W-2 wages/SS wages 120,000, SS withholding 7,440, Medicare withholding 1,740 and federal withholding 20,000 reconcile. SE earnings 9,235/own remaining SS base 56,100 give SS 1,145/Medicare 268/SE 1,413/half 707. AGI 129,293/QBI 9,293/before-QBI taxable 113,543 give deduction 1,859 below income limit 22,709, taxable 111,684 and regular tax 19,651 (single 24% minus 7,153). AMTI 127,434/exemption 88,100/TMT 10,227/AMT zero and ordinary limit 9,424 allow full 1,250. No additional Medicare tax applies; total tax 19,814/refund 186 reconcile. Profitable Schedule C loss-only boxes blank; no joint-header or SE wage-maximum skip applies.

Form 3800 page 13 fills skipped 18/19 each 7,670, 20=11,981 and 21=10,731 without empowerment/renewal credit, omitted by native: fifty-ninth qualified observation, extending only the existing future row. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 30 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Three inventory candidates/88 pages remain for evidence resolution. Full typed regression remains terminal green at 12,255 passed/0 failed, exit 0; current runtime hashes match its launch evidence.


### Two independent WOTC owners, one phase-in: all 30 pages observed

Completed existing `joint-both-owner-wotc-one-phasein`. Read complete source inputs and actual singular MFJ filer Alex/111223333 and Sam/444556666, all native leaves/attributes across 15 documents including both Schedule C/SE copies, and all 30 pages through sixteen direct views and fourteen independently verified exact retained observed-image matches. Pending calculations were not fully reviewed. Private `joint-both-owner-wotc-one-phasein-thirty-page-independent-observation.json` retains 33 artifact/image hashes, prior-audit digests, page notes, per-owner source/business/payroll joins, native amount assertions and independent conditional arithmetic. Current prepared manifest hashes and all 2,590 runtime hashes verified unchanged. Synthetic section 52/spousal-attribution exceptions, ownership, certification, payroll and SSA assertions do not authenticate external records. Both worker W-2 review records lack employee SSN, employer EIN and certification/payroll identifiers; supplied direct reviews join employers/owners conditionally.

Two workers have entered 6,000 qualified wages/400 hours, yielding 2,400 credit per employer and 4,800 total. Full determined credits reduce each wage deduction to 3,600. Alex/T/EIN 123456789 receipts 6,000 produce profit 2,400; Sam/S/EIN 987654321 receipts 350,000 produce profit 346,400. Separate reciprocal no-aggregation and independent-employer controls match both owners. Only external W-2 belongs to Alex: wages/SS wages 150,000.37/SS withholding 9,300.02/Medicare withholding 2,175.01/federal 60,000. Alex SE earnings 2,216/own remaining SS base 26,100 give SS 275/Medicare 64/SE 339/half 170. Sam earnings 319,900/full own base 176,100 give SS 21,836/Medicare 9,277/SE 31,113/half 15,557. Business total 348,800/SE 31,452/half 15,727 give raw AGI 483,073.37→filed 483,073.

Before-QBI taxable 451,573 yields joint excess 56,973/phase 56.973%. Alex QBI 2,230/twenty-percent 446 is below wage limit 1,800: Part III correctly blank for A. Sam QBI 330,843/twenty-percent 66,169/wage limit 1,800 yields reduction 36,673/component 29,496. Total deduction 29,942 is below income limit 90,315. Actual [Form 8995-A](https://www.irs.gov/pub/irs-pdf/f8995a.pdf) pages 29/30 and native business groups agree. Taxable 421,631/reg tax 89,048 (MFJ 32% minus 45,874)/AMTI 453,131/exemption 137,000/TMT 83,735/AMT zero permit specified credit 4,800 within limit 73,036. Native IRS58849→IRS38008→Schedule 3/Form 1040 references agree. Both profitable C loss-only boxes blank; neither owner has a wage-maximum skip. NII zero produces no NIIT.

New cross-form discrepancy: actual Form 8959 page 27/native line 8 contains 322,117 (raw earnings 2,216.4+319,900.4 rounded once) versus filed Schedule SE line 6 amounts 2,216+319,900=322,116. [Form 8959 instructions](https://www.irs.gov/instructions/i8959) require combining Schedule SE line 6 amounts. Local `F8959-010-02` explicitly describes that equality but is an `alwaysPass` stub. No applicable-date IRS rejection or full business-rule pass claimed. Either base yields rounded Additional Medicare tax 1,999, so reviewed final tax 117,699/owed 57,699 is unchanged. New future-only row recorded, unworked.

Form 3800 page 17 fills skipped 18/19 each 62,801 and 20/21 each 26,247 without empowerment/renewal credit, omitted by native: sixtieth qualified observation. Joint Form 6251 page 26 shows only Alex in its name header. Existing future rows extended; no future implementation. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 31 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Two inventory candidates/58 pages remain for evidence resolution. Full typed regression remains terminal green at 12,255 passed/0 failed, exit 0, with current runtime hashes unchanged.


### Two independent WOTC owners, partial credit above range: all 30 pages observed

Completed existing `joint-both-owner-wotc-partial-above`. Actual singular MFJ filer, reviewFocus, general facts and independent-employer controls are byte-equivalent after parsing to the fully read one-phase-in source. Read changed business scalars/external W-2; checked every key/leaf of all 160 employee W-2/certification/payroll/direct-review records against the two fully read worker templates with unique reference indexes 0–79 per employer. No other source differences in those records. Read all native leaves/attributes across 15 documents including both Schedule C/SE copies, and all 30 pages through eighteen direct views and twelve independently verified exact retained observed-image matches. Pending calculations were not fully reviewed. Private `joint-both-owner-wotc-partial-above-thirty-page-independent-observation.json` retains 33 artifact/image hashes, prior-audit digests, page notes, source/owner assertions, native checks and independent conditional arithmetic. Current prepared hashes and all 2,590 runtime hashes verified unchanged. All section 52/ownership/payroll/certification/SSA review references remain synthetic; employee W-2 metadata lacks employee SSN, employer EIN and certification/payroll identifiers. Conditional joins are not authenticated external records.

Each employer has 80 entered workers with wages 6,000/hours 400, yielding credit 192,000 per business/384,000 total. Each full determined credit reduces wages 480,000 to deduction/QBI wages 288,000; receipts 600,000 produce profit 312,000 per owner/624,000 joint. Alex/T/111223333/EIN 123456789 owns the external W-2: wages 300,000/SS wages 176,100/SS withholding 10,918.20/Medicare withholding 5,250/federal withholding 60,000. Alex earnings 288,132 after own SS maximum give SS zero/Medicare 8,356/SE 8,356/half 4,178. Sam/S/444556666/EIN 987654321 has no own W-2; earnings 288,132/full SS base 176,100 give SS 21,836/Medicare 8,356/SE 30,192/half 15,096. Joint SE 38,548/half 19,274 produce AGI 904,726.

QBI Alex 307,822/twenty-percent 61,564 and Sam 296,904/twenty-percent 59,381 are each below wage limit 144,000. Before-QBI taxable 873,226 exceeds upper threshold; actual Form 8995-A Part III appropriately blank/native phase fields absent. Deduction 120,945 below income limit 174,645 gives taxable 752,281. [IRS 2025 tax worksheet](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) MFJ rate 37% less 75,937.50 yields regular tax 202,406. AMTI 783,781/exemption 137,000/TMT 176,317/AMT zero give specified credit limit 158,054. Current allowed credit 158,054 joins IRS58849→IRS38008→Schedule 3/Form 1040; unused 225,946 is not proof of a durable carryover ledger. Full credits still determine wage reduction. Form 8959 here correctly joins filed SE amounts 288,132+288,132=576,264. Additional Medicare 450 wages+5,186 SE=5,636; box 6 withholding 5,250 less regular 4,350 gives additional withholding 900/Form 1040 line 25c. Tax 88,536/payments 60,900/owed 27,636 reconcile. NII/NIIT zero; both profitable C loss-only boxes blank.

Actual Form 3800 page 17 fills skipped 18/19 each 132,238 and 20/21 each 70,168 without empowerment/renewal credit, omitted by native: sixty-first qualified observation. Joint Form 6251 page 26 shows only Alex; primary SE page 12 fills wage-maximum skipped 8d 176,100 and 9/10 zero with 8c blank/native zero intermediates. Only existing future rows extended, no new item or future implementation. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 31 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. One inventory candidate/28 pages remains for evidence resolution, not a claim that the rest of the board is complete. Full typed regression stays terminal green 12,255 passed/0 failed, exit 0/current runtime hashes unchanged.


### Event-service qualified tips with WOTC: all 28 pages observed

Completed existing `qualified-tip-qbi-advanced-event-wotc-tip-exclusion`. Initial whole JSON output was truncated; complete inputs, actual singular single filer Alex/111223333, reviewFocus and expected form list were safely re-read separately. Read all native leaves/attributes across 13 documents and all 28 pages through eighteen direct views and ten independently verified exact retained observed-image matches. Pending calculations were not fully reviewed. Private `qualified-tip-qbi-advanced-event-wotc-tip-exclusion-twentyeight-page-independent-observation.json` retains 31 artifact/image hashes, prior-audit digests, page notes, source/owner/business/credit references, native assertions and independent conditional arithmetic. Current prepared hashes and all 2,590 runtime hashes verified unchanged. ReviewFocus and employee review describe actual/issued records, but payer/tip/occupation/SSA/payroll/certification facts are references/assertions without authenticated issuer bytes. Employee review lacks SSN, EIN and certification/payroll identifiers; no direct-employer worker review supplied. Existing future metadata rows extended, unworked.

Alex/T event business `REVIEW-WOTC-BUSINESS-1`/EIN 123456789 receives one NEC from Example Events/TIN 987654321/account EVENT-TIPS-2025 with box 1 receipts 260,000 including entered qualified tips 30,000/occupation 102. No separate W-2 or additional receipts. One worker wages 6,000/400 hours yields WOTC 2,400, reducing wages to 3,600 and profit to 256,400. SE earnings 236,785/full own SS base 176,100 give SS 21,836/Medicare 6,867/SE 28,703/half 14,352 and AGI 242,048. Entered business-tip cap 25,000 is below profit after half-SE; MAGI excess 92,048/1,000 rounded down to 92 produces reduction 9,200/tip deduction 15,800. Actual [Schedule 1-A](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf) pages 5/6 agree, with other deduction parts blank and line 38 total 15,800.

Conditional on the entered deducted-tip exclusion, QBI 256,400−14,352−15,800=226,248/twenty-percent 45,250 and wage limit 1,800. Before-QBI taxable 210,498/excess 13,198/phase 26.396% yield reduction 11,469/component 33,781 below income limit 42,100. Actual Form 8995-A pages 27/28 and native agree. This arithmetic observation does not independently approve wider legal/source eligibility for tip exclusion. Taxable 176,717/reg tax 35,259 (single 24% minus 7,153)/AMTI 192,467/exemption 88,100/TMT 27,135/AMT zero permit credit 2,400 below specified limit 32,694. Native IRS58848→IRS38007→Schedule 3/Form 1040 references agree. Additional Medicare SE excess 36,785 gives 331, with no wage tax/withholding. NIIT zero. Total tax/owed 61,893 reconcile. Profitable Schedule C loss-only boxes blank; no own wage-maximum skip or joint header applies.

Actual Form 3800 page 15 fills skipped 18/19 each 20,351 and 20/21 each 14,908 without empowerment/renewal credit, omitted by native: sixty-second qualified observation. No clean approval, aggregate addition, source authentication, business-rule/ATS proof or main checkoff. Main 52 frozen/future 31 unworked; aggregate remains 75 bounded passes / 267 packets / 2,706 pages. Full typed regression stays terminal green 12,255 passed/0 failed, exit 0/current runtime hashes unchanged.

### Former 49 inventory misses: indexing resolution complete, approval unproved

Fresh private `prepared-review-inventory-reconciliation-20261007T175609Z.json` verifies all 1,083 prepared source/XML/PDF hashes across 361 packets/4,714 pages, all 75 bounded batch manifests and unchanged aggregate. It locates 47 explicit-ID qualified observations with no artifact discrepancies. Its two remaining index misses are `single-k-mixed-duplicate-personal` and `single-k-mixed-error-duplicate-personal`, already observed in retained `mixed-k-duplicate-error-two-packet-observation.json`. Final private `prepared-review-final49-index-reconciliation-20261007T1756.json` rechecks that immutable audit digest, all 34 declared artifact/image hashes and each packet’s 1–14 reported page coverage. Earlier supplemental multi-packet evidence remains retained. Exploratory lookups initially used the wrong pages/list key; the first final-reconciliation helper then failed by resolving retained root-relative hash paths against the repository cwd. Corrected lookups use fixtures/pageReview and resolve hashes against the retained audit root; all 34 hashes subsequently passed before the final private reconciliation file was saved. No existing evidence was mutated.

All formerly 49 misses now have located qualified observations: 47 individual and two multi-packet. This is indexing resolution, not a new visual review of older packets or a claim of full source/native/BR/ATS approval. Known discrepancies and unauthenticated sources persist. No new aggregate passes or main checkoffs. Further existing board requirements, guard dispositions, route completeness, business rules, source authenticity and IRS acceptance remain open.


### Eleven guarded fixture dispositions: current graph/native replay

Replayed exactly the eleven retained preparation rejections through the current public Form 1040 executor, `buildPending` and native bundle builder. Normal typed command `deno run --allow-read --allow-write .state/research/board-execution-2026-10-07/guarded11-current-replay-20261007T1800.ts` completed exit 0 at commit `d63cf5246`, start `2026-10-07T18:02:05.862Z`, end `2026-10-07T18:02:05.906Z`. All eleven rejection reasons exactly match the original retained preflight; no case became a prepared positive packet. The script's success means expected guard behavior matched, not successful filing. Current source-input/filer serialization hashes are retained per case; complete source semantics were not independently approved by this replay.

| Cases | Current stage and reason | Existing requirement still open |
| --- | --- | --- |
| One Form 8862 CTC fixture | Native exporter rejects after final-credit joins for executor-owned prior IRS notice issuance/content authentication. | Authoritative prior-notice evidence, broader claimant/source review and positive export remain open. |
| Two withheld W-2G fixtures | Native preflight requires the exact attached payer PDF; each fixture supplies zero attachments. | Source-issued contents/bytes/signature, required attachment and full-return authenticity remain open. |
| Seven direct-QEI Form 8874 fixtures | Attachment coverage blocks native and PDF claims until authenticated CDE status and recapture history. | Issuer authentication/current status/history and positive retained route remain open; old visual/XSD evidence does not override the present guard. |
| One Form 461 synthetic fixture | Public calculation stops in Form 8995: net QBI loss needs the sourced carryforward route. | Existing future-only review-fixture reconciliation remains unworked; this is not a newly completed Form 461 route. |

Current rejection sites were read in `mef/forms/f8862.ts`, `mef/w2g-payer-copy.ts`, `attachment-coverage.ts`, and the Form 8995 node. The private script writes new evidence only; original preflight, prepared files and other audits remain untouched. Exploratory filenames for the old script/Form 8874 note were incorrect and were corrected using actual file inventory. The combined historical gap-note read was truncated; this current classification rests on safely read original rejection records, actual guard code and terminal current replay, not an assertion of complete historical-note review.

Private `guarded11-current-replay-20261007T1800.json/.log/.ts` and `guarded11-current-replay-independent-observation-20261007T1800.json` retain times, Deno versions, all diagnostic/input hashes and the exact command. Log SHA-256 `cf3998786de7d2b0eca3a94671e7c5d4f7d8b098128b1b3e43631cf37b16c0d7`. Independently verified all 2,590 runtime hashes against the green full-run launch manifest: unchanged. No XSD/PDF/business-rule/ATS acceptance was attempted or claimed for rejected cases; these local safety boundaries are not named user-approved exclusions. No guard removed, future item implemented, aggregate increase or main checkoff. Main 52 frozen/future 31 unworked; combined passing aggregate stays 75 batches/267 packets/2,706 pages, full regression 12,255 passed/0 failed. Top MeF estimate unchanged.

## October 7: current uncovered PDF keys and filing boundaries

At commit `041564653`, a normal typed live-import audit completed exit 0 on October 7 at 18:07:50 UTC: **372 fixtures, 152 native descriptors / 148 keys, 118 PDF descriptors / 115 keys, 99 expected keys and 16 uncovered keys**. These are expected-fixture inventory counts, not positive filing or page-review counts.

| Uncovered PDF keys | Current boundary and remaining existing work |
| --- | --- |
| `f5471_parent`, `f5471_schedule_e`, `f5471_schedule_h`, `f5471_schedule_i1`, `f5471_schedule_j`, `f5471_schedule_m`, `f5471_schedule_p`, `f5471_schedule_q`, `f5471_schedule_r`, `form8992`, `form8992_schedule_a` (11) | `attachment-coverage.ts` blocks active Form 5471 for Schedule R treatment/reference linkage; owned worksheet records have an earlier worksheet/election/consent/prior-books guard. Native Schedule 1 independently rejects positive 8n/8o inclusions. Resolve the existing source/attachment/business-rule boundaries before claiming complete foreign filing output. |
| `f4255` | Positive printable rows need authenticated prior-return and IRS determination bytes. |
| `f8854`, `f8854_annual` | Initial printable records need authenticated prior returns, compliance and balance-sheet evidence; annual records need authenticated prior-filed obligation history. |
| `f965` | This key is the registered Form **965-A** PDF, not proof of Form 965 parent coverage. Positive PDF needs verified prior-filed liabilities and actual installment payments. The descriptor separately restricts its source to one unadjusted original 2017–2020 installment liability. |
| `form8990` | The public two-pass executor in `index.ts` always appends an error diagnostic that its calculated workpaper remains unfileable pending source evidence and a durably persisted accepted-filing carryforward ledger. The real review generator rejects any executor diagnostics at lines 116–121. Individual descriptor projections are insufficient to bypass this gate. |

Six isolated synthetic `assertAttachmentCoverage(..., "pdf")` activations produced their expected exact guards: two Form 5471 cases, one 4255, initial/annual 8854, and 965-A. **These are negative unit-level boundary probes, not source-backed positive full returns**, and do not count as additional passing packets or user-approved exclusions. The current Form 8990 integration test asserts the unfileable diagnostic; its four integration cases and stored-workpaper cases are already present as passing in the terminal full regression. No redundant full suite was rerun.

Private evidence: `uncovered16-current-boundaries-20261007.ts/.json` and `uncovered16-current-boundaries-independent-20261007.json` under the October 7 execution research root. JSON SHA-256 `33555f92f78281c5e94a091627af3a09030ebd51c18eb491cad7e9a19a5a903b`. Independent verification confirms all **2,590** runtime hashes still match the green full-run launch manifest. Existing prepared packet, planner and original rejection evidence were not overwritten. Exploratory guessed MeF paths were nonexistent; actual files were located before classifying these boundaries. No new TODO or future implementation was introduced. Main 52 / future 31 unchanged; aggregate 75 batches / 267 packets / 2,706 pages unchanged. This resolves the current inventory's next-action classification, not the broad coverage TODO.

## October 7: ATS terminal regression scope reconciled

Corrected the ATS preparation page's stale running-full-test statement using the verified terminal full-run status/log. Extracted all seven actual `e2e/ats` groups: 3+2+6+2+4+3+32 = **52 local passes**, with exact terminal test names retained privately in `ats-terminal-test-scope-20261007.json`. Independent log digest and 2,590 runtime hashes match. The separate 18 ordinary synthetic `e2e/scenarios.test.ts` tests do not count as official ATS cases. Safely read Scenario 8/13 source tests confirms that green includes deliberate full-PDF payer rejection and unresolved Form 8911 diagnostics; it is not complete positive filing proof. Scenario 3's current builder already captures Schedule D aggregate lines but withholds invented transactions and blank Form 4835 identity. The official Scenario 3 PDF was opened for source context; no absent facts were filled.

Requested the secure locations of authorized enrollment/service/business-rule evidence and IRS responses to the retained clarification draft; no external message was sent. Main 52/future 31 remain unchanged, aggregate 75/267/2,706 unchanged. No future task implemented, acceptance claimed or main checkoff. ATS source completeness and external administrative gates remain open.

## October 7: existing Form 7203/9465/Schedule J task triage

Read compacted learnings first. The current Form7203 debt contract and latest gap-note appendices already cover multiple written notes, open accounts and overflow; remaining prior-history/restoration/gain authentication is not bypassed. Current ScheduleJ source code and later proof notes already cover independently sourced nonfarm wages and multiple owned fishing/farm cases; older narrow historical descriptions do not establish a new missing implementation. An exploratory calculation-node path was nonexistent and corrected through actual file inventory. Combined historical ScheduleJ/9465 reads were truncated; conclusions use separately read current code, latest appendices and safely bounded source sections. No claim of fully reading the truncated historical output.

The existing Form9465 authorization research found current IRS IRM5.19.1.6.4.13(6)'s recognition of attached electronically signed requests. Its DDIA context does not specify the staged non-direct-debit request's software consent/signature representation. The precise primary-source limit is recorded in the existing [9465 boundary](ty2025-form9465-filing-boundary.md), with nine dedicated terminal full-regression passes extracted and all2,590 current runtime hashes verified privately in `form9465-current-boundary-20261007.json`. This replaces stale “all unrun” framing but leaves both export guards and descriptor nonregistration intact. Main52/future31 unworked/unchanged, existing passing aggregate75/267/2,706 unchanged; top MeF estimate remains unchanged.

## October 7: complete frozen requirement inventory and checkoff limits

The private `frozen52-completion-evidence-index-20261007.json` indexes **all52** existing main requirements:47 top-level rows plus five nested rows. A top-level-only exploratory print omitted the nested rows; the completed anchored-whitespace scan includes them. It verifies the main section against frozen baseline `0c6ae76a32d12373956d4f8e47564811185c60d7`, records every linked file's existence/digest, and retains exact requirement text. All file references exist. IndexSHA256 `f36de60e9b2f564dd506969f8387e930ebb7f858cb50d28542ae96219239f160`. **Reference existence/digests do not semantically verify every requirement or linked note.** No requirement is marked complete by this inventory.

Current completion gates remain distinct: local full-regression results, qualified prepared packet observations, source/authentication and unsupported-route decisions, matching IRS business rules, authorized transport/account evidence, complete ATS scenario facts, and IRS acknowledgments. The current coverage queue explicitly records agreed exclusions only for standalone1040NR/1040SS/4868 and dual-status1040 e-file; a current guard is not another approved exclusion. Requested a named scope decision without treating general permission as authority to bypass evidence or acceptance. The earlier request for secure authorized-package and IRS-clarification locations remains pending. No new future item was implemented.

Future31 includes known output/source discrepancies and remains frozen under the user's explicit instruction. Consequently these qualified packets do not prove broad error-free native/PDF parity or a filing-ready release. The active goal remains incomplete. This inventory does not claim that every possible internal implementation task is exhausted or that the goal can already be marked blocked; unsupported-branch implementation and per-row semantic audits still need their existing evidence standards. No runtime change, redundant full test, passing-count increase or main checkoff.

## October 7: actual public-graph holding-only staged artifact

An actual `f1040_2025.executeReturn` calculation now supplies the pending data
for a one-lot holding-only staged projection. The synthetic opening and closing
lot both retain QOF EIN123456789, acquisition April15,2021, description “Five
percent QOF interest” and **50,000 long-term deferred gain**. There are no current
additions, sales, special codes or uninvested balances. These references are
explicitly labeled synthetic/unverified; no accepted prior return or issuer
origin is established.

The actual registered `single-w2-refund` source/filer supplies the surrounding
return: wages75,000, withholding11,000, standard deduction15,750, taxable
income59,250, tax7,955 and refund3,045. All Form1040 pending fields are exactly
unchanged by the holding-only source. The staged descriptor's actual field
projection and common `fillFormPdf` helper produce a flattened form; its
pageIndices0/1 yield **two real filled pages**, both rendered and visually
reviewed. PartI/IV lots and totals match the source and staged XML. PartsII/III
and the disposition checkbox are blank; foreign No is checked and the skipped
waiver question is blank, consistent with the [official2025 form](https://www.irs.gov/pub/irs-prior/f8997--2025.pdf).

The actual standalone `IRS8997` element, with required namespace/documentId,
passes `xmllint` against the locally cached TY2025v5.4 IRS8997 XSD and its
includes, exit0. This is **not** a full Return1040 XSD or business-rule result.
Both real full MeF and PDF exporters still reject with the annual-document
guard. No descriptor was registered and no source/authentication guard was
relaxed; activation prerequisites above remain open. Historical “no PDF filled
or rendered” wording is superseded only for this staged holding artifact.

Private artifacts are under
`.state/research/board-execution-2026-10-07/form8997-holding-artifact-v2-20261007/`:
source/pending/filer/projected values, XML, two-page PDF, both rendered images,
raw filled four-page template before declared page selection, canonical cached
IRS template and independent audit. PDFSHA256
`64ccee6917fbdfc17a22a3276d4915987c9b3c57cadcbd667071262c4be2544f`;
XMLSHA256 `83d0cffa8b6067407f77a78f3cd10733803d90d6655f3492b991cfd88624af21`;
templateSHA256 `97589000d39b67737c516763bc4b89a167a3c18b47163517e98490144f4f5a4b`.
All2,590 runtime hashes still match the green full-run manifest. First attempts
failed for missing umask permission and an incorrect assumption that the fill
helper itself selects form pages; v2 preserves the four-page intermediate and
applies the staged descriptor's declared selection. This is an artifact-review
prerequisite, **not a new positive filing packet**; passing aggregate75/267/2,706,
main52 and future31 remain unchanged. No new future task implemented or main
checkoff, complete Form8997 support, authentic prior history, IRSBR or ATS
acceptance is claimed.

## October 7: current deferral/inclusion staged artifact from actual graph rows

The existing staged test source was replayed through the actual public graph
alongside `single-w2-refund`. Original asserted calculated row values were
removed from its input array; the executor itself derives and deposits all
three Form8949 and ScheduleD transactions. They match exactly: eligible stock
sale30,000−10,000=20,000 short gain; separate QOF codeZ −20,000 short deferral;
QOF codeY sale20,000−10,000+10,000 inclusion=20,000 long gain. Conditional
ScheduleD totals are short0/long20,000; Form1040 carries capitalgain20,000,
AGI95,000, taxable79,250, tax10,955 and refund45. The public Form8997 node
still emits its expected blocking diagnostic. These are **conditional synthetic
source values, not verified issuer, prior filing, basis history or election
eligibility**; no broad legal/source approval follows from matching arithmetic.

The actual staged descriptor produces two flattened pages, both rendered and
visually inspected: PartI old-lot long50,000; PartII new-lot short20,000;
PartIII old-lot inclusion long10,000; PartIV old-lot long40,000 and new-lot
short20,000. Each date, EIN, description and total matches the staged XML.
ForeignNo is checked, waiver boxes skipped, no1099B disposition checked.
StandaloneIRS8997 validates against cached TY2025v5.4 XSD/includes, exit0;
this is not complete Return1040 validation or business-rule approval.

Actual full MeF export rejects QOF codeZ/Y without the registered annual
attachment. Actual full PDF export rejects the fixture's unadjusted PartA
eligible-sale row as also being a ScheduleD direct sale, **before** the QOF
attachment guard. This newly exposed fixture issue is recorded in
`product_board.md`'s separate future_todo and remains unworked; neither source
rows nor production guards were changed to make the replay pass. A standalone
staged projection does not substitute for the missing complete filing route.

Private artifact root
`.state/research/board-execution-2026-10-07/form8997-current-events-artifact-v4-20261007/`
retains actual inputs/filer/pending/projection, graph diagnostics, distinct full
export errors, XML/PDF/template, both viewed images, four-page intermediate and
independent audit. PDFSHA256
`2ebbbb77bff21121e42cd57b31b32bcb2498e4e7e08d49383342e67058149111`;
XMLSHA256 `d056d556acc17c0092dd8464a3da954cb28ade6e58cb89b87f320461d38ec49f`;
auditSHA256 `aa18dd1642ccd41c7655748769fb880c4c93a91c779c9059fcf23aa74f2600f2`.
Earlier private attempts incorrectly asserted the distribution field and then
the holding-only/same native-and-PDF guard; v4 uses the actual ScheduleD
capital-gain field and records the different real guards. Previous scripts and
intermediates remain retained. All2,590 runtime hashes unchanged. No production
change or redundant suite rerun; no descriptor registration, positive full
packet/pass aggregate increase or main checkoff. Main52/future32; current
passing aggregate75/267/2,706 unchanged. Form8997 activation prerequisites and
IRS/source gates remain open.

## October 7: staged continuation sheets for all four parts

The existing five-row PDF limit is now replaced by labeled continuation pages
for each part, with columns (a)-(f), taxpayer name/TIN, row ranges, page numbers,
page subtotals and whole-part continuation totals. The official form's line 1
now receives only the overflow short/long amounts; line 2 retains the complete
part totals. The first five rows remain on the canonical IRS form. The
supplemental hook re-reconciles the executor pending data and rejects a changed
projection or missing filer identity rather than trusting separate caller rows.
The staged descriptor remains unregistered, with all full-filing guards intact.

A new actual public-graph replay repeats the explicitly synthetic current-event
source 17 times with distinct lot/event/transaction IDs: Parts I/II/III each
contain 17 rows and Part IV contains 34. An independent source/XML/PDF comparison
retains all **85 rows: 20 printed plus 65 continuation**, on **12 flattened
pages**. Every rendered page was visually reviewed. Line-1 continuation totals
(short/long) are I 0/600,000; II 240,000/0; III 0/120,000; IV 300,000/560,000.
Standalone IRS8997 XSD validation exits 0. The graph's existing f8997 diagnostic
and both full-export rejections remain: native annual-QOF attachment guard and
PDF Schedule D direct-sale/8949 conflict. This does not resolve the future
fixture row or prove authentic prior filing, issuer source, business-rule
compatibility, final tax treatment, or an accepted return.

The normal typed focused command
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno test --allow-read --allow-write --allow-run=pdftotext forms/f1040/2025/mef/forms/f8997.staged.test.ts forms/f1040/nodes/inputs/f8997`
passes **24/0**, including multi-page retention in all parts, exact five-row
holding boundary, changed totals/rows/checkboxes, missing source joins, and
missing identity. Initial tool-PATH and fixture type errors were corrected
before this passing run. A fresh full regression is required for this change;
the prior 12,255/0 run predates it.

Private evidence:
`.state/research/board-execution-2026-10-07/form8997-continuation-artifact-20261007/`
contains source/actual pending/filer/projected values, XML, filled PDF, 12
rendered images, template cache and independent observation. PDF SHA256
`1505b8c5cfe17d091c13d85affd4ef700bd686b66137dd74c58e87f250673a58`; XML SHA256 `fd832f503c3a8c5c28cf0ce9f3549e5111356ddc54f666625ad86faabdc3fb37`; audit SHA256 `c80d0492e88c1d1dcea36279f0cd533674247c2dbafc7ece5f84c0190814e27c`.
Continuation-sheet staging is implemented and reviewed; the broad Form 8997
board requirement remains unchecked until its activation prerequisites are met.

### Fresh full regression launched after continuation implementation

At `2026-10-07T18:49:15.229443+00:00`, committed runtime `0eb1cd6da977c53d94b6dd8097ae1a6f9c945aaa` launched the normal
`PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test` command. Live executor session `46497`, Deno PID `77046`.
The 2,591-path runtime manifest SHA256 is
`ef4da8782ca007dce3e3e9cce8ae07b4d1f5be8d13efafe8bab0d670dc4d3015`. Only the staged PDF descriptor, its new
continuation helper and staged tests differ from the prior passing runtime.
Private log/status are `full-test-after-8997-continuation.log` and
`full-test-after-8997-continuation.status`; manifest is
`runtime-full-after-8997-continuation-at-launch.json` under the board execution
evidence directory. Running is not a pass. Poll this same live handle and
inspect terminal output and runtime hashes before counting the result; do not
replace the retained prior passing or interrupted logs.

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

## October7: Form8606 summary reconciled to actual source inventory

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

## Form 8997 maximum-length continuation probe — October 7

Verified the existing continuation implementation with 100-character descriptions
on copies 6–17 of the synthetic 17-copy public-graph replay. Independent PDF/XML
comparison retains all 60 maximum-length occurrences; 101 characters are rejected.
All ten continuation pages were visually reviewed without observed clipping or
overlap; the two main-page image hashes match the prior reviewed packet. The
85-row/12-page packet passes standalone IRS8997 XSD. Evidence and SHA256 hashes
are recorded in [the Form 8997 gap](ty2025-form8997-gap.md). All 2,591 runtime
hashes still match the full-regression launch manifest; the same test run remains
live, with no terminal result. Both full-export guards remain. No aggregate
increase, main-board checkoff, future-row implementation or PR creation.

## Form8582 ledger completion-boundary review — October7

Verified all13 ledger test passes in the hash-verified prior full-green log and
matched all8 Form8582 subtree/public-export paths to both tested manifests.
Inspected the current snapshot builder, reader and next-year opening reconciler,
and recorded the tracked non-test TypeScript caller inventory. These helpers
validate entered references and source balances; no production durable store,
authenticated acceptance lookup or2026 engine importer is established.
[The activity-ID gap](ty2025-form8582-activity-id-gap.md) now distinguishes this
passing helper evidence from the still-open existing persistence/import scope.
Private audit SHA256: `06591a4c941128ad994db31fdf5a74ef738c1e91e811e77d4de00775c6d050d8`.
No runtime or future-row work; main52 requirements and aggregates unchanged.

## Existing Form8582 overflow requirement — isolated implementation

Commit `84c4388c5` on `codex/form8582-overflow-20261007` implements source-bound
PartsIV–IX continuation schedules without changing the main runtime under test.
Typed Form8582 suite128/0; actual IRS-template attachments15+12pages all visually
reviewed; all22 activity names per applicable worksheet retained and standalone
XSD checks pass. [The activity-ID gap](ty2025-form8582-activity-id-gap.md) records
private evidence hashes and remaining integration/full-public-graph prerequisites.
The isolated checkout remains at `/tmp/opentax-form8582-overflow-20261007`; its
code is not yet integrated. Main runtime2,591hashes unchanged; same regression
live. Main52 requirements, aggregates and future34 rows remain unchanged.

## Form8582 isolated public-return packet verification

Isolated commit `86cd9dc35`: typed suite129/0; two public-graph22-rental fixtures
produce full XSD-valid returns and49 PDF pages (22new views/27exact reviewed-image
matches). Independent source/native/PDF audit verifies154 Form8582 row sequences,
all22 ScheduleE property addresses/line17/20/21 values per fixture, allocated
losses5,000/0, and Form1040 taxes21,467/22,667 and owed1,467/2,667. Changed utility
source999 rejects at both exports. [The activity-ID gap](ty2025-form8582-activity-id-gap.md)
records hashes and qualifications; private audit SHA256
`2b6d605734b6d173c8156fc606243e7566c855a2ae7732c675a57096e8f5c3f2`.
An apparent ScheduleE blank was a visual misreading, corrected against image and
text evidence before any future-row addition. No new discrepancy retained.
Code remains isolated; main regression live and2,591runtime hashes unchanged.
Main52 requirements, future34 rows and aggregate approvals unchanged.

## Form8582 joint-owner packet review

Completed a27-page isolated public-graph joint-owner audit:11 properties per
owner, both W-2 recipient names/SSNs, ScheduleE amounts and Form1040 totals
reconcile; full XSD passes. Eleven new image views plus16 exact reviewed-image
matches cover the packet. New primary-only Form8582 header observation is
recorded in future row35, unworked; PDF identity parity stays qualified.
[The activity-ID gap](ty2025-form8582-activity-id-gap.md) retains the evidence
and audit SHA256 `3052cef71bc180f0d90475475fd703fc1ff37f29298fd80ce104bbbffe7edb7e`.
Main52 requirements and aggregates unchanged;2,591 runtime hashes unchanged.

## Form8582 retained-sale ledger extension

Isolated commit `820c98563` carries the existing reviewed retained-property-sale
operating-PAL calculation into its ledger contract. PartI/II gains enter the
loss limit without changing operating reporting character; four synthetic
calculator/snapshot/opening-contract observations reconcile. Wider typed
PDF/native/node suite132/0. [The activity-ID gap](ty2025-form8582-activity-id-gap.md)
records evidence hashes and remaining production persistence, acceptance and
engine-import gates. Source authentication and filing guards remain unchanged.
Main2,591runtime hashes unchanged;52 requirements and35 future rows unchanged.

## Form8582 entire-disposition released-loss ledger

Isolated commit `25fefcab7` retains fully released operating losses for the
existing reviewed PartII entire-sale overall-gain route. Both active/other
synthetic snapshots preserve prior3,000/current2,000/allowed5,000/ending0 and
filed-document reference; existing disposition and source validation remain.
Typed PDF/native/node suite133/0. [The activity-ID gap](ty2025-form8582-activity-id-gap.md)
records evidence hashes and qualifications. Production storage, accepted-source
authentication and engine import remain open; main runtime2,591paths unchanged.
No main checkoff, future-row work or aggregate increase.

## Form8582 integration preflight

Read-only preflight confirms the four isolated commits through `25fefcab7`
change exactly five Form8582 code/test paths and apply cleanly to the main
worktree (`git apply --check`, exit0). All2,591 main runtime hashes remain
unchanged. Private audit SHA256
`e2cdd51dd67d51df272736cd6c69c24d4c682a2e0a9a4e0478a80e1085028b35`;
patch SHA256 `28e5782057b46c4f0f47325bd82643615ca9f64ed201fffbf469c570f7124628`,
under `.state/research/board-execution-2026-10-07/form8582-integration-preflight-20261007/`.
The next full-regression driver is prepared with syntax checked, not run; it
requires the current regression's successful terminal result, clean integrated
code matching the isolated hashes, and fresh output paths before launching.
No integration, main-board checkoff, future implementation or aggregate increase.

## Form8997 full regression complete; Form8582 integrated

Normal typed `deno task test` with Poppler on PATH and V8 heap8GiB completed
on `0eb1cd6da`: **12,258 passed /0 failed**, exit0, October7
18:49:15.229443Z–20:49:04.121405Z (119m46s test summary). All2,591 runtime
hashes match the launch manifest. No ignored total is printed in the summary;
no ignored-test lines found. Tools observed at completion: Deno2.9.4,
V815.0.245.2-rusty, TypeScript6.0.3, Poppler26.09.0, libxml2.9.13.
Log SHA256 `924707b651b7a5f913c0b744e214e5bdb8c501e674ccad63b76bbb304023a695`;
terminal audit SHA256 `ed3ebd116d32327922293fdcf7541032a14a5f5bb400324b3a06905290fdf951`,
under `.state/research/board-execution-2026-10-07/`.

After terminal evidence verification, the four isolated Form8582 commits were
cherry-picked cleanly as `cc17659f8`, `630113a3f`, `6380f7a00`, `2a22ebb44`.
All five resulting code/test hashes match the isolated133/0 tested revision.
This integrates worksheet continuation and existing operating-sale ledger
contracts; a fresh integrated full regression remains required. Main52 scope
requirements,35 future rows and aggregate approvals remain unchanged. Existing
acceptance/source/PDF identity qualifications remain; local full green is not
IRS acceptance or closure of the broad phase.

## Integrated Form8582 full-regression launch

Fresh normal typed `deno task test` started October7 20:50:05.560967Z on
`df26ee299cc2c432bbfe969fcd97e309928b666c`, with Poppler PATH/V8 heap8GiB and
tool versions retained at launch. Manifest2,592 paths SHA256
`c2e8ac915e4e9dabb04edbe9dda68f7a723e69cd2f9ef7347728ee9fd55f2048`;
exactly five Form8582 code/test paths changed since the completed12,258/0 run.
Session12057, Deno task PID99655; log/status under
`.state/research/board-execution-2026-10-07/full-test-after-form8582-integration.*`.
Running is not a pass; no main checkoff, future work or aggregate increase.

## Trust K-1 code B current boundary reconciliation

The coverage queue's assertion that intake cannot identify codeB was stale.
Current public input retains a positive cent-precision amount; its read-only
issued-copy review binds hash/readability/owner but leaves printed contents
unverified. The graph does not deposit line25c and both exports remain guarded.
Corrected the queue to match code and the entity-issued root review. The
completed12,258/0 log contains the codeB retention/rejection and review cases.
Private audit SHA256 `6b864302831a7555bc20d63e97b483a0af3028d8648f302508c22579048d3869`,
`.state/research/board-execution-2026-10-07/trust-k1-code-b-current-boundary-audit-20261007.json`.
This does not create a positive route, authenticate an issued copy or close
the broader owner/attachment requirement. All2,592 live-regression runtime
hashes remain unchanged; main52/future35 rows and aggregates unchanged.

## Trust K-1 issued-copy contract inspection

Prepared isolated checkout `/tmp/opentax-trust-k1-copy-20261007` on
`codex/trust-k1-copy-20261007` at `31eac0e9c`; no runtime edits yet. Inspected
the official two-page TY2025 K-1 and74 AcroForm fields, plus cached native
IRS1041ScheduleK1 sequence requiring beneficiary detail. Canonical PDF SHA256
`d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3`;
private inventory SHA256 `efb1aaaa3fe9a4df0672b7c16c188639c3a98805c75800ee74d9f03b471d188c`, under
`.state/research/board-execution-2026-10-07/trust-k1-copy-contract-isolated-20261007/`.
Both blank canonical pages were viewed for source/field layout; they do not
count as filled-output review or authenticate fiduciary issuance. Positive
codeB native/PDF/line25c route remains guarded. All2,592 main runtime hashes
unchanged;52 main requirements,35 future rows and aggregates unchanged.

## Trust K-1 canonical copy extraction — isolated prerequisite

Committed `e0abc16a06d4cea560a3039e1d558b75ab249bf1` in
`/tmp/opentax-trust-k1-copy-20261007`. The extractor retains all 74 canonical
fields from both official pages, verifies static printable text appearances,
and compares EIN, beneficiary SSN and exactly one box13 codeB amount against
the retained byte-bound source. Other income/code fields and checkbox values
are preserved. It does not authenticate fiduciary issuance, whole-page text
or overlays, checkbox appearances or attached statements; printed-content and
issuer verification remain false. Neither export is enabled and no line25c
credit is deposited. Native/source projection and prepared-packet integration
remain required under the existing main trust-K1 requirement.

Normal typed focused command: `deno test --allow-read --allow-write
--allow-net=www.irs.gov forms/f1040/2025/trust-k1-issued-copy-fields.test.ts
forms/f1040/2025/trust-k1-issued-copy-review.test.ts
forms/f1040/2025/trust_k1_backup_withholding.test.ts`: **15 passed /0 failed**.
Cases include full field preservation and continued export guards, rehashed
identity/amount changes, duplicate/missing codeB, malformed amount, missing
field/page, hidden text and stale appearance. A prior14/1 run failed while
constructing an over-length synthetic EIN; shortened the adversarial value
to the official field limit and reran the same command. Both logs retained.
Final log SHA256 `a40d01f7cb766ffa40f1c735aa1f5d729c9e6ef01c7476d353b86c2fdd82ca8d`;
audit SHA256 `ee5498750e1774db679324fbb603c41ac2d5067f1fb446907c3e8ac206fe7663`,
private `trust-k1-copy-fields-focused-v2-audit-20261007.json` under the existing
board execution evidence directory. All2,592 live full-regression runtime
hashes unchanged; frozen main52/future35 rows verified. No aggregate approval
or main checkoff; no future work implemented.

## Trust K-1 complete native source projection — isolated review

Isolated branch `codex/trust-k1-copy-20261007` now contains
`fb15bb76574f1963e3eff0ac87e5c450cae47b88` (complete native copy review) and
`af77d2cd08e22c157f3ca28deb4235b5c98c3c20` (owner suffix/care-of/line2).
The read-only projection covers every scalar income box1–8, box10 and all22
printed code/amount rows in boxes9/11/12/13/14, plus final/amended/1041-T and
beneficiary indicators. A structured recipient transcription must match the
printed beneficiary block and current taxpayer/spouse name/SSN; source address
is retained independently of current return address. Amounts preserve signed
cent values in the source copy and use the existing whole-dollar native
rounding. Code-only, amount-only, statement-only, malformed, negative
nonnegative-type, invalid-date and conflicting-indicator rows reject.

Final normal typed focused command:
`deno test --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov
forms/f1040/2025/trust-k1-native-copy-review.test.ts
forms/f1040/2025/trust-k1-issued-copy-fields.test.ts
forms/f1040/2025/trust-k1-issued-copy-review.test.ts
forms/f1040/2025/trust_k1_backup_withholding.test.ts`: **29 passed /0 failed**.
Four positive native shapes validate against the cached standalone K1 XSD:
all amount rows, foreign-address, spouse-owned, suffix/care-of/second-line.
The retained artifact set separately contains three synthetic source PDFs
and corresponding standalone XML files; all three XSD commands exited0 and
all six rendered pages were viewed. Printed amounts/code rows, negative
amount, date, owner identities, foreign wrap, indicators and instruction pages
match the retained source projection. Starred statements are absent and
explicitly unapproved; this is not full-return or issuer evidence. No packet
approval or aggregate increase.

Final focused log SHA256
`90021e5fc96dc1395bc53ea3c9aa58995f7866b493c2bf6e0844b05d85d42a2a`;
private audit `trust-k1-native-copy-focused-v4-audit-20261007.json` SHA256
`59213b9568a541ab87a39a46ff145bae694324b2de3bb85d2d7577e6c4b844f5`.
Artifact audit `trust-k1-native-copy-focused-v3-audit-20261007.json` SHA256
`53cec46f4b1d0dc9475dc61c9357d68883f6ea3da0a8ce377be1b74612dea09d`.
Artifacts under `trust-k1-native-copy-artifacts-20261007/`; native XSD SHA256
`2173f39e29df9eac28b19ff4ceb83550e137db3a5afb95838b3ad92ef5075621`.
A prior27/1 test result expected a new duplicate-copy error, but the existing
shared byte verifier already rejected it; corrected the assertion without
bypassing that check. All earlier logs retained.

This prerequisite remains unregistered/unintegrated, `filingReady:false`.
Issuer, static-page/overlay and checkbox appearance authenticity are not
proved. Full source/calculation reconciliation, supplementary statements,
line25c and prepared issued-copy packet integration remain required under the
existing main task. Positive exports remain guarded; no main checkoff or
future work. Root live regression's2,592 runtime hashes and frozen52/future35
rows were reverified unchanged.

## Trust K-1 copy/public-source reconciliation — isolated

Committed `7f89d364abe747337263f96fae05523462061ec0` on the isolated trust-K1
branch. Reconciliation compares all12 direct scalar fields and every currently
modeled public code against the exact byte-verified/native-reviewed copy.
Printed unmodeled box9/11/12/13/14 rows reject, rather than being dropped;
missing or changed amounts, issuer-name mismatch and an absent claimed
final-year mark reject. Existing activity, termination, ZZ-credit and
foreign-tax workpaper statement requirements remain explicit and unverified.
The [IRS beneficiary instructions](https://www.irs.gov/instructions/i1041sk1)
require consistent reporting of the issued items and their statements; this
helper does not authorize a codeB credit or authenticate the fiduciary.

Normal typed focused command:
`deno test --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov
forms/f1040/2025/trust-k1-source-copy-reconciliation.test.ts
forms/f1040/2025/trust-k1-native-copy-review.test.ts
forms/f1040/2025/trust-k1-issued-copy-fields.test.ts
forms/f1040/2025/trust-k1-issued-copy-review.test.ts
forms/f1040/2025/trust_k1_backup_withholding.test.ts`: **51 passed /0 failed**.
One prior49/1 run used numeric MeF filing status in a public-input fixture;
corrected it to `FilingStatus.Single` and reran. All logs retained. After the
final passing run only an error message was clarified: trust-name match and
fiduciary-header presence are checked, not fiduciary-header authenticity.

Retained public graph audit: diagnostics empty; interest234.56, ordinary
and qualified dividends100/50, ScheduleD ST/LT30/80, ScheduleE additional
income200, AGI644.56, taxable income0. Source codeB125.25 remains retained;
other withholding/payments0 and both exports reject it. Standalone K1 XML
validates; both source-copy pages were viewed and match identity, amounts and
instruction-page retention. This is **not** a full Return1040 XML/PDF packet
or an accepted credit. New artifacts under
`trust-k1-source-public-graph-20261007/`, PDF SHA256
`d34621958c93d342566e2f5b762226437322560ad5d138e208da51793bcec5ec`,
XML SHA256 `375e1cc7bfec5040f36db2866affccbdb0ea32a0f2c68cf8c8da6af905855677`.
Final log SHA256
`94cf0ad36bd145c73aee39ea6162a5046d13b35dcd776a45570b57bbf4dec065`;
audit `trust-k1-source-copy-focused-v3-audit-20261007.json` SHA256
`69e1928a5613295d93979cabefb7c4681f921f7879c6b2e0fefc6214b81d62f9`.

All trust-K1 work remains isolated/unintegrated and `filingReady:false`.
Statements, issuer/static-page/checkbox authenticity, actual codeB graph
credit and prepared native/issued-copy packet integration remain required.
No aggregate approval/main checkoff; frozen52 main/future35 rows and all2,592
live-regression runtime hashes reverified unchanged. Four retained standalone
source-copy/XML artifact pairs now have eight viewed pages; none is approved
as a full filing packet.

## Trust K-1 codeB calculation and combined withholding replay — isolated

Committed `5e73927e8b47710dbf532a74f69e22b1379df83e` in the isolated trust-K1
branch. Entered positive codeB amounts now accumulate once through the actual
K1 node into Form1040 line25c, total withholding, payments and refund. Summing
integer cents avoids per-copy rounding/drift and rejects unsafe combined
amounts. The native/PDF Form1040 withholding replay includes K1 alongside
8288-A, W2G, 8805 and 8959. Full exporters remain closed for positive codeB;
this calculation does not establish issuance or attachment eligibility.
Root runtime remains unchanged while its integrated Form8582 regression runs.

Normal typed focused command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno test --allow-read --allow-write
--allow-run=xmllint,pdftotext,pdftoppm --allow-net=www.irs.gov
forms/f1040/nodes/inputs/k1_trust/index.test.ts
forms/f1040/2025/f8288-withholding-reconciliation.test.ts
forms/f1040/2025/trust-k1-source-copy-reconciliation.test.ts
forms/f1040/2025/trust-k1-native-copy-review.test.ts
forms/f1040/2025/trust-k1-issued-copy-fields.test.ts
forms/f1040/2025/trust-k1-issued-copy-review.test.ts
forms/f1040/2025/trust_k1_backup_withholding.test.ts`: **111 passed /0 failed**.
Cases include cent drift, unsafe sum, two-owner/W2G aggregate346, all-five-source
replay75,700.75, changed/omitted/excess source totals and continued attachment
rejection on a fully calculated graph. V1 type checking caught a wrong public
MFJ enum name; fixed it without disabling checks. V2 had109/2 because skeleton
exports missing line25c now reject earlier. Updated assertions and used the
real calculated graph to prove the attachment guard still holds. All logs
retained; no rejection bypass.

Retained graph audit reused the exact previously viewed K1 source bytes SHA256
`d34621958c93d342566e2f5b762226437322560ad5d138e208da51793bcec5ec`.
Source/ordinary income and AGI644.56 remain unchanged; line25c/25d/33 are125.25
and rounded refund125. Both complete-export entry points reject codeB. The
separate individual Form1040 preview XML passed standalone IRS1040 XSD; both
preview pages were viewed: Test/111223333, single/no-digital-assets, filed
AGI645/standard deduction15,750/taxable0 and lines25c/25d/33/34/35a125 match.
This is a two-page single-form preview, **not** a full Return1040, full PDF
packet or approved claim; no aggregate approval/increase.

Artifacts under `trust-k1-withholding-public-graph-20261007/`; previewPDF SHA256
`926a2bccb5ceffd773a6dc2f83b458b3d3029a38be20126e97494df0f2b1ab2a`,
previewXML SHA256 `ce2e073e8b4daf9a7f295791618e8696e21320ad32e8b1b3ca1ce691bc9e1b49`.
Final log SHA256 `252a739b7d23e34edb41d0ca970a4998e3dab295f40371478f6bedd6b26b588a`;
audit `trust-k1-withholding-graph-focused-v3-audit-20261007.json` SHA256
`c46001cf7425401707122e32ac06252ecaf972057f5d967cfb4c3b3bf9410efd`.
Main52/future35 rows remain frozen, all2,592 main regression runtime paths
unchanged. Remaining K1 work: prepared native/copy packet integration and
statement/issuer/static-page/checkbox evidence under the existing task.


### Trust K-1 immutable extraction snapshot — October 7, 2026

Isolated commit `3e960e279` snapshots parsed source and PDF bytes before
asynchronous verification; field extraction uses those exact retained bytes.
A mutation test starts extraction, then zeroes the caller buffer and changes
caller source/review EIN. Extracted original digest, EIN and codeB amount remain
unchanged. Same seven-file normal typed focused suite: **112 passed /0 failed**
(16s). Log `trust-k1-immutable-snapshot-focused-20261007.log` SHA256
`7839fe65c28e28500e18df4ef034024f2028ece1fbb5105d20ffa9abb655d1e3`;
audit SHA256 `88244a568ac76a446df7d5a51e58a5adea441d304866e70f395cab2e589f12d7`.
The fix is confined to the current isolated helper; no root runtime changes,
new board requirements, export opening, issuer/checkbox/whole-page approval,
or parent checkoff. Main52/future35 rows unchanged. Full integrated regression
on `df26ee299` remains running; no terminal result. No PR opened.


### Trust K-1 printable checkbox evidence — October 7, 2026

Isolated commit `f51fcdf8a` verifies all six canonical widget positions/on
states from the pinned official TY2025 template, field-value/appearance-state
agreement, print/visibility flags, first-page ownership, crop/rotation and
identity appearance matrices. Original IRS glyphs require exact decoded
streams and standard ZapfDingbats font/resources; missing Off appearances are
accepted only in that original representation. Regenerated on/off paths
match a separate canonical black-style comparison; submitted settings cannot
define expected appearance. No input bytes are repaired. Identity and amount
text checks remain in force; issuer and static-page/overlay proof remain open.

Final same seven-file typed suite: **126 passed /0 failed** (22s), including
all original unchecked and regenerated checked states, checked/unchecked
appearance swaps, state conflict, hidden/nonprinting/moved/optional-content
widgets, translated matrix, substituted glyph font, missing appearance and
nonblack generated mark. Initial single-file run was18/6: comparison had
treated equivalent RGB/gray black differently, two adversarial fixtures
assumed appearances not present, and missing-normal diagnostic was earlier
than expected. Fixed comparisons/fixtures/validation order; V2 suite123/0.
Added full-six-state positive and nonblack negative coverage for final126/0.
Final log SHA256 `f7fa510c6ddb2e0afb00b330da1681ba1b3d180041838c4434f04cd5a9c9475e`;
audit SHA256 `7bf49136dae22bc0ef8effbd82c041ce1700d3992d4d800e7e5ff292163badc3`.

All four previously viewed, unchanged retained source PDFs (eight pages)
passed the new checkbox verifier; no new packet/page approval. Retained-copy
results SHA256 `d0ba9123e1e4ca236c1584aad6b77580a95d6872c9b5976b78f56682f96b9ccb`.
`checkboxAppearancesVerified:true` accompanies `issuerVerified:false` and
`printedContentsVerified:false`. Both complete exporters stay guarded. Main52/
future35 requirements unchanged; root runtime unchanged during live full
regression. Full Return1040/prepared-copy integration, statements, static-page
review and issuer evidence remain under the existing K1 requirement.


### Trust K-1 canonical static pages and layout — October 7, 2026

Isolated commit `125a8e136` adds canonical static-page verification to the
existing extraction helper. Fingerprint derived only after verifying the
official template SHA256 `d8d7b6eacabdf145474aee8385fcfeafe68bd2f69baaef52d9a8227ebcd45fc3`:
`404eb351de23e2218af04adfc7b3f183f1b27828fd772eecaff2ffd3764addca`.
It resolves PDF object references, hashes decoded stream data/resources
(compression/object numbering excluded), both pages' media/crop/rotation,
all74 widget positions, original name-tree scripts and viewer preferences.
Widget annotations must exactly match canonical fields on page1 with none
on page2; duplicate/extra annotations, added actions, optional content and
unknown page controls are rejected. Mutable field values remain excluded
from the static fingerprint and covered by separate text/checkbox checks.

Normal typed eight-file suite: **140 passed /0 failed** (27s). Cases include
a white overlay despite matching field appearances/rehashed metadata,
altered instructions, removed static content, substituted page font, extra/
duplicate annotations, moved amount field, transparency group, replacement
script, widget action, optional content and print range omitting instructions.
All four unchanged, previously viewed retained PDFs (eight source pages)
passed. No new full packet/page approval; issuer authenticity remains unproved.

Log SHA256 `ce2e8c82ee5030766d1f487e37c6ff86544c18984a3f2e619c7a6653e917263b`;
test audit SHA256 `0cf7badee70d9b97239379e80cfca3fcaf801440c4a906bacddf70b0967f62d8`;
retained-copy results SHA256 `626b55739c1d5cc35155ff5b276f68dd65f64db97daa0de5e83f31f50466e9c7`;
postcommit audit SHA256 `95e53fb629eb8a36462cd1608a7285887a17d6df249062048fbc1802ce18604f`.
`staticPageLayoutVerified:true` now accompanies appearance checks;
`printedContentsVerified:false`/`issuerVerified:false`/`filingReady:false`
remain. Both full exporters guarded. Prepared native/copy packet integration,
statements and issuer evidence remain under the existing K1 task. No main
checkoff or future-task implementation; main52/future35 unchanged. Root
regression runtime unchanged; session12057 remains live with no terminal
totals. MeF estimate still reflects the ATS outage, not local test counts.


### Newly discovered K1 withholding statement — future-only, October 7

Cached TY2025 native schema `BackupWhSchedulesK1Statement` is included by
ReturnData1040 and permitted in Form1040 reference-document names, but no
registered builder was found. Schema SHA256 `2df5649fd400c2285e62e746f84e6b1a3ede6b93e5d843944bdda342e1edbd8e`.
Added future_todo row36; no implementation, registration, projection or
filing claim. Required use, ownership, source-copy/reference and rounding
semantics need future review with matching BR. Main52 requirements unchanged.


### Trust K-1 immutable prepared source-copy evidence — October 7, 2026

Isolated commit `03dd02a6a5a0e93f3b99400d62703c86015020b7` adds `PreparedTrustK1Copies`.
It snapshots source/filer/recipient/bytes before asynchronous verification,
reconciles every directly modeled copied fact and exact finalized other-form
line25c total, keeps native projection plus frozen nested review records and
private retained bytes, and binds them to shared prepared-return SHA256.
Retrieval returns defensive byte copies; current-source assertion rejects
changed source, owner or graph. Raw pending is retained for hashing so the
shared contract preserves top-level Form8949 rows. This is a source-preparation
prerequisite, not registration, complete packet assembly or export approval.

Normal typed nine-file focused suite: **147 passed /0 failed** (31s). Tests
include the real calculated graph, no alias after caller/copy mutation, changed
income/source/refund/filer/Form8949 rows, missing withholding and extra bytes.
Both complete exporters still reject codeB. V1 stopped at type checking because
a test tried mutating a readonly filer; changed its adversarial fixture to a
mutable copy without disabling checks. V2 passed146/0; added explicit Form8949
binding coverage and preserved raw pending for final147/0. Logs retained.
Final log SHA256 `496a3dafb15aa4553f938e29d5dc09c9da105456ccb4f271bfd1dfc08ecdd919`;
audit SHA256 `9f850f9b54abe3989c346cfab1ee6066f9d08d7cff5b354d8483b3fb392c91fd`.

Retained ordinary-income source audit reused PDF SHA256
`d34621958c93d342566e2f5b762226437322560ad5d138e208da51793bcec5ec`
and confirmed nativeK1 XML unchanged from its earlier standalone XSD/viewed
source proof. Prepared source SHA256
`f366180505b2885ee1c75cdde725d39f8ed05f1eb20fa4b34e02cf27caa04ce4`;
retained audit SHA256 `2f4a48b5a2c9117c9aa426b5415d32b64f2218365c704b1e17159448d58d8e54`.
No new full packet or page approval/aggregate increase. Issuer and required
supplemental statements remain unproved; `filingReady:false` and both public
guards remain. Newly discovered withholding statement stays future-only36,
unimplemented. Main52 frozen; existing packet/issuer task remains open.


### Trust K-1 fixed copy-review pages — October 8 local / October 7 UTC

Isolated commit `496be0822` adds `PreparedTrustK1Copies.buildReviewPdf`: it
asserts the current source binding, clones private verified source bytes,
flattens only reviewed normal appearances without regeneration and copies
both source pages in claim order, returning owner/hash/page origins. Original
retained bytes stay unchanged; no live AcroForm field-name collisions remain.
For an original unchecked glyph with no Off stream, remove the blank widget
and AcroForm membership directly on the private working copy, keeping the
static outline. The first run149/1 exposed pdf-lib removeField's appearance
requirement; corrected the introduced projection path, V2 passed150/0. Added
joint-owner coverage; final typed nine-file suite **151 passed /0 failed** (32s).
Source binding, bytes and complete-export guards are unchanged.

Retained final and blank-original-final review PDFs each have two fixed pages,
checked/blank outline respectively, Test Taxpayer/111223333, EIN123456789,
ordinary income234.56/div100/qualified50/ST30/LT80/portfolio200 and B125.25.
Both standalone nativeK1 XMLs passed XSD; all4 review pages and2 new blank
source pages were viewed. ReviewPDF hashes
`766be34360a2c1cc833ab2717d66367f84f035832bf7ad430677c9c449c69633` /
`cd83c371e474c35448bd12b9e0cffe92730f76b44e66203cd8ccb005b547c1d7`;
new blank source SHA256 `af841ad7838257021d1ff90166651fa21ccedc5111fe3912d7271818f0701744`.

Joint source-copy review: four fixed pages with primary Test/111223333/EIN
123456789/B125.25 and spouse Sam Example/444556666/EIN987654321/B225.50;
both instruction pages retained. Both standalone K1 XMLs passed XSD; all4
review pages and2 new spouse source pages viewed, amounts/owners/marks agree.
ReviewPDF SHA256 `889e2805acc52991f1cf030be801aa26f8ad1b292b86a3645b9b42a1a691c333`;
spouse source SHA256 `22b5549d67e0a7ace43a5bbb64cd6ac82e5bd837d42cefcccca4819b41144973`.
Artifact generator V1 used an invalid public filing-status string and stopped
before emitting files; retained it and used the public MFJ enum in separate
V2. Initial XSD/render driver referenced a nonexistent env xmllint; selected
the actual system xmllint, then all four validations passed. No no-check
bypass and no changed-source/issuer approval.

Final test log SHA256 `21825b6cd1894386d02dff3e7683a2c36bd250a127b5a6099b8c14deb71dc6ab`; audit SHA256
`c00bcda06a58d27943ecf17752a261c8bd95b54c26437f1d5aeb9947b1f51779`. Artifact records:
- `trust-k1-review-page-artifacts-20261007/observations.json`: `4ec91ecd7252109f1606195911f37e4fe22ab8fbeb2d001b652f25a818a08538`
- `trust-k1-review-page-artifacts-20261007/validation.json`: `358baff4578b3233e3030dfed0db655ce2d7a3e4836387cc6733878886c399b7`
- `trust-k1-review-page-artifacts-20261007/visual-review.json`: `2c083e776a7fefbec5b904be15f005d6df70c07b7665258abf198cbe9457cd8c`
- `trust-k1-review-page-joint-artifacts-20261007/observations.json`: `e62184a64ce42e8031423c13ac25829625ce985bd37d8f62cc29125d478cdaf3`
- `trust-k1-review-page-joint-artifacts-20261007/validation.json`: `8c8a5e66e954bb445ffdc28b78ab57b039e7b84f93b300ae9017f60b8e4e21c2`
- `trust-k1-review-page-joint-artifacts-20261007/visual-review.json`: `33210a93a3b3f1b9f951d1c4ca1cc4d3cc658e238305edc6337c13b800764312`

Cumulative K1 source pages12, fixed copy-review pages8, individual Form1040
preview pages2. These are source/projection reviews, not a complete filing
packet or approved return; bounded75/267/2706 and prepared361/372/4714 stay
unchanged. Issuer and supplemental statement evidence, registration and
final Return1040/PDF packet integration remain open. Future36 remains
unimplemented; main52 frozen. All2,592 live regression runtime paths unchanged.

At midnight Europe/Stockholm, refreshed the top estimate and anchored the
original deadline explicitly to October8 morning. Fresh official IRS status
still reports ATS unavailable through October13 09:00 Eastern; expected
acceptances by the original deadline remain0/0%. After reopening probability
unestimable pending source/version/business-rule/credential/acceptance gates.
Snapshot `irs-ats-status-midnight-20261008.json` SHA256
`11967afcb3a37a6fc31e1a5dfd7233f15fa58e23ca9ab2f565f3c8fcf3ab9245`.

### October8 combined EIC investment-income source reconciliation

Existing Worksheet1 parent reviewed after the compacted board. Root runtime
remains frozen during full regression. Isolated branch
`codex/eic-investment-reconciliation-20261008`, commit `8e1d39a44`, based on
`d856173a5`; no production guard was opened or changed.

Independent source ledger combines taxable interest200, parent exempt
interest7000, child exempt interest150, ordinary dividends300, child
Form8814 line12 income1400, capital distributions400, portfolio royalty900,
nonbusiness personal-property rent900 less expenses300, and passive
partnership rental income6000 less allowed current farm loss5000. Investment
income is11950, AGI9800, wages5000, child tax135, EIC384 and refund249. Raising
only parent exempt interest by1 gives investment11951, unchanged AGI, zero
EIC and amount owed135. These are calculation results, not filed returns.

Native and full PDF exports of both variants reject Form8582's gross
ScheduleE replay: the linked royalty net900 is counted in explicit property
rows and again in the matching passthrough royalty900, although public
calculation includes it once. A companion existing retained-sale input with
a second royalty property fails the separate public per-property source
guard. The preliminary single-property royalty-expense probe also hits the
explicit expense-free boundary. New discoveries are future rows37–38,
unworked. Do not classify this evidence as positive filing support.

Typed focused command: `deno test --allow-read --allow-write
--allow-net=www.irs.gov forms/f1040/2025/eic_combined_investment.test.ts --
--write-review-artifacts <private-evidence-directory>`; terminal2/0 in1s
(whole invocation5.61s),2026-10-07T22:09:52.378844Z–22:09:57.992218Z.
The initial focused attempt was1/1 because the fixture omitted the portfolio
classification required by the existing native royalty source contract; the
corrected source includes that fact and the issued-copy reference. No
production repair is claimed. Formatter check passed.

Private evidence: `.state/research/board-execution-2026-10-07/
eic-combined-investment-20261008-v1/`; focused log SHA256
`7121d6f81a2aaf7b80b8339a05a6aa1c47f463748b76244314df11b015a208c9`;
11950 source/pending JSON SHA256
`47d363e647a8d7fb1de2823ef189142801633c8c9c4035f665786d396a9335b4`;
11951 JSON SHA256
`d91a9d4e27e51dc7b322b336003d2c0822a56ca6e09e2427f680d61991016559`.
Audit confirms2592 launch-path hashes unchanged, frozen main area exact to
`0c6ae76a32d12373956d4f8e47564811185c60d7`,52 main requirements open and38
future rows. No PDF packet, XSD pass, issuer authentication or ATS acceptance
was produced; aggregate positive packet/page counts stay unchanged.

The direct ordinary-sale loss boundary was also traced: sale schema and
current-property reconciliation require positive gains, and allocation
currently emits only positive sale gains. Broad EIC/8582/4797 loss support
therefore needs original-form loss allocation, not merely removing a schema
guard. That remains the pre-existing parent scope, not a completed slice.

### October8 current passive disposition-loss calculation staged

Existing EIC/Form8582/Form4797 parent advanced on isolated
`codex/eic-investment-reconciliation-20261008`, commit `fb225f45b`. Added
`current-form-allocation.ts` for gross current income/loss by activity and
original reporting form, and `current-property-loss-allocation.ts` deriving
those columns from purchase/closing/rent/tax and farm receipt/repair sources.
The calculation uses the existing exact-dollar activity and PartIX allocation
helpers, preserves Form4797 PartsI/II separately and checks every allowed/
suspended form total against its activity. Prior-history fields are rejected
at this current-only calculation boundary; full parent scope remains open.

Actual constructed source arithmetic: sale proceeds3000 less purchased parcel
cost6000 produces ordinary loss3000; rent2000 less tax3000 produces operating
loss1000. Independent farm receipts9000 less repairs7000 provide2000 income.
Of4000 gross losses,2000 are allowed:500 ScheduleE and1500 Form4797II; the
remaining500/1500 retain their reporting character. A changed rent record8000
gives positive net land income2000, preserving ScheduleE5000 and4797II-3000
as nonpassive amounts while an unrelated farm loss5000 stays suspended.
Tests also cover same-form income offsets, special-allowance allocation,
whole-dollar multi-activity rounding, duplicate origins, invented allowances,
unsafe totals and rejected prior/entire-disposition source claims.

Final three-module typed command `deno test --allow-read` on current-form
allocation, existing8582 index and current-property loss allocation tests:
73/0 in203ms, invocation0.88s,2026-10-07T22:14:32.935508Z–22:14:33.818676Z.
Private evidence directory
`.state/research/board-execution-2026-10-07/current-passive-form-allocation-20261008-v2/`;
log SHA256 `447bcc1bea8f33a102d6f17135a3923b8ba2abb12851888d29a8a481f5f98c9f`.
Run JSON binds all four new source/test hashes. Prior70/0 allocation/index
gate retained separately in v1; new source cases initially3/0.

This is staged calculation work. Existing public sale-positive guards are
unchanged; no graph, native or PDF filing route was opened. Full owner/source
inventory reconciliation, finalized graph/AGI/QBI/EIC joins, character ledger,
native/PDF projection and review must follow before claiming support. No
positive packet/page/XSD/ATS count changed and no main requirement closed.
Future rows35–38 remain unworked. Root2592 runtime files remain unchanged
while the live integrated regression runs.

### October8 current ordinary sale-loss graph join

Isolated `codex/eic-investment-reconciliation-20261008` commit `7e895312d`
connects the staged current-form allocation to ScheduleE/Form4797/Form8582,
AGI, EIC and the numeric character workpaper. A negative short-held sale
requires an explicit reference to the matching owned current-property source;
manual negative sales, mismatched references and detached basis facts reject.
The current-only property/farm collector carries gross losses and allows only
the source-derived amount on each reporting form. Form4797 holds its suspended
loss back, while AGI deducts the remaining allowed operating loss exactly once.
Carry keys use the existing PartVIII/IX reporting-character convention.

Four source-backed graph cases are retained: ordinary loss3000 plus rental
loss1000 and farm income2000 give allowed500/1500, AGI5000, EIC384, investment
11950 and suspended2000. Raising only exempt interest to11951 removes EIC.
Without farm income, combined property/farm losses9000 stay suspended and
AGI remains5000. Rent8000 less tax3000 with sale loss3000 produces recharacterized
land net2000; unrelated farm loss5000 stays suspended and AGI is7000.

Native/PDF exports of staged losses remain explicitly rejected, including
direct4797 and8582 projectors and full native return assembly. No filing route
was opened. The existing full parent still requires native/PDF projection,
source/owner/inventory replay, packet review, durable history and matching
business rules/acceptance. [IRS4797 instructions](https://www.irs.gov/instructions/i4797)
require determining the allowed passive loss before reporting it; [8582
instructions](https://www.irs.gov/instructions/i8582) require losses to remain
on their appropriate reporting forms, with the PAL literal. The next projection
must use the allowed loss rather than claiming the suspended portion.

The first new graph focus was1/1 because its expected character-key assertion
exposed a new staging key mismatch; corrected to the existing convention.
Subsequent graph focus2/0. Broader v1 was69/6: shared allocation/schema/index
imports created a temporal initialization cycle in six modules. Extracted an
independent schema module and reran the identical eight-module command.
Final v2 terminal224/0 in31s (49.72s invocation),
2026-10-07T22:22:33.719606Z–22:23:23.441780Z. Includes existing source-backed
positive property exports and conflicts, ScheduleE/4797/8582 unit checks, EIC
guards and the new source/graph cases. Both failed histories are acknowledged;
v1 full log remains immutable.

Private v2 directory
`.state/research/board-execution-2026-10-07/current-property-loss-graph-20261008-v2/`;
focused log SHA256 `be2335e4676e40bdb914fd0f403c4f5fab62bcc2c8cfa9b4310bfb7ed2ed0d4d`.
Run JSON binds all nine changed source/test hashes and four whole input/pending
graph JSON hashes. Artifact inventory hashes30 files. Eight existing positive
regression PDF packets/99 pages were regenerated with their full XSD checks;
these derivative pages were not newly visually reviewed and add no positive
packet/page count. No loss PDF or loss XSD packet was produced. Root runtime
stays untouched during its full regression; main requirements remain52 and
future rows38, with no newly discovered scope added this turn.


## October 8 continuation — current passive ordinary-loss native and PDF review

Progress under the existing EIC Worksheet 1, Form 8582, Form 4797 and
return-wide source reconciliation TODOs. Isolated branch
`codex/eic-investment-reconciliation-20261008`: native review `f1630b17e`,
PDF review `8f51418d1`, final reporting-label/source-case correction
`71bb71bbc`. Root runtime was not integrated while its full regression ran.

The native review binds actual owned current property/farm sources, original
reporting-form columns, disposed activity IDs, gross income/loss, allowed and
suspended ordinary losses, Schedule 1, AGI, modified AGI, source QBI and the EIC
investment-income floor. Unexpected PAL/4797 components and changed owner,
closing, allocation, deduction, AGI/QBI/EIC fields reject. A shared ratio helper
preserves the existing native rounding. The QBI reconciliation accepts the
staged current-loss inventory only when it exactly matches the owned sources.

The [2025 IRS Form 8582 instructions](https://www.irs.gov/instructions/i8582)
confirm separate current income/loss columns for different reporting forms,
Part VII allocation by overall loss, and Parts VIII/IX original-form reporting.
The cached IMF 2025v5.4 IRS8582 schema limits Part VII/VIII reporting names to
15 characters; Part IX allows30. Final mixed Part VII label `SchE22/4797II`
identifies both forms, while Part IX retains their fuller individual labels.

Native/source batch: terminal38/0, 2026-10-07T22:34:31.878139Z–22:35:07.667741Z,
log SHA256 `bbb0deee29cc3ce0a4361b657b01308f314acb889b276995fce656894d94297a`,
private `current-property-loss-native-review-20261008-v2/`. Its earlier v1
also passed38/0; both histories remain. Eight existing positive source-regression
PDF packets/99 pages were regenerated; no additional filing support count.

PDF/native regression final19/0 (8s; 9.95s invocation),
2026-10-07T22:39:38.409219Z–22:39:48.361495Z,
private `current-property-loss-review-final-20261008-v3/`, log SHA256
`7748c0a9c2f9938c49a25b74c43d3cd34bb23c79a7c188cca7d24b006316e3f3`.
Run JSON binds changed code/test hashes and every retained XML/PDF/JSON/text hash.
Command: `deno test --allow-read --allow-write --allow-run=xmllint,pdftotext
--allow-net=www.irs.gov forms/f1040/2025/pdf/forms/f8582.test.ts
forms/f1040/2025/pdf/forms/f8582-current-loss-review.test.ts
forms/f1040/2025/mef/forms/f8582-current-loss-review.test.ts --
--write-review-artifacts <private-directory>`; Poppler supplied by
`/tmp/opentax-poppler-env/bin`.

Four standalone IRS8582 documents passed XSD: mixed allowed2000/suspended2000;
all suspended9000; recharacterized land excluded with farm suspended5000;
operating income1000 plus ordinary sale loss3000 and farm loss5000, allowing1000
of ordinary loss and suspending7000 overall. Three review PDFs/nine pages were
filled from the same native projection. All nine were visually inspected at
110dpi. After the label correction, seven rendered images were byte-identical
to those inspected earlier; both changed page2 images were inspected again.
`render-comparison.json` retains that binding. Mixed Part IX prints allowed
Schedule E500 and Form4797II1500; fully suspended rows print zero deductions;
recharacterized land does not appear in the passive worksheet. No clipped or
missing activity row or amount was found in these nine pages.

The initial PDF focus0/1 expected a hyphenated SSN although the actual IRS field
prints digits; corrected only that test assertion, then1/0. Initial broad
PDF/native regression19/0. Final-artifact v1 was18/1 because my new multiple-form
Part VII label exceeded the actual schema limit; failed log retained SHA256
`805c21622b1e28564c42e05a49f319a1568e9bb85e147750582efb6a554528aa`.
Corrected the new label, v2 passed19/0; checked Part VIII's same limit and added
the operating-income/ordinary-loss case, final v3 passed19/0. Distinct native
JSON filenames keep combined artifact writing from colliding with PDF JSONs.

These are unregistered review helpers with `filingReady:false` and
`issuerVerified:false`. Full loss filing descriptors/PDF packet exports remain
unconditionally guarded. This is not a full Return1040 loss XSD result,
issuer authentication, durable accepted-filing carryover ledger, next-year
import proof, matching business-rule proof or ATS acceptance. No bounded-pass,
positive filing-packet or coverage count is increased. The broader existing
TODOs remain open. Future35–38 and every other future row remain unworked.

Root full-regression session12057 was confirmed live via its handle and
PIDs99648/99655/99656 at about1h50m; no terminal result claimed. All2592 launch
runtime hashes still matched. Main board52/future38 unchecked; main section
exactly matches the frozen baseline. The research symlink was removed from
this isolated worktree; local PDF cache remains untracked and untouched.

IRS operational status rechecked October7 about22:38UTC: ATS unavailable
through October13 09:00 Eastern; reopening notice describes TY2026 testing.
TY2025 testing/version availability remains part of the existing ATS/source
verification scope. Original October8 morning acceptance estimate stays0tests/0%;
post-reopening pass probability remains unestimated.


## October 8 continuation — original-form loss reporting joins

Progress under the existing EIC investment-income, Form8582/4797, Schedule E,
Form4835 and return-wide ordering TODOs. Isolated branch
`codex/eic-investment-reconciliation-20261008`: native original-form review
`0184da285`; Form4797 PDF review `ad5ee4103`. Root runtime is unchanged while
its integrated full regression continues.

`reviewCurrentLossOriginalForms` first runs the owned current-source Form8582
review, then derives each reporting-form allowed/suspended amount from the same
source allocation. It reuses the existing Schedule E property and Form4835 item
renderers, exported without changing their logic. Its Schedule E, Form4835 and
ordinary Form4797 rows reconcile to finalized Schedule1 lines4/5. Owner, source
reference, basis, farm expenses and reporting-total mutations reject. Sale rows
retain economic proceeds/basis/loss plus allowed/suspended reporting amounts.
Fully suspended ordinary loss emits no deductible sale row. Passive allowed
loss is identified PAL; recharacterized nonpassive land sale is not labeled PAL.
Schedule E retains the nonpassive amount annotation where applicable.

The [Form4797 passive-loss instructions](https://www.irs.gov/instructions/i4797)
require determining the allowed loss before reporting it. The
[Form8582 reporting instructions](https://www.irs.gov/instructions/i8582)
require original-form allowed losses, Schedule E line22 and Form4835 deductible
loss reporting, and PAL identification on Form4797. Local schema validation is
not proof of matching IRS business-rule acceptance for the limited loss row.

Independent expected cases: mixed property operating loss1000/ordinary loss3000
plus farm income2000 gives ScheduleE allowed500, Form4797 allowed1500,
Schedule1 line4=-1500/line5=1500. All suspended gives both lines0 and no Form4797
deduction document. Recharacterized land gives line4=-3000/line5=5000, excluding
that land activity from the passive pool. Operating income1000 plus ordinary
loss3000/farm loss5000 gives ordinary allowed1000, suspended7000 overall and
line4=-1000/line5=1000. All four retain the previously verified EIC/AGI bindings.

Native/source regression terminal45/0 (33s; 37.39s invocation),
2026-10-07T22:45:06.896211Z–22:45:44.290264Z. Private directory
`current-loss-original-forms-20261008-v1/`, focused-log SHA256
`a0de84a1696c3e110958cf07adb39b1306a54814b9d5d9a8b5953d956c3eaa41`.
Run JSON binds all four modified/new code/test files, source/pending review
JSONs and11 standalone XSD-validated documents: four IRS1040ScheduleE, four
IRS4835 and three IRS4797; the fully suspended ordinary loss has no IRS4797.
Command: `deno test --allow-read --allow-write --allow-run=xmllint
--allow-net=www.irs.gov forms/f1040/2025/mef/forms/current-loss-original-form-review.test.ts
forms/f1040/2025/mef/forms/schedule_e.test.ts
forms/f1040/2025/mef/forms/f4835.test.ts
forms/f1040/2025/mef/forms/f4797.test.ts
forms/f1040/2025/eic_passive_property_source.test.ts --
--write-review-artifacts <private-directory>`.
Existing positive property/native/source cases passed; eight existing positive
PDF packets/99 pages were regenerated, with no additional filing-support count.

Form4797 PDF focus final1/0 (745ms; 2.37s invocation),
2026-10-07T22:47:47.458878Z–22:47:49.832209Z. Private directory
`current-loss-4797-pdf-review-20261008-v3/`, log SHA256
`578534c9e0388758845fa29b243e5a602303bad9923f646742dd4c87fd773624`.
Three one-page reviews, all viewed at110dpi, print actual source proceeds3000,
basis6000 and allowed ordinary deductions1500/3000/1000; lines17/18b match
Schedule1 line4. Passive rows include PAL, recharacterized row does not.
No missing or clipped amount was found. Whole source names/references remain
bound in the accompanying JSON; the printed property description follows the
native20-character limit. No blank deductible page is generated for fully
suspended loss. Command: `PATH=/tmp/opentax-poppler-env/bin:$PATH deno test
--allow-read --allow-write --allow-run=pdftotext
forms/f1040/2025/pdf/forms/current-loss-4797-review.test.ts --
--write-review-artifacts <private-directory>`.

PDF v1 failed type checking: my empty-result fields had an inconsistent inferred
type; fixed to the same Record type. Failed log retained SHA256
`1d7d8e48ad2ee017e5197efea4b5d850019cfe98910cd102d9c29d0aac7624d1`.
V2 was0/1 because my test expected first-last title case while the existing
Form4797 descriptor prints its canonical `nameLine1` (`EXAMPLE ALEX`); corrected
that assertion only. Failed log retained SHA256
`b922e7472f3afcd1e75c25aa970114070fb087f6c2a9b49f07c86d3a2aa351ab`.
V3 final1/0. No pre-existing header behavior was changed.

Review helpers remain unregistered, `filingReady:false`, `issuerVerified:false`.
Full loss filing exports remain guarded; this is not a full Return1040 XML/PDF
packet, source authentication, matching business-rule result, durable accepted
carryover ledger or ATS acceptance. Original-form filled Schedule E/Form4835
and full packet proof remain in the existing parent TODOs. No main requirement
is checked off and no positive filing/coverage count is increased. All38 future
rows, including35–38, remain unworked. Both worktrees retain only untracked
PDF cache after commits; isolated research symlink removed.

Root regression session12057 was confirmed live by its handle and
PIDs99648/99655/99656 near1h58m; no terminal result claimed. All2592 launch
runtime hashes match; main board52/future38 unchecked and frozen main section
matches baseline. Original October8 morning ATS acceptance estimate remains0;
post-reopening probability remains unestimated pending existing version,
source, business-rule, credential and acceptance verification.


## October 8 continuation — operating PDFs and terminal integrated regression

Existing current-loss work continued on the isolated EIC branch, commit
`12200f626`. `buildCurrentLossOperatingReviewPdfs` projects the owned source
review allocation into Schedule E and Form4835. It prints original property
rent/tax/net, only the allowed line22 loss, farm line34c deduction or positive
line32 income, Schedule E farm lines40/42 and the line41 total matching
Schedule1. Recharacterized land prints NPA5000. The existing Form4835 per-item
PDF projector is exported without changing its calculation. Schedule E copies
are split at the actual three-property column boundary; that new review
pagination code is not claimed verified beyond the four one-property cases.

Focused final5/0 (1s; 3.72s invocation),
2026-10-07T22:52:18.489082Z–22:52:22.213153Z. Private directory
`current-loss-operating-pdf-review-20261008-v2/`, log SHA256
`372a6c7a7785ad79b93e27c82f79c0eae8449f1a04e38eefb1dccc8f451a98b3`.
Run JSON binds three changed/new files and all review input/pending/projection,
PDF and text hashes. Command: `PATH=/tmp/opentax-poppler-env/bin:$PATH deno test
--allow-read --allow-write --allow-run=pdftotext
forms/f1040/2025/pdf/forms/current-loss-operating-review.test.ts
forms/f1040/2025/pdf/forms/f4835.test.ts --
--write-review-artifacts <private-directory>`.

Eight PDFs/12 pages (four two-page Schedule E and four one-page Form4835)
rendered at110dpi and all viewed. Mixed Schedule E line22/25=500, line26=-500,
farm40=2000 and summary41=1500. Fully suspended property deduction is blank/zero
and farm34c explicitly0. Recharacterized land line26/41=5000 with NPA5000;
operating-income/ordinary-loss case line26/41=1000. Original farm expenses7000
remain printed; current farm income9000 gives line32=2000; loss cases do not
print an unauthorized deduction. No missing/clipped amount found in these12
pages. Review-only current-loss evidence now totals15 standalone XMLs and24
viewed pages; these are not full filing packets or increased filing coverage.

Initial v1 focus0/1 caught my new wrapper retaining two Form4835 instruction
pages; fixed by retaining the descriptor's actual page0. Failed log SHA256
`79f8d7c6704312ebe3c0e7bda0919104606a45219c69bc33b1b2317f64fbdd92`.
The guard assertion was also limited to negative farm cases: an independently
valid positive farm component already passes its existing descriptor, while
the full current-loss filing packet remains guarded by other required forms.
Final5/0 includes four existing Form4835 PDF tests. Public filing guards,
source authenticity, durable carryover/next-year import, full Return1040 loss
packet, matching BR and IRS acceptance remain open. Future35–38 and all future
rows remain unworked. Isolated research symlink removed, cache untracked.

Root integrated full-regression session12057 is terminal exit0, not pending:
12,266passed/0failed (121m8s),
2026-10-07T20:50:05.560967Z–22:51:30.123461Z,
tested commit `df26ee299cc2c432bbfe969fcd97e309928b666c`,
command `PATH=/tmp/opentax-poppler-env/bin:$PATH
DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`.
Log `full-test-after-form8582-integration.log` SHA256
`a2620b19ee53f0907657cdefc82aed6f10f6b044696b0392a5d42cb9f27acca2`;
terminal status `full-test-after-form8582-integration.status` confirms no runtime
changes. All2592 launch hashes independently rechecked; manifest SHA256
`c2e8ac915e4e9dabb04edbe9dda68f7a723e69cd2f9ef7347728ee9fd55f2048`.
Deno2.9.4/V815.0.245.2-rusty/TypeScript6.0.3, Poppler26.09.0,
libxml2.9.13. The13 log mentions of “ignored” were inspected: all are passed test
names describing behavior, not skipped test results. No ignored result is
reported by the terminal summary. This supersedes the previously pending run;
it does not cover the later isolated K-1/current-loss commits before integration.

Main scope still52 unchecked/future38, frozen section unchanged. Local full
regression is not proof of full52-requirement completion or IRS acceptance.
Original October8 morning acceptance estimate remains0tests/0%; post-reopening
probability remains unestimated. With the root runtime freeze now lifted,
previously verified isolated current-loss/K-1 changes can be integrated and
checked together before another normal full regression.


### Combined K-1/current-loss integration and new full regression — October 8

The ten staged K-1 and nine current-loss commits applied cleanly to
`codex/mef-readiness-20261007`, ending at
`690add3766b2eb377ef1cab720fa0024a4feb0f4`. All19 K-1 and30 loss runtime paths
match the isolated branches byte-for-byte; private `preflight.json` binds those
hashes. Main frozen section matches baseline `0c6ae76a32d12373956d4f8e47564811185c60d7`:
52 unchecked main TODOs and38 future TODOs. No future item was implemented.

Combined normal typed focused check: **257 passed/0 failed**, exit0,
2026-10-07T22:54:49.759483Z–22:56:40.010853Z, tested commit above.
Evidence: private `integrated-k1-current-loss-20261008-v1/run.json` and
`focused.log`, SHA256
`21190607351a2ea3479c735f6c7b2697ed3b65222582746f5c70e4f584b162ec`.
The retained run manifest lists all21 modules and exact command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno test --allow-read --allow-write
--allow-run=xmllint,pdftotext,pdftoppm --allow-net=www.irs.gov <21 modules>
-- --write-review-artifacts <private-directory>`.
Full loss/K-1 filing guards remain closed. Regenerated review/source/positive
artifacts do not add reviewed-page, filing-pass or scope-completion counts.

A fresh normal typed full regression started2026-10-07T22:57:43.812002Z on that
integrated commit: `PATH=/tmp/opentax-poppler-env/bin:$PATH
DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`.
Session41991, PID20110. Log/status:
`full-test-after-k1-current-loss-integration.log/.status`;
launch manifest `runtime-full-after-k1-current-loss-integration-at-launch.json`
binds2624 runtime paths, SHA256
`db4f04fed93275a604c216df358cc6b210dcc5eea8047d8de04518cf591be17d`.
Versions: Deno2.9.4/V815.0.245.2-rusty/TypeScript6.0.3,
Poppler26.09.0/libxml2.9.13. Runtime is frozen while it runs; documentation-only
changes are allowed. This run is pending, not a pass. Latest terminal full
result remains12,266/0 on earlier `df26ee299`; it does not cover this integration.
No IRS acceptance, matching BR, source authenticity, durable next-year import,
or broader52-TODO completion is implied. Estimate unchanged:0 acceptance by
original October8 morning deadline; post-reopening probability unestimated.


### Current-loss Schedule 1/Form 1040 PDF joins — isolated October 8 review

Continuing the existing Form8582/original-form/Form1040 and EIC reconciliation
TODOs, isolated commit `798ff260beb263622466a39d6b9ef3e41b68fed2`
adds an unregistered source-bound return review. It first validates the
original-form loss review, then existing return-wide arithmetic/Schedule joins
and replays finalized EIC. Altered source references, original deductions,
AGI, EIC and refund amounts reject, including a changed EIC with self-consistent
payment/refund totals. It fills the existing Form1040 field map with review
amounts and the existing Schedule1 instance. These raw review fields are not
a substitute prepared filing projection; registered descriptors are unchanged.

Normal typed focused test: **2 passed/0 failed**, exit0,
2026-10-07T23:01:31.919438Z–23:01:35.804969Z,
base `12200f62624a8a2d67f15475b1d23a75c028de8a` plus two source files bound in
private `current-loss-return-pdf-review-20261008-v4/run.json`.
Command: `PATH=/tmp/opentax-poppler-env/bin:$PATH deno test --allow-read
--allow-write --allow-run=pdftotext --allow-net=www.irs.gov
forms/f1040/2025/pdf/forms/current-loss-return-review.test.ts --
--write-review-artifacts <private-directory>`.
Log SHA256 `8e10374f59f35c65e6083e932493ceb0e6ab4f8394efae22005b1c2025f4e1cd`.

Nine PDFs/18 pages (five Form1040 and four Schedule1) rendered at110dpi and all
viewed. Mixed allowed case Schedule1 lines4/5=-1500/+1500; operating-income
case -1000/+1000. Both net0 into Form1040 line8 with AGI5000. Recharacterized
land has -3000/+5000, additional income2000 and AGI7000. Fully suspended case
omits an empty Schedule1 and keeps AGI5000. All $11,950 cases show EIC384 and
refund384; $11,951 shows no EIC or refund. No clipped/missing amount found in
these18 pages. Hashes and exact viewed pages retained in `render-manifest.json`
and `visual-review.json`. Cumulative loss review:15 standalone XMLs/42 viewed
pages, not full filing packets or increased filing-pass/coverage counts.

Retained failed attempts are harness corrections, not hidden passes:
v1 1/1 expected a contiguous Form1040 SSN although its template prints separate
boxes (log SHA256 `b1780574b1c4b907b3c2eb74b52ea446b7b2bb94054fbfaf05274a88df1f242c`);
v2 1/1 assumed the individual Form1040 projector rejects zero EIC
(`861f92b2bf923dd173409b027c794672e94bac3e608bb9fad624d02aff78ac37`);
v3 1/1 incorrectly required a blank Schedule1 page in the fully suspended case
(`966c4c3f61b24d23347709a1c9a3564d2a6cf8a6b2f5c34b9f4f589d24f45eba`).
Final assertions distinguish the positive-EIC projector guard from the required
Form8582 guard, which rejects every case. No production filing guard was lifted.

This isolated commit is not integrated while root session41991 is running.
All2624 root launch runtime hashes independently rechecked unchanged; full run
still pending. Main52/future38 remain frozen, future35–38 unworked. Source
issuer/history authenticity, durable next-year import, full loss packet,
matching BR, IRS acceptance and overall TODO completion remain open. Original
morning acceptance estimate remains0; post-reopening probability unknown.


### Current-loss character ledger and next-year contract — October 8 isolated

Existing Form8582 ledger requirement continued in isolated commit
`dd50e389b`: the storage-ready helper now handles the current-only original-form
inventory separately from its legacy operating-only calculation. Other-passive
activity IDs, operating form/net, zero prior balances and gross totals must
match. A second operating form, duplicate activity/form, special allowance,
prior balance or detached legacy sale-gain inventory rejects. Current loss
character is retained on ScheduleE, Form4835 and Form4797 PartsI/II; only the
public short-held PartII current-sale cases are proved here. No wider PartI
public/source filing claim is opened. Existing legacy behavior remains covered.

Four public graph cases pass the complete original-form source review before
ledger construction. Mixed source has current losses1000/3000, allowed500/1500,
ending500/1500 on ScheduleE/ordinary Form4797, aggregate2000. Fully suspended
case retains1000/3000 plus5000 farm loss, total9000. Recharacterized land is
nonpassive and absent from the PAL ledger; farm ending5000 remains. Operating
income/ordinary-loss case retains ordinary2000 plus farm5000, total7000.
Calculator aggregate/activity/PartVIII–IX character keys reconcile. JSON
roundtrip is rechecked against original2025 input; explicit2026 openings match
known characters/amounts. Swapping characters, forging self-consistent allowed
and suspended allocations, source changes or a changed filing reference reject.

Normal typed focus **89 passed/0 failed**, exit0,
2026-10-07T23:06:28.660798Z–23:06:30.910700Z, base
`798ff260beb263622466a39d6b9ef3e41b68fed2` plus two bound files.
Command: `deno test --allow-read --allow-write
forms/f1040/2025/current-loss-ledger.test.ts
forms/f1040/nodes/intermediate/forms/form8582/ledger.test.ts
forms/f1040/nodes/intermediate/forms/form8582/current-form-allocation.test.ts
forms/f1040/nodes/intermediate/forms/form8582/index.test.ts --
--write-review-artifacts <private-directory>`.
Private `current-loss-ledger-20261008-v3/` retains run/verification manifests
and four source/pending/ledger/opening JSONs. Log SHA256
`f351b6e20a06f176533e871bcc51e3cb57b6f2a3e7c9c71069b3946e2ac700fb`.
v2 passed89/0 before the extra single-operating-form guard; finalv3 covers it.
v1 failed before tests because I named a nonexistent next-year test module:
`e43a4ce1cad4334176aa01e7387e4773ad3780dcbf487c2f6dba03847eae80da`.
The actual next-year tests live in the ledger suite; no failed case was skipped.

The acceptance reference in these tests explicitly says synthetic/not IRS
acceptance. A caller string does not authenticate an accepted return. This
proves the calculation/roundtrip/opening contract, not a production durable
accepted-filing store or2026 engine import. CLI store inspection confirms the
existing Form8990 record is explicitly calculated-unfiled; it cannot supply
accepted Form8582 evidence. No current-loss filing guard was lifted. No new
PDF/XML or filing-pass/page/coverage counts. Root full session41991 remains
live and all2624 held runtime hashes are unchanged; the new ledger and return
review commits remain isolated until that gate is terminal. Main52/future38,
future35–38 unworked, and acceptance estimate remain unchanged.


### Complete current-loss native/prepared-PDF joins — October 8 isolated

Isolated commit `f73ff2d68` connects the reconciled current-only other-passive
loss inventory through registered Form8582, Form4797, ScheduleE and Form4835
builders. One source validator verifies original operating/sale character,
complete source inventory, ownership, QBI, finalized Schedule1/AGI and EIC
investment floor before projection. The current route requires a finalized
single filer; other filing statuses remain rejected, without an approved
exclusion claim or future-only joint-header implementation. Negative manual or
detached sale records remain rejected. Source references/assertions still do
not authenticate external issuer bytes. Review APIs retain their review-only
flags; their reconciled amounts now also feed the registered source path.

Native Form4797 retains source price3000/basis6000 and reports only the allowed
PartII loss with PAL description for passive allowed loss. Fully suspended sale
loss emits no Form4797 document/deduction page. The limited-loss PDF keeps its
actual page0, excluding irrelevant PartIII. ScheduleE and Form4835 use the same
original-form allowed losses; Form8582 native/PDF worksheets use complete gross
income/loss and correct PartsVII–IX characters. Production Form1040/1 joins,
prepared immutable source projection and normal required-document discovery
are exercised through the complete bundle. Earlier positive guard assertions
were replaced by exact native equality and finalized PDF amount checks;
source/totals rejection tests remain. No future-only royalty/K-1 pool change.

Normal typed focused **126 passed/0 failed**, exit0,
2026-10-07T23:13:26.822660Z–23:15:04.667662Z. Base
`dd50e389b925e33e50c856ae65b44881f548eaf7` plus15 changed/new files bound in
private `current-loss-filing-20261008-v2/run.json`.
Log SHA256 `b880d33ca2eb987b6ec0f9816b7bdfd2fc327d5753abcdcb0573875a83238039`.
Command: `PATH=/tmp/opentax-poppler-env/bin:$PATH deno test --allow-read
--allow-write --allow-run=xmllint,pdftotext,pdftoppm --allow-net=www.irs.gov
<15 modules listed in run.json> -- --write-review-artifacts <private-directory>`.
Includes the new complete-return/source-mutation tests, ledger, graph,
current-gain regressions, native reviews, worksheet/original-form/return PDFs,
and existing Form8582/Form4835 tests. Initial complete-packet v1 passed2/0:
log `4f30ef5f3c6773f43a0d2b92babf1ad018b61f31b49ecb6b6fd7b0fd7743d4a0`.
Eight legacy gain packets/99pages regenerated by this focus are not newly
reviewed or added to counts.

Five new full cached v5.4 Return1040 XSD validations pass: mixed allowed,
$11,951 investment-income boundary, fully suspended, recharacterized land, and
operating-income/ordinary-loss. Four packets are12pages; fully suspended is9,
for57total. Rendered110dpi:52 exact matches to the earlier42 reviewed pages or
within-batch images, plus five newly viewed unique pages. The new views cover
three Form8995 variants and operating-income Form8582 pages1/2. QBI rows are
-2000/+2000 in the mixed case, zero/zero fully suspended, and2000/zero for
recharacterized land; taxable-income limit gives deduction0. Operating-income
Form8582 income1000/loss8000/allowed1000/unallowed7000 and PartVIII ordinary
loss3000→allowed1000 reconcile. No clipped/missing amount found. Exact render
links retained in `packet-render-comparison.json`; `independent-audit.json`
records complete coverage, newly viewed pages and per-packet PDF/XML/source
hashes. The previously staged15 standalone XMLs/42pages remain historical
component evidence, not additional full-packet counts.

Independent XML parse checks every case's Form1040 wages/AGI/EIC/payments/refund,
Schedule1 original-character and total joins, ScheduleE allowed operating/farm
loss and summary, Form4835 original gross/expenses and deductible loss,
Form4797 sourceprice/basis/allowedloss or omission, Form8582 gross/allowed
amounts, Form8995 QBI/deduction, and unique document IDs. Mixed original loss
-3000 is limited to-1500 with ScheduleE operating deduction500; line5=1500,
AGI5000 and EIC/refund384. At tax-exempt interest11951, EIC/refund are0.
Fully suspended leaves AGI5000, no Schedule1/4797 deduction document, and9000
PAL. Recharacterized land has line4=-3000/line5=5000, AGI7000, EIC384 and5000
farm PAL; operating-income case has-1000/+1000, AGI5000/EIC384, PAL7000.

The [2025 Form8582 instructions](https://www.irs.gov/instructions/i8582)
were rechecked for allowed losses on original forms and disposition of less
than an entire interest; the [Form4797 instructions](https://www.irs.gov/instructions/i4797)
were rechecked too. Matching business rules remain unavailable/unproved;
XSD and instruction review do not establish IRS acceptance.

These three latest loss commits (return review, ledger, full filing joins)
remain isolated while root full session41991 runs. All2624 root held runtime
hashes rechecked unchanged; root retains its current-loss filing guard. Research
symlink removed, cache untracked. Main52/future38 still frozen and future35–38
unworked. Retained aggregate75/267/2706 and prepared/coverage counts are not
increased pending integration and corresponding audit reconciliation. Broader
loss/owner/source branches, source authentication, accepted production ledger,
2026 engine import, matching BR and ATS remain open. No main TODO checkoff.


IRS ATS status rechecked2026-10-07 at23:19UTC: [official status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status)
still says unavailable through October13 at09:00Eastern, with TY2026 testing
announced for09:01. TY2025 availability is not confirmed by that notice.
Private `ats-status-recheck-20261008-2319.json` retains the observation.
Board estimate remains0tests/0% acceptance by the original October8 morning
deadline, with post-reopening pass probability unestimated. Five local XSD
validations are not five IRS ATS passes. Overall goal remains incomplete.


## October 8 — durable Form 8582 candidate archive; acceptance gate remains open

Isolated commit `33ab01d97` adds `cli/store/form8582-ledger.ts` and its tests
on top of the current-loss filing joins. The archive runs the stored public
return through the graph and registered source-reconciling Form 8582 builder
before building the loss-character ledger. It retains the complete stored
metadata/inputs, native worksheet XML, exact-byte hashes and ledger in a new
UUID directory for each snapshot. Files are created with mode 0600, directories
with 0700; each file is synced before atomic directory publication. Return
inputs remain unchanged. Reads check the retained byte hashes and recompute
against the current return, its identity and declared reference. Source edits
invalidate the current read without deleting historical evidence.

The record status is strictly `acceptance-unverified`. A declared accepted-return
reference is an assertion, not trusted IRS evidence. Existing A2A inbound
archival explicitly retains opaque bytes without interpreting IRS status;
its integrity checks cannot authenticate acceptance. This component does not
promote a candidate, enable next-year import, or complete the durable accepted
ledger/2026 engine requirement. It is not exposed as an accepted-filing CLI
command. No main TODO is checked off.

Normal typed focused command: `deno test --allow-read --allow-write
cli/store/form8582-ledger.test.ts cli/store/store.test.ts
forms/f1040/2025/current-loss-ledger.test.ts
forms/f1040/nodes/intermediate/forms/form8582/ledger.test.ts`.
Final v4 result: **39 passed / 0 failed**, exit 0,
2026-10-07T23:24:31.103372Z–23:24:33.518122Z.
Private `form8582-durable-candidate-20261008-v4/run.json` binds the two new
runtime files. Log SHA-256:
`995ecff2b428586d65ec71ee166090a3f18fa68bd0939625adc43b85042b5878`.
Checks include all four current-loss allocations, source/XML byte corruption,
a coherent loss-character forgery, false accepted status, changed reference,
source edits that preserve PAL totals, foreign return identity, simultaneous
independent snapshots, private modes, unsupported year, missing sale-source
reference and traversal IDs. No additional IRS XSD/PDF packet or acceptance
is claimed by these storage checks.

Preserved failures: v1 wrapper failed before any tests (incorrect file-handle
chmod call); v2 type check failed on two test calls using four arguments rather
than the store's three-argument update API; v3 ran **38 passed / 1 failed** on
an incorrectly named XML element in the test assertion. The production writer
was unchanged across v2–v4; typed tests were corrected and rerun. Archives are
retained separately, never overwritten.

At 2026-10-07T23:24:46Z all 2,624 runtime hashes held by the live root full
regression still matched. Session 41991 was re-polled and confirmed live;
no terminal result is inferred. The new isolated commit is not integrated or
covered by that running regression. Main requirement text matches the frozen
`0c6ae76a` baseline: 52 unchecked main items, 38 unchecked future items, and
no future work picked up. Compacted top learnings retain five bullets; the
October 8 deadline estimate remains 0 ATS tests / 0% acceptance in that
window, with post-reopening probability unknown.


## October 8 — existing first-year sale sources now retain a Form 8582 ledger

The isolated ledger constructor previously rejected a first-year current sale
because its reviewed-sale branch required positive prior operating PAL. The
registered native source checks already support an other-passive first-year
retained Part II sale, an active first-year retained Part II sale above the
special-allowance phaseout, and an other-passive first-year entire disposition
with overall gain. The constructor now retains those existing sources without
adding a new native/PDF filing route. It requires a sole named Schedule E
activity, a matching acquired-in-2025 ungrouped activity source, zero prior
losses with no filed-year source, one same-activity Part II gain, and explicit
retained/entire disposition status with the existing strict gain/loss boundary.
The source-bound store still runs the registered native projector first.

For a current operating loss of 5,000 and retained ordinary gain of 2,000,
both tested rental categories preserve 2,000 allowed and 3,000 suspended in
Schedule E character, Part VIII, with Schedule 1 net zero and AGI 160,000.
The synthetic 2026 opening contract retains the same activity ID, operating
character and 3,000 balance; it does not establish accepted-return import.
For the other-passive entire gain of 8,000, the ledger retains the 5,000
allowed operating loss with zero ending PAL, while Schedule 1 carries gain
8,000/loss 5,000 and Form 1040 AGI 163,000. No empty-opening engine import or
accepted-return promotion is claimed. Current/prior Form 4797 loss characters
remain their separate ledger branches.

Normal typed six-module v2 suite: **29 passed / 0 failed**, exit 0,
2026-10-07T23:27:54.085073Z–23:27:57.563978Z.
Private `form8582-first-year-durable-ledger-20261008-v2/run.json` binds the
changed ledger and storage test; log SHA-256:
`7c575644a65e24e5fb6b875f5317e4fd18fdc9e905925696a5c866c303b72b28`.
The exact command and original-file hashes are retained there. Tests cover
persisted/re-read source snapshots and native worksheet bytes, concrete
Schedule 1/Form 1040 joins, retained opening rows, absent/acquired-before-2025
or mismatched activity source, wrong sale part, missing disposition status,
exact-zero boundary, and acquisition-date mismatch against the sale. Existing
current-loss storage/ledger and sale checks also passed. No new full-return
XSD/PDF review or IRS ATS count is added.

Preserved v1 result: **28 passed / 1 failed**, log SHA-256
`e4491b48bfab6a5ae98ac1498fa80fe7d7c7f331910fe9fc6955994811fe9728`.
That probe exposed the active first-year entire-gain graph boundary: Form 4797
requires type B in its entire-passive-source validation and rejects the type-A
source before filing preparation. This conflicts with the route described in
the older entire-gain gap note. It is newly recorded as future item 39 and left
unworked; no Form 4797 guard was changed. The ledger's first-year active branch
also stays retained-only. The positive suite consequently covers the three
existing graph/native routes, not a purported fourth route.

The [2025 IRS Form 8582 instructions](https://www.irs.gov/instructions/i8582),
rechecked this turn, retain normal reporting character and distinguish an
entire disposition with overall gain from one with overall loss. This ledger
change does not authenticate source references, solve prior-year acceptance,
complete wider dispositions or close the main Form 8582 TODO. Root runtime
remains held while full regression session 41991 runs. The main board remains
52 unchecked requirements; only `future_todo` gains the new unworked discovery.


## October 8 — reconcile Form 8582 status against retained evidence

Read-only audit `form8582-evidence-index-20261008-v1/reconciliation.json`
verified the five retained complete packet XML/PDF/source-pending byte hashes,
all 57 image hashes and all 52 matching reviewed-image hashes. The five new
unique images retain their earlier visual-review record; they were not counted
again. The 126/0 filing changed-file hashes match committed `f73ff2d68`; the
39/0 candidate storage hashes match `33ab01d97`; the 29/0 first-year-ledger
hashes match `b82c1bbc4`. All focused log hashes and terminal exit results
match their immutable run records. This is evidence reconciliation, not a fresh
test, PDF render, authentication or ATS result.

Updated the registered-form audit's Form 8582 row and compact status sections
in the activity-ID/entire-gain gap notes. Older prose saying no filed-year
importer, durable store or executed validation no longer governs the named
bounded revisions: entered 2024 transcription and an isolated unverified
candidate archive exist, while an authenticated accepted-ledger importer does
not. The tables keep root integrated runtime, isolated filing changes and
historical test versions distinct. They also identify the unworked future 35
joint PDF header and future 39 active first-year entire-gain graph boundaries.
No approval aggregate, main board requirement, registry count or future item
was promoted. The running root full regression predates the new isolated
filing/storage commits and cannot certify them.


## October 8 — first-year sale ledger source packet verification

Isolated `c2e5dafec` adds a complete local native/prepared-PDF test to the
existing candidate storage suite, without changing production runtime. Normal
typed result: **5 passed / 0 failed**, exit 0,
2026-10-07T23:31:41.615988Z–23:32:24.620267Z (11s tests).
Private `form8582-first-year-ledger-filing-20261008-v1/run.json` binds base
`b82c1bbc4` and the changed test. Exact command/permissions are retained there;
Poppler PATH is `/tmp/opentax-poppler-env/bin`. Log SHA-256:
`4c7c6e58533988aaa8bc0ecbd8a487a9e67f4e5bccfec4636d887dc66b5fef16`.

All three complete returns validate against cached TY2025 v5.4 Return1040 XSD:
other-passive retained, active retained above the allowance phaseout, and
other-passive entire disposition with overall gain. Each ten-page packet has
two Form 1040 pages, two Schedule 1 pages, Schedule E, two Form 4797 pages
and three Form 8582 pages. All 30 page records are covered by **19 unique
images viewed on ten review sheets at 110dpi and 11 exact within-batch image
matches**. `render-manifest.json`, `review-sheets.json`, and
`independent-review-v3.json` retain source/XML/PDF hashes, origins and review.
No independently new 30-page review is inferred from older images.

Both retained cases have source operating loss 5,000 and sale gain 2,000,
allowed operating loss 2,000 and closing PAL 3,000, AGI 160,000, deduction
15,750, taxable income 144,250 and tax/balance due 27,467. The active Form
8582 has modified AGI 162,000 and zero special allowance. The entire gain is
8,000, allowed operating loss 5,000, closing PAL zero, AGI 163,000, taxable
147,250 and tax/balance due 28,187. Tax uses the ordinary rate worksheet;
Form 1040, Schedule 1, Schedule E and the native ordinary-gain totals agree.
All packet document IDs are unique and the taxpayer identity matches. Source
purchase/closing and issuer references remain synthetic.

Visual review found omitted PDF disposition identification: retained Form 4797
gains have no FPA marking; the entire-disposition normal-form gain/loss entries
have no EDPA marking. The [2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582),
rechecked this turn under “How To Report Allowed Losses,” direct these
identifications. Native property descriptions remain “Rental equipment,” with
no matching BR proof. This new discovery is recorded only as future item 40,
unworked; no annotation or native/PDF builder was changed. The XSD/test passes
prove local generation and scoped arithmetic, not full PDF instruction parity
or IRS acceptance. Whole Form 8582 completion and approval aggregates remain
unchanged. The active first-year entire-gain source stays future 39, guarded.

Two independent-audit script mistakes are retained separately: v1 expected a
single global OtherGainLossAmt although Schedule 1 and Form 4797 each emit it;
v2 looked for PrimarySSN inside IRS1040 rather than ReturnHeader. The corrected
v3 scopes the gain assertions to their documents and the SSN to the header;
production and the 5/0 packet test were unchanged. No failed assertion was
counted as successful evidence. The temporary isolated research symlink was
removed; caches and root private evidence were preserved. Root full regression
session 41991 remains the existing held run and predates this isolated test.


## October 8 — stage combined current-loss filing and ledger integration

A separate worktree `/tmp/opentax-mef-current-loss-integration-20261008`, branch
`codex/mef-current-loss-integration-20261008`, was created from root `330af3f0f`.
Six tested isolated commits were cherry-picked without conflicts:

| Isolated commit | Staged commit | Change |
| --- | --- | --- |
| `798ff260b` | `58b40353a` | Current-loss Form 1040/Schedule 1 PDF review |
| `dd50e389b` | `a4441bc17` | Current operating/ordinary character ledger |
| `f73ff2d68` | `ac7f15951` | Complete current-loss filing projections |
| `33ab01d97` | `e60b0dd57` | Acceptance-unverified candidate archive |
| `b82c1bbc4` | `5b13d5ff7` | Existing first-year sale ledger sources |
| `c2e5dafec` | `8c49c01f4` | Complete first-year source packet test |

All 20 changed/new runtime files match the isolated branch byte-for-byte.
The staged manifest holds 2,631 paths: 13 existing paths changed and seven new
paths; every other held root runtime path matches. This is a staging worktree,
not root integration. Root's 2,624-path live regression remains undisturbed.

Normal typed combined suite: **308 passed / 0 failed**, exit 0, 30 modules,
2026-10-07T23:36:53.506299Z–23:39:20.464754Z (1m55s tests).
Private `combined-current-loss-ledger-integration-20261008-v1/run.json` binds
staged `8c49c01f401a8a64d3d4d8d21de719f5efd57f6c`, exact command and test hashes.
Log SHA-256:
`2316bbff97c10830c7eb87e6c612ce6eee7d6768abe1e27c54a2df4ad3508315`.
`preflight.json` records the byte equality; `runtime-at-combination.json`
SHA-256 `32b1ffc65477edb9599a9b358c125e1f98aee24a32a51531fd88446530a270a3`
records the complete held union. The suite includes existing trust K-1 issued
copy, native-copy review, static/source/prepared-copy and withholding checks,
combined EIC, current-loss allocations/source/graph, original native forms,
PDF reviews, ledger and storage, first-year sales and CLI store checks.

All eight generated full packets again validate locally against TY2025 v5.4.
Independent replay `packet-replay-comparison.json` verifies all 87 page images
at 110dpi exactly match their earlier reviewed archives and all eight native
returns match except ReturnTs. No newly viewed pages or new aggregate filing
approvals are counted. Five current-loss packets retain their earlier scoped
review; the three first-year packets still lack the future-40 PDF FPA/EDPA
identification. K-1 backup-withholding statement and other future boundaries
remain unworked, and the passing copy checks are not a positive complete
backup-withholding filing claim.

The machine has 16GiB RAM. Full regressions will run serially: root session
41991 is still live; `run-full-regression.py` is prepared in the staged private
evidence directory, but has not been launched. Its guard requires the existing
root full run to finish successfully with unchanged hashes before it starts
normal typed `deno task test` on the held staged revision. The focused pass
and prepared runner are not a full-regression result. Root integration and the
whole readiness goal remain incomplete.

Further connected Drive metadata searches for TY2025 business rules and ZIP
names produced no matching rule-package candidate among the returned results.
`drive-rule-search-summary.json` retains the bounded query observations, not
unrelated file contents. This is not global Drive absence proof and does not
replace the known matching-BR gate. No messages or access/sharing changes were
made. Main requirement text remains frozen with 52 unchecked items; all 40
future items remain unworked. ATS estimate remains 0 acceptance tests by the
original October 8 morning deadline and unestimated after reopening.


## October 8 — offline A2A archival identity mismatch; future only

Read-only A2A review found `returnPrimarySsn` selects
`ReturnData/IRS1040/PrimarySSN`. A retained generated first-year return instead
has exactly one PrimarySSN in ReturnHeader and none inside IRS1040. A synthetic
manifest with the matching TIN and an offline Send request using the repository's
transmitter namespace reproduces rejection by the unchanged `recordA2aSendPackage`:
“A2A Send submission manifest or taxpayer differs.” This is future item 41,
unworked; no A2A implementation or positive fixture was repaired.

Normal typed private probe: `deno run --check --config deno.json --allow-read
--allow-write .state/research/board-execution-2026-10-07/
a2a-real-return-identity-probe-20261008-v2/probe.ts`, terminal exit 0 after
asserting the observed rejection. No network permission or transmission was
used. Synthetic request/container bytes, result and probe are retained there.
`verification.json` independently revalidates the unaltered source Return1040
against cached v5.4, confirms header/IRS1040 SSN locations and binds the source,
current A2A runtime and probe hashes. Source XML SHA-256:
`cb44e09a08697348ae9f9b32fad16c2f17dcffa7c22b3d123e36c4b780ce85fb`;
A2A source SHA-256:
`3836dbaa95900cefba0884e132c4a94e1a17df7bb3fe4d1550ed2ee8e6df574b`;
probe SHA-256:
`08b175b7e64590d4adfab87b9adb9a9720e69abc38c49cced974765296c5ff63`.

The initial v1 probe used an incorrect service namespace, rejected at request
validation and exited 1 because it had not reached the hypothesized identity
check. Its request/container/result remain retained. v2 corrected only that
probe namespace to the repository's MeFTransmitterService.xsd namespace and
used normal type checking; production runtime remained unchanged. The probe
constructs local archive bytes using the writer's expected fields and does not
claim a full submission-archive XSD validation, authenticated taxpayer source,
real IRS Submission ID, enrollment, transport or accepted acknowledgment.

This strengthens the evidence qualification: the synthetic positive A2A archive
checks alone do not prove archival of actual generated Return1040 packets.
The existing full regression and staged 308/0 gate remain their scoped results,
not acceptance evidence. Root runtime stays held; the root full run remains
live. The main board remains 52 unchecked frozen requirements; only the future
section gains item 41, unworked. No aggregate filing approval is increased.

### October 8 — staged ledger diff and privacy review

Read the candidate archive writer/reader, its tests, the changed ledger branches,
and the next-year opening contract at staged commit `8c49c01f4`. The archive
schema retains `acceptance-unverified`; the writer does not update return inputs
or promote acceptance. The reader checks retained source/XML hashes and
recomputes the candidate from current CLI inputs and the supplied reference.
UUID validation and separate record directories prevent path traversal through
these identifiers and ordinary concurrent overwrite. Newly created directories
use 0700 and files use 0600; writes sync files before renaming the staging
directory. This review makes no broader filesystem or crash-durability claim.

Existing tests exercise byte corruption, coherent character forgery, false
accepted status, foreign identity, reference changes, same-total source edits,
concurrency and unsupported sources. The ledger changes retain original-form
character within their admitted current-loss and first-year routes. Next-year
opening assertions remain a synthetic arithmetic contract: issuer authenticity,
an accepted IRS filing and production import authorization are unproved.

Private evidence: `staged-ledger-diff-review-20261008-v1/review.json`, SHA-256
`770ddad0b1b0b922cd66c756fce09c36da608a778d92e1deb37030828e4321f0`.
All 2,624 root and 2,631 staged held runtime paths were unchanged at review.
Main scope remains frozen at 52 unchecked rows; all 41 future rows remain
unworked. No new test, packet, viewed page, approval or checkoff is counted.
The root full regression remains live; staged full validation and integration
remain pending. Known future items 39–41 retain their existing qualifications.

### October 8 — remaining staged source/projector diff review

Read the `current_passive_property_source.ts` change, registered native Form 4797
branch and PDF return-review helper at `8c49c01f4`. Current-loss sale sources now
invoke the shared original-form filing reconciliation before export. Native
Form 4797 uses that reconciliation's sale XML. The separate PDF review helper
checks return arithmetic, schedule joins and replayed EIC, and continues to
label its artifacts `filingReady: false` and `issuerVerified: false`.

Its earlier comment that full current-loss routes remain guarded is stale
relative to the registered bounded packet routes. Added only future item 42
for that comment reconciliation; no source or test was changed. This finding
does not authenticate sources, approve all loss routes or prove IRS acceptance.
The root full regression remains live in session 41991; staged full execution
still waits for its terminal success. No tests or reviewed pages are recounted.

### October 8 — ATS status refresh at 00:04 UTC

Reopened the [IRS operational-status page](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status)
at 00:04:09 UTC. It still reports ATS unavailable through October 13 at 09:00
Eastern and announces TY2026 testing from 09:01. It does not establish TY2025
availability after that point. Updated only the board estimate's observation
timestamp: zero expected accepted ATS tests by the original deadline, and no
estimated pass probability after reopening. No acknowledgment or credential
evidence was added. The observation is retained privately in
`ats-status-20261008T000409Z-v1/observation.json`. Main scope and all 42 future
rows remain unchanged and unworked; the root full regression remains live.

### October 8 — root full regression terminal and staged full launch

Session 41991 terminated with exit 0. The normal typed `deno task test` run on
`690add3766b2eb377ef1cab720fa0024a4feb0f4` reports **12,377 passed, 0 failed,
0 ignored**, with test duration 121m4s. It started October 7 at 22:57:43.812002
UTC and ended October 8 at 00:59:12.086422 UTC. Command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`.
Versions: Deno 2.9.4, V8 15.0.245.2-rusty, TypeScript 6.0.3, Poppler 26.09.0
and libxml 2.9.13. All 2,624 held runtime paths stayed unchanged.

Log: `full-test-after-k1-current-loss-integration.log`, SHA-256
`cd57a29242e08e34f99f3ae505c06dfa41152fc89f13e41ae39b518edeaa3637`.
Terminal status SHA-256:
`4830a87932913dfcf060cb3f2ee4dfa4f008ed12837d28a402a68cc9befe2a6b`.
Independent audit: `full-root-k1-current-loss-terminal-20261008-v1/audit.json`.
It rechecks the terminal log summary and digest, confirms no ignored outcomes,
and checks both held runtime manifests. This supersedes the earlier root full
result for this runtime; it does not cover the newer staged filing/ledger diff.

After observing terminal success and verifying staged HEAD, clean tracked
files and all 2,631 held paths, launched the prepared staged full runner at
00:59:35.378522 UTC on `8c49c01f401a8a64d3d4d8d21de719f5efd57f6c`.
It uses the same normal full command. Session **76705**, Deno PID **53623**;
private files are `combined-current-loss-ledger-integration-20261008-v1/full.log`
and `full.status.json`. Its runtime manifest digest is
`32b1ffc65477edb9599a9b358c125e1f98aee24a32a51531fd88446530a270a3`.
This run is pending, not a pass. Root integration waits for its own terminal
proof. Full regressions remain serial on the 16 GiB machine.

Only the compacted validation learning changed. The 52 main unchecked rows
remain frozen, and all 42 future rows remain unworked. No new packet, viewed
page, filing approval or IRS acknowledgment is counted. Broader source,
business-rule, accepted-ledger/import, scope and ATS requirements remain open,
so neither the full-batch parent TODO nor filing readiness is checked off.


### October 8 — filing and ledger source integrated; full gate pending

After the prior root full run terminated successfully, integrated the six
reviewed filing/ledger commits into the local working branch. This advances
the earlier sequencing: source integration now proceeds while the independent
staged worktree remains frozen under its live full run. It does not promote
the pending run to a pass or approve release readiness.

| Staged commit | Root commit |
| --- | --- |
| `58b40353a` | `a9ab5c742` |
| `a4441bc17` | `f140b32b7` |
| `ac7f15951` | `d45dce163` |
| `e60b0dd57` | `57ee3ead8` |
| `5b13d5ff7` | `4a123c554` |
| `8c49c01f4` | `c123ef369` |

Private `root-current-loss-ledger-integration-20261008-v1/preflight.json`
records the prior root HEAD, six commits and 20 runtime paths to integrate.
Its `post-integration.json`, observed at 01:01:51.672963 UTC, confirms identical
runtime path sets and exact bytes for all 2,631 paths between root
`c123ef369da17f5df852cd20efe037f70ba11a1d` and staged
`8c49c01f401a8a64d3d4d8d21de719f5efd57f6c`. The staged source stayed unchanged.
Session 76705 remains live; its full result is pending. The prior 12,377/0
root full result covers `690add376`, not this newer runtime. Retain both
runtime snapshots until the staged terminal result can be independently checked.

Updated only the compacted validation learning and current Form 8582 evidence
status. Main 52 unchecked rows remain frozen; all 42 future rows remain
unworked. Integration introduces no new tests run, viewed pages, aggregate
filing approvals or IRS acknowledgments. No PR has been opened.


### October 8 — ATS estimate refreshed at 01:42 UTC

Reopened the [IRS operational-status page](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status).
It still reports ATS unavailable through October 13 at 09:00 Eastern and
announces TY2026 testing from 09:01; TY2025 availability after reopening is
not established. The page update date remains September 28. Refreshed only
the board observation timestamp: zero expected accepted tests by the original
October 8 morning deadline and no estimated probability after reopening.
Private observation: `ats-status-20261008T014203Z-v1/observation.json`.
Session 76705 was re-polled and remains live; its full result is pending.
Main 52 unchecked rows and all 42 unworked future rows remain unchanged.
No tests, page views, source authentication or IRS acknowledgments are added.


### October 8 — integrated filing/ledger full regression verified

The serial staged full run on `8c49c01f401a8a64d3d4d8d21de719f5efd57f6c`
completed **12,388 passed / 0 failed / 0 ignored**, with Deno reporting
122m41s. Runner timestamps: 00:59:35.378522–03:02:54.659550 UTC. Command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`.
Tool versions observed during this run at 01:23:25 UTC: Deno 2.9.4,
V8 15.0.245.2-rusty, TypeScript 6.0.3, Poppler 26.09.0 and libxml 2.9.13;
private `staged-full-terminal-verifier-20261008-v1/tool-versions.json`.

The final tool observation was truncated and session 76705 is now unavailable.
Terminal proof therefore uses the retained runner's `subprocess.wait()` exit
code 0, completed status and independently verified full-log digest/summary;
it does not claim a freshly observed tool-handle exit. The Deno summary omits
its zero ignored count, and no individual ignored or failed outcomes occur in
the complete retained log. The original v1 verifier remains preserved; v2
handles Deno's optional ignored count and records this evidence limitation.

Private `combined-current-loss-ledger-integration-20261008-v1/` retains:

- `full.log`: SHA-256 `f497d01e60e11f8a0f92cd13667fe9b39a2afa497c2e8a931875a631cb005b5e`.
- `full.status.json`: SHA-256 `e51a268697f26caf8f5036b23e7caf04319028998ba19a3230d18ec5044a0331`.
- `runtime-at-combination.json`: SHA-256 `32b1ffc65477edb9599a9b358c125e1f98aee24a32a51531fd88446530a270a3`.

Private `staged-full-terminal-verifier-20261008-v2/terminal-audit.json`,
observed 03:05:28 UTC, independently verifies all 2,631 runtime paths and
exact bytes against both worktrees. The staged source remained unchanged;
root runtime integration `c123ef369da17f5df852cd20efe037f70ba11a1d` is identical.
Both worktrees have clean tracked files before this documentation update.
This result covers the integrated runtime without another duplicate full run.

Compacted the board validation learning and updated the current Form 8582
checkpoints. The 52 main unchecked rows remain frozen; all 42 future rows
remain unworked. This adds no packet, page view, aggregate filing approval,
authenticated accepted ledger, business-rule proof or IRS acknowledgment.
The full-batch parent remains open because the phase's retained-route and
scope decisions are incomplete. The readiness goal remains active.


### October 8 — current code L source-to-packet proof and future discrepancy

Advanced the existing Worksheet 1 passive-income/source/PAL/Form 4797 parent,
using its explicitly recorded missing code-L packet proof. No production or
tracked test source changed. The current [IRS partner instructions](https://www.irs.gov/instructions/i1065sk1)
place box 11 code L section 751(b) issued gain on Form 4797 Part II line 10;
this is distinct from box 20 code L. Constructed current issued-record facts
bind code L, ordinary character, issuer, owner and passive activity. The proof
does not compute or authenticate the issuer's underlying distribution.

With unchanged wages 5,000, issued gain 3,000, farm receipts 2,000 and repairs
7,000, the full graph allows farm loss 3,000 and suspends 2,000. Schedule 1
line 4/5 are 3,000/−3,000, AGI 5,000 and net QBI zero. Investment income
11,950 produces EIC/refund 384; the 11,951 case produces zero EIC/refund.
Both complete twelve-page returns pass the cached TY2025v5.4 Return1040 XSD.
Same-amount code and character substitutions reject public execution,
complete native export and direct Form 4797/1040 PDF projectors.

Supplemental normal typed task **2 passed / 0 failed / 0 ignored (9s)**,
actual session 15272 terminal exit 0, root HEAD `aa739dd2d`:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task --config .state/research/board-execution-2026-10-07/eic-passive-code-l-proof-20261008-v2/deno.json test /Users/atul/projects/opentax/.state/research/board-execution-2026-10-07/eic-passive-code-l-proof-20261008-v2/proof.test.ts`.
The private config copies the root task permissions/imports and removes only
private evidence-directory test discovery exclusion; dependency lock equals
the root lock exactly. This supplemental run is outside the retained full
suite count. All 2,631 runtime paths remain unchanged. Tools remain those
recorded for the integrated full run; rendering uses Poppler 26.09.0 at 110 dpi,
and PDF field/widget inspection uses pypdf 6.14.2.

Private v2 retains source/pending, XML/PDF, extracted text, all 24 page images,
four viewed contact sheets and `review.json`. Full-size review additionally
checked the low-boundary 1040 page 2, Form 4797 page 1, Form 4835 and Form 8582
page 2. Identity, amounts, rows and order agree; both PDFs have zero canonical
fields/widgets. Test log SHA-256:
`6c6db8713e2afdb7599d42f99cddefabe5c56ed458beada65f55ec34e2ec1e92`.
Review SHA-256:
`becbd34e5113b681eb13b5d8b1b36ec235636ea7f4fc83131a403bff0c996950`.

Review found page 8 Form 4835 line 34c missing PAL identification for the
allowed current loss, although native XML has the PAL attribute. The
[Form 8582 reporting instructions](https://www.irs.gov/instructions/i8582)
require that identification. Added future item 43 only, unworked; no source
fix or aggregate filing approval follows. Unused Form 8582 Parts VI/IX black
1.00 total-ratio text is preprinted in the canonical blank form and is not a
new generated discrepancy. Both packets remain qualified for PDF parity.

Preserved v1: its first root task invocation found no modules because the
private directory is excluded; its subsequent private-config typed run passed
2/0 but resolved newer std helpers. V2 repeats with the exact root lock and
is the final scoped proof; neither earlier run is merged into full-suite totals.
No new main TODO or checkbox change. Main 52 unchecked rows remain frozen;
all 43 future rows remain unworked. Wider sources, issuer authentication,
prior acceptance, matching business rules and IRS ATS remain open.

Refreshed the [IRS operational status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status)
at 03:09 UTC: ATS still unavailable through October 13 09:00 Eastern; the
announced reopening is for TY2026, without confirmed TY2025 availability.
Private `ats-status-20261008T030906Z-v1/observation.json` retains the observation.
Board estimate remains zero accepted tests by the original morning deadline
and not estimable after reopening. Local packets do not add IRS acceptance.


### October 8 — Form 2210 dated-payment and installment prerequisite

Compacted the board validation learning before the next form work. Advanced
the existing Form 2210 dated-payment, installment-carry and penalty-workpaper
requirements in isolated `codex/form2210-dated-payments-20261008`, then
integrated candidate `95bf4bb92538ca1d6bc3fd66cb90e0a74bb040df` as root
`f370f4043`. The two new files contain an unregistered pure calculator and
meaningful arithmetic/source-conflict tests. Public inputs and native/PDF
registries remain unchanged; no positive filing guard is opened.

Authority: [2025 Form 2210](https://www.irs.gov/pub/irs-prior/f2210--2025.pdf)
and [instructions](https://www.irs.gov/instructions/i2210), Part III carry,
Table 1 payment timing, Example 3 FIFO allocation and the four 7% rate periods.
The helper retains reviewed payment identities, account taxpayer, actual
dates, exact cents, source references and review dates. It produces regular
lines 10–18 and exact principal/day/rate segments through April 15, 2026.
Withholding uses equal due-date credits. June 16 grace applies only to June's
installment; April principal retains the actual late payment day. The result
explicitly remains filing-unready, payment-authenticity-unverified and annual
required-payment-unreconciled. No filed line 19 is generated.

Final ordinary typed six-module command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test forms/f1040/2025/form2210_payments.test.ts forms/f1040/2025/form2210_box_e.test.ts forms/f1040/2025/form2210_box_e_chain.test.ts forms/f1040/nodes/inputs/f2210/calculation.test.ts forms/f1040/nodes/inputs/f2210/index.test.ts forms/f1040/2025/attachment-coverage.test.ts`.
Actual session 13708 terminal exit 0; **52 passed / 0 failed / 0 ignored**,
393ms test duration, 03:19:53.293656–03:19:58.705874 UTC. This includes eight
new cases and the existing prior-source/native/PDF projection and attachment
guard cases. The new independent daily-balance oracle checks 100 deterministic
inventories and source-order reversal. Tool versions remain Deno 2.9.4,
V8 15.0.245.2-rusty and TypeScript 6.0.3.

Private `form2210-dated-payments-20261008-v2/` retains preflight, runner,
`run.json`, log, `review.json` and `integration.json`. Log SHA-256:
`ba54c1b110759eefbd8c5ab48302d2cd4b5a73f9214263b947f3edfc3395caf4`.
Review SHA-256:
`80c1e4520f58f32e2aa4dc63a964f8e055ee7dc0d91767f4560b6582a6c128aa`.
All 2,631 baseline runtime paths remained exact in root and candidate; the two
new root paths match the tested candidate exactly. The prior full 12,388/0
covers the unchanged baseline, not these additions; a newer complete phase
full result is not claimed. No new packet, PDF page review, XSD or IRS
business-rule/acceptance evidence is added.

Private v1 preserves the initial source snapshot and **6/1** failure log:
returning payment rows in caller order made the entire-result order-invariance
assertion fail. Canonical chronological ordering fixes it. Review also corrected
June 16 grace so it cannot backdate April debt; a dedicated test checks 62 days
for that April payment. These are fixes in this existing task implementation,
not work on any deferred future item.

Required annual tax/prior safe harbor and withholding still need finalized
return/source reconciliation. Actual-date withholding, AI, prior overpayment
credits, early filing relief, waivers/disasters and wider owner/status branches
remain part of the existing form scope, with native/PDF/BR/ATS gates open.
Main 52 unchecked rows remain frozen and all 43 future rows remain unworked.
The pass estimate stays at its 03:09 UTC IRS observation; no acceptance added.


### October 8 — Form 2210 finalized public-return/payment source join

Compacted the board's validation learning before continuing this existing
Form 2210 task. Candidate `94952473c98fc6c8a4c01647c2385d4ba2433da6`
adds the one-call staged public-return payment chain and its tests; integrated
as root `346ee31fe`. The helper executes the public inputs with their entered
box-E claim, derives both current filer SSNs and MFJ status from normalized
general input, checks retained 2024 MFS bytes/digests, and numerically joins
Part I to executor-owned Form 1040. Its regular payment worksheet derives
required annual payment and withholding from those reconciled lines. Ledger
amount or identity overrides reject instead of overriding the return.

Inputs, strictly parsed ledger facts and prior-document byte arrays are
snapshotted before asynchronous verification. A Uint8Array constructor copies
bytes even when a caller uses a buffer subclass whose slice would alias memory.
The tests mutate original inputs, payment amounts and document bytes while
verification is pending; the retained source snapshot determines the result.
The calculated penalty stays an optional worksheet; no Form 1040 line 38 is
inserted and both public attachment guards remain active.

Normal typed seven-module command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test forms/f1040/2025/form2210_box_e_payment_return.test.ts forms/f1040/2025/form2210_payments.test.ts forms/f1040/2025/form2210_box_e.test.ts forms/f1040/2025/form2210_box_e_chain.test.ts forms/f1040/nodes/inputs/f2210/calculation.test.ts forms/f1040/nodes/inputs/f2210/index.test.ts forms/f1040/2025/attachment-coverage.test.ts`.
Actual session 27758 terminal exit 0: **56 passed / 0 failed / 0 ignored**,
950ms test duration, 03:27:14.939054–03:27:45.497137 UTC. Four new tests
include fourteen source/identity/tax/prior-byte/override conflicts plus source
snapshot and unclaimed-penalty checks. Deno 2.9.4/V8 15.0.245.2-rusty/
TypeScript 6.0.3, with unchanged root dependency lock.

Private `form2210-finalized-payments-20261008-v1/` retains preflight, runner,
log/status, review and integration records. Test log SHA-256:
`b06e20c356fed2df41cf7072478571cb282f617bba29ed9509a7720ed92fc788`.
Review SHA-256:
`652fa7ce937b568c2cb8fc50bc14ef0a2ebcc5ddde83b8a51a698dc24a652720`.
All 2,633 prior root/candidate runtime paths matched before integration, and
both new paths match the tested candidate afterwards (2,635 total). The prior
12,388/0 full result covers the older 2,631-path checkpoint; the four later
Form 2210 helper/test additions have focused checks only. Newer phase full
regression is pending; this does not substitute for that board requirement.

Numeric prior/current tax and withholding binding does not authenticate prior
IRS acceptance or source/payment origin. Those flags and `filingReady` remain
false. Wider prior/status/tax/credit patterns, actual-date withholding, AI,
relief/waivers and full native/PDF/BR/ATS remain existing open requirements.
No new packet, page review, schema pass, filing approval or IRS acknowledgment
is counted. Main 52 unchecked rows remain frozen, and all 43 future rows
remain unchanged and unworked. The ATS estimate retains its dated 03:09 UTC
observation. No PR or filing-ready release is opened.


### October 8 — Actual withholding inventory and D/E comparison

Compacted learnings before implementation of the existing Form 2210 task.
Candidate `d8b9ee261cc0403cefe09e29b39f2d197550b781` integrated as
root `e8f745d93`. Actual withholding source rows retain their kind and must
sum to graph-bound annual withholding; the default comparison removes those
rows and uses the same annual total and all other payments. Exact rational
penalties determine whether box D reduces the penalty. The shared source
join snapshots inputs/ledger/prior bytes and binds both worksheets to the
public executor and prior MFS records. The D/E API requires a beneficial
actual method, emits no partial XML/PDF and inserts no line 38; the regular
E-only API keeps its default-method contract. Both export guards remain.

Normal typed command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test forms/f1040/2025/form2210_box_e_payment_return.test.ts forms/f1040/2025/form2210_payments.test.ts forms/f1040/2025/form2210_box_e.test.ts forms/f1040/2025/form2210_box_e_chain.test.ts forms/f1040/nodes/inputs/f2210/calculation.test.ts forms/f1040/nodes/inputs/f2210/index.test.ts forms/f1040/2025/attachment-coverage.test.ts`.
Actual session 33931 terminal exit 0: **62 passed / 0 failed / 0 ignored**,
953ms test duration, 03:36:41.906588–03:37:12.370731 UTC.
Deno 2.9.4/V8 15.0.245.2-rusty/TypeScript 6.0.3; root lock unchanged.
The preliminary two-module 18/0 run is not added to this final count.
Tests include 100 actual-date and 100 default-method deterministic daily
inventories, beneficial early withholding ($101.55 versus $139.66), late
withholding and source/owner/date/method/current-total conflicts.

Private `form2210-actual-withholding-20261008-v1/` retains preflight,
runner, terminal status, log, review and integration. Log SHA-256:
`93f3b8f0e63622a729f3d42b069fff8488b77d621b1c1c01df194080a929ee86`.
Review SHA-256:
`53ad6d062bc1e5be1093f4bcf8cd6753413ff65a8a0d2a3d6508c523e795769d`.
All four updated paths match the tested candidate and 2,631 other runtime
paths remain unchanged (2,635 total). The older 12,388/0 full result covers
those 2,631 baseline paths; later Form 2210 paths have focused evidence only.
Newer full phase regression remains pending.

Reading the [instructions](https://www.irs.gov/instructions/i2210) identified
a separate return-balance filing-date rule not represented by `paid_on`.
Recorded only as future 44 with private
`form2210-balance-date-observation-20261008-v1/observation.json`;
root documentation commit `99281add9`. The handler/tests are unchanged and
that branch remains unqualified. No future task was implemented.
Main 52 unchecked rows remain frozen; 44 future rows remain deferred.
Numeric binding does not authenticate source/payment origin or prior IRS
acceptance. Filing readiness, full native/PDF, business rules and ATS remain
open. No new packet, rendered page, XSD pass or IRS acknowledgment is counted.


### October 8 — Source-derived regular Form 2210 native prerequisite

After compacting learnings, continued the existing Form 2210 task with
`stageForm2210RegularNativeDocument`; root runtime commit `24ebb65a0`.
The API recomputes the source/public-return/prior-byte chain and projects
Part I, D/E reasons and every represented regular-method Part III cell in
schema order. Reviewed the retained TY2025v5.4 IRS2210 schema: 42 regular
fields, 39 emitted after omitting unused A/B/C filing reasons. Schema does
not represent line 12, shaded A cells or D lines 16/18. The exact rational
penalty is rounded directly to whole dollars for line 19; a constructed
83-cent June estimated payment yields exact $101.499555... and line 19 $101,
while the separate cent worksheet is $101.50. No double rounding is used.

Normal typed seven-module command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test forms/f1040/2025/form2210_box_e_payment_return.test.ts forms/f1040/2025/form2210_payments.test.ts forms/f1040/2025/form2210_box_e.test.ts forms/f1040/2025/form2210_box_e_chain.test.ts forms/f1040/nodes/inputs/f2210/calculation.test.ts forms/f1040/nodes/inputs/f2210/index.test.ts forms/f1040/2025/attachment-coverage.test.ts`.
Actual session 89643 terminal exit 0: **65 passed / 0 failed / 0 ignored**,
1s Deno test duration; 03:44:28.505322–03:44:59.500174 UTC.
Deno 2.9.4/V8 15.0.245.2-rusty/TypeScript 6.0.3; root lock unchanged.
Three new checks cover represented native cells plus standalone xmllint
validation, the exact-rounding boundary, and five detached source/prior-byte/
method/balance variants. Both public attachment guards still reject.
The preliminary one-module 8/0 check is not added to the final count.

Private `form2210-regular-native-20261008-v1/` retains preflight, runner,
log/status, schema-map review and integration. Test log SHA-256:
`bdb05ee30337dd3c5e95a82768a84aad571573c6c02003833aa76093656d6c7f`.
Review SHA-256:
`dc573d932227ca9bd7363d6e38388a5f60251f2d8c927d187f7b9dc289afa371`.
The first private schema-map selection also included AI line numbers; retained
unchanged and superseded by v2 stopping before Schedule AI. It is not counted
as 106 regular fields. All 2,636 tested runtime paths match after commit:
one new native helper, one updated test, 2,634 unchanged paths. Older full
12,388/0 covers only 2,631 baseline paths; newer full phase regression pending.

This is **one standalone native-document XSD pass**, not a full return or
filing packet pass. No PDF page, registration, IRS submission/acknowledgment
or source authenticity is added. The new native contract excludes balance
rows while the existing payment/date handler remains unchanged; future 44
is deferred. No line 38 is inserted and filingReady remains false. Full PDF,
final-return penalty reconciliation, broader methods and trusted source/IRS
proof remain open. Main 52 rows stay frozen; all 44 future rows stay unworked.


### October 8 — Interactive Form 2210 regular review PDF

Compacted learnings before continuing the existing Form 2210 requirement.
Root `267adee80` adds `stageForm2210RegularPdfDocument`; the public inputs,
payment facts, prior XML bytes and template are copied before asynchronous
hash/source verification. It calls the native source chain and derives joint
names from the snapshotted public execution. Native/PDF line 19 share exact
rational whole-dollar rounding. Pages 1–2 remain interactive; AI fields/page
are removed. Yes/D/E are selected, shaded cells stay blank, and line 17/18
alternatives follow the printed form. No final Form 1040 line 38 is inserted.

Retained canonical [TY2025 form](https://www.irs.gov/pub/irs-prior/f2210--2025.pdf)
downloaded 03:47:17.571834 UTC, SHA-256
`6899ce672648b280bf00ab47200f1b0fbf40368cfbf137df507b945b8577159a`.
Checked canonical widget/field topology and viewed both canonical pages before
mapping. The PDF operation marker ran successfully once via Deno's node:process
shim immediately before the first PDF-authoring gate (two retained outputs).
The v1 typed gate failed **65/2** because blank IRS widgets lack normal
appearance streams needed by pdf-lib removeField. Retained v1 failed sources,
preflight/log/status; no pass is claimed. Synthesizing blank appearances before
AI removal fixed the newly added helper. Existing future date handler unchanged.

Final normal typed seven-module command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test forms/f1040/2025/form2210_box_e_payment_return.test.ts forms/f1040/2025/form2210_payments.test.ts forms/f1040/2025/form2210_box_e.test.ts forms/f1040/2025/form2210_box_e_chain.test.ts forms/f1040/nodes/inputs/f2210/calculation.test.ts forms/f1040/nodes/inputs/f2210/index.test.ts forms/f1040/2025/attachment-coverage.test.ts`.
Actual session 61326 terminal exit 0: **67 passed / 0 failed / 0 ignored**,
1s test duration, 03:50:21.488865–03:50:24.096072 UTC.
Deno 2.9.4/V8 15.0.245.2-rusty/TypeScript 6.0.3; root lock unchanged.
Two new checks cover reopened interactive fields, joint identity, native/PDF
penalty, shaded/skipped blanks, changed-template rejection and mutation of
caller inputs/ledger/prior/template during awaits. Existing guards stay closed.

Private `form2210-regular-pdf-20261008-v2/` retains final preflight, runner,
log/status, copied constructed-fixture script, two PDFs/XMLs/line records,
field/widget audit, rendered pages, visual review and root integration.
Log SHA-256:
`a819ff43fa3f96f58f94377f10f5b04d00f608cc30da37d32a44c174f606c67e`.
Review SHA-256:
`c5d2e8ce2947239e7e7a38346e3ea8f4aa607b0a9ac7c61dd25a010be8e56f44`.
Each PDF verifies 42 populated values and 55 widgets (including unused blanks),
field/widget value agreement and relationship, nonempty normal appearances,
and no AI terminal fields. Four pages rendered with Poppler 26.09.0 at 110 dpi
and individually viewed. Both joint names/TIN, Part I 10,146 tax/2,000 withholding/
5,000 annual requirement, Yes/D/E, 1,250 installments, carry/underpayment and
line 19 $102/$101 are readable and reconcile to the retained source/lines.
Two corresponding standalone XML documents passed xmllint/libxml 2.9.13.
The focused schema test repeats the regular case; it is not a third distinct
XSD document. These previews are not full return XSD/PDF packets and do not
increase registered/aggregate filing coverage. Interactive fields are preserved.

All 2,637 runtime paths match after commit (one new helper, one updated test,
2,635 other paths unchanged). The older 12,388/0 full result covers only the
2,631-path baseline; six later Form 2210 paths have focused evidence, with
newer phase full pending. Source/payment authenticity, prior accepted filing,
full penalty/final-return reconciliation, broader methods, BR and ATS remain
open. FilingReady stays false and neither registry is activated. Future 44
remains deferred; main 52 and all 44 future rows stay unchanged/unworked.


### October 8 — Form 2210 source limitations retained as future work

Compacted learnings before the next review. Primary [2025 Form 2210 instructions](https://www.irs.gov/instructions/i2210), [2025 Pub.505](https://www.irs.gov/pub/irs-prior/p505--2025.pdf) and [IRM20.1.3](https://www.irs.gov/irm/part20/irm_20-001-003r) confirm the high-income rule and addition of preceding separate tax liabilities; no reviewed source explicitly resolved AGI combination/per-return threshold treatment for the staged prior-MFS/current-MFJ branch. Recorded future45 without changing the existing conservative guard or asserting a tax conclusion.

Independent source/public replay, actual terminal exit0: constructed E-only
ledger estimated payments300000cents; public line26absent, line33withholding2000,
line24tax10146, line37amountowed8146. This is a detached estimated-payment
inventory in the existing fixture, not an IRS rejection. The 83-cent rounding
preview has the same category of source limitation. Annual-payment/withholding
reconciliation flags do not prove the line26inventory. Recorded future46;
no validator, source fixture or runtime was fixed. Private
`form2210-source-boundary-observation-20261008-v1/` retains copied constructed
fixture replay and observation. No PDF authoring or new packet was performed
in this turn. Existing 67/0 and two-document/four-page proofs remain scoped to
unregistered document projections, not complete returns. Main52 remains
frozen; future46unchecked, all deferred. Newer full runtime regression is next.


### October 8 — Newer root full regression started (result pending)

After recording future45/46 unworked, froze runtime bytes for the normal typed
full regression at root `75627ad3b2be0c8dcfc38d86fd4d7e2b6ac2e2c2`
(runtime implementation `267adee80`). Command:
`PATH=/tmp/opentax-poppler-env/bin:$PATH DENO_V8_FLAGS=--max-old-space-size=8192 deno task test`.
Private `root-form2210-full-regression-20261008-v1/` retains the immutable
2,637-path preflight manifest, runner and live log. Actual unified session
22926 reported running, start03:56:34.894260UTC, Deno subprocess82542.
No terminal result or full passing count is claimed yet; observe this same
handle, do not restart after timeout/truncation. Runner will retain actual
subprocess exit, end timestamp, log SHA and final byte-equivalence check.

The previous12,388/0 full result still covers the older2,631-path baseline.
Six later Form2210 helpers/tests/projections await this new full result;
focused67/0 remains scoped. Main52 remains frozen and all46future tasks stay
deferred. Even a full local pass will not establish source authentication,
matching BR, whole-family coverage, IRS submission or ATS acceptance. The
board's broad phase/full requirement remains conditional on its remaining
scope decisions and source work.


### October 8 — Form 2210 inventory documentation reconciled

The previous goal turn made progress by retaining source limitations and
starting the newer full regression; actual session 22926 remains live.
Compacted learnings before the existing coverage-reconciliation task. Actual
imports of ALL_MEF_FORMS and ALL_PDF_FORMS returned 152/148 native entries/keys,
118/115 PDF entries/keys, and zero registered f2210 entries in either.
Independent ReturnData1040 IRS ref parsing found 211 roots; exact-token
occurrence in non-test immediate MeF form files found 128 with/83 without.
This is source inventory, not emitted-document or legal-applicability proof.
Private `form2210-inventory-reconciliation-20261008-v1/audit.json` retains
root/source occurrences, schema hash, actual count observation and manifest
check.

Updated only the existing Form 2210 rows/checkpoint in the root census,
applicability crosswalk, conditional-root notes, form audit and coverage queue.
They now distinguish unregistered 67/0 native/PDF staging and its two standalone
XSD documents/four viewed pages from complete filing support. Prior bytes are
numerically bound; acceptance/authenticity, final payment/penalty joins and
wider methods remain open. Future 44–46 remain deferred. No registry or
runtime changed, no scope exclusion/approval is added, and no main checkoff
is earned by this partial reconciliation. The full run's 2,637 runtime paths
still exactly match its immutable startup manifest; no full result is claimed.
Main 52 remain frozen and future 46 unchanged/unworked.

Refreshed the [IRS operational status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status)
at 04:01:19 UTC: ATS remains unavailable through October 13 at 09:00 Eastern;
the announced 09:01 testing is TY2026, not confirmation of TY2025 availability.
Page last updated September 28. Private
`ats-status-20261008T040119Z-v1/observation.json` retains that observation.
Board estimate remains zero accepted tests/0% acceptance by the original
October 8 morning deadline; after reopening not yet estimable. No accepted
IRS acknowledgment or verified transmission credential is added.


### October 8, 04:07 UTC — Form 8801 requirement reconciliation

Compacted the learning index before reviewing the existing named-form task.
The retained 12,388/0 combined full log contains all 26 Form 8801 module tests
passing; its log SHA and terminal status SHA were independently rechecked.
Corrected the gap note's stale unrun-test description and reconciled official
Part I, credit/carryforward and final-return dependencies against the guarded
preview. The full named-form requirement stays open; no official calculation,
accepted source, registered attachment or filing packet is newly proved.
See [Form 8801](ty2025-form8801-prior-source-gap.md). Private
`form8801-requirement-review-20261008-v1/audit.json` retains those checks.

The actual current full session 22926 was polled and remained running. Its
2,637 startup runtime paths still match exactly; no terminal result is claimed.
Main board 52 unchecked rows remain byte-identical to the frozen baseline.
Future item 47 records stale Form 8801 research guidance (line 6e versus actual
line 6b and preview qualifications); all 47 future tasks remain deferred and
unworked. No runtime or source research file was changed.


### October 8, 04:12 UTC — isolated Form 8801 calculation candidate

Compacted the learning index before implementation. The existing named-form
task now has isolated candidate `3698690eb559d89acdc0dab942f391a1b445e49f` in
`/tmp/opentax-form8801-calculation-20261008`, branch
`codex/form8801-calculation-20261008`. Its reviewed-workpaper calculator covers
Parts I–III line arithmetic and the foreign-income tax worksheet. Normal
focused execution closed with exit zero, **49 passed/0 failed/0 ignored**
(11 new, 26 preview and 12 attachment-guard cases; 191 ms test summary).
Retained final v2 log SHA:
`267f2608a9c3fbadf3de1ac9f84d5b12f8276546fc238df11ab4e89847919cfd`.
Private `form8801-calculation-20261008-v2/` binds source snapshots and startup,
terminal and review records. v1's earlier 48/0 run remains retained.

The calculator is unregistered and unintegrated; current root public behavior
is unchanged. Entered MTCNOL/MTFTCE, AMT capital-basis/foreign modifications,
source authentication, accepted prior records, public execution/ownership,
full numeric range, native/PDF, ledger/import and IRS rules remain open.
All four authenticity/return/filing qualification flags are false. See the
[Form 8801 evidence](ty2025-form8801-prior-source-gap.md).

Actual root full session 22926 remained live when polled. All 2,637 runtime
paths still match its startup manifest; no terminal full result is claimed.
No main row was added or checked; 52 remain byte-identical to the frozen
baseline. All 47 future items, including stale Form 8801 research item 47,
remain unchanged and unworked. The estimate remains zero accepted ATS tests
by the original deadline, with reopening pass probability not yet estimable.


### October 8, 04:24 UTC — isolated Form 8801 public-capacity/source join

Compacted the learning before work. Candidate
`190caa6f89ed7dbf9cf7f1ffa1ed67b798b74232` adds byte-bound canonical review JSON
and a capacity-only public Form 8801 request on the isolated branch. The
normal public graph computes current Form 6251 line 9; staged current tax and
mapped Schedule 3 credits reconcile to public Form 1040 amounts. No calculated
credit is inserted into that return. Primary identity and async-copy/tamper
boundaries are covered. See [Form 8801](ty2025-form8801-prior-source-gap.md).

Final four-module typed run **60 passed/0 failed/0 ignored** (660 ms summary),
actual session 94775 closed with observed exit zero. Startup/terminal/source
snapshots and review are private in `form8801-reviewed-return-20261008-v6/`.
Retained log SHA:
`06692d03d373a394cfa48916923e02fe213619393de4108a9eca9c4af7ce771b`.
Earlier failed v1–v5 artifacts are preserved; v1 retains source/observation
rather than a full log. Test expectations use reviewed IRS current-year tax
worksheet/table amounts. The existing incomplete Form 1116 excess-source
review rejection remains covered; it is not waived to obtain a positive test.

Review-package digest integrity and current numeric capacity are proved only
for the tested staging contract. Actual filed-return bytes/acceptance,
workpaper authenticity, all owner/status combinations, finalized credit totals,
accepted carry/import and native/PDF/IRS filing evidence remain open. Candidate
flags preserve those limitations. Root runtime remains unchanged at the live
full-run manifest's 2,637 paths; both candidate commits stay isolated pending
integration and broader verification. Main 52 remain frozen, future 47
unchanged and unworked; no aggregate filing/coverage count is increased.

IRS ATS status rechecked **04:19:46 UTC** at the
[official status page](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status):
still unavailable through October 13 at 09:00 Eastern; only TY2026 testing is
announced afterward. TY2025 availability remains unconfirmed. Private
`ats-status-20261008T041946Z-v1/observation.json` retains this observation. Board
estimate remains zero accepted ATS tests/0% obtaining acceptance by the original
morning deadline; reopening pass probability not yet estimable.

The same actual root full session 22926 was polled again after this checkpoint
and remained live; no terminal full-run result is claimed.


### October 8, 04:42 UTC — isolated Form 8801 final-amount settlement

Compacted learnings before implementation. Candidate
`1ea5bc1d73f37521dc9849c7e1f1b54c48dea925` retains executor-owned finalizer
inputs (updated for adoption/QEF stages) and recomputes Form 8801, Schedule 3,
Form 1040 and dependent limits. Seven new settlement cases cover full/partial/
zero credit, carry, refund transition, preceding foreign credit, guarded
vehicle-only attachment and later bond-credit capacity. In the latter case,
MTC 5,182 reduces allowed bond credit 20,000→17,485 and leaves bond unused
credit 2,515. Source and snapshots are derived internally; export guards
remain active. See [Form 8801](ty2025-form8801-prior-source-gap.md).

Final standard typed 15-module run **171/0, zero ignored**, 1m18s test summary;
actual session 24885 closed with observed exit zero. Private
`form8801-settled-return-20261008-v3/` retains a 2,644-path candidate manifest,
source snapshots, schema digest, log/status and review. Log SHA:
`bbb07d7c0326cc0b2d7f1e11112094336ece80449edacd14e60e1d299bc039a1`.
v1/v2 infrastructure-failed runs and sources are retained. No guard was
removed to obtain passing evidence. Existing collateral native/PDF tests are
regressions, not new Form 8801 filing or visual evidence.

Only local final amounts are reconciled; accepted prior history, workpaper
authenticity, all credit/owner/status/numeric cases, registered native/PDF,
accepted carry/import, matching rules and IRS acceptance remain open. Public
filing admission and finalized-return flags remain false. All candidate
runtime changes remain isolated; actual root full session 22926 was polled
and remained live, and its 2,637 paths still match startup exactly. No full
terminal result is claimed. Main 52 stay frozen and all future 47 unchanged/
unworked. Existing aggregate packet/page/coverage counts are unchanged.


## Isolated native document — October 8, 04:49 UTC

Candidate `1f87c4046bcddff6cf02460a83ad74ba52f2706f` adds `stageForm8801NativeDocument` after
byte-bound review and final credit settlement. All 53 represented TY2025
IRS8801 fields follow the retained schema sequence. Schema-shared lines 17
and 41 have no separate elements; skipped tax/capital cells remain absent.
A nonpositive line 21 emits no document, respecting the schema's positive
amount requirement. Caller-supplied calculated lines and changed review
bytes remain rejected. This is a prerequisite projection, not a registered
filing route.

The normal typed six-module run passed **74/0, zero ignored**, including seven
new native cases. Six standalone documents passed the retained IRS8801 XSD:
partial credit/carry, negative deferral, signed exclusion/Part I stop,
Schedule D including the 25% computation, zero allowed credit with positive
carry, and qualified-dividend skipped cells. The exact schema sequence is
also checked against every represented line. Private
`form8801-native-20261008-v2/` retains sources, 2,646-path startup manifest,
full log, terminal status and review; log SHA
`65cb09d6881f2dfbdcff0901abbf8d4875c9d473a4c25460f6053310fb7f41d8`.
The failed v1 type-check log/status and source snapshots remain retained;
the generic schema-map assertion was corrected without bypassing typing.

The candidate remains isolated; root's original full regression was confirmed
live and its 2,637 startup runtime paths still match exactly. Both public
attachment guards remain active. No Form 8801 PDF, complete-return XSD,
matching business rules, accepted prior history, authentic workpapers,
durable accepted carry/import or ATS acceptance is proved by this result.
The broader main task remains open and aggregate coverage counts do not
increase. All future tasks remain deferred.


## Isolated interactive Form 8801 PDF — October 8, 04:55 UTC

Candidate `d55fd76763d26605114eb20ce2b7dabdda044623` adds
`stageForm8801PdfDocument` after reviewed-source settlement and native
projection. It snapshots all caller inputs and bytes before hashing,
requires the exact [2025 IRS template](https://www.irs.gov/pub/irs-pdf/f8801.pdf)
SHA `b82dff67ecf37406bab02f177c706295bd6084853a9ba8be5c87a35c74668a78`,
and derives filer names/primary SSN from the projected public identity.
Joint names require both spouses. All 55 printed lines, including native
shared lines 17/41, use calculated amounts; skipped cells stay blank. Unused
Part III pages and fields are removed on ordinary-rate branches; capital
branches retain all four pages. A nonpositive line 21 emits no PDF.
The canonical source remains unchanged, and output AcroForms stay interactive.

The final normal typed seven-module run passed **82/0, zero ignored**:
calculation, public capacity, settlement, native, PDF, shared guards and
existing preview cases. Private `form8801-pdf-20261008-v2/` retains sources,
2,648-path startup manifest, log, terminal status and review. Log SHA:
`48e0aa5e7769611666d69efe16128aa52a2348073acbef9ec8670dcbbe5ed87e`.
The earlier v1 81/0 checkpoint remains retained; v2 adds joint identity and
missing-spouse rejection. No test guard/type check was bypassed.

Private `form8801-pdf-20261008-v1/output/pdf/` retains two constructed review
previews: partial credit (2 pages, 28 populated widgets, credit 1,475/carry
3,707) and Schedule D (4 pages, 57 populated widgets, credit 9,573/carry
60,963). Canonical source fields and widgets were inspected before filling.
Reopened output canonical values, effective widget values, identity and
calculated lines agree; every widget has a nonempty normal appearance.
Retained native XML matches its calculation in schema order. All six final
rendered pages were individually viewed: amounts are legible in the proper
rows, including signed line 18 and the 25% capital computation. The PDFs
retain native fields and are not flattened. Source JSON, native documents,
logical/visual review and hashes are retained with the previews.

Root's 2,637 startup runtime paths still match the live full regression.
All five Form 8801 candidate commits remain isolated. This completes the
tested local calculation/settlement/native/PDF prerequisites, not the whole
filing route. Actual accepted prior-return records, authenticated MTCNOL,
MTFTCE/capital-basis workpapers, all owner/status/credit combinations and the
full numeric range, durable accepted carry/import, public route/packet
integration, matching business rules and IRS acceptance remain required.
Both public attachment guards stay active; aggregate filing/PDF counts and
main checkboxes do not increase. All future tasks remain unworked.


## Isolated retained prior-return byte reconciliation — October 8, 05:01 UTC

Candidate `19ee3b671374b8be63d506db88f0c5af1cae045f` adds
`inspectForm8801PriorReturnBytes` and `stageForm8801PriorBoundReturn`.
The latter snapshots public inputs, review/prior bindings and all bytes
before awaits, settles the current credit, then reconciles review facts to
one exact SHA-bound retained 2024 XML return copy. Review JSON and prior
XML references must be distinct; caller acceptance flags reject.

The inspector verifies the IRS element namespace (including prefix bindings),
2024 year/period/1040 type, actual header primary SSN, prior filing-status
code, selected Forms 6251/8801 document IDs and duplicate document IDs.
Ten source Form 6251 fields and prior Form 8801 line 26 must match the
reviewed facts exactly. Missing forms/optional amounts can reconcile only
zero claimed source amounts; they cannot supply a positive AMT or carry.
Duplicate fields/forms, changed source amounts, ambiguous/unsafe dollars,
malformed XML, external entities/CDATA, changed/missing bytes and reused
references reject.

The [official IRS TY2024 package](https://www.irs.gov/pub/irs-schema/py2025r1.zip)
was retained with CRC/digest verification. Its `mef/Stylesheets/2024/IRS6251.xsl`
and `IRS8801.xsl` ground the mappings: 2024 line 1 is
`AGIOrAGILessDeductionAmt`, rather than the TY2025 line 1a/1b fields;
`TotalRefundReceivedAmt` stores a nonnegative magnitude printed as a negative
line 2b. Signed income/interest/depletion amounts remain signed. No 2024 XSD
or full prior-return validity/IRS acceptance is inferred from stylesheets.

The normal typed seven-module run passed **84/0, zero ignored**, including ten
new prior-copy cases and existing calculation/capacity/settlement/native/guard/
preview checks. Private `form8801-prior-bytes-20261008-v1/` retains official
ZIP/stylesheets, source snapshots, 2,650-path startup manifest, log/status and
review. Log SHA:
`26c58422ac1ac596615a88474cde0a2c48748415d1d391426d5ea066d5d205db`.
Root's live full regression still uses its exact unchanged 2,637 startup paths;
all six Form 8801 candidate commits remain isolated. No PDFs are newly
created/delivered or added to aggregate counts by this step.

`priorReturnBytesVerified` and `priorForm6251AndCarryBytesReconciled` become true
for the constructed matching copy. This proves byte/line consistency, not
that the copy was filed or accepted. `priorAcceptanceVerified`,
`workpaperAuthenticityVerified`, `finalizedReturnReconciled` and `filingReady`
remain false. Additional exclusion inventories, MTCNOL, MTFTCE, unallowed
vehicle credit and capital/foreign modifications still need their source
proof. Joint allocation and status-change history, accepted carry/import,
registered return/PDF/native packet integration, all credit/owner/numeric
combinations, matching business rules and ATS acceptance remain open.
Both public attachment guards remain active; main checkboxes and future work
remain unchanged.


## Isolated MTFTCE election amount binding — October 8, 05:06 UTC

Candidate `ad6201a53ba384b63ca62accf9a93a302d2c5fbe` extends the existing
Form 8801 prior-copy verifier with a reviewed MTFTCE method. For the election
to claim 2024 foreign tax credit without Form 1116, the
[2025 Form 8801 line 12 instructions](https://www.irs.gov/instructions/i8801)
use prior Schedule 3 line 1. The canonical review JSON must explicitly name
`without_form1116_election`; its entered amount must equal
`ForeignTaxCreditAmt` in the bound 2024 `IRS1040Schedule3` document.
The exact field name is confirmed in the retained official TY2024 stylesheet.
The verifier rejects missing/wrong Schedule 3 document bindings, changed or
negative amounts, duplicate Schedule 3 documents and any retained IRS1116
family document conflicting with that election. Absent Schedule 3 can match
only a zero amount. Ordinary/general-refiguring review facts do not acquire
this proof merely because Schedule 3 foreign credit is present.

The normal typed seven-module run passed **88/0, zero ignored**, including
four new election cases. The constructed elected prior credit of 125
reconciles to Form 8801 line 12, changes exclusion tax to 793 and current
minimum-tax credit to 5,307; finalized local Form 1040 line 22 is 12,560.
Missing/detached/election-conflict branches reject. Private
`form8801-mtftce-election-20261008-v1/` binds sources, the TY2024 Schedule 3
stylesheet, 2,650-path startup manifest, log/status and review. Log SHA:
`e2901452079e24f2e5e3cb93a0e5f88bbaebe00dfa4f410bcdd9e36e16300975`.
Root's live full regression still matches all 2,637 startup runtime paths.
All seven Form 8801 candidate commits remain isolated.

`minimumTaxForeignCreditAmountReconciled` is true only for this explicitly
reviewed and matching amount contract. It does not authenticate election
eligibility, payer/source records, filing or acceptance. General MTFTCE
refiguring across foreign categories, exclusion adjustments, preferential
rates, carryovers and limitations remains required by the existing task;
MTCNOL, additional exclusions, vehicle credit, capital/foreign workpaper
provenance, joint/status-change history, accepted carry/import, public
packet integration, all owner/credit/numeric cases, matching business rules
and ATS acceptance also remain open. Both public attachment guards remain
active. No main checkoff or aggregate coverage increase follows, and all
future tasks remain untouched.

### October 8 — reviewed general MTFTCE category calculation

Isolated candidate `693ba8381` derives the general Form 8801 foreign-credit
workpaper arithmetic from category/country facts and calculated Form 8801
lines 4/11. It computes indirect-deduction shares, category net income,
reviewed tax reductions/carry amounts, high-tax transfers, limitations,
category aggregation, boycott reductions and preferential worldwide-income
adjustments. Simplified election uses reviewed prior AMT line 17 instead of
Part I. The entered aggregate must match calculated line 35/8801 line 12.
The contracts follow the [2025 Form 8801 instructions](https://www.irs.gov/instructions/i8801)
and [2024 Form 1116](https://www.irs.gov/pub/irs-prior/f1116--2024.pdf).

The normal typed seven-module run passed **72/0, zero ignored**; the separate
two-module public-input/attachment-guard run passed **38/0, zero ignored**.
Fourteen new tests include multi-country deductions, multi-category limits,
reclassification, carry/reductions, losses, 951A/901(j), treaty uniqueness,
simplified election, section 960 increase, boycott, preferential factors,
MFS thresholds, changed totals and canonical public-return settlement.
The constructed general case calculates foreign-credit limit 2,230 and
Form 8801 line 12 of 2,000, current credit 6,100, final Form 1040 income tax
11,767 and refund 8,233. Private `form8801-mtftce-refigure-20261008-v2/`
retains source snapshots, 2,652-path manifests, log/status and review;
log SHA `e8ae080bee489fae8db30440a30ae592189f13e600d7a42e0c59cfacd92a7d8a`.
`form8801-mtftce-refigure-guards-20261008-v1/` has guard log SHA
`2f9a31e9a7f40f9c89a3d0104707a575d7a3c04387c7122c9c018e863a6f7a1e`.
The first typed run failed on a test-fixture literal type; its unchanged
sources and failed terminal evidence are preserved in v1. No type checking
was disabled. All eight Form 8801 implementation commits remain isolated.
Root still matches all 2,637 startup runtime paths of its live full run.

This proves reviewed line arithmetic for these cases. Exclusion-only gross
income, foreign capital/loss adjustments, category/high-tax eligibility and
carry history remain reviewed inputs requiring source derivation and
provenance. `mtftceWorkpaperArithmeticReconciled` is separate from source
or accepted-filing proof. Neither prior source verification nor the public
filing guards are weakened. General source authenticity/eligibility, MTCNOL,
accepted prior history, joint/status changes, durable carry import, complete
combinations, packet integration, matching business rules and IRS acceptance
remain required by the existing main task. No main checkoff or aggregate
coverage increase follows; all 47 future items stay unworked.

### October 8 — foreign dividends and capital-distribution adjustments

Isolated candidate `6ff9ea2a8` extends the reviewed MTFTCE calculation with
country-level foreign qualified-dividend and capital-distribution rate bands.
The [Form 8801 instructions](https://www.irs.gov/instructions/i8801) supply the
preferential trigger, 0.5357/0.7143 adjustments, zero-rate omission and
Form 4952 election exception. Actual calculated Form 8801 cells and the
reviewed regular-tax exception select the adjustment method. The category's
rate-band total rounds once; deterministic largest-remainder allocation
reconciles country columns. Entered country income must match the derived
amount. Each country in the category must supply the same derived method;
other capital gains/losses cannot be asserted as distribution-only inputs.

The normal typed nine-module run passed **116/0, zero ignored**, including
six new source-band/exception/rounding/public-return cases and all existing
input/attachment guards. The constructed adjusted income is 35,571 versus
58,500 without an adjustment trigger or with a qualified exception. The
Form 4952 elected 1,500 remains unadjusted. Two countries with one dollar
each at the 15% rate produce one category adjustment dollar. Public-return
settlement retains credit 6,100 and income tax 11,767. This does not prove
issuer records or the underlying rate allocation/election qualification.
Private `form8801-mtftce-distributions-20261008-v2/` retains source snapshots,
2,652-path manifest, actual exit-zero log/status and review. Log SHA:
`a395663ac7e95805557f7b9524caad257eaff283ed43781dbf17a10e77dfd0ca`.
V1's passing run is preserved; V2 corrects the constructed gross-income
allocation inputs and reruns the same command. All nine Form 8801 candidate
commits remain isolated; root's running full regression matches its 2,637
startup runtime paths.

The original task still requires wider source-derived exclusions,
capital-gain/loss Worksheets A/B and Pub. 514 adjustments, authenticated
rate allocations/elections and prior acceptance, MTCNOL, joint/status-change
history, durable carry import, all combinations, native/PDF packet admission,
business rules and IRS acceptance. No main checkoff or aggregate coverage
increase follows. All 47 future items remain unchanged and unworked.

### October 8 — prior joint-return spouse identity

The isolated Form 8801 candidate now requires a distinct reviewed spouse SSN
when prior status is married filing jointly. Both calculator and canonical
review schemas use one shared identity refinement, so omitting current-return
fields cannot remove that requirement. Prior-copy inspection matches the
reviewed spouse to `ReturnHeader/Filer/SpouseSSN`; a missing, swapped,
duplicate, nested or foreign-namespace value rejects. The official TY2024
`IRS1040.xsl` retained from `py2025r1.zip` confirms the header filer field.
`priorJointSpouseBytesReconciled` records only this matching joint-copy
contract. It remains false on an ordinary single-filer copy and does not
prove filing, acceptance or status-change credit allocations.

The normal typed nine-module run passed **120/0, zero ignored**, including
four new prior-joint identity/byte/public-settlement cases. The constructed
same-pair joint return retains zero exclusion-only net tax and 6,100 current
minimum-tax credit; public Form 1040 tax decreases by that calculated credit.
Both export guards stay active. Private `form8801-prior-joint-20261008-v4/`
retains source snapshots, 2,652-path manifest, log/status and review; log SHA
`29dbf1aecd4e43809094c0a3a3b6d2f782aa49c88bcde152346436ea9779149a`.
The primary source stylesheet/digest is retained in v2. V1's test typing
failure, v2's missing-spouse rejection failure and v3's repeated unchanged
failure after an unsuccessful edit are preserved. V4 restores shared schema
validation and runs the same typed command with all cases passing.

Ten Form 8801 implementation commits remain isolated. Root runtime still
matches all 2,637 startup paths of the live full regression. Prior spouses'
source authenticity, accepted history, joint/separate and changed-spouse
allocations, durable import, the other source/calculation gaps, packet
integration, matching business rules and IRS acceptance remain open. No main
checkoff or aggregate coverage increase follows; the whole future section
remains unchanged and unworked.

### October 8 — reproducible unfiled Form 8801 carry record

Isolated candidate `a64b887c8` adds `stageForm8801CarryRecord` and a retained-
byte verification API. It recomputes prior-source-bound public settlement;
the canonical record binds current public-input SHA, review and prior-return
manifests, current/prior filer identities, calculated lines, credit used and
ending carry. Verification requires exact retained bytes and recomputes from
all original sources, rejecting edited records even with a coherently changed
hash. Source and record references remain distinct; all caller facts and
bytes are copied before the first await.

Records have fixed `local_unfiled` status and false current/prior acceptance,
filing-ready and next-year filing-import flags. They support a reproducible
local opening preview only. The prior-year MTFTCE workpaper record identifies
2024 as originating and 2025 as its next workpaper year; it is not mislabeled
as the 2025 minimum-tax-credit carry opening in 2026. These year/amount
contracts follow the [Form 8801 instructions](https://www.irs.gov/instructions/i8801).

The normal typed ten-module run passed **127/0, zero ignored**, including
seven new disk-round-trip, coherently rehashed tamper, changed public source,
nonpositive stop, byte/reference conflict, pre-await copying and MTFTCE-year
cases. Private `form8801-carry-record-20261008-v2/` retains sources, 2,654-path
startup/terminal manifest, log/status, generator and actual persisted source
and record files. Log SHA:
`d46ebe4d79e4e11bf9cd1b347d8ed80ad9774c2f21823a47f05c3667db721d4f`.
Its disk-reopened partial-credit sample has used credit 1,475 and carry 3,707;
record SHA `513530d62f26a5ac8a7b57f4c715ee11892ff75e500f4dbe41cb904f76ff65a5`.
The separate MTFTCE case records 770 opening its 2025 workpaper and current
minimum-tax-credit carry 4,625 opening 2026. V1's 126/0 run is preserved.
The first sample generator failed to locate a single-quoted fixture and
wrote no output; its source is preserved. `generate-v2.ts` successfully
retained/reopened the constructed sample and verified all original sources.

All eleven Form 8801 implementation commits remain isolated. Root's full
regression is still confirmed live and its 2,637 startup runtime paths match.
Accepted-filing admission and import, authenticated source/acceptance bytes,
status-change allocations, the other source/calculation requirements,
public packet integration, matching business rules and ATS acceptance remain
open. No main checkoff or aggregate coverage increase follows. All future
items stay unchanged and unworked.

### October 8 — verified full-regression wait and NOL source requirement

The existing root full regression was polled through its actual session
`22926`, including a 45-second wait, and remained live with no terminal result.
The current runtime independently matches all 2,637 startup paths; isolated
Form 8801 candidate `a64b887c8` matches its last tested 2,654-path manifest.
The private full-run observation records the actual live handle, timestamp,
manifest comparison and next action. No second full batch or restart occurred.

The [Form 8801 line 3 instructions](https://www.irs.gov/instructions/i8801)
require MTCNOL carryovers/carrybacks **to 2024** and a separate exclusion-only
section 172(d) refigure. [Regular Form 172](https://www.irs.gov/pub/irs-pdf/f172.pdf)
and [its instructions](https://www.irs.gov/instructions/i172) do not themselves
prove that separate minimum-tax workpaper, its carry history or eligibility.
No current-origin loss is substituted for the required prior-year deduction,
and no new NOL implementation, source proof or test result is claimed by this
review. The existing NOL and whole-form requirements remain open. Main52 and
the complete future47 section remain unchanged; estimate remains current.

### October 8 — reviewed MTCNOL vintage-history calculation

Isolated candidate `947ed15df` adds per-vintage minimum-tax-credit NOL history
arithmetic. Reviewed records name independent exclusion-only origin losses,
owner/year, carry direction, eligibility-workpaper reference and chronological
prior usage. The calculator derives origin loss less prior uses, then sums
amounts carrying to 2024 for Form 8801 line 3. The reviewed aggregate must
match that sum. It rejects duplicate origin/owner or item records, reversed
carry direction, a 2024 origin substituted for a carry to its own year,
nonchronological/ineligible use years, overused losses, conflicting totals
and owners outside the reviewed 2024 filer. A reviewed prior-joint spouse
can own a vintage; legal source/owner allocation is not authenticated.

The [Form 8801 line 3 instructions](https://www.irs.gov/instructions/i8801)
require separate exclusion-only section 172(d) losses and carryovers/carrybacks
to 2024. These origin amounts and legal carry eligibility/expiry remain
reviewed inputs. Neither regular NOL nor prior Form 6251 line 2e is reused as
MTCNOL. `mtcnolWorkpaperArithmeticReconciled` denotes depletion/aggregation
only; origin-loss calculation, eligibility, source authenticity and acceptance
remain false/unproved. No full section 172(d) origin refigure or accepted
history is claimed. Legacy entered workpaper previews remain unproved.

The normal typed eleven-module run passed **137/0, zero ignored**, including
ten new vintage/depletion/year/owner/aggregate/public-return cases. The
constructed 2019 origin 50,000 less 30,000 prior use leaves 20,000; reviewed
2025 carryback 8,000 less 2,000 prior use leaves 6,000, producing line 3 of
26,000. Local Form 8801 line 4 is 94,000, exclusion tax is 2,158 and net
exclusion-only AMT zero. At current public wages 30,000, credit 1,475 and
carry 4,625 reconcile with zero remaining income tax. A reviewed carry total
above AMTI stops the Part I tax cells rather than inventing a same-year loss.
Private `form8801-mtcnol-history-20261008-v1/` retains source snapshots,
2,656-path manifest, log/status and review; log SHA
`e1ce134e6621f8deec6b8cfe7feec325a60147da845a3507bbe1acfe33d7ff9f`.
The previously retained 3,707 local carry record was reverified from original
on-disk source files under this implementation without changing its bytes or
hash `513530d62f26a5ac8a7b57f4c715ee11892ff75e500f4dbe41cb904f76ff65a5`.

All twelve Form 8801 implementation commits remain isolated. Root's actual
full-regression session is still live and all 2,637 startup runtime paths
match. Source-derived NOL origin modifications, authenticated eligibility,
expiry/amendment and owner history, accepted carry import, other source and
calculation branches, packet integration, matching business rules and IRS
acceptance remain open. No main checkoff or aggregate coverage increase
follows; all future items remain unchanged and unworked.

### October 8 — exclusion-only MTCNOL origin workpaper arithmetic

The isolated candidate now calculates an individual's reviewed 2018–2025
MTCNOL origin workpaper from exclusion-only AMT income, deductions and
business/nonbusiness capital items. It derives the net capital gain or
limited capital-loss deduction, recalculates the nonbusiness deduction limit,
and applies the separate section 172(d) capital modifications. The basis
contract requires personal exemptions removed, section 1202 exclusion restored
to full gains and NOL/QBI deductions excluded. These are reviewed basis facts,
not issuer/return authenticity. The calculation adapts the
[Form 172 Part I workpaper arithmetic](https://www.irs.gov/pub/irs-pdf/f172.pdf)
to the [Form 8801 exclusion-only instructions](https://www.irs.gov/instructions/i8801);
it does not emit an ordinary Form 172 or replace regular/AMT NOL computation.

A vintage can include this origin refigure. Owner/year must match the vintage,
and its declared origin loss must equal the calculation before prior uses
are deducted. Per-vintage origin arithmetic is recorded separately. A mixture
of computed and entered-review origins cannot claim all origins refigured.
Source-basis, legal eligibility, acceptance and filing flags remain unproved.
There is no carry-expiry, amendment, spousal-allocation or section 172(b)(2)
absorption inference from these arithmetic results; older-origin refiguring
and complete raw-source classifications remain required by the original task.

The normal typed twelve-module run passed **146/0, zero ignored**, including
nine new origin/nonbusiness/capital/MFS/no-loss/source-conflict/vintage/public
cases. The constructed gross 13,000 less deductions 90,000 yields preliminary
loss 77,000, with nonbusiness deduction adjustment 17,000 producing MTCNOL
60,000. Separate capital cases reconcile 3,000 versus MFS 1,500 deductions
and capital-gain/nonbusiness-deduction interactions. A computed 2019 origin
50,000 less reviewed prior uses 30,000 derives Form 8801 line 3 of 20,000;
line 4 is 100,000, tax 3,718, current public credit 1,475 and carry 4,625.
Changed origin amounts/owners/years and changed underlying items reject.
Private `form8801-mtcnol-origin-20261008-v1/` retains source snapshots,
2,658-path manifest, exit-zero log/status and review; log SHA:
`97ad831bc2ce8c23c0a53745ff9ac6d9c0c01790066eec264c5ae9e867cb05ae`.

All thirteen Form 8801 implementation commits remain isolated. Root's full
regression was polled through its actual live session and independently
matches all 2,637 startup runtime paths. Full source proof, all historic
origin/carry/owner combinations, accepted import, packet integration, matching
business rules, ATS acceptance and the other main requirements remain open.
No main checkoff or aggregate coverage increase follows. The entire 47-item
future section remains unchanged and unworked.

### October 8 — Form 8801 integration checkout verified

All thirteen isolated implementation commits applied without conflicts to
`codex/form8801-integration-20261008`, based on root `8e574fe89`. Its
`e287d52cb05657a4779968eb701a26a9ace957b8` runtime matches all 2,658 candidate
paths exactly. The normal typed 22-module integration run passed **250/0,
zero ignored**, closing at 05:50:42 UTC. It covers the complete staged
Form 8801 suite plus shared executor/input precedence, finalized Form 1040,
PFIC/adoption/education refiguring, Form 3800 ordering and Form 8912 replay.
Private `form8801-integration-focused-20261008-v1/` retains the command,
source manifest, exit-zero status, terminal review and log SHA
`f7593c10caa1091a77ac89e5b60732636c46726a6449f015550a0eef8e61155d`.

Root's full regression remains live on its original session; all 2,637
startup runtime paths still match. Root integration and a subsequent serial
full regression remain pending. Form 8801 native/PDF export guards remain
active; local workpaper arithmetic and byte consistency do not prove source
authenticity, prior acceptance, accepted carry import, business rules or ATS
acceptance. No main checkoff or aggregate coverage increase follows. The
main board and entire 47-item future section remain unchanged.

### October 8 — root Form 2210 full regression closed

The original root `deno task test` run finished at 05:58:32 UTC with actual
tool exit zero: **12,411 passed, 0 failed, zero ignored** (121m41s). All
2,637 runtime paths match its startup manifest. Launch head was
`75627ad3b2be0c8dcfc38d86fd4d7e2b6ac2e2c2`; subsequent root changes were
documentation only. Private `root-form2210-full-regression-20261008-v1/`
retains command/environment preflight, log, terminal status and independent
terminal review. Log SHA:
`d3a903aa7dad3581f177d77a08a92256e272a11d8be147fcb3a4b8be44c87e34`.
This validates the root runtime including staged Form 2210 work; it does not
prove the whole phase's outstanding filing routes or IRS acceptance.
Form 8801 integration will require its own subsequent serial full run.

### October 8 — Form 8801 integrated into root; serial full run started

After the previous full regression's verified exit zero, all thirteen
Form 8801 commits applied to root without conflicts. Runtime head
`46cac16e5412ba92caf5707bd7ad128b371d2851` exactly matches the focused-tested
integration checkout on all **2,658 runtime paths**. The next normal
`deno task test` started at **05:58:56 UTC**, serially after the earlier run.
Private `root-form8801-full-regression-20261008-v1/` retains the startup
commit, runtime manifest, command, Deno/Poppler versions, environment and
integration review. Its live session is 88611; there is no terminal result
yet. Keep the runtime unchanged while it runs. The 250/0 focused result
remains applicable to these exact bytes, but full-regression success is
unproved until this new run terminates and its digest/manifest are checked.

The staged calculations, retained prior-return comparison, local carry
record, native projection and interactive PDF are now on root. Public
Form 8801 filing export remains guarded. Authentic workpapers, accepted
prior/source records, complete owner/history branches, accepted carry
import, packet admission, matching business rules and IRS acceptance remain
open. No existing main TODO is proved complete by this integration; main
board/future scope and coverage aggregates are unchanged.

### October 8 — general reviewed individual loss-year Part I workpaper

Isolated branch `codex/form172-loss-year-20261008` now computes regular-tax
individual 2018–2025 loss-year workpapers from reviewed allowed items. It
reconciles the inventory to the reviewed Form 1040 AGI and standard/itemized
deduction, then applies business/nonbusiness capital and deduction limits,
section 1202 restoration and prior-NOL addback. The return's year, status,
primary/spouse identities and item ownership must match. Joint inventory
produces a joint loss amount; it does not allocate that loss for later changes
in marital status. QBI is outside Part I's AGI-minus-deduction base. The
[Form 172 Part I](https://www.irs.gov/pub/irs-pdf/f172.pdf) and
[IRS instructions](https://www.irs.gov/instructions/i172) were retained with
URL/date/digest in private `form172-loss-year-source-20261008-v1/`.

An optional reviewed Form 172 copy must match every computed Part I line;
missing calculated cells or nonzero skipped cells reject. Source classification
and prior loss limitations remain reviewed facts. Neither typed references
nor consistent amounts establish issuer authenticity or filing acceptance.
This workpaper does not prove prior utilization, carryback elections, expiry,
section 172(b)(2) absorption, excess-business-loss carry, ATNOL, current-return
deduction or native/PDF attachment admission. All existing NOL filing guards
remain active. Pre-2018 origins and full historic loss/carry rules remain in
the original task's required scope.

Normal typed four-module validation passed **31/0, zero ignored** at
06:04:35 UTC, including eleven general-source tests, the existing simple
2024 review, public NOL rejection and attachment guards. Cases reconcile
50,000 simple loss; wages/interest/IRA/SE deductions deriving 33,000;
MFS capital-loss limits; mixed business capital losses; section 1202 with
and without a Schedule D loss; prior-NOL removal; and 35,000 joint loss.
Changed return/copy amounts, year, identity, duplicate source IDs, invalid
exclusions and unsupported inputs reject. Private
`form172-loss-year-focused-20261008-v3/` retains source snapshots, the
2,660-path candidate manifest, command, terminal exit-zero status and review.
Log SHA: `a3cb94f400f3863da3b5b3d8317373166bcf6d3cecd0dea703357d6a0d740fec`.
Implementation commit `7d887e6b1` remains isolated while root's existing
full regression runs unchanged on 2,658 paths. No main checkoff or aggregate
coverage increase follows; all 47 future items remain unchanged and unworked.

### October 8 — byte-bound Form 172 current loss-year native projection

The isolated candidate now verifies a digest-bound canonical review package
and recalculates the loss-year inventory before projecting TY2025 `IRS172`
Part I. Bindings must match the workpaper reference, 2025 calendar year and
primary/spouse identities. The 24-line map matches the actual IRS sequence.
Paper-skipped capital cells remain absent except line 21: its IRS element is
required, so the mathematically zero value is emitted on that skip branch.
Positive origin loss retains signed negative Form 172 line 24; a non-loss
emits no attachment. Historical-year packages cannot be mislabeled as a
current TY2025 loss-year document. This current-origin projection is not a
historical carry attachment or Part II implementation. Those original
requirements remain open, along with source authenticity, accepted prior
returns, current deduction/AMT joins, filled PDF and packet admission.

Normal typed five-module validation passed **40/0, zero ignored**, including
nine native cases and the prior 31 source/guard cases. Five distinct native
documents passed the actual IRS XSD: ordinary, single and MFS capital loss,
section 1202/positive line 21, and joint inventory with a prior-NOL addback.
Modified bytes, duplicate/unmatched document sets, detached amounts, wrong
identities, noncanonical JSON and caller mutation during verification reject
or retain the owned pre-await snapshot. No filing guard was opened.

Private `form172-loss-year-native-20261008-v1/` retains the 2,662-path
candidate manifest, source snapshots, command, exact XSD and tool version,
exit-zero log/status/review, and **five source/binding/XML/XSD-log bundles**
in `output/`. Each bundle replayed exactly from disk. All 746 schema paths
match the generation manifest. Log SHA:
`c15b46ec75b38939746c6b8bf9e18060e4266f2b5d478969f9a64995fbad2d6c`.
Native implementation commit `62d799ce6` remains isolated after the loss-year
commit `7d887e6b1`; root's full test continues on unchanged 2,658 paths.
No main checkoff or coverage-aggregate increase follows; the entire 47-item
future section remains unchanged and unworked.

The [IRS operational status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status)
was checked again at 06:10 UTC: ATS remains unavailable through October 13
09:00 Eastern, and its reopening announcement names TY2026. TY2025 testing
availability is still unconfirmed. With zero retained accepted scenarios,
the original October 8 morning acceptance estimate remains zero; later
acceptance probability remains unproved. Local XSD success does not change it.

### October 8 — interactive Form 172 current-origin review PDFs

The isolated candidate now fills the canonical December 2024 Form 172's
three interactive pages from the same digest-bound review package as native
Part I. Names and US/foreign address data are optional reviewed package
facts, required for PDF generation; joint identity requires both names and
uses the source's distinct primary/spouse SSNs. They are not independently
authenticated filer records. All 109 canonical fields are cleared before
writing the reviewed header and calculated Part I values. Numeric values
are aligned right with bounded font sizing; text that cannot fit rejects.
Skipped paper lines 16–21 stay blank on the ordinary branch, even though
native XSD requires a zero line 21. Both Part II pages stay blank pending
carryback refiguring. No public return join, carry availability, AMT
reconciliation, source acceptance or filing admission follows from this PDF.

Normal typed six-module validation passed **46/0, zero ignored**, including
six PDF cases and the previous source/native/guard cases. It covers the
24-line read-order map, ordinary skips, joint foreign identity, every capital
line, prior-NOL addback, wrong template/identity, missing names, clipping
rejection, non-loss and asynchronous caller mutation. Private
`form172-loss-year-pdf-focused-20261008-v1/` retains the 2,664-path candidate
manifest, changed-source snapshots, command and exit-zero terminal proof;
log SHA `c6b726ed21664c62e1f31f1a22cbafc11757e2353cbd4cc82d449669b57b784b`.

Private `form172-loss-year-pdf-20261008-v1/` retains two constructed-source
review artifacts in `output/pdf/`, canonical template and source/binding/XML
files, generator, field-tree/widget/AP audit, disk replay, renders and visual
review. Ordinary loss is **50,000** (25 populated fields); the joint capital
loss with section 1202 and prior NOL is **34,000** (34 populated fields).
Each PDF has **3 pages, 109 canonical fields, 109 matching widgets and 109
nonempty appearance streams**; both remain interactive. All six pages were
rendered and viewed without clipping, overlapping values or stale fields.
Their two companion native documents passed XSD. PDF SHAs:
`00cbb0afebb9260ca72c06e00f540875839c9521009febbcf296549e91288a9c`
and `01cd8c2f790ca554b565f280a0fa9b0eebe506437d3d8b5b0ecd6b98c517752c`.

Implementation `95cdbfd89` remains isolated after the two earlier Form 172
commits. Root's full regression remains live and its 2,658 runtime paths
remain unchanged. Part II, historical carries, statutory absorption,
2025 deduction/AMT joins and accepted source/packet evidence remain open
under the existing task. No main checkoff or aggregate increase follows;
the entire 47-item future section remains unchanged and unworked.

### October 8 — reviewed annual deduction and statutory absorption workpaper

Isolated Form 172 work now distinguishes the section 172(a) deduction limit
from section 172(b)(2) carry absorption. The
[statutory calculation](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/pdf/USCODE-2024-title26-subtitleA-chap1-subchapB-partVI-sec172.pdf)
and [Form 172 instructions](https://www.irs.gov/instructions/i172) were retained
with URL/date/digest in private `form172-carry-absorption-20261008-v1/`.
The origin loss is recomputed from its inventory; reviewed prior absorption
records cannot exceed it. The annual reviewed return's taxable income and
earlier-NOL inventory must reconcile to its AGI, deductions and reported
NOL deduction. Calendar-year QBI/section 250/personal-exemption boundaries,
capital-loss limits, owner, earlier-vintage order and prior-year chronology
are checked. Pre-2018 earlier availability reduces the post-2017 limitation
base, and earlier post-2017 deductions consume the aggregate limit.

Modified AGI and taxable income are calculated separately from the deduction
base, using reviewed capital/section 1202 adjustments, signed before/after
AGI items and a required itemized-deduction refigure when applicable. For
post-2020 years, the statutory absorption reduction applies 20% to the
section 172(a) excess, rather than treating absorption as 80% of modified
taxable income. Earlier years omit that reduction and subtract every older
NOL from current deduction capacity. These are arithmetic workpapers: AGI
and itemized refigure eligibility, complete missing-year history, carryback
elections, mixed farming splits, marital allocations, accepted source
records, historical origin calculations, AMT and public/packet admission
remain open. No Part II native/PDF values are filled from this work yet;
their final instruction/statutory presentation must still be reconciled
under the existing carry/attachment requirement.

Normal typed five-module validation passed **39/0, zero ignored**, including
eight annual absorption cases plus the existing loss-source and NOL/export
guards. A recomputed 100,000 origin with a 100,000 no-NOL/QBI base yields
80,000 deduction/absorption and 20,000 remaining. Earlier pre-2018 carry
20,000 changes post-2017 capacity to 64,000. With an earlier post-2017
deduction 40,000 and capital addback 3,000, current deduction is 40,000
while absorption is 43,000. Reviewed AGI/itemized adjustments derive
modified income 113,600, absorption 93,600 and remaining 6,400 while the
deduction remains 80,000. Pre-2021 personal-exemption, negative income,
prior utilization and source/owner/capacity rejection cases also passed.

The first run retained **38/1**: its over-limit rejection input needed a
reconciled AGI, and the annual contract lacked a direct comparison between
earlier-vintage deductions and the deduction shown on the reviewed return.
Both were corrected; failed source/log/status remain preserved. Successful
`form172-carry-absorption-20261008-v2/` retains source snapshots, the
2,666-path candidate manifest, command and terminal review; log SHA
`267b7bdaf32af8f3b76c5c4da6b9a5528f6e26fa5521452fbeda1b70bfec800e`.
Implementation `9b2e4df27` remains isolated. Existing native/PDF source files
and delivered PDFs are unchanged; their prior evidence remains retained.
Root's full regression is still live and all 2,658 runtime paths match
startup. No main checkoff or aggregate increase follows. All 47 future
items remain unchanged and unworked.

### October 8, 06:34 UTC — isolated Form 172 complete annual arithmetic chain

Candidate `codex/form172-loss-year-20261008` commit `3d7881f0e` adds `calculateForm172CarryHistory`: it recomputes the origin and requires every applicable calendar year through the 2025 opening, derives every prior absorption from calculated annual results, and rejects caller-supplied prior totals, omitted/duplicate/reordered years, conflicting ownership, source aliases and asserted balances. Exhaustion does not permit missing subsequent annual records. Reviewed carryback/waiver policies retain their evidence references; 2018–2020 full-loss carrybacks use five prior years, and later whole-loss farming carrybacks require an explicit farming review and two prior years. These policy declarations do not authenticate elections or establish legal eligibility. [IRC section 172](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/pdf/USCODE-2024-title26-subtitleA-chap1-subchapB-partVI-sec172.pdf) and [Form 172 instructions](https://www.irs.gov/instructions/i172) are the primary references.

Focused normal type-checked run: **46 passed / 0 failed / 0 ignored**, actual exit 0 at 06:34:00 UTC. Retained private evidence `form172-carry-history-20261008-v1/` includes preflight, source snapshots, full log, terminal status and independent terminal review; log SHA-256 `2c1584cf2ad4cabe492d0786f1a8dee85323987963249f80abe1566ef629a3c1`. All 2,668 candidate runtime paths and 2,658 root runtime paths match the tested/startup manifests. Root full regression session 88611 was independently polled live at 06:34; no terminal result. No candidate implementation integrated while it runs.

This proves the annual arithmetic chain only. Legacy origin computation, mixed farming components, section 965 exceptions, authenticated elections/source workpapers, marital allocations, trusted prior acceptance/carry import, AMT refigures, current-return/public join and matching carryover native/PDF packet remain original open requirements. No broad board checkbox, filing coverage or IRS acceptance count increased. The 52 main TODOs and entire 47-item future section remain frozen.

### October 8, 06:36 UTC — retained-byte Form 172 carry-history source

Isolated candidate commit `bb27cfd4a` adds `stageForm172CarryHistorySource`. Exactly two separately referenced SHA-256 packages retain the loss origin and complete reviewed annual history. All bindings and document arrays are owned before the first await; strict canonical UTF-8 JSON, reference/year/primary-spouse joins and recomputed origin/annual calculations reject changed bytes, missing/duplicate/extra packages, duplicate JSON keys, BOM/invalid UTF-8, mismatched source envelopes and arithmetically inconsistent reviews. Returned immutable digest manifest identifies the tested review bytes. Source authenticity, issuer authenticity, carry-policy authenticity, prior acceptance, accepted carry import, packet admission and filing readiness remain explicitly false.

Normal type-checked focused run **53 passed / 0 failed / 0 ignored**, actual exit 0 at 06:36:30 UTC. Private `form172-carry-history-source-20261008-v2/` retains preflight, snapshots, full log/status and independent terminal review; SHA-256 `bbe3aa35a59acd76647fc13533eb6a13cae48a5ffc06d35a2cec0a21ad69c317`. All 2,670 candidate runtime paths and 2,658 root paths were unchanged. First version is retained: actual exit 1 from test type-check errors (typed-array digest argument and missing async rejection callbacks), repaired before the successful run. Root full session 88611 was independently polled live at 06:36 with no terminal result; no runtime integration or second full run.

The original Form 172 scope remains open: authenticated source/election/accepted carry records, legacy and mixed-farming/965 cases, marital allocation, AMT origin/utilization and current-return/native/PDF packet admission. No broad main checkbox or coverage/IRS acceptance count changed. New implementation remains isolated while root regression runs. Main board and entire future section are unchanged.

### October 8, 06:39 UTC — independently refigured AMT loss origin

Isolated candidate commit `72231e9a9` adds `calculateReviewedAmtLossYear`. A separately identified AMT income/deduction/capital inventory is reconciled to reviewed AMTI before ATNOLD; section 172(d) nonbusiness and capital limitations are calculated from that AMT inventory. The regular origin establishes matching year, filing status and taxpayer/spouse identity and a comparison amount, never the AMT loss. QBI/section250 deductions are removed from the modified base. Prior ATNOLD entries, asserted ATNOL scalars, unreconciled amounts, wrong owners, duplicate source IDs and inconsistent review headers reject. The shared regular arithmetic engine receives an internal reconciliation header; that adapter is not evidence of an actual Form 1040 and none of its regular-return proof flags are promoted into AMT proof.

[2025 Form 6251 instructions, line 2f](https://www.irs.gov/instructions/i6251) require the separate AMT section 172(d) calculation; the primary HTML is retained with retrieval timestamp/digest. Normal type-checked focused run **59 passed / 0 failed / 0 ignored**, actual exit 0 at 06:39:26 UTC, private `form172-amt-loss-year-20261008-v1/`, log SHA-256 `30196409a2e1cb4de32b5e693aa22f2f8f18d2b3b11d8430a28c7f764237b7ec`. Independent terminal review confirms all 2,672 candidate and 2,658 root runtime paths unchanged. Root full session 88611 was polled live at 06:39, no terminal result; candidate remains isolated.

Only AMT origin workpaper arithmetic is reconciled. AMT adjustment eligibility, limitation/source authenticity, prior acceptance and AMT carry availability remain unproved. Annual AMT carry utilization (including the separate ATNOLD limit), authentic reviewed source/elections, complete original edge cases and current-return/native/PDF packet admission remain original open requirements. Form 6251 unsourced ATNOLD guard is unchanged. No broad checkbox, public filing coverage or IRS acceptance count increased; frozen main and entire future section preserved.

### October 8, 06:42 UTC — tentative Form 6251 ordinary ATNOLD limit

Isolated commit `8abb6d3c2` adds `calculateForm172AmtAnnualLimit`, which recomputes the reviewed AMT loss origin for identity and comparison and requires all 21 tentative Form 6251 lines 1–3 except 2f (including explicit zeros). Signed contributions are summed before all ATNOLD; reviewed tentative depletion must have been refigured with zero ATNOLD. It rejects missing/duplicate lines, direct 2f, scalar asserted limits, wrong year/owners and refund/NOL addback sign conflicts. It computes the ordinary section 56(d) 90% limit with exact-dollar rounding. It deliberately returns neither a final deduction nor a carry balance: section 172 annual limitation/order, prior vintages, special 100% losses and modified-income absorption are unresolved.

Primary sources retained with URL/timestamp/SHA: [IRC section 56(d)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/pdf/USCODE-2024-title26-subtitleA-chap1-subchapA-partVI-sec56.pdf), [2025 Form 6251 line 2f instructions](https://www.irs.gov/instructions/i6251) and [IRM 4.11.11.10.3](https://www.irs.gov/irm/part4/irm_04-011-011). Current form instructions use tentative lines 1–3; the IRM carry-reduction paragraph refers to line 6. This retained discrepancy requires reconciliation in the original AMT utilization scope before claiming carry absorption. No AMT carry balance is inferred from the cap.

Normal type-checked focused run **64 passed / 0 failed / 0 ignored**, actual exit 0 at 06:42:01 UTC; private `form172-amt-annual-limit-20261008-v1/`, log SHA-256 `9fafeab0304e85eff878f8856bfdabdfe57f5f0557558a25d7d3ab3a36fc3ce5`. Independent terminal review verifies all 2,674 candidate and 2,658 root runtime paths unchanged. Root regression session 88611 independently polled live at 06:42, no terminal result. Candidate remains isolated; unsourced Form 6251 ATNOLD guard and root runtime unchanged. All broader original source/carry/AMT/packet gates remain open, with no broad checkbox, coverage or IRS acceptance increase. Main and entire future section frozen.

### October 8, 06:44 UTC — retained-byte AMT origin and annual-limit review

Isolated candidate commit `6c866d6fe` adds `stageForm172AmtReviewSource`: exactly three separately SHA-bound canonical JSON documents retain the regular origin, independently refigured AMT origin and tentative annual Form 6251 review. All caller bindings and all bytes are owned before hashing. Bound reference/year/primary-spouse identity joins precede full strict origin/annual schema checks and arithmetic replay. Changed/missing/duplicate/extra documents, noncanonical UTF-8/JSON, mismatched envelopes and conflicting arithmetic reject even when replacement packages have matching digests. Returned immutable manifest proves package-byte identity only. Issuer/source authenticity, prior acceptance, accepted carry import, AMT carry availability, final deduction/absorption and packet admission remain unproved.

Normal type-checked focused run **70 passed / 0 failed / 0 ignored**, actual exit 0 at 06:44:34 UTC, private `form172-amt-review-source-20261008-v1/`; SHA-256 `267e64d8a4b99b3b07798389ddf76117e18276aec876de566e5009fbd8e664af`. Independent terminal review confirms all 2,676 candidate and 2,658 root runtime paths unchanged. Root full session 88611 independently polled live at 06:44, no terminal result; no candidate integration.

The [current 2025 Form 6251](https://www.irs.gov/pub/irs-pdf/f6251.pdf) confirms line 6 is after the exemption. This does not resolve the retained IRM carry-reduction discrepancy or section 172 interaction, so no carry balance is emitted from the tentative cap and no filing route is admitted. Those remain existing original AMT/NOL requirements. No broad checkbox, coverage or IRS acceptance count changed; main and entire future section are frozen.

### October 8, 06:48 UTC — historical individual loss-origin arithmetic

Isolated candidate commit `8997cf0ca` adds `calculateReviewedLegacyLossYear` for reviewed 2005–2017 regular-tax origins. Actual historical AGI, standard/itemized deductions, personal exemptions and floored taxable income are reconciled against the separately reviewed item inventory and former section 199 domestic-production deduction. DPAD is removed from the loss base, personal exemptions cannot create/increase a loss, and nonbusiness/capital/older-NOL modifications are recomputed through the shared section 172 arithmetic engine. The internal 2018 structural adapter is a computational header only; no actual historical Form 1040/1045, acceptance or filing proof is claimed. Duplicate source IDs, wrong primary/spouse owners, mismatched reviewed return, scalar loss assertions and reuse of the DPAD reference in ordinary deductions reject.

[2017 IRS Publication 536](https://www.irs.gov/pub/irs-prior/p536--2017.pdf) is retained with retrieval timestamp and SHA. Normal type-checked focused run **76 passed / 0 failed / 0 ignored**, actual exit 0 at 06:47:44 UTC, private `form172-legacy-loss-year-20261008-v1/`; log SHA-256 `ea13c9374936968e306f0cba1bb004a412d5cd9d8e30a006de32b83115fd97fd`. Independent terminal review confirms all 2,678 candidate and 2,658 root runtime paths unchanged. Root full session 88611 polled live at 06:48, no terminal result. Candidate implementation remains isolated.

Historical origin arithmetic is not yet connected to the complete annual history/retained-byte source wrapper. Historical carry periods/expiration, special-loss elections, accepted carry/source authenticity, marital allocations, AMT origin/utilization and current-return/native/PDF packet remain original requirements. No current native emitter or public guard changed. No broad board checkbox, filing coverage or IRS acceptance count increased. Main and entire future section remain frozen.

### October 8, 06:52 UTC — historical origins connected to annual history and bytes

Isolated candidate commit `74c54fbe9` connects explicit `reviewed_legacy_loss_year` origins (2005–2017) to annual regular-tax absorption, complete calendar-year history and the two-package SHA-bound source wrapper. Source years are retained without coercion; the internal legacy arithmetic adapter remains private to origin computation. Application years extend to 2003 for the oldest general two-year carryback. Historical application years require an explicit section 199 review (zero before 2005); DPAD is restored for modified-income absorption. Pre-2018 current opening balances are included in the statutory pre-2018 inventory, and their deduction capacity uses full taxable capacity after earlier deductions, preserving the distinct post-2017 limitation/excess calculation rather than applying the post-2017 deduction cap to a legacy vintage. Section 172(b)(2)(C) still operates through its statutory excess.

General historical full-loss carrybacks require an explicit reviewed general two-year eligibility declaration. Waived carryback histories still require every forward year. The 20-year expiration year is returned; the 2005 origin's final carry year is 2025. Special historic carryback periods/elections and exceptional origin years remain unproved, not silently treated as the general rule. [IRC section 172](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/pdf/USCODE-2024-title26-subtitleA-chap1-subchapB-partVI-sec172.pdf) and [2017 Publication 536](https://www.irs.gov/pub/irs-prior/p536--2017.pdf) remain the primary references.

Normal type-checked focused run **82 passed / 0 failed / 0 ignored**, actual exit 0 at 06:51:35 UTC; private `form172-legacy-carry-history-20261008-v1/`, log SHA-256 `8e82cd4ac218445f1d25b05c753997b0021d81d56ae10f68fdc94d3d2a0420b3`. Independent terminal review verifies all 2,680 candidate and 2,658 root runtime paths unchanged. Root regression session 88611 independently polled live at 06:52, no terminal result. Candidate remains isolated. Existing modern annual/history/source and AMT workpaper checks remain included in this run.

Only reviewed arithmetic/source-byte identity is proven. Authentic sources/elections and accepted carry import, historic special-loss exceptions, mixed farming/965 cases, marital allocations, final AMT carry utilization and public/current-return/native/PDF packet admission remain original requirements. No broad board checkoff, filing coverage or IRS acceptance count changed; main and entire future section are frozen.

### October 8, 06:55 UTC — farming and remaining loss portions from source inventory

Isolated candidate commit `6a0a0866d` adds `calculateForm172FarmingLossSplit`. It recomputes the whole-year origin and independently calculates the farm-only section 172 loss using identified retained income/deduction/capital items. Every origin business item must appear exactly once in the farming/nonfarming classification review; unknown, duplicate, nonbusiness and prior-NOL selections reject. Farming loss is the lesser of farm-only NOL and whole-year NOL; remaining nonfarming loss is their difference. No standalone asserted farming-loss amount is accepted. Internal section 172 arithmetic adapters create no actual historical return or attachment evidence. Reviewed classification and subset-loss-limit declarations do not authenticate farming eligibility.

Primary [Form 172 farming-loss instructions](https://www.irs.gov/instructions/i172) retained with URL/time/SHA. Normal type-checked focused run **89 passed / 0 failed / 0 ignored**, actual exit 0 at 06:55:29 UTC; private `form172-farming-loss-split-20261008-v1/`, log SHA-256 `aa29f8d6588af980a46141c6013a80b807241fe55ad5b82a625871f020a03311`. Independent terminal review verifies all 2,682 candidate and 2,658 root runtime paths unchanged. Root full session 88611 independently polled live at 06:55, no terminal result. Candidate remains isolated.

This proves portion arithmetic only. Nonfarm-first/farm-second utilization, separate applicable carryback/forward histories, legal farming classification and subset limitation proof, trusted source/election/accepted carry records, historical special cases, AMT utilization and current-return/native/PDF packet remain original open requirements. No mixed portion filing admission or broad board checkoff is claimed. Main and entire future section remain frozen; no public filing coverage or IRS acceptance count increased.

### October 8, 07:00 UTC — ordered mixed farming portion histories

Isolated candidate commit `f3b9af883` adds `calculateForm172FarmingCarryHistory`. It recomputes the full origin and complete farming/nonfarming source partition, derives applicable component calendar years from reviewed carryback/waiver declarations, and requires every annual source in the union. Every year recomputes whole-vintage deduction and modified-income absorption capacities from the reviewed annual return and prior computed combined use. Nonfarming use is allocated before farming use; deduction and absorption are allocated separately, so capital addbacks cannot conflate deductible use with carry reduction. Caller-provided prior-use records, asserted balances, incomplete/duplicate/reordered years and conflicting owner/source references reject.

Post-2020 origins carry only the farming portion back two years; 2018–2020 portions both use five carryback years. Reviewed ordinary historical mixed cases use five farming years and two general nonfarming years, with explicit reviewed general nonfarm eligibility and 20-year forward expiration. Application-year structure extends to 2000 for the oldest supported farming origin. Other historic special-loss/election exceptions remain unproved. Primary [IRC section 172](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/pdf/USCODE-2024-title26-subtitleA-chap1-subchapB-partVI-sec172.pdf) and [2017 Publication 536](https://www.irs.gov/pub/irs-prior/p536--2017.pdf) support the retained rule references.

Normal type-checked focused run **96 passed / 0 failed / 0 ignored**, actual exit 0 at 06:59:39 UTC, private `form172-farming-carry-history-20261008-v1/`; log SHA-256 `f2654f13687178b80e023bcacda79e371c33e9f60b65f8f50cdb88aa8e5b02a5`. Independent terminal review verifies all 2,684 candidate and 2,658 root runtime paths unchanged. Root full session 88611 independently polled live at 07:00, no terminal result. No candidate integration.

Portion-history arithmetic is proved only within the reviewed workpaper contract. Combined split/history retained-byte binding, authentic farming/limitation/election/source and accepted carry evidence, exceptional historic/965 cases, marital allocations, final AMT carry utilization and public/current-return/native/PDF packet remain original requirements. No broad board checkoff, public filing coverage or IRS acceptance increase. Main and entire future section remain frozen.

### October 8, 07:02 UTC — retained-byte mixed farming carry source

Isolated candidate commit `7b2622414` adds `stageForm172FarmingCarrySource`. Exactly three independently referenced SHA-256 packages retain the modern/historical origin, complete farming classification review and mixed annual history. Every caller binding and byte array is owned before hashing. Bound year/primary-spouse/reference joins and canonical UTF-8 JSON checks precede recomputation of the full loss, farm split, applicable year sequence and both portion balances. Changed/missing/duplicate/extra packages, duplicate JSON keys/BOM/invalid UTF-8, substituted envelopes, incomplete classifications and annual source conflicts reject. Digests identify reviewed bytes; issuer/source authenticity, legal classification/elections, prior acceptance, accepted carry import and filing admission remain explicitly false.

Normal type-checked focused run **102 passed / 0 failed / 0 ignored**, actual exit 0 at 07:01:56 UTC; private `form172-farming-carry-source-20261008-v1/`, log SHA-256 `d647d2edc9dcd00adc24d9b7878582a245a286d295a85244c8497fab9838b4bc`. Independent terminal review verifies all 2,686 candidate and 2,658 root runtime paths unchanged. Root full session 88611 independently polled live at 07:02, no terminal result. No candidate integration.

[IRS ATS operational status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status) refreshed at 07:02 UTC and retained as HTML plus timestamp/digest observation: ATS remains Not Operational through October 13 at 09:00 Eastern; reopening announcement specifies TY2026 at 09:01. TY2025 availability remains unconfirmed. Original-deadline estimate remains 0 accepted tests / 0% acceptance in that window; later probability not estimable from these local checks. Original source/legal/accepted carry, exceptional historic/965, marital allocation, final AMT utilization and current-return/native/PDF packet requirements remain open. No broad board checkoff, public filing coverage or IRS acceptance count changed; main and entire future section remain frozen.

### October 8, 07:05 UTC — current-year NOL deduction and closing arithmetic

Isolated candidate commit `08b63daa1` adds `calculateForm172CurrentDeduction`: recomputed modern/historical origin -> complete ordinary or mixed farming history -> TY2025 annual deduction/absorption -> closing balance. No asserted opening or caller-provided prior-use records can establish the current opening. Current workpaper/return references must differ from historical sources; ownership/year/source/arithmetic checks remain enforced. Mixed use allocates nonfarming before farming for deduction and absorption separately. The proposed Schedule 1 line 8a is negative allowed deduction, with explicit zero avoiding negative zero. The oldest supported 2005 origin's residual after the twentieth forward year is recorded as expired; it cannot carry to 2026.

Normal type-checked focused run **108 passed / 0 failed / 0 ignored**, actual exit 0 at 07:05:00 UTC, private `form172-current-deduction-20261008-v1/`; log SHA-256 `a87a7e0b3fd8ee409141380ce64a97938a7ea8afd1ba059b335bc8d43a46996b`. Independent terminal review verifies all 2,688 candidate and 2,658 root runtime paths unchanged. Root full session 88611 independently polled live at 07:05, no terminal result. Candidate remains isolated.

This is current-year workpaper arithmetic, not an admitted public Form 1040 join. Current-year retained-byte binding, current AGI-dependent refigure proof, authentic sources/elections and accepted carry import, exceptional historical/965/marital cases, final AMT utilization and current-return/native/PDF packet admission remain original open requirements. Public NOL and Form 6251 guards are unchanged. No broad checkbox, filing coverage or IRS acceptance count increased; main and entire future section remain frozen.

### October 8, 07:10 UTC — current NOL deduction retained-byte binding

Isolated candidate commit `292db7536` adds `stageForm172CurrentDeductionSource`: ordinary histories require exactly three canonical retained packages (origin, complete history, current review); mixed farming histories require the fourth classification package. The strict binding selects the history kind, original year, current year and taxpayer/spouse, owns all claims and bytes before hashing, verifies the exact package set, and recomputes origin, complete annual history and TY2025 deduction/closing. Matching replacement digests do not bypass current arithmetic or history checks. Extra farming claims on ordinary histories are rejected.

Normal typechecked focused command retained in private `form172-current-deduction-source-20261008-v1/preflight.json` ended at `2026-10-08T07:10:24.060786+00:00`: **114 passed / 0 failed / 0 ignored**, actual tool exit 0; log SHA-256 `b7e335c668c616a92bdd1f1bec5d40d32c6db6d85c56e5eb445dabc4012e334a`. Independent terminal review at 07:10:40 verified all 2,690 candidate and 2,658 root runtime paths unchanged. New cases cover ordinary/mixed results, each package tampering/removal, duplicates/extras, owners/year/kind, recomputation after replacement digests, noncanonical JSON/invalid UTF-8/size limit, and mutation during digest awaits.

This remains isolated while root full session `88611` is live (polled 07:10 UTC). Source identity is not issuer authenticity or prior acceptance; actual Form1040/current AGI-dependent reconciliation, final AMT utilization, accepted carry import and packet admission remain open. No broad main-board checkbox was changed; the entire future section remains unchanged and unworked. Next work is the actual Form1040 replay/current-source join in the existing Form172 scope.

### October 8, 07:15 UTC — actual public pre-NOL current-return reconciliation

Isolated candidate commit `1c2e47e2e` adds `stageForm172ReviewedReturnCalculation`. It owns public inputs, binding and all source bytes before digest awaits, runs the actual public TY2025 graph, and checks the byte-bound current annual workpaper against calculated primary/spouse identity, filing status, AGI, deduction amount/method, QBI, taxable income, capital-loss deduction and preceding NOL deduction. It replays the executor-retained actual Form1040 finalizer inputs and requires each recomputed line to reproduce the public return. Detached Form1040/schedule/AMT/NOL overrides are rejected. Nonzero section250 currently requires an unavailable calculated individual source join and remains rejected.

Normal typechecked focused command retained in private `form172-reviewed-return-20261008-v1/preflight.json` ended at `2026-10-08T07:14:58.711252+00:00`: **118 passed / 0 failed / 0 ignored**, actual tool exit 0; log SHA-256 `634ce2d04412d63f150efbe3b948e41ce21a9df9cd23eba506955c6c0497b151`. Independent terminal review at 07:15:17 verified all 2,692 candidate and 2,658 root runtime paths unchanged. Ordinary and mixed-farming histories match the actual wages 50,000 / standard deduction 15,750 / taxable income 34,250, deriving reviewed current deduction 27,400 and respective closing balances 16,600 / 8,600. Cases reject public income/identity/status changes, detached inputs, internally consistent but wrong deduction/QBI/capital-loss/method/section250 workpapers, and caller mutation during hashing.

This proves starting amounts only. It neither inserts the deduction into the public graph nor claims post-NOL income-dependent refigures, final AMT utilization, source authenticity, accepted carry import or filing admission. These original requirements remain open; no main-board checkbox or future task changed. Root regression session `88611` remains live on its frozen runtime (polled 07:14 UTC). Next is the existing post-NOL graph ordering and reconciliation requirement, alongside final AMT utilization.

### October 8, 07:21 UTC — retained deduction through internal base graph

Isolated candidate commit `8d8dd12c6` adds `stageForm172ProjectedReturn`. A private start-node instance sends only the recomputed retained deduction to Schedule1 and the AGI aggregator, then reruns the ordinary graph using owned original public inputs. The registered public start/intake is unchanged. The aggregator now accepts the internal positive deduction and subtracts it once from non-Social-Security income and Schedule1 additional income. Existing downstream calculations rerun; detached NOL/return inputs remain rejected. The private projection explicitly rejects routes requiring separate adoption, education, Form8990, ScheduleJ or elected-QEF staging rather than silently omitting those stages. A retained NOL marker keeps both exporters guarded, including exhausted histories.

Normal typechecked focused command, including existing AGI aggregator/final tests, is retained in private `form172-projected-return-20261008-v2/preflight.json`. Actual terminal exit 0 at `2026-10-08T07:20:46.085957+00:00`: **199 passed / 0 failed / 0 ignored**; log SHA-256 `46e3451491b3c140cb7284fa6d66af71c143e0b2183eb6009ed7e94d1b44eb14`. Independent terminal review at 07:21:05 verified all 2,695 candidate and 2,658 root paths unchanged. Earlier v1 retained actual exit1 (198 passed/1 failed): private topology mapped unregistered declared targets to undefined; repaired to match planner behavior of skipping missing targets, then reran the same command. Failed artifacts are preserved.

Ordinary/mixed retained histories both send deduction 27,400 to Schedule1 line8a, total additional income −27,400 and Form1040 line8 −27,400; AGI becomes 22,600, taxable income 6,850, regular income tax decreases, and wages remain 50,000. Both exports reject the projected return. Separate arithmetic tests verify negative AGI without flooring, student-loan phaseout refigure (833 to 2,500), Social Security taxability refigure, and rejection of negative/fractional/duplicate deductions.

Primary-source snapshots and URL/digest/timestamp manifest are retained in v1: [Form172 instructions](https://www.irs.gov/instructions/i172), [2025 Form8582 instructions](https://www.irs.gov/instructions/i8582) and [IRC86(b)(2)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapB-partII-sec86.htm). The internal projection does not establish final deduction/closing settlement where income-dependent refigures interact with the section172 capacity, composed multi-pass stages, final AMT utilization, authentic source/history, prior acceptance, attachment parity or admission. Those original requirements remain open. Root full session `88611` remains live at 07:21 UTC; no runtime integration or second full run started. Main scope and future section unchanged.

### October 8, 07:26 UTC — Schedule1-A capacity and senior absorption distinction

Isolated candidate commit `777eb9362` resolves a prerequisite of the existing current-return NOL reconciliation: the annual workpaper previously omitted Form1040 line13b. It now accepts paired original/refigured Schedule1-A amounts with an explicit senior component, rejects missing partners and positive amounts before 2025, and requires each senior component not to exceed its total. The original total reduces both current taxable income and the section172 deduction-capacity base. The modified amount reduces absorption income, with the refigured senior component restored separately under the section151 exclusion. Current-return staging compares both the total and senior amount to actual graph output; it cannot silently accept an internally consistent wrong split.

Primary interpretation: [2025 Form1040 instructions, line13b](https://www.irs.gov/instructions/i1040gi) joins Schedule1-A line38; [IRC172(a)(2)(B)(ii), (b)(2)(A) and (d)(3)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapB-partVI-sec172.htm) distinguishes deduction capacity from absorption modifications; [PL119-21 section70103](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm) places the enhanced senior deduction in section151(d)(5)(C), effective after December31,2024. This yields the senior absorption addback; retained URL/digest/timestamp snapshots are in private `form172-schedule1a-20261008-v1/primary-sources.json`. Current eligibility and modified-AGI workpapers remain reviewed rather than authenticated.

Normal typechecked focused command retained in `form172-schedule1a-20261008-v2/preflight.json` ended `2026-10-08T07:26:33.234685+00:00`, actual tool exit0: **203 passed / 0 failed / 0 ignored**, log SHA-256 `1ab7e2ff4d37f0de946b8b312dee7b5095bae72180e513a2477cacb40fa027f4`. Independent terminal review at 07:26:53 verified all 2,695 candidate and 2,658 root runtime paths unchanged. Earlier v1 (201 passed/2 failed, exit1) is preserved: the newly added senior fixture omitted the required original senior component; corrected the fixture and added wrong-component coverage, then reran the same command.

Actual senior graph fixture: wages/AGI50,000, standard deduction17,750 and Schedule1-A senior deduction6,000 give starting taxable income26,250 and current NOL deduction21,000. Modified absorption restores senior6,000: absorbed27,000, leaving17,000 from history44,000. Internal replay AGI29,000 / taxable income5,250. Separate non-senior workpaper tests retain the additional deduction in capacity and distinguish a changed modified deduction from current use. Positive historical/partial/negative workpapers and wrong actual senior totals/splits reject.

No broad checkoff. Final current-return settlement, source-dependent multi-pass composition, full AMT utilization, authentic carry history, accepted prior returns and filing admission remain open. Root full session `88611` still live (polled07:26); runtime remains frozen. Main scope and the entire future section unchanged.

### October 8, 07:33 UTC — education/adoption stages in retained NOL replay

Isolated candidate commit `c5efe9f54` threads an optional base-graph executor through `executePreQefSourceReturn` and each innermost ScheduleJ source graph call. Default callers still execute the existing registry. The private NOL projection uses that hook with return-derived refigures enabled, so education and adoption stages rerun against the NOL-adjusted graph instead of being dropped or leaving their original operands detached. Form8990, ScheduleJ allocation and elected-QEF counterfactuals remain explicitly rejected by this projection pending separate NOL reconciliation.

Normal typechecked focused command is retained in private `form172-staged-composition-20261008-v5/preflight.json`. Actual terminal exit0 at `2026-10-08T07:32:44.553609+00:00`: **205 passed / 0 failed / 0 ignored**, log SHA-256 `52530e00841de5da9fc76aa6fcbe1493173d53902331a125e26ee880df10b31c`. Independent terminal review07:33:04 verified all2,695 candidate and2,658 root runtime paths unchanged. All four earlier failed runs are retained: v1 typecheck of an unknown nested test record; v2–v4 mistaken education pending paths/line29 field name in the new assertions. Assertions now check the actual student array, `line29_refundable_aoc`, and credit worksheet deposited on the `f8863` node; no typechecking bypass.

Retained education fixture: starting AGI81,000; NOL44,000; projected AGI37,000 / taxable income21,250; student MAGI37,000, nonrefundable AOC1,500, refundable AOC1,000, and credit-limit line18 equals the calculated projected tax. Original source MAGI81,000 remains unchanged. Synthetic adoption workpaper: starting wages120,000; NOL44,000; projected AGI76,000 / taxable income60,250; adoption nonrefundable6,000 and refundable5,000; pre-adoption operands and executor-retained finalizer agree. The adoption test uses explicit synthetic digest assertions without authentic issuer documents or PDF authoring; it establishes graph composition only. NOL/source authenticity and filing admission remain false; export guards stay active.

Final deduction/closing settlement, independently reconciled AMT, remaining staged routes, trusted historical sources, accepted carry import, final native/PDF parity and IRS acceptance remain open original scope. No main checkbox or future task changed. Root full session88611 remains live (polled07:33); no root runtime integration or second full run started.


### October 8, 07:42 UTC — 2025 AMT annual line1b source reconciliation

Isolated candidate commit `a8260513c` replaces the pre-2025 line1 contribution with line1b for 2025 annual ATNOLD-limit workpapers. The reviewed current Form1040 operands are required: AGI line11b, aggregate deductions line14 and Schedule1-A enhanced senior deduction line37. Line1a is recomputed as deductions minus senior; only AGI minus that subtotal contributes to tentative AMTI. Line1a is never added a second time. Reviewed identity/year/reference, senior≤total and signed line1b must reconcile; mixed legacy/current layouts, missing operands and 2025 operands on historical returns reject. The three-package retained-byte route enforces the same arithmetic after digest validation, including replacement-digest attempts with wrong senior operands.

The [printed 2025 Form6251](https://www.irs.gov/pub/irs-pdf/f6251.pdf), lines1a/1b and4, establishes the subtraction directions and sum. The [2025 instructions](https://www.irs.gov/instructions/i6251) confirm the senior adjustment and tentative-before-ATNOLD/depletion 90% calculation. Their line1b prose reverses the subtraction direction relative to the printed form; implementation follows the printed form and the existing current Form6251 calculation/PDF operands. Retained primary snapshots and URL/digest/timestamp manifest are in private `form172-amt-line1-20261008-v1/primary-sources.json`, including current published IRC56 partVI and the JCT explanation of PL115-97. These references have not yet resolved the full section172/56 interaction or the IRM's line6 carry-absorption reference; no final annual deduction or carry history is claimed.

Normal typechecked focused command retained in the same directory's `preflight.json` ended at `2026-10-08T07:40:19.686875+00:00`, actual tool exit0: **210 passed / 0 failed / 0 ignored**, log SHA-256 `ee7efc1d9d4ee9be529cdaca1223195c1a6cb7883efe2f9e593df85c8ae68aca`. Independent terminal review at07:41:00 verifies all2,695 candidate and2,658 root runtime paths unchanged. Five new cases cover senior restoration without double-counting line1a, negative AGI/additional deductions, incompatible year layouts, wrong operands/identity and retained-source tampering/recalculation. No PDF output was authored by this slice.

Root full regression session88611 was independently polled live at07:42; no terminal result, runtime integration or second full run. Previous turn classified as a verified wait because that exact process handle was confirmed live. Full Form172/current-return settlement/AMT carry/source-authenticity/accepted-import/native-PDF admission requirements remain open. Main52 rows and all47 future tasks remain frozen; no broad checkoff or IRS acceptance count changed. The current-deadline MeF estimate remains at the top of the board.


### October 8, 07:44 UTC — regular NOL addback through tentative AMT graph

Isolated candidate commit `78a806e3c` routes the recomputed retained regular NOL deduction to Form6251's internal line2e input in addition to Schedule1/AGI. The calculated signed line1b still reflects NOL-adjusted regular income; line2e restores the same positive regular deduction exactly once before the independent ATNOLD. It participates in AMTI and the lines2c–3 filing-test total and is removed in that test's counterfactual. A positive line2e preserves tentative Form6251 output even when no AMT is owed, so the carry workpaper can inspect before-exemption AMTI. The projection verifies the returned line2e equals its retained deduction and line2f remains zero. The [printed 2025 Form6251](https://www.irs.gov/pub/irs-pdf/f6251.pdf), line2e, gives this positive addback separately from negative line2f; retained printed source and digest are in `form172-amt-line1-20261008-v1/`.

Normal typechecked focused command expands the NOL/AGI suite with the existing Form6251 node tests. Private `form172-amt-regular-addback-20261008-v1/preflight.json` records exact command/runtime snapshot. Actual tool exit0 at `2026-10-08T07:43:46.032526+00:00`: **310 passed / 0 failed / 0 ignored**; log SHA-256 `cb3ca78b1b779bed97cea594bb328e006bd88d310d80327b96e1281f6c3f4098`. Independent terminal review07:44:13 verifies all2,695 candidate and2,658 root runtime paths unchanged. The count includes98 existing Form6251 tests and two new AMT replay tests, not310 newly added cases.

Ordinary/mixed graph fixtures: regular deduction27,400 -> line2e27,400, AMTI50,000. Senior fixture: deduction21,000 -> line1b11,250, standard addback17,750 and line2e21,000 -> AMTI50,000. Separate arithmetic fixture: regular signed base190,250 + standard15,750 + NOL44,000 -> AMTI250,000, exemption88,100, taxable excess161,900 and tentative tax42,094. The no-tax fixture keeps AMTI50,000 despite taxable excess0; negative/fractional/array/excessive addbacks reject and nonzero direct line2f still rejects. These are tentative calculations before independently established ATNOLD, not final AMT tax or approved credit limits.

Both packet exporters remain guarded by the retained NOL marker. Final independent AMT deduction/absorption/history, post-NOL return settlement, remaining staged routes, authentic sources, accepted prior carry import and native/PDF admission remain open original requirements. No native/PDF authoring or positive public coverage claim was added. Root full session88611 was independently polled live07:44; candidate remains isolated and no second full run started. Previous goal turn made implementation/evidence progress; main52 and complete future47 remain unchanged and unworked.


### October 8, 07:48 UTC — retained AMT annual workpaper matched to NOL-adjusted graph

Isolated candidate commit `b313b40dd` adds `stageForm172AmtProjectedReturn`: byte-bound regular origin/history/current review -> actual private NOL graph -> independently byte-bound AMT origin/annual review -> current Form1040 and each tentative Form6251 component comparison. Both package sets must bind the identical regular-origin reference and SHA256. All public inputs, both bindings and every source byte are copied before the first await. A different valid origin package cannot establish the other side of the comparison merely because its owners/year and NOL total match.

The current reviewed AGI, total deductions and enhanced senior amount must match the projected actual Form1040. Every tentative signed component is compared to the actual calculated Form6251 fields, including positive regular NOL line2e, negative refund line2b, individual adjustments and the combined line3. Positive lines2m/2n/2r/2s/2t still lack complete graph joins; this reconciliation requires zero instead of admitting asserted adjustments. Its summed components are before ATNOLD and before the MFS line4 addition, as in the retained annual workpaper. It does not assert final AMT, availability or absorption.

Normal typechecked focused command retained in private `form172-amt-projected-source-20261008-v1/preflight.json` ended `2026-10-08T07:47:52.459285+00:00`, actual tool exit0: **315 passed / 0 failed / 0 ignored**, log SHA256 `289fb85a4d2054a72073b1825597801fadeecf267ca2cc8e3c7598d072f72003`. Independent terminal review07:48:14 verifies all2,696 candidate and2,658 root runtime paths unchanged. Five added tests cover ordinary/mixed-farming/senior source-to-graph agreement, offsetting component substitutions preserving the total, internally consistent wrong Form1040 operands, identical-origin-byte binding and caller mutation during nested digest awaits. Each positive graph example independently refigures originATNOL80,000 and tentative annualAMTI50,000 / ordinary90%cap45,000; the cap is not an asserted current deduction. Both packet exporters still reject the retained NOL projection.

Final section172/56 utilization and full AMT history, actual current deduction/closing settlement, remaining source-dependent stages, authentic issuers/elections/accepted carry imports and native/PDF packet admission remain original open requirements. Root full session88611 independently polled live07:48; no integration or second full regression. Previous goal turn made implementation/evidence progress; no main52 row or complete future47 task changed. The estimate remains at the board top; local checks are not IRS acceptance.


### October 8, 07:52 UTC — actual post-NOL finalizer and deduction refigures

Isolated candidate commit `261f4a865` replays the executor-retained actual post-NOL Form1040 finalizer input and requires every recalculated numbered line to reproduce the projected finalized return. It returns the parsed retained input and a separate `projectedFinalizerReconciled` arithmetic flag. This applies after source-dependent education/adoption stages too; it does not establish authentic sources, all current deduction/closing refigures, final AMT or filing admission.

Two added full-graph cases verify income-dependent consequences beyond subtracting NOL from the old AGI. Senior wages150,000 / original enhanced deduction1,500 / retained NOL44,000 -> AGI106,000 / enhanced deduction4,140 / taxable income84,110; actual tentative AMTI150,000 and retained finalizerAGI106,000. Student-loan wages95,000 / reviewed interest2,500 -> original allowed deduction833 / AGI94,167; NOL44,000 refigures allowed interest2,500, final AGI48,500 / taxable income32,750 and matching retained finalizer. Public input statements remain unchanged.

Primary [2025 Form1040 instructions](https://www.irs.gov/instructions/i1040gi), Schedule1-A PartI, uses current Form1040 line11b for MAGI absent excluded foreign/territorial income; [Form172 instructions](https://www.irs.gov/instructions/i172) requires relevant income-dependent refigures. Timestamped source snapshots/digests are retained in private `form172-finalizer-refigures-20261008-v1/primary-sources.json`. No PDF output authored. The original final settlement/current AGI-dependent scope remains open rather than promoted by two cases.

Normal typechecked focused command retained in `form172-finalizer-refigures-20261008-v2/preflight.json` ended `2026-10-08T07:51:48.143754+00:00`, actual tool exit0: **317 passed / 0 failed / 0 ignored**, log SHA256 `48e5cbe5eee2508d52623cca1e57f651b1842a9f2b8d8d3cb48f7e0e14a755e8`. Independent terminal review07:52:11 verifies all2,696 candidate and2,658 root runtime paths unchanged. Earlier v1 is retained (316 passed/1 failed, actual exit1): new student-loan fixture used node-object input instead of the public array. Direct public execution diagnostics established the schema mismatch; corrected the fixture and reran the same command without changing the calculator.

Root full session88611 independently polled live07:51; candidate remains isolated and no second full run started. Previous turn made implementation/evidence progress. Main52 and complete future47 remain unchanged and unworked; final section172/56/carry/source/acceptance/native-PDF gates remain open. MeF estimate remains at the board top, with no IRS acceptance implied by local results.


### October 8, 07:56 UTC — ordinary NOL and source QBI income-limit ordering

Isolated candidate commit `3d6398d42` adds an actual source-to-NOL-graph case for the existing current-return deduction-ordering requirement. Reviewed current partnership qualified box1 income30,000 plus wages20,000 yields original AGI50,000 / QBI deduction6,000 / taxable income28,250. The retained regular NOL deduction27,400 uses the section172 base34,250 before QBI. Actual projected AGI22,600 leaves current business QBI30,000 unchanged, but Form8995 taxable income before QBI is6,850, income-limit amount1,370 and final QBI deduction1,370 / Form1040 taxable income5,480. Original K1 box20Z and section199A statement remain30,000. The actual post-NOL finalizer reproduces the return.

Primary [final regulation1.199A-3(b)(1)(v), IRS Bulletin2019-09](https://www.irs.gov/irb/2019-09_IRB) distinguishes ordinary NOL deductions from section461(l) excess-business-loss carryovers: ordinary NOL is generally excluded from business QBI; EBL carry deducted in the later year affects QBI. The reviewed origin in this case is ordinary loss, without an EBL component. Do not subtract every post2017 NOL from QBI on a blanket basis. Authentic classification/EBL carry and complete current-return settlement remain open. The current [Form8990 instructions](https://www.irs.gov/instructions/i8990), line9/ATI, likewise excludes NOL from ATI. Both primary sources retained with URL/digest/timestamp in private `form172-qbi-interaction-20261008-v1/primary-sources.json`.

The current public Form8990 route already returns an explicit filing-blocking diagnostic after its bounded two-pass calculation. Thus the existing NOL starting-return staging cannot treat Form8990 as a successful public return; it requires an independently established internal composition before the projection's existing rejection can be removed. This is an original NOL/Form8990 scope dependency, not a new task or a future-section implementation.

Normal typechecked focused command retained in the same directory's `preflight.json` ended `2026-10-08T07:55:26.777017+00:00`, actual tool exit0: **318 passed / 0 failed / 0 ignored**, log SHA256 `63acf06ec09478f65dba70da18a7101e14f8fcb96fa7369c9be7d86acbf1694f`. Independent terminal review07:55:45 verifies all2,696 candidate and2,658 root runtime paths unchanged. One new full-return source case; no calculator change, PDF authoring, positive filing coverage or IRS acceptance claim. Root full session88611 independently polled live07:55; no integration or second full run. Previous goal turn made implementation/evidence progress; frozen main52 and complete future47 unchanged. The top-of-board acceptance estimate remains in place.


### October 8, 08:00 UTC — independent historical AMT origin inventory

Isolated candidate commit `1d8ffd889` extends `calculateReviewedAmtLossYear` and its retained-source staging to reviewed regular legacy origins2005–2017 already covered by the regular NOL engine. The AMT inventory is independent and must use the same original year/owners/filing status. Historical AMT reviews require the historical at-risk/passive and itemized-phaseout shape, without asserting modern EBL review; they also require a separately identified section199 review and zero QBI/section250. Section199 is restored to the loss-computation base and cannot duplicate ordinary inventory entries. Positive section199 after2017 rejects. The shared172 arithmetic engine receives an explicitly computational2018 adapter header for historical sources, not a purported filed-year change or accepted return.

Three new focused cases cover2005/2010/2017 independent regular100,000 versus AMT80,000, missing/conflicting DPAD and deduction years/refinements, and retained2017-origin packages joined to the current-format2024 tentative cap100,000AMTI/90,000limit. Historical DPAD3,000 examples are synthetic arithmetic assertions and do not establish section199 legal eligibility. Personal exemptions from the reviewed regular origin do not enter AMT loss inventory. Full historical annual Form6251 line layouts, historical DPAD annual-cap refigures, special100% sources, complete AMT history/utilization and current packet joins remain original open scope; this slice does not establish those requirements.

Primary [2017 Form6251 instructions, line11](https://www.irs.gov/pub/irs-prior/i6251--2017.pdf) requires independently applied172(d) modifications and removes DPAD from the annual90%cap base. [2017 Form1045 instructions](https://www.irs.gov/pub/irs-prior/i1045--2017.pdf) separately restores claimed DPAD in the modified-income workpaper. Both snapshots/digests/timestamps are in private `form172-historical-amt-origin-20261008-v1/primary-sources.json`. No historical filed-form/native/PDF output was authored or claimed.

Normal typechecked focused command retained in the same directory's `preflight.json` ended `2026-10-08T07:58:46.393407+00:00`, actual tool exit0: **321 passed / 0 failed / 0 ignored**, log SHA256 `7b7ad67dd54b6c035623dd4747f7ef09a41ef9ed8fd82953f96ec166e28b5aa3`. Independent terminal review07:59:40 verifies all2,696 candidate and2,658 root runtime paths unchanged. Root full session88611 independently polled live07:58; no candidate integration or second full run. Previous goal turn made verified ordering/source evidence progress. Main52 and complete future47 remain unchanged and unworked; authentic sources/accepted carry/final settlement/AMT/native-PDF/IRS acceptance remain open, with estimate at board top.


### October 8, 08:06 UTC — historical AMT annual cap and terminal root regression

Isolated candidate commit `b1dfa1d77` uses the 2013–2017 Form6251 tentative lines1–27, excluding ATNOLD line11, instead of the modern line1/2a–2t/3 layout. All26 components remain explicit. The 2017 reserved line2 must be zero; the earlier medical line2 remains available. Parenthetical lines6/7/25 are signed deductions and regular NOL line10 is a positive addback. A separately identified section199 deduction is mandatory for historical annual reviews, restored after tentative AMTI to the ordinary90% limit base, and rejected in modern annual packages. This is tentative annual workpaper arithmetic, not final section172 coordination, AMT utilization/history or filing readiness.

Six added focused cases exercise all five historical years, signed components and reserved-year conflict, missing/duplicate/wrong-layout components, ATNOLD exclusion, separately sourced DPAD, negative-base restoration, and a retained2017 origin joined to a2016 annual package. The retained cap example100,000 tentative AMTI plus3,000 DPAD yields92,700; synthetic DPAD amounts do not prove legal eligibility. Primary Form6251 snapshots for [2013](https://www.irs.gov/pub/irs-prior/f6251--2013.pdf), 2014–2016 and [2017](https://www.irs.gov/pub/irs-prior/f6251--2017.pdf), with text, URL, digest and retrieval time, are retained in private `form172-historical-amt-cap-20261008-v1/primary-sources.json`; the prior retained2017 instructions supply the separate DPAD cap adjustment.

Normal typechecked focused command in that directory's `preflight.json` ended `2026-10-08T08:05:26.959459+00:00`, actual tool exit0: **327 passed / 0 failed / 0 ignored**, log SHA256 `0360d1a0a1e47fb2bbefc439b21d4d4a1d112cfce0dd0951ac7167d38364772a`. Independent terminal review08:05:45 verifies all2,696 candidate and2,658 root runtime paths unchanged. Candidate runtime remains isolated; no full candidate regression or positive filing coverage is claimed.

Root Form8801 full regression session88611 ended `2026-10-08T08:03:12.140977+00:00`, actual tool exit0: **12,519 passed / 0 failed / 0 ignored** (123m50s). Retained `root-form8801-full-regression-20261008-v1/full.log` SHA256 is `df804f3a34a8d1a87766645a79c17a5c5135be9808f39ca4528d9202fce500ff`. Independent08:05:06 terminal review verifies all2,658 startup runtime paths unchanged. This result applies to integrated root runtime46cac16e5412ba92caf5707bd7ad128b371d2851, not the isolated Form172 candidate. No PR is open for the local readiness branch. Frozen main52 and complete future47 unchanged; no broad checkoff or IRS acceptance claim.


### October 8, 08:08 UTC — Form172 runtime integration and serial full regression

All27 Form172 candidate runtime-only commits were cherry-picked into the local readiness branch, ending at root `ea7829dfcc9aa9d534cb056f80c857b868d94718`. Before integration, each commit's paths were checked to contain only forms/*.ts. The resulting all2,696 runtime manifest exactly equals the isolated candidate's independently verified327-test manifest; no board-scope or future-task content was integrated from the candidate.

The normal typechecked integration focused command in private `form172-integration-focused-20261008-v1/preflight.json` ended `2026-10-08T08:07:16.285054+00:00`, actual tool exit0: **327 passed / 0 failed / 0 ignored**. Log SHA256 `68a3d6d3e95db40f0fe4206511adef9b03e886813f491635e00890184ca9d439`. Independent terminal review08:07:32 checks all2,696 runtime paths against launch hashes. Existing public NOL/ATNOLD and source/accepted-carry filing boundaries remain guarded; this integration does not establish a complete positive Form172 filing route.

Only after the prior Form8801 full regression actually closed with exit0 and independent all2,658-path/log verification, the next serial `deno task test` started `2026-10-08T08:07:32.982146+00:00`. Live tool session48127 / DenoPID10895. `root-form172-full-regression-20261008-v1/preflight.json` records exact root HEAD, all2,696 startup runtime hashes, command, Deno/Poppler versions and8GBV8 heap. Runtime is frozen until actual terminal outcome; no full-run pass is yet claimed. Isolated candidate is preserved for additional original-scope work.

IRS ATS status was rechecked: still NotOperational through October13 09:00Eastern, with announced TY2026 testing at09:01 and no confirmed TY2025 availability. URL/UTC/digest and snapshot are retained in the full-run directory. Top-of-board estimate remains0 accepted tests/0% by the original deadline; later probability unproved. Main52 and complete future47 are byte-for-byte unchanged and unworked. Previous goal turn made verified implementation and terminal evidence progress; this turn integrates verified runtime and starts the required broader regression. No PR has been created.


### October 8, 08:13 UTC — retained NOL and Form8990 two-pass ordering

Isolated candidate commit `3a74c0ddf` composes the retained current NOL deduction with the existing one-Schedule-C Form8990 calculation. Its internal executor hook preserves the exact provisional/finalized ScheduleC permission context. The tentative return subtracts the retained NOL; Form8990 line9 restores it when calculating ATI, alongside QBI line10. Both passes separately require the same scalar nonnegative integer NOL on Schedule1 and the AGI aggregator and reconcile the resulting income/SE/QBI/Form1040 totals. Finalizer replay still compares all raw numbered lines exactly. Retained annual workpaper comparisons now use the established signed whole-dollar filing rule, since raw QBI/remaining taxable income can be fractional.

The source case uses200,000 gross receipts,100,000 traced interest,1,000 depletion and7,500 depreciation, plus reviewed prior filed-source facts and ordinary44,000 NOL derived from complete retained history. Compared with the actual pre-NOL two-pass return, ATI and the allowed/disallowed interest amounts are unchanged after NOL restoration, Form1040 AGI is44,000 lower, self-employment tax is unchanged, and QBI is refigured under the lowered income limit. The actual post-NOL finalizer reproduces the return. Changed current-review amounts, debtor-owner conflicts, and malformed/NaN/string/array/fractional/negative/mismatched NOL values reject in the relevant passes.

Primary [2025 Form8990 instructions](https://www.irs.gov/instructions/i8990), lines9/10, requires NOL and QBI additions for ATI. HTML/URL/digest/UTC are retained in private `form172-interest-composition-20261008-v1/primary-sources.json`. The synthetic reviewed source facts do not establish issuer authenticity or an accepted interest/NOL carry ledger. The public Form8990 route continues to emit its existing unfileable diagnostic; this internal workpaper returns filingReady=false, and NOL packet admission remains guarded. ScheduleJ/QEF composition, full return scope and authentic/legal/accepted-history/AMT settlement remain original open requirements.

The normal typechecked focused command adds all10 existing Form8990 test files to the retained NOL/AMT command. Final v3 ended `2026-10-08T08:12:21.106709+00:00`, actual tool exit0: **360 passed / 0 failed / 0 ignored**, log SHA256 `8a147640471c0bdb646e17c7e756429e60ebcca163c29c75bc040bad81816545`. Independent08:12:43 review verifies complete2,697 candidate and2,696 root runtime path sets and hashes unchanged. v1 is retained359/1 exit1: new workpaper fixture copied fractional raw QBI/TI into integer-only source fields. v2 is retained360/0; v3 adds typed malformed-value rejection checks. Candidate changes remain isolated while root full session48127 is confirmed live08:12; no second full run or candidate integration. Previous turn integrated verified runtime and launched serial full validation; this turn makes verified original-scope ordering implementation progress. Frozen main52 and complete future47 are unchanged; no broad checkoff or IRS acceptance claim.


### October 8, 08:18 UTC — actual AMT component total after interest/NOL ordering

Isolated candidate commit `50e3f2497` records the existing Form6251 engine's `amti_before_mfs_addition` result and requires the retained current AMT component sum to equal that actual graph value, with zero ATNOLD. Every source-derived component remains individually matched; malformed raw component values reject. Source cents are kept separately as `calculated_tentative_amt_unrounded`, without comparing that raw sum to filed AMTI. The existing engine rounds each printed component before summing, and its MFS line4 addition remains outside the tentative90% workpaper base. No AMT formula or public filing admission is changed.

The retained interest/NOL source case matches actual post-NOL AGI80,011, whole-dollar total deductions28,602, Form6251 line1b51,409, standard-deduction addback15,750, regular-NOL addback44,000 and filed tentative AMTI111,159. The raw component total is111,158.8; retained ordinary90% workpaper limit100,043. The independent AMT origin remains separately recomputed80,000, not an available/current deductible carry assertion. A separate existing-node MFS case records pre-addition1,050,000 and final AMTI1,087,413, proving the two totals remain distinct.

Normal typechecked focused command in private `form172-interest-amt-total-20261008-v3/preflight.json` ended `2026-10-08T08:16:55.510487+00:00`, actual tool exit0: **362 passed / 0 failed / 0 ignored**, log SHA256 `720bef57f69eb3c2f91871970a08d56b2bef0074350e185a2e7db82ca0a9e5d5`. Independent08:17:30 review verifies complete2,697 candidate and2,696 root runtime path sets/hashes unchanged. Failed v1 (360/1 exit1) retained: the new check wrongly compared raw cents with the existing component-rounded filed graph total. Failed v2 (361/1 exit1) retained: a new expected-value assertion still used the raw total after the comparison was corrected. v3 corrects that assertion; no failure is erased.

Root full session48127 remains authoritatively live08:17 against the frozen integrated327-test runtime; these two later candidate commits are not integrated, and no additional full run is started. Previous goal turn made verified NOL/business-interest ordering implementation progress. This turn adds actual AMT graph-total reconciliation and source interaction evidence for existing main scope. Authentic/legal/accepted AMT carry, complete current settlement/native-PDF/packet/BR/IRS acceptance remain open; no broad Form172 checkoff. Main52 and complete future47 unchanged/unworked, with estimate preserved at board top.


### October 8, 08:22 UTC — AMT absorption authority and implementation boundary

New primary evidence: [IRS Chief Counsel memorandum20144201F](https://www.irs.gov/pub/irs-lafa/20144201F.pdf), released2014, separates the annual56(d)(1)(A) deduction limitation from172(b)(2) chronological absorption. Its analysis rejects moving WHBAA losses behind every other vintage. The ordinary/special cap components are not amounts absorbed from those categories. An older ordinary loss uses the90% portion; a later eligible WHBAA loss can use the otherwise-unusable10% remainder. Page6 supplies this historical example:

| Application year / AMTI before ATNOLD | Origin / category | Opening | Absorbed | Remaining |
| --- | --- | ---: | ---: | ---: |
| 2010 /100 | 2008 ordinary | 200 | 90 | 110 |
| 2010 /100 | 2009 WHBAA | 100 | 10 | 90 |

The existing AMT carry-history implementation must preserve chronological vintages and distinguish this absorption from the annual-cap calculation. This newly retained source changes that implementation's evidence basis; sorting ordinary losses before every special loss, or treating the cap's category subtotals as per-vintage absorption, would contradict the memorandum. Its example predates TCJA, so it does not prove modern80% coordination. No statutory election eligibility, authenticated filed source, available carry balance or positive filing route is established here.

The current [IRC56(d) published2024](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partVI.htm), [2025 Form6251 instructions](https://www.irs.gov/instructions/i6251) and [IRM4.11.11.10.3.1](https://www.irs.gov/irm/part4/irm_04-011-011) were independently revisited. The House preliminary Code page returned maintenance; publishedGovInfo is retained as fallback. These sources still do not explicitly resolve post2017 section17280% coordination or reconcile the IRM's carry-reduction reference to after-exemption line6 with the form-instruction/statutory tentative-before-ATNOLD base. Existing flags for final section172 limits and AMT carry absorption stay false; neither 80% nor90% is promoted into a final current ATNOLD without that proof.

Private `form172-amt-absorption-authorities-20261008-v1/` retains four exact source snapshots, memo text, URL/UTC/digest manifest and historical `memo-example.json` marked implemented=false. No runtime edit or new pass is claimed this turn. Prior turn made verified tentative-total implementation progress; this turn obtains primary evidence that changes the remaining original AMT ordering work, while preserving the uncertainty in other requirements.

Root full session48127 confirmed live08:22; independent launch-manifest audit at `2026-10-08T08:22:03.097008+00:00` verifies all2,696 root runtime hashes unchanged. Latest isolated focused result stays362/0; candidate commits3a74c0ddf/50e3f2497 remain outside the running root runtime. No second full run, broad main checkoff or IRS acceptance claim. Frozen main52 and complete future47 exact/unworked. Top estimate remains0 ATS acceptances by the original deadline, with later probability unproved.


### October 8, 08:34 UTC — current modified-income source reconciliation

Isolated candidate commit `fb8b467a7051beacd00be372e98a5362bbbbac2f` reconciles current Form172 carry-use modified income against a separate calculated source graph before current/later NOL. [Form172 instructions, PartII line6](https://www.irs.gov/instructions/i172) require AGI-sensitive amounts to be refigured after the capital-loss/section1202 modifications. Private `form172-modified-income-20261008-v3/i172.html` retains the source observed08:30:23 UTC, SHA256 `1ebe34f95f5f9dc1a68239cf44988d7a4fcf8f0aa224955013b801fad5a45ca9`.

The helper restores the reviewed capital-loss deduction only in the AGI calculation, preserving actual capital-source transactions. Paired taxable Social Security, student-loan interest and IRA-deduction entries must match calculated before/after components; changed supported components cannot be omitted. Modified AGI, standard/itemized deduction and Schedule1-A total/senior amounts must match the recalculated graph. This modified-income workpaper is not a filed-return payload. Positive section1202 remains rejected until its calculated source join is proved; wider AGI-dependent refigures remain open. Existing internal Form8990 context and education/adoption stages are preserved.

Synthetic source tests reproduce capital-loss restoration changing student-loan interest1,333→833 and modified AGI90,667→94,167; post-NOL interest is separately2,500. A second case changes taxable Social Security0→1,000 and modified AGI19,000→23,000; post-NOL Social Security remains0. Missing student-loan refigures, a Social Security pair with matching delta but incorrect components, and unsupported positive section1202 reject. Only `currentModifiedIncomeGraphReconciled` is true; source eligibility, authenticity, accepted carry, broader refigures, final AMT settlement, packet and filing readiness remain unproved.

Normal typechecked focused v3 ended `2026-10-08T08:30:12.098000+00:00`, actual tool exit0: **364 passed /0 failed /0 ignored**, log SHA256 `06bc8360256b0253abcdf3834cd97c808a9c1e6a3288f4237f665dfe55752d4c`. Independent08:34:08 audit verifies complete2,698 candidate and2,696 root runtime path sets/hashes unchanged. Earlier v1 success363/0 and v2 failure363/1 exit1 are retained; v2's new assertion compared an omitted zero Social Security property directly with0, corrected to its normalized zero value. No runtime failure or retained run is erased.

Root full regression session48127 remains live against its frozen integrated327-test runtime. This candidate commit and prior3a74c0ddf/50e3f2497 remain outside it; no second full regression or integration while that run is live. Main52 and complete future47 remain exact/unworked, no broad checkoff or IRS acceptance claim. No PR exists for the root work branch.


### October8, 08:39 UTC — medical refigure source evidence and deferred IRA discovery

Isolated test commit `8e3fc4cafba2487f221d41ee0f56df57a29b71a2` verifies the current modified-income source graph's itemized medical deduction under [Form172 PartII line7](https://www.irs.gov/instructions/i172) and the [ScheduleA medical floor](https://www.irs.gov/instructions/i1040sca). Synthetic wages50,000, deductible capital loss3,000 and medical expenses20,000 produce originalAGI47,000/itemized16,475. Restoring the capital deduction for carry use produces modifiedAGI50,000/itemized16,250/modifiedTI33,750. Current NOL deduction24,420 differs from absorption27,645. Actual post-NOL AGI22,580 yields raw itemized18,306.5, whole-dollar18,307. The source-bound review rejects an unchanged16,475 modified deduction. This verifies distinct calculations, without asserting authenticated medical expenses or accepted carry.

Private `form172-medical-refigure-20261008-v1/` retains normal typechecked focused command, **365 passed /0 failed /0 ignored**, actual tool exit0 ended `2026-10-08T08:36:33.483968+00:00`; log SHA256 `1b2a011b76e32e4f6227b4f3e5405ad61a4e101f51783cb7ad19ff07ab5b0f25`. Independent08:37:09 complete path-set/hash audit matches2,698 candidate and2,696 frozen root runtime files. Primary source snapshots observed08:37:10–11: i172 SHA256 `1ebe34f95f5f9dc1a68239cf44988d7a4fcf8f0aa224955013b801fad5a45ca9`; i1040sca SHA256 `2b64820597c3f5c615e99e84bcd22f40e1d9ca51f026cc0f8c368f5af21b9e4d`. No new full run or root runtime integration.

A separate read-only synthetic source probe finds a deferred IRA MAGI limitation: the existing IRA worksheet takes suppliedMAGI79,000, wages82,000 and capital deduction3,000, yielding reviewedAGI72,000/IRA deduction7,000. The modified-income graph restores3,000, yieldingAGI75,000 but still IRA deduction7,000 because the supplied worksheetMAGI is unchanged. `ira-source-probe-v5-result.json` records actual exit0, no starting diagnostics, limited graph-match flagtrue and source-eligibility/filing flagsfalse. It proves what the current source graph does, not an independent IRA MAGI calculation or legal deduction. Earlier probes are retained: v1/v3 omitted worksheet filing status and rejected; v2 imported the wrong config export; v4 supplied status, passed starting execution, but full projection rejected its graph rerun. v5 isolates the review helper only. No admitted current filing route is claimed.

This newly discovered TODO is appended only to `future_todo`, unworked; the preceding47 future items remain byte-for-byte unchanged, giving48. Frozen52 main rows remain exact, with no broad Form172 checkoff. Root full session48127 authoritatively live08:38; rootruntime unchanged. Top estimate remains0 ATS acceptances by original deadline; later probability unproved. Previous goal turn committed modified-income implementation; current turn adds source interaction evidence and identifies the deferred boundary.


### October8, 08:43 UTC — historical aggregate ordinary/WHBAA AMT cap

Isolated candidate commit `75f72486e72061baef2f82245b0deda3920fb347` adds `calculateForm172HistoricalAmtCap`, an internal aggregate section56(d)(1)(A) workpaper for reviewed2013–2017 application years and pre2018 origins. It independently recomputes every regular/AMT origin and the full annual tentative6251 operands using existing engines, bounds each reviewed opening to its AMT origin, and requires an explicitly complete reviewed vintage inventory. Strict input rejects missing/duplicate origins, substituted regular origin, owner conflicts, fractional/negative or excessive openings, asserted final totals, unsupported application years, and WHBAA claims without a separately identified election review or applicable2008/2009 origin. Source classifications, reviewed opening balances and elections remain unauthenticated assertions.

The helper calculates ordinary component=min(ordinary reviewed openings,90% of tentative-before-ATNOLD AMTI with section199 restored), then WHBAA component=min(WHBAA reviewed openings,remaining positive base). It returns their aggregate cap and origin-year-sorted review inventory separately. Those category cap components are not per-vintage absorption, deductions or closing carry balances. With ordinary200/WHBAA100/base100 it reports90+10=100. A reversed-order case retains the earlier WHBAA origin first while still reporting the10 category component, without claiming that only10 of that origin is consumed. Ordinary-only and WHBAA-only tests, scarcity and negative bases, DPAD restoration and invalid-year/election joins pass.

[IRS Chief Counsel memorandum20144201F](https://www.irs.gov/pub/irs-lafa/20144201F.pdf) supplies the distinction between category cap subtotals and chronological absorption; its historical2010 example is not represented as a fully implemented history. The [2014 individual Form6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2014.pdf) are retained alongside it. `historicalAggregateCapArithmeticReconciled` alone is true; opening availability, WHBAA election eligibility, chronological absorption, finalATNOLD, authenticity, accepted history and filing readiness remain false. Other historical disaster exceptions, full chronology/modified-income absorption, postTCJA80% coordination and current positive filing/native/PDF/packet integration remain original open requirements. No public builder/filing guard is relaxed.

Private `form172-whbaa-aggregate-cap-20261008-v2/` normal typechecked focused command ended `2026-10-08T08:42:42.935978+00:00`, actual tool exit0: **372 passed /0 failed /0 ignored**. Log SHA256 `2ea26af428f5ad1bf19f1e6b54c878936f71f2e1baf62f23e25e625265433ba5`; independent08:43:05 audit verifies complete2,700 candidate and2,696 root runtime path sets/hashes unchanged. v1 retains371/0 actualexit0 before the additional ordinary-only/WHBAA-only case; no failed test run is concealed. Source snapshots observed08:43:06–07: memorandum SHA256 `8aac04f24b848f2daa431915923afda0ac1f48a6d55a809efaa179322486de2f`; 2014 instructions SHA256 `2ca07df168450b970f7a82338f5e441f97b7d78cb7c8bd6e482e503903b15ef2`.

Root full regression session48127 remains authoritatively live08:43 against its frozen integrated327-test runtime. No second full run or later candidate integration. Previous turn added verified medical refigure evidence; this turn implements the remaining historical aggregate-cap component. Main52 and complete future48 exact/unworked; no broad checkoff or IRS acceptance claim. Top estimate remains0 acceptance by original deadline and later probability unproved.


### October8, 08:45 UTC — retained historical AMT cap source package

Candidate commit `3d58e90cbb6eb3deb79d7e005cd1719a7a16680f` adds `stageForm172HistoricalAmtCapSource`. One canonical UTF8 JSON package retains all independently refigured regular/AMT origin inventories, historical annual6251 operands and reviewed opening/category claims. Exact SHA256/reference, application-year and primary/spouse joins precede recalculation of the whole cap. Binding and all source arrays are copied before the first digest await; missing/duplicate/extra packages, tampered bytes, mismatched identity/year/reference, duplicate JSON keys, BOM/invalidUTF8, noncanonical encoding and arithmetically inconsistent origins after replacement digest reject. The immutable manifest identifies the review bytes; election references remain assertions without authentic election-document proof.

Only exact package bytes and historical cap arithmetic are verified. Opening availability, election eligibility/authenticity, chronological absorption, finalATNOLD, accepted carry import, source authenticity, packet admission and filing readiness remain false. The helper is internal/unregistered; no public guard is relaxed. Tests also prove caller mutation during digest awaits cannot replace the bound year, owner, digest or byte inventory.

Normal typechecked focused command in private `form172-whbaa-cap-source-20261008-v1/` ended `2026-10-08T08:45:10.224285+00:00`, actual tool exit0: **378 passed /0 failed /0 ignored**; log SHA256 `be57fbe03ba8a523768c0ec9fc4d86a81591e03cf6d13956b3b4bfe213a1bbfe`. Independent08:45:39 audit verifies complete2,702 candidate and2,696 root runtime path sets/hashes unchanged. Root full session48127 remains authoritatively live08:45; no candidate integration or second full run. Previous turn implemented aggregate historical cap; current turn adds retained-source identity and recalculation. Main52 and entire future48 exact/unworked, no broad checkoff or IRS acceptance claim; estimate remains at board top.


### October8, 08:51 UTC — Form6252 existing later-year packet review

The existing `2024 land sale final payment joins 2025 Schedule D, Form 1040, native XML and PDF` source fixture was replayed through the current root public return graph, prepared native bundle, full local TY2025v5.4 Return1040 XSD and filled PDF builder. Actual generation tool exit0; five pages were rendered and visually inspected: Form1040 pages1–2, ScheduleD pages1–2 and Form6252. Printed identity/dates/related-party No/determinable-price Yes and the source's100,000 selling price/40,000 basis/60,000 gross profit/100,000 contract/.60000 ratio/20,000 prior payment/80,000 current payment reconcile. Gain48,000 reaches ScheduleD11/15/16 and1040line7a; wages75,000, AGI123,000, deduction15,750, taxableincome107,250, tax15,155, withholding11,000 and owed4,155 match the calculated graph. Tampered prior ratio and prior-payment total both reject with the existing source-conflict guard.

Private `form6252-later-year-review-20261008-v1/` retains the exact source/result, generator, XML, filled packet, five rendered pages and independent08:51:07 review. PDF SHA256 `7e8c1e4c51da62b88ec44007f249e1012a1cb93a2b585a1535d5b44c4147fd56`; XML SHA256 `1acfc0e91046250a2b6dac49c49ea25e39bc7e6621a25137516407dba6ce65a6`. Reopened flattened PDF has zero widgets, zero logical fields and no AcroForm; source/printed values, legibility and page order were inspected. All2,696 root runtime path sets/hashes remain exactly frozen. Official2025 Form6252 with integrated instructions was retained08:51:08, SHA256 `b2d42f3194dc715cc6c3e6ee3d168b5b8fb5cff6afd169940cf93d34a17e6a77`, [IRS source](https://www.irs.gov/pub/irs-prior/f6252--2025.pdf). The separate historical instructions URL returned unavailable; no separate instruction snapshot is claimed.

Full packet parity is **qualified**, not approved: native ScheduleD contains only `LTGainOrLossFromFormsAmt=48000`, omitting the printed15/16 totals and QOF/17/20 answers. This reproduces the already-deferred native ScheduleD completeness issue in `future_todo`; that issue remains unworked, with no new distinct TODO or frozen-board checkoff. The sale/payment/prior-form records are synthetic references, not authenticated ownership/payment/accepted-return evidence. Older sale years, interest/OID, related parties, recapture, source authenticity, matching BR and ATS acceptance remain open. No broad coverage/PDF readiness count is increased.

The PDF skill's initial Node marker invocation was unavailable in this shell; the same marker ran successfully under Deno after generation had started. This sequencing error is retained here; it changes no PDF or validation result. Previous turn committed retained historical-AMT source verification. This turn adds an actual full-return artifact review for the original Form6252 requirement while the serial root full regression continues. Main52 and future48 remain exact; latest candidate Form172 focused378/0 is unchanged, and no new full run or root runtime integration occurs.


### October 8, 08:56 UTC — retained orphan-drug packet review

Reviewed all 15 pages of the existing `single-orphan-drug-clinical-testing-credit` packet: Form 1040 (2), Schedule 3 (1), Form 3800 (9), Form 6251 (1), and Form 8820 (2). Pages are legible, unclipped and in the observed order, including the blank Form 3800 carry/overflow pages. The reopened flattened PDF has zero widgets and logical fields. This was a read-only review of a retained packet, not a fresh export.

Synthetic qualified clinical testing costs10,000 with the reduced-credit election produce1,975 at19.75%. Form8820 lines2a/2c/4 carry1,975 to Form3800 PartIII line1h and total credit1,975; general capacity8,973 allows the full amount. Form6251 tentative minimum tax16,094 versus regular tax25,067 yields zero AMT. Schedule3 and Form1040 retain credit1,975; wages/AGI150,000, deduction15,750, taxable income134,250, tax23,092, withholding30,000 and refund6,908 reconcile. No unexpected discrepancy in these filed amounts was observed.

The public source graph replays without execution diagnostics. Its generated native XML matches the retained XML byte-for-byte and local full Return1040 XSD validation exits0. The source pending comparison has one explicitly bounded difference: the recorded inactive Form8960 entry `{filing_status:"single",magi:150000}` is absent from the current public pending output. The successful v3 check asserts that exact retained entry, removes it only from a comparison copy, and compares every remaining JSON-serialized pending field. It does not claim that the entire original pending object is identical. v1 failed on optional undefined properties omitted by recorded JSON; v2 failed on this inactive entry. Both failed runs are retained, with the original source/PDF/XML and batch manifest unchanged.

Private `orphan-drug-retained-review-20261008-v1/` retains all15 rendered pages, separate completed-page review, replay scripts/results and independent audit. Actual v3 replay exit0; result SHA256 `a039704dedae8f85e9d7ab2b1e09b3927c1129db8bb77a6ef4747d11aecf3d08`; completed review SHA256 `d0329953bd0efe15be44bf3ba20ad6a12cb19e63607d0f9f4fc44a20b608485d`. Retained PDF SHA256 `68676289309cbe56ea26bd7f978b9955be5706569de71e8b8a882783ade83c5f`, XML `238124ab411746e76ab53c00dcb236d1268cb5dbc39c6ce950cb195def722e7a`, source JSON `487891a06fe144ce915a912f8660a9f36a2eb50c912ca609b60840c8a157ae81` all match the original case manifest. Independent08:56:21 audit matches all2,696 frozen root runtime paths and hashes.

Primary sources retained at08:56:22–23 UTC: [Form8820 and integrated instructions, Rev.September2018](https://www.irs.gov/pub/irs-pdf/f8820.pdf), SHA256 `8b8cd178590008b881ab43f47cbabcf3ead834966eafd9eab506d1daa71251df`; [2025 Form3800 instructions](https://www.irs.gov/instructions/i3800), SHA256 `7ac1624052ff163c5d45350b68e4b914f95dfd6d5b06da49243d32c13362eac4`. The first supports the reduced19.75% rate and PartIII line1h destination. FDA designation/application, expense eligibility, funding exclusions, controlled-group facts and timely original-return election in this synthetic case are not authenticated by this review.

Root full session48127 remains live; no new full run or runtime integration. This adds a completed visual/source/XML review for one existing generated case without claiming source eligibility, business-rule compliance or IRS acceptance. Original batch review manifests remain unchanged. Frozen main52 and future48 remain exact; no broad Form3800 checkoff or new TODO. The previous goal turn produced the five-page later-year Form6252 packet; this turn supplies bounded evidence for another existing Form3800 source.


### October 8, 09:02 UTC — employer childcare packet review

Completed visual inspection of all16 retained pages for `single-employer-childcare-facility-and-referral-credit`: Form1040 (2), Schedule3 (1), ScheduleC (2), Form3800 (9), Form6251 (1) and Form8882 (1). All pages, including blank carry/overflow pages, are legible and unclipped; identity, source amounts, checkboxes and observed order were checked. ScheduleC cash/material-participation/1099 answers match the source; loss-only boxes are blank. Its zero net profit is printed blank and native explicitly reports0. The reopened flattened packet has zero widgets and logical fields. The original packet, source, XML and review manifest are unchanged.

Facility expenditure40,000 and referral expenditure10,000 yield tentative credits10,000+1,000=11,000. Net expense detail30,000+9,000=39,000 matches ScheduleC receipts39,000 and zero profit. The deduction reduction uses the full tentative credit11,000, not only the currently allowed amount. Form3800 PartIII line1k reports11,000 with9,573 applied against tax; regular tax17,867 less tentative minimum tax8,294 gives capacity9,573. Form6251 AMTI120,000 minus exemption88,100 leaves31,900 and TMT8,294; AMT0. Schedule3/Form1040 credit9,573 produces tax8,294 and refund11,706 from withholding20,000. The unused1,427 has no verified carryback/forward history in this review; no durable carry claim is inferred from a current allowance.

The actual public source graph replay exits0 with no diagnostics and reproduces filed native XML byte-for-byte; local full Return1040 XSD validation exits0. As in the preceding orphan-drug case, the retained inactive Form8960 entry `{filing_status:"single",magi:120000}` is absent from current public pending. The replay asserts that exact entry, removes it only from a comparison copy, then matches every remaining JSON-serialized pending field. It does not assert equality of the entire retained pending object. This review preserves the original filed artifacts rather than re-exporting a packet.

Private `employer-childcare-retained-review-20261008-v1/` retains all16 rendered page images, completed visual-review record and replay results. PDF/source/XML hashes independently match the selected original manifest: PDF `13a7a7d77014ef53f4fdf967b3a6eec03d444f45c1033ad55c9e73e830352f5a`, source `7bf6ccbe6b06b05e8abeb22bb0316f774a26c083cae32325c2f211a95093d860`, XML `d75079abe5266136927ffbf4bf569bfe37140aabcd6f8557fb99289b5378fb77`. Replay result SHA256 `982a282fe14793082e6404369428bd95a64ea6e398bfa657807389de8a11298b`; completed review `37837c29750b156207aa7df695dffe495823fff2053a5d08884b5514181c934e`. Independent09:02:23 audit matches all2,696 frozen root runtime paths/hashes.

The [IRS Form8882 and integrated instructions, Rev.December2017](https://www.irs.gov/pub/irs-pdf/f8882.pdf) supports the25%/10% rates, PartIII line1k destination and reduction of otherwise allowable deductions by the allocable line7 credit. Exact source snapshot retained09:02, SHA256 `22f32092f51ecde350ca6650d75de0334a40b1633552a7f1bf9c4faf90617f8b`. The separate requested2025 form and instruction URLs were inaccessible through the web tool; no nonexistent2025 snapshot is claimed. Synthetic provider contracts, payments, licensing, employee access/nondiscrimination, fair value and other eligibility assertions are not authenticated here.

Previous goal turn added the orphan-drug packet review; this turn completes another original Form3800 source/PDF audit case. Root full session48127 remains live, with no concurrent full run or runtime integration. Frozen main52 and future48 remain exact/unworked; this evidence does not complete the broad Form3800 row, source eligibility, business rules or IRS acceptance. No newly distinct TODO was proved beyond the existing main carry/source requirements.


### October 8, 09:06 UTC — historical AMT chronological deduction allocation

Isolated candidate commit `481c2c7f9ee261807e3d7fe7829180aaf2e616af` adds `calculateForm172HistoricalAmtDeductionAllocation` to the existing historical cap module. It recomputes every regular/AMT origin and the annual cap through the strict existing source workpaper, then allocates that cap in origin-year order. Ordinary vintages share one ordinary capacity; WHBAA vintages can use remaining aggregate capacity without being restricted to the WHBAA cap component. No category sorting is substituted for origin-year ordering.

For reviewed ordinary200/WHBAA100/base100, chronological allocation is90/10. Reversing categories gives earlierWHBAA100/laterordinary0 although cap components remain90/10; earlierWHBAA50 leaves laterordinary50. With earlierordinary40, nextordinary200 and laterWHBAA100, allocation is40/50/10, proving the ordinary limit is not spent twice. Scarce/zero opening, negative base, DPAD restoration and asserted-result/substituted-origin/missing-election rejection cases pass. Application scope remains2013–2017 with pre2018 origins, not the memorandum's2010 application year or post-TCJA current settlement.

The [IRS Chief Counsel memorandum20144201F](https://www.irs.gov/pub/irs-lafa/20144201F.pdf), independently revisited this turn, distinguishes category cap components from chronological use and rejects placing WHBAA vintages behind every ordinary vintage. Its historical example and the retained2014 Form6251 instructions inform this internal step. This arithmetic does not independently establish section172(b)(2) modified-income absorption, intervening-year history, eligibility, authentic elections or surviving/accepted carry balances. `historicalDeductionAllocationArithmeticReconciled` is true; `chronologicalAbsorptionReconciled`, `finalAtnoldReconciled`, source/availability/acceptance and `filingReady` remain false. No native/PDF filing route or next-year balance is introduced.

Private `form172-historical-deduction-allocation-20261008-v1/` retains the normal typechecked focused command, exact candidate diff/runtime manifests and actual terminal result: **384 passed /0 failed /0 ignored**, exit0 at `2026-10-08T09:05:40.305061+00:00`, log SHA256 `46781773f05626d7154b2edeefabd97a04f7fbd11bc1a94cf136b0ca6045035d`. Independent09:06:12 audit verifies complete2,702 candidate and2,696 root runtime path sets/hashes unchanged from the run manifests.

Previous goal turn completed the16-page childcare-credit packet review. This turn implements and verifies the next chronological deduction-allocation step within original Form172 scope; full historical/current carry reconciliation remains open. Root full session48127 is authoritatively live09:06 with its original frozen runtime; this and prior six candidate commits are not integrated and no second full run is started. Main52 and complete future48 remain exact/unworked; no broad checkoff or IRS acceptance claim. Top MeF estimate is preserved.


### October 8, 09:09 UTC — retained-byte historical deduction ordering

Isolated candidate commit `997b305dc78d071a97ece484bcb920fc34e62351` adds `stageForm172HistoricalAmtDeductionAllocationSource`. A shared internal verifier preserves the existing cap-only API and verifies the exact canonical retained package before invoking the chronological deduction calculator. It snapshots the caller's binding and byte arrays before the first digest await, joins package reference/application year/taxpayer/spouse, and recomputes all origin inventories and annual operands. The existing canonical UTF8, duplicate/missing/extra document and size rules remain in the common verifier; no asserted allocation or standalone total is accepted as proof.

New source-level cases reproduce ordinary90/laterWHBAA10, and earlierWHBAA100/laterordinary0 even when the cap's WHBAA component is10. They reject changed bytes, incomplete/duplicate/extra packages, owner/year mismatches, asserted allocation results, and unreconciled origins or missing elections even after replacement SHA256. Caller mutation of binding, reference and bytes during the digest does not change the retained result. Only reviewed-byte identity and deduction-allocation arithmetic are proved; authentic elections/opening availability, modified-income carry absorption, accepted carry, current final ATNOLD, packet admission and filing readiness remain false. No public/native/PDF filing route is opened.

Private `form172-historical-allocation-source-20261008-v1/` retains normal typechecked focused command and manifests. Actual exit0 at `2026-10-08T09:09:19.338391+00:00`: **388 passed /0 failed /0 ignored**; log SHA256 `66610d4c648ff4f23a62d3793eb303f2941555572976c05ec5cb42a0222ec39e`. Independent09:09:45 complete path-set/hash audit matches2,702 candidate and2,696 frozen root runtime paths. Root full session48127 remains authoritatively live; this and the seven prior later candidate commits are not integrated. No second full regression is launched.

The [IRS operational status](https://www.irs.gov/e-file-providers/modernized-e-file-operational-status) was refreshed09:09:46 UTC; exact snapshot SHA256 `0f554b09631d33c77824fb597b9fe77fef06b6926f943aeb5ec405f4c05e6251`. ATS remains Not Operational through October13 09:00Eastern, with TY2026 reopening announced09:01; TY2025 availability is unconfirmed. The board's original-deadline estimate remains0 acceptances/0%, with later probability unproved. This is an external gate, not a local tax correctness probability.

Previous turn implemented historical deduction ordering; this turn adds verified retained-source binding and rejection evidence for that existing Form172 requirement. Main52/future48 stay exact/unworked, no new distinct TODO or broad parent checkoff. The objective remains incomplete.


### October 8, 09:12 UTC — one-facility geothermal packet review

Completed read-only visual inspection of all16 pages of retained `single-geothermal-general-business-credit`: Form1040 (2), Schedule3 (1), Form3800 (9), Form6251 (1), Form8835 (3). Each page is legible and unclipped; identity, conditional checkboxes, amounts, continuations and observed order are recorded separately from the original batch manifest. The reopened flattened PDF has zero widgets and logical fields. No original source, XML, PDF or manifest was edited or re-exported.

Synthetic filer-owned geothermal facility: construction06/01/2023, placed in service01/01/2024, 2025 production/sales100,000kWh, capacity1,500kW, coordinates+39.123456/−075.123456 and WilmingtonDE address agree with native/PDF. Form8835 PartI8d marks no increased-rate qualification;9b/10b mark no bonuses,11b marks DCnotapplicable and12c marks otherAC1,500. Base rate0.006 produces600; PartII lines2/4/6/8/9/12/13/15 each600, no elective-payment or transfer registration claimed. Within the first four-year production period, PartIII line4e of Form3800 reports600 and all600 applies against tax. Schedule3/Form1040 credit600 yields tax24,467/refund5,533 from wages/AGI150,000, deduction15,750, taxable income134,250, regular tax25,067 and withholding30,000. Form6251 TMT16,094/AMT0 matches the parent limitation work. Facility ownership, eligible production/unrelated sales, construction/placed-in-service facts, financing and other external qualification remain synthetic assertions, not authenticated evidence.

Actual public graph replay exits0 without diagnostics, generated native XML matches the retained filed XML byte-for-byte, and local full Return1040 XSD validation exits0. Recorded inactive Form8960 `{filing_status:"single",magi:150000}` is explicitly asserted and removed only from the comparison copy; every other JSON-serialized pending field matches. The original pending object is not claimed entirely identical.

A new metadata discrepancy is deferred: `reviewFocus` says Form3800 PartsIII andV identify the facility and600 tax use, but actual PartV page11 is blank and native contains no PartV breakdown. The one-facility PartIII4e instead references IRS88354. [Form3800 instructions, PartV](https://www.irs.gov/instructions/i3800) require the breakdown for aggregates from multiple facilities/entities; that trigger is absent here. The observation does not prove a missing required filed breakdown or incorrect600 credit. Its review-note correction is added only to `future_todo`, unworked; the original metadata is preserved.

Private `geothermal-retained-review-20261008-v1/` retains all16 page images, separate review, replay results and independent09:12:21 complete audit of all2,696 unchanged root runtime paths/hashes. Original case digests match: PDF `a40372036b70dcdd4a327497783ee239f05159e6cd4807ec65483457b37711a8`, XML `89cbbf3fccd5f2479caf00b193974bdf00b229e3a4286b369f49eabb329d59de`, source `9f81e376d8027ee2ab83fdfd8289b83569a34072c7b6543b73114d0fac1cdd78`. Replay-result SHA256 `b4dba02170d330a096535ec3804bab7575d8ae2992609af7f62d62c490595537`; completed-review `10b4e8f0a752c6badf80ea59c99f4b11fd8ab027c250a8d2ba3c03c2b04afd55`.

Primary snapshots observed09:12:21–23: [2025 Form8835](https://www.irs.gov/pub/irs-prior/f8835--2025.pdf) SHA256 `e0e3aa20718d90e9430c4da326c4155501aab16d7955f86e4fc609c2f3bd263a`; [2025 Form8835 instructions](https://www.irs.gov/instructions/i8835) `574562d1f5442de67ca5c87413d55de9959c4fe77be75870d4360330fe56b4de`; [2025 Form3800 instructions](https://www.irs.gov/instructions/i3800) `7ac1624052ff163c5d45350b68e4b914f95dfd6d5b06da49243d32c13362eac4`.

Previous turn committed source-bound historical Form172 deduction ordering; this turn completes another original filled-packet review. Root full48127 remains authoritatively live09:12, candidate388/0 remains separate, no additional full run. Main52 remains exact; prior48 future items unchanged, one new deferred metadata item gives49. No broad Form8835/Form3800 checkoff, business-rule or IRS acceptance claim; top MeF estimate remains preserved.


### October 8, 09:17 UTC — two-geothermal-facility packet and conflicts

Completed visual inspection of all19 retained pages in `single-two-geothermal-business-credits`: Form1040 (2), Schedule3 (1), Form3800 (9), Form6251 (1), two Form8835 copies (3each). All pages are legible/unclipped, with owner, amounts, selected conditional marks, continuations and observed order checked. Both three-page facility copies retain AlexExample/111223333. Copy1 identifies10PlantRd/+39.123456/−075.123456; copy2 identifies20PlantRd/+39.223456/−075.223456. Each has construction06/01/2023, service01/01/2024, AC1,500kW, 100,000kWh sold/produced, base-rate credit600 and no increased/bonus claim. PartI8d/9b/10b/11b/12c selections match their sources.

Form3800 PartIII4e reports two items and1,200; PartV page11 has two4e rows, each600 in applicable credit/total/tax-use columns. Native PartIII references `IRS88354 IRS88355`; PartV rows separately reference those IDs in the observed facility order. Independent XML traversal verifies every referenceDocumentId token resolves to an actual document. All1,200 applies against tax and reaches Schedule3/Form1040; regular tax25,067 becomes23,867, with refund6,133 from withholding30,000. Wages/AGI150,000, deduction15,750, taxable income134,250 and Form6251 TMT16,094/AMT0 reconcile. The full nine-page parent includes blank carry/overflow pages; no surviving carry assertion is inferred.

Public graph/native replay actual exit0, no diagnostics, reproduces filed XML byte-for-byte and local full Return1040 XSD validates. All JSON-serialized pending fields match after explicitly asserting and removing only the recorded inactive Form8960 `{filing_status:"single",magi:150000}` from a comparison copy. Entire original pending equality is not claimed. Reopened flattened PDF has19 pages, zero widgets and logical fields; original source, XML, PDF and batch manifest remain untouched.

Two read-only negative source replays end with actual exit0: duplicate physical facility rejects at public graph validation, while a different owner supplied alongside filer-owned=true rejects in the native builder. No negative packet was rendered. The first negative probe failedexit1 because it incorrectly asserted diagnostics=[] before the existing duplicate-source guard; that failed script/output remains retained. v2 recognizes the expected graph rejection and checks its node/message, then independently checks the owner conflict. This is evidence of existing guards, not a new runtime change or IRS rejection.

Private `two-geothermal-retained-review-20261008-v1/` retains all19 rendered pages, completed review, positive/negative scripts/results and independent09:17:21 complete path-set/hash audit of2,696 unchanged root runtime paths. Original manifest digests match: PDF `42dd578fec5f967d81b1d30c88967fb866e5554b1fc4bc0e317a57d6223f0e59`, XML `630a9f0a25512ffa84dbc75184e7edaeecb0ea0f018c2441772c82ca070b464e`, source `28fe3fc69ce20bd675ac72a35aab7a0bc6ec1688d244f2e26861993780d296fc`. Positive replay-result SHA256 `f8f091989a38671f4831ca1f05eeed8dd0cf66c0e3ad99efb12c7baf7060ee3a`; negative-v2 result `226e28c6470135306fc69429c2cbfdeb8f01601c1fdaf41eae7d4c53b91e44bb`; completed review `0f75f27659b83684f2235564ca3e7b0d0672ba71ad79d42c3732598e606b5aec`.

This review reuses, with independently verified hashes and original observation times preserved, the09:12 retained [2025 Form8835](https://www.irs.gov/pub/irs-prior/f8835--2025.pdf), [Form8835 instructions](https://www.irs.gov/instructions/i8835) and [Form3800 instructions](https://www.irs.gov/instructions/i3800) snapshots from `geothermal-retained-review-20261008-v1/`. No new source download is claimed. The multiple-facility PartV trigger is present in this packet. Physical source qualification, ownership, eligible production/unrelated sales, financing, matching business rules and IRS acceptance remain unproved.

Previous turn completed the single-facility review; this turn adds full repeated-copy/PartV/native-reference and conflicting-source evidence for original Form8835/Form3800 scope. Root full48127 remains authoritatively live09:17; isolated Form172388/0 is separate and no second full run or integration is launched. Frozen main52 and future49 remain exact/unworked; no new distinct TODO or broad parent checkoff. MeF estimate stays at the board top.


### October 8, 09:24 UTC — mixed wind/geothermal repeated-copy packet

Completed visual inspection of all19 retained pages of `single-wind-and-geothermal-business-credits`: Form1040 (2), Schedule3 (1), Form3800 (9), Form6251 (1), and two Form8835 copies (3 each). Identity, amounts, conditional marks, legibility and page order reconcile. Wind at30 Wind Farm Rd/+39.323456/−075.323456 uses PartII1a and AC12b; geothermal at10 Plant Rd/+39.123456/−075.123456 uses PartII1c and AC12c. Both WilmingtonDE facilities have construction06/01/2023, service01/01/2024, AC1,500kW and100,000kWh produced/sold in2025. Base rate0.006 yields600 each, with no increased-rate or bonus claim. PartI8d/9b/10b/11b and the distinct AC selections agree with native data.

Form3800 PartIII4e reports two items/1,200 and references IRS88354 IRS88355. PartV page11 has separate4e rows of600; native rows reference wind IRS88354 then geothermal IRS88355. Every native referenceDocumentId token resolves. Credit1,200 reaches Schedule3 and Form1040, reducing regular tax25,067 to23,867 and producing refund6,133 against30,000 withholding. Wages/AGI150,000, standard deduction15,750, taxable income134,250 and Form6251 TMT16,094/AMT0 reconcile. Blank carry and overflow pages are retained; no carry history is inferred.

Public graph/native replay captures actual exit0 at09:23:45 UTC, no diagnostics, exact retained XML reproduction and full local Return1040 XSD validation. The earlier observation handles were missing; a bounded replay independently captures terminal status in `replay-terminal-v2.json` without overwriting the original result. Comparison explicitly asserts and removes only recorded inactive Form8960 `{filing_status:"single",magi:150000}` from a copy; every other JSON-serialized pending field matches. Entire original pending equality is not claimed. No original PDF/source/XML/batch metadata was edited or regenerated.

Private `wind-geothermal-retained-review-20261008-v1/` retains all19 rendered page images and a separate completed review. Independent09:24:11 audit verifies all2,696 frozen root runtime paths/hashes, zero PDF widgets/logical fields, all native reference joins, main52 exact and future49 exact/unworked. Original digests: PDF `21bbca00960c224611fecbe43b9e748c88c9ce1da75947f3cc681b6a1a157a09`, XML `257a8efe613ff704f332f70947796c958c214b29ce3e0bfbb48e0065ca6b3de5`, source `7ae70c5a7f05027f24272f95cee55c2780234cee5c2e8c2233abaf7301d6ec66`. Completed review SHA256 `68f928e0ec4af7de09469e5ed92665b7feea9d832055c0fa3f02dbd928c70ee5`; original replay result `c00a79ab52aa57098ac1caad0ae533d97f72bda169231df75171b0f872e3b896`.

The review reuses the09:12 retained [2025 Form8835](https://www.irs.gov/pub/irs-prior/f8835--2025.pdf), [Form8835 instructions](https://www.irs.gov/instructions/i8835) and [Form3800 instructions](https://www.irs.gov/instructions/i3800), independently verifying their hashes and preserving original observation times. No fresh source download is claimed. Physical qualification, ownership, eligible production/unrelated sales, financing, matching business rules and IRS acceptance remain unproved. Existing duplicate-facility and ownership-conflict guard evidence is recorded in the preceding two-geothermal review; this packet adds mixed energy-type evidence, not another guard implementation.

Previous goal turn was a verified wait on live full session48127; this turn completes the mixed-source packet review within original Form8835/Form3800 and PDF parity scope. Root full48127 remains authoritatively live09:24, with no runtime integration or second full run. No new distinct TODO or broad parent checkoff; main52 and future49 remain frozen. MeF estimate remains at the board top.


### October 8, 09:27 UTC — certified work-opportunity credit packet

Completed visual inspection of all16 pages of retained `single-certified-work-opportunity-credit`: Form1040 (2), Schedule3 (1), ScheduleC (2), Form3800 (9), Form5884 (1), Form6251 (1). Identity, checkbox semantics, amounts, legibility and page order reconcile. Form5884 uses the integrated Rev March2021 template; the other forms display2025. Synthetic TANF employee hired01/15/2025, certification received that day and400 hours, with6,000 qualifying first-year wages, produces2,400 on Form5884 line1b and lines2/4. Source certification/payroll references and eligibility confirmations are synthetic assertions, not authentic issued SWA/payroll evidence.

ScheduleC reduces source wages6,000 by the determined2,400 credit to filed wages3,600; gross receipts3,600 less expenses3,600 yields zero profit. Native WagesLessEmploymentCreditsAmt3,600 and NetProfitOrLossAmt0 match PDF page4. Form3800 PartIII4b and line38 carry2,400 to Schedule3/Form1040. Wages/AGI120,000, standard deduction15,750, taxable income104,250, regular tax17,867, credit2,400, tax15,467 and withholding20,000 yield refund4,533. Form6251 TMT8,294/AMT0 agrees with parent limitation work. Form3800 PartV and carry/overflow pages are blank; no prior carry history or multiple-source breakdown is asserted.

Actual public/native replay exits0 at09:25:54UTC without diagnostics; XML reproduces retained bytes exactly and full local Return1040 XSD validates. Every JSON-serialized pending field matches after explicitly asserting and removing only recorded inactive Form8960 `{filing_status:"single",magi:120000}` from a comparison copy. Entire original pending equality is not claimed. Two negative source probes exit0 at09:26:45: missing SWA certification reference fails public start-schema validation; unmatched wage-deduction business reference fails ScheduleC with unknown-business diagnostic. Independent review asserts those exact relevant diagnostic paths, rather than counting incidental downstream errors as proof. No negative PDF is generated, and no IRS rejection is claimed.

The [IRS Form5884 instructions](https://www.irs.gov/instructions/i5884), observed09:26:01UTC and retained SHA256 `d44ed93197426009737f775992df66f858494b4a397fc1c4eb0113426aefddbc`, cover certification timing, qualified wages and line2 wage-deduction reduction. The source dates and ordinary TANF wage cap align with this bounded arithmetic case; external certification, qualifying hours, excluded wages, issuer authenticity and matching business rules remain unproved.

Private `wotc-retained-review-20261008-v1/` retains all16 page images, completed review, public/native replay and negative probes. Independent09:27:20 audit verifies all2,696 frozen root runtime paths/hashes, zero PDF widgets/logical fields and all native references. Original digests match: PDF `2b37e8e9f9b84641031cdf627fc2d79c5d77538f7bd5b0da9fd78f95d9e79d0a`, XML `0db59247b7b08eccd6c4cc1bea8f69b7f685495a3cb6eaac7f2749a17d60a214`, source `9b6472f1c9f355ca5f8dfb93e4e5f617a915a1c47e326a541fb5ba9acf592255`. Completed-review SHA256 `58ff1510558c49d9dc75214504078e13a0bfb98dbbdef40373a88de8e2ac609e`; replay-terminal `f1a2de68bd602303eda6b012f37b90022e5601fd4901aae357550efa54d36fe5`; negative-terminal `e8050010cf5a44a69f8c839bc4b6965cb17a048ff0e6b0774edc95caf0c9731d`. Original batch manifest, source, XML and PDF remain untouched.

Previous turn completed mixed-energy packet evidence; this turn completes WOTC/ScheduleC wage-reduction packet and source-conflict evidence within original coverage/PDF scope. Root full48127 is authoritatively live09:27; no runtime integration or second full run. Main52 and complete future49 remain exact/unworked, no new distinct TODO or broad parent checkoff. MeF estimate remains at the board top and IRS acceptance remains unproved.


### October 8, 09:30 UTC — empowerment-zone wage-credit packet

Completed visual inspection of all16 retained pages of `single-empowerment-zone-employment-credit`: Form1040 (2), Schedule3 (1), ScheduleC (2), Form3800 (9), Form6251 (1), Form8844 (1). Identity, conditional marks, amounts, legibility and page order reconcile. Form8844 uses Rev March2020, as directed by the [IRS instructions](https://www.irs.gov/instructions/i8844); other forms display2025. One synthetic employee source asserts qualified zone wages10,000, no WOTC-used wages, matching LosAngeles zone references and eligibility confirmations. Form8844 aggregate lines1/2/4 report10,000/2,000/2,000. Native IRS88445 contains the same wage/credit totals without employee identity/count.

ScheduleC source wages10,000 and `line_26_other_employment_credits`2,000 yield filed wage deduction8,000; gross receipts8,000 less total expenses8,000 produces zero profit. This2,000 input represents the same empowerment-zone credit, not an independently proved coexistence with another credit. Form3800 PartIII3 reports2,000 and PartII22/25/26/28/38 joins all2,000 to Schedule3/Form1040. Wages/AGI120,000, deduction15,750, taxable income104,250, regular tax17,867, credit2,000 and tax15,867 against20,000 withholding yield refund4,133. Form6251 TMT8,294/AMT0 agrees with parent limitations. PartV and carry/overflow pages are blank; no prior accepted carry or multi-source breakdown is asserted.

Actual public/native replay exits0 at09:28:51UTC, without diagnostics. It reproduces retained XML exactly and full local Return1040 XSD validates. Every other JSON-serialized pending field matches after explicitly asserting and removing only recorded inactive Form8960 `{filing_status:"single",magi:120000}` from a comparison copy; entire original pending equality is not claimed. Original PDF/XML/source and batch metadata remain untouched.

Negative v1 exits0 but its wage-reduction mutation creates a100 loss and hits separate Form461/Form8995 guards, so it does not isolate Form8844 wage-source rejection. That script/output remains retained. Negative v2 offsets gross receipts to8,100 while changing wage reduction to1,900, preserving zero ScheduleC profit; it then rejects natively with `Form 8844 payroll or wage deduction differs from linked Schedule C`. An independently unmatched business reference rejects with the same source-specific error. v2 actual exit0 at09:30:03UTC; independent audit checks both exact native errors. No negative packet is rendered, and no IRS rejection is claimed.

A new review-note discrepancy is appended only to future_todo: original reviewFocus says Form8844 identifies one employee, while PDF/native reports aggregate wages/credit only; the employee is identified in synthetic source workpapers. No required filed employee-detail omission or incorrect credit is inferred. This metadata correction is deferred and the original note is unedited.

Private `empowerment-retained-review-20261008-v1/` retains all16 rendered pages and completed review. Independent09:30:31 audit matches all2,696 frozen root runtime paths/hashes, zero PDF widgets/logical fields and all native references. Original digests: PDF `f4018a7d919d34362577fa88067146d3e4fe4a209bb5c2d8b05130724babd365`, XML `b0cf4578ba731d316951a785c17c1662bce6beed5c0605276fb8d6a0cebcf42d`, source `b45ee84fb8b16b026b669eb5eff705318014b6031a4d516292a107e75b4c18d7`. Completed-review SHA256 `358b4b36cdafb66da9f77fadead5df9185754f0bfd954c1f809588092a943707`; replay-terminal `a51964f6eb98ec142df3606a842b17884a9a25151b9e9402b13a1f122c51ed43`; negative-terminal-v2 `d83c4ea69eb38fa8fad7169079fd274dc03db4bc62d7e5cb489ec28a14c38da3`. IRS instructions observed09:28:52UTC, retained SHA256 `04c7356c3a71cd32a58b8651d3ad8806922f9bd050b84c7f46be0c2204998522`, support the20% calculation, wage deduction reduction, revision and2025 extension. Zone location, actual qualifying services/residence, payroll, exclusions and external source authenticity remain unproved.

Previous turn completed WOTC review; this turn adds empowerment-zone full packet and isolated wage/business conflict evidence within original scope. Root full48127 remains authoritatively live09:30; no runtime integration or second full run. Main52 and prior future49 remain exact; the single new metadata item makes future50, all unworked. No broad parent checkoff. MeF estimate remains at the board top; IRS acceptance unproved.


### October 8, 09:33 UTC — one passive partnership new-markets packet

Completed visual inspection of all18 retained pages of `single-passive-partnership-new-markets`: Form1040 (2), Schedule1 (2), Schedule3 (1), ScheduleE (1), Form3800 (9), Form6251 (1), Form8582-CR (2). Form8582-CR displays Rev December2024; the other forms display2025. AlexOwner/111223333 appears in normal identity fields, with source nameLine1 OWNER ALEX on business-credit forms. Rental10 Rental Rd, AustinTX78701 has365 fair-rental/0 personal-use days and20,000 income. Wages100,000 plus rental20,000 give AGI120,000, standard deduction15,750 and taxable income104,250.

The synthetic Community partnership K-1 codeAD source joins EIN123456789 and credit500 to Form8582-CR other-credit lines4a/4c/5. The ordinary line6 worksheet compares tax17,867 at taxable income104,250 with tax13,455 at84,250, yielding passive tax4,412. Since that exceeds credits500, line7 is0 and line37 allows500. Form3800 PartIII1i reports source EIN and500 passive credit; PartI2/3/6 and PartII17/38 carry500 to Schedule3/Form1040. Regular tax17,867 less500 produces tax17,367; withholding16,000 leaves1,367 owed. Form6251 TMT8,294/AMT0 agrees with parent limitation work. No positive unallowed carry, accepted prior carry or external issuer authenticity is proved.

Public/native replay actual exit0 at09:31:52UTC, no diagnostics, reproduces retained XML exactly and full local Return1040 XSD validates. Every other JSON-serialized pending field matches after explicitly asserting and removing only recorded inactive Form8960 `{filing_status:"single",magi:120000}` from a comparison copy. Entire original pending equality is not claimed. Source, XML, PDF and original batch metadata remain untouched. Negative probes actual exit0 at09:33:04: changed recipient rejects natively because partnership codeAD credit differs from filed credit-only K-1s; changed source credit501 rejects at Form8582-CR's required_new_markets_k1_credits amount join. No negative packet or IRS rejection claim.

ReviewFocus incorrectly refers to source-specific Worksheet9 and Form3800 PartV in this one-source packet. Actual PDF page14 and native PartV are blank, and no Worksheet9 is printed. Source EIN/500 is in PartIII1i. [Form8582-CR instructions, line7](https://www.irs.gov/instructions/i8582cr) say not to complete Worksheets5–9 when passive tax exceeds credits; the current500 is entirely allowed. This is a deferred review-note correction, not proof of omitted required filed worksheets. The one partnership also has no multiple-entity PartV trigger. One new metadata item is appended only to future_todo; original reviewFocus remains unchanged. The already-deferred skipped Form3800 SectionB intermediate-field behavior is observed on page8, with native omitting those intermediate values; it is not implemented in this queue.

Private `passive-partnership-retained-review-20261008-v1/` retains all18 images, completed review, replay and negative outputs. Independent09:33:33 audit matches all2,696 frozen root runtime paths/hashes, zero PDF widgets/logical fields and all native reference joins. Original digests match: PDF `9c5a6be182e14e462575c0711f9dc47dc1155e801d34836953a50f8e719b26d9`, XML `8fb17a147252fa243beea8ab55c82ae09927f1b45c02ee75e051acf2a24fb299`, source `befc8c3b0c42537fd5869017b39ea11fca27d9c9493967a44449bd3a93fa0f72`. Completed-review SHA256 `34b3309a34c3414e219635e3ed5db6f7bf9cdbc5d66e0abe27d8cadbcf8f4c99`; replay-terminal `2cb99b301e756de18fdf49ee469443037b8e275fa3d04b441983336da7ce81a5`; negative-terminal `0747d4e0585701241d6eea1fd6d18f977c479069dbc8ba3eef3163ab04de1d30`. IRS instructions observed09:33:05UTC, retained SHA256 `d8bb03f12790057a41aa555ef5561303287811856062e04da08a88924330700b`. Issued K-1 bytes, external classification, rental/source authenticity, matching BR and acceptance remain unproved; reviewFocus's issued wording does not authenticate the synthetic source.

Previous turn completed empowerment-zone review; this turn adds passive credit/source/parent/native/PDF evidence within original coverage scope. Root full48127 remains authoritatively live09:33; no runtime integration or second full run. Main52 and prior future50 remain exact; one new metadata item brings future51, all unworked. No broad parent checkoff; MeF estimate remains at the board top.


### October 8, 09:37 UTC — mixed partnership/S-corporation passive credits

Completed visual inspection of all18 pages of retained `single-mixed-passive-new-markets`: Form1040 (2), Schedule1 (2), Schedule3 (1), ScheduleE (1), Form3800 (9), Form6251 (1), Form8582-CR (2). Identity, conditional marks, amounts, legibility and page order reconcile. Form8582-CR uses Rev December2024, other forms2025. AlexOwner/111223333, rental10 Rental Rd AustinTX78701,365 fair-rental/0 personal-use days and20,000 rental income agree with source/native. Wages100,000 plus rental20,000 give AGI120,000, standard deduction15,750, taxable income104,250 and regular tax17,867.

Two synthetic K-1 codeAD sources retain distinct entity type/EIN/reference: partnership123456789 credit5,000 and S corporation234567891 credit2,500. Total current credits7,500 exceed passive tax4,412, derived from17,867−13,455 with/without20,000 rental income. Form8582-CR4a/4c/5=7,500, line6=4,412, line7=3,088 and line37=4,412. No special allowance is claimed. Independent Worksheet8/9 arithmetic allocates3,088 unallowed pro rata: rounded2,059 partnership and1,029 S corporation; allowed amounts2,941/1,471 sum4,412. These arithmetic rows are retained separately in JSON; no printed Worksheet8/9 or authenticated issued workpaper is claimed. The [IRS instructions](https://www.irs.gov/instructions/i8582cr) label those worksheets for retained records and describe proportional unallowed allocation followed by source credit less unallowed credit.

Form3800 PartIII1i reports count2/current7,500/allowed4,412. PartV page14 and native breakdown preserve partnership5,000→2,941 then S corporation2,500→1,471 with their distinct EINs; those allowed amounts apply against tax. Form3800 PartI2=7,500,3/6=4,412 and PartII17/38=4,412 join Schedule3 and Form1040. Tax17,867 less4,412=13,455, against withholding16,000, yields refund2,545. Form6251 TMT8,294/AMT0 agrees with parent limitations. The unallowed2,059/1,029 are separate current passive-credit balances in calculated source allocations, not Form3800 general-business carryforward: PartV general-business carryforward is0. No accepted-filing ledger, future availability or prior carry authenticity is proved.

Public/native replay actual exit0 at09:35:11UTC without diagnostics, exact retained XML reproduction and full local Return1040 XSD success. Every other JSON-serialized pending field matches after asserting and removing only inactive recorded Form8960 `{filing_status:"single",magi:120000}` from a comparison copy. Entire original pending equality is not claimed. Negative probes actual exit0 at09:36:15: changing S corporation recipient rejects natively with codeAD filed-credit-only K-1 mismatch; removing its credit-source row rejects at Form8582-CR required_new_markets_k1_credits amount join. Independent audit verifies those relevant error paths. No negative packet or IRS rejection is claimed. Original source, XML, PDF and batch metadata are untouched.

Private `mixed-passive-retained-review-20261008-v1/` retains18 rendered pages, completed review, positive/negative outputs and independent Worksheet8/9 arithmetic. Independent09:36:54 audit matches all2,696 frozen root runtime paths/hashes, zero PDF widgets/logical fields and every native reference. Digests: PDF `e238df97254ff25d44beb04e69cd6a3fd86a1990e8618a709d31b51f8ffdbcb2`, XML `c60a821f4445dc9711eca944e04ed158e46151cda6b9307c3249b82d68a6f4af`, source `3e5027b380328fc9b242b72958f821a0a600c72c2abc5c950025d5376a775e84`. Completed-review SHA256 `6969588e2a0e449d9036e74f5a0cc40841afb0656f48c91293e3ddef321b0221`; replay-terminal `82fe752c6e2733c05027f7f2840eb36bc9aafc4ab1beb528e5627b2da2b91621`; negative-terminal `81d62184263d02b122c0aea47949659f68d1d9fe06f7fc1fc37025eaf30fba9a`; worksheet arithmetic `2ce449b415e07ad6731eaa04fc200185557a0d4c977cdb7dc9cf229c97d0ef55`.

Reuses verified09:33:05 IRS instruction snapshot from `passive-partnership-retained-review-20261008-v1/`, SHA256 `d8bb03f12790057a41aa555ef5561303287811856062e04da08a88924330700b`, with original observation time; no fresh download claimed. External issuer/source/classification/rental authenticity, matching BR and IRS acceptance remain unproved. Existing future-only skipped Form3800 SectionB intermediate-field behavior is also observed on page8, with native omitting those fields; not implemented here. Previous turn completed one partnership review; this turn adds mixed entity allocation/repeated-row and conflict evidence within original scope. Main52 and future51 remain exact/unworked; no new distinct TODO or broad checkoff. Root full48127 remains authoritatively live, no runtime integration or second full run; top MeF estimate remains preserved.


### October 8 — Form172 historical absorption-base authority audit

[Applicable-year audit](ty2025-form172-amt-absorption-base-audit.md) resolves the historical Form6251 field mapping: visually inspected2014 page1 has AMTI28/exemption29/taxable excess30, line6 itemized-deduction limitation and line7 tax refund. Visually inspected2014 instructions page3 independently support complete tentative lines1–27, zero ATNOLD/refigured depletion, section199 addback and annual90% limit. Applicable2014 sections55/56/172 are retained with URL/time/hash. Current IRM line6 cannot be used as a historical absorption operand. Deduction allocation remains distinct from modified-income absorption; no next-year carry is inferred.

This evidence changes the next implementation step to a complete AMT modified-income operand reconstruction before chronological carry consumption. No candidate/root runtime changed, no tests rerun and no new distinct TODO; existing Form172 scope already requires this work. Main52 and future51 remain unchanged. Full regression48127 is independently polled live; no second full run or integration. Candidate388/0 remains its prior bounded result. Source authenticity, valid elections, accepted carry, business rules and IRS acceptance remain unproved.
