# ATS Scenario 3 and 4 check expansion — October 10, 2026

The later [emitted-value checkpoint](./ty2025-native-values-2026-10-10.md)
adds54 separate native XML observations, bringing the ledger to185; all131
observations below are preserved. Calculation counts and the estimate are
unchanged. The current ATS test batch passes77 tests.

## Current expansion: Scenario 5 opt-out and Scenario 13 AMT

The projection remains **about 75% of individual ATS checks**, with a
low-confidence range of 50–85%. The expanded selected sample now contains
**74 calculation checks:51 matches,17 differences and6 not produced**.
Excluding five provisional matches and six unproduced amounts gives
**46/63 evaluated nonprovisional matches (73.0%)**. Including all selected
calculations gives51/74(68.9%); these are different denominators. Neither is
a measured pass rate for the full IRS check population.

Eleven targets were added from already-reviewed source facts: Scenario5's
explicit ACTC opt-out and ten printed Scenario13 Form6251 lines. All120 prior
ledger rows remain identical as JSON objects. No source fixture, production
calculation or prior expectation changed.

| Scenario / field | Expected | Actual | Result |
| --- | ---: | ---: | --- |
| 1040-05 / `f1040.line28_actc` | 0 | not produced | not-produced |
| 1040-13 / `form6251.regular_tax_income` | 1620 | 120 | different |
| 1040-13 / `form6251.line2a_taxes_paid` | 30000 | 31500 | different |
| 1040-13 / `form6251.amti` | 31620 | 31620 | match |
| 1040-13 / `form6251.exemption` | 137000 | 137000 | match |
| 1040-13 / `form6251.taxable_excess` | 0 | 0 | match |
| 1040-13 / `form6251.tentative_tax` | 0 | 0 | match |
| 1040-13 / `form6251.amtftc` | 0 | not produced | not-produced |
| 1040-13 / `form6251.net_tmt` | 0 | 0 | match |
| 1040-13 / `form6251.regular_tax` | 162 | 11 | different |
| 1040-13 / `form6251.line11_amt` | 0 | 0 | match |

The AMT targets come from the existing Scenario13 source transcription,
Form6251 page5, lines1b,2a and4–11. Line1a's printed deduction is already
represented by the Form1040 deduction target; no additional duplicate target
was added for it. Six AMT values agree. The three differences trace to the
same printed30,000/current31,500 deduction and printed162/current11 tax
conflict already recorded for this scenario; they are not three newly proven
calculation defects. No new source-PDF visual review is claimed.

The two newly unproduced amounts are zero: opted-out ACTC and AMT foreign tax
credit. The ledger deliberately does not turn an absent pending field into a
calculated zero. Existing Scenario5 tests separately verify the printed/native
opt-out behavior; this amount observation does not negate that evidence or
prove an incorrect credit. Likewise, an absent AMT foreign-credit field is not
by itself a filing defect. No deferred repair is added or implemented.

The ledger now has **131 observations**:74 calculations,56 required native
copies (10 present/12 missing/34 unevaluated), and one known missing binary
attachment. Attachment requirements for seven scenarios remain uninventoried.
No combined percentage is computed across these categories, and enumeration
alone does not indicate improved software. The complete ATS directory passes **73 typed tests, zero failed or ignored**.
Its log and exact prior-row comparison are retained in
`.state/research/ats-component-checks-2026-10-10/`; the reproduction command
below remains unchanged. Main tasks remain open and155 future items stay deferred.

## Earlier Scenario 3 and 4 expansion

The individual-check projection remains **about 75%, with a low-confidence judgment range of 50–85%**. The expanded selected calculation sample has **40/54 evaluated nonprovisional matches (74.1%)**. Five provisional matches and four unproduced amounts remain separate. This is not a measured percentage of all IRS checks; the complete applicable denominator remains open.

This completes enumeration and replay of nine additional expectations already documented in the Scenario 3 and 4 source reconciliations. All 111 observations from the [earlier checkpoint](./ty2025-check-ledger-2026-10-10.md) are preserved byte-for-byte as JSON objects. No fixture, calculation runtime, prior target or deferred repair changed.

