# TY2025 Form 8863: documented missing Form 1098-T

The education expense workpaper now accepts a documented statutory exception
instead of a received Form 1098-T. This opens positive AOTC and Lifetime
Learning Credit returns; the exception is checked before the tax node emits a
positive credit and again at native/PDF preparation.

## Authority and source conditions

The
[2025 Form 8863 instructions, page 1](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf)
allow an institution-exempt nonreceipt or a required form that has not arrived.
Both paths require eligible enrollment and substantiated qualified payments. For
the required-form path the student/taxpayer must request the form after January
31, 2026 and before filing and fully cooperate with the institution. The
[2025 Form 1098-T instructions, page 2](https://www.irs.gov/pub/irs-prior/i1098et--2025.pdf)
define the furnishing exemptions, including the formal billing arrangement
conditions. AOTC still requires the school EIN.

`education_expense_workpaper.missing_1098t_exception` retains:

- Matching student SSN and institution name; eligible-school, enrollment, aid,
  and nonreceipt source record references; explicit eligibility and enrollment
  answers; the paid tax year and qualifying academic period; and whether the
  student pursues a degree or credential (required for AOTC).
- For `required_but_not_received`, the school's required-furnishing answer,
  request date/record, full-cooperation answer/record, and declared filing date.
  The request must be after January 31, 2026 and strictly before that filing
  date.
- For `institution_not_required`, an explicit furnishing basis and its facts.
  Formal billing requires employer/governmental counterparty, covered qualified
  tuition, no separate student financial account, and a billing-arrangement
  record. The payment ledger separately retains taxable and section 127/other
  tax-free portions, the payroll tax-treatment record, student income inclusion,
  and any positive section 127 exclusion record. The schema also describes
  noncredit-only courses, the nonresident student without a form request, and
  fully waived/scholarship-paid tuition. Noncredit-only sources cannot establish
  AOTC eligibility.

No nonexistent form ID or box 1/5 amount is required or synthesized. Supplying
those fields together with a nonreceipt exception rejects. Received-form
workpapers continue to require all three source fields and cannot use the
exception. Actual payments, tax-free assistance, refunds, and other-benefit
reductions still reconcile to the claimed adjusted expense. Existing material
qualification and disjoint payment-reference checks apply.

## Verified positive returns

Four source fixtures cover required/nonreceived and exempt/formal-billing
institutions for both credits. These are synthetic structured evidence; the
formal-billing paid amounts are declared qualifying payments and their payment
tax treatment and student income records distinguish taxable payments from
section 127 and other tax-free assistance. Furnishing exemption alone cannot
establish deductible/creditable tuition. The AOTC allocation is $4,000 of
taxable employer payments with no section 127 exclusion; the LLC allocation is
$7,500 taxable plus $500 of section 127 benefits, with a separate qualified
program/exclusion record. Both refer to the retained W-2 source copy with
$75,000 of box 1 wages, and the respective taxable education portions are
asserted included in that figure, not added again. The workpaper must reduce
expenses by every recorded tax-free amount. Covered payments must match the
workpaper's tuition and materials required to be paid to the institution, and
identify payment records from its inventory.

| Credit |           Adjusted expense | Form 8863 line 8 / Form 1040 line 29 | Form 8863 line 19 / Schedule 3 line 3 | Form 1040 line 24 | Refund |
| ------ | -------------------------: | -----------------------------------: | ------------------------------------: | ----------------: | -----: |
| AOTC   |                      4,000 |                                1,000 |                                 1,500 |             6,455 |  5,545 |
| LLC    | 8,000 less 500 aid = 7,500 |                                    0 |                                 1,500 |             6,455 |  4,545 |

Each native school group prints `CurrentYear1098TReceivedInd=false` and
`PriorYear1098TReceivedInd=false`. PDF line 22 checks No for both receipt
questions. AOTC includes school EIN 12-3456789; LLC omits it because neither
receipt question is Yes. No invented native exception field is emitted.

All four complete returns validated against local IRS 2025v5.4 `Return1040.xsd`,
whose SHA-256 is
`e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`. Each real
packet has five flattened pages: Form 1040 pages 1-2, Schedule 3, and Form 8863
pages 1-2. PDF text tests check the credited amounts and school. All five
required-AOTC pages and all five exempt-LLC pages were rendered with Poppler and
visually inspected for identity, amounts, No indicators, EIN, page order, and
legibility. The opposite exception packet for each credit has identical PDF
bytes and identical page PNGs, so all four printed packets are covered by that
review.

The Form 8863 node, native/XSD, PDF, prior-disallowance, one-school, two-school,
and missing-form focused regression passed **96 tests, 0 failures**. The final
missing-form source/artifact run passed **6 tests, 0 failures**. Invalid
school/student/degree/enrollment facts, out-of-period enrollment, wrong paid
year, missing aid/nonreceipt/payment proof, incomplete or mistimed request,
noncooperation, contradictory furnishing conditions, fake Form 1098-T amounts,
missing AOTC EIN, changed expense/aid amounts, and changed final Form
1040/Schedule 3 joins reject. The required-AOTC positive also passed with the
standard task’s restricted environment permissions (1 passed, 4 filtered);
evidence output is optional and checks permission before reading its environment
variable. Two existing negative tests were updated for the more accurate source
error wording; both remain rejection tests.

Tools: Deno 2.9.4, TypeScript 6.0.3, xmllint/libxml 2.9.13, Poppler from
`/tmp/opentax-poppler-env/bin`. XSD execution is conditional on the local schema
cache; it was available and used for every positive fixture in this review.

Artifacts: `/tmp/opentax-f8863-missing-evidence/`, with `required-aoc`,
`exempt-aoc`, `required-llc`, and `exempt-llc` prefixes and
`-source-input.json`, `-full-return.xml`, and `-filled-return.pdf` suffixes. The
test regenerates these with `FORM8863_EVIDENCE_DIR`. AOTC PDF SHA-256 is
`9626bca704e1d285540593599c91311b970385190197da171d119a2ac8e1d585`; LLC PDF
SHA-256 is `3b5b5f4da2b821db2f60e8bbee31ce1deddc4e7ab4dcd6158ff1fc857d718535`.

## Remaining proof limits

Record references and asserted school/enrollment/request/cooperation/payment
facts do not authenticate school or payment bytes. The declared filing date must
reflect the actual filing, and nonreceipt/cooperation must still be true when
filed. Eligibility, prior AOTC years, TIN timing, other benefit allocation, and
economic treatment of assistance remain source facts under the existing return
model. Only the formal-billing exempt basis has positive full-packet proof in
this slice; the other exempt bases need their own positive economic fixtures and
review. Foreign institutions, three-school overflow, wider
scholarship/taxable-assistance allocation, IRS business rules, and ATS
acceptance remain open. This does not establish general education-credit or
filing readiness.

## Employer and scholarship economic correction

The
[2025 Publication 970, chapters 2, 3, and 10](https://www.irs.gov/pub/irs-prior/p970--2025.pdf)
requires tax-free assistance to reduce qualified expenses and distinguishes
wages/taxable payments from excluded educational benefits. The formal-billing
fixtures now retain their explicit taxable/section 127 split, covered payment
inventory, payment tax-treatment record, and student income record described
above. Zero or understated tax-free reductions, inconsistent sums, unmatched
payments, missing income/treatment records, and a government counterparty
claiming an employer section 127 exclusion reject. Their four packets and credit
amounts remain unchanged and pass full-return XSD.

For the fully waived/scholarship furnishing basis, the source now separately
records waived tuition and actually scholarship-paid tuition, its taxable and
tax-free portions, and the scholarship terms. Waived amounts cannot enter the
paid workpaper. Tax-free scholarship payments must be fully reduced. A claimed
taxable portion must reconcile to declared student gross income and have
permitted terms plus allocation and income records. Negative source cases cover
invented waived payments, omitted tax-free reductions, missing terms or
allocation/income records, and inconsistent amounts. A fully tax-free $4,000
tuition payment correctly produces zero education credit. The conditional $4,000
taxable scholarship source contract has a validation test only, not a
full-return, source-income-join, XSD, or filled-packet positive; wider taxable
scholarship allocation remains open.

The monetary allocations and inclusion in student income are explicit retained
synthetic assertions. Matching a W-2 reference and wage amount does not
authenticate the payroll allocation or prove the legal exclusion/taxable
classification from outside documents. No such source authenticity is claimed.
