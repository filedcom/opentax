# TY2026 constants and rule source map

Implementation target: `forms/f1040/nodes/config/2026.ts`, satisfying every
field of `F1040Config` in `forms/f1040/nodes/config/types.ts`, plus explicit
year rules where a single config value cannot describe the calculation. This table is a
work list, not permission to copy a TY2025 value. Cite the exact authority and
page/section in the code review for each value. The linked PDFs are pinned by
SHA-256 in `corpus/manifest.json`.

| Config members or rule | TY2026 authority / decision |
| --- | --- |
| `brackets*`, `standardDeductionBase`, `standardDeductionAdditional` | [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) §§4.01, 4.14 and draft 1040. Base amounts: Single/MFS $16,100; MFJ/QSS $32,200; HOH $24,150. Additional age/blind amounts are $2,050 unmarried (other than surviving spouse), $1,650 otherwise. |
| `seniorDeduction*` | Draft Schedule 1-A and [2026 Schedule 1-A instructions when issued](https://www.irs.gov/forms-pubs/about-schedule-1-a-form-1040); verify thresholds and interaction with 1040 line 13a. |
| `qdcgt*`, `amt*` | Rev. Proc. 2025-32 §§4.03, 4.10; draft Schedule D and Form 6251. Reconcile any special rates/AMT capital-gain worksheet. Indexed amounts are in `2026-indexed.ts`. |
| `ssWageBase`, `ssTaxPerEmployer` | [IRS Topic 751](https://www.irs.gov/taxtopics/tc751), 2026 Social Security wage base $184,500; draft Schedule SE and Forms 4137/8919. Compute excess withholding using the correct 2026 maximum, not a literal in the 2025 node. |
| `additionalMedicareThreshold*`, `niitThreshold*` | Draft Forms 8959/8960 and their 2026 instructions; verify statutory thresholds independently. |
| `hsa*` | [Rev. Proc. 2025-19](https://www.irs.gov/pub/irs-drop/rp-25-19.pdf) and draft Form 8889. 2026 self-only $4,400, family $8,750; verify catch-up and month-by-month eligibility. |
| `ira*`, `retirementLimits`, `sepMaxContribution` | [Notice 2025-67](https://www.irs.gov/pub/irs-drop/n-25-67.pdf) and 2026 Forms 1040/Schedule 1/5329 instructions. Include age 50 and special age 60–63 rules where applicable. |
| `qbi*` | Rev. Proc. 2025-32 §4.26; draft Forms 8995/8995-A. `2026-indexed.ts` records $403,500 MFJ, $201,775 MFS, $201,750 other, and a $150,000 joint phase-in range (half for other statuses). The minimum $400 deduction for eligible active trades still needs its own calculation path. 1040 QBI moves to line 13b. |
| `eitc*` | Rev. Proc. 2025-32 §4.06 and 2026 EIC tables/instructions when final. Indexed thresholds and caps are in `2026-indexed.ts`; cover all qualifying-child counts, filing statuses, investment-income limit, and Schedule 3-A interaction. |
| `ctc*`, `actc*` | Rev. Proc. 2025-32 §4.05, draft Schedule 8812 and 1040; verify citizenship/SSN restrictions and refundable route through 1040 line 32a and Schedule 3-A. |
| `saversCredit*` | Rev. Proc. 2025-32 and 2026 Form 8880 instructions; confirm credit phaseout/status table and contribution cap. |
| `savingsBond*`, `kiddie*`, `feie*` | Rev. Proc. 2025-32 §§4.17, 4.02, 4.39 respectively; 2026 Forms 8815, 8615, 2555. |
| `section179*`, `luxuryAuto*` | Rev. Proc. 2025-32 §4.24, draft Form 4562, and separate IRS 2026 passenger-auto limit guidance when issued. Bonus-depreciation rules require date-specific review. |
| `household*` | Draft Schedule H and 2026 instructions/SSA threshold publication; verify FICA and FUTA triggers independently. |
| `salt*` | [IRS 2026 SALT correction](https://www.irs.gov/forms-pubs/correction-to-state-and-local-income-tax-deduction-amount-in-the-2026-form-1040-es), draft Schedule A, and final instructions. Cap $40,400 ($20,200 MFS); phaseout begins $505,000 ($252,500 MFS); floor $10,000 ($5,000 MFS). |
| Form 2441 year rules | Draft Form 2441 lines 3, 8, 21, 27; [IRS Publication 505 (2026)](https://www.irs.gov/publications/p505); [P.L. 119-21 §§70404–70405](https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm). The employer exclusion is $7,500 ($3,750 MFS when spouse income is required on line 19); expense caps remain $3,000/$6,000. The 2026 credit starts at 50%, drops 1 point per $2,000 AGI above $15,000 to a 35% floor, then drops from 35% above $75,000 ($150,000 MFJ) by 1 point per $2,000 ($4,000 MFJ) to a 20% floor. `form2441/year-rules.ts` owns these rules; verify against final instructions when issued. |
| `fpl*` and Form 8962 percentages/repayment | [Rev. Proc. 2025-25](https://www.irs.gov/pub/irs-drop/rp-25-25.pdf), draft Form 8962, [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) §2.04, and [2025 HHS poverty guidelines](https://public-inspection.federalregister.gov/2025-01377.pdf). The enhanced >400% FPL eligibility and excess-APTC repayment caps expire after 2025; this is logic work beyond replacing FPL amounts. The TY2025 Form 8962 instructions use prior-year guidelines, so 2025 HHS values are the expected TY2026 input. Confirm the guideline year and Alaska/Hawaii tables in final TY2026 instructions. |
| `qcdAnnualLimit`, `psoExclusionLimit` | Rev. Proc. 2025-32 and 2026 Form 1099-R/1040 instructions; verify whether each is indexed. |
| `ebl*`, `smallBizGrossReceipts` | Rev. Proc. 2025-32 §§4.31, 4.30 and 2026 Forms 461/8990 instructions. |
| `ltcPerDiemDailyLimit`, `ltcPremiumLimits` | Rev. Proc. 2025-32 §§4.62, 4.27; 2026 Forms 8853/7206 instructions. |
| `mda*`, `deathBenefitMax`, `qpri*`, `scheduleBDividendThreshold`, `sli*`, `f2106PerformingArtistAgiLimit`, `mccMaxCreditHighRate`, `sepContributionRate`, `simpleEmployerMatchRate` | Inspect the specific 2026 form/instructions and governing statute for each. Explicitly record “unchanged in 2026” with a source when that is the result. These members lack a single reliable inflation table. |

## Rules outside `F1040Config`

- 1040 line 12f permits cash charitable deductions up to $1,000, or $2,000
  MFJ, for eligible nonitemizers; [IRS Topic 506](https://www.irs.gov/taxtopics/tc506)
  and the draft 1040 are the starting authorities. Schedule A charitable
  deductions have a separate 0.5% AGI floor; verify with final Schedule A
  instructions.
- Mileage has a **midyear boundary**: [Notice 2026-10](https://www.irs.gov/pub/irs-drop/n-26-10.pdf)
  and [IRB 2026-29](https://www.irs.gov/pub/irs-irbs/irb26-29.pdf). Business
  mileage is 72.5¢ Jan–Jun and 76¢ Jul–Dec; medical/moving is 20.5¢ then
  23.5¢. A single annual constant cannot represent this rule; input records
  need date or half-year separation.
- Credits and deductions with effective-date sunsets (for example residential
  energy and clean-vehicle provisions) need source-specific TY2026 eligibility
  decisions. `year-literals.csv` identifies every shared-node 2025 literal to
  inspect; never infer that an old credit remains available from an existing
  serializer or PDF descriptor.

For every row, record the final implemented value/rule, precise source
page/section, and boundary test in the implementing PR. Re-run this audit when
final instructions or the current MeF release supersede a draft.
