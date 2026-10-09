# TY2025 ATS public-entry check replay — October 9, 2026

The eight retained partial Form 1040 fixtures were replayed through the public return entry point, followed by native preparation only when the graph had no error diagnostics. Scenario13 now uses a separately labeled current-law reconstruction with independently sourced tax limits; its original incomplete-input fixture and all printed targets remain unchanged. This expands the existing ATS matrix with reproducible per-field observations; it does not complete an ATS scenario.

**Selected observations: 41 match / 12 differ / 1 not produced, out of 54 (76% matching).** These are calculation checks chosen from retained printed amounts, source arithmetic and provisional interpretations. They are not an enumerated IRS business-rule set or a representative sample; matching values do not prove native/PDF output or accepted transmission.

**Updated engineering estimate: about 60% of individual ATS checks, uncertainty range45–75%.** This replaces75% after the public-entry and preparation replay exposed how much earlier evidence was component-only. The estimate is judgment across the broader required checks, not41/54 re-labeled as an IRS pass rate. Later deductions/credits are heavily represented here; most identity, attachment and IRS-rule checks are not.

| Scenario | Match | Different | Not produced | Public/native preparation | Required source copies |
| --- | ---: | ---: | ---: | --- | ---: |
| 1040-01 | 3 | 0 | 0 | native-blocked | 7 |
| 1040-02 | 3 | 0 | 0 | native-blocked | 7 |
| 1040-03 | 6 | 0 | 0 | native-blocked | 9 |
| 1040-04 | 2 | 0 | 0 | partial-prepared | 7 |
| 1040-05 | 4 | 0 | 0 | partial-prepared | 9 |
| 1040-08 | 11 | 0 | 0 | native-blocked | 3 |
| 1040-12 | 6 | 7 | 1 | native-blocked | 8 |
| 1040-13 | 6 | 5 | 0 | partial-prepared, six native documents | 6 |

The source inventory contains56 form copies across these packets. Scenarios4 and5 prepare only `IRS1040` and `IRSW2`: two-document partial packets cannot satisfy their seven- and nine-document source inventories. Scenarios2/3 stop on graph errors. Scenarios1/8/12 stop on native source reconciliation. Scenario13 prepares all six source-form roots; its separate packet passes local XSD and has six observed PDF pages, with presentation qualifications. No IRS acknowledgment is claimed.

Existing blockers remain: QBI/cooperative reconciliation in2 and issued-recipient identity in3; payroll evidence in1; incomplete credits and statements in4/5; QCD/payer/recipient facts in8; health/QBI, deduction and partnership-basis conflicts in12; printed deduction/tax conflicts and packet presentation qualifications in13. The newly observed Scenario8 native recipient-SSN guard is recorded in `future_todo` and left unmodified.

## Reproduce

```sh
deno run --allow-all forms/f1040/e2e/ats/ty2025-check-replay.ts /tmp/ats-check-replay.json
```

The replay reports differences instead of changing the retained targets. Missing output is distinct from a calculated zero, and printed targets are kept separate from derived/provisional ones. The JSON includes source URLs, required source-document inventories, exact graph diagnostics, native preparation results and each observation.

## Verification

The updated complete ATS directory regression passed **62 typed tests, zero failures**. It retains the original missing-limit and stale-printed-limit rejection cases, and adds a current-law six-document return with independent numerical expectations. No tax runtime changed. The earlier61-test run and focused2-test follow-up remain historical evidence in `ats-public-check-replay-checkpoint.json`; the new run, packet hashes and qualifications are retained in `ats-scenario13-current-law-checkpoint.json` under the same private execution directory.

### Scenario13 current-law reconstruction

