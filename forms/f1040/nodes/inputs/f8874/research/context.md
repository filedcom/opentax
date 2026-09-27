# Form 8874, New Markets Credit

The TY2025 Form 1040 implementation is a work in progress. The source for the
current-year credit is an identified qualified equity investment (QEI), not a
precomputed amount. The current input requires the community development
entity's name, EIN, and U.S. address, the initial investment and 2025 credit
allowance dates, QEI amount, designation notice reference, and affirmative
holding and qualification facts. A passive investment additionally needs a
distinct activity and source-document reference. Its current-year credit must
resolve to whole dollars for the Form 8582-CR activity source. Recapture-notice
cases still stop rather than being treated as an ordinary current-year credit.

For each QEI, the initial allowance date and its first two anniversaries use 5%.
The next four anniversaries use 6%. Own QEI credits make up Form 8874 line 1.
When a taxpayer files Form 8874 for an own QEI and also has partnership or
S-corporation New Markets K-1 credits, those K-1 amounts populate line 2, and
line 3 adds lines 1 and 2. Prior-year carryovers do not belong in this
source-form total; they use Form 3800's separate carryover path.

The input node routes a self-earned nonpassive amount directly to Form 3800 and
a self-earned passive amount through Form 8582-CR activity and tax facts. One
IRS8874 source document carries all the QEI rows. Form 3800 Part III line 1i and
Part V carry the resulting current-year source amounts. The MeF builders
cross-check the filed Form 8874, Form 8582-CR activity sources, and Form 3800.
Source and XML cases are written but have not run in the deferred full batch.

Nonpassive partnership box 15 code AD and S-corporation box 13 code AD amounts
go directly from identified K-1 sources to Form 3800 Part III line 1i. A
pass-through-only filer does not get an invented IRS8874 attachment. Multiple
same-line sources need explicit Part V use amounts if the tax limit only uses
some of their combined credit. These cases are written but unrun. Estate/trust
box 13 code ZZ amounts additionally require a source statement identifying the
New Markets Credit and route directly to the same line 1i. Passive K-1 code
AD/ZZ credits require matching Form 8582-CR activity facts and are checked again
against their K-1 during MeF assembly. When an own QEI causes Form 8874 to be
filed, line 2 is rebuilt from the filed partnership/S-corporation K-1s and
checked against the matching direct Form 3800 entries or passive Form 8582-CR
sources. Pass-through-only claims continue without an invented IRS8874 document.
Line 2 does not include estate/trust code ZZ credits because the source form
labels it for partnerships and S corporations.

Open work: cent-bearing passive credit and shared XML rounding; carryovers and
carrybacks; recapture and sale events; leap-day anniversary rules; filled PDF
output; IRS business rules and ATS acceptance. The current route is not
filing-ready.

Recapture must be a separate source-backed path, including when no current-year
Form 8874 is filed. Form 8874-B identifies the CDE, investment, event date and
reason, and year-by-year decreases, but its notice amount alone is not the
taxpayer's Schedule 2 line 17a tax. Section 45D(g)(2) requires the decrease in
prior-year Section 38 credits actually allowed if this QEI's credit had been
zero, plus interest at the Section 6621 underpayment rate for each affected
year. Unused carryovers and carrybacks must be adjusted rather than treated as
tax used. The IRS audit guide describes daily-compounded interest from each
prior return's original due date through the recapture-year return due date. For
TY2025, Schedule 2 line 17a identifies this as `NMCR`; the MeF schema has a
separate `RecaptureOtherCreditsGrp` for that code. A standalone input needs the
notice identity, prior return and recomputation evidence, prior due dates,
applicable interest-rate periods, and carryover adjustments. It must not take a
single unexplained recapture-tax amount. The current build pass replaces loose
per-year unused-credit balances with a referenced list of QEI carryover
vintages: originating year, credit generated, amount available to TY2025 before
recapture, source document, and each earlier tax year where the credit was
allowed with its filed-return reference. Historical use plus the entering-2025
balance must equal the generated credit, and any carryback must be to the
immediately preceding year, no earlier than the QEI's first allowable year. The
calculator emits an explicit adjustment of each vintage to zero, but Form 3800
Part IV column (h), Part VI source detail, and the required changed-carryforward
statement are not yet linked. The sources still need reconciliation to actual
prior filed and amended returns.

Form 8874's instructions exclude a substantially-all failure that the CDE
corrects within six months of awareness, with only one correction permitted per
QEI during the seven-year period. A signed Form 8874-B notice is still source
evidence, but the substantially-all reason needs a documented cure review before
this engine reports recapture. The build pass requires an explicit finding that
the exception does not apply; it does not authenticate the CDE's underlying cure
records. The underpayment-rate implementation uses the IRS quarterly table and a
366-day denominator for 2024. Its written cross-quarter/leap-year case is unrun,
and interest rounding needs independent IRS example reconciliation.

A sale or other disposition alone does not trigger recapture, although the
seller cannot claim an allowance date after disposition. This is distinct from a
CDE redemption or other statutory recapture event. Sale gain/loss and basis
adjustments need their own source reconciliation.

Sources:

- [Form 8874](https://www.irs.gov/pub/irs-pdf/f8874.pdf)
- [Form 8874 instructions](https://www.irs.gov/instructions/i8874)
- [Form 3800 instructions](https://www.irs.gov/instructions/i3800)
- [Form 8874-B](https://www.irs.gov/pub/irs-pdf/f8874b.pdf)
- [Section 45D](https://uscodeweb1.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title26-section45D)
- [IRS New Markets Credit audit guide](https://www.irs.gov/pub/irs-utl/atgnmtc.pdf)
- [IRS underpayment interest rates](https://www.irs.gov/payments/quarterly-interest-rates)
