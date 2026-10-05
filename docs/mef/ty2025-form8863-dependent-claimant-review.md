# TY2025 Form 8863: dependent ownership and claimant refund review

## Official rules

The
[2025 Form 8863 instructions](https://www.irs.gov/pub/irs-prior/i8863--2025.pdf),
pages 2–3 and 6–7, assign the credit to the taxpayer actually claiming the
student as a dependent. A student who can be claimed but is not actually claimed
may claim the credit.
[2025 Publication 970](https://www.irs.gov/pub/irs-prior/p970--2025.pdf), pages
18 and 27, explicitly distinguishes these cases for AOTC and LLC.

Form 8863's refundable AOTC restriction applies to the return claimant (the
instructions' “you”), even when the qualifying student is the claimant's child.
All three conditions must apply: the specified age/full-time/earned-support
condition, a living parent at year end, and a return other than a joint return.
At age 18, or ages 19–23 with at least five calendar months of full-time
enrollment, earned income **less than** half support triggers the first
condition. Exactly half does not. A claimant under 18 meets the age condition
regardless of earnings. Ordinary nonservice scholarships are not earned income;
scholarships are excluded from a full-time student's support. The January 1
birthday convention is described in
[2025 Publication 501](https://www.irs.gov/pub/irs-prior/p501--2025.pdf).

## Source and calculation contract

The public singleton `f8863_claimant_review` carries claimant SSN/DOB, actual
dependent-claim status and review references. A young claimant additionally
inventories full-time months, living-parent status, issued W-2 copies, and
ordinary versus scholarship support. The calculation derives the single
return-level refundable answer. An explicit conflicting legacy answer is
rejected.

Each reviewed student has an `ownership_review`: actual claim on this return, no
actual claim, or claim on another return; can-be-claimed status;
claimant/student identities; dependency review reference; and competing-claim
review. Claim on another return is rejected. Parent claims require the same
student and dependency reference in retained general dependents and finalized
Form 1040 dependent rows, ordinary dependency eligibility, and no release to
another return. Student own-return claims reconcile the can-be-claimed source
and filed indicator; when a parent is entitled to claim the student, an
identified parent's nonclaim record is required. Actual dependent-claim status
is distinct from Form 1040's can-be-claimed checkbox.

Native/PDF preflight requires these reviews for dependent students, young
primary claimants, and claimants who can be claimed. It reconciles claimant
identity/DOB/actual-claim answers and young-claimant W-2 employee, EIN, amount
and source references with the retained copies and filed wages. This positive
young-claimant source route is wage only; unsupported additional earned-income
sources require a complete expanded review rather than being silently counted as
zero. Retained scholarship income remains separately joined through Schedule
1/AGI and is excluded from earned income in the support test. Child scholarship
income cannot be moved onto the parent's return.

Multiple reviewed students share the claimant refund test and retain separate
student identities, 1098-T copies, expense/payment/aid ledgers and dependency
records. Existing duplicate student/payment/aid guards remain active. The actual
second Part III PDF copy exposed page-1 name/SSN fields being filled while only
page 2 was retained; page-1 projection is now limited to the first instance.

## Public proof packets

| Packet                                                                    | Filer wages / scholarship | Refundable AOTC | Schedule 3 education |         ODC | Final tax |
| ------------------------------------------------------------------------- | ------------------------: | --------------: | -------------------: | ----------: | --------: |
| Adult parent, one 20-year-old dependent                                   |                25,000 / 0 |           1,000 |                  928 | 0 (limited) |         0 |
| Adult parent, two 20-year-old dependents                                  |                75,000 / 0 |           2,000 |                3,000 |       1,000 |     3,955 |
| 20-year-old student, parent does not claim, earned exactly half support   |                25,000 / 0 |           1,000 |                  928 |           0 |         0 |
| Same dependency ownership, earned less than half support                  |                18,000 / 0 |               0 |                  226 |           0 |         0 |
| Same below-half earned support, nonservice taxable room/board scholarship |            18,000 / 8,000 |               0 |                1,028 |           0 |         0 |

The scholarship case files Schedule 1 line 8r of 8,000 and AGI/MAGI of 26,000;
earned support remains 18,000 against 50,000 ordinary support. Counting the
taxable scholarship as earned income would incorrectly make this packet
refundable. The parent cases supply explicit Schedule 8812 credit-limit
worksheets, so education credits precede ODC. The two-student packet also proves
the second native student group and actual extra PDF Part III page.

Focused tests: `forms/f1040/2025/pdf/form8863-claimant-owner.test.ts`. Artifacts
are in `/tmp/opentax-f8863-owner-evidence/`, with packet prefixes
`parent-limited`, `parent-two`, `student-refundable`, `student-no-refund`, and
`student-scholarship`; each has `-source-input.json`, `-full-return.xml`, and
`-filled-return.pdf`. Regenerate with `-- --write-review-artifacts`.

Negatives include wrong claimant/student, actual competing claim, deleted
claimant review, dependency release, contradictory support eligibility,
removed/changed finalized dependent rows, changed support beneficiary,
detached/changed W-2 sources and wages, a contradictory refund answer, duplicate
student, absent parent nonclaim record, changed filed can-be-claimed indicator,
child scholarship crossing onto the parent return, and altered Schedule 8812
filed credit/credit-limit ordering. Source joins are enforced during
native/PDF/complete-return preparation; calculation checks structured ownership
and refund computation but does not authenticate outside records.

## Limits

These are synthetic retained evidence records; reference strings, review
assertions and copy fields do not authenticate external parent returns, payroll,
schools, payments, custody or scholarship documents. The ordinary dependency
route is covered; special noncustodial/multiple-support/treaty cases are not
newly proven. Young-claimant positives are single, wage-only earned-income
cases; pure calculation checks also cover no living parent, joint filing,
enrollment below five months, under-18/age-18 cases and the January 1 age
boundary. No broader source-backed joint/spouse claimant, self-employment,
scholarship-for-services, foreign earned-income, cents across all joins, IRS
business-rule or ATS acceptance claim is made.

## Verification record

The broad Form 8863/general/node/native-XSD/PDF/public-routing/arithmetic suite
passed **217 tests, 0 failed** (`/tmp/opentax-owner-verified-regression.log`). A
final source guard additionally detects reviewed wage copies containing
non-Box-1 deferred compensation/combat pay contrary to the Box-1-only
earned-income declaration; its source-negative rerun passed
(`/tmp/opentax-owner-verified-earned-negatives.log`). The final eight owner
cases regenerate all five complete packets
(`/tmp/opentax-owner-packet-final.log`).

The five complete returns validate against local IMF Series 2025v5.4
`Return1040.xsd`. All PDFs are flattened, with page counts 5 / 8 / 5 / 5 / 7
respectively. Poppler extracted names and amounts and all **30 rendered pages**
were visually inspected, including the second student page, dependent rows,
claimant under-24 box, Schedule 1 scholarship and Schedule 8812 ordering.
Rendered pages/contact sheet and extracted text are alongside the packets. No
shared main regression or IRS ATS result is claimed.

| Packet                       | Filled PDF SHA-256                                                 |
| ---------------------------- | ------------------------------------------------------------------ |
| Parent, limited credit       | `30d55410748dcd1550b663dc156d65655146c562eac17db7986febb543b8c085` |
| Parent, two students         | `a9b10ea784dd055a0032cf0848531e4d7035265e7882cf15f31bb70402bc56d8` |
| Student, no refund           | `d29317217154265b9d8a40d9eab747152bcc111fb6b1d32e45c19b997e47eb4c` |
| Student, refundable          | `c3bed6b560a5bb86f38ef4d8862acb2ea276e820201a33be5af6129f14ff0e68` |
| Student, taxable scholarship | `59345534e824ca6d63c926f9e6181a8b3c83f8c1252216ab25c2536233df707d` |
