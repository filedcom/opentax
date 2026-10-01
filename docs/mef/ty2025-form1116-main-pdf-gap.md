# TY2025 Form 1116 main PDF category boundary

**Two-country interest and ordinary dividends (written, unrun):** One issued
Canadian Form 1099-INT with foreign box 1/box 6 and one issued French
corporation Form 1099-DIV with nonqualified foreign box 1a/box 7 and France
in box 8 now occupy
separate passive Form 1116 country columns. A single
`two_country_mixed_pdf_review` binds each column to its exact source copy and
country. The existing dividend holding review establishes the qualifying
31-day period and absence of a related-payment obligation. The source guard
checks the separate income and tax kinds, exclusion of other statement boxes,
both five-decimal standard-deduction allocations, Schedule 3 line 1, and
Form 1040 taxable interest, ordinary dividends, taxable income, and tax.
Native MeF emits two country sources; the parent PDF puts interest withholding
in Part II row A and dividend withholding in row B. Positive full-return and
source, country, holding, review, and return-tamper fixtures are authored for
deferred validation. Requiring the French country in Form 1099-DIV box 8
excludes the RIC pass-through reporting pattern, for which the issuer leaves
box 8 blank under the [Form 1099-DIV instructions](https://www.irs.gov/instructions/i1099div).
This bound excludes qualified dividends,
domestic income, additional payers, source bytes, and filled-output/XSD review.
The [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
direct separate country columns in Parts I and II and permit U.S.-dollar
Form 1099-INT/1099-DIV taxes in Part II with “1099 taxes” as the date.

**Two foreign countries with same-issuer Treasury box 3 (written, unrun):**
One Canadian Form 1099-INT now supplies foreign box 1/box 6 and domestic
U.S. Treasury box 3 on the same issued statement; a separate French Form
1099-INT supplies the second foreign box 1/box 6 country. The existing
two-country Treasury review binds the domestic source reference to the
Canadian foreign-tax source reference, with exactly two reviewed issued
statements. Native and parent PDF replay both foreign country columns,
Form 1116 Part I's $60,000 worldwide-gross denominator and per-country
standard-deduction apportionment, Part II interest taxes, Schedule 3 line 1,
and Form 1040 taxable interest. Positive full-return and box-3, document,
tax, country, review, and return tamper cases are authored but unrun. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) require
both U.S. and foreign income on line 3e; the
[Form 1099-INT instructions](https://www.irs.gov/instructions/i1099int)
identify box 3 as U.S. Treasury interest separate from box 1. Other mixed
boxes, more payers, source bytes, and filled-output/XSD review remain open.

**Two foreign countries plus a distinct domestic Treasury payer (written,
unrun):** One foreign box-1/box-6 Form 1099-INT payer in each of two countries
and one Treasury-only box-3 payer can share a passive Form 1116. The explicit
`two_country_treasury_pdf_review` records the two country-column sources and
the domestic Treasury source separately. The calculation uses all three
issued payers for worldwide gross income and allocates the standard deduction
to each foreign country at its five-decimal share of that denominator. Native
country sources and parent PDF columns A/B retain only the two foreign gross
and tax amounts; Part I line 3e uses worldwide interest including Treasury.
The shared export guard reconciles all three source references, boxes,
country codes, Form 1040 line 2b/9/11/12a/15/16 and Schedule 3 line 1.
Positive and domestic/foreign payer, country, review, and return tamper
fixtures are authored for deferred validation. Multiple Treasury or foreign
payers per column, source bytes, and filled-output/XSD review remain open.
The [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
govern Part I's worldwide-gross allocation.

**Two-country 1099-INT passive interest (written, unrun):** Two distinct
issued Form 1099-INT payers may occupy Form 1116 country columns A and B when
each reports only foreign box 1 interest and box 6 tax, their IRS country
codes differ, and those items make up all worldwide income and foreign tax.
The explicit `two_country_interest_pdf_review` identifies one document
reference and IRS country code for each column; it cannot coexist with the
single-source, same-country multi-payer, or interest/dividend review. The
source ledger checks both payers, each native country source, each five-decimal
standard-deduction allocation, their aggregate limitation, Form 1040 line
2b/9/11/12a/15/16, and Schedule 3 line 1. The parent PDF populates Part I
columns A/B and Part II U.S.-dollar interest-tax rows A/B from the same
ledger. A full-return positive case and payer, country, tax, review and
return tamper cases are authored for deferred validation. A third country,
multiple payers per country, domestic income, other tax kinds, source bytes,
and filled-output/XSD review remain open. See the [2025 Form 1116
instructions](https://www.irs.gov/instructions/i1116).

**One foreign 1099-INT plus one ordinary foreign 1099-DIV, same country
(written, unrun):** A distinct bank and fund statement may contribute one
positive foreign box-1/box-6 interest item and one positive nonqualified
foreign box-1a/box-7 dividend item to one passive country column. The new
`mixed_interest_dividend_pdf_review` names each source separately and retains
the Part I–IV affirmations; the existing single and all-interest multi-payer
review meanings remain unchanged. The calculation and native country source
round the full standard deduction once against aggregate foreign/worldwide
income. Native and PDF export replay each source, the dividend's qualifying
31-day holding review and absence of related payments, both tax kinds and
their separate Part II columns, Form 1040 lines 2b/3b/9/11/12a/15/16, and
Schedule 3 line 1. A full-return positive case and changed interest, dividend,
holding, source-reference, review-conflict, and return fixtures are authored
for deferred validation. More payers, mixed countries, qualified dividends,
domestic income, source bytes, and filled-output/XSD review remain open. See
the [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116).

**One ordinary foreign 1099-DIV payer (written, unrun):** A sole issued
Form 1099-DIV with positive box 1a ordinary dividends and box 7 foreign tax
can feed one passive Form 1116 country column when the full box 1a amount is
reviewed as foreign source, no box 1b qualified dividends or other monetary
boxes are present, and its source reference matches the Form 1116 review.
The payer's reviewed holding ledger records the ex-dividend date, at least 16
qualifying days within the 31-day window, excluded diminished-risk days, and
absence of a related-payment obligation. The ordinary-stock holding rule is
affirmed; preferred stock with a longer required period stays closed. The
calculation carries that source reference with the tax item, and native/PDF
export replays the payer, holding ledger, country, Form 1040 line 3b, taxable
income and tax, and Schedule 3 credit. The PDF projects the U.S.-dollar
dividend withholding to Part II column q. A full-return positive case and
source, holding, and return tamper cases are authored for deferred validation.
Mixed interest/dividends, multiple payers, qualified dividends, nominee
distributions, source bytes, and filled-output/XSD review remain open. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) state
the dividend holding-period and related-payment limits.

**Multiple same-country foreign 1099-INT payers (written, unrun):** A distinct
`multi_source_pdf_review` names every foreign payer's document reference while
retaining the existing single-source review for its original routes. One or
more than two foreign 1099-INT payers may enter the bounded route when each has
only positive box 1 foreign interest and box 6 foreign tax, all use the same
IRS country and paid method, and the reviewed reference set matches the Form
1116 item set exactly. The source ledger rejects a changed payer, amount,
country, duplicate reference, additional monetary box, and any extra worldwide
income. Form 1116 Part I and Part II aggregate the payers in one country
column; the standard deduction is apportioned from their aggregate gross
income so per-payer rounding does not distort line 3g. The category limit,
Schedule 3 credit, Form 1040 lines 2b/9/11/12a/15/16, native XML, and parent
PDF replay the same source/return guard. A three-payer full-return case and
tamper fixtures are authored but unrun. Multiple countries, dividend/rent
tax, reductions, mixed domestic income, authenticated source bytes, and
filled-output/XSD/ATS review remain open. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) direct
same-country income to one Part I column and require worldwide gross income
for line 3e.

**One 1099-INT with foreign interest and U.S. Treasury interest (written,
unrun):** A single identified payer may now report passive foreign box 1
interest, U.S.-source Treasury box 3 interest, and box 6 foreign tax. The
foreign tax item remains box 1 only; worldwide income and Form 1040 taxable
interest equal boxes 1 plus 3. The 2025 Part I standard deduction is allocated
at the foreign/worldwide five-decimal ratio, with a whole-dollar line 3g/6
amount matching the native source group and category calculation. A shared
native/PDF guard replays all three source boxes, excludes other monetary boxes
and interest adjustments, checks Form 1040 lines 2b/9/11/12a/15/16, and ties
the allowed credit to Schedule 3 line 1. The existing affirmative one-source
review and prior-year carryback review remain required. Positive and changed
box-3/return fixtures are authored for deferred validation. Treasury securities
from another payer, bond-premium adjustments, other income, source bytes, and
filled-PDF/XSD review remain open. See the [2025 Form 1116 Part I
instructions](https://www.irs.gov/instructions/i1116).

**Two identified 1099-INT payers (written, unrun):** The same passive-interest
calculation now accepts one foreign-interest payer with box 1 and box 6 and a
separate U.S. Treasury-only payer with box 3. The Treasury payer has its own
source-document reference, distinct payer name and no foreign-tax or other
monetary boxes; the affirmative Form 1116 review identifies both references.
The native/PDF source guard requires exactly those two Form 1099-INT rows,
checks the foreign payer against the single Part II tax item, and recomputes
the five-decimal standard-deduction apportionment from combined worldwide
interest. Form 1040 lines 2b, 9, 11, 12a, 15 and 16 and Schedule 3 line 1
must match. A full-return positive case and changed payer, tax, and return
cases are authored but unrun. Other payers, adjustments, income categories,
countries, source bytes, and filled-output/XSD/ATS validation remain open.

**Sole 1099-INT source inventory (staged, unrun):** The original bounded passive-interest
PDF route rejects another positive monetary box or interest adjustment on
its sole identified Form 1099-INT; the separately reconciled box-3 case above
is the only extension. The original affirmative review and return
join say box 1 is the entire worldwide income, box 6 is the only foreign tax,
and Form 1040 lines 2a, 2b, 9, and 11 reconcile to that one item. U.S. Treasury
interest from another source, tax-exempt interest, withholding, early-withdrawal penalty, bond
premium, nominee interest, and similar amounts on the same statement require a
separate source-to-return calculation before this PDF can truthfully print a
one-income-source Form 1116. The ordinary box-1/box-6 positive fixture and
box-8/box-4/box-11 tamper fixtures are authored for deferred validation; box 3
without its full route still rejects.
The broader native source model is unchanged; mixed 1099-INT payer content
remains outside this narrow PDF projection. See the [2025 Form 1116 Part I
instructions](https://www.irs.gov/instructions/i1116) for worldwide gross
income and the standard-deduction allocation.

**Reviewed prior-year passive use (staged, unrun):** The one-source 1099-INT
standard-deduction PDF route now accepts one reviewed Schedule B prior-year
balance when current-year tax is below the category limit. The public PDF
review explicitly states that the zero-carryover assertion is false. The
parent PDF reconciles line 10 to the reviewed balance, line 11 to current tax
plus that balance, lines 14 and 24 to the allowed credit, and line 35 to
Schedule 3. Its companion Schedule B must be the same passive category and
show the exact balance and oldest-first amount used. Native Form 1116 now
reconciles the companion's 2015 expiration on Schedule B line 5 before checking
the following-year balance; the earlier equality incorrectly rejected an
otherwise valid expiring vintage. A 2015-origin passive credit that is only
partly used therefore reaches the parent native/PDF, Schedule B native/PDF,
and Schedule 3 without carrying the expired dollars forward. Focused public
graph, projection, native, and tamper cases are authored for the deferred batch.
The same one-source passive boundary now admits a reviewed 2015 balance while
2025 foreign tax exceeds the category limit. Parent Form 1116 Part III uses
current tax only, Schedule 3/Form 1040 claim the limited credit, and Schedule B
line 5 expires the entire unused 2015 amount while lines 6/8 carry only new
2025 excess. The parent PDF checks the companion's combined case, source
category, balance, zero prior use, and current excess; native MeF and the
two-page Schedule B PDF replay those amounts. A full-return and balance/excess
tamper fixture is authored but unrun. The filed 2024 Schedule B source remains
a reviewed transcription; issued return bytes are not authenticated. Other
baskets, mixed income, and multiple parent PDF items remain closed in this
slice. [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
and [Schedule B instructions](https://www.irs.gov/instructions/i1116sb)
govern oldest-first use and expiration.

**Two unexpired prior-year vintages (written, unrun):** A reviewed filed 2024
passive Schedule B line 8 can supply separate 2023 and 2024 balances to a
single-source 2025 interest return. The 2025 limitation first consumes the
2023 balance and then part of the 2024 balance. Parent Form 1116 line 10 and
the allowed credit, Schedule B lines 1/4/8 in both vintage columns, Schedule 3
line 1, and Form 1040 line 20 are joined in the full-return fixture. Native
MeF and the two PDFs are authored for this same case. The parent PDF now
compares the Schedule B vintage source to the filed prior-year intake, so a
changed vintage split with an unchanged total is rejected; it also checks
Form 1040 line 20 against Schedule 3 line 8. Changed utilization, vintage
sum, vintage split, and return-credit fixtures are authored for the deferred
batch. The filed Schedule B remains a reviewed transcription rather than
authenticated filing bytes. See the [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
and [Schedule B instructions](https://www.irs.gov/instructions/i1116sb).

Build-first public intake and standard-deduction route (2026-09-29):
`form1116_review` now carries the typed affirmative single-source PDF review
directly into the Form 1116 calculation. One documented Form 1099-INT can be the
sole income and foreign-tax source on a single Form 1040. For a filer taking the
standard deduction, the PDF reconciles that sourced deduction to Form 1040 lines
12a and 14, Form 1116 lines 3a, 3c, 3g, and 6, and the resulting lines 7, 15,
17, 19, 24, and 35. It requires one country, one passive interest tax, matching
1099-INT box 1/box 6/country/document reference, worldwide gross income equal to
that sole gross interest amount, no other income, losses, adjustments,
deductions, or special-rate items, and an identified prior-year zero-carryback
review when current foreign tax exceeds the limit. Schedule B must reconcile its
current-year excess to the parent category. The focused public-review file now
passes 3/3 cases covering source/graph, PDF projection, excess, mixed-income,
gross-income, tax mismatch, and missing review. This is not a full category or
filled-output pass. The generic `agi_aggregator` gross figure is not an IRS
gross-income calculation for every return; this PDF route only uses it when it
equals the sole identified Form 1099-INT gross interest. Mixed income, itemized
deductions, multiple countries, and unrelated adjustment paths remain closed.
The [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) direct
nonitemizers to enter their standard deduction on Part I line 3a and use foreign
and worldwide gross income on lines 3d and 3e.

Build-first line 12 extension (2026-09-28, unrun): a Form 1116 item can now
carry a positive, document-referenced Schedule K-3 Part III section 4 foreign
tax reduction already apportioned to its separate category. The reduction cannot
exceed that item's gross foreign tax. Part II and line 8 keep the gross tax,
line 12 reports the reduction, and line 14, the allowed credit, and any
current-year excess/carryover use the net creditable tax. The MeF serializer
reconciles the line 12 total back to the source items and, for the bounded
partnership passive-interest path below, to the K-1/K-3 source. The passive
single-source PDF maps that joined path; the general-wage PDF still rejects it.
This does not calculate Form 2555, boycott, section 909, or other line 12
reductions, nor does it turn a Schedule K-3 reduction into a generic manual
adjustment. Focused calculation, excess, over-reduction, XML, and mismatch cases
are written but unrun. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) place the
already apportioned Schedule K-3 reduction on line 12.

**Source-joined 1065 K-3 combination (2026-09-28, unrun):** A new bounded
passive-interest path accepts one partnership K-1 and its typed Schedule K-3
source. K-3 Part II Section 1 line 6 interest and line 24 passive gross income
must both match K-1 box 5, K-1 box 16 income, and the only Form 1040 taxable
interest. K-3 Part III Section 4 line 1 gross tax and line 2 reduction must
match K-1 box 16 and the Form 1116 item, with the same entity EIN, document,
country, payment date and foreign-currency conversion. An affirmative review
identifies that K-3 reduction as the only line-12 reduction. The projection
prints gross Part II/line 8, line 12 reduction, net line 14, allowed line 24,
and requires matching Schedule 3 and net-tax Schedule B excess when applicable.
The source and PDF mismatch cases are written but unrun. This does not open
S-corp K-3, multi-country, mixed-income, noninterest, multiple-partnership,
other K-3 reductions, or unreviewed source paths. A bare
`schedule_k3_line12_reduction` remains fail-closed in PDF. The official
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116) direct K-3
Section 4 line 1 to Part II and line 2 to Form 1116 line 12; the
[2025 partner instructions](https://www.irs.gov/instructions/i1065sk3) identify
Part II Section 1 line 6 as interest and line 24 as gross income by category.

The native MeF builder now applies that K-1/K-3 source join too when an item has
a Schedule K-3 line-12 reduction. It requires exactly one matching partnership
source for the item, agrees on entity and document IDs, K-1 boxes 5/16, K-3
income and tax lines, country, paid date and conversion, and rejects a
contradictory 1099-INT reporting flag. A bare reduction can no longer pass
native export merely because its item and category totals agree. The PDF path
also explicitly rejects the contradictory 1099 flag. Source-join positive,
missing-source, tampered-source and double-reporting cases are written but
unrun. The join checks supplied structured facts; it does not authenticate the
issued K-1/K-3 documents. Wider K-3 variants remain outside this bound.

**Source-joined 1120-S K-3 combination (2026-09-28, unrun):** A distinct
single-source passive-interest route now accepts one S-corporation K-1 box 4
interest item and its identified Schedule K-3 (Form 1120-S). Part II Section 1
lines 6 and 24 must equal K-1 box 4 and box 14 foreign income; Part III Section
3 lines 1 and 2 must equal K-1 box 14 tax and the Form 1116 line-12 reduction.
The source also reconciles corporation EIN, K-1/K-3 document references,
country, paid date, and foreign-currency conversion. Native MeF and the
single-source PDF now require that join, and the PDF still requires a sole
foreign-interest Form 1040 and affirmative review of all Part I deductions and
carryovers. Positive, missing-source and tampered-source cases are written but
unrun. This does not open multiple S corporations, other K-3 items, section 962,
mixed-income, multi-country, or positive expense-apportionment paths. The
[2025 shareholder K-3 instructions](https://www.irs.gov/instructions/i1120sk3)
send Part III Section 3 line 2 to Form 1116 line 12 and Part II line 24 to Form
1116 Part I line 1a. Issued-document authenticity remains unverified.

The one-income-source bound additionally checks Form 1040 line 9 equals the same
foreign-interest amount, line 10 and every other income component (wages,
tax-exempt interest, dividends, retirement, Social Security, gain and Schedule 1
additional income) is zero or absent, and no 1099-INT/OID source collection is
pending. A focused unrun case injects additional income and must reject the
positive PDF.

A further bounded 1099-INT passive-interest projection is written, unrun. It
requires one identified 1099-INT row whose box 1 and reviewed foreign-source
interest are the same sole Form 1040 income, whose box 6 U.S.-dollar foreign tax
and country exactly match the sole Form 1116 item, and whose document reference
matches the affirmative Part I-IV review. The same standard-deduction,
zero-carryover, regular-tax and Schedule 3 reconciliation applies. Per the 2025
instructions' Part II exception, the projection prints `1099 taxes` in column
(l), leaves the foreign-currency tax cell blank, and prints the U.S.-dollar
interest tax in column (s). Other 1099 payers, mixed income, noninterest tax,
and 1099 items with a separate conversion/date claim remain closed.
Source-to-projection and mismatch cases are written but unrun.

The one-source paid passive-interest PDF projection now also covers a 2025
foreign tax amount above the computed category limit, when a matching sourced
Schedule B records the current-year excess. The same single-source and
standard-deduction checks still apply. The PDF requires the Schedule B category
and excess amount to equal the Form 1116 category summary and recomputes the
credit on lines 23–24 and 27. Schedule B's review must identify filed 2024 Form
1116 line 23 equal to line 24 and a zero filed prior Schedule B line 8 balance,
so this slice has no unresolved 2024 carryback or older balance. The
[2025 Form 1116 line 10 instructions](https://www.irs.gov/instructions/i1116)
require Schedule B when current-year excess creates a carryover. Focused source,
main-PDF, Schedule B PDF, native reconciliation, missing-companion, amount
mismatch, and unresolved-carryback cases are written but unrun. A prior balance,
positive carryback, multi-source tax, and multiple categories remain outside the
main PDF projection.

The [2025 Form 1116](https://www.irs.gov/pub/irs-prior/f1116--2025.pdf) requires
a separate category calculation. The
[2025 instructions](https://www.irs.gov/instructions/i1116) require Part II to
show foreign tax in both foreign currency and U.S. dollars except for the Form
1099 passive-tax exception. Part I shows country-specific income and deductions,
Part III the limitation, and Part IV the combined category credit.

Two bounded positive PDF projections are now written. The first requires exactly
one paid, non-1099 passive-category interest-tax item from one country, with a
2025 payment date, referenced foreign income and foreign-currency tax, and a
USD-per-unit rate that reproduces its U.S.-dollar tax. The item and strict
review must name the same combined income/tax source. The review affirmatively
covers all Part I deductions and losses except the sourced standard deduction,
prior carryovers/carrybacks, tax reductions, high-tax kickout, foreign-income
adjustment, section 960(c) increase, boycott reduction, preferential-rate income
and other-category credits. This is further bounded to a one-income-source
return: worldwide gross income, the foreign interest item, Form 1040 taxable
interest (line 2b), and AGI (line 11) must all be the same amount. Form 1040
lines 14 and 15 and Form 1116 lines 3a, 3g, 7, 17, and 18 must reconcile to the
same sourced standard deduction, its line 16 must match Form 1116 line 20,
regular-tax preference facts must affirm zero preferential items, Schedule 2
line 1z must be zero, and Schedule 3 line 1 must equal the recalculated category
limitation/Part IV line 35. It prints the paid checkbox, Part I column A and
totals, both Part II currency columns, every applicable Part III line and
passive/total/credit Part IV lines. The second projection is the one-employer
general-category alternative-compensation case documented in
[the line 1b audit](ty2025-form1116-alternative-compensation-gap.md). Other
active categories/items, accrued tax, other deductions, carryovers, special
rates and multi-country cases remain fail-closed in PDF; the broader native MeF
route is unchanged.

The canonical two-page TY2025 AcroForm/XFA field tree and page widgets were
inspected read-only. Its 154 field-tree entries place Part I country/column A in
page-1 `f1_04`/`f1_10` onward, Part II row A in `f1_52`–`f1_61`, Part III lines
9–24 in page-2 `f2_01`–`f2_16`, and Part IV lines 25–35 in `f2_17`–`f2_27`. The
previous map treated line-1a descriptive text as foreign income and line 6 total
deductions as foreign tax; the bounded route now uses the actual column/line
fields. No filled PDF was produced or rendered in this build pass, so canonical
field values, widgets, appearances and layout still require the deferred batch.

The source model now has typed optional per-item foreign-currency amount, ISO
currency, conversion rate and document reference plus the strict affirmative
review needed by this bounded PDF path. These facts are carried through the
calculated category summary; the PDF recomputes the conversion, Part III line
19/21/23/24 and Part IV 27/32/33/35, matching the native MeF category limit and
Schedule 3 credit. This source extension does not silently open other
currency/method combinations.

The line audit is explicit: Part I row i and line 1a identify the only
country/income, lines 2/3a–c/3g/4a–b/5/6 print reviewed zeros, lines 3d–f and 7
derive from the same one-income-source amount; Part II prints the paid box, 2025
date, foreign-currency interest tax, converted U.S.-dollar interest tax,
row/line 8 totals; Part III lines 9–24 use the item tax, reviewed zeros on
10/12/13/16/22, computed limitation and the sourced Form 1040 line 18/20
operands; Part IV leaves other-category lines 25/26/28–31 blank because the
review confirms no other category, prints passive line 27 and lines 32–35 with
line 34 reviewed zero. The optional resident-country box h, compensation box 1b,
unused B/C country rows and Part II other-tax-kind cells stay blank because this
scenario does not trigger them. The descriptor's active-category inclusion gate
prevents zero-tax limitation-only context from creating a sparse page.

This is a **written, unrun** source-to-PDF slice, not a verified filing claim.
Focused positive, conversion-tamper, source-reference mismatch, worldwide-income
mismatch, missing preference/review, inactive-page and missing-Schedule-3-credit
cases are written. The full tests, typecheck, local XSD, filled-PDF inspection,
end-to-end return, IRS business rules and ATS acceptance are still pending. The
shared PDF builder's older sparse-copy assertion must be migrated in that batch.
