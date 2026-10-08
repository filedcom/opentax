# TY2025 current-return and separate-workflow decision matrix

Static review, updated 2026-10-04. This records what the current Form 1040 code
can observe and what an optional `ReturnData1040` root would mean. The user's
direction is to follow the existing per-claim workflow pattern; this matrix
makes **no** new root exclusion. The TY2025 v5.4 `ReturnData1040.xsd`
and root schemas inspected here live in ignored `.state/research/docs/...`;
`git ls-files` does not list them. The schema observations need a reproducible
official artifact before release and do not establish MeF business-rule
acceptance. The [211-root census](./ty2025-xsd-document-root-census.md) is a
static index to that local cache.

| Root and owner/trigger | Current code and schema observation | Current-return consequence | Decision options requiring product approval |
| --- | --- | --- | --- |
| `IRS1040X`: taxpayer correction to a previously filed return. | Cached schema permits one optional 1040-X root. Typed `amendment_request` intake now retains the affected year, summary, prior-return reference, unique request reference, and confirmed intent; both original-return exporters stop with a separate-workflow message. The current graph still lacks accepted-prior-versus-corrected lines and amendment attachments. Form 1116 Schedule C is staged and guarded. | No amendment can be emitted. A later foreign-tax redetermination can affect an earlier return; simply filing the current original return does not resolve that obligation. | Build an amendment workflow here with accepted-prior-return, affected-year graph, explanation and changed-form packet; or route the taxpayer to a separately owned amendment service while explicitly detecting and surfacing known amendment triggers. Intake is implemented, but no amendment filing service is yet chosen or complete. |
| `IRS1062Payment`: requested debit for a qualified-farmland installment election. | Cached root permits repeated payment records and its type has routing/account, amount and requested-date fields. Typed `payment_request` intake now retains an affirmative farmland-installment intent and stops both exports with a separate-workflow message. No Form 1062 election/ledger source, debit consent or payment descriptor exists; the 1040 root menu does not show a parent `IRS1062`. | No debit instruction is sent; a farmland-sale tax computation or future installment cannot be inferred from ordinary 1040 balance or payment fields. The underlying election and current tax still need a route. | Offer the election plus authorized debit with Form 1040; or provide a separate election/payment workflow with an explicit handoff. Do not equate nonpayment-root registration with absence of the election obligation. |
| `IRS965Payment`: filer elects a section 965 installment debit. | Cached schema permits one optional root. Typed `payment_request` intake retains an affirmative installment-debit intent and stops both exports. Public `f965` has prior liability/current-year-payment history and Form 965-A staging, but no bank authorization; active Form 965 export is guarded. | No 965 debit is requested. A `current_year_payment` is historical payment evidence, not authorization to debit a bank account. Liability and past-payment reconciliation remain required. | Offer a consented 965 direct debit in the return packet or hand off to a separate payment channel after the 965-A ledger is validated. |
| `IRSESPayment`: filer requests future estimated-tax withdrawals. | Cached schema permits up to four records. Typed `payment_request` intake retains distinct future-estimate intent and stops both exports. `f1040es` records payments already made and deposits them on Form 1040 line 26; it has no future-year debit instruction or bank consent. | Line 26 can show prior payments, but no next-year payment is scheduled. | Offer distinct dated future-payment requests with explicit consent and duplicate-request checks, or direct taxpayers to another estimated-payment workflow. Never derive requests from line 26. |
| `IRSPayment`: filer requests a current-return balance-due debit. | Cached schema permits repeated optional records. Typed `payment_request` intake retains a confirmed amount/date/reference and stops both exports. Form 1040 line 37 is calculated; no bank authorization or registered payment serializer exists. | Balance due remains a tax result, not a debit request. Refund direct-deposit details also cannot authorize a withdrawal. | Add a consented e-file payment step with acknowledgment/cancellation handling, or direct taxpayers to a separate payment channel. No automatic debit from line 37. |
| `IRSRRB1042S`: Railroad Retirement Board issued statement. | Cached schema permits repeated payer-copy roots. Typed `benefit_1042s` intake now retains the issuer kind, recipient TIN, source reference, reported gross benefits and withheld tax; both exporters stop. Public `rrb1099r`/railroad sources are distinct and no native/PDF 1042-S copy descriptor exists. | A resident-status/refund case cannot safely use an RRB-1099-R value as its 1042-S copy. Income and withholding may still affect the current return, so the retained copy cannot silently drop. | Determine, by recipient status and claim, whether to ingest as source only or transmit an issued copy; build that typed copy route when required. A separate payer filing does not settle recipient attachment requirements. |
| `IRSSSA1042S`: Social Security Administration issued statement. | Cached schema permits repeated payer-copy roots. Typed `benefit_1042s` intake now retains the issuer kind, recipient TIN, source reference, reported gross benefits, withheld tax and resident-refund intent; both exporters stop. Public `ssa1099` is a different statement and no native/PDF 1042-S copy descriptor exists. | The narrow lawful-permanent-resident erroneous-withholding refund path requires the issued SSA-1042S, residency and signed declaration evidence; current intake retains but cannot file it. Ordinary SSA-1099 income is separate. | Support this specific Form 1040 refund/copy path, or route it to an explicitly scoped service with a clear intake signal. Standalone 1040-NR exclusion does not exclude this resident path. |
| `IRS4547`: authorized person's child-account/pilot election. | Cached schema permits repeated optional roots. A typed `f4547` request now retains unique child SSNs, account/pilot intent, and a confirmation reference. Child/elector authority, eligibility, consent, a valid Form 4547 signature under the applicable tax-software/practitioner workflow, and MeF/PDF descriptors remain absent; the request fails both exports. Existing [Form 4547 review](./ty2025-unregistered-root-applicability.md#individual-return-paths-without-a-proven-public-source-undecided) cites an attached current-return election and separate paper/account channels, excluding attachment to 1040-X. | An entered per-child election cannot silently disappear from either prepared packet. An unentered optional election remains unobservable. Tax liability is unaffected. | Build an attached native/PDF packet only after responsible-party authority, child eligibility, consent, and the required signature under the applicable e-file workflow are modeled, or clearly route to the documented separate channel. Decide whether an explicit “not offered here” notice/intake question is needed; absence of a key is not user consent to omit it. |
| `IRS9000`: taxpayer or spouse alternative-media preference. | Cached schema permits up to two optional roots. A confirmed `f9000` request now has one public input, native document, and filled PDF page per person; owner identity comes from the final filer. | A requested preference can accompany the current e-file without changing tax amounts. An unentered preference remains unobservable. | Return-attached intake is implemented for the bounded taxpayer/joint-spouse route; verify wider business rules and ATS acceptance. IRS separate account, phone, and mailed channels remain available. Do not infer a preference from disability or mailing fields. |

