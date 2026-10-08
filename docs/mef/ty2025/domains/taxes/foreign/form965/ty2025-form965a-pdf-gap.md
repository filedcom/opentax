# TY2025 Form 965-A printable-return gap

Static source, native, and blank-PDF audit began on 2026-09-28. A bounded PDF
descriptor and direct parity fixtures are now authored; no filled artifact,
test, typecheck, XSD, or ATS run was performed. Form 965-A remains the
[IRS January 2021 three-page form](https://www.irs.gov/pub/irs-pdf/f965a.pdf)
used with the reporting-year return; its
[instructions](https://www.irs.gov/instructions/i965a) require the historical
Part I net-liability computation and a cumulative record of actual Part II
payments, not just the current-year Schedule 2 amount.

The registered native `f965a.ts` route parses a `f965` ledger, computes unpaid
liability and the reporting-year payment, links signed 965-C/D/E copies where
supplied, and checks only the **aggregate** current-year payment against
Schedule 2 line 20 when pending return context exists.
`nodes/inputs/f965/index.ts` stores prior-year tax-with/without-965 numbers,
eight cumulative installment-payment amounts, and free-text
`source_document_reference` / `current_year_payment_reference`. It does not
import or verify the filed 2017-2020 Form 965-A/965 calculation, prior payment
record, or an IRS payment confirmation. The arithmetic can be internally
consistent while the printed historical columns are wrong. The current test
fixture's 2018 inclusion and eight payments is therefore not independent
evidence for a positive print route.

The official AcroForm has 498 field-tree entries over three pages. Page 1
contains the amended checkbox, identity/reporting year, eight Part I rows across
columns (a)-(k), and Part II columns (a)-(f). Page 2 continues the same eight
Part II rows through columns (g)-(k) and has year-grouped Part III S-corporation
rows. Page 3 has ten Part IV annual deferred-liability rows. A narrow one-row
projection would still need the prior filed Part I figures and each actual Part
II payment independently reconciled; multi-liability, S-corporation, transfer,
amended, and overflow branches need separate row placement and source review.
The blank form explicitly calls for additional sheets when the printed rows are
insufficient.

The PDF descriptor now projects one unadjusted original 2017–2020 installment
liability to its matching preprinted Part I and II row across pages 1 and 2,
including all eight actual installment payments, unpaid liability, and the
reporting-year payment. It retains the official third page, blank when no
S-corporation deferral exists. Its source calculation and native/PDF projection
use the same parsed `f965` ledger and compare the payment to finalized Schedule
2 line 20. Amended returns, transfers, S-corporation rows, and multiple
liabilities reject in this bounded PDF projection; authored positive/tamper
fixtures remain unrun. The PDF export gate stays active.

**Remaining evidence prerequisite:** require a versioned prior-filed-return
liability record and payment evidence linked to each installment and reporting
year; reconcile them to the current `f965` ledger. Then expand row placement and
overflow behavior, and run the deferred XSD and filled-PDF visual batch. A
current-year payment of zero is not, by itself, a no-file decision when a
section 965 liability exists or was unpaid during the year.
