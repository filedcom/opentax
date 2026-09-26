import { form8936Lines } from "../../form8936_lines.ts";
import {
  computeVehiclePersonalCredit,
  incomeLimit,
  inputSchema,
  modifiedAgi,
} from "../../../nodes/inputs/f8936/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";
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
      if (personalCredit === 0) return [];
      if (
        item.vehicle_year === undefined || !item.vehicle_make ||
        !item.vehicle_model || !item.vin || !item.placed_in_service_date ||
        item.is_new_vehicle === undefined
      ) {
        throw new Error(
          "Form 8936 Schedule A PDF needs complete vehicle details",
        );
      }
      const used = !item.is_new_vehicle;
      const currentOver = modifiedAgi(input.current_year_magi) >
        incomeLimit(input.filing_status, used);
      const priorOver = modifiedAgi(input.prior_year_magi) >
        incomeLimit(input.prior_year_filing_status, used);
      const common = {
        vehicle_year: item.vehicle_year,
        vehicle_make: item.vehicle_make,
        vehicle_model: item.vehicle_model,
        vin: item.vin,
        service_date: formatServiceDate(item.placed_in_service_date),
        transferred_to_dealer: false,
        is_new_vehicle: item.is_new_vehicle,
        is_used_vehicle: used,
        is_commercial_vehicle: false,
      };
      return [{
        ...common,
        ...(item.is_new_vehicle
          ? {
            new_resold_within_30_days: item.resold_within_30_days,
            new_individual_return: true,
            new_current_magi_over_limit: currentOver,
            new_prior_magi_over_limit: currentOver ? priorOver : undefined,
            new_acquired_for_use: item.acquired_for_use_not_resale,
            new_tentative_credit: Math.min(item.credit_amount ?? 0, 7_500),
            new_personal_credit: personalCredit,
          }
          : {
            used_resold_within_30_days: item.resold_within_30_days,
            used_current_magi_over_limit: currentOver,
            used_prior_magi_over_limit: currentOver ? priorOver : undefined,
            used_claimed_prev_credit:
              item.claimed_prev_owned_credit_last_3_years,
            used_price_over_cap: (item.sale_price ?? 0) > 25_000,
            used_acquired_for_use: item.acquired_for_use_not_resale,
            used_claimed_as_dependent: item.claimed_as_dependent,
            used_sale_price: item.sale_price,
            used_sale_price_30pct: (item.sale_price ?? 0) * 0.30,
            used_credit_cap: 4_000,
            used_personal_credit: personalCredit,
          }),
      }];
    });
  },
};
