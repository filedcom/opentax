# TY2026 Form 8962 premium tax credit contract

Source: pinned [2026 draft Form 8962](../corpus/draft/f8962.pdf), SHA-256
`5b692171ee43a4596eabfcaad83bea920e6356c492656a1648f2aaf018cd1d35`,
plus [Rev. Proc. 2025-25](../corpus/authorities/rp-25-25.pdf) for 2026 applicable
percentages, [Rev. Proc. 2025-32](../corpus/authorities/rp-25-32.pdf) §2.04,
and the pinned [2025 HHS poverty guidelines](../corpus/authorities/hhs-2025-poverty-guidelines.pdf).
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
[`pdf-fields-f8962.csv`](../inventories/pdf-fields/pdf-fields-f8962.csv) records **143** widgets, all
in the field tree. Key changed fields are page-2
`Page1.f1_93[0]` for line 27 and `Page1.f1_94[0]`/`f1_95[0]` for reserved
lines 28/29. Full field names, widgets, tooltips and coordinates are in the
CSV; use them rather than assuming the 2025 descriptor's field assignments.
The existing TY2025 PDF descriptor has shared-allocation continuation logic
that can be reviewed for reuse after a 2026 visual/field audit.

## Current code boundary

- `nodes/inputs/credits/health/f1095a/index.ts` aggregates policy amounts
  and shared-policy facts, but `f1095a` is **not** in the 2026 registry.
- `forms/f1040/2026/inputs/marketplace-source.ts` now prepares ordinary
  2026 policy facts from issued copies and person-month reviews. It preserves
  source cents, corrected-copy lineage and issued VOID copies; verifies each
  current copy's annual totals; and requires payment and outside-MEC reviews
  for every covered month. Zero-APTC and mixed-APTC months use the same review
  path with the 2027 ordinary payment deadline.
- The source component reuses shared corrected-copy selection, state-level
  SLCSP combination and year-parameterized eligibility validation. The 2025
  public helper keeps its original concrete signature, including callers that
  inspect its return type. Shared payment comparisons now use integer cents
  and reject malformed amounts, avoiding false underpayment from floating-point
  addition in either year.
- Benchmark reviews bind the applicable SLCSP to the complete eligible coverage
  family in each state. Matching same-state policy benchmarks count once;
  different-state families combine their benchmarks. Missing/incorrect column B
  needs a dated determination reference and digest. A changing coverage family
  forces monthly calculation even when the dollar amounts stay constant.
- The validated 2026 general node now emits an internal Marketplace family
  projection containing the filer identities and only actually claimed dependents.
  `marketplace-family.ts` binds a complete income inventory to those dependents,
  rejects reused or foreign-owned documents, and derives Worksheet 1-2 MAGI.
  It supports reviewed no-income, wage-only/interest-only non-filing and sourced
  single-dependent filed returns; Form 8814 and other dependent income types
  still need their own current-year routes.
- The shared dependent-income schema and calculation now live beside general,
  with an explicit annual policy. The existing 2025 entrypoint preserves its
  original schema and amounts. The 2026 policy uses Rev. Proc. 2025-32 §4.14:
  $16,100 single deduction, $1,350 dependent minimum, $450 earned-income
  addition and $2,050 for each age/blind condition. Filing thresholds use source
  cents; each combined filed income entry rounds once, and MAGI uses the
  reconciled filed entries. Dependency gross income must agree when supplied.
- FPL region is derived from the complete taxpayer/spouse residence history,
  including moves and different spouse states, choosing the higher applicable
  table. Policy coverage state and the mailing address cannot override it.
  Residence gaps, overlaps, outside-filer records and incomplete-year reviews
  are rejected. Foreign residence needs a separate rule review.
- `marketplace-preparation.ts` combines these family facts and reviewed policy
  sources without accepting household-size, FPL-region or dependent-MAGI
  overrides. It remains **not registered**. Primary/joint MAGI must still bind
  to the executed AGI graph; it does not coordinate medical premium deductions
  or prove all current-year filing eligibility. Shared allocations, marriage/divorce
  changes, QSEHRA, self-employed plans, retroactive/mid-month special enrollment,
  protected partial payments and employer-offer affordability remain separate
  required source workpapers. An issued VOID copy is supported; a standalone
  void letter needs its own document contract.
- The shared `nodes/intermediate/forms/credits/health/form8962/index.ts`
  now exposes its existing arithmetic with an explicit annual policy. The
  2025 node still selects its original FPL tables, enhanced applicable figures,
  QSEHRA percentage and capped repayment. No full 2026 configuration is
  inserted into the 2025 graph to enable this reuse.
- `forms/f1040/2026/form8962-policy.ts` supplies the 2025 HHS regional
  guidelines, Rev. Proc. 2025-25 contribution bands, the 400% ceiling and
  uncapped repayment. Four-decimal interpolation is provisional pending
  the final 2026 Table 2. Its QSEHRA percentage is parameterized, but the
  2026 adapter does not yet accept QSEHRA facts.
- `forms/f1040/2026/form8962.ts` is an **internal calculation component**,
  not a registered source or a filed return route. It reuses the shared
  monthly/annual calculation with strict ordinary-family inputs, requires
  all twelve monthly columns, reconciles any annual totals in cents, and rejects
  MFS, below-100% eligibility and advanced worksheet/source fields. The internal
  preparation component derives family size, dependent MAGI and ordinary
  coverage facts; primary MAGI and downstream graph ownership remain pending.
  Caller-provided totals are not public claim inputs.
