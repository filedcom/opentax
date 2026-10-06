# Source-backed senior deduction with independent owner health and QBI

This bounded return-wide ordering repair supports the existing independent MFJ Schedule C health family with one or two qualifying seniors, full or phased senior deductions, and the existing business-tip/health limit route. It does not add a tax branch, scalar health/QBI input or broader source-authentication claim.

## Defects and source repair

The independent-health wrapper required a business-tip QBI payload for every positive Form1040 line13b, including senior-only deductions. The wrapper now permits an absent tip payload when the actual source-derived tip payload is absent, still compares retained owner health and QBI tip sources exactly, and runs the real native Schedule1A reconciliation. The existing health core, own profit/halfSE/plan joins and ordinary/joint QBI calculations remain intact.

The first labeled negative confirmed that changing retained `general.taxpayer_dob` from1950 to1970 was accepted when derived Form1040 and Schedule1A age flags remainedtrue. Native validation compared those derived projections but did not replay their source. The new positive-senior source check reuses the existing age and timely-valid-SSN helpers to reconcile actual retained general DOB/age/SSN/issuance facts with each claimed senior. Both helpers are moved unchanged into a pure module with existing index exports retained; they import no runtime tax node. Their function bodies were independently compared with the base and are identical apart from whitespace.

The health core continues to require the actual general source, so deleting that source also rejects. Existing descriptor-only native callers without a public general packet retain their prior contract. This proof covers actual independent-health public returns with retained sources; it does not claim universal source authentication or completion of broader senior-source paths. Death-before-age65, independent-health foreign-income combinations and other wider parent boundaries remain open.

## Official rules and filed ordering

The [2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), pages110 and35, require birth before January2,1961 and an employment-valid SSN issued by the return due date including extensions for the enhanced deduction. Married claimants file jointly; the maximum is6000 per qualifying person, with the MFJ MAGI threshold150000. Each spouse's reduction and the filed senior worksheet reconcile to the actual income after owned halfSE/health deductions. The additional age-based standard deduction is separate. Tests use the actual IRS Tax Table or Tax Computation Worksheet for income tax, and source-derived SE for total tax. The public DOB boundary January1/January2,1961 independently changes both the enhanced and age-adjusted standard deductions.

| Public source case | AGI | Own health total | Senior | Tips | Standard deduction | QBI income cap | QBI deduction | Taxable income | Income tax | Total tax |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| one-full |103302|8220|6000|0|33100|64202|12840|51362|5688|22644|
| both-full |103302|8220|12000|0|34700|56602|11320|45282|4956|21912|
| one-phase |182392|8220|4056|0|33100|145236|1258|143978|21503|22478|
| both-phase |182392|8220|8112|0|34700|139580|1258|138322|20259|21234|
| tips-phase |178526|12086|4288|1000|33100|140138|285|139853|20596|21571|

Each return retains independently owned public C receipts/issued NEC, employee W2 when applicable, regular owner SE and actual established premium/month/plan inventory. The filed health total reduces Schedule1/AGI before senior MAGI. Form8995 line11 subtracts the actual standard deduction and all Schedule1A deductions; each business's QBI also retains its own reviewed health and business-tip exclusions. All five native returns contain two actual Form7206 copies and the appropriate senior/tip Schedule1A parts.

## Tests and artifacts

- `/tmp/opentax-owner-health-senior-full-source-final.log`: terminal6/0, five real public-source/native/full-local-XSD/PDF positives plus the DOB boundary and45 labeled mutation variants checked through both native and PDF paths.
- `/tmp/opentax-owner-health-senior-compat-final.log`: terminal176/0 (2m13s): existing general, senior/native/PDF, foreign senior, independent health, qualified-tip health, mixed C/F tips and standalone Pub974 import compatibility.
- `/tmp/opentax-owner-health-senior-source-evidence`: five new source/XML/PDF packets and all95 rendered pages. All PDFs reopen with zero AcroForm fields and Widget annotations. All95 pages were reviewed at contact-sheet overview; all five senior worksheet pages, both actual health copies and tip/QBI page were enlarged for amount/identity/placement review.
- `source-xml-pdf-render-manifest.json` SHA256 `7a4b40b059a3c016ae5757cfc41464b14c10e525124e93685da6ce7186d481bf` records packet hashes and page counts.
- `original-artifact-comparison.json`: all five source JSON and PDF files are byte-identical to the retained root positives; all five XML files differ only in `ReturnTs`. The15 retained original artifacts under `/tmp/opentax-owner-health-senior-evidence` remain unchanged.

The historical isolated negative failure is retained in `/tmp/opentax-owner-health-senior-negative-audit.log`; extraction type-check fixes are recorded in the first repair log. No meaningful original mutation was deleted, and the source rejects are strengthened for both spouses. These focused results do not replace the pending full-regression result or establish parent completion, external authentication or IRS acceptance.
