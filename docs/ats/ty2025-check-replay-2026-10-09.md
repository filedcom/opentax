# TY2025 ATS public-entry check replay — October 9, 2026

The eight retained partial Form 1040 fixtures were replayed through the public return entry point, followed by native preparation only when the graph had no error diagnostics. No source answers were supplied to bypass a guard. This expands the existing ATS matrix with reproducible per-field observations; it does not complete an ATS scenario.

**Selected observations: 29 match / 13 differ / 12 not produced, out of 54 (54% matching).** These are calculation checks chosen from retained printed amounts, source arithmetic and provisional interpretations. They are not an enumerated IRS business-rule set or a representative sample; matching values do not prove native/PDF output or accepted transmission.

**Updated engineering estimate: about 60% of individual ATS checks, uncertainty range45–75%.** This replaces75% after the public-entry and preparation replay exposed how much earlier evidence was component-only. The estimate is judgment across the broader required checks, not29/54 re-labeled as an IRS pass rate. Later deductions/credits are heavily represented here; most identity, attachment and IRS-rule checks are not.

| Scenario | Match | Different | Not produced | Public/native preparation | Required source copies |
| --- | ---: | ---: | ---: | --- | ---: |
| 1040-01 | 3 | 0 | 0 | native-blocked | 7 |
| 1040-02 | 0 | 0 | 3 | graph-blocked | 7 |
| 1040-03 | 0 | 0 | 6 | graph-blocked | 9 |
| 1040-04 | 2 | 0 | 0 | partial-prepared | 7 |
| 1040-05 | 4 | 0 | 0 | partial-prepared | 9 |
| 1040-08 | 11 | 0 | 0 | native-blocked | 3 |
| 1040-12 | 6 | 7 | 1 | native-blocked | 8 |
| 1040-13 | 3 | 6 | 2 | graph-blocked | 6 |

The source inventory contains56 form copies across these packets. Scenarios4 and5 prepare only `IRS1040` and `IRSW2`: two-document partial packets cannot satisfy their seven- and nine-document source inventories. Scenarios2/3/13 stop on graph errors. Scenarios1/8/12 stop on native source reconciliation. No XSD, new PDF or IRS acknowledgment is claimed by this replay.

Existing blockers remain: missing filing status in2/3; payroll evidence in1; incomplete credits and statements in4/5; QCD/payer/recipient facts in8; health/QBI, deduction and partnership-basis conflicts in12; stale deduction/tax limits and missing credit inputs in13. The newly observed Scenario8 native recipient-SSN guard is recorded in `future_todo` and left unmodified.

## Reproduce

```sh
deno run --allow-all forms/f1040/e2e/ats/ty2025-check-replay.ts /tmp/ats-check-replay.json
```

The replay reports differences instead of changing the retained targets. Missing output is distinct from a calculated zero, and printed targets are kept separate from derived/provisional ones. The JSON includes source URLs, required source-document inventories, exact graph diagnostics, native preparation results and each observation.

## Verification

The ATS directory regression passed61 tests with zero failures. After native-preparation reporting was added, the final two report checks passed with zero failures; those two are not added again to61. They verify absent-versus-zero handling, all eight scenario identities, retained deduction/credit conflicts, blocked graphs, and partial document reporting. No tax runtime or existing source fixture changed. Exact commands, runtime version, source/artifact digests and the earlier/full versus final/focused scope are retained in `.state/research/board-execution-2026-10-08/ats-public-check-replay-checkpoint.json`.

## Per-check observations

### 1040-01

[IRS source packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf). Required source copies: 1040, W-2, W-2, Schedule 2, Schedule 3, Schedule H, 5695.

Preparation: **native-blocked** — Error: Schedule H FICA-only export needs employee payroll source

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 42470 | 42470 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| `f1040.line25a_w2_withheld` | 2713 | 2713 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| `schedule2.line9_household_employment` | 474 | 474 | match | source-arithmetic: Schedule H: 3,100 × 12.4% rounded + 3,100 × 2.9% rounded |

### 1040-02

[IRS source packet](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-2-12012025.pdf). Required source copies: 1040, W-2, W-2, Schedule 1, Schedule A, Schedule C, 8283.

Preparation: **graph-blocked** — Resolve graph diagnostics before preparation

Graph diagnostics: start: missing filing status; standard_deduction: missing filing status; form8960: missing filing status.

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 8513 | not produced | not-produced | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| `f1040.line25a_w2_withheld` | 1164 | not produced | not-produced | source-arithmetic: Sum of issued W-2 box 2 amounts |
| `schedule1.line3_schedule_c` | 26979 | not produced | not-produced | source-arithmetic: Schedule C: statutory receipts29,513 less expenses2,534 |

### 1040-03

[IRS source packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf). Required source copies: 1040, 1099-R, Schedule 1, Schedule 2, Schedule D, Schedule E, Schedule F, Schedule SE, 4835.

Preparation: **graph-blocked** — Resolve graph diagnostics before preparation

