# TY2025 Form 8862 prior-notice copy binding

The [2025 Form 8862 instructions](https://www.irs.gov/instructions/i8862)
require a prior credit disallowance other than a math or clerical error before
the claimant uses this form; an active credit ban has separate consequences. The
current CTC/ODC and AOTC routes hold reviewed year, notice reference, taxpayer,
nonclerical-disallowance, and no-active-ban assertions, but a copy reference
alone does not establish the IRS notice's actual contents.

`bindForm8862PriorNoticeCopies` is a standalone byte-binding prerequisite for
one or two separately reviewed CTC/ODC and AOTC notices. It requires exactly one
claimed-credit review and retained copy per credit, checks the reviewed year,
reference, and filer against Form 8862, rejects duplicate copy keys, and checks
a PDF header and the SHA-256 of the exact retained bytes. Positive,
changed-byte, changed-year, changed-filer, and missing-copy fixtures are
authored for the deferred bulk pass.

This does not authenticate IRS issuance or extract the disallowance decision
from the PDF. A reviewer still must verify notice content, credit category, tax
year, taxpayer, nonclerical basis, and absence of an active ban against an
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
reviewed notices and finalized claimant/credit joins. When the ODC dependent and
AOTC student have the same name, export also requires the finalized Form 1040
dependent SSN to equal the Form 8863 student SSN, preventing two different
people from sharing the apparent claimant. The positive full-return and
changed-notice/name/SSN fixtures are authored but unrun. This does not activate
the standalone notice-byte binder or authenticate IRS issuance; filled-PDF
review and the combined validation batch remain open.

## Shared dependent's exact credit replay (2026-10-01, unrun)

When one adult dependent is claimed for both ODC and AOTC, Form 8862 native and
PDF export now independently recompute Schedule 8812 and Form 8863 from their
retained source inputs. They require the Part III CTC/ODC counts and Schedule
8812 nonrefundable/refundable amounts to match Form 1040 lines 19/28, and the
Part IV AOTC amounts to match Form 8863, Schedule 3 line 3, and Form 1040
line 29. Both schedules must carry the Form 8862 filed marker. This adds amount
parity to the existing same-name, same-SSN and prior-notice joins for the shared
claimant. Positive full-return and changed line 19, line 29, and Schedule 3
credit fixtures are authored for the deferred batch. Notice content and issuer
authenticity remain open.

## Standalone one-dependent ODC amount and identity replay (2026-10-01, unrun)

The [2025 Schedule 8812 instructions](https://www.irs.gov/instructions/i1040s8)
place the other-dependent count on line 6, multiply it by $500 on line 7, and
send the allowed nonrefundable amount on line 14 to Form 1040 line 19. For a
Form 8862 claim with exactly one ODC dependent and no CTC child, EITC, or AOTC
claim, native and PDF export now recompute Schedule 8812 from the retained
input. They require its Form 8862 marker, lines 4/6/7 and 14/27, finalized Form
1040 lines 19/28, and the dependent's original and filed name and TIN to agree.
A full-return fixture and altered schedule, credit, source TIN, and filed TIN
fixtures are authored for the deferred bulk pass. Other claimant combinations
retain their separate guards; this does not authenticate the prior IRS notice or
expand the claim to unsourced dependents.
