import { projectPassiveSCorp7203Copy } from "../../passive-s-corp-loss-copies.ts";
import { buildFirstYearPassiveSCorp7203 } from "../../form7203-passive-loss-projection.ts";
import { projectOverflowDebtInventory } from "../../form7203_debt_inventory.ts";
import { element, elements } from "../../../mef/xml.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { projectReviewedStockLoss7203 } from "../../form7203_stock_loss_projection.ts";
import { sumPrincipalRepayments } from "../../../nodes/intermediate/forms/form7203/debt-note.ts";

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
    allowedDebt3,
    carryover,
  } = projectReviewedStockLoss7203(
    rawFields,
    context?.pending ?? {},
    context?.filer,
  );
  const overflow = projectOverflowDebtInventory(note, allowedDebt);
  const repayment = sumPrincipalRepayments(note?.principal_repayments);
  const debtAfterRepayment = (note?.cash_advance_amount ?? 0) - repayment;
  const secondAdvance = note?.second_formal_note?.cash_advance_amount ??
    note?.open_account_net_advance_amount ?? 0;
  const secondRepayment =
    note?.second_formal_note?.principal_repayment?.amount ?? 0;
  const secondDebtAfterRepayment = secondAdvance - secondRepayment;
  const thirdAdvance = note?.kind === "owned_2025_formal_and_open_account" &&
      note.second_formal_note
    ? note.open_account_net_advance_amount
    : undefined;
  const totalRepayment = overflow?.reduce((n, r) => n + r.repayment, 0) ??
    repayment + secondRepayment;
  const totalAdvance = overflow?.reduce((n, r) => n + r.advance, 0) ??
    (note?.cash_advance_amount ?? 0) + secondAdvance +
      (thirdAdvance ?? 0);
  const totalDebtAfterRepayment = totalAdvance - totalRepayment;
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
    ...(overflow
      ? overflow.map((r) =>
        elements("ShareholderDebtBasisGrp", [
          element(r.open ? "OpenAccountDebtInd" : "FormalNoteInd", "X"),
          element("LoanBalanceBeginTaxYrAmt", 0),
          element("AdditionalLoansAmt", r.advance),
          element("LoanedBeginningBalAmt", r.advance),
          r.repayment ? element("PrincipalDebtRepaymentAmt", r.repayment) : "",
          element("LoanBalanceEndTaxYrAmt", r.endingPrincipal),
          element("DebtBasisBeginTaxYrAmt", 0),
          element("DebtBasisBfrRepaymentAmt", r.advance),
          r.advance ? element("DebtLoanRepaymentPct", "1.0000") : "",
          r.repayment ? element("NontaxableDebtRepaymentAmt", r.repayment) : "",
          element("DebtBasisBfrExpnssLossAmt", r.endingPrincipal),
          element("DebtBasisBeforeLossDedAmt", r.endingPrincipal),
          element("AllowableLossAmt", r.loss),
          element("DebtBasisEndTaxYrAmt", r.basis),
        ])
      )
      : [
        note
          ? elements("ShareholderDebtBasisGrp", [
            note.kind === "owned_2025_open_account"
              ? element("OpenAccountDebtInd", "X")
              : element("FormalNoteInd", "X"),
            element("LoanBalanceBeginTaxYrAmt", 0),
            element("AdditionalLoansAmt", note.cash_advance_amount),
            element("LoanedBeginningBalAmt", note.cash_advance_amount),
            repayment > 0
              ? element("PrincipalDebtRepaymentAmt", repayment)
              : "",
            element("LoanBalanceEndTaxYrAmt", debtAfterRepayment),
            element("DebtBasisBeginTaxYrAmt", 0),
            element("DebtBasisBfrRepaymentAmt", note.cash_advance_amount),
            note.cash_advance_amount > 0
              ? element("DebtLoanRepaymentPct", "1.0000")
              : "",
            repayment > 0
              ? element("NontaxableDebtRepaymentAmt", repayment)
              : "",
            element("DebtBasisBfrExpnssLossAmt", debtAfterRepayment),
            element("DebtBasisBeforeLossDedAmt", debtAfterRepayment),
            element("AllowableLossAmt", allowedDebt1),
            element("DebtBasisEndTaxYrAmt", debtAfterRepayment - allowedDebt1),
          ])
          : "",
        (note?.second_formal_note ||
            note?.kind === "owned_2025_formal_and_open_account")
          ? elements("ShareholderDebtBasisGrp", [
            note?.kind === "owned_2025_formal_and_open_account" &&
              !note.second_formal_note
              ? element("OpenAccountDebtInd", "X")
              : element("FormalNoteInd", "X"),
            element("LoanBalanceBeginTaxYrAmt", 0),
            element("AdditionalLoansAmt", secondAdvance),
            element("LoanedBeginningBalAmt", secondAdvance),
            secondRepayment > 0
              ? element("PrincipalDebtRepaymentAmt", secondRepayment)
              : "",
            element("LoanBalanceEndTaxYrAmt", secondDebtAfterRepayment),
            element("DebtBasisBeginTaxYrAmt", 0),
            element("DebtBasisBfrRepaymentAmt", secondAdvance),
            secondAdvance > 0 ? element("DebtLoanRepaymentPct", "1.0000") : "",
            secondRepayment > 0
              ? element("NontaxableDebtRepaymentAmt", secondRepayment)
              : "",
            element("DebtBasisBfrExpnssLossAmt", secondDebtAfterRepayment),
            element("DebtBasisBeforeLossDedAmt", secondDebtAfterRepayment),
            element("AllowableLossAmt", allowedDebt2),
            element(
              "DebtBasisEndTaxYrAmt",
              secondDebtAfterRepayment - allowedDebt2,
            ),
          ])
          : "",
        thirdAdvance !== undefined
          ? elements("ShareholderDebtBasisGrp", [
            element("OpenAccountDebtInd", "X"),
            element("LoanBalanceBeginTaxYrAmt", 0),
            element("AdditionalLoansAmt", thirdAdvance),
            element("LoanedBeginningBalAmt", thirdAdvance),
            element("LoanBalanceEndTaxYrAmt", thirdAdvance),
            element("DebtBasisBeginTaxYrAmt", 0),
            element("DebtBasisBfrRepaymentAmt", thirdAdvance),
            thirdAdvance > 0 ? element("DebtLoanRepaymentPct", "1.0000") : "",
            element("DebtBasisBfrExpnssLossAmt", thirdAdvance),
            element("DebtBasisBeforeLossDedAmt", thirdAdvance),
            element("AllowableLossAmt", allowedDebt3),
            element("DebtBasisEndTaxYrAmt", thirdAdvance - allowedDebt3),
          ])
          : "",
      ]),
    note ? element("TotLoanBalanceBeginTaxYrAmt", 0) : "",
    note ? element("TotAdditionalLoansAmt", totalAdvance) : "",
    note ? element("TotLoanedBeginningBalAmt", totalAdvance) : "",
    note && totalRepayment > 0
      ? element("TotPrincipalDebtRepaymentAmt", totalRepayment)
      : "",
    note ? element("TotLoanBalanceEndTaxYrAmt", totalDebtAfterRepayment) : "",
    note ? element("TotDebtBasisBeginTaxYrAmt", 0) : "",
    note ? element("TotDebtBasisBfrRepaymentAmt", totalAdvance) : "",
    note && totalRepayment > 0
      ? element("TotNontaxableDebtRepaymentAmt", totalRepayment)
      : "",
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
    if (fields.current_passive_s_corp_loss !== undefined) {
      const p = projectPassiveSCorp7203Copy(
        fields,
        context?.pending,
        context?.filer,
      );
      return buildFirstYearPassiveSCorp7203(
        p.source,
        p.k1,
        context?.filer,
      );
    }
    if (Array.isArray(fields.owned_debt_loss_sources)) {
      return buildReviewedStockLoss7203({
        owned_debt_loss_sources: fields.owned_debt_loss_sources,
        owned_debt_loss_copy_index: 0,
      }, context);
    }
    return buildReviewedStockLoss7203(fields, context);
  },
  buildAdditionalDocuments(fields, context) {
    if (!Array.isArray(fields.owned_debt_loss_sources)) return [];
    return fields.owned_debt_loss_sources.slice(1).map((_, i) =>
      buildReviewedStockLoss7203({
        owned_debt_loss_sources: fields.owned_debt_loss_sources,
        owned_debt_loss_copy_index: i + 1,
      }, context)
    );
  },
};
