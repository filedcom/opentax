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

## Geographic periods, farm and separate-owner routes

The follow-up public-entry replay holds enrollment, payroll, contribution
percentages and gross benefits fixed while changing the employer rating area.
It covers partial-year months, within-month eligibility events, monthly tier
changes, farm employment and two independently owned spouse businesses in
different states. A spouse's household mailing address does not replace the
employer's retained rating area. These remain synthetic sources; plan names and
marketplace identifiers are retained fixture references, not authenticated
state-specific SHOP availability.

| Route / rating area | Line 5 premium cap | Determined credit | Current use | AGI | Total tax |
| --- | ---: | ---: | ---: | ---: | ---: |
| Partial year / Anchorage AK | 16,550 | 8,275 | 7,724 | 88,544 | 13,462 |
| Partial month / Los Angeles CA | 43,952 | 21,976 | 21,976 | 188,606 | 31,311 |
| Tier changes / Albany WY | 22,163 | 11,082 | 11,082 | 204,735 | 45,757 |
| Farm / Travis TX | 25,411 | 12,706 | 12,706 | 150,983 | 29,061 |
| Independent spouses / Essex NJ + Anchorage AK | 31,503 + 37,394 | 15,752 + 18,697 | 9,078 | 131,000 | 19,917 |

All five typed route tests pass (715 ms execution after type checking).
All five complete returns pass the full local TY2025 v5.4 Return1040 XSD,
including two separate IRS8941 copies in the joint return. The partial-year
premium oracle directly applies 34 employee-months at 50%; the other cases
rescale each retained qualified worksheet row by its new tier rate, preserving
its percentage and enrollment fraction. This checks geographic propagation,
not an independent rederivation of the existing arrangement methods. Employee
counts, FTEs, wages, gross premiums and enrolled counts remain unchanged.

The route test also exercises the PDF descriptor's actual copy selection with
prepared Form3800 parts, checking owner SSN, employer EIN, cap and credit for
all six copies. Eighteen altered-source native preparations and eighteen PDF
projections reject stale Albany amounts, conflicting employee counties and
Hawaii claims, including alterations to either spouse's employer. The subsequent filled-packet review below completes this follow-up visual
evidence; the prior 71-page review remains separate. The farm fixture's receipt-character
qualification remains deferred under the existing Schedule F source finding.

Evidence is retained in `.state/research/form8941-geographic-routes-2026-10-10/`,
including complete source/pending records, XML, schema results and test output.
The broader Form8941, source authenticity and filing-ready parent tasks stay open.

## Complete period, farm and spouse packet review

The five original source-backed inputs were replayed through public preparation
and the production PDF builder at runtime `9aba2eee0`. All five XML files saved
with those PDFs pass the complete TY2025 v5.4 schema. Static output contains no
remaining AcroForm field tree or widget annotations.

All 122 pages were observed: partial-year 23, partial-month 23, tier-change 25,
farm 23 and independent spouses 28. Twenty-three contact sheets cover 90 unique
raster pages; the remaining 32 pages are exact RGB duplicates. All six Form8941
pages were additionally inspected at full size. Correct owner SSNs, employer
EINs, A/C checkboxes, employee/FTE counts, caps and determined credits remain
legible. Two spouse Forms8941, Schedule C and Schedule SE copies retain their
separate owners; Form3800 Part V retains both credit rows and their current use.

Independent decimal arithmetic reconstructs business profit from gross receipts,
wages and gross benefits reduced by the determined credit, then SE tax by owner,
half-SE deductions, AGI, QBI, ordinary tax, current credit use and final tax. All
five results match the table above. This arithmetic takes the separately checked
Form8941 determined credits as inputs; it does not independently authenticate
premiums or replace the arrangement-method qualification above. The partial-year
credit is determined at 8,275 with current use 7,724; spouse credits total 34,449
with current use 9,078. Gross-benefit deduction reductions use the determined
amounts in both cases. No accepted carryforward is claimed.

Existing qualifications remain: farm receipt classification22, skipped Form3800
Section B values26, name order/joint-name omission68, blank zero Form3800 TMT
fields76, and the five native Form6251 line1a omissions84. No new clipping or
overlap was observed. These findings were appended to their existing deferred
items, with no runtime repair or clean filing approval. Combined geographic
evidence is eight XSD-valid complete returns and 193 qualified reviewed pages.

The packet/copy/arithmetic/visual reports and checksums are retained with the
source evidence. CI for `fc4f0203d99279cc4a21efe4391391d3f46aa234` passed in
run `38037886745`; this packet-review update changes documentation only.
