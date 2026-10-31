# Clergy — Scratchpad

## Purpose
Ministerial income for a minister of the gospel: employee for income tax,
self-employed for SE tax on ministerial services (Pub 517). The housing
allowance is excluded from income only up to the IRC §107(2) limits but is SE
earnings in full (IRC §1402(a)(8)); an approved Form 4361 removes ministerial
earnings from SE tax.

## Fields identified
- minister: owner, name, SSN, credential, confirmations, credential record
- employer: church name, EIN, W-2 reference (matched to an entered W-2)
- ministerial_wages: equals the W-2's box 1
- housing_allowance: box 1 flag, advance designation (amount, dates, record), paid, actual expenses, fair rental value furnished plus utilities, each with a record
- parsonage: fair rental value plus utilities, with a record
- unreimbursed_ministerial_expenses: amount, confirmation, record
- form4361: approved, approval date and letter

## Resolved Questions
- [x] Where does each amount flow? — excess to Form 1040 line 1h and AGI; ministerial earnings to Schedule SE line 2 as owned, sourced rows
- [x] Allowance in W-2 box 1? — fails closed; the church issues a W-2c
- [x] Expenses for SE? — deducted in full; the Deason allocation reduces income-tax deductions only
- [x] Form 4361 presentation? — Schedule SE line A with $400+ other SE earnings; otherwise Schedule 2 line 4 box 1
- [x] Explanation? — AllowableSEExpenseExplnStmt and a PDF page after Schedule SE, only when expenses are subtracted on line 2
- [x] Reasonable pay? — attested on the housing allowance and the parsonage (Pub 517); not computed
- [x] Spouse with SE income? — export stays blocked: owner-SE consumers (QBI, 8995-A, Schedule 1-A, Form 7206) are not ministerial-aware, and the 4361 Schedule 2 box beside a spouse's SE tax is unconfirmed

## Sources checked
- [x] IRS Pub 517 (2025) — housing, rental allowances and parsonage (reasonable pay), Figuring Net Earnings, Allowable deductions, Expenses Allocable to Tax-Free Income, Table 1 (FICA or SECA)
- [x] Instructions for Schedule SE (2025) — Ministers; line A; Schedule 2 line 4 box 1
- [x] TY2025 MeF IRS1040ScheduleSE.xsd / IRS1040Schedule2.xsd / IRS1040.xsd, public 2025v5.2 copies (ExemptForm4361Ind, ClergyMemberInd, root referenceDocumentName); not 2025v5.4
- [ ] TY2025 WagesNotShownSchedule.xsd code list (no public copy; free-text element used)
- [x] IRC §107, §1402(a)(8), §1402(c)(4), §1402(e)
