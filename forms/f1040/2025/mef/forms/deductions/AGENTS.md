# 2025/mef/forms/deductions

MeF serializers for deductions, all in `../index.ts` (`ALL_MEF_FORMS`).
Section map: [../../../../nodes/inputs/deductions/AGENTS.md](../../../../nodes/inputs/deductions/AGENTS.md).

| Folder                            | `pendingKey`                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `itemized/`                       | `schedule_a`; derived via `sourcePendingKeys: ["schedule_a"]`: `schedule_a_other_tax_statement`, `schedule_a_line8b_seller_statement`, `schedule_a_line16_estate_statement`   |
| `charitable/f8283/`               | `f8283`; derived: `form8283_vehicle_statement`, `form8283_fmv_reduction_statement`                                                                                            |
| `casualty/`, `investments/f4952/` | `form4684`, `form4952`                                                                                                                                                        |
| `business/`                       | `form4562`, `form4562_election_out`, `form4562_reduced_bonus_election`, `form_8829`, `form8990`, `form8995` (`f8995/`), `form8995a` + `form8995a_schedule_a`–`_d` (`f8995a/`) |
| `additional/schedule1a/`          | `schedule1a`                                                                                                                                                                  |

## Conventions verified here

- `pendingKey` is the node type serialized, including input `f8283` and
  legacy `form_8829`. Form 1098 has no serializer: `itemized/schedule_a.ts`
  imports the `assertForm1098*` and refinance-points guards from the nodes.
- Cross-form checks read `context.pending` (`f4562.ts` parses pending
  `schedule_c` and requires `schedule1`, `f1040`).
- Empty `FIELD_MAP` (XML built by hand, so business rules see none of their
  elements): `f4684.ts`, `f8283/*`, `f8995/f8995.ts`, `f8995a/*`,
  `schedule1a.ts`, the three Schedule A statements.
- `itemized/schedule_a.ts`'s XSD comment still cites "§2025v3.0".

## Verify

- `bun test --timeout=1800000 ./forms/f1040/2025/mef/forms/deductions/`
- `bun test --timeout=1800000 ./forms/f1040/2025/mef/xsd_validation.test.ts`
  (private XSD; see `../../AGENTS.md`).
