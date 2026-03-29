import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_se } from "../../intermediate/schedule_se/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { form8582 } from "../../intermediate/form8582/index.ts";
import { form6198 } from "../../intermediate/form6198/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { form8990 } from "../../intermediate/form8990/index.ts";
import { form461 } from "../../intermediate/form461/index.ts";

// ── TY2025 Constants ────────────────────────────────────────────────────────

const SE_TAX_THRESHOLD = 400;               // Net profit >= $400 → Schedule SE
const CLERGY_SE_THRESHOLD = 108.28;         // Clergy SE threshold (no Form 4361)
const MEALS_STANDARD_PCT = 0.50;            // Standard business meals
const MEALS_DOT_PCT = 0.80;                 // DOT hours-of-service workers
const MEALS_WAGES_PCT = 1.00;              // Meals treated as employee wages
const HOME_OFFICE_SIMPLIFIED_RATE = 5.00;  // $5.00 per sq ft (simplified method)
const HOME_OFFICE_MAX_SQ_FT = 300;         // 300 sq ft maximum
const EBL_THRESHOLD_SINGLE = 313_000;      // Excess business loss — single
const EBL_THRESHOLD_MFJ = 626_000;         // Excess business loss — MFJ

// ── Schemas ─────────────────────────────────────────────────────────────────

const otherExpenseSchema = z.object({
  description: z.string(),
  amount: z.number().nonnegative(),
});

export const itemSchema = z.object({
  // Header / identification
  line_a_principal_business: z.string(),
  line_b_business_code: z.string(),
  line_c_business_name: z.string().optional(),
  line_d_ein: z.string().optional(),
  line_e_business_address: z.string().optional(),
  line_f_accounting_method: z.enum(["cash", "accrual", "other"]),
  line_g_material_participation: z.boolean(),
  line_h_new_business: z.boolean().optional(),
  line_i_made_1099_payments: z.boolean().optional(),
  line_j_filed_1099s: z.boolean().optional(),

  // Drake-specific special treatment flags
  statutory_employee: z.boolean().optional(),
  exempt_notary: z.boolean().optional(),
  paper_route: z.boolean().optional(),
  professional_gambler: z.boolean().optional(),
  clergy_schedule_c: z.boolean().optional(),
  disposed_of_business: z.boolean().optional(),
  multi_form_code: z.string().optional(),
  llc_number: z.number().int().min(1).max(999).optional(),
  subject_to_163j: z.boolean().optional(),  // §163(j) business interest limitation

  // Part I: Income
  line_1_gross_receipts: z.number().nonnegative(),
  line_2_returns_allowances: z.number().nonnegative().optional(),
  line_6_other_income: z.number().optional(),  // can be negative (recapture)

  // Part II: Expenses
  line_8_advertising: z.number().nonnegative().optional(),
  line_9_car_truck_expenses: z.number().nonnegative().optional(),
  line_10_commissions_fees: z.number().nonnegative().optional(),
  line_11_contract_labor: z.number().nonnegative().optional(),
  line_12_depletion: z.number().nonnegative().optional(),
  line_13_depreciation: z.number().nonnegative().optional(),
  line_14_employee_benefits: z.number().nonnegative().optional(),
  line_15_insurance: z.number().nonnegative().optional(),
  line_16a_interest_mortgage: z.number().nonnegative().optional(),
  line_16b_interest_other: z.number().nonnegative().optional(),
  line_17_professional_services: z.number().nonnegative().optional(),
  line_18_office_expense: z.number().nonnegative().optional(),
  line_19_pension_plans: z.number().nonnegative().optional(),
  line_20a_rent_vehicles: z.number().nonnegative().optional(),
  line_20b_rent_other: z.number().nonnegative().optional(),
  line_21_repairs: z.number().nonnegative().optional(),
  line_22_supplies: z.number().nonnegative().optional(),
  line_23_taxes_licenses: z.number().nonnegative().optional(),
  line_24a_travel: z.number().nonnegative().optional(),
  line_24b_meals: z.number().nonnegative().optional(),
  meals_dot_worker: z.boolean().optional(),   // DOT hours-of-service → 80% meals
  meals_as_wages: z.boolean().optional(),     // Meals treated as wages → 100%
  line_25_utilities: z.number().nonnegative().optional(),
  line_26_wages: z.number().nonnegative().optional(),
  line_27a_energy_efficient: z.number().nonnegative().optional(),
  line_27b_other_expenses: z.number().nonnegative().optional(),
  line_30_home_office: z.number().nonnegative().optional(), // pre-computed dollar amount
  home_office_sq_ft: z.number().nonnegative().optional(),   // simplified method sq ft input
  home_office_method: z.enum(["simplified", "actual"]).optional(),
  line_32_at_risk: z.enum(["a", "b"]).optional(),

  // Part III: Cost of Goods Sold
  line_33_inventory_method: z.enum(["cost", "lcm", "other"]).optional(),
  line_34_inventory_change: z.boolean().optional(),
  line_35_cogs_beginning_inventory: z.number().nonnegative().optional(),
  line_36_purchases: z.number().nonnegative().optional(),
  line_37_cost_of_labor: z.number().nonnegative().optional(),
  line_38_materials_supplies_cogs: z.number().nonnegative().optional(),
  line_39_other_cogs: z.number().nonnegative().optional(),
  line_41_cogs_ending_inventory: z.number().nonnegative().optional(),

  // Part IV: Vehicle information (informational — substantiation only)
  line_43_date_in_service: z.string().optional(),
  line_44a_total_miles: z.number().int().nonnegative().optional(),
  line_44b_business_miles: z.number().int().nonnegative().optional(),
  line_44c_commuting_miles: z.number().int().nonnegative().optional(),
  line_44d_other_miles: z.number().int().nonnegative().optional(),
  line_45_personal_use: z.boolean().optional(),
  line_46_another_vehicle: z.boolean().optional(),
  line_47a_evidence: z.boolean().optional(),
  line_47b_written_evidence: z.boolean().optional(),

  // Part V: Other Expenses detail
  part_v_other_expenses: z.array(otherExpenseSchema).optional(),
});

