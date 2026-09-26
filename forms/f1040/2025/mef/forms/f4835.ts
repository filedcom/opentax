import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm4835Lines,
  type F4835Item,
  itemSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { farmAllowedLosses } from "./f4835_passive_loss.ts";
import { inputSchema as scheduleFInputSchema } from "../../../nodes/intermediate/forms/schedule_f/index.ts";

interface Fields {
  readonly f4835s?: readonly F4835Item[];
}

function amount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

// Order follows the TY2025v5.4 IRS4835.xsd sequence, not the input schema order.
export const FIELD_MAP = [
  ["expense_car_truck", "CarAndTruckExpensesAmt"],
  ["expense_chemicals", "ChemicalExpenseAmt"],
  ["expense_conservation", "ConservationExpenseAmt"],
  ["expense_custom_hire", "CustomHireExpenseAmt"],
  ["expense_depreciation", "DeprecAndSect179ExpnsDedAmt"],
  ["expense_employee_benefits", "EmployeeBenefitProgramAmt"],
  ["expense_feed", "FeedPurchasedExpenseAmt"],
  ["expense_fertilizer", "FertilizerAndLimeExpenseAmt"],
  ["expense_freight_trucking", "FreightAndTruckingExpenseAmt"],
  ["expense_gasoline", "GasolineFuelAndOilExpenseAmt"],
  ["expense_insurance", "InsuranceAmt"],
  ["expense_mortgage_interest", "MortgageInterestPaidBanksAmt"],
  ["expense_other_interest", "MortgageInterestPaidOtherAmt"],
  ["expense_labor_hired", "LaborHiredExpenseAmt"],
  ["expense_pension", "PensionProfitSharingPlansAmt"],
  ["expense_rent_lease_vehicles", "MachineryAndEquipmentRentAmt"],
  ["expense_rent_lease_land", "OtherBusinessPropertyRentAmt"],
  ["expense_repairs_maintenance", "RepairsAndMaintenanceAmt"],
  ["expense_seeds_plants", "SeedAndPlantExpenseAmt"],
  ["expense_storage_warehousing", "StorageAndWarehousingExpnsAmt"],
  ["expense_supplies", "SuppliesAmt"],
  ["expense_taxes", "TaxExpenseAmt"],
  ["expense_utilities", "UtilitiesAmt"],
  ["expense_vet_breeding", "VtrnryBreedingMedicineExpnsAmt"],
] as const satisfies ReadonlyArray<readonly [keyof F4835Item, string]>;

function otherExpense(description: string, value: number): string {
  return elements("OtherExpenseDetail", [
    element("Desc", description),
    element("Amt", value),
  ]);
}

function buildItem(
  raw: F4835Item,
  loanStatementId?: string,
  cropStatementId?: string,
  allowedLoss = 0,
): string {
  const item = itemSchema.parse(raw);
  const lines = calculateForm4835Lines(item);
  const capitalized = item.expense_capitalized_263a ?? 0;
  const priorPassiveLoss = item.prior_unallowed_passive_operating ?? 0;
  const reportedNet = lines.preliminaryNet >= 0 && priorPassiveLoss > 0
    ? Math.max(0, lines.preliminaryNet - allowedLoss)
    : lines.preliminaryNet;
  const deductibleLoss = lines.preliminaryNet >= 0
    ? Math.max(0, allowedLoss - lines.preliminaryNet)
    : allowedLoss;
  return elements("IRS4835", [
    element("EIN", item.ein),
    item.actively_participated === undefined
      ? ""
      : element("ActivelyParticipatedInd", String(item.actively_participated)),
    element("LivestockAndCropIncomeAmt", item.livestock_crop_income),
    amount("CooperativeDistributionsAmt", item.cooperative_distributions_gross),
    amount("CooperativeDistriTxblAmt", item.cooperative_distributions_taxable),
    amount(
      "AgriculturalProgramPymtAmt",
      item.agricultural_program_payments_gross,
    ),
    amount(
      "AgriculturalProgramPymtTxblAmt",
      item.agricultural_program_payments_taxable,
    ),
    (item.ccc_loans_reported_election ?? 0) > 0
      ? element(
        "CCCLoanReportedElectionAmt",
        item.ccc_loans_reported_election,
        loanStatementId === undefined ? undefined : {
          referenceDocumentId: loanStatementId,
          referenceDocumentName: "CCCLoanDetailCashMethodStatement",
        },
      )
      : "",
    amount("CCCLoansForfeitedAmt", item.ccc_loans_forfeited_gross),
    amount("CCCLoansForfeitedTaxableAmt", item.ccc_loans_forfeited_taxable),
    amount("CropInsProcAndDsstrPymtAmt", item.crop_insurance_disaster_received),
    amount(
      "CropInsProcAndDsstrPymtTxblAmt",
      item.crop_insurance_disaster_taxable,
    ),
    item.defer_crop_insurance === true
      ? element(
        "ElectionDeferCropInsProcInd",
        "X",
        cropStatementId === undefined ? undefined : {
          referenceDocumentId: cropStatementId,
          referenceDocumentName:
            "PostponementOfCropInsuranceAndDisasterPaymentsStatement",
        },
      )
      : "",
    amount(
      "CropInsProcDefrdPrevTYAmt",
      item.crop_insurance_deferred_prior_year,
    ),
    amount("OthIncmIncludingGasFuelTxCrAmt", item.other_income),
    element("GrossFarmRentalIncomeAmt", lines.gross),
    ...FIELD_MAP.map(([key, tag]) => amount(tag, item[key])),
    ...(item.expense_other_details ?? []).map((entry) =>
      otherExpense(entry.description, entry.amount)
    ),
    capitalized > 0 ? otherExpense("Capitalized expenses", -capitalized) : "",
    capitalized > 0 ? element("Section263AIndicatorCd", "263A") : "",
    element("TotalExpensesAmt", lines.expenses),
    element(
      "NetFarmRentalIncomeOrLossAmt",
      reportedNet,
      lines.preliminaryNet < 0 || priorPassiveLoss > 0
        ? { passiveActivityLossLiteralCd: "PAL" }
        : undefined,
    ),
    lines.preliminaryNet < 0
      ? element(
        item.some_investment_not_at_risk === true
          ? "SomeInvestmentIsNotAtRiskInd"
          : "AllInvestmentIsAtRiskInd",
        "X",
      )
      : "",
    lines.preliminaryNet < 0 || deductibleLoss > 0
      ? element("FarmRentalDeductibleLossAmt", deductibleLoss)
      : "",
  ]);
}

