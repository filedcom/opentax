import { z } from "zod";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { investmentOwner2026 } from "../inputs/investment-source.ts";
import { landDispositionSource2026Schema } from "../inputs/land-disposition-source.ts";
import {
  landDispositionBridge2026Schema,
  landNiitExclusion2026,
} from "../inputs/land-disposition-bridge.ts";
import { businessLossReview2026Schema } from "../inputs/business-loss-source.ts";
import { landBusinessLossSource2026Schema } from "../inputs/land-business-loss.ts";
import { landQbiSource2026Schema } from "../inputs/land-qbi.ts";
import {
  combinedQbiSource2026Schema,
  reconcileCombinedBusiness2026,
  resolveCombinedQbi2026,
} from "../inputs/combined-qbi.ts";
import {
  businessReturnSource2026Schema,
  resolveBusinessQbi2026,
} from "../inputs/business-qbi.ts";
import { qbiPriorLoss2026Schema } from "../inputs/qbi-common.ts";
import {
  capitalGainInput2026Schema,
  capitalResultOutputs2026,
} from "./capital-gains.ts";

/** Original evidence and reviews only: finalized loss and return amounts are derived. */
export const landDispositionClaim2026Schema = z.object({
  dispositions: landDispositionSource2026Schema.shape.claim,
  reconciliation: landDispositionBridge2026Schema.shape.reconciliation,
  niit_review: landDispositionBridge2026Schema.shape.niit_review.unwrap(),
  loss_review: businessLossReview2026Schema,
  loss_allocation_review:
    landBusinessLossSource2026Schema.shape.allocation_review,
  land_qbi_review: landQbiSource2026Schema.shape.review,
  combined_qbi_review: combinedQbiSource2026Schema.shape.review,
  prior_qbi_losses: qbiPriorLoss2026Schema,
}).strict();
export const landDispositionClaimInput2026Schema = z.object({
  claim: landDispositionClaim2026Schema,
}).strict();
export const landDispositionInput2026Schema = investmentOwner2026.extend({
  claim: landDispositionClaim2026Schema.optional(),
  capital_sources_2026: capitalGainInput2026Schema.optional(),
  business_sources_2026: businessReturnSource2026Schema.optional(),
  tax_residency: z.enum([
    "full_year_citizen_or_resident",
    "nonresident_or_dual_status",
  ]).optional(),
}).strict();
export function calculateLandReturn2026(
  raw: z.input<typeof landDispositionInput2026Schema>,
) {
  const input = landDispositionInput2026Schema.parse(raw), claim = input.claim;
  const capital = input.capital_sources_2026,
    business = input.business_sources_2026;
  if (!claim) {
    if (capital || business?.qbi_review.linked_land_qbi_inventory_reference) {
      throw new Error(
        "Linked land inventory needs its original disposition claim and reviews",
      );
    }
    return { source_input: input, calculation: undefined };
  }
  if (input.tax_residency !== "full_year_citizen_or_resident") {
    throw new Error(
      "Land source route needs reviewed full-year citizen/resident status",
    );
  }
  if (!capital || capital.land_sources_2026) {
    throw new Error(
      "Land needs its linked original capital inventory without finalized loss overrides",
    );
  }
  const owner = investmentOwner2026.parse({
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
  });
  const resolvedBusiness = business
    ? resolveBusinessQbi2026(business)
    : undefined;
  const review = resolvedBusiness?.source_input.qbi_review;
  const componentReview = review
    ? (() => {
      const {
        prior_losses: _prior,
        no_current_qbi_sources_other_than_listed_businesses: _complete,
        linked_land_qbi_inventory_reference: _land,
        ...component
      } = review;
      return component;
    })()
    : undefined;
  const ref = claim.dispositions.record_reference;
  const source = combinedQbiSource2026Schema.parse({
    land_sources: {
      loss_sources: {
        record_reference: `land-loss:${ref}`,
        loss_sources: {
          ...owner,
          record_reference: `form461:${ref}`,
          business_sources: resolvedBusiness?.business.source_input,
          capital_sources: {
            ...capital,
            land_sources_2026: {
              source: { ...owner, claim: claim.dispositions },
              reconciliation: claim.reconciliation,
              niit_review: claim.niit_review,
            },
          },
          review: claim.loss_review,
        },
        allocation_review: claim.loss_allocation_review,
      },
      review: claim.land_qbi_review,
    },
    business_review: componentReview,
    prior_losses: claim.prior_qbi_losses,
    review: claim.combined_qbi_review,
  });
  if (business) reconcileCombinedBusiness2026(business, source);
  const calculation = resolveCombinedQbi2026(source);
  // Validate the activity inventory even when MAGI is below the NIIT threshold.
  landNiitExclusion2026(calculation.land.loss.calculation.capital.land!);
  return { source_input: input, calculation };
}
class LandDispositions2026Node
  extends TaxNode<typeof landDispositionInput2026Schema> {
  readonly nodeType = "land_dispositions";
  readonly inputSchema = landDispositionInput2026Schema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return [
      "form461",
      "f1040",
      "agi_aggregator",
      "schedule1",
      "income_tax_calculation",
      "form6251",
      "form8960",
      "capital_loss_carryover",
      "standard_deduction",
      "eitc",
    ];
  }
  compute(
    ctx: NodeContext,
    raw: z.input<typeof landDispositionInput2026Schema>,
  ) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Land sources require f1040:2026 context");
    }
    const result = calculateLandReturn2026(raw), c = result.calculation;
    if (!c) return { outputs: [] };
    const capital = c.land.loss.calculation.capital;
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        ...capitalResultOutputs2026(capital).outputs,
        {
          nodeType: "form461",
          fields: { combined_qbi_sources_2026: c.source_input },
        },
        {
          nodeType: "agi_aggregator",
          fields: { line4_other_gains: capital.ordinary_disposition_gain_loss },
        },
        {
          nodeType: "schedule1",
          fields: {
            line4_other_gains: capital.ordinary_disposition_gain_loss,
            line4_from_form4797: true,
            line4_from_form4684: false,
          },
        },
      ],
    };
  }
}
export const land_dispositions_2026 = new LandDispositions2026Node();
