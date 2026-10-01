# TY2025 core source ownership and duplicate audit

This is a static source-to-return audit for the open core-source board item. It
does not establish issued-document authenticity or IRS acceptance. The source
nodes and export preflights must be assessed together: a calculated amount can
be present even when the final return lacks enough information to prove whose
document supplied it.

## Bounded corrections staged in this batch

- `mef/forms/w2.ts` now rejects an explicit W-2 employee SSN outside the
  taxpayer or joint spouse. A spouse SSN on a separate return also rejects.
  Previously the exporter put an unrelated SSN beside the taxpayer's name.
  A matching joint spouse still prints the spouse's name and SSN. Missing
  `employee_ssn` still defaults to the primary filer; requiring the issued W-2
  owner for every wage statement needs a direct source-contract change and a
  fixture migration.
- `nodes/inputs/f1099int/index.ts` now rejects a repeated issued copy when
  source reference, payer TIN, and account number all match. Different
  accounts remain distinct even when the payer and packet reference match.
  Rows without all three source identifiers are still ambiguous; the node
  does not infer identity from amount or payer name alone.
- Form 1099-R now replays an explicit issued recipient SSN against the selected
  taxpayer or joint spouse at native and full-return PDF preflight. A
  spouse-designated 1099-R on a separate return rejects. This prevents an IRA,
  pension, or withholding amount from being filed under another owner's name
  when the source includes its recipient. Missing issued recipient SSNs still
  rely on the `ts` classification and remain an authentication gap.
- Form 1099-DIV now rejects the same identified payer-issued copy and box
  amounts twice before Schedule B, Form 1040 dividends, capital gain, foreign
  tax, or line 25b withholding can accumulate. The check uses payer TIN,
  per-copy source reference, and all payer box values, so a changed nominee
  allocation cannot make the same copy appear distinct. Two separately
  identified copies remain valid. Missing identifiers and changed/corrected
  box values require a separate issuer-copy review.
- Form 1099-OID now rejects an exact repeated issued copy with the same source
  reference, payer TIN, and payer boxes before Schedule B interest, Schedule 1
  early-withdrawal deduction, Form 1040 line 25b withholding, or AMT deposits
  can accumulate. A different nominee adjustment does not create a second
  issuer copy; a distinct source reference can represent another copy.
- Form 1099-G now rejects an exact repeated copy identified by source
  reference, payer TIN, recipient TIN, account number, and payer boxes before
  Schedule 1 income, Schedule F deposits, AMT refund adjustment, or Form 1040
  line 25b withholding can accumulate. A different recipient-entered repayment
  or prior-year tax-benefit workpaper cannot turn one issued copy into two.
- Form 1099-MISC now rejects an exact repeated payer/recipient/account copy
  with the same payer boxes before Schedule 1/C/E/F income, Schedule 2 tax,
  or Form 1040 line 25b withholding accumulates. The payer and recipient TINs
  are required source fields; the guard applies when an account number is
  supplied and keeps separately numbered accounts or form copies distinct.
  A different tax-routing or review description does not make the same issued
  boxes a second payment.

## Source inventory and remaining joins

| Source family | Current evidence found in source contract | Outstanding ownership or duplicate question |
| --- | --- | --- |
| W-2, W-2G | W-2 employee SSN is optional; W-2G has payer-copy and winner identity checks. | Require an explicit issued W-2 recipient and reconcile all wage/withholding rows to the same final owner. Duplicate W-2 copies need employer control/correction identity. |
| 1099-INT/DIV/OID/B | INT/OID have optional payer and source references; DIV has optional source reference; B capital dispositions use transaction facts. INT, DIV, and OID now reject bounded exact identified-copy repeats. | Individual recipient TIN is absent from these base contracts. Prove taxpayer/spouse ownership and de-duplicate corrected or repeated payer/account/transaction reports across Schedule B/D and Form 1040. The OID guard cannot adjudicate corrected boxes or absent per-copy references. |
| 1099-R/G | R has optional recipient SSN and source reference; G has optional recipient TIN and source reference. Explicit 1099-R recipient SSNs now reconcile at native/PDF export; G rejects a bounded exact identified-copy repeat. | Require issued recipient identity for each positive return route and reconcile multiple corrected copies, withholding, and final income once. The G guard needs all four copy identifiers and cannot adjudicate a corrected copy with changed payer boxes. |
| 1099-NEC/K/MISC/PATR | NEC and K/MISC have recipient and business-source fields for bounded routes; PATR does not expose a universal recipient identity. MISC now rejects an exact repeated copy when its account number is present. | Confirm recipient against each Schedule C/F/property owner and reject overlap when one payment appears on more than one payer form or gross-receipts source. Cash/accrual timing, missing account numbers, and corrected payer copies with changed boxes remain open. |
| 1099-SA, 1098, 1095-A, 3921 | HSA owner/medical-use paths, 1098 recipient/source facts, 1095-A policy recipient, and 3921 document references exist in bounded paths. | Reconcile every owner and correction/vintage across the final 1040 and any paired forms. 3921's unique reference is local to its input collection; it does not prove option-event ownership across W-2 and 1099-B. |
| Partnership, S corporation, and trust K-1 | Recipient TIN or beneficiary SSN and issuer/source identifiers exist for selected code-specific routes. | Apply owner and duplicate checks across all retained K-1 codes, revisions, and passive/portfolio destinations, including spouse attribution on joint returns. |
| Foreign employer and reviewed prior returns | Specialized routes retain reviewed workpapers/source references. | A common employer/recipient identity and prior-return-vintage ledger is not enforced across all wage, credit, carryover, and amended-return consumers. |

No general cross-form duplicate key can safely be made from payer name and
amount. A future direct source contract needs issued-document identity,
recipient TIN, account or transaction identity, correction status, and source
bytes where the return uses those facts. Until then, the unsupported or
ambiguous combinations above remain open.
