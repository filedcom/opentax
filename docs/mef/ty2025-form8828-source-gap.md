# Form 8828 source reconciliation stage (TY2025)

The unregistered Form 8828 MeF and PDF descriptors now require one direct item
shape with reviewed issuer notification and disposition/basis records. Stable
`source_transaction_id` values identify each property disposition. The staged
reconciler compares the reviewed issuer's loan, subsidy, adjusted qualifying
income and holding percentage with Form 8828; compares disposition date,
address, value, expenses, basis and recognized gain with the reviewed
disposition; confirms the owner and borrower are return filers; and ties AGI,
tax-exempt interest and recapture tax to Form 1040 and Schedule 2.

The bounded gift branch follows the
[IRS Form 8828 instructions](https://www.irs.gov/pub/irs-pdf/i8828.pdf): a gift
outside the spouse/ex-spouse divorce exception is treated as a sale at fair
market value, with deed date on line 6 and fair market value of the taxpayer's
interest on line 9. It requires deed, valuation and loan payoff references,
confirms no consideration and transfer of the taxpayer's entire interest, and
permits no sale expense or recognized sale gain. Gift recapture still flows to
Schedule 2; no Form 8949 sale is invented.

For taxable home gain, exactly one Form 8949 row must carry the same transaction
ID, net proceeds, basis, disposition date and taxable gain. A partial exclusion
requires code H. A fully excluded gain requires a reviewed exclusion record
reference and does not invent a Form 8949 row.

These reference fields are provenance identifiers, **not validated document
bytes**. The current return graph cannot independently verify the issuer
notification or closing/basis/exclusion/gift documents. It also lacks a modeled
source path for transfers with consideration, spouse/ex-spouse divorce
transfers, casualty replacement, co-owner share statements, qualified
subordinate mortgage loans, reissued MCCs, and amended returns. A Form 8949 row
is required by this staged path for taxable home gain; the exact gain handoff
for other reporting routes remains unsupported. Public MeF and PDF export must
keep the Form 8828 guard closed until those filing rules and attachment
validation are resolved.
