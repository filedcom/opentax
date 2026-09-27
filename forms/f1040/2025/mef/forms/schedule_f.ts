import { element, elements } from "../../../mef/xml.ts";
import {
  calculateScheduleFAtRiskNet,
  computeAccrualIncome,
  computeGrossIncome,
  computeTotalExpenses,
  conservationDeduction,
  inputSchema,
  laborLessEmploymentCredits,
  reconcileFarmSources,
  type ScheduleFItem,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import { inputSchema as form4835InputSchema } from "../../../nodes/inputs/f4835/index.ts";
import {
  calculateForm5884,
  inputSchema as form5884InputSchema,
} from "../../../nodes/inputs/f5884/index.ts";

type Fields = Partial<ReturnType<typeof inputSchema.parse>>;

function amount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

function checkbox(tag: string, checked: boolean): string {
  return checked ? element(tag, "X") : "";
}

function buildFarm(
  item: ScheduleFItem,
  context: MefBuildContext,
  index: number,
  loanStatementId?: string,
  cropStatementId?: string,
  accrualLoanStatementId?: string,
  wotcReduction = 0,
): string {
  const filer = context.filer;
  if (!filer) throw new Error(`Schedule F ${index + 1} needs filer identity`);
  const gross = computeGrossIncome(item);
  const expenses = computeTotalExpenses(item, gross, wotcReduction);
  const preliminaryNet = gross - expenses;
  calculateScheduleFAtRiskNet(item, wotcReduction);
  const otherExpenses = item.line32_other_expenses ?? [];
  const income = item.accounting_method === "accrual"
    ? elements("FarmIncomeCashMethodGrp", [element("GrossIncomeAmt", gross)])
    : elements("FarmIncomeCashMethodGrp", [
      element(
        "SalesOfLvstckBghtForResaleAmt",
        item.line1_sales_livestock_resale,
      ),
      amount("CostOfLvstckBghtForResaleAmt", item.line1b_cost_livestock_resale),
      element(
        "PurchasedProfitAmt",
        (item.line1_sales_livestock_resale ?? 0) -
          (item.line1b_cost_livestock_resale ?? 0),
      ),
      amount("SaleOfProductsRaisedAmt", item.line2_sales_products_raised),
      amount(
        "CooperativeDistributionsAmt",
        item.line3a_cooperative_distributions,
      ),
      amount(
        "CooperativeDistriTxblAmt",
        item.line3b_cooperative_distributions_taxable,
      ),
      amount("AgriculturalProgramPymtAmt", item.line4a_ag_program_payments),
      amount(
        "AgriculturalProgramPymtTxblAmt",
        item.line4b_ag_program_payments_taxable,
      ),
      (item.line5a_ccc_loans_election ?? 0) > 0
        ? element(
          "CCCLoanReportedElectionAmt",
          item.line5a_ccc_loans_election,
          loanStatementId === undefined ? undefined : {
            referenceDocumentId: loanStatementId,
            referenceDocumentName: "CCCLoanDetailCashMethodStatement",
          },
        )
        : "",
      amount("CCCLoansForfeitedAmt", item.line5b_ccc_loans_forfeited),
      amount(
        "CCCLoansForfeitedTaxableAmt",
        item.line5c_ccc_loans_forfeited_taxable,
      ),
      amount("CropInsProcAndDsstrPymtAmt", item.line6a_crop_insurance),
      amount(
        "CropInsProcAndDsstrPymtTxblAmt",
        item.line6b_crop_insurance_taxable,
      ),
      item.line6c_defer_crop_insurance === true
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
      amount("CropInsProcDefrdPrevTYAmt", item.line6d_crop_insurance_deferred),
      amount("CustomHireIncomeAmt", item.line7_custom_hire_income),
      amount("OtherIncomeAmt", item.line8_other_income),
      element("GrossIncomeAmt", gross),
    ]);
  const accrualIncome = item.accounting_method === "accrual" && item.part_iii
    ? (() => {
      const part = item.part_iii;
      const calculated = computeAccrualIncome(item);
      return elements("FarmIncomeAccrualMethodGrp", [
        element("SalesLivestockProduceProdAmt", part.line37_sales_products),
        amount(
          "CooperativeDistributionsAmt",
          part.line38a_cooperative_distributions,
        ),
        amount(
          "CooperativeDistriTxblAmt",
          part.line38b_cooperative_distributions_taxable,
        ),
        amount("AgriculturalProgramPymtAmt", part.line39a_ag_program_payments),
        amount(
          "AgriculturalProgramPymtTxblAmt",
          part.line39b_ag_program_payments_taxable,
        ),
        (part.line40a_ccc_loans_election ?? 0) > 0
          ? element(
            "CCCLoanReportedElectionAmt",
            part.line40a_ccc_loans_election,
            accrualLoanStatementId === undefined ? undefined : {
              referenceDocumentId: accrualLoanStatementId,
              referenceDocumentName: "CCCLoanDetailAccrualMethodStatement",
            },
          )
          : "",
        amount("CCCLoansForfeitedAmt", part.line40b_ccc_loans_forfeited),
        amount(
          "CCCLoansForfeitedTaxableAmt",
          part.line40c_ccc_loans_forfeited_taxable,
        ),
        amount("CropInsProcAndDsstrPymtAmt", part.line41_crop_insurance),
        amount("CustomHireIncomeAmt", part.line42_custom_hire_income),
        amount("AccrualOtherIncomeAmt", part.line43_other_income),
        element("TotalIncomeAmt", calculated.totalIncome),
        element("InventoryOfProductsAtBOYAmt", part.line45_beginning_inventory),
        element(
          "CostOfProductsPrchsDuringYrAmt",
          part.line46_products_purchased,
        ),
        element(
          "InvntryAtBOYPlusCostOfPrchsAmt",
          calculated.beginningInventoryPlusPurchases,
        ),
        element("InventoryOfProductsAtEOYAmt", part.line48_ending_inventory),
        element("CostOfProductsSoldAmt", calculated.costOfProductsSold),
        element("GrossIncomeAmt", calculated.grossIncome),
      ]);
    })()
    : "";
  const expenseLines = elements("FarmExpensesGrp", [
    amount("CarAndTruckExpensesAmt", item.line10_car_truck),
    amount("ChemicalExpenseAmt", item.line11_chemicals),
    item.line12_conservation === undefined ? "" : element(
      "ConservationExpenseAmt",
      conservationDeduction(item, gross),
    ),
    amount("CustomHireExpenseAmt", item.line13_custom_hire),
    amount("DeprecAndSect179ExpnsDedAmt", item.line14_depreciation),
    amount("EmployeeBenefitProgramAmt", item.line15_employee_benefits),
    amount("FeedPurchasedExpenseAmt", item.line16_feed),
    amount("FertilizerAndLimeExpenseAmt", item.line17_fertilizers),
    amount("FreightAndTruckingExpenseAmt", item.line18_freight),
    amount("GasolineFuelAndOilExpenseAmt", item.line19_gasoline),
    amount("InsuranceAmt", item.line20_insurance),
    amount("MortgageInterestPaidBanksAmt", item.line21a_interest_mortgage),
    amount("MortgageInterestPaidOtherAmt", item.line21b_interest_other),
    amount(
      "LaborHiredExpenseAmt",
      item.line22_labor_hired === undefined && wotcReduction === 0
        ? undefined
        : laborLessEmploymentCredits(item, wotcReduction),
    ),
    amount("PensionProfitSharingPlansAmt", item.line23_pension_plans),
    amount("MachineryAndEquipmentRentAmt", item.line24a_rent_vehicles),
    amount("OtherBusinessPropertyRentAmt", item.line24b_rent_land),
    amount("RepairsAndMaintenanceAmt", item.line25_repairs),
    amount("SeedAndPlantExpenseAmt", item.line26_seeds),
    amount("StorageAndWarehousingExpnsAmt", item.line27_storage),
    amount("SuppliesAmt", item.line28_supplies),
    amount("TaxExpenseAmt", item.line29_taxes),
    amount("UtilitiesAmt", item.line30_utilities),
    amount("VtrnryBreedingMedicineExpnsAmt", item.line31_vet),
    otherExpenses.length === 0 ? "" : elements(
      "OtherFarmExpensesGrp",
      otherExpenses.map((entry) =>
        elements("OtherFarmExpense", [
          element("ExpenseDescriptionTxt", entry.description),
          element("ExpenseAmt", entry.amount),
        ])
      ),
    ),
    element("TotalExpensesAmt", expenses),
    element("NetFarmProfitLossAmt", preliminaryNet),
    checkbox("AllInvestmentIsAtRiskInd", item.line36_at_risk === "a"),
    checkbox("SomeInvestmentIsNotAtRiskInd", item.line36_at_risk === "b"),
  ]);
  return elements("IRS1040ScheduleF", [
    elements("FarmProprietorName", [
      element("BusinessNameLine1Txt", filer.fullName ?? filer.nameLine1),
    ]),
    element("SSN", filer.primarySSN.replace(/\D/g, "")),
    element("PrincipalProductDesc", item.line_a_principal_crop_activity),
    element("AgriculturalActivityCd", item.line_b_agricultural_activity_code),
    element(
      item.accounting_method === "cash"
        ? "MethodOfAccountingCashInd"
        : "MethodOfAccountingAccrualInd",
      "X",
    ),
    element("EIN", item.line_d_ein?.replace(/\D/g, "")),
    element(
      "MateriallyParticipatedInd",
      String(item.line_e_material_participation),
    ),
    item.line_f_made_1099_payments === undefined ? "" : element(
      "RequiredToFileForms1099Ind",
      String(item.line_f_made_1099_payments),
    ),
    item.line_f_filed_1099s === undefined ? "" : element(
      "RequiredForms1099FiledInd",
      String(item.line_f_filed_1099s),
    ),
    income,
    expenseLines,
    accrualIncome,
  ]);
}

export const scheduleF: MefFormDescriptor<
  "schedule_f",
  Fields,
  readonly string[]
> = {
  pendingKey: "schedule_f",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sf.pdf",
  build(fields, context = {}) {
    const input = inputSchema.parse({
      ...fields,
      schedule_fs: fields?.schedule_fs ?? [],
    });
    reconcileFarmSources(input);
    const reductions = wotcReductionsByFarm(input);
    if (reductions.size > 0 && context.pending) {
      const source = form5884InputSchema.parse(context.pending.f5884);
      const expected = new Map(
        calculateForm5884(source).wageDeductionAllocations.flatMap(
          (entry) =>
            entry.location.kind === "schedule_f"
              ? [[entry.location.farm_id, entry.credit_amount] as const]
              : [],
        ),
      );
      if (
        expected.size !== reductions.size ||
        [...reductions].some(([key, amount]) => expected.get(key) !== amount)
      ) {
        throw new Error(
          "Schedule F WOTC reduction needs matching Form 5884 line 2",
        );
      }
    }
    const rentalSource = context.pending?.f4835;
    const rentalItems = rentalSource === undefined
      ? []
      : form4835InputSchema.parse(rentalSource).f4835s;
    const rentalLoanCount =
      rentalItems.filter((item) => (item.ccc_loans_reported_election ?? 0) > 0)
        .length;
    const rentalCropCount =
      rentalItems.filter((item) => item.defer_crop_insurance === true).length;
    const loanIds = context.documentIdsByPendingKey?.ccc_loan_statement ?? [];
    const accrualLoanIds =
      context.documentIdsByPendingKey?.ccc_loan_accrual_statement ?? [];
    const cropIds =
      context.documentIdsByPendingKey?.crop_insurance_deferral_statement ?? [];
    const ownerLoanCount =
      input.schedule_fs.filter((item) =>
        item.accounting_method === "cash" &&
        (item.line5a_ccc_loans_election ?? 0) > 0
      ).length;
    const accrualLoanCount =
      input.schedule_fs.filter((item) =>
        item.accounting_method === "accrual" &&
        (item.part_iii?.line40a_ccc_loans_election ?? 0) > 0
      ).length;
    const ownerCropCount =
      input.schedule_fs.filter((item) =>
        item.line6c_defer_crop_insurance === true
      ).length;
    if (context.documentIdsByPendingKey !== undefined) {
      if (loanIds.length !== rentalLoanCount + ownerLoanCount) {
        throw new Error(
          "Schedule F CCC loan statements do not match farm elections",
        );
      }
      if (accrualLoanIds.length !== accrualLoanCount) {
        throw new Error(
          "Schedule F accrual CCC loan statements do not match farm elections",
        );
      }
      if (cropIds.length !== rentalCropCount + ownerCropCount) {
        throw new Error(
          "Schedule F crop insurance statements do not match farm elections",
        );
      }
    }
    let loanIndex = rentalLoanCount;
    let cropIndex = rentalCropCount;
    let accrualLoanIndex = 0;
    return input.schedule_fs.map((item, index) =>
      buildFarm(
        item,
        context,
        index,
        (item.line5a_ccc_loans_election ?? 0) > 0
          ? loanIds[loanIndex++]
          : undefined,
        item.line6c_defer_crop_insurance === true
          ? cropIds[cropIndex++]
          : undefined,
        (item.part_iii?.line40a_ccc_loans_election ?? 0) > 0
          ? accrualLoanIds[accrualLoanIndex++]
          : undefined,
        reductions.get(item.farm_id ?? "") ?? 0,
      )
    );
  },
};
