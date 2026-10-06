# TY2025 Form 4972 complete multiple-source NUA review

## Source and calculation

The existing Form4972 board parent includes multiple 1099-R distributions, NUA and separate spouse elections. The [official TY2025 form and instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf) require combining complete distributions for one participant and separate forms for spouses. The NUA worksheet allocates combined box6 using combined box3 divided by combined box2a. This change removes arbitrary source-copy ceilings while preserving one complete qualified plan per participant, unique references, full-share nonbeneficiary elections and exact whole-dollar NUA allocations.

Each structured synthetic issued-source record has box1 12,000, box2a 10,000, box3 1,000 and box6 2,000, with payer/EIN, owner/TIN, administrator final-balance and plan references. Each copy adds 200 to NUA capital allocation, 1,200 to Form4972 line6 and 10,800 to line8. Independent official worksheet/rate totals are 1,790 for two copies, 3,630 for three, 5,680 for four, 7,790 for five and 12,080 for seven. These are independent expected values, not results imported from the calculator.

| Primary copies | Spouse copies | Combined Form1040 lines16/24 | Packet pages |
| --- | --- | --- | --- |
| 3 | 0 | 3,630 | 5 |
| 5 | 0 | 7,790 | 5 |
| 7 | 0 | 12,080 | 5 |
| 2 | 3 | 5,420 | 6 |
| 4 | 5 | 13,470 | 6 |

The actual public graph generates these returns with no diagnostics. One native/PDF4972 is emitted per participant; all elected sources reconcile, pension taxable income stays zero and combined special tax joins Form1040 once.

## Verified isolated evidence

Source proof: `deno test --allow-all forms/f1040/2025/form4972_multiple_nua_source.test.ts`, **1 passed/0 failed (24s)**, five complete returns and full Return1040 XSD validation. Eight tampering mutations per case reject in both native preparation and PDF generation: 80 rejection checks total. Mutations omit a copy, change box6/box3, change plan, duplicate a reference, alter calculated line6, alter final1040line16 and replace source recipient TIN.

Preservation: 13 related node/source/owner/native/PDF test files, **232 passed/0 failed (3s)** in `/tmp/opentax-form4972-multiple-nua-preservation-v2.log`. The former five-copy rejection assertion is replaced by verified five-copy native and printable totals; its complete five-source plan now falls within the reviewed route. The earlier run was231/1 solely due to that stale bound.

All **27 pages** rendered using Poppler at100dpi and visually reviewed in10 contact sheets. Review covers1040 identity/status/age boxes,4972line16mark, specialtax/amountowed, both Schedule1A senior pages, separate4972recipientnames/TINs,eligibilitychecks,NUAannotations,capital/ordinaryworksheetandline30tax. No clipping or owner crossover was observed.

Artifacts: `.state/research/2026-10-06-form4972-multiple-nua-source`; renders in its `-rendered` sibling. Source proof log `/tmp/opentax-form4972-multiple-nua-source-v2.log`. Full IRS2025v5.4 Return1040 schema SHA256 `e52dbd0fbd862929c9bc6a46db811fa2c7ae55e915651fc2679c21cb05184c6c`.

### Frozen isolated artifact digests

- `primary-2-spouse-3.json`: `b5f8b1193f926bc262840312eb7b76e5c77f1b210e35689a00ed8d1d5e135571`
- `primary-2-spouse-3.pdf`: `7dc1418709c6469ed4fcadb2d4b3b46925e6a528e3cf67f4dc16561d712dfca8`
- `primary-2-spouse-3.xml`: `bad79b11fac75d148533199af89a0f4a2a7f3748259bc42f48204ac46c37823c`
- `primary-3-spouse-0.json`: `bb37b476739a103c30084f66e43c4d0bf2de6c74e5823d4d17299c4fc0263c3c`
- `primary-3-spouse-0.pdf`: `743f2c76508fdbed5180b908057b035844ca8cdabbcc4b7e811d5cd516a1885b`
- `primary-3-spouse-0.xml`: `3ec5dbec954f9d3fe3d684d1683ddbf2d668da56252f60436bb1756e5dd74e49`
- `primary-4-spouse-5.json`: `82b8b4dda2761d9fa4d1218502a00e5c2a05498ab3cabdd5aa68746e530f83f3`
- `primary-4-spouse-5.pdf`: `e0a90b8fcf82ce2a2f3456ff11d6ec69dc5e245007e9de79fa686318e79d0e3b`
- `primary-4-spouse-5.xml`: `4d01100bdc53ff12cf2b551ad0824c022183f0a6e299a9a169dd1e90bda02129`
- `primary-5-spouse-0.json`: `4c6feb8b6dcf301fe13a18e02f9be52318f1cb5a488400c719ee71d48de3fbc5`
- `primary-5-spouse-0.pdf`: `e4e08c3d0d58575e36ee717b7684d6d57877e0e3e64281d287cb536fe3382392`
- `primary-5-spouse-0.xml`: `ef9a45c6f4552d104db50b1aa086437812c6d56a670d832acf5728e79e1c285b`
- `primary-7-spouse-0.json`: `176022bbedf7010df8b1138e70bfc31e13741745abf6592ae413bebb94b0dd7d`
- `primary-7-spouse-0.pdf`: `73a0d70003e2cecdb5a34035713c5087a4692ba18b0d235aa8c0c557c4492402`
- `primary-7-spouse-0.xml`: `63d7c99e2bc24d20c13ac1f4fe07e5d16d5c0cbb875b0ee07bd433353512a225`

