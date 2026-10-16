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

## Short-term capital sale fixture for the next bulk pass

A current-year investment-land installment sale acquired and sold in 2025 now
requires an explicit capital-asset classification before its gain may reach
Schedule D's short-term other-forms line. The authored full-return fixture
traces $20,000 of payments and a 0.60000 gross-profit ratio to $12,000 on Form
6252 line 26, Schedule D line 4, and Form 1040 line 7a, then projects the same
sale to native XML and the official PDF. Missing classification and changed
payment/destination amounts reject. These fixtures are unrun pending the agreed
bulk test; no new XSD, filled-PDF, or source-byte review is claimed here.
## October 10 principal, interest and later-year complete-return checkpoint

Six synthetic public-input returns now exercise current short-term capital sales,
assumed mortgages below and above adjusted basis, a reviewed 2024 sale's final
payment, a later year with interest but no principal, and three simultaneous
capital/business sales. Production calculations and descriptors are unchanged.
The [2025 Form 6252 instructions](https://www.irs.gov/pub/irs-prior/f6252--2025.pdf)
require annual filing through the final payment and separate interest reporting.
The fixtures use stated interest entered separately through owned 1099-INT
records; they do not establish payment-ledger reconciliation or authenticated
closing/issuer/accepted-return bytes.

| Case | Principal this year | Deemed payment this year | Installment gain | Separate interest | Total tax | Packet pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current short-term | 20,000 | 0 | 12,000 | 2,000 | 28,427 | 6 |
| Current mortgage below basis | 20,000 | 0 | 15,714 | 3,500 | 28,264 | 6 |
| Current mortgage above basis | 10,000 | 20,000 | 30,000 | 3,000 | 30,287 | 6 |
| Later-year final payment | 30,000 | 0 | 30,000 | 3,000 | 30,287 | 6 |
| Later-year interest only | 0 | 0 | 0 | 2,000 | 25,547 | 4 |
| Mixed capital and business sales | 60,000 | 0 | 37,714 | 7,500 | 33,604 | 10 |

Each return has single-filer wages150,000, standard deduction15,750 and
withholding25,000. Independent decimal arithmetic reconciles gross profit,
contract price, five-decimal percentage, annual gain, interest, AGI, taxable
income, ordinary/preferential tax and amount owed. The below-basis mortgage
has price100,000, mortgage30,000, basis40,000 and selling expenses5,000:
55,000/70,000 prints0.78571 and produces15,714 gain. The 2024 source preserves
its30,000 total prior payments, including20,000 deemed mortgage payment; 2025
does not recognize that mortgage amount again. In the mixed return,12,000
short-term gain reaches Schedule D line4,15,714 long-term gain joins10,000
business gain through Form4797 line4/7 and Schedule D line11. With no prior
section1231 losses assumed, Form4797 correctly skips lines8/9 under its printed
line7 instructions; this fixture does not authenticate that lookback history.

All six full XMLs pass the local TY2025v5.4 Return1040 XSD, digest
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
All38 pages were covered by visual observation of30 distinct rendered images
and exact image-hash matches; all eight Form6252 copies retain amounts, dates,
identity, unrelated-party No and determinable-price Yes. Reopened packets have
no editable fields/widgets; they are the existing builder's flattened output.
Six focused tests and351 distinct related node/native/PDF/builder tests pass.
Source changes produce39 public,54 native and54 fresh-PDF rejections. The first
typed run used the wrong page-origin field name; the first runtime run wrongly
expected a zero-payment holding-period conflict to reject publicly. Both test
assumptions were corrected and their initial logs retained; no guard was changed.

Review remains qualified. New deferred127 records the missing property-type
code on all eight Form6252 native/PDF copies. Deferred128 records a source probe
that incorrectly adds2,000 interest to20,000 principal while retaining2,000 on
Schedule B: public/native/fresh-PDF paths accept13,200 gain and28,715 tax, instead
of the original source's12,000/28,427. That counterexample is separate from the
six reconciled packets and is not included in their XSD/page counts. Deferred129
records the zero-principal public path accepting a conflicting short-term flag;
native and fresh-PDF still reject it. Deferred130 records short-term Schedule D
page2 marking line20 Yes after line17 No directs skipping lines18–21. Existing
deferred15 is reproduced in the five gain returns' omitted native Schedule D
totals/answers. None of these deferred issues was repaired.

Private evidence is `.state/research/form6252-payments-2026-10-10/`, including
sources, prepared values, XML/PDFs, render/hash manifest, independent arithmetic,
counterexample and commands/logs. No production change means the benchmark was
not rerun; its last measured46/133 remains distinct from these passing checks.
All52 main TODOs remain open and frozen, with130 future items deferred. Broader
ownership, actual receipt allocation, OID/unstated interest, older sale years,
related parties, recapture, source authenticity, IRS business rules and ATS
acceptance remain unresolved; no filing-ready or broad parent completion is claimed.
