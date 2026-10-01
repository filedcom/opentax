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

**Filing remains closed.** Form 5471 Category 5a requires the full corporation
identity, filer/category facts, and mandatory Schedule B Part II, E/E-1, G,
G-1, H, I, I-1, J, P, Q, and R, with H-1 for a CAMT applicable corporation
and other attachments depending on ownership and transactions. This source contract does not yet contain or emit
those schedules. Form 8992, Schedule A, and separate Form 5471 Schedules H and I-1
now have source-reconciled native MeF/PDF descriptors, but the full Form 5471
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
- [Form 8992](https://www.irs.gov/pub/irs-pdf/f8992.pdf) and
  [Schedule A](https://www.irs.gov/pub/irs-pdf/f8992sa.pdf)
- Checked-in TY2025 v5.4 MeF schemas for IRS1040Schedule1, IRS5471, IRS8992, and
  IRS8992ScheduleA.
