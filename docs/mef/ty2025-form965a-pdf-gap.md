# TY2025 Form 965-A printable-return gap

Static source, native, and blank-PDF audit on 2026-09-28. No PDF descriptor was
added, no filled artifact was created, and no test, typecheck, XSD, or ATS run
was performed. Form 965-A remains the
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

**Decision for this build slice:** leave PDF export unsupported rather than
print caller assertions as a sourced Form 965-A. Before adding a descriptor,
require a versioned prior-filed-return/liability record and payment evidence
linked to each installment and reporting year; reconcile these to the current
`f965` ledger and Schedule 2; classify one bounded row/part layout and overflow
behavior; then write native/PDF parity cases and run the deferred XSD and
filled-PDF visual batch. A current-year payment of zero is not, by itself, a
no-file decision when a section 965 liability exists or was unpaid during the
year.
