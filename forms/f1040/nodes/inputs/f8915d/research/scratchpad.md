# Form 8915-D — Scratchpad

## Purpose
Form 8915-D covers qualified 2019 disaster retirement plan distributions and repayments. Same structure as 8915-F but specifically for 2019 qualified disasters (not COVID). By TY2025, the 3-year spreading window (2019/2020/2021) has expired — income from 2019 disaster distributions has been fully reported. However, repayments within 3 years of distribution may still be tracked, and late repayments may create credits.

## Fields identified
- total_2019_distribution: total qualified 2019 disaster distribution
- amount_previously_reported_2019: amount included in income for TY2019
- amount_previously_reported_2020: amount included in income for TY2020
- amount_previously_reported_2021: amount included in income for TY2021
- repayments_in_2025: repayments made in 2025

## Resolved Questions
- [x] What fields? See above
- [x] Where does each flow? — Any net remaining income to schedule1; excess repayment credit to schedule1 as negative amount
- [x] TY2025 constants? — By TY2025, 3-year window for 2019 disasters is closed (2019+3=2022); repayments tracked separately
- [x] Edge cases? — Spreading complete by 2021; any 2025 repayments are excess (fully credited); distribution may already be fully reported
- [x] Upstream nodes? — INPUT node

## Sources checked
- [x] IRC §72(t)(2)(G) — exception to 10% penalty
- [x] Notice 2019-70 — 2019 qualified disasters
- [x] Form 8915-D instructions