The [2025 Form1040 instructions](https://www.irs.gov/instructions/i1040gi) give the joint standard deduction31,500. With issued wages31,620 and no other amounts on this packet, taxable income is120. The [2025 Tax Table, page2](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) gives11 for the100–124 MFJ row. The issued Form6251 has no other AMT adjustments:120 plus the31,500 deduction addback gives31,620 AMTI, below its137,000 exemption, so tentative minimum tax is0. The [Form8911 instructions, line8](https://www.irs.gov/instructions/i8911) require the AMT form even without AMT owed. The charger gives300 tentative credit, limited to11; final tax is0 and withholding/refund609.

`scenario104013CurrentLawInput` supplies those independent11/0 limits. The actual graph recomputes and the PDF projectors reconcile them against Form1040, Schedule3 and Form6251. It does not use engine output as its own target or replace the issued162 expectation. The printed30,000 deduction and162 tax/credit remain unresolved IRS-answer conflicts; even the printed1,620 taxable amount falls in a Tax Table row of161, not162. This is a current-law reconstruction, not approval to alter an ATS answer key.

Native roots are IRS1040, IRS1040Schedule3, IRS6251, IRS8911, IRS8911ScheduleA and IRSW2. The six-page generated PDF contains1040 pp1–2, Schedule3, required6251 p1,8911 and its ScheduleA; unused6251 PartIII is omitted and the issued W-2 remains a retained source/native copy. All pages were visually observed; zero AcroForm fields/widgets remain. No signature, production transmitter credential, business-rule validation or accepted acknowledgment is supplied.

The rendered packet is **not approved for complete presentation parity**: zero1040 line24 and8911 line8 are blank;8911/ScheduleA and the native header have primary-only names while1040/Schedule3 identify both spouses. These findings are retained only in `future_todo` (zero presentation and the existing identity review item); no deferred code was changed. Amount, property date/address/GEOID and credit joins reconcile. Artifacts: `.state/research/ats13-current-law-2026-10-09/`.

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

Preparation: **native-blocked** — Error: Form 8995 positive filing needs one identified Schedule C business and exact Schedule 1/1040 source reconciliation

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 8513 | 8513 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| `f1040.line25a_w2_withheld` | 1164 | 1164 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| `schedule1.line3_schedule_c` | 26979 | 26979 | match | source-arithmetic: Schedule C: statutory receipts29,513 less expenses2,534 |

### 1040-03

[IRS source packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf). Required source copies: 1040, 1099-R, Schedule 1, Schedule 2, Schedule D, Schedule E, Schedule F, Schedule SE, 4835.

Preparation: **native-blocked** — Error: 1099-R 1 positive issued copy needs recipient SSN

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line5a_pension_gross` | 53778 | 53778 | match | printed-source: 1099-R p.4 box1 |
| `f1040.line5b_pension_taxable` | 43100 | 43100 | match | printed-source: 1099-R p.4 box2a |
| `f1040.line25b_withheld_1099` | 3405 | 3405 | match | printed-source: 1099-R p.4 box4 |
| `schedule1.line6_schedule_f` | 3251 | 3251 | match | source-arithmetic: Schedule F pp.13–14:8,111 less4,860 |
| `schedule2.line4_se_tax` | 827 | 827 | match | source-arithmetic: Farm optional election: rounded2/3 ×8,111 earnings; filed SE component tax |
| `schedule1.line15_se_deduction` | 414 | 414 | match | source-arithmetic: Half of filed827 SE tax, rounded |

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

Preparation: **partial-prepared** — Current-law reconstruction with six native documents; printed-answer, presentation and acceptance qualifications above remain.

Prepared native roots: IRS1040, IRS1040Schedule3, IRS6251, IRS8911, IRS8911ScheduleA, IRSW2.

| Pending field | Target | Actual | Result | Basis / source location |
| --- | ---: | ---: | --- | --- |
| `f1040.line1a_wages` | 31620 | 31620 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line11_agi` | 31620 | 31620 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line12a_standard_deduction` | 30000 | 31500 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line15_taxable_income` | 1620 | 120 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line16_income_tax` | 162 | 11 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line20_nonrefundable_credits` | 162 | 11 | different | printed-source: Form 1040 pp. 2–3 |
| `f1040.line24_total_tax` | 0 | 0 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line25a_w2_withheld` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line34_overpayment` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| `f1040.line35a_refund` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| `schedule3.line6j_alt_fuel_vehicle_refueling` | 162 | 11 | different | printed-source: Schedule3 line6j; printed stale tax limit remains unresolved |

## October 9 visual source correction for scenarios 2 and 3

Fresh official packet renders show page2 marks that text extraction missed:
Scenario2 selects MFJ and digital-assets No; Scenario3 selects Single and
digital-assets Yes. The earlier assertions that these fields were blank were
wrong. Both input fixtures now carry the printed selections, with regression
assertions. No printed numerical target or production tax calculation changed.

The unchanged54-observation replay now produces nine additional matching
amounts (41 matches,12 differences,1 missing); both graph diagnostic lists are
empty. Native preparation remains blocked: Scenario2 requires the identified
ScheduleC/QBI reconciliation, while Scenario3 reaches the recipient-SSN guard.
The latter is added to the existing deferred recipient-identity item, with no
implementation. Wider source completeness and all required documents remain
open. The broad technical estimate stays60% (45–75% range), because these nine
selected arithmetic matches do not prove full native/PDF or IRS-rule coverage.

The covers and page2 of both official packets were rendered at1500px and
visually inspected. Private PDFs, four renders, replay JSON and regression log:
`.state/research/ats-source-recheck-2026-10-09/`. Source SHA-256:

| Scenario | SHA-256 |
| --- | --- |
| 2 | `1d94fce66edb816fe780e532a88d998617eb20d9edc3cf9a36355fa0c5236689` |
| 3 | `29fb04a95cb926bf9157c9e8f5b4c35c806ec83dfa995412866da3394a8715ce` |

Verification after these corrections: **62 typed ATS tests passed, zero failed**.

### Scenario3 farm-rental follow-up

The public source fixture now also includes page17 Form4835's active-
participation Yes and printed income/expense amounts. The omitted rental
reaches ScheduleE/Schedule1 and Form1040; gross17035 less5974 yields11061,
without changing optional-method SE827. The ATS directory now passes63 tests.
The fixed54 replay observations remain41/12/1; this new rental integration is
asserted separately rather than inflating that denominator. See the
[farm-rental checkpoint](./ty2025.md#october-9-scenario3-farm-rental-source-route)
for native/PDF scope and the deferred ScheduleE 1099-answer omission.

### Scenario3 aggregate capital-gain follow-up

The existing public ScheduleD aggregate route now receives the four printed
line1a/8a proceeds/basis amounts:1988 short gain plus9725 long gain yields
11713 on Form1040. Standalone ScheduleD XSD and two-page PDF checks pass
with the existing blank-zero qualification; full-return preparation still
blocks on issued-recipient identity. ATS64/0; fixed54 observations stay41/12/1.
See the [capital-gain checkpoint](./ty2025.md#october-9-scenario3-aggregate-capital-gain-source-route).
