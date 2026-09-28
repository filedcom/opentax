# TY2025 Form 8582 durable activity identity

## Native worksheet source-order join

The native MeF/PDF worksheet now joins pending Schedule E/Form 4835 activities
to calculated Form 8582 rows by a **unique durable `activity_id`**, not by array
position. Both sets must have the same count and unique IDs, and every ID must
match its name, type, net amount, prior-loss and prior-year-source facts.
Reporting-form labels are also looked up by ID, so a reordered source cannot
relabel a different worksheet row. The Form 8582 output retains its calculated
activity order. Focused native XML/PDF reordered-order cases and
duplicate-ID/amount-mismatch negatives are written but unrun. Current Form 4797
sale gains also compare as an exact multiset of activity ID, name, Part I/II
character, gain and retained-interest fact, including duplicate counts. This
removes an array-order dependency but does not establish transaction-level
property identity, add a transaction-ID source, or change any §469(g)
disposition/prior-loss release rule. Multiple-sale positive and same-total
mismatch cases are written but unrun.

Active native MeF output now also requires a pending Schedule E/Form 4835 source
context. Direct `form8582.build` calls with active rows and no context reject
before XML construction; the reporting-form label has no generic Schedule E
fallback. Existing positive direct serializer fixtures were migrated to explicit
matching Schedule E property sources, while a missing-context negative remains.
The PDF projection already invokes native build with pending context and retains
its matching guard. These changes are written but unrun.

Status: breaking source contract written, unrun. No test, typecheck, XSD,
filled-PDF, IRS business-rule, or ATS result is claimed.

Form 8582 previously matched Schedule E, Form 4835 and Form 4797 activity rows
by display name. A property can be renamed, and two distinct properties can
share a display name. This could misapply prior-year passive losses or current
sale gains even when the return totals reconciled.

The bounded route now requires a caller-supplied `activity_id`, 1 to 64
characters, that remains unchanged across years. It is not derived from the
display name, row position, address or current tax amount. The current input
year must supply that same ID on:

- each Schedule E A/B property that enters Form 8582's activity ledger;
- each Form 4835 farm rental that enters that ledger;
- every Schedule E passive property-sale row sent to Form 4797, including its
  linked Form 8582 sale-gain row;
- each prior operating or Form 4797 Part I/II loss row when carried into Form
  8582.

Form 8582 uses `activity_id` for uniqueness, same-part gain matching, and
per-activity suspended-PAL carryforward keys such as
`suspended_pal_8582:rental-7`. The existing aggregate `suspended_pal_8582`
remains as the total. IRS XML still prints the source activity's display name,
while the MeF builder compares the private ID and source facts to Schedule
E/Form 4835/Form 4797 before constructing XML. There is no name-to-ID fallback
or dual input shape. Missing, duplicate, or mismatched IDs reject the affected
active route.

Focused positive and negative cases are written in the Form 8582, Form 4797,
Schedule E, MeF, passive-activity e2e, and affected TY2025 XSD scenario files.
They have not run. A static scan found IDs on the affected linked fixtures, but
that is not a typecheck or full fixture validation. Schedule C and Schedule F
still send aggregate-only Form 8582 values without activity identity. These are
source-only paths, not proof of a Form 8582 document route. Complete Form 8582
PDF appearance and IRS ATS acceptance remain open.

## Bounded 2024-to-2025 prior operating loss join

Positive prior passive operating losses now require a single
`prior_year_8582_source` on their Schedule E or Form 4835 activity source. It
identifies tax year 2024, the same durable `activity_id`, the activity's filed
2024 Form 8582 Part VII column (c) balance, and a nonblank reference to the
filed document. Form 8582 requires that filed balance to equal the amount
entered as the 2025 prior operating carryover. MeF independently compares the
same source fields with the pending Schedule E/Form 4835 row. Aggregate-only
prior losses, missing/mismatched prior evidence, and source-free direct MeF
builds reject. This is a breaking source requirement, not an alias or fallback.

