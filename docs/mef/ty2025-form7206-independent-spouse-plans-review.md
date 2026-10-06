# Form 7206: independently owned MFJ businesses and plans

## Reviewed source route

The existing single-establishing-business health source could not represent two independently operated spouse businesses with separate established plans. This route retains the public business, issued NEC receipt, owned W-2, policy establishment, monthly policy/payment, eligibility review, and complete per-business plan inventories. No health deduction, business profit, owner half-SE deduction, or parent tax scalar is accepted in the new plan source.

Each spouse owns one profitable unadjusted Schedule C. The existing owned Schedule SE calculator derives each proprietor's separate tax and half-SE deduction from actual owned wages and businesses. Each policy joins its establishing business and proprietor. Its deduction is limited by that owner's business profit less that owner's filed half-SE deduction. The two health deductions sum once to Schedule 1 line 17 and AGI; each is attributed to its own business in the joint Form 8995 rows. A documented no-plan inventory permits one established plan with both actual businesses retained.

The same source calculator and final-return preflight validate native and PDF exports. Policy/payment duplication, changed owned receipts, borrowed owner profit/half-SE, absent or conflicting plan inventory, changed identities, changed eligible months, changed deductions, QBI rows, and finalized income/deduction fields fail reconciliation.

## Official 2025 basis

