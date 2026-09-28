# TY2025 Form 4972 remaining coverage

Source: [IRS 2025 Form 4972](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf),
including the form's multiple-recipient instructions and worksheets on pages
3–4. The checked-in TY2025 v5.4 schema is
`.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS4972/IRS4972.xsd`.

## Current coded boundary

- The public `form4972` input is now one strict election/eligibility object for
  one elected distribution. It cannot carry recipient identity, 1099-R boxes
  2a/3/6/8/9a, or a substitute distribution amount. Those fields must arrive
  from exactly one Form 1099-R marked `exclude_4972`, with a `T` or `S`
  recipient and explicit box 2a. The election and source meet at the Form 4972
  node, which calculates the special tax into the finalized Form 1040. Existing
  full-return cases and new source-missing/public-contract cases are written but
  unrun. This intake does not authenticate participant birth date, prior
  elections, or plan-wide distribution completeness; they remain preparer
  attestation/evidence requirements, and multiple participants remain closed.

- The full-share, non-NUA, no-estate branch now requires one elected Form 1099-R
  with the same recipient and boxes 2a, 3, 6, 8 and 9a before native XML or PDF
  output. It recalculates every elected Form 4972 line using the 2025 node,
  checks the separate tax against finalized Form 1040, and for Part-II-only
  elections checks that the recipient's ordinary share reached Form 1040 line
  5b. This includes the ordinary annuity and death-benefit calculation branches,
  though documentary support for the death-benefit exclusion is still a separate
  evidence gap. Focused matching, missing-source, line-tamper, and final-tax
  cases are written but unrun.
- The current single-recipient path computes Part II and Part III, emits native
  `IRS4972` XML, and fills the first page of the 2025 PDF. The PDF has no
  AcroForm fields for the NUA dotted-line notes, so the renderer draws
  `NUA <amount>` beside lines 6 and 8. Existing focused cases inspect the chosen
  PDF field names and content-stream labels, but a filled-form visual inspection
  remains unperformed.
- `f1099r` now retains a positive box 9a share below 100% as a Form 4972 source
  fact. The node supports a bounded partial-share Part III path, with an
  optional Part II capital-gain election, but no NUA, annuity, death-benefit
  exclusion, or estate-tax adjustment. Without Part II it grosses up box 2a for
  line 8. With Part II, line 6 is the recipient's box 3 and line 7 is 20% of it;
  line 8 is `(box 2a - box 3) / box 9a share`, following
  [2025 multiple-recipient Step 2](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf).
  It calculates through line 28 on the full ordinary distribution, then rounds
  `(line 25 - line 28) × box 9a share` onto line 29 and adds line 7 on line 30
  and Form 1040 tax. MeF prints native `LumpSumDistriMultRecipientsCd=MRD` after
  line 29; the PDF draws `MRD` on line 29's dotted line. Both projections
  require one matching elected Form 1099-R and the same Form 1040 Form 4972 tax
  source, and recompute every elected Part II/III line through the node. Focused
  source, calculation, MeF, and PDF cases are written but unrun; the drawn PDF
  position is not filled-render verified.
- A second bounded partial-share branch now covers one elected Form 1099-R with
  positive boxes 2a, 3, and 6, both Part II and Part III elections, NUA
  inclusion, and no annuity, death-benefit, or estate-tax allocation. The 2025
  NUA Worksheet splits the recipient's box 6 using box 3 / box 2a. Part II lines
  6–7 keep the recipient's capital share. Under multiple-recipient Step 3, Part
  III line 8 and its `NUA` dotted-line amount gross up the ordinary amount by
  box 9a; line 29 then prorates the Part III tax and bears `MRD`. MeF and PDF
  reuse the one elected 1099-R and finalized Form 1040 tax reconciliation, and
  reject altered worksheet lines or percentages. Focused node, MeF, and PDF
  cases are written but unrun, and filled `NUA`/`MRD` positions remain visually
  unverified.
- A Part-III-only NUA election now also works for one partial-share recipient
  with no annuity, death-benefit, or estate-tax allocation. The 2025 form's
  multiple-recipient Step 3 puts `(box 2a + box 6) / box 9a share` on line 8,
  writes `NUA` with `box 6 / share` beside line 8, and prorates the computed
  Part III tax on line 29 with `MRD`. No Part II line 6 or 7 is emitted even if
  box 3 has an amount, because that election was not made. Source, node, MeF,
  and PDF guards are written but unrun; the filled annotation remains visually
  unverified.
