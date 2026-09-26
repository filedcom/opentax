import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
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
  // The date the binding contract and payment made the vehicle "acquired".
  acquisition_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  is_new_vehicle: z.boolean().optional(),
  credit_amount: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  msrp: z.number().nonnegative().optional(),
  vehicle_type: z.enum(["suv_van_truck", "other"]).optional(),
  business_use_pct: z.number().min(0).max(1).optional(),
  modified_agi: z.number().nonnegative().optional(),
  prior_year_modified_agi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
  prior_year_filing_status: filingStatusSchema.optional(),
});

export const inputSchema = z.object({
  f8936s: z.array(itemSchema),
});

type F8936Item = z.infer<typeof itemSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function incomeLimit(status: FilingStatus, used: boolean): number {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return used ? USED_INCOME_LIMIT_MFJ : NEW_INCOME_LIMIT_MFJ;
  }
  if (status === FilingStatus.HOH) {
    return used ? USED_INCOME_LIMIT_HOH : NEW_INCOME_LIMIT_HOH;
  }
  return used ? USED_INCOME_LIMIT_SINGLE : NEW_INCOME_LIMIT_SINGLE;
}

function exceedsIncomeLimit(item: F8936Item, used: boolean): boolean {
  if (item.modified_agi === undefined || item.filing_status === undefined) {
    throw new Error("f8936: current-year MAGI and filing status are required");
  }
  if (item.modified_agi <= incomeLimit(item.filing_status, used)) return false;
  if (
    item.prior_year_modified_agi === undefined ||
    item.prior_year_filing_status === undefined
  ) {
    throw new Error(
      "f8936: prior-year MAGI and filing status are required when current-year MAGI exceeds the limit",
    );
  }
  return item.prior_year_modified_agi >
    incomeLimit(item.prior_year_filing_status, used);
}

function acquiredAfterCreditCutoff(item: F8936Item): boolean {
  if (item.acquisition_date === undefined) {
    throw new Error(
      "f8936: acquisition date is required to determine credit eligibility",
    );
  }
  const date = new Date(`${item.acquisition_date}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== item.acquisition_date
  ) {
    throw new Error("f8936: acquisition date must be a valid ISO date");
  }
  return item.acquisition_date > LAST_ELIGIBLE_ACQUISITION_DATE;
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

function computeNewVehicleCredit(item: F8936Item): number {
  if (acquiredAfterCreditCutoff(item)) return 0;
  if (exceedsIncomeLimit(item, false)) return 0;
  if (newVehicleExceedsMsrpCap(item)) return 0;
  const credit = Math.min(item.credit_amount ?? 0, NEW_VEHICLE_MAX_CREDIT);
  const personalPct = 1 - (item.business_use_pct ?? 0);
  return Math.round(credit * personalPct);
}

function computeUsedVehicleCredit(item: F8936Item): number {
  if (acquiredAfterCreditCutoff(item)) return 0;
  if (exceedsIncomeLimit(item, true)) return 0;
  const price = item.sale_price ?? 0;
  if (price > USED_VEHICLE_PRICE_CAP) return 0;
  const credit = Math.min(price * USED_VEHICLE_RATE, USED_VEHICLE_MAX_CREDIT);
  return Math.round(credit);
}

function vehicleOutput(item: F8936Item): NodeOutput[] {
  const used = item.is_new_vehicle === false;
  const credit = used
    ? computeUsedVehicleCredit(item)
    : computeNewVehicleCredit(item);
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
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8936s.length === 0) return { outputs: [] };
    return { outputs: input.f8936s.flatMap(vehicleOutput) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const f8936 = new F8936Node();
