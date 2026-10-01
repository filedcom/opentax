import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";

export function buildReviewedStockLoss7203(
  rawFields: Record<string, unknown>,
  context?: MefBuildContext,
): string {
  const {
    source,
    ledger,
    basis,
    contribution,
    availableBasis,
    note,
    currentLoss,
    allowedStock,
    allowedDebt,
    carryover,
  } = projectReviewedStockLoss7203(
    rawFields,
    context?.pending ?? {},
    context?.filer,
  );
  const lossGroup = (amount: number) => [
    element("OrdinaryBusinessLossAmt", amount),
    element("TotalAllowableLossAmt", amount),
  ];

  // Element sequence follows local TY2025v5.4 Shared/IRS7203/IRS7203.xsd.
  return elements("IRS7203", [
    element("ShareholderPersonNm", ledger.shareholder_name_as_on_k1),
    element("ShareholderSSN", ledger.shareholder_ssn),
    elements("SCorporationName", [
      element("BusinessNameLine1Txt", source.corporation_name),
    ]),
    element("SCorporationEIN", ledger.corporation_ein),
    element("OriginalShareholderInd", "X"),
    element("StockBasisBeginTaxYearAmt", basis),
    contribution > 0
      ? element("CapitalContributionBasisAmt", contribution)
      : "",
    element("StockBasisBfrDistributionsAmt", availableBasis),
    element("StockBasisAftrDistributionsAmt", availableBasis),
    availableBasis > 0
      ? element("StockBasisBeforeLossDedAmt", availableBasis)
      : "",
    availableBasis > 0
      ? element("TotalDecreaseStockBasisAmt", allowedStock)
      : "",
    element("StockBasisEndTaxYearAmt", availableBasis - allowedStock),
    note
      ? elements("ShareholderDebtBasisGrp", [
        element("FormalNoteInd", "X"),
        element("LoanBalanceBeginTaxYrAmt", 0),
        element("AdditionalLoansAmt", note.cash_advance_amount),
        element("LoanedBeginningBalAmt", note.cash_advance_amount),
        element("LoanBalanceEndTaxYrAmt", note.cash_advance_amount),
        element("DebtBasisBeginTaxYrAmt", 0),
        element("DebtBasisBfrRepaymentAmt", note.cash_advance_amount),
        element("DebtLoanRepaymentPct", "1.0000"),
        element("DebtBasisBfrExpnssLossAmt", note.cash_advance_amount),
        element("DebtBasisBeforeLossDedAmt", note.cash_advance_amount),
        element("AllowableLossAmt", allowedDebt),
        element("DebtBasisEndTaxYrAmt", note.cash_advance_amount - allowedDebt),
      ])
      : "",
    note ? element("TotLoanBalanceBeginTaxYrAmt", 0) : "",
    note ? element("TotAdditionalLoansAmt", note.cash_advance_amount) : "",
    note ? element("TotLoanedBeginningBalAmt", note.cash_advance_amount) : "",
    note ? element("TotLoanBalanceEndTaxYrAmt", note.cash_advance_amount) : "",
    note ? element("TotDebtBasisBeginTaxYrAmt", 0) : "",
    note
      ? element("TotDebtBasisBfrRepaymentAmt", note.cash_advance_amount)
      : "",
    note
      ? element("TotDebtBasisBfrExpnssLossAmt", note.cash_advance_amount)
      : "",
    note
      ? element("TotDebtBasisBeforeLossDedAmt", note.cash_advance_amount)
      : "",
    note
      ? element(
        "TotDebtBasisEndTaxYrAmt",
        note.cash_advance_amount - allowedDebt,
      )
      : "",
    elements("ShrCurrentYrLossDeductionsGrp", lossGroup(currentLoss)),
    availableBasis > 0
      ? elements("ShrAllwblLossFromStockBasisGrp", lossGroup(allowedStock))
      : "",
    note
      ? elements("ShrAllwblLossFromDebtBasisGrp", lossGroup(allowedDebt))
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
