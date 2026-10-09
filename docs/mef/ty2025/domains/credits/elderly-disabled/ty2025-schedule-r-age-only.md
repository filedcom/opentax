# TY2025 Schedule R age-only filing routes

The [2025 Schedule R](https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf)
uses box 1 for a qualifying single, head-of-household, or surviving-spouse
taxpayer age 65 or older; box 3 for two older joint filers; box 7 for one
older joint filer whose spouse did not retire on disability; and box 8 for an
older separate filer who lived apart from the spouse throughout 2025. The
respective line 10 amounts are $5,000, $7,500, $5,000, and $3,750. The
[instructions](https://www.irs.gov/pub/irs-prior/i1040sr--2025.pdf) set the
line 15 AGI thresholds at $7,500, $10,000, $10,000, and $5,000.

The age-only native and PDF routes now select those distinct boxes and use
those amounts. A positive return requires reviewed age-source references for
each older owner, a filed Form 1040 age and filing-status match, and, for
separate filers, a source reference and filed all-year-apart fact. Nontaxable
Social Security reconciles to Form 1040 lines 6a/6b; positive line 13b
benefits need source references and explicit review that they are qualifying
nontaxable pensions or veterans' pensions, rather than excluded military
disability payments. Schedule R line 22 must equal the calculated credit after its line 21
tax-liability limit and match Schedule 3 line 6d. The final Form 1040 credit
guard now permits an older joint-filing spouse and rejects a separate-filer
credit without all-year separation. Whole-dollar rounding is applied to the
line 17 half-AGI amount and line 20 credit.

The disability routes now select boxes 2, 4, 5, 6, and 9 in native XML and PDF.
Each under-65 qualifying owner needs a reviewed retirement and work-capacity
record, confirmation that the condition is expected to last at least one year
or result in death, taxable disability income source, and a signed current-year,
prior-year, or VA physician statement reference. A prior-year statement additionally requires
review of the 1983-or-earlier or signed-line-B condition. Disability income
cannot exceed the finalized Form 1040 wages or taxable pensions according to
the income source classification. Box 6 line 11 adds $5,000 for the older
spouse before capping by the $7,500 line 10 base. The PDF projects the Part II
prior-year checkbox when applicable. These source references record reviewed
facts; they do not authenticate document bytes.

The remaining evidence gate must be authoritative for every positive
Schedule R claim at graph input and native/PDF export. A separate optional
document-review helper would leave the free-text-reference route open, so it
does not close the physician, income, or benefit source gap.

The current CLI stores node inputs as JSON in `return.json`, then executes the
graph before loading attachment bytes. Its attachment loader reads only the
Form 8839 public-source manifest. `prepareReturn` passes those bytes to the
async MeF bundle, where every supplied PDF becomes a `BinaryAttachment` in the
submission packet. The synchronous `buildMefXml` and standalone `buildPdfBytes`
APIs can still run without that bundle; Form 8839 and Form 8994 explicitly
reject these direct paths for their byte-required claims. Schedule R has no
equivalent required source manifest, CLI loader, prepared-bundle reconciliation,
or direct-builder guard. Adding a hash field to its current input would not
prove the application saw the document bytes.

The product evidence standard must specify whether physician, retirement,
income, and benefit records are retained source evidence or IRS-submitted
attachments, and which reviewer assertion is sufficient for unstructured or
signed pages. If they are retained only, the current MeF `attachments` array
cannot carry them without also transmitting them. Implementing a single
required Schedule R source route needs that storage/packet distinction before
the free-text-reference path can be replaced without a bypass.

Focused Schedule R native and PDF tests pass 16/16, including TY2025 XSD cases
for the sourced single age-65 credit, joint/MFS age-only boxes, and disability
box 6. These do not authenticate the underlying age, residence, disability,
or benefit records, nor provide a graph-generated full-return XSD/filled-PDF
case for every status. All Schedule 3 priority combinations, business rules,
and ATS remain open; this evidence does not establish whole-form Schedule R
support.


## October 9: public-return matrix and separate-filer packets

A current-source audit at `cd305d338` exercises all nine Schedule R boxes through the public return graph, native descriptor, PDF descriptor and complete native builder. These are constructed source records, not IRS-provided examples or authenticated age, residence, medical or employer documents. The seven ordinary single/joint cases use $7,500/$10,000 AGI and the standard deduction; each reproduces the previously documented credit-limit block in Form 1040. Their tentative Schedule R credit is positive while available income tax is zero. The source node does not reduce its Schedule 3 deposit to that limit, and finalization rejects it. Downstream errors from incomplete finalized pending data are not separate proof of invalid source records. No completed return or PDF is counted for those seven cases.

Two retained MFS fixtures model all-year Florida residents living apart throughout 2025, with a spouse who itemizes, no taxpayer itemized expenses and no community-income allocation. The age-based fixture has $7,500 bank interest; the under-65 disability fixture has $7,500 taxable disability wages, $1,000 withholding and a current-year physician-statement review. The latter has no prior-year-statement checkbox. Both fixtures retain explicit source references, not authenticated underlying bytes.

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) disallow the MFS standard deduction when the spouse itemizes and disallow the enhanced senior deduction for MFS. Thus each fixture has $7,500 taxable income. The [2025 Tax Table, page 3](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) gives $753 tax for the MFS $7,500–7,550 row. The [2025 Schedule R](https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf) gives a $3,750 base and $5,000 AGI threshold for boxes 8/9: subtracting half of $2,500 leaves $2,500, whose 15% credit is $375. These expectations are independent rule arithmetic, not engine outputs used as ground truth.

