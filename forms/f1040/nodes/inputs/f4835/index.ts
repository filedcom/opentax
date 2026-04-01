import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6198 } from "../../intermediate/forms/form6198/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 4835 — Farm Rental Income and Expenses
//
// For landowners who do NOT materially participate in the farm's operation.
// Net farm rental income/loss → Schedule E page 2, line 40 → Schedule 1 line 5.
// Not subject to self-employment tax.
//
// IRS Form 4835: https://www.irs.gov/pub/irs-pdf/f4835.pdf
// IRC §469 (passive activity); IRC §465 (at-risk rules)

// Per-item schema — one Form 4835 per farm rental activity
export const itemSchema = z.object({
  // Activity identification
  activity_name: z.string().min(1),

  // Part I — Income
  gross_farm_rental_income: z.number().nonnegative(),
  ccc_loans_forfeited: z.number().nonnegative().optional(),
  agricultural_program_payments: z.number().nonnegative().optional(),

  // Part II — Expenses
  expense_car_truck: z.number().nonnegative().optional(),
  expense_chemicals: z.number().nonnegative().optional(),
  expense_conservation: z.number().nonnegative().optional(),
  expense_custom_hire: z.number().nonnegative().optional(),
  expense_depreciation: z.number().nonnegative().optional(),
  expense_employee_benefits: z.number().nonnegative().optional(),
  expense_feed: z.number().nonnegative().optional(),
  expense_fertilizer: z.number().nonnegative().optional(),
  expense_freight_trucking: z.number().nonnegative().optional(),
  expense_gasoline: z.number().nonnegative().optional(),
  expense_insurance: z.number().nonnegative().optional(),
  expense_mortgage_interest: z.number().nonnegative().optional(),
  expense_other_interest: z.number().nonnegative().optional(),
  expense_labor_hired: z.number().nonnegative().optional(),
  expense_pension: z.number().nonnegative().optional(),
  expense_rent_lease_vehicles: z.number().nonnegative().optional(),
  expense_rent_lease_land: z.number().nonnegative().optional(),
  expense_repairs_maintenance: z.number().nonnegative().optional(),
  expense_seeds_plants: z.number().nonnegative().optional(),
  expense_storage_warehousing: z.number().nonnegative().optional(),
  expense_supplies: z.number().nonnegative().optional(),
  expense_taxes: z.number().nonnegative().optional(),
  expense_utilities: z.number().nonnegative().optional(),
  expense_vet_breeding: z.number().nonnegative().optional(),
  expense_other: z.number().nonnegative().optional(),

  // Pre-computed net (overrides income minus expenses when provided)
  net_farm_rental_income: z.number().optional(),

  // Federal withholding
  federal_withheld: z.number().nonnegative().optional(),

  // At-risk flag → triggers Form 6198
  some_investment_not_at_risk: z.boolean().optional(),

  // Prior-year unallowed passive loss carryforward
  prior_unallowed_passive: z.number().nonnegative().optional(),

  // ── CIDP — Crop Insurance and Disaster Payments (IRC §451(d)) ────────────
  // Crop insurance proceeds received during the tax year
  crop_insurance_proceeds: z.number().nonnegative().optional(),
  // Government disaster payment received during the tax year
  disaster_payment: z.number().nonnegative().optional(),
  // Election to defer crop/disaster proceeds to the following tax year
  defer_to_next_year: z.boolean().optional(),
  // Amount elected for deferral (cannot exceed crop_insurance_proceeds + disaster_payment)
  deferred_amount: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f4835s: z.array(itemSchema).min(1),
});

type F4835Item = z.infer<typeof itemSchema>;
type F4835Items = F4835Item[];

// Amount of crop/disaster proceeds included in current-year income.
// When defer_to_next_year is true, deferred_amount is excluded from current year.
function currentYearCidpIncome(item: F4835Item): number {
  const total = (item.crop_insurance_proceeds ?? 0) + (item.disaster_payment ?? 0);
  if (total <= 0) return 0;
  if (item.defer_to_next_year !== true) return total;
  const deferred = Math.min(item.deferred_amount ?? 0, total);
  return total - deferred;
}

// Compute net farm rental income for a single item
function computeNet(item: F4835Item): number {
  // Pre-computed net overrides calculation
  if (item.net_farm_rental_income !== undefined) {
    return item.net_farm_rental_income;
  }

  const totalIncome = item.gross_farm_rental_income +
    (item.ccc_loans_forfeited ?? 0) +
    (item.agricultural_program_payments ?? 0) +
    currentYearCidpIncome(item);

  const totalExpenses =
    (item.expense_car_truck ?? 0) +
    (item.expense_chemicals ?? 0) +
    (item.expense_conservation ?? 0) +
    (item.expense_custom_hire ?? 0) +
    (item.expense_depreciation ?? 0) +
    (item.expense_employee_benefits ?? 0) +
    (item.expense_feed ?? 0) +
    (item.expense_fertilizer ?? 0) +
    (item.expense_freight_trucking ?? 0) +
    (item.expense_gasoline ?? 0) +
    (item.expense_insurance ?? 0) +
    (item.expense_mortgage_interest ?? 0) +
    (item.expense_other_interest ?? 0) +
    (item.expense_labor_hired ?? 0) +
    (item.expense_pension ?? 0) +
    (item.expense_rent_lease_vehicles ?? 0) +
    (item.expense_rent_lease_land ?? 0) +
    (item.expense_repairs_maintenance ?? 0) +
    (item.expense_seeds_plants ?? 0) +
    (item.expense_storage_warehousing ?? 0) +
    (item.expense_supplies ?? 0) +
    (item.expense_taxes ?? 0) +
    (item.expense_utilities ?? 0) +
    (item.expense_vet_breeding ?? 0) +
    (item.expense_other ?? 0);

  return totalIncome - totalExpenses;
}

// Route net farm rental income to Schedule 1 line5_schedule_e
function schedule1Outputs(items: F4835Items): NodeOutput[] {
  const totalNet = items.reduce((sum, item) => sum + computeNet(item), 0);
  if (totalNet === 0) return [];
  return [output(schedule1, { line5_schedule_e: totalNet })];
}

// Route federal withholding to f1040 line25b
function f1040Outputs(items: F4835Items): NodeOutput[] {
  const totalWithheld = items.reduce((sum, item) => sum + (item.federal_withheld ?? 0), 0);
  if (totalWithheld <= 0) return [];
  return [output(f1040, { line25b_withheld_1099: totalWithheld })];
}

// Route at-risk activities to Form 6198
function form6198Outputs(items: F4835Items): NodeOutput[] {
  const atRiskItems = items.filter((item) => item.some_investment_not_at_risk === true);
  return atRiskItems.map((item) => {
    const net = computeNet(item);
    if (net < 0) {
      return output(form6198, { schedule_f_loss: net });
    }
    return output(form6198, { current_year_income: net });
  });
}

class F4835Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4835";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040, form6198]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f4835s } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...schedule1Outputs(f4835s),
      ...f1040Outputs(f4835s),
      ...form6198Outputs(f4835s),
    ];

    return { outputs };
  }
}

export const f4835 = new F4835Node();
