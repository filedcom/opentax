# TY2026 Forms 1099-MISC/NEC source and Schedule 1-A graph

Snapshot: September 27, 2026. The IRS final December 2026
[Form 1099-MISC](corpus/authorities/f1099msc--2026.pdf),
[Form 1099-NEC](corpus/authorities/f1099nec--2026.pdf) and
[combined instructions](corpus/authorities/i1099mec--2026.pdf) are pinned.
Their SHA-256 hashes are `38051fe1cdce8fac5183a7e7b182b1a0de590dcfec3e4f66a156eba3f98943fa`,
`68a8f00078be6dd6a4912cc4209df317b31840d5fe19560222d39df9f2f7ff49`
and `883fb800e5100ff74a37fb0427d0c16c14031a2421a058254f71c66f8c03087e`.
These are **recipient source forms** for calendar-2026 payments, not
automatically filed Form 1040 attachments. Resolve any current MeF
source-document rule separately.

## Changed boxes and source reconciliation

| Form | 2026 amount/detail boxes | TY2026 meaning and destination |
| --- | --- | --- |
| 1099-NEC | 1a nonemployee compensation; **1b cash tips**, **1c Treasury tipped occupation code**, **1d qualified overtime** | Boxes 1b and 1d are **included in 1a**. Reconcile 1a to one existing business/farm activity or, when worker-classification facts support it, Form 8919 wages. Use 1b/1c for the qualified-tip table and 1d for overtime in draft [Schedule 1-A](corpus/draft/f1040s1a.pdf). Keep the payer TIN and business identity. Never add 1b/1d as separate gross income. |
| 1099-NEC | 2 direct-sales indicator; 3 excess golden parachute; 4 federal withholding | Preserve the direct-sales answer; reconcile box 3 with its underlying payment and 2026 Schedule 2 **line 13k** tax, and box 4 to 1040 line 25b. The box 3 amount may also be income, but is not necessarily a new Schedule 1 line 8z receipt. |
| 1099-MISC | 1 rents; 2 royalties; 3 other income; 5 fishing-boat proceeds; 6 medical payments; 8 substitute payments; 9 crop insurance; 10 attorney proceeds; 11 fish purchased; 12 §409A deferrals; 15 nonqualified deferred compensation | Route each payment by property, business, farm, asset or other-income character, retaining payer and activity IDs. Reconcile crop insurance to the farm year/deferral election, royalties to property, and any 409A amount to the correct current income/additional-tax branch. Do not treat an attorney's gross proceeds as automatically all taxable to the recipient. |
| 1099-MISC | **13a cash tips, 13b occupation code, 14 qualified overtime** | Tips and overtime are **included in box 3** per the 2026 instructions. Feed payer TIN, cash-tip amount/code and overtime amount to Schedule 1-A's separate qualified-tip and overtime tables after source/business eligibility checks. Do not add these detail boxes to box 3 income again. |
| Both | Federal withholding and state boxes | Route federal withholding to 1040 line 25b once; preserve state information for state-return work. Corrected/void forms replace or adjust the source record rather than create duplicate income. |

The [1099-K contract](FORM1099K-GRAPH.md) owns payment-network gross
reconciliation. Match each NEC/MISC payment to the underlying invoice,
platform transaction and actual receipt; if also represented in box 1a of
1099-K, it remains **one** taxable receipt. Independently reported cash
and undocumented business receipts still enter the activity ledger.
The 2026 Schedule 1-A qualified-tip/qualified-overtime calculation uses
these source details together with W-2 and 1099-K, then applies its own
occupation, payment, income, filing-status and other limitations. The source
form alone does not establish eligibility.

## Current implementation boundary

The shared [`f1099nec` node](../../forms/f1040/nodes/inputs/f1099nec/index.ts)
uses an old `box1_nec` field, has no 1b/1c/1d inputs, and creates a new
Schedule C business for each form using payer name, code `999999`, cash
method and material participation. That can double count an existing
business or 1099-K receipt and invents taxpayer facts. Its box 3 route uses
the old Schedule 2 line 17k key, while the 2026 draft prints golden
parachute tax on **13k**. Its Form 8919 alternative needs the reason-code
and wage-base work in the [8919 plan](FORM4137-8919-GRAPH.md).

The shared [`f1099m` node](../../forms/f1040/nodes/inputs/f1099m/index.ts)
has neither 13a/13b/14 nor the 2026 Schedule 1-A source route. It
aggregates rents, royalties and business amounts without preserving a
property/activity owner in all outputs. Its TY2025 `box15_nqdc` output
uses an old Schedule 2 line 17h key; 2026 Schedule 2 prints §409A income
tax on **line 13h**. Review all old Schedule 1/2 keys against the pinned
2026 drafts before registering either shared node.

## Build and acceptance

1. Ingest payer/recipient TIN, corrected status, box values and linked
   transaction/activity IDs. Reconcile overlap among NEC, MISC and K plus
   W-2/worker-status evidence before calculation.
2. Send net source facts to the existing Schedule C/E/F/other-income or
   Form 8919 route. Carry 1b/13a tips, 1c/13b TTOC and 1d/14 overtime as
   **included components** into Schedule 1-A with one owner per payment.
   Reconcile box 3 golden parachute and MISC box 15 to their 2026
   Schedule 2 lines separately from underlying income.
3. Determine whether the active 2026 MeF return carries the source
   information return, a derived statement or only downstream 1040 forms.
   Build any required attachment and PDF route from that decision, not
   merely from a TY2025 node's presence.
4. Test one NEC within an existing Schedule C business, duplicate NEC/K
   payment, farm and misclassified-employee alternatives, MISC rent/royalty
   by property, crop-insurance deferral, box 3/15 additional tax, corrected
   withholding, qualified and nonqualified tips, and overtime also included
   in gross. Compare a complete 2026 return and TY2025 regressions.
