import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 4136 — Credit for Federal Tax Paid on Fuels
// IRC §§ 6421, 6427 — TY2025 rates from IRS Publication 510 / Notice 2025
//
// Routing:
//   Refundable (farming use) → f1040.line35_fuel_tax_credit
//   Nonrefundable (off-highway business, aviation) → schedule3.line6z_general_business_credit

// TY2025 credit rates per gallon
const RATES = {
  gasoline: 0.184,
  diesel: 0.244,
  aviation_gas: 0.194,
  kerosene: 0.244,
  kerosene_aviation: 0.219,
  lpg: 0.183,
  cng: 0.183,
} as const;

export const inputSchema = z.object({
  // Gasoline
  gasoline_offhighway_gallons: z.number().nonnegative().optional(),
  gasoline_farming_gallons: z.number().nonnegative().optional(),
  // Diesel
  diesel_offhighway_gallons: z.number().nonnegative().optional(),
  diesel_farming_gallons: z.number().nonnegative().optional(),
  // Aviation gasoline
  aviation_gas_noncommercial_gallons: z.number().nonnegative().optional(),
  aviation_gas_farming_gallons: z.number().nonnegative().optional(),
  // Kerosene
  kerosene_offhighway_gallons: z.number().nonnegative().optional(),
  kerosene_farming_gallons: z.number().nonnegative().optional(),
  // Kerosene for aviation (non-commercial)
  kerosene_aviation_gallons: z.number().nonnegative().optional(),
  // Liquefied petroleum gas (LPG / propane)
  lpg_offhighway_gallons: z.number().nonnegative().optional(),
  // Compressed natural gas (GGE)
  cng_offhighway_gallons: z.number().nonnegative().optional(),
});

type F4136Input = z.infer<typeof inputSchema>;

function nonrefundableCredit(input: F4136Input): number {
  const gallons = [
    (input.gasoline_offhighway_gallons ?? 0) * RATES.gasoline,
    (input.diesel_offhighway_gallons ?? 0) * RATES.diesel,
    (input.aviation_gas_noncommercial_gallons ?? 0) * RATES.aviation_gas,
    (input.kerosene_offhighway_gallons ?? 0) * RATES.kerosene,
    (input.kerosene_aviation_gallons ?? 0) * RATES.kerosene_aviation,
    (input.lpg_offhighway_gallons ?? 0) * RATES.lpg,
    (input.cng_offhighway_gallons ?? 0) * RATES.cng,
  ];
  return round2(gallons.reduce((sum, v) => sum + v, 0));
}

function refundableCredit(input: F4136Input): number {
  const gallons = [
    (input.gasoline_farming_gallons ?? 0) * RATES.gasoline,
    (input.diesel_farming_gallons ?? 0) * RATES.diesel,
    (input.aviation_gas_farming_gallons ?? 0) * RATES.aviation_gas,
    (input.kerosene_farming_gallons ?? 0) * RATES.kerosene,
  ];
  return round2(gallons.reduce((sum, v) => sum + v, 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

class F4136Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4136";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);
  readonly pdfUrl =
    "https://www.irs.gov/pub/irs-pdf/f4136.pdf";

  compute(_ctx: NodeContext, rawInput: F4136Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const nonRefundable = nonrefundableCredit(input);
    const refundable = refundableCredit(input);

    const outputs = [];
    if (nonRefundable > 0) {
      outputs.push({
        nodeType: schedule3.nodeType,
        fields: { line6z_general_business_credit: nonRefundable },
      });
    }
    if (refundable > 0) {
      outputs.push({
        nodeType: f1040.nodeType,
        fields: { line35_fuel_tax_credit: refundable },
      });
    }
    return { outputs };
  }
}

export const f4136 = new F4136Node();
