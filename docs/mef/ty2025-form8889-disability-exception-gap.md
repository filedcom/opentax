# TY2025 Form 8889 disability distribution exception

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
exclude HSA distributions made after the beneficiary becomes disabled from the
additional 20% tax on line 17b. The taxable distribution still reaches line 16.
The
[2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
assign box 3 code 3 to distributions made after disability.

The bounded TY2025 route now accepts code 3 with a sourced disability date and
an explicit section 72(m)(7) disability determination. Every 2025 withdrawal has
a date, gross amount, qualified-medical amount, distinct transaction reference,
and reference to a Form 1099-SA. Transaction gross amounts must reconcile
separately to each Form 1099-SA box 1; qualified amounts must reconcile to
line 15. The taxable portion dated on or after disability must equal the claimed
exception portion of line 16. A code 3 distribution dated before disability, an
unsupported code 3, mismatched transaction, or reused paired-owner transaction
reference rejects. A 20% charge remains on the taxable portion before
disability.

The bounded paired-owner path also allows one owner's line 14b HSA rollover
alongside a disability exception. The rollover must identify a code-1 Form
1099-SA and one dated transaction before or after disability. Every dated
transaction explicitly allocates rollover dollars (including zero); exactly one
matches the rollover amount, date, and transaction reference. Qualified medical
and rollover allocations cannot exceed transaction gross. The taxable exception
after disability subtracts both allocations, while taxable dollars before
disability retain the 20% charge. Both owners' printed Forms 8889, combined
Schedule 1/2 and Form 1040 totals, native MeF, and PDF are recomputed from the
owner source before export.

The paired route also accepts one spouse's dated age-65 exception and the other
spouse's dated disability exception in the same return. Both owners need
separate source references; the disability owner needs a code-3 Form 1099-SA for
the withdrawal after disability. Native and PDF export recompute both Forms 8889
and match their taxable distributions and 20% charges to Schedule 1, Schedule 2,
and Form 1040 lines 8 and 23. A positive paired-owner fixture and changed
disability-source and Form 1040 tax fixtures are authored for deferred
validation. This bounded combination excludes rollovers, prior excess, and Part
III testing-period events.

One primary HSA owner can also combine age-65 and disability exceptions in 2025.
This bounded allocation accepts distinct code-1 Form 1099-SA sources before
disability and a code-3 source afterward, where the owner reached age 65 before
becoming disabled. Dated transactions reconcile to each source's box 1 and
together to lines 14a and 15. The exception on line 17a covers the taxable
withdrawals after age 65; line 17b retains 20% of the taxable amount before
age 65. The positive fixture checks Schedule 1 line 8f, Schedule 2 line 17c,
Form 1040 line 8, and native/PDF Form 8889. Changed disability date, Form
1099-SA code, and filed Schedule 2 tax are rejected. This route does not combine
a rollover or timely excess withdrawal, or allow a single 1099-SA source to span
the two dated ledgers.

The complementary dated route covers disability before age 65. The code-3 Form
1099-SA transactions fall after disability and before the 65th birthday; code-1
transactions may fall before disability or after age 65. Each source belongs to
exactly one ledger, and the taxable portions after the applicable event reach
line 17a while earlier taxable withdrawals retain the 20% tax. The positive
fixture joins Schedule 1/2 and Form 1040 to native/PDF lines; changed disability
date, distribution code, and filed tax are rejected.

Same-day event ordering, code-3 distributions after age 65 in the
disability-first route, timely excess withdrawal, multiple paired rollovers,
death, and nonspouse beneficiary rules remain open. Source references and
disability confirmation are entered evidence, not independently authenticated
medical or trustee records. Focused calculator, MeF, and PDF cases are written
but intentionally unrun pending the agreed full test batch; XSD, visual PDF, and
ATS gates also remain open.
