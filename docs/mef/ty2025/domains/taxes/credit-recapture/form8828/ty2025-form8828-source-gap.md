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

The staged early conventional QMB refinancing path now requires a separate
reviewed settlement and original-loan payoff record when the subsidized loan was
fully repaid before sale within its first four years. The record binds the
original issuer notification, borrower, property and refinance date to line 8.
The existing IRS holding-period worksheet then uses the old loan's payoff date
and the later disposition date, rather than treating the conventional
replacement loan as an MCC extension. Native and PDF projections replay that
source and the final Schedule 2 tax; changed payoff, borrower, property, issuer
or prepared source rejects. A direct early payoff without this refinance record
is still outside this bounded source shape.

For taxable home gain, exactly one Form 8949 row must carry the same transaction
ID, net proceeds, basis, disposition date and taxable gain. A partial exclusion
requires code H. A fully excluded gain requires a reviewed exclusion record
reference and does not invent a Form 8949 row.

These reference fields are provenance identifiers, **not validated document
bytes**. The current return graph cannot independently verify the issuer
notification or closing/basis/exclusion/gift/ownership/refinance documents. It
also lacks a modeled source path for transfers with consideration,
spouse/ex-spouse divorce transfers, casualty replacement, non-joint-liability
co-ownership, qualified subordinate mortgage loans, MCCs transferred to a new
borrower or repeatedly reissued, and amended returns. The issuer's
no-annual-credit-increase certification is referenced but its document bytes and
Form 8396 credit history are not independently reconciled. A Form 8949 row is
required by this staged path for taxable home gain; the exact gain handoff for
other reporting routes remains unsupported. Public MeF and PDF export must keep
the Form 8828 guard closed until those filing rules and attachment validation
are resolved.

An exact Form 8396 join is blocked by its prepared source model.
`form8396SourceSchema` exposes one `certificate_number` and
`certificate_issue_date`; a current-year credit claim requires
`certificate_is_reissued === false`. Its prior-year source carries only 2022,
2023 and 2024 unused-credit amounts. The prepared graph has no original and
replacement MCC identity pair, refinancing date, old/new mortgage debt and
credit-rate terms, or year-by-year allowable-credit comparison. A current-year
reissued MCC cannot be represented there, and a carryforward-only Form 8396
cannot prove the IRS no-increased-credit condition. The Form 8828 reissue branch
therefore uses the reviewed issuer certification as a source claim while public
export stays closed; no Form 8396 match or credit history is inferred. An exact
join requires a direct Form 8396 source expansion for certificate lineage and
the applicable annual credit limits.

Foreclosure remains closed:
[Form 8828 line 9](https://www.irs.gov/pub/irs-pdf/i8828.pdf) directs fair
market value for a non-sale disposition, while
[IRS Topic 432](https://www.irs.gov/taxtopics/tc432) can use the full
nonrecourse debt as income-tax amount realized. That difference needs a separate
Form 8949/debt-source reconciliation. A casualty replacement generally avoids
recapture; failure to replace can require an amended return for the destruction
year, which the current original-return path does not model.
