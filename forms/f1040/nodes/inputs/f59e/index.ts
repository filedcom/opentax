import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// IRC §59(e) expenditure records. A remaining unamortized balance is not a
// current-year Form 6251 adjustment; circulation costs use the two allowed
// current-year deductions to determine line 2o.
// Expenditure types: research/experimental (§174), mining exploration (§616/617),
// development (§616), circulation (§173), intangible drilling costs (§263(c)).

export enum ExpenditureType {
  ResearchExperimental = "research_experimental",
  Mining = "mining",
  Development = "development",
  Circulation = "circulation",
  IntangibleDrilling = "intangible_drilling",
}

export const itemSchema = z.object({
  // Type of §59(e) expenditure
  expenditure_type: z.nativeEnum(ExpenditureType),
  // Date amortization period began (YYYY-MM-DD)
  amortization_period_start: z.string(),
  // Original election amount
  original_amount: z.number().nonnegative(),
  // Remaining unamortized balance carried over from prior year
  remaining_unamortized: z.number().nonnegative(),
  regular_tax_deduction: z.number().nonnegative().optional(),
  amt_deduction: z.number().nonnegative().optional(),
  regular_three_year_writeoff_elected: z.boolean().optional(),
  circulation_reviewed_workpaper_reference: z.string().trim().min(1).optional(),
  circulation_no_unamortized_property_loss: z.literal(true).optional(),
});

export const inputSchema = z.object({
  f59es: z.array(itemSchema).min(1),
});

type F59eItem = z.infer<typeof itemSchema>;
type F59eItems = F59eItem[];

function circulationAdjustment(items: F59eItems): number {
  return items.reduce((sum, item) => {
    if (item.expenditure_type !== ExpenditureType.Circulation) return sum;
    if (
      item.regular_tax_deduction === undefined ||
      item.amt_deduction === undefined ||
      item.regular_three_year_writeoff_elected === undefined ||
      item.circulation_reviewed_workpaper_reference === undefined ||
      item.circulation_no_unamortized_property_loss !== true
    ) {
      throw new Error(
        "Form 6251 line 2o circulation costs need reviewed current-year deductions, the regular three-year election fact, and no unamortized property loss",
      );
    }
    if (
      item.regular_tax_deduction > item.original_amount ||
      item.amt_deduction > item.original_amount ||
      item.remaining_unamortized > item.original_amount
    ) {
      throw new Error(
        "Form 6251 line 2o circulation workpaper deductions and remaining balance cannot exceed the original expenditure",
      );
    }
    const difference = item.regular_tax_deduction - item.amt_deduction;
    if (item.regular_three_year_writeoff_elected && difference !== 0) {
      throw new Error(
        "Form 6251 line 2o circulation costs cannot differ when the regular three-year write-off was elected",
      );
    }
    return sum + difference;
  }, 0);
}

class F59eNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f59e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form6251]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const line2o = circulationAdjustment(parsed.f59es);
    const unsupportedBalance = parsed.f59es.reduce(
      (sum, item) => sum +
        (item.expenditure_type === ExpenditureType.Circulation
          ? 0
          : item.remaining_unamortized),
      0,
    );
    if (line2o === 0 && unsupportedBalance === 0) return { outputs: [] };
    return {
      outputs: [{
        nodeType: form6251.nodeType,
        fields: {
          ...(line2o !== 0 ? { line2o_circulation_costs: line2o } : {}),
          ...(unsupportedBalance !== 0
            ? { other_adjustments: unsupportedBalance }
            : {}),
        },
      }],
    };
  }
}

export const f59e = new F59eNode();
