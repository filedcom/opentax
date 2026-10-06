# Owned Schedule C/F source and packet proof — October 6, 2026

Actual reviewed Schedule C, cash-grain Schedule F and issued owner W-2 records now retain deterministic source-reference ordering across graph execution and replay. This repairs a false source/row mismatch when the graph contributed Farm before Business but replay reconstructed Business before Farm. A pure regression reverses both business and wage arrays and requires identical owner results.

Six complete public returns cover separate proprietors and Social Security wage caps, two subthreshold activities whose combined owner earnings trigger SE, same-owner C loss/F profit, distinct-owner C loss/F profit, same-owner C profit/F loss, and positive source cents. Every return passes the complete cached TY2025 v5.4 Return1040 XSD with real xmllint and renders through the actual PDF builder. Loss returns retain a complete reviewed Form 461 source inventory; no source guard was relaxed.

| Case | SE tax | Half-SE | AGI | QBI deduction | Pages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Separate proprietors, spouse wage cap | 9549 | 4775 | 271325 | 19045 | 17 |
| Same owner, C250 plus F250 | 70 | 35 | 465 | 0 | 13 |
| Same owner, C loss300 plus F800 | 70 | 35 | 465 | 0 | 13 |
| Primary loss100, spouse F500 | 70 | 35 | 365 | 0 | 13 |
| Same owner, C60000 plus F loss10000 | 7065 | 3533 | 46467 | 2993 | 13 |
| Separate proprietors, positive cents | 9549 | 4775 | 271326 | 19045 | 17 |

All 86 pages were rendered with real Poppler and visually inspected on all 22 contact sheets. Owner names/TINs, C/F profits and loss marks, distinct SE copies, wage-cap ownership, attributable half-SE, QBI rows, Additional Medicare/NIIT, Form1040 totals and attachment order reconcile. No clipping or overlap observed. Every packet is flattened, with zero AcroForm fields or widget annotations. Final PDF hashes match the visual manifest after the final test run.

Ten prepared source/total conflicts reject both native and direct PDF exports: farm proprietor, profit, ID, EIN, unreviewed other QBI adjustments, spouse half-SE, QBI row, W2 recipient, AGI and QBI deduction.

Final isolated typed regression: **22 passed, 0 failed (1m21s)**. It includes this route, existing owner public returns, pure owner calculation, Form461 source review, joint patron compatibility and review scope. Log `/tmp/opentax-owned-cf-final-proof.log`, SHA256 `81641a0bdebc608437a5d6bb9b764900b7e93bf8827f815eb4fd925e59e4eaea`. Earlier focused complete-packet run passed10/10. Ignored local evidence directory: `.state/research/2026-10-06-owned-farm-se`; includes source inputs, pending graph, complete XML/PDF, page images and manifest.

[2025 Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) require combining the individual's business/farm earnings and separate owner forms. [Form8995 instructions](https://www.irs.gov/instructions/i8995) require attributable business adjustments. These packets prove ordinary materially participating C/F, positive source cents and integer losses, without other QBI deductions or prior carryovers. Optional methods, high-income QBI, negative half-cent rounding, special farm sources, external source authentication, IRS business rules and acceptance remain open. The broader existing parent is not closed.
