# TY2025 current-year PAB Form 4952 AMT refigure

The frozen Form 4952/Form 6251 parent requires a sourced difference between
regular and AMT investment-interest deductions. The
[2025 Form 6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf),
line 2c Steps 1–4, require a second Form 4952 calculation. Specified
private-activity bond interest included on Form 6251 line 2g also enters AMT
Form 4952 line 4a. Line 2c is regular Form 4952 line 8 less AMT line 8.

The public input `form4952PabAmtInputs()` contains one issued Form 1099-INT copy
with $18,000 taxable box 1 interest and $5,000 specified PAB boxes 8/9, an
identified owner and payer, bond identifier, eligibility review, and a
zero-expense allocation workpaper. A distinct $100,000 taxable-security loan has
two retained $10,000 payments and no tax-exempt use. This is current-year
source; it does not claim a 2024 accepted return or carryover. The retained ISO
Form 3921 and W-2 produce an otherwise complete AMT return.

The sourced regular Form 4952 line 8 is $18,000. AMT line 4a adds $5,000 PAB
interest, so AMT line 8 is $20,000 and Form 6251 line 2c is −$2,000. Form 6251
line 2g is $5,000; AMTI is $443,000; the exemption is $88,100; and the tentative
minimum tax is $94,590. Its regular tax is $41,063, AMT $53,527, and Form 1040
total tax $94,590. Removing the PAB source while retaining the taxable interest
and paid loan keeps regular Form 4952 line 8 at $18,000, sets both Form 6251
lines 2c/2g to zero, and gives AMTI $440,000 and total tax $93,750. The $840
difference follows from 28% of the $3,000 net AMTI effect. The
[2025 Form 4952 PDF](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) includes
its instructions on pages 3–4.

The unchanged saved public input is
`/tmp/opentax-form4952-amt-pab-complete-before-oct6/source.json`. The
preimplementation public graph calculates the same sourced amounts, but native
preparation rejects the PAB-bearing Form 4952 as unsupported;
`/tmp/opentax-form4952-amt-pab-main-before-control-oct6.log` retains that
control. The bounded new filing guard ties issuer/copy, PAB bond/expense review,
debt owner/use/payment, Form 4952 regular and AMT calculations, Schedule A, Form
6251, Schedule 2 and Form 1040. The full return also computes Form 8960 from its
retained interest and deduction facts. Missing or conflicting source and edited
pending/native/PDF operands reject.

The final typed public source gate is
`/tmp/opentax-form4952-amt-pab-final-oct7.log` (1 passed, 0 failed). Its
`source.json` is byte-identical to the saved preimplementation input; its
nine-page PDF SHA-256 is
`38a8fcf496d8cbdcbc7ef7437b246d49903e4f177bd327afb5a27970cb593601`, identical to
the previously rendered and visually reviewed packet at
`/tmp/opentax-form4952-amt-pab-complete-after-probe-oct6/rendered/`. `xmllint`
validates the final `return.xml` against the full TY2025 v5.4 XSD. The final PDF
has no AcroForm fields or widget annotations. Six source and filing modules are
held by SHA-256 in `/tmp/opentax-form4952-amt-pab-held-oct7.json`.

The actual four retained source archives from the preceding equal-refigure and
child-capital routes replayed on the frozen code, 4 returns and 102 pages.
`/tmp/opentax-form4952-amt-pab-prior4-oct7/report.json` records exact saved
whole pending graph, carryforwards, page origins and PDF bytes, native XML apart
from `ReturnTs`, fresh full-XSD validation, and unchanged original source and
code hashes. The terminal corrected runner log is
`/tmp/opentax-form4952-amt-pab-prior4-v2-oct7.log`. Its first attempt had a
missing Deno import-map option and did not execute a packet; that failed
diagnostic remains at `/tmp/opentax-form4952-amt-pab-prior4-oct7.log`.

This source route does not establish issuer authenticity, 2024 accepted
carryovers, PAB allocable expenses above zero, multiple issuers, separately
financed tax-exempt holdings, other Form 4952 investment-income elections, IRS
business-rule acceptance, or ATS transport.
