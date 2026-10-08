# TY2025 Form 8978 and Schedule A reviewed source filing

The January 2023 IRS [Form 8978](https://www.irs.gov/pub/irs-pdf/f8978.pdf) and
[Schedule A](https://www.irs.gov/pub/irs-pdf/f8978sa.pdf) are the published
pages used by this TY2025 route. The
[instructions](https://www.irs.gov/instructions/i8978) require separate AAR and
BBA filings, AAR calculations first, and the resulting corrected affected-year
baseline in a subsequent BBA calculation. Schedule A lines 2, 4, and 6 carry to
parent lines 1b, 3b, and 9b. Partner tax-attribute adjustments leave the
tracking column blank. Additional years require additional parent forms;
additional rows require additional Schedule A sheets.

## Public source and packet contract

The public `f8978.reviewed_source` record identifies the reporting-year partner,
issuer, actual furnished date, reviewed affected-year filing facts, historical
tax-rule/original-return review, and absence of unreported nonincome tax
changes. Every filing binds a supplied source PDF and a supplied historical
computation PDF by document reference, filename, and SHA-256. Native and PDF
export require the actual supplied bytes through `buildMefBundle`; standalone
XML or PDF export cannot bypass that reviewed contract. The generated
tax-computation statement is independently regenerated and compared with the
actual bundle bytes.

The source reconciler checks partner ownership against both the filer and final
1040, exact filing/calculated-line agreement, AAR-before-audit order, corrected
baselines for repeated affected years, source-row classification, and final
reporting-year routing. Form 8986 rows retain their actual identifiers; reviewed
partner tax-attribute rows require an explanation and blank tracking. Positive
net line 14 joins 1040 line 16; negative net line 14 joins the reporting-year
worksheet and Schedule 3 credit, including its current-tax limit.

PDF projection supports the existing six-filing contract, four year columns per
parent, aligned source rows across columns, and seven-row continuation sheets
for each category. Continuation page subtotals sum to the parent. Visual review
found the IRS Schedule A subtotal widgets numbered in reverse column order; the
mapping now prints each subtotal beneath its own column. Full retained
descriptions wrap inside their rows. The 1040 line 16 Form 8978 name uses a
specific 6-point projection to fit its narrow IRS widget without clipping.

## Terminal evidence, October 6, 2026

Proof base: isolated `6559e695b`, `/tmp/opentax-form8978-source-oct6`. The three
registered held fixtures execute actual public W2 and partner-review inputs
through the reporting-year graph; their final outputs are not staged.

| Reviewed case    | Net line 14 | Reporting credit | Total tax | Refund |
| ---------------- | ----------: | ---------------: | --------: | -----: |
| Positive AAR     |       1,920 |                0 |     9,875 |  1,125 |
| Negative AAR     |      -1,920 |            1,920 |     6,035 |  4,965 |
| Multiple AAR/BBA |      -8,160 |            7,955 |         0 | 11,000 |

The multiple case retains five affected years, three filings, four columns in
the first filing, eight distinct 2024 income rows across two Schedule A sheets,
and a reviewed section 163(d) investment-interest deduction adjustment with
blank tracking. The later BBA uses the AAR-corrected 2024 baseline. Its 64 of
interest and the positive AAR's 98 are source-computation/parent amounts, not
1040 income tax. Negative affected-year adjustments do not offset positive-year
interest. The unused 205 of reporting credit is not carried forward. Historical
ordinary Single worksheets and the
[IRS quarterly interest rates](https://www.irs.gov/payments/quarterly-interest-rates)
support the explicit fixture computations; no payment transaction was made.

- Typed focused tests: **28 passed, 0 failed**,
  `/tmp/opentax-form8978-focus.log`.
- Reporting-year, 1040 arithmetic/PDF, and Form 8994 regression: **53 passed, 0
  failed**, `/tmp/opentax-form8978-regression.log`.
- Selected held checker: **3 cases, 19 tax pages**, replayed hashes, source,
  templates, and full local TY2025 v5.4 XSD confirmed;
  `/tmp/opentax-form8978-selected.log`.
- All 19 final tax pages and all **27 exact attachment pages** were rendered and
  visually checked for owner, dates, amounts, source checkboxes, row/page
  ordering, complete descriptions, blank attribute tracking, and legibility.
- Negative cases reject owner/source/total changes, impossible furnished dates,
  altered historical baselines, fabricated attribute identifiers, missing,
  duplicate or changed supplied PDF bytes, changed generated statement bytes,
  and a conflicting finalized reporting return.

Ignored artifacts:
`.state/research/ty2025-filled-pdf-review/2026-10-06-form8978-reviewed` and its
`-rendered` sibling. The manifest records all 19 final page reviews. Supplied
PDFs remain reproducible through the reusable review generator's actual
attachment contract. Earlier authored/unrun evidence claims are replaced by
these terminal results.

## Remaining source and acceptance limits

Historical tax, AMT, credits, tax attributes, penalties, and interest remain
reviewed affected-year workpaper inputs. The current-year engine does not
recalculate arbitrary historical returns. Supplied exact bytes and strict review
records bind the reviewed facts; they do not authenticate the issuer, the
furnished Form 8986, or a filed historical return. The fixture PDFs clearly
contain synthetic review records, not authenticated IRS or issuer documents.
Actual issued Forms 8986, filed original returns, computation workpapers, and
applicable tax-attribute ledgers require independent review before real filing.

The older unreviewed arithmetic input remains available; this source proof is
specifically the reviewed contract above. It does not establish pass-through,
foreign, community-property, arbitrary historical return, or nonincome tax
amendment support. Full XSD success is not ATS, IRS business-rule, or production
acceptance. The broader source/authentication and acceptance scope remains open.
