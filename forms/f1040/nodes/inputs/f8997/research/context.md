# TY2025 Form 8997 research note

Form 8997 is the annual statement for a taxpayer who held an eligible QOF
investment at any time in the year, including a holding-only year. The form
reports opening deferred-gain holdings (Part I), new deferrals (Part II),
inclusion events and certain transfers (Part III), and closing deferred-gain
holdings and any deferred gain held during the year but not invested (Part IV).
Its columns include the QOF EIN, date, description, special
gain code, and original short-term/long-term character. Parts I and IV must
reconcile to the prior-year statement and current-year changes.

The [2025 Form 8997 and its instructions](https://www.irs.gov/pub/irs-prior/f8997--2025.pdf)
also require foreign-eligible-taxpayer and treaty-waiver answers, a Part III
no-1099-B disposal answer, special gain codes A-H when applicable, and
continuation totals. A noninclusion transfer can require the other taxpayer's
name, TIN, and transfer date in the description.

The [2025 Form 8949 instructions](https://www.irs.gov/pub/irs-prior/i8949--2025.pdf)
require QOF deferrals on separate code **Z** rows with negative adjustments,
and included previously deferred gains on code **Y** rows with positive
adjustments. The gain keeps its original short-term/long-term character.
Section 1231 cases can require linked Form 4797 and extra code O rows. QOF
disposition proceeds, adjusted basis, and any 10-year election are separate
facts from deferred-gain inclusion.

The public `f8997` input now uses one strict lot/event ledger and derives
Part I-IV rows and totals from it. The code-Z/Y row IDs and source references
are not yet joined to the actual Form 8949/4797 transactions or final return.
Part II/III compute therefore rejects; Part I/IV holdings have no tax output
but both exports reject the missing annual attachment. Unregistered native and
PDF projections exist for review, while the duplicate `form8997` intermediate
input rejects every investment. Do not route inclusion directly to Schedule D,
use adjustment code Q for these QOF rows, treat every inclusion as long-term,
or classify it as Form 2439 undistributed capital gain. See
`docs/mef/ty2025-form8997-gap.md` for the exact remaining activation blockers.
