import { z } from "zod";
import { form8874AIssuanceSchema } from "./issuance_schema.ts";
import {
  calculateForm8874Recapture,
  inputSchema as recaptureInputSchema,
} from "./recapture_node.ts";

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

/** Join a reported CDE event to one issuance, the tax recapture source and Schedule 2. */
export function reconcileForm8874BReportedEvent(
  rawNotice: unknown,
  rawIssuance: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const notice = form8874BNoticeSchema.parse(rawNotice);
  const issuance = form8874AIssuanceSchema.parse(rawIssuance);
  const filer = pending.f1040 as Record<string, unknown> | undefined;
  if (
    notice.cde_name !== issuance.cde_name ||
    notice.cde_ein !== issuance.cde_ein ||
    notice.investor_name !== issuance.investor_name ||
    notice.investor_tin !== issuance.investor_tin ||
    notice.initial_investment_date !== issuance.initial_investment_date ||
    notice.qualified_equity_investment_amount !==
      issuance.qualified_equity_investment_amount ||
    notice.aggregate_decrease_by_credit_year.some((amount, index) =>
      amount > issuance.annual_credit_amounts[index]
    ) ||
    typeof filer?.taxpayer_first_name !== "string" ||
    typeof filer?.taxpayer_last_name !== "string" ||
    typeof filer?.taxpayer_ssn !== "string" ||
    `${filer.taxpayer_first_name} ${filer.taxpayer_last_name}` !==
      notice.investor_name ||
    String(filer.taxpayer_ssn ?? "").replaceAll("-", "") !== notice.investor_tin
  ) {
    throw new Error(
      "Form 8874-B QEI or investor differs from issuance and Form 1040",
    );
  }
  const recaptures = recaptureInputSchema.parse(pending.f8874_recapture);
  const matching = recaptures.recaptures.filter((source) =>
    source.notice_reference === notice.notice_document_reference &&
    source.investment_reference === issuance.notice_document_reference &&
    source.cde_name === notice.cde_name &&
    source.cde_ein === notice.cde_ein &&
    source.notice_taxpayer_tin === notice.investor_tin &&
    source.initial_investment_date === notice.initial_investment_date &&
    source.qualified_equity_investment_amount ===
      notice.qualified_equity_investment_amount &&
    source.notice_credit_amount === notice.notice_credit_amount &&
    source.recapture_event_date === notice.recapture_event_date &&
    source.recapture_event === notice.recapture_event
  );
  if (matching.length !== 1) {
    throw new Error(
      "Form 8874-B event needs one exact Form 8874 recapture source",
    );
  }
  const schedule2 = pending.schedule2 as Record<string, unknown> | undefined;
  const tax = calculateForm8874Recapture(recaptures);
  if (schedule2?.line17a_new_markets_credit_recapture !== tax) {
    throw new Error(
      "Form 8874-B recapture source differs from Schedule 2 line 17a",
    );
  }
  return { notice, issuance, recapture: matching[0], schedule2Line17a: tax };
}
