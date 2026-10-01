# TY2025 extension payment on the final Form 1040 (build pass, unrun)

The [2025 Schedule 3 instructions](https://www.irs.gov/instructions/i1040gi) put
an amount paid with a request for extension on line 10. Schedule 3 line 15 then
reaches Form 1040 line 31, and lines 32 and 33 include that payment. Standalone
Form 4868 submission remains outside the current product release.

The public `ext` input now requires one reviewed payment record before a
positive line 7 amount can feed Schedule 3. The record names tax year 2025, the
primary taxpayer SSN and, for a joint return, the spouse SSN, a valid payment
date from January 1 through April 15, 2026, the whole-dollar amount, distinct
payment-confirmation and accepted extension-request references, and affirmative
acceptance review. The amount must equal `ext.line_7_amount_paying`. The
final-return MeF and PDF builders reject a positive Schedule 3 line 10 without
that source, or if the source owner differs from the filer. They also reconcile
line 10 to the source, Schedule 3 line 15 to Form 1040 line 31, line 32 to other
refundable payments, and line 33 to withholding, estimated payments, and
line 32. This is a direct source contract; a bare legacy line 7 amount no longer
creates a final-return payment.

A full-return positive fixture and missing-source, wrong year, owner, amount,
date, and altered printed-total fixtures are written for the deferred bulk test
pass. The references are entered reviewed facts, not authenticated IRS
acknowledgment or payment bytes. Disaster-relief deadlines, later payment dates,
joint-payment allocation after separate filing, Form 2210 payment timing,
standalone Form 4868, native XSD, filled-PDF review, and ATS acceptance remain
open.
