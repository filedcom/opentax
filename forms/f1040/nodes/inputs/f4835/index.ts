import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleE } from "../schedule_e/index.ts";
import { priorYear8582SourceSchema } from "../../intermediate/forms/form8582/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import {
  calculateSimplifiedAtRiskLoss,
  simplifiedAtRiskSchema,
} from "../../intermediate/forms/form6198/simplified.ts";
import {
  cccLoanDetailSchema,
  cropInsuranceDeferralSchema,
  validateCccLoanElection,
  validateCropInsuranceDeferral,
} from "../../intermediate/forms/farm_elections.ts";

// Form 4835, farm rental income and expenses. Amounts follow the printed form's
// gross and taxable columns. Losses cannot be deducted before the at-risk and
// passive-activity limits have been determined.
const amount = z.number().nonnegative();
const otherExpenseSchema = z.object({
  description: z.string().min(1),
  amount,
}).strict();

export const itemSchema = z.object({
  activity_id: z.string().trim().min(1).max(64).optional(),
  activity_name: z.string().min(1),
  ein: z.string().regex(/^\d{9}$/).optional(),
  actively_participated: z.boolean().optional(),
  livestock_crop_income: amount.default(0), // line 1
  cooperative_distributions_gross: amount.optional(), // 2a
  cooperative_distributions_taxable: amount.optional(), // 2b
  agricultural_program_payments_gross: amount.optional(), // 3a
  agricultural_program_payments_taxable: amount.optional(), // 3b
  ccc_loans_reported_election: amount.optional(), // 4a, statement required
  ccc_loan_details: z.array(cccLoanDetailSchema).min(1).optional(),
  ccc_loans_forfeited_gross: amount.optional(), // 4b
  ccc_loans_forfeited_taxable: amount.optional(), // 4c
  crop_insurance_disaster_received: amount.optional(), // 5a
  crop_insurance_disaster_taxable: amount.optional(), // 5b
  defer_crop_insurance: z.boolean().optional(), // 5c, statement required
  crop_insurance_deferral_details: cropInsuranceDeferralSchema.optional(),
  crop_insurance_deferred_prior_year: amount.optional(), // 5d
  other_income: amount.optional(), // 6
  expense_car_truck: amount.optional(),
  expense_chemicals: amount.optional(),
  expense_conservation: amount.optional(),
  expense_custom_hire: amount.optional(),
  expense_depreciation: amount.optional(),
  expense_employee_benefits: amount.optional(),
  expense_feed: amount.optional(),
  expense_fertilizer: amount.optional(),
  expense_freight_trucking: amount.optional(),
  expense_gasoline: amount.optional(),
  expense_insurance: amount.optional(),
  expense_mortgage_interest: amount.optional(),
  expense_other_interest: amount.optional(),
  expense_labor_hired: amount.optional(),
  expense_pension: amount.optional(),
  expense_rent_lease_vehicles: amount.optional(),
  expense_rent_lease_land: amount.optional(),
  expense_repairs_maintenance: amount.optional(),
  expense_seeds_plants: amount.optional(),
  expense_storage_warehousing: amount.optional(),
  expense_supplies: amount.optional(),
  expense_taxes: amount.optional(),
  expense_utilities: amount.optional(),
  expense_vet_breeding: amount.optional(),
  expense_other_details: z.array(otherExpenseSchema).max(7).optional(),
  expense_capitalized_263a: amount.optional(), // 30g, reduces expenses
  some_investment_not_at_risk: z.boolean().optional(), // 34b
  prior_unallowed_passive_operating: z.number().int().nonnegative().optional(),
  prior_year_8582_source: priorYear8582SourceSchema.optional(),
  prior_passive_losses_active_when_incurred: z.boolean().optional(),
  at_risk_simplified: simplifiedAtRiskSchema.optional(),
}).strict();

export const inputSchema = z.object({
  f4835s: z.array(itemSchema).min(1).max(4),
});
export type F4835Item = z.infer<typeof itemSchema>;

const expenseFields = [
  "expense_car_truck",
  "expense_chemicals",
  "expense_conservation",
  "expense_custom_hire",
  "expense_depreciation",
  "expense_employee_benefits",
  "expense_feed",
  "expense_fertilizer",
  "expense_freight_trucking",
  "expense_gasoline",
  "expense_insurance",
  "expense_mortgage_interest",
  "expense_other_interest",
  "expense_labor_hired",
  "expense_pension",
  "expense_rent_lease_vehicles",
  "expense_rent_lease_land",
  "expense_repairs_maintenance",
  "expense_seeds_plants",
  "expense_storage_warehousing",
  "expense_supplies",
  "expense_taxes",
  "expense_utilities",
  "expense_vet_breeding",
] as const;

function taxable(
  gross: number | undefined,
  taxableAmount: number | undefined,
  label: string,
): number {
  if ((taxableAmount ?? 0) > (gross ?? 0)) {
    throw new Error(`Form 4835 ${label}: taxable amount exceeds gross amount`);
  }
  return taxableAmount ?? 0;
}

