import { element, elements } from "../../../mef/xml.ts";
import {
  businessUsePercentage,
  computeCommercialVehicleCreditLines,
  computeNewVehicleCreditParts,
  computeVehiclePersonalCredit,
  type F8936Input,
  type F8936Item,
  incomeLimit,
  inputSchema,
  modifiedAgi,
} from "../../../nodes/inputs/f8936/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input =
  & Partial<ReturnType<typeof inputSchema.parse>>
  & Record<string, unknown>;

function requiredVehicleDetails(item: F8936Item): {
  year: number;
  make: string;
  model: string;
  vin: string;
  serviceDate: string;
} {
  const {
    vehicle_year,
    vehicle_make,
    vehicle_model,
    vin,
    placed_in_service_date,
  } = item;
  if (
    vehicle_year === undefined || !vehicle_make || !vehicle_model || !vin ||
    !placed_in_service_date
  ) {
    throw new Error(
      "Form 8936 Schedule A needs vehicle year, make, model, VIN, and service date",
    );
  }
  return {
    year: vehicle_year,
    make: vehicle_make,
    model: vehicle_model,
    vin,
    serviceDate: placed_in_service_date,
  };
}

function incomeAnswers(input: F8936Input, used: boolean) {
  const currentOver = modifiedAgi(input.current_year_magi) >
    incomeLimit(input.filing_status, used);
  const priorOver = modifiedAgi(input.prior_year_magi) >
    incomeLimit(input.prior_year_filing_status, used);
  return { currentOver, priorOver };
}

function newVehicleGroup(
  item: F8936Item,
  input: F8936Input,
  personalCredit: number,
): string {
  const tentative = Math.min(item.credit_amount ?? 0, 7_500);
  const businessUsePct = businessUsePercentage(item);
  const businessPart = computeNewVehicleCreditParts(item, input).business;
  const { currentOver, priorOver } = incomeAnswers(input, false);
  const stopsAtIncome = currentOver && priorOver;
  const passesQuestions = !item.resold_within_30_days && !stopsAtIncome;
  return elements("NewCleanVehicleGrp", [
    element("NewClnVehServiceTYYesInd", "X"),
    element("ResellClnVeh30DaysInd", String(item.resold_within_30_days)),
    !item.resold_within_30_days ? element("FilingFormIITRInd", "true") : "",
    !item.resold_within_30_days
      ? element("AmtGrtrThanCYFSLimitInd", String(currentOver))
      : "",
    currentOver && !item.resold_within_30_days
      ? element("AmtGrtrThanPYFSLimitInd", String(priorOver))
      : "",
    passesQuestions
      ? element(
        "AcqVehUseOrLeaseNotResaleInd",
        String(item.acquired_for_use_not_resale),
      )
      : "",
    passesQuestions && item.acquired_for_use_not_resale
      ? element("TentativeCreditAmt", tentative)
      : "",
    businessUsePct > 0
      ? element("BusinessInvestmentUsePct", businessUsePct.toFixed(5))
      : "",
    businessPart > 0 ? element("BusinessInvestmentUseAmt", businessPart) : "",
    personalCredit > 0
      ? element("PrsnlUseNewCleanVehicleCrAmt", personalCredit)
      : "",
  ]);
}

function previouslyOwnedGroup(
  item: F8936Item,
  input: F8936Input,
  personalCredit: number,
): string {
  const price = item.sale_price ?? 0;
  const { currentOver, priorOver } = incomeAnswers(input, true);
  const passesIncome = !item.resold_within_30_days &&
    !(currentOver && priorOver);
  const passesPriorClaim = passesIncome &&
    !item.claimed_prev_owned_credit_last_3_years;
  const passesPrice = passesPriorClaim && price <= 25_000;
  const passesUse = passesPrice && item.acquired_for_use_not_resale === true;
  const passesDependent = passesUse && item.claimed_as_dependent === false;
  return elements("PrevOwnCleanVehicleGrp", [
    element("NewClnVehServiceTYNoInd", "X"),
    element("PrevOwnClnVehServiceTYYesInd", "X"),
    element("PrevOwnResellClnVeh30DaysInd", String(item.resold_within_30_days)),
    !item.resold_within_30_days
      ? element("PrevOwnAmtGrtrThanCYFSLimitInd", String(currentOver))
      : "",
    currentOver && !item.resold_within_30_days
      ? element("PrevOwnAmtGrtrThanPYFSLimitInd", String(priorOver))
      : "",
    passesIncome
      ? element(
        "ClmPrevOwnClnVeh3YrPeriodInd",
        String(item.claimed_prev_owned_credit_last_3_years),
      )
      : "",
    passesPriorClaim
      ? element("ClnVehSalePriceMoreSpcfdAmtInd", String(price > 25_000))
      : "",
    passesPrice
      ? element(
        "AcqPrevOwnVehUseNotResaleInd",
        String(item.acquired_for_use_not_resale),
      )
      : "",
    passesUse
      ? element("ClaimedAsDependentInd", String(item.claimed_as_dependent))
      : "",
    passesDependent ? element("SalePriceAmt", price) : "",
    passesDependent ? element("SalePriceBySpecifiedPctAmt", price * 0.30) : "",
    personalCredit > 0
      ? element("PrevOwnedCleanVehCreditAmt", personalCredit)
      : "",
  ]);
}

