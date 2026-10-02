# TY2025 Form 8962: two sequential shared policies

The [2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962) say
that separately shared policies need separate Part IV allocations on lines
30–33. Each month of a Situation 4 agreement uses the same percentage for
enrollment premium, applicable SLCSP, and APTC. This slice handles a single
filer with no dependents who shared one Marketplace policy in January–June and a
different policy in July–December with the same other taxpayer.

Both policies must identify the filer as Form 1095-A recipient, cover exactly
the filer and that other taxpayer, be in the filer's state, have monthly source
columns only in their own contiguous period, and carry one reviewed agreement
that exactly names its policy, taxpayers, months, and percentage. The native
preflight recomputes both source allocations and every Form 8962 field. It
checks the resulting credit or repayment against Schedule 3 or 2 and the final
Form 1040. The PDF descriptor invokes the same preflight and maps the two Part
IV rows. Positive credit and repayment and source, overlap, and return-tamper
fixtures are authored for the bulk test pass.

This does not establish Marketplace or agreement-document authenticity from the
reviewed source metadata. It does not cover simultaneous policies, a dependent,
different other taxpayers, corrected SLCSP, a state move, or mixed allocation
situations. Those routes remain closed.
