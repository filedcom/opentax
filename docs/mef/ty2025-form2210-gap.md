# TY2025 Form 2210 mandatory filing paths

## October 8 interactive regular-method PDF checkpoint

Root `267adee80` adds `stageForm2210RegularPdfDocument`. It snapshots public
inputs, ledger facts, prior bytes and canonical template before asynchronous
checks, then derives both native XML and the review PDF through the existing
public/source chain. The canonical TY2025 template is byte-bound to its
retained IRS download. The PDF retains pages 1–2 and interactive fields,
includes both joint names and primary TIN, selects Yes/D/E, leaves shaded cells
blank, follows the line 17/18 alternatives and uses the native exact-rational
whole-dollar line 19. Schedule AI fields/page are removed.

Seven normal typed modules passed **67/0**. Two constructed review documents
have **two standalone IRS2210 XSD passes and four viewed PDF pages**; these
are not full return packets. Each PDF's 42 populated values, all 55 widgets,
canonical field relationships and normal appearances were independently
checked with pypdf 6.14.2. Both pages of both cases were rendered/viewed at
110 dpi: readable names, source amounts, checked boxes, carry balances and
penalties $102/$101, with no observed clipping or stale appearances. A first
65/2 development run failed on missing blank-widget appearance streams before
AI removal; it is retained, and the new helper now generates them first.

All 2,637 runtime paths match the tested manifest. Older full 12,388/0 still
covers only 2,631 baseline paths; newer full phase regression remains pending.
Neither native nor PDF registry invokes these staging APIs. Public guards,
no inserted Form 1040 line 38, `filingReady:false`, source/payment authenticity
and prior-acceptance limitations remain. Future 44's existing balance-date
handler stays unchanged and the new document contract excludes that branch.
Full filing/return reconciliation, accepted source proof, wider methods,
business rules and IRS acceptance remain open. Private proof:
`form2210-regular-pdf-20261008-v1/` (failed development) and `v2/` (final);
see the [execution journal](ty2025-readiness-execution-2026-10-07.md).


## October 8 regular-method native document checkpoint

Root `24ebb65a0` adds `stageForm2210RegularNativeDocument`, an unregistered
native prerequisite for the existing simultaneous D/E source branch. It
re-executes the public-return/payment/prior-byte chain and emits Part I,
both reasons, every represented regular-method Part III cell, and line 19
in TY2025 IRS2210 schema order. Its line 19 rounds the exact rational directly
to whole dollars; $101.499555... remains $101 even though the cent worksheet
rounds to $101.50. The default fixture projects $102 from $101.55.

Seven normal typed modules passed **65/0**, with **one standalone IRS2210
document XSD validation**. All 2,636 runtime paths match the retained test
manifest. The newer full phase batch is pending; the previous 12,388/0
result still covers only the older 2,631-path baseline. No complete return
XSD packet or rendered PDF was added. The document has 39 emitted fields;
the regular schema section has 42, including the three unused A/B/C reasons.

The staging API accepts source facts, not caller-supplied computed lines.
It rejects detached totals, prior-byte changes and nonbeneficial elections.
Its new document contract excludes return-balance rows because future 44's
filing-date evidence is deferred; the existing calculator/date handler stays
unchanged. The XML fragment remains unregistered, no Form 1040 line 38 is
inserted, and both public exporters remain guarded. PDF, full filing/return
reconciliation, source/payment authentication, wider methods and IRS proof
remain open. `filingReady` stays false. Private evidence:
`form2210-regular-native-20261008-v1/`; see the
[execution journal](ty2025-readiness-execution-2026-10-07.md).


## October 8 actual-withholding comparison checkpoint

Integrated `e8f745d93` (candidate `d8b9ee261`) extends the unregistered
payment prerequisite with reviewed 2025 withholding dates. Withholding keeps
its own source kind, must sum exactly to the annual whole-dollar total in
cents, and receives no duplicate default quarterly credit. The comparison
uses the same annual total and non-withholding payments for both methods and
compares exact rational penalties. A new
`stageForm2210BoxEActualWithholdingReturn` derives current identity, tax and
withholding from the public executor, checks prior MFS bytes, and requires
actual withholding to reduce the penalty before staging simultaneous D/E
reasons. The regular E-only entrypoint still requires default withholding.

Seven normal typed modules passed **62/0**, including 100 deterministic
actual-date daily-balance inventories alongside the older 100 default-method
inventories. The early-withholding fixture yields $101.55 versus $139.66 with
default withholding. Late withholding, inventory/annual-total mismatch,
wrong year, duplicate credit and detached public source facts reject.
All four updated runtime paths match the tested candidate; the other 2,631
paths are unchanged. Newer full phase regression remains pending.

