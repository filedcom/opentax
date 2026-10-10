# TY2025 Form8941 state and county premium limits

The single-plan source verifier and multiple-plan worksheets previously required
Albany, New York, and used annual premiums of 9,358/24,527. They now share the
complete IRS 2025 average-premium table: 3,091 published rows across the 50 states
and District of Columbia. County names retain the IRS spelling. States with an
explicit `All` row use that statewide pair for a nonempty supplied county;
other states require an exact published county. Unknown states/counties reject.

Hawaii remains in the retained table for source completeness but cannot enter a
2025 credit calculation: the instructions prohibit the credit for its health
plan years beginning after 2016. This is a published tax restriction, not an
arbitrary implementation exclusion. Other existing source, qualifying-plan,
employer, employee, payroll and credit-period restrictions remain in force.

Both employer review and employee records must agree with the lookup. Single
employee-only/family arrangements and multiple-plan monthly or partial-month
calculations use the applicable tier's amount before their existing contribution
and covered-period adjustments. A valid county with another county's amounts
rejects; externally supplied numbers cannot override the table. This work does
not authenticate SHOP availability, insurer invoices or employer location.

## Source provenance

- [2025 IRS instructions and Table 2025](https://www.irs.gov/instructions/i8941).
- [Archived 2025 instructions PDF](https://www.irs.gov/pub/irs-prior/i8941--2025.pdf).

The HTML table headings identify states; the extracted county rows map to their
postal codes in the checked-in 2025 data file. There are 51 state tables and 3,091
unique state/county keys. All 3,091 employee-only/family numeric pairs, including
their multiplicities, independently match text extracted from the archived PDF.
This paired-value check supplements the HTML state/county association; it does
not independently reparse that association from the PDF's three-column layout.

Retained HTML SHA-256:
`938a094f1ddb4fda5b99b7d38a757a16fc80374e67fff20bb8afec12ed96f9ae`.
The PDF digest, full source copies, extraction and verification report are in
`.state/research/form8941-rating-areas-2026-10-10/`.

## Verification scope

The table/calculator test executes all 3,090 non-Hawaii rows through the owned
employee-only Form8941 calculator and checks the premium cap and determined
credit. Fixed anchors distinguish Albany NY from Albany WY, Bronx, Travis,
Anchorage and statewide New Jersey/DC rates; unknown and Hawaii sources reject.

Complete public-entry cases cover Bronx employee-only, Travis mixed family tiers
and New Jersey reference-plan/list billing. They reconcile the filed credit and
PDF projection, with mutated table amounts, employee county and Hawaii claims
rejected at native preparation and PDF projection. No new filled-page visual
review is claimed by these projection tests. Full-route visual review and source
authenticity remain part of the open original parent.

Terminal checks: 94 existing end-to-end SHOP regressions, 18 calculator/native
checks, and three new geographic route checks passed (115 total). The calculator
checks cover every non-Hawaii table row. All three complete returns validate
against the full TY2025 v5.4 Return1040 schema; credits are $12,500, $20,112 and
$10,516 for NY, TX and NJ respectively. Independent decimal calculations agree
with final tax of $21,254, $30,112 and $46,582.

Three filled packets were generated (71 pages, 55 unique raster pages), but
visual inspection remains pending; generated pages are not counted as reviewed.
The native verification, arithmetic report and PDFs remain in the private
evidence directory above. Broader parent readiness tasks remain open.
