# TY2025 ATS emitted-value checkpoint — October 10, 2026

The ATS replay now observes **54 selected numeric fields from actual prepared
XML**, separately from the74 calculation comparisons and document-copy counts.
The comparison runs after public execution, native preparation and the existing
attachment-manifest check; blocked preparation produces `not-evaluated` rows.
All131 prior ledger observations remain identical as JSON objects.

| Scenario | Match | Different | Field absent | Not evaluated |
| --- | ---: | ---: | ---: | ---: |
| 1040-01 | 0 | 0 | 0 | 2 |
| 1040-02 | 0 | 0 | 0 | 2 |
| 1040-03 | 0 | 0 | 0 | 6 |
| 1040-04 | 2 | 0 | 0 | 0 |
| 1040-05 | 2 | 0 | 1 | 0 |
| 1040-08 | 0 | 0 | 0 | 9 |
| 1040-12 | 0 | 0 | 0 | 11 |
| 1040-13 | 12 | 6 | 1 | 0 |

Totals: **16 match,6 different,2 absent,30 not evaluated**. The ledger now has
**185 observations** across four separate kinds; no combined pass percentage
is meaningful. The calculation anchor remains46/63 evaluated nonprovisional
matches(73.0%), and the board's projection stays **about75%**, range50–85%.
Adding observations does not improve production behavior.

The six differences occur in Scenario13: Form1040 taxable income1,620/120,
regular tax162/11 and nonrefundable credits162/11; Form6251 income less
deductions1,620/120, deduction addback30,000/31,500 and regular tax162/11
(expected/actual). They retain the same issued-packet/current-law conflict
already recorded in the calculation ledger. Native zero ACTC for the opted-out
Scenario5 return and zero AMT foreign credit for Scenario13 are absent fields.
These omissions are observations, not automatic filing-rule violations; no new
production defect or deferred repair is asserted.

The explicit field map covers direct numeric children of single-copy IRS1040
and IRS6251 documents under Return/ReturnData. The parser distinguishes an
absent field from transmitted zero, and rejects malformed XML, repeated roots
or fields, nested substitute fields, noninteger text and unsafe numeric values.
It never fills values from calculated pending data. Boolean indicators, owner
identities, repeated-owner forms, other roots and unmapped target paths remain
outside this comparison and are explicitly reported in the replay.

Form1040 standard deduction line12a is intentionally unmapped: its native
`TotalItemizedOrStandardDedAmt` represents finalized line12c, which can include
additional amounts. Similar numbers in the current fixture are not sufficient
to equate these fields. The amount checker does not replace full schema,
namespace, business-rule, PDF or IRS acceptance validation.

## Reproduction

```sh
deno run -A forms/f1040/e2e/ats/ty2025-check-ledger.ts /tmp/ats-native-values.json
deno test -A forms/f1040/e2e/ats
```

**77 typed tests pass, zero failed or ignored**, including four new comparator
regressions and the real eight-scenario integration replay. Retained ledger,
prior-row comparison, log and hashes:
`.state/research/ats-native-values-2026-10-10/`. Production runtime remains
`2081c7318`; only ATS verification and documentation change in this checkpoint.
No new PDF or XSD review is claimed. All52 main tasks and155 deferred items
remain unchanged.
