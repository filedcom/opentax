# Actual primary C tips with spouse cash-farm sources

## Existing gap and official ordering

The existing business-tip route rejected any nonzero ScheduleF income and required its owned ScheduleSE inventory to contain only ScheduleCs. Native Schedule1A also required Schedule1 line6 to be zero. This prevented an eligible primary event-food-service proprietor from claiming actual tips while the spouse had a sourced cash farm. The separate reviewed mixed C/F WOTC parent retained health deductions but omitted actual business-tip QBI exclusions and its native income cap omitted Form1040 line13b.

The [2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), pages103–104, limit each business's eligible tips to net income after allocable deductions. Their Multiple Trades or Businesses Worksheet lists ScheduleC/E/F profits and subtracts allocable other deductions before comparing the result with that business's issued tips. The spouse farm in this proof claims no tips. Its profit, halfSE and health cannot increase the primary C business's eligible tips. The [Form7206 instructions](https://www.irs.gov/instructions/i7206) independently cap health after the establishing owner's halfSE; health precedes the business-tip net-income test. Neither health nor section224 tips reduces SE earnings/tax. Deductible tips reduce the matched business's QBI under section199A(c)(4)(D), while the final QBI taxable-income cap also subtracts line13b.

## Complete source route

ScheduleF emits its calculated filed farm rows, with identity, owner, cash/accrual method and participation facts. Schedule1A binds those rows to the complete actual owned C/F SE inventory and farm total. The newly accepted mixed branch has one eligible primary C and one positive, materially participating spouse cash farm, regular SE and MFJ status. The C owner halfSE comes from that owner's actual SE instance; the spouse farm's halfSE remains separate. Native export recomputes actual ScheduleF source output and the full issued-source owner-SE joins.

The source packets retain issued primary event-catering NEC amounts, voluntary customer tip records and eligible server-duty/occupation reviews; the C classification is event food service/catering, code722320. They retain the spouse farm's actual issued agricultural-program G and custom-work NEC, business expenses, each owner's issued W2, and existing employer/worker/certification/payroll/SSA and section52 ownership sources where WOTC applies. No supplied farm profit, owner halfSE, health amount or tip-exclusion scalar opens the route. Outside issuer authentication remains open.

Actual independent C/F policy and monthly billing/payment/eligibility records derive each owner health amount before tip eligibility. Explicit tip-review plan IDs must identify the C business's own established policy. The farm plan is independently source-checked but does not enter C tip eligibility. The ordinary joint QBI rows subtract actual own health and only the C tip exclusion. Reviewed phase-in/above-range farmWOTC parents retain the same source payload, derive matched row exclusions, preserve full determined wage reduction before SE, and refigure taxable income after the actual line13b deduction.

The health source binder calls the farm return binder. To avoid recursive native replay, the farm binder recomputes and compares the pure actual Schedule1A/QBI tip payload; public native8995/8995-A and Schedule1A entry points separately replay the issued tip records. No skip flag or substituted scalar bypasses the source checks. Existing health core/wrapper and graph emissions remain intact; this commit does not edit the shared health helper or registry fixtures.

## Public full-return positives

Amounts below are filed whole-dollar lines. Issued premiums and W2 sources retain their original cents; underlying graph AGI/TI cents are retained and independently joined before filed rounding.

|Case|HalfSE|Health|Tips|QBI deduction|Filed AGI|Filed TI|Ordinary tax|Total tax|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|Owned C/F health|4372|15600|12000|11686|300431|245245|44553|51466|
|C health net-income limit|4372|21600|22729|8340|294431|231862|41341|48254|
|No health, cap/phaseout|4372|0|23400|12526|316031|248605|45359|52272|
|Both health income limits|4372|86030|0|0|230001|198501|33498|40411|
|Actual WOTC phase-in|17277|15600|6800|33959|482524|410265|85411|119702|
|Above range, tips fully phased out|16288|15600|0|166423|1232115|1034192|306714|111536|
|Ordinary no-credit election|4271|15600|12000|11226|298132|243406|44111|53203|

The ordinary positive primary profit35201 has own halfSE472. Health6000 and tips12000 leave C QBI16729; the spouse farm's own halfSE3900 and health9600 leave farm QBI41701. With primary health12000 and reported tips40000, eligible tips are22729, primary QBI is zero and only farm QBI41701 remains. With the actual health income limits, C health34729 plus farm health51301 gives health86030, eligible tips/QBI zero; the existing actual joint zero Form8995 filing behavior is preserved, with zero lines. Actual zero tips omit Schedule1A only after complete source reconciliation; owner7206 copies remain.

