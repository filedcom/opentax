# TY2025 Schedule EIC child residency projection

The [2025 Schedule EIC](https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf)
line 6 asks for the number of months a qualifying child lived with the filer
**in the United States**. The [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require more than half-year U.S. residence for the qualifying-child EIC, subject
to their stated exceptions.

`general.dependents` currently records `months_in_home` and the reviewed
`lived_in_us_over_half_year` Boolean. The calculation requires both home
residence and that U.S. Boolean. The native and PDF preflight already matches
the Schedule EIC child SSN, name, relationship, date of birth, and home months
to exactly one general dependent. It now also rejects a positive child EIC if
that matched dependent's U.S. residence Boolean is absent or false. This
prevents a tampered source from retaining Schedule EIC and Form 1040 line 27a
after the U.S. residence answer changes.

The exact U.S. month count remains unavailable: `months_in_home` can exceed
the number of months the child lived with the filer in the United States. Both
native and PDF descriptors currently print home months on Schedule EIC line 6.
An exact line 6 route needs a distinct reviewed U.S.-residence month source,
including the form's under-seven-month rounding and birth/death exceptions,
then direct projection through the EIC child detail. A Boolean cannot supply
that number. This slice does not infer or fabricate it.
