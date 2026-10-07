# TY2025 spouse Medicare Form7206 and joint Form8995 source review

## Existing gap and supported repair

At isolated base `9e51e183f`, the existing CLI test
`cli/commands/issue60-sehi.test.ts` failed when Casey's actual sole Schedule C
profit was $5,000 and monthly Medicare premiums were $185. Form7206 calculated
its deduction, but Form8995's joint-owner branch rejected every nonzero health
insurance deduction. Its native/PDF shared reconciliation also assumed that
joint adjustments consisted solely of deductible SE tax. Original failure:
`/tmp/opentax-medicare-cli-gap.log`.

This repair carries the existing strict single-Schedule-C plan source from
Form7206 into Form8995. The joint-owner calculator independently recomputes the
plan deduction and joins the business reference, proprietor, actual profit,
owned filed half-SE deduction, and taxpayer/spouse TINs. A nonzero health
adjustment without the actual plan remains an error. The attributable deduction
reduces only the actual sole business's QBI. No supplied tax, deduction, or QBI
scalar replaces these source joins.

A second concrete gap blocked the genuine issued-receipt packet: the existing
Schedule C `unadjusted_source` check treated retained `f1099nec_receipt_sources`
as an unrelated adjustment. This repair recognizes only that existing receipt
provenance, retaining the calculator's actual receipt/business match and the
native/PDF issued-copy, payer, recipient, and source-identity reconciliation.
It does not permit arbitrary additional Schedule C adjustments.

## Official 2025 rules used

