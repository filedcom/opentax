# TY2025 Form 8815: source-to-return gap

## October 9 royalty-interest MAGI and actual deduction checkpoint

The [2025 Form 8815 line 9 step 6 instructions](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
require a pre-exclusion investment-interest calculation for net royalty income,
then a separate actual deduction after computing the bond exclusion. The source
worksheet now retains the directly traced royalty debt and other income before
royalty interest. It computes and reconciles the pre-exclusion deduction, sends
the exclusion to the actual Form 4952 and binds both to final Schedule E and
Form 1040. Only the actual Form 4952 is emitted in XML and the PDF packet.

This joins the existing single-owner, directly purchased portfolio royalty to
QTP/Coverdell payments, ordinary bank interest and redeemed savings bonds.
Loan/source facts must match across both computations. Whole-dollar plain owned
interest and one royalty source are required, with zero AMT adjustments; the
actual regular and AMT carryforwards agree. Additional dividend, OID, capital
sale, K-1, child-interest or foreign-income inventories remain guarded in this
combined route. The standalone royalty inventory issue is separately deferred117;
that route was not repaired here.

| Constructed return | Paid royalty interest | Pre-exclusion deduction | Bond MAGI | Bond exclusion | Actual deduction | Carryforward | Final AGI | Tax | Refund |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Wages70,000, QTP, positive royalty | 500 | 500 | 74,500 | 2,000 | 500 | 0 | 72,500 | 7,405 | 12,595 |
| Wages70,000, QTP, limited deduction | 6,000 | 5,000 | 70,000 | 2,000 | 3,000 | 3,000 | 70,000 | 6,855 | 13,145 |
| Wages100,000, QTP, phaseout | 6,000 | 5,000 | 100,000 | 1,934 | 3,066 | 2,934 | 100,000 | 13,455 | 6,545 |
| Wages100,000, mixed tuition/Coverdell/QTP, bank400+600 | 7,000 | 6,000 | 100,000 | 967 | 5,033 | 1,967 | 100,000 | 13,455 | 6,545 |

All cases have gross royalty3,000, bond interest2,000, proceeds12,000 and
withholding20,000. The last case uses6,000 net qualifying education expenses;
the others use15,000 QTP payments. Coverdell contributor MAGI remains final AGI,
not bond MAGI plus the bond exclusion. Tax-table brackets were checked separately
from execution. The temporary MAGI deduction is not copied onto Schedule E.

Four complete XMLs validate against cached TY2025 v5.4 Return1040.xsd
(SHA256 `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
All30 packet pages were observed through26 unique page images/seven contact
sheets. Source, native and PDF values reconcile for the exclusion, actual
interest, net royalty, final income/tax/refund and carryforward. One actual
Form4952 is present per packet; no dummy is attached and no Schedule A interest
is duplicated. Existing name/zero presentation68/76 and royalty-loss line22
issue116 still qualify the packets (line22 displays66 or2,033 in the loss cases).
No deferred presentation repair was made.

Related Form4952/Form8815/ScheduleE regression:245/0. Benchmark46/133 retains
the same87 failing IDs; it is not an ATS pass rate. Focused tests:5/0,
including5 public contradictions,40 native and40 prepared-PDF
mutations and7 direct inventory-guard checks. The direct checks prevent invalid
K-1 fixtures rejected by another builder from masking the inventory guard.
Evidence: `.state/research/form8815-royalty-magi-2026-10-09/`, including source,
pending, XML/PDF, schema logs, rendered pages, text/native checks, tests and
benchmark. These synthetic source references do not establish authenticity,
accepted carryforward records, full royalty/addback coverage or IRS acceptance.

## October 9 combined bond, education-account and adoption-credit checkpoint

Form 8815 no longer rejects a return merely because it includes Form 8839.
Instead it replays the existing reviewed adoption source, pre-credit sink,
Schedule 3 and final Form 1040 reconciliation. That credit-only route rejects
employer adoption benefits, so no employer-benefit exclusion is assumed or
added to bond MAGI. Its attachment-byte and foreign-source checks remain in
force. Form 8815 still verifies the complete interest inventory, its independent
MAGI worksheet and any Form 2555 addback before printing or native export.

The [2025 Form 8815 instructions](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
add back excluded employer adoption benefits, not an adoption tax credit.
[Form 8839 line 7](https://www.irs.gov/instructions/i8839) uses final AGI plus
foreign/territory exclusions; it does not restore excluded savings-bond interest.
The mixed cases therefore retain bond MAGI102,000 but adoption/Coverdell
MAGI101,167. The refundable5,000 adoption credit is never treated as income.

| Constructed return | Bond exclusion | Final AGI | Adoption MAGI | Before-credit tax | Nonrefundable used | Unused adoption credit | Refund | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Domestic wages70,000, self QTP | 2,000 | 70,000 | 70,000 | 6,855 | 6,000 | 0 | 11,145 | Packet generated |
| Domestic wages100,000, withholding7,000 | 833 | 101,167 | 101,167 | 13,708 | 6,000 | 0 | 4,292 | Native export rejects deferred93 |
| Domestic wages100,000, withholding15,000 | 833 | 101,167 | 101,167 | 13,708 | 6,000 | 0 | 12,292 | Packet generated |
| Foreign70,000/domestic30,000 | 833 | 31,167 | 101,167 | 3,388 | 3,388 | 2,612 | 12,000 | Packet generated |
| Foreign100,000/no domestic wages | 833 | 1,167 | 101,167 | 0 | 0 | 6,000 | 5,000 | Packet generated |

The last four cases include Coverdell/QTP payments plus tuition and education
benefits; the first uses QTP payments only. All adoption claims use the separate
reviewed11,000 expense and retained decree/birth/invoice/payment records. The
original7,000-withholding phaseout case remains an explicit rejected boundary:
its calculated refund4,292 coexists with stale pre-credit amount owed6,708,
and native arithmetic rejects it. The separately funded15,000-withholding case
is additional evidence, not a replacement or repair for deferred93.

The grouped Form8815/Form8839/Form2555 gate passes107/0, including the original
blocked balance case. Six altered source/route/credit/addback variants per
positive case reject24 times at native preparation and24 times at PDF building
with a valid prepared bundle. Four complete XMLs validate against TY2025v5.4;
all33 packet pages (26 unique rendered pages) and four separate synthetic source
pages were observed. Native/PDF amounts, carryforwards, attachment references
and source SHA-256 values reconcile. The benchmark remains46/133 with exactly
the same87 failing case IDs. Existing name68, zero-field76, order86/95,
balance93, rules94 and source-authenticity qualifications remain; this is not
IRS acceptance or clean presentation approval.

Private evidence: `.state/research/form8815-adoption-packets-2026-10-09/`
contains the four source/pending/PDF/XML sets, the original blocked result,
initial failed log,107-test log, benchmark comparison, schema logs, rendered
page manifest, text/native checks and four source copies. Packet lengths are
6/6/11/10 pages (funded domestic/QTP/partial credit/unused credit); these four
returns are counted once across the Form8815 and Form8839 checkpoints.

## October 9 foreign-exclusion and Coverdell MAGI checkpoint

The supported physical-presence employee Form 2555 route now reconciles to
Form 8815 instead of being categorically rejected. The addback is recomputed
from reviewed Form 2555 filing details and must equal the supplied bond MAGI
worksheet addback. Reported foreign wages and Schedule 1 line 8d must match that
calculation; aggregate-only or mixed aggregate/detail inputs still reject.
The same derived exclusion is added to final AGI for the Coverdell contributor
limit, keeping the bond-interest exclusion deducted from Coverdell MAGI.

This follows [2025 Form 8815 line 9 instructions](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
and [Publication 970 worksheets 6-1/6-2](https://www.irs.gov/publications/p970).
The [Form 1040 foreign earned income tax worksheet](https://www.irs.gov/instructions/i1040gi)
uses the Tax Table below 100,000 and Tax Computation Worksheet above it.
Independent single-case tax is 13,708 minus 10,320 = 3,388; joint-case tax is
18,412 minus 11,828 = 6,584. The housing case adds 9,200 housing exclusion to
130,000 earned-income exclusion, exactly once.

| Constructed return | Foreign / domestic wages | Foreign addback | Bond MAGI | Bond exclusion | Final AGI | Tax | Refund | Pages |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Single foreign wages | 100,000 / 0 | 100,000 | 102,000 | 833 | 1,167 | 0 | 0 | 9 |
| Single mixed wages | 70,000 / 30,000 | 70,000 | 102,000 | 833 | 31,167 | 3,388 | 3,612 | 9 |
| Joint mixed wages | 100,000 / 60,000 | 100,000 | 162,000 | 575 | 61,425 | 6,584 | 416 | 10 |
| Joint housing exclusion | 140,000 / 20,000 | 139,200 | 162,000 | 575 | 22,225 | 0 | 7,000 | 10 |

All include mixed tuition, Coverdell and QTP contributions. The single cases'
Coverdell MAGI is 101,167 despite much lower final AGI, giving a 1,178 contributor
limit: 1,000 passes but another 500 by the same filer rejects. The joint cases
retain the fourth institution on a continuation. The foreign-only case has no
W-2 or withholding; the others retain 7,000 withholding.

The typed grouped source/node/rule/Form2555-XSD gate passes **53/0**, including
four complete-return tests with 26 native and 26 fresh-PDF
rejections for removed/mixed/altered foreign sources, filed wages/exclusion,
wrong addbacks and excess Coverdell contributions. All four full returns pass
2025v5.4 XSD. All 38 flattened pages were visually reviewed through 26 distinct
page images/seven contact sheets; additional text/native assertions reconcile
foreign wages, exclusions, signed Schedule 1 totals, bond MAGI, tax and refunds.
Existing joint-name 68 and zero/skipped-line 76 presentation qualifications
remain. These are synthetic reviewed facts, not authenticated employer or
custodial evidence, and no IRS acceptance is claimed.

Evidence: `.state/research/form8815-foreign-magi-2026-10-09/` retains source,
pending, expected values, XML/PDF, XSD logs, page hashes and text/native review.
The XSD digest remains `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The benchmark remains 46/133 with the same 87 failing IDs (deferred96).
Positive housing deductions, Form 4563, employer adoption benefits, Puerto Rico
income, royalty/investment-interest special computations and broader authenticity
remain open; their existing guards are preserved. No future item was implemented.

## October 9 Coverdell and QTP contribution source-to-return checkpoint

Reviewed actual-2025 cash contributions to Coverdell education savings accounts
and qualified tuition programs now join the existing Form 8815 route. Account
records identify kind, beneficiary TIN, retained account reference and
qualification-record reference. Dated payment records identify the contributor,
receipt, transaction, amount and line 1 account. Distinct transaction/account
references, complete account-payment matching and the sum of contributions plus
separately listed tuition reconcile to line 2. The former tuition-only facts
remain a separate strict choice; they cannot accompany contribution accounts.
Returns still require the bond, benefit, MAGI and finalized Schedule B/1040
reconciliations.

The [2025 Form 8815 instructions](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
include both contribution types in qualified expenses and require their account
labels on line 1. Native institution names now carry the precise local-v5.4
attributes `qualifiedTuitionProgramCd="QSTP"` or
`coverdellEducationalSavAcctCd="COVERDELL ESA"`; the paper form and continuation
print `QTP` or `Coverdell ESA` beside the institution name. Account qualification
is not inferred from an institution name or mailing address.

Beneficiary TIN/name must match the taxpayer, joint spouse or an actually filed
dependent; payment TIN must match a filer. Coverdell annual inventories reconcile
all accounts and outside contributions to the beneficiary's 2,000 ceiling.
Birth dates match the filed person; payments at age 18 or older require a
special-needs review reference. The contributor limit follows [Publication 970
worksheets 6-1 and 6-2](https://www.irs.gov/pub/irs-prior/p970--2025.pdf), using
final AGI after the bond exclusion in these domestic cases. The later foreign
checkpoint above adds back the reconciled Form 2555 exclusion when applicable. In the single mixed case, final AGI 101,167 gives a 1,178 limit:
1,000 contributed by the filer passes, while a further 500 by that filer rejects.
This differs from the Form 8815 MAGI 102,000 used for the bond-interest phaseout.

| Constructed return | Coverdell / QTP / tuition | Benefits | Exclusion | AGI | Total tax | Refund / owed | Pages |
|---|---:|---:|---:|---:|---:|---|---:|
| Self QTP | 0 / 15,000 / 0 | 0 | 2,000 | 70,000 | 6,855 | 145 refund | 4 |
| Dependent Coverdell | 2,000 / 0 / 0 | 0 | 334 | 71,666 | 6,718 | 282 refund | 6 |
| Joint spouse/self QTP | 0 / 4,000 / 4,000 | 2,000 | 575 | 161,425 | 18,412 | 11,412 owed | 4 |
| Single mixed | 1,000 / 5,000 / 2,000 | 2,000 | 833 | 101,167 | 13,708 | 6,708 owed | 4 |
| Joint mixed continuation | 2,000 / 2,000 / 4,000 | 2,000 | 575 | 161,425 | 18,412 | 11,412 owed | 5 |
| Twelve QTP accounts | 0 / 15,000 / 0 | 0 | 2,000 | 70,000 | 6,855 | 145 refund | 6 |

All retain 12,000 bond proceeds, 2,000 current interest and 7,000 withholding.
The 17-year-old dependent receives a 2,000 Coverdell contribution; the rounded
expense ratio .167 gives 334 excluded interest. The 55,900–55,950 single tax-table
band gives 7,218 before the 500 other-dependent credit, and Schedule 8812/1040
reconcile 6,718 tax. Adult Coverdell cases explicitly supply synthetic special-
needs references; that status is not inferred from age or another disability
checkbox. The joint case splits 2,000 across two Coverdell accounts. The twelve-
account QTP case exercises two continuation pages.

The final typed source/node/rule/end-to-end group passes **35/0**. **79 native
and 79 fresh-PDF mutations reject**, covering missing/conflicting facts, payment
amounts/duplicates, account matching, invalid dates, payer/beneficiary identity,
qualification references, birth dates, annual totals and the final-AGI limit.
The initial dependent fixture incorrectly parsed a Schedule 8812 item using its
container schema, dropping the filing status; correcting that fixture import
resolved the failure without changing Schedule 8812 production code. The initial
failure and focused diagnosis remain retained.

All six full returns pass 2025v5.4 XSD; all 29 flattened PDF pages were visually
reviewed through 23 distinct page images/six contact sheets. Every account name,
label and address survives paper output, and native attributes/addresses match
source rows. Final PDF hashes still match the reviewed artifacts. Existing
presentation 68 joint canonical headers, 76 zero/skipped lines and 86 the dependent
packet's Schedule 8812-before-Schedule B order remain qualified. No presentation
fix outside the current contribution work is included.

Evidence: `.state/research/form8815-contribution-packets-2026-10-09/` retains
source/pending/filer/origin JSON, XML/PDF, XSD logs, reviewed-page/native-text
manifests, test output, initial fixture failure and runtime/command details.
The full-return XSD SHA-256 remains
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The benchmark remains 46/133 with the identical 87 failing case IDs (deferred 96).
These are constructed reviewed facts, not authenticated custodial statements,
school/beneficiary records or IRS acceptance. Prior-excess, rollover/transfer
and returned-contribution assertions remain guarded; special royalty/addback
and broader authenticity routes remain open. Newly discovered late-designated
Coverdell payment timing is future 114 only and was not implemented. This does
not close the Form 8815 parent or the filing-ready goal.

## October 9 foreign-institution source, native and paper addresses

The tuition/fees route now accepts the two address choices allowed by the
TY2025 `IRS8815.xsd`: a U.S. address or `EligibleInstitutionFrgnAddress`.
Both alternatives are strict, so mixed U.S./foreign fields cannot be silently
stripped into a different address. Foreign street, city, province and postal
fields follow the cached `ForeignAddressType` lengths and character rules;
city, province and postal code remain optional. Country codes use the existing
TY2025 IRS code inventory (Germany is `GM`, not ISO `DE`). The paper form and
its continuation use one address formatter and the existing IRS country-name
lookup, preserving country names rather than printing unfamiliar codes.

The [2025 Form 8815 instructions](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
require institution names and addresses and continued qualification for the
education expenses. A foreign address does not itself establish that a school
is eligible. The existing reviewed qualification, tuition/benefit, bond,
recipient, MAGI and final-return guards remain in force. These synthetic cases
supply those facts; they are not independent school, beneficiary, tuition or
issuer authentication. Coverdell/QTP contributions and special royalty/addback
routes remain unsupported.

Four constructed full returns reuse the financial inputs and independently
checked expected taxes in the institution-list checkpoint below. Each includes
Canada, Germany and a U.S. ZIP+4 address; longer lists add the United Kingdom,
a second address line and a foreign address with only street and country.
The twelve-entry layout also retains the 75-character institution name and
crosses onto a second continuation page. The joint case alternates taxpayer
and spouse attendance. Exclusions remain 2,000 / 833 / 2,000 / 575 for
three / four-phaseout / twelve / joint-four; final taxes remain
6,855 / 13,708 / 6,855 / 18,412. Withholding is 7,000 in each case.

**Completed checks:** 29 grouped tests pass with normal type checking.
Forty-eight malformed address inputs reject in the source schema, native
preparation and fresh PDF construction, including incorrect country codes,
U.S./foreign mixtures, missing street and invalid text/lengths. These are
address-schema rejection checks, not authentication of an otherwise valid
address. All four full returns pass local 2025v5.4 XSD. All 20 flattened pages
were visually inspected through 16 distinct rendered pages/four contact
sheets; duplicate images are covered by SHA-256. Every native address field
matches its source, and every supplied address/institution is retained in
extracted paper text (ignoring wrapping whitespace for the long name).
Names, phaseout ratios, exclusion, taxable interest, final tax, refund/owed,
continuation numbering and page boundaries were checked. Existing deferred
68 joint official-form headers and 76 zero/skipped-line presentation remain
qualified; the continuation itself includes both joint names. No new future
TODO was discovered or implemented in this checkpoint.

Evidence: `.state/research/form8815-foreign-packets-2026-10-09/` contains inputs,
pending data, origins, XML/PDF, XSD logs, visual and native/text review manifests,
runtime/command details and grouped-test output. The full-return XSD SHA-256 is
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The benchmark remains **46/133 with the identical 87 failing case IDs** from
the preceding checkpoint; those failures remain deferred item 96. This closes
the address representation gap, not the Form 8815 parent or IRS acceptance.

## October 9 complete institution lists and paper continuation

The domestic tuition/fees source now retains every line 1 person/institution
entry. The [2025 Form 8815](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
requires all institutions attended by a listed person and permits an attached
statement when the form has insufficient space. The local IRS8815 v5.4 schema
allows unbounded `EligibleEducationInstnGrp` rows. The former three-entry input
limit is removed; the existing native builder emits all entries in order, the
first three print on the official form, and later entries print on numbered
continuation pages after it. A long institution name wraps without losing text,
and each person/institution/address group remains together. The new statement
requires filer identity and replays the existing final-return MAGI/exclusion
checks; a joint statement also includes the spouse name.

Four constructed public returns cover three entries with no continuation,
four with a single-filer phaseout, twelve with two continuation pages, and four
alternating taxpayer/spouse entries with the joint phaseout. Repeated person
names identify attendance at distinct institutions, not additional dependents.
The twelve-entry case is a synthetic layout stress case, including one 75-letter
institution name, second address lines and ZIP+4. No actual school qualification
or tuition authentication is inferred from these synthetic entries.

| Case | Gross tuition / benefits | MAGI | Exclusion | AGI | Taxable income | Total tax | Refund / owed | Packet pages |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| Three entries | 15,000 / 0 | 72,000 | 2,000 | 70,000 | 54,250 | 6,855 | 145 refund | 4 |
| Four, single phaseout | 8,000 / 2,000 | 102,000 | 833 | 101,167 | 85,417 | 13,708 | 6,708 owed | 5 |
| Twelve entries | 15,000 / 0 | 72,000 | 2,000 | 70,000 | 54,250 | 6,855 | 145 refund | 6 |
| Four, joint phaseout | 8,000 / 2,000 | 162,000 | 575 | 161,425 | 129,925 | 18,412 | 11,412 owed | 5 |

All cases retain 12,000 proceeds, 2,000 current bond interest and 7,000
withholding. Partial exclusions use net tuition 6,000 / proceeds 12,000 = .500,
tentative interest 1,000, and phaseout fractions .167 single or .425 joint.
Single tax uses the published 54,250–54,300 and 85,400–85,450 tax-table bands.
Joint tax uses [the IRS 2025 rate schedule](https://www.irs.gov/irb/2024-45_IRB):
11,157 + 22% × (129,925 − 96,950), rounded to 18,412. The initial joint test
mistyped the threshold as 96,750; its failure was an expected-value error,
corrected against the IRS source before the passing run.

The grouped source/node/rule/end-to-end gate passes **25/0** with normal type
checking. The final continuation-header replay passes **4/0**. Sixteen altered
amount/MAGI/empty-inventory/invalid-last-institution cases reject at both native
and fresh-PDF preparation, and three continuation calls reject missing filer
identity. These checks do not establish issuer or beneficiary authentication.
All four full returns pass local 2025v5.4 XSD; all 20 flattened PDF pages were
reviewed, including four continuation pages. Seventeen distinct rendered pages
cover duplicates by image SHA-256; each institution name and street address is
also present in extracted PDF text. The joint official Form 8815 and Schedule B
still show only the primary name (existing deferred item 68); the new joint
continuation identifies both filers. Existing zero/skipped-line presentation
qualifications remain deferred. No broader presentation fix is claimed.

Evidence is retained under
`.state/research/form8815-institution-packets-2026-10-09/`: source/pending/origin
JSON, native XML, PDF, XSD logs, visual/native-text manifests and test logs.
The full-return XSD SHA-256 is
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
The benchmark remains 46/133, with exactly the same 87 failing case IDs as the
preceding fishing-expense commit. Stale node research documentation is newly
recorded as future item 113 and was not changed. Coverdell/QTP, foreign schools,
special royalties/addbacks, source authentication and IRS acceptance remain
open; completing this continuation does not close the Form 8815 parent.

## October8 current registered-audit reconciliation

The [current bundled audit](../../../../readiness/ty2025-bundled-form-audit-reconciliation-2026-10-08.md) reconciles this form's current scope with actual native/PDF imports and retained terminal evidence. The completed October8 full run records **21 passed/0 failed/0 ignored across4 named modules**; all9 matching runtime paths still equal that tested snapshot. This is selected retained full-run evidence, not a new focused run, full-route support or fresh visual approval. Earlier dated authored/unrun statements below are historical; existing broader source, artifact and IRS requirements remain open. No original checkbox or future task is completed by this correction.


Status: a bounded TY2025 Series EE exclusion route has current-source local
XSD and filled-PDF evidence. The old calculation and MeF tags described below
were the starting point and have been replaced. Wider source, IRS business-rule,
and ATS acceptance remain open.

## Current selected evidence (2026-10-04)

The checked-in `single-form8815-series-ee-bond-exclusion` fixture generated a
four-page Form 1040, Schedule B, and Form 8815 packet. Each page was visually
checked against source and native XML: $2,000 bond interest is excluded in full
against $15,000 qualified expenses and $12,000 proceeds, leaving $70,000
Form 1040 wages/AGI. The selected-scope checker passed exact source replay,
PDF/XML hashes, page origins, and local TY2025v5.4 XSD. The packet location
and manifest digest are in the
[validation batch](../../../../testing/ty2025-form1040-validation-batch.md). Issued bond/tuition
records, other phaseout and ownership cases, IRS rules, and ATS remain open.

## Evidence and current behavior

- The [2025 IRS Form 8815](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
  places gross qualified higher education expenses on line 2, nontaxable
  educational benefits on line 3, their difference on line 4, bond proceeds on
  line 5, current-year eligible interest on line 6, modified AGI on line 9, the
  phaseout threshold on line 10, and the final Schedule B exclusion on line 14.
  The form's instructions require the education beneficiary and institution on
  line 1 and explain the source records for qualifying bonds, expenses, and
  prior-year interest reporting.
- The [2025 IRS phaseout guidance](https://www.irs.gov/irb/2024-45_IRB)
  specifies $99,500 to $114,500 for single, head of household, and qualifying
  surviving spouse; $149,250 to $179,250 for married filing jointly. Married
  filing separately cannot claim the exclusion. The checked-in
  `nodes/config/2025.ts` instead has $96,800 to $111,800 and $145,200 to
  $175,200. The node also puts qualifying surviving spouse in the joint band.
- `nodes/intermediate/forms/form8815/index.ts` treats `qualified_expenses` as
  already reduced by tax-free assistance, so the gross line 2 and benefit line 3
  cannot be reconstructed. It substitutes interest for missing proceeds and zero
  for missing modified AGI. Either substitution can overstate line 14. Missing
  filing status enters the single band. The `modified_agi` comment labels it
  line 11, though the 2025 form places MAGI on line 9.
- `2025/mef/forms/f8815.ts` emits `SavingsBondInterestAmt`, `TotalProceedsAmt`,
  `QualifiedExpensesAmt`, and `ModifiedAGIAmt`; none is a child of `IRS8815` in
  the checked-in TY2025 v5.4 `IRS8815.xsd`. When any number is present it
  produces an invalid form document, and it does not emit the calculated
  line 14. The existing unit cases assert the old phaseout thresholds; they do
  not establish correct 2025 results.

## Native XML fields needed for a bounded rebuild

The checked-in `IRS8815.xsd` sequence includes the following. Line 4 is required
by the XSD, while the other listed amount elements are optional. A filing
implementation should emit the supported form lines and reconcile line 14 with
Schedule B line 3, not use the optional flags to hide missing source facts.

| Form line | Native TY2025 v5.4 element                                                                        |
| --------- | ------------------------------------------------------------------------------------------------- |
| 1         | `EligibleEducationInstnGrp` with `EligiblePersonNm`, and institution name/address when applicable |
| 2         | `ExclBondIntTotQlfyEducExpnsAmt`                                                                  |
| 3         | `ExclBondIntTotNonTxEducBnftAmt`                                                                  |
| 4         | `ExclBondIntTxblEducBenefitAmt`                                                                   |
| 5         | `ExclBondTotPYBondProcAmt`                                                                        |
| 6         | `ExclBondIntTotPYBondIntAmt`                                                                      |
| 7         | `ExclBondIntTxblExpnsBondProcRt`                                                                  |
| 8         | `ExclBondIntTentativeBondIntAmt`                                                                  |
| 9         | `ExclBondIntModifiedAGIAmt`                                                                       |
| 10        | `ExclBondIntFilingStatusLmtAmt`                                                                   |
| 11        | `ExclBondIntExcessAGIAmt`                                                                         |
| 12        | `ExclBondIntExcessAGIRt`                                                                          |
| 13        | `ExclBondIntOffsetAmt`                                                                            |
| 14        | `ExcludableSavingsBondIntAmt`                                                                     |

## Rebuild boundary

The source model needs distinct, reviewed gross expense and nontaxable-benefit
amounts; the person/institution details; confirmed qualifying bond issue,
ownership, and age facts; proceeds and eligible current-year interest with the
prior-year interest worksheet where needed; explicit filing status; and MAGI
derived from the Form 8815 line 9 worksheet. The node should calculate and
preserve the filed line values, including the 2025 phaseout, and send exactly
the same line 14 amount to Schedule B. The MeF builder should serialize those
computed values in native XSD order. Its PDF descriptor also needs the same
line-level mapping and a filled visual check.

The bounded path now requires reviewed Series EE/I ownership, issue-year, age,
and redemption-record facts; domestic tuition/fees person/institution entries;
distinct gross expenses and nontaxable benefits; bond principal and previously
reported interest for line 6; and the completed line 9 worksheet components. It
computes lines 2-14, emits line 14 to Schedule B, and uses the v5.4 native MeF
names and the inspected 2025 PDF field names. Missing facts or ineligible claims
raise diagnostics rather than assuming zero proceeds or MAGI. The legacy
ambiguous input fields are rejected, without a compatibility shim.

Still unsupported: the special royalty-interest computation and
any case where the complete line 9 worksheet cannot be supplied from finalized
return lines. These are explicit bounds, not whole-form completion. The two
generated MAGI business-rule implications have been corrected to the official
2025 filing-status ceilings, with focused cases written but unrun. Full
cross-return MAGI reconciliation remains for the later validation pass.

Focused cases written for the agreed single batch: each 2025 phaseout boundary
for single, HOH, QSS, and MFJ; MFS ineligibility; gross expenses and nontaxable
benefits producing line 4; line 4 below/equal/above bond proceeds; prior-year
interest adjustment; missing source facts causing a diagnostic; native XSD
serialization; Schedule B line 3 equality; and filled PDF line and
beneficiary/institution checks. No such pass is recorded here.

The PDF instance path now also checks the final filer's status and Schedule B
line 2 interest and line 3 exclusion against its Form 8815 source and printed
line 14, matching the native MeF gate. Positive and mismatch cases are authored
but unrun.

### Final-return MAGI reconciliation slice

Native MeF and PDF now replay the line 9 worksheet against finalized Schedule B
lines 2-4, Form 1040 taxable interest, total income, adjustments, and AGI.
The bounded route also requires one reviewed 1099-INT source with box 3 equal
to the form's current-year line 6 bond interest, and no unrelated taxable
interest or payer adjustment on that source.
The worksheet's other income must equal Form 1040 total income less taxable
interest; its Schedule 1 adjustment amount must equal the filed adjustment
total less line 21 student-loan interest, which is omitted by the Form 8815
worksheet. The gross-to-taxable interest difference must equal the calculated
line 14 exclusion. Positive foreign/adoption/Puerto Rico addbacks and filed
Form 2555/4563/8839 are rejected until their underlying sources can be
reconciled. A W-2 and 1099-INT full-return fixture plus native/PDF tamper
cases are authored but unrun pending the agreed bulk validation. Bond and
tuition document authentication beyond retained references, multiple interest
payers, any Form 8815 line 9 special royalty
computation, and the remaining bounded routes are still open.

## Multiple interest payer source reconciliation (2026-10-06)

The public Form8815 source may now declare distinct `bond_interest_source_references` identifying the eligible redeemed-bond1099-INT copies. Each reference must match exactly one current source; selected copies must have positive Box3 and no Box1. Their combined current interest must equal the independent line6 proceeds/face-value/prior-interest worksheet. All current1099-INT rows on this route require reviewed source references and taxpayer/spouse recipient identity; unselected bank or noneligible Treasury interest stays in ScheduleB line2 and Form1040 taxable interest. The complete source total must reconcile the finalized line9 MAGI worksheet. Missing/duplicate/unmatched references, conflicting owners/amounts and unsupported premium/nominee/accrual/OID adjustments remain rejected. The original one-copy path remains supported.

Two constructed complete public packets (single/MFJ) retain four distinct interest sources: eligible EE1200/I800, bank300 and noneligible Treasury500. Net education expenses6000/proceeds12000 gives tentative1000, MAGI102800/162800 and2025 exclusions780/548. Form1040 taxable interest2020/2252 andAGI102020/162252 reconcile to nativeXML/fullv5.4XSD and four-page packets. Main standard source/node/validation/existing-route gate21/0(8s), `/tmp/opentax-form8815-multiple-main-source-v2-oct6.log`; all eight pages rendered and visually reviewed with readable names, status, source rows, decimal ratios, amounts and order. Evidence `.state/research/form8815-multiple-interest-oct6/{single,joint}` retains original inputs/pending/native/PDF/origins/manifests; these are constructed source scenarios, not independently authenticated issuer or tuition records.

The actual October4 original rawsource still produces its exact four-pagePDF, `/tmp/opentax-form8815-held-original-main-v2-oct6.log` and matching manifest. Its sole prior-production pending difference is the added Form8995 `investment_interest_sources` array, checked exactly against the original1099-INT input; this is explicitly qualified rather than claiming whole-pending byte equality. Original bytes remain unchanged and replay uses a copied private template cache. Broader interest adjustments, royalty/addbacks, tuition/redemption authenticity, qualified institution/beneficiary evidence and IRS filing/acceptance gates remain open. Primary form line5 includes all qualifying redeemed bonds, line6 its interest, and line9 includes complete interest before exclusion: [2025 IRS Form8815](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf).
