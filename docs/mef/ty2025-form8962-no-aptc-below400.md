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

- A zero-APTC household below 100% FPL without the reviewed lawfully present
  exception.
- More than one covered person or policy, shared policy allocations, married
  filing separately, or a year-of-marriage alternative calculation.
- Changes in coverage family, interstate moves, QSEHRA, self-employed
  health-insurance deduction circularity, and other MEC interactions when zero
  APTC was paid.
- Missing or inconsistent Marketplace SLCSP determinations, missing monthly
  payment evidence, protected partial payments outside the documented issuer
  threshold route, and payments made after the unextended due date.

The focused Form 8962 source, calculation, MeF, and PDF cases pass: 148/148
across the relevant files. A separate full-return case passes from a $30,120
W-2 and twelve no-APTC Form 1095-A policy months through Form 8962's $8,400
credit, Schedule 3 line 9, Form 1040 line 31, twelve native monthly groups,
local TY2025 v5.4 XSD validation, and PDF packet generation. The PDF projector
shows $650 credit in January and $750 in July. The completed packet has not
yet had a visual review, and the final full regression remains open.

## Lawfully present exception below 100% FPL

The [2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
allow a taxpayer below 100% FPL to claim the PTC without APTC when the covered
individual is lawfully present and Medicaid-ineligible because of immigration
status, and the remaining applicable-taxpayer requirements hold. The existing
reviewed `lawfully_present` source status captures those facts. Native MeF now
accepts that status for the bounded single-enrollee, single-policy no-APTC
monthly and full-year annual paths; the Marketplace-estimate exception still
requires APTC.

A $10,000 W-2 gives 66% FPL and a zero applicable figure. Twelve covered
months at $800 premium with corrected SLCSP of $700 for six months and $800
for six months yield $9,000 on the monthly path. A constant $700 corrected
SLCSP yields $8,400 on annual line 11. Both full returns reconcile Form 8962,
Schedule 3 line 9, and Form 1040 line 31, pass local TY2025 v5.4 XSD, and
generate PDF packets. Removing the exception status rejects during native
projection. The underlying immigration, Medicaid, Marketplace, and payment
records are identified by entered review facts; their bytes have not been
authenticated. Filled-PDF visual review and the final bulk regression remain
open.

## Protected partial premium payment

The [2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
allow a credit for a month with an unpaid premium portion when a qualifying
payment threshold is met, the issuer provides coverage, and the amount paid is
enough to prevent termination. They require the premium used for the credit to
exclude the amount unpaid at the unextended filing due date. The single-policy,
zero-APTC monthly source now records each payment as either `paid_in_full` or
`protected_partial`. A protected record needs the issuer-confirmed threshold,
continued coverage, payment date and amount, and separate references and
SHA-256 identifiers for the payment and issuer confirmation. The source graph
retains the original Form 1095-A premium while sending only the amount paid to
Form 8962; MeF and PDF recompute that reduction from the raw source.

In the full-return case, January's Form 1095-A premium is $800 and $500 was
paid by April 15 against a $450 issuer-confirmed minimum. January's Form 8962
premium and credit are $500. The annual credit falls from $8,400 to $8,250,
and reconciles through Schedule 3 and Form 1040. The full return passes local
TY2025 v5.4 XSD and generates a PDF packet. A $600 threshold with only $500
paid rejects. The first grace month and emergency-order protection scenarios,
external issuer/payment-record authentication, PDF visual review, full bulk
regression, IRS business rules, and ATS remain open.
