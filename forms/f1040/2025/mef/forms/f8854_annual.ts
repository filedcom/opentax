import { element, elements } from "../../../mef/xml.ts";
import {
  annualInputSchema,
  type F8854AnnualInput,
} from "../../../nodes/inputs/f8854/annual.ts";
import { validateAnnualForm8854Filing } from "../../../nodes/inputs/f8854/annual_node.ts";
import { buildForm8854PartIFields } from "./f8854_part_i.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

/** IRS8854 Part III children in 2025v5.4 XSD order. */
export function buildForm8854PartIII(rawInput: F8854AnnualInput): string {
  const input = annualInputSchema.parse(rawInput);
  const eligibleDistributions = input.eligible_deferred_compensation_items
    .flatMap((item) => item.distributions);
  const trustDistributions = input.nongrantor_trust_interests.flatMap((item) =>
    item.distributions
  );
  return elements("AnnualExptrtStmtBfrSpcfdYrGrp", [
    ...input.deferred_properties.map((property) =>
      elements("PropTaxDeferredPYFrm8854Grp", [
        element("PropertyDesc", property.description),
        element(
          "MarkToMarketGainOrLossAmt",
          property.prior_mark_to_market_gain_or_loss_amount,
        ),
        element("DeferredTaxAmt", property.prior_deferred_tax_amount),
        property.disposition.disposed_in_2025
          ? element("DispositionDt", property.disposition.disposition_date)
          : "",
      ])
    ),
    element(
      "EligDeferredCompItemsDistriInd",
      String(eligibleDistributions.length > 0),
    ),
    ...eligibleDistributions.map((distribution) =>
      elements("EligDeferredCompItemsDistriDtl", [
        element(
          "DistributionAmt",
          distribution.amount_includible_if_us_resident,
        ),
        element("TotalTaxWithheldAmt", distribution.tax_withheld_amount),
      ])
    ),
    element(
      "NongrantorTrustDistriInd",
      String(trustDistributions.length > 0),
    ),
    ...trustDistributions.map((distribution) =>
      elements("NongrantorTrustDistriDtl", [
        element(
          "DistributionAmt",
          distribution.amount_includible_if_us_resident,
        ),
        element("TotalTaxWithheldAmt", distribution.tax_withheld_amount),
      ])
    ),
  ]);
}

/** Unregistered annual IRS8854 document, separate from the 2025 initial path. */
export function buildForm8854Annual(
  rawInput: F8854AnnualInput,
): string {
  const input = annualInputSchema.parse(rawInput);
  return elements("IRS8854", [
    buildForm8854PartIFields(input.part_i, "ANNUAL"),
    buildForm8854PartIII(input),
  ]);
}

export const form8854Annual: MefFormDescriptor<"f8854_annual", unknown> = {
  pendingKey: "f8854_annual",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8854.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    if (context?.pending?.f8854 !== undefined) {
      throw new Error(
        "One taxpayer cannot file both initial and annual Form 8854 for 2025",
      );
    }
    const input = validateAnnualForm8854Filing(annualInputSchema.parse(fields));
    return buildForm8854Annual(input);
  },
};
