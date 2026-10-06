import { z } from "zod";
import { computeNetProfit, itemSchema } from "../schedule_f/model.ts";
import { scheduleSELines } from "../schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { Form8995AInput } from "./index.ts";
export const singleFarmSourceSchema = z.object({
  item: itemSchema,
  owner_ssn: z.string().regex(/^\d{9}$/),
  se_tax_deduction: z.number().int().nonnegative(),
}).strict();
export function singleFarmSourceAmounts(
  raw: z.infer<typeof singleFarmSourceSchema>,
) {
  const source = singleFarmSourceSchema.parse(raw);
  const item = source.item;
  const profit = computeNetProfit(item);
  const se = scheduleSELines(
    { net_profit_schedule_f: profit },
    CONFIG_BY_YEAR[2025].ssWageBase,
  );
  if (
    !item.farm_id || !item.line_c_farm_name ||
    !/^\d{9}$/.test(item.line_d_ein?.replaceAll("-", "") ?? "") ||
    (item.proprietor_recipient ?? "T") !== "T" ||
    item.accounting_method !== "cash" ||
    item.line_e_material_participation !== true ||
    item.qbi_no_other_adjustments_confirmed !== true ||
    item.qbi_wotc_filing_review || (item.line22_labor_hired ?? 0) !== 0 ||
    (item.qbi_w2_wages ?? 0) !== 0 || (item.qbi_unadjusted_basis ?? 0) !== 0 ||
    !Number.isSafeInteger(profit) || profit <= 0 || !se ||
    se.line13 !== source.se_tax_deduction
  ) {
    throw new Error(
      "Advanced farm QBI needs identified owned farm receipts, attributable SE and actual wage/property source",
    );
  }
  return {
    ...source,
    profit,
    qbi: profit - source.se_tax_deduction,
    name: item.line_c_farm_name,
    ein: item.line_d_ein!.replaceAll("-", ""),
  };
}
export function assertSingleFarmAmounts(input: Form8995AInput): void {
  if (!input.single_schedule_f_source) return;
  const source = singleFarmSourceAmounts(input.single_schedule_f_source);
  const details = input.business_filing_details;
  if (
    input.filing_status !== FilingStatus.Single ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.single_schedule_c_source || input.patron_business_source ||
    input.farm_wotc_filing_source ||
    input.patron_of_specified_cooperative !== false || !details ||
    details.business_name !== source.name || details.ein !== source.ein ||
    details.business_qbi !== source.qbi ||
    input.qbi !== source.qbi || (input.w2_wages ?? 0) !== 0 ||
    (input.unadjusted_basis ?? 0) !== 0 ||
    details.business_w2_wages !== 0 || details.business_ubia !== 0 ||
    (input.sstb_qbi ?? 0) !== 0 || input.aggregation_filing_details ||
    (input.aggregation_groups?.length ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  ) {
    throw new Error(
      "Advanced farm QBI differs from its actual owned business source",
    );
  }
}