[2025 Form7206 instructions](https://www.irs.gov/pub/irs-prior/i7206--2025.pdf)
permit voluntarily paid Medicare premiums as insurance premiums, exclude
employer-plan-eligible months, require the policy to be established under the
business, and limit the deduction using the business's income after applicable
SE/retirement adjustments. The health deduction does not reduce net earnings
for SE tax.

[2025 Form8995 instructions](https://www.irs.gov/pub/irs-prior/i8995--2025.pdf)
include the deductible part of SE tax and self-employed health insurance among
the deductions reducing QBI when attributable to the business. Employee wages
are outside QBI. The taxable-income limitation applies after ordinary deductions
and before the QBI deduction.

## Actual public source packets and expected arithmetic

`form7206-spouse-medicare.fixture.ts` retains Alex and Casey's MFJ identities,
Casey's owned cash photography business, an issued $5,000 Form1099-NEC receipt
already included in the business's $5,000 gross receipts, and the actual
reviewed one-plan monthly premium/payment/employer-eligibility records. The
policy source reference includes Casey's disability Medicare entitlement and
premium statement; this is retained synthetic source evidence, not an external
SSA eligibility verification. The W2 cases retain Alex's issued $50,000 W2,
including withholding and employer identity. The public execution graph first
calculates the actual business and filed half-SE amount used by plan intake.

The filed Schedule SE rounds net earnings to $4,618, Social Security tax to
$573, Medicare tax to $134, total SE tax to **$707**, and the deductible half to
**$354**. Health premiums do not change those SE amounts.

| Filed amount | No W2; twelve eligible months | Alex W2; twelve eligible months | Alex W2; two employer-eligible months excluded |
| --- | ---: | ---: | ---: |
| Casey Schedule C profit | 5,000 | 5,000 | 5,000 |
| Form7206 line7; filed halfSE | 354 | 354 | 354 |
| Form7206 lines8/10/13 income limit | 4,646 | 4,646 | 4,646 |
| Form7206 line14; Schedule1 line17 | 2,220 | 2,220 | 1,850 |
| Schedule1 total adjustments | 2,574 | 2,574 | 2,204 |
| Casey Form8995 business QBI | 2,426 | 2,426 | 2,796 |
| Form1040 AGI | 2,426 | 52,426 | 52,796 |
| Standard deduction | 31,500 | 31,500 | 31,500 |
| Form8995 line11; income before QBI deduction | 0 | 20,926 | 21,296 |
| Form8995 line14; income limitation | 0 | 4,185 | 4,259 |
| Form8995 line15; Form1040 QBI deduction | 0 | 485 | 559 |
| Taxable income | 0 | 20,441 | 20,737 |
| Ordinary tax | 0 | 2,043 | 2,073 |
| Total tax including SE | 707 | 2,750 | 2,780 |
| Refund / amount owed | 707 owed | 2,250 refund | 2,220 refund |

The no-W2 case retains **IRS8995** with positive business QBI and a zero
income-limited deduction. The prior no-health owner-row allocation and farm
calculations are unchanged. Existing Form7206 E2E tests now check actual joint
owner filing rows instead of obsolete `line1_ssn`/`line1_qbi` scalar fields;
their expected amounts and native/PDF wrong-owner rejections remain tested.
The spouse Medicare case also checks the actual owned Schedule SE PDF instance,
rather than expecting proprietor fields on the aggregate schedule.

## Native/PDF reconciliation and negative proof

The shared Form8995 native/PDF preflight compares its retained plan to the
actual Form7206 source, recomputes every Form7206 line, reconciles the actual
Schedule C/owned SE graph projection and general/spouse coverage, checks the
printed recipient, joins issued NEC copies, and reconciles Schedule1 line17,
Form1040 adjustments/AGI, business QBI, and the final QBI deduction. Existing
ordinary-component, proprietor, general, owned-SE, and tax-line guards remain.

The public test has 24 finalized-packet mutations checked against native
Form8995, its PDF projection, and complete return preparation. They include
wrong plan proprietor/business/TIN; changed premiums or employer eligibility;
missing payment source; Marketplace misclassification; stale halfSE/profit;
changed Form7206 line14; changed Schedule1 health/halfSE; borrowed Schedule C;
issued NEC recipient/amount/payer conflicts; absent/detached plan; changed row
health/QBI; and changed Form1040 adjustments/AGI/QBI. Additional public intake
negatives cover stale actual business/profit/halfSE and wrong owner. A borrowed
NEC recipient is also rejected by Form7206 native/PDF. The core joint QBI
calculator rejects a health scalar without the actual plan. A legitimate
changed employer-month source recomputes deduction $2,035 and QBI $2,611.

Standalone Form1040 descriptor calls do not recursively validate all attached
forms. The demonstrated protection is actual Form7206/Form8995 native/PDF
preflight and **complete public return preparation**, not a claim that the
standalone 1040 descriptor performs the attached source joins.

## Exact verification evidence

- Focused source/full native/XSD/PDF and original CLI: **6 passed / 0 failed**,
  `/tmp/opentax-medicare-focused-v2.log`.
- Existing Form7206 E2E, including sole-C spouse policy, spouse Medicare and
  mixed taxpayer/spouse coverage: **5 passed / 0 failed**,
  `/tmp/opentax-medicare-existing-e2e-v4.log`.
- Repaired original CLI separately: **1 passed / 0 failed**,
  `/tmp/opentax-medicare-cli-repaired-v1.log`.
- Related 17-file Schedule C/NEC, SE/owner, Form7206/Pub974, Form8995/8995A,
  WOTC and native/PDF gate: **363 passed / 0 failed**,
  `/tmp/opentax-medicare-regression-final-v5.log`. Exact inventory:
  `/tmp/opentax-medicare-regression-files.txt`.
- Independent final saved-artifact validation:
  `/tmp/opentax-medicare-artifact-check-final.log`: all three complete XML
  packets validate against the local 2025v5.4 Return1040 XSD; nine saved
  source/XML/PDF SHA256 values match the manifest; three PDFs have 12 pages
  each, zero fields and zero widgets.
- Every page of all three packets was rendered and reviewed: **36 pages**.
  Page counts: `/tmp/opentax-medicare-page-review.log`; rendering/review script:
  `/tmp/opentax-medicare-review.py`. Form7206 and Form8995 pages were also
  reviewed individually at full rendered size. Recipient TIN, 100% allocation,
  health amounts, business QBI, income limitation, zero-cap filing and return
  totals agree with the table.

Snapshot directory: `/tmp/opentax-spouse-medicare-qbi-evidence`.
Each of `issued-W2-spouse-Medicare`, `spouse-only-zero-income-cap`, and
`two-employer-eligible-months` has `-source-input.json`, `-full-return.xml`,
and `-filled-return.pdf`. `sha256-manifest.json` freezes these nine files;
rendered individual pages and contact sheets are under `rendered/`.

Reproduction from this isolated checkout:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test -A \
  forms/f1040/2025/pdf/form7206-spouse-medicare.test.ts \
  cli/commands/issue60-sehi.test.ts -- --write-review-artifacts
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test -A \
  $(cat /tmp/opentax-medicare-regression-files.txt)
```

## Boundaries retained

This is the actual ordinary MFJ, sole-owned Schedule C, one reviewed plan route,
including both no-W2 and issued-W2 returns. Multiple businesses/plans,
attribution involving farm/K1/S-corporation sources, retirement deductions,
Marketplace/Pub974 interactions, LTC and public-safety-officer premium cases
retain their existing boundaries; this packet does not establish those wider
routes. The existing calculator requires positive eligible premiums, so a plan
with every month excluded for employer eligibility remains unsupported. An
exploratory zero-eligible-premium test confirmed that prior boundary
(`/tmp/opentax-medicare-focused-final-v6.log`); its attempted source projection
change and fixture were reverted. The committed supported route is the exact
17-file, 363/0 replay version, not that exploratory version. Existing personal/other-owner/farm calculations and positive-zero
Form8995 behavior remain preserved. No general source-cents support or
external carrier, SSA, payment, or employer authentication is established by
synthetic retained source fixtures. No board, main checkout, future task, PR,
or remote was modified.
