# TY2025 reviewed employer-excluded premiums: zero deduction without Form7206 filing

## Existing source gap and exact scope

This follow-up starts from spouse Medicare source commit `411d83359` in the
isolated `/tmp/opentax-medicare-zero-eligible-source` checkout. The same actual
one-plan source input rejected all twelve employer-eligible months because the
calculator demanded positive eligible premiums. It now accepts the genuine
zero result for a complete monthly employer-exclusion review. This supersedes
the all-employer-eligible boundary recorded in the preceding spouse Medicare
review. The positive Medicare source repair remains intact.

The zero extension requires every month to retain the existing reviewed
employer-eligibility exclusion. Other reasons for zero eligible premiums remain
outside this demonstrated extension. The actual establishing sole Schedule C,
owner, profit, independently calculated half-SE, policy/month/payment sources,
recipient/return identities, coverage review and ordinary-plan restrictions
are preserved. No manually supplied zero deduction replaces the calculation.

## 2025 IRS basis and filing behavior

[2025 Form7206 instructions](https://www.irs.gov/pub/irs-prior/i7206--2025.pdf)
exclude premiums for any month of employer-plan eligibility, including partial
months and eligibility without participation. A sole ordinary Schedule C
source without Form2555 or LTC may use the Form1040 worksheet; those special
conditions requiring Form7206 are absent from these actual source packets.
The health deduction does not reduce SE earnings.

The graph retains the reviewed plan and calculated zero Form7206 workpaper
lines. It sends an explicit zero Schedule1 health deduction and the same plan
source into joint Form8995. Native Form7206 and its PDF projection first run
all existing source/return reconciliation, then omit the zero-deduction
attachment. Suppression is after validation: a changed source, borrowed owner,
incorrect filed health amount, or clipping a positive deduction to zero still
throws. Form8995 retains its actual proprietor row and the zero attributable
health amount even when its final deduction is also zero.

[2025 Form8995 instructions](https://www.irs.gov/pub/irs-prior/i8995--2025.pdf)
reduce QBI by attributable deductible SE tax and allowed self-employed health
insurance. Excluded premiums give no Schedule1 or QBI health deduction.

## Actual public source and independently expected filed equations

Both packets reuse the issued Casey Form1099-NEC, owned $5,000 photography
business, the reviewed $185 monthly Medicare payment/entitlement sources, and
all twelve monthly employer-eligibility records. The paid premiums remain
**$2,220** in source evidence; none were changed to fabricate deductible
premiums. The W2 packet retains Alex's issued $50,000 W2 and $5,000 withholding.
The second packet has no W2 or other positive business.

Filed SE earnings $4,618 give $573 Social Security tax + $134 Medicare tax =
**$707**, with filed deductible half **$354**. Excluded health premiums do not
change these amounts. Form7206 line1/3/14 = $0; line4/5 = $5,000; line6 = 100%;
line7 = $354; line8/10/13 = $4,646.

| Filed value | Issued W2 | No W2 |
| --- | ---: | ---: |
| Schedule1 health deduction | 0 | 0 |
| Total adjustments | 354 | 354 |
| AGI: wages + profit - halfSE | 54,646 | 4,646 |
| Casey QBI: profit - halfSE - allowed health | 4,646 | 4,646 |
| Standard deduction | 31,500 | 31,500 |
| Income before QBI deduction | 23,146 | 0 |
| Form8995 QBI component | 929 | 929 |
| Form8995 income limitation | 4,629 | 0 |
| Form8995/Form1040 QBI deduction | 929 | 0 |
| Taxable income | 22,217 | 0 |
| Ordinary income tax | 2,223 | 0 |
| Total tax including actual SE | 2,930 | 707 |
| Refund / amount owed | 2,070 refund | 707 owed |
| IRS7206 attachment | Absent | Absent |
| IRS8995 attachment | Present | Present |

Changing the actual source to eleven employer-eligible months correctly
computes eligible premiums/deduction $185 and QBI $4,461, restoring the native
and PDF Form7206 attachment. A positive source with its filed line14 merely
clipped to zero is rejected.

## Exact verification and artifact snapshot

- Two public source/full native/full XSD/flattened PDF positives plus source
  conflicts: **3 passed / 0 failed**,
  `/tmp/opentax-medicare-zero-focused-v3.log`.
- Final expanded 18-file replay includes this source test, the prior three
  spouse Medicare packets, existing CLI, all Form7206 E2E/Pub974, Schedule C/NEC,
  owned SE, Form8995/8995A and WOTC checks: **366 passed / 0 failed**,
  `/tmp/opentax-medicare-zero-regression-final-v4.log`. Exact file inventory:
  `/tmp/opentax-medicare-zero-regression-files.txt`.
- The final test includes **20** native Form8995/PDF/complete-preparation
  mutations: changed employer eligibility, missing employer/payment evidence,
  unrelated zero-premium reason, wrong owner/business, stale actual profit or
  halfSE, wrong filed Form7206 line1/14, Schedule1 health amount, absent/changed
  joint health source or adjustment, wrong QBI row, borrowed issued NEC and
  Schedule C, and changed finalized adjustments/AGI/QBI deduction. It separately
  rejects altered zero-source eligibility and clipped positive claims in both
  native Form7206 and PDF projection.
- Final independent full-XSD and six source/XML/PDF SHA256 checks:
  `/tmp/opentax-medicare-zero-artifact-check-final.log`.
- Every page of both saved packets rendered and reviewed: **22 pages**, two
  11-page flattened PDFs with zero fields/widgets. Page count log:
  `/tmp/opentax-medicare-zero-page-review.log`; render script:
  `/tmp/opentax-medicare-zero-review.py`. Both full packets consist of
  Form1040(2), Schedule1(2), Schedule2(2), Casey ScheduleC(2), Casey ScheduleSE(2),
  and Form8995(1), with no Form7206 page.

Snapshot: `/tmp/opentax-medicare-zero-eligible-evidence`. Both
`issued-W2-all-employer-eligible` and `no-W2-all-employer-eligible` retain
`-source-input.json`, `-full-return.xml`, and `-filled-return.pdf`.
`sha256-manifest.json` freezes these six files. The previous three Medicare
packets and their nine hashes remain unchanged at
`/tmp/opentax-spouse-medicare-qbi-evidence`.

Reproduction:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test -A \
  forms/f1040/2025/pdf/reviews/adjustments/health/form7206-zero-eligible.test.ts -- --write-review-artifacts
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test -A \
  $(cat /tmp/opentax-medicare-zero-regression-files.txt)
```

## Limits

This proof covers the actual sole-C MFJ plan whose complete reviewed months
are excluded for employer eligibility, plus return to a genuine positive
one-month deduction. It does not establish multiple businesses/plans,
Marketplace/Pub974, farm/K1/S-corporation attribution, retirement/LTC/PSO
extensions, source cents, or outside SSA/carrier/employer/payment
authentication. Retained synthetic issued and review records demonstrate
internal source reconciliation. Existing other-owner/farm and positive
Medicare behavior remains preserved. No main/board/future/PR/remote edits.
