# TY2025 individual-check evidence ledger — October 10, 2026

**Provisional engineering estimate: about75% of individual ATS checks, with a
judgment range50–85%.** Confidence is low because the complete applicable IRS
check denominator has not been enumerated. This is a projection anchored to
selected calculations, not a measured IRS pass rate or a probability that all
eight scenarios pass. The range is not a statistical confidence interval.

The current replay is unchanged:41 matching,12 different and one unproduced
calculation out of54. Five matches use a provisional Scenario8 interpretation.
Leaving those five conditional matches and the one unproduced amount separate
gives **36/48 evaluated nonprovisional comparisons matching (75%)**. Including
the unproduced amount in that inventory gives36/49 (73.5%); the broader selected
sample gives41/54 (75.9%). These denominators are explicit, not interchangeable.

The previous60% estimate applied an undocumented discount for unresolved
requirements. This checkpoint removes that unsupported weighting; **it does not
claim a15-point software improvement**. Unverified requirements are not assigned
automatic failures or successes. The75% projection uses the selected calculation
anchor as a provisional proxy; identity, native/PDF, attachments and IRS-rule
coverage could materially change it when actually enumerated and evaluated.

| Evidence category | Matching/present | Different/missing | Unknown | Scope |
| --- | ---: | ---: | ---: | --- |
| Selected calculations | 41 | 12 | 1 unproduced | Includes5 provisional matches |
| Nonprovisional calculation subset | 36 | 12 | 1 unproduced | Subset of the54, not additional checks |
| Required native copies | 10 | 12 | 34 not evaluated | Presence only; a blocked bundle is not proof of missing copies |
| Inventoried binary attachments | 0 | 1 | Other requirements not inventoried for7 scenarios | Scenario4 transfer statement absent |

The ledger contains **111 distinct local observations**:54 calculations,
56 document copies and one known attachment. There is deliberately **no combined
111-row pass percentage**: a form's presence and a calculation equality are
different evidence, and this catalog is not the full IRS denominator. Unmapped
roots, absent amounts and uninventoried attachments remain explicit in the
machine report. Additional scopes are listed there without invented counts.

| Calculation target basis | Match | Different | Unproduced |
| --- | ---: | ---: | ---: |
| Printed source | 23 | 12 | 1 |
| Independently derived source arithmetic | 13 | 0 | 0 |
| Provisional interpretation | 5 | 0 | 0 |

This uneven mix is why the observed75% cannot be treated as a representative
measurement of all IRS checks.

All12 calculation differences are against printed targets in Scenarios12/13.
They remain differences; some are documented current-law/printed-answer
conflicts, not established code defects. No expected value or tax runtime was
changed to improve this percentage. The original
[replay report](./ty2025-check-replay-2026-10-09.md) retains source explanations.

## Reproduce

```sh
deno run -A forms/f1040/e2e/ats/ty2025-check-ledger.ts /tmp/ats-check-ledger.json
deno test -A forms/f1040/e2e/ats
```

The CLI obtains a fresh public-entry replay, emits one uniquely identified row
per observation, preserves repeated document-copy ordinals and keeps blocked
copies unknown. Its calculation anchor excludes provisional comparisons and
returns no percentage for an empty evaluated set. The full ATS directory passes73 typed tests, zero failures or ignored cases.
The regression checks retain all original54 targets and assert the ledger's partition and duplicate-W2
handling. Private evidence: `.state/research/ats-check-ledger-2026-10-10/`.

## Calculation observations

