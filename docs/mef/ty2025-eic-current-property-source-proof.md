# Current owned land sale, passive pool, EIC and QBI proof

Isolated base: `0d153ed24`. This advances the existing Worksheet 1/Form 8582/Form 4797/Form 8995 source parent. It does not close the broader parent or verify external source authenticity.

## Actual gap and prescribed treatment

The preserved before input is `/tmp/opentax-eic-passive-property-before-inputs-oct6.json`; its rejected native route is recorded in `/tmp/opentax-eic-passive-property-before-oct6.log`. It contains wages 5,000, tax-exempt interest 11,950, an unrelated farm rental loss 5,000, and land rents 2,000 less taxes 3,000 with a short-held partial-sale gain 3,000. The old graph released unrelated farm loss and produced AGI 5,000, then native export rejected the first-year sale. The financial facts remain preserved. Its mistaken property-type 4 classification is corrected to the actual land type 5 in the new complete source packet.

[26 CFR 1.469-2T(f)(3)](https://www.ecfr.gov/current/title-26/section-1.469-2T) recharacterizes net income where less than 30% of the rental property's unadjusted basis is depreciable, including sale gain. This complete two-parcel inventory is nondepreciable land. [Publication 925, Recharacterization of Passive Income](https://www.irs.gov/publications/p925) instructs that a net-positive recharacterized activity's entire income and loss stay off Form 8582. The gross Form 4797 gain remains 3,000; Schedule E deducts its actual loss 1,000; only the unrelated farm's 5,000 stays suspended. AGI is 7,000 and property QBI is 2,000. No land gain can finance the unrelated passive farm deduction.

[Publication 596, Worksheet 1](https://www.irs.gov/publications/p596) includes only passive amounts in lines 11/12 and requires an NPA amount next to Schedule E line 26 for nonpassive rental real estate income or loss. Native Schedule E uses the official `nonpassiveActivityLiteralCd`/`nonpassiveActivityAmt` attributes; the PDF prints NPA -1000 beside line 26. This income remains outside earned income. Investment income is 11,950, so EIC is 384; the separate 11,951 case receives zero EIC.

For a genuinely net-negative activity the sale gain remains passive. [Form 8582 instructions](https://www.irs.gov/instructions/i8582) treat a retained partial sale as part of the same activity and require the actual allowed losses on their original reporting forms. [Form 8995 instructions](https://www.irs.gov/instructions/i8995) permit eligible ordinary trade gain and deduct qualified losses when allowed. QBI thus uses the actual current property/farm pool, with per-owner/activity qualified suspended-loss records. It does not include suspended deductions as current negative QBI.

## Complete current source joins

The new strict contract retains the owned acquisition/payment and separately allocated parcel bases, sold parcel and unrelated closing/deposit, continuing owned parcel inventory, agent management and domestic trade review, actual dated leases and tenant deposits, and dated county assessments/payments. Rental days are derived from the leases; type 5, sale description, dates, basis, price, zero depreciation and retained-interest facts must match the source. This is a first-year, zero-prior-loss route. It neither changes an RPE into property nor accepts an unexplained scalar gain, passive waiver or owner QBI override.

Gross ordinary gain reaches Schedule 1 line 4 and AGI. Source-derived recharacterization determines Form 8582 and EIC amounts. Current source-qualified property/farm income and allowed losses determine Form 8995, its taxable-income cap, final taxable income and tax. New direct native/PDF checks reject detached or changed source inventories, wrong owners, basis/closing/ref/classification conflicts, forged passive gain/loss, missing PAL/QBI, qualified-farm source changes and altered AGI/Schedule 1/QBI values. Other unjoined K-1 or business components are rejected on this family instead of being ignored.

The official native PropertyDesc is limited to 20 characters. Only the complete verified current-source route uses the first 20 characters of the retained full description; the PDF uses the same brief description, avoiding a clipped field. The raw description and all financial facts remain in source records. Legacy description validation remains in place.

## Independent expectations

| Packet | AGI | EIC | Suspended PAL | Qualified current income | QBI deduction | Income tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| property_farm_at_limit | 7,000 | 384 | 5,000 | 2,000 | 0 | 0 |
| property_farm_above_limit | 7,000 | 0 | 5,000 | 2,000 | 0 | 0 |
| property_positive_net_qbi | 56,000 | 0 | 5,000 | 6,000 | 1,200 | 4,451 |
| property_income_only | 7,000 | 384 | 0 | 2,000 | 0 | 0 |
| property_operating_profit | 9,000 | 384 | 5,000 | 4,000 | 0 | 0 |
| property_joint_spouse_owned | 12,000 | 649 | 5,000 | 2,000 | 0 | 0 |
| property_negative_net_suspended | 5,000 | 384 | 7,000 | 0 | 0 | 0 |
| property_negative_net_allowed_positive_farm | 53,000 | 0 | 0 | 3,000 | 600 | 4,163 |

The original positive case retains rents 2,000/taxes 3,000/gain 3,000. The high case retains gain 7,000: net 6,000 is recharacterized and cannot release the unrelated farm loss. Taxable income is 39,050 after the 15,750 standard deduction and 1,200 QBI deduction; the tax-table interval midpoint gives 4,451. In the separate net-negative source case, property operating loss 5,000 minus gain 3,000 leaves loss 2,000. A separately sourced positive farm 5,000 allows that loss, giving QBI 3,000; taxable income 36,650 yields tax 4,163. These separate constructed cases do not replace the original financial facts.

## Evidence and reproducible commands

Final typed source/public/native/PDF/full local 2025v5.4 XSD gate: `/tmp/opentax-eic-passive-property-source-final-v17-oct6.log`, **2/0**. Eight complete packet positives and source/export negatives are inside those tests.

The canonical final archive is `/tmp/opentax-eic-passive-property-final-retained-v18-oct6`: **8 packets, 24 packet files, 99 pages**. It was replayed from retained v14 public inputs and the saved filer; original source-pending bytes were copied exactly after whole-pending/prepared-pending/carry/origins equality checks. This is distinct from fresh factory output v16, whose filer timestamp naturally differs. All final PDFs equal the reviewed v16 PDFs byte for byte.

`/tmp/opentax-eic-passive-property-brief-comparison-oct6.json` proves that v14→final changes only one Form 4797 description page per packet: eight intended pages, with 91 remaining page rasters exact. It independently checks the source-derived full-to-20-character description substitution and exact remaining text tokens, XML except ReturnTs, and entire retained source/pending/carry/origin data. All 99 original correct-layout pages were reviewed in five contacts, followed by the eight corrected description pages and full-size NPA, joint identity, zero/positive QBI and passive allocation pages. Review manifests are under `/tmp/opentax-eic-passive-property-review-final-v14-oct6` and `...-v16-oct6`; the final source/expected-copy/page/hash inventory is `/tmp/opentax-eic-passive-property-final-source-inventory-oct6.json`.

Strict final saved-input replay: `/tmp/opentax-eic-passive-property-final-retained-v18-raw-oct6/report.json`, **8/99 exact**. Strict older saved-input replay: `/tmp/opentax-eic-passive-property-prior42-raw-v2-oct6/report.json`, **42/374 exact**. Both verify unchanged public inputs, whole pending, prepared pending, carry, origins, PDF bytes, XML except ReturnTs, and full local XSD. They preserve the original owned7203/EIC 15/130, passive K-1 18/141 and ordinary-K1 9/103 archives.

Standard gate file list: `/tmp/opentax-eic-passive-property-standard-files-oct6.txt` (55 modules). Final log: `/tmp/opentax-eic-passive-property-standard-final-v3-oct6.log`, **680 passed / 0 failed (6m36s)**. This is the isolated 55-module gate, not a full latest-main regression.

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno task test \
  $(cat /tmp/opentax-eic-passive-property-standard-files-oct6.txt)

PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno task test \
  forms/f1040/2025/eic_passive_property_source.test.ts

PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno run \
  --config deno.json --allow-read --allow-write --allow-net=www.irs.gov \
  --allow-run=xmllint /tmp/opentax-eic-passive-k1-retained-portable-final-oct6.ts \
  CHECKOUT PRIVATE_PDF_CACHE NEW_OUTPUT \
  /tmp/opentax-eic-passive-property-final-retained-v18-oct6
```

The sealed private cache is `/tmp/opentax-eic-passive-property-pdf-cache-final-oct6`. The same strict replayer accepts additional immutable archives as subsequent arguments. The older archives are `/tmp/opentax-eic-owned-loss-final-oct6`, `/tmp/opentax-eic-three-column-final-v2-oct6`, `/tmp/opentax-eic-seven-column-final-v2-oct6`, `/tmp/opentax-eic-passive-k1-current-evidence-v18-oct6` and `/tmp/opentax-eic-passive-line10-final-retained-v6-oct6`. No issuer source factory runs during these replays.

## Limits and preserved diagnostics

These are constructed current source-contract records, not externally authenticated title/bank/issuer records or proof of IRS acceptance. Prior accepted-history guards remain intact. The current slice covers whole-dollar, first-year, short-held nondepreciable land, retained partial interest, unrelated fully taxable noninstallment sale and the complete qualified property/farm family below the QBI threshold. Direct ordinary sale losses, depreciable/section1231 character, whole-activity dispositions, prior-history/carryover sources, other contemporaneous business inventories, advanced QBI and greater sale-copy inventories remain existing parent boundaries. Partnership code L's section751(b) distribution mechanics are distinct; this does not establish entity distribution/basis derivation or relabel an issued K-1 as land.

All provisional logs/packets remain preserved. Draft v9/v10 amounts/XSD passed before the paper audit found the improper residual PAL presentation and wrongly placed NPA decoration; they are superseded. v13 and standard v1 failed typecheck in an added assertion. Standard v2 was stopped as superseded after held code changed. Older raw v1 caught an unrelated legacy Schedule E array shape; the final guard is specific to actual new owned sources, and raw v2 proves preservation. v14 is preserved as the pre-brief-description archive. No failing, interrupted or superseded gate is called final green. No main, shared research, frozen board, future checklist, catalog or PR was changed.
