# Form 172 historical AMT absorption-base audit

October 8, 2026. Existing Form172 carry-history scope; no filing-ready checkoff.

The isolated candidate at `997b305dc78d071a97ece484bcb920fc34e62351` verifies annual cap arithmetic and chronological deduction allocation. It does not compute section172(b)(2) modified-income absorption or a surviving accepted carry balance. Its false qualification flags remain appropriate.

## Applicable-year base

The retained [2014 Form6251](https://www.irs.gov/pub/irs-prior/f6251--2014.pdf), page1 visually inspected, puts AMTI on line28, the exemption on line29 and income after that exemption on line30. Line6 is an itemized-deduction limitation adjustment, and line7 is the refund-of-taxes subtraction. A modern line number cannot select a historical operand.

The [2014 section55](https://www.govinfo.gov/content/pkg/USCODE-2014-title26/html/USCODE-2014-title26-subtitleA-chap1-subchapA-partVI-sec55.htm) distinguishes AMTI from taxable excess after the exemption. The [current IRM 4.11.11.10.3.1](https://www.irs.gov/irm/part4/irm_04-011-011) requires ATNOL reduction even without AMT liability, but its Form6251 line6 cross-reference is not a reliable historical field mapping. This audit resolves that mapping hazard, not every carry computation.

The [2014 instructions](https://www.irs.gov/pub/irs-prior/i6251--2014.pdf), page3 visually inspected, compute the annual limit from tentative lines1–27 with ATNOLD line11 zero and depletion refigured on that basis, then add the domestic production activities deduction. The candidate's complete historical component inventory, separate section199 addback and 90% arithmetic follow this annual-limit instruction. The exemption is not subtracted from that base.

## Absorption remains a distinct computation

[2014 section172(b)(2)](https://www.govinfo.gov/content/pkg/USCODE-2014-title26/html/USCODE-2014-title26-subtitleA-chap1-subchapB-partVI-sec172.htm) requires modified taxable income, excluding the loss year and later loss deductions, and a nonnegative result. Relevant modifications include capital losses, section1202, personal exemptions and section199; the ordinary loss-origin nonbusiness limit is not reapplied wholesale to an absorption year. Each affected income/deduction operand must be refigured for the applicable year and AMT basis.

[2014 section56(d)(1)(B)(ii)](https://www.govinfo.gov/content/pkg/USCODE-2014-title26/html/USCODE-2014-title26-subtitleA-chap1-subchapA-partVI-sec56.htm) additionally requires adjustments for the annual AMT limitation. Previously retained IRS memo20144201F distinguishes annual cap components from chronological loss consumption. Its ordinary2008 opening200 and WHBAA2009 opening100 against base100 example uses90/10, leaving110/90; that example has no capital or deduction refigures and cannot prove their implementation. The memo is not precedent.

The next implementation must independently reconstruct modified AMTI from retained annual operands, including capital/section1202 and AGI-dependent deduction refigures, and apply earlier-vintage consumption plus section56 limitations in order. It must reject incomplete operand inventories, inconsistent owners/years, unavailable openings and unsupported categories. It cannot derive surviving carry merely by subtracting allocated deduction from opening loss. Historical2013–2017 work does not establish post-TCJA80%/90% coordination, valid WHBAA elections, authentic sources, carryback availability, all intervening years or IRS acceptance.

## Retained evidence

Private `.state/research/board-execution-2026-10-07/form172-amt-absorption-base-audit-20261008-v1/` contains dated source manifests, original PDFs/HTML, extracted text, the two visually inspected page images and an independent complete runtime/scope audit. Pub536 was downloaded but not visually reviewed; no completed publication review is claimed. Root runtime stays frozen for full regression48127. No runtime edits or additional full test run were made for this authority audit.
