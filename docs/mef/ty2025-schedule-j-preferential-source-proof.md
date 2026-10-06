# Schedule J preferential source integration — work in progress

The existing frozen Form4972/ScheduleJ task requires source-backed preferential tax and the Form6251 tax refigure without averaging. This phase is incomplete and has no filing-support or ledger completion claim.

The isolated actual return uses owned ScheduleF receipts200000, issuedDIV ordinary35000/qualified30000 with holding-period review, full issued4972 specialtax830 and3921 ISO adjustment240000. WithoutJ the existing source graph succeeds, regulartax31214 and AMT55517. WithJ the current public schema rejects the true qualified-dividend treatment. The source audit is retained in `.state/research/schedulej-preferential-source/guard-audit.json`.

The calculator now accepts distinct current and filed-base-year worksheet source amounts, matches all four preferential treatment flags to their amounts, and uses each year's existing IRS worksheet calculator. It does not accept an asserted tax. New current example: line3=156111, qualified30000, ordinary126111; tax23113.64+4500 rounds27614. Original base rates1595/1580/1568 and filed subtraction3000 produce ScheduleJ line23=29357. The three preferential base examples at55000 with qualified10000 yield7017/6708/6364 using2022/2023/2024 thresholds independently.

Checked calculation gate14/0 (70ms), log `/tmp/opentax-schedulej-preferential-source-calculation-v1.log`. This covers the new source/treatment conflicts plus retained ordinary/base worksheet calculations. It is not public full-return, XSD, source-authentication or filled-PDF evidence. Public graph source joins, final native/PDF replay and actual6251 reconciliation remain to be completed before integration credit. Existing elected-gain, foreign-exclusion and conflicting historical2022/2023 ScheduleD guards remain until their source/allocation rules are resolved.

