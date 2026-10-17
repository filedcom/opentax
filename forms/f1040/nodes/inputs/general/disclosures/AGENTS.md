# nodes/inputs/general/disclosures/

Disclosure and election statements attached to a return. None of them
computes or routes a tax amount: every node returns `outputs: []` after
parsing.

| Node    | Form                                         | Input shape                                                                 | Export          |
| ------- | -------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| `f4547` | 4547 Trump Account Election(s)               | `{ requests: [...] }`, strict, ≤100, one per `child_ssn`                    | blocked         |
| `f8082` | 8082 Notice of Inconsistent Treatment or AAR | array input → `{ f8082s: [...] }`, one row per inconsistent K-1 item        | blocked         |
| `f8275` | 8275 / 8275-R Disclosure Statement           | single object; `disclosure_type` `position` (8275) or `regulation` (8275-R) | blocked         |
| `f8594` | 8594 Asset Acquisition Statement (§1060)     | single object; `party_type`, sale price, classes I–VII                      | not a CLI input |

The forms are independent: nothing routes between them, and none of them
feeds another section. Gain from a §1060 sale reaches Schedule D / Form 4797
through the seller's own income inputs, not through `f8594`.

Traps:

- Blocked means `../../../../2025/return-processing/attachment_coverage.ts`
  rejects MeF and PDF export whenever the input is present; there is no
  serializer to fall back on. Adding one requires registering it and
  removing the block, then updating
  `../../../../e2e/workflows/unregistered_attachment_export.test.ts`.
- `f4547` pilot-only requests (`pilot_contribution_requested` without
  `initial_account_requested`) need `existing_account_reference`.
- `f8275` is not in `2025/registry.ts` (baselined) yet is a CLI input.
  `f8594` is the reverse (registered, baselined unreachable).
- Rule files: `../../../../validation/rules/general/submission/disclosures/`.

## Verify

- `bun test ./forms/f1040/nodes/inputs/general/disclosures --timeout=1800000`
- `bun test ./forms/f1040/e2e/workflows/unregistered_attachment_export.test.ts --timeout=1800000`

Section map: [../AGENTS.md](../AGENTS.md)
