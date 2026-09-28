# TY2025 Form 8606 coverage gap

Status: bounded taxpayer-owned, no-activity Part I native MeF route written
but unrun. Tests, local XSD validation, filled PDF rendering, and IRS ATS
remain outstanding.

## Structural mismatch

The checked-in TY2025 v5.4 `IRS8606.xsd` requires
`Form8606IRANamelineTxt` and `NondedIRATxpyrWithIRASSN` before any line
amounts. Its Part I line 1 is `NondedIRACurrTYNondedContriAmt`, line 14 is
`NondedIRATotalIRABasisAmt`, Part II line 18 is
`TaxableIRAConversionAmt`, and Part III line 25c is
`TaxableIRADistributionAmt`. The eight former flat tags were removed from
`forms/f1040/2025/mef/forms/f8606.ts`. The new descriptor emits the required
owner name and SSN first, then native Part I lines 1, 2, 3, and 14 in XSD
order for its supported slice.

The [2025 Form 8606](https://www.irs.gov/pub/irs-pdf/f8606.pdf) says married
filers prepare separate forms for each spouse who must file. The return-level
MeF context knows the taxpayer and spouse identities, but the Form 8606 node
does not identify which spouse owns each IRA contribution or distribution.
Attaching the primary filer identity to an unclassified source would be an
unsupported assumption.

## Calculation and output blockers

1. The node now self-emits explicit IRA owner and no-activity attestations,
   source traditional/Roth distribution and conversion amounts, and its
   calculated Part I print lines. The MeF descriptor rejects missing owner,
   joint/spouse ambiguity, any IRA distribution or conversion, absent 2024
   line-14 basis documentation, and inconsistent line arithmetic. The source
   and XML path is intentionally only a positive 2025 nondeductible taxpayer
   contribution with positive prior basis and no IRA activity.
2. The [2025 instructions](https://www.irs.gov/pub/irs-pdf/i8606.pdf) and
   form require line 4 for 2025 contributions made during January 1 through
   April 15, 2026. The current calculation does not collect that portion,
   so its distribution-year line 5 and basis-ratio result can be wrong.
   It also lacks the current-year rollover/repayment, qualified-disaster,
   and first-time-homebuyer facts called for on lines 6-7, 15b-15c,
   20-21, and 25b-25c.
3. The Part III calculation subtracts combined contribution and conversion
   bases from gross Roth distribution in one step. The form orders those
   amounts through lines 19-25 and has distinct qualifying-distribution,
   first-time-homebuyer, contribution-basis, conversion-basis, and taxable
   rules. Its current single amount cannot be mapped into those lines.
4. Focused node and serializer tests now cover source-to-print routing, native
   owner and line tags, and unsupported shapes, but were not run. The shared
   `builder.test.ts` still has three legacy Form 8606 fixtures for the owner
   of that shared file to reconcile before the full batch. The flat payload
   is not accepted as a fallback.

## Smallest safe rebuild boundary

The bounded route above is written, not yet verified. The IRS form explicitly
says that with no traditional IRA distribution or Roth conversion, line 3
carries to line 14 and the intervening Part I lines are skipped. Broader
distribution, conversion, Roth, zero-prior-basis, and married/spouse paths
must wait for source-specific rules and owner-separated documents. Reconcile
the shared builder fixtures, then run the agreed full batch, TY2025 XSD check,
PDF inspection, and IRS business-rule/ATS gates.
