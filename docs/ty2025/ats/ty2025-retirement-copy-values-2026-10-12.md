# ATS retirement-copy values — October 12, 2026

The ledger now retains 30 native-field expectations for the three issued
1099-R copies in Form 1040 Scenarios 3 and 8. All 313 previous observations,
including the 80 W-2 checks, remain identical. The ledger has 343 observations;
these additional rows do not change production calculations or source fixtures.

The issued [Scenario 3 page 4](https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf)
and [Scenario 8 pages 4–5](https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf)
were rendered and visually reviewed:

| Scenario/page | Payer | Gross | Taxable | Withheld | Code |
| --- | --- | ---: | ---: | ---: | --- |
| 3/4 | Primrose Retirement Fund | 53,778 | 43,100 | 3,405 | 7 |
| 8/4 | Liberty Trust Company | 35,800 | 0 | 0 | Q |
| 8/5 | Jubilee Retirement Fund | 20,300 | 10,300 | 2,555 | G |

Each copy also retains independently checked recipient/payer TINs and the four
visibly unmarked corrected, taxable-amount-not-determined, total-distribution
and IRA/SEP/SIMPLE boxes. Liberty's two zero amounts are explicitly printed;
missing XML elements do not satisfy those expectations. Code Q does not replace
the printed IRA-box answer, establish a QCD election or supply a rollover
destination. Existing Scenario 8 return-level interpretation conflicts remain
unchanged.

## Native observation

W-2 and 1099-R observers now share the same copy-matching implementation. The
reviewed employer/payer name selects a unique document, allowing the same EIN
on differently named issuers without using amounts, recipient identity or XML
order to force a match. TINs retain their leading zeros. Duplicate matching
copies remain ambiguous, and absent fields cannot be borrowed from another
copy or Form 1040 totals.

The ten 1099-R field names were checked against the cached TY2025v5.4 schema.
`F1099RDistributionCd` uses its actual one-or-two-character alphanumeric schema
pattern; the full emitted code is compared without truncation or case folding.
This is a comparison to the printed source, not a determination that every
schema-valid code combination is permitted by IRS business rules.

Both scenarios remain blocked during native preparation, so **all 30 added
observations are unevaluated**. They are not matches, missing-copy findings or
accepted tests. The prior three partial preparations and five blocked scenarios
are unchanged. No additional full-XSD packet or generated-PDF review is counted.

## Verification and estimate

The full ATS directory passes **92 typed tests, zero failures**; focused lint
and diff checks pass. Five new tests cover all three issued-copy shapes,
same-EIN payers, reordered documents, explicit zeros versus omissions, swapped
amounts with unchanged totals, recipient/code changes, each printed indicator,
missing/duplicate copies, unavailable preparation, and malformed or repeated
code elements. Existing W-2 tests also exercise the shared matcher.

The calculation anchor stays 56/79 nonprovisional evaluated matches (70.9%),
with five provisional checks and six unproduced targets separate. The projection
remains **about 75% of individual ATS checks**, with a low-confidence range of
50–85%. No new software defect or deferred repair is recorded, and no frozen
main-board checklist item is closed by this narrower evidence.

Evidence: `.state/research/ats-retirement-copy-review-2026-10-12/` contains
before/after ledgers, the three observed images, source/image hashes, reviewed
schema mappings/hashes and the typed test log. Reproduce with:

```sh
deno run -A forms/f1040/e2e/ats/ty2025-check-ledger.ts /tmp/ats-ledger.json
deno test -A forms/f1040/e2e/ats
```

## Source-fixture identity completion

The Scenario 3 and 8 fixtures now carry the recipient SSN printed on each
of their three issued copies, explicit taxpayer ownership, and the three
unmarked box 2b/IRA indicators. All three retained source images were visually
rechecked. Scenario 8 keeps the issued recipient ZIP 89117 separately from the
Form 1040 address; no new rollover destination or QCD election is inferred.

The actual fixture-to-graph-to-1099-R builder replay matches **30/30 issued
fields**, including both explicit zero amounts on Liberty's copy. Reversed
copy order produces the same comparisons. Six missing/wrong-recipient
alterations reject across all three copies. These are component observations,
kept outside the 343-row full-return ledger and its pass denominator.

Both full-return replays now pass the retirement recipient guard. Scenario 3
next requires retained direct-sale transactions for its Schedule D aggregate
proceeds/basis; Scenario 8 next requires an issued Social Security copy reference
and box 2 recipient. The source packet supplies aggregate facts, so these records
were not invented. Both preparations remain blocked, all 30 full-return
retirement observations remain unevaluated, and every existing calculation and
native-field observation is unchanged. W-2 observations remain 30 matching and
50 unevaluated. No new full-return XSD or filled-PDF count is added.

The full ATS directory now passes **96 typed tests, zero failures**, including
four new real-fixture/owner tests; focused lint passes. The initial component
comparison failed because its test envelope omitted the observer's required
Return/ReturnData wrapper; correcting only that harness resolved both failures.
The failure log is retained. No production guard or deferred item was changed.

Evidence: `.state/research/ats-copy-replay-2026-10-12/` retains before/after
full-return reports, the unchanged ledger, source inputs, three emitted native
components, their 30-field comparison proof, and both test logs. Reproduce the
committed checks with `deno test -A forms/f1040/e2e/ats`. The individual-check
projection stays **about 75% (50–85% judgment range)**; component matches do not
establish a higher full-return pass rate.
