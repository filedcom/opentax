# 2025 actual established health plans before business-tip eligibility

## Official ordering and existing gap

The prior qualified-tip QBI repair independently derived business tips after owner halfSE but the reviewed Schedule1A route still rejected positive self-employed health deductions. The separate health family source guard also excluded any positive line13b. Fully phased-out tip sources were calculated as zero yet rejected at export.

The current archived [2025 Form1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf), pages103–104, explicitly include allocable halfSE, retirement-plan deductions and self-employed health deductions in each business's tip net-income limitation. The Multiple Trades or Businesses Worksheet subtracts allocable other deductions from filed business profit before comparing net income with reported qualified tips. The IRS [February27 revision notice](https://www.irs.gov/forms-pubs/changes-to-the-2025-instructions-for-form-1040) identifies this additional explanation.

The [2025 Form7206 instructions](https://www.irs.gov/instructions/i7206) and its filed income-limit lines derive health from establishing-business income after halfSE and retirement deductions; they do not subtract the section224 tip deduction. Therefore the source order is:

1. Actual issued receipts/business costs produce ScheduleC profit and ScheduleSE.
2. Actual established plan/month payments/employer eligibility and the owner's filed halfSE produce the health deduction.
3. Business tips are eligible only up to `max(0, profit − own halfSE − own health)`, followed by the return cap and MAGI phaseout.
4. Own health and allocated deductible business tips both reduce QBI; neither reduces ScheduleSE income or tax. The separate taxable-income cap still subtracts line13b.

The existing proportional allocation of capped/phased-out allowed tips remains a reasonable, consistent allocation, not a claimed IRS-prescribed tip-specific formula. Its legal basis and remaining broader sources are recorded in [the preceding qualified-tip source review](../qbi/ty2025-qualified-business-tips-qbi-source-review.md).

## Actual source joins

Form7206 now emits its actual one-plan or independent-owner source to Schedule1A. There is no new manually supplied health or tip-exclusion scalar. The single plan's profit/halfSE operands are derived from the actual owned public return and independently reconciled to that return at export. The MFJ family uses the existing pure owner-health calculation with each business's actual owned SE source and distinct plan/payment inventory. Schedule1A derives eligible tips from these actual sources and retains each business's health deduction in the generated QBI tip payload.

The issued NEC/MISC/K tip review and retained Schedule1A report optionally name `allocable_health_plan_identifiers`. A health-source case requires that list to exactly match the actual establishing plan for the reviewed business. Missing, borrowed and cross-owner plan IDs reject. Existing no-health source shapes remain unchanged. The retained `no_other_allocable_deductions` affirmation covers deductions beyond the actual filed halfSE and explicitly inventoried health plan; the positive source review expressly documents that scope, rather than affirming that no health deduction exists. No retirement or other unreviewed deduction is accepted.

Native/PDF preflight compares the retained health source to the separately settled Form7206 source and replays its existing strict plan, payment/month, owner, receipt, SE and final-income guards. MFJ health reconciliation is factored into a source binder and the original public guard wrapper: the wrapper replays any tip-based line13b through Schedule1A; Schedule1A uses the full health source binder before its own final tip/AGI/line13b checks. No skip flag or manually accepted adjustment replaces those checks. The pure tip model and jointQBI calculation additionally require the health amount to belong to the same actual business/owner.

The old positive-only tip worksheet calculation now permits an actual zero result from net-income limitation or full phaseout. Every payer/business/health/SE/eligibility and final Form1040 join still executes. Only after all calculations reconcile to zero is Schedule1A omitted from native XML and PDF. Positive QBI remains filed; wholly excluded QBI omits Form8995 as before. This also proves the existing actual advanced WOTC tip source when its tip deduction is fully phased out.

Shared-file changes were coordinated with the separate C/F health agent: its source schemas, policy/cash-farm and WOTC helpers remain independent. This review extends only C-only business-tip/health combinations; it does not establish mixed C/F tip eligibility or permit an aggregate tip exclusion across farm rows.

## Complete public packets

All figures below are independently asserted source equations, SE rounding, tax-table or Tax Computation Worksheet values, health caps and owner allocation amounts. Each packet goes through public input calculation, native full-return local XSD validation and a flattened filled PDF.

|Case|Profit|HalfSE|Health|Tip deduction|QBI|QBI deduction|AGI|Taxable income|Total tax|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|Single positive health|72000|5087|6000|12000|48913|6633|60913|26530|13118|
|Single issuedW2, QBI binding|72000|5087|6000|12000|48913|9783|110913|73380|21230|
|Single tip net-income limited|10000|707|6000|3293|0|0|3293|0|1413|
|Single health income limited|10000|707|9293|0|0|0|0|0|1413|
|Single full tip phaseout|72000|5087|1200|0|65713|13143|165713|136820|35857|
|MFJ independent-owner cap/phaseout|140000|5311|8220|24800|101669|20334|302569|225935|51038|
|MFJ primary health cap|15000|488|12086|1000|1426|285|178526|145741|22866|
|MFJ full tip phaseout|140000|5311|8220|0|126469|25294|302569|245775|55800|
|Actual advanced WOTC full tip phaseout|496400|17565|0|0|478835|1800|478835|461285|166053|

The MFJ cap/phaseout family retains Casey halfSE4239/health2220/tip exclusion10629 and Alex halfSE1072/health6000/tip exclusion14171. Actual MAGI302569 produces a200 phaseout after the25000 return cap. The primary health-cap family independently files Alex health9866 (profit10000 less own halfSE134), while Casey's halfSE354 and health2220 leave2426 before Casey's1000 qualified-tip deduction. QBI1426 belongs to Casey; Alex's QBI is zero.

The advanced WOTC source has actual gross receipts500000, wages6000, determined credit2400 and filed profit496400 after the full wage reduction. HalfSE17565 and no deductible tips produce QBI478835. Its wage limit1800 binds above the phase-in range. The independent Tax Computation Worksheet is `round(461285 × .35 − 30452.75) = 130997`; SE35130, additional Medicare2326 and WOTC use2400 produce final tax166053. Its source tip amount30000 is actually fully phased out; it is not removed from the issued source or replaced with missing tip facts.

## Conflicts and limits

Negative exports replay independently retained node views from serialized full source packets. JavaScript object aliases in the initial negative fixtures were corrected so a mutation does not inadvertently replace every retained source view together; this is a fixture correction, not outside-source authentication. Negative exports cover missing or borrowed plan review IDs, changed plan premiums and payment references, borrowed establishing businesses/recipients, changed retained health/QBI tip amounts, omitted source payloads, changed issued payer tips/SSNs, and changed Schedule1 income/health or final AGI/line13b. Zero-source omissions are checked as strictly as positive filings. Direct Schedule1A checks apply to its own source/final-return mutations; a mutation only to the separately retained Form8995 payload is rejected by Form8995 and complete native/PDF exports, rather than incorrectly requiring the unchanged Schedule1A itself to fail.

The proofs use whole-dollar filed source operands, one actual ScheduleC per owner, existing strict one-plan/independent-plan sources, and no retirement/Marketplace overlap. They do not claim general fractional premiums/SE allocations, farm tips, several businesses within one owner, positive retirement deductions, tips with an advanced health/WOTC combination, outside issuer authentication, ATS acceptance or complete parent TODO coverage. No main, frozen board, future section or PR writes occur.

## Evidence

- Fixture/test: `forms/f1040/2025/pdf/reviews/composed/qualified-tip-health.fixture.ts` and `.test.ts`.
- Retained packets: `/tmp/opentax-qualified-tip-health-evidence`.
- Eight health packet/XSD run: `/tmp/opentax-qualified-tip-health-focused-v1.log` (eight positive tests passed; four test-only overbroad descriptor expectations subsequently corrected).
- Initial final full source gate:13/0, `/tmp/opentax-qualified-tip-health-focused-final.log`.
- Final explicit plan-review source gate:13/0 (1m2s), `/tmp/opentax-qualified-tip-health-focused-plan-review-final.log`.
- Issued NEC/MISC/K no-health full XSD compatibility:3/0 (8s), `/tmp/opentax-qualified-tip-health-issued-replay-final.log`.
- Separate advanced full-phaseout XSD/filledPDF proof: `/tmp/opentax-qualified-tip-health-advanced-zero.log`.
- Related19-file compatibility before plan-review metadata:221/0, `/tmp/opentax-qualified-tip-health-compat-v1.log`; final metadata gate221/0 (3m44s), `/tmp/opentax-qualified-tip-health-compat-final-v2.log`.
- Standalone import/Schedule1A first gate:30/0, `/tmp/opentax-tip-health-initial-check.log`.
- Render/reopen/all-page review: `/tmp/opentax-qualified-tip-health-page-review-final.log`, script `/tmp/opentax-qualified-tip-health-review.py`.
- Final27 hashes and60 prior hashes independently reverified: `/tmp/opentax-qualified-tip-health-artifact-verification.log`.
- Pre-edit compact: `/tmp/opentax-qualified-tip-health-learnings.md`.

Nine packets contain27 retained source/XML/PDF files and149 pages. All PDFs were reopened, checked for zero fields/widgets and rendered at100dpi; every page was inspected in contact sheets, with critical owner health-cap7206, joint8995/Schedule1A and advanced8995-A pages enlarged. The nine filed PDFs remained byte-identical after the explicit plan-ID source refresh. `source-xml-pdf-sha256.json` records27 final hashes; `filed-pdf-review-preservation.json` records the unchanged filed PDFs. All60 prior tip/Medicare/zero-eligible/independent-health source/XML/PDF hashes remain unchanged (`prior-artifact-preservation.json`).

## Integrated main artifact replay

At main42cccdf15, all nine public source packets are recalculated and prepared through current native/PDF builders. Every filled PDF is byte-identical to the previously inspected149 pages. Fresh source/XML/PDF snapshots and27 hashes are retained in `/tmp/opentax-tip-health-current-main-replay`; original reviewed artifacts remain unchanged. Replay script `/tmp/opentax-tip-health-current-main-replay.ts`, terminal0 log `/tmp/opentax-tip-health-current-main-replay.log`, SHA256 `7438495634abbf105fe1c4e78d1eaef120cb7ef8c364a99e1ce307385c396059`. Combined source/conflict/compatibility gate remains running; this artifact comparison alone does not close the broader parent.

Integrated main eight-file source/conflict/compatibility gate:51 passed/0 failed(4m16s), `/tmp/opentax-tip-two-farm-health-current-main.log`. This includes tip-health, two-farm/C-F health, prior C/C health, original tips, Medicare/zeroeligibility and Publication974. Prior running-only checkpoint is superseded by this terminal result.
