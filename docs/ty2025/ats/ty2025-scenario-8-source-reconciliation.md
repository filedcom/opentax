# TY2025 Form 1040 ATS Scenario 8 source reconciliation

Status: blocked as a complete ATS scenario. These are source observations, not
an IRS acceptance or a decision to disregard a checked box.

## What the packet establishes

- The printed Form 1040 checks line 4c QCD, leaves line 4a blank, and prints
  zero on line 4b. It also checks line 5c rollover.
- Liberty Trust's 1099-R has $35,800 gross, zero taxable, zero withholding, box
  7 code Q, and an unchecked IRA/SEP/SIMPLE box. Under the
  [2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf),
  code Q means a qualified Roth IRA distribution. The unchecked IRA box is
  normal for a non-SIMPLE Roth IRA; it is not evidence that this is not an IRA.
  Code Q and zero taxable do not establish a QCD.
- Jubilee's 1099-R has $20,300 gross, $10,300 taxable, $2,555 withheld, box 7
  code G, and an unchecked IRA/SEP/SIMPLE box. Code G supplies evidence for a
  direct rollover from an employer plan. The
  [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) direct
  the filer to check line 5c for a direct rollover. A taxable code-G rollover to
  a Roth destination is possible, so its $10,300 box 2a is not itself a
  contradiction.

Source:
[official IRS Scenario 8 packet](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf),
pages 1, 2, 4, and 5.

The current IRS download and the retained five-page local packet were compared
byte for byte on 2026-10-02. Both have SHA-256
`3016890611382ee3ae9876b7cd8c81260bcf8e1b611920aac82611fd52e02fae`.
I rechecked the checked-box source directly for this slice: a visual render of
PDF page 2 (the first Form 1040 page) shows the check mark in line 4c's box 2,
“QCD,” while line 4a has no printed amount. The retained packet and the local
Scenario 8 copy have the same hash, so this is the issued packet mark rather
than a local fixture-only annotation. The source-fact record already stores
`line4cQcdChecked: true`, and the focused source test asserts that value; this
capture preserves the mark as printed and does not resolve its conflict with
the supplied distribution facts.
The source fixture explicitly records the printed blank line 4a and checked
line 4c separately from the calculated $35,800 line 4a and unchecked QCD
output. No version difference explains the mismatch.

## Unresolved QCD mark

The packet does not identify a direct trustee payment to an eligible charity,
the QCD amount, or how the checked line 4c relates to the code-Q distribution.
The
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require a QCD's total IRA distribution on line 4a and the QCD box on line 4c.
They separately direct a code-Q Roth IRA distribution's total to line 4a, with
zero on line 4b. Thus the printed blank line 4a conflicts with the required
reporting of the one $35,800 code-Q distribution even if the QCD mark is an
unrelated error. A hypothesized additional QCD would also require a line 4a
amount and a separately identified distribution. The
[2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf)
introduced code Y to identify QCDs and specify its combinations with codes 4, 7,
or K, not Q. The printed 1099-R has Q alone. The cover sheet gives no extra QCD
facts. Do not infer that all or part of $35,800 was donated, change code Q to Y,
or discard the printed line 4c check. Obtain a corrected IRS scenario packet or
explicit IRS ATS clarification identifying the intended QCD amount, source
distribution, and direct charitable payment, or confirming the line 4c mark is
an error. If the mark is an error, the corrected Form 1040 should show $35,800
on line 4a, zero on line 4b, and an unchecked line 4c QCD box for the supplied
code-Q source. If the mark is intentional, the IRS must supply the missing QCD
source facts and a nonblank line 4a value; the present packet cannot establish
that amount.

The current calculation fixture intentionally has no QCD fields. The 1099-R
engine now routes the code-Q Roth distribution to Form 1040 line 4a even though
the payer left its IRA checkbox blank, and retains zero on line 4b. Its
source-backed native and PDF output therefore disagree with the packet's blank
line 4a and checked QCD box. The numerical return assertions remain provisional
and cannot establish a complete ATS case. Ask the IRS e-Help Desk whether the
intended test return should put $35,800 on line 4a and clear the QCD box, or
whether a corrected distribution/QCD source and different line 4a amount will be
supplied. Neither outcome can be inferred from the packet; the complete Scenario
8 assertion remains blocked. The code-G Form 1099-R and the packet's printed
line 5c mark together establish the direct-rollover source fact. Code G alone is
insufficient because the 2025 Form 1099-R instructions also use it for
designated Roth employer contributions. The Form 1040 node carries that
confirmed pension/plan checkbox to native MeF and the 2025 PDF field, with
source checks in both output builders. The code-Q gross route is asserted in the
Scenario 8 calculation, PDF projection, and local-XSD cases. The current PR's
full suite has not passed. This does not resolve the separate QCD source
blocker.

No complete Scenario 8 XML/PDF or IRS business-rule acceptance is claimed.