- [Form 7206 instructions](https://www.irs.gov/pub/irs-prior/i7206--2025.pdf), pages 1–2: business establishment and employer eligibility requirements; separate Form 7206 for plans established under different businesses; more than one SE-income source requires Form 7206.
- [Form 7206](https://www.irs.gov/pub/irs-prior/f7206--2025.pdf): lines 4–10 derive the plan's business net earnings limit; line 14 is the smaller of eligible premiums and the limit.
- [Schedule SE instructions](https://www.irs.gov/instructions/i1040sse): each spouse computes SE tax independently, including each owner's Social Security wage-base reduction.
- [Form 8995 instructions](https://www.irs.gov/pub/irs-prior/i8995--2025.pdf): attributable SE-tax and health-insurance deductions reduce business QBI.
- [Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), Tax Computation Worksheet, Section B: the independently asserted ordinary tax in these cases is rounded `taxable income × .22 − 10,172`.

Treating each spouse's line 5 and deductible-half-SE operand as that individual's owned earnings is the implementation's application of the separate proprietor/SE and plan-business limits. The instructions do not explicitly spell out this particular paired-spouse example. One actual business per owner gives each copy line 6 = 100%; the joint deduction is not used as either copy's line 7.

Both actual businesses have SE income in all six packets. Thus separate copies are retained for the two established plans, including a plan whose monthly employer eligibility excludes every premium. This differs from the already reviewed sole-business, all-employer-eligible zero route, which reconciles its source before omitting the unnecessary attachment. One documented established plan with two owned businesses produces one copy.

## Independent equations and packets

Alex's issued W-2 wages and Social Security wages are $176,100. Alex's owned Schedule C profit is $10,000; Casey's is $5,000. Separate SE tax is $268 and $707, with filed half-SE deductions $134 and $354. Aggregate Schedule 2 SE tax is $975 and Schedule 1 half-SE is $488. The health income limits are therefore $9,866 and $4,646. Health deductions do not reduce SE earnings.

| Packet | Alex/Casey health | Alex/Casey QBI | AGI | QBI deduction | Taxable income | Ordinary tax | Total tax | Refund | 7206 copies |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| both-full | 6,000 / 2,220 | 3,866 / 2,426 | 182,392 | 1,258 | 149,634 | 22,747 | 23,722 | 6,278 | 2 |
| primary-income-limited | 9,866 / 2,220 | 0 / 2,426 | 178,526 | 485 | 146,541 | 22,067 | 23,042 | 6,958 | 2 |
| primary-months-excluded | 0 / 2,220 | 9,866 / 2,426 | 188,392 | 2,458 | 154,434 | 23,803 | 24,778 | 5,222 | 2 |
| both-months-excluded | 0 / 0 | 9,866 / 4,646 | 190,612 | 2,902 | 156,210 | 24,194 | 25,169 | 4,831 | 2 |
| one-established-plan-two-owned-businesses | 0 / 2,220 | 9,866 / 2,426 | 188,392 | 2,458 | 154,434 | 23,803 | 24,778 | 5,222 | 1 |
| different-owner-eligible-months | 5,000 / 1,480 | 4,866 / 3,166 | 184,132 | 1,606 | 151,026 | 23,054 | 24,029 | 5,971 | 2 |

The limited packet retains actual Alex premiums $14,400, while deduction is $9,866; Casey's $2,220 deduction does not borrow unused Alex capacity. The excluded packets retain actual premium payments but deduct zero excluded premiums. The different-months packet independently excludes Alex's first two and Casey's first four months.

## Evidence

- Focused public source/native/full-XSD/filled-PDF/conflict test: `/tmp/opentax-independent-plans-focused-v2.log`, 8 passed / 0 failed (six public positives and two conflict tests).
- Existing CLI, sole-plan, owned-SE, simplified/advanced QBI, farm WOTC profit/loss, and exact Pub974 import-entry compatibility: `/tmp/opentax-independent-plans-regression-v2.log`, 23 files, 385 passed / 0 failed (3m42s), exit 0; exact file inventory `/tmp/opentax-independent-plans-regression-files.txt`.
- Frozen actual source JSON, full-return XML, filled PDFs: `/tmp/opentax-independent-spouse-health-plans-evidence`.
- Six packets, 101 pages (five 17-page, one 16-page), no fields/widgets after flattening. All pages rendered and visually reviewed; dedicated Form 7206 income-limited and explicit-zero pages checked at full size. The first visual pass found missing per-copy percentage text because the PDF builder projects before expanding instances; corrected instance projection now prints 100% and the filled-PDF test asserts it on each copy.
- Reopened-packet full-XSD/flatten/hash verification `/tmp/opentax-independent-plans-artifact-check-final.log`; render/flatten review `/tmp/opentax-independent-plans-page-review.log`, rendering script `/tmp/opentax-independent-plans-review.py`; frozen hashes in artifact `sha256-manifest.json`.

## Limits

This establishes the actual paired profitable Schedule C plan route and one-plan inventory within that same owned family. It does not claim independent verification by insurers or employers. Establishment and eligibility review references are retained declarative source evidence, not issuer authentication. At the time of the initial two-C proof, farm plans and mixed advanced-QBI/WOTC health families were not included; the extension below addresses its specifically sourced C/F family. Multiple businesses within one owner, zero/loss owner businesses, partnership/S-corporation plans, retirement adjustments, foreign earned income, Marketplace/PTC, and LTC/public-safety exclusions remain separate existing parent boundaries. Existing sole-plan, farm, ordinary owned-SE, and positive-QBI/zero-deduction branches are preserved and checked rather than bypassed.

## Mixed C/F independent plan extension (2026-10-06)

Retained learning: source health premiums never reduce owner SE earnings. Each
plan uses its establishing owner's actual filed profit and half-SE, then its
health deduction reduces that business's QBI. Full determined WOTC reductions
remain before profit/SE independently of current tax use. Farm principal G and
secondary NEC income, worker certificates/payroll, plan issuer and per-month
billing/payment/eligibility sources must remain distinct and owned. Finalized
7206 copy lines settle cents before their joint Schedule1 line17 sum.


### Implemented source scope

One profitable regular cash Schedule C owned by Alex and one profitable regular
cash Schedule F owned by Sam now establish distinct individual policies, each
with an actual owner, issuer EIN/name, policy number and issued-policy reference.
Each of the twelve issued premium/payment records joins the policy, owner payer,
covered person, actual calendar date, amount and retained monthly payment/policy
references. The existing monthly own/spouse employer-eligibility review and
complete business-plan inventories remain mandatory. A supplied net-profit,
half-SE or health deduction scalar in this source is rejected.

Farm agricultural 1099-G and secondary farm NEC issued copies join actual
retained farm-source payer/recipient/amount/document records. The C issued NEC
joins its own proprietor and receipts. Reviewed WOTC employer/payroll/SWA/worker
identity and group allocation sources remain retained in all six credit cases;
full determined wage reductions precede business profit and owner SE, even when
current tax use is smaller. The ordinary seventh case has no credit election;
it retains raw wage expenses and actual owned issued income without claiming
WOTC certification or credit use.

Family monetary lines settle per filed Form7206 copy before the joint Schedule1
line17 sum. Full premiums are raw $6,000.48 and $9,600.48, filed $6,000 and $9,600;
filed line17 is $15,600, not the rounded combined raw $15,600.96. Raw premium and
business source cents remain retained. Owner half-SE and SE tax remain unchanged
by health premiums. Attributable health reduces each business QBI in both Form8995
and sourced farm-WOTC Form8995-A; the latter retains the same actual plan family
and derived deduction in its source, including actual wage-total/AGI reconciliation.

| Source packet | Filed C/F health | Raw AGI | QBI deduction | WOTC current use | Total tax |
|---|---:|---:|---:|---:|---:|
| full | 6,000 / 9,600 | 300,430.86 | 14,086 | 2,400 | 53,770 |
| income-limited | 34,729 / 51,301 | 230,000.86 | 0 | 2,400 | 40,411 |
| excluded-months | 4,500 / 6,400 | 305,130.86 | 15,026 | 2,400 | 54,672 |
| excluded-all | 0 / 0 | 316,030.86 | 17,206 | 2,400 | 56,765 |
| phase | 6,000 / 9,600 | 482,524.37 | 30,278 | 2,400 | 123,056 |
| above-limited-credit | 6,000 / 9,600 | 1,232,114.86 | 166,423 | 236,285 | 111,536 |
| ordinary-no-credit-election | 6,000 / 9,600 | 298,131.86 | 13,626 | 0 | 55,507 |

The below-threshold credit family's C/F profits are $35,201/$55,201 after full
$1,200/$1,200 wage reductions; owner half-SE is $472/$3,900. The income-limited
packet retains actual monthly premiums $5,000.49/$6,000.49 and independently caps
each deduction at $34,729/$51,301. The phase packet retains raw C/F wage expenses
$4,000.49/$3,000.52 and group shares $1,371/$1,029. Health reduces taxable income
before QBI to filed $451,024 and the phase-in percentage to 56.424%; both source
and PDF retain it. The above packet still determines $384,000 WOTC ($192,000 per
employer), while actual current use is $236,285. This does not establish acceptance
of a later-year carryover. The all-excluded source retains both established plan
copies and actual payments with filed line1/line14 zero.

### Terminal evidence and held review

- Source/public/native/direct-PDF conflict and full local TY2025v5.4 XSD/filled-PDF
  gate: `/tmp/mixed-cf-health-terminal-focus.log`, 2 passed / 0 failed (40s).
- Original paired-C health, spouse Medicare, farm WOTC, mixed C/F controlled WOTC
  and farm optional compatibility: `/tmp/mixed-cf-health-compat.log`, 19 passed /
  0 failed (3m7s). Final income-join paired-C/held-scope replay is recorded in
  `/tmp/mixed-cf-health-final-compat.log`, 14 passed / 0 failed (22s).
- Seven reusable checked-in fixtures `owned-mixed-cf-health-*`. Actual issuer,
  owner, policy, calendar date, payment, establishing business, complete inventory,
  farm issued income, payroll, derived row, Schedule1, SE, AGI and QBI-source
  conflicts reject; detached native/Form7206 PDF descriptors also reject.
- Held generator: `/tmp/mixed-cf-health-held-final.log`; packet artifacts:
  `/tmp/opentax-owned-mixed-cf-health-oct6/.state/research/ty2025-filled-pdf-review/2026-10-06-owned-mixed-cf-health`.
  All 212 pages across 7 packets (32/31/32/32/33/33/19) rendered and inspected
  through 20 all-page contact sheets; all fourteen Form7206 pages additionally
  inspected at full size. Visual artifacts are in the sibling `-visual` directory.
  Both owner names/SSNs, 100% per-owner ratios, limited deductions, explicit zeros,
  separate owner SE, C/F income, credit statements, QBI rows/phase and final tax
  joins were reviewed. The initial inventory assumed NIIT/AMT descriptors from
  the credit fixture; actual lower income omits NIIT, and the no-credit ordinary
  case needs no Form6251. Final fixture inventories reflect actual emissions.
- Held checker/replay/full-XSD/hash/flatten evidence:
  `/tmp/mixed-cf-health-held-check.log`, exit 0, 7 cases / 212 pages.

### Remaining parent limits

This establishes the profitable regular MFJ C/F one-business/one-plan-per-owner
family, ordinary below-threshold and the actual reviewed farm-WOTC advanced
family. It does not establish two-farm health families, multiple businesses per
owner, loss/zero-owner business limits, optional-SE or cooperative patron plans,
ordinary advanced farm health without the reviewed WOTC source, retirement,
Marketplace/PTC, LTC/public-safety or foreign-income coexistence. The broader
owner/health/QBI parent stays open. Retained synthetic issued examples and review
references demonstrate calculation/source joins, not insurer/employer/SWA
external authentication or IRS business-rule/ATS acceptance. Independent plans
here do not classify their employers as independent for section52: the WOTC
employers remain actually reviewed as commonly controlled, and their one group
cap and filed allocation are preserved.
