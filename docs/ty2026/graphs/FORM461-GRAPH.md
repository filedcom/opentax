# TY2026 Form 461 excess-business-loss contract

Source snapshot: pinned [2026 draft Form 461](../corpus/draft/f461.pdf),
SHA-256 `0acb9c3dd8b016a3458f60097733f3da0b5b460853d3e867fc2aa27c1bc8780b`.
The [September 28, 2026 instruction draft](../corpus/draft/i461-2026-09-28.pdf)
was fetched from the [IRS](https://www.irs.gov/pub/irs-dft/i461--dft.pdf) on
October 15, 2026, SHA-256
`e3ba90d00f657eed6b83a4555fc5acffb823401a4a6ddda29160fc33a8376399`.
It specifies $256,000 nonjoint/$512,000 MFJ and a separate $128,000
individual Part I line-loss filing trigger. Both comparisons are strict:
equality does not satisfy that trigger. Final instructions and current MeF
acceptance remain required before filing.

## Inputs and calculation order

Form 461 is a **return-wide** limit for noncorporate taxpayers, after each
source activity's basis, at-risk, [passive](./FORM8582-GRAPH.md) and other
applicable limits.
Preserve owner, activity, source form/line, amount, tax year, business
classification and any previously limited-loss origin. A joint return uses
both spouses' eligible activities on one form. Employee-service income and
deductions, §172 NOL deductions and §199A QBI deductions are excluded from the
business-loss comparison; do not infer business character merely from a
Schedule E or 1040 line. Previous at-risk/passive suspended losses enter when
they become allowable in the current year. Coordinate farm and nonfarm
loss allocation with the pinned [Form 172/NOL contract](./FORM172-NOL-GRAPH.md),
preserving the origin year and any farming carryback treatment.

| Draft line | Required derivation and filed handoff |
| --- | --- |
| 1 and 7 | Reserved on the 2026 draft; do not populate them from old fields. |
| 2 | Pre-adjustment Schedule 1 line 3 business profit/loss from Schedule C activities. Keep the source amount before Form 461's Schedule 1 line 8p addback. |
| 3 | Form 1040 line 7a net capital gain/loss, with source transactions marked business or nonbusiness. Remove **all capital losses** from business deductions; count business capital gains only up to the lesser of business capital-gain net income or overall capital-gain net income, with final instructions still requiring revalidation. |
| 4 | Schedule 1 line 4 other gains/losses, including allowed Form 4797 activity amounts, classified by trade/business character. |
| 5 | Schedule 1 line 5 supplemental income/loss, after Schedule E/K-1 basis, at-risk, passive and other limits. Preserve rental, royalty, partnership, S-corp, estate/trust and REMIC distinctions. |
| 6 | Schedule 1 line 6 farm income/loss, after Schedule F and related activity limits. |
| 8 | Other trade/business income, gain or loss already reported elsewhere in the return; source it explicitly and prevent a Schedule C/E/F/4797 duplicate. |
| 9 | Signed sum of lines 1–8. The line can be positive or negative. |
| 10–12 | Line 10 removes nonbusiness income/gain within Part I. Line 11 is a **positive** amount for nonbusiness losses/deductions within Part I, including removed capital losses. Line 12 = line 10 − line 11. Preserve the classification/reconciliation behind both adjustment lines; they cannot be inferred from a net Schedule 1 amount. |
| 13–16 | Line 13 = negative of line 12; line 14 = line 9 + line 13; line 15 = $256,000 or $512,000 MFJ; line 16 = line 14 + line 15. If line 16 is negative, report its absolute value as **Schedule 1 line 8p** with ELA annotation and create an origin-year NOL carryover. If nonnegative, no 8p adjustment; still resolve any filing/attachment requirement from final instructions. |

The one-page draft has [18 terminal AcroForm widgets](../inventories/pdf-fields/pdf-fields-f461.csv),
all in the field tree on PDF page 2. The header is `f1_1`/`f1_2`;
line 16 is `f1_18`. Check PDF appearance, signed values and any ELA notation.
The current TY2025 descriptor maps signed tax lines separately from the name/ID
header and reserved fields. Its native serializer is also line-based. These are
reuse references; 2026 XML and attachment acceptance still require the selected
current XSD and business rules rather than an assumed identical shape.

## Current graph boundary

The shared Form 461 node now consumes signed Schedule C/F amounts and applies
one return-wide threshold, with a strict scope review. Its 2025 thresholds and
filing rules remain unchanged. The new year-independent line arithmetic is
used by both that node and the internal 2026 workpaper.

`business-loss-source.ts` replays retained C/SE, investment and internal land
sources under one filing-owner inventory. It removes employee-service amounts
(including statutory-employee Schedule C), removes capital losses, caps eligible
business capital gains against overall capital-gain net income, and includes
the actual half-SE deduction once. It reconciles the printed comparison to a
separate business ledger. The half-SE deduction's business attribution follows
[26 USC 164(f)(2)](https://uscode.house.gov/us/usc/119-118/t26/s164/).
Conflicting Schedule C no-dispositions and linked land activity reviews fail.
The workpaper produces the prospective Schedule 1 line 8p adjustment and a
separate 2026-origin loss record with attribution explicitly pending.

The standalone draft PDF prints all supported lines, leaves reserved lines
blank, checks receiving amounts and identity, and removes interactive fields
and the IRS cover. It supports a filing-trigger-only case with no addback.

## Connected Schedule C route

The 2026 registry now has one Form 461 owner after the business and capital
inventories. Required returns supply `schedule_c.claim.loss_limit_review`;
missing review fails even for the filing-only case. The owner deposits line 8p
once into Schedule 1 and AGI. AGI replays the retained sources and checks all
receiving amounts before Social Security and student-loan worksheets run.
The shared AGI addition defaults to zero for existing 2025 callers.

QBI replays the same business, capital and loss workpapers. For the currently
supported fully qualified, nonfarm C businesses, the reviewed bookkeeping
method allocates the suspended loss among negative regular-business QBI rows
in proportion to their losses. Integer largest remainders and a stable source
reference tie break conserve printed dollars. This is an explicit allocation
convention, **not a claimed statutory rule for other source families**.
Statutory-employee amounts remain eligible for reviewed QBI but receive no
461 allocation. Each source keeps its owner, allowed loss and disallowed loss.
The qualified 2026-origin 461 loss remains separate from Form 8995 line 18.

The [2026 Form 8995 draft instructions](https://www.irs.gov/pub/irs-dft/i8995--dft.pdf)
exclude suspended losses from current QBI and require preservation of qualified
character. [Treasury's final rules](https://www.irs.gov/irb/2020-29_IRB) address
the subsequent deduction of a 461-origin NOL for QBI. The current implementation
does not consume that future loss or calculate a complete Form 172 NOL.

The bundle now includes Form 461 at attachment sequence 64, including a
filing-trigger-only form with zero addback. Its amounts reconcile to Schedule 1,
1040 and the separately retained loss origin. Form 8995 prints allowed losses.
For example, $400,000 wages and a $400,000 regular C loss produce a $144,000
addback, $144,000 AGI, a $256,000 current QBI loss and a separate $144,000
qualified suspended origin.

Schedule E/F/K-1, released suspensions, general mixed-source and farming-loss
allocation, Form 8995-A, negative-AGI
NOL calculations and current MeF remain open. Child-tax claims with a positive
461 adjustment still stop for their coordinated loss-addback worksheet.
The [internal land limitation owner](FARMLAND-CURRENT.md) now derives deductible
section 1231 loss from preliminary capital/461 sources, finalizes history and
replays the receiving amounts. Its separately reviewed source-bucket allocation
does not replace the C-only QBI method. Farm losses with positive EBL still need
Form 172. Land QBI retains qualified/nonqualified activity contributions, but
the combined C/land QBI owner now reconciles those contributions, prior losses
and deduction candidates. Reviewed direct land sales now route through that owner
in the source graph and draft bundle, including land-only returns. Repeated C and
capital references must match the combined inventory exactly.
Public intake accepts reviewed source facts,
not Form 461 lines or an excess-loss override. Full filing remains disabled.

## Build order and acceptance

1. Recheck final 2026 instructions and every business-character exception; do not carry forward the 2025 $313,000/
   $626,000 threshold or $156,500 individual-line trigger. Reconcile final
   Form 172/NOL guidance, especially farm vs nonfarm and prior disallowed
   losses, before finalizing the carryover contract.
2. Expose signed, classified, **allowed** source amounts from Schedule C,
   [Schedule E](./SCHEDULEE-GRAPH.md), [Schedule F](./SCHEDULEF-GRAPH.md),
   [Form 4835](./FORM4835-GRAPH.md), K-1, Form 4797 and
   [Schedule D/8949](./CAPITAL-GAIN-GRAPH.md). Resolve at-risk/passive and
   source deductions, including [Form 4562](./FORM4562-GRAPH.md) and
   [Form 4562-B](./FORM4562B-GRAPH.md), before the Form 461 snapshot.
3. Compute all printed lines from one return-wide ledger and reconcile
   line 14 to the sum of business-character items. Emit Schedule 1 line 8p
   once, then carry the allowed Schedule 1 total through AGI, deductions,
   QBI and tax. Save the disallowed loss as a separate 2026-origin NOL record
   for later years; do not describe it as a current Schedule C/E/F loss.
4. Integrate the 18-widget draft PDF and all required source/ELA statements.
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

The current prerequisite has 19 passing typed calculation/component checks and
17 passing 2025 Form 461 return/PDF/MeF regressions. Two synthetic rendered pages
were inspected: a $94,000 excess loss and a filing-only loss with no addback.
Reserved fields remain blank, negative values retain their sign and receiving
amounts are reconciled before PDF construction.
The full 2026 directory passed 642 tests and the unit lane passed 137 checks.


Connected-route verification covers single, joint and separate filers, strict
filing boundaries, proportional dollar conservation, statutory-employee QBI,
Social Security ordering, mismatched handoffs and required bundle attachment.
The shared AGI/2025 loss and benefit regressions passed 105 checks. Visual review
covered 1040, Schedule 1, Form 461 and Form 8995, including the filing-only case.
The final connected route passed 10 typed integration/PDF checks, all 652 tests
in the 2026 directory, and the 137-check unit lane. Attachment order was checked
against sequence 55 (8995), 64 (461) and 71 (8959).
