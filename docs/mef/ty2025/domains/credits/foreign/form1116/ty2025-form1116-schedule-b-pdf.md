# TY2025 Form 1116 Schedule B PDF boundary

## October 9 current-excess complete-return verification

The [passive-country checkpoint](./ty2025-form1116-main-pdf-gap.md#october-9-passive-country-and-current-excess-packet-checkpoint)
retains seven XSD-valid complete returns and 56 visually reviewed pages,
including all fourteen foreign-credit Schedule B pages. Current-year lines 6
and 8 and total line 8 carry 1,125, 5,125, 5,925 or 925 as applicable; parent
credit and Form 1040 final tax reconcile. Removing the carry schedule rejects
both native preparation and fresh PDF construction. This advances the current
excess packet proof only: authenticated prior vintages, carrybacks,
redeterminations and IRS acceptance remain open. Parent residence and zero-tax
presentation qualifications remain deferred107/76.

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
originated in 2020, or open unreviewed carryovers, carrybacks, redeterminations,
and intervening adjustments. Filled rendering, XSD, business-rule, and ATS
validation remain pending.

The same reviewed-vintage route now admits a credit **originating in 2019** and
carried on filed 2024 Schedule B line 8. For TY2025, the IRS form places that
credit in page-1 column (v), the sixth-preceding year; the local native schema
uses `SixthPrecedingTYAmt`. Calculation uses the reviewed balance after current
foreign tax, while Schedule B allocates use to 2019 before 2020 and carries
both page-1 subtotals to page 2. The official PDF field tree confirms page-1
line 1/3/4/8 cells `f1_14`, `f1_75`, `f1_82`, and `f1_110`. Source, calculation,
native, PDF projection, and out-of-range fixtures are authored but unrun.

The next reviewed source vintage now admits a credit **originating in 2018**,
shown on filed 2024 Schedule B line 8. Its TY2025 seventh-preceding-year
column is page-1 column (iv) on the IRS form and `SeventhPrecedingTYAmt` in
the local native schema. Oldest-first use now consumes 2018 before 2019 and
2020; PDF page-1 line 1/3/4/8 fields `f1_13`, `f1_74`, `f1_81`, and `f1_109`
feed both page subtotals. Source, calculation, native, PDF projection, and
out-of-range fixtures are authored but unrun.

The reviewed source now also permits a **2017-origin passive** credit shown on
filed 2024 Schedule B line 8. Its TY2025 eighth-preceding-year amount occupies
IRS Schedule B page-1 column (iii), local `EighthPrecedingTYAmt`, and official
PDF line 1/3/4/8 cells `f1_12`, `f1_73`, `f1_80`, and `f1_108`; both page
subtotals include it. The 2025 Form 1116 instructions permit a 10-year
carryforward and direct earliest-year use. They also prescribe special
pre-2018 **general-category** allocation to the post-2017 general or foreign
branch categories, so this source schema rejects a 2017 general-category
vintage without a separate allocation route. Passive source, calculation,
native, PDF, and rejection fixtures are authored but unrun.

A reviewed **2016-origin passive** credit from filed 2024 Schedule B line 8 now
uses the TY2025 ninth-preceding-year column: IRS page-1 column (ii), local
`NinthPrecedingTYAmt`, and official PDF line 1/3/4/8 fields `f1_11`, `f1_72`,
`f1_79`, and `f1_107`. The existing 10-year and oldest-first calculation
applies; page-1 and page-2 subtotals combine it with later vintages. General
category 2016 remains rejected under the pre-2018 allocation boundary. Source,
calculation, native, PDF, and rejection fixtures are authored but unrun.

The final age-window vintage admits a reviewed **2015-origin passive** credit
from filed 2024 Schedule B line 8. It uses TY2025 page-1 column (i), local
`TenthPrecedingTYAmt`, and official PDF line 1/3/4/8 fields `f1_10`, `f1_71`,
`f1_78`, and `f1_106`. Under the
[Schedule B line 5 instructions](https://www.irs.gov/instructions/i1116sb),
any 2015 amount left after oldest-first 2025 use expires on line 5. The native
`ForeignTxCyovExprUnsdCurrTYGrp` and PDF line 5 field `f1_85` now record that
negative amount and both page subtotals; line 8 excludes it. For a $400
2015 and $200 2016 balance with $300 used, $100 expires and only $200 enters
the following-year balance. The sourced calculation and both projections
reconcile to that result. Source, calculation, native, PDF, and false
carryforward fixtures are authored but unrun. Pre-2018 general credits still
reject pending category-allocation evidence.

Pre-2015 vintages, positive carrybacks, section 905(c) adjustments, expirations
other than the bounded 2015 line-5 amount,
other categories, multiple category schedules, and other special histories
remain outside this narrow source model; they must not be inferred from these
fields. Focused field-path, projection, reconciliation, and preflight cases are
written but intentionally unrun. PDF appearance, typecheck, XSD, full tests, and
IRS acceptance remain pending the shared validation batch.

A second bounded prior-use case combines **two issued 2025 foreign
1099-INT payers in distinct countries** with one reviewed 2024-origin passive
credit on filed 2024 Schedule B line 8. The same passive category's two
country columns add to the parent Form 1116 limit; the $500 prior balance is
used after $200 of current tax and flows through Schedule 3 line 1 and Form
1040 line 20. Native Schedule B in a full-return export now checks its retained
vintage source, parent category, Schedule 3, and Form 1040 before serializing,
in parallel with the PDF path. The positive two-country parent/Schedule B
native/PDF projections and changed filed reference, country, and return-total
rejections are authored but unrun. This route does not authenticate the filed
2024 Schedule B or the two issued 1099-INT statements.

The native parent Form 1116 and full-return Schedule B PDF now also compare
each embedded vintage and the filed-source references with the retained 2024
Schedule B intake. A changed 2023/2024 split that preserves the $9,100 total
and the same 2025 credit must reject at both export paths, as must a changed
retained intake under an unchanged attachment. The parent PDF uses the same
comparison. Native and Schedule B PDF also compare Form 1040 line 20 with
Schedule 3 line 8 in a finalized return. Positive full-return, both-direction
vintage-tamper, and return-total fixtures
are authored for the deferred batch. This checks the structured transcription;
it does not authenticate the filed 2024 Schedule B or establish IRS acceptance.

For the one-category current-year excess route, the Schedule B PDF now also
requires Schedule 3 line 1 to equal that category's allowed Form 1116 credit,
while retaining its Schedule 3 line 8 to Form 1040 line 20 check. The native
Schedule B already enforced this parent-credit join. An authored full-return
foreign-interest positive case and a Schedule 3 credit tamper case await the
bulk pass. The [Schedule B instructions](https://www.irs.gov/instructions/i1116sb)
derive current-year excess and its carryover from the same Form 1116 category;
this check does not establish foreign-source document authenticity or extend
the one-category PDF route.

Both export paths now compare Schedule 3 line 1 with the sum of all parent Form
1116 category credits when a finalized Form 1040 is present. A second parent
category can no longer bypass that comparison while the Schedule B attachment
still matches its own category. The focused full-return tamper case and the
affected native/PDF suites passed 28/28 on 2026-10-05. Multiple category
Schedule B attachments and authenticated prior filed bytes remain open.
