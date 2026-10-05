# TY2025 Form 8606 coverage gap

Status: bounded taxpayer-owned no-activity and prior-basis distribution Part I
native MeF/PDF routes, plus one spouse-owned prior-basis distribution on a joint
return without a current contribution, written but unrun. One sourced 2025
nondeductible contribution with the taxpayer distribution is also written. One
spouse-owned prior-basis distribution with a sourced 2025 nondeductible
contribution now covers both receipt windows, written but unrun. One first-year
taxpayer Roth IRA code J distribution now has a sourced Part III native/PDF
route. A spouse-owned zero-opening-basis 2025 nondeductible contribution on a
joint return now has a sourced no-activity native/PDF route. Tests, local XSD
validation, filled PDF rendering, and IRS ATS remain outstanding.

## Structural mismatch

The checked-in TY2025 v5.4 `IRS8606.xsd` requires `Form8606IRANamelineTxt` and
`NondedIRATxpyrWithIRASSN` before any line amounts. Its Part I line 1 is
`NondedIRACurrTYNondedContriAmt`, line 14 is `NondedIRATotalIRABasisAmt`, Part
II line 18 is `TaxableIRAConversionAmt`, and Part III line 25c is
`TaxableIRADistributionAmt`. The eight former flat tags were removed from
`forms/f1040/2025/mef/forms/f8606.ts`. The new descriptor emits the required
owner name and SSN first, then native Part I lines 1, 2, 3, and 14 in XSD order
for its supported slice.

