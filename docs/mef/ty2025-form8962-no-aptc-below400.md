# TY2025 Form 8962: no-APTC claim at 100%-399% FPL

The existing zero-APTC, one-person, one-policy route now reconciles the
applicable figure from the TY2025 Form 8962 Table 2 at 100%-399% of the federal
poverty line. This applies to both monthly lines 12-23 and annual line 11 when
the corrected SLCSP is unchanged for all twelve months. The same route already
handled income above 400% FPL; no new source fields or alternate filing shape
were added.

## Source and calculation

- A current Form 1095-A must identify the single Marketplace policy, the single
  covered filer, each covered month's premium, and zero APTC.
- Every covered month must have a matching `no_aptc` SLCSP correction and a
  Marketplace determination record. The monthly evidence must also show the
  premium paid in full by the unextended TY2025 return due date.
- The filing boundary independently compares Form 1040 AGI, modified AGI,
  household income, poverty line/percentage, Table 2 applicable figure, annual
  and monthly contributions, Form 8962 credit, Schedule 3 line 9, and Form 1040
  line 31. MeF and the PDF descriptor both use this boundary.
- At 200% FPL with $30,120 income, Table 2 gives 0.0200. The annual contribution
  is $602 and the monthly contribution is $50. A $700 SLCSP for six months and
  $800 for six months yields $8,400 on monthly lines. A constant $700 SLCSP
  yields $7,798 on annual line 11.

The [IRS TY2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
specify Table 2, the zero-APTC SLCSP redetermination, the annual-versus-monthly
line choice, and the premium-payment timing rule.

## Still unsupported by this route

- A zero-APTC household below 100% FPL, including the lawfully present exception
  that needs additional eligibility facts.
- More than one covered person or policy, shared policy allocations, married
  filing separately, or a year-of-marriage alternative calculation.
- Changes in coverage family, interstate moves, QSEHRA, self-employed
  health-insurance deduction circularity, and other MEC interactions when zero
  APTC was paid.
- Missing or inconsistent Marketplace SLCSP determinations, missing monthly
  payment evidence, partial payments requiring the special 2025 no-termination
  test, and premiums paid after the unextended due date.

The added focused cases cover positive monthly and annual 200%-FPL MeF/PDF
projection paths, income-figure tampering, absent monthly evidence, and the
below-100%-FPL stop. These cases have not been run as part of this isolated
implementation tranche; they belong to the coordinated full validation batch.
