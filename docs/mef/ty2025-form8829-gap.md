# TY2025 Form 8829 coverage boundary

Sources: [IRS 2025 Form 8829](https://www.irs.gov/pub/irs-prior/f8829--2025.pdf)
and
[2025 Instructions for Form 8829](https://www.irs.gov/pub/irs-prior/i8829--2025.pdf).
Native XML must match the checked-in TY2025 v5.4 `Common/IRS8829/IRS8829.xsd`
schema.

## Bounded rented-home route written

The node models one identified rented home used regularly and exclusively for
one Schedule C business, with actual-method indirect insurance, rent, repairs,
utilities, and other operating expenses. It requires explicit eligibility and
exclusion facts. It calculates applicable 2025 lines 1–3, 7–8, 18b–28, 32–36,
and 43–44. A positive line 36 is now blocked at the node and MeF boundaries: the
executor cannot merge an output into one identified Schedule C item, so the
prior top-level line 30 output did not change filed Schedule C line 30/31 or
downstream SE tax and QBI. Zero-deduction Form 8829 still retains and emits line
43 carryover. The old flat expense input is rejected. Form 1098's former
full-box-1 routing to Form 8829 now fails explicitly because its
mortgage-interest allocation is not modeled. The input is registered for the
2025 filing graph.

The MeF descriptor was rewritten for native TY2025 v5.4 `IRS8829` order. It
requires proprietor name/SSN, recalculates every emitted line, and checks the
identified Schedule C reference and line 29 for the zero-deduction route. The
PDF descriptor maps the known bounded-route source fields to printed positions
but does not yet fill the complete calculated form or identity.

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

## Remaining end-to-end boundaries

- The bounded path excludes owned homes, all mortgage interest and real estate
  taxes, casualty losses, depreciation, direct expenses, daycare, inventory
  storage, and multiple homes or businesses. These need distinct sourced paths,
  not an inferred zero expense in otherwise applicable returns.
- Positive actual-method deductions need an item-linked Schedule C projection
  before line 31, SE tax, and QBI are computed. The runtime's shallow array
  accumulation cannot safely patch one `schedule_cs` item, so this route fails
  closed rather than filing inconsistent Forms 8829 and Schedule C.
- Eligibility, non-duplication of home costs in Schedule C expenses, and the
  prior-year line 25 operating carryover are verified source facts, not yet
  reconciled to independent use records, expense detail, or a prior-year return.
  Schedule C lacks an owner field, so proprietor-to-business linkage is not
  independently checked.
- The native XML is written against v5.4 names and order but has not yet passed
  local XSD or IRS business-rule validation. The registered PDF still lacks
  identity and most computed fields; it must not be treated as a complete
  filled-form validation.
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
- The bounded calculator rejects a business area greater than the total area and
  excludes daycare, direct expenses, excess interest and tax, casualty losses,
  and depreciation rather than guessing those calculations.
- Form 8829 line 8 is sourced from Schedule C line 29 only for the explicitly
  excluded no-home-gain/no-other-trade-loss case. A zero or negative line 8 does
  not suppress the filed Form 8829 or line 43 carryover.

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

No compatibility layer or temporary calculator fallback was added. Full Form
8829 coverage remains open until the excluded situations, local XSD, filled PDF,
and IRS acceptance gates are satisfied.
