import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { f3800 } from "../f3800/index.ts";
import { FilingStatus, filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Array input node — one entry per qualifying clean vehicle.
// Computes the clean vehicle credit for each vehicle (IRC §30D, §25E, §45W).

// ─── TY2025 Constants ────────────────────────────────────────────────────────

const NEW_VEHICLE_MAX_CREDIT = 7_500;
const USED_VEHICLE_MAX_CREDIT = 4_000;
const USED_VEHICLE_RATE = 0.30;

const NEW_INCOME_LIMIT_MFJ = 300_000;
const NEW_INCOME_LIMIT_HOH = 225_000;
const NEW_INCOME_LIMIT_SINGLE = 150_000;
const USED_INCOME_LIMIT_MFJ = 150_000;
const USED_INCOME_LIMIT_HOH = 112_500;
const USED_INCOME_LIMIT_SINGLE = 75_000;
const LAST_ELIGIBLE_ACQUISITION_DATE = "2025-09-30";

const MSRP_CAP_SUV_VAN_TRUCK = 80_000;
const MSRP_CAP_OTHER = 55_000;

const USED_VEHICLE_PRICE_CAP = 25_000;
const COMMERCIAL_LIGHT_VEHICLE_CREDIT_CAP = 7_500;
const COMMERCIAL_HEAVY_VEHICLE_CREDIT_CAP = 40_000;

// ─── Schema ──────────────────────────────────────────────────────────────────

const businessUseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("mileage"),
    // For conversions, these miles cover only the months in business use.
    business_miles: z.number().positive(),
    commuting_miles: z.number().nonnegative(),
    total_miles: z.number().positive(),
    months_in_business_use: z.number().int().min(1).max(12),
  }).strict(),
  z.object({
    kind: z.literal("employee_fringe"),
    personal_use_handling: z.enum(["taxable_withholding", "reimbursed"]),
    months_in_business_use: z.number().int().min(1).max(12),
  }).strict(),
]).superRefine((use, ctx) => {
  if (
    use.kind === "mileage" &&
    use.business_miles + use.commuting_miles > use.total_miles
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["total_miles"],
      message: "Business and commuting miles cannot exceed total miles",
    });
  }
});

export const itemSchema = z.object({
  vehicle_description: z.string().optional(),
  vin: z.string().optional(),
  vehicle_year: z.number().int().min(1900).max(2100).optional(),
  vehicle_make: z.string().min(1).optional(),
  vehicle_model: z.string().min(1).optional(),
  placed_in_service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // The date the binding contract and payment made the vehicle "acquired".
  acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  seller_report_received: z.boolean().optional(),
  transferred_to_dealer: z.boolean().optional(),
  transferred_amount: z.number().nonnegative().optional(),
  resold_within_30_days: z.boolean().optional(),
  acquired_for_use_not_resale: z.boolean().optional(),
  claimed_as_dependent: z.boolean().optional(),
  claimed_prev_owned_credit_last_3_years: z.boolean().optional(),
  previously_owned_first_eligible_transfer: z.boolean().optional(),
  purchased_from_dealer: z.boolean().optional(),

  credit_kind: z.enum([
    "new_clean_vehicle",
    "previously_owned_clean_vehicle",
    "qualified_commercial_clean_vehicle",
  ]),
  credit_amount: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  msrp: z.number().nonnegative().optional(),
  vehicle_type: z.enum(["suv_van_truck", "other"]).optional(),
  business_use: businessUseSchema.optional(),
  business_credit_subject_to_passive_activity_limit: z.boolean().optional(),
  commercial: z.object({
    owned_by_taxpayer: z.boolean(),
    qualified_manufacturer: z.boolean(),
    original_use_begins_with_taxpayer: z.boolean(),
    claimed_new_clean_credit_for_vin: z.boolean(),
    primarily_used_in_us: z.boolean(),
    subject_to_depreciation: z.boolean(),
    vehicle_design: z.enum(["street_vehicle", "mobile_machinery"]),
    powered_partly_by_gas_or_diesel: z.boolean(),
    gvwr_pounds: z.number().positive(),
    cost_or_other_basis: z.number().nonnegative(),
    section179_expense_deduction: z.number().nonnegative(),
    incremental_cost: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("comparable_vehicle"),
        purchase_price: z.number().nonnegative(),
        comparable_vehicle_price: z.number().nonnegative(),
        comparable_vehicle_description: z.string().min(1),
        comparable_in_size_and_use: z.boolean(),
      }).strict(),
      z.object({
        kind: z.literal("2025_light_street_safe_harbor"),
        is_compact_car_phev: z.boolean(),
      }).strict(),
    ]),
    propulsion: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("plug_in_electric"),
        battery_capacity_kwh: z.number().positive(),
        externally_rechargeable: z.boolean(),
      }).strict(),
      z.object({ kind: z.literal("fuel_cell") }).strict(),
    ]),
  }).strict().optional(),
}).strict();

