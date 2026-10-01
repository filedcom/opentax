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
    allowedDebt1,
    allowedDebt2,
    carryover,
  } = projectReviewedStockLoss7203(
    rawFields,
    context?.pending ?? {},
    context?.filer,
  );
  const repayment = note?.principal_repayment?.amount ?? 0;
  const debtAfterRepayment = (note?.cash_advance_amount ?? 0) - repayment;
  const secondAdvance = note?.second_formal_note?.cash_advance_amount ?? 0;
  const totalAdvance = (note?.cash_advance_amount ?? 0) + secondAdvance;
  const totalDebtAfterRepayment = debtAfterRepayment + secondAdvance;
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
        repayment > 0 ? element("PrincipalDebtRepaymentAmt", repayment) : "",
        element("LoanBalanceEndTaxYrAmt", debtAfterRepayment),
        element("DebtBasisBeginTaxYrAmt", 0),
        element("DebtBasisBfrRepaymentAmt", note.cash_advance_amount),
        element("DebtLoanRepaymentPct", "1.0000"),
        repayment > 0 ? element("NontaxableDebtRepaymentAmt", repayment) : "",
        element("DebtBasisBfrExpnssLossAmt", debtAfterRepayment),
        element("DebtBasisBeforeLossDedAmt", debtAfterRepayment),
        element("AllowableLossAmt", allowedDebt1),
        element("DebtBasisEndTaxYrAmt", debtAfterRepayment - allowedDebt1),
      ])
      : "",
    note?.second_formal_note
      ? elements("ShareholderDebtBasisGrp", [
        element("FormalNoteInd", "X"),
        element("LoanBalanceBeginTaxYrAmt", 0),
        element("AdditionalLoansAmt", secondAdvance),
        element("LoanedBeginningBalAmt", secondAdvance),
        element("LoanBalanceEndTaxYrAmt", secondAdvance),
        element("DebtBasisBeginTaxYrAmt", 0),
        element("DebtBasisBfrRepaymentAmt", secondAdvance),
        element("DebtLoanRepaymentPct", "1.0000"),
        element("DebtBasisBfrExpnssLossAmt", secondAdvance),
        element("DebtBasisBeforeLossDedAmt", secondAdvance),
        element("AllowableLossAmt", allowedDebt2),
        element("DebtBasisEndTaxYrAmt", secondAdvance - allowedDebt2),
      ])
      : "",
    note ? element("TotLoanBalanceBeginTaxYrAmt", 0) : "",
    note ? element("TotAdditionalLoansAmt", totalAdvance) : "",
    note ? element("TotLoanedBeginningBalAmt", totalAdvance) : "",
    note && repayment > 0 ? element("TotPrincipalDebtRepaymentAmt", repayment) : "",
    note ? element("TotLoanBalanceEndTaxYrAmt", totalDebtAfterRepayment) : "",
    note ? element("TotDebtBasisBeginTaxYrAmt", 0) : "",
    note
      ? element("TotDebtBasisBfrRepaymentAmt", totalAdvance)
      : "",
    note && repayment > 0 ? element("TotNontaxableDebtRepaymentAmt", repayment) : "",
    note
      ? element("TotDebtBasisBfrExpnssLossAmt", totalDebtAfterRepayment)
      : "",
    note
      ? element("TotDebtBasisBeforeLossDedAmt", totalDebtAfterRepayment)
      : "",
    note
      ? element(
        "TotDebtBasisEndTaxYrAmt",
        totalDebtAfterRepayment - allowedDebt,
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
