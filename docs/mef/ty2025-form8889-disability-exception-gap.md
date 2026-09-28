# TY2025 Form 8889 disability distribution exception

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
exclude HSA distributions made after the beneficiary becomes disabled from the
additional 20% tax on line 17b. The taxable distribution still reaches line 16.
The [2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
assign box 3 code 3 to distributions made after disability.

The bounded TY2025 route now accepts code 3 with a sourced disability date and
an explicit section 72(m)(7) disability determination. Every 2025 withdrawal
has a date, gross amount, qualified-medical amount, distinct transaction
reference, and reference to a Form 1099-SA. Transaction gross amounts must
reconcile separately to each Form 1099-SA box 1; qualified amounts must
reconcile to line 15. The taxable portion dated on or after disability must
equal the claimed exception portion of line 16. A code 3 distribution dated
before disability, an unsupported code 3, mismatched transaction, or reused
paired-owner transaction reference rejects. A 20% charge remains on the
taxable portion before disability.

This path does not combine disability with an age-65 exception or line 14b
exclusions. Those combinations need a shared transaction allocation that can
identify each excluded dollar without double counting. Death and nonspouse
beneficiary rules remain open. Source references and disability confirmation
are entered evidence, not independently authenticated medical or trustee
records. Focused calculator, MeF, and PDF cases are written but intentionally
unrun pending the agreed full test batch; XSD, visual PDF, and ATS gates also
remain open.
