import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const dollars = z.number().finite().nonnegative().refine(Number.isSafeInteger);

/** Reviewed fields from one signed CDE Form 8874-B; this is an event notice. */
export const form8874BNoticeSchema = z.object({
  notice_document_reference: z.string().trim().min(1),
  cde_name: z.string().trim().min(1),
  cde_ein: z.string().regex(/^\d{9}$/),
  investor_name: z.string().trim().min(1),
  investor_tin: z.string().regex(/^\d{9}$/),
  initial_investment_date: date,
  qualified_equity_investment_amount: dollars.refine((amount) => amount > 0),
  recapture_event_date: date,
  notice_credit_amount: dollars,
  recapture_event: z.enum([
    "cde_certification_revoked",
    "substantially_all_requirement_failed",
    "cde_redeemed_investment",
  ]),
  aggregate_decrease_by_credit_year: z.tuple([
    dollars,
    dollars,
    dollars,
    dollars,
    dollars,
    dollars,
    dollars,
  ]),
  cde_official_signed_notice_confirmed: z.literal(true),
  cde_awareness_date: date,
  cde_signature_date: date,
  notice_provided_to_investor_date: date,
}).strict().superRefine((notice, ctx) => {
  const event = Date.parse(`${notice.recapture_event_date}T00:00:00Z`);
  const aware = Date.parse(`${notice.cde_awareness_date}T00:00:00Z`);
  const signed = Date.parse(`${notice.cde_signature_date}T00:00:00Z`);
  const provided = Date.parse(
    `${notice.notice_provided_to_investor_date}T00:00:00Z`,
  );
  if (
    aware < event || signed < aware || provided < signed ||
    provided - aware > 60 * 86_400_000
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["notice_provided_to_investor_date"],
      message:
        "Signed Form 8874-B must reach the holder within 60 days after CDE awareness",
    });
  }
});
