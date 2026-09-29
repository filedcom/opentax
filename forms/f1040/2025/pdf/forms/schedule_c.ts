import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import { FilingStatus, filingStatusSchema, TS } from "../../../nodes/types.ts";
import {
  assertScheduleCInterestExempt,
  computeCOGS,
  computeGrossIncome,
  computeNetProfit,
  computeTotalExpenses,
  homeOfficeDeduction,
  inputSchema,
  mealsDeductiblePct,
  projectScheduleCItems,
  type ScheduleCItem,
  wagesLessEmploymentCredits,
  wotcReductionsByBusiness,
} from "../../../nodes/inputs/schedule_c/model.ts";
import { assertCurrentYearSection481aMatches } from "../../../nodes/inputs/f3115/index.ts";

// Field names and locations are from the two-page 2025 Schedule C AcroForm.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const text = (key: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: field,
});
const choice = (key: string, field: string, value: string): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey: key,
  pdfField: field,
  whenValue: value,
});
const answer = (key: string, prefix: string): PdfFieldEntry[] => [
  choice(key, `${prefix}[0]`, "true"),
  choice(key, `${prefix}[1]`, "false"),
];

const expenseKeys = [
  "line_8_advertising",
  "line_9_car_truck_expenses",
  "line_10_commissions_fees",
  "line_11_contract_labor",
  "line_12_depletion",
  "line_13_depreciation",
  "line_14_employee_benefits",
  "line_15_insurance",
  "line_16a_interest_mortgage",
  "line_16b_interest_other",
  "line_17_professional_services",
] as const;
const remainingExpenseKeys = [
  "line_18_office_expense",
  "line_19_pension_plans",
  "line_20a_rent_vehicles",
  "line_20b_rent_other",
  "line_21_repairs",
  "line_22_supplies",
  "line_23_taxes_licenses",
  "line_24a_travel",
  "line_24b_meals",
  "line_25_utilities",
  "line_26_wages",
] as const;

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("proprietor_name", `${page1}f1_1[0]`),
  text("proprietor_ssn", `${page1}f1_2[0]`),
  text("line_a_principal_business", `${page1}f1_3[0]`),
  text("line_b_business_code", `${page1}BComb[0].f1_4[0]`),
  text("line_c_business_name", `${page1}f1_5[0]`),
  text("line_d_ein", `${page1}DComb[0].f1_6[0]`),
  text("business_street", `${page1}f1_7[0]`),
  text("business_city_state_zip", `${page1}f1_8[0]`),
  choice("line_f_accounting_method", `${page1}c1_1[0]`, "cash"),
  choice("line_f_accounting_method", `${page1}c1_1[1]`, "accrual"),
  ...answer("line_g_material_participation", `${page1}c1_2`),
  choice("line_h_new_business", `${page1}c1_3[0]`, "true"),
  ...answer("line_i_made_1099_payments", `${page1}c1_4`),
  ...answer("line_j_filed_1099s", `${page1}c1_5`),
  choice("statutory_employee", `${page1}Line1_ReadOrder[0].c1_6[0]`, "true"),
  ...["line1", "line2", "line3", "line4", "line5", "line6", "line7"].map(
    (key, index) => text(key, `${page1}f1_${10 + index}[0]`),
  ),
  ...expenseKeys.map((key, index) =>
    text(key, `${page1}Lines8-17[0].f1_${17 + index}[0]`)
  ),
  ...remainingExpenseKeys.map((key, index) =>
    text(key, `${page1}Lines18-27[0].f1_${28 + index}[0]`)
  ),
  text("line_27a_energy_efficient", `${page1}Lines18-27[0].f1_40[0]`),
  text("line27b", `${page1}Lines18-27[0].f1_39[0]`),
  text("line28", `${page1}f1_41[0]`),
  text("line29", `${page1}f1_42[0]`),
  text("line30", `${page1}f1_45[0]`),
  text("line31", `${page1}f1_46[0]`),
  choice("line_32_at_risk", `${page1}c1_7[0]`, "a"),
  choice("line_32_at_risk", `${page1}c1_7[1]`, "b"),
  choice("line_33_inventory_method", `${page2}c2_1[0]`, "cost"),
  choice("line_33_inventory_method", `${page2}c2_2[0]`, "lcm"),
  ...answer("line_34_inventory_change", `${page2}c2_4`),
  ...[
    "line35",
    "line36",
    "line37",
    "line38",
    "line39",
    "line40",
    "line41",
    "line42",
  ].map(
    (key, index) => text(key, `${page2}f2_${index + 1}[0]`),
  ),
  text("vehicle_month", `${page2}f2_9[0]`),
  text("vehicle_day", `${page2}f2_10[0]`),
  text("vehicle_year", `${page2}f2_11[0]`),
  text("vehicle_business_miles", `${page2}f2_12[0]`),
  text("vehicle_commuting_miles", `${page2}f2_13[0]`),
  text("vehicle_other_miles", `${page2}f2_14[0]`),
  ...answer("line_45_personal_use", `${page2}c2_5`),
  ...answer("line_46_another_vehicle", `${page2}c2_6`),
  ...answer("line_47a_evidence", `${page2}c2_7`),
  ...answer("line_47b_written_evidence", `${page2}c2_8`),
  text("line48", `${page2}f2_33[0]`),
];

