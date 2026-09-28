# TY2025 paired Form 8889 boundary

## One spouse loses eligibility to nonpermitted other coverage (written, unrun)

The [2025 Publication 969](https://www.irs.gov/publications/p969) says the
married family-sharing rule applies only while both spouses are HSA-eligible;
other health coverage can disqualify one spouse without disqualifying the
family-HDHP spouse who is not covered by that other plan. A bounded route now
requires two owner-identified HSAs, family eligibility for both through the
month before one spouse gains nonpermitted other coverage, zero eligibility for
that spouse thereafter, and family eligibility for the other spouse all year.
The loss month, coverage source reference, and confirmation that the continuing
spouse is not covered by the disqualifying plan are mandatory. The owners must
share one referenced allocation agreement for the months both were eligible;
their agreed shares sum to that prorated family limit. The continuing spouse
receives the unshared remaining family months on line 6. Owner-specific
catch-up amounts and deductions remain separate. MeF and PDF recompute both
Forms 8889 and reconcile the combined deduction to Schedule 1 and Form 1040.

This route rejects missing or conflicting monthly facts, dual eligibility
losses, Medicare overlap, last-month elections, Archer MSA reductions, and
testing-period failures. The entered insurance/coverage reference is not
independently authenticated. Focused positive and tamper cases are written but
unrun. Full-batch tests, XSD validation, filled-PDF review, and IRS ATS remain
pending.

## Different family and self-only plans by month (written, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) say
that when both spouses are HSA-eligible and either has family HDHP coverage,
both are treated as family-covered and any self-only plan is disregarded. The
paired source now derives that effective coverage for each month from the two
original owner arrays. In the bounded path, both spouses are eligible all twelve
months, each raw entry is family or self-only, neither elects the last-month
rule or has an Archer MSA reduction, and both supply the same referenced
allocation agreement. The two family shares must sum to the 2025 family limit
prorated over the **union** of their family-coverage months. Each owner's line 6
adds their agreed family share to their own prorated self-only limit for months
neither spouse had family coverage. The effective months determine both printed
Forms 8889, including line 1, line 3, and any age-55 line 7 amount. MeF and PDF
recompute them from the unchanged owner sources and match the combined Schedule
1/Form 1040 result.

This remains closed for a month when either spouse is ineligible, including
Medicare, and for an unsourced or inconsistent allocation. The monthly coverage
and agreement reference are entered facts, not independent document
verification. Positive, tampered-share, ineligible-month, and MeF/PDF cases are
written but **not run**.

## Matching family and self-only months (written, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
require spouses with separate HSAs to allocate the limit for family-coverage
months by agreement on line 6, then add each owner's other applicable
contribution limit. A bounded route now accepts two owner-identified HSAs when
both are eligible all year, their twelve monthly arrays match exactly, each
month is either family or self-only, and both types occur. Both owners must
affirm marriage, separate HSAs, no last-month election, and zero Archer MSA
reduction. Their sourced agreed shares must sum to the rounded 2025 family-month
limit. Each line 6 is that owner's family-month share plus their own prorated
self-only-month limit. The age-55 amount is owner-specific on line 7 because the
spouses had family coverage during the year. The graph sums the two line-13
deductions once on Schedule 1. MeF and PDF recompute and compare both owner
forms and the return totals from the same pending source.

This earlier matching-month subpath does not accept ineligible months mixed with
self-only months, a last-month election, or an unsourced allocation. The month
entries, age answer, and signed-agreement reference are supplied facts, not
independently verified documents. Positive, allocation-tamper, coverage-
mismatch, and MeF/PDF reconciliation cases are written but **not run**.

## Paired normal-distribution source route (written, unrun)

Two owner-labeled Forms 8889 may now include ordinary 2025 HSA distributions
with Form 1099-SA distribution code 1. Each positive owner line 14a requires one
or more source records with the owner's recipient SSN, tax year, box 1 gross
amount, code, and distinct document reference. Their box 1 sum must equal that
owner's entered line 14a amount. Positive line 15 also requires distinct
medical-expense references, amounts summing to that line, and explicit answers
that each expense was incurred after the HSA was established and was not
reimbursed by other coverage. A receipt reference cannot be claimed by both
owners. The existing total fields remain the printed Form 8889 amounts; the new
records are required evidence for this paired export path, not a fallback or a
second calculation route. The references and affirmations are entered facts, not
independent document verification.

The exporter recomputes both owner forms, matches all printed lines, and
reconciles the sum of taxable line 16 distributions to Schedule 1 line 8f and
the sum of line 17b penalties to Schedule 2 line 17c. It still rejects paired
rollovers, timely excess withdrawals, employer/W-2 contributions, IRA funding,
prior excess, and testing-period events. Form 1099-SA codes 2-6 and deemed
distributions remain outside this bounded route. A dated age-65 exception
subpath is described below. Positive and negative MeF/PDF/source cases are
written but have not been run. The
[2025 Form 8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf)
describe lines 14a-17b and the
[2025 Form 1099-SA instructions](https://www.irs.gov/pub/irs-prior/i1099sa--2025.pdf)
describe box 1 and distribution code 1.

## Paired age-65 additional-tax exception (written, unrun)

The
[2025 Form 8889 instructions](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf)
say line 16 remains taxable when a distribution is not used for qualified
medical expenses, but line 17b excludes the taxable amount distributed after
that HSA beneficiary turned 65. The existing owner calculator already requires a
sourced birth date and dated distribution ledger, reconciles gross and qualified
portions to lines 14a and 15, and computes the exception amount from the post-65
taxable transactions. The paired MeF/PDF reconciliation now accepts that
calculation for either owner in the otherwise bounded normal-distribution route.
It requires distinct dated-distribution references across owners, checks each
owner's printed exception box and penalty against recomputation, and matches the
combined taxable income and penalty to Schedules 1 and 2. One owner's age does
not exempt the other owner's distributions.

This is limited to Form 1099-SA code 1, positive owner contributions in both
accounts, no line-14b exclusions or other HSA events, and the current
date/amount evidence supplied by the filer. Death, disability, non-normal
distribution codes, and transaction-level independent document verification
remain open. Focused positive, evidence-tamper, reused-reference, return-total,
and PDF-line tests are written but **not run**; the full test, XSD, rendered
PDF, IRS business-rule, and ATS gates remain pending.

## HSA rollover line 14b source boundary (written, unrun)

The former bare `hsa_excluded_distributions.rollover_amount` input is removed.
An HSA-to-HSA rollover claimed on line 14b now needs one `rollover` source
record with the amount, the 2025 distribution and redeposit dates, distinct
distribution and receiving-HSA references, and explicit affirmations that the
beneficiary is the same, the receiving HSA had no other rollover in the
preceding twelve months, and the movement was not a direct trustee transfer. The
calculator checks valid dates, a nonnegative interval of at most 60 days, and
that the line-14b amount does not exceed line 14a. A direct trustee transfer is
not reported on line 14a or 14b. This is a direct input cutover, not a legacy
branch. The references and affirmations are entered evidence, not verified
documents; rollover-specific 1099-SA source reconciliation remains open.
Positive and negative focused cases are written but have not been run. The
[2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) supply the
rollover, direct-transfer, and line-14b rules.

Form 1099-SA box 1 is an annual distribution total; it cannot, by itself,
identify the date or portion of a distribution rolled over. A December 2025
withdrawal redeposited in early 2026 also has no 2025 Form 5498-SA box 4 record
for that redeposit. The existing date and reference affirmations remain entered
evidence. A source-reconciled rollover route needs transaction-level trustee
records for both legs before claiming independent proof of line 14b.

## Full-year separate self-only HSAs: bounded written route

The [2025 instructions](https://www.irs.gov/instructions/i8889) direct spouses
with separate HSAs to complete lines 1–13 on separate Forms 8889; their line 6
sharing rule applies only if either spouse had family coverage at some time
during 2025. A new bounded path therefore accepts two owner-identified HSAs only
when **both** monthly arrays contain self-only coverage for all twelve months,
both owners affirm marriage and separate HSAs, neither elects the last-month
rule, and neither supplies a family allocation or Archer MSA reduction. Each
owner's line 6 equals that owner's self-only line 5; the age-55 additional
contribution, when applicable, is included in that owner's line 3 rather than
shared on line 7. The graph combines the two deductions once on Schedule 1 while
retaining separate owner forms.

For this new positive MeF/PDF subpath, the exporter recomputes both forms from
the pending owner sources and matches every printed line and owner name/SSN to
the filed identities. It is further restricted to positive personal
contributions without W-2 code W, unsourced or non-normal distributions, funding
transfers, prior excess, testing-period events or timely-withdrawal facts; those
more complex self-only paired cases remain closed at export pending their own
reconciliation. The resulting Schedule 1 deduction and Form 1040 adjustment must
match, and no unexplained Schedule 2 HSA tax is accepted. Focused positive,
tampered-line, missing-source, and allocation-in-self-only cases are written but
**not run**; full test/typecheck/XSD/PDF/ATS validation remains pending.

## Partial-year separate self-only HSAs (written, unrun)

The
[2025 Form 8889 line 3 worksheet](https://www.irs.gov/pub/irs-prior/i8889--2025.pdf)
assigns the self-only limit to an eligible month and zero to an ineligible
month. When neither spouse has a family HDHP month, the family-sharing rule for
line 6 does not apply. A paired route now accepts two owner-identified HSAs
whose separate twelve-month arrays contain only self-only or ineligible entries,
with at least one eligible month for each owner. The months may differ between
spouses. Both affirm marriage, separate HSAs, and no last-month election;
neither supplies a family allocation, Archer MSA reduction, or Medicare-onset
route. Each owner's line 3 and line 6 use that owner's prorated self-only
months. For an owner age 55 or older, the eligible-month catch-up is included in
line 3, not shared on line 7. The two personal deductions sum once on
Schedule 1.

The Form 8889-specific MeF/PDF reconciliation reads the unchanged owner-month
sources, recomputes both printed forms, checks owner names and SSNs, and matches
the combined Schedule 1 and Form 1040 amounts. It retains the existing narrow
paired-export boundary on other HSA events. Focused different-month,
source-tamper, line-tamper, and invalid-allocation cases are written but unrun.
The monthly eligibility entries are entered coverage facts, not independently
authenticated insurance records. Full tests, typecheck, XSD, filled-PDF, IRS
business-rule, and ATS validation remain pending.

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
require separate forms when both spouses have HSAs. For spouses who are not
treated as having family coverage all year, line 6 first allocates the limit for
family-coverage months and then adds any other applicable limits. The line 3
worksheet averages the monthly eligible HDHP limits. The
[2025 Form 5329 instructions](https://www.irs.gov/instructions/i5329) require a
separate Form 5329 for each spouse who must file one, with their combined
additional tax on Schedule 2 line 8.

The paired 2025 Form 8889 route handles two owner-identified HSAs with
**identical family-coverage months**, including a partial year, and no
last-month-rule election. Each of the twelve month entries must be `family` or
ineligible, with at least one eligible month. The two agreed line 6 allocations
must sum to the rounded family limit prorated over those months. Owner-specific
contributions, W-2 code W amounts, catch-up limits, and excess facts feed
separate Forms 8889 and owner-labeled Form 5329 entries. The existing MeF
descriptor reconciles combined owner totals to pending Schedules 1 and 2, and
Schedule 1 total adjustments to Form 1040 line 10. This narrow route still
rejects mismatched spouse-month eligibility and Archer MSA reductions. The
monthly eligibility and allocation references are entered source facts, not
independent verification of coverage or a signed agreement.

Owner-specific HSA excess now enters a single owner-keyed Form 5329 collection.
The calculator groups source entries by taxpayer and spouse, keeps each Part VII
balance separate, calculates one form per owner, and combines their additional
tax once on Schedule 2 line 8. The MeF descriptor emits one `IRS5329` per active
owner and the PDF descriptor expands one copy per owner with individual identity
fields. The paired Form 8889 source sends primary and spouse excess to their
respective entries. The paired 2025 last-month-rule election and
ineligible-month patterns remain blocked pending their own allocation and
testing-period source reconciliation. Focused cases are written but not run; XML
schema, IRS business rules, canonical PDF field/widget verification, and
full-batch validation remain pending.

### Bounded 2024 paired-family election recapture (written, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) put
the failed-testing-period excess on each owner's 2025 Part III line 18, Schedule
1 line 8f, and Schedule 2 line 17d. A new narrow route accepts two separate 2024
Forms 8889 only when both owners were ineligible January through November, each
had family HDHP eligibility on December 1, neither was 55 or older, and their
documented 2024 agreement allocated the $8,300 family limit equally. Both
distinct filed owner forms must show line 3 and line 5 of $8,300, line 6 and
line 8 of $4,150, no Archer MSA or IRA funding distribution, and each owner's
personal and employer contributions and deduction. The source references on the
2025 failure entries must identify those same two filed forms; a joint
allocation record identifies the equal split.

The counterfactual 2024 worksheet limit is $692 for the one eligible month, or
$346 per owner under the documented equal split. Each owner's line 18 is their
own filed 2024 personal plus employer contribution less $346, floored at zero.
The graph emits two owner-labeled Part III forms and sums income and the 10% tax
once downstream. Written cases cover both owners' different contributions and
reject a missing form, mismatched allocation, or broader 2024 month pattern.
These cases, native XML, canonical PDF rendering, and IRS business-rule
validation have **not** been run. Unequal 2024 allocation, mixed 2024 coverage,
catch-up, one-owner failure, and combined prior-year IRA funding remain
unsupported rather than guessed.

### Paired 2025 last-month-rule election remains closed

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889) treat
an eligible owner on December 1 as eligible for the year, but impose a testing
period through December 31, 2026. Failure during that period (other than death
or disability) recaptures the owner's contributions attributable to the election
on the 2026 Form 8889 Part III, with a 10% tax. The 2025 married family limit is
shared by agreement, whereas each spouse's age-55 additional amount is their
own. Thus two elected spouse forms need both owner-specific December eligibility
facts, one sourced agreement allocating the full-year family limit, and each
owner's contribution and future testing-period ledger.

The current paired source has owner identities, monthly eligibility arrays and
an allocation reference, but its paired validator requires
`last_month_rule_elected: false` for both owners and prorates the shared family
limit to actual eligible months. Its Part III `last_month_rule_evidence` is a
different, retrospective path: it accepts a 2024 filed form only when the spouse
**did not** have a separate HSA, and cannot reconstruct two owners' filed
allocations or their separate 2025-election recaptures in 2026. The owner-keyed
Form 5329 collection addresses HSA excess contributions; it does not replace
Form 8889 Part III testing-period income and tax. Allowing either spouse's 2025
election now would produce a full-year line 3 without a complete paired line 6
and recapture provenance. Both- and one-spouse-election rejection cases are
written but unrun, and no fallback or guessed split was added.

## Owner-excess filing requirement

The [2025 Form 5329 instructions](https://www.irs.gov/instructions/i5329)
explicitly require a separate Form 5329 for each spouse who must file one and
the sum of their additional taxes on Schedule 2 line 8. Part VII lines 42 and 47
use the owner's filed 2024 Form 5329 and 2025 Form 8889 amounts; line 49 also
depends on that owner's December 31 HSA value. The paired Form 8889 source
carries owner identities, contributions, prior lines 48/49, and separate
December 31 values. The new `form5329` pending collection preserves these
owner-labeled facts alongside any owner-labeled early distributions or direct
IRA/education inputs, rather than combining unlike owners into one form.

The cutover replaces the old flat Form 5329 input with one array-valued
`owner_entries` collection; no legacy flat branch remains. Every current
automatic producer—Form 8889, Form 1099-R, and Form 4852—deposits an
owner-labeled entry. Direct Part II–VIII and exception sources must now use this
same collection; duplicate non-distribution facts for one owner fail closed. The
calculator emits `owner_forms` ordered taxpayer then spouse and sums their
taxes, including the separate chapter 1 portion, once. MeF and PDF recalculate
those forms from `owner_entries`, reject a mismatched computed projection, and
reconcile their sum to pending Schedule 2 line 8. Each output uses the owner's
name and SSN. The Form 5329 node, MeF, PDF, XSD, builder, and HSA-focused test
fixtures have been changed to this shape, but **none has been run**.

The benchmark 1099-R early-code audit found eleven single-filer TY2025 cases
whose filing facts establish taxpayer ownership; their source inputs now carry
`ts: "T"`. Two MFJ cases remain fail-closed because their facts identify both
spouses but not the 1099-R recipient:
`benchmark/cases/f1040/2025/121-mfj-w2-1099r-early-401k-penalty/input.json`
(code 1) and
`benchmark/cases/f1040/2025/92-mfj-w2-1099r-1099int-1099div-estimated-tax/input.json`
(code J). Each needs a recipient identity from source documents or case authors
before the full benchmark batch can pass; assigning T or S from the filing
status or form order would be a guess.

### Graph migration boundary

The former flat `form5329` shape accumulated amounts and `subject_ts`
independently, so it could not reconstruct which amount belonged to which
spouse. The new `owner_entries` field keeps each source event and owner together
while the executor accumulates entries. Form 1099-R now requires `ts` for active
early distributions instead of defaulting to taxpayer; Form 4852 code-1
substitutes require `subject_ts`; Form 8889 supplies owner T or S from the
paired account position. The current direct Form 5329 API is intentionally
replaced rather than accepted in parallel. Existing clients and test fixtures
using flat inputs must migrate before full-batch validation can be green.

The single-account source now requires `beneficiary_identity.owner: "T" | "S"`;
the previous implicit taxpayer assignment has been removed, and existing callers
must supply the owner. A lone spouse-owned HSA can produce one spouse-labeled
Form 8889 and spouse-owned Form 5329 Part VII excess entry. MeF and PDF now
accept one spouse form only when the filer spouse identity matches, recomputing
the printed lines from the same owner-attributed HSA source and reconciling
HSA-specific Schedule 1/2 amounts and Form 1040 line 10. Any generated HSA
excess source must also match the spouse's pending Form 5329 owner entry. This
is a direct schema cutover, not a compatibility or fallback branch.

A repository-wide source sweep found no remaining `beneficiary_identity` object
without the required owner. The direct Form 8889 source fixtures in the node,
MeF, PDF, and HSA end-to-end tests were migrated only where the stated name/SSN
and filer facts identify T or S. Other Form 8889 references in builders, Form
5329, CLI warnings, and validation rules consume computed `forms` or pending
amounts; they do not construct a beneficiary source object.
`forms/f1040/2025/inputs.ts` uses the same node schema, so external callers must
supply the new field. Benchmark case `31-single-w2-box12-hsa` has code W but no
employee SSN or Form 8889 beneficiary source; its owner cannot be attributed
from the supplied document facts and remains fail-closed rather than assigned T
from single filing status. No tests or typecheck have run after the cutover.

Remaining boundaries are deliberate. A single HSA still cannot silently claim a
paired-family allocation; paired forms require taxpayer then spouse owner
identities. The PDF header names are mapped as `f1_1`/`f1_2` from their position
before existing line-1 field `f1_3`, but the official TY2025 canonical AcroForm
tree, widget values, appearances, and visual rendering have **not** been
verified and must be checked in the full PDF batch. Form 8889's existing
monthly-family allocation boundary still applies. Direct MeF/PDF spouse-only
calls must carry source entries, the calculator's matching owner form, Schedule
1/2 totals, Form 1040 adjustments, and filer identity; the full return builder
supplies these from the graph. Focused owner cases are written but unrun. This
is an implementation claim, not a verified filing claim.

## Two employer-funded self-only HSAs (written, unrun)

The [2025 Form 8889 instructions](https://www.irs.gov/instructions/i8889)
require an owner form for HSA contributions, including W-2 box 12 code W
employer contributions. A married couple can have two separately owned HSAs
funded only through payroll and therefore owe no Schedule 1 HSA deduction or
distribution income. The calculator now emits both owner forms in this case
without inventing a Schedule 1 amount. The bounded export requires full-year
self-only HDHP coverage for both owners, exactly one positive code W entry per
owner SSN, explicit zero employer-contribution year adjustments, no personal
contributions, distributions, prior excess, funding transfer, testing-period
failure, or other HSA event, and no contribution above either owner's limit. MeF
and PDF recompute the owner lines and reconcile any present Schedule 1, Schedule
2, and Form 1040 totals. Focused positive and tampered-source cases are written
but unrun pending the single full validation batch. This does not expand the
paired route to mixed employer and personal contributions.
