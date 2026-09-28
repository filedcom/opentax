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
- The filled PDF's multiline CDE/address appearance and all field values remain
  unrendered and unverified in the agreed later visual batch. The focused
  projection cases are added but unrun under the current build-first
  instruction.