export const inputSchema = z.object({
  schedule_cs: z.array(itemSchema),
  filing_status: z.string().optional(),
  // Line 30 — Home office deduction (from Form 8829 line 35)
  // IRC §280A; Form 8829 line 35 → Schedule C line 30
  line_30_home_office: z.number().nonnegative().optional(),
  // Line 1 — Gross receipts or sales (from 1099-MISC, 1099-NEC, etc.)
  // Passthrough from upstream nodes routing to Schedule C
  line1_gross_receipts: z.number().nonnegative().optional(),
  // Statutory employee wages (from W-2 Box 13)
  // IRC §3121(d)(3); W-2 box 13 statutory employee checkbox
  statutory_wages: z.number().nonnegative().optional(),
  // Federal withholding from statutory employee W-2 Box 2
  withholding: z.number().nonnegative().optional(),
  // Mortgage interest from 1098 Box 1 routed to Schedule C (business use)
  line16a_interest_mortgage: z.number().nonnegative().optional(),
});

type ScheduleCItem = z.infer<typeof itemSchema>;

// ── Pure helpers ────────────────────────────────────────────────────────────

function computeCOGS(item: ScheduleCItem): number {
  const line40 = (item.line_35_cogs_beginning_inventory ?? 0) +
    (item.line_36_purchases ?? 0) +
    (item.line_37_cost_of_labor ?? 0) +
    (item.line_38_materials_supplies_cogs ?? 0) +
    (item.line_39_other_cogs ?? 0);
  return line40 - (item.line_41_cogs_ending_inventory ?? 0);
}

function computeGrossIncome(item: ScheduleCItem): number {
  const netSales = item.line_1_gross_receipts - (item.line_2_returns_allowances ?? 0);
  const grossProfit = netSales - computeCOGS(item);
  return grossProfit + (item.line_6_other_income ?? 0);
}

function mealsDeductiblePct(item: ScheduleCItem): number {
  if (item.meals_as_wages === true) return MEALS_WAGES_PCT;
  if (item.meals_dot_worker === true) return MEALS_DOT_PCT;
  return MEALS_STANDARD_PCT;
}

function homeOfficeDeduction(item: ScheduleCItem, tentativeProfit: number): number {
  let deduction: number;
  if (item.home_office_method === "simplified" && item.home_office_sq_ft !== undefined) {
    const cappedSqFt = Math.min(item.home_office_sq_ft, HOME_OFFICE_MAX_SQ_FT);
    deduction = cappedSqFt * HOME_OFFICE_SIMPLIFIED_RATE;
  } else {
    deduction = item.line_30_home_office ?? 0;
  }
  // Gross income limitation: deduction cannot exceed tentative profit (Line 29)
  return Math.min(deduction, Math.max(0, tentativeProfit));
}

