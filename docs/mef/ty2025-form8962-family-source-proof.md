# TY2025 Form8962 larger and joint monthly family source proof

Production candidate `3140e52818ef63b65d0a462cfdc33f7904b8f71d` in the isolated family checkout. The portable prior test is private cherry-pick `fa05f9d2c` of `574d72c1b`; no main or board edit. Ten runtime/test hashes are frozen in `/tmp/opentax-form8962-family-source-held-v6-oct7.json`.

## Complete implemented route

One no-APTC family policy now reconciles the complete taxpayer, spouse where MFJ, and dependent identity inventory, including more than eight people. Required dependent W2/INT/DIV collections supply MAGI; reviewed nonrequired dependents remain counted in family size without income inclusion. The new larger or joint route requires affirmative reviewed person-month eligibility. Public policy input binds the policy/month/person/date review; native and direct PDF boundaries bind retained entered source, complete family, final filer identities, and monthly review. The initial MFJ route additionally requires an affirmative complete zero-spouse-income inventory and conflicts against actual entered/retained W2 owners and other source inventory. This is a guarded initial joint route, not unrestricted spouse income or multiple-policy support.

Fresh actual packets were captured by the normal checked public-source test at `/var/folders/xc/5qnxcpk90019c_ms1nf2hw8r0000gn/T/opentax-8962-family-source-2797b8fc3ab85d60`:

| Case | Parent wages | Household MAGI | PTC | Total tax | Payments | Refund | Owed |
|---|---:|---:|---:|---:|---:|---:|---:|
| TX4 Single | 50000 | 82400 | 5244 | 3875 | 8244 | 4369 | 0 |
| TX9 Single | 170950 | 203350 | 15852 | 30095 | 18852 | 0 | 11243 |
| AK9 Single | 221875 | 254275 | 12168 | 43220 | 15365 | 0 | 27855 |
| HI9 Single | 201505 | 233905 | 13644 | 37442 | 16657 | 0 | 20785 |
| TX4 MFJ | 50000 | 82400 | 5244 | 1853 | 8244 | 6391 | 0 |

All five have dependent MAGI32400. Regional9 household is350% of the IRS TY2025 Table1 regional **2024** FPL. Premiums3000/month, SLCSP2500 first six and2600 last six support positive PTC. Alaska/Hawaii W2SocialSecurity/Medicare amounts and Form8959 tax/withholding are retained; Hawaii filed-line rounding legitimately produces tax14 and additional withholding13. No additional EIC/ODC eligibility predicates were established; their absence here is a source-scope qualification, not legal proof that those credits are unavailable.

## Eligibility review qualification

Sources are synthetic ordinary reviewed facts, not issuer-authenticated records or agency determinations. The person-month government `not_eligible` conclusion is interpreted as a complete reviewed determination including previous enrollment and continuous eligibility; lack of current enrollment alone would be insufficient. The helper enforces the contract and source joins; it does not compute Medicaid/CHIP program eligibility.

`/tmp/opentax-form8962-family-source-readonly-v6-oct7/monthly-eligibility-workpaper.json` separately records new ordinary synthetic monthly payroll/income, custodial household and prior-coverage facts, bound to each unchanged original source SHA, exact policy/person/month/reference. Annual W2 facts alone do not establish that monthly timing. The workpaper assumes regular monthly wages with December cent reconciliation, and counts each required child's1350/month MAGI, excluding nonrequired child income. Texas4 and Hawaii9 parent-only income does **not** independently exceed child-program ceilings; the required dependent income must be included under the ordinary MAGI household rules.

