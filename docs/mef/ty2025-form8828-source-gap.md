# Form 8828 source reconciliation stage (TY2025)

The unregistered Form 8828 MeF and PDF descriptors now require one direct item
shape with reviewed issuer notification and sale/basis records. Stable
`source_transaction_id` values identify each property disposition. The staged
reconciler compares the reviewed issuer's loan, subsidy, adjusted qualifying
income and holding percentage with Form 8828; compares sale date, address,
price, expenses, basis and recognized gain with the reviewed sale; confirms the
owner and borrower are return filers; and ties AGI, tax-exempt interest and
recapture tax to Form 1040 and Schedule 2.

For taxable home gain, exactly one Form 8949 row must carry the same transaction
ID, net proceeds, basis, disposition date and taxable gain. A partial exclusion
requires code H. A fully excluded gain requires a reviewed exclusion record
reference and does not invent a Form 8949 row.

These reference fields are provenance identifiers, **not validated document
bytes**. The current return graph cannot independently verify the issuer
notification or closing/basis/exclusion documents. It also lacks a modeled
source path for special transfers, casualty replacement, co-owner share
statements, qualified subordinate mortgage loans, reissued MCCs, and amended
returns. A Form 8949 row is required by this staged path for taxable home gain;
the exact gain handoff for other reporting routes remains unsupported. Public
MeF and PDF export must keep the Form 8828 guard closed until those filing rules
and attachment validation are resolved.
