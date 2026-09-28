# TY2025 Form 8864 source and filing boundary

Status: asserted gallon inputs now reject instead of producing a Schedule 3
credit. Focused negative cases are written but unrun. No MeF, PDF, XSD, IRS
business-rule or ATS acceptance is claimed.

The
[December 2025 IRS Form 8864 instructions](https://www.irs.gov/instructions/i8864)
say biodiesel, biodiesel-mixture, renewable-diesel and sustainable-aviation-fuel
credits expired for fuel sold or used after December 31, 2024. The small
agri-biodiesel producer credit survives for eligible fuel sold or used in 2025:
$0.10 per gallon through June 30 and $0.20 per gallon after June 30, subject to
its producer, feedstock, facility and transfer rules. The former local `f8864`
node granted $1.00/$1.10/SAF-rate credits from undated gallons and sent the
result directly to Schedule 3. That could create a wrong 2025 return.

The current public `f8864` input has no sale/use date, producer/registration
facts, feedstock origin, productive-capacity facts, transfer election or
pass-through allocation. It also has no source-backed Form 3800 Part III and
tax-liability route or native Form 8864 document. Every supplied legacy gallon
or SAF field, including an explicit zero, is now rejected. An empty object makes
no claim; unmodeled new fields reject rather than being silently stripped.

To support a direct small-producer credit, add a dated, source-verified
transaction contract and apply the correct rate and statutory qualifications,
then join Form 8864 to Form 3800 and Schedule 3 with native documents and
transfer/limitation rules. For a pass-through-only allocation, the
[Form 3800 instructions](https://www.irs.gov/instructions/i3800) generally allow
an individual to report the K-1/other allocation directly on Form 3800 without
recreating the source credit form. That separate source route needs its
K-1/1099-PATR code, allocating EIN, amount, passive status and per-source Part V
reconciliation. Neither route is implemented or excluded.
