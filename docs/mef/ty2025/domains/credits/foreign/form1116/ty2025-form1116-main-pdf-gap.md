# TY2025 Form 1116 main PDF category boundary

## October 9 passive country and current-excess packet checkpoint

Seven existing synthetic source cases now have complete prepared-return tests,
retained native XML and eight-page PDFs. All seven XML returns pass the cached
TY2025 v5.4 XSD. All 56 pages were visually reviewed through 32 unique page
hashes: Form 1040, Schedule 3, income Schedule B, two parent Form 1116 pages,
and two foreign-credit Schedule B pages in each packet.

| Case | Interest | Ordinary dividends | Credit / regular tax | Current excess |
| --- | ---: | ---: | ---: | ---: |
| Two-country dividends | 0 | 50,000 | 3,875 | 1,125 |
| Two Canadian dividend payers | 0 | 50,000 | 3,875 | 1,125 |
| Two-country mixed | 20,000 | 30,000 | 3,875 | 1,125 |
| Two-country interest | 50,000 | 0 | 3,875 | 5,125 |
| Multiple Canadian interest payers | 50,000 | 0 | 3,875 | 5,125 |
| Three-country interest | 60,000 | 0 | 5,075 | 5,925 |
| Three-country mixed | 30,000 | 30,000 | 5,075 | 925 |

