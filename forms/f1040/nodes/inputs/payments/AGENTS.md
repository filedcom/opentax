# Payments section map

Withholding credits, estimated and extension payments, refund and balance-due
instructions, and the administrative claims filed beside a 1040. Payments has
no node of its own under `nodes/intermediate/` or `nodes/outputs/`: every
amount lands on Form 1040 (`f1040`, lines 25c/26) or Schedule 3 Part II
(`schedule3`, lines 10/13a), both in General/return-assembly. Node conventions
and the add-a-node checklist: [../AGENTS.md](../AGENTS.md).

## Crosswalk

Paths are relative to this folder. Prefixes: `mef/` = [`../../../2025/mef/forms/payments/`](../../../2025/mef/forms/payments/),
`pdf/` = [`../../../2025/pdf/forms/payments/`](../../../2025/pdf/forms/payments/),
`dom/` = [`../../../2025/domains/payments/`](../../../2025/domains/payments/),
`rules/` = [`../../../validation/rules/payments/`](../../../validation/rules/payments/),
`docs/` = [`../../../../../docs/ty2025/domains/payments/`](../../../../../docs/ty2025/domains/payments/).
`ra/` = General/return-assembly (`f1040.ts`, `schedule3.ts` under
[mef](../../../2025/mef/forms/general/return-assembly/) and
[pdf](../../../2025/pdf/forms/general/return-assembly/)).

