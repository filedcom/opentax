import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import {
  ExclusionType,
  form982,
} from "../../intermediate/forms/form982/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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
  exclusion_type: z.nativeEnum(ExclusionType).optional(),
  insolvency_amount: z.number().nonnegative().optional(),
  qpri_mfs: z.boolean().optional(),
  principal_residence_retained: z.boolean().optional(),
  principal_residence_basis: z.number().nonnegative().optional(),
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
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    form982,
    schedule_d,
  ]);

  compute(_ctx: NodeContext, input: C99Input): NodeResult {
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
      outputs.push(
        this.outputNodes.output(schedule1, { line8c_cod_income: totalTaxable }),
      );
      outputs.push(
        this.outputNodes.output(agi_aggregator, {
          line8c_cod_income: totalTaxable,
        }),
      );
    }

    // Aggregate excluded COD income → Form 982 line 2
    const excluded = excludedItems(c99s);
    const totalExcluded = excluded.reduce(
      (sum, item) => sum + item.box2_cod_amount,
      0,
    );
    if (totalExcluded > 0) {
      const detailed = excluded.filter((item) =>
        item.exclusion_type !== undefined
      );
      if (detailed.length > 0 && excluded.length !== 1) {
        throw new Error(
          "Multiple excluded 1099-C debts need separate Form 982 exclusion detail",
        );
      }
      const detail = detailed[0];
      outputs.push(this.outputNodes.output(form982, {
        line2_excluded_cod: totalExcluded,
        ...(detail?.exclusion_type
          ? { exclusion_type: detail.exclusion_type }
          : {}),
        ...(detail?.insolvency_amount !== undefined
          ? { insolvency_amount: detail.insolvency_amount }
          : {}),
        ...(detail?.qpri_mfs !== undefined
          ? { qpri_mfs: detail.qpri_mfs }
          : {}),
        ...(detail?.principal_residence_retained !== undefined
          ? {
            principal_residence_retained: detail.principal_residence_retained,
          }
          : {}),
        ...(detail?.principal_residence_basis !== undefined
          ? { principal_residence_basis: detail.principal_residence_basis }
          : {}),
        ...(detail?.box1_date ? { discharge_date: detail.box1_date } : {}),
      }));
    }

    // Per-item property disposition outputs — each property event is distinct
    for (const item of propertyItems(c99s)) {
      outputs.push(this.outputNodes.output(schedule_d, {
        cod_property_fmv: item.box7_fmv_property,
        cod_debt_cancelled: item.box2_cod_amount,
      }));
    }

    return { outputs };
  }
}

export const f1099c = new F1099cNode();
