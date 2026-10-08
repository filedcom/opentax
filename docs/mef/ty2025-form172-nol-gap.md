# TY2025 Form 172 and NOL carryforward: unsupported

Status: fail-closed. A positive `nol_carryforward` input now stops at the
calculation node, before reducing Schedule 1 or AGI. A zero-valued populated
source remains blocked at both exports. The existing export guards also reject
any direct positive Schedule 1 line 8a amount, so an input cannot bypass the
source node and file an unsupported deduction. Direct nonzero Form 6251 line 2f
remains rejected. Focused guard cases passed in the October 8 run recorded below.

A narrow 2024 nonfarm Schedule C loss-year review is now authored in
reviewed_2024_business_loss.ts. It compares one owner's filed 2024 Form 1040,
Schedule 1, Schedule C, and Form 172 Part I, with distinct reviewed document
references. For a single filer with no other income, no adjustments or itemized
deductions, and zero other Form 172 adjustment lines, it replays Form 172 lines
1, 6, 9, and 24 and derives the regular NOL entering 2025. Positive and
source/owner/arithmetic tamper fixtures passed in that focused run. This reviewed
record is not yet accepted by nol_carryforward; that public input and both
exports remain fail-closed. The independent ATNOL, 2025 taxable income
limitation, Form 6251 join, Schedule 1 deduction, and native/PDF Form 172
attachments remain open.

The current input holds only `year`, asserted `nol_amount`, a pre-2018 versus
post-2017 label, and asserted 2025 taxable income. It does not prove an NOL
existed, survived prior years, or is deductible in 2025. No native `IRS172`
document or PDF descriptor exists. Schedule 1 line 8a is not yet mapped to
either MeF or the filled PDF.

## Required evidence and arithmetic

| Step                             | Required source and calculation                                                                                                                                                                                                                                                                                                                                      | Missing today                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Establish each loss vintage      | Filed loss-year return and Form 172 Part I or applicable historical NOL worksheet; separate business/nonbusiness income and deductions, capital losses/gains, section 1202, QBI and other disallowances; filing status and taxpayer ownership                                                                                                                        | `nol_amount` is a bare assertion. The current enum does not establish the actual loss year computation or owner.                                                             |
| Reconcile availability           | Per-vintage carryback election and application, each intervening year's filed return, modified taxable income and refigured AGI/itemized deductions, prior utilization, surviving balance, and expiry/exception rules                                                                                                                                                | The node sums vintages by broad class and does not apply them in earliest-year order or prove the balance brought into 2025.                                                 |
| Calculate 2025 regular deduction | Source-derived taxable income before NOL, QBI and section 250 deductions, with any pre-2018 NOL applied first and the post-2017 80% limitation applied to the statutory base; reconcile each vintage's used and remaining amounts                                                                                                                                    | `current_year_taxable_income` is asserted independently of the final return. The graph needs a pre-NOL pass to avoid the Schedule 1 to AGI to taxable-income cycle.          |
| Refigure AMT                     | For each loss year, derive an ATNOL from AMT-allowed income/deductions and section 172(d) modifications with all AMT preferences; track AMT carryovers separately. For 2025, add the regular NOL on Form 6251 line 2e, calculate AMTI before ATNOLD, apply the ordinary 90% limit or documented historic disaster exception, then subtract sourced ATNOLD on line 2f | A regular NOL cannot be reused as ATNOLD or defaulted to zero. `nol_adjustment` is only an unsupported direct amount.                                                        |
| Attach and reconcile             | One applicable Form 172 per NOL, each with the correct year and Part I/II values, linked to Schedule 1 line 8a and the regular/AMT calculations; native MeF `IRS172` and all three PDF pages per attachment                                                                                                                                                          | Neither exporter can produce Form 172. The TY2025 XSD contains required Part I lines and optional two-year carryback groups, so a bare carryover amount cannot serialize it. |

The IRS currently lists
[Form 172 (rev. December 2024)](https://www.irs.gov/pub/irs-pdf/f172.pdf) and
its [instructions](https://www.irs.gov/instructions/i172) for 2025 use; there is
no separate 2025 revision. The instructions require a negative Schedule 1 entry
when carrying an NOL forward and an applicable Form 172 for each NOL attached to
the 1040. The
[2025 Form 6251](https://www.irs.gov/pub/irs-prior/f6251--2025.pdf) places the
regular NOL addback on line 2e and ATNOLD on line 2f. Its
[instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf) require a
separate loss-year AMT refigure and generally cap the deduction at 90% of AMTI
before ATNOLD, with specified historical disaster exceptions.

No asserted-capacity input, copied regular-to-AMT amount, or placeholder Form
172 should be added. Build the per-vintage source contract and a pure
pre-NOL/finalization calculation first. Then wire native/PDF attachments and run
the full test, XSD/business-rule, visual PDF, and ATS gates.

## October 8 — general reviewed individual loss-year Part I workpaper

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
