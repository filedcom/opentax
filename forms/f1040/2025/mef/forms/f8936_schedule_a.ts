import { element, elements } from "../../../mef/xml.ts";
import {
  computeVehiclePersonalCredit,
  type F8936Item,
  inputSchema,
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

function newVehicleGroup(item: F8936Item, personalCredit: number): string {
  const tentative = Math.min(item.credit_amount ?? 0, 7_500);
  const businessUsePct = item.business_use_pct ?? 0;
  const businessPart = Math.round(tentative * businessUsePct);
  return elements("NewCleanVehicleGrp", [
    element("NewClnVehServiceTYYesInd", "X"),
    element("ResellClnVeh30DaysInd", String(item.resold_within_30_days)),
    element("FilingFormIITRInd", "true"),
    element(
      "AcqVehUseOrLeaseNotResaleInd",
      String(item.acquired_for_use_not_resale),
    ),
    element("TentativeCreditAmt", tentative),
    businessUsePct > 0
      ? element("BusinessInvestmentUsePct", businessUsePct.toFixed(5))
      : "",
    businessPart > 0 ? element("BusinessInvestmentUseAmt", businessPart) : "",
    element("PrsnlUseNewCleanVehicleCrAmt", personalCredit),
  ]);
}

function previouslyOwnedGroup(item: F8936Item, personalCredit: number): string {
  const price = item.sale_price ?? 0;
  return elements("PrevOwnCleanVehicleGrp", [
    element("NewClnVehServiceTYNoInd", "X"),
    element("PrevOwnClnVehServiceTYYesInd", "X"),
    element("PrevOwnResellClnVeh30DaysInd", String(item.resold_within_30_days)),
    element(
      "ClmPrevOwnClnVeh3YrPeriodInd",
      String(item.claimed_prev_owned_credit_last_3_years),
    ),
    element("ClnVehSalePriceMoreSpcfdAmtInd", String(price > 25_000)),
    element(
      "AcqPrevOwnVehUseNotResaleInd",
      String(item.acquired_for_use_not_resale),
    ),
    element("ClaimedAsDependentInd", String(item.claimed_as_dependent)),
    element("SalePriceAmt", price),
    element("SalePriceBySpecifiedPctAmt", price * 0.30),
    element("PrevOwnedCleanVehCreditAmt", personalCredit),
  ]);
}

function buildScheduleA(item: F8936Item): string {
  const personalCredit = computeVehiclePersonalCredit(item);
  if (personalCredit === 0 && item.transferred_to_dealer !== true) return "";
  const vehicle = requiredVehicleDetails(item);
  if (item.transferred_to_dealer === undefined) {
    throw new Error("Form 8936 Schedule A needs a dealer-transfer answer");
  }
  if (item.transferred_to_dealer && item.transferred_amount === undefined) {
    throw new Error("Form 8936 Schedule A needs the dealer-transferred amount");
  }
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
    item.transferred_to_dealer && personalCredit === 0
      ? element("NotAllowedClaimClnVehCrInd", "X")
      : "",
    item.is_new_vehicle === true
      ? newVehicleGroup(item, personalCredit)
      : previouslyOwnedGroup(item, personalCredit),
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
    const items = inputSchema.parse(fields).f8936s;
    return items.map(buildScheduleA).filter((xml) => xml !== "");
  },
};
