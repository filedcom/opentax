import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_se } from "../../intermediate/schedule_se/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";

// SE tax threshold: net profit >= $400 triggers Schedule SE
const SE_TAX_THRESHOLD = 400;

// Business meals are 50% deductible (standard limitation)
const MEALS_DEDUCTIBLE_PCT = 0.50;

export const itemSchema = z.object({
  // Header / identification
  line_a_principal_business: z.string(),
  line_b_business_code: z.string(),
  line_f_accounting_method: z.enum(["cash", "accrual", "other"]),
  line_g_material_participation: z.boolean(),

  // Special treatment flags
  statutory_employee: z.boolean().optional(),
  exempt_notary: z.boolean().optional(),
  professional_gambler: z.boolean().optional(),

  // Part I: Income
  line_1_gross_receipts: z.number().nonnegative(),
  line_2_returns_allowances: z.number().nonnegative().optional(),
  line_6_other_income: z.number().optional(),

  // Part III: Cost of Goods Sold
  line_35_cogs_beginning_inventory: z.number().nonnegative().optional(),
  line_36_purchases: z.number().nonnegative().optional(),
  line_37_cost_of_labor: z.number().nonnegative().optional(),
  line_38_materials_supplies_cogs: z.number().nonnegative().optional(),
  line_39_other_cogs: z.number().nonnegative().optional(),

  // Part II: Expenses
  line_8_advertising: z.number().nonnegative().optional(),
  line_9_car_truck: z.number().nonnegative().optional(),
  line_10_commissions: z.number().nonnegative().optional(),
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
  line_25_utilities: z.number().nonnegative().optional(),
  line_26_wages: z.number().nonnegative().optional(),
  line_27a_energy_efficient: z.number().nonnegative().optional(),
  line_27b_other_expenses: z.number().nonnegative().optional(),
  line_30_home_office: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  schedule_cs: z.array(itemSchema).min(1),
});

type ScheduleCItem = z.infer<typeof itemSchema>;

function computeCOGS(item: ScheduleCItem): number {
  return (item.line_35_cogs_beginning_inventory ?? 0) +
    (item.line_36_purchases ?? 0) +
    (item.line_37_cost_of_labor ?? 0) +
    (item.line_38_materials_supplies_cogs ?? 0) +
    (item.line_39_other_cogs ?? 0);
}

function computeGrossIncome(item: ScheduleCItem): number {
  const netReceipts = item.line_1_gross_receipts -
    (item.line_2_returns_allowances ?? 0);
  const grossProfit = netReceipts - computeCOGS(item);
  return grossProfit + (item.line_6_other_income ?? 0);
}

function computeTotalExpenses(item: ScheduleCItem): number {
  const mealsDeductible = (item.line_24b_meals ?? 0) * MEALS_DEDUCTIBLE_PCT;
  return (item.line_8_advertising ?? 0) +
    (item.line_9_car_truck ?? 0) +
    (item.line_10_commissions ?? 0) +
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
    (item.line_30_home_office ?? 0);
}

// Professional gamblers cannot report a net loss (IRC §165(d))
function computeNetProfit(item: ScheduleCItem): number {
  const rawProfit = computeGrossIncome(item) - computeTotalExpenses(item);
  return item.professional_gambler === true ? Math.max(0, rawProfit) : rawProfit;
}

function scheduleCItemOutputs(item: ScheduleCItem): NodeOutput[] {
  const netProfit = computeNetProfit(item);
  const seExempt = item.statutory_employee === true || item.exempt_notary === true;
  return [
    { nodeType: schedule1.nodeType, input: { line3_schedule_c: netProfit } },
    ...(!seExempt && netProfit >= SE_TAX_THRESHOLD ? [
      { nodeType: schedule_se.nodeType, input: { net_profit_schedule_c: netProfit } },
      { nodeType: form8995.nodeType, input: { qbi_from_schedule_c: netProfit } },
    ] : []),
  ];
}

class ScheduleCNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, schedule_se, form8995]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.schedule_cs.flatMap(scheduleCItemOutputs) };
  }
}

export const scheduleC = new ScheduleCNode();
