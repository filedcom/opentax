import { element, elements } from "../../../mef/xml.ts";
import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  assertScheduleCInterestExempt,
  calculateScheduleCAtRiskNet,
  computeCOGS,
  computeGrossIncome,
  computeTotalExpenses,
  homeOfficeDeduction,
  mealsDeductiblePct,
  type ScheduleCItem,
  wagesLessEmploymentCredits,
  wotcReductionsByBusiness,
} from "../../../nodes/inputs/schedule_c/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm5884,
  inputSchema as form5884InputSchema,
} from "../../../nodes/inputs/f5884/index.ts";

interface Fields {
  readonly schedule_cs?: readonly ScheduleCItem[];
  readonly line16a_interest_mortgage?: number;
  readonly wotc_wage_reductions?: ReadonlyArray<{
    business_reference: string;
    credit_amount: number;
  }>;
}

function amount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

function checkbox(tag: string, checked: boolean | undefined): string {
  return checked === true ? element(tag, "X") : "";
}

function inventory(item: ScheduleCItem): string[] {
  const hasCosts = [
    item.line_35_cogs_beginning_inventory,
    item.line_36_purchases,
    item.line_37_cost_of_labor,
    item.line_38_materials_supplies_cogs,
    item.line_39_other_cogs,
    item.line_41_cogs_ending_inventory,
  ].some((value) => value !== undefined);
  const totalCosts = (item.line_35_cogs_beginning_inventory ?? 0) +
    (item.line_36_purchases ?? 0) + (item.line_37_cost_of_labor ?? 0) +
    (item.line_38_materials_supplies_cogs ?? 0) +
    (item.line_39_other_cogs ?? 0);
  return [
    checkbox(
      "ClosingInventoryCostMethodInd",
      item.line_33_inventory_method === "cost",
    ),
    checkbox(
      "LowerOfCostOrMarketMethodInd",
      item.line_33_inventory_method === "lcm",
    ),
    amount(
      "BeginningOfYearInventoryAmt",
      item.line_35_cogs_beginning_inventory,
    ),
    amount("PurchasesLessPersonalItemsAmt", item.line_36_purchases),
    amount("CostOfLaborAmt", item.line_37_cost_of_labor),
    amount("MaterialsAndSuppliesAmt", item.line_38_materials_supplies_cogs),
    amount("OtherCostsAmt", item.line_39_other_cogs),
    hasCosts ? amount("TotalCostsAmt", totalCosts) : "",
    amount("EndOfYearInventoryAmt", item.line_41_cogs_ending_inventory),
    hasCosts ? amount("CostOfGoodsSoldAmt", computeCOGS(item)) : "",
  ];
}

function vehicleInfo(item: ScheduleCItem): string {
  // Input keys use 44b/44c/44d for the three mileage categories; the IRS
  // XSD names them by meaning, so map the categories rather than their labels.
  const values = [
    item.line_43_date_in_service,
    item.line_44b_business_miles,
    item.line_44c_commuting_miles,
    item.line_44d_other_miles,
    item.line_45_personal_use,
    item.line_46_another_vehicle,
    item.line_47a_evidence,
    item.line_47b_written_evidence,
  ];
  if (values.every((value) => value === undefined)) return "";
  if (
    item.line_44a_total_miles !== undefined &&
    item.line_44b_business_miles !== undefined &&
    item.line_44c_commuting_miles !== undefined &&
    item.line_44d_other_miles !== undefined &&
    item.line_44a_total_miles !== item.line_44b_business_miles +
        item.line_44c_commuting_miles + item.line_44d_other_miles
  ) {
    throw new Error("Schedule C vehicle miles do not add up to total miles");
  }
  return elements("AdditionalVehicleInfoGrp", [
    element("VehiclePlacedInServiceDt", item.line_43_date_in_service),
    amount("BusinessMilesCnt", item.line_44b_business_miles),
    amount("CommutingMilesCnt", item.line_44c_commuting_miles),
    amount("OtherMilesCnt", item.line_44d_other_miles),
    item.line_45_personal_use === undefined ? "" : element(
      "VehicleAvailableOffDutyHrsInd",
      String(item.line_45_personal_use),
    ),
    item.line_46_another_vehicle === undefined ? "" : element(
      "AnotherVehicleForPrsnlUseInd",
      String(item.line_46_another_vehicle),
    ),
    item.line_47a_evidence === undefined ? "" : element(
      "EvidenceToSupportDeductionInd",
      String(item.line_47a_evidence),
    ),
    item.line_47b_written_evidence === undefined
      ? ""
      : element("EvidenceWrittenInd", String(item.line_47b_written_evidence)),
  ]);
}

