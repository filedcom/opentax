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