| Scenario | Field | Expected | Actual | Result | Basis / source location |
| --- | --- | ---: | ---: | --- | --- |
| 1040-01 | `f1040.line1a_wages` | 42470 | 42470 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| 1040-01 | `f1040.line25a_w2_withheld` | 2713 | 2713 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| 1040-01 | `schedule2.line9_household_employment` | 474 | 474 | match | source-arithmetic: Schedule H: 3,100 × 12.4% rounded + 3,100 × 2.9% rounded |
| 1040-02 | `f1040.line1a_wages` | 8513 | 8513 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| 1040-02 | `f1040.line25a_w2_withheld` | 1164 | 1164 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| 1040-02 | `schedule1.line3_schedule_c` | 26979 | 26979 | match | source-arithmetic: Schedule C: statutory receipts29,513 less expenses2,534 |
| 1040-03 | `f1040.line5a_pension_gross` | 53778 | 53778 | match | printed-source: 1099-R p.4 box1 |
| 1040-03 | `f1040.line5b_pension_taxable` | 43100 | 43100 | match | printed-source: 1099-R p.4 box2a |
| 1040-03 | `f1040.line25b_withheld_1099` | 3405 | 3405 | match | printed-source: 1099-R p.4 box4 |
| 1040-03 | `schedule1.line6_schedule_f` | 3251 | 3251 | match | source-arithmetic: Schedule F pp.13–14:8,111 less4,860 |
| 1040-03 | `schedule2.line4_se_tax` | 827 | 827 | match | source-arithmetic: Farm optional election: rounded2/3 ×8,111 earnings; filed SE component tax |
| 1040-03 | `schedule1.line15_se_deduction` | 414 | 414 | match | source-arithmetic: Half of filed827 SE tax, rounded |
| 1040-04 | `f1040.line1a_wages` | 36014 | 36014 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| 1040-04 | `f1040.line25a_w2_withheld` | 4581 | 4581 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| 1040-05 | `f1040.line1a_wages` | 31232 | 31232 | match | source-arithmetic: Issued W-2 box 1, excluding statutory employee receipts |
| 1040-05 | `f1040.line25a_w2_withheld` | 1754 | 1754 | match | source-arithmetic: Sum of issued W-2 box 2 amounts |
| 1040-05 | `f1040.taxpayer_blind` | true | true | match | printed-source: Form1040 p.2 blindness mark |
| 1040-05 | `f1040.digital_assets` | false | false | match | printed-source: Form1040 p.2 digital-assets No |
| 1040-08 | `f1040.line5a_pension_gross` | 20300 | 20300 | match | printed-source: Code G 1099-R gross distribution |
| 1040-08 | `f1040.line5b_pension_taxable` | 10300 | 10300 | match | printed-source: Code G 1099-R taxable distribution |
| 1040-08 | `f1040.line5c_pension_rollover` | true | true | match | printed-source: Form1040 p.2 line5c |
| 1040-08 | `f1040.line6a_ss_gross` | 1000 | 1000 | match | printed-source: Cover sheet Social Security benefits |
| 1040-08 | `f1040.line7a_cap_gain_distrib` | 7500 | 7500 | match | printed-source: Cover sheet REIT capital-gain distribution |
| 1040-08 | `f1040.line9_total_income` | 17800 | 17800 | match | provisional-source-interpretation: Source-backed provisional interpretation; printed QCD unresolved |
| 1040-08 | `f1040.line12a_standard_deduction` | 17350 | 17350 | match | provisional-source-interpretation: MFS taxpayer age72; QCD/source questions unresolved |
| 1040-08 | `f1040.line15_taxable_income` | 450 | 450 | match | provisional-source-interpretation: 17,800 less17,350 under provisional interpretation |
| 1040-08 | `f1040.line24_total_tax` | 0 | 0 | match | provisional-source-interpretation: Provisional qualified-gain return; not printed acceptance target |
| 1040-08 | `f1040.line25b_withheld_1099` | 2555 | 2555 | match | printed-source: Code G 1099-R box4 |
| 1040-08 | `f1040.line35a_refund` | 2555 | 2555 | match | provisional-source-interpretation: Provisional zero-tax return; QCD unresolved |
| 1040-12 | `f1040.line1a_wages` | 100836 | 100836 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line8_additional_income` | 24328 | 24328 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line9_total_income` | 125164 | 125164 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line10_adjustments` | 2719 | 1719 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line11_agi` | 122445 | 123445 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line12a_standard_deduction` | 15000 | 15750 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line15_taxable_income` | 107445 | 103173.2 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line16_income_tax` | 18634 | 17612 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line23_other_taxes` | 3438 | 3438 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line24_total_tax` | 22072 | 21050 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line25a_w2_withheld` | 14444 | 14444 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `f1040.line37_amount_owed` | 7628 | 6606 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-12 | `schedule1.line15_se_deduction` | 1719 | 1719 | match | printed-source: Schedule SE p.10 line13 |
| 1040-12 | `schedule1.line17_se_health_insurance` | 1000 | unproduced | not-produced | printed-source: Form7206 printed deduction; eligibility/source records incomplete |
| 1040-13 | `f1040.line1a_wages` | 31620 | 31620 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line11_agi` | 31620 | 31620 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line12a_standard_deduction` | 30000 | 31500 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line15_taxable_income` | 1620 | 120 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line16_income_tax` | 162 | 11 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line20_nonrefundable_credits` | 162 | 11 | different | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line24_total_tax` | 0 | 0 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line25a_w2_withheld` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line34_overpayment` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `f1040.line35a_refund` | 609 | 609 | match | printed-source: Form 1040 pp. 2–3 |
| 1040-13 | `schedule3.line6j_alt_fuel_vehicle_refueling` | 162 | 11 | different | printed-source: Schedule3 line6j; printed stale tax limit remains unresolved |

