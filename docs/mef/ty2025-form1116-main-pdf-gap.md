# TY2025 Form 1116 main PDF category boundary

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
