# TY2026 Form 1099-DIV graph contract

Sources: the IRS continuous-use [Form 1099-DIV](https://www.irs.gov/pub/irs-prior/f1099div--2024.pdf)
and [instructions](https://www.irs.gov/pub/irs-prior/i1099div--2024.pdf), both January
2024 revisions pinned under `corpus/authorities/`, plus the pinned 2026 draft
Schedule B and its instructions. The 1099-DIV revision is not a TY2026-specific
form. Recheck the continuous-use source when IRS changes it, and reconcile the
2026 1040 instructions and current MeF rules before XML output. The pinned
2025 1040 instructions supply the direct-distribution exception pending a
published 2026 instruction; the draft 2026 Form 1040 retains lines 7a/7b.

| 1099-DIV fact | TY2026 return route | Current graph status | Next required work |
| --- | --- | --- | --- |
| Box 1a ordinary dividends | 1040 line 3b; AGI; Form 8960 line 2 | Registered. Schedule B line 5/6 and its PDF are filed when ordinary dividends exceed $1,500; below that threshold the amount reaches 1040 and AGI directly. | Current MeF 1040/Schedule B serializer and active rule checks. |
| Box 1b qualified dividends | 1040 line 3a; qualified-dividend tax worksheet | Registered and constrained to box 1a. | Verify all 2026 tax-worksheet boundaries and interaction with capital gains/QBI. |
| Box 4 federal withholding | 1040 line 25b | Registered and included in 1040 payments. | MeF withholding detail. |
| Box 2a plain capital gain distributions | Schedule D filing decision, AGI, 1040 line 7a/7b, preferential tax, Form 8960 | Registered. The public `schedule_d` input requires explicit short- and long-term carryover amounts, QOF/other-activity answers, and Form 4952 filing status. With zero carryovers, the node sends box 2a directly to 1040; with a carryover, it prints the two-page Schedule D draft. Both PDF cases were rendered and checked. | Reconcile declarations against every added capital source; check final 2026 instructions and MeF. |
| Boxes 2b–2f special-rate and section 897 gain | Schedule D, 28%/unrecaptured worksheets, Form 8949 where required | Explicitly rejected when nonzero. | Build the full 2026 Schedule D and worksheet paths, then their PDF/MeF attachments. |
| Box 3 and boxes 9–10 distributions | Security basis and later disposition | Explicitly rejected when nonzero. | Add basis/carryforward records and applicable gain routes. |
| Box 5 section 199A dividends | Form 8995/8995-A and 1040 line 13b | Explicitly rejected when nonzero. | Complete the Schedule A/QBI joint resolver and 2026 QBI output. |
| Boxes 6–8 foreign expense/tax/country | Form 1116 or direct Schedule 3 credit | Explicitly rejected when populated. | Choose 2026 direct-credit eligibility or Form 1116, including qualified-dividend rate adjustment. |
| Box 12 exempt-interest dividends | 1040 line 2a; Social Security provisional-income worksheet and Form 8962 modified AGI | Registered. It sums with 1099-INT box 8 net of box 13 bond premium; SSA/RRB benefits now use this amount in the public 2026 taxability calculation. | Add Form 8962 to the public 2026 graph, then verify MeF fields. |
| Box 13 private-activity bond dividends, included in box 12 | Form 6251 line 2g, then Schedule 2 and Form 1040 if AMT is due | Registered and constrained to box 12. It sums with 1099-INT box 9, without adding box 13 to 1040 line 2a twice. | Complete Form 6251 adjustments and current MeF attachment. |
| Boxes 14–16 state withholding | Schedule A and state detail | Explicitly rejected when populated. | Complete TY2026 itemized-deduction route and filed detail. |
| Nominee, FATCA, investment-property flags | Schedule B nominee adjustment, foreign-asset answers, Form 4952 | Explicitly rejected when true. | Add the matching disclosure and source-reconciliation paths. |

The dedicated `f1099div_2026` input and node accept all current source fields,
then reject material branches whose downstream form is absent. The 2026 PDF
boundary rejects capital gains requiring Form 8949 or another unbuilt
attachment. The filed Schedule B PDF checks line 6 against
1040 line 3b. A plain dividend return below the filing threshold has no
Schedule B attachment; the node still retains payer rows in pending data.

Graph tests cover a plain qualified-dividend/withholding return, a filed
Schedule B case above $1,500, direct box 2a distribution reporting, and combined 1099-INT/1099-DIV exempt income
that reaches Form 6251 and a six-page PDF. The full Form 1099-DIV surface, current MeF
package, and TY2026 ATS examples remain release gates.
