import { element, elements } from "../../../mef/xml.ts";
import {
  annualInputSchema,
  type F8854AnnualInput,
} from "../../../nodes/inputs/f8854/annual.ts";
import { validateAnnualForm8854Filing } from "../../../nodes/inputs/f8854/annual_node.ts";
import { reconcileAnnualForm8854Form8949Properties } from "../../../nodes/inputs/f8854/reconcile-annual-capital.ts";
import { buildForm8854PartIFields } from "./f8854_part_i.ts";
import { eligibleWaiver, trustWaiver } from "./f8854_section_c.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

/** Annual item-level waiver statements in ReturnData1040.xsd order. */
export function buildForm8854AnnualNativeStatements(
  rawInput: F8854AnnualInput,
): string[] {
  const input = annualInputSchema.parse(rawInput);
  return [
    input.eligible_deferred_compensation_items.length
      ? elements(
        "EligDeferredCompItemStmt",
        input.eligible_deferred_compensation_items.map((item) =>
          elements("EligDeferredCompItemGrp", [
            element("Desc", item.description),
            element("IrrevocableWaiverCd", eligibleWaiver),
          ])
        ),
      )
      : "",
    input.nongrantor_trust_interests.length
      ? elements(
        "NongrantorTrustStatement",
        input.nongrantor_trust_interests.map((item) =>
          elements("NongrantorTrustInterestGrp", [
            element("Desc", item.description),
            element("NongrantorTrustInterestCd", trustWaiver),
          ])
        ),
      )
      : "",
  ].filter((xml) => xml !== "");
}

/** IRS8854 Part III children in 2025v5.4 XSD order. */
export function buildForm8854PartIII(rawInput: F8854AnnualInput): string {
  const input = annualInputSchema.parse(rawInput);
  const eligibleDistributions = input.eligible_deferred_compensation_items
    .flatMap((item) => item.distributions);
  const trustDistributions = input.nongrantor_trust_interests.flatMap((item) =>
    item.distributions
  );
  const eligibleSources = input.source_1042s.filter((source) =>
    source.income_code === "38"
  );
  const trustSources = input.source_1042s.filter((source) =>
    source.income_code === "39"
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
    ...eligibleSources.map((source) =>
      elements("EligDeferredCompItemsDistriDtl", [
        element("DistributionAmt", source.gross_income_amount),
        element("TotalTaxWithheldAmt", source.federal_tax_withheld_amount),
      ])
    ),
    element(
      "NongrantorTrustDistriInd",
      String(trustDistributions.length > 0),
    ),
    ...trustSources.map((source) =>
      elements("NongrantorTrustDistriDtl", [
        element("DistributionAmt", source.gross_income_amount),
        element("TotalTaxWithheldAmt", source.federal_tax_withheld_amount),
      ])
    ),
  ]);
}

/** Unregistered annual IRS8854 document, separate from the 2025 initial path. */
export function buildForm8854Annual(
  rawInput: F8854AnnualInput,
  binaryAttachmentIdsByFileName: Readonly<Record<string, string>> = {},
  phase: "discover" | "link" = "link",
): string {
  const input = annualInputSchema.parse(rawInput);
  const paymentFileNames = [
    ...new Set(input.deferred_properties.flatMap(
      (property) =>
        property.disposition.disposed_in_2025
          ? [property.disposition.payment_confirmation_attachment_file_name]
          : [],
    )),
  ];
  const missingPaymentFile = paymentFileNames.find((fileName) =>
    !binaryAttachmentIdsByFileName[fileName]
  );
  if (phase === "link" && missingPaymentFile) {
    throw new Error(
      `Annual Form 8854 needs payment confirmation PDF attachment ${missingPaymentFile}`,
    );
  }
  const attachmentIds = paymentFileNames.flatMap((fileName) => {
    const id = binaryAttachmentIdsByFileName[fileName];
    return id ? [id] : [];
  });
  return elements(
    "IRS8854",
    [
      buildForm8854PartIFields(input.part_i, "ANNUAL"),
      buildForm8854PartIII(input),
    ],
    attachmentIds.length
      ? {
        referenceDocumentId: attachmentIds.join(" "),
        referenceDocumentName: "BinaryAttachment",
      }
      : undefined,
  );
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
    reconcileAnnualForm8854Form8949Properties(
      input,
      context?.pending?.form8949,
    );
    return buildForm8854Annual(
      input,
      context?.documentIdsByAttachmentFileName ?? {},
      context?.documentIdsByPendingKey ? "link" : "discover",
    );
  },
};
