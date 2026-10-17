# TY2025 research — Adjustments

Internal research for the Adjustments section: IRS sources read, source
routes built, and what each checkpoint did or did not verify. Not published;
not a benchmark source (cases cite IRS publications). Section map:
[../../../../forms/f1040/nodes/inputs/adjustments/AGENTS.md](../../../../forms/f1040/nodes/inputs/adjustments/AGENTS.md).

| Document | Contents |
| --- | --- |
| [employment/form2106/ty2025-form2106-gap.md](employment/form2106/ty2025-form2106-gap.md) | Form 2106 checkpoints: reservist trips and federal limits, performing artist, impairment → Schedule A, travel/mileage/reimbursement, multiple fee-basis jobs |
| [health/form7206/ty2025-form7206-gap.md](health/form7206/ty2025-form7206-gap.md) | Form 7206 source-to-filing gap log, dated checkpoints (start here) |
| [health/form7206/ty2025-form7206-route-audit.md](health/form7206/ty2025-form7206-route-audit.md) | table of every Form 7206 source family, its return join and native/PDF consequence |
| [health/form7206/ty2025-form7206-single-policy-review.md](health/form7206/ty2025-form7206-single-policy-review.md) | one-plan route needs issued policy plus twelve monthly premium records |
| [health/form7206/ty2025-form7206-policy-inventory-review.md](health/form7206/ty2025-form7206-policy-inventory-review.md) | policy/payment reconciliation extended to two Schedule C proprietors |
| [health/form7206/ty2025-form7206-independent-spouse-plans-review.md](health/form7206/ty2025-form7206-independent-spouse-plans-review.md) | MFJ spouses with separate businesses and plans; per-owner limits, joint Form 8995 rows |
| [health/form7206/ty2025-form7206-spouse-medicare-qbi-review.md](health/form7206/ty2025-form7206-spouse-medicare-qbi-review.md) | spouse Medicare premiums and the joint Form 8995 health branch |
| [health/form7206/ty2025-form7206-employer-excluded-zero-review.md](health/form7206/ty2025-form7206-employer-excluded-zero-review.md) | all months employer-eligible: zero deduction, no Form 7206 filed |
| [health/form7206/ty2025-form7206-schema-import-cycle-review.md](health/form7206/ty2025-form7206-schema-import-cycle-review.md) | why the one-plan schema lives in `form7206/single_source.ts` (7206/8995 import cycle) |
| [health/ty2025-independent-patron-owner-health-source.md](health/ty2025-independent-patron-owner-health-source.md) | patron farm owners' health source alongside Forms 8995/8995-A |
| [health/form8853/ty2025-form8853-gap.md](health/form8853/ty2025-form8853-gap.md) | Form 8853 coverage boundary: Archer contributions/distributions, Medicare Advantage MSA (sole and MFJ), LTC Section C, acceptance cases |
| [health/form8889/ty2025-form8889-paired-hsa-gap.md](health/form8889/ty2025-form8889-paired-hsa-gap.md) | two-spouse HSA boundary and complete-return checkpoints |
| [health/form8889/ty2025-form8889-1099sa-source-gap.md](health/form8889/ty2025-form8889-1099sa-source-gap.md) | 1099-SA box 1/code 2 to Form 8889 line 14a |
| [health/form8889/ty2025-form8889-age65-exception-gap.md](health/form8889/ty2025-form8889-age65-exception-gap.md) | age-65 exception from the 20% tax (line 17a/b) |
| [health/form8889/ty2025-form8889-disability-exception-gap.md](health/form8889/ty2025-form8889-disability-exception-gap.md) | disability exception from the 20% tax |
| [health/form8889/ty2025-form8889-code2-excess-gap.md](health/form8889/ty2025-form8889-code2-excess-gap.md) | employer excess returned to one owner (code 2) |
| [health/form8889/ty2025-form8889-paired-prior-excess-code2-gap.md](health/form8889/ty2025-form8889-paired-prior-excess-code2-gap.md) | prior-year excess on one spouse, code-2 return on the other |
| [health/form8889/ty2025-form8889-medicare-mixed-month-gap.md](health/form8889/ty2025-form8889-medicare-mixed-month-gap.md) | Medicare enrollment mid-year in a paired return |
| [health/form8889/ty2025-form8889-prior-funding-eligibility.md](health/form8889/ty2025-form8889-prior-funding-eligibility.md) | last-month rule and IRA funding testing-period failures (Part III) |
| [retirement/ty2025-independent-patron-owned-sep-source.md](retirement/ty2025-independent-patron-owned-sep-source.md) | owned SEP contributions for patron farms (Pub 560 limits, employee census) |

## Conventions

- Documents are dated checkpoint logs, not ordered strictly by date: read
  each heading's date. A later checkpoint supersedes an earlier "unrun" or
  "build pass" label only where it says so.
- Node-level IRS field research lives beside each node in
  `research/context.md`, not here.
