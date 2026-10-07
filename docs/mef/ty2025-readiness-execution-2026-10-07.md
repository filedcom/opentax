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
