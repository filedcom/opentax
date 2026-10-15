# Form 6251 current-main implementation, October 15, 2026

This describes the current bounded implementation, not the September prototype.
No TY2026 filing product, MeF acceptance or complete AMT source surface is claimed.

## Source and annual policy

The pinned [2026 draft](../corpus/draft/f6251.pdf), SHA-256
`a547fc9d629e1f04bdc30e088214c716667b88cb1b45447c580c0ae33095b5cc`,
provides the printed line contract, ordinary AMT brackets and Part III ceilings.
[Rev. Proc. 2025-32 §4.10](https://www.irs.gov/irb/2025-45_IRB) supplies the
exemptions and phaseout thresholds. The reviewed annual policy is:

| Status | Exemption | Phaseout starts | Exemption exhausted |
| --- | ---: | ---: | ---: |
| Single / HOH | 90,100 | 500,000 | 680,200 |
| MFJ / QSS | 140,200 | 1,000,000 | 1,280,400 |
| MFS | 70,100 | 500,000 | 640,200 |

[P.L. 119-21 §70107](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm)
changes the rate under §55(d)(2) to 50% for 2026 and extends §55(d)(4).
Read this amendment with the prior [§55(d)(2) text](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partVI-sec55.htm):
the substitution also reaches its MFS AMTI-addition sentence. The implemented
addition is 50% of pre-addition AMTI above $640,200, capped at $70,100, and then
added to line 4. It is not the old 25%/$900,350/$68,500 rule.

The same extension retains §55(d)(4)(A)(iii)'s suspension of §59(j). The indexed
child amount in Rev. Proc. §4.11 therefore is not installed as an active AMT
exemption cap. Regular Form 8615 source/parent-tax handling remains separate
unfinished work. Final 2026 instructions must be checked before filing.

The current [Form 3921 instructions](https://www.irs.gov/instructions/i3921)
are continuous-use April 2025. The [Form 6251 instructions](https://www.irs.gov/instructions/i6251)
and draft instruction URL still serve 2025. Their unrestricted-exercise example
and regular/AMT basis retention inform the reused ISO calculation; their annual
numbers do not supply 2026 policy.

## Connected graph and reuse

```text
Form 3921 copies + identity + holdings review -> ISO lot ledger --+
                                                               |
AGI -> deduction resolution -> income tax ----------------------+-> Form 6251
                                                                      |
                                                     +----------------+--+
                                                     |                   |
                                                 draft PDF       Schedule 2 line 2
                                                                         |
                                                                 Form 1040 line 17
```

The existing 2025 lot builder delegates to a year-parameterized helper while
preserving its 2025 return type. The 2026 adapter validates taxpayer/joint-spouse
ownership, duplicate copy references and a custody review covering all copies.
The shared item schema limits this path to unrestricted exercise-year holdings
with no option cost or same-year sale. Lot values remain in cents; the return
adjustment rounds once after summing all lots. No W-2 wage or capital-gain amount
is inferred from these retained exercises.

Form 6251 receives signed line 1b and tax addback from the resolved deduction
choice, plus line 1a with only Schedule 1-A senior deduction removed. The income
node supplies regular tax and preference facts. The ISO adapter passes source
copies rather than an asserted adjustment; Form 6251 recalculates them with the
return identity. Its calculation persists even when no attachment is required.

The 2025 and 2026 nodes share exemption, MFS addition, ordinary AMT and Part III
arithmetic. Annual inputs are explicit for 2026. Part III currently permits
domestic preferences without AMT basis or election differences; its regular-tax
worksheet lines 20/27 and AMT preference lines therefore use the same facts.
The graph has not yet connected the dividend/capital-gain source owners.

In the synthetic full graph, wages $150,001, standard deduction $16,100 and
nonitemizer charity $500 yield regular tax $24,614. A $100,000 ISO spread gives
AMTI $249,501, tentative tax $41,444 and AMT $16,830. Withholding $30,001 yields
$11,443 due. Sixteen other source scenarios retain their prior settlements and
now explicitly compute zero AMT. No final tax amount is accepted by public input.

## Remaining boundaries

The strict calculation schema rejects refunds, NOL/ATNOLD, PAB/QSBS, trust,
depreciation/passive/business adjustments, AMT dispositions, Form 4952 elections,
foreign exclusions/credits, Schedule J and specialized line 10 adjustments.
It also rejects credit-driven attachment overrides until their credit owners
are implemented. Negative-adjustment counterfactual filing tests are not needed
for this positive-ISO-only adjustment surface; they must be added when negative
adjustments are enabled. Prior-year stock sales and minimum-tax-credit carryovers
need their own source and calculation routes despite the retained basis ledger.

The draft PDF reconciles its sources and return destinations and was rendered
for both printed pages. It is a component, not a complete attachment-selecting
return bundle. Final instructions/PDF revisions, remaining source owners,
current MeF schemas/rules, ATS verification and public registration remain open.
