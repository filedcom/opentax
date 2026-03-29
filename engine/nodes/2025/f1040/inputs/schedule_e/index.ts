import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import { form8582 } from "../../intermediate/form8582/index.ts";
import { form6198 } from "../../intermediate/form6198/index.ts";
import { form8960 } from "../../intermediate/form8960/index.ts";
import { form4797 } from "../../intermediate/form4797/index.ts";
import { form4562 } from "../../intermediate/form4562/index.ts";
import { form8990 } from "../../intermediate/form8990/index.ts";
import { TSJ, tsjSchema } from "../../types.ts";

export { TSJ };

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ActivityType {
  A = "A", // Active rental real estate — $25K special allowance
  B = "B", // Other passive activity
  C = "C", // Real estate professional (nonpassive)
  D = "D", // Nonpassive
}

export enum QbiTradeOrBusiness {
  Y = "Y",
  N = "N",
}

export enum QbiSafeHarbor {
  A = "A", // Separate rental enterprise
  B = "B", // Residential rental enterprise grouping
  C = "C", // Commercial rental enterprise grouping
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const otherExpenseLineSchema = z.object({
  description: z.string(),
  amount: z.number().nonnegative(),
});

export const itemSchema = z.object({
  // --- Required identification fields ---
  tsj: tsjSchema,
  property_description: z.string().min(1),
  property_type: z.number().int().min(1).max(8),
  activity_type: z.enum(["A", "B", "C", "D"]),

  // --- Required income/days ---
  fair_rental_days: z.number().int().min(0).max(365),
  personal_use_days: z.number().int().min(0).max(365),
  rent_income: z.number().nonnegative(),

  // --- Required compliance checkbox ---
  form_1099_payments_made: z.boolean(),

  // --- Conditional fields ---
  form_1099_filed: z.boolean().optional(),
  property_type_other_desc: z.string().optional(),

  // --- Address fields (informational) ---
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  foreign_country: z.string().optional(),

  // --- Property metadata ---
  qualified_joint_venture: z.boolean().optional(),
  some_investment_not_at_risk: z.boolean().optional(),
  operating_expenses_carryover: z.number().nonnegative().optional(),
  ownership_percent: z.number().min(0).max(100).optional(),
  tax_court_method: z.boolean().optional(),
  days_owned_in_year: z.number().int().min(1).max(365).optional(),
  placed_in_service: z.boolean().optional(),
  disposed_of: z.boolean().optional(),
  carry_to_8960: z.boolean().optional(),
  main_home_or_second_home: z.boolean().optional(),
  occupancy_percent: z.number().min(0).max(100).optional(),

  // --- Passive activity carryovers ---
  prior_unallowed_passive_operating: z.number().nonnegative().optional(),
  prior_unallowed_passive_4797_part1: z.number().nonnegative().optional(),
  prior_unallowed_passive_4797_part2: z.number().nonnegative().optional(),
  prior_unallowed_at_risk: z.number().nonnegative().optional(),

  // --- Interest expense carryovers ---
  disallowed_mortgage_interest_8990: z.number().nonnegative().optional(),
  disallowed_other_interest_8990: z.number().nonnegative().optional(),

  // --- QBI fields ---
  qbi_trade_or_business: z.enum(["Y", "N"]).optional(),
  qbi_specified_service: z.boolean().optional(),
  qbi_aggregation_number: z.number().int().min(1).max(99).optional(),
  qbi_w2_wages: z.number().nonnegative().optional(),
  qbi_unadjusted_basis: z.number().nonnegative().optional(),
  qbi_override: z.number().optional(),
  qbi_safe_harbor: z.enum(["A", "B", "C"]).optional(),

  // --- Section 179 (activity_type C only) ---
  section_179: z.number().nonnegative().optional(),

  // --- Disposition ---
  section_1231_gain_loss: z.number().optional(),
  elect_out_biie: z.boolean().optional(),

  // --- Income fields ---
  royalties_income: z.number().nonnegative().optional(),

  // --- Expense lines ---
  expense_advertising: z.number().nonnegative().optional(),
  expense_auto_travel: z.number().nonnegative().optional(),
  expense_cleaning: z.number().nonnegative().optional(),
  expense_commissions: z.number().nonnegative().optional(),
  expense_insurance: z.number().nonnegative().optional(),
  expense_legal_professional: z.number().nonnegative().optional(),
  expense_management: z.number().nonnegative().optional(),
  expense_mortgage_interest: z.number().nonnegative().optional(),
  expense_other_interest: z.number().nonnegative().optional(),
  expense_repairs: z.number().nonnegative().optional(),
  expense_supplies: z.number().nonnegative().optional(),
  expense_taxes: z.number().nonnegative().optional(),
  expense_utilities: z.number().nonnegative().optional(),
  expense_depreciation: z.number().nonnegative().optional(),
  expense_depreciation_amt: z.number().nonnegative().optional(),
  expense_depletion: z.number().nonnegative().optional(),
  expense_other_lines: z.array(otherExpenseLineSchema).max(6).optional(),
});

export const inputSchema = z.object({
  schedule_es: z.array(itemSchema),
});

type EItem = z.infer<typeof itemSchema>;
type EItems = EItem[];

// ─── Validation ──────────────────────────────────────────────────────────────

function validateItem(item: EItem): void {
  if (item.property_type === 8 && !item.property_type_other_desc) {
    throw new Error(
      "Schedule E validation: property_type_other_desc is required when property_type = 8",
    );
  }
  if (item.form_1099_payments_made && item.form_1099_filed === undefined) {
    throw new Error(
      "Schedule E validation: form_1099_filed is required when form_1099_payments_made = true",
    );
  }
}

// ─── Per-Property Calculation ─────────────────────────────────────────────────

function computeExpenses(item: EItem): number {
  const otherLinesTotal = (item.expense_other_lines ?? [])
    .reduce((sum, line) => sum + line.amount, 0);

  return (item.expense_advertising ?? 0) +
    (item.expense_auto_travel ?? 0) +
    (item.expense_cleaning ?? 0) +
    (item.expense_commissions ?? 0) +
    (item.expense_insurance ?? 0) +
    (item.expense_legal_professional ?? 0) +
    (item.expense_management ?? 0) +
    (item.expense_mortgage_interest ?? 0) +
    (item.expense_other_interest ?? 0) +
    (item.expense_repairs ?? 0) +
    (item.expense_supplies ?? 0) +
    (item.expense_taxes ?? 0) +
    (item.expense_utilities ?? 0) +
    (item.expense_depreciation ?? 0) +
    (item.expense_depletion ?? 0) +
    otherLinesTotal +
    (item.operating_expenses_carryover ?? 0);
}

function isVacationHomeExcluded(item: EItem): boolean {
  // IRC §280A(g): < 15 fair rental days → exclude all income, no deductions
  return item.fair_rental_days < 15;
}

function isVacationHomeLimited(item: EItem): boolean {
  // IRC §280A(d)(1): personal use > 14 days OR > 10% of rental days
  const pud = item.personal_use_days;
  const frd = item.fair_rental_days;
  return pud > 14 || pud > frd * 0.1;
}

function computePropertyNet(item: EItem): number {
  const ownershipFraction = (item.ownership_percent ?? 100) / 100;

  // §280A(g): rented < 15 days — exclude income AND disallow all deductions
  if (isVacationHomeExcluded(item)) {
    return 0;
  }

  const grossIncome = ((item.rent_income ?? 0) + (item.royalties_income ?? 0)) * ownershipFraction;
  const expenses = computeExpenses(item) * ownershipFraction;

  if (isVacationHomeLimited(item)) {
    // §280A(c)(5): expenses limited to gross rental income (no loss)
    const net = grossIncome - expenses;
    return Math.max(0, net);
  }

  return grossIncome - expenses;
}

function isPassive(item: EItem): boolean {
  return item.activity_type === "A" || item.activity_type === "B";
}

// ─── Routing helpers ─────────────────────────────────────────────────────────

function schedule1Output(items: EItems): NodeOutput[] {
  const totalNet = items.reduce((sum, item) => sum + computePropertyNet(item), 0);
  return [{ nodeType: schedule1.nodeType, fields: { line5_schedule_e: totalNet } }];
}

function form8582Outputs(items: EItems): NodeOutput[] {
  // Route to form8582 when any item is passive (A/B) AND has a net loss OR prior unallowed losses
  const passiveItems = items.filter(isPassive);
  if (passiveItems.length === 0) return [];

  const hasTrigger = passiveItems.some((item) => {
    const net = computePropertyNet(item);
    return net < 0 ||
      (item.prior_unallowed_passive_operating ?? 0) > 0 ||
      (item.prior_unallowed_passive_4797_part1 ?? 0) > 0 ||
      (item.prior_unallowed_passive_4797_part2 ?? 0) > 0;
  });

  if (!hasTrigger) return [];

  const f8582Input: Record<string, unknown> = {};
  const currentNetLoss = passiveItems
    .map(computePropertyNet)
    .filter((n) => n < 0)
    .reduce((sum, n) => sum + Math.abs(n), 0);
  const currentNetIncome = passiveItems
    .map(computePropertyNet)
    .filter((n) => n > 0)
    .reduce((sum, n) => sum + n, 0);
  const priorUnallowed = passiveItems.reduce(
    (sum, item) =>
      sum +
      (item.prior_unallowed_passive_operating ?? 0) +
      (item.prior_unallowed_passive_4797_part1 ?? 0) +
      (item.prior_unallowed_passive_4797_part2 ?? 0),
    0,
  );

  if (currentNetIncome > 0) f8582Input.current_income = currentNetIncome;
  if (currentNetLoss > 0) f8582Input.current_loss = currentNetLoss;
  if (priorUnallowed > 0) f8582Input.prior_unallowed = priorUnallowed;

  // Activity type breakdown
  const hasTypeA = passiveItems.some((i) => i.activity_type === "A");
  const hasTypeB = passiveItems.some((i) => i.activity_type === "B");
  if (hasTypeA) f8582Input.has_active_rental = true;
  if (hasTypeB) f8582Input.has_other_passive = true;

  return [{ nodeType: form8582.nodeType, fields: f8582Input }];
}

function form6198Outputs(items: EItems): NodeOutput[] {
  const atRiskItems = items.filter(
    (item) =>
      item.some_investment_not_at_risk === true ||
      (item.prior_unallowed_at_risk ?? 0) > 0,
  );
  if (atRiskItems.length === 0) return [];

  const f6198Input: Record<string, number> = {};
  const totalPriorAtRisk = atRiskItems.reduce(
    (sum, item) => sum + (item.prior_unallowed_at_risk ?? 0),
    0,
  );
  if (totalPriorAtRisk > 0) f6198Input.prior_unallowed = totalPriorAtRisk;

  return [{ nodeType: form6198.nodeType, fields: f6198Input }];
}

function form8960Outputs(items: EItems): NodeOutput[] {
  const niitItems = items.filter((item) => item.carry_to_8960 === true);
  if (niitItems.length === 0) return [];

  const totalNet = niitItems.reduce((sum, item) => sum + computePropertyNet(item), 0);
  return [{ nodeType: form8960.nodeType, fields: { line4b_rental_net: totalNet } }];
}

function scheduleAOutputs(items: EItems): NodeOutput[] {
  const mixedUseItems = items.filter(
    (item) => item.main_home_or_second_home === true && (item.occupancy_percent ?? 0) > 0,
  );
  if (mixedUseItems.length === 0) return [];

  const totalPersonalInterest = mixedUseItems.reduce((sum, item) => {
    const personalFraction = (item.occupancy_percent ?? 0) / 100;
    return sum + (item.expense_mortgage_interest ?? 0) * personalFraction;
  }, 0);
  const totalPersonalTaxes = mixedUseItems.reduce((sum, item) => {
    const personalFraction = (item.occupancy_percent ?? 0) / 100;
    return sum + (item.expense_taxes ?? 0) * personalFraction;
  }, 0);

  const input: Record<string, number> = {};
  if (totalPersonalInterest > 0) input.mortgage_interest = totalPersonalInterest;
  if (totalPersonalTaxes > 0) input.real_estate_taxes = totalPersonalTaxes;

  return [{ nodeType: schedule_a.nodeType, fields: input }];
}

function form8995Outputs(items: EItems): NodeOutput[] {
  const qbiItems = items.filter((item) => item.qbi_trade_or_business === "Y");
  if (qbiItems.length === 0) return [];

  const f8995Input: Record<string, unknown> = {};

  // If any item has override, use the first override found; otherwise compute QBI
  const overrideItem = qbiItems.find((item) => item.qbi_override !== undefined);
  if (overrideItem?.qbi_override !== undefined) {
    f8995Input.qbi = overrideItem.qbi_override;
  } else {
    const totalQbi = qbiItems.reduce((sum, item) => sum + computePropertyNet(item), 0);
    f8995Input.qbi = totalQbi;
  }

  const totalW2Wages = qbiItems.reduce((sum, item) => sum + (item.qbi_w2_wages ?? 0), 0);
  if (totalW2Wages > 0) f8995Input.w2_wages = totalW2Wages;

  const totalUbia = qbiItems.reduce((sum, item) => sum + (item.qbi_unadjusted_basis ?? 0), 0);
  if (totalUbia > 0) f8995Input.unadjusted_basis = totalUbia;

  // Pass safe harbor election if present
  const safeHarborItem = qbiItems.find((item) => item.qbi_safe_harbor !== undefined);
  if (safeHarborItem?.qbi_safe_harbor) f8995Input.safe_harbor = safeHarborItem.qbi_safe_harbor;

  return [{ nodeType: form8995.nodeType, fields: f8995Input }];
}

function form4797Outputs(items: EItems): NodeOutput[] {
  const disposedItems = items.filter((item) => item.disposed_of === true);
  if (disposedItems.length === 0) return [];

  return [{ nodeType: form4797.nodeType, fields: { disposed_properties: disposedItems.length } }];
}

function form6251Outputs(items: EItems): NodeOutput[] {
  const totalAmtAdj = items.reduce(
    (sum, item) => sum + (item.expense_depreciation_amt ?? 0),
    0,
  );
  if (totalAmtAdj === 0) return [];

  return [{ nodeType: form6251.nodeType, fields: { line2l_rental_depreciation_adj: totalAmtAdj } }];
}

function form4562Outputs(items: EItems): NodeOutput[] {
  // §179 is only available for activity_type=C (real estate professional)
  const s179Items = items.filter(
    (item) => item.activity_type === "C" && (item.section_179 ?? 0) > 0,
  );
  if (s179Items.length === 0) return [];

  const totalS179 = s179Items.reduce((sum, item) => sum + (item.section_179 ?? 0), 0);
  return [{ nodeType: form4562.nodeType, fields: { section_179_deduction: totalS179 } }];
}

function form8990Outputs(items: EItems): NodeOutput[] {
  const totalMortgage = items.reduce(
    (sum, item) => sum + (item.disallowed_mortgage_interest_8990 ?? 0),
    0,
  );
  const totalOther = items.reduce(
    (sum, item) => sum + (item.disallowed_other_interest_8990 ?? 0),
    0,
  );
  if (totalMortgage === 0 && totalOther === 0) return [];

  const input: Record<string, number> = {};
  if (totalMortgage > 0) input.disallowed_mortgage_interest_carryforward = totalMortgage;
  if (totalOther > 0) input.disallowed_other_interest_carryforward = totalOther;

  return [{ nodeType: form8990.nodeType, fields: input }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    form8582,
    form6198,
    form8960,
    form8995,
    form4797,
    form6251,
    schedule_a,
    form8990,
    form4562,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { schedule_es } = parsed;

    if (schedule_es.length === 0) {
      return { outputs: [] };
    }

    for (const item of schedule_es) {
      validateItem(item);
    }

    const outputs: NodeOutput[] = [
      ...schedule1Output(schedule_es),
      ...form8582Outputs(schedule_es),
      ...form6198Outputs(schedule_es),
      ...form8960Outputs(schedule_es),
      ...scheduleAOutputs(schedule_es),
      ...form8995Outputs(schedule_es),
      ...form4797Outputs(schedule_es),
      ...form6251Outputs(schedule_es),
      ...form4562Outputs(schedule_es),
      ...form8990Outputs(schedule_es),
    ];

    return { outputs };
  }
}

export const scheduleE = new ScheduleENode();