- The existing cent-summing helper now lives beside the shared calculation;
  the 2025 domain reexports it without changing behavior. The 2026 component
  retains source cents for reconciliation, validates unchanged monthly
  coverage before annual line 11, rounds annual sums once for that line, and
  rounds each monthly entry separately when using lines 12–23.
- The component returns separate Schedule 3 line 9, Schedule 2 line 1a and
  AMT regular-tax-limit contributions. Its 2026 form record omits both
  `repayment_limitation` and `excess_advance_premium` (the old lines 28/29);
  full repayment is `excess_advance_payment` (line 27). The dedicated 2026
  Schedule 2/3 and AMT nodes do **not yet consume** these values. Tests
  reconcile pure schedule totals, not end-to-end 1040/credit execution.
- The original plan overstated this baseline: the node was 2025-only,
  with hardcoded annual helpers, before the annual-policy extraction.
  Registration alone still cannot establish a source-backed 2026 route.
- The TY2025 MeF serializer contains `AdditionalTaxLimitationAmt` and
  `PremiumTaxCreditTaxLiabAmt` for the old limitation/liability lines. The
  current TY2026 XSD must define the replacement Form 8962 structure and
  document order. Do not reuse these TY2025 element names by inference.
  `forms/f1040/2026/mef` does not yet exist.
- The 2026 PDF builder has no Form 8962 attachment. The TY2025 descriptor
  targets a 2025 form and must not be registered for a 2026 return as-is.
- Marketplace premiums under a self-employed business plan create a
  deduction/PTC dependency with [Form 7206](./FORM7206-GRAPH.md). Its 2026
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

## Current calculation evidence

`forms/f1040/2026/form8962.test.ts` covers the 400%/$1-over boundary,
all contribution-band endpoints and selected interpolated figures, each regional
FPL table through nine people, uncapped low-income repayment, changed monthly
coverage, annual-versus-monthly cent rounding, dependent MAGI, zero records,
reconciliation failures and unsupported
facts. The $765/$3,000 case uses monthly premium $416.67 and SLCSP $833.33,
whose annual source totals are $5,000.04 and $9,999.96; the filed whole-dollar
credit/repayment remains the independent acceptance result above. Full 2025
node/source/household regressions preserve its original eligibility and cap
behavior. This evidence does not complete source ownership, PDF or MeF work.

Current primary authorities checked October 16, 2026:
[Rev. Proc. 2025-25](https://www.irs.gov/pub/irs-drop/rp-25-25.pdf),
[2025 HHS poverty guidelines](https://www.govinfo.gov/content/pkg/FR-2025-01-17/html/2025-01377.htm),
[IRS repayment-cap removal](https://www.irs.gov/tax-professionals/eitc-central/repayment-caps-eliminated-for-excess-advance-payments-of-the-premium-tax-credit),
and [draft Form 8962](https://www.irs.gov/pub/irs-dft/f8962--dft.pdf).

`forms/f1040/2026/inputs/marketplace-source.test.ts` also checks corrected and
void lineage, same-state benchmark deduplication, distinct-state family coverage,
source ownership, mixed advances, payment deadlines, benchmark determinations,
changing coverage families and stale/duplicate/incomplete records. Its positive
cases feed the internal Form 8962 calculator; they do not yet execute a complete
1040 graph. The retained source records must be replayed at that later boundary.
Additional references are the
[2026 draft Form 1095-A instructions](https://www.irs.gov/pub/irs-dft/i1095a--dft.pdf),
[IRS corrected/void statement guidance](https://www.irs.gov/affordable-care-act/corrected-incorrect-or-voided-form-1095-a),
and the coverage-month regulation published in
[IRB 2025-04](https://www.irs.gov/pub/irs-irbs/irb25-04.pdf).
The 2025 Form 8962 instructions remain a comparator pending the 2026 edition.

### Required return integration

The 2026 AGI node already emits taxpayer modified AGI and a Publication 974
income audit to the pending `form8962` receiver. General must supply the actual
claimed family, and required-filing dependent records must derive Worksheet 1-2
using 2026 filing thresholds before that receiver is enabled. Residence evidence
must determine the FPL region; coverage state alone is not the residence test.
Positive W-2 QSEHRA or self-employed health deductions must not be hidden by a
policy-scope assertion. Schedule A needs source-level premium coordination to
prevent a duplicate deduction for credited premiums.

The current graph uses `schedule3_final` for final refundable totals. Add line 9
there; add repayment line 1a to the connected Schedule 2 contract and its effect
to AMT regular-tax line 10. The Form 1062 hypothetical-income replay must also
recompute PTC repayment and affected credit limits from the retained Marketplace
sources rather than carrying the original-income result into its comparison.
Until that replay exists, a combined election/Marketplace source claim must
remain explicitly unsupported. Registering the legacy node object is not a
substitute for these dependencies or the draft attachment and replay checks.

`forms/f1040/2026/inputs/marketplace-family.test.ts` checks validated general
selection, complete dependent classification, $16,100/$16,100.01 wage and
$1,350/$1,350.01 unearned boundaries, combined-income thresholds, the 65th
birthday boundary, blindness, source-cent versus filed-entry rounding,
foreign/reused/stale documents, and complete Alaska/Hawaii/joint residence.
The preparation-to-calculator test preserves the independent $765 credit and
$3,000 repayment at the 400% cliff; it is not an end-to-end return test.
Annual dependent amounts were checked against
[Rev. Proc. 2025-32 §4.14](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf).
The residence-table selection rule follows the
[Form 8962 line 4 instructions](https://www.irs.gov/instructions/i8962),
which still need comparison to the final 2026 instructions.
