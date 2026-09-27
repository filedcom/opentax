# TY2026 Form 8814 parent election contract

Source snapshot: pinned [2026 draft Form 8814](corpus/draft/f8814.pdf),
SHA-256 `4ba275126e96f31984373285c48e53fad3c82aa8f01e0f72100f7cff962dae0d`,
and [2026 draft instructions](corpus/draft/i8814.pdf), SHA-256
`66431f1f4588c1195fbca28f35cec7c9659d2a68eccf98afac62e8729362233d`.
Confirm final form/instructions, current Schedule D/1040/6251/8960/8962
instructions and MeF rules before filing.

## Election and source record

This is a **parent return election** to report a child's interest and
dividends, distinct from [Form 8615 on a child's return](FORM8615-GRAPH.md).
Keep one form and election record per child, keyed by child SSN. The 2026
instructions require age under 19 (or under 24 if a full-time student), only
interest/dividend income including capital gain distributions and Alaska
Permanent Fund dividends, gross income below $13,500, a required child
return absent the election, no joint child return, no estimated payments
(including prior-year overpayment applied forward), no withholding, and an
eligible parent return. Apply January 1 birthday and custody/remarriage/
higher-taxable-income rules. The election is made by timely attaching Form
8814; it may be made for some children and not others. Keep a mutually
exclusive decision with the child's own Form 1040/Form 8615 path.

Source interest from 1099-INT/OID, ordinary/qualified dividends and capital
gain distributions from 1099-DIV/K-1, nominee adjustments, Alaska PFD,
tax-exempt/private-activity-bond interest, and the child's foreign-account
and trust facts. Preserve 1099-DIV boxes 2b/2c/2d so the prorated capital
gain distribution retains §1250, §1202 and collectibles character. Do not
infer qualified dividends from all ordinary dividends or put tax-exempt
interest on taxable line 1a. The source ledger must also support the parent
NIIT, AMT, PTC dependent MAGI and investment-interest calculations.

## Printed form and parent routes

| Lines | Implementation contract |
| --- | --- |
| 1a–4 | Child taxable interest, tax-exempt interest, ordinary dividends including Alaska PFD, qualified dividend subset, capital gain distributions, then taxable total. If line 4 is at most $2,700, skip 5–12; if at least $13,500, this election is unavailable. Keep nominee/accrued-interest/OID/bond-premium annotations when applicable. |
| 5–12 | Deduct $2,700 base; apportion the excess by line 2b/4 and line 3/4, with ratios rounded to at least three decimals. Line 9 goes to parent Form 1040 lines 3a/3b and Schedule B if required; line 10 goes to Schedule D line 13 or direct 1040 line 7a when its exception applies. Allocate line 10's special gain character proportionally into Schedule D tax worksheets. Line 12 goes to Schedule 1 line 8z with “Form 8814” notation. Never add the full child 2b or line 3 to the parent a second time. |
| 13–15 | First $1,350 is untaxed; tax the next slice at 10%, capped at $135 per child. Sum line 15 over all Forms 8814 into parent Form 1040 line 16 and check its Form 8814 box. Preserve the yes/no line 15 checkbox and the multiple-form box C. |

The parent AGI increase can change Schedule 1-A deductions, IRA/student-loan
deductions, SALT/medical itemization, child/dependent-care/EIC/education
credits, PTC and NIIT. Form 8814 line 12 is part of parent modified AGI for
NIIT, but the Alaska PFD share is excluded from net investment income.
Private-activity-bond interest can create an AMT adjustment. A child foreign
financial account or trust can trigger parent Schedule B Part III and
potential Form 8938 disclosure. Compare total parent-and-child tax under
this election with separate child filing; the instructions note that the
election can be less favorable.

## Current code boundary

- Shared `f8814` computes lines 4–15 for up to ten children and routes
  line 9 dividends, line 10 capital gain, line 12 other income and line 15
  tax to several parent nodes, including Form 4952, 8960 and 8962. It
  requires literal `true` eligibility fields rather than deriving age,
  filing requirement, income types, payments/withholding or parent choice.
  The source is aggregate interest/dividend/gain amounts without nominee,
  special-gain, private-activity-bond or foreign-account detail.
- Its line 9/10 computation uses full-precision ratios before whole-dollar
  rounding; the printed form calls for a ratio rounded to at least three
  decimals. Reconcile rounding from a single filed line record across PDF,
  XML and downstream tax. A parent Form 1040 line 16 Form 8814 checkbox,
  Schedule B Part III/8938 and special Schedule D worksheets are not
  established by the shared source record.
- The TY2025 MeF serializer emits one form per child and the TY2025 PDF
  descriptor maps the ordinary numeric/check fields. The
  [2026 draft inventory](pdf-fields-f8814.csv) has **26 terminal widgets**,
  all in its field tree: 23 text and three buttons. The current 2026
  registry has no Form 8814 calculation, PDF or MeF route.

## Build order and acceptance

1. Confirm final 2026 sources and current MeF XSD/rules. Define a child
   election decision shared with the Form 8615/child-return filing route.
2. Derive eligibility and line 1–3 values from child 1099/K-1 income and
   payment records. Keep child and parent identity/relationship/custody
   evidence and reject conflicting child filing or duplicated election.
3. Compute and route every child's lines 4–15, special capital-gain
   character and disclosed tax-exempt/foreign account facts. Reconcile the
   aggregate to parent 1040, Schedule 1/B/D, tax worksheets, 6251, 4952,
   8960, 8962 and relevant credit/deduction calculations.
4. Fill/render the 26 widgets per child with required dotted-line
   annotations. Emit current MeF instances and validate active rules. Test
   one and multiple children, $1,350/$2,700/$13,500 boundaries, qualified
   dividends, special gains, Alaska PFD, PAB/AMT, PTC/NIIT interactions,
   foreign-account disclosure, custody/remarriage and TY2025 regressions.

This is the TY2026 implementation contract, not registered filing support.
