# Form 4136, tax year 2025

Source: [2025 Form 4136](https://www.irs.gov/pub/irs-pdf/f4136.pdf),
[2025 Schedule A](https://www.irs.gov/pub/irs-prior/f4136sa--2025.pdf), and
[2025 instructions](https://www.irs.gov/instructions/i4136), and
[Publication 510](https://www.irs.gov/publications/p510), checked
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
Line 1a now also excludes noncommercial motorboat use, and line 2b requires
confirmation that the aviation gasoline was used outside the aircraft's
propulsion system, matching the specific 2025 instructions.
Export claims on lines 1d, 2c, 3e, and 4d now require the kind of retained
IRS-accepted export proof and a nonempty record reference instead of a bare
export affirmation. The proof remains with the taxpayer's records; it is not
included as a repo file or return attachment.
For line 6a, the registered ultimate vendor is not treated as the ultimate
purchaser. Each government sale has a date, buyer name/EIN, gallons, and
retained Model Certificate P reference. The sales total must equal the claim;
the IRS-issued UV registration, tax-settlement method, undyed fuel, and sales
records are required. The government-buyer MeF statement and PDF continuation
are emitted from those rows. Line 6b is a separate UB-registered vendor route
for undyed diesel sold for certain intercity and local buses. It requires sale
date, buyer name/address, gallons, tax-settlement and sales records, and a
signed, unexpired Model Waiver N retained for each sale. The waiver can be
invoice-specific or cover an account for no more than one year. Its gallons
reconcile to the claim, and the native XML and both PDF forms map the $.17
line 6b credit. The two line 6 routes cannot carry conflicting registrations
because the printed form has one shared field. Source, XML, PDF, and local XSD
cases are written but unrun; neither filled PDF nor IRS business rules have
been verified.
Line 7 now has three registered-kerosene vendor routes. Line 7a requires a UV
registration, state/local government sale records and unexpired Certificate P,
then emits the linked native buyer statement and a PDF buyer list. Line 7b
requires a UP registration and blocked-pump sale records, including fixed
location, conspicuous nontaxable-use notice, qualifying pump access, and buyer
name/address when a sale exceeds five gallons. Line 7c requires a UB
registration and the same Model Waiver N sale facts as diesel bus line 6b.
Government sales now also affirm that a state-issued credit card was not used.
Lines 7a and 7b share the printed and MeF cost/credit group; line 7c has a
separate $.17 group. Conflicting registrations on the one printed line 7 field
are rejected. Source, XML, PDF, and local XSD cases are written but unrun;
filled render and IRS business-rule review remain open.
Line 8a/8b commercial-aviation vendor claims now require a UA registration,
sales records that reconcile to gallons and have distinct sale references,
confirmed non-foreign-trade commercial
aviation, kerosene taxed at $.219/$.244 respectively, tax settlement, and a
retained, signed, unexpired Model Waiver L. The waiver source distinguishes a
single invoice from an account period of no more than one year. Their native
MeF groups and parent/Schedule A PDF widgets are mapped, with source, XML,
local XSD, and PDF cases written but unrun. Line 8c now separately requires a
UA registration, kerosene taxed at $.244, reconciled sale records for nonexempt
noncommercial aviation, tax settlement, and a signed, unexpired Model
Certificate Q for the sale or a covering account period. It maps to the native
MeF group and parent/Schedule A PDF row, with source, XML, XSD, and PDF cases
written but unrun. Lines 8d/8e now separate $.244 and $.219 nontaxable
noncommercial aviation sales, require the applicable UA registration or UV
registration for type 14, reconcile each type of use to distinct sale records,
and require Model Waiver L with the matching selected use or government
Certificate P as appropriate. Their
native repeated-use MeF groups and parent/Schedule A PDF rows are mapped.
Line 8f links the foreign-trade LUST credit to those exact type 09 sales on
8d/8e; its gallons, cost, registration, and vendor settlement must agree with
the base claims. Source, XML, XSD, and PDF cases are written but unrun. Filled
PDFs, IRS business-rule review, and ATS acceptance remain open.
Registered credit-card-issuer lines 13a-13c now use CC registration and
card-purchase records tied to the government buyer, Model Certificate R's
account and two-year period, both buyer-tax and vendor-reimbursement routes,
and reconciled gallons and fuel costs. Line 13c distinguishes kerosene taxed
at $.219 from $.244. For the latter the credit rate is $.243, the PDF's
preprinted description and rate are overlaid, and a native
`NontxUseFuelsCrCardUsersStmt` is linked to the MeF group. The local XSD fixes
line 13c's credit reference number to 369 and provides a `TAXEDAT244` marker;
that representation and the rate overlay need full-batch XSD, filled-PDF, IRS
business-rule, and ATS verification. Mixed source tax rates on one 13c return
are rejected because the schema has one line 13c group. Source, XML, PDF, and
XSD cases are written but unrun.
Line 14a accepts the 2025 use codes for diesel-water emulsion and applies
the reduced $.124 rate only to bus use (type 05); line 14b uses the export
rate and requires retained proof. Both require the emulsion's water percentage
and a record reference for its EPA-registered additive under Pub. 510's fuel
definition. Their source-to-MeF and PDF cases are written but unrun.
Line 15a is a separate registered-blender claim, not an ultimate-purchaser
claim. It requires an IRS-issued M registration number, production records,
gallons of undyed diesel taxed at $.244 that went into the emulsion, at least
14% water, an EPA additive registration reference, and sale or use in the
blender's trade or business. The $.046-per-gallon credit uses those input diesel
gallons. One native blending-certification statement is built per claim and
linked to the Form 4136 credit; the parent and Schedule A PDFs map line 15a
and the parent appends a certification page. Source, XML, PDF, and local XSD
cases are written but unrun, and the filled PDFs and IRS business rules remain
unverified.
Lines 16a and 16b allow an exporter who is not the ultimate purchaser. The
source retains the exporter-of-record and export-record facts, typed export
proof, the $.001 fuel-tax rate, and the exact fuel kind. Dyed diesel and
gasoline blendstock share printed line 16a but stay distinct in source rows;
dyed kerosene uses line 16b. Their XML and PDF cases are written but unrun.
Gasoline line 1c now requires a permitted use code and a noncommercial-
motorboat exclusion; types 13/14 also require no-waiver and no-credit-card-
certificate confirmations. Export line 1d requires retained export proof.
The represented line rates are 1a/1b/1c $.183, 1d $.184, 2a $.150,
2b $.193, 2c $.194, 2d $.001, 3a/3b/3c $.243, 3d $.170,
3e $.244, 4a/4b $.243, 4c $.170, 4d $.244, 4e $.043, 4f $.218,
5a $.200, 5b $.175, 5c $.243, 5d $.218, 5e $.001,
11a-d/11h $.183, and 11e-g $.243. IRS type-of-use codes are
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
and distinct diesel train, bus, and export groups with undyed-fuel and
claim-specific confirmations,
and kerosene bus, export, and reduced-tax groups. Lines 4e and 4f require
their respective $.044/$.219 actual excise tax rate and type of use 02 under
the 2025 instructions, although the XML schema permits additional use codes;
aviation kerosene lines 5a-5d also require the corresponding $.244/$.219
excise tax rate. Lines 5a/5b carry commercial-aviation facts and line 5e
carries the foreign-trade LUST fact; all line 5 claims require the no-waiver
confirmation.
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
