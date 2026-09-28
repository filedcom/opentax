# TY2025 Form 8958 allocation boundary

Status: **conditional Form 1040-family attachment, both exports blocked**. The
[current Form 8958 and its instructions](https://www.irs.gov/pub/irs-pdf/f8958.pdf)
(November 2023 revision) require separately filing spouses or registered
domestic partners subject to community-property rules to identify each item in
columns A/B/C. The columns must reconcile, with wages, interest, dividends,
refunds, business income, gains, pensions, rents/pass-throughs, self-employment
items, withholding, and other deductions/credits separately identified.
[Publication 555](https://www.irs.gov/publications/p555) adds state-law,
separation, ownership, self-employment tax and withholding distinctions.

The old all-optional `state`/`allocation_items`/summary/withholding input was
replaced directly, without compatibility aliases. The public `f8958` node now
accepts a strict one-taxpayer/one-spouse MFS ledger for nine U.S.
community-property states. It requires both identities, a 2025 domicile period,
review references, and distinct per-item source/record/workpaper references.
Each row identifies its numbered Form 8958 line and allocation basis and must
use safe whole dollars with A = B + C. Equal-community rows allow only one
dollar of rounding difference, wholly separate rows allocate to one person,
exceptional rows require a separate federal workpaper, and married-spouse
self-employment tax/deduction cannot be presumed half-community. The checked-in
TY2025 v5.4 `IRS8958.xsd` permits at most 40 rows per line; the input enforces
that bound. Focused cases and the existing export-guard fixture were updated but
not run.

This is **not a filed allocation**. Source IDs and review strings do not
authenticate either spouse's documents or state-law conclusions. The node passes
the same strict ledger to W-2 before W-2 computes. For exactly one
taxpayer-owned ordinary W-2 with matching Box 1/2, W-2 now emits the taxpayer
share, not the full boxes, to both Form 1040 and AGI (and the taxpayer's share
of withholding to Form 1040). Ordinary W-2 returns without an allocation retain
their existing computation. The bounded path rejects other W-2s, spouse-owned
W-2s, tips, employer benefits/deferrals, retirement flags and positive state or
local withholding rather than partially allocating those tax effects. There is
no second-return reconciliation. Form 8958 line 12 can describe many unrelated
1040/schedule destinations, so a single aggregate cannot prove completeness.
RDP, HOH, special separation/disregard, foreign jurisdiction, partial-year
ownership, and complex state-law routes remain unsupported.

`nodes/inputs/f8958/staged_documents.ts` adds an **unregistered** comparison for
one full-year MFS community W-2 wage row and its matching withholding row. It
now runs the actual executor from the strict `general`, `w2` and `f8958` start
sources instead of accepting a caller-supplied final pending object. It requires
the executed W-2 employee, employer, Box 1 and Box 2 to match the ledger and
Form 1040 lines 1a/1z/9 to equal the taxpayer wage share, with lines 25a/25d
equal to the taxpayer withholding share. The executed W-2 allocation is the only
deposit of these two shares; a full gross deposit or second income or
withholding source fails the comparison. The staged function emits TY2025
`IRS8958` groups in XSD order and values for the first wage and first
withholding row on the official two-page PDF, including both allocation-column
SSNs. AcroForm field names and row positions were inspected read-only; no filled
PDF was rendered. Focused projection and rejection cases are written but unrun.
Executor ownership of the arithmetic does **not** verify W-2 bytes or the
ledger's source-document ID (W-2 has no matching document ID), prove state-law
characterization, or review the other spouse's complete return. No native or PDF
descriptor invokes it, and the both-export guard remains unchanged.

Opening a bounded route requires source-backed **both-person** item ingestion,
item classification under applicable state/federal law, one owner for each
taxpayer 1040/schedule destination, and reconciliation of every relevant income,
deduction, credit, tax and withholding line to the final return and the other
person's reviewed separate return. Only then can the TY2025 native `IRS8958`
groups and canonical two-page PDF, including any overflow statement, be mapped
to the same settled ledger and their guard narrowed. W-2 was changed for the
bounded pre-deposit allocation, but no shared Form 1040, registry, MeF or PDF
export code was changed. No tests, typecheck, XSD validation, filled-PDF render
or ATS run is claimed.
