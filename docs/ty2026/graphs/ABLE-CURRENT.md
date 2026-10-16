# TY2026 ABLE source workpaper

The registered `able_accounts` source binds actual filer DOBs, W-2s and retained
business sources before AGI. Ordinary beneficiary contributions and distributions
now reach income, saver credit, owner Form 5329 and the static draft bundle.
Advanced account branches, current MeF/ATS and public filing remain open.

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

## Connected return and document paths

- AGI independently replays taxable earnings into Schedule 1 line 8q before
  Social Security, Marketplace income and tax. The PDF maps the pinned line 8q
  widget, and Schedule 1 reconciles to finalized AGI totals.
- Form 8880 requires the actual ABLE inventory reference instead of an absence
  assertion. Beneficiary cash enters line 1; gross current withdrawals enter
  each applicable line 4 column even when qualified expenses eliminate taxable
  earnings. Wages, owners, DOBs and review dates must match. Employment reviews
  reject conflicting actual voluntary employee-plan contributions.
- The dedicated Form 5329 collection replays retirement and ABLE sources, checks
  the same actual owners/wage/business inventories, and emits Schedule 2 line 5
  once. Each owner has one attachment containing Part I, Part II or both. If
  Part II requires a form, early distributions also use printed owner forms
  instead of the return-level code-1 shortcut; the sum of printed rounded taxes
  controls Schedule 2. Otherwise the existing direct-report shortcut survives.
- Form 1062 retains and reconciles the collection. Section 529A(c)(3)(A) tax is
  excluded from regular tax by [26 USC 26(b)(2)(Y)](https://uscode.house.gov/view.xhtml?req=%28title%3A26+section%3A26+edition%3Aprelim%29)
  and remains in actual other taxes rather than the deferred tax comparison.
  Any saver workpaper must contain the same ABLE inventory.
- Taxable ABLE earnings with MAGI above the applicable NIIT threshold explicitly
  require a reviewed section 1411 classification. This preserves the existing
  2025 coverage boundary; zero taxable earnings and income at the threshold do
  not activate this unsupported branch.

Validation covers gross-versus-taxable withdrawals, source-only intake, absence
and stale reviews, Social Security, Marketplace, NIIT boundary, combined Parts
I/II, joint owner rounding and Form 1062 preservation. PDF tests independently
read each Part II field and Schedule 1 line 8q after flattening, reconcile the
bundle and reject a stale Schedule 2 total or filer. The combined owner page and
Schedule 1 page were rendered and visually inspected. Existing retirement-only
PDF routes remain covered, including direct-report and zero-tax exception forms.

Validation for this increment: 767 source/node regression tests, 49 typed
source/graph/PDF checks, eight inventory-tool tests and the 137-test repository
unit gate pass. The loaded graph has 56 nodes, 294 declared edges and 16 edges
to unregistered targets; these counts do not establish full filing coverage.

## Remaining coverage

Native MeF and current-schema validation must accompany the wider 2026 filing
product. Final forms/instructions and above-threshold NIIT classification still
require review. The source route remains limited to ordinary living beneficiaries.

ABLE-to-ABLE transfers/rollovers, Trump-account rollovers, excess or returned
contributions, beneficiary changes/death/termination, remission periods and
multiple/closed account histories remain explicit unsupported source branches.
The current ordinary-source workpaper does not imply those cases are complete.

Validation: 12 typed 2026 workpaper tests and 39 typed 2025 ABLE return/PDF/MeF
regressions pass. The repository unit gate passes 137 tests and loads 3,780
graph modules. These checks verify this workpaper and shared behavior, not the
remaining 2026 graph, PDF or filing integration.
