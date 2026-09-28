# TY2025 Form 7203 stock-only ordinary-loss slice (written, unrun)

The [IRS Form 7203 instructions](https://www.irs.gov/instructions/i7203)
(latest published revision: December 2022) require a form for a shareholder
claiming an aggregate S-corporation loss. The [2025 shareholder K-1
instructions](https://www.irs.gov/instructions/i1120ssk) distinguish box 16
codes A/B (tax-exempt income), C (nondeductible expenses), D (nondividend
distributions), and E (loan repayments). These can change stock/debt basis and
filing even when box 1 alone looks simple.

For one current box-1 ordinary loss, the public `k1_s_corp` source now requires
an identified K-1 and a strict `form7203_stock_loss_ledger` for that
corporation and shareholder. It records the opening stock basis and its
workpaper, one original-shareholder stock block, and explicit absence of
current stock transactions, other basis changes, debt, prior suspended losses,
the basis-order election, and later at-risk/passive limits. A bare
`stock_basis_beginning` is not an alternate loss route. Contradictory K-1
income/deduction fields or debt facts stop before the loss is posted. Explicit
zero stock basis is accepted as a reviewed fact, not inferred from omission.

A bounded stock-only `IRS7203` XML function and two-page PDF descriptor are
registered. Their shared projection requires the K-1 current loss and
reviewed basis to equal the Form 7203 pending values, the allowed loss to equal
printed Schedule 1 line 5, and Form 1040 line 8 to equal Schedule 1 line 10.
The same reviewed source must document material participation with a workpaper
reference. A second registered native/PDF descriptor prints one Schedule E
Part II S-corporation row: line 28(a)/(b)/(d)/(e)/(i), line 29b(i), line 31,
line 32, and line 41. The native row uses the TY2025v5.4 XSD sequence and the
PDF retains official 2025 Schedule E page 2. Its line 41 is the basis-limited
loss on printed Schedule 1 line 5. Other Schedule E activity is rejected in
this narrow route rather than emitting a duplicate Schedule E document.
The Schedule 1 node now folds Form 7203's disallowed amount into printed
line 5 instead of an unprinted other-income subtotal; the AGI branch uses the
same adjustment once. Focused node, native Schedule 1, and PDF field-map tests
are written but unrun.

The XML order
and element names follow the checked-in TY2025v5.4 `IRS7203.xsd`: shareholder
and corporation identity, original-shareholder indicator, Part I opening and
ending stock basis, then Part III current loss, stock-allowed loss, and
remaining carryover. With zero opening basis it skips Part I lines 10–14 and
Part III column (c), as the printed form directs. It accepts exactly one K-1,
requires its ledger and pending loss/basis to agree, and refuses extra pending
basis fields. The PDF map uses the official two-page Rev. December 2022
AcroForm field tree, including Part I lines 1/5/7/10/11/14/15 and Part III
line 35 and 47 columns (a), (c), and (e). The canonical field names were
inspected, but filled appearance was not rendered or visually checked.

This is a registered source-backed route, but it is **not yet filing-verified**.
Focused tests and the single full batch, XSD and IRS business-rule validation,
filled-PDF inspection, and ATS acceptance remain unrun. The MeF/PDF preflight
still blocks other Form 7203 shapes. Actual box-16 code-D/E transactions,
multiple corporations,
stock blocks or shareholders, purchased/inherited/gift shares, contributions,
tax-exempt/nondeductible or other K-1 basis items, debt, prior suspended losses,
and stock dispositions remain unsupported. The previously misidentified
box-17 distribution field and the direct node's excess-distribution route stop
instead of creating an unrelated Form 2439 Schedule D gain.
