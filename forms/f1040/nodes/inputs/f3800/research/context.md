# TY2025 Form 3800 source and filing model

## Current code, not a claim of whole-form support

The `f3800` input node has two materially different paths. Its older `f3800s`
items accept aggregate current credit and carryover amounts, and deposit the
sum into Schedule 3 without the Form 3800 tax limitation. The TY2025 MeF
builder rejects a positive legacy amount. Do not use this route as evidence of
a filed general business credit calculation.

Source-backed current-year entries from Forms 8820, 8826, 8835, 8874, 5884,
and 8936, plus supported K-1 and Form 8582-CR allocations, instead deposit
classified credit sources to `f1040`. The output node derives the Part II
liability context from the finalized return, calculates the allowed amount,
and puts that amount on Schedule 3 line 6a. The MeF builder recomputes the
Part II amount, reconciles the filed source documents and source allocations,
and emits one `IRS3800` with Part III current-year and, for supported passive
prior-year credits, Part IV/VI rows. See `calculation.ts`,
`forms/f1040/nodes/outputs/f1040/index.ts`, and
`forms/f1040/2025/mef/forms/f3800.ts`.

The source-backed calculation now accepts reconciled nonpassive Section 39
vintages and places ordinary carryforwards on Part I line 4 and specified
carryforwards on Part II line 34. Part I line 5 and Part II line 35 remain zero;
later-year carrybacks are unsupported. The input rejects passive,
current-year-adjusted, empowerment-zone, and research-credit vintages pending
their distinct allocation and limitation paths. The native builder rejects every positive carryforward
because its prior-return evidence, Part IV/VI rows, and filed history statement
are not yet linked. The passive path can carry prior-year Form 8582-CR credits
by source and year, but that is not a substitute for a complete Section 39
carryover ledger. The tax-use allocator orders supplied vintages before
current-year credits, yet only vintages actually supplied by the supported
source paths can participate.

`carryover-ledger.ts` now provides a separate cent-precise reconciliation for
one origin-year credit per source. It checks originating credit against the
amount allowed in that year, subsequent return uses, earlier downward changes,
and the balance entering 2025. It also keeps a 2025 recapture adjustment out
of the available balance, requires evidence for an extended carryback window,
and retains the facts needed for the required statement. Its four focused
cases pass. The reconciled ledger is now a public `f3800` calculation input and
supplies Part I/II amounts, but it does not yet supply Part IV/VI filing rows.
No positive carryover filing claim follows from the input alone.

`f3800_carryover_statement.ts` can now append a standalone PDF history page
from those checked vintages. It prints the originating credit and amount
allowed, the original/revised 2025 balance, each carryback and carryforward
use, and prior/current adjustments. It keeps a credit together across ordinary
page breaks and repeats source identity if a single history needs a continuation.
A two-page nine-vintage diagnostic was rendered and visually checked. The
statement is not yet connected to a prepared return or native attachment.
The TY2025 v5.4 schema has a separate `CarryforwardGeneralBusinessCr`
document for origin and year-by-year use facts; Part I line 4 can reference
its document ID. The filing route must build and reconcile this structured
document as well as print the history page.

## New Markets recapture boundary

The `f8874_recapture` input computes the tax and interest from a Form 8874-B
event and tracks each affected QEI carryover vintage with its originating
year, credit generated, earlier filed-return uses, and balance entering 2025.
That ledger is not yet joined to Form 3800. The IRS says the 2025 Part IV
column (h) reports amounts recaptured or otherwise adjusted, column (i) is
the remaining carryforward, and a changed carryforward requires a statement
of origin-year credit, amount allowed, and carryback/carryforward use by year.
It also says Part I line 4 starts with nonpassive Part IV column (f). The
current calculation does not yet reconcile a 2025 recapture adjustment with
that Part I/II amount or with other same-line QEI vintages. Do not synthesize
a lone Part IV row from the recapture balance or treat it as a usable 2025
credit.

## Completion work

1. Connect the source-specific Section 39 vintage reconciliation to prepared
   nonpassive and passive carryovers, source documents, prior filed returns,
   and Form 8582-CR. Verify source/credit identity, the statutory carryback
   period, and all revised balances against authenticated evidence.
2. Derive Form 3800 Part I lines 4/5, Part II lines 34/35, and Part IV/VI
   amounts from that ledger and the tax-use ordering, including recapture in
   column (h). Ensure a recaptured QEI cannot be applied to 2025 tax.
3. Bind the PDF history statement to the same prepared source ledger and any
   required native attachment, including the additional Form 6765 details for
   revised research credits. Verify the full return, local TY2025 schema, IRS
   business rules, and ATS behavior in the requested full batch.

## Primary sources

- [2025 Form 3800 and Schedule A instructions](https://www.irs.gov/instructions/i3800),
  especially Part I line 4 and Part IV columns (d) through (i) and the
  required statement.
- [2025 Form 3800](https://www.irs.gov/pub/irs-pdf/f3800.pdf).
- [Form 8874 and instructions](https://www.irs.gov/pub/irs-pdf/f8874.pdf).
