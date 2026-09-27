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
| 11 and 17b | Form 8959 Additional Medicare tax on self-employment versus wages/RRTA | Split the Form 8959 result; its old combined output cannot identify the new lines. |
| 12 | Section 965 installment | The draft prints line 12 but says line 15 adds lines 4–11 and 14. The 2026 calculator rejects a positive line 12 until final placement is confirmed. |
| 16a–16c | Form 4137 tips and Form 8919 wages | Form 4137 now routes to 16a and the 2026 node computes 16c and sends it to Schedule 8812. Form 8919 remains. |
| 17a–17d | Schedule H, Form 8959 wages/RRTA, W-2 box 12 A/B/M/N | W-2 A/B/M/N now route to 17c, which reaches Schedule 8812. Other sources remain. |
| 19a–19c | Form 8621 interest | Add its line 24 interest source and keep it separate from line 16f. |
| 15, 20, 21 | 2026 subtotals | Send line 21 to Form 1040 line 23; use line 15/20 for chapter 1 and Form 8978 review. |

## Schedule 8812 Part II-B

The draft 2026 Schedule 8812 line 22 adds Schedule 1 line 15, **Schedule 2
line 16c**, and **Schedule 2 line 17c**. The shared 2025 input shape instead
names Schedule 2 lines 5, 6, and 13. `part_iib_2026` now takes lines 16c and
17c, rejects the 2025 shape, and checks any amounts arriving from the 2026
Schedule 2 graph against the supplied line sources. Its line 21 also needs W-2 boxes 4
and 6 (plus the documented RRTA/Additional Medicare cases); line 24 needs
Form 1040 line 27a and Schedule 3 line 11 (excess Social Security/tier 1 RRTA
withholding). Keep the 2025 contract intact.

The dedicated 2026 Schedule 8812 node is now in the calculation graph. It
uses the year-specific credit-limit worksheet, requires verified line 18a
earned income whenever an ACTC may arise, adds Schedule 2 line 3 to Form 1040
line 16 for the credit limit, and sends lines 14 and 27 to Form 1040 lines 19
and 28. A W-2 return with one qualifying child runs through the registry.
The Form 1040 node requires this credit calculation when a dependent qualifies
for CTC or ODC. The draft Form 1040 PDF now prints the revised four-column
dependent table and an additional-dependents statement when needed. The core
bundle includes the two-page draft Schedule 8812 when the calculation reaches
its credit lines, and reconciles lines 14 and 27 with Form 1040 lines 19 and
28. A one-child W-2 bundle was rendered and visually checked. MeF and Schedule
3 credit-source reconciliation remain open.

The 2026 draft instructions change Credit Limit Worksheet A line 2: add
Schedule 3 lines 1, 2, 3, 4, 6d, 6f, 6l, and 6m. The 2025 worksheet also lists
line 5b. Use a distinct 2026 worksheet input and reject the old shape.
Worksheet B line 15 draws from Schedule 3 lines 5a, 6c, 6g, and 6h; those
source credits now sum inside the TY2026 worksheet. The graph still needs to
reconcile them with the filed Schedule 3 lines.

W-2 box 12 code K reports the excise tax and now reaches Schedule 2 line 13k.
Code Z reports section 409A income, not its complete additional tax; its 2026
W-2 route currently rejects the case until the 20% plus interest calculation
is supplied. The TY2025 W-2 path remains unchanged.
