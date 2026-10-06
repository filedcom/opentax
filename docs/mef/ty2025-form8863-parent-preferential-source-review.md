# TY2025 selected-parent issued dividends and required sibling tax

## Existing source gap and prescribed worksheet

The public graph already computed a parent's qualified-dividend/capital-gain
(QDCGT) tax. The reviewed education/dependent Form8615 bridge retained only
wages, rejected that actual nonordinary parent return, and omitted the issued
dividend, ScheduleB, ScheduleD and AGI joins from its selected-parent
projection. The concrete pre-change audit used an issued owned dividend
statement with ordinary6000 / qualified4000 / Box2a3000; its actual joint parent
return had AGI134000, taxable102500, line16 tax11856 and a successful native
export, while the dependent bridge rejected it. This extends that existing
family source task.

[2025 Form8615 instructions, pages4 and7–8](https://www.irs.gov/pub/irs-prior/i8615--2025.pdf)
include the full selected parent's qualified dividends/net capital gain in
line8. For regular preferential income, line9 uses another QDCGT worksheet with
family income as worksheet line1 and the selected parent's filing status. Line10
is the actual parent's before-credit line16 tax. Lines9/10 require their
preferential method indicators. The family tax is independently refigured after
adding both children; it is not the already-settled parent tax.

[2025 Form1040 instructions, pages38 and80](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
provide QDCGT lines1–25 and the Tax Computation Worksheet. Both cases below have
ordinary taxable income above $100,000 and all $7,000 preferential income taxed
at15%. Independent expected worksheet arrays retain all25 lines, using the
printed joint `ordinaryTI ×22% −10172` and MFS `ordinaryTI ×24% −7153` rows.
They do not call the implementation's tax helper. Special28%/1250 gains require
the separate prescribed ScheduleD worksheet and remain an existing boundary.

## Actual owned public source families

Two distinct issued domestic1099-DIV copies retain payer TIN/name, account,
recipient TIN and source identity. They report respectively ordinary4000 /
qualified2500 / Box2a2000 and ordinary2000 / qualified1500 / Box2a1000. The
first belongs to Pat; the second belongs to Alex on the joint return and to Pat
on the separate return. Each retained position review has its actual ex-dividend
date, 90 qualifying days in the121-day window, no excluded-risk days, eligible
ordinary stock/issuer and no related-payment obligation, with its independent
review record. The bridge validates the actual source schema/holding eligibility
and distinct copies, rejects wage-source identity reuse and cross-parent/child
income-source reuse, and independently sums the qualified subset without
counting it twice in income. Issued amounts reconcile with ScheduleB's actual
two payer rows, explicit reviewed domestic account/trust answers, AGI,
distribution-only ScheduleD input, parent line3a/3b/7a, deduction, taxable
income and the actual QDCGT before-credit tax. The canonical separate
capital-gain field must stay zero so distributions are not counted twice.

The existing source-derived divorce/remarriage/custody, dependency, actual
school payment/aid, child-owned W2/service-grant/nonservice scholarship income,
support, independently settled parent selection and reciprocal sibling
inventories remain. Alex is still the actual education/payment owner; Pat is the
identified tax parent. No child income enters either parent AGI. Taylor/Sam own
AGIs remain 22000/24000, dependent standard deductions15750, net unearned
income6250/8250 and reciprocal rounded allocation ratios.431/.569. They claim no
education credit.

| Filed/refigured amount                              | Joint selected Pat/Alex | Separate selected Pat |
| --------------------------------------------------- | ----------------------: | --------------------: |
| Actual owned wages                                  |                  170000 |                110000 |
| Ordinary / qualified subset / Box2a                 |        6000 /4000 /3000 |      6000 /4000 /3000 |
| Parent AGI/MAGI                                     |                  179000 |                119000 |
| Parent deduction / taxable income                   |           31500 /147500 |             0 /119000 |
| QDCGT ordinary-income part                          |                  140500 |                112000 |
| QDCGT line22 ordinary tax / line18 preferential tax |             20738 /1050 |           19727 /1050 |
| Parent line16 / Form8615 line10                     |                   21788 |                 20777 |
| Family line8 / ordinary-income part                 |          162000 /155000 |        133500 /126500 |
| Family QDCGT line22 / line18                        |             23928 /1050 |           23207 /1050 |
| Family QDCGT line25 / Form8615 line9                |                   24978 |                 24257 |
| Increment allocated to siblings                     |                    3190 |                  3480 |
| Taylor / Sam final Form8615→1040 tax                |              1375 /1815 |            1500 /1980 |

Joint MAGI179000 changes the two-student $5000 AOC to $250 using the actual .050
phaseout ratio: $100 refundable and $150 nonrefundable. Schedule3 precedes the
$1000 ODC; its credit limit is21638, final parent tax20638 and refund5462. The
actual joint identity is Pat-first while Alex retains the independently reviewed
dependency/education ownership. The MFS parents receive no education credit.
Alex's owned wages75000 and $20000 reviewed property-tax deduction yield taxable
55000/tax7020/ODC1000/final6020/refund11980. Actual spouse itemizing forces
Pat's standard deduction to zero, with NY noncommunity residence and
separate-owned sources preserved. Pat's final balance is2777.

## Export repair and proof

All four native preferential indicators were already mapped. Visual review found
that the PDF descriptor omitted the actual2025 Form8615 checkbox fields. The
descriptor now maps lines9/10/15/17 to their verified `Line*_ReadOrder` AcroForm
fields. These child source cases require9/10 checked,15/17 clear; ordinary
earlier cases retain clear indicators. No IRS tax worksheet is attached where
the instructions say to keep it separately.

The focused proof covers both complete public families and negative source and
native/PDF joins: foreign/wrong recipient, missing/reused/duplicated source,
borrowed child income-source identity, missing/short/invalid-date/ineligible
issuer holding review, nominee/foreign/ special-gain source, changed
qualified/Box2a amounts, detached payer/foreign answers/AGI/income joins,
doubled distribution alias, incorrect method indicator, parent-tax substitution
for family tax, after-credit parent tax, broken reciprocal sibling result and
duplicate child education credit. Rejection is required through Form8615 and1040
native/PDF descriptors and whole-return preparation; public changed/detached
child source attempts must produce calculation diagnostics.

Final current-code evidence:

- Focused public/source/native/PDF/full-XSD proof: **5 passed / 0 failed**,
  `/tmp/opentax-preferential-focused-final-v4.log`.
- Selected **34-file** compatibility/source gate: **657 passed / 0 failed**,
  `/tmp/opentax-preferential-regression-final-v3.log`; exact inventory:
  `/tmp/opentax-preferential-regression-files.txt`. Includes earlier education
  ownership, missing/mixed-school, SE/material-capital/service-scholarship,
  paired kiddie tax, sibling selection, ordinary MFJ/MFS, joint-SE/QBI,
  issuedDIV/ScheduleB and ordinary/QDCGT worksheet tests. This is not a full
  repository regression claim.
- Seven retained source-input JSON / complete XML / filled PDF packets:
  `/tmp/opentax-f8863-parent-preferential-evidence`. Joint parent9 + two
  children5 each; separate Alex5 / Pat3 + two children5 each: **37 pages**.
- Every page reviewed as rendered contact sheets; final four child8615 pages
  additionally reviewed at full resolution. Final pixel comparison confirms **33
  unchanged pages** and four changed8615 pages with repaired checkmarks.
  Independently read IRS widget interiors give ink counts13/13/0/0 for
  lines9/10/15/17 on every child. Each final PDF has **0 fields / 0 widgets**.
  Counts: `/tmp/opentax-preferential-page-review-final-v2.log`.
- Independent final complete Return1040 XSD checks for all seven packets,
  pixel/checkbox check and **21 source/XML/PDF SHA256 hashes**:
  `/tmp/opentax-preferential-artifact-check-final-v2.log` and retained
  `sha256-manifest.json`. Independent expected25-line parent/family worksheets:
  `MFJ-independent-worksheets.json` and `MFS-independent-worksheets.json`.

Earlier regression attempts were stopped for the PDF mapping and cross-family
source-identity repairs; only the final v3 gate is reported above.

## Limits that remain open

This proves synthetic but source-backed public packets and internal source,
calculation and export consistency, not independent issuer authentication. The
added parent route supports whole-dollar domestic ordinary/qualified 1099-DIV
amounts and regular Box2a capital distributions with actual W2 income; it does
not assert general fractional-source support. Child preferential income, owned
capital sales/losses, special28%/1250 parent or sibling income, FEIE, ScheduleJ,
nominee/foreign/withholding/199A dividend treatments, wider deductions, other
family/dependency/residence and outside-source authenticity remain existing
boundaries. Earlier ordinary MFJ/MFS and education/source routes stay intact.
