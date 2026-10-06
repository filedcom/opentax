# TY2025 Form 7203 bounded ordinary-loss routes (focused check)

## One cash capital contribution and one new formal note (2026-10-01, unrun)

A single S-corporation K-1 box-1 loss can now use both one 2025 cash capital
contribution and one new, directly funded shareholder formal note. The reviewed
stock ledger binds the contribution to the shareholder and corporation through a
dated bank transfer and a separate corporate capital-account record; the note
has its own signed instrument, note ID, and bank transfer. The two transfers and
all other source references must be distinct. Beginning stock basis and its
workpaper must agree across the ledger and note source. The current loss must
exceed opening stock basis plus the contribution, so the bounded route actually
reaches the note. It excludes a second note, prior reduced debt basis, other K-1
basis changes, and suspended losses.

Form 7203 Part I line 2 increases stock basis for the cash contribution, then
Part III applies the ordinary loss first to stock. Part II line 22 reports the
separate note advance and line 30 its share of the remaining loss. The allowed
stock and debt loss joins Schedule E, Schedule 1 line 5, and Form 1040 line 8;
native MeF and PDF replay the same source and final amounts. Positive
full-return and source/export tamper fixtures are authored for the deferred
validation pass. The bank, corporate ledger, signed-note, and K-1 records are
reviewed references rather than authenticated bytes. This follows the
[Form 7203 instructions](https://www.irs.gov/instructions/i7203), which assign
capital contributions to line 2, exclude shareholder loans from that line, and
track formal shareholder debt separately in Part II.

## Cash capital plus one partially repaid new note (2026-10-01, unrun)

The combined route now accepts one sourced 2025 principal repayment after the
new note's dated direct cash advance. The repayment's loan ledger and
shareholder bank deposit references must be distinct from the K-1, opening stock
workpaper, capital transfer/account, and note/advance records. K-1 box 16 code E
must equal the repayment. Because the new note has full basis before the
repayment, Form 7203 Part II records it as nontaxable on lines 19 and 26; the
remaining note balance on line 29 supports the current loss after stock basis.

An authored $500 opening stock basis, $1,000 cash contribution, $2,000 note,
$400 repayment, and $4,000 K-1 loss yields $1,500 allowed against stock, $1,600
against the post-repayment note, and $900 suspended. Schedule E, Schedule 1 line
5, and Form 1040 line 8 carry the $3,100 allowed loss. Native and PDF projection
and overlapping-reference, K-1 box 16, and return-tamper fixtures are authored
for the deferred batch. Multiple payments, older reduced-basis debt,
authenticated source bytes, and IRS acceptance remain open.

## Prior reduced formal-note basis and taxable repayment prerequisite (2026-10-01, unrun)

The executor now has an async `executeWithSourceDocuments` entry point. It
requires an exact set of distinct source references, nonempty `Uint8Array`
bytes, and SHA-256 matches before running the graph. Its result retains a
read-only reference/digest manifest and privately copied bytes; access returns
another copy. The Form 7203-specific entry point derives its nine claims from
the parsed, single-K-1 prior-reduced source: 2025 K-1, opening stock-basis
workpaper, signed note, prior filed return, IRS acceptance acknowledgement,
prior filed Form 7203, corporate loan ledger, shareholder bank deposit, and the
original shareholder bank advance. The tagged prior-note source requires that
advance's date, amount, reference and SHA-256; its date must match the signed
note and its amount must match opening face. It also affirms no prior principal
changes, no repayment Form 1099-B/1099-DA, and no other 2025 capital
transactions. For the bounded readable MeF XML profile, the byte set also
includes the 2024 IRS submission manifest, taking the exact-set contract to ten
documents. The verifier parses the uploaded 2024 return XML and separate IRS7203
XML, requires one Form 7203 formal-note group, matches the shareholder SSN,
corporation EIN, ending stock basis, note face and debt basis, and compares the
manifest's Submission ID, filer, tax year and return type to an XML
acknowledgment with `AcceptanceStatus=Accepted` and `CompletedValidation=true`.
Ambiguous/duplicate required elements, rejected status, other years and
unsupported PDF/opaque formats fail. Positive and content-tamper fixtures change
the return filer, manifest ID, acknowledgment status and filed Form 7203 basis
while keeping SHA-256 declarations in sync; they are authored for the deferred
batch. The ordinary MeF manifest does not itself contain a digest of the
submitted Return XML. When a retained manifest includes the explicit
`SubmissionXmlSha256` extension, the verifier compares it to the byte-bound
return SHA-256. Otherwise it returns `returnDigestLinkedToManifest: false`; the
manifest/acknowledgment Submission ID alone cannot prove which Return XML was
submitted. Neither case proves the uploaded acknowledgment came from IRS. It
also requires the same shareholder, corporation, stock ledger, and exact K-1
repayment/loss. Complete-byte, missing-byte, changed-byte, and altered- claim
fixtures are authored for the deferred batch.

For a note held more than one year, the staged gain candidate computes a Form
8949 Part II box F row with the original funding date, repayment date, full
principal proceeds, Form 7203 line 26 nontaxable basis, and line 34 capital
gain. It passes that row through the existing Form 8949 and Schedule D
calculators and requires the single-transaction Schedule D long-term and Form
1040 line 7 amounts to equal line 34. The $400 repayment/$200 basis example
produces $200 on each. Funding-date and original-advance tamper fixtures are
authored. The byte-bound executor returns this candidate beside its verified
manifest for review; it does not deposit the row or allow native/PDF filing.

This verifies that the supplied bytes match the declared digests in this
execution. It does **not** authenticate the issuer or IRS, parse the prior
accepted return/Form 7203 to prove all prior basis activity, prove the note and
principal payment contents, or establish the gain's holding period and character
from issuer-controlled records. The return/acknowledgment XML is caller
supplied, and neither its matching fields nor its digest establishes that the
bytes were retrieved from the IRS for this submission. The K-1 node and Form
7203 native/PDF exporters still reject the prior-reduced branch. The gain has a
calculated downstream candidate but remains unjoined to the actual return
pending graph.

The public K-1 source now uses the strict tagged `form7203_debt_evidence`
contract. Its `new_2025_formal_notes` branch retains the active new-note routes
below. The `prior_reduced_formal_note_repayment` branch records a signed older
note, its original date and shareholder/corporation identities, the accepted
prior return and Form 7203 references and SHA-256 digests, exact prior Form 7203
closing face and basis carried into 2025, and a dated principal payment with
separate corporation-ledger and shareholder-bank references and digests.
Distinct source references, no other shareholder debt, no current advances or
restoration, and an exact K-1 code E amount are required.

A bounded workpaper calculates Form 7203 lines 16–34 for an exact four-decimal
opening-basis-to-face ratio and whole-dollar nontaxable payment. For example, a
$1,000 opening face with $500 basis and a $400 repayment leaves $600 face, $300
basis before current loss, and $200 line 34 gain. Current loss is allocated to
opening stock basis and then the remaining debt basis. The
[Form 7203 instructions](https://www.irs.gov/instructions/i7203) require
formal-note gain on Form 8949 and Schedule D.

This workpaper is **not a filing route**. The byte-bound entry point retains the
exact declared source bytes, but the graph does not establish their content or
IRS acceptance and cannot authorize a Form 8949/Schedule D/1040 line 7 join. K-1
posting, direct Form 7203 calculation, native MeF, and PDF fail closed for this
branch. Positive arithmetic and source/return/export rejection fixtures are
authored for the deferred batch. Prior-return acceptance review, gain
character/holding-period proof, and the final Form 8949/Schedule D/Form 1040
join remain open.

## Two formal notes with one principal repayment each (2026-10-01, unrun)

The reviewed source permits a separately dated and evidenced 2025 principal
repayment on each of two new formal shareholder notes. Each payment must name
its own note ID, follow that note's advance, stay below its face amount, and
have distinct corporate-ledger and shareholder-bank references. The payment
amounts must sum exactly to K-1 box 16 code E. Both notes keep zero opening
face/basis, complete debt-inventory confirmation, and no prior reduced basis.

Form 7203 Part II places both repayments in their respective debt columns on
lines 19, 26, 32, and 33, with aggregate totals. Lines 20, 27, and 29 use each
post-repayment balance; line 30 allocates the debt-supported loss pro rata in
exact whole dollars. Part III, Schedule E, Schedule 1 line 5, Form 1040 line 8,
native MeF, and PDF replay the same allowance. Positive and note-ID,
duplicate-evidence, K-1-total, and return-tamper fixtures are authored for
deferred validation. More than one payment per note, prior reduced-basis gain,
authenticated source bytes, and nonintegral allocations remain closed. See the
[Form 7203 instructions](https://www.irs.gov/instructions/i7203).

## Two formal notes with principal repayment on the second note (2026-10-01, unrun)

The reviewed K-1 can now identify one principal repayment on the second of two
signed, directly funded 2025 formal shareholder notes. Its dated payment must
name the second note ID, follow that note's advance, be below its face amount,
and match K-1 box 16 code E. The first note affirms no repayment in this
particular case. Distinct loan-ledger and shareholder-bank references, the
complete two-note debt inventory, and zero opening face and basis remain
required.

Form 7203 Part II reports the payment in debt column 2 on lines 19, 26, 32,
and 33. Line 29 uses each note's balance after any repayment, and line 30
allocates the current debt-supported loss pro rata in exact whole dollars. The
shared projection reconciles the K-1 and both notes with Schedule E, Schedule 1
line 5, Form 1040 line 8, native MeF, and the PDF. A positive second-note
example and note-ID, dual-repayment, K-1, and return-tamper fixtures are
authored for deferred validation. Multiple repayments per note, prior
reduced-basis gain, authenticated source bytes, and nonintegral allocations
remain closed. The
[Form 7203 instructions](https://www.irs.gov/instructions/i7203) require
separate loan tracking and pro rata loss reduction.

## Two formal notes with one identified principal repayment (2026-10-01, unrun)

The two-note source now permits one 2025 principal repayment on the first formal
note when the payment names that exact note ID, follows its dated cash advance,
matches K-1 box 16 code E, and has distinct corporate-loan-ledger and
shareholder-bank-deposit references. The second note must affirm no repayment.
Both notes still start with zero face amount and debt basis, have no prior basis
reduction, and comprise the complete shareholder-debt inventory. The payment is
less than the first note's advance, so its fully based repayment creates no line
34 gain.

Form 7203 Part II reports the repayment only in debt column 1 on lines 19, 26,
32 and 33. Debt column 2 has no repayment. The current loss first uses stock
basis, then reduces the two remaining debt bases pro rata using each note's
**post-repayment** line 29 basis, with exact whole-dollar allocation. The shared
native/PDF projection replays the K-1, stock ledger, both note sources,
repayment, Schedule E loss, Schedule 1 line 5, and Form 1040 line 8. Positive
and note-ID, K-1, and return-tamper fixtures are authored but unrun.
Authenticated loan/bank bytes, multiple repayments per note, reduced-basis
repayment gain, and nonintegral allocations remain closed. This follows the
[Form 7203 instructions](https://www.irs.gov/instructions/i7203) for separate
formal-note repayments and pro rata loss reduction.

## Two new formal shareholder notes (2026-10-01, unrun)

The reviewed formal-note source can identify a second signed 2025 note and its
own cash-transfer proof. Both note IDs, signed-note references and bank transfer
references must be distinct; both share the K-1 shareholder lender and
corporation borrower. The complete-debt inventory affirmation still means there
is no shareholder debt beyond the listed one or two notes. This bounded case
requires zero opening face/basis for each note, no repayments, no prior
debt-basis reduction, and an exact whole-dollar pro rata allocation of the
current loss to the two note bases. No guarantee or cosign supplies basis.

Form 7203 Part II now emits separate debt 1 and debt 2 columns in both native
MeF and the two-page PDF, with full advance/basis totals and per-note line 30
loss reductions. Part III sums the allowed debt loss once, after the stock loss.
The shared projection reconciles the two source notes and the allowed loss
against Schedule E, Schedule 1 line 5 and Form 1040 line 8. A positive two-note
case and altered note-ID/amount/return cases are authored but unrun. The note
and bank records remain referenced rather than byte-authenticated; repayments
more than one repayment per note, prior reduced debt basis, more than two notes,
and nonintegral pro rata allocations remain closed. The separate-column and pro
rata treatment follows the
[Form 7203 instructions](https://www.irs.gov/instructions/i7203).

## One new formal note with a principal repayment (2026-10-01, unrun)

The reviewed one-note source now accepts one separately evidenced 2025 principal
repayment after the dated direct cash advance. It requires a corporate loan
ledger reference and a distinct shareholder bank deposit, identifies the payment
as principal, matches K-1 box 16 code E, and keeps the note's beginning face and
basis at zero with no prior reduced debt basis. The repayment must be less than
the advance, leaving a positive note balance for the current K-1 loss. The same
source is replayed at native and PDF export, including the final Schedule 1 line
5 and Form 1040 line 8 loss joins.

Form 7203 Part II first reports the loan on lines 17/18/24, then the principal
payment on lines 19/26/32/33 at the full-basis line 25 ratio of 1.0000. Lines
20/27/29 reflect the remaining note balance before the current-year loss reduces
debt basis on line 30. Line 34 reportable repayment gain is zero in this bounded
case. Part III and Schedule E allocate current ordinary loss to stock, then the
repaid note's remaining basis; Schedule 1 and Form 1040 carry the resulting
allowed loss. Positive and altered date/source/return fixtures are authored for
the deferred batch. This example does not cover a prior reduced-basis note,
interest in the payment, or authenticated bank and corporate-record bytes. See
the [Form 7203](https://www.irs.gov/pub/irs-pdf/f7203.pdf) and
[instructions](https://www.irs.gov/instructions/i7203).

## One new formal note with two principal repayments (2026-10-01, unrun)

The direct first-note source now uses one `principal_repayments` list containing
one or two strictly dated 2025 principal-only payments. For two payments on a
single new note, each names that note and has a distinct corporate loan ledger
and shareholder deposit reference. Dates must advance after the signed note;
their total must remain below the full-basis advance and equal K-1 box 16 code
E. The source confirms zero opening debt basis, no earlier debt-basis reduction,
and no other basis changes. The one-payment and no-payment first-note routes use
the same direct list shape; the old singular first-note field is removed.

Both payments precede year-end loss allocation. Form 7203 Part II lines 19, 26,
32, and 33 report their aggregate, lines 20/27/29 use the remaining note
balance, and line 30 applies the debt-supported ordinary loss. The bounded
example advances $2,000, repays $200 and $350 on separate dates, and leaves
$1,450 of debt basis to support loss after $1,500 of stock basis. Its $2,950
allowed Schedule E loss joins Schedule 1 line 5 and Form 1040 line 8; native and
PDF projections replay the same totals. Positive, duplicate-date/record, K-1
total, overpayment, nonprincipal, and return-tamper fixtures are authored for
the deferred batch. Two payments on the first note together with a second formal
note, reduced prior basis, repayment gain, interest allocation, and
authenticated bank or corporate records remain outside this route. The
[Form 7203 instructions](https://www.irs.gov/instructions/i7203) require a
separate formal-note column and the loan-specific principal total on line 19.

## One new formal-note debt loss route (2026-10-01, unrun)

The public S-corporation K-1 input accepts a strict `form7203_debt_evidence`
with `kind: "new_2025_formal_notes"` for a single new 2025 formal shareholder
note. It ties the shareholder/borrower identifiers, exact K-1 source and box-1
loss, opening stock-basis workpaper, signed note, separate note ID, and bank
transfer to one direct cash advance. It requires zero beginning note balance and
debt basis, no other notes, repayments, prior reduced debt basis, other basis
changes, or suspended losses. Distinct references and the K-1 amount are
reconciled with the stock ledger before current loss is allocated to stock, then
to the new note. A guarantee or cosign cannot satisfy the source contract.

For this one-note case, the K-1 node sends the advance and reviewed note to
Form 7203. Part I applies current loss to stock first. Part II debt 1 shows the
formal-note indicator, zero opening face/basis, lines 17/22 advance, lines
18/20/24/27/29 totals, line 25 ratio 1.0000, line 30 allowable debt loss, and
line 31 remaining basis. Part III lines 35/47 split current loss between stock
column (c), debt column (d), and carryover column (e). The shared native/PDF
projection requires the source, pending Form 7203 amounts, Schedule E allowed
loss, Schedule 1 line 5, and Form 1040 line 8 to agree. The official
[Form 7203](https://www.irs.gov/pub/irs-pdf/f7203.pdf),
[instructions](https://www.irs.gov/instructions/i7203), and local TY2025v5.4
`IRS7203.xsd` support this line mapping. Positive and mismatch fixtures are
authored but unrun. Note and bank evidence remains reviewed references and
affirmations rather than authenticated bytes. Older debt, repayments,
restoration, multiple notes, open-account debt, other K-1 items, and later
at-risk/passive limits remain closed.

## Debt-supported loss boundary (staged, unrun)

The 2022 [Form 7203 instructions](https://www.irs.gov/instructions/i7203)
require each formal shareholder note to be tracked separately in Part II and
distinguish open-account debt; a guarantee alone is not debt basis. The direct
Form 7203 calculation node previously let a positive beginning debt balance or
new loan reduce the Schedule 1 loss add-back without an identified note,
open-account history, or printable Part II. A current ordinary loss with an
unsourced positive debt amount still stops at calculation before posting a tax
amount. Source, node, native, and PDF rejection fixtures are authored for the
deferred bulk pass. Other debt-basis filing still requires loan records,
basis-restoration and repayment history, and per-note Part II review.

The [IRS Form 7203 instructions](https://www.irs.gov/instructions/i7203) (latest
published revision: December 2022) require a form for a shareholder claiming an
aggregate S-corporation loss. The
[2025 shareholder K-1 instructions](https://www.irs.gov/instructions/i1120ssk)
distinguish box 16 codes A/B (tax-exempt income), C (nondeductible expenses), D
(nondividend distributions), and E (loan repayments). These can change
stock/debt basis and filing even when box 1 alone looks simple.

For one current box-1 ordinary loss, the public `k1_s_corp` source now requires
an identified K-1 and a strict `form7203_stock_loss_ledger` for that corporation
and shareholder. It records the opening stock basis and its workpaper, one
original-shareholder stock block, and explicit absence of current stock
transactions, other basis changes, debt, prior suspended losses, the basis-order
election, and later at-risk/passive limits. A bare `stock_basis_beginning` is
not an alternate loss route. Contradictory K-1 income/deduction fields or debt
facts stop before the loss is posted. Explicit zero stock basis is accepted as a
reviewed fact, not inferred from omission.

A bounded stock-only `IRS7203` XML function and two-page PDF descriptor are
registered. Their shared projection requires the K-1 current loss and reviewed
basis to equal the Form 7203 pending values, the allowed loss to equal printed
Schedule 1 line 5, and Form 1040 line 8 to equal Schedule 1 line 10. The same
reviewed source must document material participation with a workpaper reference.
A second registered native/PDF descriptor prints one Schedule E Part II
S-corporation row: line 28(a)/(b)/(d)/(e)/(i), line 29b(i), line 31, line 32,
and line 41. The native row uses the TY2025v5.4 XSD sequence and the PDF retains
official 2025 Schedule E page 2. Its line 41 is the basis-limited loss on
printed Schedule 1 line 5. Other Schedule E activity is rejected in this narrow
route rather than emitting a duplicate Schedule E document. The Schedule 1 node
now folds Form 7203's disallowed amount into printed line 5 instead of an
unprinted other-income subtotal; the AGI branch uses the same adjustment once.
The focused native/PDF Form 7203 cases pass; the wider source-to-return and
Schedule 1/1040 regression remains open.

The XML order and element names follow the checked-in TY2025v5.4 `IRS7203.xsd`:
shareholder and corporation identity, original-shareholder indicator, Part I
opening and ending stock basis, then Part III current loss, stock-allowed loss,
and remaining carryover. With zero opening basis it skips Part I lines 10–14 and
Part III column (c), as the printed form directs. It accepts exactly one K-1,
requires its ledger and pending loss/basis to agree, and refuses extra pending
basis fields. The PDF map uses the official two-page Rev. December 2022 AcroForm
field tree, including Part I lines 1/5/7/10/11/14/15 and Part III line 35 and 47
columns (a), (c), and (e). The canonical field names were inspected. The
two-page filled stock-only case was rendered and visually checked:
shareholder/corporation identity, original-shareholder box, Part I opening
$3,000 basis and allowed reduction, and Part III $4,000 current loss, $3,000
stock-allowed loss, and $1,000 carryover land in the correct columns. The
artifact is `.state/research/ty2025-form7203-filled-review.pdf`. The native case
passes the local TY2025 v5.4 `IRS7203` XSD; ten focused native/PDF tests pass. A
separate synthetic reviewed K-1 and general taxpayer source was run through the
executor, MeF bundle, and real PDF packet builder. Its full return XML passes
the local TY2025 v5.4 `Return1040.xsd`, and the seven-page packet visually ties
Form 7203's $3,000 allowed loss to Schedule E line 41, Schedule 1 lines 5/10,
and Form 1040 line 8. The full XML and packet are at
`.state/research/ty2025-form7203-full-return.xml` and
`.state/research/ty2025-form7203-full-return.pdf`. This is synthetic reviewed
source evidence, not authenticated uploaded K-1 bytes or IRS acceptance.

This is a registered source-backed route, but it is **not yet filing-verified**.
The current-source full batch, other full-return combinations, authenticated
source bytes, IRS business-rule validation, and ATS acceptance remain open. The
MeF/PDF preflight still blocks other Form 7203 shapes. Actual box-16 code-D/E
transactions, multiple corporations, stock blocks or shareholders,
purchased/inherited/gift shares, contributions outside the bounded cash-capital
route, tax-exempt/nondeductible or other K-1 basis items, debt, prior suspended
losses, and stock dispositions remain unsupported. The previously misidentified
box-17 distribution field and the direct node's excess-distribution route stop
instead of creating an unrelated Form 2439 Schedule D gain.

## One reviewed cash capital contribution (2026-10-01)

The single original-shareholder, one K-1 ordinary-loss route now accepts one
2025 cash contribution to the corporation without issuing additional shares. The
strict stock ledger identifies the shareholder SSN and corporation EIN,
contribution date and whole-dollar amount, bank transfer, and distinct corporate
capital-account record; it affirms cash receipt, no share issuance, and no
shareholder loan. The K-1 source sends the amount to Form 7203 Part I line 2.
The calculation increases stock loss capacity by that amount; native XML prints
`CapitalContributionBasisAmt`, and the two-page PDF prints line 2. Both replay
the same reviewed ledger and require the allowed loss to match Schedule 1 line 5
and Form 1040 line 8. Focused K-1, calculation, native, PDF, and tamper cases
are authored but unrun. Actual bank/corporate records and K-1 bytes are still
referenced rather than independently authenticated. New share purchases,
property contributions, debt basis, other K-1 basis changes, and prior losses
remain closed. This follows
[Form 7203 line 2 instructions](https://www.irs.gov/instructions/i7203).

## Executed owned current debt and QBI loss slice (2026-10-06)

See [the owned debt source proof](ty2025-form7203-owned-debt-source-proof.md).
The new mandatory current-record route proves original stock cost/history,
independent current cash capital, direct shareholder funding, principal
repayments and basis-limited ordinary loss through complete native/PDF packets.
It also retains the allowed qualified-loss carry on Form8995 separately from the
basis-suspended qualified portion. Existing old routes remain compatible. The
prior reduced-debt accepted-history guard and the other explicitly listed parent
boundaries remain open; constructed current records are not outside
issuer/signature authentication or acceptance evidence.

## MFJ separately owned current direct-note losses (2026-10-06)

[Executed source/copy proof](ty2025-form7203-spouse-owned-debt-source-proof.md)
extends the owned current source to the actual spouse and two distinct
spouse-owned corporations. Each limitation is derived before aggregation; both
shareholders' 7203 copies and joint E/8995 rows are required. Original loss
economics and prior accepted-history guard are retained. This is a bounded
current source/copy route, not closure of the full
stock/debt/repayment/authentication parent.
