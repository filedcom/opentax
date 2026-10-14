# TY2025 Form8962 larger and joint monthly family source proof

> October 9 current-route clarification: the zero-spouse-income limitation below describes this original family batch. The later [owned joint-income route](./ty2025-form8962-joint-income-source-scope.md) admits reviewed W-2, INT/OID/DIV, unemployment, bounded IRA/pension and ordinary capital sources for both owners. Current code still rejects unjoined entered categories by name and compares the complete raw/retained source copy and final return totals. The linked later evidence retains its own verification qualifications; it is not unrestricted joint-income or source-authenticated filing support.

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


## Main family integration — October7

Private3140e5281/cf1dc1fd5 integrated withoutconflict as e2c4eb36f/0d2980527. Privateordinarychecked99/0 andliteral5/36source/fullnormalizedJSONprepared/carry/origins/PDF/nativeonlyReturnTs/freshXSD remain complete; rootsourceDecimal/native/person-month/fresh36pageapproval retained. Finalauthor206+root104=310physicalintegrationfiles copied/rehashed mainresearch. Alltenprivate runtime/test hashes matchmain. Union77 /tmp/opentax-family-main-union-held-oct7.json binds0d2980527; onlygeneralindex/dependentMAGIhelper changedamongprevious70, old68exact. Mainordinarychecked6module, actualfamily5/36 andprior8962three/15 plusPABnine/147 literalchecks delegatedtoexistingarchiveagent. No mainfamilycompletion beforeterminal/parity/preservation. Nextprivatejointpositive-spouseincomeinventory will completeexistingparentrequirement beyondzero-income source limitation, notfuturequeuework.


## Main family verification complete — October7

Runtimee2c4eb36f/0d2980527 passed ordinarychecked six-module DENO_V8_FLAGS=--max-old-space-size=8192 PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test99/0(8m46s), terminal0; this targetedtaskisnotfullphasepass. Exactmodulelist/log /tmp/opentax-family-main6-ordinary-oct7.log. Literalfamily5/36, priormixed8962three/15 andPABnine/147=17returns198pages passedfreshfullXSD, originalsource/normalizedJSON/carry/origins/PDFexact andnativeonlyReturnTs. Savedfamily/mixedpreparedexact;PABpriorprepared originalsabsent, no parityclaim. Ordinaryallfivefamily source/pending/prepared/carry/origins/PDF byteexact,XMLonlyReturnTs /tmp/opentax-family-main-ordinary-full-parity-oct7.json. All77heldfiles and35familyoriginals unchanged. Final228entries+manifest229physicalcopies SHA c610be2972622394619a418aa7a1d101f748b13d67675b53f8b737393cd515f5 rehashed main .state/research/form8962-family-main-final-oct7; roottransfer /tmp/opentax-family-main-root-transfer-oct7.json. Earlierauthor206+independent104=310integrationfiles retainedseparately. Rootindependentall36page/sourceDecimal/native/person-monthreview remainsapproved, includingcorrectcheckedoverflow, regionalFPLandHIwithholdingrounding. Ledger1552recordscomplete currentreviewedone-policylargerSingle/zero-income-spouseMFJfamilyroute, notallForm8962. Positive-spouseincome,otherpolicy/eligibilityroutes,source/agencyauthentication,latestfullphaseandIRSAcceptanceremainopen.

## October 9 complete-credit larger-family checkpoint

This batch extends the earlier synthetic family inputs with complete ODC/EIC facts and the Schedule8812 worksheet; it does not retroactively change the earlier packets. All children are age18, lived with the taxpayer in the United States all year, have timely valid TINs, did not provide over half their support and did not file disqualifying joint returns. The first two each have required-return AGI16,000 and exempt interest200, reconciled to three W2s, two INTs and two DIVs; the remaining children each have reviewed nonrequired interest500. Dependent MAGI is32,400 in every case. The single-filer status is an explicit fixture fact; head-of-household maintenance costs are not established.

