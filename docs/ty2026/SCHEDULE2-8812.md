# TY2026 Schedule 2 and Schedule 8812 dependency map

Source snapshot: the committed draft `corpus/draft/f1040s2.pdf` (created
April 27, 2026) and `corpus/draft/f1040s8.pdf` (created April 24, 2026).
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
| 6, 9, 13b–13h, 13k, 13n, 13z | NIIT, LIHTC recapture, and other existing tax sources | Rebind each source to its filed 2026 line; audit types currently collapsed into the generic other-taxes field. |
| 11 and 17b | Form 8959 Additional Medicare tax on self-employment versus wages/RRTA | Split the Form 8959 result; its old combined output cannot identify the new lines. |
| 12 | Section 965 installment | The draft prints line 12 but says line 15 adds lines 4–11 and 14. The 2026 calculator rejects a positive line 12 until final placement is confirmed. |
| 16a–16c | Form 4137 tips and Form 8919 wages | Form 4137 now routes to 16a and the 2026 node computes 16c. Form 8919 and the Schedule 8812 edge remain. |
| 17a–17d | Schedule H, Form 8959 wages/RRTA, W-2 box 12 A/B/M/N | W-2 A/B/M/N now route to 17c. Other sources and the Schedule 8812 edge remain. |
| 19a–19c | Form 8621 interest | Add its line 24 interest source and keep it separate from line 16f. |
| 15, 20, 21 | 2026 subtotals | Send line 21 to Form 1040 line 23; use line 15/20 for chapter 1 and Form 8978 review. |

## Schedule 8812 Part II-B

The draft 2026 Schedule 8812 line 22 adds Schedule 1 line 15, **Schedule 2
line 16c**, and **Schedule 2 line 17c**. The shared 2025 input shape instead
names Schedule 2 lines 5, 6, and 13. Add a 2026 Part II-B input contract that
consumes the finalized 2026 line amounts. Its line 21 also needs W-2 boxes 4
and 6 (plus the documented RRTA/Additional Medicare cases); line 24 needs
Form 1040 line 27a and Schedule 3 line 11. Keep the 2025 contract intact.

The Schedule 8812 node already has year-indexed CTC/ACTC caps and phaseout
thresholds, but that alone does not prove a 2026 dependent return. Before
enabling one, wire its 2026 credit-limit worksheet, earned-income line 18a,
Part II-B sources where applicable, and nonrefundable/refundable outputs into
the 2026 credit and settlement graph. Then remove the explicit dependent
diagnostic in the 2026 Form 1040 node and verify a complete dependent return.

W-2 box 12 code K reports the excise tax and now reaches Schedule 2 line 13k.
Code Z reports section 409A income, not its complete additional tax; its 2026
W-2 route currently rejects the case until the 20% plus interest calculation
is supplied. The TY2025 W-2 path remains unchanged.