function commercialGroup(item: F8936Item): string {
  const facts = item.commercial!;
  const lines = computeCommercialVehicleCreditLines(item);
  return elements("QlfyCmrclCleanVehicleYesGrp", [
    element("NewClnVehServiceTYNoInd", "X"),
    element("PrevOwnClnVehServiceTYNoInd", "X"),
    element("QlfyCmrclClnVehSrvcTYYesInd", "X"),
    element(
      "VehOfCharSubjToAllwncDeprecInd",
      String(facts.subject_to_depreciation),
    ),
    element(
      "AcqCmrclClnVehUseNotResaleInd",
      String(item.acquired_for_use_not_resale),
    ),
    element(
      "VehiclePoweredByGasOrDieselInd",
      String(facts.powered_partly_by_gas_or_diesel),
    ),
    element("GrossVehicleWeightRatingNum", facts.gvwr_pounds),
    element("VehicleCostOrOtherBasisAmt", lines.line19Basis),
    element("Section179ExpenseDeductionAmt", lines.line20Section179),
    element("NetSect179ExpenseDedAmt", lines.line21AdjustedBasis),
    element(
      "NetSect179ExpenseDedPctAmt",
      Math.round(lines.line22BasisPercentage),
    ),
    element("VehicleIncrementalCostAmt", lines.line23IncrementalCost),
    element(
      "TentQlfyCmrclCleanVehicleCrAmt",
      Math.round(lines.line24LesserCost),
    ),
    element("MaxQlfyCmrclCleanVehCrAmt", lines.line25MaximumCredit),
    element("QlfyCmrclCleanVehicleCrAmt", lines.line26Credit),
  ]);
}

function buildScheduleA(item: F8936Item, input: F8936Input): string {
  const personalCredit = computeVehiclePersonalCredit(item, input);
  const businessCredit = item.credit_kind === "new_clean_vehicle"
    ? computeNewVehicleCreditParts(item, input).business
    : item.credit_kind === "qualified_commercial_clean_vehicle"
    ? computeCommercialVehicleCreditLines(item).line26Credit
    : 0;
  if (
    personalCredit === 0 && businessCredit === 0 &&
    item.transferred_to_dealer !== true
  ) return "";
  const vehicle = requiredVehicleDetails(item);
  if (item.transferred_to_dealer === undefined) {
    throw new Error("Form 8936 Schedule A needs a dealer-transfer answer");
  }
  if (item.transferred_to_dealer && item.transferred_amount === undefined) {
    throw new Error("Form 8936 Schedule A needs the dealer-transferred amount");
  }
  const { currentOver, priorOver } = incomeAnswers(
    input,
    item.credit_kind === "previously_owned_clean_vehicle",
  );
  const directedRepaymentBox = item.transferred_to_dealer === true &&
    (item.resold_within_30_days === true || (currentOver && priorOver));
  return elements("IRS8936ScheduleA", [
    elements("VehicleDescriptionGrp", [
      element("VehicleModelYr", vehicle.year),
      element("VehicleMakeNameTxt", vehicle.make),
      element("VehicleModelNameTxt", vehicle.model),
    ]),
    element("VIN", vehicle.vin),
    element("VehiclePlacedInServiceDt", vehicle.serviceDate),
    element("CrTrnsfrDlrSaleInd", String(item.transferred_to_dealer)),
    item.transferred_to_dealer
      ? element("CrTrnsfrDlrSaleAmt", item.transferred_amount)
      : "",
    directedRepaymentBox ? element("NotAllowedClaimClnVehCrInd", "X") : "",
    item.credit_kind === "new_clean_vehicle"
      ? newVehicleGroup(item, input, personalCredit)
      : item.credit_kind === "previously_owned_clean_vehicle"
      ? previouslyOwnedGroup(item, input, personalCredit)
      : commercialGroup(item),
  ]);
}

export const form8936ScheduleA: MefFormDescriptor<
  "f8936",
  Input,
  readonly string[]
> = {
  pendingKey: "f8936",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8936sa--2025.pdf",
  build(fields) {
    if (!fields.f8936s || fields.f8936s.length === 0) return [];
    const input = inputSchema.parse(fields);
    return input.f8936s.map((item) => buildScheduleA(item, input))
      .filter((xml) => xml !== "");
  },
};
