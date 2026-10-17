import { z } from "zod";
const ref = z.string().trim().min(1);
const money = z.number().int().nonnegative();
export const partnershipRecaptureSchema = z.object({
  tax_year: z.literal(2025),
  statement_reference: ref,
  section42j5_partnership_confirmed: z.literal(true),
  box20_code_f_amount: money.positive(),
  buildings: z.array(
    z.object({
      building_reference: ref,
      building_bin: z.string().regex(/^[A-Z]{2}\d{7}$/),
      building_us_address: z.object({
        line1: ref,
        city: ref,
        state: z.string().regex(/^[A-Z]{2}$/),
        zip: z.string().regex(/^\d{5}$/),
      }).strict(),
      placed_in_service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      recapture_event_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
      issuer_form8611_line17_total_including_interest: money.positive(),
      distributive_share: z.number().positive().max(1),
      allocated_code_f_amount_including_interest: money.positive(),
      issuer_allocation_reference: ref,
      recipient_unused_credit_review_reference: ref,
      no_unused_credit_for_building_confirmed: z.literal(true),
      no_other_recapture_source_for_building_confirmed: z.literal(true),
      financed_with_tax_exempt_bonds: z.literal(false),
    }).strict(),
  ).min(1),
}).strict().superRefine((s, ctx) => {
  const bins = new Set<string>();
  const refs = new Set<string>();
  let sum = 0;
  for (const b of s.buildings) {
    if (bins.has(b.building_bin) || refs.has(b.building_reference)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Recapture statement needs distinct building BINs and references",
      });
    }
    bins.add(b.building_bin);
    refs.add(b.building_reference);
    sum += b.allocated_code_f_amount_including_interest;
    if (
      Math.round(
        b.issuer_form8611_line17_total_including_interest *
          b.distributive_share,
      ) !== b.allocated_code_f_amount_including_interest
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Issued section42j5 distributive recapture allocation differs",
      });
    }
    for (const date of [b.placed_in_service_date, b.recapture_event_date]) {
      const d = new Date(date + "T00:00:00Z");
      if (
        !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== date
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Recapture source needs actual calendar dates",
        });
      }
    }
    if (b.placed_in_service_date >= b.recapture_event_date) {
      ctx.addIssue({
        code: "custom",
        message: "Building recapture event must follow placed-in-service date",
      });
    }
  }
  if (sum !== s.box20_code_f_amount) {
    ctx.addIssue({
      code: "custom",
      message: "Issued K1 codeF differs from sum of building allocations",
    });
  }
});
export const issuerIdentitySchema = z.object({
  k1_source_document_reference: ref,
  partnership_ein: z.string().regex(/^\d{9}$/),
  partnership_name: ref,
  recipient_tin: z.string().regex(/^\d{9}$/),
  statement_reference: ref,
  building_reference: ref,
  tax_year: z.literal(2025),
}).strict();
export function issuedPartnershipRecaptures(
  items: readonly {
    partnership_name: string;
    partnership_ein?: string;
    recipient_tin?: string;
    source_document_reference?: string;
    box20_code_f_lihtc_recapture?: z.infer<typeof partnershipRecaptureSchema>;
  }[],
) {
  const results = [];
  const seen = new Set<string>();
  for (const k of items) {
    if (!k.box20_code_f_lihtc_recapture) continue;
    if (
      !k.partnership_ein || !k.recipient_tin || !k.source_document_reference
    ) {
      throw new Error(
        "K1 codeF needs actual issuer EIN recipient TIN and source reference",
      );
    }
    const s = partnershipRecaptureSchema.parse(k.box20_code_f_lihtc_recapture);
    if (seen.has(k.source_document_reference)) {
      throw new Error("Duplicate issued recapture K1 source");
    }
    seen.add(k.source_document_reference);
    for (const b of s.buildings) {
      results.push({
        source_document_reference: s.statement_reference,
        recapture_year: s.tax_year,
        building_bin: b.building_bin,
        building_us_address: b.building_us_address,
        placed_in_service_date: b.placed_in_service_date,
        financed_with_tax_exempt_bonds: false,
        issuer_source: {
          k1_source_document_reference: k.source_document_reference,
          partnership_ein: k.partnership_ein,
          partnership_name: k.partnership_name,
          recipient_tin: k.recipient_tin,
          statement_reference: s.statement_reference,
          building_reference: b.building_reference,
          tax_year: s.tax_year,
        },
        calculation: {
          source_type: "pass_through" as const,
          line8_flow_through_recapture:
            b.allocated_code_f_amount_including_interest,
          line9_unused_accelerated_credit: 0,
          line11_interest_from_prior_years: 0,
          prior_unused_credits: 0,
          section42j5_partnership_interest_included: true,
        },
      });
    }
  }
  return results;
}
