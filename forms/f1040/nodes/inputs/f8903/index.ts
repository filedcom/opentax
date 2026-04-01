import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8903 — Domestic Production Activities Deduction (DPAD)
// LEGACY NODE: Repealed by TCJA §13305 (P.L. 115-97) for TY2018 and later.
// Retained for amended returns for TY2017 and prior only.
// Deduction = min(rate × min(QPAI, AGI), 50% × W-2 wages)
// Standard rate: 9% (IRC §199(a)(1)); oil/gas rate: 6% (IRC §199(d)(9))
// W-2 wage limit: 50% of W-2 wages allocable to domestic production (IRC §199(b)(1))

const STANDARD_RATE = 0.09;
const OIL_GAS_RATE = 0.06;
const W2_WAGE_LIMIT_RATE = 0.50;

export const inputSchema = z.object({
  qualified_production_activities_income: z.number().nonnegative(),
  form_w2_wages: z.number().nonnegative(),
  adjusted_gross_income: z.number().nonnegative().optional(),
  oil_gas_rate: z.boolean().optional(),
});

type F8903Input = z.infer<typeof inputSchema>;

function effectiveRate(input: F8903Input): number {
  return input.oil_gas_rate === true ? OIL_GAS_RATE : STANDARD_RATE;
}

function tentativeDeduction(input: F8903Input): number {
  const qpai = input.qualified_production_activities_income;
  const agi = input.adjusted_gross_income;
  const base = agi !== undefined ? Math.min(qpai, agi) : qpai;
  return effectiveRate(input) * base;
}

function w2WageLimit(input: F8903Input): number {
  return W2_WAGE_LIMIT_RATE * input.form_w2_wages;
}

function computedDeduction(input: F8903Input): number {
  return Math.min(tentativeDeduction(input), w2WageLimit(input));
}

class F8903Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8903";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, input: F8903Input): NodeResult {
    inputSchema.parse(input);
    const deduction = computedDeduction(input);
    if (deduction <= 0) return { outputs: [] };
    return {
      outputs: [output(schedule1, { line24h_dpad: deduction })],
    };
  }
}

export const f8903 = new F8903Node();