The [2025 Form 8606 instructions](https://www.irs.gov/instructions/i8606)
require a joint filer to put only the IRA owner's name and SSN on that spouse's
Form 8606 and to file separate forms when both spouses must file. The reviewed
Form 1099-R route now uses its T/S owner designation, filed prior Form 8606 and
year-end statement SSNs, and the return's spouse identity to select one owner.
The current pending record can print only one Form 8606, so simultaneous
taxpayer and spouse Form 8606 claims remain closed.

## Calculation and output blockers

1. The node now self-emits explicit IRA owner and no-activity attestations,
   source traditional/Roth distribution and conversion amounts, and its
   calculated Part I print lines. The MeF descriptor rejects missing owner,
   joint/spouse ambiguity, any IRA distribution or conversion, absent 2024
   line-14 basis documentation, and inconsistent line arithmetic. The source and
   XML path permits positive 2025 nondeductible taxpayer contributions with
   positive prior basis and no IRA activity. A second bounded path permits a
   filed 2024 Form 8606 line 14 of zero, with a 2025 traditional-IRA Form 5498
   box 1 matching the current contribution. The zero-basis path requires the
   same owner SSN on both source records and the final filer, distinct document
   references, no returned/SEP/SIMPLE employer contributions, no rollover, one
   W-2 with plan coverage, worksheet MAGI equal to the final Form 1040 AGI and
   W-2 wages, no IRA distribution or conversion, and no Schedule 1 IRA
   deduction. Its line 1, line 2, line 3, and line 14 pass through the
   calculation, native XML, and PDF projection. The PDF replays the same
   final-source gate. A full-return positive fixture and source/return tamper
   cases are authored but unrun. The same zero-opening-basis source shape now
   supports one spouse-owned no-activity contribution on a joint return when the
   issued Form 5498, filed 2024 Form 8606, and sole plan-covered W-2 identify
   the spouse. The worksheet explicitly confirms that the taxpayer does not need
   a separate Form 8606. Native and PDF output print the spouse's name and SSN,
   while the joint return's AGI and IRA lines are reconciled. Positive and
   separate-form, owner, source, wage, and return tamper fixtures are authored
   but unrun. Spouse prior-basis no-activity contributions, dual-owner Forms
   8606, multiple W-2 sources, and source-byte authentication remain open.
2. One taxpayer-owned, single-Form-1099-R traditional IRA distribution with
   positive prior basis now requires a reviewed filed 2024 Form 8606 line 14, a
   distinct 2025 year-end statement covering all traditional IRA balances, and
   explicit confirmations of no current contribution, other distribution,
   conversion, rollover, QCD, HSA transfer, or disaster amount. It computes and
   prints all Part I lines 1–15c, including a three-decimal basis ratio, and
   replays the 1099-R, source owners, Form 1040 lines 4a/4b, native XML, and
   two-page PDF. A second bounded variant adds one 2025 Form 5498 box 1
   nondeductible contribution, a distinct custodian receipt naming its 2025
   tax-year designation and actual receipt date, and an IRA deduction worksheet
   matched to one plan-covered W-2 and the finalized AGI. Its Form 5498,
   receipt, 1099-R, year-end statement, and filed prior Form 8606 references
   must be distinct and their owner/custodian facts agree. For a receipt dated
   January 1 through April 15, 2026, all of line 1 also prints on line 4 and is
   excluded from line 5's 2025 distribution basis; for a 2025 receipt, line 4 is
   zero and line 5 includes it. Lines 1–15c, remaining line 14 basis, Form 1040
   lines 4a/4b, native XML, and PDF replay both timings. This follows the
   [2025 Form 8606 and instructions](https://www.irs.gov/instructions/i8606) and
   [2025 Form 5498](https://www.irs.gov/pub/irs-prior/f5498--2025.pdf).
   Full-return and source/timing/return tamper fixtures are authored but unrun.
   A spouse-owned variant now accepts one Form 1099-R distribution on a joint
   return with positive prior basis, no current nondeductible contribution, and
   the same prior Form 8606/year-end/return amount checks. Its native and PDF
   Form 8606 use the spouse's name and SSN; the Form 1040 4a/4b amounts remain
   return totals. Source, printed line, and owner tamper fixtures are authored
   but unrun. Current-year rollover/repayment, qualified-disaster,
   first-time-homebuyer, other contribution or distribution sources, and
   mixed/multiple IRA sources remain open. A spouse-owned variant now also
   accepts one 2025 nondeductible traditional IRA contribution with that
   spouse's prior basis and one traditional IRA payment on a joint return. The
   issued 2025 Form 5498, designated-year custodian receipt, filed 2024 Form
   8606, year-end all-IRA statement, W-2, and Form 1099-R recipient SSN must
   identify the spouse; the 1099-R must also be marked spouse-owned. The
   receipt, 5498, prior return, year-end statement, and 1099-R references are
   distinct. A 2025 receipt enters distribution basis immediately; a January
   1–April 15, 2026 receipt prints on line 4 and remains in line 14 rather than
   reducing the 2025 taxable distribution. Both timings reconcile Form 8606 Part
   I and spouse native/PDF identity with joint Form 1040 lines 4a/4b. Positive
   and owner, source, receipt-date, worksheet, return, and printed-line tamper
   fixtures are authored for the deferred gate. The
   [2025 instructions](https://www.irs.gov/instructions/i8606) require separate
   owner forms on joint returns and line 4 for contributions made after 2025;
   [Form 5498](https://www.irs.gov/pub/irs-prior/f5498--2025.pdf) box 1 includes
   2025 designated contributions received through April 15, 2026. Additional
   custodians, contributions, distributions, and source-byte authentication
   remain open.
3. One first-year taxpayer Roth IRA route requires an opening statement
   confirming all Roth IRAs and no prior Roth activity, an issued 2025 Form 5498
   with positive box 10 and zero boxes 2/3, a separate dated contribution
   receipt, and one later code J Form 1099-R with taxable amount undetermined.
   The contribution precedes the distribution. Conversion, plan rollover,
   homebuyer, disaster, repayment, QCD, HSA transfer, and other Roth
   distribution cases are excluded. Form 8606 Part III prints lines 19–25c,
   deducting contribution basis before calculating taxable earnings. The taxable
   earnings reach Form 1040 line 4b and Form 5329's early distribution line;
   gross reaches Form 1040 line 4a. Native and PDF export replay the source,
   owner, printed lines, Form 1040, and Form 5329. The same first-year source
   shape now supports one spouse-owned code J payment on a joint return when the
   spouse owns the opening statement, Form 5498, contribution receipt, issued
   Form 1099-R, and sole Form 5329 early-distribution entry. The native and PDF
   Form 8606 print the spouse's name and SSN; the return's IRA totals remain
   joint. The issued Form 1099-R recipient SSN is now required to match the
   reviewed Roth owner's SSN for both taxpayer and spouse routes; the native
   and PDF replay rejects changed or missing recipients. The focused taxpayer
   and spouse tests passed on 2026-10-05, including a source mismatch and
   export tamper cases. The generic Part III calculation remains unsupported for
   export because it does not model qualifying distributions,
   first-time-homebuyer expense, prior contribution or conversion basis, and
   taxable earnings ordering.
4. Focused node and serializer tests now cover source-to-print routing, native
   owner and line tags, and unsupported shapes, but were not run. The shared
   `builder.test.ts` rejects aggregate-only Form 8606 data and contains an
   absent-form check; there is no flat-payload fallback.

## Smallest safe rebuild boundary

The bounded routes above are written, not yet verified. The IRS form explicitly
says that with no traditional IRA distribution or Roth conversion, line 3
carries to line 14 and the intervening Part I lines are skipped. Broader
distribution, conversion, other Roth, other zero-prior-basis fact patterns, and
other married/spouse paths must wait for source-specific rules and
owner-separated documents. Reconcile the shared builder fixtures, then run the
agreed full batch, TY2025 XSD check, PDF inspection, and IRS business-rule/ATS
gates. The current Form 5498 and prior-return facts are reviewed fields, not
authenticated source bytes; copy authentication and additional
custodians/contributions remain open.
