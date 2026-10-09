# TY2025 Form 4952 portfolio royalty boundary

## October 9 partnership income and expense combinations

Shared source reconciliation now admits separate income-only and expense-only
K-1 copies, including box5 interest and box6a/6b dividends, across partnership-only
and mixed 1099 investment portfolios. Native and PDF selection also admits a
partnership dividend portfolio without partnership interest. Each component,
source reference and owner must reconcile before Schedule A and Form1040 export.
Qualified dividends remain excluded from the investment-interest limit without
a line4g election, while retaining their preferential treatment in final tax.

The [2025 partner instructions](https://www.irs.gov/pub/irs-prior/i1065sk1--2025.pdf)
and [Form4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
provide the box5/6a/6b/codeH destinations. These constructed cases use separate
identified copies, explicit investment classifications, no codeB expense or
line4g election, and synthetic retained mortgage evidence of40,000.

| Portfolio | Gross / qualified investment income | Code H expense | Deduction / carry | AGI | Itemized | Tax / refund |
|---|---:|---:|---:|---:|---:|---:|
| K-1 interest only | 2,000 / 0 | 3,000 | 2,000 / 1,000 | 162,000 | 42,000 | 21,647 / 8,353 |
| K-1 dividends only | 3,000 / 1,000 | 3,000 | 2,000 / 1,000 | 163,000 | 42,000 | 21,797 / 8,203 |
| Mixed K-1 income copies | 4,000 / 1,000 | 3,500 | 3,000 / 500 | 164,000 | 43,000 | 21,797 / 8,203 |
| K-1 plus bank/Treasury/OID | 5,000 / 1,000 | 4,500 | 4,000 / 500 | 165,000 | 44,000 | 21,797 / 8,203 |
| K-1 plus all 1099 payers | 6,200 / 1,400 | 5,500 | 4,800 / 700 | 166,200 | 44,800 | 21,857 / 8,143 |
| Joint K-1 plus all 1099 payers | 6,200 / 1,400 | 5,500 | 4,800 / 700 | 206,200 | 44,800 | 25,238 / 4,762 |

Independent source arithmetic, XML amounts and PDF text reconcile gross income,
qualified dividends, deduction/carry, itemization, tax and refund. Six complete
returns pass cached TY2025v5.4 XSD validation. All30 packet pages were observed
through28 unique renders/seven contact sheets. Six mortgage-source pages share
the same pixel digest as the previously observed synthetic source page.
Existing joint-name68 and skipped-zero76 qualifications remain.

Focused tests pass6/0, including18 public,48 native and48 prepared-PDF rejections
for changed source amounts, owners, classifications, duplicate references and
final return amounts. Related Form4952 regression passes119/0. Calculation nodes
are unchanged; the preceding joint-royalty benchmark46/133 is retained rather
than claimed as a fresh run. No new future item was found; unflagged-dividend
inventory118 stays deferred. Broader K-1 sources, codeB, elections, carryover
imports, authenticity and IRS acceptance remain open, so the parent is not closed.

Private evidence: `.state/research/form4952-k1-income-2026-10-09/` retains
source/pending records, XML/PDF, synthetic copies, manifests, independent
arithmetic and execution logs. XSD digest:
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.


## October 9 partnership expenses with mixed investment payers

The code-H/dividend reconciliation now combines ordinary bank and Treasury
interest with taxable OID and ordinary/qualified dividends. Each retained
interest amount is matched separately, and qualified dividends stay on line4b,
not in the deductible-interest limit. Two or more identified partnership code-H
expenses can share that limit. Native and PDF preparation check that the mixed
1099 recipients belong to the filed taxpayer/joint spouse and that all K-1 and
1099 copy references are present and distinct. The same shared reconciliation
checks Schedule A line9 and Form1040 interest, dividends and itemization.

The [2025 Form4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include partnership investment interest on line1, gross investment income on
line4a and qualified dividends on line4b. The constructed cases use no line4g
election, codeB expense, foreign source/tax, debt allocation or prior import.
Every case combines two K-1 expenses, bank and Treasury interest, one taxable
OID and two dividend sources. Joint cases distribute these sources between
spouses. Each mortgage Copy B is synthetic, byte-bound source evidence for
40,000 of reviewed interest, not an authenticated lender record.

| Return | Gross / qualified investment income | Code H expense | Deduction / carry | AGI | Itemized | Tax / refund |
|---|---:|---:|---:|---:|---:|---:|
| Single limited | 2,200 / 400 | 2,000 | 1,800 / 200 | 162,200 | 41,800 | 21,707 / 8,293 |
| Single fully allowed | 2,200 / 400 | 700 | 700 / 0 | 162,200 | 40,700 | 21,971 / 8,029 |
| Joint spouse sources | 2,200 / 400 | 2,000 | 1,800 / 200 | 202,200 | 41,800 | 25,088 / 4,912 |
| Single all dividends qualified | 2,200 / 1,200 | 2,000 | 1,000 / 1,000 | 162,200 | 41,000 | 21,827 / 8,173 |
| Single larger portfolio | 3,500 / 500 | 4,000 | 3,000 / 1,000 | 163,500 | 43,000 | 21,722 / 8,278 |
| Joint larger portfolio | 3,500 / 500 | 4,000 | 3,000 / 1,000 | 203,500 | 43,000 | 25,103 / 4,897 |

Independent arithmetic uses the source income, actual deduction and 2025
ordinary/qualified-dividend rates. Regular and AMT carries agree. Six complete
returns pass the cached TY2025v5.4 XSD; all26 packet pages were observed through
22 unique renders/six contact sheets. Six mortgage-source pages share one
observed pixel-identical render with canonical amount40,000. Existing joint
name68 and skipped-zero76 qualifications remain; no deferred presentation fix
was made. Related Form4952 source/node/native/PDF regression:113/0.
Focused6/0 includes18 public,60 native and60 prepared-PDF rejections
for changed amounts, owners, source flags, foreign interest and duplicate copies.

A separate public probe clearing both dividend investment flags routes through
the existing K-1/interest branch, omitting net dividends800 from the deduction
limit while accepting native preparation. It produces deduction1,000/tax21,899
versus1,800/21,707 for the same investment sources. This is new deferred118;
the older dispatcher/inventory path is not repaired and the broader Form4952
parent stays open. Positive evidence applies to the explicitly affirmed sources.
The source-authentication, broader K-1, election, carryover and IRS-acceptance
gates also remain open. Calculation nodes are unchanged; the latest benchmark
is the preceding commit's46/133, not a fresh run for this reconciliation edit.

Private evidence: `.state/research/form4952-k1-portfolio-2026-10-09/` retains
source/pending, native XML, flattened packets, synthetic mortgage copies,
independent arithmetic, render manifests, mutation tests and the boundary probe.
The XSD digest remains
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.


## October 9 joint royalty ownership and spouse investment sources

A traced royalty purchase can now belong to either spouse on a joint return.
The declared taxpayer/spouse role, debt owner, Form1099-MISC recipient,
Schedule E property and final filed identities must agree. Reviewed plain
interest from both spouses contributes to the joint investment-income limit.
The joint route rejects unaccounted-for dividend, gain, K-1 and other investment
sources; deferred117's existing single-filer inventory defect is not repaired.

Six constructed complete returns cover either royalty owner, interest split
400/600 between spouses, a bond owned by the other spouse, spouse QTP payments,
full/partial bond exclusions and primary-owned foreign employee income.
The [Form8815 worksheet](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
uses the joint149,250 threshold/30,000 phaseout width and the temporary
pre-exclusion royalty deduction; only the actual deduction is filed under
[Form4952 line8](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf).

| Case | Paid interest | Bond MAGI / exclusion | Actual deduction / carry | AGI | Tax | Refund |
|---|---:|---:|---:|---:|---:|---:|
| Primary royalty, no bond | 500 | — | 500 / 0 | 143,500 | 14,468 | 5,532 |
| Spouse royalty, no bond | 6,000 | — | 4,000 / 2,000 | 140,000 | 13,698 | 6,302 |
| Primary royalty, full exclusion | 7,000 | 140,000 / 2,000 | 4,000 / 3,000 | 140,000 | 13,698 | 6,302 |
| Spouse royalty, phaseout | 7,000 | 160,000 / 1,284 | 4,716 / 2,284 | 160,000 | 18,098 | 1,902 |
| Primary positive royalty | 500 | 165,500 / 916 | 500 / 0 | 164,584 | 19,106 | 894 |
| Spouse royalty, primary foreign wages | 7,000 | 160,000 / 1,284 | 4,716 / 2,284 | 60,000 | 6,270 | 13,730 |

Independent arithmetic reconciles these amounts, including foreign tax stacking
18,098 minus11,828 =6,270. Each packet contains one actual Form4952 and no
Schedule A interest duplication; regular and AMT carry amounts agree.
Six complete returns pass cached TY2025v5.4 XSD validation. All47 flattened
packet pages were observed through32 distinct renders/eight contact sheets.
PDF text, native amounts and source ownership agree within existing name68,
zero76 and royalty-loss line22 issue116 qualifications. No deferred repair
or source-authentication/IRS-acceptance claim is made.

Related Form4952/Form8815/Form2555/Schedule E regression:277/0.
Focused tests:6/0, including18 public,60 native and60 prepared-PDF rejections,
plus12 direct final-identity rejections. Fresh benchmark:46/133, exactly the
same87 failing case IDs as the prior checkpoint (deferred96). Private evidence:
`.state/research/form4952-joint-royalty-2026-10-09/`, with source/pending,
XML/PDF, manifests, independent arithmetic, render reviews and execution logs.
The XSD digest remains
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
Mixed-use debt, other filing statuses, elections, prior carryover authentication,
other investment-source combinations and the wider parent task remain open.


## October 9 foreign employee income with bond/royalty limits

The paired Form8815 route now reconciles reviewed Form2555 employee and housing
exclusions alongside Schedule E royalty deductions. Foreign exclusions reduce
Schedule1 income and are restored for bond MAGI; the actual Form4952 continues
to use post-bond-exclusion investment income. Four additional XSD-valid returns
and44 observed pages verify positive/zero final income, foreign tax stacking,
housing and regular/AMT carryforwards. Twelve public and31 native/31 PDF
contradictions reject. See the [combined checkpoint](../../../income/investments/form8815/ty2025-form8815-gap.md#october-9-foreign-exclusions-with-royalty-interest-refiguring).
Standalone royalty/foreign combinations without the paired bond worksheet
remain guarded; deferred inventory117 and presentation116 are untouched.

## October 9 bond exclusion and royalty-interest refiguring

The existing directly traced royalty route now joins Form8815's special MAGI
calculation. All eligible bond interest is included in the temporary MAGI
computation; only the actual Form4952 subtracts the computed bond exclusion
from investment income. Schedule E receives the actual allowed interest, and
both regular/AMT carryforwards use that final deduction. The two retained debt
traces, complete interest sources, final royalty income and return totals must
agree before native or PDF export. Four complete XSD-valid returns/30 observed
pages cover positive/zero/loss royalty income, full/partial exclusion and mixed
bank interest; see the [paired checkpoint](../../../income/investments/form8815/ty2025-form8815-gap.md#october-9-royalty-interest-magi-and-actual-deduction-checkpoint).
Deferred116 still qualifies royalty-loss PDF line22; standalone inventory117
remains unrepaired. The combined route explicitly rejects additional unsupported
investment-income sources and does not claim the wider parent gap is closed.

## October 9 directly traced royalty debt and Schedule E deduction

A directly purchased nonbusiness portfolio royalty now has a dedicated debt
source. It records the loan, owner, direct purchase, asset, dated interest
payments and lender total, with affirmative personal liability, no loss
protection and review of other current royalty deductions. One issued-form
reference joins the source to its Form1099-MISC box2 record. Plain owned
Form1099-INT sources are compared individually, including multiple payers.
These synthetic references establish internal reconciliation, not authenticity.

The [2025 Form4952 line8 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
send royalty-attributable deductible interest to Schedule E. The executor now
creates that one sourced royalty property after computing the investment-income
limit. Its allowed interest appears only on Schedule E line13, reduces
Schedule1/Form1040 income and never duplicates into Schedule A line9. Both
native and PDF export replay the loan, source inventory, numbered Form4952
lines, exact Schedule E property and final income join. Other expenses, manual
investment amounts, mixed debt uses, prior carryforward imports, elections,
AMT adjustments and non-single filers were guarded at this checkpoint; the joint-owner checkpoint above now adds MFJ. The subsequent paired
checkpoint above adds the Form8815 special computation. Whole-dollar current-year royalty and investment-income amounts are
required in this route.

| Constructed return | Paid interest | Portfolio interest | Gross royalty | Allowed on Schedule E | Net royalty | Carryforward | AGI | Tax | Refund |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Positive royalty | 500 | 1,000 | 3,000 | 500 | 2,500 | 0 | 78,500 | 8,725 | 2,275 |
| Royalty loss | 3,500 | 1,000 | 3,000 | 3,500 | -500 | 0 | 75,500 | 8,065 | 2,935 |
| Two interest payers, limited debt | 5,000 | 400 + 600 | 3,000 | 4,000 | -1,000 | 1,000 | 75,000 | 7,955 | 3,045 |
| Royalty only, limited debt | 5,000 | 0 | 3,000 | 3,000 | 0 | 2,000 | 75,000 | 7,955 | 3,045 |

All use wages75,000, withholding11,000 and standard deduction15,750. The tax
expectations use the applicable single-filer Tax Table rows; none infer tax
from the implementation under test. This closes the prior categorical
royalty-debt routing gap within these stated sources, not the broader Form4952
parent task or the separate bond MAGI calculation. The latter still needs the
[Form8815 line9](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf) pre-exclusion
interest calculation and a separately reconciled final deduction.

Verification:205 grouped tests pass across Form4952 source, computation,
Schedule E, native/PDF and earlier traced-debt routes. The final focused gate
passes5/0, with12 contradictory public sources,44 native-preparation mutations,
44 prepared-PDF mutations and four direct printed-property mutations rejected.
Four complete XMLs pass TY2025v5.4 XSD; all22 packet pages (19 unique rendered
pages) were observed, and native/PDF deductions, AGI, tax, refund and regular
and AMT carryforward values reconcile. The benchmark remains46/133 with the
same87 failing IDs. Evidence: `.state/research/form4952-royalty-debt-2026-10-09/`.

PDF parity is qualified: the existing Schedule E projector prints royalty
losses500/1,000 on rental-only line22 in the two loss cases. The
[2025 instructions for line22](https://www.irs.gov/pub/irs-prior/i1040se--2025.pdf)
exclude royalty properties; native output correctly omits the rental-loss
field. This new finding is deferred116 and its projector remains unchanged.
Existing name68/zero76, synthetic source authenticity, next-year carryover
acceptance and broader filing/IRS scope remain open. The initial zero-net
failure was in the new validator's required Form1040 line8; it now recognizes
an omitted zero without changing the return calculation.

## Traced taxable-securities loan alongside a portfolio royalty (staged, unrun)

The one-owner direct-use borrowing workpaper now also reconciles the existing
single 1099-MISC portfolio royalty route. The loan must directly and entirely
purchase identified taxable securities, with one lender, disbursement,
purchase, and paid-interest record set. Its owner and $300 paid interest must
match the final filer and Form 4952 line 1. The separate $800 royalty is
reported once on Schedule E and Schedule 1 and contributes to Form 4952 line
4a; the loan interest is limited on Form 4952 and reaches Schedule A line 9.
Native MeF and PDF replay the loan and royalty sources and check the selected
Form 1040 itemized deduction and line 8 income. The [2025 Publication
550](https://www.irs.gov/publications/p550) allocates borrowed-fund interest
by its actual use, and the [2025 Schedule E
instructions](https://www.irs.gov/instructions/i1040se) distinguish interest
attributable to royalties from investment-use interest.

Positive full-return/native/PDF and changed owner, purchase, lender, and
payment fixtures are authored but unrun. This reviewed direct-use workpaper
does not authenticate lender, bank, or purchase bytes and covers no mixed-use
loan or royalty-attributable debt. The K-1 box 20 code B export guard remains
closed for the issued-supplement and partner-limitation evidence described in
the [code B gap](./ty2025-form4952-k1-code-b-gap.md).

Sources:
[2025 Form 4952 and its instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf),
especially line 4a (royalties from property held for investment, outside the
ordinary course of business) and line 8 (royalty-attributable interest goes to
Schedule E), plus checked-in v5.4 `Common/IRS4952/IRS4952.xsd`.

## Reviewed 2024 disallowed-interest import

The [2024 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2024.pdf)
explicitly labels line 7 as disallowed investment interest carried forward to
2025; 2025 Form 4952 line 2 imports that amount. One bounded positive regular
carryforward route now
requires a reviewed filed-2024 Form 4952 source when the existing prior-year
carryforward scalar is positive. It records the distinct filed-return and
completed-form references, primary SSN, reviewer/date, 2024 lines 1/2/3/6/7/8,
and Schedule A line 9. The prior lines must satisfy line 3 = lines 1 + 2,
line 7 = max(0, line 3 − line 6), line 8 = min(line 3, line 6), and Schedule A
line 9 = line 8, with reviewed confirmation that none of the prior interest
belonged on Schedule E or Form 6198. Both the 2025 regular line 2 and a
separately reviewed 2024
AMT Form 4952 line 7 must match the 2025 regular and AMT prior-year inputs.
The AMT amount is required because Form 4952's AMT refigure can carry a
different disallowed balance; the bounded calculated case requires equal
regular and AMT balances and zero other AMT adjustments. It applies to one
primary-filer direct-use taxable-securities loan and one affirmed unadjusted
1099-INT box 1 payer. A $4,000 prior line 7 plus $20,000 current interest and
$22,000 sourced investment income yields 2025 line 8 of $22,000 and line 7 of
$2,000, with Schedule A/Form 1040 itemization checked against the retained
source and final filer. Positive calculation and prior-line,
AMT-source, owner, and retained-source tamper fixtures are authored for the
deferred batch. AMT-only imports are outside this regular-carryforward source
schema. The source now requires distinct reviewed copies of the filed 2024 Form
1040/Schedule A, Form 4952, AMT Form 4952 workpaper, and purported IRS
acknowledgment. Their references, hashes, year, owner, and reviewed regular and
AMT line 7 amounts join the 2025 imports. A staged byte binder checks the exact
three PDF byte strings and acknowledgment XML hash; a staged current-return
review checks line 2, Schedule A line 9, and Form 1040 itemization. Changed
bytes, owner, line 7, Schedule A, and Form 1040 fixtures are authored. The
filed PDF contents and IRS acknowledgment cannot be independently authenticated
in the current execution, so native and PDF positive export is closed. Wider
carryover histories, other income sources, and lender/broker document bytes
remain open. A distinct-AMT-balance route is described below.

The [2025 Form 6251 line 2c instructions](https://www.irs.gov/instructions/i6251)
require a separate AMT Form 4952 refigure and carryforward record, with line 2c
equal to AMT Form 4952 line 8 subtracted from regular line 8. A bounded
primary-filer case with *different* reviewed 2024 regular and AMT line 7
balances now accepts two distinct affirmed 1099-INT box 1 investment payers
for the same traced 2025 taxable-securities loan. Both payer names and
statement references must differ. Each amount must match the retained Form
4952 source inventory; their sum must equal Form 1040 line 2b. Regular Form
4952 line 8 joins Schedule A line 9, and the separate AMT line 8 determines
Form 6251 line 2c and Schedule 2 line 2. Calculation replays those joins,
with positive, duplicate-source, and changed-amount fixtures authored for the
deferred batch. Native MeF and PDF export of dependent Form 6251 line 2c is
closed until accepted 2024 source content can be authenticated. Private-activity
bond income, qualified dividends, and other AMT investment income adjustments
remain closed in this route.

## Direct-use borrowing evidence prerequisite

[2025 Publication 550](https://www.irs.gov/publications/p550) allocates interest
according to how borrowed proceeds are used, including changes from investment
to personal use. Form 4952 line 1 reports investment interest paid or accrued
in 2025. A strict standalone workpaper now records one 2025 borrowing whose
entire principal directly bought identified taxable securities, with lender,
agreement, disbursement, purchase, and interest-payment references. It checks
the same final filer, chronological purchase and payments, unique payment IDs,
the lender's 2025 interest total, and exact equality to the manually entered
Form 4952 line 1 interest. Mixed use, tax-exempt assets, and a simultaneous
positive K-1 code H source are outside this one-loan workpaper.

The workpaper's references and affirmations are typed input, not authenticated
bank or broker bytes. It has no later refinance or reassignment, and no trust
or partnership asset look-through. Focused source-contract fixtures are
authored for the deferred validation batch.

The direct workpaper is now a live, bounded source route when exactly one
affirmed taxable 1099-INT investment payer supplies line 4a. Form 4952 input
retains the one-loan trace, checks that the full principal directly bought the
identified taxable securities, that investment use continued through 2025,
and that distinct payment records sum to the lender's annual interest and line
1. Native and PDF export replay the exact loan and payment fields against the
retained input, recompute every Form 4952 line, join line 8 to Schedule A and
selected Form 1040 itemization, and require the final primary filer SSN to
own the loan. A full-return positive and payment/owner-tamper fixture are
authored for the deferred batch. This route does not authenticate lender,
payment, or brokerage bytes, and does not cover mixed-use or later-year debt.
These source references remain reviewer assertions until document
authentication is implemented.

The same one-loan route also accepts exactly one affirmed Form 1099-DIV payer
with ordinary box 1a dividends, including a sourced qualified box 1b portion.
The [2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
put gross ordinary dividends on line 4a and remove qualified dividends on line
4b unless the taxpayer makes a line 4g election. This bounded route makes no
election. The retained loan and payments, payer amounts, Form 4952 lines
1–8, Schedule A line 9, and finalized Form 1040 lines 3a/3b and itemization
must agree at native and PDF export. A full-return fixture has $34,000 of box
1a dividends, $15,000 of box 1b qualified dividends, and $20,000 of traced
interest: line 4h and deductible line 8 are $19,000, while line 7 records a
$1,000 current-year disallowance. Source-amount, final-return, and loan-payment
tamper fixtures are authored for the deferred validation batch. Line 7 is a
calculated 2025 output; importing it to a later filing still requires the
accepted-year evidence described below. Foreign tax, capital-gain
distributions, mixed-use debt, and unauthenticated lender or broker bytes
remain outside this direct-loan route.

The same direct-use loan now accepts two distinct affirmed, unadjusted taxable
Form 1099-INT box 1 payers without a dividend payer. Both issued statement
references and payer names must differ; their two amounts must match the
retained Form 4952 source list, Form 1040 interest, Schedule A line 9, native
MeF, and PDF. A full-return calculation and duplicate-reference/amount tamper
fixtures are authored for the deferred batch. Source bytes and mixed loan use
remain open.

The direct loan also accepts one affirmed unadjusted box 1 Form 1099-INT payer
alongside one ordinary box 1a Form 1099-DIV payer. The combined source guard
replays both payers and the final Form 1040 interest/dividend amounts; the loan
guard replays the same retained debt and payments. Form 4952 line 4a, Schedule
A line 9, native MeF, and PDF must agree. A full-return positive and changed
dividend-source fixture are authored for the deferred batch. Wider mixed payer
combinations and authenticated issuer or lender bytes remain open.

The same direct loan also accepts two unadjusted 1099-INT box 1 payers plus
one ordinary 1099-DIV box 1a payer. Both interest payers need distinct source
references and payer names, and the dividend payer needs its own source
reference. Native and PDF export compare the retained two-interest amount
inventory and one dividend amount with the printed Form 4952, then the existing
combined-income guard replays each payer against Form 1040 and Schedule A.
A full-return positive and duplicate-reference tamper fixture are authored
for the deferred batch. Source bytes and larger payer inventories remain open.

The one-loan route also accepts one unadjusted 1099-INT box 1 payer and two
ordinary 1099-DIV box 1a payers. The dividend sources must carry distinct
document references and payer names. Native and PDF export compare both
dividend amounts with the retained Form 4952 input, while the combined-income
guard reconciles all three payers, Schedule A, and Form 1040. A full-return
positive and duplicate-dividend-source tamper fixture are authored for the
deferred batch. Issuer and lender source bytes remain unauthenticated.

The same single loan can pair one unadjusted taxable Form 1099-OID box 1 payer
with the ordinary Form 1099-DIV payer. The combined source guard verifies the
OID and dividend totals against the final return before native or PDF export;
the loan guard replays the retained trace and payments. A full-return positive
and missing-OID source fixture are authored for deferred validation. Adjusted
OID, other income classes, and authenticated document bytes remain open.

For a married filing jointly return, the same direct-use taxable-securities
loan may belong to the identified spouse instead of the primary filer. The
retained loan owner TIN must match that final joint spouse; its direct purchase,
lender total, and individual payment records still reconcile to Form 4952 line
1. The bounded authored case combines a spouse-owned $20,000 interest loan with
one affirmed $100,000 1099-INT investment payer and $18,000 of separately
sourced mortgage interest so the joint return selects $38,000 of Schedule A
deductions. Form 4952 line 8, Schedule A line 9, Form 1040 lines 2b/12e,
native MeF, and PDF projection reconcile. A changed final spouse identity or
single-filer status rejects; spouse-owned prior carryforwards or nonzero Form
4952 AMT refigure adjustments remain closed. The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
deducts investment interest for property held for investment, while
[2025 Publication 550](https://www.irs.gov/publications/p550) traces debt by
use of proceeds and requires cash-method interest to be paid in the year.
Issued lender, payment, broker, and 1099 bytes are not authenticated. The
positive and tamper fixtures are authored for the deferred batch.

It also accepts exactly one affirmed, unadjusted taxable Form 1099-OID box 1
investment payer in place of the interest or dividend payer. The same retained
loan and payment records, OID source, Form 4952, Schedule A, Form 1040 interest,
native document, and PDF must reconcile. An executor positive and changed-OID
fixture is authored for the deferred batch. Other OID boxes, tax-exempt
instruments, other mixed payers, and lender/broker byte proof remain open.

An affirmatively classified Form 1099-MISC box 2 portfolio royalty sends the
same amount to Schedule E income and Form 4952 line 4a. A bounded filing route
now requires one 1099-MISC and one separately identified, nonbusiness,
expense-free Schedule E royalty property. The property's source pointer must
match the payer, recipient, and box 2 amount; the recipient must be the primary
Form 1040 filer and the Schedule E property must be taxpayer-owned. The 1099
passthrough is reconciled to that property and counted once on Schedule E line
4, Schedule 1 line 5, and Form 1040 line 8. Form 4952 line 4a and all numbered
lines reconcile to the same box 2 amount, while line 8 reconciles to Schedule A
line 9 and the selected itemized deduction. The Schedule E PDF leaves its
royalty property address and rental-day cells blank as the 2025 instructions
require. The 1099 may not carry other income or withholding boxes; additional
royalties, expenses, foreign-tax interaction, elections, AMT adjustments, or K-1
code B remain outside this slice. Separately entered investment interest must
explicitly exclude royalty-attributable interest, which belongs on Schedule E.
The direct source and serializer cases are written. A full-return portfolio
royalty case passed local TY2025 v5.4 XSD and filled-PDF review on 2026-09-30
after correcting its final Schedule 1 reconciliation: the $800 royalty belongs
on line 5 and contributes to line 10, while line 9 remains empty. The
seven-page packet prints $800 once on Schedule E and Schedule 1, $300 on Form
4952 line 8 and Schedule A line 9, and $18,300 in selected itemized deductions.
The inspected snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-form4952-misc-royalty/filled-return.pdf`
with SHA-256
`c6ccaa7e940a27d5717cdbc091c5bb534e57f3f44850d4b028bd2eb200cdb98c`.

The royalty cannot be classified to Schedule C or have an empty box 2. Omitting
box 2 routing defaults to Schedule E; zero or unspecified box 2 income produces
no royalty output unless the Form 4952 affirmation is present, in which case it
is rejected. If manually entered investment property gross income coexists with
sourced royalties, the manual figure must explicitly exclude those royalties. A
Schedule E passthrough alongside a property item still rejects unless it matches
the one linked 1099-MISC royalty property.

This is not general royalty or broker coverage. The affirmation does not
independently authenticate investment-purpose ownership or rule out a passive
activity. The interest amount and declaration that it excludes
royalty-attributable interest are user-supplied; no issued loan statement,
payment record, or debt-proceeds tracing workpaper has been authenticated. The
route proves a narrow arithmetic and filing join, not that the borrowing
qualifies for an investment-interest deduction. Direct Form 4952 source fields
without a bounded 1099, K-1, or linked royalty route reject at both MeF and PDF
export: they are not reconciled to the underlying information returns. The
reported royalty may have deductible Schedule E expenses not yet linked to Form
4952 line 5. Royalty-attributable investment interest requires a separate
Schedule E allocation; the current node routes all line 8 to Schedule A, so that
interest source is not supported by this addition. Disposition gains require
netting all investment-property gains, losses, and capital-loss carryovers
before lines 4d/4e; a positive per-broker-transaction shortcut would overstate
the deduction. The AMT refigure also still relies on asserted source adjustments
rather than a full AMT-basis reconstruction. No local tests, typecheck, XSD,
PDF, or IRS ATS validation had run in the earlier build-first pass. The bounded
royalty case above supplies local XSD and filled-PDF evidence only; IRS rules,
ATS, and authenticated loan/source evidence remain open.

No compatibility layer, fallback, or dual API was added.

## Ordinary 1099-DIV filing slice

A bounded Form 1099-DIV box 1a path checks every source item against Form 4952
line 4a, recalculates every Form 4952 numbered line, verifies line 8 against
finalized Schedule A line 9, and verifies the ordinary dividend and an itemized
deduction at least as large as line 8 on finalized Form 1040. The same check
runs before both MeF XML and PDF field projection. It accepts affirmatively
investment-property payers with ordinary dividends and an optional sourced
qualified-dividend component, but no capital-gain component, other investment
income, or election, with a zero-adjustment AMT refigure and a positive
separately entered investment-interest expense. Missing raw Form 1099-DIV,
Schedule A, Form 1040, or conflicting line values stop that path. Focused
source, MeF, PDF, and negative cases are written but not run.

With a sourced box 1b amount, this route removes it on line 4b and reconciles
Form 1040 line 3a; no line 4g election is made. This does not independently
establish the debt, interest payment, or tracing of the loan proceeds to
investment property. Form 1040's itemized-deduction total can include other
Schedule A items, so the descriptor verifies that line 12e is at least Form 4952
line 8, not that the entire Schedule A total has been reconstructed.
Capital-gain distributions, Schedule E royalty interest, broker transaction
netting, and AMT-basis differences still need separate bounded source
reconciliation. General Form 4952 inputs outside the bounded 1099 and
partnership-K-1 routes stop at export instead of producing an unsourced
document.

## Foreign-tax interaction boundary

The ordinary-dividend MeF and PDF route stops if any 1099-DIV reports box 7
foreign tax, box 8 foreign country or possession, a positive foreign-source
dividend amount, or a foreign-tax country code. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) include
investment interest in line 4b's other-interest allocation: generally the asset
method apportions it between U.S. and foreign source income, although eligible
taxpayers with no more than $5,000 of gross foreign-source income may allocate
it all to U.S. source. The current Form 4952 reconciliation has neither the full
worldwide foreign-income threshold nor the asset bases or election needed to
verify which route applies. This guard does not assert that Form 4952 itself is
incorrect; it prevents a positive foreign-tax interaction claim from passing
through this bounded filing slice without reconciliation. A focused MeF and PDF
negative case is written but not run. General non-1099 Form 4952 paths beyond
the bounded partnership-K-1 route remain blocked at export.

All bounded Form 4952 MeF/PDF routes also stop when an independent Form 1116 is
present in the return. A domestic 1099 payer does not establish that the return
has no other foreign-source income, so K-1 code H interest can still require
Form 1116 line 4b apportionment. Reopening that combination needs reviewed
worldwide foreign-source gross income, the applicable small-income allocation
choice or investment-asset bases, and reconciliation of each Form 1116 line 4b
allocation with the Form 4952 deduction. Focused mixed-source and
ordinary-interest rejection cases are written but unrun.

## Ordinary 1099-INT box 1 filing slice

A second bounded MeF/PDF route checks affirmatively investment-property Form
1099-INT box 1 payers against Form 4952 line 4a, recalculates every numbered
line, verifies line 8 against finalized Schedule A line 9, and verifies box 1
taxable interest plus an itemized deduction at least as large as line 8 on
finalized Form 1040. It accepts only unadjusted box 1 interest, a positive
separately entered investment-interest expense, no other investment-income or
election components, and a zero-adjustment AMT refigure. Foreign-source
interest/foreign tax, other 1099-INT boxes or interest adjustments stop. The
foreign-tax boundary follows the Form 1116 line 4b allocation issue above.
Focused source, MeF, PDF, and negative cases are written but unrun.

This route does not authenticate the debt, interest payment, or investment use
of the borrowed proceeds; those remain separately entered facts. Other source
combinations, including broker disposition netting and nonportfolio activity
income, are not promoted to source-verified coverage by this addition.

## Combined interest and ordinary-dividend payers

The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
put both investment-property interest and ordinary dividends on line 4a and
separately remove qualified dividends on line 4b. A bounded combined MeF/PDF
route accepts one or more affirmed, unadjusted Form 1099-INT box 1 payers and
one or more affirmed Form 1099-DIV box 1a payers, with optional sourced box 1b
qualified dividends. It checks each raw source against its separate Form 4952
source field, recomputes every numbered Form 4952 line, verifies line 8 against
finalized Schedule A line 9, and matches the income amounts to finalized Form
1040 lines 2b, 3a, and 3b. Form 1040 line 12e must contain at least the line 8
deduction. The route requires a positive separately entered investment-interest
expense and an explicit zero-adjustment AMT refigure. Focused source, MeF, PDF,
and rejection cases were written earlier. A full-return case now passes local
TY2025 v5.4 XSD and an inspected four-page PDF: $500 of 1099-INT interest and
$400 of 1099-DIV ordinary dividends put $900 on Form 4952 line 4a, while its
$100 qualified dividend is removed on line 4b. The $800 line 8 deduction
matches Schedule A line 9 and the selected $18,800 itemized total; Form 4952
line 7 shows the remaining $100 carryforward. The local snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-form4952-combined-payers/filled-return.pdf`
with SHA-256
`eeb97cab2e70af950b204fde4a1b3ef4b1e237847173f154db32fea67067d92f`.

The combined slice is not capital-gain distribution, foreign-source/foreign-tax,
interest-adjustment, or election coverage. It does not independently establish
loan tracing or payment. Non-1099 income paths other than the bounded
partnership-K-1 route remain blocked at export. The full test, typecheck, XSD,
and final full batch remain pending. The calculated $100 line 7 is not yet a
durable accepted-filing carryforward or a verified 2026 import.

## Several ordinary interest and dividend payers

The combined route now sums all supplied, affirmatively classified Form 1099-INT
box 1 and Form 1099-DIV box 1a payers. Every payer must satisfy the same
unadjusted domestic-source restrictions. Each accumulated source amount must
match one supplied form amount, without relying on payer order. The aggregate
source fields, every calculated Form 4952 line, Schedule A line 9, and Form 1040
lines 2b, 3a, 3b, and 12e are reconciled before MeF or PDF output. A foreign-tax
or foreign-source item on any supplied payer, an empty source list, or a
mismatch in either aggregate stops export. Multi-payer positive and negative
cases are written but unrun. The one-type-only routes now accept multiple
ordinary payers too; other investment-income classes remain unsupported. Source
amounts are cross-checked in aggregate, not matched payer by payer;
independently missing source documents could still escape this check. This does
not prove debt tracing or the AMT refigure.

## Partnership K-1 interest and investment-interest-expense route

One or more distinct 2025 partnership K-1s can each supply both box 5 portfolio
interest and box 13 code H investment interest for Form 4952. The bounded
MeF/PDF route requires each partnership EIN, unique source-document reference,
recipient TIN, investment-property affirmation, and no other modeled K-1
amounts. Final native and PDF filing checks require each recipient to be the
taxpayer or joint-filing spouse. Each
accumulated Form 4952 source amount must match one K-1 box amount, independent
of payer order. It recalculates every numbered line, checks line 8 against
Schedule A line 9, and matches the box 5 sum to finalized Form 1040 line 2b and
the deduction to line 12e. Every bounded Form 4952 export route also requires
the finalized deduction-choice result to select itemizing, Form 1040 line 12a to
be absent, and Form 1040 line 12e to equal the calculated Schedule A total, not
merely exceed Form 4952 line 8. Foreign items, AMT adjustments, carryovers,
elections, manually entered investment interest, and mixed sources beyond the
separately bounded K-1/1099-INT and K-1/1099-DIV routes remain blocked at
export. Focused positive, negative, and owner-mismatch cases pass. A full
return with one recipient-owned K-1 box 5 amount of $500 and code H expense of
$300 passes local TY2025 v5.4 XSD and an inspected four-page PDF; Form 4952
line 8 and Schedule A line 9 both print $300, and Form 1040 selects $18,300
of itemized deductions. The local snapshot is
`.state/research/ty2025-filled-pdf-review/2026-10-01-form4952-k1-interest/filled-return.pdf`
with SHA-256
`e23d67da6fa16f46688ffa3e87260408a948b05f7aa8acbd0a212360676b61a8`.
The
source-document references identify the K-1s; they are not independent
authentication of the issued form. The full validation batch and filled-PDF
review for other K-1 combinations is still pending.

## Partnership K-1 expense against Form 1099-INT income

A separate bounded route combines one or more identified partnership K-1 box 13
code H investment-interest expenses with one or more affirmatively
investment-property Form 1099-INT box 1 payers. Each K-1 has a unique EIN and
source reference and no other modeled K-1 amounts; each 1099-INT is unadjusted
and domestic. The separate accumulated amounts must match the supplied source
amounts. All Form 4952 numbered lines, Schedule A line 9, the selected itemized
total, and Form 1040 lines 2b/12e reconcile before MeF or PDF. K-1 portfolio
income, other K-1 expenses, foreign-tax facts, manually entered loan interest,
carryovers, and elections remain outside this route. Positive and negative cases
are written but unrun, and source references are not authenticated.

The bounded K-1 code H expense route now also accepts an affirmed, unadjusted
1099-INT box 3 Treasury-interest payer. It uses the same box 1/3 source
predicate as the interest-only route, matches each payer's box 1 plus box 3
amount to the accumulated Form 4952 source, and reconciles the total to line
4a and finalized Form 1040 line 2b. The existing K-1 recipient, line 8,
Schedule A, and itemized-deduction joins still apply to native MeF and PDF
projection. A box 3 positive source and bond-premium rejection cases are
written but unrun. The [1099-INT instructions](https://www.irs.gov/instructions/i1099int)
place taxable U.S. Savings Bond and Treasury-obligation interest in box 3;
the [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
includes investment-property interest on line 4a. Adjusted bonds, foreign
items, dividends mixed with the K-1 expense, and loan tracing remain outside
this bounded slice.

The same K-1 code H route now also accepts affirmatively held investment
property reported as unadjusted taxable Form 1099-OID box 1 income, alone or
alongside unadjusted domestic Form 1099-INT boxes 1/3. Each raw payer amount
must match one Form 4952 interest-source amount; their total must match line 4a
and finalized Form 1040 line 2b. The K-1 code H amount remains the sole line 1
source, and line 8 must match Schedule A line 9 and the selected itemized
Form 1040 total. Native MeF and PDF replay the same source and final-return
checks. The [IRS 1099-OID instructions](https://www.irs.gov/instructions/i1099int)
identify box 1 as taxable OID, and the
[2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) includes
taxable interest from property held for investment on line 4a. An authored
full-return OID case and focused OID/INT positive, adjusted-OID,
unclassified-property, missing-source, and changed-Form-1040 fixtures await
the implementation batch. Treasury or tax-exempt OID, market discount,
acquisition/bond premium, foreign items, K-1 code B, source-byte
authentication, and wider combinations remain closed.

## Partnership K-1 expense against Form 1099-DIV income

A separate bounded route combines identified partnership K-1 box 13 code H
investment-interest expense with domestic, affirmatively investment-property
Form 1099-DIV box 1a ordinary dividends. Box 1b qualified dividends stay on Form
4952 line 4b and are excluded from the investment-income limit when no line 4g
election is made. Each K-1 needs a distinct EIN and source reference, and each
payer's ordinary and qualified amounts must match the separate accumulated Form
4952 facts. The route recalculates every numbered line and checks the deduction
against Schedule A and the selected itemized Form 1040 total, plus Form 1040
lines 3a and 3b. Both MeF and PDF use the same check.

Foreign-source dividends or tax, capital-gain distributions, nominee amounts,
other K-1 income or expense, manual interest, carryovers, positive AMT
adjustments, and the line 4g election remain outside this route. It does not
independently authenticate the issued K-1s, loan tracing, or the interest
payment. Focused positive and negative cases are written but unrun. The full
test, TY2025 XSD, filled-PDF, business-rule, and ATS batch remains pending.

The same K-1 code H expense route now also accepts one or more affirmed,
unadjusted taxable 1099-OID box 1 payers alongside the domestic 1099-DIV
box 1a/1b payers. Each OID and dividend amount must match its own accumulated
Form 4952 source entry. Their sum reaches line 4a, qualified box 1b stays on
line 4b, and code H remains the only line 1 source. Native MeF and PDF check
every numbered Form 4952 line, Schedule A line 9, the selected itemized
Form 1040 total, and Form 1040 lines 2b/3a/3b. A $200 OID plus $500 ordinary
dividend, including $100 qualified, supports a $300 K-1 code H deduction in
the authored full-return fixture. Adjusted or unclassified OID, an additional
1099-INT, and Form 1040 interest drift reject in focused fixtures. The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include investment interest and ordinary dividends on line 4a and remove
qualified dividends on line 4b. Positive box 20 code B remains closed without
the issued supplement and allowed-deduction proof; source bytes and wider
mixed payers remain open. These fixtures await the deferred validation batch.

## Plain Form 1099-OID box 1 investment income

The existing Form 1099-OID node already routes affirmed taxable OID into the
canonical Form 4952 investment-interest source field, but export previously
matched that field only to Form 1099-INT payers. A bounded OID-only route now
matches each positive box 1 amount to its source document, recalculates every
Form 4952 line, and checks Schedule A line 9 and finalized Form 1040 lines 2b
and 12e before either MeF or PDF output. This follows the
[IRS Forms 1099-INT
and 1099-OID instructions](https://www.irs.gov/instructions/i1099int), which
classify box 1 OID as taxable interest, and the
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf),
which include taxable interest in investment income when the property is held
for investment.

Only unadjusted box 1 OID with an explicit investment-property affirmation is
covered. Plain affirmed Form 1099-INT box 1 and Form 1099-OID box 1 payers may
now coexist: each source amount must match one submitted payer amount, their sum
must match Form 4952 line 4a and finalized Form 1040 line 2b, and the Schedule
A/itemization checks remain required. Other periodic interest, Treasury OID,
market discount, acquisition or bond premium, nominee amounts, tax-exempt OID,
investment expenses, withholding, and FATCA still stop at export. Loan tracing
and payment of the investment-interest expense are not independently proved.
Focused positive and negative cases are written but unrun under the build-first
workflow.

## Mixed plain box 1, box 3, and OID taxable interest

The interest-only MeF/PDF route now reconciles the per-payer taxable-interest
amount from affirmed, unadjusted Form 1099-INT boxes 1 and 3 and Form 1099-OID
box 1. A 1099-INT payer with both boxes 1 and 3 contributes their sum once,
matching the existing source-node output. Different payers may supply either
box, and plain OID payers may coexist. Each accumulated Form 4952 source amount
must match one payer, with the full total matching line 4a and finalized Form
1040 line 2b. The
[IRS 1099-INT/OID instructions](https://www.irs.gov/instructions/i1099int)
identify box 3 as U.S. savings-bond or Treasury interest distinct from box 1;
the
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include taxable interest from investment property on line 4a.

This does not cover bond premium, educational savings-bond exclusions, foreign
tax, OID adjustments, or a source without the investment-property affirmation.
The finalized-return reconciliation catches a taxable-interest exclusion but
does not independently establish ownership or loan tracing. Focused MeF/PDF
positive and negative cases are written but unrun.

## Treasury box 3 plus plain OID and ordinary dividends

The combined MeF/PDF route also accepts an affirmed, unadjusted Form 1099-INT
box 3 Treasury-interest payer alongside a separately identified Form 1099-OID
box 1 payer and an ordinary Form 1099-DIV payer. The
[IRS 1099-INT/OID instructions](https://www.irs.gov/instructions/i1099int) put
U.S. Savings Bond and Treasury interest in 1099-INT box 3, not box 1, and
taxable non-Treasury OID in 1099-OID box 1, not Treasury OID box 8. The
[2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include interest from property held for investment on line 4a. Each positive
source amount must match its supplied payer, their interest total must match
finalized Form 1040 line 2b, all numbered Form 4952 lines must recalculate, and
line 8 must reconcile to the selected itemized Schedule A deduction.

This removes only the former blanket box-3-plus-OID rejection. Bond premium,
adjusted OID, Treasury OID box 8, foreign-source/tax facts, unclassified
investment property, a missing payer, or a source/return mismatch still reject.
The payer records and investment-property classification are supplied facts, not
independent verification of issued statements or loan tracing. Focused source,
MeF, PDF, and rejection cases are written but unrun; full XSD, filled-PDF,
business-rule, and ATS validation remains pending.

## Plain 1099-OID and ordinary-dividend combination

The combined investment-income export route now accepts one or more affirmed,
unadjusted Form 1099-OID box 1 payers alongside ordinary Form 1099-DIV box 1a
payers, with or without additional plain Form 1099-INT box 1 payers. It matches
every interest source amount to a supplied payer, then reconciles the total to
Form 4952 line 4a and finalized Form 1040 line 2b. It independently matches each
ordinary dividend to Form 4952 and finalized Form 1040 line 3b, recalculates all
numbered Form 4952 lines, and checks Schedule A line 9 and the selected
itemized-deduction total before either MeF XML or PDF projection. Invalid
supplied interest documents stop export instead of being ignored when another
interest type is valid. Focused positive and negative cases are written but
unrun.

This remains limited to domestic, unadjusted box 1 OID and ordinary dividends
with at most sourced box 1b qualified dividends, and without capital-gain
distributions, foreign-source or foreign-tax components, other income,
carryovers, or an election. Issued payer forms and investment-loan tracing are
not independently authenticated. The single full test, TY2025 XSD, filled-PDF,
IRS-rule, and ATS batch remains pending.

## Combined interest and qualified-dividend slice

The combined Form 1099-INT or plain Form 1099-OID interest plus Form 1099-DIV
route now also accepts sourced box 1b qualified dividends without a line 4g
election. It matches each qualified amount to a supplied dividend payer,
subtracts the aggregate on Form 4952 line 4b, and checks the aggregate against
finalized Form 1040 line 3a. The Form 4952 deduction uses line 4h after that
subtraction, with the existing Schedule A line 9 and itemized-total checks. The
[2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) explicitly
excludes box 1b on line 4b unless elected back into investment income on line
4g; this slice requires line 4g to be zero. A sourced positive case and a
mismatched-1040 rejection case are written but unrun. The box 1b source is still
the reported 1099-DIV and has not been independently authenticated;
foreign-source allocation, capital-gain netting, and the line 4g tax-rate
election remain blocked.

## Remaining in-scope Form 1040 boundaries

The two mixed partnership code H cases now also pass a full-return local
TY2025 v5.4 XSD check and produce four-page filled packets. In each case,
the reviewed K-1 belongs to the final filer and contributes $300 of investment
interest expense. A $500 Form 1099-INT investment payer produces Form 4952
line 4a/4h of $500, while a $500 Form 1099-DIV payer with $100 qualified
dividends produces line 4b of $100 and line 4h of $400. Both deduct $300 on
Form 4952 line 8 and Schedule A line 9, with $18,300 of itemized deductions
on Form 1040. Schedule A and Form 4952 pages 3–4 were rendered and inspected
for both cases. The retained PDFs are
`2026-10-01-form4952-k1-1099-int/filled-return.pdf` (SHA-256
`4a445c7fd26d05a79a1508aea0227fed361a7575a73d445dfdf4441e34b79302`)
and `2026-10-01-form4952-k1-1099-div/filled-return.pdf` (SHA-256
`000232b0504377677aea579fa6a70734f8c9b9fb954e17c03eb254ad2914785e`)
under `.state/research/ty2025-filled-pdf-review/`. The issued K-1 and 1099
bytes, business rules, and ATS have not been authenticated or run.

The positive MeF/PDF slices still do not cover a Form 1099-DIV box 2a
capital-gain distribution or other disposition gain: line 4d must net all
investment-property gains, losses, and capital-loss carryovers. A line 4g
election additionally changes the preferential-rate Form 1040 line 16 tax
calculation. Prior-year Form 4952 line 7 carryforward needs the actual filed
2024 form and a 2025-to-2026 balance record. Direct investment expenses and
royalty-attributable interest need their own source-to-Schedule A or Schedule E
allocation. Foreign-source income or Form 1116 requires investment-interest
allocation across U.S. and foreign assets. The zero-adjustment AMT assertion and
manual loan-interest tracing are not independently authenticated. None of these
cases is silently treated as the newly supported qualified-dividend combination.

## Traced loan with four distinct investment payers (2026-10-01, unrun)

One owner-owned direct-use taxable-securities loan now joins two separately
identified Form 1099-INT box 1 payers and two separately identified Form
1099-DIV box 1a payers, with box 1b qualified dividends on the first dividend
copy. Four payer names and four issued-copy references must be distinct. The
loan principal, purchase, lender interest total, and individual payments still
reconcile to Form 4952 line 1. The source amounts yield lines 4a/4b and line 8,
then match Form 1040 lines 2b/3a/3b, Schedule A line 9, the native Form 4952,
and its PDF. The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
directs qualified dividends included on line 4a to line 4b; this route makes
no line 4g election. A full-return positive and duplicate-copy, changed box 1b,
and changed Form 1040 fixtures are authored for the deferred validation pass.

The payer and lender record identifiers and amounts remain supplied facts;
issued bytes are not authenticated. Mixed loan use, a second loan, capital-gain
distributions, foreign income/tax, prior carryover, and line 4g election remain
outside this bounded route.

## Traced Treasury interest and taxable OID pair (2026-10-01, unrun)

The single direct-use taxable-securities loan now admits one affirmed Form
1099-INT box 3 Treasury-interest payer together with one unadjusted taxable
Form 1099-OID box 1 payer. Their payer names and issued-copy references must
be present and distinct. The existing income-source reconciliation matches
both amounts separately to Form 4952 line 4a and their sum to Form 1040 line
2b; the loan guard checks the retained principal, purchase, lender total,
individual interest payments, numbered Form 4952 lines, Schedule A line 9,
and final filer identity before native or PDF export. A $60,000 box 3 plus
$40,000 box 1 OID return with $20,000 of traced interest, and changed-copy,
OID amount, and owner fixtures are authored for the deferred batch.

The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
includes investment-property interest income on line 4a. The
[IRS 1099-INT/OID instructions](https://www.irs.gov/instructions/i1099int)
identify Treasury interest in Form 1099-INT box 3 and taxable OID in Form
1099-OID box 1. Bond premium, adjusted OID, foreign-source/tax facts,
dividends, prior carryover, mixed-use or second debt, and line 4g elections
remain outside this pair. Issuer, lender, payment, and broker bytes have not
been authenticated.

## Traced qualified-dividend election (2026-10-01, unrun)

One direct-use taxable-securities loan and one affirmed Form 1099-DIV box 1a/1b
investment payer now support a positive line 4g election of up to the payer's
qualified-dividend amount. The existing loan owner, lender total, payments,
issued payer amount, Form 4952 lines 1–8, Schedule A line 9, and Form 1040
lines 3a/3b/12e still reconcile. Native and PDF export additionally replay the
election into the income-tax calculation and check finalized Form 1040 lines
15/16 against the TY2025 Schedule D Tax Worksheet. The election does not
reduce the reported Form 1040 line 3a amount. A sourced $34,000 ordinary /
$15,000 qualified dividend case elects $1,000, increasing Form 4952 line 8
from $19,000 to $20,000 and reducing line 7 from $1,000 to zero. A full-return
native/PDF fixture and changed payer, election, and line-16 fixtures are
authored for the deferred validation batch.

The [2025 Form 4952 line 4g instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
permit including qualified dividends in investment income, require the
Schedule D Tax Worksheet for Form 1040 line 16, keep Form 1040 line 3a intact,
and say the election can be revoked only with IRS consent. This bounded route
requires one traced loan, one qualified-dividend payer, no capital gain or
foreign-income/tax source, and no other line-16 add-on or special worksheet.
The source and loan references are reviewer-supplied, not authenticated issued
bytes. Elections with capital gains, carryovers, AMT differences, or other tax
worksheets remain closed. The two-payer route below is separately bounded.

## Traced election with two dividend payers (written, unrun)

The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
uses the total qualified dividends included on line 4a for line 4b, and permits
an elected portion on line 4g. One direct-use, owner-identified loan now joins
two distinct domestic Form 1099-DIV payers, exactly one reporting box 1b
qualified dividends. Each payer needs a different name and issued-copy
reference. The bounded $17,000 qualified first copy plus $18,000 ordinary
second copy yields $35,000 on line 4a, $17,000 on line 4b, and a $2,000
election on line 4g. Form 4952 line 8 and Schedule A line 9 are $20,000.
Native and PDF export replay the two payer amounts and loan payments, compare
the numbered Form 4952 lines and Form 1040 lines 3a/3b, then refigure line 16
with the Schedule D Tax Worksheet using the election. Positive and duplicate
copy, box 1b, and tax-tamper fixtures are authored but unrun.

The issued dividend copies and lender records remain entered references, not
authenticated bytes. Multiple qualified payers, interest/OID combinations,
capital gains, foreign income/tax, carryovers, AMT differences, and other tax
worksheets remain outside this bounded election route.

## Traced loan with two taxable OID payers (2026-10-01, unrun)

The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
includes interest from investment property on line 4a and limits line 8 to net
investment income. One owner-identified, direct-use taxable-securities loan
now accepts exactly two separately identified, unadjusted Form 1099-OID box 1
payers. Both payer names and issued-copy references must differ. Their two
source deposits must match Form 4952 line 4a and finalized Form 1040 line 2b;
the traced $20,000 interest deduction joins Schedule A line 9, selected Form
1040 itemization, native MeF, and PDF. A $60,000 plus $40,000 positive
full-return fixture and duplicate-copy, changed-amount, and owner-tamper
fixtures are authored for the deferred batch.

The issued OID copies and lender records are entered references rather than
authenticated bytes. OID acquisition premium, bond premium, market discount,
Treasury box 8 OID, tax-exempt OID, foreign-source/tax facts, mixed-use debt,
carryovers, and additional payer combinations remain outside this route.

## Portfolio royalty plus taxable interest (2026-10-06, verified locally)

The [TY2025 Form 4952 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
include nonbusiness interest and royalties in investment gross income on line
4a. The existing expense-free portfolio royalty route now accepts one plain,
owner-matched Form 1099-INT alongside one verified Form 1099-MISC royalty and
a separately traced taxable-securities purchase loan. Both retained source
components reconcile at native and PDF export, including the finalized Form
1040 lines 2b and 8, Schedule E/1, Schedule A and the direct-debt workpaper.

The positive fixture has $500 interest, $800 royalties and $300 deductible
investment interest. Line 4a is $1,300, line 8 is $300, and itemization is
$18,300 including a $18,000 retained synthetic mortgage source. The full
return validates against the local TY2025 v5.4 XSD and its seven PDF pages
were rendered and inspected for amounts, owner, checkboxes and order. Changed
source amounts/owners and loan purchase/lender/payment records reject at both
exports. The final isolated focused rerun passed 1/1.

Artifacts are retained under
`.state/research/ty2025-filled-pdf-review/2026-10-06-form4952-royalty-interest/`.
XML SHA-256: `82cee6356fbd858657f6d539ecbdfbe9d5caa5f639856b294395750e0d027be6`.
PDF SHA-256: `c994f9f1a40023154a7cd3e8fa98fa13a86eecf95e50772195188ba9acad9ccc`.

This verifies a synthetic, entered-source route. Independent issuer and loan
record authentication, expenses, OID/dividend/foreign combinations, additional
payers, carryovers, differing AMT amounts, IRS business rules and ATS acceptance
remain open. The current full regression covers the earlier stable snapshot;
these isolated changes require integration and a later full regression.

## Multiple separately identified interest sources with portfolio royalty (2026-10-06)

The expense-free portfolio royalty route now accepts multiple plain owned Form 1099-INT box 1/3 sources, retaining one component per source rather than comparing only a summed amount. Every source must affirm investment property, match the royalty recipient, lack unsupported adjustments/foreign amounts, and have a distinct document reference when more than one is present. The traced-loan export compares the retained component inventory as well as the royalty amount. This remains one royalty property and one reviewed taxable-securities loan; other royalty properties, ownership, source authentication and wider combinations remain open.

The three-interest-source positive uses $500/$750/$600 taxable interest plus $800 portfolio royalty: Form 4952 line 4a $2,650, deduction $300, Schedule B/1040 interest $1,850, Schedule E/1 royalty $800 and itemization $18,300. Public return preparation passes full local TY2025 v5.4 XSD. Eight packet pages were rendered and visually inspected; Form 1040 tax/refund $7,977/$3,023 and Schedule B's three named payer rows reconcile. Offsetting source changes preserving the aggregate, a changed recipient, and duplicate document references reject. The final legacy royalty-only, one-interest and new multiple-interest suite passes 3/3 with real Poppler.

The visual review exposed omitted required zero on Form 4952 line 7; PDF lines 6/7 now print zero as directed by the [2025 form and instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf). Actual filled-PDF text asserts line 7's zero, and the corrected final page was rerendered and inspected. Final retained temporary packet `/tmp/opentax-form4952-royalty-multi-interest-review/`; PDF SHA-256 `9cc2a419479b8ece10a2642d263a25450b761775c8b98aff293be0ecf01c3fc3`, XML SHA-256 `bdea6a9fdc07b72cda7f30be7153b9a326a29daca7c07304a61ab269ff64a498`; test log `/tmp/opentax-4952-multi-interest-zero.log`. Synthetic facts do not prove issuer or loan-byte authenticity, wider PDF overflow, business rules or IRS acceptance.

## Exact paid-source cents (2026-10-06)

The direct taxable-securities borrowing contract now retains principal and paid
interest to exact cents. Source payments reconcile in safe integer cents;
third-decimal and unsafe totals reject before export. Filed whole dollars are
rounded after aggregate source reconciliation, preserving ownership, investment
use, dates and all existing debt guards.

The source-owned principal10000.49 and two distinct reviewed payments100.30 +
200.30 produce raw Form4952 lines1/8 and ScheduleA interest300.60, filed301,
itemized18301, royalty800, AGI76300, tax7669 and refund3331. One-cent source
purchase/payment/annual-total changes reject native and direct PDF even when
whole-dollar filed values would be unchanged. Seven full-XSD packet pages were
visually reviewed: both1040 pages, bothSchedule1 pages, ScheduleA, ScheduleE and
Form4952. Final44/0 covers seven related source/calculation/native/PDF modules;
log `/tmp/opentax-form4952-source-cents-final-oct6.log`. Exact retained-source
replay regenerates PDF/pending/origins byte-identically, XML onlyReturnTs:
`/tmp/opentax-form4952-source-cents-held-isolated-oct6.log`.

Evidence `/tmp/opentax-form4952-source-cents-proof-v5-oct6` retains source,
pending, XML, origins, PDF and the review manifest. Filed PDF SHA256
`d6ab7d8e441dd6b8cc8a82f4f99fb7645453961bb348d8a0740636eb58c3f289`.
The final PDF is flattened; the synthetic mortgage-source copy has canonical
source fields but no page widgets and is not authenticated issued-document
proof. Loan/bank/broker records remain simulated reviewed references. The older
October6 royalty archive differs from a newly regenerated integer fixture by
later ScheduleB-question and finalized QBI input additions; its originals are
untouched, and no byte-preservation claim is made against that older archive.
Wider debt use, source authentication, prior accepted carryovers, K1 codeB,
foreign allocation and IRS parent gates remain open.


## Main exact Form4952 paid-source cents

Production738554c2a main focused6/0(17s), `/tmp/opentax-form4952-source-cents-current-main-oct6.log`; isolated final44/0 sevenmodules verifies same production. Actual main retainedsource replay regenerates7-page fullXSD/PDF/pending/origins exactly, XMLonlyReturnTs, `/tmp/opentax-form4952-source-cents-held-main-oct6.log`; output `/tmp/opentax-form4952-source-cents-held-main-oct6`. Allseven pages reviewed from v4 and confirmed PDF/pending byte-identical finalv5. OriginalolderOctober6 integerarchive untouched; graph additions to laterregeneration are recorded and no oldarchivebyteequality claim. Main6/0 andheld were terminal before sealing, ledger1466; frozen52/future unchanged. FullV5 firstexit1/logoverwritten byKeepAlive, run2 live91417/91420; nextwrapper-start guard archives and removes service. Latest-source fullpass remains required.

## October 9 AMT complete-return checkpoint

Four synthetic source-backed public returns combine a traced taxable-securities loan, separately identified paid-interest records, current ISO exercise and regular/AMT investment-interest limits. All four pass the cached TY2025v5.4 full-return XSD. Their 36 flattened pages were inspected through 25 distinct renders and 11 exact matches; all13 contact sheets were reviewed. Required Form1040, Schedule2/A/B, Forms4952/6251/8960 amounts and owner copies were checked, with the qualifications below retained.

| Case | Regular deduction / carry | AMT carry | Actual AMTI | Actual total tax / owed | Independent comparison |
| --- | --- | --- | --- | --- | --- |
| single-pab | 18,000 / 2,000 | 0 | 443,000 | 94,590 / 59,590 | matches |
| two-pab-debt | 18,000 / 2,000 | 0 | 445,000 | 95,150 / 60,150 | review required |
| amt-income-limited | 17,000 / 3,000 | 2,000 | 440,000 | 93,750 / 58,750 | matches |
| taxable-only | 18,000 / 2,000 | 2,000 | 440,000 | 93,750 / 58,750 | matches |

Independent Decimal arithmetic starts from source interest, paid expenses, wages and ISO shares/strike/FMV. Three final-tax results match; the debt comparison deducting its1,000 expense once produces AMTI446,000 and tax95,430, a280 difference from the fourth output. The [2025 AMT instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf) require reconciliation of debt treatment across lines2c/2g and the AMT interest limit before accepting that comparison. This remains a question in future_todo87, not a passing fourth tax oracle or an implemented repair. All regular/AMT carry values match the source comparison; selected native deduction, carry, AMTI and AMT fields match pending values.

Six mutations per case alter deduction, traced payment, owner, taxable interest, AMT interest adjustment or Form1040 additional tax. All24 reject both native assembly and the complete PDF builder. These are retained execution probes, not newly committed typed tests. Production and test inputs remain unchanged during the already-running full batch.

Every packet repeats native Form6251 line1a omission (deferred84) and out-of-sequence PDF Forms4952/6251 (deferred86). The debt case also has a tax-exempt-only payer with native zero/blank PDF amount on ScheduleB (deferred88). No qualification was repaired from the deferred queue. Sources remain synthetic reviewed references, not authenticated issuer/loan bytes; wider debt, elections, accepted carryover history, business rules and IRS acceptance remain open. This scoped checkpoint does not close either parent board task.

Private evidence: `.state/research/form4952-amt-packets-2026-10-09/` retains source inputs, public execution/preparation, XML, flattened PDFs, render/qualification reports, independent arithmetic and mutation results, plus SHA256SUMS. XSD digest: `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.
