# Current TY2026 education credit source route

Implemented October 15, 2026. `f8863` is in the internal source registry and
static development PDF bundle. It is not public filing registration or full
education-credit parity. The broader [graph contract](FORM8862-8863-EIC-GRAPH.md)
still describes unfinished routes.

## Shared calculation and year boundary

The 2026 node calls the existing `calculateAocStudentLines`,
`calculateForm8863AllowableRatio`, and `calculateForm8863Line19` helpers.
It does not pass 2026 documents through the 2025 source validator or substitute
2025 dates. General filer/dependent facts determine student identity; finalized
AGI and tax feed education after dependent care. Schedule 3 line 3 then reduces
Schedule 8812's available tax. Form 1040 receives refundable AOTC on line 29.
The child-credit review now explicitly allows dependent-care and education
credits; other unimplemented nonrefundable credits remain gated.

Authority: [2026 draft Form 8863](https://www.irs.gov/pub/irs-dft/f8863--dft.pdf)
and [September 11, 2026 draft instructions](https://www.irs.gov/pub/irs-dft/i8863--dft.pdf),
checked October 15. Pinned form SHA-256 is
`b037225d76b74a73740398c3ea757d2cde892d4fc1cfe65da35659de8bbddd90`;
instructions SHA-256 is
`9e6bc190a572a4d2b131f493a55405297359d05fdc96eb8b698bc4937be6c745`.

## Supported sources

- Per-student, per-institution payment ledgers retain term dates, expense types,
  refunds, tax-free aid allocations and expenses already used for other tax
  benefits. Reduction totals cannot exceed a payment. Cents aggregate before
  student-level whole-dollar rounding. LLC excludes outside course materials;
  AOTC includes qualifying required materials.
- Current 1098-T identity, payments, scholarships, insurance and early-period
  checkbox reconcile to the ledger. Corrected copies identify superseded
  documents. Prior-year 1098-T box 7 remains a separate answer. Duplicate student,
  institution, payment and document identities are rejected.
- Terms begin in 2026 or January-March 2027. A 2027 half-time term needs a
  qualifying 2026 payment before it establishes AOTC enrollment eligibility.
  AOTC also checks prior credit years, first-four-years history and felony status.
- Missing required 1098-T records need a request after February 1, 2027 and before
  filing, cooperation evidence and expense substantiation. The supported
  not-required exception is noncredit LLC courses; other exceptions are pending.
- Both credits apply the new 2026 employment-valid SSN rule. One qualifying joint
  filer suffices, including when the student spouse lacks that SSN. A dependent
  student must independently meet the SSN requirement and be actually claimed.
- Under-24, nonjoint refundability uses the primary filer's age, parent survival,
  full-time months, complete support ledger and actual earned income. Full-time
  scholarships are excluded from support. Exactly half support is tested
  separately from less than half. No student/deemed-care earnings substitute for
  actual wages. Supported business sources now enter through the distinct
  personal-services review below; foreign earned-income routes remain unfinished.

The public claim accepts source records and review evidence, not adjusted
expense totals or calculated credits. Claim-level reviews exclude another
return actually claiming either filer, foreign exclusions, taxable scholarships,
prior recapture, unsupported credit-limit offsets and Form 8862 requirements.

## Business earnings and dependent deductions

The education claim identifies the actual business inventory. AGI replays that
inventory before forwarding it; education verifies its filer identities. For a
potential under-24 nonjoint support test, `earned_income_review` identifies every
business once and distinguishes the owner's services alone, material services
and capital, and statutory employment. Older and joint filers do not need an
otherwise inapplicable support review.

The [2026 Form 8863 instructions, line 7](https://www.irs.gov/pub/irs-dft/i8863--dft.pdf)
govern this workpaper. Service-only activity contributes signed net profit less
the allocated deductible half of SE tax. Where services and capital are both
material, the calculator uses the smaller of documented reasonable compensation
and 30% of profit after that deduction. Statutory employee compensation contributes
gross receipts once. The existing QBI owner allocation supplies each activity's
share of the SE deduction; education does not treat QBI itself as earned income.
The primary filer's business amount combines with actual taxable wages before
the half-support comparison. Fractions remain intact at this comparison.

Dependent standard deductions use a different bridge: taxable wages plus
Schedule 1 line 3 net profit, including statutory expenses, less line 15. The
shared standard-deduction calculator applies the 2026 $1,350 minimum, $450 add-on
and filing-status ceiling. See [2026 Publication 505, Worksheet 2-4](https://www.irs.gov/publications/p505)
and the current [1040 dependent worksheet](https://www.irs.gov/instructions/i1040gi).
The latter still describes 2025 and is a semantic comparator; final 2026 full
instructions remain a release check.

For potential Form 8615 returns, the deduction owner separately screens income
under the [2026 Form 8615 instructions, line 1](https://www.irs.gov/pub/irs-dft/i8615--dft.pdf).
It removes service-business income before the SE adjustment, restores business
losses so they cannot hide investment income, retains income attributable to
capital, deducts the savings early-withdrawal penalty, and rounds the line-1
amount once. More than $2,700 still stops for the unfinished child-tax owner;
passing this screen is not implementation of Form 8615 or its support test.

Tests cover exact half-support and cent-over boundaries, the capital cap and a
lower reasonable allowance, statutory gross versus deduction net, source/owner
mismatches, dependent deductions, business losses and the $2,700/$2,701 screen.
A combined return verifies care, education and child-credit tax-capacity order.
The final 638-test 2026/shared education and deduction regression suite and
repository unit checks passed. Twelve focused typed business tests and the
complete-return PDF test cover this integration. Seven synthetic 1040/8863 pages
were reopened, rendered and visually inspected on October 15: refundable and
nonrefundable amounts, the under-24 checkbox and dependent deduction reconcile,
with no AcroForm or page annotations remaining.

## Draft output and verification

[Form 8863 mapping](../pdf/PDF-FORM8863-MAP.md) reconciles AGI, total tax,
dependent-care credit and both education-credit destinations before rendering.
One totals page precedes one Part III per student; additional institution pages
stop at line 22. Extra pages never repeat student expenses. Cover pages and
interactive fields are removed from the static development artifact.

Tests cover source reconciliation, missing forms, AOTC/LLC differences, phaseout,
SSN rules, under-24 boundaries, credit ordering, multiple students/schools,
rejected destination mismatches and static PDF structure. Synthetic examples do
not constitute ATS acceptance.

## Remaining gates

Foreign institution addresses; other 1098-T exceptions; scholarships allocated
between education and living costs or elected into income; service scholarships;
prior-year adjustments/recapture and amendments; cross-institution aid allocation;
separately issued insurer statements; fuller special dependency/ownership cases;
business sources outside the supported Schedule C/SE inventory; Form 8862 and foreign/prior-AMT credit-limit
inputs; final forms/instructions, current MeF/rules, public registration and ATS.
