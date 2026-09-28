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

The current `f4255.rows` source is entered directly. Its only document link is
the free-text `source_document_reference`; no node deposits or verifies the row
against a prior filed Form 3468 Part IV, Form 8933, Form 3800 utilization,
elective-payment record or recapture/EP determination. The row schema proves
internal column arithmetic and limits columns (j), (k) and (n)(2) to zero. The
native `IRS4255` builder prints Part I groups for line 1d or 2a and a total
group, and joins resulting amounts to Schedule 2 lines 1d, 1e, 1f and 19. That
Schedule 2 equality is a downstream arithmetic check, not independent proof of
the prior credit or event.

A positive line 1d or 2a net-EPE recapture additionally needs the applicable
property-level Part II facts, including original credit, dates or financing
change, recapture percentage and prior Form 3800 use. The present model has no
such source or print projection. An EP-only row may not need Part II, but still
needs a source-backed EP liability and gross/net EPE split; a text reference and
entered amount cannot prove it. Form 8933 has no source node in the current
graph, and the current Form 3468 node is not a prior-year credit ledger.

Before registering a bounded PDF, add a typed prior-credit/payment and event
source with a stable document identity. Recompute the applicable Part I row from
that source, determine whether Part II or III and attachments are required, and
reconcile the full printed form to native MeF, Schedule 2, and final Form 1040
tax totals. Keep other credit lines, transfer columns, penalties and unproved
recapture events closed until each has its own route.

No PDF descriptor, registration or focused print test was added. No tests,
typecheck, XSD validation or filled-PDF rendering was run in this audit.