Primary rule: [2025 IRS ScheduleJ instructions](https://www.irs.gov/instructions/i1040sj), lines4/8/12/16 require the applicable current/base worksheet; base tax-rate schedules replace the regular prior-year TaxTable in those calculations. [2025 Form6251 instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf), line10 requires tax recomputed without ScheduleJ.

## Actual public graph and export work, October 6

The isolated source-return stage now reruns the actual graph without averaging and derives its current preferential operands from `income_tax_calculation`, rather than accepting caller-supplied taxes. The owned farm plus investment-income allocation is reconciled to actual AGI sources. Public private operands are rejected. The final native/PDF guards require the retained source replay, and the pension/AMT join uses the sourced preferential worksheet when refiguring tax without Schedule J.

Actual graph evidence: no diagnostics; J lines3/4/23 =156111/27614/29357;1040 line16=30187;6251 line10=31214 and AMT55517. Typecheck passed. The new complete-packet test is **not passing**: after the actual source graph and AMT/source replay assertions, MeF correctly rejects missing identified per-business Form8995-A details. The200000 farm plus dividends crosses the QBI threshold; the existing farm-to-advanced-QBI route needs an actual source-backed business projection before this packet can be filed. Retained logs `/tmp/opentax-schedulej-public-source-v1-tests.log` (strict ScheduleJ source/lines projection defect, repaired), `/tmp/opentax-schedulej-public-source-v2-tests.log` (9passed/1failed, Form8995-A business source). This is an existing return-wide QBI/source obligation under the frozen board, not a new future task or completion claim. Do not lower the farm income, fabricate a business source, bypass the exporter, or credit the route from graph results alone.

The root checkout is based on current58fc3921d plus the distinct prior/current worksheet foundation. QEF/education/adoption innermost graph callback composition is coordinated with the QEF agent, but not yet integrated. Prior filed source authentication, elected capital gain, foreign exclusions, historical ScheduleD rules and broader allocation scope remain open.

## Actual farm advanced-QBI source route resolves the packet gap

The same200000 farm receipt case now retains the farm EIN, complete cash-farm item, actual owner and independently derived13596 half-SE deduction. AdvancedQBI186404 has20%37281, pre-QBITI203654, phase-in6354/50000=12.708%, reduction4738 and deduction32543. Qualified dividends30000 reduce the final income-cap base to173654 and cap34731; the business limitation32543 binds. No receipt, dividend, ISO or pension amount was reduced to pass. Zero paid wages/UBIA are checked against this actual source; paid payroll, qualified property, multiple businesses, health/retirement allocation, other filing statuses and earlier accepted-source records remain wider parent work.

The native and direct-PDF guards independently join the retained farm item, source owner, independently computedSE, actual1040 income/adjustments and investment-tax source capital total. Nonzero qualified dividends are admitted only through this retained farm source; legacy unsourced zero-dividend assertions retain their export guard. Public private-tax operands and missing replay-marker/calculation-operand attempts reject.

Checked compatibility95/0(9s), `/tmp/opentax-schedulej-farm-qbi-source-v4.log`; final checked source3/0(7s), `/tmp/opentax-schedulej-farm-qbi-source-v5.log`, including both full2025v5.4XSD packets, native/directPDF owner/SE conflicts and actualJ/tax drift. Heldsource/pending/XMLonlyReturnTs/PDF/origins replayPASS2/36, `/tmp/opentax-schedulej-farm-public-held-v1.log`. Root visually inspected every one of the19J and17no-J PDF pages in thirteen contact sheets. Actual Form6251 PartIII/no-J line10,4972 specialtax,SE,NIIT and8995A phase-in join the1040 packet. PDF hashes9d0bdaf34e908b7c6e5cfc3e31ac88cb61ffc61b841d8e7ac5436130b7a3286d and4ede182fb6bc58d6f64c7eb3c7149fe33a8883190ed01f29e77126b48be839e6; visual manifest `/tmp/opentax-schedulej-farm-public-rendered-oct6/visual-review-manifest.json`, held originals `/tmp/opentax-schedulej-farm-public-reviewed-oct6`.

The first prior-pension preservation run11/1 failed solely because `pdftotext` was absent from PATH. The same checked command with the existing Poppler environment is running; no production or source change was made for the environment. Root changes remain isolated and uncredited pending prior output preservation, current-main integration and staged-credit/QEF callback composition. The broader frozen ScheduleJ/6251/QBI parents remain open, including elected farm gain, foreign-exclusion and verified historical2022/2023 ScheduleD/allocation rules.

Primary advanced-QBI rule: [2025 IRS Form8995-A instructions](https://www.irs.gov/instructions/i8995a), per-business phase-in and qualified-dividend-inclusive net-capital-gain income cap.

Final prior-pension/J preservation gate12/0(58s), `/tmp/opentax-schedulej-pref-pension-preservation-v2.log`, with the correct existing Poppler PATH. Eight reviewed prior pension/preferential/ISO packets76pages retain all40 source/pending/PDF/text/origin artifacts byte-identically; XML differs onlyReturnTs. Comparison `/tmp/opentax-schedulej-prior-pension-preservation-comparison.json`. Initial inventory comparison included nonpacketexpected.json and failed on its missing generated counterpart; the actual explicit8×5 packet inventory then passed40/40. This does not credit an empty/skipped inventory. No prior source/template/tax was altered. Source-stage code43cdd2906 is now ready for staged-credit callback composition and fresh current-main integration proof; broader ScheduleJ/AMT/QBI parents remain open.

## Actual Schedule J composition with staged credits and QEF

The public executor now uses `executeScheduleJSourceReturn` as the inner
graph for Form 8839 and Form 8863's source-dependent stages, for the filed
QEF return, and for every without-QEF counterfactual. The Schedule J native
and PDF guards replay the **whole** staged source return when an adoption,
education, or QEF marker follows the inner J graph. They still require the
J source marker and compare the complete normalized pending dictionary.
The QEF source guard independently repeats the same complete calculation.
No caller supplies a tax, worksheet operand, or credit scalar for the shadow.

A separate Alex-owned source packet retains the public Schedule J farm
election, actual $180,000 issued 1099-G agricultural payment plus $20,000
issued 1099-NEC custom work, one named cash Schedule F proprietor,
an issued $400/$100 qualified-dividend copy with dated holding review, the
existing reviewed Alex adoption decree/payment PDFs, and the independently
identified QEF issuer/annual/activity records. Farm profit is $200,000; the
original Ada $200,000 farm/$35,000 ordinary and $30,000 qualified dividend/
$240,000 ISO/$830 special pension tax packet remains unchanged. The Alex
combined packet has Schedule J line 23 **$24,212**, Schedule 3 adoption
credit **$6,000**, and Form 8621 lines 9a/9b/9c
**$45,404/$45,020/$384**. Form 1040 line 24 is **$45,020**. A second
Alex packet without QEF retains the adoption credit, and an issued Alex
1098-T/tuition/payment/scholarship packet proves the education source stage
at its actual income phaseout. The latter correctly has no Form 8863 copy or
current education credit at this income; its QEF counterfactual still replays
the same school evidence and the changed return-derived worksheet.

All three new native packets validate against the local full TY2025 v5.4
XSD. Their real PDFs have 18, 15, and 16 pages, all reviewed in
`/tmp/opentax-schedulej-qef-staged-rendered-oct6/` contact sheets.
The PDF SHA-256 hashes are respectively
`fee4ec8dc4800546f2eb3030f29443c3c1f2934b28ba8fb93be845885deeee8d`,
`99d6cb98dd69153addcf6583da621930f489ad18dad491430cbcb88b65a9c570`,
and `d178455d728819b3144d7fdf431241ff46b3aa57a3fceb277f93eeceb44e6520`.
Source/pending, XML, PDF, and page origins are retained under
`/tmp/opentax-schedulej-staged-positive-oct6/`. Native and direct PDF
reject a changed J worksheet amount, QEF deferral, adoption credit, or
issued farm payment. The original Ada packet plus an added QEF claim is
rejected because its net-investment tax changes; the Chapter 1 election
cannot defer that Schedule 2 tax. Combined adoption and education credits,
Form 8990's two-pass return, broader farm allocation, and other wider parent
routes remain guarded.

The local QEF source/AMT/adoption/education preservation gate passed 24/0
in `/tmp/opentax-schedulej-qef-preservation-oct6.log`. Its 17 reviewed
packets and 172 pages preserve all PDF and source/pending/origin bytes;
XML differs only by `ReturnTs`, as recorded in
`/tmp/opentax-schedulej-qef-preservation-compare-oct6.log`.
The original J/no-J 2 packets and 36 pages preserve source/pending/PDF/
origins exactly and XML only differs by `ReturnTs` in
`/tmp/opentax-schedulej-qef-staged-base-oct6/`. The eight prior pension/
AMT packets and 76 pages preserve all 40 reviewed artifacts exactly apart
from XML `ReturnTs`; comparison is in
`/tmp/opentax-schedulej-qef-prior-pension-compare-oct6.log`.
