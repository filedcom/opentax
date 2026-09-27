# TY2026 Form 8962 premium tax credit contract

Source: pinned [2026 draft Form 8962](corpus/draft/f8962.pdf), SHA-256
`5b692171ee43a4596eabfcaad83bea920e6356c492656a1648f2aaf018cd1d35`,
plus [Rev. Proc. 2025-25](corpus/authorities/rp-25-25.pdf) for 2026 applicable
percentages, [Rev. Proc. 2025-32](corpus/authorities/rp-25-32.pdf) §2.04,
and the pinned [2025 HHS poverty guidelines](corpus/authorities/hhs-2025-poverty-guidelines.pdf).
The expected IRS draft instruction URL `i8962--dft.pdf` still serves 2025;
its rules are a comparator, **not** confirmation of 2026 Table 2, household
definitions, or special worksheets. Reconcile this contract with final 2026
instructions when posted. Form 8962 is a required full-parity attachment
even though none of the seven linked 1040 ATS packets exercises it.

## Changed form line and output topology

| 2026 line | Required source / calculation | Destination |
| --- | --- | --- |
| A and 1–5 | MFS exception answer; tax family size; taxpayer and dependent modified AGI; household income; Alaska/Hawaii/48-state FPL table; whole-number household-income percent. | Inputs must reconcile to 1040/8814 and each covered family member. For 2026, >400% prints **401%** on line 5 and line 6 Yes. |
| 6–8b | If line 5 is 401%, no PTC; otherwise use the 2026 applicable figure and derive annual/monthly contribution with the form's whole-dollar rounding. Verify any <100% or MFS exception before claiming PTC. | Eligibility decision and contribution values feed Part II. |
| 9–11 or 12–23 | Choose annual line 11 only when full-year unchanged policy facts support it; otherwise compute month rows. Form 1095-A supplies enrollment premiums, applicable SLCSP, and advance PTC by policy and month. Apply shared-policy allocations, year-of-marriage alternative, and QSEHRA rules when applicable. | Part II columns (a)–(f), then lines 24/25. A total-only 1095-A cannot prove monthly or shared-policy cases. |
| 24–26 | Allowed PTC less APTC. Positive net PTC is **line 26**. | Schedule 3 **line 9** → refundable 1040 credit path. |
| 27 | If APTC exceeds allowed PTC, repay the **full** excess in 2026. | Schedule 2 **line 1a** → Schedule 2 line 3 and Form 1040 line 17. Also reaches AMT/credit-limit tax calculations that use Schedule 2 line 1z. |
| 28–29 | **Reserved for future use** on the 2026 draft. | Never print or serialize the TY2025 repayment-cap or liability lines here. |
| 30–34 | Up to four printed shared-policy allocation rows, with policy number, other SSN, start/stop months, and three percentages; line 34 attests completeness. | More than four requires the current IRS continuation/MeF representation. Sum allocated and unallocated policy amounts into monthly rows exactly once. |
| 35–36 | Alternative family size, monthly contribution and coverage months for taxpayer/spouse when electing the year-of-marriage calculation. | Recompute affected month rows rather than inserting an end-of-form adjustment. |

The draft PDF has a coversheet followed by two form pages. The generated
[`pdf-fields-f8962.csv`](pdf-fields-f8962.csv) records **143** widgets, all
in the field tree. Key changed fields are page-2
`Page1.f1_93[0]` for line 27 and `Page1.f1_94[0]`/`f1_95[0]` for reserved
lines 28/29. Full field names, widgets, tooltips and coordinates are in the
CSV; use them rather than assuming the 2025 descriptor's field assignments.
The existing TY2025 PDF descriptor has shared-allocation continuation logic
that can be reviewed for reuse after a 2026 visual/field audit.

## Current code boundary

- `nodes/inputs/f1095a/index.ts` aggregates policy amounts and shared-policy
  facts, but `f1095a` is **not** in the 2026 registry.
- Shared `nodes/intermediate/forms/form8962/index.ts` has year-aware
  applicable figures, the 400% cliff, 2026 uncapped repayment, FPL regional
  data, monthly/annual calculation, MFS and below-100% eligibility facts,
  shared-policy allocation and QSEHRA checks. Focused 2026 tests cover the
  400/401 boundary and FPL regions. It is **not** registered for TY2026.
- The shared node declares output targets from the TY2025 Schedule 2,
  Schedule 3 and Form 6251 graph. The dedicated 2026 Schedule 2/3 and credit
  resolver must consume the amounts; registration alone cannot make those
  old target objects equivalent to the filed 2026 routes. The code's local
  variable `line29` currently names the final repayment amount even when
  `ctx.taxYear === 2026`; only `excess_advance_payment` is emitted as the
  Form 8962 field in that year. Audit every pending key and printed field to
  prevent a 2025 line-29 mapping from leaking into 2026.
- The TY2025 MeF serializer contains `AdditionalTaxLimitationAmt` and
  `PremiumTaxCreditTaxLiabAmt` for the old limitation/liability lines. The
  current TY2026 XSD must define the replacement Form 8962 structure and
  document order. Do not reuse these TY2025 element names by inference.
  `forms/f1040/2026/mef` does not yet exist.
- The 2026 PDF builder has no Form 8962 attachment. The TY2025 descriptor
  targets a 2025 form and must not be registered for a 2026 return as-is.
- Marketplace premiums under a self-employed business plan create a
  deduction/PTC dependency with [Form 7206](FORM7206-GRAPH.md). Its 2026
  instructions defer the computation to Publication 974; the pinned 2025
  publication is a comparator, not a current-year worksheet. Resolve this
  loop before finalizing either form's amount.

## Build order and independent acceptance cases

1. Register a 2026 Form 1095-A source and Form 8962 calculation with explicit
   outputs to the dedicated 2026 Schedule 3 line 9 and Schedule 2 line 1a.
   Carry its Schedule 2 line 1z effect into AMT and nonrefundable-credit
   limits. Require the completed Form 8962 record whenever APTC or a PTC
   claim makes it necessary, and suppress an empty form when no PTC/APTC
   applies.
2. Finish family-income/household facts, shared-policy allocation, MFS and
   below-100% exception validation, QSEHRA and self-employed health-insurance
   interactions, and year-of-marriage months. A source conflict or missing
   exception should block filing rather than silently yield zero credit.
3. With one-person contiguous FPL **$15,650**, test income **$62,600**
   (400%) and **$62,601** (>400%, reported 401%). For annual premium $5,000,
   SLCSP $10,000 and APTC $3,000, the first case has 9.96% contribution,
   $3,765 allowed PTC, and **$765** line 26; the second has zero allowed PTC
   and **$3,000** line 27. Reconcile Schedule 3, Schedule 2, AMT and 1040
   rather than checking the form alone. Add Alaska/Hawaii, 99/100% exception,
   MFS exception, monthly policy change, multiple policies, shared-policy
   continuation, QSEHRA, and marriage-alternative cases.
4. Map and render all applicable 2026 widgets, including line 6 and Part
   III's line 27, and inspect both pages plus any allocation continuation.
   Compare Form 8962 line 26/27 to the corresponding schedules and final
   1040 fields.
5. Obtain the current TY2026 MeF XSD and active rules, map Form 8962 and
   Form 1095-A/allocations to their actual XML groups, validate a complete
   return and inspect business-rule rejects. Keep the final 2026 instruction
   refresh as a gate for Table 2, below-100%, QSEHRA and special worksheets.
   Run TY2025 tests to preserve its capped-repayment path.
