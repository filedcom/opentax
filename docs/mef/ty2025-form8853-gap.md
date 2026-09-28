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

### Bounded native Archer MSA path now written

One narrow source-to-filing route is now implemented but unrun: a single
taxpayer-owned Archer MSA distribution whose whole-dollar gross amount is
confirmed from Form 1099-SA and is fully matched by unreimbursed qualified
medical expenses. The source must explicitly confirm no rollover, no tax
exception, and no other Form 8853 activity. The node retains a Form 8853
pending record even when lines 8 and 9b are zero. The MeF descriptor emits
the native `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN` and
calculated lines 6a, 6b, 6c, 7, and 8 in XSD order. It rejects spouse/joint
ambiguity and Schedule 1/2 conflicts. It does not emit flat legacy tags.

This does not establish general Form 8853 support. The remaining paths below
are still blocked, and neither the new XML nor the filled PDF has been run
through the agreed full batch, local XSD validation, visual review, or ATS.

- Other taxable Archer, Medicare, LTC, and contribution paths still lack a
  complete node print record and source model. The v5.4 XSD nests Section
  A/B in `ArcherMSAAndMedcrAdvntgMSAGrp` with required `MSAHolderSSN`, and
  Section C in `SectCLTCInsuranceCntrctGrp` with required policyholder/insured
  identity and line 15/16 answers. Section C remains unsupported; for example,
  raw `ltc_period_days` is not the XSD's computed
  `LTCDaysMultiplyByPerDiemAmt`. Focused native XML cases are written but unrun.
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