| Full-return source | Schedule R box / line 11 | Schedule R line 22 / Schedule 3 line 6d | Form 1040 total tax | Settlement | PDF pages |
|---|---|---:|---:|---|---:|
| Age 65+, bank interest, spouse itemizes | 8 / skipped | 375 | 378 | 378 owed | 6 |
| Under 65, reviewed disability wages, spouse itemizes | 9 / 7,500 | 375 | 378 | 622 refund | 5 |

Both actual complete XML returns pass local TY2025 `2025v5.4` XSD. All 11 actual PDF pages were rendered and inspected, including Form 1040's MFS/spouse-itemizes/age marks, Schedule B's interest and foreign-account/trust answers, Schedule 3, both Schedule R pages, skipped line 11 for box 8, disability line 11 and Part II for box 9, final tax and settlement. No PDF widgets or AcroForm fields remain. The Schedule R amounts and form selection reconcile, but whole-packet presentation is qualified: both Form 1040 pages 1 print Riley Example in the joint-only spouse-name row as well as the MFS field. The 2025 name/address instructions require the MFS field instead of the joint row. This observation extends deferred identity item 68; no runtime repair was made.

The final typed four-file regression passes **48/0, zero ignored**, including the two new public-return/negative-source tests and 46 existing calculation/native/PDF checks. Missing residence or physician evidence rejects both complete native and PDF-descriptor preparation. Two initial type-check failures in the new test's PDF context were corrected by parsing the existing Schedule R schema; type checking was not bypassed.

The private nine-box exploration retains its authoring diagnostics: an initially dashed interest recipient TIN, an incorrect interest field name and omitted Schedule B/1-A review facts. The final matrix corrects those inputs; these diagnostics are not production defect claims. The initial positive audit packets used inherited Texas addresses. The retained production fixtures explicitly use Florida to avoid an unreviewed community-property assumption; their final packet run and regression are separate from the initial packets, with the same calculated taxes. Only the final two packets/11 pages are counted here.

Evidence is retained in `.state/research/schedule-r-full-return-audit-2026-10-09/`: all nine source/pending/outcome records, exploration and final packet scripts, native XML, PDF, rendered page hashes, terminal test logs and checkpoint. Earlier synthetic dependent/interest evidence remains historical and does not establish dependency eligibility. Physician/benefit/source authenticity, other filing statuses, tax-limit ordering, business rules and IRS acceptance remain open; this batch closes no broad board task.


## October 9: finalized tax limit and downstream credit ordering