function requirePrintable(
  item: ScheduleCItem,
  filingStatus: unknown,
): void {
  if (
    item.proprietor_recipient === undefined &&
    (!filingStatusSchema.safeParse(filingStatus).success ||
      filingStatus === FilingStatus.MFJ)
  ) {
    throw new Error(
      "Schedule C PDF needs a known nonjoint status or explicit proprietor",
    );
  }
  if (
    item.proprietor_recipient !== undefined &&
    item.proprietor_recipient !== TS.T
  ) {
    throw new Error(
      "Schedule C PDF requires an identified taxpayer-owned business",
    );
  }
  if (item.line_f_accounting_method === "other") {
    throw new Error(
      "Schedule C PDF needs the other accounting-method description",
    );
  }
  if (
    item.line_33_inventory_method === "other" ||
    item.line_34_inventory_change === true
  ) {
    throw new Error(
      "Schedule C PDF needs the inventory-method or change explanation",
    );
  }
  if ((item.line_27b_other_expenses ?? 0) !== 0) {
    throw new Error(
      "Schedule C PDF line 27b requires described Part V expenses",
    );
  }
  const other = item.part_v_other_expenses ?? [];
  if (other.length > 9 || other.some((entry) => !entry.description.trim())) {
    throw new Error(
      "Schedule C PDF Part V requires at most nine described expenses",
    );
  }
  if (
    item.home_office_method === "simplified" ||
    item.home_office_sq_ft !== undefined
  ) {
    throw new Error(
      "Schedule C PDF simplified line 30 needs total home square footage",
    );
  }
  if (
    typeof item.line_i_made_1099_payments !== "boolean" ||
    (item.line_i_made_1099_payments &&
      typeof item.line_j_filed_1099s !== "boolean")
  ) {
    throw new Error("Schedule C PDF needs required Forms 1099 answers");
  }
  const vehicleFacts = [
    item.line_43_date_in_service,
    item.line_44a_total_miles,
    item.line_44b_business_miles,
    item.line_44c_commuting_miles,
    item.line_44d_other_miles,
    item.line_45_personal_use,
    item.line_46_another_vehicle,
    item.line_47a_evidence,
    item.line_47b_written_evidence,
  ];
  if (
    (item.line_9_car_truck_expenses ?? 0) > 0 ||
    vehicleFacts.some((value) => value !== undefined)
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(item.line_43_date_in_service ?? "") ||
      item.line_44b_business_miles === undefined ||
      item.line_44c_commuting_miles === undefined ||
      item.line_44d_other_miles === undefined ||
      item.line_45_personal_use === undefined ||
      item.line_46_another_vehicle === undefined ||
      item.line_47a_evidence === undefined ||
      (item.line_47a_evidence &&
        item.line_47b_written_evidence === undefined) ||
      (item.line_44a_total_miles !== undefined &&
        item.line_44a_total_miles !== item.line_44b_business_miles +
            item.line_44c_commuting_miles + item.line_44d_other_miles)
    ) {
      throw new Error(
        "Schedule C PDF needs complete and consistent Part IV vehicle details",
      );
    }
  }
}

