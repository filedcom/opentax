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

The [same instructions](https://www.irs.gov/pub/irs-pdf/i8828.pdf) require
jointly liable co-owners to figure recapture separately on their interests. The
staged joint-owner sale branch requires deed and joint-loan references, a
documented ownership fraction below 100%, and whole-property proceeds, expenses,
basis and subsidized-loan amounts. It derives the taxpayer's share for Form 8828
lines 9, 10, 12 and 19, then calculates only that owner's tax. This bounded
branch requires exact whole-dollar allocation and a Form 8949 row for that
owner's taxable gain.

The bounded first-reissue MCC sale path follows the
[IRS reissuance and line 8 instructions](https://www.irs.gov/pub/irs-pdf/i8828.pdf).
A replacement certificate must take effect at refinancing, apply to the same
property, replace the original certificate entirely, specify no more than the
old outstanding debt, keep the certificate credit rate no higher, and be
issuer-certified not to increase allowable annual credit. The original
subsidized loan closing date remains line 5 and starts the nine-year recapture
period. The qualifying reissue is treated as an extension, so line 8 uses final
payoff of the replacement loan, not the refinancing date. The staged source
requires original and reissued certificate, refinance settlement, issuer
compliance, and final payoff references.

For taxable home gain, exactly one Form 8949 row must carry the same transaction
ID, net proceeds, basis, disposition date and taxable gain. A partial exclusion
requires code H. A fully excluded gain requires a reviewed exclusion record
reference and does not invent a Form 8949 row.

These reference fields are provenance identifiers, **not validated document
bytes**. The current return graph cannot independently verify the issuer
notification or closing/basis/exclusion/gift/ownership documents. It also lacks
a modeled source path for transfers with consideration, spouse/ex-spouse divorce
transfers, casualty replacement, non-joint-liability co-ownership, qualified
subordinate mortgage loans, MCCs transferred to a new borrower or repeatedly
reissued, and amended returns. The issuer's no-annual-credit-increase
certification is referenced but its document bytes and Form 8396 credit history
are not independently reconciled. A Form 8949 row is required by this staged
path for taxable home gain; the exact gain handoff for other reporting routes
remains unsupported. Public MeF and PDF export must keep the Form 8828 guard
closed until those filing rules and attachment validation are resolved.

Foreclosure remains closed:
[Form 8828 line 9](https://www.irs.gov/pub/irs-pdf/i8828.pdf) directs fair
market value for a non-sale disposition, while
[IRS Topic 432](https://www.irs.gov/taxtopics/tc432) can use the full
nonrecourse debt as income-tax amount realized. That difference needs a separate
Form 8949/debt-source reconciliation. A casualty replacement generally avoids
recapture; failure to replace can require an amended return for the destruction
year, which the current original-return path does not model.
