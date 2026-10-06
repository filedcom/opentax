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

This establishes the actual paired profitable Schedule C plan route and one-plan inventory within that same owned family. It does not claim independent verification by insurers or employers. Establishment and eligibility review references are retained declarative source evidence, not issuer authentication. Multiple businesses within one owner, zero/loss owner businesses, partnership/S-corporation plans, farm plans, retirement adjustments, foreign earned income, Marketplace/PTC, LTC/public-safety exclusions, and mixed advanced-QBI/WOTC health families remain separate existing parent boundaries. Existing sole-plan, farm, ordinary owned-SE, and positive-QBI/zero-deduction branches are preserved and checked rather than bypassed.
