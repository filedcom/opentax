# TY2025 W-2G source and attachment boundary

The [2025 IRS Publication 525](https://www.irs.gov/publications/p525) directs
Form W-2G box 1 gambling winnings to Schedule 1 line 8b and box 4 federal
withholding to Form 1040 line 25c. The
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) require
attaching W-2G when federal tax was withheld. Box 7 is additional winnings from
identical wagers, not a separate noncash-prize amount to add to box 1.

The source node now routes box 1 to Schedule 1 line 8b and AGI, and box 4 to
Form 1040 line 25c. Schedule 1 native XML uses the TY2025
`GamblingReportableWinningAmt` tag, and its PDF maps to the verified line 8b
field. Wrongly numbered legacy W-2G box keys are rejected by the strict source
schema, with no compatibility alias.

Withheld W-2G now has a bounded native `IRSW2G` route. The source requires the
2025 payer-issued form reference, payer name/control/EIN and structured US
address, winner name/SSN/address matching the taxpayer or the spouse on a joint
return, and the IRS standard/nonstandard code. Each positive-withholding source
creates one native document; Form 1040 line 25c must cover the sourced
withholding and the linked document IDs must match the withheld forms. This is
direct structured source input, not an alias for the old free-text payer
address. Missing or contradictory facts reject export. A no-withholding W-2G can
still report box 1 income without the attachment. The Form 1040 PDF path remains
fail-closed for positive W-2G withholding because the payer-issued W-2G PDF is
not mapped or bundled. Native XSD, business rules, full source-to-return tests,
and filled PDF review are still unrun, so this is not a filing-readiness claim.
