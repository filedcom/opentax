# TY2026 Form 4972 lump-sum distribution contract

Source snapshot: [IRS draft Form 4972 (2026)](corpus/draft/f4972.pdf),
SHA-256 `8eb90177af67e7c22a59f0a8ae0c2806808d3bccee45a65ea5bfedc4b95830ec`.
Its five PDF pages contain a draft cover, the form, and printed instructions
on pages 3–5. There is no need for a separate `i4972` draft to read the 2026
instructions. Recheck the final form, instructions and selected 2026 MeF
package before filing.

## Filing unit and source facts

Create an election record for each **plan participant's distribution**, with
recipient and participant identities, plan kind, every distribution from the
employer's plans of that kind, payout date, recipient share, rollover and
post-1986 election history. A beneficiary's election history is keyed to the
deceased participant; a participant's own history is separate. Keep the
Form 1099-R source ID and boxes 1, 2a, 3, 6, 8a, 8b and 9a, plus taxable
amount calculation if box 2a is blank. Capture any annuity value, federal
estate tax attributable to the distribution, death date, and whether to
include net unrealized appreciation (NUA) in current taxable income. The
alternate-payee/QDRO and multiple-recipient cases need distinct facts and
allocations. Do not infer an election from Form 1099-R distribution code A.

## Printed parts and return handoff

| Area | Calculation and route |
| --- | --- |
| Part I, questions 1–5b | Require entire balance from plans of one kind and no partial rollover; establish qualifying participant or beneficiary, five-year membership where applicable, and the relevant prior-election answer. Keep both 5a and 5b answers; a single prior-election boolean loses their different ownership. An eligible alternate payee is covered by the printed instructions but needs its own validation. |
| Part II, lines 6–7 | Elect 20% tax on the eligible pre-1974 capital-gain portion (1099-R box 3). Adjust line 6 using the printed NUA and death-benefit worksheets and any capital-share estate tax. If Part III is not elected, report the ordinary portion on 1040 lines 5a/5b and add line 7 to 1040 line 16. |
| Part III, lines 8–19 | Line 8 is box 2a less box 3 if Part II was elected; otherwise use box 2a, with the printed NUA/multiple-recipient variations. Apply any pre-August-21-1996 death-benefit exclusion on line 9 and attributable estate tax on line 18. Lines 12–16 calculate the minimum distribution allowance, skipped if line 12 is at least $70,000. |
| Part III, lines 20–30 | Account for any annuity actuarial value, use the printed tax rate schedule for lines 24/27, and calculate ten-year tax on line 29. Line 30 adds lines 7 and 29. If Part III was elected, the amount taxed here is excluded from ordinary income on 1040 lines 5a/5b. |
| Form 1040 line 16 | Add Part II-only line 7 or Part III line 30 to the line 16 tax calculation and **check box 2**. Keep the attached Form 4972 and its recipient identity linked to that tax. Form 6251 line 10's regular-tax calculation must remove Form 4972 tax as the 2026 path currently expects. |

The embedded schedule uses the same printed thresholds/base amounts as the
shared calculator's 2025 table (from $1,190 / 11% through over $85,790 /
50%). That comparison only validates the table, not the full calculation.
The printed multiple-recipient worksheet allocates line 29 by the recipient's
box 9a share; NUA and the death-benefit worksheet can change both Parts II
and III. Record the worksheet amounts and required `NUA`/`MRD` notation.

## Current code boundary

- Shared `form4972` computes a single recipient's basic Parts II/III and
  hands `form4972_tax` to the income-tax worksheet. It checks key eligibility
  facts and uses the same tax table printed in the 2026 draft, but its table
  comment still cites 2025. It has no participant/election history ledger,
  separate 5a/5b answers, alternate-payee path, NUA worksheet, or
  multiple-recipient allocation. It rejects estate tax with a capital-gain
  election instead of deriving its capital share. It omits the attachment
  when computed tax is zero.
- Shared `f1099r` sends box 2a, box 3, box 8a and recipient to Form 4972
  only when `exclude_4972` is set. That flag also suppresses the entire
  source from ordinary 1040 pension lines. This is wrong for a **Part II-only**
  election, where the ordinary portion remains on lines 5a/5b. Box 6 NUA,
  box 8b and box 9a do not reach the calculator. The eligibility/election
  answers must be merged from separately verified facts.
- TY2025 MeF has an `IRS4972` serializer and a 1040 line 16 document link,
  but its element names/rules are tied to `2025v5.4`. TY2025 PDF maps only
  three numeric fields and does not represent the full printed form.
  The [2026 draft inventory](pdf-fields-f4972.csv) has **58 terminal
  widgets**: Part I yes/no answers, form lines, split line 20 decimal, and
  editable instruction worksheets. It is a field baseline, not a complete
  renderer. Form 4972 is absent from the TY2026 registry and PDF/MeF routes.

## Build order and acceptance

1. Refresh the final 2026 Form 4972/1040 and current 2026 MeF XSD/rules;
   diff Part I answers, line destinations, document links and PDF fields.
2. Model one election per participant distribution and recipient. Resolve
   qualifying plan/balance, birth/death/five-year facts, rollover, prior
   elections and 1099-R taxable amount before suppressing any 1040 income.
3. Implement both election combinations, NUA, death-benefit and estate-tax
   allocations, annuity, and multiple-recipient worksheets. Preserve source
   and recipient IDs; reconcile 1099-R taxable amount between Form 4972 and
   1040 lines 5a/5b, including the Part II-only ordinary remainder.
4. Fill and render Part I, all applicable lines and worksheet/notation
   fields. Emit current `IRS4972` for each required attachment and link its
   line 7/30 tax to 1040 line 16 box 2. Validate current XSD and active
   rejects. Cover Part II only, Part III only, both, annuity, death benefit,
   estate tax, NUA, beneficiary, QDRO, multiple recipients, ineligible
   rollover/prior election, zero-tax attachment, and TY2025 regression.

This is a research and implementation contract, not registered TY2026
filing support.