| Evidence | Match/present | Different/missing | Unknown |
| --- | ---: | ---: | ---: |
| Selected calculations (63) | 45 | 14 | 4 unproduced |
| Nonprovisional subset (58) | 40 | 14 | 4 unproduced |
| Native copies (56) | 10 | 12 | 34 unevaluated |
| Known binary attachments (1) | 0 | 1 | Requirements uninventoried for 7 scenarios |

There are now 120 observations, without a combined percentage across unlike categories. The broader calculation sample is 45/63 (71.4%) when provisional and unproduced checks share the denominator; the nonprovisional inventory including unproduced amounts is 40/58 (69.0%). These are different denominators, not alternative claims of IRS acceptance.

## Added expectations

| Scenario | Field | Expected | Actual | Result | Source |
| --- | --- | ---: | ---: | --- | --- |
| 1040-03 | `schedule_d.print_line7_st_total` | 1988 | 1988 | match | source-arithmetic: Schedule D p.9:14,222 proceeds less12,234 basis |
| 1040-03 | `schedule_d.print_line15_lt_total` | 9725 | 9725 | match | source-arithmetic: Schedule D p.9:14,211 proceeds less4,486 basis |
| 1040-03 | `f1040.line7_capital_gain` | 11713 | 11713 | match | source-arithmetic: Schedule D p.9:1,988 short-term plus9,725 long-term |
| 1040-03 | `schedule1.line5_schedule_e` | 11061 | 11061 | match | source-arithmetic: Form4835 p.17:17,035 income less5,974 expenses |
| 1040-03 | `schedule1.line1_state_refund` | 3110 | not produced | not-produced | printed-source: Cover sheet p.1 taxable state refund |
| 1040-03 | `f1040.line8_additional_income` | 17422 | 14312 | different | source-arithmetic: Cover/Sch F/Form4835:3,110 refund +3,251 farm +11,061 rental |
| 1040-03 | `f1040.line9_total_income` | 72235 | 69125 | different | source-arithmetic: 43,100 taxable pension +11,713 capital gain +17,422 additional income |
| 1040-04 | `f3800.f8835_credit_entries.0.credit_amount` | 13200 | not produced | not-produced | printed-source: Form3800 line1f; source eligibility and line placement unresolved |
| 1040-04 | `f3800.f8936_new_vehicle_credit.credit_amount` | 130 | not produced | not-produced | printed-source: Form3800 line1y; Form8936 business computation blank |

Scenario 3 capital gains and farm rental income reconcile. Its partial fixture already documents the missing gross refund, issuer and prior-year recovery workpaper; the cover's taxable refund of $3,110 is not supplied to the public 1099-G route. Both income differences equal that missing amount, rather than two independent calculation defects. This checkpoint exposes the incomplete fixture without fabricating source facts or repairing it.

Scenario 4's printed $13,200 solar and $130 vehicle amounts are credit-source deposits, not asserted allowed credits. The existing fixture remains wages-only. Solar ownership, transfer evidence and conflicting Form 3800 line placement remain unresolved; the vehicle business-use computation is blank. A printed target alone does not establish eligibility. Its transfer statement remains missing.

These are previously recorded source gaps, not newly discovered production defects. The existing ATS matrix task remains open, as do all 52 main tasks; 149 deferred tasks remain untouched. No additional native or PDF verification is claimed.

## Evidence and reproduction

```sh
deno run -A forms/f1040/e2e/ats/ty2025-check-ledger.ts /tmp/ats-check-ledger.json
deno test -A forms/f1040/e2e/ats
```

The complete ATS directory passes 73 typed tests, zero failed or ignored. Assertions now retain the two income differences and three newly enumerated missing amounts, alongside the prior document/attachment guards. Private replay, log and hashes: `.state/research/ats-check-expansion-2026-10-10/`. Production runtime remains `d65263134ac90359d42487d85efb05febb13daf6`.

Source facts are retained in the existing Scenario 3 and 4 input/reconciliation modules and their tests, transcribed from the [official Scenario 3 packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf) and [official Scenario 4 packet](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-4-10212025.pdf). This expansion uses those reviewed transcriptions; it does not claim a new visual review.
