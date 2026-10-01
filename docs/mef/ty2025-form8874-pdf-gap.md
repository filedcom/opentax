# TY2025 Form 8874 PDF print route

The
[IRS Form 8874 (Rev. November 2021)](https://www.irs.gov/pub/irs-pdf/f8874.pdf)
is the current continuous-use New Markets Credit paper form. Its first page has
six line-1 investment rows, each with CDE name/address, CDE EIN, initial
investment date, qualified equity investment, credit rate, and credit. Line 2 is
the partnership/S corporation credit and line 3 is the sum. Pages 2-3 are
instructions, not filed form pages. The source PDF AcroForm has fields
`f1_03`-`f1_38` for those six rows and `f1_39`/`f1_40` for lines 2/3.

The current-year passive mixed route now prints line 1 from a self-earned
investment and line 2 from sourced partnership/S corporation code AD K-1s on the
same attached Form 8874. A bounded full return prints $5,000 and $4,000 on those
lines, $9,000 on line 3, and carries only the $4,412 allowed by Form 8582-CR to
Form 3800/Schedule 3/Form 1040. The two source families retain separate Form
3800 Part V references and Worksheet 9 balances. Positive and tamper fixtures
are authored for the deferred bulk run.

The bounded PDF route prints one source-backed `f8874` investment form when the
investment/credit amounts retain whole-dollar print precision. For more than six
investments, or when a CDE name or address cannot fit its form row, up to five
fitting investments print directly; the sixth row says "See attached" in column
(a) and reports the attached credit total in column (f), as the
[IRS instructions](https://www.irs.gov/pub/irs-pdf/f8874.pdf) require.
Supplemental PDF pages list every remaining investment with all six columns,
wrap long CDE names and addresses, and carry the filer identity. The structured
source supplies CDE identity, address, date, and investment amount;
`calculateForm8874` supplies the correct fifth/sixth-year rate and each credit.
The PDF invokes the native Form 8874 builder to check the direct Form 3800
credit and any passive Form 8582-CR sources, and shares its K-1 line-2
reconciliation. It then checks line 3 as the exact line-1-plus-line-2 sum. A
pass-through-only recipient has no `f8874` investment slot and, per the form
instructions, does not file a separate Form 8874.

Still unsupported or unverified:

- More than six source investment rows use attached detail pages. An unbreakable
  name or address token that cannot fit the statement still fails closed;
  broader text and multi-page combinations need review.
- Fractional-dollar investment or credit values are refused, because the current
  PDF writer rounds numeric fields to whole dollars and could make printed
  column (d) times rate (e) disagree with printed credit (f).
- The direct-QEI source now requires reviewed Form 8874-A issuance fields and
  reconciles them to each investment and the prepared Form 1040 owner. It does
  not ingest independently authenticated CDE documents or Form 8874-B history.
  Continuing eligibility and recapture evidence still need review before filing.
- Mixed passive/nonpassive rows and broader overflow combinations still need
  filled-output or attachment review.

The direct QEI source is **not an unregistered Form 8874 gap**: its native
`IRS8874` and PDF descriptors, Form 3800 line 1i route, passive Form 8582-CR
route, K-1 reconciliation, overflow statement, and local XSD/PDF evidence are
already present. The remaining external-evidence join is specific. The
[Form 8874 instructions](https://www.irs.gov/pub/irs-pdf/f8874.pdf) require a
qualified CDE with an allocation and a CDE-designated qualified equity
investment. The CDE's [Form 8874-A](https://www.irs.gov/pub/irs-pdf/f8874a.pdf)
identifies the CDE and investor TINs, initial investment date, investment
amount, and each of seven annual credit amounts. Each direct QEI source now
requires a reviewed Form 8874-A field record, including CDE and investor
identity, date, amount, signed notice, delivery date, and the full credit
schedule. The CDE's [Form 8874-B](https://www.irs.gov/pub/irs-pdf/f8874b.pdf)
identifies any recapture event, event date, reason, and annual credit decreases,
but no prepared notice-history source establishes whether one was issued for a
given investment. Local return arithmetic and attachment validation therefore do
not prove the external allocation, continuing QEI status, or absence of a
recapture event. A future source integration should authenticate the reviewed
issuance notice and join Form 8874-B history by CDE EIN, investor TIN, original
QEI date, and investment amount before broadening eligibility claims.

The public direct-QEI input now parses a required reviewed Form 8874-A record.
It checks CDE name/EIN, initial investment date, QEI amount, seven scheduled
annual amounts, and the 2025 allowance amount against the Form 8874 investment.
Native and PDF construction also match the notice investor name/TIN to the
prepared Form 1040 owner. The schema checks the CDE's 60-day delivery window.
Positive and tamper fixtures are authored but await the requested bulk test
pass. These reviewed fields are not an authenticated document-ingestion path;
the credit's continuing QEI status and recapture history need later CDE
evidence. A 2023 issuance notice alone cannot prove conditions on a 2025
anniversary.

The public `f8874_recapture` source now requires a reviewed Form 8874-A issuance
record and a reviewed signed Form 8874-B event notice for every recapture row.
The reported-event helper requires notice fields, including the CDE and investor
identity, original QEI, event date and reason, seven annual credit decreases,
CDE awareness date, signature, and delivery date. It checks the signed-notice
delivery deadline against the
[official Form 8874-B instructions](https://www.irs.gov/pub/irs-pdf/f8874b.pdf),
joins the event to the Form 8874-A issuance, matches one `f8874_recapture`
source, and checks the computed recapture against Schedule 2 line 17a. The
notice amount is not treated as the taxpayer's recapture tax; the existing
prior-return recomputation and interest calculation supplies that tax. Native
and PDF Schedule 2 construction replay the source calculation, check line 17a
exactly, and match each notice holder to the prepared Form 1040. Positive and
tamper fixtures await the bulk pass. The current-year Form 8874 source still
requires `recapture_notice_received: false` and does not use a 2025 event notice
to claim another credit.

Form 8874-B is issued **when a recapture event occurs**. An absent notice cannot
establish that no event occurred, and the return graph has no authenticated CDE
status or notice-history record covering every day through December 31, 2025.
The no-event branch therefore remains unsupported. A direct QEI still needs
affirmative CDE status/history evidence before its recapture status can be
considered proven; a taxpayer's unchecked "no notice received" assertion is
insufficient.

A separate, staged CDE no-event evidence helper now accepts an affirmative
year-end statement for one QEI, signed after December 31, 2025. It requires a
complete notice-history attestation, active CDE certification, maintained
substantially-all use, no CDE redemption, and no recapture event through that
date. It binds CDE/investor/date/amount to the reviewed Form 8874-A and checks
distinct SHA-256 digests against the supplied issuance and statement bytes. Any
reviewed Form 8874-B notice is separately byte-bound and an event through 2025
conflicts with that status. These checks establish consistency of reviewed
records and bytes; they cannot authenticate the CDE official's signature or
prove the CDE's internal history is complete. The helper is not called by public
direct-credit export, which remains guarded pending authenticated issuer
evidence.

One fully synthetic nonpassive source return now supplies a $10,000 qualified
equity investment with a 2025 initial investment and credit allowance date. It
computes a $500 credit, prints the CDE identity and address on two lines within
Form 8874 row 1, and prints $500 on line 3. The same amount reaches Form 3800
Part III line 1i and line 38, Schedule 3 line 6a, and Form 1040 line 20. The
native `IRS8874` and parent return pass local TY2025 v5.4 XSD. The 15-page
packet was rendered; the Form 8874 and Form 3800 Part III pages were visually
checked. The retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v23/single-new-markets-business-credit.pdf`
(SHA-256 `0ad4dd7eed0449163cd5c8903f90a546b88dbc6b9de4f25ebf634e2af76faec0`).
This is local source-to-return evidence, not external eligibility proof or IRS
acceptance.

The focused Form 8874/Form 3800/review-fixture tests passed 31/31. The
fixed-source `deno task test` run on `5eeb5e6b` passed 8,862/8,862, zero failed,
with no ignored tests reported in 20m21s; its log is
`.state/research/ty2025-full-test-5eeb5e6b.log`.

Two additional fully synthetic nonpassive returns exercise multiple printed
investment rows. One uses a first-year $10,000 investment at 5% and a
fourth-year $10,000 investment at 6%; the two $500/$600 Form 8874 rows and
$1,100 line 3 reconcile to Form 3800, Schedule 3, and Form 1040. Another fills
all six physical rows with $500 each and reconciles $3,000 across the same
return. Their native documents contain two and six `CurrentYearCreditInfo`
groups, respectively, and their full returns pass local TY2025 v5.4 XSD. Both
Form 8874 pages were rendered and visually checked, including the last row. The
15-page packets are retained under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v25/`; their PDF SHA-256
values are `1c11943707c83a04b2d764b17943340322737afd772749c1d94c84797194a050`
(two rows) and
`18297b5ffd6ffb8c58e07a0f15539dd247008397045a9a9006e0f4cc3bb1d9f4` (six rows).
The focused prepared-return and 23-fixture XSD suite passes 30/30.

The fixed-source `deno task test` run on `f0839295` passed 8,866/8,866, zero
failed, with no ignored tests reported in 20m30s; its log is
`.state/research/ty2025-full-test-f0839295.log`.

The next synthetic return combines one $500 Form 8874 investment with a separate
$600 geothermal Form 8835 credit. The prepared Form 3800 parent retains distinct
source IDs and prints the New Markets amount on Part III line 1i, the geothermal
amount on line 4e, and $1,100 on line 38. The source forms and parent Part III
pages in the 18-page packet were visually reviewed; local TY2025 v5.4 XML
validation passes. Other mixed credit combinations and external QEI source
authentication remain open.

The fixed-source `81a2c713` repository-wide run passed 8,869/8,869, zero failed,
with no ignored tests reported in 20m35s. Its log is
`.state/research/ty2025-full-test-81a2c713.log`.

The next synthetic return prints seven $10,000 qualified equity investments.
Five $500 rows appear directly on Form 8874; the last printed row says "See
attached" and carries $1,000 for investments six and seven. The appended
six-column detail page prints both CDE identities, EINs, dates, $10,000
investments, 5% rates, and $500 credits. Form 8874 line 3, Form 3800 line 1i/38,
Schedule 3 line 6a, and Form 1040 line 20 each print $3,500. The 16-page packet
and local TY2025 v5.4 XSD pass; the Form 8874 and statement pages were rendered
and visually checked. A separate 24-investment unit case verifies two statement
pages and rejection of a changed attachment total. The retained packet is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v27/single-seven-new-markets-investments.pdf`
(SHA-256 `7d277794aea0a0e8667f6020a28083f653cb0eea3d97b3cb6565c2884a0824cd`).

The fixed-source `bc556b01` repository-wide run passed 8,873/8,873, zero failed,
with no ignored tests reported in 16m39s. Its log is
`.state/research/ty2025-full-test-bc556b01.log`.

A 24-investment synthetic return exercises two continuation pages in the actual
prepared packet. Its $500-per-investment credits print as five direct Form 8874
rows, a $9,500 last-row attachment total, and 19 six-column statement rows over
two pages. The $12,000 source credit is fully used on Form 3800 line 1i/38,
Schedule 3 line 6a, and Form 1040 line 20 after the fixture supplies sufficient
taxable income; the lower-income diagnostic was tax-limited and remains a
separate carryover case. The full native return passes local TY2025 v5.4 XSD.
Form 8874 and both continuation pages in the 21-page packet were rendered and
inspected. The retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v28/single-twenty-four-new-markets-investments.pdf`
(SHA-256 `f34eb17b6b92ad02294e788c792950082f5ef3a40e633b60bf42d3a8fa5de602`).

The fixed-source `9175f7c1` repository-wide run passed 8,875/8,875, zero failed,
with no ignored tests reported in 15m57s. Its log is
`.state/research/ty2025-full-test-9175f7c1.log`.

A further synthetic return uses a schema-valid 69-character CDE name and
31-character street address that exceed the official form row's width. The Form
8874 last row prints "See attached" and $500, while its six-column supplemental
page wraps the full name and address over two lines each. Form 8874 line 3, Form
3800 Part III line 1i/38, Schedule 3 line 6a, and Form 1040 line 20 reconcile to
$500; the native return passes the local TY2025 v5.4 XSD. The Form 8874 and
statement pages in the 16-page packet were rendered and visually checked. The
retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v29/single-long-name-new-markets-investment.pdf`
(SHA-256 `6cf8c2689fb337831cb0ade1a187e37f5b1f8d4514d23a09408958ebaa4d97c6`).
The source input now enforces the native schema's 75-character CDE name line and
35-character street line 1 limits. The focused source, PDF, parent-return, and
fixture-XSD suite passed 53/53. This is local layout and reconciliation
evidence; eligibility, recapture, other source combinations, and ATS remain
open.

The fixed-source `7318ed47` repository-wide run completed at 2026-09-29 15:04
UTC: 8,880/8,880 passed, zero failed, with no ignored tests reported, in 16m42s.
Its log is `.state/research/ty2025-full-test-7318ed47.log`.
