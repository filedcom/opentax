import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../schedule3/index.ts";
import { FilingStatus, filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §30D, §25E; Rev Proc 2024-40) ─────────────────────

// New clean vehicle credit (IRC §30D): up to $7,500
const NEW_VEHICLE_MAX_CREDIT = 7_500;

// Used clean vehicle credit (IRC §25E): up to $4,000 or 30% of price, whichever is less
const USED_VEHICLE_MAX_CREDIT = 4_000;
const USED_VEHICLE_RATE = 0.30;

// Income limits — Modified AGI (the lower of current year or prior year AGI)
// MFJ / QSS: $300,000
// HOH: $225,000
// Single / MFS: $150,000
const INCOME_LIMIT_MFJ = 300_000;
const INCOME_LIMIT_HOH = 225_000;
const INCOME_LIMIT_SINGLE = 150_000;

// MSRP caps (new vehicles must be below these to qualify)
// Vans, SUVs, pickup trucks: $80,000
// All other vehicles: $55,000
const MSRP_CAP_SUV_VAN_TRUCK = 80_000;
const MSRP_CAP_OTHER = 55_000;

// Used vehicle: sale price must be ≤ $25,000
const USED_VEHICLE_PRICE_CAP = 25_000;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Whether this is a new vehicle (true) or used vehicle (false)
  is_new_vehicle: z.boolean().optional(),

  // Pre-computed credit amount from the vehicle certification
  // For new vehicles: $3,750, $7,500 (based on battery/assembly requirements)
  // For used vehicles: this field is ignored; computed from sale_price
  credit_amount: z.number().nonnegative().optional(),

  // Vehicle sale price (required for used vehicle credit calculation)
  sale_price: z.number().nonnegative().optional(),

  // MSRP of new vehicle (for cap verification)
  msrp: z.number().nonnegative().optional(),

  // Vehicle type for MSRP cap determination
  // "suv_van_truck" → $80,000 cap; "other" → $55,000 cap
  vehicle_type: z.enum(["suv_van_truck", "other"]).optional(),

  // Business use percentage (0 to 1) — reduces credit proportionally
  business_use_pct: z.number().min(0).max(1).optional(),

  // Modified AGI for income limit testing
  modified_agi: z.number().nonnegative().optional(),

  // Filing status — determines income limit
  filing_status: filingStatusSchema.optional(),
});

type Form8936Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function incomeLimit(status: FilingStatus | undefined): number {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return INCOME_LIMIT_MFJ;
  }
  if (status === FilingStatus.HOH) {
    return INCOME_LIMIT_HOH;
  }
  return INCOME_LIMIT_SINGLE;
}

function exceedsIncomeLimit(input: Form8936Input): boolean {
  const agi = input.modified_agi;
  if (agi === undefined) return false;
  return agi > incomeLimit(input.filing_status);
}

function msrpCap(vehicleType: "suv_van_truck" | "other" | undefined): number {
  return vehicleType === "suv_van_truck" ? MSRP_CAP_SUV_VAN_TRUCK : MSRP_CAP_OTHER;
}

function newVehicleExceedsMsrpCap(input: Form8936Input): boolean {
  const msrp = input.msrp;
  if (msrp === undefined) return false;
  return msrp > msrpCap(input.vehicle_type);
}

function computeNewVehicleCredit(input: Form8936Input): number {
  if (exceedsIncomeLimit(input)) return 0;
  if (newVehicleExceedsMsrpCap(input)) return 0;

  // Use provided credit amount (from IRS qualification, up to $7,500)
  const credit = Math.min(input.credit_amount ?? 0, NEW_VEHICLE_MAX_CREDIT);

  // Reduce for personal use only (business use portion goes to Form 3800)
  const personalPct = 1 - (input.business_use_pct ?? 0);
  return Math.round(credit * personalPct);
}

function computeUsedVehicleCredit(input: Form8936Input): number {
  if (exceedsIncomeLimit(input)) return 0;

  const price = input.sale_price ?? 0;

  // Used vehicle price must be ≤ $25,000
  if (price > USED_VEHICLE_PRICE_CAP) return 0;

  // Credit = lesser of $4,000 or 30% of sale price
  const credit = Math.min(price * USED_VEHICLE_RATE, USED_VEHICLE_MAX_CREDIT);

  // Reduce for business use
  const personalPct = 1 - (input.business_use_pct ?? 0);
  return Math.round(credit * personalPct);
}

function buildOutput(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  // Schedule 3 line 6d — clean vehicle credit (Form 8936 line 15)
  return [output(schedule3, { line6d_clean_vehicle_credit: credit })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8936Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8936";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: Form8936Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const credit = input.is_new_vehicle === false
      ? computeUsedVehicleCredit(input)
      : computeNewVehicleCredit(input);

    return { outputs: buildOutput(credit) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8936 = new Form8936Node();