function projectBusiness(
  item: ScheduleCItem,
  wotcReduction: number,
  filingStatus: unknown,
): Record<string, unknown> {
  requirePrintable(item, filingStatus);
  const line1 = item.line_1_gross_receipts;
  const line2 = item.line_2_returns_allowances ?? 0;
  const line3 = line1 - line2;
  const line4 = computeCOGS(item);
  const line5 = line3 - line4;
  const line6 = item.line_6_other_income ?? 0;
  const line7 = computeGrossIncome(item);
  const line28 = computeTotalExpenses(item, wotcReduction);
  const line29 = line7 - line28;
  const line30 = homeOfficeDeduction(item, line29);
  const line31 = computeNetProfit(item, wotcReduction);
  if (item.professional_gambler === true && line31 !== line29 - line30) {
    throw new Error(
      "Schedule C PDF cannot print clamped professional-gambler loss",
    );
  }
  if (line31 < 0 && item.line_32_at_risk === undefined) {
    throw new Error("Schedule C PDF loss needs line 32 at-risk answer");
  }
  const cogsFacts = [
    item.line_35_cogs_beginning_inventory,
    item.line_36_purchases,
    item.line_37_cost_of_labor,
    item.line_38_materials_supplies_cogs,
    item.line_39_other_cogs,
    item.line_41_cogs_ending_inventory,
  ];
  if (
    cogsFacts.some((value) => value !== undefined) &&
    (!item.line_33_inventory_method ||
      item.line_34_inventory_change === undefined)
  ) {
    throw new Error(
      "Schedule C PDF COGS needs inventory method and change answer",
    );
  }
  const date = item.line_43_date_in_service?.split("-");
  const address = item.line_e_business_address;
  const line48 = (item.part_v_other_expenses ?? []).reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  return {
    ...item,
    line_d_ein: item.line_d_ein?.replaceAll("-", ""),
    business_street: address
      ? [address.line1, address.line2].filter(Boolean).join(" ")
      : undefined,
    business_city_state_zip: address
      ? `${address.city}, ${address.state} ${address.zip}`
      : undefined,
    line1,
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line_24b_meals: (item.line_24b_meals ?? 0) * mealsDeductiblePct(item),
    line_26_wages: wagesLessEmploymentCredits(item, wotcReduction),
    line27b: line48,
    line28,
    line29,
    line30,
    line31,
    line35: item.line_35_cogs_beginning_inventory,
    line36: item.line_36_purchases,
    line37: item.line_37_cost_of_labor,
    line38: item.line_38_materials_supplies_cogs,
    line39: item.line_39_other_cogs,
    line40: cogsFacts.some((value) => value !== undefined)
      ? line4 + (item.line_41_cogs_ending_inventory ?? 0)
      : undefined,
    line41: item.line_41_cogs_ending_inventory,
    line42: cogsFacts.some((value) => value !== undefined) ? line4 : undefined,
    vehicle_month: date?.[1],
    vehicle_day: date?.[2],
    vehicle_year: date?.[0],
    vehicle_business_miles: item.line_44b_business_miles,
    vehicle_commuting_miles: item.line_44c_commuting_miles,
    vehicle_other_miles: item.line_44d_other_miles,
    line48,
  };
}

function proprietorIdentity(
  allPending: Record<string, Record<string, unknown>>,
) {
  const general = allPending.general ?? {};
  const name = [
    general.taxpayer_first_name,
    general.taxpayer_middle_initial,
    general.taxpayer_last_name,
  ].filter((part): part is string =>
    typeof part === "string" && part.trim() !== ""
  ).join(" ");
  const ssn = general.taxpayer_ssn;
  if (!name || typeof ssn !== "string" || !/^\d{3}-?\d{2}-?\d{4}$/.test(ssn)) {
    throw new Error("Schedule C PDF needs taxpayer name and SSN");
  }
  return { proprietor_name: name, proprietor_ssn: ssn.replaceAll("-", "") };
}

