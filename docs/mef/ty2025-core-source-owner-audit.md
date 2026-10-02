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
  when the source includes its recipient. Positive gross, taxable, or withheld
  amounts now require that recipient SSN at final native/PDF export; the graph
  still permits calculation-only rows without it. Zero rows remain permitted.
  Recipient copies can truncate the TIN, so this contract does not infer a
  complete SSN from a last-four display. Source-byte authenticity remains open.
- Form 1099-R now rejects an exact repeat with the same source reference, payer
  EIN, recipient SSN, account number, and all payer-reported box values before
  income or withholding accumulates. Native export repeats this check on
  retained rows. A distinct account stays valid; absent identifiers and a
  corrected copy with changed boxes need issuer-copy lineage review. Focused
  source/native fixtures are authored for the deferred bulk gate.
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
- Positive Form 1099-NEC box 4 withholding now requires the issued recipient
  SSN at the input boundary. Native and PDF full-return export match that SSN
  to the taxpayer or joint spouse before the withholding can support Form 1040
  line 25b. An unrelated recipient or a spouse on a separate return rejects.
  This does not identify duplicate NEC copies or authenticate payer bytes.
- Form 1099-B calculation accepts an ownerless source row, including the
  existing benchmark cases. Final native and PDF export require an issued
  recipient SSN that matches the taxpayer or joint spouse before the sale can
  be filed through Form 8949, Schedule D, and Form 1040. A repeated row with the
  same broker TIN, recipient, account, source document, and transaction ID
  rejects before its capital gain can accumulate twice. Different identified
  transactions on one broker statement remain distinct. Broker statement
  authenticity, corrections, and missing transaction IDs remain open.
- Form 1099-PATR calculation retains box 4 withholding without an issued
  recipient TIN. Native and PDF final export require that recipient to be the
  taxpayer or joint spouse before the withholding can reach Form 1040 line
  25b. PATR rows without positive box 4 keep their existing farm and
  cooperative-QBI treatment. Issued-copy revision and source-byte evidence
  are not present in this contract.

## Source inventory and remaining joins

| Source family | Current evidence found in source contract | Outstanding ownership or duplicate question |
| --- | --- | --- |
| W-2, W-2G | W-2 employee SSN is optional; W-2G has payer-copy and winner identity checks. | Require an explicit issued W-2 recipient and reconcile all wage/withholding rows to the same final owner. Duplicate W-2 copies need employer control/correction identity. |
| 1099-INT/DIV/OID/B | INT/OID have optional payer and source references; DIV has optional source reference; B can calculate without recipient SSN but final export requires it, and optionally retains broker/account/document/transaction identity. INT, DIV, and OID reject bounded exact identified-copy repeats; B rejects repeated identified transactions and missing or wrong filing recipients. | Recipient TIN remains absent from INT/DIV/OID base contracts. Prove taxpayer/spouse ownership and de-duplicate corrected or repeated payer/account reports across Schedule B and Form 1040. For B, broker source bytes, corrections, and rows missing complete issued transaction identity remain open. |
| 1099-R/G | R has optional recipient SSN, account, and source reference; G has optional recipient TIN and source reference. Positive 1099-R copies require and reconcile a full recipient SSN at native/PDF export; exact identified 1099-R and 1099-G copies reject before accumulation. | Reconcile multiple corrected copies, withholding, and final income once. The exact-repeat guards cannot adjudicate corrected copies with changed payer boxes or missing identity; truncated recipient-copy TINs need a separately reviewed source contract. |
| 1099-NEC/K/MISC/PATR | NEC and K/MISC have recipient and business-source fields for bounded routes; PATR has optional recipient TIN. NEC and PATR positive box 4 withholding now require an issued recipient matched at full-return export; MISC rejects an exact repeated copy when its account number is present. | Confirm recipient against each Schedule C/F/property owner and reject overlap when one payment appears on more than one payer form or gross-receipts source. Cash/accrual timing, missing account numbers, and corrected payer copies with changed boxes remain open. PATR farm-income rows without box 4 still lack a universal owner join. |
| 1099-SA, 1098, 1095-A, 3921 | Form 8889 positive HSA distributions already require distinct Form 1099-SA source references, tax-year and recipient matches to the HSA owner, and exact box 1 totals; paired owners cannot reuse references. Other bounded owner/medical-use paths, 1098 recipient/source facts, 1095-A policy recipient, and 3921 document references exist. | The Form 1099-SA records do not retain issuer-copy bytes, issuer identity, or correction lineage, so distinct references cannot prove two physical copies or supersession. Reconcile every other owner and correction/vintage across the final 1040. 3921's unique reference is local to its input collection; it does not prove option-event ownership across W-2 and 1099-B. |
| Partnership, S corporation, and trust K-1 | Recipient TIN or beneficiary SSN and issuer/source identifiers exist for selected code-specific routes. | Apply owner and duplicate checks across all retained K-1 codes, revisions, and passive/portfolio destinations, including spouse attribution on joint returns. |
| Foreign employer and reviewed prior returns | Specialized routes retain reviewed workpapers/source references. | A common employer/recipient identity and prior-return-vintage ledger is not enforced across all wage, credit, carryover, and amended-return consumers. |

No general cross-form duplicate key can safely be made from payer name and
amount. A future direct source contract needs issued-document identity,
recipient TIN, account or transaction identity, correction status, and source
bytes where the return uses those facts. Until then, the unsupported or
ambiguous combinations above remain open.

For joint 2025 exports, retained W-2 box 1 wages now need an identified
employee SSN even if box 2 withholding is zero. The shared final MeF/PDF
preflight rejects an absent or non-filer recipient rather than letting the
native W-2 serializer assign an owner from the header. The focused source
guard and both-export rejection cases pass. Single-filer optional W-2 SSNs,
issued W-2 bytes, corrected copies, and broader duplicate handling remain
open.

## Existing 1099-B source fixture inventory

The unit-test `minimalItem` and full-return owner fixtures use the explicitly
known test taxpayer SSN `111223333`; the joint spouse positive case uses
`222334444`. Six single-field schema-negative rows also retain the known test
taxpayer SSN so the named missing field remains their only omission. The
ownerless benchmark calculation and missing-recipient filing rejection
intentionally omit that field; the wrong-recipient case retains its mismatch.
The Form 8886 attachment-coverage fixture is a raw negative disposition with
no filer or recipient and never asserts a valid filed 1099-B.

There are 60 `f1099b` source rows in 25 TY2025 benchmark `input.json` files.
None of those inputs identifies the filed taxpayer or spouse by SSN. SSNs in
some benchmark files identify dependents, not a sale owner. These benchmark
rows can calculate pending gains but cannot be filed through native or PDF
export until an issued broker document supplies a matching recipient. No CLI
sample provides a separate concrete `f1099b` input, and the Form 8949,
Schedule D, Form 6781, and 2026 references are derived or distinct sources.
