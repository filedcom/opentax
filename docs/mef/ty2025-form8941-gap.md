# TY2025 Form 8941 owned direct employer route

## Source and deduction rule

The [2025 IRS instructions](https://www.irs.gov/pub/irs-prior/i8941--2025.pdf) require qualifying SHOP coverage, fewer than25 FTEs, average annual wages below$67,000, a two-consecutive-year credit period and employee/rating-area worksheets. The modeled ordinary employer rate is50%. Worksheets 1–7 floor FTEs at2080hours and average wages to$1,000, cap premiums by the rating-area average and subtract both phaseouts from the original credit. Worksheet 6 uses$33,300 despite the rounded$33,000 threshold in the prose. Table 2025 lists$9,358 for employee-only coverage in Albany County, NY.

[26 USC 280C(h)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapB-partIX-sec280C.htm) and [26 CFR 1.45R-5(c)](https://www.ecfr.gov/current/title-26/section-1.45R-5) reduce the premium deduction by the credit **determined under 45R(a)**, before section 38 tax-use limitation. Section 45R(e)(1) instead excludes owners and family from eligible employee expenses. This repairs the earlier staged implementation, which incorrectly netted premiums only by the Form 3800 allowed amount.

The public graph retains gross Schedule C employee benefits and produces a business-bound reduction equal to Form 8941 line 16. That projection reaches Schedule C profit, Schedule 1, SE tax/deduction, QBI and Form 1040. A separate sole-source Form 3800 allocation is finalized from actual return tax; no caller supplies the allowed amount for this public route. Native/PDF preflight reconciles gross premiums, wages, business/EIN/proprietor and the full reduction. It also rejects orphan reductions and incompatible credit/allocation/final-return totals.

## Retained employer records

The bounded source covers one materially participating Schedule C proprietor, employment EIN and full-year employee-only SHOP plan in Albany County, with all nonexcluded employees enrolled and uniform employer contributions of at least50%. Each employee has a distinct SSN and payroll/enrollment reference. Owned payroll records retain tax year, employer EIN, hours and wages. Twelve distinct monthly records bind employee SSN, payer EIN and plan to paid/billed amounts and unique invoice/payment references. Monthly sums and contribution percentages reconcile to annual worksheets. Owner SSNs, reused payroll/invoice/payment records, wrong employer/plan, missing months and changed amounts reject. Exclusion, no-common-control, no-subsidy and credit-period review facts remain explicit source assertions.

The source records and first-year 2025 fixtures are synthetic; they demonstrate source retention and joins, not independent issuer authentication or prior IRS acceptance. The modeled2024 first-year history still needs separate external authentication evidence.

## Executed filing evidence

`forms/f1040/e2e/form8941_owned_2025.test.ts` executes public input through the calculator, native return, prepared bundle and actual filled PDF. Three packets validate against the **complete local TY2025 v5.4 Return1040.xsd** and retain original input, pending graph, calculated form lines, prepared Form 3800 allocation, XML, PDF and extracted text.

| Current tax use | Form 8941 line 16 | Gross Schedule C benefits | Deductible benefits | Schedule C profit | SE tax | Form 1040 AGI | QBI deduction | Form 1040 total tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Full 11698 | 11698 | 26000 | 14302 | 135698 | 19173 | 126111 | 22072 | 21810 |
| Partial 3221 | 11698 | 26000 | 14302 | 55698 | 7870 | 51763 | 7203 | 7870 |
| Zero 0 | 11698 | 26000 | 14302 | 5698 | 805 | 5295 | 0 | 805 |

The partial and zero cases retain unused current credit 8477/11698 in prepared source allocations. They do not assert an authenticated future carryover or a carryback claim. The credit reaches Form 3800 Part III4h and Parts I/II; the positive allowed amounts reach Schedule 3/1040. Zero use correctly has no Schedule 3 credit document. Form 6251 retains the tentative-minimum-tax calculation. Internal source allocation details reconcile native preparation; printed Part V remains blank for the single source, as the [2025 Form 3800 instructions](https://www.irs.gov/pub/irs-prior/i3800--2025.pdf) require breakdowns for aggregated multiple-source amounts.

Focused evidence: 141 source/Schedule C/native/PDF tests passed; 103 shared Form 3800/F1040 tests passed; the final source packet suite passed 5 tests. Actual native/PDF negatives cover 13 retained-source/allocation/return mutations, and public negatives cover conflicting employee/payroll/invoice ownership. Full and partial packets each have23 pages; zero has21: **all67 pages** were rendered with real Poppler and visually inspected. Review repaired attachment ordering (Form 8995 before Form 8941), required Form 8941 zero lines 10/15 and Form 3800 zero tax-use lines. No clipping, overlap, missing ownership fields or remaining route-specific page defects were observed.

Artifacts: `/tmp/opentax-f8941-owned/.state/research/2026-10-06-form8941-owned/`, including `PROOF.md`, focused logs, the three packets and `all-page-review/`.

The reusable held fixture `single-shop-health-premium-credit` now covers `f8941`. Descriptors remain150 native/116 PDF; the source planner reports199 fixtures,113 unique PDF keys,91 expected keys and22 uncovered keys. This is focused synthetic local evidence, not a full regression, IRS business-rule pass or ATS acceptance.

## Remaining boundaries

Other rating areas, part-year/family/multiple plans, excluded or unenrolled workers, state subsidies, common control/multiple businesses, tax-exempt employers and pass-through credits need their applicable sources and packet evidence. Automatic tax-use allocation here is the sole direct credit with no competing credit/carryover/passive sources; broader mixed-source allocation remains subject to existing source-specific Form 3800 reconciliation. Raw modeled payroll/premium amounts are whole dollars. Independent source authentication, prior/future credit-period and carryover evidence, full-return regression, business rules and ATS remain open. The broader employer health credit parent is not closed by this slice.
