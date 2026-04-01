import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8864 — Biodiesel, Renewable Diesel, or Sustainable Aviation Fuel (SAF) Credits
// IRC §40A: Biodiesel and renewable diesel credit; IRC §40B (IRA 2022): SAF credit.
// Credits flow to General Business Credit (Form 3800) → Schedule 3 line 6z.

// TY2025 Credit rates (not inflation-indexed for these fuel credits)
const BIODIESEL_RATE = 1.00; // $1.00/gallon per IRC §40A(a)(1)
const AGRI_BIODIESEL_RATE = 1.10; // $1.10/gallon ($1.00 + $0.10 small agri-producer) per IRC §40A(b)(2),(4)
const RENEWABLE_DIESEL_RATE = 1.00; // $1.00/gallon per IRC §40A(f)
const SAF_BASE_RATE = 1.25; // $1.25/gallon base per IRC §40B(a)
const SAF_BONUS_PER_PCT = 0.01; // $0.01/gallon per % above 50% GHG reduction per IRC §40B(b)(2)
const SAF_GHG_THRESHOLD = 50; // must exceed 50% GHG reduction per IRC §40B(b)(1)

export const inputSchema = z.object({
  // Gallons of biodiesel (non-agri) used in a qualified mixture per IRC §40A(a)(1)
  gallons_biodiesel: z.number().nonnegative().optional(),
  // Gallons of agri-biodiesel (e.g., soybean oil) used in a mixture per IRC §40A(b)(2)
  gallons_agri_biodiesel: z.number().nonnegative().optional(),
  // Gallons of renewable diesel used in fuel or a qualified mixture per IRC §40A(f)
  gallons_renewable_diesel: z.number().nonnegative().optional(),
  // Gallons of sustainable aviation fuel sold or used per IRC §40B
  gallons_saf: z.number().nonnegative().optional(),
  // SAF lifecycle GHG reduction percentage (must exceed 50% for credit)
  saf_ghg_reduction_percentage: z.number().nonnegative().optional(),
});

type F8864Input = z.infer<typeof inputSchema>;

// Biodiesel mixture credit per IRC §40A(a)(1)
function biodieselCredit(input: F8864Input): number {
  return (input.gallons_biodiesel ?? 0) * BIODIESEL_RATE;
}

// Agri-biodiesel credit per IRC §40A(b)(2) and (4) ($1.00 + $0.10 small producer)
function agriBiodieselCredit(input: F8864Input): number {
  return (input.gallons_agri_biodiesel ?? 0) * AGRI_BIODIESEL_RATE;
}

// Renewable diesel credit per IRC §40A(f)
function renewableDieselCredit(input: F8864Input): number {
  return (input.gallons_renewable_diesel ?? 0) * RENEWABLE_DIESEL_RATE;
}

// SAF credit per IRC §40B(a)-(b): $1.25 base + $0.01 per % above 50% GHG reduction
function safCredit(input: F8864Input): number {
  const gallons = input.gallons_saf ?? 0;
  if (gallons <= 0) return 0;
  const ghgPct = input.saf_ghg_reduction_percentage ?? 0;
  if (ghgPct <= SAF_GHG_THRESHOLD) return 0;
  const bonusPoints = ghgPct - SAF_GHG_THRESHOLD;
  const ratePerGallon = SAF_BASE_RATE + bonusPoints * SAF_BONUS_PER_PCT;
  return gallons * ratePerGallon;
}

function totalCredit(input: F8864Input): number {
  return (
    biodieselCredit(input) +
    agriBiodieselCredit(input) +
    renewableDieselCredit(input) +
    safCredit(input)
  );
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8864Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8864";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F8864Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8864 = new F8864Node();
