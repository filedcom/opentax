# TY2025 Form 8582 MFS lived-apart boundary

## October 9 complete-return phaseout checkpoint

Seven synthetic married-separate returns now exercise the existing public
residence-source route through final Form 1040, native XML and complete PDFs.
This supersedes earlier “written, unrun” claims for the listed boundaries;
it does not establish source authenticity, a working durable ledger, or IRS
acceptance. No production calculation or filing code changed.

Each return retains Alex and Sam's names/SSNs, twelve monthly residence
records with distinct New York addresses and separate references, and an
explicit no-shared-residence assertion for every month. Alex owns the one
active rental, whose current loss is 20,000; no prior loss or sale is claimed.
A recipient-matched W-2 supplies the listed wages and 10,000 withholding.
The spouse is explicitly not itemizing, and the standard deduction is15,750.

| Wages / MAGI | Allowed loss | Suspended loss | AGI | Taxable income | Tax | Refund | Pages |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50,000 | 12,500 | 7,500 | 37,500 | 21,750 | 2,375 | 7,625 | 8 |
| 50,001 | 12,500 | 7,500 | 37,501 | 21,751 | 2,375 | 7,625 | 8 |
| 60,000 | 7,500 | 12,500 | 52,500 | 36,750 | 4,175 | 5,825 | 8 |
| 60,003 | 7,499 | 12,501 | 52,504 | 36,754 | 4,175 | 5,825 | 8 |
| 74,999 | 1 | 19,999 | 74,998 | 59,248 | 7,944 | 2,056 | 8 |
| 75,000 | 0 | 20,000 | 75,000 | 59,250 | 7,955 | 2,045 | 6 |
| 80,000 | 0 | 20,000 | 80,000 | 64,250 | 9,055 | 945 | 6 |

Expected allowances follow the [2025 Form 8582
instructions](https://www.irs.gov/instructions/i8582): lived-apart MFS maximum
12,500, with the 50,000–75,000 MAGI phaseout. Final half-dollar allowances
round once under the [Form 1040 rounding
instructions](https://www.irs.gov/instructions/i1040gi). Expected tax is
independently transcribed from MFS columns in the [2025 Tax
Table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf), PDF pages5/6/9; it is not
copied from engine results. Schedule E allowed loss, Schedule 1 line5, AGI,
tax and refund reconcile in all seven cases. Zero-allowance cases omit the
zero Schedule1 packet.

The focused run passes7/0. The grouped Form8582 input/domain/native/PDF,
general-input and storage regression passes283/0. Each packet rejects nine
mutations at both native preparation and fresh PDF construction, totaling
63/63 rejections: missing residence source, lived-with contradiction, omitted
month, matching residence addresses, changed rental amount or activity ID,
spouse recipient on taxpayer wages, Schedule1 total, and final AGI.
The older source/phaseout/ledger unit cases also pass in this grouped run.

All seven original XMLs pass local TY2025 IMF2025v5.4 Return1040.xsd
(SHA-256 `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`).
All52 PDF pages are covered by37 unique images viewed on ten contact sheets
and15 exact image matches. Reopened PDFs have no editable fields or widgets.
PartII limits, PartsIV/VI/VII/VIII activity allocation, ScheduleE deductions,
Form1040 amounts and address/identity values were compared to retained source
and pending records. The filled outputs retain these qualifications:

- **New deferred111:** all seven actual graphs omit `has_other_passive`, while
  the active-rental ledger requires explicit false. `buildForm8582Ledger`
  rejects each original graph before serialization or next-year import.
  Passing direct ledger unit cases explicitly supply false and do not prove
  graph integration. The tests retain the rejection without adding the flag.
- **Existing deferred68:** all seven Form1040 page1 copies print Sam's name
  both in the joint-only spouse row and in the MFS name field. Names and SSNs
  remain present; complete name-format parity is not claimed.
- **New deferred112:** the75,000 and80,000 packets print zero on Form8582
  lines7/8 although the line6 instruction skips them. Corresponding native
  elements also contain zero; business-rule requirements are unverified.

Private evidence is retained in
`.state/research/form8582-mfs-packets-2026-10-09/`: public inputs, expectations,
original pending/filer records, ledger error, native XML/PDF, XSD logs,
source/artifact hashes, rendered pages, review manifest and terminal logs.
The initial seven ledger failures are retained separately from the passing
boundary audit. All references are synthetic; none establish authentic
residence-document bytes, an accepted prior return or a production2026
import. Deferred issues remain unworked. Other activity combinations, prior
loss character, dispositions, overflow, business rules and IRS acceptance
remain open, so the main Form8582 parent stays unchecked.
