# Form 6198 Scratchpad

## What upstream sends

From schedule_c (line 226-227 in index.ts):
  { schedule_c_loss: netProfit }   ← negative number (loss), only when at_risk box "b"

From schedule_e (line 283 in inputs/schedule_e/index.ts):
  { prior_unallowed: totalPriorAtRisk }  ← positive number

## Core logic (IRC §465)

1. Gather total current-year loss from activity (Part I line 5)
2. Gather amount at risk (Part II line 10b or Part III line 19b)
3. Deductible loss (Part IV line 21) = min(total_loss, amount_at_risk)
4. Suspended loss = total_loss - deductible_loss

## Routing decision

- If loss <= amount_at_risk: loss is fully allowed (no form6198 limitation applies)
- If loss > amount_at_risk: only amount_at_risk is deductible; remainder suspended

## What form6198 outputs

- Allowed loss → the source form (schedule_c → schedule1 line3 adjustment? No.)
  Actually: the upstream (schedule_c) already routed a loss to schedule1.
  Form 6198 needs to ADD BACK the disallowed portion (positive) to schedule1.
  OR: form6198 routes the suspended loss as a memo field for carryforward tracking.

## Re-thinking the data flow

Looking at the IRS instructions more carefully:
- schedule_c sends the full loss to schedule1 (line3_schedule_c = negative)
- schedule_c ALSO sends the loss to form6198 for at-risk limitation check
- form6198 computes how much is disallowed
- The disallowed amount must be added back (reduces the deduction)
- Form 6198 line 21 = deductible loss

So form6198's job:
1. Receive the loss(es) from upstream activities + amount_at_risk
2. Compute allowed = min(total_loss_abs, amount_at_risk)
3. Compute disallowed = total_loss_abs - allowed
4. Route disallowed amount back to schedule1 as a positive adjustment (adds back)
   OR route to a suspended_loss tracking field

Actually, looking at how form8582 works (also UnimplementedTaxNode), this pattern
suggests form6198 is also an intermediate node that:
- Receives upstream data
- Computes the at-risk limitation
- Produces output adjustments

The most natural output is: form6198 → schedule1 with an "at_risk_disallowed" field
that adds back the disallowed loss, OR form6198 → f1040 with a direct adjustment.

Given schedule1 doesn't have an at_risk field, form6198 likely routes to schedule1
with a positive adjustment to line3 (reversing the disallowed portion).

## Final design

Input fields:
- schedule_c_loss: number (negative, from schedule_c) — the at-risk loss
- prior_unallowed: number (positive, from schedule_e) — prior suspended losses
- amount_at_risk: number (nonnegative) — the taxpayer's current year at-risk amount
- current_year_income: number (optional) — income from the activity (Part I lines 1-4)

Output:
- schedule1: { line3_schedule_c: disallowed_amount } — adds back disallowed loss
  (positive number reduces the previously posted loss)

For simplicity in this engine (since upstream nodes already posted losses to schedule1),
form6198 posts a positive add-back for the disallowed portion.
