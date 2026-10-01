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

## Remaining return-wide work

| Area | Current graph observation | Unresolved join |
| --- | --- | --- |
| Income/AGI | The AGI aggregator deposits line 11; the Form 1040 sink can also receive explicit lines 9, 11, and 15. | Recompute income, adjustments, deduction choice, and taxable income from identified source rows at export; sparse direct sink inputs currently prevent a blanket equality assertion. |
| Schedule 1 and 1-A | Bounded source routes deposit Schedule 1 income/adjustments and Schedule 1-A line 38; positive line 13b has a separate attachment check. | General lines 8/10 and all Schedule 1-A deductions need a single final-source replay across calculation, native page, PDF, and Form 1040. |
| Schedule 2 and 3 | The aggregators deposit additional taxes and credits/payments, while several credits are finalized in the Form 1040 sink after tax is known. | Replay every Schedule 2 line 3/21 and Schedule 3 lines 8/15 against the final Form 1040 and attached child rows after all late credit ordering is resolved. The staged check proves only the 1040 arithmetic, not child authenticity. |
| Withholding and payments | Form 1040 line 25d/32/33 are calculated from deposits, and staged export replay now checks their immediate component lines. | De-duplicate payer statements and extension/estimated-payment receipts by issued identity and tax period, then reconcile each to lines 25–31. |
| Multiple copies and carryovers | Several child descriptors create multiple owner/source-specific native and PDF copies; credit and loss carryovers have route-specific ledgers. | Require a complete per-copy source inventory and origin-year/earlier-use ledger across the final return. One arithmetic total cannot establish that all copies belong to the taxpayer or that a carryover is available. |

This note records a bounded internal consistency improvement. It does not
establish complete source authenticity, 2025 business-rule acceptance, or IRS
ATS acceptance.
