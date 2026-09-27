# TY2026 MeF ATS fixture inventory

Source: [IRS TY2026 ATS index](https://www.irs.gov/e-file-providers/tax-year-2026-form-1040-series-and-extensions-modernized-e-file-mef-assurance-testing-system-ats-information),
captured 2026-09-27. The manifest pins each linked PDF's exact URL and hash.
These are **draft** scenarios. The index lists 1040 scenarios 13 and 14 but
provides no PDF link in this snapshot. Recheck the index before release.

| Product | Linked scenarios in corpus | Implementation use |
| --- | --- | --- |
| Form 1040 | `ats/1040-scenario-{01,02,03,04,05,06,12}.pdf` | Required end-to-end fixture set for `f1040:2026`: all source inputs, forms, attachments, calculated lines, XML and PDF. Scenario 4 includes Schedule 3-A and refundable-credit forms; scenario 12 has a broad business-form/attachment surface. |
| Form 4868 | `ats/4868-scenario-07.pdf` | Inventory only. No full `f4868:2025` product definition exists in the current catalog. |
| Form 1040-SS | `ats/1040ss-scenario-{08,09}.pdf` | Inventory only; separate product scope. |
| Form 1040-NR | `ats/1040nr-scenario-{01,02,03}.pdf` | Inventory only; separate product scope. |

## Fixture extraction rule

For each 1040 scenario, make a fixture record with scenario PDF hash and page,
source facts, attached forms, calculations, expected line values, MeF
business-rule expectations, and PDF fields. Keep three distinct columns:
**printed source fact**, **independently calculated expectation**, and
**application result**. Some scenario PDFs contain blank or inconsistent
computed amounts; a printed number is never sufficient evidence by itself.
Verify forms and attachment sequence against the current 2026 XSD and the
accepted-form XLSX in `corpus/mef/`. Record any unsupported form as a visible
gap in the coverage ledger, rather than declaring the scenario passed from the
1040 total alone.

Add dedicated fixtures for 2026 changes that ATS does not fully exercise:
nonitemizer charitable deduction, work-authorization/dependent questions,
Schedule 3-A eligibility and amount, Form 1062 deferral, refundable adoption,
8962 income above 400% FPL and full excess-APTC repayment, and the July 1
mileage-rate boundary. Test the 2025 path in the same run to catch year leakage.

The [scenario 1 fixture plan](ATS-SCENARIO-01.md) records page-level source
facts, the independent calculation chain, and the Schedule H/Form 5695/Form
1062 attachments still needed for that scenario.
The [scenario 2 fixture plan](ATS-SCENARIO-02.md) maps its 13 pages and
the statutory-employee W-2 → Schedule C route, half-year mileage, noncash
donation, EIC opt-out, and the Schedule A versus standard-deduction conflict.
The [Schedule E contract](SCHEDULEE-GRAPH.md) identifies the Schedule E pages
in scenarios 3 and 6; scenario 6's partnership row is an explicit Part II
fixture gate.
The [Schedule F contract](SCHEDULEF-GRAPH.md) extracts scenario 3's populated
farm lines and independently derives its $4,207 net profit before an
end-to-end fixture is accepted.
The [scenario 3 fixture plan](ATS-SCENARIO-03.md) now maps all 18 packet
pages, including the $11,908 Form 4835 farm rent and the elected Schedule SE
farm optional method. Its missing source evidence and blank computed lines
remain explicit fixture gates.
The [scenario 4 fixture plan](ATS-SCENARIO-04.md) maps all 18 pages of its
HOH/W-2/dependent-care/EIC/AOTC/CTC packet. It identifies the incomplete Form
8862 selections, missing AOTC institution EIN and 1098-T evidence, unsupported
moving expense, Form 2441 box B question, and credit-order/3-A gates.
The [scenario 5 fixture plan](ATS-SCENARIO-05.md) maps the five-page W-2 and
refund-split packet, including the Form 8888/1040 checkbox conflict and the
November-versus-December Form 8888 revision difference.
The [scenario 6 fixture plan](ATS-SCENARIO-06.md) maps all 10 pages and the
$5,700 provisional income bridge from W-2 wages, W-2G winnings, and the
Schedule E partnership row. It records the dependent standard deduction,
overtime, missing K-1, and 2026 gambling-line gates.
The [scenario 12 fixture plan](ATS-SCENARIO-12.md) maps its 37-page
Schedule C/SE, Form 4562-B, §179D deduction, and §45X credit-transfer packet.
It preserves the conflicting Form 3800 tax base and registration numbers,
missing signed binary, Form 7205 indexed-rate issue, and blank apprenticeship
section as filing gates.
