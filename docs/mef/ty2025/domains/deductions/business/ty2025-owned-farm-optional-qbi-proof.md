# Owned optional-farm SE and Form 8995 source proof

The existing Schedule C/F and positive QBI parent tasks remain open. This proof covers actual ordinary MFJ proprietor sources with the farm optional method, actual external spouse W-2 wages, reviewed unrestricted at-risk/material-participation answers and complete current-year C/F inventory where a loss is entered.

## Calculation and allocation

[2025 Schedule SE instructions](https://www.irs.gov/instructions/i1040sse) permit the farm optional method where combined owner gross farm income is at most $10,860 **or** net farm profit is below $7,840. Optional earnings are two-thirds of gross farm income, capped at $7,240; actual farm income or loss remains in Schedule 1. Negative nonfarm income offsets optional earnings on Schedule SE line 4c. Each spouse uses that spouse's own actual issued wage sources and Social Security cap.

[26 CFR 1.199A-3(b)(1)(vi), 2025 edition](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol4/pdf/CFR-2025-title26-vol4-sec1-199A-3.pdf) attributes deductible SE tax in proportion to gross business income taken into account for the deduction. For the optional-farm owner, the implementation retains actual Schedule C line7 gross income and each Schedule F gross-income computation, allocates the actual owner's filed half-SE at cents, then subtracts those attributable amounts from each actual allowed business profit or loss. Optional deemed earnings do not replace QBI. Owner deductions never cross spouse identities. Largest gross-income row absorbs a cent residual deterministically; individual signed filed QBI rows round before aggregation. Ordinary nonoptional allocation behavior is preserved.

## Complete source cases

All cases retain an actual $176,100 external spouse W-2, employer EIN98-7654321 (distinct from every entered proprietor), and actual cash-method grain-farm income/expense records. All positive C sources are primary-owned. Farm owners/copies remain independently identified.

| Case | Farm gross / actual profit | SE tax | Half-SE | AGI | QBI deduction |
| --- | --- | ---: | ---: | ---: | ---: |
| Spouse farm profit with own wage cap | 3000 / 300 | 8536 | 4268 | 232132 | 11206 |
| Spouse farm loss with own wage cap | 900 / -300 | 8495 | 4248 | 231552 | 11090 |
| Same-owner C1000/farm | 3000 / 300 | 448 | 224 | 177176 | 215 |
| Same-owner C loss -300, gross500 | 3000 / 300 | 260 | 130 | 175970 | 0 |
| Same-owner C loss -1800, gross500 | 3000 / 300 | 0 | 0 | 174600 | 0 |
| Same-owner C1000 and two farms | 3000 / 300; 6000 / -600 | 1060 | 530 | 176270 | 34 |
| Exact gross eligibility boundary | 10860 / 7840 | 1249 | 625 | 184315 | 1643 |
| Below net-profit boundary | 10861 / 7839 | 1249 | 625 | 184314 | 1643 |
| Separate optional farm owners | T3000 / 300; S6000 / -600 | 564 | 282 | 176518 | 84 |

The C-loss cases retain filed Form8995 loss carryforwards130 and1500 respectively, without claiming accepted next-year import. The same-owner positive case attributes168 to farm/56 to C. The multiple-farm case attributes159/318/53; the gross-boundary case572.30/52.70; the fractional residual at10861 gross572.31/52.69. These positive row assertions and native/direct-PDF source conflicts are explicit tests. The ineligible gross10861/net7840 election rejects.

## Verification

Typed real-Poppler related check passed95/95, zero failed (1m13s), `/tmp/opentax-farm-optional-final.log`, SHA256 `384c53ed64f325ea8ba3919da38b027f46ecf32a0b7807ca46c4ba2eac3c607c`. Final focused check after adding explicit per-business allocation/carryforward assertions passed3/3 (35s), `/tmp/opentax-farm-optional-final-focus.log`, SHA256 `8cdde16dbf8fe8e5d93687da703f6f2379baffa334db70584dd4f643ef6148ac`. Both used read/write, run xmllint/deno/pdftotext/pdftoppm and network www.irs.gov permissions.

Nine complete source-backed native returns passed the locally pinned IRS TY2025 v5.4 full return XSD and produced flattened actual IRS PDFs,123 pages. Root rendered and visually inspected every page in contacts01–31, checking owner/name/TIN, actual farm losses, skipped PartI farm income under the election, PartII optional earnings, independent wage caps, Schedule1/2/1040 totals, filed QBI rows/loss carryforward, checkboxes, order and legibility. Artifacts are ignored under `.state/research/2026-10-06-owned-farm-optional-held` and `-rendered`. Held source/XML/PDF replay, all27 source/XML/PDF hashes, IRS template provenance and final full XSD check completed with terminal0:9 cases/123 reviewed pages (`/tmp/opentax-farm-optional-held-check.log`, SHA256 `4a3f87cfd0258b32ec6b9f3105c96be71587960654034124227a36ea47f6d393`).

An initial manual expected-tax diagnostic rounded total SE components together: correct filed separate line10/11 rounding gives448 rather than447,1060 rather than1059 and564 rather than563. Those expected worksheets were corrected before final proof. A related legacy manually prepared two-C/two-F test omitted the new actual C gross-income source field; it now retains the actual15000 gross per C source and passes the final95-check gate. Production source guards were not weakened.

## Remaining scope

This evidence does not prove prior-loss authenticity, source issuer authenticity, patron/health/retirement/other deduction combinations, high-income8995A optional-method filing, WOTC farm coexistence, fishing/nonfarm optional methods, all activity limits, durable accepted carryover ledgers, IRS business rules or IRS acceptance. Generic owner SE and ordinary C/F remain verified separately. Main integration and a full latest-head regression remain required before a broader readiness claim.
