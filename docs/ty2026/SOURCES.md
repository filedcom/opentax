# Sources, versions, and refresh rules

| Material | Snapshot / authority | Use | Refresh trigger |
| --- | --- | --- | --- |
| IRS [TY2026 draft forms](https://www.irs.gov/downloads/irs-dft) | 57 draft form PDFs under `corpus/draft/`; five older-year draft URLs recorded `wrong-year` without local PDFs; hashes in manifest | Line topology, instructions printed on forms, PDF field work | Final form release or any draft revision. |
| IRS [2026 draft Schedule 8812 instructions](https://www.irs.gov/pub/irs-dft/i1040s8--dft.pdf) | `corpus/draft/i1040s8.pdf`, added 2026-09-27; hash and retrieval time in manifest | Credit Limit Worksheets A/B, Earned Income Chart/Worksheet, Part II-B source map | Final instructions or revised draft. |
| IRS [2026 draft Form 5695 instructions](https://www.irs.gov/pub/irs-dft/i5695--dft.pdf) | `corpus/draft/i5695.pdf`, 2026-09-27 snapshot; SHA-256 `1efab06c78f27ce81c7f3ee0335a91e7a195c2702f35d908609e4cfee0db4bf0` | Carryforward-only eligibility, line 2 credit limit worksheet, and credit priority | Final instructions or revised draft. |
| IRS [2026 draft Form 5329 instructions](https://www.irs.gov/pub/irs-dft/i5329--dft.pdf) | `corpus/draft/i5329.pdf`, SHA-256 `55f531aad380ec1ac63cc697e0f5d0cd603c503e18cebd9fb04b0bd46633aa35` | Code 1 direct Schedule 2 line 5 treatment, SIMPLE IRA 25% branch, and Form 5329 filing gates | Final instructions or revised draft. |
| IRS [2026 draft Form 8606 instructions](https://www.irs.gov/pub/irs-dft/i8606--dft.pdf) | `corpus/draft/i8606.pdf`, 2026-09-27 snapshot; SHA-256 `d2717dedf7b5f7025fbbec73f1be0093adbe306cdb6e97b2e32f8a54b8e51878` | IRA basis, conversion, Roth ordering, repayment worksheets, and per-owner filing contract | Final instructions or revised draft. |
| IRS [2026 draft instruction directory](https://www.irs.gov/downloads/irs-dft) | 25 verified 2026 instruction PDFs under `corpus/draft/`; individual hashes in manifest and statuses in `instruction-coverage.csv` | Source-backed implementation of the wider TY2025 form surface | Final instructions, new drafts, or a revised combined booklet. |
| IRS [2026 draft Schedule H instructions](https://www.irs.gov/pub/irs-dft/i1040sh--dft.pdf) | `corpus/draft/i1040sh.pdf`, 2026-09-27 snapshot; SHA-256 `685fa1486b3a6e5712c5552da3ef0eb5f7b245dec3d3f28e642e37efe15dbf1e` | Household payroll thresholds, FUTA sections, and Schedule 2 line 17a route | Final instructions or revised draft, especially credit-reduction rates. |
| IRS [2026 draft Schedule B instructions](https://www.irs.gov/pub/irs-dft/i1040sb--dft.pdf) | `corpus/draft/i1040sb.pdf`, added 2026-09-27; hash and retrieval time in manifest | Interest filing triggers, payer adjustments, tax-exempt interest, and Part III disclosures | Final instructions or revised draft. |
| IRS [TY2026 ATS index](https://www.irs.gov/e-file-providers/tax-year-2026-form-1040-series-and-extensions-modernized-e-file-mef-assurance-testing-system-ats-information) | 13 PDFs under `corpus/ats/`; scenarios 13 and 14 are listed without links as of snapshot | Source-backed e2e fixtures and attachment inventory | Every ATS page update. These are explicitly draft scenarios. |
| IRS [TY2026 MeF versions](https://www.irs.gov/tax-professionals/tax-year-2026-modernized-e-file-schema-and-business-rules-for-individual-tax-returns-and-extensions) | Public page lists v1.0 May 28, v2.0 July 2, v3.0 Aug 13, v4.0 Sep 24; v3 ATS starts Oct 13 and v4 ATS starts Nov 1; production date TBD | Choose XSD/rule target, track rollout | Every MeF release memo. |
| User [Drive MeF folder](https://drive.google.com/drive/folders/1JGK9Tp-9jPX7Cg1xFFKPVBRIYJFvyIlR) | `IMF_05-28-2026_Release-2.zip`, SHA-256 `8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4`; contains 2026v1.0 1040 XSD and CSV rules | Baseline schema/rule research only | Obtain v4 or newer IMF package through registered e-Services before final XML/rule acceptance. |
| IRS [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) | Final PDF in `corpus/authorities/` | 2026 indexed amounts and tax brackets | Later legislation or IRS correction. |
| IRS [Rev. Proc. 2026-15](https://www.irs.gov/pub/irs-drop/rp-26-15.pdf) and [Rev. Proc. 2025-16](https://www.irs.gov/pub/irs-drop/rp-25-16.pdf) | Final PDFs in `corpus/authorities/` | Passenger auto depreciation limits for cars placed in service in 2026 and 2025 | Later correction; retain placed-in-service year in the calculation. |
| IRS [Notice 2025-67](https://www.irs.gov/pub/irs-drop/n-25-67.pdf) | Final PDF in `corpus/authorities/` | Retirement plan limits | Later correction. |
| IRS [Rev. Proc. 2025-19](https://www.irs.gov/pub/irs-drop/rp-25-19.pdf) | Final PDF in `corpus/authorities/` | 2026 HSA contribution limits | Later correction. |
| IRS [Rev. Proc. 2025-25](https://www.irs.gov/pub/irs-drop/rp-25-25.pdf) | Final PDF in `corpus/authorities/` | 2026 premium-tax-credit applicable percentages | Later correction. |
| HHS [2025 poverty guidelines](https://public-inspection.federalregister.gov/2025-01377.pdf) | Final public PDF in `corpus/authorities/` | Expected 2026 Form 8962 FPL amounts, subject to confirmation in 2026 Form 8962 instructions | Final 2026 Form 8962 instructions. |
| IRS [Publication 505 (2026)](https://www.irs.gov/pub/irs-prior/p505--2026.pdf) | Final PDF in `corpus/authorities/` | Cross-check 2026 deductions, credits, and estimated-tax calculations | Later correction or final form instructions. |
| IRS [2026 W-2/W-3 instructions](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf) | Final PDF in `corpus/authorities/iw2w3--2026.pdf`; hash in manifest | Box 12 TP/TT amounts and box 14b occupation codes for Schedule 1-A | Replacement 2026 instructions or W-2 correction. |
| IRS [Form 1099-DIV](https://www.irs.gov/pub/irs-prior/f1099div--2024.pdf) and [instructions](https://www.irs.gov/pub/irs-prior/i1099div--2024.pdf) | January 2024 continuous-use PDFs in `corpus/authorities/`; hashes in manifest | Dividend box meanings; pair with 2026 Schedule B and 1040 instructions for return routing | Any continuous-use revision or new 2026 1040/MeF instruction. |
| IRS [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf) | Prior-year comparator in `corpus/authorities/`; hash in manifest | Direct box 2a capital-gain distribution exception and line 7b conditions, checked against the 2026 draft form | Replace as authority when 2026 Form 1040 instructions are published. |
| IRS [2026 Form 1099-B](https://www.irs.gov/pub/irs-prior/f1099b--2026.pdf) and [instructions](https://www.irs.gov/pub/irs-prior/i1099b--2026.pdf) | Final PDFs in `corpus/authorities/`; hashes in manifest | 2026 broker transaction boxes, including box 3 collectibles/QOF and box 12 basis reported | Later correction or replacement. |
| IRS [2026 Form 1099-DA](https://www.irs.gov/pub/irs-prior/f1099da--2026.pdf) and [instructions](https://www.irs.gov/pub/irs-prior/i1099da--2026.pdf) | Final PDFs in `corpus/authorities/`; hashes in manifest | Digital asset proceeds, reported basis, term, and optional aggregate methods | Later correction or replacement. |
| IRS [2026 Form 1099-R](https://www.irs.gov/pub/irs-prior/f1099r--2026.pdf) and [instructions](https://www.irs.gov/pub/irs-prior/i1099r--2026.pdf) | Final PDFs in `corpus/authorities/`; hashes and addition time in manifest | New boxes 7a–7d and 8a/8b, optional 2026 QCD code Y, IRA/pension source mapping | Later correction or replacement. |
| IRS [2025 Form 8949 instructions](https://www.irs.gov/pub/irs-prior/i8949--2025.pdf) | Prior-year comparator in `corpus/authorities/`; hash in manifest | Codes, grouping, and Form 8949/Schedule D reporting decisions alongside the 2026 draft form | Replace as authority when 2026 Form 8949 instructions are published. |
| IRS [Notice 2026-10](https://www.irs.gov/pub/irs-drop/n-26-10.pdf) and [IRB 2026-29](https://www.irs.gov/pub/irs-irbs/irb26-29.pdf) | Final PDFs in `corpus/authorities/` | January–June and July–December mileage rates | Later correction. |
| IRS [2026 SALT correction](https://www.irs.gov/forms-pubs/correction-to-state-and-local-income-tax-deduction-amount-in-the-2026-form-1040-es) | Public correction page | Schedule A cap and phaseout | Final Schedule A/instructions or later correction. |
| IRS [2026 FICA guidance](https://www.irs.gov/taxtopics/tc751) | Public page; 2026 wage base $184,500 | W-2, Schedule SE, 8959, 4137, 8919 | Revised IRS guidance. |
| IRS [TY2026 1040 accepted forms XLSX](https://www.irs.gov/pub/irs-efile/tax-year-2026-accepted-forms-schedules-individual-tax-returns-extensions.xlsx) and [forms/attachments XLSX](https://www.irs.gov/pub/irs-efile/tax-year-2026-forms-attachments-1040-series-extensions-09242026.xlsx) | Local XLSX under `corpus/mef/` | Form support and attachment matrix | Any dated replacement. |

The Drive ZIP was downloaded into ignored `.state/research/docs/` and inspected
locally. It includes `1040x_Schema_2026v1.0.zip` (758 XSD entries) and
`1040_Business_Rules_2026v1.0.csv` (2,173 rows: 1,958 Active, 113 Disabled,
55 Deleted, 44 New, 3 Verbiage Change). The repository is public, so raw
e-Services packages and verbatim rule sets are **not committed**. Re-download
from the Drive file when needed and verify the SHA above. The May package also
contains TY2025v5.4; that does not make its TY2026v1.0 artifacts current.

The v1 XSD includes `IRS1062Payment` in `ReturnData1040.xsd`. The September
draft 1040 also references Schedule 3-A; v1 predates that draft. This is a
concrete reason to acquire and inspect the current schema package before
writing final field maps or claiming MeF support.

## Source hierarchy for implementation

1. Current final IRS form/instructions and current MeF release package.
2. Draft form/instructions with draft status retained in the test citation.
3. Rev. Proc./Notice for indexed figures, checked against any later change.
4. ATS scenario PDFs for facts and topology; do not treat blank or inconsistent
   computed lines as authoritative expected totals.
5. TY2025 implementation only as a code reference, never as proof of a 2026
   value, field, or rule.

Do not silently carry a 2025 rule forward. Record each unchanged decision with
the 2026 source used to verify it.
