import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import { form8582 } from "../../intermediate/forms/form8582/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import {
  form4797,
  passivePropertySaleSchema,
} from "../../intermediate/forms/form4797/index.ts";
import { form4562 } from "../../intermediate/forms/form4562/index.ts";
import { form8990 } from "../../intermediate/forms/form8990/index.ts";
import { TSJ, tsjSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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
  // Dated sales of property in this rental activity. Form 4797 calculates
  // the gain from these same canonical rows and Form 8582 allocates its PAL.
  passive_property_sales: z.array(passivePropertySaleSchema).optional(),
  carry_to_8960: z.boolean().optional(),
  main_home_or_second_home: z.boolean().optional(),
  occupancy_percent: z.number().min(0).max(100).optional(),

  // --- Passive activity carryovers ---
  prior_unallowed_passive_operating: z.number().nonnegative().optional(),
  // True only when the taxpayer actively participated in every year that
  // produced this prior operating loss, as required for Form 8582 Part IV.
  prior_passive_losses_active_when_incurred: z.boolean().optional(),
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
  schedule_es: z.array(itemSchema).optional().default([]),
  // Passthrough mortgage interest from 1098 Box 1 routed to Schedule E
  mortgage_interest: z.number().nonnegative().optional(),
  // Auto/travel expense from auto_expense worksheet (AUTO screen)
  expense_auto_travel: z.number().nonnegative().optional(),
  // Depletion deduction from the depletion worksheet (DEPL screen)
  // Routes depletion node output into Schedule E depletion expense
  expense_depletion: z.number().nonnegative().optional(),
  // Passthrough rental income from f1099m box1_rents routed to schedule_e
  rental_income: z.number().nonnegative().optional(),
  // Passthrough royalty income from f1099m box2_royalties routed to schedule_e
  royalty_income: z.number().nonnegative().optional(),
  // Form 4835 totals flow through Schedule E page 2 before Schedule 1.
  farm_rental_gross: z.number().nonnegative().optional(),
  farm_rental_net: z.number().optional(),
  farm_rental_activities: z.array(z.object({
    name: z.string().min(1),
    current_net: z.number(),
    actively_participated: z.boolean(),
    prior_unallowed_operating: z.number().int().nonnegative().optional(),
    prior_active_participation: z.boolean().optional(),
  })).optional(),
});

type EItem = z.infer<typeof itemSchema>;
type EItems = EItem[];
type FarmActivity = NonNullable<
  z.infer<typeof inputSchema>["farm_rental_activities"]
>[number];

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
  if (
    item.activity_type === "A" &&
    (item.prior_unallowed_passive_operating ?? 0) > 0 &&
    item.prior_passive_losses_active_when_incurred === undefined
  ) {
    throw new Error(
      "Schedule E prior passive operating loss needs prior-year active participation answer",
    );
  }
}

// ─── Per-Property Calculation ─────────────────────────────────────────────────

