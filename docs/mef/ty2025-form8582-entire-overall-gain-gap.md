# TY2025 Form 8582 entire disposition with overall gain

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
