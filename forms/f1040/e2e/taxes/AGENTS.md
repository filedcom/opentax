# e2e/taxes

Whole-return contracts for Taxes forms: inputs run through the real registry,
planner and executor, then checked in return lines, MeF XML and/or PDF.
Counterparts for every form: [section map](../../nodes/inputs/taxes/AGENTS.md).

| Folder                         | Covers                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `amt/form6251/`                | long-term contracts (one and two), mining costs, mixed depletion, two trust adjustments |
| `employment/form4137/`         | Form 4137 tips                                                                          |
| `employment/form8959/`         | Form 8959 employment sources, Schedule SE sources, public export                        |
| `income-averaging/schedule-j/` | farm-only Schedule J                                                                    |
| `investments/form8615/`        | Form 8615                                                                               |
| `other/tax_table_2025.test.ts` | the 2025 Tax Table (`income_tax_calculation`)                                           |
| `passthrough/form8978/`        | Form 8978                                                                               |
| `retirement/form4972/`         | Form 4972 Part II                                                                       |

No e2e folder yet for Schedule 2 as a whole, 8919, 8960, Schedule H, Schedule
SE alone, 5329, 4255/8611/8828, 965-A or 2210/2210-F; those forms are
exercised by the return tests in `../../2025/domains/taxes/`.

## Verify

- `bun test ./forms/f1040/e2e/taxes --timeout=1800000`
- XML assertions need `xmllint` and the private `Return1040.xsd` under
  `.state/research/docs/IMF_Series_2025v5.4/`; without it the Form 8959 tests
  fail with "failed to load external entity" and some cases skip. Report
  those as unverified.
