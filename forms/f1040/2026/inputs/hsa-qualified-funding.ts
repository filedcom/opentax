import { hsaRolloverReview2026Schema } from "./hsa-rollover-source.ts";
import {
  calculateForm4852Bridge2026,
  form4852Bridge2026Schema,
} from "./form4852-bridge.ts";
import { hsaDistributionSources2026Schema } from "./hsa-distribution-source.ts";
import { hsaNonreportableReview2026Schema } from "./hsa-nonreportable-schema.ts";
import type { z } from "zod";
import {
  calculateHsaContributionLimits2026,
  hsaContributionLimits2026Schema,
} from "./hsa-contribution-limits.ts";
import { hsa2026 } from "../../nodes/config/2026-hsa.ts";
import {
  compareHsaAmounts,
  hsaExactAmount,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import {
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import {
  hsaFundingReview2026Schema as review,
  reconcileHsaFundingSources,
} from "./hsa-funding-evidence.ts";
export const hsaQualifiedFunding2026Schema = hsaContributionLimits2026Schema
  .extend({
    qualified_funding_review: review.optional(),
    form4852_sources_2026: form4852Bridge2026Schema.optional(),
    rollover_review: hsaRolloverReview2026Schema.optional(),
    rollover_distribution_sources: hsaDistributionSources2026Schema.optional(),
    nonreportable_review: hsaNonreportableReview2026Schema.optional(),
    nonreportable_distribution_sources: hsaDistributionSources2026Schema
      .optional(),
  }).strict();
export type HsaQualifiedFunding2026 = z.input<
  typeof hsaQualifiedFunding2026Schema
>;

/** Reconcile qualified transfers for Part I, retaining IRA sources for annual
 * basis and retirement-income settlement. This is not an IRA exclusion output
 * or a completed testing-period/Part III calculation. */
export function reconcileHsaQualifiedFunding2026(raw: HsaQualifiedFunding2026) {
  const {
    qualified_funding_review: reviewed,
    form4852_sources_2026,
    rollover_review,
    rollover_distribution_sources,
    nonreportable_review,
    nonreportable_distribution_sources,
    ...source
  } = hsaQualifiedFunding2026Schema.parse(raw);
  const substitutes = form4852_sources_2026
    ? calculateForm4852Bridge2026(form4852_sources_2026)
    : undefined;
  if (
    substitutes &&
    (substitutes.source_input.filing_status !== source.filing_status ||
      substitutes.source_input.taxpayer_ssn !== source.taxpayer_ssn ||
      substitutes.source_input.spouse_ssn !== source.spouse_ssn ||
      JSON.stringify(substitutes.effective_wages) !==
        JSON.stringify(source.wage_sources))
  ) {
    throw Error(
      "HSA substitute binding must use the same actual return owners and wages",
    );
  }
  const limits = calculateHsaContributionLimits2026(source);
  const receipts = source.claim.accounts.flatMap((a) =>
    a.receipts.flatMap((r) =>
      r.kind === "ira_funding_transfer" && r.received_on.startsWith("2026-")
        ? [{
          ...r,
          owner_tin: a.owner_tin,
          hsa_account_reference: a.record_reference,
        }]
        : []
    )
  );
  if (!receipts.length) {
    if (reviewed) {
      throw Error("HSA funding review has no current-year IRA receipt");
    }
    return {
      ...limits,
      qualified_funding_review: reviewed,
      rollover_review,
      rollover_distribution_sources,
      nonreportable_review,
      nonreportable_distribution_sources,
      qualified_funding: [],
    };
  }
  if (!reviewed) {
    throw Error(
      "HSA IRA deposits require tax-treatment reconciliation with their actual IRA records",
    );
  }
  const qualified = reconcileHsaFundingSources(
    2026,
    reviewed,
    receipts,
    source,
    limits.owners,
    hsa2026,
    substitutes,
  ).map((q) => {
    const { owner_tin, amount, transfers: held } = q;
    const owner = limits.owners.find((o) => o.owner_tin === owner_tin)!;
    if (compareHsaAmounts(amount, owner.exact_limits.line8) > 0) {
      throw Error(
        "HSA funding above the current owner allocation needs separate annual-limit reconciliation",
      );
    }
    if (
      compareHsaAmounts(
        amount,
        hsaExactAmount(
          sourceCents(owner.funding!.reported_ira_funding_for_2026),
          100,
        ),
      ) !== 0
    ) {
      throw Error(
        "Qualified HSA funding differs from the reconciled IRA receipts",
      );
    }
    return { owner_tin, amount, transfers: held };
  });
  return {
    ...limits,
    qualified_funding_review: reviewed,
    rollover_review,
    rollover_distribution_sources,
    nonreportable_review,
    nonreportable_distribution_sources,
    qualified_funding: qualified,
  };
}