Both worksheets' reconciliation flags describe numeric binding only.
`filingReady`, prior acceptance and payment authenticity remain false.
The D/E stage emits neither partial page-1 XML nor PDF fields and inserts no
line 38. Both attachment guards remain active. Full Part III/native/PDF,
source authentication, AI, relief, broader source branches and IRS proof
remain open. Future 44 records the return-balance filing-date gap; its
`paid_on` handler and tests remain unchanged and unqualified for that rule.
No future work, packet, rendered page or schema result is counted here.
Private proof: `form2210-actual-withholding-20261008-v1/`; see the
[execution journal](ty2025-readiness-execution-2026-10-07.md).


## October 8 public-return payment join checkpoint

Integrated `346ee31fe` (candidate `94952473c`) adds
`stageForm2210BoxEPaymentReturn`. The one-call staging chain executes the
actual public return with its entered box-E source, derives MFJ identity from
the normalized general input, checks retained 2024 MFS XML bytes/digests, and
reconciles current Part I tax and withholding to executor-owned Form 1040.
It derives required annual payment and withholding for the dated-payment
worksheet. Those amounts and taxpayer identity cannot be overridden in the
strict payment ledger. The standalone payment calculator still accepts
workpaper operands; this new entrypoint provides their numeric source join.

Seven normal typed modules passed **56/0**. Four new tests cover a complete
source chain; fourteen detached-source/owner/current-tax/prior-byte/override
conflicts; caller mutation during asynchronous verification; and an optional
positive penalty worksheet that leaves Form 1040 line 38 unclaimed. Both
mandatory native/PDF attachment guards still reject the staged public claim.
The new helper snapshots inputs, parsed payment facts and copied byte arrays
before its first await. All 2,633 prior runtime paths remain unchanged; the
two integrated paths match the tested candidate exactly. A newer full phase
regression remains pending.

The worksheet's `requiredAnnualPaymentReconciled` and
`withholdingReconciled` describe **numeric** binding only. Prior IRS origin
and accepted filing, payment authenticity, current required-source bytes,
wider statuses/other taxes/credits, actual-date withholding, AI and exceptions
remain unproved. `filingReady`, `priorAcceptanceVerified` and
`paymentAuthenticityVerified` remain false; no line 38 is inserted. The page-1
native/PDF field projections are still unregistered, with no new full-packet,
rendered-PDF, XSD, business-rule or ATS proof from this check. Main Form 2210
completion stays open.

Private proof: `form2210-finalized-payments-20261008-v1/`; full command,
timestamps, source hashes and review are in the
[execution journal](ty2025-readiness-execution-2026-10-07.md).


## October 8 dated-payment calculation checkpoint

Integrated `f370f4043` (candidate `95bf4bb92`) adds an **unregistered
calculation prerequisite**, `form2210_payments.ts`. It retains reviewed dated
estimated-tax and return-balance payment identities, owners, amounts in cents
and source references; derives regular Part III lines 10–18; applies payments
to the oldest installment first; and records exact principal/day/rate segments
through April 15, 2026. Default withholding is split over due dates. June 16
payments are timely for the June installment while earlier April debt accrues
through the actual payment date. Payment chronology is independent of source
array order. Summed exact rational penalty cents are rounded once for this
staged result; no filed line 19 or final-return penalty is emitted.

Six normal typed modules passed **52/0**, including eight new checks, the
existing page-1/prior-byte chain and public attachment guards. The tests cover
the IRS Example 3 carry/payment split, official rate-period day totals,
prepayments, cent-valued settlement, conflicting sources and an independent
daily-balance oracle over 100 deterministic payment inventories. Private
`form2210-dated-payments-20261008-v2/` retains command, timestamps, logs, source
hashes, review and root integration proof. The earlier 12,388/0 full regression
covers the unchanged 2,631-path baseline; these two later helper/test paths
have focused evidence only and await the newer phase full batch.

Required annual payment and withholding are still reviewed workpaper inputs,
not executor-owned finalized-return joins. Payment records are not bank/IRS
byte authentication. Actual-date withholding, Schedule AI, prior-overpayment
credits, early-filing relief, waiver/disaster sources and wider tax/status
patterns need the existing source and canonical-result work. No public node,
native registry or PDF registry invokes this helper; all existing Form 2210
export guards remain active. This does not close the main form requirement.


## Current boundary

