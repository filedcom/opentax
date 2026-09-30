# TY2025 Form 8886 reportable-transaction disclosure gap

Status: `IRS8886` exists in the checked-in TY2025 MeF schema, but the Form 1040
graph has no public `f8886` source, native descriptor, PDF descriptor, or
complete return-level reportable-transaction decision. A bounded high-loss
disposition preflight now blocks both exports pending review. The wider filing
gap remains open. The `IRS8886` text in the Form 8621 descriptor
is an allowed reference-document name, not a Form 8886 builder or a finding
that any PFIC item is reportable.

The [IRS Form 8886 instructions](https://www.irs.gov/instructions/i8886)
require a disclosure for each reportable transaction in which the taxpayer
participated, generally with the return for every participation year. The
categories are listed transactions, confidential transactions, transactions
with contractual protection, loss transactions, and transactions of interest.
The listed/interest determination depends on current published guidance and
substantially similar strategies, not a form number alone. Confidential and
contractual-protection determinations need advisor terms, fees, disclosure
restrictions, and refund/contingency rights that are not present in the
existing income-form inputs.

There is a concrete silent-filing exposure. `form4684` can route a large
business casualty/theft loss to Form 4797 or Schedule D; `f1099b`/`f8949`
can route a large per-transaction capital loss; partnership and S-corporation
K-1 inputs can carry large allocated losses. None produces a Form 8886
document. For individuals, the IRS loss-transaction category can apply to a
section 165 loss of at least $2 million in one year, $4 million over the
transaction year and five succeeding years, or $50,000 for a section 988
foreign-currency loss. Pass-through losses are assessed without entity-level
netting, and the threshold uses the full section 165 loss before offsetting
gains and other limitations. A large entered loss is therefore a review
signal, not proof that disclosure is required: the current fields do not
identify the whole transaction, prior/subsequent-year losses, section 165 or
988 character, applicable published exceptions, or material-advisor facts.
Conversely, a smaller tax item could still be listed or otherwise reportable.
Do not silently conclude that the absence of `f8886` means no disclosure.

The first implemented screen reads each `f8949.f8949s` and
`f1099b.f1099bs` source row, as well as finalized Form 8949 rows, before
offsetting other sales or applying row adjustments. When `cost_basis -
proceeds` is at least $2 million on one row, both MeF and PDF export stop
with a named Form 8886 review error. This catches an individual-year
threshold signal even when an adjustment reduces the filed net capital loss.
It does not classify the row under section 165, apply a published exception,
or infer that smaller losses are safe. Source guard cases for the exact
threshold, both input arrays, both export paths, and a below-threshold row
are written for the deferred batch. A second bounded screen reads the Form
4684 business property's FMV decline, adjusted basis, and insurance, then
stops both exports when the resulting pre-netting casualty loss reaches $2
million. Exact-threshold, insurance-reduced, and below-threshold cases are
authored for the deferred batch. Neither screen determines whether section
165 or a published exception applies. Multi-property casualty, K-1, section
988, multi-year, listed/confidential, contractual-protection, and
transactions-of-interest screening remain open.

A correct public source needs a stable transaction identity and participation
years; all applicable category flags with the governing notice/regulation for
listed or interest transactions; source-linked tax consequences and anticipated
benefits by year; section 165/988 gross loss and multi-year history; published
exception/protective-disclosure facts; material-advisor and promoter identities,
fees and reportable-transaction numbers; pass-through entity identities and
K-1 receipt dates; complete transaction steps, parties, business purpose,
agreements and tax-result protection. It must reconcile each claimed benefit
to the actual return source rather than merely accept a disclosure narrative.
The [IRS line instructions](https://www.irs.gov/instructions/i8886) require
those descriptions, amounts and participants, plus ordered continuation sheets
where the official form is too small. A high-loss screening step should raise
review, not manufacture an `IRS8886` from an amount alone.

The initial disclosure has an additional workflow outside MeF: an exact,
word-for-word copy of the Form 8886 filed with the electronic return must also
be mailed or faxed to the IRS Office of Tax Shelter Analysis (OTSA). That copy
needs its own final-artifact identity and delivery/confirmation record; a MeF
attachment or PDF preview does not send it. Subsequent years, late K-1
relief, later IRS designation as listed/interest, and amended/carryback returns
have distinct timing rules. The current app has no such workflow. It should
not claim the disclosure is complete until both the return attachment and any
required OTSA delivery are accounted for.

The disclosure serializer, PDF, OTSA workflow, and full review source are not
implemented. No tests, typecheck, XSD validation, or filled-PDF rendering ran
after this screen was written.
