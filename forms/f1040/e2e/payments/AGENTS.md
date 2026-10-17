# e2e/payments

Whole-graph contracts for Payments lines. Only one exists today:

- `settlement/underpayment_penalty.test.ts` — runs `buildExecutionPlan` +
  `execute` over `registry` and checks Form 1040 line 38
  (`line38_underpayment_penalty`) and its addition to line 37, for a computed
  regular-method Form 2210 penalty and an explicit `f2210.underpayment_penalty`.
  Its subject, `f2210`, is homed in `nodes/inputs/taxes/underpayment/`; it sits
  here because the effect asserted is the amount owed.

Payments flows proven end to end elsewhere: line 35b–d direct deposit (and
its exclusion with Form 8888) in `../workflows/general_direct_deposit.test.ts` and
`../../2025/domains/payments/settlement/deposit_source_parity.test.ts`;
extension, line 26 and payment-request export gates in
`../../2025/domains/payments/settlement/*.test.ts`.

## Conventions here

- Assert lines on `result.pending.f1040` (the executor's pending), not on
  serialized XML or PDF; expected numbers must trace to an IRS source.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/e2e/payments`
- Section map: [../../nodes/inputs/payments/AGENTS.md](../../nodes/inputs/payments/AGENTS.md)
