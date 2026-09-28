# TY2025 Form 4972 remaining coverage

Source: [IRS 2025 Form 4972](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf), including the form's multiple-recipient instructions and worksheets on pages 3–4. The checked-in TY2025 v5.4 schema is `.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS4972/IRS4972.xsd`.

## Current coded boundary

- The current single-recipient path computes Part II and Part III, emits native `IRS4972` XML, and fills the first page of the 2025 PDF. The PDF has no AcroForm fields for the NUA dotted-line notes, so the renderer draws `NUA <amount>` beside lines 6 and 8. Existing focused cases inspect the chosen PDF field names and content-stream labels, but a filled-form visual inspection remains unperformed.
- `f1099r` rejects an elected Form 4972 when box 9a is less than 100%. This is correct as a fail-closed boundary, not support for multiple recipients. The case is in `forms/f1040/nodes/inputs/f1099r/index.test.ts`.
- A joint return with qualified distributions for both spouses requires a separate Form 4972 for each spouse and a combined tax on Form 1040 line 16. The present node accepts a `T` or `S` recipient, but one pending `form4972` object and one `IRS4972` attachment cannot represent both simultaneously. The same limitation applies to separate forms for different plan participants.
- A selected election whose computed separate tax rounds to zero now fails explicitly instead of dropping the elected Form 1099-R distribution or filing a Part-II-only form with no nonzero line accepted by F4972-006. This does not decide whether the distribution should instead be ordinary pension income; the preparer must review that treatment. The MeF descriptor likewise rejects nonempty Form 4972 source facts with no calculated form lines instead of silently returning no attachment. Focused cases are written but unrun.

## Multiple-recipient implementation needed

The IRS instructions do not permit simply multiplying the current tax by box 9a. They require all of these steps:

1. Represent the recipient's box 9a percentage (strictly above 0 and below 100) and, when an annuity is present, the separate box 8 percentage. Retain both source amounts and the distribution/participant identity. Do not infer the box 8 percentage from box 9a.
2. Gross up Form 4972 line 8 by the box 9a share after subtracting box 3 if the capital-gain election is made. If NUA is elected, include box 6 or the NUA worksheet's ordinary portion as directed and gross up the matching line 8 `NUA` note. Compute Part II's NUA worksheet and line 6 independently, including any death-benefit allocation.
3. Gross up line 11's box 8 annuity amount using the box 8 percentage, then calculate through line 28 on the grossed-up base. The full allowable death-benefit exclusion, not merely this recipient's share, can enter the line 9 computation under the instructions.
4. Set line 29 to `(line 25 - line 28) × box 9a share`, with the IRS-prescribed rounding, and put `MRD` on the dotted line. The TY2025 v5.4 `IRS4972.xsd` has `LumpSumDistriMultRecipientsCd` restricted to `MRD`; the native XML builder does not currently emit it. The PDF likewise has no mapped/drawn `MRD` note.
5. Add source-backed cases for no NUA/no capital election, capital election, NUA with and without capital election, annuity with a box 8 percentage different from box 9a, death-benefit allocation, and invalid/missing percentages. Verify native XML against v5.4 XSD and visually inspect filled page 1, including `NUA` and `MRD` notes.

## Other unsupported paths and validation gates

- Qualified alternate-payee distributions are explicitly rejected by the node pending separate eligibility and recipient-identity handling. Do not interpret the current taxpayer/spouse `T`/`S` selection as coverage for an alternate payee.
- Part-II-only federal estate-tax/IRD handling needs a source-backed check of the Schedule A deduction and Form 1040 line 5b route. Current tests cover ordinary estate-tax allocation, but not every beneficiary/election combination.
- Resolve the repeatable collection shape before enabling multiple participants or spouses. Preserve one Form 4972 per participant, keep the individual recipient identity on each PDF/XML, and sum each form's tax into Form 1040 line 16 without overwriting another pending form.
- Run the agreed single full test batch, TY2025 XSD validation, and filled-PDF visual inspection only after the broader build pass. No ATS acceptance is implied by local tests.

No compatibility layer, fallback, or provisional calculation is proposed. Until the above is built and validated, box 9a below 100% should continue to stop the election.
