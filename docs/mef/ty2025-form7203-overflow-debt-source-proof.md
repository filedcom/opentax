# TY2025 current written-note/open-account Part II overflow

## Instructions and source scope

This continues the frozen Form7203/8995 debt-basis source parent. The complete
board was read and learnings privately compacted before implementation in the
isolated checkout based on0cf6e27da. Main, the board and original packet archives
were not edited.

[IRS Form7203 instructions](https://www.irs.gov/instructions/i7203) require each
written instrument in a separate debt column, annually net open advances and
repayments, and additional copies of PartII when there are more than three loans.
Aggregate totals appear only on the original copy; individual debt columns
continue on the additional PartII copies. PartI and PartIII are not repeated.
Separate actual spouses require separate owner Forms7203.

The local TY2025v5.4 IRS7203 schema permits unbounded
`ShareholderDebtBasisGrp` within one native owner/corporation document. Thus a
four- or seven-debt owner emits one native Form7203, with four or seven individual
groups. The PDF emits the original canonical two-page form and the necessary
additional two-page PartII sections, not fictional additional shareholders.
PDF page-origin `formCopy` denotes the physical canonical section copy. Owner
SSN/EIN and source references remain bound independently of that page counter.

Only the strict existing current formal/open contract is extended. Its ordered
complete source inventory requires all separate written notes followed by one
genuine open account. The outer `additional_formal_notes` must match every
retained written-note record, instrument, funding, current principal ledger,
specific repayment and bank source. The old one-/two-note/open routes remain
unchanged. Additional notes cannot enter the unrelated legacy scalar or prior
reduced-debt route.

## Current records, independent limitation and carry

New authored source-contract specimens preserve original stock500, cash
capital1000, formal1 advance2000, formal2 advance1000, ordinary loss4000,
receipts6000, paid costs10000 and the separately traced unrelated bank loan5000.
They construct distinct additional current written-note records and complete
chronological bank/principal entries; no original reviewed source is rewritten.
The bank5000 supplies corporate cash, never shareholder basis, income or QBI.
The complete bank partition rejects omitted, duplicate, unowned or unjoined debt
funding. Constructed records prove calculation and reconciliation of this source
contract, not external bank, issuer, signature or accepted-return authenticity.

Each debt begins with zero face/basis. Formal repayments are specific to their
own notes. Current full-basis repayments produce zero gain/restoration; annual
open-account net advances remain distinct from gross source repayments. Fully
repaid debts retain their columns and zero year-end balances. Zero-denominator
open line25 remains blank.

[Regulation1.1367-2](https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol13/pdf/CFR-2025-title26-vol13-sec1-1367-2.pdf)
governs the pro-rata reductions and annual open netting. Each owner's debt loss
is limited after the actual stock1500 capacity. Checked BigInt numerators retain
exact individual loss and remaining-basis fractions. The filed whole-dollar
projection uses largest fractional remainders to conserve the independently
limited total, with stable column order for ties. That is an implementation
settlement, not an assertion that IRS prescribes a particular tie order. The
prior two-/three-column policies and archived values are preserved.

For four capacities1600/800/600/1400 and debt loss2500, the exact loss numerators
are4000000/2000000/1500000/3500000 with denominator4400. Filed losses are
909/455/341/795, totaling2500. Seven capacities
1600/800/600/400/250/150/1400 use denominator5200 and file
769/385/289/192/120/72/673, again2500. Raw rational remaining basis is retained
separately from the filed dollar balances and each actual face amount. Current
carry keys use the individual note/account source identifier and owner/EIN,
preventing pooling or loss of a fourth/seventh debt. The open account's existing
year-end $25,000 next-year classification is retained. None of this calculated
metadata substitutes for accepted prior-year records.

| Packet | Ending capacities in source order | Filed debt reductions | Allowed loss | Basis suspension | Tax | Pages |
|---|---|---|---:|---:|---:|---:|
|four_fractional|1600/800/600/1400|909/455/341/795|4000|0|3395|10|
|four_limited|1600/0/0/500|1600/0/0/500|3600|400|3443|10|
|four_fully_repaid|0/0/0/0|0/0/0/0|1500|2500|3695|10|
|seven_fractional|1600/800/600/400/250/150/1400|769/385/289/192/120/72/673|4000|0|3395|12|
|spouse_four_net|1600/800/600/2400|741/370/278/1111|4000|0|1453|10|
|independent_owners|Primary four_limited; spouse seven_fractional|Independently as above|3600+4000|400|1093|16|

Independent spouses cannot pool surplus spouse capacity to allow8000: the
actual joint loss is7600 and basis suspension400. Only the allowed qualified
loss enters current QBI loss carry; suspended400 remains separately identified.
ScheduleE/Schedule1, AGI, tax-table values, zero8995 deduction and1040 totals are
independently checked. One native owner document contains all debts and global
totals; PartI/III and corresponding aggregate PartII lines appear once in the
original PDF copy. Continuations contain only the actual individual debt rows,
with blank totals and actual owner/corporation identity.

The PDF continuation uses the canonical current form's PartII sections through
explicit bounding-box embedding. It retains SectionA through20 on the first
continuation page and SectionsB/C through34 on the second, excluding unrelated
PartI/III. Metadata identifies the global inventory position and retained note
references; no manually supplied totals or fake shareholder copies are accepted.

## Terminal evidence

- Typed source8/0,41s:
  `/tmp/opentax-form7203-overflow-source-v2.log`. Six complete public/native/full
  XSD/PDF positives and source/native/directPDF negative groups. Earlier8/0
  `/tmp/opentax-form7203-overflow-source-v1.log` is preserved as preliminary,
  before the immutable final archive was written.
- Compatibility256/0,3m48s:
  `/tmp/opentax-form7203-overflow-compat-v1.log`; retained positive EIC/source
  ordering1/0,23s: `/tmp/opentax-form7203-overflow-eic-compat-v1.log`.
  The exact standard265-case command combines these with the new8; the executed
  terminal gates are separate256/0,1/0 and8/0.
- Negatives reject missing outer/source notes, duplicated instruments,
  cross-owned lenders, prior basis, contradictory repayment/funding, phantom bank
  rows, misplaced open records, missing/duplicate owner copies and altered final
  AGI/QBI carry. Existing complete synchronized phantom-funding tests remain in
  the compatibility gate.
- Six immutable packets/48files/68pages:
  `/tmp/opentax-form7203-overflow-debt-evidence-terminal-v2`. Each retains exact
  public source/filer, pending, carry, independent expectations, origins, XML and
  static PDF. The complete return validates against local TY2025v5.4
  `IndividualIncomeTax/Ind1040/Return1040.xsd`; this is structural validation,
  not IRS business-rule/ATS acceptance.
- Every new page rendered by Poppler95dpi and visually reviewed at
  `/tmp/opentax-form7203-overflow-debt-page-review`. Full-size inspections verify
  four-debt open continuation with blank totals, all fully repaid third-note
  columns, seven-debt additional formal repayment fields192/120/72 and final
  open673, original global6150/950/5200/2500/2700 totals, and actual Casey identity.
  All PDFs have zero AcroForm fields and Widgets. Review SHA256
  `9bf84bfe8af44eaac52814834f0210ed733132aa81adcc697998590bfbdedac2`;
  48-file hash manifest SHA256
  `0072452fe5c84f731eb7e0ccfb4dffa69898d657e9ba893573026f0c9c4a28be`.
- Native individual/group and global amount audit:
  `/tmp/opentax-form7203-overflow-debt-page-review/native-column-audit.json`,
  SHA256 `49ebfc3212730ca9cca6409dc6c0233d31d48aacc6ce96cda8d9a18a30d5026d`.
  Seven actual owner documents contain34 individual debt groups. Every native
  individual advance/repayment/face/loss/basis and global total matches the
  independently checked paper projection.
- Actual new6/68 retained replay:
  `/tmp/opentax-form7203-overflow-debt-retained-v2-replay-v1/report.json`;
  log `/tmp/opentax-form7203-overflow-new6-held-v1.log`. Prior40/354 actual retained
  replay `/tmp/opentax-form7203-two-notes-open-current-main-replay.42IMXU`, six
  reports; log `/tmp/opentax-form7203-overflow-prior40-raw-v1.log`. Both preserve
  original public source/filer, whole pending/carry/origins/PDF, fullXSD and native
  XML except ReturnTs. Replayers read retained JSON, never regenerate sources.
- Combined46/422 retained summary:
  `/tmp/opentax-form7203-overflow-debt-page-review/retained-summary.json`, SHA256
  `355cd5a5096a90d3354ef326da00158fa24a42bf9341ecf6c6558f5f02f2d44b`.
  This preserves the current40 authority and does not erase the older stock-only
  whole-pending qualifications documented in earlier proofs.
- Exact final standard command:
  `/tmp/opentax-form7203-overflow-debt-final-gate-command.txt`. Optional new
  specimen output: `FORM7203_OVERFLOW_DEBT_EVIDENCE_DIR`. Immutable replay uses
  `zsh /tmp/opentax-form7203-overflow-debt-raw-replay-command.sh /ABS/ISOLATED_CHECKOUT`,
  generic retained replayer `/tmp/opentax-form7203-spouse-retained-replay.ts`,
  original formal4 replayer `/tmp/opentax-form7203-owned-debt-retained-replay.ts`,
  and external private cache `/tmp/opentax-form7203-overflow-debt-pdf-cache-final`.

## Remaining parent boundaries

This proves current mixed written/open inventories of four and seven debts,
with full repayment and independent spouse source limits. It does not claim
nonzero prior reduced-basis/restoration/gain, accepted history authentication,
current interest payments/other terms, wider shared-corporation mixed funding,
formal-only inventory beyond the existing supported contract, or other K1
branches. Those existing requirements remain open; no blanket parent closure
or external authenticity follows from these authored current records.
