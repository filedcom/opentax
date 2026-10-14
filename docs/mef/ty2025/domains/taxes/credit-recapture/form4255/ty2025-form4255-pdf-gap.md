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
The staged input now permits at most one row per supported credit line, matching
the bounded PDF projection; duplicate rows are rejected before their amounts
can be summed into Schedule 2. Focused source, native-gate, and PDF tests passed
10/10 on 2026-10-05.

The December 2025 PDF descriptor projects at most one EP-only row on each of
line 1d and line 2a. It fills columns (a) through (f), (n)(1), (n)(3), (q), (s),
and (t), and the same columns on line 3. It rejects recapture and duplicate
credit-line rows, and reconciles the candidate to finalized Schedule 2 fields.
The native descriptor serializes the same staged row and totals. The bounded
PDF projection retains only pages 1–3, where Part I spans the three printed
column groups. It excludes page 4 (Part II recapture) and page 5 (Part III
emissions-tier recapture), because the EP-only guard rejects nonzero recapture
amounts and maps no fields to those pages. This page trim does not open positive
filing.

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

Source-staging and PDF projection positive/tamper fixtures were written before
this page trim. In the 2026-10-05 page audit, the three focused Form 4255 PDF
tests passed; `deno check`, lint, and diff checks passed on the two Form 4255
files. A staged EP-only PDF was rendered and all three retained Part I pages
were visually inspected, including the line 1d/2a entries and line 3 totals.
The native positive-export gate still rejects unauthenticated source bytes, so
this direct descriptor review is not a filed full-return or XSD validation.

## October 10 public calculation and final export boundary

The grouped Forms3115/4255/8611 component batch passes32 tests; ten new public
checks also pass (42 distinct passes, zero failures/ignored). Form4255's own
input/native/PDF modules account for10 component tests. Four public Form4255
cases retain75,000 W2 wages and baseline tax7,955:

| Case | Schedule2 destination | Added tax | Final1040 tax |
| --- | --- | ---: | ---: |
| EP-only line2a | line1e300 + line1f60 | 360 | 8,315 |
| line2a recapture | line1d1,500 + line1e300 + line1f60 | 1,860 | 9,815 |
| line1d recapture | line19 1,500 + line1e300 + line1f60 | 1,860 | 9,815 |
| line1d EP, reasonable cause | line1e300; line1f0 | 300 | 8,255 |

Both final exporters reject all four candidates with their respective missing
source-authentication errors (eight assertions). The source metadata is
synthetic; a consistent amount and SHA256-shaped string do not prove an IRS
notice or accepted prior return. The PDF projection test verifies three
retained PartI pages from the five-page template and rejects unsupported
recapture. There is no new rendered-page or full-return XSD claim.

See the [grouped route checkpoint](../../../income/business/form3115/ty2025-form3115-route-audit.md)
and `.state/research/method-recapture-routes-2026-10-10/` logs. This supersedes
older authored/unrun inventory wording but leaves the source-authentication,
PartsII/III and broader recapture tasks open. No production code changed.
