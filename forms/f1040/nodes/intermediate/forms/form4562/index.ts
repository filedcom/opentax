import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { form6251 } from "../form6251/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ── TY2025 Constants ──────────────────────────────────────────────────────────

// §179 limits (P.L. 119-21, "One Big Beautiful Bill Act")
const SECTION_179_LIMIT = 2_500_000;
const SECTION_179_PHASEOUT_THRESHOLD = 4_000_000;

// Bonus depreciation rates
const BONUS_RATE_PRE_JAN20 = 0.40;   // Property placed in service before Jan 20, 2025
const BONUS_RATE_POST_JAN19 = 1.00;  // Property placed in service after Jan 19, 2025
const BONUS_RATE_ELECT_40PCT = 0.40; // Taxpayer elects 40% instead of 100%

// Luxury automobile limits TY2025 (Table 2 — acquired after Sep 27, 2017, placed in service 2025)
const LUXURY_AUTO_YEAR1_NO_BONUS = 12_200;
const LUXURY_AUTO_YEAR1_WITH_BONUS = 20_200;
const LUXURY_AUTO_YEAR2 = 19_600;
const LUXURY_AUTO_YEAR3_PLUS = 11_900;

// Business-use threshold for listed property bonus/§179 eligibility
const LISTED_PROPERTY_QUALIFIED_USE_THRESHOLD = 50;

// ── MACRS Table A — 200% Declining Balance / Half-Year Convention ─────────────
// Source: IRS Form 4562 Instructions TY2025, Table A (page 20)
// Array indexed by year-of-service (0-based); length = recovery period + 1 (HY adds final year)
const MACRS_200DB_RATES: Record<number, readonly number[]> = {
  3: [0.3333, 0.4445, 0.1481, 0.0741],
  5: [0.2000, 0.3200, 0.1920, 0.1152, 0.1152, 0.0576],
  7: [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
  10: [0.1000, 0.1800, 0.1440, 0.1152, 0.0922, 0.0737, 0.0655, 0.0655, 0.0656, 0.0655, 0.0328],
};

// ── MACRS Table B — 150% Declining Balance / Half-Year Convention ─────────────
// Source: IRS Form 4562 Instructions TY2025, Table B (page 20)
// Used for 15-year and 20-year property
const MACRS_150DB_RATES: Record<number, readonly number[]> = {
  5: [0.1500, 0.2550, 0.1785, 0.1666, 0.1666, 0.0833],
  7: [0.1071, 0.1913, 0.1503, 0.1225, 0.1225, 0.1225, 0.0613],
  10: [0.0750, 0.1388, 0.1179, 0.1002, 0.0874, 0.0874, 0.0874, 0.0874, 0.0874, 0.0873, 0.0437],
  12: [0.0625, 0.1172, 0.1025, 0.0897, 0.0785, 0.0733, 0.0733, 0.0733, 0.0733, 0.0733, 0.0732,
    0.0733, 0.0366],
  15: [0.0500, 0.0950, 0.0855, 0.0770, 0.0693, 0.0623, 0.0590, 0.0590, 0.0591, 0.0590, 0.0591,
    0.0590, 0.0591, 0.0590, 0.0591, 0.0295],
  20: [0.0375, 0.0722, 0.0668, 0.0618, 0.0571, 0.0528, 0.0489, 0.0452, 0.0446, 0.0446, 0.0446,
    0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0446, 0.0223],
};

// Recovery periods that use 150DB (instead of 200DB)
const MACRS_150DB_PERIODS = new Set([15, 20]);

// ── Schema ────────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // §179 Election (Part I)
  // Pre-computed §179 deduction from upstream node (e.g. schedule_e)
  section_179_deduction: z.number().nonnegative().optional(),
  // Direct §179 inputs for assets entered on this form
  section_179_cost: z.number().nonnegative().optional(),
  section_179_elected: z.number().nonnegative().optional(),
  section_179_carryover: z.number().nonnegative().optional(),
  // Business income limit (Line 11) — taxable income from active trade/business
  business_income_limit: z.number().optional(),

  // Bonus Depreciation (Part II, Line 14)
  // Depreciable basis for property placed in service before Jan 20, 2025 (40% rate)
  bonus_depreciation_basis: z.number().nonnegative().optional(),
  // Depreciable basis for property placed in service after Jan 19, 2025 (100% rate)
  bonus_depreciation_basis_post_jan19: z.number().nonnegative().optional(),
  // Elections
  elect_out_bonus: z.boolean().optional(),
  elect_40pct_bonus: z.boolean().optional(),

  // MACRS GDS (Part III-A, Lines 19a-19j) — single asset entry
  macrs_gds_basis: z.number().nonnegative().optional(),
  macrs_gds_recovery_period: z.number().int().positive().optional(),
  macrs_gds_year_of_service: z.number().int().min(1).optional(),
  // MACRS prior-year depreciation (Line 17) — assets placed in service before 2025
  macrs_prior_depreciation: z.number().nonnegative().optional(),

  // Listed property flags (Part V)
  is_listed_property: z.boolean().optional(),
  business_use_pct: z.number().min(0).max(100).optional(),

  // Luxury automobile limits (Part V, Lines 26/27)
  is_luxury_auto: z.boolean().optional(),
  luxury_auto_year: z.number().int().min(1).optional(),
});

type Form4562Input = z.infer<typeof inputSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function section179PhaseOutLimit(cost: number): number {
  const excess = Math.max(0, cost - SECTION_179_PHASEOUT_THRESHOLD);
  return Math.max(0, SECTION_179_LIMIT - excess);
}

