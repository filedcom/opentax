import type { FilerIdentity } from "../../../../../mef/header.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { element, elements } from "../../../../../mef/xml.ts";
import {
  firstYearPassiveSCorpLossSourceSchema,
  firstYearPassiveSCorpLossStages,
  type PassiveSCorpLossK1Facts,
} from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp_passive_loss_source.ts";

const name = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();

/** Source-driven Form 7203 projection. Part III reports the basis
 * limitation, not the final passive deduction. Return-wide joins are separate. */
export function projectFirstYearPassiveSCorp7203(
  rawSource: unknown,
  k1: PassiveSCorpLossK1Facts,
  filer: FilerIdentity | undefined,
) {
  const source = firstYearPassiveSCorpLossSourceSchema.parse(rawSource);
  const stages = firstYearPassiveSCorpLossStages(source, k1);
  if (!filer) {
    throw Error("Passive Form 7203 source needs the identified filer");
  }
  const joint = filer.filingStatus === FilingStatus.MarriedFilingJointly;
  if (!joint && filer.filingStatus !== FilingStatus.Single) {
    throw Error(
      "Passive Form 7203 projection needs its reviewed single or joint source route",
    );
  }
  const isSpouse = joint && source.shareholder_ssn === filer.spouse?.ssn;
  const ownerTin = isSpouse ? filer.spouse!.ssn : filer.primarySSN;
  const ownerName = isSpouse
    ? [
      filer.spouse!.firstName,
      filer.spouse!.middleInitial,
      filer.spouse!.lastName,
    ]
      .filter(Boolean).join(" ")
    : filer.fullName ?? filer.nameLine1;
  const marital = source.participation.spouse;
  if (
    source.shareholder_ssn !== ownerTin ||
    name(source.issued_k1.shareholder_name_as_on_k1) !== name(ownerName) ||
    (joint
      ? !filer.spouse || marital.status !== "married_same_spouse_all_year" ||
        marital.spouse_ssn !== (isSpouse ? filer.primarySSN : filer.spouse.ssn)
      : marital.status !== "unmarried_all_year" || filer.spouse !== undefined)
  ) {
    throw Error(
      "Passive Form 7203 shareholder name/owner/spouse records differ from the filer",
    );
  }
  if (
    !/^([A-Za-z0-9#\-()&'] ?)*[A-Za-z0-9#\-()&']$/.test(source.corporation_name)
  ) {
    throw Error(
      "Passive Form 7203 corporation name needs the IRS business-name characters",
    );
  }
  const pdfFields = {
    shareholder_name: source.issued_k1.shareholder_name_as_on_k1,
    shareholder_ssn: stages.ownerTin,
    corporation_name: source.corporation_name,
    corporation_ein: stages.corporationEin,
    original_shareholder: true,
    line1_beginning_basis: 0,
    line2_cash_capital_contribution: stages.currentStockCashBasis,
    line5_basis_before_distributions: stages.currentStockCashBasis,
    line7_basis_after_distributions: stages.currentStockCashBasis,
    line10_basis_before_loss: stages.currentStockCashBasis,
    line11_allowable_stock_loss: stages.basisAllowedLoss,
    line14_basis_decrease: stages.basisAllowedLoss,
    line15_ending_basis: stages.endingStockBasis,
    line35_current_loss: stages.currentOrdinaryLoss,
    line35_allowed_stock: stages.basisAllowedLoss,
    ...(stages.basisSuspendedLoss > 0
      ? { line35_carryover: stages.basisSuspendedLoss }
      : {}),
    line47_current_loss: stages.currentOrdinaryLoss,
    line47_allowed_stock: stages.basisAllowedLoss,
    ...(stages.basisSuspendedLoss > 0
      ? { line47_carryover: stages.basisSuspendedLoss }
      : {}),
  };
  return { source, stages, pdfFields };
}

/** IRS7203 fragment; the whole-return export guard remains separate. */
export function buildFirstYearPassiveSCorp7203(
  rawSource: unknown,
  k1: PassiveSCorpLossK1Facts,
  filer: FilerIdentity | undefined,
) {
  const { stages: s, pdfFields: p } = projectFirstYearPassiveSCorp7203(
    rawSource,
    k1,
    filer,
  );
  const loss = (amount: number) => [
    element("OrdinaryBusinessLossAmt", amount),
    element("TotalAllowableLossAmt", amount),
  ];
  return elements("IRS7203", [
    element("ShareholderPersonNm", p.shareholder_name),
    element("ShareholderSSN", p.shareholder_ssn),
    elements("SCorporationName", [
      element("BusinessNameLine1Txt", p.corporation_name),
    ]),
    element("SCorporationEIN", p.corporation_ein),
    element("OriginalShareholderInd", "X"),
    element("StockBasisBeginTaxYearAmt", 0),
    element("CapitalContributionBasisAmt", s.currentStockCashBasis),
    element("StockBasisBfrDistributionsAmt", s.currentStockCashBasis),
    element("StockBasisAftrDistributionsAmt", s.currentStockCashBasis),
    element("StockBasisBeforeLossDedAmt", s.currentStockCashBasis),
    element("TotalDecreaseStockBasisAmt", s.basisAllowedLoss),
    element("StockBasisEndTaxYearAmt", s.endingStockBasis),
    elements("ShrCurrentYrLossDeductionsGrp", loss(s.currentOrdinaryLoss)),
    elements("ShrAllwblLossFromStockBasisGrp", loss(s.basisAllowedLoss)),
    s.basisSuspendedLoss > 0
      ? elements("ShrCarryoverAmountsGrp", loss(s.basisSuspendedLoss))
      : "",
  ]);
}
