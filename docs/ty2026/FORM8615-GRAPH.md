# TY2026 Form 8615 child and parent tax contract

Source snapshot: pinned [2026 draft Form 8615](corpus/draft/f8615.pdf),
SHA-256 `11db7889385b13ea63d2f05cd0bbb4e92afe34523917a7b9f9fc4ddecd7996d7`,
and [2026 draft instructions](corpus/draft/i8615.pdf), SHA-256
`ac1ec51a5367dfa8187ea9fef43fb6cbf87b4ca1324bf3084c5557407a03160f`.
They are research sources until final release. Reconcile final 1040, Schedule D,
Schedule J, Form 2555, Form 8814 and current MeF rules before filing.

## Return ownership and source facts

Form 8615 attaches to the **child's** Form 1040 or 1040-NR. The 2026
instructions require all of: unearned income over $2,700, a required child
return, an age/student/support condition (under 18; age 18 without earned
income over half of support; or full-time student age 19–23 without earned
income over half of support), a living parent at year end, and no joint child
return. January 1 birthday treatment and qualified-disability-trust income
need explicit tests. Dependent status alone does not decide Form 8615.

Keep the child's birth date, full-time-student and earned-support facts,
filing requirement, return owner, earned and unearned income by source,
adjustments, itemized deductions directly connected to unearned income,
and capital-loss carryover. Source Form 1040 line 11b/9 and Schedule 1 lines
3/6/18 feed the regular or alternate line 1 worksheet; Form 2555,
self-employment net loss and NOL trigger the alternate worksheet. Treat
tax-exempt interest, taxable scholarship, pension/trust income, qualified
disability trust and gifted property by the instruction's earned/unearned
classification. Capital losses first offset capital gains and then eligible
other unearned income within the allowed current-year limit.

The parent record needs identity, parent selection reason, filing status,
taxable income, line 16 tax excluding AMT and specified other taxes, tax
method, qualified dividends, net capital gain, 28%/§1250 rate gain,
Schedule J and Form 2555 facts. For parents filing jointly, use the first
listed parent; for separate/unmarried/remarried cases, follow the custody,
residence and higher-taxable-income rules in the instructions. Link every
other child by parent return ID and its Form 8615 line 5, plus preferential
income character. This cross-return record must be supplied or verified; it
cannot be inferred from one child return.

## Printed calculation and downstream tax

| Lines | Implementation contract |
| --- | --- |
| 1–5 | Derive line 1 from the child's income worksheet; line 2 is $2,700 for the standard deduction, or the larger of $2,700 and $1,350 plus qualifying directly connected Schedule A deductions when itemizing. Stop after line 3 if nonpositive and after line 5 if zero, but **attach the form**. Line 4 normally takes child Form 1040 line 15; a child filing Form 2555 uses the foreign-earned-income worksheet amount. |
| 6–8 | Parent taxable income, other children's line 5 amounts, and this child's line 5 form family taxable income. Preserve each sibling's preferential-rate composition; totals alone are insufficient for the line 9 worksheets. |
| 9–13 | Compute line 9 with the applicable Tax Table, Tax Computation, qualified-dividend/capital-gain, Schedule D, Schedule J or foreign-income worksheet using the parent's filing status and the combined family amounts. Line 10 is the parent's corresponding income tax with specified Form 4972/8814, education recapture and AMT amounts excluded. Allocate line 11 among siblings by line 5 / total line 5, rounded to at least three decimal places; if no siblings, line 13 equals line 11. Record worksheet checkboxes for lines 9/10. |
| 14–18 | Tax the child's line 4 less line 5 at child rates, preserving the proper share of qualified dividends/capital gain and special-rate gain; compare that result plus line 13 to tax on all line 4 at child rates. Line 18 is the larger. It replaces the child's Form 1040 line 16 tax. With Form 2555, feed line 18 into the child's Foreign Earned Income Tax Worksheet before final 1040 line 16. Record worksheet checkboxes for lines 15/17. |

Form 8814 is a different **parent election** to report a qualifying child's
income on the parent return. The child-return Form 8615 path must not also
post that child's elected income or Form 8814 tax to the child return.

## Current code boundary

- The shared `f8615` input asks for `eligibility_confirmed` and parent/child
  aggregate figures. It does not derive eligibility, parent selection or
  line 1 from source facts. `income_tax_calculation` optionally checks an
  independently supplied unearned-income total, but the source itself can
  be entered without that cross-check.
- `calculateForm8615` covers ordinary-rate lines 1–18 and other-child
  allocation. It hardcodes the 2026-compatible $2,700/$1,350 amounts, uses
  bracket tax rather than the applicable Tax Table, and throws for parent
  qualified-dividend, Schedule D, Schedule J and Form 2555 paths and for
  child preferential/foreign-income paths. The high-value tax worksheet
  graph therefore remains incomplete.
- The TY2025 PDF descriptor maps numeric fields and parent filing status,
  but it omits the printed worksheet checkboxes on lines 9/10/15/17. The
  [2026 draft inventory](pdf-fields-f8615.csv) has **32 terminal widgets**,
  all in the field tree: 23 text and nine buttons. The TY2025 MeF serializer
  has numeric lines and parent fields, but no proven current 2026 XSD/rules.
  Neither the calculator nor form/PDF/MeF serializers are registered in the
  TY2026 product.

## Build order and acceptance

1. Confirm the final 2026 form/instructions and current 1040 tax worksheets.
   Pin current MeF schema/rules and resolve the parent/child return links.
2. Add eligibility and source-derived line 1 worksheets with explicit
   parent-selection and sibling records. Check the child's return filing
   requirement, dependent standard deduction and Form 8814 election boundary.
3. Extend the tax calculator with family-level qualified-dividend/capital-
   gain, Schedule D special-rate, Schedule J and Form 2555 branches, plus
   the correct Tax Table path. Compute Form 8615 before final child line 16
   and preserve the printed line and checkbox record for both outputs.
4. Fill/render all 32 draft widgets, then reconcile against the final PDF.
   Emit current MeF from the same record, including parent identity/status
   and stop-after-line-3/5 forms. Check the selected XSD and active rules.
5. Test each age/student/support boundary, parent selection after divorce or
   remarriage, sibling allocation, line 3/5 stop cases, capital-loss offset,
   qualified dividends, 28%/§1250 gain, Schedule J, parent/child Form 2555,
   Form 8814 election, and TY2025 regression.

This plan records the filing contract; it is not TY2026 filing support.
