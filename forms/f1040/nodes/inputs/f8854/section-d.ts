import { z } from "zod";
import {
  allocateMarkToMarketExclusion,
  wholeDollarAssets,
} from "./mark-to-market.ts";
import { type SectionC, sectionCSchema } from "./section-c.ts";

const hypotheticalReturnSchema = z.object({
  attachment_file_name: z.string().trim().min(1),
  form_1040_line_24_tax: z.number().int().nonnegative().refine(
    Number.isSafeInteger,
    "Hypothetical Form 1040 tax must be a safe integer dollar amount",
  ),
}).strict();

export const sectionDSchema = z.discriminatedUnion("elect_deferral", [
  z.object({
    elect_deferral: z.literal(false),
  }).strict(),
  z.object({
    elect_deferral: z.literal(true),
    hypothetical_return_with_877a: hypotheticalReturnSchema,
    hypothetical_return_without_877a: hypotheticalReturnSchema,
    deferred_property_item_ids: z.array(z.string().trim().min(1)).min(1)
      .max(20).refine((ids) => new Set(ids).size === ids.length, {
        message: "Deferred Form 8854 property IDs must be unique",
      }),
    tax_deferral_agreement_copy_attachment_file_name: z.string().trim().min(1),
    original_agreement_request_marked_original_confirmed: z.literal(true),
    original_agreement_request_mailed_confirmed: z.literal(true),
    agreement_copy_marked_copy_confirmed: z.literal(true),
    adequate_security_confirmed: z.literal(true),
    us_limited_agent_appointed_confirmed: z.literal(true),
    treaty_collection_waiver_confirmed: z.literal(true),
  }).strict(),
]).superRefine((section, ctx) => {
  if (!section.elect_deferral) return;
  if (
    section.hypothetical_return_with_877a.attachment_file_name ===
      section.hypothetical_return_without_877a.attachment_file_name
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Section D needs two distinct hypothetical returns",
      path: ["hypothetical_return_without_877a", "attachment_file_name"],
    });
  }
  if (
    section.tax_deferral_agreement_copy_attachment_file_name ===
      section.hypothetical_return_with_877a.attachment_file_name ||
    section.tax_deferral_agreement_copy_attachment_file_name ===
      section.hypothetical_return_without_877a.attachment_file_name
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Section D agreement copy needs its own PDF attachment",
      path: ["tax_deferral_agreement_copy_attachment_file_name"],
    });
  }
  if (
    section.hypothetical_return_with_877a.form_1040_line_24_tax <=
      section.hypothetical_return_without_877a.form_1040_line_24_tax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Section D deferral needs positive tax attributable to section 877A(a)",
      path: ["hypothetical_return_with_877a", "form_1040_line_24_tax"],
    });
  }
});

export type SectionD = z.infer<typeof sectionDSchema>;

export type DeferredPropertyAllocation = {
  itemId: string;
  description: string;
  gainAfterExclusion: number;
  totalGainAfterExclusion: number;
  taxEligibleForDeferral: number;
  deferredTax: number;
};

/** Allocate the two-return tax difference over every gain property first. */
export function calculateSectionDDeferral(
  rawSectionC: SectionC,
  rawSectionD: SectionD,
): {
  taxEligibleForDeferral: number;
  totalDeferredTax: number;
  properties: DeferredPropertyAllocation[];
} | null {
  const sectionD = sectionDSchema.parse(rawSectionD);
  if (!sectionD.elect_deferral) return null;
  const sectionC = sectionCSchema.parse(rawSectionC);
  if (sectionC.mark_to_market_assets.length > 20) {
    throw new Error("Form 8854 Section D supports at most 20 property rows");
  }
  const assets = wholeDollarAssets(sectionC);
  const allocations = allocateMarkToMarketExclusion(assets);
  const gainRows = allocations.map((row, index) => ({
    itemId: assets[index].item_id,
    description: row.description,
    gainAfterExclusion: row.gainAfterExclusion,
  })).filter((row) => row.gainAfterExclusion > 0);
  const totalGain = gainRows.reduce(
    (sum, row) => sum + row.gainAfterExclusion,
    0,
  );
  if (!Number.isSafeInteger(totalGain) || totalGain <= 0) {
    throw new Error("Section D deferral requires positive mark-to-market gain");
  }
  const selected = new Set(sectionD.deferred_property_item_ids);
  for (const id of selected) {
    if (!gainRows.some((row) => row.itemId === id)) {
      throw new Error(
        `Section D deferred property is absent or has no gain: ${id}`,
      );
    }
  }
  const eligibleTax =
    sectionD.hypothetical_return_with_877a.form_1040_line_24_tax -
    sectionD.hypothetical_return_without_877a.form_1040_line_24_tax;
  if (!Number.isSafeInteger(eligibleTax)) {
    throw new Error("Section D tax difference exceeds safe integer precision");
  }
  const shares = gainRows.map((row, index) => {
    const numerator = BigInt(row.gainAfterExclusion) * BigInt(eligibleTax);
    const denominator = BigInt(totalGain);
    return {
      index,
      floor: Number(numerator / denominator),
      remainder: numerator % denominator,
    };
  });
  const remainderDollars = eligibleTax -
    shares.reduce((sum, share) => sum + share.floor, 0);
  const bonusIndices = new Set(
    [...shares].sort((a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder > b.remainder
        ? -1
        : 1
    ).slice(0, remainderDollars).map((share) => share.index),
  );
  const properties = gainRows.map((row, index) => {
    const allocatedTax = shares[index].floor +
      (bonusIndices.has(index) ? 1 : 0);
    return {
      ...row,
      totalGainAfterExclusion: totalGain,
      taxEligibleForDeferral: eligibleTax,
      deferredTax: selected.has(row.itemId) ? allocatedTax : 0,
    };
  });
  if (
    properties.some((row) => selected.has(row.itemId) && row.deferredTax <= 0)
  ) {
    throw new Error(
      "Section D selected property must have positive allocable deferred tax",
    );
  }
  const totalDeferredTax = properties.reduce(
    (sum, row) => sum + row.deferredTax,
    0,
  );
  if (totalDeferredTax <= 0) {
    throw new Error(
      "Section D selected properties have no allocable deferred tax",
    );
  }
  return { taxEligibleForDeferral: eligibleTax, totalDeferredTax, properties };
}
