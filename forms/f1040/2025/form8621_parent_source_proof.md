# TY2025 Form 8621 parent source packet proof

The Form 8621 parent now registers a paper PDF for each PFIC holding. It prints
Part I and the applicable current-year Part III, IV, or V; Part VI prints every
outstanding prior section 1294 election with a second page 4 when six columns
are filled. Native MeF retains the same holding identity, amounts, Election B,
separate MTM sale statement, Part V holding-period statement, and Part VI
status. Form 1040, Schedule 1, Schedule 2, Schedule D, and Form 8949 carry the
calculated tax effects.

## Source and negative contract

- Each printable holding needs reviewed corporation, ownership, election, and
  retained issuer record bytes with a matching SHA-256 digest. Section 1291
  history, QEF Annual Information Statement, MTM quote/basis/sale records, and
  continuing-election prior filing and acceptance records must likewise retain
  bytes. An evidence locator alone cannot register a printable parent.
- Election B uses the QEF statement and the retained distribution/transfer
  activity to derive Part III lines 8a–8e. The income-tax worksheet recomputes
  tax with and without undistributed QEF income; Form 1040 line 24 carries the
  allowed deferred tax after credits. Changed worksheet or Form 1040 amounts
  fail both exporters.
- Prior section 1294 status requires the accepted original Election B filing. An
  election made before 2024 also requires its accepted 2024 status filing. Prior
  partial terminations derive remaining earnings and tax from lines 18, 19, 22,
  23, and 25 of that status. Current events allocate newest election first.
  Deferred tax joins Schedule 2 line 17z as `1294DT`; interest joins 17q. Both
  exporters recompute these from the source holdings.
- Multiple MTM sales retain separate broker and basis copies. Each sale gets a
  native and printable statement line, while Part IV carries separate net
  ordinary gains and losses. A line 14c residual loss needs acquisition,
  investment-capital-asset, broker-reporting, and zero-wash-sale facts bound to
  retained copies. Its derived Form 8949 row adjusts for the portion already
  deducted as ordinary loss; Schedule D and Form 1040 consume only the residual.
- The native and PDF exporters reject missing bytes, changed source amounts,
  mismatched accepted submission IDs, altered Form 8949 rows, and changed
  Schedule 2 tax/interest. The tests use synthetic byte-bound records and
  synthetic acceptance copies to exercise the contract. They do not establish an
  actual IRS accepted prior return or authentic issuer record.

## Local verification

- `deno test -A` for the Form 8621 graph, source replay, native, PDF, and full
  return packet files: 36 passed, 0 failed; terminal log
  `/tmp/opentax-form8621-parent-focused-final-v6-oct6.log`.
- `deno test -A forms/f1040/2025/mef/forms/schedule2.test.ts forms/f1040/2025/pdf/forms/schedule2.test.ts forms/f1040/2025/form8978_public_source.test.ts`:
  56 passed, 0 failed; terminal log
  `/tmp/opentax-form8621-schedule2-preservation-final-oct6.log`.
- Positive packets validate against the full local TY2025 MeF v5.4
  `Return1040.xsd`. The five packet PDFs cover Election B, one and seven prior
  elections, two MTM sales, and MTM line 14c through Form 8949. All 38 pages
  were rendered and visually reviewed as contact sheets under
  `/tmp/opentax-form8621-final-rendered/`. The final rerendered pages have
  identical PNG digests, page for page, under
  `/tmp/opentax-form8621-final-replay-rendered/`.

| Final packet                | Pages | SHA-256 of PDF                                                     |
| --------------------------- | ----: | ------------------------------------------------------------------ |
| Election B                  |     7 | `c096ab1a70c266c86abeccceb92b475773583966c6eab2da933f0482317a1a9a` |
| Partial prior election      |     7 | `f55c3e0fae780da23f7e1a86d26a28d82afc97e11dc61545824b2a80d5a34f4e` |
| Seven outstanding elections |     6 | `28dab3e55115bf9156917904e73d0d0cb47e1bb53a92ff87175c8e761da49ca0` |
| Multiple MTM dispositions   |     8 | `21fa352ad272c655be91eb2a5ae064d6059a2efb69167fa65736590ddbbfab68` |
| MTM line 14c / Form 8949    |    10 | `bc1f4f6350dbd4d603a5d77ed2dfd98ff8ef9883439d0ddf7f25dfd0a6fbb8e1` |

## Explicit current boundaries

- Historical accepted-filing and issuer authenticity must be established from
  real retained records before a real historical claim is filed. A matching hash
  or an in-memory `Accepted` flag is not external authentication.
- Historical years outside the verified 2016–2018 and 2021–2024 standard
  calendar-year 1040 due-date table require retained applicable due-date
  evidence; 2019 and 2020 have COVID postponements. The 2020 election route with
  a retained May 17, 2021 due-date notice is exercised in the focused negative
  suite. Jurisdiction-specific due-date relief can use the same evidenced
  override. Early-filed partial termination is held if the printed line 26 would
  be negative.
- Election B rejects Form 8615, Schedule J, AMT, and unsupported capital-gain
  netting. Other AGI-sensitive deductions and credits still require a full
  without-QEF return refigure before the broad parent can be considered
  complete.
- Form 8949 line 14c currently covers documented investment capital stock with a
  sourced broker-reporting class and zero wash-sale disallowance. Other property
  character or wash-sale treatment requires its own reviewed facts.
- Part II D–H, qualifying-insurance, and atypical indirect-owner routes are
  outside this original parent slice and remain explicitly unsupported.

Official references: [Form 8621](https://www.irs.gov/pub/irs-pdf/f8621.pdf),
[Form 8621 instructions](https://www.irs.gov/instructions/i8621),
[Form 8949 instructions](https://www.irs.gov/instructions/i8949),
[IRS quarterly interest rates](https://www.irs.gov/payments/quarterly-interest-rates),
[2016 return due date](https://www.irs.gov/pub/irs-news/ir-17-001.pdf),
[2017 return due date](https://www.irs.gov/pub/irs-prior/p5084--2018.pdf),
[2018 return due date](https://www.irs.gov/newsroom/with-tax-filing-deadline-nearing-irs-says-about-50-million-still-need-to-file),
[2021 return due date](https://www.irs.gov/newsroom/most-federal-tax-returns-are-due-people-who-cant-pay-should-still-file-on-time),
[2022 return due date](https://www.irs.gov/newsroom/need-more-time-to-file-taxes-its-easy-to-get-an-extension-with-irs-free-file),
[2023 return due date](https://www.irs.gov/newsroom/things-to-remember-when-filing-a-2023-tax-return),
[2024 return due date](https://www.irs.gov/e-file-providers/tax-year-2024-processing-year-2025-form-1040-mef-due-dates).

## Current main integration

At a2ae96eba, the same seven-file focused command passes36/0(23s), /tmp/opentax-form8621-current-main-focused.log. The three-file Schedule2/Form8978 preservation passes56/0(11s), /tmp/opentax-form8621-current-main-preservation.log. All five main PDFs at /tmp/opentax-form8621-{qef,partvi,partvi-seven,mtm,14c}-main.pdf are byte-identical to the reviewed final-v6 PDF hashes above, preserving all38 reviewed pages. The tests execute actual public inputs, native joins and full localXSD. This does not close the remaining boundaries above or prove IRS acceptance.
