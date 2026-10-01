# TY2025 Form 8862 prior-notice copy binding

The [2025 Form 8862 instructions](https://www.irs.gov/instructions/i8862)
require a prior credit disallowance other than a math or clerical error before
the claimant uses this form; an active credit ban has separate consequences.
The current CTC/ODC and AOTC routes hold reviewed year, notice reference,
taxpayer, nonclerical-disallowance, and no-active-ban assertions, but a copy
reference alone does not establish the IRS notice's actual contents.

`bindForm8862PriorNoticeCopies` is a standalone byte-binding prerequisite for
one or two separately reviewed CTC/ODC and AOTC notices. It requires exactly
one claimed-credit review and retained copy per credit, checks the reviewed
year, reference, and filer against Form 8862, rejects duplicate copy keys, and
checks a PDF header and the SHA-256 of the exact retained bytes. Positive,
changed-byte, changed-year, changed-filer, and missing-copy fixtures are
authored for the deferred bulk pass.

This does not authenticate IRS issuance or extract the disallowance decision
from the PDF. A reviewer still must verify notice content, credit category,
tax year, taxpayer, nonclerical basis, and absence of an active ban against an
authoritative IRS record. The new binding is not called by the MeF or PDF
exporters; the existing claim joins and notice-copy authentication gap remain
open. No broader EITC notice route is implied.
