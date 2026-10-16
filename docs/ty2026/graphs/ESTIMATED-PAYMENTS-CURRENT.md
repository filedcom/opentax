# Current TY2026 estimated payments

The internal `estimated_payments.claim` route derives Form 1040 line 26 from
reviewed posted payments, signed joint-payment allocations and posted 2025
overpayment credits. It reuses the 2025 record summation and signed-agreement
reconciliation in `nodes/inputs/payments/estimated/f1040es/calculation.ts`.
The 2025 entry point, schema and prior-credit guard retain their behavior.

## Authority and retained sources

The final [2026 Form 1040-ES and instructions](https://www.irs.gov/pub/irs-pdf/f1040es.pdf)
are [pinned locally](../corpus/authorities/f1040es--2026.pdf), SHA-256
`396ffad25baa737b33a67d27624f7444be3ac4e7245d287aebe5f89864f90b54`.
Page 4 describes joint-payment eligibility; page 5 gives payment dates and
permits more than four payments; page 13 separates actual payments, prior-year
credits and totals. Processing fees are excluded from credited payments.
The ordinary calendar-year dates are April 15, June 15 and September 15, 2026,
and January 15, 2027. Late posted payments remain creditable records; this
implementation does not calculate their underpayment penalty consequences.

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi),
line 26 and line 36, are a prior-year comparator for agreed joint allocations,
former-spouse identification and credits applied to 2026. They are not final
2026 general instructions. The pinned 2026 Form 1040 supplies the current
line 26 amount/former-spouse boxes and MFS name placement. The 2026 1040-ES
source is used for payment records, not as the annual income-tax configuration.

## Source contract and graph

Each claim has a 2026 year, review date, record reference and verified absence
of a name change since payment. Ordinary receipts identify the quarter, actual
payment date, owner, amount, confirmation, IRS account record and posted
transaction. Multiple receipts in one quarter are supported, with cents summed
before the final whole-dollar rounding. A joint return can combine the two
filers' individual payments.

Signed joint allocations retain both identities, payment/share rows, eligibility
facts, signature-review reference, original PDF bytes and SHA-256. The shared
check verifies the retained bytes and share arithmetic; it does not authenticate
signatures. Divorced allocations require a reviewed 2026 divorce and no
remarriage; MFS allocations match both current spouses. This initial shared
scope allows one joint payment per quarter, with whole-dollar shares. Separate
individual receipts may accompany the joint allocation without duplication.

Prior-year credits require accepted 2025 Form 1040 observations and matching
posted 2026 IRS-account observations. The elected line 36 amount must equal
the posted credit; prior overpayment less the reported penalty must reconcile
to refund plus credit. Owner, originating return, acceptance and transaction
references are checked. Duplicate returns or owners cannot create another
credit by changing record names. Two prior individual returns can contribute
to a current joint return; a prior joint credit requires the same joint filers.
These are reviewed source facts, not a live IRS account or acceptance lookup.

```text
general identity + extension receipt inventory
                         |
estimated receipts + agreed shares + posted prior credits
                         |
               shared reconciliation
                         |
    Form 1040 line 26 --> settlement --> refund allocation
                         |
          replay retained sources --> draft PDF
```

Repeated confirmations/transactions and overlap with extension confirmations
are rejected. Payments must fall between January 1, 2026 and the claim's review
date. Calculation retains the original source input and unrounded source total.
Only the final total is rounded for line 26; this payment source does not change
AGI, tax, deductions or loss carryforwards.

The PDF builder takes retained payment input as its third argument after the
refund claim and rejects unexplained or altered line 26 amounts and identities.
Divorced allocations print the former spouse's SSN beside line 26. MFS prints
the current spouse's SSN in the header and name in the separate-filing name
box, leaving the joint-return spouse name and occupation fields blank.
No Form 1040-ES voucher or private agreement is appended to the return.

## Verification and remaining scope

The synthetic ordinary example sums $1,000.49 and $500.49 in receipts plus a
$300 prior credit: $1,800.98 becomes line 26 of $1,801. Fees are retained but
excluded. With $10,268 withholding and $3,883 tax, payments are $12,069 and
the $8,186 refund splits into $7,186 checking and $1,000 savings. Separate
divorced and MFS examples allocate $300 of a $500 joint payment, yielding
$6,685 refunds with the appropriate spouse identity placement.

All 32 focused typed tests pass, including the existing 2025 payment tests.
The complete 2026 suite passes 770 tests and the unit suite passes 137.
Three synthetic packets (nine pages) were rendered and visually checked;
reopened outputs have no AcroForm fields or page annotations. Original agreement
bytes remain retained in source records.

Unsupported cases include proportional allocations without agreement,
remarriage, name-change statements, prior joint-to-separate credit allocation,
amended/adjusted returns, reversed/transferred credits and prior Form 1040-SR.
Form 2210 penalties and automatic Form 1062 installment-payment allocation
remain separate work. These examples do not establish complete ATS scenario 2,
current MeF acceptance or public filing readiness.