The initial bound was operating-only. A positive prior Form 4797 Part I or II
loss now has the separate filed-Part-IX no-current-sale route below. A current
Form 4797 transaction with a prior PAL generally rejects until the
entire-interest, unrelated-party, fully taxable §469(g) facts and resulting
release are modeled; the retained-activity exception below is separately
bounded. The old same-part allocation helper remains available for calculation
research, but is not evidence of a live filing path. The reviewed 2024 record
reconciler described below is not connected to a filing store; no 2025
export/persistence is claimed.

The 2025 [IRS Form 8582 instructions](https://www.irs.gov/instructions/i8582)
direct Part IV/V prior unallowed losses to the prior Form 8582 Part VII column
(c), preserve form/part character through Part IX, and treat a disposition of
the entire interest to an unrelated party in a fully taxable transaction
differently from a partial disposition. Those are the boundaries above.

## Retained activity with one current Part II property gain

The [2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582) treat
a less-than-entire disposition's gain as current activity income and do not
release all prior PALs merely because an asset was sold. A narrow source route
now admits one Schedule E other-passive (`B`) activity with a positive
filed-2024-Part-VII-sourced prior **operating** PAL and exactly one 2025
no-recapture Form 4797 Part II property gain, only when the source explicitly
states `entire_activity_interest_disposed: false`. Form 4797 passes that fact
with the activity ID and gain; Form 8582 applies the ordinary passive-income
limit, and MeF independently compares the gain, part, retained-interest fact,
and activity ID with the Schedule E/Form 4797 rows. Missing retained-interest
proof, an additional transaction or activity, and any prior Form 4797 Part I/II
loss remain fail-closed. Focused source, node, and MeF cases are written but
unrun.

The retained-interest route does not establish a complete entire-interest
disposition to an unrelated party in a fully taxable transaction or a full
§469(g) PAL release. A prior Form 4797 loss with a current sale still needs
separate transaction and filed-year disposition evidence. The full
test/typecheck/XSD/filled-PDF/business-rule batch remains pending.

The other-passive retained Part II route now requires the same direct source
join at Schedule E intake as its active-rental sibling: one sale with matching
activity ID/name, filed 2024 Part VII operating balance, whole-dollar Schedule E
net, 100% ownership, and no separate section 1231 amount. The sale must affirm a
retained interest, unrelated buyer, fully taxable noninstallment closing, and a
nonblank closing-document reference. Previously that Schedule E shortcut could
pass with only the retained-interest flag and a prior PAL; later document guards
were not a substitute for validating the intake. A positive source case and
missing/mismatched-evidence rejection cases are written but unrun. This does not
authenticate the closing document or filed 2024 Form 8582, and does not broaden
the allowed disposition character.

### Retained active rental with one Part II property gain, written but unrun

The same [TY2025 IRS instructions](https://www.irs.gov/instructions/i8582) place
actively participated rental real estate in Part IV and treat a less-than-entire
property disposition gain as current activity income, not an automatic release
of every prior PAL. A bounded type-A Schedule E path now admits one activity
with a whole-dollar current operating loss and a filed-2024 Part VII operating
PAL. It requires active participation both in 2025 and when the prior loss
arose, one positive short-held no-recapture Form 4797 Part II sale whose
activity interest is explicitly retained, an unrelated buyer, full recognition,
no installment method, and a closing-document reference. The current sale gain
must be less than the current-plus-prior operating losses. Form 8582 Part IV
counts the gain as passive income, applies the MAGI-dependent special rental
allowance, and retains any balance by durable activity ID; Form 4797 keeps the
property's ordinary gain. Native MeF and PDF projections match the Schedule E
property, sale, prior-year source, Part IV amounts, and allowance. Focused
source, calculation, XML, and PDF projection cases are written but unrun.

This does not admit prior Form 4797-character PALs, a second activity or sale,
Part I section 1231 gain, an entire-interest disposition, recapture,
related-party or installment sales, or missing prior participation/MAGI facts.
The entered closing and filed-return references are not independently
authenticated. Full test, typecheck, XSD, filled-PDF, business-rule, and ATS
gates remain pending.

## Filed 2024 Part IX character without a 2025 sale

A bounded other-passive Schedule E activity may now carry a prior Form 4797 Part
I or II PAL when there is no current Form 4797 transaction. The source must
identify the filed 2024 Form 8582, its matching Part VII column (c) balance, and
two or three Part IX rows identifying the exact reporting form and unallowed
amount. Those rows must add up to the Part VII balance and equal the 2025
Schedule E activity's operating, Part I, and Part II carryovers by durable
activity ID. Schedule E now forwards a Form 4797 pending document even without a
2025 sale; the Form 8582 allocation and Form 4797 native document retain the
Part I/II character. An absent row, duplicate character, altered amount, current
sale, and active-rental combination reject. Source, node and native XML cases
are written but unrun.

This only proves an entered reference and row reconciliation, not that the filed
2024 return has been fetched or authenticated. A prior single-form Part VIII
loss has only the separate bounded route below; active-rental prior Form 4797
loss, current sale, and complete section 469(g) disposition remain outside this
route. The full batch, schema, PDF, business-rule and ATS gates remain pending.

## Filed 2024 Part VIII single-form character without a 2025 sale

A bounded other-passive Schedule E activity may now bring one prior Form 4797
Part I **or** Part II suspended loss from filed 2024 Form 8582 Part VIII,
without a current Form 4797 sale. Its reviewed source identifies the same
durable activity, the filed Part VII column (c) unallowed balance, and one Part
VIII row with the exact reporting part and unallowed amount. The 2025 source
must have no prior operating loss, no loss in the other Form 4797 part, and no
current Schedule E loss. Any amount, character, or source mismatch rejects at
the node and native MeF source join. The one-form 2025 allocation stays on Part
VIII, while the existing two-or-more-form route remains on Part IX. The
in-memory ending balance uses a
`suspended_pal_8582_partviii:<activity ID>:<form part>` key rather than
mislabeling this single-form record as Part IX. Focused positive and rejection
cases are written but unrun.

This is a filed-record source contract, not proof that the 2024 return was
fetched or authenticated. The
[2024 Form 8582](https://www.irs.gov/pub/irs-prior/f8582--2024.pdf) prints the
Part VII column (c) and Part VIII unallowed-loss amounts separately; the
[2025 instructions](https://www.irs.gov/instructions/i8582) reserve Part VIII
for an activity whose losses are reported on one form or schedule. Current
sales, active rentals, multiple loss characters, full-batch validation and
durable cross-year import/export remain open.

## Remaining source and persistence gates

### Active-rental current loss ledger, written but unrun

The storage-ready 2025 ledger first admitted one identified, actively
participated Schedule E single-family rental with a current whole-dollar loss,
no prior PAL, no other passive activity, no current sale, and an explicit filing
status and modified AGI. It uses Form 8582's computed special allowance before
recording the current allowed and ending suspended operating loss in Part VIII
character. A $40,000 loss at $120,000 MAGI, single status records $15,000
allowed and $25,000 suspended. Missing participation or MAGI, unproven MFS
lived-apart status, prior losses, and sales remain closed. Focused round-trip
and rejection cases are written but unrun.

The same current-loss ledger now also accepts multiple identified, actively
participated Schedule E single-family rentals when **every** activity is a
whole-dollar current loss with no prior PAL or sale. It applies one taxpayer-
level special allowance and allocates whole-dollar allowed and suspended losses
across the rental activity IDs. For $10,000 and $30,000 losses at $120,000
modified AGI, the $15,000 allowance is allocated $3,750 and $11,250; the
remaining $25,000 is carried by activity. The stored read still recomputes
against the original ordered source, and a mixed property type, prior PAL,
duplicate ID, missing MAGI, or sale rejects. These focused cases are written but
unrun. This does not establish support for mixed active/passive rentals,
prior-year active rental losses, rental gains, or IRS acceptance. This records a
sourced activity calculation only after an accepted-return reference is
supplied; it does not authenticate the Schedule E records, save the snapshot
durably, import it into 2026, or establish ATS acceptance.

The existing version-1 filed ledger constructor now also accepts a bounded
operating-only, no-sale group of other-passive Schedule E and Form 4835
activities. It checks each durable activity ID and the aggregate amounts through
the Form 8582 node, allocates the allowed loss across loss activities, and
records one Part VIII line per loss activity with its opening, current, allowed,
and ending operating balances. An income-only activity contributes to the
allowed-loss calculation but has no Part VII/VIII loss row. The read check
recomputes the allocation from the original 2025 source, so a changed income
activity cannot silently preserve the old ledger. This uses the existing ledger
shape; it does not establish acceptance or storage, cover active-participation
rentals, or import balances into 2026. Focused multi-activity, Form 4835,
round-trip, changed-income, duplicate-ID, and sale-boundary cases are written
but unrun. The
[2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582) place
activities with overall loss in Part VII, use Part VIII for a single reporting
form, and allocate allowed losses from Part III across those rows.

An actively participated rental with an eligible loss remaining after passive
income now requires modified AGI before computing the special allowance. A
missing MAGI no longer silently becomes a zero allowance and an overstated
suspended PAL. If all losses are already covered by passive income, or the
taxpayer is ineligible for the allowance, MAGI is not needed for this branch.
Focused cases are written but unrun.

A versioned, storage-ready 2025 ledger snapshot can now be built from the
source-reconciled no-sale prior-Form-4797 allocation **after** the caller has an
accepted-return reference. It retains each activity ID, reporting Part VIII/IX,
prior filed-form reference when an opening loss exists, per-form
opening/current/allowed/ending amounts, and a reconciled total. Re-reading a
stored JSON snapshot now also requires the original 2025 activity input and a
separately supplied accepted-return reference. It validates the shape, unique
activity/form keys, arithmetic and total, then recomputes the whole ledger from
the source. A self-consistent edit to the stored opening/allowed amounts or
filing ID cannot silently become next-year provenance. Focused round-trip,
arithmetic-tamper, coherent-edit, changed-source, and changed-filing-ID cases
are written but unrun. The caller must retain the original source independently
and prove that the filing ID represents an accepted return; this helper cannot
establish either fact. This is a domain record and validator, not a storage
implementation or a 2026 return importer: the caller must durably save the
accepted snapshot, and the next tax-year engine must consume and reconcile it
against its own source documents. No ATS acceptance exists yet, so no actual
filed ledger has been produced.

A typed 2024 filed-record reconciliation interface now accepts a separately
retained transcription of the supplied acceptance reference, filed Form 8582
document reference, activity IDs, Part VII column (c) balances, and Part VIII/IX
reporting-form rows. It requires unique activity/form keys, exact
row-to-Part-VII arithmetic, and an exact join to every positive 2025 prior-loss
activity and its existing source fields. It checks Schedule E or Form 4835
operating character separately from Form 4797 Part I/II character; missing,
extra, reidentified, or recharacterized carryovers reject. It does not populate
2025 loss amounts, authenticate the supplied acceptance reference, fetch IRS
documents, or persist either year's record. The caller must retain and review
the actual 2024 source separately. Focused Part VIII/IX and tamper cases are
written but unrun. Current-year dispositions and changes of reporting form
remain outside this importer.

For the bounded no-sale prior Form 4797 Part IX route, the 2025 calculation now
also emits positive ending balances by activity ID and reporting character in
the numeric `carryforwards` workpaper. Keys have the form
`suspended_pal_8582_partix:<URI-encoded activity ID>:<schedule_e|form4797_part1|form4797_part2>`;
the four supported Part IX labels also include `form4835` for calculator output.
The character balances must sum to the aggregate suspended amount. The older
activity and total amounts remain summaries. A focused character-balance case is
written but unrun. This is in-memory output only: it does not record opening
amounts, amounts used, filed source reference, or a durable storage event, and
the next-year importer does not consume these keys.

The filed 2024 Part IX and bounded Part VIII row sources above are direct-source
routes. They do not authenticate the prior filed return, cover all Part VIII
single-form carryovers, or persist the 2025 ending balance by reporting form and
part. Durable carryforward export/import by those keys remains open.

### Bounded entire-interest overall-loss route, written but unverified

The [2025 IRS instructions](https://www.irs.gov/instructions/i8582) say that
when a fully taxable sale of the entire passive activity to an unrelated person
produces an overall loss, the activity does not go on Form 8582. Current and
prior losses retain their ordinary reporting-form character and are allowed in
full. The new bounded direct-sale route accepts one Schedule E type-B activity
with a whole-dollar current operating loss, a filed-2024 Part VII operating PAL,
and one positive, short-held, no-recapture Form 4797 Part II property sale. The
sale source must affirm the entire activity interest was disposed, the buyer was
unrelated, all gain was recognized, and no installment method applies, with a
nonblank closing-document reference. The sale gain must be less than the current
plus prior operating loss. Schedule E line 22 takes the full current and prior
operating loss, Form 4797 Part II keeps its ordinary gain, and no Form 8582
activity or carryforward is emitted. Native Schedule E and Form 4797 require
matching sale facts; the Form 4797 PDF maps the one Part II row, line 17, and
line 18b from that sale. Source, calculation, native XML, PDF projection and
rejection cases are written but unrun.

This does not establish an overall-gain disposition, Part I sale, prior Form
4797-character PAL, rental active-participation release, more than one activity
or sale, recapture, a partial sale, a related buyer, a nontaxable transfer, or
installment treatment. Those still reject. The Form 4797 PDF mapping is static
field inspection only. A 2025 Schedule E PDF descriptor now maps one US Part I
rental property to the official property A AcroForm widgets, including the full
allowed line 22 loss, lines 23-26 and the Schedule 1 line 5 reconciliation. It
checks the native Schedule E/Form 4797 source join and rejects other
dispositions, multi-property rows, royalty, vacation-use and farm/page-2 paths.
Focused projection and rejection cases are written but unrun. The agreed full
batch, local XSD, filled-PDF visual review, business rules and ATS acceptance
remain open.

The retained-interest route with `entire_activity_interest_disposed: false`
remains separate from this narrow complete-disposition route. An asserted
`disposed_of` flag or sale gain alone proves neither. Prior PAL plus a sale
outside these two sourced routes must still reject.

The calculation currently emits `suspended_pal_8582` and activity-ID-keyed
amounts in the in-memory `NodeResult`. The 2024 reviewed-record reconciler and
2025 storage-ready snapshot above do not constitute a durable filed-year store,
an authenticated filing-status lookup, or a 2026 importer. The native XML/PDF
descriptor cannot establish those contracts. A production cross-year store must
durably retain the reviewed source reference, activity ID, reporting form/part,
original and used amounts, and resulting balance, then verify the next-year
import against those records before a prior loss is used.

## MFS lived-apart calculation parity, written but unverified

The [2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582) set
the lived-apart MFS $12,500 allowance and $50,000-$75,000 modified-AGI
phase-out. The native 2025 MeF builder now passes its source-checked
`mfs_lived_apart_all_year` fact into the shared passive-loss limit. Previously
it validated that fact but left it out of the calculation, making an eligible
MFS rental loss look ineligible when reconciling the $12,500 special allowance.
Focused cases now cover the $50,000 and $75,000 modified-AGI boundaries as well
as the existing $60,000 phase-out case. The full test and XSD batch remains
unrun.

## PDF projection boundary

The earlier PDF descriptor assigned raw Schedule C/F and aggregate loss inputs
to Part I lines 1a–1c and 2a–2c. On the
[2025 Form 8582](https://www.irs.gov/pub/irs-prior/f8582--2025.pdf), those lines
are totals from the active-rental Part IV and other-passive Part V; Part II line
6 is modified AGI. The old assignments could misstate the PDF.

The PDF descriptor now projects the native MeF builder's source-reconciled Parts
I–IX worksheet onto the actual three-page 2025 AcroForm. Its static map covers
lines 1a–11, the five printed rows and totals in Parts IV–VIII, and the one
three-line Part IX activity block. It invokes the native builder first, so
aggregate-only, mismatched activity identity, unsourced prior losses, and
unsupported disposition/MFS routes keep the same rejection boundary. If a native
worksheet exceeds the printed row capacity, PDF projection rejects explicitly
rather than dropping activities. This is **not** a claim that overflow pages or
every Form 8582 route are supported.

The official 2025 cached PDF is three pages with XFA and AcroForm widgets; the
map was inspected against its field names and widget positions. Focused
projection/guard cases are written but unrun. The requested full batch,
canonical-field/widget-value check after fill, visual filled-PDF review, IRS
business rules and ATS acceptance remain open. Until those checks run, the new
PDF mapping is an unverified implementation, not a release clearance.
