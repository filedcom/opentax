import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

// SE tax threshold: net profit >= $400 triggers Schedule SE
const SE_TAX_THRESHOLD = 400;

// Business meals are 50% deductible (standard limitation)
const MEALS_DEDUCTIBLE_PCT = 0.50;

export const inputSchema = z.object({
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

type ScheduleCInput = z.infer<typeof inputSchema>;

class ScheduleCNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_c";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["schedule1", "schedule_se", "form8995"] as const;

  compute(input: ScheduleCInput): NodeResult {
    const outputs: NodeOutput[] = [];

    // Part III: Cost of Goods Sold
    const cogs =
      (input.line_35_cogs_beginning_inventory ?? 0) +
      (input.line_36_purchases ?? 0) +
      (input.line_37_cost_of_labor ?? 0) +
      (input.line_38_materials_supplies_cogs ?? 0) +
      (input.line_39_other_cogs ?? 0);

    // Line 3 (net receipts) = gross receipts - returns & allowances
    const netReceipts =
      input.line_1_gross_receipts - (input.line_2_returns_allowances ?? 0);

    // Gross profit = net receipts - COGS
    const grossProfit = netReceipts - cogs;

    // Gross income = gross profit + other income
    const grossIncome = grossProfit + (input.line_6_other_income ?? 0);

    // Part II: Total expenses — meals subject to 50% limitation
    const mealsDeductible = (input.line_24b_meals ?? 0) * MEALS_DEDUCTIBLE_PCT;

    const totalExpenses =
      (input.line_8_advertising ?? 0) +
      (input.line_9_car_truck ?? 0) +
      (input.line_10_commissions ?? 0) +
      (input.line_11_contract_labor ?? 0) +
      (input.line_12_depletion ?? 0) +
      (input.line_13_depreciation ?? 0) +
      (input.line_14_employee_benefits ?? 0) +
      (input.line_15_insurance ?? 0) +
      (input.line_16a_interest_mortgage ?? 0) +
      (input.line_16b_interest_other ?? 0) +
      (input.line_17_professional_services ?? 0) +
      (input.line_18_office_expense ?? 0) +
      (input.line_19_pension_plans ?? 0) +
      (input.line_20a_rent_vehicles ?? 0) +
      (input.line_20b_rent_other ?? 0) +
      (input.line_21_repairs ?? 0) +
      (input.line_22_supplies ?? 0) +
      (input.line_23_taxes_licenses ?? 0) +
      (input.line_24a_travel ?? 0) +
      mealsDeductible +
      (input.line_25_utilities ?? 0) +
      (input.line_26_wages ?? 0) +
      (input.line_27a_energy_efficient ?? 0) +
      (input.line_27b_other_expenses ?? 0) +
      (input.line_30_home_office ?? 0);

    // Net profit = gross income - total expenses
    let netProfit = grossIncome - totalExpenses;

    // Professional gamblers cannot report a net loss (IRC §165(d))
    if (input.professional_gambler === true) {
      netProfit = Math.max(0, netProfit);
    }

    // Always route net profit (or loss) to Schedule 1 Line 3
    outputs.push({
      nodeType: "schedule1",
      input: { line3_schedule_c: netProfit },
    });

    // SE tax and QBI deduction: triggers when net profit >= $400
    // and the taxpayer is not a statutory employee or exempt notary
    const isStatutory = input.statutory_employee === true;
    const isExemptNotary = input.exempt_notary === true;
    const seExempt = isStatutory || isExemptNotary;

    if (!seExempt && netProfit >= SE_TAX_THRESHOLD) {
      outputs.push({
        nodeType: "schedule_se",
        input: { net_profit_schedule_c: netProfit },
      });

      outputs.push({
        nodeType: "form8995",
        input: { qbi_from_schedule_c: netProfit },
      });
    }

    return { outputs };
  }
}

export const scheduleC = new ScheduleCNode();
