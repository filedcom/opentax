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

The bounded paired-owner path also allows one owner's line 14b HSA rollover
alongside a disability exception. The rollover must identify a code-1 Form
1099-SA and one dated transaction before or after disability. Every dated
transaction explicitly allocates rollover dollars (including zero); exactly
one matches the rollover amount, date, and transaction reference. Qualified
medical and rollover allocations cannot exceed transaction gross. The taxable
exception after disability subtracts both allocations, while taxable dollars
before disability retain the 20% charge. Both owners' printed Forms 8889,
combined Schedule 1/2 and Form 1040 totals, native MeF, and PDF are
recomputed from the owner source before export.

Disability plus age-65, timely excess withdrawal, multiple paired rollovers,
death, and nonspouse beneficiary rules remain open. Source references and
disability confirmation are entered evidence, not independently authenticated
medical or trustee records. Focused calculator, MeF, and PDF cases are written
but intentionally unrun pending the agreed full test batch; XSD, visual PDF,
and ATS gates also remain open.
