import { form8936Lines } from "../../form8936_lines.ts";
import {
  businessUsePercentage,
  computeCommercialVehicleCreditLines,
  computeNewVehicleCreditParts,
  computeVehiclePersonalCredit,
  incomeLimit,
  inputSchema,
  modifiedAgi,
} from "../../../nodes/inputs/f8936/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";
const p3 = "topmostSubform[0].Page3[0].";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const checked = (
  domainKey: string,
  pdfField: string,
  whenValue: string,
): PdfFieldEntry => ({ kind: "checkboxWhen", domainKey, pdfField, whenValue });
const yesNo = (
  domainKey: string,
  page: string,
  field: string,
): ReadonlyArray<PdfFieldEntry> => [
  checked(domainKey, `${page}${field}[0]`, "true"),
  checked(domainKey, `${page}${field}[1]`, "false"),
];

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("vehicle_year", `${p1}f1_3[0]`),
  text("vehicle_make", `${p1}f1_4[0]`),
  text("vehicle_model", `${p1}f1_5[0]`),
  text("vin", `${p1}Line2_Comb[0].f1_6[0]`),
  text("service_date", `${p1}f1_7[0]`),
  ...yesNo("transferred_to_dealer", p1, "c1_1"),
  text("transferred_amount", `${p1}f1_8[0]`),
  checked("dealer_transfer_repayment", `${p1}c1_2[0]`, "true"),
  ...yesNo("is_new_vehicle", p1, "c1_3"),
  ...yesNo("is_used_vehicle", p1, "c1_4"),
  ...yesNo("is_commercial_vehicle", p1, "c1_5"),
  ...yesNo("new_resold_within_30_days", p1, "c1_6"),
  ...yesNo("new_individual_return", p1, "c1_7"),
  ...yesNo("new_current_magi_over_limit", p1, "c1_8"),
  ...yesNo("new_prior_magi_over_limit", p1, "c1_9"),
  ...yesNo("new_acquired_for_use", p2, "c2_1"),
  text("new_tentative_credit", `${p2}f2_1[0]`),
  text("new_business_use_pct", `${p2}f2_2[0]`),
  text("new_business_credit", `${p2}f2_3[0]`),
  text("new_personal_credit", `${p2}f2_4[0]`),
  ...yesNo("used_resold_within_30_days", p2, "c2_3"),
  ...yesNo("used_current_magi_over_limit", p2, "c2_4"),
  ...yesNo("used_prior_magi_over_limit", p2, "c2_5"),
  ...yesNo("used_claimed_prev_credit", p2, "c2_6"),
  ...yesNo("used_price_over_cap", p2, "c2_7"),
  ...yesNo("used_acquired_for_use", p2, "c2_8"),
  ...yesNo("used_claimed_as_dependent", p2, "c2_9"),
  text("used_sale_price", `${p2}f2_5[0]`),
  text("used_sale_price_30pct", `${p2}f2_6[0]`),
  text("used_credit_cap", `${p2}f2_7[0]`),
  text("used_personal_credit", `${p2}f2_8[0]`),
  ...yesNo("commercial_subject_to_depreciation", p3, "c3_1"),
  ...yesNo("commercial_acquired_for_use", p3, "c3_2"),
  ...yesNo("commercial_gas_or_diesel", p3, "c3_3"),
  text("commercial_gvwr", `${p3}f3_2[0]`),
  text("commercial_basis", `${p3}f3_3[0]`),
  text("commercial_section179", `${p3}f3_4[0]`),
  text("commercial_adjusted_basis", `${p3}f3_5[0]`),
  text("commercial_basis_percentage", `${p3}f3_6[0]`),
  text("commercial_incremental_cost", `${p3}f3_7[0]`),
  text("commercial_lesser_cost", `${p3}f3_8[0]`),
  text("commercial_maximum_credit", `${p3}f3_9[0]`),
  text("commercial_credit", `${p3}f3_10[0]`),
];

function formatServiceDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

