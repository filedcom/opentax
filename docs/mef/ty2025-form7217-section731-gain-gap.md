# TY2025 Form 7217 section 731 gain boundary

The [Form 7217 instructions](https://www.irs.gov/instructions/i7217) put
recognized cash-over-outside-basis gain on Part I line 7 and keep the basis
allocation on line 10 tied to Part II. The
[2025 partnership K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
generally send section 731 capital gain to Form 8949 and Schedule D, but
section 751 and other ordinary-income exceptions require separate reporting.

A bounded capital-gain route is now written, but unrun. It requires one dated
K-1 box 19 statement for the distribution, named partner and partnership,
separate code A cash and code D deemed cash that sum exactly to Form 7217 line
5a, code C distributed-property basis and FMV that match every Part II row, and
an as-of-distribution outside-basis workpaper whose opening basis plus
pre-distribution increases less decreases equals line 4. It requires no code B
section 737 property, no code F/G service distribution, no section 707
disguised sale, no section 751(b) sale or exchange, no section 731(c)
securities, one continuous acquisition holding period, and U.S. tax due on
the gain. The source node derives line 7 and emits a matching short- or
long-term Form 8949 transaction with no adjustment. MeF and PDF export require
exactly one matching finalized Form 8949 row and a K-1 partner SSN matching
the filer. Missing or conflicting evidence rejects; there is no manually
entered gain amount or routing fallback. Focused source, MeF, PDF-projection,
and rejection cases are written but unrun.

This does not authenticate the referenced K-1 or outside-basis workpaper, or
reconcile their amounts to an independently parsed K-1 attachment. The
repository's generic K-1 box 19 field does not preserve distribution codes
and dates, so that deeper join remains open. Section 751 ordinary gain,
section 737, section 731(c) reductions, multiple holding-period lots,
related/service or disguised-sale distributions, and non-U.S.-taxable gain
remain rejected. Native XML still needs the full TY2025 XSD batch, filled PDFs
need visual review, and IRS business-rule/ATS acceptance is unproved.
