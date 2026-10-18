import { filedOwnedScheduleC } from "../../../../../../nodes/owned-business-filing.ts";
import {
  calculateScheduleCAtRiskNet,
  inputSchema as cSchema,
  projectScheduleCItems,
  wotcReductionsByBusiness,
} from "../../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { filedForm461Schema } from "../../../../../../nodes/intermediate/forms/income/business/form461/index.ts";
import { inputSchema as qbiSchema } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995/index.ts";
import { normalizeAllPending } from "../../../../../return-processing/pending.ts";
import type { Filed8995 } from "./f8995-route.ts";

const unsupported = [
  "schedule_f",
  "schedule_e",
  "k1_partnership",
  "k1_s_corp",
  "f1099patr",
  "form8995a",
];

/** Replay a Schedule C loss whose Form 461 excess business loss is not QBI this year. */
export function assertExcessBusinessLoss8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!rawPending) {
    throw new Error("Form 8995 excess business loss needs its return source");
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const parsed = qbiSchema.parse(fields);
  const row = parsed.excess_business_loss_filing_row;
  const c = cSchema.parse(pending.schedule_c);
  const items = projectScheduleCItems(c);
  const item = items[0];
  const form461 = filedForm461Schema.safeParse(pending.form461);
  if (!row || items.length !== 1 || !item || !form461.success) {
    throw new Error(
      "Form 8995 excess business loss needs one Schedule C and its Form 461",
    );
  }
  const reduction = wotcReductionsByBusiness({
    schedule_cs: items,
    wotc_wage_reductions: c.wotc_wage_reductions,
  }).get(item.business_reference ?? "") ?? 0;
  const profit = filedOwnedScheduleC(item, false, reduction)?.profit ??
    calculateScheduleCAtRiskNet(item, reduction).atRiskNet;
  const disallowed = -form461.data.line16_excess_business_loss;
  const general = pending.general ?? {};
  const s1 = pending.schedule1 ?? {};
  const f1040 = pending.f1040 ?? {};
  const number = (value: unknown) =>
    value === undefined ? 0 : typeof value === "number" ? value : NaN;
  const ssn = String(general.taxpayer_ssn ?? "").replace(/\D/g, "");
  const tin = item.line_d_ein
    ? { kind: "ein", value: item.line_d_ein.replace(/\D/g, "") }
    : { kind: "ssn", value: ssn };
  const line11 = Math.max(
    0,
    Math.round(
      number(f1040.line11_agi) - number(f1040.line12c_deduction_total) -
        number(f1040.line13b_additional_deductions),
    ),
  );
  const line13 = Math.max(0, line11 - number(fields.line12));
  const expected: Record<number, number> = {
    2: row.qbi,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: line11,
    12: number(fields.line12),
    13: line13,
    14: Math.round(line13 * .2),
    15: 0,
    16: -row.qbi,
    17: 0,
  };
  if (
    unsupported.some((key) => pending[key] !== undefined) ||
    !(expected[12] >= 0) ||
    general.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    general.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    row.business_reference !== item.business_reference ||
    row.business_name !== item.line_c_business_name ||
    row.tin.kind !== tin.kind || row.tin.value !== tin.value ||
    row.schedule_c_net_loss !== profit ||
    row.excess_business_loss_disallowed !== disallowed ||
    row.qbi !== profit + disallowed || row.qbi >= 0 ||
    form461.data.line2_business_income_loss !== profit ||
    form461.data.line6_net_farm_profit_loss !== 0 ||
    s1.line3_schedule_c !== profit ||
    s1.line8p_excess_business_loss !== disallowed ||
    number(f1040.line13_qbi_deduction) !== 0 ||
    Object.entries(expected).some(([line, amount]) =>
      fields[`line${line}`] !== amount
    )
  ) {
    throw new Error(
      "Form 8995 excess business loss Schedule C, Form 461, Schedule 1 and Form 1040 sources differ",
    );
  }
  return {
    businesses: [{
      businessName: row.business_name,
      tin: row.tin,
      qbi: row.qbi,
    }],
    lines: expected as Filed8995["lines"],
  };
}