- A bounded Part-II-only partial-share election now uses the recipient's own
  Form 1099-R box 3 and the NUA Worksheet's capital portion on lines 6–7, while
  the recipient's own ordinary amount, including the remaining NUA, reaches Form
  1040 line 5b. It does not gross up by box 9a because there is no Part III line
  8 or prorated line 29. The PDF prints the line 6 `NUA` note but no `MRD`,
  which the 2025 instructions reserve for the multiple-recipient line 29
  worksheet. A matching one-document box 9a source, Form 1040 pension amount and
  special tax are required; wrong lines, source percentage, or tax fail
  explicitly. The no-NUA Part-II-only variant follows the same own-share
  ordinary-income route. Focused node, MeF, and PDF cases are written but unrun,
  and the filled PDF has not been visually inspected.
- A bounded shared-annuity route now carries the percentage printed with Form
  1099-R box 8 separately from box 9a. For one elected distribution with Part
  III, no NUA, death-benefit exclusion, or estate-tax adjustment, it divides the
  recipient's box 8 actuarial value by the box 8 percentage for Form 4972 line
  11, computes lines 12–28 on that grossed-up amount, and uses box 9a only to
  prorate line 29. Part II may also be elected. The node requires a positive
  explicit box 8 percentage when the annuity is nonzero and box 9a is below
  100%; MeF and PDF reconcile both percentages with the elected Form 1099-R.
  Focused source-to-return, node, MeF, and PDF cases are written but unrun.
- A bounded partial-share NUA plus annuity route now applies the same 2025
  multiple-recipient Step 3 to one elected Form 1099-R. Box 9a grosses up line 8
  and its ordinary NUA note, while the separately sourced box 8 percentage
  grosses up line 11. The node completes the annuity subtraction through line
  28, then applies box 9a only to line 29; the recipient's Part II gain remains
  its own share. The Part-III-only variant omits Part II. Native and PDF output
  require exact source boxes 2a, 3, 6, 8 amount/percentage, and 9a, computed
  form lines, and final Form 1040 special tax. The route still excludes death
  benefit and estate-tax allocation. Focused cases are written but unrun, and
  the filled PDF annotations have not been visually inspected.
- A bounded partial-share beneficiary route now permits one Part-III-only
  election with no NUA, annuity, death-benefit exclusion, or Part II election
  and a preparer-supplied full attributable federal estate-tax amount. The
  recipient's box 9a percentage grosses up line 8, the full estate-tax amount
  reduces line 18, and line 29 prorates the resulting Part III tax. This follows
  the
  [2025 Form 4972 multiple-recipient steps and line 18 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf).
  Native MeF and PDF require one matching elected Form 1099-R, recompute every
  line, and reconcile line 30 with the Form 1040 tax source. Focused positive,
  line-tamper, and final-tax cases are written but unrun. The estate
  administrator's attribution, other partial-share estate combinations, filled
  PDF, XSD/business-rule checks, and ATS acceptance remain open.
