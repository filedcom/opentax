# TY2025 Form 8815: source-to-return gap

Status: static audit only. No test, XSD, filled-PDF, IRS business-rule, or ATS
acceptance is claimed here. Form 8815 is registered, but its current calculation
and MeF paths are not filing-ready.

## Evidence and current behavior

- The [2025 IRS Form 8815](https://www.irs.gov/pub/irs-prior/f8815--2025.pdf)
  places gross qualified higher education expenses on line 2, nontaxable
  educational benefits on line 3, their difference on line 4, bond proceeds on
  line 5, current-year eligible interest on line 6, modified AGI on line 9,
  the phaseout threshold on line 10, and the final Schedule B exclusion on
  line 14. The form's instructions require the education beneficiary and
  institution on line 1 and explain the source records for qualifying bonds,
  expenses, and prior-year interest reporting.
- The [2025 IRS phaseout guidance](https://www.irs.gov/irb/2024-45_IRB)
  specifies $99,500 to $114,500 for single, head of household, and qualifying
  surviving spouse; $149,250 to $179,250 for married filing jointly. Married
  filing separately cannot claim the exclusion. The checked-in
  `nodes/config/2025.ts` instead has $96,800 to $111,800 and $145,200 to
  $175,200. The node also puts qualifying surviving spouse in the joint band.
- `nodes/intermediate/forms/form8815/index.ts` treats `qualified_expenses` as
  already reduced by tax-free assistance, so the gross line 2 and benefit line
  3 cannot be reconstructed. It substitutes interest for missing proceeds and
  zero for missing modified AGI. Either substitution can overstate line 14.
  Missing filing status enters the single band. The `modified_agi` comment
  labels it line 11, though the 2025 form places MAGI on line 9.
- `2025/mef/forms/f8815.ts` emits `SavingsBondInterestAmt`,
  `TotalProceedsAmt`, `QualifiedExpensesAmt`, and `ModifiedAGIAmt`; none is a
  child of `IRS8815` in the checked-in TY2025 v5.4 `IRS8815.xsd`. When any
  number is present it produces an invalid form document, and it does not
  emit the calculated line 14. The existing unit cases assert the old
  phaseout thresholds; they do not establish correct 2025 results.

## Native XML fields needed for a bounded rebuild

The checked-in `IRS8815.xsd` sequence includes the following. Line 4 is
required by the XSD, while the other listed amount elements are optional. A
filing implementation should emit the supported form lines and reconcile
line 14 with Schedule B line 3, not use the optional flags to hide missing
source facts.

| Form line | Native TY2025 v5.4 element |
| --- | --- |
| 1 | `EligibleEducationInstnGrp` with `EligiblePersonNm`, and institution name/address when applicable |
| 2 | `ExclBondIntTotQlfyEducExpnsAmt` |
| 3 | `ExclBondIntTotNonTxEducBnftAmt` |
| 4 | `ExclBondIntTxblEducBenefitAmt` |
| 5 | `ExclBondTotPYBondProcAmt` |
| 6 | `ExclBondIntTotPYBondIntAmt` |
| 7 | `ExclBondIntTxblExpnsBondProcRt` |
| 8 | `ExclBondIntTentativeBondIntAmt` |
| 9 | `ExclBondIntModifiedAGIAmt` |
| 10 | `ExclBondIntFilingStatusLmtAmt` |
| 11 | `ExclBondIntExcessAGIAmt` |
| 12 | `ExclBondIntExcessAGIRt` |
| 13 | `ExclBondIntOffsetAmt` |
| 14 | `ExcludableSavingsBondIntAmt` |

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

Until that path exists, a nonempty Form 8815 claim should fail with a clear
diagnostic instead of assuming zero MAGI/proceeds or emitting invalid XML.
That is a proposed **fail-closed support decision**, not an implemented guard
or a silent exclusion. It requires the product owner's choice before changing
filing behavior.

Focused cases to write and then run in the agreed single batch: each 2025
phaseout boundary for single, HOH, QSS, and MFJ; MFS ineligibility; gross
expenses and nontaxable benefits producing line 4; line 4 below/equal/above
bond proceeds; prior-year interest adjustment; missing source facts causing a
diagnostic; native XSD serialization; Schedule B line 3 equality; and filled
PDF line and beneficiary/institution checks. No such pass is recorded here.
