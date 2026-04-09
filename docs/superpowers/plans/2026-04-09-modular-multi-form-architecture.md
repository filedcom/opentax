# Modular Multi-Form Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the tax engine so AI skills can build and maintain any tax form (f1040, f1120, etc.) across any year with zero human intervention.

**Architecture:** Convention-driven path resolution (`form + year` → all paths); a short `FORM.md` policy doc per form orients AI agents; a `CONFIG_BY_YEAR` barrel enables year-agnostic shared nodes; benchmark pass rate (≥95%) is the sole success metric.

**Tech Stack:** Deno, TypeScript, Zod — no new dependencies

---

## File Map

### Created
- `forms/f1040/FORM.md` — AI orientation doc
- `forms/f1040/nodes/config/types.ts` — `F1040Config` interface
- `forms/f1040/nodes/config/index.ts` — `CONFIG_BY_YEAR` barrel

### Modified
- `forms/f1040/nodes/config/2025.ts` — add `config2025` aggregate export
- `core/types/node-context.ts` — add `formType` field
- `benchmark/run_benchmark.ts` — `--year` flag + form/year directory structure
- `.state/bench/state.json` — version 2 schema
- `docs/architecture/STRUCTURE.md` — document new layout
- 38 config-importing nodes — replace direct `_2025` imports with `CONFIG_BY_YEAR` barrel
- `.claude/skills/tax-build/SKILL.md` + agents — convention-driven paths, FORM.md context
- `.claude/skills/tax-fix/SKILL.md` + agents — convention-driven, form-keyed state
- `.claude/skills/tax-status/SKILL.md` — enumerate forms from directory, v2 state
- `.claude/skills/tax-cases/SKILL.md` — convention-driven cases dir

### Moved
- `benchmark/cases/NN-*/` → `benchmark/cases/f1040/2025/NN-*/` (97 directories)

---

## Task 1: Move Benchmark Cases to Form/Year Subdirectory

**Files:**
- Move: `benchmark/cases/01-single-w2-minimal/` … `97-*` → `benchmark/cases/f1040/2025/`

- [ ] **Step 1: Create directory and move all cases**

```bash
mkdir -p benchmark/cases/f1040/2025
# From the repo root:
for d in benchmark/cases/[0-9]*/; do
  mv "$d" benchmark/cases/f1040/2025/
done
```

- [ ] **Step 2: Verify 97 cases moved**

```bash
ls benchmark/cases/f1040/2025 | wc -l
# Expected: 97
```

- [ ] **Step 3: Commit**

```bash
git add benchmark/cases/
git commit -m "chore: move benchmark cases to cases/f1040/2025/"
```

---

## Task 2: Update Benchmark Runner for Form/Year Flags

**Files:**
- Modify: `benchmark/run_benchmark.ts`

The runner currently uses `CASES_DIR = join(SCRIPT_DIR, "cases")` and checks for `"1120-"` prefix via a `--form` flag. Update it to use `benchmark/cases/{form}/{year}/` structure with `--form` (default `f1040`) and `--year` (default `2025`) flags.

- [ ] **Step 1: Update the CASES_DIR derivation and flag parsing**

Replace lines 9–19 in `benchmark/run_benchmark.ts`:

```typescript
const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR    = join(SCRIPT_DIR, "..");

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = Deno.args;

function getFlag(flag: string, defaultVal: string): string {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : defaultVal;
}

const formFlag = getFlag("--form", "f1040");
const yearFlag = getFlag("--year", "2025");
const jsonFlag = args.includes("--json");

const CASES_DIR = join(SCRIPT_DIR, "cases", formFlag, yearFlag);
```

- [ ] **Step 2: Remove the old prefix-based form filtering (lines 162–164)**

Delete the lines:
```typescript
  if (formFlag === "1120" && !e.name.startsWith("1120-")) continue;
  if (formFlag === "1040" && e.name.startsWith("1120-")) continue;
```

These are no longer needed — each form+year has its own directory.

- [ ] **Step 3: Run benchmark to confirm still 94/97**

```bash
deno task bench
# Expected: 94 PASS  3 FAIL  out of 97 cases
```

- [ ] **Step 4: Commit**

```bash
git add benchmark/run_benchmark.ts
git commit -m "feat: benchmark runner supports --form/--year flags with directory structure"
```

---

## Task 3: Create FORM.md Policy Document

**Files:**
- Create: `forms/f1040/FORM.md`

- [ ] **Step 1: Write the file**

```markdown
# Form 1040 — U.S. Individual Income Tax Return

IRC §6012 | IRS Pub 17 | MeF Schema: 2025v3.0

## What This Form Does
Annual income tax return for U.S. individuals (and married couples filing jointly).
Computes taxable income, applies the tax rate schedule, claims credits, and
determines refund or amount owed. Most other IRS forms feed into it as inputs.

## Node Categories

- `nodes/inputs/`          → 131 nodes — one per IRS input document (W-2, 1099s, Schedule C, A, …)
- `nodes/intermediate/forms/`       → ~35 nodes — computed forms (8959, 8960, EITC, 8889, …)
- `nodes/intermediate/worksheets/`  → ~10 nodes — computation worksheets (brackets, Sch D, QBI, …)
- `nodes/intermediate/aggregation/` → ~8 nodes  — AGI, Schedule B/D/2/3 aggregators
- `nodes/outputs/`          → 2 nodes  — final line aggregators (f1040, schedule1)

## Conventions

- **Config-injected nodes** import year constants via `CONFIG_BY_YEAR[ctx.taxYear]` from
  `nodes/config/index.ts`. Adding a new year = add entry to that barrel + a new `config.ts`.
- **Year-specific structural overrides** (rare, ~2–5 per year) live in `{year}/nodes/`.
  A year's `registry.ts` imports the override instead of the shared node.
- All nodes follow the file shape in `CLAUDE.md`: imports → enums → schemas → helpers → class → singleton.
- Node discovery: `glob forms/f1040/nodes/**/ ` — no master list needed.

## IRS Specs

- XSD schemas: `.state/research/docs/IMF_Series_2025v3.0/1040x_2025v3.0/`
- PDF field dumps: `.state/field-dumps/`
- Instructions PDF: https://www.irs.gov/pub/irs-pdf/i1040.pdf
- IRS Pub 17: https://www.irs.gov/publications/p17
- VITA exercises (benchmark ground truth): https://www.irs.gov/pub/irs-pdf/p4491.pdf

## Benchmark

Cases: `benchmark/cases/f1040/{year}/`
Runner: `deno task bench --form f1040 --year {year}`
Pass threshold: 95% (≥ 93 of 97 for the current case set)

## Known Failure Modes (TY2025)

- **SSA + NIIT interaction** (cases 67, 91, 95): `form8959` does not correctly
  account for SSA income stacking with 1099-B capital gains when computing
  Additional Medicare Tax MAGI.

## Adding a New Tax Year

1. Copy `forms/f1040/2025/` → `forms/f1040/{year}/`
2. Update `{year}/config.ts` with new IRS Rev. Proc. constants
3. Add `{year}` entry to `nodes/config/index.ts`: `import { config{year} } from "../../{year}/config.ts"`
4. Run `deno task bench --form f1040 --year {year}` — most nodes pass unchanged
5. Any failure → that node has structural changes → create override at `{year}/nodes/{path}/index.ts`
6. Update `{year}/registry.ts` to import override instead of shared node
7. Update this FORM.md: bump "Known Failure Modes" section

## Adding a New Form

Do not modify f1040 files. Run: `/tax-build {form_number} {year}`
The skill will create `forms/f{form}/` following this exact structure.
```

- [ ] **Step 2: Commit**

```bash
git add forms/f1040/FORM.md
git commit -m "docs: add FORM.md policy document for f1040"
```

---

## Task 4: Create `F1040Config` Interface

**Files:**
- Create: `forms/f1040/nodes/config/types.ts`

This interface bundles all year-specific constants. Every config-injected node accesses constants through this type.

- [ ] **Step 1: Write the interface**

