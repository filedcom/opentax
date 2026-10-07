# TY2025 Form 8863 mixed received/missing school sources

Status: one student with two U.S. institutions, one received 2025 Form 1098-T
and one genuinely missing form, has AOTC and LLC public-input calculation,
complete native XML/XSD, and filled PDF packet evidence. This extends the
existing education-credit TODO; it does not close all Form 8863 branches.

## Official requirements

The
[2025 Form 8863 instructions](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf)
permit a missing Form 1098-T when the institution need not furnish it, or when
an otherwise required form was requested after January 31, 2026 and before
filing, with full cooperation. Eligibility, enrollment, and payment must still
be substantiated. The
[2025 Forms 1098-E/T instructions](https://www.irs.gov/pub/irs-prior/i1098et--2025.pdf)
describe the scholarship-paid and formal-billing furnishing exceptions. These
conditions are retained separately for each missing institution.

[Form 8863 (2025)](https://www.irs.gov/pub/irs-prior/f8863--2025.pdf) has two
school columns in Part III line 22. Each school's current/prior receipt answers
are its own. AOTC requires an EIN, and a received current/prior form requires
the school EIN for either credit. LLC can omit the EIN of a genuinely
missing-form school when both receipt answers are No. AOTC line 27 caps one
student's combined adjusted expenses at $4,000. LLC line 31 and line 10 retain
combined adjusted expenses, line 11 caps them at $10,000, and line 12 applies
20% before phaseout.

## Source and calculation changes

`institution_expense_workpapers` now joins a school by its EIN and/or exact
name. Every provided key must match; each school must have exactly one source,
no source may be detached or reused, and provided school EINs must be distinct.
A name key supports LLC missing institutions without inventing an EIN. Existing
EIN-keyed two-received-school and one-school paths remain available.

A mixed two-school claim requires detailed source inventories for both schools:

- The received school's `issued_form1098t_source` retains student SSN,
  institution name/EIN, tax year, document reference, and boxes 1 and 5. These
  must match that school's receipt state and workpaper copy fields. Actual paid
  expenses remain a separate calculation; box 1 is not assumed to equal all
  credit-eligible payments.
- `payment_sources` retain student SSN, school, 2025 payment year, distinct
  payment reference, category, and amount. References must match the school's
  workpaper inventory exactly. Tuition, institution materials, and outside
  materials reconcile independently to their respective expense amounts.
- `assistance_sources` retain student SSN, school, tax year, distinct aid source
  reference, amount, and tax treatment. Tax-free amounts reconcile to that
  school's expense reduction. Taxable aid must match its documented missing-
  form allocation and gross-income source reference. Aid and payment sources
  cannot be reused across the school workpapers.
- The missing school's statutory exception retains its own enrollment,
  eligibility, nonreceipt, request/cooperation where required, payment, and aid
  facts. It cannot carry fabricated 1098-T boxes or an issued-copy record.

The received/missing validators run separately, then their adjusted expenses
must equal the student's aggregate input. Reversing the order of source
workpapers produces the same calculation and complete native return XML; the
school identities establish the join.

The income preflight previously inspected only `education_expense_workpaper`; it
now iterates the same joined school workpapers. A taxable missing-school
scholarship must match its retained `education_income` payer, student, amount,
terms, allocation, and gross-income reference. Its separate nonqualified expense
payments cannot reuse any qualified education payment reference. The existing
income node routes the amount to Schedule 1 line 8r and AGI before tax and
credit calculation; both exports reconcile finalized income, MAGI, credit limit,
and credit lines. Employer allocations retain their existing W-2 route.

## Reviewed positives

All four cases keep a $75,000 issued W-2. The received school has a $500
tax-free award, fully deducted from that school's expenses. The required missing
form has its own timely request/cooperation evidence. The exempt missing school
has $6,000 actually scholarship-paid tuition, a permitted $6,000 taxable
allocation with separately paid nonqualified expenses, and its own $6,000 income
source. No tax-free amount is asserted for that taxable portion.

| Credit / missing reason                 | First school net expenses | Missing school net expenses | Student aggregate | AGI/MAGI | Nonrefundable credit | Refundable credit | Total tax |
| --------------------------------------- | ------------------------- | --------------------------- | ----------------- | -------- | -------------------- | ----------------- | --------- |
| AOTC / requested required form          | $2,000                    | $3,000                      | $5,000            | $75,000  | $1,500               | $1,000            | $6,455    |
| LLC / requested required form           | $5,000                    | $3,000                      | $8,000            | $75,000  | $1,600               | $0                | $6,355    |
| AOTC / scholarship furnishing exception | $2,000                    | $6,000                      | $8,000            | $81,000  | $1,350               | $900              | $7,925    |
| LLC / scholarship furnishing exception  | $5,000                    | $6,000                      | $11,000           | $81,000  | $1,800               | $0                | $7,475    |

Both scholarship cases retain the actual $6,000 Schedule 1 line 8r income and
0.900 phaseout ratio. The native documents have two institution groups with
current-year receipt Yes/No and prior-year No/No. PDF school columns contain
both addresses, those same receipt answers, and each applicable EIN. The LLC
missing-school EIN is absent in both projections.

## Evidence and remaining limits

Focused cases: `forms/f1040/2025/pdf/form8863-mixed-schools.test.ts`. Artifacts:
`/tmp/opentax-f8863-mixed-evidence/`, with `aoc-required`, `llc-required`,
`aoc-scholarship`, and `llc-scholarship` prefixes and `-source-input.json`,
`-full-return.xml`, and `-filled-return.pdf` suffixes. The focused test
regenerates these with `-- --write-review-artifacts`.

The two required-form packets each have five flattened pages; each scholarship
packet has seven. All four complete returns passed the local IRS
`Return1040.xsd` (2025v5.4) validation. Poppler extraction verifies the names
and amounts, and all 24 rendered pages were visually inspected, including both
school columns, receipt flags, line 8r, AOTC cap, LLC lines 10–12, and phaseout.

Source negatives cover crossed school keys, duplicate source assignments,
removed/mismatched issued copies, changed student/EIN/name/box/reference,
missing payment or assistance inventories, changed category amounts, duplicate
payment/aid references, wrong aid tax treatment or income reference, fabricated
missing-form data, wrong missing-school identity/student/period, untimely
requests, detached taxable income, wrong scholarship payer, omitted line 8r, and
reuse of a tuition payment as a nonqualified scholarship expense. Calculation
rejects inconsistent workpapers; native/PDF and complete prepared returns also
reject these source inconsistencies. Cross-return income source joins are
enforced at export rather than claimed as calculation-node joins.

These are synthetic retained source records. Their references, copy fields,
payment amounts, aid classification, and filing-date assertions do not
independently authenticate school, payroll, scholarship, or payment bytes.
Foreign schools, three-school overflow, wider mixed/multiple-student cases,
dependent students' separate income returns, broader scholarship allocation,
shared or bundled payment allocations, cents across all joins, IRS business
rules, and ATS acceptance remain without positive proof in this slice.

Verification: **134 passed, 0 failed**, including all **six mixed-school focused
cases**, across Form 8863 node, native/XSD, PDF route, return arithmetic, and
public start-routing suites. The final run used the current source and income
guards and regenerated the four complete mixed packets. Log:
`/tmp/opentax-mixed-school-finalregression2.log`.

| Packet                         | Filled PDF SHA-256                                                 |
| ------------------------------ | ------------------------------------------------------------------ |
| AOTC / requested required form | `fc7cb2ef9bf6dcf5e5fc425f4a5f5b0926336333d6334126dc1f6ff4d2217df8` |
| AOTC / scholarship exception   | `bb48306fdc60a30767c9edcf9832b0a42e2328d8d635a723a86d694f5dc3ef08` |
| LLC / requested required form  | `601f34bf705609da83f73b22e258d90f0e0e761e58cba7e69a3db196531a104b` |
| LLC / scholarship exception    | `12a5cbcce7b3de69b3fac8ae56537ce55f22780195472dfd5709bb1b297b1f70` |

The available full schema is IMF Series 2025v5.4; `Return1040.xsd` SHA-256 is
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`. Tool
versions used: Deno 2.9.4 / TypeScript 6.0.3, xmllint/libxml 2.9.13, and Poppler
from `/tmp/opentax-poppler-env/bin`.
