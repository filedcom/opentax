# TY2026 Schedule 2 and Schedule 8812 dependency map

Source snapshot: the committed draft `corpus/draft/f1040s2.pdf` (created
April 27, 2026), `corpus/draft/f1040s8.pdf` (created April 24, 2026), and
`corpus/draft/i1040s8.pdf` (2026 instructions posted August 21, 2026).
Recheck line numbers against final forms and instructions before MeF/PDF
mapping. The pure 2026 Schedule 2 arithmetic is in
`forms/f1040/2026/schedule2.ts`; `nodes/schedule2.ts` now publishes those
filed totals to the focused 2026 Form 1040 graph.

## The line-number change

The shared Schedule 2 node computes a 2025 total, but its old field names do
not describe the 2026 filed form. A distinct 2026 node must receive semantic
source amounts and publish the actual 2026 lines below. Never serialize a
2025 Schedule 2 pending record as a 2026 form.

| 2026 Schedule 2 | Source and current graph field | Required work |
| --- | --- | --- |
| 1a–1c, 2, 3 | Form 8962 repayment, Forms 8936 dealer repayments, Form 6251 AMT | Rebind existing source fields to 2026 line names and total Part I on line 3. |
| 1d–1f, 10 | Form 4255 net EPE recapture and excessive payments | Split the source by Form 4255 line and payment type; the old generic investment recapture amount is insufficient. |
| 4 | Schedule SE tax | Map existing self-employment tax. |
| 5 and 18 | Form 5329 early-distribution versus excess-contribution taxes | Split the old aggregate using the node's chapter 1 breakdown; reject missing breakdowns. |
| 6, 9, 13b–13h, 13k, 13n, 13z | NIIT, LIHTC recapture, and other existing tax sources | Form 8960 NIIT now reaches line 6; rebind the other sources to their filed 2026 lines and audit types currently collapsed into the generic other-taxes field. |
| 11 and 17b | Form 8959 Additional Medicare tax on self-employment versus wages/RRTA | The current 2026 Form 8959 splits these sources to lines 11 and 17b. |
| 12 | Section 965 installment | The draft prints line 12 but says line 15 adds lines 4–11 and 14. The 2026 calculator rejects a positive line 12 until final placement is confirmed. |
| 16a–16c | Form 4137 tips and Form 8919 wages | Forms 4137 and 8919 route to 16a/16b; Part II-B consumption of 16c remains. |
| 17a–17d | Schedule H, Form 8959 wages/RRTA, W-2 box 12 A/B/M/N | W-2 A/B/M/N route to 17c; Part II-B consumption remains. |
| 19a–19c | Form 8621 interest | Add its line 24 interest source and keep it separate from line 16f. |
| 15, 20, 21 | 2026 subtotals | Send line 21 to Form 1040 line 23; use line 15/20 for chapter 1 and Form 8978 review. |

## Current child-credit implementation

See [CHILD-CREDIT-CURRENT.md](../graphs/CHILD-CREDIT-CURRENT.md) for the
current source-backed node and PDF. It reuses the shared calculator with narrow
2026 configuration, derives earned income from source-owned wage lines, includes
AMT in the credit limit, and finalizes CTC/ODC and the supported ACTC earned-income
method. Other credits require an explicit absence review. The prior prototype's
caller-supplied `part_iib_2026` contract is not the current public API.

Part II-B remains gated when required. The 2026 line 22 adds Schedule 1 line 15,
Schedule 2 line 16c and Schedule 2 line 17c; the shared 2025 shape names different
lines. Line 21 needs actual W-2/PR withholding and the Additional Medicare/RRTA
worksheet where applicable. Line 24 needs finalized EIC and Schedule 3 line 11
excess Social Security/tier 1 RRTA credit. A pending receiver does not finalize
any of these amounts.

2026 Credit Limit Worksheet A uses Schedule 3 lines 1, 2, 3, 4, 6d, 6f, 6l and
6m; it excludes the old line 5b. Worksheet B line 15 uses 5a, 6c, 6g and 6h.
Connecting those credit owners and their ordering remains open.

W-2 code K reaches Schedule 2 line 13k. Code Z requires section 409A tax review
and is gated. Current Form 8959 routes wages/RRTA and self-employment tax to
17b and 11 respectively. Forms 4137 and 8919 both reach 16a/16b; their sum is
16c. Schedule 8812 currently consumes only Schedule 2 Part I for the tax limit.
