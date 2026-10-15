import { z } from "zod";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { investmentOwner2026 } from "../inputs/investment-source.ts";
import { w2Item2026Schema } from "../inputs/w2-source.ts";
import {
  businessClaim2026Schema,
  resolveBusinessQbi2026,
} from "../inputs/business-qbi.ts";
import { FilingStatus } from "../../nodes/types.ts";

export const businessClaimInput2026Schema = z.object({
  claim: businessClaim2026Schema,
}).strict();
export const businessInput2026Schema = investmentOwner2026.extend({
  claim: businessClaim2026Schema.optional(),
  unsupported_payroll_sources: z.array(z.string()).default([]),
  w2_sources_2026: z.array(w2Item2026Schema).default([]),
  tax_residency: z.enum([
    "full_year_citizen_or_resident",
    "nonresident_or_dual_status",
  ]).optional(),
}).strict();
export type BusinessInput2026 = z.input<typeof businessInput2026Schema>;
export function calculateBusiness2026(raw: BusinessInput2026) {
  const input = businessInput2026Schema.parse(raw);
  if (!input.claim) {
    if (
      input.w2_sources_2026.some((w) =>
        w.box13_statutory_employee || w.schedule_c_business_reference
      )
    ) {
      throw new Error(
        "Statutory W-2 needs a complete linked 2026 business inventory",
      );
    }
    return { source_input: input, calculation: undefined };
  }
  if (input.unsupported_payroll_sources.length) {
    throw new Error(
      "Business SE needs joint source reconciliation with Form 4137, Form 8919 or RRTA",
    );
  }
  if (input.tax_residency !== "full_year_citizen_or_resident") {
    throw new Error(
      "Business source route needs reviewed full-year citizen/resident status",
    );
  }
  const calculation = resolveBusinessQbi2026({
    ...input.claim,
    filing_status: input.filing_status,
    taxpayer_tin: input.taxpayer_ssn.replaceAll("-", ""),
    ...(input.filing_status === FilingStatus.MFJ && input.spouse_ssn
      ? {
        spouse_tin: input.spouse_ssn.replaceAll("-", ""),
      }
      : {}),
    w2s: input.w2_sources_2026,
  });
  // C-only net losses need their reviewed Form 461 handoff. Linked land sources
  // are finalized by the combined owner before AGI and deduction selection.
  const netAfterSe = calculation.business.schedule1_line3 -
    calculation.business.schedule1_line15;
  if (
    !calculation.source_input.loss_limit_review &&
    !calculation.source_input.qbi_review.linked_land_qbi_inventory_reference &&
    netAfterSe < -(input.filing_status === FilingStatus.MFJ ? 512000 : 256000)
  ) {
    throw new Error(
      "Business loss needs the 2026 Form 461 and carryover owner",
    );
  }
  return { source_input: input, calculation };
}

class Business2026Node extends TaxNode<typeof businessInput2026Schema> {
  readonly nodeType = "schedule_c";
  readonly inputSchema = businessInput2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return [
      "form461",
      "land_dispositions",
      "agi_aggregator",
      "schedule1",
      "schedule2",
      "form8959",
      "standard_deduction",
      "vehicle_loan_interest",
      "form2441",
    ];
  }
  compute(ctx: NodeContext, raw: BusinessInput2026) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Business sources require f1040:2026 context");
    }
    const result = calculateBusiness2026(raw);
    if (!result.calculation) return { outputs: [] };
    const r = result.calculation, b = r.business;
    const income = {
      line3_schedule_c: b.schedule1_line3,
      line15_se_deduction: b.schedule1_line15,
    };
    return {
      outputs: [
        {
          nodeType: "vehicle_loan_interest",
          fields: {
            business_vehicle_vins_2026: b.businesses.flatMap((row) =>
              row.vehicle ? [row.vehicle.source.vin] : []
            ),
          },
        },
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "land_dispositions",
          fields: { business_sources_2026: r.source_input },
        },
        {
          nodeType: "form461",
          fields: { business_sources_2026: r.source_input },
        },
        {
          nodeType: "agi_aggregator",
          fields: { ...income, business_sources_2026: r.source_input },
        },
        { nodeType: "schedule1", fields: income },
        {
          nodeType: "form2441",
          fields: { business_sources_2026: r.source_input },
        },
        {
          nodeType: "schedule2",
          fields: { line4_self_employment_tax: b.schedule2_line4 },
        },
        {
          nodeType: "standard_deduction",
          fields: { business_sources_2026: r.source_input },
        },
        {
          nodeType: "form8959",
          fields: {
            schedule_se_medicare_sources_2026: b.owners.filter((o) =>
              o.schedule_se
            ).map((o) => ({
              employee_ssn: o.owner_tin,
              source_reference:
                `schedule-se:${r.source_input.record_reference}:${o.owner_tin}`,
              amount: Math.round(o.schedule_se!.line6),
            })),
          },
        },
      ],
    };
  }
}
export const business_2026 = new Business2026Node();
