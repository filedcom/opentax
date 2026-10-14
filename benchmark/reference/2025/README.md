# Issue 77 reconciliation — October 14, 2026

This review records arithmetic changes in 122 fixtures, including synthetic case 78.
It does **not** certify 122 complete returns. The initial reconciliation retained 65 source or eligibility limitations.
The synthetic completion work below reduces that number to 47; case 78 now
uses an explicitly invented eligible DOB and the correct 316 EIC expectation. The benchmark now reports those limitations
as errors even if every compared number matches. Existing unsupported-oracle and
executor errors still fail the benchmark; the $5 legacy tolerance is unchanged.

[issue77-changes.json](./issue77-changes.json) records each changed numeric value,
its previous value, the calculation basis, and source limitations. Each changed
fixture also carries its review scope and assumptions outside the numeric
`correct` namespace. No engine-produced output was used to populate expectations.
The archived `output.json` files remain historical outputs, not new evidence.

## Sources and independent checks

[irs-tables.json](./irs-tables.json) is a numeric extraction of the TY2025
[Form 1040 instructions](https://www.irs.gov/instructions/i1040gi), downloaded
October 14, 2026. Its metadata records the source HTML SHA-256. The extraction
retains all 2,062 Tax Table rows and 1,362 ordinary EIC rows; EIC rows containing
terminal footnotes are deliberately excluded, not converted to zero. Regression
checks compare all four Tax Table columns and all eight retained EIC columns
against the engine at both ends of each interval. Existing terminal-band tests
remain responsible for the footnote exceptions.

The same instructions supply the QDCGT Worksheet, Tax Computation Worksheet,
Social Security Benefits Worksheet, rounding rules, and Schedule 1-A senior
rules. Other sources are the TY2025 instructions for
[Form 8962](https://www.irs.gov/instructions/i8962),
[Schedule SE](https://www.irs.gov/instructions/i1040sse),
[Form 8995](https://www.irs.gov/instructions/i8995),
[Form 8959](https://www.irs.gov/instructions/i8959), and
[Form 8960](https://www.irs.gov/instructions/i8960).

## Disposition of the reported patterns

| Report | Reconciliation |
| --- | --- |
| Tax Table instead of continuous brackets | Recomputed tax on ordinary income, including the ordinary-income portion of the QDCGT Worksheet; above $100,000 uses the Tax Computation Worksheet. The existing engine already implements this rule. |
| Senior deduction | Recomputed the nine listed scenarios, plus senior cases 27 and 51, including taxable-income floors and the QBI limit. The nine reported cases now use labeled synthetic SSN eligibility facts; additional sparse fixtures retain their stated conditions. |
| PTC | Annual arithmetic now uses the 2025 poverty amounts and Table 2. Case 110's 2026 revenue-procedure reference and repayment description were corrected. The six reported cases now include labeled synthetic monthly coverage and eligibility evidence. |
| EIC | Replaced formula amounts with published table amounts; updated dependent credits and payment balances where affected. Child relationships, residency and SSN eligibility are not established by arithmetic alone. |
| Whole-dollar rounding | Added amounts within each source line before rounding; added rounded return/schedule lines afterward. Form 8949 columns, IRA versus pension lines, Schedule SE tax components and deductible half, Schedule A, QBI and payment lines are handled separately. Source documents retain cents. |
| Line 18 meaning | Removed Part II taxes from line 18; excess APTC repayment remains in Part I. SE, Additional Medicare, NIIT and early-distribution tax contribute to line 24 separately. In complex cases this retains the archived assumptions about AMT and source classification rather than certifying their absence. |

## Cases requiring particular attention

- Case 02: tax **3,875**, refund **1,125**.
- Cases 18/24/29: EIC **1,983 / 5,718 / 7,272**; CTC/ACTC limits and
  payment totals are recomputed. Case 24's third child's relationship is
  `other` in the archive; the completed synthetic case explicitly assumes niece/nephew.
- Cases 36/45/48/52: net PTC **3,952 / 3,860 / 4,700 / 3,600**.
  Case 53: repayment **3,725**, withholding/payment **6,500**.
- Case 110: FPL 15,060; truncated percentage 212; applicable figure .0248;
  annual contribution 794; allowed PTC 5,006; net PTC **1,406**;
  tax **1,715**, payments **3,906**, refund **2,191**.
- Case 67: rounded line 9 is **211,365**, Additional Medicare **0**,
  NIIT **95**. Rounding Form 8949's separate proceeds, basis and adjustment
  columns matters; rounding only the original net gain gives a different sum.
- Case 76: worksheet income tax **100,487**; NIIT is a separate **212**.
  Combined tax remains close to the archive because the old income-tax amount
  effectively included that investment tax. Total withholding is **97,303**.
- Case 86: total withholding is **40,471**. Completed cases 76/86 explicitly
  assign all W-2s to the taxpayer, giving excess Social Security credit
  **8,199 / 5,711**. Separate synthetic ownership variants verify zero credit
  when wages are split between spouses. The original ownership remains unknown.
- Case 78: the original age was absent. The completed synthetic fixture uses
  DOB 1985-06-15, EIC **316**, and payments/refund **382**; original values
  remain in the incomplete-fixture archive.
- Case 91: worksheet tax **4,121**. Case 96: other-dependent credit **500**.
- Case 106: contrary to the report, `input.json` contains a child, DOB,
  residency and 48,000 wages. Under the intended eligibility assumptions,
  the table EIC is **385**, ACTC **215**, payments/refund **4,400**.
- Case 133: table EIC **864**, payments **4,364**, refund **4,339**.

### Case 95: proposed amount is not reproduced

The proposed **297,368** does not follow from the supplied source amounts.
Covered long-term sales aggregate proceeds 611,026.43 and basis 609,315.14
before rounding each column, giving 1,711. Together with adjusted transactions,
short-term sales and partnership gains, net capital gain is 30,045.
Whole-dollar taxable income is 957,087; qualified dividends 43,237 plus net
capital gain 30,045 leave ordinary taxable income 883,805.
The Single Tax Computation Worksheet gives
`883,805 × .37 − 42,979.75 = 284,028.10`, reported as 284,028.
Preferential income of 73,282 at 20% adds 14,656.40; final tax is **298,684**.
The earlier 298,685 reconciliation rounded individual covered sales instead of
the aggregated Schedule D columns. The source-column regression now documents
this correction. Missing eligibility facts remain explicitly synthetic.

## Scope and remaining work

The table-rule checks isolate existing engine arithmetic from old expected-value
errors. They do not establish that every archived input can be prepared by the
current engine: many lack reviewed ownership, business references, foreign tax
holding periods, or other required evidence. Complex fixtures retain their
archived income classifications and eligibility assumptions; these limitations
now prevent a successful benchmark result. This reconciliation does not close
issue 77 or claim IRS/ATS acceptance. Supply and review those source facts before
removing a limitation or treating the complete return as an authoritative oracle.

Run the focused checks with:

```sh
deno test --allow-read --allow-write --allow-run \
  benchmark/issue77_reference.test.ts benchmark/fixture_contract.test.ts \
  benchmark/harness.test.ts benchmark/run_benchmark.test.ts \
  benchmark/run_benchmark.integration.test.ts
```

Initial reconciliation checkpoint: **30 focused tests passed**. That full benchmark discovered all 133
cases: **10 pass, 123 fail, 0 skipped**, with 273 line failures, 1,198 unsupported
checks and 163 errors (categories overlap). The failures retain engine diagnostics
and incomplete sources; no pass-rate or issue-closure claim is made. The separate
full-suite run at pre-merge runtime `da40ac96d` is not evidence for this branch.

## Synthetic follow-up scenarios

The user authorized invented facts to exercise the unresolved paths. These
assumptions live separately in [issue77-synthetic.json](./issue77-synthetic.json)
and never replace the original source documents or their limitations.
`benchmark/issue77_synthetic.test.ts` uses the archived W-2 financial boxes with
synthetic employee SSNs and distinct synthetic copy references. For case 76,
assigning both forms to one taxpayer gives an excess SS credit of **8,199**;
assigning one to each spouse gives **0**. For case 86, assigning all three to one
taxpayer gives **5,711**; assigning the first to the taxpayer and the remaining
two to the spouse gives **0**.

For case 78, the tests hold rounded earned income **7,212**, AGI **14,961**, and
investment income **7,749** constant. With explicitly synthetic residency,
valid-SSN, family and prior-disallowance assumptions, DOBs corresponding to ages
**25 and 64** give EIC **316**, while ages **24 and 65** give **0**. These eight
passing tests exercise the existing W-2 and EIC calculation nodes; they are not
full-return preparation, PDF, MeF, or recovered-source verification. The engine
code under test is the code released in v2.0.12; these follow-up test artifacts
are maintained in ongoing PR #79.

The release smoke also runs all eight variants through the compiled CLI. The
ownership scenarios isolate the archived W-2s with synthetic joint identities;
the age scenarios use all case 78 income forms with synthetic timely employment
SSNs, eligibility reviews and negative foreign-account/trust answers. It
requires no unexpected warnings (eligible EIC raises the expected refund
advisory), verifies excess SS on Form 1040 line 31, and verifies EIC, total
payments and refunds (382 when eligible, 66 when ineligible). The separate basic
W-2 smoke still checks finalized MeF and flattened PDF values. Every platform
release build must pass these checks before publication.


## Synthetic completion work (ongoing)

The user explicitly authorized completing missing benchmark facts with synthetic
records. Thirty inputs now contain labeled identity, eligibility or monthly
coverage assumptions. The original inputs and expectations are retained in
[issue77-original-incomplete.json](./issue77-original-incomplete.json). None of
the original financial source amounts were replaced. Marketplace record hashes
refer to the actual labeled JSON records in `synthetic-marketplace/`.

The public `f8812_credit_limit_worksheet` input supplies reviewed credit-limit
answers while retaining automatically derived dependent counts, AGI and tax.
Case 86 now produces CTC 4,400, excess Social Security 5,711 and refund 7,069.
All nine reported senior scenarios and all six PTC scenarios execute without
diagnostics. Case 48 also retains the one dollar of Additional Medicare
withholding implied by its original W-2 boxes: payments 15,201, refund 7,455.

First synthetic checkpoint: 31 passing tests, including complete-return graph checks.
Rounding consistency and the remaining reported cases are still being reviewed;
this checkpoint does not close the issue or supersede the final release smoke.


The next checkpoint also supplies EIC residency/identity and dependent support
facts for the reported child-credit cases, plus foreign ordinary-dividend source
reviews for cases 67, 91 and 95. An earned-income worksheet input now permits
ACTC verification without duplicating calculated return totals. Cases 18, 24,
29, 106 and 133 reproduce their EIC, CTC/ACTC and refunds through the return graph;
case 96 reproduces the 500 other-dependent credit. Case 24 explicitly treats the
ambiguous third child as a niece/nephew; the original relationship is archived.
Case 47 supplies the missing adult supported-brother facts for childless HOH EIC.

Schedule A now adds rounded line operands, combining amounts belonging on the
same line before rounding. Form 1040 taxable income subtracts rounded AGI and
deduction operands, fixing the one-dollar case 76 tax discrepancy. Cases 76, 91
and 95 reproduce income tax 100,487, 4,121 and 298,684. The combined focused gate
is **138 passed, 0 failed**. That checkpoint preceded the capital and income rounding corrections below.


### Capital and income rounding checkpoint

Covered, unadjusted sales now aggregate proceeds and basis on Schedule D before
rounding each column; adjusted Form 8949 transactions round each column before
calculating gain. Capital distribution sources on the same line combine before
rounding, including the distributions-only path. A comparison of all 133 inputs
found case 95 was the only fixture affected by changing covered sales from
individual to aggregate column rounding.

Form 1040 totals add reported whole-dollar lines, and Social Security benefits
use rounded source income. Case 67 income is 211,365; case 91 income is 57,188;
case 78 income is 14,962 with unchanged EIC 316 and refund 382. The release smoke
now exercises all 30 completed fixtures and checks seven summary amounts exactly,
in addition to the eight ownership/age variants and existing MeF/PDF smoke.


The local compiled CLI smoke passed all 30 complete scenarios with exact summary
comparisons, all eight ownership/age variants, and the existing finalized MeF and
flattened two-page PDF checks. No executor diagnostics were accepted; only the
known refundable-credit advisory was permitted. This is local release evidence;
publication still requires the five-platform release workflow.
