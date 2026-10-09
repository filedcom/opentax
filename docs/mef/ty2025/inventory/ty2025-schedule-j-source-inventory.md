# TY2025 Schedule J elected-income source inventory

Status: current code reviewed at `e8891d64b`, October 9. Live source replay includes retained fishing/farm, joint-owner SE/QBI and sourced nonfarm income combinations. The [current route index](../domains/taxes/income-averaging/ty2025-schedule-j-integration-gap.md) links the later scoped XSD/PDF evidence. Its historical results are not a fresh replay; the full current-branch attempt stopped at a Form 4562 test-call type error before runtime tests. Broader attribution, source authenticity, IRS rules and acceptance remain open.

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
| Schedule F | Live source replay joins computed cash Schedule F profit, owner SE, QBI and final taxable income, including bounded C/F and two-farm fishing combinations. The older standalone farm helper is not the complete filing boundary. | Farm loss allocations, broader activities and other attributable deductions. |
| Schedule C fishing | Live source replay verifies one commercial catch-sales/supplies ledger against retained SHA-256 bytes, owner/business, filed Schedule C and computed profit; it joins actual SE/QBI and final tax for bounded fishing-only and mixed C/F routes. | Additional Schedule C items, fishing payroll/property limits, upstream credits/home-office, other expenses and further loss limits need their own source reconciliation. |
| Form 4835 share-rent farm | `schedule_j_activity_sources.ts` recomputes nonnegative Form 4835 at-risk net, with a written production-share lease reference and timing facts. The Schedule J farming definition requires share-of-production rent and an agreement before significant tenant activity. | Reconcile Schedule E and Form 8582 across every passive activity. Current or prior passive losses are rejected by this activity component. A positive activity can still be offset elsewhere. |
| Form 1040 line 1a wages | A separately sourced nonfarm employer/W-2 route participates in current tax and SE reconciliation while excluding those wages from elected business income. Qualifying wage attribution is not established. | Identify S-corporation farming/fishing shareholder wages or qualifying share-of-catch fishing-crew compensation from source documents. Ordinary wages do not qualify merely by assertion. |
| Schedule 1 line 15 | Actual same-owner mixed C/F allocations and distinct joint-owner Schedule SE deductions reconcile to the election and QBI source rows. | Broader unrelated self-employment and additional-owner/activity allocations remain open. |
| Form 1040 line 15 CCF reduction | No attributable fishing reduction calculation. | Reconcile agreement-vessel earnings and excluded earnings described in the instructions. |
| Schedules D and Form 8949 | No Schedule J property-level attribution. | Identify business property, remove land/rights dispositions, trace net capital gain and unrecaptured section 1250 gain into lines 2b/2c and the required tax worksheets. |
| Schedule E Part II | No pass-through farming/fishing attribution. | Trace partnership or S-corporation activities, basis/at-risk/passive limits, and separately stated items. |
| Form 4797 | No Schedule J disposition attribution. | Establish regular substantial business use, cessation timing, applicable ordinary/capital character, and exclude land or rights. |
| Form 8903 | No 2025 attributable deduction calculation. | Establish applicability and allocation if present. |
| Other attributable deductions or loss limits | Retained simplified and advanced QBI rows join actual C/F profit, half-SE, owner identity and bounded farm payroll/UBIA; qualifying current/prior tax worksheets and a separate no-election AMT refigure are retained. | Other attributable deductions, loss/NOL allocation and broader combinations remain open. |

The standalone activity helpers return components, not general filing eligibility. Share-rent remains at that component boundary. The later live fishing replay is distinct: retained bytes bind the entered operator ledger, but do not authenticate buyer/supplier issuance or prior IRS acceptance. Current native/PDF source replay and the form-specific proof records determine the supported combinations; registration, historical build notes and a positive aggregate alone do not close the broader source-ledger task.
