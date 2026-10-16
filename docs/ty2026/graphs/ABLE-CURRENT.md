# TY2026 ABLE source workpaper

The internal `calculateAbleSources2026` workpaper validates owned ABLE accounts,
beneficiary contribution payments, annual distributions and qualified expenses.
It is not registered in the 2026 graph or public filing catalog. Its outputs
prepare the remaining Form 8880, Schedule 1 and Form 5329 integration; no filed
ABLE income, additional tax or credit is claimed by this increment.

## Authority and annual differences

- [Rev. Proc. 2025-32, section 4.34](https://www.irs.gov/irb/2025-45_IRB) sets
  the **2026 ABLE contribution limit at $20,000**; do not substitute the gift-tax
  exclusion. The revenue procedure was already pinned in the corpus.
- The [December 2026 instructions](../corpus/authorities/i1099qa--2026.pdf)
  specify the April 2025 continuous-use Form 1099-QA and December 2026 Form
  5498-QA for calendar 2026 reporting. Both source forms are pinned, with hashes
  in the corpus manifest. The new Form 5498-QA box 8 reports Trump-account
  rollovers and is explicitly zero-only pending that source branch.
- Eligibility requires blindness/disability onset before **age 46**, matched to
  the actual owner's DOB, program eligibility basis and reviewed evidence.
- The employment addition uses the **preceding calendar year's** one-person HHS
  guidelines: $15,650 continental/DC, $19,550 Alaska and $17,990 Hawaii. The
  [January 17, 2025 HHS notice](../corpus/authorities/hhs-poverty--2025.pdf)
  is pinned. A complete, contiguous residence calendar selects the state in
  which the beneficiary resided longest.
- [26 CFR 1.529A-3](https://www.govinfo.gov/content/pkg/CFR-2023-title26-vol9/pdf/CFR-2023-title26-vol9-sec1-529A-3.pdf)
  supplies the annual distribution/expense ratio and election for expenses
  paid in the first 60 days of the following year; for 2026 that ends March 1,
  2027. Evidence must exist by the workpaper's review date.

## Reused calculations and source reconciliation

The existing ABLE distribution and employment schema factories now take a year;
the original exports instantiate **2025** and retain their former date guards.
The annual earnings-ratio and compensation-limit arithmetic is shared, with
2025 and 2026 poverty amounts supplied separately. Both years also use the same
W-2 plan-contribution check. IRA-based SARSEP/SIMPLE codes F/S do not by themselves
establish a disqualifying defined-contribution, 403(b) or 457(b) contribution.

The 2026 account schema reuses stable issuer/payment fields while explicitly
replacing every annual field and schema. It reconciles Form 5498-QA box 1 to
beneficiary cash plus other contributors and QTP transfers. Only beneficiary
cash becomes the saver-credit contribution. The amount above the base limit
must be attributable to the beneficiary and supported by the employment limit.

Employment claims select actual W-2 references and business references; they
cannot enter compensation or SE deduction totals. The workpaper replays the
2026 business calculation, matches all owner wages/businesses and checks plan
contributions, current-service wage evidence and personal-service business
reviews. Unsupported statutory wages and deferred wage compensation require
separate reconciliation. Current issued forms/program substitutes must reflect
corrections, with distinct references and one account per current filer.

Ordinary living-beneficiary distributions reconcile gross, earnings and basis to
dated payments. Qualified expenses are owner-bound, disability-related and
reviewed against duplicate tax benefits/years. The entire gross distribution is
retained for Form 8880; the taxable earnings ratio separately produces owner
Form 5329 Part II lines 5-8, rounding taxable income before the 10% tax. Qualified
expenses above gross never create a negative taxable amount. Joint owners keep
separate amounts and source records.

## Remaining integration and coverage

1. Register an ABLE source producer **before AGI**. Bind general DOBs, actual
   W-2s and retained business sources, then emit reconciled Schedule 1 line 8q
   and retained ABLE sources. A post-tax credit node must not create income.
2. Add the source to AGI/SSA/Marketplace and tax replay. Above-threshold taxable
   earnings need an audited NIIT classification; income must not silently bypass
   that owner. Current 2025 output checks also require this classification.
3. Match the saver claim to the actual ABLE inventory and bind its line 1 cash
   and current gross distributions. Check the employment allowance against the
   actual voluntary employee-plan contribution review as well as W-2 facts.
4. Merge each owner's Part II with any retirement Part I on **one Form 5329**;
   reconcile total additional tax, PDF pages and Schedule 2. Preserve actual
   ABLE tax during Form 1062 credit comparisons.
5. Exercise mixed retirement/ABLE, joint owners, zero taxable distributions,
   employment/business limits and PDF bundle scenarios. Then add native MeF and
   current-schema validation with the wider 2026 filing product.

ABLE-to-ABLE transfers/rollovers, Trump-account rollovers, excess or returned
contributions, beneficiary changes/death/termination, remission periods and
multiple/closed account histories remain explicit unsupported source branches.
The current ordinary-source workpaper does not imply those cases are complete.

Validation: 12 typed 2026 workpaper tests and 39 typed 2025 ABLE return/PDF/MeF
regressions pass. The repository unit gate passes 137 tests and loads 3,780
graph modules. These checks verify this workpaper and shared behavior, not the
remaining 2026 graph, PDF or filing integration.