function buildScheduleC(
  item: ScheduleCItem,
  context: MefBuildContext,
  index: number,
  wotcReduction = 0,
): string {
  const filer = context.filer;
  if (!filer) throw new Error(`Schedule C ${index + 1} needs filer identity`);
  if (item.line_f_accounting_method === "other") {
    throw new Error(
      `Schedule C ${index + 1} needs an accounting-method description for MeF`,
    );
  }
  if (
    item.line_33_inventory_method === "other" || item.line_34_inventory_change
  ) {
    throw new Error(
      `Schedule C ${index + 1} needs an inventory statement for MeF`,
    );
  }
  const grossReceipts = item.line_1_gross_receipts;
  const netReceipts = grossReceipts - (item.line_2_returns_allowances ?? 0);
  const cogs = computeCOGS(item);
  const grossIncome = computeGrossIncome(item);
  const expenses = computeTotalExpenses(item, wotcReduction);
  const tentativeProfit = grossIncome - expenses;
  const netProfit = calculateScheduleCAtRiskNet(item, wotcReduction).atRiskNet;
  const otherExpenses = (item.part_v_other_expenses ?? []).reduce(
    (sum, entry) => sum + entry.amount,
    item.line_27b_other_expenses ?? 0,
  );
  const hasOtherExpenses = item.line_27b_other_expenses !== undefined ||
    (item.part_v_other_expenses?.length ?? 0) > 0;
  return elements("IRS1040ScheduleC", [
    element("ProprietorNm", filer.fullName ?? filer.nameLine1),
    element("SSN", filer.primarySSN.replace(/\D/g, "")),
    element("PrincipalBusinessActivityDesc", item.line_a_principal_business),
    element("PrincipalBusinessActivityCd", item.line_b_business_code),
    element("BusinessNameLine1Txt", item.line_c_business_name),
    element("EIN", item.line_d_ein?.replace(/\D/g, "")),
    item.line_e_business_address
      ? elements("BusinessUSAddress", [
        element("AddressLine1Txt", item.line_e_business_address.line1),
        element("AddressLine2Txt", item.line_e_business_address.line2),
        element("CityNm", item.line_e_business_address.city),
        element("StateAbbreviationCd", item.line_e_business_address.state),
        element("ZIPCd", item.line_e_business_address.zip),
      ])
      : "",
    checkbox(
      "MethodOfAccountingCashInd",
      item.line_f_accounting_method === "cash",
    ),
    checkbox(
      "MethodOfAccountingAccrualInd",
      item.line_f_accounting_method === "accrual",
    ),
    element(
      "MaterialParticipationInCYInd",
      String(item.line_g_material_participation),
    ),
    checkbox("NewBusinessInCurrentYearInd", item.line_h_new_business),
    item.line_i_made_1099_payments === undefined ? "" : element(
      "PaymentRqrFilingForm1099Ind",
      String(item.line_i_made_1099_payments),
    ),
    item.line_j_filed_1099s === undefined
      ? ""
      : element("RequiredForm1099FiledInd", String(item.line_j_filed_1099s)),
    checkbox("StatutoryEmployeeFromW2Ind", item.statutory_employee),
    element("TotalGrossReceiptsAmt", grossReceipts),
    amount("ReturnsAndAllowancesAmt", item.line_2_returns_allowances),
    element("NetGrossReceiptsAmt", netReceipts),
    element("GrossProfitAmt", netReceipts - cogs),
    amount("OtherIncomeAmt", item.line_6_other_income),
    element("GrossIncomeAmt", grossIncome),
    amount("AdvertisingAmt", item.line_8_advertising),
    amount("CarAndTruckExpensesAmt", item.line_9_car_truck_expenses),
    amount("CommissionsAndFeesAmt", item.line_10_commissions_fees),
    amount("ContractLaborAmt", item.line_11_contract_labor),
    amount("DepletionAmt", item.line_12_depletion),
    amount("DeprecAndSect179ExpnsDedAmt", item.line_13_depreciation),
    amount("EmployeeBenefitProgramAmt", item.line_14_employee_benefits),
    amount("InsuranceAmt", item.line_15_insurance),
    amount("MortgageInterestPaidBanksAmt", item.line_16a_interest_mortgage),
    amount("MortgageInterestPaidOtherAmt", item.line_16b_interest_other),
    amount(
      "LegalAndProfessionalServiceAmt",
      item.line_17_professional_services,
    ),
    amount("OfficeExpensesAmt", item.line_18_office_expense),
    amount("PensionProfitSharingPlansAmt", item.line_19_pension_plans),
    amount("MachineryAndEquipmentRentAmt", item.line_20a_rent_vehicles),
    amount("OtherBusinessPropertyRentAmt", item.line_20b_rent_other),
    amount("RepairsAndMaintenanceAmt", item.line_21_repairs),
    amount("SuppliesAmt", item.line_22_supplies),
    amount("TaxesAndLicensesAmt", item.line_23_taxes_licenses),
    amount("TravelAmt", item.line_24a_travel),
    item.line_24b_meals === undefined ? "" : element(
      "MealsAndEntertainmentAmt",
      item.line_24b_meals * mealsDeductiblePct(item),
    ),
    amount("UtilitiesAmt", item.line_25_utilities),
    amount(
      "WagesLessEmploymentCreditsAmt",
      item.line_26_wages === undefined && wotcReduction === 0
        ? undefined
        : wagesLessEmploymentCredits(item, wotcReduction),
    ),
    amount("EnergyEffcntCmrclBldgDedAmt", item.line_27a_energy_efficient),
    element("TotalExpensesAmt", expenses),
    element("TentativeProfitOrLossAmt", tentativeProfit),
    homeOfficeDeduction(item, tentativeProfit) === 0 ? "" : element(
      "HomeBusinessExpenseAmt",
      homeOfficeDeduction(item, tentativeProfit),
    ),
    element("NetProfitOrLossAmt", netProfit),
    checkbox("AllInvestmentIsAtRiskInd", item.line_32_at_risk === "a"),
    checkbox("SomeInvestmentIsNotAtRiskInd", item.line_32_at_risk === "b"),
    ...inventory(item),
    vehicleInfo(item),
    ...(item.part_v_other_expenses ?? []).map((entry) =>
      elements("OtherExpenseDetail", [
        element("Desc", entry.description),
        element("Amt", entry.amount),
      ])
    ),
    hasOtherExpenses ? element("TotalOtherExpensesAmt", otherExpenses) : "",
  ]);
}

