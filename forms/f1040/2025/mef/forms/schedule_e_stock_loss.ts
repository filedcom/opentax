import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";

// One Schedule E Part II, line 28(a)/(b)/(d)/(e)/(i) S-corporation row.
// The same reviewed basis-limited loss must reach lines 29b, 31, 32, and 41.
export function buildReviewedStockLossScheduleE(
  rawFields: Record<string, unknown>,
  context?: MefBuildContext,
): string {
  if (Object.keys(rawFields).length === 0) return "";
  const pending = context?.pending ?? {};
  if (Object.keys((pending.schedule_e ?? {}) as Record<string, unknown>).length > 0) {
    throw new Error("Stock-only Schedule E cannot combine with another Schedule E activity");
  }
  const { source, ledger, allowed } = projectReviewedStockLoss7203(
    rawFields,
    pending,
    context?.filer,
  );
  if (!ledger.materially_participated_in_s_corporation ||
    !ledger.no_other_schedule_e_activity ||
    !ledger.no_prior_year_suspended_losses) {
    throw new Error("Schedule E nonpassive stock loss needs reviewed activity facts");
  }
  return elements("IRS1040ScheduleE", [
    element("PriorYearsLossesInd", "false"),
    elements("PartnershipOrSCorpGroup", [
      element("PartnershipOrSCorporationNm", source.corporation_name),
      element("PartnershipSCorpCd", "S"),
      element("PartnershipOrSCorpEIN", ledger.corporation_ein),
      element("BasisComputationRequiredInd", "X"),
      allowed > 0 ? element("NonpassiveLossAmt", allowed) : "",
    ]),
    allowed > 0 ? element("TotalNonpassiveLossAmt", allowed) : "",
    allowed > 0 ? element("TotalPrtshpSCorpLossAmt", allowed) : "",
    element("NetPrtshpSCorpIncomeOrLossAmt", -allowed),
    element("TotalSuppIncomeOrLossAmt", -allowed),
  ]);
}

export const scheduleEStockLoss: MefFormDescriptor<
  "form7203",
  Record<string, unknown>
> = {
  pendingKey: "form7203",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040se--2025.pdf",
  build(fields, context) {
    return buildReviewedStockLossScheduleE(fields, context);
  },
};
