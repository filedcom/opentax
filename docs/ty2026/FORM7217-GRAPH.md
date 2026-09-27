# TY2026 Form 7217 partnership-property distribution contract

The current [Form 7217 (December 2024)](corpus/authorities/f7217--2024.pdf),
SHA-256 `9b16ed91da1ea50b4ea1ba59363726bee7b7b4576d77307cd507c3bd19dba02d`,
and [instructions](corpus/authorities/i7217--2024.pdf), SHA-256
`a00432e6260a82bc58b90356c5e1abfa528e668694a45e5e88b3322da596925d`,
are pinned. The instructions explicitly apply this revision to tax years
beginning in 2024 **or later** until revised. Also apply the [IRS April 2026
box 19 update](https://www.irs.gov/forms-pubs/update-to-instructions-for-form-7217-regarding-new-reporting-codes-on-box-19-schedule-k-1-form-1065):
it changes the Schedule K-1 box 19 source codes for lines 3, 5a and 5b
for 2025 and subsequent years, ahead of a planned December 2026
instruction revision. The older PDF alone would misidentify these inputs.

## Filing and source ownership

File **one Form 7217 per actual distribution date** on which a partner
receives property subject to §732, including non-liquidating and liquidating
distributions. Multiple dates require multiple forms even within one
transaction. The instructions exclude money-only/§731(c) securities-only
distributions, §707(a)(1) service payments and disguised sales. Preserve
partner identity, partnership EIN, actual receipt date, K-1 box 19 codes
and supplemental statements, pre-distribution outside basis, liabilities
treated as money under §752(b), marketable-security FMV, property-level
inside basis, FMV, §732 adjustments and resulting partner basis.

| Printed part | Calculation and downstream effect |
| --- | --- |
| Part I 1–3 | Mark complete liquidation and §751(b) sale/exchange separately. Line 3 is partnership aggregate basis immediately before distribution, including specified basis adjustments, and must equal Part II line B column (b). The April 2026 update points to K-1 box 19 codes B/C/G or a §732(d) statement; marketable-security basis can appear with codes A/F statements. |
| 4–8 | Line 4 is partner outside basis before distribution. Separate cash/deemed cash at 5a from §731(c) marketable-security FMV at 5b. Compute 5c–7 recognized gain and answer whether U.S. tax is required. Apply the updated box 19 codes A/D/F and attached A/F securities statements. A §751(b) exchange needs a separate computation/statement and character route. |
| 9–10 | Reduce outside basis by **cash** at line 9, with the printed §737 gain instruction, then allocate the resulting limit to distributed property. Non-liquidating and liquidating distributions use different line 10 caps. Part II line B column (e) must equal line 10. |
| Part II | Keep each property separately, including description/code, inside basis, §732(d)/§732(f)/§734(b)/§743(b) adjustment boxes, FMV and partner's resulting basis. Continue beyond 30 printed rows with attached Parts II and line A totals. The resulting basis and holding/character facts feed later depreciation or disposition, including Forms 4562/4797/Schedule D/8949 as appropriate. |

The [TY2025 ATS scenario 12 review](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/docs/ats/ty2025.md) already identifies a
source inconsistency: the packet prints Form 7217 line 10 as **$6,000**
while Part II column (e) totals **$4,000**. Preserve this as a failing
source fixture; do not make the 2026 engine silently accept the mismatch.

## Current code boundary

- The shared [input node](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/nodes/inputs/f7217/index.ts)
  calculates aggregate Part I values and refuses recognized gain because
  it has no Schedule D/Form 4797 route. It emits **no** downstream output,
  is absent from the 2026 registry, and treats property-level final bases
  as optional inputs instead of deriving/reconciling the allocation.
- TY2025 [MeF `IRS7217`](https://github.com/filedcom/opentax/blob/b7c07b616564167a91bc588dba05caab2a28e054/forms/f1040/2025/mef/forms/f7217.ts)
  emits one document per input item and has no TY2026 XSD/rule check. There
  is no Form 7217 PDF descriptor in the TY2025 PDF inventory and no 2026
  PDF/MeF route. The [306-widget inventory](pdf-fields-f7217.csv) is the
  current two-page map; it includes the 30 property rows and totals.
- K-1 box 19 intake must be updated for the April 2026 correction and must
  preserve dated distributions. A single annual K-1 aggregate cannot prove
  the one-form-per-date rule or the property-level basis ledger.

## Build order and acceptance

1. Recheck the IRS product page for a December 2026 revision and current
   e-Services XSD/rules. Until then, combine the pinned continuous-use PDFs
   with the April 2026 box 19 update, and record any source revision/hash.
2. Parse K-1 box 19 codes and supplemental statements into dated
   distribution events. Classify money-only exclusions, property,
   marketable securities, §751(b), §737 and liability relief before
   calculating Part I.
3. Allocate and reconcile property basis at both Part II line B totals;
   post the resulting asset basis to the relevant activity/asset ledger.
   Route recognized gain and any §751 ordinary character to the correct
   Schedule D/Form 4797/8949 branch instead of merely blocking it.
4. Render one Form 7217 per date, with property continuation pages and
   required §751(b)/basis statements. Build current `IRS7217` XML and
   validate the full return and active reject rules, including attachment
   count, partner/EIN identity and 3↔Part II(b), 10↔Part II(e) sums.
5. Test two dates in one transaction, 30/>30 properties, K-1 A/B/C/D/F/G
   sources, cash-only no-file, marketable securities, liability relief,
   liquidating/non-liquidating basis, §751(b) character, recognized gain,
   §737 adjustment and the ATS 12 discrepancy. Preserve TY2025 MeF tests.

This is a research and implementation contract, not a registered TY2026
Form 7217 filing route.