| IRS form                                                                                            | Input node (folder)                                                                   | Feeds                                                                                                              | MeF                                                                                                   | PDF                                                                                                   | Domain reconciliation                                                                                                                                                                                                                                      | E2E | Rules                                                                                                   | Research                                                                                                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1040-ES, Estimated Tax for Individuals                                                              | `f1040es` ([estimated/f1040es](estimated/f1040es/index.ts))                           | [`f1040`](../../outputs/general/return-assembly/f1040/index.ts) line 26                                            | `ra/f1040.ts`                                                                                         | `ra/f1040.ts`                                                                                         | [dom/settlement/estimated_payment_reconciliation.ts](../../../2025/domains/payments/settlement/estimated_payment_reconciliation.ts)                                                                                                                        | —   | [rules/settlement/fpymt.ts](../../../validation/rules/payments/settlement/fpymt.ts) (ES Payment Record) | —                                                                                                                                                 |
| 4868, Application for Automatic Extension                                                           | `ext` ([estimated/ext](estimated/ext/index.ts))                                       | [`schedule3`](../../intermediate/aggregation/general/return-assembly/schedule3/index.ts) line 10 → `f1040` line 31 | `ra/schedule3.ts` (no IRS4868)                                                                        | `ra/schedule3.ts`                                                                                     | [dom/settlement/extension_payment_reconciliation.ts](../../../2025/domains/payments/settlement/extension_payment_reconciliation.ts), [dom/refundable/schedule3_payment_sources.ts](../../../2025/domains/payments/refundable/schedule3_payment_sources.ts) | —   | —                                                                                                       | [docs/settlement/…extension-payment-source-gap.md](../../../../../docs/ty2025/domains/payments/settlement/ty2025-extension-payment-source-gap.md) |
| IRS Payment Record (electronic funds withdrawal request)                                            | `payment_request` ([settlement/payment_request](settlement/payment_request/index.ts)) | none; blocks export                                                                                                | —                                                                                                     | —                                                                                                     | [dom/settlement/payment_request_handoff.test.ts](../../../2025/domains/payments/settlement/payment_request_handoff.test.ts)                                                                                                                                | —   | [rules/settlement/fpymt.ts](../../../validation/rules/payments/settlement/fpymt.ts)                     | —                                                                                                                                                 |
| 9465, Installment Agreement Request                                                                 | `f9465` ([installments/f9465](installments/f9465/index.ts))                           | none; blocks export                                                                                                | [mef/installments/f9465_attached.ts](../../../2025/mef/forms/payments/installments/f9465_attached.ts) | [pdf/installments/f9465_attached.ts](../../../2025/pdf/forms/payments/installments/f9465_attached.ts) | —                                                                                                                                                                                                                                                          | —   | [rules/installments/f9465.ts](../../../validation/rules/payments/installments/f9465.ts)                 | [docs/installments/form9465/](../../../../../docs/ty2025/domains/payments/installments/form9465/ty2025-form9465-filing-boundary.md)               |
| 2439, Notice to Shareholder of Undistributed Long-Term Capital Gains                                | `f2439` ([investments/f2439](investments/f2439/index.ts))                             | [`schedule_d`](../../intermediate/aggregation/income/investments/schedule_d/index.ts); `schedule3` line 13a        | [mef/investments/f2439.ts](../../../2025/mef/forms/payments/investments/f2439.ts)                     | [pdf/investments/f2439.ts](../../../2025/pdf/forms/payments/investments/f2439.ts)                     | [dom/refundable/schedule3_line13a_source.ts](../../../2025/domains/payments/refundable/schedule3_line13a_source.ts)                                                                                                                                        | —   | [rules/investments/f2439.ts](../../../validation/rules/payments/investments/f2439.ts)                   | —                                                                                                                                                 |
| 8888, Allocation of Refund                                                                          | `f8888` ([refund/f8888](refund/f8888/index.ts))                                       | none (export only)                                                                                                 | [mef/refund/f8888.ts](../../../2025/mef/forms/payments/refund/f8888.ts)                               | [pdf/refund/f8888.ts](../../../2025/pdf/forms/payments/refund/f8888.ts)                               | [dom/refund/form8888/form8888_reconciliation.ts](../../../2025/domains/payments/refund/form8888/form8888_reconciliation.ts), [dom/settlement/deposit_source_parity.test.ts](../../../2025/domains/payments/settlement/deposit_source_parity.test.ts)       | —   | [rules/refund/f8888.ts](../../../validation/rules/payments/refund/f8888.ts)                             | —                                                                                                                                                 |
| 8379, Injured Spouse Allocation                                                                     | `f8379` ([refundable/f8379](refundable/f8379/index.ts))                               | none; blocks export                                                                                                | —                                                                                                     | —                                                                                                     | —                                                                                                                                                                                                                                                          | —   | [rules/refundable/f8379.ts](../../../validation/rules/payments/refundable/f8379.ts)                     | —                                                                                                                                                 |
| 8288-A, Statement of Withholding on Dispositions by Foreign Persons of U.S. Real Property Interests | `f8288` ([withholding/f8288](withholding/f8288/index.ts))                             | `f1040` line 25c                                                                                                   | `ra/f1040.ts`                                                                                         | `ra/f1040.ts`                                                                                         | [dom/withholding/f8288/](../../../2025/domains/payments/withholding/f8288/f8288_withholding_owner.ts) (owner + line 25c)                                                                                                                                   | —   | —                                                                                                       | —                                                                                                                                                 |
| 8805, Foreign Partner's Information Statement of Section 1446 Withholding Tax                       | `f8805` ([withholding/f8805](withholding/f8805/index.ts))                             | `f1040` line 25c                                                                                                   | `ra/f1040.ts`                                                                                         | `ra/f1040.ts`                                                                                         | [dom/withholding/f8288/f8288_withholding_reconciliation.ts](../../../2025/domains/payments/withholding/f8288/f8288_withholding_reconciliation.ts)                                                                                                          | —   | —                                                                                                       | —                                                                                                                                                 |
| 843, Claim for Refund and Request for Abatement                                                     | `f843` ([disputes/f843](disputes/f843/index.ts))                                      | none                                                                                                               | —                                                                                                     | —                                                                                                     | —                                                                                                                                                                                                                                                          | —   | —                                                                                                       | —                                                                                                                                                 |
| 8857, Request for Innocent Spouse Relief                                                            | `f8857` ([disputes/f8857](disputes/f8857/index.ts))                                   | none; not in registry                                                                                              | —                                                                                                     | —                                                                                                     | —                                                                                                                                                                                                                                                          | —   | —                                                                                                       | —                                                                                                                                                 |
| 8689, Allocation of Individual Income Tax to the U.S. Virgin Islands                                | —                                                                                     | —                                                                                                                  | —                                                                                                     | —                                                                                                     | —                                                                                                                                                                                                                                                          | —   | [rules/foreign/f8689.ts](../../../validation/rules/payments/foreign/f8689.ts)                           | —                                                                                                                                                 |

Reconciled under `dom/withholding/` but homed in Income (source node) or
Taxes: W-2 line 25a ([w2_withholding_reconciliation.ts](../../../2025/domains/payments/withholding/w2_withholding_reconciliation.ts));
1099-family line 25b ([f1099/](../../../2025/domains/payments/withholding/f1099/f1099_withholding_reconciliation.ts),
NEC owner [f1099n/](../../../2025/domains/payments/withholding/f1099n/f1099nec_withholding_owner.ts),
PATR owner [f1099p/](../../../2025/domains/payments/withholding/f1099p/f1099patr_withholding_owner.ts));
W-2G, trust K-1 box 13 code B and Form 8959 line 24 in line 25c
([trust-k1/](../../../2025/domains/payments/withholding/trust-k1/trust_k1_backup_withholding.test.ts),
research [docs/withholding/](../../../../../docs/ty2025/domains/payments/withholding/ty2025-w2g-withholding-attachment-gap.md)).
Form 1040 line 36 (overpayment applied to 2026) is a `general` input field
(`apply_overpayment_to_2026_estimated_tax_amount`), checked by
[dom/settlement/line36_estimated_tax_source.ts](../../../2025/domains/payments/settlement/line36_estimated_tax_source.ts).
The only payments E2E, [e2e/payments/settlement/underpayment_penalty.test.ts](../../../e2e/payments/settlement/underpayment_penalty.test.ts),
proves Form 2210 (`f2210`, homed in `inputs/taxes/underpayment/`).

