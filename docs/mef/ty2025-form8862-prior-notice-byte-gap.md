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
reference, and filer against Form 8862 **and the matching final-return
`general.prior_*_disallowance_review` record**, rejects duplicate copy keys,
requires an explicit no-active-ban claim, and checks the SHA-256 of the exact
retained bytes. It now parses each copy as a readable PDF with at least one
page; a `%PDF-` prefix alone cannot pass. EITC claims remain outside this
prerequisite because their direct review has no retained copy key or
issuer/content evidence. Positive, changed-byte, changed-year, changed-filer,
changed-final-review, active-ban, malformed-PDF, and missing-copy fixtures are
authored for the deferred bulk pass.

This does not authenticate IRS issuance or extract the disallowance decision
from the PDF. The MeF descriptor now rejects every CTC/ODC or AOTC Form 8862
claim after its source and finalized-return checks, and the PDF descriptor
reuses that rejection. Combined EITC plus CTC/ODC or AOTC claims also fail.
The binder remains a separate prerequisite and is not called by either
exporter. A future positive route needs executor-owned evidence from an
authoritative IRS record establishing issuance, notice contents, credit
category, tax year, taxpayer, nonclerical basis, and absence of an active ban.
Only then may the final return and PDF claim be emitted. A retained PDF and
its digest do not satisfy that gate. EITC-only native and PDF routes now apply
the same deliberate rejection after their source and final-credit joins. The
claim-join tests, positive calculation fixtures, and deliberate export
rejection fixtures are authored but unrun for the deferred bulk pass.

## EITC-only notice boundary (2026-10-01, unrun)

The EITC-only route previously accepted a reviewer-entered disallowance year
and notice reference as enough to export Form 8862. Native and PDF export now
first join those facts to the final `general.prior_eic_disallowance_review`,
the claimant SSN, explicit no-active-ban assertion, the calculated EITC
amount, and Form 1040 line 27. Child claims retain their Schedule EIC name
and count check. Both exporters then reject the claim until an executor-owned
authoritative IRS record proves notice issuance, credit category, year,
claimant, nonclerical decision, and active-ban status. Childless and
income-only claims have authored source-matched rejection cases; altered
review, filer, ban, credit, and return cases fail earlier. The current EITC
review schema has no notice-copy reference, taxpayer identity on the notice,
or decision-content fields, so the standalone exact-byte binder cannot be
extended to EITC without a new direct evidence contract. Even a digest-bound
copy would not authenticate IRS issuance or its contents. The
[2025 Form 8862 instructions](https://www.irs.gov/instructions/i8862) require
the prior reduction or disallowance to be more than a math or clerical error
and distinguish an active credit ban from an ordinary Form 8862 filing.

## Combined ODC and AOTC claimant (2026-10-01, unrun)

A full-return executor fixture now claims both ODC and AOTC for one adult
dependent student. Two separately reviewed prior-notice records identify their
respective credit, disallowance year, notice reference, and taxpayer. The 2025
source links the same person to Form 1040's ODC dependent row, Schedule 8812's
$500 credit, Form 8863's $1,500 nonrefundable and $1,000 refundable AOTC,
Schedule 3, and Form 8862 Parts III/IV. Native MeF and PDF descriptor checks replay the
reviewed notices and finalized claimant/credit joins before rejecting export. When the ODC dependent and
AOTC student have the same name, export also requires the finalized Form 1040
dependent SSN to equal the Form 8863 student SSN, preventing two different
people from sharing the apparent claimant. The positive calculation, deliberate export rejection, and
changed-notice/name/SSN fixtures are authored but unrun. This does not activate
the standalone notice-byte binder or authenticate IRS issuance; the combined validation batch remains open.

## Shared dependent's exact credit replay (2026-10-01, unrun)

When one adult dependent is claimed for both ODC and AOTC, Form 8862 native and
PDF export now independently recompute Schedule 8812 and Form 8863 from their
retained source inputs. They require the Part III CTC/ODC counts and Schedule
8812 nonrefundable/refundable amounts to match Form 1040 lines 19/28, and the
Part IV AOTC amounts to match Form 8863, Schedule 3 line 3, and Form 1040
line 29. Both schedules must carry the Form 8862 filed marker. The descriptor
checks this amount parity before rejecting unauthenticated notices. This adds amount
parity to the existing same-name, same-SSN and prior-notice joins for the shared
claimant. Positive calculation, deliberate export rejection, and changed line 19, line 29, and Schedule 3
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

## Standalone one-student AOTC amount and identity replay (2026-10-01, unrun)

The [2025 Form 8863 instructions](https://www.irs.gov/instructions/i8863) send
its refundable line 8 to Form 1040 line 29 and its allowed nonrefundable line 19
to Schedule 3 line 3. For a Form 8862 claim with one AOTC student and no CTC/ODC
or EITC claim, native and PDF export now replay Form 8863 from its retained
tuition, eligibility, identity, and credit-limit sources. The student's Part III
filing name must match both the Form 8863 source name and Form 8862 Part IV,
with a retained student SSN. The Form 8862 filed marker and both exact credit
amounts must match the finalized Schedule 3 and Form 1040. The existing
full-return route now has positive PDF projection and altered name, filed name,
marker, Schedule 3, and Form 1040 fixtures for the deferred bulk pass. Other
student combinations and IRS notice issuance or contents remain outside this
bounded replay.
