# TY2025 Schedule J elected-income source inventory

Status: source work in progress. A Schedule F-only ordinary-rate election is
wired but unrun; the activity calculations for fishing and share-rent remain
isolated. No MeF/XSD, filled-PDF, IRS-rule, or ATS acceptance is claimed.

The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
require taxable income attributable to *all* farming and fishing businesses:
income, gains, losses, and deductions. The elected portion may be smaller, but
cannot exceed Form 1040 taxable income. A disposition of land or development,
grazing, or similar rights is excluded. Dispositions of regularly used business
property may qualify, subject to the cessation timing rule. At-risk and passive
loss limits precede the excess business loss limit; the part of an excess
business loss allocable to farming or fishing is not elected income. The
instruction's Form 8903 reference is retained here as a source category,
without assuming it applies to a 2025 return.

| IRS-listed source | Current source evidence and calculation | Boundary still needed |
| --- | --- | --- |
| Schedule F | The graph now receives computed Schedule F net, Schedule SE deduction, AGI, QBI and taxable income for a farm-only return. The isolated `schedule_j_farm_source.ts` guard remains a research helper. | Mixed farming/fishing sources, farm loss allocations, and other attributable deductions. |
| Schedule C fishing | `schedule_j_activity_sources.ts` recomputes the activity's at-risk net from a 2025 Schedule C item. It requires fishing code 114110, a business reference, catch sales record reference, and facts establishing harvested fish entering commerce. The [2025 Schedule C instructions](https://www.irs.gov/instructions/i1040sc) label 114110 Fishing. | Reconcile all Schedule C items and upstream wage-credit, home-office, and other routed adjustments to the final Schedule 1 line 3. Determine the attributable Schedule SE deduction and any further loss limit. |
| Form 4835 share-rent farm | `schedule_j_activity_sources.ts` recomputes nonnegative Form 4835 at-risk net, with a written production-share lease reference and timing facts. The Schedule J farming definition requires share-of-production rent and an agreement before significant tenant activity. | Reconcile Schedule E and Form 8582 across every passive activity. Current or prior passive losses are rejected by this activity component. A positive activity can still be offset elsewhere. |
| Form 1040 line 1a wages | No Schedule J attribution calculation. | Identify S-corporation farming/fishing shareholder wages or qualifying share-of-catch fishing-crew compensation from source documents. Ordinary wages do not qualify merely by assertion. |
| Schedule 1 line 15 | The farm-only guard allows an exclusively attributable Schedule SE deduction. | Allocate the deduction among fishing, farming, and unrelated self-employment when mixed. |
| Form 1040 line 15 CCF reduction | No attributable fishing reduction calculation. | Reconcile agreement-vessel earnings and excluded earnings described in the instructions. |
| Schedules D and Form 8949 | No Schedule J property-level attribution. | Identify business property, remove land/rights dispositions, trace net capital gain and unrecaptured section 1250 gain into lines 2b/2c and the required tax worksheets. |
| Schedule E Part II | No pass-through farming/fishing attribution. | Trace partnership or S-corporation activities, basis/at-risk/passive limits, and separately stated items. |
| Form 4797 | No Schedule J disposition attribution. | Establish regular substantial business use, cessation timing, applicable ordinary/capital character, and exclude land or rights. |
| Form 8903 | No 2025 attributable deduction calculation. | Establish applicability and allocation if present. |
| Other attributable deductions or loss limits | No general source ledger. | Include QBI and other business-attributable deductions where applicable, excess business loss treatment, and return-wide reconciliation. |

The new activity functions return recomputed **components**, not elected farm
income or a filing limit. Their evidence references identify records to review;
the functions do not authenticate those records. Neither function combines all
qualifying sources, allocates business deductions, or reconciles the final
return. The separately wired Schedule F-only route caps line 2a at computed
farm income after SE and QBI deductions and final taxable income. A broader
source ledger is still required before opening other routes.
