# TY2025 Form 1040 business-credit routing audit

This is an implementation inventory, not an approval to claim any credit. The
authoritative tax map is
[2025 Form 3800](https://www.irs.gov/pub/irs-pdf/f3800.pdf) and its
[instructions](https://www.irs.gov/instructions/i3800). An individual's Form
3800 Part II line 38, after passive activity, special-limit, transfer,
carryover, and tax-liability rules, is the amount reported on Schedule 3 line
6a. A source form's computed credit is not automatically that allowed amount.

## Current direct deposits into Schedule 3 line 6a

The following source nodes currently deposit a positive amount into
`line6a_general_business_credit` without a common Form 3800 Part II calculation.
These are current-worktree observations, not claims that the source calculation
or Form 3800 line assignment is correct.

| Source node | Required classification before filing                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `f3468`     | Separate its Part II/III/IV/V/VI/VII credit lines, EPEs, transfers, and specified-credit parts.                                              |
| `f6478`     | Part III line 4c specified credit and applicable source year.                                                                                |
| `f6765`     | Ordinary line 1c versus eligible-small-business specified line 4i, plus payroll-tax election.                                                |
| `f7207`     | Part III line 1b, transfer/EPE, and facility breakdown.                                                                                      |
| `f8844`     | Part III line 3 uses its own Part II section B limitation.                                                                                   |
| `f8864`     | Separate diesel line 1l and SAF line 1ff, including transfer eligibility.                                                                    |
| `f8881`     | Separate Part I line 1j, Part II line 1dd, and Part III line 1ee.                                                                            |
| `f8882`     | Part III line 1k and source limits.                                                                                                          |
| `f8896`     | Part III line 1m and source limits.                                                                                                          |
| `f8908`     | Part III line 1p and source limits.                                                                                                          |
| `f8941`     | Part III line 4h specified credit and source limits.                                                                                         |
| `f8994`     | Part III line 4j specified credit and source limits.                                                                                         |
| `f3800`     | Its legacy `f3800s` sums current credits and carryovers, or accepts `total_gbc`, then sends the result to line 6a without the Part II limit. |

Separate paths: `f8609` deposits low-income housing credit directly into the
other Schedule 3 line 6a accumulator; the Form 8586 specified-credit and
carryover path needs source reconciliation. `form8582cr` deposits its passive
activity allowed credit directly into line 6a, but that is only the passive
activity limit, not necessarily the Form 3800 tax-liability limit. Its current
unrun Part II correction computes tax attributable to the rental income
allowance instead of treating the $25,000 allowance itself as a credit. `f8835`
instead forwards per-facility amounts to `f3800`; positive available credit now
waits for final Form 1040 tax and Form 6251 TMT before Schedule 3 receives the
allowed amount. The source-backed nonpassive IRS3800 bundle is registered but
unverified; unsupported credit categories still stop export. The Form 8936
new-vehicle nonpassive business-use slice now enters Form 3800 line 1y from
source-backed mileage or employee-use facts. Its parent, Schedule A, and Form
3800 XML/PDF and full-return cases are written but unrun. Passive, transferred,
commercial, and pass-through vehicle-credit paths still need separate handling.
Form 8911 business use also needs the shared Form 3800 treatment.

`f8874` now sends an identified nonpassive qualified equity investment's
current-year credit to Form 3800 Part III line 1i. A native IRS8874 source
document and Part V source row are written, with tests deferred to the full
batch. Nonpassive partnership and S-corporation K-1 code AD sources also enter
line 1i directly, with filed K-1 amount and identity reconciliation and no
invented IRS8874 for pass-through-only claims. Estate/trust K-1 box 13 code ZZ
credits require a statement identifying the New Markets Credit and use the same
source-backed line 1i. Passive K-1 credits require matching Form 8582-CR
activity facts and K-1 evidence before their Form 3800 allocation. A self-earned
QEI filed together with partnership/S-corporation K-1 credits now puts those
K-1 amounts on IRS8874 line 2 after matching them to their Form 3800 or Form
8582-CR sources; line 3 includes both own and pass-through credit. A self-earned
passive QEI now similarly requires a named Form 8582-CR activity and source,
with the filed Form 8874 checked against that source; its nonpassive share is
routed directly, so mixed investments do not duplicate the credit. Passive
credits currently require whole-dollar source amounts. Carryforward, recapture,
and cent-bearing passive cases remain open; this is not a complete New Markets
Credit filing path.

`f8820` now sends an identified, nonpassive orphan-drug source credit to Form
3800 Part III line 1h instead of depositing its gross 25% credit in Schedule 3.
The source calculation distinguishes the section 280C reduced-credit election,
the Form 8932 overlapping wage-credit offset, and the required drug identity.
The linked IRS8820 and IRS3800 XML cases are written but unrun. The current
build pass also has structured section 280C deduction or basis reductions,
controlled-group allocation statements, pass-through source identities, and a
paper Form 8820 PDF builder. Partnership K-1 box 15 code Z and S-corporation K-1
box 13 code Z amounts, plus estate/trust K-1 box 13 code M orphan-drug amounts,
now reconcile to the claimed pass-through credit during MeF export, with written
but unrun cases. This compares entered source facts; actual K-1 documents,
automatically derived passive activity tax facts, filled-PDF output, and IRS
business rules remain open.

`f8826` now forwards gross source amounts through the shared disabled-access cap
before Form 8582-CR and `f3800`. A positive nonpassive credit is limited at
final Form 1040 assembly; a passive credit requires public Form 8582-CR activity
and tax facts. The older `f3800s.disabled_access_credit` input still deposits a
gross amount and is not a source-backed Form 8826 claim. Identified partnership
and S-corporation line 7 credits now combine with self-earned line 6 under one
$5,000 cap. A pass-through-only credit can appear on Form 3800 without a Form
8826 document; the source amounts are allocated pro rata in cents when that cap
binds. K-1 amounts and references are reconciled as entered; document
authenticity and broader filed source attribution remain open. The registered
Form 3800 XML path now emits Part V rows for multiple Form 8826 sources,
retaining their EINs, capped amounts, explicit applied-credit split, and
remaining amounts. This path has not passed the deferred full test batch, local
XSD, or IRS business rules. The legacy gross-credit path remains unsupported.
The self-earned Form 8826 XML is registered, while pass-through-only recipients
do not attach their own Form 8826. Schedule 3 line 6a now requires a linked Form
3800 document before export. Mixed passive and nonpassive source amounts now
share one upstream $5,000 cap. Self-earned passive credit and Form 8826 line 7
passive pass-through credit retain separate source markers, reconciled to Form
8582-CR activity rows and the filed Form 8826/K-1 inputs. The graph, MeF, and
local XSD cases are written but unrun; the cap's per-source rounding remains
under business-rule review.

`f5884` now sends its identified self-earned and pass-through line 4b source
credit through the nonpassive Form 3800 tax limit. Pass-through-only recipients
omit their own Form 5884; mixed and partly limited sources use line 3 and Part V
allocations. Controlled-group claims apportion the group credit by qualified
wages and link native line 2 statements. These cases are unrun. Shared
employees, K-1 reconciliation, passive credit, and carryovers remain open. Form
8912 is not a Form 3800 credit: its limited line 12 belongs on Schedule 3 line
6k, not line 6a.

Separate 2025 Schedule 3 corrections in the current build pass: `f8859` now
deposits into line 6h, `f8834` into line 6i, and the combined Form 4136 fuel
credit into refundable line 12. The represented Form 4136 fuel uses now apply
their printed 2025 rates, but its complete Part I qualifying-business facts, all
Part II claim categories, supporting documents, and source-form serializer
remain open. Form 8834 and Form 8859 source limits and filing documents also
remain unaudited. `f8912` no longer deposits its unbounded amount into line 6a.
It separates reported and unreported bond source amounts, then stops positive
claims until its Part II limit and separate Schedule 3 line 6k are wired. These
source cases and the stop are written but unrun in the current build pass.

## Required common flow

1. Each source produces identified current-year credit entries or carryover
   entries with Form 3800 line, source document, activity classification,
   transfer/EPE facts, and source-specific limits. Do not merge unlike lines.
2. Apply Form 8582-CR where relevant. Keep its allowed passive amount separate
   from the later Form 3800 tax limit.
3. Aggregate Parts III through VI, with Part V detail for multiple facilities or
   pass-through sources, and calculate Part I and all relevant Part II sections
   in the IRS ordering. Carryovers need originating-year identity.
4. Use finalized Form 1040, Schedule 2, Schedule 3 excluding the GBC itself, and
   Form 6251 amounts to determine Part II's allowed amount. Finalize Schedule 3
   line 6a and Form 1040 line 20 with that amount, without depositing gross
   source credit first.
5. Reconcile the filed Form 3800 XML/PDF, every source document, Schedule 3,
   Form 1040, transfer statements, and any carryforward. Then run full-batch
   tests, local XSD, business rules, and ATS acceptance as separate gates.

The current Form 8826/8835/Form 3800 path covers named nonpassive and passive
slices of steps 1, 3, 4, and 5. Its native document is registered but unverified
in the deferred full test batch and is not ATS accepted.

Form 8912's routing is confirmed by
[Form 8912 line 12](https://www.irs.gov/pub/irs-pdf/f8912.pdf) and its
[instructions](https://www.irs.gov/instructions/i8912). It must be handled as a
separate tax-credit-bond limit and excluded from Form 3800 line 10b as specified
by the Form 3800 instructions.
