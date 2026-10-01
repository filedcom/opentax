# TY2025 Form 8908 source and filing gap

The [December 2025 Form 8908](https://www.irs.gov/pub/irs-prior/f8908--2025.pdf)
has six separate direct-contractor credit classes, a certifier inventory, and
the first twenty qualified-home addresses. Its line 8 goes to Form 3800 Part
III line 1p for an individual claimant. The
[2025 instructions](https://www.irs.gov/instructions/i8908) require a home to
be acquired by another person for use as a residence after the applicable
certification; increased multifamily amounts also require Form 7220.

The former public node accepted only a construction enum, a certification enum,
and an optional arbitrary credit override. It estimated $2,500 or $5,000 and
sent the amount straight to Schedule 3 line 6a. That cannot establish the
Form 8908 claim or apply the Form 3800 tax limit. The public item now requires
an identified contractor, acquired home and residence use, construction basis,
program, zero-energy-ready/PWA status, dated certification and certifier,
Form 7220 review when needed, and source references. Its source calculator
derives all six Part I counts and credits, the distinct certifier and home
counts, the Part II certifier inventory, and the first twenty Part III
addresses. Duplicate home claims, late certifications, missing PWA evidence,
other-year acquisitions, and the old override shape reject. Positive and
tamper fixtures are authored but unrun.

**Filing remains closed.** The public node no longer deposits an estimate on
Schedule 3. A valid source record stops until a native Form 8908, Form 3800
line 1p source and limit, Form 7220 for applicable PWA homes, and the filled
three-page Form 8908 PDF are implemented and reconciled to Form 1040. The
source references are reviewed assertions, not authenticated certification,
sale, basis, or PWA document bytes. Pass-through-only allocations need their
own K-1 source route; they do not create a personal Form 8908. Full-batch
tests, XSD, filled-PDF review, IRS business rules, and ATS remain open.
