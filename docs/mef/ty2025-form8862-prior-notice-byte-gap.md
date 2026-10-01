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

## Combined ODC and AOTC claimant (2026-10-01, unrun)

A full-return executor fixture now claims both ODC and AOTC for one adult
dependent student. Two separately reviewed prior-notice records identify their
respective credit, disallowance year, notice reference, and taxpayer. The 2025
source links the same person to Form 1040's ODC dependent row, Schedule 8812's
$500 credit, Form 8863's $1,500 nonrefundable and $1,000 refundable AOTC,
Schedule 3, and Form 8862 Parts III/IV. Native MeF and PDF export replay the
reviewed notices and finalized claimant/credit joins. When the ODC dependent
and AOTC student have the same name, export also requires the finalized
Form 1040 dependent SSN to equal the Form 8863 student SSN, preventing two
different people from sharing the apparent claimant. The positive full-return
and changed-notice/name/SSN fixtures are authored but unrun. This does not
activate the standalone notice-byte binder or authenticate IRS issuance;
filled-PDF review and the combined validation batch remain open.
