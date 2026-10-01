# TY2025 Form 4255 PDF boundary

Status: no Form 4255 PDF descriptor is registered. This is an open print and
source-coverage gap, not an approved exclusion. The current native MeF route
does not by itself establish a source-backed positive PDF filing.

The
[official December 2025 Form 4255](https://www.irs.gov/pub/irs-prior/f4255--2025.pdf)
is five pages. Part I summarizes prior credit and EPE amounts, recapture
partitions, excessive payments, credit transfers and penalties. Part II requires
property-level original-credit and recapture calculations, and Part III covers a
specified clean-hydrogen emissions-tier recapture. The
[TY2025 instructions](https://www.irs.gov/instructions/i4255) govern which
additional parts and statements apply.

The `f4255.rows` candidate now requires typed prior-credit evidence for each
row: tax year, original Form 3468 Part IV or Form 8933, filed-return reference
and SHA-256, and the prior Part I amounts. The typed source must match the
row's credit line and columns (a), (b), (c), and (e). Any excessive payment
also requires a 2025 IRS determination notice reference and SHA-256, its
determined net-EPE amount, and a reasonable-cause decision. The row's column
(n)(1) and 20% column (n)(3) must reconcile to that notice. An EP-only
candidate without Part II recapture can be calculated and routed to Schedule 2.
The existing row arithmetic and zero limits on columns (j), (k), and (n)(2)
remain.

These references and hashes are entered source metadata. The executor cannot
yet authenticate the filed return, original credit utilization, or IRS notice
bytes against them. Native Form 4255 now explicitly rejects every positive
candidate, even if its Schedule 2 entries reconcile. This keeps positive
export closed while the original source and PDF route are unfinished. The
Schedule 2 calculator and standalone projections can still inspect staged
candidate amounts; they do not establish an exportable Form 4255 filing.

A positive line 1d or 2a net-EPE recapture additionally needs the applicable
property-level Part II facts, including original credit, dates or financing
change, recapture percentage and prior Form 3800 use. The present model has no
such source or print projection. An EP-only row may not need Part II, but still
needs a source-backed EP liability and gross/net EPE split; a text reference and
entered amount cannot prove it. Form 8933 has no source node in the current
graph, and the current Form 3468 node is not a prior-year credit ledger.

Before registering a bounded PDF, bind the supplied prior-return and IRS
determination bytes to their SHA-256 values and extracted fields; derive the
applicable Part I row from those authenticated records, determine whether
Part II or III and attachments are required, and reconcile the printed form to
native MeF, Schedule 2, and final Form 1040 tax totals. Keep other credit
lines, transfer columns, penalties and unproved recapture events closed until
each has its own route.

The source-staging positive and tamper fixtures are written but unrun. No PDF
descriptor or registration was added. No tests, typecheck, XSD validation or
filled-PDF rendering was run in this batch.
