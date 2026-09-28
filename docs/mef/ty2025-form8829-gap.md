# TY2025 Form 8829 coverage boundary

Sources: [IRS 2025 Form 8829](https://www.irs.gov/pub/irs-prior/f8829--2025.pdf)
and
[2025 Instructions for Form 8829](https://www.irs.gov/pub/irs-prior/i8829--2025.pdf).
Native XML must match the checked-in TY2025 v5.4 `Common/IRS8829/IRS8829.xsd`
schema.

## Bounded PDF correction

The current PDF descriptor's Form 8829 line 1 and 2 fields were reversed.
Several expenses, carryovers, and basis values were also mapped to different
printed lines. The descriptor now points business area to line 1, total area to
line 2, mortgage interest to line 10's indirect column, indirect operating
expenses to lines 18–22, prior operating carryover to line 25, prior
depreciation carryover to line 31, and basis/FMV to line 37. Focused field-name
cases are written, but they have not yet been run and the filled form has not
been visually inspected.

This corrects field placement only. It does not establish that a complete or
accurate Form 8829 can be filed from the current calculator and XML builder.

## Why the end-to-end route is not yet safe

- The node emits only a Schedule C line 30 amount. It does not emit Form 8829's
  computed lines 3, 7, 9–36, 37–44 or preserve the Part IV carryovers when the
  current deduction is zero. The PDF and XML descriptors therefore receive
  source amounts without the calculated form, even though the IRS form requires
  the line-by-line computation.
- The native builder's element names do not match v5.4 XSD. For example, its
  `BusinessAreaOfHomeSqFtCnt`, `TotalAreaOfHomeSqFtCnt`, `InsuranceAmt`, and
  `PYOperatingExpensesCyovAmt` are not schema elements. The schema instead
  defines `BusinessUseSquareFeetCnt`, `TotalAreaOfHomeCnt`,
  `InsuranceIndirectAmt`, and `OperatingExpensesCarryoverAmt`, in a fixed
  sequence. The builder also omits proprietor name and SSN. Its existing unit
  tests assert these non-schema names, not XSD-valid XML.
- The node assumes `mortgage_interest` is already allocated to business use. The
  1098 router actually sends the full box 1 amount, and the IRS instructions put
  deductible home mortgage interest in Form 8829 line 10 column (b), apply the
  line 7 business percentage, and distinguish itemizers from standard-deduction
  filers. Treating the full amount as a direct deduction can overstate Schedule
  C line 30. Mortgage-interest integration needs Schedule A/standard-deduction
  context and a non-duplicating personal/business split before it can be enabled
  safely.
- The depreciation calculation uses the supplied `home_fmv_or_basis` as building
  basis. The form first subtracts the value of land on line 38, then applies
  line 7 and the applicable line 41 rate. No land value, improvements,
  prior-service exceptions, or partial-year cessation facts are modeled. The
  current `first_business_use_month = 0` rate applies 2.564% to all prior years,
  but the instructions list exceptions requiring Pub. 946 or Pub. 534 rates.
  First use in 2025 can also require Form 4562.
- The calculator omits direct expenses, excess mortgage interest and real estate
  taxes, casualty losses, and the separate line 14/15/27/28/33 limitation order.
  It caps an impossible business-area ratio above 100% instead of rejecting the
  source facts. Daycare hours (lines 4–7), business-use eligibility,
  simplified-method exclusion, and separate forms for multiple homes are not
  represented.
- Form 8829 line 8 is not simply an arbitrary nonnegative limit: the
  instructions derive it from Schedule C line 29 with specified home-use gains
  and other trade/business losses. The present manually supplied
  `gross_income_limit` is not tied to that source calculation. A zero or absent
  limit currently suppresses all outputs, including carryovers that must flow to
  the next year.

## Required acceptance cases

1. Build one typed Form 8829 source model per home and proprietor, with explicit
   eligibility and simplified-method selection. Reject an area greater than
   total area and unsupported daycare/multiple-home paths rather than silently
   calculating them.
2. Compute and emit all applicable lines in IRS order, including direct/indirect
   columns, line 36 to Schedule C line 30, and lines 43–44 even when line 36 is
   zero. Add cases for income-limited operating expenses and depreciation
   carryovers, land subtraction, mortgage interest under itemized and standard
   deductions, and daycare or fail-closed behavior.
3. Map the computed fields in the v5.4 XSD's exact order and include proprietor
   identity. Check native XML against the checked-in schema and a filled PDF
   against the printed IRS form, including the 2025 line numbers and both
   expense columns.

No compatibility layer or temporary calculator fallback is proposed. The PDF
field correction is a bounded build change; a full Form 8829 filing claim must
wait for the calculation, source routing, XSD, and visual gates.
