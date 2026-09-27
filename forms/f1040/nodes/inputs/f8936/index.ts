import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { FilingStatus, filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Array input node — one entry per qualifying clean vehicle.
// Computes the clean vehicle credit for each vehicle (IRC §30D new, §25E used).

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

// ─── Schema ──────────────────────────────────────────────────────────────────

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

  is_new_vehicle: z.boolean().optional(),
  credit_amount: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  msrp: z.number().nonnegative().optional(),
  vehicle_type: z.enum(["suv_van_truck", "other"]).optional(),
  business_use_pct: z.number().min(0).max(1).optional(),
});

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
});

export type F8936Item = z.infer<typeof itemSchema>;
export type F8936Input = z.infer<typeof inputSchema>;
export type F8936MagiYear = z.infer<typeof magiYearSchema>;

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
  if (item.seller_report_received !== true) {
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

function computeNewVehicleCredit(item: F8936Item, input: F8936Input): number {
  if (acquiredAfterCreditCutoff(item)) return 0;
  requireVehicleFacts(item);
  if (item.resold_within_30_days || !item.acquired_for_use_not_resale) return 0;
  if (exceedsIncomeLimit(input, false)) return 0;
  if (item.msrp === undefined || item.vehicle_type === undefined) {
    throw new Error("f8936: new vehicle MSRP and vehicle type are required");
  }
  if (newVehicleExceedsMsrpCap(item)) return 0;
  const credit = Math.min(item.credit_amount ?? 0, NEW_VEHICLE_MAX_CREDIT);
  const personalPct = 1 - (item.business_use_pct ?? 0);
  return Math.round(credit * personalPct);
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
  if (item.is_new_vehicle === undefined) {
    throw new Error(
      "f8936: vehicle must be classified as new or previously owned",
    );
  }
  const used = item.is_new_vehicle === false;
  return used
    ? computeUsedVehicleCredit(item, input)
    : computeNewVehicleCredit(item, input);
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
  const used = item.is_new_vehicle === false;
  const credit = computeVehiclePersonalCredit(item, input);
  // A dealer transfer is reconciled on Form 8936/Schedule A, not claimed
  // again as a personal credit on Schedule 3.
  if (item.transferred_to_dealer) {
    const transferredAmount = item.transferred_amount;
    if (transferredAmount === undefined) {
      throw new Error(
        "f8936: dealer-transferred credit needs its transferred amount",
      );
    }
    if ((item.business_use_pct ?? 0) > 0) {
      throw new Error(
        "f8936: dealer transfer with business use needs Form 3800 routing",
      );
    }
    if (credit > 0) return [];
    return [output(
      schedule2,
      used
        ? { line1c_prev_owned_clean_vehicle_repayment: transferredAmount }
        : { line1b_new_clean_vehicle_repayment: transferredAmount },
    )];
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
  readonly outputNodes = new OutputNodes([schedule2, schedule3]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8936s.length === 0) return { outputs: [] };
    return {
      outputs: input.f8936s.flatMap((item) => vehicleOutput(item, input)),
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const f8936 = new F8936Node();
