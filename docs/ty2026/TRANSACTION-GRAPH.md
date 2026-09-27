# TY2026 capital transaction graph contract

Source snapshot: the pinned [2026 draft Form 8949](corpus/draft/f8949.pdf)
(SHA-256 `891d869c87ffe9c6d7f79079d19ebf4ac0afa7257f6374cd95936e44a7079ffe`),
final [2026 Form 1099-B](corpus/authorities/f1099b--2026.pdf) and
[instructions](corpus/authorities/i1099b--2026.pdf), and final
[2026 Form 1099-DA](corpus/authorities/f1099da--2026.pdf) and
[instructions](corpus/authorities/i1099da--2026.pdf). The pinned
[2025 Form 8949 instructions](corpus/authorities/i8949--2025.pdf) are a
**prior-year comparator**, not final 2026 filing authority. Obtain and diff
the 2026 instructions when issued.

## Source semantics and routing

| Fact | 2026 source field | Graph and filing consequence |
| --- | --- | --- |
| 1099-B proceeds, basis, dates, description | Boxes 1a–1e | Preserve payer and recipient, transaction dates, proceeds, reported basis, and taxpayer-corrected basis separately. Derive gain from proceeds minus tax basis plus supported adjustments. |
| 1099-B short/long/ordinary | Box 2 | Short and long transactions route to Form 8949 categories A/B or D/E. Ordinary treatment needs a separate income route; do not force it into Schedule D. An unknown term requires a taxpayer determination. |
| 1099-B collectibles or QOF | Box 3 | Collectibles require the 28% worksheet; QOF dispositions require Schedule D's Yes answer, Form 8949, and Form 8997 or related facts. |
| 1099-B noncovered and basis reported | Boxes 5 and 12 | Box 5 means noncovered; **box 12 means basis reported to IRS**. Covered, basis-reported trades with no adjustments may aggregate directly on Schedule D line 1a/8a; otherwise use Form 8949. The shared `f1099b` node currently labels box 12 as a QOF flag and must not be registered for TY2026. |
| 1099-B accrued market discount, wash sale, withholding | Boxes 1f, 1g, 4 | Market discount is ordinary interest and must reduce capital gain; wash sale disallowance needs code W and a positive column (g) adjustment; federal withholding reaches 1040 line 25b. Check correct basis and adjustment treatment before emission. |
| 1099-DA digital asset and units | Boxes 1a–1c | Preserve token identity, name, units, payer, and recipient. Distinguish aggregate stablecoin/NFT reporting from a single disposition. |
| 1099-DA dates, proceeds, basis | Boxes 1d–1g | Basis can be missing for noncovered assets; taxpayer cost basis is a separate fact. A reported basis checkbox in box 2 selects Form 8949 G/J versus H/K, or Schedule D direct line 1a/8a when no adjustments apply. |
| 1099-DA QOF, term, noncovered, optional aggregate methods | Boxes 3b, 6, 9, 11a–11c | QOF goes through its own election/disposition route. A short/long answer selects G/H or J/K; absent answer requires taxpayer classification. Optional aggregate proceeds cannot silently become one ordinary sale. |
| Transactions without an information return | Form 8949 C/F or I/L | Capture the actual asset, dates, basis, proceeds, and adjustment codes; use digital categories I/L where applicable. |

The dedicated 2026 `f1099b` and `f1099da` inputs are registered. Both send a
canonical transaction to the shared `form8949` node and then to Schedule D.
The 2026 PDF builders exclude adjustment-free A/D/G/J trades from Form 8949,
sum those on Schedule D lines 1a/8a, and group all other trades by A–L page
and the six Schedule D summary rows. The combined PDF requires the Form 8949
attachment whenever a filed trade needs it and checks the attachment records
against Schedule D. The dedicated `f8949` input now covers plain security or
digital-asset dispositions without a broker form, deriving C/F/I/L from asset
kind and holding term. A mixed broker-plus-unreported return passes the graph
and eight-page PDF test. Adjusted unreported dispositions and MeF detail
remain open.

## Implementation order

1. Define dedicated TY2026 1099-B and 1099-DA input schemas with the actual
   2026 box meanings. The new `f1099b_2026` node now handles individual
   short/long trades, reported versus taxpayer basis, codes B/E/W, and federal
   withholding. The 1099-DA node handles corresponding individual digital
   asset sales. Both are registered. Reject unsupported ordinary, QOF,
   collectibles, aggregate, foreign, or state branches by name until their routes exist.
   Keep reported basis separate from taxpayer tax basis and require term and
   acquisition evidence before calculating a gain.
2. Route supported individual trades through one Form 8949 transaction shape.
   Explicitly classify direct Schedule D line 1a/8a eligibility, and do not
   print those rows again on Form 8949. Group the other transactions by the
   twelve A–L boxes, with one checked box per printed Form 8949 page.
3. Reconcile each Form 8949 page's columns (d), (e), (g), (h), then roll its
   totals into Schedule D rows 1b/2/3 and 8b/9/10. Include A/G, B/H, C/I,
   D/J, E/K, F/L pairs on the same Schedule D rows without losing the
   distinct Form 8949 attachments. Handle more than eleven transactions in
   a category with repeated pages.
4. Print the pinned 2026 draft Form 8949 and Schedule D; verify every field,
   attachment count, Form 1040 line 7a, preferential tax, NIIT, and capital
   loss carryforward. The [PDF map](PDF-FORM8949-MAP.md) records the field
   positions. Render short, long, digital, adjusted, and continued cases.
5. Map the same grouped rows and transaction details into the **current**
   TY2026 MeF schema and rules, then test against 2026 ATS fixtures. The
   downloaded May MeF v1 package is research material, not a filing target.

Do not infer that a missing 1099-B/1099-DA is evidence of no other capital
activity. Reconcile the public `schedule_d` declarations and every transaction
source before allowing Form 1040 line 7b.
