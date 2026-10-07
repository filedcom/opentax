# TY2025 Form 8582 entire disposition with overall gain

## Current checkpoint — October 8, 2026

The sections below retain implementation-time descriptions. Helper support
and authored native/PDF cases do not by themselves establish a public filing
route. In particular, the first-year actively participated entire-overall-gain
probe (current operating loss 5,000, Part II gain 8,000) is rejected by the
Form 4797 graph validator, which requires a type-B source activity for that
entire-passive-sale branch. This is future item 39, unworked; no guard was
changed and no source/XSD/PDF filing proof is claimed for that type-A case.

Isolated `b82c1bbc4` instead extends storage for three already admitted source
routes: first-year other-passive and active retained Part II sales, and a
first-year other-passive entire sale with overall gain. The normal typed
ledger/native/source suite passed 29/0. The tested entire-gain ledger retains
5,000 allowed operating loss and zero ending PAL; retained-sale ledgers keep
3,000 suspended operating loss and source-reconciled synthetic opening rows.
Isolated `c2e5dafec` subsequently produced three complete locally XSD-valid
ten-page packets, with 19 unique images inspected and 11 exact within-batch
matches; its test file passed 5/0. Amounts and identity reconcile, but retained
sale FPA and entire-disposition EDPA PDF identification is missing. This is
future item 40, unworked; complete PDF instruction parity remains unproved.
These are unverified candidates, not accepted filings or a production 2026
import. Prior-accepted-return proof, wider disposition characters, matching
business rules and ATS remain open. See the [activity ledger checkpoint](ty2025-form8582-activity-id-gap.md#current-evidence-checkpoint--october-8-2026)
and [execution journal](ty2025-readiness-execution-2026-10-07.md).


## First-year active rental entire disposition with overall loss (2026-10-01, unrun)

The [2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582) say a
fully taxable disposition of the entire passive activity interest to an
unrelated buyer releases an overall loss on the forms normally used, without a
Form 8582 activity entry. A bounded type-A actively participated rental first
acquired and sold in 2025 now follows that rule for one short-held,
no-depreciation Form 4797 Part II sale. The same durable activity ID, purchase
date and document, unrelated-buyer fully taxable noninstallment closing, and
no-prior-grouping assertion must match the Schedule E property and sale. Entered
prior PALs, at-risk/expense carryovers, other Form 4797 character, multiple
properties, and Form 4835 activities remain closed.

The $5,000 current Schedule E operating loss exceeds the $2,000 ordinary sale
gain. Schedule E line 22 and Form 4797 retain their normal reporting character;
Schedule 1 lines 5 and 4 give a net $3,000 reduction in Form 1040 additional
income, with no Form 8582 activity. Native Schedule E/Form 4797 and their PDF
preflights require a finalized single-filer return and exact source-specific
Schedule 1 and Form 1040 totals, with no other Schedule 1 income. Positive and
altered status, purchase, closing, and amount fixtures are authored for the
deferred bulk pass. MFS and other filing statuses, prior-year activities,
disposition document bytes, filled-PDF review, XSD, and IRS acceptance remain
open.

## Direct Part I section 1231 sale prerequisite (2026-10-01, unrun)

The requested first-year activity bought and sold in 2025 cannot have a
direct Form 4797 Part I section 1231 real-property gain: the [2025 Form 4797
instructions](https://www.irs.gov/instructions/i4797) require the property
to be held **more than one year**. The passive sale source now rejects this
classification explicitly. This does not rule out a separately evidenced
tacked holding period; that would require a different source contract.

For a genuine long-held rental acquired before 2025, the Schedule E source can
now retain the purchase date/document, same durable activity ID and name,
filed 2024 Schedule E reference, zero prior PAL assertion, and no-grouping
assertion. A character-specific reviewer checks that these match a single
fully taxable unrelated-party entire-interest closing, Form 4797 Part I sale
gain, zero five-year section 1231 loss lookback, and a whole-dollar current
Schedule E operating loss smaller than the gain. It yields a proposed Part IV
or V row: sale gain in column (a), current operating loss in (b), and zero
prior loss in (c). The gain retains Form 4797 Part I character and would flow
to Schedule D if its section 1231 lookback is truly zero; the operating loss
would remain on Schedule E and Schedule 1. The [2025 Form 8582
instructions](https://www.irs.gov/instructions/i8582) require the entire
activity's overall gain in Part IV or V while gains and losses stay on their
normal reporting forms.

This is a prerequisite, not a positive filing route. A reviewer-entered 2024
Schedule E reference and zero-PAL assertion do not authenticate that return's
acceptance or its activity and loss balance. Schedule E calculation and native
Form 8582/Form 4797 and their PDFs reject the candidate until an executor-owned
accepted-return source can prove those facts. Purchase, activity identity,
closing, lookback, and prior-loss tamper fixtures are authored but unrun. The
Form 1040/Schedule D and native/PDF positive joins remain open pending that
source.

## First-year entire disposition with overall loss (written, unrun)

A bounded type-B rental acquired and sold in 2025 can now release its current
operating loss in full when its one short-held, no-recapture Form 4797 Part II
sale gain is smaller. The source must identify the acquisition document, match
the activity ID/name and acquisition date to the sale, affirm no grouping with a
prior activity, and identify an unrelated buyer and fully taxable noninstallment
entire-interest closing. Entered prior PALs, at-risk or expense carryovers, and
Form 4797-character losses close this route. The complete disposition bypasses
Form 8582, with the operating loss on Schedule E, the ordinary sale gain on Form
4797, their net on Schedule 1 and Form 1040, and matching native and PDF forms.
Full-return positive and acquisition/closing tamper fixtures are authored for
the deferred batch.

The [2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582)
direct an entire activity with overall loss to its normal reporting forms and
no Form 8582 activity entry. The [2025 Form 4797 instructions](https://www.irs.gov/instructions/i4797)
put a short-held property's ordinary gain in Part II. The acquisition and
closing references are entered evidence, not authenticated document bytes.
Long-held sales, recapture, multiple activities, prior loss release, and
filled-output/XSD/IRS acceptance remain open.

The [2025 Form 8582 instructions](https://www.irs.gov/pub/irs-pdf/i8582.pdf),
"Reporting an Entire Disposition on Form 4797 or Form 8949," require an entire
passive-activity disposition with an **overall gain** to include the current
gain, current loss, and filed prior-year unallowed loss in Part IV or V. The
activity's income and losses remain on the forms normally used. An **overall
loss** instead bypasses Form 8582, and its losses are allowed in full.

This build pass adds a bounded Part V path: one type-B Schedule E rental
activity, one short-held direct Form 4797 Part II property sale, no depreciation
recapture, an unrelated buyer, a fully taxable noninstallment transaction, and
an affirmative entire-interest assertion with a disposition document reference.
The current Schedule E result is a whole-dollar loss, the only 2024 PAL is an
operating amount matched to filed Form 8582 Part VII column (c), and the sale
gain exceeds the sum of current and prior losses. Form 8582 Part V reports the
source-linked row, releases both losses, and carries no PAL forward. Schedule E
line 22 and Form 4797 Part II retain their ordinary reporting character. The MeF
and PDF descriptors cross-check the sale, prior-loss source, activity ID, and
final amounts.

Focused calculation and TY2025 MeF/XSD cases are written but **not run**. They
remain part of the agreed single full test batch. The filled PDFs also remain
unrendered and unreviewed.

The same one-sale overall-gain slice now also supports an actively participated
rental real estate activity in Part IV, provided the owner actively participated
both in 2025 and when the filed 2024 operating loss arose. The source keeps the
same durable activity ID, prior Form 8582 Part VII amount, Form 4797 Part II
sale, and Schedule E operating loss. Part IV column (a) receives the sale gain,
(b) the current operating loss, and (c) the filed prior loss. The loss is
released on Schedule E and carried once to Schedule 1. Native MeF and the Form
8582/Schedule E PDF descriptors use the same source checks. Focused cases are
written but unrun.

An additional Part V case has zero current-year Schedule E operating income or
loss, one identified filed-2024 Part VII operating PAL, and one fully taxable
entire-interest Part II sale to an unrelated buyer. The sale gain must exceed
the prior operating loss. The 2024 activity ID, unallowed balance and filed
reference remain mandatory; current Form 4797 sale and closing facts must match
the Schedule E source. Form 8582 releases the prior loss, Schedule E carries it
to Schedule 1, and Form 4797 keeps the gain, giving the net Form 1040 AGI
effect. Native Form 8582 Part V and PDF projection show sale gain, prior loss,
and overall gain. An executor-produced full-return fixture plus prior-balance,
buyer, sale-document, and amount-tamper cases are authored but unrun. This
does not admit positive current operations, active-rental zero-current cases,
Part I sales, prior Form 4797-character losses, or unauthenticated source bytes.

A separate first-year Part V path covers one type-B rental acquired and sold in
2025 with a current operating loss smaller than its direct Part II sale gain.
The source must identify the activity acquisition date, a purchase document, and
affirm that the property was not grouped with an older passive activity. The
sale's acquisition date must match, and the source must affirm the entire
interest was sold to an unrelated buyer in a fully taxable, noninstallment
transaction with a closing-document reference. Any entered prior passive
operating or Form 4797 loss field, prior Form 8582 source, at-risk carryover, or
operating expense carryover closes this path, including an explicitly entered
zero prior operating loss. This is a current-year calculation, not an inference
about an unverified 2024 accepted return. Schedule E, Form 4797, Form 8582 Part
V, Schedule 1, and the PDF descriptor use the same activity and sale identifiers
and whole-dollar amounts. Focused calculation, MeF/XSD, and PDF-projection cases
are written but **not run**.

The same first-year source contract now admits one actively participated
type-A rental to Part IV when the owner bought and sold it in 2025. The
identified purchase and sale dates, purchase-document reference, no-prior-
grouping attestation, whole-dollar current Schedule E loss, and one short-held
no-recapture Form 4797 Part II gain must match. The gain must exceed the loss;
no prior PAL or at-risk/expense carryover can be entered. The calculated Part IV
gain and allowed current loss flow through Schedule E, Form 4797, Schedule 1,
and Form 1040; native MeF and PDF compare the same source activity and sale.
A full-return positive fixture and changed-purchase-reference rejection fixture
are authored but unrun. This applies the [2025 Form 8582
instructions](https://www.irs.gov/instructions/i8582) for an active rental's
entire disposition with overall gain. Acquisition/closing document bytes,
other sale characters, and wider activity combinations remain open.

An activity acquired before 2025, grouped with an older passive activity, or
carrying any prior unallowed loss still needs authenticated filed-return
evidence and activity/character joins. The current 2024 Form 8582 reference
fields and ledger snapshots are not themselves proof that the prior return was
accepted. Those wider paths remain blocked; this first-year path does not
release their losses or establish a general carryforward import contract.

This does not cover Part I section 1231 sales, mixed Part I/II gains or
recapture, Form 8949 partnership-interest sales, multiple activities, prior Form
4797-character PAL, installment or related-party sales, or an exact zero overall
result. These still require separate source-backed routes or an explicit
exclusion decision.

The next disposition expansion cannot be a change to the overall-gain comparison
alone. A Part I section 1231 sale or mixed Part I/II recapture needs the exact
current transaction and its reporting character joined to the activity; a prior
Form 4797-character PAL also needs the filed 2024 Part VIII or IX row and the
2025 released amount to stay on its original reporting part. The existing single
Part II operating-loss source does not prove those facts. At an exact zero
overall result, the instructions' separate overall-gain and overall-loss
reporting directions do not themselves identify the filing route, so the current
guard remains closed pending an explicit disposition decision. The
[2025 Form 8582 instructions](https://www.irs.gov/instructions/i8582) describe
the entire-disposition branches and require the activity's gains and losses to
be reported on their normal forms.