Expected regular tax comes independently from the [2025 IRS Tax Table](https://www.irs.gov/publications/p1040):
single taxable income 34,250–34,300 gives 3,875; 44,250–44,300 gives 5,075.
All income here is ordinary foreign passive income, standard deduction is
15,750, the credit absorbs regular tax, and final tax is zero. Canada/France
and Canada/France/Germany columns, proportional deductions, interest/dividend
tax rows, parent credit and current-excess carry totals reconcile.

The packet tests also reject altered income, final credit, Schedule 3 credit,
missing carry schedules and changed source amounts, countries, references and
recipient identities at native preparation and fresh PDF construction without
an old prepared bundle. The final typed grouped gate passes 195 tests with no
failures, including 64 native and 64 fresh-PDF rejection assertions.

These are reviewed structured synthetic records, not authenticated issuer
copies or accepted prior returns. The carryback review has a zero prior balance;
this checkpoint verifies current excess, not imported historical vintages.
Form 1040 line 24 remains blank at zero (deferred76); parent Form 1116 line h
also remains blank, with residence intake/projection review deferred107.
Do not infer residence from a mailing address. The main task stays open for
broader categories, K-3 combinations, carry histories, redeterminations, source
authenticity, business rules and IRS acceptance. This checkpoint supersedes
historical unrun/visual-pending statements only for these seven packet shapes.

Retained evidence: `.state/research/form1116-passive-packets-2026-10-09/`,
including the review manifest, rendered sheets, qualification and test logs.

## Shared IRS country-code validation (2026-10-05)

Retained Form 1116 and related foreign-source paths now use a shared exact
258-code allowlist extracted from the local TY2025 `Common/efileTypes.xsd`.
The source, intermediate calculation, native export, and PDF export reject
unlisted codes; Germany `GM` passes a full-return local XSD case while ISO
`DE` and unknown `ZZ` reject. The foreign-employer country field remains a
separate ISO-coded field. This checks code membership, not whether every
issuer's stated country matches the economic source of income. The integrated
affected test suites passed 163/163; broader source authentication, visual
page review, IRS business rules, and ATS acceptance remain open.

## Three-country Germany code correction (2026-10-05)

The assembled three-country interest return exposed an invalid Germany
`ForeignCountryCd`: its source and PDF fixtures used ISO `DE`, but the TY2025
MeF schema enumerates IRS country code `GM`. The interest fixture now uses
`GM`, and its shared native/PDF reconciliation rejects a Germany Form 1099-INT
with `DE`. The mixed interest/dividend route's source check, native item match,
and printable country C also use `GM`. Both bounded examples built prepared
native returns and filled PDF packets with two Form 1116 parent pages and two
Schedule B pages; both assembled XML returns passed the local TY2025 v5.4 XSD.
The seven focused cases passed. This verifies those synthetic shapes and their
page presence; country-code coverage for every other possible source, issued
copy authentication, visual page review, IRS business rules, and ATS remain open.

## Three-country passive-interest prepared packet visual review (2026-10-05)

Built the bounded Canada/France/Germany interest return from the focused
`three-country passive interest` fixture, assembled its native MeF bundle and
filled PDF, then rendered all pages with Poppler `pdftoppm` 26.09.0 at 150 dpi.
The reviewed packet has eight letter-size pages in this order: Form 1040 pages
1–2, Schedule 3, Form 1040 Schedule B, Form 1116 pages 1–2, and Schedule B
(Form 1116) pages 1–2. The owner is Alex Example, SSN `111223333`, consistently
printed on each document's identity header.

The printed amounts agree with the fixture and generated native XML: Form 1040
line 2b and worldwide interest are $60,000; Form 1116 columns A/B/C show
Canada $20,000/$4,000, France $30,000/$5,000, and Germany
$10,000/$2,000. The apportioned standard deduction is $5,250/$7,875/$2,625;
Form 1116 allows $5,075, matching Form 1040 line 16, Schedule 3 lines 1 and 8,
and Form 1040 line 20. Schedule B (Form 1116) reports $5,925 of current-year
excess carried forward. Form 1040 Schedule B lists the three matching payer
names and interest amounts. The reviewed page layouts showed no clipping,
overlap, missing pages, or page-order issue. A first rendering exposed that Part
I row i printed IRS codes `CA`/`FR`/`GM` even though the form requests country
names. The PDF projection now uses the TY2025 IRS country-name map for all three
columns, and page 5 visibly prints `Canada`/`France`/`Germany`. Native XML still
uses the corresponding IRS codes. A fresh eight-page contact review found no
other changed page; pages 1–4 and 6–8 retain their earlier rendered hashes.

Review-only source references map Canadian Bank to `2025 Canadian Bank
1099-INT`, French Bank to `2025 French Bank 1099-INT`, and German Bank to
`2025 German Bank 1099-INT`; the country and amounts match the corresponding
Form 1116 columns and Schedule B payer rows. These are synthetic reviewed
references: no issued 1099-INT bytes were attached or authenticated, and the
PDF does not print those reference strings. The assembled XML validates against
the locally retained TY2025 v5.4 `Return1040.xsd`.

Generated artifacts remain untracked in `.pdf-cache/` for this worktree:

- PDF: `.pdf-cache/three-country-form1116-interest.pdf`, SHA-256
  `e094253a5d942daecc26aa93c6af715735b3fb35fbce2b8346f8e203c0fd602a`.
- Native XML: `.pdf-cache/three-country-form1116-interest.xml`, SHA-256
  `deea823716ff39a9d27af8cc3b8d7e2f5d696993252c56b9838fad8eb4d96c89`.
- The eight 150-dpi page PNG hashes are listed in
  `.pdf-cache/three-country-form1116-interest-render-manifest.txt`, whose SHA-256
  is `e893110938e9a6a84bba7c78d428b9440d800aac051f9c13f75719e3f75e50b4`.
  Corrected page 5 is
  `e8b8137d6dcaa93b308bd8a5baf763681504a2c0d9555b6810d93fe73e388d64`.

The broader Form 1116 PDF and source test files passed (78/78), including all
previously code-valued PDF country expectations.
The isolated worktree lacks the ignored local XSD cache, so its test skips that
optional check. Manual `xmllint` passed against the retained TY2025 v5.4
`Return1040.xsd` in the main repository. Source-byte authentication, other
combinations, IRS business rules, and ATS acceptance remain open; the review establishes only
this prepared synthetic route and its printed PDF output. The PDF builder
reported removing XFA form data, and `pdfinfo` reports no AcroForm; this review
verifies the visible rendering, not interactive field behavior.

## Two ordinary foreign dividend payers in separate countries (implementation authored; bulk validation pending)

Two separately identified Forms 1099-DIV with ordinary, entirely foreign-source
box 1a dividends and box 7 paid tax now occupy passive Form 1116 country
columns A and B when their reviewed IRS country codes differ. A distinct
`two_country_dividend_pdf_review` binds each payer's source reference and
country. The source guard checks distinct payer and document identities,
holding-period reviews, no qualified dividends or unrelated boxes, each
Form 1116 item's income/tax/country, pro rata standard-deduction columns,
Schedule 3, and Form 1040. Native MeF prints separate country source groups;
the PDF prints the two dividend tax rows and their respective income and
deductions. Positive and tax/country/payer/holding/return tamper fixtures are
authored but unrun. Other income or deductions, preferential dividends,
more payers, underlying issued-document authentication, filled-PDF/XSD review,
and IRS acceptance remain open.

## Two ordinary foreign dividends from one country (implementation authored; bulk validation pending)

Two distinct identified Forms 1099-DIV may now supply ordinary, entirely
foreign-source box 1a dividends and box 7 paid foreign tax for one passive
country. A separate `two_dividend_pdf_review` names both source references and
affirms the existing Part I-IV inventory constraints. The two input rows must
have distinct payer names and document references, the same IRS country code,
qualifying holding-period reviews, and no qualified dividend, nominee, other
monetary box, or unrelated income. Their box 1a and box 7 amounts reconcile
one-to-one to the two Form 1116 tax items, the preference review, Schedule 3,
and Form 1040. Native MeF groups their same-country 1099 taxes into its
dividend withholding amount; the PDF prints the summed income and tax in
country column A and Part II's dividend row. Positive and source/return tamper
fixtures are authored but have not been run under the requested single bulk
validation pass. Distinct countries, qualified dividends, other income or
deductions, source-document byte authentication, and IRS acceptance remain
outside this bound.

**Three-country interest and ordinary dividends (written, unrun):** Two
separately issued Forms 1099-INT with foreign box 1/box 6 interest in Canada
and Germany and one French corporation Form 1099-DIV with nonqualified foreign
box 1a/box 7 dividends now occupy passive Form 1116 country columns A/C and
B, respectively. A distinct three-column review binds each issued copy and
country; the dividend retains its 31-day holding and no-related-payment
review. The source guard checks the three tax kinds and Part II rows, no other
statement income, five-decimal standard-deduction allocation, Schedule 3,
Form 1040 interest/dividend/taxable-income/tax totals, native MeF, and the
parent PDF. Full-return positive and interest, dividend, review, and return
tamper fixtures are authored for the deferred batch. The
[2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
direct country-by-country Parts I and II and an additional attachment only
after three countries. This bounded case excludes qualified dividends,
domestic income, same-country multiple payers, source-byte authentication,
and filled-output/XSD verification.

**Three-country 1099-INT passive interest (written, unrun):** Three separately
issued 2025 Forms 1099-INT, one each from Canada, France, and Germany, now
carry positive foreign box 1 interest and box 6 U.S.-dollar tax through one
passive Form 1116. The explicit `three_country_interest_pdf_review` binds
each document reference and IRS country code to Part I columns A/B/C and
Part II tax rows A/B/C. Its source guard checks distinct payers and countries,
all source boxes, the three five-decimal standard-deduction allocations,
Schedule 3 line 1, Form 1040 interest/taxable income/tax, and the matching
current-year excess on Schedule B. Native MeF groups each country separately;
the parent PDF writes all three columns and rows. Full-return positive and
source, review, Schedule B, and return-tamper fixtures are authored for the
deferred bulk gate. Column C and row C field paths were checked against the
canonical blank 2025 AcroForm. The [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
require country-by-country columns and lines and an additional attachment only
for more than three countries. Domestic income, multiple payers in one country,
mixed income categories, source bytes, and filled-output/XSD inspection remain
open.

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
return tamper cases are authored for deferred validation. Multiple payers per
country, domestic income, other tax kinds, source bytes,
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
[the line 1b audit](./ty2025-form1116-alternative-compensation-gap.md). Other
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

**One foreign-interest payer plus a U.S. bank-interest payer (implementation
staged, unrun):** A reviewed Form 1099-INT with entirely foreign-source box 1
interest and positive box 6 tax can share the return with a distinct domestic
bank Form 1099-INT whose only positive box is U.S.-source box 1 interest. The
single-source review identifies both issued statement references separately.
The native and parent PDF preflights replay the two statements, foreign Part I
line 1a, worldwide Part I line 3e, five-decimal standard-deduction allocation,
Schedule 3 line 1, and Form 1040 interest, income, taxable-income and tax lines.
Positive and altered domestic amount, document reference, foreign tax, and
final-return fixtures are authored for the deferred batch. The
[2025 Form 1116 line 3e instructions](https://www.irs.gov/instructions/i1116)
require gross income from both U.S. and foreign sources in the worldwide
denominator. Other 1099 boxes, more payers, mixed income, source-byte
authentication, filled-output/XSD review, and IRS acceptance remain open.

**Current-year excess final-credit join (written, unrun):** For a sourced
positive Form 1116 with current-year excess and no prior carryover, the parent
native and PDF projections now compare a supplied final Schedule 3 line 8 to
Form 1040 line 20 and require that total to cover the allowed foreign tax
credit. This closes a parent-path gap where the two totals could differ even
though Form 1116 line 35 matched Schedule 3 line 1; prior-carryover claims
already had a final-total check. The check applies whenever either final-total
field is present, while isolated calculation projections with neither field
remain source components rather than complete returns. A full-return 1099-INT
positive case and altered Schedule 3/Form 1040 totals are authored for the
deferred pass. The [2025 Schedule 3](https://www.irs.gov/pub/irs-pdf/f1040s3.pdf)
directs line 8 to Form 1040 line 20. This join does not authenticate the
1099-INT or the filed prior-year Form 1116 reviewed for the excess carryover.
