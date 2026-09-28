# TY2025 Form 4797 investment section 1245 route

Status: bounded source-to-node, native, and PDF build written on 2026-09-28.
No test, XSD, filled-PDF render, IRS business-rule, or ATS validation ran.

The [2025 Form 4797 instructions](https://www.irs.gov/instructions/i4797)
direct depreciation recapture for depreciable property held for investment
through Part III, with ordinary recapture on line 31/line 13. For investment
property, excess gain belongs on a "From Form 4797" Form 8949 row with its
dates and basis columns blank. The checked-in TY2025 v5.4 IRS4797 schema
has a repeating `PropertyDispositionGain` row followed by the Part III
summary amounts. The official fillable PDF has four Part III property
columns.

The public `form4797_investment_1245` input accepts one object with an
`investment_1245_dispositions` array. It routes the property facts directly
to the existing Form 4797 calculation node and rejects unrelated aggregate
fields at intake. An executor-path case is written but unrun.

The new source records each property ID, dates, gross price, cost or basis
plus sale expense, depreciation allowed or allowable, and references for
the sale, basis, and depreciation schedule. It requires explicit
investment-use, section 1245 classification, and direct-sale/no-special-
exception affirmations. The calculation derives adjusted basis, total gain,
ordinary recapture as the lesser of gain or depreciation, and excess gain.
The Form 4797 node routes ordinary recapture to Schedule 1 line 4 and the
remaining gain through a linked Form 8949 box F transaction. MeF and PDF
recompute the property amounts and reject missing or mismatched links.

This bounded route permits one to four properties and no overlapping Form
4797 aggregate or passive source. It does not yet model business-use
property, holding of one year or less, installment sales, exchanges,
involuntary conversions, section 1250/1252/1254/1255 classes, special
recapture exceptions, or additional Form 4797 copies. The older aggregate
recapture fields remain rejected for filing. Document references are
assertions, not independent verification of the records or classification.
