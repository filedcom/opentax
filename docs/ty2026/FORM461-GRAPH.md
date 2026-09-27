# TY2026 Form 461 excess-business-loss contract

Source snapshot: pinned [2026 draft Form 461](corpus/draft/f461.pdf),
SHA-256 `0acb9c3dd8b016a3458f60097733f3da0b5b460853d3e867fc2aa27c1bc8780b`.
The [2026 draft instruction URL](https://www.irs.gov/pub/irs-dft/i461--dft.pdf)
still serves 2025. Pinned [2025 instructions](corpus/authorities/i461--2025.pdf),
SHA-256 `b809a8aafd955b9e4ba81c6fc9b81d2dc975c3896add21410b590f8a91d3a31e`,
are a **prior-year comparator** for classification, ordering and carryovers;
they are not a 2026 filing-trigger table. [Rev. Proc. 2025-32](corpus/authorities/rp-25-32.pdf)
§4.31 and the draft line 15 agree on **$256,000** for nonjoint returns and
**$512,000** for MFJ. Recheck final form/instructions, current MeF and any
intervening legislation before filing.

## Inputs and calculation order

Form 461 is a **return-wide** limit for noncorporate taxpayers, after each
source activity's basis, at-risk, [passive](FORM8582-GRAPH.md) and other
applicable limits.
Preserve owner, activity, source form/line, amount, tax year, business
classification and any previously limited-loss origin. A joint return uses
both spouses' eligible activities on one form. Employee-service income and
deductions, §172 NOL deductions and §199A QBI deductions are excluded from the
business-loss comparison; do not infer business character merely from a
Schedule E or 1040 line. Previous at-risk/passive suspended losses enter when
they become allowable in the current year. Coordinate farm and nonfarm
loss allocation with the pinned [Form 172/NOL contract](FORM172-NOL-GRAPH.md),
preserving the origin year and any farming carryback treatment.

| Draft line | Required derivation and filed handoff |
| --- | --- |
| 1 and 7 | Reserved on the 2026 draft; do not populate them from old fields. |
| 2 | Pre-adjustment Schedule 1 line 3 business profit/loss from Schedule C activities. Keep the source amount before Form 461's Schedule 1 line 8p addback. |
| 3 | Form 1040 line 7a net capital gain/loss, with source transactions marked business or nonbusiness. Remove **all capital losses** from business deductions; count business capital gains only up to the lesser of business capital-gain net income or overall capital-gain net income, subject to final 2026 instructions. |
| 4 | Schedule 1 line 4 other gains/losses, including allowed Form 4797 activity amounts, classified by trade/business character. |
| 5 | Schedule 1 line 5 supplemental income/loss, after Schedule E/K-1 basis, at-risk, passive and other limits. Preserve rental, royalty, partnership, S-corp, estate/trust and REMIC distinctions. |
| 6 | Schedule 1 line 6 farm income/loss, after Schedule F and related activity limits. |
| 8 | Other trade/business income, gain or loss already reported elsewhere in the return; source it explicitly and prevent a Schedule C/E/F/4797 duplicate. |
| 9 | Signed sum of lines 1–8. The line can be positive or negative. |
| 10–12 | Line 10 removes nonbusiness income/gain within Part I. Line 11 is a **positive** amount for nonbusiness losses/deductions within Part I, including removed capital losses. Line 12 = line 10 − line 11. Preserve the classification/reconciliation behind both adjustment lines; they cannot be inferred from a net Schedule 1 amount. |
| 13–16 | Line 13 = negative of line 12; line 14 = line 9 + line 13; line 15 = $256,000 or $512,000 MFJ; line 16 = line 14 + line 15. If line 16 is negative, report its absolute value as **Schedule 1 line 8p** with ELA annotation and create an origin-year NOL carryover. If nonnegative, no 8p adjustment; still resolve any filing/attachment requirement from final instructions. |

The one-page draft has [18 terminal AcroForm widgets](pdf-fields-f461.csv),
all in the field tree on PDF page 2. The header is `f1_1`/`f1_2`;
line 16 is `f1_18`. Check PDF appearance, signed values and any ELA notation.
The TY2025 PDF descriptor incorrectly maps `excess_business_loss` to
`f1_1`, which is the **name** field on this 2026 draft; copying it would print
the loss as the filer's name. The TY2025 MeF serializer has only one aggregate
element; derive the 2026 XML form and attachment rules from the selected
current XSD, not its shape.

## Current graph boundary

- Shared `form461` receives only already-computed nonnegative
  `excess_business_loss` contributions and sums them. It cannot produce or
  validate lines 2–16, business/nonbusiness adjustments, capital-gain cap,
  filing answers, origin-year NOL record or the PDF form.
- Shared Schedule C and F each compare **their own** net loss to the full
  filing-status threshold and pass an excess to Form 461. This can miss a
  combined loss that exceeds the threshold, overstate a loss when another
  activity has profit, or apply the same threshold twice. Schedule E/K-1 and
  Form 4797 activity amounts need the same return-wide aggregation.
- The 2026 Schedule 1 node accepts `line8p_excess_business_loss`, but
  `form461` is absent from the TY2026 registry, PDF bundle and MeF path. The
  dependency must read **pre-ELA** Schedule 1 source amounts, calculate Form
  461 once, then add 8p; reading its final Schedule 1 total back into Form
  461 would make a graph cycle or double-count the adjustment.

## Build order and acceptance

1. Obtain 2026 instructions and decide the 2026 filing trigger and every
   business-character exception; do not carry forward the 2025 $313,000/
   $626,000 threshold or $156,500 individual-line trigger. Reconcile final
   Form 172/NOL guidance, especially farm vs nonfarm and prior disallowed
   losses, before finalizing the carryover contract.
2. Expose signed, classified, **allowed** source amounts from Schedule C,
   [Schedule E](SCHEDULEE-GRAPH.md), [Schedule F](SCHEDULEF-GRAPH.md),
   [Form 4835](FORM4835-GRAPH.md), K-1, Form 4797 and
   [Schedule D/8949](CAPITAL-GAIN-GRAPH.md). Resolve at-risk/passive and
   source deductions, including [Form 4562](FORM4562-GRAPH.md) and
   [Form 4562-B](FORM4562B-GRAPH.md), before the Form 461 snapshot.
3. Compute all printed lines from one return-wide ledger and reconcile
   line 14 to the sum of business-character items. Emit Schedule 1 line 8p
   once, then carry the allowed Schedule 1 total through AGI, deductions,
   QBI and tax. Save the disallowed loss as a separate 2026-origin NOL record
   for later years; do not describe it as a current Schedule C/E/F loss.
4. Render the 18-widget 2026 PDF and all required source/ELA statements.
   Confirm the actual current MeF form element, line order, binary and
   business-rule requirements, then compare XML, PDF, Schedule 1 and 1040.
   Keep the downloaded May v1 package as a research baseline only. Run
   TY2025 regressions if shared nodes change.
5. Test one loss just below/at/above $256,000, a $512,000 MFJ case, two
   individually subthreshold losses whose sum is over threshold, a loss
   offset by business profit, Schedule E passive and at-risk suspension,
   later release of a suspended loss, business vs personal capital gain,
   capital loss removal, Form 4797 business gain, a mixed farm/nonfarm
   return, and a 2027 NOL continuation. Verify filed Form 461 line by line,
   not only the eventual Form 1040 balance.

This is a source and implementation plan. Form 461 remains open until its
2026 calculation, validation, PDF, MeF and complete-return evidence pass.
