# Current 2026 child-credit route

Implemented October 15, 2026 in the incremental `sourceRegistry2026` graph.
This is a development calculation and draft PDF route, not full filing parity.

## Sources and reuse

The [2026 Schedule 8812 draft](https://www.irs.gov/pub/irs-dft/f1040s8--dft.pdf),
[2026 instructions](https://www.irs.gov/pub/irs-dft/i1040s8--dft.pdf), and
[Rev. Proc. 2025-32 §4.05](https://www.irs.gov/irb/2025-45_IRB) supply the current
rules. The shared 2025 calculator now has a narrow configuration entry point;
the existing 2025 entry point and calculations are unchanged. The annual adapter
supplies $2,200 CTC, $500 ODC, $1,700 ACTC, the $2,500 earned-income floor and
$400,000 joint/$200,000 other phaseout thresholds. Phaseout uses the next $1,000.

General filer/dependent source facts determine counts and TIN eligibility.
AGI supplies the final AGI and normalized 1040 wage lines, including unreported
tips, misclassified wages and other earned wages. W-2 code Q adds nontaxable
combat pay to ACTC earned income without adding it to AGI. The tax limit uses
regular income tax plus Schedule 2 Part I, including AMT; payroll taxes do not
increase that limit. Whole-dollar ACTC reaches settlement and Schedule 3-A.

A public singleton `f8812` source claim requires a review reference, prior
credit-disallowance answer, ACTC opt-out answer, and explicit absence reviews for
other nonrefundable credits, foreign/territory exclusions, Puerto Rico residence,
self-employment/statutory-employee income and Medicaid waiver payments. It cannot
supply counts, AGI, tax or calculated credit amounts. The no-other-credit review
justifies zero Credit Limit Worksheet A offsets; it does not stand in for future
credit calculations. The old Worksheet A line 5b slot is held at zero because
2026 no longer includes that line.

## Output and verification

Form 1040 receives finalized lines 19 and 28. Fully phased-out credits finalize
at zero while preserving the dependent rows. No qualifying credit dependents
need no claim review. Retained calculation records include the source contract,
earned-income worksheet and shared calculated lines when applicable.

The static draft bundle selects Schedule 8812, sequence 47, only for a positive
CTC/ODC or ACTC. It reconciles AGI, tax, dependent counts, credit totals and the
opt-out answer before filling the pinned two-page form. Reserved line 15 and
inapplicable payroll fields stay blank. The pinned 2026 Form 1040 has **no ACTC
opt-out checkbox**; `c2_14` is the unrelated Form 8888 refund indicator and must
not be used for this election. An opt-out preserves nonrefundable credit and
omits refundable worksheet amounts.

Regression coverage includes zero income, earned-income floor/cap/rounding,
combat pay, CTC/ODC eligibility, phaseout boundaries, joint phaseout, AMT graph
ordering, unrelated payroll taxes, explicit opt-out, missing reviews, rejected
caller totals and static PDF reconciliation. CTC, ACTC, opt-out and limited ODC
examples were rendered and inspected; flattened output has no AcroForm or page
annotations. The 2025 Schedule 8812 regression suite remains intact.

## Still required

- Part II-B when three or more children need the payroll method: finalize EIC,
  excess Social Security/tier 1 RRTA credit, actual W-2/PR withholding and the
  Additional Medicare/RRTA worksheet. Current calculation fails explicitly when
  the method is needed; pending EIC is never assumed to be zero.
- Credit Limit Worksheets A/B with other credits. 2026 A uses Schedule 3 lines
  1, 2, 3, 4, 6d, 6f, 6l, 6m; B line 15 uses 5a, 6c, 6g, 6h. Part II-B line 22
  uses Schedule 1 line 15 and Schedule 2 lines 16c/17c, not the 2025 line names.
- Form 8862/disallowance exceptions, Form 8332, birth/death without a TIN,
  self-employment, foreign and territory cases and Medicaid waiver elections.
- EIC itself remains unfinished even where the supported ACTC method does not
  depend on its amount. The bundle retains the incomplete implementation label.
- Final forms/instructions, current MeF and business rules, product registration,
  and ATS acceptance.