export const magiYearSchema = z.object({
  adjusted_gross_income: z.number(),
  excluded_puerto_rico_income: z.number().nonnegative().optional(),
  foreign_earned_income_exclusion: z.number().nonnegative().optional(),
  foreign_housing_deduction: z.number().nonnegative().optional(),
  excluded_american_samoa_income: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  current_year_magi: magiYearSchema,
  prior_year_magi: magiYearSchema,
  filing_status: filingStatusSchema,
  prior_year_filing_status: filingStatusSchema,
  f8936s: z.array(itemSchema),
}).superRefine((input, ctx) => {
  const vins = new Set<string>();
  for (const [index, vehicle] of input.f8936s.entries()) {
    if (!vehicle.vin) continue;
    if (vins.has(vehicle.vin)) {
      ctx.addIssue({
        code: "custom",
        path: ["f8936s", index, "vin"],
        message: "A VIN can appear only once on Form 8936",
      });
    }
    vins.add(vehicle.vin);
  }
});

export type F8936Item = z.infer<typeof itemSchema>;
export type F8936Input = z.infer<typeof inputSchema>;
export type F8936MagiYear = z.infer<typeof magiYearSchema>;

export function businessUsePercentage(item: F8936Item): number {
  const use = item.business_use;
  if (!use) return 0;
  const annualPortion = use.months_in_business_use / 12;
  return use.kind === "employee_fringe"
    ? annualPortion
    : use.business_miles / use.total_miles * annualPortion;
}

export function modifiedAgi(year: F8936MagiYear): number {
  return year.adjusted_gross_income +
    (year.excluded_puerto_rico_income ?? 0) +
    (year.foreign_earned_income_exclusion ?? 0) +
    (year.foreign_housing_deduction ?? 0) +
    (year.excluded_american_samoa_income ?? 0);
}

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

export function incomeLimit(status: FilingStatus, used: boolean): number {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return used ? USED_INCOME_LIMIT_MFJ : NEW_INCOME_LIMIT_MFJ;
  }
  if (status === FilingStatus.HOH) {
    return used ? USED_INCOME_LIMIT_HOH : NEW_INCOME_LIMIT_HOH;
  }
  return used ? USED_INCOME_LIMIT_SINGLE : NEW_INCOME_LIMIT_SINGLE;
}

function exceedsIncomeLimit(input: F8936Input, used: boolean): boolean {
  return modifiedAgi(input.current_year_magi) >
      incomeLimit(input.filing_status, used) &&
    modifiedAgi(input.prior_year_magi) >
      incomeLimit(input.prior_year_filing_status, used);
}

function acquiredAfterCreditCutoff(item: F8936Item): boolean {
  if (item.acquisition_date === undefined) {
    throw new Error(
      "f8936: acquisition date is required to determine credit eligibility",
    );
  }
  if (!hasValidDate(item.acquisition_date)) {
    throw new Error("f8936: acquisition date must be a valid ISO date");
  }
  return item.acquisition_date > LAST_ELIGIBLE_ACQUISITION_DATE;
}

function hasValidDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function requireVehicleFacts(item: F8936Item): void {
  if (
    !item.vin || !/^[A-HJ-NPR-Z0-9]{17}$/.test(item.vin) ||
    item.vehicle_year === undefined ||
    !item.vehicle_make || !item.vehicle_model
  ) {
    throw new Error(
      "f8936: a valid VIN, vehicle year, make, and model are required",
    );
  }
  if (
    !item.placed_in_service_date ||
    !hasValidDate(item.placed_in_service_date) ||
    !item.placed_in_service_date.startsWith("2025-")
  ) {
    throw new Error(
      "f8936: vehicle must have a valid 2025 placed-in-service date",
    );
  }
  if (
    item.credit_kind !== "qualified_commercial_clean_vehicle" &&
    item.seller_report_received !== true
  ) {
    throw new Error("f8936: seller report is required");
  }
  if (item.resold_within_30_days === undefined) {
    throw new Error("f8936: 30-day resale answer is required");
  }
  if (item.acquired_for_use_not_resale === undefined) {
    throw new Error("f8936: use-not-resale answer is required");
  }
}

function msrpCap(vehicleType: "suv_van_truck" | "other" | undefined): number {
  return vehicleType === "suv_van_truck"
    ? MSRP_CAP_SUV_VAN_TRUCK
    : MSRP_CAP_OTHER;
}

function newVehicleExceedsMsrpCap(item: F8936Item): boolean {
  if (item.msrp === undefined) return false;
  return item.msrp > msrpCap(item.vehicle_type);
}

function eligibleNewVehicleCredit(item: F8936Item, input: F8936Input): number {
  if (acquiredAfterCreditCutoff(item)) return 0;
  requireVehicleFacts(item);
  if (item.resold_within_30_days || !item.acquired_for_use_not_resale) return 0;
  if (exceedsIncomeLimit(input, false)) return 0;
  if (item.msrp === undefined || item.vehicle_type === undefined) {
    throw new Error("f8936: new vehicle MSRP and vehicle type are required");
  }
  if (newVehicleExceedsMsrpCap(item)) return 0;
  return Math.round(Math.min(item.credit_amount ?? 0, NEW_VEHICLE_MAX_CREDIT));
}

export function computeNewVehicleCreditParts(
  item: F8936Item,
  input: F8936Input,
): { readonly personal: number; readonly business: number } {
  if (item.credit_kind !== "new_clean_vehicle") {
    throw new Error("f8936: business-use split requires a new clean vehicle");
  }
  const total = eligibleNewVehicleCredit(item, input);
  const business = Math.round(total * businessUsePercentage(item));
  return { personal: total - business, business };
}

export type CommercialCreditLines = {
  readonly line19Basis: number;
  readonly line20Section179: number;
  readonly line21AdjustedBasis: number;
  readonly line22BasisPercentage: number;
  readonly line23IncrementalCost: number;
  readonly line24LesserCost: number;
  readonly line25MaximumCredit: number;
  readonly line26Credit: number;
};

