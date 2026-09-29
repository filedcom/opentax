# TY2025 Form 8874 PDF print route

The
[IRS Form 8874 (Rev. November 2021)](https://www.irs.gov/pub/irs-pdf/f8874.pdf)
is the current continuous-use New Markets Credit paper form. Its first page has
six line-1 investment rows, each with CDE name/address, CDE EIN, initial
investment date, qualified equity investment, credit rate, and credit. Line 2 is
the partnership/S corporation credit and line 3 is the sum. Pages 2-3 are
instructions, not filed form pages. The source PDF AcroForm has fields
`f1_03`-`f1_38` for those six rows and `f1_39`/`f1_40` for lines 2/3.

The bounded PDF route prints one source-backed `f8874` investment form when
every active investment fits the six rows and the investment/credit amounts
retain whole-dollar print precision. The structured source supplies CDE
identity, address, date, and investment amount; `calculateForm8874` supplies the
correct fifth/sixth-year rate and each credit. The PDF invokes the native Form
8874 builder to check the direct Form 3800 credit and any passive Form 8582-CR
sources, and shares its K-1 line-2 reconciliation. It then checks line 3 as the
exact line-1-plus-line-2 sum. A pass-through-only recipient has no `f8874`
investment slot and, per the form instructions, does not file a separate
Form 8874.

Still unsupported or unverified:

- More than six source investment rows require an attached overflow statement.
  The PDF fails closed rather than truncating rows.
- Fractional-dollar investment or credit values are refused, because the current
  PDF writer rounds numeric fields to whole dollars and could make printed
  column (d) times rate (e) disagree with printed credit (f).
- The source records a CDE designation-notice reference and
  qualification/holding assertions, but does not contain independently verified
  Form 8874-A or Form 8874-B documents. Eligibility and recapture evidence still
  need human review before filing.
- Longer CDE names or addresses, mixed passive/nonpassive rows, and more than
  six rows still need filled-output or attachment review.

One fully synthetic nonpassive source return now supplies a $10,000 qualified
equity investment with a 2025 initial investment and credit allowance date.
It computes a $500 credit, prints the CDE identity and address on two lines
within Form 8874 row 1, and prints $500 on line 3. The same amount reaches
Form 3800 Part III line 1i and line 38, Schedule 3 line 6a, and Form 1040
line 20. The native `IRS8874` and parent return pass local TY2025 v5.4 XSD.
The 15-page packet was rendered; the Form 8874 and Form 3800 Part III pages
were visually checked. The retained PDF is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v23/single-new-markets-business-credit.pdf`
(SHA-256 `0ad4dd7eed0449163cd5c8903f90a546b88dbc6b9de4f25ebf634e2af76faec0`).
This is local source-to-return evidence, not external eligibility proof or IRS
acceptance.

The focused Form 8874/Form 3800/review-fixture tests passed 31/31. The
fixed-source `deno task test` run on `5eeb5e6b` passed 8,862/8,862, zero
failed, with no ignored tests reported in 20m21s; its log is
`.state/research/ty2025-full-test-5eeb5e6b.log`.

Two additional fully synthetic nonpassive returns exercise multiple printed
investment rows. One uses a first-year $10,000 investment at 5% and a
fourth-year $10,000 investment at 6%; the two $500/$600 Form 8874 rows and
$1,100 line 3 reconcile to Form 3800, Schedule 3, and Form 1040. Another
fills all six physical rows with $500 each and reconciles $3,000 across the
same return. Their native documents contain two and six
`CurrentYearCreditInfo` groups, respectively, and their full returns pass
local TY2025 v5.4 XSD. Both Form 8874 pages were rendered and visually
checked, including the last row. The 15-page packets are retained under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v25/`; their PDF
SHA-256 values are `1c11943707c83a04b2d764b17943340322737afd772749c1d94c84797194a050`
(two rows) and `18297b5ffd6ffb8c58e07a0f15539dd247008397045a9a9006e0f4cc3bb1d9f4`
(six rows). The focused prepared-return and 23-fixture XSD suite passes 30/30.

The fixed-source `deno task test` run on `f0839295` passed 8,866/8,866,
zero failed, with no ignored tests reported in 20m30s; its log is
`.state/research/ty2025-full-test-f0839295.log`.