```typescript
// forms/f1040/nodes/config/types.ts
import type { FilingStatus } from "../types.ts";
import type { Bracket } from "./2025.ts";

export interface F1040Config {
  // ── Tax brackets ──────────────────────────────────────────────────────────
  bracketsMfj: ReadonlyArray<Bracket>;
  bracketsSingle: ReadonlyArray<Bracket>;
  bracketsHoh: ReadonlyArray<Bracket>;
  bracketsMfs: ReadonlyArray<Bracket>;

  // ── Standard deduction ────────────────────────────────────────────────────
  standardDeductionBase: Record<FilingStatus, number>;
  standardDeductionAdditional: Record<FilingStatus, number>;

  // ── Senior deduction (OBBBA §70302) ───────────────────────────────────────
  seniorDeductionMax: number;
  seniorDeductionPhaseoutSingle: number;
  seniorDeductionPhaseoutMfj: number;
  seniorDeductionPhaseoutRate: number;

  // ── QDCGT thresholds ──────────────────────────────────────────────────────
  qdcgtZeroCeiling: Record<FilingStatus, number>;
  qdcgtTwentyFloor: Record<FilingStatus, number>;

  // ── AMT ───────────────────────────────────────────────────────────────────
  amtExemption: Record<FilingStatus, number>;
  amtPhaseOutStart: Record<FilingStatus, number>;
  amtBracket26ThresholdStandard: number;
  amtBracket26ThresholdMfs: number;
  amtBracketAdjustmentStandard: number;
  amtBracketAdjustmentMfs: number;

  // ── FICA / Social Security ────────────────────────────────────────────────
  ssWageBase: number;
  ssTaxPerEmployer: number;
  additionalMedicareThresholdMfj: number;
  additionalMedicareThresholdMfs: number;
  additionalMedicareThresholdOther: number;

  // ── NIIT ──────────────────────────────────────────────────────────────────
  niitThresholdMfj: number;
  niitThresholdMfs: number;
  niitThresholdOther: number;

  // ── HSA ───────────────────────────────────────────────────────────────────
  hsaSelfOnlyLimit: number;
  hsaFamilyLimit: number;
  hsaCatchup: number;

  // ── IRA ───────────────────────────────────────────────────────────────────
  iraContributionLimit: number;
  iraContributionLimitAge50: number;
  iraPhaseoutSingleLower: number;
  iraPhaseoutSingleUpper: number;
  iraPhaseoutMfjLower: number;
  iraPhaseoutMfjUpper: number;
  iraPhaseoutNoncoveredMfjLower: number;
  iraPhaseoutNoncoveredMfjUpper: number;
  iraPhaseoutMfsLower: number;
  iraPhaseoutMfsUpper: number;

  // ── QBI ───────────────────────────────────────────────────────────────────
  qbiThresholdSingle: number;
  qbiThresholdMfj: number;
  qbiPhaseInRange: number;

  // ── EITC ──────────────────────────────────────────────────────────────────
  eitcMaxCredit: Record<number, number>;
  eitcPhaseInEnd: Record<number, number>;
  eitcPhaseoutStart: Record<number, [number, number]>;
  eitcIncomeLimit: Record<number, [number, number]>;
  eitcInvestmentIncomeLimit: number;

  // ── CTC / ACTC ────────────────────────────────────────────────────────────
  ctcPerChild: number;
  odcPerDependent: number;
  actcMaxPerChild: number;
  ctcPhaseOutThresholdMfj: number;
  ctcPhaseOutThresholdOther: number;
  actcEarnedIncomeFloor: number;

  // ── Saver's Credit ────────────────────────────────────────────────────────
  saversCreditContributionCap: number;
  saversCreditAgiSingle: { rate50: number; rate20: number; rate10: number };
  saversCreditAgiHoh:    { rate50: number; rate20: number; rate10: number };
  saversCreditAgiMfj:    { rate50: number; rate20: number; rate10: number };

  // ── Savings Bonds (8815) ──────────────────────────────────────────────────
  savingsBondPhaseoutStartMfj: number;
  savingsBondPhaseoutEndMfj: number;
  savingsBondPhaseoutStartSingle: number;
  savingsBondPhaseoutEndSingle: number;

  // ── Kiddie Tax (8615) ─────────────────────────────────────────────────────
  kiddieUnearnedIncomeThreshold: number;
  kiddieStandardDeductionFloor: number;

  // ── FEIE (2555) ───────────────────────────────────────────────────────────
  feieLimit: number;
  feieHousingBase: number;

  // ── Section 179 / Depreciation (4562) ────────────────────────────────────
  section179Limit: number;
  section179PhaseoutThreshold: number;
  luxuryAutoYear1NoBonus: number;
  luxuryAutoYear1WithBonus: number;
  luxuryAutoYear2: number;
  luxuryAutoYear3Plus: number;

  // ── Household Employment (Schedule H) ─────────────────────────────────────
  householdFicaThreshold: number;
  householdFutaQuarterlyThreshold: number;

  // ── SALT (Schedule A) ─────────────────────────────────────────────────────
  saltCap: number;
  saltPhaseoutThreshold: number;
  saltPhaseoutThresholdMfs: number;
  saltPhaseoutRate: number;
  saltFloor: number;
  saltFloorMfs: number;

  // ── Dependent Care (2441) ─────────────────────────────────────────────────
  depCareExpenseCapOne: number;
  depCareExpenseCapTwoPlus: number;
  depCareEmployerExclusion: number;
  depCareEmployerExclusionMfs: number;
  depCareCreditRateAgiThreshold: number;
  depCareCreditRateBracketSize: number;

  // ── ACA Premium Tax Credit (8962) ─────────────────────────────────────────
  fplBase: number;
  fplIncrement: number;

  // ── IRA Distributions (1099-R) ───────────────────────────────────────────
  qcdAnnualLimit: number;
  psoExclusionLimit: number;

  // ── Excess Business Loss (Schedule C / F) ─────────────────────────────────
  eblThresholdSingle: number;
  eblThresholdMfj: number;

  // ── §163(j) Interest Limitation (8990) ───────────────────────────────────
  smallBizGrossReceipts: number;

  // ── Retirement Plan Limits (W-2) ──────────────────────────────────────────
  retirementLimits: Record<string, Record<number, number>>;

  // ── LTC Per-Diem (8853) ───────────────────────────────────────────────────
  ltcPerDiemDailyLimit: number;

  // ── MDA / Lump-Sum Distributions (4972) ───────────────────────────────────
  mdaMax: number;
  mdaPhaseOutThreshold: number;
  mdaZeroThreshold: number;
  deathBenefitMax: number;

  // ── QPRI Exclusion (982) ──────────────────────────────────────────────────
  qpriCapStandard: number;
  qpriCapMfs: number;

  // ── 1099-DIV / Schedule B routing ─────────────────────────────────────────
  scheduleBDividendThreshold: number;
  sec199aSingleThreshold: number;
  sec199aMfjThreshold: number;

  // ── Student Loan Interest Phase-Out ───────────────────────────────────────
  sliPhaseOutStartSingle: number;
  sliPhaseOutEndSingle: number;
  sliPhaseOutStartMfj: number;
  sliPhaseOutEndMfj: number;

  // ── Form 2106 ─────────────────────────────────────────────────────────────
  f2106PerformingArtistAgiLimit: number;

  // ── LTC Premium Limits (ltc_premium, 7206) ────────────────────────────────
  ltcPremiumLimits: ReadonlyArray<{ readonly maxAge: number; readonly limit: number }>;

  // ── Mortgage Interest Credit (8396) ──────────────────────────────────────
  mccMaxCreditHighRate: number;

  // ── SEP / SIMPLE ──────────────────────────────────────────────────────────
  sepContributionRate: number;
  sepMaxContribution: number;
  simpleEmployerMatchRate: number;
}
```

- [ ] **Step 2: Verify TypeScript accepts the file**

```bash
deno check forms/f1040/nodes/config/types.ts
# Expected: no errors
```

- [ ] **Step 3: Commit**

```bash
git add forms/f1040/nodes/config/types.ts
git commit -m "feat: add F1040Config interface for year-agnostic node config"
```

---

## Task 5: Add `config2025` Aggregate Export to `2025.ts`

**Files:**
- Modify: `forms/f1040/nodes/config/2025.ts`

Add a single object export at the bottom of the file. All existing named exports remain unchanged (backward compatibility).

- [ ] **Step 1: Append the aggregate export at the end of `2025.ts`**

