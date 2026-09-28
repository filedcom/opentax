# TY2025 Form 1116 Schedule B PDF boundary

The
[IRS Schedule B (Form 1116), Rev. December 2022](https://www.irs.gov/pub/irs-pdf/f1116sb.pdf)
remains the published form linked from the
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116). Its page
1 contains the income-category selection and preceding-year columns (i)–(vii);
page 2 contains columns (viii)–(xiv), including the third-, second-, and
first-preceding tax years, current year, and totals. The canonical AcroForm tree
was inspected directly. This is a two-page descriptor, not a flattened
substitute.

The bounded path now renders the same `form1116_schedule_b` source as native
MeF. One shared presentation function validates the sourced balance and
allocates any current-year use oldest first. For a reviewed current-year excess
with no unresolved carryback, the PDF prints that excess on lines 6 and 8 in
current-year column (xiii) and total column (xiv). For reviewed 2021-2024
carryovers with no intervening adjustments, it prints each vintage on lines 1
and 3, negative current-year use on line 4, and remaining balance on line 8; the
totals and explicit zero page-1/page-2 subtotals agree with MeF. The 2021 amount
occupies the fourth-preceding column (ix), immediately before the three
previously mapped years. The descriptor requires the matching parent Form 1116
category summary and filer name/SSN. It does not silently omit a positive
attachment, so the prior PDF-only preflight guard is removed for both modeled
cases.

A further bounded case combines a reviewed 2021-2024 carryover balance with
current-year excess tax in the same passive or general category. The
[IRS Schedule B instructions](https://www.irs.gov/instructions/i1116sb) say
current-year excess leaves the line 3 prior balance unused and records new
excess on lines 6-8. The carryback review's filed 2024 Schedule B line 8 balance
must match the vintage source, and filed 2024 Form 1116 lines 23 and 24 must
show no unused limitation for a 2025 carryback. Native Schedule B and the PDF
now carry the unchanged prior vintages on lines 1/3/8, the new 2025 excess on
lines 6/8, and their sum on line 8 total. The parent Form 1116 must reconcile to
that same single attachment. Source, XML, PDF, and mismatch cases are written
but unrun.

The reviewed prior-year source now also accepts a credit **originating in 2020**
and shown by vintage on the filed 2024 Schedule B line 8. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) allow a
10-year foreign-tax carryforward; the published
[Schedule B form](https://www.irs.gov/pub/irs-pdf/f1116sb.pdf) places 2020 in
the fifth-preceding column for 2025, on page 1, and carries its subtotals to
page 2. The local TY2025 `IRS1116ScheduleB.xsd` names that column
`FifthPrecedingTYAmt`. The existing reviewed-balance total, zero other-vintage
amount, no-adjustment statement, category match, and oldest-first use still
apply. The PDF prints the 2020 line 1/3/4/8 cells and both page subtotals;
native XML uses the same vintage and tax-use allocation. Focused source, native,
PDF, duplicate-year, out-of-range-year, and mismatch cases are written but
unrun. This does not accept an unverified 2020 _filed balance_ as though the tax
originated in 2020, or open 2015-2019 carryovers, carrybacks, redeterminations,
and intervening adjustments. Filled rendering, XSD, business-rule, and ATS
validation remain pending.

Pre-2021 vintages, positive carrybacks, section 905(c) adjustments, expirations,
other categories, multiple category schedules, and other special histories
remain outside this narrow source model; they must not be inferred from these
fields. Focused field-path, projection, reconciliation, and preflight cases are
written but intentionally unrun. PDF appearance, typecheck, XSD, full tests, and
IRS acceptance remain pending the shared validation batch.
