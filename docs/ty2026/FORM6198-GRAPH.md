# TY2026 Form 6198 at-risk activity contract

Source snapshot: the IRS currently posts [Form 6198, Rev. November
2025](corpus/authorities/f6198--2025.pdf), SHA-256
`8ae169186ad9f62910e73205ebaeb02a73bc74bb1a47954074ec14e4645a6389`,
and [instructions](corpus/authorities/i6198--2025.pdf), SHA-256
`444d8002c734359b0f75235bd5461c9019cf4e871742243de1021ec14ceb0e1d`.
The instructions explicitly say they are for the November 2025 **or later
revision**. The draft `f6198--dft.pdf` and `i6198--dft.pdf` URLs still serve
2025, so a 2026 annual draft is not a prerequisite if this continuous-use
revision remains current. Verify the IRS current-revision page and selected
MeF release before filing; any superseding revision requires a new comparison.

## Activity and basis record

Apply the at-risk rule **per activity** after ownership/basis limitations and
before [Form 8582 passive losses](FORM8582-GRAPH.md) and [Form 461
excess-business losses](FORM461-GRAPH.md). Keep stable owner/activity/K-1 IDs,
whether an activity is aggregated under §465, its trade/property type,
opening adjusted basis, cash/property contributions, recourse debt,
qualified nonrecourse real-property financing, excluded nonrecourse or
related-party debt, distributions and withdrawals, prior deductions,
guarantees/stop-loss protection, dispositions, current income/loss and
previously suspended losses by **origin year and tax character**. A partnership
or S-corporation interest may need a separate at-risk calculation from the
entity's activity classification. The form's activity description and each
source form/line must be retained through a multi-item allocation.

The instructions' filing rule covers an activity with an amount **not at
risk** and a loss; a separate borrowed-amount rule applies to the general
activity category. Resolve the actual filing condition from the activity
facts, even when its final deductible loss is zero. The pre-1987 real-property
exception, qualified nonrecourse financing, nonrecourse loans secured by
other taxpayer property, related-party lending and recapture all need explicit
facts. An `amount_at_risk` entered by the caller does not prove any of them.

## Printed form calculation and output

| Part / line | Calculation and reconciliation |
| --- | --- |
| Header | Filer name/ID and **description of activity**. Produce the required separate form per at-risk activity/allowed aggregation; link it to Schedule C/E/F/4835, K-1 or other source. |
| I, 1–5 | Line 1 is ordinary activity income/loss, including prior losses newly considered. Lines 2a/2b/2c split disposition gain/loss among Schedule D, Form 4797 and another identified form (for example Form 4684); line 3 holds other K-1 activity income/gain, and line 4 other deductions/losses including eligible Form 4952 investment interest. Line 5 is the signed sum. Reconcile to **pre-at-risk** source rows, with each transaction counted once. |
| II, 6–10b | Simplified amount-at-risk computation: opening adjusted basis, current increases, subtotal, current decreases and excluded amounts, then line 10a and positive line 10b. This method requires a defensible adjusted basis and the instruction's ownership/financing treatment. A zero/nonpositive result may require §465(e) recapture; do not turn a negative raw result into zero without the recapture decision. |
| III, 11–19b | Detailed method: investment and changes from the effective date or the prior Part III line 19b, with the printed 15/16/18 elections/checkboxes and signed line 19a. It may produce a larger at-risk amount than Part II. Preserve prior-year Part III history, debt and contributed-property components; **prior Part II line 10b is not line 15b**. |
| IV, 20–21 | Line 20 is the larger of 10b or 19b. If line 5 is a loss, line 21 is the deductible portion up to line 20, subject to later passive and other limits. If Part I contains multiple loss items, allocate the allowed and suspended portions across their Schedule C/D/E/F, Form 4797/4684/4835/K-1 and tax-character destinations by the instruction fraction. Save disallowed amounts with source and origin year for 2027. |

The [continuous-use PDF inventory](pdf-fields-f6198.csv) has **34 terminal
widgets** on one page, all in the field tree. The widgets have **no tooltip
text**; mapping must be checked against their rectangles and a rendered
form. On the pinned revision, `f1_1` and `f1_2` are name/ID, `f1_3` is the
activity description, `f1_4` is line 1, `f1_10` is line 5, `f1_16` is line
10b, `f1_26` is line 19b, `f1_27` is line 20 and `f1_28` is line 21.
The `c1_1`–`c1_3` button pairs represent the Part III alternatives. The
TY2025 PDF descriptor currently maps `current_year_income` to **`f1_3`
(activity description)** and other aggregate fields to unrelated line
positions. Replace it with source-backed printed values and inspect the
appearance after filling.

## Current code boundary

- Shared `form6198` adds a Schedule C and Schedule F loss, a prior suspended
  total and current income, compares the net amount to one supplied
  `amount_at_risk`, then sends the disallowed portion as a **direct Schedule
  1 and AGI addback**. It does not construct Parts I–IV, allocate several
  loss items, compute basis or detailed Part III, or derive recapture. Its
  single `suspended_at_risk_loss_6198` carryforward loses activity, source,
  origin year and tax character. Direct Schedule 1 addbacks also bypass
  activity profit/SE/QBI and later passive/EBL calculations.
- Separate Schedule C/F/4835 source functions have a narrower simplified
  at-risk computation, and the TY2025 MeF serializer builds simplified XML
  only for qualifying C/F source items. It rejects aggregate Form 6198
  pending fields; it does not emit the full Part I/III/source-allocation
  surface or the Form 4835/K-1 branches. These paths must converge on one
  activity result rather than each deciding the allowed loss independently.
- `form6198` is absent from the TY2026 registry/PDF builder, and there is no
  TY2026 MeF serializer. The TY2025 XML tags are not evidence of current
  2026 XSD order, form-instance cardinality or active business rules.

## Build order and acceptance

1. Confirm that the November 2025 continuous-use form/instructions remain
   current for the selected TY2026 filing release. Pin any superseding
   Form 6198 or Pub. 925 guidance and reconcile the filing trigger and
   exceptions. Carry prior 2025 at-risk and entity-basis records forward.
2. Build a source-keyed activity ledger and return **allowed and suspended
   items**, not an aggregate addback. Compute Part I from pre-limit income,
   dispositions and deductions; determine Part II or III from documented
   basis/financing history; apply Part IV to each loss item. Derive §465(e)
   recapture from the at-risk history and route ordinary income correctly.
3. Send allowed items back to their owning Schedule C/E/F/4835, K-1, Form
   4797/4684 or capital transaction before Form 8582, Form 461, Schedule SE,
   QBI and AGI. Store suspended amounts by activity/form/character/origin,
   including prior losses released by current income or a disposition.
4. Build and visually check the 34-widget PDF. Select the authorized current
   TY2026 MeF XSD and business rules, then build repeated Form 6198 instances
   and any required statements from the same activity ledger. Compare PDF,
   XML, source schedules and carryforward totals. Re-run TY2025 regressions
   for shared source code.
5. Test a zero/partial/full allowance, opening suspended loss released by
   income, multi-item Schedule C plus Form 4797/Schedule D loss, Schedule E
   K-1 basis followed by at-risk, farm and Form 4835, qualified versus
   disqualified nonrecourse financing, related-party debt, simplified versus
   detailed Part III, a negative at-risk/recapture case, the real-property
   exception, and a loss that then fails passive or excess-business-loss
   limits. Verify both filed forms and 2027 carryforward records.

This is the source and implementation contract for the at-risk stage. It
remains open until its complete TY2026 calculation, validation, PDF, MeF and
return-level evidence pass.