export function calculateForm4835Lines(item: F4835Item) {
  if (
    (item.prior_unallowed_passive_operating ?? 0) > 0 &&
    item.actively_participated === true &&
    item.prior_passive_losses_active_when_incurred === undefined
  ) {
    throw new Error(
      "Form 4835 prior passive loss needs prior-year active participation answer",
    );
  }
  validateCccLoanElection(
    item.ccc_loans_reported_election,
    item.ccc_loan_details,
    "Form 4835 line 4a",
  );
  validateCropInsuranceDeferral(
    item.crop_insurance_disaster_received,
    item.crop_insurance_disaster_taxable,
    item.defer_crop_insurance,
    item.crop_insurance_deferral_details,
    "Form 4835 line 5c",
  );
  const gross = item.livestock_crop_income +
    (item.ccc_loans_reported_election ?? 0) +
    taxable(
      item.cooperative_distributions_gross,
      item.cooperative_distributions_taxable,
      "line 2b",
    ) +
    taxable(
      item.agricultural_program_payments_gross,
      item.agricultural_program_payments_taxable,
      "line 3b",
    ) +
    taxable(
      item.ccc_loans_forfeited_gross,
      item.ccc_loans_forfeited_taxable,
      "line 4c",
    ) +
    taxable(
      item.crop_insurance_disaster_received,
      item.crop_insurance_disaster_taxable,
      "line 5b",
    ) +
    (item.crop_insurance_deferred_prior_year ?? 0) + (item.other_income ?? 0);
  const expenseBeforeCapitalization =
    expenseFields.reduce((sum, key) => sum + (item[key] ?? 0), 0) +
    (item.expense_other_details ?? []).reduce(
      (sum, line) => sum + line.amount,
      0,
    );
  const capitalized = item.expense_capitalized_263a ?? 0;
  if (capitalized > 0 && (item.expense_other_details?.length ?? 0) > 6) {
    throw new Error(
      "Form 4835 line 30g needs one of the seven other-expense rows",
    );
  }
  if (capitalized > expenseBeforeCapitalization) {
    throw new Error("Form 4835 line 30g exceeds total expenses");
  }
  const expenses = expenseBeforeCapitalization - capitalized;
  const preliminaryNet = gross - expenses;
  if (preliminaryNet < 0 && item.some_investment_not_at_risk === undefined) {
    throw new Error(
      "Form 4835 loss requires an explicit line 34 at-risk checkbox",
    );
  }
  if (item.at_risk_simplified && item.some_investment_not_at_risk !== true) {
    throw new Error("Form 4835 at-risk computation requires line 34b");
  }
  if (item.at_risk_simplified && preliminaryNet >= 0) {
    throw new Error(
      "Form 4835 Form 6198 computation requires a preliminary loss",
    );
  }
  if (
    preliminaryNet < 0 && item.some_investment_not_at_risk === true &&
    !item.at_risk_simplified
  ) {
    throw new Error(
      "Form 4835 line 34b requires Form 6198 simplified-computation facts",
    );
  }
  return { gross, expenses, preliminaryNet };
}

export function calculateForm4835AtRiskNet(item: F4835Item): {
  preliminaryNet: number;
  atRiskNet: number;
  suspended: number;
  amountAtRisk?: number;
} {
  const { preliminaryNet } = calculateForm4835Lines(item);
  if (preliminaryNet >= 0 || item.some_investment_not_at_risk !== true) {
    return { preliminaryNet, atRiskNet: preliminaryNet, suspended: 0 };
  }
  const details = item.at_risk_simplified;
  if (!details) {
    throw new Error(
      "Form 6198 simplified computation requires whole-dollar activity amounts",
    );
  }
  return calculateSimplifiedAtRiskLoss(preliminaryNet, details);
}

class F4835Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4835";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleE]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f4835s } = inputSchema.parse(input);
    const lines = f4835s.map(calculateForm4835Lines);
    const atRisk = f4835s.map(calculateForm4835AtRiskNet);
    const farmRentalNet = atRisk.reduce((sum, farm) => sum + farm.atRiskNet, 0);
    const farmRentalGross = lines.reduce((sum, line) => sum + line.gross, 0);
    return {
      outputs: [output(scheduleE, {
        farm_rental_net: farmRentalNet,
        farm_rental_gross: farmRentalGross,
        farm_rental_activities: f4835s.map((item, index) => ({
          activity_id: item.activity_id,
          name: item.activity_name,
          current_net: atRisk[index].atRiskNet,
          actively_participated: item.actively_participated === true,
          ...((item.prior_unallowed_passive_operating ?? 0) > 0
            ? {
              prior_unallowed_operating: item.prior_unallowed_passive_operating,
              prior_year_8582_source: item.prior_year_8582_source,
              prior_active_participation:
                item.prior_passive_losses_active_when_incurred,
            }
            : {}),
        })),
      })],
      carryforwards: Object.fromEntries(
        atRisk.flatMap((farm, index) =>
          farm.suspended > 0
            ? [[`f4835_at_risk_suspended_${index + 1}`, farm.suspended]]
            : []
        ),
      ),
    };
  }
}

export const f4835 = new F4835Node();