/** Schedule A Part V, before the Form 3800 limitation. */
export function computeCommercialVehicleCreditLines(
  item: F8936Item,
): CommercialCreditLines {
  if (item.credit_kind !== "qualified_commercial_clean_vehicle") {
    throw new Error("f8936: commercial credit requires a commercial vehicle");
  }
  if (item.transferred_to_dealer === true) {
    throw new Error("f8936: commercial credit cannot transfer to a dealer");
  }
  const facts = item.commercial;
  if (!facts) {
    throw new Error("f8936: commercial vehicle facts are required");
  }
  if (facts.section179_expense_deduction > facts.cost_or_other_basis) {
    throw new Error("f8936: section 179 expense exceeds vehicle basis");
  }
  if (facts.claimed_new_clean_credit_for_vin) {
    throw new Error(
      "f8936: the same VIN cannot receive both new and commercial credits",
    );
  }
  if (facts.propulsion.kind === "plug_in_electric") {
    const minimum = facts.gvwr_pounds < 14_000 ? 7 : 15;
    if (
      !facts.propulsion.externally_rechargeable ||
      facts.propulsion.battery_capacity_kwh < minimum
    ) {
      throw new Error(
        "f8936: commercial vehicle does not meet plug-in battery requirements",
      );
    }
  }
  if (acquiredAfterCreditCutoff(item)) {
    throw new Error(
      "f8936: commercial vehicle acquired after September 30, 2025",
    );
  }
  if (item.acquisition_date! < "2023-01-01") {
    throw new Error("f8936: commercial vehicle must be acquired after 2022");
  }
  requireVehicleFacts(item);
  const line19Basis = facts.cost_or_other_basis;
  const line20Section179 = facts.section179_expense_deduction;
  const line21AdjustedBasis = line19Basis - line20Section179;
  const line22BasisPercentage = line21AdjustedBasis *
    (facts.powered_partly_by_gas_or_diesel ? 0.15 : 0.30);
  let line23IncrementalCost: number;
  if (facts.incremental_cost.kind === "comparable_vehicle") {
    const comparison = facts.incremental_cost;
    if (comparison.comparable_vehicle_price > comparison.purchase_price) {
      throw new Error(
        "f8936: comparable vehicle price exceeds clean vehicle price",
      );
    }
    if (!comparison.comparable_in_size_and_use) {
      throw new Error(
        "f8936: comparison vehicle must be comparable in size and use",
      );
    }
    line23IncrementalCost = comparison.purchase_price -
      comparison.comparable_vehicle_price;
  } else {
    if (
      facts.vehicle_design !== "street_vehicle" ||
      facts.gvwr_pounds >= 14_000 ||
      facts.incremental_cost.is_compact_car_phev
    ) {
      throw new Error(
        "f8936: 2025 light-street safe harbor does not apply to this vehicle",
      );
    }
    line23IncrementalCost = 7_500;
  }
  const line24LesserCost = Math.min(
    line22BasisPercentage,
    line23IncrementalCost,
  );
  const line25MaximumCredit = facts.gvwr_pounds < 14_000
    ? COMMERCIAL_LIGHT_VEHICLE_CREDIT_CAP
    : COMMERCIAL_HEAVY_VEHICLE_CREDIT_CAP;
  const line26Credit =
    facts.owned_by_taxpayer && facts.qualified_manufacturer &&
      facts.original_use_begins_with_taxpayer && facts.primarily_used_in_us &&
      facts.subject_to_depreciation && item.acquired_for_use_not_resale &&
      !item.resold_within_30_days
      ? Math.round(Math.min(line24LesserCost, line25MaximumCredit))
      : 0;
  return {
    line19Basis,
    line20Section179,
    line21AdjustedBasis,
    line22BasisPercentage,
    line23IncrementalCost,
    line24LesserCost,
    line25MaximumCredit,
    line26Credit,
  };
}

function computeUsedVehicleCredit(item: F8936Item, input: F8936Input): number {
  if (acquiredAfterCreditCutoff(item)) return 0;
  requireVehicleFacts(item);
  if (item.resold_within_30_days || !item.acquired_for_use_not_resale) return 0;
  if (
    item.claimed_as_dependent === undefined ||
    item.claimed_prev_owned_credit_last_3_years === undefined
  ) {
    throw new Error(
      "f8936: dependent and three-year prior-credit answers are required for previously owned vehicles",
    );
  }
  if (
    item.claimed_as_dependent || item.claimed_prev_owned_credit_last_3_years
  ) return 0;
  if (
    item.previously_owned_first_eligible_transfer === undefined ||
    item.purchased_from_dealer === undefined
  ) {
    throw new Error(
      "f8936: dealer purchase and first eligible transfer answers are required",
    );
  }
  if (
    !item.purchased_from_dealer ||
    !item.previously_owned_first_eligible_transfer
  ) return 0;
  if (
    item.vehicle_year !== undefined && item.acquisition_date !== undefined &&
    item.vehicle_year > Number(item.acquisition_date.slice(0, 4)) - 2
  ) return 0;
  if (exceedsIncomeLimit(input, true)) return 0;
  const price = item.sale_price ?? 0;
  if (price > USED_VEHICLE_PRICE_CAP) return 0;
  const credit = Math.min(price * USED_VEHICLE_RATE, USED_VEHICLE_MAX_CREDIT);
  return Math.round(credit);
}