## Flow

- Withholding: `f8288` (`amount_withheld`) and `f8805` (box 6, else box 8)
  emit `line25c_other_withheld`, an accumulable field also written by `w2g`
  (box 4) and `k1_trust`; `form8959` writes the separate
  `line25c_additional_medicare_withheld`. `f1040` adds both into line 25d → 33.
- Estimated: `f1040es` emits `line26_estimated_tax` = Q1–Q4 +
  `applied_from_prior_year` (not accumulable; it is the only writer).
  `f2210` takes its own `q*_estimated_payment` fields and never reads
  `f1040es`, so quarter amounts/dates there do not drive the penalty.
- Extension: `ext` emits `schedule3.line10_amount_paid_extension` only when
  `produce_4868 === "X"` and line 7 > 0 with matching `payment_evidence`.
  `schedule3` sums lines 9–12 and 13a into `line31_additional_payments` on `f1040`.
- Form 2439: box 1a → `schedule_d.line_11_form2439`, 1b →
  `line19_unrecaptured_1250`, 1d → `collectibles_gain_form2439` (Income);
  box 2 → `schedule3.line13a_tax_paid_by_ric_or_reit`. Box 1c > 0 throws
  (section 1202 exclusion not modeled). Canonical home is Payments; the
  capital-gain effect lands in Income.
- `f1040` computes line 33, 34/35a/37 and line 36 from the `general`
  election; lines 35a–37 are where `f8888`, `f9465` and `payment_request`
  attach, but none of those changes a computed line.
- Export gates live in [`../../../2025/return-processing/attachment_coverage.ts`](../../../2025/return-processing/attachment_coverage.ts):
  any `payment_request` or `f9465` or non-empty `f8379` blocks MeF and PDF.
  `f9465`'s MeF/PDF builders are staged and not in `mef/forms/index.ts` or
  `pdf/forms/index.ts`. `f843` and `f8857` produce nothing and are not gated.
- Every `dom/` guard is called by the MeF and PDF builders
  (`2025/mef/builder.ts`, `2025/pdf/builder.ts`) or by `ra/f1040.ts` /
  `ra/schedule3.ts`, so a value that computes but lacks a reviewed source
  fails at export, not in the graph.

## Input conventions here

- Array inputs (`isArray: true` in `2025/inputs.ts`): `f2439` → `f2439s`,
  `f8288` → `f8288s` (min 1; a repeated `stamped_copy_b_reference` is a Zod
  error), `f8805` → `f8805s` (min 1). All others are single objects.
- Bounded, fail-closed shapes: `f9465` (`.strict()`, all review literals
  `true`, line 37 balance ≤ $25,000, monthly ≥ balance/72), `f8888`
  (2–3 distinct `.strict()` accounts), `payment_request` (`.strict()`,
  distinct `request_reference`), `ext.payment_evidence` (2026-01-01 to
  2026-04-15, distinct references). Extend these deliberately; don't loosen.
- Domain codes not yet on `z.nativeEnum`: `payment_request.requests[].kind`,
  `f8379.debt_type` and the `f1040es` `quarter` fields use `z.enum([...])`.
- `f1040es` validates `quarter_payment_records` against `payment_q*` and
  re-checks a signed joint allocation (`reviewedJointAllocation`) whose PDF
  bytes must match `signed_agreement_pdf_sha256`;
  [agreed_payment.fixture.ts](estimated/f1040es/agreed_payment.fixture.ts)
  is reused by `2025/pdf/review_fixtures.ts`.
- Each node folder except `f1040es` and `payment_request` has
  `research/context.md`.

## Verify

- `bun test --timeout=1800000 forms/f1040/nodes/inputs/payments`
- `bun test --timeout=1800000 ./forms/f1040/2025/domains/payments` (two
  `deposit_source_parity` tests need the private 2025v5.4 XSD)
- `bun run check:structure` (`f8857` is a baselined `not-in-registry` entry)
- `bun run bench --form f1040 --year 2025` when a routed field changes.
