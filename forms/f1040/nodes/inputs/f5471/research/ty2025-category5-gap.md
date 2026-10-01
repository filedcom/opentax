# TY2025 Category 5 Form 5471 and Form 8992 gap

The reviewed calculation route accepts one wholly owned CFC, an individual
Category 5a shareholder, and no section 962 election. A structured Schedule I
requires every line 1a–1h and line 2 amount, with Worksheet A/B references when
those worksheet lines are positive. The calculation sums exactly those lines for
Schedule 1 line 8n. Form 5471 Schedule I line 4 factoring income is outside this
bounded route and must be zero. The previous asserted `subpart_f_income` and
`gilti_inclusion` fields have been removed.

The Schedule I-1 source supplies one CFC's functional-currency gross income,
exclusions, deductions, tested foreign taxes, QBAI, and interest lines, plus a
reviewed average exchange rate and U.S.-dollar amounts. The schema reconciles
its line 6, 7, 8, 9d, and 10c conversions and requires wholly owned tested
income to equal the shareholder pro rata amount. Form 8992 Part I line 3 equals tested income
because tested losses are outside this route. Part II line 2 is 10% of QBAI,
line 3c is the excess of tested interest expense over income, line 4 is net
DTIR, and line 5 is the nonnegative GILTI inclusion. That last amount goes to
Schedule 1 line 8o. The AGI aggregator and Form 1040 income see the same 8n/8o
amounts. The 2025 Schedule 1 MeF tags and PDF fields are mapped separately.

The reviewed Schedule H branch requires explicit zero values for every
book-to-tax adjustment on lines 2a–2i, no DASTM gain/loss, and general-category
E&P only. Its line 5d U.S.-dollar amount ties to the functional-currency E&P
and a reviewed divide-by exchange rate. Other adjustments, passive or section
901(j) allocations, and DASTM remain outside this branch.

The Schedule E/E-1 branch requires one directly paid general-category tax row
at the CFC level, a reviewed tax jurisdiction, two tax-year end dates, local
currency and conversion rate, and an explicit tax workpaper. It reconciles the
row's U.S.-dollar and functional-currency amounts to Schedule I-1 line 7. It
also requires zero lower-tier deemed paid tax, disallowed tax, prior E-1 tax
balance, PTEP tax, inclusion deemed paid tax, and other E-1 adjustments. Thus
Schedule E-1 tested-income lines 4, 8, 13, and 15 can be computed directly.
The remaining categories and foreign tax histories stay outside this branch.

The bounded parent Form 5471 now has reviewed CFC tax-year, foreign address,
incorporation, activity, stock-register and books-custodian facts. Its page 1,
Schedule B Part II single direct shareholder, embedded Schedule G questions
1–21a, and embedded Schedule I lines 1a–9 have native/PDF projections. The
Schedule G source answers each applicable question No and requires a reviewed
question workpaper; a Yes answer rejects until related amounts, statements,
and forms are sourced. The direct shareholder name, SSN and U.S.
address come from the final return filer; the stock counts come from the
reviewed CFC register. Schedule I additional dividends, exchange gains,
blocked income, extraordinary-disposition accounts and hybrid-deduction
accounts are explicitly zero or false in this route. The parent projection
does not by itself constitute a complete filing.
The current country source is narrowed to the `EI` Ireland code enumerated by
the TY2025 MeF `CountryType` (including the Schedule E tax country), and the
direct shares equal total outstanding shares at both year ends.

**Filing remains closed.** Form 5471 Category 5a requires the full corporation
identity, filer/category facts, and mandatory Schedule B Part II, E/E-1, G,
H, I, I-1, J, P, Q, and R, with H-1 for a CAMT applicable corporation
and other attachments depending on ownership and transactions. Form 5471 page 1,
Schedule B Part II, G, and I, plus Form 8992, its Schedule A, and separate
Form 5471 Schedules E/E-1, H, I-1, J, P and R now have source-reconciled native MeF/PDF
descriptors, but Schedule Q, the wider Category 4 packet, and conditional
attachments remain.
Schedule G-1 is required for each cost sharing arrangement in which the CFC
was a controlled participant; this branch requires Schedule G line 7 No, so
G-1 is not present.
Schedule J now has one general-category E&P rollforward. A prior-year Schedule J
reference supplies the $10,000 opening untaxed E&P in the authored fixture;
current E&P ties to Schedule H line 5c, and functional-currency subpart F,
section 951A, and section 956 movements reconcile to Schedule I, Form 8992,
and the relevant exchange rates. The reviewed Worksheet B source supports a
line 10 reclassification of all $52,000 current section 959(c)(2) PTEP before
the $1,000 section 956 inclusion on line 11. The other opening categories, PTEP,
distributions, adjustments, and Part II recapture are explicitly zero. This
bounded branch has native and PDF projections but no executed validation.
The fixture's prior Schedule I line 1a lower-tier CFC dividend was moved to
line 1e; this preserves the $10,000 subpart F total and aligns with Schedule G
line 3a No and the absence of lower-tier foreign entities.
Schedule P now reports the sole shareholder's general-category PTEP from that
Schedule J: Part I is in functional currency and Part II tracks U.S.-dollar
basis. Its current inclusions and section 956 reclassification close with
$53,000 of section 959(c)(1) PTEP in each part for the authored one-to-one
currency fixture. Prior-year PTEP, distributions, separate categories and
other adjustments are explicitly excluded; source and prior-year Schedule P
references are required. Its native and four-page PDF cases are authored but
not executed.
Schedule R now has a reviewed empty distribution ledger and projects CFC/filer
identity to a native/PDF attachment without inventing a dated transaction. Its
MeF schema permits zero distribution groups, while the Form 5471 instructions
say a required all-zero schedule should carry one or more zeros; the Schedule R
group itself requires a date and description. This no-distribution packet
therefore still needs IRS business-rule review before the export guard can open.
The instructions also identify a sole CFC owner as both Category 4 and 5a,
requiring additional parent pages and Category 4 schedules including M.
The full Form 5471
packet remains incomplete. The Form 5471 attachment coverage gate and the
Schedule 1 8n/8o export guards reject positive filing. The source reference is a
reviewer locator, not authenticated filed document bytes. The Schedule I-1 and
Form 8992 descriptors compare shareholder TIN with the return filer.
Multi-CFC, tested losses, partial ownership, factoring income, and section 962
elections remain open.

Sources:

- [2025 Form 1040 instructions, Schedule 1 lines 8n and 8o](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
- [2025 Form 5471 and Schedule I](https://www.irs.gov/pub/irs-pdf/f5471.pdf)
- [Form 5471 instructions and required Category 5 schedules](https://www.irs.gov/instructions/i5471)
- [Schedule J (Form 5471)](https://www.irs.gov/pub/irs-pdf/f5471sj.pdf)
- [Schedule P (Form 5471)](https://www.irs.gov/pub/irs-pdf/f5471sp.pdf)
- [Schedule R (Form 5471)](https://www.irs.gov/pub/irs-pdf/f5471sr.pdf)
- Checked-in TY2025 v5.4 `IRS5471.xsd` parent model, including embedded
  Schedule B Part II, G, and I.
- [Form 8992](https://www.irs.gov/pub/irs-pdf/f8992.pdf) and
  [Schedule A](https://www.irs.gov/pub/irs-pdf/f8992sa.pdf)
- Checked-in TY2025 v5.4 MeF schemas for IRS1040Schedule1, IRS5471, IRS8992, and
  IRS5471ScheduleJ, IRS5471ScheduleP, IRS5471ScheduleR, IRS8992, and
  IRS8992ScheduleA.