```typescript
// ─── Aggregate export (used by CONFIG_BY_YEAR barrel) ─────────────────────────
import type { F1040Config } from "./types.ts";

export const config2025: F1040Config = {
  bracketsMfj:                  BRACKETS_MFJ_2025,
  bracketsSingle:               BRACKETS_SINGLE_2025,
  bracketsHoh:                  BRACKETS_HOH_2025,
  bracketsMfs:                  BRACKETS_MFS_2025,
  standardDeductionBase:        STANDARD_DEDUCTION_BASE_2025,
  standardDeductionAdditional:  STANDARD_DEDUCTION_ADDITIONAL_2025,
  seniorDeductionMax:           SENIOR_DEDUCTION_MAX_2025,
  seniorDeductionPhaseoutSingle: SENIOR_DEDUCTION_PHASEOUT_SINGLE_2025,
  seniorDeductionPhaseoutMfj:   SENIOR_DEDUCTION_PHASEOUT_MFJ_2025,
  seniorDeductionPhaseoutRate:  SENIOR_DEDUCTION_PHASEOUT_RATE_2025,
  qdcgtZeroCeiling:             QDCGT_ZERO_CEILING_2025,
  qdcgtTwentyFloor:             QDCGT_TWENTY_FLOOR_2025,
  amtExemption:                 AMT_EXEMPTION_2025,
  amtPhaseOutStart:             AMT_PHASE_OUT_START_2025,
  amtBracket26ThresholdStandard: AMT_BRACKET_26_THRESHOLD_STANDARD_2025,
  amtBracket26ThresholdMfs:     AMT_BRACKET_26_THRESHOLD_MFS_2025,
  amtBracketAdjustmentStandard: AMT_BRACKET_ADJUSTMENT_STANDARD_2025,
  amtBracketAdjustmentMfs:      AMT_BRACKET_ADJUSTMENT_MFS_2025,
  ssWageBase:                   SS_WAGE_BASE_2025,
  ssTaxPerEmployer:             SS_MAX_TAX_PER_EMPLOYER_2025,
  additionalMedicareThresholdMfj:   ADDITIONAL_MEDICARE_THRESHOLD_MFJ,
  additionalMedicareThresholdMfs:   ADDITIONAL_MEDICARE_THRESHOLD_MFS,
  additionalMedicareThresholdOther: ADDITIONAL_MEDICARE_THRESHOLD_OTHER,
  niitThresholdMfj:             NIIT_THRESHOLD_MFJ,
  niitThresholdMfs:             NIIT_THRESHOLD_MFS,
  niitThresholdOther:           NIIT_THRESHOLD_OTHER,
  hsaSelfOnlyLimit:             HSA_SELF_ONLY_LIMIT_2025,
  hsaFamilyLimit:               HSA_FAMILY_LIMIT_2025,
  hsaCatchup:                   HSA_CATCHUP_2025,
  iraContributionLimit:         IRA_CONTRIBUTION_LIMIT_2025,
  iraContributionLimitAge50:    IRA_CONTRIBUTION_LIMIT_AGE50_2025,
  iraPhaseoutSingleLower:       IRA_PHASEOUT_SINGLE_LOWER_2025,
  iraPhaseoutSingleUpper:       IRA_PHASEOUT_SINGLE_UPPER_2025,
  iraPhaseoutMfjLower:          IRA_PHASEOUT_MFJ_LOWER_2025,
  iraPhaseoutMfjUpper:          IRA_PHASEOUT_MFJ_UPPER_2025,
  iraPhaseoutNoncoveredMfjLower: IRA_PHASEOUT_NONCOVERED_MFJ_LOWER_2025,
  iraPhaseoutNoncoveredMfjUpper: IRA_PHASEOUT_NONCOVERED_MFJ_UPPER_2025,
  iraPhaseoutMfsLower:          IRA_PHASEOUT_MFS_LOWER_2025,
  iraPhaseoutMfsUpper:          IRA_PHASEOUT_MFS_UPPER_2025,
  qbiThresholdSingle:           QBI_THRESHOLD_SINGLE_2025,
  qbiThresholdMfj:              QBI_THRESHOLD_MFJ_2025,
  qbiPhaseInRange:              QBI_PHASE_IN_RANGE_2025,
  eitcMaxCredit:                EITC_MAX_CREDIT_2025,
  eitcPhaseInEnd:               EITC_PHASE_IN_END_2025,
  eitcPhaseoutStart:            EITC_PHASEOUT_START_2025,
  eitcIncomeLimit:              EITC_INCOME_LIMIT_2025,
  eitcInvestmentIncomeLimit:    EITC_INVESTMENT_INCOME_LIMIT_2025,
  ctcPerChild:                  CTC_PER_CHILD_2025,
  odcPerDependent:              ODC_PER_DEPENDENT_2025,
  actcMaxPerChild:              ACTC_MAX_PER_CHILD_2025,
  ctcPhaseOutThresholdMfj:      CTC_PHASE_OUT_THRESHOLD_MFJ_2025,
  ctcPhaseOutThresholdOther:    CTC_PHASE_OUT_THRESHOLD_OTHER_2025,
  actcEarnedIncomeFloor:        ACTC_EARNED_INCOME_FLOOR_2025,
  saversCreditContributionCap:  SAVERS_CREDIT_CONTRIBUTION_CAP_2025,
  saversCreditAgiSingle:        SAVERS_CREDIT_AGI_SINGLE_2025,
  saversCreditAgiHoh:           SAVERS_CREDIT_AGI_HOH_2025,
  saversCreditAgiMfj:           SAVERS_CREDIT_AGI_MFJ_2025,
  savingsBondPhaseoutStartMfj:  SAVINGS_BOND_PHASEOUT_START_MFJ_2025,
  savingsBondPhaseoutEndMfj:    SAVINGS_BOND_PHASEOUT_END_MFJ_2025,
  savingsBondPhaseoutStartSingle: SAVINGS_BOND_PHASEOUT_START_SINGLE_2025,
  savingsBondPhaseoutEndSingle: SAVINGS_BOND_PHASEOUT_END_SINGLE_2025,
  kiddieUnearnedIncomeThreshold: KIDDIE_TAX_UNEARNED_INCOME_THRESHOLD_2025,
  kiddieStandardDeductionFloor: KIDDIE_TAX_STANDARD_DEDUCTION_FLOOR_2025,
  feieLimit:                    FEIE_LIMIT_2025,
  feieHousingBase:              FEIE_HOUSING_BASE_2025,
  section179Limit:              SECTION_179_LIMIT_2025,
  section179PhaseoutThreshold:  SECTION_179_PHASEOUT_THRESHOLD_2025,
  luxuryAutoYear1NoBonus:       LUXURY_AUTO_YEAR1_NO_BONUS_2025,
  luxuryAutoYear1WithBonus:     LUXURY_AUTO_YEAR1_WITH_BONUS_2025,
  luxuryAutoYear2:              LUXURY_AUTO_YEAR2_2025,
  luxuryAutoYear3Plus:          LUXURY_AUTO_YEAR3_PLUS_2025,
  householdFicaThreshold:       HOUSEHOLD_FICA_THRESHOLD_2025,
  householdFutaQuarterlyThreshold: HOUSEHOLD_FUTA_QUARTERLY_THRESHOLD,
  saltCap:                      SALT_CAP_2025,
  saltPhaseoutThreshold:        SALT_PHASEOUT_THRESHOLD_2025,
  saltPhaseoutThresholdMfs:     SALT_PHASEOUT_THRESHOLD_MFS_2025,
  saltPhaseoutRate:             SALT_PHASEOUT_RATE_2025,
  saltFloor:                    SALT_FLOOR_2025,
  saltFloorMfs:                 SALT_FLOOR_MFS_2025,
  depCareExpenseCapOne:         DEP_CARE_EXPENSE_CAP_ONE_2025,
  depCareExpenseCapTwoPlus:     DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025,
  depCareEmployerExclusion:     DEP_CARE_EMPLOYER_EXCLUSION_2025,
  depCareEmployerExclusionMfs:  DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025,
  depCareCreditRateAgiThreshold: DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025,
  depCareCreditRateBracketSize: DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025,
  fplBase:                      FPL_BASE_2025,
  fplIncrement:                 FPL_INCREMENT_2025,
  qcdAnnualLimit:               QCD_ANNUAL_LIMIT_2025,
  psoExclusionLimit:            PSO_EXCLUSION_LIMIT_2025,
  eblThresholdSingle:           EBL_THRESHOLD_SINGLE_2025,
  eblThresholdMfj:              EBL_THRESHOLD_MFJ_2025,
  smallBizGrossReceipts:        SMALL_BIZ_GROSS_RECEIPTS_2025,
  retirementLimits:             RETIREMENT_LIMITS_2025,
  ltcPerDiemDailyLimit:         LTC_PER_DIEM_DAILY_LIMIT_2025,
  mdaMax:                       MDA_MAX_2025,
  mdaPhaseOutThreshold:         MDA_PHASE_OUT_THRESHOLD_2025,
  mdaZeroThreshold:             MDA_ZERO_THRESHOLD_2025,
  deathBenefitMax:              DEATH_BENEFIT_MAX_2025,
  qpriCapStandard:              QPRI_CAP_STANDARD_2025,
  qpriCapMfs:                   QPRI_CAP_MFS_2025,
  scheduleBDividendThreshold:   SCHEDULE_B_DIVIDEND_THRESHOLD,
  sec199aSingleThreshold:       SEC199A_SINGLE_THRESHOLD_2025,
  sec199aMfjThreshold:          SEC199A_MFJ_THRESHOLD_2025,
  sliPhaseOutStartSingle:       SLI_PHASE_OUT_START_SINGLE_2025,
  sliPhaseOutEndSingle:         SLI_PHASE_OUT_END_SINGLE_2025,
  sliPhaseOutStartMfj:          SLI_PHASE_OUT_START_MFJ_2025,
  sliPhaseOutEndMfj:            SLI_PHASE_OUT_END_MFJ_2025,
  f2106PerformingArtistAgiLimit: F2106_PERFORMING_ARTIST_AGI_LIMIT,
  ltcPremiumLimits:             LTC_PREMIUM_LIMITS_2025,
  mccMaxCreditHighRate:         MCC_MAX_CREDIT_HIGH_RATE_2025,
  sepContributionRate:          SEP_CONTRIBUTION_RATE_2025,
  sepMaxContribution:           SEP_MAX_CONTRIBUTION_2025,
  simpleEmployerMatchRate:      SIMPLE_EMPLOYER_MATCH_RATE_2025,
};
```

