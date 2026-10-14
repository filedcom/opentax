# TY2025 Form 4972 complete multiple-source annuity review

## Bounded source and calculation

The [2025 Form 4972 and instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf) combine one participant's same-plan distributions before the election and require a separate form for each spouse. This route reconciles two, three, five, or seven complete Form 1099-R copies for one owner, and paired one/one, two/three, or four/five owner copies, to one Form 4972 per owner. Each synthetic issued copy carries the same qualified plan and final-balance evidence, a distinct source reference, $10,000 of taxable cash, $1,000 of box 3 capital gain, $2,000 of box 8 annuity value and 100% box 8 percentage. The NUA cases also carry $2,000 box 6 and a gross distribution of $12,000 per copy; the no-NUA case carries zero box 6 and a $10,000 gross distribution. The owners have separate plan and payer identities.

The worksheet's capital NUA, ordinary NUA, annuity line 11, and the line 20–28 subtraction use independently checked 1986 rate totals. The expected special tax is:

| Primary/spouse copies | NUA | Owner Form 4972 line 30 | Form 1040 lines 16/24 | Pages |
| --- | --- | --- | ---: | ---: |
| 3/0 | yes | 4,090 | 4,090 | 5 |
| 5/0 | yes | 8,510 | 8,510 | 5 |
| 7/0 | yes | 12,760 | 12,760 | 5 |
| 2/3 | yes | 2,080 / 4,090 | 6,170 | 6 |
| 4/5 | yes | 6,230 / 8,510 | 14,740 | 6 |
| 1/1 | yes | 830 / 830 | 1,660 | 6 |
| 3/0 | no | 3,100 | 3,100 | 5 |

Each owner copy has Form 4972 line 11 of $2,000 times its number of source copies. The full source route leaves Form 1040 taxable pension income at zero and joins the special tax once to line 16. Removal of a source, changes to boxes 3/6/8/8 percentage, plan or recipient identity, reused source references, altered Form 4972 line 6, and changed Form 1040 line 16 reject in both native preparation and PDF generation.

## Isolated proof

The source test `forms/f1040/2025/domains/taxes/retirement/form4972/form4972_multiple_annuity_source.test.ts` passed **1/0** (`/tmp/opentax-form4972-multiple-annuity-source-v2.log`), covering seven complete packets, independent tax expectations, negative source mutations, and the full local TY2025 v5.4 Return1040 XSD. The related preservation gate passed **246/0** (`/tmp/opentax-form4972-multiple-annuity-preservation.log`). Schema SHA-256 is `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.

All **38 filled PDF pages** were rendered and visually reviewed in 14 contact sheets under `.state/research/2026-10-06-form4972-multiple-annuity-source-rendered`. The review covered Form 1040 filing status, name and tax lines; both Schedule 1-A senior-deduction pages; and each separately named Form 4972 election, capital/ordinary NUA, annuity, tax-subtraction, and line 30 amount. The seven held PDFs in `/tmp/opentax-form4972-multiple-annuity-held-oct6` match the reviewed source packet PDFs byte for byte. Its completed read-only replay checker passed **7 cases/all 38 pages**, including source recomputation, retained source/XML/PDF hashes, IRS template evidence and full XSD (`/tmp/opentax-form4972-multiple-annuity-held-check.log`). The held manifest SHA-256 is `853aca7ce3eee0359503c57ea8fe5fb38edab74e19c4c8876224068fa6b348c2`.

| Held packet suffix | PDF SHA-256 | XML SHA-256 |
| --- | --- | --- |
| primary-3-spouse-0-nua-1 | `cd81d9c7ecd584e970b6637695ca5f99c8eaf71df70a2df6f41f5a77524a8936` | `de9b4e582962a906d3f49a52984d8a780bccb18abd7a214cddef488835eb48cf` |
| primary-5-spouse-0-nua-1 | `43b073e5716a97a32d74d5c2a0720d70042af3f9459d5d6b54a5305eebb42086` | `56942f8fa519e213d1fea1aed1cbbb483bb25bed214c8880df85f3e81192f401` |
| primary-7-spouse-0-nua-1 | `9c4b9682cdf90098fe247d61ea5683e3effff4c68d24f5d65466d13a75164082` | `09811dd2fd2ca00d337dc8c80827cbf15a9772f37a11b4410e4ea76ce0f5154b` |
| primary-2-spouse-3-nua-1 | `45caa8f23f56cd3e1ecca71fd6365c98f9d441da7ea6cd553d0e672432b6c858` | `0af2773fea550efe47681433f02cb6dc5291bb2ae064e1fe7c2a687bdd00a0ef` |
| primary-4-spouse-5-nua-1 | `30697e42f647de256d9d67ef39fc03e95dc8d71dfaa94b3383653f0d2a20864f` | `67db586e23410c1726b3f7379f87cbd902e1f0d59e10e2dbce2f0305ba491bd5` |
| primary-1-spouse-1-nua-1 | `bec4e4f3acdc2567eba082da69138e611200abcf2829ba0d177c88e0e7f675f0` | `070d1fcd588fd8cd5ca43585a6f92c005f3c01a2e3a97071d4adc70cf6aa4445` |
| primary-3-spouse-0-nua-0 | `19180c59420b98cc287895b7056f7d6067d8f80057999e4a9564157d93d783c3` | `0e2417eb839a3bc600aff50004941df07de97ef455e1ad11db9812355c3ca3e1` |

The earlier five-packet NUA held directory was copied to `/tmp/opentax-form4972-multiple-nua-held-compat-oct6`; only its manifest's fixture exclusions were refreshed for the **305-case** review catalog. All 15 older JSON/XML/PDF files remain byte identical. Its read-only checker still passes **5 cases/all 27 pages** (`/tmp/opentax-form4972-multiple-nua-held-compat-check.log`). Refreshed manifest SHA-256 is `a01a37b847a9f9ceab2346e1eca3b245450b071ed9058d38cad532edfcb6a12b`.

## Boundary

This is a synthetic, full-share, nonbeneficiary, one-qualified-plan-per-owner proof with exact whole-dollar source allocations and separate spouse elections. It does not authenticate issuer or plan-administrator bytes, prior-election history, beneficiary/partial-share, estate/death combinations, nonintegral allocations, Schedule J/AMT interactions, IRS business rules or ATS acceptance. Those remain in the existing Form 4972 board scope.


## Current-main proof

Source013f16549 passes exact18-file source/preservation gate247/0(1m13s), `/tmp/opentax-form4972-multiple-annuity-current-main-v2.log` SHA256 `762f728de4776fc790ebf301ea642cc81b016c3b0f1f51185c9d926afacc0e13`. An initial invocation referenced nonexistent test paths and executed no tests; the corrected invocation uses the actual17 preservation files plus the new source proof. Main held7/all38pages passes at `/tmp/opentax-form4972-multiple-annuity-held-main-oct6`, log `/tmp/opentax-form4972-multiple-annuity-held-main-check.log`, manifestSHA256 `5af877f6a356ddd04c6d2e5eb9f617e5df5aeee6f8ae067ee674887c1f0f6c5d`. OldNUAheld5/all27pages also passes at `/tmp/opentax-form4972-multiple-nua-held-main-annuity-oct6`, log `/tmp/opentax-form4972-multiple-nua-held-main-annuity-check.log`, manifestSHA256 `04d2036c7f8d6c67e7ed3c21950820ebfa17a73f34b05a21eaafc2088d6fb3e3`. Only copied manifests fixture scope exclusions changed for actualcatalog309; all36held JSON/XML/PDF bytes remain identical to the reviewed isolated batches.
