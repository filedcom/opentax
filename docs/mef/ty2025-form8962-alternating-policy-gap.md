# TY2025 Form 8962: alternating same-state policies

The
[2025 Form 8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
use Form 1095-A columns A, B, and C for each covered month on lines 12-23. They
do not limit the number of same-state policy switches. This bounded route
accepts one single filer whose two identified Form 1095-A policies alternate
A-B-A (or switch again) without an overlap. Each policy names
the filer as its sole covered person, has the same Marketplace state as the
filed return, supplies all twelve monthly A/B/C values, and reconciles any
reported annual totals to those months.

The Form 1095-A node already sums monthly premium and APTC while counting the
active SLCSP once. Native Form 8962 independently checks policy identity, state,
no-overlap monthly ownership, household income, poverty table, contribution,
each monthly premium/SLCSP/APTC and credit, totals, and finalized Schedule 2/3
and Form 1040. The PDF instance invokes the same native check. The former
one-switch ceiling now remains only for the separately sourced interstate move
route. A source-confirmed zero-coverage month between two alternating policies
is now accepted when both policies have zero premium, SLCSP, and APTC in that
month. The calculated Form 8962 row must also have zero policy, assistance,
credit, and APTC amounts. Native MeF omits its monthly group and the PDF leaves
its columns blank. Covered months still reconcile to the identified policies,
annual Form 1095-A totals, Schedule 2, and Form 1040. This source pattern does
not independently authenticate Marketplace coverage or cancellation records.

The monthly boundary now also accepts three through twelve distinct same-state
policies for the same one-person coverage family when each month has at most one
active policy. Every policy identifies the filer as its sole covered person,
supplies twelve A/B/C columns, and reconciles its annual totals when reported.
Calculation aggregates the source once; native MeF checks each row against the
active policy and finalized return; PDF projection invokes that native check.
A four-policy sequential source/calculation/native/PDF fixture and a
duplicate-identity rejection case are authored but unrun. Concurrent policies,
another covered person, another state, and SLCSP corrections remain outside
this extension.

Focused source calculation, native XML, PDF projection, and tampering cases are
written but unrun under the build-first instruction. Other multi-policy
overlaps, interstate, shared-tax-family, and
corrected-SLCSP paths are not admitted by this extension. IRS XSD, filled-PDF
visual, business-rule, and ATS verification remain open.

One further bounded A-B-A route now allows a single `marketplace_error` SLCSP
correction on one covered APTC month of one policy. The Form 1095-A node keeps
the originally reported monthly column B and annual statement totals separate
from the independently determined amount it sends to the monthly calculation.
Native MeF requires a positive original and corrected SLCSP, a positive
premium/APTC, a dated Marketplace tool/contact determination, its reference,
and a reviewed record SHA-256. It checks the corrected month's PTC and the
unchanged months against both source policies, Schedule 2/3, and Form 1040.
PDF projection runs the same filing guard. The [2025 Form 8962 line 10
instructions](https://www.irs.gov/instructions/i8962) direct a taxpayer who
has reason to believe the Marketplace reported a wrong SLCSP to determine the
correct amount and use monthly lines when it varies. Positive and tamper
fixtures are authored for deferred bulk verification. This route excludes
multiple corrected months, coverage-family changes, moves, no-APTC months,
overlaps, other covered people, and unauthenticated determination bytes.
