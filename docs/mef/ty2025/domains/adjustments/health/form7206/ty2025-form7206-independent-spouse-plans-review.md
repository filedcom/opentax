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


## Current-main C/F health verification

Source `c7c8c4d34` passes the six-file main gate: **22 passed, 0 failed (2m13s)**. It includes the new C/F returns, prior independent C/C plans, spouse Medicare, controlled C/F WOTC, controlled farms and the standalone Publication974 import. Log `/tmp/opentax-mixed-cf-health-current-main.log`, SHA256 `000df1e12ebd396ff791253578f8a49db15a00f62e0a1bd130a44a0642f09d35`.

A fresh current-main batch at `/tmp/opentax-mixed-cf-health-held-main-oct6` passes held replay of **7 cases / all212 reviewed pages**. All seven PDFs are byte-identical to the isolated reviewed outputs; form copies, owners and page origins agree before reviewed page slots are transferred. The new source/XML snapshots retain current graph source fields; the original artifacts remain untouched. Checker `/tmp/opentax-mixed-cf-health-held-main-check.log`; manifestSHA256 `a8d24f7cf57ec409b53899ff7b69e3039f6cd1c58f85bd450dd4ed0edb5651c3`. All seven full return XMLs pass local2025v5.4XSD. These prove the documented C/F health routes; wider owner/source combinations and IRS acceptance remain open.
## Two-farm extension learning checkpoint (2026-10-06)

Before edits: retain both real farm proprietors and independent section52
ownership exception sources, both agricultural G/secondary NEC issued copies,
certified employee payroll, and full determined reductions before separate owner
SE. A health plan cannot borrow its other spouse's profit or half-SE. A loss
proprietor has no positive net-profit health deduction capacity; retain that
owner's actual policy/payments and source inventory without inventing positive
income or an SE instance. Optional/patron/retirement/PTC and unsupported
multiple-owner-business branches remain excluded. Separate-copy filed rounding
and actual current-use credit limitation from the preceding C/F proof must be
preserved.

## Actual independent two-farm plans (2026-10-06)

Extension proof base `d1e1376a0` retains the existing twoFarmWotc public issued
agricultural 1099-G/secondary NEC, actual farm identities, direct-employer
payroll/SWA/W2 and all four reviewed spousal-attribution exceptions. Each owner
has one regular cash farm and one established plan with
insurer/EIN/policy/holder and twelve actual monthly payment/date/source records.
Mailing or marriage facts alone do not classify the employers as independent.
Full determined wage reductions precede each owner's SE, health, QBI and joint
current-credit use.

