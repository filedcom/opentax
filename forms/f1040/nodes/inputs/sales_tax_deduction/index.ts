import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// IRC §164(b)(5) — Election to deduct general sales taxes instead of income taxes
// TCJA §11042 — SALT cap ($10,000/$5,000 MFS) applied downstream by schedule_a

export enum SalesTaxMethod {
  Actual = "actual",
  Table = "table",
}

export const inputSchema = z.object({
  // Which method the taxpayer uses: actual receipts or IRS Optional Sales Tax Tables (Pub. 600)
  method: z.nativeEnum(SalesTaxMethod),
  // Actual method: total general sales taxes from receipts (IRC §164(b)(5)(A))
  actual_sales_tax_paid: z.number().nonnegative().optional(),
  // Table method: amount from IRS Optional Sales Tax Tables (taxpayer pre-computes from Pub. 600)
  table_amount: z.number().nonnegative().optional(),
  // Major purchase add-on: actual sales tax on major purchases (car, boat, aircraft, home)
  // Added to table method amount only; IRC §164(b)(5)(F)
  major_purchase_tax: z.number().nonnegative().optional(),
});

type SalesTaxInput = z.infer<typeof inputSchema>;

// Compute deductible sales tax amount based on method
function computeBase(input: SalesTaxInput): number {
  if (input.method === SalesTaxMethod.Actual) {
    return input.actual_sales_tax_paid ?? 0;
  }
  // Table method: table amount + major purchase add-on
  return (input.table_amount ?? 0) + (input.major_purchase_tax ?? 0);
}

function scheduleAOutput(input: SalesTaxInput): NodeOutput[] {
  const base = computeBase(input);
  if (base === 0) return [];
  return [output(scheduleA, { line_5a_sales_tax: base })];
}

class SalesTaxDeductionNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "sales_tax_deduction";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA]);

  compute(_ctx: NodeContext, input: SalesTaxInput): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: scheduleAOutput(parsed) };
  }
}

export const sales_tax_deduction = new SalesTaxDeductionNode();
