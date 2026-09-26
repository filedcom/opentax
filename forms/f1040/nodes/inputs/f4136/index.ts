import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 4136 — Credit for Federal Tax Paid on Fuels
// IRC §§ 6421, 6427 — TY2025 Form 4136 Part II rates.
//
// Form 4136 line 17 routes to refundable Schedule 3 line 12.

// TY2025 credit rates per gallon
const RATES = {
  gasoline: 0.183,
  diesel: 0.243,
  aviation_gas: 0.193,
  kerosene: 0.243,
  kerosene_aviation_taxed_244: 0.243,
  kerosene_aviation_taxed_219: 0.218,
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
  kerosene_aviation_taxed_244_gallons: z.number().nonnegative().optional(),
  kerosene_aviation_taxed_219_gallons: z.number().nonnegative().optional(),
  // Liquefied petroleum gas (LPG / propane)
  lpg_offhighway_gallons: z.number().nonnegative().optional(),
  // Compressed natural gas (GGE)
  cng_offhighway_gallons: z.number().nonnegative().optional(),
});

type F4136Input = z.infer<typeof inputSchema>;

function otherUseCredit(input: F4136Input): number {
  const gallons = [
    (input.gasoline_offhighway_gallons ?? 0) * RATES.gasoline,
    (input.diesel_offhighway_gallons ?? 0) * RATES.diesel,
    (input.aviation_gas_noncommercial_gallons ?? 0) * RATES.aviation_gas,
    (input.kerosene_offhighway_gallons ?? 0) * RATES.kerosene,
    (input.kerosene_aviation_taxed_244_gallons ?? 0) *
    RATES.kerosene_aviation_taxed_244,
    (input.kerosene_aviation_taxed_219_gallons ?? 0) *
    RATES.kerosene_aviation_taxed_219,
    (input.lpg_offhighway_gallons ?? 0) * RATES.lpg,
    (input.cng_offhighway_gallons ?? 0) * RATES.cng,
  ];
  return round2(gallons.reduce((sum, v) => sum + v, 0));
}

function farmUseCredit(input: F4136Input): number {
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
  readonly outputNodes = new OutputNodes([schedule3]);
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4136.pdf";

  compute(_ctx: NodeContext, rawInput: F4136Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = round2(otherUseCredit(input) + farmUseCredit(input));
    return {
      outputs: credit > 0
        ? [{
          nodeType: schedule3.nodeType,
          fields: { line12_fuel_tax_credit: credit },
        }]
        : [],
    };
  }
}

export const f4136 = new F4136Node();
