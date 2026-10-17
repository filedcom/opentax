import { z } from "zod";

export enum PurchasedIntellectualPropertyKind {
  Copyright = "purchased_copyright",
  Trademark = "purchased_trademark",
  TradeName = "purchased_trade_name",
  TradeSecret = "purchased_trade_secret",
  KnowHow = "purchased_know_how",
  Software = "purchased_software",
}

const commonFields = {
  purchase_record_reference: z.string().trim().min(1),
  unamortized_basis_schedule_reference: z.string().trim().min(1),
  unamortized_adjusted_basis: z.number().positive(),
  donee_2025_net_income_statement_reference: z.string().trim().min(1),
  adjusted_basis_excludes_prior_amortization_verified: z.literal(true),
  donee_2025_net_income_zero_verified: z.literal(true),
  hypothetical_fmv_sale_gain_entirely_long_term_verified: z.literal(true),
  no_other_reduction_reason_verified: z.literal(true),
};

const patentSchema = z.object({
  ...commonFields,
  property_kind: z.literal("purchased_patent"),
  patent_number: z.string().trim().min(1),
  patent_registration_record_reference: z.string().trim().min(1),
  donor_owned_full_patent_rights_verified: z.literal(true),
  all_patent_rights_transferred_to_donee_verified: z.literal(true),
}).strict();

const otherPropertySchema = z.object({
  ...commonFields,
  property_kind: z.nativeEnum(PurchasedIntellectualPropertyKind),
  property_identifier: z.string().trim().min(1),
  legal_rights_record_reference: z.string().trim().min(1),
  transfer_record_reference: z.string().trim().min(1),
  statutory_classification_record_reference: z.string().trim().min(1),
  donor_owned_full_rights_verified: z.literal(true),
  all_rights_transferred_to_donee_verified: z.literal(true),
  copyright_not_excluded_by_sections_1221a3_or_1231b1c_verified: z.literal(true)
    .optional(),
  software_not_excluded_by_section_197e3Ai_verified: z.literal(true).optional(),
}).strict().superRefine((source, ctx) => {
  const required =
    source.property_kind === PurchasedIntellectualPropertyKind.Copyright
      ? "copyright_not_excluded_by_sections_1221a3_or_1231b1c_verified"
      : source.property_kind === PurchasedIntellectualPropertyKind.Software
      ? "software_not_excluded_by_section_197e3Ai_verified"
      : undefined;
  if (required && source[required] !== true) {
    ctx.addIssue({
      code: "custom",
      path: [required],
      message:
        "Form 8283 intellectual property needs its statutory exclusion reviewed",
    });
  }
});

export const intellectualPropertyReductionSchema = z.union([
  patentSchema,
  otherPropertySchema,
]);

export function intellectualPropertyIdentity(
  source: z.infer<typeof intellectualPropertyReductionSchema>,
) {
  if (source.property_kind === "purchased_patent") {
    return {
      label: "Purchased patent",
      identifier: source.patent_number,
      records: `Registration ${source.patent_registration_record_reference}`,
    };
  }
  return {
    label: `Purchased ${
      source.property_kind.replace("purchased_", "").replaceAll("_", " ")
    }`,
    identifier: source.property_identifier,
    records:
      `Legal rights ${source.legal_rights_record_reference}, transfer ${source.transfer_record_reference}, and statutory classification ${source.statutory_classification_record_reference}`,
  };
}
