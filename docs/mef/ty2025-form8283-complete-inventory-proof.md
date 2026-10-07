# TY2025 Form 8283 current-source inventory proof — October 6

This isolated proof extends the existing FMV/reduction, source grouping,
appraisal, signed-form and packet obligations. It does not establish outside
source authenticity or IRS acceptance, and does not close the whole parent.

## Instructions and implemented contract

[2025 IRS Form 8283 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
require the contribution after FMV reductions but before the AGI limit, grouping
similar items across all donees, Section A for inventory regardless of value,
and separate Section B forms for each donee. Art classification uses the claimed
contribution. The complete appraisal must accompany art deductions of at least
$20,000 and item/group deductions exceeding $500,000. A grouped item appraised
at $500 or less still requires the Part III donor statement.

The source schema and native/PDF reconciliation now agree on these rules:

- Eight existing Section A reduction reasons can coexist, including the inventory
  exception and overflow copies. Mixed A/B inventories retain all gifts.
- Reviewed Section B ordinary/unrelated-use reductions permit individual claims
  below $5,000 when the similar-property group exceeds $5,000 across donees.
  Complete current creator, manuscript, private-foundation and taxidermy facts
  reuse their statutory reduction contracts and join the named retained records.
- A creator's $900,000 FMV/$600,000 basis claim is preserved before the AGI limit;
  the full appraisal, cost/creation records and completed source form are required.
  Other unsupported high-value types remain guarded.
- Purchased personal-use property with FMV below basis is tested with short and
  long holding periods. It produces no hypothetical gain, retains FMV as the claim
  and uses the source-reviewed public-charity category; no invented FMV reduction.
- Primary/spouse property owners join the actual filer identities. Similar-item
  appraisals may be shared only with an exact property/owner/donee/date/FMV
  inventory. One actual signed form may contain consecutive A/B/C rows only for
  the same donee, type and common appraisal facts. Distinct donees retain separate
  Section B forms. The $400 FMV/$200 claim row carries the actual Part III review.
- Provided signed-form field snapshots always reconcile. The expanded generic
  inventory requires the complete snapshot. For retained IRS AcroForms, native
  and prepared-PDF preflight read actual canonical fields, including A/B/C amounts,
  filer, donee, appraiser, dates, type and use indicators. Rehashing changed donee
  fields cannot make them agree with unchanged source facts. Scanned documents
  continue to depend on their explicit human field/signature review.
- Current-source owner inventories replay AGI, income-tax calculation and final
  Form 1040 equations. The public W2 packets join actual income and withholding;
  the issued-dividend packet joins Box 1a/1b/2a, holding facts, Schedule B/D,
  QDCGT inputs and final tax. Invented preference inputs with coherently recomputed
  final tax are rejected.

## Independently expected results

| Public packet | Source claim / current deduction | Filed tax proof |
| --- | --- | --- |
| Nine equipment gifts | $58,500 / $50,000 | AGI $100,000; itemized $74,000; taxable $26,000; tax $2,885 |
| Creator plus three special-reason gifts | $618,000 / $50,000 | Same AGI cap/tax; individual creator claim $600,000 remains on 8283 |
| Eight Section A reasons | $26,500 / $26,500 | Itemized $50,500; taxable $49,500; tax $5,810 |
| Three unreduced book gifts across donees | $5,400 / $5,400 | Itemized $29,400; taxable $70,600; tax $10,452; both 2025/2010 acquisition cases |
| Actual issued-dividend/holding/Box 2a parent | $18,600 / $18,600 | AGI $103,000; itemized $42,600; taxable $60,400; ordinary tax $7,768 + preferential $300 = $8,068 |

A coherent $600,001 creator claim leaves the $50,000 Schedule A cap and tax
unchanged but fails against the retained completed form's $600,000 field. Other
mutations cover amounts, sources, SHA-bound bytes, owners, same-total donee
changes, shared form/appraisal rows, Part III owner/date/property facts, W2
income/withholding, missing AGI/tax worksheets and invented capital preferences.
Both native and PDF entrypoints participate in the relevant negative checks.

## Evidence and reproducibility

Final source gate: 16 passed, 0 failed (1m49s),
`/tmp/opentax-form8283-parent-terminal-source-v4.log`.
Existing 18-file source/legacy preservation: 159 passed, 0 failed (1m26s),
`/tmp/opentax-form8283-parent-terminal-compat-v3.log`; exact file list
`/tmp/opentax-form8283-parent-compat-files.json`.
Use `PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH` and run
`deno test -A forms/f1040/2025/pdf/form8283-gift-inventory.test.ts` with
`FORM8283_EVIDENCE_DIR` set to a new directory to preserve previous bytes.
Every positive has complete local IRS 2025v5.4 Return1040 XSD validation.

Evidence packets retain public source/filer, pending calculation, XML, filled
return PDF, page origins, each separate source PDF and attachment SHA/page list.
Public-source inventory is independently compared to native property/donee/FMV/
basis/claim rows, signed-source grouping, native attachment filenames and PDF copy
origins: 16 packets, 57 Section B gifts, 9 Section A rows, 55 native Forms 8283,
56 printed copies and 330 retained attachments. The distinct generated return
pages and required signed source pages are counted separately.

All earlier logs and artifacts remain preserved, including the historical 15/1
source-v3 failure (the Box 1b join was repaired), the 146/13 legacy run (missing
local schema cache, stale field count and partial source fixtures), and the
original label-only buffer evidence. These failed logs are not green gates.

## Final page review and sealed artifacts

Final packet view: `/tmp/opentax-form8283-parent-source-evidence-final`.
It references the unchanged v4 original packets and three corrected special-reason
packets in `/tmp/opentax-form8283-parent-source-evidence-special-v6`. The latter
passed 3/0 (25s), `/tmp/opentax-form8283-parent-special-terminal-v6.log`. Visual
review found `[object Object]` in six simulated foundation record bodies; the
address is now explicitly serialized. All original v4 artifacts remain unchanged.
The zero-test filtered v5 command is preserved and is not counted as proof.

Review: `/tmp/opentax-form8283-parent-review-final`. All 208 return pages and
383 attachment pages were rendered with Poppler and checked through 38 contact
sheets of 338 distinct raster pages. Exact raster duplicates map to the same
reviewed image. The four distinct corrected pages were separately inspected;
`all-pages-reviewed.json` maps every one of the 591 final page occurrences.
The 53 retained official source copies have 7,685 canonical fields and 6,201
widgets, all with appearance dictionaries; checked checkbox appearance states
resolve in their appearance streams. Logical source fields are independently
checked by the native/prepared-PDF guard, while visual review confirms visible
values, A/B/C alignment, Part III and simulated signature/date placement.

No clipping, misplaced rows or missing required copies remained in these packets.
The required signed source pages remain separate attachments, not regenerated
return signatures. Appraisal/source-record content is wrapped and retained with
explicit simulated-source labels. This review is layout and source consistency
proof, not external signature verification.

SHA256 of `/tmp/opentax-form8283-parent-review-final/proof-manifest.json`:
`548130a532121f4975d51e02425bb327e3ef23a5b8d3a37e1536efe10288c796`.
The manifest retains all selected artifact hashes and original path mappings.
Inventory SHA256:
`c21371063339bc5c6ca6aa23cb51e7142dae70e16975f7925d0fadf006a078d6`.
All-page mapping SHA256:
`1c6121ca6f81b7ba965a77c394dbc5ed00d46e980a2a08a5e0eff2b3af34628f`.
Canonical/widget audit SHA256:
`a15c9c175812cc22f4d9f13a6d096cf3a606bb1cf9f863cdf5a06531d4a5f70c`.
Exact terminal log hashes are retained in
`/tmp/opentax-form8283-parent-proof-hashes.log`.

## Exact remaining boundary

The completed official-source AcroForms and appraisal/purchase/reduction/
acknowledgment records are coherent **simulated test evidence**, visibly labelled
as such. Typed signatures, reviewer flags, hashes and invented comparative-sale
records do not authenticate an outside issuer, donor, donee, appraiser or appraisal
qualification. Section A eight-reason records use typed reviewed references, not
retained outside binary source documents. Existing legacy optional-field contracts
remain available; the stronger snapshot requirement belongs to the expanded route.

No trusted outside accepted prior-year archive was provided or verified in this
session. Accepted-prior carryover claims retain their conditional source/acceptance
requirements; no synthetic acknowledgment is used to unlock the guarded Section B
accepted-2024 route. The existing Section A retained-reference carryover and its
conflicts remain covered by the preservation gate, without an IRS-acceptance claim.
Special 28%/1250 tax, farm/K1/PAL/senior and other broader income combinations were
not positive packets in this proof. No main, board, catalog or PR was changed.


## Verified current-main integration

Main4a45410da: source16/0(1m57s),18-file preservation159/0(1m32s), logs `/tmp/opentax-form8283-current-main-source.log` and `/tmp/opentax-form8283-current-main-preservation.log`. All16source/pending/origin/XML/PDF packets,208returnpages and330attachments exactly match sealed reviewed originals exceptReturnTs. Original383attachmentpages+208returnpages=591 reviewed; all selected source/attachment bytes unchanged, file inventories exact. `/tmp/opentax-form8283-current-main-final-comparison.json`; originalmanifest548130a532121f4975d51e02425bb327e3ef23a5b8d3a37e1536efe10288c796. External authenticity, accepted-prior carryover and other FMV reasons/return combinations remain open.
