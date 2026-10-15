# Current 2026 earned income credit route

Implemented October 15, 2026 in `sourceRegistry2026`. This remains an incomplete
2026 development calculation and draft PDF route, not a registered filing product.

## Authority and shared calculation

The [2026 draft Publication 1040](https://www.irs.gov/pub/irs-dft/p1040--dft.pdf),
printed pages 16–27, supplies the published EIC table. The pinned SHA-256 is
`407bc35ab09aaf034689341d7469b9b082cd2ceaa652e38ca5874c1dd1c3f12e`.
[Rev. Proc. 2025-32 §4.06](https://www.irs.gov/irb/2025-45_IRB) supplies the
annual thresholds and $12,200 investment-income limit. The adapter reuses the
2025 eligibility and earned-income/AGI two-lookup calculation through an explicit
annual configuration; the existing 2025 node keeps its table and defaults.

`tooling/extract_eic_table_2026.py` reproduces 1,405 bands and 11,240 cells from
those pinned bytes, with eight exact-dollar terminal footnotes. The evidence CSV
retains each source PDF page and starred cell. Runtime lookup uses the published
cells, including eight maximum-credit transition cells that differ from a simple
midpoint formula. Tests compare all band endpoints and footnotes with the CSV
and independently check statutory percentages outside the transition cells.
Run the extractor with Python/PyMuPDF and Deno available; it formats its output.

## Source contract and graph

The public `eitc` singleton accepts tax year, review references, prior-disallowance
facts, claimant/child eligibility reviews and a combat-pay election. It rejects
caller credit totals, child counts and calculated income. General supplies filer
identity, SSN validity/timeliness, full-year tax residence and reviewed child
identity/relationship/age/student/disability/home facts. Child counts are
recomputed from those source rows; every qualifying child needs a matching review,
even when only the first three fit on Schedule EIC. AGI supplies normalized earned
wage lines and the investment-income floor. W-2 supplies combat pay by recipient.

Ordinary wage cases support zero through three-or-more qualifying children and
childless eligibility. Explicit reviews exclude unsupported business, rental,
passive, capital-disposition, special-wage, foreign and community-property cases.
Missing reviews stop calculation; opt-out, no earnings, known disqualification
or complete AGI phaseout can finalize zero without a positive claim review.

The combat-pay option compares exclusion, taxpayer-only inclusion, spouse-only
inclusion and both spouses, with ties retaining exclusion. Combined elected pay
is rounded once. Form 1040 line 1i receives only elected pay; taxable wages/AGI
are unchanged. ACTC includes all combat pay independently of the EIC election.
Retained calculation evidence includes election comparisons and source inputs.
EIC finalizes Form 1040 line 27a and Schedule 8812's payroll-method EIC deduction,
then settlement and Schedule 3-A apply their existing benefit rules.

## Draft PDFs and verification

The [2026 Schedule EIC draft](https://www.irs.gov/pub/irs-dft/f1040sei--dft.pdf)
is pinned to `fc9784fd1f64b2ea53e86d9a23a2b946f317c1bb92885e18f8a614252dcf7ef3`.
The builder verifies the three-page/38-field inventory, recomputes the credit and
reconciles Form 1040 lines 27a, 11b and 1i before printing. Only the filing page is
included, in attachment sequence 43 before Schedule 8812 (47). Childless credit
adds no Schedule EIC. Printed child months follow the retained residency review,
including the special newborn/deceased and more-than-half-year rules.

Connected tests cover childless/child credits, joint combat elections, whole-dollar
aggregation, opt-out, missing/invalid SSN reviews, rejected supplied totals,
unsupported statutory-employee activity, three-child ACTC, actual payroll
withholding and Medicare reconciliation. PDF tests cover attachment order,
reconciliation and student, disabled and newborn children. Nine synthetic QA
pages were rendered and inspected, including both credit schedules, settlement,
Schedule 3-A and elected combat pay. Reopened output has no AcroForm or annotations. The combined 2026 and shared
EIC/child-credit/general regression run passed 559 tests; the repository unit
command, targeted type checks and changed-file formatting/lint checks passed.

## Still required

- Dependent parents claiming child-based EIC: [IRC §32(c)(1)](https://uscode.house.gov/us/usc/119-120/t26/s32/)
  limits the general dependency exclusion to childless filers. The current adapter
  stops for a separate review route instead of incorrectly finalizing zero.
- Form 8862 recertification, competing-child/tiebreaker cases, separated-spouse
  MFS eligibility and self-only EIC with a qualifying child lacking a valid SSN.
- Complete earned-income/Worksheet B, business/farm/passive/rental/disposition
  investment-income treatment, Medicaid waiver elections, clergy, retirement
  disability wages, foreign/territory and community-property cases.
- Final 2026 Form 1040 instructions and Publication 596: the draft URLs still
  returned 2025 material when checked. Those are comparators, not final 2026
  authority; refresh before filing and recheck worksheet/eligibility instructions.
- Complete current MeF/business rules, public product registration and ATS.