The earlier tax-limit block is now resolved for the retained source route. Schedule R still calculates its tentative credit from the original age/disability, AGI and benefit facts, but now carries those schema-validated facts through Schedule 3 to Form 1040. Form 1040 checks the source AGI/status and tentative credit against the deposited totals, applies the [2025 Schedule R line 21 worksheet](https://www.irs.gov/pub/irs-prior/i1040sr--2025.pdf), and replaces Schedule 3 lines 6d/7/8 before finalizing later credits. The worksheet subtracts Schedule 3 lines 1, 2 and 6l from Form 1040 line 18. A zero capacity produces no filed Schedule R credit or document; positive capacity caps line 22. An unexplained direct over-limit credit still rejects.

The source schema and tentative arithmetic were extracted without changing their calculation. The finalizer retains the original tentative source in replay inputs so a changed-tax counterfactual recalculates the credit instead of reusing a previously capped amount. Retirement and vehicle-credit priority operands receive the allowed Schedule R amount. The Schedule 3 line 7 fallback is confined to this source route, preserving unrelated finalizer behavior.

Eleven constructed public-source returns exercise the change. Seven single/joint cases corresponding to boxes 1–7 now finish with zero income tax and no Schedule R, replacing the previous public-graph failures. They cover age-only, disability-only and mixed-age/disability spouses; this proves zero-credit return completion, not positive-credit admission for every box. The saved original nine-box audit also replays on the new code with all nine native bundles passing XSD.

| Source group | Returns | Tentative Schedule R credit | Allowed Schedule R credit | Other credit / final tax |
|---|---:|---:|---:|---|
| Ordinary single/joint standard-deduction cases | 7 | 750, 900 or 1,125 | 0 | No income tax |
| MFS age/disability, 4,000 income and spouse itemizes | 2 | 563 | 403 | Final tax 0 |
| MFS age-qualified wages 4,000 plus 500 W-2 retirement deferral | 1 | 563 | 403 | Form 8880 credit 0; final tax 0 |
| MFS age-qualified wages 7,500 plus 500 W-2 retirement deferral | 1 | 375 | 375 | Form 8880 credit 250; final tax 128 |

The [2025 Tax Table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) independently supplies MFS tax 403 for taxable income 4,000–4,050 and 753 for 7,500–7,550. The Schedule R MFS base 3,750 gives tentative credit 563 when AGI is below 5,000; at AGI 7,500 it gives 375 after the 1,250 reduction. In the higher-wage retirement case, the remaining tax capacity is 753−375=378, allowing the 250 credit on 500 qualified deferrals at the [2025 Form 8880](https://www.irs.gov/pub/irs-pdf/f8880.pdf) 50% rate. With 1,000 withholding, the retirement cases refund 1,000 and 872 respectively. All source and expected records are synthetic; these are independent rule-derived expectations, not claimed IRS example answers or authenticated medical/payroll records.

The final twenty-file regression covers Schedule R, Form 1040, Schedule 3, retirement credits, existing mortgage/homebuyer/electric/bond credit replay and source-only exports. It passes **308 tests, zero failures, zero ignored**. New cases verify all three worksheet priority lines, an exact exhausted limit, nonbinding limits, changed-tax replay, source conflicts and input immutability. The first broad attempt stopped on a new test importing a non-exported schema; the test now uses the node's public schema without weakening type checking.

All eleven complete return XML files pass local TY2025 `2025v5.4` XSD. Their 40 actual PDF pages are observed: 26 newly distinct pages were inspected and 14 match already reviewed rendered pages exactly. Four positive-credit packets include the correctly capped Schedule R and, where applicable, Form 8880; the seven zero-credit packets omit Schedule R. All PDFs have zero widgets and AcroForm fields. Existing deferred identity item 68 and zero-print item 76 remain visible: MFS spouse names are duplicated in the joint-only row, some joint names are primary-only, and zero Form 1040 line 24 remains blank. No clean whole-packet parity is claimed.

After the finalizer fallback was scoped, a fresh final-code replay retained every one of the eleven PDF byte sequences and native XML files apart from `ReturnTs`, with XSD revalidation. The previous two MFS packets likewise retain exact PDF bytes and native XML except timestamps; new retained source metadata means this is not a whole-pending equality claim. No deferred runtime item was implemented.

Evidence: `.state/research/schedule-r-credit-limit-2026-10-09/`, including original-input replay, eleven input/pending/prepared/native/PDF packets, rendered hashes/contact review, prior-packet preservation, final-code replay, exact regression command, terminal logs and checkpoint. Source authentication, positive single/joint/HOH/QSS variants, broader benefit/credit combinations, the final release batch, business rules and IRS acceptance remain open.


## October 9: positive single disability and benefit reductions

Five additional constructed public-source returns extend the full-return review to single disability with EIC and MFS benefit reductions. This batch changes fixtures and evidence only. It retains the existing reviewed-source contract; it does not authenticate medical, payroll, SSA, pension or VA document bytes.

| Source case | Income tax before credits | Schedule R credit | EIC | Final tax | Refund / owed |
|---|---:|---:|---:|---:|---|
| Single disability wages 16,000; current-year physician review | 26 | 26 | 236 | 0 | Refund 1,236 |
| Single disability wages 17,000; prior-year signed-line-B review | 126 | 38 | 159 | 88 | Refund 1,071 |
| MFS interest 7,500 plus nontaxable SSA 1,000 | 753 | 225 | 0 | 528 | Owed 528 |
| Same MFS with eligible nontaxable pension 300 and VA pension 200 | 753 | 150 | 0 | 603 | Owed 603 |
| MFS interest 7,500 plus nontaxable SSA 2,500 | 753 | 0 | 0 | 753 | Owed 753 |

The single cases use the 15,750 standard deduction, leaving taxable income 250 and 1,250. The [2025 tax table, printed page 2](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) uses **25-dollar bands** here and gives 26 and 126; initial draft expectations wrongly assumed 50-dollar bands and were corrected from that table. The EIC table on printed page 18 gives 236 and 159 for the reviewed childless filers. The source includes employment-valid/timely SSNs, U.S. home, dependency and family review facts; the initial probe had inherited incomplete MFS-era EIC facts and is retained as an authoring diagnostic. The final fixture and packets use the complete synthetic reviews.

[Schedule R](https://www.irs.gov/pub/irs-prior/f1040sr--2025.pdf) lines 10–22 independently yield tentative credits 113 and 38 for the single cases; the first is capped at income tax 26. Both show box 2, while only the prior-year physician case marks Part II. The MFS sources retain apart-all-year Florida residence and an itemizing spouse. Their low provisional income leaves all SSA benefits nontaxable. Reducing the 3,750 base by SSA and the 1,250 AGI reduction gives 225 or zero; an additional 500 of qualifying line 13b benefits reduces the first credit to 150. Pension/VA qualification is a synthetic explicit review assertion, not a verified issuer record.

All five complete native bundles pass local TY2025 2025v5.4 XSD. All **25 PDF pages** are observed: 19 distinct pages were newly inspected and six match previously reviewed renders exactly. The review covers box 2/8, the prior-year physician mark, benefit lines 13a/b/c, tax limitation, Schedule 3, Form 1040 SSA/all-year-apart and spouse-itemizes marks, EIC and settlement. Four packets include Schedule R; the exhausted-benefit case omits it. There are no remaining PDF widgets or AcroForm fields. Existing deferred item 68 repeats the MFS spouse-name duplication, and item 76 repeats the blank zero Form 1040 line 24; clean whole-packet parity remains unapproved.

Six new tests check the five completed returns and reject missing SSA/pension/VA source reviews or a benefit amount conflicting with finalized SSA through both full native preparation and PDF projection. The eight-file typed regression passes **116/0, zero ignored**, including the existing Schedule R native/PDF/calculation, SSA source and EIC checks. The cumulative three October 9 batches now contain **18 XSD-valid source returns and 76 observed pages**, with ten positive Schedule R packets and eight zero-credit packets. Wider status, benefit and priority combinations, source authenticity, the final release gate and IRS business-rule/acceptance evidence remain open.

Private evidence: `.state/research/schedule-r-benefit-returns-2026-10-09/`, including initial and corrected sources, probes, exact regression command/log/exit, five pending/native/PDF packets, rendered page hashes and review checkpoint. No broad board task is closed.
