# TY2025 Form 8990 coverage boundary

Sources: [2025 Form 8990](https://www.irs.gov/pub/irs-prior/f8990--2025.pdf),
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8990--2025.pdf), and
checked-in TY2025 v5.4 `Shared/IRS8990/IRS8990.xsd`.

Status: Form 8990 filing is deliberately blocked. No test, local XSD,
filled-PDF, IRS business-rule, or ATS validation has been run for it.

The prior asserted-ATI source could make interest appear fully allowed without
reconciling tentative taxable income, NOL/QBI, depreciation, business interest
income, and other ATI components to the filed return. Both the tax node and
native MeF builder now reject that source before producing Form 8990. The
line-calculation and v5.4 tag map remain for a future return-reconciled source,
but they are not a filing route.

Positive Schedule C interest now requires an explicit small-business-exemption
source: all three prior-year gross-receipts amounts for a business existing all
three years, including required aggregation, affirmative non-tax-shelter
verification, and average gross receipts no higher than the TY2025 $31 million
threshold. The optional `subject_to_163j` flag no longer establishes eligibility
and is rejected. Nonexempt and unknown-status Schedule C interest fails before
net profit, SE tax, and QBI are computed. Unlinked upstream Form 1098 interest
also fails.

## Still blocked

- A positive line 31 changes the interest deductible on Schedule C, then
  self-employment tax and QBI. The former Schedule 1 other-income add-back did
  not recompute those items. The bounded calculator throws before filing if
  interest would be disallowed.
- Tentative taxable income, the ATI adjustments, and nonbusiness/pass-through
  exclusions are sourced assertions, not independently reconciled to final
  return lines and workpapers. No Form 8990 document can yet be produced.
- Prior-year interest carryforwards, partner/S-corporation excess items,
  floor-plan financing, rental interest, CFC groups, and multiple businesses
  need separate source models and Schedule A/B rows.
- The registered PDF descriptor still maps old raw amounts and does not fill the
  calculated form. Native XML has not passed the single agreed XSD/full test
  batch or the IRS ATS gate.

No compatibility layer, fallback serializer, or temporary add-back is included.
