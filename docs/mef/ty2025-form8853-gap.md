# TY2025 Form 8853 coverage boundary

Sources:
[IRS 2025 Form 8853](https://www.irs.gov/pub/irs-prior/f8853--2025.pdf),
[2025 Instructions for Form 8853](https://www.irs.gov/pub/irs-prior/i8853--2025.pdf),
and the checked-in TY2025 v5.4 `Common/IRS8853/IRS8853.xsd`.

## Bounded PDF correction

The 2025 PDF descriptor previously placed several Archer MSA, Medicare Advantage
MSA, and LTC source amounts on unrelated form lines, including the name/SSN
header. Its source-field positions now match the 2025 AcroForm: Archer lines 6a,
6b, and 7; Medicare lines 10 and 11; and LTC lines 17, 18, 19, 22, and 24. Raw
`ltc_period_days` was removed from the PDF map because printed line 21 is **$420
times the days**, not a day count. Focused mapping cases are written but unrun.
The filled PDF has not been visually inspected.

This is only a field-placement correction. The remaining calculated lines,
identity, elections, and native XML are not filing-ready.

## End-to-end blockers

- The node emits Schedule 1, the AGI aggregator, and Schedule 2 outputs, but no
  `form8853` output containing computed lines 5, 6c, 8, 9b, 12, 13b, 20, 21, 23,
  25, or 26. Thus the form descriptor receives at most raw source facts. Form
  8853 must still be filed for MSA distributions even when taxable income is
  zero.
- The native builder writes flat, non-schema tags. The v5.4 XSD nests Section
  A/B in `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN`, and
  Section C in `SectCLTCInsuranceCntrctGrp` with required policyholder/insured
  identity and line 15/16 answers. For example, `EmployerArcherMSAContriAmt` and
  `LTCPeriodDaysCnt` in the builder are not the XSD's
  `ArcherMSAEmployerContriAmt` and computed `LTCDaysMultiplyByPerDiemAmt`.
  Existing unit tests assert the flat tags rather than schema-valid XML.
- One boolean `archer_msa_exception` or `medicare_advantage_exception` currently
  removes the additional tax from **all** taxable distributions. IRS
  instructions say to check line 9a or 13a if **any** distribution qualifies,
  but calculate the additional tax on the remaining nonexcepted amount. For
  Medicare Advantage MSAs, line 13b also has a worksheet that can reduce the
  taxable penalty base when an MSA existed at the end of 2024. The source model
  lacks distribution-level exempt amounts and the prior-year balance/HDHP
  deductible facts.
- The Section C source model lacks policyholder and insured identities,
  terminally ill status, line 15 other-payee answer, LTC period method, and
  separate periods. IRS instructions require separate Section C calculations for
  multiple LTC periods and a multiple-payee statement when line 15 is Yes. A
  single undifferentiated days/expenses/reimbursements tuple cannot safely
  represent those paths.
- Archer contributions need an account-holder and monthly eligibility/HDHP
  coverage worksheet. The current precomputed line 3 can support a bounded
  manually substantiated case, but it does not validate the 2025 chart, Medicare
  eligibility, married coverage allocation, or excess contribution reporting.
  The node defaults missing compensation to infinity, whereas the printed line 5
  is the smallest of lines 2, 3, and 4. Until compensation is known, a positive
  deduction is not source-complete.
- Joint returns can require separate statement forms for each spouse's self-only
  Archer MSA or Medicare Advantage MSA, followed by a controlling form. Multiple
  Section C copies can also be required. One pending `form8853` object cannot
  represent that repeatable attachment structure.

## Acceptance cases before enabling a filing claim

1. Model each MSA account holder and each LTC insured/policyholder/period
   explicitly. Require source facts for every elected path and reject incomplete
   mixed-exception, multiple-payee, or Medicare special-worksheet cases instead
   of treating them as zero tax.
2. Compute the printed lines and retain a native Form 8853 output even when tax
   is zero but the form is required. Verify the Schedule 1/2 totals against
   those same computed lines and cover positive/zero/partially excepted
   distributions.
3. Emit both XSD groups in sequence with required identities and indicators,
   then validate against the checked-in v5.4 schema. Fill both PDF pages,
   including calculated lines and checkboxes, and visually inspect the result.

No compatibility layer or provisional fallback is proposed. The PDF change is
bounded; the rest remains an explicit gap until its source model, calculation,
native XML, and validation gates are complete.
