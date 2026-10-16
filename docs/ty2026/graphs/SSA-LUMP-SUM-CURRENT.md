# Current TY2026 Social Security lump-sum election

Implemented October 15, 2026. The `ssa1099` source now supports payments
attributable to 1984–2025 and an explicit choice to use the regular method or
the election when it lowers taxable benefits. This extends the
[ordinary benefit route](./SSA-BENEFITS-GRAPH.md); no public filing product is
registered.

## Authority

- [Publication 915](https://www.irs.gov/publications/p915), currently the 2025
  edition, provides Worksheets 2/3/4 and the Terry Jackson comparison example.
- [IRC 86(e)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapB-partII-sec86.htm)
  limits inclusion by the increases attributable to earlier years. The statutory
  baseline also identifies the modified-income exclusions and pre-1994 formula.
- [IRS back-payment guidance](https://www.irs.gov/faqs/social-security-income/back-payments/back-payments)
  describes reporting the result in the receipt year and the line 6c election.
- [IRS MAGI guidance](https://www.irs.gov/credits-deductions/modified-adjusted-gross-income)
  confirms that PTC adds nontaxable Social Security back to AGI.
- The pinned 2026 draft Form 1040 identifies line 6c as `c1_43[0]` and line 6d
  as `c1_44[0]`. Final 2026 instructions remain a release gate.

## Retained source records

Each statement retains its year allocations, amounts already included in box 3,
allocation references and prior-return IDs. The allocation total cannot exceed
box 3, and a statement cannot repeat a benefit year. RRB amounts additionally
reconcile to boxes 7, 8 and 9: 2025, 2024, and years before 2024. Pre-1984 benefits
are excluded from this source contract because they do not belong in these
reported taxable-benefit boxes.

An election comparison requires each referenced prior return's filing status,
filer TINs, MFS residence answer, AGI, net benefits, original taxable benefits,
tax-exempt interest and itemized exclusion/adjustment amounts. Return, benefit,
adjustment and history review references remain in the source workpaper.
Earlier lump-sum receipts retain their receipt years and source references;
previously reported/refigured taxable benefits remain a historical worksheet
fact, distinct from original taxable benefits on the earlier return. Monetary
and historical-year checks reject inconsistent or impossible records.

Allocation ownership must match the earlier return. Both current spouses'
payments assigned to one earlier joint return are combined before its worksheet
is calculated. Different earlier returns remain separate, including two single
returns for the same year. Duplicate return IDs, repeated filer/year ownership,
unused prior returns and missing payment-year matches fail.

## Calculation flow

`inputs/social-security-election.ts` calculates the historical worksheets using
the shared ordinary benefit formula and a separate pre-1994 50% calculation.
It restores reviewed historical adjustments, including the 2020 unemployment
exclusion. Original taxable benefits are removed from original AGI; previously
reported/refigured benefits are subtracted only after computing the new taxable
amount. Signed income is retained and a nonpositive increase contributes zero.

The source sends calculated historical totals and unrounded receipt-year
amounts to `nodes/agi.ts`. That node computes the regular result and the current
portion excluding prior-year payments, with cent aggregation before rounding.
It selects the election only when the source review requests comparison and
the alternative is strictly lower. A tie, a higher alternative or an explicit
regular-method choice retains ordinary taxation.

Form 1040 line 6a still includes all net benefits received. Line 6b receives the
selected taxable amount, and line 6c reflects the actual election. The selected
amount enters AGI, student-loan MAGI, deductions and settlement. The pending PTC
receiver still receives AGI plus the nontaxable benefit portion; an election does
not remove the underlying receipt from PTC household income. PTC calculation
itself remains unfinished in the 2026 registry.

Historical worksheets stay in calculation records. They are not appended to
the filed-form draft and do not modify prior returns. The existing draft bundle
prints the election indicator, including an elected zero amount and simultaneous
MFS lived-apart indicator.

## Verification and remaining work

Twelve calculation/source tests cover the IRS example ($3,000 regular versus
$2,500 elected), higher/equal/declined alternatives, earlier lump-sum history,
pre-1994/MFS rules, joint/separate prior returns, RRB multi-year allocations,
cent rounding, current repayments exhausting the current benefit portion,
invalid history and student-loan/PTC MAGI destinations. Two PDF tests verify
selected and unselected line 6c, zero line 6b and both MFS indicators. Four
synthetic pages were rendered, reopened and visually inspected.

Current-year IRA coordination, negative combined-benefit repayment relief,
disability repayments to employers/insurers, and other excluded-income source
owners remain unfinished. Final 2026 instruction reconciliation, current MeF
serialization/business rules, public catalog/CLI and ATS acceptance remain
required. No election is filed or prior return amended by this development API.
