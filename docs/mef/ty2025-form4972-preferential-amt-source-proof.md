# Form4972 complete source inventories with preferential ISO AMT

The [2025 Form6251](https://www.irs.gov/pub/irs-prior/f6251--2025.pdf),
[its instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf) and
[2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
require preferential PartIII calculation and exclude Form4972 special tax from
AMT line10. These eight full public returns retain the complete original pension
inventories, issued W2 and3921, actual owner/account1099DIV, qualified holding
review, and foreign-account/trust answers. Capital distribution sources join
Form1040 line7a without inventing a required ScheduleD when distributions alone
qualify for that direct route; retained ScheduleD source line13 still reconciles.
Other capital characters, elections and conflicting sources retain their guards.

## Independent equations

The Decimal oracle reads the actual generated public sources and the previously
independent1986 ten-year worksheets, without importing the production executor.
Single ordinary tax uses24% minus7153; MFJ uses22% minus10172 above96950.
AMT adds back standard and senior deductions and the actual ISO exercise spread;
exemption uses88100/137000 with25% phaseout above626350/1252700. PartIII uses
239100 ordinary26/28% threshold and actual qualified dividends/distributions.
Form4972 special tax is excluded once from line10 and retained in1040 line16.
NIIT excludes qualified retirement distributions, preserves raw tax cents in
pending data, and prints rounded whole dollars in the native/PDF filing.

| Inventory | Ordinary tax | Special tax | AMT | Total tax before printed rounding |
| --- | ---: | ---: | ---: | ---: |
| Single | 42287 | 830 | 57363 | 101810 |
| Three distributions and fund gain | 43787 | 4090 | 57363 | 106950 |
| Paired owner elections, MFJ phaseout | 31398 | 6170 | 288871 | 326439 |
| Seven distributions and fund gain | 43787 | 12760 | 57363 | 115620 |
| PartIII-only paired elections | 33162 | 5870 | 54296 | 93328 |
| Plain multiple distributions | 42287 | 3100 | 57363 | 104080 |
| Fifty issued cent-valued sources, Single phaseout | 42287 | 19900 | 151769 | 215286.08 |
| Beneficiary and fund gain | 43787 | 3930 | 57363 | 106790 |

MFJ ISO FMV1075 producesAMTI1300000/exemption125175; fifty-copy FMV550 and
ordinaryDIV35002 produceAMTI775002/exemption50937. All owner worksheets and
PartIII calculated lines match independently derived expected values.

## Filing proof and discovered repair

The source gate passed2/0(54s), eight complete v5.4Return1040XSD/native/PDF
packets,75native1099R copies,128final source/tax mutations plus4public/final
ownership/inventory conflicts. Log `/tmp/opentax-form4972-preferential-amt-public-v8.log`.
It discovered directPDF accepted exemption+1; the shared4972/6251 join now
verifies actual filer status, AMTI,2025 exemption phaseout and taxable excess.
The old synthetic line10 unit fixtures now retain their actual exemption inputs.

All76pages were rendered at85dpi and viewed on16contact sheets: header/owner,
1040 amounts/checkboxes, copy order, both owner4972s, senior1A, Schedule2,
ScheduleB questions,6251 PartIII and8960, with no clipping or overlap found.
Immutable evidence `/tmp/opentax-form4972-preferential-amt-reviewed-v8` includes
source/pending/XML/PDF/text/origins, all rasters, oracle and expected data.
Manifest SHA256 `dd48537bbe308d32d4f6e62a5975f802083a4ee400bd3e298630f3ef28ed47b5`.
Original8/42cent packets'32files match source/pending values and PDF/text bytes;
onlyJSON formatting andReturnTs differ. Original immutablee201 evidence is intact.

Reproduce source gate with `deno test --allow-all forms/f1040/2025/form4972_preferential_amt_source.test.ts`;
setFORM4972_PREFERENTIAL_AMT_EVIDENCE_DIR to preserve separate output.
Run `python3 scripts/ty2025-form4972-preferential-amt-oracle.py ARTIFACT_DIR`
to independently regenerate expected values from its sourceJSON files.

The typed four-module preservation gate passed53/0(47s) in
`/tmp/opentax-form4972-preferential-amt-preservation-v3.log`.
Earlier51/2 was only two older line10 unit fixtures missing the newly required
filer/exemption facts; corrected three unit cases separately passed3/0.

These are reviewed synthetic issuer/eligibility source contracts, not externally
authenticated payer records or IRS acceptance. Preferential ScheduleJ refiguring,
other AMT preferences, wider eligibility/history combinations and filing-ready
business-rule/ATS gates remain open. This does not close either broad parent.
