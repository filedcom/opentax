import { filedOwnedScheduleF } from "../../../nodes/owned-business-filing.ts";
import { assertFarmWotcReturn } from "../../form8995_farm_wotc_reconciliation.ts";
import { patronFiledBusinessLines } from "../../../nodes/inputs/qbi_patron/calculation.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { appendExpenseStatement } from "./expense-statement.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  assertScheduleF1099Answers,
  assertScheduleFLossAtRiskAnswer,
  computeAccrualIncome,
  computeGrossIncome,
  computeTotalExpenses,
  conservationDeduction,
  inputSchema,
  projectScheduleFItems,
  laborLessEmploymentCredits,
  reconcileFarmSources,
  type ScheduleFItem,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import {
  calculateForm5884,
  inputSchema as form5884InputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import { reconcileForm8941DocumentSource } from "../../mef/forms/f8941_source.ts";

// Field names verified against the 2025 IRS Schedule F AcroForm.
const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";
const txt = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const box = (
  domainKey: string,
  pdfField: string,
  whenValue: string,
): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey,
  pdfField,
  whenValue,
});
const answer = (key: string, prefix: string): PdfFieldEntry[] => [
  box(key, `${prefix}[0]`, "true"),
  box(key, `${prefix}[1]`, "false"),
];

type OtherExpense = NonNullable<ScheduleFItem["line32_other_expenses"]>[number];

const fields: ReadonlyArray<PdfFieldEntry> = [
  txt("proprietor_name", `${p1}f1_1[0]`),
  txt("proprietor_ssn", `${p1}f1_2[0]`),
  txt("line_a_principal_crop_activity", `${p1}f1_3[0]`),
  txt("line_b_agricultural_activity_code", `${p1}CombField_LineB[0].f1_4[0]`),
  box("accounting_method", `${p1}LineC_ReadOrder[0].c1_1[0]`, "cash"),
  box("accounting_method", `${p1}LineC_ReadOrder[0].c1_1[1]`, "accrual"),
  txt("line_d_ein", `${p1}CombField_LineD[0].f1_5[0]`),
  ...answer("line_e_material_participation", `${p1}c1_2`),
  ...answer("line_f_made_1099_payments", `${p1}c1_3`),
  ...answer("line_f_filed_1099s", `${p1}c1_4`),
  ...[
    "line1_sales_livestock_resale",
    "line1b_cost_livestock_resale",
    "line1c_profit",
    "line2_sales_products_raised",
    "line3a_cooperative_distributions",
    "line3b_cooperative_distributions_taxable",
    "line4a_ag_program_payments",
    "line4b_ag_program_payments_taxable",
    "line5a_ccc_loans_election",
    "line5b_ccc_loans_forfeited",
    "line5c_ccc_loans_forfeited_taxable",
    "line6a_crop_insurance",
    "line6b_crop_insurance_taxable",
  ].map((key, index) => txt(key, `${p1}f1_${6 + index}[0]`)),
  box("line6c_defer_crop_insurance", `${p1}c1_5[0]`, "true"),
  txt("line6d_crop_insurance_deferred", `${p1}f1_19[0]`),
  txt("line7_custom_hire_income", `${p1}f1_20[0]`),
  txt("line8_other_income", `${p1}f1_21[0]`),
  txt("line9_gross_income", `${p1}f1_22[0]`),
  ...[
    "line10_car_truck",
    "line11_chemicals",
    "line12_conservation_allowed",
    "line13_custom_hire",
    "line14_depreciation",
    "line15_employee_benefits",
    "line16_feed",
    "line17_fertilizers",
    "line18_freight",
    "line19_gasoline",
    "line20_insurance",
    "line21a_interest_mortgage",
    "line21b_interest_other",
    "line22_labor_after_credits",
  ].map((key, index) => txt(key, `${p1}Lines10-22[0].f1_${23 + index}[0]`)),
  ...[
    "line23_pension_plans",
    "line24a_rent_vehicles",
    "line24b_rent_land",
    "line25_repairs",
    "line26_seeds",
    "line27_storage",
    "line28_supplies",
    "line29_taxes",
    "line30_utilities",
    "line31_vet",
  ].map((key, index) => txt(key, `${p1}f1_${37 + index}[0]`)),
  ...Array.from({ length: 6 }, (_, index) => [
    txt(`other_description_${index}`, `${p1}f1_${47 + index * 2}[0]`),
    txt(`other_amount_${index}`, `${p1}f1_${48 + index * 2}[0]`),
  ]).flat(),
  txt("line33_total_expenses", `${p1}f1_59[0]`),
  txt("line34_net_profit", `${p1}f1_60[0]`),
  box("line36_at_risk", `${p1}c1_6[0]`, "a"),
  box("line36_at_risk", `${p1}c1_6[1]`, "b"),
  txt("part_iii.line37_sales_products", `${p2}f2_1[0]`),
  txt(
    "part_iii.line38a_cooperative_distributions",
    `${p2}Line38a_ReadOrder[0].f2_2[0]`,
  ),
  txt("part_iii.line38b_cooperative_distributions_taxable", `${p2}f2_3[0]`),
  txt(
    "part_iii.line39a_ag_program_payments",
    `${p2}Line39a_ReadOrder[0].f2_4[0]`,
  ),
  txt("part_iii.line39b_ag_program_payments_taxable", `${p2}f2_5[0]`),
  txt("part_iii.line40a_ccc_loans_election", `${p2}f2_6[0]`),
  txt(
    "part_iii.line40b_ccc_loans_forfeited",
    `${p2}Line40b_ReadOrder[0].f2_7[0]`,
  ),
  txt("part_iii.line40c_ccc_loans_forfeited_taxable", `${p2}f2_8[0]`),
  ...[
    "line41_crop_insurance",
    "line42_custom_hire_income",
    "line43_other_income",
  ].map(
    (key, index) => txt(`part_iii.${key}`, `${p2}f2_${9 + index}[0]`),
  ),
  txt("line44_total_income", `${p2}f2_12[0]`),
  txt(
    "part_iii.line45_beginning_inventory",
    `${p2}Line45_ReadOrder[0].f2_13[0]`,
  ),
  txt("part_iii.line46_products_purchased", `${p2}f2_14[0]`),
  txt("line47_inventory_plus_purchases", `${p2}f2_15[0]`),
  txt("part_iii.line48_ending_inventory", `${p2}f2_16[0]`),
  txt("line49_cost_of_products_sold", `${p2}f2_17[0]`),
  txt("line50_gross_income", `${p2}f2_18[0]`),
];

