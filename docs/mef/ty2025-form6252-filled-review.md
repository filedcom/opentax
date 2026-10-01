# TY2025 Form 6252 full-return PDF review

Two synthetic source-backed installment-sale returns were executed through the
TY2025 graph, native MeF bundle, local v5.4 XSD, and filled PDF packet on
2026-09-30. These checks cover current-year unrelated-party sales with a
determinable price and no depreciation, recapture, or interest allocation.

The first return sells vacant investment land for $100,000 with a $60,000
assumed mortgage, $40,000 basis, and $10,000 cash received. Form 6252 prints
the mortgage on line 6, the $60,000 gross profit and contract price on lines
16/18, a 1.00000 line 19 ratio, $20,000 on line 20, and $30,000 of installment
income on line 24/26. Schedule D line 11/16 and Form 1040 line 7a each print
$30,000. All five pages were rendered and inspected. The local full-return XSD
passes. The snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-form6252-land/filled-return.pdf`
with SHA-256
`86b932a5b8181e164eb0a0862669b8c6b3fcdd2ad95266208fb9e05f81eca9e9`.

The second return has two investment-land sales and one business-land sale.
Their Form 6252 line 26 gains are $6,000, $5,000, and $10,000. All three
forms print separately, with ratios 0.60000, 0.50000, and 0.50000. The first
two gains and the business section 1231 gain reach $21,000 on Schedule D and
Form 1040 line 7a; the business gain also prints on Form 4797 lines 4 and 7.
Local full-return XSD passes. All nine pages were rendered, including the
three Form 6252 copies and both Form 4797 pages. The snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-form6252-three-sales/filled-return.pdf`
with SHA-256
`25e9d1e5f5e7a781214fef731bd325e47a61993c34fc7b8ba1a34ac43473b021`.

The first render of the second packet exposed a Form 4797 AcroForm error:
`section_1231_gain` filled line 2's depreciation column and
`nonrecaptured_1231_loss` filled its acquisition-date column. The corrected
map places Form 6252 gain on line 4, like-kind gain on line 5, the section
1231 total on line 7, prior unrecaptured loss on line 8, and the positive or
zero remainder on line 9 only when the prior-loss computation applies. It was
checked against the official [2025 Form 4797](https://www.irs.gov/pub/irs-prior/f4797--2025.pdf)
AcroForm and [instructions](https://www.irs.gov/pub/irs-prior/i4797--2025.pdf).
The Form 4797 PDF projector also requires its line 4 amount to equal the
linked business-property Form 6252 line 26 total, even when invoked directly.
The corrected page and the three Form 6252 pages were reinspected.

The sources and W-2 are synthetic. This review does not authenticate purchase,
sale, payment, mortgage, ownership, or prior-year records. Related-party and
depreciated-property routes, recapture, unstated interest, later-year payment
history, combinations with other Form 4797 sources, IRS business rules, the
agreed full batch, and ATS acceptance remain open. The Form 4797 correction
does not establish full Part I/II/III PDF parity for every other route.
