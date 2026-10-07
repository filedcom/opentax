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

- `mfs-two-loan-mortgage-limit`: MFS/spouse-itemizes correctly marked;
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
