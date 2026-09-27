# TY2026 Form 1099-G government-payment source graph

Snapshot: September 27, 2026. The IRS final December 2026
[Form 1099-G](corpus/authorities/f1099g--2026.pdf) and
[instructions](corpus/authorities/i1099g--2026.pdf) are pinned at SHA-256
`65a416c52508d8a3d77ee1734194767d1e1c8a607c778fd1914dd1a62da569a2`
and `e89dac8a60ad285af82a668aeb63e551481f2811b4633b49e09ec1d171031928`.
The [Revenue Ruling 2025-4 bulletin](corpus/authorities/irb25-07.pdf),
SHA-256 `844470ed0f3172a774c20bdd661d30c6113778c0fb3a5bc1e8ab5a489541ae79`,
supplies the family/medical-leave tax distinction. This recipient form
is source evidence, not automatically a Form 1040 attachment.

## Box-to-return contract

| Form 1099-G source | Required calculation and 2026 handoff |
| --- | --- |
| Box 1 unemployment; separately documented repayments | Reconcile each state's box 1 with taxpayer benefits and any same-year repayment. The pinned [Schedule 1 draft](corpus/draft/f1040s1.pdf) has line 7 unemployment plus its repayment checkbox/amount. Prior-year repayment is a different claim-of-right/deduction question; do not net it against current box 1 without source authority. An identity-theft/incorrect form is a correction case, not taxable compensation. |
| Boxes 2/3 state or local income-tax refund and original tax year | Recover **only the prior-year federal tax benefit**, using the specified prior-year return's actual state-tax deduction, SALT limit, standard/itemized choice and any other recovery facts. Print taxable part on Schedule 1 line 1 and 1040 AGI. A refund can be received by offset or carryforward; cash receipt is not required. Track interest separately through 1099-INT. |
| Box 8 business-income-tax marker on box 2 | Distinguish a tax applying exclusively to business income from a general state income tax. Reconcile the original activity's tax expense and recovery, then route the taxable amount to its Schedule C/F/other business owner rather than automatically to Schedule 1 line 1. |
| Box 4 federal withholding | Preserve the payer source and reconcile once to 1040 line 25b, even if a benefit is reduced, excluded or later corrected. |
| Box 5 RTAA and box 6 taxable grants | RTAA is typed Schedule 1 other income. Classify a grant by its program and underlying activity; a business/farm grant can require that activity's income route rather than a blanket Schedule 1 line 8z. Issuer reporting minimums do not decide recipient taxability. |
| Box 7 USDA agricultural payments; box 9 Commodity Credit Corporation market gain | Preserve farm ID and payment/loan/election history, including nominee/pro-rata allocations, then reconcile Schedule F and any CCC loan election/repayment statement. Avoid a second income entry when a farm ledger already contains the payment. |
| New box 10 state paid **family leave** benefits | Revenue Ruling 2025-4 treats these state benefits as gross income but **not employment-tax wages**. Preserve amount and state withholding, send the taxable benefit to a typed other-income source and AGI after confirming the final 2026 1040 instruction line. Do not route it to Schedule SE, W-2 wages or the Form 1099-G unemployment line. The ruling treats state **medical leave** benefits separately, including contribution-source and third-party sick-pay rules; do not classify those as box 10 family leave. |
| New boxes 11a/11b/12 state details | Preserve state code, payer ID and state withholding for state-return work; do not treat box 12 as federal withholding. |

## Current implementation boundary

The shared [`f1099g` node](../../forms/f1040/nodes/inputs/f1099g/index.ts)
is registered in the TY2026 graph for unemployment, a supplied
tax-benefit-adjusted refund, RTAA, taxable grants and box 4 withholding.
The [Schedule 1 plan](SCHEDULE1-GRAPH.md) records its successful focused
calculation/PDF tests. It correctly refuses to route several incomplete
2026 branches: box 8 business refund, box 7 agricultural payment, box 9
CCC market gain and new box 10 family leave. This is an explicit filing
gap, not a reason to drop those 1099-G sources.

The node aggregates box 1 across forms and rejects TY2026 repayments
greater than current receipts. Preserve each benefit year and repayment
date to distinguish same-year netting from a prior-year tax recomputation.
Its box 2 `box_2_taxable_amount` is caller supplied and bounded by the
refund, but the prior-year tax-benefit worksheet is not calculated. Box 6
currently assumes Schedule 1 other income for every grant. The node's
declared Schedule F target is absent from the focused 2026 registry, so a
farm source needs its complete graph, PDF and MeF route before activation.

## Build and acceptance

1. Ingest payer/account, tax year, corrected status, box values and
   source-program facts. Connect box 2/8 to the prior return's actual
   deduction and box 7/9 to a farm/CCC ledger; add state PFML family-leave
   classification for box 10.
2. Calculate or validate the tax-benefit recovery, repayment treatment,
   activity-specific grants/business tax recovery and family-leave income.
   Send every allowed amount to one 2026 Schedule 1/C/F destination and
   AGI. Reconcile box 4 withholding and state-only boxes separately.
3. Establish from the current MeF package whether the 1099-G source form,
   an explanation statement or only derived return lines are filed. Render
   all required 1040/Schedule 1/C/F pages and reconcile each graph amount
   with XML and the final PDF bundle.
4. Test ordinary unemployment, same-year and prior-year repayment,
   identity-theft correction, a state refund limited by prior SALT benefit,
   box 8 business tax recovery, RTAA, business versus personal grant,
   nominee farm subsidy, CCC market gain, taxable family leave and a
   medical-leave amount that must not take the box 10 path. Keep TY2025
   regressions.
