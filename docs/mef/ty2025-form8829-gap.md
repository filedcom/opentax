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
and 43–44. A positive line 36 now emits a business-referenced claim to Schedule
C. That node projects it onto the sole item before line 31, SE tax, and QBI; the
Schedule C and Form 8829 MeF builders independently reconcile the same claim,
source line 29, and filed line 30/31. The positive route requires the sole
Schedule C item to identify the taxpayer as proprietor, matching the primary
filer identity emitted by MeF. Spouse-owned or unspecified-owner businesses fail
closed. A prior top-level line 30 amount or an existing item line 30 is rejected
for this route. The source additionally affirms that all Schedule C gross income
is attributable to business use of the home, which is required for the bounded
line 8 calculation. Zero-deduction Form 8829 still retains and emits line 43
carryover. The old flat expense input is rejected. Form 1098's former full-box-1
routing to Form 8829 now fails explicitly because its mortgage-interest
allocation is not modeled. The input is registered for the 2025 filing graph.

The MeF descriptor was rewritten for native TY2025 v5.4 `IRS8829` order. It
requires proprietor name/SSN, recalculates every emitted line, and checks the
identified Schedule C reference and line 29. The PDF descriptor now projects
proprietor identity and every calculated line of the bounded rented-home route,
including the printed business percentages, line 15 limit, expense subtotal,
allowance, and next-year carryover. Its projection recalculates the source and
rejects mismatched amounts before printing.

## Bounded PDF correction

The earlier field audit corrected reversed area fields and several printed-line
positions. For the currently supported rented-home route, the descriptor now
maps business and total area to lines 1 and 2, percentages to lines 3 and 7,
indirect operating expenses to lines 18–23, the prior operating carryover to
line 25, and all computed limits and carryovers through line 44. Unsupported
owner-home fields, including mortgage interest and depreciation basis, remain
unmapped for this route. Focused field-name and projection cases are written,
but have not been run or visually inspected.

This extends the bounded rented-home PDF projection only. It does not make an
owned-home or another excluded route fileable, and the filled appearance is
still unverified.

## Remaining end-to-end boundaries

- The bounded path excludes owned homes, all mortgage interest and real estate
  taxes, casualty losses, depreciation, direct expenses, daycare, inventory
  storage, and multiple homes or businesses. These need distinct sourced paths,
  not an inferred zero expense in otherwise applicable returns.
- The one-business taxpayer-owned projection is written but has not yet passed
  the agreed consolidated test, XSD, filled-PDF, or IRS ATS acceptance gates.
  Multiple businesses, multiple homes, or non-home business income remain
  unsupported.
- Eligibility, non-duplication of home costs in Schedule C expenses, and the
  prior-year line 25 operating carryover are verified source facts, not yet
  reconciled to independent use records, expense detail, or a prior-year return.
  Schedule C lacks an owner field, so proprietor-to-business linkage is not
  independently checked.
- The native XML is written against v5.4 names and order but has not yet passed
  local XSD or IRS business-rule validation. The registered PDF projects the
  bounded rented-home lines and identity, but its widgets and actual filled
  appearance have not been validated.
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