function computeSection179(input: Form4562Input): number {
  // Pre-computed upstream deduction (e.g. from schedule_e) — already validated upstream
  const upstream = input.section_179_deduction ?? 0;

  // Direct §179 election on assets entered here
  const cost = input.section_179_cost ?? 0;
  const elected = input.section_179_elected ?? 0;
  const carryover = input.section_179_carryover ?? 0;

  let directAllowed = 0;
  if (elected > 0 && cost > 0) {
    const limit = section179PhaseOutLimit(cost);
    directAllowed = Math.min(elected, limit);
  }

  const total = upstream + directAllowed + carryover;
  if (total === 0) return 0;

  // Business income limitation (Line 11/12)
  const incomeLimit = input.business_income_limit;
  if (incomeLimit !== undefined && incomeLimit >= 0) {
    return Math.min(total, incomeLimit);
  }
  return total;
}

function isListedPropertyQualified(input: Form4562Input): boolean {
  if (!input.is_listed_property) return true;
  const pct = input.business_use_pct ?? 100;
  return pct > LISTED_PROPERTY_QUALIFIED_USE_THRESHOLD;
}

function computeBonusDepreciation(input: Form4562Input): number {
  if (input.elect_out_bonus === true) return 0;
  if (!isListedPropertyQualified(input)) return 0;

  const preJan20Basis = input.bonus_depreciation_basis ?? 0;
  const postJan19Basis = input.bonus_depreciation_basis_post_jan19 ?? 0;

  const preJan20Bonus = preJan20Basis * BONUS_RATE_PRE_JAN20;

  const postRate = input.elect_40pct_bonus === true
    ? BONUS_RATE_ELECT_40PCT
    : BONUS_RATE_POST_JAN19;
  const postJan19Bonus = postJan19Basis * postRate;

  return preJan20Bonus + postJan19Bonus;
}

function macrsPct(
  period: number,
  yearOfService: number,
): { rate: number; is200db: boolean } {
  const use150db = MACRS_150DB_PERIODS.has(period);
  const table = use150db ? MACRS_150DB_RATES : MACRS_200DB_RATES;
  const rates = table[period];
  if (!rates) return { rate: 0, is200db: false };
  const idx = yearOfService - 1;
  const rate = idx < rates.length ? rates[idx] : 0;
  return { rate, is200db: !use150db };
}

function macrs150dbRate(period: number, yearOfService: number): number {
  const rates = MACRS_150DB_RATES[period];
  if (!rates) return 0;
  const idx = yearOfService - 1;
  return idx < rates.length ? rates[idx] : 0;
}

function computeMacrsGds(
  input: Form4562Input,
): { depreciation: number; amtAdjustment: number } {
  const basis = input.macrs_gds_basis ?? 0;
  const period = input.macrs_gds_recovery_period;
  const yearOfService = input.macrs_gds_year_of_service;

  if (basis === 0 || period === undefined || yearOfService === undefined) {
    return { depreciation: 0, amtAdjustment: 0 };
  }

  const businessUsePct = (input.business_use_pct ?? 100) / 100;
  const effectiveBasis = basis * businessUsePct;

  const { rate, is200db } = macrsPct(period, yearOfService);
  const depreciation = Math.round(effectiveBasis * rate);

  // AMT adjustment: excess of 200DB depreciation over 150DB (IRC §56(a)(1))
  let amtAdjustment = 0;
  if (is200db) {
    const rate150 = macrs150dbRate(period, yearOfService);
    amtAdjustment = Math.round(effectiveBasis * (rate - rate150));
  }

  return { depreciation, amtAdjustment };
}

function luxuryAutoLimit(year: number, hasBonusDep: boolean): number {
  if (year === 1) {
    return hasBonusDep ? LUXURY_AUTO_YEAR1_WITH_BONUS : LUXURY_AUTO_YEAR1_NO_BONUS;
  }
  if (year === 2) return LUXURY_AUTO_YEAR2;
  return LUXURY_AUTO_YEAR3_PLUS;
}

function applyLuxuryAutoLimit(
  input: Form4562Input,
  computed: number,
  hasBonusDep: boolean,
): number {
  if (!input.is_luxury_auto) return computed;
  const year = input.luxury_auto_year ?? 1;
  return Math.min(computed, luxuryAutoLimit(year, hasBonusDep));
}

// ── Node class ────────────────────────────────────────────────────────────────

class Form4562Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4562";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator, form6251]);

  compute(_ctx: NodeContext, input: Form4562Input): NodeResult {
    const parsed = inputSchema.parse(input);

    const s179 = computeSection179(parsed);
    const bonus = computeBonusDepreciation(parsed);
    const { depreciation: macrsGds, amtAdjustment } = computeMacrsGds(parsed);
    const macrs_prior = parsed.macrs_prior_depreciation ?? 0;

    const hasBonusDep = bonus > 0;
    const rawDepreciation = s179 + bonus + macrsGds + macrs_prior;

    if (rawDepreciation === 0 && amtAdjustment === 0) {
      return { outputs: [] };
    }

    const totalDepreciation = applyLuxuryAutoLimit(parsed, rawDepreciation, hasBonusDep);

    const outputs: NodeOutput[] = [];

    if (totalDepreciation > 0) {
      outputs.push(this.outputNodes.output(schedule1, { line13_depreciation: totalDepreciation }));
      outputs.push(this.outputNodes.output(agi_aggregator, { line13_depreciation: totalDepreciation }));
    }

    if (amtAdjustment > 0) {
      outputs.push(this.outputNodes.output(form6251, { depreciation_adjustment: amtAdjustment }));
    }

    return { outputs };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const form4562 = new Form4562Node();
