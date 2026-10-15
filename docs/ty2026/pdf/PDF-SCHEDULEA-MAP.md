# TY2026 Schedule A draft component

Checked October 15, 2026 against the pinned
[2026 draft](https://www.irs.gov/pub/irs-dft/f1040sa--dft.pdf), SHA-256
`d49acff9afc2faa178b7bf1f70d826d03c2c6def43700880f8ae5bb8bb5a0ffa`.
The source has a cover plus two printed pages, 41 text fields and six checkbox
fields. All 47 canonical fields have one page widget. The inventory is
[`pdf-fields-f1040sa.csv`](../inventories/pdf-fields/pdf-fields-f1040sa.csv).

## Source and deduction reconciliation

`forms/f1040/2026/pdf/schedule_a.ts` recomputes both `calculateScheduleA2026`
and `calculateDeductionSelection2026`. The latter is the calculation used by
the existing deduction node; that node now retains `calculation_input_2026`
alongside its resolution. No new deduction algorithm is introduced for PDF.

The builder requires the same filing status, AGI, pre-limit itemized total,
deductible taxes, contribution base and eligible nonitemizer gifts in both
calculations. It requires selected itemization and checks Form 1040 lines 11b,
12e, 12f, 13a and 13b. Filer SSN must match the expense sources. The current
connected resolver rejects pending QBI activity; this component does not enable
Forms 8995/8995-A or bypass their joint deduction calculation.

## Field map

All names start with `form1[0].Page1[0]` or `form1[0].Page2[0]`.
The CSV records the nested read-order groups omitted from this compact table.

| Printed area | Text fields |
| --- | --- |
| Name and primary SSN | Page 1 `f1_01`, `f1_02` |
| Medical lines 1–4 | Page 1 `f1_03`–`f1_06` |
| SALT lines 5a–5e | Page 1 `f1_07`–`f1_11` |
| Other-tax type/amount and total line 7 | Page 1 `f1_12`–`f1_14` |
| Mortgage lines 8a/8b and seller identity | Page 1 `f1_15`–`f1_17` |
| Points, insurance, interest subtotal, investment interest, total | Page 1 `f1_18`–`f1_22` |
| Gifts lines 11–15 and casualty line 16 | Page 2 `f2_01`–`f2_06` |
| Other deductions 17a–17k and 17z | Page 2 `f2_07`–`f2_18` |
| Selected deduction, line 18 | Page 2 `f2_19` |

The current source contract permits ordinary reviewed medical expenses,
income or actual sales taxes, property taxes, acquisition mortgage interest,
points and insurance, current cash gifts and eligible educator expenses. The
component prints their calculated lines, including the charity floor and the
educator remainder after Schedule 1. Unsupported categories remain blank.

The sales-tax box follows the source election. Current mortgage sources require
all proceeds to acquire/build/improve the secured home, so the mixed-use box
remains blank. Seller-financed interest not reported on Form 1098 produces a
line 8b reference and a statement with seller name, identifying number, address,
filer identity and the overall line 8b total. Long details wrap and paginate.

Line 18's Yes/No question uses the draft's **$384,350 screening amount** after
Form 1040 lines 13a/13b, even when the status-specific worksheet produces no
reduction. The amount comes from the resolver's final limited deduction.
Line 19 is checked only for a voluntary itemization election with a deduction
smaller than the available standard deduction, not compulsory itemization.

The PDF builder verifies the source digest and canonical field/widget inventory,
updates appearances, flattens the result, removes the cover and all annotations
and AcroForm data, and places a draft warning on every output page.

## Reproduction and validation

The field-inventory tool now uses the actual corpus/inventory directories and
can inventory one already-verified source without loading the entire corpus:

```sh
python3 docs/ty2026/tooling/build_pdf_fields.py --slug f1040sa \
  --source .state/pdf-cache/ty2026/https_www_irs_gov_pub_irs_dft_f1040sa_dft_pdf.pdf
```

Six focused tests cover source reconciliation, the 0.5% cash-gift floor,
mortgage insurance and seller identity, educator remainder, screening thresholds,
the overall limit, itemization elections, stale destinations, pending QBI,
connected investment withholding and statement pagination. All 294 current-2026
tests and the repository unit/preflight gate passed. Eleven synthetic QA pages were rendered with Poppler and visually
inspected, covering ordinary itemization, a limited $32,637 deduction, a smaller
elected deduction and long seller details. The output is static and legible.

Recheck final forms/instructions before release. Complete attachment selection,
remaining deduction sources, persisted charity/points carryovers, QBI, current
MeF and ATS acceptance remain open; this component is not filing approval.