Graph diagnostics: start: missing filing status; standard_deduction: missing filing status; form8960: missing filing status.

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line5a_pension_gross` | 53778 | not produced | not-produced | printed-source: 1099-R p.4 box1 |
| `f1040.line5b_pension_taxable` | 43100 | not produced | not-produced | printed-source: 1099-R p.4 box2a |
| `f1040.line25b_withheld_1099` | 3405 | not produced | not-produced | printed-source: 1099-R p.4 box4 |
| `schedule1.line6_schedule_f` | 3251 | not produced | not-produced | source-arithmetic: Schedule F pp.13–14:8,111 less4,860 |
| `schedule2.line4_se_tax` | 827 | not produced | not-produced | source-arithmetic: Farm optional election: rounded2/3 ×8,111 earnings; filed SE component tax |
| `schedule1.line15_se_deduction` | 414 | not produced | not-produced | source-arithmetic: Half of filed827 SE tax, rounded |

### 1040-04

[IRS source packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-4-10212025.pdf). Required source copies: 1040, W-2, Schedule 3, 3800, 8835, 8936, 8936 Schedule A.

Preparation: **partial-prepared** — Preparation of a partial fixture does not establish required-source completeness, XSD, PDF or IRS acceptance

Prepared native roots: IRS1040, IRSW2.

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 36014 | 36014 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| `f1040.line25a_w2_withheld` | 4581 | 4581 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |

### 1040-05

[IRS source packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf). Required source copies: 1040, W-2, Schedule 1, Schedule 3, 2441, 8862, 8863, Schedule EIC, Schedule 8812.

Preparation: **partial-prepared** — Preparation of a partial fixture does not establish required-source completeness, XSD, PDF or IRS acceptance

Prepared native roots: IRS1040, IRSW2.

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 31232 | 31232 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| `f1040.line25a_w2_withheld` | 1754 | 1754 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| `f1040.taxpayer_blind` | true | true | match | printed-source: Form1040 p.2 blindness mark |
| `f1040.digital_assets` | false | false | match | printed-source: Form1040 p.2 digital-assets No |

### 1040-08

[IRS source packet](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf). Required source copies: 1040, 1099-R, 1099-R.

Preparation: **native-blocked** — Error: 1099-R 1 positive issued copy needs recipient SSN

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line5a_pension_gross` | 20300 | 20300 | match | printed-source: Code G 1099-R gross distribution |
| `f1040.line5b_pension_taxable` | 10300 | 10300 | match | printed-source: Code G 1099-R taxable distribution |
| `f1040.line5c_pension_rollover` | true | true | match | printed-source: Form1040 p.2 line5c |
| `f1040.line6a_ss_gross` | 1000 | 1000 | match | printed-source: Cover sheet Social Security benefits |
| `f1040.line7a_cap_gain_distrib` | 7500 | 7500 | match | printed-source: Cover sheet REIT capital-gain distribution |
| `f1040.line9_total_income` | 17800 | 17800 | match | provisional-source-interpretation: Source-backed provisional interpretation; printed QCD unresolved |
| `f1040.line12a_standard_deduction` | 17350 | 17350 | match | provisional-source-interpretation: MFS taxpayer age72; QCD/source questions unresolved |
| `f1040.line15_taxable_income` | 450 | 450 | match | provisional-source-interpretation: 17,800 less17,350 under provisional interpretation |
| `f1040.line24_total_tax` | 0 | 0 | match | provisional-source-interpretation: Provisional qualified-gain return; not printed acceptance target |
| `f1040.line25b_withheld_1099` | 2555 | 2555 | match | printed-source: Code G 1099-R box4 |
| `f1040.line35a_refund` | 2555 | 2555 | match | provisional-source-interpretation: Provisional zero-tax return; QCD unresolved |

### 1040-12

[IRS source packet](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf). Required source copies: 1040, Schedule 1, Schedule 2, Schedule C, Schedule SE, 7206, 7217, W-2.

Preparation: **native-blocked** — Error: Form 8995 positive filing needs one identified Schedule C business and exact Schedule 1/1040 source reconciliation

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 100836 | 100836 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line8_additional_income` | 24328 | 24328 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line9_total_income` | 125164 | 125164 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line10_adjustments` | 2719 | 1719 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line11_agi` | 122445 | 123445 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line12a_standard_deduction` | 15000 | 15750 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line15_taxable_income` | 107445 | 103173.2 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line16_income_tax` | 18634 | 17612 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line23_other_taxes` | 3438 | 3438 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line24_total_tax` | 22072 | 21050 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line25a_w2_withheld` | 14444 | 14444 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line37_amount_owed` | 7628 | 6606 | different | printed-source: Form 1040 pp. 2–3 |
| `schedule1.line15_se_deduction` | 1719 | 1719 | match | printed-source: Schedule SE p.10 line13 |
| `schedule1.line17_se_health_insurance` | 1000 | not produced | not-produced | printed-source: Form7206 printed deduction; eligibility/source records incomplete |

### 1040-13

[IRS source packet](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf). Required source copies: 1040, Schedule 3, 6251, 8911, 8911 Schedule A, W-2.

Preparation: **graph-blocked** — Resolve graph diagnostics before preparation

Graph diagnostics: f8911: compute() threw for node "f8911": Form 8911 needs regular tax and tentative minimum tax to limit the personal credit.

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 31620 | 31620 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line11_agi` | 31620 | 31620 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line12a_standard_deduction` | 30000 | 31500 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line15_taxable_income` | 1620 | 120 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line16_income_tax` | 162 | 11 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line20_nonrefundable_credits` | 162 | not produced | not-produced | printed-source: Form 1040 pp. 2–3 |
| `f1040.line24_total_tax` | 0 | 11 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line25a_w2_withheld` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line34_overpayment` | 609 | 598 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line35a_refund` | 609 | 598 | different | printed-source: Form 1040 pp. 2–3 |
| `schedule3.line6j_alt_fuel_vehicle_refueling` | 162 | not produced | not-produced | printed-source: Schedule3 line6j; printed stale tax limit remains unresolved |

