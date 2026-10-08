# TY2026 constants and rule source map

Implementation target: `forms/f1040/nodes/config/2026.ts`, satisfying every
field of `F1040Config` in `forms/f1040/nodes/config/types.ts`, plus explicit
year rules where a single config value cannot describe the calculation. This table is a
work list, not permission to copy a TY2025 value. Cite the exact authority and
page/section in the code review for each value. The linked PDFs are pinned by
SHA-256 in `corpus/manifest.json`.

| Config members or rule | TY2026 authority / decision |
| --- | --- |
| `brackets*`, `standardDeductionBase`, `standardDeductionAdditional` | [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) §§4.01, 4.14 and draft 1040. These tables are recorded in `2026-indexed.ts`, with bracket bases checked at every boundary. Base deductions: Single/MFS $16,100; MFJ/QSS $32,200; HOH $24,150. Additional age/blind amounts are $2,050 unmarried (other than surviving spouse), $1,650 otherwise. |
| `seniorDeduction*` | Pinned draft Schedule 1-A Part V lines 38–43 supplies the $6,000 maximum, $75,000/$150,000 phaseout starts and 6% rate in `2026-indexed.ts`. Check the final instructions and interaction with 1040 line 13a. |
| `qdcgt*`, `amt*` | Rev. Proc. 2025-32 §§4.03, 4.10; draft Schedule D and Form 6251. Reconcile any special rates/AMT capital-gain worksheet. Indexed amounts are in `2026-indexed.ts`. |
| `ssWageBase`, `ssTaxPerEmployer` | [IRS Topic 751](https://www.irs.gov/taxtopics/tc751), 2026 Social Security wage base $184,500; draft Schedule SE and Forms 4137/8919. Compute excess withholding using the correct 2026 maximum, not a literal in the 2025 node. |
| `additionalMedicareThreshold*`, `niitThreshold*` | Pinned draft Form 8959 lines 5, 9, 14 supplies $250,000 MFJ, $125,000 MFS, $200,000 other for Additional Medicare Tax. [IRS Topic 559](https://www.irs.gov/taxtopics/tc559) confirms the same statutory, nonindexed NIIT thresholds under §1411(b). Both sets are in `2026-indexed.ts`; reconcile Form 8960 with final instructions. |
| `hsa*` | [Rev. Proc. 2025-19](https://www.irs.gov/pub/irs-drop/rp-25-19.pdf) and draft Form 8889. 2026 self-only $4,400, family $8,750; verify catch-up and month-by-month eligibility. |
| `ira*`, `retirementLimits`, `sepMaxContribution` | [Notice 2025-67](https://www.irs.gov/pub/irs-drop/n-25-67.pdf) and [IRS SIMPLE plan guidance](https://www.irs.gov/retirement-plans/plan-sponsor/simple-ira-plan). The 2026 W-2 table includes $24,500 regular elective deferrals, $8,000 age-50 catch-up, $11,250 age 60–63 catch-up, standard SIMPLE $17,000/$4,000/$5,250, and enhanced SIMPLE $18,100/$3,850/$5,250. W-2 input selects the standard or enhanced SIMPLE tier. Review 403(b) 15-year catch-up and other special plan provisions separately. |
| `qbi*` | Rev. Proc. 2025-32 §4.26; draft Forms 8995/8995-A. `2026-indexed.ts` records $403,500 MFJ, $201,775 MFS, $201,750 other, and a $150,000 joint phase-in range (half for other statuses). The minimum $400 deduction for eligible active trades still needs its own calculation path. 1040 QBI moves to line 13b. |
| `eitc*` | Rev. Proc. 2025-32 §4.06 and 2026 EIC tables/instructions when final. Indexed thresholds and caps are in `2026-indexed.ts`; cover all qualifying-child counts, filing statuses, investment-income limit, and Schedule 3-A interaction. |
| `ctc*`, `actc*` | Rev. Proc. 2025-32 §4.05 supplies the $2,200 CTC and $1,700 refundable maximum. [IRS CTC guidance](https://www.irs.gov/credits-deductions/individuals/child-tax-credit) and §24(h)(3) support $400,000 MFJ/$200,000 other phaseout starts and $500 ODC; [IRS 2026 bulletin](https://www.irs.gov/irb/2026-38_irb) confirms the $2,500 ACTC earned-income floor. These amounts are in `2026-indexed.ts`. Verify citizenship/SSN restrictions and refundable route through 1040 line 32a and Schedule 3-A. |
| Qualifying-relative gross income and dependent age | Rev. Proc. 2025-32 §4.23 sets the TY2026 gross-income ceiling at $5,300. The shared `general` node selects $5,200 for TY2025 and $5,300 for TY2026 and computes dependent ages at the selected year end. |
| `saversCredit*` | Notice 2025-67 and pinned draft Form 8880 line 6 supply the phaseout table and $2,000 per-person contribution cap in `2026-indexed.ts`; reconcile with final instructions. |
| `savingsBond*`, `kiddie*`, `feie*` | Rev. Proc. 2025-32 §§4.17, 4.02, 4.39 respectively; 2026 Forms 8815, 8615, 2555. The two kiddie floors are $1,350 in `2026-indexed.ts`. |
| `section179*`, `luxuryAuto*` | Rev. Proc. 2025-32 §4.24 and pinned [Rev. Proc. 2026-15](https://www.irs.gov/pub/irs-drop/rp-26-15.pdf) §4.01(2), Tables 1–2. The 2026 auto caps for cars placed in service that year are $12,300 first year without bonus, $20,300 with bonus, $19,800 second, $11,900 third, $7,160 succeeding. `F1040Config` and Form 4562 now distinguish third from succeeding years. Pinned Rev. Proc. 2025-16 supports the TY2025 regression correction. The node still needs placed-in-service-year selection for older vehicles on a TY2026 return; bonus-depreciation rules also require date-specific review. |
| `household*` | Pinned draft Schedule H questions A and C supply the $3,000 FICA and $1,000 quarterly FUTA cash wage triggers in `2026-indexed.ts`. Recheck against final 2026 instructions/SSA publication. |
| `salt*` | [IRS 2026 SALT correction](https://www.irs.gov/forms-pubs/correction-to-state-and-local-income-tax-deduction-amount-in-the-2026-form-1040-es), pinned draft Schedule A line 5e, and [P.L. 119-21](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm) §68(b)(5)(B). `2026-indexed.ts` has the $40,400 cap ($20,200 MFS via the node's half-cap calculation), $505,000/$252,500 phaseout starts, 30% phase-down, and $10,000/$5,000 floors. Reconcile with final Schedule A instructions. |
| Form 2441 year rules | Draft Form 2441 lines 3, 8, 21, 27; [IRS Publication 505 (2026)](https://www.irs.gov/publications/p505); [P.L. 119-21 §§70404–70405](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm). The employer exclusion is $7,500 ($3,750 MFS when spouse income is required on line 19); expense caps remain $3,000/$6,000. The 2026 credit starts at 50%, drops 1 point per $2,000 AGI above $15,000 to a 35% floor, then drops from 35% above $75,000 ($150,000 MFJ) by 1 point per $2,000 ($4,000 MFJ) to a 20% floor. `form2441/year-rules.ts` owns these rules; verify against final instructions when issued. |
| Form 8839 adoption | Pinned draft Form 8839 lines 2, 8, 11b–18b: TY2026 maximum $17,670 per child; $5,120 refundable per child; MAGI phaseout starts $265,080 over $40,000. [2025 Form 8839 instructions](https://www.irs.gov/instructions/i8839) confirm the prior-year $17,280/$5,000/$259,190 figures and five-year nonrefundable carryforward. The shared node selects year rules, sends the refundable amount to 1040 line 30, and tracks carryforwards by origin year. Its full credit-limit worksheet remains to implement. |
| `fpl*` and Form 8962 percentages/repayment | [Rev. Proc. 2025-25](https://www.irs.gov/pub/irs-drop/rp-25-25.pdf), draft Form 8962, [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) §2.04, and pinned [2025 HHS poverty guidelines](https://public-inspection.federalregister.gov/2025-01377.pdf). The six 2025 HHS base/increment values are in `2026-indexed.ts` as expected TY2026 Form 8962 inputs; confirm the guideline year against final instructions. Enhanced >400% FPL eligibility and excess-APTC repayment caps expire after 2025, requiring explicit logic changes. |
| `qcdAnnualLimit`, `psoExclusionLimit` | Rev. Proc. 2025-32 and 2026 Form 1099-R/1040 instructions; verify whether each is indexed. |
| `ebl*`, `smallBizGrossReceipts` | Rev. Proc. 2025-32 §§4.31, 4.30 and 2026 Forms 461/8990 instructions. |
| `ltcPerDiemDailyLimit`, `ltcPremiumLimits` | Rev. Proc. 2025-32 §§4.62, 4.27; 2026 Forms 8853/7206 instructions. |
| `mda*`, `deathBenefitMax`, `mccMaxCreditHighRate`, `scheduleBDividendThreshold` | Pinned 2026 draft Form 4972 lines 12–16 and page 4, Form 8396 line 3 instructions, and Schedule B Part III confirm the six values in `2026-indexed.ts`; reconcile with final forms. |
| `qpri*`, `f2106PerformingArtistAgiLimit`, `sepContributionRate`, `simpleEmployerMatchRate` | [Form 982 instructions](https://www.irs.gov/instructions/i982) and §108(a)(1)(E) limit the $750,000/$375,000 QPRI cap to a 2026 discharge under a pre-2026 written agreement; Form 982 now enforces that date condition. [Form 2106 instructions](https://www.irs.gov/instructions/i2106) and §62(b)(1)(C) support the $16,000 performing artist AGI limit. [IRS SEP guidance](https://www.irs.gov/retirement-plans/plan-participant-employee/sep-contribution-limits-including-grandfathered-sarseps) confirms 25%; [IRS SIMPLE guidance](https://www.irs.gov/retirement-plans/plan-sponsor/simple-ira-plan) confirms the ordinary 3% employer match, with enhanced-plan and other permitted variants that still need separate computation review. |

## Rules outside `F1040Config`

- 1040 line 12f permits cash charitable deductions up to $1,000, or $2,000
  MFJ, for eligible nonitemizers; [IRS Topic 506](https://www.irs.gov/taxtopics/tc506)
  and the draft 1040 are the starting authorities. Schedule A charitable
  deductions have a separate 0.5% AGI floor under P.L. 119-21 §70425.
  [2026 Publication 505](https://www.irs.gov/publications/p505), Worksheets
  2-5 and 2-6, also supplies a 5.4% overall itemized-deduction reduction
  above the top bracket threshold ($768,700 MFJ/QSS, $640,600 Single/HOH,
  $384,350 MFS). The pure 2026 calculations are in `itemized-deductions.ts`;
  charitable carryforward attribution and final Schedule A line mapping
  remain to build and verify against final instructions.
- Mileage has a **midyear boundary**: [Notice 2026-10](https://www.irs.gov/pub/irs-drop/n-26-10.pdf)
  and [IRB 2026-29](https://www.irs.gov/pub/irs-irbs/irb26-29.pdf). Business
  mileage is 72.5¢ Jan–Jun and 76¢ Jul–Dec; medical/moving is 20.5¢ then
  23.5¢. `auto_expense` and Form 2106 now require separate Jan–Jun and Jul–Dec
  business miles for TY2026 standard-mileage claims, and check their sum
  against annual business miles. Medical/moving mileage remains to implement.
- Credits and deductions with effective-date sunsets (for example residential
  energy and clean-vehicle provisions) need source-specific TY2026 eligibility
  decisions. `year-literals.csv` identifies every shared-node 2025 literal to
  inspect; never infer that an old credit remains available from an existing
  serializer or PDF descriptor.

For every row, record the final implemented value/rule, precise source
page/section, and boundary test in the implementing PR. Re-run this audit when
final instructions or the current MeF release supersede a draft.
