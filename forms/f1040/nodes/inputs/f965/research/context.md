# Form 965-A: cumulative individual section 965 tax report

Sources: [Form 965-A](https://www.irs.gov/pub/irs-pdf/f965a.pdf),
[IRS instructions](https://www.irs.gov/instructions/i965a),
[Form 965-C instructions](https://www.irs.gov/instructions/i965c),
[Form 965-D instructions](https://www.irs.gov/instructions/i965d),
[Form 965-E instructions](https://www.irs.gov/instructions/i965e), and TY2025v5.4
`IRS965A.xsd`.

Form 965-A is required for a taxpayer with net section 965 liability unpaid at
any time in the reporting year, including deferred S-corporation liability. It
is filed with the return and cumulatively reports original liability, prior
payments, adjustments/transfers, S-corporation deferral, and this reporting
year's payments. The normal eighth installment for a 2017 inclusion was in 2024,
not 2025. The normal eighth installment for a 2018 inclusion was in 2025. A
payment on a 2017 liability can still be reported in 2025 if actually made, for
example after an adjustment or late payment, but must not be inferred from the
original election.

The input now requires the reporting year, a source reference for each Part I/II
row, Part I liability type and tax figures, a signed adjustment, all eight
cumulative actual-payment amounts, and the reporting-year payment and its source
record. Original liability is calculated from tax with and without section 965
amounts. Part III S-corporation computations and Part IV annual deferred-balance
rows are separate source-backed arrays. The engine subtracts elected
S-corporation deferrals from original liability eligible for the installment
election and reconciles unpaid balances.
For a triggered S-corporation liability, Part I column (a) carries the
triggering-event year. The associated Part IV column (a) can retain the earlier
deferral-election year; those years must not be conflated. Triggered rows now
take the event date and validate the reported Part I year against it.

The native MeF descriptor emits one `IRS965A` with Part I/II rows, Part II
totals, Part III groups, and Part IV rows. It checks Part II current-year
payments against Schedule 2 line 20. That Schedule 2 line is outside line 21 and
Form 1040 line 23.

The native net-adjustment/transfer statement is required when Part I column j
nets a subsequent adjustment with a transfer out. The native multiple-transferee
statement is required when one Part IV transfer out is allocated among more than
one transferee. Both statements are linked from Form 965-A in the MeF bundle.

The source model now requires a named source-provided PDF copy of the applicable
signed Form 965-C, 965-D, or 965-E for a reported transfer or consent event.
For multiple partial S-corporation transfers it requires a separate Form 965-D
copy linked to each transferee, as the IRS instructions require.
For a Part IV transfer in, the agreement link identifies the transferor and the
MeF row omits the beginning balance, matching the form's transfer-in directions.
The bundle preserves the supplied PDF bytes and links each attachment from
`IRS965A`. It does not create, sign, mail, or independently authenticate an
agreement. The original-mailing deadline and the source document's validity
must be checked outside this exporter.
Form 965-E consent alone does not make the separate section 965(h) election,
so a consent-triggered installment also requires a source reference for that
election.

Open verification and coverage: the IRS TY2025 XSD and full return tests are
written but unrun under the requested build-first workflow. Independent
authentication of transfer agreements remains open. The model takes actual
installment payments from a ledger; it
does not calculate accrued interest, penalties, acceleration, or the historical
tax-with/without computations. Those source records and any agreement with the
IRS must be reviewed before filing.
