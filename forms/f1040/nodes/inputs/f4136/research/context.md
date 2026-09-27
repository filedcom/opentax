# Form 4136, tax year 2025

Source: [2025 Form 4136](https://www.irs.gov/pub/irs-pdf/f4136.pdf),
[2025 Schedule A](https://www.irs.gov/pub/irs-prior/f4136sa--2025.pdf), and
[2025 instructions](https://www.irs.gov/instructions/i4136), checked
2026-09-27. The TY2025v5.4 `IRS4136.xsd` is the MeF field authority.

The 2025 form added Part I business-activity questions and Part II column (d),
actual fuel cost from records. The prior flat gallon fields could calculate a
number without either fact, so the business input is now a line-indexed claim
array with a primary qualifying activity, equipment details, purchase-record
and no-duplicate-claim confirmations, ultimate-purchaser status, units, and
actual fuel cost on every claim. A separate tagged `home_kerosene` input covers
the IRS line A exception for undyed kerosene purchased away from a blocked pump
and used at home for heating, lighting, or cooking. It requires the purchase,
use, and nonduplicate facts, allows only line 4a/type 08, and omits business
lines B-F in XML and PDF.
The input also requires the printed undyed-fuel, no-waiver, no-credit-card-
certificate, and non-highway-vehicle certifications on affected claims.
Gasoline line 1c now requires a permitted use code and a noncommercial-
motorboat exclusion; types 13/14 also require no-waiver and no-credit-card-
certificate confirmations. Export line 1d requires an export confirmation.
The represented line rates are 1a/1b/1c $.183, 1d $.184, 2a $.150,
2b $.193, 2c $.194, 2d $.001, 3a/3b $.243, 4a/4b
$.243, 5c $.243, 5d $.218, 11a-d/11h $.183, and 11e-g $.243. IRS type-of-use codes are
required and constrained to the local XSD for variable-use lines. This model
does not assert eligibility solely from gallon quantities.
Each claim now names its measurement unit. Lines 1-5 and non-equivalent line
11 fuels use gallons; line 11 LPG, CNG, and LNG may use gallons, GGE, or DGE
as directed by the 2025 instructions.
The MeF quantity element does not convey the unit, so source records retain it.

All represented credits sum to refundable Schedule 3 line 12, which flows to
Form 1040 line 31. The older research note's division between nonrefundable
off-highway fuel and refundable farm fuel was wrong for the 2025 form.

The native IRS4136 XML builder now serializes these represented claims, including
separate gasoline line 1c detail and line 1d export groups,
plus aviation-gasoline commercial-use, export, and foreign-trade LUST groups,
all line 11 alternative fuels and the reduced-rate type 5 bus branch, and
reconciles its line 17 source total against Schedule 3 line 12. The PDF
descriptor maps the actual 2025 AcroForm widgets across all four pages,
including dollars/cents fields and a statement for repeated use codes. For
bus claims, its page-3 decoration covers the read-only preprinted standard
rate, writes the reduced rate and "Bus," and sends mixed-rate rows to a detail
statement. The bus overlay has not been visually checked yet. Its
direct and local XSD/PDF cases are written but unrun. Filled PDF rendering,
the full test batch, TY2025v5.4 XSD, and 2025 business rules remain open.
Multiple activities now use the primary business plus `additional_activities`.
Each is validated separately; claim credits round to cents before totals are
combined. When more than one activity is present, the MeF bundle builds one
official four-page Schedule A (Form 4136) PDF per activity as a binary
attachment, and Form 4136 references each attachment. The primary activity
must be affirmed as generating the most credit, and the input compares
calculated per-activity credit to enforce that ordering. The local schema
contains no Schedule A XML root, so the binary route needs IRS business-rule
and ATS verification. Exact source-PDF widget names have been mapped for both
forms, but neither filled PDF has been rendered and checked yet. The
2025 printed Form 4136 Part I says to show the activity generating the most
credit, but the Schedule A section of the 2025 instructions says the activity
generating the most qualifying fuel usage. The implementation follows the
printed form; this conflict needs IRS business-rule or ATS resolution before
claiming complete multi-activity support. The
input rejects mixed measurement units on one combined fuel line until the
source conversion and rounding can be verified against IRS rules. The
other Part II lines, seller/purchase-date source identities, other rate-by-use
exceptions, and cross-form duplicate claims are not modeled yet. No IRS ATS
acknowledgment exists.
