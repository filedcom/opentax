# Current TY2026 refund allocation

Implemented October 16, 2026. This is an internal calculation and static draft
PDF route, not a public filing product or an IRS-approved ATS result.

## Sources and shared behavior

The current IRS November 2026 [Form 8888 draft](https://www.irs.gov/pub/irs-dft/f8888--dft.pdf)
and [instructions](https://www.irs.gov/pub/irs-dft/i8888--dft.pdf) were downloaded
and rehashed on October 16. They match the pinned corpus: respectively
`035ddccf75b0cef5cc065bca6beded3babd4395fd3df5f3dcc8b90e08f81e437`
and `2dba8a99cd4d9498dd2d1d7d28050033ace5e338c05b6ce79dd17ab383bac735`.
The form has a cover plus one form page, attachment sequence 56, twenty widgets,
three account rows and reserved line 4. Instructions specify two or three
accounts for Form 8888, at least $1 per deposit, a total equal to the return's
refund and single-account requests on Form 1040. Savings bonds are discontinued.

The existing 2025 source schema, routing-number checksum, account-ownership
checks and refund reconciliation are shared. Their implementation now lives
beside the shared Form 8888 input; the 2025 domain retains a compatibility export.
The 2025 PDF and XML callers still use the same contract and 2025 templates.
The 2026 renderer uses its separately pinned form and current 1040 widgets.

## Source contract and ordering

`refund_allocation.claim` supplies `tax_year: 2026`, a source reference, an
explicit deposit request and one to three ordered account records. Each record
retains its own reference, owner name, routing/account numbers, checking/savings
selection and confirmation that a U.S. institution will accept the deposit.
Its `allocation` is a positive whole-dollar amount or `"remainder"`; at most one
account may receive the remainder. Account order is retained because IRS refund
adjustments can treat the last account differently. The request neither proves
that a deposit occurred nor makes an IRA/HSA contribution deductible.

```text
income / deductions / credits / payments
                   |
       Form 1040 settlement, including line 36
                   |
            line 35a final refund + filer identity
                   |
    refund account source records and allocation choices
                   |
      shared account and refund reconciliation
                   |
    one account: 1040 lines 35b-35d
    two/three: 1040 indicator + Form 8888 sequence 56
```

`refund_allocation` runs after Form 1040 and retains `calculation_2026`, including
the resolved accounts and `form1040_fields`. It emits no tax/payment amount and
does not feed back into Form 1040. A change to the account allocation cannot
change AGI, tax, credits, payment totals or carryforwards. The PDF builder
reconciles the retained request again against the final return before printing.

Checks reject insufficient refunds, zero/fractional deposits, duplicate account
identities or source references, invalid routing/account data, wrong owners,
unallocated or excess amounts and calculated public overrides. A joint-return
spouse may own an account; a separate-return spouse may not. The current source
catalog rejects Form 8379, so this route cannot imply injured-spouse support;
the shared split-deposit reconciler also rejects an attached Form 8379.

The previously accepted general bank fields no longer silently disappear from
2026 draft PDFs. They require a reviewed allocation claim and must match its
single account completely. Any such fields conflict with a split request.
Unrequested deposit metadata or a Form 8888 indicator cannot be injected into
the Form 1040 PDF without matching retained sources.

## Independent examples and remaining gates

The [ATS scenario 5 contract](../ats/ATS-SCENARIO-05.md) supplies wages $50,510,
withholding $10,268, and a $1,000 savings allocation. With its no-other-income
assumption, the $16,100 standard deduction produces taxable income $34,410.
The pinned 2026 Tax Table's $34,400–$34,450 single row gives tax $3,883; therefore
the refund is $6,385, with $5,385 checking and $1,000 savings. A separate
synthetic $300 line 36 election leaves $6,085 to allocate. Adding a $500 third
account leaves $4,585 for checking. These are independently derived expectations,
not monetary totals printed in the ATS packet.

The executable fixture uses the packet's wage/account facts and explicitly
reviewed citizenship and bank-acceptance assumptions, plus a synthetic address.
It resolves the packet's blank 1040 Form 8888 indicator from the actual split.
It is not a complete ATS fixture or acceptance claim. The packet's embedded
December revision still differs from the public November draft. Final forms,
current authorized MeF schemas/rules, public return preparation/export and
actual IRS ATS acknowledgment remain outstanding.

## Verification

Thirty-one typed focused checks pass, including nine 2026 calculation/PDF
checks and twenty-two existing shared/2025 node, PDF and native XML checks.
All 759 tests in the 2026 directory and the 137 unit checks also pass.
Three complete draft examples (one, two and
three accounts) were rendered and all eight pages visually inspected, including
the 1040 split indicator, blank single-account fields on split returns, account
types, leading-zero routing numbers and a seventeen-character account number.
Generated PDFs contain neither annotations nor an AcroForm tree.

The composition check combines QBI, an evidenced Form 1062 election and refund
allocation, verifies sequence 55 before 56 before 106, and retains the required
original covenant attachment. Review corrected the new attachment's insertion
order. An initial composition fixture had no refund and correctly rejected the
request; its corrected W-2 withholding now produces the independently checked
$6,655 refund. Initial checks also rejected an eighteen-character test account;
the boundary fixture now uses the valid seventeen-character maximum.