The IRS generally computes an underpayment penalty without a filed Form 2210. A standalone asserted penalty can still flow to Form 1040 line 38. However, a selected Part II filing reason requires Form 2210, and the public input does not yet contain enough verified source facts to calculate and reconcile a filed form. Both MeF and PDF exports therefore reject `f2210` when any of these flags is true: `waiver_requested` (box A or B not distinguished), `partial_waiver_requested` (B), `annualized_method` (C), `actual_withholding_dates_method` (D), or `joint_filing_status_change` (E), or when `box_e_source` is present. The calculation node emits no line 38 amount for those branches, even if an asserted `underpayment_penalty` is supplied.

The [2025 Form 2210](https://www.irs.gov/pub/irs-prior/f2210--2025.pdf) and [instructions](https://www.irs.gov/instructions/i2210) require a full calculation and attachment for boxes B, C, or D. Boxes A and E generally require only page 1 when B/C/D do not also apply. A partial waiver additionally needs a calculated pre-waiver penalty and requested waiver amount. A waiver requires an explanation and evidence. Box C requires Schedule AI and quarterly underpayment calculations.

## Staged box E page-1 calculation

`form2210_box_e.ts` defines a strict, expense-free box E source and calculates Part I lines 1-9 for a narrow case: a 2025 joint return after two distinct full-year 2024 married-filing-separately returns; no included other taxes, refundable credits, Schedule 3 line 11 withholding, or section 965 exclusion; and no 110% prior-year safe-harbor branch. It rejects the under-$1,000, no-prior-tax, and line 8-not-less-than-line 5 cases. It does not calculate a penalty because box E alone permits the IRS to compute it.

The current source's `filed_return_reference` and SHA-256 strings are caller-supplied assertions. The executor does not ingest the filed 2024 return bytes, verify the digests, or extract the line amounts from them. The 2025 tax and withholding values in `box_e_source` are also caller-supplied rather than joined to executor-owned finalized Form 1040 pending data. Therefore the staged calculation is **not** a filing path: there is no native `IRS2210` or PDF descriptor and the both-export guard remains unconditional for `box_e_source`. Do not exempt it based on the presence of a plausible digest or the computed lines.

A standalone finalized-year reconciliation prerequisite now checks that the
staged box-E source agrees with 2025 Form 1040 filing status, line 22 tax and
line 25d withholding, with no filed line 23 other tax, line 25c other
withholding, line 32 refundable credit, or line 38 claimed penalty. It then
recomputes page-1 lines 1-9. This guard is not yet invoked by the executor or
MeF/PDF projection; the prior-year filed-return bytes and finalized-return
ownership binding remain unresolved. The box-E export rejection stays active.
Positive and tamper fixtures are authored for the deferred bulk pass.

The next staged slice verifies both retained 2024 MeF `Return` XML byte streams against their SHA-256 claims and checks their full-year periods, status, taxpayer/spouse SSNs, AGI, tax, and excluded other tax/refundable credits. A one-call staging function then joins the finalized 2025 Form 1040 to Part I lines 1–9 and projects the complete box-E page 1 into native `IRS2210` XML and canonical TY2025 PDF fields. Positive and tamper fixtures are authored but unrun. The IRS origin and acceptance of the archived 2024 returns remain unauthenticated, so these projections are unregistered and the public MeF/PDF guard remains active.

## Source contract needed before activating native/PDF

- Derive Part I lines 1-9 from finalized 2025 Form 1040 tax after credits, specified other taxes and refundable credits, withholding, plus a sourced 2024 return covering 12 months. Reconcile line 38 and any Form 2210 line 19 to the finalized return rather than trusting an isolated amount.
- Capture actual payment transactions with dates and withholding timing. The four quarterly aggregate fields cannot determine Part III late-payment days or box D's actual-withholding method. Build the line 10-18 installment carry, applicable daily rate periods, and line 19 worksheet.
- For box A/B, capture waiver scope, reason, affected dates, pre-waiver penalty, requested waived amount, explanatory statement, and supporting retirement/disability/casualty records. A single `waiver_requested` boolean cannot determine A versus B, and an asserted zero penalty does not prove an approved waiver.
- For box C, capture period-by-period adjusted gross income, deductions, QBI, tax, self-employment tax, other taxes, credits, and any special tax worksheets for Schedule AI lines 1-36. Reconcile its line 27 installments to Part III line 10.
- For box E, capture both filed-year statuses and source 2024 return facts proving the joint-status change and line 8 less than line 5. Then page-1-only native and PDF paths may be possible, with any simultaneous B/C/D reason taking the full-form route.
- Build a canonical Form 2210 line result, then map the TY2025 `IRS2210` XSD and official PDF from that result. Include a waiver explanation binary attachment when applicable. Do not register a token document merely because the XSD marks individual line elements optional.

Focused guard and node cases were written but not run during the build-first phase. Full tests, XSD/business-rule validation, PDF rendering, and ATS acceptance remain pending.