function proprietor(item: ScheduleFItem, filer: FilerIdentity | undefined) {
  if (!filer) throw new Error("Schedule F PDF needs filer identity");
  if (
    item.proprietor_recipient === undefined &&
    filer.filingStatus === FilingStatus.MarriedFilingJointly
  ) {
    throw new Error("Schedule F PDF joint return needs an explicit proprietor");
  }
  if (item.proprietor_recipient === "S") {
    if (
      filer.filingStatus !== FilingStatus.MarriedFilingJointly || !filer.spouse
    ) {
      throw new Error(
        "Schedule F PDF spouse proprietor needs a joint return and spouse identity",
      );
    }
    const spouse = filer.spouse;
    return {
      proprietor_name: [
        spouse.firstName,
        spouse.middleInitial,
        spouse.lastName,
        spouse.suffix,
      ].filter(Boolean).join(" "),
      proprietor_ssn: spouse.ssn.replace(/\D/g, ""),
    };
  }
  return {
    proprietor_name: filer.fullName ?? filer.nameLine1,
    proprietor_ssn: filer.primarySSN.replace(/\D/g, ""),
  };
}

export const scheduleFPdf: PdfFormDescriptor = {
  pendingKey: "schedule_f",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sf--2025.pdf",
  fields,
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    assertFarmWotcReturn(
      allPending?.form8995a ?? allPending?.form8995 ?? {},
      allPending,
      filer,
      { key: "schedule_f", value: raw },
    );
    const input = inputSchema.parse(raw);
    reconcileFarmSources(input);
    if (input.form8941_premium_reductions?.length) {
      reconcileForm8941DocumentSource(
        allPending?.f8941,
        allPending ?? {},
        filer,
      );
    }
    const reductions = wotcReductionsByFarm(input);
    const filedItems = projectScheduleFItems(input);
    if (reductions.size > 0) {
      const source = form5884InputSchema.parse(allPending?.f5884);
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
          "Schedule F PDF WOTC reduction needs matching Form 5884 line 2",
        );
      }
    }
    return filedItems.map((rawItem, index) => {
      const filing = filedOwnedScheduleF(
        rawItem,
        Boolean(input.patron_filing_review) ||
          input.farm_optional_method_elected === true,
        reductions.get(rawItem.farm_id ?? "") ?? 0,
      );
      const item = rawItem.qbi_wotc_filing_review
        ? patronFiledBusinessLines(
          "schedule_f",
          rawItem,
          reductions.get(rawItem.farm_id ?? "") ?? 0,
        ).filed_source as typeof rawItem
        : input.patron_filing_review
        ? patronFiledBusinessLines("schedule_f", rawItem)
          .filed_source as typeof rawItem
        : filedOwnedScheduleF(
          rawItem,
          input.farm_optional_method_elected === true,
          reductions.get(rawItem.farm_id ?? "") ?? 0,
        )?.filed_source ?? rawItem;
      assertScheduleF1099Answers(item);
      const other = item.line32_other_expenses ?? [];
      const continuation = other.length > 6 ? other.slice(5) : [];
      const continuationTotal = continuation.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      const printedOther: OtherExpense[] = continuation.length
        ? [...other.slice(0, 5), {
          description: "SEE ATTACHED",
          amount: continuationTotal,
        }]
        : other;
      const accrual = item.accounting_method === "accrual"
        ? computeAccrualIncome(item)
        : undefined;
      const gross = computeGrossIncome(item);
      const wotcReduction = reductions.get(item.farm_id ?? "") ?? 0;
      const expenses = filing?.expenses ??
        computeTotalExpenses(item, gross, wotcReduction);
      assertScheduleFLossAtRiskAnswer(item, wotcReduction);
      return {
        ...item,
        farm_copy_number: index + 1,
        ...proprietor(item, filer),
        line_d_ein: item.line_d_ein?.replace(/\D/g, ""),
        line1c_profit: item.accounting_method === "cash"
          ? (item.line1_sales_livestock_resale ?? 0) -
            (item.line1b_cost_livestock_resale ?? 0)
          : undefined,
        line9_gross_income: gross,
        line12_conservation_allowed: item.line12_conservation === undefined
          ? undefined
          : filing?.conservation_deduction ??
            conservationDeduction(item, gross),
        line22_labor_after_credits: item.line22_labor_hired === undefined &&
            item.line22_other_employment_credits === undefined
          ? undefined
          : laborLessEmploymentCredits(item, wotcReduction),
        ...Object.fromEntries(
          printedOther.flatMap((entry, index) => [
            [`other_description_${index}`, entry.description],
            [`other_amount_${index}`, entry.amount],
          ]),
        ),
        line32_statement_rows: continuation,
        line32_statement_total: continuationTotal,
        line33_total_expenses: expenses,
        line34_net_profit: gross - expenses,
        line44_total_income: accrual?.totalIncome,
        line47_inventory_plus_purchases: accrual
          ?.beginningInventoryPlusPurchases,
        line49_cost_of_products_sold: accrual?.costOfProductsSold,
        line50_gross_income: accrual?.grossIncome,
        ...Object.fromEntries(
          Object.entries(item.part_iii ?? {}).map((
            [key, value],
          ) => [`part_iii.${key}`, value]),
        ),
      };
    });
  },
  async appendSupplementalPages(document, fields) {
    const rows = fields.line32_statement_rows as OtherExpense[] | undefined;
    if (!rows?.length) return;
    const farmLabel = `Farm copy ${String(fields.farm_copy_number)}` +
      (fields.farm_id ? `  ID: ${String(fields.farm_id)}` : "");
    await appendExpenseStatement(document, {
      title: "Schedule F (2025) - Line 32f other expenses",
      proprietorName: String(fields.proprietor_name ?? ""),
      proprietorSsn: String(fields.proprietor_ssn ?? ""),
      activityLabel: farmLabel,
      destinationLabel: "Schedule F line 32f",
      rows,
      expectedTotal: Number(fields.line32_statement_total),
    });
  },
};
