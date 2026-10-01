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
fixtures are authored for deferred bulk verification. These bounded correction
routes exclude coverage-family changes, moves, no-APTC months, overlaps, other
covered people, and unauthenticated determination bytes.

The same A-B-A source now supports **two** distinct `marketplace_error`
SLCSP corrections on covered APTC months of one identified policy. Each month
needs its own positive original and corrected column B amount, Marketplace
tool/contact determination, dated reference, and reviewed record SHA-256.
The Form 1095-A annual column B totals remain the original reported sums;
the two corrected amounts feed only the corresponding monthly Form 8962
calculations. Native MeF and PDF replay both source rows and the finalized
Schedule 2/Form 1040 repayment. A July $650 and August $700 determination
on the four-month middle policy raise a $804 baseline credit to $954 and
reduce $2,400 APTC excess to $1,446. Focused source, missing/tampered-record,
native/PDF, and full-return executor fixtures are authored but unrun. The
[2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962) direct
monthly reporting when corrected SLCSP changes by month. More than two
policies with corrections, overlapping policies, coverage-family changes,
moves, and source-byte authentication remain open.

The same source-reconciled distinct-month machinery also supports a
`marketplace_error` determination for **every covered APTC month** of the one
corrected policy. There is no separate count limit: the 2025 month range,
distinctness requirement, and positive original premium/SLCSP/APTC bound the
list to the applicable policy months. Every month retains its own dated
Marketplace reference and reviewed record hash, and unchanged policy months
still replay against the original 1095-A. A four-month middle policy with
May–August corrected SLCSP of $650, $700, $750, and $800 yields $1,304 PTC
and $1,096 excess APTC from the original $2,400 advance payments. Source,
calculation, native/PDF, duplicate-month, omitted-month, missing-record, and
executor full-return fixtures are authored but unrun. Other policy-count and
family variants and authentication of Marketplace determination bytes remain
open.

Both nonoverlapping same-state policies may now carry their own independently
determined `marketplace_error` SLCSP months for the same single filer. The
filing guard checks each policy's correction list against its own original
1095-A monthly columns, covered APTC months, distinct month numbers, dated
Marketplace references, and reviewed record hashes. Source aggregation and
native/PDF row replay select the active policy for each month; neither policy's
correction can alter the other's months or original annual totals. In an A-B-A
case, a January $650 determination on policy A plus May–August determinations
of $650, $700, $750, and $800 on policy B yield $1,354 PTC and $1,046 excess
APTC from $2,400 advances. Source/calculation/native/PDF, full-return,
missing-hash, and wrong-policy-month fixtures are authored but unrun. Two
policies with overlapping coverage and
other covered-family variants remain closed; Marketplace source-byte
authentication remains open.

## Three sequential corrected policies (implementation staged)

The same one-person, same-state route now accepts three distinct nonoverlapping
Form 1095-A policies when each has its own `marketplace_error` SLCSP correction
on a covered APTC month. The native and PDF guards replay each active month
against that policy's original premium/APTC and its dated Marketplace
determination reference and reviewed record hash. The existing source node
computes the corrected monthly SLCSP before Form 8962's contribution, credit,
and excess-APTC calculation. This follows the
[2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962) for
correct applicable SLCSP on monthly lines 12–23.

An authored January–April, May–August, September–December source graph has
$500 monthly premiums, $200 monthly APTC, and a $600 reported SLCSP on each
policy, with one independently determined $650 month on each. The expected
$954 credit and $1,446 excess APTC flow to Schedule 2 and Form 1040; native
monthly rows and PDF fields identify all three corrected months. Wrong-policy
month, missing hash, and changed Form 1040 tax fixtures are authored for the
deferred batch. Overlapping coverage, four or more corrected policies,
mixed-family ownership, authenticated Marketplace bytes, IRS acceptance, and
bulk test/XSD/PDF review remain open.