Primary downloaded authority is preserved under `/tmp/opentax-form8962-family-state-authority-oct7`: MACPAC Exhibit35 describes July2025 coverage standards (publication February2026), HHS2025 poverty guidelines, CMS MAGI income-counting guidance, and Alaska's official historical2025 tables. Effective child ceilings including up to five-point disregard are TX206%,AK208%,HI313%. Program2025 nine-person FPL is59650/74590/68630, differing from the PTC2024 FPL58100/72650/66830. The conservative ceiling comparisons, monthly household amounts and complete review facts are in the workpaper. An attempted Hawaii chart download returned empty bytes and is explicitly not PDF evidence. External review/reference authenticity remains unverified.

Authority links:

- [IRS2025 Form8962 instructions](https://www.irs.gov/instructions/i8962).
- [IRS2025 tax tables and computation worksheet](https://www.irs.gov/publications/p1040): SectionA24% subtraction7153 and32% subtraction22937.
- [MACPAC July2025 eligibility table](https://www.macpac.gov/wp-content/uploads/2026/01/EXHIBIT-35.-Medicaid-and-CHIP-Income-Eligibility-Levels-as-a-Percentage-of-the-Federal-Poverty-Level-for-Children-and-Pregnant-Women-by-State-2025.pdf).
- [HHS2025 poverty guideline table](https://aspe.hhs.gov/sites/default/files/documents/dd73d4f00d8a819d10b2fdb70d254f7b/detailed-guidelines-2025.pdf).
- [CMS MAGI income-counting guidance](https://www.medicaid.gov/sites/default/files/2021-02/part-2-income.pdf).
- [Official Alaska historical tables](https://www.akleg.gov/basis/get_documents.asp?docid=12755).

## Terminal verification and preserved qualifications

Normal `DENO_V8_FLAGS=--max-old-space-size=8192 deno task test` runs family source, helper, portable multiple-source, general input, monthly no-APTC dependent, and dependent-wages modules. Owned session69734 is terminal exit0, **99passed/0failed**,10m45s. Exact command/log is `/tmp/opentax-form8962-family-source-v6-normal-oct7.log`. Fmt check10 and diff check pass. Tests include meaningful native/directPDF missing, mismatched month/person, employer-offer, date, source-family and spouse-income contradictions; they do not skip checked typing.

Author replay44399 is terminal exit0, reads all five actual saved JSON inputs without fixture factories, and preserves all35 original packet hashes. Report `/tmp/opentax-form8962-family-source-exact5-v6-json-oct7/report.json` proves exact full normalized graph, prepared graph and carry in their saved JSON representations (undefined properties cannot be represented in JSON), exact origins/PDF and native XML except ReturnTs, plus fresh full canonical IRSv5.4 XSD. It is author replay, not independent execution. The first two replay scripts/logs failed on raw undefined-versus-serialized absence; first correction targeted prepared graph before fixing the actual normalized-pending comparison. Both failed versions remain untouched, with no successful claim.

Author personally reviewed all12 contact sheets/all36 pages (5/6/10/10/5) from original PDFs using the pinned Poppler executable; original PDF hashes and decoded raster hashes are retained in `/tmp/opentax-form8962-family-render-v6-oct7/review.json`. Amounts, regional flags, monthly rows, MFJ identity, continuation and Medicare/zeroNIIT forms match source calculations. A reduced-contact suspicion about the overflow checkbox was disproved by a full-size raster: c1_11 is correctly checked. No PDF correction was made. Root independently owns its final review/execution.

Earlier V4 checked gate exited1 with TS2345 in test edit-array inference and ran no positive loop; ten held files/log/qualification remain in `/tmp/opentax-form8962-family-source-qualified-v4-oct7`. V5 checked gate exited1,98/1, on wrong expected tax worksheet constants; ten held files/log plus original TX4 packet remain in `/tmp/opentax-form8962-family-source-qualified-v5-oct7`. V6 only corrected those test expectations after full preservation; runtime and V5 source fixture facts were unchanged. Earlier five missing-review literal sources remain negative originals under `/tmp/opentax-form8962-family-before-v3-oct7`; no silent eligibility facts were added to them.

The wider Form8962 parent remains open beyond this guarded complete reviewed family route.
