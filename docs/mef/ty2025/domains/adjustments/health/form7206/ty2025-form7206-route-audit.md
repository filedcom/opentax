# TY2025 Form7206 current route audit

## October10 source and filing boundaries

This reconciles the existing Form7206 parent and registered-form audit against
runtime `0c21d17ac`. It changes no tax calculation, approves no exclusion and
closes no parent task. Earlier one-plan-only descriptions are superseded.

| Public/source family | Calculation and return join | Native/PDF consequence | Limit on the evidence |
| --- | --- | --- | --- |
| `single_schedule_c_plan` | One positive owned C; computed half-SE; zero retirement; monthly eligible premiums capped by earnings; Schedule1/AGI/QBI. | One correctly owned7206; issued policy and twelve matching payment records required. | Legacy missing-record calculation remains staging-only; dependent/LTC/multi-business routes are not admitted. |
| `independent_schedule_c_plans`, C/C | Exactly two positive businesses, one per spouse; separate SE and income capacity; sum deductions once. | One copy per positive-profit business, including a zero health deduction; source and prepared rows must agree. | One plan/business per owner; excludes other unreviewed income and source families. |
| Independent C/F or F/F | Same owned inventory, with a permitted loss owner retaining policy records and zero deduction. | Copies for positive-profit businesses; no fabricated loss-owner SE or7206. | Regular cash-farm sources and reviewed WOTC/patron combinations; not optional-method support. |
| Independent patron plus `owned_sep_plans` | Custodian/owner/census/employer reviews determine attributable retirement; health line9 and QBI use that owner allocation. | Return validation replays owned SEP and patron sources before emitting health copies. | Broader SEP/SIMPLE/401(k), multiple businesses per owner and other employer relationships remain unproved. |
| `owned_sep_plans` without health | SEP source is computed through the shared node into Schedule1/AGI/QBI. | Validated retirement-only context emits no7206; retained inconsistent source cannot silently disappear. | Does not imply that a retirement contribution itself requires Form7206. |
| `pub974_single_business` | One identified taxpayer C, matched SE/retirement graph, policy months and WorksheetW/X/PTC iteration. | Reconciled Form8962 component outputs; no7206 document for Marketplace premiums. | The selected integration test constructs pending fields directly; it is not a complete public-entry return, XSD packet or visual review. |
| `self_employed_health_insurance` premium-only | Positive premiums and Marketplace overlap reject; zero premium produces no deduction. | No premium-only export bypass. | A guard is not an approved exclusion for otherwise applicable taxpayers. |

Policy checks bind issuer, policy number, owner/payer, covered person, real
payment date, premium and references. Independent plans also reject reused
payment evidence across plans. These are structured-record reconciliation
checks, not external source authentication. Employer review and public-safety
exclusion references have not become authenticated records through this work.

The current full-return reconciliation is deliberately narrower than pure
helpers: for example, a helper's retirement operand does not open nonzero
retirement in the scalar public route. Likewise, worksheet support for a
business kind does not establish that kind's public filing route.

## Authoritative code and verification scope

- [public node](../../../../../../../forms/f1040/nodes/intermediate/forms/adjustments/health/form7206/index.ts)
- [single-plan schema/calculator](../../../../../../../forms/f1040/nodes/intermediate/forms/adjustments/health/form7206/single-source.ts)
- [independent-plan calculator](../../../../../../../forms/f1040/nodes/intermediate/forms/adjustments/health/form7206/independent-owner.ts)
- [shared policy checks](../../../../../../../forms/f1040/nodes/intermediate/forms/adjustments/health/form7206/policy-records.ts)
- [complete-return reconciliation](../../../../../../../forms/f1040/2025/domains/adjustments/health/form7206/form7206_independent_owner_source.ts)
- [owned SEP source](../../../../../../../forms/f1040/nodes/inputs/adjustments/retirement/sep_retirement/owned-source.ts)
- [native descriptor](../../../../../../../forms/f1040/2025/mef/forms/adjustments/health/f7206.ts)
- [PDF descriptor](../../../../../../../forms/f1040/2025/pdf/forms/adjustments/health/f7206.ts)
- [native registry](../../../../../../../forms/f1040/2025/mef/forms/index.ts)
- [PDF registry](../../../../../../../forms/f1040/2025/pdf/forms/index.ts)
- [Marketplace component tests](../../../../../../../forms/f1040/2025/domains/credits/health/form8962/form8962_pub974_return.test.ts)
- [patron SEP integration tests](../../../../../../../forms/f1040/2025/domains/deductions/business/form8995a/form8995a_independent_patron_sep.test.ts)

The selected fresh regression comprises seven existing modules: mixed C/F,
mixed C/F loss owner, two-farm health, independent patron SEP, Publication974
return components, Publication974 worksheets, and legacy retirement calculation.
The three farm integration modules exercise7+6+7 existing complete fixtures;
the SEP integration module exercises seven existing fixtures. Their assertions
include local full Return1040 XSD and PDF construction, with owned amounts and
rejection checks. The Publication974 and legacy retirement modules are
component/calculation evidence. Do not count all passing test names as complete
filing routes.

Fresh terminal result: **57 passed, zero failed** across those seven modules
(2m43s), plus **three passed, zero failed** for the premium-only entry guard.
The27 existing complete fixtures rebuilt with full XSD and PDF construction.
CI for the same runtime also passed (run38035842224). Private logs, source
hashes and the seven regenerated SEP XML/PDF/source packets are retained in
`.state/research/form7206-route-audit-2026-10-10/`. This replay adds no new
return/page totals and makes no fresh visual-approval claim.
Prior PDF observations and qualifications remain in the linked Form7206 gap
checkpoints. No archive was transmitted and no IRS acceptance is claimed.

## Remaining scope

External insurer/payment/employer authentication, dependent or child coverage,
LTC person-age limits, multiple establishing businesses/plans per owner,
S-corporation shareholder wages, optional methods, wider Form2555/Marketplace
interactions and IRS business-rule/ATS acceptance remain open. Existing deferred
rounding104, names68, zeros76, positive-C choices86 and primary-owner zero-health
QBI evidence remain deferred. This audit implements none of those repairs.
