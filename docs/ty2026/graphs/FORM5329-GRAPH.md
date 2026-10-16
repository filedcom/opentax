# TY2026 Form 5329 graph contract

Sources: pinned [2026 draft Form 5329](../corpus/draft/f5329.pdf)
(SHA-256 `f8822ccc8d14eca9424255d3b9606a8c210143ad8a317018f50222d03740edbe`)
and [draft instructions](../corpus/draft/i5329.pdf)
(SHA-256 `55f531aad380ec1ac63cc697e0f5d0cd603c503e18cebd9fb04b0bd46633aa35`).
The final [2026 Form 1099-R instructions](../corpus/authorities/i1099r--2026.pdf)
define the payment codes and SIMPLE participation period. Final forms/instructions
and current IRS acceptance remain filing gates.

## Connected Part I sources

The registered `f1099r` source supports single-code 1 and S distributions alongside
the [ordinary retirement paths](./FORM1099R-GRAPH.md). It derives taxable income
from a no-basis traditional/SEP/SIMPLE IRA or a payer-determined qualified pension,
then requires a reviewed inventory of actual payment dates, gross amounts and
taxable amounts. Payments must reconcile to the current issued statement and occur
before age 59½ unless the reviewed payment establishes exception 12. Repeated
payment references within the same owner/payer/account
are rejected across statements as well as within one statement.

The source review must provide either a no-exception declaration or a complete
exception review, never both. Code 1 alone is not evidence for either conclusion.
SIMPLE distributions additionally need
the first actual contribution date: code S is valid only within two years of that
date, and a code 1 SIMPLE payment must be on or after the second anniversary.
Governmental 457(b) early payments require separate rolled-in asset history and
remain blocked rather than being assigned the ordinary plan tax.

The exception review identifies the owner and account and links each claim to one
actual payment. Duplicate/orphan payment claims, contradictory declarations and
entered exception amounts/codes are rejected. The supported evidence derives:

| Exception | Required evidence and boundary |
| --- | --- |
| 01 | Separation date in or after the year the owner reaches 55; payment from that employer's qualified plan after separation; employer identity and plan relationship reviewed; unavailable for IRAs |
| 03 | Patient-matched medical determination and retained physician record, disability onset by payment, inability to perform any substantial gainful activity, expected death or long/continued/indefinite duration, and evidence covering the payment date; income classification remains separate |
| 04 | Matched decedent identity, death date, inherited-basis review and beneficiary entitlement; each payment must be on or after death and the account must remain inherited, including a spouse who has not treated it as their own |
| 06 | Administrator-qualified domestic relations order effective by the payment date, matching spouse/former-spouse alternate-payee TIN and review that the entire payment was made under the order; unavailable for IRAs |
| 10 | Dated IRS levy on the actual retirement account; the amount paid under the levy must equal that payment's gross amount; a voluntary withdrawal to pay tax does not qualify |
| 12 | Verified birth record and actual payment date on or after the owner's 59½ birthday, including month-end anniversaries; source code remains 1/S |
| 20 | Owner-matched physician certification signed by the payment date; reviewed physician credentials, contact, supporting narrative and attestation, examination/evidence-review date, and certified expectation of death within 84 months; eligible plan distribution and administration/election evidence |

