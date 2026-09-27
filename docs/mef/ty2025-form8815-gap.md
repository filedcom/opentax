# TY2025 Form 8815: source-to-return gap

Status: bounded TY2025 implementation written, not validated. No test, XSD,
filled-PDF, IRS business-rule, or ATS acceptance is claimed here. The old
calculation and MeF tags described below were the starting point; they have been
replaced in the current working tree.

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
and redemption-record facts; one to three domestic tuition/fees beneficiaries;
distinct gross expenses and nontaxable benefits; bond principal and previously
reported interest for line 6; and the completed line 9 worksheet components. It
computes lines 2-14, emits line 14 to Schedule B, and uses the v5.4 native MeF
names and the inspected 2025 PDF field names. Missing facts or ineligible claims
raise diagnostics rather than assuming zero proceeds or MAGI. The legacy
ambiguous input fields are rejected, without a compatibility shim.

Still unsupported: Coverdell/QTP contributions, foreign institution addresses,
more than three line 1 entries, the special royalty-interest computation, and
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
