# TY2025 Form 8606 coverage gap

Status: audit only. The registered `IRS8606` serializer is not a supported
native MeF filing path. This audit did not run tests, local XSD validation,
filled PDF rendering, or IRS ATS.

## Structural mismatch

The checked-in TY2025 v5.4 `IRS8606.xsd` requires
`Form8606IRANamelineTxt` and `NondedIRATxpyrWithIRASSN` before any line
amounts. Its Part I line 1 is `NondedIRACurrTYNondedContriAmt`, line 14 is
`NondedIRATotalIRABasisAmt`, Part II line 18 is
`TaxableIRAConversionAmt`, and Part III line 25c is
`TaxableIRADistributionAmt`. None of the eight tags emitted by
`forms/f1040/2025/mef/forms/f8606.ts` is a direct child of `IRS8606` in
that schema. An emitted document is invalid even when it contains just one
amount, and it lacks both required owner fields.

The [2025 Form 8606](https://www.irs.gov/pub/irs-pdf/f8606.pdf) says married
filers prepare separate forms for each spouse who must file. The return-level
MeF context knows the taxpayer and spouse identities, but the Form 8606 node
does not identify which spouse owns each IRA contribution or distribution.
Attaching the primary filer identity to an unclassified source would be an
unsupported assumption.

## Calculation and output blockers

1. `forms/f1040/nodes/intermediate/forms/form8606/index.ts` emits Part I
   `print_line1`, `print_line2`, `print_line3`, and `print_line14`, with a few
   distribution/conversion fields. The current MeF builder instead reads raw
   keys such as `nondeductible_contributions` and `prior_basis`. It therefore
   ignores the calculated print output that reaches pending documents.
2. A bounded no-distribution Part I route could map lines 1, 2, 3, and 14
   directly, as the printed form instructs. It still requires explicit IRA
   owner identity, and must prove there was no traditional IRA distribution,
   Roth conversion, or Roth distribution. The node's print output does not
   flag a Roth distribution, so absence of the current Part I distribution
   fields does not establish that this is a no-distribution return.
3. The [2025 instructions](https://www.irs.gov/pub/irs-pdf/i8606.pdf) and
   form require line 4 for 2025 contributions made during January 1 through
   April 15, 2026. The current calculation does not collect that portion,
   so its distribution-year line 5 and basis-ratio result can be wrong.
   It also lacks the current-year rollover/repayment, qualified-disaster,
   and first-time-homebuyer facts called for on lines 6-7, 15b-15c,
   20-21, and 25b-25c.
4. The Part III calculation subtracts combined contribution and conversion
   bases from gross Roth distribution in one step. The form orders those
   amounts through lines 19-25 and has distinct qualifying-distribution,
   first-time-homebuyer, contribution-basis, conversion-basis, and taxable
   rules. Its current single amount cannot be mapped into those lines.
5. Existing `f8606.test.ts` and `builder.test.ts` cases assert the eight
   non-schema tags and allow Form 8606 XML without owner identity. A real
   rebuild must replace these assertions with source-to-calculation,
   identity, native-field, and negative incomplete-source cases; preserving
   the old shape as a fallback would leave invalid XML live.

## Smallest safe rebuild boundary

Begin with one taxpayer-owned, nondeductible traditional IRA contribution,
no distributions or conversions of any IRA type, and a documented prior-year
Form 8606 line-14 basis. Capture the IRA owner explicitly; emit line 1,
line 2, line 3, and line 14 from validated print fields plus that owner's
name and SSN. Reject spouse ambiguity and all other IRA activity at the
builder boundary until their line-specific calculations and separate-owner
forms are implemented. Then update the shared MeF-builder fixtures and run
the agreed single full batch, local TY2025 XSD validation, PDF inspection,
and IRS business-rule/ATS gates.
