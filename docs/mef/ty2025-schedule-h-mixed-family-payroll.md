# TY2025 Schedule H mixed family payroll

The existing Schedule H task requires actual family relationships to coexist with unrelated household workers. The earlier public source allowed only unrelated workers in a complete FICA/FUTA inventory; its separate one-child/spouse withholding route also imposed an unsupported $1,000 quarter minimum and required a spouse household W-2 to be the return's sole W-2.

[2025 Publication 926, pages 5–9](https://www.irs.gov/pub/irs-prior/p926--2025.pdf) excludes wages paid to a spouse or child under 21 from FICA and FUTA, including the FUTA quarter threshold. Agreed federal withholding still belongs on Schedule H. An unrelated student under 18 has a separate FICA exclusion and remains part of the FUTA inventory. Parent exceptions and relationship/age changes during the year require separate source proof and remain guarded.

The complete FICA-only and unemployment inventories now retain unrelated, child and spouse rows with their actual classifications. Family rows reconcile relationship, birth/marriage continuity, employee/employer identity, payroll, annual/quarter wages, W-2 and agreed W-4 withholding. A family row with no withholding can remain in the complete inventory without inventing a W-2 filing requirement. Family wages never enter the FICA sums, FUTA eligible quarters or per-worker $7,000 cap; their actual federal withholding contributes to Schedule H line 7. The employer SSN is required when family workers appear, with unique employee IDs, family recipient SSNs, payroll and W-2 references.

Native and direct PDF export reconcile retained payroll, filer identity and Schedule 2 line 9. A spouse must match the actual spouse on a joint return and exactly one household W-2 by recipient and employer EIN; other genuine W-2s can coexist. The legacy spouse route reconciles Form 1040 wages and withholding to all W-2s, and both family paths reconcile Form 1040 other taxes to the actual Schedule 2 computation rather than equating all other taxes to Schedule H alone. Missing, duplicate, substituted or conflicting sources fail export.

## Retained source and calculation proof

The unchanged mixed-child source at `/tmp/opentax-scheduleh-mixed-before-source-oct6.json` failed the pre-change public schema because its child relationship was not representable. Diagnostics are retained in `/tmp/opentax-scheduleh-mixed-before-result-oct6.json` and the matching script/log. The new saved `mixed-fica` packet uses those exact inputs; source facts were compared directly and were not tuned to obtain a pass.

| Saved source | FICA | Federal withholding | FUTA | Schedule H / Schedule 2 / Form 1040 line 23 | Refund |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mixed unrelated and child, below FUTA quarters | 428 | 300 | 0 | 728 | 2,317 |
| Mixed unrelated and child, eligible quarter exactly $1,000 | 490 | 300 | 24 | 814 | 2,231 |
| Family child retained with no withholding | 428 | 50 | 0 | 478 | 2,567 |
| Joint unrelated, child and spouse payroll | 428 | 550 | 0 | 978 | 4,926 |
| Legacy spouse household W-2 plus primary's other W-2 | 0 | 250 | 0 | 250 | 5,654 |
| Child-only agreed withholding, each quarter $750 | 0 | 150 | 0 | 150 | 2,895 |

Single wages/withholding are $75,000/$11,000; joint wages/withholding are $80,000/$11,250. In the FUTA case only $4,000 of unrelated annual wages enters the FUTA wage base, even though the child's $5,000 wages remain in the complete inventory. The student's wages enter FUTA but not FICA. The mixed joint source retains both child and spouse rows and the actual spouse's household W-2.

Six final source-backed returns are retained at `/tmp/opentax-scheduleh-mixed-family-evidence-v5-oct6`. Root inspected all 31 pages, including four full-size Schedule H pages; review `/tmp/opentax-scheduleh-mixed-family-root-review-oct6.json`. Each final PDF has zero widgets and no logical form fields, consistent with the existing flattened packet output. All 18 source/XML/PDF originals are privately preserved with hashes at `/tmp/opentax-scheduleh-mixed-family-root-preservation-oct6.json`.

The focused source gate passed 2/0 in `/tmp/opentax-scheduleh-mixed-family-focus-v5-oct6.log`. Independent replay of the six actual saved sources passed exact pending/prepared pending/carryforwards/origins/source/PDF, XML differing only in `ReturnTs`, and full local TY2025v5.4 XSD: `/tmp/opentax-scheduleh-mixed-family-new6-raw-oct6/report.json`. The ten prior saved payroll returns (53 pages) passed unchanged source replay in `/tmp/opentax-scheduleh-mixed-family-prior10-raw-oct6/report.json`: seven newer archives are exact; the three October 4 archives retain their already-qualified historical pending/PDF differences and compare against the preserved 530f39141 source replay. No prior archive was regenerated or rewritten.

Initial test-context type errors and an incorrect one-page expectation for the FUTA Schedule H packet remain in earlier diagnostic logs. They are not production passes. The final eleven-module standard gate passed **54/0/0 ignored (1m12s)** in `/tmp/opentax-scheduleh-mixed-family-standard-v4-oct6.log`, session82877 terminal0. It includes explicit rejection of positive Social Security or Medicare withholding on the spouse’s FICA-excluded household W-2. A combined final replay of all sixteen retained returns is running before the integration seal. These are reviewed synthetic structured sources, not authenticated birth, marriage, payroll, issuer or signed W-4 originals. Wider parent exceptions, split-year relationships/ages, state/rate combinations, authentication, latest full regression and IRS acceptance requirements remain open.
