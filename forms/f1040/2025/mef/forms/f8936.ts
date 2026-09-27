import { element, elements } from "../../../mef/xml.ts";
import {
  type F8936Input,
  type F8936MagiYear,
  inputSchema,
  modifiedAgi,
} from "../../../nodes/inputs/f8936/index.ts";
import { form8936Lines } from "../../form8936_lines.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<F8936Input> & Record<string, unknown>;

const priorStatusCode: Readonly<Record<FilingStatus, string>> = {
  [FilingStatus.Single]: "1",
  [FilingStatus.MFJ]: "2",
  [FilingStatus.MFS]: "3",
  [FilingStatus.HOH]: "4",
  [FilingStatus.QSS]: "5",
};

function magiGroup(tag: string, year: F8936MagiYear): string {
  return elements(tag, [
    element("AdjustedGrossIncomeAmt", year.adjusted_gross_income),
    element("ExcldSect933PuertoRicoIncmAmt", year.excluded_puerto_rico_income),
    (year.foreign_earned_income_exclusion ?? 0) > 0
      ? element("TotalIncomeExclusionAmt", year.foreign_earned_income_exclusion)
      : "",
    element("HousingDeductionAmt", year.foreign_housing_deduction),
    element("GrossIncomeExclusionAmt", year.excluded_american_samoa_income),
    element("NetIncomeAmt", modifiedAgi(year)),
  ]);
}

function buildIRS8936(input: F8936Input, context?: MefBuildContext): string {
  const lines = form8936Lines(input, context?.pending);
  if (lines === undefined) return "";
  if (
    lines.line8Business > 0 && context?.documentIdsByPendingKey &&
    context.documentIdsByPendingKey.f3800?.length !== 1
  ) {
    throw new Error("Form 8936 business credit needs a linked Form 3800");
  }

  return elements("IRS8936", [
    magiGroup("CurrentYrMAGIAmountGrp", input.current_year_magi),
    magiGroup("PriorYrMAGIAmountGrp", input.prior_year_magi),
    element(
      "PYIndivReturnFilingStatusCd",
      priorStatusCode[input.prior_year_filing_status],
    ),
    lines.line6Business > 0
      ? element("BusinessInvestmentUseAmt", lines.line6Business)
      : "",
    lines.line8Business > 0
      ? element("BusinessInvstUsePartOfCrAmt", lines.line8Business)
      : "",
    lines.line9TentativeNew > 0
      ? elements("CrPrsnlUsePartNewCleanVehGrp", [
        element("PrsnlUseNewCleanVehicleCrAmt", lines.line9TentativeNew),
        element("TotalTaxBeforeCrAndOthTaxesAmt", lines.line10TaxBeforeCredits),
        element("PersonalTaxCreditsAmt", lines.line11OtherCredits),
        element("AdjustedPersonalTaxCreditsAmt", lines.line12NewAvailable),
        element("CleanVehPrsnlUsePartCrAmt", lines.line13AllowedNew),
      ])
      : "",
    lines.line14TentativeUsed > 0
      ? elements("CrPreviouslyOwnedCleanVehGrp", [
        element("PrevOwnedCleanVehCreditAmt", lines.line14TentativeUsed),
        element("TotalTaxBeforeCrAndOthTaxesAmt", lines.line15TaxBeforeCredits),
        element("PersonalTaxCreditsAmt", lines.line16OtherCredits),
        element("AdjustedPersonalTaxCreditsAmt", lines.line17UsedAvailable),
        element("MaxPrevOwnedCleanVehCrAmt", lines.line18AllowedUsed),
      ])
      : "",
    lines.line19Commercial > 0
      ? element("QlfyCmrclCleanVehicleCrAmt", lines.line19Commercial)
      : "",
    lines.line19Commercial > 0
      ? element("TotalQlfyCmrclCleanVehCrAmt", lines.line19Commercial)
      : "",
  ]);
}

export const form8936: MefFormDescriptor<"f8936", Input> = {
  pendingKey: "f8936",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8936--2025.pdf",
  build(fields, context) {
    if (!fields.f8936s || fields.f8936s.length === 0) return "";
    return buildIRS8936(inputSchema.parse(fields), context);
  },
};
