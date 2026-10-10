# TY2025 Form 7217 section 731 gain boundary

The [October10 complete-return checkpoint](./ty2025-form7217-gap.md#october-10-complete-part-ii-continuation-checkpoint) verifies three current native gain returns and seven complete property-allocation packets with Part II continuations. The gain cases remain native-only: both prepared and fresh PDF paths reject their Form8949 row contract (deferred126). Earlier projection-test successes below do not establish complete gain-packet support. Source/owner checks remain active, and no deferred repair was made.

The [Form 7217 instructions](https://www.irs.gov/instructions/i7217) put
recognized cash-over-outside-basis gain on Part I line 7 and keep the basis
allocation on line 10 tied to Part II. The
[2025 partnership K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
generally send section 731 capital gain to Form 8949 and Schedule D, but
section 751 and other ordinary-income exceptions require separate reporting.

A bounded capital-gain route is implemented and its focused coverage now
passes. It requires one dated
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
entered gain amount or routing fallback. Focused node, MeF, PDF-projection,
and rejection tests pass within the 25-test Form 7217 batch. A separate
$5,000 recognized-gain full return passes TY2025 v5.4 XSD through Form 8949,
Schedule D, and Form 1040; the partial ATS Scenario 12 case does not cover gain.

This does not authenticate the referenced K-1 or outside-basis workpaper, or
reconcile their amounts to an independently parsed K-1 attachment. The
repository's generic K-1 box 19 field does not preserve distribution codes
and dates, so that deeper join remains open. Section 751 ordinary gain,
section 737, section 731(c) reductions, multiple holding-period lots,
related/service or disguised-sale distributions, and non-U.S.-taxable gain
remain rejected. Native XML still needs the full TY2025 XSD batch, filled PDFs
need visual review, and IRS business-rule/ATS acceptance is unproved.

## Liquidating property-basis prerequisite

The [Form 7217 instructions](https://www.irs.gov/instructions/i7217) direct a
section 732(c) allocation when a liquidating distribution's outside basis
after cash differs from the partnership's aggregate property basis. For the
bounded **basis-increase** case with multiple section 732 properties, the
source now identifies inventory/receivables versus other property and names a
section 732(c) workpaper. The calculation preserves inventory/receivables at
partnership basis, allocates the increase to other property first up to its
unrealized appreciation, then allocates any remainder by FMV. Each Part II
column (e) row must match that result, even when the submitted total matches
Part I line 10. The IRS instruction's $750 outside basis, $100 cash,
$100 inventory, $50 asset X, and $100 asset Y basis example gives $100, $440,
and $110 of property basis. Source, native, and PDF projection fixtures, plus
an offsetting $1 row tamper, are covered by the passing 25-test Form 7217
batch. The same published allocation now passes a graph-generated full-return
TY2025 v5.4 XSD case; its offsetting $1 tamper rejects through the graph.

The current bounded calculation also checks whole-dollar basis decreases,
including inventory priority, as exercised by the October10 checkpoint.
Section 731(c) securities within liquidating multi-property distributions and
distributions needing other section 732(c) class rules remain outside that
allocation route. The workpaper reference remains unauthenticated;
broader full-return native XSD, filled-PDF, business-rule, and ATS checks remain open.
