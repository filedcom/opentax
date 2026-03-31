import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { scheduleC as schedule_c } from "../../../inputs/schedule_c/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── TY2025 Depreciation Rate Table (MACRS 39-year, mid-month convention) ─────
// Source: IRS Instructions for Form 8829, Part III Line 41
// Index 0 = January, Index 11 = December (first year of business use in TY2025)
const DEPRECIATION_RATES_TY2025 = [
  0.02461, // January
  0.02247, // February
  0.02033, // March
  0.01819, // April
  0.01605, // May
  0.01391, // June
  0.01177, // July
  0.00963, // August
  0.00749, // September
  0.00535, // October
  0.00321, // November
  0.00107, // December
];

// Rate for homes where business use began before 2025 (full-year mid-month convention)
const DEPRECIATION_RATE_PRIOR_YEAR = 0.02564;

// ─── Input Schema ─────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Part I: Business percentage inputs
  total_area: z.number().nonnegative().optional(),
  business_area: z.number().nonnegative().optional(),

  // From f1098: mortgage interest already allocated to business use
  mortgage_interest: z.number().nonnegative().optional(),

  // Part II: Indirect expenses (business portion calculated via business_pct)
  insurance: z.number().nonnegative().optional(),
  rent: z.number().nonnegative().optional(),
  repairs_maintenance: z.number().nonnegative().optional(),
  utilities: z.number().nonnegative().optional(),
  other_expenses: z.number().nonnegative().optional(),

  // Gross income limitation (Schedule C tentative profit before home office)
  gross_income_limit: z.number().nonnegative().optional(),

  // Prior year unallowed operating expenses (Form 8829 Line 43 from prior year)
  prior_year_operating_carryover: z.number().nonnegative().optional(),

  // Part III: Depreciation inputs
  home_fmv_or_basis: z.number().nonnegative().optional(),
  // Month home first used for business: 1–12 for TY2025 first use, 0 for prior-year use
  first_business_use_month: z.number().int().min(0).max(12).optional(),

  // Prior year unallowed excess depreciation (Form 8829 Line 44 from prior year)
  prior_year_depreciation_carryover: z.number().nonnegative().optional(),
});

type Form8829Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function businessPct(total: number, business: number): number {
  return Math.min(1, business / total);
}

function computeDepreciation(input: Form8829Input, pct: number): number {
  const basis = input.home_fmv_or_basis;
  if (basis === undefined) return 0;

  const month = input.first_business_use_month;
  if (month === undefined) return 0;

  let rate: number;
  if (month === 0) {
    rate = DEPRECIATION_RATE_PRIOR_YEAR;
  } else {
    rate = DEPRECIATION_RATES_TY2025[month - 1];
  }

  return Math.round(basis * pct * rate);
}

function computeOperatingExpenses(input: Form8829Input, pct: number): number {
  const indirect =
    (input.insurance ?? 0) +
    (input.rent ?? 0) +
    (input.repairs_maintenance ?? 0) +
    (input.utilities ?? 0) +
    (input.other_expenses ?? 0);

  // Mortgage interest is already business-allocated — no further pct multiplication
  return indirect * pct + (input.mortgage_interest ?? 0);
}

function computeAllowableDeduction(input: Form8829Input): number {
  const total = input.total_area ?? 0;
  const business = input.business_area ?? 0;

  if (total === 0 || business === 0) return 0;

  const pct = businessPct(total, business);
  const incomeLimit = input.gross_income_limit ?? 0;

  if (incomeLimit === 0) return 0;

  // Step 1: Operating expenses (indirect × pct + mortgage_interest)
  const operatingCurrent = computeOperatingExpenses(input, pct);
  const operatingPool = operatingCurrent + (input.prior_year_operating_carryover ?? 0);

  // Step 2: Apply income limit to operating expenses
  const allowableOperating = Math.min(operatingPool, incomeLimit);

  // Step 3: Remaining limit for depreciation
  const remainingLimit = Math.max(0, incomeLimit - allowableOperating);

  // Step 4: Depreciation pool
  const depreciationCurrent = computeDepreciation(input, pct);
  const depreciationPool = depreciationCurrent + (input.prior_year_depreciation_carryover ?? 0);

  // Step 5: Apply remaining limit to depreciation
  const allowableDepreciation = Math.min(depreciationPool, remainingLimit);

  return allowableOperating + allowableDepreciation;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8829Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_8829";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_c]);

  compute(_ctx: NodeContext, rawInput: Form8829Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const deduction = computeAllowableDeduction(input);

    if (deduction <= 0) return { outputs: [] };

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule_c, { line_30_home_office: deduction }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form_8829 = new Form8829Node();
