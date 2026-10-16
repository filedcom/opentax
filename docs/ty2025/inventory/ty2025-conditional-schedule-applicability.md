# TY2025 conditional schedules: 8995-A A-D and 1116 C

October 12 source-summary reconciliation: Schedule A-D rows now link the
current source and filled-packet checkpoints rather than the older single-source
boundaries. Registry membership and official filing triggers are unchanged;
no whole-form support or approved exclusion follows.

October 10 live reconciliation: **158 native / 118 PDF entries**, with
**153 / 115 distinct pending keys**. The added Form8853 multiple-payee
statement shares its parent's key and PDF renderer. All four Form8995-A
companions remain registered in both live arrays; Form1116 Schedule C is absent
from both. The retained registry/root snapshot is
`.state/research/registry-reconciliation-2026-10-10/audit.json`.
This corrects the total below without changing the conditional dispositions.

October 9 registry reconciliation: the five newly counted descriptors are Form 8886 and its two continuations, plus two Form 4562 election statements. They do not change the conditional Form 8995-A Schedules A–D or staged Form 1116 Schedule C dispositions below. Native/PDF inventories are now 157/118 entries (153/115 distinct keys); registration does not resolve the remaining source and filing triggers.

Static source and schema audit, reconciled 2026-10-02. This records **conditional filing
triggers**, not blanket implementation or exclusion. The locally cached TY2025 v5.4
`ReturnData1040.xsd` permits one each of `IRS8995AScheduleA`, `B`, `C`, and `D`,
and unbounded `IRS1116ScheduleC` documents. Their individual XSDs live under
`Shared/IRS8995ASchedule[A-D]/` and `Shared/IRS1116ScheduleC/`. Schedules A, B,
C and D now have separate bounded registered native and PDF descriptors. Form
1116 Schedule C remains unregistered for filing with only a staged source/XML
projection. The historical October2 bulk status predates the later retained
XSD/PDF checkpoints below; broader IRS-rule and ATS acceptance evidence remains
pending.

| Registry and public-trigger state | Roots | Count |
| --- | --- | ---: |
| Bounded native and PDF companion registered | `IRS8995AScheduleA`, `B`, `C`, `D` | **4** |
| Public source/parent trigger, staged XML only, export blocked | `IRS1116ScheduleC` | **1** |
| Literal-free among these five | None | **0** |
| Rows with open source/scope decisions, including wider registered branches | All five | **5** |
| Whole-form or all-trigger support established by this audit | None | **0** |

The registered Form 8995-A parent detects Schedule A from
`sstb_filing_details`, Schedule B from `aggregation_filing_details` or
`aggregation_groups`, Schedule C from a negative business QBI entry, and
Schedule D from `patron_of_specified_cooperative`. It requires the matching
pending companion or rejects an orphan companion, and reconciles the bounded
parent deduction to Form 1040 line 13. The four companions are also in the
PDF registry. Broader SSTB, aggregation, loss, and cooperative triggers remain
outside those bounded routes. The public `form1116_schedule_c_source.ledgers`
deposits `foreign_tax_redeterminations` into Form 1116; both its MeF and PDF
parent exporters reject the triggered route. The source does not itself
authenticate affected-year filed returns or detect an unentered foreign-tax
event. Registration before that evidence and affected-year amendment decision
would be premature.