export const form4835: MefFormDescriptor<"f4835", Fields, readonly string[]> = {
  pendingKey: "f4835",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4835.pdf",
  build(fields, context?: MefBuildContext) {
    const items = fields?.f4835s ?? [];
    if (items.length > 4) {
      throw new Error("MeF allows at most four Form 4835 documents");
    }
    const statementIds = context?.documentIdsByPendingKey?.ccc_loan_statement ??
      [];
    const cropStatementIds =
      context?.documentIdsByPendingKey?.crop_insurance_deferral_statement ?? [];
    const atRiskDocumentIds = context?.documentIdsByPendingKey?.f4835_at_risk ??
      [];
    const linked = context?.documentIdsByPendingKey !== undefined;
    const electedCount =
      items.filter((item) => (item.ccc_loans_reported_election ?? 0) > 0)
        .length;
    const cropElectedCount =
      items.filter((item) => item.defer_crop_insurance === true).length;
    const scheduleFSource = context?.pending?.schedule_f;
    const ownerFarms = scheduleFSource === undefined
      ? []
      : scheduleFInputSchema.parse(scheduleFSource).schedule_fs;
    const ownerLoanCount =
      ownerFarms.filter((item) => (item.line5a_ccc_loans_election ?? 0) > 0)
        .length;
    const ownerCropCount =
      ownerFarms.filter((item) => item.line6c_defer_crop_insurance === true)
        .length;
    const atRiskCount =
      items.filter((item) =>
        calculateForm4835Lines(item).preliminaryNet < 0 &&
        item.some_investment_not_at_risk === true
      ).length;
    if (linked && statementIds.length !== electedCount + ownerLoanCount) {
      throw new Error(
        "Form 4835 CCC loan statements do not match the elections",
      );
    }
    if (
      linked && cropStatementIds.length !== cropElectedCount + ownerCropCount
    ) {
      throw new Error(
        "Form 4835 crop insurance statements do not match the elections",
      );
    }
    if (linked && atRiskDocumentIds.length !== atRiskCount) {
      throw new Error(
        "Form 4835 line 34b does not match its Form 6198 documents",
      );
    }
    let statementIndex = 0;
    let cropStatementIndex = 0;
    if (
      items.some((item) => calculateForm4835Lines(item).preliminaryNet < 0) &&
      context?.pending?.f4835 === undefined
    ) {
      throw new Error(
        "Form 4835 loss requires its linked source activity and limitation forms",
      );
    }
    const allowedLosses = farmAllowedLosses(context);
    return items.map((item, index) =>
      buildItem(
        item,
        (item.ccc_loans_reported_election ?? 0) > 0
          ? statementIds[statementIndex++]
          : undefined,
        item.defer_crop_insurance === true
          ? cropStatementIds[cropStatementIndex++]
          : undefined,
        allowedLosses[index] ?? 0,
      )
    );
  },
};
