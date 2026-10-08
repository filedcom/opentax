import { z } from "zod";

// The fiduciary's reviewed property statement supplies facts that K-1 box 14
// code M cannot carry. This record does not, by itself, authorize a credit.
export const trustPartVStatementSchema = z.object({
  source_document_reference: z.string().trim().min(1),
  statement_reference: z.string().trim().min(1),
  reviewed_on: z.string().date(),
  reviewer_reference: z.string().trim().min(1),
  issuer_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  issuer_ein: z.string().regex(/^\d{9}$/),
  beneficiary_ssn: z.string().regex(/^\d{9}$/),
  facility_type: z.literal("solar"),
  facility_address: z.object({
    line1: z.string().trim().min(1).max(35).regex(
      /^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/,
    ),
    city: z.string().trim().min(1).max(22).regex(/^([A-Za-z] ?)*[A-Za-z]$/),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  }).strict(),
  construction_started_on: z.string().date(),
  placed_in_service_on: z.string().date(),
  net_output_kw_ac: z.number().finite().positive().lt(1000),
  beneficiary_allocated_qualified_basis: z.number().int().positive(),
  beneficiary_allocated_credit: z.number().int().positive(),
  beneficiary_nonpassive_activity_reviewed: z.literal(true),
  generation_emissions_rate_zero: z.literal(true),
  no_prior_or_current_incompatible_section38_credit: z.literal(true),
  no_interconnection_property: z.literal(true),
  no_domestic_content_or_energy_community_bonus: z.literal(true),
  no_subsidized_financing_or_private_activity_bonds: z.literal(true),
  no_elective_payment_or_transfer: z.literal(true),
  no_cooperative_credit: z.literal(true),
  not_section48d_lessee_confirmed: z.literal(true),
}).strict().superRefine((statement, ctx) => {
  if (
    statement.construction_started_on > statement.placed_in_service_on ||
    !statement.placed_in_service_on.startsWith("2025-")
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["placed_in_service_on"],
      message: "Form 3468 Part V needs a 2025 service date after construction",
    });
  }
  const credit = Math.round(
    statement.beneficiary_allocated_qualified_basis * .3,
  );
  if (statement.beneficiary_allocated_credit !== credit) {
    ctx.addIssue({
      code: "custom",
      path: ["beneficiary_allocated_credit"],
      message:
        "Trust Form 3468 Part V credit must equal 30% of allocated basis",
    });
  }
});

export type TrustPartVStatement = z.infer<typeof trustPartVStatementSchema>;

export function reconcileTrustPartVStatement(
  statement: TrustPartVStatement,
  source: {
    readonly estate_trust_ein?: string;
    readonly source_document_reference?: string;
    readonly beneficiary_ssn?: string;
    readonly box14_code_m_clean_electricity_investment_information?: true;
  },
): void {
  if (
    statement.issuer_ein !== source.estate_trust_ein ||
    statement.source_document_reference !== source.source_document_reference ||
    statement.beneficiary_ssn !== source.beneficiary_ssn ||
    source.box14_code_m_clean_electricity_investment_information !== true
  ) {
    throw new Error(
      "Trust Form 3468 Part V statement does not match the K-1 issuer, beneficiary, source, and box 14 code M",
    );
  }
}
