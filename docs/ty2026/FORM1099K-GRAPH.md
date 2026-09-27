# TY2026 Form 1099-K intake and income reconciliation

Snapshot: September 27, 2026. The IRS [December 2026 Form 1099-K](corpus/authorities/f1099k--2026.pdf)
and [instructions](corpus/authorities/i1099k--2026.pdf) are pinned at SHA-256
`fa3a2b659f7ee13d59ea6c66ad992a5ab55afa0060db275ad1ee122478189b89`
and `d7f48a804e26d83b5419aa51bb76fee7b129a388960c01d82e83e255337ea699`.
They are the calendar-2026 recipient source. The pinned [2026 Schedule 1
draft](corpus/draft/f1040s1.pdf) has a header for 1099-K amounts received
in error or for personal items sold at a loss. The [Schedule 1-A draft](corpus/draft/f1040s1a.pdf)
uses Form 1099-K boxes **1c** and **1d** in its qualified-tip table.

## Distinguish reporting from tax

- A TPSO's **issuer reporting** test is box 1a gross **over $20,000** and
  **more than 200** transactions; payment-card transactions have no analogous
  de minimis threshold. A payer can issue a form below its required threshold.
  Neither threshold decides whether the recipient's underlying sale or
  service is taxable. In particular, do not drop $20,000-or-less gross
  amounts from the return's income classification.
- Box 1a is gross payment volume, before fees, refunds, shipping, credits
  and similar adjustments. Box 1b (card not present) and new box 1c (cash
  tips) are subsets of 1a; do not add them to box 1a. Box 1d is the tipped
  occupation code. Boxes 5a–5l are monthly gross detail. Box 4 is federal
  backup withholding and belongs in the 1099-withholding source for 1040
  line 25b even if none of the gross amount is taxable. Preserve state
  withholding separately.
- Use a recipient/payee, payer, account, payment-network and transaction
  ledger. Match receipts to invoices, sales, rental activity, asset lots and
  other Forms 1099 (especially NEC/MISC) so that the same transaction
  contributes to **one** income route. Separate personal transfers, gifts,
  reimbursements and erroneous reports from sales; separate a personal item
  sold at a loss from one sold at a gain. Reconcile box 1a to classified
  gross, fees/refunds and unmatched items, retaining an explanation for any
  gap. A missing 1099-K does not imply missing taxable income.

| Receipt class | 2026 destination and required facts |
| --- | --- |
| Error or personal item sold at a loss | Use the 2026 Schedule 1 header amount when that method is chosen; do not also report the same item through the alternative Form 8949 offset route. No deductible personal loss. Preserve amount, basis and correction evidence. |
| Personal item sold at a gain | Lot-level proceeds and basis to Form 8949/Schedule D; report gain without a loss from other personal items offsetting it. |
| Business goods or services | Match to the correct Schedule C business gross receipts and its returns/allowances, cost of goods and platform fees. A platform name is not a new Schedule C business or an industry code. |
| Rental, farm, pass-through or other receipts | Route by the underlying activity to Schedule E, F or another supported source. A single “other income” choice is insufficient. |
| Box 1c cash tips | Preserve payer TIN, box 1c amount, box 1d occupation code, qualifying business/activity and any amounts also reported on NEC/MISC/W-2. Feed eligible tip facts to the 2026 Schedule 1-A table and its income/SE tax source once, subject to that schedule's qualification and limit rules. |

## Current implementation boundary

The shared [`f1099k` node](../../forms/f1040/nodes/inputs/f1099k/index.ts)
has a **$5,000 TY2025** gross cutoff and routes box 1a only above that
cutoff. This incorrectly uses an issuer-reporting threshold as an income
gate, regardless of the threshold's year. Its manual `for_routing` chooses
only Schedule C or Schedule 1 line 8z, creates a new Schedule C activity with
code `999999`, and cannot reconcile transactions with another 1099 or an
existing business. It lacks 2026 boxes 1c/1d, Schedule 1's header, personal
gain/loss and Schedule 1-A routes. The monthly difference check is a
no-op warning. Its box 4 withholding edge is useful but must be matched
to the filed 2026 1040 line 25b and current MeF source rules. No TY2025
1099-K PDF/MeF serializer appears in the inventories; determine whether
the current 1040 MeF accepts a source document or only the derived return
lines before adding an attachment.

## Build and acceptance

1. Create transaction classifications keyed to source 1099-K payer/account;
   reconcile all box 1a gross, monthly amounts, returns/fees, duplicated
   1099-NEC/MISC reports and unmatched items. Derive income and withholding
   from that ledger, not an arbitrary platform-level route or reporting
   threshold.
2. Add the 2026 Schedule 1 header, Form 8949/D and activity-specific C/E/F
   destinations, plus Schedule 1-A boxes 1c/1d input and its separate
   qualified-tip limit. Keep the source's recipient copy and correction
   history available for validation.
3. Map the actual 2026 MeF source/attachment rule if any, and reconcile
   1040 lines 11, 15/16 and 25b with the corresponding income, tip-deduction
   and withholding routes. The 1099-K PDF is a source document, not itself
   evidence that a 1040 return attachment was filed.
4. Test a below-threshold taxable business receipt, a non-taxable transfer,
   an erroneous form, personal loss and gain, mixed C/E/F receipts, platform
   fees/refunds, duplicate NEC/K payment, box 4 withholding with no taxable
   amount, and box 1c/1d qualified and nonqualified tips. Include a
   source-backed complete return and TY2025 regression.