[IRS Instructions for Form7206](https://www.irs.gov/instructions/i7206) require
positive C/F profit (except stated optional-method and other qualifying routes),
exclude employer-eligible months, require separate forms for established plans,
and prohibit using health deductions to reduce SE earnings. Applying those
separate-owner income limits, the actual negative farm retains its policy,
payments, loss and zero capacity; it does not borrow spouse profit and does not
emit a fabricated positive SE or Form7206 copy. The derived unfiled row is
explicitly marked `independent_plan_required:false`, with actual negative source
income. Both successful zero deductions from excluded months remain filed on
profitable owners' copies. Raw payment cents are retained; each filed copy
rounds finalized lines before Schedule1 sums line14.

| Actual public case    | Filed health sum |   Raw AGI | QBI deduction | Current WOTC use | Total tax |
| --------------------- | ---------------: | --------: | ------------: | ---------------: | --------: |
| full                  |            15600 | 302729.86 |         14546 |             4800 |     52033 |
| income limited        |            88329 | 230000.86 |             0 |             4800 |     38233 |
| excluded months       |            10900 | 307429.86 |         15486 |             4800 |     52936 |
| all months excluded   |                0 | 318329.86 |         17666 |             4800 |     55028 |
| phase in              |            15600 | 480053.37 |         32337 |             4800 |    118927 |
| above, limited credit |            15600 | 995328.86 |        119066 |           183719 |     85590 |
| loss owner            |             9600 | 463252.37 |         21189 |             4800 |    109884 |

Below threshold filed farm profits are 36401/56401 after the full 2400 credit
reduction per farm. Filed half-SE is 488/3985; income-limited health is
35913/52416. Raw full premiums 6000.48/9600.48 settle to 6000/9600. Above range,
the full 384000 reduction remains although only 183719 is currently used. Loss
profits are -10001/196401, spouse half-SE 13548, primary health capacity zero;
primary paid premiums remain retained. Schedule8995-A C nets the actual loss.

Terminal evidence: `/tmp/two-farm-health-final.log` 2/0 (40s), full public
graph, native/XML full2025v5.4 schema and rendered PDF; compatibility
`/tmp/two-farm-health-compat-final.log` 16/0 (1m27s), paired C/C, mixed C/F,
two-farm WOTC and farm-loss source routes. Added negative replay covers
fabricated absent business kinds and forged loss capacity, in addition to
issuer/owner/date/
policy/payment/inventory/agriculture/payroll/control/SE/health/AGI/QBI and
detached descriptor conflicts. Seven reusable `owned-two-farm-health-*` held
fixtures produce 217 pages (31/30/31/31/32/32/30). All pages were reviewed
through 21 contact sheets; thirteen Form7206 pages additionally reviewed at full
size, including spouse-only SE/7206 ownership in the loss packet.

Artifacts:
`/tmp/opentax-two-owned-farm-health-oct6/.state/research/ty2025-filled-pdf-review/2026-10-06-two-owned-farm-health`
and sibling `-visual`; generator `/tmp/two-farm-health-held-generate.log`
terminal0. Final held replay/hash/schema evidence is
`/tmp/two-farm-health-held-check.log`.

This establishes regular reviewed independent two-farm source plans, including
one actual loss owner, without extending loss C/F, multiple businesses per
owner, optional/patron/retirement/PTC or unsupported ordinary advanced farm
plans. The broader owner/health/QBI parent and external insurer/employer/SWA
authentication, IRS business rules and ATS acceptance remain open. Synthetic
reviewed issued examples demonstrate binding and arithmetic, not authentication.

Single-plan calculator/actual zero-eligible Medicare source compatibility:
`/tmp/two-farm-health-single-compat.log`, terminal0, 14/0 (7s).

## Integrated two-farm held replay

Detached current-main42cccdf15 passes held replay7/all217 reviewed pages (checker terminal0). Artifact root `/tmp/opentax-two-farm-health-main-replay-oct6/.state/research/ty2025-filled-pdf-review/2026-10-06-two-farm-health-main42`; logs `/tmp/two-farm-health-main42-generate.log` and `/tmp/two-farm-health-main42-check-final.log`. Every PDF/XML digest, copy, page origin and owner matches the originally inspected packets. Source snapshot differences are exactly three integrated credit/health/owner-SE fields, independently bound to retained sources; remaining JSON values, public inputs and filer agree. Reviews transferred after these comparisons, and originals remain untouched. Digest inventory `/tmp/two-farm-health-main42-digests.json` SHA256 `693918002bab87316ed172d7fe0421cead8428c10a253765837db1645a0f49c5`. Main source/compatibility gate remains live; broader parents stay open.

Integrated main eight-file source/conflict/compatibility gate:51 passed/0 failed(4m16s), `/tmp/opentax-tip-two-farm-health-current-main.log`. This includes tip-health, two-farm/C-F health, prior C/C health, original tips, Medicare/zeroeligibility and Publication974. Prior running-only checkpoint is superseded by this terminal result.

## Mixed C/F loss-owner learning checkpoint (2026-10-06)

Before edits, the pure owner-health helper permits actual loss capacity only for
two F businesses; the core binder already requires the full actual C/F receipt,
owner-SE, plan, wage reduction and return joins. Extend only one actual regular
C and one actual regular F, one per joint owner, retaining at least one positive
owner and the existing nonpositive capacity/source row. Keep loss C/C, optional,
patron, Marketplace and multiple-business claims outside this bounded extension.
Do not remove the tip-health core/wrapper or scalar/source guards. Established
paid policies remain retained; loss owners cannot borrow spouse profit or SE.

## Actual mixed C/F loss-owner source proof (2026-10-06)

Isolated base `71debbb4c`. The [2025 Form7206 instructions](https://www.irs.gov/instructions/i7206)
require the establishing business's earned-income limit, allocable half-SE and
ineligible employer-plan months to be applied before line14. A regular-method
loss business does not gain capacity from the other joint owner's profit.
The reviewed established policy and actual monthly payments remain in public
source and the nonpositive row, with zero capacity and no filed Form7206 or
ScheduleSE copy for that owner. The positive owner's existing lines4–14
calculation and separate copy remain required, even when excluded months make
the deduction zero.

The pure eligibility extension permits exactly one actual regular C and one
actual regular F, one per joint owner, with at least one positive business. All
existing issuer/month/owner/business inventory and native source binders remain.
The graph exposed a separate source defect: a negative ScheduleC appropriately
omits the legacy aggregate SE tax input, but Form7206's inventory had reused
that absent input as zero. Its emitted C/F totals now sum the actual owned
business source rows. Owner SE taxes, positive instances, wage caps, half-SE and
Schedule1A/tip outputs are unchanged; actual negative profit is retained.

Six fixtures use the existing actual reviewed controlled mixed-employer source
with employee/SWA/payroll identities, issued agricultural1099-G and secondary
NEC, full group credit2400 allocated1200 per employer, and full wage reductions
before ownerSE and health. Original loss C has raw receipts20000.50,
wages6000.49 and supplies26401.50; its filed loss is−11201 after credit.
The reversed case changes actual receipts and expense leaves plus corresponding
issued G/NEC records, yielding positive C195201 and loss F−11201. No scalar
profit, SE, health, QBI or tax amounts substitute for the public calculations.

| Owned source / paid-plan case | Health deduction | Raw AGI | QBI deduction | Current3800 credit | Total1040 tax |
| --- | ---: | ---: | ---: | ---: | ---: |
| lossC / positiveF, full | 9600 | 460868.37 | 21822 | 2400 | 111277 |
| lossC / positiveF, income limited | 181669 | 288799.37 | 0 | 2400 | 74182 |
| lossC / positiveF, all months excluded | 0 | 470468.37 | 20032 | 2400 | 114922 |
| positiveC / lossF, full | 6000 | 475386.37 | 18972 | 2400 | 94998 |
| positiveC / lossF, income limited | 192587 | 288799.37 | 0 | 2400 | 52346 |
| positiveC / lossF, all months excluded | 0 | 481386.37 | 17548 | 2400 | 97374 |

The positive F half-SE is13532; positive C half-SE is2614. Income-limited
policies retain actual raw premiums240005.88 (filed240006) for each owner;
only the positive owner's capacity181669/192587 is deducted. Those two returns
have actual negative QBI−11201 and filed Form8995 loss carryforward11201.
Full/excluded returns retain actual loss netting through Form8995-A ScheduleC.
All six source returns pass full local2025v5.4 XSD and direct PDF rendering,
with one owner SE and one Form7206 copy. Public issued payment/policyholder,
receipt owner/amount, inventory, control and optional-method conflicts and
prepared loss capacity/positive flag, source profits, health/AGI/QBI and full
credit conflicts reject native and directPDF export.

Terminal evidence: `/tmp/mixed-cf-loss-health-focus-final.log`,2/0(39s);
`/tmp/mixed-cf-loss-health-compat.log`,26/0(2m43s), covering prior two-farm,
positive C/F, C/C health and actual tip-health. Held artifacts at
`/tmp/opentax-mixed-cf-loss-health-oct6/.state/research/ty2025-filled-pdf-review/2026-10-06-mixed-cf-loss-health`
contain six packets182 pages (31/29/31/31/29/31). Every page reviewed through
18 contact sheets; all six Form7206 pages additionally inspected full size.
Source owner, actual group allocation, SE, health, loss netting, final tax,
checkboxes and layout joins reviewed. Generator terminal0:
`/tmp/mixed-cf-loss-health-held-final.log`. The held generator used an isolated
uncommitted catalog harness; the fixture factory and tests remain reusable
without changing the catalog. Original212/217/tip-health artifacts are untouched.

This bounded proof does not extend loss C/C, multiple businesses per owner,
optional/patron/PTC/retirement plans or community allocations. External insurer,
issuer/employer/SWA authentication, IRS business rules and ATS acceptance remain
open; reviewed synthetic issued examples prove binding and arithmetic only.
The broader Form7206/owner-SE/QBI source parent is not closed.

Held checker terminal0: `/tmp/mixed-cf-loss-health-held-check.log`,6 cases/all182 pages; source/PDF/XML hashes and full2025v5.4 XSD confirmed. Temporary generator registration patch retained only in ignored `.state/research/mixed-cf-loss-health-generator-harness.patch`; catalog restored before commit.

After restoring the catalog, direct fixture-factory proof is terminal2/0(34s),
`/tmp/mixed-cf-loss-health-committed-factory-focus.log`. Held manifest SHA256:
`4832d76810fade12d85339444c12ece8dabd6cf5805a31e0feb0d819eccb485a`.
Packet digest inventory `digest-report.json` SHA256:
`7ced117b9876b61f99d440014999e10752e0f1725abb63672ea9a9da4959242c`.
To reproduce held generation/check, apply only the ignored harness patch in an
isolated checkout, use `/tmp/mixed-cf-loss-health-selection.json` as the third
generator argument, and restore the catalog afterward. The exact completed
checker command was:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run -A scripts/research/check-ty2025-pdf-review.ts .state/research/ty2025-filled-pdf-review/2026-10-06-mixed-cf-loss-health /Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd
```

Final direct-factory test with explicit XML netloss−11201/carryforward11201
assertions: terminal2/0(34s), `/tmp/mixed-cf-loss-health-final-loss-lines.log`.
