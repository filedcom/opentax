# TY2025 Form 7217 property-distribution gap

## October 10 complete Part II continuation checkpoint

The PDF now retains every property in a validated distribution, using additional
copies of the official Part II after each 30 rows. The first Part II carries
the attached copies' totals on line A and the complete distribution totals on
line B; each continuation prints its own rows and subtotal. Only the first copy
contains Part I. Each Part II identifies the partner, partnership, distribution
date, copy number and property range. This follows the
[IRS Part II instructions](https://www.irs.gov/instructions/i7217), which permit
as many copies as necessary. Native XML retains one document per partnership
and distribution date with all property rows. Calculation and native source
guards are unchanged.

Seven public-entry returns now reach native preparation and complete PDFs:

| Case | Properties | Partnership basis | Partner basis after section 732 | Packet pages |
| --- | ---: | ---: | ---: | ---: |
| One full Part II | 30 | 3,000 | 3,000 | 4 |
| One continuation row | 31 | 3,100 | 3,100 | 5 |
| Three Part II copies | 61 | 6,100 | 6,100 | 6 |
| Liquidating basis increase | 63 | 5,250 | 13,650 | 6 |
| Nonliquidating basis decrease | 63 | 12,600 | 8,400 | 6 |
| Inventory-priority decrease | 61 | 6,100 | 1,550 | 6 |
| Two separate partnerships | 30 + 61 | 3,000 + 6,100 | 3,000 + 6,100 | 8 |

The increase repeats the IRS Example 2 allocation in 21 inventory/X/Y groups,
retaining each group's $100/$440/$110 basis. The nonliquidating decrease
preserves $100 inventory and allocates $150 each to A/B after the depreciation
and proportional reductions. The inventory-priority case allocates $50 to each
of 31 inventory items and zero to the other 30 assets. Independent arithmetic
reconciles these amounts, all 400 printed property rows, Part I, native groups,
continuation cells and totals. With $150,000 wages and no recognized gain,
each packet retains tax $25,067, withholding $25,000 and amount owed $67.

Three more public returns cover long-term, short-term and two-partnership cash
gains. Their native documents and calculations reconcile 154 property rows,
gains $5,000/$5,000/$10,000 and final tax $25,817/$26,267/$27,017. They do not
produce complete PDFs: prepared PDF assembly wraps Form 8949 rows before the
Form 7217 gain guard expects an array. Fresh public-pending PDF building also
rejects; the single-gain cases stop earlier at the transaction-array guard.
This is deferred126. No source, gain or owner guard was bypassed, and these
three native-only returns are kept separate from complete packets.

The final typed focused run passes 10/0; the existing Form 7217 and native/PDF
builder group passes 212/0. The first focused run had 8/2 because two fresh-PDF
error messages differed from the prepared-PDF errors; the corrected assertions
preserve both actual blockers. Rejections cover 74 public-source mutations,
77 native mutations and 41 fresh-PDF mutations, separate from the three
original prepared/fresh gain-packet blocks. Missing classification/FMV,
incorrect allocated basis, invalid dates, unsupported section 751(b), missing
allocation workpapers, and conflicting gain sources reject. Changed partner
SSNs reject in the native gain cases.

All ten XMLs pass cached TY2025v5.4 Return1040 XSD: seven complete packets and
three native-only cases. Those three Schedule D documents retain only their
short-/long-term transaction groups and omit computed totals, repeating
deferred15; XSD validation does not establish complete native reporting. All 41 packet pages were rendered and inspected,
including 11 continuation pages, through 29 unique page hashes on eight sheets.
All eight Form 7217 Part I copies leave the skipped zero-gain line 8 blank on
these sources. The earlier explicit-false checkbox defect9 remains deferred;
no deferred repair was made. Flattened outputs have no
editable fields or widgets. Source references and entered outside-basis facts
are synthetic reviewed data, not authenticated K-1s or workpapers. Multi-date
outside-basis rollforward, wider ownership, special distributions, source
authenticity, IRS business rules and ATS acceptance remain open.

Private evidence is in `.state/research/form7217-continuations-2026-10-10/`:
source/pending snapshots, native XML, seven PDFs, all rendered pages,
independent cell/arithmetic checks, rejection tests and terminal logs. The
existing benchmark was not rerun: production changes are limited to PDF
pagination and labels, with source/allocation/gain/native bytes unchanged.

## October8 current registered-audit reconciliation

The [current bundled audit](../../../../readiness/ty2025-bundled-form-audit-reconciliation-2026-10-08.md) reconciles this form's current scope with actual native/PDF imports and retained terminal evidence. The completed October8 full run records **25 passed/0 failed/0 ignored across3 named modules**; all8 matching runtime paths still equal that tested snapshot. This is selected retained full-run evidence, not a new focused run, full-route support or fresh visual approval. Earlier dated authored/unrun statements below are historical; existing broader source, artifact and IRS requirements remain open. No original checkbox or future task is completed by this correction.


Form 7217 has registered native `IRS7217` and December 2024 PDF projections for
one partnership and distribution date per document. The public source checks
Part I against Part II, routes a narrow sourced section 731 cash gain through
Form 8949, and now retains further Part II copies after 30 rows. The positive-gain
PDF contract remains blocked as documented above.

## Section 732(c) basis allocation

The [IRS Form 7217 instructions](https://www.irs.gov/instructions/i7217)
require the property basis in Part II column (e) to total Part I line 10. For a
nonliquidating distribution, section 732(a)(2) limits aggregate property basis
to remaining outside basis after cash; a liquidation uses that remaining basis
under section 732(b). The [IRS partnership publication](https://www.irs.gov/publications/p541)
orders section 732(c) allocation by inventory/receivables before other
property. A decrease within a class first consumes unrealized depreciation and
then reduces the remaining assigned bases proportionally.

The existing liquidating basis-increase route allocates excess to appreciation
and then FMV. The new route calculates and checks whole-dollar **basis
decreases** for multiple section 732 properties in both nonliquidating and
liquidating distributions, using explicit class, partnership basis, FMV,
partner basis, and a section 732(c) workpaper reference. The property totals
must match line 10, and the same source reaches native XML and PDF. Positive
and tamper fixtures pass focused checks. A graph-driven full-return case for
the IRS instructions' liquidating Example 2 also passes local TY2025 v5.4 XSD:
$750 outside basis less $100 cash leaves $650, allocated $100 to inventory,
$440 to Asset X, and $110 to Asset Y. An offsetting $1 property-basis tamper
rejects through the full return graph.

The workpaper reference and K-1 property amounts are caller supplied; retained
source bytes and accepted K-1 provenance are not yet bound. Marketable
securities under section 731(c), section 751(b) exchanges, section 737 gain,
section 732(d)/(f) adjustments, multi-date outside-basis rollforward,
broader filled PDF review, IRS business rules, and ATS
acceptance remain open.
