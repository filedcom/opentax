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
  actual wages. Current business/foreign earned-income routes are rejected.

The public claim accepts source records and review evidence, not adjusted
expense totals or calculated credits. Claim-level reviews exclude another
return actually claiming either filer, foreign exclusions, taxable scholarships,
prior recapture, unsupported credit-limit offsets and Form 8862 requirements.

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
self-employment earned income; Form 8862 and foreign/prior-AMT credit-limit
inputs; final forms/instructions, current MeF/rules, public registration and ATS.
