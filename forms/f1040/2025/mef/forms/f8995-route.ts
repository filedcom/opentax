import { normalizeAllPending } from "../../pending.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
  projectScheduleCItems,
} from "../../../nodes/inputs/schedule_c/index.ts";

const lineNumbers = [
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
] as const;

export type OneScheduleC8995 = {
  readonly businessName: string;
  readonly ein: string;
  readonly qbi: number;
  readonly lines: Readonly<Record<(typeof lineNumbers)[number], number>>;
};

function zeroOrAbsent(value: unknown): boolean {
  return value === undefined || value === 0;
}

/** Only the fully reconciled, one-business positive route can leave the guard. */
export function assertOneScheduleC8995(
  fields: Record<string, unknown>,
  rawPending: Readonly<Record<string, unknown>> | undefined,
): OneScheduleC8995 {
  if (!rawPending) {
    throw new Error(
      "Form 8995 needs its complete source and final return pending graph",
    );
  }
  const pending = normalizeAllPending(rawPending as Record<string, unknown>);
  const source = scheduleCInputSchema.safeParse(pending.schedule_c);
  const sourceInput = source.success ? source.data : undefined;
  const businesses = source.success ? projectScheduleCItems(source.data) : [];
  const sourceBusiness = businesses[0];
  const qbiRows = fields.schedule_c_qbi_businesses;
  const row = Array.isArray(qbiRows) && qbiRows.length === 1
    ? qbiRows[0] as Record<string, unknown>
    : undefined;
  const f1040 = pending.f1040;
  const schedule1 = pending.schedule1;
  const otherSourceKeys = [
    "schedule_f",
    "schedule_e",
    "k1_partnership",
    "k1_s_corp",
    "f1099div",
    "f1099patr",
    "schedule_d",
    "f1099b",
    "schedule_se",
    "sep_retirement",
  ] as const;
  const form7206 = pending.form7206;
  const ein = typeof fields.line1_ein === "string"
    ? fields.line1_ein.replace(/\D/g, "")
    : "";
  if (
    businesses.length !== 1 || !sourceBusiness || !row || !f1040 ||
    !schedule1 || pending.form8995a !== undefined ||
    otherSourceKeys.some((key) => pending[key] !== undefined) ||
    (form7206 !== undefined &&
      Object.keys(form7206).some((key) => key !== "schedule_c_source")) ||
    sourceInput?.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    sourceInput?.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    fields.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    sourceBusiness.qbi_no_other_adjustments_confirmed !== true ||
    sourceBusiness.line_g_material_participation !== true ||
    (sourceInput?.wotc_wage_reductions?.length ?? 0) !== 0 ||
    row.no_other_adjustments_confirmed !== true ||
    JSON.stringify(row.source_schedule_c) !== JSON.stringify(sourceBusiness) ||
    !sourceBusiness.business_reference ||
    fields.line1_business_reference !== sourceBusiness.business_reference ||
    !sourceBusiness.line_c_business_name ||
    sourceBusiness.line_c_business_name.length > 75 ||
    !/^[A-Za-z0-9#()&'-]+(?: [A-Za-z0-9#()&'-]+)*$/.test(
      sourceBusiness.line_c_business_name,
    ) ||
    fields.line1_business_name !== sourceBusiness.line_c_business_name ||
    !sourceBusiness.line_d_ein ||
    ein.length !== 9 ||
    ein !== sourceBusiness.line_d_ein.replace(/\D/g, "") ||
    row.ein !== ein ||
    typeof fields.line1_qbi !== "number" ||
    !Number.isInteger(fields.line1_qbi) ||
    fields.line1_qbi <= 0 ||
    row.qbi !== fields.line1_qbi ||
    computeNetProfit(sourceBusiness) !== fields.line1_qbi ||
    fields.qbi_from_schedule_c !== fields.line1_qbi ||
    !zeroOrAbsent(fields.qbi_from_schedule_f) ||
    !zeroOrAbsent(fields.qbi) ||
    !zeroOrAbsent(fields.sstb_qbi) ||
    !zeroOrAbsent(fields.line6_sec199a_dividends) ||
    !zeroOrAbsent(fields.qbi_loss_carryforward) ||
    !zeroOrAbsent(fields.reit_loss_carryforward) ||
    !zeroOrAbsent(fields.se_tax_deduction) ||
    !zeroOrAbsent(fields.se_health_insurance_deduction) ||
    !zeroOrAbsent(fields.retirement_plan_deduction) ||
    !zeroOrAbsent(schedule1.line15_se_deduction) ||
    !zeroOrAbsent(schedule1.line16_sep_simple) ||
    !zeroOrAbsent(schedule1.line17_se_health_insurance) ||
    schedule1.line3_schedule_c !== fields.line1_qbi ||
    !zeroOrAbsent(f1040.line3a_qualified_dividends) ||
    !zeroOrAbsent(f1040.line7_capital_gain) ||
    !zeroOrAbsent(f1040.line7a_cap_gain_distrib) ||
    !zeroOrAbsent(fields.net_capital_gain) ||
    !zeroOrAbsent(f1040.line13b_additional_deductions) ||
    typeof f1040.line11_agi !== "number" ||
    typeof f1040.line12c_deduction_total !== "number" ||
    f1040.line11_agi - f1040.line12c_deduction_total !==
      fields.line11
  ) {
    throw new Error(
      "Form 8995 positive filing needs one identified Schedule C business and exact Schedule 1/1040 source reconciliation",
    );
  }
  const qbi = fields.line1_qbi as number;
  const line11 = fields.line11 as number;
  const line5 = Math.round(qbi * 0.2);
  const line14 = Math.round(line11 * 0.2);
  const expected = {
    2: qbi,
    3: 0,
    4: qbi,
    5: line5,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: line5,
    11: line11,
    12: 0,
    13: line11,
    14: line14,
    15: Math.min(line5, line14),
    16: 0,
    17: 0,
  } as const;
  if (
    lineNumbers.some((line) => fields[`line${line}`] !== expected[line]) ||
    typeof fields.qbi_deduction !== "number" ||
    fields.qbi_deduction !== expected[15] ||
    typeof f1040.line13_qbi_deduction !== "number" ||
    f1040.line13_qbi_deduction !== expected[15]
  ) {
    throw new Error(
      "Form 8995 lines 1-17 must reconcile to the QBI deduction on Form 1040",
    );
  }
  return {
    businessName: sourceBusiness.line_c_business_name,
    ein,
    qbi,
    lines: expected,
  };
}