The existing reviewed monthly eligibility contract and its authenticity qualifications above remain in force. These are synthetic source records, not IRS ATS scenarios or issuer/agency-authenticated evidence. No policy payment, dependency, government eligibility or worksheet fact was removed to obtain a passing packet.

| Single filer / family | Parent wages | FPL | Household MAGI | PTC | ODC | EIC | Total tax | Refund | Owed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| TX / four | 50,000 | 31,200 | 82,400 | 5,244 | 1,500 | 2,428 | 2,375 | 8,297 | 0 |
| TX / nine | 170,950 | 58,100 | 203,350 | 15,852 | 4,000 | 0 | 26,095 | 0 | 7,243 |
| AK / nine | 221,875 | 72,650 | 254,275 | 12,168 | 2,900 | 0 | 40,320 | 0 | 24,955 |
| HI / nine | 201,505 | 66,830 | 233,905 | 13,644 | 3,900 | 0 | 33,542 | 0 | 16,885 |

Independent Decimal replay starts with the entered source records, calculates expected amounts and only then compares the public return. [TY2025 Form8962 tables](https://www.irs.gov/pub/irs-prior/i8962--2025.pdf) supply regional FPL and applicable figures .0456 at264% and .0725 at350%; the nine-person amounts extend the eight-person tables by one increment. Annual/monthly contributions are3,757/313,14,743/1,229,18,435/1,536 and16,958/1,413. Each policy has12 paid months, corrected SLCSP and zero APTC.

[TY2025 tax/EIC tables](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf) supply the four-person tax3,875 and EIC2,428; the higher-income cases use the printed tax computation worksheet. [Schedule8812](https://www.irs.gov/pub/irs-pdf/f1040s8.pdf) yields the ODC phaseout reductions1,100 in Alaska and100 in Hawaii. [Form8959](https://www.irs.gov/pub/irs-pdf/f8959.pdf) produces additional tax/withholding197/197 in Alaska and14/13 in Hawaii because separately rounded withholding lines differ from rounded tax. Parent wages have no net investment income; the emitted Form8960 shows zero tax.

All four complete packets pass the local canonical TY2025v5.4 Return1040 XSD. The typed public-return regression has **5 passes/0 failures**: four positive tests plus24 changed-source/final-total variants rejected at both native and PDF boundaries. It checks all dependent details, source MAGI, PTC, Schedule3, ODC/EIC, Medicare, final tax and refund/owed. The existing family-source and eligibility modules separately have **4 passes/0 failures**. No type-check bypass is used.

Actual packet review covers **40 pages**, with32 distinct pages viewed in16 contact sheets and8 exact rendered-image matches. All packets are flattened with no field tree or widget annotations. The nine-person returns retain all eight native dependents and show dependents5–8 on the PDF continuation; no clipping was observed. Existing zero-value presentation and continuation-name qualifications remain deferred76/68. This is reviewed calculation/layout evidence, not a general PDF-compliance claim.

Four companion joint cases retain full credit facts but **do not prepare**. Both zero-spouse and newer owned-joint inventories reject the entered Schedule8812 worksheet, giving eight blocked native/PDF route/case probes with no graph diagnostics. Their original inputs and a complete primary-owned W2/zero-spouse alternative review are retained. New future item81 records this cross-form inventory gap; no runtime repair was implemented and these cases do not count as produced packets. This is distinct from deferred79 because all have zero APTC/repayment.

Private evidence is `.state/research/form8962-large-family-2026-10-09/`: eight initial inputs/results, four XML/PDF/prepared records, generator, independent oracle/report, typed logs, joint probe/inputs/report, rendered-page hashes and reviewed contacts. Committed fixtures/expectations and `form8962-large-family.test.ts` make the four positive/rejection checks portable. The52 main parents remain open; the engineering estimate remains about60% of individual ATS checks (45–75% rough range), with no IRS acceptance claim.
