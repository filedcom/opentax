# Form 8958 source boundary (TY2025)

The active PDF is
[Form 8958, revised November 2023](https://www.irs.gov/pub/irs-pdf/f8958.pdf);
its instructions are on pages 3–4.
[Publication 555](https://www.irs.gov/publications/p555) describes
community/separate characterization, state-law differences, income, withholding
and self-employment exceptions. The checked-in TY2025 v5.4 `IRS8958.xsd`
requires the other person's first/last name and SSN and allows at most 40
allocation rows for each of form lines 1–12.

The old all-optional summary input was replaced directly, without an alias. This
input now requires a married-filing-separately taxpayer and spouse, distinct
SSNs, one of nine U.S. community-property states, a 2025 domicile period and
review references, and identified item-level rows. Each row has the form line, a
40-character description, source document and record references, state-law
workpaper reference, whole-dollar columns A/B/C, and an allocation basis. B plus
C must exactly equal A. Community-equal shares can differ by one dollar only for
rounding; wholly separate amounts must be assigned to the stated person. An
exceptional federal allocation needs a distinct workpaper reference. Married
spouses cannot mark self-employment tax or its deduction as community-equal
merely because business income is community. Row IDs are distinct and each
native line is capped at 40 rows.

This is an arithmetic/source-_claim_ preflight, not an authenticated document
ingestion path. The references do not prove state domicile, legal
characterization, or completeness across both spouses. `compute()` passes the
same ledger to W-2 via a declared graph edge. For a single taxpayer-owned W-2
whose Box 1/2 match the two ledger rows, W-2 deposits only the taxpayer shares
into AGI and Form 1040; a missing or mismatched W-2 fails. Ordinary W-2 inputs
remain unchanged. Both MeF/PDF exports still reject a populated `f8958`. No RDP,
head-of-household, separation exception, foreign community-property
jurisdiction, or state-law-specific split is activated.

Before filing, the graph must derive or reconcile every taxpayer share to its
actual 1040/schedules: wages to line 1a, interest/dividends to lines 2/3, gains
to Schedule D, rent/pass-through amounts to Schedule E, self-employment items to
Schedules C/SE/1/2, withholding to 1040 line 25, and the heterogeneous line-12
deductions/credits to their own named destinations. It must include both
spouses' source documents, not just the taxpayer's W-2/1099 inputs, and avoid
depositing the taxpayer's original full amount and the allocated share twice
outside the bounded W-2 branch. It must also reconcile the spouse's column
against their reviewed separate return, apply special
status/state/SE/withholding rules, construct the native XSD groups, map both
canonical PDF pages and any overflow statement, and prove the three outputs
agree. Until then, an exact A=B+C row is not a valid 1040 allocation.

Focused tests for schema and arithmetic are written but unrun. No typecheck, XSD
validation, filled-PDF render or ATS result is claimed.
