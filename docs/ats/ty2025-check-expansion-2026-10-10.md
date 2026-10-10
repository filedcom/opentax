# ATS Scenario 3 and 4 check expansion — October 10, 2026

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
