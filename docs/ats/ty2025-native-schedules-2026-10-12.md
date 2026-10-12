# ATS schedule amounts and explicit answers — October 12, 2026

The ATS ledger now checks 15 additional emitted values against existing reviewed
source targets, bringing its total to 200 observations. All 185 previous rows
remain identical as JSON objects. Source fixtures, expected amounts and production
calculators/serializers are unchanged.

The added mappings cover Schedule 1 business, rental, farm, refund and SE/health
adjustments; Schedule 2 SE and household employment taxes; Schedule 3 fuel credit;
Schedule D short- and long-term totals; and Form 1040 primary blindness,
digital-assets answer and pension rollover. Each mapping was checked against the
field name, line annotation and type in the retained IRS TY2025 v5.4 schemas.
Schema paths and SHA-256 digests are retained in `mapping-provenance.json`.

| Newly observed target | Expected | Emitted | Result |
| --- | ---: | ---: | --- |
| Scenario 5 primary blindness | true | X | Match |
| Scenario 5 digital assets | false | false | Match |
| Scenario 13 Schedule 3 line 6j | 162 | 11 | Existing answer-key conflict |
| Twelve targets across Scenarios 1/2/3/8/12 | Source targets retained | No prepared packet | Not evaluated |

The Scenario 13 difference follows the already-recorded printed deduction/tax
conflict; it is not a newly identified credit defect. Twelve checks remain
unevaluated because their full scenario preparations are blocked. They are not
classified as missing fields or failed calculations.

The observer distinguishes IRS `CheckboxType` (`X`) from `BooleanType`
(`true`/`false` or `1`/`0`). It never turns an absent answer into false. Tests reject
malformed and duplicate answers, spouse blindness substituted for the primary,
IRA rollover substituted for pension rollover, nested substitute amounts and
duplicate schedule copies. Signed amounts and referenced direct fields remain
observable. Standard-deduction targets remain unmapped because the native total
can represent itemized deductions as well; source credit deposits also remain
separate from allowed-credit fields.

Current ledger totals:

| Observation kind | Count | Results |
| --- | ---: | --- |
| Calculations | 74 | 51 match, 17 differ, 6 unproduced |
| Native values | 69 | 18 match, 7 differ, 2 absent, 42 unevaluated |
| Required native copies | 56 | 10 present, 12 missing, 34 unevaluated |
| Known required binary attachments | 1 | 1 missing |

The individual-check pass projection stays **about 75% (judgment range 50–85%)**.
Its calculation anchor remains 46/63 evaluated nonprovisional matches (73.0%).
Adding observations does not improve the software or establish IRS acceptance.
The complete denominator, seven scenarios' attachment inventories and existing
main-board tasks remain open. No new deferred task or deferred repair results
from this checkpoint; no new XSD packet or PDF review is counted.

The complete ATS directory passes **80 typed tests, zero failures or ignored tests**.
Focused lint and diff checks pass.

Reproduction:

```sh
deno run -A forms/f1040/e2e/ats/ty2025-check-ledger.ts /tmp/ats-check-ledger.json
deno test -A forms/f1040/e2e/ats
```

Before/after ledgers, schema provenance and the typed test log are retained in
`.state/research/ats-native-schedules-2026-10-12/`.
