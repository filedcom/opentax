# TY2025 Form 4972 remaining coverage

## Form 6251 line 10 and Schedule J tax refigure (2026-10-01, unrun)

The direct Form 4972 collection already sends its summed special tax to Form
1040 line 16 and to the Form 6251 calculation. The native and PDF collection
paths now also require an exact match to the retained Form 6251 special-tax
source when Form 6251 is calculated. For returns without Schedule J, they
independently recompute Form 6251 line 10 from finalized Form 1040 line 16,
minus the Form 4972 tax, plus Schedule 2 line 1z, minus Schedule 3 line 1 and
the Form 8978 negative-line-14 adjustment. This follows the printed
[2025 Form 6251 line 10](https://www.irs.gov/pub/irs-pdf/f6251.pdf). The
[2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251) require
Schedule J tax to be refigured without the income-averaging election for line
10. The bounded ordinary-rate Schedule J route now retains its own line 23,
adds the computed Form 4972 special tax only on Form 1040 line 16, and uses
ordinary 2025 tax on finalized line 15 for Form 6251 line 10 before subtracting
the Form 4972 amount. Native and PDF Schedule J projections require line 23
plus that sourced special tax to equal Form 1040 line 16. The Form 4972 native
and PDF AMT join independently recomputes the refigured line 10 with the
Schedule 2, Schedule 3, and Form 8978 adjustments. Positive and tampered
Schedule J, Form 4972, filing-status, return, and Form 6251 fixtures are
authored but unrun. Preferential income, Form 2555, Form 8814, Form 8978,
Form 8621, and Form 8615 combinations with Schedule J remain guarded; so do
the underlying Form 1099-R and beneficiary/NUA boundaries below.

## Two full-share same-plan 1099-R copies with elected NUA (staged, unrun)

The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
direct a recipient to add same-participant qualified distributions received
in one tax year before figuring the one Form 4972. The NUA Worksheet uses
combined boxes 3 and 2a to allocate combined box 6 between capital and
ordinary amounts. A bounded two-copy full-share, nonbeneficiary route now
requires one source-matched participant/plan and administrator balance
statement, distinct Form 1099-R references, exact whole-dollar boxes 2a/3/6,
an affirmative NUA inclusion and capital-gain election, and no annuity or
estate/death allocation. In the authored case, $50,000 box 2a, $5,000 box 3,
and $10,000 box 6 produce $1,000 capital NUA, Form 4972 line 6 of $6,000,
and line 8 of $54,000. The special tax joins Form 1040 line 16; native and
PDF projection independently match each source and calculated line. Positive
full-return/native/PDF and changed NUA, box 3, plan, and return-tax fixtures
are written but unrun. Wider multi-copy NUA, recipient shares, annuities,
beneficiary allocations, source-byte authentication, and IRS acceptance remain
outside this bound.

## Participant-wide unequal death-benefit allocation (2026-10-01, unrun)

The partial-share beneficiary death-benefit route now requires a complete
administrator allocation schedule. It identifies the plan participant and
elected recipient by SSN, lists every recipient's percentage and exclusion,
and totals to 100% and the full allowable exclusion. Each allocation must be
an exact whole-dollar product of the full exclusion and recipient percentage.
The elected row must match its own amount and the source Form 1099-R box 9a;
native and PDF export also join recipient SSN, participant SSN, issued-copy
reference, plan identity, boxes 2a/3/6/8/9a, computed lines, and finalized
Form 1040 special tax. A 25%/75% case uses a $5,000 participant-wide eligible
exclusion, with $1,250 for the elected recipient. With the recipient's boxes
2a/3 of $10,000/$2,000 and both elections, lines 6/7/8/9 are
$1,750/$350/$32,000/$4,000; line 30 enters Form 1040 line 16. Positive and
allocation, box, identity, and return-tamper fixtures are authored but unrun.
The administrator reference and schedule remain preparer supplied; source
bytes and external authentication, filled PDF, XSD/business rules, and ATS
acceptance remain open. The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
specify the full-exclusion line 9 and box 9a line 29 treatment for multiple
recipients.

## Partial-share beneficiary NUA and death benefit (2026-10-01, unrun)

One sourced Form 1099-R with box 9a below 100% can now combine elected box 6
NUA, a pre-August-21-1996 death-benefit exclusion, and Parts II and III. The
beneficiary must provide the plan administrator's exclusion-allocation
reference, the full allowable exclusion, and this recipient's exact share.
The route requires whole-dollar NUA and death-benefit capital allocations,
a wholly taxable distribution including elected NUA, no annuity, and no
federal estate-tax adjustment. The [2025 Form 4972 NUA and Death Benefit
Worksheets](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf) put the
recipient's NUA capital portion on the line 6 worksheet, then allocate this
recipient's death benefit across capital and ordinary portions. Its
multiple-recipient instructions put the full ordinary death-benefit remainder
on line 9 and prorate the Part III tax by box 9a on line 29. For the authored
50% case, boxes 2a/3/6 are $20,000/$4,000/$4,000 and the full death benefit
is $5,000: lines 6/7/8/9/10 are $4,300/$860/$38,400/$4,000/$34,400.
The resulting special tax flows to Form 1040 line 16, where the 2025 form
directs it, without a Schedule 2 amount. Native and PDF projections replay
the elected 1099-R, calculated lines, and final Form 1040 special tax;
positive and source/allocation/line/tax tamper fixtures are authored but unrun.
The administrator reference does not authenticate statement bytes. Other
partial-share NUA/death combinations with annuity or estate tax, multiple
elected distributions, filled-PDF appearance, XSD/business-rule checks, and
ATS acceptance remain open.

## Four full-share copies from one participant's plan (2026-10-01, unrun)

The shared native/PDF collection validator now accepts the fourth exact
issued-copy reference from that one participant. It previously stopped at
three before the four-copy source and tax reconciliation could run. The
existing four-copy positive and missing, changed-box, changed-plan, and
final-tax tamper fixtures now reach the intended collection route. A fifth
same-plan copy remains outside this reviewed export bound and has a rejection
fixture; the IRS rule is to combine **all** qualified 2025 distributions for
one participant, so an actual five-copy return needs a later complete-source
extension rather than dropping the fifth copy. This change is unrun.

The same-plan source collection no longer imposes a three-copy limit: each
additional full-share Form 1099-R must have a distinct issued-copy reference
and the same participant, payer, plan, and complete-balance statement. The
election must name every copy exactly once. Source calculation sums boxes 2a
and 3 into one Form 4972, while native MeF and PDF independently replay every
copy against the final Form 1040 special tax. An authored four-copy case totals
$110,000 taxable distribution and $14,000 capital gain; missing, extra,
changed-gain, changed-plan, and final-tax tamper cases are authored for the
deferred validation batch. The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
require one-year complete-balance distributions to be treated together.
Administrator and issued-copy bytes, partial shares, NUA, annuity,
estate/death combinations, and final XSD/PDF/business-rule review remain open.

## Three full-share copies from one participant's plan (2026-10-01, unrun)

The bounded same-plan Form 1099-R collection now accepts three distinct
full-share copies for one taxpayer participant, with the same payer, plan,
participant, complete-balance statement, and Part III election. Optional
positive box 3 amounts across all three may also elect Part II. The source
node sums boxes 2a and 3 once, calculates one Form 4972, and routes its
separate tax to Form 1040 line 16; native MeF and PDF replay all three
copies and the finalized tax. A $20,000/$25,000/$30,000 distribution with
$2,000/$3,000/$4,000 capital portions gives line 6 $9,000, line 7 $1,800,
and line 8 $66,000. Missing/changed third copy, different plan, and changed
Form 1040 tax have authored rejection fixtures. The
[2025 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
require all qualified distributions for the same participant in the year to
be combined on one Form 4972. These fixtures are unrun; administrator/source
bytes, partial shares, NUA, annuity, estate/death combinations across copies,
filled PDF, XSD/business rules, and ATS remain open.

## Three or four source copies across two spouses (2026-10-01, unrun)

The existing public `elections[]` route now combines two full-share Form 1099-R
copies from one plan for either spouse and one or two full-share copies from a
distinct plan for the other spouse. Same-plan copies must agree on participant,
plan, payer, and complete-balance statement; all copies need distinct source
references. Each spouse elects ten-year tax separately; one may also elect
Part II for summed positive box 3 capital gains while the other uses Part III
alone. The route excludes NUA, annuity, death-benefit exclusion, estate tax,
and partial shares.
Each spouse's combined source amount calculates one Form 4972. Native MeF and
PDF replay the two source groups, match each participant to the final joint
filer, and add the separate taxes into Form 1040 line 16 without reporting the
elected distributions as ordinary pension income. Taxpayer-two-copy,
spouse-two-copy, both-two-copy, mixed Part-II/III, and source/return-tamper fixtures are authored for the
deferred batch. Source and plan-statement bytes, other distribution mixes, and
filled-output review remain open. The [2025 IRS instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
require adding distributions by participant, separate spouse forms, and a
combined tax on Form 1040.

## Separate spouse elections on one joint return (2026-10-01, unrun)

The public Form 4972 input is now one `elections[]` collection. Each election
names its exact Form 1099-R source reference; the bounded spouse pair also
names the participant and plan in each election. The matching source copies
must identify different taxpayer/spouse recipients, distinct participants and
plans, one full-share distribution for each, and affirmative complete-balance
plan statements. The route accepts Part-III-only ten-year elections without
NUA, annuity, death benefit, estate tax, or partial-share allocation. Each
election is calculated separately; only the two special taxes are added for
Form 1040 line 16. Neither distribution enters ordinary pension income.

The pending result carries `forms[]` with one computed Form 4972 per spouse.
Native MeF emits two `IRS4972` documents referenced by Form 1040; PDF renders
two identified pages. Both exports replay each source group against its own
form, require the participant SSN to match the final joint filer/spouse, and
compare the sum with finalized Form 1040 tax. Joint positive and source/plan/
return-tamper fixtures are authored but unrun. Other multi-participant pairs,
multiple distributions for each spouse, mixed Part II elections, authenticated
plan records and bulk validation remain open. The separate-form and combined-
tax rule is in the [2025 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf).

## Partial-share NUA, estate tax, and both elections (2026-10-01, unrun)

One beneficiary with a 50% share and one wholly taxable Form 1099-R can now
elect both the 20% capital-gain treatment and ten-year tax option when box 3
capital gain, elected box 6 NUA, and federal estate tax are all positive. The
administrator's full-distribution/tax statement and the filed-estate-return
workpaper must have distinct references and allocate the same estate tax to the
recipient at the exact box 9a percentage. The [2025 NUA and multiple-recipient
worksheets](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf) put the
recipient's NUA capital share on Part II line 6, then gross up the ordinary
share for Part III line 8. The recipient's estate-tax capital share reduces
line 6; the **full-distribution** ordinary estate-tax remainder reduces Part III
line 18 before line 29 prorates ten-year tax back to this recipient.

For a 50% recipient with boxes 2a/3/6 of $20,000/$4,000/$4,000 and $2,000
full attributable estate tax, $1,000 belongs to this recipient. Capital NUA is
$800; $200 of the recipient's estate tax reduces line 6 to $4,600 and line 7
to $920. The full capital estate-tax portion is $400, leaving $1,600 on line
18. Native and PDF recompute both elected parts, compare the one source 1099-R
and allocation, and join line 30 to the Form 1040 special-tax source. Positive
and tamper fixtures are authored but unrun. Statement/return bytes, annuity,
death-benefit, and multiple elected-distribution combinations remain open.

## Partial-share Part-II-only estate-tax allocation (2026-10-01, unrun)

A bounded beneficiary with one wholly taxable Form 1099-R, positive box 3
capital gain, a box 9a share below 100%, and a Part-II-only election now uses
the existing administrator and filed-estate-return allocation source. The
source must reconcile full distribution, full attributable federal estate tax,
and the recipient's exact whole-dollar share. The recipient's allocated estate
tax is split by their box 3 / box 2a capital-gain fraction, following the
[2025 Form 4972 line 6 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf).
The capital portion reduces line 6 and its 20% line 7 tax; the ordinary estate
tax portion goes to Schedule A line 16 while the recipient's ordinary pension
amount reaches Form 1040 line 5b. The Form 4972 tax joins the finalized Form
1040. Native MeF and PDF recheck the elected Form 1099-R boxes 2a/3/8/9a,
wholly taxable status, allocation source, calculated Part II lines and return
amounts. There is no Part III or `MRD` line 29 in this election.

For a 50% beneficiary with box 2a $20,000, box 3 $4,000, and $2,000 full
attributable estate tax, the recipient's $1,000 estate-tax share divides into
$200 capital and $800 ordinary. Form 4972 lines 6/7 are $3,800/$760, Form
1040 line 5b includes $16,000 ordinary pension income, and Schedule A receives
the $800 IRD deduction. Positive and source/return-tamper fixtures are authored
but unrun. Administrator and estate-return references do not authenticate the
underlying bytes; partial combined Part II/III estate elections, NUA, annuity,
death-benefit combinations, separate spouse forms, and wider filing review
remain open.

## Partial-share Part-II-only death benefit (staged, unrun)

The [2025 Death Benefit Worksheet](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
allocates the full allowable exclusion to each recipient in proportion to the
box 9a distribution share, then allocates that recipient amount between capital
gain and ordinary income. A bounded beneficiary now may elect Part II alone for
one 1099-R with a partial box 9a share, positive box 3 capital gain, and a
pre-August-21-1996 death. The administrator allocation reference, full
allowable exclusion, and exact recipient allocation remain required. NUA,
annuity, federal estate tax, and other elected distributions remain excluded.
For a 50% beneficiary with box 2a $20,000, box 3 $4,000, and a $5,000 full
exclusion, the recipient exclusion is $2,500: $500 reduces line 6 to $3,500,
line 7 is $700, and the remaining $2,000 reduces the $16,000 ordinary share to
$14,000 on Form 1040 line 5b. Native and PDF reconcile those amounts to the
one elected 1099-R and finalized Form 1040. Source, calculation, native, PDF,
and tampering fixtures are authored but unrun; the administrator statement
bytes, filled PDF, XSD, business rules, and ATS remain unverified.

Source: [IRS 2025 Form 4972](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf),
including the form's multiple-recipient instructions and worksheets on pages
3–4. The checked-in TY2025 v5.4 schema is
`.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS4972/IRS4972.xsd`.

## Current coded boundary

- The public `form4972.elections[]` input contains strict election/eligibility
  objects keyed by source-document references. It cannot carry recipient identity, 1099-R boxes
  2a/3/6/8/9a, or a substitute distribution amount. Those fields must arrive
  from the matched Form 1099-R copies marked `exclude_4972`, with a `T` or `S`
  recipient and explicit box 2a. The election and source meet at the Form 4972
  collection node, which calculates each special tax into the finalized Form 1040. Existing
  full-return cases and new source-missing/public-contract cases are written but
  unrun. This intake does not authenticate participant birth date, prior
  elections, or plan-wide distribution completeness; they remain preparer
  attestation/evidence requirements; other multiple-participant combinations remain closed.

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
  and a referenced full attributable federal estate-tax amount. The
  recipient's box 9a percentage grosses up line 8, the full estate-tax amount
  reduces line 18, and line 29 prorates the resulting Part III tax. This follows
  the
  [2025 Form 4972 multiple-recipient steps and line 18 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf).
  The partial-share source now requires distinct administrator-allocation and
  estate-return references, a wholly taxable source Form 1099-R, a full taxable
  distribution matching box 2a divided by box 9a, and a full/recipient estate-tax allocation at whole-dollar
  precision. Calculation, native MeF, and PDF reject a changed allocation while
  matching the one elected Form 1099-R and final Form 1040 special tax. Focused
  positive and tamper fixtures are authored but unrun. The estate
  administrator's statement bytes and tax-return contents, other partial-share estate combinations, filled
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
  Other Part-II-only death-benefit combinations, combined NUA/annuity/estate
  adjustments, shares requiring non-whole-dollar allocation, filled-PDF
  appearance, XSD, business-rule, and ATS checks remain open.
- A joint return with qualified distributions for both spouses requires a
  separate Form 4972 for each spouse and a combined tax on Form 1040 line 16.
  The new collection route supports the bounded two-spouse Part-III-only case
  described above. Wider separate-participant combinations remain closed.
  A bounded two-document route now combines one taxpayer participant's two
  full-share Form 1099-R distributions from the same payer and plan into one
  Part-III-only Form 4972. Both documents must carry distinct source references,
  the same participant name/SSN and plan reference, a referenced administrator
  final-balance statement, an affirmative all-distributions-included assertion,
  box 9a at 100%, and positive box 2a amounts; boxes 3, 6, and 8 must be zero.
  The Form 4972 node adds the taxable amounts, and native MeF and PDF both
  recheck the two source copies, owner identity, calculated lines, and final
  Form 1040 special tax. Focused positive and tamper fixtures are authored but
  unrun. The administrator statement is a referenced source assertion, not an
  independently authenticated document. A third distribution, different
  participant, partial share, capital-gain/NUA/annuity adjustment,
  and separate Form 4972 attachments remain blocked.

  The same two-source, full-share, same-plan taxpayer route now also supports
  a combined Part II capital-gain and Part III ten-year election when the two
  elected Forms 1099-R report positive box 3 amounts. The source node sums
  boxes 2a and 3 once, and the Form 4972 calculation uses the summed box 3 on
  lines 6/7 and subtracts it from summed box 2a on line 8. Native and PDF
  source checks require the same participant, plan, distinct 1099-R references,
  exact box totals, numbered lines, and finalized Form 1040 special tax. The
  [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
  direct all qualified distributions for one participant in one tax year to a
  single Form 4972. NUA, annuity, beneficiary, partial-share, multiple-plan,
  and separate-spouse combinations remain closed for this two-source route;
  focused fixtures are authored but unrun.
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
1099-R. Other partial-share allocations, filled-PDF visual review, XSD/business-rule
checks, and ATS acceptance remain open.

## Partial-share beneficiary NUA with Part-II-only estate allocation (written, unrun)

A beneficiary with one elected Form 1099-R, a box 9a share below 100%, box 3
capital gain, and box 6 employer-security NUA can now elect current inclusion
and Part II without Part III. The source must be wholly taxable apart from NUA:
box 1 equals box 2a plus box 6. The estate administrator statement and estate
return workpaper must have distinct references and agree on the full taxable
distribution **including elected NUA**, total federal estate tax, and the
recipient's box 9a allocation. The 2025 NUA Worksheet adds box 3 to the
capital portion of box 6; the Death Benefit Worksheet's capital fraction uses
box 2a plus box 6. Only the recipient's estate-tax share reduces line 6. The
ordinary estate-tax share reaches Schedule A line 16, while the recipient's ordinary
distribution reaches Form 1040 line 5b and Part II tax reaches line 16.
Native MeF and PDF replay source boxes, calculated lines, and Form 1040 tax.
Positive and tamper fixtures are authored for the deferred validation batch.
Estate statement and filed Form 706 bytes are still unauthenticated; partial
death benefit, annuity, and mixed Part-II/III estate combinations remain closed.

## Partial-share beneficiary NUA with Part-III-only estate allocation (written, unrun)

The one-1099-R beneficiary route also admits a Part-III-only ten-year election
with box 6 NUA and federal estate tax, without Part II, a death-benefit
exclusion, or an annuity. Box 1 must equal box 2a plus box 6. The distinct
administrator and estate-return references must reconcile the full taxable
distribution including elected NUA, full attributable tax, and box 9a
recipient tax share. The multiple-recipient worksheet grosses up box 2a plus
box 6 and the `NUA` note by box 9a for line 8, uses the full estate tax on line
18, and allocates line 29 tax back to the recipient by box 9a. Form 1040 line
16 carries that special tax; no pension amount is added to line 5b. Native MeF
and PDF replay the elected 1099-R, all calculated lines, and finalized Form
1040 special tax. Positive and source/estate/tax tamper fixtures are authored
for deferred validation. Estate-statement and filed Form 706 bytes, mixed
Part II/III estate elections, death benefits, and annuities remain open.

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

A bounded extension combines elected positive box 6 NUA, a separately
percentaged box 8 annuity, and administrator-sourced estate tax for one
partial-share beneficiary's Part-III-only election. The [2025 Form 4972
multiple-recipient instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
direct the line 8 NUA amount to be divided by box 9a, line 11 annuity value
by the box 8 percentage, line 18 to use estate tax attributable to the
distribution, and line 29 tax to be prorated by box 9a. The route requires
one issued 1099-R, box 1 equal to boxes 2a plus elected box 6, distinct
reviewed estate-administrator and estate-return references, and an exact
recipient estate-tax allocation. Native and PDF independently replay the
source boxes, calculated lines, and Form 1040 special tax. Positive and
NUA/annuity/estate/printed-line/return-tax tamper fixtures are authored but
unrun. Part II, death benefits, multiple copies, and broader allocations
stay closed. Source bytes, filled PDF, XSD, business rules, and ATS acceptance
remain to be verified.

A further bounded Part-III-only partial-share beneficiary case now combines a
box 8 annuity and estate tax without capital gain, NUA, or a death-benefit
exclusion. The recipient's box 2a and box 9a yield the full line 8 amount;
box 8's independent percentage yields line 11. A distinct reviewed estate
administrator statement and estate-return reference provide full-distribution
tax, recipient share, and attributable tax for line 18. The computed line 29
is then prorated by box 9a and joins Form 1040 line 16. Native MeF and PDF
replay the elected 1099-R and the calculated lines; source percentage, estate
allocation, line 18, and return-tax tamper cases are authored but unrun. This
follows the [2025 Form 4972 multiple-recipient and line 18 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf).
Part II, NUA, death benefits, and multiple elected copies remain closed in this
combination. Administrator and estate-return source bytes, filled PDF, XSD,
business rules, and ATS acceptance remain to be verified.

The IRS instructions do not permit simply multiplying the current tax by box 9a.
They require all of these steps:

1. The bounded shared-annuity route now represents the separate box 8
   percentage. Retain source-document and participant identity before combining
   multiple elected distributions. Do not infer the box 8 percentage from box
   9a.
2. The no-NUA capital-election and bounded NUA line 8 routes with or without
   Part II are implemented and reconciled. The full-share, no-annuity
   beneficiary allocation, bounded partial-share NUA/estate Part II and Part
   III routes, and the partial-share NUA/death-benefit allocation above are
   written.
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
   Part II and no other allocation, including an annuity. The single-copy
   partial-share NUA/death-benefit route is also authored. Add remaining NUA
   combinations and invalid/missing percentages. Verify native XML against v5.4 XSD and visually
   inspect filled page 1, including `NUA` and `MRD` notes.

## Other unsupported paths and validation gates

- Qualified alternate-payee distributions are explicitly rejected by the node
  pending separate eligibility and recipient-identity handling. Do not interpret
  the current taxpayer/spouse `T`/`S` selection as coverage for an alternate
  payee.
- Part-II-only estate-tax/IRD arithmetic and Form 1040/Schedule A routing have
  source-backed unrun cases for a single full-share beneficiary, including a
  concurrent death-benefit exclusion. Other beneficiary, recipient-share, and
  NUA combinations outside the bounded partial-share estate routes still need source reconciliation; Schedule A's deduction
  applies only if itemized deductions are selected.
- Wider multiple-participant cases need a reviewed participant key and
  full-balance evidence for each source group. A payer EIN, recipient or account
  number alone does not prove plan-participant identity. The bounded spouse pair
  requires source and election participant/plan keys and final-filer ownership;
  other groups remain fail-closed.
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

## Separate spouse Part II and Part III elections (written, unrun)

A joint return with one full-share, single-1099-R taxpayer plan and one
full-share, single-1099-R spouse plan can now elect different parts. The taxpayer
in the authored case elects Part II only on positive box 3 capital gain: line 7
is 20% of that gain, and box 2a less box 3 reaches Form 1040 line 5b. The
spouse elects Part III only: the separate ten-year tax reaches the second Form
4972 and none of that distribution enters line 5b. The two special taxes add
once to Form 1040 line 16. The distinct participant/plan identities and 1099-R
references are retained per attachment; native and PDF collection projections
replay each elected source and reject mismatched capital gain, ordinary pension
amount, or combined tax. Positive and tamper fixtures are authored but unrun.

The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
require spouses filing jointly to attach separate forms and combine tax on line
16; their reporting directions place the Part-II-only ordinary share on Form
1040 lines 5a/5b and exclude a Part III distribution from those lines. This
slice does not authenticate plan statements or prior-election history. Spouse
pairs with annuities, beneficiary allocations, partial shares, or more than one
source for a Part-II-only plan remain closed, as do filled-PDF, XSD,
business-rule, and ATS verification.

## One spouse's NUA alongside the other's Part III election (2026-10-01, unrun)

A joint return can now carry two separate full-share Part III elections when
one spouse's single 1099-R reports box 6 employer-security NUA and the other
spouse's distinct plan has an ordinary lump sum. The NUA spouse must elect
current NUA inclusion; box 2a and box 6 reach that spouse's Form 4972 line 8
and the NUA dotted-line amount, while the other spouse's line 8 remains
separate. The two line 30 taxes add once on Form 1040 line 16, and neither
Part III distribution reaches line 5b. The source groups retain distinct
participant and plan identities. Native MeF and PDF replay each scoped source,
calculated line, and combined tax. A positive fixture plus altered box 6,
printed line, and Form 1040 tax fixtures are authored but unrun. Capital-gain
elections with NUA, shared annuities, beneficiaries, partial
shares, and multiple copies for either NUA plan remain outside this path.
The underlying source documents, prior-election history, filled PDF, local
XSD, business rules, and ATS acceptance still need verification.

## Separate NUA elections for both spouses (2026-10-01, unrun)

One joint return can now carry a full-share Part-III-only NUA election for each
spouse when each has exactly one elected Form 1099-R from a distinct, identified
plan. Each source's box 2a and box 6 determine only its own Form 4972 line 8
and dotted-line NUA amount. The separate line 30 taxes add once to Form 1040
line 16, with no Form 4972 pension amount on line 5b. Native MeF emits two
owner-matched `IRS4972` documents; PDF projects the same separate forms. The
authored positive and source/plan/printed-line/combined-tax tamper fixtures are
reserved for the bulk validation pass. This follows the [2025 Form 4972
instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf), which direct
joint-filing spouses to attach separate forms and add their tax to Form 1040.
Part II, annuities, beneficiaries, partial shares, multiple copies per plan,
administrator source bytes, filled PDF, XSD, business rules, and ATS acceptance
remain open for this pair.

## One spouse's NUA capital election with separate ten-year forms (2026-10-01, unrun)

The [2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf)
allow the 20% capital-gain election and ten-year option together. Their NUA
Worksheet divides box 6 employer-security appreciation between capital and
ordinary portions, and spouses filing jointly calculate separate Forms 4972
before adding the special taxes on Form 1040 line 16. The bounded two-spouse
source route now permits one spouse's full-share, single-copy NUA election to
include Part II when that owner's box 3 is positive and the NUA allocation is
an exact whole-dollar product of boxes 3, 2a, and 6. Both spouses retain Part
III; the other's separate full-share plan has an ordinary Part-III-only election.

In the authored case, taxpayer boxes 2a/3/6 of $30,000/$6,000/$5,000 put
$1,000 NUA on Form 4972 line 6, giving line 6 of $7,000 and line 8 of $28,000.
The spouse's separate $40,000 box 2a source yields line 8 of $40,000. Neither
Part III distribution enters Form 1040 line 5b. Native and PDF projections
replay each source plan, source box, computed line, owner identity, and combined
final tax; changed gain, plan, capital line, and final tax have authored rejection
fixtures. These cases remain unrun pending bulk validation. Beneficiary shares,
annuities, estate/death allocation, multi-copy NUA, source document
authentication, filled PDF review, XSD/business-rule validation, and ATS
acceptance remain open.
