# TY2025 Form 7203 stock-only ordinary-loss slice (focused check)

## One new formal-note debt source prerequisite (2026-10-01, unrun)

The public S-corporation K-1 input now accepts a strict, **nonfiling**
`form7203_one_note_debt_candidate` for a single new 2025 formal shareholder
note. It ties the shareholder/borrower identifiers, exact K-1 source and box-1
loss, opening stock-basis workpaper, signed note, separate note ID, and bank
transfer to one direct cash advance. It requires zero beginning note balance
and debt basis, no other notes, repayments, prior reduced debt basis, other
basis changes, or suspended losses. Distinct references and the K-1 amount
are reconciled before estimating how much current loss exceeds stock basis and
could be supported by the note. The estimate is only a review value; it never
posts Schedule 1 or Form 1040 income. A guarantee or cosign cannot satisfy the
source contract.

The K-1 calculation and shared native/PDF Form 7203 preflight now reject a
matched candidate with an explicit Part II/Part III debt-column filing reason.
This keeps a direct descriptor call from printing the stock-only form for a
known note. Positive, source-swap, duplicate-reference, calculation-gate, and
native/PDF-gate fixtures are authored and unrun. The records are references
and affirmations, not authenticated note/bank bytes. Filing still needs
executor-owned evidence, per-note Part II lines 16–34, debt reduction and
restoration ordering, Part III debt-allowed columns, repayments and gain when
applicable, and final Schedule E/Schedule 1/Form 1040 reconciliation.

## Debt-supported loss boundary (staged, unrun)

The 2022 [Form 7203 instructions](https://www.irs.gov/instructions/i7203)
require each formal shareholder note to be tracked separately in Part II and
distinguish open-account debt; a guarantee alone is not debt basis. The public
K-1 stock-loss route and registered native/PDF projection already reject debt,
but the direct Form 7203 calculation node previously let a positive beginning
debt balance or new loan reduce the Schedule 1 loss add-back without an
identified note, open-account history, or printable Part II. A current
ordinary loss with either positive debt amount now stops at calculation before
posting a tax amount. Source, node, native, and PDF rejection fixtures are
authored for the deferred bulk pass. Positive debt-basis filing still requires
the loan records, basis-restoration and repayment history, per-note Part II,
and a complete source-to-return review.

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
same adjustment once. The focused native/PDF Form 7203 cases pass; the wider
source-to-return and Schedule 1/1040 regression remains open.

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
inspected. The two-page filled stock-only case was rendered and visually checked:
shareholder/corporation identity, original-shareholder box, Part I opening
$3,000 basis and allowed reduction, and Part III $4,000 current loss, $3,000
stock-allowed loss, and $1,000 carryover land in the correct columns. The
artifact is `.state/research/ty2025-form7203-filled-review.pdf`. The native
case passes the local TY2025 v5.4 `IRS7203` XSD; ten focused native/PDF tests
pass. A separate synthetic reviewed K-1 and general taxpayer source was run
through the executor, MeF bundle, and real PDF packet builder. Its full return
XML passes the local TY2025 v5.4 `Return1040.xsd`, and the seven-page packet
visually ties Form 7203's $3,000 allowed loss to Schedule E line 41,
Schedule 1 lines 5/10, and Form 1040 line 8. The full XML and packet are at
`.state/research/ty2025-form7203-full-return.xml` and
`.state/research/ty2025-form7203-full-return.pdf`. This is synthetic reviewed
source evidence, not authenticated uploaded K-1 bytes or IRS acceptance.

This is a registered source-backed route, but it is **not yet filing-verified**.
The current-source full batch, other full-return combinations, authenticated
source bytes, IRS business-rule validation, and ATS acceptance remain open.
The MeF/PDF preflight
still blocks other Form 7203 shapes. Actual box-16 code-D/E transactions,
multiple corporations,
stock blocks or shareholders, purchased/inherited/gift shares, contributions
outside the bounded cash-capital route,
tax-exempt/nondeductible or other K-1 basis items, debt, prior suspended losses,
and stock dispositions remain unsupported. The previously misidentified
box-17 distribution field and the direct node's excess-distribution route stop
instead of creating an unrelated Form 2439 Schedule D gain.

## One reviewed cash capital contribution (2026-10-01)

The single original-shareholder, one K-1 ordinary-loss route now accepts one
2025 cash contribution to the corporation without issuing additional shares.
The strict stock ledger identifies the shareholder SSN and corporation EIN,
contribution date and whole-dollar amount, bank transfer, and distinct corporate
capital-account record; it affirms cash receipt, no share issuance, and no
shareholder loan. The K-1 source sends the amount to Form 7203 Part I line 2.
The calculation increases stock loss capacity by that amount; native XML prints
`CapitalContributionBasisAmt`, and the two-page PDF prints line 2. Both replay
the same reviewed ledger and require the allowed loss to match Schedule 1 line
5 and Form 1040 line 8. Focused K-1, calculation, native, PDF, and tamper cases
are authored but unrun. Actual bank/corporate records and K-1 bytes are still
referenced rather than independently authenticated. New share purchases,
property contributions, debt basis, other K-1 basis changes, and prior losses
remain closed. This follows [Form 7203 line 2 instructions](https://www.irs.gov/instructions/i7203).
