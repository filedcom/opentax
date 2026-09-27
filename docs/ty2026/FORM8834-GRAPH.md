# TY2026 Form 8834 legacy electric-vehicle passive credit contract

Current authority: [Form 8834 (Rev. October 2024)](corpus/authorities/f8834--2024.pdf),
SHA-256 `6a48b2d674eaf6d41eb7c0d0fb1195ce996702b1ce32cacb44ee19f655ef81f9`.
Its embedded instructions say to use this revision for tax years beginning
in 2024 **or later** until superseded. The pinned [2026 Schedule 3 draft](corpus/draft/f1040s3.pdf)
still carries its allowable credit on line 6i. Recheck the current form,
Form 8582-CR and 2026 MeF XSD/rules before filing.

## Eligibility and source ledger

This form claims a **prior-year passive activity credit** from a qualified
electric vehicle placed in service before 2007, to the extent allowed this
year on Form 8582-CR for an individual. It does not create a new credit
from a 2026 vehicle purchase; those cases belong to Form 8936 or another
current credit route. Preserve original credit year/vehicle, activity ID,
passive-credit carryforward and current Form 8582-CR allowed amount. For
each activity, reconcile opening suspended credit, current release and
closing balance. Multiple activity outputs aggregate to Form 8834 line 1
only after Form 8582-CR limitation.

## Printed lines and return route

| Lines | Source and calculation |
| --- | --- |
| 1 | Qualified electric-vehicle passive activity credits **allowed this year** by Form 8582-CR. Do not use the gross old credit or current vehicle cost. |
| 2–4 | Line 2 is 1040 line 16 plus Schedule 2 line 1z. Subtract line 3a foreign tax credit and line 3b's earlier-priority credits, including 1040 line 19 and the specified Schedule 3 credits. The embedded instructions exclude Form 3800, prior-year minimum-tax, personal-use Form 8911 and Form 8912 from line 3b. |
| 5–7 | Use Form 6251 line 9 tentative minimum tax even when no AMT is owed; line 7 is the smaller of line 1 or line 6. Report line 7 on 2026 Schedule 3 line 6i, then Schedule 3 line 8 and 1040 line 20. The printed instructions say unused credit from this **Form 8834 tax-liability limit** is lost, not carried to another year. Keep that distinct from credit still suspended upstream under Form 8582-CR. |

## Current code boundary

- Shared `f8834` requires a Form 8582-CR source activity and sends tentative
  credit plus Form 6251 work into the TY2025 graph. TY2025 PDF/MeF have
  line-to-field and finalized-return reconciliation. The [current PDF
  inventory](pdf-fields-f8834.csv) has **11 terminal text widgets** on
  the form page; page 2 contains instructions. These are reusable baselines
  after 2026 line/MeF review, not registered TY2026 filing support.
- The input trusts `allowed_passive_activity_credit` as already released
  by Form 8582-CR; it does not build that activity-level passive credit
  ledger. TY2025 `IRS8834` XML uses old XSD names and pending paths.
  Form 8834 has no TY2026 registry, PDF or MeF route.

## Build order and acceptance

1. Recheck the official continuous-use revision, Form 8582-CR, final 2026
   Schedule 3 and current MeF accepted forms/XSD/rules.
2. Complete per-activity Form 8582-CR release before Form 8834 line 1;
   retain origin-year and closing suspended credit.
3. Recalculate lines 2–7 from finalized 2026 1040, Schedule 2/3, Form
   6251 and other credit-order outputs. Reconcile line 7 to Schedule 3
   line 6i, with the Form 8834 excess lost as instructed.
4. Render the 11 widgets, emit current `IRS8834`, test XSD/active rejects.
   Cover released credit, still-suspended credit, foreign/other-credit
   ordering, TMT limit, zero/lost line 7, multiple activities and TY2025
   regression.

This is a research and implementation contract, not registered TY2026
filing support.
