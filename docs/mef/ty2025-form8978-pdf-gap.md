# TY2025 Form 8978 and Schedule A PDF projection

The January 2023 IRS [Form 8978](https://www.irs.gov/pub/irs-pdf/f8978.pdf) and
[Schedule A](https://www.irs.gov/pub/irs-pdf/f8978sa.pdf) remain the published
pages for this TY2025 path. The
[instructions](https://www.irs.gov/instructions/i8978) require Schedule A lines
2, 4, and 6 to carry to Form 8978 lines 1b, 3b, and 9b. The current PDF
descriptors use the native `f8978` calculated lines and original adjustment rows
to print exactly one filing with one affected year. The final source check
recomputes the filing, matches the native result, and matches positive line 14
to the finalized Form 1040 line 16 addend or negative line 14 to the finalized
reporting-year worksheet. The partner name and TIN come from the same filer
identity as the return.

This is a bounded build pass, with focused cases written but unrun. The PDF
projection stops for more than one filing, more than one affected-year column,
or more than seven adjustments in any category. It also stops when an adjustment
lacks a Form 8986 tracking number, audit control number, or issuer TIN; the
source model cannot yet distinguish a partner-level tax-attribute row that
properly leaves that printed tracking column blank. These paths need a separate
source-aware layout design, not a truncated page or fabricated identifier. The
tax-computation statement attachment remains separate. Filled-page visual review
and the full test batch are deferred to the coordinated validation pass.