- [ ] **Step 2: Verify type-checks**

```bash
deno check forms/f1040/nodes/config/2025.ts
# Expected: no errors
```

- [ ] **Step 3: Commit**

```bash
git add forms/f1040/nodes/config/2025.ts forms/f1040/nodes/config/types.ts
git commit -m "feat: add config2025 aggregate export satisfying F1040Config"
```

---

## Task 6: Create `CONFIG_BY_YEAR` Barrel

**Files:**
- Create: `forms/f1040/nodes/config/index.ts`

- [ ] **Step 1: Write the barrel**

```typescript
// forms/f1040/nodes/config/index.ts
//
// CONFIG_BY_YEAR — year-keyed config for all config-injected f1040 nodes.
//
// To add a new tax year:
//   1. Create forms/f1040/{year}/config.ts with the new constants
//   2. Export `config{year}: F1040Config` from that file
//   3. Add an entry here: `{year}: config{year}`

// config2025 lives in ./2025.ts (forms/f1040/nodes/config/2025.ts).
// For future forms (f1120), their barrel would import from ../../2025/config.ts
// because f1120's year constants live in forms/f1120/2025/config.ts.
import { config2025 } from "./2025.ts";
export type { F1040Config } from "./types.ts";

export const CONFIG_BY_YEAR: Record<number, import("./types.ts").F1040Config> = {
  2025: config2025,
};
```

- [ ] **Step 2: Verify**

```bash
deno check forms/f1040/nodes/config/index.ts
# Expected: no errors
```

- [ ] **Step 3: Run all tests to confirm nothing broken yet**

```bash
deno task test
# Expected: all tests pass (no node has been migrated yet)
```

- [ ] **Step 4: Commit**

```bash
git add forms/f1040/nodes/config/index.ts
git commit -m "feat: add CONFIG_BY_YEAR barrel for year-agnostic node config"
```

---

## Task 7: Config Migration — Worked Example (`form8919`)

This task demonstrates the migration pattern. All subsequent config migration tasks follow the same steps. Read this one carefully before executing any other migration.

**Files:**
- Modify: `forms/f1040/nodes/intermediate/forms/form8919/index.ts`

**Migration pattern:**
1. Replace the specific named import(s) from `config/2025.ts` with `import { CONFIG_BY_YEAR } from "../../../config/index.ts"`
2. Remove any `protected readonly prop = CONST_2025` class properties
3. Add `const cfg = CONFIG_BY_YEAR[ctx.taxYear]; if (!cfg) throw new Error(\`No f1040 config for year ${ctx.taxYear}\`);` at the start of `compute()`
4. Replace every `CONST_NAME_2025` / `this.prop` reference with `cfg.propName`

**Constant mapping for `form8919`:**
- `SS_WAGE_BASE_2025` → `cfg.ssWageBase`
- `this.ssWageBase` → `ssWageBase` (after destructure)

- [ ] **Step 1: Update the import in `form8919/index.ts`**

Replace:
```typescript
import { SS_WAGE_BASE_2025 } from "../../../config/2025.ts";
```
With:
```typescript
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
```

- [ ] **Step 2: Remove class property, add cfg lookup in `compute()`**

Remove:
```typescript
  // Rev Proc 2024-40 §3.28; Form 8919 line 9 — SS wage base (TY2025)
  protected readonly ssWageBase = SS_WAGE_BASE_2025;
```

Replace the start of `compute()`:
```typescript
  compute(_ctx: NodeContext, rawInput: Form8919Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const { wages } = input;
```
With:
```typescript
  compute(ctx: NodeContext, rawInput: Form8919Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const { wages } = input;
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const { ssWageBase } = cfg;
```

Replace:
```typescript
    const line9 = remainingSsWageBase(this.ssWageBase, priorSsWages);
```
With:
```typescript
    const line9 = remainingSsWageBase(ssWageBase, priorSsWages);
```

- [ ] **Step 3: Run node tests**

```bash
deno test forms/f1040/nodes/intermediate/forms/form8919/
# Expected: all pass
```

- [ ] **Step 4: Commit**

```bash
git add forms/f1040/nodes/intermediate/forms/form8919/index.ts
git commit -m "refactor: form8919 uses CONFIG_BY_YEAR barrel"
```

---

## Task 8: Config Migration — SS/Medicare Batch

Migrate `form4137`, `schedule_se` — both use only `SS_WAGE_BASE_2025`.

**Constant mapping (same for both):**
- `SS_WAGE_BASE_2025` → `cfg.ssWageBase`

- [ ] **Step 1: Migrate `form4137/index.ts`**

Replace import:
```typescript
import { SS_WAGE_BASE_2025 } from "../../../config/2025.ts";
```
With:
```typescript
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
```

In `compute()` add after existing variable declarations:
```typescript
const cfg = CONFIG_BY_YEAR[ctx.taxYear];
if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
```

Replace every `SS_WAGE_BASE_2025` with `cfg.ssWageBase`.

- [ ] **Step 2: Migrate `schedule_se/index.ts`**

Same pattern: replace import, add cfg in compute(), replace `SS_WAGE_BASE_2025` with `cfg.ssWageBase`.

- [ ] **Step 3: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/forms/form4137/
deno test forms/f1040/nodes/intermediate/forms/schedule_se/
# Expected: all pass
```

- [ ] **Step 4: Commit**

```bash
git add forms/f1040/nodes/intermediate/forms/form4137/index.ts \
        forms/f1040/nodes/intermediate/forms/schedule_se/index.ts
git commit -m "refactor: form4137 + schedule_se use CONFIG_BY_YEAR barrel"
```

---

## Task 9: Config Migration — Medicare/NIIT Batch

Migrate `form8959`, `form8960`.

**Constant mappings:**

`form8959`:
- `ADDITIONAL_MEDICARE_THRESHOLD_MFJ` → `cfg.additionalMedicareThresholdMfj`
- `ADDITIONAL_MEDICARE_THRESHOLD_MFS` → `cfg.additionalMedicareThresholdMfs`
- `ADDITIONAL_MEDICARE_THRESHOLD_OTHER` → `cfg.additionalMedicareThresholdOther`

`form8960`:
- `NIIT_THRESHOLD_MFJ` → `cfg.niitThresholdMfj`
- `NIIT_THRESHOLD_MFS` → `cfg.niitThresholdMfs`
- `NIIT_THRESHOLD_OTHER` → `cfg.niitThresholdOther`

Pattern for each: replace import block with `import { CONFIG_BY_YEAR } from "../../../config/index.ts"`, add `const cfg = CONFIG_BY_YEAR[ctx.taxYear]; if (!cfg) throw new Error(...)` in compute(), replace constants.

- [ ] **Step 1: Migrate both nodes (same pattern as Task 7)**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/forms/form8959/
deno test forms/f1040/nodes/intermediate/forms/form8960/
# Expected: all pass
```

- [ ] **Step 3: Run benchmark**

```bash
deno task bench
# Expected: 94 PASS  3 FAIL — no regression
```

- [ ] **Step 4: Commit**

```bash
git add forms/f1040/nodes/intermediate/forms/form8959/index.ts \
        forms/f1040/nodes/intermediate/forms/form8960/index.ts
git commit -m "refactor: form8959 + form8960 use CONFIG_BY_YEAR barrel"
```

---

## Task 10: Config Migration — Standard Deduction / Senior Deduction

Migrate `standard_deduction`, `form8995`, `form8995a`.

**Constant mappings:**

`standard_deduction`:
- `STANDARD_DEDUCTION_BASE_2025` → `cfg.standardDeductionBase`
- `STANDARD_DEDUCTION_ADDITIONAL_2025` → `cfg.standardDeductionAdditional`
- `SENIOR_DEDUCTION_MAX_2025` → `cfg.seniorDeductionMax`
- `SENIOR_DEDUCTION_PHASEOUT_SINGLE_2025` → `cfg.seniorDeductionPhaseoutSingle`
- `SENIOR_DEDUCTION_PHASEOUT_MFJ_2025` → `cfg.seniorDeductionPhaseoutMfj`
- `SENIOR_DEDUCTION_PHASEOUT_RATE_2025` → `cfg.seniorDeductionPhaseoutRate`

