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
rejected at native preparation and PDF projection. Projection tests are supplemented by the qualified filled-page review below;
source authenticity and wider full-route coverage remain open.

Terminal checks: 94 existing end-to-end SHOP regressions, 18 calculator/native
checks, and three new geographic route checks passed (115 total). The calculator
checks cover every non-Hawaii table row. All three complete returns validate
against the full TY2025 v5.4 Return1040 schema; credits are $12,500, $20,112 and
$10,516 for NY, TX and NJ respectively. Independent decimal calculations agree
with final tax of $21,254, $30,112 and $46,582.

All 71 filled pages were reviewed through 14 contact sheets covering 55 unique
raster pages and 16 exact RGB duplicates; each of the three Form8941 pages was
also inspected at full page size. Credit amounts, A/C answers, EIN, employee/FTE
counts and source-to-final-tax joins agree. Fields remain legible without newly
observed clipping. Static outputs contain no remaining field tree or widgets.

This is a qualified review: Form3800 fills skipped Section B intermediate lines
(future26); Forms3800/8995 reverse the displayed name order (future68); and all
three native Form6251 roots omit the deduction element printed on PDF line1a
(future84). These existing deferred findings are repeated, not repaired. No
filing-ready or IRS acceptance claim follows from the schema or visual checks.
The native verification, arithmetic report and PDFs remain in the private
evidence directory above. Broader parent readiness tasks remain open.

CI for head `6549597ed85412db590a610857d4b73c56b58436` passed in run
`38037406827`; the subsequent review update changes documentation only.