export const scheduleC: MefFormDescriptor<
  "schedule_c",
  Fields,
  readonly string[]
> = {
  pendingKey: "schedule_c",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sc.pdf",
  build(fields, context = {}) {
    const items = fields?.schedule_cs ?? [];
    if (items.length > 8) {
      throw new Error("MeF allows at most eight Schedule C documents");
    }
    if ((fields?.line16a_interest_mortgage ?? 0) > 0) {
      throw new Error(
        "Schedule C upstream mortgage interest needs a business-linked section 163(j) exemption",
      );
    }
    items.forEach((item) =>
      assertScheduleCInterestExempt(
        item,
        CONFIG_BY_YEAR[2025].smallBizGrossReceipts,
      )
    );
    const reductions = wotcReductionsByBusiness({
      schedule_cs: items,
      wotc_wage_reductions: fields?.wotc_wage_reductions,
    });
    if (reductions.size > 0 && context.pending) {
      const source = form5884InputSchema.parse(context.pending.f5884);
      const expected = new Map(
        calculateForm5884(source).wageDeductionAllocations.flatMap(
          (entry) =>
            entry.location.kind === "schedule_c"
              ? [
                [
                  entry.location.business_reference,
                  entry.credit_amount,
                ] as const,
              ]
              : [],
        ),
      );
      if (
        expected.size !== reductions.size ||
        [...reductions].some(([key, amount]) => expected.get(key) !== amount)
      ) {
        throw new Error(
          "Schedule C WOTC reduction needs matching Form 5884 line 2",
        );
      }
    }
    return items.map((item, index) =>
      buildScheduleC(
        item,
        context,
        index,
        reductions.get(item.business_reference ?? "") ?? 0,
      )
    );
  },
};
