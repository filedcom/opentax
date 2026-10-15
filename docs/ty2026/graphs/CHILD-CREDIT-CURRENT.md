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
nonrefundable credits other than dependent care and education (or a matching
energy inventory reference), foreign/territory exclusions, Puerto Rico residence,
Medicaid waiver payments and either no business income or a reference to the
complete supported business inventory. It cannot
supply counts, AGI, tax or calculated credit amounts. Schedule 3 supplies finalized dependent-care credit to Worksheet A line 2; the
review justifies zero remaining offsets and does not stand in for future credit
calculations. See [current care route](FORM2441-CURRENT.md). The old Worksheet A line 5b slot is held at zero because
2026 no longer includes that line.

## Output and verification

Form 1040 receives finalized lines 19 and 28. Fully phased-out credits finalize
at zero while preserving the dependent rows. No qualifying credit dependents
need no claim review. Retained calculation records include the source contract,
earned-income worksheet and shared calculated lines when applicable.

The static draft bundle selects Schedule 8812, sequence 47, only for a positive
CTC/ODC or ACTC. It reconciles AGI, tax, dependent counts, credit totals and the
opt-out answer before filling the pinned two-page form. Reserved line 15 and
inapplicable payroll fields stay blank; applicable Part II-B lines 21–26 are filled. The pinned 2026 Form 1040 has **no ACTC
opt-out checkbox**; `c2_14` is the unrelated Form 8888 refund indicator and must
not be used for this election. An opt-out preserves nonrefundable credit and
omits refundable worksheet amounts.

Regression coverage includes zero income, earned-income floor/cap/rounding,
combat pay, CTC/ODC eligibility, phaseout boundaries, joint phaseout, AMT graph
ordering, unrelated payroll taxes, explicit opt-out, missing reviews, rejected
caller totals and static PDF reconciliation. CTC, ACTC, opt-out and limited ODC
examples were rendered and inspected; flattened output has no AcroForm or page
annotations. The 2025 Schedule 8812 regression suite remains intact.

## Three-child payroll method

The supported ordinary W-2 route now waits for finalized EIC, actual boxes 4/6,
Form 8959 and Schedule 2. The 2026 Schedule 8812 withholding worksheet uses
W-2 Social Security plus Medicare withholding, adds Form 8959 line 7 and subtracts
its line 22; the latter includes uncollected code B/N amounts under the
[2026 Form 8959 instructions](https://www.irs.gov/pub/irs-dft/i8959--dft.pdf).
Part II-B line 22 uses Schedule 1 line 15 and Schedule 2 lines 16c/17c; line 24 deducts finalized EIC
and finalized Schedule 3 excess Social Security credit, reconciled to W-2.
The shared calculator chooses the larger earned-income/payroll method and caps
it at line 17. Missing actual withholding stops the route rather than estimating
it from wages. Supported business owners now supply their half-SE-tax deduction
and one-half of Form 8959 line 18 Additional Medicare tax; the latter belongs
in line 21. The Medicare earnings must match the replayed SE sources. RRTA
remains unfinished. See [current EIC](EIC-CURRENT.md).

## Business worksheet integration

The credit replays the same owner-identified service-business sources used by
Schedule C/SE and AGI. Ordinary signed profits enter earned-income line 2b;
statutory gross wages enter line 2a from Schedule C line 1. Source expenses reduce
AGI but do not replace statutory gross income on this worksheet. Line 5 uses
the actual sum of each owner's SE deduction. All combat pay is included once,
regardless of EIC election. Farm/optional methods and special exemptions remain
outside the current business source contract.

A business claim requires `business_inventory_reference`; the old absence answer
must be omitted. Both credits retain the source workpaper. Tests cover profits,
losses, statutory expenses, subthreshold SE, combat elections, separate joint
SE liability, the three-child payroll branch, and mismatched/contradictory sources.
The existing PDF builder replays these inputs for Schedule 8812.

## Energy carryforward integration

A retained `f5695` source now activates Worksheet B where required. `f8812`
calculates its line 14 before energy and line 15 afterward, then finalizes CTC,
ACTC and the downstream Schedule 3 total. This reuses the shared calculator and
retains the full worksheet and 2027 carryforward for review. No-dependent and
fully phased-out cases still resolve energy and attach Form 5695 when needed.
See the [current source and PDF contract](FORM5695-CREDIT-GRAPH.md).

## Still required

- Complete Part II-B for tier 1 RRTA credit, Puerto Rico, railroad compensation
  and broader self-employment sources. Pending EIC is never assumed zero.
- Complete Credit Limit Worksheets A/B beyond connected care, education and
  [energy carryforward](FORM5695-CREDIT-GRAPH.md). 2026 A uses Schedule 3 lines
  1, 2, 3, 4, 6d, 6f, 6l, 6m; B line 15 uses 5a, 6c, 6g, 6h. Part II-B line 22
  uses Schedule 1 line 15 and Schedule 2 lines 16c/17c, not the 2025 line names.
- Form 8862/disallowance exceptions, Form 8332, birth/death without a TIN,
  broader self-employment, foreign and territory cases and Medicaid waiver elections.
- EIC and child-credit source parity remain incomplete beyond the supported
  reviewed wage and service-business routes. The bundle retains the incomplete implementation label.
- Final forms/instructions, current MeF and business rules, product registration,
  and ATS acceptance.

Business integration verification: 625 regression tests passed across the 2026
and shared EIC/8812 suites. Typed business-credit/PDF tests and unit verification
also passed. Twelve synthetic settlement/EIC/8812 pages were reopened without
AcroForm or annotations and visually inspected for ordinary, statutory and joint
loss/Additional-Medicare cases. This does not establish filing or ATS acceptance.
