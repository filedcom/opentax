# TY2025 clergy source route

A minister of the gospel is an employee for income tax and self-employed for
SE tax on ministerial services. The `clergy` input takes one row per church
W-2: the minister (taxpayer or joint spouse, name, SSN, ordained, licensed or
commissioned status with its record), the church (name, EIN and the entered
W-2's `source_document_reference`), wages equal to that W-2's box 1, and the
housing facts with a record for each: the advance designation (amount,
designation date no later than the start of the period it covers, minutes or
contract), the allowance paid, the amount actually used for the home, and the
fair rental value furnished plus utilities; or a parsonage's fair rental value
plus utilities; unreimbursed ministerial expenses; and Form 4361 status with
the approval letter and date when approved. Confirmations are literal `true`.

A housing allowance and a parsonage each also carry
`not_more_than_reasonable_pay_confirmed: true`. Pub 517 limits the rental
allowance exclusion to an amount that "isn't more than reasonable pay for your
services" and says of a parsonage that "the exclusion can't be more than the
reasonable pay for your services". The engine cannot judge reasonable pay, so
the minister attests to it; a row without the attestation does not parse.

The node reconciles each row to the return's filer and entered W-2s before it
routes anything: one W-2 per row with the same SSN, EIN, employer name,
reference and box 1, no statutory-employee box, and no social security or
Medicare wages, since a minister's earnings are not covered under FICA
([Pub 517](https://www.irs.gov/publications/p517), Table 1). The minister's
name matches the return's first, optional middle initial and last name after
ignoring case, periods, commas, extra spaces, leading titles (Rev., Reverend,
Pastor, Dr., Fr.) and trailing suffixes (Jr., Sr., II, III, IV). All rows for
one minister must agree on Form 4361 approval, since one exemption covers all
of that minister's ministerial earnings. An allowance the church put inside
box 1 fails closed: the engine asks for a corrected W-2 instead of subtracting
an exclusion. The start node supplies the filer and W-2 context so these
mismatches surface as calculation diagnostics; export reconciles the retained
rows again (below), as Form 2106 does.

The excludable allowance is the smallest of the designation, the amount used
and the fair rental value (IRC §107(2)); the excess paid goes on Form 1040
line 1h and AGI. MeF files `OtherEarnedIncomeAmt` referencing
`WagesNotShownSchedule` with `OtherWagesNotShownTxt` `EXCESS ALLOWANCE`; the
PDF prints "EXCESS ALLOWANCE" beside line 1h (Pub 517: "On the dotted line next
to line 1h, enter 'Excess allowance' and the amount"). The TY2018 schema
required `WagesLiteralCd`, whose code list included `EXCESS ALLOWANCE`. The IRS
TY2025 `WagesNotShownSchedule` stylesheet shows a choice of `WagesLiteralCd` or
`OtherWagesNotShownTxt`, but no public TY2025 copy of the dependency schema was
found, so the free-text element is used and the code list is unverified. Line
1h holds the excess as its only source; a mix with FEC, Form 2555, W-2 excess
deferrals, corrective distributions or a disability pension fails closed.

Without an approved Form 4361, ministerial wages, the whole allowance paid and
the parsonage value, less expenses in full, are owned `ministerial_sources`
rows that Schedule SE adds to line 2, per spouse on a joint return
([Instructions for Schedule SE (2025)](https://www.irs.gov/instructions/i1040sse),
Ministers). A loss stays negative. When unreimbursed expenses are subtracted,
`IRS1040ScheduleSE` references one `AllowableSEExpenseExplnStmt` per minister
listing wages, allowance paid, excluded and excess amounts, parsonage value,
expenses and the net. The Schedule SE instructions say to "subtract on line 2
the allowable expenses from your self-employment earnings and attach an
explanation", and Pub 517, "Allowable deductions", says to "Subtract any
allowable expenses from those wages, include the net amount on line 2 of
Schedule SE (Form 1040), and attach an explanation". Without expenses nothing
is attached. The PDF adds the same text on a page after Schedule SE. QBI, Form
7206 and Schedule 1-A receive no SE deduction from ministerial earnings, which
are pay for services, not a trade or business. Form 1040 line 27b
(`ClergyMemberInd`, PDF `c2_12`) is checked when a minister's filed Schedule SE
includes wages or excess allowance also on line 1z.

With an approved Form 4361 the ministerial earnings owe no SE tax and
unreimbursed expenses are ignored. A minister with $400 or more of other SE
earnings gets Schedule SE line A (`ExemptForm4361Ind`, PDF `c1_1`); one with no
other income subject to SE tax gets Schedule 2 line 4 box 1
(`ExemptForm4361Ind`, PDF `Line4_ReadOrder.c1_3`) and no Schedule SE.

## Schema check

Checked against public copies of the TY2025 2025v5.2 schemas (Final Release,
February 19, 2026), not the 2025v5.4 package in `irs/`:

- `IRS1040ScheduleSE.xsd`: `ExemptForm4361Ind` (CheckboxType, line A) is the
  first element after `SSN`. Only the `IRS1040ScheduleSE` root carries
  `referenceDocumentId` and `referenceDocumentName`, fixed to
  `AllowableSEExpenseExplanationStatement`; `NetNonFarmProfitLossAmt` has no
  attributes.
- `IRS1040.xsd`: `ClergyMemberInd` (CheckboxType, line 27b) follows
  `EarnedIncomeCreditAmt` and precedes `DoNotClaimEICInd`.
  `OtherEarnedIncomeAmt` references `NonW2DisabilityPaymentStatement` or
  `WagesNotShownSchedule`.
- `IRS1040Schedule2.xsd`: `ExemptForm4361Ind` (line 4(1)) follows
  `AdditionalTaxAmt` and precedes `ExemptForm4029Ind` and
  `SelfEmploymentTaxAmt`.
- Not available publicly for TY2025: `ReturnData1040.xsd` and the
  `WagesNotShownSchedule` and `AllowableSEExpenseExplanationStatement`
  dependencies. The statement's place follows the TY2018 `ReturnData1040.xsd`
  (after `PostponementCropInsDsstrStmt`, up to two occurrences), and its
  `ExplanationTxt` child is the one the IRS TY2025 stylesheet renders.

The repository's TY2025 business rules (generated from
`1040_Business_Rules_2025v3.0.csv`) have 8 SSE rules, all implemented; none
requires a Schedule C or K-1 when Schedule SE line 2 is nonzero. Later rule
releases were not checked.

## Still fail-closed

Export refuses, with a named reason: ministerial earnings beside Schedule C,
Schedule F or partnership SE earnings anywhere on the return, including a
spouse's (the joint Schedule SE keeps them apart, but the Form 8995, Form
8995-A, Schedule 1-A and Form 7206 export guards that replay the owner Schedule
SE sources are not ministerial-aware); a Form 4361 minister with other SE
earnings under $400, or without other SE income beside another person's
Schedule SE, such as a spouse's (the Schedule 2 line 4 presentation for that
joint return is not confirmed); a Schedule C marked as clergy fees; any earned
income credit; and an additional child tax credit beside ministerial SE
earnings, until the clergy earned-income worksheets are modeled. Form 2441,
IRA and SEP compensation and Form 7206 are computed without the clergy
earned-income rules: ministerial SE earnings are not added to them, and they
are not blocked.

TY2026 runs the same graph: calculation, MeF and the Schedule SE and Form 1040
PDFs follow; the 2026 draft Schedule 2 PDF refuses the Form 4361 box, whose
draft widget is not mapped.

Verified here: node, Schedule SE, export-guard and end-to-end tests for TY2025
and TY2026, including the local business rules. Not verified here: the TY2025
v5.4 and TY2026 XSDs (not installed in the authoring environment; the XSD test
skips), filled PDF pages, and ATS.
