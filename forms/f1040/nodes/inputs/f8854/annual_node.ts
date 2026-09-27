import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { annualInputSchema, type F8854AnnualInput } from "./annual.ts";
import { ReportedFormCode } from "./section-c.ts";

export function validateAnnualForm8854Filing(
  raw: F8854AnnualInput,
): F8854AnnualInput {
  const input = annualInputSchema.parse(raw);
  if (input.tax_status_2025 !== "FULL_YEAR_US_CITIZEN_OR_RESIDENT") {
    throw new Error(
      "Annual Form 8854 nonresident or dual-status returns cannot use this Form 1040 MeF path",
    );
  }
  if (
    input.deferred_properties.some((property) =>
      property.disposition.disposed_in_2025 &&
      property.disposition.reported_form_code !== ReportedFormCode.Form8949
    )
  ) {
    throw new Error(
      "Annual Form 8854 non-Form 8949 dispositions need reconciled 2025 income reporting and payment evidence",
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
