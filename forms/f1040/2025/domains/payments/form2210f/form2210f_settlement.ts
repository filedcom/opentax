import { z } from "zod";
import { sha256Hex } from "../../execution/prepared-source.ts";
import {
  calculateForm2210FBoxB,
  form2210FBoxBInputSchema,
  type Form2210FBoxBLines,
} from "./form2210f_box_b.ts";

const date2026 = z.string().regex(/^2026-\d{2}-\d{2}$/).refine((value) =>
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
);

export const form2210FBoxBSettlementSchema = z.object({
  tax_year_applied: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  irs_payment_confirmation_reference: z.string().trim().min(1),
  payment_source_reference: z.string().trim().min(1),
  payment_source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  effective_payment_date: date2026,
  applied_to_form2210f_underpayment: z.number().int().positive(),
  no_other_post_january_15_settlement: z.literal(true),
}).strict();

/** Bind the one-full-settlement calculation to a retained payment record. */
export async function bindForm2210FBoxBSettlement(
  rawSource: unknown,
  rawSettlement: unknown,
  retainedPaymentBytes: Uint8Array,
  finalFilerSsn: string,
): Promise<Form2210FBoxBLines> {
  const source = form2210FBoxBInputSchema.parse(rawSource);
  const settlement = form2210FBoxBSettlementSchema.parse(rawSettlement);
  const lines = calculateForm2210FBoxB(source);
  if (
    !/^\d{9}$/.test(finalFilerSsn.replace(/\D/g, "")) ||
    settlement.taxpayer_ssn.replace(/\D/g, "") !==
      finalFilerSsn.replace(/\D/g, "") ||
    lines.line13 === 0 ||
    settlement.effective_payment_date !== source.full_underpayment_paid_on ||
    settlement.effective_payment_date !== lines.line14 ||
    settlement.applied_to_form2210f_underpayment !== lines.line13 ||
    !(retainedPaymentBytes instanceof Uint8Array) ||
    retainedPaymentBytes.length < 8 ||
    new TextDecoder().decode(retainedPaymentBytes.subarray(0, 5)) !==
      "%PDF-" ||
    await sha256Hex(retainedPaymentBytes) !==
      settlement.payment_source_sha256
  ) {
    throw new Error(
      "Form 2210-F box B settlement differs from the filed underpayment, payment date, owner, or retained record bytes",
    );
  }
  return lines;
}
