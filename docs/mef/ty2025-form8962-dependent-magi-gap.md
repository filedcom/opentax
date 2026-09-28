# TY2025 Form 8962 dependent modified AGI: bounded filing path

The
[2025 Form 8962 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf)
put the combined modified AGI of dependents who **must** file because income
meets the filing threshold on line 2b. Worksheet 1-2 adds each such dependent's
Form 1040/1040-SR/1040-NR AGI, tax-exempt interest, Form 2555 exclusions and
housing deduction, and (for 1040/1040-SR) nontaxable Social Security. A return
filed only for a withholding/estimated-tax refund does not make the dependent's
income count. Form 8814 has its separate child-income rule.

The existing `general.dependents[].ptc_tax_return` source distinguishes
`required`, `not_required`, and `form8814`. The `required` branch now directly
requires a referenced filed 2025 single Form 1040 and referenced Forms 1099-INT
with box 1 taxable and box 8 tax-exempt interest, replacing its bare AGI
assertion. The filed return explicitly reports zero wages, other taxable income,
and adjustments; its line 2b and line 11b must equal the sourced box 1 total.
The general node remains the single Worksheet 1-2 calculator. The
required-filing decision is established for this interest-only route by the
[2025 Pub. 501 Table 2 single-dependent rule](https://www.irs.gov/publications/p501):
taxable unearned income must exceed $1,350, plus $2,000 if age 65 or older and
plus $2,000 if blind. Age is derived from the dependent's birth date and
blindness from the filed return; equality does not establish required filing.
Box 8 interest is added to dependent MAGI but not used to prove the filing
threshold.

The TY2025 MeF annual-policy route re-reads and validates that general source
for **one claimed dependent** on a single-filer, unchanged full-year Form 1095-A
policy. It reconciles line 2b, line 3 household income, the applicable
two-person federal poverty line, the above-400%-FPL 8.5% contribution, policy
totals, and the final Schedule 2/3 and Form 1040 amount. The PDF projection
checks the same dependent source and line 3 arithmetic before printing line 2b.
Focused positive and disagreement/refund-only cases are written but unrun.

A bounded monthly route now applies the same required-filing dependent source to
one identified, nonshared same-state policy with twelve monthly Form 1095-A
columns. Each month's premium, SLCSP, APTC, contribution, allowed credit, and
final policy totals are checked against the relevant two-person poverty line,
verified household income, and finalized Schedule 2/3 and Form 1040. The PDF
path invokes this same MeF reconciliation before producing a monthly dependent
form. A policy switch, overlap, SLCSP correction, or allocation remains blocked.
The focused positive and tampering cases are written but unrun.

For Alaska and Hawaii, the annual or monthly route also requires a single
reported 2025 residence state matching the filer and policy state. Its line 4
table uses $25,540 for Alaska or $23,500 for Hawaii for a two-person household.
The above-400%-FPL requirement still applies; no dependent case in those states
has been run yet. Interstate moves remain unsupported.

This one-policy route is deliberately bounded. Separate identified-policy routes
now handle two sourced dependents on three same-state policies and one dependent
on two policies; those routes have their own identity and monthly reconciliation
checks. Form 8814 children, dependent Form 2555 or Social Security facts,
unsupported policy configurations, and below-400%-FPL multi-person household
income still stop. Source references identify records, not authenticate their
contents. Other required-filing bases (wages, self-employment, mixed income,
marital filing rules, and Pub. 501 Table 3 triggers) and other dependent
income/deductions remain outside this route. The `not_required` classification
lacks that review and now fails closed in the bounded annual projection, even
when line 2b would be zero. Wider dependent cases need expanded source and
policy/month reconciliation. Focused source and rejection cases are written but
unrun. No tests, typecheck, XSD validation, or PDF render were run in this build
pass.

## One-policy covered-person boundary (2026-09-29 build pass, unrun)

For the existing annual and monthly single-policy returns with a sourced
dependent, the Form 1095-A Part II covered-person SSNs now must be present,
distinct, and drawn only from the filer and claimed dependents on the return.
The policy may cover just the filer or just a dependent; a tax-family member
need not have Marketplace coverage. An absent list, duplicate SSN, or person
outside the tax family stops positive MeF and PDF projection. A policy that also
covers someone in another tax family requires the separate Part IV shared-policy
allocation route rather than unallocated A/B/C amounts. This follows the
[TY2025 Form 8962 coverage-family and line 9 instructions](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf).
The numeric one-dependent annual and monthly cases exercise a policy covering
only the filer, and an annual case also covers only the dependent. Focused
missing, duplicate, and other-family SSN rejection cases were added but are
unrun. This check establishes only consistency with captured Part II facts, not
Marketplace authenticity, monthly MEC eligibility, or IRS acceptance.