- A separate bounded partial-share beneficiary route now permits a Part-III-only
  death-benefit exclusion with no Part II, NUA, annuity, or estate-tax
  adjustment. The
  [2025 multiple-recipient instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
  direct the **full allowable** exclusion, not this recipient's allocated share,
  onto line 9 when Part II is not elected; line 29 later prorates the Part III
  tax using Form 1099-R box 9a. The input requires the plan/estate
  administrator's exclusion-allocation statement reference, the full allowable
  amount, and this recipient's share of that amount. The share must match box 9a
  exactly at whole-dollar precision. The full amount must be no more than $5,000
  or the grossed-up taxable distribution; the pre-August-21-1996 death and
  beneficiary eligibility facts remain mandatory. MeF and PDF reconcile the one
  elected Form 1099-R, recompute lines 8–30, and compare the special tax with
  Form 1040. Focused positive, allocation/source-mismatch, unsupported
  combination, and printed-line cases are written but unrun. The entered
  administrator reference does not independently authenticate the statement.
  Part-II-only death-benefit allocation, combined NUA/annuity/estate
  adjustments, shares requiring non-whole-dollar allocation, filled-PDF
  appearance, XSD, business-rule, and ATS checks remain open.
- A joint return with qualified distributions for both spouses requires a
  separate Form 4972 for each spouse and a combined tax on Form 1040 line 16.
  The present node accepts a `T` or `S` recipient, but one pending `form4972`
  object and one `IRS4972` attachment cannot represent both simultaneously. The
  same limitation applies to separate forms for different plan participants. The
  Form 1099-R source now rejects more than one active elected distribution
  before the executor can merge two scalar Form 4972 deposits; it does not
  assume that a taxpayer/spouse pair necessarily means two participants.
- An elected Form 1099-R marked `no_distribution_received` now fails at source
  validation. Previously the active-item filter discarded it, leaving no Form
  4972 output even though the election flag remained on the document. A focused
  rejection case is written but unrun.
- A selected election whose computed separate tax rounds to zero now fails
  explicitly instead of dropping the elected Form 1099-R distribution or filing
  a Part-II-only form with no nonzero line accepted by F4972-006. This does not
  decide whether the distribution should instead be ordinary pension income; the
  preparer must review that treatment. The MeF descriptor likewise rejects
  nonempty Form 4972 source facts with no calculated form lines instead of
  silently returning no attachment. Focused cases are written but unrun.
- For one full-share beneficiary with a Part-II-only election, the node splits
  federal estate tax using the Death Benefit Worksheet's capital-gain fraction.
  It reduces Form 4972 line 6 by that share and routes the ordinary share to
  Schedule A line 16 while the ordinary distribution, less any death-benefit
  exclusion, reaches Form 1040 lines 5a/5b. This follows the
  [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf),
  [2025 Schedule A instructions](https://www.irs.gov/instructions/i1040sca), and
  [2025 Publication 559](https://www.irs.gov/publications/p559). Focused
  calculation and full-return cases now include both a death-benefit exclusion
  and estate tax. The MeF and PDF projections also require one matching elected
  Form 1099-R, recompute the bounded estate-adjusted lines 6–7, and reconcile
  the Form 1040 special-tax amount. For a beneficiary, question 5b controls
  prior-election eligibility; question 5a (a prior own-plan election) is not
  printed as an answer for this distribution. Both recipient roles cannot be
  claimed for the same distribution. Focused calculation, return, MeF, and PDF
  cases are written but unrun. The estate administrator must supply the federal
  estate tax attributable to the distribution; Form 1099-R cannot establish it.
  Itemization choice and filled PDF remain to be verified.
- A separate bounded Part-II-only NUA election now uses one full-share Form
  1099-R with positive boxes 2a, 3, and 6 and no annuity, death-benefit, or
  estate-tax allocation. The 2025 NUA Worksheet puts `box 3 / box 2a × box 6` on
  the dotted line beside Form 4972 line 6, includes it in the line 6 capital
  gain, and sends the remaining NUA with the ordinary distribution to Form 1040
  lines 5a/5b. There are no Part III lines or line 8 NUA note. The MeF/PDF
  source guard now checks one matching elected Form 1099-R, the line 6/7
  worksheet arithmetic, full box 9a share, and the Form 1040 pension and
  special-tax amounts. Focused return, native-XML, local-XSD, and PDF-projection
  cases are written but unrun. Filled PDF, XSD, IRS business-rule, and ATS
  validation remain pending.
- For a single full-share distribution with both Part II and Part III elected,
  positive NUA, and no annuity, death-benefit, or estate-tax allocation, the MeF
  and PDF descriptors now check the elected Form 1099-R boxes 2a, 3, and 6,
  recipient, and box 9a against the computed Form 4972 source fields. They
  independently check the 2025 NUA Worksheet's capital and ordinary split and
  lines 6 through 8 before writing either NUA annotation. Missing/mismatched
  source fails explicitly. Partial shares are covered only in the bounded
  branches listed above. Focused direct-builder cases are written but not run.
  This is a narrow source-reconciliation guard, not all-NUA coverage.
- The page-1 PDF projection now also requires one elected Form 1099-R whose
  taxable amount, capital gain, NUA, annuity, recipient, and box 9a share match
  the pending Form 4972 source; it rejects a source-only form with no elected
  printed part. The Part II election must have lines 6–7, and a Part III
  election must have its required 8–30 lines, branch-specific allowance/annuity
  fields, and reconciled subtotals. This closes direct-PDF partial-form omission
  without broadening the NUA route. The actual 2025 AcroForm/widget positions
  place lines 6 and 8 at the two existing NUA annotation y-coordinates; the
  printed page was inspected blank, but **not** filled-render verified. Focused
  guards are written but unrun.

## Full-share NUA plus annuity (written, unrun)

One elected Form 1099-R with a full box 9a share, NUA in box 6, and an annuity
in box 8 now has a bounded source-reconciled Part III route, with or without a
Part II capital-gain election. The native and PDF projections require exact
whole-dollar source boxes, the box 8 percentage to be 100% or absent, no death
benefit or estate-tax allocation, the computed lines 6–30 as applicable, and the
same special tax on Form 1040. The bounded partial-share combination is
described above. Focused matching and tamper cases are written but unrun; actual
filled-PDF appearance and TY2025 XSD/business-rule validation remain open.

## Partial-share death benefit with both elections (written, unrun)

One elected Form 1099-R now supports a partial-share beneficiary who makes both
the Part II capital-gain election and Part III ten-year election, with no NUA,
annuity, or estate-tax adjustment. This route requires the recipient's box 2a,
box 3, and box 9a, a positive full allowable death-benefit exclusion, the
administrator allocation reference, and a whole-dollar recipient allocation that
exactly equals the full exclusion times box 9a. The
[2025 Death Benefit Worksheet on page 3](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
allocates this recipient's exclusion to capital gain, reducing their box 3 on
line 6. The
[2025 line 9 multiple-recipient instruction on page
4](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf) instead subtracts the
capital fraction of the **full** allowable exclusion from that full exclusion
for line 9. Line 29 then prorates the Part III tax by box 9a; line 7 remains
this recipient's own Part II tax. For a 50% beneficiary with box 2a $20,000, box
3 $4,000, and a $5,000 full exclusion ($2,500 allocated), the written cases
expect lines 6/9/29/30 of $3,500/$4,000/$1,115/$1,815. Native and PDF
projections recompute the lines and reject source-share, allocation, line, and
Form 1040 tax mismatches. These cases are unrun; they do not authenticate the
administrator's underlying statement or cover NUA, annuity, estate tax, other
participants, filled-PDF appearance, XSD/business rules, or ATS acceptance.

## Full-share beneficiary NUA with death/estate allocation (written, unrun)

For one elected, full-share Form 1099-R with box 6 NUA and no annuity, native
MeF and PDF projections now reconcile a beneficiary's death-benefit exclusion
and/or federal estate tax to the 2025 NUA and Death Benefit Worksheets. The
calculator allocates the exclusion and estate tax using the capital-gain share
of the full box 2a-plus-elected-NUA amount. With Part II, line 6 is reduced by
both capital allocations, while the NUA dotted-line note retains the NUA
worksheet amount. With Part III, the remaining death benefit reaches line 9 and
the remaining estate tax reaches line 18. For Part-II-only, the ordinary amount
stays on Form 1040 line 5b and its estate-tax IRD deduction routes to Schedule A
line 16, subject to itemization. The projections require the one matching
elected 1099-R, recompute all elected form lines and NUA notes, and check the
Form 1040 special tax. Focused positive and tamper cases are written but unrun.
The estate administrator's attributable-tax statement and any death-benefit
entitlement evidence are still preparer-supplied facts, not verified from Form
1099-R. Partial-share allocation, filled-PDF visual review, XSD/business-rule
checks, and ATS acceptance remain open.

## Full-share beneficiary NUA, annuity, and allocation (written, unrun)

One elected full-share beneficiary Form 1099-R can now combine box 6 NUA and box
8 annuity with a death-benefit exclusion and/or attributable federal estate tax
when Part III is elected. The 2025 NUA and Death Benefit Worksheets divide the
capital and ordinary allocations using box 2a plus included NUA, while box 8
remains the separate line 11 actuarial value. The existing node calculates lines
6–30; native MeF and PDF now reconcile every elected line, the NUA notes, box 8
amount and percentage, and the special tax on Form 1040 to the one elected
source. The bounded route requires whole-dollar source boxes and an exact NUA
capital allocation. Part-II-only with an annuity and an allocation still
rejects. Positive and altered line/source/tax tests are written but unrun.
Estate-administrator and death-benefit entitlement proof remain
preparer-supplied; no filled PDF, XSD, business-rule or ATS acceptance is
claimed.

## Remaining multiple-recipient implementation

The IRS instructions do not permit simply multiplying the current tax by box 9a.
They require all of these steps:

1. The bounded shared-annuity route now represents the separate box 8
   percentage. Retain source-document and participant identity before combining
   multiple elected distributions. Do not infer the box 8 percentage from box
   9a.
2. The no-NUA capital-election and bounded NUA line 8 routes with or without
   Part II are implemented and reconciled. The full-share, no-annuity
   beneficiary allocation is written; partial-share NUA/death-benefit allocation
   remains open.
3. The full-share line 11 annuity/death/estate combination is bounded above. A
   Part-III-only partial-share estate-tax route without other allocations is now
   bounded above. Other partial-share allocations remain open: the full
   allowable death-benefit exclusion, not merely this recipient's share, can
   enter line 9 under the multiple-recipient instructions.
4. Generalize line 29 and `MRD` after the remaining branches are modeled. The
   bounded no-annuity path now uses the native TY2025 v5.4
   `LumpSumDistriMultRecipientsCd` and draws the PDF note, but no filled-PDF
   visual check has run.
5. Source-backed cases now include no NUA with and without capital election, an
   annuity whose box 8 percentage differs from box 9a, plus NUA with or without
   Part II and no other allocation, including an annuity. Add NUA with death
   benefit or estate-tax allocation, death-benefit allocation, and
   invalid/missing percentages. Verify native XML against v5.4 XSD and visually
   inspect filled page 1, including `NUA` and `MRD` notes.

## Other unsupported paths and validation gates

- Qualified alternate-payee distributions are explicitly rejected by the node
  pending separate eligibility and recipient-identity handling. Do not interpret
  the current taxpayer/spouse `T`/`S` selection as coverage for an alternate
  payee.
- Part-II-only estate-tax/IRD arithmetic and Form 1040/Schedule A routing have
  source-backed unrun cases for a single full-share beneficiary, including a
  concurrent death-benefit exclusion. Other beneficiary, recipient-share, and
  NUA combinations still need source reconciliation; Schedule A's deduction
  applies only if itemized deductions are selected.
- Resolve the repeatable collection shape before enabling multiple participants
  or spouses. Preserve one Form 4972 per participant, keep the individual
  recipient identity on each PDF/XML, and sum each form's tax into Form 1040
  line 16 without overwriting another pending form.
- The present Form 1099-R source carries a taxpayer/spouse **recipient** but no
  plan-participant key. The
  [2025 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf) require
  combining multiple qualified distributions for the **same** participant on one
  form and filing a separate form for **each different** participant, including
  separate spouse forms on a joint return. The executor promotes duplicate
  scalar deposits to arrays, while today's Form 4972 input has scalar
  box/election fields; export normalization later takes the last numeric array
  member. The new source-local guard prevents that silent last-value export, but
  it is not repeatable filing support. A direct replacement needs a participant
  identifier and source-document key on each elected Form 1099-R, a grouped
  per-participant election/eligibility ledger, and a single canonical `forms`
  collection through the Form 4972 node and pending export. The node must total
  each participant's boxes before its own calculation, then sum per-form tax for
  income-tax calculation and any Part-II-only ordinary pension amount for
  AGI/Form 1040. Native MeF must return one `IRS4972` fragment per participant,
  and PDF must render one identified instance per participant, each reconciled
  to its own Form 1099-R group. The Form 1040 MeF indicator already supports
  multiple referenced document IDs, but no collection or per-participant source
  reconciliation exists yet. No scalar/collection dual API or compatibility
  alias is proposed. Focused same-recipient and taxpayer/spouse rejection cases
  are written but unrun.
- This participant-keyed replacement also needs a decision for source evidence:
  the present 1099-R model identifies the payee (`T`/`S`) and payer, not the
  plan participant. Payer EIN, recipient, or account number alone cannot prove
  that two distributions belong to the same participant or different ones. Until
  a verified participant identity and election ledger are part of the input
  contract, retaining the one-active-election limit is intentional.
- Other NUA shapes with death-benefit/estate-tax allocation, multiple elected
  Form 1099-Rs, and partial box 9a shares outside the bounded routes still lack
  this source-reconciled PDF/MeF path. The node has some corresponding
  arithmetic, but it is not a basis to claim complete filing coverage.
- A focused unrun node case now keeps three plausible shared-beneficiary
  estate-tax combinations closed: Part II plus III, NUA plus estate tax, and
  annuity plus estate tax. The 2025 instructions require the estate
  administrator's attributable tax amount and special multiple-recipient
  calculations. The single payee Form 1099-R plus asserted recipient percentage
  does not establish the participant-wide allocation or each recipient's elected
  amount, so these cannot be promoted to supported filing paths by reusing the
  existing scalar calculation.
- Run the agreed single full test batch, TY2025 XSD validation, and filled-PDF
  visual inspection only after the broader build pass. No ATS acceptance is
  implied by local tests.

No compatibility layer, fallback, or provisional calculation is proposed.
Unsupported box 9a combinations continue to stop the election.
