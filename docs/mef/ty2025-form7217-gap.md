# TY2025 Form 7217 property-distribution gap

Form 7217 has registered native `IRS7217` and December 2024 PDF projections for
one partnership and distribution date per document. The public source checks
Part I against Part II, routes a narrow sourced section 731 cash gain through
Form 8949, and limits PDF rows to the form's 30 printed property slots.

## Section 732(c) basis allocation

The [IRS Form 7217 instructions](https://www.irs.gov/instructions/i7217)
require the property basis in Part II column (e) to total Part I line 10. For a
nonliquidating distribution, section 732(a)(2) limits aggregate property basis
to remaining outside basis after cash; a liquidation uses that remaining basis
under section 732(b). The [IRS partnership publication](https://www.irs.gov/publications/p541)
orders section 732(c) allocation by inventory/receivables before other
property. A decrease within a class first consumes unrealized depreciation and
then reduces the remaining assigned bases proportionally.

The existing liquidating basis-increase route allocates excess to appreciation
and then FMV. The new route calculates and checks whole-dollar **basis
decreases** for multiple section 732 properties in both nonliquidating and
liquidating distributions, using explicit class, partnership basis, FMV,
partner basis, and a section 732(c) workpaper reference. The property totals
must match line 10, and the same source reaches native XML and PDF. Positive
and tamper fixtures are authored for the later bulk validation pass.

The workpaper reference and K-1 property amounts are caller supplied; retained
source bytes and accepted K-1 provenance are not yet bound. Marketable
securities under section 731(c), section 751(b) exchanges, section 737 gain,
section 732(d)/(f) adjustments, multi-date outside-basis rollforward,
continuation past 30 rows, filled PDF review, IRS business rules, and ATS
acceptance remain open.
