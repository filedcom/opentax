# TY2025 IRA late-rollover self-certification

[Revenue Procedure 2020-46](https://www.irs.gov/irb/2020-45_IRB) permits a
taxpayer to certify a missed 60-day rollover deadline to the receiving IRA
trustee or plan administrator for one of twelve listed reasons. It requires no
prior IRS denial for that distribution and a contribution as soon as
practicable after the reason ends; contribution within 30 days meets the stated
safe harbor. The certification addresses the deadline only. It does not make
an otherwise ineligible distribution rollable, and the IRS may disagree on
audit. [2025 Publication 590-A](https://www.irs.gov/publications/p590a)
describes this as a separate method from the automatic institution-error
waiver.

The TY2025 source route records one listed reason, the date it stopped
preventing the rollover, a reviewed reason-evidence reference, signed and
delivered certification dates, the signed document reference, a no-prior-denial
review, deposit confirmation, and an eligibility review. It also requires the
issued Form 1099-R reference and account, reviewed non-inherited/non-RMD
status, the existing IRA-to-IRA history check, and qualified-plan acceptance
when the destination is a plan. The route rejects a timely rollover, an
overdue contribution outside the 30-day safe harbor, a certification delivered
after contribution, conflicting automatic-waiver facts, or missing evidence.

A $6,000 synthetic serious-illness case passes node checks and the complete
TY2025 v5.4 Form 1040 XML schema. Form 1040 line 4a prints $6,000, line 4b
prints zero, and line 4c(1) is marked. The linked native explanation and the
third page of the filled PDF both show the reason, dates, and reviewed record
references. All three PDF pages were rendered and inspected. The retained
PDF, XML, and page PNGs are under `.state/research/` as
`ty2025-ira-self-certification-review.*` and
`ty2025-ira-self-certification-page-*.png`; the PDF SHA-256 is
`eab168791b8fa609f2986e3ae8cbcc36b40402c742c48bb7dbbf731fcb1b54f1`.

The current source standard is structured reviewed references, not
authenticated issued bytes. The IRS has not granted or accepted a waiver for
this synthetic case. Reason-specific document authenticity, prior-return
history, other rollover eligibility exceptions, IRS business rules, and ATS
acceptance remain open.
