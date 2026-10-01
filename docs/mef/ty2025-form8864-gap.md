# TY2025 Form 8864 direct-producer source and filing boundary

The [December 2025 IRS instructions](https://www.irs.gov/instructions/i8864) and
[official form](https://www.irs.gov/pub/irs-pdf/f8864.pdf) retain the section
40A small agri-biodiesel producer credit for eligible 2025 fuel sales or use.
Lines 7 and 8 apply $0.10 per gallon through June 30 and $0.20 per gallon after
June 30. The older biodiesel, renewable-diesel and SAF credits expired for fuel
sold or used after 2024; a fiscal-year pass-through can still allocate an older
credit. Direct producer line 9 must be included in income, with Form 3800 Part
III line 1l reporting. A section 6418 transfer election for a second-half credit
needs pre-filing registration.

The new `f8864` source is a bounded, direct Schedule C **sale** route for a
registered small producer. It records Form 637 registration, facility capacity
no more than 60 million gallons, no group attribution, distinct production
batches and sale invoices, eligible agri-biodiesel feedstock, North American
feedstock origin, documented qualifying buyer fuel use, dated sales, and no more
than 15 million credited gallons. It excludes transfer elections, pass-through
credits and recapture events. The sourced line 9 is reconciled to one
taxpayer-owned Schedule C producer's line 6 other income; this bounded join
requires that line 6 contain only the credit inclusion.

The public node remains **fail-closed** and emits no tax credit. The official
one-page PDF fields for lines 7-11 were read from the AcroForm and staged in an
unregistered descriptor. No `IRS8864` TY2025 XSD is checked into this
repository; the native MeF descriptor, Form 3800 limit, Schedule 3 credit,
transfer election, fiscal-year/K-1 recipient, seller self-use, controlled-group
attribution and Form 6251 AMT income adjustment remain unimplemented. Reviewed
registration, feedstock, capacity, invoice and buyer-use references are retained
source facts; the return graph does not inspect their document bytes. Authored
positive and tamper fixtures await the final bulk test pass.
