# Form 4136, tax year 2025

Source: [2025 Form 4136](https://www.irs.gov/pub/irs-pdf/f4136.pdf) and
[2025 instructions](https://www.irs.gov/instructions/i4136), checked
2026-09-27. The TY2025v5.4 `IRS4136.xsd` is the MeF field authority.

The 2025 form added Part I business-activity questions and Part II column (d),
actual fuel cost from records. The prior flat gallon fields could calculate a
number without either fact, so the input is now a line-indexed claim array with
an affirmed single qualifying business, equipment details, purchase-record and
no-duplicate-claim confirmations, ultimate-purchaser status, units, and actual
fuel cost on every claim.
The input also requires the printed undyed-fuel, no-waiver, no-credit-card-
certificate, and non-highway-vehicle certifications on affected claims.
The represented line rates are 1a/1b $.183, 2b $.193, 3a/3b $.243, 4a/4b
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
all line 11 alternative fuels and the reduced-rate type 5 bus branch, and
reconciles its line 17 source total against Schedule 3 line 12. The PDF
descriptor maps the actual 2025 AcroForm widgets across all four pages,
including dollars/cents fields and a statement for repeated use codes. It
refuses bus claims because the preprinted rate is read-only and the required
"Bus" and reduced-rate overlay has not been built or visually checked. Its
direct and local XSD/PDF cases are written but unrun. Filled PDF rendering,
the full test batch, TY2025v5.4 XSD, and 2025 business rules remain open.
Multiple business activities require separate Schedule A (Form 4136)
documents and are currently refused. The undyed-kerosene home-use exception,
other Part II lines, seller/purchase-date source identities, other rate-by-use
exceptions, and cross-form duplicate claims are not modeled yet. No IRS ATS
acknowledgment exists.