`form8995`:
- `STANDARD_DEDUCTION_BASE_2025` → `cfg.standardDeductionBase`
- `STANDARD_DEDUCTION_ADDITIONAL_2025` → `cfg.standardDeductionAdditional`

`form8995a`:
- `QBI_THRESHOLD_SINGLE_2025` → `cfg.qbiThresholdSingle`
- `QBI_THRESHOLD_MFJ_2025` → `cfg.qbiThresholdMfj`
- `QBI_PHASE_IN_RANGE_2025` → `cfg.qbiPhaseInRange`
- `STANDARD_DEDUCTION_BASE_2025` → `cfg.standardDeductionBase`
- `STANDARD_DEDUCTION_ADDITIONAL_2025` → `cfg.standardDeductionAdditional`

Note: `form8995` and `form8995a` are in `intermediate/forms/` → import path is `"../../../config/index.ts"`. `standard_deduction` is in `intermediate/worksheets/` → same depth, same path.

- [ ] **Step 1: Migrate all three nodes (pattern from Task 7)**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/worksheets/standard_deduction/
deno test forms/f1040/nodes/intermediate/forms/form8995/
deno test forms/f1040/nodes/intermediate/forms/form8995a/
# Expected: all pass
```

- [ ] **Step 3: Commit**

```bash
git add forms/f1040/nodes/intermediate/worksheets/standard_deduction/index.ts \
        forms/f1040/nodes/intermediate/forms/form8995/index.ts \
        forms/f1040/nodes/intermediate/forms/form8995a/index.ts
git commit -m "refactor: standard_deduction + form8995/a use CONFIG_BY_YEAR barrel"
```

---

## Task 11: Config Migration — Tax Brackets / QDCGT

Migrate `income_tax_calculation`. This node already has local `BRACKETS_BY_YEAR` and `QDCGT_THRESHOLDS_BY_YEAR` maps — replace them with `CONFIG_BY_YEAR`.

**Constant mappings:**
- `BRACKETS_BY_YEAR[year].mfj` → `cfg.bracketsMfj`
- `BRACKETS_BY_YEAR[year].single` → `cfg.bracketsSingle`
- `BRACKETS_BY_YEAR[year].hoh` → `cfg.bracketsHoh`
- `BRACKETS_BY_YEAR[year].mfs` → `cfg.bracketsMfs`
- `QDCGT_THRESHOLDS_BY_YEAR[year].zeroCeiling` → `cfg.qdcgtZeroCeiling`
- `QDCGT_THRESHOLDS_BY_YEAR[year].twentyFloor` → `cfg.qdcgtTwentyFloor`

- [ ] **Step 1: Replace import block**

Remove:
```typescript
import {
  BRACKETS_MFJ_2025,
  BRACKETS_SINGLE_2025,
  BRACKETS_HOH_2025,
  BRACKETS_MFS_2025,
  QDCGT_ZERO_CEILING_2025,
  QDCGT_TWENTY_FLOOR_2025,
  type Bracket,
} from "../../../config/2025.ts";
```

Add:
```typescript
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import type { Bracket } from "../../../config/2025.ts";
```

- [ ] **Step 2: Remove the local year maps**

Remove the `BRACKETS_BY_YEAR`, `YearBrackets`, `QdcgtThresholds`, and `QDCGT_THRESHOLDS_BY_YEAR` declarations entirely.

- [ ] **Step 3: Update `compute()` to use cfg**

Add at the start of compute():
```typescript
const cfg = CONFIG_BY_YEAR[ctx.taxYear];
if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
```

Replace every `BRACKETS_BY_YEAR[ctx.taxYear]` reference with direct cfg access:
- `.mfj` → `cfg.bracketsMfj`
- `.single` → `cfg.bracketsSingle`
- `.hoh` → `cfg.bracketsHoh`
- `.mfs` → `cfg.bracketsMfs`

Replace `QDCGT_THRESHOLDS_BY_YEAR[ctx.taxYear].zeroCeiling` → `cfg.qdcgtZeroCeiling`
Replace `QDCGT_THRESHOLDS_BY_YEAR[ctx.taxYear].twentyFloor` → `cfg.qdcgtTwentyFloor`

- [ ] **Step 4: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/worksheets/income_tax_calculation/
# Expected: all pass
```

- [ ] **Step 5: Run benchmark**

```bash
deno task bench
# Expected: 94 PASS  3 FAIL
```

- [ ] **Step 6: Commit**

```bash
git add forms/f1040/nodes/intermediate/worksheets/income_tax_calculation/index.ts
git commit -m "refactor: income_tax_calculation uses shared CONFIG_BY_YEAR barrel"
```

---

## Task 12: Config Migration — AMT, EITC, CTC

Migrate `form6251`, `eitc`, `f8812`.

**Constant mappings:**

`form6251`:
- `AMT_EXEMPTION_2025` → `cfg.amtExemption`
- `AMT_PHASE_OUT_START_2025` → `cfg.amtPhaseOutStart`
- `AMT_BRACKET_26_THRESHOLD_STANDARD_2025` → `cfg.amtBracket26ThresholdStandard`
- `AMT_BRACKET_26_THRESHOLD_MFS_2025` → `cfg.amtBracket26ThresholdMfs`
- `AMT_BRACKET_ADJUSTMENT_STANDARD_2025` → `cfg.amtBracketAdjustmentStandard`
- `AMT_BRACKET_ADJUSTMENT_MFS_2025` → `cfg.amtBracketAdjustmentMfs`

`eitc`:
- `EITC_MAX_CREDIT_2025` → `cfg.eitcMaxCredit`
- `EITC_PHASE_IN_END_2025` → `cfg.eitcPhaseInEnd`
- `EITC_PHASEOUT_START_2025` → `cfg.eitcPhaseoutStart`
- `EITC_INCOME_LIMIT_2025` → `cfg.eitcIncomeLimit`
- `EITC_INVESTMENT_INCOME_LIMIT_2025` → `cfg.eitcInvestmentIncomeLimit`

`f8812` (in `inputs/` → path is `../../config/index.ts`):
- `CTC_PER_CHILD_2025` → `cfg.ctcPerChild`
- `ODC_PER_DEPENDENT_2025` → `cfg.odcPerDependent`
- `ACTC_MAX_PER_CHILD_2025` → `cfg.actcMaxPerChild`
- `CTC_PHASE_OUT_THRESHOLD_MFJ_2025` → `cfg.ctcPhaseOutThresholdMfj`
- `CTC_PHASE_OUT_THRESHOLD_OTHER_2025` → `cfg.ctcPhaseOutThresholdOther`
- `ACTC_EARNED_INCOME_FLOOR_2025` → `cfg.actcEarnedIncomeFloor`

- [ ] **Step 1: Migrate all three nodes**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/forms/form6251/
deno test forms/f1040/nodes/intermediate/forms/eitc/
deno test forms/f1040/nodes/inputs/f8812/
# Expected: all pass
```

- [ ] **Step 3: Commit**

```bash
git add forms/f1040/nodes/intermediate/forms/form6251/index.ts \
        forms/f1040/nodes/intermediate/forms/eitc/index.ts \
        forms/f1040/nodes/inputs/f8812/index.ts
git commit -m "refactor: form6251 + eitc + f8812 use CONFIG_BY_YEAR barrel"
```

---

## Task 13: Config Migration — HSA, IRA, Saver's Credit, Retirement

Migrate `form8889`, `ira_deduction_worksheet`, `form8880`, `sep_retirement`.

**Constant mappings:**

`form8889` (intermediate/forms → `"../../../config/index.ts"`):
- `HSA_SELF_ONLY_LIMIT_2025` → `cfg.hsaSelfOnlyLimit`
- `HSA_FAMILY_LIMIT_2025` → `cfg.hsaFamilyLimit`
- `HSA_CATCHUP_2025` → `cfg.hsaCatchup`

`ira_deduction_worksheet` (intermediate/worksheets → `"../../../config/index.ts"`):
- `IRA_CONTRIBUTION_LIMIT_2025` → `cfg.iraContributionLimit`
- `IRA_CONTRIBUTION_LIMIT_AGE50_2025` → `cfg.iraContributionLimitAge50`
- `IRA_PHASEOUT_SINGLE_LOWER_2025` → `cfg.iraPhaseoutSingleLower`
- `IRA_PHASEOUT_SINGLE_UPPER_2025` → `cfg.iraPhaseoutSingleUpper`
- `IRA_PHASEOUT_MFJ_LOWER_2025` → `cfg.iraPhaseoutMfjLower`
- `IRA_PHASEOUT_MFJ_UPPER_2025` → `cfg.iraPhaseoutMfjUpper`
- `IRA_PHASEOUT_NONCOVERED_MFJ_LOWER_2025` → `cfg.iraPhaseoutNoncoveredMfjLower`
- `IRA_PHASEOUT_NONCOVERED_MFJ_UPPER_2025` → `cfg.iraPhaseoutNoncoveredMfjUpper`
- `IRA_PHASEOUT_MFS_LOWER_2025` → `cfg.iraPhaseoutMfsLower`
- `IRA_PHASEOUT_MFS_UPPER_2025` → `cfg.iraPhaseoutMfsUpper`

`form8880`:
- `SAVERS_CREDIT_CONTRIBUTION_CAP_2025` → `cfg.saversCreditContributionCap`
- `SAVERS_CREDIT_AGI_SINGLE_2025` → `cfg.saversCreditAgiSingle`
- `SAVERS_CREDIT_AGI_HOH_2025` → `cfg.saversCreditAgiHoh`
- `SAVERS_CREDIT_AGI_MFJ_2025` → `cfg.saversCreditAgiMfj`

`sep_retirement` (inputs/ → `"../../config/index.ts"`):
- `SEP_CONTRIBUTION_RATE_2025` → `cfg.sepContributionRate`
- `SEP_MAX_CONTRIBUTION_2025` → `cfg.sepMaxContribution`
- `SIMPLE_EMPLOYER_MATCH_RATE_2025` → `cfg.simpleEmployerMatchRate`
- `IRA_CONTRIBUTION_LIMIT_2025` → `cfg.iraContributionLimit`
- `IRA_CONTRIBUTION_LIMIT_AGE50_2025` → `cfg.iraContributionLimitAge50`

- [ ] **Step 1: Migrate all four nodes**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/forms/form8889/
deno test forms/f1040/nodes/intermediate/worksheets/ira_deduction_worksheet/
deno test forms/f1040/nodes/intermediate/forms/form8880/
deno test forms/f1040/nodes/inputs/sep_retirement/
# Expected: all pass
```

