import { form8874AIssuanceSchema } from "./issuance_schema.ts";
import { form8874BNoticeSchema } from "./recapture_notice_schema.ts";
export { form8874BNoticeSchema } from "./recapture_notice_schema.ts";
import {
  calculateForm8874Recapture,
  inputSchema as recaptureInputSchema,
} from "./recapture_node.ts";

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
    JSON.stringify(source.reviewed_form8874a) === JSON.stringify(issuance) &&
    JSON.stringify(source.reviewed_form8874b) === JSON.stringify(notice) &&
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
