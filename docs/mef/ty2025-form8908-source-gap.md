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

Unregistered native IRS8908 and three-page PDF projections now map the six
credit classes, certifiers, and first twenty home addresses. Both require a
matching proposed `f3800.f8908_credit` source record; positive and altered
credit fixtures are authored but unrun. The projections reject more than 38
certifiers, the space printed in Part II.

**Filing remains closed.** The public node no longer deposits an estimate on
Schedule 3. A valid source record stops until Form 3800 line 1p and its tax
limit, Form 7220 attachment linking for applicable PWA homes, individual
certifier identity, native/PDF registration, and return reconciliation are
implemented. The
source references are reviewed assertions, not authenticated certification,
sale, basis, or PWA document bytes. Pass-through-only allocations need their
own K-1 source route; they do not create a personal Form 8908. Full-batch
tests, XSD, filled-PDF review, IRS business rules, and ATS remain open.
