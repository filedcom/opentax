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
validation. Either owner can also allocate one sourced, code-1 rollover on line
14b: a pre-disability withdrawal for the disability owner, or a dated pre-age-65
withdrawal for the age-exception owner. A dated deposit within 60 days, distinct
source references, and transaction-level rollover allocations reconcile the two
Forms 8889 with Schedule 1, Schedule 2, and Form 1040. Native/PDF fixtures for
each owner reject a late deposit and altered Form 1040 tax. This bounded
combination excludes two simultaneous rollovers, prior excess, and Part III
testing-period events.

One primary HSA owner can also combine age-65 and disability exceptions in 2025.
This bounded allocation accepts distinct code-1 Form 1099-SA sources before
disability and a code-3 source afterward, where the owner reached age 65 before
becoming disabled. Dated transactions reconcile to each source's box 1 and
together to lines 14a and 15. The exception on line 17a covers the taxable
withdrawals after age 65; line 17b retains 20% of the taxable amount before
age 65. The positive fixture checks Schedule 1 line 8f, Schedule 2 line 17c,
Form 1040 line 8, and native/PDF Form 8889. Changed disability date, Form
1099-SA code, and filed Schedule 2 tax are rejected. A single 1099-SA source
cannot span the two dated ledgers.

The complementary dated route covers disability before age 65. The code-3 Form
1099-SA transactions fall after disability, including after the 65th birthday;
code-1 transactions must precede disability. This follows the
[2025 Form 1099-SA code instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf):
code 1 applies if no other code applies, while code 3 applies after disability.
Each source belongs to exactly one ledger, and the taxable portions after
disability reach line 17a while earlier taxable withdrawals retain the 20% tax.
Age 65 does not add a further penalty exception after disability. The positive
fixture joins Schedule 1/2 and Form 1040 to native/PDF lines; changed disability
date, distribution code, and filed tax are rejected.

For either event order, one owner may also allocate a single HSA-to-HSA rollover
on line 14b. The excluded amount must belong to exactly one code-1, dated
age-ledger transaction and match the rollover's distribution source, Form
1099-SA, date, and amount. Every dated transaction marks its rollover amount,
including zero. The deposit source is distinct, and the existing
[60-day redeposit and same-beneficiary rules](https://www.irs.gov/instructions/i8889)
apply. Line 16 subtracts the rollover and qualified medical expense amounts
before line 17a/17b allocation. The positive native/PDF fixture and altered
rollover source, allocation, and Schedule 1 fixtures are authored for deferred
validation. For these same-owner combined exceptions, native/PDF export also
checks Form 1040 line 23 against the Form 8889 Part II penalty plus any Part III
tax; other sources of line 23 tax remain outside this bounded route.

When disability comes first, the rollover transaction must precede disability.
The authored fixture uses a January code-1 rollover and later code-3
distributions on both sides of the 65th birthday. Only the remaining taxable
January dollars incur the 20% charge. Changed rollover date, transaction
allocation, and Form 1040 line 23 are rejected.

One primary HSA owner with disability evidence alone may now allocate a single
post-disability HSA-to-HSA rollover from a code-3 Form 1099-SA. The rollover's
dated withdrawal must be strictly after the documented disability date, match
one dated transaction and the same code-3 box-1 source, and be redeposited to
the same beneficiary within 60 days. It reaches line 14b, reduces taxable line
16 and the line-17a exception allocation, and native/PDF export checks Schedule
1, Schedule 2, and final Form 1040 line 23. A positive source-to-return fixture
and altered date, owner, allocation, and final-tax fixtures are written but
unrun. The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
put qualified rollovers on line 14b without an age or disability restriction;
the
[2025 Form 1099-SA code instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
assign code 3 to distributions after disability.

Same-day event ordering, post-disability rollovers for paired owners or a
combined age-65/disability claim, timely excess withdrawal, more than one
rollover per owner, death, and nonspouse beneficiary rules remain open. Source
references and disability confirmation are entered evidence, not independently
authenticated medical or trustee records. Focused calculator, MeF, and PDF cases
are written but intentionally unrun pending the agreed full test batch; XSD,
visual PDF, and ATS gates also remain open.

## Separate paired owner rollovers (written, unrun)

The paired age-65 and disability route now accepts one sourced rollover for each
owner. Each owner has a distinct Form 1099-SA distribution reference, dated
withdrawal, contribution reference, and transaction-level excluded allocation;
the age-65 owner's rollover precedes age attainment and the disability owner's
precedes disability. Owner Form 8889 lines 14b, 16, and 17b reconcile to the
combined Schedule 1 income and Schedule 2 penalty, and native/PDF export checks
Form 1040 lines 8 and 23. Reused owner references and changed final tax reject.
Positive and tamper fixtures are authored for deferred bulk validation. This
route does not cover multiple rollovers for one owner, a post-disability
rollover, or source-byte authentication.