In the phase-in case, primary profit177372 less own halfSE3993, health6000 and tips6800 gives C QBI160579. Farm profit188029 less own halfSE13284 and health9600 gives farm QBI165145. Actual employer wages3000.52/4000.49 and determined group shares1029/1371 produce filed QBI wages1972/2629 and wage limits986/1315. Independently rounded phased reductions15901/15285 leave components17128/16831. Taxable income before QBI444224 gives phase fraction `(444224−394600)/100000`; independently rounded components yield total QBI deduction33959. Actual WOTC determined/use2400 follows the tax calculation. Above range, source tips40000 remain recorded but their deductible amount is zero; QBI832114 yields166423. Determined WOTC384000 is retained, while actual Form3800 current use236285 produces final tax111536. No positive tip deduction is invented above full MAGI phaseout.

## Conflicts, evidence and limits

Serialized independent source views reject changed farm projection/profit/owner, duplicated farm inventory or tip report, borrowed issued farm-G owner, changed owned SE inventories, borrowed issued farm NEC recipient, altered issued W2, borrowed spouse health plan in C tip review, changed actual insurer payment owner, changed/omitted tip payloads, changed health/AGI/line13b and detached advanced parent tip source. The public SSTB flag rejects this tip route; a service business is not relabeled through a scalar eligibility override.

Each of seven source packets passes public calculation, complete native XML with local TY2025v5.4 XSD and a flattened filled PDF. Source equations, owner splits, independent cap/phase-in formulas, zero filing behavior and both health copies are asserted. Broader same-owner C/F or several C/farm businesses, farm tip claims, optional farm methods, losses in this new tip branch, retirement/Marketplace combinations, outside-source authentication, ATS and parent completion remain open. Existing non-tip owner/farm/health branches are preserved and covered by compatibility.

- Source fixture/test: `forms/f1040/2025/pdf/mixed-cf-qualified-tip.fixture.ts` / `.test.ts`.
- Seven source/XML/PDF packets: `/tmp/opentax-mixed-cf-qualified-tip-evidence`.
- Seven full-XSD/PDF positives plus source conflicts:10/0 (46s), `/tmp/opentax-mixed-cf-tip-source-final.log`.
- Final strengthened per-employer worksheet and Tax Computation Worksheet gate:10/0 (43s), `/tmp/opentax-mixed-cf-tip-source-worksheet-final.log`.
- Final additional farm-G owner/duplicate-source negatives:3/0 (3s), `/tmp/opentax-mixed-cf-tip-negatives-final.log`.
- Related twelve-file compatibility:138/0 (4m54s), `/tmp/opentax-mixed-cf-tip-compat-final.log`.
- Standalone import/initial unit proof:30/0, `/tmp/opentax-mixed-cf-tip-initial-v2.log`.
- Render/reopen review: `/tmp/opentax-mixed-cf-tip-page-review.log`; script `/tmp/opentax-mixed-cf-tip-review.py`.
- Pre-edit compact: `/tmp/opentax-mixed-cf-tip-learnings.md`.

Earlier fixture-only failures were corrected: the first expectation incorrectly omitted the already-supported zero joint Form8995; negative fixtures used a nonexistent W2 index in a one-W2 case and the wrong public SSTB field. No production guard was weakened to fix these assertions. All seven PDFs reopened with zero fields/widgets and rendered at100dpi. All220 pages were inspected at contact-sheet overview level; the actual primary health limit, business-tip net-income worksheet, distinct C/F QBI rows and both phase-in8995-A pages were additionally reviewed enlarged. The independent ordinary tax assertions use the applicable 2025 Tax Computation Worksheet SectionB rate/subtraction values. `source-xml-pdf-sha256.json` freezes21 current source/XML/PDF hashes; `prior-artifact-preservation.json` records108 unchanged prior tip/health/C/F source/XML/PDF files. Verification log: `/tmp/opentax-mixed-cf-tip-artifact-verification.log`. The final twelve-file compatibility gate passes138/0 (4m54s), preserving the wider C-only tips/health, existing ordinary/WOTC farm positive/loss/controlled sources, ScheduleF/Schedule1A/8995-A units and standalone Publication974 entry point.

## Integrated main source and artifact replay

Fresh detached9a7da5a78 replay recomputes all7 public source packets with empty diagnostics, unchanged complete normalized pending/source fields, successful native preparation and full localXSD. All7 PDFs equal the220 reviewed pages and reopen without AcroForm fields/widget annotations. All XMLs differ only in ReturnTs; all21 original source/XML/PDF hashes remain unchanged. Current artifacts `/tmp/opentax-mixed-cf-tip-current-main-evidence-9a7da5a78`; manifest SHA256 `da607b9a182a27b41d54f39f12bc4db86084bb55967b0d54b13c31195ae4f24b`; terminal0 verification `/tmp/opentax-mixed-cf-tip-current-main-verification.log`. Initial replay completed all7 packet comparisons but its relative preservation-manifest paths caused exit1; the separate verifier resolves the original root and proves21 originals unchanged. No production repair was needed. Combined main gate remains running.
