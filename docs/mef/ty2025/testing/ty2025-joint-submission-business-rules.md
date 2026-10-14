# Joint submission replay: local business-rule audit

October 12, 2026. This follows the five persisted returns in the
[joint submission replay](./ty2025-joint-submission-replay.md) and advances the
existing requirement to check business rules separately from structural XSD.
Production baseline: `7eff713201aa5e1cd4f25cc243c778d30a688688`.

The audit uses the CLI's normalized pending data, emitted-document scope,
field registry, header construction, and exclusion of transmission-only rules.
It also calls the actual export validator without force. No rule or production
filing guard was changed.

| Archived cases | Local pass | Reject | Skip | Unforced export |
| --- | ---: | ---: | ---: | --- |
| Joint cases 0–3, each | 643 | 20 | 1,221 | Blocked |
| Single energy-credit case 4 | 412 | 8 | 1,464 | Blocked |

Each report contains 1,884 return-level rules. Joint cases skip 1,170 rules
outside emitted scope and 51 server-only rules; the single case skips 1,413
outside scope and 51 server-only rules. No in-scope rule has a null checker.
A passing predicate can have an unmet antecedent, so these counts are neither
coverage percentages nor estimates of IRS ATS acceptance.

## Verified evaluator discrepancies

- F1040-377-12 through F1040-382-12 implement unconditional AGI ceilings,
  omitting the filing-status and qualifying-child conditions in their own rule
  text. None of these five XML returns contains Schedule EIC.
- F1040-017-01 and F1040-018-01 reject all four joint cases even though native
  Schedule B and Form 1040 both contain interest 1,700 and ordinary dividends
  3,000. `CalculatedTotalTaxableIntAmt` has no registry location;
  `TotalOrdinaryDividendsAmt` maps to an absent pending key.
- S1-F1040-195 cannot resolve `NetProfitOrLossAmt`. The four emitted Schedule C
  profits are 2,000, 4,000, −1,000 and −2,000; their sum equals the native
  Schedule 1 business-income total of 3,000 in every joint case.
- F5695-102 cannot resolve either limit field. Native credit 1,000 equals the
  smaller of the emitted adjusted limit 1,100 and tax capacity 1,000.
- IND-082 compares amount owed to refund; its text instead requires a present
  refund to be zero when an amount is owed. Each joint XML has an amount owed
  and no refund element.
- The CLI context reports filing status zero because pending stores `mfj` or
  `single` and the CLI accepts only a number. Native filing status is 2 or 1.
  The missing synthetic signature PIN remains a separate fixture limitation;
  this audit does not manufacture signatures or validate signature readiness.
- The globally keyed registry resolves `TotalIncomeAmt` to Form 1040 even for
  Form 8960 rules. Owner-copy and form-local field resolution need a broader
  audit; the remaining reported rule failures have not all been independently
  classified.

The joint reports also reject F8959-017, F8960-007/010/024-01/025/026,
IND-433, S2-F1040-014, SC-F1040-002-02 and SSE-F1040-021-04. Their full messages
and resolved field observations are retained, without assuming that every
failure is false. Repairs belong to deferred item 162; existing adoption-rule
item 94 remains separate.

## Reproduction and evidence

After generating the archive fixtures using the companion replay's documented
procedure, run:

```sh
deno run --allow-read --allow-write scripts/testing/audit-joint-submission-rules.ts .state/research/submission-joint-replay-2026-10-12
```

The typed audit writes `business-rule-results.json` beside the archived inputs
and XML. The local evidence directory also retains `business-rules.log` and
`business-rule-native-verification.json`, containing independent XML checks
and hashes for all five originals. Independent checks verified absence of EIC,
joint interest/dividend/business totals and absent refunds, and the energy
credit minimum. No source or archived XML was altered to obtain a pass.

The previous five return/manifest XSD pairs and 48 archive tests retain their
original scope. No new full-return PDF or accepted IRS acknowledgment was
created; packet totals are unchanged. The board's approximate 75% individual
ATS projection remains unchanged because this audit does not add an ATS
scenario denominator or establish IRS-side rule results.
