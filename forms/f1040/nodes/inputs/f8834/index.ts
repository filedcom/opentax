import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8834 — Qualified Electric Vehicle Credit (IRC §30)
// Old §30 credit for 2-/3-wheel and low-speed vehicles (NOT new §30D).
// Mostly obsolete in TY2025 but carryforwards from prior years still exist.
// Credit = cost × credit_percentage (10% for 2-/3-wheel, 10% for low-speed)
// Routes to Schedule 3, Line 6z (general business credit section).

// TY2025 constants — IRC §30
const MAX_CREDIT_TWO_THREE_WHEEL = 2500;   // 10% × $25,000 cost cap
const MAX_CREDIT_LOW_SPEED = 2500;         // 10% × $25,000 cost cap
const TWO_THREE_WHEEL_RATE = 0.10;
const LOW_SPEED_RATE = 0.10;

export enum VehicleType {
  TwoThreeWheel = "two_three_wheel",
  LowSpeed = "low_speed",
}

export const itemSchema = z.object({
  // Vehicle description (as entered on Form 8834, Line 1)
  vehicle_description: z.string().optional(),
  // Date vehicle was placed in service (ISO YYYY-MM-DD)
  date_placed_in_service: z.string().optional(),
  // Original cost of vehicle (Line 2)
  cost: z.number().nonnegative(),
  // Credit percentage elected (10% is standard for both vehicle types)
  credit_percentage: z.number().min(0).max(1).optional(),
  // Vehicle type determines which cap applies
  vehicle_type: z.nativeEnum(VehicleType).optional(),
  // Whether taxpayer was the original user (original use requirement)
  original_use: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8834s: z.array(itemSchema).min(1),
});

type F8834Item = z.infer<typeof itemSchema>;

function vehicleCredit(item: F8834Item): number {
  // Original use required — if explicitly false, no credit
  if (item.original_use === false) return 0;
  if (item.cost <= 0) return 0;

  const rate = item.credit_percentage ?? (
    item.vehicle_type === VehicleType.LowSpeed ? LOW_SPEED_RATE : TWO_THREE_WHEEL_RATE
  );
  const rawCredit = item.cost * rate;

  // Apply per-vehicle cap based on vehicle type
  const cap = item.vehicle_type === VehicleType.LowSpeed
    ? MAX_CREDIT_LOW_SPEED
    : MAX_CREDIT_TWO_THREE_WHEEL;

  return Math.min(rawCredit, cap);
}

function totalCredit(items: F8834Item[]): number {
  return items.reduce((sum, item) => sum + vehicleCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8834Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8834";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input.f8834s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8834 = new F8834Node();