export const form8936ScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "f8936",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8936sa--2025.pdf",
  fields,
  filerFields: [
    text("nameLine1", `${p1}f1_1[0]`),
    text("primarySSN", `${p1}f1_2[0]`),
  ],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f8936s) || fields.f8936s.length === 0) {
      return {};
    }
    const source = inputSchema.parse(fields);
    if (form8936Lines(source, allPending) === undefined) return {};
    return source;
  },
  instances(fields) {
    const source = inputSchema.safeParse(fields);
    if (!source.success) return [];
    const input = source.data;
    return input.f8936s.flatMap((item) => {
      const personalCredit = computeVehiclePersonalCredit(item, input);
      const businessCredit = item.credit_kind === "new_clean_vehicle"
        ? computeNewVehicleCreditParts(item, input).business
        : item.credit_kind === "qualified_commercial_clean_vehicle"
        ? computeCommercialVehicleCreditLines(item).line26Credit
        : 0;
      if (
        personalCredit === 0 && businessCredit === 0 &&
        item.transferred_to_dealer !== true
      ) {
        return [];
      }
      if (
        item.vehicle_year === undefined || !item.vehicle_make ||
        !item.vehicle_model || !item.vin || !item.placed_in_service_date
      ) {
        throw new Error(
          "Form 8936 Schedule A PDF needs complete vehicle details",
        );
      }
      const used = item.credit_kind === "previously_owned_clean_vehicle";
      const commercial =
        item.credit_kind === "qualified_commercial_clean_vehicle";
      const currentOver = modifiedAgi(input.current_year_magi) >
        incomeLimit(input.filing_status, used);
      const priorOver = modifiedAgi(input.prior_year_magi) >
        incomeLimit(input.prior_year_filing_status, used);
      const resold = item.resold_within_30_days === true;
      const passesIncome = !resold && !(currentOver && priorOver);
      const directedRepaymentBox = item.transferred_to_dealer === true &&
        (resold || (currentOver && priorOver));
      const common = {
        vehicle_year: item.vehicle_year,
        vehicle_make: item.vehicle_make,
        vehicle_model: item.vehicle_model,
        vin: item.vin,
        service_date: formatServiceDate(item.placed_in_service_date),
        transferred_to_dealer: item.transferred_to_dealer,
        transferred_amount: item.transferred_to_dealer
          ? item.transferred_amount
          : undefined,
        dealer_transfer_repayment: directedRepaymentBox,
        is_new_vehicle: item.credit_kind === "new_clean_vehicle",
        is_used_vehicle: used,
        is_commercial_vehicle: commercial,
      };
      return [{
        ...common,
        ...(commercial
          ? (() => {
            const facts = item.commercial!;
            const lines = computeCommercialVehicleCreditLines(item);
            return {
              commercial_subject_to_depreciation: facts.subject_to_depreciation,
              commercial_acquired_for_use: item.acquired_for_use_not_resale,
              commercial_gas_or_diesel: facts.powered_partly_by_gas_or_diesel,
              commercial_gvwr: facts.gvwr_pounds,
              commercial_basis: lines.line19Basis,
              commercial_section179: lines.line20Section179,
              commercial_adjusted_basis: lines.line21AdjustedBasis,
              commercial_basis_percentage: Math.round(
                lines.line22BasisPercentage,
              ),
              commercial_incremental_cost: lines.line23IncrementalCost,
              commercial_lesser_cost: Math.round(lines.line24LesserCost),
              commercial_maximum_credit: lines.line25MaximumCredit,
              commercial_credit: lines.line26Credit,
            };
          })()
          : item.credit_kind === "new_clean_vehicle"
          ? {
            new_resold_within_30_days: item.resold_within_30_days,
            new_individual_return: !resold ? true : undefined,
            new_current_magi_over_limit: !resold ? currentOver : undefined,
            new_prior_magi_over_limit: !resold && currentOver
              ? priorOver
              : undefined,
            new_acquired_for_use: passesIncome
              ? item.acquired_for_use_not_resale
              : undefined,
            new_tentative_credit: passesIncome &&
                item.acquired_for_use_not_resale
              ? Math.min(item.credit_amount ?? 0, 7_500)
              : undefined,
            new_business_use_pct: businessCredit > 0
              ? `${(businessUsePercentage(item) * 100).toFixed(2)}%`
              : undefined,
            new_business_credit: businessCredit > 0
              ? businessCredit
              : undefined,
            new_personal_credit: personalCredit > 0
              ? personalCredit
              : undefined,
          }
          : {
            used_resold_within_30_days: item.resold_within_30_days,
            used_current_magi_over_limit: !resold ? currentOver : undefined,
            used_prior_magi_over_limit: !resold && currentOver
              ? priorOver
              : undefined,
            used_claimed_prev_credit: passesIncome
              ? item.claimed_prev_owned_credit_last_3_years
              : undefined,
            used_price_over_cap: passesIncome &&
                !item.claimed_prev_owned_credit_last_3_years
              ? (item.sale_price ?? 0) > 25_000
              : undefined,
            used_acquired_for_use: passesIncome &&
                !item.claimed_prev_owned_credit_last_3_years &&
                (item.sale_price ?? 0) <= 25_000
              ? item.acquired_for_use_not_resale
              : undefined,
            used_claimed_as_dependent: passesIncome &&
                !item.claimed_prev_owned_credit_last_3_years &&
                (item.sale_price ?? 0) <= 25_000 &&
                item.acquired_for_use_not_resale
              ? item.claimed_as_dependent
              : undefined,
            used_sale_price: personalCredit > 0 ? item.sale_price : undefined,
            used_sale_price_30pct: personalCredit > 0
              ? (item.sale_price ?? 0) * 0.30
              : undefined,
            used_credit_cap: personalCredit > 0 ? 4_000 : undefined,
            used_personal_credit: personalCredit > 0
              ? personalCredit
              : undefined,
          }),
      }];
    });
  },
};
