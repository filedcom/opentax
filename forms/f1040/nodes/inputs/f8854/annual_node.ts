import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { annualInputSchema, type F8854AnnualInput } from "./annual.ts";

export function validateAnnualForm8854Filing(
  raw: F8854AnnualInput,
): F8854AnnualInput {
  const input = annualInputSchema.parse(raw);
  if (
    input.deferred_properties.some((property) =>
      property.disposition.disposed_in_2025
    ) ||
    input.eligible_deferred_compensation_items.some((item) =>
      item.distributions.length > 0
    ) ||
    input.nongrantor_trust_interests.some((item) =>
      item.distributions.length > 0
    )
  ) {
    throw new Error(
      "Annual Form 8854 dispositions and distributions need reconciled 2025 reporting and payment evidence",
    );
  }
  return input;
}

class F8854AnnualNode extends TaxNode<typeof annualInputSchema> {
  readonly nodeType = "f8854_annual";
  readonly inputSchema = annualInputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, raw: F8854AnnualInput): NodeResult {
    validateAnnualForm8854Filing(raw);
    return { outputs: [] };
  }
}

export const f8854Annual = new F8854AnnualNode();
