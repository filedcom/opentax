# TY2025 EIC with finalized nonpassive shareholder basis losses

## Existing parent and calculation

This advances the board's existing EIC investment-income/return-wide reconciliation task and Form7203 source parent. [2025 Publication596 Worksheet1](https://www.irs.gov/publications/p596) lines11–13 concern passive activity income and losses. A materially participated S-corporation ordinary loss is excluded from that passive computation; it also is not self-employment earned income. Its independently basis-limited allowed loss still affects ScheduleE, Schedule1 and AGI. Tax-exempt interest remains investment income. The $11,950 boundary applies without subtracting this nonpassive loss.

The actual original public probe computes EIC384, wages5000, AGI2500, investment11950 and an allowed shareholder loss2500, then native export rejects every negative K1 box. Diagnostic `/tmp/opentax-eic-owned-loss-before-oct6.log` retains that contradiction. The final source check now replays the existing complete Form7203/QBI/Schedule1/Form1040 projection before permitting a negative ordinary box1 with owned current source records and verified material participation. Each joint owner retains its independent limitation. An explicit passive classification contradicting the nonpassive ledger rejects. Other negative K1 boxes, unresolved passive losses, classification-only claims and prior reduced-debt sources keep their existing guards.

This source consistency proof does not authenticate K1 issuers, bank records, IRS account records or accepted filing history. No existing retained source or basis allocation is changed.

## Independent complete-return cases

| Case | Wages | Tax-exempt investment income | Allowed nonpassive loss | Basis-suspended loss | AGI | EIC/refund |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current formal note, at limit | 5000 | 11950 | 2500 | 1500 | 2500 | 384 |
| Same loss, above limit | 5000 | 11951 | 2500 | 1500 | 2500 | 0 |
| Formal/open accounts both fully repaid | 5000 | 11950 | 1500 | 2500 | 3500 | 384 |
| Joint independently limited primary/spouse | 10000 | 11950 | 3600+4000 | 400 | 2400 | 649 |

All four have zero taxable income/tax and no withholding; allowed losses remain current negative QBI with zero QBI deduction. The IRS EIC table's5000–5050 row is384 and joint10000–10050 row649. The source gate verifies wages/investment/AGI independently and rejects omitted Form7203/QBI, altered allowed-loss joins, contradictory passive facts and a forged positive EIC above the investment limit at native and direct PDF export. A standalone nonpassive classification cannot bypass the original K1 loss guard.

## Verification and retained artifacts

Focused typed gate1/0(17s) includes all four complete native/fullTY2025v5.4XSD/PDF returns and conflicting-source cases, `/tmp/opentax-eic-owned-loss-focused-v3-oct6.log`. Standard five-module `deno task test` EIC compatibility is terminal30passed/0failed/0ignored(1m24s), `/tmp/opentax-eic-owned-loss-main-standard-oct6.log`.

Original final archive `/tmp/opentax-eic-owned-loss-final-oct6` retains actual public input/filer, normalized wholepending, preparedpending, carryforwards, origins, independent expected values, XML and PDF. Raw replay `/tmp/opentax-eic-owned-loss-main-raw-oct6.ts` reads those saved inputs without fixture factories; terminal report `/tmp/opentax-eic-owned-loss-main-raw-oct6/report.json` verifies four packets/34pages exact wholepending/preparedpending/carry/origins/source/PDF, XML onlyReturnTs and fullXSD. All34pages visually reviewed, plus full-size joint1040/E showing distinct losses and649EIC; root review `/tmp/opentax-eic-owned-loss-root-review-oct6.json`. All12original files independently copied/hash-compared to `.state/research/eic-owned-basis-loss-oct6-preserved`, manifest `/tmp/opentax-eic-owned-loss-root-preservation-oct6.json`.

The first typed run stopped on four type errors; the second reached three positive packets but failed the joint expected649 because the new fixture omitted required spouse resident-status evidence. Their logs and partial `/tmp/opentax-eic-owned-loss-review-oct6` archive remain diagnostic-only and untouched. Final fixture supplies that evidence; production residency guards were not relaxed. Earlier shareholder packet archives remain untouched and no new exact prior-packet replay is claimed here.

Wider passive loss allocation, mixed source families, external issuer/eligibility proof, IRS business rules, accepted acknowledgments and the broader board parents remain open.

## Three-column current-debt coexistence

The next existing7203 phase adds an actual two-written-note/open-account positive EIC packet. Wages5000 remain earnedincome; tax-exempt11950 remains investmentincome, despite allowed4000nonpassive loss and AGI1000. EIC/refund384. Focus1/0(25s) validates all five complete returns and missingbasis/QBI/alteredloss/passive-conflict exports. Actual retained originalfour plus newfive replay9/76pages exactsource/pending/preparedpending/carry/origins/PDF/nativeonlyReturnTs/fullXSD, `/tmp/opentax-eic-three-column-main-raw-oct6/report.json`. New8pages visuallyreviewed;15archivefiles privatelypreserved, four prior original packets untouched. Main debt compatibility remains separately gated; broader passive and external authentication requirements remain open.