## Remaining existing parent scope

This does not establish authenticated issuer bytes, prior election history or accepted prior returns. Beneficiary/partial-share, estate/death/annuity combinations, nonintegral NUA allocation, alternate-payee and other eligibility facts, ScheduleJ/AMT combinations and IRS business-rule/ATS acceptance remain subject to their existing guards and board tasks. No broad parent is closed by these packets.

## Registered held review

All five cases are now registered in the source review catalog; the actual planner reports298 fixtures,116 descriptors,113 keys,96 covered and17 uncovered. The held generator at `/tmp/opentax-form4972-multiple-nua-held-v4-oct6` produced the same five PDFs byte-for-byte as the27 pages reviewed above. Its fixed-timestamp XML, source JSON, source/template digests and per-page review slots are retained. The nine-source joint case explicitly expects two4972 copies. Filer identity is derived from actual source general fields. Initial catalog setup attempts correctly rejected missing first-name header metadata and an incomplete expected-copy inventory; the retained generator run fixes both.

- Held `form4972-nua-primary-2-spouse-3.json`: `c619072fc8ae4e6be0a0d2b6be3077496db5ce0f5090d4086e721ba1c13bd479`
- Held `form4972-nua-primary-2-spouse-3.pdf`: `7dc1418709c6469ed4fcadb2d4b3b46925e6a528e3cf67f4dc16561d712dfca8`
- Held `form4972-nua-primary-2-spouse-3.xml`: `19cb526e38f34d753bdd1c36ad3283d6cae4ca569dea3e5bf6d445dea93803ad`
- Held `form4972-nua-primary-3-spouse-0.json`: `1fea918746f56c0195ff0b6419b029159000e9c4d5a4b26787616fbf0d9a869c`
- Held `form4972-nua-primary-3-spouse-0.pdf`: `743f2c76508fdbed5180b908057b035844ca8cdabbcc4b7e811d5cd516a1885b`
- Held `form4972-nua-primary-3-spouse-0.xml`: `2e496519ff4d9736abdfa4eff6a60b5a044c7d28b01405e66f8e0717b75249e6`
- Held `form4972-nua-primary-4-spouse-5.json`: `aba6bce86e6525e5394b978fc7fcc8a1d46e8dd7ae9f1b3fbde9018cb3f6aefd`
- Held `form4972-nua-primary-4-spouse-5.pdf`: `e0a90b8fcf82ce2a2f3456ff11d6ec69dc5e245007e9de79fa686318e79d0e3b`
- Held `form4972-nua-primary-4-spouse-5.xml`: `f36f5c85456b386bba0b70ace1035d598b993d76caff1259e4ecf037c4c35794`
- Held `form4972-nua-primary-5-spouse-0.json`: `aa2118d86b27014a380a8b2cc92fb44767e6147178c5872984a5ee732b910da6`
- Held `form4972-nua-primary-5-spouse-0.pdf`: `e4e08c3d0d58575e36ee717b7684d6d57877e0e3e64281d287cb536fe3382392`
- Held `form4972-nua-primary-5-spouse-0.xml`: `2cc9cbfbfafc6e8c9d92fd0dfa96874c82b2440821b131344651b056b675cf68`
- Held `form4972-nua-primary-7-spouse-0.json`: `6858a38174c8035ad5b26bae262d405c2e4894ca611bcf1370fb5b158c6460ce`
- Held `form4972-nua-primary-7-spouse-0.pdf`: `73a0d70003e2cecdb5a34035713c5087a4692ba18b0d235aa8c0c557c4492402`
- Held `form4972-nua-primary-7-spouse-0.xml`: `f3c068481a7da514907de83aaa01ed52f68ce36b3d2a8738e99ca9a01f38ac58`
- Held `review-manifest.json`: `91bf433c8f159c93102dd41825be37cf915857202bd15a167c2cb8fbdacb6a8b`

Read-only held checker passed **5 fixtures/all27 pages**, including current source replay, native XML/XSD, all frozen artifact digests, template cache evidence and every completed page slot. Log: `/tmp/opentax-form4972-multiple-nua-held-check.log`.
