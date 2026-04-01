import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { scheduleE } from "../schedule_e/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 standard mileage rate for business vehicles
// IRS Notice 2025-5: 70 cents per mile
const STANDARD_MILEAGE_RATE = 0.70;

export enum AutoMethod {
  Standard = "standard",
  Actual = "actual",
}

export enum AutoPurpose {
  SCHEDULE_C = "SCHEDULE_C",
  SCHEDULE_E = "SCHEDULE_E",
  SCHEDULE_F = "SCHEDULE_F",
}

const actualExpensesSchema = z.object({
  depreciation: z.number().nonnegative().optional(),
  gas_oil: z.number().nonnegative().optional(),
  repairs: z.number().nonnegative().optional(),
  insurance: z.number().nonnegative().optional(),
  registration: z.number().nonnegative().optional(),
  lease_payments: z.number().nonnegative().optional(),
  other: z.number().nonnegative().optional(),
});

// Per-vehicle schema — one entry per vehicle
export const itemSchema = z.object({
  // Vehicle identification
  vehicle_description: z.string().min(1),
  // Date first placed in service (YYYY-MM-DD or MM/DD/YYYY)
  placed_in_service_date: z.string().min(1),
  // Business miles driven during 2025
  business_miles: z.number().int().nonnegative(),
  // Total miles driven during 2025 (used for business-use percentage — actual method)
  total_miles: z.number().int().nonnegative(),
  // Calculation method
  method: z.nativeEnum(AutoMethod),
  // Actual expense breakdown (required for actual method)
  actual_expenses: actualExpensesSchema.optional(),
  // Which schedule receives the deduction
  purpose: z.nativeEnum(AutoPurpose),
});

export const inputSchema = z.object({
  auto_expenses: z.array(itemSchema).min(1),
});

type AutoExpenseItem = z.infer<typeof itemSchema>;
type AutoExpenseItems = AutoExpenseItem[];

// Validate cross-field constraint: business_miles ≤ total_miles
function validateItem(item: AutoExpenseItem): void {
  if (item.business_miles > item.total_miles) {
    throw new Error(
      `auto_expense validation: business_miles (${item.business_miles}) cannot exceed total_miles (${item.total_miles}) for vehicle "${item.vehicle_description}"`,
    );
  }
  if (item.method === AutoMethod.Actual && item.total_miles === 0 && item.actual_expenses !== undefined) {
    const hasActual = Object.values(item.actual_expenses).some((v) => (v ?? 0) > 0);
    if (hasActual) {
      throw new Error(
        `auto_expense validation: total_miles cannot be 0 when actual expenses are provided for vehicle "${item.vehicle_description}"`,
      );
    }
  }
}

// Compute total actual expenses for a vehicle
function totalActualExpenses(expenses: z.infer<typeof actualExpensesSchema>): number {
  return (expenses.depreciation ?? 0) +
    (expenses.gas_oil ?? 0) +
    (expenses.repairs ?? 0) +
    (expenses.insurance ?? 0) +
    (expenses.registration ?? 0) +
    (expenses.lease_payments ?? 0) +
    (expenses.other ?? 0);
}

// Compute deductible expense for a single vehicle
function deductibleExpense(item: AutoExpenseItem): number {
  if (item.business_miles === 0) return 0;

  if (item.method === AutoMethod.Standard) {
    return item.business_miles * STANDARD_MILEAGE_RATE;
  }

  // Actual method: total actual × business percentage
  if (!item.actual_expenses) return 0;
  const total = totalActualExpenses(item.actual_expenses);
  if (total === 0) return 0;
  if (item.total_miles === 0) return 0;

  const businessPct = item.business_miles / item.total_miles;
  return Math.round(total * businessPct * 100) / 100;
}

// Aggregate deductible amounts by purpose
function aggregateByPurpose(items: AutoExpenseItems): Record<AutoPurpose, number> {
  const totals: Record<AutoPurpose, number> = {
    [AutoPurpose.SCHEDULE_C]: 0,
    [AutoPurpose.SCHEDULE_E]: 0,
    [AutoPurpose.SCHEDULE_F]: 0,
  };
  for (const item of items) {
    totals[item.purpose] += deductibleExpense(item);
  }
  return totals;
}

function buildOutputs(totals: Record<AutoPurpose, number>): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  if (totals[AutoPurpose.SCHEDULE_C] > 0) {
    outputs.push(output(scheduleC, { line_9_car_truck_expenses: totals[AutoPurpose.SCHEDULE_C] }));
  }
  if (totals[AutoPurpose.SCHEDULE_E] > 0) {
    outputs.push(output(scheduleE, { expense_auto_travel: totals[AutoPurpose.SCHEDULE_E] }));
  }
  if (totals[AutoPurpose.SCHEDULE_F] > 0) {
    outputs.push(output(schedule_f, { line10_car_truck: totals[AutoPurpose.SCHEDULE_F] }));
  }
  return outputs;
}

class AutoExpenseNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "auto_expense";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleC, scheduleE, schedule_f]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    // Cross-field validation
    for (const item of parsed.auto_expenses) {
      validateItem(item);
    }

    const totals = aggregateByPurpose(parsed.auto_expenses);
    return { outputs: buildOutputs(totals) };
  }
}

export const auto_expense = new AutoExpenseNode();
