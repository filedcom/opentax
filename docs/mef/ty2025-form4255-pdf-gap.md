# TY2025 Form 4255 PDF boundary

Status: a bounded Form 4255 PDF descriptor is registered for EP-only Part I
rows, but positive native and PDF export remain closed. This is an open
source-authentication gap, not an approved exclusion.

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
and SHA-256, and the prior Part I amounts. The typed source must match the row's
credit line and columns (a), (b), (c), and (e). Any excessive payment also
requires a 2025 IRS determination notice reference and SHA-256, its determined
net-EPE amount, and a reasonable-cause decision. The row's column (n)(1) and 20%
column (n)(3) must reconcile to that notice. An EP-only candidate without Part
II recapture can be calculated and routed to Schedule 2. The existing row
arithmetic and zero limits on columns (j), (k), and (n)(2) remain.

The December 2025 PDF descriptor projects at most one EP-only row on each of
line 1d and line 2a. It fills columns (a) through (f), (n)(1), (n)(3), (q), (s),
and (t), and the same columns on line 3. It rejects recapture and duplicate
credit-line rows, and reconciles the candidate to finalized Schedule 2 fields.
The native descriptor serializes the same staged row and totals. The PDF keeps
all five official pages while leaving Parts II and III blank for this bounded
case.

These references and hashes are entered source metadata. The executor cannot yet
authenticate the filed return, original credit utilization, or IRS notice bytes
against them. Native Form 4255 explicitly rejects every positive candidate, even
if its Schedule 2 entries reconcile. The PDF coverage gate also rejects positive
filing. The Schedule 2 calculator and direct descriptor projections can inspect
staged candidate amounts; they do not establish an exportable Form 4255 filing.

A positive line 1d or 2a net-EPE recapture additionally needs the applicable
property-level Part II facts, including original credit, dates or financing
change, recapture percentage and prior Form 3800 use. The present model has no
such source or print projection. An EP-only row may not need Part II, but still
needs a source-backed EP liability and gross/net EPE split; a text reference and
entered amount cannot prove it. Form 8933 has no source node in the current
graph, and the current Form 3468 node is not a prior-year credit ledger.

Before opening positive filing, bind the supplied prior-return and IRS
determination bytes to their SHA-256 values and extracted fields; derive the
applicable Part I row from those authenticated records and reconcile native MeF,
PDF, Schedule 2, and final Form 1040 tax totals. Determine whether Part II or
III and attachments are required. Keep other credit lines, transfer columns,
penalties and unproved recapture events closed until each has its own route.

Source-staging and PDF projection positive/tamper fixtures are written but
unrun. No tests, typecheck, XSD validation or filled-PDF rendering was run in
this implementation batch.