The payment rows are **requested electronic withdrawals**, distinct from tax
already paid or owed. Each would need affirmative, transaction-specific bank
authorization; a tax return amount alone is not consent. The two 1042-S rows
are **payer-issued sources** whose copy-transmission rule depends on the
recipient's current-return facts. The optional 4547/9000 rows are **tax-neutral
elections/preferences**, not absent tax calculations. For every separate-
workflow choice, the product still needs a way to surface an entered or known
current-return trigger and preserve the appropriate source-to-1040 join. The
[coverage decision queue](../domains/filing/form1040/ty2025-form1040-coverage-decisions.md#workflow-boundaries-and-still-open-implementation)
records the working boundary. Per-root intake, handoff, current-return effects,
and attachment conditions remain to be implemented and verified; no blanket
root exclusion follows from this matrix.

The new `payment_request` source stores a kind, whole-dollar amount, tax year,
real requested date, unique reference, and confirmed intent for each of the
four payment-root families. It stores no bank credentials and does not change
the Form 1040 calculation. An entered request, including a malformed retained
object, stops both final exporters with an explicit separate-withdrawal
workflow message. Three focused intake/export tests and 12 attachment-coverage
tests passed. Debit consent, liability/election reconciliation, handoff
execution, acknowledgments, and IRS acceptance remain open.

The `amendment_request` source keeps one confirmed intent per affected tax year
with a correction summary and prior-return reference. It does not mutate the
original TY2025 tax graph. A valid or malformed retained request stops both
exporters with a Form 1040-X workflow message. Three amendment tests plus 15
payment/coverage cases passed. The reference is not acceptance proof;
accepted-prior bytes, corrected-year calculation, attachment packet, actual
handoff, and IRS acceptance remain open.

The `benefit_1042s` source keeps issued SSA and RRB copy identities and
reported amounts separate from ordinary benefit calculations. A valid or
malformed retained copy stops both final exporters until recipient status,
taxable benefit, withholding, and required copy attachments are reconciled.
Three source/export plus 12 attachment-coverage tests passed. [2025
Publication 519](https://www.irs.gov/pub/irs-prior/p519--2025.pdf) identifies
the SSA lawful-permanent-resident refund claim's issued copy, green card, and
signed declaration; the [Form 1040-X
instructions](https://www.irs.gov/instructions/i1040x) require changed-return
supporting SSA/RRB-1042-S copies. This intake does not establish those
documents or a positive Form 1040 filing route.