| Native root         | Official TY2025 trigger                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Local evidence and open source/output path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IRS8995AScheduleA` | Complete for an SSTB when taxable income **before** QBI deduction is above $197,300 and at most $247,300, or above $394,600 and at most $494,600 for MFJ. Use Part I for non-PTP SSTBs and Part II for PTP SSTBs. Below the threshold, Form 8995 generally applies unless the cooperative-patron rule requires 8995-A; above the phase-in ceiling, SSTB QBI is excluded. [IRS 2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a). | Reviewed accounting, legal, medical, consulting, financial, brokerage, investment-management, actuarial, performing-arts, athletic and reviewed endorsement/identity-licensing/appearance sources bind receipts/classification, payroll, owner SE and investment income. Native/PDF packets cover these sources; saved-source replay covers all68 retained cases. A separate468-case native-only zero-boundary audit rejects4,416 source alterations and preserves39 known MFS rounding discrepancies; it adds no reviewed PDF pages. Presentation and preparation-after-error qualifications remain deferred. PTP, multiple businesses, wider sources and acceptance remain open. See [source and packet checkpoints](../domains/deductions/business/form8995/ty2025-form8995a-gap.md). |
| `IRS8995AScheduleB` | Complete when the taxpayer qualifies and elects to aggregate multiple trades or businesses; report the aggregation each subsequent year unless disqualified, including an RPE aggregation held directly or indirectly. Complete before Form 8995-A Part I. [IRS 2025 instructions](https://www.irs.gov/instructions/i8995a). | Direct and RPE source groups reconcile election/relationship evidence, ownership, phase-in/full limits, investment-income caps, parent tax and disclosure packets. Names-only elections remain insufficient. Wider groups/elections, authenticated source statements and IRS acceptance remain open. See [source and packet checkpoints](../domains/deductions/business/form8995/ty2025-form8995a-gap.md). |
| `IRS8995AScheduleC` | Complete before Form 8995-A Part I if **any** trade, business or aggregation has a current-year qualified business loss, or there is a prior-year qualified business net loss carryforward, even if previously unreported or the originating business ended. Allocate netted loss among profitable trades in proportion to their QBI; line 6 carries to the following year. [IRS 2025 instructions](https://www.irs.gov/instructions/i8995a). | Proportional loss allocation, status/owner, cent payroll and investment checkpoints retain complete native/PDF returns. Existing net-zero/negative full-export guard and prior filed-loss provenance remain open; signed SE, broker and tax qualifications are separately deferred. See [source and packet checkpoints](../domains/deductions/business/form8995/ty2025-form8995a-gap.md). |
| `IRS8995AScheduleD` | A patron of a **specified** agricultural or horticultural cooperative claiming a QBI deduction related to the cooperative must complete Schedule D. The patron reduction uses the lesser of 9% of QBI allocable to qualified payments and 50% of W-2 wages allocable to those payments, and flows to Form 8995-A Part II line 14. [IRS 2025 instructions](https://www.irs.gov/instructions/i8995a). | Owned farm/Schedule C checkpoints retain rendered parent/companion packets, box6 claims, phase-in and income-cap joins. HOH/QSS/MFS adds21 XSD-valid returns/311 qualified pages,21 independent final-tax matches and462 export rejections; MFS requires actual spouse, noncommunity-property and deduction review. Proprietor W-2 jobs add12 XSD-valid returns/186 qualified pages,12 independent final-tax matches,150 passing tests and296 export rejections; only the actual proprietor’s wages offset that owner’s SE base. Owned interest/dividend distributions add12 XSD-valid returns/198 qualified pages with independent preferential-tax/NIIT matches and408 export rejections. Multiple cooperatives, wider business/owner combinations, source authentication and IRS acceptance remain open. See [source and packet checkpoints](../domains/deductions/business/form8995/ty2025-form8995a-gap.md). |
| `IRS1116ScheduleC`  | Any taxpayer with a section 905(c) foreign-tax redetermination in the current year must attach a separate Schedule C **for each affected income category** to that year's U.S. return, even when U.S. tax liability is unchanged. A changed prior-year U.S. liability also requires an amended return for that affected year. Annual reporting for a contested-tax provisional credit is in Part V; an initial provisional-credit claim also needs Form 7204. Additional prior-year foreign tax paid by a cash-basis taxpayer is generally reported on current-year Form 1116 Part II, not Schedule C Part I. [IRS December 2025 Schedule C instructions](https://www.irs.gov/instructions/i1116sc). | A typed redetermination ledger and staged Schedule C Parts I-IV XML projection can check a narrow 2023/2024 affected-year arithmetic route, but neither is registered for export. Authenticated filed Form 1116/Schedule 3/1040, foreign payment/refund, later-year attribute and amended-return evidence remains absent. The XSD allows multiple category documents and Part V contested-tax detail. Complete source and affected-year decisions before one native document per category can be filed; do not infer absence from an unchanged current-year credit. |

No row is a blanket attachment for every Form 1040. Conversely, a positive
trigger needs a source-backed schedule or an explicit fail-closed path. The
parent 8995-A MeF guard covers the numerical SSTB, aggregation and loss inputs
it currently accepts; all four companions retain bounded source and filled-PDF
checkpoints, with wider source/owner/conditional branches still open. The current Form 1116 path does not independently detect
every Schedule C redetermination. These are open source/filing decisions, not
user-approved exclusions.
