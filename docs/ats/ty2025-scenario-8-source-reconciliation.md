# TY2025 Form 1040 ATS Scenario 8 source reconciliation

Status: blocked as a complete ATS scenario. These are source observations, not
an IRS acceptance or a decision to disregard a checked box.

## What the packet establishes

- The printed Form 1040 checks line 4c QCD, leaves line 4a blank, and prints
  zero on line 4b. It also checks line 5c rollover.
- Liberty Trust's 1099-R has $35,800 gross, zero taxable, zero withholding,
  box 7 code Q, and an unchecked IRA/SEP/SIMPLE box. Under the [2025 Form
  1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf),
  code Q means a qualified Roth IRA distribution. The unchecked IRA box is
  normal for a non-SIMPLE Roth IRA; it is not evidence that this is not an IRA.
  Code Q and zero taxable do not establish a QCD.
- Jubilee's 1099-R has $20,300 gross, $10,300 taxable, $2,555 withheld, box 7
  code G, and an unchecked IRA/SEP/SIMPLE box. Code G supplies evidence for a
  direct rollover from an employer plan. The [2025 Form 1040
  instructions](https://www.irs.gov/instructions/i1040gi) direct the filer to
  check line 5c for a direct rollover. A taxable code-G rollover to a Roth
  destination is possible, so its $10,300 box 2a is not itself a contradiction.

Source: [official IRS Scenario 8 packet](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf),
pages 1, 2, 4, and 5.

## Unresolved QCD mark

The packet does not identify a direct trustee payment to an eligible charity,
the QCD amount, or how the checked line 4c relates to the code-Q distribution.
The [2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf)
introduced code Y to identify QCDs and specify its combinations with codes 4,
7, or K, not Q. The printed 1099-R has Q alone. The cover sheet gives no extra
QCD facts. Do not infer that all or part of $35,800 was donated, change code Q
to Y, or discard the printed line 4c check. Obtain a corrected IRS scenario
packet or explicit IRS ATS clarification identifying the intended QCD amount,
source distribution, and direct charitable payment, or confirming the line 4c
mark is an error.

The current calculation fixture intentionally has no QCD fields. Its numerical
return assertions are provisional and cannot establish a complete ATS case.
The code-G Form 1099-R and the packet's printed line 5c mark together establish
the direct-rollover source fact. Code G alone is insufficient because the 2025
Form 1099-R instructions also use it for designated Roth employer contributions.
The Form 1040 node now carries that confirmed pension/plan checkbox to native MeF and the 2025 PDF field,
with source checks in both output builders. Focused cases are written but have
not been run under the build-first instruction. This does not resolve the
separate QCD source blocker.

No complete Scenario 8 XML/PDF or IRS business-rule acceptance is claimed.
