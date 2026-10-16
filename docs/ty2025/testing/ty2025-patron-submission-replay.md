# TY2025 cooperative patron saved-return and submission replay

## October 12 investment extension

The current replay covers 58 saved patron returns, adding twelve investment
cases to the prior 46. Farm and Schedule C health-plan cases cover all five
filing statuses and either joint proprietor, preserving owned interest, ordinary
and qualified dividends, capital distributions, proprietor payroll and NIIT.

All 58 complete native ReturnData trees match their previously verified packets
after synthetic identity remapping. The 58 returns and 58 manifests pass the
2025v5.4 schemas. Forward and reverse containers preserve inner ZIP bytes,
submission IDs and electronic postmarks. This packaging evidence adds no new
complete-return or reviewed-PDF counts.

The replay rejects 969 saved-source and 421 archive alterations (1,390 total).
The 498 additional checks comprise 118 cooperative/final-tax/MFS changes,
100 payroll changes, 192 investment changes and 88 archive changes. Investment
mutations cover ownership, source references, amounts, qualified-dividend review,
capital limits, payer identity, Schedule B, preferential tax and NIIT; changes are
mirrored into retained investment copies before reopening. The existing deduction
mutation remains counted once per case.

Evidence is retained in `.state/research/submission-patron-investments-2026-10-12/`:
source/native/manifest/ZIP sets, both containers, schema logs, complete prior-packet
comparisons and test logs. The focused replay and all 51 submission-directory
tests pass; focused lint, formatting and diff checks pass. Existing source
authenticity, presentation, A2A and IRS acceptance qualifications remain unchanged.

## October 12 proprietor-wage extension

The saved-return replay now covers 46 patron returns: the original 34 plus all
12 proprietor-wage cases from the [source-to-tax checkpoint](../domains/deductions/business/form8995/ty2025-form8995a-gap.md#october-12-cooperative-proprietor-wage-checkpoint).
Each of Single, HOH, QSS, MFS and both joint proprietor positions retains its farm
and Schedule C health-plan variant. Both spouses' issued W-2 collections survive
JSON reopening and packaging; actual proprietor wages remain assigned to that
owner's Schedule SE.

All 46 native ReturnData trees match the previously retained complete packets
after only synthetic taxpayer/spouse TIN remapping. All 46 returns and 46 manifests
pass the cached 2025v5.4 schemas. Forward and reverse containers retain every
inner ZIP, native XML, manifest, submission ID and electronic postmark unchanged.
The source-backed independent tax and qualified PDF observations come from the
linked checkpoint; this replay adds no new return/PDF counts.

The expanded test rejects 559 saved-source alterations and 333 archive/container
alterations, replacing the earlier 341/245 counts. The additional 218 source
checks cover 108 cooperative/business/final-tax changes, ten MFS-review changes,
96 proprietor W-2 owner/amount/employer/reference/missing-copy changes and four
swapped spouse collections. Changed payroll is mirrored across public W-2 and
all retained review copies before JSON reopening. The additional 88 archive
checks cover the twelve new returns, including four joint spouse-residency checks.

The focused replay passes, and the full submission directory passes51 typed tests
with zero failures or ignored tests. Focused lint, formatting and diff checks pass.

Evidence: `.state/research/submission-patron-wages-2026-10-12/` retains all46
source/native/manifest/ZIP sets, two complete containers, 92 XSD logs, exact prior
packet comparisons, rejection totals and focused/full regression logs. Existing
presentation, authenticity, A2A-ledger41, replaced-statement148, local-rule162 and
IRS acceptance qualifications remain unchanged; no deferred work is implemented.

## October 12 initial checkpoint

All 34 retained one-business patron cases now exercise JSON saving/reopening,
complete native preparation, individual submission ZIPs and mixed containers.
The cases comprise seven Single, seven HOH, seven QSS, seven MFS, three joint
primary-owned and three joint spouse-owned returns. They retain farm and
Schedule C health-plan sources, wage limits, phase-in, income caps, cooperative
payments, box 6 written notices and applicable spouse payroll.

Each case receives distinct synthetic taxpayer/spouse TINs across its sources.
Every native ReturnData element and reference matches live preparation, and all
persisted pending values match after JSON normalization. Cooperative sources and
reviews remain equal in the public inventory, Form1099-PATR, parent Form8995-A
and Schedule D; actual Schedule C/F and SE owner SSNs also match. MFS domicile,
separate-income and spouse-deduction review survives reopening.

Independent Python inspection compares all 34 complete native trees to earlier
retained packet artifacts, changing only the intended synthetic TINs. All 34
return XMLs and 34 manifests pass the cached IRS 2025v5.4 schemas. Forward and
reverse 34-return containers preserve every exact inner ZIP, submission ID,
electronic postmark, native document and manifest. These cases have no binary
attachments; none were removed to make the replay pass.

| Rejected alteration | Count |
| --- | ---: |
| Reopened payer, recipient, payroll, notice, allocation, business owner, QBI deduction, total tax or companion data | 306 |
| MFS review omitted, community domicile, wrong spouse, spouse itemization or mailing-state conflict | 35 |
| Another return's archived XML or manifest | 68 |
| Another return's filer, prepared bundle or residency review | 102 |
| Duplicate document ID or dangling reference with rebuilt ZIP and recomputed XML digest | 68 |
| Missing joint spouse residency review | 6 |
| Duplicate submission ID | 1 |

All 586 alterations reject: 341 at reopened preparation and 245 at the archive
or container boundary. Source changes are mirrored across retained copies, so
rejection does not rely on one untouched duplicate. The new focused replay passes;
the complete submission directory passes 51 typed tests, zero failed or ignored.
Focused lint, formatting and diff checks pass.

This checkpoint changes tests and evidence only. The earlier source-to-tax and
qualified PDF observations remain the calculation/presentation evidence; no new
PDFs are generated and complete-return/PDF totals do not increase. Presentation
findings 3/68/76, external source authentication, actual transmission, credentials,
service signing and IRS acceptance remain separate. Deferred A2A-ledger41,
replaced-statement148 and local-rule162 issues are not repaired or certified by
these ZIP checks. No broad main-board parent is closed and no future work is done.

Evidence: `.state/research/submission-patron-2026-10-12/` retains all34
source/filer/pending records, native/manifest/ZIP sets, both containers, mutation
counts, original-packet comparisons, schema paths/digests and successful logs.
The prior HOH/QSS/MFS packets are in `form8995a-patron-status-2026-10-12`;
Single/joint/spouse packets are in the individual patron reviewed batches under
`board-execution-2026-10-07`. The comparison records the exact prior path per case.

Reproduce with:

```sh
deno test -A forms/f1040/2025/mef/submissions/submission-patron-replay.test.ts
```
