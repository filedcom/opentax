# TY2025 Form 8839 coverage gap

Status: bounded calculation correction written but unrun. Native `IRS8839`
MeF and filled-PDF output remain unsupported. This work did not run tests,
local XSD validation, PDF rendering, or IRS ATS.

## 2025 credit correction

The [2025 Form 8839](https://www.irs.gov/pub/irs-pdf/f8839.pdf) and
[instructions](https://www.irs.gov/pub/irs-pdf/i8839.pdf) added a refundable
credit of up to $5,000 **per eligible child**. Part II line 11b takes the
smaller of each child's post-phaseout line 11a and $5,000; line 11c totals
those amounts; line 13 goes to Form 1040 line 30. Line 14 is line 12 minus
line 13, line 15 is any prior nonrefundable carryforward, and line 18 is
limited by Credit Limit Worksheet line 5 (shown on line 17).

`forms/f1040/nodes/intermediate/forms/form8839/index.ts` formerly routed
all adoption credit to nonrefundable Schedule 3 line 6c. It also treated
missing tax liability as unlimited and returned no outputs when MAGI was
fully phased out, losing taxable W-2 adoption benefits from Form 1040
line 1f. The current bounded correction computes the $5,000 amount for
each child, sends the refundable total to Form 1040 line 30, limits the
current-year nonrefundable remainder using an explicitly entered Credit
Limit Worksheet line-5 result, requires sourced MAGI, and preserves full
taxability of benefits above the MAGI phaseout. Focused cases were updated
and added, but not run.

This is **not** a complete adoption-credit path. The child input has no
name, birth year, identifying number, adoption-final year, or expense
payment-year ledger. The existing `prior_year_credit` reduces the current
child maximum; it is not the separate prior-year nonrefundable carryforward
on Form 8839 line 15. No line-15 carryforward is accepted or routed. The
`credit_limit_worksheet_line5` is the required *completed* worksheet
result after other specified credits, not gross Form 1040 tax. The former
`income_tax_liability` node input was removed without an alias. Source
provenance and that worksheet's interaction with
other credits remain to be implemented. The MFS eligibility exception and
taxable-benefit treatment need a separate source-backed route. The node now
throws when an MFS return has adoption credit or employer-benefit facts
rather than silently dropping them.

## Native XML and PDF blockers

The checked-in TY2025 v5.4 `IRS8839.xsd` requires at least one
`AdoptedChild` group before top-level lines. That group carries the child's
identity and per-child Part II/III values. Top-level native fields include
`AdoptionCreditModifiedAGIAmt` (line 7),
`RefundableAdoptionCreditAmt` (line 11c),
`NonrefundableAdoptionCreditAmt` (line 18), and
`TaxableBenefitsForm8839Amt` (line 31). None of the three flat tags in
`forms/f1040/2025/mef/forms/f8839.ts` is a direct child matching these
native fields. The current node also does not emit a Form 8839 print-field
record for the MeF builder, so simply renaming tags would not recover
the per-child calculations.

`forms/f1040/2025/pdf/forms/f8839.ts` maps only three raw inputs and skips
the mandatory child rows and both credit outputs. Its comments also label
the 2025 MAGI and credit-limit lines incorrectly. It needs an independently
verified AcroForm map and filled-render check after the line-level model
is available.

## Smallest safe filing slice

Start with one finalized, domestic adoption with documented child identity,
2024/2025 expense timing, no employer benefits, no prior-year credit or
carryforward, and an explicit completed Credit Limit Worksheet line 5.
Compute and retain that child's Part II lines 2-11b and top-level lines
7-18; emit the required nested native `AdoptedChild` group and checked
Form 1040/Schedule 3 values. Add benefits, multiple children, special
needs, foreign adoptions, prior carryforwards, and MFS exceptions only
after their distinct source and attachment rules are modeled. Do not
retain the current flat XML as a compatibility fallback.
