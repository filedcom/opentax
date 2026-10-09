# TY2025 Schedule H parent dated-service source

The retained parent-care route now accepts an additional reviewed dated-service
ledger when an employer's child turns 18 or the employer becomes divorced or
widowed during a quarter. The older complete-quarter source route remains
available and its original source packets are unchanged.

## Primary rule and calculation

- [2025 26 CFR §31.3121(b)(3)-1](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol17/pdf/CFR-2025-title26-vol17-sec31-3121b3-1.pdf)
  makes an adult child's or spouse's qualifying incapacity for four continuous
  weeks **within the quarter** a quarter-wide family-employment condition. The
  calculator does not reduce covered service to those 28 calendar days.
- [2025 26 CFR §31.3121(c)-1](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol17/pdf/CFR-2025-title26-vol17-sec31-3121c-1.pdf)
  treats an ordinary pay period of at most 31 days entirely as included when
  at least half its actual service hours are included; otherwise it is
  entirely excluded. For a period over 31 days or with no ordinary period,
  actual separately allocated covered wages determine inclusion.
- [20 CFR §404.1015(a)(4)](https://www.ssa.gov/OP_Home/cfr20/404/404-1015.htm)
  separately says the son/daughter *is* widowed or divorced while it expressly
  locates the four-week child/spouse condition in the calendar quarter. We
  infer that a midquarter decree changes the underlying marital predicate at
  the service date; the short ordinary-period majority rule then governs a
  period crossing that date. The cited text has no worked midquarter-decree
example, so this is an explicit legal interpretation rather than an
independently demonstrated IRS example.
If a reviewer instead construes the divorce status as retroactively
qualifying every Q2 service, the saved May-decree example would have $3,750
parent FICA wages and $1,302 household tax rather than $3,350 and $1,241;
that alternative is recorded for legal review and is not emitted.

The new `dated_service_periods` source retains four household/medical quarters,
the complete service/payment ledger, each actual service allocation's dated
hours and cash wages, paid date, and the employer's pay-period and time records.
It reconciles all parent cash to the annual and four paid-quarter payroll
records before checking the independently retained W-2 and Schedule H amounts.
Two cash installments for one service allocation count its hours once.
Separate period identities cannot overlap or silently reuse payment, time,
allocation, or ledger references. A genuinely irregular payroll practice also
requires its complete period ledger and independent employer-practice record.
Each retained service-hour operand must be finite and at most 24 hours per
inclusive calendar day in its dated allocation; installments reusing one
allocation count those hours once. An impossible 10,000-hour allocation over
May 1–14 is rejected by the public calculation, native exporter, and direct
filled PDF guard, as is a nonfinite hour operand. The original v7 packets
predate this guard; final held-code validation and saved-source replay are
recorded below.
The older quarter-only intake rejects a paid age-18 transition quarter when it
lacks qualifying quarter-wide medical care; splitting payments no longer
bypasses the required ordinary-period evidence.

The qualifying FICA cash threshold applies to the covered parent wages after
the period rule. Parent wages remain excluded from FUTA.
The mixed-birthday case has $2,800 of other covered household wages, so filed
Schedule H computes social security and Medicare tax on $6,125 combined wages
($760 and $178), then adds $300 withholding for $1,238. The superseded v5
expectation of $1,236 rounded taxes by worker and is retained as a failed test,
not a tax result. The v6 test passed before the old-intake age-18 guard was
added, so v7 is the settled-code run.

## Actual packet evidence

The original reviewed source packet directory is
`/tmp/opentax-scheduleh-parent-period-final-v7-oct6`; its focused run is
`/tmp/opentax-scheduleh-parent-period-final-v7-oct6.log` (terminal 4/0,
before the finite/calendar-cap hours guard). A fresh final-code v8 run and
archive use `/tmp/opentax-scheduleh-parent-period-final-v8-oct6.log` and
`/tmp/opentax-scheduleh-parent-period-final-v8-oct6`, respectively. The v8
four-test focused run passed 4/0; a separate explicit `deno check` passed.
The ten new cases total 50 filled pages:

| Source circumstance | Parent FICA wages | Schedule H / Schedule 2 / 1040 other tax |
| --- | ---: | ---: |
| Child turns 18; pre-birthday hours are a majority | 3,750 | 1,302 |
| Child turns 18; post-birthday hours are a majority | 2,900 | 1,172 |
| May divorce; post-divorce hours are a majority | 3,350 | 1,241 |
| Four-week medical condition qualifies the whole quarter | 5,000 | 1,493 |
| June/July ordinary period, only June quarter qualifies; equal hours include whole period | 3,950 | 1,333 |
| Long period with all service covered | 5,000 | 1,493 |
| No ordinary period with all service covered | 5,000 | 1,493 |
| Separate cash installments on one service allocation | 5,000 | 1,493 |
| Long period crossing age 18 uses actual allocated wages | 3,325 | 1,238 |
| Irregular periods crossing age 18 use actual allocated wages | 3,325 | 1,238 |

Each saved positive includes the exact public source inputs, whole pending
graph, prepared pending, filer, carryforwards, PDF origins, native XML, and
actual filled PDF. The test checks the full `2025v5.4` return XSD and source
to Schedule H, Schedule 2, and Form 1040 totals. Separate negatives reject
missing or reused service allocations, reused time records, impossible hours,
an event falling inside one unsplit service allocation, an insufficient
four-week medical period, a service row crossing a quarter, a period longer
than its claimed 31-day class, unsupported irregular-pay practice, and cash
installments that no longer reconcile.

The final archive has 18 packets and 91 PDF pages, including the unchanged
eight older packets. The byte manifest at
`/tmp/opentax-scheduleh-parent-period-final-v7-manifest-oct6.json` records
every source JSON, native XML, and PDF hash. Every final PDF byte matches its
previously reviewed reference; none has a PDF widget or AcroForm field. The
new May-divorce source corrects three retained continuity-reference labels
relative to the provisional v6 archive; its financial facts and reviewed PDF
are unchanged. The other 17 source inputs match their reviewed references.
The final-code v8 parity manifest is
`/tmp/opentax-scheduleh-parent-period-final-v8-parity-oct6.json`:
18 packets/91 pages, exact saved inputs, whole pending, prepared pending,
carryforwards and origins versus v7; native XML differs only in `ReturnTs`;
all filled PDFs are byte-identical to the reviewed v7 files, with no widgets
or AcroForm fields. The ten new v7 saved inputs also replayed on the final
hours-guard code with full XSD and exact source/graph/PDF at
`/tmp/opentax-scheduleh-parent-period-hours-root10-oct6/report.json`
(10 returns, 50 pages); the original eight older inputs replayed exact at
`/tmp/opentax-scheduleh-parent-prior8-hours-held-oct6.log` (8 returns,
41 pages). The held production file's SHA-256 was
`47212fab388ee4d4d04e81c57b2f7f4f24408ca2c2f1d93dd2f2bc59a1a3f938`.

The existing eight parent packets remain saved at
`/tmp/opentax-scheduleh-parent-evidence-v2-oct6`; the actual raw-source
replayer `/tmp/opentax-scheduleh-parent-prior8-replay-oct6.ts` compares their
whole pending, prepared pending, carryforwards, origins, native XML except
`ReturnTs`, and every PDF byte, with full XSD validation. The script normalizes
the generated filer timestamp only. Its terminal log is
`/tmp/opentax-scheduleh-parent-prior8-final-held-oct6.log` (8 returns,
41 pages on the original v7 production). The earlier successful replay is
`/tmp/opentax-scheduleh-parent-prior8-replay-v2-oct6.log`. The first replay attempt incorrectly
compared that timestamp and is retained at
`/tmp/opentax-scheduleh-parent-prior8-replay-oct6.log` as a diagnostic, not a
preservation pass.

An actual May 2025 spouse death with joint year-of-death filing is a retained
negative source: the Schedule H calculator can derive the parent wages, but
the existing Form 1040 export requires signer, representative, and refund
review before a deceased joint return. Native and direct filled PDF both
reject that complete return; the case is not counted as a positive packet.

These packets establish local source reconciliation, calculation, native/PDF
parity and XSD structure. They do not establish issuer authentication or IRS
acceptance. Remarriage during a quarter, a changed parent/employer
relationship, and absent complete pay-period records remain guarded; the
broader Schedule H family/source parent remains open.


## Main integration completion

Integrated22b3a845b/6c85ed12e holds productionSHA47212fab388ee4d4d04e81c57b2f7f4f24408ca2c2f1d93dd2f2bc59a1a3f938. Main normaltyped fourteen-module `deno task test` terminalexit0:86passed/0failed(21m6s). Theoriginal samegate exhausted4GBV8heap duringtypecheck; retainedlog133 andtransparentretry with `DENO_V8_FLAGS=--max-old-space-size=8192` preserve thefailure andnormaltyped command. Log `/tmp/opentax-scheduleh-parent-period-main-standard-v2-oct6.log`; wrapper/log/heldproduction3physicalfiles retained separately.

Mainactual18returns/91pages replay terminal0 withwholegraph/prepared/carry/origins/PDFexact, nativeonlyReturnTs, fresh2025v5.4XSD andoriginalsourcehashesunchanged. Report `/tmp/opentax-scheduleh-parent-period-main18-held-oct6/report.json`. Old65recordsreplay terminal0:63positive/386pages(60freshcurrentexact,3historicallyqualified) plus2expectedmissingordinaryperiodrejections; everypositive freshfullXSD andexact reviewedsource rates, alloriginalJSON/PDF/XML unchanged andheldproductioncheckedbefore/after. Thisrunhas no native ratecorrection; nativecomparison onlyReturnTs. Report `/tmp/opentax-scheduleh-parent-period-main-source65-oct6/report.json`;131physicalterminalfiles preserved. Eightolderparentcases overlapthe63oldpositiveinventory; combineduniquepositives are73returns/436pages, including10new/50reviewedpages.

Finalcandidate/source98, rootreview41, qualifiedv757, sharedmain56, old65terminal131 andtypedterminal3physicalfilepairs rehashed beforeledger1541. This records onlythe source-reconciled datedparentservice route; widerScheduleH/sourceauthentication/deceased-jointauthorization/fullbatch/businessrules/IRSacceptance remainopen.

## October 9: year-end identity and status controls

A six-case current-source audit at `99ffacc4a` qualifies the earlier positive dated-service evidence. [2025 Publication 926, page 6](https://www.irs.gov/pub/irs-prior/p926--2025.pdf) makes the parent-care exception depend on the employer’s child and marital circumstances; those source facts must also agree with the return. The current native guard performs the year-end spouse/status join only for `quarterly_circumstances`. The PDF descriptor delegates to the same native guard.

| Source review and case | Schedule H / 1040 line 23 | Native and PDF descriptor | Full native bundle / local XSD |
| --- | ---: | --- | --- |
| Quarterly, matching spouse | 1,493 | Admit | Pass / pass |
| Quarterly, wrong Q4 spouse | 1,493 | Reject | Reject / not run |
| Quarterly, divorced Q4 with MFJ | 1,493 | Reject | Reject / not run |
| Dated, matching spouse | 1,493 | Admit | Pass / pass |
| Dated, wrong Q4 spouse | 1,493 | **Incorrectly admit** | Pass / pass |
| Dated, divorced Q4 with MFJ | 1,302 | **Incorrectly admit** | Pass / pass |

All six public graphs have no diagnostics and leave their inputs unchanged. The mismatched-spouse probe changes only the Q4 payroll review’s spouse SSN to999887777 while the return retains400001070. The divorced probes pair a source asserting no remarriage through Q4 with a joint return. The dated divorced fixture includes the already retained child-birthday allocation, explaining its different tax; this audit does not claim the two review modes have identical economic facts.

This is a newly discovered defect, recorded only in the board’s deferred section. No runtime fix, new positive filing route, parent closure or IRS acceptance is claimed. No filled PDF was generated or visually reviewed; the PDF evidence is descriptor validation only. The six inputs, pending graphs, filer identities, outcomes, four XML files, command log, reproducible source-extracted probe and SHA-256 checkpoint are retained in `.state/research/scheduleh-parent-identity-audit-2026-10-09/`. The full native XML passes local2025v5.4 structure even for the two invalid source joins, illustrating why structural validation cannot replace ownership checks.

The still-open remarriage-during-quarter extension needs an explicit dated marital event, pre/post-event continuity, capable/incapable new-spouse facts where applicable, split service/hour allocations for a period crossing the event, and the ordinary-period classification. This audit adds no such route and does not use a false whole-quarter continuity assertion to admit it.