## Required native-copy observations

Presence does not prove correct contents, ownership or filing acceptance.

| Scenario | Required copy | Result |
| --- | --- | --- |
| 1040-01 | 1040:1 | not-evaluated |
| 1040-01 | W-2:1 | not-evaluated |
| 1040-01 | W-2:2 | not-evaluated |
| 1040-01 | Schedule 2:1 | not-evaluated |
| 1040-01 | Schedule 3:1 | not-evaluated |
| 1040-01 | Schedule H:1 | not-evaluated |
| 1040-01 | 5695:1 | not-evaluated |
| 1040-02 | 1040:1 | not-evaluated |
| 1040-02 | W-2:1 | not-evaluated |
| 1040-02 | W-2:2 | not-evaluated |
| 1040-02 | Schedule 1:1 | not-evaluated |
| 1040-02 | Schedule A:1 | not-evaluated |
| 1040-02 | Schedule C:1 | not-evaluated |
| 1040-02 | 8283:1 | not-evaluated |
| 1040-03 | 1040:1 | not-evaluated |
| 1040-03 | 1099-R:1 | not-evaluated |
| 1040-03 | Schedule 1:1 | not-evaluated |
| 1040-03 | Schedule 2:1 | not-evaluated |
| 1040-03 | Schedule D:1 | not-evaluated |
| 1040-03 | Schedule E:1 | not-evaluated |
| 1040-03 | Schedule F:1 | not-evaluated |
| 1040-03 | Schedule SE:1 | not-evaluated |
| 1040-03 | 4835:1 | not-evaluated |
| 1040-04 | 1040:1 | present |
| 1040-04 | W-2:1 | present |
| 1040-04 | Schedule 3:1 | missing |
| 1040-04 | 3800:1 | missing |
| 1040-04 | 8835:1 | missing |
| 1040-04 | 8936:1 | missing |
| 1040-04 | 8936 Schedule A:1 | missing |
| 1040-05 | 1040:1 | present |
| 1040-05 | W-2:1 | present |
| 1040-05 | Schedule 1:1 | missing |
| 1040-05 | Schedule 3:1 | missing |
| 1040-05 | 2441:1 | missing |
| 1040-05 | 8862:1 | missing |
| 1040-05 | 8863:1 | missing |
| 1040-05 | Schedule EIC:1 | missing |
| 1040-05 | Schedule 8812:1 | missing |
| 1040-08 | 1040:1 | not-evaluated |
| 1040-08 | 1099-R:1 | not-evaluated |
| 1040-08 | 1099-R:2 | not-evaluated |
| 1040-12 | 1040:1 | not-evaluated |
| 1040-12 | Schedule 1:1 | not-evaluated |
| 1040-12 | Schedule 2:1 | not-evaluated |
| 1040-12 | Schedule C:1 | not-evaluated |
| 1040-12 | Schedule SE:1 | not-evaluated |
| 1040-12 | 7206:1 | not-evaluated |
| 1040-12 | 7217:1 | not-evaluated |
| 1040-12 | W-2:1 | not-evaluated |
| 1040-13 | 1040:1 | present |
| 1040-13 | Schedule 3:1 | present |
| 1040-13 | 6251:1 | present |
| 1040-13 | 8911:1 | present |
| 1040-13 | 8911 Schedule A:1 | present |
| 1040-13 | W-2:1 | present |

## Known attachment observations

| Scenario | Requirement | Result |
| --- | --- | --- |
| 1040-04 | Transfer Election Statement | missing |

## Source packets

- [1040-01](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf)
- [1040-02](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-2-12012025.pdf)
- [1040-03](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf)
- [1040-04](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-4-10212025.pdf)
- [1040-05](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf)
- [1040-08](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf)
- [1040-12](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf)
- [1040-13](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf)
