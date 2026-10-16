# TY2025 standalone foreign-employer compensation source

The standalone `fec` graph input can now produce native `FECRecord` documents
and one linked `WagesNotShownSchedule` when each positive employer source has
the worker's owner SSN, an identified payroll source, the employee's address
where the services were performed, the employer's foreign address, and
affirmative facts that the employer has no U.S. EIN and did not issue a W-2.
The native route accepts up to 10 distinct employer records with positive
whole-dollar USD compensation. Their sum must exactly equal both finalized
Form 1040 line 1h and the AGI aggregator's line 1h input. A mixed standalone
`fec` and physical-presence Form 2555 filing rejects until the two wage
sources can be reconciled without double counting. The existing standalone
Form 2555 physical-presence path remains available on its own.

[IRS Publication 4164, section 12.1](https://www.irs.gov/pub/irs-pdf/p4164.pdf)
requires a FEC record when the FEC wages literal appears, limits Form 1040
returns to 10 FEC records, and calls for the employee's residence when the
services were performed. The local TY2025 v5.4 schema requires the foreign
employer address and allows one FEC row within the wages schedule for the
aggregated amount. This source route uses entered address and payroll facts;
it does not infer them from the current return address or employer country.

The reviewed payroll reference is a user-entered identifier, not authenticated
employer bytes. Conversion of foreign currency to USD, employer identity,
source-document authenticity, overlap with a W-2 or Form 2555, IRS business
rules, ATS acceptance, XSD validation, and filled-PDF appearance remain open.
Positive and altered-source fixtures are authored for the deferred bulk gate.