export function computeVehiclePersonalCredit(
  item: F8936Item,
  input: F8936Input,
): number {
  if (item.credit_kind === "qualified_commercial_clean_vehicle") return 0;
  const used = item.credit_kind === "previously_owned_clean_vehicle";
  return used
    ? computeUsedVehicleCredit(item, input)
    : computeNewVehicleCreditParts(item, input).personal;
}

function vehicleOutput(item: F8936Item, input: F8936Input): NodeOutput[] {
  if (item.transferred_to_dealer === undefined) {
    throw new Error("f8936: dealer-transfer answer is required");
  }
  if (item.transferred_to_dealer && item.transferred_amount === undefined) {
    throw new Error(
      "f8936: dealer-transferred credit needs its transferred amount",
    );
  }
  if (item.transferred_to_dealer && item.transferred_amount === 0) {
    throw new Error("f8936: dealer-transferred amount must be positive");
  }
  if (!item.transferred_to_dealer && (item.transferred_amount ?? 0) > 0) {
    throw new Error(
      "f8936: transferred amount requires a dealer-transfer election",
    );
  }
  const used = item.credit_kind === "previously_owned_clean_vehicle";
  if (item.credit_kind === "qualified_commercial_clean_vehicle") {
    if (item.transferred_to_dealer) {
      throw new Error("f8936: commercial credit cannot transfer to a dealer");
    }
    return [];
  }
  const credit = computeVehiclePersonalCredit(item, input);
  // A dealer transfer is reconciled on Form 8936/Schedule A, not claimed
  // again as a personal credit on Schedule 3.
  if (item.transferred_to_dealer) {
    if (
      item.credit_kind === "new_clean_vehicle" &&
      computeNewVehicleCreditParts(item, input).business > 0
    ) {
      throw new Error(
        "f8936: dealer transfer with business use needs Form 3800 routing",
      );
    }
    if (credit > 0) return [];
    const transferredAmount = item.transferred_amount;
    if (transferredAmount === undefined) {
      throw new Error(
        "f8936: dealer-transferred credit needs its transferred amount",
      );
    }
    return used
      ? [output(schedule2, {
        line1c_prev_owned_clean_vehicle_repayment: transferredAmount,
      })]
      : [output(schedule2, {
        line1b_new_clean_vehicle_repayment: transferredAmount,
      })];
  }
  if (credit <= 0) return [];
  return [
    output(
      schedule3,
      used
        ? { line6m_prev_owned_clean_vehicle_credit: credit }
        : { line6f_clean_vehicle_credit: credit },
    ),
  ];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class F8936Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8936";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2, schedule3, f3800]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8936s.length === 0) return { outputs: [] };
    const outputs = input.f8936s.flatMap((item) => vehicleOutput(item, input));
    let businessCredit = 0;
    let commercialCredit = 0;
    for (const item of input.f8936s) {
      if (
        item.credit_kind === "previously_owned_clean_vehicle" ||
        item.transferred_to_dealer === true
      ) {
        continue;
      }
      const amount = item.credit_kind === "new_clean_vehicle"
        ? computeNewVehicleCreditParts(item, input).business
        : computeCommercialVehicleCreditLines(item).line26Credit;
      if (amount <= 0) continue;
      if (
        item.business_credit_subject_to_passive_activity_limit === undefined
      ) {
        throw new Error(
          "f8936: business credit needs a passive-activity answer",
        );
      }
      if (item.business_credit_subject_to_passive_activity_limit) {
        throw new Error(
          "f8936: passive business credit needs Form 8582-CR before Form 3800",
        );
      }
      if (item.credit_kind === "new_clean_vehicle") businessCredit += amount;
      else commercialCredit += amount;
    }
    if (businessCredit > 0) {
      outputs.push(output(f3800, {
        f8936_new_vehicle_credit: {
          credit_amount: businessCredit,
          subject_to_passive_activity_limit: false,
        },
      }));
    }
    if (commercialCredit > 0) {
      outputs.push(output(f3800, {
        f8936_commercial_vehicle_credit: {
          credit_amount: commercialCredit,
          subject_to_passive_activity_limit: false,
        },
      }));
    }
    return {
      outputs,
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const f8936 = new F8936Node();
