# TY2025 Form 8606 coverage gap

Status: bounded taxpayer-owned no-activity and prior-basis distribution Part I
native MeF/PDF routes, plus one spouse-owned prior-basis distribution on a joint
return without a current contribution, written but unrun. One sourced 2025
nondeductible contribution with the taxpayer distribution is also written.
Tests, local XSD validation, filled PDF rendering, and IRS ATS remain
outstanding.

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
   cases are authored but unrun.
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
   mixed/multiple IRA sources remain open.
3. The Part III calculation subtracts combined contribution and conversion bases
   from gross Roth distribution in one step. The form orders those amounts
   through lines 19-25 and has distinct qualifying-distribution,
   first-time-homebuyer, contribution-basis, conversion-basis, and taxable
   rules. Its current single amount cannot be mapped into those lines.
4. Focused node and serializer tests now cover source-to-print routing, native
   owner and line tags, and unsupported shapes, but were not run. The shared
   `builder.test.ts` still has three legacy Form 8606 fixtures for the owner of
   that shared file to reconcile before the full batch. The flat payload is not
   accepted as a fallback.

## Smallest safe rebuild boundary

The bounded routes above are written, not yet verified. The IRS form explicitly
says that with no traditional IRA distribution or Roth conversion, line 3
carries to line 14 and the intervening Part I lines are skipped. Broader
distribution, conversion, Roth, other zero-prior-basis fact patterns, and other
married/spouse paths must wait for source-specific rules and owner-separated
documents. Reconcile the shared builder fixtures, then run the agreed full
batch, TY2025 XSD check, PDF inspection, and IRS business-rule/ATS gates. The
current Form 5498 and prior-return facts are reviewed fields, not authenticated
source bytes; copy authentication and additional custodians/contributions remain
open.
