import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form8936 } from "../../intermediate/form8936/index.ts";
import { filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Array input node — one entry per qualifying clean vehicle.
// Passes each vehicle's data to the intermediate form8936 node for credit
// computation (new up to $7,500 / used up to $4,000; IRC §30D, §25E).

export const itemSchema = z.object({
  // Vehicle identification
  vehicle_description: z.string().optional(),
  vin: z.string().optional(),
  purchase_date: z.string().optional(),           // ISO date YYYY-MM-DD

  // Credit determination
  is_new_vehicle: z.boolean().optional(),         // true = new (§30D), false = used (§25E)
  credit_amount: z.number().nonnegative().optional(), // IRS-certified credit ($3,750 or $7,500)
  sale_price: z.number().nonnegative().optional(),    // used vehicles: must be ≤ $25,000
  msrp: z.number().nonnegative().optional(),          // new vehicles: MSRP cap check

  // Vehicle type for MSRP cap ($80k SUV/van/truck; $55k other)
  vehicle_type: z.enum(["suv_van_truck", "other"]).optional(),

  // Business use (reduces personal credit)
  business_use_pct: z.number().min(0).max(1).optional(),

  // Income limits
  modified_agi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
});

export const inputSchema = z.object({
  f8936_inputs: z.array(itemSchema),
});

type F8936Item = z.infer<typeof itemSchema>;
type F8936InputNodeInput = z.infer<typeof inputSchema>;

function vehicleOutput(item: F8936Item): NodeOutput {
  // Each vehicle gets its own form8936 invocation.
  return {
    nodeType: form8936.nodeType,
    fields: {
      is_new_vehicle: item.is_new_vehicle,
      credit_amount: item.credit_amount,
      sale_price: item.sale_price,
      msrp: item.msrp,
      vehicle_type: item.vehicle_type,
      business_use_pct: item.business_use_pct,
      modified_agi: item.modified_agi,
      filing_status: item.filing_status,
    },
  };
}

class F8936InputNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8936_input";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8936]);

  compute(_ctx: NodeContext, rawInput: F8936InputNodeInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8936_inputs.length === 0) return { outputs: [] };
    return { outputs: input.f8936_inputs.map(vehicleOutput) };
  }
}

export const f8936Input = new F8936InputNode();
