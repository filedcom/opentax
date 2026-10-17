# domains/payments/settlement

How the 2025 balance is settled: payments already made (line 26, Schedule 3
line 10), overpayment applied forward (line 36), refund deposit, and requests
that must leave the return entirely.

| Concern                                             | Module / test                                                                                             | Called from                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1040-ES, line 26                                    | [estimated_payment_reconciliation.ts](estimated_payment_reconciliation.ts) `assertEstimatedPaymentLine26` | `mef/` and `pdf/forms/general/return-assembly/f1040.ts`     |
| Form 4868 payment, Schedule 3 line 10 → lines 31–33 | [extension_payment_reconciliation.ts](extension_payment_reconciliation.ts) `assertExtensionPaymentSource` | `../../../mef/builder.ts`, `../../../pdf/builder.ts`        |
| Line 36 applied to 2026                             | [line36_estimated_tax_source.ts](line36_estimated_tax_source.ts) `assertLine36EstimatedTaxSource`         | both `f1040.ts` serializers                                 |
| Line 35b–d direct deposit, Form 8888 link           | [deposit_source_parity.test.ts](deposit_source_parity.test.ts)                                            | (test only)                                                 |
| `payment_request`                                   | [payment_request_handoff.test.ts](payment_request_handoff.test.ts)                                        | gate in `../../../return-processing/attachment_coverage.ts` |
| `amendment_request` (General node)                  | [amendment_request_handoff.test.ts](amendment_request_handoff.test.ts)                                    | same gate                                                   |

## Rules found in the code

- Line 26 is all-or-nothing on source: a nonzero filed amount needs
  `pending.f1040es`; any quarter payment needs `quarter_payment_records`
  whose `payer_tin` is the taxpayer (or MFJ spouse); a positive
  `applied_from_prior_year` always throws (no accepted-2024-return evidence
  path yet).
- Joint 1040-ES allocations: MFS (`filing_context`) needs both current
  spouse SSNs on `general` and `f1040`; divorced (`former_spouse_ssn`) needs
  single/HOH and no spouse. The guard returns the former-spouse SSN for the
  line 26 print.
- Extension: `produce_4868 === "X"`, evidence `amount` = line 7 = Schedule 3
  line 10, evidence SSNs = filer (spouse only on MFJ), and line 31 = Schedule 3
  line 15, line 33 = 25d + 26 + 32. No standalone Form 4868 is serialized.
- Line 36 comes only from `general.apply_overpayment_to_2026_estimated_tax_amount`;
  line 35a must equal max(0, line 34 − round(line 38)) − line 36.
- `payment_request` and `amendment_request` keep their intent in pending
  and block both MeF and PDF export; malformed intent must not vanish.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/domains/payments/settlement`
- `deposit_source_parity.test.ts` needs `xmllint` and the private 2025v5.4
  `Return1040.xsd`; it fails without them.
- Section map: [../../../../nodes/inputs/payments/AGENTS.md](../../../../nodes/inputs/payments/AGENTS.md)