export const scheduleCPdf: PdfFormDescriptor = {
  pendingKey: "schedule_c",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sc--2025.pdf",
  fields,
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return { schedule_c_instances: [] };
    const input = inputSchema.parse(raw);
    if (
      allPending.f3115 ||
      (input.section481a_adjustments?.length ?? 0) > 0
    ) {
      if (!allPending.f3115) {
        throw new Error(
          "Schedule C PDF section 481(a) adjustments need Form 3115 source",
        );
      }
      assertCurrentYearSection481aMatches(
        allPending.f3115,
        input.section481a_adjustments ?? [],
        2025,
      );
    }
    if (input.schedule_cs.length === 0) {
      if (
        input.form8829_line30 ||
        (input.section481a_adjustments?.length ?? 0) > 0 ||
        (input.wotc_wage_reductions?.length ?? 0) > 0 ||
        (input.line_30_home_office ?? 0) > 0 ||
        (input.line1_gross_receipts ?? 0) > 0 ||
        (input.statutory_wages ?? 0) > 0 ||
        (input.line16a_interest_mortgage ?? 0) > 0 ||
        (input.line_9_car_truck_expenses ?? 0) > 0 ||
        (input.line_12_depletion ?? 0) > 0
      ) {
        throw new Error(
          "Schedule C PDF has source amounts without a business item",
        );
      }
      return { schedule_c_instances: [] };
    }
    if (
      (input.line_30_home_office ?? 0) > 0 ||
      (input.line1_gross_receipts ?? 0) > 0 ||
      (input.statutory_wages ?? 0) > 0 ||
      (input.line16a_interest_mortgage ?? 0) > 0 ||
      (input.line_9_car_truck_expenses ?? 0) > 0 ||
      (input.line_12_depletion ?? 0) > 0
    ) {
      throw new Error(
        "Schedule C PDF needs business-specific top-level adjustments",
      );
    }
    if (input.schedule_cs.some((item) => (item.line_30_home_office ?? 0) > 0)) {
      throw new Error(
        "Schedule C PDF line 30 needs a linked Form 8829 calculation",
      );
    }
    // Form 5884's node imports the live Schedule C node. Its source join is
    // not available to this pure PDF descriptor without reopening that cycle.
    if ((input.wotc_wage_reductions?.length ?? 0) > 0) {
      throw new Error(
        "Schedule C PDF WOTC wage reduction needs the matching Form 5884 source",
      );
    }
    const identity = proprietorIdentity(allPending);
    const items = projectScheduleCItems(input);
    items.forEach((item) =>
      assertScheduleCInterestExempt(
        item,
        CONFIG_BY_YEAR[2025].smallBizGrossReceipts,
      )
    );
    const wotc = wotcReductionsByBusiness(input);
    return {
      schedule_c_instances: items.map((item) => ({
        ...projectBusiness(
          item,
          wotc.get(item.business_reference ?? "") ?? 0,
          allPending.general?.filing_status,
        ),
        ...identity,
      })),
    };
  },
  instances(fields) {
    return fields.schedule_c_instances as Record<string, unknown>[];
  },
  rows: {
    domainKey: "part_v_other_expenses",
    maxRows: 9,
    rowStride: 2,
    rowFields: [
      {
        kind: "text",
        domainKey: "description",
        pdfFieldPattern: `${page2}PartVTable[0].Item{row}[0].f2_{field_num}[0]`,
        fieldNumBase: 15,
      },
      {
        kind: "text",
        domainKey: "amount",
        pdfFieldPattern: `${page2}PartVTable[0].Item{row}[0].f2_{field_num}[0]`,
        fieldNumBase: 16,
      },
    ],
  },
};