Disability evidence derives exception 03 from the pinned 2026 draft instructions.
The medical determination must exist by the treatment review and establish
disability at payment; unlike terminal illness, it need not have been signed
before payment. No diagnosis or private physician record is printed on the draft.
The exception applies to the reviewed payment's taxable amount for ordinary
qualified-plan and traditional/SEP/SIMPLE IRA withdrawals. A disabled taxpayer's
withdrawal is not automatically an employer disability pension; that classification
has its own [income contract](./FORM1099R-GRAPH.md#disability-payment-source-contract).

Terminal-illness evidence follows [Notice 2024-2, section F](../corpus/authorities/n-24-02.pdf)
(SHA-256 `4f1e3dde1415ab7d2ecf404faf9750a9e0ab349be160b1cf34253d98c6d36d91`);
the [IRS bulletin](https://www.irs.gov/irb/2024-02_IRB#NOT-2024-2) also provides the text.
The review requires a licensed MD/DO, a certification by someone other than the
patient, the signed narrative and supporting records, and evidence that the
payment was otherwise permitted. For a plan offering this treatment, the
administrator must receive the certification after signing and by payment. For a
plan not offering it, the return election and retained certification are required.
Neither route accepts a certificate signed after payment. Repayments remain under
the separate required reconciliation work; this route retains the existing
no-repayment declaration.

An early-coded inherited account requires death evidence for every payment and
cannot mix beneficiary and own-account treatment. The same decedent must match
all claims and the inherited-basis review across every current statement for the
same owner, payer and account. Conflicting decedent identities/death dates or a mix of own/inherited
account reviews are rejected. SIMPLE first participation follows the
decedent's account and can precede the beneficiary's birth. Correct code 4 stays
on the ordinary death-income route without creating an unnecessary Form 5329.

Each claim exempts the matched payment's taxable amount, not its gross amount.
Multiple payments can make a statement partially exempt. Partial exemptions within
one payment need a separate allocation contract and are not accepted here.
Different exception kinds across an owner's payments derive code 99. No entered
exception code or exempt-dollar override is accepted. Public-safety separation
variants, QDRO payments to children/dependents and the other exception families
remain required work. QDRO child/dependent payments are taxable to the plan
participant, so they cannot use this alternate-payee income contract; see
[IRS Publication 504](https://www.irs.gov/publications/p504).

The 2025 Form 5329 node and 2026 source share `earlyDistributionAdditionalTax`.
Existing 2025 exception validation, Roth review and rounding behavior remain in
the 2025 owner node. The 2026 path derives its own validated regular/SIMPLE bases.
No legacy 2025 source schema or precomputed penalty is exposed as a 2026 input.

## Owner calculation and return routing

| Value | Current calculation |
| --- | --- |
| Line 1 | Each owner's combined early taxable distributions, summed in cents and rounded once for the filed line |
| Line 2 | Sum of the taxable portions of the owner's exempt payments, rounded once |
| Line 3 | Line 1 less line 2 |
| Line 4 | 25% of the remaining SIMPLE two-year portion plus 10% of the remaining regular portion, rounded once |
| Schedule 2 line 5 | Sum of the separately rounded owner Form 5329 taxes when forms are required |

The unexempt SIMPLE amount is summed in cents and rounded, then bounded by filed
line 3 so independently rounded lines 1/2 cannot create a negative regular base.
The residual filed line 3 amount receives the 10% rate.

If every current 1099-R on the return has code 1 and its full gross amount is
subject to the 10% tax, the direct Schedule 2 route rounds the combined taxable
base once, computes the tax and marks the form-not-required checkbox. Otherwise
each affected owner gets a separate Form 5329, including mixed ordinary/early
statements, partial-taxable pensions, and combined regular/SIMPLE distributions.
A claimed exception always requires an owner form, including a fully exempt
distribution with zero tax; a zero-tax Schedule 2 is omitted when otherwise unused.
The owners' income still aggregates on Form 1040; their additional tax is kept
separate through Schedule 2 line 5, its totals, Form 1040 line 23 and settlement.

Form 1062 accepts the connected section 72(t) tax as an explicit exclusion from
regular tax under [26 USC 26(b)(2)(C)](https://www.govinfo.gov/content/pkg/USCODE-2024-title26/html/USCODE-2024-title26-subtitleA-chap1-subchapA-partIV-subpartA-sec26.htm).
Its actual-return reconciliation retains that payable tax while the farmland
calculation excludes it from lines 2 and 10; see the
[Form 1062 instructions](https://www.irs.gov/instructions/i1062).

## Draft PDF

The [field inventory](../inventories/pdf-fields/pdf-fields-f5329.csv) records all
85 canonical widgets. Each attachment uses the individual owner's name and SSN,
prints Part I lines 1, 3 and 4 plus line 2 and the derived exception code when
claimed, and leaves unused parts blank. Physician certifications, medical record
references and decedent evidence remain in the retained review, not the generated
return or source attachments. The draft cover is excluded; the three official
pages remain in attachment
sequence 29, with taxpayer and spouse forms kept separate. Original source forms
are retained unchanged where federal withholding requires an attachment.

The renderer replays the source calculation and requires an exact match to the
combined Schedule 2 destination and owner identity. Generated pages are static,
without AcroForm fields or annotations, and carry development labels below the IRS
footer. These files are incomplete development drafts, not filing artifacts.

## Required remaining work

1. Remaining Part I exceptions and partial-payment allocations, with instruction-specific evidence and limits, including
   qualified long-term-care distributions, emergency expenses, domestic abuse,
   medical and education expenses, disability and public-safety separation.
   Disability pensions also require minimum-retirement-age income routing and
   earned-income consumer reconciliation; an exception alone is insufficient.
   Incorrect early coding that also conflicts with SIMPLE participation dates
   still requires source resolution; the age exception does not bypass that check.
2. IRA basis and Roth recapture via Form 8606, indirect/partial rollovers,
   disaster distributions and repayments, and governmental 457(b) rolled-in assets.
3. Parts II–XI: education/ABLE distributions, excess contributions, RMD shortfalls,
   Trump-account contributions and excess-contribution earnings, each with the
   applicable source forms, owner separation and prior-year carryovers.
4. Final TY2026 form/instruction comparison, current MeF mapping/rules and ATS
   acceptance. The older May v1 MeF package remains research material.

These remain required parity work. The connected Part I routes do not establish
complete Form 5329 or retirement filing support.

## Validation evidence

Focused tests cover payment eligibility, contradictory/missing evidence, distinct
spouses, mixed regular/SIMPLE bases, partial annual exemptions, multiple-exception
code 99, month-end age boundaries and zero-tax owner attachments. PDF checks read
the printed code and each Part I amount and require no AcroForm or annotations.
Full 2026, shared 2025 retirement and repository unit regressions are retained
alongside rendered whole-return and component review. IRS acceptance remains open.

Initial exception increment: 872 full 2026 tests, 60 focused tests (including
shared 2025 Form 5329 and Form 1062 regressions), and 137 repository unit checks
passed. Eight rendered pages across fully exempt and multiple-exception cases
were reviewed after the standalone annotation cleanup.

Life-event coverage adds death/terminal eligibility and timing, partial annual
exemptions, ordinary code-4 comparison, inherited SIMPLE participation and
owner-separated exceptions. PDF checks verify codes 04/20, zero tax and exclusion
of private medical/decedent records from the return.

The life-event increment passed 881 full 2026 tests, 74 focused tests and 137
repository unit checks. Ten rendered pages were visually reviewed; regenerated
final pages matched those reviewed images exactly, with no fields or annotations.

Disability coverage adds code-03 ordinary IRA/plan income, total and partial
annual exemptions, SIMPLE distributions, medical-proof dates and the independent
pension/wage source split. The draft test verifies leading-zero exception 03,
zero Part I tax and exclusion of retained medical evidence. The five-page
synthetic SIMPLE return was rendered and visually reviewed, with no AcroForm or
annotations. Employer disability-wage return assembly remains explicitly pending
its earned-income consumer connections.

The disability source increment passed 165 typed source/shared-node/PDF/Form 1062
checks and 137 repository unit/harness checks. Regenerated final draft pages
matched the visually reviewed five-page bundle exactly.
