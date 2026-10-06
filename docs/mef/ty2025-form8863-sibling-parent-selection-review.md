# TY2025 education claimant, sibling kiddie tax and selected parent sources

## Existing source gap and supported cases

The preceding paired child/education-parent proof supplied no other Form 8615
children and selected one divorced, unremarried custodial parent. This checkpoint
extends that same actual source route to two eligible siblings and to two
never-married parents living together all year. It preserves existing ordinary,
preferential and legacy Form 8615 routes and prior education source branches.

The [2025 Form 8615 instructions, pages 1–3](https://www.irs.gov/pub/irs-prior/i8615--2025.pdf)
select the greater-taxable-income parent's return for never-married parents
living together all year. That parent can differ from the parent claiming the
student's dependency and education credit. Line 7 aggregates other eligible
children's actual line 5 amounts under the selected parent. Line 12b divides
this child's line 5 by the combined child amount and permits rounding to at
least three decimal places. Line 10 uses the parent's income tax before credits;
family tax does not recalculate parent deductions or credits. Taxable
scholarships outside W-2 reporting are unearned for this form, and scholarships
are excluded from full-time student support.

## Public source packets and calculations

Taylor and Sam Example are distinct student owners, both born June 15, 2005,
full-time for five retained months, and actually claimed by Alex Example.
Taylor's independent issued W-2 sources report $2,000 ordinary wages and $8,000
performed teaching compensation; his actual nonservice room/board scholarship
is $12,000 on Schedule 1 line 8r. Sam's issued W-2 reports $2,000 ordinary wages;
his independently owned $8,000 performed teaching award and $14,000 nonservice
scholarship reach his own Schedule 1 line 8r. Each award has separate actual
receipts, terms, performed-service records or nonqualified costs. Each student
has $10,000 earned support against $32,500 ordinary support, excluding the
$12,000/$14,000 scholarship-funded costs. Age, enrollment, filing obligation
and support derive required Form 8615 eligibility from those owned records.

The two actual issued school statements have distinct student/document/school
identities: Box 1 $4,500 each; Box 5 $20,500 for Taylor and $22,500 for Sam.
Actual tuition payments and aid ledgers reconcile each statement. Each $500
free scholarship reduces qualified education expenses to $4,000; taxable
awards reach the child, with actual nonservice cost allocations, and do not
reduce this tuition allocation. Alex claims both AOCs; neither child claims an
education credit. Actual source returns produce:

| Filed amount | Taylor | Sam |
| --- | ---: | ---: |
| AGI | 22,000 | 24,000 |
| Dependent standard deduction | 15,750 | 15,750 |
| Taxable income / Form 8615 line 5 | 6,250 | 8,250 |
| Form 8615 unearned income | 12,000 | 22,000 |
| Line 7 actual sibling amount | 8,250 | 6,250 |
| Line 12b filed allocation ratio | .431 | .569 |
| Regular child tax | 628 | 828 |
| Custodial-parent Form 8615 / 1040 tax | 1,375 | 1,815 |
| Greater-income cohabiting-parent Form 8615 / 1040 tax | 1,419 | 1,873 |

In the custodial packet Alex's actual wages/AGI are $75,000, deduction $15,750,
taxable income $59,250 and line 16 $7,955. Adding actual sibling line 5 amounts
produces family taxable income $73,750, tax $11,145 and incremental child tax
$3,190. Three-decimal allocation produces the two stated child taxes.

In the cohabiting packet Alex remains the dependency/education claimant.
Pat Example's independent single-parent issued W-2 reports $110,000 actual
wages, deduction $15,750, taxable income $94,250 and line 16 $15,655. Retained
parentage, full-year residence and competing-claim records establish the
reviewed parent-selection facts. Two actual settled returns establish which
parent has greater taxable income. Pat claims neither student nor education
credit. Combined family taxable income $108,750 crosses the Tax Table boundary;
ordinary Tax Computation Worksheet tax is $18,947, incremental child tax $3,292.
Actual parent selection therefore changes both child taxes.

In both families Alex's public parent return has AGI $75,000, two refundable
AOCs totaling $2,000, Schedule 3 education credit $3,000, other-dependent credit
$1,000 after education ordering, final tax $3,955 and refund $9,045. Child income
never enters either parent's AGI/MAGI. Pat's final tax is $15,655 and refund
$2,345 from $18,000 actual withholding.

## Finite source joins and export checks

No parent tax, sibling line 5 or support-earned scalar is supplied by the public
fixture. Each child's independently executed income/deduction return establishes
line 5; public family calculation then derives allocation using those source
rows. Final preparation requires reciprocal actual settled sibling tax/source
projections, not the preliminary single-child tax. Projections omit the duplicate
execution start envelope and recursive family review but retain owned income,
school, payment, support, deduction, filed Form 8615 and filed 1040 rows.

Both family parents retain the complete actual child-return inventory and
independent parent projections. Parent native/PDF 1040 checks bind its declared
family review, own finalized source rows and filer identity. Child Form 8615
native/PDF checks recompute source-derived line 5, family tax, allocation and
actual sibling/child final tax. Parent Form 8863 export separately binds the
actual education claimant's settled return even when another parent supplies
the Form 8615 rate. Visual review exposed a PDF ratio defect: the shared amount filler rounded
`.431` to zero and left Form 8615 line 12b blank. The descriptor now validates
the actual numeric ratio before printing its fractional digits after the
IRS preprinted decimal point; actual packet text checks retain `431`/`569`.
Source-owned W-2 service awards must reconcile issued wage
identity, owner, payer, Box 1 and combined award allocations.

Tests reject omitted/duplicated siblings, changed income/deduction/line 5 or
allocation, reciprocal final-tax mismatches, wrong selected parent, detached
candidate wages/tax/identity, changed cohabitation/parentage facts, duplicate
parent dependency claims, child education leaks and missing declared parent
family review. Synchronized source-ID tampering updates every row within the
sibling projection and still rejects cross-child reuse of wage, grant,
1098-T and tuition payment identities. Standalone 1040/8615 descriptor fields
cannot override retained settled source tax.

## Evidence and limits

Evidence: `/tmp/opentax-f8863-sibling-parent-selection-evidence`. Seven actual
source JSON/full Return1040 XML/filled PDF packets cover the custodial claimant
parent and two children, then both cohabiting parents and both children.
All seven XML documents validate against the complete 2025v5.4 Return1040 XSD.
All 38 filled packet pages are rendered and visually reviewed; structure review
checks the repository's static filled packets contain no fields or widgets.
`artifacts.sha256`, `pdf-structure-review.json`, `all-page-review.txt` and numbered
page renders retain the snapshot evidence. Focused and selected regression log
paths/counts are recorded with the final commit report; this is not a full
repository regression claim.

This finite proof covers two ordinary-income single-parent tax sources, two
full-time dependent students with these issued/8r scholarship sources, one
unremarried custodial family, and one never-married family cohabiting all year
with unequal taxable incomes. Equal-parent-income selection, MFJ/MFS,
remarriage, other family structures, preferential/special-tax source parents,
other income types and broader dependency/support cases remain separate
existing boundaries. Retained records reconcile owned amounts and identities;
this does not authenticate issuer, court, bank, residence or award evidence
outside the supplied source packet. It does not discover omitted family members
outside the reviewed complete family inventory.

### Final verification

- `/tmp/opentax-sibling-focused-final-v2.log`: **10 passed / 0 failed**,
  including seven family positive/conflict tests and three Form 8615 PDF
  descriptor tests; this run writes the final seven artifact packets after
  the ratio repair.
- `/tmp/opentax-sibling-regression-final-v2.log`: **469 passed / 0 failed**,
  across the 27 files listed in `/tmp/opentax-sibling-regression-files.txt`.
  This selection includes prior education, sibling/parent sources, ordinary
  and preferential Form 8615, dependent deduction, Schedule C/SE and public
  owner SE, arithmetic, source-dependent and public routing tests. It is not
  a full repository regression.
- `/tmp/opentax-sibling-render-review.log` and
  `/tmp/opentax-sibling-artifact-check.log`: final seven packets, 38 pages,
  zero fields/widgets, 21 matching source/XML/PDF hashes and seven complete
  Return1040 XSD validations. All-page visual proof is retained in the evidence
  directory, including the corrected `.431`/`.569` ratio fields.
- Production source helpers and Form 8615 PDF descriptor pass `deno lint`;
  all 11 edited TypeScript files pass `deno fmt --check`; `git diff --check`
  passes. Fixture mutation types retain the existing test convention.

The preliminary 27-file run recorded 467 passes and one PDF text assertion
failure because Pat's first and last names occupy separate 1040 fields. The
assertion now normalizes whitespace; the final 469/0 run supersedes that run
and includes the additional PDF ratio check found during visual review.
