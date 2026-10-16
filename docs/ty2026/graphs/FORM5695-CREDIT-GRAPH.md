# TY2026 Form 5695 carryforward and credit ordering

Sources: the pinned [2026 draft Form 5695](../corpus/draft/f5695.pdf), its
[2026 draft instructions](../corpus/draft/i5695.pdf) (SHA-256
`1efab06c78f27ce81c7f3ee0335a91e7a195c2702f35d908609e4cfee0db4bf0`), and the
pinned [2026 draft Schedule 8812 instructions](../corpus/draft/i1040s8.pdf). The
current draft Form 5695 has one printed page, six AcroForm fields, and only four
amount lines. The prior-year Form 5695 expense and Part II inputs are no longer
its 2026 filing surface.

## Current implementation (October 15, 2026)

The registered `f5695` source claim holds the latest reviewed 2025 return and
Form 5695 references, both prior return owners, and printed lines 13-16. Lines
15 and 16 must reconcile to the available credit and tax limit. The current
return supplies its identity through `general`; unchanged individual ownership
or the same joint-return pair is supported. Changed ownership requires an
allocation route that is not implemented. Current-year expenses, asserted tax
limits and calculated credit overrides are rejected by the public schema.

The source review excludes nonrefundable credits other than child/dependent,
dependent-care and education credits. A child-credit claim with energy must
reference the same energy inventory and omit its contradictory no-energy answer.
This is a supported source subset, not full credit parity.

```text
general + prior Form 5695 -> f5695 source
care + education + W-2 excess SS -> schedule3 preliminary sources
                                         |
tax + AMT + earnings + EIC + payroll ------+--> f8812 resolution
                                              |
                         Worksheet B through line 14, when required
                                              |
                         Form 5695 credit and unused 2027 amount
                                              |
                         Worksheet B line 15 -> final CTC / ACTC
                                              |
                         schedule3_final -> Form 1040 lines 20 / 31
```

`f8812` performs the credit resolution atomically. The shared 2025 child-credit,
earned-income and Worksheet B arithmetic is reused with 2026 configuration and
whole-dollar worksheet rounding; 2025 defaults are unchanged. The shared Form
5695 Part I helper receives only the validated carryforward and internally
computed limit, never new expenses. Schedule 3 reuses shared totals after the
resolution, avoiding a graph dependency cycle and duplicate settlement amounts.
The preliminary Schedule 3 node retains `pre_credit_calculation_2026`; the final
node retains the calculation consumed by the PDF bundle.

| Printed line | Current source or calculation |
| --- | --- |
| 1 | Validated 2025 Form 5695 line 16 |
| 2 | Tax including AMT, less allowed care/education and the reserved child-credit amount, floored at zero |
| 3 | Smaller of lines 1 and 2; Schedule 3 line 5a |
| 4 | Line 1 less line 3; retained 2027 carryforward with source and owner references |

With qualifying children, Worksheet B line 14 reserves the nonrefundable portion
before energy. Its line 15 feeds the allowed energy credit back into Worksheet
A to finalize CTC and ACTC. With only other dependents, the regular ODC amount
has priority. With no dependents or fully phased-out child credit, no child
credit is reserved. The three-child payroll branch requires actual W-2 boxes
4/6, finalized EIC/excess withholding and the existing Medicare/SE workpaper.
Unknown payroll values are never replaced with guessed withholding.

The PDF builder replays this calculation and checks Form 1040 lines 18/19,
Schedule 3 line 5a and filer identity. Its pinned draft SHA-256 is
`f01a8e0555c804f5fd9460ba9e19172549f8c311661ab8d0107bd560f63ea586`.
Six canonical widgets map name/SSN (`f1_01`, `f1_02`) and lines 1-4 (`f1_3`
through `f1_6`). The cover is removed and the single static development page is
attached as sequence 75, after Form 8960 and before Form 3903. A positive prior
carryforward always attaches, including when tax capacity is zero; line 4 is
blank when the carryforward is fully used.

## Verification and remaining work

Focused tests independently check Worksheet B ordering, partial/full/unused
carryforward, ODC, phaseout, care/education/AMT offsets, ACTC opt-out, payroll,
rounding at the branch boundary, ownership and prior-line reconciliation,
source rejection and final graph routing. PDF tests check destination and owner
mismatches, attachment ordering and reopened field/annotation absence. Four
synthetic bundles (23 pages) were rendered and visually inspected. The 751-test
2026/shared 8812/5695 regression run and 137-test unit verification passed; the
added attachment-order test also passed.

The [2026 draft instructions](https://www.irs.gov/pub/irs-dft/i5695--dft.pdf)
and [Schedule 8812 instructions](https://www.irs.gov/pub/irs-dft/i1040s8--dft.pdf)
were rechecked for this implementation. Full source parity still requires
ownership-allocation support, the other competing nonrefundable credits and
remaining child-credit source cases. Final IRS artifacts, current MeF/business
rules, public filing registration and ATS acceptance remain open. Scenario 1's
$200 carryforward can use this route once the missing prior-return provenance
is supplied; it is not evidence that the full ATS scenario is accepted.


## Internal adoption priority (October 16)

An adoption source now triggers Worksheet B alongside energy. The atomic
resolver computes adoption using the reserved child-credit amount, then reduces
energy capacity by the allowed nonrefundable adoption credit. Worksheet B line
15 includes both credits; only adoption's nonrefundable share reduces this tax
limit. Energy reviews require the matching adoption inventory and the broader
reviewed-source answer, including zero allowed adoption cases. Form 1062 replays
this order at hypothetical tax. The [2026 draft instructions](https://www.irs.gov/pub/irs-dft/i5695--dft.pdf)
expressly include Schedule 3 line 6c in the energy credit limit. Public adoption
intake and its full PDF bundle remain pending.
