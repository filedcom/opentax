import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";

export function buildReviewedStockLoss7203(
  rawFields: Record<string, unknown>,
  context?: MefBuildContext,
): string {
  const { source, ledger, basis, currentLoss, allowed, carryover } =
    projectReviewedStockLoss7203(
      rawFields,
      context?.pending ?? {},
      context?.filer,
    );
  const lossGroup = (amount: number) =>
    [
      element("OrdinaryBusinessLossAmt", amount),
      element("TotalAllowableLossAmt", amount),
    ];

  // Element sequence and Part III group structure match local TY2025v5.4
  // Shared/IRS7203/IRS7203.xsd. No debt group or prior-year column is emitted.
  return elements("IRS7203", [
    element("ShareholderPersonNm", ledger.shareholder_name_as_on_k1),
    element("ShareholderSSN", ledger.shareholder_ssn),
    elements("SCorporationName", [
      element("BusinessNameLine1Txt", source.corporation_name),
    ]),
    element("SCorporationEIN", ledger.corporation_ein),
    element("OriginalShareholderInd", "X"),
    element("StockBasisBeginTaxYearAmt", basis),
    element("StockBasisBfrDistributionsAmt", basis),
    element("StockBasisAftrDistributionsAmt", basis),
    basis > 0 ? element("StockBasisBeforeLossDedAmt", basis) : "",
    basis > 0 ? element("TotalDecreaseStockBasisAmt", allowed) : "",
    element("StockBasisEndTaxYearAmt", basis - allowed),
    elements("ShrCurrentYrLossDeductionsGrp", lossGroup(currentLoss)),
    basis > 0
      ? elements("ShrAllwblLossFromStockBasisGrp", lossGroup(allowed))
      : "",
    carryover > 0
      ? elements("ShrCarryoverAmountsGrp", lossGroup(carryover))
      : "",
  ]);
}

export const form7203StockLoss: MefFormDescriptor<
  "form7203",
  Record<string, unknown>
> = {
  pendingKey: "form7203",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f7203.pdf",
  build(fields, context) {
    if (Object.keys(fields).length === 0) return "";
    return buildReviewedStockLoss7203(fields, context);
  },
};
