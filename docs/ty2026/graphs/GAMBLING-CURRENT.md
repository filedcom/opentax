# Current TY2026 casual gambling route

The `gambling.claim` source connects a reviewed annual winnings/loss ledger and
current W-2G copies to Schedule 1, AGI, withholding, deduction choice, child tax
and the internal draft packet. Business and partnership gambling still require
their own activity/limitation routes; this is not complete ATS scenario 6.

## Sources and reuse

The pinned January 2026 [W-2G](../corpus/authorities/fw2g--2026.pdf) and
[instructions](../corpus/authorities/iw2g--2026.pdf) describe the issued fields.
The [current IRS instructions](https://www.irs.gov/pub/irs-pdf/iw2g.pdf) were
rechecked October 16, 2026. The shared 2025 field schema, copy/nonstandard
review checks, duplicate checks and sum functions are reused; its year schema,
calculation and output behavior remain unchanged.

[2026 Publication 505](https://www.irs.gov/publications/p505), What's New,
and [IRC 165(d)](https://uscode.house.gov/us/usc/119-118/t26/s165/) establish
`min(90% of losses, winnings)`. The publication is also
[pinned](../corpus/authorities/p505--2026.pdf). The 2026 Schedule A prints the
result on 17a, summed into 17z before the overall deduction resolver. The
[current section 68](https://uscode.house.gov/us/usc/119-118/t26/s68/) applies
after other deduction limitations.

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
are the explicitly prior-year comparator for W-2G withholding on **line 25c**
and attachment of issued copies when tax was withheld. The old ATS research
note's line 25b route was incorrect. The [draft 2026 Form 8615 instructions](https://www.irs.gov/pub/irs-dft/i8615--dft.pdf),
line 2, use the directly connected portion of Schedule A line 17z when the
child itemizes; the standard-deduction candidate uses no itemized loss.

## Record reconciliation

Each ledger entry identifies the owner, date, location, wager type, amount and
supporting record. Winnings include unreported winnings and reviewed noncash
value/payer-paid tax. The caller must review winning-wager basis and affirm
that losses have not been netted into the reported winnings. Loss entries
represent actual losses, not total stakes or an annual net loss. Cents are
summed before final whole-dollar rounding.

Every current W-2G belongs to exactly one winnings row for its owner. The
ledger cannot be below the linked issued amounts. Box 7 records additional
identical-wager winnings; its explicit review determines whether box 1 already
includes them. Cross-copy nonoverlap is also reviewed. Reporting thresholds
do not exempt unreported winnings. Current copies retain replacement references;
superseded copies cannot also appear in the current inventory. Duplicate source
references, PDF hashes/files and identified payer transactions are rejected.

Only the taxpayer and, on joint returns, the current spouse can own these
records. State/local W-2G withholding joins the Schedule A tax ledger, retaining
issued-copy identity and the income-versus-sales-tax election. Federal box 4
joins Additional Medicare withholding on Form 1040 line 25c. It is neither
W-2 wage withholding nor Form 1099 withholding.

Losses require an itemized inventory review even when the standard deduction
wins. Gambling can coexist with supported educator, mortgage and other expense
sources. The child-tax review explicitly identifies gambling as the only
supported directly connected itemized deduction; its amount is derived from
the same source ledger and omitted from the standard-deduction candidate.

## Draft output and verification

Schedule 1 prints line 8b and its reconciled totals; Schedule A prints the
allowed line 17a, total 17z and selected deduction. Withheld W-2Gs require the
original issued PDF bytes, filename and SHA-256. Draft assembly checks the
hash and parses an unencrypted PDF, then returns the original bytes separately
in `sourceAttachments`, with the page count. It does not regenerate, flatten
or stamp the issued copy. This verifies retention and parseability, not issuer
or signature authenticity. Generated return pages remain static drafts.

The ordinary synthetic case has $50,510 wages and $2,500 winnings, taxable
income $36,910 and tax $4,183. A separate $30,000-win/$30,000-loss case has
$80,510 AGI, a $27,000 deduction, $53,510 taxable income and $6,488 tax.
The cap boundary ($10,000 winnings/$20,000 losses) deducts $10,000, not $9,000.
Tests also cover joint ownership, duplicates/replacements, missing copies,
cent rounding, state/local taxes, child tax and combined Medicare withholding.
All 783 tests in the 2026 directory pass, along with 66 focused typed tests
(including existing 2025 W-2G and 2026 child-tax regressions) and 137 unit
checks. A final date-consistency guard also passes the focused suite.
Three packets (14 generated pages) were rendered and inspected with no fields
or annotations. The original withheld-copy bytes were compared unchanged.

Professional/partnership gambling, shared winners and nominee allocations,
foreign cases, remaining expense classifications and session/basis adjustments
beyond reviewed ledger facts remain to implement. Public filing, current MeF
serialization and IRS ATS acceptance remain open.