- [ ] **Step 3: Commit**

```bash
git add forms/f1040/nodes/intermediate/forms/form8889/index.ts \
        forms/f1040/nodes/intermediate/worksheets/ira_deduction_worksheet/index.ts \
        forms/f1040/nodes/intermediate/forms/form8880/index.ts \
        forms/f1040/nodes/inputs/sep_retirement/index.ts
git commit -m "refactor: HSA/IRA/saver's/SEP nodes use CONFIG_BY_YEAR barrel"
```

---

## Task 14: Config Migration — SALT, Schedule A, Dep Care, ACA

Migrate `schedule_a`, `form2441`, `form8962`.

**Constant mappings:**

`schedule_a` (inputs/ → `"../../config/index.ts"`):
- `SALT_CAP_2025` → `cfg.saltCap`
- `SALT_PHASEOUT_THRESHOLD_2025` → `cfg.saltPhaseoutThreshold`
- `SALT_PHASEOUT_THRESHOLD_MFS_2025` → `cfg.saltPhaseoutThresholdMfs`
- `SALT_PHASEOUT_RATE_2025` → `cfg.saltPhaseoutRate`
- `SALT_FLOOR_2025` → `cfg.saltFloor`
- `SALT_FLOOR_MFS_2025` → `cfg.saltFloorMfs`

`form2441`:
- `DEP_CARE_EXPENSE_CAP_ONE_2025` → `cfg.depCareExpenseCapOne`
- `DEP_CARE_EXPENSE_CAP_TWO_PLUS_2025` → `cfg.depCareExpenseCapTwoPlus`
- `DEP_CARE_EMPLOYER_EXCLUSION_2025` → `cfg.depCareEmployerExclusion`
- `DEP_CARE_EMPLOYER_EXCLUSION_MFS_2025` → `cfg.depCareEmployerExclusionMfs`
- `DEP_CARE_CREDIT_RATE_AGI_THRESHOLD_2025` → `cfg.depCareCreditRateAgiThreshold`
- `DEP_CARE_CREDIT_RATE_BRACKET_SIZE_2025` → `cfg.depCareCreditRateBracketSize`

`form8962`:
- `FPL_BASE_2025` → `cfg.fplBase`
- `FPL_INCREMENT_2025` → `cfg.fplIncrement`

- [ ] **Step 1: Migrate all three nodes**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/inputs/schedule_a/
deno test forms/f1040/nodes/intermediate/forms/form2441/
deno test forms/f1040/nodes/intermediate/forms/form8962/
# Expected: all pass
```

- [ ] **Step 3: Commit**

```bash
git add forms/f1040/nodes/inputs/schedule_a/index.ts \
        forms/f1040/nodes/intermediate/forms/form2441/index.ts \
        forms/f1040/nodes/intermediate/forms/form8962/index.ts
git commit -m "refactor: schedule_a + form2441 + form8962 use CONFIG_BY_YEAR barrel"
```

---

## Task 15: Config Migration — Remaining Inputs Batch

Migrate `w2`, `f1099r`, `f1099div`, `f2106`, `ltc_premium`, `schedule_c`.

**Constant mappings:**

`w2` (inputs/ → `"../../config/index.ts"`):
- `RETIREMENT_LIMITS_2025` → `cfg.retirementLimits`
- `SS_MAX_TAX_PER_EMPLOYER_2025` → `cfg.ssTaxPerEmployer`
- `SS_WAGE_BASE_2025` → `cfg.ssWageBase`

`f1099r`:
- `QCD_ANNUAL_LIMIT_2025` → `cfg.qcdAnnualLimit`
- `PSO_EXCLUSION_LIMIT_2025` → `cfg.psoExclusionLimit`

`f1099div`:
- `SCHEDULE_B_DIVIDEND_THRESHOLD` → `cfg.scheduleBDividendThreshold`
- `SEC199A_SINGLE_THRESHOLD_2025` → `cfg.sec199aSingleThreshold`
- `SEC199A_MFJ_THRESHOLD_2025` → `cfg.sec199aMfjThreshold`

`f2106`:
- `F2106_PERFORMING_ARTIST_AGI_LIMIT` → `cfg.f2106PerformingArtistAgiLimit`

`ltc_premium`:
- `LTC_PREMIUM_LIMITS_2025` → `cfg.ltcPremiumLimits`

`schedule_c`:
- `EBL_THRESHOLD_SINGLE_2025` → `cfg.eblThresholdSingle`
- `EBL_THRESHOLD_MFJ_2025` → `cfg.eblThresholdMfj`
- `SMALL_BIZ_GROSS_RECEIPTS_2025` → `cfg.smallBizGrossReceipts`

- [ ] **Step 1: Migrate all six nodes**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/inputs/w2/
deno test forms/f1040/nodes/inputs/f1099r/
deno test forms/f1040/nodes/inputs/f1099div/
deno test forms/f1040/nodes/inputs/f2106/
deno test forms/f1040/nodes/inputs/ltc_premium/
deno test forms/f1040/nodes/inputs/schedule_c/
# Expected: all pass
```

- [ ] **Step 3: Run benchmark**

```bash
deno task bench
# Expected: 94 PASS  3 FAIL
```

- [ ] **Step 4: Commit**

```bash
git add forms/f1040/nodes/inputs/w2/index.ts \
        forms/f1040/nodes/inputs/f1099r/index.ts \
        forms/f1040/nodes/inputs/f1099div/index.ts \
        forms/f1040/nodes/inputs/f2106/index.ts \
        forms/f1040/nodes/inputs/ltc_premium/index.ts \
        forms/f1040/nodes/inputs/schedule_c/index.ts
git commit -m "refactor: w2/f1099r/f1099div/f2106/ltc_premium/schedule_c use CONFIG_BY_YEAR"
```

---

## Task 16: Config Migration — Remaining Intermediate Batch

Migrate `agi_aggregator`, `form8815`, `form8615`, `form8853`, `form7206`, `form2555`, `form4562`, `form4972`, `form982`, `form8990`, `schedule_h`, `schedule_f`, `form8396`.

**Constant mappings:**

`agi_aggregator` (intermediate/aggregation → `"../../../config/index.ts"`):
- `SLI_PHASE_OUT_START_SINGLE_2025` → `cfg.sliPhaseOutStartSingle`
- `SLI_PHASE_OUT_END_SINGLE_2025` → `cfg.sliPhaseOutEndSingle`
- `SLI_PHASE_OUT_START_MFJ_2025` → `cfg.sliPhaseOutStartMfj`
- `SLI_PHASE_OUT_END_MFJ_2025` → `cfg.sliPhaseOutEndMfj`

`form8815`:
- `SAVINGS_BOND_PHASEOUT_START_MFJ_2025` → `cfg.savingsBondPhaseoutStartMfj`
- `SAVINGS_BOND_PHASEOUT_END_MFJ_2025` → `cfg.savingsBondPhaseoutEndMfj`
- `SAVINGS_BOND_PHASEOUT_START_SINGLE_2025` → `cfg.savingsBondPhaseoutStartSingle`
- `SAVINGS_BOND_PHASEOUT_END_SINGLE_2025` → `cfg.savingsBondPhaseoutEndSingle`