function computeTotalExpenses(item: ScheduleCItem): number {
  const mealsDeductible = (item.line_24b_meals ?? 0) * mealsDeductiblePct(item);
  const partVTotal = (item.part_v_other_expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
  return (item.line_8_advertising ?? 0) +
    (item.line_9_car_truck_expenses ?? 0) +
    (item.line_10_commissions_fees ?? 0) +
    (item.line_11_contract_labor ?? 0) +
    (item.line_12_depletion ?? 0) +
    (item.line_13_depreciation ?? 0) +
    (item.line_14_employee_benefits ?? 0) +
    (item.line_15_insurance ?? 0) +
    (item.line_16a_interest_mortgage ?? 0) +
    (item.line_16b_interest_other ?? 0) +
    (item.line_17_professional_services ?? 0) +
    (item.line_18_office_expense ?? 0) +
    (item.line_19_pension_plans ?? 0) +
    (item.line_20a_rent_vehicles ?? 0) +
    (item.line_20b_rent_other ?? 0) +
    (item.line_21_repairs ?? 0) +
    (item.line_22_supplies ?? 0) +
    (item.line_23_taxes_licenses ?? 0) +
    (item.line_24a_travel ?? 0) +
    mealsDeductible +
    (item.line_25_utilities ?? 0) +
    (item.line_26_wages ?? 0) +
    (item.line_27a_energy_efficient ?? 0) +
    (item.line_27b_other_expenses ?? 0) +
    partVTotal;
}

function computeNetProfit(item: ScheduleCItem): number {
  const grossIncome = computeGrossIncome(item);
  const totalExpenses = computeTotalExpenses(item);
  const tentativeProfit = grossIncome - totalExpenses;   // Line 29
  const homeOffice = homeOfficeDeduction(item, tentativeProfit);
  const rawProfit = tentativeProfit - homeOffice;        // Line 31
  // Professional gamblers cannot report a net loss (IRC §165(d))
  return item.professional_gambler === true ? Math.max(0, rawProfit) : rawProfit;
}

function isSeExempt(item: ScheduleCItem): boolean {
  return item.statutory_employee === true ||
    item.exempt_notary === true ||
    item.paper_route === true;
}

function seThreshold(item: ScheduleCItem): number {
  return item.clergy_schedule_c === true ? CLERGY_SE_THRESHOLD : SE_TAX_THRESHOLD;
}

function deductionOutputs(item: ScheduleCItem, netProfit: number): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  if (item.line_12_depletion && item.line_12_depletion > 0) {
    outputs.push(output(form6251, { other_adjustments: item.line_12_depletion }));
  }
  if (!isSeExempt(item) && netProfit >= seThreshold(item)) {
    outputs.push(output(schedule_se, { net_profit_schedule_c: netProfit }));
    outputs.push(output(form8995, { qbi_from_schedule_c: netProfit }));
  }
  if (item.line_g_material_participation === false) {
    outputs.push(output(form8582, { passive_schedule_c: netProfit }));
  }
  if (netProfit < 0 && item.line_32_at_risk === "b") {
    outputs.push(output(form6198, { schedule_c_loss: netProfit }));
  }
  if (item.subject_to_163j === true &&
    ((item.line_16a_interest_mortgage ?? 0) + (item.line_16b_interest_other ?? 0)) > 0) {
    outputs.push(output(form8990, {
        business_interest_expense:
          (item.line_16a_interest_mortgage ?? 0) + (item.line_16b_interest_other ?? 0),
      }));
  }
  return outputs;
}

// ── Node class ───────────────────────────────────────────────────────────────

class ScheduleCNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    schedule_se,
    form8995,
    form8582,
    form6198,
    form6251,
    form8990,
    form461,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    // Validate schema — throws on invalid data (negative amounts, bad enums)
    inputSchema.parse(input);

    if (input.schedule_cs.length === 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];

    // Per-item: compute net profit and collect per-item routing outputs
    const netProfits = input.schedule_cs.map(computeNetProfit);

    // Aggregate net profits → single schedule1 output
    const totalNetProfit = netProfits.reduce((sum, p) => sum + p, 0);
    outputs.push(this.outputNodes.output(schedule1, { line3_schedule_c: totalNetProfit }));

    // Per-item downstream routing (SE, QBI, passive, at-risk, depletion, interest)
    for (let i = 0; i < input.schedule_cs.length; i++) {
      outputs.push(...deductionOutputs(input.schedule_cs[i], netProfits[i]));
    }

    // Excess business loss — aggregate all net profits
    if (totalNetProfit < 0) {
      const loss = Math.abs(totalNetProfit);
      const threshold = input.filing_status === "mfj"
        ? EBL_THRESHOLD_MFJ
        : EBL_THRESHOLD_SINGLE;
      if (loss > threshold) {
        outputs.push(this.outputNodes.output(form461, { excess_business_loss: loss - threshold }));
      }
    }

    return { outputs };
  }
}

export const scheduleC = new ScheduleCNode();
