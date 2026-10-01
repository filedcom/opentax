# TY2025 return-wide ordering and reconciliation audit

The Form 1040 sink calculates tax, credit, withholding, refundable-payment,
and balance subtotals from its retained graph inputs. Native MeF and PDF export
are separate projections; a changed filed subtotal could otherwise reach one
or both outputs without replaying the sink calculation.

## Bounded export replay staged in this batch

`return-wide-arithmetic.ts` checks the retained Form 1040 lines 18, 21, 22,
24, 25d, 32, and 33 against their immediate component lines whenever the
subtotal is supplied. Both Form 1040 native and PDF descriptors call the same
check before projection. The replay catches a changed tax, credit,
withholding, or payment subtotal, including a changed Schedule 3 deposit on
line 20 or line 31 when the final 1040 component is present. It accepts
unsupplied optional line components as zero, matching the sink's arithmetic.
Positive and per-subtotal tamper fixtures are authored for the bulk test gate.

The next bounded pass checks attached Schedule 1 line 10/26 against Form 1040
lines 8/10; Schedule 1-A line 38 against line 13b; Schedule 2 Part I against
line 17; and Schedule 3 line 15 against line 31. Both native and PDF Form 1040
entry points use the same pending-graph replay. This rejects a conflicting
final return deposit even when its own Form 1040 arithmetic remains coherent.
Schedule 2 Part I reuses its calculator rather than maintaining a second sum.

## Remaining return-wide work

| Area | Current graph observation | Unresolved join |
| --- | --- | --- |
| Income/AGI | The AGI aggregator deposits line 11; the Form 1040 sink can also receive explicit lines 9, 11, and 15. | Recompute income, adjustments, deduction choice, and taxable income from identified source rows at export; sparse direct sink inputs currently prevent a blanket equality assertion. |
| Schedule 1 and 1-A | Bounded source routes deposit Schedule 1 income/adjustments and Schedule 1-A line 38; final schedule totals now reconcile to Form 1040. | Replay every contributing child source and detect duplicate documents across Schedule 1/1-A and the filed pages; exact source authenticity remains open. |
| Schedule 2 and 3 | Schedule 2 Part I and Schedule 3 payment total now reconcile to Form 1040; several credits are finalized in the Form 1040 sink after tax is known. | Replay Schedule 2 Part II and Schedule 3 nonrefundable credits against final tax after Form 8978 reductions and late credit ordering. The staged check proves totals, not child authenticity. |
| Withholding and payments | Form 1040 line 25d/32/33 are calculated from deposits, and staged export replay now checks their immediate component lines. | De-duplicate payer statements and extension/estimated-payment receipts by issued identity and tax period, then reconcile each to lines 25–31. |
| Multiple copies and carryovers | Several child descriptors create multiple owner/source-specific native and PDF copies; credit and loss carryovers have route-specific ledgers. | Require a complete per-copy source inventory and origin-year/earlier-use ledger across the final return. One arithmetic total cannot establish that all copies belong to the taxpayer or that a carryover is available. |

This note records a bounded internal consistency improvement. It does not
establish complete source authenticity, 2025 business-rule acceptance, or IRS
ATS acceptance.
