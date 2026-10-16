# TY2026 Form 5329 graph contract

Sources: pinned [2026 draft Form 5329](../corpus/draft/f5329.pdf)
(SHA-256 `f8822ccc8d14eca9424255d3b9606a8c210143ad8a317018f50222d03740edbe`)
and [draft instructions](../corpus/draft/i5329.pdf)
(SHA-256 `55f531aad380ec1ac63cc697e0f5d0cd603c503e18cebd9fb04b0bd46633aa35`).
The final [2026 Form 1099-R instructions](../corpus/authorities/i1099r--2026.pdf)
define the payment codes and SIMPLE participation period. Final forms/instructions
and current IRS acceptance remain filing gates.

## Connected Part I sources

The registered `f1099r` source supports single-code 1 and S distributions alongside
the [ordinary retirement paths](./FORM1099R-GRAPH.md). It derives taxable income
from a no-basis traditional/SEP/SIMPLE IRA or a payer-determined qualified pension,
then requires a reviewed inventory of actual payment dates, gross amounts and
taxable amounts. Payments must reconcile to the current issued statement and occur
before age 59½. Repeated payment references within the same owner/payer/account
are rejected across statements as well as within one statement.

The source review must establish that no additional-tax exception applies. Code 1
alone is not evidence for that conclusion. SIMPLE distributions additionally need
the first actual contribution date: code S is valid only within two years of that
date, and a code 1 SIMPLE payment must be on or after the second anniversary.
Governmental 457(b) early payments require separate rolled-in asset history and
remain blocked rather than being assigned the ordinary plan tax.

The 2025 Form 5329 node and 2026 source share `earlyDistributionAdditionalTax`.
Existing 2025 exception validation, Roth review and rounding behavior remain in
the 2025 owner node. The 2026 path derives its own validated regular/SIMPLE bases.
No legacy 2025 source schema or precomputed penalty is exposed as a 2026 input.

## Owner calculation and return routing

| Value | Current calculation |
| --- | --- |
| Line 1 | Each owner's combined early taxable distributions, summed in cents and rounded once for the filed line |
| Line 2 | Zero; this source route verifies no exception |
| Line 3 | Line 1 less line 2 |
| Line 4 | 25% of the rounded SIMPLE two-year portion plus 10% of the remaining filed line 3 base, rounded once |
| Schedule 2 line 5 | Sum of the separately rounded owner Form 5329 taxes when forms are required |

If every current 1099-R on the return has code 1 and its full gross amount is
subject to the 10% tax, the direct Schedule 2 route rounds the combined taxable
base once, computes the tax and marks the form-not-required checkbox. Otherwise
each affected owner gets a separate Form 5329, including mixed ordinary/early
statements, partial-taxable pensions, and combined regular/SIMPLE distributions.
The owners' income still aggregates on Form 1040; their additional tax is kept
separate through Schedule 2 line 5, its totals, Form 1040 line 23 and settlement.

Form 1062 accepts the connected section 72(t) tax as an explicit exclusion from
regular tax under [26 USC 26(b)(2)(C)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartA-sec26.htm).
Its actual-return reconciliation retains that payable tax while the farmland
calculation excludes it from lines 2 and 10; see the
[Form 1062 instructions](https://www.irs.gov/instructions/i1062).

## Draft PDF

The [field inventory](../inventories/pdf-fields/pdf-fields-f5329.csv) records all
85 canonical widgets. Each attachment uses the individual owner's name and SSN,
prints Part I lines 1, 3 and 4, and leaves unclaimed exceptions and unused parts
blank. The draft cover is excluded; the three official pages remain in attachment
sequence 29, with taxpayer and spouse forms kept separate. Original source forms
are retained unchanged where federal withholding requires an attachment.

The renderer replays the source calculation and requires an exact match to the
combined Schedule 2 destination and owner identity. Generated pages are static,
without AcroForm fields or annotations, and carry development labels below the IRS
footer. These files are incomplete development drafts, not filing artifacts.

## Required remaining work

1. Each Part I exception, with instruction-specific evidence and limits, including
   qualified long-term-care distributions, emergency expenses, domestic abuse,
   medical and education expenses, death/disability and incorrectly coded age.
2. IRA basis and Roth recapture via Form 8606, indirect/partial rollovers,
   disaster distributions and repayments, and governmental 457(b) rolled-in assets.
3. Parts II–XI: education/ABLE distributions, excess contributions, RMD shortfalls,
   Trump-account contributions and excess-contribution earnings, each with the
   applicable source forms, owner separation and prior-year carryovers.
4. Final TY2026 form/instruction comparison, current MeF mapping/rules and ATS
   acceptance. The older May v1 MeF package remains research material.

These remain required parity work. The connected Part I routes do not establish
complete Form 5329 or retirement filing support.

## Validation evidence

The connected implementation passed 864 current 2026 tests, 52 focused tests
(including the existing 2025 Form 5329 regressions and farmland interaction), and
137 repository unit checks. Seventeen rendered pages across direct-reporting,
SIMPLE and joint-owner cases were reviewed. Tests check the direct-reporting
checkbox, owner names/TINs, Part I values, settlement, source contradictions,
static field state and stale destination rejection. IRS acceptance remains open.
