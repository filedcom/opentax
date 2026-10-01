# TY2025 Form 8908 source and filing gap

The [December 2025 Form 8908](https://www.irs.gov/pub/irs-prior/f8908--2025.pdf)
has six separate direct-contractor credit classes, a certifier inventory, and
the first twenty qualified-home addresses. Its line 8 goes to Form 3800 Part III
line 1p for an individual claimant. The
[2025 instructions](https://www.irs.gov/instructions/i8908) require a home to be
acquired by another person for use as a residence after the applicable
certification; increased multifamily amounts also require Form 7220.

The former public node accepted only a construction enum, a certification enum,
and an optional arbitrary credit override. It estimated $2,500 or $5,000 and
sent the amount straight to Schedule 3 line 6a. That cannot establish the Form
8908 claim or apply the Form 3800 tax limit. The public item now requires an
identified contractor, acquired home and residence use, construction basis,
program, zero-energy-ready/PWA status, dated certification and an explicit
business-or-person certifier identity, Form 7220 review when needed, and source
references. Its source calculator derives all six Part I counts and credits, the
distinct certifier and home counts, the Part II certifier inventory, and the
first twenty Part III addresses. Duplicate home claims, late certifications,
missing PWA evidence, other-year acquisitions, and the old override shape
reject. Positive and tamper fixtures are authored but unrun.

Unregistered native IRS8908 and three-page PDF projections now map the six
credit classes, certifiers, and first twenty home addresses. Both require a
matching proposed `f3800.f8908_credit` source record; positive and altered
credit fixtures are authored but unrun. The projections reject more than 38
certifiers, the space printed in Part II. Individual certifiers serialize as
`PersonNm`; business certifiers serialize as `BusinessName`. Both print in the
same Part II name field.

**Filing remains closed.** The public node no longer deposits an estimate on
Schedule 3. Form 3800 now has staged line 1p source and standard-limit
calculation, plus source-linked native/PDF row projection for a directly claimed
home. Public export still rejects both the Form 8908 source and a Form 8908
credit in Form 3800. Native/PDF Form 8908 registration and complete return
reconciliation remain open. The source references are reviewed assertions, not
authenticated certification, sale, basis, or PWA document bytes.
Pass-through-only allocations need their own K-1 source route; they do not
create a personal Form 8908. Full-batch tests, XSD, filled-PDF review, IRS
business rules, and ATS remain open.

The TY2025 individual MeF schema has no standalone `IRS7220` element. It accepts
`BinaryAttachment`, which other credit routes use for a completed Form 7220 PDF.
[Form 8908 instructions](https://www.irs.gov/instructions/i8908) require Form
7220 for lines 3b and 4b, and the
[Form 7220 instructions](https://www.irs.gov/instructions/i7220) call for a
separate form per residence. Each increased-credit home now carries a direct
Form 7220 review and completed-PDF contract: a home address and acquisition
snapshot, review reference, PDF filename, reviewed SHA-256, and completion
assertion. Staged native preparation checks one unique bundled PDF, description,
exact submitted-byte digest, and `BinaryAttachment` document ID per home;
missing, reused, and mismatched links reject. PDF contents and Form 7220 line
data previously were not independently parsed against wage records. A staged
per-residence review now records the taxpayer, construction start, Part I marks,
each Part II employer/EIN, trade classification, labor count, hours, wages,
fringe benefits, payroll reference, and prevailing-rate review. A staged
AcroForm reader compares these to fields in the exact supplied PDF bytes,
including the home address, acquisition date, Form 8908 mark, apprenticeship
not-applicable mark, correction status, and line 10. The 2025
[Form 7220 instructions](https://www.irs.gov/instructions/i7220) say section 45L
has no apprenticeship requirement. Its line 10 "No" also calls for a separate
signed no-alterations statement; the reviewed source names that statement, but
its signature and bytes are not yet bound to an attachment. The official PDF has
no signature field. PDF signatures, flattened appearance, XFA/AcroForm
synchronization, and independent payroll authenticity are not verified by this
field reader. The MeF bundle preparation now passes its already validated
BinaryAttachment bytes to this verifier before XML preparation. Missing or
altered Form 7220 bytes reject. The existing native link still requires a unique
document ID per home. After the PDF check, preparation explicitly rejects the
line-10 "No" branch because the required signed statement is only named by a
source reference; its bytes and signature have not been bound. The public guard
remains closed pending signed-statement handling, XFA/appearance review,
independent provenance, and full-batch tests.