`form8615`:
- `KIDDIE_TAX_UNEARNED_INCOME_THRESHOLD_2025` → `cfg.kiddieUnearnedIncomeThreshold`
- `KIDDIE_TAX_STANDARD_DEDUCTION_FLOOR_2025` → `cfg.kiddieStandardDeductionFloor`

`form8853`:
- `LTC_PER_DIEM_DAILY_LIMIT_2025` → `cfg.ltcPerDiemDailyLimit`

`form7206`:
- `LTC_PREMIUM_LIMITS_2025` → `cfg.ltcPremiumLimits`

`form2555`:
- `FEIE_LIMIT_2025` → `cfg.feieLimit`
- `FEIE_HOUSING_BASE_2025` → `cfg.feieHousingBase`

`form4562`:
- `SECTION_179_LIMIT_2025` → `cfg.section179Limit`
- `SECTION_179_PHASEOUT_THRESHOLD_2025` → `cfg.section179PhaseoutThreshold`
- `LUXURY_AUTO_YEAR1_NO_BONUS_2025` → `cfg.luxuryAutoYear1NoBonus`
- `LUXURY_AUTO_YEAR1_WITH_BONUS_2025` → `cfg.luxuryAutoYear1WithBonus`
- `LUXURY_AUTO_YEAR2_2025` → `cfg.luxuryAutoYear2`
- `LUXURY_AUTO_YEAR3_PLUS_2025` → `cfg.luxuryAutoYear3Plus`

`form4972`:
- `MDA_MAX_2025` → `cfg.mdaMax`
- `MDA_PHASE_OUT_THRESHOLD_2025` → `cfg.mdaPhaseOutThreshold`
- `MDA_ZERO_THRESHOLD_2025` → `cfg.mdaZeroThreshold`
- `DEATH_BENEFIT_MAX_2025` → `cfg.deathBenefitMax`

`form982`:
- `QPRI_CAP_STANDARD_2025` → `cfg.qpriCapStandard`
- `QPRI_CAP_MFS_2025` → `cfg.qpriCapMfs`

`form8990`:
- `SMALL_BIZ_GROSS_RECEIPTS_2025` → `cfg.smallBizGrossReceipts`

`schedule_h`:
- `HOUSEHOLD_FICA_THRESHOLD_2025` → `cfg.householdFicaThreshold`
- `HOUSEHOLD_FUTA_QUARTERLY_THRESHOLD` → `cfg.householdFutaQuarterlyThreshold`

`schedule_f`:
- `EBL_THRESHOLD_SINGLE_2025` → `cfg.eblThresholdSingle`
- `EBL_THRESHOLD_MFJ_2025` → `cfg.eblThresholdMfj`

`form8396`:
- `MCC_MAX_CREDIT_HIGH_RATE_2025` → `cfg.mccMaxCreditHighRate`

- [ ] **Step 1: Migrate all 13 nodes using the pattern from Task 7**

- [ ] **Step 2: Run tests**

```bash
deno test forms/f1040/nodes/intermediate/aggregation/agi_aggregator/
deno test forms/f1040/nodes/intermediate/forms/form8815/
deno test forms/f1040/nodes/intermediate/forms/form8615/
deno test forms/f1040/nodes/intermediate/forms/form8853/
deno test forms/f1040/nodes/intermediate/forms/form7206/
deno test forms/f1040/nodes/intermediate/forms/form2555/
deno test forms/f1040/nodes/intermediate/forms/form4562/
deno test forms/f1040/nodes/intermediate/forms/form4972/
deno test forms/f1040/nodes/intermediate/forms/form982/
deno test forms/f1040/nodes/intermediate/forms/form8990/
deno test forms/f1040/nodes/intermediate/forms/schedule_h/
deno test forms/f1040/nodes/intermediate/forms/schedule_f/
deno test forms/f1040/nodes/intermediate/forms/form8396/
# Expected: all pass
```

- [ ] **Step 3: Run full benchmark**

```bash
deno task bench
# Expected: 94 PASS  3 FAIL  — all config migrations complete, no regression
```

- [ ] **Step 4: Commit**

```bash
git add forms/f1040/nodes/intermediate/aggregation/agi_aggregator/index.ts \
        forms/f1040/nodes/intermediate/forms/form8815/index.ts \
        forms/f1040/nodes/intermediate/forms/form8615/index.ts \
        forms/f1040/nodes/intermediate/forms/form8853/index.ts \
        forms/f1040/nodes/intermediate/forms/form7206/index.ts \
        forms/f1040/nodes/intermediate/forms/form2555/index.ts \
        forms/f1040/nodes/intermediate/forms/form4562/index.ts \
        forms/f1040/nodes/intermediate/forms/form4972/index.ts \
        forms/f1040/nodes/intermediate/forms/form982/index.ts \
        forms/f1040/nodes/intermediate/forms/form8990/index.ts \
        forms/f1040/nodes/intermediate/forms/schedule_h/index.ts \
        forms/f1040/nodes/intermediate/forms/schedule_f/index.ts \
        forms/f1040/nodes/intermediate/forms/form8396/index.ts
git commit -m "refactor: remaining intermediate nodes use CONFIG_BY_YEAR barrel"
```

---

## Task 17: Add `formType` to NodeContext

**Files:**
- Modify: `core/types/node-context.ts`

- [ ] **Step 1: Update the type**

Replace the file contents:
```typescript
export type NodeContext = { readonly taxYear: number };
```
With:
```typescript
export type NodeContext = {
  readonly taxYear: number;
  /** The form type this node belongs to, e.g. "f1040", "f1120". */
  readonly formType: string;
};
```

- [ ] **Step 2: Find and update all NodeContext instantiation sites**

```bash
grep -r "taxYear:" core/ cli/ forms/ --include="*.ts" -l
```

For each file that creates a `NodeContext`, add `formType: "f1040"` (or the appropriate form). The main site is in `core/runtime/executor.ts` or the CLI layer.

- [ ] **Step 3: Run all tests**

```bash
deno task test
# Expected: all pass
```

- [ ] **Step 4: Commit**

```bash
git add core/types/node-context.ts
git commit -m "feat: add formType field to NodeContext"
```

---

## Task 18: Migrate State Schema to Version 2

**Files:**
- Modify: `.state/bench/state.json`

- [ ] **Step 1: Write the new version 2 schema**

Replace the entire contents of `.state/bench/state.json` with:

```json
{
  "version": 2,
  "forms": {
    "f1040:2025": {
      "fix": {
        "status": "idle",
        "benchmark_baseline": { "pass": 94, "fail": 3 },
        "no_improvement_count": 0,
        "root_causes": {
          "ssa_niit_mismatch": {
            "status": "pending",
            "cases": [67, 91, 95],
            "description": "3 remaining failures: cases 67, 91, 95 — all involve SSA + 1099-B combinations. Likely SSA taxability calculation or NIIT/Additional Medicare Tax mismatch vs gen_correct.ts reference",
            "node_path": "forms/f1040/nodes/intermediate/forms/form8959/index.ts"
          }
        }
      },
      "build": null
    },
    "f1120:2025": {
      "fix": null,
      "build": {
        "status": "idle",
        "phase": null,
        "node_specs_path": "benchmark/harness/node-specs/1120-nodes.json",
        "benchmark_cases_created": 0,
        "nodes_built": [],
        "benchmark_runs": []
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add .state/bench/state.json
git commit -m "chore: migrate state.json to v2 form-keyed schema"
```

---

## Task 19: Update `tax-fix` Skill

**Files:**
- Modify: `.claude/skills/tax-fix/SKILL.md`

Update the skill to be form-agnostic. It should accept `$ARGUMENTS` as `{form}:{year}` (e.g. `f1040:2025`) and derive all paths from conventions.

- [ ] **Step 1: Update SKILL.md**

Replace the file with:

```markdown
---
name: tax-fix
description: Autonomous bug-fix loop for any form:year. Reads failing benchmark cases, spawns parallel bug-fixer agents per root cause cluster, validates, commits net-positive fixes, and loops until all pass or stalled.
---

# Tax Fix — Autonomous Bug Fix Loop

**Form:Year:** $ARGUMENTS  (e.g. `f1040:2025`)

## Step 0 — Derive Paths

Parse `$ARGUMENTS` as `{form}:{year}`. Derive:
- Policy doc: `forms/{form}/FORM.md`
- Cases dir: `benchmark/cases/{form}/{year}/`
- State key: `{form}:{year}` in `.state/bench/state.json` under `forms`
- Progress log: `.state/bench/progress.md`

Read `forms/{form}/FORM.md` and pass its contents to all spawned agents as context.

## Step 1 — Load State

Read `.state/bench/state.json`. Navigate to `forms.{form}:{year}.fix`:
- If `"done"` → print "All cases passing. Nothing to do." and stop.
- If `"stalled"` → print stall message and stop.
- Otherwise → set `status` to `"running"` and write state.json back.

## Step 2 — Identify Pending Root Causes

From `forms.{form}:{year}.fix.root_causes`, collect all entries where `status === "pending"`.

## Step 3 — Spawn Parallel Bug-Fixer Agents

For each pending root cause, spawn one agent in parallel using the Agent tool:
- Agent file: `.claude/skills/tax-fix/agents/bug-fixer.md`
- Pass as context: root cause object + FORM.md contents + cases dir

Spawn all in a single message.

## Step 4 — Run Validator

Spawn the validator agent (`.claude/skills/tax-fix/agents/validator.md`).
Pass: form, year, cases dir.

Parse JSON output: `{ total, pass, fail, failing }`.

## Step 5 — Evaluate Results

Compare current pass count to `forms.{form}:{year}.fix.benchmark_baseline`:
- **Net positive**: commit. Update baseline. Mark fixed root causes as `"done"`.
  ```bash
  git add -A
  git commit -m "fix: {form} {year} benchmark — X→Y passing cases"
  ```
- **No improvement**: increment `no_improvement_count`. If 3 → set `status: "stalled"`, stop.

## Step 6 — Log and Loop

Append to `.state/bench/progress.md`:
```
## [{form}:{year}] Round N — [timestamp]
- Baseline: X pass / Y fail
- After fix: A pass / B fail
- Fixed clusters: [list]
```

If `fail === 0` → set `status: "done"`, stop. Otherwise loop to Step 2.

## Key Constraints

- Only commit if net-positive (more passes, zero new failures)
- Never revert working fixes
- If a bug-fixer reports it cannot safely fix, leave cluster as "pending"
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/tax-fix/SKILL.md
git commit -m "feat: tax-fix skill is now form-agnostic via ARGUMENTS form:year"
```

---

## Task 20: Update `tax-build` Skill

**Files:**
- Modify: `.claude/skills/tax-build/SKILL.md`

Update Phase 0 to derive paths from conventions and read FORM.md as agent context.

- [ ] **Step 1: Replace Phase 0 section**

In `.claude/skills/tax-build/SKILL.md`, replace the **Phase 0** section with:

```markdown
## Phase 0 — Derive Paths + Load State

Parse `$ARGUMENTS` as form number (e.g. `1120`). Prepend `f` to get form dir prefix: `f1120`.

Derive all paths from convention:
- Form dir:     `forms/f{ARGUMENTS}/`
- Shared nodes: `forms/f{ARGUMENTS}/nodes/`
- Year dir:     `forms/f{ARGUMENTS}/2025/`
- Policy doc:   `forms/f{ARGUMENTS}/FORM.md`  (create if building new form)
- Benchmark cases: `benchmark/cases/f{ARGUMENTS}/2025/`
- State key:    `f{ARGUMENTS}:2025` in `.state/bench/state.json` under `forms`
- Node specs:   `.state/bench/node-specs/{ARGUMENTS}-2025-nodes.json`
- Progress log: `.state/bench/progress.md`

Read `CLAUDE.md` and (if it exists) `forms/f{ARGUMENTS}/FORM.md`.
Pass both as context to all spawned agents throughout this skill.

Read `.state/bench/state.json`. Navigate to `forms.f{ARGUMENTS}:2025.build`:
- `null` or missing → start from Phase 1
- `"research"` → skip to Phase 2
- `"ground_truth"` → skip to Phase 3
- `"build"` → skip to Phase 4
- `"validate"` → skip to Phase 4 (re-validate)

Set `status` to `"running"` and write state.json.
```

Also update the state.json write calls throughout the skill to use `forms.f{ARGUMENTS}:2025.build` instead of `tasks.tax-build-$ARGUMENTS`.

Also update Phase 2 (Ground Truth) — replace `benchmark/cases/` with `benchmark/cases/f{ARGUMENTS}/2025/`.

Also update Phase 4b reference to state from `tasks.tax-build-$ARGUMENTS.benchmark_runs` to `forms.f{ARGUMENTS}:2025.build.benchmark_runs`.

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/tax-build/SKILL.md
git commit -m "feat: tax-build skill derives paths from convention, reads FORM.md as context"
```

---

## Task 21: Update `tax-status` Skill

**Files:**
- Modify: `.claude/skills/tax-status/SKILL.md`

Update to enumerate forms from the directory and read v2 state schema.

- [ ] **Step 1: Replace the file**

```markdown
---
name: tax-status
description: Human-readable status report for all tax forms. Shows benchmark accuracy, active root causes, and build/fix state for each form:year.
---

# Tax Status

## Step 0 — Discover Forms

Glob `forms/f*/FORM.md` to enumerate all known forms.
Read `.state/bench/state.json`. If it does not exist → print "Harness not initialized." and stop.
Confirm `version === 2`. If `version === 1` → print "State schema outdated. Run migration." and stop.

## Step 1 — Print Report

For each entry in `state.forms`, print one section:

```
━━━ Tax Harness Status ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{form}:{year} Fix
  Status:    {fix.status}
  Baseline:  {fix.benchmark_baseline.pass} pass / {fix.benchmark_baseline.fail} fail
  Progress:  ████████░░ {pct}%
  Root Causes:
    ✓ {name}  (fixed)
    ✗ {name}  (pending — cases {list})

{form}:{year} Build
  Status:    {build.status}
  Phase:     {build.phase}
  Cases:     {build.benchmark_cases_created} benchmark cases
  Nodes:     {build.nodes_built.length} nodes built
  Last run:  {last benchmark_runs entry}

━━━ Recent Activity ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{last 5 entries from .state/bench/progress.md}
```

Use color: green for done/fixed, red for pending/failed, yellow for running.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/tax-status/SKILL.md
git commit -m "feat: tax-status reads v2 state schema, enumerates all forms"
```

---

## Task 22: Update `tax-cases` Skill

**Files:**
- Modify: `.claude/skills/tax-cases/SKILL.md`

- [ ] **Step 1: Add path derivation at the top of the skill**

In the SKILL.md, add a **Step 0** before existing steps:

```markdown
## Step 0 — Derive Paths

Parse `$ARGUMENTS` as `{form} {year}` or `{form}:{year}` (e.g. `f1040 2025` or `f1040:2025`).

Derive:
- Cases output dir: `benchmark/cases/{form}/{year}/`
- Policy doc: `forms/{form}/FORM.md`

Read FORM.md. Pass as context to all spawned agents.
```

Update any hardcoded `benchmark/cases/` references in the skill to use the derived `{form}/{year}/` path.

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/tax-cases/SKILL.md
git commit -m "feat: tax-cases skill is form/year aware via convention"
```

---

## Task 23: Update `docs/architecture/STRUCTURE.md`

**Files:**
- Modify: `docs/architecture/STRUCTURE.md`

- [ ] **Step 1: Update the benchmark cases section**

Find the section describing `benchmark/cases/` and update it to reflect the `f1040/2025/` nesting. Add a note about the `--form`/`--year` flags.

Find the section describing `.state/bench/state.json` and add a note about the v2 schema with `forms` keyed by `f{form}:{year}`.

Add a section describing `forms/f{form}/FORM.md` as the AI orientation document.

Add a section describing `forms/f{form}/nodes/config/index.ts` as the CONFIG_BY_YEAR barrel.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/STRUCTURE.md
git commit -m "docs: update STRUCTURE.md to reflect multi-form architecture"
```

---

## Task 24: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
deno task test
# Expected: all existing tests pass
```

- [ ] **Step 2: Run benchmark**

```bash
deno task bench
# Expected: 94 PASS  3 FAIL  out of 97 cases
```

- [ ] **Step 3: Run benchmark with explicit flags**

```bash
deno run --allow-read --allow-write --allow-run benchmark/run_benchmark.ts --form f1040 --year 2025
# Expected: same result
```

- [ ] **Step 4: Verify FORM.md exists and is readable**

```bash
cat forms/f1040/FORM.md
# Expected: the orientation doc created in Task 3
```

- [ ] **Step 5: Verify CONFIG_BY_YEAR resolves**

```bash
deno eval "import { CONFIG_BY_YEAR } from './forms/f1040/nodes/config/index.ts'; console.log(Object.keys(CONFIG_BY_YEAR));"
# Expected: [ "2025" ]
```

- [ ] **Step 6: Verify state.json is v2**

```bash
deno eval "const s = JSON.parse(await Deno.readTextFile('.state/bench/state.json')); console.log(s.version, Object.keys(s.forms));" --allow-read
# Expected: 2 [ "f1040:2025", "f1120:2025" ]
```

- [ ] **Step 7: Verify no remaining direct 2025.ts imports in nodes**

```bash
grep -r "from.*config/2025\.ts" forms/f1040/nodes --include="*.ts"
# Expected: no output (all migrated to barrel)
```
