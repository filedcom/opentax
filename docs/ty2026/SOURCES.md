# Sources, versions, and refresh rules

| Material | Snapshot / authority | Use | Refresh trigger |
| --- | --- | --- | --- |
| IRS [TY2026 draft forms](https://www.irs.gov/downloads/irs-dft) | 57 local 2026 PDFs under `corpus/draft/`; five older-year draft URLs recorded `wrong-year` without local PDFs; hashes in manifest | Line topology, instructions printed on forms, PDF field work | Final form release or any draft revision. |
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
