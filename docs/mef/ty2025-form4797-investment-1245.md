# TY2025 Form 4797 investment section 1245 route

Status: bounded source-to-node, native, and PDF route validated locally on
2026-09-30. One-property and four-property full returns pass the TY2025 v5.4
XSD and generate nine-page filled packets. IRS business-rule and ATS validation
remain open.

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
fields at intake. Property descriptions longer than the MeF 20-character limit
now reject at intake.

The new source records each property ID, dates, gross price, cost or basis
plus sale expense, depreciation allowed or allowable, and references for
the sale, basis, and depreciation schedule. It requires explicit
investment-use, section 1245 classification, and direct-sale/no-special-
exception affirmations. The calculation derives adjusted basis, total gain,
ordinary recapture as the lesser of gain or depreciation, and excess gain.
The Form 4797 node routes ordinary recapture to Schedule 1 line 4 and the
remaining gain through a linked Form 8949 box F transaction. MeF and PDF
recompute the property amounts and reject missing or mismatched links.

The one-property packet has $8,000 total gain, $5,000 ordinary recapture on
Form 4797 lines 13/17/18b and Schedule 1 line 4, and $3,000 excess capital
gain on Form 8949, Schedule D, and Form 1040. The four-property packet fills
all Part III columns A-D and reconciles $38,000 total gain, $20,000 ordinary
recapture, and $18,000 excess capital gain. Both Form 4797 pages and the linked
Form 8949 page were rendered and inspected. Their local PDF snapshots are:

- `.state/research/ty2025-filled-pdf-review/2026-09-30-form4797-investment-1245/filled-return.pdf`
  (SHA-256 `5e8699b6df5730ca8b56a7615ba4fc89e9a0b7015b44f9bdb1980f25dcc0332a`).
- `.state/research/ty2025-filled-pdf-review/2026-09-30-form4797-four-investment-1245/filled-return.pdf`
  (SHA-256 `bbe867fd3ede05debf6b98d5e3d20a7dcd0d8be73d00f543db7c2798757a5e26`).

This bounded route permits one to four properties and no overlapping Form
4797 aggregate or passive source. It does not yet model business-use
property, holding of one year or less, installment sales, exchanges,
involuntary conversions, section 1250/1252/1254/1255 classes, special
recapture exceptions, or additional Form 4797 copies. The older aggregate
recapture fields remain rejected for filing. Document references are
assertions, not independent verification of the records or classification.
