import { z } from "zod";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import {
  businessReturnSource2026Schema,
  resolveBusinessQbi2026,
} from "../inputs/business-qbi.ts";
import { calculateBusinessLoss2026 } from "../inputs/business-loss-source.ts";
import {
  calculateCapitalGains2026,
  capitalGainInput2026Schema,
} from "./capital-gains.ts";
import { businessLossLimitLines } from "../../nodes/intermediate/forms/income/business/form461/calculation.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  combinedQbiSource2026Schema,
  reconcileCombinedBusiness2026,
  resolveCombinedQbi2026,
} from "../inputs/combined-qbi.ts";

export const form461Input2026Schema = z.object({
  business_sources_2026: businessReturnSource2026Schema.optional(),
  capital_sources_2026: capitalGainInput2026Schema,
  combined_qbi_sources_2026: combinedQbiSource2026Schema.optional(),
}).strict();
export function calculateForm461_2026(
  raw: z.input<typeof form461Input2026Schema>,
) {
  const input = form461Input2026Schema.parse(raw);
  if (input.combined_qbi_sources_2026) {
    const combined = resolveCombinedQbi2026(input.combined_qbi_sources_2026);
    const calculation = combined.land.loss.calculation;
    if (Boolean(input.business_sources_2026) !== Boolean(combined.business)) {
      throw new Error(
        "Combined loss owner needs the same Schedule C inventory as the graph",
      );
    }
    if (input.business_sources_2026) {
      reconcileCombinedBusiness2026(
        input.business_sources_2026,
        combined.source_input,
      );
    }
    if (
      JSON.stringify(input.capital_sources_2026) !==
        JSON.stringify(calculation.capital.source_input)
    ) {
      throw new Error(
        "Combined loss owner needs identical finalized capital sources",
      );
    }
    return { source_input: input, calculation };
  }
  if (
    input.business_sources_2026?.qbi_review
      .linked_land_qbi_inventory_reference ||
    input.capital_sources_2026.land_sources_2026
  ) {
    throw new Error(
      "Linked land loss inventory requires the combined calculation owner",
    );
  }
  if (!input.business_sources_2026) {
    return { source_input: input, calculation: undefined };
  }
  const b = resolveBusinessQbi2026(input.business_sources_2026);
  const c = calculateCapitalGains2026(input.capital_sources_2026);
  if (c.land) {
    throw new Error("Form 461 land graph needs finalized loss attribution");
  }
  const employee = b.business.businesses.filter((r) =>
    r.source.kind === "statutory_employee"
  );
  const preliminary = businessLossLimitLines({
    line2: b.business.schedule1_line3,
    line3: c.return_gain,
    line4: 0,
    line5: 0,
    line6: 0,
    line8: -b.business.schedule1_line15,
    line10: Math.max(0, c.return_gain) +
      employee.reduce((n, r) => n + Math.max(0, r.lines.line31), 0),
    line11: Math.max(0, -c.return_gain) +
      employee.reduce((n, r) => n + Math.max(0, -r.lines.line31), 0),
  }, {
    threshold: b.source_input.filing_status === FilingStatus.MFJ
      ? 512000
      : 256000,
    individualLineFilingTrigger: 128000,
  });
  const review = b.source_input.loss_limit_review;
  if (!review) {
    if (preliminary.must_file) {
      throw new Error(
        "Required Form 461 needs a complete business-loss review",
      );
    }
    return { source_input: input, calculation: undefined };
  }
  const { qbi_loss_allocation: _method, ...lossReview } = review;
  const calculation = calculateBusinessLoss2026({
    filing_status: b.source_input.filing_status,
    taxpayer_ssn: b.source_input.taxpayer_tin,
    spouse_ssn: c.source_input.spouse_ssn,
    record_reference: `form461:${b.source_input.record_reference}`,
    business_sources: b.business.source_input,
    capital_sources: c.source_input,
    review: lossReview,
  });
  return { source_input: input, calculation };
}
class Form461Node2026 extends TaxNode<typeof form461Input2026Schema> {
  readonly nodeType = "form461";
  readonly inputSchema = form461Input2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["agi_aggregator", "schedule1", "standard_deduction"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof form461Input2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 461 needs f1040:2026 context");
    }
    const result = calculateForm461_2026(raw), c = result.calculation;
    if (!c) return { outputs: [] };
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "agi_aggregator",
          fields: {
            line8p_excess_business_loss: c.schedule1_line8p,
            business_loss_sources_2026: c.source_input,
          },
        },
        {
          nodeType: "schedule1",
          fields: { line8p_excess_business_loss: c.schedule1_line8p },
        },
        {
          nodeType: "standard_deduction",
          fields: {
            business_loss_sources_2026: c.source_input,
            ...(result.source_input.combined_qbi_sources_2026
              ? {
                combined_qbi_sources_2026:
                  result.source_input.combined_qbi_sources_2026,
              }
              : {}),
          },
        },
      ],
    };
  }
}
export const form461_2026 = new Form461Node2026();
