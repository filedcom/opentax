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