export function computeExpenses(item: EItem): number {
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

export function isVacationHomeExcluded(item: EItem): boolean {
  if (item.property_type === 6) return false; // Royalties are not home rentals.
  // IRC §280A(g): exclusion applies only when the unit was used as a home.
  return item.fair_rental_days < 15 && isVacationHomeLimited(item);
}

export function isVacationHomeLimited(item: EItem): boolean {
  if (item.property_type === 6) return false;
  // IRC §280A(d)(1): personal use exceeds the GREATER of 14 days or 10%.
  const pud = item.personal_use_days;
  const frd = item.fair_rental_days;
  return pud > Math.max(14, frd * 0.1);
}

export function computePropertyNet(item: EItem): number {
  const ownershipFraction = (item.ownership_percent ?? 100) / 100;

  // §280A(g): rented < 15 days — exclude income AND disallow all deductions
  if (isVacationHomeExcluded(item)) {
    return 0;
  }

  const grossIncome = ((item.rent_income ?? 0) + (item.royalties_income ?? 0)) *
    ownershipFraction;
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

function passiveItems(items: EItems): EItems {
  return items.filter(isPassive);
}

// Current-year net loss from passive activities (positive amount).
function passiveCurrentLoss(items: EItems): number {
  return passiveItems(items)
    .map(computePropertyNet)
    .filter((n) => n < 0)
    .reduce((sum, n) => sum + Math.abs(n), 0);
}

// Current-year net income from passive activities.
function passiveCurrentIncome(items: EItems): number {
  return passiveItems(items)
    .map(computePropertyNet)
    .filter((n) => n > 0)
    .reduce((sum, n) => sum + n, 0);
}

// IRC §469(i) reaches rental real estate only, so the type A loss is tracked apart
// from other passive losses (limited partnerships, type B activities).
function activeRentalCurrentLoss(items: EItems): number {
  return items
    .filter((item) => item.activity_type === "A")
    .map(computePropertyNet)
    .filter((n) => n < 0)
    .reduce((sum, n) => sum + Math.abs(n), 0);
}

function activeRentalCurrentIncome(items: EItems): number {
  return items
    .filter((item) => item.activity_type === "A")
    .map(computePropertyNet)
    .filter((net) => net > 0)
    .reduce((sum, net) => sum + net, 0);
}

function eligibleActiveRentalPriorLoss(items: EItems): number {
  return items
    .filter((item) =>
      item.activity_type === "A" &&
      item.prior_passive_losses_active_when_incurred === true
    )
    .reduce(
      (sum, item) =>
        sum + (item.prior_unallowed_passive_operating ?? 0) +
        (item.prior_unallowed_passive_4797_part1 ?? 0) +
        (item.prior_unallowed_passive_4797_part2 ?? 0),
      0,
    );
}

function priorUnallowedPassive(items: EItems): number {
  return passiveItems(items).reduce(
    (sum, item) =>
      sum +
      (item.prior_unallowed_passive_operating ?? 0) +
      (item.prior_unallowed_passive_4797_part1 ?? 0) +
      (item.prior_unallowed_passive_4797_part2 ?? 0),
    0,
  );
}

// Form 8582 is needed when a passive activity has a net loss or a prior unallowed loss.
function farmCurrentLoss(farms: readonly FarmActivity[]): number {
  return farms.reduce((sum, farm) => sum + Math.max(0, -farm.current_net), 0);
}

function farmCurrentIncome(farms: readonly FarmActivity[]): number {
  return farms.reduce((sum, farm) => sum + Math.max(0, farm.current_net), 0);
}

function hasPassiveLoss(
  items: EItems,
  farms: readonly FarmActivity[],
): boolean {
  return passiveCurrentLoss(items) + farmCurrentLoss(farms) > 0 ||
    priorUnallowedPassive(items) > 0 ||
    farms.some((farm) => (farm.prior_unallowed_operating ?? 0) > 0);
}

function form8582Outputs(
  items: EItems,
  farms: readonly FarmActivity[],
): NodeOutput[] {
  if (!hasPassiveLoss(items, farms)) return [];

  const f8582Input: Partial<z.infer<typeof form8582["inputSchema"]>> = {};
  const currentNetLoss = passiveCurrentLoss(items) + farmCurrentLoss(farms);
  const currentNetIncome = passiveCurrentIncome(items) +
    farmCurrentIncome(farms);
  const priorUnallowed = priorUnallowedPassive(items) +
    farms.reduce((sum, farm) => sum + (farm.prior_unallowed_operating ?? 0), 0);
  const rentalLoss = activeRentalCurrentLoss(items) +
    farmCurrentLoss(farms.filter((farm) => farm.actively_participated));
  const rentalIncome = activeRentalCurrentIncome(items) +
    farmCurrentIncome(farms.filter((farm) => farm.actively_participated));
  const eligibleRentalPriorLoss = eligibleActiveRentalPriorLoss(items) +
    farms.filter((farm) =>
      farm.actively_participated && farm.prior_active_participation === true
    ).reduce((sum, farm) => sum + (farm.prior_unallowed_operating ?? 0), 0);

  f8582Input.activities = [
    ...passiveItems(items).filter((item) =>
      computePropertyNet(item) !== 0 ||
      (item.prior_unallowed_passive_operating ?? 0) > 0 ||
      (item.prior_unallowed_passive_4797_part1 ?? 0) > 0 ||
      (item.prior_unallowed_passive_4797_part2 ?? 0) > 0
    ).map((item) => ({
      name: item.property_description,
      activity_type: item.activity_type as "A" | "B",
      property_type: item.property_type,
      reporting_form: "schedule_e" as const,
      current_net: computePropertyNet(item),
      prior_unallowed_operating: item.prior_unallowed_passive_operating ?? 0,
      prior_active_participation:
        item.prior_passive_losses_active_when_incurred,
      prior_unallowed_4797_part1: item.prior_unallowed_passive_4797_part1 ?? 0,
      prior_unallowed_4797_part2: item.prior_unallowed_passive_4797_part2 ?? 0,
    })),
    ...farms.filter((farm) =>
      farm.current_net !== 0 || (farm.prior_unallowed_operating ?? 0) > 0
    ).map((farm) => ({
      name: farm.name,
      activity_type: farm.actively_participated ? "A" as const : "B" as const,
      property_type: 5,
      reporting_form: "form4835" as const,
      current_net: farm.current_net,
      prior_unallowed_operating: farm.prior_unallowed_operating ?? 0,
      prior_active_participation: farm.prior_active_participation,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
    })),
  ];

  if (currentNetIncome > 0) f8582Input.current_income = currentNetIncome;
  if (currentNetLoss > 0) f8582Input.current_loss = currentNetLoss;
  if (priorUnallowed > 0) f8582Input.prior_unallowed = priorUnallowed;
  if (rentalLoss > 0) f8582Input.rental_current_loss = rentalLoss;
  if (
    currentNetIncome > 0 &&
    f8582Input.activities.some((activity) => activity.activity_type === "A")
  ) {
    f8582Input.rental_current_income = rentalIncome;
  }
  if (eligibleRentalPriorLoss > 0) {
    f8582Input.rental_prior_eligible_loss = eligibleRentalPriorLoss;
  }

  // Activity type breakdown
  const hasTypeA = f8582Input.activities?.some((activity) =>
    activity.activity_type === "A"
  );
  const hasTypeB = f8582Input.activities?.some((activity) =>
    activity.activity_type === "B"
  );
  if (hasTypeA) {
    f8582Input.has_active_rental = true;
    // Activity type A is active rental real estate — the taxpayer participated.
    f8582Input.active_participation = true;
  }
  if (
    hasTypeB ||
    f8582Input.activities.some((activity) =>
      activity.activity_type === "A" &&
      activity.prior_unallowed_operating > 0 &&
      activity.prior_active_participation === false
    )
  ) f8582Input.has_other_passive = true;

  return [
    output(
      form8582,
      f8582Input as AtLeastOne<z.infer<typeof form8582["inputSchema"]>>,
    ),
  ];
}

// The same passive figures go to agi_aggregator, which owns modified AGI and so is
// the only node that can apply the §469 limit before AGI is read downstream.
function palFields(
  items: EItems,
  farms: readonly FarmActivity[],
): Partial<z.infer<typeof agi_aggregator["inputSchema"]>> {
  if (!hasPassiveLoss(items, farms)) return {};

  const fields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> = {
    pal_current_loss: passiveCurrentLoss(items) + farmCurrentLoss(farms),
  };

  const currentIncome = passiveCurrentIncome(items) + farmCurrentIncome(farms);
  const priorUnallowed = priorUnallowedPassive(items) +
    farms.reduce((sum, farm) => sum + (farm.prior_unallowed_operating ?? 0), 0);
  const rentalLoss = activeRentalCurrentLoss(items) +
    farmCurrentLoss(farms.filter((farm) => farm.actively_participated));
  const rentalIncome = activeRentalCurrentIncome(items) +
    farmCurrentIncome(farms.filter((farm) => farm.actively_participated));
  const eligibleRentalPriorLoss = eligibleActiveRentalPriorLoss(items) +
    farms.filter((farm) =>
      farm.actively_participated && farm.prior_active_participation === true
    ).reduce((sum, farm) => sum + (farm.prior_unallowed_operating ?? 0), 0);

  if (currentIncome > 0) fields.pal_current_income = currentIncome;
  if (currentIncome > 0 && rentalLoss + eligibleRentalPriorLoss > 0) {
    fields.pal_rental_income = rentalIncome;
  }
  if (priorUnallowed > 0) fields.pal_prior_unallowed = priorUnallowed;
  if (rentalLoss + eligibleRentalPriorLoss > 0) {
    fields.pal_rental_loss = rentalLoss + eligibleRentalPriorLoss;
  }
  if (rentalLoss + eligibleRentalPriorLoss > 0) {
    fields.pal_active_participation = true;
  }

  return fields;
}

function form8960Outputs(items: EItems): NodeOutput[] {
  const niitItems = items.filter((item) => item.carry_to_8960 === true);
  if (niitItems.length === 0) return [];

  const totalNet = niitItems.reduce(
    (sum, item) => sum + computePropertyNet(item),
    0,
  );
  return [output(form8960, { line4b_rental_net: totalNet })];
}

function scheduleAOutputs(items: EItems): NodeOutput[] {
  const mixedUseItems = items.filter(
    (item) =>
      item.main_home_or_second_home === true &&
      (item.occupancy_percent ?? 0) > 0,
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

  const input: Partial<z.infer<typeof schedule_a["inputSchema"]>> = {};
  if (totalPersonalInterest > 0) {
    input.line_8a_mortgage_interest_1098 = totalPersonalInterest;
  }
  if (totalPersonalTaxes > 0) {
    input.line_5b_real_estate_tax = totalPersonalTaxes;
  }

  if (Object.keys(input).length === 0) return [];
  return [
    output(
      schedule_a,
      input as AtLeastOne<z.infer<typeof schedule_a["inputSchema"]>>,
    ),
  ];
}

function form8995Outputs(items: EItems): NodeOutput[] {
  const qbiItems = items.filter((item) => item.qbi_trade_or_business === "Y");
  if (qbiItems.length === 0) return [];

  const f8995Input: Partial<z.infer<typeof form8995["inputSchema"]>> = {};

  const qbiAmount = (item: EItem) =>
    item.qbi_override ?? computePropertyNet(item);
  const nonSstbItems = qbiItems.filter((item) =>
    item.qbi_specified_service !== true
  );
  const sstbItems = qbiItems.filter((item) =>
    item.qbi_specified_service === true
  );

  f8995Input.qbi = nonSstbItems.reduce((sum, item) => sum + qbiAmount(item), 0);
  f8995Input.sstb_qbi = sstbItems.reduce(
    (sum, item) => sum + qbiAmount(item),
    0,
  );
  f8995Input.w2_wages = nonSstbItems.reduce(
    (sum, item) => sum + (item.qbi_w2_wages ?? 0),
    0,
  );
  f8995Input.sstb_w2_wages = sstbItems.reduce(
    (sum, item) => sum + (item.qbi_w2_wages ?? 0),
    0,
  );
  f8995Input.unadjusted_basis = nonSstbItems.reduce(
    (sum, item) => sum + (item.qbi_unadjusted_basis ?? 0),
    0,
  );
  f8995Input.sstb_unadjusted_basis = sstbItems.reduce(
    (sum, item) => sum + (item.qbi_unadjusted_basis ?? 0),
    0,
  );

  return [
    output(
      form8995,
      f8995Input as AtLeastOne<z.infer<typeof form8995["inputSchema"]>>,
    ),
  ];
}

function form4797Outputs(
  items: EItems,
  farms: readonly FarmActivity[],
): NodeOutput[] {
  const disposedItems = items.filter((item) => item.disposed_of === true);
  const sales = items.flatMap((item) => {
    if (!item.passive_property_sales?.length) return [];
    if (
      item.disposed_of !== true ||
      (item.activity_type !== "A" && item.activity_type !== "B") ||
      item.passive_property_sales.some((sale) =>
        sale.activity_name !== item.property_description
      )
    ) {
      throw new Error(
        "Schedule E passive property sales require a disposed property in the same named A or B activity",
      );
    }
    return item.passive_property_sales;
  });
  if (
    sales.length > 0 &&
    new Set(items.map((item) => item.property_description)).size !==
      items.length
  ) {
    throw new Error(
      "Schedule E passive property sales require unique activity names",
    );
  }
  if (disposedItems.length === 0) return [];
  const passiveLedger = form8582Outputs(items, farms)[0]?.fields;
  const activities = passiveLedger?.activities as
    | z.infer<typeof form8582.inputSchema>["activities"]
    | undefined;
  return [output(form4797, {
    disposed_properties: disposedItems.length,
    passive_disposed_activity_names: disposedItems.map((item) =>
      item.property_description
    ),
    ...(sales.length ? { passive_property_sales: sales } : {}),
    ...(activities ? { passive_activity_sources: activities } : {}),
  })];
}

function form6251Outputs(items: EItems): NodeOutput[] {
  const totalAmtAdj = items.reduce(
    (sum, item) => sum + (item.expense_depreciation_amt ?? 0),
    0,
  );
  if (totalAmtAdj === 0) return [];

  return [output(form6251, { depreciation_adjustment: totalAmtAdj })];
}

function form4562Outputs(items: EItems): NodeOutput[] {
  // §179 is only available for activity_type=C (real estate professional)
  const s179Items = items.filter(
    (item) => item.activity_type === "C" && (item.section_179 ?? 0) > 0,
  );
  if (s179Items.length === 0) return [];

  const totalS179 = s179Items.reduce(
    (sum, item) => sum + (item.section_179 ?? 0),
    0,
  );
  return [output(form4562, { section_179_deduction: totalS179 })];
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

  const input: Partial<z.infer<typeof form8990["inputSchema"]>> = {};
  if (totalMortgage > 0) {
    input.disallowed_mortgage_interest_carryforward = totalMortgage;
  }
  if (totalOther > 0) input.disallowed_other_interest_carryforward = totalOther;

  return [
    output(
      form8990,
      input as AtLeastOne<z.infer<typeof form8990["inputSchema"]>>,
    ),
  ];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    form8582,
    form8960,
    form8995,
    form4797,
    form6251,
    schedule_a,
    form8990,
    form4562,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { schedule_es, rental_income, royalty_income, farm_rental_net } =
      parsed;
    const farms = parsed.farm_rental_activities ?? [];
    if (
      farms.length > 0 &&
      farms.reduce((sum, farm) => sum + farm.current_net, 0) !== farm_rental_net
    ) {
      throw new Error(
        "Schedule E farm activity amounts do not match Form 4835 totals",
      );
    }
    if (
      farm_rental_net !== undefined && farm_rental_net < 0 && farms.length === 0
    ) {
      throw new Error("Schedule E farm rental loss needs Form 4835 activities");
    }

    // Passthrough rental/royalty from f1099m — only used when no property items exist.
    // When schedule_es items are present, rent_income on the property already captures
    // the 1099-MISC amount (same income, just reported on both documents).
    const passthroughRental = schedule_es.length === 0
      ? (rental_income ?? 0)
      : 0;
    const passthroughRoyalty = schedule_es.length === 0
      ? (royalty_income ?? 0)
      : 0;

    if (
      schedule_es.length === 0 && passthroughRental === 0 &&
      passthroughRoyalty === 0 &&
      farm_rental_net === undefined
    ) {
      return { outputs: [] };
    }

    for (const item of schedule_es) {
      validateItem(item);
      if (
        item.some_investment_not_at_risk === true ||
        (item.prior_unallowed_at_risk ?? 0) > 0
      ) {
        throw new Error(
          "Schedule E at-risk activity needs a per-property Form 6198 computation",
        );
      }
    }

    const propertyNet = schedule_es.reduce(
      (sum, item) => sum + computePropertyNet(item),
      0,
    );
    const totalNet = propertyNet + passthroughRental + passthroughRoyalty +
      (farm_rental_net ?? 0);
    // Schedule E line 26 carries income plus DEDUCTIBLE losses: a passive loss is held
    // back here and the part Form 8582 allows comes back on Schedule 1 (IRC §469(a)).
    const deductibleNet = totalNet + passiveCurrentLoss(schedule_es) +
      farmCurrentLoss(farms);
    const outputs: NodeOutput[] = [
      output(schedule1, { line5_schedule_e: deductibleNet }),
      this.outputNodes.output(agi_aggregator, {
        line5_schedule_e: deductibleNet,
        ...palFields(schedule_es, farms),
      }),
      ...form8582Outputs(schedule_es, farms),
      ...form8960Outputs(schedule_es),
      ...scheduleAOutputs(schedule_es),
      ...form8995Outputs(schedule_es),
      ...form4797Outputs(schedule_es, farms),
      ...form6251Outputs(schedule_es),
      ...form4562Outputs(schedule_es),
      ...form8990Outputs(schedule_es),
    ];

    return { outputs };
  }
}

export const scheduleE = new ScheduleENode();
