# TY2025 two written notes and one genuine open account

## Scope and filing obligations

This continues the existing Form7203/8995 current debt-basis source parent. It
does not close the parent or authenticate outside bank, issuer, signature or
accepted-return records. The new specimens retain separate current source
contracts rather than rewriting any reviewed earlier packet.

[IRS Form7203 instructions](https://www.irs.gov/instructions/i7203) require each
written note in its own PartII column and annually net advances/repayments without
written instruments in a separate open-account column. Two written notes plus
one genuine open account fit the canonical three columns. More than three debts
require additional PartII copies, with aggregate totals on the first page only;
that overflow is not implemented or claimed here. The local TY2025v5.4
`IRS7203.xsd` permits repeated `ShareholderDebtBasisGrp` and the complete return
schema validates all three groups for each actual owner/corporation copy.

[Treasury regulation1.1367-2](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol13/pdf/CFR-2025-title26-vol13-sec1-1367-2.pdf)
provides annual open-account netting and individual pro-rata debt reductions.
Separate spouses have separate independently limited Form7203 copies; separate
debts of the same owner/corporation have separate columns in one copy.

## Complete current source and loss calculation

The strict mixed inventory accepts either the preserved one-formal/open tuple
or an ordered formal1/formal2/open tuple. The new route replays each distinct
instrument, lender/borrower, cash funding, principal balance and repayment with
actual source references and bank records. The outer second-note facts must
match its retained source; missing, duplicate, cross-owned or fourth debts are
rejected. No zero-opening note is pooled with another note or transformed into a
fictional written open-account instrument.

New constructed source specimens retain original stock500, current cash
capital1000, formal1 advance2000, issued ordinary loss4000, operating receipts6000
and costs10000. They add a separately retained current formal2 advance1000 with
its own instrument and specific200 or1000 repayment. Each specimen has complete
chronological corporate cash and principal records, actual gross open-account
events, and the distinct reviewed unrelated-bank loan5000. The bank loan supplies
cash for costs but contributes no shareholder basis, operating income or QBI.
The complete bank partition rejects funding rows without a joined owner/source.
These authored contract records are not externally authenticated statements.

Each first-year debt has zero opening face/basis; current formal repayments are
fully basis-supported and produce no repayment gain or restoration. Formal
principal repayments appear on line19 in their own columns. Only annual net
open-account advances appear on line17; gross open repayments remain in the
source and issuedK1 distribution reconciliation. A fully repaid open account
retains its actual column, zero year-end face and blank zero-denominator line25.

After the actual stock1500 capacity, debt loss is independently limited by each
owner's three ending capacities. Exact statutory reductions and remaining basis
are retained as integer numerators and a denominator, using checked BigInt
arithmetic. Whole-dollar filed reductions use largest fractional remainders to
conserve the fixed allowable PartIII total, with stable column order for ties.
That settlement is an implementation projection, not a claim that IRS specifies
that tie order. Source amounts and exact carry fractions remain unchanged.
The preserved earlier two-column settlement policy is not changed.

For capacities1600/800/1400 and debt loss2500, exact reductions are
4000000/3800,2000000/3800,3500000/3800; filed reductions are1053/526/921.
Exact remaining basis is2080000/3800,1040000/3800,1820000/3800; filed basis is
547/274/479. Actual capacity1600/800/2400 gives833/417/1250 filed reductions.
Current carry metadata distinguishes all three faces, filed basis, exact loss
and basis fractions, and the open-account next-year $25,000 classification.
Calculated metadata is not accepted prior-year source proof.

| Packet | Placement | Ending capacities1/2/open | Filed debt loss1/2/open | Allowed loss | Suspended loss | Tax |
|---|---|---|---|---:|---:|---:|
|primary_fractional|Primary single|1600/800/1400|1053/526/921|4000|0|3395|
|primary_limited|Primary single|1600/0/500|1600/0/500|3600|400|3443|
|first_formal_fully_repaid|Primary single|0/800/2000|0/714/1786|4000|0|3395|
|open_fully_repaid|Primary single|2000/800/0|1786/714/0|4000|0|3395|
|all_three_fully_repaid|Primary single|0/0/0|0/0/0|1500|2500|3695|
|spouse_fractional|Spouse MFJ|1600/800/1400|1053/526/921|4000|0|1453|
|spouse_net_advance|Spouse MFJ|1600/800/2400|833/417/1250|4000|0|1453|
|independent_owners|Primary and spouse MFJ, distinct corporations|Primary limited; spouse fractional|Independently as above|3600+4000|400|1093|

The independent family cannot pool spare spouse capacity to allow8000: actual
allowed loss is7600 and basis suspension400. Allowed losses reach ScheduleE,
Schedule1, AGI, actual ordinary tax and negative current QBI/zero8995 deduction.
Only basis-allowed qualified losses enter current QBI loss carry; suspended400
remains separately identified. The tests independently compute tax-table values
and expected filed debt reductions, then reconcile complete XML/PDF copies.

## Terminal proof and retained evidence

- Final typed source gate10/0,35s:
  `/tmp/opentax-form7203-two-notes-source-v3.log`. Eight full public/native/XSD/PDF
  positives plus meaningful source and native/directPDF conflicts. Negatives
  cover missing/duplicate/cross-owned note records, contradictory repayment
  flags/scalars, funding/bank omissions, fictional written open debt, prior basis,
  unsupported fourth debt, omitted/duplicate copies, final AGI and QBI carry.
- Compatibility246/0,2m38s:
  `/tmp/opentax-form7203-two-notes-compat-v1.log`. This is the prior standard gate,
  including legacy source/native/PDF and complete cash-partition negatives.
  Preliminary source7/0 and packet8/0 logs remain diagnostic; final10/0 is the
  current authority.
- New immutable archive8 packets/64files/66pages:
  `/tmp/opentax-form7203-two-notes-open-evidence-terminal-v3`. Each retains public
  source, filer, pending, carry, independent expectations, origins, XML and PDF.
- Every page visually reviewed via Poppler95dpi rendering at
  `/tmp/opentax-form7203-two-notes-open-page-review`; full-size pages additionally
  verify1053/526/921 fractional columns, fully repaid formal/open columns and
  blank zero-denominator ratio, actual spouse identity, and833/417/1250 columns.
  All PDFs have zero AcroForm fields and Widgets. Review manifest SHA256
  `45f0ddea880427c5b106b88f764be1584dd8e767d10bff8b6942c73448bf8aaf`;
  64-file hash manifest SHA256
  `f7031b0835745fc0d2ea98d224c034507540a9f19f4960f93c48a820a3660dea`.
- Actual retained new8/66 replay:
  `/tmp/opentax-form7203-two-notes-open-retained-v3-replay-v1/report.json`;
  log `/tmp/opentax-form7203-two-notes-held-v1.log`. Exact whole pending, carry,
  origins, source and PDF; completeXSD and XML differing only ReturnTs.
- Actual retained prior32/288 replay:
  `/tmp/opentax-form7203-mixed-debt-current-main-replay.wQjNyB`, five independent
  reports for mixed8/66, open8/70, multi6/66, spouse6/54 and current formal4/32;
  log `/tmp/opentax-form7203-two-notes-prior32-raw-v1.log`. The same exact checks
  pass with original bytes untouched. These are retained input replays, not
  regenerated issuer sources. No unqualified older stock-only archive claim is
  added beyond the existing historical pending qualification.
- Combined40/354 report:
  `/tmp/opentax-form7203-two-notes-open-page-review/retained-summary.json`, SHA256
  `03fdaeeeb3c588d7c7a258cc9d19f150706b8a24c126e47ca0c6f4d99c9f813e`.
- Standard final256-case command:
  `/tmp/opentax-form7203-two-notes-open-final-gate-command.txt`. The executed
  terminal evidence is separate10/0 plus246/0. Optional new specimen output is
  `FORM7203_TWO_NOTES_OPEN_EVIDENCE_DIR`; it is not used for immutable replay.
- Actual raw40/354 wrapper:
  `zsh /tmp/opentax-form7203-two-notes-open-raw-replay-command.sh /ABS/ISOLATED_CHECKOUT`.
  It uses retained JSON archives and private cache
  `/tmp/opentax-form7203-two-notes-open-pdf-cache-final`, never fixture factories,
  and writes a unique new tmp output. Generic replayer is
  `/tmp/opentax-form7203-spouse-retained-replay.ts`; original formal4 use
  `/tmp/opentax-form7203-owned-debt-retained-replay.ts`.

## Remaining parent boundaries

More than three debt columns/additional PartII copies, additional written-note
inventory, mixed shared-issuer funding beyond the proved independent-corporation
family, nonzero prior reduced basis/restoration/gain, actual prior-history
authentication, current interest payments/other terms and broader K1 source
branches remain open. Existing one-formal/open, standalone formal/open,
shared-issuer and multicorporation routes are preserved. No full parent closure
or outside acceptance claim follows from these constructed current contracts.
