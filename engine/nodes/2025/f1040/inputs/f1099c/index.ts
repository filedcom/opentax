import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form982 } from "../../intermediate/form982/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";

export const itemSchema = z.object({
  creditor_name: z.string(),
  box1_date: z.string().optional(),
  box2_cod_amount: z.number().nonnegative(),
  box3_interest: z.number().nonnegative().optional(),
  box4_debt_description: z.string().optional(),
  box5_personal_use: z.boolean().optional(),
  box6_identifiable_event: z.string().optional(),
  box7_fmv_property: z.number().nonnegative().optional(),
  routing: z.enum(["taxable", "excluded"]).optional(),
});

export const inputSchema = z.object({
  f1099cs: z.array(itemSchema),
});

type C99Input = z.infer<typeof inputSchema>;

// Partition items by routing type.
function taxableItems(items: z.infer<typeof itemSchema>[]) {
  return items.filter((item) => (item.routing ?? "taxable") === "taxable");
}

function excludedItems(items: z.infer<typeof itemSchema>[]) {
  return items.filter((item) => item.routing === "excluded");
}

// Items that have a property FMV trigger a property gain/loss output.
function propertyItems(items: z.infer<typeof itemSchema>[]) {
  return items.filter((item) => (item.box7_fmv_property ?? 0) > 0);
}

class F1099cNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099c";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, form982, schedule_d]);

  compute(input: C99Input): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099cs: c99s } = parsed;

    if (c99s.length === 0) {
      return { outputs: [] };
    }

    const outputs = [];

    // Aggregate taxable COD income → Schedule 1 line 8c
    const totalTaxable = taxableItems(c99s).reduce(
      (sum, item) => sum + item.box2_cod_amount,
      0,
    );
    if (totalTaxable > 0) {
      outputs.push({
        nodeType: schedule1.nodeType,
        fields: { line8c_cod_income: totalTaxable },
      });
    }

    // Aggregate excluded COD income → Form 982 line 2
    const totalExcluded = excludedItems(c99s).reduce(
      (sum, item) => sum + item.box2_cod_amount,
      0,
    );
    if (totalExcluded > 0) {
      outputs.push({
        nodeType: form982.nodeType,
        fields: { line2_excluded_cod: totalExcluded },
      });
    }

    // Per-item property disposition outputs — each property event is distinct
    for (const item of propertyItems(c99s)) {
      outputs.push({
        nodeType: schedule_d.nodeType,
        fields: {
          cod_property_fmv: item.box7_fmv_property,
          cod_debt_cancelled: item.box2_cod_amount,
        },
      });
    }

    return { outputs };
  }
}

export const f1099c = new F1099cNode();
