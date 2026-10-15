# Current TY2026 Social Security and railroad-equivalent benefits

Implemented October 15, 2026 in the isolated 2026 source registry. The public
`ssa1099` claim contains current SSA-1099 and RRB-1099 statements; `general`
supplies return owners and filing status. This is draft preparation, not a
registered filing product.

## Sources and reuse

- [IRC 86](https://uscode.house.gov/us/usc/119-118/t26/s86/) supplies the
  benefit inclusion formula and modified-income exclusions.
- [IRS Publication 915](https://www.irs.gov/publications/p915), currently the
  **2025** edition, supplies Worksheet 1, statement box meanings, repayment
  and prior-year election treatment. Final 2026 instructions must still be
  reconciled before release.
- The pinned [2026 draft Form 1040](../corpus/draft/f1040.pdf) supplies lines
  6a/6b, the line 6d lived-apart checkbox and line 25b withholding.

The existing 2025 statement validator is reused for boxes 3/4/5, repeated
issued-copy references and form-specific withholding. The shared AGI income
classification and ordinary benefit formula are reused; an optional MFS
provisional-income branch supports 2026 without changing existing 2025 calls.
The 2026 wrapper orders the SSA calculation before the existing student-loan
phaseout, using annual student-loan configuration.

## Source contract

| Statement | Net benefits | Federal withholding | Retained informational amounts |
| --- | --- | --- | --- |
| SSA-1099 | Signed box 5 reconciles to box 3 minus box 4 | Box 6 | Workers' compensation already in box 3; Medicare premiums |
| RRB-1099 | Signed SSEB box 5 reconciles to box 3 minus box 4 | **Box 10** | Box 6 is workers' compensation, not withholding; Medicare premiums |

`inputs/social-security-source.ts` validates tax year, recipient, claim number,
current-copy evidence, corrected-copy replacement references, monetary precision
and complete statement inventory. Masked TINs require matching last four digits
and a retained identity review. Spouse benefits require a joint return; child
and other recipients cannot enter through the parent's claim. Duplicate claims
and included superseded originals fail. Full statement facts remain available
in `calculation_2026.source_input`.

The source adds signed box 5 amounts across both owners before deciding whether
repayment review is required. It retains cents until each printed line's
combined total is rounded. Premiums and workers' compensation are not subtracted
from the reported net benefit, and offsets are not added again. Premiums are
retained as evidence; there is no automatic medical deduction.

RRB-1099-R pension payments are a different source with different boxes; the
shared mixed `rrb1099r` node is not registered here. See
[RRB-1099-GRAPH.md](./RRB-1099-GRAPH.md).

## Calculation and printing

`nodes/agi.ts` retains the worksheet operands and taxable result. Signed income
and losses remain signed. Tax-exempt interest enters the calculation, the
supported foreign earned income exclusion is restored, and student-loan
interest is excluded from worksheet deductions. The finalized taxable benefit
then enters shared student-loan MAGI, total income, AGI and downstream tax.

MFS requires the full-year spouse-residence answer. If the couple lived
together, the calculation limits inclusion using both positive provisional
income and net benefits. A filer living apart uses the ordinary single base
and receives the draft line 6d checkbox. Zero taxable benefits print **0** on
line 6b. The PDF bundle reconciles benefit withholding with investment and
misclassified-wage withholding before producing Form 1040 line 25b.

Tests cover both forms, joint signed offsets, cent rounding, corrected copies,
wrong owners, worksheet bands, signed losses, exempt interest, foreign exclusion,
MFS residence and coordinated student-loan MAGI. Two PDF scenarios verify the
benefit amounts, withholding, Schedule 1 deduction, zero line 6b and checkbox.
A six-page synthetic review artifact was rendered and visually inspected.

## Prior-year lump-sum election

The [current election route](./SSA-LUMP-SUM-CURRENT.md) now accepts year
allocations and historical return/worksheet records, compares the ordinary and
election methods, and prints the selected result and line 6c. The source requires
an explicit method review when a statement contains prior-year payments.

## Remaining work and explicit boundaries

The current source requires reviewed absence of disability repayments to an employer/insurer, savings-bond/adoption exclusions,
foreign housing deduction, territory exclusions and IRA contributions requiring
coordinated benefit worksheets. Their source owners and worksheet integrations
remain unfinished. Negative combined benefits stop for repayment deduction or
credit review. Positive IRA deductions without internally finalized taxable
benefits stop for Publication 590-A coordination; public inputs cannot assert
a taxable-benefit amount.

Implement net-repayment relief and coordinated IRA worksheets before broadening
these boundaries. Final 2026 instructions,
current MeF serialization/business rules, public catalog/CLI and ATS acceptance
remain release gates. The coverage ledger remains `audit-required`.
