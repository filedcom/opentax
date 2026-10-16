# Current TY2026 government-payment sources

The `government_payments` source joins filer identity with reviewed 2026 Form
1099-G copies. It reuses the shared 2025 `f1099g` calculation for unemployment,
taxable refunds and federal withholding. The complete target remains
[FORM1099G-GRAPH.md](FORM1099G-GRAPH.md); public filing is not enabled.

## Source records and calculations

Copies preserve payer, recipient, account, correction history and actual box
values. An active correction must identify retired copies, which cannot remain
in the inventory. Recipients must match the filer or joint spouse. State rows
retain their own codes, payer IDs and withholding; their combined deduction
reaches Schedule A once per copy. Federal withholding combines with other
information returns before whole-dollar rounding on Form 1040 line 25b.

Unemployment receipts and repayments carry dates and benefit years. Each copy
reconciles gross or already-net box 1 reporting with those records. Same-year
repayments reduce Schedule 1 line 7 and print its repayment checkbox and amount,
including fully repaid benefits. Prior-year repayments require a separate
claim-of-right review and are rejected by this source contract.

A 2025 state-tax refund links to the actual prior return's owners, filing status,
standard-deduction facts, income/sales/property taxes, SALT MAGI, filed Schedule A
and taxable income. The calculation derives the 2025 SALT cap, the alternative
sales-tax limit and excess itemized deductions over the standard deduction.
Multiple copies for one prior return share one recovery limit. The taxable
amount is derived internally; public callers cannot provide a taxable-refund
amount. Standard-deduction and sales-tax elections produce no taxable recovery.

Taxable refunds reach Schedule 1 line 1 and AGI. Form 6251 replays their sources
and subtracts the same recovery on line 2b. Its printed field uses the template's
parentheses. Line 2b alone is outside the negative-lines-2c-through-3 filing test
in the current [Form 6251 instructions](https://www.irs.gov/instructions/i6251).

RTAA and reviewed taxable nonbusiness grants retain separate Schedule 1 line 8z
categories. New box 10 state family-leave benefits also reach line 8z as unearned
income, including the Social Security provisional-income and child-tax routes.
They do not become wages, self-employment income or unemployment. Category totals
round once before their printed line 8z sum; a continuation preserves each type.

## Authorities and verification

The pinned final December 2026 [1099-G instructions](https://www.irs.gov/instructions/i1099g)
introduce family-leave box 10 and renumber state information to boxes 11a/11b/12.
[Revenue Ruling 2025-4](https://www.irs.gov/pub/irs-drop/rr-25-04.pdf) supplies the
family-versus-medical-leave distinction. The current
[Publication 525](https://www.irs.gov/publications/p525) recovery and unemployment
instructions are the semantic comparator; final 2026 return instructions still
need reconciliation. Pinned source hashes remain in the complete graph plan.

Source tests cover gross/net unemployment, full repayment, distinct correction
and ownership records, refund SALT/sales/standard-deduction limits, multiple
refund copies, state/federal withholding, family-leave classification, Social
Security and child tax. Four static draft bundles cover ordinary unemployment,
family leave with RTAA/grants, a refund with AMT, and fully repaid benefits.
They reconcile calculated return amounts and printed lines and are reopened to
check that no AcroForm or annotations remain. All 21 pages were rendered and
visually reviewed on October 15, 2026. The 11 focused typed tests pass.

## Remaining full-parity work

Business grants/refunds, farm payments, CCC market gains, prior-year repayments,
after-tax unemployment contribution basis, excluded benefits and medical-leave
sick pay remain unsupported. Uncorrected disputed or identity-theft copies need
a dedicated source reconciliation. Refunds from older years, changed filing
units, other itemized recoveries, zero-taxable-income recomputation, prior
credits/AMT/NIIT and other special tax-benefit cases remain gated. Final return
forms/instructions, current MeF schemas/rules and ATS acceptance remain required.
