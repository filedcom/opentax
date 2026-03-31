import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { FilingStatus, filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Array input node — one entry per qualifying clean vehicle.
// Computes the clean vehicle credit for each vehicle (IRC §30D new, §25E used).

// ─── TY2025 Constants ────────────────────────────────────────────────────────

const NEW_VEHICLE_MAX_CREDIT = 7_500;
const USED_VEHICLE_MAX_CREDIT = 4_000;
const USED_VEHICLE_RATE = 0.30;

const INCOME_LIMIT_MFJ = 300_000;
const INCOME_LIMIT_HOH = 225_000;
const INCOME_LIMIT_SINGLE = 150_000;

const MSRP_CAP_SUV_VAN_TRUCK = 80_000;
const MSRP_CAP_OTHER = 55_000;

const USED_VEHICLE_PRICE_CAP = 25_000;

// ─── Schema ──────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  vehicle_description: z.string().optional(),
  vin: z.string().optional(),
  purchase_date: z.string().optional(),

  is_new_vehicle: z.boolean().optional(),
  credit_amount: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  msrp: z.number().nonnegative().optional(),
  vehicle_type: z.enum(["suv_van_truck", "other"]).optional(),
  business_use_pct: z.number().min(0).max(1).optional(),
  modified_agi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
});

export const inputSchema = z.object({
  f8936s: z.array(itemSchema),
});

type F8936Item = z.infer<typeof itemSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function incomeLimit(status: FilingStatus | undefined): number {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) return INCOME_LIMIT_MFJ;
  if (status === FilingStatus.HOH) return INCOME_LIMIT_HOH;
  return INCOME_LIMIT_SINGLE;
}

function exceedsIncomeLimit(item: F8936Item): boolean {
  if (item.modified_agi === undefined) return false;
  return item.modified_agi > incomeLimit(item.filing_status);
}

function msrpCap(vehicleType: "suv_van_truck" | "other" | undefined): number {
  return vehicleType === "suv_van_truck" ? MSRP_CAP_SUV_VAN_TRUCK : MSRP_CAP_OTHER;
}

function newVehicleExceedsMsrpCap(item: F8936Item): boolean {
  if (item.msrp === undefined) return false;
  return item.msrp > msrpCap(item.vehicle_type);
}

function computeNewVehicleCredit(item: F8936Item): number {
  if (exceedsIncomeLimit(item)) return 0;
  if (newVehicleExceedsMsrpCap(item)) return 0;
  const credit = Math.min(item.credit_amount ?? 0, NEW_VEHICLE_MAX_CREDIT);
  const personalPct = 1 - (item.business_use_pct ?? 0);
  return Math.round(credit * personalPct);
}

function computeUsedVehicleCredit(item: F8936Item): number {
  if (exceedsIncomeLimit(item)) return 0;
  const price = item.sale_price ?? 0;
  if (price > USED_VEHICLE_PRICE_CAP) return 0;
  const credit = Math.min(price * USED_VEHICLE_RATE, USED_VEHICLE_MAX_CREDIT);
  const personalPct = 1 - (item.business_use_pct ?? 0);
  return Math.round(credit * personalPct);
}

function vehicleOutput(item: F8936Item): NodeOutput[] {
  const credit = item.is_new_vehicle === false
    ? computeUsedVehicleCredit(item)
    : computeNewVehicleCredit(item);
  if (credit <= 0) return [];
  return [output(schedule3, { line6d_clean_vehicle_credit: credit })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class F8936Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8936";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8936s.length === 0) return { outputs: [] };
    return { outputs: input.f8936s.flatMap(vehicleOutput) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const f8936 = new F8936Node();
