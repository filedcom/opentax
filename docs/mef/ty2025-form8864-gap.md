# TY2025 Form 8864 direct-producer source and filing boundary

The [December 2025 IRS instructions](https://www.irs.gov/instructions/i8864) and
[official form](https://www.irs.gov/pub/irs-pdf/f8864.pdf) retain the section
40A small agri-biodiesel producer credit for eligible 2025 fuel sales or use.
Lines 7 and 8 apply $0.10 per gallon through June 30 and $0.20 per gallon after
June 30. The older biodiesel, renewable-diesel and SAF credits expired for fuel
sold or used after 2024; a fiscal-year pass-through can still allocate an older
credit. Direct producer line 9 must be included in income, with Form 3800 Part
III line 1l reporting. Its inclusion is subtracted when figuring AMT on Form
6251 line 3. A section 6418 transfer election for a second-half credit needs
pre-filing registration.

The public `f8864` source is a bounded, direct Schedule C **sale after June 30,
2025** route for a registered small producer. It records Form 637 registration,
facility capacity no more than 60 million gallons, no group attribution,
distinct production batches and sale invoices, eligible agri-biodiesel
feedstock, North American feedstock origin, documented qualifying buyer fuel
use, dated sales, and no more than 15 million credited gallons. It excludes
transfer elections, pass-through credits and recapture events. The sourced line
9 is reconciled to one taxpayer-owned Schedule C producer's line 6 other income;
this bounded join requires that line 6 contain only the credit inclusion.

The source emits one nonpassive Form 3800 Part III line 1l current credit, Part
V source row, standard-credit tax limit and a signed Form 6251 line 3 adjustment
equal to negative line 9. The native `IRS8864` descriptor uses the exact TY2025
v5.4 tags for lines 8, 9 and 11 and requires sourced Form 3800 and Form 6251
documents. The official one-page PDF and its Form 3800/6251 projections are
registered. Both representations reject source, Schedule C, credit and AMT
mismatches. The schema was inspected in an **ignored local IRS v5.4 cache** at
`.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS8864/IRS8864.xsd`;
it is not tracked or reproducible from this repository alone.

The checked-in TY2025 v3.0 MeF business rule `F8864-012` rejects the pre-July
line 7 native quantity and amount, despite the December 2025 IRS instructions
allowing that credit and the cached v5.4 XSD containing its tags. First-half
sales remain closed pending a current MeF rule resolution. Transfer elections,
fiscal-year/K-1 recipients, seller self-use and controlled-group attribution
also remain outside the bounded source. Reviewed registration, feedstock,
capacity, invoice and buyer-use references are retained source facts; the return
graph does not inspect their document bytes. The positive source/native/PDF fixtures ran in the full regression at `a268f60c`. Later full-return evidence below extends the packet path; the next full regression remains pending.


## October 6 full-return export repair

A source-backed full-return fixture exposed two assembly defects: `IRS8864` demanded document IDs during discovery before IDs existed, and Form 3800/PDF required an explicit tax-use allocation that public intake could not retain. Discovery now validates source facts before linking; the linked pass still requires exactly one Form 3800 and Form 6251 document. The prepared FIFO tax-use calculation supplies the applied credit. If an explicit allocation is retained, it must still agree with that calculation.

The `single-agri-biodiesel-producer-credit` review fixture executes $75,000 wages plus $10,000 producer sales and $500 credit income. The $500 allowed credit reaches Schedule 3 and Form 1040 line 20; Form 6251 line 3 subtracts $500 for AMT. The whole return validates against the local TY2025 v5.4 XSD. Its 23-page filled packet was rendered and visually inspected page by page, including all nine Form 3800 pages, owner identity, Schedule C income, SE deduction, QBI and refund totals. Form 8864 line 8 prints 2,500 gallons at $0.20 and $500 on lines 8/9/11. Native/PDF/source focused checks passed 27/27; additional wrong allocation and AMT negatives are included in the integrated check.

Artifacts are ignored local evidence under `.state/research/ty2025-filled-pdf-review/2026-10-05-form8864-direct-producer/`. XML SHA256: `5d87e817e289b5881b6ef39c6d7e1f67018eecc75c1c219cee1289e042fa58c2`; PDF SHA256: `aaca5fc825a3c2d586d23620851a3a1d68131a6f9b445ec402da00c927f60a7a`. Page images are `/tmp/opentax-8864-review/page-01.png` through `page-23.png`. These synthetic facts and packet checks do not authenticate producer records, resolve first-half MeF business rules, or establish ATS acceptance. Wider routes remain open.
