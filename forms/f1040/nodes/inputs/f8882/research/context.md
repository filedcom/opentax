# Form 8882 — TY2025 direct Schedule C employer

Authority:
[Form 8882 (Rev. December 2017)](https://www.irs.gov/pub/irs-pdf/f8882.pdf),
[IRS TY2025 employer-provided childcare credit guidance](https://www.irs.gov/businesses/small-businesses-self-employed/employer-provided-child-care-credit-tax-year-2025-and-earlier),
and the locally cached TY2025 IMF v5.4 `IRS8882.xsd`.

The prior public input accepted two asserted expense totals and immediately sent
the resulting 25%/10% estimate to Schedule 3. The replacement input is a bounded
source for one taxpayer-owned, materially participating Schedule C business. It
accepts one current-year contract with a qualified childcare facility, one
childcare resource/referral contract, or both. Each contract identifies the
provider, EIN, contract, payment-ledger row, date, gross expense, and the exact
Schedule C Part V expense description. Facility contracts also record licensing,
principal use, employee access, fair-market-value and noncapital expenditure
evidence. Both paths require nondiscrimination and confirmation that the
credited portion is not deducted or used for another credit. The two
contract/expense identities must be distinct.

`calculateForm8882` derives official lines 1–7: line 2 is 25% of facility
expense, line 4 is 10% of referral expense, line 5 is zero for this direct
employer, line 6 is the sum, and line 7 is the smaller of line 6 and $150,000.
The bounded route requires whole-dollar line credits and excludes a source above
the cap until the deduction-reduction allocation is sourced. The Schedule C
crosswalk requires an exact net Part V row for each contract: gross expenditure
less that contract's credit. It binds the business reference, taxpayer SSN and
material participation to the prepared return.

The node emits no Schedule 3 output. Form 8882's line 7 belongs on Form 3800
Part III line 1k, subject to the general-business-credit limitation. The current
Form 3800 graph has no typed Form 8882 direct-employer source, so the MeF and
PDF descriptors are staged and unregistered. The shared attachment guard must
recognize these new contract fields before this source shape is merged. Capital
facility property, employer-operated facilities, controlled groups, pass-through
line 5, cap allocation, prior facility recapture, and spouse-owned Schedule C
businesses need separate source and return joins.
