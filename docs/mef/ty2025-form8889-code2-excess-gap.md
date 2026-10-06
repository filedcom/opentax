# TY2025 Form 8889 code-2 excess return

## One spouse's employer excess paid to that HSA owner (2026-10-01 build pass, unrun)

The paired full-year self-only route now accepts one owner's full employer
excess paid to that owner during 2025, with earnings, while the other spouse
has ordinary personal contributions. The affected owner supplies one W-2 code
W and one recipient-matched code-2 Form 1099-SA. The HSA calculation puts
the code-2 box 1 total on that owner's Form 8889 lines 14a/14b, includes box
2 earnings and the principal omitted from W-2 box 1 on Schedule 1 line 8z,
and leaves no current Form 5329 excess. Both Form 8889 copies and their
Schedule 1/Form 1040 totals are recomputed for native and PDF export. The
export also ties code W to the affected owner, line 1a to the W-2 wage total,
and line 8 to Schedule 1 additional income. Positive primary/spouse and
W-2, box-2, Schedule 1, and Form 1040 tamper fixtures are authored but unrun.

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
describe the excess-employer income and timely withdrawal rules. The
[2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
say code 2 applies to an excess distribution **to the account holder** and
expressly exclude an employer excess and earnings returned to the employer
from box 1. At this earlier checkpoint that employer-returned transaction was a
separate gap; it cannot be represented as this code-2 route. Mixed HSA events, partial
returns, and independent issuer-byte authentication remain open.

## Two owners' timely personal excess returns (written, unrun)

The paired self-only route now permits each spouse to return their entire 2025
personal excess, with earnings, by the return due date. Each owner supplies a
separate code-2 Form 1099-SA whose recipient SSN, box 1, box 2, and source
reference reconcile to that owner's timely withdrawal. Their Form 8889 copies
separately print the distribution on lines 14a and 14b, deduct only their
permitted contributions on line 13, and create no current excess on Form 5329.
The two earnings amounts are added once on Schedule 1 line 8z and Form 1040
line 8; the line 13 deductions are added on Schedule 1 and Form 1040 line 10.
Native and PDF export recalculate both owners, preserve the distinct SSNs and
sources, and compare the filed return totals. A full-return positive fixture and
box-2, reference, and return-total tamper fixtures are authored for deferred
validation. The [2025 Form 8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf)
direct timely excess plus earnings to line 14b and earnings to other income;
the [2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
require code 2 and box 2 earnings included in box 1. Medical or rollover
distributions alongside these two returned excesses, employer-returned excess,
and accepted prior-year excess import remain outside this bounded route.
The trustee references are entered source metadata; issuer-copy bytes are not
independently authenticated.

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) put a
timely returned HSA excess contribution **and its earnings** on line 14b when
both were included in line 14a. The
[2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
say code 2 identifies a returned excess, box 2 identifies its earnings, and box
2 is already included in box 1. The earnings also go to Schedule 1 other income;
they must not be counted a second time in Form 8889 line 14c.

A bounded route now accepts one primary-owner HSA with one 2025 code-2 Form
1099-SA. The code-2 document must match the owner's SSN, the line-14a total, the
returned-excess source reference, the full line-14b amount in box 1, and the
Schedule 1 line-8z earnings amount in box 2. The current-year personal excess
must be returned in full by the return due date. The MeF and PDF builders
recompute the owner form from the pending source, compare every printed line,
and reconcile the HSA-specific Schedule 1/2 and Form 1040 amounts. Schedule 1
line 10 must also equal Form 1040 line 8, so the box-2 earnings cannot disappear
from the return's additional-income total. Focused positive, changed-box,
changed-print-line, and changed-return cases are written but **not run**.

Mixed code-2 and normal distributions, a simultaneous rollover, employer excess
returned to the employer, partial personal-excess return, and
age-65/disability exception combinations remain blocked. A post-2025 withdrawal
is not a 2025 line-14a/14b distribution. Trustee documents and the
timely-withdrawal answer are entered source facts, not independently
authenticated. Full tests, typecheck, TY2025 XSD validation, filled-PDF visual
review, IRS business-rule checks, and ATS acceptance remain pending.

A paired self-only HSA route now allows either owner's full, timely personal
excess withdrawal on a code-2 Form 1099-SA while the other owner has ordinary
contributions and no distribution. Each owner retains a separate Form 8889;
the withdrawing owner's box 1 reaches lines 14a/14b, box 2 reaches Schedule 1 line
8z/10 and Form 1040 line 8 once, and both line 13 deductions total once on
Schedule 1/Form 1040. MeF and PDF recompute both owner pages and reject changed
box 2, return totals, a second owner's distribution, or a second code-2
withdrawal. Positive and rejection fixtures are authored but unrun. Mixed
distributions and source-byte checks remain open.

## Bounded employer excess paid to the HSA owner (written, unrun)

One primary owner's full 2025 employer excess can now be paid to that owner by
the return due date and reported on one code-2 Form 1099-SA. The existing
calculator puts box 1 on Form 8889 lines 14a/14b, box 2 earnings on Schedule 1
line 8z, and the excess principal omitted from W-2 box 1 on Schedule 1 line 8z;
the timely principal does not create a Form 5329 excess. Native and PDF export
now recompute that result and require the same owner's sole retained W-2 code W
to equal the Form 8889 source and line 9, with full excess principal returned.
They also require Form 1040 line 1a to match the sum of that owner's W-2 box 1
amounts, including additional W-2s without code W, and Schedule 1
line 10 to match Form 1040 line 8. The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
describe the employer excess and earnings treatment; the [2025 Form 1099-SA
instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf) include
earnings in box 1 and exclude a withdrawal returned to the employer from HSA
distribution reporting.

This route requires no personal contribution, no W-2 box 1 inclusion of the
excess, one code-W W-2, no other HSA event, and a payment to the owner in 2025. A
return to the employer has no code-2 Form 1099-SA and was unsupported at this
checkpoint, as
do partial returns, spouse and mixed distribution cases. The W-2, trustee and
timely-withdrawal bytes are not independently authenticated. Positive and
changed-W-2, Schedule 1, and Form 1040 fixtures are authored but unrun; the
bulk validation and filing gates remain pending.

## Employer owner-paid source packet verification (2026-10-06)

The primary and spouse variants above now have complete public return packets
from retained, SHA-256-checked W-2, trustee Form 1099-SA, and owner-payment
records. Their distinct document references, owner SSN, W-2 EIN/box 1/code W,
trustee code 2/box 1/box 2/account, payment date, paid-to-owner answer, and
principal plus earnings reconcile to the actual Form 8889, Schedule 1, and
Form 1040 sources before native or PDF output. Missing bytes, changed hashes,
reference collisions, and recomputed but conflicting payment facts reject
export. Each packet has two Form 8889 copies and no Form 5329; the owner with
code W 5,000 has a 700 excess and 50 earnings returned on one 750 code-2
Form 1099-SA. Form 1040 wages are 90,000, additional income 750, adjustments
2,000, and total tax 6,396.

Focused new source tests pass 3/0 and existing employer/native tests pass 19/0.
The final combined preservation gate passes 143/0, including paired code-2,
owner reconciliation, node calculation, and native export tests
(`/tmp/opentax-hsa-code2-final-focused-oct6.log`).
Both resulting XML packets validate against the local TY2025 MeF v5.4 full
Return1040 XSD. Both seven-page PDFs were visually reviewed on every page:
two Form 1040 pages, three Schedule 1/statement pages, and two owner-specific
Form 8889 pages. These records are retained reviewed source transcriptions;
their hashes prove local byte preservation, not independent issuer issuance or
IRS acceptance. The official [2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
exclude employer-returned excess amounts from box 1, so that event requires a
separate source route and cannot be expressed as this code-2 distribution.

The reviewed PDFs are retained in the isolated research directory as `T.pdf`
(SHA-256 `bf820e6685fd0b2616279ed11da97c8298d8eeea03529a7d18f5a73f0c42bce9`)
and `S.pdf`
(SHA-256 `e38ea636178637967a5a5af6d2136134d4b8414f82cc0f2d0d002de8314dfc0f`).
The corresponding `.origins.json`, `.documents.json`, source/pending JSON,
XML, and fourteen rendered review pages are retained beside them.

## Employer error corrected by trustee return to employer (2026-10-06)

The separate employer-returned route accepts an actual contribution error
above the owner's 2025 section 223(b) annual maximum, with the employer's
correction, trustee remittance **to the employer**, final filed W-2, and
Form 5498-SA retained as four independently referenced, SHA-256-checked
reviewed source records. The recorded $5,000 original deposit less a $700
employer recoup leaves the $4,300 self-only contribution limit on the final
W-2 code W, Form 5498-SA box 2, and Form 8889 line 9. The trustee also pays
$50 earnings to the employer. Neither $750 is an HSA distribution to the
employee, Form 1099-SA box 1/code 2, Form 8889 lines 14a/14b, nor Schedule 1
other income on the employee return. The spouse retains a separate $2,000
personal HSA contribution and Form 8889 copy. Form 1040 has $90,000 wages,
$2,000 adjustments, zero additional income, and $6,306 total tax; no Form
5329 is created.

[IRS Notice 2008-59 Q&A-24](https://www.irs.gov/irb/2008-29_IRB)
permits employer recoup of an erroneous contribution above the annual HSA
maximum. Q&A-25 disallows recoup simply because the employee later ceases
to be eligible. The [2025 Form 1099-SA and 5498-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
exclude employer-returned principal and earnings from Form 1099-SA box 1
and the returned contribution from Form 5498-SA box 2. This bounded route
requires final W-2/5498-SA net figures and a 2025 trustee remittance. It
does not treat a later owner-paid withdrawal, an employer recoup after year
end, or a contribution at/below the annual limit as this correction.

Primary- and spouse-owner public packets pass full TY2025 v5.4 Return1040
XSD and produce six-page PDFs each: Form 1040 pages 1–2, Schedule 1 pages
1–2, and both owner-specific Form 8889 copies. All twelve pages were
rendered and visually reviewed. Retained byte hashes establish local source
integrity, not issuer authentication or IRS acceptance.
The combined source and preservation gate passes 146/0
(`/tmp/opentax-hsa-employer-recoup-final-focused-oct6.log`). Reviewed PDFs
are retained at `.state/research/hsa-employer-recoup-oct6/T.pdf` and `S.pdf`
with SHA-256 values
`099cff52b09d460b42f0013a2e7587fe344d05e60cfc4430c76ad49cc8ba6dba`
and `46b5a43536e8d946c94677c0663bb0e8357e3f918e7f44092d48b010dcff81fc`.
Prior owner-paid code-2 PDFs, origins, and document manifests remain byte
identical; their source/pending JSON differs only in the generated filer
timestamp.
The final direct-PDF negative gate passes 3/0 with both native and filled-PDF
rejection for edited source code W, printed line 9, wages, HSA earnings, and
missing owner copy (`/tmp/opentax-hsa-employer-recoup-direct-negative-oct6.log`).
A raw replay from the eight separately retained document byte files and saved
public inputs reproduces both pending graphs, both PDFs and page origins
exactly; XML differs only in `ReturnTs` and both new outputs validate against
the full v5.4 XSD (`/tmp/opentax-hsa-employer-recoup-raw-replay-oct6.log`).

The prior owner-paid main integration passed the standard 143-case gate and
replayed both retained packets against their source bytes, whole pending graph,
native XML apart from its timestamp, PDF, and origins. All fourteen reviewed
pages matched exactly. Its logs and manifest are recorded in the October 6
status archive. At that checkpoint employer-returned excess was open; the
bounded employer-error correction above now covers the sourced 2025 recoup.

Main employer-recoup integration passes the standard154-case combined gate (146 HSA and eight latest shareholder-source cases). Both actual new six-page packets replay exactly from saved inputs and eight retained byte records through full XSD, pending, PDF and origins, with only native timestamp variation. The two actual earlier owner-paid packets also preserve all fourteen pages and six source records exactly. All twelve new pages were visually reviewed. Main logs and manifests are recorded in the October6 archive. Wider corrections, source authenticity and IRS acceptance remain open.

## Employer excess paid to the HSA owner in 2026 (2026-10-06)

The existing 2025 Form 8889 calculator already separates a timely 2026
withdrawal from a 2025 distribution. The source/export route now binds the
2025 W-2 code W, a dated 2026 trustee excess-return transaction, and the
owner's matching 2026 payment receipt as three distinct SHA-256-checked
reviewed byte records. A $5,000 employer contribution exceeds the $4,300
2025 self-only limit by $700. The trustee pays $700 principal plus $50
earnings to the HSA owner on March 15, 2026, before the unextended filing
deadline. The $700 omitted from 2025 W-2 box 1 reaches 2025 Schedule 1 line
8z and Form 1040 line 8; the timely returned principal removes the current
Form 5329 excess. The 2026 $50 earnings do not appear on the 2025 return.
Neither 2025 Form 8889 line 14a/14b nor a 2025 code-2 Form 1099-SA records
the later payment. Both owner placements retain two Form 8889 copies and the
other spouse's $2,000 personal contribution. Form 1040 total tax is $6,390.

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
put excess employer principal omitted from W-2 wages in other income and
earnings in the year received. They limit Part II line 14a to distributions
made in 2025. The [2025 Form 5329 instructions](https://www.irs.gov/instructions/i5329)
permit a timely return of the excess and attributable earnings to avoid the
2025 excise. The future 2026 Form 1099-SA normally would not be issued by
April 15, 2026; the 2025 filing instead requires the actual trustee payment
and owner receipt. This packet does not claim that a 2026 information return
has been issued or reconcile a 2026 tax return.

Primary- and spouse-owner source packets each validate against the full
TY2025 v5.4 Return1040 XSD and produce seven real PDF pages: Form 1040
pages 1–2, Schedule 1 pages 1–2, a line-8z statement, and both Form 8889
owner copies. All fourteen pages were rendered and visually reviewed.
Missing, changed, late, misdirected, and contradictory W-2/trustee/receipt
bytes reject native export; edited 2025 earnings, employer principal,
distribution lines, return total, and owner-copy count reject native and
direct PDF output. These are retained reviewed source transcriptions, not
issuer authentication or IRS acceptance.

The combined source/owner-preservation gate passes 149/0
(`/tmp/opentax-hsa-postyear-final-focused-oct6.log`). The reviewed post-year
PDFs are retained at `.state/research/hsa-postyear-owner-oct6/T.pdf`
(SHA-256 `7157a9925a7242b5b358f1f621eeee107f65b878a028fc5b6c02b2d8de2356c9`)
and `S.pdf`
(SHA-256 `d4dc6cb786c169b6839b5ba8b830b2df1047e4cab0c90007adbaa8eb71d1718c`).
Raw replay of the six separately retained source documents reproduces both
pending graphs, PDFs, and page origins exactly; XML differs only in
`ReturnTs` and passes the full v5.4 XSD
(`/tmp/opentax-hsa-postyear-raw-replay-oct6.log`). The earlier two owner-paid
and two employer-recoup packets retain exact PDF, page-origin, and document
bytes, with source/pending JSON differing only in generated filer timestamps.
